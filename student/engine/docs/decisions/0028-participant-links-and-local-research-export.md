# ADR-0028：参与者专属链接与本地集中研究导出

## 状态

Accepted，2026-10-24。

## 背景

小规模 user test 由研究者在自己的电脑上运行应用，并通过 Cloudflare Quick Tunnel 临时开放访问。参与者不需要正式注册，每人只使用一个项目；研究者需要在本地集中保存并导出全部过程数据。Quick Tunnel 的域名可能在重启后变化，因此身份不能只依赖某个域名下的 Cookie。

## 决定

- 系统始终采用管理员与匿名参与者分离的访问模型，不再提供无需登录的本地单所有者模式。
- 研究者为每位参与者创建匿名编号和高熵专属 token，数据库只保存 token 的 SHA-256 hash。
- `/join/<token>` 验证 token 后写入经过 HMAC 签名的 HttpOnly Cookie；链接路径可在 Quick Tunnel 域名变化后继续使用。
- 每个参与者映射到独立 owner，并由现有 workspace 逻辑自动创建唯一项目。
- 参与者界面隐藏项目创建、切换、归档和删除；服务端同步拒绝这些操作。
- 管理员入口使用独立密码和签名 Cookie，能够查看参与者进度、停用访问并一次导出全部项目。
- `npm run study:start` 同时管理本地服务与 Quick Tunnel，并把临时公网地址提供给本地管理页；研究者不再手工拼接链接。
- 管理员页面和接口默认只接受 localhost 请求，不通过 Quick Tunnel 暴露。
- `/admin/workspace` 在管理员 Cookie 验证后复用本地 owner 的完整多项目工作流；它与参与者 owner 严格分离。
- 参与者 Cookie 包含会话版本；重置链接或停用访问会递增版本，使已有 Cookie 同时失效。
- 所有内容仍写入本机 SQLite；Tunnel 只传输请求，不持有应用数据库。

## 原因

该方案不要求参与者创建邮箱账号，也不引入外部身份或数据库服务。专属 token 能在临时域名变化后恢复同一个项目；项目级 owner 隔离复用现有权限检查。批量导出复用已有完整研究导出格式，避免出现两套不一致的研究记录。

## 替代方案

- 共用一个 Basic Auth 和一个 owner：部署最少，但参与者能看到或修改彼此项目，因此拒绝。
- Supabase Auth 与 PostgreSQL：适合长期公开、多副本服务，但对当前小规模、定时测试过重，暂不采用。
- 每位参与者单独部署：隔离充分，但部署和回收成本随人数增长，拒绝。

## 后果

- 研究者电脑、Next.js 服务和 Tunnel 必须在测试期间持续运行。
- 管理员必须安全保存首次生成的专属链接；系统不能从 hash 还原丢失的 token。
- SQLite 继续限制为单实例；高并发或多副本部署仍需迁移 PostgreSQL。
- 导出不包含账号邮箱，但答案和对话可能含参与者主动输入的个人信息，研究使用前仍需检查和取得适当同意。

## 受影响位置

- `app/app-auth.ts`
- `lib/server/access-session.ts`
- `app/join/[token]/route.ts`
- `app/api/admin/*`
- `app/admin/research/page.tsx`
- `db/schema.ts`
- `lib/server/research-export.ts`
- `scripts/study-start.mjs`

## 验证与回退

- 验证两个专属链接产生不同 owner 和项目，不能交叉读取。
- 验证停用参与者后旧 Cookie 和专属链接均失效。
- 验证管理员批量导出包含每个项目的完整研究导出。
- 管理员密码遗失时通过 `npm run admin:reset` 恢复访问；不提供绕过管理员认证的运行开关。
