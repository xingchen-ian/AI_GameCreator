import { describe, expect, it } from "vitest";
import { validateParkedInsights } from "@/lib/design/parked-insights";

describe("parked insight provenance", () => {
  it("keeps cross-question text that is copied from a user message", () => {
    expect(validateParkedInsights(
      [{ content: "用各种各样的色彩去改造真实世界", suggestedQuestionId: "Q3" }],
      ["小时候写生，因为可以发现现实的美，用各种各样的色彩去改造真实世界"],
      "Q1",
    )).toEqual([{ content: "用各种各样的色彩去改造真实世界", suggestedQuestionId: "Q3" }]);
  });

  it("rejects a follow-up question invented by the model", () => {
    expect(validateParkedInsights(
      [{ content: "在写生过程中，最让你困扰的具体情境是什么？", suggestedQuestionId: "Q2" }],
      ["小时候写生"],
      "Q1",
    )).toEqual([]);
  });

  it("rejects the current or an unknown question as a parking target", () => {
    expect(validateParkedInsights(
      [
        { content: "小时候写生", suggestedQuestionId: "Q1" },
        { content: "小时候写生", suggestedQuestionId: "Q99" },
      ],
      ["小时候写生"],
      "Q1",
    )).toEqual([]);
  });
});
