import { allQuestions } from "@/lib/protocol/stages";

export type CrossQuestionIssue = {
  questionId: string;
  type: "possible_update" | "conflict";
  explanation: string;
  recommendedEditTarget: "current" | "previous" | "either";
  suggestedRevision: string;
};

export function validateCrossQuestionIssues(value: unknown, currentQuestionId: string): CrossQuestionIssue[] {
  if (!Array.isArray(value)) return [];
  const questionIds = new Set(allQuestions.map((question) => question.id));
  const seen = new Set<string>();

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Partial<CrossQuestionIssue>;
    if (typeof candidate.questionId !== "string"
      || candidate.questionId === currentQuestionId
      || !questionIds.has(candidate.questionId)
      || seen.has(candidate.questionId)) return [];
    if (candidate.type !== "possible_update" && candidate.type !== "conflict") return [];
    if (candidate.recommendedEditTarget !== "current"
      && candidate.recommendedEditTarget !== "previous"
      && candidate.recommendedEditTarget !== "either") return [];
    if (typeof candidate.explanation !== "string" || !candidate.explanation.trim()) return [];

    seen.add(candidate.questionId);
    return [{
      questionId: candidate.questionId,
      type: candidate.type,
      explanation: candidate.explanation.trim().slice(0, 900),
      recommendedEditTarget: candidate.recommendedEditTarget,
      suggestedRevision: typeof candidate.suggestedRevision === "string"
        ? candidate.suggestedRevision.trim().slice(0, 5000)
        : "",
    }];
  });
}
