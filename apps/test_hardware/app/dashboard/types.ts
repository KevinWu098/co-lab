export type LogEntry = {
  id: number;
  timestamp: string;
  direction: "in" | "out" | "info";
  message: string;
};

export type XArmServoState = {
  id: number;
  angleDeg: number;
  centerDeg: number;
  online: boolean;
};
