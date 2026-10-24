import { describe, expect, it } from "vitest";
import { reconcileAssessmentDecision } from "@/lib/design/assessment-decision";

describe("assessment decision consistency", () => {
  it("keeps a consistent ready decision", () => {
    expect(reconcileAssessmentDecision({
      ready: true,
      summary: "证据充足：已经给出了突出时刻和对应情绪。",
      missingElements: [],
    }).ready).toBe(true);
  });

  it("downgrades ready when the explanation explicitly says evidence is insufficient", () => {
    const result = reconcileAssessmentDecision({
      ready: true,
      summary: "用户提到了最后一步，但未明确该时刻的情绪，证据不足。",
      missingElements: [],
    });

    expect(result.ready).toBe(false);
    expect(result.missingElements).toHaveLength(1);
  });

  it("downgrades ready when missing elements are present", () => {
    expect(reconcileAssessmentDecision({
      ready: true,
      summary: "信息接近完整。",
      missingElements: ["对应情绪"],
    }).ready).toBe(false);
  });

  it("does not mistake the absence of a gap for missing evidence", () => {
    expect(reconcileAssessmentDecision({
      ready: true,
      summary: "证据充足：回答完整，没有明确缺口。",
      missingElements: [],
    }).ready).toBe(true);
  });
});
