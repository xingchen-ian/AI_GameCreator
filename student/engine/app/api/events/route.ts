import { getDb } from "@/db";
import { studyEvents } from "@/db/schema";
import { getAppUser } from "@/app/app-auth";
import { requireOwnedProject } from "@/lib/server/workspace";

type IncomingEvent = {
  sessionId?: unknown;
  eventType?: unknown;
  questionId?: unknown;
  payload?: unknown;
  occurredAt?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const user = await getAppUser(request);
    if (!user) return Response.json({ error: "需要有效的访问会话。" }, { status: 401 });
    const body = await request.json() as { projectId?: unknown; events?: unknown };
    if (typeof body.projectId !== "string" || !body.projectId || !Array.isArray(body.events) || body.events.length < 1 || body.events.length > 50) {
      return Response.json({ error: "事件请求无效。" }, { status: 400 });
    }
    await requireOwnedProject(body.projectId, user);

    const values = body.events.map((raw): typeof studyEvents.$inferInsert => {
      if (!isObject(raw)) throw new Error("事件内容无效。");
      const event = raw as IncomingEvent;
      if (typeof event.sessionId !== "string" || event.sessionId.length < 8 || event.sessionId.length > 100) throw new Error("事件会话编号无效。");
      if (typeof event.eventType !== "string" || !/^[a-z0-9_]{2,80}$/.test(event.eventType)) throw new Error("事件类型无效。");
      if (event.questionId !== null && event.questionId !== undefined && (typeof event.questionId !== "string" || event.questionId.length > 100)) throw new Error("问题编号无效。");
      if (typeof event.occurredAt !== "string" || !Number.isFinite(Date.parse(event.occurredAt))) throw new Error("事件时间无效。");
      if (!isObject(event.payload)) throw new Error("事件内容无效。");
      const payloadJson = JSON.stringify(event.payload);
      if (payloadJson.length > 8192) throw new Error("单条事件内容过大。");
      return {
        id: crypto.randomUUID(),
        projectId: body.projectId as string,
        sessionId: event.sessionId,
        actor: user.accessMode === "participant" ? "participant" : "admin",
        eventType: event.eventType,
        questionId: typeof event.questionId === "string" ? event.questionId : null,
        payloadJson,
        occurredAt: new Date(event.occurredAt).toISOString(),
      };
    });

    await getDb().insert(studyEvents).values(values);
    return Response.json({ ok: true, count: values.length }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "记录界面事件失败。";
    const status = message.includes("无权访问") || message.includes("不存在") ? 404 : message.includes("无效") || message.includes("过大") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
