# ADR-0019：Workflow 停止内建 Prototype，交由独立实现 Agent

- 状态：Accepted
- 日期：2026-10-19
- 决策者：产品负责人
- 关联：[ADR-0002](0002-versioned-design-to-build-pipeline.md)、[ADR-0016](0016-design-review-before-gdd.md)

## 背景

Workflow 之前同时承担问题协作、Design State 审查、GDD、Build Brief 和有限状态机 Prototype。内建 Prototype 只支持少数固定动作，容易让用户误以为它代表完整游戏实现，也让 Workflow 和后续实现 Agent 的职责重叠。

全局审查中央面板和右侧 GDD 面板还同时提供“生成 GDD”，造成同一个动作有两个入口，且两个区域可能呈现不同的产出状态。

## 决定

- Workflow 的正式产出终点调整为已确认 GDD 与 Build Brief；
- 删除顶部 `Run prototype`、生成弹窗、右侧“试玩”页签、浏览器 Prototype 运行时和 `/api/prototypes` 写入入口；
- 删除仅服务于旧 Prototype 的 `GameSpec` Schema 和四题生成门槛；
- 全局审查中央面板只表达审查状态，不提供“生成 GDD”按钮；
- GDD 的生成、确认和进入 Build Brief 的操作统一放在右侧 GDD 面板；
- 已存在的 Prototype 数据表、项目版本字段和历史数据暂时保留，避免破坏旧项目与级联删除关系；新 Workflow 不再读取或展示这些数据；
- 后续由独立 Prototype Implementation Agent 消费 Build Brief，并管理实现、运行和迭代。

## 原因

- 让 Workflow 专注于游戏设计推理与设计文档，不假装完成通用游戏实现；
- 为实现 Agent 保留清晰输入合同和独立演进空间；
- 消除同一动作在中央面板与右侧面板重复出现造成的状态冲突；
- 保留历史数据可以避免为了界面调整执行破坏性数据库迁移。

## 后果

- 用户在 Workflow 内不能再生成或试玩旧的有限状态机 Prototype；
- Build Brief 成为跨项目边界的正式交付物；
- 旧 Prototype 记录仍存在于数据库，但不进入工作区响应；
- 接入实现 Agent 时需要定义 Build Brief 交接、版本关联和结果回传协议。

## 受影响位置

- `components/workflow/workflow-app.tsx`
- `components/workflow/gdd-review-workspace.tsx`
- `components/workflow/project-manager.tsx`
- `app/api/prototypes/route.ts`（删除）
- `lib/design/readiness.ts`（删除）
- `lib/design/types.ts`
- `lib/server/model-provider.ts`
- `lib/server/workspace.ts`
- `README.md`

## 验证方式

- 页面顶部不再显示 `Run prototype`；
- 右侧仅显示“状态 / GDD / Build”三个页签；
- 全局审查通过后，中央面板没有“生成 GDD”按钮；
- GDD 仍可从右侧 GDD 面板生成、确认并生成 Build Brief；
- `/api/prototypes` 不再出现在生产路由列表；
- 旧数据库表不删除，现有项目和研究记录不受影响。
