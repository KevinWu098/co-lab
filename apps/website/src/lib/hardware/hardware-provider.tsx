"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useHardware, type UseHardwareReturn } from "./use-hardware";

const HardwareContext = createContext<UseHardwareReturn | null>(null);

export function useHardwareContext(): UseHardwareReturn {
  const ctx = useContext(HardwareContext);
  if (!ctx) {
    throw new Error(
      "useHardwareContext must be used within a HardwareProvider",
    );
  }
  return ctx;
}

export function HardwareProvider({ children }: { children: ReactNode }) {
  const hardware = useHardware();

  return (
    <HardwareContext.Provider value={hardware}>
      {children}
    </HardwareContext.Provider>
  );
}
