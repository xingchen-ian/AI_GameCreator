import { getDb } from "@/db";
import { modelCalls } from "@/db/schema";
import { requiredGddCoverageTags } from "@/lib/design/gdd";
import type { ModelContextStats } from "@/lib/server/model-context";
import { allQuestions } from "@/lib/protocol/stages";

type JsonSchema = Record<string, unknown>;
export type ModelPurpose =
  | "coach_turn"
  | "pre_answer"
  | "candidate"
  | "conversation_summary"
  | "question_memory"
  | "answer_review"
  | "design_review"
  | "gdd"
  | "build";
type TokenUsage = { inputTokens: number | null; outputTokens: number | null };
type ModelAttemptPhase = "primary_strict" | "primary_json" | "strict_fallback" | "repair";
type ModelAttemptSnapshot = {
  sequence: number;
  phase: ModelAttemptPhase;
  requestedAt: string;
  durationMs: number;
  endpoint: string;
  request: Record<string, unknown>;
  httpStatus: number | null;
  responseBody: string;
  error: string | null;
};
type AttemptError = Error & { status?: number; attemptSnapshot?: ModelAttemptSnapshot };
const protocolQuestionIds = allQuestions.map((question) => question.id);

export type ModelCallMeta = {
  model: string;
  appVersion: string;
  promptVersion: string;
  schemaVersion: string;
  temperature: number;
  thinkingEnabled: boolean;
  outcome: "success" | "repaired" | "failed";
  strictFallback: boolean;
  durationMs: number;
} & TokenUsage;

export class AIConfigurationError extends Error {
  constructor(missing: string[]) {
    super(`真实 AI 尚未配置。请设置服务端环境变量：${missing.join("、")}。`);
    this.name = "AIConfigurationError";
  }
}

export class AIRequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`模型在 ${Math.round(timeoutMs / 1000)} 秒内没有完成当前步骤，请重试。`);
    this.name = "AIRequestTimeoutError";
  }
}

const purposeModelEnvironment: Record<ModelPurpose, string> = {
  coach_turn: "DASHSCOPE_COACH_TURN_MODEL",
  pre_answer: "DASHSCOPE_PRE_ANSWER_MODEL",
  candidate: "DASHSCOPE_CANDIDATE_MODEL",
  conversation_summary: "DASHSCOPE_CONVERSATION_SUMMARY_MODEL",
  question_memory: "DASHSCOPE_QUESTION_MEMORY_MODEL",
  answer_review: "DASHSCOPE_ANSWER_REVIEW_MODEL",
  design_review: "DASHSCOPE_DESIGN_REVIEW_MODEL",
  gdd: "DASHSCOPE_GDD_MODEL",
  build: "DASHSCOPE_BUILD_MODEL",
};

