import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  getWorkspace: vi.fn(),
}));

vi.mock("@/app/chatgpt-auth", () => ({
  getChatGPTUser: mocks.getChatGPTUser,
}));

vi.mock("@/lib/server/workspace", () => ({
  getWorkspace: mocks.getWorkspace,
  requireAnyOwnedProject: vi.fn(),
  requireOwnedProject: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { GET } from "@/app/api/workspace/route";

describe("authenticated workspace smoke test", () => {
  beforeEach(() => {
    mocks.getChatGPTUser.mockReset();
    mocks.getWorkspace.mockReset();
  });

  it("loads the requested project for the signed-in user", async () => {
    const user = {
      userId: "user-1",
      email: "student@example.edu",
      displayName: "Student",
      fullName: "Student",
    };
    const workspace = {
      project: { id: "project-1", title: "Test game", activeQuestionId: "Q1" },
      projects: [],
      answers: {},
    };
    mocks.getChatGPTUser.mockResolvedValue(user);
    mocks.getWorkspace.mockResolvedValue(workspace);

    const response = await GET(new Request("https://site.test/api/workspace?projectId=project-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(workspace);
    expect(mocks.getWorkspace).toHaveBeenCalledWith(user, "project-1");
  });

  it("rejects a workspace request without a signed-in user", async () => {
    mocks.getChatGPTUser.mockResolvedValue(null);

    const response = await GET(new Request("https://site.test/api/workspace"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "请先使用 ChatGPT 账号登录。",
    });
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
});
