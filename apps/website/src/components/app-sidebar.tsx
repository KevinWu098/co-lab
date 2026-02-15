"use client";

import { FlaskConicalIcon, PlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type * as React from "react";
import { useEffect, useRef } from "react";
import { Pulse } from "@/components/co-lab/pulse";
import { ContentToggle } from "@/components/dashboard/content-toggle";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import { ExperimentGroup } from "@/components/dashboard/sidebar/experiment-group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

let experimentCounter = 7;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { experiments, addExperiment } = useExperiments();
  const { setOpen } = useSidebar();
  const active = experiments.filter((e) => e.status === "running" || e.status === "waiting");
  const inactive = experiments.filter((e) => e.status === "idle");

  // Stable ref so pathname effect doesn't re-fire when setOpen identity changes
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  // Auto-expand on /dashboard, auto-collapse on sub-pages
  useEffect(() => {
    setOpenRef.current(pathname === "/dashboard");
  }, [pathname]);

  const handleNewExperiment = () => {
    const id = `exp-${String(experimentCounter).padStart(3, "0")}`;
    experimentCounter++;
    addExperiment({
      id,
      title: "Untitled experiment",
      status: "running",
      updatedAt: "just now",
      iterations: [],
    });
    router.push(`/dashboard/experiment/${id}`);
  };

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Co:Lab">
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <FlaskConicalIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-mono font-medium">Co:Lab</span>
                  <span className="text-xs">v2.15.26</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer border"
                onClick={handleNewExperiment}
                tooltip="New experiment"
                variant={"outline"}
              >
                <PlusIcon className="size-4" />
                <span>New experiment</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <ExperimentGroup experiments={active} label="Active" />
        <ExperimentGroup active={false} experiments={inactive} label="Inactive" />
      </SidebarContent>

      <SidebarFooter className="w-full border-t px-4">
        <div className="flex items-center group-data-[collapsible=icon]:justify-center">
          <div className="flex flex-1 items-center gap-0 overflow-hidden">
            <Pulse
              className="mr-2 shrink-0 group-data-[collapsible=icon]:mx-auto"
              variant="running"
            />
            <span className="mr-2 truncate font-mono text-sm group-data-[collapsible=icon]:hidden">
              All systems nominal
            </span>
          </div>
          <div className="shrink-0 group-data-[collapsible=icon]:hidden">
            <ContentToggle />
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
