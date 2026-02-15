"use client";

import {
  CheckIcon,
  DropletsIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import {
  computeAllSpins,
  type ProcedureStep,
  reagentLabels,
} from "@/lib/schemas/procedure";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; icon: typeof DropletsIcon }> = {
  dispense: { label: "Dispense", icon: DropletsIcon },
  stir: { label: "Stir", icon: RefreshCwIcon },
  cleanup: { label: "Cleanup", icon: Trash2Icon },
};

export function ProcedureStepList({ steps }: { steps: ProcedureStep[] }) {
  const spinMap = useMemo(() => computeAllSpins(steps), [steps]);
  const { execution } = useHardwareContext();

  const isRunning = execution.status === "running";
  const isCompleted = execution.status === "completed";

  if (steps.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center font-mono text-sm">
        No procedure defined
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {steps.map((step, index) => {
        const meta = ACTION_META[step.action.type] ?? ACTION_META.cleanup;
        const Icon = meta.icon;
        const spins = spinMap.get(step.id);

        // Determine step state relative to execution
        const isActive = isRunning && index === execution.currentStep;
        const isDone =
          isCompleted ||
          (isRunning && index < execution.currentStep);

        return (
          <div
            className={cn(
              "border-x border-t transition-colors duration-300 last:border-b",
              isActive
                ? "border-emerald-500/50 bg-emerald-500/10"
                : isDone
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "bg-background",
            )}
            key={step.id}
          >
            <div className="flex items-center gap-2 px-3.5 py-2.5">
              {/* Step number / status indicator */}
              {isDone ? (
                <span className="flex size-5 items-center justify-center">
                  <CheckIcon className="size-3.5 text-emerald-500" />
                </span>
              ) : (
                <span
                  className={cn(
                    "w-5 text-left font-mono text-xs tabular-nums",
                    isActive ? "font-bold text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}

              <Icon
                className={cn(
                  "size-3.5",
                  isActive
                    ? "text-emerald-600"
                    : isDone
                      ? "text-emerald-500/70"
                      : "text-muted-foreground",
                )}
              />
              <span
                className={cn(
                  "font-mono text-xs font-medium uppercase tracking-wider",
                  isActive && "text-emerald-700 dark:text-emerald-400",
                  isDone && "text-emerald-600/70 dark:text-emerald-500/70",
                )}
              >
                {meta.label}
              </span>
              {step.action.type === "dispense" && step.action.reagent && (
                <span
                  className={cn(
                    "font-mono text-xs",
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {reagentLabels[step.action.reagent].formula}
                </span>
              )}

              {/* Running indicator */}
              {isActive && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                </span>
              )}
            </div>

            {spins && spins.length > 0 && (
              <div className="border-t border-dashed px-3.5 py-2">
                {spins.map((spin, i) => (
                  <div
                    className={cn(
                      "flex items-center gap-2 py-0.5",
                      isActive
                        ? "text-emerald-600/80 dark:text-emerald-400/80"
                        : "text-muted-foreground",
                    )}
                    key={`${spin.from}-${spin.to}-${i}`}
                  >
                    <RotateCcwIcon className="size-3 shrink-0" />
                    <span className="font-mono text-xs">
                      Spin {reagentLabels[spin.from].formula} &rarr;{" "}
                      {reagentLabels[spin.to].formula}
                      <span className="ml-1 opacity-50">
                        ({spin.degrees > 0 ? "+" : ""}
                        {spin.degrees}&deg;)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t px-3.5 py-2.5">
              {step.action.type === "dispense" && (
                <span
                  className={cn(
                    "font-mono text-xs",
                    isActive
                      ? "text-emerald-600/80 dark:text-emerald-400/80"
                      : "text-muted-foreground",
                  )}
                >
                  {step.action.amount ?? "—"} {step.action.unit ?? "mL"}
                  {step.action.reagent
                    ? ` of ${reagentLabels[step.action.reagent].name}`
                    : ""}
                </span>
              )}
              {step.action.type === "stir" && (
                <span
                  className={cn(
                    "font-mono text-xs",
                    isActive
                      ? "text-emerald-600/80 dark:text-emerald-400/80"
                      : "text-muted-foreground",
                  )}
                >
                  {step.action.duration ?? "—"} {step.action.unit ?? "s"}
                </span>
              )}
              {step.action.type === "cleanup" && (
                <span
                  className={cn(
                    "font-mono text-xs",
                    isActive
                      ? "text-emerald-600/80 dark:text-emerald-400/80"
                      : "text-muted-foreground",
                  )}
                >
                  Remove current materials and replace with a fresh flask.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
