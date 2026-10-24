# ADR-0037：分离 Ready 与 Not Ready 的 Call 2 输出合同

## 状态

Superseded，2026-10-24。由 [ADR-0038](0038-unified-coach-turn-and-incremental-question-memory.md) 取代；普通聊天不再固定执行独立 Assessment 与分支 Call 2。

## 背景

普通聊天的 Ready 与 Not Ready 分支共用同一个结构化 Schema：`reply` 与 `suggestedAnswer` 都是必填字符串。Prompt 要求 Not Ready 时把 `suggestedAnswer` 留空，但 JSON Schema 无法表达“字段只在 Ready 时存在”的语义条件。

真实 Q10 对话中，用户请求结合采集与创作的具体建议。Scaffolding 模型在 `reply` 中写“我直接给你两个思路”，却把两个实际方向放进 `suggestedAnswer`。服务端为了防止 Not Ready 内容进入答案框，正确地丢弃了该字段，最终用户只看到承诺而看不到选项。前一轮同样把主要建议放进了随后被丢弃的 `suggestedAnswer`。原始响应没有截断，前端也没有漏渲染；根因是共用合同为模型提供了错误的内容出口。

## 决定

- Assessment 完成后，服务端根据最终 `ready` 布尔值选择 Call 2 的互斥合同；每轮仍只执行一次 Call 2。
- Not Ready 使用 `scaffoldingReplySchema`，只允许一个 `reply` 字段。所有问题、建议、选项和例子必须完整写入用户可见回复，不存在答案草稿字段。
- Ready 使用 `candidateTurnReplySchema`，允许 `reply` 与 `suggestedAnswer`。`reply` 简短说明可以形成答案，`suggestedAnswer` 保存完整当前题候选答案。
- 两个分支分别维护 Prompt 与 Schema 版本：`coach-scaffolding-v1 / scaffolding-reply-v1` 和 `coach-candidate-v1 / candidate-turn-reply-v1`。
- 模型用途路由不变：Not Ready 使用 `scaffolding`，Ready 使用 `candidate`；模型调用操作名继续统一为 `game_design_coach_response`，研究时结合 purpose、Prompt 版本和 Schema 版本区分。
- 服务端仍只在 Ready 分支接受候选答案；Not Ready 不再需要生成后丢弃空字符串或防御性清空模型误写的草稿。

## 原因

- 用结构消除不合法表达，比依赖 Prompt 要求模型返回空字符串更可靠。
- Not Ready 模型只有用户可见 `reply` 一个出口，不会再把关键建议藏进答案字段。
- Ready 和 Not Ready 的职责、模型及用户界面本就不同，独立合同更符合实际状态机。
- 分离合同不增加模型调用次数，也不改变 Assessment 或用户确认机制。

## 考虑过的替代方案

### 继续共用 Schema并强化 Prompt

没有采用。模型已经在严格 Schema 请求下多次满足字段类型却违反分支语义；继续叠加提示不能消除 `suggestedAnswer` 这个错误出口。

### Not Ready 发生误写时把 `suggestedAnswer` 拼接回 `reply`

没有采用。服务端无法可靠判断两个字段应如何排序、去重或衔接，也可能把接近正式答案的内容误当成普通建议展示。

### Not Ready 也显示答案框中的 `suggestedAnswer`

没有采用。这会重新引入“AI 还在追问但答案框已有草稿”的原始交互问题，并混淆 Readiness 与用户确认。

## 后果

- Call 2 有两个小型 Schema，而不是一个带分支语义的统一 Schema。
- Not Ready 回复可以包含完整的二到三个建议方向，不会因服务端丢弃候选答案而消失。
- Ready 候选答案仍由 Candidate 模型生成并进入答案编辑区。
- 历史模型调用和 suggestion JSON 保持不变，不需要数据库迁移。
- 研究统计若按 Schema 版本聚合，需要把两个新版本视为同一 Call 2 的不同状态分支。

## 受影响位置

- `lib/server/model-provider.ts`
- `app/api/ai/chat/route.ts`
- `tests/unit/assessment-schema.test.ts`
- `docs/decisions/0035-dynamic-parking-and-adaptive-scaffolding.md`
- `docs/decisions/0036-remove-generated-key-insights.md`

## 验证

- Not Ready 合同接受 `{ reply }`，并拒绝额外的 `suggestedAnswer`。
- Ready 合同要求 `{ reply, suggestedAnswer }`。
- 两个分支都只触发一次 `game_design_coach_response` 调用，并使用正确的 purpose。
- 用户请求建议时，二到三个方向出现在持久化的助手消息中，而不是不可见的候选字段。
- TypeScript、lint、完整测试、smoke test 和生产构建通过。

## 回退

可恢复统一的 `coachTurnReplySchema` 和条件 Prompt；数据库与历史记录不需要迁移，但会重新暴露 Not Ready 内容进入错误字段的风险。
