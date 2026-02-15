"use client";

import {
  BeakerIcon,
  FlaskConicalIcon,
  ThermometerIcon,
} from "lucide-react";
import { useMemo, useRef, useEffect, useState } from "react";
import {
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
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import type { TelemetryPoint } from "@/lib/hardware/types";
import { cn } from "@/lib/utils";

// ── Graph definitions ───────────────────────────────────────────────────────

type GraphId = "temperature" | "visionVolume" | "reactants";

interface GraphSource {
  id: GraphId;
  label: string;
  subtitle?: string;
  icon: typeof ThermometerIcon;
}

const GRAPHS: GraphSource[] = [
  { id: "temperature", label: "Temperature", icon: ThermometerIcon },
  { id: "visionVolume", label: "Volume", subtitle: "AI-estimated flask volume", icon: BeakerIcon },
  {
    id: "reactants",
    label: "Reactants",
    subtitle: "H₂O₂ · Catalyst · Dish soap",
    icon: FlaskConicalIcon,
  },
];

// ── Chart configs ───────────────────────────────────────────────────────────

const temperatureConfig = {
  value: { label: "Temperature (°C)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const visionVolumeConfig = {
  value: { label: "Volume (mL)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const reactantsConfig = {
  h2o2: { label: "H₂O₂ (mL)", color: "var(--chart-1)" },
  catalyst: { label: "Catalyst (mL)", color: "var(--chart-3)" },
  soap: { label: "Dish Soap (mL)", color: "var(--chart-5)" },
} satisfies ChartConfig;

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function round1(v: number | null): number | null {
  return v != null ? Math.round(v * 10) / 10 : null;
}

function toChartData(telemetry: TelemetryPoint[]) {
  return telemetry.map((p) => ({
    time: formatTime(p.elapsed),
    tempC: round1(p.tempC),
    volumeMl: round1(p.volumeMl),
    h2o2: Math.round(p.dispensed.h2o2 * 10) / 10,
    catalyst: Math.round(p.dispensed.catalyst * 10) / 10,
    soap: Math.round(p.dispensed.soap * 10) / 10,
  }));
}

// ── Individual chart components ─────────────────────────────────────────────

interface ChartProps {
  compact?: boolean;
  animate?: boolean;
  data: ReturnType<typeof toChartData>;
}

function TemperatureChart({ compact, animate = true, data }: ChartProps) {
  return (
    <ChartContainer
      config={temperatureConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart
        data={data}
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
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="tempC"
          name="Temperature (°C)"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={!compact && data.length < 30}
          isAnimationActive={animate}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

function ReactantsChart({ compact, animate = true, data }: ChartProps) {
  return (
    <ChartContainer
      config={reactantsConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart
        data={data}
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
          type="stepAfter"
          dataKey="h2o2"
          stroke="var(--color-h2o2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
        <Line
          type="stepAfter"
          dataKey="catalyst"
          stroke="var(--color-catalyst)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
        <Line
          type="stepAfter"
          dataKey="soap"
          stroke="var(--color-soap)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={animate}
        />
      </LineChart>
    </ChartContainer>
  );
}

function VisionVolumeChart({ compact, animate = true, data }: ChartProps) {
  return (
    <ChartContainer
      config={visionVolumeConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart
        data={data}
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
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
          />
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="volumeMl"
          name="Volume (mL)"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={!compact && data.length < 30}
          isAnimationActive={animate}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

// ── Chart lookup ────────────────────────────────────────────────────────────

const CHART_COMPONENTS: Record<GraphId, React.ComponentType<ChartProps>> = {
  temperature: TemperatureChart,
  visionVolume: VisionVolumeChart,
  reactants: ReactantsChart,
};

// ── GraphPanel ──────────────────────────────────────────────────────────────

export function GraphPanel() {
  const { telemetry, state } = useHardwareContext();
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

  // Downsample for rendering: keep at most ~120 points to keep the chart snappy.
  const chartData = useMemo(() => {
    const raw = toChartData(telemetry);
    if (raw.length <= 120) return raw;
    const step = Math.ceil(raw.length / 120);
    return raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
  }, [telemetry]);

  const hasData = chartData.length > 0;
  const active = GRAPHS.filter((g) => selected.has(g.id));

  // Live stat for the sidebar
  const liveTempC = state.thermal.maxTempC;

  return (
    <div className="flex min-h-0 flex-1 border-t">
      {/* Chart area */}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {!hasData ? (
          <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1 font-mono text-sm">
            <span>
              {state.connected
                ? "Recording telemetry..."
                : "Waiting for hardware connection"}
            </span>
            {state.connected && liveTempC != null && (
              <span className="text-xs">
                Current: {liveTempC.toFixed(1)}°C
              </span>
            )}
          </div>
        ) : active.length === 0 ? (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            No graph selected
          </div>
        ) : active.length === 1 ? (
          <div className="absolute inset-0 p-4">
            {(() => {
              const Chart = CHART_COMPONENTS[active[0].id];
              return (
                <Chart
                  data={chartData}
                  animate={initialMount.current}
                />
              );
            })()}
          </div>
        ) : (
          <div
            className={cn(
              "absolute inset-0 grid gap-3 p-4",
              active.length === 2 && "grid-cols-2 grid-rows-1",
              active.length >= 3 && "grid-cols-2 grid-rows-2",
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
                    <Chart
                      compact
                      data={chartData}
                      animate={initialMount.current}
                    />
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

        {/* Live readout */}
        {state.connected && (
          <div className="mt-3 border-t pt-3">
            <span className="text-muted-foreground px-2 font-mono text-xs uppercase tracking-wider">
              Live
            </span>
            <div className="mt-1 space-y-1 px-2 font-mono text-xs">
              {liveTempC != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temp</span>
                  <span>{liveTempC.toFixed(1)}°C</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Samples</span>
                <span>{telemetry.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
