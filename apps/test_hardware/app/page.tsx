"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { MessageLogPanel } from "./dashboard/components/MessageLogPanel";
import { StatusHeader } from "./dashboard/components/StatusHeader";
import { ThermalPanel } from "./dashboard/components/ThermalPanel";
import { WebcamPanel } from "./dashboard/components/WebcamPanel";
import {
  DEFAULT_RIG_BASE_CHANNEL,
  DEFAULT_RIG_BASE_POSITIONS,
  DEFAULT_RIG_CLOSED_ANGLE,
  DEFAULT_RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S,
  DEFAULT_RIG_OPEN_ANGLE,
  DEFAULT_RIG_SERVO_CHANNELS,
  DEFAULT_RIG_STIRRER_DURATIONS,
  DEFAULT_WS_URL,
  DEFAULT_XARM_MAX_ANGLE_DEG,
  DEFAULT_XARM_MIN_ANGLE_DEG,
  DEFAULT_XARM_MOVE_MS,
  DEFAULT_XARM_SERVO_IDS,
  SEND_DEBOUNCE_MS,
} from "./dashboard/constants";
import type { LogEntry, XArmServoState } from "./dashboard/types";
import {
  buildLogEntry,
  clamp,
  defaultRigAngles,
  defaultXArmServos,
  deriveThermalStreamUrl,
  deriveWebcamStreamUrl,
  isRecord,
  labelForRigPosition,
} from "./dashboard/utils";

