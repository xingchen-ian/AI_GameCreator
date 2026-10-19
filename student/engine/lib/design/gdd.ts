import type { GddVersion } from "./types";

export const gddSectionPlan = [
  ["overview", "游戏概述", "一句话概念、类型与设计边界", ["Q1", "Q5", "Q7"]],
  ["experience", "目标玩家体验", "目标情绪、节奏和体验承诺", ["Q3", "Q6", "Q22", "Q23"]],
  ["player_situation", "玩家与情境", "玩家身份、所处情境和可理解的目标", ["Q9", "Q10"]],
  ["challenge", "核心挑战", "压力、阻碍、不确定性和限制", ["Q11"]],
  ["core_loop", "核心循环", "玩家反复执行的动作与循环节奏", ["Q12", "Q13", "Q15"]],
  ["skill", "玩家技能与决策", "玩家如何变得更擅长", ["Q4", "Q14"]],
  ["system", "规则、状态与资源", "系统追踪的状态及其关系", ["Q16", "Q18"]],
  ["consequences", "行动、响应与后果", "核心动作造成的即时响应和后续后果", ["Q17", "Q18"]],
  ["feedback", "反馈设计", "系统如何解释状态、选择影响和表现", ["Q19"]],
  ["progression", "进程与变化", "复杂度、风险、能力和组合如何发展", ["Q15", "Q20"]],
  ["outcomes", "结束条件与结果", "成功、失败、分数或结局", ["Q21"]],
  ["theme", "主题与抽象", "题材转译、抽象程度和可选表达", ["Q7", "Q8"]],
  ["validation", "体验验证", "实际玩法体验、对齐判断和验证方法", ["Q22", "Q23"]],
] as const;

export function makeBuildBrief(gdd: GddVersion) {
  const sections = gdd.sections.map((section) => `## ${section.title}\n\n${section.content}\n\n来源：${section.sourceQuestionIds.join("、")}`).join("\n\n");
  return `# 游戏原型 Build Brief\n\n> 来源：已确认 GDD v${gdd.version}\n\n## 给 Codex 的任务\n\n请根据下方 GDD 创建一个可以在现代浏览器中直接运行的单人游戏原型。先实现可验证核心体验的最小闭环，再补视觉表现。不要自行改变目标体验、核心循环或胜负条件；遇到歧义时，把假设集中列出。\n\n## 交付要求\n\n- 输出可独立运行的 Web 项目，并提供启动命令。\n- 优先使用键盘、鼠标或触控可完成的清晰交互。\n- 必须包含开始、游玩、结束、重新开始四个完整状态。\n- 把关键规则、状态、反馈和进程实现为可观察行为。\n- 不使用需要额外付费密钥的运行时服务。\n- 完成后列出：已实现内容、设计假设、与 GDD 的偏差、建议的试玩问题。\n\n## 游戏标题\n\n${gdd.title}\n\n## 一句话概念\n\n${gdd.oneLinePitch}\n\n${sections}\n\n## 验收重点\n\n1. 玩家实际重复的行为是否与“核心循环”一致。\n2. 规则是否能产生“目标玩家体验”。\n3. 行动后果和反馈是否足够清楚。\n4. 进程与结束条件是否构成完整一局。\n5. 若实现与设计存在冲突，不要静默改写；请明确指出并给出最小修改建议。\n`;
}
