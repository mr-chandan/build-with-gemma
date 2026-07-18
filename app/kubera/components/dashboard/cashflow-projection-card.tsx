"use client";

import { Bar, BarChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { inr } from "@/lib/format";
import type { Metrics } from "./gemma-dashboard";

const chartConfig = {
  projected: {
    label: "Expected inflow",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function CashflowProjectionCard({ metrics }: { metrics: Metrics | null }) {
  const chartData = metrics?.projection ?? [];
  const totalExpected = chartData.reduce((s, d) => s + d.projected, 0);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Cashflow Projection</CardTitle>
        <CardDescription className="text-xs">Expected inflow, next 6 months</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        {!metrics ? (
          <Skeleton className="h-[130px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[130px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <ChartTooltip
                content={<ChartTooltipContent hideLabel formatter={(v) => inr(Number(v))} />}
              />
              <Bar dataKey="projected" fill="var(--color-projected)" radius={10} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-1.5 px-4 text-xs">
        <div className="flex gap-2 leading-none font-medium">
          {metrics ? `${inr(totalExpected)} expected` : "—"}
        </div>
        <div className="text-muted-foreground leading-none">From unpaid invoices by due date</div>
      </CardFooter>
    </Card>
  );
}
