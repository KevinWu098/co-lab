import Link from "next/link";
import { Pulse } from "@/components/co-lab/pulse";
import type { Experiment } from "@/components/dashboard/sidebar/types";
import { statusLabel } from "@/components/dashboard/sidebar/types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface ExperimentItemProps {
  experiment: Experiment;
  active?: boolean;
}

export function ExperimentItem({ experiment, active = true }: ExperimentItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="h-fit">
        <Link href={`/dashboard/${experiment.id}`} className="items-start gap-0">
          <Pulse
            variant={active ? experiment.status : "inactive"}
            className="mt-0.5 shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{experiment.title}</span>
            <span className="text-muted-foreground font-mono text-[0.65rem]">
              {statusLabel[experiment.status]} · {experiment.updatedAt}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
