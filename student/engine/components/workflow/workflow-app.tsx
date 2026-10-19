"use client";

import { useEffect, useMemo, useState } from "react";
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
  Gamepad2,
  GitCompareArrows,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BuildBriefPanel, GddPanel } from "@/components/workflow/gdd-panels";
import { GddReviewWorkspace } from "@/components/workflow/gdd-review-workspace";
import { ProjectManager } from "@/components/workflow/project-manager";
import type { DesignReviewChange, GddSection, WorkspacePayload } from "@/lib/design/types";
import { gddSectionPlan } from "@/lib/design/gdd";
import { allQuestions, stages, type Question } from "@/lib/protocol/stages";
import { getQuestionScope } from "@/lib/protocol/question-scope";

type Suggestion = { id?: string; answer: string; structuredData: Record<string, unknown> };
type GddProgress = { label: string; percent: number };
type GeneratedStageSummary = { stageId: number; summary: string; keyDecisions: string[]; openQuestions: string[] };
const GDD_REVIEW_ID = "GDD_GLOBAL";

function defaultGddIssueId(workspace: WorkspacePayload | null) {
  const issues = workspace?.latestDesignReview?.issues ?? [];
  return issues.find((issue) => issue.status === "open" || issue.status === "pending_verification")?.id ?? issues[0]?.id ?? null;
}

function gddIssueChatKey(issueId: string) {
  return `DESIGN_ISSUE:${issueId}`;
}

const starterPrompts = [
  "先不用急着把它想成游戏。找一件你熟悉、其中又总有变化或需要做决定的事情。你脑中最先出现的是哪个画面？",
  "我们先把这段经历像录像一样回放。它从什么信号开始？接着你做了什么？最后怎样才算结束？",
  "回忆一下身体和情绪发生变化的瞬间：什么时候你会紧张、犹豫、专注，或者突然松一口气？",
  "哪些环节不能只是等它发生，而需要你观察情况、做决定或立刻行动？",
];

