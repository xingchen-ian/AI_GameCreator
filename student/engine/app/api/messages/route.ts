import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { requireOwnedProject } from "@/lib/server/workspace";

const MAX_MESSAGES = 100;

export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const searchParams = new URL(request.url).searchParams;
    const projectId = searchParams.get("projectId")?.trim() ?? "";
    const questionId = searchParams.get("questionId")?.trim() ?? "";
    if (!projectId || !questionId || questionId.length > 100) return Response.json({ error: "请求参数无效。" }, { status: 400 });
    const project = await requireOwnedProject(projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const rows = await getDb().select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    }).from(messages).where(and(
      eq(messages.projectId, project.id),
      eq(messages.questionId, questionId),
    )).orderBy(desc(messages.createdAt), desc(messages.id)).limit(MAX_MESSAGES + 1);

    return Response.json({
      messages: rows.slice(0, MAX_MESSAGES).reverse().map((row) => ({
        id: row.id,
        role: row.role,
        text: row.content,
        createdAt: row.createdAt,
      })),
      hasMore: rows.length > MAX_MESSAGES,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取对话。" }, { status: 500 });
  }
}
