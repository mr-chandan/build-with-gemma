import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from = "onboarding@resend.dev",
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  return resend.emails.send({ from, to, subject, html });
}
