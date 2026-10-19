# Game Design Workflow — V1 产品与技术架构

> 状态：Draft for review  
> 日期：2026-10-12  
> 范围：仅描述独立项目 `game-workflow`，不包含 `game-agent` 方案。  
> 本文目标：先确认产品边界、信息流和版本关系，再继续实现。

## 1. 一句话定义

Game Design Workflow 是一个面向游戏设计新手的结构化设计工作台。它通过六阶段、23 个问题和逐题 AI 协作，把个人经历转化为可追踪、可复核、可版本化的游戏设计，并进一步生成 GDD 和可试玩游戏。

它不是固定对话脚本，也不是通用编程 Agent。Workflow 负责维护设计状态、控制设计过程和保存研究证据；模型与代码 Agent 是 Workflow 调用的能力。

## 2. 核心研究命题

V1 需要支持验证以下命题：

1. 六阶段 protocol 能否帮助新手从生活经历得到可玩的游戏概念？
2. 逐题 AI 协作是否能提高答案的具体性、一致性和可执行性？
3. 由 23 个答案生成的 GDD，是否足以让代码 Agent 实现一个可玩的浏览器游戏？
4. 玩家实际行为和体验是否与 Stage 2 的目标体验一致？
5. 当结果不一致时，用户能否定位应修改的问题，并生成更符合目标的新版本？

因此，产品的核心不是“一键生成游戏”，而是保存下面这条可研究的因果链：

```text
设计问题与答案
  → Design State
  → GDD
  → Build Brief
  → Game Build
  → Playtest Evidence
  → 设计修订
```

## 3. 当前状态、V1 新增与暂缓范围

| 能力 | 状态 | 说明 |
|---|---|---|
| 六阶段、23 问 Workflow | 已实现 | 问题可跳转，不要求固定线性对话 |
| 逐题 AI 对话 | 已实现代码，尚未完成真实密钥验证 | 服务端 Provider 已切换到阿里云百炼 |
| 正式答案确认 | 已实现 | AI 建议不会自动成为正式设计决定 |
| Design State 持久化 | 已实现 | D1 保存项目、答案、消息和状态 |
| 答案修改与全局一致性检查 | 已实现 | 修改只写入当前答案；用户主动重新生成 GDD 时由 AI 全局审查 |
| 固定规格的机制原型播放器 | 已实现 | 仅支持少量有限状态玩法，用于快速机制草图 |
| 阶段总结 | V1 新增 | 每个 Stage 形成可编辑、可确认的阶段产出 |
| 版本化 GDD | V1 新增 | 从已确认 Design State 生成，必须人工确认 |
| Codex Build Brief | V1 新增 | 把 GDD 转换成代码 Agent 可执行的工程任务 |
| 手动 Codex 构建与结果导回 | V1 新增，待确认 | 先验证输入质量和失败模式 |
| 自动 Codex SDK / app-server | V2 暂缓 | 在 3–5 个真实案例验证后再接入 |
| 多人协作、公开社区、模板市场 | 暂缓 | 不属于研究型 V1 核心范围 |
| 商业级美术、关卡编辑器、多人游戏 | 暂缓 | 不作为 V1 验收条件 |

## 4. 关键术语

### 4.1 Design Protocol

六阶段及其问题、阶段目标、阶段产出和返回规则。Protocol 定义设计推理的结构，不规定 Agent 必须逐字照读的对话脚本。

### 4.2 Design State

某个项目在一个时刻的结构化设计事实，包括每题答案、确认状态、修订号、依赖关系和来源。只有用户确认的内容才能成为下游正式输入。

### 4.3 Stage Summary

一个阶段的正式产出，例如经历地图、目标玩家体验、核心循环或系统反馈。它由该阶段问题答案生成，但可以由用户手动修订和重新确认。

### 4.4 GDD Version

由一个冻结的 Design State Snapshot 生成的完整游戏设计文档。每个 GDD 都必须能够追溯到具体答案版本。

### 4.5 Build Brief

