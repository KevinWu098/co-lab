// ── Hardware subsystem state ────────────────────────────────────────────────

export interface XArmState {
  available: boolean;
  error: string | null;
  onlineIds: number[];
}

export interface RigState {
  available: boolean;
  error: string | null;
  channels: number[];
  stirrerActive: boolean;
}

export interface ThermalState {
  available: boolean;
  error: string | null;
  maxTempC: number | null;
  minTempC: number | null;
  fps: number | null;
  streamPath: string;
  httpPort: number;
}

export interface WebcamState {
  available: boolean;
  error: string | null;
  fps: number | null;
  streamPath: string;
  httpPort: number;
}

export interface VolumeState {
  /** Vision-estimated volume in mL, or null if no estimate yet. */
  volumeMl: number | null;
  /** Error string from the estimation, or null. */
  error: string | null;
  /** Timestamp (ms) of the last volume update. */
  updatedAtMs: number | null;
}

// ── Aggregate hardware state ────────────────────────────────────────────────

export interface HardwareState {
  connected: boolean;
  xarm: XArmState;
  rig: RigState;
  thermal: ThermalState;
  webcam: WebcamState;
  volume: VolumeState;
}

// ── WebSocket messages (server → client) ────────────────────────────────────

export interface WsStateMessage {
  type: "state";
  xarm?: Record<string, unknown>;
  rig?: Record<string, unknown>;
  thermal?: Record<string, unknown>;
  webcam?: Record<string, unknown>;
  volume?: Record<string, unknown>;
}

export interface WsAckMessage {
  type: "ack";
  subsystem: "xarm" | "rig" | "automation";
  action: string;
  [key: string]: unknown;
}

export interface WsErrorMessage {
  type: "error";
  error: string;
}

export interface WsThermalMessage {
  type: "thermal";
  available?: boolean;
  error?: string | null;
  maxTempC?: number;
  minTempC?: number;
  fps?: number;
}

export interface WsWebcamMessage {
  type: "webcam";
  available?: boolean;
  error?: string | null;
  fps?: number;
}

export interface WsVolumeMessage {
  type: "volume";
  volumeMl?: number;
  raw?: string;
  error?: string | null;
  updatedAtMs?: number;
}

export type WsIncomingMessage =
  | WsStateMessage
  | WsAckMessage
  | WsErrorMessage
  | WsThermalMessage
  | WsWebcamMessage
  | WsVolumeMessage;

// ── WebSocket commands (client → server) ─────────────────────────────────────

export interface DispenseCommand {
  type: "automation_dispense";
  dropper: number;
  amountMl: number;
}

export interface StirCommand {
  type: "automation_stir";
  durationS: number;
}

export interface CleanupCommand {
  type: "automation_cleanup";
  moveMs?: number;
}

export interface GetStateCommand {
  type: "get_state";
}

export type HardwareCommand =
  | DispenseCommand
  | StirCommand
  | CleanupCommand
  | GetStateCommand;

// ── Experiment execution ─────────────────────────────────────────────────────

// ── Telemetry history ────────────────────────────────────────────────────────

export interface TelemetryPoint {
  /** Seconds since recording started. */
  elapsed: number;
  /** Max temperature from thermal camera (°C), or null if unavailable. */
  tempC: number | null;
  /** Cumulative dispensed volume per reagent (mL). */
  dispensed: { h2o2: number; soap: number; catalyst: number };
  /** Total cumulative volume dispensed (mL). */
  totalVolumeMl: number;
  /** Vision-estimated volume in flask (mL), or null if unavailable. */
  volumeMl: number | null;
}

// ── Experiment execution ─────────────────────────────────────────────────────

export type ExecutionStatus = "idle" | "running" | "completed" | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  /** Index of the step currently executing (0-based) */
  currentStep: number;
  /** Total number of steps in the procedure */
  totalSteps: number;
  /** Error message if status is "error" */
  error: string | null;
}
