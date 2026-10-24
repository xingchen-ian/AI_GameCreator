import { and, desc, eq } from "drizzle-orm";
import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { answerSubmissionReviews, messages } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { getQuestionScope } from "@/lib/protocol/question-scope";
import { describeQuestionReadiness } from "@/lib/protocol/question-readiness";
import {
  AIConfigurationError,
  answerConflictReviewSchema,
  answerRequirementReviewSchema,
  createStructuredResponseWithMeta,
} from "@/lib/server/model-provider";
import { answerSnapshotKey, designStateText } from "@/lib/server/design-review";
import { loadAnswerSnapshot, requireOwnedProject } from "@/lib/server/workspace";

type RequirementReview = {
  status: "passed" | "needs_revision";
  feedback: string;
  satisfiedElements: string[];
  missingElements: string[];
};

type Conflict = {
  questionId: string;
  explanation: string;
  recommendation: string;
  recommendedEditTarget: "current" | "previous" | "either";
  suggestedRevision: string;
};

type ConflictReview = {
  hasConflict: boolean;
  summary: string;
  conflicts: Conflict[];
};

async function fingerprint(value: string) {
  const data = new TextEncoder().encode(value.trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function appendAssistantMessage(projectId: string, questionId: string, content: string) {
  const message = { id: crypto.randomUUID(), role: "assistant" as const, text: content, createdAt: new Date().toISOString() };
  await getDb().insert(messages).values({ id: message.id, projectId, questionId, role: "assistant", content, createdAt: message.createdAt });
  return message;
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "请先登录。" }, { status: 401 });
    const body = await request.json() as { projectId?: string; questionId?: string; answer?: string; reviewId?: string };
    const question = allQuestions.find((item) => item.id === body.questionId);
    const answer = body.answer?.trim() ?? "";
    if (!body.projectId || !question || !answer || answer.length > 5000) return Response.json({ error: "提交内容无效。" }, { status: 400 });
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    const snapshot = await loadAnswerSnapshot(project.id);
    const currentSnapshotKey = answerSnapshotKey(snapshot);
    const answerFingerprint = await fingerprint(answer);
    const db = getDb();

    const previousRows = body.reviewId
      ? await db.select().from(answerSubmissionReviews).where(and(
        eq(answerSubmissionReviews.id, body.reviewId),
        eq(answerSubmissionReviews.projectId, project.id),
        eq(answerSubmissionReviews.questionId, question.id),
      )).limit(1)
      : await db.select().from(answerSubmissionReviews).where(and(
        eq(answerSubmissionReviews.projectId, project.id),
        eq(answerSubmissionReviews.questionId, question.id),
        eq(answerSubmissionReviews.answerFingerprint, answerFingerprint),
        eq(answerSubmissionReviews.designSnapshotKey, currentSnapshotKey),
        eq(answerSubmissionReviews.requirementStatus, "passed"),
        eq(answerSubmissionReviews.conflictStatus, "conflict"),
      )).orderBy(desc(answerSubmissionReviews.createdAt)).limit(1);
    const previous = previousRows[0];
    if (previous
      && previous.conflictStatus === "conflict"
      && previous.requirementStatus === "passed"
      && previous.answerFingerprint === answerFingerprint
      && previous.designSnapshotKey === currentSnapshotKey
      && !previous.confirmedAt) {
      const now = new Date().toISOString();
      await db.update(answerSubmissionReviews).set({ confirmedAt: now }).where(eq(answerSubmissionReviews.id, previous.id));
      return Response.json({ status: "passed", override: true, reviewId: previous.id });
    }

    const scope = getQuestionScope(question.id);
    const readinessContract = describeQuestionReadiness(question.id);
    const { result: requirement } = await createStructuredResponseWithMeta<RequirementReview>({
      name: "game_design_answer_requirement_review",
      promptVersion: "answer-requirement-review-v1",
      schemaVersion: "answer-requirement-review-v1",
      projectId: project.id,
      schema: answerRequirementReviewSchema,
      purpose: "answer_review",
      instructions: [
        "你进行一次宽松的单题提交审查，只判断用户提交的文本是否直接回答当前题并满足最低完成证据。",
        "不要追求完美、细节数量或文风。可选改进、有意保留的模糊性、尚未讨论的后续问题都不能导致失败。",
        "只有答案明显跑题，或缺少一个会导致本题无法成立的核心要素时，才返回 needs_revision。",
        "needs_revision 的 feedback 只解释最关键的一个缺口，并用自然中文邀请用户补充；不要替用户补写决定。",
      ].join("\n"),
      input: `当前问题：${question.id} ${question.prompt}\n本题范围：${scope.focus}\n本题不要决定：${scope.defer}\n${readinessContract}\n\n用户准备提交的答案：\n${answer}`,
    });

    if (requirement.status === "needs_revision") {
      const reviewId = crypto.randomUUID();
      const assistantMessage = await appendAssistantMessage(project.id, question.id, requirement.feedback);
      await db.insert(answerSubmissionReviews).values({
        id: reviewId,
        projectId: project.id,
        questionId: question.id,
        answerFingerprint,
        designSnapshotKey: currentSnapshotKey,
        requirementStatus: "needs_revision",
        conflictStatus: "clear",
        feedback: requirement.feedback,
        conflictsJson: "[]",
        createdAt: assistantMessage.createdAt,
      });
      return Response.json({ status: "needs_revision", reviewId, assistantMessage, feedback: requirement.feedback });
    }

    // Unconfirmed drafts are not design decisions yet, so they must not trigger conflicts.
    const otherAnswers = Object.fromEntries(Object.entries(snapshot).filter(([id, item]) => id !== question.id && item.status === "confirmed"));
    const { result: conflictReview } = await createStructuredResponseWithMeta<ConflictReview>({
      name: "game_design_incremental_conflict_review",
      promptVersion: "incremental-conflict-review-v1",
      schemaVersion: "answer-conflict-review-v1",
      projectId: project.id,
      schema: answerConflictReviewSchema,
      purpose: "answer_review",
      instructions: [
        "你检查一份准备提交的当前题答案，是否与其他已确认游戏设计答案存在无法同时成立的直接冲突。",
        "普通优化空间、信息缺失、措辞差异、尚未决定和可以同时成立的取舍不是冲突。不要制造问题。",
        "如有冲突，逐条引用一个真实题号，简洁解释冲突，并给出一个可行但不自动执行的修改建议。",
        "recommendedEditTarget 表示更建议修改 current、previous 或 either。无论推荐哪边，用户都可以查看冲突题并处理当前题。",
        "suggestedRevision 只在能够忠实形成推荐目标的完整修改草稿时填写，否则返回空字符串。推荐 previous 时必须基于该题现有确认答案修改；不得凭空新增设计。",
        "没有直接冲突时 hasConflict=false、conflicts=[]，summary 简短说明未发现冲突。",
      ].join("\n"),
      input: `准备提交：${question.id} ${question.prompt}\n候选答案：${answer}\n\n其他已确认 Design State：\n${designStateText(otherAnswers)}`,
    });

    const validConflicts = conflictReview.conflicts.filter((conflict) => conflict.questionId !== question.id && allQuestions.some((item) => item.id === conflict.questionId));
    const hasConflict = conflictReview.hasConflict && validConflicts.length > 0;
    const reviewId = crypto.randomUUID();
    const feedback = hasConflict
      ? [conflictReview.summary, ...validConflicts.map((conflict) => `${conflict.questionId}：${conflict.explanation}\n建议：${conflict.recommendation}`)].join("\n\n")
      : "";
    const assistantMessage = hasConflict ? await appendAssistantMessage(project.id, question.id, feedback) : null;
    const createdAt = assistantMessage?.createdAt ?? new Date().toISOString();
    await db.insert(answerSubmissionReviews).values({
      id: reviewId,
      projectId: project.id,
      questionId: question.id,
      answerFingerprint,
      designSnapshotKey: currentSnapshotKey,
      requirementStatus: "passed",
      conflictStatus: hasConflict ? "conflict" : "clear",
      feedback,
      conflictsJson: JSON.stringify(validConflicts),
      createdAt,
      confirmedAt: hasConflict ? null : createdAt,
    });

    return Response.json(hasConflict
      ? { status: "conflict", reviewId, assistantMessage, feedback, conflicts: validConflicts }
      : { status: "passed", reviewId, override: false });
  } catch (error) {
    const status = error instanceof AIConfigurationError ? 503 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "答案审查失败。", configurationRequired: status === 503 }, { status });
  }
}
