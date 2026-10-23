"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronRight, Lightbulb, Loader2, MessageSquareText, Play, RotateCcw, Send, ShieldCheck, Sparkles, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage, DesignReviewChange, DesignReviewIssue, WorkspacePayload } from "@/lib/design/types";
import { allQuestions, stages } from "@/lib/protocol/stages";

type Props = {
  workspace: WorkspacePayload;
  selectedIssueId: string | null;
  draft: string;
  thinking: boolean;
  loadingChat: boolean;
  saving: boolean;
  onSelectIssue: (issueId: string) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onAnalyze: (issueId: string) => void;
  onRefine: (issueId: string) => void;
  onApply: (change: DesignReviewChange, content: string) => void;
  onDismiss: (change: DesignReviewChange) => void;
  onStartReview: () => void;
  onVerifyReview: () => void;
  onAcceptIssue: (issueId: string, note: string) => void;
  onReopenIssue: (issueId: string) => void;
  onOpenQuestion: (questionId: string) => void;
};

const changeStatusLabel = { proposed: "待确认", applied: "已写入", dismissed: "未采用", stale: "已过期" };
const issueStatusLabel = { open: "待处理", pending_verification: "待验证", resolved: "已验证解决", accepted: "有意保留", superseded: "已替代" };
const severityLabel = { blocker: "阻断", conflict: "冲突" };

function sortedIssues(issues: DesignReviewIssue[]) {
  const statusOrder = { open: 0, pending_verification: 1, accepted: 2, resolved: 3, superseded: 4 };
  return [...issues].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (a.severity === "blocker" ? -1 : 1));
}

function reviewKey(issueId: string) {
  return `DESIGN_ISSUE:${issueId}`;
}

function issueClass(issue: DesignReviewIssue) {
  if (issue.status === "resolved") return "bg-[#e5f2ed] text-[#42735d]";
  if (issue.status === "accepted" || issue.status === "superseded") return "bg-[#edf0f1] text-[#697a80]";
  if (issue.status === "pending_verification") return "bg-[#e4f2f4] text-[#35636d]";
  return issue.severity === "blocker" ? "bg-[#fde8e6] text-[#9b4038]" : "bg-[#fff0d3] text-[#8b611d]";
}

function ConflictRow({ issue, selected, onSelect }: { issue: DesignReviewIssue; selected: boolean; onSelect: () => void }) {
  return <button onClick={onSelect} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-[#0c7489] bg-[#edf8f9] shadow-[0_0_0_2px_rgba(12,116,137,.08)]" : "border-[#d9e2e4] bg-white hover:border-[#a8cbd1]"}`}>
    <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold ${issueClass(issue)}`}>{severityLabel[issue.severity]}</span>
    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#30454d]">{issue.title}</span>
    <span className="shrink-0 font-mono text-[9px] text-[#71858c]">{issue.questionIds.slice(0, 3).join(" ↔ ")}</span>
    <span className="shrink-0 text-[9px] font-semibold text-[#829198]">{issueStatusLabel[issue.status]}</span>
    <ChevronRight className={`size-3.5 shrink-0 ${selected ? "text-[#0c7489]" : "text-[#9babad]"}`} />
  </button>;
}

function ChangeCard({ change, saving, onApply, onDismiss, onOpenQuestion }: {
  change: DesignReviewChange;
  saving: boolean;
  onApply: (change: DesignReviewChange, content: string) => void;
  onDismiss: (change: DesignReviewChange) => void;
  onOpenQuestion: (questionId: string) => void;
}) {
  const [editedContent, setEditedContent] = useState(change.proposedContent);
  const question = allQuestions.find((item) => item.id === change.targetQuestionId);
  return <article className={`mt-3 overflow-hidden rounded-2xl border ${change.status === "proposed" ? "border-[#9bcbd2] bg-white" : "border-[#d8e1e3] bg-[#f7f9f9] opacity-75"}`}>
    <div className="flex items-center justify-between gap-3 border-b border-[#e2e9ea] px-4 py-3"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#0c7489]">修改建议</p><h4 className="mt-1 text-[13px] font-semibold text-[#20343c]">{change.targetQuestionId} · {question?.short ?? "设计问题"}</h4></div><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${change.status === "proposed" ? "bg-[#e7f2f4] text-[#0c7489]" : "bg-[#eceff0] text-[#6d7d82]"}`}>{changeStatusLabel[change.status]}</span></div>
    <div className="p-4"><div className="grid gap-2 lg:grid-cols-2"><div className="rounded-xl border border-[#ead1ce] bg-[#fff7f6] p-3"><p className="text-[9px] font-semibold text-[#a35a53]">原答案 · r{change.beforeRevision}</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#6c5350]">{change.beforeContent}</p></div><div className="rounded-xl border border-[#bddbc4] bg-[#f3faf5] p-3"><p className="text-[9px] font-semibold text-[#4d7656]">正式答案（可修改）</p><Textarea value={editedContent} onChange={(event) => setEditedContent(event.target.value)} disabled={change.status !== "proposed"} className="mt-2 min-h-[128px] resize-y border-[#b9d7c0] bg-white text-[11px] leading-5 text-[#405e47] disabled:cursor-default disabled:opacity-100" /></div></div>
      <p className="mt-2 text-[10px] leading-4 text-[#71858c]">写入后只会标记为“待验证”，不会提前宣称冲突已经解决。</p>
      <div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => onOpenQuestion(change.targetQuestionId)} className="h-8 text-[10px]">打开原节点<ChevronRight /></Button>{change.status === "proposed" && <><Button variant="outline" size="sm" disabled={saving} onClick={() => onDismiss(change)} className="h-8 text-[10px]"><X />暂不采用</Button><Button size="sm" disabled={saving || !editedContent.trim()} onClick={() => onApply(change, editedContent.trim())} className="h-8 text-[10px]">{saving ? <Loader2 className="animate-spin" /> : <Check />}写入并等待验证</Button></>}</div>
    </div>
  </article>;
}

