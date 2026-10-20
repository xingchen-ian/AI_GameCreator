# ADR-0021：强制类型检查与关键 API smoke test

- 状态：Accepted
- 日期：2026-10-21
- 决策者：产品负责人

## 背景

Vinext 的生产构建此前可以在 TypeScript 全量检查失败时继续成功，因此缺失 React import、错误的 Drizzle batch 类型等问题可能进入 Sites。项目也没有自动化测试，登录后的工作区入口与全局 Design State 审查只能靠人工回归。

## 决定

1. 新增独立的 `typecheck` 命令，使用 `tsc --noEmit --incremental false`，避免生成缓存文件。
2. `npm run build` 必须先通过 typecheck 和关键 smoke test，再执行 Vinext 构建；任何一步失败都终止构建。
3. 使用 Vitest 的 Node 环境测试 API 路由。首批 smoke test 覆盖：认证用户读取指定项目工作区、未登录请求被拒绝、完整 Design State 创建全局审查。
4. smoke test 使用身份、数据库和模型替身，不读取生产 D1，也不调用真实模型或消耗 API 配额。

## 原因

- TypeScript 应成为发布门禁，而不只是开发者可选检查；
- API 路由测试比页面文本断言更接近登录与审查的真实业务边界；
- 隔离外部依赖能让测试快速、稳定并可在本地与 Sites 构建环境重复执行；
- 先覆盖最关键路径，避免为第一版引入沉重的端到端测试基础设施。

## 替代方案

- 只依赖 Vinext build：已证明不能捕获全部类型错误，因此拒绝。
- 使用真实 Sites、D1 和千问执行端到端测试：更接近生产，但速度慢、需要凭据且会产生费用，不适合作为每次构建的门禁。
- 只做源代码字符串检查：无法证明 API 的认证、输入和返回行为，因此拒绝。

## 后果

- 每次构建会多执行一次 TypeScript 检查和三项快速 smoke test；
- 路由依赖发生变化时，相应测试替身也必须更新；
- 当前测试验证路由编排，不替代以后针对真实 Sites 登录、D1 migration 和模型供应商的部署后检查。

## 受影响位置

- `package.json`
- `vitest.config.ts`
- `tests/smoke/workspace-route.test.ts`
- `tests/smoke/design-review-route.test.ts`
- `app/api/design-review/route.ts`
- `app/api/gdd/route.ts`

## 验证方式

- `npm run typecheck` 必须通过；
- `npm run test:smoke` 必须运行三个测试且全部通过；
- `npm run build` 的日志必须先出现 typecheck 和 smoke test，再进入 Vinext build；
- 测试期间不需要 DashScope key、Sites 身份或 D1 binding。

## 回退方式

若 Vitest 与未来 Vinext/Vite 版本发生冲突，可以替换测试运行器，但不得移除类型检查和关键路径测试门禁。紧急发布时也应修复失败原因，而不是绕过 `build` 脚本。
