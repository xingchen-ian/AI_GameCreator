"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Cloud,
  FileText,
  FolderOpen,
  GitCompareArrows,
  Loader2,
  LogOut,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BuildBriefPanel, GddPanel } from "@/components/workflow/gdd-panels";
import { GddReviewWorkspace } from "@/components/workflow/gdd-review-workspace";
import { ProjectManager } from "@/components/workflow/project-manager";
import { workflowFetch } from "@/lib/client/workflow-fetch";
import { useStudyEvents } from "@/lib/client/use-study-events";
import { answerDraftIsDirty, shouldAutoApplyAnswerSuggestion } from "@/lib/design/answer-draft";
import { validateCrossQuestionIssues, type CrossQuestionIssue } from "@/lib/design/cross-question-issues";
import type { DesignReviewChange, GddOutlineSection, GddSection, WorkspacePayload } from "@/lib/design/types";
import { validateParkedInsights } from "@/lib/design/parked-insights";
import { allQuestions, stages } from "@/lib/protocol/stages";
import { getQuestionScope } from "@/lib/protocol/question-scope";
import { starterForQuestion } from "@/lib/protocol/question-starter";

type Suggestion = { id?: string; answer: string; structuredData: Record<string, unknown> };
type GddProgress = { label: string; percent: number };
type GeneratedStageSummary = { stageId: number; summary: string; keyDecisions: string[]; openQuestions: string[] };
type AnswerReviewConflict = {
  questionId: string;
  explanation: string;
  recommendation: string;
  recommendedEditTarget: "current" | "previous" | "either";
  suggestedRevision: string;
};
const GDD_REVIEW_ID = "GDD_GLOBAL";

function defaultGddIssueId(workspace: WorkspacePayload | null) {
  const issues = workspace?.latestDesignReview?.issues ?? [];
  return issues.find((issue) => issue.status === "open" || issue.status === "pending_verification")?.id ?? issues[0]?.id ?? null;
}

function gddIssueChatKey(issueId: string) {
  return `DESIGN_ISSUE:${issueId}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`);
  return payload;
}

async function postGddStep<T>(body: Record<string, unknown>): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await workflowFetch("/api/gdd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("GDD 生成步骤失败。");
      if (attempt === 1) throw lastError;
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      continue;
    }
    const payload = await response.json() as T & { error?: string };
    if (response.ok) return payload;
    lastError = new Error(payload.error || `请求失败（${response.status}）`);
    if (![502, 503, 504].includes(response.status) || attempt === 1) throw lastError;
    await new Promise((resolve) => window.setTimeout(resolve, 900));
  }
  throw lastError ?? new Error("GDD 生成步骤失败。");
}

