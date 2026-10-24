import { and, desc, eq, gte } from "drizzle-orm";
import { after } from "next/server";
import { getAppUser } from "@/app/app-auth";
import { getDb } from "@/db";
import { aiSuggestions, answerRevisions, buildBriefs, designReviewChanges, designReviewIssues, designReviewRuns, gddReviewChanges, gddVersions, projects, questionAnswers, stageSummaries } from "@/db/schema";
import { allQuestions } from "@/lib/protocol/stages";
import { enqueueBackgroundJob, processBackgroundJobs } from "@/lib/server/background-jobs";
import { getWorkspace, requireAnyOwnedProject, requireOwnedProject } from "@/lib/server/workspace";

function unauthorized() {
  return Response.json({ error: "请使用参与者专属链接进入。" }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return unauthorized();
    const projectId = new URL(request.url).searchParams.get("projectId");
    return Response.json(await getWorkspace(user, projectId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "无法读取项目。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return unauthorized();
    if (user.accessMode === "participant") return Response.json({ error: "参与者只能使用分配给自己的项目。" }, { status: 403 });
    const body = await request.json() as { action?: "create_project"; title?: string };
    if (body.action !== "create_project") return Response.json({ error: "不支持的操作。" }, { status: 400 });
    const title = body.title?.trim().slice(0, 80) || "未命名游戏";
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await getDb().insert(projects).values({
      id,
      ownerId: user.userId,
      ownerEmail: user.email,
      title,
      status: "active",
      activeQuestionId: "Q1",
      prototypeVersion: 0,
      gddVersion: 0,
      buildBriefVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    return Response.json(await getWorkspace(user, id), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "项目创建失败。" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return unauthorized();
    const body = await request.json() as {
      action?: "save_answer" | "set_active" | "rename_project" | "rebuild_project" | "archive_project" | "restore_project";
      projectId?: string;
      questionId?: string;
      answer?: string;
      structuredData?: Record<string, unknown>;
      suggestionId?: string;
      title?: string;
      returnProjectId?: string;
    };
    if (user.accessMode === "participant" && ["rebuild_project", "archive_project", "restore_project"].includes(body.action ?? "")) {
      return Response.json({ error: "参与者不能创建、归档或重建项目。" }, { status: 403 });
    }
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const db = getDb();
    const now = new Date().toISOString();
    if (body.action === "restore_project") {
      const archivedProject = await requireAnyOwnedProject(body.projectId, user);
      if (!archivedProject || archivedProject.status !== "archived") return Response.json({ error: "归档项目不存在或无权访问。" }, { status: 404 });
      await db.update(projects).set({ status: "active", archivedAt: null, updatedAt: now }).where(eq(projects.id, archivedProject.id));
      return Response.json(await getWorkspace(user, archivedProject.id));
    }
    const project = await requireOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });

    if (body.action === "rebuild_project") {
      const newProjectId = crypto.randomUUID();
      await db.update(projects).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(projects.id, project.id));
      await db.insert(projects).values({
        id: newProjectId,
        ownerId: user.userId,
        ownerEmail: user.email,
        title: "未命名游戏",
        status: "active",
        activeQuestionId: "Q1",
        prototypeVersion: 0,
        gddVersion: 0,
        buildBriefVersion: 0,
        createdAt: now,
        updatedAt: now,
      });
      return Response.json(await getWorkspace(user, newProjectId));
    } else if (body.action === "archive_project") {
      await db.update(projects).set({ status: "archived", archivedAt: now, updatedAt: now }).where(eq(projects.id, project.id));
      return Response.json(await getWorkspace(user, body.returnProjectId));
    } else if (body.action === "set_active") {
      if (body.questionId !== "GDD_GLOBAL" && !allQuestions.some((question) => question.id === body.questionId)) return Response.json({ error: "无效问题编号。" }, { status: 400 });
      await db.update(projects).set({ activeQuestionId: body.questionId!, updatedAt: now }).where(eq(projects.id, project.id));
    } else if (body.action === "rename_project") {
      const title = body.title?.trim().slice(0, 80);
      if (!title) return Response.json({ error: "项目名称不能为空。" }, { status: 400 });
      await db.update(projects).set({ title, updatedAt: now }).where(eq(projects.id, project.id));
    } else if (body.action === "save_answer") {
      const questionId = body.questionId ?? "";
      const answer = body.answer?.trim() ?? "";
      if (!allQuestions.some((question) => question.id === questionId)) return Response.json({ error: "无效问题编号。" }, { status: 400 });
      if (!answer || answer.length > 5000) return Response.json({ error: "答案需要包含 1–5000 个字符。" }, { status: 400 });

      const [existing] = await db.select().from(questionAnswers).where(and(eq(questionAnswers.projectId, project.id), eq(questionAnswers.questionId, questionId))).limit(1);
      const changed = existing?.answer !== answer;
      const answerRevision = existing ? (changed ? existing.revision + 1 : existing.revision) : 1;
      const [suggestion] = body.suggestionId
        ? await db.select().from(aiSuggestions).where(and(eq(aiSuggestions.id, body.suggestionId), eq(aiSuggestions.projectId, project.id), eq(aiSuggestions.questionId, questionId))).limit(1)
        : [];
      if (existing) {
        await db.update(questionAnswers).set({
          answer,
          status: "confirmed",
          structuredJson: JSON.stringify(body.structuredData ?? {}),
          revision: answerRevision,
          updatedAt: now,
        }).where(eq(questionAnswers.id, existing.id));
      } else {
        await db.insert(questionAnswers).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          questionId,
          answer,
          status: "confirmed",
          structuredJson: JSON.stringify(body.structuredData ?? {}),
          revision: answerRevision,
          updatedAt: now,
        });
      }
      if (changed) {
        await db.insert(answerRevisions).values({
          id: crypto.randomUUID(),
          projectId: project.id,
          questionId,
          revision: answerRevision,
          answer,
          source: "user",
          suggestionId: suggestion?.id ?? null,
          adoption: !suggestion ? "manual" : suggestion.suggestedAnswer.trim() === answer ? "verbatim" : "edited",
          createdAt: now,
        }).onConflictDoNothing();
        const stageId = allQuestions.find((question) => question.id === questionId)!.stageId;
        const [activeReview] = await db.select().from(designReviewRuns).where(eq(designReviewRuns.projectId, project.id)).orderBy(desc(designReviewRuns.version)).limit(1);
        const relatedIssueIds: string[] = [];
        if (activeReview && activeReview.status !== "superseded") {
          const issueRows = await db.select().from(designReviewIssues).where(eq(designReviewIssues.lastSeenRunId, activeReview.id));
          for (const issue of issueRows) {
            let ids: string[] = [];
            try { ids = JSON.parse(issue.questionIdsJson) as string[]; } catch { ids = []; }
            if (ids.includes(questionId) && issue.status !== "superseded") {
              relatedIssueIds.push(issue.id);
            }
          }
        }
        await Promise.all([
          db.update(stageSummaries).set({ status: "stale" }).where(and(eq(stageSummaries.projectId, project.id), eq(stageSummaries.status, "current"), gte(stageSummaries.stageId, stageId))),
          db.update(gddVersions).set({ status: "stale", updatedAt: now }).where(and(eq(gddVersions.projectId, project.id), eq(gddVersions.version, project.gddVersion))),
          db.update(buildBriefs).set({ status: "stale" }).where(and(eq(buildBriefs.projectId, project.id), eq(buildBriefs.version, project.buildBriefVersion))),
          db.update(gddReviewChanges).set({ status: "stale", updatedAt: now }).where(and(
            eq(gddReviewChanges.projectId, project.id),
            eq(gddReviewChanges.status, "proposed"),
            eq(gddReviewChanges.targetType, "question_answer"),
            eq(gddReviewChanges.targetId, questionId),
          )),
          db.update(designReviewChanges).set({ status: "stale", updatedAt: now }).where(and(
            eq(designReviewChanges.projectId, project.id),
            eq(designReviewChanges.status, "proposed"),
            eq(designReviewChanges.targetQuestionId, questionId),
          )),
          ...(activeReview && activeReview.status !== "superseded"
            ? [db.update(designReviewRuns).set({ status: "dirty", updatedAt: now, completedAt: null }).where(eq(designReviewRuns.id, activeReview.id))]
            : []),
          ...relatedIssueIds.map((issueId) => db.update(designReviewIssues).set({ status: "pending_verification", resolutionNote: null, updatedAt: now }).where(eq(designReviewIssues.id, issueId))),
        ]);
      }
      const derivedTitle = questionId === "Q1" && project.title === "未命名游戏" ? answer.split(/[。；\n]/)[0].slice(0, 28) || project.title : project.title;
      await db.update(projects).set({ activeQuestionId: questionId, title: derivedTitle, updatedAt: now }).where(eq(projects.id, project.id));
      await enqueueBackgroundJob({
        projectId: project.id,
        type: "question_memory",
        dedupeKey: `${questionId}:r${answerRevision}:memory-v3`,
        payload: { questionId, answerRevision },
      });
      after(async () => {
        await processBackgroundJobs({ projectId: project.id, limit: 2 }).catch((error) => {
          console.warn(JSON.stringify({ event: "background_job_drain_failed", projectId: project.id, reason: error instanceof Error ? error.message.slice(0, 240) : "unknown" }));
        });
      });
    } else {
      return Response.json({ error: "不支持的操作。" }, { status: 400 });
    }

    return Response.json(await getWorkspace(user, body.returnProjectId ?? project.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存失败。" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return unauthorized();
    if (user.accessMode === "participant") return Response.json({ error: "参与者不能删除项目。" }, { status: 403 });
    const body = await request.json() as { projectId?: string; confirmTitle?: string; returnProjectId?: string };
    if (!body.projectId) return Response.json({ error: "projectId is required" }, { status: 400 });
    const project = await requireAnyOwnedProject(body.projectId, user);
    if (!project) return Response.json({ error: "项目不存在或无权访问。" }, { status: 404 });
    if (project.status !== "archived") return Response.json({ error: "请先把项目移到回收站，再永久删除。" }, { status: 409 });
    if (body.confirmTitle !== project.title) return Response.json({ error: "项目名称确认不匹配。" }, { status: 400 });
    await getDb().delete(projects).where(eq(projects.id, project.id));
    return Response.json(await getWorkspace(user, body.returnProjectId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "项目删除失败。" }, { status: 500 });
  }
}
