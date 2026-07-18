/**
 * Google API access for agent tools — mints a short-lived access token from the
 * user's stored refresh token (captured at sign-in), then calls Gmail / Calendar REST.
 */

import { createServiceClient } from "@/utils/supabase/service";

export class GoogleNotConnectedError extends Error {
  constructor() {
    super("Google isn't connected. Ask the user to sign out and sign in again to grant Gmail and Calendar access.");
    this.name = "GoogleNotConnectedError";
  }
}

async function getRefreshToken(userId: string): Promise<string> {
  const { data } = await createServiceClient()
    .from("google_credentials")
    .select("refresh_token")
    .eq("user_id", userId)
    .single();
  if (!data?.refresh_token) throw new GoogleNotConnectedError();
  return data.refresh_token;
}

export async function getAccessToken(userId: string): Promise<string> {
  const refreshToken = await getRefreshToken(userId);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google did not return an access token.");
  return json.access_token;
}

/** Insert an all-day (or timed) event on the user's primary calendar. */
export async function insertCalendarEvent(
  userId: string,
  event: { summary: string; description?: string; date?: string; startDateTime?: string; endDateTime?: string }
): Promise<{ id: string; htmlLink: string }> {
  const token = await getAccessToken(userId);
  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
  };
  if (event.date) {
    body.start = { date: event.date };
    body.end = { date: event.date };
  } else {
    body.start = { dateTime: event.startDateTime };
    body.end = { dateTime: event.endDateTime ?? event.startDateTime };
  }
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Calendar insert failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: string; htmlLink: string };
  return { id: json.id, htmlLink: json.htmlLink };
}

/** List upcoming events from the user's primary calendar. */
export async function listCalendarEvents(
  userId: string,
  maxResults = 10
): Promise<{ id: string; summary: string; start: string; link: string }[]> {
  const token = await getAccessToken(userId);
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Calendar list failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    items?: { id: string; summary?: string; start?: { date?: string; dateTime?: string }; htmlLink?: string }[];
  };
  return (json.items ?? []).map((e) => ({
    id: e.id,
    summary: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date ?? "",
    link: e.htmlLink ?? "",
  }));
}

/** List recent Gmail messages (subject / from / snippet). */
export async function listGmailMessages(
  userId: string,
  opts: { query?: string; maxResults?: number } = {}
): Promise<{ id: string; from: string; subject: string; snippet: string; date: string }[]> {
  const token = await getAccessToken(userId);
  const listParams = new URLSearchParams({ maxResults: String(opts.maxResults ?? 10) });
  if (opts.query) listParams.set("q", opts.query);
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) {
    const t = await listRes.text().catch(() => "");
    throw new Error(`Gmail list failed (${listRes.status}): ${t.slice(0, 200)}`);
  }
  const list = (await listRes.json()) as { messages?: { id: string }[] };
  const ids = (list.messages ?? []).map((m) => m.id);

  const messages = await Promise.all(
    ids.map(async (id) => {
      const mRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!mRes.ok) return null;
      const m = (await mRes.json()) as {
        snippet?: string;
        payload?: { headers?: { name: string; value: string }[] };
      };
      const header = (n: string) =>
        m.payload?.headers?.find((h) => h.name.toLowerCase() === n)?.value ?? "";
      return {
        id,
        from: header("from"),
        subject: header("subject") || "(no subject)",
        snippet: m.snippet ?? "",
        date: header("date"),
      };
    })
  );
  return messages.filter((m): m is NonNullable<typeof m> => m !== null);
}

/** Send an email as the signed-in user via Gmail. */
export async function sendGmailMessage(
  userId: string,
  msg: { to: string; subject: string; body: string }
): Promise<{ id: string }> {
  const token = await getAccessToken(userId);
  const raw = Buffer.from(
    [`To: ${msg.to}`, `Subject: ${msg.subject}`, "Content-Type: text/plain; charset=utf-8", "", msg.body].join("\r\n")
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gmail send failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: string };
  return { id: json.id };
}
