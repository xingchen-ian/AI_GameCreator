import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), limit: vi.fn() }));

vi.mock("@/db", () => ({ getDb: mocks.getDb }));

import { buildConfirmedAnswerContext, estimateTokens, loadRecentConversation } from "@/lib/server/model-context";

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

  it("uses a conservative estimate for CJK text", () => {
    expect(estimateTokens("游戏设计")).toBe(4);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("游戏abcd")).toBe(3);
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
