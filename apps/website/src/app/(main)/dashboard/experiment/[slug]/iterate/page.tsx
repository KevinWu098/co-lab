"use client";

import { motion } from "framer-motion";
import { ArrowLeftIcon, BotIcon, ClipboardListIcon, ScrollTextIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProcedureDiff } from "@/components/co-lab/dashboard/procedure-diff";
import {
  ProcedureEditor,
  type ProcedureSuggestion,
} from "@/components/co-lab/dashboard/procedure-editor";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import type { Action, AgentProcedureResult, ProcedureStep } from "@/lib/schemas/procedure";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function IteratePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { experiments, updateExperiment } = useExperiments();
  const { setExecution } = useHardwareContext();
  const experiment = experiments.find((e) => e.id === slug);

  const [newSteps, setNewSteps] = useState<ProcedureStep[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSteps, setAgentSteps] = useState<Action[] | null>(null);

  const [suggestions, setSuggestions] = useState<ProcedureSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsRequested = useRef(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>();

  const handleSuggestionClick = useCallback((suggestion: ProcedureSuggestion) => {
    setPendingPrompt(suggestion.description);
    setSuggestions([]);
  }, []);

  const previousSteps = experiment?.procedure ?? [];

  const handleAgentSubmit = useCallback(
    async (prompt: string) => {
      if (!experiment) return;
      setAgentLoading(true);
      try {
        const res = await fetch("/api/procedure/iterate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            previousProcedure: previousSteps.map((s) => s.action),
            goals: experiment.goals ?? [],
          }),
        });
        if (!res.ok) throw new Error(res.statusText);
        const result: AgentProcedureResult = await res.json();
        setAgentSteps(result.steps);
      } catch (err) {
        console.error("[iterate] agent error:", err);
      } finally {
        setAgentLoading(false);
      }
    },
    [experiment, previousSteps],
  );

  useEffect(() => {
    if (!experiment) {
      router.replace("/dashboard");
    }
  }, [experiment, router]);

  // Fetch AI suggestions on mount
  useEffect(() => {
    if (!experiment || suggestionsRequested.current) return;
    if (!experiment.procedure?.length) return;
    suggestionsRequested.current = true;
    setSuggestionsLoading(true);

    fetch("/api/procedure/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        procedure: experiment.procedure.map((s) => s.action),
        goals: experiment.goals ?? [],
        reasoning: experiment.reasoning ?? "",
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data) => setSuggestions(data.suggestions ?? []))
      .catch((err) => console.error("[iterate] suggestions error:", err))
      .finally(() => setSuggestionsLoading(false));
  }, [experiment]);

  const [showValidation, setShowValidation] = useState(false);

  const procedureValid = useMemo(() => {
    if (newSteps.length === 0) return false;
    return newSteps.every(({ action }) => {
      switch (action.type) {
        case "dispense":
          return action.reagent != null && action.amount != null && action.unit != null;
        case "stir":
          return action.duration != null && action.unit != null;
        case "cleanup":
          return true;
        default:
          return false;
      }
    });
  }, [newSteps]);

  const handleConfirm = useCallback(() => {
    if (!experiment) return;
    if (!procedureValid) {
      setShowValidation(true);
      return;
    }

    const nextNumber = experiment.iterations.length + 1;
    const newIteration = {
      id: crypto.randomUUID().slice(0, 8),
      number: nextNumber,
      summary: `Iteration ${nextNumber}`,
      createdAt: new Date().toISOString(),
    };

    updateExperiment(experiment.id, {
      iterations: [newIteration, ...experiment.iterations],
      procedure: newSteps,
    });

    // Reset execution so the button shows "Start Experiment" instead of "Re-run"
    setExecution({
      status: "idle",
      currentStep: 0,
      totalSteps: 0,
      error: null,
    });

    router.push(`/dashboard/experiment/${experiment.id}`);
  }, [experiment, procedureValid, newSteps, updateExperiment, setExecution, router]);

  if (!experiment) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4 pr-4">
      {/* Header */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="bg-background flex items-center justify-between border px-4 py-3"
        initial={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="flex items-center gap-3">
          <Button
            className="size-7"
            onClick={() => router.push(`/dashboard/experiment/${experiment.id}`)}
            size="icon"
            variant="ghost"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="font-mono text-sm font-medium">{experiment.title}</h1>
            <p className="text-muted-foreground font-mono text-xs">
              New iteration &mdash; comparing against iteration {experiment.iterations.length}
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <Button
            className="rounded-r-none"
            onClick={() => router.push(`/dashboard/experiment/${experiment.id}`)}
            size="sm"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="rounded-l-none border-l-0"
            disabled={agentLoading}
            onClick={handleConfirm}
            size="sm"
          >
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
        <div className="bg-background flex min-h-0 w-1/4 flex-col border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardListIcon className="text-muted-foreground size-4" />
            <span className="font-mono text-sm font-medium">
              Iteration {experiment.iterations.length}
            </span>
            <span className="text-muted-foreground/60 font-mono text-xs font-normal">
              {previousSteps.length} {previousSteps.length === 1 ? "step" : "steps"}
            </span>
          </div>
          <ProcedureDiff previousSteps={previousSteps} newSteps={newSteps} />
        </div>

        {/* Right: New procedure (editable) */}
        <div className="bg-background flex min-h-0 w-3/4 flex-col border">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardListIcon className="text-muted-foreground size-4" />
            <span className="font-mono text-sm font-medium">
              Iteration {experiment.iterations.length + 1}
            </span>
            <span className="text-muted-foreground/60 font-mono text-xs font-normal">new</span>
          </div>
          <div className="h-0 flex-1 overflow-hidden">
            <ProcedureEditor
              agentLoading={agentLoading}
              initialSteps={agentSteps}
              onAgentSubmit={handleAgentSubmit}
              onChange={setNewSteps}
              pendingAgentPrompt={pendingPrompt}
              onPendingAgentPromptConsumed={() => setPendingPrompt(undefined)}
              showValidation={showValidation}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              onSuggestionClick={handleSuggestionClick}
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
          <Accordion className="flex flex-col" collapsible type="single">
            {experiment.goals && experiment.goals.length > 0 && (
              <AccordionItem
                className="bg-background flex flex-col border border-b-0 data-[state=open]:flex-1"
                value="goals"
              >
                <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <BotIcon className="text-muted-foreground size-4" />
                    Agent Goals
                    <span className="text-muted-foreground/60 font-mono text-xs font-normal">
                      {experiment.goals.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="border-t p-4">
                    <ol className="list-inside list-decimal space-y-1">
                      {experiment.goals.map((goal) => (
                        <li
                          className="text-muted-foreground font-mono text-sm leading-relaxed"
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
                className="bg-background flex flex-col border data-[state=open]:flex-1"
                value="trace"
              >
                <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
                  <span className="flex items-center gap-2">
                    <ScrollTextIcon className="text-muted-foreground size-4" />
                    Agent Trace
                  </span>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <div className="max-h-48 overflow-y-auto border-t p-4">
                    <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
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
