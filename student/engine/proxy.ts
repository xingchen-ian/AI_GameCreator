import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const isAdminPath = request.nextUrl.pathname === "/admin"
    || request.nextUrl.pathname.startsWith("/admin/")
    || request.nextUrl.pathname === "/api/admin"
    || request.nextUrl.pathname.startsWith("/api/admin/");
  if (isAdminPath && process.env.ADMIN_ALLOW_REMOTE?.trim().toLowerCase() !== "true") {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host") || request.nextUrl.host;
    let hostname = requestHost;
    try {
      hostname = new URL(`http://${requestHost}`).hostname;
    } catch {
      // An invalid or missing host is not treated as local.
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  const username = process.env.APP_BASIC_AUTH_USER?.trim();
  const password = process.env.APP_BASIC_AUTH_PASSWORD?.trim();
  if (!username && !password) return NextResponse.next();

  if (!username || !password) {
    return new NextResponse("Basic Auth configuration is incomplete.", { status: 500 });
  }

  const expected = `Basic ${btoa(`${username}:${password}`)}`;
  if (request.headers.get("authorization") === expected) return NextResponse.next();

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Game Design Workflow", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