交给代码 Agent 的工程化任务说明。它不是整个聊天记录，而是由 GDD、技术约束、验收标准和安全限制组成的稳定输入。

### 4.6 Game Build

一次代码生成任务产生的可运行文件和元数据。Game Build 必须绑定一个 GDD 版本，不能只绑定“当前项目”。

### 4.7 Playtest Evidence

试玩结果，包括行为记录、完成状态、玩家自述体验和 Q22/Q23 的对齐判断。

## 5. V1 端到端用户流程

### Phase A — 创建 Design State

1. 用户新建或打开游戏设计项目。
2. 用户进入任意 Stage 和 Question。
3. AI 读取当前问题、相关前置答案和本题对话，进行最多一个明确追问。
4. AI 提供一个可编辑的正式答案草稿。
5. 用户修改并确认答案。
6. 答案修改后直接成为最新 Design State；系统不机械标记其他问题，语义冲突在用户主动执行全局审查时检查。
7. 每个 Stage 完成后，系统生成阶段总结，用户确认后进入全局 Design State。

### Phase B — 生成和确认 GDD

1. 系统检查必填答案；用户主动生成后，AI 对完整 GDD 和全部最新答案执行一致性审查。
2. 用户冻结当前 Design State，创建一个 Snapshot。
3. AI 根据 Snapshot 生成 GDD Draft。
4. GDD 的每个章节标记来源问题，例如 `Q6, Q10, Q13`。
5. 系统对完整 GDD 执行全局一致性审查，而不只检查单个章节。
6. 每个冲突必须显示证据来源、影响、建议返回的问题和可选修改方向。
7. 用户可以修改原问题、修改 GDD Draft、说明这是有意设计，或暂缓处理。
8. 阻断级冲突解决后，用户才能确认 GDD。
9. 确认后生成不可变的 `GDD vN`。

### Phase C — 构建游戏

V1 推荐先使用人工触发的 Codex Harness：

1. Workflow 根据 `GDD vN` 生成 `Build Brief vN`。
2. 用户将 Build Brief 和 GDD 交给 Codex。
3. Codex 在隔离环境中创建 HTML/CSS/JavaScript 游戏并运行检查。
4. 用户将通过检查的构建文件导回 Workflow。
5. Workflow 保存为 `Game Build vN`，并记录对应的 GDD 和构建说明。

V2 才把步骤 2–4 自动化为 Codex SDK / app-server 调用。

### Phase D — 试玩和回环

1. 右侧 Preview 在受限 iframe 中加载 Game Build。
2. 系统记录最少量、与研究有关的行为事件。
3. 用户回答 Q22：玩家实际上不断做什么、感受到什么？
4. 用户回答 Q23：实际体验是否与 Stage 2 一致？
5. 用户返回相关问题修改答案。
6. 系统创建新的 Design State Snapshot、GDD 和 Game Build，而不覆盖历史版本。

## 6. 产品信息架构

V1 推荐包含五个主要视图：

1. **Workflow**：六阶段、23 问和完成度。
2. **Question Workspace**：本题对话、答案草稿、正式确认和来源上下文。
3. **Design State**：阶段总结、冲突和缺失项。
4. **GDD**：章节导航、来源追踪、全局一致性反馈、编辑、确认和导出。
5. **Build & Playtest**：Build Brief、构建版本、试玩和体验对齐记录。

当前三栏页面可以保留，但右侧需要从单一 Prototype 面板演进为三个 Tab：

```text
Design State | GDD | Build & Playtest
```

## 7. 系统边界与职责

```text
┌─────────────────────────────────────────────────────────┐
│ Game Design Workflow                                   │
│                                                        │
│  UI ── Workflow Engine ── Design State ── GDD Manager  │
│                     │                    │              │
│                     └── Version Lineage ─┴── Build Hub  │
└─────────────────────────────┬───────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Qwen / 百炼                 Codex Harness
      设计讨论、总结、GDD            写代码、运行、测试
                 │                         │
                 └────────────┬────────────┘
                              │
                    Sandboxed Game Preview
```

### Workflow 应用负责

