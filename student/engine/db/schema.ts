import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const researchParticipants = sqliteTable(
  "research_participants",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("research_participants_owner_unique").on(table.ownerId)],
);

export const studyParticipants = sqliteTable(
  "study_participants",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    ownerId: text("owner_id").notNull(),
    status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
    sessionVersion: integer("session_version").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at"),
  },
  (table) => [
    uniqueIndex("study_participants_code_unique").on(table.code),
    uniqueIndex("study_participants_token_unique").on(table.accessTokenHash),
    uniqueIndex("study_participants_owner_unique").on(table.ownerId),
    index("study_participants_status_idx").on(table.status),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    title: text("title").notNull().default("未命名游戏"),
    status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
    archivedAt: text("archived_at"),
    activeQuestionId: text("active_question_id").notNull().default("Q1"),
    prototypeVersion: integer("prototype_version").notNull().default(0),
    gddVersion: integer("gdd_version").notNull().default(0),
    buildBriefVersion: integer("build_brief_version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("projects_owner_idx").on(table.ownerId),
    index("projects_owner_status_idx").on(table.ownerId, table.status),
  ],
);

export const designSnapshots = sqliteTable(
  "design_snapshots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    answerRevisionsJson: text("answer_revisions_json").notNull(),
    answersJson: text("answers_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("design_snapshots_project_idx").on(table.projectId)],
);

export const designReviewRuns = sqliteTable(
  "design_review_runs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshotKey: text("snapshot_key").notNull(),
    answersJson: text("answers_json").notNull(),
    status: text("status", { enum: ["reviewing", "action_required", "dirty", "verifying", "ready", "superseded"] }).notNull().default("reviewing"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("design_review_runs_project_version_unique").on(table.projectId, table.version),
    index("design_review_runs_project_idx").on(table.projectId),
  ],
);

export const designReviewIssues = sqliteTable(
  "design_review_issues",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    firstSeenRunId: text("first_seen_run_id").notNull().references(() => designReviewRuns.id, { onDelete: "cascade" }),
    lastSeenRunId: text("last_seen_run_id").notNull().references(() => designReviewRuns.id, { onDelete: "cascade" }),
    severity: text("severity", { enum: ["blocker", "conflict"] }).notNull(),
    title: text("title").notNull(),
    evidence: text("evidence").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    questionIdsJson: text("question_ids_json").notNull().default("[]"),
    optionsJson: text("options_json").notNull().default("[]"),
    status: text("status", { enum: ["open", "pending_verification", "resolved", "accepted", "superseded"] }).notNull().default("open"),
    resolutionNote: text("resolution_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("design_review_issues_project_idx").on(table.projectId),
    index("design_review_issues_last_run_idx").on(table.lastSeenRunId),
  ],
);

export const designReviewVerdicts = sqliteTable(
  "design_review_verdicts",
  {
    id: text("id").primaryKey(),
    reviewRunId: text("review_run_id").notNull().references(() => designReviewRuns.id, { onDelete: "cascade" }),
    issueId: text("issue_id").notNull().references(() => designReviewIssues.id, { onDelete: "cascade" }),
    verdict: text("verdict", { enum: ["resolved", "still_open", "changed"] }).notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("design_review_verdicts_run_idx").on(table.reviewRunId)],
);

export const stageSummaries = sqliteTable(
  "stage_summaries",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    snapshotId: text("snapshot_id").notNull().references(() => designSnapshots.id, { onDelete: "cascade" }),
    stageId: integer("stage_id").notNull(),
    version: integer("version").notNull(),
    status: text("status", { enum: ["current", "stale"] }).notNull().default("current"),
    summary: text("summary").notNull(),
    keyDecisionsJson: text("key_decisions_json").notNull().default("[]"),
    openQuestionsJson: text("open_questions_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("stage_summaries_project_stage_version_unique").on(table.projectId, table.stageId, table.version),
    index("stage_summaries_project_idx").on(table.projectId),
  ],
);

export const gddVersions = sqliteTable(
  "gdd_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    snapshotId: text("snapshot_id").notNull().references(() => designSnapshots.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status", { enum: ["draft", "confirmed", "stale"] }).notNull().default("draft"),
    title: text("title").notNull(),
    oneLinePitch: text("one_line_pitch").notNull(),
    sectionsJson: text("sections_json").notNull(),
    fidelityStatus: text("fidelity_status", { enum: ["ready", "dirty"] }).notNull().default("ready"),
    confirmedAt: text("confirmed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("gdd_versions_project_version_unique").on(table.projectId, table.version),
    index("gdd_versions_project_idx").on(table.projectId),
  ],
);

