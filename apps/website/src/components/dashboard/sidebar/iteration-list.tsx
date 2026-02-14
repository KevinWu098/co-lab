"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { IterationItem } from "./iteration-item";
import type { Iteration } from "./types";

const ABOVE_FOLD = 2;

interface IterationListProps {
  experimentId: string;
  iterations: Iteration[];
}

export function IterationList({
  experimentId,
  iterations,
}: IterationListProps) {
  const [expanded, setExpanded] = useState(false);

  if (iterations.length === 0) {
    return null;
  }

  const visible = expanded ? iterations : iterations.slice(0, ABOVE_FOLD);
  const hasMore = iterations.length > ABOVE_FOLD;

  return (
    <>
      {visible.map((it) => (
        <IterationItem experimentId={experimentId} iteration={it} key={it.id} />
      ))}
      {hasMore && !expanded && (
        <SidebarMenuItem>
          <button
            className="flex w-full cursor-pointer items-center gap-1 py-1 pl-8 font-mono text-[0.6rem] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <ChevronDownIcon className="size-3" />
            {iterations.length - ABOVE_FOLD} more iteration
            {iterations.length - ABOVE_FOLD > 1 ? "s" : ""}
          </button>
        </SidebarMenuItem>
      )}
      {hasMore && expanded && (
        <SidebarMenuItem>
          <button
            className="flex w-full cursor-pointer items-center gap-1 py-1 pl-8 font-mono text-[0.6rem] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setExpanded(false)}
            type="button"
          >
            <ChevronDownIcon className="size-3 rotate-180" />
            Show less
          </button>
        </SidebarMenuItem>
      )}
    </>
  );
}
