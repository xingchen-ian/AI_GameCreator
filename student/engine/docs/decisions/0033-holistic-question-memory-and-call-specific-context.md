# ADR-0033：整体 Question Memory、Pre-answer 与按调用职责构造上下文

## 状态

Accepted，2026-10-24。本文取代 ADR-0032 中“统一 Question Context Package”的部分；ADR-0032 的按业务用途配置模型决定继续有效。

## 背景

原 Question Memory 虽然读取最终答案、对话和 AI suggestions，却把结果拆成确认决定、修改采用、拒绝、约束和未决项等数组。它没有把最终答案作为记忆的一部分，也难以连贯表达用户提出什么、AI 提出什么以及建议如何被处理。统一 Context Package 又让用户消息后的 Readiness Assessment 同时读取其他题目的 Memory，并在 Assessment 中承担一致性判断，和提交后的冲突审查职责重复。

## 决定

- 每个已确认问题只生成一份整体 Question Memory，不再区分 Overview 和详细 Memory。
- Question Memory 是对本题完整讨论过程的文字总结，必须区分用户想法、AI 建议、直接采用、修改采用、明确拒绝、尚未决定、被替代、重要理由和约束；系统在末尾原样追加该 revision 的最终确认答案。
- 原始消息、AI suggestions 和正式答案继续分别保存；Question Memory 是派生总结，不取代任何原始研究记录。
- 新题打开阶段命名为 Pre-answer。其分析读取此前所有当前版本 Question Memory；Memory 尚未生成时才使用对应确认答案回退。
- Pre-answer 只调用一次模型：读取此前所有整体 Memory，同时返回 `complete / partial / empty`、关键缺口、首条回复和候选答案。首条回复持久化到当前题对话。
- Pre-answer 回复必须明确区分“此前题目已经确认的信息”和“AI 当前提供的可选建议”，并标注确认信息来源题号。
- 用户每次发消息后的 Readiness Assessment 只读取当前题合同与当前题对话，不读取全局 Question Memory，不执行跨题冲突检查。
- Pre-answer 已经进入当前题第一条历史消息；长对话滚动摘要必须继续保留其中确认信息的来源，因此不再另外保存 `preAnswerEvidence`。
- Candidate 主动提炼也只读取当前题对话，因为 Pre-answer 复用的信息已经进入历史。
- 单题最低要求审查和跨题冲突审查仍在用户提交答案时独立执行。
- 删除统一 `question-context-package.ts`；各调用独立构造所需输入，只复用底层的题目合同、对话读取、Memory 读取和 token 估算函数。

## Question Memory 存储兼容

数据库现有 `question_memories.summary` 保存新的整体文字，旧数组列保留但新记录写入空数组，以避免破坏已有数据库和研究导出。研究导出增加 `memoryText`，同时暂时保留旧字段。新文字以 `Question Memory v2` 标记；同一答案 revision 再次触发 Memory 任务时，旧格式派生记忆会原位升级。

模型仍通过最小结构化传输字段 `{ memoryText }` 返回文字，以复用现有请求快照、严格校验和失败记录；业务存储和后续上下文只有一份连续文字，不再依赖多数组 JSON 语义。

## 原因

- 后续问题需要理解讨论来源和处理结果，只有最终答案会丢失拒绝、未决和 AI 建议的角色信息。
- 发送十几道题的完整原始对话会产生明显噪声和 token 成本；每题一份整体总结可在保留语义的同时控制长度。
- 题目相关性取决于每位用户实际写的内容，不能只靠固定题号关系；当前只有十几道题，Pre-answer 直接读取所有压缩后的整体 Memory 比“先读完再返回相关题号、随后调用第二次”更简单且更快。
- Readiness 是单题充分性判断，跨题一致性属于提交后的 Conflict Review；拆开职责能减少输入、延迟和误判。
- 单独保存 Pre-answer 证据会与已经持久化的第一条聊天消息重复。

## 后果

- 新增独立模型用途 `pre_answer` 与环境变量 `DASHSCOPE_PRE_ANSWER_MODEL`；本地默认仍由研究者选择的模型承担。
- 新 Question Memory 比纯最终答案摘要包含更多过程信息，但显著短于完整原始对话。
- Pre-answer 单次调用会读取所有既有 Memory；当前题目数量为十几道时可控，若未来扩大到数十或上百道，应在模型调用之前引入检索索引或向量召回，而不是让模型读完全部 Memory 后再筛选给第二次调用。
- 旧格式 Memory 不会在前台阻塞升级；重新保存同一答案或产生新 revision 会以 `memory-v2` 后台任务生成新格式。

## 受影响位置

- `lib/server/question-memory.ts`
- `lib/server/model-context.ts`
- `lib/server/conversation-memory.ts`
- `lib/server/question-contract.ts`
- `lib/server/model-provider.ts`
- `lib/server/model-routing.ts`
- `app/api/ai/question-start/route.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/synthesize/route.ts`
- `app/api/workspace/route.ts`
- `lib/server/research-export.ts`

## 验证

- 新 Memory Schema 只接受整体 `memoryText`，最终确认答案由服务器原样追加。
- Pre-answer 使用独立 purpose，并在一次调用内完成覆盖判断与首条回复生成。
- Readiness Assessment 的 Schema 和 Prompt 不再包含 consistency，也不包含其他题目的设计证据。
- 类型检查、单元测试、Lint 和生产构建全部通过后交付。
