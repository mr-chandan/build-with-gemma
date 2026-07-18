"use client";

import { CheckCircle2 } from "lucide-react";

/** Static badge — Google (Gmail + Calendar) is connected at login, so this is presentational only. */
export default function GoogleConnectedBadge() {
  return (
    <div
      className="bg-background hidden shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 sm:flex"
      title="Gmail and Google Calendar connected">
      <div className="flex -space-x-2">
        <span className="ring-background flex size-7 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white ring-2">
          <GmailLogo />
        </span>
        <span className="ring-background flex size-7 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white ring-2">
          <CalendarLogo />
        </span>
      </div>
      <span className="flex items-center gap-1 text-xs font-medium">
        <CheckCircle2 className="size-3.5 text-green-600" />
        Connected
      </span>
    </div>
  );
}

function GmailLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-label="Gmail">
      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8C4.924,8,3,9.924,3,12.298z" />
      <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8C43.076,8,45,9.924,45,12.298z" />
    </svg>
  );
}

function CalendarLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-label="Google Calendar">
      <rect width="22" height="22" x="13" y="13" fill="#fff" />
      <polygon fill="#1e88e5" points="25.68,20.92 26.688,22.36 28.272,21.208 28.272,29.56 30,29.56 30,18.616 28.56,18.616" />
      <path
        fill="#1e88e5"
        d="M22.943,23.745c0.625-0.574,1.013-1.37,1.013-2.249c0-1.707-1.472-3.096-3.28-3.096c-1.7,0-3.072,1.15-3.263,2.669l1.71,0.212c0.15-0.706,0.746-1.222,1.483-1.222c0.855,0,1.552,0.673,1.552,1.5c0,0.827-0.697,1.5-1.552,1.5h-0.997v1.5h0.997c0.94,0,1.708,0.796,1.708,1.774c0,0.976-0.768,1.771-1.708,1.771c-0.855,0-1.573-0.674-1.687-1.562l-1.726,0.194c0.207,1.635,1.678,2.868,3.413,2.868c1.896,0,3.436-1.455,3.436-3.242C24.242,25.343,23.731,24.354,22.943,23.745z"
      />
      <polygon fill="#fbc02d" points="34,42 14,42 13,38 14,34 34,34 35,38" />
      <polygon fill="#4caf50" points="38,34 42,34 42,14 38,13 34,14 34,34" />
      <path fill="#1e88e5" d="M34,14l1-4l-1-4H9C7.343,6,6,7.343,6,9v25l4,1l4-1V14H34z" />
      <polygon fill="#e53935" points="34,34 34,42 42,34" />
      <path fill="#1565c0" d="M39,6h-5v8h8V9C42,7.343,40.657,6,39,6z" />
      <path fill="#1565c0" d="M9,42h5v-8H6v5C6,40.657,7.343,42,9,42z" />
    </svg>
  );
}
