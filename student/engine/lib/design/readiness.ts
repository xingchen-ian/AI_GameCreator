import { allQuestions } from "@/lib/protocol/stages";
import type { StoredAnswer } from "./types";

export const prototypeRequiredQuestions = ["Q6", "Q10", "Q13", "Q16"] as const;

export function getDesignIssues(answers: Record<string, StoredAnswer>) {
  const issues: Array<{ type: "missing"; questionId: string; message: string }> = [];
  for (const id of prototypeRequiredQuestions) {
    if (!answers[id]?.answer.trim()) {
      const question = allQuestions.find((item) => item.id === id);
      issues.push({ type: "missing", questionId: id, message: `生成原型前需要完成 ${id} · ${question?.short ?? "关键问题"}` });
    }
  }
  return issues;
}