function getProviderConfig(purpose: ModelPurpose) {
  const missing: string[] = [];
  const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
  const baseUrl = process.env.DASHSCOPE_BASE_URL?.trim().replace(/\/$/, "");
  const modelEnvironment = purposeModelEnvironment[purpose];
  const model = process.env[modelEnvironment]?.trim();
  if (!apiKey) missing.push("DASHSCOPE_API_KEY");
  if (!baseUrl) missing.push("DASHSCOPE_BASE_URL");
  if (!model) missing.push(modelEnvironment);
  if (missing.length) throw new AIConfigurationError(missing);

  return {
    apiKey: apiKey!,
    baseUrl: baseUrl!,
    model: model!,
    temperature: purpose === "coach_turn" ? 0.45 : purpose === "candidate" ? 0.35 : 0.25,
    // 百炼在 enable_thinking=true 时拒绝 JSON 模式和非流式调用（400 InvalidParameter），
    // 而所有结构化请求都是非流式 + response_format，因此各角色都必须关闭思考。
    thinkingEnabled: false,
    appVersion: process.env.APP_COMMIT?.trim() || process.env.GIT_COMMIT_SHA?.trim() || "local-dev",
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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Only renames known Assessment aliases and removes unused keys; it never changes a model decision. */
export function normalizeCoachAssessment(value: unknown): unknown {
  const source = objectValue(value);
  const rawReady = source.ready ?? source.readiness ?? source.status;
  const ready = typeof rawReady === "boolean"
    ? rawReady
    : rawReady === "ready"
      ? true
      : rawReady === "not_ready"
        ? false
        : rawReady;
  return {
    ready,
    summary: source.summary ?? source.readinessReason ?? source.reasoning,
    missingElements: source.missingElements,
    parkedInsights: source.parkedInsights ?? [],
  };
}

/** Some DashScope models call Pre-answer coverage `status` despite a strict schema. */
export function normalizePreAnswerResult(value: unknown): unknown {
  const source = objectValue(value);
  return {
    coverage: source.coverage ?? source.status,
    summary: source.summary ?? source.reasoning,
    missingElements: source.missingElements,
    reply: source.reply,
    suggestedAnswer: source.suggestedAnswer,
  };
}

/** DashScope may accept strict JSON Schema while still renaming `ready` or
 * returning non-object cross-question entries. Keep the useful response, apply
 * only deterministic aliases/defaults, and let the local Schema remain the
 * security boundary. */
export function normalizeCoachTurnResult(value: unknown): unknown {
  const source = objectValue(value);
  const rawReady = source.ready ?? source.isReady ?? source.readiness ?? source.status;
  const ready = typeof rawReady === "boolean"
    ? rawReady
    : rawReady === "ready"
      ? true
      : rawReady === "not_ready"
        ? false
        : rawReady;
  const issues = Array.isArray(source.crossQuestionIssues)
    ? source.crossQuestionIssues.filter((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const issue = item as Record<string, unknown>;
      return typeof issue.questionId === "string"
        && protocolQuestionIds.includes(issue.questionId)
        && (issue.type === "possible_update" || issue.type === "conflict")
        && typeof issue.explanation === "string"
        && (issue.recommendedEditTarget === "current" || issue.recommendedEditTarget === "previous" || issue.recommendedEditTarget === "either")
        && typeof issue.suggestedRevision === "string";
    })
    : [];
  return {
    ready,
    decisionReason: source.decisionReason ?? source.reason ?? source.summary,
    reply: source.reply,
    suggestedAnswer: ready === false ? "" : source.suggestedAnswer,
    crossQuestionIssues: issues,
  };
}

async function requestCompletion({
  instructions,
  input,
  name,
  schema,
  purpose,
  strict,
  maxTokens,
  timeoutMs,
  phase,
}: {
  instructions: string;
  input: string;
  name: string;
  schema: JsonSchema;
  purpose: ModelPurpose;
  strict: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  phase: ModelAttemptPhase;
}) {
  const config = getProviderConfig(purpose);
  const requestTimeoutMs = timeoutMs ?? (["coach_turn", "pre_answer", "conversation_summary", "question_memory"].includes(purpose) ? 35_000 : 55_000);
  const endpoint = `${config.baseUrl}/chat/completions`;
  const requestedAt = new Date().toISOString();
  const startedAt = Date.now();
  const requestBody: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: `${instructions}\n只返回 JSON，不要使用 Markdown 代码块。` },
      { role: "user", content: input },
    ],
    enable_thinking: config.thinkingEnabled,
    temperature: config.temperature,
    ...(strict ? {} : { max_tokens: maxTokens ?? (purpose === "gdd" ? 7200 : ["answer_review", "design_review"].includes(purpose) ? 2600 : ["candidate", "question_memory", "build"].includes(purpose) ? 2200 : 1100) }),
    response_format: strict
      ? { type: "json_schema", json_schema: { name, strict: true, schema } }
      : { type: "json_object" },
  };
  const snapshot = (httpStatus: number | null, responseBody: string, error: string | null): ModelAttemptSnapshot => ({
    sequence: 0,
    phase,
    requestedAt,
    durationMs: Date.now() - startedAt,
    endpoint,
    request: requestBody,
    httpStatus,
    responseBody,
    error,
  });
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    const finalError: AttemptError = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      ? new AIRequestTimeoutError(requestTimeoutMs)
      : error instanceof Error ? error : new Error("模型请求失败。");
    finalError.attemptSnapshot = snapshot(null, "", finalError.message);
    throw finalError;
  }

  let responseBody = "";
  try {
    responseBody = await response.text();
  } catch (error) {
    const finalError = (error instanceof Error ? error : new Error("无法读取模型响应。")) as AttemptError;
    finalError.attemptSnapshot = snapshot(response.status, responseBody, finalError.message);
    throw finalError;
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    const error = new Error("模型服务返回了无法解析的响应。") as AttemptError;
    error.status = response.status;
    error.attemptSnapshot = snapshot(response.status, responseBody, error.message);
    throw error;
  }
  const attemptSnapshot = snapshot(response.status, responseBody, null);
  if (!response.ok) {
    const providerError = payload.error && typeof payload.error === "object"
      ? (payload.error as { message?: unknown }).message
      : null;
    const error = new Error(typeof providerError === "string" ? providerError : `百炼请求失败（${response.status}）`) as AttemptError;
    error.status = response.status;
    error.attemptSnapshot = { ...attemptSnapshot, error: error.message };
    throw error;
  }
  const content = extractMessageContent(payload);
  if (!content) {
    const error = new Error("模型没有返回可解析的结构化结果。") as AttemptError;
    error.attemptSnapshot = { ...attemptSnapshot, error: error.message };
    throw error;
  }
  const usage = payload.usage && typeof payload.usage === "object" ? payload.usage as { prompt_tokens?: unknown; completion_tokens?: unknown } : {};
  return {
    content,
    model: config.model,
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
    attemptSnapshot,
  };
}

