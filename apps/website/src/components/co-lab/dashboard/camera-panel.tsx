"use client";

import { RefreshCwIcon, SpotlightIcon, VideoIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Pulse } from "@/components/co-lab/pulse";
import {
  deriveHttpBaseUrl,
  THERMAL_STREAM_PATH,
  WEBCAM_STREAM_PATH,
} from "@/lib/hardware/constants";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import { cn } from "@/lib/utils";

type CameraId = "webcam" | "thermal";

interface CameraSource {
  id: CameraId;
  label: string;
  icon: typeof VideoIcon;
  connected: boolean;
  streamUrl: string;
  detail?: string;
}

export function CameraPanel() {
  const { state, wsUrl } = useHardwareContext();
  const httpBase = useMemo(() => deriveHttpBaseUrl(wsUrl), [wsUrl]);

  const [selected, setSelected] = useState<Set<CameraId>>(new Set(["webcam"]));
  const [streamNonces, setStreamNonces] = useState<Record<CameraId, number>>({
    webcam: 0,
    thermal: 0,
  });
  const [streamErrors, setStreamErrors] = useState<Record<CameraId, boolean>>({
    webcam: false,
    thermal: false,
  });

  const cameras: CameraSource[] = useMemo(
    () => [
      {
        id: "webcam" as const,
        label: "Webcam",
        icon: VideoIcon,
        connected: state.webcam.available,
        streamUrl: `${httpBase}${WEBCAM_STREAM_PATH}`,
        detail:
          state.webcam.fps != null
            ? `${state.webcam.fps.toFixed(0)} fps`
            : undefined,
      },
      {
        id: "thermal" as const,
        label: "Thermal",
        icon: SpotlightIcon,
        connected: state.thermal.available,
        streamUrl: `${httpBase}${THERMAL_STREAM_PATH}`,
        detail:
          state.thermal.maxTempC != null
            ? `${state.thermal.maxTempC.toFixed(1)}°C`
            : undefined,
      },
    ],
    [state.webcam, state.thermal, httpBase],
  );

  function toggle(id: CameraId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function reconnectStream(id: CameraId) {
    setStreamErrors((prev) => ({ ...prev, [id]: false }));
    setStreamNonces((prev) => ({ ...prev, [id]: Date.now() }));
  }

  const active = cameras.filter((c) => selected.has(c.id));

  return (
    <div className="flex min-h-0 flex-1 border-t">
      <div className="flex min-h-0 flex-1 gap-2 p-4">
        {active.length === 0 ? (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            No camera selected
          </div>
        ) : (
          active.map((cam) => {
            const nonce = streamNonces[cam.id];
            const hasError = streamErrors[cam.id];
            const src = `${cam.streamUrl}${cam.streamUrl.includes("?") ? "&" : "?"}v=${nonce}`;

            return (
              <div
                key={cam.id}
                className="relative flex h-full flex-1 items-center justify-center overflow-hidden rounded border bg-black"
              >
                {cam.connected && !hasError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    alt={`${cam.label} feed`}
                    className="h-full w-full object-contain"
                    onError={() =>
                      setStreamErrors((prev) => ({
                        ...prev,
                        [cam.id]: true,
                      }))
                    }
                    onLoad={() =>
                      setStreamErrors((prev) => ({
                        ...prev,
                        [cam.id]: false,
                      }))
                    }
                    src={src}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-muted-foreground font-mono text-sm">
                      {hasError
                        ? `${cam.label} stream error`
                        : `${cam.label} offline`}
                    </span>
                    {hasError && (
                      <button
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                        onClick={() => reconnectStream(cam.id)}
                        type="button"
                      >
                        <RefreshCwIcon className="size-3" />
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {/* Temperature overlay for thermal */}
                {cam.id === "thermal" &&
                  cam.connected &&
                  state.thermal.maxTempC != null && (
                    <div className="absolute top-2 right-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">
                      {state.thermal.maxTempC.toFixed(1)}°C
                    </div>
                  )}
              </div>
            );
          })
        )}
      </div>

      <div className="flex w-64 flex-col gap-1 border-l p-3">
        <span className="text-muted-foreground mb-1 px-2 font-mono text-xs uppercase tracking-wider">
          Sources
        </span>
        {cameras.map((cam) => {
          const isSelected = selected.has(cam.id);
          const Icon = cam.icon;

          return (
            <button
              key={cam.id}
              type="button"
              onClick={() => toggle(cam.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="flex flex-1 flex-col text-left">
                <span>{cam.label}</span>
                {cam.detail && (
                  <span className="text-muted-foreground text-[0.65rem] leading-tight">
                    {cam.detail}
                  </span>
                )}
              </span>
              <Pulse
                variant={cam.connected ? "running" : "inactive"}
                className="size-4 p-0 [&>div]:size-1.5"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
