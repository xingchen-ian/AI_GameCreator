import { hasAdminSession, readParticipantSession } from "@/lib/server/access-session";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  accessMode: "local" | "participant";
};

export async function getAppUser(request?: Request): Promise<AppUser | null> {
  if (request?.headers.get("x-game-workflow-access") === "admin-workspace") {
    if (!await hasAdminSession()) return null;
    const email = process.env.APP_USER_EMAIL?.trim() || "local@example.invalid";
    const fullName = process.env.APP_USER_NAME?.trim() || null;
    return {
      userId: process.env.APP_USER_ID?.trim() || "local-owner",
      displayName: fullName ?? email,
      email,
      fullName,
      accessMode: "local",
    };
  }
  const session = await readParticipantSession();
  if (!session) return null;
  return {
    userId: session.ownerId,
    displayName: session.code,
    email: `${session.code.toLowerCase()}@study.invalid`,
    fullName: null,
    accessMode: "participant",
  };
}
