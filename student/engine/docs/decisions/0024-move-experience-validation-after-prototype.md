# ADR-0024：从设计 Protocol 移除 Q22/Q23，把体验验证移到原型之后

- 状态：Accepted
- 日期：2026-10-22
- 决策者：产品负责人 / Codex
- 关联：[ADR-0001](0001-separate-workflow-product.md)、[ADR-0019](0019-separate-prototype-implementation-agent.md)

## 背景

Stage 6 原本包含 Q22“预测陌生玩家实际会做什么、感受什么”和 Q23“判断实际体验是否与目标体验一致”。但当前 Workflow 已决定不再内建 Prototype，后续由独立 Prototype Implementation Agent 实现和试玩。要求设计者在原型出现前回答 Q22/Q23，本质上仍是基于规则的预测，容易被误认为真实体验验证，也增加了完成 Design State 的负担。

## 决定

1. 从六阶段设计 Protocol 中移除 Q22 与 Q23，总题数从 23 调整为 21。
2. Stage 6 改名为“进程与结果”，只保留 Q20“游戏进程”和 Q21“结束结果”。
3. 目标体验仍由 Stage 2 定义；是否真正达成目标体验，必须在可玩原型出现后通过 Playtest Evidence 判断。
4. GDD 不再生成“实际体验预测/对齐结论”，改为生成“原型测试假设”，只说明未来需要观察什么，不提前声称结果。
5. 全局审查、GDD 必填门槛、跨题导航和模型结构化输出只接受 Q1–Q21。
6. 数据库中已有 Q22/Q23 答案和对话不删除，继续保留用于研究追溯和导出；它们不再进入当前 Design State、完成度、全局审查或新 GDD。
7. 旧项目若停留在 Q22/Q23，打开时回到 Q21。由于有效答案快照发生变化，生成新 GDD 前需要按 21 题 Protocol 重新执行全局审查。

## 原因

- 真实试玩证据优于设计阶段的主观预测；
- Workflow 应负责形成可实现的设计合同，而不是模拟尚未发生的测试结果；
- 把体验验证放在独立 Prototype Agent 之后，能形成清晰的“设计 → 实现 → 试玩 → 修订”证据链；
- 保留历史记录而不是删除，可以维持研究数据的可追溯性。

## 考虑过的替代方案

### 保留 Q22/Q23 作为可选题

没有采用。即使标为可选，它们仍会在界面和 GDD 中暗示设计阶段的预测等同于验证。

### 把 Q22/Q23 移到全局审查

没有采用。全局审查负责发现已确认设计决定之间的矛盾，不应承担没有原型证据的体验评估。

### 删除历史 Q22/Q23 数据

没有采用。物理删除会破坏已有项目、修订记录和研究导出的完整性。

## 后果

- Workflow 完成门槛变为 20 道必答题加可选 Q8；
- Stage 6 更短，只负责 progression 与 outcome；
- 新生成 GDD 的体验章节只陈述目标体验，测试章节只列待验证假设；
- 体验对齐功能要等独立 Prototype Implementation Agent 和 Playtest Evidence 接口出现后实现；
- 旧的审查快照和 GDD 仍可查看，但不能代表新的 21 题 Protocol 已通过。

## 受影响位置

- `lib/protocol/stages.ts`
- `lib/protocol/question-scope.ts`
- `lib/design/gdd.ts`
- `lib/server/model-provider.ts`
- `lib/server/workspace.ts`
- `components/workflow/gdd-panels.tsx`
- `components/workflow/gdd-review-workspace.tsx`
- `app/api/ai/chat/route.ts`
- `app/api/ai/synthesize/route.ts`
- `app/api/design-review/route.ts`
- `app/api/ai/gdd-review/route.ts`
- `app/api/gdd/route.ts`
- `tests/smoke/protocol.test.ts`

## 验证方式

- 左侧 Stage 6 只显示 Q20、Q21，整体进度以 21 题计算；
- GDD 和全局审查在 Q1–Q21 范围内工作，Q8 仍为可选；
- AI 结构化输出不能引用或导航至 Q22/Q23；
- 旧 Q22/Q23 答案不计入完成度，也不进入新答案快照；
- 旧项目的 active question 为 Q22/Q23 时安全回到 Q21；
- typecheck、smoke test 与生产构建通过。

## 回退方式

重新把 Q22/Q23 加回 `stages.ts`、范围合同、模型题号枚举与 GDD section plan，并重新定义它们是“预测”还是“验证”。历史数据库数据仍在，因此不需要恢复数据。
