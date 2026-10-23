import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  aiSuggestions,
  answerRevisions,
  designReviewChanges,
  designReviewIssues,
  designReviewRuns,
  designReviewVerdicts,
  gddVersions,
  messages,
  modelCalls,
  projects,
  questionAnswers,
  stageSummaries,
} from "@/db/schema";
import { ensureResearchParticipant } from "@/lib/server/research-participant";

export const RESEARCH_EXPORT_FORMAT_VERSION = 2;

type TimelineEvent = {
  at: string;
  type: "message" | "ai_suggestion" | "answer_revision" | "design_review_run" | "design_review_change" | "model_call";
  questionId: string | null;
  actor: "user" | "ai" | "system";
  refId: string;
  summary: string;
};

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function preview(text: string, length = 80) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > length ? `${compact.slice(0, length)}…` : compact;
}

/**
 * 导出一个项目的完整过程数据，用于离线研究分析。
 * 不包含所有者邮箱或用户 ID；项目内容本身可能含有个人信息，发布前需要人工检查。
 */
export async function buildResearchExport(projectId: string) {
  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  const participant = await ensureResearchParticipant(project.ownerId);

  const [answerRows, revisionRows, suggestionRows, messageRows, callRows, runRows, issueRows, changeRows, summaryRows, gddRows] = await Promise.all([
    db.select().from(questionAnswers).where(eq(questionAnswers.projectId, projectId)).orderBy(asc(questionAnswers.questionId)),
    db.select().from(answerRevisions).where(eq(answerRevisions.projectId, projectId)).orderBy(asc(answerRevisions.createdAt)),
    db.select().from(aiSuggestions).where(eq(aiSuggestions.projectId, projectId)).orderBy(asc(aiSuggestions.createdAt)),
    db.select().from(messages).where(eq(messages.projectId, projectId)).orderBy(asc(messages.createdAt)),
    db.select().from(modelCalls).where(eq(modelCalls.projectId, projectId)).orderBy(asc(modelCalls.createdAt)),
    db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, projectId)).orderBy(asc(designReviewRuns.version)),
    db.select().from(designReviewIssues).where(eq(designReviewIssues.projectId, projectId)).orderBy(asc(designReviewIssues.createdAt)),
    db.select().from(designReviewChanges).where(eq(designReviewChanges.projectId, projectId)).orderBy(asc(designReviewChanges.createdAt)),
    db.select().from(stageSummaries).where(eq(stageSummaries.projectId, projectId)).orderBy(asc(stageSummaries.createdAt)),
    db.select().from(gddVersions).where(eq(gddVersions.projectId, projectId)).orderBy(asc(gddVersions.version)),
  ]);
  const verdictRows = runRows.length
    ? await db.select().from(designReviewVerdicts).where(inArray(designReviewVerdicts.reviewRunId, runRows.map((run) => run.id))).orderBy(asc(designReviewVerdicts.createdAt))
    : [];

  const timeline: TimelineEvent[] = [
    ...messageRows.map((row): TimelineEvent => ({ at: row.createdAt, type: "message", questionId: row.questionId, actor: row.role === "user" ? "user" : "ai", refId: row.id, summary: preview(row.content) })),
    ...suggestionRows.map((row): TimelineEvent => ({ at: row.createdAt, type: "ai_suggestion", questionId: row.questionId, actor: "ai", refId: row.id, summary: `${row.source}: ${preview(row.suggestedAnswer)}` })),
    ...revisionRows.map((row): TimelineEvent => ({
      at: row.createdAt,
      type: "answer_revision",
      questionId: row.questionId,
      actor: row.source === "backfill" ? "system" : "user",
      refId: row.id,
      summary: `r${row.revision} ${row.source}${row.adoption ? `/${row.adoption}` : ""}: ${preview(row.answer)}`,
    })),
    ...runRows.map((row): TimelineEvent => ({ at: row.createdAt, type: "design_review_run", questionId: null, actor: "system", refId: row.id, summary: `v${row.version} ${row.status}` })),
    ...changeRows.map((row): TimelineEvent => ({ at: row.appliedAt ?? row.createdAt, type: "design_review_change", questionId: row.targetQuestionId, actor: row.status === "applied" || row.status === "dismissed" ? "user" : "ai", refId: row.id, summary: `${row.status}: ${preview(row.summary)}` })),
    ...callRows.map((row): TimelineEvent => ({ at: row.createdAt, type: "model_call", questionId: null, actor: "system", refId: row.id, summary: `${row.operation} ${row.model} ${row.outcome} ${row.durationMs}ms` })),
  ].sort((a, b) => a.at.replace(" ", "T").localeCompare(b.at.replace(" ", "T")));

  return {
    format: "game-workflow-research-export",
    formatVersion: RESEARCH_EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    notes: [
      "不包含账号邮箱或用户 ID；participant.id 是系统生成的匿名稳定研究编号。项目标题、对话和答案可能包含个人信息，用于研究前请人工检查。",
      "answer_revisions 中 source=backfill 的行来自记录功能上线时的现有答案，更早的修订没有保存。",
      "记录功能上线前的 AI 建议和模型调用不存在；旧 model_calls 的版本参数使用 legacy、unknown 或默认值标记。",
    ],
    participant: {
      id: participant.id,
      createdAt: participant.createdAt,
    },
    project: {
      id: project.id,
      title: project.title,
      status: project.status,
      activeQuestionId: project.activeQuestionId,
      gddVersion: project.gddVersion,
      buildBriefVersion: project.buildBriefVersion,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
    },
    currentAnswers: answerRows.map((row) => ({ questionId: row.questionId, revision: row.revision, status: row.status, answer: row.answer, structuredData: parseJson(row.structuredJson), updatedAt: row.updatedAt })),
    answerRevisions: revisionRows.map((row) => ({ id: row.id, questionId: row.questionId, revision: row.revision, source: row.source, adoption: row.adoption, suggestionId: row.suggestionId, answer: row.answer, createdAt: row.createdAt })),
    aiSuggestions: suggestionRows.map((row) => ({ id: row.id, questionId: row.questionId, source: row.source, messageId: row.messageId, model: row.model, suggestedAnswer: row.suggestedAnswer, structuredData: parseJson(row.structuredJson), createdAt: row.createdAt })),
    messages: messageRows.map((row) => ({ id: row.id, questionId: row.questionId, role: row.role, content: row.content, createdAt: row.createdAt })),
    modelCalls: callRows.map((row) => ({
      id: row.id,
      operation: row.operation,
      role: row.role,
      model: row.model,
      appVersion: row.appVersion,
      promptVersion: row.promptVersion,
      schemaVersion: row.schemaVersion,
      temperature: row.temperature,
      thinkingEnabled: row.thinkingEnabled,
      outcome: row.outcome,
      strictFallback: row.strictFallback,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      contextStrategy: row.contextStrategy,
      includedAnswerCount: row.includedAnswerCount,
      includedMessageCount: row.includedMessageCount,
      estimatedContextTokens: row.estimatedContextTokens,
      contextTruncated: row.contextTruncated,
      durationMs: row.durationMs,
      createdAt: row.createdAt,
    })),
    designReview: {
      runs: runRows.map((row) => ({ id: row.id, version: row.version, status: row.status, snapshotKey: row.snapshotKey, answers: parseJson(row.answersJson), createdAt: row.createdAt, updatedAt: row.updatedAt, completedAt: row.completedAt })),
      issues: issueRows.map((row) => ({ id: row.id, firstSeenRunId: row.firstSeenRunId, lastSeenRunId: row.lastSeenRunId, severity: row.severity, status: row.status, title: row.title, evidence: row.evidence, whyItMatters: row.whyItMatters, questionIds: parseJson(row.questionIdsJson), options: parseJson(row.optionsJson), resolutionNote: row.resolutionNote, createdAt: row.createdAt, updatedAt: row.updatedAt })),
      verdicts: verdictRows.map((row) => ({ id: row.id, reviewRunId: row.reviewRunId, issueId: row.issueId, verdict: row.verdict, reason: row.reason, createdAt: row.createdAt })),
      changes: changeRows.map((row) => ({ id: row.id, reviewRunId: row.reviewRunId, issueId: row.issueId, targetQuestionId: row.targetQuestionId, status: row.status, summary: row.summary, rationale: row.rationale, beforeContent: row.beforeContent, beforeRevision: row.beforeRevision, finalContent: row.proposedContent, appliedAt: row.appliedAt, createdAt: row.createdAt })),
    },
    stageSummaries: summaryRows.map((row) => ({ stageId: row.stageId, version: row.version, status: row.status, summary: row.summary, keyDecisions: parseJson(row.keyDecisionsJson), openQuestions: parseJson(row.openQuestionsJson), createdAt: row.createdAt })),
    gddVersions: gddRows.map((row) => ({ version: row.version, status: row.status, fidelityStatus: row.fidelityStatus, title: row.title, oneLinePitch: row.oneLinePitch, sections: parseJson(row.sectionsJson), confirmedAt: row.confirmedAt, createdAt: row.createdAt })),
    timeline,
  };
}
