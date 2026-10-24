import { and, desc, eq, gte } from "drizzle-orm";
import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { runSqliteBatch } from "@/db/batch";
import { aiSuggestions, answerRevisions, buildBriefs, designReviewChanges, designReviewIssues, designReviewRuns, gddVersions, messages, projects, questionAnswers, stageSummaries } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { AIConfigurationError, AIRequestTimeoutError, createStructuredResponseWithMeta, designReviewResponseSchema } from "@/lib/server/model-provider";
import { estimateTokens, loadRecentConversation } from "@/lib/server/model-context";
import { parseStringArray } from "@/lib/server/design-review";
import { getWorkspace, loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

const REVIEW_NODE_PREFIX = "DESIGN_ISSUE:";

type ProposedChange = { targetQuestionId: string; summary: string; rationale: string; newContent: string };
type ReviewResponse = { reply: string; proposedChanges: ProposedChange[] };

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

// 本记录功能上线前生成的审查建议没有对应的 ai_suggestions 行。
async function suggestionExists(id: string) {
  const [row] = await getDb().select({ id: aiSuggestions.id }).from(aiSuggestions).where(eq(aiSuggestions.id, id)).limit(1);
  return Boolean(row);
}

function errorStatus(error: unknown) {
  if (error instanceof AIConfigurationError) return 503;
  if (error instanceof AIRequestTimeoutError) return 504;
  return 500;
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; issueId?: string; mode?: "analyze" | "chat"; content?: string };
    const mode = body.mode ?? "chat";
    const content = body.content?.trim() ?? "";
    if (!body.projectId || !body.issueId || !["analyze", "chat"].includes(mode) || (mode === "chat" && !content) || content.length > 5000) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const db = getDb();
    const [run] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
    if (!run || run.status === "superseded") return Response.json({ error: "请先运行 Design State 全局审查。" }, { status: 409 });
    const [issue] = await db.select().from(designReviewIssues).where(and(eq(designReviewIssues.id, body.issueId), eq(designReviewIssues.lastSeenRunId, run.id))).limit(1);
    if (!issue) return Response.json({ error: "这个问题不属于当前审查。" }, { status: 404 });

    const reviewNodeId = `${REVIEW_NODE_PREFIX}${issue.id}`;
    const now = new Date().toISOString();
    const userMessageId = mode === "chat" ? crypto.randomUUID() : null;
    if (userMessageId) await db.insert(messages).values({ id: userMessageId, projectId: project.id, questionId: reviewNodeId, role: "user", content, createdAt: now });

    const [snapshot, reviewConversation] = await Promise.all([
      loadAnswerSnapshot(project.id),
      loadRecentConversation(project.id, reviewNodeId, {
        maxMessages: 10,
        tokenBudget: 5_000,
        userLabel: "用户",
        assistantLabel: "审查助手",
      }),
    ]);
    const selectedQuestionIds = new Set(parseStringArray(issue.questionIdsJson).filter((id) => allQuestions.some((question) => question.id === id)));
    const designContext = allQuestions.filter((question) => selectedQuestionIds.has(question.id)).map((question) => {
      const answer = snapshot[question.id];
      return `${question.id} ${question.short} [${answer?.status ?? "missing"}, r${answer?.revision ?? 0}]\n${answer?.answer ?? "（未回答）"}`;
    }).join("\n\n");
    const issueContext = [
      `${issue.id} [${issue.severity}/${issue.status}] ${issue.title}`,
      `冲突证据：${issue.evidence}`,
      `设计影响：${issue.whyItMatters}`,
      `相关问题：${[...selectedQuestionIds].join("/")}`,
      `已有方向：${parseStringArray(issue.optionsJson).join("；")}`,
    ].join("\n");
    const userRequest = mode === "analyze"
      ? "简短解释这项冲突，并给出一个忠于用户意图、可以直接写入其中一道关联题的完整答案修改。"
      : "回应对话历史中用户的最后一条请求。";

    const { result, meta } = await createStructuredResponseWithMeta<ReviewResponse>({
      name: "design_review_conversation",
      promptVersion: "design-review-conversation-v4",
      schemaVersion: "design-review-response-v2",
      projectId: project.id,
      contextStats: {
        strategy: "issue-answers+recent-review-budget-v1",
        includedAnswerCount: selectedQuestionIds.size,
        includedMessageCount: reviewConversation.messages.length,
        estimatedTokens: estimateTokens(designContext) + reviewConversation.estimatedTokens,
        truncated: reviewConversation.truncated,
      },
      schema: designReviewResponseSchema,
      purpose: "design_review",
      strictSchema: true,
      repairInvalidOutput: true,
      timeoutMs: 60_000,
      instructions: [
        "你是 Design State 冲突处理助手。当前只处理一个稳定问题，不扩展到其他问题。",
        "reply 用简短语言说明相关题号、矛盾点和修改策略，不超过 220 个中文字。",
        "proposedChanges 默认只给 1 个最推荐修改，targetQuestionId 必须是当前冲突关联题之一。",
        "newContent 必须是该问题修改后的完整替换答案，不能只是操作指令，也不能改写无关设计决定。",
        "不要声称问题已经解决；写入后仍需统一验证。即使没有安全建议，也要返回 reply 和空数组。",
      ].join("\n"),
      input: `项目：${project.title}\n审查轮次：v${run.version} / ${run.status}\n\n当前问题：\n${issueContext}\n\n相关最新答案：\n${designContext}\n\n对话历史：\n${reviewConversation.text || "（尚无）"}\n\n当前请求：\n${userRequest}`,
    });

    const normalized = result.proposedChanges.flatMap((change) => {
      const targetQuestionId = change.targetQuestionId.trim();
      const proposedContent = change.newContent.trim();
      if (!selectedQuestionIds.has(targetQuestionId) || !proposedContent || proposedContent.length > 5000) return [];
      const before = snapshot[targetQuestionId];
      if (!before || before.answer.trim() === proposedContent) return [];
      return [{ id: crypto.randomUUID(), targetQuestionId, summary: change.summary.trim().slice(0, 240) || `更新 ${targetQuestionId}`, rationale: change.rationale.trim().slice(0, 1200), beforeContent: before.answer, beforeRevision: before.revision, proposedContent }];
    }).slice(0, 1);

    const assistantMessageId = crypto.randomUUID();
    const assistantCreatedAt = new Date().toISOString();
    runSqliteBatch(db, [
      db.insert(messages).values({ id: assistantMessageId, projectId: project.id, questionId: reviewNodeId, role: "assistant", content: result.reply.trim(), createdAt: assistantCreatedAt }),
      // 保留 AI 的原始提议：用户编辑后写入时，designReviewChanges.proposedContent 会被覆盖。
      ...normalized.map((change) => db.insert(aiSuggestions).values({ id: change.id, projectId: project.id, questionId: change.targetQuestionId, source: "design_review", messageId: assistantMessageId, suggestedAnswer: change.proposedContent, structuredJson: JSON.stringify({ issueId: issue.id, reviewRunId: run.id, summary: change.summary, rationale: change.rationale }), model: meta.model, createdAt: assistantCreatedAt })),
      ...normalized.map((change) => db.insert(designReviewChanges).values({ id: change.id, projectId: project.id, messageId: assistantMessageId, reviewRunId: run.id, issueId: issue.id, targetQuestionId: change.targetQuestionId, summary: change.summary, rationale: change.rationale, beforeContent: change.beforeContent, beforeRevision: change.beforeRevision, proposedContent: change.proposedContent, status: "proposed", createdAt: assistantCreatedAt, updatedAt: assistantCreatedAt })),
    ]);
    return Response.json({
      userMessage: userMessageId ? { id: userMessageId, role: "user", text: content, createdAt: now } : null,
      assistantMessage: { id: assistantMessageId, role: "assistant", text: result.reply.trim(), createdAt: assistantCreatedAt },
      changes: normalized.map((change) => ({ ...change, messageId: assistantMessageId, reviewRunId: run.id, issueId: issue.id, status: "proposed" as const, appliedAt: null, createdAt: assistantCreatedAt, updatedAt: assistantCreatedAt })),
    });
  } catch (error) {
    const status = errorStatus(error);
    return Response.json({ error: error instanceof Error ? error.message : "设计审查助手暂时无法响应。", configurationRequired: status === 503 }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; changeId?: string; action?: "apply" | "dismiss"; proposedContent?: string };
    if (!body.projectId || !body.changeId || !body.action) return Response.json({ error: "修改参数无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const db = getDb();
    const [change] = await db.select().from(designReviewChanges).where(and(eq(designReviewChanges.id, body.changeId), eq(designReviewChanges.projectId, project.id))).limit(1);
    if (!change) return Response.json({ error: "修改建议不存在。" }, { status: 404 });
    if (change.status !== "proposed") return Response.json({ error: `这条建议已经是 ${change.status} 状态。` }, { status: 409 });
    const finalContent = body.action === "apply" ? body.proposedContent?.trim() ?? "" : change.proposedContent;
    if (body.action === "apply" && (!finalContent || finalContent.length > 5000)) return Response.json({ error: "请填写 1–5000 字的正式答案。" }, { status: 400 });
    const now = new Date().toISOString();
    if (body.action === "dismiss") {
      await db.update(designReviewChanges).set({ status: "dismissed", updatedAt: now }).where(eq(designReviewChanges.id, change.id));
      return Response.json(await getWorkspace(user, project.id));
    }

    const question = allQuestions.find((item) => item.id === change.targetQuestionId);
    if (!question) return Response.json({ error: "目标问题不存在。" }, { status: 400 });
    const [existing] = await db.select().from(questionAnswers).where(and(eq(questionAnswers.projectId, project.id), eq(questionAnswers.questionId, change.targetQuestionId))).limit(1);
    if (!existing || existing.answer !== change.beforeContent || existing.revision !== change.beforeRevision) {
      await db.update(designReviewChanges).set({ status: "stale", updatedAt: now }).where(eq(designReviewChanges.id, change.id));
      return Response.json({ error: `${change.targetQuestionId} 已经变化，这条旧建议不会覆盖新内容。请重新分析。` }, { status: 409 });
    }
    if (existing.answer === finalContent) return Response.json({ error: "修改后的答案与当前答案相同，不需要写入。" }, { status: 400 });
    const audit = { ...parseObject(existing.structuredJson), updatedByDesignReview: { changeId: change.id, issueId: change.issueId, at: now } };
    const issueRows = await db.select().from(designReviewIssues).where(eq(designReviewIssues.lastSeenRunId, change.reviewRunId));
    const affectedIssueIds = issueRows.filter((item) => item.status !== "superseded" && parseStringArray(item.questionIdsJson).includes(change.targetQuestionId)).map((item) => item.id);
    const linkedSuggestionId = await suggestionExists(change.id) ? change.id : null;
    runSqliteBatch(db, [
      db.update(questionAnswers).set({ answer: finalContent, status: "confirmed", structuredJson: JSON.stringify(audit), revision: existing.revision + 1, updatedAt: now }).where(eq(questionAnswers.id, existing.id)),
      db.insert(answerRevisions).values({ id: crypto.randomUUID(), projectId: project.id, questionId: change.targetQuestionId, revision: existing.revision + 1, answer: finalContent, source: "design_review", suggestionId: linkedSuggestionId, adoption: finalContent === change.proposedContent.trim() ? "verbatim" : "edited", createdAt: now }).onConflictDoNothing(),
      ...affectedIssueIds.map((issueId) => db.update(designReviewIssues).set({ status: "pending_verification", resolutionNote: "相关答案已修改，等待统一验证。", updatedAt: now }).where(eq(designReviewIssues.id, issueId))),
      db.update(designReviewRuns).set({ status: "dirty", completedAt: null, updatedAt: now }).where(eq(designReviewRuns.id, change.reviewRunId)),
      db.update(stageSummaries).set({ status: "stale" }).where(and(eq(stageSummaries.projectId, project.id), eq(stageSummaries.status, "current"), gte(stageSummaries.stageId, question.stageId))),
      db.update(gddVersions).set({ status: "stale", updatedAt: now }).where(and(eq(gddVersions.projectId, project.id), eq(gddVersions.version, project.gddVersion))),
      db.update(buildBriefs).set({ status: "stale" }).where(and(eq(buildBriefs.projectId, project.id), eq(buildBriefs.version, project.buildBriefVersion))),
      db.update(designReviewChanges).set({ status: "stale", updatedAt: now }).where(and(eq(designReviewChanges.reviewRunId, change.reviewRunId), eq(designReviewChanges.status, "proposed"), eq(designReviewChanges.targetQuestionId, change.targetQuestionId))),
    ]);
    await db.update(designReviewChanges).set({ proposedContent: finalContent, status: "applied", appliedAt: now, updatedAt: now }).where(eq(designReviewChanges.id, change.id));
    const derivedTitle = change.targetQuestionId === "Q1" && project.title === "未命名游戏" ? finalContent.split(/[。；\n]/)[0].slice(0, 28) || project.title : project.title;
    await db.update(projects).set({ title: derivedTitle, updatedAt: now }).where(eq(projects.id, project.id));
    return Response.json(await getWorkspace(user, project.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "修改建议处理失败。" }, { status: 500 });
  }
}
