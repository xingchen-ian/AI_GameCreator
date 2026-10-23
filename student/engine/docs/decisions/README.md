# Architecture Decision Records

这里保存 Game Design Workflow 的架构决策记录（ADR）。它不是功能清单，而是解释每个重要设计为什么这样做、曾考虑什么替代方案，以及决定带来的后果。

## 记录规则

以下变化必须新增或更新 ADR：

- 产品边界或核心工作流变化；
- 数据模型、版本关系或状态机变化；
- AI Prompt 的职责、上下文范围或模型路由变化；
- 安全、身份、权限、沙盒或外部服务策略变化；
- 会明显影响后续实现方式的技术选型；
- 放弃一个已经讨论过的重要方案。

纯视觉微调、文字修正和不改变行为的小型重构通常不需要 ADR。

每条记录至少包含：背景、决定、原因、替代方案、后果、受影响位置、验证与回退方式。重要决定发生变化时，不覆盖旧原因；把旧记录标为 `Superseded`，并新增一条记录链接回去。

## 状态

- `Proposed`：仍在讨论。
- `Accepted`：当前采用。
- `Superseded`：已被新决定替代。
- `Rejected`：讨论过但没有采用。

## 决策索引

| 编号 | 决策 | 状态 | 日期 |
| --- | --- | --- | --- |
| [ADR-0001](0001-separate-workflow-product.md) | Workflow 与 Agent 分离为独立项目 | Accepted | 2026-10-11 |
| [ADR-0002](0002-versioned-design-to-build-pipeline.md) | 使用版本化 Design State → GDD → Build Brief 链路 | Accepted | 2026-10-12 |
| [ADR-0003](0003-question-scope-and-parking-lot.md) | 单题范围合同与“稍后讨论”机制 | Accepted | 2026-10-12 |
| [ADR-0004](0004-rebuild-by-archiving-current-project.md) | 通过归档当前项目来重建空白项目 | Superseded | 2026-10-12 |
| [ADR-0005](0005-chunked-atomic-gdd-generation.md) | 分步生成并原子保存完整 GDD | Accepted | 2026-10-12 |
| [ADR-0006](0006-global-gdd-review-node-and-confirmed-patches.md) | 全局 GDD 审查节点与确认式 Patch | Accepted | 2026-10-13 |
| [ADR-0007](0007-conflict-driven-global-gdd-review.md) | 冲突驱动的逐项全局 GDD 审查工作区 | Superseded | 2026-10-17 |
| [ADR-0008](0008-gdd-review-inside-output-pipeline.md) | GDD 审查属于产出流程，右侧持续呈现状态机 | Accepted | 2026-10-17 |
| [ADR-0009](0009-editable-global-review-answer.md) | 全局审查建议可编辑后再写入 | Accepted | 2026-10-17 |
| [ADR-0010](0010-ai-review-instead-of-mechanical-dependency-propagation.md) | 答案修改不再机械传播“待复核”状态 | Accepted | 2026-10-17 |
| [ADR-0011](0011-ai-grounded-conflicts-without-categories.md) | 删除预设冲突分类，只保存有原题证据的 AI 冲突判断 | Accepted | 2026-10-17 |
| [ADR-0012](0012-lightweight-ai-conflict-review.md) | 轻量化 AI 全局冲突审查 | Accepted | 2026-10-17 |
| [ADR-0013](0013-batched-global-review-revisions.md) | 一轮全局审查支持集中完成多项修改 | Superseded | 2026-10-18 |
| [ADR-0014](0014-normalize-non-strict-model-json.md) | 普通 JSON 模型输出先归一化再进入安全边界 | Superseded | 2026-10-18 |
| [ADR-0015](0015-strict-structured-output-with-one-repair.md) | 严格结构化输出、语义校验与一次有限修复 | Accepted | 2026-10-18 |
| [ADR-0016](0016-design-review-before-gdd.md) | 先审查 Design State，再生成与确认 GDD | Accepted | 2026-10-19 |
| [ADR-0017](0017-multi-project-workspace.md) | 多项目工作区与两阶段删除 | Accepted | 2026-10-19 |
| [ADR-0018](0018-research-data-logging.md) | 记录 AI 建议、答案修订历史与模型调用 | Accepted | 2026-10-19 |
| [ADR-0019](0019-separate-prototype-implementation-agent.md) | Workflow 停止内建 Prototype，交由独立实现 Agent | Accepted | 2026-10-19 |
| [ADR-0020](0020-review-model-and-reproducibility-metadata.md) | 独立审查模型与可复现实验元数据 | Accepted | 2026-10-19 |
| [ADR-0021](0021-typecheck-and-route-smoke-gates.md) | 强制类型检查与关键 API smoke test | Accepted | 2026-10-21 |
| [ADR-0022](0022-optimistic-chat-messages.md) | 对话消息乐观显示并与服务端记录对账 | Accepted | 2026-10-22 |
| [ADR-0023](0023-user-grounded-cross-question-parking.md) | 跨题暂存必须来自用户原文并可带入目标问题 | Accepted | 2026-10-22 |
| [ADR-0024](0024-move-experience-validation-after-prototype.md) | 从设计 Protocol 移除 Q22/Q23，把体验验证移到原型之后 | Accepted | 2026-10-22 |

## 后续工作约定

今后每次完成重要更新时，同时执行以下动作：

1. 新增或修订对应 ADR；
2. 更新本索引；
3. 在最终交付说明中链接对应记录；
4. 若实现与 ADR 不一致，明确标注偏差，不能静默改变原因；
5. 若只是实验，先使用 `Proposed`，验证后再改为 `Accepted`。

新记录从 [ADR 模板](0000-template.md) 复制。
