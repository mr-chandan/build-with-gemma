import { z } from "zod";

import { createServiceClient } from "@/utils/supabase/service";
import type { Tool } from "../types";

export const listClientsTool: Tool = {
  name: "list_clients",
  description:
    "List the business's clients (customers you invoice). Use before creating an invoice to find the right client, or when the user asks who their clients are.",
  schema: z.object({
    search: z.string().optional().describe("Optional name/company/email substring to filter by."),
  }),
  handler: async (input, ctx) => {
    const { search } = input as { search?: string };
    const supabase = createServiceClient();
    let query = supabase
      .from("clients")
      .select("id, name, email, company, gstin, phone")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (search) {
      query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { clients: data ?? [], count: data?.length ?? 0 };
  },
};

export const createClientTool: Tool = {
  name: "create_client",
  description:
    "Create a new client (customer). For B2B clients include their GSTIN. Returns the created client with its id.",
  schema: z.object({
    name: z.string().describe("Contact or business name."),
    email: z.string().email().describe("Client email — used for invoice reminders."),
    company: z.string().optional(),
    gstin: z.string().optional().describe("15-char GSTIN for B2B clients."),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  handler: async (input, ctx) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({ ...(input as Record<string, unknown>), user_id: ctx.userId })
      .select("id, name, email, company, gstin, phone")
      .single();
    if (error) return { error: error.message };
    return { client: data };
  },
};