function addUsage(total: TokenUsage, next: TokenUsage): TokenUsage {
  return {
    inputTokens: total.inputTokens === null && next.inputTokens === null ? null : (total.inputTokens ?? 0) + (next.inputTokens ?? 0),
    outputTokens: total.outputTokens === null && next.outputTokens === null ? null : (total.outputTokens ?? 0) + (next.outputTokens ?? 0),
  };
}

// 研究数据记录不能影响主流程：写入失败只打日志。
async function recordModelCall(projectId: string | undefined, operation: string, purpose: ModelPurpose, meta: ModelCallMeta, attempts: ModelAttemptSnapshot[], contextStats?: ModelContextStats) {
  try {
    await getDb().insert(modelCalls).values({
      id: crypto.randomUUID(),
      projectId: projectId ?? null,
      operation,
      role: purpose,
      model: meta.model,
      appVersion: meta.appVersion,
      promptVersion: meta.promptVersion,
      schemaVersion: meta.schemaVersion,
      temperature: meta.temperature,
      thinkingEnabled: meta.thinkingEnabled,
      outcome: meta.outcome,
      strictFallback: meta.strictFallback,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      contextStrategy: contextStats?.strategy ?? "unknown",
      includedAnswerCount: contextStats?.includedAnswerCount ?? 0,
      includedMessageCount: contextStats?.includedMessageCount ?? 0,
      estimatedContextTokens: contextStats?.estimatedTokens ?? 0,
      contextTruncated: contextStats?.truncated ?? false,
      durationMs: meta.durationMs,
      attemptsJson: JSON.stringify(attempts),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(JSON.stringify({ event: "model_call_record_failed", operation, reason: error instanceof Error ? error.message.slice(0, 240) : "unknown" }));
  }
}

type StructuredRequest = {
  instructions: string;
  input: string;
  name: string;
  /** 人工维护的提示词版本；提示词语义变化时必须递增。 */
  promptVersion: string;
  /** 本次结构化输出契约版本；字段或约束变化时必须递增。 */
  schemaVersion: string;
  schema: JsonSchema;
  purpose: ModelPurpose;
  strictSchema?: boolean;
  repairInvalidOutput?: boolean;
  maxTokens?: number;
  timeoutMs?: number;
  /** 写入 model_calls 时关联的项目；不提供时仍会记录，但不关联项目。 */
  projectId?: string;
  /** 记录本次请求使用的上下文策略和组成，供成本实验分析。 */
  contextStats?: ModelContextStats;
  /** Assessment 等少数合同的确定性字段别名归一化；必须在本地 Schema 校验前执行。 */
  normalizeResult?: (value: unknown) => unknown;
};

export async function createStructuredResponse<T>(request: StructuredRequest): Promise<T> {
  return (await createStructuredResponseWithMeta<T>(request)).result;
}

export async function createStructuredResponseWithMeta<T>({
  instructions,
  input,
  name,
  promptVersion,
  schemaVersion,
  schema,
  purpose,
  strictSchema = true,
  repairInvalidOutput = false,
  maxTokens,
  timeoutMs,
  projectId,
  contextStats,
  normalizeResult,
}: StructuredRequest): Promise<{ result: T; meta: ModelCallMeta }> {
  const startedAt = Date.now();
  const config = getProviderConfig(purpose);
  const model = config.model;
  let usage: TokenUsage = { inputTokens: null, outputTokens: null };
  let strictRejected = false;
  const attempts: ModelAttemptSnapshot[] = [];
  const finish = async (outcome: ModelCallMeta["outcome"]) => {
    const meta: ModelCallMeta = {
      model,
      appVersion: config.appVersion,
      promptVersion,
      schemaVersion,
      temperature: config.temperature,
      thinkingEnabled: config.thinkingEnabled,
      outcome,
      strictFallback: strictRejected,
      durationMs: Date.now() - startedAt,
      ...usage,
    };
    await recordModelCall(projectId, name, purpose, meta, attempts, contextStats);
    return meta;
  };
  const complete = async (options: Parameters<typeof requestCompletion>[0]) => {
    try {
      const response = await requestCompletion(options);
      attempts.push({ ...response.attemptSnapshot, sequence: attempts.length + 1 });
      usage = addUsage(usage, response);
      return response.content;
    } catch (error) {
      const attempt = error && typeof error === "object" && "attemptSnapshot" in error
        ? (error as AttemptError).attemptSnapshot
        : undefined;
      if (attempt) attempts.push({ ...attempt, sequence: attempts.length + 1 });
      throw error;
    }
  };

  try {
    let content: string;
    if (!strictSchema) {
      content = await complete({ instructions, input, name, schema, purpose, strict: false, maxTokens, timeoutMs, phase: "primary_json" });
    } else {
      try {
        content = await complete({ instructions, input, name, schema, purpose, strict: true, maxTokens, timeoutMs, phase: "primary_strict" });
      } catch (error) {
        const status = error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : null;
        if (status !== 400) throw error;
        strictRejected = true;
        console.warn(JSON.stringify({ event: "structured_output_strict_fallback", name, purpose, status }));
        content = await complete({ instructions, input, name, schema, purpose, strict: false, maxTokens, timeoutMs, phase: "strict_fallback" });
      }
    }

    try {
      const parsed = normalizeResult ? normalizeResult(parseJson(content)) : parseJson(content);
      assertSchema(parsed, schema);
      console.info(JSON.stringify({ event: "structured_output_success", name, purpose, strict: strictSchema && !strictRejected, strictFallback: strictRejected, repaired: false, durationMs: Date.now() - startedAt }));
      return { result: parsed as T, meta: await finish("success") };
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 240) : "unknown_validation_error";
      console.warn(JSON.stringify({ event: "structured_output_validation_failed", name, purpose, strictFallback: strictRejected, repairEnabled: repairInvalidOutput, reason, durationMs: Date.now() - startedAt }));
      if (!repairInvalidOutput) throw new Error("模型返回的数据没有通过安全结构校验，请重试。");
    }

    const repairInstructions = [
      "你是 JSON 格式修复器。只修复字段名、缺失字段、数据类型和 JSON 语法，使内容符合给定 Schema。",
      "不得新增、删除或改写原输出中的实质判断；无法恢复的可选内容使用空字符串或空数组。",
      `目标 JSON Schema：${JSON.stringify(schema)}`,
    ].join("\n");
    const repairedContent = await complete({
      instructions: repairInstructions,
      input: `待修复的 JSON：\n${content}`,
      name: `${name}_repair`,
      schema,
      purpose,
      strict: strictSchema && !strictRejected,
      maxTokens,
      timeoutMs,
      phase: "repair",
    });
    try {
      const repaired = normalizeResult ? normalizeResult(parseJson(repairedContent)) : parseJson(repairedContent);
      assertSchema(repaired, schema);
      console.info(JSON.stringify({ event: "structured_output_success", name, purpose, strict: strictSchema && !strictRejected, strictFallback: strictRejected, repaired: true, durationMs: Date.now() - startedAt }));
      return { result: repaired as T, meta: await finish("repaired") };
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 240) : "unknown_validation_error";
      console.error(JSON.stringify({ event: "structured_output_repair_failed", name, purpose, strictFallback: strictRejected, reason, durationMs: Date.now() - startedAt }));
      throw new Error("模型两次返回的结构都不符合要求，请重试当前步骤。");
    }
  } catch (error) {
    await finish("failed");
    throw error;
  }
}

