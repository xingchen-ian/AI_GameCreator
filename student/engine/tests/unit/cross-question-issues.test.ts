import { describe, expect, it } from "vitest";
import { validateCrossQuestionIssues } from "@/lib/design/cross-question-issues";

describe("cross-question issue validation", () => {
  it("keeps an external target and its recommended revision", () => {
    expect(validateCrossQuestionIssues([{
      questionId: "Q16",
      type: "possible_update",
      explanation: "空白区域定义发生变化。",
      recommendedEditTarget: "previous",
      suggestedRevision: "新版系统状态答案",
    }], "Q17")).toEqual([{
      questionId: "Q16",
      type: "possible_update",
      explanation: "空白区域定义发生变化。",
      recommendedEditTarget: "previous",
      suggestedRevision: "新版系统状态答案",
    }]);
  });

  it("drops current-question and unknown targets", () => {
    expect(validateCrossQuestionIssues([
      { questionId: "Q17", type: "conflict", explanation: "当前题", recommendedEditTarget: "current", suggestedRevision: "" },
      { questionId: "Q99", type: "conflict", explanation: "不存在", recommendedEditTarget: "previous", suggestedRevision: "" },
    ], "Q17")).toEqual([]);
  });
});
