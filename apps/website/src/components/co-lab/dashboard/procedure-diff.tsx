"use client";

import { DropletsIcon, RefreshCwIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { type DiffEntry, type FieldDiff, diffProcedures } from "@/lib/schemas/procedure-diff";
import {
  computeAllSpins,
  type DraftAction,
  type ProcedureStep,
  reagentLabels,
  type SpinStep,
} from "@/lib/schemas/procedure";

// ── Action metadata ─────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; icon: typeof DropletsIcon }> = {
  dispense: { label: "Dispense", icon: DropletsIcon },
  stir: { label: "Stir", icon: RefreshCwIcon },
  cleanup: { label: "Cleanup", icon: Trash2Icon },
};

// ── Diff accent styles (layered on top of base card) ────────────────────────

const DIFF_ACCENT: Record<
  DiffEntry["status"],
  { card: string; badge: string; badgeLabel: string; text: string }
> = {
  unchanged: { card: "", badge: "", badgeLabel: "", text: "" },
  added: {
    card: "border-l-2 border-l-green-500! bg-green-500/5",
    badge: "bg-green-500/15 text-green-700 dark:text-green-400",
    badgeLabel: "Added",
    text: "text-green-700 dark:text-green-400",
  },
  removed: {
    card: "border-l-2 border-l-red-500! bg-red-500/5",
    badge: "bg-red-500/15 text-red-700 dark:text-red-400",
    badgeLabel: "Removed",
    text: "line-through opacity-50",
  },
  modified: {
    card: "border-l-2 border-l-amber-500! bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    badgeLabel: "Modified",
    text: "",
  },
};

// ── Field helpers ───────────────────────────────────────────────────────────

function fieldLabel(field: string): string {
  const map: Record<string, string> = {
    reagent: "Reagent",
    amount: "Amount",
    unit: "Unit",
    duration: "Duration",
  };
  return map[field] ?? field;
}

function displayFieldValue(field: string, value: string): string {
  if (!value) return "—";
  if (field === "reagent") {
    const label = reagentLabels[value as keyof typeof reagentLabels];
    return label ? label.name : value;
  }
  return value;
}

// ── Inline field change annotation ──────────────────────────────────────────

function FieldChangeInline({ fields }: { fields: FieldDiff[] }) {
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-0.5">
      {fields.map((f) => (
        <span className="font-mono text-[11px]" key={f.field}>
          <span className="text-muted-foreground/50">{fieldLabel(f.field)}: </span>
          <span className="text-red-600/70 line-through dark:text-red-400/70">
            {displayFieldValue(f.field, f.old ?? "")}
          </span>
          <span className="text-muted-foreground/40 mx-0.5">&rarr;</span>
          <span className="font-semibold text-green-700 dark:text-green-400">
            {displayFieldValue(f.field, f.new ?? "")}
          </span>
        </span>
      ))}
    </span>
  );
}

// ── Spin section ────────────────────────────────────────────────────────────

