# ADR-0030：压缩 Assessment 输出合同

## 状态

Accepted，2026-10-24。保留五个评估维度字段的部分已由 ADR-0034 取代。

## 背景

两阶段交互中的 Assessment 使用快速模型判断 Ready / Not Ready，再由回复模型生成面向用户的内容。旧合同要求 13 个字段，并对多个说明数组设置长度限制。实际调用持续出现 `repaired`：快速模型已经完成判断，但第一次 JSON 因冗余字段或非关键格式约束没有通过本地校验，导致额外模型调用和延迟。

## 决定

- 用户消息后的 Assessment 保留五个原始评估维度、Readiness、一句摘要、阻塞性缺口和跨题暂存。
- 删除 evidence、satisfiedElements、optionalImprovements、consistencyNote 和独立 readinessReason；摘要承担简短可审计解释。
- 打开题目时的 Initial Assessment 只返回 coverage、摘要和阻塞性缺口；`canFormCandidate` 由服务端根据 `coverage === complete` 确定。
- Scaffolding Strategy 不再作为 Assessment 枚举字段。Call 2 根据缺口自行选择提问、澄清、选项或示例；服务端只根据 Ready 和 direct conflict 决定候选答案或上游复核分支。
- Assessment Schema 不再用 `maxLength`、`maxItems` 等非关键限制触发整次修复；枚举、类型、必填字段和禁止额外字段仍由严格 Schema 保证。
- 在校验前允许有限的确定性字段别名归一化，例如 fast model 的 `status → coverage`、`reasoning → summary`。归一化只重命名已知字段并移除未使用键，不补写或改变模型判断。
- 保留一次 repair 作为异常兜底，但它不应成为正常路径。

## 原因

策略分支实际只依赖 Readiness/Coverage、冲突、范围、下一步策略和跨题内容。其余字段重复表达同一判断，增加了结构错误概率和第二次调用成本。由服务端推导布尔值还能消除 coverage 与 canFormCandidate 自相矛盾的状态。

## 替代方案

- 完全移除 Assessment：会重新引入过早生成答案和反复追问，拒绝。
- 保留旧字段并提高长度限制：仍有大量冗余字段和矛盾组合，拒绝。
- 禁用 repair：能消除额外调用，但偶发格式问题会直接让用户请求失败，因此只把 repair 留作兜底。

## 后果

- 新记录中的 Assessment 字段比旧版本少，分析时应按 prompt/schema version 区分。
- Call 2 得到的诊断细节更少，但仍拥有完整对话、设计上下文和必要策略，不影响回复生成。
- 正常情况下 Assessment 应一次完成；完整模型快照可继续监测 repair 是否再次发生。

## 受影响位置

- `lib/server/model-provider.ts`
- `app/api/ai/chat/route.ts`
- `app/api/ai/question-start/route.ts`
- `tests/unit/assessment-schema.test.ts`

## 验证与回退

- 使用真实 fast model 分别验证 Initial Assessment 和用户消息 Assessment，确认 outcome 为 success 且只有一次 attempt。
- 若精简后判断质量下降，可按 schema version 恢复某个有明确消费者的字段，而不是整体恢复旧合同。
