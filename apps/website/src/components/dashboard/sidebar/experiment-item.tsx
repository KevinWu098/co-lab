"use client";

import { usePathname, useRouter } from "next/navigation";
import { Pulse } from "@/components/co-lab/pulse";
import type { Experiment } from "@/components/dashboard/sidebar/types";
import { statusLabel } from "@/components/dashboard/sidebar/types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { IterationList } from "./iteration-list";

interface ExperimentItemProps {
  experiment: Experiment;
  active?: boolean;
  defaultSelected?: boolean;
}

export function ExperimentItem({ experiment, active = true, defaultSelected = false }: ExperimentItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSelected =
    pathname.startsWith(`/dashboard/${experiment.id}`) ||
    (defaultSelected && pathname === "/dashboard");

  const handleClick = () => {
    if (!isSelected && experiment.iterations.length > 0) {
      const latest = experiment.iterations[0];
      router.push(`/dashboard/${experiment.id}/${latest.id}`);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="h-fit cursor-pointer"
          isActive={isSelected}
          onClick={handleClick}
        >
          <div className="flex items-start gap-0">
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
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {isSelected && (
        <IterationList
          experimentId={experiment.id}
          iterations={experiment.iterations}
        />
      )}
    </>
  );
}
