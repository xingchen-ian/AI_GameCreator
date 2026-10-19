import { and, desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { designReviewIssues, designReviewRuns, designReviewVerdicts } from "@/db/schema";
import { AIConfigurationError, AIRequestTimeoutError, createStructuredResponse, designReviewScanSchema, designReviewVerificationSchema } from "@/lib/server/model-provider";
import { answerSnapshotKey, designStateText, requiredQuestionIds, sanitizeQuestionIds } from "@/lib/server/design-review";
import { getWorkspace, loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

type GeneratedIssue = {
  severity: "blocker" | "conflict";
  title: string;
  evidence: string;
  whyItMatters: string;
  questionIds: string[];
  options: string[];
};

type VerificationResult = {
  existingIssueResults: Array<{
    issueId: string;
    verdict: "resolved" | "still_open" | "changed";
    reason: string;
    evidence: string;
  }>;
  newIssues: GeneratedIssue[];
};

function errorStatus(error: unknown) {
  if (error instanceof AIConfigurationError) return 503;
  if (error instanceof AIRequestTimeoutError) return 504;
  return 500;
}

function issueInput(issue: typeof designReviewIssues.$inferSelect) {
  let questionIds: string[] = [];
  try { questionIds = JSON.parse(issue.questionIdsJson) as string[]; } catch { questionIds = []; }
  return [
    `${issue.id} [${issue.status}/${issue.severity}] ${issue.title}`,
    `题目：${questionIds.join("/")}`,
    `原判断：${issue.evidence}`,
  ].join("\n");
}

function normalizeIssues(issues: GeneratedIssue[]) {
  return issues.flatMap((issue) => {
    const questionIds = sanitizeQuestionIds(issue.questionIds);
    if (questionIds.length < 2) return [];
    return [{
      severity: issue.severity,
      title: issue.title.trim(),
      evidence: issue.evidence.trim(),
      whyItMatters: issue.whyItMatters.trim(),
      questionIds,
      options: issue.options.map((option) => option.trim()).filter(Boolean).slice(0, 2),
    }];
  }).filter((issue) => issue.title && issue.evidence && issue.options.length).slice(0, 6);
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; action?: "start" | "verify" };
    if (!body.projectId || !body.action) return Response.json({ error: "审查参数无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const snapshot = await loadAnswerSnapshot(project.id);
    const missing = requiredQuestionIds.filter((id) => !snapshot[id] || snapshot[id].status !== "confirmed");
    if (missing.length) return Response.json({ error: "请先完成并确认设计状态，再开始全局审查。", missing }, { status: 409 });
    const currentSnapshotKey = answerSnapshotKey(snapshot);
    const stateText = designStateText(snapshot);
    const db = getDb();
    const now = new Date().toISOString();
    const [latestRun] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);

    if (body.action === "start") {
      const result = await createStructuredResponse<{ issues: GeneratedIssue[] }>({
        name: "design_state_consistency_review",
        schema: designReviewScanSchema,
        role: "gdd",
        strictSchema: true,
        repairInvalidOutput: true,
        timeoutMs: 40_000,
        instructions: [
          "你是游戏设计一致性审查员。只检查 23 道已确认设计答案之间真正不能同时成立的决定，不审查 GDD 文案。",
          "每个冲突必须引用至少两个真实题号，并明确概括各答案的主张以及为什么无法同时实现。",
          "信息缺失、细节尚未决定、措辞差异和普通优化建议都不是冲突。不要为了输出结果制造问题。",
          "severity 只使用 blocker 或 conflict：blocker 表示不做选择就无法实现核心原型；其余真实矛盾使用 conflict。",
          "最多返回 6 项；无实质冲突时返回 {\"issues\":[]}。使用中文。",
        ].join("\n"),
        input: `项目：${project.title}\n\n当前 Design State：\n${stateText}`,
      });
      const issues = normalizeIssues(result.issues);
      const runId = crypto.randomUUID();
      const version = (latestRun?.version ?? 0) + 1;
      await db.batch([
        ...(latestRun && latestRun.status !== "superseded"
          ? [db.update(designReviewRuns).set({ status: "superseded", updatedAt: now }).where(eq(designReviewRuns.id, latestRun.id))]
          : []),
        db.insert(designReviewRuns).values({
          id: runId,
          projectId: project.id,
          version,
          snapshotKey: currentSnapshotKey,
          answersJson: JSON.stringify(snapshot),
          status: issues.length ? "action_required" : "ready",
          createdAt: now,
          updatedAt: now,
          completedAt: issues.length ? null : now,
        }),
        ...issues.map((issue) => db.insert(designReviewIssues).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          firstSeenRunId: runId,
          lastSeenRunId: runId,
          severity: issue.severity,
          title: issue.title,
          evidence: issue.evidence,
          whyItMatters: issue.whyItMatters,
          questionIdsJson: JSON.stringify(issue.questionIds),
          optionsJson: JSON.stringify(issue.options),
          status: "open",
          createdAt: now,
          updatedAt: now,
        })),
      ]);
      return Response.json(await getWorkspace(user), { status: 201 });
    }

    if (!latestRun || latestRun.status === "superseded") return Response.json({ error: "请先开始一次全局设计审查。" }, { status: 409 });
    const issueRows = await db.select().from(designReviewIssues).where(eq(designReviewIssues.lastSeenRunId, latestRun.id));
    const verifiableIssues = issueRows.filter((issue) => issue.status === "open" || issue.status === "pending_verification");
    const issueIds = verifiableIssues.map((issue) => issue.id);
    const result = await createStructuredResponse<VerificationResult>({
      name: "design_state_consistency_verification",
      schema: designReviewVerificationSchema(issueIds),
      role: "gdd",
      strictSchema: true,
      repairInvalidOutput: true,
      timeoutMs: 42_000,
      instructions: [
        "你是游戏设计修改验证员。根据最新 Design State，逐条验证既有冲突，而不是从零重写一份问题清单。",
        "existingIssueResults 必须恰好为每个给定 issueId 返回一次结论：resolved、still_open 或 changed。",
        "resolved 只表示原先互不兼容的决定现在确实可以同时成立；still_open 表示矛盾仍在；changed 表示矛盾实质变化但仍需处理。",
        "只有完全不属于任何既有 issue 的真实矛盾才能放入 newIssues；措辞、缺失细节和优化建议不能作为新冲突。",
        "不要因为重新表述而创建重复问题。使用中文。",
      ].join("\n"),
      input: `项目：${project.title}\n\n待验证的稳定问题清单：\n${verifiableIssues.map(issueInput).join("\n\n")}\n\n最新 Design State：\n${stateText}`,
    });
    const returnedIds = result.existingIssueResults.map((item) => item.issueId);
    if (new Set(returnedIds).size !== issueIds.length || issueIds.some((id) => !returnedIds.includes(id))) {
      throw new Error("AI 没有逐条返回全部既有问题的验证结论，请重试验证。");
    }
    let previouslyReviewed: Record<string, { revision?: number }> = {};
    try { previouslyReviewed = JSON.parse(latestRun.answersJson) as Record<string, { revision?: number }>; } catch { previouslyReviewed = {}; }
    const issueById = new Map(verifiableIssues.map((issue) => [issue.id, issue]));
    const effectiveResults = result.existingIssueResults.map((item) => {
      const issue = issueById.get(item.issueId);
      let questionIds: string[] = [];
      try { questionIds = issue ? JSON.parse(issue.questionIdsJson) as string[] : []; } catch { questionIds = []; }
      const relatedAnswerChanged = questionIds.some((id) => (snapshot[id]?.revision ?? 0) !== (previouslyReviewed[id]?.revision ?? 0));
      if (item.verdict === "resolved" && issue?.status === "open" && !relatedAnswerChanged) {
        return { ...item, verdict: "still_open" as const, reason: `关联答案没有变化，系统不会仅凭一次重新表述自动关闭问题。${item.reason}` };
      }
      return item;
    });
    const existingQuestionSets = new Set(issueRows.map((issue) => {
      let ids: string[] = [];
      try { ids = JSON.parse(issue.questionIdsJson) as string[]; } catch { ids = []; }
      return sanitizeQuestionIds(ids).sort().join("|");
    }));
    const newIssues = normalizeIssues(result.newIssues).filter((issue) => !existingQuestionSets.has([...issue.questionIds].sort().join("|"))).slice(0, 4);
    const hasOpen = effectiveResults.some((item) => item.verdict !== "resolved") || newIssues.length > 0;
    await db.batch([
      ...effectiveResults.flatMap((item) => {
        const status = item.verdict === "resolved" ? "resolved" as const : "open" as const;
        return [
          db.update(designReviewIssues).set({ status, ...(item.verdict === "resolved" ? {} : { evidence: item.evidence.trim() }), resolutionNote: item.reason.trim(), updatedAt: now }).where(and(eq(designReviewIssues.id, item.issueId), eq(designReviewIssues.lastSeenRunId, latestRun.id))),
          db.insert(designReviewVerdicts).values({ id: crypto.randomUUID(), reviewRunId: latestRun.id, issueId: item.issueId, verdict: item.verdict, reason: item.reason.trim(), createdAt: now }),
        ];
      }),
      ...newIssues.map((issue) => db.insert(designReviewIssues).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        firstSeenRunId: latestRun.id,
        lastSeenRunId: latestRun.id,
        severity: issue.severity,
        title: issue.title,
        evidence: issue.evidence,
        whyItMatters: issue.whyItMatters,
        questionIdsJson: JSON.stringify(issue.questionIds),
        optionsJson: JSON.stringify(issue.options),
        status: "open",
        createdAt: now,
        updatedAt: now,
      })),
      db.update(designReviewRuns).set({
        snapshotKey: currentSnapshotKey,
        answersJson: JSON.stringify(snapshot),
        status: hasOpen ? "action_required" : "ready",
        completedAt: hasOpen ? null : now,
        updatedAt: now,
      }).where(eq(designReviewRuns.id, latestRun.id)),
    ]);
    return Response.json(await getWorkspace(user));
  } catch (error) {
    const status = errorStatus(error);
    return Response.json({ error: error instanceof Error ? error.message : "全局设计审查失败。", configurationRequired: status === 503 }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; issueId?: string; action?: "accept" | "reopen"; note?: string };
    if (!body.projectId || !body.issueId || !body.action) return Response.json({ error: "问题处理参数无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    if (body.action === "accept" && !body.note?.trim()) return Response.json({ error: "请说明为什么有意保留这个设计冲突。" }, { status: 400 });
    const db = getDb();
    const [run] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
    if (!run) return Response.json({ error: "当前没有设计审查。" }, { status: 404 });
    const [issue] = await db.select().from(designReviewIssues).where(and(eq(designReviewIssues.id, body.issueId), eq(designReviewIssues.lastSeenRunId, run.id))).limit(1);
    if (!issue) return Response.json({ error: "问题不属于当前审查。" }, { status: 404 });
    const now = new Date().toISOString();
    await db.update(designReviewIssues).set({ status: body.action === "accept" ? "accepted" : "open", resolutionNote: body.note?.trim() || null, updatedAt: now }).where(eq(designReviewIssues.id, issue.id));
    const unresolved = await db.select({ id: designReviewIssues.id }).from(designReviewIssues).where(and(eq(designReviewIssues.lastSeenRunId, run.id), inArray(designReviewIssues.status, ["open", "pending_verification"])));
    const snapshot = await loadAnswerSnapshot(project.id);
    const currentKey = answerSnapshotKey(snapshot);
    const ready = unresolved.length === 0 && currentKey === run.snapshotKey;
    await db.update(designReviewRuns).set({ status: ready ? "ready" : run.status === "dirty" ? "dirty" : "action_required", completedAt: ready ? now : null, updatedAt: now }).where(eq(designReviewRuns.id, run.id));
    return Response.json(await getWorkspace(user));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "问题状态更新失败。" }, { status: 500 });
  }
}
