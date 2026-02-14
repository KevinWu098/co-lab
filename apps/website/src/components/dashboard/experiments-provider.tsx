"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { experiments as initialExperiments } from "@/components/dashboard/sidebar/data";
import type { Experiment } from "@/components/dashboard/sidebar/types";

interface ExperimentsContextType {
  experiments: Experiment[];
  addExperiment: (experiment: Experiment) => void;
  updateExperiment: (id: string, updates: Partial<Omit<Experiment, "id">>) => void;
}

const ExperimentsContext = createContext<ExperimentsContextType | null>(null);

export function useExperiments() {
  const ctx = useContext(ExperimentsContext);
  if (!ctx) {
    throw new Error("useExperiments must be used within ExperimentsProvider");
  }
  return ctx;
}

export function ExperimentsProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>(initialExperiments);

  const addExperiment = useCallback((experiment: Experiment) => {
    setExperiments((prev) => [experiment, ...prev]);
  }, []);

  const updateExperiment = useCallback((id: string, updates: Partial<Omit<Experiment, "id">>) => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  }, []);

  return (
    <ExperimentsContext.Provider value={{ experiments, addExperiment, updateExperiment }}>
      {children}
    </ExperimentsContext.Provider>
  );
}