- 用户身份与项目权限。
- Protocol、问题状态和依赖关系。
- 正式答案确认。
- Design State、GDD 和版本谱系。
- Build Brief 和验收条件。
- 游戏构建归档与试玩入口。
- Playtest 数据和体验对齐。

### 百炼模型负责

- 当前问题的引导和追问。
- 答案草稿与阶段总结。
- GDD Draft 和一致性检查。
- 不负责直接执行生成代码。

### Codex Harness 负责

- 理解 Build Brief。
- 创建和修改游戏文件。
- 使用终端、构建工具和测试工具。
- 处理实现失败并重试。
- 返回经过验证的构建产物和构建报告。

### Sandbox 负责

- 隔离不可信的生成代码。
- 限制文件、网络、进程、时间和资源使用。
- 保存构建日志和检查结果。

## 8. 数据模型

### 8.1 当前实体

```text
Project
 ├── QuestionAnswer[]
 ├── Message[]
 └── PrototypeVersion[]
```

### 8.2 V1 建议实体

```text
Project
 ├── QuestionAnswer[]
 ├── Message[]
 ├── StageSummary[]
 ├── DesignSnapshot[]
 │     └── GddVersion[]
 │            ├── GddIssue[]
 │            └── BuildBrief[]
 │                   └── GameBuild[]
 │                          └── PlaytestSession[]
 └── ModelUsageEvent[]
```

### 8.3 建议字段

#### StageSummary

- `id`
- `projectId`
- `stageId`
- `contentJson`
- `status`: `draft | confirmed`
- `sourceAnswerRevisionsJson`
- `revision`
- `createdAt`, `updatedAt`

#### DesignSnapshot

- `id`
- `projectId`
- `snapshotNumber`
- `answersJson`
- `stageSummariesJson`
- `protocolVersion`
- `createdAt`

#### GddVersion

- `id`
- `projectId`
- `designSnapshotId`
- `version`
- `status`: `draft | confirmed | superseded`
- `contentJson`
- `markdown`
- `sourceMapJson`
- `reviewStatus`: `not_reviewed | reviewing | has_blockers | ready`
- `createdAt`, `confirmedAt`

#### GddIssue

- `id`
- `gddVersionId`
- `type`: `contradiction | experience_mismatch | loop_gap | system_gap | progression_gap | scope_risk | missing_evidence`
- `severity`: `blocker | warning | suggestion`
- `title`
- `feedback`
- `whyItMatters`
- `evidenceJson`: 涉及的 GDD 章节、问题 ID 和答案 revision
- `affectedSectionsJson`
- `suggestedQuestionIdsJson`: 建议返回修改的问题
- `modificationOptionsJson`: 两到三个可选修改方向及各自影响
- `status`: `open | resolved | accepted_as_intentional | deferred`
- `resolutionNote`
- `createdAt`, `resolvedAt`

#### BuildBrief

- `id`
- `gddVersionId`
- `version`
- `instructionsMarkdown`
- `technicalConstraintsJson`
- `acceptanceCriteriaJson`
- `createdAt`

#### GameBuild

- `id`
- `buildBriefId`
- `version`
- `status`: `imported | validating | ready | failed | archived`
- `artifactLocation`
- `manifestJson`
- `buildReportMarkdown`
- `createdAt`

#### PlaytestSession

- `id`
- `gameBuildId`
- `userId`
- `eventSummaryJson`
- `reportedExperience`
- `alignmentAssessment`
- `createdAt`, `completedAt`

#### ModelUsageEvent

- `id`
- `projectId`
- `operation`: `coach | synthesize | stage_summary | gdd | build`
- `provider`
- `model`
- `inputTokens`
- `outputTokens`
- `estimatedCost`
- `createdAt`

## 9. GDD 信息结构

GDD 不是自由生成的长文章，而是固定 Schema 与可读文档的双重表示。

### 9.1 章节

