import React from "react";
import type { LogEntry } from "../types";

type MessageLogPanelProps = {
  logs: LogEntry[];
  xarmOnlineIdsLabel: string;
  rigStirrerActive: boolean;
  onClearLogs: () => void;
};

export function MessageLogPanel({
  logs,
  xarmOnlineIdsLabel,
  rigStirrerActive,
  onClearLogs,
}: MessageLogPanelProps) {
  return (
    <aside className="grid gap-3 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-md shadow-sky-100/60 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Message log</p>
          <p className="text-xs text-slate-500">Newest first.</p>
        </div>
        <button
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium hover:bg-slate-100"
          type="button"
          onClick={onClearLogs}
        >
          Clear
        </button>
      </div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600">
        <p>xArm online IDs: {xarmOnlineIdsLabel}</p>
        <p className="mt-1">Rig stirrer: {rigStirrerActive ? "active" : "idle"}</p>
      </div>
      <div className="flex max-h-[680px] flex-col gap-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
        {logs.length === 0 && <p className="text-slate-500">No messages yet.</p>}
        {logs.map((entry) => (
          <div key={entry.id} className="rounded-md border border-slate-200 bg-white px-2 py-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{entry.timestamp}</span>
              <span className="uppercase">{entry.direction}</span>
            </div>
            <p className="mt-1 break-words text-slate-700">{entry.message}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
