import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects, studyParticipants } from "@/db/schema";
import { hasAdminSession } from "@/lib/server/access-session";
import { buildResearchExport } from "@/lib/server/research-export";

export async function GET(
  _request: Request,
  context: { params: Promise<{ participantId: string }> },
) {
  try {
    if (!await hasAdminSession()) {
      return Response.json({ error: "需要管理员登录。" }, { status: 401 });
    }

    const { participantId } = await context.params;
    const db = getDb();
    const [participant] = await db.select()
      .from(studyParticipants)
      .where(eq(studyParticipants.id, participantId))
      .limit(1);
    if (!participant) {
      return Response.json({ error: "参与者不存在。" }, { status: 404 });
    }

    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.ownerId, participant.ownerId))
      .limit(1);
    if (!project) {
      return Response.json({ error: "该参与者尚未创建项目。" }, { status: 404 });
    }

    const data = await buildResearchExport(project.id);
    if (!data) {
      return Response.json({ error: "项目不存在。" }, { status: 404 });
    }
    return Response.json({ participantCode: participant.code, data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取项目失败。" }, { status: 500 });
  }
}
