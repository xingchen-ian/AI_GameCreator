import { getAppUser } from "@/app/app-auth";
import { allQuestions } from "@/lib/protocol/stages";
import { AIConfigurationError } from "@/lib/server/model-provider";
import { ensureQuestionMemory } from "@/lib/server/question-memory";
import { requireOwnedProject } from "@/lib/server/workspace";

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string };
    const question = allQuestions.find((item) => item.id === body.questionId);
    if (!body.projectId || !question) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const result = await ensureQuestionMemory(project.id, question);
    if (result.status === "not_confirmed") return Response.json({ error: "请先正式确认当前答案。" }, { status: 409 });
    return Response.json({ created: result.status === "created", memoryId: result.memoryId });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "无法生成 Question Memory。", configurationRequired: status === 503 }, { status });
  }
}
