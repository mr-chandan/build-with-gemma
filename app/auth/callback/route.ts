import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

/**
 * OAuth callback — Supabase redirects here with a `code` after Google sign-in.
 * We exchange it for a session (sets the auth cookies), persist the Google refresh
 * token (so the agent's Gmail/Calendar tools can act later), and forward to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard/kubera";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const service = createServiceClient();

      // Mirror the auth user into our profiles table so we can track users.
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        try {
          await service.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email ?? null,
            full_name: (meta.full_name as string) ?? (meta.name as string) ?? null,
            avatar_url: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
          });
        } catch {
          // Non-fatal.
        }
      }

      // Supabase returns the Google refresh token only on this initial exchange —
      // store it now so we can mint access tokens for Gmail/Calendar later.
      const refreshToken = data.session.provider_refresh_token;
      if (refreshToken && data.user) {
        try {
          await service
            .from("google_credentials")
            .upsert({
              user_id: data.user.id,
              refresh_token: refreshToken,
              scopes: "gmail.readonly gmail.send calendar.readonly calendar.events",
              email: data.user.email ?? null,
              updated_at: new Date().toISOString(),
            });
        } catch {
          // Non-fatal: login still succeeds; Google tools will report "not connected".
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
