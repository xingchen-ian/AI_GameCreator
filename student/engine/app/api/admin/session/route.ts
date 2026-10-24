import {
  clearAdminSession,
  hasAdminSession,
  requestUsesHttps,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/server/access-session";

export async function GET() {
  return Response.json({ authenticated: await hasAdminSession() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { password?: string };
    if (!await verifyAdminPassword(body.password ?? "")) {
      return Response.json({ error: "管理员密码不正确。" }, { status: 401 });
    }
    await setAdminSession(requestUsesHttps(request));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "管理员登录失败。" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
