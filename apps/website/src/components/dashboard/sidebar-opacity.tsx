"use client";

import type { ReactNode } from "react";
import { useContentVisibility } from "@/components/dashboard/content-visibility";

export function SidebarOpacity({ children }: { children: ReactNode }) {
  const { visible } = useContentVisibility();

  return (
    <div
      className="transition-opacity duration-300 ease-in-out"
      style={{ opacity: visible ? 1 : 0.15 }}
    >
      {children}
    </div>
  );
}
