# AI Assist Game Design Engine · Theoretical Framework

> **版本**：v0.2（蓝图字段已操作化）  
> **日期**：2026-08-23  
> **定位**：引擎设计与 CHI PLAY 2027 WiP 的理论底座  
> **关联**：调研页 `research-survey.html`（问题/缺口/论点，instructor 本地，不在本仓库）；教学实践「来自生活的游戏设计」（引导问题 → 系统描述 → 最小 demo）；操作化词汇 [`blueprint-schema-v0.md`](blueprint-schema-v0.md)；样本 [`blueprint-samples/sailing-ian-v0.md`](blueprint-samples/sailing-ian-v0.md)  
> **状态**：先定框架，不上网站；确认后再同步到 Pages

---

## 0. 一句话定位

面向游戏设计**初学者乃至零经验者**，本引擎将**学习与设计合二为一**：以**可协商的结构化设计语言**为引导媒介（任意入口、缺失可见），以**可直接驱动最小可玩 demo 的蓝图**为人机单一事实源，并内建**验证/评估**以闭合设计环。人保有设计决策；AI 承担实现与部分测试。由此降低「先精通实现再设计」的传统门槛，使结构化思考成为可教、可练的基本设计语言。

---

## 1. 为什么需要这套框架（问题与出口）

### 1.1 研究问题（工作表述）

> 当 AI Agent 参与游戏创作时，**什么样的交互结构与领域知识表征**，能让零经验/初学者在保留设计主导权的前提下，完成「引导 → 结构 → 可玩验证」的完整设计环，并在过程中学会结构化设计？

### 1.2 与调研假说的关系

| 调研假说 | 在本框架中的位置 |
|---|---|
| H1 一句话/凭感觉生成有本质缺陷 | **动机与反面**：说明为何需要结构层，不作主论点 |
| H2 应从游戏结构与系统入手 | **正题的一半**：结构 = 引导媒介与基本语言 |
| H3 通用 AI IDE 非最佳形态 | **正题的一半**：缺创作者–工具关系、设计语言、闭环评估 |

### 1.3 CHI PLAY WiP 取向（理论选型过滤器）

| 优先级 | 理论重心 | 在论文里的角色 |
|---|---|---|
| **主** | 创作者–工具关系（MI-CC / CST / agency） | 交互与主体性叙事 |
| **主** | 游戏设计结构作为引导媒介（MDA / Patterns + Scaffold） | 机制与学习叙事 |
| **必要闭环** | 验证/评估作为设计能力（非纯 AI benchmark） | 方法与证据：设计是否成立、缺什么可见 |
| **背景** | LLM 一句话失败的实证 | Introduction 动机，不占理论主体 |

**刻意不主打**：纯 coding agent 跑分、世界模型/视频生成、通用软件工程 IDE 对比（可作边界讨论）。

---

## 2. 理论 Scope：四层 + 一条脚手架原则

```text
Layer 1  Game Design Structure     →  说什么语言、缺什么可见
Layer 2  Human–AI Co-Creation      →  谁出手、谁拍板
Layer 3  Design Verification Loop  →  如何知道设计成立
Layer 4  Learning-through-Design   →  为何学设一体成立
        + P-Scaffold（贯穿 1–4）   →  结构如何进入交互
```

---

### Layer 1 · Game Design Structure（结构即基本语言）

**主张**：游戏设计需要一层可共享、可检查、可教学的结构表征；该表征不是散文 prompt，而是连接意图与实现的设计语言。

| 前任框架 | 我们取用什么 | 我们不照搬什么 |
|---|---|---|
| **MDA**（Hunicke, LeBlanc & Zubek, 2004） | 体验只能经机制间接达成；可从 Aesthetics 反推，也可从 Mechanics 前推 | 不把 MDA 当成必须线性走完的 wizard |
| **Game Design Patterns**（Björk & Holopainen） | 可检索、可组合的机制/交互词汇 | 不要求学生背完整图案目录 |
| **RMDA / DDE 等修正** | 结构需可设计、可非线性进入；警惕僵硬方法论 | 不陷入本体论细争 |
| **「来自生活」六步中的系统图 / 数据化 / 挑战空间** | 已验证的教学操作化：问题 → 结构图 → 可实现变量 | 引擎层抽象为通用蓝图，路径内容可插拔 |

**引擎约束（L1）**

1. 必须有一份**结构化蓝图**（见 §3），字段覆盖：体验/情感或领域目标、动态假设、机制、实体与变量、挑战组合、反馈。  
2. 蓝图同时服务三种读者：**人**（可读可改）、**Agent**（可生成）、**评估器**（可校验空位与冲突）。  
3. 「结构化设计是基本语言」操作化为：学会读写蓝图 = 学会做可验证的游戏设计决策。

