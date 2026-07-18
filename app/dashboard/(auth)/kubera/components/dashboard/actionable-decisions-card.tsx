"use client";

import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Urgency = "high" | "medium" | "low";

const badgeVariant: Record<Urgency, "destructive" | "warning" | "success"> = {
  high: "destructive",
  medium: "warning",
  low: "success"
};

const decisions: {
  id: string;
  title: string;
  impact: string;
  urgency: Urgency;
  prompt: string;
}[] = [
  {
    id: "overdue",
    title: "Escalate 2 invoices past 60 days",
    impact: "+₹18.0L",
    urgency: "high",
    prompt: "Draft a follow-up for my invoices that are more than 60 days overdue."
  },
  {
    id: "advance-tax",
    title: "Set aside advance tax due 15 Sep",
    impact: "−₹5.4L",
    urgency: "high",
    prompt: "How much advance tax should I set aside for the September instalment?"
  },
  {
    id: "vendor-terms",
    title: "Move top vendors to net-45 terms",
    impact: "+₹3.2L",
    urgency: "medium",
    prompt: "Which vendors should I move to net-45 payment terms?"
  },
  {
    id: "idle-cash",
    title: "Sweep idle cash into a liquid fund",
    impact: "+₹96K",
    urgency: "low",
    prompt: "How much idle cash can I safely sweep into a liquid fund?"
  }
];

export function ActionableDecisionsCard({
  onAskGemma
}: {
  /** Seeds the question into the chat composer. */
  onAskGemma?: (message: string) => void;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Actionable Decisions</CardTitle>
        <CardDescription className="text-xs">Ranked by cash impact</CardDescription>
      </CardHeader>
      {/* Caps at ~3 rows so this card stops dictating the height of the whole
          grid row; anything beyond that scrolls inside the card. */}
      <CardContent className="max-h-[156px] space-y-1.5 overflow-y-auto px-4">
        {decisions.map((decision) => (
          <button
            key={decision.id}
            type="button"
            disabled={!onAskGemma}
            onClick={() => onAskGemma?.(decision.prompt)}
            className={cn(
              "bg-muted flex w-full items-center gap-2 rounded-md px-3 py-2 text-left",
              onAskGemma && "hover:bg-muted/70 transition-colors"
            )}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{decision.title}</p>
              <p className="text-muted-foreground text-[11px]">{decision.impact}</p>
            </div>
            <Badge variant={badgeVariant[decision.urgency]}>{decision.urgency}</Badge>
            {onAskGemma && <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0" />}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
