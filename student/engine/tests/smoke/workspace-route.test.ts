import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAppUser: vi.fn(),
  getWorkspace: vi.fn(),
}));

vi.mock("@/app/app-auth", () => ({
  getAppUser: mocks.getAppUser,
}));

vi.mock("@/lib/server/workspace", () => ({
  getWorkspace: mocks.getWorkspace,
  requireAnyOwnedProject: vi.fn(),
  requireOwnedProject: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { GET, POST } from "@/app/api/workspace/route";

describe("workspace identity smoke test", () => {
  beforeEach(() => {
    mocks.getAppUser.mockReset();
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
    mocks.getAppUser.mockResolvedValue(user);
    mocks.getWorkspace.mockResolvedValue(workspace);

    const response = await GET(new Request("https://site.test/api/workspace?projectId=project-1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(workspace);
    expect(mocks.getWorkspace).toHaveBeenCalledWith(user, "project-1");
  });

  it("rejects a workspace request without an application identity", async () => {
    mocks.getAppUser.mockResolvedValue(null);

    const response = await GET(new Request("https://site.test/api/workspace"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "请使用参与者专属链接进入。",
    });
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });

  it("prevents a participant from creating a second project", async () => {
    mocks.getAppUser.mockResolvedValue({
      userId: "participant:1",
      email: "p001@study.invalid",
      displayName: "P001",
      fullName: null,
      accessMode: "participant",
    });

    const response = await POST(new Request("https://site.test/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create_project", title: "second" }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.getWorkspace).not.toHaveBeenCalled();
  });
});
