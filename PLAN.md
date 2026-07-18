# FinMate — Build with Gemma: AI Financial Assistant for SMEs

> **ARCHITECTURE (final, 2026-07-18): single Next.js stack, Node.js only.** The AI agent runs
> in **Next.js API routes on the Node runtime** — NO separate Python backend. Gemma via the
> `@google/genai` JS SDK with emulated function calling (tools in the prompt, JSON tool calls
> parsed back out). Tools hit Supabase via `@supabase/supabase-js`. The `variable` project is a
> **feature/structure reference only**; its Python ADK backend is not replicated. An earlier
> `backend/` scaffold was removed. Ignore the Python-architecture description further below —
> kept only for the feature breakdown and phase plan.

Built so far:
- `lib/agent/` — `gemma.ts` (client + emulated tool calling), `orchestrator.ts` (loop + HITL
  confirm), `tools/` (registry), `prompt.ts`, `types.ts`.
- `app/api/agent/route.ts` — Node SSE endpoint (events: text/tool_call/tool_result/confirm/done).
- `utils/supabase/{server,client,middleware,service}.ts`, `proxy.ts` (redirects + session refresh).
- Supabase schema applied (clients, invoices, invoice_items, invoice_payments, invoice_reminders,
  cash_flow_entries).
- **Google login** (Supabase Auth): `app/login/`, `app/auth/callback/route.ts`,
  `app/auth/signout/route.ts`, dashboard gated in `(auth)/layout.tsx`, real user in sidebar
  `nav-user.tsx`. ⚠️ Needs the Google provider enabled in the Supabase dashboard (see below).

## Supabase Google OAuth — dashboard setup (user action)
1. Google Cloud Console → APIs & Services → Credentials → create an **OAuth client ID** (Web).
   Authorized redirect URI: `https://qeqznsfhsavwwnsrkqgz.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → **Google** → enable, paste the Client ID
   and Client Secret from step 1.
3. Supabase Dashboard → Authentication → URL Configuration → add `http://localhost:3000/**`
   (and the prod URL) to the redirect allow-list; set Site URL to `http://localhost:3000`.

---

> Note: the Botpress skill at `.agents/skills/adk` is a *different* ADK — ignore it.

## Feature scope (locked)

