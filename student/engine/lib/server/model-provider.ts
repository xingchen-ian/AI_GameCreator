import { env } from "cloudflare:workers";

type JsonSchema = Record<string, unknown>;
type ModelRole = "chat" | "gdd" | "build";

export class AIConfigurationError extends Error {
  constructor(missing: string[]) {
    super(`真实 AI 尚未配置。请为 Site 设置：${missing.join("、")}。`);
    this.name = "AIConfigurationError";
  }
}

export class AIRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`模型在 ${Math.round(timeoutMs / 1000)} 秒内没有完成当前步骤，请重试。`);
    this.name = "AIRequestTimeoutError";
  }
}

function getProviderConfig(role: ModelRole) {
  const missing: string[] = [];
  const apiKey = env.DASHSCOPE_API_KEY?.trim();
  const baseUrl = env.DASHSCOPE_BASE_URL?.trim().replace(/\/$/, "");
  if (!apiKey) missing.push("DASHSCOPE_API_KEY");
  if (!baseUrl) missing.push("DASHSCOPE_BASE_URL");
  if (missing.length) throw new AIConfigurationError(missing);

  return {
    apiKey: apiKey!,
    baseUrl: baseUrl!,
    model: role === "build"
      ? env.DASHSCOPE_BUILD_MODEL?.trim() || "qwen3.8-27b"
      : role === "gdd"
        ? env.DASHSCOPE_GDD_MODEL?.trim() || "qwen3.8-flash"
        : env.DASHSCOPE_CHAT_MODEL?.trim() || "qwen3.8-flash",
  };
}

function extractMessageContent(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : "")
    .join("\n");
}

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