export default function Page() {
  const [wsUrl, setWsUrl] = useState(DEFAULT_WS_URL);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [xarmAvailable, setXarmAvailable] = useState(true);
  const [xarmError, setXarmError] = useState<string | undefined>(undefined);
  const [xarmServos, setXarmServos] = useState<XArmServoState[]>(defaultXArmServos);
  const [xarmMinAngleDeg, setXarmMinAngleDeg] = useState(DEFAULT_XARM_MIN_ANGLE_DEG);
  const [xarmMaxAngleDeg, setXarmMaxAngleDeg] = useState(DEFAULT_XARM_MAX_ANGLE_DEG);
  const [xarmMoveMs, setXarmMoveMs] = useState(DEFAULT_XARM_MOVE_MS);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [dispenseDropper, setDispenseDropper] = useState(1);
  const [dispenseAmountMl, setDispenseAmountMl] = useState(20);
  const [dispenseRunning, setDispenseRunning] = useState(false);
  const [automationStirDurationS, setAutomationStirDurationS] = useState(5);
  const [automationStirRunning, setAutomationStirRunning] = useState(false);

  const [rigAvailable, setRigAvailable] = useState(true);
  const [rigError, setRigError] = useState<string | undefined>(undefined);
  const [rigAngles, setRigAngles] = useState<number[]>(defaultRigAngles);
  const [rigBaseChannel, setRigBaseChannel] = useState(DEFAULT_RIG_BASE_CHANNEL);
  const [rigBasePositions, setRigBasePositions] = useState<number[]>(DEFAULT_RIG_BASE_POSITIONS);
  const [rigClosedAngle, setRigClosedAngle] = useState(DEFAULT_RIG_CLOSED_ANGLE);
  const [rigOpenAngle, setRigOpenAngle] = useState(DEFAULT_RIG_OPEN_ANGLE);
  const [rigDiagnosticBaseToValveDelayS, setRigDiagnosticBaseToValveDelayS] = useState(
    DEFAULT_RIG_DIAGNOSTIC_BASE_TO_VALVE_DELAY_S,
  );
  const [rigStirrerDurations, setRigStirrerDurations] = useState<number[]>(
    DEFAULT_RIG_STIRRER_DURATIONS,
  );
  const [rigStirrerActive, setRigStirrerActive] = useState(false);
  const [rigStateSynced, setRigStateSynced] = useState(false);
  const [rigPendingAngles, setRigPendingAngles] = useState<Record<number, number>>({});
  const [thermalAvailable, setThermalAvailable] = useState(false);
  const [thermalError, setThermalError] = useState<string | undefined>(undefined);
  const [thermalMaxTempC, setThermalMaxTempC] = useState<number | undefined>(undefined);
  const [thermalMinTempC, setThermalMinTempC] = useState<number | undefined>(undefined);
  const [thermalFps, setThermalFps] = useState<number | undefined>(undefined);
  const [thermalUpdatedAtMs, setThermalUpdatedAtMs] = useState<number | undefined>(undefined);
  const [thermalStreamUrl, setThermalStreamUrl] = useState(deriveThermalStreamUrl(DEFAULT_WS_URL));
  const [thermalStreamNonce, setThermalStreamNonce] = useState(0);
  const [thermalStreamError, setThermalStreamError] = useState<string | undefined>(undefined);
  const [webcamAvailable, setWebcamAvailable] = useState(false);
  const [webcamError, setWebcamError] = useState<string | undefined>(undefined);
  const [webcamFps, setWebcamFps] = useState<number | undefined>(undefined);
  const [webcamUpdatedAtMs, setWebcamUpdatedAtMs] = useState<number | undefined>(undefined);
  const [webcamStreamUrl, setWebcamStreamUrl] = useState(deriveWebcamStreamUrl(DEFAULT_WS_URL));
  const [webcamStreamNonce, setWebcamStreamNonce] = useState(0);
  const [webcamStreamError, setWebcamStreamError] = useState<string | undefined>(undefined);

  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimersRef = useRef<Partial<Record<number, ReturnType<typeof setTimeout>>>>({});

  const xarmMidAngleDeg = useMemo(
    () => Math.round((xarmMinAngleDeg + xarmMaxAngleDeg) / 2),
    [xarmMinAngleDeg, xarmMaxAngleDeg],
  );

  const rigBaseAtHome = useMemo(() => {
    const home = rigBasePositions[0] ?? 0;
    return Math.round(rigAngles[rigBaseChannel] ?? 0) === Math.round(home);
  }, [rigAngles, rigBaseChannel, rigBasePositions]);

  const rigControlsDisabled = !connected || !rigAvailable || !rigStateSynced;
  const rigDiagnosticDisabled = rigControlsDisabled || !rigBaseAtHome;
  const dispenseDisabled = !connected || !rigAvailable || dispenseRunning || automationStirRunning;
  const automationStirDisabled =
    !connected || !rigAvailable || automationStirRunning || dispenseRunning;
  const cleanupDisabled = !connected || !xarmAvailable || cleanupRunning;
  const thermalUpdatedLabel = useMemo(() => {
    if (thermalUpdatedAtMs === undefined) {
      return "No data";
    }
    return new Date(thermalUpdatedAtMs).toLocaleTimeString();
  }, [thermalUpdatedAtMs]);
  const thermalStreamSrc = useMemo(() => {
    const separator = thermalStreamUrl.includes("?") ? "&" : "?";
    return `${thermalStreamUrl}${separator}v=${thermalStreamNonce}`;
  }, [thermalStreamUrl, thermalStreamNonce]);
  const webcamUpdatedLabel = useMemo(() => {
    if (webcamUpdatedAtMs === undefined) {
      return "No data";
    }
    return new Date(webcamUpdatedAtMs).toLocaleTimeString();
  }, [webcamUpdatedAtMs]);
  const webcamStreamSrc = useMemo(() => {
    const separator = webcamStreamUrl.includes("?") ? "&" : "?";
    return `${webcamStreamUrl}${separator}v=${webcamStreamNonce}`;
  }, [webcamStreamUrl, webcamStreamNonce]);

  const pushLog = (entry: LogEntry) => {
    setLogs((prev) => [entry, ...prev].slice(0, 200));
  };

  const syncThermalFromPayload = (payload: unknown) => {
    if (!isRecord(payload)) {
      return;
    }
    if (typeof payload.available === "boolean") {
      setThermalAvailable(payload.available);
    }
    setThermalError(typeof payload.error === "string" ? payload.error : undefined);

    if (typeof payload.maxTempC === "number") {
      setThermalMaxTempC(payload.maxTempC);
    }
    if (typeof payload.minTempC === "number") {
      setThermalMinTempC(payload.minTempC);
    }
    if (typeof payload.fps === "number") {
      setThermalFps(payload.fps);
    }
    if (typeof payload.updatedAtMs === "number") {
      setThermalUpdatedAtMs(Math.round(payload.updatedAtMs));
    }
  };

  const syncWebcamFromPayload = (payload: unknown) => {
    if (!isRecord(payload)) {
      return;
    }
    if (typeof payload.available === "boolean") {
      setWebcamAvailable(payload.available);
    }
    setWebcamError(typeof payload.error === "string" ? payload.error : undefined);

    if (typeof payload.fps === "number") {
      setWebcamFps(payload.fps);
    }
    if (typeof payload.updatedAtMs === "number") {
      setWebcamUpdatedAtMs(Math.round(payload.updatedAtMs));
    }
  };

  const sendMessage = (payload: object) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      pushLog(buildLogEntry("info", "WebSocket not connected"));
      return false;
    }
    const text = JSON.stringify(payload);
    wsRef.current.send(text);
    pushLog(buildLogEntry("out", text));
    return true;
  };

  const syncFromState = (payload: unknown) => {
    if (!isRecord(payload)) {
      return;
    }

    const thermalSource = isRecord(payload.thermal) ? payload.thermal : undefined;
    if (thermalSource) {
      syncThermalFromPayload(thermalSource);
    }
    const webcamSource = isRecord(payload.webcam) ? payload.webcam : undefined;
    if (webcamSource) {
      syncWebcamFromPayload(webcamSource);
    }

    const xarmSource = isRecord(payload.xarm) ? payload.xarm : payload;

    if (typeof xarmSource.available === "boolean") {
      setXarmAvailable(xarmSource.available);
    }
    setXarmError(typeof xarmSource.error === "string" ? xarmSource.error : undefined);

    const xarmLimits = isRecord(xarmSource.limits) ? xarmSource.limits : undefined;
    if (
      xarmLimits &&
      typeof xarmLimits.min === "number" &&
      typeof xarmLimits.max === "number" &&
      xarmLimits.min < xarmLimits.max
    ) {
      setXarmMinAngleDeg(Math.round(xarmLimits.min));
      setXarmMaxAngleDeg(Math.round(xarmLimits.max));
    }

    const xarmDefaults = isRecord(xarmSource.defaults) ? xarmSource.defaults : undefined;
    if (xarmDefaults && typeof xarmDefaults.moveMs === "number") {
      setXarmMoveMs(Math.max(50, Math.round(xarmDefaults.moveMs)));
    }

    const xarmServosRaw = Array.isArray(xarmSource.servos) ? xarmSource.servos : undefined;
    if (xarmServosRaw) {
      const incomingById = new Map<
        number,
        { angleDeg?: number; centerDeg?: number; online?: boolean }
      >();
      for (const value of xarmServosRaw) {
        if (!isRecord(value) || typeof value.id !== "number") {
          continue;
        }
        incomingById.set(value.id, {
          angleDeg:
            typeof value.angleDeg === "number"
              ? value.angleDeg
              : typeof value.position === "number"
                ? value.position
                : undefined,
          centerDeg:
            typeof value.centerDeg === "number"
              ? value.centerDeg
              : typeof value.center === "number"
                ? value.center
                : undefined,
          online: value.online === true,
        });
      }

      setXarmServos((previous) => {
        const previousById = new Map(previous.map((servo) => [servo.id, servo]));
        return DEFAULT_XARM_SERVO_IDS.map((id) => {
          const current = previousById.get(id) ?? {
            id,
            angleDeg: xarmMidAngleDeg,
            centerDeg: xarmMidAngleDeg,
            online: false,
          };
          const incoming = incomingById.get(id);

          if (!incoming) {
            return current;
          }

          return {
            id,
            angleDeg:
              incoming.angleDeg !== undefined
                ? clamp(Math.round(incoming.angleDeg), xarmMinAngleDeg, xarmMaxAngleDeg)
                : current.angleDeg,
            centerDeg:
              incoming.centerDeg !== undefined
                ? clamp(Math.round(incoming.centerDeg), xarmMinAngleDeg, xarmMaxAngleDeg)
                : current.centerDeg,
            online: incoming.online === true,
          };
        });
      });
    }

    const rigSource = isRecord(payload.rig) ? payload.rig : undefined;
    if (rigSource) {
      if (typeof rigSource.available === "boolean") {
        setRigAvailable(rigSource.available);
      }
      setRigError(typeof rigSource.error === "string" ? rigSource.error : undefined);

      const channels = Array.isArray(rigSource.channels)
        ? rigSource.channels
            .filter((value): value is number => typeof value === "number")
            .map((value) => Math.round(value))
        : undefined;
      if (channels && channels.length > 0) {
        setRigAngles(channels);
      }

      if (typeof rigSource.baseChannel === "number") {
        setRigBaseChannel(Math.max(0, Math.round(rigSource.baseChannel)));
      }

      const basePositions = Array.isArray(rigSource.basePositions)
        ? rigSource.basePositions
            .filter((value): value is number => typeof value === "number")
            .map((value) => Math.round(value))
        : undefined;
      if (basePositions && basePositions.length > 0) {
        setRigBasePositions(basePositions);
      }

      if (typeof rigSource.closedAngle === "number") {
        setRigClosedAngle(Math.round(rigSource.closedAngle));
      }
      if (typeof rigSource.openAngle === "number") {
        setRigOpenAngle(Math.round(rigSource.openAngle));
      }
      if (typeof rigSource.diagnosticBaseToValveDelayS === "number") {
        setRigDiagnosticBaseToValveDelayS(clamp(rigSource.diagnosticBaseToValveDelayS, 0, 30));
      }

      const stirDurations = Array.isArray(rigSource.stirrerDurations)
        ? rigSource.stirrerDurations
            .filter((value): value is number => typeof value === "number")
            .map((value) => Math.round(value))
        : undefined;
      if (stirDurations && stirDurations.length > 0) {
        setRigStirrerDurations(stirDurations);
      }

      if (typeof rigSource.stirrerActive === "boolean") {
        setRigStirrerActive(rigSource.stirrerActive);
      }

      if (channels && channels.length > 0) {
        setRigPendingAngles((prev) => {
          const next: Record<number, number> = {};
          for (const [channelKey, pendingAngle] of Object.entries(prev)) {
            const channel = Number(channelKey);
            const current = channels[channel];
            if (Math.round(current) !== Math.round(pendingAngle)) {
              next[channel] = pendingAngle;
            }
          }
          return next;
        });
      }

      setRigStateSynced(true);
      return;
    }

    const legacyAngles = Array.isArray(payload.angles)
      ? payload.angles
          .filter((value): value is number => typeof value === "number")
          .map((value) => Math.round(value))
      : undefined;
    if (legacyAngles && legacyAngles.length > 0) {
      setRigAngles(legacyAngles);
      setRigPendingAngles((prev) => {
        const next: Record<number, number> = {};
        for (const [channelKey, pendingAngle] of Object.entries(prev)) {
          const channel = Number(channelKey);
          const current = legacyAngles[channel];
          if (Math.round(current) !== Math.round(pendingAngle)) {
            next[channel] = pendingAngle;
          }
        }
        return next;
      });
      setRigStateSynced(true);
    }
  };

  const requestState = () => {
    sendMessage({ type: "get_state" });
  };

  const connect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    Object.values(debounceTimersRef.current).forEach(clearTimeout);
    debounceTimersRef.current = {};

    pushLog(buildLogEntry("info", `Connecting to ${wsUrl}`));
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setRigStateSynced(false);
      setRigPendingAngles({});
      setThermalStreamError(undefined);
      setThermalStreamNonce(Date.now());
      setWebcamStreamError(undefined);
      setWebcamStreamNonce(Date.now());
      pushLog(buildLogEntry("info", "WebSocket connected"));
      requestState();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;

        if (payload.type !== "thermal" && payload.type !== "webcam") {
          pushLog(buildLogEntry("in", event.data));
        }

        if (payload.type === "thermal") {
          syncThermalFromPayload(payload);
          return;
        }
        if (payload.type === "webcam") {
          syncWebcamFromPayload(payload);
          return;
        }

        if (payload.type === "state") {
          syncFromState(payload);
          return;
        }

        if (payload.type === "ack") {
          const ackId = payload.id;
          const ackAngle =
            typeof payload.angle === "number"
              ? payload.angle
              : typeof payload.position === "number"
                ? payload.position
                : undefined;
          if (
            payload.subsystem === "xarm" &&
            payload.action === "set" &&
            typeof ackId === "number" &&
            typeof ackAngle === "number"
          ) {
            setXarmServos((prev) =>
              prev.map((servo) =>
                servo.id === ackId
                  ? {
                      ...servo,
                      angleDeg: clamp(Math.round(ackAngle), xarmMinAngleDeg, xarmMaxAngleDeg),
                    }
                  : servo,
              ),
            );
          }

          const ackChannel = payload.channel;
          const ackRigAngle = payload.angle;
          if (
            payload.subsystem === "rig" &&
            payload.action === "set" &&
            typeof ackChannel === "number" &&
            typeof ackRigAngle === "number"
          ) {
            setRigPendingAngles((prev) => ({
              ...prev,
              [ackChannel]: Math.round(ackRigAngle),
            }));
            setRigAngles((prev) =>
              prev.map((angle, index) => (index === ackChannel ? Math.round(ackRigAngle) : angle)),
            );
          }

          if (payload.subsystem === "automation" && typeof payload.action === "string") {
            if (payload.action === "cleanup") {
              setCleanupRunning(false);
            }
            if (payload.action === "dispense") {
              setDispenseRunning(false);
            }
            if (payload.action === "stir") {
              setAutomationStirRunning(false);
            }
          }
        }

        if (
          payload.type === "diagnostic" &&
          payload.subsystem === "rig" &&
          typeof payload.status === "string"
        ) {
          pushLog(buildLogEntry("info", `Rig diagnostic ${payload.status}`));
        }

        if (payload.type === "error" && typeof payload.error === "string") {
          setCleanupRunning(false);
          setDispenseRunning(false);
          setAutomationStirRunning(false);
          pushLog(buildLogEntry("info", `Controller error: ${payload.error}`));
        }
      } catch {
        pushLog(buildLogEntry("in", event.data));
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setRigStateSynced(false);
      setRigStirrerActive(false);
      setRigPendingAngles({});
      setCleanupRunning(false);
      setDispenseRunning(false);
      setAutomationStirRunning(false);
      setThermalStreamError(undefined);
      setWebcamStreamError(undefined);
      pushLog(buildLogEntry("info", "WebSocket disconnected"));
    };

    socket.onerror = () => {
      pushLog(buildLogEntry("info", "WebSocket error"));
    };
  };

  const disconnect = () => {
    wsRef.current?.close();
  };

  const setLocalXArmAngle = (id: number, angleDeg: number) => {
    setXarmServos((prev) =>
      prev.map((servo) => (servo.id === id ? { ...servo, angleDeg } : servo)),
    );
  };

  const sendXArmAngle = (id: number, angleDeg: number) => {
    sendMessage({
      type: "xarm_set",
      id,
      angle: clamp(angleDeg, xarmMinAngleDeg, xarmMaxAngleDeg),
      moveMs: xarmMoveMs,
    });
  };

  const queueXArmAngle = (id: number, angleDeg: number) => {
    const clamped = clamp(angleDeg, xarmMinAngleDeg, xarmMaxAngleDeg);
    setLocalXArmAngle(id, clamped);

    const existing = debounceTimersRef.current[id];
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    debounceTimersRef.current[id] = setTimeout(() => {
      sendXArmAngle(id, clamped);
      delete debounceTimersRef.current[id];
    }, SEND_DEBOUNCE_MS);
  };

  const setAllXArm = (angleDeg: number) => {
    const clamped = clamp(angleDeg, xarmMinAngleDeg, xarmMaxAngleDeg);
    setXarmServos((prev) => prev.map((servo) => ({ ...servo, angleDeg: clamped })));
    sendMessage({
      type: "xarm_set_many",
      moveMs: xarmMoveMs,
      targets: xarmServos.map((servo) => ({ id: servo.id, angle: clamped })),
    });
  };

  const setAllXArmToCenters = () => {
    setXarmServos((prev) => prev.map((servo) => ({ ...servo, angleDeg: servo.centerDeg })));
    sendMessage({
      type: "xarm_set_many",
      moveMs: xarmMoveMs,
      targets: xarmServos.map((servo) => ({
        id: servo.id,
        angle: servo.centerDeg,
      })),
    });
  };

  const recenterXArm = () => {
    sendMessage({ type: "xarm_recenter", moveMs: xarmMoveMs });
  };

  const scanXArm = () => {
    sendMessage({ type: "xarm_scan" });
  };

  const runCleanup = () => {
    if (cleanupRunning) {
      return;
    }
    setCleanupRunning(true);
    const sent = sendMessage({ type: "automation_cleanup", moveMs: xarmMoveMs });
    if (!sent) {
      setCleanupRunning(false);
    }
  };

  const runDispense = () => {
    if (dispenseRunning) {
      return;
    }
    const dropper = clamp(Math.round(dispenseDropper), 1, 3);
    const amountMl = Math.max(1, Math.round(dispenseAmountMl));
    setDispenseDropper(dropper);
    setDispenseAmountMl(amountMl);
    setDispenseRunning(true);
    const sent = sendMessage({ type: "automation_dispense", dropper, amountMl });
    if (!sent) {
      setDispenseRunning(false);
    }
  };

  const runAutomationStir = () => {
    if (automationStirRunning) {
      return;
    }
    const durationS = clamp(Number(automationStirDurationS), 0.1, 3600);
    setAutomationStirDurationS(durationS);
    setAutomationStirRunning(true);
    const sent = sendMessage({ type: "automation_stir", durationS });
    if (!sent) {
      setAutomationStirRunning(false);
    }
  };

  const handleRigAngleChange = (channel: number, value: number) => {
    if (rigControlsDisabled) {
      return;
    }
    const nextValue = Math.round(value);
    const sent = sendMessage({ type: "rig_set", channel, angle: nextValue });
    if (!sent) {
      return;
    }
    setRigPendingAngles((prev) => ({ ...prev, [channel]: nextValue }));
    setRigAngles((prev) => prev.map((angle, index) => (index === channel ? nextValue : angle)));
  };

  const handleRigStir = (duration: number) => {
    if (rigControlsDisabled) {
      return;
    }
    sendMessage({ type: "rig_stir", duration });
  };

  const handleRigDiagnostic = () => {
    if (rigControlsDisabled) {
      pushLog(buildLogEntry("info", "Rig controls are waiting for connection/state sync"));
      return;
    }
    if (!rigBaseAtHome) {
      pushLog(buildLogEntry("info", "Base must be at home before running rig diagnostic"));
      return;
    }
    sendMessage({
      type: "rig_diagnostic",
      baseToValveDelayS: rigDiagnosticBaseToValveDelayS,
    });
  };

  const closeRigAll = () => {
    if (rigControlsDisabled) {
      return;
    }
    const next = Array.from(
      { length: Math.max(rigAngles.length, DEFAULT_RIG_SERVO_CHANNELS) },
      () => rigClosedAngle,
    );
    setRigAngles(next);
    setRigPendingAngles(
      Object.fromEntries(next.map((angle, channel) => [channel, Math.round(angle)])),
    );
    next.forEach((angle, channel) => {
      sendMessage({ type: "rig_set", channel, angle });
    });
  };

  const reconnectThermalStream = () => {
    setThermalStreamError(undefined);
    setThermalStreamNonce(Date.now());
  };

  const reconnectWebcamStream = () => {
    setWebcamStreamError(undefined);
    setWebcamStreamNonce(Date.now());
  };

  useEffect(() => {
    connect();

    return () => {
      wsRef.current?.close();
      Object.values(debounceTimersRef.current).forEach(clearTimeout);
      debounceTimersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setThermalStreamUrl(deriveThermalStreamUrl(wsUrl));
    setWebcamStreamUrl(deriveWebcamStreamUrl(wsUrl));
  }, [wsUrl]);

  const rigChannels = useMemo(
    () =>
      Array.from({ length: Math.max(rigAngles.length, DEFAULT_RIG_SERVO_CHANNELS) }, (_, i) => i),
    [rigAngles.length],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eef7ff,_#dce8f7_40%,_#cfd9e7)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <StatusHeader
          connected={connected}
          xarmAvailable={xarmAvailable}
          rigAvailable={rigAvailable}
          thermalAvailable={thermalAvailable}
          webcamAvailable={webcamAvailable}
          onRefreshState={requestState}
        />

        <section className="grid gap-4 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-md shadow-sky-100/60 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">WebSocket endpoint</p>
              <p className="text-xs text-slate-500">
                Set this to your Raspberry Pi or controller host if it changes.
              </p>
              <input
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm sm:w-96"
                value={wsUrl}
                onChange={(event) => setWsUrl(event.target.value)}
                placeholder="ws://192.168.50.2:8765"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
              <button
                className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
                type="button"
                onClick={connect}
              >
                Connect
              </button>
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
                type="button"
                onClick={disconnect}
              >
                Disconnect
              </button>
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
                type="button"
                onClick={scanXArm}
              >
                Scan xArm
              </button>
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100"
                type="button"
                onClick={recenterXArm}
              >
                Recenter xArm
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4">
            <ThermalPanel
              thermalAvailable={thermalAvailable}
              thermalError={thermalError}
              thermalMaxTempC={thermalMaxTempC}
              thermalMinTempC={thermalMinTempC}
              thermalFps={thermalFps}
              thermalUpdatedLabel={thermalUpdatedLabel}
              thermalStreamUrl={thermalStreamUrl}
              thermalStreamSrc={thermalStreamSrc}
              thermalStreamError={thermalStreamError}
              onSetThermalStreamUrl={setThermalStreamUrl}
              onReconnect={reconnectThermalStream}
              onStreamLoad={() => setThermalStreamError(undefined)}
              onStreamError={() =>
                setThermalStreamError(
                  "Unable to load MJPEG stream. Verify Pi stream endpoint and network.",
                )
              }
            />
            <WebcamPanel
              webcamAvailable={webcamAvailable}
              webcamError={webcamError}
              webcamFps={webcamFps}
              webcamUpdatedLabel={webcamUpdatedLabel}
              webcamStreamUrl={webcamStreamUrl}
              webcamStreamSrc={webcamStreamSrc}
              webcamStreamError={webcamStreamError}
              onSetWebcamStreamUrl={setWebcamStreamUrl}
              onReconnect={reconnectWebcamStream}
              onStreamLoad={() => setWebcamStreamError(undefined)}
              onStreamError={() =>
                setWebcamStreamError(
                  "Unable to load MJPEG stream. Verify USB webcam access on the Pi.",
                )
              }
            />

            <div className="grid gap-4 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-md shadow-sky-100/60 backdrop-blur">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">xArm motion settings</p>
                    <p className="text-xs text-slate-500">
                      Angle bounds {xarmMinAngleDeg}..{xarmMaxAngleDeg} deg
                    </p>
                    {!xarmAvailable && xarmError && (
                      <p className="mt-1 text-xs text-rose-600">xArm error: {xarmError}</p>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700">Move (ms)</span>
                    <input
                      className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-right font-medium tabular-nums"
                      type="number"
                      min={50}
                      max={5000}
                      value={xarmMoveMs}
                      onChange={(event) =>
                        setXarmMoveMs(clamp(Number(event.target.value), 50, 5000))
                      }
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => setAllXArm(xarmMinAngleDeg)}
                    disabled={!xarmAvailable}
                  >
                    All to min
                  </button>
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => setAllXArm(xarmMidAngleDeg)}
                    disabled={!xarmAvailable}
                  >
                    All to mid
                  </button>
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => setAllXArm(xarmMaxAngleDeg)}
                    disabled={!xarmAvailable}
                  >
                    All to max
                  </button>
                  <button
                    className="rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={setAllXArmToCenters}
                    disabled={!xarmAvailable}
                  >
                    All to centers
                  </button>
                  <button
                    className="rounded-md border border-rose-300 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={runCleanup}
                    disabled={cleanupDisabled}
                  >
                    {cleanupRunning ? "cleaning..." : "remove flask"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {xarmServos.map((servo) => (
                  <div
                    key={servo.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold">xArm ID {servo.id}</p>
                        <p className="text-xs text-slate-500">
                          Center {Math.round(servo.centerDeg)} deg
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          servo.online
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {servo.online ? "Online" : "No reply"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-xs text-slate-500">Angle</p>
                      <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {Math.round(servo.angleDeg)} deg
                      </p>
                    </div>

                    <input
                      className="mt-2 w-full accent-sky-700"
                      type="range"
                      min={xarmMinAngleDeg}
                      max={xarmMaxAngleDeg}
                      value={Math.round(servo.angleDeg)}
                      onChange={(event) => queueXArmAngle(servo.id, Number(event.target.value))}
                      disabled={!xarmAvailable}
                    />

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[xarmMinAngleDeg, xarmMidAngleDeg, xarmMaxAngleDeg, servo.centerDeg].map(
                        (value, index) => (
                          <button
                            key={`${servo.id}-${value}-${index}`}
                            className={`rounded-md border px-2 py-1 text-xs font-medium ${
                              Math.round(servo.angleDeg) === value
                                ? "border-sky-700 bg-sky-700 text-white"
                                : "border-slate-200 bg-white hover:bg-slate-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                            type="button"
                            onClick={() => {
                              setLocalXArmAngle(servo.id, value);
                              sendXArmAngle(servo.id, value);
                            }}
                            disabled={!xarmAvailable}
                          >
                            {index === 0 && "Min"}
                            {index === 1 && "Mid"}
                            {index === 2 && "Max"}
                            {index === 3 && "Center"}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <input
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums"
                        type="number"
                        min={xarmMinAngleDeg}
                        max={xarmMaxAngleDeg}
                        value={Math.round(servo.angleDeg)}
                        onChange={(event) => {
                          const next = clamp(
                            Number(event.target.value),
                            xarmMinAngleDeg,
                            xarmMaxAngleDeg,
                          );
                          setLocalXArmAngle(servo.id, next);
                        }}
                        disabled={!xarmAvailable}
                      />
                      <button
                        className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                        onClick={() => sendXArmAngle(servo.id, servo.angleDeg)}
                        disabled={!xarmAvailable}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-white/85 p-4 shadow-md shadow-emerald-100/60 backdrop-blur">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-semibold">Process functions (Pi-side)</p>
                  <p className="text-xs text-slate-500">
                    High-level calls handled on the Raspberry Pi over WebSocket.
                  </p>
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-xs font-semibold text-slate-700">
                      dispense(dropper number, amount mL)
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="text-xs text-slate-600">
                        Dropper
                        <input
                          className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums"
                          type="number"
                          min={1}
                          max={3}
                          step={1}
                          value={dispenseDropper}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (!Number.isFinite(parsed)) {
                              return;
                            }
                            setDispenseDropper(clamp(parsed, 1, 3));
                          }}
                        />
                      </label>
                      <label className="text-xs text-slate-600">
                        Amount (mL)
                        <input
                          className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums"
                          type="number"
                          min={1}
                          step={1}
                          value={dispenseAmountMl}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (!Number.isFinite(parsed)) {
                              return;
                            }
                            setDispenseAmountMl(Math.max(1, parsed));
                          }}
                        />
                      </label>
                      <button
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                        onClick={runDispense}
                        disabled={dispenseDisabled}
                      >
                        {dispenseRunning ? "dispensing..." : "dispense"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <p className="text-xs font-semibold text-slate-700">stir(duration seconds)</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="text-xs text-slate-600">
                        Duration (s)
                        <input
                          className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums"
                          type="number"
                          min={0.1}
                          max={3600}
                          step={0.1}
                          value={automationStirDurationS}
                          onChange={(event) => {
                            const parsed = Number(event.target.value);
                            if (!Number.isFinite(parsed)) {
                              return;
                            }
                            setAutomationStirDurationS(clamp(parsed, 0.1, 3600));
                          }}
                        />
                      </label>
                      <button
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        type="button"
                        onClick={runAutomationStir}
                        disabled={automationStirDisabled}
                      >
                        {automationStirRunning ? "stirring..." : "stir"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">Original rig controls</p>
                    <p className="text-xs text-slate-500">
                      PCA9685 channels with base easing and stirrer GPIO.
                    </p>
                    {!rigAvailable && rigError && (
                      <p className="mt-1 text-xs text-rose-600">Rig error: {rigError}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        rigStirrerActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Stirrer {rigStirrerActive ? "ON" : "OFF"}
                    </span>
                    <button
                      className={`rounded-md px-3 py-1 text-xs font-semibold text-white ${
                        rigDiagnosticDisabled
                          ? "cursor-not-allowed bg-slate-300"
                          : "bg-slate-900 hover:bg-slate-700"
                      }`}
                      type="button"
                      onClick={handleRigDiagnostic}
                      disabled={rigDiagnosticDisabled}
                    >
                      Run diagnostic
                    </button>
                    <button
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={closeRigAll}
                      disabled={rigControlsDisabled}
                    >
                      Close all
                    </button>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="text-xs text-slate-600">
                      Diagnostic requires base at {rigBasePositions[0] ?? 0} deg. Current base:{" "}
                      {Math.round(rigAngles[rigBaseChannel] ?? 0)} deg.
                    </p>
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold">Delay after base stop (s)</span>
                      <input
                        className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right font-medium tabular-nums"
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={rigDiagnosticBaseToValveDelayS}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          if (!Number.isFinite(parsed)) {
                            return;
                          }
                          setRigDiagnosticBaseToValveDelayS(clamp(parsed, 0, 30));
                        }}
                        disabled={rigControlsDisabled}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {rigStirrerDurations.map((duration) => (
                    <button
                      key={`stir-${duration}`}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={() => handleRigStir(duration)}
                      disabled={rigControlsDisabled}
                    >
                      Stir {duration}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {rigChannels.map((channel) => {
                  const positions =
                    channel === rigBaseChannel ? rigBasePositions : [rigClosedAngle, rigOpenAngle];
                  const gridCols = positions.length === 3 ? "grid-cols-3" : "grid-cols-2";
                  const angle = Math.round(rigAngles[channel] ?? rigClosedAngle);
                  const selectedAngle = Math.round(rigPendingAngles[channel] ?? angle);

                  return (
                    <div
                      key={`rig-channel-${channel}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          Channel {channel}
                          {channel === rigBaseChannel ? " (Base rotation)" : ""}
                        </p>
                        <span className="text-sm font-semibold tabular-nums">{selectedAngle}</span>
                      </div>

                      <div className={`mt-3 grid ${gridCols} gap-2`}>
                        {positions.map((position) => {
                          const rounded = Math.round(position);
                          return (
                            <button
                              key={`rig-${channel}-${rounded}`}
                              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                                selectedAngle === rounded
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white hover:bg-slate-100"
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                              type="button"
                              onClick={() => handleRigAngleChange(channel, rounded)}
                              disabled={rigControlsDisabled}
                            >
                              {labelForRigPosition(
                                channel,
                                rounded,
                                rigBaseChannel,
                                rigClosedAngle,
                                rigOpenAngle,
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <MessageLogPanel
            logs={logs}
            xarmOnlineIdsLabel={
              xarmServos
                .filter((servo) => servo.online)
                .map((servo) => servo.id)
                .join(", ") || "none"
            }
            rigStirrerActive={rigStirrerActive}
            onClearLogs={() => setLogs([])}
          />
        </section>
      </div>
    </div>
  );
}
