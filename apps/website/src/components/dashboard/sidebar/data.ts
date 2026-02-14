import type { Experiment } from "./types";

export const experiments: Experiment[] = [
  {
    id: "exp-001",
    title: "Protein folding sim #12",
    status: "running",
    updatedAt: "2m ago",
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
    status: "running",
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
    status: "waiting",
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