function assertSchema(value: unknown, schema: JsonSchema, path = "result"): void {
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) throw new Error(`${path} 不在允许范围内。`);
  switch (schema.type) {
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} 应为对象。`);
      const objectValue = value as Record<string, unknown>;
      const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
      const required = Array.isArray(schema.required) ? schema.required as string[] : [];
      for (const key of required) if (!(key in objectValue)) throw new Error(`${path}.${key} 缺失。`);
      if (schema.additionalProperties === false) {
        for (const key of Object.keys(objectValue)) if (!(key in properties)) throw new Error(`${path}.${key} 不受支持。`);
      }
      for (const [key, childSchema] of Object.entries(properties)) {
        if (key in objectValue) assertSchema(objectValue[key], childSchema, `${path}.${key}`);
      }
      return;
    }
    case "array": {
      if (!Array.isArray(value)) throw new Error(`${path} 应为数组。`);
      if (typeof schema.minItems === "number" && value.length < schema.minItems) throw new Error(`${path} 至少需要 ${schema.minItems} 项。`);
      if (typeof schema.maxItems === "number" && value.length > schema.maxItems) throw new Error(`${path} 最多允许 ${schema.maxItems} 项。`);
      if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) throw new Error(`${path} 不能包含重复项。`);
      const itemSchema = schema.items as JsonSchema | undefined;
      if (itemSchema) value.forEach((item, index) => assertSchema(item, itemSchema, `${path}[${index}]`));
      return;
    }
    case "string": {
      if (typeof value !== "string") throw new Error(`${path} 应为字符串。`);
      if (typeof schema.minLength === "number" && value.length < schema.minLength) throw new Error(`${path} 少于最小长度。`);
      if (typeof schema.maxLength === "number" && value.length > schema.maxLength) throw new Error(`${path} 超过最大长度。`);
      if (typeof schema.pattern === "string" && !(new RegExp(schema.pattern)).test(value)) throw new Error(`${path} 格式不正确。`);
      return;
    }
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${path} 应为整数。`);
      if (typeof schema.minimum === "number" && value < schema.minimum) throw new Error(`${path} 小于最小值。`);
      if (typeof schema.maximum === "number" && value > schema.maximum) throw new Error(`${path} 大于最大值。`);
      return;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path} 应为数字。`);
      return;
    case "boolean":
      if (typeof value !== "boolean") throw new Error(`${path} 应为布尔值。`);
  }
}

export function validateStructuredValue<T>(value: unknown, schema: JsonSchema): T {
  assertSchema(value, schema);
  return value as T;
}

async function requestCompletion({
  instructions,
  input,
  name,
  schema,
  role,
  strict,
  maxTokens,
  timeoutMs,
}: {
  instructions: string;
  input: string;
  name: string;
  schema: JsonSchema;
  role: ModelRole;
  strict: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}) {
  const config = getProviderConfig(role);
  const requestTimeoutMs = timeoutMs ?? (role === "chat" ? 35_000 : 55_000);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: `${instructions}\n只返回 JSON，不要使用 Markdown 代码块。` },
          { role: "user", content: input },
        ],
        enable_thinking: false,
        temperature: role === "chat" ? 0.45 : 0.25,
        ...(strict ? {} : { max_tokens: maxTokens ?? (role === "gdd" ? 7200 : role === "build" ? 2200 : 1100) }),
        response_format: strict
          ? { type: "json_schema", json_schema: { name, strict: true, schema } }
          : { type: "json_object" },
      }),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AIRequestTimeoutError(requestTimeoutMs);
    }
    throw error;
  }

  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const providerError = payload.error && typeof payload.error === "object"
      ? (payload.error as { message?: unknown }).message
      : null;
    const error = new Error(typeof providerError === "string" ? providerError : `百炼请求失败（${response.status}）`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  const content = extractMessageContent(payload);
  if (!content) throw new Error("模型没有返回可解析的结构化结果。");
  return content;
}

export async function createStructuredResponse<T>({
  instructions,
  input,
  name,
  schema,
  role = "chat",
  strictSchema = true,
  repairInvalidOutput = false,
  maxTokens,
  timeoutMs,
}: {
  instructions: string;
  input: string;
  name: string;
  schema: JsonSchema;
  role?: ModelRole;
  strictSchema?: boolean;
  repairInvalidOutput?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<T> {
  const startedAt = Date.now();
  let content: string;
  let strictRejected = false;
  if (!strictSchema) {
    content = await requestCompletion({ instructions, input, name, schema, role, strict: false, maxTokens, timeoutMs });
  } else {
    try {
      content = await requestCompletion({ instructions, input, name, schema, role, strict: true, maxTokens, timeoutMs });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : null;
      if (status !== 400) throw error;
      strictRejected = true;
      console.warn(JSON.stringify({ event: "structured_output_strict_fallback", name, role, status }));
      content = await requestCompletion({ instructions, input, name, schema, role, strict: false, maxTokens, timeoutMs });
    }
  }

  try {
    const parsed = parseJson(content);
    assertSchema(parsed, schema);
    console.info(JSON.stringify({ event: "structured_output_success", name, role, strict: strictSchema && !strictRejected, strictFallback: strictRejected, repaired: false, durationMs: Date.now() - startedAt }));
    return parsed as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "unknown_validation_error";
    console.warn(JSON.stringify({ event: "structured_output_validation_failed", name, role, strictFallback: strictRejected, repairEnabled: repairInvalidOutput, reason, durationMs: Date.now() - startedAt }));
    if (!repairInvalidOutput) throw new Error("模型返回的数据没有通过安全结构校验，请重试。");
  }

  const repairInstructions = [
    "你是 JSON 格式修复器。只修复字段名、缺失字段、数据类型和 JSON 语法，使内容符合给定 Schema。",
    "不得新增、删除或改写原输出中的实质判断；无法恢复的可选内容使用空字符串或空数组。",
    `目标 JSON Schema：${JSON.stringify(schema)}`,
  ].join("\n");
  const repairedContent = await requestCompletion({
    instructions: repairInstructions,
    input: `待修复的 JSON：\n${content}`,
    name: `${name}_repair`,
    schema,
    role,
    strict: strictSchema && !strictRejected,
    maxTokens,
    timeoutMs,
  });
  try {
    const repaired = parseJson(repairedContent);
    assertSchema(repaired, schema);
    console.info(JSON.stringify({ event: "structured_output_success", name, role, strict: strictSchema && !strictRejected, strictFallback: strictRejected, repaired: true, durationMs: Date.now() - startedAt }));
    return repaired as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "unknown_validation_error";
    console.error(JSON.stringify({ event: "structured_output_repair_failed", name, role, strictFallback: strictRejected, reason, durationMs: Date.now() - startedAt }));
    throw new Error("模型两次返回的结构都不符合要求，请重试当前步骤。");
  }
}

export const coachResponseSchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    suggestedAnswer: { type: "string" },
    keyInsights: { type: "array", items: { type: "string" } },
    recommendedAction: { type: "string", enum: ["continue_discussion", "confirm_answer", "review_upstream"] },
    scopeStatus: { type: "string", enum: ["in_scope", "adjacent", "out_of_scope"] },
    parkedInsights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          suggestedQuestionId: { type: "string", enum: Array.from({ length: 23 }, (_, index) => `Q${index + 1}`) },
        },
        required: ["content", "suggestedQuestionId"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "suggestedAnswer", "keyInsights", "recommendedAction", "scopeStatus", "parkedInsights"],
  additionalProperties: false,
};

export const gameSpecSchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    objective: { type: "string" },
    playerVerb: { type: "string", enum: ["collect", "sort", "avoid", "balance"] },
    timeLimit: { type: "integer", minimum: 15, maximum: 120 },
    targetScore: { type: "integer", minimum: 100, maximum: 10000 },
    stressDrain: { type: "integer", minimum: 1, maximum: 12 },
    rewardPerAction: { type: "integer", minimum: 10, maximum: 500 },
    primaryColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    accentColor: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    itemLabels: { type: "array", items: { type: "string" } },
    progression: { type: "string" },
    experienceClaim: { type: "string" },
  },
  required: ["title", "objective", "playerVerb", "timeLimit", "targetScore", "stressDrain", "rewardPerAction", "primaryColor", "accentColor", "itemLabels", "progression", "experienceClaim"],
  additionalProperties: false,
};

export const stageSummarySchema: JsonSchema = {
  type: "object",
  properties: {
    stageId: { type: "integer", minimum: 1, maximum: 6 },
    summary: { type: "string", maxLength: 1600 },
    keyDecisions: { type: "array", maxItems: 8, items: { type: "string", maxLength: 500 } },
    openQuestions: { type: "array", maxItems: 8, items: { type: "string", maxLength: 500 } },
  },
  required: ["stageId", "summary", "keyDecisions", "openQuestions"],
  additionalProperties: false,
};

export const gddSectionSchema: JsonSchema = {
  type: "object",
  properties: {
    key: { type: "string", maxLength: 120 },
    title: { type: "string", maxLength: 240 },
    content: { type: "string", maxLength: 4000 },
    sourceQuestionIds: { type: "array", maxItems: 23, items: { type: "string", enum: Array.from({ length: 23 }, (_, index) => `Q${index + 1}`) } },
  },
  required: ["key", "title", "content", "sourceQuestionIds"],
  additionalProperties: false,
};

export const gddIssueSchema: JsonSchema = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["blocker", "warning", "suggestion"] },
    title: { type: "string", maxLength: 240 },
    evidence: { type: "string", maxLength: 1200 },
    whyItMatters: { type: "string", maxLength: 1000 },
    questionIds: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string", enum: Array.from({ length: 23 }, (_, index) => `Q${index + 1}`) },
    },
    options: { type: "array", maxItems: 2, items: { type: "string", maxLength: 600 } },
  },
  required: ["severity", "title", "evidence", "whyItMatters", "questionIds", "options"],
  additionalProperties: false,
};

export const designReviewIssueSchema: JsonSchema = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["blocker", "conflict"] },
    title: { type: "string", maxLength: 240 },
    evidence: { type: "string", maxLength: 1200 },
    whyItMatters: { type: "string", maxLength: 1000 },
    questionIds: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string", enum: Array.from({ length: 23 }, (_, index) => `Q${index + 1}`) },
    },
    options: { type: "array", minItems: 1, maxItems: 2, items: { type: "string", maxLength: 600 } },
  },
  required: ["severity", "title", "evidence", "whyItMatters", "questionIds", "options"],
  additionalProperties: false,
};

export const designReviewScanSchema: JsonSchema = {
  type: "object",
  properties: {
    issues: { type: "array", maxItems: 6, items: designReviewIssueSchema },
  },
  required: ["issues"],
  additionalProperties: false,
};

export function designReviewVerificationSchema(issueIds: string[]): JsonSchema {
  return {
    type: "object",
    properties: {
      existingIssueResults: {
        type: "array",
        minItems: issueIds.length,
        maxItems: issueIds.length,
        items: {
          type: "object",
          properties: {
            issueId: issueIds.length ? { type: "string", enum: issueIds } : { type: "string", maxLength: 120 },
            verdict: { type: "string", enum: ["resolved", "still_open", "changed"] },
            reason: { type: "string", maxLength: 800 },
            evidence: { type: "string", maxLength: 1200 },
          },
          required: ["issueId", "verdict", "reason", "evidence"],
          additionalProperties: false,
        },
      },
      newIssues: { type: "array", maxItems: 4, items: designReviewIssueSchema },
    },
    required: ["existingIssueResults", "newIssues"],
    additionalProperties: false,
  };
}

export const designReviewResponseSchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string", maxLength: 1600 },
    proposedChanges: {
      type: "array",
      maxItems: 1,
      items: {
        type: "object",
        properties: {
          targetQuestionId: { type: "string", maxLength: 8 },
          summary: { type: "string", maxLength: 240 },
          rationale: { type: "string", maxLength: 1200 },
          newContent: { type: "string", maxLength: 5000 },
        },
        required: ["targetQuestionId", "summary", "rationale", "newContent"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "proposedChanges"],
  additionalProperties: false,
};

export const gddBundleSchema: JsonSchema = {
  type: "object",
  properties: {
    stageSummaries: { type: "array", items: stageSummarySchema },
    gdd: {
      type: "object",
      properties: {
        title: { type: "string" },
        oneLinePitch: { type: "string" },
        sections: { type: "array", items: gddSectionSchema },
      },
      required: ["title", "oneLinePitch", "sections"],
      additionalProperties: false,
    },
    issues: { type: "array", items: gddIssueSchema },
  },
  required: ["stageSummaries", "gdd", "issues"],
  additionalProperties: false,
};

export const gddSummarySchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    oneLinePitch: { type: "string" },
    stageSummaries: { type: "array", items: stageSummarySchema },
  },
  required: ["title", "oneLinePitch", "stageSummaries"],
  additionalProperties: false,
};

export const gddSectionsSchema: JsonSchema = {
  type: "object",
  properties: {
    sections: { type: "array", items: gddSectionSchema },
  },
  required: ["sections"],
  additionalProperties: false,
};

export const gddFidelitySchema: JsonSchema = {
  type: "object",
  properties: {
    patches: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          sectionKey: { type: "string", enum: ["overview", "experience", "player_situation", "challenge", "core_loop", "skill", "system", "consequences", "feedback", "progression", "outcomes", "theme", "validation"] },
          revisedContent: { type: "string", maxLength: 4000 },
          sourceQuestionIds: { type: "array", maxItems: 23, items: { type: "string", enum: Array.from({ length: 23 }, (_, index) => `Q${index + 1}`) } },
          reason: { type: "string", maxLength: 600 },
        },
        required: ["sectionKey", "revisedContent", "sourceQuestionIds", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["patches"],
  additionalProperties: false,
};

export const gddIssuesSchema: JsonSchema = {
  type: "object",
  properties: {
    issues: { type: "array", maxItems: 6, items: gddIssueSchema },
  },
  required: ["issues"],
  additionalProperties: false,
};

export const gddReviewResponseSchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string", maxLength: 1600 },
    proposedChanges: {
      type: "array",
      maxItems: 1,
      items: {
        type: "object",
        properties: {
          targetType: { type: "string", enum: ["question_answer", "gdd_section"] },
          targetId: { type: "string", maxLength: 120 },
          issueIds: { type: "array", maxItems: 1, items: { type: "string", maxLength: 120 } },
          summary: { type: "string", maxLength: 240 },
          rationale: { type: "string", maxLength: 1200 },
          newContent: { type: "string", maxLength: 5000 },
        },
        required: ["targetType", "targetId", "issueIds", "summary", "rationale", "newContent"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "proposedChanges"],
  additionalProperties: false,
};
