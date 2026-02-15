"use client";

import {
  BeakerIcon,
  FlaskConicalIcon,
  ThermometerIcon,
  WeightIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type GraphId = "temperature" | "weight" | "volume" | "reactants";

interface GraphSource {
  id: GraphId;
  label: string;
  subtitle?: string;
  icon: typeof ThermometerIcon;
}

const GRAPHS: GraphSource[] = [
  { id: "temperature", label: "Temperature", icon: ThermometerIcon },
  { id: "weight", label: "Weight", icon: WeightIcon },
  { id: "volume", label: "Volume", icon: BeakerIcon },
  {
    id: "reactants",
    label: "Reactants",
    subtitle: "H₂O₂ · Catalyst · Dish soap",
    icon: FlaskConicalIcon,
  },
];

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const temperatureData = [
  { time: "0 min", value: 22.1 },
  { time: "5 min", value: 24.3 },
  { time: "10 min", value: 28.7 },
  { time: "15 min", value: 33.2 },
  { time: "20 min", value: 36.8 },
  { time: "25 min", value: 37.1 },
  { time: "30 min", value: 36.9 },
  { time: "35 min", value: 37.0 },
  { time: "40 min", value: 37.2 },
  { time: "45 min", value: 37.1 },
];

const temperatureConfig = {
  value: { label: "Temperature (°C)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const weightData = [
  { time: "0 min", value: 150.0 },
  { time: "5 min", value: 149.8 },
  { time: "10 min", value: 149.2 },
  { time: "15 min", value: 148.1 },
  { time: "20 min", value: 146.5 },
  { time: "25 min", value: 144.8 },
  { time: "30 min", value: 143.2 },
  { time: "35 min", value: 142.1 },
  { time: "40 min", value: 141.5 },
  { time: "45 min", value: 141.2 },
];

const weightConfig = {
  value: { label: "Weight (g)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const volumeData = [
  { time: "0 min", value: 0 },
  { time: "5 min", value: 12 },
  { time: "10 min", value: 28 },
  { time: "15 min", value: 45 },
  { time: "20 min", value: 67 },
  { time: "25 min", value: 82 },
  { time: "30 min", value: 91 },
  { time: "35 min", value: 96 },
  { time: "40 min", value: 98 },
  { time: "45 min", value: 100 },
];

const volumeConfig = {
  value: { label: "Volume (mL)", color: "var(--chart-4)" },
} satisfies ChartConfig;

const reactantsData = [
  { time: "0 min", h2o2: 30, catalyst: 5.0, soap: 10.0 },
  { time: "5 min", h2o2: 27, catalyst: 4.9, soap: 9.8 },
  { time: "10 min", h2o2: 22, catalyst: 4.7, soap: 9.5 },
  { time: "15 min", h2o2: 16, catalyst: 4.5, soap: 9.1 },
  { time: "20 min", h2o2: 11, catalyst: 4.2, soap: 8.6 },
  { time: "25 min", h2o2: 7, catalyst: 3.9, soap: 8.0 },
  { time: "30 min", h2o2: 4, catalyst: 3.6, soap: 7.4 },
  { time: "35 min", h2o2: 2, catalyst: 3.3, soap: 6.8 },
  { time: "40 min", h2o2: 1, catalyst: 3.0, soap: 6.2 },
  { time: "45 min", h2o2: 0.5, catalyst: 2.8, soap: 5.8 },
];

const reactantsConfig = {
  h2o2: { label: "H₂O₂ (mL)", color: "var(--chart-1)" },
  catalyst: { label: "Catalyst (mL)", color: "var(--chart-3)" },
  soap: { label: "Dish Soap (mL)", color: "var(--chart-5)" },
} satisfies ChartConfig;

// ---------------------------------------------------------------------------
// Individual chart components
// ---------------------------------------------------------------------------

interface ChartProps {
  compact?: boolean;
  animate?: boolean;
}

function TemperatureChart({ compact, animate = true }: ChartProps) {
  return (
    <ChartContainer
      config={temperatureConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart
        data={temperatureData}
        margin={{ top: 12, right: 12, bottom: 0, left: compact ? -20 : 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={compact ? 10 : 12}
        />
        {!compact && (
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={["dataMin - 2", "dataMax + 2"]}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={!compact}
          isAnimationActive={animate}
        />
      </LineChart>
    </ChartContainer>
  );
}

function WeightChart({ compact, animate = true }: ChartProps) {
  return (
    <ChartContainer
      config={weightConfig}
      className="aspect-auto! h-full w-full"
    >
      <AreaChart
        data={weightData}
        margin={{ top: 12, right: 12, bottom: 0, left: compact ? -20 : 0 }}
      >
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-value)"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="var(--color-value)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={compact ? 10 : 12}
        />
        {!compact && (
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={["dataMin - 2", "dataMax + 2"]}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          fill="url(#weightFill)"
          dot={!compact}
          isAnimationActive={animate}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function VolumeChart({ compact, animate = true }: ChartProps) {
  return (
    <ChartContainer
      config={volumeConfig}
      className="aspect-auto! h-full w-full"
    >
      <BarChart
        data={volumeData}
        margin={{ top: 12, right: 12, bottom: 0, left: compact ? -20 : 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={compact ? 10 : 12}
        />
        {!compact && (
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
        />
      </BarChart>
    </ChartContainer>
  );
}

function ReactantsChart({ compact, animate = true }: ChartProps) {
  return (
    <ChartContainer
      config={reactantsConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart
        data={reactantsData}
        margin={{ top: 12, right: 12, bottom: 0, left: compact ? -20 : 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={compact ? 10 : 12}
        />
        {!compact && (
          <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        {!compact && <ChartLegend content={<ChartLegendContent />} />}
        <Line
          type="monotone"
          dataKey="h2o2"
          stroke="var(--color-h2o2)"
          strokeWidth={2}
          dot={!compact}
          isAnimationActive={animate}
        />
        <Line
          type="monotone"
          dataKey="catalyst"
          stroke="var(--color-catalyst)"
          strokeWidth={2}
          dot={!compact}
          isAnimationActive={animate}
        />
        <Line
          type="monotone"
          dataKey="soap"
          stroke="var(--color-soap)"
          strokeWidth={2}
          dot={!compact}
          isAnimationActive={animate}
        />
      </LineChart>
    </ChartContainer>
  );
}

// ---------------------------------------------------------------------------
// Chart lookup
// ---------------------------------------------------------------------------

const CHART_COMPONENTS: Record<GraphId, React.ComponentType<ChartProps>> = {
  temperature: TemperatureChart,
  weight: WeightChart,
  volume: VolumeChart,
  reactants: ReactantsChart,
};

// ---------------------------------------------------------------------------
// GraphPanel
// ---------------------------------------------------------------------------

export function GraphPanel() {
  const initialMount = useRef(true);

  useEffect(() => {
    initialMount.current = false;
  }, []);

  const [selected, setSelected] = useState<Set<GraphId>>(
    new Set(["temperature"]),
  );

  function toggle(id: GraphId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const active = GRAPHS.filter((g) => selected.has(g.id));

  return (
    <div className="flex min-h-0 flex-1 border-t">
      {/* Chart area */}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {active.length === 0 ? (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            No graph selected
          </div>
        ) : active.length === 1 ? (
          <div className="absolute inset-0 p-4">
            {(() => {
              const Chart = CHART_COMPONENTS[active[0].id];
              return <Chart animate={initialMount.current} />;
            })()}
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 grid gap-3 p-4",
              active.length === 2 && "grid-cols-2 grid-rows-1",
              active.length === 3 && "grid-cols-2 grid-rows-2",
              active.length >= 4 && "grid-cols-2 grid-rows-2",
            )}
          >
            {active.map((g) => {
              const Chart = CHART_COMPONENTS[g.id];
              return (
                <div
                  key={g.id}
                  className="relative min-h-0 min-w-0 overflow-hidden rounded-md border"
                >
                  <span className="text-muted-foreground absolute top-2 left-3 z-10 text-[0.7rem] font-medium uppercase tracking-wider">
                    {g.label}
                  </span>
                  <div className="absolute inset-0 p-2 pt-6">
                    <Chart compact animate={initialMount.current} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="flex w-64 flex-col gap-1 border-l p-3">
        <span className="text-muted-foreground mb-1 px-2 font-mono text-xs uppercase tracking-wider">
          Metrics
        </span>
        {GRAPHS.map((g) => {
          const isSelected = selected.has(g.id);
          const Icon = g.icon;

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => toggle(g.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <div className="flex flex-1 flex-col text-left">
                <span>{g.label}</span>
                {g.subtitle && (
                  <span className="text-muted-foreground text-[0.7rem] leading-tight">
                    {g.subtitle}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
