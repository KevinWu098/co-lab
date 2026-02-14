"use client";

import { BeakerIcon, FlaskConicalIcon, ThermometerIcon, WeightIcon } from "lucide-react";
import { useState } from "react";
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

export function GraphPanel() {
  const [selected, setSelected] = useState<Set<GraphId>>(new Set(["temperature"]));

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
      <div className="min-h-0 flex-1 p-4">
        {active.length === 0 ? (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            No graph selected
          </div>
        ) : active.length === 1 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
            {active[0].label}
            {active[0].subtitle && (
              <span className="text-muted-foreground/60 ml-2 text-xs">{active[0].subtitle}</span>
            )}
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2">
            {active.map((g) => (
              <div
                key={g.id}
                className="text-muted-foreground flex items-center justify-center rounded border border-dashed font-mono text-sm"
              >
                {g.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-64 flex-col gap-1 border-l p-3">
        <span className="text-muted-foreground mb-1 px-2 font-mono text-[0.65rem] uppercase tracking-wider">
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
                  <span className="text-muted-foreground text-[0.6rem] leading-tight">
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
