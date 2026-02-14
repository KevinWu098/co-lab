import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  values: number[];
  unit: string;
  window?: number;
  last?: boolean;
  className?: string;
}

function computeTrend(values: number[], window: number): "up" | "down" | null {
  if (values.length < 2) return null;

  const slice = values.slice(-window);
  const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
  const current = values[values.length - 1];

  if (current > avg) return "up";
  if (current < avg) return "down";
  return null;
}

export function DataCard({
  title,
  values,
  unit,
  window = 10,
  last: isLast = false,
  className,
}: DataCardProps) {
  const current = values[values.length - 1] ?? 0;
  const trend = computeTrend(values, window);

  return (
    <Card className={cn("bg-background gap-2", !isLast && "border-r-0", className)}>
      <CardHeader className="grid-rows-[auto] gap-0">
        <CardTitle className="font-sans">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <span className="font-mono text-2xl">{current}</span>{" "}
          <span className="text-muted-foreground font-sans text-base">{unit}</span>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center",
              trend === "up" ? "text-emerald-500" : "text-red-500",
            )}
          >
            {trend === "up" ? (
              <TrendingUpIcon className="size-5" />
            ) : (
              <TrendingDownIcon className="size-5" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