function SpinSection({ spins, muted }: { spins: SpinStep[]; muted?: boolean }) {
  if (spins.length === 0) return null;
  return (
    <div className="border-t border-dashed px-3 py-1.5">
      {spins.map((spin, i) => (
        <div
          className={`flex items-center gap-2 py-0.5 ${muted ? "opacity-50" : "text-muted-foreground"}`}
          key={`${spin.from}-${spin.to}-${i}`}
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
  );
}

// ── Detail section (the bottom row of each card) ────────────────────────────

function DetailSection({
  action,
  status,
  fields,
}: {
  action: DraftAction;
  status: DiffEntry["status"];
  fields?: FieldDiff[];
}) {
  const accent = DIFF_ACCENT[status];

  // For modified entries, show inline field changes instead of plain text
  if (status === "modified" && fields && fields.length > 0) {
    return (
      <div className="border-t px-3 py-2">
        <FieldChangeInline fields={fields} />
      </div>
    );
  }

  return (
    <div className="border-t px-3 py-2">
      {action.type === "dispense" && (
        <span className={`font-mono text-[11px] ${accent.text || "text-muted-foreground"}`}>
          {action.amount ?? "—"} {action.unit ?? "mL"}
          {action.reagent ? ` of ${reagentLabels[action.reagent].name}` : ""}
        </span>
      )}
      {action.type === "stir" && (
        <span className={`font-mono text-[11px] ${accent.text || "text-muted-foreground"}`}>
          {action.duration ?? "—"} {action.unit ?? "s"}
        </span>
      )}
      {action.type === "cleanup" && (
        <span className={`font-mono text-[11px] ${accent.text || "text-muted-foreground"}`}>
          Remove current materials and replace with a fresh flask.
        </span>
      )}
    </div>
  );
}

// ── Single diff row (matches ProcedureStepList card structure) ──────────────

function DiffRow({
  entry,
  spins,
}: {
  entry: DiffEntry;
  spins?: SpinStep[];
}) {
  const action = entry.status === "modified" ? entry.newAction : entry.action;
  const meta = ACTION_META[action.type] ?? ACTION_META.cleanup;
  const Icon = meta.icon;
  const accent = DIFF_ACCENT[entry.status];

  return (
    <div
      className={`bg-background border-x border-t last:border-b ${accent.card}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-muted-foreground w-5 text-left font-mono text-[10px] tabular-nums">
          {String(entry.index + 1).padStart(2, "0")}
        </span>
        <Icon className="text-muted-foreground size-3.5" />
        <span
          className={`font-mono text-xs font-medium tracking-wider uppercase ${
            entry.status === "removed" ? "line-through opacity-50" : ""
          }`}
        >
          {meta.label}
        </span>
        {action.type === "dispense" && action.reagent && (
          <span
            className={`font-mono text-[11px] ${
              entry.status === "removed" ? "line-through opacity-50" : "text-muted-foreground"
            }`}
          >
            {reagentLabels[action.reagent].formula}
          </span>
        )}

        {/* Diff badge (far right) */}
        {accent.badgeLabel && (
          <span
            className={`ml-auto rounded-none px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${accent.badge}`}
          >
            {accent.badgeLabel}
          </span>
        )}
      </div>

      {/* Spins (if any) */}
      {spins && spins.length > 0 && (
        <SpinSection muted={entry.status === "removed"} spins={spins} />
      )}

      {/* Detail */}
      <DetailSection
        action={action}
        fields={entry.status === "modified" ? entry.fields : undefined}
        status={entry.status}
      />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface ProcedureDiffProps {
  previousSteps: ProcedureStep[];
  newSteps: ProcedureStep[];
}

export function ProcedureDiff({ previousSteps, newSteps }: ProcedureDiffProps) {
  const hasDiff = newSteps.length > 0;

  const entries = useMemo(
    () => (hasDiff ? diffProcedures(previousSteps, newSteps) : []),
    [previousSteps, newSteps, hasDiff],
  );

  // Compute spins for previous steps (used for unchanged / removed / modified rows)
  const prevSpinMap = useMemo(() => computeAllSpins(previousSteps), [previousSteps]);
  // Compute spins for new steps (used for added rows)
  const newSpinMap = useMemo(() => computeAllSpins(newSteps), [newSteps]);

  if (previousSteps.length === 0 && newSteps.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center font-mono text-sm">
        No procedure defined
      </div>
    );
  }

  const stats = {
    added: entries.filter((e) => e.status === "added").length,
    removed: entries.filter((e) => e.status === "removed").length,
    modified: entries.filter((e) => e.status === "modified").length,
  };
  const hasChanges = stats.added + stats.removed + stats.modified > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Summary bar */}
      {hasChanges && (
        <div className="border-b px-4 py-2">
          <div className="flex items-center gap-3 font-mono text-[10px]">
            {stats.added > 0 && (
              <span className="text-green-600 dark:text-green-400">+{stats.added} added</span>
            )}
            {stats.removed > 0 && (
              <span className="text-red-600 dark:text-red-400">&minus;{stats.removed} removed</span>
            )}
            {stats.modified > 0 && (
              <span className="text-amber-600 dark:text-amber-400">~{stats.modified} modified</span>
            )}
          </div>
        </div>
      )}

      {/* Card list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {hasDiff
          ? entries.map((entry, i) => {
              // Pick the right spin map depending on entry type
              const stepIndex = entry.index;
              const spins =
                entry.status === "added"
                  ? newSpinMap.get(newSteps[stepIndex]?.id ?? "")
                  : prevSpinMap.get(previousSteps[stepIndex]?.id ?? "");

              return (
                <DiffRow
                  entry={entry}
                  key={`${entry.status}-${entry.index}-${i}`}
                  spins={spins ?? undefined}
                />
              );
            })
          : previousSteps.map((step, index) => {
              const spins = prevSpinMap.get(step.id);
              return (
                <DiffRow
                  entry={{ status: "unchanged", index, action: step.action }}
                  key={step.id}
                  spins={spins ?? undefined}
                />
              );
            })}
      </div>
    </div>
  );
}
