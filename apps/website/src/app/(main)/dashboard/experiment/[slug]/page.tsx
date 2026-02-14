"use client";

import { motion } from "framer-motion";
import { nanoid } from "nanoid";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Chat } from "@/components/co-lab/dashboard/chat";
import { ContentPanels } from "@/components/co-lab/dashboard/content-panels";
import { DataCard } from "@/components/co-lab/dashboard/data-card";
import { EquipmentStatus } from "@/components/co-lab/dashboard/equipment-status";
import { IterationSwitcher } from "@/components/co-lab/dashboard/iteration-switcher";
import { NewExperimentSetup } from "@/components/co-lab/dashboard/new-experiment-setup";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import { cn } from "@/lib/utils";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function ExperimentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { experiments, updateExperiment } = useExperiments();
  const experiment = experiments.find((e) => e.id === slug);
  const [chatExpanded, setChatExpanded] = useState(false);
  const hasIterations = experiment ? experiment.iterations.length > 0 : false;
  const [chatVisible, setChatVisible] = useState(hasIterations);

  const handleConfirmSetup = useCallback(() => {
    if (!experiment) return;
    const firstIteration = {
      id: nanoid(8),
      number: 1,
      summary: "Initial run",
      createdAt: new Date().toISOString(),
    };
    updateExperiment(experiment.id, {
      iterations: [firstIteration],
      status: "idle" as const,
    });
    setChatVisible(true);
  }, [experiment, updateExperiment]);

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
    <div className={`flex min-h-0 flex-1 flex-row gap-4 py-4 ${!chatVisible ? "pr-4" : ""}`}>
      {!chatExpanded && (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <IterationSwitcher
              chatVisible={chatVisible}
              experiment={experiment}
              onToggleChat={() => setChatVisible((v) => !v)}
            />
          </motion.div>

          {hasIterations ? (
            <>
              <motion.div
                className="grid grid-cols-3"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05, ease }}
              >
                <DataCard
                  title="Temperature"
                  unit="°C"
                  values={[36.8, 36.9, 37.0, 37.1, 36.9, 37.0, 37.1, 37.2]}
                />
                <DataCard
                  title="Pressure"
                  unit="atm"
                  values={[1.015, 1.014, 1.014, 1.013, 1.012, 1.013]}
                />
                <DataCard last title="pH Level" unit="pH" values={[7.2, 7.3, 7.3, 7.4, 7.4]} />
              </motion.div>

              <motion.div
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease }}
              >
                <ContentPanels />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15, ease }}
              >
                <EquipmentStatus />
              </motion.div>
            </>
          ) : (
            <motion.div
              className="flex min-h-0 flex-1"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease }}
            >
              <NewExperimentSetup onConfirm={handleConfirmSetup} />
            </motion.div>
          )}
        </div>
      )}

      {chatVisible && (
        <motion.div
          className={cn("flex h-full", chatExpanded ? "w-full pr-4" : "")}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease }}
        >
          <Chat expanded={chatExpanded} onToggleExpand={() => setChatExpanded((v) => !v)} />
        </motion.div>
      )}
    </div>
  );
}