1. 一句话概述。
2. 设计来源与核心素材。
3. 目标玩家体验。
4. 主题与抽象程度。
5. 玩家身份、情境与目标。
6. 核心挑战和限制。
7. 玩家动作与 Core Loop。
8. 技能、判断和变化来源。
9. 状态、资源、对象和关系。
10. Action → Response → Consequence。
11. Feedback 设计。
12. Progression。
13. Outcome 与结束条件。
14. 实际体验预测。
15. 体验对齐风险与验证计划。

### 9.2 每节都需要

- 正文。
- 来源问题 ID 与答案 revision。
- 是否存在未解决冲突。
- 用户备注。
- 确认状态。

### 9.3 生成原则

- 不补写用户没有确认的核心机制。
- 缺失信息必须显示为缺口，而不是由模型默默发明。
- 对互相矛盾的答案进行标记。
- GDD Draft 可以重新生成；Confirmed GDD 不可被覆盖。
- 上游答案变化后，旧 GDD 仍保留，但新版本需显示差异。

### 9.4 全局一致性审查

GDD Draft 生成后必须执行一次独立的全局审查。审查不能只判断文字是否通顺，而要检查整个设计系统是否能够形成一致的玩家行为和体验。

#### 冲突识别方式

系统不预设冲突分类，也不要求 AI 把发现的问题塞进固定类型。AI 作为全局审查员直接比较全部已确认答案和 GDD，只有在能够指出至少两个具体原始设计决定、并解释它们为什么不能同时成立时，才记录为一个冲突。普通缺失、措辞建议或无法追溯到原题的判断不进入冲突集合。

#### 每条冲突必须给出的 Feedback

- **冲突是什么**：使用新手能够理解的语言描述。
- **证据在哪里**：列出构成冲突的全部问题 ID（2–8 个）、答案 revision 和关键内容摘要，不允许用分类默认题号代替真实证据。
- **为什么重要**：说明它可能造成的玩家行为或体验后果。
- **影响哪些部分**：列出受影响的规则、循环、反馈、进程或结果。
- **建议返回哪里修改**：从已经列出的冲突题目中选择一个最合适的目标，而不是另行猜测无关题目或要求重做全部 GDD。
- **修改选项**：给出两到三个方向，并说明每个方向会保留什么、牺牲什么。
- **系统建议**：明确推荐方向，但不自动替用户做设计决定。

示例：

```text
Blocker：目标体验与核心循环不一致

证据：
- Q6 希望玩家感到“从容、逐渐掌握节奏”
- Q13 的核心动作是持续快速点击
- Q20 让速度不断提高，但没有恢复或学习窗口

影响：
玩家更可能感到忙乱和疲劳，而不是逐渐掌握节奏。

建议返回：Q13、Q15、Q20

修改方向：
1. 保留“从容”体验：把快速点击改成观察后选择时机。
2. 保留快速操作：把目标体验改为紧张和突破极限。
3. 保留两者：增加快慢交替阶段，让玩家先观察再集中行动。
```

#### 处理规则

- `blocker`：未解决时不能确认 GDD，也不能创建正式 Build Brief。
- `warning`：允许用户在写明理由后继续，但需要保留在版本记录中。
- `suggestion`：不阻止确认，作为改进提示。
- 用户返回问题修改答案后，相关 Stage Summary、GDD Draft 和 Issue 必须重新计算。
- 用户可以标记 `accepted_as_intentional`，说明冲突是有意设计；系统保存理由，不重复强迫修复。
- AI 不得直接覆盖原答案或 GDD 内容，只能提出选项并等待用户确认。

## 10. Build Brief 结构

Build Brief 应比 GDD 更工程化，至少包括：

- 引用的 GDD 版本。
- 游戏目标和目标体验。
- 必须实现的 Core Loop。
- 输入方式和屏幕尺寸。
- 游戏开始、进行、成功、失败、重开的状态。
- 关键状态与数值范围。
- 必须出现的反馈。
- 明确禁止实现的内容。
- 技术栈和依赖限制。
- 网络访问限制。
- 文件输出要求。
- 自动检查命令。
- 人工验收清单。

建议 V1 的游戏技术约束为：

