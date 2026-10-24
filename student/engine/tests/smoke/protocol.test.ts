import { describe, expect, it } from "vitest";
import { gddCoveragePlan, requiredGddCoverageTags } from "@/lib/design/gdd";
import { allQuestions, stages } from "@/lib/protocol/stages";
import { questionReadinessContracts, validateQuestionReadinessContracts } from "@/lib/protocol/question-readiness";
import { questionScopeContracts } from "@/lib/protocol/question-scope";
import { requiredQuestionIds } from "@/lib/server/design-review";
import { gddOutlineSchema, validateStructuredValue } from "@/lib/server/model-provider";

describe("active design protocol", () => {
  it("contains 21 questions and ends Stage 6 at Q21", () => {
    expect(allQuestions).toHaveLength(21);
    expect(stages[5]).toMatchObject({ name: "进程与结果" });
    expect(stages[5].questions.map((question) => question.id)).toEqual(["Q20", "Q21"]);
    expect(requiredQuestionIds).toHaveLength(20);
  });

  it("does not route active workflow or GDD evidence to retired questions", () => {
    const activeIds = new Set(allQuestions.map((question) => question.id));
    const gddSources = gddCoveragePlan.flatMap(([, , , sources]) => [...sources]);

    expect(Object.keys(questionScopeContracts).sort()).toEqual([...activeIds].sort());
    expect(gddSources.every((id) => activeIds.has(id))).toBe(true);
    expect(activeIds.has("Q22")).toBe(false);
    expect(activeIds.has("Q23")).toBe(false);
  });

  it("defines unique semantic coverage requirements without prescribing GDD chapters", () => {
    expect(requiredGddCoverageTags).toHaveLength(8);
    expect(new Set(requiredGddCoverageTags).size).toBe(requiredGddCoverageTags.length);
  });

  it("accepts a game-specific GDD outline rather than fixed chapter names", () => {
    const stageSummaries = stages.map((stage) => ({ stageId: stage.id, summary: stage.name, keyDecisions: [], openQuestions: [] }));
    const sections = [
      { key: "vision", title: "概念与体验", purpose: "定义概念和体验", coverageTags: ["concept", "player_experience"], sourceQuestionIds: ["Q1", "Q6"] },
      { key: "fairy_journey", title: "精灵的一趟旅程", purpose: "说明身份、目标和循环", coverageTags: ["player_situation", "core_gameplay"], sourceQuestionIds: ["Q9", "Q13"] },
      { key: "color_bottles", title: "染色瓶系统", purpose: "说明资源与限制", coverageTags: ["rules_and_constraints"], sourceQuestionIds: ["Q11", "Q16"] },
      { key: "growing_world", title: "世界生长与反馈", purpose: "说明后果与反馈", coverageTags: ["feedback_and_consequences"], sourceQuestionIds: ["Q17", "Q19"] },
      { key: "one_trip", title: "单局进程与验证", purpose: "说明结束与试玩问题", coverageTags: ["progression_and_outcomes", "prototype_validation"], sourceQuestionIds: ["Q20", "Q21"] },
    ];

    expect(() => validateStructuredValue({ title: "采色精灵", oneLinePitch: "采集颜色并让世界生长。", stageSummaries, sections }, gddOutlineSchema)).not.toThrow();
    expect(sections.map((section) => section.key)).not.toContain("overview");
  });

  it("defines a minimum readiness contract for every active question", () => {
    expect(validateQuestionReadinessContracts()).toBe(true);
    expect(Object.keys(questionReadinessContracts).sort()).toEqual(allQuestions.map((question) => question.id).sort());
    expect(questionReadinessContracts.Q8.acceptableShortcuts).toContain("明确回答没有主题即可视为完整");
  });
});
