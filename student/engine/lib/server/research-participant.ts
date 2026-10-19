import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { researchParticipants } from "@/db/schema";

function createParticipantId() {
  return `P-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

/**
 * 为同一个登录账号返回稳定的匿名研究编号。
 * 导出只包含该编号，不包含用于建立映射的账号 ID。
 */
export async function ensureResearchParticipant(ownerId: string) {
  const db = getDb();
  const [existing] = await db.select().from(researchParticipants).where(eq(researchParticipants.ownerId, ownerId)).limit(1);
  if (existing) return existing;

  await db.insert(researchParticipants).values({
    id: createParticipantId(),
    ownerId,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing({ target: researchParticipants.ownerId });

  const [created] = await db.select().from(researchParticipants).where(eq(researchParticipants.ownerId, ownerId)).limit(1);
  if (!created) throw new Error("无法创建匿名研究编号。");
  return created;
}
