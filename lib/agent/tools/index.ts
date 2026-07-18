/**
 * Tool registry. Each module contributes tools; the orchestrator looks them up by name.
 * Card-rendering tools (results shown as generative UI) are tagged in CARD_TOOLS on the
 * frontend, keyed by tool name.
 */

import type { AnyTool } from "../types";
import { pingTool } from "./ping";
import { listClientsTool, createClientTool } from "./clients";
import {
  listInvoicesTool,
  createInvoiceTool,
  recordPaymentTool,
  listOverdueInvoicesTool,
} from "./invoices";
import { sendInvoiceReminderTool } from "./reminders";
import { listDeadlinesTool } from "./deadlines";
import {
  createCalendarEventTool,
  sendGmailTool,
  listCalendarEventsTool,
  listGmailTool,
} from "./google";

export const TOOLS: AnyTool[] = [
  pingTool,
  listClientsTool,
  createClientTool,
  listInvoicesTool,
  createInvoiceTool,
  recordPaymentTool,
  listOverdueInvoicesTool,
  sendInvoiceReminderTool,
  listDeadlinesTool,
  createCalendarEventTool,
  sendGmailTool,
  listCalendarEventsTool,
  listGmailTool,
];

export function getTool(name: string): AnyTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
