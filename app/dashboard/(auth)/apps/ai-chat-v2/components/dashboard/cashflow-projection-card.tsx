"use client";

import { TrendingUpIcon } from "lucide-react";
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

const chartData = [
  { month: "August", projected: 22.5 },
  { month: "September", projected: 18.6 },
  { month: "October", projected: 26.8 },
  { month: "November", projected: 21.4 },
  { month: "December", projected: 28.2 },
  { month: "January", projected: 24.1 }
];

const chartConfig = {
  projected: {
    label: "Projected (₹L)",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function CashflowProjectionCard() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Cashflow Projection</CardTitle>
        <CardDescription className="text-xs">Next 6 months</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <ChartContainer config={chartConfig} className="h-[130px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="projected" fill="var(--color-projected)" radius={10} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1.5 px-4 text-xs">
        <div className="flex gap-2 leading-none font-medium">
          Up 8.4% next quarter <TrendingUpIcon className="size-3.5 text-green-600" />
        </div>
        <div className="text-muted-foreground leading-none">
          From invoices, retainers &amp; recurring
        </div>
      </CardFooter>
    </Card>
  );
}
