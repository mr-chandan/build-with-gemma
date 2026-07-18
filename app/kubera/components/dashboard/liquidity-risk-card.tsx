"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/format";
import type { Metrics } from "./gemma-dashboard";

const totalBars = 30;
const safeBarColor = "rgb(22 163 74)";
const riskBarColor = "rgb(220 38 38)";

export function LiquidityRiskCard({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) {
    return (
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">Liquidity Risk</CardTitle>
          <CardDescription className="text-xs">Cover vs. exposure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { cashPosition, safeCover, atRisk, safePercent, riskPercent } = metrics.liquidity;
  const safeBars = Math.round((safePercent / 100) * totalBars);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Liquidity Risk</CardTitle>
        <CardDescription className="text-xs">Cover vs. exposure</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <div className="flex items-end gap-2">
          <p className="text-2xl leading-none font-semibold">{inr(cashPosition)}</p>
          <p className="text-muted-foreground mb-0.5 text-xs leading-none">Net Cash Position</p>
        </div>

        <div className="grid grid-cols-30 gap-[3px]">
          {Array.from({ length: totalBars }, (_, i) => {
            const barColor = i < safeBars ? safeBarColor : riskBarColor;
            return (
              <motion.div
                key={i}
                className="h-9 rounded-xs"
                style={{ backgroundColor: barColor }}
                initial={{ opacity: 0, scaleY: 0.25 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
              />
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="bg-muted flex items-center gap-2 rounded-md p-3">
            <span className="size-2 shrink-0 rounded-full bg-green-600" />
            <p className="text-xs font-medium">Safe Cover</p>
            <p className="text-muted-foreground ms-auto text-xs">{inr(safeCover)} </p>
            <Badge variant="success">{safePercent}%</Badge>
          </div>

          <div className="bg-muted flex items-center gap-2 rounded-md p-3">
            <span className="size-2 shrink-0 rounded-full bg-red-600" />
            <p className="text-xs font-medium">At Risk (overdue)</p>
            <p className="text-muted-foreground ms-auto text-xs">{inr(atRisk)} </p>
            <Badge variant="destructive">{riskPercent}%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
