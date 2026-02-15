import React from "react";

type StatusHeaderProps = {
  connected: boolean;
  xarmAvailable: boolean;
  rigAvailable: boolean;
  thermalAvailable: boolean;
  webcamAvailable: boolean;
  onRefreshState: () => void;
};

export function StatusHeader({
  connected,
  xarmAvailable,
  rigAvailable,
  thermalAvailable,
  webcamAvailable,
  onRefreshState,
}: StatusHeaderProps) {
  return (
    <header className="rounded-2xl border border-sky-100 bg-white/85 p-5 shadow-lg shadow-sky-100/60 backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.28em] text-sky-700 uppercase">
        Dual Controller Dashboard
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Arm + Rig + Thermal + Webcam
          </h1>
          <p className="text-sm text-slate-600">
            xArm bus-servo control, rig controls, and live thermal + USB webcam video in one UI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              connected ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              xarmAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            xArm {xarmAvailable ? "ready" : "offline"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              rigAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            Rig {rigAvailable ? "ready" : "offline"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              thermalAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            Thermal {thermalAvailable ? "ready" : "offline"}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              webcamAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            Webcam {webcamAvailable ? "ready" : "offline"}
          </span>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium hover:bg-slate-100"
            type="button"
            onClick={onRefreshState}
          >
            Refresh state
          </button>
        </div>
      </div>
    </header>
  );
}
