# ADR-0034：Readiness Assessment 只输出整体二元判断

## 状态

Accepted，2026-10-24。本文取代 ADR-0030 中“保留五个评估维度字段”的部分。

## 背景

真实调用中，`deepseek-v4-flash-0731` 已正确判断当前题可以形成答案，却自然返回 `ready: true`，没有返回 relevance、completeness、specificity 等中间维度。DashScope 接受严格 JSON Schema 参数但未实际强制该模型逐项遵守，导致一次 1.77 秒的有效判断又进入约 2.09 秒 repair。应用的实际分支只依赖是否 Ready、阻塞缺口和跨题暂存。

## 决定

- Readiness Assessment 只输出 `ready`、`summary`、`missingElements` 和 `parkedInsights`。
- `ready` 使用布尔值，和模型自然输出及应用分支一致。
- relevance、completeness 和 specificity 不再作为强制输出字段；模型仍根据当前题合同、范围和最低完成标准综合判断，但不分别汇报中间评分。
- `summary` 是 Ready / Not Ready 的简短判断理由，不是对用户消息的普通摘要。
- 为兼容偶发旧输出，服务端可确定性地把 `readiness: "ready" / "not_ready"` 或同义 `status` 转为布尔值；不能据此补写其他语义判断。
- repair 保留为异常兜底，不再为没有消费者的诊断字段触发正常路径修复。

## 后果

- 正常 Assessment 输出更短，模型遵循概率更高；根据最近一次实测可省去约 2.1 秒 repair。
- 研究数据不再直接提供每轮 relevance、completeness、specificity 标签；完整 Prompt、原始响应、整体判断理由和缺口仍然保存。
- 跨题一致性继续由提交后的 Conflict Review 负责，不进入 Readiness。

## 受影响位置

- `lib/server/model-provider.ts`
- `lib/server/model-routing.ts`
- `app/api/ai/chat/route.ts`
- `tests/unit/assessment-schema.test.ts`
- `tests/unit/model-routing.test.ts`

## 验证

- `ready: true / false` 均能通过本地 Schema。
- 旧 `readiness: "ready" / "not_ready"` 能在不调用 repair 的情况下确定性归一化。
- Candidate 与 Scaffolding 模型路由只依赖布尔 `ready`。
