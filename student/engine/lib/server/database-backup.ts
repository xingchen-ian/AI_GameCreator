import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { BackupStatus } from "@/lib/server/backup-status";

function writeJsonAtomic(target: string, value: unknown) {
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(value, null, 2));
  renameSync(temporary, target);
}

export async function createVerifiedBackup(reason: string): Promise<BackupStatus> {
  const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH?.trim() || "./data/game-workflow.db");
  const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR?.trim() || "./data/backups");
  const retentionValue = Number.parseInt(process.env.BACKUP_RETENTION?.trim() || "20", 10);
  const retention = Number.isFinite(retentionValue) && retentionValue >= 1 ? Math.min(retentionValue, 500) : 20;
  const statusPath = path.join(backupDir, "backup-status.json");
  mkdirSync(backupDir, { recursive: true });
  if (!existsSync(databasePath)) {
    const status = { ok: true, skipped: true, reason, attemptedAt: new Date().toISOString(), message: "数据库尚未创建，无需备份。" };
    writeJsonAtomic(statusPath, status);
    return status;
  }

  let source: Database.Database | undefined;
  try {
    source = new Database(databasePath, { readonly: true, fileMustExist: true });
    const sourceIntegrity = source.pragma("integrity_check", { simple: true });
    if (sourceIntegrity !== "ok") throw new Error(`源数据库完整性检查失败：${String(sourceIntegrity)}`);
    const createdAt = new Date().toISOString();
    const filename = `game-workflow-${createdAt.replace(/[:.]/g, "-")}.db`;
    const destination = path.join(backupDir, filename);
    await source.backup(destination);
    source.close();
    source = undefined;

    const copy = new Database(destination, { readonly: true, fileMustExist: true });
    const backupIntegrity = copy.pragma("integrity_check", { simple: true });
    copy.close();
    if (backupIntegrity !== "ok") throw new Error(`备份完整性检查失败：${String(backupIntegrity)}`);
    const sha256 = createHash("sha256").update(readFileSync(destination)).digest("hex");
    const status = { ok: true, reason, createdAt, filename, sizeBytes: statSync(destination).size, sha256, integrityCheck: "ok" };
    writeJsonAtomic(`${destination}.json`, status);
    writeJsonAtomic(statusPath, status);
    const backups = readdirSync(backupDir).filter((name) => /^game-workflow-\d{4}-\d{2}-\d{2}T.*Z\.db$/.test(name)).sort().reverse();
    for (const oldName of backups.slice(retention)) {
      rmSync(path.join(backupDir, oldName), { force: true });
      rmSync(path.join(backupDir, `${oldName}.json`), { force: true });
    }
    return status;
  } catch (error) {
    source?.close();
    const message = error instanceof Error ? error.message : "未知备份错误";
    writeJsonAtomic(statusPath, { ok: false, reason, attemptedAt: new Date().toISOString(), error: message });
    throw error;
  }
}