export const answerSynthesisSchema: JsonSchema = {
  type: "object",
  properties: {
    suggestedAnswer: { type: "string", maxLength: 5000 },
    parkedInsights: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          suggestedQuestionId: { type: "string", enum: protocolQuestionIds },
        },
        required: ["content", "suggestedQuestionId"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestedAnswer", "parkedInsights"],
  additionalProperties: false,
};

export const coachAssessmentSchema: JsonSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    summary: { type: "string" },
    missingElements: { type: "array", items: { type: "string" } },
    parkedInsights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          suggestedQuestionId: { type: "string", enum: protocolQuestionIds },
        },
        required: ["content", "suggestedQuestionId"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "ready",
    "summary",
    "missingElements",
    "parkedInsights",
  ],
  additionalProperties: false,
};

export const scaffoldingReplySchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string", maxLength: 600 },
  },
  required: ["reply"],
  additionalProperties: false,
};

export const candidateTurnReplySchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string", maxLength: 600 },
    suggestedAnswer: { type: "string", maxLength: 5000 },
  },
  required: ["reply", "suggestedAnswer"],
  additionalProperties: false,
};

export const coachTurnSchema: JsonSchema = {
  type: "object",
  properties: {
    ready: { type: "boolean" },
    decisionReason: { type: "string", maxLength: 800 },
    reply: { type: "string", maxLength: 1800 },
    suggestedAnswer: { type: "string", maxLength: 5000 },
    crossQuestionIssues: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          questionId: { type: "string", enum: protocolQuestionIds },
          type: { type: "string", enum: ["possible_update", "conflict"] },
          explanation: { type: "string", maxLength: 900 },
          recommendedEditTarget: { type: "string", enum: ["current", "previous", "either"] },
          suggestedRevision: { type: "string", maxLength: 5000 },
        },
        required: ["questionId", "type", "explanation", "recommendedEditTarget", "suggestedRevision"],
        additionalProperties: false,
      },
    },
  },
  required: ["ready", "decisionReason", "reply", "suggestedAnswer", "crossQuestionIssues"],
  additionalProperties: false,
};

