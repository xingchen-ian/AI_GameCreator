import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, questionMemories } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";

export type AnswerSnapshot = Record<string, {
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

export type QuestionMemoryContextItem = {
  questionId: string;
  answerRevision: number;
  summary: string;
  confirmedDecisions: string[];
  editedAdoptions: string[];
  explicitRejections: string[];
  constraints: string[];
  openQuestions: string[];
  unresolvedSuggestions?: string[];
};

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

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

export function buildConfirmedAnswerContext(
  snapshot: AnswerSnapshot,
  options: { excludeQuestionId?: string; excludeQuestionIds?: Iterable<string>; includeQuestionIds?: Iterable<string> } = {},
) {
  const excluded = new Set(options.excludeQuestionIds ?? []);
  const included = options.includeQuestionIds ? new Set(options.includeQuestionIds) : null;
  if (options.excludeQuestionId) excluded.add(options.excludeQuestionId);
  const includedQuestionIds: string[] = [];
  const text = allQuestions.flatMap((question) => {
    if (excluded.has(question.id) || included && !included.has(question.id)) return [];
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

export function buildQuestionMemoryContext(items: QuestionMemoryContextItem[], excludeQuestionId?: string) {
  const byQuestionId = new Map(items.map((item) => [item.questionId, item]));
  const includedQuestionIds: string[] = [];
  const text = allQuestions.flatMap((question) => {
    if (question.id === excludeQuestionId) return [];
    const memory = byQuestionId.get(question.id);
    if (!memory) return [];
    includedQuestionIds.push(question.id);
    const details = [
      memory.confirmedDecisions.length ? `确认决定：${memory.confirmedDecisions.join("；")}` : "",
      memory.editedAdoptions.length ? `修改后采用：${memory.editedAdoptions.join("；")}` : "",
      memory.explicitRejections.length ? `明确拒绝：${memory.explicitRejections.join("；")}` : "",
      memory.constraints.length ? `约束：${memory.constraints.join("；")}` : "",
      memory.openQuestions.length ? `未解决：${memory.openQuestions.join("；")}` : "",
      memory.unresolvedSuggestions?.length ? `尚未处理的 AI 建议：${memory.unresolvedSuggestions.join("；")}` : "",
    ].filter(Boolean).join("\n");
    return [`${question.id} [Question Memory, answer r${memory.answerRevision}]：${memory.summary}${details ? `\n${details}` : ""}`];
  }).join("\n\n");

  return {
    text: text || "尚无已确认的 Question Memory",
    includedQuestionIds,
    estimatedTokens: estimateTokens(text),
  };
}

// A memory describes one answer revision. Only a memory whose revision equals the
// question's current confirmed revision is trustworthy; anything else (older
// revision, or an answer that is no longer confirmed) describes a decision the
// user may have since changed, so it is dropped and the answer text stands alone.
export function selectCurrentMemoryRows<T extends { questionId: string; answerRevision: number }>(
  rows: T[],
  snapshot: AnswerSnapshot,
) {
  return rows.filter((row) => {
    const answer = snapshot[row.questionId];
    return answer?.status === "confirmed" && answer.revision === row.answerRevision;
  });
}

export async function loadQuestionMemoryContext(
  projectId: string,
  snapshot: AnswerSnapshot,
  excludeQuestionId?: string,
  includeQuestionIds?: Iterable<string>,
) {
  const rows = await getDb().select().from(questionMemories).where(eq(questionMemories.projectId, projectId)).orderBy(desc(questionMemories.createdAt));
  const currentByQuestion = new Map<string, typeof rows[number]>();
  for (const row of selectCurrentMemoryRows(rows, snapshot)) if (!currentByQuestion.has(row.questionId)) currentByQuestion.set(row.questionId, row);
  const included = includeQuestionIds ? new Set(includeQuestionIds) : null;
  return buildQuestionMemoryContext([...currentByQuestion.values()].filter((row) => !included || included.has(row.questionId)).map((row) => ({
    questionId: row.questionId,
    answerRevision: row.answerRevision,
    summary: row.summary,
    confirmedDecisions: parseStringArray(row.confirmedDecisionsJson),
    editedAdoptions: parseStringArray(row.editedAdoptionsJson),
    explicitRejections: parseStringArray(row.explicitRejectionsJson),
    constraints: parseStringArray(row.constraintsJson),
    openQuestions: parseStringArray(row.openQuestionsJson),
    unresolvedSuggestions: parseStringArray(row.unresolvedSuggestionsJson),
  })), excludeQuestionId);
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
