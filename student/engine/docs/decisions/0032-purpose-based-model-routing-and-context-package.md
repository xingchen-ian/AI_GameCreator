# ADR-0032：按业务用途路由模型并统一题目上下文

## 状态

Accepted，2026-10-24。统一 Question Context Package 部分已由 ADR-0033 取代；按业务用途路由模型的决定继续有效。

## 背景

原模型配置使用 `fast`、`chat`、`review` 等宽泛标签。标签把模型性能假设写进代码，无法表达一次调用实际承担 Assessment、脚手架提问、候选答案还是记忆整理，也不方便研究者独立更换每项职责的模型。Assessment 与 Response 还分别拼装相似上下文，同时发送 Question Memory 和同一道题的完整确认答案，造成重复 token。

## 决定

- 删除当前配置中的 `DASHSCOPE_FAST_MODEL`、`DASHSCOPE_CHAT_MODEL` 和宽泛的 `DASHSCOPE_REVIEW_MODEL`。
- 模型按十个业务用途配置：Assessment、Pre-answer、Scaffolding、Candidate、Conversation Summary、Question Memory、Answer Review、Design Review、GDD、Build。
- 每个结构化模型请求必须显式声明 `purpose`；代码不根据模型名称推断速度或能力，也不为缺失的用途配置静默选择默认模型。
- `not_ready` 的用户回复使用 Scaffolding 模型；`ready` 的 Candidate Answer 和主动重新提炼使用 Candidate 模型。首次打开有历史的题目由独立的 Pre-answer 调用一次完成覆盖判断和起始回复。
- 新增统一 Question Context Package，一次读取题目合同、当前题对话、有效 Question Memory 和确认答案回退，再为 Assessment 与 Response 生成不同视图。
- 同一道题已有当前答案版本的 Question Memory 时，不再重复发送其完整确认答案；只有缺少有效 Memory 的题使用确认答案回退。
- 长对话已有工作摘要时，Assessment 使用工作摘要与最近四条原文；Response 和 Candidate 保留预算内完整最近对话，不能只依赖 Assessment。
- `model_calls.role` 数据库列为兼容历史记录继续保留，但新记录写入业务用途值；研究导出额外提供 `purpose` 字段。

## 当前本地模型映射

- Assessment、Scaffolding、Conversation Summary、Question Memory、GDD：`deepseek-v4-flash-0731`
- Candidate、Answer Review、Design Review：`qwen3.8-max`
- Build：`qwen3.8-2.4t-a95b`

这些只是 `.env.local` 当前选择，不是源码中的性能假设；研究者可以独立修改任一用途。

## 原因

业务用途是稳定概念，而“快模型”会随供应商和实验变化。显式用途配置让模型选择可控、模型调用日志可解释。Context Package 让两个调用使用同一份事实选择规则，同时保留 Call 2 所需的用户原话，避免为了省 token 把 Response 降为只读 Assessment。

## 替代方案

- 保留 `FAST_MODEL` 并在其下承载多个任务：配置简单，但无法独立实验各任务，拒绝。
- 为每个具体 operation 单独设置变量：控制最细，但变量数量过大且相同职责无法共享，暂不采用。
- Call 2 只读取 Assessment：token 最少，但会丢失措辞、理由和设计细节，拒绝。
- 仅缓存原有完整字符串：减少数据库读取但不减少重复答案和 token，拒绝。

## 后果

- 部署环境需要提供九个模型变量；只在实际调用某用途时检查对应变量。
- 历史 `model_calls.role` 值可能是 `fast/chat/review`，新记录则是业务用途，分析时应结合时间和 Prompt 版本。
- 当前相关设计证据仍以全部有效 Question Memory 为保守输入；本决定先去除确定性重复，不引入可能遗漏信息的自动相关性筛选。
- Assessment 的紧凑对话视图只在已有滚动摘要时启用；短对话仍保留全部原文。

## 受影响位置

- `.env.example`
- `README.md`
- `lib/server/model-provider.ts`
- `lib/server/question-context-package.ts`
- `lib/server/model-context.ts`
- `lib/server/conversation-memory.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/question-start/route.ts`
- `app/api/ai/synthesize/route.ts`
- `app/api/ai/answer-review/route.ts`
- `app/api/ai/gdd-review/route.ts`
- `app/api/design-review/route.ts`
- `app/api/gdd/route.ts`

## 验证与回退

- 对 `ready/not_ready` 和 `complete/partial/empty` 分别检查模型调用记录中的 purpose 与模型名称。
- 构造有 Memory 和无 Memory 的确认答案，确认同一道题不会同时进入 Memory 与原文回退。
- 构造有滚动摘要的长对话，确认 Assessment 输入比 Response 紧凑且仍包含最新用户消息。
- 若需要回退，可恢复旧环境变量映射；Context Package 的事实去重可独立保留。
