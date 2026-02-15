"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  BotIcon,
  ClipboardListIcon,
  DropletsIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  Trash2Icon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProcedureEditor } from "@/components/co-lab/dashboard/procedure-editor";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  computeAllSpins,
  type ProcedureStep,
  reagentLabels,
} from "@/lib/schemas/procedure";

const ease = [0.25, 0.1, 0.25, 1] as const;

const ACTION_META: Record<
  string,
  { label: string; icon: typeof DropletsIcon }
> = {
  dispense: { label: "Dispense", icon: DropletsIcon },
  stir: { label: "Stir", icon: RefreshCwIcon },
  cleanup: { label: "Cleanup", icon: Trash2Icon },
};

export default function IteratePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { experiments, updateExperiment } = useExperiments();
  const experiment = experiments.find((e) => e.id === slug);

  const [newSteps, setNewSteps] = useState<ProcedureStep[]>([]);

  const previousSteps = experiment?.procedure ?? [];
  const previousSpinMap = useMemo(
    () => computeAllSpins(previousSteps),
    [previousSteps],
  );

  useEffect(() => {
    if (!experiment) {
      router.replace("/dashboard");
    }
  }, [experiment, router]);

  const handleConfirm = useCallback(() => {
    if (!experiment) return;

    const nextNumber = experiment.iterations.length + 1;
    const newIteration = {
      id: crypto.randomUUID().slice(0, 8),
      number: nextNumber,
      summary: `Iteration ${nextNumber}`,
      createdAt: new Date().toISOString(),
    };

    updateExperiment(experiment.id, {
      iterations: [...experiment.iterations, newIteration],
      procedure: newSteps,
    });

    router.push(`/dashboard/experiment/${experiment.id}`);
  }, [experiment, newSteps, updateExperiment, router]);

  if (!experiment) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 pr-4">
      {/* Header */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push(`/dashboard/experiment/${experiment.id}`)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="font-medium font-mono text-sm">
              {experiment.title}
            </h1>
            <p className="font-mono text-muted-foreground text-xs">
              New iteration &mdash; comparing against iteration{" "}
              {experiment.iterations.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              router.push(`/dashboard/experiment/${experiment.id}`)
            }
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} size="sm">
            Confirm iteration
          </Button>
        </div>
      </motion.div>

      {/* Side-by-side procedure panels */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-0 flex-1 gap-4"
        initial={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 0.05, ease }}
      >
        {/* Left: Previous procedure (read-only) */}
        <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            <span className="font-medium font-mono text-sm">
              Iteration {experiment.iterations.length}
            </span>
            <span className="font-mono font-normal text-muted-foreground/60 text-xs">
              {previousSteps.length}{" "}
              {previousSteps.length === 1 ? "step" : "steps"}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {previousSteps.length === 0 ? (
              <div className="flex flex-1 items-center justify-center font-mono text-muted-foreground text-sm">
                No procedure defined
              </div>
            ) : (
              previousSteps.map((step, index) => {
                const meta =
                  ACTION_META[step.action.type] ?? ACTION_META.cleanup;
                const Icon = meta.icon;
                const spins = previousSpinMap.get(step.id);

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
                          {step.action.amount ?? "—"} {step.action.unit ?? "mL"}
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
              })
            )}
          </div>
        </div>

        {/* Right: New procedure (editable) */}
        <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            <span className="font-medium font-mono text-sm">
              Iteration {experiment.iterations.length + 1}
            </span>
            <span className="font-mono font-normal text-muted-foreground/60 text-xs">
              new
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ProcedureEditor
              initialSteps={
                previousSteps.length > 0
                  ? previousSteps.map((s) => s.action as import("@/lib/schemas/procedure").Action)
                  : null
              }
              onChange={setNewSteps}
            />
          </div>
        </div>
      </motion.div>

      {/* Agent context (carried over) */}
      {(experiment.reasoning || experiment.goals) && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.35, delay: 0.1, ease }}
        >
          <Accordion className="flex flex-col" type="single">
            {experiment.goals && experiment.goals.length > 0 && (
              <AccordionItem
                className="flex flex-col rounded-t-md border border-b-0 bg-background data-[state=open]:flex-1"
                value="goals"
              >
                <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
                  <span className="flex items-center gap-2">
                    <BotIcon className="size-4 text-muted-foreground" />
                    Agent Goals
                    <span className="font-mono font-normal text-muted-foreground/60 text-xs">
                      {experiment.goals.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="border-t p-4">
                    <ol className="list-inside list-decimal space-y-1">
                      {experiment.goals.map((goal) => (
                        <li
                          className="font-mono text-muted-foreground text-sm leading-relaxed"
                          key={goal}
                        >
                          {goal}
                        </li>
                      ))}
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {experiment.reasoning && (
              <AccordionItem
                className="flex flex-col rounded-b-md border bg-background data-[state=open]:flex-1"
                value="trace"
              >
                <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
                  <span className="flex items-center gap-2">
                    <ScrollTextIcon className="size-4 text-muted-foreground" />
                    Agent Trace
                  </span>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="max-h-48 overflow-y-auto border-t p-4">
                    <p className="whitespace-pre-wrap font-mono text-muted-foreground text-sm leading-relaxed">
                      {experiment.reasoning}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </motion.div>
      )}
    </div>
  );
}
