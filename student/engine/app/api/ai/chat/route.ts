import { after } from "next/server";
import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { runSqliteBatch } from "@/db/batch";
import { aiSuggestions, messages } from "@/db/schema";
import { validateCrossQuestionIssues, type CrossQuestionIssue } from "@/lib/design/cross-question-issues";
import { allQuestions } from "@/lib/protocol/stages";
import { enqueueBackgroundJob, processBackgroundJobs } from "@/lib/server/background-jobs";
import { loadConversationContext } from "@/lib/server/conversation-memory";
import { buildConfirmedAnswerContext, estimateTokens, loadQuestionMemoryContext } from "@/lib/server/model-context";
import { AIConfigurationError, coachTurnSchema, createStructuredResponseWithMeta, normalizeCoachTurnResult } from "@/lib/server/model-provider";
import { buildQuestionContractText, buildQuestionDirectoryText } from "@/lib/server/question-contract";
import { loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

type CoachTurn = {
  ready: boolean;
  decisionReason: string;
  reply: string;
  suggestedAnswer: string;
  crossQuestionIssues: CrossQuestionIssue[];
};

function joinDesignEvidence(memoryText: string, memoryCount: number, fallbackText: string, fallbackCount: number) {
  return [
    memoryCount ? `此前题目的最新 Question Memory：\n${memoryText}` : "",
    fallbackCount ? `尚未生成 Question Memory 的确认答案回退：\n${fallbackText}` : "",
  ].filter(Boolean).join("\n\n") || "尚无其他题目的已确认设计信息";
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string; content?: string };
    const content = body.content?.trim() ?? "";
    const question = allQuestions.find((item) => item.id === body.questionId);
    if (!body.projectId || !question || !content || content.length > 4000) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const db = getDb();
    const now = new Date().toISOString();
    const userMessageId = crypto.randomUUID();
    await db.insert(messages).values({ id: userMessageId, projectId: project.id, questionId: question.id, role: "user", content, createdAt: now });

    const conversationOptions = { maxMessages: 12, tokenBudget: 4_000, userLabel: "用户", assistantLabel: "设计教练" };
    const [conversation, snapshot] = await Promise.all([
      loadConversationContext(project.id, question.id, conversationOptions),
      loadAnswerSnapshot(project.id),
    ]);
    const memoryContext = await loadQuestionMemoryContext(project.id, snapshot, question.id);
    const fallbackContext = buildConfirmedAnswerContext(snapshot, {
      excludeQuestionId: question.id,
      excludeQuestionIds: memoryContext.includedQuestionIds,
    });
    const evidenceText = joinDesignEvidence(memoryContext.text, memoryContext.includedQuestionIds.length, fallbackContext.text, fallbackContext.includedQuestionIds.length);
    const evidenceIds = [...new Set([...memoryContext.includedQuestionIds, ...fallbackContext.includedQuestionIds])];
    const contractText = buildQuestionContractText(question);
    const questionDirectoryText = buildQuestionDirectoryText();
    const currentConfirmedAnswer = snapshot[question.id]?.status === "confirmed"
      ? `当前题上一版已确认答案（用户可能正在修订）：\n${snapshot[question.id].answer}`
      : "当前题尚无已确认答案";

    const { result, meta } = await createStructuredResponseWithMeta<CoachTurn>({
      name: "game_design_coach_turn",
      promptVersion: "coach-turn-v1",
      schemaVersion: "coach-turn-v1",
      projectId: project.id,
      purpose: "coach_turn",
      strictSchema: false,
      repairInvalidOutput: true,
      normalizeResult: normalizeCoachTurnResult,
      contextStats: {
        strategy: "coach-turn-current-conversation-all-memories-v1",
        includedAnswerCount: evidenceIds.length,
        includedMessageCount: conversation.messages.length,
        estimatedTokens: estimateTokens(contractText) + estimateTokens(questionDirectoryText) + conversation.estimatedTokens + estimateTokens(currentConfirmedAnswer) + estimateTokens(evidenceText),
        truncated: conversation.truncated,
      },
      schema: coachTurnSchema,
      instructions: [
        "你是面向游戏设计新手的专业设计教练。一次完成本轮 Readiness 判断、用户可见回复、候选答案和跨题影响识别。只返回 Schema 要求的字段。",
        "ready 只依据当前题要求、当前题对话以及当前题上一版确认答案判断。其他题目的 Question Memory 只用于理解整体设计、避免遗忘和识别跨题影响，不得单独把本题判为 Ready。",
        "ready=true 只表示无需替用户新增关键决定即可忠实形成当前题答案，不表示答案完美。decisionReason 用一句简短中文记录判断依据。",
        "Not Ready：suggestedAnswer 必须为空；reply 自然回应用户最新意图，并提出一到两个最有帮助的问题。用户请求建议、选项或例子时，把二到三个具体方向完整写在 reply 中，不得把关键内容放进 suggestedAnswer。",
        "Ready：suggestedAnswer 给出只回答当前题的完整候选文本；reply 用一到两句话自然回应并说明候选答案已经形成，不再提出阻塞性问题。不得把其他题目的内容擅自写成当前题的新决定。",
        "普通 AI 建议不能因为出现在对话或 Memory 中就视为用户决定；明确拒绝的方向不得重新写入候选答案。帮助用户完善想法，不要替用户决定。",
        "检查用户本轮表达是否可能更新其他已确认题目，或是否与其形成无法同时成立的直接冲突。possible_update 用于可能需要同步修改；conflict 只用于明确冲突。普通补充、可并存差异和尚未确定内容不是冲突。",
        "crossQuestionIssues 只能指向当前题之外的真实题号。explanation 简洁说明关系；recommendedEditTarget 表示建议改 current、previous 或 either。无跨题影响时返回空数组。",
        "无论推荐修改哪一边，前端都会允许用户查看旧题和处理当前题。suggestedRevision 只在你能忠实形成被推荐目标的完整修改草稿时填写，否则返回空字符串；不得凭空补充设计。",
        "回复通常控制在 120–300 个中文字以内，不要展示内部字段名、评分或 JSON。",
      ].join("\n"),
      input: `${contractText}\n\n完整题目目录：\n${questionDirectoryText}\n\n${currentConfirmedAnswer}\n\n当前问题对话：\n${conversation.text}\n\n其他题目的 Design Memory（只用于整体理解与跨题检查）：\n${evidenceText}`,
    });

    const suggestedAnswer = result.ready ? result.suggestedAnswer.trim() : "";
    const ready = result.ready && Boolean(suggestedAnswer);
    const crossQuestionIssues = validateCrossQuestionIssues(result.crossQuestionIssues, question.id);
    const assistantMessageId = crypto.randomUUID();
    const assistantCreatedAt = new Date().toISOString();
    const suggestionId = crypto.randomUUID();
    const structuredData = {
      recommendedAction: ready ? "confirm_answer" : "continue_discussion",
      scopeStatus: "in_scope",
      ready,
      decisionReason: result.decisionReason.trim(),
      crossQuestionIssues,
    };
    runSqliteBatch(db, [
      db.insert(messages).values({ id: assistantMessageId, projectId: project.id, questionId: question.id, role: "assistant", content: result.reply, createdAt: assistantCreatedAt }),
      db.insert(aiSuggestions).values({ id: suggestionId, projectId: project.id, questionId: question.id, source: "chat", messageId: assistantMessageId, suggestedAnswer, structuredJson: JSON.stringify(structuredData), model: meta.model, createdAt: assistantCreatedAt }),
    ]);
    await enqueueBackgroundJob({ projectId: project.id, type: "conversation_summary", dedupeKey: `${question.id}:${assistantMessageId}`, payload: { questionId: question.id, throughMessageId: assistantMessageId } });
    after(async () => {
      await processBackgroundJobs({ projectId: project.id, limit: 2 }).catch((error) => {
        console.warn(JSON.stringify({ event: "background_job_drain_failed", projectId: project.id, reason: error instanceof Error ? error.message.slice(0, 240) : "unknown" }));
      });
    });
    return Response.json({
      userMessage: { id: userMessageId, role: "user", text: content, createdAt: now },
      assistantMessage: { id: assistantMessageId, role: "assistant", text: result.reply, createdAt: assistantCreatedAt },
      suggestion: { id: suggestionId, answer: suggestedAnswer, structuredData },
    });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "AI 暂时无法响应。", configurationRequired: status === 503 }, { status });
  }
}
