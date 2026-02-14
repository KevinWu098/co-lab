"use client";

import { ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useContentVisibility } from "@/components/dashboard/content-visibility";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarOpacity({ children }: { children: ReactNode }) {
  const { visible, toggle } = useContentVisibility();

  return (
    <>
      <div
        className={visible ? "" : "transition-opacity duration-300 ease-in-out"}
        style={{
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {children}
      </div>
      <Button
        aria-label="Show content"
        className={cn(
          "fixed bottom-4 left-4 z-50 size-8",
          visible ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        onClick={toggle}
        size="icon"
        variant="outline"
      >
        <ImageIcon className="text-muted-foreground size-3.5" />
      </Button>
    </>
  );
}
