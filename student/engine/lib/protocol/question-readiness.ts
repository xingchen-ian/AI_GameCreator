import { allQuestions } from "./stages";

export type QuestionReadinessContract = {
  minimumEvidence: string[];
  acceptableShortcuts: string[];
  doNotRequire: string[];
};

export const questionReadinessContracts: Record<string, QuestionReadinessContract> = {
  Q1: {
    minimumEvidence: ["一段具体经历或经常进行的活动", "用户为什么选择它"],
    acceptableShortcuts: [],
    doNotRequire: ["完整事件流程", "游戏机制"],
  },
  Q2: {
    minimumEvidence: ["经历如何开始", "中间发生的主要事件和行为", "经历如何结束"],
    acceptableShortcuts: ["允许按几个主要步骤概括，不要求穷举所有细节"],
    doNotRequire: ["哪些内容应转化成游戏", "玩法规则"],
  },
  Q3: {
    minimumEvidence: ["至少一个印象明显的时刻", "该时刻对应的情绪或体验"],
    acceptableShortcuts: ["一个足够具体的突出时刻即可"],
    doNotRequire: ["完整目标玩家体验", "机制解释"],
  },
  Q4: {
    minimumEvidence: ["至少一个需要主动介入的环节", "用户当时需要判断、行动或应对什么"],
    acceptableShortcuts: [],
    doNotRequire: ["正式玩家动作", "游戏规则"],
  },
  Q5: {
    minimumEvidence: ["明确选择最想保留的素材或感觉"],
    acceptableShortcuts: ["选择一个核心部分即可，不要求解释所有被舍弃内容"],
    doNotRequire: ["完整玩家体验", "角色和场景"],
  },
  Q6: {
    minimumEvidence: ["一到三个具体且可感知的目标体验"],
    acceptableShortcuts: ["简短体验词可以成立，只要含义足够明确"],
    doNotRequire: ["实现体验的具体规则", "试玩验证结果"],
  },
  Q7: {
    minimumEvidence: ["真实还原、保留核心后改编或高度抽象中的明确倾向", "需要保留或允许改变的核心边界"],
    acceptableShortcuts: [],
    doNotRequire: ["完整角色设定", "具体操作"],
  },
  Q8: {
    minimumEvidence: ["明确主题、观点或价值，或者明确表示没有主题要求"],
    acceptableShortcuts: ["明确回答没有主题即可视为完整"],
    doNotRequire: ["强行创造主题", "用主题补写玩法"],
  },
  Q9: {
    minimumEvidence: ["玩家是谁或控制什么", "玩家所处的具体情境"],
    acceptableShortcuts: [],
    doNotRequire: ["主要目标", "核心挑战"],
  },
  Q10: {
    minimumEvidence: ["玩家主要想完成的事情", "玩家如何判断自己在接近或已经达到目标"],
    acceptableShortcuts: ["进度判断可以是定性状态，不强制使用数值"],
    doNotRequire: ["障碍设计", "结束结局"],
  },
  Q11: {
    minimumEvidence: ["至少一个让目标不容易完成的核心限制或阻碍", "该限制如何迫使玩家判断或选择"],
    acceptableShortcuts: [],
    doNotRequire: ["完整规则数值", "进程曲线"],
  },
  Q12: {
    minimumEvidence: ["玩家为实现目标会反复进行的具体动作"],
    acceptableShortcuts: ["用一组清晰动词列出动作即可"],
    doNotRequire: ["筛选最核心动作", "详细行动后果"],
  },
  Q13: {
    minimumEvidence: ["从已有动作中明确选出一到三个最核心、最常重复的动作"],
    acceptableShortcuts: [],
    doNotRequire: ["技能要求", "资源和数值"],
  },
  Q14: {
    minimumEvidence: ["玩家需要做好的判断或操作", "其中至少一种可以通过学习或练习改善的能力"],
    acceptableShortcuts: [],
    doNotRequire: ["反馈媒介", "实际试玩结论"],
  },
  Q15: {
    minimumEvidence: ["至少一种会在重复行动之间发生变化的因素", "这种变化如何避免过程机械重复"],
    acceptableShortcuts: [],
    doNotRequire: ["完整进程设计", "精确数值"],
  },
  Q16: {
    minimumEvidence: ["系统必须追踪的关键状态、资源、对象或信息", "这些内容为什么会影响选择或结果"],
    acceptableShortcuts: ["只列真正影响玩法的少量状态即可"],
    doNotRequire: ["全部界面数据", "动作后果和反馈表现"],
  },
  Q17: {
    minimumEvidence: ["每个核心动作的即时系统响应", "动作产生的后续后果"],
    acceptableShortcuts: ["相同行为模式的核心动作可以合并说明"],
    doNotRequire: ["完整长期进程", "具体反馈媒介"],
  },
  Q18: {
    minimumEvidence: ["至少一种早先行动留下的状态变化", "该变化如何影响后续选项、风险或结果"],
    acceptableShortcuts: [],
    doNotRequire: ["完整关卡进程", "结束条件"],
  },
  Q19: {
    minimumEvidence: ["玩家如何知道当前状态", "玩家如何知道选择的影响", "玩家如何判断当前表现"],
    acceptableShortcuts: ["一种反馈可以同时承担多个信息目的"],
    doNotRequire: ["证明反馈在试玩中一定有效"],
  },
  Q20: {
    minimumEvidence: ["一局进行过程中至少一种会持续变化的因素", "变化的大致方向或阶段"],
    acceptableShortcuts: ["进程不必等同于难度持续上升"],
    doNotRequire: ["具体结束结果", "完整数值曲线"],
  },
  Q21: {
    minimumEvidence: ["明确的一局结束条件", "至少一种可能结果、分数、结局或完成状态"],
    acceptableShortcuts: ["只有一种结果也可以，只要结束条件明确"],
    doNotRequire: ["预判实际玩家体验"],
  },
};

export function getQuestionReadinessContract(questionId: string) {
  return questionReadinessContracts[questionId] ?? {
    minimumEvidence: ["直接回答当前问题"],
    acceptableShortcuts: [],
    doNotRequire: [],
  };
}

export function describeQuestionReadiness(questionId: string) {
  const contract = getQuestionReadinessContract(questionId);
  return [
    `最低完成证据：${contract.minimumEvidence.join("；")}`,
    `可接受的简化：${contract.acceptableShortcuts.length ? contract.acceptableShortcuts.join("；") : "无额外简化"}`,
    `不应强求：${contract.doNotRequire.length ? contract.doNotRequire.join("；") : "无"}`,
  ].join("\n");
}

export function validateQuestionReadinessContracts() {
  return allQuestions.every((question) => {
    const contract = questionReadinessContracts[question.id];
    return Boolean(contract?.minimumEvidence.length);
  });
}