---

### Layer 2 · Human–AI Co-Creation（创作者–工具关系）

**主张**：有价值的共创是双方都主动出手，但**议题与最终决策归人**；AI 建议与实现，不替代作者性。

| 理论簇 | 关键概念 | 给我们什么 |
|---|---|---|
| **Mixed-initiative / MI-CC**（Yannakakis, Liapis et al.；Tanagra / Sentient Sketchbook / Ropossum） | 人机都主动；建议≠替代；评估可见 | 交互范式：建议面板、实时评估、人点选才进主稿 |
| **Creativity Support Tools**（Shneiderman 等） | 增强探索与控制，而非夺走控制 | 成功标准含「是否成为更好的设计者」 |
| **Agency / Authorship / Craft accountability**（CHI 游戏 GenAI 定性综述线） | 创意核心的接受度与伦理 | 设计决策归属必须可追踪 |
| **Boundary objects / Articulation work**（Star & Griesemer；Schmidt & Bannon；见 CoDesign 框架用法） | 共享表征衔接不懂实现的人与不懂生活的机器 | 蓝图/系统描述 = 人机边界对象 |
| **Symmetry of ignorance**（Rittel；Fischer） | 各方知识不对称 | 证明为何需要显式接口，而非纯自然语言闲聊 |

**工作契约（Working Contract）**

| 环节 | 人（初学者/设计者） | AI Agent |
|---|---|---|
| 体验/领域来源与目标 | **决定** | 追问、复述、标歧义 |
| 结构取舍（机制/变量/挑战） | **决定**（可采纳建议） | 提供选项、标缺失、解释代价 |
| 实现最小 demo | 验收、改意图 | **执行**（代码/场景） |
| 验证与评估 | 解读结果、决定改哪里 | **探测**可玩性/结构完备性并报告 |
| 反思与学习 | **拥有**学习收获 | 提示「你刚补上了哪个结构空位」 |

**引擎约束（L2）**

1. 任何写入蓝图的变更可标注提出者（人 / AI）与是否被采纳。  
2. AI 默认产出**建议与草案**，进入权威蓝图需人确认（或明确的「授权自动应用」模式，且可撤回）。  
3. 禁止把「能编译」等同于「设计完成」——完成条件含人确认的体验/结构目标。

---

### Layer 3 · Design Verification Loop（评估即设计闭环）

**主张**：没有验证的引导是半截流程。评估不是外挂 benchmark，而是创作工具内的**设计反馈**：结构是否完备、机制是否可玩、意图是否在 demo 中可感。

| 来源 | 取用 |
|---|---|
| Mixed-initiative 传统（Sketchbook 实时可玩性/平衡可视化；Ropossum 可解性） | 评估可见、嵌在编辑过程中 |
| 2026 游戏生成评估层（Mage 多轴、PlaytestArena / Play2Code 等） | 「质量住在玩法里」；playtest-in-the-loop 增益 |
| 「来自生活」中的玩测与情感/领域对齐检查 | 评估问的是设计问题，不是 API 对错 |

**闭环形态**

```text
引导 / 任意入口切入
    → 蓝图更新（缺失可见）
        → 生成或更新最小可玩 demo
            → 自动/半自动评估（结构完备 · 可运行 · 意图对齐探针）
                → 报告回到人（缺什么、哪里偏了）
                    → 人改蓝图或采纳建议 → …
```

**引擎约束（L3）**

1. 评估面板对用户可见（至少：结构空位、运行健康、意图/机制对齐的简易探针）。  
2. Playtest 或等价验证是一等功能，不是发布后补丁。  
3. CHI PLAY 叙述中，评估贡献写成 **support for design judgment**，避免写成纯 agent leaderboard。

---

### Layer 4 · Learning-through-Design（学设一体）

**主张**：对零经验使用者，设计过程即学习过程；工具成功 = 产出可玩原型 **且** 使用者获得可迁移的结构语言。

| 理论簇 | 给我们什么 |
|---|---|
| **Epistemic agency**（教育共创文献，如学生协同设计游戏研究） | 学习者对知识建构有主权 |
| **Learning-by-doing / LPP**（Lave & Wenger 等） | 在真实设计任务中学习 |
| **Creativity support + 教学脚手架** | 引导强度可随能力淡出（fading） |
| 你的双夏校实践 | 0 编程基础仍可产出可玩作品 = 可教性证据方向 |

**引擎约束（L4）**

1. 交互文案与空位提示使用设计语言（机制/动态/体验/变量/挑战），而非仅「再写一句 prompt」。  
2. 记录「结构空位被补上」的学习瞬间，供反思与研究日志。  
3. 允许熟练用户折叠引导（fading），但不删除蓝图与评估。

