export type ExperimentStatus = "running" | "waiting" | "idle";

export interface Iteration {
  id: string;
  number: number;
  summary: string;
  createdAt: string;
}

export interface Experiment {
  id: string;
  title: string;
  status: ExperimentStatus;
  updatedAt: string;
  iterations: Iteration[];
  procedure?: import("@/lib/schemas/procedure").ProcedureStep[];
  reasoning?: string;
  goals?: string[];
}

export const statusLabel: Record<ExperimentStatus, string> = {
  running: "Running",
  waiting: "Needs input",
  idle: "Idle",
};
