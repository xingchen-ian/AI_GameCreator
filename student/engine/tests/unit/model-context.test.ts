import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), limit: vi.fn() }));

vi.mock("@/db", () => ({ getDb: mocks.getDb }));

import { buildConfirmedAnswerContext, buildQuestionMemoryContext, estimateTokens, loadRecentConversation, selectCurrentMemoryRows } from "@/lib/server/model-context";

describe("model context construction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockReturnValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({ limit: mocks.limit })),
          })),
        })),
      })),
    });
  });

  it("orders confirmed answers by protocol order and excludes drafts", () => {
    const context = buildConfirmedAnswerContext({
      Q10: { answer: "目标", status: "confirmed", revision: 2 },
      Q2: { answer: "过程", status: "confirmed", revision: 1 },
      Q1: { answer: "草稿", status: "draft", revision: 3 },
    });

    expect(context.includedQuestionIds).toEqual(["Q2", "Q10"]);
    expect(context.text.indexOf("Q2")).toBeLessThan(context.text.indexOf("Q10"));
    expect(context.text.split("\n").some((line) => line.startsWith("Q1 "))).toBe(false);
  });

  it("omits confirmed-answer fallbacks when a current Question Memory already covers them", () => {
    const context = buildConfirmedAnswerContext({
      Q2: { answer: "过程原文", status: "confirmed", revision: 1 },
      Q3: { answer: "情绪原文", status: "confirmed", revision: 1 },
      Q4: { answer: "行动原文", status: "confirmed", revision: 1 },
    }, {
      excludeQuestionId: "Q4",
      excludeQuestionIds: ["Q2"],
    });

    expect(context.includedQuestionIds).toEqual(["Q3"]);
    expect(context.text).toContain("情绪原文");
    expect(context.text).not.toContain("过程原文");
    expect(context.text).not.toContain("行动原文");
  });

  it("can restrict confirmed-answer fallback to Pre-answer selected questions", () => {
    const context = buildConfirmedAnswerContext({
      Q2: { answer: "过程", status: "confirmed", revision: 1 },
      Q3: { answer: "情绪", status: "confirmed", revision: 1 },
    }, { includeQuestionIds: ["Q3"] });

    expect(context.includedQuestionIds).toEqual(["Q3"]);
    expect(context.text).toContain("情绪");
    expect(context.text).not.toContain("过程");
  });

  it("uses a conservative estimate for CJK text", () => {
    expect(estimateTokens("游戏设计")).toBe(4);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("游戏abcd")).toBe(3);
  });

  it("orders question memories by protocol and preserves rejected directions separately", () => {
    const context = buildQuestionMemoryContext([
      { questionId: "Q10", answerRevision: 2, summary: "目标摘要", confirmedDecisions: ["完成订单"], editedAdoptions: [], explicitRejections: ["无限时间"], constraints: ["时间有限"], openQuestions: [] },
      { questionId: "Q2", answerRevision: 1, summary: "过程摘要", confirmedDecisions: ["先观察"], editedAdoptions: [], explicitRejections: [], constraints: [], openQuestions: ["结束信号待定"] },
    ], "Q2");

    expect(context.includedQuestionIds).toEqual(["Q10"]);
    expect(context.text).toContain("明确拒绝：无限时间");
    expect(context.text).not.toContain("过程摘要");
  });

  it("drops memories whose revision is not the current confirmed revision", () => {
    const rows = [
      { questionId: "Q3", answerRevision: 1 },
      { questionId: "Q4", answerRevision: 2 },
      { questionId: "Q5", answerRevision: 1 },
      { questionId: "Q6", answerRevision: 1 },
    ];
    const current = selectCurrentMemoryRows(rows, {
      Q3: { answer: "新答案", status: "confirmed", revision: 2 },
      Q4: { answer: "答案", status: "confirmed", revision: 2 },
      Q5: { answer: "已改回草稿", status: "draft", revision: 1 },
    });

    expect(current).toEqual([{ questionId: "Q4", answerRevision: 2 }]);
  });

  it("loads only the newest node messages and enforces the token budget", async () => {
    mocks.limit.mockResolvedValue([
      { id: "new", role: "user", content: "最新消息", createdAt: "2026-10-23T10:00:02.000Z" },
      { id: "old", role: "assistant", content: "较早消息", createdAt: "2026-10-23T10:00:01.000Z" },
    ]);

    const context = await loadRecentConversation("project-1", "Q3", {
      maxMessages: 12,
      tokenBudget: 5,
      userLabel: "用户",
      assistantLabel: "教练",
    });

    expect(mocks.limit).toHaveBeenCalledWith(13);
    expect(context.messages.map((message) => message.id)).toEqual(["new"]);
    expect(context.truncated).toBe(true);
  });
});
