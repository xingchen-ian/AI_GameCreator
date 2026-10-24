import { allQuestions, stages } from "@/lib/protocol/stages";
import { getQuestionScope } from "@/lib/protocol/question-scope";
import { describeQuestionReadiness } from "@/lib/protocol/question-readiness";

export type ProtocolQuestion = (typeof allQuestions)[number];

export function buildQuestionDirectoryText() {
  return stages
    .flatMap((stage) => stage.questions.map((question) => `${question.id} · ${question.short}：${question.prompt}`))
    .join("\n");
}

export function buildQuestionContractText(question: ProtocolQuestion) {
  const stage = stages.find((item) => item.id === question.stageId)!;
  const scope = getQuestionScope(question.id);
  const readinessContract = describeQuestionReadiness(question.id);
  return [
    `阶段：${stage.name}`,
    `阶段目标：${stage.goal}`,
    `当前问题：${question.id} ${question.prompt}`,
    `问题引导：${question.guide}`,
    `本题范围：${scope.focus}`,
    `本题不要决定：${scope.defer}`,
    readinessContract,
  ].join("\n");
}