export const gddIssues = sqliteTable(
  "gdd_issues",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    gddVersionId: text("gdd_version_id").notNull().references(() => gddVersions.id, { onDelete: "cascade" }),
    severity: text("severity", { enum: ["blocker", "warning", "suggestion"] }).notNull(),
    title: text("title").notNull(),
    evidence: text("evidence").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    questionIdsJson: text("question_ids_json").notNull().default("[]"),
    optionsJson: text("options_json").notNull().default("[]"),
    status: text("status", { enum: ["open", "resolved", "intentional"] }).notNull().default("open"),
    resolutionNote: text("resolution_note"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("gdd_issues_version_idx").on(table.gddVersionId)],
);

export const buildBriefs = sqliteTable(
  "build_briefs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    gddVersionId: text("gdd_version_id").notNull().references(() => gddVersions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status", { enum: ["ready", "stale"] }).notNull().default("ready"),
    markdown: text("markdown").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("build_briefs_project_version_unique").on(table.projectId, table.version),
    index("build_briefs_project_idx").on(table.projectId),
  ],
);

export const questionAnswers = sqliteTable(
  "question_answers",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    status: text("status", { enum: ["draft", "confirmed"] }).notNull().default("confirmed"),
    answer: text("answer").notNull(),
    structuredJson: text("structured_json").notNull().default("{}"),
    revision: integer("revision").notNull().default(1),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("question_answers_project_question_unique").on(table.projectId, table.questionId),
    index("question_answers_project_idx").on(table.projectId),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("messages_project_question_idx").on(table.projectId, table.questionId, table.createdAt)],
);

export const conversationSummaries = sqliteTable(
  "conversation_summaries",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    throughMessageId: text("through_message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
    throughCreatedAt: text("through_created_at").notNull(),
    messageCount: integer("message_count").notNull(),
    summary: text("summary").notNull(),
    structuredJson: text("structured_json").notNull().default("{}"),
    model: text("model"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("conversation_summaries_project_question_message_unique").on(table.projectId, table.questionId, table.throughMessageId),
    index("conversation_summaries_project_question_idx").on(table.projectId, table.questionId, table.throughCreatedAt),
  ],
);

export const questionMemories = sqliteTable(
  "question_memories",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    answerRevision: integer("answer_revision").notNull(),
    baseMemoryId: text("base_memory_id"),
    throughMessageId: text("through_message_id").references(() => messages.id, { onDelete: "set null" }),
    throughCreatedAt: text("through_created_at"),
    summary: text("summary").notNull(),
    confirmedDecisionsJson: text("confirmed_decisions_json").notNull().default("[]"),
    editedAdoptionsJson: text("edited_adoptions_json").notNull().default("[]"),
    explicitRejectionsJson: text("explicit_rejections_json").notNull().default("[]"),
    constraintsJson: text("constraints_json").notNull().default("[]"),
    openQuestionsJson: text("open_questions_json").notNull().default("[]"),
    unresolvedSuggestionsJson: text("unresolved_suggestions_json").notNull().default("[]"),
    relatedQuestionIdsJson: text("related_question_ids_json").notNull().default("[]"),
    model: text("model"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("question_memories_project_question_revision_unique").on(table.projectId, table.questionId, table.answerRevision),
    index("question_memories_project_question_idx").on(table.projectId, table.questionId, table.answerRevision),
  ],
);

export const answerSubmissionReviews = sqliteTable(
  "answer_submission_reviews",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    answerFingerprint: text("answer_fingerprint").notNull(),
    designSnapshotKey: text("design_snapshot_key").notNull(),
    requirementStatus: text("requirement_status", { enum: ["passed", "needs_revision"] }).notNull(),
    conflictStatus: text("conflict_status", { enum: ["clear", "conflict"] }).notNull(),
    feedback: text("feedback").notNull().default(""),
    conflictsJson: text("conflicts_json").notNull().default("[]"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    confirmedAt: text("confirmed_at"),
  },
  (table) => [
    index("answer_submission_reviews_project_question_idx").on(table.projectId, table.questionId, table.createdAt),
    index("answer_submission_reviews_fingerprint_idx").on(table.projectId, table.questionId, table.answerFingerprint),
  ],
);

export const aiSuggestions = sqliteTable(
  "ai_suggestions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    source: text("source", { enum: ["initial", "chat", "synthesize", "design_review"] }).notNull(),
    messageId: text("message_id").references(() => messages.id, { onDelete: "set null" }),
    suggestedAnswer: text("suggested_answer").notNull(),
    structuredJson: text("structured_json").notNull().default("{}"),
    model: text("model"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("ai_suggestions_project_question_idx").on(table.projectId, table.questionId, table.createdAt)],
);

export const answerRevisions = sqliteTable(
  "answer_revisions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    revision: integer("revision").notNull(),
    answer: text("answer").notNull(),
    source: text("source", { enum: ["user", "design_review", "backfill"] }).notNull(),
    suggestionId: text("suggestion_id").references(() => aiSuggestions.id, { onDelete: "set null" }),
    adoption: text("adoption", { enum: ["verbatim", "edited", "manual"] }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("answer_revisions_project_question_revision_unique").on(table.projectId, table.questionId, table.revision),
    index("answer_revisions_project_idx").on(table.projectId),
  ],
);

export const modelCalls = sqliteTable(
  "model_calls",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
    operation: text("operation").notNull(),
    role: text("role").notNull(),
    model: text("model").notNull(),
    appVersion: text("app_version").notNull().default("unknown"),
    promptVersion: text("prompt_version").notNull().default("legacy"),
    schemaVersion: text("schema_version").notNull().default("legacy"),
    temperature: real("temperature").notNull().default(0),
    thinkingEnabled: integer("thinking_enabled", { mode: "boolean" }).notNull().default(false),
    outcome: text("outcome", { enum: ["success", "repaired", "failed"] }).notNull(),
    strictFallback: integer("strict_fallback", { mode: "boolean" }).notNull().default(false),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    contextStrategy: text("context_strategy").notNull().default("unknown"),
    includedAnswerCount: integer("included_answer_count").notNull().default(0),
    includedMessageCount: integer("included_message_count").notNull().default(0),
    estimatedContextTokens: integer("estimated_context_tokens").notNull().default(0),
    contextTruncated: integer("context_truncated", { mode: "boolean" }).notNull().default(false),
    attemptsJson: text("attempts_json").notNull().default("[]"),
    durationMs: integer("duration_ms").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("model_calls_project_idx").on(table.projectId, table.createdAt)],
);

