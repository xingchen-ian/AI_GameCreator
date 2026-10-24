import { asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, studyParticipants } from "@/db/schema";
import { hasAdminSession } from "@/lib/server/access-session";
import { buildResearchExport } from "@/lib/server/research-export";

export async function GET() {
  try {
    if (!await hasAdminSession()) return Response.json({ error: "需要管理员登录。" }, { status: 401 });
    const db = getDb();
    const participants = await db.select().from(studyParticipants).orderBy(asc(studyParticipants.createdAt));
    const ownerIds = participants.map((participant) => participant.ownerId);
    const projectRows = ownerIds.length
      ? await db.select().from(projects).where(inArray(projects.ownerId, ownerIds)).orderBy(asc(projects.createdAt))
      : [];
    const codeByOwner = new Map(participants.map((participant) => [participant.ownerId, participant.code]));
    const exportedProjects = [];
    for (const project of projectRows) {
      const data = await buildResearchExport(project.id);
      if (data) exportedProjects.push({ participantCode: codeByOwner.get(project.ownerId) ?? "unknown", data });
    }
    const exportedAt = new Date().toISOString();
    const payload = {
      format: "game-workflow-study-export",
      formatVersion: 2,
      exportedAt,
      participantCount: participants.length,
      projectCount: exportedProjects.length,
      participants: participants.map((participant) => ({
        code: participant.code,
        status: participant.status,
        createdAt: participant.createdAt,
        lastSeenAt: participant.lastSeenAt,
      })),
      projects: exportedProjects,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="study-export-${exportedAt.slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "批量导出失败。" }, { status: 500 });
  }
}