function starterFor(question: Question) {
  const index = Number(question.id.slice(1)) - 1;
  return index < starterPrompts.length ? starterPrompts[index] : `${question.guide} 先说说你现在最直觉的想法；我只围绕当前问题追问，其他想法会先放进“稍后讨论”。`;
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
      response = await fetch("/api/gdd", {
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

type ParkedInsight = { content: string; suggestedQuestionId: string };

function readParkedInsights(data?: Record<string, unknown>): ParkedInsight[] {
  if (!Array.isArray(data?.parkedInsights)) return [];
  return data.parkedInsights.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as { content?: unknown; suggestedQuestionId?: unknown };
    if (typeof value.content !== "string" || typeof value.suggestedQuestionId !== "string") return [];
    if (!allQuestions.some((question) => question.id === value.suggestedQuestionId)) return [];
    return [{ content: value.content, suggestedQuestionId: value.suggestedQuestionId }];
  });
}

function PrototypeGame({ prototype }: { prototype: WorkspacePayload["latestPrototype"] }) {
  const spec = prototype?.spec;
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(spec?.timeLimit ?? 30);
  const [score, setScore] = useState(0);
  const [focus, setFocus] = useState(100);
  const [positions, setPositions] = useState([16, 38, 62, 82]);

  useEffect(() => {
    if (!running || !spec) return;
    const timer = window.setInterval(() => {
      setTime((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
      setFocus((value) => Math.max(0, value - spec.stressDrain));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, spec]);

  if (!spec || !prototype) {
    return <div className="grid h-full min-h-[500px] place-items-center bg-[#07191f] p-8 text-center text-white"><div><Gamepad2 className="mx-auto size-10 text-[#72d2dd]" /><h3 className="mt-3 text-lg font-semibold">还没有可玩的版本</h3><p className="mt-2 max-w-[260px] text-sm leading-6 text-[#91adb4]">完成 Q6、Q10、Q13 和 Q16，并确认所有受影响答案后即可生成。</p></div></div>;
  }

  const restart = () => {
    setTime(spec.timeLimit);
    setScore(0);
    setFocus(100);
    setPositions([16, 38, 62, 82]);
    setRunning(true);
  };
  const labels = spec.itemLabels.length ? spec.itemLabels.slice(0, 4) : ["行动", "选择", "观察", "应对"];
  while (labels.length < 4) labels.push(`行动${labels.length + 1}`);
  const actionLabel = { collect: "收集", sort: "归类", avoid: "应对", balance: "调整" }[spec.playerVerb];
  const handleAction = (index: number) => {
    if (!running) return;
    setScore((value) => value + spec.rewardPerAction);
    setFocus((value) => Math.min(100, value + Math.max(5, spec.stressDrain * 2)));
    setPositions((value) => value.map((position, itemIndex) => itemIndex === index ? 10 + ((position * 7 + score / 10 + index * 17) % 78) : position));
  };
  const won = score >= spec.targetScore;

  return (
    <div className="flex h-full min-h-[500px] flex-col bg-[#07191f] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#6ba6b1]">Generated specification · v{prototype.version}</p><h3 className="max-w-[250px] truncate text-[14px] font-semibold">{spec.title}</h3></div><Button variant="ghost" size="icon-sm" onClick={restart} className="text-white hover:bg-white/10 hover:text-white" aria-label="重新开始"><RotateCcw /></Button></div>
      <div className="grid grid-cols-3 gap-px bg-white/10 text-center"><div className="bg-[#0b242c] py-2"><p className="font-mono text-[9px] text-[#78a3ac]">TIME</p><p className="font-mono text-lg" style={{ color: spec.accentColor }}>{time}</p></div><div className="bg-[#0b242c] py-2"><p className="font-mono text-[9px] text-[#78a3ac]">SCORE / TARGET</p><p className="font-mono text-lg" style={{ color: spec.primaryColor }}>{score} / {spec.targetScore}</p></div><div className="bg-[#0b242c] py-2"><p className="font-mono text-[9px] text-[#78a3ac]">FOCUS</p><p className="font-mono text-lg">{focus}%</p></div></div>
      <div className="relative m-4 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_50%_10%,#184553_0,#0d2932_38%,#07191f_78%)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-white/10"><div className="h-full transition-all" style={{ width: `${(time / spec.timeLimit) * 100}%`, background: spec.primaryColor }} /></div>
        <div className="absolute left-4 top-5 max-w-[84%] text-[11px] leading-4 text-[#a9c7cd]">{spec.objective}</div>
        {positions.map((left, index) => <button key={index} onClick={() => handleAction(index)} className="absolute grid min-h-14 w-16 -translate-x-1/2 place-items-center rounded-2xl border bg-[#113843] px-1 text-center shadow-[0_8px_22px_rgba(0,0,0,.3)] transition hover:scale-105 active:scale-95" style={{ left: `${left}%`, top: `${29 + index * 14}%`, borderColor: `${spec.primaryColor}99` }}><span className="max-w-full truncate text-[11px] font-semibold">{labels[index]}</span><span className="font-mono text-[8px] text-[#91c7cf]">{actionLabel}</span></button>)}
        {!running && <div className="absolute inset-0 grid place-items-center bg-[#07191f]/86 p-6 text-center backdrop-blur-sm"><div><Gamepad2 className="mx-auto size-9" style={{ color: spec.primaryColor }} /><h4 className="mt-3 text-lg font-semibold">{time === 0 ? (won ? "目标达成" : "本轮结束") : "规格已编译为安全原型"}</h4>{time === 0 && <p className="mt-1 font-mono text-sm" style={{ color: spec.accentColor }}>{score} / {spec.targetScore}</p>}<p className="mx-auto mt-2 max-w-[270px] text-[12px] leading-5 text-[#9bbbc1]">{spec.experienceClaim}</p><Button onClick={restart} className="mt-4 rounded-xl text-[#10252d] hover:brightness-110" style={{ background: spec.accentColor }}><Play className="fill-current" />开始试玩</Button></div></div>}
      </div>
      <p className="px-4 pb-4 text-center text-[10px] text-[#5f8992]">进程假设：{spec.progression}</p>
    </div>
  );
}

export function WorkflowApp({ displayName }: { displayName: string }) {
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [selectedId, setSelectedId] = useState("Q1");
  const [selectedGddIssueId, setSelectedGddIssueId] = useState<string | null>(null);
  const [openStages, setOpenStages] = useState<Set<number>>(new Set([1]));
  const [draft, setDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [view, setView] = useState<"design" | "gdd" | "build" | "prototype">("design");
  const [runDialog, setRunDialog] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gddProgress, setGddProgress] = useState<GddProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyWorkspace = (payload: WorkspacePayload) => {
    setWorkspace(payload);
    window.localStorage.setItem("game-workflow.active-project", payload.project.id);
    const activeQuestionId = payload.project.activeQuestionId || "Q1";
    setSelectedId(activeQuestionId);
    setSelectedGddIssueId(defaultGddIssueId(payload));
    setAnswerDraft(payload.answers[activeQuestionId]?.answer ?? "");
    setDraft("");
    setSuggestions({});
    const question = allQuestions.find((item) => item.id === activeQuestionId);
    if (question) setOpenStages(new Set([question.stageId]));
    setError(null);
  };

  const loadWorkspace = async (projectId?: string | null) => {
    setLoading(true);
    try {
      const requestedId = projectId ?? window.localStorage.getItem("game-workflow.active-project");
      const query = requestedId ? `?projectId=${encodeURIComponent(requestedId)}` : "";
      const payload = await readJson<WorkspacePayload>(await fetch(`/api/workspace${query}`, { cache: "no-store" }));
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
      const payload = await readJson<WorkspacePayload>(await fetch("/api/workspace", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
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

  const selected = allQuestions.find((question) => question.id === selectedId) ?? allQuestions[0];
  const isGlobalReview = selectedId === GDD_REVIEW_ID;
  const selectedStage = stages.find((stage) => stage.id === selected.stageId)!;
  const selectedScope = getQuestionScope(selected.id);
  const storedAnswer = workspace?.answers[selectedId];
  const selectedStructuredData = suggestions[selectedId]?.structuredData ?? storedAnswer?.structuredData;
  const parkedInsights = readParkedInsights(selectedStructuredData);
  const selectedChats = workspace?.chats[selectedId] ?? [];
  const displayedChats = selectedChats.length ? selectedChats : [{ id: "starter", role: "assistant" as const, text: starterFor(selected), createdAt: "" }];
  const confirmedCount = Object.values(workspace?.answers ?? {}).filter((answer) => answer.status === "confirmed").length;
  const progress = Math.round((confirmedCount / allQuestions.length) * 100);

  const selectQuestion = (id: string, stageId: number) => {
    setSelectedId(id);
    setAnswerDraft(workspace?.answers[id]?.answer ?? suggestions[id]?.answer ?? "");
    setDraft("");
    setOpenStages((current) => new Set([...current, stageId]));
    if (workspace) void fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_active", projectId: workspace.project.id, questionId: id }) });
  };

  const selectGlobalReview = () => {
    setSelectedId(GDD_REVIEW_ID);
    setSelectedGddIssueId((current) => current && workspace?.latestDesignReview?.issues.some((issue) => issue.id === current) ? current : defaultGddIssueId(workspace));
    setDraft("");
    setView("gdd");
    if (workspace) void fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_active", projectId: workspace.project.id, questionId: GDD_REVIEW_ID }) });
  };

  const selectGddIssue = (issueId: string) => {
    setSelectedGddIssueId(issueId);
    setDraft("");
  };

  const sendGddReview = async (mode: "analyze" | "chat" = "chat", issueId = selectedGddIssueId, contentOverride?: string) => {
    const content = contentOverride?.trim() ?? draft.trim();
    if (!workspace || !issueId || (mode === "chat" && !content) || thinking) return;
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<{
        userMessage: WorkspacePayload["chats"][string][number] | null;
        assistantMessage: WorkspacePayload["chats"][string][number];
        changes: DesignReviewChange[];
      }>(await fetch("/api/ai/gdd-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, issueId, mode, content: mode === "chat" ? content : undefined }) }));
      const chatKey = gddIssueChatKey(issueId);
      setWorkspace((current) => current ? {
        ...current,
        chats: { ...current.chats, [chatKey]: [...(current.chats[chatKey] ?? []), ...(payload.userMessage ? [payload.userMessage] : []), payload.assistantMessage] },
        designReviewChanges: [...current.designReviewChanges, ...payload.changes],
      } : current);
      if (mode === "chat") setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "全局审查暂时无法响应。");
      await loadWorkspace();
    } finally {
      setThinking(false);
    }
  };

  const updateReviewChange = async (change: DesignReviewChange, action: "apply" | "dismiss", proposedContent?: string) => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await fetch("/api/ai/gdd-review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, changeId: change.id, action, proposedContent }) }));
      setWorkspace(payload);
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
      const payload = await readJson<WorkspacePayload>(await fetch("/api/design-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, action }) }));
      setWorkspace(payload);
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
      const payload = await readJson<WorkspacePayload>(await fetch("/api/design-review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, issueId, action: accepted ? "accept" : "reopen", note }) }));
      setWorkspace(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "问题状态更新失败。");
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (isGlobalReview) return sendGddReview("chat");
    const content = draft.trim();
    if (!workspace || !content || thinking) return;
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<{
        userMessage: WorkspacePayload["chats"][string][number];
        assistantMessage: WorkspacePayload["chats"][string][number];
        suggestion: Suggestion;
      }>(await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, questionId: selectedId, content }) }));
      setWorkspace((current) => current ? { ...current, chats: { ...current.chats, [selectedId]: [...(current.chats[selectedId] ?? []), payload.userMessage, payload.assistantMessage] } } : current);
      setSuggestions((current) => ({ ...current, [selectedId]: payload.suggestion }));
      setAnswerDraft(payload.suggestion.answer);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI 暂时无法响应。");
      await loadWorkspace();
    } finally {
      setThinking(false);
    }
  };

  const synthesize = async () => {
    if (!workspace) return;
    setThinking(true);
    setError(null);
    try {
      const payload = await readJson<Suggestion>(await fetch("/api/ai/synthesize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, questionId: selectedId }) }));
      setSuggestions((current) => ({ ...current, [selectedId]: payload }));
      setAnswerDraft(payload.answer);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法提炼答案。");
    } finally {
      setThinking(false);
    }
  };

  const saveAnswer = async () => {
    if (!workspace || !answerDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await readJson<WorkspacePayload>(await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_answer", projectId: workspace.project.id, questionId: selectedId, answer: answerDraft.trim(), structuredData: suggestions[selectedId]?.structuredData ?? {}, suggestionId: suggestions[selectedId]?.id }) }));
      setWorkspace(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  };

  const runPrototype = async () => {
    if (!workspace) return;
    setSaving(true);
    setError(null);
    try {
      const prototype = await readJson<NonNullable<WorkspacePayload["latestPrototype"]>>(await fetch("/api/prototypes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id }) }));
      setWorkspace((current) => current ? { ...current, project: { ...current.project, prototypeVersion: prototype.version }, latestPrototype: prototype } : current);
      setView("prototype");
      setRunDialog(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "原型生成失败。");
      setRunDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const generateGdd = async () => {
    if (!workspace || saving) return;
    setSaving(true);
    setError(null);
    setView("gdd");
    setGddProgress({ label: "1/4 正在整理六个阶段", percent: 12 });
    try {
      const summary = await postGddStep<{
        snapshotKey: string;
        result: { title: string; oneLinePitch: string; stageSummaries: GeneratedStageSummary[] };
      }>({ projectId: workspace.project.id, action: "stage_summaries" });

      setGddProgress({ label: "2/4 正在分批撰写 GDD 章节", percent: 30 });
      const sectionKeys = gddSectionPlan.map(([key]) => key);
      const batches = [sectionKeys.slice(0, 6), sectionKeys.slice(6)];
      let completedBatches = 0;
      const sectionResults = await Promise.all(batches.map(async (keys) => {
        const response = await postGddStep<{ snapshotKey: string; result: { sections: GddSection[] } }>({
          projectId: workspace.project.id,
          action: "section_batch",
          snapshotKey: summary.snapshotKey,
          sectionKeys: keys,
        });
        completedBatches += 1;
        setGddProgress({ label: `2/4 已完成 ${completedBatches}/2 批章节`, percent: 30 + completedBatches * 18 });
        return response.result.sections;
      }));
      const sections = sectionResults.flat();

      setGddProgress({ label: "3/4 正在检查 GDD 是否忠实于答案", percent: 72 });
      const fidelity = await postGddStep<{ snapshotKey: string; result: { sections: GddSection[] } }>({
        projectId: workspace.project.id,
        action: "fidelity",
        snapshotKey: summary.snapshotKey,
        sections,
      });

      setGddProgress({ label: "4/4 正在保存审查通过的 GDD", percent: 94 });
      const payload = await postGddStep<WorkspacePayload>({
        projectId: workspace.project.id,
        action: "finalize",
        snapshotKey: summary.snapshotKey,
        title: summary.result.title,
        oneLinePitch: summary.result.oneLinePitch,
        stageSummaries: summary.result.stageSummaries,
        sections: fidelity.result.sections,
      });
      setWorkspace(payload);
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
      const payload = await readJson<WorkspacePayload>(await fetch("/api/gdd", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id, ...body }) }));
      setWorkspace(payload);
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
      const payload = await readJson<WorkspacePayload>(await fetch("/api/build-brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: workspace.project.id }) }));
      setWorkspace(payload);
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

  if (loading && !workspace) return <main className="grid min-h-screen place-items-center bg-[#10252d] text-white"><div className="text-center"><Loader2 className="mx-auto size-7 animate-spin text-[#72d2dd]" /><p className="mt-3 text-sm text-[#a8bec4]">正在载入正式项目…</p></div></main>;
  if (!workspace) return <main className="grid min-h-screen place-items-center bg-[#10252d] px-6 text-white"><section className="max-w-md text-center"><AlertTriangle className="mx-auto size-8 text-[#f0a63a]" /><h1 className="mt-3 text-xl font-semibold">项目暂时无法载入</h1><p className="mt-2 text-sm text-[#b7cbd0]">{error}</p><Button onClick={() => void loadWorkspace()} className="mt-5">重试</Button></section></main>;

  return (
    <main className="flex min-h-screen flex-col bg-[#f4f7f8] xl:h-screen xl:overflow-hidden">
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#cfdadd] bg-white px-4 shadow-[0_1px_0_rgba(16,37,45,.04)] sm:px-5">
        <button onClick={() => setProjectManagerOpen(true)} className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:bg-[#f2f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c7489]/30"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#10252d] text-[#72d2dd]"><Sparkles className="size-[18px]" /></div><div className="min-w-0 pr-2"><div className="flex items-center gap-2"><h1 className="max-w-[220px] truncate text-[16px] font-semibold">{workspace.project.title}</h1><ChevronDown className="size-3.5 text-[#74868c]" /></div><p className="text-[12px] text-[#6a7c83]">{displayName} · {workspace.projects.filter((project) => project.status === "active").length} 个项目</p></div></button>
        <div className="flex items-center gap-2 sm:gap-3"><div className="hidden w-44 md:block"><div className="mb-1 flex justify-between text-[11px] text-[#60747c]"><span>已确认设计</span><span>{progress}%</span></div><Progress value={progress} className="h-1.5 bg-[#dfe8ea]" /></div><span className="hidden items-center gap-1.5 text-[12px] text-[#60747c] lg:flex"><Cloud className="size-3.5 text-[#6b8f4e]" />{saving ? "同步中" : "云端已保存"}</span><Button variant="outline" size="sm" aria-label="管理项目" onClick={() => setProjectManagerOpen(true)} disabled={saving} className="h-9 rounded-xl px-2.5 sm:px-3"><FolderOpen className="size-3.5" /><span className="hidden lg:inline">项目</span></Button><Button onClick={() => setRunDialog(true)} className="h-9 rounded-xl bg-[#f0a63a] px-3 text-[#253039] shadow-[0_3px_0_#c9821d] hover:bg-[#f5b34b] sm:px-4"><Play className="size-4 fill-current" /><span className="hidden sm:inline">Run prototype</span><span className="sm:hidden">Run</span></Button></div>
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
                return <button key={question.id} onClick={() => selectQuestion(question.id, stage.id)} className={`group flex w-full gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${selectedId === question.id ? "bg-[#21434c] shadow-[inset_3px_0_0_#5cc3ce]" : "hover:bg-[#183740]"}`}><span className={`mt-0.5 font-mono text-[10px] ${selectedId === question.id ? "text-[#7bd5de]" : "text-[#6e8c94]"}`}>{question.id}</span><span className={`line-clamp-2 flex-1 text-[12px] leading-[1.55] ${selectedId === question.id ? "text-white" : "text-[#afc1c6]"}`}>{question.short}</span>{answer?.status === "confirmed" ? <CheckCircle2 className="mt-0.5 size-3.5 text-[#8fbd6b]" /> : workspace.chats[question.id]?.length ? <Circle className="mt-1 size-2.5 fill-[#5cc3ce] text-[#5cc3ce]" /> : null}</button>;
              })}</CollapsibleContent></Collapsible>;
            })}
            <button onClick={selectGlobalReview} className={`relative mt-2 flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition ${isGlobalReview ? "bg-[#21434c] shadow-[inset_3px_0_0_#f0a63a]" : "hover:bg-[#183740]"}`}><span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full bg-[#10252d] ${isGlobalReview ? "border-2 border-[#f0a63a] text-[#ffd07a]" : workspace.latestDesignReview?.status === "ready" ? "border-2 border-[#82ae60] text-[#a8d782]" : workspace.latestDesignReview ? "border-2 border-[#f0a63a] text-[#ffd07a]" : "border border-[#47636a] text-[#8ca5ac]"}`}><GitCompareArrows className="size-3.5" /></span><div className="min-w-0 flex-1"><p className={`text-[13px] font-semibold ${isGlobalReview ? "text-white" : "text-[#a9bdc2]"}`}>Design State 全局审查</p><p className="text-[10px] text-[#66838b]">{!workspace.latestDesignReview ? "等待开始审查" : workspace.latestDesignReview.status === "ready" ? "已通过，可生成 GDD" : `${workspace.latestDesignReview.issues.filter((issue) => issue.status === "open" || issue.status === "pending_verification").length} 个待处理`}</p></div><ChevronRight className="size-4 text-[#6f8c94]" /></button>
          </div>
        </aside>

        {isGlobalReview ? <GddReviewWorkspace workspace={workspace} selectedIssueId={selectedGddIssueId} draft={draft} thinking={thinking} saving={saving} onSelectIssue={selectGddIssue} onDraftChange={setDraft} onSend={() => void sendGddReview("chat")} onAnalyze={(issueId) => void sendGddReview("analyze", issueId)} onRefine={(issueId) => void sendGddReview("chat", issueId, "请根据我们对这个冲突的全部讨论，提炼出最合适的最终答案。给出完整替换文本，并让我决定是否接受；不要直接修改。")} onApply={(change, content) => void updateReviewChange(change, "apply", content)} onDismiss={(change) => void updateReviewChange(change, "dismiss")} onStartReview={() => void runDesignReview("start")} onVerifyReview={() => void runDesignReview("verify")} onAcceptIssue={(issueId, note) => void setDesignIssueAccepted(issueId, true, note)} onReopenIssue={(issueId) => void setDesignIssueAccepted(issueId, false)} onGenerateGdd={() => void generateGdd()} onOpenQuestion={(questionId) => { const question = allQuestions.find((item) => item.id === questionId); if (question) selectQuestion(question.id, question.stageId); }} /> : <section className="flex min-h-[720px] min-w-0 flex-col bg-white xl:min-h-0">
          <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-[#d9e2e4] bg-[#10252d] px-3 py-2 xl:hidden">{stages.map((stage) => <button key={stage.id} onClick={() => selectQuestion(stage.questions[0].id, stage.id)} className={`shrink-0 rounded-lg px-3 py-2 text-[12px] ${selected.stageId === stage.id ? "bg-[#2b5360] text-white" : "text-[#9db5bb]"}`}>{stage.id}. {stage.name}</button>)}<button onClick={selectGlobalReview} className="shrink-0 rounded-lg px-3 py-2 text-[12px] text-[#ffd07a]">全局审查</button></div>
          <div className="border-b border-[#d9e2e4] px-5 py-4 sm:px-7"><div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.12em] text-[#0c7489]"><span>Stage {selected.stageId}</span><span className="text-[#a4b2b7]">/</span><span>{selected.id} · {selected.short}</span></div></div><h2 className="max-w-3xl text-[20px] font-semibold leading-[1.45] tracking-[-.015em] text-[#14232b] sm:text-[21px]">{selected.prompt}</h2><p className="mt-2 flex max-w-3xl items-start gap-2 text-[11px] leading-5 text-[#71858c]"><span className="mt-0.5 shrink-0 rounded bg-[#e7f2f4] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[#0c7489]">本题边界</span>{selectedScope.focus}</p></div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6 sm:px-7"><div className="mx-auto max-w-3xl space-y-5">
            {displayedChats.map((message) => message.role === "assistant" ? <div key={message.id} className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Sparkles className="size-4" /></div><div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3.5 text-[14px] leading-6 text-[#30454d]">{message.text}</div></div> : <div key={message.id} className="flex justify-end"><div className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#0c7489] px-4 py-3 text-[14px] leading-6 text-white shadow-sm">{message.text}</div></div>)}
            {thinking && <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Loader2 className="size-4 animate-spin" /></div><div className="rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3 text-[13px] text-[#6c7e84]">AI 正在结合完整 Design State 推理…</div></div>}
            {(selectedChats.length > 0 || storedAnswer) && <section className="rounded-2xl border border-[#a9cfd5] bg-[#eef8f9] p-4 sm:ml-11"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[13px] font-semibold text-[#164e59]"><WandSparkles className="size-4" />正式答案</p><p className="mt-1 text-[11px] text-[#6b858b]">只收录当前问题的答案；保存后直接成为最新设计状态。</p></div><Button variant="ghost" size="sm" onClick={() => void synthesize()} disabled={thinking || !selectedChats.length} className="h-7 text-[11px] text-[#0c7489]">AI 重新提炼</Button></div><Textarea value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)} placeholder="与 AI 讨论后提炼，或直接写下当前问题的确认答案。" className="mt-3 min-h-[100px] resize-y border-[#bcd5da] bg-white text-[13px] leading-5" />{parkedInsights.length > 0 && <div className="mt-3 rounded-xl border border-[#e8ca8d] bg-[#fff8e9] p-3"><p className="flex items-center gap-2 text-[11px] font-semibold text-[#765722]"><BookmarkPlus className="size-3.5" />稍后讨论 · 不会写入本题答案</p><div className="mt-2 space-y-2">{parkedInsights.map((insight, index) => { const target = allQuestions.find((question) => question.id === insight.suggestedQuestionId); return <div key={`${insight.suggestedQuestionId}-${index}`} className="flex items-start justify-between gap-2 rounded-lg bg-white/70 p-2"><p className="text-[10px] leading-4 text-[#705d38]">{insight.content}</p><Button variant="outline" size="sm" onClick={() => target && selectQuestion(target.id, target.stageId)} className="h-7 shrink-0 bg-white px-2 text-[10px]">去 {insight.suggestedQuestionId}</Button></div>; })}</div></div>}<div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-[#71888e]">{storedAnswer ? `修订 ${storedAnswer.revision}` : "尚未写入"}</span><Button size="sm" disabled={!answerDraft.trim() || saving} onClick={() => void saveAnswer()} className="rounded-lg">{saving ? <Loader2 className="animate-spin" /> : <Check className="size-3.5" />}确认写入方案</Button></div></section>}
          </div></div>
          <div className="border-t border-[#d9e2e4] bg-[#fbfcfc] p-4 sm:px-7"><div className="mx-auto max-w-3xl"><div className="relative rounded-2xl border border-[#bccdd1] bg-white shadow-[0_6px_22px_rgba(27,57,66,.07)] focus-within:border-[#0c7489] focus-within:ring-2 focus-within:ring-[#0c7489]/10"><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="与真实 AI 设计教练讨论当前问题……" className="min-h-[82px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-[14px] shadow-none focus-visible:ring-0" /><Button aria-label="发送" size="icon" onClick={() => void send()} disabled={!draft.trim() || thinking} className="absolute bottom-3 right-3 size-9 rounded-xl"><Send className="size-4" /></Button></div><div className="mt-2 flex items-center justify-between text-[11px] text-[#829198]"><span>Enter 发送 · Shift + Enter 换行</span><span className="max-w-[55%] truncate">{selected.guide}</span></div></div></div>
        </section>}

        <aside className="flex min-h-[620px] min-w-0 flex-col border-l border-[#d3dee0] bg-[#f4f7f8] xl:min-h-0"><div className="flex items-center justify-between border-b border-[#d3dee0] px-3 py-[14px]"><Tabs value={view} onValueChange={(value) => setView(value as "design" | "gdd" | "build" | "prototype")} className="w-full"><TabsList className="grid h-10 w-full grid-cols-4 bg-[#e2eaec]"><TabsTrigger value="design" className="px-1 text-[10px]"><FileText />状态</TabsTrigger><TabsTrigger value="gdd" className="px-1 text-[10px]">GDD</TabsTrigger><TabsTrigger value="build" className="px-1 text-[10px]">Build</TabsTrigger><TabsTrigger value="prototype" className="px-1 text-[10px]"><Gamepad2 />试玩</TabsTrigger></TabsList></Tabs></div>
          {view === "design" ? <div className="scrollbar-thin flex-1 overflow-y-auto p-4"><div className="mb-4 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#71858c]">Persistent design state</p><h2 className="text-[15px] font-semibold">结构化设计方案</h2></div><span className="rounded-full border border-[#d3dee0] bg-white px-2.5 py-1 text-[11px] text-[#63777e]">{confirmedCount}/23 已确认</span></div>
            {workspace.issues.length > 0 && <section className="mb-3 rounded-2xl border border-[#ecd39f] bg-[#fff9ed] p-4"><p className="flex items-center gap-2 text-[12px] font-semibold text-[#755625]"><AlertTriangle className="size-4" />{workspace.issues.length} 个设计检查项</p><div className="mt-2 space-y-1.5">{workspace.issues.slice(0, 5).map((issue) => <button key={`${issue.type}-${issue.questionId}`} onClick={() => { const question = allQuestions.find((item) => item.id === issue.questionId)!; selectQuestion(question.id, question.stageId); }} className="block text-left text-[11px] leading-4 text-[#816738] hover:underline">{issue.message}</button>)}</div></section>}
            {confirmedCount === 0 && <section className="rounded-2xl border border-dashed border-[#b9c9cd] bg-white/60 p-5 text-center"><div className="mx-auto grid size-10 place-items-center rounded-full bg-[#e6f0f2] text-[#0c7489]"><Check className="size-5" /></div><h3 className="mt-3 text-[14px] font-semibold">从第一个确认答案开始</h3><p className="mt-1 text-[12px] leading-5 text-[#6d7f86]">对话和正式答案会保存到云端个人项目。</p></section>}
            <div className="space-y-3">{stages.map((stage) => {
              const stageAnswers = stage.questions.filter((question) => workspace.answers[question.id]);
              const stageSummary = workspace.stageSummaries[stage.id];
              if (!stageAnswers.length) return null;
              return <section key={stage.id} className="rounded-2xl border border-[#d6e0e2] bg-white p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.13em] text-[#789099]">Stage {stage.id} output</p><h3 className="mt-1 text-[14px] font-semibold">{stage.name}</h3></div><span className="text-[10px] text-[#71858c]">{stageAnswers.length}/{stage.questions.length}</span></div><div className="mt-3 space-y-3">{stageAnswers.map((question) => {
                const answer = workspace.answers[question.id];
                return <button key={question.id} onClick={() => selectQuestion(question.id, stage.id)} className="w-full border-l-2 border-[#86c3cb] pl-3 text-left"><p className="text-[10px] font-semibold text-[#0c7489]">{question.id} · {question.short}</p><p className="mt-1 line-clamp-3 text-[12px] leading-5 text-[#4c6269]">{answer.answer}</p></button>;
              })}</div>{stageSummary && <div className={`mt-3 rounded-xl border p-3 ${stageSummary.status === "stale" ? "border-[#ecd39f] bg-[#fff9ed]" : "border-[#c7dfe3] bg-[#f2fafb]"}`}><p className="text-[10px] font-semibold text-[#35636d]">AI 阶段总结{stageSummary.status === "stale" ? " · 已过期" : ""}</p><p className="mt-1 text-[11px] leading-5 text-[#536970]">{stageSummary.summary}</p>{stageSummary.keyDecisions.length > 0 && <p className="mt-1 text-[10px] leading-4 text-[#71858c]">关键决定：{stageSummary.keyDecisions.join("；")}</p>}</div>}<p className="mt-3 border-t border-[#edf1f2] pt-3 text-[10px] leading-4 text-[#839399]">阶段产出：{stage.output}</p></section>;
            })}</div><section className="mt-3 rounded-2xl border border-[#d6e0e2] bg-white p-4"><p className="font-mono text-[10px] uppercase tracking-[.13em] text-[#789099]">Current stage output</p><h3 className="mt-1 text-[14px] font-semibold">{selectedStage.output.split("：")[0]}</h3><p className="mt-2 text-[12px] leading-5 text-[#6f8187]">{selectedStage.output}</p></section>
          </div> : view === "gdd" ? <GddPanel key={workspace.latestGdd ? `${workspace.latestGdd.id}:${workspace.latestGdd.updatedAt}` : "empty-gdd"} workspace={workspace} busy={saving} progress={gddProgress} onGenerate={() => void generateGdd()} onConfirm={() => void updateGdd({ action: "confirm" })} onBuildBrief={() => void createBuildBrief()} onSaveSection={(key, content) => void updateGdd({ action: "edit_section", sectionKey: key, content })} onVerifyFidelity={() => void updateGdd({ action: "verify_fidelity" })} /> : view === "build" ? <BuildBriefPanel workspace={workspace} busy={saving} onCreate={() => void createBuildBrief()} /> : <PrototypeGame key={workspace.latestPrototype?.version ?? 0} prototype={workspace.latestPrototype} />}
        </aside>
      </section>

      <Dialog open={runDialog} onOpenChange={setRunDialog}><DialogContent className="rounded-2xl border-[#cedadd] sm:max-w-[540px]"><DialogHeader><div className="mb-2 grid size-11 place-items-center rounded-2xl bg-[#e1f1f3] text-[#0c7489]"><WandSparkles className="size-5" /></div><DialogTitle>编译新的可玩 Prototype</DialogTitle><DialogDescription className="leading-6">AI 会把已确认的 Design State 转换成严格的 Game Specification；安全运行时只解释规格，不执行模型生成的代码。</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#d8e2e4] bg-[#f6f9fa] p-3"><p className="text-[11px] text-[#71858c]">已确认问题</p><p className="mt-1 text-xl font-semibold">{confirmedCount}<span className="text-sm font-normal text-[#71858c]"> / 23</span></p></div><div className="rounded-xl border border-[#d8e2e4] bg-[#f6f9fa] p-3"><p className="text-[11px] text-[#71858c]">下一个版本</p><p className="mt-1 text-xl font-semibold">v{workspace.project.prototypeVersion + 1}</p></div></div>{workspace.issues.length ? <div className="rounded-xl border border-[#efd6a6] bg-[#fff8ea] p-3 text-[12px] leading-5 text-[#745725]"><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />暂时不能生成</p><ul className="mt-2 space-y-1 pl-5">{workspace.issues.map((issue) => <li key={`${issue.type}-${issue.questionId}`} className="list-disc">{issue.message}</li>)}</ul></div> : <div className="flex gap-3 rounded-xl border border-[#bed9c3] bg-[#f1f8f2] p-3 text-[12px] leading-5 text-[#3d6744]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><p>核心信息完整，可以生成新的规格和版本快照。</p></div>}<DialogFooter><DialogClose asChild><Button variant="outline">继续设计</Button></DialogClose><Button onClick={() => void runPrototype()} disabled={workspace.issues.length > 0 || saving} className="bg-[#f0a63a] text-[#253039] hover:bg-[#f5b34b]">{saving ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}生成并试玩</Button></DialogFooter></DialogContent></Dialog>
      <ProjectManager workspace={workspace} open={projectManagerOpen} busy={saving} onOpenChange={setProjectManagerOpen} onSelect={(projectId) => void switchProject(projectId)} onCreate={(title) => void projectMutation("POST", { action: "create_project", title }, true)} onRename={(projectId, title) => void projectMutation("PATCH", { action: "rename_project", projectId, title, returnProjectId: workspace.project.id })} onArchive={(projectId) => void projectMutation("PATCH", { action: "archive_project", projectId, returnProjectId: workspace.project.id })} onRestore={(projectId) => void projectMutation("PATCH", { action: "restore_project", projectId }, true)} onDelete={(projectId, confirmTitle) => void projectMutation("DELETE", { projectId, confirmTitle, returnProjectId: workspace.project.id })} />
    </main>
  );
}
