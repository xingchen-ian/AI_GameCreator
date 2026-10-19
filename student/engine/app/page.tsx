import { chatGPTSignInPath, getChatGPTUser } from "@/app/chatgpt-auth";
import { WorkflowApp } from "@/components/workflow/workflow-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#10252d] px-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.06] p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#72d2dd] text-xl text-[#10252d]">✦</div>
          <h1 className="mt-5 text-2xl font-semibold">游戏设计工作流</h1>
          <p className="mt-3 text-sm leading-6 text-[#b7cbd0]">登录后，你的设计状态、对话和原型版本会安全保存到个人项目。</p>
          <a href={chatGPTSignInPath("/")} target="_top" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#f0a63a] px-5 text-sm font-semibold text-[#1e2e34] transition hover:bg-[#ffc05e]">使用 ChatGPT 登录</a>
        </section>
      </main>
    );
  }

  return <WorkflowApp displayName={user.displayName} />;
}
