# ADR-0035：动态跨题导航与自适应 Scaffolding 回复

## 状态

Accepted，2026-10-24。本文修订 ADR-0003 中静态“可暂存到哪些题”的做法，并细化 ADR-0030 中 Call 2 自行选择脚手架方式的决定；用户原文校验继续遵守 ADR-0023。

> 后续更新：本文涉及 `keyInsights` 的返回与保存规则已由 [ADR-0036](0036-remove-generated-key-insights.md) 取代；动态导航、自适应 Scaffolding 和独立回复合同继续有效。

> 后续更新：普通聊天 Call 2 的统一回复合同已由 [ADR-0037](0037-separate-ready-and-not-ready-response-contracts.md) 拆分为 Ready 与 Not Ready 两个互斥合同。

## 背景

逐题配置的 `parkingTargets` 只能覆盖预先猜测的常见关系。实际用户可能在任意题中提到属于前题或后题的内容，静态列表会让模型缺少正确目标题目的信息。同时，Readiness Assessment 简化后不再输出 `recommendedStrategy`，Call 2 虽然仍使用 Scaffolding 用途模型，却只有宽泛的“自行选择提问、澄清、选项或示例”指令。

真实 Q9 对话显示，用户连续请求建议时，Call 2 仍反复输出“最关键缺口”和“先问”，把 Scaffolding 退化成机械追问。另一次真实调用中，Call 2 看见完整 Assessment JSON 后照抄了 Assessment 字段，而没有返回聊天回复合同。旧的主动答案提炼流程还继续要求模型生成未被使用的 `reply`，以及本应由服务端确定的 `recommendedAction` 和 `scopeStatus`。

## 决定

### 动态跨题导航

- 删除逐题 `parkingTargets` 配置和对应辅助函数。
- Readiness Assessment 额外读取 Q1–Q21 的简短题目目录，但该目录只用于判断用户越界原文最适合进入哪道题，不参与 Readiness 或冲突判断。
- 目标题可以位于当前题之前或之后，不设置静态候选限制。
- `parkedInsights.content` 仍必须是用户消息中的连续原文；服务端和客户端继续验证原文、题号存在且不指回当前题。
- 越界提示显示在答案编辑器之外，确保 Not Ready 且答案框未展开时仍可见。点击后只切换题目并预填原文，不自动发送或改写答案。

### Readiness 逻辑一致性

- Assessment 继续只返回 `ready`、`summary`、`missingElements` 和 `parkedInsights`。
- Prompt 要求逐项核对最低完成证据，并使用“证据充足 / 证据不足”的简短理由。
- 当模型返回 `ready=true`，但同时列出缺失项或在理由中明确表示证据不足时，服务端将结果收敛为 Not Ready；这只是修复输出内部矛盾，不重新执行一次 Assessment。

### Call 2 的输入与输出合同

- Call 2 不再接收完整 Assessment JSON，改为普通文本形式的 Ready / Not Ready 结论、判断理由和缺失内容，降低模型照抄 Assessment 结构的概率。
- 普通聊天使用独立的 `coachTurnReplySchema`，只允许 `reply`、`suggestedAnswer` 和 `keyInsights`。
- 主动“AI 重新提炼”使用独立的 `answerSynthesisSchema`，只允许 `suggestedAnswer`、`keyInsights` 和 `parkedInsights`。
- 重新提炼的 `recommendedAction` 与 `scopeStatus` 由服务端根据结果确定，不再由模型生成；未被消费的 `reply` 从提炼合同中删除。

### 自适应 Scaffolding

