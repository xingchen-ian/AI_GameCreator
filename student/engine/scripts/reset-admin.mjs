import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  throw new Error(".env.local 不存在。请先复制 .env.example 并完成基础配置。");
}

let source = readFileSync(envPath, "utf8");
const password = `admin-${randomBytes(18).toString("base64url")}`;
const pattern = /^APP_ADMIN_PASSWORD=.*$/m;
source = pattern.test(source)
  ? source.replace(pattern, `APP_ADMIN_PASSWORD=${password}`)
  : `${source.trimEnd()}\nAPP_ADMIN_PASSWORD=${password}\n`;
writeFileSync(envPath, source, { encoding: "utf8", mode: 0o600 });
chmodSync(envPath, 0o600);

console.log(`新管理员密码（请立即保存）：${password}`);
console.log("重启系统后新密码生效；项目和参与者数据不会改变。");
