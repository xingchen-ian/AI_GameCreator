import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

process.env.DATABASE_PATH = path.resolve(
  projectRoot,
  process.env.DATABASE_PATH?.trim() || "./data/game-workflow.db",
);

const serverPath = path.join(projectRoot, ".next", "standalone", "server.js");
if (!existsSync(serverPath)) {
  throw new Error("Standalone build is missing. Run npm run build first.");
}

await import(pathToFileURL(serverPath).href);
