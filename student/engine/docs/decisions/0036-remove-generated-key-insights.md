# ADR-0036：从题目交互模型合同中移除 `keyInsights`

## 状态

Accepted，2026-10-24。本文取代 ADR-0035 中要求普通聊天和主动答案提炼返回 `keyInsights` 的部分，并将同一决定扩展到 Pre-answer。

> 后续更新：普通聊天删除 `keyInsights` 后的统一 `{ reply, suggestedAnswer }` 合同，已由 [ADR-0037](0037-separate-ready-and-not-ready-response-contracts.md) 进一步拆分为 Ready 与 Not Ready 两个合同。

## 背景

`keyInsights` 最初用于把单轮交互压缩成若干结构化要点，方便界面状态、后续上下文和研究分析。当前系统已经分别保存原始消息、AI suggestion、正式答案及其修订、滚动对话摘要、整体 Question Memory，以及逐次模型完整请求与原始响应。后续题目依赖正式答案和 Question Memory，而不是 `keyInsights`。

真实使用中，模型可能把自己刚提出但用户尚未采用的建议写入 `keyInsights`。该字段没有独立界面消费者，也不应成为设计事实来源，却增加了普通回复、主动答案提炼和 Pre-answer 的结构化输出负担。

## 决定

- 从普通聊天 Call 2 的返回类型和 `coachTurnReplySchema` 删除 `keyInsights`；Call 2 只返回 `reply` 和 `suggestedAnswer`。
- 从主动“AI 重新提炼”的返回类型和 `answerSynthesisSchema` 删除 `keyInsights`；该调用只返回 `suggestedAnswer` 和 `parkedInsights`。
- 从 Pre-answer 的返回类型、归一化逻辑和 `preAnswerSchema` 删除 `keyInsights`；Pre-answer 保留覆盖判断、摘要、缺失项、首条回复和候选答案。
- 新生成的 `aiSuggestions.structuredJson` 不再写入 `keyInsights`。
- 历史记录中的 `structuredJson.keyInsights` 原样保留，不迁移、不删除，研究导出继续忠实导出历史 JSON。
- 用户确认的设计事实继续以正式答案为准；讨论过程、AI 建议的采纳与拒绝由 Question Memory 总结，原始证据仍可从消息和模型调用快照复核。

## 原因

- 删除没有运行时消费者的派生字段，降低 Schema 复杂度和模型结构错误概率。
- 避免未采用的 AI 建议被误读为用户已经确认的设计决定。
- 不重复保存能够从完整原始数据和 Question Memory 获得的信息。
- 保留历史 JSON 可以避免数据库迁移和研究数据丢失。

## 考虑过的替代方案

### 保留字段并强化“只记录用户确认内容”的 Prompt

没有采用。Prompt 不能提供确定性来源保证，而且字段仍没有实际消费者。

### 由服务端从用户消息确定性提取 `keyInsights`

没有采用。可靠的语义提取仍需要额外规则或模型调用，而当前正式答案和 Question Memory 已覆盖该需求。

### 清理历史记录中的 `keyInsights`

没有采用。历史值属于当时模型的原始派生输出，研究导出应保留；删除会造成不可逆的数据损失。

## 后果

- 三类模型合同更短，模型输出 token 和结构校验负担略有下降。
- 新的 AI suggestion 结构化数据不再包含轮次级关键要点。
- 如果未来研究确实需要轮次级洞察标签，应从不可变的消息与模型调用快照离线生成独立派生数据，而不是重新混入在线交互状态。
- 旧项目可能同时包含有 `keyInsights` 和没有该字段的 suggestion；消费者必须继续把结构化 JSON 当作可选字段集合。

## 受影响位置

- `lib/server/model-provider.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/synthesize/route.ts`
- `app/api/ai/question-start/route.ts`
- `tests/unit/assessment-schema.test.ts`
- `tests/unit/model-provider-snapshots.test.ts`
- `docs/decisions/0035-dynamic-parking-and-adaptive-scaffolding.md`

## 验证

- 应用运行代码和测试中不再引用 `keyInsights`。
- 普通聊天、主动答案提炼和 Pre-answer 的合法最小输出均能通过各自 Schema。
- 旧的 suggestion JSON 即使仍含有 `keyInsights` 也可以正常读取和导出。
- TypeScript、lint、完整测试、smoke test 和生产构建通过。

## 回退

可重新把可选 `keyInsights` 加入三类 Schema 和结构化数据，不需要数据库迁移；历史记录保持不变。
