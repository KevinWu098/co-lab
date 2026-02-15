import React from "react";

type WebcamPanelProps = {
  webcamAvailable: boolean;
  webcamError?: string;
  webcamFps?: number;
  webcamUpdatedLabel: string;
  webcamStreamUrl: string;
  webcamStreamSrc: string;
  webcamStreamError?: string;
  onSetWebcamStreamUrl: (url: string) => void;
  onReconnect: () => void;
  onStreamLoad: () => void;
  onStreamError: () => void;
};

export function WebcamPanel({
  webcamAvailable,
  webcamError,
  webcamFps,
  webcamUpdatedLabel,
  webcamStreamUrl,
  webcamStreamSrc,
  webcamStreamError,
  onSetWebcamStreamUrl,
  onReconnect,
  onStreamLoad,
  onStreamError,
}: WebcamPanelProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-cyan-100 bg-white/85 p-4 shadow-md shadow-cyan-100/60 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">USB webcam</p>
          <p className="text-xs text-slate-500">MJPEG stream from Raspberry Pi USB camera.</p>
          {webcamError && <p className="mt-1 text-xs text-rose-600">{webcamError}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              webcamAvailable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            Webcam {webcamAvailable ? "ready" : "offline"}
          </span>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-100"
            type="button"
            onClick={onReconnect}
          >
            Reconnect stream
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] text-slate-500 uppercase">FPS</p>
          <p className="text-lg font-semibold tabular-nums">
            {webcamFps !== undefined ? webcamFps.toFixed(1) : "--"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] text-slate-500 uppercase">Updated</p>
          <p className="text-sm font-semibold tabular-nums">{webcamUpdatedLabel}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-600 uppercase">Stream URL</label>
        <input
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={webcamStreamUrl}
          onChange={(event) => onSetWebcamStreamUrl(event.target.value)}
          placeholder="http://192.168.50.2:8081/webcam.mjpeg"
        />
        {webcamStreamError && (
          <p className="text-xs text-rose-600">Stream error: {webcamStreamError}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        <img
          src={webcamStreamSrc}
          alt="USB webcam stream"
          className="h-auto w-full object-contain"
          onLoad={onStreamLoad}
          onError={onStreamError}
        />
      </div>
    </div>
  );
}
