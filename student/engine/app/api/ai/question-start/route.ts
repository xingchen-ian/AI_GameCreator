import { and, asc, eq } from "drizzle-orm";
import { after } from "next/server";
import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { runSqliteBatch } from "@/db/batch";
import { aiSuggestions, messages } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { starterForQuestion } from "@/lib/protocol/question-starter";
import {
  AIConfigurationError,
  createStructuredResponseWithMeta,
  normalizePreAnswerResult,
  preAnswerSchema,
} from "@/lib/server/model-provider";
import { processBackgroundJobs } from "@/lib/server/background-jobs";
import { buildConfirmedAnswerContext, estimateTokens, loadQuestionMemoryContext } from "@/lib/server/model-context";
import { buildQuestionContractText } from "@/lib/server/question-contract";
import { loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

type PreAnswerResult = {
  coverage: "complete" | "partial" | "empty";
  summary: string;
  missingElements: string[];
  reply: string;
  suggestedAnswer: string;
};

function joinDesignEvidence(memoryText: string, memoryCount: number, fallbackText: string, fallbackCount: number) {
  return [
    memoryCount ? `此前题目的 Question Memory：\n${memoryText}` : "",
    fallbackCount ? `尚未生成 Question Memory 的确认答案回退：\n${fallbackText}` : "",
  ].filter(Boolean).join("\n\n") || "尚无可复用的已确认设计信息";
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string };
    const question = allQuestions.find((item) => item.id === body.questionId);
    if (!body.projectId || !question) return Response.json({ error: "请求内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    after(async () => {
      await processBackgroundJobs({ projectId: project.id, limit: 2 }).catch((error) => {
        console.warn(JSON.stringify({ event: "background_job_drain_failed", projectId: project.id, reason: error instanceof Error ? error.message.slice(0, 240) : "unknown" }));
      });
    });

    const db = getDb();
    const existingMessages = await db.select({ id: messages.id }).from(messages).where(and(
      eq(messages.projectId, project.id),
      eq(messages.questionId, question.id),
    )).orderBy(asc(messages.createdAt), asc(messages.id)).limit(1);
    if (existingMessages.length) return Response.json({ created: false });

    const snapshot = await loadAnswerSnapshot(project.id);
    const confirmedAnswers = Object.values(snapshot).filter((answer) => answer.status === "confirmed");
    if (confirmedAnswers.length === 0) {
      const createdAt = new Date().toISOString();
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        text: starterForQuestion(question),
        createdAt,
      };
      const suggestionId = crypto.randomUUID();
      const structuredData = {
        recommendedAction: "continue_discussion",
        scopeStatus: "in_scope",
        parkedInsights: [],
        preAnswer: {
          coverage: "empty",
          summary: "项目中还没有可复用的已确认设计信息。",
          missingElements: [],
          canFormCandidate: false,
          source: "deterministic_empty_start",
        },
      };
      runSqliteBatch(db, [
        db.insert(messages).values({
          id: assistantMessage.id,
          projectId: project.id,
          questionId: question.id,
          role: "assistant",
          content: assistantMessage.text,
          createdAt,
        }),
        db.insert(aiSuggestions).values({
          id: suggestionId,
          projectId: project.id,
          questionId: question.id,
          source: "initial",
          messageId: assistantMessage.id,
          suggestedAnswer: "",
          structuredJson: JSON.stringify(structuredData),
          model: null,
          createdAt,
        }),
      ]);
      return Response.json({
        created: true,
        assistantMessage,
        suggestion: { id: suggestionId, answer: "", structuredData },
      });
    }

    const contractText = buildQuestionContractText(question);
    const memoryContext = await loadQuestionMemoryContext(project.id, snapshot, question.id);
    const fallbackContext = buildConfirmedAnswerContext(snapshot, {
      excludeQuestionId: question.id,
      excludeQuestionIds: memoryContext.includedQuestionIds,
    });
    const allEvidenceText = joinDesignEvidence(
      memoryContext.text,
      memoryContext.includedQuestionIds.length,
      fallbackContext.text,
      fallbackContext.includedQuestionIds.length,
    );
    const allEvidenceIds = [...new Set([...memoryContext.includedQuestionIds, ...fallbackContext.includedQuestionIds])];

    const { result: preAnswer, meta } = await createStructuredResponseWithMeta<PreAnswerResult>({
      name: "game_design_pre_answer",
      promptVersion: "pre-answer-v3",
      schemaVersion: "pre-answer-v3",
      projectId: project.id,
      purpose: "pre_answer",
      repairInvalidOutput: true,
      normalizeResult: normalizePreAnswerResult,
      contextStats: {
        strategy: "pre-answer-all-question-memories-v1",
        includedAnswerCount: allEvidenceIds.length,
        includedMessageCount: 0,
        estimatedTokens: estimateTokens(contractText) + estimateTokens(allEvidenceText),
        truncated: false,
      },
      schema: preAnswerSchema,
      instructions: [
        "你执行新题目的单次 Pre-answer。当前题尚未开始新对话，这不是用户发消息后的 Readiness Assessment。",
        "读取此前所有题目的整体 Question Memory，以及尚未生成 Memory 时提供的确认答案回退；同时完成覆盖判断并生成用户打开当前题时看到的第一条消息。",
        "complete 仅表示无需替用户新增关键决定即可形成忠实 Candidate Answer；partial 表示已有可复用信息但仍缺关键决定；empty 表示几乎没有可用证据。",
        "AI 曾提出但用户未确认的建议不能作为证据。明确拒绝的方向只能用于避免重复建议，不能写入候选答案。",
        "summary 用一句简短中文概括判断依据。complete 时 missingElements 必须为空数组；其他状态只列真正阻止完整填写的关键缺口。",
        "不要因为可选细节缺失而阻止 complete，不要要求超出当前题范围的决定。",
        "complete：reply 简短说明答案依据，并标出所引用的已确认题号；suggestedAnswer 给出只回答当前题的完整候选答案，不再提出阻塞性问题。",
        "partial：suggestedAnswer 必须为空；reply 先承接已经确认的相关信息并标出来源题号，再只针对最关键缺口提出一个问题。",
        "empty：suggestedAnswer 必须为空；reply 直接提出一个合适的起始问题。",
        "必须明确区分“此前题目已经确认的信息”和“你现在提供的可选建议”。不得把 AI 曾提出但用户未采用的内容写成确认事实。",
        "不要显示内部评分、JSON 字段或 coverage 标签。不要替用户新增未经确认的设计决定。",
      ].join("\n"),
      input: `${contractText}\n\n此前题目记忆：\n${allEvidenceText}`,
    });

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      text: preAnswer.reply,
      createdAt: new Date().toISOString(),
    };
    const suggestionId = crypto.randomUUID();
    const canFormCandidate = preAnswer.coverage === "complete";
    const suggestedAnswer = canFormCandidate ? preAnswer.suggestedAnswer.trim() : "";
    const recommendedAction = canFormCandidate && suggestedAnswer ? "confirm_answer" : "continue_discussion";
    const structuredData = {
      recommendedAction,
      scopeStatus: "in_scope",
      parkedInsights: [],
      preAnswer: { coverage: preAnswer.coverage, summary: preAnswer.summary, missingElements: preAnswer.missingElements, canFormCandidate },
    };
    runSqliteBatch(db, [
      db.insert(messages).values({
        id: assistantMessage.id,
        projectId: project.id,
        questionId: question.id,
        role: "assistant",
        content: assistantMessage.text,
        createdAt: assistantMessage.createdAt,
      }),
      db.insert(aiSuggestions).values({
        id: suggestionId,
        projectId: project.id,
        questionId: question.id,
        source: "initial",
        messageId: assistantMessage.id,
        suggestedAnswer,
        structuredJson: JSON.stringify(structuredData),
        model: meta.model,
        createdAt: assistantMessage.createdAt,
      }),
    ]);

    return Response.json({
      created: true,
      assistantMessage,
      suggestion: { id: suggestionId, answer: suggestedAnswer, structuredData },
    });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "无法初始化当前问题。", configurationRequired: status === 503 }, { status });
  }
}
