"use client";

import {
  CameraIcon,
  GrabIcon,
  type LucideIcon,
  PipetteIcon,
  RefreshCwIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  label: string;
  icon: LucideIcon;
  status: "online" | "offline";
  detail?: string;
}

export function EquipmentStatus() {
  const { state } = useHardwareContext();

  const equipment: Equipment[] = useMemo(
    () => [
      {
        id: "connection",
        label: "Hardware",
        icon: state.connected ? WifiIcon : WifiOffIcon,
        status: state.connected ? "online" : "offline",
        detail: state.connected ? "Connected" : "Disconnected",
      },
      {
        id: "arm",
        label: "Arm",
        icon: GrabIcon,
        status: state.xarm.available ? "online" : "offline",
        detail: state.xarm.available
          ? `${state.xarm.onlineIds.length} servos`
          : state.xarm.error ?? undefined,
      },
      {
        id: "dropper",
        label: "Dropper",
        icon: PipetteIcon,
        status: state.rig.available ? "online" : "offline",
        detail: state.rig.stirrerActive ? "Stirring..." : undefined,
      },
      {
        id: "camera",
        label: "Cameras",
        icon: CameraIcon,
        status: state.thermal.available || state.webcam.available ? "online" : "offline",
        detail:
          state.thermal.maxTempC != null
            ? `${state.thermal.maxTempC.toFixed(1)}°C`
            : undefined,
      },
      {
        id: "stirrer",
        label: "Stirrer",
        icon: RefreshCwIcon,
        status: state.rig.available ? "online" : "offline",
        detail: state.rig.stirrerActive ? "Active" : undefined,
      },
    ],
    [state],
  );

  return (
    <div className="grid grid-cols-5 gap-0">
      {equipment.map((eq, i) => {
        const Icon = eq.icon;
        const isOnline = eq.status === "online";
        const isLast = i === equipment.length - 1;

        return (
          <Card
            className={cn(
              "flex flex-row items-center gap-3 rounded-none bg-background px-4 py-3",
              i === 0 && "rounded-l-md",
              isLast && "rounded-r-md",
              !isLast && "border-r-0",
            )}
            key={eq.id}
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                isOnline
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm leading-none">
                {eq.label}
              </span>
              <span className="flex items-center gap-1.5 text-xs leading-none">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    isOnline ? "bg-emerald-500" : "bg-muted-foreground/50",
                  )}
                />
                <span className="text-muted-foreground">
                  {eq.detail ?? (isOnline ? "Online" : "Offline")}
                </span>
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