---

### P-Scaffold · 贯穿原则（可协商脚手架）

**正式表述**

> **结构是一张可从任意节点进入的提示地图，而不是强制流程。**  
> 其首要功能是让**结构性缺失变得可见**，从而提示与激发灵感；对新手补全不完整框架，对熟手尊重其从喜爱或自认关键的切入点开始。

| 推论 | 交互含义 |
|---|---|
| 任意入口 | 可先填体验、先填机制、先填某一 pattern/挑战，不强制 Step 1→n |
| 缺失可见 | 未填字段、未连接的反馈、无挑战组合等显式标出 |
| 提示非命令 | Agent 语态：「这里还空着 X，要看看选项吗？」 |
| 可绕过 / 可淡出 | 高级模式可少问；空位仍在蓝图中可查 |
| 反模具 | 回应设计师对僵硬方法论的抗拒（RMDA 等记录），同时服务新手需求 |

**与 Sentient Sketchbook 的同构**：建议在侧栏、人点选才进主稿；评估条让属性可见——我们把对象从「地图草图」升到「游戏系统蓝图」。

---

## 3. 蓝图 Schema 作为可出 Demo 的 SSOT

### 3.1 定义（工程口径）

- **蓝图（Blueprint）**：结构化的游戏设计描述（意图、机制、变量、挑战、反馈等）。  
- **Schema**：字段与类型约定，使人、Agent、评估器读写同一套结构。  
- **SSOT（Single Source of Truth）**：对话、代码生成、评估报告均以当前蓝图为准；不以聊天记录为权威。  
- **可出 Demo 条件**：蓝图完备到 Agent/引擎能生成**最小可玩原型（Minimum Playable Demo）**，无需再靠散文补全关键规则。

### 3.2 与「来自生活」实践的同构

| 教学实践产物 | 引擎层概念 |
|---|---|
| 引导问题清单答案 | 引导对话 / 任意入口表单 |
| 系统设计图 + 开发摘要 / skill | **蓝图实例** |
| AI Agent 实现的最小原型 | **Demo 编译目标** |
| 学生确认/拒绝 AI 方案 | Working contract |
| Agent 日志 | 过程证据（研究用） |

### 3.3 最小字段组（v0.1，可迭代）

> 下列为理论层要求的**信息种类**；具体 JSON/UI 在实现阶段再定。

1. **Intent**：目标体验 / 情感或领域学习目标（一句话 + 可选矛盾/触发）  
2. **Dynamics hypothesis**：预期运行时行为（玩家会如何缠斗规则）  
3. **Mechanics**：规则与动作列表  
4. **Entities & Variables**：对象与核心状态（类型、初值、成败阈值）  
5. **Challenge space**：2–3 个递进挑战（变量组合）  
6. **Feedback**：玩家如何感知结果（视觉/音效/数值）  
7. **Open slots**：显式「尚未决定」列表（支撑 P-Scaffold）  
8. **Provenance**：关键决策的人/AI 归属（支撑 agency）

**完备性启发式（能否出 demo）**：至少 Intent + Mechanics + Variables + **一条 Rule** + 一个可运行 Challenge 有值，且评估器不报阻塞性空位。Rule 是相对本条 v0.1 的收紧：没有世界如何回应，Agent 会替人发明物理。操作化（7 种节点、4 种边、起步图、连接矩阵）见 [`blueprint-schema-v0.md`](blueprint-schema-v0.md)。

---

## 4. 主张清单（Claims）· 供 CHI PLAY WiP 选用

| ID | 主张 | 理论依赖 | 证据方向（已有 / 待做） |
|---|---|---|---|
| **C1** | 零经验/初学者可在引导式结构工具中完成可玩原型，而无需先掌握通用编程 IDE | L2, L4, P-Scaffold | 夏令营/暑期课；对照实验待做 |
| **C2** | 学习与设计可合为同一流程：补结构空位即学习设计语言 | L1, L4, P-Scaffold | 日志中的空位填补；前后测待做 |
| **C3** | 可出 demo 的蓝图 SSOT 比纯自然语言聊天更能保持意图一致与可迭代 | L1, L3 | 教学中系统图↔repo；对照待做 |
| **C4** | 内建验证使设计环闭合，并改善「缺什么/偏了什么」的可感知性 | L3 | playtest 面板原型；用户研究待做 |
| **C5** | 人机工作契约（人决策、AI 实现/探测）提升可接受的 agency 体验 | L2 | 决策归属编码；访谈量表待做 |
| **C6**（边界） | 一句话直接生成易导致结构空洞；结构层是必要中介 | 调研 H1 | 文献证据已强；可作背景 |

