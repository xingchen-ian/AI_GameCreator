import { describe, expect, it } from "vitest";
import { gddSectionPlan } from "@/lib/design/gdd";
import { allQuestions, stages } from "@/lib/protocol/stages";
import { questionScopeContracts } from "@/lib/protocol/question-scope";
import { requiredQuestionIds } from "@/lib/server/design-review";

describe("active design protocol", () => {
  it("contains 21 questions and ends Stage 6 at Q21", () => {
    expect(allQuestions).toHaveLength(21);
    expect(stages[5]).toMatchObject({ name: "进程与结果" });
    expect(stages[5].questions.map((question) => question.id)).toEqual(["Q20", "Q21"]);
    expect(requiredQuestionIds).toHaveLength(20);
  });

  it("does not route active workflow or GDD evidence to retired questions", () => {
    const activeIds = new Set(allQuestions.map((question) => question.id));
    const parkingTargets = Object.values(questionScopeContracts).flatMap((contract) => contract.parkingTargets);
    const gddSources = gddSectionPlan.flatMap(([, , , sources]) => [...sources]);

    expect(parkingTargets.every((id) => activeIds.has(id))).toBe(true);
    expect(gddSources.every((id) => activeIds.has(id))).toBe(true);
    expect(activeIds.has("Q22")).toBe(false);
    expect(activeIds.has("Q23")).toBe(false);
  });
});
