"use client";

import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Metrics } from "./gemma-dashboard";

type Urgency = "high" | "medium" | "low";

const badgeVariant: Record<Urgency, "destructive" | "warning" | "success"> = {
  high: "destructive",
  medium: "warning",
  low: "success"
};

export function ActionableDecisionsCard({
  metrics,
  onAskGemma
}: {
  metrics: Metrics | null;
  /** Seeds the question into the chat composer. */
  onAskGemma?: (message: string) => void;
}) {
  const decisions = metrics?.decisions ?? [];

  if (!metrics) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">Actionable Decisions</CardTitle>
          <CardDescription className="text-xs">Ranked by cash impact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 px-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Actionable Decisions</CardTitle>
        <CardDescription className="text-xs">Ranked by cash impact</CardDescription>
      </CardHeader>
      {/* Caps at ~3 rows so this card stops dictating the height of the whole
          grid row; anything beyond that scrolls inside the card. */}
      <CardContent className="max-h-[156px] space-y-1.5 overflow-y-auto px-4">
        {decisions.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Nothing urgent right now. Add invoices to see recommendations.
          </p>
        )}
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
