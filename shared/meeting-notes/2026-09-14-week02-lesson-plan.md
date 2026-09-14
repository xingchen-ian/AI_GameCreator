# Week 02 教案 · 2026-09-14（周一 8:30–11:00）

**课**：AI-Assisted Game Design Engine · Independent Study  
**学生**：Qiuci Gong (Josie)  
**相位**：Frame · Week 02 — Meaningful play and translation  
**课前作业（上节留）**：设计引导框架（1a/b/c）+ 问题调查（2a/b/c）— 见手机截图笔记

> 本文件给教师用。Studio 页仍以 `course/studio/week-02` 为准；本教案把「作业题」接进 Week 02 官方议程。

---

## 本节目标（结束时 Josie 应能说出）

1. 自己对 **1a / 1b / 1c** 的立场，以及引擎应选哪条（可混合，但要有主选择）。
2. 「meaningful play」对 **玩家** vs **设计师用户（用引擎的人）** 各是什么。
3. 用 MDA 画一张：生活意图 → 机制 → 动态 → 审美，并指出至少一处 **翻译失败**。
4. 带走下周（Week 03）验收标准草稿：pipeline autopsy + blueprint 字段列表。

---

## 对作业题的教师立场（先想清楚，上课再协商）

### 1 · 设计引导框架

| 选项 | 含义 | 对本引擎 |
|------|------|----------|
| **1a** AI 提问、引导全流程 | 模型当教练，流程可漂移 | ❌ 不作主方案：作者权易丢，缺口不可见 |
| **1b** 固定阶段，AI 在阶段内引导 | 阶段 = 设计语言的脚手架 | ✅ **主方案**：对齐 syllabus 的 P-Scaffold + 夏校 pipeline |
| **1c** 整体写完后 AI review | 事后质检 | ⚪ 可作 **L3 验证环** 的一种探头，不能替代引导 |

**推荐课上收敛句**：  
> 引擎默认 **1b（阶段内引导）**；阶段可「任意入口」但不能没有阶段；**1c** 挂在验证环；**1a** 只作对照反例（通用 Chat 为何不够）。

### 2 · 问题调查 → 收成设计原则

| 题 | 收成原则（写进设计文档） |
|----|--------------------------|
| **2a** 适时问题让用户 elaborate | 问题绑定 **蓝图空位**；答一句就写入可见字段，不靠长对话 |
| **2b** 降低认知负担 | 同时只激活 **一个阶段 + 少量空位**；缺什么高亮，不一次甩全表 |
| **2c** 可玩性与想象力 | 想象力来自 **人的生活/领域意图**；可玩性来自 **挑战空间与反馈** 被写进蓝图并可编译验证 — AI 不「凭空变好玩」 |

---

## 时间表（对齐 syllabus studio 节奏）

### Block A · 8:30–9:15 · 作业汇报 + 管道游戏反思

**15 min · 作业 1a/b/c**  
- Josie 先说自己选哪条、为什么。  
- 你用上表收敛到 **1b 为主**；在白板上画：`阶段（可见）| AI 提问（阶段内）| 人确认写入蓝图`。  
- 追问一句：若选 1a，哪一步会让「人写的意图」被模型默默改掉？

**15 min · 作业 2a/b/c**  
- 每人举一个夏校/自己 pipeline 里的例子：哪个问题真的让你 elaborate 了？哪个问题反而加重负担？  
- 收成三条原则（上表），写进今天的 iteration 笔记。

**15 min · Pipeline 游戏反思（syllabus 要求）**  
- 她用了情感路径还是领域路径？  
- 人写了什么 / agent 填了什么 / 扔掉了什么？  
- 对应 Week 01 问题组 A（若她卡壳，用这四问）。

### Block B · 9:15–10:15 · MDA + Meaningful play

**20 min · MDA 精读落地**  
- 她带 reading response（若有）：一个 claim → 一个引擎决策。  
-  jointly 画一局：选她的 pipeline 游戏 **或** 夏校帆船例：  
  - M：输入与规则  
  - D：玩起来发生的行为  
  - A：目标情感/「开始看懂领域」  
- 标出 **至少一处翻译失败**（意图在、机制对不上 / 机制有、体验没到）。

**25 min · 「对设计师用户的 meaningful」**（Week 02 议程第三块前置到这里做深）  
讨论题（studio 页已有，挑 2 个深挖）：  
1. 对用引擎的人，什么叫 meaningful？（建议答案方向：自己的决策与可玩结果之间关系 **可辨认、可整合**）  
2. AI 生成的游戏能否「能跑但无意义」？证据是什么？  
→ 接到作业 2c：可玩 ≠ 有意义；蓝图要能被验证「意图还在不在」。

**15 min · 动手**  
- 在纸上或 md：填一张迷你蓝图空位表（意图 / 机制 / 实体变量 / 挑战 / 反馈 / 开放空位）。  
- 对照 `blueprint-schema-v0.md` 与 `blueprint-samples/sailing-ian-v0.md`（只打开作参照，不要求改代码）。

### Block C · 10:15–11:00 · 锁定下周验收

**20 min · 定 Week 03 验收标准（写进 STATUS）**  
下周 due（syllabus）：  
- **Pipeline autopsy**：questions → system diagram → demo；标出 human / agent / lost  
- **Draft blueprint field list**  
- 阅读：Rules of Play · systems/rules 选段  

共同写出「Done 长这样」3 条，例如：  
1. Autopsy 一页内能指出 ≥1 处 agent 填充与 ≥1 处丢失。  
2. Field list v0 覆盖：intent, mechanic, entity/variable, challenge, feedback, open slots。  
3. 选定情感 **或** 领域路径的一份已填样本（可沿用 sailing）。

**15 min · 回写研究问题（作业→引擎）**  
在白板上留一张「决策卡」给 STATUS / 设计文档：

```text
Guidance mode: 1b (staged) + 1c (verify)
Elaborate: questions bound to empty blueprint slots
Load: one stage active; gaps visible
Playable+imaginative: human intent in; challenge/feedback must compile
```

**10 min · 杂务**  
- 确认 weekday 会议是否就是本周一时段。  
- 提醒：survey report / pipeline game 若 Week 01 Submit 未挂上，本周补到 `student/`。  
- 预告 Week 03 = Frame 门闸：冻结 field list + 三 sprint door。

---

## 你可直接用的提问（中英）

- “If the AI guides the whole flow (1a), where does authorship break?”  
- “Which empty slot should this question fill — and can we see it on screen?”  
- “Did the game run, or did the design hold?”  
- “What would a designer-user need to feel the decision was *theirs*?”

---

## 课后你改文件（5 分钟）

1. `STATUS.md` 周会日志加一条 Week 02 结论（尤其 1b 决策）。  
2. 若 field list 有草稿，丢进 `shared/` 或让 Josie 放 `student/`。  
3. 需要的话让「教学助手」把本教案要点同步进 Week 02 studio 页的 instructor note（非必须）。

---

## 风险与备选

| 风险 | 备选 |
|------|------|
| 她没做完 pipeline 游戏 | 课上用 sailing 公共案例走完反思 + MDA，作业改「本周补做」 |
| 卡住在 1a vs 1b | 用理论框 Layer 2 + P-Scaffold 一段原文，5 分钟读完再选 |
| 时间不够 | 砍 Block B 的 15 min 迷你蓝图，留到 Week 03 技术热身 |

