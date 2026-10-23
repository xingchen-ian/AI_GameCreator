import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { buildBriefs, designReviewChanges, designReviewIssues, designReviewRuns, gddIssues, gddReviewChanges, gddVersions, messages, projects, questionAnswers, stageSummaries } from "@/db/schema";
import type { ChatGPTUser } from "@/app/chatgpt-auth";
import type { AnswerStatus, ChatMessage, StoredAnswer, WorkspacePayload } from "@/lib/design/types";
import { allQuestions } from "@/lib/protocol/stages";
import { ensureResearchParticipant } from "@/lib/server/research-participant";

const activeQuestionIds = new Set(allQuestions.map((question) => question.id));

function normalizeActiveQuestionId(questionId: string) {
  if (activeQuestionIds.has(questionId)) return questionId;
  if (questionId === "Q22" || questionId === "Q23") return "Q21";
  return "Q1";
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function normalizeAnswerStatus(status: string): AnswerStatus {
  return status === "draft" ? "draft" : "confirmed";
}

export async function ensureOwnedProject(user: ChatGPTUser, preferredProjectId?: string | null) {
  const db = getDb();
  if (preferredProjectId) {
    const [preferred] = await db.select().from(projects).where(and(eq(projects.id, preferredProjectId), eq(projects.ownerId, user.userId), eq(projects.status, "active"))).limit(1);
    if (preferred) return preferred;
  }
  const [existing] = await db.select().from(projects).where(and(eq(projects.ownerId, user.userId), eq(projects.status, "active"))).orderBy(desc(projects.createdAt)).limit(1);
  if (existing) return existing;

  const now = new Date().toISOString();
  const [created] = await db.insert(projects).values({
    id: crypto.randomUUID(),
    ownerId: user.userId,
    ownerEmail: user.email,
    title: "未命名游戏",
    createdAt: now,
    updatedAt: now,
  }).returning();
  return created;
}

export async function requireOwnedProject(projectId: string, user: ChatGPTUser) {
  const db = getDb();
  const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, user.userId), eq(projects.status, "active"))).limit(1);
  return project ?? null;
}

export async function requireAnyOwnedProject(projectId: string, user: ChatGPTUser) {
  const db = getDb();
  const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, user.userId))).limit(1);
  return project ?? null;
}

