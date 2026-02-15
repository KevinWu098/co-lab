import type { DraftAction, DraftDispense, DraftStir, ProcedureStep } from "./procedure";

// ── Field-level diff ────────────────────────────────────────────────────────

export interface FieldDiff {
  field: string;
  old?: string;
  new?: string;
}

// ── Step-level diff ─────────────────────────────────────────────────────────

export type DiffEntry =
  | { status: "unchanged"; index: number; action: DraftAction }
  | { status: "added"; index: number; action: DraftAction }
  | { status: "removed"; index: number; action: DraftAction }
  | {
      status: "modified";
      index: number;
      oldAction: DraftAction;
      newAction: DraftAction;
      fields: FieldDiff[];
    };

// ── Field comparison helpers ────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function diffDispense(old: DraftDispense, cur: DraftDispense): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  if (str(old.reagent) !== str(cur.reagent)) {
    diffs.push({ field: "reagent", old: str(old.reagent), new: str(cur.reagent) });
  }
  if (str(old.amount) !== str(cur.amount)) {
    diffs.push({ field: "amount", old: str(old.amount), new: str(cur.amount) });
  }
  if (str(old.unit) !== str(cur.unit)) {
    diffs.push({ field: "unit", old: str(old.unit), new: str(cur.unit) });
  }
  return diffs;
}

function diffStir(old: DraftStir, cur: DraftStir): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  if (str(old.duration) !== str(cur.duration)) {
    diffs.push({ field: "duration", old: str(old.duration), new: str(cur.duration) });
  }
  if (str(old.unit) !== str(cur.unit)) {
    diffs.push({ field: "unit", old: str(old.unit), new: str(cur.unit) });
  }
  return diffs;
}

function diffActions(old: DraftAction, cur: DraftAction): FieldDiff[] {
  if (old.type !== cur.type) return []; // type mismatch handled at step level
  switch (old.type) {
    case "dispense":
      return diffDispense(old, cur as DraftDispense);
    case "stir":
      return diffStir(old, cur as DraftStir);
    case "cleanup":
      return [];
  }
}

// ── Main diff function ──────────────────────────────────────────────────────

export function diffProcedures(
  oldSteps: ProcedureStep[],
  newSteps: ProcedureStep[],
): DiffEntry[] {
  const maxLen = Math.max(oldSteps.length, newSteps.length);
  const entries: DiffEntry[] = [];

  for (let i = 0; i < maxLen; i++) {
    const old = oldSteps[i];
    const cur = newSteps[i];

    if (old && !cur) {
      // Step was removed
      entries.push({ status: "removed", index: i, action: old.action });
    } else if (!old && cur) {
      // Step was added
      entries.push({ status: "added", index: i, action: cur.action });
    } else if (old && cur) {
      if (old.action.type !== cur.action.type) {
        // Type changed → show as removed + added
        entries.push({ status: "removed", index: i, action: old.action });
        entries.push({ status: "added", index: i, action: cur.action });
      } else {
        const fields = diffActions(old.action, cur.action);
        if (fields.length === 0) {
          entries.push({ status: "unchanged", index: i, action: old.action });
        } else {
          entries.push({
            status: "modified",
            index: i,
            oldAction: old.action,
            newAction: cur.action,
            fields,
          });
        }
      }
    }
  }

  return entries;
}