**1. Chat interface** (Gemma-powered, tool calling + generative UI)
- GST filing (WhiteBooks sandbox, GSTR-1 flow borrowed from `variable`/`gst-steps`)
- Gmail integration (OAuth; read/send from chat — borrow `variable`'s `gmail/` module)
- Calendar integration (deadlines + Google Calendar OAuth — borrow `variable`'s `gcal/` module)
- Voice input (Web Speech API mic button — `variable`'s frontend already uses `react-speech-recognition`)
- Invoice cards rendered in chat (list / preview / created / reminder-sent cards)

**2. Dashboard cards** (already scaffolded in `app/dashboard/(auth)/apps/ai-chat-v2/components/dashboard/`)
- Cashflow projection — fed by `forecast_cash_flow` tool
- Liquidity risk — fed by `liquidity_risk_check` tool
- CFO recommendation — fed by `cfo_recommendation` tool
- Actionable financial decisions — fed by `actionable_decisions` tool

**3. Invoices**
- B2B (client with GSTIN) and B2C (`invoices.invoice_type`)
- Send reminders manually from chat ("remind Acme about INV-004")
- **Automatic reminders** — background scheduler emails clients when invoices approach/pass due
  date (`invoices.auto_remind` flag; logged in `invoice_reminders`)
- Record payments — paid/unpaid/partial (`invoice_payments` table; `record_payment` tool;
  paid invoices auto-create a cash-flow inflow entry)

**4. Cashflow**
- Statements page (period-wise inflow/outflow/net, from `cash_flow_entries` + payments)
- Metrics: total inflow, total outflow, net, burn rate, runway
- AI can add/delete entries via tools (HITL confirm on delete)

## Architecture

```
┌──────────────────────────────────┐      ┌───────────────────────────────────┐
│ Frontend (this repo, Next.js 16) │      │ backend/ (NEW — Python FastAPI)   │
│                                  │ SSE  │                                   │
│ ai-chat-v2 → AG-UI chat client   │◄────►│ google-adk + ag-ui-adk → /agent   │
│  (port use-agent-chat.ts from    │AG-UI │                                   │
│   variable; no CopilotKit)       │      │ Orchestrator (LlmAgent, Gemma)    │
│ /api/agent  → SSE proxy          │      │  ├─ invoicing_agent               │
│ Voice: Web Speech API mic        │      │  ├─ cashflow_agent                │
│                                  │      │  ├─ email_agent   (Gmail+Resend)  │
│ Generative UI (CARD_TOOLS):      │      │  ├─ compliance_agent (calendar)   │
│  invoice cards, dashboard cards, │      │  └─ gst_agent     (sandbox)       │
│  HITL confirm card               │      │                                   │
│                                  │      │ Background scheduler:             │
│ Non-chat pages read Supabase     │      │  auto-reminders (APScheduler)     │
│ directly (@supabase/ssr)         │      │                                   │
└──────────────────────────────────┘      │ Supabase Postgres (SQLAlchemy)    │
                                          │  + ADK DatabaseSessionService     │
                                          └───────────────────────────────────┘
```

Patterns copied from `variable` (proven there, don't reinvent):
- Toolless **router orchestrator** with `sub_agents` + `_route_guard.py` (rewrites stray tool
  calls into `transfer_to_agent` — prevents "Tool not found" crashes).
- `App(resumability_config=ResumabilityConfig(is_resumable=True))` + `_adk_patches.py` so
  **HITL confirmations** (`require_confirmation` on create/send/delete tools) resume correctly.
- `adk_agents/finmate/agent.py` dev entry so `adk web` debugs the agent without the frontend.
- Prompts as markdown files per agent (`prompts/*.md`).
- OAuth-connect-via-chat pattern: tool result drives a connect popup card, auth code returns
  into the chat, refresh token persisted (Gmail + Calendar).

## Build order

**Phase 0 — Backend scaffold + Gemma tool-calling smoke test** ⚠️ de-risks everything
- `backend/` scaffold (FastAPI, google-adk, ag-ui-adk, SQLAlchemy → Supabase, uvicorn).
- Echo tool + orchestrator; verify with `adk web` that `gemma-4-26b-a4b-it` responds **and calls tools**.
- If Gemma function-calling fails on the API: fallback = LiteLLM wrapper or prompted-JSON tools.

**Phase 1 — Invoicing agent** (clients, B2B/B2C invoices, record payment)
- Tools: `list_clients`, `create_client`, `list_invoices`, `create_invoice`, `record_payment`,
  `list_overdue_invoices`. Writes gated by HITL confirm. Payment → cash-flow inflow entry.

**Phase 2 — Frontend chat + generative UI + voice**
- `/api/agent` proxy, `use-agent-chat.ts` port, chat page inside ai-chat-v2.
- CARD_TOOLS renderers: invoice list/preview cards, client card, HITL confirm card.
- Mic button (Web Speech API) for voice input.

**Phase 3 — Reminders: manual + automatic (Resend)**
- `send_invoice_reminder` tool (Resend REST, log to `invoice_reminders`).
- APScheduler job in backend: daily scan → due-soon/overdue invoices with `auto_remind` → email.

**Phase 4 — Cashflow agent + dashboard cards + statements page**
- Tools: `add_cash_flow_entry`, `delete_cash_flow_entry` (HITL), `list_cash_flow`,
  `forecast_cash_flow`, `liquidity_risk_check`, `cfo_recommendation`, `actionable_decisions`.
- Wire the four existing gemma-dashboard cards to these tool results.
- Cashflow statements page (inflow/outflow/net by month + metrics tiles) reading Supabase.

**Phase 5 — Calendar + Gmail integration**
- `list_deadlines` (pure compute: invoice due dates + GST statutory dates) — works with no OAuth.
- Google OAuth (borrow `gcal/` + `gmail/` from `variable`): `connect_google_calendar`,
  `add_deadline_to_calendar`, `search_gmail`, `send_gmail` — connect handshake via chat card.
- Template's calendar app page shows deadlines.

**Phase 6 — GST filing (sandbox)**
- Borrow `variable`'s `gstr1/` + `tools/gst_filing.py` + `gst-steps` WhiteBooks sandbox flow
  (test GSTIN `27AAGCB1286QJZM`, OTP auth, classify invoices → GSTR-1 summary → file).

## Needed from user (by phase)
1. **Now (P0):** Supabase **database password** (Settings → Database) for `DATABASE_URL`;
   run `supabase/schema.sql` in the SQL editor.
2. **P3:** real Resend API key (replace `re_xxxxxxxxx` in `.env.local` / backend `.env`).
3. **P5:** Google Cloud OAuth client (or copy `variable`'s client id/secret from `backend/.env`).
4. **P6:** WhiteBooks sandbox keys (or copy from `gst-steps/.env.local`).