```text
- 单人浏览器游戏
- HTML/CSS/JavaScript 或单一前端构建产物
- 键盘、鼠标或触屏输入
- 不需要登录、支付、外部 API 或远程数据库
- 所有运行时资源包含在构建包中
- 必须支持开始、胜利/失败、重新开始
- 必须输出 README 与构建报告
```

## 11. 游戏构建与预览安全边界

生成代码始终视为不可信内容。

### 11.1 构建期

- 每次构建使用独立工作目录或隔离环境。
- 限制网络、文件系统、执行时间和资源。
- 应用 API Key 不进入生成代码环境。
- 保存构建命令、退出码和测试报告。
- 构建产物通过文件类型、大小和路径检查后才能导入。

### 11.2 运行期

- 游戏在单独 iframe 中运行。
- 使用最小 `sandbox` 权限，默认只允许脚本执行。
- 不允许同源权限、顶层导航、弹窗、下载、表单和任意网络请求。
- 使用严格 CSP，默认 `connect-src 'none'`。
- Preview 提供强制停止和重新加载能力。
- 游戏无法访问 Workflow 的 Cookie、数据库或密钥。

### 11.3 V1 导入限制

V1 推荐只接受：

- 单个 HTML 文件；或
- 有固定 manifest 的 ZIP 构建包。

不接受后端服务、原生可执行文件或需要长期运行进程的项目。

## 12. AI 路由与成本原则

模型配置暂不在检查点 1 中落地，先确定原则：

| 操作 | 首选能力 | 成本策略 |
|---|---|---|
| 当前问题讨论 | 百炼 Flash | 小上下文、短输出、非思考模式 |
| 正式答案整理 | 百炼 Flash | 结构化输出 |
| 阶段总结 | 百炼 Flash | 每阶段按需生成，不随每条消息重算 |
| GDD Draft | 百炼高质量模型 | 每个 Snapshot 最多主动生成一次 |
| 游戏实现 | Codex Harness | 只有用户确认 GDD 后显式触发 |

必须增加：

- 按 operation 记录 token 使用。
- 单次输入和输出上限。
- 免费额度到期保护。
- 预算阈值和失败关闭。
- 不把完整历史对话重复发送给每个问题。

## 13. 版本谱系

V1 不允许“当前状态覆盖历史结果”。推荐关系如下：

```text
Design Snapshot 1
  └── GDD 1
       ├── Build Brief 1
       │    └── Game Build 1
       │         └── Playtest 1
       └── Build Brief 2
            └── Game Build 2

Design Snapshot 2
  └── GDD 2
       └── Build Brief 3
            └── Game Build 3
```

这样可以回答：

- 哪次设计修订导致了哪次构建？
- 同一个 GDD 的不同实现有何差异？
- 体验变化来自设计变化还是实现变化？

## 14. API 边界草案

以下只是 V1 接口边界，不是检查点 1 的实现任务：

```text
GET/PATCH  /api/workspace
POST       /api/ai/chat
POST       /api/ai/synthesize

POST       /api/stages/:stageId/summarize
POST       /api/design-snapshots
POST       /api/gdds
PATCH      /api/gdds/:id
POST       /api/gdds/:id/review
POST       /api/gdds/:id/confirm
PATCH      /api/gdd-issues/:id
POST       /api/gdds/:id/build-briefs
POST       /api/game-builds/import
GET        /api/game-builds/:id/preview
POST       /api/playtests
```

所有写操作必须：

- 验证 ChatGPT 用户身份。
- 验证项目所有权。
- 验证目标版本仍然存在。
- 不接受客户端提供的任意存储路径。
- 返回稳定的结构化错误。

## 15. 研究数据与隐私

### V1 建议记录

- 问题进入、退出和确认时间。
- AI 建议是否被采用及编辑幅度。
- 答案 revision 与依赖失效。
- GDD 的版本和来源映射。
- 全局冲突的类型、证据、建议、用户处理方式和最终结果。
- Build 的成功、失败和重试次数。
- 试玩完成状态和最小行为摘要。
- Q22/Q23 的主观体验判断。

