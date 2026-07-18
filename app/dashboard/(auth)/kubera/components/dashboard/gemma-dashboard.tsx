"use client";

import { useEffect, useState } from "react";

import { ActionableDecisionsCard } from "./actionable-decisions-card";
import { CashflowProjectionCard } from "./cashflow-projection-card";
import { LiquidityRiskCard } from "./liquidity-risk-card";

export type Metrics = {
  empty?: boolean;
  summary: { invoiced: number; collected: number; outstanding: number; overdue: number };
  cash: { inflow: number; outflow: number; net: number };
  projection: { month: string; projected: number }[];
  liquidity: { cashPosition: number; safeCover: number; atRisk: number; safePercent: number; riskPercent: number };
  recommendation: { text: string; rationale: string };
  decisions: { id: string; title: string; impact: string; urgency: "high" | "medium" | "low"; prompt: string }[];
};

export function GemmaDashboard({
  /** Seeds a question into the chat composer from a card. */
  onAskGemma
}: {
  onAskGemma?: (message: string) => void;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((d) => {
        if (active) setMetrics(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <CashflowProjectionCard metrics={metrics} />
      <LiquidityRiskCard metrics={metrics} />
      <ActionableDecisionsCard metrics={metrics} onAskGemma={onAskGemma} />
    </div>
  );
}
