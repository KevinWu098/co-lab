import {
  CameraIcon,
  GrabIcon,
  PipetteIcon,
  type LucideIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Equipment {
  id: string;
  label: string;
  icon: LucideIcon;
  status: "online" | "offline";
}

const EQUIPMENT: Equipment[] = [
  { id: "camera", label: "Camera", icon: CameraIcon, status: "online" },
  { id: "arm", label: "Arm", icon: GrabIcon, status: "online" },
  { id: "dropper", label: "Dropper", icon: PipetteIcon, status: "offline" },
  { id: "stirrer", label: "Stirrer", icon: RefreshCwIcon, status: "online" },
];

export function EquipmentStatus() {
  return (
    <div className="grid grid-cols-4 gap-0">
      {EQUIPMENT.map((eq, i) => {
        const Icon = eq.icon;
        const isOnline = eq.status === "online";
        const isLast = i === EQUIPMENT.length - 1;

        return (
          <Card
            key={eq.id}
            className={cn(
              "flex flex-row items-center gap-3 rounded-none bg-background px-4 py-3",
              i === 0 && "rounded-l-md",
              isLast && "rounded-r-md",
              !isLast && "border-r-0",
            )}
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
              <span className="text-sm font-medium leading-none">
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
                  {isOnline ? "Online" : "Offline"}
                </span>
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