export const backgroundJobs = sqliteTable(
  "background_jobs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["question_memory", "conversation_summary"] }).notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    status: text("status", { enum: ["pending", "running", "completed"] }).notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: text("available_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("background_jobs_dedupe_unique").on(table.projectId, table.type, table.dedupeKey),
    index("background_jobs_status_available_idx").on(table.status, table.availableAt),
    index("background_jobs_project_idx").on(table.projectId, table.createdAt),
  ],
);

export const studyEvents = sqliteTable(
  "study_events",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    actor: text("actor", { enum: ["participant", "admin"] }).notNull(),
    eventType: text("event_type").notNull(),
    questionId: text("question_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
    receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("study_events_project_time_idx").on(table.projectId, table.occurredAt),
    index("study_events_session_time_idx").on(table.sessionId, table.occurredAt),
    index("study_events_type_idx").on(table.eventType),
  ],
);

export const gddReviewChanges = sqliteTable(
  "gdd_review_changes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
    gddVersionId: text("gdd_version_id").notNull().references(() => gddVersions.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["question_answer", "gdd_section"] }).notNull(),
    targetId: text("target_id").notNull(),
    issueIdsJson: text("issue_ids_json").notNull().default("[]"),
    summary: text("summary").notNull(),
    rationale: text("rationale").notNull(),
    beforeContent: text("before_content").notNull(),
    proposedContent: text("proposed_content").notNull(),
    status: text("status", { enum: ["proposed", "applied", "dismissed", "stale"] }).notNull().default("proposed"),
    appliedAt: text("applied_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("gdd_review_changes_project_idx").on(table.projectId),
    index("gdd_review_changes_message_idx").on(table.messageId),
  ],
);

export const designReviewChanges = sqliteTable(
  "design_review_changes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
    reviewRunId: text("review_run_id").notNull().references(() => designReviewRuns.id, { onDelete: "cascade" }),
    issueId: text("issue_id").notNull().references(() => designReviewIssues.id, { onDelete: "cascade" }),
    targetQuestionId: text("target_question_id").notNull(),
    summary: text("summary").notNull(),
    rationale: text("rationale").notNull(),
    beforeContent: text("before_content").notNull(),
    beforeRevision: integer("before_revision").notNull(),
    proposedContent: text("proposed_content").notNull(),
    status: text("status", { enum: ["proposed", "applied", "dismissed", "stale"] }).notNull().default("proposed"),
    appliedAt: text("applied_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("design_review_changes_project_idx").on(table.projectId),
    index("design_review_changes_message_idx").on(table.messageId),
    index("design_review_changes_run_idx").on(table.reviewRunId),
  ],
);

export const prototypeVersions = sqliteTable(
  "prototype_versions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status", { enum: ["ready", "failed"] }).notNull().default("ready"),
    gameSpecJson: text("game_spec_json").notNull(),
    designSnapshotJson: text("design_snapshot_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("prototype_versions_project_version_unique").on(table.projectId, table.version),
    index("prototype_versions_project_idx").on(table.projectId),
  ],
);
