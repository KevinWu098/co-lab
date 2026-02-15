"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  DropletsIcon,
  FileTextIcon,
  LightbulbIcon,
  LoaderIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PDF_EXT_RE = /\.pdf$/i;

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  type Action,
  computeAllSpins,
  type DraftAction,
  type DraftDispense,
  type DraftStir,
  type ProcedureStep,
  type Reagent,
  reagentLabels,
  reagents,
  type SpinStep,
  type TimeUnit,
  timeUnits,
  type VolumeUnit,
  volumeUnits,
} from "@/lib/schemas/procedure";

// ── Palette config ─────────────────────────────────────────────────────────

const ACTION_PALETTE = [
  {
    type: "dispense" as const,
    label: "Dispense",
    icon: DropletsIcon,
  },
  {
    type: "stir" as const,
    label: "Stir",
    icon: RefreshCwIcon,
  },
  {
    type: "cleanup" as const,
    label: "Cleanup",
    icon: Trash2Icon,
  },
];

function createDefaultAction(type: DraftAction["type"]): DraftAction {
  switch (type) {
    case "dispense":
      return { type: "dispense", unit: "mL" };
    case "stir":
      return { type: "stir", unit: "s" };
    default:
      return { type: "cleanup" };
  }
}

// ── Main editor ────────────────────────────────────────────────────────────

export interface ProcedureSuggestion {
  title: string;
  description: string;
}

