import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb().run(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json(
      { status: "error", error: error instanceof Error ? error.message : "database unavailable" },
      { status: 503 },
    );
  }
}
