import Link from "next/link";
import type { Iteration } from "@/components/dashboard/sidebar/types";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface IterationItemProps {
  experimentId: string;
  iteration: Iteration;
}

export function IterationItem({ experimentId, iteration }: IterationItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="h-fit pl-8">
        <Link
          href={`/dashboard/${experimentId}/${iteration.id}`}
          className="items-start gap-2"
        >
          <span className="text-muted-foreground mt-px shrink-0 font-mono text-[0.6rem]">
            #{iteration.number}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs">{iteration.summary}</span>
            <span className="text-muted-foreground font-mono text-[0.6rem]">
              {iteration.createdAt}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
