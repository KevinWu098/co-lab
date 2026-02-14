import { CameraIcon, ChartLineIcon } from "lucide-react";
import { Chat } from "@/components/co-lab/dashboard/chat";
import { DataCard } from "@/components/co-lab/dashboard/data-card";
import { IterationSwitcher } from "@/components/co-lab/dashboard/iteration-switcher";
import { experiments } from "@/components/dashboard/sidebar/data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Page() {
  const experiment = experiments[0];

  return (
    <div className="flex flex-1 flex-row gap-4 py-4">
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

        <Accordion
          type="single"
          defaultValue="cameras"
          collapsible
          className="flex min-h-0 flex-1 flex-col"
        >
          <AccordionItem
            value="cameras"
            className="bg-background flex flex-col rounded-t-md border border-b-0 data-[state=open]:flex-1"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <CameraIcon className="text-muted-foreground size-4" />
                Cameras
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex min-h-0 flex-1 border-t">
                <div className="min-h-0 flex-1 p-4">
                  <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
                    Camera feed
                  </div>
                </div>
                <div className="w-64 border-l p-4">
                  <div className="text-muted-foreground font-mono text-xs">Camera controls</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="graph"
            className="bg-background flex flex-col rounded-b-md border data-[state=open]:flex-1"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2">
                <ChartLineIcon className="text-muted-foreground size-4" />
                Graph
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex min-h-0 flex-1 border-t">
                <div className="min-h-0 flex-1 p-4">
                  <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
                    Graph visualization
                  </div>
                </div>
                <div className="w-64 border-l p-4">
                  <div className="text-muted-foreground font-mono text-xs">Graph controls</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="bg-background h-full">
        <Chat />
      </div>
    </div>
  );
}
