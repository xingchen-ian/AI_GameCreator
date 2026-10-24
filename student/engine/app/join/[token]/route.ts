import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { studyParticipants } from "@/db/schema";
import {
  findParticipantByToken,
  requestUsesHttps,
  setParticipantSession,
} from "@/lib/server/access-session";
import { getStudyRedirectUrl } from "@/lib/server/study-runtime";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const participant = await findParticipantByToken(decodeURIComponent(token));
  if (!participant) return NextResponse.redirect(getStudyRedirectUrl(request.url, "/?accessError=invalid"));
  await setParticipantSession({
    participantId: participant.id,
    ownerId: participant.ownerId,
    code: participant.code,
    sessionVersion: participant.sessionVersion,
  }, requestUsesHttps(request));
  await getDb().update(studyParticipants)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(studyParticipants.id, participant.id));
  return NextResponse.redirect(getStudyRedirectUrl(request.url, "/"));
}