export async function getWorkspace(user: ChatGPTUser, preferredProjectId?: string | null): Promise<WorkspacePayload> {
  const db = getDb();
  await ensureResearchParticipant(user.userId);
  const project = await ensureOwnedProject(user, preferredProjectId);
  const [answerRows, messageRows, summaryRows, latestReviewRows, latestGddRows, latestBriefRows, reviewChangeRows, designReviewChangeRows] = await Promise.all([
    db.select().from(questionAnswers).where(eq(questionAnswers.projectId, project.id)).orderBy(asc(questionAnswers.questionId)),
    db.select().from(messages).where(eq(messages.projectId, project.id)).orderBy(asc(messages.createdAt)),
    db.select().from(stageSummaries).where(eq(stageSummaries.projectId, project.id)).orderBy(desc(stageSummaries.version)),
    db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1),
    db.select().from(gddVersions).where(eq(gddVersions.projectId, project.id)).orderBy(desc(gddVersions.version)).limit(1),
    db.select().from(buildBriefs).where(eq(buildBriefs.projectId, project.id)).orderBy(desc(buildBriefs.version)).limit(1),
    db.select().from(gddReviewChanges).where(eq(gddReviewChanges.projectId, project.id)).orderBy(asc(gddReviewChanges.createdAt)),
    db.select().from(designReviewChanges).where(eq(designReviewChanges.projectId, project.id)).orderBy(asc(designReviewChanges.createdAt)),
  ]);

  const answers: Record<string, StoredAnswer> = {};
  for (const row of answerRows) {
    if (!activeQuestionIds.has(row.questionId)) continue;
    answers[row.questionId] = {
      answer: row.answer,
      status: normalizeAnswerStatus(row.status),
      revision: row.revision,
      structuredData: parseObject(row.structuredJson),
      updatedAt: row.updatedAt,
    };
  }

  const chats: Record<string, ChatMessage[]> = {};
  for (const row of messageRows) {
    (chats[row.questionId] ??= []).push({ id: row.id, role: row.role, text: row.content, createdAt: row.createdAt });
  }

  const summaries: WorkspacePayload["stageSummaries"] = {};
  for (const row of summaryRows) {
    if (summaries[row.stageId]) continue;
    summaries[row.stageId] = {
      stageId: row.stageId,
      version: row.version,
      status: row.status,
      summary: row.summary,
      keyDecisions: parseArray<string>(row.keyDecisionsJson),
      openQuestions: parseArray<string>(row.openQuestionsJson),
      createdAt: row.createdAt,
    };
  }

  const latestGddRow = latestGddRows[0];
  let latestGdd: WorkspacePayload["latestGdd"] = null;
  if (latestGddRow) {
    const issueRows = await db.select().from(gddIssues).where(eq(gddIssues.gddVersionId, latestGddRow.id)).orderBy(asc(gddIssues.createdAt));
    latestGdd = {
      id: latestGddRow.id,
      version: latestGddRow.version,
      status: latestGddRow.status,
      title: latestGddRow.title,
      oneLinePitch: latestGddRow.oneLinePitch,
      sections: parseArray(latestGddRow.sectionsJson),
      fidelityStatus: latestGddRow.fidelityStatus,
      issues: issueRows.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        title: issue.title,
        evidence: issue.evidence,
        whyItMatters: issue.whyItMatters,
        questionIds: parseArray<string>(issue.questionIdsJson),
        options: parseArray<string>(issue.optionsJson),
        status: issue.status,
        resolutionNote: issue.resolutionNote,
      })),
      confirmedAt: latestGddRow.confirmedAt,
      createdAt: latestGddRow.createdAt,
      updatedAt: latestGddRow.updatedAt,
    };
  }

  const latestBriefRow = latestBriefRows[0];
  let briefGddVersion = 0;
  if (latestBriefRow) {
    if (latestGddRow?.id === latestBriefRow.gddVersionId) {
      briefGddVersion = latestGddRow.version;
    } else {
      const [briefGdd] = await db.select({ version: gddVersions.version }).from(gddVersions).where(eq(gddVersions.id, latestBriefRow.gddVersionId)).limit(1);
      briefGddVersion = briefGdd?.version ?? 0;
    }
  }
  const latestBuildBrief: WorkspacePayload["latestBuildBrief"] = latestBriefRow && latestGddRow ? {
    id: latestBriefRow.id,
    version: latestBriefRow.version,
    status: latestBriefRow.status,
    gddVersion: briefGddVersion,
    markdown: latestBriefRow.markdown,
    createdAt: latestBriefRow.createdAt,
  } : null;

  const reviewChanges: WorkspacePayload["gddReviewChanges"] = reviewChangeRows.map((change) => ({
    id: change.id,
    messageId: change.messageId,
    gddVersionId: change.gddVersionId,
    targetType: change.targetType,
    targetId: change.targetId,
    issueIds: parseArray<string>(change.issueIdsJson),
    summary: change.summary,
    rationale: change.rationale,
    beforeContent: change.beforeContent,
    proposedContent: change.proposedContent,
    status: change.status,
    appliedAt: change.appliedAt,
    createdAt: change.createdAt,
    updatedAt: change.updatedAt,
  }));

  const latestReviewRow = latestReviewRows[0];
  let latestDesignReview: WorkspacePayload["latestDesignReview"] = null;
  if (latestReviewRow) {
    const issueRows = await db.select().from(designReviewIssues).where(eq(designReviewIssues.lastSeenRunId, latestReviewRow.id)).orderBy(asc(designReviewIssues.createdAt));
    latestDesignReview = {
      id: latestReviewRow.id,
      version: latestReviewRow.version,
      snapshotKey: latestReviewRow.snapshotKey,
      status: latestReviewRow.status,
      issues: issueRows.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        title: issue.title,
        evidence: issue.evidence,
        whyItMatters: issue.whyItMatters,
        questionIds: parseArray<string>(issue.questionIdsJson),
        options: parseArray<string>(issue.optionsJson),
        status: issue.status,
        resolutionNote: issue.resolutionNote,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      })),
      createdAt: latestReviewRow.createdAt,
      updatedAt: latestReviewRow.updatedAt,
      completedAt: latestReviewRow.completedAt,
    };
  }

  const designChanges: WorkspacePayload["designReviewChanges"] = designReviewChangeRows.map((change) => ({
    id: change.id,
    messageId: change.messageId,
    reviewRunId: change.reviewRunId,
    issueId: change.issueId,
    targetQuestionId: change.targetQuestionId,
    summary: change.summary,
    rationale: change.rationale,
    beforeContent: change.beforeContent,
    beforeRevision: change.beforeRevision,
    proposedContent: change.proposedContent,
    status: change.status,
    appliedAt: change.appliedAt,
    createdAt: change.createdAt,
    updatedAt: change.updatedAt,
  }));

  const projectRows = await db.select().from(projects).where(eq(projects.ownerId, user.userId)).orderBy(desc(projects.updatedAt));
  const projectIds = projectRows.map((row) => row.id);
  const allAnswerRows = projectIds.length
    ? await db.select({ projectId: questionAnswers.projectId, questionId: questionAnswers.questionId, status: questionAnswers.status }).from(questionAnswers).where(inArray(questionAnswers.projectId, projectIds))
    : [];
  const answerCounts = new Map<string, number>();
  for (const answer of allAnswerRows) {
    if (!activeQuestionIds.has(answer.questionId)) continue;
    if (normalizeAnswerStatus(answer.status) === "confirmed") answerCounts.set(answer.projectId, (answerCounts.get(answer.projectId) ?? 0) + 1);
  }

  return {
    project: {
      id: project.id,
      title: project.title,
      activeQuestionId: normalizeActiveQuestionId(project.activeQuestionId),
      gddVersion: project.gddVersion,
      buildBriefVersion: project.buildBriefVersion,
      updatedAt: project.updatedAt,
    },
    projects: projectRows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      confirmedAnswerCount: answerCounts.get(row.id) ?? 0,
      gddVersion: row.gddVersion,
      buildBriefVersion: row.buildBriefVersion,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt,
    })),
    answers,
    chats,
    stageSummaries: summaries,
    latestDesignReview,
    designReviewChanges: designChanges,
    latestGdd,
    gddReviewChanges: reviewChanges,
    latestBuildBrief,
  };
}

export async function loadAnswerSnapshot(projectId: string) {
  const db = getDb();
  const rows = await db.select().from(questionAnswers).where(eq(questionAnswers.projectId, projectId)).orderBy(asc(questionAnswers.questionId));
  return Object.fromEntries(rows.filter((row) => activeQuestionIds.has(row.questionId)).map((row) => [row.questionId, { answer: row.answer, status: normalizeAnswerStatus(row.status), revision: row.revision }]));
}