export const preAnswerSchema: JsonSchema = {
  type: "object",
  properties: {
    coverage: { type: "string", enum: ["complete", "partial", "empty"] },
    summary: { type: "string" },
    missingElements: { type: "array", items: { type: "string" } },
    reply: { type: "string", maxLength: 1800 },
    suggestedAnswer: { type: "string", maxLength: 5000 },
  },
  required: ["coverage", "summary", "missingElements", "reply", "suggestedAnswer"],
  additionalProperties: false,
};

export const workingConversationSummarySchema: JsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", maxLength: 2400 },
    userIdeas: { type: "array", maxItems: 12, items: { type: "string", maxLength: 500 } },
    aiSuggestions: { type: "array", maxItems: 12, items: { type: "string", maxLength: 500 } },
    acceptedSuggestions: { type: "array", maxItems: 10, items: { type: "string", maxLength: 500 } },
    rejectedSuggestions: { type: "array", maxItems: 10, items: { type: "string", maxLength: 500 } },
    unresolved: { type: "array", maxItems: 10, items: { type: "string", maxLength: 500 } },
    currentFocus: { type: "string", maxLength: 800 },
  },
  required: ["summary", "userIdeas", "aiSuggestions", "acceptedSuggestions", "rejectedSuggestions", "unresolved", "currentFocus"],
  additionalProperties: false,
};

export const answerRequirementReviewSchema: JsonSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["passed", "needs_revision"] },
    feedback: { type: "string", maxLength: 1200 },
    satisfiedElements: { type: "array", maxItems: 8, items: { type: "string", maxLength: 500 } },
    missingElements: { type: "array", maxItems: 6, items: { type: "string", maxLength: 500 } },
  },
  required: ["status", "feedback", "satisfiedElements", "missingElements"],
  additionalProperties: false,
};

