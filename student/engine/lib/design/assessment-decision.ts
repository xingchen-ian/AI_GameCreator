export type AssessmentDecision = {
  ready: boolean;
  summary: string;
  missingElements: string[];
};

const explicitInsufficiency = /(?:证据|信息|内容).{0,8}(?:不足|不够|缺失)|(?:尚未|未能)(?:明确|说明|提供|提到)|没有明确(?!缺口|遗漏|不足)|没有(?:说明|提供|提到)|还(?:需要|缺少)|无法(?:形成|整理|回答)/;

/**
 * Keeps the model's decision unless its own structured explanation clearly
 * contradicts ready=true. This is a logical guard, not another assessment.
 */
export function reconcileAssessmentDecision<T extends AssessmentDecision>(assessment: T): T {
  if (!assessment.ready) return assessment;
  if (assessment.missingElements.length === 0 && !explicitInsufficiency.test(assessment.summary)) return assessment;

  return {
    ...assessment,
    ready: false,
    missingElements: assessment.missingElements.length > 0
      ? assessment.missingElements
      : ["本题最低完成证据尚未明确，请根据当前问题补充最关键的一点。"],
  };
}
