import { allQuestions, stages } from "@/lib/protocol/stages";
import type { StoredAnswer } from "@/lib/design/types";

export type AnswerSnapshot = Record<string, Pick<StoredAnswer, "answer" | "status" | "revision">>;

export const requiredQuestionIds = allQuestions.filter((question) => question.id !== "Q8").map((question) => question.id);
export const validQuestionIds = new Set(allQuestions.map((question) => question.id));

export function sanitizeQuestionIds(values: string[]) {
  return [...new Set(values.filter((value) => validQuestionIds.has(value)))].slice(0, 8);
}

export function answerSnapshotKey(snapshot: AnswerSnapshot) {
  return allQuestions.map((question) => {
    const answer = snapshot[question.id];
    return `${question.id}:${answer?.revision ?? 0}:${answer?.status ?? "missing"}`;
  }).join("|");
}

export function designStateText(snapshot: AnswerSnapshot) {
  return stages.map((stage) => [
    `Stage ${stage.id} — ${stage.name}`,
    `目标：${stage.goal}`,
    ...stage.questions.map((question) => `${question.id} ${question.prompt}\n回答 [r${snapshot[question.id]?.revision ?? 0}]：${snapshot[question.id]?.answer ?? "（可选题未回答）"}`),
  ].join("\n")).join("\n\n");
}

export function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
