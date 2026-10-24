import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { aiSuggestions, messages, questionAnswers, questionMemories } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { loadConversationContext } from "@/lib/server/conversation-memory";
import { estimateTokens } from "@/lib/server/model-context";
import { createStructuredResponseWithMeta, questionMemorySchema } from "@/lib/server/model-provider";

type QuestionMemoryResult = { memoryText: string };
type MemoryQuestion = (typeof allQuestions)[number];

export type EnsureMemoryResult =
  | { status: "not_confirmed" }
  | { status: "exists" | "created"; memoryId: string };

function transcript(rows: { role: "user" | "assistant"; content: string }[]) {
  return rows.map((message) => `${message.role === "user" ? "用户" : "AI 教练"}：${message.content}`).join("\n");
}

function suggestionText(rows: { id: string; suggestedAnswer: string }[]) {
  return rows.map((row) => `AI suggestion ${row.id}：${row.suggestedAnswer || "（本轮未生成候选答案）"}`).join("\n");
}

// A memory is immutable per answer revision. Revision 1 summarizes the available
// working context; later revisions reconcile the previous complete memory with
// only the conversation delta and the newly confirmed answer.
export async function ensureQuestionMemory(projectId: string, question: MemoryQuestion): Promise<EnsureMemoryResult> {
  const db = getDb();
  const [answer] = await db.select().from(questionAnswers).where(and(
    eq(questionAnswers.projectId, projectId),
    eq(questionAnswers.questionId, question.id),
  )).limit(1);
  if (!answer || answer.status !== "confirmed") return { status: "not_confirmed" };

  const [existing] = await db.select().from(questionMemories).where(and(
    eq(questionMemories.projectId, projectId),
    eq(questionMemories.questionId, question.id),
    eq(questionMemories.answerRevision, answer.revision),
  )).limit(1);
  if (existing?.summary.startsWith("Question Memory v3\n")) return { status: "exists", memoryId: existing.id };

  const [previous] = await db.select().from(questionMemories).where(and(
    eq(questionMemories.projectId, projectId),
    eq(questionMemories.questionId, question.id),
    lt(questionMemories.answerRevision, answer.revision),
  )).orderBy(desc(questionMemories.answerRevision), desc(questionMemories.createdAt)).limit(1);

  let contextText = "";
  let contextTokens = 0;
  let includedMessageCount = 0;
  let throughMessageId: string | null = previous?.throughMessageId ?? null;
  let throughCreatedAt: string | null = previous?.throughCreatedAt ?? null;

  if (previous) {
    const cutoff = previous.throughCreatedAt ?? previous.createdAt;
    const [deltaMessages, deltaSuggestions] = await Promise.all([
      db.select().from(messages).where(and(
        eq(messages.projectId, projectId),
        eq(messages.questionId, question.id),
        gt(messages.createdAt, cutoff),
      )).orderBy(asc(messages.createdAt), asc(messages.id)),
      db.select().from(aiSuggestions).where(and(
        eq(aiSuggestions.projectId, projectId),
        eq(aiSuggestions.questionId, question.id),
        gt(aiSuggestions.createdAt, cutoff),
      )).orderBy(asc(aiSuggestions.createdAt), asc(aiSuggestions.id)),
    ]);
    const deltaTranscript = transcript(deltaMessages);
    const deltaSuggestionText = suggestionText(deltaSuggestions);
    const lastMessage = deltaMessages.at(-1);
    if (lastMessage) {
      throughMessageId = lastMessage.id;
      throughCreatedAt = lastMessage.createdAt;
    }
    includedMessageCount = deltaMessages.length;
    contextText = [
      `上一版完整 Question Memory（answer revision ${previous.answerRevision}）：\n${previous.summary}`,
      `上一版之后新增的对话：\n${deltaTranscript || "无"}`,
      `上一版之后新增的 AI suggestions：\n${deltaSuggestionText || "无"}`,
    ].join("\n\n");
    contextTokens = estimateTokens(contextText);
  } else {
    const [conversation, suggestionRows, latestMessages] = await Promise.all([
      loadConversationContext(projectId, question.id, { maxMessages: 100, tokenBudget: 12_000, userLabel: "用户", assistantLabel: "AI 教练" }),
      db.select().from(aiSuggestions).where(and(eq(aiSuggestions.projectId, projectId), eq(aiSuggestions.questionId, question.id))).orderBy(desc(aiSuggestions.createdAt)).limit(30),
      db.select().from(messages).where(and(eq(messages.projectId, projectId), eq(messages.questionId, question.id))).orderBy(desc(messages.createdAt), desc(messages.id)).limit(1),
    ]);
    const suggestions = suggestionText(suggestionRows);
    const latestMessage = latestMessages[0];
    throughMessageId = latestMessage?.id ?? null;
    throughCreatedAt = latestMessage?.createdAt ?? null;
    includedMessageCount = conversation.messages.length;
    contextText = `完整工作上下文：\n${conversation.text}\n\n本题产生过的 AI suggestions：\n${suggestions || "无"}`;
    contextTokens = conversation.estimatedTokens + estimateTokens(suggestions);
  }

  const { result, meta } = await createStructuredResponseWithMeta<QuestionMemoryResult>({
    name: "game_design_question_memory",
    promptVersion: "question-memory-v3",
    schemaVersion: "question-memory-v2",
    projectId,
    purpose: "question_memory",
    repairInvalidOutput: true,
    schema: questionMemorySchema,
    contextStats: {
      strategy: previous ? "incremental-question-memory-v1" : "initial-question-memory-v2",
      includedAnswerCount: 1,
      includedMessageCount,
      estimatedTokens: contextTokens + estimateTokens(answer.answer),
      truncated: false,
    },
    instructions: [
      "你把一道已经正式确认的游戏设计题目整理成一份整体 Question Memory，供后续题目理解此前讨论。输出必须是一份新的完整替代记忆，不是增量附录。",
      previous
        ? "基于上一版完整 Memory、本次新增对话和新确认答案进行重写。保留未变化的信息；更新被修订的决定；说明旧决定为何以及如何被替代。不要重新推断未提供的早期历史。"
        : "这是第一版 Memory。总结当前提供的完整工作上下文和最终确认答案。",
      "输出简洁但信息完整的中文文字总结，不要输出最终答案原文；系统会在末尾原样追加新确认答案。",
      "总结覆盖：讨论焦点；用户提出的重要想法；AI 提出的关键建议及其结果；明确采用、修改后采用、明确拒绝、尚未决定或被替代的内容；重要理由、约束和未解决问题。",
      "清楚标明内容来源和状态。用户沉默不能视为接受，AI 建议不能因为出现在对话中就写成用户决定。",
      "如果用户在讨论中明确采用了某项内容但最终答案没有体现，要标明“讨论中采用但未进入最终答案”。删除寒暄、重复表达和已经失效的追问。",
    ].join("\n"),
    input: `当前题：${question.id} ${question.prompt}\n新答案 revision：${answer.revision}\n新最终确认答案：\n${answer.answer}\n\n${contextText}`,
  });

  const memoryText = `Question Memory v3\n${result.memoryText.trim()}\n\n最终确认答案（原文）：\n${answer.answer}`;
  const memoryId = existing?.id ?? crypto.randomUUID();
  const values = {
    projectId,
    questionId: question.id,
    answerRevision: answer.revision,
    baseMemoryId: previous?.id ?? null,
    throughMessageId,
    throughCreatedAt,
    summary: memoryText,
    confirmedDecisionsJson: "[]",
    editedAdoptionsJson: "[]",
    explicitRejectionsJson: "[]",
    constraintsJson: "[]",
    openQuestionsJson: "[]",
    unresolvedSuggestionsJson: "[]",
    relatedQuestionIdsJson: "[]",
    model: meta.model,
    createdAt: new Date().toISOString(),
  };
  if (existing) await db.update(questionMemories).set(values).where(eq(questionMemories.id, existing.id));
  else await db.insert(questionMemories).values({ id: memoryId, ...values }).onConflictDoNothing();
  return { status: "created", memoryId };
}
