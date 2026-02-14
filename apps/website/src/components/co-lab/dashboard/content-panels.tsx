import { CameraIcon, ChartLineIcon } from "lucide-react";
import { CameraPanel } from "@/components/co-lab/dashboard/camera-panel";
import { GraphPanel } from "@/components/co-lab/dashboard/graph-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function ContentPanels() {
  return (
    <Accordion type="single" defaultValue="cameras" className="flex min-h-0 flex-1 flex-col">
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
          <CameraPanel />
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
          <GraphPanel />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
