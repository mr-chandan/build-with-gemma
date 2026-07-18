import { z } from "zod";

import {
  insertCalendarEvent,
  sendGmailMessage,
  listCalendarEvents,
  listGmailMessages,
  GoogleNotConnectedError,
  GoogleScopeError,
} from "@/lib/google/client";
import type { Tool } from "../types";

function googleError(err: unknown): { error: string } {
  if (err instanceof GoogleNotConnectedError || err instanceof GoogleScopeError) {
    return { error: err.message };
  }
  return { error: err instanceof Error ? err.message : "Google request failed" };
}

export const listCalendarEventsTool: Tool = {
  name: "list_calendar_events",
  description:
    "Read and list the user's upcoming Google Calendar events. Use when the user asks to see their calendar or what's on their schedule.",
  schema: z.object({
    max_results: z.number().int().positive().max(25).default(10),
  }),
  handler: async (input, ctx) => {
    const { max_results } = input as { max_results: number };
    try {
      const events = await listCalendarEvents(ctx.userId, max_results);
      return { events, count: events.length };
    } catch (err) {
      return googleError(err);
    }
  },
};

export const listGmailTool: Tool = {
  name: "list_gmail",
  description:
    "Read and list recent emails from the user's Gmail inbox (subject, sender, snippet). Use when the user asks to see their emails or search their mail. Supports a Gmail search query.",
  schema: z.object({
    query: z.string().optional().describe("Optional Gmail search query, e.g. 'from:client is:unread'."),
    max_results: z.number().int().positive().max(20).default(10),
  }),
  handler: async (input, ctx) => {
    const { query, max_results } = input as { query?: string; max_results: number };
    try {
      const messages = await listGmailMessages(ctx.userId, { query, maxResults: max_results });
      return { messages, count: messages.length };
    } catch (err) {
      return googleError(err);
    }
  },
};

export const createCalendarEventTool: Tool = {
  name: "create_calendar_event",
  description:
    "Add an event to the user's Google Calendar — e.g. an invoice due date or a GST filing deadline. Use an all-day event (date) for deadlines.",
  requiresConfirmation: true,
  schema: z.object({
    summary: z.string().describe("Event title, e.g. 'INV-0001 due — Acme'."),
    date: z.string().describe("All-day event date, ISO YYYY-MM-DD."),
    description: z.string().optional(),
  }),
  handler: async (input, ctx) => {
    const args = input as { summary: string; date: string; description?: string };
    try {
      const ev = await insertCalendarEvent(ctx.userId, {
        summary: args.summary,
        date: args.date,
        description: args.description,
      });
      return { summary: args.summary, date: args.date, link: ev.htmlLink };
    } catch (err) {
      if (err instanceof GoogleNotConnectedError) return { error: err.message };
      return { error: err instanceof Error ? err.message : "Calendar event failed" };
    }
  },
};

export const sendGmailTool: Tool = {
  name: "send_gmail",
  description:
    "Send an email from the user's own Gmail account (e.g. a personalised note to a client). For standard payment reminders prefer send_invoice_reminder.",
  requiresConfirmation: true,
  schema: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string().describe("Plain-text email body."),
  }),
  handler: async (input, ctx) => {
    const args = input as { to: string; subject: string; body: string };
    try {
      const sent = await sendGmailMessage(ctx.userId, args);
      return { to: args.to, subject: args.subject, id: sent.id };
    } catch (err) {
      if (err instanceof GoogleNotConnectedError) return { error: err.message };
      return { error: err instanceof Error ? err.message : "Gmail send failed" };
    }
  },
};
