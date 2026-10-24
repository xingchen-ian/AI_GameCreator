"use client";

import { useCallback, useEffect, useRef } from "react";
import { workflowFetch } from "@/lib/client/workflow-fetch";

type QueuedEvent = {
  projectId: string;
  sessionId: string;
  eventType: string;
  questionId: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
};

const SESSION_KEY = "game-workflow.study-session";

function sessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function shortLabel(element: Element) {
  const text = element.getAttribute("aria-label") || element.getAttribute("title") || element.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function useStudyEvents({
  projectId,
  questionId,
  view,
  answerEditorVisible,
  candidateVisible,
}: {
  projectId: string | null;
  questionId: string | null;
  view: string;
  answerEditorVisible: boolean;
  candidateVisible: boolean;
}) {
  const queueRef = useRef<QueuedEvent[]>([]);
  const projectIdRef = useRef(projectId);
  const questionIdRef = useRef(questionId);

  useEffect(() => {
    projectIdRef.current = projectId;
    questionIdRef.current = questionId;
  }, [projectId, questionId]);

  const flush = useCallback(async (explicitProjectId?: string | null) => {
    const targetProjectId = explicitProjectId ?? queueRef.current[0]?.projectId ?? projectIdRef.current;
    if (!targetProjectId || queueRef.current.length === 0) return;
    const events: QueuedEvent[] = [];
    const remaining: QueuedEvent[] = [];
    for (const event of queueRef.current) {
      if (event.projectId === targetProjectId && events.length < 50) events.push(event);
      else remaining.push(event);
    }
    if (events.length === 0) return;
    queueRef.current = remaining;
    try {
      const response = await workflowFetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          events: events.map((event) => ({
            sessionId: event.sessionId,
            eventType: event.eventType,
            questionId: event.questionId,
            payload: event.payload,
            occurredAt: event.occurredAt,
          })),
        }),
        keepalive: true,
      });
      if (!response.ok) throw new Error(`event upload ${response.status}`);
    } catch {
      queueRef.current = [...events, ...queueRef.current].slice(-200);
    }
  }, []);

  const record = useCallback((eventType: string, payload: Record<string, unknown> = {}, explicitQuestionId?: string | null) => {
    const targetProjectId = projectIdRef.current;
    if (!targetProjectId) return;
    queueRef.current.push({
      projectId: targetProjectId,
      sessionId: sessionId(),
      eventType,
      questionId: explicitQuestionId === undefined ? questionIdRef.current : explicitQuestionId,
      payload,
      occurredAt: new Date().toISOString(),
    });
    if (queueRef.current.length >= 20) void flush();
  }, [flush]);

  useEffect(() => {
    if (!projectId) return;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    record("page_loaded", { path: window.location.pathname, navigationType: navigation?.type ?? "unknown" }, null);
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button,a") : null;
      if (!target) return;
      record("ui_click", { element: target.tagName.toLowerCase(), label: shortLabel(target) });
    };
    const onOnline = () => record("connection_online", {}, null);
    const onOffline = () => record("connection_offline", {}, null);
    const onVisibility = () => record("visibility_changed", { state: document.visibilityState }, null);
    const onPageShow = (event: PageTransitionEvent) => record("page_shown", { persisted: event.persisted }, null);
    const onPageHide = (event: PageTransitionEvent) => {
      record("page_hidden", { persisted: event.persisted }, null);
      void flush(projectId);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    const timer = window.setInterval(() => void flush(), 2000);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(timer);
      void flush(projectId);
    };
  }, [flush, projectId, record]);

  useEffect(() => {
    if (!projectId || !questionId) return;
    const openedAt = Date.now();
    record("question_opened", { view }, questionId);
    return () => record("question_closed", { view, durationMs: Date.now() - openedAt }, questionId);
  }, [projectId, questionId, record, view]);

  useEffect(() => {
    if (!projectId) return;
    record("workspace_view_changed", { view }, questionId);
  }, [projectId, questionId, record, view]);

  useEffect(() => {
    if (!projectId || !questionId || !answerEditorVisible) return;
    const openedAt = Date.now();
    record("answer_editor_opened", {}, questionId);
    return () => record("answer_editor_closed", { durationMs: Date.now() - openedAt }, questionId);
  }, [answerEditorVisible, projectId, questionId, record]);

  useEffect(() => {
    if (projectId && questionId && candidateVisible) record("ai_candidate_visible", {}, questionId);
  }, [candidateVisible, projectId, questionId, record]);
}
