"use client";

import {
  CameraIcon,
  ChartLineIcon,
  ClipboardListIcon,
  BeakerIcon,
  RefreshCwIcon,
  SpotlightIcon,
  VideoIcon,
  FlaskConicalIcon,
  ThermometerIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Pulse } from "@/components/co-lab/pulse";
import { ProcedureStepList } from "@/components/co-lab/dashboard/procedure-step-list";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  deriveHttpBaseUrl,
  THERMAL_STREAM_PATH,
  WEBCAM_STREAM_PATH,
} from "@/lib/hardware/constants";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import type { TelemetryPoint } from "@/lib/hardware/types";
import type { ProcedureStep } from "@/lib/schemas/procedure";
import { cn } from "@/lib/utils";

// ── Camera sources ──────────────────────────────────────────────────────────

type CameraId = "webcam" | "thermal";

// ── Graph sources ───────────────────────────────────────────────────────────

type GraphId = "temperature" | "visionVolume" | "reactants";

interface GraphOption {
  id: GraphId;
  label: string;
  icon: typeof ThermometerIcon;
}

const GRAPH_OPTIONS: GraphOption[] = [
  { id: "temperature", label: "Temperature", icon: ThermometerIcon },
  { id: "visionVolume", label: "Volume", icon: BeakerIcon },
  { id: "reactants", label: "Reactants", icon: FlaskConicalIcon },
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

// ── Data helpers ────────────────────────────────────────────────────────────

function round1(v: number | null): number | null {
  return v != null ? Math.round(v * 10) / 10 : null;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
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

// ── Compact chart components ────────────────────────────────────────────────

function CompactTemperatureChart({
  data,
}: {
  data: ReturnType<typeof toChartData>;
}) {
  return (
    <ChartContainer
      config={temperatureConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={10}
          domain={["dataMin - 2", "dataMax + 2"]}
          tickFormatter={(v: number) => `${v.toFixed(1)}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="tempC"
          name="Temperature (°C)"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

function CompactReactantsChart({
  data,
}: {
  data: ReturnType<typeof toChartData>;
}) {
  return (
    <ChartContainer
      config={reactantsConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={10}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="stepAfter"
          dataKey="h2o2"
          stroke="var(--color-h2o2)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="catalyst"
          stroke="var(--color-catalyst)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="soap"
          stroke="var(--color-soap)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

function CompactVisionVolumeChart({
  data,
}: {
  data: ReturnType<typeof toChartData>;
}) {
  return (
    <ChartContainer
      config={visionVolumeConfig}
      className="aspect-auto! h-full w-full"
    >
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          fontSize={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          fontSize={10}
          tickFormatter={(v: number) => `${v.toFixed(1)}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="volumeMl"
          name="Volume (mL)"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

const CHART_MAP: Record<
  GraphId,
  React.ComponentType<{ data: ReturnType<typeof toChartData> }>
> = {
  temperature: CompactTemperatureChart,
  visionVolume: CompactVisionVolumeChart,
  reactants: CompactReactantsChart,
};

// ── ContentGrid ─────────────────────────────────────────────────────────────

export function ContentGrid({ procedure }: { procedure?: ProcedureStep[] }) {
  const steps = procedure ?? [];
  const { state, wsUrl, telemetry } = useHardwareContext();
  const httpBase = useMemo(() => deriveHttpBaseUrl(wsUrl), [wsUrl]);

  // Camera: single selection
  const [activeCam, setActiveCam] = useState<CameraId>("webcam");
  const [streamNonce, setStreamNonce] = useState(() => Date.now());
  const [streamError, setStreamError] = useState(false);

  // Graph: single selection
  const [activeGraph, setActiveGraph] = useState<GraphId>("temperature");

  const chartData = useMemo(() => {
    const raw = toChartData(telemetry);
    if (raw.length <= 120) return raw;
    const step = Math.ceil(raw.length / 120);
    return raw.filter((_, i) => i % step === 0 || i === raw.length - 1);
  }, [telemetry]);

  const camInfo = useMemo(() => {
    if (activeCam === "thermal") {
      return {
        label: "Thermal",
        connected: state.thermal.available,
        streamUrl: `${httpBase}${THERMAL_STREAM_PATH}`,
      };
    }
    return {
      label: "Webcam",
      connected: state.webcam.available,
      streamUrl: `${httpBase}${WEBCAM_STREAM_PATH}`,
    };
  }, [activeCam, state.thermal.available, state.webcam.available, httpBase]);

  const streamSrc = `${camInfo.streamUrl}?v=${streamNonce}`;
  const Chart = CHART_MAP[activeGraph];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-0">
      {/* ── Procedure column ───────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col border bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ClipboardListIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Procedure</span>
          {steps.length > 0 && (
            <span className="text-muted-foreground/60 font-mono text-xs">
              {steps.length} {steps.length === 1 ? "step" : "steps"}
            </span>
          )}
        </div>
        <div className="flex min-h-0 flex-1">
          <ProcedureStepList steps={steps} />
        </div>
      </div>

      {/* ── Camera column ──────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col border border-l-0 bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <CameraIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Camera</span>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          {camInfo.connected && !streamError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              alt={`${camInfo.label} feed`}
              className="h-full w-full object-contain"
              onError={() => setStreamError(true)}
              onLoad={() => setStreamError(false)}
              src={streamSrc}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-muted-foreground font-mono text-sm">
                {streamError
                  ? `${camInfo.label} stream error`
                  : `${camInfo.label} offline`}
              </span>
              {streamError && (
                <button
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                  onClick={() => {
                    setStreamError(false);
                    setStreamNonce(Date.now());
                  }}
                  type="button"
                >
                  <RefreshCwIcon className="size-3" />
                  Retry
                </button>
              )}
            </div>
          )}

          {activeCam === "thermal" &&
            camInfo.connected &&
            state.thermal.maxTempC != null && (
              <div className="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
                {state.thermal.maxTempC.toFixed(1)}°C
              </div>
            )}
        </div>
        {/* Source selector */}
        <div className="flex border-t">
          {(["webcam", "thermal"] as const).map((id, i) => {
            const Icon = id === "webcam" ? VideoIcon : SpotlightIcon;
            const label = id === "webcam" ? "Webcam" : "Thermal";
            const connected =
              id === "webcam" ? state.webcam.available : state.thermal.available;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveCam(id);
                  setStreamError(false);
                  setStreamNonce(Date.now());
                }}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2 text-xs transition-colors",
                  i > 0 && "border-l",
                  activeCam === id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-3" />
                {label}
                <Pulse
                  variant={connected ? "running" : "inactive"}
                  className="size-3 p-0 [&>div]:size-1"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Graph column ───────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col border border-l-0 bg-background">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ChartLineIcon className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Graph</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {chartData.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center font-mono text-sm">
              {state.connected ? "Recording..." : "Waiting for hardware"}
            </div>
          ) : (
            <div className="absolute inset-0 p-3">
              <Chart data={chartData} />
            </div>
          )}
        </div>
        {/* Metric selector */}
        <div className="flex border-t">
          {GRAPH_OPTIONS.map((g, i) => {
            const Icon = g.icon;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGraph(g.id)}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2 text-xs transition-colors",
                  i > 0 && "border-l",
                  activeGraph === g.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-3" />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