export function WorkflowApp({ displayName, participantMode = false, adminWorkspace = false }: { displayName: string; participantMode?: boolean; adminWorkspace?: boolean }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [selectedId, setSelectedId] = useState("Q1");
  const [selectedGddIssueId, setSelectedGddIssueId] = useState<string | null>(null);
  const [openStages, setOpenStages] = useState<Set<number>>(new Set([1]));
  const [draft, setDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [directAnswerQuestionIds, setDirectAnswerQuestionIds] = useState<Set<string>>(new Set());
  const [pendingAnswerReviewIds, setPendingAnswerReviewIds] = useState<Record<string, string>>({});
  const [answerReviewConflicts, setAnswerReviewConflicts] = useState<Record<string, AnswerReviewConflict[]>>({});
  const [view, setView] = useState<"design" | "gdd" | "build">("design");
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [loadingChatKey, setLoadingChatKey] = useState<string | null>(null);
  const [initializingQuestionKey, setInitializingQuestionKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gddProgress, setGddProgress] = useState<GddProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const answerEditorRef = useRef<HTMLTextAreaElement>(null);
  const loadedChatKeysRef = useRef<Set<string>>(new Set());
  const loadingChatKeysRef = useRef<Set<string>>(new Set());
  const initializedQuestionKeysRef = useRef<Set<string>>(new Set());
  const selectedIdRef = useRef("Q1");
  const answerDraftsRef = useRef<Record<string, string>>({});
  const answerDraftBaselineRef = useRef("");
  const answerDraftDirtyRef = useRef(false);

  const loadAnswerDraft = (questionId: string, value: string) => {
    answerDraftBaselineRef.current = value;
    answerDraftDirtyRef.current = false;
    answerDraftsRef.current[questionId] = value;
    setAnswerDraft(value);
  };

  const replaceAnswerDraft = (value: string) => {
    const questionId = selectedIdRef.current;
    loadAnswerDraft(questionId, value);
    setPendingAnswerReviewIds((current) => { const next = { ...current }; delete next[questionId]; return next; });
    setAnswerReviewConflicts((current) => { const next = { ...current }; delete next[questionId]; return next; });
  };

  const editAnswerDraft = (value: string) => {
    answerDraftDirtyRef.current = answerDraftIsDirty(value, answerDraftBaselineRef.current);
    setAnswerDraft(value);
    const questionId = selectedIdRef.current;
    answerDraftsRef.current[questionId] = value;
    setPendingAnswerReviewIds((current) => { const next = { ...current }; delete next[questionId]; return next; });
    setAnswerReviewConflicts((current) => { const next = { ...current }; delete next[questionId]; return next; });
  };

  const applyWorkspace = (payload: WorkspacePayload) => {
    loadedChatKeysRef.current.clear();
    loadingChatKeysRef.current.clear();
    initializedQuestionKeysRef.current.clear();
    answerDraftsRef.current = {};
    setWorkspace(payload);
    window.localStorage.setItem("game-workflow.active-project", payload.project.id);
    const activeQuestionId = payload.project.activeQuestionId || "Q1";
    selectedIdRef.current = activeQuestionId;
    setSelectedId(activeQuestionId);
    setSelectedGddIssueId(defaultGddIssueId(payload));
    replaceAnswerDraft(payload.answers[activeQuestionId]?.answer ?? "");
    setDraft("");
    setSuggestions({});
    setDirectAnswerQuestionIds(new Set());
    setPendingAnswerReviewIds({});
    setAnswerReviewConflicts({});
    const question = allQuestions.find((item) => item.id === activeQuestionId);
    if (question) setOpenStages(new Set([question.stageId]));
    setError(null);
  };

  const mergeWorkspacePayload = (payload: WorkspacePayload) => {
    setWorkspace((current) => current?.project.id === payload.project.id
      ? { ...payload, chats: current.chats }
      : payload);
  };

  const loadWorkspace = async (projectId?: string | null) => {
    setLoading(true);
    try {
      const requestedId = projectId ?? window.localStorage.getItem("game-workflow.active-project");
      const query = requestedId ? `?projectId=${encodeURIComponent(requestedId)}` : "";
      const payload = await readJson<WorkspacePayload>(await workflowFetch(`/api/workspace${query}`, { cache: "no-store" }));
      applyWorkspace(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法载入项目。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspace(), 0);
    return () => window.clearTimeout(timer);
    // Initial hydration only; subsequent refreshes are explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectMutation = async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, closeAfter = false) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/workspace", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
      applyWorkspace(payload);
      if (closeAfter) setProjectManagerOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "项目操作失败。");
    } finally {
      setSaving(false);
    }
  };

  const switchProject = async (projectId: string) => {
    if (saving || projectId === workspace?.project.id) return;
    setSaving(true);
    setError(null);
    try {
      await loadWorkspace(projectId);
      setView("design");
      setProjectManagerOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const leaveParticipantSession = async () => {
    await workflowFetch("/api/access/participant", { method: "DELETE" });
    window.localStorage.removeItem("game-workflow.active-project");
    router.replace("/");
    router.refresh();
  };

  const selected = allQuestions.find((question) => question.id === selectedId) ?? allQuestions[0];
  const isGlobalReview = selectedId === GDD_REVIEW_ID;
  const activeChatKey = isGlobalReview
    ? selectedGddIssueId ? gddIssueChatKey(selectedGddIssueId) : null
    : selectedId;
  const selectedStage = stages.find((stage) => stage.id === selected.stageId)!;
  const selectedScope = getQuestionScope(selected.id);
  const storedAnswer = workspace?.answers[selectedId];
  const selectedStructuredData = suggestions[selectedId]?.structuredData ?? storedAnswer?.structuredData;
  const selectedChats = workspace?.chats[selectedId] ?? [];
  const chatIsLoading = loadingChatKey === activeChatKey;
  const questionIsInitializing = initializingQuestionKey === activeChatKey;
  const parkedInsights = validateParkedInsights(
    selectedStructuredData?.parkedInsights,
    selectedChats.filter((message) => message.role === "user").map((message) => message.text),
    selectedId,
  );
  const crossQuestionIssues = validateCrossQuestionIssues(selectedStructuredData?.crossQuestionIssues, selectedId);
  const displayedChats = selectedChats.length ? selectedChats : chatIsLoading || questionIsInitializing ? [] : [{ id: "starter", role: "assistant" as const, text: starterForQuestion(selected), createdAt: "" }];
  const confirmedCount = Object.values(workspace?.answers ?? {}).filter((answer) => answer.status === "confirmed").length;
  const progress = Math.round((confirmedCount / allQuestions.length) * 100);

  useEffect(() => {
    const projectId = workspace?.project.id;
    if (!projectId || !activeChatKey || loadedChatKeysRef.current.has(activeChatKey) || loadingChatKeysRef.current.has(activeChatKey)) return;
    const controller = new AbortController();
    loadingChatKeysRef.current.add(activeChatKey);
    setLoadingChatKey(activeChatKey);
    const query = new URLSearchParams({ projectId, questionId: activeChatKey });
    void (async () => readJson<{ messages: WorkspacePayload["chats"][string]; hasMore: boolean }>(
      await workflowFetch(`/api/messages?${query.toString()}`, { cache: "no-store", signal: controller.signal }),
    ))().then((payload) => {
      loadedChatKeysRef.current.add(activeChatKey);
      setWorkspace((current) => current?.project.id === projectId ? {
        ...current,
        chats: { ...current.chats, [activeChatKey]: payload.messages },
      } : current);
      if (payload.messages.length === 0 && allQuestions.some((question) => question.id === activeChatKey) && !initializedQuestionKeysRef.current.has(activeChatKey)) {
        initializedQuestionKeysRef.current.add(activeChatKey);
        setInitializingQuestionKey(activeChatKey);
        void workflowFetch("/api/ai/question-start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, questionId: activeChatKey }),
        }).then((response) => readJson<{
          created: boolean;
          assistantMessage?: WorkspacePayload["chats"][string][number];
          suggestion?: Suggestion;
        }>(response)).then((initialPayload) => {
          if (!initialPayload.created || !initialPayload.assistantMessage || !initialPayload.suggestion) return;
          setWorkspace((current) => current?.project.id === projectId ? {
            ...current,
            chats: { ...current.chats, [activeChatKey]: [initialPayload.assistantMessage!] },
            chatQuestionIds: current.chatQuestionIds.includes(activeChatKey) ? current.chatQuestionIds : [...current.chatQuestionIds, activeChatKey],
          } : current);
          setSuggestions((current) => ({ ...current, [activeChatKey]: initialPayload.suggestion! }));
          if (shouldAutoApplyAnswerSuggestion({
            activeQuestionId: selectedIdRef.current,
            responseQuestionId: activeChatKey,
            draftIsDirty: answerDraftDirtyRef.current,
            recommendedAction: initialPayload.suggestion.structuredData.recommendedAction,
          })) replaceAnswerDraft(initialPayload.suggestion.answer);
        }).catch((caught) => {
          setError(caught instanceof Error ? caught.message : "无法根据已有设计初始化当前问题。");
        }).finally(() => {
          setInitializingQuestionKey((current) => current === activeChatKey ? null : current);
        });
      }
    }).catch((caught) => {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "无法读取对话。");
    }).finally(() => {
      loadingChatKeysRef.current.delete(activeChatKey);
      setLoadingChatKey((current) => current === activeChatKey ? null : current);
    });
    return () => controller.abort();
    // Draft helpers intentionally read refs so question hydration does not restart
    // when the user edits the current answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatKey, workspace?.project.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChats.length, selectedId, thinking]);

  const selectQuestion = (id: string, stageId: number, initialDraft = "", answerDraftOverride?: string) => {
    answerDraftsRef.current[selectedIdRef.current] = answerDraft;
    selectedIdRef.current = id;
    setSelectedId(id);
    const nextAnswerDraft = answerDraftOverride ?? answerDraftsRef.current[id] ?? workspace?.answers[id]?.answer ?? suggestions[id]?.answer ?? "";
    if (answerDraftOverride !== undefined) replaceAnswerDraft(nextAnswerDraft);
    else loadAnswerDraft(id, nextAnswerDraft);
    if (answerDraftOverride !== undefined) setDirectAnswerQuestionIds((current) => new Set([...current, id]));
    setDraft(initialDraft);
    setOpenStages((current) => new Set([...current, stageId]));
    if (workspace) void workflowFetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_active", projectId: workspace.project.id, questionId: id }) });
  };

  const editCurrentFromIssue = (issue: CrossQuestionIssue) => {
    setDirectAnswerQuestionIds((current) => new Set([...current, selectedId]));
    if (issue.recommendedEditTarget === "current" && issue.suggestedRevision) replaceAnswerDraft(issue.suggestedRevision);
    window.requestAnimationFrame(() => answerEditorRef.current?.focus());
  };

  const openPreviousFromIssue = (issue: CrossQuestionIssue) => {
    const target = allQuestions.find((question) => question.id === issue.questionId);
    if (!target) return;
    const revision = issue.recommendedEditTarget === "previous" && issue.suggestedRevision
      ? issue.suggestedRevision
      : undefined;
    selectQuestion(target.id, target.stageId, "", revision);
  };

  const editCurrentFromReview = (conflict: AnswerReviewConflict) => {
    setDirectAnswerQuestionIds((current) => new Set([...current, selectedId]));
    if (conflict.recommendedEditTarget === "current" && conflict.suggestedRevision) replaceAnswerDraft(conflict.suggestedRevision);
    window.requestAnimationFrame(() => answerEditorRef.current?.focus());
  };

  const openPreviousFromReview = (conflict: AnswerReviewConflict) => {
    const target = allQuestions.find((question) => question.id === conflict.questionId);
    if (!target) return;
    const revision = conflict.recommendedEditTarget === "previous" && conflict.suggestedRevision
      ? conflict.suggestedRevision
      : undefined;
    selectQuestion(target.id, target.stageId, "", revision);
  };

  const selectGlobalReview = () => {
    selectedIdRef.current = GDD_REVIEW_ID;
    setSelectedId(GDD_REVIEW_ID);
    setSelectedGddIssueId((current) => current && workspace?.latestDesignReview?.issues.some((issue) => issue.id === current) ? current : defaultGddIssueId(workspace));
    setDraft("");
    setView("gdd");
    if (workspace) void workflowFetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_active", projectId: workspace.project.id, questionId: GDD_REVIEW_ID }) });
  };

  const selectGddIssue = (issueId: string) => {
    setSelectedGddIssueId(issueId);
    setDraft("");
  };

  const sendGddReview = async (mode: "analyze" | "chat" = "chat", issueId = selectedGddIssueId, contentOverride?: string) => {
    const content = contentOverride?.trim() ?? draft.trim();
    if (!workspace || !issueId || (mode === "chat" && !content) || thinking || loadingChatKey === gddIssueChatKey(issueId)) return;
    const projectId = workspace.project.id;
    const chatKey = gddIssueChatKey(issueId);
    const optimisticMessage = mode === "chat" ? {
      id: `pending:${crypto.randomUUID()}`,
      role: "user" as const,
      text: content,
      createdAt: new Date().toISOString(),
    } : null;
    if (optimisticMessage) {
      setWorkspace((current) => current ? {
        ...current,
        chats: { ...current.chats, [chatKey]: [...(current.chats[chatKey] ?? []), optimisticMessage] },
        chatQuestionIds: current.chatQuestionIds.includes(chatKey) ? current.chatQuestionIds : [...current.chatQuestionIds, chatKey],
      } : current);
      if (contentOverride === undefined) setDraft("");
    }
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<{
        userMessage: WorkspacePayload["chats"][string][number] | null;
        assistantMessage: WorkspacePayload["chats"][string][number];
        changes: DesignReviewChange[];
      }>(await workflowFetch("/api/ai/gdd-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, issueId, mode, content: mode === "chat" ? content : undefined }) }));
      setWorkspace((current) => current ? {
        ...current,
        chats: {
          ...current.chats,
          [chatKey]: [
            ...(current.chats[chatKey] ?? []).filter((message) => message.id !== optimisticMessage?.id && message.id !== payload.userMessage?.id && message.id !== payload.assistantMessage.id),
            ...(payload.userMessage ? [payload.userMessage] : []),
            payload.assistantMessage,
          ],
        },
        designReviewChanges: [...current.designReviewChanges, ...payload.changes],
      } : current);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "全局审查暂时无法响应。";
      await loadWorkspace(projectId);
      if (mode === "chat" && contentOverride === undefined) setDraft(content);
      setError(message);
    } finally {
      setThinking(false);
    }
  };

  const updateReviewChange = async (change: DesignReviewChange, action: "apply" | "dismiss", proposedContent?: string) => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/ai/gdd-review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, changeId: change.id, action, proposedContent }) }));
      mergeWorkspacePayload(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "修改建议处理失败。");
      await loadWorkspace();
      setSelectedId(GDD_REVIEW_ID);
    } finally {
      setSaving(false);
    }
  };

  const runDesignReview = async (action: "start" | "verify") => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/design-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, action }) }));
      mergeWorkspacePayload(payload);
      setSelectedGddIssueId(defaultGddIssueId(payload));
      setSelectedId(GDD_REVIEW_ID);
      setView("gdd");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Design State 全局审查失败。");
      await loadWorkspace();
    } finally {
      setSaving(false);
    }
  };

  const setDesignIssueAccepted = async (issueId: string, accepted: boolean, note?: string) => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/design-review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, issueId, action: accepted ? "accept" : "reopen", note }) }));
      mergeWorkspacePayload(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "问题状态更新失败。");
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (isGlobalReview) return sendGddReview("chat");
    const content = draft.trim();
    if (!workspace || !content || thinking || chatIsLoading) return;
    const projectId = workspace.project.id;
    const questionId = selectedId;
    const optimisticMessage = {
      id: `pending:${crypto.randomUUID()}`,
      role: "user" as const,
      text: content,
      createdAt: new Date().toISOString(),
    };
    setWorkspace((current) => current ? {
      ...current,
      chats: { ...current.chats, [questionId]: [...(current.chats[questionId] ?? []), optimisticMessage] },
      chatQuestionIds: current.chatQuestionIds.includes(questionId) ? current.chatQuestionIds : [...current.chatQuestionIds, questionId],
    } : current);
    setDraft("");
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<{
        userMessage: WorkspacePayload["chats"][string][number];
        assistantMessage: WorkspacePayload["chats"][string][number];
        suggestion: Suggestion;
      }>(await workflowFetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, questionId, content }) }));
      setWorkspace((current) => current ? {
        ...current,
        chats: {
          ...current.chats,
          [questionId]: [
            ...(current.chats[questionId] ?? []).filter((message) => message.id !== optimisticMessage.id && message.id !== payload.userMessage.id && message.id !== payload.assistantMessage.id),
            payload.userMessage,
            payload.assistantMessage,
          ],
        },
      } : current);
      setSuggestions((current) => ({ ...current, [questionId]: payload.suggestion }));
      if (shouldAutoApplyAnswerSuggestion({
        activeQuestionId: selectedIdRef.current,
        responseQuestionId: questionId,
        draftIsDirty: answerDraftDirtyRef.current,
        recommendedAction: payload.suggestion.structuredData.recommendedAction,
      })) replaceAnswerDraft(payload.suggestion.answer);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "AI 暂时无法响应。";
      await loadWorkspace(projectId);
      setDraft(content);
      setError(message);
    } finally {
      setThinking(false);
    }
  };

  const synthesize = async () => {
    if (!workspace || chatIsLoading) return;
    const questionId = selectedId;
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<Suggestion>(await workflowFetch("/api/ai/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, questionId }) }));
      setSuggestions((current) => ({ ...current, [questionId]: payload }));
      if (shouldAutoApplyAnswerSuggestion({
        activeQuestionId: selectedIdRef.current,
        responseQuestionId: questionId,
        draftIsDirty: answerDraftDirtyRef.current,
        recommendedAction: "confirm_answer",
      })) replaceAnswerDraft(payload.answer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法提炼答案。");
    } finally {
      setThinking(false);
    }
  };

  const saveAnswer = async () => {
    if (!workspace || !answerDraft.trim()) return;
    const questionId = selectedId;
    const submittedAnswer = answerDraft.trim();
    const projectId = workspace.project.id;
    setSaving(true);
    setError(null);
    try {
      const review = await readJson<{
        status: "passed" | "needs_revision" | "conflict";
        reviewId: string;
        assistantMessage?: WorkspacePayload["chats"][string][number] | null;
        conflicts?: AnswerReviewConflict[];
      }>(await workflowFetch("/api/ai/answer-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, questionId, answer: submittedAnswer, reviewId: pendingAnswerReviewIds[questionId] }),
      }));
      if (review.assistantMessage) {
        setWorkspace((current) => current?.project.id === projectId ? {
          ...current,
          chats: {
            ...current.chats,
            [questionId]: [
              ...(current.chats[questionId] ?? []).filter((message) => message.id !== review.assistantMessage!.id),
              review.assistantMessage!,
            ],
          },
          chatQuestionIds: current.chatQuestionIds.includes(questionId) ? current.chatQuestionIds : [...current.chatQuestionIds, questionId],
        } : current);
      }
      if (review.status === "needs_revision") {
        setPendingAnswerReviewIds((current) => { const next = { ...current }; delete next[questionId]; return next; });
        setAnswerReviewConflicts((current) => { const next = { ...current }; delete next[questionId]; return next; });
        return;
      }
      if (review.status === "conflict") {
        setPendingAnswerReviewIds((current) => ({ ...current, [questionId]: review.reviewId }));
        setAnswerReviewConflicts((current) => ({ ...current, [questionId]: review.conflicts ?? [] }));
        return;
      }

      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_answer", projectId, questionId, answer: submittedAnswer, structuredData: suggestions[questionId]?.structuredData ?? {}, suggestionId: suggestions[questionId]?.id }) }));
      mergeWorkspacePayload(payload);
      if (selectedIdRef.current === questionId) replaceAnswerDraft(submittedAnswer);
      setPendingAnswerReviewIds((current) => { const next = { ...current }; delete next[questionId]; return next; });
      setAnswerReviewConflicts((current) => { const next = { ...current }; delete next[questionId]; return next; });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "答案审查或保存失败。");
    } finally {
      setSaving(false);
    }
  };

  const generateGdd = async () => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    setView("gdd");
    setGddProgress({ label: "1/4 正在规划适合本游戏的文档结构", percent: 12 });
    try {
      const outline = await postGddStep<{
        snapshotKey: string;
        result: { title: string; oneLinePitch: string; stageSummaries: GeneratedStageSummary[]; sections: GddOutlineSection[] };
      }>({ projectId: workspace.project.id, action: "outline" });

      setGddProgress({ label: `2/4 正在撰写 ${outline.result.sections.length} 个动态章节`, percent: 30 });
      const batches = [outline.result.sections.slice(0, 5), outline.result.sections.slice(5)].filter((batch) => batch.length > 0);
      let completedBatches = 0;
      const sectionResults = await Promise.all(batches.map(async (outlineSections) => {
        const response = await postGddStep<{ snapshotKey: string; result: { sections: GddSection[] } }>({
          projectId: workspace.project.id,
          action: "section_batch",
          snapshotKey: outline.snapshotKey,
          outlineSections,
        });
        completedBatches += 1;
        setGddProgress({ label: `2/4 已完成 ${completedBatches}/${batches.length} 批章节`, percent: 30 + Math.round((completedBatches / batches.length) * 36) });
        return response.result.sections;
      }));
      const sections = sectionResults.flat();

      setGddProgress({ label: "3/4 正在检查 GDD 是否忠实于答案", percent: 72 });
      const fidelity = await postGddStep<{ snapshotKey: string; result: { sections: GddSection[] } }>({
        projectId: workspace.project.id,
        action: "fidelity",
        snapshotKey: outline.snapshotKey,
        sections,
      });

      setGddProgress({ label: "4/4 正在保存审查通过的 GDD", percent: 94 });
      const payload = await postGddStep<WorkspacePayload>({
        projectId: workspace.project.id,
        action: "finalize",
        snapshotKey: outline.snapshotKey,
        title: outline.result.title,
        oneLinePitch: outline.result.oneLinePitch,
        stageSummaries: outline.result.stageSummaries,
        sections: fidelity.result.sections,
      });
      mergeWorkspacePayload(payload);
      setSelectedGddIssueId(defaultGddIssueId(payload));
      setView("gdd");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GDD 生成失败。");
    } finally {
      setGddProgress(null);
      setSaving(false);
    }
  };

  const updateGdd = async (body: Record<string, unknown>) => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/gdd", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, ...body }) }));
      mergeWorkspacePayload(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GDD 更新失败。");
    } finally {
      setSaving(false);
    }
  };

  const createBuildBrief = async () => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await workflowFetch("/api/build-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id }) }));
      mergeWorkspacePayload(payload);
      setView("build");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Build Brief 生成失败。");
    } finally {
      setSaving(false);
    }
  };

  const stageCounts = useMemo(() => stages.map((stage) => ({
    id: stage.id,
    confirmed: stage.questions.filter((question) => workspace?.answers[question.id]?.status === "confirmed").length,
    total: stage.questions.length,
  })), [workspace]);
  const pendingAnswerSuggestion = suggestions[selectedId]?.answer.trim() && suggestions[selectedId].answer.trim() !== answerDraft.trim()
    ? suggestions[selectedId]
    : null;
  const selectedRecommendedAction = suggestions[selectedId]?.structuredData.recommendedAction;
  const selectedNeedsMoreDiscussion = selectedRecommendedAction === "continue_discussion" || selectedRecommendedAction === "review_upstream";
  const showAnswerEditor = Boolean(storedAnswer) || !selectedNeedsMoreDiscussion || directAnswerQuestionIds.has(selectedId);
  useStudyEvents({
    projectId: workspace?.project.id ?? null,
    questionId: view === "design" ? selectedId : view === "gdd" ? "GDD" : "BUILD_BRIEF",
    view,
    answerEditorVisible: showAnswerEditor,
    candidateVisible: Boolean(pendingAnswerSuggestion),
  });

  if (loading && !workspace) return <main className="grid min-h-screen place-items-center bg-[#10252d] text-white"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-[#72d2dd]" /><p className="mt-3 text-sm text-[#a8bec4]">正在载入正式项目…</p></div></main>;
  if (!workspace) return <main className="grid min-h-screen place-items-center bg-[#10252d] px-6 text-white"><section className="max-w-md text-center"><AlertTriangle className="mx-auto size-8 text-[#f0a63a]" /><h1 className="mt-3 text-xl font-semibold">项目暂时无法载入</h1><p className="mt-2 text-sm text-[#b7cbd0]">{error}</p><Button onClick={() => void loadWorkspace()} className="mt-5">重试</Button></section></main>;

  return (
    <main className="flex min-h-screen flex-col bg-[#f4f7f8] xl:h-screen xl:overflow-hidden">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#cfdadd] bg-white px-4 shadow-[0_1px_0_rgba(16,37,45,.04)] sm:px-5">
        {participantMode ? <div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#10252d] text-[#72d2dd]"><Sparkles className="size-[18px]" /></div><div className="min-w-0 pr-2"><h1 className="max-w-[220px] truncate text-[16px] font-semibold">{workspace.project.title}</h1><p className="text-[12px] text-[#6a7c83]">参与者 {displayName}</p></div></div> : <button onClick={() => setProjectManagerOpen(true)} className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:bg-[#f2f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c7489]/30"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#10252d] text-[#72d2dd]"><Sparkles className="size-[18px]" /></div><div className="min-w-0 pr-2"><div className="flex items-center gap-2"><h1 className="max-w-[220px] truncate text-[16px] font-semibold">{workspace.project.title}</h1><ChevronDown className="size-3.5 text-[#74868c]" /></div><p className="text-[12px] text-[#6a7c83]">{displayName} · {workspace.projects.filter((project) => project.status === "active").length} 个项目</p></div></button>}
        <div className="flex items-center gap-2 sm:gap-3"><div className="hidden w-44 md:block"><div className="mb-1 flex justify-between text-[11px] text-[#60747c]"><span>已确认设计</span><span>{progress}%</span></div><Progress value={progress} className="h-1.5 bg-[#dfe8ea]" /></div><span className="hidden items-center gap-1.5 text-[12px] text-[#60747c] lg:flex"><Cloud className="size-3.5 text-[#6b8f4e]" />{saving ? "保存中" : "本机已保存"}</span>{adminWorkspace && <Button variant="outline" size="sm" asChild className="h-9 rounded-xl px-2.5 sm:px-3"><a href="/admin/research"><ShieldCheck className="size-3.5" /><span className="hidden lg:inline">研究管理</span></a></Button>}{participantMode ? <Button variant="outline" size="sm" aria-label="退出测试" onClick={() => void leaveParticipantSession()} disabled={saving} className="h-9 rounded-xl px-2.5 sm:px-3"><LogOut className="size-3.5" /><span className="hidden lg:inline">退出</span></Button> : <Button variant="outline" size="sm" aria-label="管理项目" onClick={() => setProjectManagerOpen(true)} disabled={saving} className="h-9 rounded-xl px-2.5 sm:px-3"><FolderOpen className="size-3.5" /><span className="hidden lg:inline">项目</span></Button>}</div>
      </header>

      {error && <div className="flex items-center justify-between gap-3 border-b border-[#e9c889] bg-[#fff7e7] px-4 py-2 text-[12px] text-[#725321]"><span className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" />{error}</span><button onClick={() => setError(null)} className="font-semibold">关闭</button></div>}

      <section className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[310px_minmax(440px,1fr)_390px] xl:overflow-hidden">
        <aside className="scrollbar-thin hidden overflow-y-auto border-r border-[#29454d] bg-[#10252d] text-white xl:block">
          <div className="border-b border-[#29454d] px-5 py-5"><p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#7ea1aa]">Design protocol</p><h2 className="mt-1 text-[18px] font-semibold">六阶段设计路径</h2><p className="mt-1 text-[12px] leading-5 text-[#9bb0b6]">答案会直接写入结构化状态；全局冲突由 AI 审查。</p></div>
          <div className="relative px-4 py-5"><div className="absolute bottom-6 left-[31px] top-8 w-px bg-[#31515a]" />
            {stages.map((stage) => {
              const counts = stageCounts.find((item) => item.id === stage.id)!;
              const isOpen = openStages.has(stage.id);
              const isCurrent = !isGlobalReview && selected.stageId === stage.id;
              return <Collapsible key={stage.id} open={isOpen} onOpenChange={(open) => setOpenStages((current) => { const next = new Set(current); if (open) next.add(stage.id); else next.delete(stage.id); return next; })} className="relative mb-4"><CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72d2dd]"><span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full bg-[#10252d] font-mono text-[11px] ${counts.confirmed === counts.total ? "border-2 border-[#82ae60] text-[#a8d782]" : isCurrent ? "border-2 border-[#5cc3ce] text-[#8adbe3]" : "border border-[#47636a] text-[#8ca5ac]"}`}>{counts.confirmed === counts.total ? <Check className="size-3.5" /> : String(stage.id).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className={`text-[13px] font-semibold ${isCurrent ? "text-white" : "text-[#a9bdc2]"}`}>{stage.name}</p><p className="text-[10px] text-[#66838b]">{stage.english} · {counts.confirmed}/{counts.total}</p></div>{isOpen ? <ChevronDown className="size-4 text-[#6f8c94]" /> : <ChevronRight className="size-4 text-[#6f8c94]" />}</CollapsibleTrigger><CollapsibleContent className="ml-8 mt-2 space-y-1.5">{stage.questions.map((question) => {
                const answer = workspace.answers[question.id];
                return <button key={question.id} onClick={() => selectQuestion(question.id, stage.id)} className={`group flex w-full gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${selectedId === question.id ? "bg-[#21434c] shadow-[inset_3px_0_0_#5cc3ce]" : "hover:bg-[#183740]"}`}><span className={`mt-0.5 font-mono text-[10px] ${selectedId === question.id ? "text-[#7bd5de]" : "text-[#6e8c94]"}`}>{question.id}</span><span className={`line-clamp-2 flex-1 text-[12px] leading-[1.55] ${selectedId === question.id ? "text-white" : "text-[#afc1c6]"}`}>{question.short}</span>{answer?.status === "confirmed" ? <CheckCircle2 className="mt-0.5 size-3.5 text-[#8fbd6b]" /> : workspace.chatQuestionIds.includes(question.id) ? <Circle className="mt-1 size-2.5 fill-[#5cc3ce] text-[#5cc3ce]" /> : null}</button>;
              })}</CollapsibleContent></Collapsible>;
            })}
            <button onClick={selectGlobalReview} className={`relative mt-2 flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition ${isGlobalReview ? "bg-[#21434c] shadow-[inset_3px_0_0_#f0a63a]" : "hover:bg-[#183740]"}`}><span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full bg-[#10252d] ${isGlobalReview ? "border-2 border-[#f0a63a] text-[#ffd07a]" : workspace.latestDesignReview?.status === "ready" ? "border-2 border-[#82ae60] text-[#a8d782]" : workspace.latestDesignReview ? "border-2 border-[#f0a63a] text-[#ffd07a]" : "border border-[#47636a] text-[#8ca5ac]"}`}><GitCompareArrows className="size-3.5" /></span><div className="min-w-0 flex-1"><p className={`text-[13px] font-semibold ${isGlobalReview ? "text-white" : "text-[#a9bdc2]"}`}>Design State 全局审查</p><p className="text-[10px] text-[#66838b]">{!workspace.latestDesignReview ? "等待开始审查" : workspace.latestDesignReview.status === "ready" ? "已通过，可生成 GDD" : `${workspace.latestDesignReview.issues.filter((issue) => issue.status === "open" || issue.status === "pending_verification").length} 个待处理`}</p></div><ChevronRight className="size-4 text-[#6f8c94]" /></button>
          </div>
        </aside>

        {isGlobalReview ? <GddReviewWorkspace workspace={workspace} selectedIssueId={selectedGddIssueId} draft={draft} thinking={thinking} loadingChat={chatIsLoading} saving={saving} onSelectIssue={selectGddIssue} onDraftChange={setDraft} onSend={() => void sendGddReview("chat")} onAnalyze={(issueId) => void sendGddReview("analyze", issueId)} onRefine={(issueId) => void sendGddReview("chat", issueId, "请根据我们对这个冲突的全部讨论，提炼出最合适的最终答案。给出完整替换文本，并让我决定是否接受；不要直接修改。")} onApply={(change, content) => void updateReviewChange(change, "apply", content)} onDismiss={(change) => void updateReviewChange(change, "dismiss")} onStartReview={() => void runDesignReview("start")} onVerifyReview={() => void runDesignReview("verify")} onAcceptIssue={(issueId, note) => void setDesignIssueAccepted(issueId, true, note)} onReopenIssue={(issueId) => void setDesignIssueAccepted(issueId, false)} onOpenQuestion={(questionId) => { const question = allQuestions.find((item) => item.id === questionId); if (question) selectQuestion(question.id, question.stageId); }} /> : <section className="flex min-h-[720px] min-w-0 flex-col bg-white xl:min-h-0">
          <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-[#d9e2e4] bg-[#10252d] px-3 py-2 xl:hidden">{stages.map((stage) => <button key={stage.id} onClick={() => selectQuestion(stage.questions[0].id, stage.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[12px] ${selected.stageId === stage.id ? "bg-[#2b5360] text-white" : "text-[#9db5bb]"}`}>{stage.id}. {stage.name}</button>)}<button onClick={selectGlobalReview} className="shrink-0 rounded-lg px-3 py-2 text-[12px] text-[#ffd07a]">全局审查</button></div>
          <div className="border-b border-[#d9e2e4] px-5 py-4 sm:px-7"><div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em] text-[#0c7489]"><span>Stage {selected.stageId}</span><span className="text-[#a4b2b7]">/</span><span>{selected.id} · {selected.short}</span></div></div><h2 className="max-w-3xl text-[20px] font-semibold leading-[1.45] tracking-[-.015em] text-[#14232b] sm:text-[21px]">{selected.prompt}</h2><p className="mt-2 flex max-w-3xl items-start gap-2 text-[11px] leading-5 text-[#71858c]"><span className="mt-0.5 shrink-0 rounded bg-[#e7f2f4] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#0c7489]">本题边界</span>{selectedScope.focus}</p></div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6 sm:px-7"><div className="mx-auto max-w-3xl space-y-5">
            {displayedChats.map((message) => message.role === "assistant" ? <div key={message.id} className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Sparkles className="size-4" /></div><div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3.5 text-[14px] leading-6 text-[#30454d]">{message.text}</div></div> : <div key={message.id} className="flex justify-end"><div className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#0c7489] px-4 py-3 text-[14px] leading-6 text-white shadow-sm">{message.text}</div></div>)}
            {chatIsLoading && <div className="flex items-center gap-2 text-[12px] text-[#71858c]"><Loader2 className="size-4 animate-spin" />正在载入本题对话…</div>}
            {questionIsInitializing && <div className="flex items-center gap-2 text-[12px] text-[#71858c]"><Loader2 className="size-4 animate-spin" />AI 正在读取已有设计信息并判断本题起点…</div>}
            {thinking && <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Loader2 className="size-4 animate-spin" /></div><div className="rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3 text-[13px] text-[#6c7e84]">AI 正在结合完整 Design State 推理…</div></div>}
            <div ref={chatEndRef} />
            {selectedChats.length > 0 && selectedNeedsMoreDiscussion && !showAnswerEditor && <div className="sm:ml-11"><button type="button" onClick={() => setDirectAnswerQuestionIds((current) => new Set([...current, selectedId]))} className="text-[11px] font-medium text-[#607f87] underline decoration-[#9bb8be] underline-offset-4 transition hover:text-[#0c7489]">不再讨论，直接填写答案</button></div>}
            {parkedInsights.length > 0 && <div className="rounded-xl border border-[#e8ca8d] bg-[#fff8e9] p-3 sm:ml-11"><p className="flex items-center gap-2 text-[11px] font-semibold text-[#765722]"><BookmarkPlus className="size-3.5" />这部分更适合在其他题目讨论 · 不会写入本题答案</p><div className="mt-2 space-y-2">{parkedInsights.map((insight, index) => { const target = allQuestions.find((question) => question.id === insight.suggestedQuestionId); return <div key={`${insight.suggestedQuestionId}-${index}`} className="flex items-start justify-between gap-2 rounded-lg bg-white/70 p-2"><p className="text-[10px] leading-4 text-[#705d38]">{insight.content}</p><Button variant="outline" size="sm" onClick={() => target && selectQuestion(target.id, target.stageId, insight.content)} className="h-7 shrink-0 bg-white px-2 text-[10px]">去 {insight.suggestedQuestionId}</Button></div>; })}</div></div>}
            {crossQuestionIssues.length > 0 && <div className="rounded-xl border border-[#e8ca8d] bg-[#fff8e9] p-3 sm:ml-11"><p className="flex items-center gap-2 text-[11px] font-semibold text-[#765722]"><GitCompareArrows className="size-3.5" />这项想法可能影响此前设计</p><div className="mt-2 space-y-2">{crossQuestionIssues.map((issue) => { const recommendCurrent = issue.recommendedEditTarget === "current"; const recommendPrevious = issue.recommendedEditTarget === "previous"; return <div key={issue.questionId} className="rounded-lg bg-white/70 p-2.5"><p className="text-[10px] leading-4 text-[#705d38]">{issue.explanation}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant={recommendCurrent ? "default" : "outline"} size="sm" onClick={() => editCurrentFromIssue(issue)} className="h-7 px-2 text-[10px]">修改当前 {selectedId}{recommendCurrent ? " · 建议" : ""}</Button><Button variant={recommendPrevious ? "default" : "outline"} size="sm" onClick={() => openPreviousFromIssue(issue)} className="h-7 px-2 text-[10px]">{recommendPrevious ? `前往 ${issue.questionId} 修改 · 建议` : `查看 ${issue.questionId}`}</Button></div></div>; })}</div></div>}
            {answerReviewConflicts[selectedId]?.length > 0 && <div className="rounded-xl border border-[#e8ca8d] bg-[#fff8e9] p-3 sm:ml-11"><p className="text-[11px] font-semibold text-[#765722]">最终答案与此前设计存在冲突。你可以修改任意一边，也可以保持当前答案后再次确认。</p><div className="mt-2 space-y-2">{answerReviewConflicts[selectedId].map((conflict) => { const recommendCurrent = conflict.recommendedEditTarget === "current"; const recommendPrevious = conflict.recommendedEditTarget === "previous"; return <div key={conflict.questionId} className="rounded-lg bg-white/70 p-2.5"><p className="text-[10px] leading-4 text-[#705d38]">{conflict.explanation}</p><p className="mt-1 text-[10px] leading-4 text-[#806b43]">建议：{conflict.recommendation}</p><div className="mt-2 flex flex-wrap gap-2"><Button variant={recommendCurrent ? "default" : "outline"} size="sm" onClick={() => editCurrentFromReview(conflict)} className="h-7 px-2 text-[10px]">修改当前 {selectedId}{recommendCurrent ? " · 建议" : ""}</Button><Button variant={recommendPrevious ? "default" : "outline"} size="sm" onClick={() => openPreviousFromReview(conflict)} className="h-7 px-2 text-[10px]">{recommendPrevious ? `前往 ${conflict.questionId} 修改 · 建议` : `查看 ${conflict.questionId}`}</Button></div></div>; })}</div></div>}
            {(selectedChats.length > 0 || storedAnswer) && showAnswerEditor && <section className="rounded-2xl border border-[#a9cfd5] bg-[#eef8f9] p-4 sm:ml-11"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[13px] font-semibold text-[#164e59]"><WandSparkles className="size-4" />答案草稿</p><p className="mt-1 text-[11px] text-[#6b858b]">只收录当前问题的答案；确认前仍会检查是否满足本题要求。</p></div><Button variant="ghost" size="sm" onClick={() => void synthesize()} disabled={thinking || chatIsLoading || !selectedChats.length} className="h-7 text-[11px] text-[#0c7489]">AI 重新提炼</Button></div><Textarea ref={answerEditorRef} value={answerDraft} onChange={(event) => editAnswerDraft(event.target.value)} placeholder="编辑 AI 候选答案，或直接写下你希望提交的答案。" className="mt-3 min-h-[100px] resize-y border-[#bcd5da] bg-white text-[13px] leading-5" />{pendingAnswerSuggestion && <div aria-live="polite" className="mt-3 rounded-xl border border-[#b9d8dd] bg-white p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 text-[11px] font-semibold text-[#0c7489]"><Sparkles className="size-3.5" />AI 最新候选 · 尚未覆盖</p><p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#4c6269]">{pendingAnswerSuggestion.answer}</p></div><Button variant="outline" size="sm" onClick={() => replaceAnswerDraft(pendingAnswerSuggestion.answer)} className="h-8 shrink-0 bg-white px-2.5 text-[10px] text-[#0c7489]">采用为草稿</Button></div><p className="mt-2 text-[10px] text-[#7b8d92]">当前文本框保留不变；采用后仍需确认提交。</p></div>}<div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-[#71888e]">{storedAnswer ? `修订 ${storedAnswer.revision}` : "尚未写入"}</span><Button size="sm" disabled={!answerDraft.trim() || saving} onClick={() => void saveAnswer()} className="rounded-lg">{saving ? <Loader2 className="animate-spin" /> : <Check className="size-3.5" />}{pendingAnswerReviewIds[selectedId] ? "仍然确认答案" : "确认答案"}</Button></div></section>}
          </div></div>
          <div className="border-t border-[#d9e2e4] bg-[#fbfcfc] p-4 sm:px-7"><div className="mx-auto max-w-3xl"><div className="relative rounded-2xl border border-[#bccdd1] bg-white shadow-[0_6px_22px_rgba(27,57,66,.07)] focus-within:border-[#0c7489] focus-within:ring-2 focus-within:ring-[#0c7489]/10"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="与真实 AI 设计教练讨论当前问题……" className="min-h-[82px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-[14px] shadow-none focus-visible:ring-0" /><Button aria-label="发送" size="icon" onClick={() => void send()} disabled={!draft.trim() || thinking || chatIsLoading || questionIsInitializing} className="absolute bottom-3 right-3 size-9 rounded-xl"><Send className="size-4" /></Button></div><div className="mt-2 flex items-center justify-between text-[11px] text-[#829198]"><span>Enter 发送 · Shift + Enter 换行</span><span className="max-w-[55%] truncate">{selected.guide}</span></div></div></div>
        </section>}

        <aside className="flex min-h-[620px] min-w-0 flex-col border-l border-[#d3dee0] bg-[#f4f7f8] xl:min-h-0"><div className="flex items-center justify-between border-b border-[#d3dee0] px-3 py-[14px]"><Tabs value={view} onValueChange={(value) => setView(value as "design" | "gdd" | "build")} className="w-full"><TabsList className="grid h-10 w-full grid-cols-3 bg-[#e2eaec]"><TabsTrigger value="design" className="px-1 text-[10px]"><FileText />状态</TabsTrigger><TabsTrigger value="gdd" className="px-1 text-[10px]">GDD</TabsTrigger><TabsTrigger value="build" className="px-1 text-[10px]">Build</TabsTrigger></TabsList></Tabs></div>
          {view === "design" ? <div className="scrollbar-thin flex-1 overflow-y-auto p-4"><div className="mb-4 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#71858c]">Persistent design state</p><h2 className="text-[15px] font-semibold">结构化设计方案</h2></div><span className="rounded-full border border-[#d3dee0] bg-white px-2.5 py-1 text-[11px] text-[#63777e]">{confirmedCount}/{allQuestions.length} 已确认</span></div>
            {confirmedCount === 0 && <section className="rounded-2xl border border-dashed border-[#b9c9cd] bg-white/60 p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-[#e6f0f2] text-[#0c7489]"><Check className="size-5" /></div><h3 className="mt-3 text-[14px] font-semibold">从第一个确认答案开始</h3><p className="mt-1 text-[12px] leading-5 text-[#6d7f86]">对话和正式答案会保存到研究者电脑中的独立项目。</p></section>}
            <div className="space-y-3">{stages.map((stage) => {
              const stageAnswers = stage.questions.filter((question) => workspace.answers[question.id]);
              const stageSummary = workspace.stageSummaries[stage.id];
              if (!stageAnswers.length) return null;
              return <section key={stage.id} className="rounded-2xl border border-[#d6e0e2] bg-white p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#789099]">Stage {stage.id} output</p><h3 className="mt-1 text-[14px] font-semibold">{stage.name}</h3></div><span className="text-[10px] text-[#71858c]">{stageAnswers.length}/{stage.questions.length}</span></div><div className="mt-3 space-y-3">{stageAnswers.map((question) => {
                const answer = workspace.answers[question.id];
                return <button key={question.id} onClick={() => selectQuestion(question.id, stage.id)} className="w-full border-l-2 border-[#86c3cb] pl-3 text-left"><p className="text-[10px] font-semibold text-[#0c7489]">{question.id} · {question.short}</p><p className="mt-1 line-clamp-3 text-[12px] leading-5 text-[#4c6269]">{answer.answer}</p></button>;
              })}</div>{stageSummary && <div className={`mt-3 rounded-xl border p-3 ${stageSummary.status === "stale" ? "border-[#ecd39f] bg-[#fff9ed]" : "border-[#c7dfe3] bg-[#f2fafb]"}`}><p className="text-[10px] font-semibold text-[#35636d]">AI 阶段总结{stageSummary.status === "stale" ? " · 已过期" : ""}</p><p className="mt-1 text-[11px] leading-5 text-[#536970]">{stageSummary.summary}</p>{stageSummary.keyDecisions.length > 0 && <p className="mt-1 text-[10px] leading-4 text-[#71858c]">关键决定：{stageSummary.keyDecisions.join("；")}</p>}</div>}<p className="mt-3 border-t border-[#edf1f2] pt-3 text-[10px] leading-4 text-[#839399]">阶段产出：{stage.output}</p></section>;
            })}</div><section className="mt-3 rounded-2xl border border-[#d6e0e2] bg-white p-4"><p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#789099]">Current stage output</p><h3 className="mt-1 text-[14px] font-semibold">{selectedStage.output.split("：")[0]}</h3><p className="mt-2 text-[12px] leading-5 text-[#6f8187]">{selectedStage.output}</p></section>
          </div> : view === "gdd" ? <GddPanel key={workspace.latestGdd ? `${workspace.latestGdd.id}:${workspace.latestGdd.updatedAt}` : "empty-gdd"} workspace={workspace} busy={saving} progress={gddProgress} onGenerate={() => void generateGdd()} onConfirm={() => void updateGdd({ action: "confirm" })} onBuildBrief={() => void createBuildBrief()} onSaveSection={(key, content) => void updateGdd({ action: "edit_section", sectionKey: key, content })} onVerifyFidelity={() => void updateGdd({ action: "verify_fidelity" })} /> : <BuildBriefPanel workspace={workspace} busy={saving} onCreate={() => void createBuildBrief()} />}
        </aside>
      </section>

      {!participantMode && <ProjectManager workspace={workspace} open={projectManagerOpen} busy={saving} onOpenChange={setProjectManagerOpen} onSelect={(projectId) => void switchProject(projectId)} onCreate={(title) => void projectMutation("POST", { action: "create_project", title }, true)} onRename={(projectId, title) => void projectMutation("PATCH", { action: "rename_project", projectId, title, returnProjectId: workspace.project.id })} onArchive={(projectId) => void projectMutation("PATCH", { action: "archive_project", projectId, returnProjectId: workspace.project.id })} onRestore={(projectId) => void projectMutation("PATCH", { action: "restore_project", projectId }, true)} onDelete={(projectId, confirmTitle) => void projectMutation("DELETE", { projectId, confirmTitle, returnProjectId: workspace.project.id })} />}
    </main>
  );
}
