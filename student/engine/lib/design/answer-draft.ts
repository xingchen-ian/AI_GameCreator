export function answerDraftIsDirty(draft: string, baseline: string) {
  return draft !== baseline;
}

export function shouldAutoApplyAnswerSuggestion({
  activeQuestionId,
  responseQuestionId,
  draftIsDirty,
}: {
  activeQuestionId: string;
  responseQuestionId: string;
  draftIsDirty: boolean;
}) {
  return activeQuestionId === responseQuestionId && !draftIsDirty;
}
