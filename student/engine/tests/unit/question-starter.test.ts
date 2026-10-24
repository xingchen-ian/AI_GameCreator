import { describe, expect, it } from "vitest";
import { allQuestions } from "@/lib/protocol/stages";
import { starterForQuestion } from "@/lib/protocol/question-starter";

describe("deterministic question starters", () => {
  it("uses the curated opening for Q1", () => {
    expect(starterForQuestion(allQuestions.find((question) => question.id === "Q1")!))
      .toContain("先不用急着把它想成游戏");
  });

  it("uses the question guide for later questions", () => {
    const question = allQuestions.find((item) => Number(item.id.slice(1)) > 4)!;
    expect(starterForQuestion(question)).toContain(question.guide);
  });
});
