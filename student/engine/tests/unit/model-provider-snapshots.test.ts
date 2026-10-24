import { afterEach, describe, expect, it, vi } from "vitest";

const recorded = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("@/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: async (value: Record<string, unknown>) => {
        recorded.push(value);
      },
    }),
  }),
}));

import { createStructuredResponseWithMeta, normalizePreAnswerResult } from "@/lib/server/model-provider";

describe("model request snapshots", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    recorded.length = 0;
  });

  it("records the exact strict failure and fallback request/response without credentials", async () => {
    process.env.DASHSCOPE_API_KEY = "must-not-be-recorded";
    process.env.DASHSCOPE_BASE_URL = "https://provider.example/v1";
    process.env.DASHSCOPE_COACH_TURN_MODEL = "coach-turn-test-model";
    const rawFailure = JSON.stringify({ error: { message: "strict unsupported" } });
    const rawSuccess = JSON.stringify({
      choices: [{ message: { content: "{\"answer\":\"ok\"}" } }],
      usage: { prompt_tokens: 11, completion_tokens: 4 },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(rawFailure, { status: 400 }))
      .mockResolvedValueOnce(new Response(rawSuccess, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await createStructuredResponseWithMeta<{ answer: string }>({
      instructions: "system instructions",
      input: "full user context",
      name: "snapshot_test",
      promptVersion: "test-p1",
      schemaVersion: "test-s1",
      schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"], additionalProperties: false },
      purpose: "coach_turn",
    });

    expect(response.result.answer).toBe("ok");
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ role: "coach_turn", model: "coach-turn-test-model" });
    const attempts = JSON.parse(recorded[0].attemptsJson as string) as Array<Record<string, unknown>>;
    expect(attempts).toHaveLength(2);
    expect(attempts.map((attempt) => attempt.phase)).toEqual(["primary_strict", "strict_fallback"]);
    expect(attempts.map((attempt) => attempt.responseBody)).toEqual([rawFailure, rawSuccess]);
    expect(JSON.stringify(attempts)).toContain("full user context");
    expect(JSON.stringify(attempts)).not.toContain("must-not-be-recorded");
  });

  it("normalizes an assessment-model field alias without making a repair request", async () => {
    process.env.DASHSCOPE_API_KEY = "must-not-be-recorded";
    process.env.DASHSCOPE_BASE_URL = "https://provider.example/v1";
    process.env.DASHSCOPE_PRE_ANSWER_MODEL = "pre-answer-test-model";
    const rawSuccess = JSON.stringify({
      choices: [{ message: { content: "{\"status\":\"empty\",\"summary\":\"没有已确认信息。\",\"missingElements\":[\"关键经历\"],\"reply\":\"你希望玩家先做什么？\",\"suggestedAnswer\":\"\"}" } }],
      usage: { prompt_tokens: 8, completion_tokens: 3 },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(rawSuccess, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await createStructuredResponseWithMeta<{ coverage: string }>({
      instructions: "assessment",
      input: "context",
      name: "bootstrap_alias_test",
      promptVersion: "test-p1",
      schemaVersion: "test-s1",
      schema: {
        type: "object",
        properties: {
          coverage: { type: "string", enum: ["complete", "partial", "empty"] },
          summary: { type: "string" },
          missingElements: { type: "array", items: { type: "string" } },
          reply: { type: "string" },
          suggestedAnswer: { type: "string" },
        },
        required: ["coverage", "summary", "missingElements", "reply", "suggestedAnswer"],
        additionalProperties: false,
      },
      purpose: "pre_answer",
      repairInvalidOutput: true,
      normalizeResult: normalizePreAnswerResult,
    });

    expect(response.result.coverage).toBe("empty");
    expect(response.meta.outcome).toBe("success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(recorded[0].attemptsJson as string)).toHaveLength(1);
  });
});
