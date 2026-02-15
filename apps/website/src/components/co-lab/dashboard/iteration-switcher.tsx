"use client";

import {
  BotIcon,
  BotOffIcon,
  PlusIcon,
  SquareIcon,
  ZapIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import type { Experiment } from "@/components/dashboard/sidebar/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import { runProcedure } from "@/lib/hardware/procedure-runner";

interface IterationSwitcherProps {
  experiment: Experiment;
  chatVisible?: boolean;
  onToggleChat?: () => void;
}

export function IterationSwitcher({
  experiment,
  chatVisible = true,
  onToggleChat,
}: IterationSwitcherProps) {
  const iterations = experiment.iterations;
  const { updateExperiment } = useExperiments();
  const router = useRouter();
  const [selected, setSelected] = useState(iterations[0]?.id ?? "");

  // Hardware integration
  const { state: hwState, execution, sendCommand, waitForAck, setExecution, clearTelemetry } =
    useHardwareContext();
  const abortRef = useRef<AbortController | null>(null);

  const isRunning = execution.status === "running";

  const handleStartExperiment = useCallback(() => {
    if (isRunning) {
      // Abort the current run
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    const steps = experiment.procedure;
    if (!steps || steps.length === 0) return;

    clearTelemetry();
    abortRef.current = runProcedure(steps, {
      sendCommand,
      waitForAck,
      setExecution,
    });
  }, [isRunning, experiment.procedure, sendCommand, waitForAck, setExecution, clearTelemetry]);

  // Sync selection when iterations change (e.g. after setup confirm)
  useEffect(() => {
    if (iterations.length > 0 && !iterations.some((it) => it.id === selected)) {
      const last = iterations.at(-1);
      if (last) {
        setSelected(last.id);
      }
    }
  }, [iterations, selected]);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(experiment.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitTitle = () => {
    const trimmed = title.trim();
    const finalTitle = trimmed || "Untitled experiment";
    setTitle(finalTitle);
    setEditing(false);
    if (finalTitle !== experiment.title) {
      updateExperiment(experiment.id, { title: finalTitle });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {editing ? (
          <input
            className="flex h-9 max-w-56 items-center border bg-background px-3 font-medium text-sm outline-none focus:ring-1 focus:ring-ring"
            onBlur={commitTitle}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitTitle();
              }
              if (e.key === "Escape") {
                setTitle(experiment.title);
                setEditing(false);
              }
            }}
            ref={(el) => {
              (
                inputRef as React.MutableRefObject<HTMLInputElement | null>
              ).current = el;
              el?.focus();
            }}
            value={title}
          />
        ) : (
          <button
            className="flex h-9 max-w-56 cursor-text items-center border bg-background px-3 font-medium text-sm"
            onClick={() => setEditing(true)}
            type="button"
          >
            <span className="truncate">{experiment.title}</span>
          </button>
        )}

        {iterations.length > 0 && (
          <Select onValueChange={setSelected} value={selected}>
            <SelectTrigger className="rounded-l-none border-l-0 bg-background px-2 [&>span]:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iterations.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  Iteration {it.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex">
        {iterations.length > 0 && (
          <>
            <Button
              aria-label={isRunning ? "Stop experiment" : "Start experiment"}
              className={
                isRunning
                  ? "rounded-r-none border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700"
                  : "rounded-r-none border-green-600 bg-green-600 text-white hover:bg-green-700 hover:border-green-700"
              }
              disabled={!hwState.connected && !isRunning}
              onClick={handleStartExperiment}
              size="sm"
            >
              {isRunning ? (
                <>
                  <SquareIcon className="size-3.5 fill-current" />
                  Step {execution.currentStep + 1}/{execution.totalSteps}
                </>
              ) : (
                <>
                  {execution.status === "completed" ? (
                    <ZapIcon className="size-4" />
                  ) : (
                    <ZapIcon className="size-4" />
                  )}
                  {execution.status === "completed"
                    ? "Re-run"
                    : execution.status === "error"
                      ? "Retry"
                      : "Start Experiment"}
                </>
              )}
            </Button>
            <Button
              className="rounded-none border-l-0"
              onClick={() =>
                router.push(`/dashboard/experiment/${experiment.id}/iterate`)
              }
              size="sm"
              variant="outline"
            >
              <PlusIcon />
              New iteration
            </Button>
          </>
        )}
        <Button
          aria-label={chatVisible ? "Hide chat" : "Show chat"}
          className={`cursor-pointer ${iterations.length > 0 ? "rounded-l-none border-l-0" : ""}`}
          onClick={onToggleChat}
          size="sm"
          variant="outline"
        >
          {chatVisible ? (
            <BotIcon className="size-4" />
          ) : (
            <BotOffIcon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
