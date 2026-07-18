import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRightIcon,
  TrendingUpIcon,
  ShieldAlertIcon,
  FileTextIcon,
  BellIcon,
  ReceiptIndianRupeeIcon,
  SparklesIcon,
} from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Logo from "@/components/layout/logo";

const FEATURES = [
  {
    icon: TrendingUpIcon,
    title: "Cash flow forecasting",
    body: "Project inflows and outflows weeks ahead so you always know your runway.",
  },
  {
    icon: ShieldAlertIcon,
    title: "Liquidity risk alerts",
    body: "Get warned before a shortfall — Kubera flags the weeks money runs tight.",
  },
  {
    icon: FileTextIcon,
    title: "Invoices, B2B & B2C",
    body: "Create GST invoices in chat, track paid and unpaid, and record payments.",
  },
  {
    icon: BellIcon,
    title: "Automatic reminders",
    body: "Chase overdue invoices automatically over email, so you get paid faster.",
  },
  {
    icon: ReceiptIndianRupeeIcon,
    title: "GST filing",
    body: "Classify invoices and file GSTR-1 returns without leaving the assistant.",
  },
  {
    icon: SparklesIcon,
    title: "CFO recommendations",
    body: "Actionable financial decisions, powered by Google's Gemma, tailored to your books.",
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/dashboard/apps/ai-chat-v2" : "/login";
  const ctaLabel = user ? "Open dashboard" : "Get started";

  return (
    <div className="bg-background flex min-h-svh flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-lg font-semibold tracking-tight">Kubera.ai</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={ctaHref}>{user ? "Dashboard" : "Sign in"}</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-20 text-center">
          <div className="bg-muted text-muted-foreground mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <SparklesIcon className="size-3.5" />
            Powered by Google Gemma
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance lg:text-6xl">
            The AI CFO for your{" "}
            <span className="bg-gradient-to-r from-purple-500 to-indigo-400 bg-clip-text text-transparent">
              small business
            </span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-balance">
            Kubera forecasts your cash flow, flags liquidity risks, manages invoices and GST, and
            recommends the next financial move — all in one conversation.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href={ctaHref}>
                {ctaLabel}
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="h-full">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs">
          Kubera.ai — AI financial assistant for Indian SMEs. Built with Gemma.
        </div>
      </footer>
    </div>
  );
}
