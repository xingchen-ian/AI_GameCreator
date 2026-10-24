# Game Design Workflow

一个独立于 `game-agent` 的正式游戏设计工作流产品。用户通过六阶段、21 个问题与 AI 设计教练协作，形成结构化 Design State，再生成可追溯 GDD、全局一致性反馈和交给 Codex 的 Build Brief。

## Architecture

重要架构决定及其原因记录在 [`docs/decisions/`](docs/decisions/README.md)。实现发生重大变化时，必须同步新增或更新 ADR，不能只在对话中保留原因。

- `app/page.tsx`：按本机管理员或远程参与者入口分流。
- `components/workflow/workflow-app.tsx`：Workflow、对话、设计状态和安全原型运行时。
- `lib/protocol/stages.ts`：六阶段设计 protocol。
- `lib/design/`：答案类型、依赖图、失效传播和原型生成门槛。
- `app/api/workspace`：个人项目、答案和持久化状态。
- `app/admin/research`：创建匿名参与者链接、查看完成进度并批量导出研究数据。
- `app/api/ai/*`：服务端 AI 对话与答案提炼。
- `app/api/gdd`：冻结 Design Snapshot，生成阶段总结、版本化 GDD 和全局冲突反馈。
- `app/api/build-brief`：把已确认 GDD 编译成可复制或下载的 Codex 实现合同。
- `db/schema.ts`：SQLite 项目、消息、答案、快照、GDD、冲突和 Build Brief。
- `db/index.ts`：标准 Node SQLite 连接，并在首次访问时自动应用 Drizzle migrations。

当前项目负责从问题协作到已确认 GDD 与 Build Brief。Prototype implementation 将由后续独立 Agent 承担，不在本 Workflow 中生成或运行。

## Required runtime values

```env
DATABASE_PATH=./data/game-workflow.db
BACKUP_DIR=./data/backups
BACKUP_RETENTION=20
BACKUP_INTERVAL_MINUTES=15
APP_USER_ID=local-owner
APP_USER_EMAIL=local@example.com
APP_USER_NAME=本地设计者
APP_SESSION_SECRET=replace-with-at-least-24-random-characters
APP_ADMIN_PASSWORD=replace-with-a-long-admin-password

DASHSCOPE_API_KEY=...
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_COACH_TURN_MODEL=deepseek-v4-flash-0731
DASHSCOPE_PRE_ANSWER_MODEL=deepseek-v4-flash-0731
DASHSCOPE_CANDIDATE_MODEL=qwen3.8-max
DASHSCOPE_CONVERSATION_SUMMARY_MODEL=deepseek-v4-flash-0731
DASHSCOPE_QUESTION_MEMORY_MODEL=deepseek-v4-flash-0731
DASHSCOPE_ANSWER_REVIEW_MODEL=qwen3.8-max
DASHSCOPE_DESIGN_REVIEW_MODEL=qwen3.8-max
DASHSCOPE_GDD_MODEL=deepseek-v4-flash-0731
DASHSCOPE_BUILD_MODEL=qwen3.8-2.4t-a95b
APP_COMMIT=local-dev
```

把这些值写入本地 `.env.local` 或部署平台的服务端环境变量。`DASHSCOPE_API_KEY` 不能进入源码或浏览器。模型按 Pre-answer、统一 Coach Turn、手动答案提炼、两类记忆、两类审查、GDD 和 Build 等业务用途分别路由；代码不使用 `fast` 或 `chat` 这类性能标签。所有模型输出都在服务端通过结构校验后才进入应用状态。

系统始终区分本机管理员与匿名参与者。`APP_USER_*` 决定管理员工作区的数据归属；参与者必须通过管理员生成的专属链接进入，且每人只看到自己的一个项目。`APP_SESSION_SECRET` 用于签名登录 Cookie，至少 24 个字符；`APP_ADMIN_PASSWORD` 保护研究管理和管理员工作区。

## V1 workflow

1. 完成并确认 21 题（Q8 可以留空）。体验是否真正达成不在设计阶段预判，留给后续原型试玩验证。
2. 生成 GDD：系统同时冻结答案修订号、生成六个阶段总结，并执行全局一致性审查。
3. 处理冲突：blocker 必须解决或由用户说明为有意设计，系统不会自动改写答案。
4. 确认 GDD，生成 Build Brief。
5. 通过复制或下载 Markdown，把 Build Brief 交给独立的 Prototype Implementation Agent。

工作台提供“重建项目”：当前项目会被归档保留，并创建一个从 Q1 开始的新空白项目；不会永久删除旧记录。

