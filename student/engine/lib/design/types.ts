export type AnswerStatus = "draft" | "confirmed";

export type StoredAnswer = {
  answer: string;
  status: AnswerStatus;
  revision: number;
  structuredData: Record<string, unknown>;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  createdAt: string;
};

export type StageSummary = {
  stageId: number;
  version: number;
  status: "current" | "stale";
  summary: string;
  keyDecisions: string[];
  openQuestions: string[];
  createdAt: string;
};

export type GddSection = {
  key: string;
  title: string;
  content: string;
  sourceQuestionIds: string[];
  /** Added for dynamic-outline GDDs. Absent on legacy saved versions. */
  coverageTags?: GddCoverageTag[];
};

export type GddCoverageTag =
  | "concept"
  | "player_experience"
  | "player_situation"
  | "core_gameplay"
  | "rules_and_constraints"
  | "feedback_and_consequences"
  | "progression_and_outcomes"
  | "prototype_validation";

export type GddOutlineSection = {
  key: string;
  title: string;
  purpose: string;
  coverageTags: GddCoverageTag[];
  sourceQuestionIds: string[];
};

export type GddIssue = {
  id: string;
  severity: "blocker" | "warning" | "suggestion";
  title: string;
  evidence: string;
  whyItMatters: string;
  questionIds: string[];
  options: string[];
  status: "open" | "resolved" | "intentional";
  resolutionNote: string | null;
};

export type DesignReviewIssue = {
  id: string;
  severity: "blocker" | "conflict";
  title: string;
  evidence: string;
  whyItMatters: string;
  questionIds: string[];
  options: string[];
  status: "open" | "pending_verification" | "resolved" | "accepted" | "superseded";
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DesignReviewRun = {
  id: string;
  version: number;
  snapshotKey: string;
  status: "reviewing" | "action_required" | "dirty" | "verifying" | "ready" | "superseded";
  issues: DesignReviewIssue[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type DesignReviewChange = {
  id: string;
  messageId: string;
  reviewRunId: string;
  issueId: string;
  targetQuestionId: string;
  summary: string;
  rationale: string;
  beforeContent: string;
  beforeRevision: number;
  proposedContent: string;
  status: "proposed" | "applied" | "dismissed" | "stale";
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GddReviewChange = {
  id: string;
  messageId: string;
  gddVersionId: string;
  targetType: "question_answer" | "gdd_section";
  targetId: string;
  issueIds: string[];
  summary: string;
  rationale: string;
  beforeContent: string;
  proposedContent: string;
  status: "proposed" | "applied" | "dismissed" | "stale";
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GddVersion = {
  id: string;
  version: number;
  status: "draft" | "confirmed" | "stale";
  title: string;
  oneLinePitch: string;
  sections: GddSection[];
  fidelityStatus: "ready" | "dirty";
  issues: GddIssue[];
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BuildBrief = {
  id: string;
  version: number;
  status: "ready" | "stale";
  gddVersion: number;
  markdown: string;
  createdAt: string;
};

export type ProjectSummary = {
  id: string;
  title: string;
  status: "active" | "archived";
  confirmedAnswerCount: number;
  gddVersion: number;
  buildBriefVersion: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type WorkspacePayload = {
  project: {
    id: string;
    title: string;
    activeQuestionId: string;
    gddVersion: number;
    buildBriefVersion: number;
    updatedAt: string;
  };
  projects: ProjectSummary[];
  answers: Record<string, StoredAnswer>;
  chats: Record<string, ChatMessage[]>;
  chatQuestionIds: string[];
  stageSummaries: Record<number, StageSummary>;
  latestDesignReview: DesignReviewRun | null;
  designReviewChanges: DesignReviewChange[];
  latestGdd: GddVersion | null;
  gddReviewChanges: GddReviewChange[];
  latestBuildBrief: BuildBrief | null;
};
