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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
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
    case "cleanup":
      return { type: "cleanup" };
  }
}

// ── Main editor ────────────────────────────────────────────────────────────

export function ProcedureEditor({ sourceFile }: { sourceFile?: File | null }) {
  const [steps, setSteps] = useState<ProcedureStep[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Source document preview URL
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const isPdf = sourceFile?.type === "application/pdf" || /\.pdf$/i.test(sourceFile?.name ?? "");

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceFile);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceFile]);

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
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
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
    <div className="flex h-full w-full">
      {/* ── Step list ── */}
      {/* biome-ignore lint/a11y/useSemanticElements: drop target region */}
      <div
        role="list"
        ref={listRef}
        className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Source document bar */}
        {sourceFile && (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="bg-muted/30 hover:bg-muted/50 flex shrink-0 cursor-pointer items-center gap-2 border-b px-3 py-2 transition-colors"
              >
                <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
                <span className="flex-1 truncate text-left font-mono text-xs">
                  {sourceFile.name}
                </span>
                <span className="text-muted-foreground/60 text-[10px] tracking-wider uppercase">
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
                    src={`${sourceUrl}#toolbar=0`}
                    title="Source procedure"
                    className="flex-1"
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
          <div className="flex flex-col p-3">
            {steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                totalSteps={steps.length}
                spinSteps={spinMap.get(step.id)}
                onUpdate={(action) => updateStep(step.id, action)}
                onRemove={() => removeStep(step.id)}
                onMoveUp={() => moveStep(step.id, -1)}
                onMoveDown={() => moveStep(step.id, 1)}
              />
            ))}

            {/* Drop hint at bottom */}
            <div
              className={`mt-0 flex items-center justify-center border border-dashed transition-colors ${
                isDragging
                  ? "border-foreground/30 bg-muted/30 h-10"
                  : "text-muted-foreground/30 border-muted-foreground/20 h-0"
              }`}
            >
              {isDragging && (
                <span className="text-muted-foreground font-mono text-xs">Drop here</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Action palette ── */}
      <div className="flex w-md shrink-0 flex-col gap-2 border-l p-2">
        <span className="text-muted-foreground px-1 font-mono text-[10px] tracking-widest uppercase">
          Actions
        </span>
        {ACTION_PALETTE.map((item) => (
          <button
            key={item.type}
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onDragEnd={handleDragEnd}
            onClick={() => addStep(item.type)}
            className="bg-background hover:border-foreground/25 hover:bg-muted/30 flex cursor-grab flex-col items-center gap-1.5 border p-3 transition-colors active:cursor-grabbing"
          >
            <item.icon className="text-muted-foreground size-3.5" />
            <span className="font-mono text-[11px] font-medium">{item.label}</span>
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
  const palette = ACTION_PALETTE.find((a) => a.type === action.type) ?? ACTION_PALETTE[0];
  const Icon = palette.icon;

  return (
    <div className="bg-background group border-x border-t first:rounded-t last:rounded-b last:border-b">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-muted-foreground w-5 text-right font-mono text-[10px] tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Icon className="text-muted-foreground size-3.5" />
        <span className="font-mono text-xs font-medium tracking-wider uppercase">
          {palette.label}
        </span>

        <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUpIcon className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onMoveDown}
            disabled={index === totalSteps - 1}
          >
            <ChevronDownIcon className="size-3" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" onClick={onRemove}>
            <XIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Spin sub-steps (computed, non-editable) */}
      {spinSteps && spinSteps.length > 0 && (
        <div className="border-t border-dashed px-3 py-1.5">
          {spinSteps.map((spin, i) => (
            <div
              key={`${spin.from}-${spin.to}-${i}`}
              className="text-muted-foreground flex items-center gap-2 py-0.5"
            >
              <RotateCcwIcon className="size-3 shrink-0" />
              <span className="font-mono text-[11px]">
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
      <div className="border-t px-3 py-2.5">
        {action.type === "dispense" && <DispenseFields action={action} onUpdate={onUpdate} />}
        {action.type === "stir" && <StirFields action={action} onUpdate={onUpdate} />}
        {action.type === "cleanup" && (
          <p className="text-muted-foreground font-mono text-[11px]">
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
const fieldLabelClass = "text-muted-foreground font-mono text-[10px] uppercase tracking-wider";

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
          value={action.reagent ?? ""}
          onChange={(e) =>
            onUpdate({
              ...action,
              reagent: (e.target.value || undefined) as Reagent | undefined,
            })
          }
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
          type="number"
          className={inputClass}
          placeholder="0"
          min={0}
          step="any"
          value={action.amount ?? ""}
          onChange={(e) =>
            onUpdate({
              ...action,
              amount: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <select
          className={selectClass}
          value={action.unit ?? "mL"}
          onChange={(e) => onUpdate({ ...action, unit: e.target.value as VolumeUnit })}
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
          type="number"
          className={inputClass}
          placeholder="0"
          min={0}
          step="any"
          value={action.duration ?? ""}
          onChange={(e) =>
            onUpdate({
              ...action,
              duration: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <select
          className={selectClass}
          value={action.unit ?? "s"}
          onChange={(e) => onUpdate({ ...action, unit: e.target.value as TimeUnit })}
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
