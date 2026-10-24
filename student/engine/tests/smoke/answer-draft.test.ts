import { describe, expect, it } from "vitest";
import { answerDraftIsDirty, shouldAutoApplyAnswerSuggestion } from "@/lib/design/answer-draft";

describe("answer draft suggestion protection", () => {
  it("does not auto-apply an AI suggestion over a user-edited draft", () => {
    expect(answerDraftIsDirty("用户修改后的答案", "原答案")).toBe(true);
    expect(shouldAutoApplyAnswerSuggestion({
      activeQuestionId: "Q4",
      responseQuestionId: "Q4",
      draftIsDirty: true,
      recommendedAction: "confirm_answer",
    })).toBe(false);
  });

  it("only auto-applies to the unchanged draft for the responding question", () => {
    expect(shouldAutoApplyAnswerSuggestion({
      activeQuestionId: "Q4",
      responseQuestionId: "Q4",
      draftIsDirty: false,
      recommendedAction: "confirm_answer",
    })).toBe(true);
    expect(shouldAutoApplyAnswerSuggestion({
      activeQuestionId: "Q5",
      responseQuestionId: "Q4",
      draftIsDirty: false,
      recommendedAction: "confirm_answer",
    })).toBe(false);
  });

  it("does not place a not-ready suggestion into the answer editor", () => {
    expect(shouldAutoApplyAnswerSuggestion({
      activeQuestionId: "Q4",
      responseQuestionId: "Q4",
      draftIsDirty: false,
      recommendedAction: "continue_discussion",
    })).toBe(false);
  });
});
