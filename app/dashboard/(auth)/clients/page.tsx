import type { Metadata } from "next";
import { cookies } from "next/headers";
import { UsersIcon } from "lucide-react";

import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import ClientList, { Client } from "./client-list";

export const metadata: Metadata = { title: "Clients — Kubera.ai" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const cookieStore = await cookies();
  const {
    data: { user },
  } = await createClient(cookieStore).auth.getUser();

  const supabase = createServiceClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company, email, phone, gstin, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const rows: Client[] = (clients ?? []).map((c) => ({
    id: c.id,
    name: c.company || c.name || "—",
    email: c.email || "",
    phone: c.phone || "",
    gstin: c.gstin || "",
    type: c.gstin ? "B2B" : "B2C",
    createdAt: c.created_at,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">People and businesses you invoice.</p>
      </div>

      {rows.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No clients yet</EmptyTitle>
            <EmptyDescription>
              Ask Kubera in the chat: “Add a client named Acme, email acme@example.com”.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ClientList data={rows} />
      )}
    </div>
  );
}
