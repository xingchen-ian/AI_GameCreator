# ADR-0031：将对话维护移出用户等待链

## 状态

Accepted，2026-10-24。

## 背景

题目交互中的 Assessment、回复、答案审查本身已经需要模型调用，但滚动对话摘要、Question Memory 补生成等维护工作也位于同步请求链。打开题目可能先补多份 Memory，发送消息可能先刷新摘要，保存答案后浏览器仍等待 Memory 完成。维护模型的偶发延迟因此直接扩大用户等待时间。

## 决定

- 没有任何已确认答案的新项目打开题目时，不调用 Initial Assessment 或 Initial Response，直接保存并显示该题的预设起始问题。
- 打开题目不再同步补生成缺失的 Question Memory；已有确认答案仍可作为事实回退上下文。
- 用户答案一经审查通过，服务端保存答案并在同一请求中写入持久化 `question_memory` 后台任务；浏览器不再额外等待 Memory API。
- Assistant 回复保存后，服务端写入持久化 `conversation_summary` 后台任务；本轮 Assessment 和 Response 不再等待滚动摘要。
- 后台任务先进入 SQLite，再通过 Next.js `after()` 在响应结束后处理。任务失败后保持 pending，按退避时间在后续请求中重试；运行中断超过十分钟的任务可重新领取。
- 后台任务状态、尝试次数和错误进入研究导出，导出格式升级到 v5。
- 本次不改变 Readiness 标准、Assessment 模型、回复模型或 repair 策略。

## 原因

滚动摘要和 Question Memory 是后续回合的上下文维护，不应延迟当前用户已经完成的动作。持久化任务表避免普通 fire-and-forget 在关页、服务重启或电脑关机时静默丢失。空项目没有可供模型评估的历史，确定性起始问题比两次模型调用更快且结果稳定。

## 替代方案

- 直接在浏览器发起但不等待：关页时容易丢请求，拒绝。
- 只使用进程内 Promise 或定时器：服务重启后无法恢复，拒绝。
- 打开下一题时继续补 Memory：保证上下文最新，但重新把维护成本放回前台等待链，拒绝。
- 当前阶段同时切换 Call 2 模型和压缩 Context Package：变量过多，不利于判断本次延迟改动的效果，留待独立决策。

## 后果

- 答案刚确认后立即打开下一题时，Question Memory 可能尚未生成；系统使用已确认答案作为事实回退，不阻塞页面。
- 如果服务在任务执行中退出，任务最迟在后续相关请求触发队列处理时恢复，不保证关机期间定时执行。
- 每轮回复会产生一条后台任务记录；未达到摘要阈值时任务会快速完成而不调用模型。
- 研究分析可以区分用户可见模型调用和后台维护任务，并检查失败、重试和完成状态。

## 受影响位置

- `db/schema.ts`
- `drizzle/0014_nifty_black_panther.sql`
- `lib/server/background-jobs.ts`
- `lib/server/conversation-memory.ts`
- `lib/server/question-memory.ts`
- `lib/protocol/question-starter.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/question-start/route.ts`
- `app/api/workspace/route.ts`
- `components/workflow/workflow-app.tsx`
- `lib/server/research-export.ts`

## 验证与回退

- 空项目打开任意题目时，确认没有新增 Assessment/Response 模型调用，并保存一条预设 Assistant 消息。
- 超过滚动摘要阈值后，确认回复先返回，随后 summary 任务完成并生成摘要。
- 确认答案后，确认响应不等待 Question Memory，同时任务表和最终 Memory 均可追踪。
- 模拟模型失败和服务重启，确认 pending 或 stale running 任务能在后续请求重试。
- 回退时可恢复同步调用入口；保留任务表和历史记录，避免破坏研究数据。
