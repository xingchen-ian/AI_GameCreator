import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, questionAnswers, studyParticipants } from "@/db/schema";
import { createParticipantToken, hasAdminSession, tokenHash } from "@/lib/server/access-session";
import { getStudyPublicUrl } from "@/lib/server/study-runtime";
import { getBackupStatus } from "@/lib/server/backup-status";

async function listParticipants() {
  const db = getDb();
  const participants = await db.select().from(studyParticipants).orderBy(asc(studyParticipants.createdAt));
  const ownerIds = participants.map((participant) => participant.ownerId);
  const projectRows = ownerIds.length
    ? await db.select().from(projects).where(inArray(projects.ownerId, ownerIds))
    : [];
  const projectIds = projectRows.map((project) => project.id);
  const answerRows = projectIds.length
    ? await db.select({ projectId: questionAnswers.projectId }).from(questionAnswers).where(inArray(questionAnswers.projectId, projectIds))
    : [];
  const answerCounts = new Map<string, number>();
  for (const answer of answerRows) answerCounts.set(answer.projectId, (answerCounts.get(answer.projectId) ?? 0) + 1);
  const projectByOwner = new Map(projectRows.map((project) => [project.ownerId, project]));
  return participants.map((participant) => {
    const project = projectByOwner.get(participant.ownerId);
    return {
      id: participant.id,
      code: participant.code,
      status: participant.status,
      createdAt: participant.createdAt,
      lastSeenAt: participant.lastSeenAt,
      project: project ? {
        id: project.id,
        title: project.title,
        status: project.status,
        activeQuestionId: project.activeQuestionId,
        confirmedAnswerCount: answerCounts.get(project.id) ?? 0,
        updatedAt: project.updatedAt,
      } : null,
    };
  });
}

export async function GET() {
  if (!await hasAdminSession()) return Response.json({ error: "需要管理员登录。" }, { status: 401 });
  return Response.json({ participants: await listParticipants(), publicUrl: getStudyPublicUrl(), backupStatus: getBackupStatus() });
}

export async function POST(request: Request) {
  try {
    if (!await hasAdminSession()) return Response.json({ error: "需要管理员登录。" }, { status: 401 });
    const body = await request.json() as { code?: string };
    const code = body.code?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9_-]{2,32}$/.test(code)) {
      return Response.json({ error: "编号只能包含 2–32 位大写字母、数字、下划线或短横线。" }, { status: 400 });
    }
    const token = createParticipantToken();
    const now = new Date().toISOString();
    await getDb().insert(studyParticipants).values({
      id: crypto.randomUUID(),
      code,
      accessTokenHash: tokenHash(token),
      ownerId: `participant:${crypto.randomUUID()}`,
      status: "active",
      createdAt: now,
    });
    return Response.json({ token, joinPath: `/join/${encodeURIComponent(token)}`, participants: await listParticipants(), publicUrl: getStudyPublicUrl() }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes("UNIQUE");
    const message = duplicate ? "参与者编号已存在。" : error instanceof Error ? error.message : "创建参与者失败。";
    return Response.json({ error: message }, { status: duplicate ? 409 : 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await hasAdminSession()) return Response.json({ error: "需要管理员登录。" }, { status: 401 });
  const body = await request.json() as {
    action?: "set_status" | "reset_access";
    participantId?: string;
    status?: "active" | "revoked";
  };
  if (!body.participantId) {
    return Response.json({ error: "请求参数无效。" }, { status: 400 });
  }
  if (body.action === "reset_access") {
    const token = createParticipantToken();
    await getDb().update(studyParticipants)
      .set({
        accessTokenHash: tokenHash(token),
        status: "active",
        sessionVersion: sql`${studyParticipants.sessionVersion} + 1`,
      })
      .where(eq(studyParticipants.id, body.participantId));
    return Response.json({ token, joinPath: `/join/${encodeURIComponent(token)}`, participants: await listParticipants(), publicUrl: getStudyPublicUrl() });
  }
  if (!["active", "revoked"].includes(body.status ?? "")) {
    return Response.json({ error: "请求参数无效。" }, { status: 400 });
  }
  await getDb().update(studyParticipants)
    .set(body.status === "revoked"
      ? { status: body.status, sessionVersion: sql`${studyParticipants.sessionVersion} + 1` }
      : { status: body.status! })
    .where(eq(studyParticipants.id, body.participantId));
  return Response.json({ participants: await listParticipants(), publicUrl: getStudyPublicUrl() });
}
