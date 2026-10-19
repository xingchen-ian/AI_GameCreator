import { allQuestions } from "./stages";

export type QuestionScopeContract = {
  focus: string;
  defer: string;
  parkingTargets: string[];
};

export const questionScopeContracts: Record<string, QuestionScopeContract> = {
  Q1: { focus: "选择一段具体的真实经历或日常活动，并说明为什么会想到它。", defer: "不要展开事件全过程、情绪节点、玩家目标、角色设定或游戏机制。", parkingTargets: ["Q2", "Q3", "Q4", "Q5"] },
  Q2: { focus: "只还原这段经历从开始到结束的事件顺序和实际行为。", defer: "不要判断哪些最值得保留，也不要把事件改写成游戏目标或规则。", parkingTargets: ["Q3", "Q4", "Q5", "Q9"] },
  Q3: { focus: "识别真实经历中情绪或体验明显、令人印象深刻的时刻。", defer: "不要决定目标玩家体验、核心挑战或具体游戏机制。", parkingTargets: ["Q5", "Q6", "Q11"] },
  Q4: { focus: "识别真实经历中需要本人主动判断、行动或应对的部分。", defer: "不要提前确定游戏里的核心动作、玩家技能或规则。", parkingTargets: ["Q11", "Q12", "Q14"] },
  Q5: { focus: "从整段经历中选择最想保留的一部分素材或一种感觉。", defer: "不要定义完整玩家体验、抽象形式、角色场景或核心循环。", parkingTargets: ["Q6", "Q7", "Q9", "Q13"] },
  Q6: { focus: "用具体、可感知的词描述玩家游玩时应获得的主要体验。", defer: "不要提前决定核心动作、系统规则、反馈或进程。", parkingTargets: ["Q13", "Q17", "Q19", "Q20"] },
  Q7: { focus: "确定真实经历在游戏中的保留和抽象程度。", defer: "不要展开角色设定、玩家动作或状态资源。", parkingTargets: ["Q9", "Q12", "Q16"] },
  Q8: { focus: "只确认是否有想表达的主题、观点、价值或信息；没有也可以。", defer: "不要为了主题而补写玩法、结局或体验验证。", parkingTargets: ["Q21", "Q22", "Q23"] },
  Q9: { focus: "说明玩家是谁或控制什么，以及此刻处于什么具体情境。", defer: "不要确定主要目标、阻碍或反复动作。", parkingTargets: ["Q10", "Q11", "Q12"] },
  Q10: { focus: "定义玩家可理解、可判断进度的主要目标。", defer: "不要同时设计挑战、资源、进程或结束结果。", parkingTargets: ["Q11", "Q16", "Q20", "Q21"] },
  Q11: { focus: "说明是什么让主要目标不容易完成，以及玩家面对的核心限制。", defer: "不要展开完整核心循环、系统状态或进程曲线。", parkingTargets: ["Q13", "Q16", "Q17", "Q20"] },
  Q12: { focus: "列出玩家为了目标会反复执行的动作，尽量使用动词。", defer: "不要筛选最核心动作，也不要详细定义技能、资源或后果。", parkingTargets: ["Q13", "Q14", "Q16", "Q17"] },
  Q13: { focus: "从已有玩家动作中选出最核心、最常重复的 1–3 个动作。", defer: "不要展开技能要求、变化来源、状态资源或完整规则。", parkingTargets: ["Q14", "Q15", "Q16", "Q17"] },
  Q14: { focus: "说明玩家需要做好什么，以及哪些能力可以通过学习而改善。", defer: "不要设计反馈形式、进程变化或体验验证结论。", parkingTargets: ["Q15", "Q19", "Q20", "Q22"] },
  Q15: { focus: "定义核心动作重复时，哪些因素会变化以避免机械重复。", defer: "不要详细制定资源数值、前后依赖或完整进程。", parkingTargets: ["Q16", "Q18", "Q20"] },
  Q16: { focus: "列出系统必须追踪且会影响选择或结果的状态、资源、对象或信息。", defer: "不要展开动作后果、反馈表现、进程或结局。", parkingTargets: ["Q17", "Q18", "Q19", "Q20", "Q21"] },
  Q17: { focus: "为每个核心动作说明行动、即时响应与后续后果。", defer: "不要展开长期依赖、反馈媒介或最终体验判断。", parkingTargets: ["Q18", "Q19", "Q22"] },
  Q18: { focus: "说明早先行动如何改变后续局面、选项、风险或结果。", defer: "不要展开整体进程、结束条件或玩家体验结论。", parkingTargets: ["Q20", "Q21", "Q22"] },
  Q19: { focus: "说明玩家如何获知状态、选择影响和当前表现。", defer: "不要提前判断实际体验或设计对齐结果。", parkingTargets: ["Q22", "Q23"] },
  Q20: { focus: "说明一局游戏继续进行时，速度、复杂度、能力、风险等如何变化。", defer: "不要同时定义具体结束结果或替玩家预测体验。", parkingTargets: ["Q21", "Q22"] },
  Q21: { focus: "定义游戏何时结束，以及可能出现的结果、分数或结局。", defer: "不要提前回答实际玩家体验或对齐修改。", parkingTargets: ["Q22", "Q23"] },
  Q22: { focus: "只依据现有规则，预测陌生玩家实际会反复做什么、可能感受什么。", defer: "不要用创作者愿望代替预测，也不要在这里完成最终对齐修改。", parkingTargets: ["Q23"] },
  Q23: { focus: "比较实际预测体验与目标体验，并指出需要修改的最小设计位置。", defer: "不要直接开始实现原型、选择技术栈或添加未经讨论的新机制。", parkingTargets: [] },
};

export function getQuestionScope(questionId: string) {
  return questionScopeContracts[questionId] ?? {
    focus: "只回答当前问题。",
    defer: "其他设计决定稍后处理。",
    parkingTargets: [],
  };
}

export function describeParkingTargets(questionId: string) {
  return getQuestionScope(questionId).parkingTargets.map((id) => {
    const question = allQuestions.find((item) => item.id === id);
    return `${id} · ${question?.short ?? "后续问题"}`;
  });
}
