import { describe, expect, it } from "vitest";
import {
  answerSynthesisSchema,
  candidateTurnReplySchema,
  coachTurnSchema,
  coachAssessmentSchema,
  normalizeCoachAssessment,
  normalizeCoachTurnResult,
  normalizePreAnswerResult,
  preAnswerSchema,
  questionMemorySchema,
  scaffoldingReplySchema,
  validateStructuredValue,
} from "@/lib/server/model-provider";

describe("compact assessment schemas", () => {
  it("accepts the compact coach decision contract", () => {
    expect(validateStructuredValue({
      ready: false,
      summary: "还缺少一个会改变答案方向的关键决定。",
      missingElements: ["玩家在核心循环中主动做出的决定"],
      parkedInsights: [],
    }, coachAssessmentSchema)).toBeTruthy();
  });

  it("normalizes legacy readiness strings to the ready boolean", () => {
    expect(validateStructuredValue(normalizeCoachAssessment({
      readiness: "ready",
      summary: "信息已经足够。",
      missingElements: [],
      parkedInsights: [],
    }), coachAssessmentSchema)).toEqual({
      ready: true,
      summary: "信息已经足够。",
      missingElements: [],
      parkedInsights: [],
    });
  });

  it("accepts the compact Pre-answer decision contract", () => {
    expect(validateStructuredValue({
      coverage: "complete",
      summary: "已有确认信息足以形成候选答案。",
      missingElements: [],
      reply: "可以根据此前信息形成答案。",
      suggestedAnswer: "候选答案",
    }, preAnswerSchema)).toBeTruthy();
  });

  it("normalizes the assessment model's status alias without changing its decision", () => {
    const normalized = normalizePreAnswerResult({
      status: "empty",
      summary: "没有已确认信息。",
      missingElements: ["关键经历"],
      reply: "你希望玩家首先做什么？",
      suggestedAnswer: "",
    });
    expect(validateStructuredValue(normalized, preAnswerSchema)).toEqual({
      coverage: "empty",
      summary: "没有已确认信息。",
      missingElements: ["关键经历"],
      reply: "你希望玩家首先做什么？",
      suggestedAnswer: "",
    });
  });

  it("stores Question Memory as one holistic text instead of decision arrays", () => {
    expect(validateStructuredValue({
      memoryText: "用户提出潜入玩法；AI 建议警戒值并被修改采用；永久死亡被拒绝。",
    }, questionMemorySchema)).toBeTruthy();
  });

  it("keeps Not Ready scaffolding entirely in the visible reply", () => {
    expect(validateStructuredValue({
      reply: "还需要明确必须保留的核心体验。你希望无论怎样抽象都保留什么？",
    }, scaffoldingReplySchema)).toBeTruthy();
  });

  it("allows a separate candidate only for Ready turns", () => {
    expect(validateStructuredValue({
      reply: "现在可以整理候选答案了。",
      suggestedAnswer: "玩家通过采集颜色来改变场景。",
    }, candidateTurnReplySchema)).toBeTruthy();
  });

  it("accepts one unified coach turn with cross-question navigation", () => {
    expect(validateStructuredValue({
      ready: true,
      decisionReason: "当前题已经包含完整的行动与后果。",
      reply: "已经可以形成候选答案。",
      suggestedAnswer: "玩家在外部采集颜色，在瓶中混色，并在独立空间播种。",
      crossQuestionIssues: [{
        questionId: "Q16",
        type: "possible_update",
        explanation: "空白区域的定义可能需要同步更新。",
        recommendedEditTarget: "previous",
        suggestedRevision: "更新后的 Q16 完整答案。",
      }],
    }, coachTurnSchema)).toBeTruthy();
  });

  it("normalizes the coach ready alias and rejects non-object navigation entries", () => {
    expect(normalizeCoachTurnResult({
      isReady: false,
      decisionReason: "还缺少后续影响。",
      reply: "播种之后会发生什么？",
      suggestedAnswer: "不应保留的草稿",
      crossQuestionIssues: ["Q16", { questionId: "Q16" }],
    })).toEqual({
      ready: false,
      decisionReason: "还缺少后续影响。",
      reply: "播种之后会发生什么？",
      suggestedAnswer: "",
      crossQuestionIssues: [],
    });
  });

  it("keeps manual answer synthesis free of workflow decisions", () => {
    expect(validateStructuredValue({
      suggestedAnswer: "我希望高度抽象，但保留选色搭配带来的审美体验。",
      parkedInsights: [],
    }, answerSynthesisSchema)).toBeTruthy();
  });
});
