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

const recommendation = "Collect the ₹18L overdue book before adding headcount";
const rationale =
  "Two invoices past 60 days cover a full month of burn. Clearing them lifts runway from 4.2 to 5.4 months without touching the hiring plan.";
const prompt = "Why should I collect the overdue invoices before hiring?";

export function CfoRecommendationCard({
  onAskGemma
}: {
  /** Seeds the question into the chat composer. */
  onAskGemma?: (message: string) => void;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">CFO Recommendation</CardTitle>
        <CardDescription className="text-xs">Highest-leverage move</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-4">
        <p className="text-sm font-medium">{recommendation}</p>
        <CardDescription className="mt-2 text-xs">{rationale}</CardDescription>
        <div className="mt-auto pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            disabled={!onAskGemma}
            onClick={() => onAskGemma?.(prompt)}>
            Ask Gemma why
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
