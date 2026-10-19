import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { projects, prototypeVersions } from "@/db/schema";
import { prototypeRequiredQuestions } from "@/lib/design/readiness";
import type { GameSpec } from "@/lib/design/types";
import { allQuestions } from "@/lib/protocol/stages";
import { AIConfigurationError, createStructuredResponse, gameSpecSchema } from "@/lib/server/model-provider";
import { loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string };
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const snapshot = await loadAnswerSnapshot(project.id);
    const missing = prototypeRequiredQuestions.filter((id) => !snapshot[id] || snapshot[id].status !== "confirmed");
    if (missing.length) return Response.json({ error: "原型生成条件尚未满足。", missing }, { status: 409 });

    const designBrief = allQuestions.filter((question) => snapshot[question.id]).map((question) => `${question.id} ${question.short} [${snapshot[question.id].status}]：${snapshot[question.id].answer}`).join("\n");
    const spec = await createStructuredResponse<GameSpec>({
      name: "safe_browser_game_spec",
      projectId: project.id,
      schema: gameSpecSchema,
      role: "build",
      instructions: [
        "你是游戏系统设计师。把用户的设计状态编译成一个安全的浏览器机制原型规格。",
        "只输出规格，不输出 HTML、JavaScript 或任何可执行代码。",
        "原型必须能用点击和有限状态机表达，用来验证目标体验，而不是追求美术完成度。",
        "itemLabels 返回 3–6 个很短的中文标签。颜色必须是六位十六进制。",
      ].join("\n"),
      input: designBrief,
    });

    const db = getDb();
    const version = project.prototypeVersion + 1;
    const now = new Date().toISOString();
    await db.insert(prototypeVersions).values({
      id: crypto.randomUUID(),
      projectId: project.id,
      version,
      status: "ready",
      gameSpecJson: JSON.stringify(spec),
      designSnapshotJson: JSON.stringify(snapshot),
      createdAt: now,
    });
    await db.update(projects).set({ prototypeVersion: version, updatedAt: now }).where(eq(projects.id, project.id));
    return Response.json({ version, spec, createdAt: now }, { status: 201 });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "原型生成失败。", configurationRequired: status === 503 }, { status });
  }
}
