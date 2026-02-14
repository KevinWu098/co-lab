export type ExperimentStatus = "running" | "waiting" | "idle";

export type Iteration = {
  id: string;
  number: number;
  summary: string;
  createdAt: string;
};

export type Experiment = {
  id: string;
  title: string;
  status: ExperimentStatus;
  updatedAt: string;
  iterations: Iteration[];
};

export const statusLabel: Record<ExperimentStatus, string> = {
  running: "Running",
  waiting: "Needs input",
  idle: "Idle",
};
