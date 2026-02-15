import type { Reagent } from "@/lib/schemas/procedure";

// ── Connection ──────────────────────────────────────────────────────────────

export const DEFAULT_WS_URL = "ws://10.19.178.246:8765";
export const DEFAULT_HTTP_PORT = 8081;

// ── MJPEG stream paths ──────────────────────────────────────────────────────

export const THERMAL_STREAM_PATH = "/thermal.mjpeg";
export const WEBCAM_STREAM_PATH = "/webcam.mjpeg";

// ── Reagent → hardware dropper mapping ──────────────────────────────────────
// Dropper numbers are 1-indexed and correspond to the rig's base rotation
// positions: dropper 1 = 0°, dropper 2 = 120°, dropper 3 = 240°.

export const REAGENT_TO_DROPPER: Record<Reagent, number> = {
  A: 1,
  B: 2,
  C: 3,
};

// ── Unit conversions ────────────────────────────────────────────────────────

/** Convert volume to mL for the hardware dispense command. */
export function toMilliliters(amount: number, unit: string): number {
  switch (unit) {
    case "mL":
      return amount;
    case "tsp":
      return amount * 4.929;
    case "tbsp":
      return amount * 14.787;
    default:
      return amount;
  }
}

/** Convert duration to seconds for the hardware stir command. */
export function toSeconds(duration: number, unit: string): number {
  switch (unit) {
    case "s":
      return duration;
    case "ms":
      return duration / 1000;
    default:
      return duration;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derive the HTTP base URL for MJPEG streams from a WebSocket URL.
 * ws://192.168.50.2:8765 → http://192.168.50.2:8081
 */
export function deriveHttpBaseUrl(wsUrl: string): string {
  try {
    const parsed = new URL(wsUrl);
    const protocol = parsed.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${parsed.hostname}:${DEFAULT_HTTP_PORT}`;
  } catch {
    return `http://localhost:${DEFAULT_HTTP_PORT}`;
  }
}
