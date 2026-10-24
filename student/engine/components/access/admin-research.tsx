"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Clipboard, Download, Eye, KeyRound, Loader2, LogOut, Plus, ShieldCheck, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Participant = {
  id: string;
  code: string;
  status: "active" | "revoked";
  createdAt: string;
  lastSeenAt: string | null;
  project: null | {
    id: string;
    title: string;
    status: string;
    activeQuestionId: string;
    confirmedAnswerCount: number;
    updatedAt: string;
  };
};

type BackupStatus = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  createdAt?: string;
  attemptedAt?: string;
  filename?: string;
  sizeBytes?: number;
  sha256?: string;
  error?: string;
  message?: string;
};

type ProjectDetail = {
  participantCode: string;
  data: {
    project: {
      title: string;
      status: string;
      activeQuestionId: string;
      createdAt: string;
      updatedAt: string;
    };
    currentAnswers: Array<{
      questionId: string;
      revision: number;
      status: string;
      answer: string;
      updatedAt: string;
    }>;
    messages: Array<{ id: string }>;
    aiSuggestions: Array<{ id: string }>;
    latestGdd?: unknown;
  };
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `请求失败（${response.status}）`);
  return payload;
}

export function AdminResearch({ initialAuthenticated }: { initialAuthenticated: boolean }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [code, setCode] = useState("");
  const [latestLink, setLatestLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => void fetch("/api/admin/research", { cache: "no-store", signal: controller.signal })
      .then((response) => readJson<{ participants: Participant[]; publicUrl: string | null; backupStatus: BackupStatus | null }>(response))
      .then((payload) => {
        setParticipants(payload.participants);
        setPublicUrl(payload.publicUrl);
        setBackupStatus(payload.backupStatus);
        timer = setTimeout(load, payload.publicUrl ? 30_000 : 2_000);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "读取失败。");
      });
    load();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [authenticated]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await readJson(await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }));
      setAuthenticated(true);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败。");
    } finally {
      setBusy(false);
    }
  };

  const createParticipant = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    setLatestLink("");
    try {
      const payload = await readJson<{ token: string; joinPath: string; participants: Participant[]; publicUrl: string | null }>(await fetch("/api/admin/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }));
      setParticipants(payload.participants);
      setPublicUrl(payload.publicUrl);
      setLatestLink(`${payload.publicUrl ?? window.location.origin}${payload.joinPath}`);
      setCode("");
      setCopied(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建失败。");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (participantId: string, status: "active" | "revoked") => {
    setBusy(true);
    setError("");
    try {
      const payload = await readJson<{ participants: Participant[]; publicUrl: string | null }>(await fetch("/api/admin/research", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", participantId, status }),
      }));
      setParticipants(payload.participants);
      setPublicUrl(payload.publicUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新失败。");
    } finally {
      setBusy(false);
    }
  };

  const resetLink = async (participantId: string) => {
    setBusy(true);
    setError("");
    setLatestLink("");
    try {
      const payload = await readJson<{ joinPath: string; participants: Participant[]; publicUrl: string | null }>(await fetch("/api/admin/research", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_access", participantId }),
      }));
      setParticipants(payload.participants);
      setPublicUrl(payload.publicUrl);
      setLatestLink(`${payload.publicUrl ?? window.location.origin}${payload.joinPath}`);
      setCopied(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "重新生成链接失败。");
    } finally {
      setBusy(false);
    }
  };

  const viewProject = async (participantId: string) => {
    setProjectLoading(true);
    setError("");
    try {
      const payload = await readJson<ProjectDetail>(await fetch(`/api/admin/research/${encodeURIComponent(participantId)}`, {
        cache: "no-store",
      }));
      setProjectDetail(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "读取项目失败。");
    } finally {
      setProjectLoading(false);
    }
  };

  const exportAll = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/research-export", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? `导出失败（${response.status}）`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `study-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败。");
    } finally {
      setBusy(false);
    }
  };

  if (!authenticated) return <main className="grid min-h-screen place-items-center bg-[#10252d] px-6 text-white"><form onSubmit={login} className="w-full max-w-sm rounded-3xl border border-[#31515a] bg-[#17343d] p-7"><div className="grid size-12 place-items-center rounded-2xl bg-[#dff1f3] text-[#0c7489]"><ShieldCheck /></div><h1 className="mt-5 text-2xl font-semibold">研究管理入口</h1><p className="mt-2 text-sm text-[#adc2c8]">请输入本机配置的管理员密码。</p><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus className="mt-5 h-11 bg-white text-[#18333c]" placeholder="管理员密码" />{error && <p className="mt-3 text-xs text-[#ffc5bd]">{error}</p>}<Button className="mt-4 h-11 w-full" disabled={busy || !password}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />}登录</Button></form></main>;

  return <main className="min-h-screen bg-[#f4f7f8] text-[#20343c]">
    <header className="border-b border-[#d7e1e3] bg-white px-5 py-4"><div className="mx-auto flex max-w-5xl items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#0c7489]">Research console</p><h1 className="mt-1 text-xl font-semibold">参与者与研究数据</h1></div><div className="flex gap-2"><Button variant="outline" asChild><a href="/admin/workspace"><UserRound />我的工作区</a></Button><Button variant="outline" disabled={busy} onClick={() => void exportAll()}>{busy ? <Loader2 className="animate-spin" /> : <Download />}导出全部数据</Button><Button variant="ghost" onClick={() => void fetch("/api/admin/session", { method: "DELETE" }).then(() => setAuthenticated(false))}><LogOut />退出</Button></div></div></header>
    <div className="mx-auto max-w-5xl space-y-5 p-5">
      <section className="rounded-2xl border border-[#d5e0e2] bg-white p-5"><h2 className="font-semibold">生成参与者专属链接</h2><p className="mt-1 text-xs text-[#6c7e84]">编号用于匿名研究标识；专属链接只会显示这一次。</p><div className={`mt-3 rounded-xl px-3 py-2 text-xs ${publicUrl ? "bg-[#e8f5ea] text-[#3f6f47]" : "bg-[#fff4df] text-[#8a6125]"}`}>{publicUrl ? <>公网已连接：<span className="font-mono">{publicUrl}</span></> : <>正在等待公网连接。请使用 <span className="font-mono font-semibold">npm run study:start</span> 启动研究测试。</>}</div><div className={`mt-2 rounded-xl px-3 py-2 text-xs ${backupStatus?.ok ? "bg-[#e8f5ea] text-[#3f6f47]" : "bg-[#fff1ef] text-[#913c34]"}`}>{backupStatus?.ok ? backupStatus.skipped ? backupStatus.message : <>最近备份校验正常：{new Date(backupStatus.createdAt ?? "").toLocaleString("zh-CN")} · {backupStatus.filename}</> : <>备份异常：{backupStatus?.error ?? "尚未完成首次备份，请使用 study:start 启动或运行 npm run backup。"}</>}</div><form onSubmit={createParticipant} className="mt-4 flex gap-2"><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="例如 P001" maxLength={32} /><Button disabled={busy || !code.trim() || !publicUrl}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}生成</Button></form>{latestLink && <div className="mt-4 rounded-xl border border-[#abd2d8] bg-[#eef8f9] p-3"><p className="text-xs font-semibold text-[#0c7489]">请立即保存并发送此链接</p><div className="mt-2 flex gap-2"><Input readOnly value={latestLink} className="bg-white font-mono text-xs" /><Button variant="outline" onClick={() => void navigator.clipboard.writeText(latestLink).then(() => setCopied(true))}>{copied ? <Check /> : <Clipboard />}{copied ? "已复制" : "复制"}</Button></div></div>}</section>
      {error && <p role="alert" className="rounded-xl border border-[#e4bbb5] bg-[#fff1ef] p-3 text-sm text-[#913c34]">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-[#d5e0e2] bg-white"><div className="flex items-center justify-between border-b border-[#e1e8e9] px-5 py-4"><h2 className="font-semibold">参与者</h2><span className="text-xs text-[#71858c]">{participants.length} 人</span></div><div className="divide-y divide-[#e7edef]">{participants.map((participant) => <div key={participant.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7f2f4] text-[#0c7489]"><UserRound className="size-4" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-mono text-sm font-semibold">{participant.code}</p><span className={`rounded-full px-2 py-0.5 text-[10px] ${participant.status === "active" ? "bg-[#e7f4df] text-[#4b762d]" : "bg-[#eee] text-[#777]"}`}>{participant.status === "active" ? "启用" : "停用"}</span></div><p className="mt-1 truncate text-xs text-[#71858c]">{participant.project ? `${participant.project.confirmedAnswerCount}/21 题 · ${participant.project.title} · 最近 ${new Date(participant.project.updatedAt).toLocaleString("zh-CN")}` : "尚未进入测试"}</p></div></div><div className="flex gap-2">{participant.project && <Button size="sm" variant="outline" disabled={busy || projectLoading} onClick={() => void viewProject(participant.id)}>{projectLoading ? <Loader2 className="animate-spin" /> : <Eye />}查看项目</Button>}<Button size="sm" variant="outline" disabled={busy || !publicUrl} onClick={() => void resetLink(participant.id)}>新链接</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void setStatus(participant.id, participant.status === "active" ? "revoked" : "active")}>{participant.status === "active" ? "停用" : "重新启用"}</Button></div></div>)}{participants.length === 0 && <p className="p-8 text-center text-sm text-[#71858c]">尚未创建参与者。</p>}</div></section>
    </div>
    {projectDetail && <div className="fixed inset-0 z-50 overflow-y-auto bg-[#10252d]/55 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`${projectDetail.participantCode} 项目详情`}><div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-[#f4f7f8] shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#d7e1e3] bg-white px-5 py-4"><div><p className="font-mono text-xs font-semibold text-[#0c7489]">{projectDetail.participantCode}</p><h2 className="mt-1 text-xl font-semibold">{projectDetail.data.project.title}</h2><p className="mt-1 text-xs text-[#71858c]">当前 {projectDetail.data.project.activeQuestionId} · {projectDetail.data.currentAnswers.length}/21 个已保存答案 · {projectDetail.data.messages.length} 条消息 · {projectDetail.data.aiSuggestions.length} 条 AI 建议</p></div><Button size="icon" variant="ghost" onClick={() => setProjectDetail(null)} aria-label="关闭项目详情"><X /></Button></header><div className="space-y-3 p-5"><div className="rounded-xl border border-[#cfe0e3] bg-[#eef7f8] px-4 py-3 text-xs text-[#4d6b73]">管理员只读查看；不会以参与者身份写入或修改答案。</div>{projectDetail.data.currentAnswers.map((answer) => <article key={answer.questionId} className="rounded-2xl border border-[#d5e0e2] bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-mono text-sm font-semibold text-[#0c7489]">{answer.questionId}</h3><span className="text-[11px] text-[#71858c]">{answer.status === "confirmed" ? "已确认" : "草稿"} · r{answer.revision}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#314850]">{answer.answer}</p></article>)}{projectDetail.data.currentAnswers.length === 0 && <p className="rounded-2xl border border-[#d5e0e2] bg-white p-8 text-center text-sm text-[#71858c]">该参与者尚未填写答案。</p>}</div></div></div>}
  </main>;
}
