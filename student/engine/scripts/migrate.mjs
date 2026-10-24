import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const databasePath = path.resolve(process.env.DATABASE_PATH?.trim() || "./data/game-workflow.db");
mkdirSync(path.dirname(databasePath), { recursive: true });
const client = new Database(databasePath);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");
migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
client.close();
console.log(`Migrations applied to ${databasePath}`);
