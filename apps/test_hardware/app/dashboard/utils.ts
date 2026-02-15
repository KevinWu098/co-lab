import {
  DEFAULT_RIG_CLOSED_ANGLE,
  DEFAULT_RIG_SERVO_CHANNELS,
  DEFAULT_THERMAL_HTTP_PORT,
  DEFAULT_THERMAL_STREAM_PATH,
  DEFAULT_WEBCAM_STREAM_PATH,
  DEFAULT_XARM_MAX_ANGLE_DEG,
  DEFAULT_XARM_MIN_ANGLE_DEG,
  DEFAULT_XARM_SERVO_IDS,
} from "./constants";
import type { LogEntry, XArmServoState } from "./types";

export function buildLogEntry(direction: LogEntry["direction"], message: string): LogEntry {
  return {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    direction,
    message,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function defaultXArmServos(): XArmServoState[] {
  const midpoint = (DEFAULT_XARM_MIN_ANGLE_DEG + DEFAULT_XARM_MAX_ANGLE_DEG) / 2;
  return DEFAULT_XARM_SERVO_IDS.map((id) => ({
    id,
    angleDeg: midpoint,
    centerDeg: midpoint,
    online: false,
  }));
}

export function defaultRigAngles() {
  return Array.from({ length: DEFAULT_RIG_SERVO_CHANNELS }, () => DEFAULT_RIG_CLOSED_ANGLE);
}

export function labelForRigPosition(
  channel: number,
  position: number,
  baseChannel: number,
  closedAngle: number,
  openAngle: number,
) {
  if (channel === baseChannel) {
    return `${position} deg`;
  }
  if (position === closedAngle) {
    return "Closed";
  }
  if (position === openAngle) {
    return "Open";
  }
  return `${position}`;
}

function deriveStreamUrl(wsUrl: string, path: string) {
  try {
    const parsed = new URL(wsUrl);
    const protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsed.hostname}:${DEFAULT_THERMAL_HTTP_PORT}${path}`;
  } catch {
    return `http://192.168.50.2:${DEFAULT_THERMAL_HTTP_PORT}${path}`;
  }
}

export function deriveThermalStreamUrl(wsUrl: string) {
  return deriveStreamUrl(wsUrl, DEFAULT_THERMAL_STREAM_PATH);
}

export function deriveWebcamStreamUrl(wsUrl: string) {
  return deriveStreamUrl(wsUrl, DEFAULT_WEBCAM_STREAM_PATH);
}