export const answerConflictReviewSchema: JsonSchema = {
  type: "object",
  properties: {
    hasConflict: { type: "boolean" },
    summary: { type: "string", maxLength: 1400 },
    conflicts: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          questionId: { type: "string", enum: protocolQuestionIds },
          explanation: { type: "string", maxLength: 900 },
          recommendation: { type: "string", maxLength: 900 },
          recommendedEditTarget: { type: "string", enum: ["current", "previous", "either"] },
          suggestedRevision: { type: "string", maxLength: 5000 },
        },
        required: ["questionId", "explanation", "recommendation", "recommendedEditTarget", "suggestedRevision"],
        additionalProperties: false,
      },
    },
  },
  required: ["hasConflict", "summary", "conflicts"],
  additionalProperties: false,
};

export const questionMemorySchema: JsonSchema = {
  type: "object",
  properties: {
    memoryText: { type: "string", minLength: 1, maxLength: 5000 },
  },
  required: ["memoryText"],
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
    sourceQuestionIds: { type: "array", maxItems: protocolQuestionIds.length, items: { type: "string", enum: protocolQuestionIds } },
    coverageTags: { type: "array", minItems: 1, maxItems: requiredGddCoverageTags.length, uniqueItems: true, items: { type: "string", enum: requiredGddCoverageTags } },
  },
  required: ["key", "title", "content", "sourceQuestionIds", "coverageTags"],
  additionalProperties: false,
};

export const gddOutlineSectionSchema: JsonSchema = {
  type: "object",
  properties: {
    key: { type: "string", minLength: 2, maxLength: 40, pattern: "^[a-z][a-z0-9_]+$" },
    title: { type: "string", minLength: 2, maxLength: 80 },
    purpose: { type: "string", minLength: 2, maxLength: 500 },
    coverageTags: { type: "array", minItems: 1, maxItems: requiredGddCoverageTags.length, uniqueItems: true, items: { type: "string", enum: requiredGddCoverageTags } },
    sourceQuestionIds: { type: "array", minItems: 1, maxItems: protocolQuestionIds.length, uniqueItems: true, items: { type: "string", enum: protocolQuestionIds } },
  },
  required: ["key", "title", "purpose", "coverageTags", "sourceQuestionIds"],
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
      items: { type: "string", enum: protocolQuestionIds },
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
      items: { type: "string", enum: protocolQuestionIds },
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

export const gddOutlineSchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 240 },
    oneLinePitch: { type: "string", minLength: 1, maxLength: 1000 },
    stageSummaries: { type: "array", minItems: 6, maxItems: 6, items: stageSummarySchema },
    sections: { type: "array", minItems: 5, maxItems: 10, items: gddOutlineSectionSchema },
  },
  required: ["title", "oneLinePitch", "stageSummaries", "sections"],
  additionalProperties: false,
};

export function gddSectionBatchSchema(sectionKeys: string[]): JsonSchema {
  return {
    type: "object",
    properties: {
      sections: {
        type: "array",
        minItems: sectionKeys.length,
        maxItems: sectionKeys.length,
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: sectionKeys },
            content: { type: "string", minLength: 1, maxLength: 4000 },
            sourceQuestionIds: { type: "array", minItems: 1, maxItems: protocolQuestionIds.length, uniqueItems: true, items: { type: "string", enum: protocolQuestionIds } },
          },
          required: ["key", "content", "sourceQuestionIds"],
          additionalProperties: false,
        },
      },
    },
    required: ["sections"],
    additionalProperties: false,
  };
}

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
          sourceQuestionIds: { type: "array", maxItems: protocolQuestionIds.length, items: { type: "string", enum: protocolQuestionIds } },
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

export function gddFidelitySchemaForSections(sectionKeys: string[]): JsonSchema {
  const patches = (gddFidelitySchema.properties as Record<string, JsonSchema>).patches;
  const items = patches.items as JsonSchema;
  const properties = items.properties as Record<string, JsonSchema>;
  return {
    ...gddFidelitySchema,
    properties: {
      patches: {
        ...patches,
        items: {
          ...items,
          properties: {
            ...properties,
            sectionKey: { type: "string", enum: sectionKeys },
          },
        },
      },
    },
  };
}

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
