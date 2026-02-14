"use client";

import { FlaskConicalIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { Pulse } from "@/components/co-lab/pulse";
import { ContentToggle } from "@/components/dashboard/content-toggle";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import { ExperimentGroup } from "@/components/dashboard/sidebar/experiment-group";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

let experimentCounter = 7;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { experiments, addExperiment } = useExperiments();
  const active = experiments.filter((e) => e.status === "running" || e.status === "waiting");
  const inactive = experiments.filter((e) => e.status === "idle");

  const handleNewExperiment = () => {
    const id = `exp-${String(experimentCounter).padStart(3, "0")}`;
    experimentCounter++;
    addExperiment({
      id,
      title: "Untitled experiment",
      status: "waiting",
      updatedAt: "just now",
      iterations: [],
    });
    router.push(`/dashboard/experiment/${id}`);
  };

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FlaskConicalIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-mono font-medium">Co:Lab</span>
                  <span className="text-xs">v2.15.26</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-3 pt-3">
          <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={handleNewExperiment}>
            <PlusIcon />
            New experiment
          </Button>
        </div>
        <ExperimentGroup experiments={active} label="Active" />
        <ExperimentGroup active={false} experiments={inactive} label="Inactive" />
      </SidebarContent>

      <SidebarFooter className="h-11 border-t">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center space-x-2">
            <Pulse variant="running" />
            <span className="font-mono text-sm">All systems operational</span>
          </div>

          <ContentToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
