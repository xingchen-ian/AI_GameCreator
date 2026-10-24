import type { GddVersion } from "./types";

/**
 * GDDs may choose their own outline. These tags describe information that the
 * complete document must cover; they are not prescribed chapter names.
 */
export const gddCoveragePlan = [
  ["concept", "游戏概念", "起点、主题、抽象边界和一句话概念", ["Q1", "Q5", "Q7", "Q8"]],
  ["player_experience", "目标玩家体验", "目标情绪、节奏和体验承诺", ["Q3", "Q5", "Q6"]],
  ["player_situation", "玩家与情境", "玩家身份、所处情境和可理解的目标", ["Q9", "Q10"]],
  ["core_gameplay", "核心玩法", "反复行动、循环节奏和玩家需要做好的事情", ["Q4", "Q12", "Q13", "Q14", "Q15"]],
  ["rules_and_constraints", "规则与限制", "挑战、资源、状态及其关系", ["Q11", "Q16", "Q18"]],
  ["feedback_and_consequences", "反馈与后果", "行动的即时响应、后续影响和可理解反馈", ["Q17", "Q18", "Q19"]],
  ["progression_and_outcomes", "进程与结果", "局面如何变化以及一局如何结束", ["Q15", "Q20", "Q21"]],
  ["prototype_validation", "原型验证", "需要通过可观察试玩验证的问题，不预判结果", ["Q6", "Q19", "Q20", "Q21"]],
] as const;

export const requiredGddCoverageTags = gddCoveragePlan.map(([tag]) => tag);

export function makeBuildBrief(gdd: GddVersion) {
  const sections = gdd.sections.map((section) => `## ${section.title}\n\n${section.content}\n\n来源：${section.sourceQuestionIds.join("、")}`).join("\n\n");
  return `# 游戏原型 Build Brief\n\n> 来源：已确认 GDD v${gdd.version}\n\n## 给 Codex 的任务\n\n请根据下方 GDD 创建一个可以在现代浏览器中直接运行的单人游戏原型。先实现可验证核心体验的最小闭环，再补视觉表现。不要自行改变目标体验、核心循环或胜负条件；遇到歧义时，把假设集中列出。\n\n## 交付要求\n\n- 输出可独立运行的 Web 项目，并提供启动命令。\n- 优先使用键盘、鼠标或触控可完成的清晰交互。\n- 必须包含开始、游玩、结束、重新开始四个完整状态。\n- 把关键规则、状态、反馈和进程实现为可观察行为。\n- 不使用需要额外付费密钥的运行时服务。\n- 完成后列出：已实现内容、设计假设、与 GDD 的偏差、建议的试玩问题。\n\n## 游戏标题\n\n${gdd.title}\n\n## 一句话概念\n\n${gdd.oneLinePitch}\n\n${sections}\n\n## 验收重点\n\n1. 玩家实际重复的行为是否与“核心循环”一致。\n2. 规则是否能产生“目标玩家体验”。\n3. 行动后果和反馈是否足够清楚。\n4. 进程与结束条件是否构成完整一局。\n5. 若实现与设计存在冲突，不要静默改写；请明确指出并给出最小修改建议。\n`;
}
