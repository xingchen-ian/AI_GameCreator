# ADR-0014：普通 JSON 模型输出先归一化再进入安全边界

- 状态：Superseded by [ADR-0015](0015-strict-structured-output-with-one-repair.md)
- 日期：2026-10-18
- 决策者：产品负责人 / Codex
- 延续：[ADR-0012](0012-lightweight-ai-conflict-review.md) 的轻量化审查策略

## 背景

全局审查为避免严格 JSON Schema 被供应商拒绝后重复请求，改用 `json_object`。线上请求随后出现“模型生成的内容没有通过安全结构校验”：模型返回的是可解析 JSON，但字段名、缺省字段或数组元素类型与应用的严格对象 Schema 存在轻微偏差，导致整次审查在约两秒内返回 500。恢复严格 Schema 会重新引入慢请求和二次请求风险。

## 决定

- 普通 JSON 模式只在模型适配层要求根对象是 JSON object；
- `/api/gdd` 对 `issues` 逐项归一化：接受常见字段别名、从文本中提取 Q1–Q23、去重并限制数量，缺失严重度时使用 `warning`；
- 少于两个有效题号的冲突仍直接丢弃，模型不能通过字段兼容层绕过题号安全边界；
- 最终返回前重新组装为应用内部固定的 `GeneratedIssues`，`finalize` 仍使用正式 `gddIssuesSchema` 校验；
- 单冲突对话同样先归一化 `reply` 和 `proposedChanges`，但目标题号、目标类型、原答案一致性和写入长度仍由既有后端逻辑检查；
- 一条格式异常的 issue 或 change 只丢弃该项，不再让整轮 GDD 生成失败。

## 原因

- 模型格式偏差和不安全写入是两个不同问题：前者应兼容，后者必须在持久化边界拒绝；
- 逐项归一化能保留其他有效冲突，避免用户因一个字段缺失重新生成整份 GDD；
- 白名单题号、目标集合和 `beforeContent` 校验继续提供实际写入安全；
- 不需要第二次模型请求，保持 ADR-0012 的速度目标。

## 后果

- 模型省略可选说明字段时，系统可能使用简短默认文案；
- 严重缺失题号或正文的项目会被过滤，界面可能显示更少冲突，但不会报整轮失败；
- JSON 本身不可解析或根不是对象时仍会失败；`json_object` 响应格式应显著降低这种概率；
- 不涉及数据库迁移，历史数据不变。

## 受影响位置

- `lib/server/model-provider.ts`
- `app/api/gdd/route.ts`
- `app/api/ai/gdd-review/route.ts`

## 验证方式

- 字段完整的标准输出正常归一化；
- `question_ids`、`suggestions` 等常见别名可以被读取；
- 非法题号和不足两个有效题号的冲突不会保存；
- 无修改建议的单冲突响应仍能显示 reply；
- 最终 GDD 保存继续通过正式 Schema；
- Lint 与生产构建通过。

## 回退方式

把两个模型调用恢复为正式严格 Schema 的本地即时校验，并移除归一化函数。无需数据库回退。
