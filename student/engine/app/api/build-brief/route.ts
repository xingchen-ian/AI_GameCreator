import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { buildBriefs, gddVersions, projects } from "@/db/schema";
import { makeBuildBrief } from "@/lib/design/gdd";
import type { GddSection, GddVersion } from "@/lib/design/types";
import { getWorkspace, requireOwnedProject } from "@/lib/server/workspace";

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string };
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const db = getDb();
    const [row] = await db.select().from(gddVersions).where(eq(gddVersions.projectId, project.id)).orderBy(desc(gddVersions.version)).limit(1);
    if (!row || row.status !== "confirmed") return Response.json({ error: "请先确认当前 GDD。" }, { status: 409 });
    if (row.fidelityStatus !== "ready") return Response.json({ error: "GDD 文档忠实度尚未通过检查。" }, { status: 409 });
    const gdd: GddVersion = {
      id: row.id,
      version: row.version,
      status: row.status,
      title: row.title,
      oneLinePitch: row.oneLinePitch,
      sections: JSON.parse(row.sectionsJson) as GddSection[],
      fidelityStatus: row.fidelityStatus,
      issues: [],
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const version = project.buildBriefVersion + 1;
    const now = new Date().toISOString();
    await db.update(buildBriefs).set({ status: "stale" }).where(and(eq(buildBriefs.projectId, project.id), eq(buildBriefs.version, project.buildBriefVersion)));
    await db.insert(buildBriefs).values({
      id: crypto.randomUUID(),
      projectId: project.id,
      gddVersionId: row.id,
      version,
      status: "ready",
      markdown: makeBuildBrief(gdd),
      createdAt: now,
    });
    await db.update(projects).set({ buildBriefVersion: version, updatedAt: now }).where(eq(projects.id, project.id));
    return Response.json(await getWorkspace(user), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Build Brief 生成失败。" }, { status: 500 });
  }
}
