import type { Experiment } from "./types";

export const experiments: Experiment[] = [
  {
    id: "exp-001",
    title: "Protein folding sim #12",
    status: "running",
    updatedAt: "2m ago",
  },
  {
    id: "exp-002",
    title: "CRISPR off-target analysis",
    status: "running",
    updatedAt: "14m ago",
  },
  {
    id: "exp-003",
    title: "Catalyst screening — batch 7",
    status: "waiting",
    updatedAt: "1h ago",
  },
  {
    id: "exp-004",
    title: "RNA-seq differential expr.",
    status: "idle",
    updatedAt: "3h ago",
  },
  {
    id: "exp-005",
    title: "Molecular docking — ligand set A",
    status: "idle",
    updatedAt: "1d ago",
  },
  {
    id: "exp-006",
    title: "Thermal stability assay",
    status: "idle",
    updatedAt: "2d ago",
  },
];