## Local development

```bash
cp .env.example .env.local
npm install
npm run study:setup
npm run db:migrate
npm run dev
```

打开 `http://localhost:3000` 会进入管理员登录或工作区。数据库默认保存在 `./data/game-workflow.db`，启动应用时也会自动应用尚未执行的 migration。

需要在本机按生产模式验证时：

```bash
npm run build
npm start
```

`npm start` 运行 Next.js standalone 产物，并自动读取项目根目录的 `.env.local`。可通过 `PORT` 和 `HOSTNAME` 调整监听地址。

## 本机研究测试与 Quick Tunnel

可以运行一次初始化命令：

```bash
npm run study:setup
```

该命令会生成随机 session secret，并在终端显示一次新管理员密码。请立即保存密码；如果已经配置过密码，命令会保留且不会再次显示。

等价的手工配置为：

```env
APP_SESSION_SECRET=使用随机生成的长字符串
APP_ADMIN_PASSWORD=研究者管理员密码
```

可用 `openssl rand -base64 32` 分别生成随机 session secret 和管理员密码；不要继续使用 `.env.example` 中的占位值。

首次使用先构建正式版本：

```bash
npm run build
```

以后每次研究测试只需要运行一条命令：

```bash
npm run study:start
```

它会同时启动本地网站和 Cloudflare Quick Tunnel，并在终端显示：

- 研究管理：`http://localhost:3000/admin/research`
- 管理者自己的设计工作区：`http://localhost:3000/admin/workspace`
- 参与者公网入口：`https://<随机名称>.trycloudflare.com`

管理员始终从本机操作；公网管理路径默认返回 404。`/admin/research` 用于参与者管理、只读查看和批量导出，`/admin/workspace` 则使用原本的本地 owner，提供管理者自己的完整多项目设计工作流，两类数据互不混淆。管理页会自动读取当前 Tunnel 地址，因此创建 `P001`、`P002` 后生成的专属链接可直接发给远程参与者，不需要替换域名。链接只显示一次，丢失后可点击“新链接”让旧链接和旧会话失效并重新生成。“导出全部数据”会下载包含所有参与者完整项目记录的 JSON，并在页面上显示导出错误。

`study:start` 会在启动前、运行期间（默认每 15 分钟）和按 `Ctrl+C` 正常结束时备份 SQLite；参与者点击“退出测试”时也会立即备份。每份备份都会执行 `PRAGMA integrity_check` 并生成 SHA-256 清单，默认保留最近 20 份；管理员页会显示最近一次状态。也可随时运行 `npm run backup`。自动备份保存在 `data/backups`，它仍位于同一台电脑，因此正式研究建议再把该目录同步到另一块磁盘或受控云盘。

系统会记录问题打开/关闭和停留时间、按钮/链接点击、答案框显隐、AI 候选答案可见、工作区视图切换、前后台切换、网络离线/恢复和页面载入/刷新类型。事件不保存输入框中的未提交文字。每次模型调用还会保存模型实际收到的完整 JSON 请求和服务商原始响应（不包含 API Key），包括严格模式降级与修复尝试。研究导出同时包含 Build Brief、GDD Issue、GDD Review Change、Design Snapshot、Prototype Version 与这些事件。

按 `Ctrl+C` 会一起停止网站和 Tunnel。所有数据仍保存在本机 `data/game-workflow.db`。测试期间电脑必须保持开机、联网且不进入睡眠。

管理员密码遗失时运行 `npm run admin:reset`，保存新密码并重启系统。该操作不会改变管理员项目、参与者或研究数据。

## Docker deployment

```bash
cp .env.example .env.local
# 编辑 .env.local，至少填写 DASHSCOPE_API_KEY，并为公网部署设置 Basic Auth。
docker compose up --build -d
```

容器监听 `3000` 端口，SQLite 数据保存在命名卷 `game-workflow-data`。可将同一 Dockerfile 部署到 Railway、Render、Fly.io、普通 VPS 或 Kubernetes 的单副本工作负载；必须挂载持久磁盘到 `/data`。健康检查地址为 `/api/health`。

通用容器平台只需：使用仓库根目录的 `Dockerfile`、暴露 `3000`、配置上述环境变量，并将持久磁盘挂载到 `/data`。不要把 `.env.local` 上传到代码仓库或打进镜像。

当前 SQLite 方案面向单实例和小规模研究测试。若以后需要多副本或较高并发，应先把数据库适配层迁移到 PostgreSQL，而不是让多个容器同时写同一个 SQLite 文件。
