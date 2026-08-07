# Presentation Voiceover Notes

## 使用说明
- 中文为主讲稿，英文作为对外或双语场景备讲。
- 每页控制在 20–35 秒，开场部分总计约 4–6 分钟。
- 文献引用建议在每页结尾点出“作者 + 年份”，不展开 DOI。

---

## Slide 1 开场问题
**中文口播**
当我们看到 AI 已经能写代码时，一个直觉问题是：为什么它仍然很难稳定地做出“好游戏”？这门课的出发点是，瓶颈不再只是执行，而是目标定义、系统组织、判断与验证。

**English backup**
If AI can already write code, why does it still struggle to create good games? Our course starts from the idea that the bottleneck is no longer execution alone, but goal definition, system organization, judgment, and validation.

---

## Slide 2 失败循环
**中文口播**
这一页展示的是课堂里最常见的失败循环：需求模糊、AI 自动补全、输出看似合理、人却缺乏判断标准，最后靠不断补 prompt 做局部修补，复杂度越来越高。这里可参考 Amershi 等人的人机交互研究与 Parasuraman 的自动化依赖研究。

**English backup**
This is the most common failure loop we observe: vague requests, AI gap-filling, plausible output, weak evaluation, and repeated local patching through prompts. The process eventually inflates complexity. This connects to Amershi et al. and classic automation reliance research.

---

## Slide 3 表象与根因
**中文口播**
很多“提示词问题”其实只是表象。真正的问题往往在认知与结构层：目标没定义清楚、约束没写出来、系统影响没考虑、判断标准不稳定。这里借用了 Simon 的有限理性视角，以及系统思维和反思实践的框架。

**English backup**
Many prompting problems are symptoms, not root causes. The deeper issues are cognitive and structural: unclear goals, missing constraints, weak system awareness, and unstable criteria. This is informed by bounded rationality and systems/reflection frameworks.

---

## Slide 4 人类能力是可训练的
**中文口播**
这页不是在说“人不行”，而是说复杂项目所需能力需要训练。系统思维、精确表达、任务分解、取舍判断、元认知，都不是一次性获得的技能，而是课程要持续设计练习的核心目标。

**English backup**
This slide does not claim humans are incapable. It argues that capabilities required for complex work are trainable: systems thinking, precise articulation, decomposition, trade-off judgment, and metacognition.

---

## Slide 5 AI 的结构边界
**中文口播**
AI 的局限并不在“会不会输出”，而在“输出是否可信且可负责”。Bender 等人的工作提醒我们，流畅语言并不等于理解；幻觉研究也说明自信表达不等于真实性。因此课程里必须把“验证”作为主线。

**English backup**
AI’s limitation is not output generation itself, but reliability and accountability. Bender et al. show that fluent language is not equivalent to understanding, and hallucination research shows confidence is not correctness.

---

## Slide 6 耦合问题
**中文口播**
关键不在“人弱或 AI 弱”，而在耦合方式。Dell’Acqua 等人的“锯齿状前沿”说明，人机协作在某些任务里会显著提升表现，在另一些任务里反而恶化结果。所以学生必须学会识别“该信任 AI 到什么程度”。

**English backup**
The key is not whether humans or AI are weak in isolation, but how they are coupled. The jagged frontier evidence suggests AI can improve some tasks while harming others, so students must learn calibrated trust.

---

## Slide 7 为什么游戏更难
**中文口播**
游戏开发天然是多系统耦合：机制、动态行为、体验感受相互影响。MDA 和 Rules of Play 都说明，代码能跑只是底线，不代表好玩、可理解、可持续。因此它非常适合训练人机协作中的系统判断能力。

**English backup**
Game development is inherently multi-systemic: mechanics, dynamics, and player experience are tightly coupled. Running code is only a baseline; it does not guarantee meaningful play or sustained engagement.

---

## Slide 8 教学重点转移
**中文口播**
如果课程只教“如何更快生成”，学生会更快地产生未经验证的内容。我们要把重点转向“可验证的协作能力”：定义问题、构建模型、比较方案、调试验证。Papert 和 Schön 的教育思想都支持这种转向。

**English backup**
If a course teaches only faster generation, students will produce unverified content faster. We shift the focus to verifiable collaborative capability: framing, modeling, comparison, debugging, and validation.

---

## Slide 9 学生四种角色
**中文口播**
在这门课里，学生不是 prompt 操作员，而是四种角色的组合：导演、架构师、评审者、实验者。这个结构帮助学生在每轮迭代中同时承担目标、结构、质量与证据责任。

**English backup**
Students are not prompt operators. They rotate across four roles: director, architect, critic, and experimenter. This structure distributes responsibility for goals, structure, quality, and evidence.

---

## Slide 10 协作闭环
**中文口播**
最后这页给出课程方法论：从“提示—生成”转向“协作闭环”。即明确意图、建模、拆分、执行、验证、反思，再进入下一轮。这个闭环不是某篇论文原样提出，而是基于学习循环与设计研究的课程综合框架。

**English backup**
We close with a methodological shift: from prompt–generation to a collaborative loop—intent, modeling, decomposition, execution, validation, and reflection. This loop is a course synthesis informed by learning-cycle and design-practice research.

---

## 参考文献（讲者版）
- Amershi, S., et al. (2019). *Guidelines for Human-AI Interaction*. CHI.
- Bender, E. M., Gebru, T., McMillan-Major, A., & Shmitchell, S. (2021). *On the Dangers of Stochastic Parrots*. FAccT.
- Dell'Acqua, F., et al. (2026). *Navigating the Jagged Technological Frontier*. Organization Science.
- Hunicke, R., LeBlanc, M., & Zubek, R. (2004). *MDA: A Formal Approach to Game Design and Game Research*.
- Ji, Z., et al. (2023). *Survey of Hallucination in Natural Language Generation*.
- Kolb, D. A. (1984). *Experiential Learning*.
- Meadows, D. H. (2008). *Thinking in Systems*.
- Papert, S. (1980). *Mindstorms*.
- Parasuraman, R., & Riley, V. (1997). *Humans and Automation: Use, Misuse, Disuse, Abuse*.
- Salen, K., & Zimmerman, E. (2004). *Rules of Play*.
- Schön, D. A. (1983). *The Reflective Practitioner*.
- Simon, H. A. (1955). *A Behavioral Model of Rational Choice*.
