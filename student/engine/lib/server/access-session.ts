import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { studyParticipants } from "@/db/schema";

const PARTICIPANT_COOKIE = "game_workflow_participant";
const ADMIN_COOKIE = "game_workflow_admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type ParticipantSession = {
  participantId: string;
  ownerId: string;
  code: string;
  sessionVersion: number;
};

function sessionSecret() {
  const secret = process.env.APP_SESSION_SECRET?.trim();
  if (!secret || secret.length < 24 || secret.startsWith("replace-with-")) {
    throw new Error("系统需要至少 24 个字符的 APP_SESSION_SECRET。");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function encodeSigned(value: string) {
  const encoded = Buffer.from(value, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodeSigned(token: string | undefined) {
  if (!token) return null;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token.trim(), "utf8").digest("hex");
}

export function createParticipantToken() {
  return randomBytes(24).toString("base64url");
}

export function requestUsesHttps(request: Request) {
  return request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
    || new URL(request.url).protocol === "https:";
}

export async function findParticipantByToken(token: string) {
  const [participant] = await getDb()
    .select()
    .from(studyParticipants)
    .where(and(
      eq(studyParticipants.accessTokenHash, tokenHash(token)),
      eq(studyParticipants.status, "active"),
    ))
    .limit(1);
  return participant ?? null;
}

export async function setParticipantSession(participant: ParticipantSession, secure: boolean) {
  const store = await cookies();
  store.set(PARTICIPANT_COOKIE, encodeSigned(JSON.stringify(participant)), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearParticipantSession() {
  const store = await cookies();
  store.delete(PARTICIPANT_COOKIE);
}

export async function readParticipantSession(): Promise<ParticipantSession | null> {
  const store = await cookies();
  const decoded = decodeSigned(store.get(PARTICIPANT_COOKIE)?.value);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded) as Partial<ParticipantSession>;
    if (!parsed.participantId || !parsed.ownerId || !parsed.code || !parsed.sessionVersion) return null;
    const [participant] = await getDb()
      .select()
      .from(studyParticipants)
      .where(and(
        eq(studyParticipants.id, parsed.participantId),
        eq(studyParticipants.ownerId, parsed.ownerId),
        eq(studyParticipants.sessionVersion, parsed.sessionVersion),
        eq(studyParticipants.status, "active"),
      ))
      .limit(1);
    return participant ? {
      participantId: participant.id,
      ownerId: participant.ownerId,
      code: participant.code,
      sessionVersion: participant.sessionVersion,
    } : null;
  } catch {
    return null;
  }
}

export async function verifyAdminPassword(password: string) {
  const expected = process.env.APP_ADMIN_PASSWORD?.trim();
  if (!expected || expected.length < 12 || expected.startsWith("replace-with-")) {
    throw new Error("请先配置至少 12 个字符的 APP_ADMIN_PASSWORD。");
  }
  const left = Buffer.from(password);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function setAdminSession(secure: boolean) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, encodeSigned("admin"), {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function hasAdminSession() {
  const store = await cookies();
  return decodeSigned(store.get(ADMIN_COOKIE)?.value) === "admin";
}
