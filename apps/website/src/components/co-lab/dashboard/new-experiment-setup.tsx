"use client";

import { BotIcon, ClipboardListIcon, FileTextIcon, PenLineIcon } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SetupStep = "choice" | "configure";

export function NewExperimentSetup({ onCancel }: { onCancel?: () => void }) {
  const [step, setStep] = useState<SetupStep>("choice");

  if (step === "choice") {
    return (
      <Card className="flex h-fit w-full flex-col">
        <CardContent className="flex flex-1">
          <div className="flex w-full flex-col items-center gap-4 text-left">
            <div className="space-y-1.5 self-start">
              <h2 className="font-mono text-lg font-medium">Set up your experiment</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Import an existing lab procedure or configure one from scratch.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <button
                className="bg-background hover:border-foreground/25 flex cursor-pointer flex-col items-center gap-3 border p-6 transition-colors"
                onClick={() => setStep("configure")}
                type="button"
              >
                <FileTextIcon className="text-muted-foreground size-5" />
                <div className="space-y-1">
                  <span className="font-mono text-sm font-medium">From procedure</span>
                  <p className="text-muted-foreground text-xs">Import an existing lab procedure</p>
                </div>
              </button>

              <button
                className="bg-background hover:border-foreground/25 flex cursor-pointer flex-col items-center gap-3 border p-6 transition-colors"
                onClick={() => setStep("configure")}
                type="button"
              >
                <PenLineIcon className="text-muted-foreground size-5" />
                <div className="space-y-1">
                  <span className="font-mono text-sm font-medium">Start manually</span>
                  <p className="text-muted-foreground text-xs">Configure from scratch</p>
                </div>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Accordion type="single" defaultValue="procedure" className="flex min-h-0 flex-1 flex-col">
        <AccordionItem
          value="procedure"
          className="bg-background flex flex-col rounded-t-md border border-b-0 data-[state=open]:flex-1"
        >
          <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
            <span className="flex items-center gap-2">
              <ClipboardListIcon className="text-muted-foreground size-4" />
              Experiment Procedure
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex min-h-0 flex-1 border-t">
              <div className="min-h-0 flex-1 p-4">
                <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
                  Procedure editor
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="agent"
          className="bg-background flex flex-col rounded-b-md border data-[state=open]:flex-1"
        >
          <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
            <span className="flex items-center gap-2">
              <BotIcon className="text-muted-foreground size-4" />
              Agent Instructions
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex min-h-0 flex-1 border-t">
              <div className="min-h-0 flex-1 p-4">
                <div className="text-muted-foreground flex h-full items-center justify-center rounded border border-dashed font-mono text-sm">
                  Agent instructions
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="bg-background flex items-center justify-end gap-2 border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStep("choice");
            onCancel?.();
          }}
        >
          Cancel
        </Button>
        <Button size="sm" disabled>
          Confirm
        </Button>
      </div>
    </div>
  );
}
