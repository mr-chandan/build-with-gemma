"use client";

import { ActionableDecisionsCard } from "./actionable-decisions-card";
import { CashflowProjectionCard } from "./cashflow-projection-card";
import { LiquidityRiskCard } from "./liquidity-risk-card";

export function GemmaDashboard({
  /** Seeds a question into the chat composer from a card. */
  onAskGemma
}: {
  onAskGemma?: (message: string) => void;
}) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <CashflowProjectionCard />
      <LiquidityRiskCard />
      <ActionableDecisionsCard onAskGemma={onAskGemma} />
    </div>
  );
}