### V1 不建议记录

- 与研究目标无关的细粒度鼠标轨迹。
- API Key、授权 Header 或完整服务日志。
- 未告知用户的第三方分析标识。
- 不必要的个人敏感信息。

如果未来用于正式用户研究，需要单独增加同意说明、数据保留周期和删除机制。

## 16. V1 验收标准

### Workflow

- 用户能完成或跳过适用问题。
- AI 不会未经确认改写正式答案。
- 修改答案只更新当前节点，不机械改变其他答案状态。
- 主动重新生成 GDD 时，AI 会基于全部最新答案重新检查全局冲突。
- 每个 Stage 有正式阶段总结。

### GDD

- 能从一个冻结 Snapshot 生成。
- 每个章节可追溯到问题答案。
- 能发现跨章节的直接矛盾、体验不匹配和系统缺口。
- 每个冲突都包含证据、影响、建议返回的问题和至少两个修改方向。
- 阻断级冲突在解决或标记为有意设计前，不能确认 GDD。
- 系统只提供 Feedback 和修改建议，不会未经确认自动改写设计。
- 用户可编辑、确认和导出。
- 新版本不会覆盖旧版本。

### Build

- Build Brief 明确引用 GDD 版本。
- 至少三个不同设计能由 Codex 生成可运行浏览器游戏。
- 构建结果可导回并绑定版本。
- 失败构建有明确报告，不伪装为成功。

### Playtest Loop

- 用户能在应用内启动和停止游戏。
- 用户能记录实际行为与体验。
- 用户能从体验偏差返回对应问题修改设计。
- 修改后可以形成新的 Snapshot → GDD → Build 链。

## 17. 实施顺序

1. **Checkpoint 1：架构确认** — 本文。
2. **Checkpoint 2：现有 Workflow 审计** — 逐项验证当前实现与 protocol 是否一致。
3. **Checkpoint 3：Stage Summary 与 Design Snapshot**。
4. **Checkpoint 4：版本化 GDD**。
5. **Checkpoint 5：Build Brief 和手动 Codex 验证**。
6. **Checkpoint 6：游戏构建导入与 iframe Preview**。
7. **Checkpoint 7：Playtest Evidence 与 Q22/Q23 回环**。
8. **Checkpoint 8：根据真实案例决定是否接 Codex SDK / app-server**。

每个检查点完成后单独评审，不默认进入下一步。

## 18. 需要用户确认的产品决策

本文提出以下默认建议，尚未视为最终决定：

1. **研究核心**：六阶段 Workflow 与体验对齐，而不是通用 AI 游戏生成器。建议：确认。
2. **V1 构建方式**：先手动把 Build Brief 交给 Codex，验证 3–5 个案例后再自动接入。建议：确认。
3. **GDD 审批**：只有用户确认后的 GDD 才能进入构建。建议：确认。
4. **构建导回**：V1 允许导入单 HTML 或受约束 ZIP，并保存版本关系。建议：确认。
5. **现有机制原型**：保留并改名为 “Quick Mechanic Sketch”，与 Codex 生成的 “Game Build” 区分。建议：保留。
6. **访问范围**：研究阶段保持私有、单用户项目；多人分享暂缓。建议：确认。
7. **模型选择**：等架构确认后再单独决定，不在本检查点连接密钥。建议：确认。
8. **Codex 自动化**：列为 V2 决策，不作为 V1 完成条件。建议：确认。
9. **GDD 全局一致性审查**：必须提供可追溯的冲突 Feedback、返回问题和修改选项；阻断级冲突会阻止确认，但用户可说明其为有意设计。要求：已确认。

## 19. Checkpoint 1 完成定义

Checkpoint 1 在以下条件满足后完成：

- 用户理解当前实现、V1 新增和 V2 暂缓的区别。
- 第 18 节的九项决策得到确认或修改。
- 对核心研究命题和 V1 验收标准没有未解决的方向性分歧。
- 形成一份用户确认的架构版本，再进入 Checkpoint 2。
