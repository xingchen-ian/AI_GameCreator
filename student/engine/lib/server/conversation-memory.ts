import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { conversationSummaries, messages } from "@/db/schema";
import { createStructuredResponseWithMeta, workingConversationSummarySchema } from "@/lib/server/model-provider";
import { estimateTokens, loadRecentConversation } from "@/lib/server/model-context";

type WorkingConversationSummary = {
  summary: string;
  userIdeas: string[];
  aiSuggestions: string[];
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  unresolved: string[];
  currentFocus: string;
};

const RAW_MESSAGE_LIMIT = 12;
const RAW_TOKEN_BUDGET = 4_000;
const KEEP_RECENT_MESSAGES = 8;
const SUMMARY_BATCH_SIZE = 4;

function summaryText(summary: WorkingConversationSummary) {
  return [
    summary.summary,
    summary.userIdeas.length ? `用户想法：${summary.userIdeas.join("；")}` : "",
    summary.aiSuggestions.length ? `AI 提过：${summary.aiSuggestions.join("；")}` : "",
    summary.acceptedSuggestions.length ? `用户已采用：${summary.acceptedSuggestions.join("；")}` : "",
    summary.rejectedSuggestions.length ? `用户已拒绝：${summary.rejectedSuggestions.join("；")}` : "",
    summary.unresolved.length ? `仍未决定：${summary.unresolved.join("；")}` : "",
    summary.currentFocus ? `当前讨论位置：${summary.currentFocus}` : "",
  ].filter(Boolean).join("\n");
}

function parseSummary(row: { summary: string; structuredJson: string }): WorkingConversationSummary {
  try {
    const parsed = JSON.parse(row.structuredJson) as Partial<WorkingConversationSummary>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : row.summary,
      userIdeas: Array.isArray(parsed.userIdeas) ? parsed.userIdeas.filter((item): item is string => typeof item === "string") : [],
      aiSuggestions: Array.isArray(parsed.aiSuggestions) ? parsed.aiSuggestions.filter((item): item is string => typeof item === "string") : [],
      acceptedSuggestions: Array.isArray(parsed.acceptedSuggestions) ? parsed.acceptedSuggestions.filter((item): item is string => typeof item === "string") : [],
      rejectedSuggestions: Array.isArray(parsed.rejectedSuggestions) ? parsed.rejectedSuggestions.filter((item): item is string => typeof item === "string") : [],
      unresolved: Array.isArray(parsed.unresolved) ? parsed.unresolved.filter((item): item is string => typeof item === "string") : [],
      currentFocus: typeof parsed.currentFocus === "string" ? parsed.currentFocus : "",
    };
  } catch {
    return { summary: row.summary, userIdeas: [], aiSuggestions: [], acceptedSuggestions: [], rejectedSuggestions: [], unresolved: [], currentFocus: "" };
  }
}

