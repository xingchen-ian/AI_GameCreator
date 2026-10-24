import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  throw new Error(".env.local 不存在。请先执行 cp .env.example .env.local，并填写 DASHSCOPE_API_KEY。");
}

let source = readFileSync(envPath, "utf8");

function readValue(key) {
  return source.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
}

function setValue(key, value) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) source = source.replace(pattern, `${key}=${value}`);
  else source = `${source.trimEnd()}\n${key}=${value}\n`;
}

const currentSecret = readValue("APP_SESSION_SECRET");
const currentPassword = readValue("APP_ADMIN_PASSWORD");
const sessionSecret = currentSecret && !currentSecret.startsWith("replace-with-")
  ? currentSecret
  : randomBytes(32).toString("base64url");
const generatedPassword = !currentPassword || currentPassword.startsWith("replace-with-");
const adminPassword = generatedPassword
  ? `admin-${randomBytes(18).toString("base64url")}`
  : currentPassword;

source = source.replace(/^PARTICIPANT_ACCESS_ENABLED=.*(?:\r?\n)?/m, "");
setValue("APP_SESSION_SECRET", sessionSecret);
setValue("APP_ADMIN_PASSWORD", adminPassword);
writeFileSync(envPath, source, { encoding: "utf8", mode: 0o600 });
chmodSync(envPath, 0o600);

console.log("管理员和参与者访问配置已完成。执行 npm run build 后，可用 npm run study:start 启动系统。");
if (generatedPassword) {
  console.log(`管理员密码（请立即保存）：${adminPassword}`);
} else {
  console.log("保留了现有 APP_ADMIN_PASSWORD；未生成或显示新密码。");
}
