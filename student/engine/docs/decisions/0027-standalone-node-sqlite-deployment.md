# ADR-0027：脱离 ChatGPT Sites，采用独立 Node 与 SQLite 部署

- 状态：Accepted
- 日期：2026-10-24
- 决策者：产品负责人 / Codex
- 关联：ADR-0017、ADR-0018、ADR-0021

## 背景

项目此前依赖 ChatGPT Sites 提供的 Vinext/Cloudflare Worker 构建、D1 binding、身份请求头和托管环境变量。该运行方式无法直接在普通本地 Node 环境或通用云平台运行，也让数据、身份和部署生命周期绑定在 Sites 控制面上。

## 决定

项目迁移到标准 Next.js Node runtime：

- 使用 `next dev`、`next build` 和 `next start`；
- 使用 `better-sqlite3` 与 Drizzle SQLite driver，数据库位置由 `DATABASE_PATH` 指定；
- 首次数据库访问和 `npm run db:migrate` 都会应用 `drizzle/` 中的迁移；
- 使用环境变量定义单一数据所有者，不再读取 ChatGPT 身份请求头；
- 可选 HTTP Basic Auth 保护独立部署；
- 使用 Next standalone output、Dockerfile 和持久卷完成线上部署；
- 模型密钥与模型路由继续使用服务端环境变量。

## 原因

标准 Node 与文件型 SQLite 能以最低运维成本覆盖本地开发、研究演示和单实例线上部署。现有 schema 已经是 SQLite，迁移不需要改变数据模型；Docker 让部署目标不再绑定单一平台。

## 替代方案

### 继续使用 Cloudflare Workers 与 D1

没有采用，因为它仍然保留平台绑定，不能满足脱离 Sites 的目标。

### 立即迁移 PostgreSQL 与完整账户系统

暂不采用。它更适合多租户和多副本，但会显著扩大本次改造范围。数据库与身份已经隔离在服务端模块中，后续可以单独替换。

## 后果

- 本地运行不再需要 Wrangler、Vinext、D1 或 ChatGPT 登录；
- 线上部署必须提供持久磁盘，且当前只能安全运行一个应用副本；
- 原 Sites D1 数据不会自动进入新 SQLite，需要另行导出和导入；
- 公网部署者必须启用 Basic Auth 或平台级访问控制；
- 未来多用户化需要增加正式身份系统，并迁移到共享数据库。

## 受影响位置

- `package.json`
- `next.config.ts`
- `db/index.ts`
- `app/app-auth.ts`
- `lib/server/model-provider.ts`
- `proxy.ts`
- `Dockerfile`、`compose.yaml`
- `.env.example`、`README.md`

## 验证与回退

- 在空数据库上运行全部 migration；
- 运行 typecheck、smoke tests 和标准 Next production build；
- 本地启动后验证 `/api/health` 与工作台读写；
- 构建 Docker image，并确认 `/data` 持久卷重启后数据仍存在。

回退时切回 `main`；原 Sites 版本和 D1 数据保持不变。
