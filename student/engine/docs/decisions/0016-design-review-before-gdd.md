# ADR-0016：先审查 Design State，再生成与确认 GDD

- 状态：Accepted
- 日期：2026-10-19
- 决策者：产品负责人 / Codex
- 替代：[ADR-0013](0013-batched-global-review-revisions.md) 中以过期 GDD 作为集中修订工作区的方案

## 背景

旧流程把 GDD 生成、设计一致性审查和冲突修改绑在同一次循环中。用户接受一条建议后，系统未经验证就把旧问题标记为已解决；重新生成 GDD 时又从零创建一批新问题和新 ID。即使新问题与旧问题语义相同，系统也无法建立关联。GDD 文案每次重新生成还会引入额外变化，造成“修复—重审—新问题”的非收敛体验。

## 决定

- Design State 一致性审查独立于 GDD，审查对象只包含 23 道已确认答案；
- 审查运行与问题拥有独立、稳定的数据实体，不再绑定 `gddVersionId`；
- 接受修改后只把相关问题标记为 `pending_verification`，不得直接声明已解决；
- 用户可以批量修改，随后主动点击“验证本轮修改”；验证模型必须逐条返回每个既有问题的 verdict，并把真正新增的问题单独返回；
- 同一审查运行中的问题沿用原 `issueId`，不会因重新措辞生成新记录；
- 用户可以带说明选择 `accepted`，表示有意保留设计张力；相关答案再次变化时，该状态重新进入待验证；
- 只有当前答案快照对应的审查运行处于 `ready`，才能生成或确认 GDD；
- GDD 生成不再扫描设计冲突，而是单独进行文档忠实度检查，只修正文档遗漏、错误表达和擅自补造；
- 手动修改 GDD 章节会把 `fidelityStatus` 设为 `dirty`，重新检查后才能确认；
- “确认 GDD”只改变状态，不调用 AI，也不会产生新问题；
- 打开冲突不再自动调用 AI，只有用户选择讨论或发送消息时才调用。

## 状态模型

Design Review Run：`reviewing | action_required | dirty | verifying | ready | superseded`。

Design Review Issue：`open | pending_verification | resolved | accepted | superseded`。

GDD 继续使用 `draft | confirmed | stale` 表示版本有效性，并新增 `fidelityStatus: ready | dirty` 表示文档忠实度；两者不再与设计问题生命周期混用。

## 数据与兼容

- 新增 `design_review_runs`、`design_review_issues`、`design_review_verdicts`、`design_review_changes`；
- `gdd_versions` 新增 `fidelity_status`，历史版本默认 `ready`；
- 既有答案、对话、GDD、旧冲突和 Build Brief 不删除；旧 `gdd_issues` 仅作为历史数据继续读取；
- 现有项目第一次进入新审查节点时创建首个 Design Review Run。

## 结果

- 设计冲突循环不再因 GDD 重写而漂移；
- 写入、解决和验证成为三个清晰动作；
- 每个旧问题在验证时都有明确结论，不会静默消失；
- 重新验证只进行一次全局 AI 调用，不会每修改一题就自动请求；
- GDD 是审查通过后的派生产物，确认后不会突然出现新的设计冲突。

## 受影响位置

- `db/schema.ts`
- `drizzle/0006_lazy_namor.sql`
- `lib/design/types.ts`
- `lib/server/design-review.ts`
- `lib/server/workspace.ts`
- `lib/server/model-provider.ts`
- `app/api/design-review/route.ts`
- `app/api/ai/gdd-review/route.ts`
- `app/api/gdd/route.ts`
- `app/api/workspace/route.ts`
- `components/workflow/gdd-review-workspace.tsx`
- `components/workflow/gdd-panels.tsx`
- `components/workflow/workflow-app.tsx`

## 验证方式

- 未通过 Design Review 的答案快照不能生成或确认 GDD；
- 接受修改后问题显示为待验证，而不是已解决；
- 验证输出必须覆盖全部既有问题 ID，重复或缺失 ID 会被服务端拒绝；
- 无既有问题但答案发生变化时，验证仍会执行新冲突扫描；
- 打开问题不会自动产生模型请求；
- 手动编辑 GDD 后必须通过忠实度检查才能确认；
- 数据迁移、Lint、生产构建和本地页面加载通过。

## 回退方式

应用层可恢复旧 GDD 审查入口并继续读取 `gdd_issues`。新增表和 `fidelity_status` 保留不会影响旧数据；若要完全回退，再通过前向迁移删除新增结构。
