import { and, asc, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { backgroundJobs } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { refreshWorkingConversationSummary } from "@/lib/server/conversation-memory";
import { ensureQuestionMemory } from "@/lib/server/question-memory";

export type BackgroundJobType = "question_memory" | "conversation_summary";

type BackgroundJobPayload = {
  questionId: string;
  answerRevision?: number;
  throughMessageId?: string;
};

function retryAt(attempts: number) {
  const delays = [5, 30, 120, 600, 3_600];
  const seconds = delays[Math.min(Math.max(attempts - 1, 0), delays.length - 1)];
  return new Date(Date.now() + seconds * 1_000).toISOString();
}

export async function enqueueBackgroundJob({
  projectId,
  type,
  dedupeKey,
  payload,
}: {
  projectId: string;
  type: BackgroundJobType;
  dedupeKey: string;
  payload: BackgroundJobPayload;
}) {
  const now = new Date().toISOString();
  await getDb().insert(backgroundJobs).values({
    id: crypto.randomUUID(),
    projectId,
    type,
    dedupeKey,
    payloadJson: JSON.stringify(payload),
    status: "pending",
    attempts: 0,
    availableAt: now,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();
}

async function runJob(type: BackgroundJobType, projectId: string, payload: BackgroundJobPayload) {
  if (type === "question_memory") {
    const question = allQuestions.find((item) => item.id === payload.questionId);
    if (!question) throw new Error(`Unknown question: ${payload.questionId}`);
    await ensureQuestionMemory(projectId, question);
    return;
  }
  await refreshWorkingConversationSummary(projectId, payload.questionId);
}

/**
 * Drains a small number of persisted jobs after an HTTP response. A crashed
 * process leaves the job in SQLite; a later request resets stale claims and
 * retries it instead of making the user-facing request wait.
 */
export async function processBackgroundJobs({ projectId, limit = 2 }: { projectId?: string; limit?: number } = {}) {
  const db = getDb();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 10 * 60 * 1_000).toISOString();
  await db.update(backgroundJobs).set({ status: "pending", availableAt: now, updatedAt: now })
    .where(and(eq(backgroundJobs.status, "running"), lte(backgroundJobs.updatedAt, staleBefore)));

  const filters = [eq(backgroundJobs.status, "pending"), lte(backgroundJobs.availableAt, now)];
  if (projectId) filters.push(eq(backgroundJobs.projectId, projectId));
  const jobs = await db.select().from(backgroundJobs).where(and(...filters))
    .orderBy(asc(backgroundJobs.createdAt)).limit(limit);

  for (const job of jobs) {
    const claimedAt = new Date().toISOString();
    const [claimed] = await db.update(backgroundJobs).set({
      status: "running",
      attempts: job.attempts + 1,
      updatedAt: claimedAt,
    }).where(and(eq(backgroundJobs.id, job.id), eq(backgroundJobs.status, "pending"))).returning({ id: backgroundJobs.id });
    if (!claimed) continue;

    try {
      const payload = JSON.parse(job.payloadJson) as BackgroundJobPayload;
      await runJob(job.type, job.projectId, payload);
      const completedAt = new Date().toISOString();
      await db.update(backgroundJobs).set({
        status: "completed",
        lastError: null,
        completedAt,
        updatedAt: completedAt,
      }).where(eq(backgroundJobs.id, job.id));
    } catch (error) {
      const failedAt = new Date().toISOString();
      await db.update(backgroundJobs).set({
        status: "pending",
        availableAt: retryAt(job.attempts + 1),
        lastError: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown background job error",
        updatedAt: failedAt,
      }).where(eq(backgroundJobs.id, job.id));
      console.warn(JSON.stringify({
        event: "background_job_failed",
        jobId: job.id,
        projectId: job.projectId,
        type: job.type,
        attempts: job.attempts + 1,
        reason: error instanceof Error ? error.message.slice(0, 240) : "unknown",
      }));
    }
  }
}
