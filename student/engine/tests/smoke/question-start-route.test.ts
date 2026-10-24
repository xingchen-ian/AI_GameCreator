import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  createStructuredResponseWithMeta: vi.fn(),
  getAppUser: vi.fn(),
  loadAnswerSnapshot: vi.fn(),
  requireOwnedProject: vi.fn(),
  runSqliteBatch: vi.fn(),
}));

vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/app/app-auth", () => ({ getAppUser: mocks.getAppUser }));
vi.mock("@/db/batch", () => ({ runSqliteBatch: mocks.runSqliteBatch }));
vi.mock("@/db", () => ({
  getDb: () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({})) })),
  }),
}));
vi.mock("@/lib/server/background-jobs", () => ({ processBackgroundJobs: vi.fn() }));
vi.mock("@/lib/server/model-context", () => ({
  buildConfirmedAnswerContext: vi.fn(),
  loadQuestionMemoryContext: vi.fn(),
}));
vi.mock("@/lib/server/model-provider", () => ({
  AIConfigurationError: class AIConfigurationError extends Error {},
  createStructuredResponseWithMeta: mocks.createStructuredResponseWithMeta,
  normalizePreAnswerResult: vi.fn(),
  preAnswerSchema: {},
}));
vi.mock("@/lib/server/workspace", () => ({
  loadAnswerSnapshot: mocks.loadAnswerSnapshot,
  requireOwnedProject: mocks.requireOwnedProject,
}));

import { POST } from "@/app/api/ai/question-start/route";

describe("question start route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppUser.mockResolvedValue({ userId: "user-1", email: "student@example.edu" });
    mocks.requireOwnedProject.mockResolvedValue({ id: "project-1" });
    mocks.loadAnswerSnapshot.mockResolvedValue({});
  });

  it("opens an empty project with a deterministic starter and no model call", async () => {
    const response = await POST(new Request("https://site.test/api/ai/question-start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "project-1", questionId: "Q1" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      created: true,
      assistantMessage: { role: "assistant", text: expect.stringContaining("先不用急着把它想成游戏") },
      suggestion: {
        answer: "",
        structuredData: {
          recommendedAction: "continue_discussion",
          preAnswer: { coverage: "empty", source: "deterministic_empty_start" },
        },
      },
    });
    expect(mocks.createStructuredResponseWithMeta).not.toHaveBeenCalled();
    expect(mocks.runSqliteBatch).toHaveBeenCalledOnce();
  });
});
