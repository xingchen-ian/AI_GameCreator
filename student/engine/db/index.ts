import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (database) return database;

  const databasePath = path.resolve(process.env.DATABASE_PATH?.trim() || "./data/game-workflow.db");
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const client = new Database(databasePath);
  client.pragma("journal_mode = WAL");
  client.pragma("foreign_keys = ON");
  database = drizzle(client, { schema });
  migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return database;
}
