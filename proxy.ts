// Runs on the server before every /app page and /api route. "/" (the public
// overview) and Workflow's internal /.well-known/workflow/ paths are not
// matched, so they are never blocked.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionSecret, verifySessionToken } from "./lib/session.ts";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/app/sign-in") return NextResponse.next();

  const secret = sessionSecret();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = secret && token ? await verifySessionToken(token, secret) : null;
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const signIn = new URL("/app/sign-in", request.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
