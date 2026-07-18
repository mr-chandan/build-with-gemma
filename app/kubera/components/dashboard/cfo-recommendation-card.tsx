"use client";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metrics } from "./gemma-dashboard";

export function CfoRecommendationCard({
  metrics,
  onAskGemma
}: {
  metrics: Metrics | null;
  /** Seeds the question into the chat composer. */
  onAskGemma?: (message: string) => void;
}) {
  const recommendation = metrics?.recommendation.text ?? "";
  const rationale = metrics?.recommendation.rationale ?? "";
  const prompt = recommendation ? `${recommendation}. Explain why and how.` : "";

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">CFO Recommendation</CardTitle>
        <CardDescription className="text-xs">Highest-leverage move</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-4">
        {!metrics ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">{recommendation}</p>
            <CardDescription className="mt-2 text-xs">{rationale}</CardDescription>
          </>
        )}
        <div className="mt-auto pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            disabled={!onAskGemma || !metrics}
            onClick={() => onAskGemma?.(prompt)}>
            Ask Gemma why
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
