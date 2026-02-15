import React from "react";

import type { TelemetryPoint } from "../types";

type MetricCardProps = {
  title: string;
  points: TelemetryPoint[];
  valueLabel: string;
  colorClass: string;
};

function MetricCard({ title, points, valueLabel, colorClass }: MetricCardProps) {
  const width = 440;
  const height = 120;
  const padding = 8;

  const values = points.map((point) => point.value);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const span = Math.max(max - min, 0.1);

  const polylinePoints = points
    .map((point, index) => {
      const x = padding + (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((point.value - min) / span) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{valueLabel}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full rounded-lg bg-slate-50">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="stroke-slate-200"
          strokeWidth={1}
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="stroke-slate-200"
          strokeWidth={1}
        />
        {points.length > 1 ? (
          <polyline
            fill="none"
            points={polylinePoints}
            className={colorClass}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
      </svg>
      <p className="mt-2 text-[11px] text-slate-500">Last {points.length} samples</p>
    </article>
  );
}

type TelemetryPanelProps = {
  thermalMaxPoints: TelemetryPoint[];
  thermalMinPoints: TelemetryPoint[];
  volumePoints: TelemetryPoint[];
  thermalMaxLabel: string;
  thermalMinLabel: string;
  volumeLabel: string;
};

export function TelemetryPanel({
  thermalMaxPoints,
  thermalMinPoints,
  volumePoints,
  thermalMaxLabel,
  thermalMinLabel,
  volumeLabel,
}: TelemetryPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <MetricCard
        title="Thermal Max (C)"
        points={thermalMaxPoints}
        valueLabel={thermalMaxLabel}
        colorClass="stroke-rose-500"
      />
      <MetricCard
        title="Thermal Min (C)"
        points={thermalMinPoints}
        valueLabel={thermalMinLabel}
        colorClass="stroke-cyan-500"
      />
      <MetricCard
        title="Flask Volume (mL)"
        points={volumePoints}
        valueLabel={volumeLabel}
        colorClass="stroke-emerald-600"
      />
    </section>
  );
}
