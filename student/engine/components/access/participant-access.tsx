"use client";

import { FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ParticipantAccess({ invalidLink = false }: { invalidLink?: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(invalidLink ? "这个专属链接无效或已停用。" : "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      let accessToken = token.trim();
      try {
        const pastedUrl = new URL(accessToken);
        accessToken = decodeURIComponent(pastedUrl.pathname.split("/").filter(Boolean).at(-1) ?? accessToken);
      } catch {
        // A raw access token is also accepted.
      }
      const response = await fetch("/api/access/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "无法进入测试。");
      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法进入测试。");
    } finally {
      setBusy(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-[#10252d] px-6 text-white">
    <section className="w-full max-w-sm rounded-3xl border border-[#31515a] bg-[#17343d] p-7 shadow-2xl">
      <div className="grid size-12 place-items-center rounded-2xl bg-[#dff1f3] text-[#0c7489]"><KeyRound className="size-5" /></div>
      <h1 className="mt-5 text-2xl font-semibold">进入游戏设计测试</h1>
      <p className="mt-2 text-sm leading-6 text-[#adc2c8]">打开研究者发给你的专属链接，或在下方粘贴完整链接/访问码。进度会自动保存。</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Input value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" autoCapitalize="none" placeholder="粘贴专属链接或访问码" className="h-11 border-[#52717a] bg-white text-[#18333c]" />
        {error && <p role="alert" className="rounded-xl border border-[#a85b50] bg-[#4d2928] px-3 py-2 text-xs text-[#ffd9d4]">{error}</p>}
        <Button type="submit" disabled={busy || !token.trim()} className="h-11 w-full rounded-xl bg-[#5cc3ce] text-[#10252d] hover:bg-[#77d2db]">
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}进入测试
        </Button>
      </form>
      <p className="mt-5 text-[11px] leading-5 text-[#78969e]">请勿转发专属链接。关闭网页不会删除已经保存的内容。</p>
    </section>
  </main>;
}
