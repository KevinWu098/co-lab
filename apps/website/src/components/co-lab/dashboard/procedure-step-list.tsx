import { DropletsIcon, RefreshCwIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { computeAllSpins, type ProcedureStep, reagentLabels } from "@/lib/schemas/procedure";

const ACTION_META: Record<string, { label: string; icon: typeof DropletsIcon }> = {
  dispense: { label: "Dispense", icon: DropletsIcon },
  stir: { label: "Stir", icon: RefreshCwIcon },
  cleanup: { label: "Cleanup", icon: Trash2Icon },
};

export function ProcedureStepList({ steps }: { steps: ProcedureStep[] }) {
  const spinMap = useMemo(() => computeAllSpins(steps), [steps]);

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

        return (
          <div
            className="bg-background border-x border-t last:border-b"
            key={step.id}
          >
            <div className="flex items-center gap-2 px-3.5 py-2.5">
              <span className="text-muted-foreground w-5 text-left font-mono text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon className="text-muted-foreground size-3.5" />
              <span className="font-mono text-xs font-medium tracking-wider uppercase">
                {meta.label}
              </span>
              {step.action.type === "dispense" && step.action.reagent && (
                <span className="text-muted-foreground font-mono text-xs">
                  {reagentLabels[step.action.reagent].formula}
                </span>
              )}
            </div>

            {spins && spins.length > 0 && (
              <div className="border-t border-dashed px-3.5 py-2">
                {spins.map((spin, i) => (
                  <div
                    className="text-muted-foreground flex items-center gap-2 py-0.5"
                    key={`${spin.from}-${spin.to}-${i}`}
                  >
                    <RotateCcwIcon className="size-3 shrink-0" />
                    <span className="font-mono text-xs">
                      Spin {reagentLabels[spin.from].formula} &rarr;{" "}
                      {reagentLabels[spin.to].formula}
                      <span className="text-muted-foreground/50 ml-1">
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
                <span className="text-muted-foreground font-mono text-xs">
                  {step.action.amount ?? "—"} {step.action.unit ?? "mL"}
                  {step.action.reagent
                    ? ` of ${reagentLabels[step.action.reagent].name}`
                    : ""}
                </span>
              )}
              {step.action.type === "stir" && (
                <span className="text-muted-foreground font-mono text-xs">
                  {step.action.duration ?? "—"} {step.action.unit ?? "s"}
                </span>
              )}
              {step.action.type === "cleanup" && (
                <span className="text-muted-foreground font-mono text-xs">
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
