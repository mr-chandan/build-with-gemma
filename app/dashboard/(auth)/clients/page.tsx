import type { Metadata } from "next";
import { cookies } from "next/headers";
import { UsersIcon } from "lucide-react";

import { createServiceClient } from "@/utils/supabase/service";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

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

  const rows = clients ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">People and businesses you invoice.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All clients ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.company || c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.gstin || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.gstin ? "secondary" : "outline"}>
                        {c.gstin ? "B2B" : "B2C"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
