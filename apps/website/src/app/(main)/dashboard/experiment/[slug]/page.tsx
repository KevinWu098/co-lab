"use client";

import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chat } from "@/components/co-lab/dashboard/chat";
import { ContentGrid } from "@/components/co-lab/dashboard/content-grid";
import { ContentPanels } from "@/components/co-lab/dashboard/content-panels";
import { DataCard } from "@/components/co-lab/dashboard/data-card";
import { EquipmentStatus } from "@/components/co-lab/dashboard/equipment-status";
import {
  IterationSwitcher,
  type ContentLayout,
} from "@/components/co-lab/dashboard/iteration-switcher";
import type { SetupResult } from "@/components/co-lab/dashboard/new-experiment-setup";
import { NewExperimentSetup } from "@/components/co-lab/dashboard/new-experiment-setup";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function ExperimentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { experiments, updateExperiment } = useExperiments();
  const experiment = experiments.find((e) => e.id === slug);
  const [chatExpanded, setChatExpanded] = useState(false);
  const hasIterations = experiment ? experiment.iterations.length > 0 : false;
  const [chatVisible, setChatVisible] = useState(hasIterations);
  const [contentLayout, setContentLayout] = useState<ContentLayout>("row");

  // Live telemetry from hardware
  const { telemetry, state: hwState } = useHardwareContext();
  const tempValues = useMemo(
    () =>
      telemetry
        .map((p) => p.tempC)
        .filter((v): v is number => v != null)
        .map((v) => Math.round(v * 10) / 10),
    [telemetry],
  );
  const volumeValues = useMemo(
    () => telemetry.map((p) => Math.round(p.totalVolumeMl * 10) / 10),
    [telemetry],
  );

  const handleConfirmSetup = useCallback(
    ({ title, procedure, reasoning, goals }: SetupResult) => {
      if (!experiment) {
        return;
      }
      const firstIteration = {
        id: nanoid(8),
        number: 1,
        summary: "Initial run",
        createdAt: new Date().toISOString(),
      };
      updateExperiment(experiment.id, {
        title,
        iterations: [firstIteration],
        procedure,
        reasoning,
        goals,
      });
      setChatVisible(true);
    },
    [experiment, updateExperiment],
  );

  const router = useRouter();

  useEffect(() => {
    if (!experiment) {
      router.replace("/dashboard");
    }
  }, [experiment, router]);

  if (!experiment) {
    return null;
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-row gap-4 py-4 ${chatVisible ? "" : "pr-4"}`}>
      {!chatExpanded && (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease }}
          >
            <IterationSwitcher
              chatVisible={chatVisible}
              experiment={experiment}
              layout={contentLayout}
              onToggleChat={() => setChatVisible((v) => !v)}
              onToggleLayout={() =>
                setContentLayout((v) => (v === "row" ? "grid" : "row"))
              }
            />
          </motion.div>

          {hasIterations ? (
            <>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3"
                initial={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, delay: 0.05, ease }}
              >
                <DataCard title="Temperature" unit="°C" values={tempValues} />
                <DataCard title="Dispensed Volume" unit="mL" values={volumeValues} />
                <DataCard
                  last
                  title="Thermal FPS"
                  unit="fps"
                  values={hwState.thermal.fps != null ? [Math.round(hwState.thermal.fps)] : []}
                />
              </motion.div>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.4, delay: 0.1, ease }}
              >
                {contentLayout === "grid" ? (
                  <ContentGrid procedure={experiment.procedure} />
                ) : (
                  <ContentPanels procedure={experiment.procedure} />
                )}
              </motion.div>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.35, delay: 0.15, ease }}
              >
                <EquipmentStatus />
              </motion.div>
            </>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-0 flex-1"
              initial={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, delay: 0.05, ease }}
            >
              <NewExperimentSetup onConfirm={handleConfirmSetup} />
            </motion.div>
          )}
        </div>
      )}

      {chatVisible && (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className={cn("flex h-full", chatExpanded ? "w-full pr-4" : "")}
          initial={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.4, delay: 0.08, ease }}
        >
          <Chat expanded={chatExpanded} onToggleExpand={() => setChatExpanded((v) => !v)} />
        </motion.div>
      )}
    </div>
  );
}
