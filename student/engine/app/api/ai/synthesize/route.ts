import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { aiSuggestions } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { validateParkedInsights, type ParkedInsight } from "@/lib/design/parked-insights";
import { AIConfigurationError, answerSynthesisSchema, createStructuredResponseWithMeta } from "@/lib/server/model-provider";
import { loadConversationContext } from "@/lib/server/conversation-memory";
import { estimateTokens } from "@/lib/server/model-context";
import { buildQuestionContractText } from "@/lib/server/question-contract";
import { requireOwnedProject } from "@/lib/server/workspace";

type Synthesis = {
  suggestedAnswer: string;
  parkedInsights: ParkedInsight[];
};

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string };
    const question = allQuestions.find((item) => item.id === body.questionId);
    if (!body.projectId || !question) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    const db = getDb();
    const conversation = await loadConversationContext(project.id, question.id, {
        maxMessages: 20,
        tokenBudget: 6_000,
        userLabel: "用户",
        assistantLabel: "教练",
    });
    const contractText = buildQuestionContractText(question);
    if (!conversation.text) return Response.json({ error: "请先与 AI 讨论，再提炼正式答案。" }, { status: 409 });
    const { result, meta } = await createStructuredResponseWithMeta<Synthesis>({
      name: "game_design_answer_synthesis",
      promptVersion: "answer-synthesis-v9",
      schemaVersion: "answer-synthesis-v2",
      projectId: project.id,
      purpose: "candidate",
      contextStats: {
        strategy: "current-question-synthesis-v1",
        includedAnswerCount: 0,
        includedMessageCount: conversation.messages.length,
        estimatedTokens: estimateTokens(contractText) + conversation.estimatedTokens,
        truncated: conversation.truncated,
      },
      schema: answerSynthesisSchema,
      instructions: [
        "你是游戏设计编辑。根据对话整理一份忠于用户意图、具体、可执行的正式答案。",
        "suggestedAnswer 只能回答当前问题，不能引入用户没有同意的新机制，也不能混入属于其他问题的决定。",
        "只有用户亲自说出的越界内容才能放入 parkedInsights。content 必须逐字复制用户消息中的连续原文，并指向最合适的 suggestedQuestionId；禁止写入你自己的追问、推断、建议或补充。没有符合条件的用户原文则返回空数组。",
        "只返回 suggestedAnswer 和 parkedInsights。不要生成聊天回复、流程状态或范围判断。",
      ].join("\n"),
      input: `${contractText}\n\n本题对话：\n${conversation.text}`,
    });
    const suggestionId = crypto.randomUUID();
    const suggestedAnswer = result.suggestedAnswer.trim();
    const parkedInsights = validateParkedInsights(
      result.parkedInsights,
      conversation.messages.filter((item) => item.role === "user").map((item) => item.content),
      question.id,
    );
    const structuredData = {
      recommendedAction: suggestedAnswer ? "confirm_answer" : "continue_discussion",
      scopeStatus: "in_scope",
      parkedInsights,
    };
    await db.insert(aiSuggestions).values({ id: suggestionId, projectId: project.id, questionId: question.id, source: "synthesize", suggestedAnswer, structuredJson: JSON.stringify(structuredData), model: meta.model, createdAt: new Date().toISOString() });
    return Response.json({ id: suggestionId, answer: suggestedAnswer, structuredData });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "无法提炼答案。", configurationRequired: status === 503 }, { status });
  }
}
