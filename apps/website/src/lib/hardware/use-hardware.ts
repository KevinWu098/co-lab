"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_WS_URL } from "./constants";
import type {
  ExecutionState,
  HardwareCommand,
  HardwareState,
  TelemetryPoint,
  WsAckMessage,
  WsIncomingMessage,
} from "./types";

// ── Default state ───────────────────────────────────────────────────────────

const INITIAL_HARDWARE_STATE: HardwareState = {
  connected: false,
  xarm: { available: false, error: null, onlineIds: [] },
  rig: {
    available: false,
    error: null,
    channels: [0, 0, 0, 0],
    stirrerActive: false,
  },
  thermal: {
    available: false,
    error: null,
    maxTempC: null,
    minTempC: null,
    fps: null,
    streamPath: "/thermal.mjpeg",
    httpPort: 8081,
  },
  webcam: {
    available: false,
    error: null,
    fps: null,
    streamPath: "/webcam.mjpeg",
    httpPort: 8081,
  },
  volume: {
    volumeMl: null,
    error: null,
    updatedAtMs: null,
  },
};

const INITIAL_EXECUTION_STATE: ExecutionState = {
  status: "idle",
  currentStep: 0,
  totalSteps: 0,
  error: null,
};

// ── Hook ────────────────────────────────────────────────────────────────────

/** Interval at which we sample thermal data for the telemetry time series. */
const TELEMETRY_SAMPLE_INTERVAL_MS = 2_000;

export interface UseHardwareReturn {
  /** Current hardware state (connection + subsystems). */
  state: HardwareState;
  /** Current procedure execution state. */
  execution: ExecutionState;
  /** Time-series telemetry (temperature, dispensed volumes). */
  telemetry: TelemetryPoint[];
  /** Clear telemetry history (e.g. when starting a new run). */
  clearTelemetry: () => void;
  /** The WebSocket URL we're connecting to. */
  wsUrl: string;
  /** Update the WebSocket URL (triggers reconnect). */
  setWsUrl: (url: string) => void;
  /** Send a raw command to the hardware server. */
  sendCommand: (cmd: HardwareCommand) => boolean;
  /** Connect to the hardware server. */
  connect: () => void;
  /** Disconnect from the hardware server. */
  disconnect: () => void;
  /** Update execution state (used by procedure runner). */
  setExecution: React.Dispatch<React.SetStateAction<ExecutionState>>;
  /**
   * Returns a promise that resolves on the next matching ack or rejects
   * on error / timeout. Used by the procedure runner to sequence commands.
   */
  waitForAck: (subsystem: string, action: string, timeoutMs?: number) => Promise<WsAckMessage>;
}

