import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for agent tools and API routes.
 *
 * No cookies/session — a plain client keyed with the publishable key. RLS is currently
 * allow-all (single-tenant hackathon build); swap to the service-role key and
 * auth.uid()-scoped policies when multi-tenant auth lands.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const createServiceClient = () =>
  createClient(supabaseUrl!, supabaseKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