export function ProcedureEditor({
  sourceFile,
  initialSteps,
  onChange,
  showValidation,
  onAgentSubmit,
  agentLoading,
  pendingAgentPrompt,
  onPendingAgentPromptConsumed,
  suggestions,
  suggestionsLoading,
  onSuggestionClick,
}: {
  sourceFile?: File | null;
  initialSteps?: Action[] | null;
  onChange?: (steps: ProcedureStep[]) => void;
  showValidation?: boolean;
  onAgentSubmit?: (prompt: string) => void;
  agentLoading?: boolean;
  /** When set, autofills the agent prompt textarea and submits. */
  pendingAgentPrompt?: string;
  /** Called after the pending prompt has been consumed. */
  onPendingAgentPromptConsumed?: () => void;
  suggestions?: ProcedureSuggestion[];
  suggestionsLoading?: boolean;
  onSuggestionClick?: (suggestion: ProcedureSuggestion) => void;
}) {
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const prevInitialStepsRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [isDragging, setIsDragging] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Autofill + submit from parent via pendingAgentPrompt
  useEffect(() => {
    if (pendingAgentPrompt && onAgentSubmit && !agentLoading) {
      setAgentPrompt(pendingAgentPrompt);
      onAgentSubmit(pendingAgentPrompt);
      onPendingAgentPromptConsumed?.();
    }
  }, [pendingAgentPrompt, onAgentSubmit, agentLoading, onPendingAgentPromptConsumed]);

  // Source document preview URL
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const isPdf = sourceFile?.type === "application/pdf" || PDF_EXT_RE.test(sourceFile?.name ?? "");

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  // Populate steps from agent output (reactive — updates when initialSteps changes)
  useEffect(() => {
    if (!initialSteps) return;
    const serialized = JSON.stringify(initialSteps);
    if (serialized !== prevInitialStepsRef.current) {
      prevInitialStepsRef.current = serialized;
      setSteps(
        initialSteps.map((action) => ({
          id: nanoid(8),
          action,
        })),
      );
    }
  }, [initialSteps]);

  // Notify parent when steps change
  useEffect(() => {
    onChangeRef.current?.(steps);
  }, [steps]);

  const spinMap = useMemo(() => computeAllSpins(steps), [steps]);

  const addStep = useCallback((type: DraftAction["type"]) => {
    setSteps((prev) => [...prev, { id: nanoid(8), action: createDefaultAction(type) }]);
  }, []);

  const removeStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStep = useCallback((id: string, action: DraftAction) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, action } : s)));
  }, []);

  const moveStep = useCallback((id: string, direction: -1 | 1) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) {
        return prev;
      }
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[newIdx];
      next[newIdx] = temp;
      return next;
    });
  }, []);

  // ── DnD: palette → list ──

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("text/plain", type);
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const type = e.dataTransfer.getData("text/plain") as DraftAction["type"];
      if (["dispense", "stir", "cleanup"].includes(type)) {
        addStep(type);
      }
    },
    [addStep],
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {/* Source document bar (pinned above scroll) */}
        {sourceFile && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="bg-muted/30 hover:bg-muted/50 flex shrink-0 cursor-pointer items-center gap-2 border-b px-4 py-2 transition-colors"
                type="button"
              >
                <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
                <span className="flex-1 truncate text-left font-mono text-xs">
                  {sourceFile.name}
                </span>
                <span className="text-muted-foreground/60 text-xs tracking-wider uppercase">
                  Source
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="flex h-[80vh] max-w-2xl flex-col gap-0 p-0">
              <DialogHeader className="shrink-0 border-b px-4 py-3">
                <DialogTitle className="font-mono text-sm font-medium">
                  {sourceFile.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                {isPdf && sourceUrl ? (
                  <iframe
                    className="flex-1"
                    src={`${sourceUrl}#toolbar=0`}
                    title="Source procedure"
                  />
                ) : (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center font-mono text-sm">
                    Preview not available for this file type
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Step list ── */}
        {/* biome-ignore lint/a11y/useSemanticElements: drag-and-drop target needs div for flex layout */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: drag-and-drop event handlers */}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          ref={listRef}
          role="list"
        >
          {steps.length === 0 ? (
            <div
              className={`flex flex-1 flex-col items-center justify-center gap-2 border border-dashed transition-colors ${
                isDragging ? "border-foreground/30 bg-muted/30" : "border-transparent"
              } m-3`}
            >
              <p className="text-muted-foreground font-mono text-sm">
                {isDragging ? "Drop here" : "No steps yet"}
              </p>
              {!isDragging && (
                <p className="text-muted-foreground/60 text-xs">
                  Drag an action from the palette or click to add.
                </p>
              )}
            </div>
          ) : (
            <div className="flex h-0 flex-col p-4">
              {steps.map((step, index) => (
                <StepCard
                  index={index}
                  key={step.id}
                  onMoveDown={() => moveStep(step.id, 1)}
                  onMoveUp={() => moveStep(step.id, -1)}
                  onRemove={() => removeStep(step.id)}
                  onUpdate={(action) => updateStep(step.id, action)}
                  showValidation={showValidation}
                  spinSteps={spinMap.get(step.id)}
                  step={step}
                  totalSteps={steps.length}
                />
              ))}

              {/* Drop hint at bottom */}
              <div
                className={`mt-0 flex items-center justify-center border border-dashed transition-colors ${
                  isDragging
                    ? "border-foreground/30 bg-muted/30 h-10"
                    : "border-muted-foreground/20 text-muted-foreground/30 h-0"
                }`}
              >
                {isDragging && (
                  <span className="text-muted-foreground font-mono text-xs">Drop here</span>
                )}
              </div>

              {/* what the hell, sure */}
              <div className="invisible h-4 w-full">spacer</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action palette ── */}
      <div className="flex w-xs shrink-0 flex-col gap-2 overflow-y-auto border-l p-4">
        <span className="text-muted-foreground px-1 font-mono text-xs tracking-widest uppercase">
          Actions
        </span>
        {ACTION_PALETTE.map((item) => (
          <button
            className="bg-background hover:border-foreground/25 hover:bg-muted/30 flex cursor-grab flex-col items-center gap-1.5 border p-3 transition-colors active:cursor-grabbing"
            draggable
            key={item.type}
            onClick={() => addStep(item.type)}
            onDragEnd={handleDragEnd}
            onDragStart={(e) => handleDragStart(e, item.type)}
            type="button"
          >
            <item.icon className="text-muted-foreground size-3.5" />
            <span className="font-mono text-xs font-medium">{item.label}</span>
          </button>
        ))}

        {/* ── Agent ── */}
        {onAgentSubmit && (
          <>
            <div className="my-1 border-t" />
            <span className="text-muted-foreground px-1 font-mono text-xs tracking-widest uppercase">
              Agent
            </span>
            <div className="flex flex-col gap-2">
              <textarea
                className="bg-background text-foreground placeholder:text-muted-foreground/50 focus:ring-foreground/50 min-h-[80px] resize-none border p-2 font-mono text-xs focus:ring-1 focus:outline-none disabled:opacity-50"
                disabled={agentLoading}
                onChange={(e) => setAgentPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.metaKey || e.ctrlKey) &&
                    agentPrompt.trim() &&
                    !agentLoading
                  ) {
                    onAgentSubmit(agentPrompt.trim());
                  }
                }}
                placeholder="Describe changes to the procedure..."
                value={agentPrompt}
              />
              <Button
                className="w-full gap-1.5"
                disabled={!agentPrompt.trim() || agentLoading}
                onClick={() => onAgentSubmit(agentPrompt.trim())}
                size="sm"
                variant="outline"
              >
                {agentLoading ? (
                  <>
                    <LoaderIcon className="size-3 animate-spin" />
                    <span className="font-mono text-xs">Processing</span>
                  </>
                ) : (
                  <>
                    <SendIcon className="size-3" />
                    <span className="font-mono text-xs">Generate</span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* ── Suggestions ── */}
        {(suggestionsLoading || (suggestions && suggestions.length > 0)) && (
          <>
            <div className="my-1 border-t" />
            <span className="px-1 font-mono text-xs tracking-widest text-[#D97757] uppercase">
              Suggestions
            </span>
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 border border-dashed border-[#D97757]/40 bg-[#D97757]/5 px-3 py-2.5">
                <LoaderIcon className="size-3 animate-spin text-[#D97757]" />
                <span className="font-mono text-xs text-[#D97757]/70">Thinking&hellip;</span>
              </div>
            ) : (
              suggestions?.map((s) => (
                <SuggestionCard
                  key={s.title}
                  onClick={() => onSuggestionClick?.(s)}
                  suggestion={s}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: ProcedureSuggestion;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col border border-dashed border-[#D97757]/40 bg-[#D97757]/5 transition-colors hover:border-[#D97757]/60 hover:bg-[#D97757]/10">
      <button
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-left"
        onClick={onClick}
        type="button"
      >
        <LightbulbIcon className="size-3 shrink-0 text-[#D97757]" />
        <span className="flex-1 font-mono text-xs leading-snug font-medium text-[#D97757]">
          {suggestion.title}
        </span>
      </button>
      <div className="border-t border-dashed border-[#D97757]/20">
        <button
          className="flex w-full cursor-pointer items-center gap-1 px-3 py-1 text-left"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          type="button"
        >
          <ChevronDownIcon
            className={`size-2.5 text-[#D97757]/50 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <span className="font-mono text-xs text-[#D97757]/50">
            {expanded ? "Hide" : "Details"}
          </span>
        </button>
        {expanded && (
          <p className="px-3 pb-2.5 font-mono text-xs leading-relaxed text-[#D97757]/70">
            {suggestion.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Step card ──────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  totalSteps,
  spinSteps,
  showValidation,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ProcedureStep;
  index: number;
  totalSteps: number;
  spinSteps?: SpinStep[];
  showValidation?: boolean;
  onUpdate: (action: DraftAction) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { action } = step;
  const palette = ACTION_PALETTE.find((a) => a.type === action.type) ?? ACTION_PALETTE[0];
  const Icon = palette.icon;

  return (
    <div className="group bg-background border-x border-t last:border-b">
      {/* Header */}
      <div className="bg-muted/60 group-hover:bg-muted/80 flex items-center gap-2 px-3.5 py-2.5 transition-colors">
        <span className="text-muted-foreground w-5 text-left font-mono text-xs tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Icon className="text-muted-foreground size-3.5" />
        <span className="font-mono text-xs font-medium tracking-wider uppercase">
          {palette.label}
        </span>
        {action.type === "dispense" && action.reagent && (
          <span className="text-muted-foreground font-mono text-xs">
            {reagentLabels[action.reagent].formula}
          </span>
        )}

        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            className="size-6"
            disabled={index === 0}
            onClick={onMoveUp}
            size="icon"
            variant="ghost"
          >
            <ChevronUpIcon className="size-3" />
          </Button>
          <Button
            className="size-6"
            disabled={index === totalSteps - 1}
            onClick={onMoveDown}
            size="icon"
            variant="ghost"
          >
            <ChevronDownIcon className="size-3" />
          </Button>
          <Button className="size-6" onClick={onRemove} size="icon" variant="ghost">
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Spin sub-steps (computed, non-editable) */}
      {spinSteps && spinSteps.length > 0 && (
        <div className="border-t border-dashed px-3.5 py-2">
          {spinSteps.map((spin, i) => (
            <div
              className="text-muted-foreground flex items-center gap-2 py-0.5"
              key={`${spin.from}-${spin.to}-${i}`}
            >
              <RotateCcwIcon className="size-3 shrink-0" />
              <span className="font-mono text-xs">
                Spin {reagentLabels[spin.from].formula} &rarr; {reagentLabels[spin.to].formula}
                <span className="text-muted-foreground/50 ml-1">
                  ({spin.degrees > 0 ? "+" : ""}
                  {spin.degrees}&deg;)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fields */}
      <div className="border-t px-3.5 py-2.5">
        {action.type === "dispense" && (
          <DispenseFields action={action} onUpdate={onUpdate} showValidation={showValidation} />
        )}
        {action.type === "stir" && (
          <StirFields action={action} onUpdate={onUpdate} showValidation={showValidation} />
        )}
        {action.type === "cleanup" && (
          <p className="text-muted-foreground font-mono text-xs">
            Remove current materials and replace with a fresh flask.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared field styles ────────────────────────────────────────────────────

const selectBase =
  "bg-background text-foreground border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-foreground/50";
const inputBase =
  "bg-background text-foreground w-16 border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const fieldLabelClass = "text-muted-foreground font-mono text-xs uppercase tracking-wider";
const errorClass = "border-red-400 ring-1 ring-red-400/30";

// ── Dispense fields ────────────────────────────────────────────────────────

function DispenseFields({
  action,
  onUpdate,
  showValidation,
}: {
  action: DraftDispense;
  onUpdate: (action: DraftAction) => void;
  showValidation?: boolean;
}) {
  const reagentErr = showValidation && action.reagent == null;
  const amountErr = showValidation && action.amount == null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className={fieldLabelClass}>Reagent</span>
        <select
          className={`${selectBase} ${reagentErr ? errorClass : ""}`}
          onChange={(e) =>
            onUpdate({
              ...action,
              reagent: (e.target.value || undefined) as Reagent | undefined,
            })
          }
          value={action.reagent ?? ""}
        >
          <option value="">&mdash;</option>
          {reagents.map((r) => (
            <option key={r} value={r}>
              {reagentLabels[r].formula}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <span className={fieldLabelClass}>Amount</span>
        <input
          className={`${inputBase} ${amountErr ? errorClass : ""}`}
          min={0}
          onChange={(e) =>
            onUpdate({
              ...action,
              amount: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="0"
          step="any"
          type="number"
          value={action.amount ?? ""}
        />
        <select
          className={selectBase}
          onChange={(e) => onUpdate({ ...action, unit: e.target.value as VolumeUnit })}
          value={action.unit ?? "mL"}
        >
          {volumeUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Stir fields ────────────────────────────────────────────────────────────

function StirFields({
  action,
  onUpdate,
  showValidation,
}: {
  action: DraftStir;
  onUpdate: (action: DraftAction) => void;
  showValidation?: boolean;
}) {
  const durationErr = showValidation && action.duration == null;

  return (
    <div className="flex items-center gap-x-3">
      <div className="flex items-center gap-1.5">
        <span className={fieldLabelClass}>Duration</span>
        <input
          className={`${inputBase} ${durationErr ? errorClass : ""}`}
          min={0}
          onChange={(e) =>
            onUpdate({
              ...action,
              duration: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="0"
          step="any"
          type="number"
          value={action.duration ?? ""}
        />
        <select
          className={selectBase}
          onChange={(e) => onUpdate({ ...action, unit: e.target.value as TimeUnit })}
          value={action.unit ?? "s"}
        >
          {timeUnits.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