export function useHardware(): UseHardwareReturn {
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [state, setState] = useState<HardwareState>(INITIAL_HARDWARE_STATE);
  const [execution, setExecution] = useState<ExecutionState>(INITIAL_EXECUTION_STATE);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Track cumulative dispensed volumes (mutable ref, snapshotted into telemetry).
  const dispensedRef = useRef({ h2o2: 0, soap: 0, catalyst: 0, total: 0 });
  // Track when telemetry recording started.
  const telemetryStartRef = useRef<number | null>(null);

  const clearTelemetry = useCallback(() => {
    setTelemetry([]);
    dispensedRef.current = { h2o2: 0, soap: 0, catalyst: 0, total: 0 };
    telemetryStartRef.current = null;
  }, []);

  // Pending ack listeners — resolved/rejected by incoming messages.
  const ackListenersRef = useRef<
    Array<{
      subsystem: string;
      action: string;
      resolve: (msg: WsAckMessage) => void;
      reject: (err: Error) => void;
    }>
  >([]);

  // ── State parsers ──────────────────────────────────────────────────────

  const syncFromState = useCallback((payload: Record<string, unknown>) => {
    setState((prev) => {
      const next = { ...prev };

      // xArm
      const xarm = payload.xarm as Record<string, unknown> | undefined;
      if (xarm) {
        next.xarm = {
          available: Boolean(xarm.available),
          error: (xarm.error as string) ?? null,
          onlineIds: Array.isArray(xarm.onlineIds)
            ? (xarm.onlineIds as number[])
            : prev.xarm.onlineIds,
        };
      }

      // Rig
      const rig = payload.rig as Record<string, unknown> | undefined;
      if (rig) {
        next.rig = {
          available: Boolean(rig.available),
          error: (rig.error as string) ?? null,
          channels: Array.isArray(rig.channels) ? (rig.channels as number[]) : prev.rig.channels,
          stirrerActive: Boolean(rig.stirrerActive),
        };
      }

      // Thermal
      const thermal = payload.thermal as Record<string, unknown> | undefined;
      if (thermal) {
        next.thermal = {
          available: Boolean(thermal.available),
          error: (thermal.error as string) ?? null,
          maxTempC: typeof thermal.maxTempC === "number" ? thermal.maxTempC : prev.thermal.maxTempC,
          minTempC: typeof thermal.minTempC === "number" ? thermal.minTempC : prev.thermal.minTempC,
          fps: typeof thermal.fps === "number" ? thermal.fps : prev.thermal.fps,
          streamPath: (thermal.streamPath as string) ?? prev.thermal.streamPath,
          httpPort: typeof thermal.httpPort === "number" ? thermal.httpPort : prev.thermal.httpPort,
        };
      }

      // Webcam
      const webcam = payload.webcam as Record<string, unknown> | undefined;
      if (webcam) {
        next.webcam = {
          available: Boolean(webcam.available),
          error: (webcam.error as string) ?? null,
          fps: typeof webcam.fps === "number" ? webcam.fps : prev.webcam.fps,
          streamPath: (webcam.streamPath as string) ?? prev.webcam.streamPath,
          httpPort: typeof webcam.httpPort === "number" ? webcam.httpPort : prev.webcam.httpPort,
        };
      }

      // Volume
      const volume = payload.volume as Record<string, unknown> | undefined;
      if (volume) {
        next.volume = {
          volumeMl: typeof volume.volumeMl === "number" ? volume.volumeMl : prev.volume.volumeMl,
          error: volume.error !== undefined ? ((volume.error as string) ?? null) : prev.volume.error,
          updatedAtMs:
            typeof volume.updatedAtMs === "number" ? volume.updatedAtMs : prev.volume.updatedAtMs,
        };
      }

      return next;
    });
  }, []);

  // ── Message handler ────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let msg: WsIncomingMessage;
      try {
        msg = JSON.parse(event.data as string) as WsIncomingMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "state":
          syncFromState(msg as unknown as Record<string, unknown>);
          break;

        case "ack": {
          const ack = msg as WsAckMessage;

          // Update stirrer status from automation acks
          if (ack.subsystem === "automation" && ack.action === "stir") {
            setState((prev) => ({
              ...prev,
              rig: { ...prev.rig, stirrerActive: true },
            }));
          }

          // Track dispensed volumes for telemetry
          if (ack.subsystem === "automation" && ack.action === "dispense") {
            const ml =
              typeof ack.dispensedAmountMl === "number"
                ? ack.dispensedAmountMl
                : typeof ack.requestedAmountMl === "number"
                  ? ack.requestedAmountMl
                  : 0;
            const dropper = typeof ack.dropper === "number" ? ack.dropper : 0;
            if (ml > 0) {
              const d = dispensedRef.current;
              if (dropper === 1) d.h2o2 += ml;
              else if (dropper === 2) d.soap += ml;
              else if (dropper === 3) d.catalyst += ml;
              d.total += ml;
            }
          }

          // Resolve any pending ack listeners
          const listeners = ackListenersRef.current;
          const idx = listeners.findIndex(
            (l) => l.subsystem === ack.subsystem && l.action === ack.action,
          );
          if (idx !== -1) {
            const [listener] = listeners.splice(idx, 1);
            listener.resolve(ack);
          }
          break;
        }

        case "error": {
          // Reject all pending ack listeners on error
          const errorListeners = ackListenersRef.current.splice(0);
          for (const l of errorListeners) {
            l.reject(new Error(msg.error));
          }
          break;
        }

        case "thermal":
          setState((prev) => ({
            ...prev,
            thermal: {
              ...prev.thermal,
              available: msg.available ?? prev.thermal.available,
              error: msg.error !== undefined ? (msg.error ?? null) : prev.thermal.error,
              maxTempC: typeof msg.maxTempC === "number" ? msg.maxTempC : prev.thermal.maxTempC,
              minTempC: typeof msg.minTempC === "number" ? msg.minTempC : prev.thermal.minTempC,
              fps: typeof msg.fps === "number" ? msg.fps : prev.thermal.fps,
            },
          }));
          break;

        case "webcam":
          setState((prev) => ({
            ...prev,
            webcam: {
              ...prev.webcam,
              available: msg.available ?? prev.webcam.available,
              error: msg.error !== undefined ? (msg.error ?? null) : prev.webcam.error,
              fps: typeof msg.fps === "number" ? msg.fps : prev.webcam.fps,
            },
          }));
          break;

        case "volume":
          setState((prev) => ({
            ...prev,
            volume: {
              volumeMl:
                typeof msg.volumeMl === "number" ? msg.volumeMl : prev.volume.volumeMl,
              error: msg.error !== undefined ? (msg.error ?? null) : prev.volume.error,
              updatedAtMs:
                typeof msg.updatedAtMs === "number" ? msg.updatedAtMs : prev.volume.updatedAtMs,
            },
          }));
          break;
      }
    },
    [syncFromState],
  );

  // ── Connection lifecycle ───────────────────────────────────────────────

  const connect = useCallback(() => {
    // Close existing
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
      // Request full state on connect
      ws.send(JSON.stringify({ type: "get_state" }));
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      wsRef.current = null;
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };

    wsRef.current = ws;
  }, [wsUrl, handleMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Auto-connect on mount and when wsUrl changes
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // ── Telemetry sampler ─────────────────────────────────────────────────
  // Periodically snapshot thermal + dispensed data into the time series.
  // We use a ref to read the latest state without re-creating the interval.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!state.connected) return;

    // Start recording timestamp on first connected sample
    if (telemetryStartRef.current == null) {
      telemetryStartRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - (telemetryStartRef.current ?? now)) / 1000;
      const s = stateRef.current;
      const d = dispensedRef.current;

      setTelemetry((prev) => [
        ...prev,
        {
          elapsed,
          tempC: s.thermal.maxTempC,
          dispensed: { h2o2: d.h2o2, soap: d.soap, catalyst: d.catalyst },
          totalVolumeMl: d.total,
          volumeMl: s.volume.volumeMl,
        },
      ]);
    }, TELEMETRY_SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state.connected]);

  // ── Send command ───────────────────────────────────────────────────────

  const sendCommand = useCallback((cmd: HardwareCommand): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(cmd));
    return true;
  }, []);

  // ── Wait for ack ──────────────────────────────────────────────────────

  const waitForAck = useCallback(
    (subsystem: string, action: string, timeoutMs = 30_000): Promise<WsAckMessage> => {
      return new Promise<WsAckMessage>((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = ackListenersRef.current.findIndex(
            (l) => l.subsystem === subsystem && l.action === action,
          );
          if (idx !== -1) {
            ackListenersRef.current.splice(idx, 1);
          }
          reject(new Error(`Timeout waiting for ack: ${subsystem}/${action}`));
        }, timeoutMs);

        ackListenersRef.current.push({
          subsystem,
          action,
          resolve: (msg) => {
            clearTimeout(timer);
            resolve(msg);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });
      });
    },
    [],
  );

  return {
    state,
    execution,
    telemetry,
    clearTelemetry,
    wsUrl,
    setWsUrl,
    sendCommand,
    connect,
    disconnect,
    setExecution,
    waitForAck,
  };
}
