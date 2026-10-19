# ADR-0015：严格结构化输出、语义校验与一次有限修复

- 状态：Accepted
- 日期：2026-10-18
- 决策者：产品负责人 / Codex
- 替代：[ADR-0014](0014-normalize-non-strict-model-json.md) 的宽松字段归一化方案

## 背景

ADR-0014 用普通 JSON 和字段别名归一化解决了线上结构校验失败，但它可能把“模型漏掉 issues”误判成“没有冲突”，也可能从证据正文推测并非正式关联的题号。阿里云官方文档确认 Qwen3.8-Flash 支持严格 JSON Schema，并建议结构化输出时不要设置 `max_tokens`，避免 JSON 被截断。因此宽松归一化适合作为紧急修复，不适合作为最终正式边界。

## 决定

- GDD 全局冲突扫描和单冲突对话恢复 `json_schema`、`strict: true`；
- Schema 只使用百炼严格模式支持的关键字：`type`、`enum`、`properties`、`required`、`additionalProperties`、`minItems`、`maxItems`、`maxLength` 等；不使用不受支持的 `uniqueItems`；
- 严格结构化请求不发送 `max_tokens`，改由 Schema 的数组与字符串长度限制和 Prompt 控制输出规模；
- 模型结果仍在服务端用同一 Schema 再验证一次；随后再做题号白名单、去重、快照和写入目标等语义校验；
- 若所选模型拒绝严格 Schema（HTTP 400），降级为一次 JSON Object 请求并记录 `structured_output_strict_fallback`；
- 若初次结果未通过本地 Schema，最多调用一次只修 JSON 格式的修复请求。修复 Prompt 禁止改变实质判断；第二次仍失败则明确报错，不伪装成空冲突；
- 删除业务路由中的字段别名、默认分析文本和从 evidence 猜题号的逻辑；
- 记录不含用户正文的结构化输出指标：步骤名、角色、是否严格、是否降级、是否修复、耗时和失败路径。Cloudflare 请求日志会提供对应 request ID。

## 原因

- 格式约束应优先由支持 Structured Output 的供应商能力完成；
- 结构校验与业务语义校验职责不同，必须同时保留；
- 一次有限修复能处理偶发格式偏差，又避免无限重试和不可控费用；
- 不记录原始模型输出或用户答案，避免诊断日志包含设计内容；
- 明确失败比把格式错误当成“没有冲突”更可信。

## 后果

- 正常情况下只有一次模型调用；只有严格模式被拒绝或本地校验失败时才会降级或修复；
- 严格输出不再受 `max_tokens` 截断，但 Schema 与 Prompt 会限制输出长度；
- 如果切换到不支持当前 Schema 的模型，系统会留下可观测的降级日志；
- 模型两次都不能满足结构时，用户会收到明确错误并重试当前步骤；
- 不涉及数据库迁移，历史答案、GDD、冲突和修改记录不变。

## 受影响位置

- `lib/server/model-provider.ts`
- `app/api/gdd/route.ts`
- `app/api/ai/gdd-review/route.ts`

## 验证方式

- 严格请求中不包含 `max_tokens`；
- GDD 冲突和单冲突建议均通过正式 Schema；
- `uniqueItems` 不进入供应商 Schema；
- 非法或重复题号仍由服务端过滤；
- 格式失败最多触发一次修复；
- 日志不包含用户答案或原始模型正文；
- Lint 与生产构建通过。

## 回退方式

恢复 ADR-0014 的 JSON Object 根对象校验和业务路由归一化函数。无需数据库回退。
