import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const runtimePath = process.env.STUDY_RUNTIME_PATH?.trim()
  || path.join(process.cwd(), ".runtime", "quick-tunnel.json");

function validPublicUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getStudyPublicUrl() {
  const configured = validPublicUrl(process.env.PUBLIC_APP_URL?.trim());
  if (configured) return configured;
  if (!existsSync(runtimePath)) return null;
  try {
    const payload = JSON.parse(readFileSync(runtimePath, "utf8")) as { publicUrl?: unknown };
    return validPublicUrl(payload.publicUrl);
  } catch {
    return null;
  }
}

export function getStudyRedirectUrl(
  requestUrl: string,
  pathname: string,
  publicUrl: string | null = getStudyPublicUrl(),
) {
  return new URL(pathname, publicUrl ?? requestUrl);
}