export async function refreshWorkingConversationSummary(projectId: string, questionId: string) {
  const db = getDb();
  const [latestSummary] = await db.select().from(conversationSummaries).where(and(
    eq(conversationSummaries.projectId, projectId),
    eq(conversationSummaries.questionId, questionId),
  )).orderBy(desc(conversationSummaries.throughCreatedAt), desc(conversationSummaries.createdAt)).limit(1);

  const rows = latestSummary
    ? await db.select().from(messages).where(and(
      eq(messages.projectId, projectId),
      eq(messages.questionId, questionId),
      gt(messages.createdAt, latestSummary.throughCreatedAt),
    )).orderBy(asc(messages.createdAt), asc(messages.id))
    : await db.select().from(messages).where(and(
      eq(messages.projectId, projectId),
      eq(messages.questionId, questionId),
    )).orderBy(asc(messages.createdAt), asc(messages.id));

  const totalUnsummarizedTokens = rows.reduce((total, message) => total + estimateTokens(`${message.role}：${message.content}\n`), 0);
  const shouldCompact = rows.length > RAW_MESSAGE_LIMIT || totalUnsummarizedTokens > RAW_TOKEN_BUDGET;
  if (!shouldCompact) return latestSummary ?? null;

  const prefix = rows.slice(0, Math.max(0, rows.length - KEEP_RECENT_MESSAGES));
  if (!prefix.length || latestSummary && prefix.length < SUMMARY_BATCH_SIZE) return latestSummary ?? null;
  const throughMessage = prefix[prefix.length - 1];
  const previous = latestSummary ? parseSummary(latestSummary) : null;
  const transcript = prefix.map((message) => `${message.role === "user" ? "用户" : "AI 教练"}：${message.content}`).join("\n");
  const { result, meta } = await createStructuredResponseWithMeta<WorkingConversationSummary>({
    name: "game_design_working_conversation_summary",
    promptVersion: "working-conversation-summary-v1",
    schemaVersion: "working-conversation-summary-v1",
    projectId,
    purpose: "conversation_summary",
    repairInvalidOutput: true,
    schema: workingConversationSummarySchema,
    contextStats: {
      strategy: latestSummary ? "incremental-working-summary-v1" : "initial-working-summary-v1",
      includedAnswerCount: 0,
      includedMessageCount: prefix.length,
      estimatedTokens: estimateTokens(transcript) + (previous ? estimateTokens(summaryText(previous)) : 0),
      truncated: false,
    },
    instructions: [
      "你负责压缩一道游戏设计题目的较早对话，供后续回合继续使用。",
      "区分用户自己的想法、AI 提出的建议、用户明确采用、用户明确拒绝和尚未表态的建议。",
      "如果本题第一条 Pre-answer 消息明确引用了此前题目已经确认的信息，摘要中要继续标明它是继承的确认信息及其来源题号；不要把它和 AI 在本题新提出的可选建议混在一起。",
      "没有明确证据时不能把沉默当作接受，也不能把 AI 建议改写成用户决定。",
      "保留关键理由、约束、仍待回答的问题和当前讨论进度；删除寒暄、重复措辞和已经失效的追问。",
      "这是工作摘要，不是正式 Design State。",
    ].join("\n"),
    input: `${previous ? `上一版工作摘要：\n${summaryText(previous)}\n\n` : ""}本次新增的较早对话：\n${transcript}`,
  });

  const id = crypto.randomUUID();
  await db.insert(conversationSummaries).values({
    id,
    projectId,
    questionId,
    throughMessageId: throughMessage.id,
    throughCreatedAt: throughMessage.createdAt,
    messageCount: (latestSummary?.messageCount ?? 0) + prefix.length,
    summary: result.summary,
    structuredJson: JSON.stringify(result),
    model: meta.model,
    createdAt: new Date().toISOString(),
  }).onConflictDoNothing();
  return { id, projectId, questionId, throughMessageId: throughMessage.id, throughCreatedAt: throughMessage.createdAt, messageCount: (latestSummary?.messageCount ?? 0) + prefix.length, summary: result.summary, structuredJson: JSON.stringify(result), model: meta.model, createdAt: new Date().toISOString() };
}

export async function loadConversationContext(
  projectId: string,
  questionId: string,
  options: { maxMessages: number; tokenBudget: number; userLabel: string; assistantLabel: string },
) {
  const [recent, latestRows] = await Promise.all([
    loadRecentConversation(projectId, questionId, options),
    getDb().select().from(conversationSummaries).where(and(
      eq(conversationSummaries.projectId, projectId),
      eq(conversationSummaries.questionId, questionId),
    )).orderBy(desc(conversationSummaries.throughCreatedAt), desc(conversationSummaries.createdAt)).limit(1),
  ]);
  const latest = latestRows[0];
  if (!latest) return { ...recent, summaryText: "", recentText: recent.text };
  const compacted = summaryText(parseSummary(latest));
  const recentMessages = recent.messages.filter((message) => message.createdAt > latest.throughCreatedAt);
  const recentText = recentMessages.map((message) => `${message.role === "user" ? options.userLabel : options.assistantLabel}：${message.content}`).join("\n");
  return {
    ...recent,
    messages: recentMessages,
    text: `较早对话工作摘要：\n${compacted}\n\n最近对话原文：\n${recentText || "（暂无新消息）"}`,
    summaryText: compacted,
    recentText,
    estimatedTokens: estimateTokens(compacted) + estimateTokens(recentText),
    truncated: true,
  };
}
