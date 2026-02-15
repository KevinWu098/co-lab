"use client";

import { usePathname, useRouter } from "next/navigation";
import { Pulse } from "@/components/co-lab/pulse";
import type { Experiment } from "@/components/dashboard/sidebar/types";
import { statusLabel } from "@/components/dashboard/sidebar/types";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { IterationList } from "./iteration-list";

interface ExperimentItemProps {
  experiment: Experiment;
  active?: boolean;
  defaultSelected?: boolean;
}

export function ExperimentItem({
  experiment,
  active = true,
  defaultSelected = false,
}: ExperimentItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const experimentPath = `/dashboard/experiment/${experiment.id}`;
  const isSelected =
    pathname.startsWith(experimentPath) || (defaultSelected && pathname === "/dashboard");

  const handleClick = () => {
    if (!isSelected) {
      router.push(experimentPath);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="h-fit cursor-pointer gap-0 group-data-[collapsible=icon]:justify-center"
          isActive={isSelected}
          onClick={handleClick}
          tooltip={experiment.title}
        >
          <Pulse
            className={`shrink-0 ${!isCollapsed ? "mr-2" : ""}`}
            variant={active ? experiment.status : "inactive"}
          />
          {!isCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{experiment.title}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {statusLabel[experiment.status]} · {experiment.updatedAt}
              </span>
            </div>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {isSelected && !isCollapsed && (
        <IterationList experimentId={experiment.id} iterations={experiment.iterations} />
      )}
    </>
  );
}
