import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/layout/logo";
import { GoogleSignInButton } from "./components/google-sign-in-button";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/apps/ai-chat-v2");
  }

  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Kubera.ai</h1>
          <p className="text-muted-foreground text-sm">
            Your AI CFO for cash flow, invoices, and GST.
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Continue with your Google account to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignInButton />
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs text-balance">
          By continuing you agree to our{" "}
          <Link href="#" className="hover:text-primary underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="hover:text-primary underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
