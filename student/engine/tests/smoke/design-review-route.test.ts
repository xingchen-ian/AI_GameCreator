import { beforeEach, describe, expect, it, vi } from "vitest";
import { requiredQuestionIds } from "@/lib/server/design-review";

const mocks = vi.hoisted(() => ({
  createStructuredResponse: vi.fn(),
  getAppUser: vi.fn(),
  getWorkspace: vi.fn(),
  loadAnswerSnapshot: vi.fn(),
  requireOwnedProject: vi.fn(),
  selectLimit: vi.fn(),
  statementRun: vi.fn(),
  transaction: vi.fn((callback: () => unknown) => callback()),
}));

vi.mock("@/app/app-auth", () => ({
  getAppUser: mocks.getAppUser,
}));

vi.mock("@/lib/server/workspace", () => ({
  getWorkspace: mocks.getWorkspace,
  loadAnswerSnapshot: mocks.loadAnswerSnapshot,
  requireOwnedProject: mocks.requireOwnedProject,
}));

vi.mock("@/lib/server/model-provider", () => {
  class AIConfigurationError extends Error {}
  class AIRequestTimeoutError extends Error {}
  return {
    AIConfigurationError,
    AIRequestTimeoutError,
    createStructuredResponse: mocks.createStructuredResponse,
    designReviewScanSchema: { type: "object" },
    designReviewVerificationSchema: vi.fn(() => ({ type: "object" })),
  };
});

vi.mock("@/db", () => {
  const insert = vi.fn(() => ({ values: vi.fn(() => ({ run: mocks.statementRun })) }));
  const update = vi.fn(() => ({
    set: vi.fn(() => ({ where: vi.fn(() => ({ run: mocks.statementRun })) })),
  }));
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({ limit: mocks.selectLimit })),
      })),
    })),
  }));
  return {
    getDb: () => ({ transaction: mocks.transaction, insert, select, update }),
  };
});

import { POST } from "@/app/api/design-review/route";

describe("global design review smoke test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppUser.mockResolvedValue({
      userId: "user-1",
      email: "student@example.edu",
      displayName: "Student",
      fullName: "Student",
    });
    mocks.requireOwnedProject.mockResolvedValue({ id: "project-1", title: "Test game" });
    mocks.loadAnswerSnapshot.mockResolvedValue(Object.fromEntries(
      requiredQuestionIds.map((id) => [id, { answer: `${id} answer`, status: "confirmed", revision: 1 }]),
    ));
    mocks.selectLimit.mockResolvedValue([]);
    mocks.createStructuredResponse.mockResolvedValue({ issues: [] });
    mocks.transaction.mockImplementation((callback: () => unknown) => callback());
    mocks.getWorkspace.mockResolvedValue({
      project: { id: "project-1", title: "Test game" },
      latestDesignReview: { status: "ready", issues: [] },
    });
  });

  it("creates a review run from a complete design state without calling the real model", async () => {
    const response = await POST(new Request("https://site.test/api/design-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "project-1", action: "start" }),
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      project: { id: "project-1" },
      latestDesignReview: { status: "ready" },
    });
    expect(mocks.createStructuredResponse).toHaveBeenCalledWith(expect.objectContaining({
      purpose: "design_review",
      projectId: "project-1",
      name: "design_state_consistency_review",
    }));
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.statementRun).toHaveBeenCalled();
    expect(mocks.getWorkspace).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }), "project-1");
  });
});
