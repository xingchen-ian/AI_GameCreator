"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Clipboard, Download, FileCheck2, FileText, Loader2, RefreshCw, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspacePayload } from "@/lib/design/types";
import { allQuestions } from "@/lib/protocol/stages";

type GddPanelProps = {
  workspace: WorkspacePayload;
  busy: boolean;
  progress: { label: string; percent: number } | null;
  onGenerate: () => void;
  onConfirm: () => void;
  onBuildBrief: () => void;
  onSaveSection: (key: string, content: string) => void;
  onVerifyFidelity: () => void;
};

export function GddPanel({ workspace, busy, progress, onGenerate, onConfirm, onBuildBrief, onSaveSection, onVerifyFidelity }: GddPanelProps) {
  const gdd = workspace.latestGdd;
  const [openSections, setOpenSections] = useState<Set<string>>(new Set((gdd?.sections ?? []).slice(0, 3).map((section) => section.key)));
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries((gdd?.sections ?? []).map((section) => [section.key, section.content])));

  const reviewReady = workspace.latestDesignReview?.status === "ready";
  const requiredIds = useMemo(() => allQuestions.map((question) => question.id).filter((id) => id !== "Q8"), []);
  const incomplete = requiredIds.filter((id) => workspace.answers[id]?.status !== "confirmed");

  if (!gdd) {
    return <div className="flex h-full flex-col overflow-y-auto p-5"><div className="rounded-3xl border border-[#cbdcdf] bg-white p-5 shadow-sm"><div className="grid size-11 place-items-center rounded-2xl bg-[#dff1f3] text-[#0c7489]"><FileText className="size-5" /></div><h2 className="mt-4 text-lg font-semibold">从审查通过的 Design State 生成 GDD</h2><p className="mt-2 text-[12px] leading-5 text-[#63777e]">GDD 不再承担设计冲突审查。系统只会根据已经通过的答案快照撰写章节，并单独检查文档是否忠实。</p><div className={`mt-4 rounded-xl border p-3 text-[12px] leading-5 ${incomplete.length || !reviewReady ? "border-[#ecd39f] bg-[#fff9ed] text-[#755625]" : "border-[#bed9c3] bg-[#f1f8f2] text-[#3d6744]"}`}>{incomplete.length ? <>还需确认：{incomplete.join("、")}。Q8 为可选题。</> : !reviewReady ? <>请先从左侧完成 Design State 全局审查。</> : <>Design State 已通过，可以生成 GDD。</>}</div>{progress && <div className="mt-4 rounded-xl border border-[#bcdde2] bg-[#f2fafb] p-3"><div className="flex items-center justify-between text-[11px] text-[#285f69]"><span>{progress.label}</span><span className="font-mono">{progress.percent}%</span></div><Progress value={progress.percent} className="mt-2 h-1.5" /></div>}<Button onClick={onGenerate} disabled={busy || incomplete.length > 0 || !reviewReady} className="mt-4 w-full rounded-xl">{busy ? <Loader2 className="animate-spin" /> : <WandSparkles />}{busy ? "正在生成" : "生成 GDD"}</Button></div></div>;
  }

  return <div className="scrollbar-thin h-full overflow-y-auto p-4">
    <section className="rounded-2xl border border-[#d2dfe2] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#71858c]">GDD v{gdd.version} · {gdd.status}</p><h2 className="mt-1 text-[16px] font-semibold">{gdd.title}</h2></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${gdd.status === "confirmed" ? "bg-[#e5f2ed] text-[#42735d]" : gdd.status === "stale" ? "bg-[#fde7e5] text-[#9b3b35]" : "bg-[#fff1d8] text-[#91651f]"}`}>{gdd.status === "confirmed" ? "已确认" : gdd.status === "stale" ? "答案已变化" : "草稿"}</span></div>
      <p className="mt-3 text-[13px] leading-5 text-[#435a62]">{gdd.oneLinePitch}</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#f3f7f8] p-3"><p className="text-[10px] text-[#71858c]">Design State</p><p className="mt-1 text-[13px] font-semibold text-[#4f7b56]">{reviewReady ? "审查通过" : "需要重审"}</p></div><div className="rounded-xl bg-[#f3f7f8] p-3"><p className="text-[10px] text-[#71858c]">文档忠实度</p><p className={`mt-1 text-[13px] font-semibold ${gdd.fidelityStatus === "ready" ? "text-[#4f7b56]" : "text-[#91651f]"}`}>{gdd.fidelityStatus === "ready" ? "已检查" : "待检查"}</p></div></div>
      {gdd.status === "stale" && <div className="mt-3 rounded-xl border border-[#e2a3a0] bg-[#fff4f3] p-3 text-[11px] leading-5 text-[#8f302c]">Design State 已更新。这一版仍可查看，但不能确认或生成 Build Brief。请重新生成以创建新版本。</div>}
      {gdd.fidelityStatus === "dirty" && gdd.status !== "stale" && <div className="mt-3 rounded-xl border border-[#ecd39f] bg-[#fff9ed] p-3 text-[11px] leading-5 text-[#755625]">GDD 章节已手动修改。请检查它是否仍忠实于已通过的 Design State，再进行确认。</div>}
      {progress && <div className="mt-4 rounded-xl border border-[#bcdde2] bg-[#f2fafb] p-3"><div className="flex items-center justify-between text-[11px] text-[#285f69]"><span>{progress.label}</span><span className="font-mono">{progress.percent}%</span></div><Progress value={progress.percent} className="mt-2 h-1.5" /></div>}
      <div className="mt-4 flex gap-2"><Button variant="outline" size="sm" onClick={onGenerate} disabled={busy || incomplete.length > 0 || !reviewReady} className="flex-1">{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}{busy ? "生成中" : "重新生成"}</Button>{gdd.status !== "confirmed" && gdd.status !== "stale" && gdd.fidelityStatus === "dirty" ? <Button size="sm" onClick={onVerifyFidelity} disabled={busy || !reviewReady} className="flex-1"><FileCheck2 />检查文档</Button> : gdd.status !== "confirmed" && gdd.status !== "stale" ? <Button size="sm" onClick={onConfirm} disabled={busy || !reviewReady} className="flex-1"><FileCheck2 />确认 GDD</Button> : gdd.status === "confirmed" ? <Button size="sm" onClick={onBuildBrief} disabled={busy} className="flex-1"><WandSparkles />生成 Brief</Button> : null}</div>
    </section>

    <section className="mt-4 space-y-2"><h3 className="text-[13px] font-semibold">GDD 章节</h3>{gdd.sections.map((section) => { const open = openSections.has(section.key); const changed = drafts[section.key] !== section.content; return <Collapsible key={section.key} open={open} onOpenChange={(nextOpen) => setOpenSections((current) => { const next = new Set(current); if (nextOpen) next.add(section.key); else next.delete(section.key); return next; })} className="rounded-2xl border border-[#d6e0e2] bg-white"><CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-3 text-left"><div><p className="text-[12px] font-semibold">{section.title}</p><p className="mt-0.5 text-[9px] text-[#7a8c92]">来源 {section.sourceQuestionIds.join(" · ")}</p></div>{open ? <ChevronDown className="size-4 text-[#71858c]" /> : <ChevronRight className="size-4 text-[#71858c]" />}</CollapsibleTrigger><CollapsibleContent className="border-t border-[#e8edef] p-3"><Textarea value={drafts[section.key] ?? section.content} onChange={(event) => setDrafts((current) => ({ ...current, [section.key]: event.target.value }))} className="min-h-[150px] resize-y text-[12px] leading-5" /><Button size="sm" onClick={() => onSaveSection(section.key, drafts[section.key])} disabled={busy || !changed || !(drafts[section.key] ?? "").trim()} className="mt-2 w-full">保存章节修改</Button></CollapsibleContent></Collapsible>; })}</section>
  </div>;
}

export function BuildBriefPanel({ workspace, busy, onCreate }: { workspace: WorkspacePayload; busy: boolean; onCreate: () => void }) {
  const brief = workspace.latestBuildBrief;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!brief) return;
    await navigator.clipboard.writeText(brief.markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  const download = () => {
    if (!brief) return;
    const url = URL.createObjectURL(new Blob([brief.markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `game-build-brief-v${brief.version}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  if (!brief || brief.status === "stale") return <div className="flex h-full flex-col overflow-y-auto p-5"><div className="rounded-3xl border border-[#cbdcdf] bg-white p-5"><div className="grid size-11 place-items-center rounded-2xl bg-[#eaf2e5] text-[#527343]"><FileCheck2 className="size-5" /></div><h2 className="mt-4 text-lg font-semibold">Build Brief</h2><p className="mt-2 text-[12px] leading-5 text-[#63777e]">确认 GDD 后，系统会生成一份可直接交给 Codex 的实现合同。第一版采用人工交接：复制或下载，不会偷偷启动外部 Agent。</p>{brief?.status === "stale" && <p className="mt-3 rounded-xl border border-[#ecd39f] bg-[#fff9ed] p-3 text-[11px] text-[#755625]">现有 Brief 已因设计变化而过期。</p>}<Button onClick={onCreate} disabled={busy || workspace.latestGdd?.status !== "confirmed"} className="mt-4 w-full">{busy ? <Loader2 className="animate-spin" /> : <WandSparkles />}生成 Build Brief</Button></div></div>;
  return <div className="scrollbar-thin h-full overflow-y-auto p-4"><section className="rounded-2xl border border-[#d2dfe2] bg-white p-4"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] text-[#71858c]">BUILD BRIEF v{brief.version}</p><h2 className="mt-1 text-[15px] font-semibold">来自 GDD v{brief.gddVersion}</h2></div><span className="rounded-full bg-[#e5f2ed] px-2 py-1 text-[10px] font-semibold text-[#42735d]">READY</span></div><p className="mt-3 text-[11px] leading-5 text-[#63777e]">把这份 Markdown 交给 Codex，即可开始独立的游戏实现任务。</p><div className="mt-3 grid grid-cols-2 gap-2"><Button size="sm" onClick={() => void copy()}><Clipboard />{copied ? "已复制" : "复制给 Codex"}</Button><Button variant="outline" size="sm" onClick={download}><Download />下载 .md</Button></div></section><pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#d6e0e2] bg-[#10252d] p-4 font-mono text-[10px] leading-5 text-[#d8e7ea]">{brief.markdown}</pre></div>;
}
