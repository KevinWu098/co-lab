"use client";

import { SpotlightIcon, VideoIcon } from "lucide-react";
import { useState } from "react";
import { Pulse } from "@/components/co-lab/pulse";
import { cn } from "@/lib/utils";

type CameraId = "webcam" | "thermal";

interface CameraSource {
  id: CameraId;
  label: string;
  icon: typeof VideoIcon;
  connected: boolean;
}

const CAMERAS: CameraSource[] = [
  { id: "webcam", label: "Webcam", icon: VideoIcon, connected: true },
  { id: "thermal", label: "Thermal", icon: SpotlightIcon, connected: true },
];

export function CameraPanel() {
  const [selected, setSelected] = useState<Set<CameraId>>(new Set(["webcam"]));

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

  const active = CAMERAS.filter((c) => selected.has(c.id));

  return (
    <div className="flex min-h-0 flex-1 border-t">
      <div className="flex min-h-0 flex-1 gap-2 p-4">
        {active.length === 0 ? (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center font-mono text-sm">
            No camera selected
          </div>
        ) : (
          active.map((cam) => (
            <div
              key={cam.id}
              className="text-muted-foreground flex h-full flex-1 items-center justify-center rounded border border-dashed font-mono text-sm"
            >
              {cam.label} feed
            </div>
          ))
        )}
      </div>

      <div className="flex w-64 flex-col gap-1 border-l p-3">
        <span className="text-muted-foreground mb-1 px-2 font-mono text-[0.65rem] uppercase tracking-wider">
          Sources
        </span>
        {CAMERAS.map((cam) => {
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
              <span className="flex-1 text-left">{cam.label}</span>
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
