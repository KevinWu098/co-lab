"use client";

import { useState } from "react";
import { Chat } from "@/components/co-lab/dashboard/chat";
import { ContentPanels } from "@/components/co-lab/dashboard/content-panels";
import { DataCard } from "@/components/co-lab/dashboard/data-card";
import { IterationSwitcher } from "@/components/co-lab/dashboard/iteration-switcher";
import { experiments } from "@/components/dashboard/sidebar/data";

export default function Page() {
  const experiment = experiments[0];
  const [chatExpanded, setChatExpanded] = useState(false);

  return (
    <div className="flex flex-1 flex-row gap-4 py-4">
      {!chatExpanded && (
        <div className="flex w-full flex-1 flex-col gap-4">
          <IterationSwitcher experiment={experiment} />

          <div className="grid grid-cols-3">
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
          </div>

          <ContentPanels />
        </div>
      )}

      <Chat expanded={chatExpanded} onToggleExpand={() => setChatExpanded((v) => !v)} />
    </div>
  );
}
