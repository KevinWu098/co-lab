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
          className="items-start gap-2"
          href={`/dashboard/${experimentId}/${iteration.id}`}
        >
          <span className="mt-px shrink-0 font-mono text-[0.6rem] text-muted-foreground">
            #{iteration.number}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs">{iteration.summary}</span>
            <span className="font-mono text-[0.6rem] text-muted-foreground">
              {iteration.createdAt}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
