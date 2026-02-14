import { z } from "zod";

// ── Reagents & carousel positions ──────────────────────────────────────────
// Elements arranged in a circle. Servo range: -120° to +120°.
// Wire-twist constraint: max 120° per spin step.
//   A (H₂O₂)          = -120°
//   B (Dish soap)      =    0°  (home)
//   C (Yeast catalyst) = +120°

export const reagents = ["A", "B", "C"] as const;
export type Reagent = (typeof reagents)[number];

export const reagentLabels: Record<Reagent, { formula: string; name: string }> = {
  A: { formula: "H₂O₂", name: "Hydrogen Peroxide" },
  B: { formula: "Foaming Agent", name: "Dish Soap" },
  C: { formula: "Yeast", name: "Catalyst" },
};

export const reagentPositions: Record<Reagent, number> = {
  A: -120,
  B: 0,
  C: 120,
};

// ── Units ──────────────────────────────────────────────────────────────────

export const volumeUnits = ["mL", "tsp", "tbsp"] as const;
export type VolumeUnit = (typeof volumeUnits)[number];

export const timeUnits = ["s", "ms"] as const;
export type TimeUnit = (typeof timeUnits)[number];

// ── Validated action schemas ───────────────────────────────────────────────

export const dispenseSchema = z.object({
  type: z.literal("dispense"),
  reagent: z.enum(reagents),
  amount: z.number().positive(),
  unit: z.enum(volumeUnits),
});

export const stirSchema = z.object({
  type: z.literal("stir"),
  duration: z.number().positive(),
  unit: z.enum(timeUnits),
});

export const cleanupSchema = z.object({
  type: z.literal("cleanup"),
});

export const actionSchema = z.discriminatedUnion("type", [
  dispenseSchema,
  stirSchema,
  cleanupSchema,
]);

export type Action = z.infer<typeof actionSchema>;

// ── Draft action types (partial fields, for in-progress editing) ───────────

export interface DraftDispense {
  type: "dispense";
  reagent?: Reagent;
  amount?: number;
  unit?: VolumeUnit;
}

export interface DraftStir {
  type: "stir";
  duration?: number;
  unit?: TimeUnit;
}

export interface DraftCleanup {
  type: "cleanup";
}

export type DraftAction = DraftDispense | DraftStir | DraftCleanup;

// ── Procedure step ─────────────────────────────────────────────────────────

export interface ProcedureStep {
  id: string;
  action: DraftAction;
}

// ── Computed spin sub-step (derived, not user-editable) ────────────────────

export interface SpinStep {
  from: Reagent;
  to: Reagent;
  degrees: number;
}

// ── Spin computation ───────────────────────────────────────────────────────
// Max 120° per individual spin. A→C (240°) must route through B.

const MAX_SPIN_DEGREES = 120;

export function computeSpinSteps(from: Reagent, to: Reagent): SpinStep[] {
  if (from === to) return [];

  const fromDeg = reagentPositions[from];
  const toDeg = reagentPositions[to];

  if (Math.abs(toDeg - fromDeg) <= MAX_SPIN_DEGREES) {
    return [{ from, to, degrees: toDeg - fromDeg }];
  }

  // Intermediate stop through B (center / home)
  return [
    { from, to: "B", degrees: reagentPositions.B - fromDeg },
    { from: "B", to, degrees: toDeg - reagentPositions.B },
  ];
}

/**
 * Walk the procedure list and compute spin sub-steps for every dispense
 * that targets a different reagent than the current carousel position.
 * Returns a map of stepId → SpinStep[].
 */
export function computeAllSpins(steps: ProcedureStep[]): Map<string, SpinStep[]> {
  const map = new Map<string, SpinStep[]>();
  let current: Reagent = "B"; // carousel starts at home

  for (const step of steps) {
    if (step.action.type === "dispense" && step.action.reagent) {
      const spins = computeSpinSteps(current, step.action.reagent);
      if (spins.length > 0) {
        map.set(step.id, spins);
      }
      current = step.action.reagent;
    }
  }

  return map;
}

// ── Full procedure validation ──────────────────────────────────────────────

export const procedureSchema = z.object({
  steps: z.array(actionSchema).min(1, "At least one step is required"),
});

export type Procedure = z.infer<typeof procedureSchema>;
