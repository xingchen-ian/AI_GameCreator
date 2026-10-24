export function answerDraftIsDirty(draft: string, baseline: string) {
  return draft !== baseline;
}

export function shouldAutoApplyAnswerSuggestion({
  activeQuestionId,
  responseQuestionId,
  draftIsDirty,
  recommendedAction,
}: {
  activeQuestionId: string;
  responseQuestionId: string;
  draftIsDirty: boolean;
  recommendedAction: unknown;
}) {
  return activeQuestionId === responseQuestionId && !draftIsDirty && recommendedAction === "confirm_answer";
}
