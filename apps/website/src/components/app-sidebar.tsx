import { FlaskConicalIcon } from "lucide-react";
import type * as React from "react";
import { Pulse } from "@/components/co-lab/pulse";
import { ContentToggle } from "@/components/dashboard/content-toggle";
import { experiments } from "@/components/dashboard/sidebar/data";
import { ExperimentGroup } from "@/components/dashboard/sidebar/experiment-group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const active = experiments.filter((e) => e.status === "running" || e.status === "waiting");
  const inactive = experiments.filter((e) => e.status === "idle");

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
        <ExperimentGroup label="Active" experiments={active} defaultFirstSelected />
        <ExperimentGroup label="Inactive" experiments={inactive} active={false} />
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between p-2">
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
