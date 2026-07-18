import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  TrendingUpIcon,
  ShieldAlertIcon,
  FileTextIcon,
  LightbulbIcon,
  SparklesIcon,
} from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/layout/logo";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const HIGHLIGHTS = [
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
    title: "Invoices & GST, handled",
    body: "Create GST invoices in chat, track payments, and file GSTR-1 without leaving.",
  },
  {
    icon: LightbulbIcon,
    title: "CFO recommendations",
    body: "Actionable financial decisions, powered by Gemma and tailored to your books.",
  },
];

export default async function LoginPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/kubera");
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Form panel */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <div className="bg-muted text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                <SparklesIcon className="size-3.5" />
                Powered by Google Gemma
              </div>
            </div>

            <Card className="gap-8 py-10">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Welcome to Kubera.ai</CardTitle>
                <CardDescription className="mt-1">
                  Your AI CFO for cash flow, invoices, and GST. Sign in to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleSignInButton />
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Kubera.ai — AI financial assistant for Indian SMEs. Built with Gemma.
        </p>
      </div>

      {/* Showcase panel */}
      <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-indigo-500/10 to-transparent" />
        <div
          className="absolute -top-24 -right-24 size-96 rounded-full bg-purple-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 -left-16 size-96 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="text-sm font-medium text-white/70">The AI CFO for your small business</div>

          <div className="max-w-md">
            <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
              One conversation to run your{" "}
              <span className="bg-gradient-to-r from-purple-300 to-indigo-200 bg-clip-text text-transparent">
                entire finance stack
              </span>
              .
            </h2>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {HIGHLIGHTS.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/10">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-medium">{f.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/40">
            Forecasts, liquidity alerts, invoices, GST, and CFO recommendations — tailored to your books.
          </div>
        </div>
      </div>
    </div>
  );
}
