# ADR-0038：统一 Coach Turn、跨题双入口与增量 Question Memory

## 状态

Accepted，2026-10-24。本文取代 ADR-0037 的双调用与分支输出合同，并修订 ADR-0033 中普通聊天只读取当前题上下文的决定。

## 背景

固定的 Assessment → Response 两次调用重复读取当前题历史，增加网络等待，并使两个模型可能产生不一致理解。普通回复又看不到全部前题 Memory，因此用户在后题讨论中纠正早期机制时，系统只能把它当作本题澄清，无法可靠指出受影响题目。

冲突 UI 还把“冲突来源题”和“建议修改目标”混成一个跳转字段。当模型建议修改当前题时，会显示没有意义的“前往当前题”。答案修订后，Question Memory 也会重新读取大量完整历史，而不是复用上一版整体总结。

## 决定

- 用户每次发送消息后只执行一次 `Coach Turn`，统一输出 `ready`、`decisionReason`、`reply`、`suggestedAnswer` 和 `crossQuestionIssues`。
- Readiness 只依据当前题合同、当前题对话和当前题上一版确认答案；全部最新 Question Memory 只用于理解整体设计、避免遗忘以及识别跨题影响。
- Not Ready 时 `suggestedAnswer` 必须为空，所有问题、建议与例子完整出现在 `reply`；Ready 时同时生成当前题完整候选答案。
- `crossQuestionIssues` 区分 `possible_update` 与 `conflict`，记录真实旧题号、解释、推荐修改当前题/旧题/任意一边，以及可选的完整修改草稿。
- UI 无论推荐哪一边，都保留“处理当前题”和“查看旧题”两个入口。只有推荐修改的目标可以自动带入未确认草稿；任何草稿都不能自动覆盖已确认答案。
- 提交时仍对用户实际提交的最终文本执行宽松单题审查和正式跨题冲突审查。聊天阶段提示是提前反馈，不替代最终兜底。
- Question Memory 按答案 revision 保留历史版本。第一版使用当前工作上下文生成；后续版本使用“上一版完整 Memory + 上一版之后新增的对话与建议 + 新确认答案”生成新的完整替代 Memory。
- 新 Memory 保存 `baseMemoryId`、`throughMessageId` 与 `throughCreatedAt`，以明确增量边界。后续题目只读取与当前确认答案 revision 匹配的最新 Memory。

## 原因

- 普通讨论从固定两次调用降为一次，减少重复上下文和延迟。
- 全部 Memory 由同一个回复模型读取，允许用户在任何后题发现未被 Pre-answer 引用的早期机制。
- Readiness 与跨题影响在同一次调用中仍有明确职责边界，避免其他题目替用户补全当前题。
- 冲突来源和修改建议分离后，跳转始终有意义，用户仍保留修改任意一边的决定权。
- 增量 Memory 保留完整设计演变，同时避免每次 revision 从第一条消息重新总结。

## 考虑过的替代方案

### 保留独立 Assessment 与 Candidate Writer

没有采用。其主要价值是 Ready 与 Not Ready 使用不同模型，但代价是每轮固定两次调用和上下文重复。当前更重视响应速度与单一理解链。

### 只把 Pre-answer 引用的题目传给后续回复

没有采用。用户可能在讨论中突然修正一个 Pre-answer 没有引用的机制，静态引用集合会再次漏掉关联。

### 把聊天期冲突提示完全替代提交审查

没有采用。用户可能手写或编辑最终答案，聊天提示审查的不是最终提交文本，不能作为唯一安全边界。

### 修订答案后重新读取完整历史

没有采用。上一版 Question Memory 已经是受控的整体总结，重复读取全部原文浪费上下文，并会随修订次数持续变慢。

## 后果

- 新增模型用途环境变量 `DASHSCOPE_COACH_TURN_MODEL`；删除不再使用的 Assessment 与 Scaffolding 运行时配置。`DASHSCOPE_CANDIDATE_MODEL` 继续用于用户主动点击“AI 重新提炼”的独立功能。
- 当前 Coach 模型实测会在服务商接受 `strict=true` 后仍遗漏字段，因此 Coach Turn 使用 JSON 模式、本地完整 Schema 校验与一次有限 repair；只归一化 `isReady` 等确定性别名并过滤非对象跨题项。其他用途的 strict 策略不变。
- 普通 Coach Turn 的输入变长，因为包含全部最新 Question Memory，但只发生一次模型调用。
- 统一 Schema 再次要求 Not Ready 返回空 `suggestedAnswer`；服务端会防御性忽略 Not Ready 草稿，Prompt 明确要求建议完整出现在 `reply`。
- 数据库需要为 `question_memories` 增加三个可空增量追踪字段；旧 Memory 仍然可读。
- 跨题草稿只存在于前端未确认状态，跳转和刷新都不能自动修改确认答案。

## 受影响位置

- `app/api/ai/chat/route.ts`
- `app/api/ai/answer-review/route.ts`
- `components/workflow/workflow-app.tsx`
- `lib/design/cross-question-issues.ts`
- `lib/server/model-provider.ts`
- `lib/server/question-memory.ts`
- `db/schema.ts`
- `drizzle/0015_simple_lenny_balinger.sql`

## 验证

- 一次用户消息只产生一个 `game_design_coach_turn` 模型调用。
- Coach Turn 模型上下文统计包含全部可用的最新前题 Memory。
- Not Ready 不进入答案框，Ready 才产生候选答案。
- 跨题问题不会指向当前题或不存在题号；两个处理入口均可用，只有推荐目标携带草稿。
- 答案 revision 2 及以后生成 Memory 时只读取上一版后的增量消息，并保留上一版 Memory 链接。
- TypeScript、lint、单元测试、smoke test 与生产构建通过。

## 回退

可恢复 ADR-0037 的 Assessment + 分支 Response 两次调用；数据库新增字段均为可空，不影响旧代码读取。Question Memory v3 可继续作为普通文本 Memory 使用。
