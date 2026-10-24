import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");

if (!existsSync(path.join(standaloneRoot, "server.js"))) {
  throw new Error("Standalone build is missing. Run npm run build first.");
}

// Defense in depth: file tracing must never turn local secrets, research data,
// repository history, or tests into deployable standalone assets.
for (const name of readdirSync(standaloneRoot)) {
  if (name === ".env" || name.startsWith(".env.")) rmSync(path.join(standaloneRoot, name), { force: true });
}
for (const relativePath of [".git", ".agents", ".codex", ".sites-runtime", ".wrangler", "data", "docs", "examples", "tests"]) {
  rmSync(path.join(standaloneRoot, relativePath), { recursive: true, force: true });
}

for (const [source, destination] of [
  [path.join(projectRoot, ".next", "static"), path.join(standaloneRoot, ".next", "static")],
  [path.join(projectRoot, "public"), path.join(standaloneRoot, "public")],
  [path.join(projectRoot, "drizzle"), path.join(standaloneRoot, "drizzle")],
]) {
  if (existsSync(source)) cpSync(source, destination, { recursive: true, force: true });
}

console.log("Standalone runtime assets prepared.");
