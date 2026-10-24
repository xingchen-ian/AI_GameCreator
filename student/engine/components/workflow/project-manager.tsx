"use client";

import { useMemo, useState } from "react";
import { ArchiveRestore, Check, Download, FolderOpen, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { workflowFetch } from "@/lib/client/workflow-fetch";
import type { ProjectSummary, WorkspacePayload } from "@/lib/design/types";
import { allQuestions } from "@/lib/protocol/stages";

type ProjectManagerProps = {
  workspace: WorkspacePayload;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (projectId: string) => void;
  onCreate: (title: string) => void;
  onRename: (projectId: string, title: string) => void;
  onArchive: (projectId: string) => void;
  onRestore: (projectId: string) => void;
  onDelete: (projectId: string, title: string) => void;
};

function projectMeta(project: ProjectSummary) {
  const outputs = [project.gddVersion ? `GDD v${project.gddVersion}` : null, project.buildBriefVersion ? `Brief v${project.buildBriefVersion}` : null].filter(Boolean);
  return `${project.confirmedAnswerCount}/${allQuestions.length} 已确认${outputs.length ? ` · ${outputs.join(" · ")}` : ""}`;
}

export function ProjectManager(props: ProjectManagerProps) {
  const { workspace, open, busy, onOpenChange, onSelect, onCreate, onRename, onArchive, onRestore, onDelete } = props;
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<ProjectSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const activeProjects = useMemo(() => workspace.projects.filter((project) => project.status === "active"), [workspace.projects]);
  const archivedProjects = useMemo(() => workspace.projects.filter((project) => project.status === "archived"), [workspace.projects]);

  const exportProject = async (project: ProjectSummary) => {
    setExportingId(project.id);
    setExportError(null);
    try {
      const response = await workflowFetch(`/api/research-export?projectId=${encodeURIComponent(project.id)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "导出失败。");
      }
      const filename = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "research-export.json";
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : "导出失败。");
    } finally {
      setExportingId(null);
    }
  };

  const exportButton = (project: ProjectSummary) => <Button size="icon-sm" variant="ghost" aria-label="导出研究数据" title="导出研究数据（JSON）" disabled={busy || exportingId !== null} onClick={() => void exportProject(project)}>{exportingId === project.id ? <Loader2 className="animate-spin" /> : <Download />}</Button>;

  const beginRename = (project: ProjectSummary) => {
    setEditingId(project.id);
    setEditingTitle(project.title);
  };

  return <>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[86vh] overflow-y-auto rounded-2xl border-[#cedadd] sm:max-w-[680px]">
        <DialogHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-2xl bg-[#e1f1f3] text-[#0c7489]"><FolderOpen className="size-5" /></div>
          <DialogTitle>项目工作区</DialogTitle>
          <DialogDescription>创建并切换多个独立游戏设计。每个项目分别保存答案、对话、GDD 和 Build Brief。</DialogDescription>
        </DialogHeader>

        <section className="rounded-2xl border border-[#cddde0] bg-[#f5f9fa] p-3">
          <p className="text-[11px] font-semibold text-[#51666d]">新建项目</p>
          <div className="mt-2 flex gap-2"><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && newTitle.trim() && !busy) { onCreate(newTitle.trim()); setNewTitle(""); } }} maxLength={80} placeholder="例如：地铁通勤游戏" className="bg-white" /><Button onClick={() => { onCreate(newTitle.trim() || "未命名游戏"); setNewTitle(""); }} disabled={busy} className="shrink-0"><Plus />新建</Button></div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-[12px] font-semibold text-[#30454d]">我的项目</h3><span className="text-[10px] text-[#7a8d93]">{activeProjects.length} 个</span></div>
          <div className="space-y-2">{activeProjects.map((project) => {
            const current = project.id === workspace.project.id;
            const editing = editingId === project.id;
            return <div key={project.id} className={`rounded-2xl border p-3 ${current ? "border-[#72b7c1] bg-[#eef8f9]" : "border-[#d8e2e4] bg-white"}`}>
              {editing ? <div className="flex gap-2"><Input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} maxLength={80} autoFocus /><Button size="icon-sm" aria-label="保存名称" disabled={busy || !editingTitle.trim()} onClick={() => { onRename(project.id, editingTitle.trim()); setEditingId(null); }}><Check /></Button><Button size="icon-sm" variant="ghost" aria-label="取消" onClick={() => setEditingId(null)}><X /></Button></div> : <div className="flex items-start justify-between gap-3"><button onClick={() => !current && onSelect(project.id)} className="min-w-0 flex-1 text-left"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-[#20343c]">{project.title}</p>{current && <span className="shrink-0 rounded-md bg-[#d8eeee] px-1.5 py-0.5 text-[9px] font-semibold text-[#0c7489]">当前</span>}</div><p className="mt-1 text-[10px] text-[#71858c]">{projectMeta(project)}</p></button><div className="flex shrink-0 gap-1">{exportButton(project)}<Button size="icon-sm" variant="ghost" aria-label="重命名" disabled={busy} onClick={() => beginRename(project)}><Pencil /></Button><Button size="icon-sm" variant="ghost" aria-label="移到回收站" disabled={busy} onClick={() => setArchiveTarget(project)} className="text-[#a04b43] hover:text-[#8e382f]"><Trash2 /></Button></div></div>}
            </div>;
          })}</div>
        </section>

        {archivedProjects.length > 0 && <section>
          <div className="mb-2 flex items-center justify-between"><h3 className="text-[12px] font-semibold text-[#607177]">回收站</h3><span className="text-[10px] text-[#8a989d]">{archivedProjects.length} 个</span></div>
          <div className="space-y-2">{archivedProjects.map((project) => <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#dfe5e6] bg-[#f7f8f8] p-3"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#52666d]">{project.title}</p><p className="mt-1 text-[10px] text-[#89979b]">{projectMeta(project)}</p></div><div className="flex shrink-0 gap-1">{exportButton(project)}<Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(project.id)}><ArchiveRestore />恢复</Button><Button size="icon-sm" variant="ghost" aria-label="永久删除" disabled={busy} onClick={() => setDeleteTarget(project)} className="text-[#a04b43] hover:text-[#8e382f]"><Trash2 /></Button></div></div>)}</div>
        </section>}
        {exportError && <p role="alert" className="rounded-xl border border-[#e7c1bc] bg-[#fdf2f1] p-2.5 text-[11px] text-[#8e382f]">{exportError}</p>}
        <p className="text-[10px] leading-4 text-[#7a8d93]">导出的研究数据不含账号邮箱，但包含项目里的对话和答案。分享前请确认参与者已同意，并检查其中的个人信息。</p>
        {busy && <div className="flex items-center justify-center gap-2 py-2 text-[11px] text-[#6c7e84]"><Loader2 className="size-3.5 animate-spin" />正在同步项目…</div>}
      </DialogContent>
    </Dialog>

    <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(next) => { if (!next) setArchiveTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>把项目移到回收站？</AlertDialogTitle><AlertDialogDescription>“{archiveTarget?.title}”会从项目列表隐藏，但答案、对话和生成内容都会保留，之后可以恢复。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={() => { if (archiveTarget) onArchive(archiveTarget.id); setArchiveTarget(null); }}>移到回收站</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>永久删除这个项目？</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.title}”及其答案、聊天、GDD、Brief 和历史生成记录将永久删除，无法恢复。</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={busy} onClick={() => { if (deleteTarget) onDelete(deleteTarget.id, deleteTarget.title); setDeleteTarget(null); }}>永久删除</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
