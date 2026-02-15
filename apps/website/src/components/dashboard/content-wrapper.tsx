"use client";

import type { ReactNode } from "react";
import { useContentVisibility } from "@/components/dashboard/content-visibility";

export function ContentWrapper({ children }: { children: ReactNode }) {
  const { visible } = useContentVisibility();

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col ${visible ? "" : "transition-opacity duration-300 ease-in-out"}`}
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {children}
    </div>
  );
}
