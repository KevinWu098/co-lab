"use client";

import { motion } from "framer-motion";
import {
  BotIcon,
  ClipboardListIcon,
  FileIcon,
  FileTextIcon,
  PenLineIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const setupSteps = ["choice", "import", "configure"] as const;

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.doc,.txt";

const ease = [0.16, 1, 0.3, 1] as const;

export function NewExperimentSetup({ onCancel }: { onCancel?: () => void }) {
  const [step, setStep] = useQueryState(
    "setup",
    parseAsStringLiteral(setupSteps).withDefault("choice").withOptions({ history: "push" }),
  );

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isPdf = file?.type === "application/pdf" || /\.pdf$/i.test(file?.name ?? "");

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const handleFile = useCallback((f: File) => {
    if (ACCEPTED_TYPES.includes(f.type) || /\.(pdf|docx?|txt)$/i.test(f.name)) {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  /* ── Choice / Import ── */
  if (step === "choice" || step === "import") {
    const isImport = step === "import";

    return (
      <div className="flex h-full w-full gap-3">
        {/* Left: stacked choice panel */}
        <div className={cn("bg-background flex h-fit w-full flex-col border")}>
          <div className="border-b px-4 py-3">
            <h2 className="font-mono text-sm font-medium">Set up experiment</h2>
            <p className="text-muted-foreground mt-1 text-xs">Choose a method to begin.</p>
          </div>

          <div className={cn("grid gap-3 p-4", isImport ? "grid-cols-1" : "grid-cols-2")}>
            <button
              className={`focus-visible:ring-foreground/50 flex cursor-pointer flex-col items-center gap-2 border px-4 py-5 transition-colors focus-visible:ring-1 focus-visible:outline-none ${
                isImport
                  ? "border-foreground/50 bg-muted/40 hover:bg-muted/20"
                  : "bg-background hover:border-foreground/25 hover:bg-muted/30"
              }`}
              onClick={() => setStep(isImport ? "choice" : "import")}
              type="button"
            >
              <FileTextIcon
                className={`size-4 ${isImport ? "text-foreground" : "text-muted-foreground"}`}
              />
              <span
                className={`font-mono text-xs font-medium ${isImport ? "" : "text-muted-foreground"}`}
              >
                From procedure
              </span>
            </button>

            <button
              className="bg-background hover:border-foreground/25 hover:bg-muted/30 focus-visible:ring-foreground/50 flex cursor-pointer flex-col items-center gap-2 border px-4 py-5 transition-colors focus-visible:ring-1 focus-visible:outline-none"
              onClick={() => setStep("configure")}
              type="button"
            >
              <PenLineIcon className="text-muted-foreground size-4" />
              <span className="text-muted-foreground font-mono text-xs font-medium">
                Start manually
              </span>
            </button>
          </div>
        </div>

        {/* Right: dropzone panel (slides in when import selected) */}
        {isImport && (
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease }}
            className="bg-background flex w-xl shrink-0 flex-col border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-mono text-sm font-medium">Import procedure</h2>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setFile(null);
                  setStep("choice");
                }}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />

              {!file ? (
                <button
                  type="button"
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed transition-colors ${
                    dragging
                      ? "border-foreground/50 bg-muted/50"
                      : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="text-muted-foreground size-6" />
                  <div className="space-y-1 text-center">
                    <p className="text-muted-foreground font-mono text-sm">
                      Drop your procedure here
                    </p>
                    <p className="text-muted-foreground/60 text-xs">.pdf, .docx, .doc, .txt</p>
                  </div>
                </button>
              ) : (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center gap-2 border px-3 py-2">
                    <FileIcon className="text-muted-foreground size-4 shrink-0" />
                    <span className="flex-1 truncate font-mono text-sm">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={() => setFile(null)}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                  {isPdf && fileUrl ? (
                    <iframe
                      src={`${fileUrl}#toolbar=0`}
                      title="PDF preview"
                      className="flex-1 border"
                    />
                  ) : (
                    <div className="text-muted-foreground flex flex-1 items-center justify-center border border-dashed font-mono text-sm">
                      Preview not available for this file type
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  setStep("choice");
                }}
              >
                Back
              </Button>
              <Button size="sm" disabled={!file} onClick={() => setStep("configure")}>
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  /* ── Configure (accordion) ── */
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
            setStep(null);
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
