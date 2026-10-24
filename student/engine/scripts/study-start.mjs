import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const serverPath = path.join(projectRoot, ".next", "standalone", "server.js");
const runtimeDir = path.join(projectRoot, ".runtime");
const runtimePath = path.join(runtimeDir, "quick-tunnel.json");
const port = process.env.PORT?.trim() || "3000";
if (!/^\d{2,5}$/.test(port)) throw new Error("PORT 必须是有效端口号。");
const localUrl = `http://localhost:${port}`;

if (existsSync(envPath) && typeof process.loadEnvFile === "function") process.loadEnvFile(envPath);
if (!existsSync(serverPath)) throw new Error("正式版本尚未构建。请先运行 npm run build。");

mkdirSync(runtimeDir, { recursive: true });
rmSync(runtimePath, { force: true });

function runBackupSync(reason) {
  const result = spawnSync(process.execPath, ["scripts/backup.mjs", `--reason=${reason}`], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`${reason} 备份失败，研究服务未继续运行。`);
}

runBackupSync("startup");

const app = spawn(process.execPath, ["scripts/start.mjs"], {
  cwd: projectRoot,
  env: { ...process.env, STUDY_RUNTIME_PATH: runtimePath },
  stdio: "inherit",
});
const tunnel = spawn("cloudflared", ["tunnel", "--url", localUrl], {
  cwd: projectRoot,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

let shuttingDown = false;
let tunnelOutput = "";
let backupProcess = null;
const intervalValue = Number.parseInt(process.env.BACKUP_INTERVAL_MINUTES?.trim() || "15", 10);
const backupIntervalMinutes = Number.isFinite(intervalValue) && intervalValue >= 1 ? Math.min(intervalValue, 1440) : 15;
const backupTimer = setInterval(() => {
  if (shuttingDown || backupProcess) return;
  backupProcess = spawn(process.execPath, ["scripts/backup.mjs", "--reason=periodic"], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  backupProcess.on("exit", (code) => {
    if (code !== 0) console.error("定时备份失败；请查看研究管理页的备份状态。");
    backupProcess = null;
  });
}, backupIntervalMinutes * 60_000);
backupTimer.unref();

function inspectTunnelOutput(chunk) {
  const text = chunk.toString();
  process.stderr.write(text);
  if (shuttingDown) return;
  tunnelOutput = `${tunnelOutput}${text}`.slice(-12000);
  const publicUrl = [...tunnelOutput.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/gi)]
    .find((match) => match[1].toLowerCase() !== "api")?.[0];
  if (!publicUrl || existsSync(runtimePath)) return;
  writeFileSync(runtimePath, JSON.stringify({ publicUrl, startedAt: new Date().toISOString() }, null, 2));
  console.log("\n研究测试已就绪");
  console.log(`研究管理：${localUrl}/admin/research`);
  console.log(`参与者公网入口：${publicUrl}`);
  console.log("在本地管理页生成的参与者链接会自动使用这个公网地址。\n");
}

tunnel.stdout.on("data", inspectTunnelOutput);
tunnel.stderr.on("data", inspectTunnelOutput);

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(backupTimer);
  rmSync(runtimePath, { force: true });
  try {
    runBackupSync("shutdown");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "结束备份失败。");
    exitCode = 1;
  }
  if (!app.killed) app.kill("SIGTERM");
  if (!tunnel.killed) tunnel.kill("SIGTERM");
  setTimeout(() => process.exit(exitCode), 250).unref();
}

app.on("error", (error) => {
  console.error(`无法启动网站：${error.message}`);
  shutdown(1);
});
tunnel.on("error", (error) => {
  console.error(`无法启动 Cloudflare Tunnel：${error.message}`);
  console.error("请确认 cloudflared 已安装。");
  shutdown(1);
});
app.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`网站进程已停止（${signal ?? code ?? "unknown"}）。`);
    shutdown(code || 1);
  }
});
tunnel.on("exit", (code, signal) => {
  if (!shuttingDown) {
    console.error(`Tunnel 已停止（${signal ?? code ?? "unknown"}）。`);
    shutdown(code || 1);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
