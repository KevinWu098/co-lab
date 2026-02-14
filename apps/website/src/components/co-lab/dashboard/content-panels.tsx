import { CameraIcon, ChartLineIcon, ClipboardListIcon } from "lucide-react";
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
    <Accordion type="single" defaultValue="procedure" className="flex min-h-0 flex-1 flex-col">
      <AccordionItem
        value="procedure"
        className="bg-background flex flex-col rounded-t-md border border-b-0 data-[state=open]:flex-1"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ClipboardListIcon className="text-muted-foreground size-4" />
            Experiment Procedure
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex min-h-0 flex-1 border-t">
            <div className="min-h-0 flex-1 p-4">
              <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
                Procedure steps
              </div>
            </div>
            <div className="w-64 border-l p-4">
              <div className="text-muted-foreground font-mono text-xs">Procedure controls</div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        value="cameras"
        className="bg-background flex flex-col border border-b-0 data-[state=open]:flex-1"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
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
        value="graphs"
        className="bg-background flex flex-col rounded-b-md border data-[state=open]:flex-1"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ChartLineIcon className="text-muted-foreground size-4" />
            Graphs
          </span>
        </AccordionTrigger>
        <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
          <GraphPanel />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
