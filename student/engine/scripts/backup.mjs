import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const projectRoot = process.cwd();
if (existsSync(path.join(projectRoot, ".env.local")) && typeof process.loadEnvFile === "function") process.loadEnvFile(path.join(projectRoot, ".env.local"));

const databasePath = path.resolve(projectRoot, process.env.DATABASE_PATH?.trim() || "./data/game-workflow.db");
const backupDir = path.resolve(projectRoot, process.env.BACKUP_DIR?.trim() || "./data/backups");
const reason = process.argv.find((arg) => arg.startsWith("--reason="))?.slice(9) || "manual";
const retentionValue = Number.parseInt(process.env.BACKUP_RETENTION?.trim() || "20", 10);
const retention = Number.isFinite(retentionValue) && retentionValue >= 1 ? Math.min(retentionValue, 500) : 20;
const statusPath = path.join(backupDir, "backup-status.json");

function writeJsonAtomic(target, value) {
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2));
  renameSync(temporary, target);
}

mkdirSync(backupDir, { recursive: true });

if (!existsSync(databasePath)) {
  const status = { ok: true, skipped: true, reason, attemptedAt: new Date().toISOString(), message: "数据库尚未创建，无需备份。" };
  writeJsonAtomic(statusPath, status);
  console.log(status.message);
  process.exit(0);
}

let source;
try {
  source = new Database(databasePath, { readonly: true, fileMustExist: true });
  const sourceIntegrity = source.pragma("integrity_check", { simple: true });
  if (sourceIntegrity !== "ok") throw new Error(`源数据库完整性检查失败：${String(sourceIntegrity)}`);

  const createdAt = new Date().toISOString();
  const timestamp = createdAt.replace(/[:.]/g, "-");
  const filename = `game-workflow-${timestamp}.db`;
  const destination = path.join(backupDir, filename);
  await source.backup(destination);
  source.close();
  source = undefined;

  const copy = new Database(destination, { readonly: true, fileMustExist: true });
  const backupIntegrity = copy.pragma("integrity_check", { simple: true });
  copy.close();
  if (backupIntegrity !== "ok") throw new Error(`备份完整性检查失败：${String(backupIntegrity)}`);

  const sha256 = createHash("sha256").update(readFileSync(destination)).digest("hex");
  const sizeBytes = statSync(destination).size;
  const manifest = { ok: true, reason, createdAt, source: databasePath, filename, sizeBytes, sha256, integrityCheck: "ok" };
  writeJsonAtomic(`${destination}.json`, manifest);
  writeJsonAtomic(statusPath, { ...manifest, backupPath: destination });

  const backups = readdirSync(backupDir)
    .filter((name) => /^game-workflow-\d{4}-\d{2}-\d{2}T.*Z\.db$/.test(name))
    .sort()
    .reverse();
  for (const oldName of backups.slice(retention)) {
    rmSync(path.join(backupDir, oldName), { force: true });
    rmSync(path.join(backupDir, `${oldName}.json`), { force: true });
  }
  console.log(`备份完成：${destination}（SHA-256 ${sha256.slice(0, 12)}…，完整性正常）`);
} catch (error) {
  if (source) source.close();
  const message = error instanceof Error ? error.message : "未知备份错误";
  writeJsonAtomic(statusPath, { ok: false, reason, attemptedAt: new Date().toISOString(), error: message });
  console.error(`备份失败：${message}`);
  process.exitCode = 1;
}