- `scaffolding` 保留为 Not Ready 回复的模型用途和独立配置项，但不向用户显示策略选择器，也不要求模型额外返回策略枚举。
- Call 2 根据用户最新意图自然调整：用户正常补充时只问一个最有帮助的问题；用户明确请求建议、选项或例子时，直接提供二到三个结合当前设计的具体方向，再询问哪个更接近用户想法。
- 回复不得机械汇报“最关键缺口”“先问”等内部流程，也不得重复题目或整段复述用户内容。
- AI 提出的方向在用户明确采用前不能进入 `keyInsights`；`keyInsights` 只记录用户已经明确表达或确认的内容。
- Ready 时用一到两句话说明可以形成答案，并在 `suggestedAnswer` 中生成完整当前题答案，不再继续追问。

## 原因

- 用户内容与题目之间的关系取决于实际表达，不能由固定题号关系穷举。
- Scaffolding 的价值是适应用户当下需要，而不是向用户暴露内部策略标签。
- 不增加策略字段可以保持结构化合同紧凑，减少当前模型不遵守复杂 Schema 和进入 repair 的概率。
- 将 Assessment 以普通文本交给 Call 2，可以保留判断信息，同时降低模型复制输入 JSON 的倾向。
- 让服务端决定流程状态，避免模型输出没有消费者或可能彼此矛盾的控制字段。

## 考虑过的替代方案

### 恢复 Assessment 的 `recommendedStrategy`

没有采用。Assessment 只负责判断当前信息是否足够；回复方式还需要理解用户最新的请求语气，把策略选择放回 Call 1 会扩大合同并混合职责。

### 让 Call 2 返回显式策略枚举

没有采用。研究上可以获得一个标签，但产品不消费该字段，还会增加结构校验负担。完整请求与原始回复已经进入模型调用快照，需要时可以离线分析实际脚手架行为。

### 保留静态 `parkingTargets` 作为候选提示

没有采用。即使声明“仅作提示”，它仍会对模型形成锚定，并削弱向前题或非预期相关题跳转的能力。

### 由系统自动把越界内容发送到目标题

没有采用。自动发送会绕过用户编辑与确认，继续保持预填但不自动提交。

## 后果

- Assessment 输入会增加一份短题目目录，研究日志中的上下文 token 估算必须包含这部分。
- 动态题号选择仍可能出现语义误判，但不会再受静态列表限制；原文和题号安全校验继续阻止伪造内容进入界面。
- Call 2 的回复更自然、简短，用户请求建议时不应再被连续追问同一缺口。
- 不保存显式 Scaffolding Strategy 标签；研究分析需要根据完整 Prompt 和原始回复判断实际采用方式。
- 历史 `aiSuggestions` 中的旧字段和旧提示不会被迁移，新规则只影响新调用。
- Assessment 的旧字段别名归一化暂时保留，是否删除需另行决策。

## 受影响位置

- `lib/protocol/question-scope.ts`
- `lib/server/question-contract.ts`
- `lib/design/assessment-decision.ts`
- `lib/server/model-provider.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/synthesize/route.ts`
- `components/workflow/workflow-app.tsx`
- `tests/unit/assessment-decision.test.ts`
- `tests/unit/assessment-schema.test.ts`
- `tests/smoke/protocol.test.ts`

## 验证

- Q1–Q21 均存在于 Assessment 使用的简短目录，且源码中不再存在 `parkingTargets`。
- 用户越界原文可以指向当前题之前或之后的任意合法题号；非用户原文、当前题和无效题号仍被过滤。
- `ready=true` 与明确证据不足或非空缺失项不能同时进入 Call 2。
- Call 2 请求只使用聊天回复合同；主动重新提炼只使用答案提炼合同。
- 用户请求建议时，Call 2 提供可选方向，而不是再次机械汇报缺口。
- TypeScript、lint、完整测试、smoke test 和生产构建通过。

## 回退

- 可恢复静态 `parkingTargets` 与合同提示，但不需要数据库迁移。
- 可把 Call 2 输入恢复为 Assessment JSON，或恢复旧的统一回复 Schema；已有模型调用快照保持不变。
- 可恢复旧 Prompt 版本，但应保留用户原文安全校验。
