import { getAppUser } from "@/app/app-auth";
import { buildResearchExport } from "@/lib/server/research-export";
import { requireAnyOwnedProject } from "@/lib/server/workspace";

export async function GET(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireAnyOwnedProject(projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const payload = await buildResearchExport(project.id);
    if (!payload) return Response.json({ error: "项目不存在。" }, { status: 404 });
    const filename = `research-export-${project.id.slice(0, 8)}-${payload.exportedAt.slice(0, 10)}.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "导出失败。" }, { status: 500 });
  }
}
