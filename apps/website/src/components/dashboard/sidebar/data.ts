import type { ProcedureStep } from "@/lib/schemas/procedure";
import type { Experiment } from "./types";

const proteinFoldingProcedure: ProcedureStep[] = [
  { id: "pf-01", action: { type: "dispense", reagent: "A", amount: 30, unit: "mL" } },
  { id: "pf-02", action: { type: "dispense", reagent: "B", amount: 5, unit: "mL" } },
  { id: "pf-03", action: { type: "stir", duration: 10, unit: "s" } },
  { id: "pf-04", action: { type: "dispense", reagent: "C", amount: 2, unit: "tsp" } },
  { id: "pf-05", action: { type: "stir", duration: 5, unit: "s" } },
  { id: "pf-06", action: { type: "dispense", reagent: "A", amount: 15, unit: "mL" } },
  { id: "pf-07", action: { type: "stir", duration: 8, unit: "s" } },
  { id: "pf-08", action: { type: "cleanup" } },
];

const baselineProcedure: ProcedureStep[] = [
  { id: "et-01", action: { type: "dispense", reagent: "A", amount: 50, unit: "mL" } },
  { id: "et-02", action: { type: "dispense", reagent: "B", amount: 36, unit: "mL" } },
  { id: "et-03", action: { type: "stir", duration: 5, unit: "s" } },
  { id: "et-04", action: { type: "dispense", reagent: "C", amount: 25, unit: "mL" } },
  { id: "et-05", action: { type: "stir", duration: 5, unit: "s" } },
  { id: "et-06", action: { type: "cleanup" } },
];

export const experiments: Experiment[] = [
  {
    id: "exp-000",
    title: "Baseline",
    status: "waiting",
    updatedAt: "just now",
    procedure: baselineProcedure,
    reasoning:
      "A standard baseline demonstration: 30 mL hydrogen peroxide is dispensed first as the " +
      "oxygen source, followed by 30 mL foaming agent (dish soap) to trap the released oxygen into foam. " +
      "A brief 3-second stir mixes them before adding 30 mL yeast catalyst to trigger rapid decomposition. " +
      "A second 3-second stir ensures the catalyst is evenly distributed. Cleanup resets for the next run.",
    goals: [
      "Measure peak foam volume produced by equal-ratio reagents",
      "Record temperature rise during catalytic decomposition",
      "Establish a baseline reaction profile for future parameter sweeps",
    ],
    iterations: [
      {
        id: "exp-000-it-1",
        number: 1,
        summary: "Initial baseline run",
        createdAt: "just now",
      },
    ],
  },
  {
    id: "exp-001",
    title: "Protein folding sim #12",
    status: "waiting",
    updatedAt: "2m ago",
    procedure: proteinFoldingProcedure,
    reasoning:
      "The procedure begins by dispensing 30 mL of hydrogen peroxide as the primary substrate, " +
      "followed by 5 mL of foaming agent to act as a surfactant for volume measurement. " +
      "An initial 10-second stir ensures homogeneous mixing before introducing 2 tsp of yeast catalyst " +
      "to initiate the decomposition reaction. A brief 5-second stir distributes the catalyst evenly. " +
      "A second 15 mL addition of hydrogen peroxide extends the reaction duration for sustained observation. " +
      "A final 8-second stir ensures complete mixing before cleanup resets the apparatus.",
    goals: [
      "Observe the exothermic decomposition reaction and measure peak temperature change",
      "Record foam volume over time as a proxy for reaction rate",
      "Determine whether a staged peroxide addition produces a more sustained reaction than a single dose",
      "Collect temperature and volume data to calibrate sensor baselines for future experiments",
    ],
    iterations: [
      {
        id: "exp-001-it-5",
        number: 5,
        summary: "Adjusted temperature ramp rate",
        createdAt: "2m ago",
      },
      {
        id: "exp-001-it-4",
        number: 4,
        summary: "Added solvent correction",
        createdAt: "1h ago",
      },
      {
        id: "exp-001-it-3",
        number: 3,
        summary: "Increased step count to 50k",
        createdAt: "3h ago",
      },
      {
        id: "exp-001-it-2",
        number: 2,
        summary: "Switched to AMBER force field",
        createdAt: "1d ago",
      },
      {
        id: "exp-001-it-1",
        number: 1,
        summary: "Initial baseline run",
        createdAt: "2d ago",
      },
    ],
  },
  {
    id: "exp-002",
    title: "CRISPR off-target analysis",
    status: "waiting",
    updatedAt: "14m ago",
    iterations: [
      {
        id: "exp-002-it-3",
        number: 3,
        summary: "Expanded guide RNA set",
        createdAt: "14m ago",
      },
      {
        id: "exp-002-it-2",
        number: 2,
        summary: "Refined mismatch tolerance",
        createdAt: "2h ago",
      },
      {
        id: "exp-002-it-1",
        number: 1,
        summary: "Initial off-target scan",
        createdAt: "1d ago",
      },
    ],
  },
  {
    id: "exp-003",
    title: "Catalyst screening — batch 7",
    status: "idle",
    updatedAt: "1h ago",
    iterations: [
      {
        id: "exp-003-it-4",
        number: 4,
        summary: "Awaiting reagent confirmation",
        createdAt: "1h ago",
      },
      {
        id: "exp-003-it-3",
        number: 3,
        summary: "Narrowed candidate pool to 12",
        createdAt: "5h ago",
      },
      {
        id: "exp-003-it-2",
        number: 2,
        summary: "Tested Pd-based catalysts",
        createdAt: "1d ago",
      },
      {
        id: "exp-003-it-1",
        number: 1,
        summary: "Broad screen — 200 candidates",
        createdAt: "3d ago",
      },
    ],
  },
  {
    id: "exp-004",
    title: "RNA-seq differential expr.",
    status: "idle",
    updatedAt: "3h ago",
    iterations: [
      {
        id: "exp-004-it-2",
        number: 2,
        summary: "Normalized with DESeq2",
        createdAt: "3h ago",
      },
      {
        id: "exp-004-it-1",
        number: 1,
        summary: "Raw count matrix generated",
        createdAt: "1d ago",
      },
    ],
  },
  {
    id: "exp-005",
    title: "Molecular docking — ligand set A",
    status: "idle",
    updatedAt: "1d ago",
    iterations: [
      {
        id: "exp-005-it-3",
        number: 3,
        summary: "Top 5 poses refined",
        createdAt: "1d ago",
      },
      {
        id: "exp-005-it-2",
        number: 2,
        summary: "Grid box repositioned",
        createdAt: "2d ago",
      },
      {
        id: "exp-005-it-1",
        number: 1,
        summary: "Blind docking run",
        createdAt: "4d ago",
      },
    ],
  },
  {
    id: "exp-006",
    title: "Thermal stability assay",
    status: "idle",
    updatedAt: "2d ago",
    iterations: [
      {
        id: "exp-006-it-1",
        number: 1,
        summary: "Initial melt curve",
        createdAt: "2d ago",
      },
    ],
  },
];
