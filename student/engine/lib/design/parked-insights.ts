import { allQuestions } from "@/lib/protocol/stages";

export type ParkedInsight = {
  content: string;
  suggestedQuestionId: string;
};

function normalizeEvidence(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function validateParkedInsights(
  value: unknown,
  userMessages: string[],
  currentQuestionId: string,
): ParkedInsight[] {
  if (!Array.isArray(value)) return [];
  const normalizedUserMessages = userMessages.map(normalizeEvidence).filter(Boolean);

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as { content?: unknown; suggestedQuestionId?: unknown };
    if (typeof candidate.content !== "string" || typeof candidate.suggestedQuestionId !== "string") return [];

    const content = candidate.content.trim();
    const normalizedContent = normalizeEvidence(content);
    if (!normalizedContent || candidate.suggestedQuestionId === currentQuestionId) return [];
    if (!allQuestions.some((question) => question.id === candidate.suggestedQuestionId)) return [];
    if (!normalizedUserMessages.some((message) => message.includes(normalizedContent))) return [];

    return [{ content, suggestedQuestionId: candidate.suggestedQuestionId }];
  });
}
