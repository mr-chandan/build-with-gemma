import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

const DASHBOARD_HOME = "/kubera";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bare /dashboard → the AI dashboard (the only real dashboard page in this build).
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL(DASHBOARD_HOME, request.url));
  }

  // Keep the Supabase auth session refreshed on all other matched routes.
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/agent|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|css|js)$).*)",
  ],
};
