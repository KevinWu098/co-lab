import {
  CameraIcon,
  ChartLineIcon,
  ClipboardListIcon,
} from "lucide-react";
import { CameraPanel } from "@/components/co-lab/dashboard/camera-panel";
import { GraphPanel } from "@/components/co-lab/dashboard/graph-panel";
import { ProcedureStepList } from "@/components/co-lab/dashboard/procedure-step-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { ProcedureStep } from "@/lib/schemas/procedure";

export function ContentPanels({ procedure }: { procedure?: ProcedureStep[] }) {
  const steps = procedure ?? [];

  return (
    <Accordion className="flex min-h-0 flex-1 flex-col" defaultValue="procedure" type="single">
      <AccordionItem
        className="bg-background flex min-h-0 flex-col border border-b-0 data-[state=open]:flex-1"
        value="procedure"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ClipboardListIcon className="text-muted-foreground size-4" />
            Experiment Procedure
            {steps.length > 0 && (
              <span className="text-muted-foreground/60 font-mono text-xs font-normal">
                {steps.length} {steps.length === 1 ? "step" : "steps"}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <div className="flex min-h-0 flex-1 border-t">
            <ProcedureStepList steps={steps} />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        className="bg-background flex min-h-0 flex-col border border-b-0 data-[state=open]:flex-1"
        value="cameras"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <CameraIcon className="text-muted-foreground size-4" />
            Cameras
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <CameraPanel />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem
        className="bg-background flex min-h-0 flex-col border data-[state=open]:flex-1"
        value="graphs"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
          <span className="flex items-center gap-2">
            <ChartLineIcon className="text-muted-foreground size-4" />
            Graphs
          </span>
        </AccordionTrigger>
        <AccordionContent className="p-0">
          <GraphPanel />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
