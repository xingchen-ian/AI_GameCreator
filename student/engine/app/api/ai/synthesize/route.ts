import { asc, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { aiSuggestions, messages } from "@/db/schema";
import { allQuestions, stages } from "@/lib/protocol/stages";
import { describeParkingTargets, getQuestionScope } from "@/lib/protocol/question-scope";
import { validateParkedInsights, type ParkedInsight } from "@/lib/design/parked-insights";
import { AIConfigurationError, coachResponseSchema, createStructuredResponseWithMeta } from "@/lib/server/model-provider";
import { loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

type Synthesis = {
  reply: string;
  suggestedAnswer: string;
  keyInsights: string[];
  recommendedAction: "continue_discussion" | "confirm_answer" | "review_upstream";
  scopeStatus: "in_scope" | "adjacent" | "out_of_scope";
  parkedInsights: ParkedInsight[];
};

export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string };
    const question = allQuestions.find((item) => item.id === body.questionId);
    if (!body.projectId || !question) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const db = getDb();
    const [snapshot, history] = await Promise.all([
      loadAnswerSnapshot(project.id),
      db.select().from(messages).where(eq(messages.projectId, project.id)).orderBy(asc(messages.createdAt)),
    ]);
    const stage = stages.find((item) => item.id === question.stageId)!;
    const scope = getQuestionScope(question.id);
    const parkingTargets = describeParkingTargets(question.id);
    const conversation = history.filter((item) => item.questionId === question.id).slice(-20).map((item) => `${item.role === "user" ? "用户" : "教练"}：${item.content}`).join("\n");
    if (!conversation) return Response.json({ error: "请先与 AI 讨论，再提炼正式答案。" }, { status: 409 });
    const context = Object.entries(snapshot).map(([id, value]) => `${id} [${value.status}]：${value.answer}`).join("\n") || "尚无已确认答案";
    const { result, meta } = await createStructuredResponseWithMeta<Synthesis>({
      name: "game_design_answer_synthesis",
      promptVersion: "answer-synthesis-v4",
      schemaVersion: "coach-response-v2",
      projectId: project.id,
      schema: coachResponseSchema,
      instructions: [
        "你是游戏设计编辑。根据对话整理一份忠于用户意图、具体、可执行的正式答案。",
        "suggestedAnswer 只能回答当前问题，不能引入用户没有同意的新机制，也不能混入属于其他问题的决定。",
        "只有用户亲自说出的越界内容才能放入 parkedInsights。content 必须逐字复制用户消息中的连续原文，并指向最合适的 suggestedQuestionId；禁止写入你自己的追问、推断、建议或补充。没有符合条件的用户原文则返回空数组。",
        "reply 简短说明整理原则；不要要求用户现在继续回答其他问题。用中文。",
      ].join("\n"),
      input: `阶段：${stage.name}\n问题：${question.prompt}\n本题必须完成：${scope.focus}\n本题不要决定：${scope.defer}\n可以暂存到：${parkingTargets.length ? parkingTargets.join("；") : "没有后续题"}\n\n全局状态（仅作为一致性背景）：\n${context}\n\n本题对话：\n${conversation}`,
    });
    const suggestionId = crypto.randomUUID();
    const parkedInsights = validateParkedInsights(
      result.parkedInsights,
      history.filter((item) => item.questionId === question.id && item.role === "user").map((item) => item.content),
      question.id,
    );
    const structuredData = { keyInsights: result.keyInsights, recommendedAction: result.recommendedAction, scopeStatus: result.scopeStatus, parkedInsights };
    await db.insert(aiSuggestions).values({ id: suggestionId, projectId: project.id, questionId: question.id, source: "synthesize", suggestedAnswer: result.suggestedAnswer, structuredJson: JSON.stringify(structuredData), model: meta.model, createdAt: new Date().toISOString() });
    return Response.json({ id: suggestionId, answer: result.suggestedAnswer, structuredData });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "无法提炼答案。", configurationRequired: status === 503 }, { status });
  }
}
