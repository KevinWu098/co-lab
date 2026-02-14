export type ExperimentStatus = "running" | "waiting" | "idle";

export type Experiment = {
  id: string;
  title: string;
  status: ExperimentStatus;
  updatedAt: string;
};

export const statusLabel: Record<ExperimentStatus, string> = {
  running: "Running",
  waiting: "Needs input",
  idle: "Idle",
};
