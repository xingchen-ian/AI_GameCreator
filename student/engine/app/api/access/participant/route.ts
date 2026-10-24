import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { studyParticipants } from "@/db/schema";
import {
  clearParticipantSession,
  findParticipantByToken,
  requestUsesHttps,
  setParticipantSession,
} from "@/lib/server/access-session";
import { createVerifiedBackup } from "@/lib/server/database-backup";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const token = body.token?.trim();
    if (!token || token.length > 256) {
      return Response.json({ error: "请输入有效的测试码。" }, { status: 400 });
    }
    const participant = await findParticipantByToken(token);
    if (!participant) {
      return Response.json({ error: "测试码无效或已停用。" }, { status: 401 });
    }
    await setParticipantSession({
      participantId: participant.id,
      ownerId: participant.ownerId,
      code: participant.code,
      sessionVersion: participant.sessionVersion,
    }, requestUsesHttps(request));
    await getDb().update(studyParticipants)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(studyParticipants.id, participant.id));
    return Response.json({ ok: true, participantCode: participant.code });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法进入测试。" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearParticipantSession();
  try {
    const backup = await createVerifiedBackup("participant_exit");
    return Response.json({ ok: true, backup });
  } catch (error) {
    console.error(JSON.stringify({ event: "participant_exit_backup_failed", reason: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ ok: true, backupWarning: "测试数据已保存，但结束备份失败；管理员页面会显示错误。" });
  }
}
