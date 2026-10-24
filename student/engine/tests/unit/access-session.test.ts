import { describe, expect, it } from "vitest";
import { createParticipantToken, tokenHash } from "@/lib/server/access-session";

describe("participant access primitives", () => {
  it("uses high-entropy URL-safe tokens and stores only a deterministic hash", () => {
    const first = createParticipantToken();
    const second = createParticipantToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(second).not.toBe(first);
    expect(tokenHash(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash(first)).toBe(tokenHash(first));
    expect(tokenHash(first)).not.toBe(first);
  });
});
