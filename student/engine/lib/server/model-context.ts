import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";

type AnswerSnapshot = Record<string, {
  answer: string;
  status: "draft" | "confirmed";
  revision: number;
}>;

type ConversationOptions = {
  maxMessages: number;
  tokenBudget: number;
  userLabel: string;
  assistantLabel: string;
};

export type ModelContextStats = {
  strategy: string;
  includedAnswerCount: number;
  includedMessageCount: number;
  estimatedTokens: number;
  truncated: boolean;
};

export type ContextMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

// A conservative tokenizer-free estimate for enforcing a pre-request budget.
// CJK characters are commonly close to one token; other text is approximated at
// four characters per token. Provider-reported usage remains the source of truth.
export function estimateTokens(text: string) {
  let cjk = 0;
  let other = 0;
  for (const character of text) {
    if (/\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(character)) cjk += 1;
    else other += 1;
  }
  return cjk + Math.ceil(other / 4);
}

export async function loadRecentConversation(
  projectId: string,
  questionId: string,
  options: ConversationOptions,
) {
  const db = getDb();
  const queried = await db.select({
    id: messages.id,
    role: messages.role,
    content: messages.content,
    createdAt: messages.createdAt,
  }).from(messages).where(and(
    eq(messages.projectId, projectId),
    eq(messages.questionId, questionId),
  )).orderBy(desc(messages.createdAt), desc(messages.id)).limit(options.maxMessages + 1);

  const newestFirst = queried.slice(0, options.maxMessages);
  const selected: ContextMessage[] = [];
  let usedTokens = 0;
  let truncated = queried.length > options.maxMessages;

  for (const message of newestFirst) {
    const label = message.role === "user" ? options.userLabel : options.assistantLabel;
    const messageTokens = estimateTokens(`${label}：${message.content}\n`);
    // Always retain the newest message: for chat it contains the current request.
    if (selected.length > 0 && usedTokens + messageTokens > options.tokenBudget) {
      truncated = true;
      break;
    }
    selected.push(message);
    usedTokens += messageTokens;
  }

  selected.reverse();
  return {
    messages: selected,
    text: selected.map((message) => `${message.role === "user" ? options.userLabel : options.assistantLabel}：${message.content}`).join("\n"),
    estimatedTokens: usedTokens,
    truncated,
  };
}

export function buildConfirmedAnswerContext(snapshot: AnswerSnapshot) {
  const includedQuestionIds: string[] = [];
  const text = allQuestions.flatMap((question) => {
    const answer = snapshot[question.id];
    if (!answer || answer.status !== "confirmed") return [];
    includedQuestionIds.push(question.id);
    return [`${question.id} [confirmed, r${answer.revision}]：${answer.answer}`];
  }).join("\n");

  return {
    text: text || "尚无已确认答案",
    includedQuestionIds,
    estimatedTokens: estimateTokens(text),
  };
}

export function combineContextStats(
  strategy: string,
  answerContext: { includedQuestionIds: string[]; estimatedTokens: number },
  conversation: { messages: ContextMessage[]; estimatedTokens: number; truncated: boolean },
): ModelContextStats {
  return {
    strategy,
    includedAnswerCount: answerContext.includedQuestionIds.length,
    includedMessageCount: conversation.messages.length,
    estimatedTokens: answerContext.estimatedTokens + conversation.estimatedTokens,
    truncated: conversation.truncated,
  };
}
