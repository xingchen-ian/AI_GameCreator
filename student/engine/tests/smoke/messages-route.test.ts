import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  requireOwnedProject: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/app/chatgpt-auth", () => ({ getChatGPTUser: mocks.getChatGPTUser }));
vi.mock("@/lib/server/workspace", () => ({ requireOwnedProject: mocks.requireOwnedProject }));
vi.mock("@/db", () => ({
  getDb: () => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit: mocks.limit })),
        })),
      })),
    })),
  }),
}));

import { GET } from "@/app/api/messages/route";

describe("lazy message route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getChatGPTUser.mockResolvedValue({ userId: "user-1", email: "student@example.edu" });
    mocks.requireOwnedProject.mockResolvedValue({ id: "project-1" });
    mocks.limit.mockResolvedValue([
      { id: "m2", role: "assistant", content: "reply", createdAt: "2026-10-23T10:00:02.000Z" },
      { id: "m1", role: "user", content: "hello", createdAt: "2026-10-23T10:00:01.000Z" },
    ]);
  });

  it("returns one question conversation in chronological order", async () => {
    const response = await GET(new Request("https://site.test/api/messages?projectId=project-1&questionId=Q3"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      messages: [
        { id: "m1", role: "user", text: "hello", createdAt: "2026-10-23T10:00:01.000Z" },
        { id: "m2", role: "assistant", text: "reply", createdAt: "2026-10-23T10:00:02.000Z" },
      ],
      hasMore: false,
    });
    expect(mocks.limit).toHaveBeenCalledWith(101);
  });
});