WiP 建议主打 **C1–C5**，C6 放相关工作/动机。

---

## 5. 理论 → 引擎模块映射

| 理论要素 | 引擎模块（目标架构） |
|---|---|
| L1 结构语言 + P-Scaffold | 蓝图编辑器；空位高亮；任意入口引导 |
| L2 MI-CC / agency | 建议轨；确认写入；决策 provenance |
| L3 验证闭环 | Demo 构建器；评估面板；playtest agent |
| L4 学设一体 | 学习提示；引导强度档位（fading） |
| SSOT | 蓝图存储为权威；聊天仅为采集前端 |
| 「来自生活」路径 | 可插拔的 Intent 采集包（情感路径 / 领域路径） |

```text
[引导 UI：任意入口]
        ↓ 写入
[Blueprint SSOT] ←→ [Suggestion Agent]
        ↓ 编译
[Min Playable Demo] → [Eval / Playtest] → 报告回到引导 UI
        ↑______________人决策_______________↓
```

---

## 6. 与相邻工作的边界

| 相邻工作 | 我们不是 | 我们是 |
|---|---|---|
| Rosebud 等一句话平台 | 黑箱 vibe → 浏览器游戏 | 结构先于代码；学习显式 |
| Cursor + MCP 通用 IDE | 通用编程助手 | 游戏设计语言 + 创作者契约 |
| Sentient Sketchbook 等 | 停在关卡几何 | 升到系统/机制蓝图 + demo |
| 纯「来自生活」方法论论文 | 只讲内容转译路径 | 路径可插拔；焦点在工具与闭环 |
| Mage / GameCraft-Bench | 只做生成质量榜 | 把评估嵌进创作 |

---

## 7. 开放问题（框架 v0.1 故意留下的）

1. **蓝图字段的最小充分集**：多少字段才能稳定出 demo，又不会劝退新手？工作答案见 schema v0：Intent + Mechanic + Variable + Rule + 一个 Challenge；起步图 8 节点以免全量图劝退（[`sailing-ian-v0`](blueprint-samples/sailing-ian-v0.md)）。  
2. **评估探针的设计向指标**：情感等价 / 领域判断如何轻量进入 WiP（量表？结构化自检？）？  
3. **Scaffold fading 的触发**：按进度、按空位密度，还是按用户自评？  
4. **与 MDA 词汇的绑定强度**：强制 MDA 标签 vs 仅作可选透镜？  
5. **CHI PLAY vs CoDesign 分轨**：过程/决策归属厚做期刊；工具+闭环短做 WiP——如何切同一数据？

---

## 8. 关键文献锚点（按层，非完整综述）

**L1**：Hunicke et al. (2004) MDA；Björk & Holopainen Game Design Patterns；RMDA (2021)；本仓库关联方法论 v2（系统图/挑战空间）。  

**L2**：Yannakakis, Liapis & Alexopoulos (2014) MI-CC；Liapis et al. Sentient Sketchbook；Liapis, Smith & Shaker PCG Ch.11；CST 文献；CHI GenAI in games 定性综述；Star & Griesemer boundary objects；本项目 CoDesign 框架用法。  

**L3**：Mage / PlaytestArena·Play2Code 等 2026 评估工作（作方法灵感）；mixed-initiative 实时评估传统。  

**L4**：Epistemic agency / 学生共创游戏文献；Lave & Wenger；双夏校实践数据。  

**动机背景**：调研综述中的 compile-correctness divergence、结构空洞等。

---

## 9. 版本记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-08-19 | 首版：四层 + P-Scaffold；SSOT=可出 demo；CHI PLAY 主张 C1–C6；映射引擎与「来自生活」实践 |
| v0.2 | 2026-08-23 | 冻结结构图画布词汇：7 节点 / 4 边；编译启发式加 Rule；帆船样本证明最小集充分且不劝退 |

---

## 10. 下一步（确认后）

1. 你批注：哪些主张要升格/降级/改措辞。  
2. ~~冻结最小蓝图字段表 v0~~ → 已写入 [`blueprint-schema-v0.md`](blueprint-schema-v0.md)；样本 [`blueprint-samples/sailing-ian-v0.md`](blueprint-samples/sailing-ian-v0.md)。  
3. 再决定是否写入本地 `research-survey.html` 新章节（该页不进本仓库）。  
4. 对照 CHI PLAY WiP 大纲：Related Work 按 L1–L4 写，System 按 §5 映射写。  
5. Sprint 1 实现对照：起步图 8 节点 / 4 边；画布只做 schema 的视图。