export function GddReviewWorkspace(props: Props) {
  const { workspace, selectedIssueId, draft, thinking, loadingChat, saving, onSelectIssue, onDraftChange, onSend, onAnalyze, onRefine, onApply, onDismiss, onStartReview, onVerifyReview, onAcceptIssue, onReopenIssue, onOpenQuestion } = props;
  const review = workspace.latestDesignReview;
  const issues = sortedIssues(review?.issues ?? []);
  const selectedIssue = issues.find((issue) => issue.id === selectedIssueId) ?? issues[0] ?? null;
  const messages: ChatMessage[] = selectedIssue ? workspace.chats[reviewKey(selectedIssue.id)] ?? [] : [];
  const activeIssues = issues.filter((issue) => issue.status === "open" || issue.status === "pending_verification");
  const changesByMessage = new Map<string, DesignReviewChange[]>();
  for (const change of workspace.designReviewChanges) {
    const messageChanges = changesByMessage.get(change.messageId) ?? [];
    messageChanges.push(change);
    changesByMessage.set(change.messageId, messageChanges);
  }
  const relatedAnswers = (selectedIssue?.questionIds ?? []).map((questionId) => ({ questionId, question: allQuestions.find((question) => question.id === questionId), answer: workspace.answers[questionId] }));
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedIssue?.id, thinking]);

  const acceptIssue = () => {
    if (!selectedIssue) return;
    const note = window.prompt("请简短说明为什么这是有意保留的设计决定：")?.trim();
    if (note) onAcceptIssue(selectedIssue.id, note);
  };

  return <section className="flex min-h-[720px] min-w-0 flex-col bg-white xl:min-h-0">
    <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-[#d9e2e4] bg-[#10252d] px-3 py-2 xl:hidden">{stages.map((stage) => <button key={stage.id} onClick={() => onOpenQuestion(stage.questions[0].id)} className="shrink-0 rounded-lg px-3 py-2 text-[12px] text-[#9db5bb]">{stage.id}. {stage.name}</button>)}<span className="shrink-0 rounded-lg bg-[#6b4b20] px-3 py-2 text-[12px] text-white">全局审查</span></div>
    <div className="border-b border-[#d9e2e4] px-5 py-4 sm:px-7"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#0c7489]">DESIGN STATE REVIEW</p><h2 className="mt-1 text-[21px] font-semibold tracking-[-.015em] text-[#14232b]">Design State 全局审查</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${review?.status === "ready" ? "bg-[#e5f2ed] text-[#42735d]" : review ? "bg-[#fff1d8] text-[#91651f]" : "bg-[#eceff0] text-[#6d7d82]"}`}>{!review ? "尚未审查" : review.status === "ready" ? "审查已通过" : `${activeIssues.length} 个待处理`}</span></div><p className="mt-2 text-[11px] leading-5 text-[#71858c]">先稳定 21 道设计答案，再生成 GDD。修改可以集中完成，系统只在你点击验证时重新调用全局审查。</p></div>
    <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-7"><div className="mx-auto max-w-3xl space-y-5">
      {!review && <section className="rounded-2xl border border-[#c7dfe3] bg-[#f2fafb] p-5 text-center"><ShieldCheck className="mx-auto size-8 text-[#0c7489]" /><h3 className="mt-3 text-[15px] font-semibold">先检查 Design State，再生成 GDD</h3><p className="mx-auto mt-2 max-w-lg text-[12px] leading-5 text-[#63777e]">AI 只检查答案之间真正不能同时成立的决定，不会因为信息缺失或措辞不同制造问题。</p><Button onClick={onStartReview} disabled={saving} className="mt-4">{saving ? <Loader2 className="animate-spin" /> : <Play />}开始全局审查</Button></section>}

      {review?.status === "ready" && <section className="rounded-2xl border border-[#bed9c3] bg-[#f1f8f2] p-4 text-[#3d6744]"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><div><p className="text-[12px] font-semibold">当前 Design State 已通过审查</p><p className="mt-1 text-[11px] leading-5">所有冲突均已验证解决或由你明确选择保留。GDD 的生成与版本管理统一放在右侧 GDD 面板。</p></div></div></section>}

      {review && review.status !== "ready" && <section className="flex items-center justify-between gap-3 rounded-2xl border border-[#ecd39f] bg-[#fff9ed] p-4 text-[#755625]"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div><p className="text-[12px] font-semibold">{review.status === "dirty" ? "本轮答案已经修改，等待统一验证" : "本轮审查仍有待处理问题"}</p><p className="mt-1 text-[11px] leading-5">可以继续处理多个问题；准备好后只验证问题清单，不会重写 GDD。</p></div></div><Button size="sm" onClick={onVerifyReview} disabled={saving} className="shrink-0">{saving ? <Loader2 className="animate-spin" /> : <ShieldCheck />}验证本轮修改</Button></section>}

      {review && <section><div className="mb-2 flex items-center justify-between"><h3 className="text-[13px] font-semibold text-[#243a42]">稳定问题清单</h3><span className="text-[10px] text-[#71858c]">审查 v{review.version} · {issues.length} 项</span></div><div className="space-y-1.5">{issues.map((issue) => <ConflictRow key={issue.id} issue={issue} selected={issue.id === selectedIssue?.id} onSelect={() => onSelectIssue(issue.id)} />)}{!issues.length && <div className="rounded-xl border border-dashed border-[#b9c9cd] bg-[#f7fafb] p-4 text-center text-[12px] text-[#71858c]">没有发现需要处理的设计冲突。</div>}</div></section>}

      {selectedIssue && <section className="rounded-2xl border border-[#cbdadd] bg-[#f9fbfb] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#0c7489]">当前问题</p><h3 className="mt-1 text-[15px] font-semibold leading-6 text-[#20343c]">{selectedIssue.title}</h3><p className="mt-2 text-[11px] leading-5 text-[#5d7178]">{selectedIssue.evidence}</p></div><span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold ${issueClass(selectedIssue)}`}>{issueStatusLabel[selectedIssue.status]}</span></div><div className={`mt-3 grid gap-2 ${relatedAnswers.length >= 3 ? "lg:grid-cols-3" : relatedAnswers.length === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>{relatedAnswers.map(({ questionId, question, answer }) => <button key={questionId} onClick={() => onOpenQuestion(questionId)} className="rounded-xl border border-[#d7e1e3] bg-white p-3 text-left transition hover:border-[#8bbfc7]"><p className="font-mono text-[9px] font-semibold text-[#0c7489]">{questionId} · {question?.short ?? "设计问题"}</p><p className="mt-1 line-clamp-5 whitespace-pre-wrap text-[11px] leading-5 text-[#50666d]">{answer?.answer || "（尚未填写）"}</p></button>)}</div><div className="mt-3 rounded-xl bg-white p-3 text-[11px] leading-5 text-[#5d7178]"><p><span className="font-semibold text-[#30454d]">影响：</span>{selectedIssue.whyItMatters}</p>{selectedIssue.options.length > 0 && <p className="mt-1"><span className="font-semibold text-[#30454d]">可选方向：</span>{selectedIssue.options.join("；")}</p>}</div>{selectedIssue.status === "open" && <div className="mt-3 flex justify-end"><Button variant="outline" size="sm" disabled={saving} onClick={acceptIssue}>这是有意设计，保留</Button></div>}{selectedIssue.status === "accepted" && <div className="mt-3 flex items-center justify-between rounded-xl bg-[#edf0f1] p-3 text-[11px] text-[#607177]"><span>{selectedIssue.resolutionNote}</span><Button variant="ghost" size="sm" onClick={() => onReopenIssue(selectedIssue.id)}><RotateCcw />重新处理</Button></div>}</section>}

      {selectedIssue && selectedIssue.status !== "resolved" && selectedIssue.status !== "superseded" && <section className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 className="text-[13px] font-semibold text-[#243a42]">AI 分析与修改策略</h3>{messages.length > 0 && <Button variant="outline" size="sm" disabled={thinking || loadingChat} onClick={() => onRefine(selectedIssue.id)} className="h-8 text-[10px]"><WandSparkles />重新提炼建议</Button>}</div>
        {loadingChat && <div className="flex items-center gap-2 text-[12px] text-[#71858c]"><Loader2 className="size-4 animate-spin" />正在载入本项讨论…</div>}
        {!messages.length && !thinking && !loadingChat && <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dce5e7] bg-[#f7fafb] px-4 py-3.5"><div className="flex gap-3"><Lightbulb className="mt-1 size-4 shrink-0 text-[#0c7489]" /><p className="text-[13px] leading-6 text-[#30454d]">问题清单已经包含证据。只有需要修改建议时才调用 AI，不会在打开每一项时自动请求。</p></div><Button variant="ghost" size="sm" onClick={() => onAnalyze(selectedIssue.id)} className="shrink-0 text-[10px] text-[#0c7489]">讨论修改<ChevronRight /></Button></div>}
        {messages.map((message) => message.role === "assistant" ? <div key={message.id} className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Sparkles className="size-4" /></div><div className="min-w-0 max-w-[94%] flex-1"><div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3 text-[13px] leading-6 text-[#30454d]">{message.text}</div>{(changesByMessage.get(message.id) ?? []).map((change) => <ChangeCard key={change.id} change={change} saving={saving} onApply={onApply} onDismiss={onDismiss} onOpenQuestion={onOpenQuestion} />)}</div></div> : <div key={message.id} className="flex justify-end"><div className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#0c7489] px-4 py-3 text-[13px] leading-6 text-white shadow-sm">{message.text}</div></div>)}
        {thinking && <div className="flex gap-3"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#dff1f3] text-[#0c7489]"><Loader2 className="size-4 animate-spin" /></div><div className="rounded-2xl rounded-tl-sm border border-[#dce5e7] bg-[#f7fafb] px-4 py-3 text-[13px] text-[#6c7e84]">正在生成一条可执行的修改建议…</div></div>}
        <div ref={chatEndRef} />
      </section>}
    </div></div>
    <div className="border-t border-[#d9e2e4] bg-[#fbfcfc] p-4 sm:px-7"><div className="mx-auto max-w-3xl"><div className="relative rounded-2xl border border-[#bccdd1] bg-white shadow-[0_6px_22px_rgba(27,57,66,.07)] focus-within:border-[#0c7489] focus-within:ring-2 focus-within:ring-[#0c7489]/10"><Textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} disabled={loadingChat || !selectedIssue || selectedIssue.status === "resolved" || selectedIssue.status === "superseded"} placeholder={selectedIssue ? "继续讨论当前问题，或说明你更希望保留哪一边……" : "先开始全局审查"} className="min-h-[76px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-[14px] shadow-none focus-visible:ring-0" /><Button aria-label="发送" size="icon" onClick={onSend} disabled={!draft.trim() || thinking || loadingChat || !selectedIssue} className="absolute bottom-3 right-3 size-9 rounded-xl"><Send className="size-4" /></Button></div><div className="mt-2 flex items-center justify-between text-[11px] text-[#829198]"><span>只处理当前稳定问题 · 写入后统一验证</span><span className="flex items-center gap-1"><MessageSquareText className="size-3" />{messages.length} 条消息</span></div></div></div>
  </section>;
}
