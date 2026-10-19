# ADR-0002：使用版本化 Design State → GDD → Build Brief 链路

- 状态：Accepted
- 日期：2026-10-12
- 决策者：产品负责人 / Codex
- 关联：[V1 产品架构](../v1-product-architecture.md)

## 背景

直接把零散的 23 题答案交给代码生成模型，会丢失答案之间的关系，也难以解释某个游戏版本来自哪一次设计。用户还要求当全局 GDD 存在冲突时，系统给出反馈和修改提示。

## 决定

正式构建链路分为四层：确认后的 Design State、冻结的 Design Snapshot、版本化 GDD、版本化 Build Brief。GDD 生成时同时进行全局一致性审查；未处理的 blocker 会阻止确认和 Build Brief 生成。V1 通过复制或下载 Build Brief 人工交给 Codex，不在网站里自动启动外部 Agent。

## 原因

- 每个产物都能追溯到具体答案修订；
- 修改上游答案后可以标记下游产物过期，而不是静默覆盖；
- 冲突反馈能指回问题和证据；
- 人工交接降低 V1 的执行权限和远程代码安全风险。

## 考虑过的替代方案

### 直接从答案生成游戏代码

没有采用。缺少稳定的中间合同，难以审查、复现和比较版本。

### V1 直接自动调用 Codex

暂未采用。需要额外处理任务生命周期、生成物导入、沙盒、超时和权限边界。

## 后果

### 正面影响

- 设计和实现之间存在明确合同；
- GDD 冲突不会被模型自动改写；
- 历史版本可保留。

### 代价与风险

- 用户需要完成更多确认步骤；
- V1 的完整游戏生成仍需要人工交接；
- GDD 审查质量仍取决于模型和 Prompt，需要持续评估。

## 受影响位置

- `db/schema.ts`
- `app/api/gdd/route.ts`
- `app/api/build-brief/route.ts`
- `lib/design/gdd.ts`
- `components/workflow/gdd-panels.tsx`

## 验证方式

确认答案后可以生成带来源题号的 GDD；blocker 被处理前不能确认；上游答案变化后当前 GDD 和 Build Brief 会显示为过期。

## 回退方式

保留 Design Snapshot 和 GDD 数据，只关闭 Build Brief 入口；不会删除历史设计记录。
