# Game Design Workflow

一个独立于 `game-agent` 的正式游戏设计工作流产品。用户通过六阶段、23 个问题与 AI 设计教练协作，形成结构化 Design State，再生成可追溯 GDD、全局一致性反馈和交给 Codex 的 Build Brief。

## Architecture

重要架构决定及其原因记录在 [`docs/decisions/`](docs/decisions/README.md)。实现发生重大变化时，必须同步新增或更新 ADR，不能只在对话中保留原因。

- `app/page.tsx`：ChatGPT 身份入口与工作台装载。
- `components/workflow/workflow-app.tsx`：Workflow、对话、设计状态和安全原型运行时。
- `lib/protocol/stages.ts`：六阶段设计 protocol。
- `lib/design/`：答案类型、依赖图、失效传播和原型生成门槛。
- `app/api/workspace`：个人项目、答案和云端状态。
- `app/api/ai/*`：服务端 AI 对话与答案提炼。
- `app/api/gdd`：冻结 Design Snapshot，生成阶段总结、版本化 GDD 和全局冲突反馈。
- `app/api/build-brief`：把已确认 GDD 编译成可复制或下载的 Codex 实现合同。
- `db/schema.ts`：D1 项目、消息、答案、快照、GDD、冲突、Build Brief 和原型版本。

当前项目负责从问题协作到已确认 GDD 与 Build Brief。Prototype implementation 将由后续独立 Agent 承担，不在本 Workflow 中生成或运行。

## Required runtime values

```env
DASHSCOPE_API_KEY=...
DASHSCOPE_BASE_URL=https://YOUR_WORKSPACE_ID.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
DASHSCOPE_CHAT_MODEL=qwen3.8-flash
DASHSCOPE_REVIEW_MODEL=qwen3.8-27b
DASHSCOPE_GDD_MODEL=qwen3.8-flash
DASHSCOPE_BUILD_MODEL=qwen3.8-27b
APP_COMMIT=本次部署对应的 Git commit SHA
```

`DASHSCOPE_API_KEY` 必须以这个准确名称作为 Sites secret 配置，不能放进源码、浏览器或 `.openai/hosting.json`。日常教练对话、全局审查、GDD 整理和构建规格可以分别路由到不同价位的模型；全局审查默认使用 27B 并开启 thinking，其余角色保持非思考模式。`APP_COMMIT` 由部署流程写入当前 Git commit，用于研究数据复现。所有模型输出都在服务端通过结构校验后才进入应用状态。

## V1 workflow

1. 完成并确认 23 题（Q8 可以留空）。
2. 生成 GDD：系统同时冻结答案修订号、生成六个阶段总结，并执行全局一致性审查。
3. 处理冲突：blocker 必须解决或由用户说明为有意设计，系统不会自动改写答案。
4. 确认 GDD，生成 Build Brief。
5. 通过复制或下载 Markdown，把 Build Brief 交给独立的 Prototype Implementation Agent。

工作台提供“重建项目”：当前项目会被归档保留，并创建一个从 Q1 开始的新空白项目；不会永久删除旧记录。

## Local development

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tired_smiling_tiger.sql
npm run dev
```

本地访问 `/signin-with-chatgpt?return_to=/` 使用 Sites 提供的模拟身份。真实部署由 ChatGPT 身份和 Sites 访问策略保护。
