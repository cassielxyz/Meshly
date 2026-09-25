import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function allowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !SAFE_METHODS.has(request.method) && !allowedOrigin(request)) {
    return NextResponse.json({ error: "cross_origin_request_rejected" }, { status: 403 });
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", request.headers.get("x-request-id") ?? crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
