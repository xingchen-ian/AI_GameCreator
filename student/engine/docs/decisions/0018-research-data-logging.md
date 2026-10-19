# ADR-0018：记录 AI 建议、答案修订历史与模型调用

- 状态：Accepted
- 日期：2026-10-19
- 决策者：产品负责人
- 关联：研究方向讨论（人机共同设计过程中的想法来源、采纳与演化）；[ADR-0015](0015-strict-structured-output-with-one-repair.md) 的结构化输出指标

## 背景

系统此前只保存每道题的最新答案和一个修订计数，旧答案在每次写入时被覆盖。教练对话和"AI 重新提炼"返回的 `suggestedAnswer`、`keyInsights`、`parkedInsights` 只发给浏览器，没有持久化。全局审查中，用户编辑后写入的建议会覆盖 `design_review_changes.proposed_content`，AI 的原始提议因此丢失。模型调用只写 Cloudflare 日志，无法按项目查询用了哪个模型、耗时和 token。

这使得以下问题都无法回答：AI 提议过什么、用户原样采纳还是修改后采纳、答案经历了哪些版本、某个结果来自哪个模型。这些是后续研究（想法来源、接续、演化、多模型对比）的基础数据。

## 决定

新增三张只追加的记录表：

- `ai_suggestions`：每条 AI 建议答案。来源为 `chat`、`synthesize` 或 `design_review`，保存建议全文、结构化字段和生成模型；`chat` 与 `design_review` 关联对应的助手消息。`design_review` 建议的 ID 与 `design_review_changes.id` 相同，用来保留被编辑前的原始提议。
- `answer_revisions`：答案每次实际变化时追加一行，保存修订号、全文、来源（`user` / `design_review` / `backfill`）、所依据的建议，以及采纳方式：
  - `verbatim`：写入内容与建议完全一致；
  - `edited`：基于某条建议，但内容有改动；
  - `manual`：没有关联建议。
- `model_calls`：每次结构化模型请求的操作名、角色、模型、结果（`success` / `repaired` / `failed`）、是否严格模式降级、输入输出 token 和耗时。不保存 prompt 或用户正文。

浏览器在确认答案时附带当前题最近一条建议的 `suggestionId`；服务端校验它属于同一项目和题目后再比较内容。迁移把现有答案作为各自当前修订号的 `backfill` 行写入历史。

项目所有者可以在项目工作区为任一项目（包括回收站中的项目）下载研究数据 JSON（`GET /api/research-export?projectId=...`）。文件包含当前答案、修订历史、AI 建议、对话、模型调用、Design State 审查记录、阶段总结、GDD 版本，以及按时间合并的 `timeline` 事件流；不包含账号邮箱和用户 ID。导出逻辑在 `lib/server/research-export.ts`，以便以后的离线脚本复用。

## 原因

- 研究需要过程数据，而不只是最终状态；
- 采纳方式在写入时判断最可靠，因为此时同时拥有建议和最终文本；
- 只追加、不改变现有表和读取逻辑，对产品行为没有影响；
- `model_calls` 写入失败只打日志，不影响主流程；修订行使用 `ON CONFLICT DO NOTHING`，避免并发写入导致保存失败。

## 考虑过的替代方案

### 把历史和建议塞进 `question_answers.structured_json`

没有采用。JSON 字段无法高效查询，也会随每次写入被覆盖。

### 在服务端计算编辑距离

暂不采用。5000 字答案的逐字符编辑距离在 Worker 中开销较大；表中已保存建议和最终文本，可以离线计算任意相似度指标。

## 后果

### 正面影响

- 可以重建每道题的完整修订链，并知道每个版本与哪条 AI 建议有关；
- 可以统计原样采纳、修改采纳和手写的比例；
- 可以按项目和操作比较模型、耗时、失败与修复率。

### 代价与风险

- 每次 AI 回复和答案写入多一次数据库写入；
- 建议只保存在浏览器内存中时才能关联：刷新页面后再确认答案，会记为 `manual`；
- 本记录上线前的修订历史和建议无法恢复；
- 表中包含用户写下的设计内容，导出用于研究时仍需由研究流程另行处理合规要求；本 ADR 不负责 IRB 或知情同意界面；
- 导出按项目进行，只覆盖当前账号拥有的项目。匿名稳定研究编号与模型复现元数据由 [ADR-0020](0020-review-model-and-reproducibility-metadata.md) 补充；研究者批量导出权限仍未实现。

## 受影响位置

- `db/schema.ts`
- `drizzle/0007_research_data_logging.sql`
- `lib/server/model-provider.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/synthesize/route.ts`
- `app/api/ai/gdd-review/route.ts`
- `app/api/workspace/route.ts`
- `app/api/gdd/route.ts`、`app/api/prototypes/route.ts`、`app/api/design-review/route.ts`（关联 `projectId`）
- `components/workflow/workflow-app.tsx`
- `lib/server/research-export.ts`、`app/api/research-export/route.ts`、`components/workflow/project-manager.tsx`（导出）

## 验证方式

- 与 AI 讨论一道题并确认答案后，`ai_suggestions` 有一行 `chat` 记录，`answer_revisions` 有一行引用它的记录，`adoption` 与是否修改一致；
- 不经 AI 直接写答案，`adoption` 为 `manual`；
- 应用全局审查建议后，`answer_revisions.source` 为 `design_review`，`ai_suggestions` 中仍保留原始提议；
- 每次模型请求都在 `model_calls` 留下一行，失败请求的 `outcome` 为 `failed`；
- 导出文件只能由项目所有者下载，其他账号返回 404，未登录返回 401，文件中不出现账号邮箱。

## 回退方式

三张表与现有读取逻辑互不依赖。回退时移除对应写入代码即可，表可以保留或删除，不影响项目、答案、GDD 和审查数据。
