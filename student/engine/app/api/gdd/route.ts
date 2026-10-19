import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { buildBriefs, designReviewRuns, designSnapshots, gddReviewChanges, gddVersions, projects, stageSummaries } from "@/db/schema";
import { gddSectionPlan } from "@/lib/design/gdd";
import type { GddSection } from "@/lib/design/types";
import { stages } from "@/lib/protocol/stages";
import {
  AIConfigurationError,
  AIRequestTimeoutError,
  createStructuredResponse,
  gddFidelitySchema,
  gddSectionsSchema,
  gddSummarySchema,
  validateStructuredValue,
} from "@/lib/server/model-provider";
import { getWorkspace, loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";
import { answerSnapshotKey, designStateText, requiredQuestionIds, sanitizeQuestionIds } from "@/lib/server/design-review";

type GeneratedSummary = {
  stageSummaries: Array<{ stageId: number; summary: string; keyDecisions: string[]; openQuestions: string[] }>;
  title: string;
  oneLinePitch: string;
};

type GeneratedSections = { sections: GddSection[] };
type FidelityResult = { patches: Array<{ sectionKey: string; revisedContent: string; sourceQuestionIds: string[]; reason: string }> };
type GenerationRequest = {
  projectId?: string;
  action?: "stage_summaries" | "section_batch" | "fidelity" | "finalize";
  snapshotKey?: string;
  sectionKeys?: string[];
  title?: string;
  oneLinePitch?: string;
  stageSummaries?: GeneratedSummary["stageSummaries"];
  sections?: GddSection[];
};

async function checkGddFidelity(projectId: string, projectTitle: string, designInput: string, sections: GddSection[]) {
  const gddText = sections.map((section) => `## ${section.key}｜${section.title}\n${section.content}\n来源：${section.sourceQuestionIds.join("/")}`).join("\n\n");
  return createStructuredResponse<FidelityResult>({
    name: "gdd_fidelity_check",
    projectId,
    schema: gddFidelitySchema,
    role: "gdd",
    strictSchema: true,
    repairInvalidOutput: true,
    timeoutMs: 42_000,
    instructions: [
      "你是 GDD 忠实度编辑。只检查文档是否错误表达、遗漏或擅自补造已通过审查的 Design State。",
      "这不是设计冲突审查，不要要求用户修改原始答案，也不要提出新的玩法建议。",
      "仅对确有文档错误的章节返回 patch；revisedContent 必须是修正后的完整章节。正确章节不要返回。",
      "保留用户原意和已有有效内容。没有文档错误时返回 {\"patches\":[]}。使用中文。",
    ].join("\n"),
    input: `项目：${projectTitle}\n\n已通过审查的 Design State：\n${designInput}\n\n待检查 GDD：\n${gddText}`,
  });
}

function applyFidelityPatches(sections: GddSection[], result: FidelityResult) {
  const allowedKeys = new Set(gddSectionPlan.map(([key]) => key));
  const patches = new Map(result.patches.filter((patch) => allowedKeys.has(patch.sectionKey) && patch.revisedContent.trim()).map((patch) => [patch.sectionKey, patch]));
  return sections.map((section) => {
    const patch = patches.get(section.key);
    if (!patch) return section;
    const sourceQuestionIds = sanitizeQuestionIds(patch.sourceQuestionIds);
    return { ...section, content: patch.revisedContent.trim(), sourceQuestionIds: sourceQuestionIds.length ? sourceQuestionIds : section.sourceQuestionIds };
  });
}

function requestStatus(error: unknown) {
  if (error instanceof AIConfigurationError) return 503;
  if (error instanceof AIRequestTimeoutError) return 504;
  return 500;
}

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as GenerationRequest;
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const snapshot = await loadAnswerSnapshot(project.id);
    const missing = requiredQuestionIds.filter((id) => !snapshot[id] || snapshot[id].status !== "confirmed");
    if (missing.length) {
      return Response.json({ error: "请先完成并确认设计状态，再生成完整 GDD。", missing }, { status: 409 });
    }

    const currentSnapshotKey = answerSnapshotKey(snapshot);
    if (body.snapshotKey && body.snapshotKey !== currentSnapshotKey) {
      return Response.json({ error: "生成期间设计答案发生了变化，请从最新答案重新生成 GDD。" }, { status: 409 });
    }
    const designInput = designStateText(snapshot);
    const db = getDb();
    const [approvedReview] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
    if (!approvedReview || approvedReview.status !== "ready" || approvedReview.snapshotKey !== currentSnapshotKey) {
      return Response.json({ error: "请先完成并通过最新 Design State 全局审查，再生成 GDD。" }, { status: 409 });
    }

    if (body.action === "stage_summaries") {
      const result = await createStructuredResponse<GeneratedSummary>({
        name: "gdd_stage_summaries",
        projectId: project.id,
        schema: gddSummarySchema,
        role: "gdd",
        maxTokens: 1900,
        timeoutMs: 48_000,
        instructions: [
          "你是严谨的游戏设计总编。只根据已确认答案，为完整 GDD 建立标题、一句话概念和六个阶段摘要。",
          "stageSummaries 必须恰好覆盖 Stage 1–6；每段摘要保持简洁，指出已做出的关键决定和仍缺证据之处。",
          "不得补造用户未定义的机制；语言使用简明中文。",
        ].join("\n"),
        input: `项目名：${project.title}\n\n用户设计状态：\n${designInput}`,
      });
      return Response.json({ snapshotKey: currentSnapshotKey, result });
    }

    if (body.action === "section_batch") {
      const requestedKeys = [...new Set(body.sectionKeys ?? [])];
      const sectionRows = gddSectionPlan.filter(([key]) => requestedKeys.includes(key));
      if (!sectionRows.length || sectionRows.length !== requestedKeys.length || sectionRows.length > 7) {
        return Response.json({ error: "GDD 章节批次无效。" }, { status: 400 });
      }
      const sectionContract = sectionRows.map(([key, title, purpose, sources]) => `${key}｜${title}｜${purpose}｜主要证据 ${sources.join("/")}`).join("\n");
      const result = await createStructuredResponse<GeneratedSections>({
        name: `gdd_sections_${sectionRows[0][0]}`,
        projectId: project.id,
        schema: gddSectionsSchema,
        role: "gdd",
        maxTokens: 3200,
        timeoutMs: 48_000,
        instructions: [
          "你是游戏设计文档编辑。只根据已确认答案撰写指定的 GDD 章节。",
          "必须覆盖契约中的每个 key，不能添加未请求章节；每章约 120–260 个中文字符，写成可执行的设计说明。",
          "每章必须提供真实 sourceQuestionIds。不要补造关键机制；证据不足时明确写出边界。",
        ].join("\n"),
        input: `项目名：${project.title}\n\n本批章节契约：\n${sectionContract}\n\n用户设计状态：\n${designInput}`,
      });
      return Response.json({ snapshotKey: currentSnapshotKey, result });
    }

    if (body.action === "fidelity") {
      const sections = validateStructuredValue<GeneratedSections>({ sections: body.sections }, gddSectionsSchema).sections;
      const result = await checkGddFidelity(project.id, project.title, designInput, sections);
      return Response.json({ snapshotKey: currentSnapshotKey, result: { sections: applyFidelityPatches(sections, result), patches: result.patches } });
    }

    if (body.action !== "finalize") {
      return Response.json({ error: "GDD 生成步骤无效，请刷新页面后重试。" }, { status: 400 });
    }

    const generatedSummary = validateStructuredValue<GeneratedSummary>({
      title: body.title,
      oneLinePitch: body.oneLinePitch,
      stageSummaries: body.stageSummaries,
    }, gddSummarySchema);
    const generatedSections = validateStructuredValue<GeneratedSections>({ sections: body.sections }, gddSectionsSchema);
    if (generatedSummary.title.length > 240 || generatedSummary.oneLinePitch.length > 1000 || generatedSections.sections.some((section) => section.content.length > 4000)) {
      return Response.json({ error: "生成的 GDD 内容超过安全限制，请重新生成。" }, { status: 400 });
    }

    const normalizedSections: GddSection[] = gddSectionPlan.map(([key, title, , defaultSources]) => {
      const value = generatedSections.sections.find((section) => section.key === key);
      return {
        key,
        title,
        content: value?.content?.trim() || defaultSources.map((id) => snapshot[id]?.answer).filter(Boolean).join("\n\n"),
        sourceQuestionIds: sanitizeQuestionIds(value?.sourceQuestionIds?.length ? value.sourceQuestionIds : [...defaultSources]),
      };
    });
    const normalizedSummaries = stages.map((stage) => {
      const value = generatedSummary.stageSummaries.find((summary) => summary.stageId === stage.id);
      return value ?? {
        stageId: stage.id,
        summary: stage.questions.map((question) => snapshot[question.id]?.answer).filter(Boolean).join("；"),
        keyDecisions: [],
        openQuestions: [],
      };
    });

    const now = new Date().toISOString();
    const snapshotId = crypto.randomUUID();
    const gddId = crypto.randomUUID();
    const version = project.gddVersion + 1;
    await db.batch([
      db.insert(designSnapshots).values({
        id: snapshotId,
        projectId: project.id,
        answerRevisionsJson: JSON.stringify(Object.fromEntries(Object.entries(snapshot).map(([id, answer]) => [id, answer.revision]))),
        answersJson: JSON.stringify(snapshot),
        createdAt: now,
      }),
      db.update(stageSummaries).set({ status: "stale" }).where(and(eq(stageSummaries.projectId, project.id), eq(stageSummaries.status, "current"))),
      db.update(gddVersions).set({ status: "stale", updatedAt: now }).where(and(eq(gddVersions.projectId, project.id), eq(gddVersions.version, project.gddVersion))),
      db.update(buildBriefs).set({ status: "stale" }).where(and(eq(buildBriefs.projectId, project.id), eq(buildBriefs.version, project.buildBriefVersion))),
      db.update(gddReviewChanges).set({ status: "stale", updatedAt: now }).where(and(eq(gddReviewChanges.projectId, project.id), eq(gddReviewChanges.status, "proposed"))),
      db.insert(gddVersions).values({
        id: gddId,
        projectId: project.id,
        snapshotId,
        version,
        status: "draft",
        title: generatedSummary.title.trim() || project.title,
        oneLinePitch: generatedSummary.oneLinePitch.trim(),
        sectionsJson: JSON.stringify(normalizedSections),
        fidelityStatus: "ready",
        createdAt: now,
        updatedAt: now,
      }),
      ...normalizedSummaries.map((summary) => db.insert(stageSummaries).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        snapshotId,
        stageId: summary.stageId,
        version,
        status: "current",
        summary: summary.summary.trim(),
        keyDecisionsJson: JSON.stringify(summary.keyDecisions),
        openQuestionsJson: JSON.stringify(summary.openQuestions),
        createdAt: now,
      })),
      db.update(projects).set({ gddVersion: version, updatedAt: now }).where(eq(projects.id, project.id)),
    ]);
    return Response.json(await getWorkspace(user, project.id), { status: 201 });
  } catch (error) {
    const status = requestStatus(error);
    return Response.json({ error: error instanceof Error ? error.message : "GDD 生成失败。", configurationRequired: status === 503 }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as {
      projectId?: string;
      action?: "confirm" | "edit_section" | "verify_fidelity";
      sectionKey?: string;
      content?: string;
    };
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const db = getDb();
    const [gdd] = await db.select().from(gddVersions).where(eq(gddVersions.projectId, project.id)).orderBy(desc(gddVersions.version)).limit(1);
    if (!gdd) return Response.json({ error: "还没有 GDD。" }, { status: 404 });
    const now = new Date().toISOString();

    if (body.action === "confirm") {
      if (gdd.status === "stale") return Response.json({ error: "设计答案已经变化，请重新生成 GDD 后再确认。" }, { status: 409 });
      if (gdd.fidelityStatus !== "ready") return Response.json({ error: "GDD 章节已手动变化，请先完成文档忠实度检查。" }, { status: 409 });
      const snapshot = await loadAnswerSnapshot(project.id);
      const [review] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
      if (!review || review.status !== "ready" || review.snapshotKey !== answerSnapshotKey(snapshot)) return Response.json({ error: "最新 Design State 尚未通过全局审查，不能确认 GDD。" }, { status: 409 });
      await db.update(gddVersions).set({ status: "confirmed", confirmedAt: now, updatedAt: now }).where(eq(gddVersions.id, gdd.id));
    } else if (body.action === "edit_section") {
      const content = body.content?.trim() ?? "";
      if (!body.sectionKey || !content || content.length > 12000) return Response.json({ error: "章节内容无效。" }, { status: 400 });
      const sections = JSON.parse(gdd.sectionsJson) as GddSection[];
      const index = sections.findIndex((section) => section.key === body.sectionKey);
      if (index < 0) return Response.json({ error: "章节不存在。" }, { status: 404 });
      sections[index] = { ...sections[index], content };
      await Promise.all([
        db.update(gddVersions).set({ sectionsJson: JSON.stringify(sections), status: "draft", fidelityStatus: "dirty", confirmedAt: null, updatedAt: now }).where(eq(gddVersions.id, gdd.id)),
        db.update(buildBriefs).set({ status: "stale" }).where(and(eq(buildBriefs.projectId, project.id), eq(buildBriefs.version, project.buildBriefVersion))),
        db.update(gddReviewChanges).set({ status: "stale", updatedAt: now }).where(and(eq(gddReviewChanges.gddVersionId, gdd.id), eq(gddReviewChanges.status, "proposed"))),
      ]);
    } else if (body.action === "verify_fidelity") {
      if (gdd.status === "stale") return Response.json({ error: "Design State 已变化，请基于最新答案重新生成 GDD。" }, { status: 409 });
      const snapshot = await loadAnswerSnapshot(project.id);
      const [review] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
      if (!review || review.status !== "ready" || review.snapshotKey !== answerSnapshotKey(snapshot)) return Response.json({ error: "最新 Design State 尚未通过审查。" }, { status: 409 });
      const sections = JSON.parse(gdd.sectionsJson) as GddSection[];
      const result = await checkGddFidelity(project.id, project.title, designStateText(snapshot), sections);
      const correctedSections = applyFidelityPatches(sections, result);
      await db.update(gddVersions).set({ sectionsJson: JSON.stringify(correctedSections), fidelityStatus: "ready", status: "draft", confirmedAt: null, updatedAt: now }).where(eq(gddVersions.id, gdd.id));
    } else {
      return Response.json({ error: "不支持的操作。" }, { status: 400 });
    }
    return Response.json(await getWorkspace(user, project.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "GDD 更新失败。" }, { status: 500 });
  }
}
