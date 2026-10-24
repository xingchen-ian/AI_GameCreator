import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type BackupStatus = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  createdAt?: string;
  attemptedAt?: string;
  filename?: string;
  sizeBytes?: number;
  sha256?: string;
  integrityCheck?: string;
  error?: string;
  message?: string;
};

export function getBackupStatus(): BackupStatus | null {
  try {
    const backupDir = path.resolve(process.cwd(), process.env.BACKUP_DIR?.trim() || "./data/backups");
    const statusPath = path.join(backupDir, "backup-status.json");
    if (!existsSync(statusPath)) return null;
    return JSON.parse(readFileSync(statusPath, "utf8")) as BackupStatus;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "无法读取备份状态。" };
  }
}
