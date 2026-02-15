import {
  CameraIcon,
  ChartLineIcon,
  ClipboardListIcon,
  DropletsIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo } from "react";
import { CameraPanel } from "@/components/co-lab/dashboard/camera-panel";
import { GraphPanel } from "@/components/co-lab/dashboard/graph-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  computeAllSpins,
  type ProcedureStep,
  reagentLabels,
} from "@/lib/schemas/procedure";

const ACTION_META: Record<
  string,
  { label: string; icon: typeof DropletsIcon }
> = {
  dispense: { label: "Dispense", icon: DropletsIcon },
  stir: { label: "Stir", icon: RefreshCwIcon },
  cleanup: { label: "Cleanup", icon: Trash2Icon },
};

export function ContentPanels({ procedure }: { procedure?: ProcedureStep[] }) {
  const steps = procedure ?? [];
  const spinMap = useMemo(() => computeAllSpins(steps), [steps]);

  return (
    <Accordion
      className="flex min-h-0 flex-1 flex-col"
      defaultValue="procedure"
      type="single"
    >
      <AccordionItem
        className="flex min-h-0 flex-col rounded-t-md border border-b-0 bg-background data-[state=open]:flex-1"
        value="procedure"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            Experiment Procedure
            {steps.length > 0 && (
              <span className="font-mono font-normal text-muted-foreground/60 text-xs">
                {steps.length} {steps.length === 1 ? "step" : "steps"}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="flex min-h-0 flex-1 border-t">
            {steps.length === 0 ? (
              <div className="flex flex-1 items-center justify-center font-mono text-muted-foreground text-sm">
                No procedure defined
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {steps.map((step, index) => {
                  const meta =
                    ACTION_META[step.action.type] ?? ACTION_META.cleanup;
                  const Icon = meta.icon;
                  const spins = spinMap.get(step.id);

                  return (
                    <div
                      className="border-x border-t bg-background first:rounded-t last:rounded-b last:border-b"
                      key={step.id}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className="w-5 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Icon className="size-3.5 text-muted-foreground" />
                        <span className="font-medium font-mono text-xs uppercase tracking-wider">
                          {meta.label}
                        </span>
                        {step.action.type === "dispense" &&
                          step.action.reagent && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {reagentLabels[step.action.reagent].formula}
                            </span>
                          )}
                      </div>

                      {spins && spins.length > 0 && (
                        <div className="border-t border-dashed px-3 py-1.5">
                          {spins.map((spin, i) => (
                            <div
                              className="flex items-center gap-2 py-0.5 text-muted-foreground"
                              key={`${spin.from}-${spin.to}-${i}`}
                            >
                              <RotateCcwIcon className="size-3 shrink-0" />
                              <span className="font-mono text-[11px]">
                                Spin {reagentLabels[spin.from].formula} &rarr;{" "}
                                {reagentLabels[spin.to].formula}
                                <span className="ml-1 text-muted-foreground/50">
                                  ({spin.degrees > 0 ? "+" : ""}
                                  {spin.degrees}&deg;)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-t px-3 py-2">
                        {step.action.type === "dispense" && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {step.action.amount ?? "—"}{" "}
                            {step.action.unit ?? "mL"}
                            {step.action.reagent
                              ? ` of ${reagentLabels[step.action.reagent].name}`
                              : ""}
                          </span>
                        )}
                        {step.action.type === "stir" && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {step.action.duration ?? "—"}{" "}
                            {step.action.unit ?? "s"}
                          </span>
                        )}
                        {step.action.type === "cleanup" && (
                          <span className="font-mono text-[11px] text-muted-foreground">
                            Remove current materials and replace with a fresh
                            flask.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        className="flex min-h-0 flex-col border border-b-0 bg-background data-[state=open]:flex-1"
        value="cameras"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <CameraIcon className="size-4 text-muted-foreground" />
            Cameras
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <CameraPanel />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        className="flex min-h-0 flex-col rounded-b-md border bg-background data-[state=open]:flex-1"
        value="graphs"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ChartLineIcon className="size-4 text-muted-foreground" />
            Graphs
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <GraphPanel />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
