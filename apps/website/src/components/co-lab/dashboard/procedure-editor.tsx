"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  DropletsIcon,
  FileTextIcon,
  RefreshCwIcon,
  RotateCcwIcon,
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

export function ProcedureEditor({
  sourceFile,
  initialSteps,
}: {
  sourceFile?: File | null;
  initialSteps?: Action[] | null;
}) {
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const initializedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Source document preview URL
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const isPdf =
    sourceFile?.type === "application/pdf" ||
    PDF_EXT_RE.test(sourceFile?.name ?? "");

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

  // Populate steps from agent output
  useEffect(() => {
    if (initialSteps && !initializedRef.current) {
      initializedRef.current = true;
      setSteps(
        initialSteps.map((action) => ({
          id: nanoid(8),
          action,
        }))
      );
    }
  }, [initialSteps]);

  const spinMap = useMemo(() => computeAllSpins(steps), [steps]);

  const addStep = useCallback((type: DraftAction["type"]) => {
    setSteps((prev) => [
      ...prev,
      { id: nanoid(8), action: createDefaultAction(type) },
    ]);
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
    [addStep]
  );

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {/* Source document bar (pinned above scroll) */}
        {sourceFile && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="flex shrink-0 cursor-pointer items-center gap-2 border-b bg-muted/30 px-4 py-2 transition-colors hover:bg-muted/50"
                type="button"
              >
                <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-left font-mono text-xs">
                  {sourceFile.name}
                </span>
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                  Source
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="flex h-[80vh] max-w-2xl flex-col gap-0 p-0">
              <DialogHeader className="shrink-0 border-b px-4 py-3">
                <DialogTitle className="font-medium font-mono text-sm">
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
                  <div className="flex flex-1 items-center justify-center font-mono text-muted-foreground text-sm">
                    Preview not available for this file type
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Step list ── */}
        {/* biome-ignore lint/a11y/useSemanticElements: drop target region */}
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: drag-and-drop target */}
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
                isDragging
                  ? "border-foreground/30 bg-muted/30"
                  : "border-transparent"
              } m-3`}
            >
              <p className="font-mono text-muted-foreground text-sm">
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
                  spinSteps={spinMap.get(step.id)}
                  step={step}
                  totalSteps={steps.length}
                />
              ))}

              {/* Drop hint at bottom */}
              <div
                className={`mt-0 flex items-center justify-center border border-dashed transition-colors ${
                  isDragging
                    ? "h-10 border-foreground/30 bg-muted/30"
                    : "h-0 border-muted-foreground/20 text-muted-foreground/30"
                }`}
              >
                {isDragging && (
                  <span className="font-mono text-muted-foreground text-xs">
                    Drop here
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action palette ── */}
      <div className="flex w-md shrink-0 flex-col gap-2 border-l p-4">
        <span className="px-1 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          Actions
        </span>
        {ACTION_PALETTE.map((item) => (
          <button
            className="flex cursor-grab flex-col items-center gap-1.5 border bg-background p-3 transition-colors hover:border-foreground/25 hover:bg-muted/30 active:cursor-grabbing"
            draggable
            key={item.type}
            onClick={() => addStep(item.type)}
            onDragEnd={handleDragEnd}
            onDragStart={(e) => handleDragStart(e, item.type)}
            type="button"
          >
            <item.icon className="size-3.5 text-muted-foreground" />
            <span className="font-medium font-mono text-[11px]">
              {item.label}
            </span>
          </button>
        ))}
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
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ProcedureStep;
  index: number;
  totalSteps: number;
  spinSteps?: SpinStep[];
  onUpdate: (action: DraftAction) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { action } = step;
  const palette =
    ACTION_PALETTE.find((a) => a.type === action.type) ?? ACTION_PALETTE[0];
  const Icon = palette.icon;

  return (
    <div className="group border-x border-t bg-background first:rounded-t last:rounded-b last:border-b">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 transition-colors group-hover:bg-muted/40">
        <span className="w-5 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Icon className="size-3.5 text-muted-foreground" />
        <span className="font-medium font-mono text-xs uppercase tracking-wider">
          {palette.label}
        </span>
        {action.type === "dispense" && action.reagent && (
          <span className="font-mono text-[11px] text-muted-foreground">
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
          <Button
            className="size-6"
            onClick={onRemove}
            size="icon"
            variant="ghost"
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Spin sub-steps (computed, non-editable) */}
      {spinSteps && spinSteps.length > 0 && (
        <div className="border-t border-dashed px-3 py-1.5">
          {spinSteps.map((spin, i) => (
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

      {/* Fields */}
      <div className="border-t px-3 py-2.5">
        {action.type === "dispense" && (
          <DispenseFields action={action} onUpdate={onUpdate} />
        )}
        {action.type === "stir" && (
          <StirFields action={action} onUpdate={onUpdate} />
        )}
        {action.type === "cleanup" && (
          <p className="font-mono text-[11px] text-muted-foreground">
            Remove current materials and replace with a fresh flask.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Shared field styles ────────────────────────────────────────────────────

const selectClass =
  "bg-background text-foreground border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-foreground/50";
const inputClass =
  "bg-background text-foreground w-16 border px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-foreground/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const fieldLabelClass =
  "text-muted-foreground font-mono text-[10px] uppercase tracking-wider";

// ── Dispense fields ────────────────────────────────────────────────────────

function DispenseFields({
  action,
  onUpdate,
}: {
  action: DraftDispense;
  onUpdate: (action: DraftAction) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span className={fieldLabelClass}>Reagent</span>
        <select
          className={selectClass}
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
          className={inputClass}
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
          className={selectClass}
          onChange={(e) =>
            onUpdate({ ...action, unit: e.target.value as VolumeUnit })
          }
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
}: {
  action: DraftStir;
  onUpdate: (action: DraftAction) => void;
}) {
  return (
    <div className="flex items-center gap-x-3">
      <div className="flex items-center gap-1.5">
        <span className={fieldLabelClass}>Duration</span>
        <input
          className={inputClass}
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
          className={selectClass}
          onChange={(e) =>
            onUpdate({ ...action, unit: e.target.value as TimeUnit })
          }
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
