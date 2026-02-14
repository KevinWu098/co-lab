"use client";

import { motion } from "framer-motion";
import {
  BoldIcon,
  BotIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  LoaderIcon,
  MinusIcon,
  PenLineIcon,
  QuoteIcon,
  ScrollTextIcon,
  StrikethroughIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProcedureEditor } from "@/components/co-lab/dashboard/procedure-editor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Action, AgentProcedureResult } from "@/lib/schemas/procedure";
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

export function NewExperimentSetup({
  onCancel,
  onConfirm,
}: {
  onCancel?: () => void;
  onConfirm?: () => void;
}) {
  const [step, setStep] = useQueryState(
    "setup",
    parseAsStringLiteral(setupSteps).withDefault("choice").withOptions({ history: "push" }),
  );

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent processing state
  const [, setAgentResult] = useState<AgentProcedureResult | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [initialSteps, setInitialSteps] = useState<Action[] | null>(null);
  const [agentInstructions, setAgentInstructions] = useState("");
  const [agentTrace, setAgentTrace] = useState("");
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isPdf = file?.type === "application/pdf" || /\.pdf$/i.test(file?.name ?? "");

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Process file with the agent when entering configure with a file
  const processFileWithAgent = useCallback(async (fileToProcess: File) => {
    setAgentLoading(true);
    setAgentError(null);
    setAgentResult(null);
    setInitialSteps(null);

    try {
      const formData = new FormData();
      formData.append("file", fileToProcess);

      const res = await fetch("/api/procedure", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Failed to process: ${res.statusText}`);
      }

      const result: AgentProcedureResult = await res.json();
      setAgentResult(result);
      setInitialSteps(result.steps);
      // Goals → instructions (high-level, for data analysis & coherence)
      const goalsText = result.goals.map((g, i) => `${i + 1}. ${g}`).join("\n");
      setAgentInstructions(`## Goals\n${goalsText}`);
      // Reasoning → trace (how the agent mapped the document)
      setAgentTrace(result.reasoning);
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setAgentLoading(false);
    }
  }, []);

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

  /* ── Markdown toolbar helpers ── */
  const applyFormat = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = instructionsRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    setAgentInstructions(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    });
  }, []);

  const applyLinePrefix = useCallback((prefix: string) => {
    const textarea = instructionsRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    setAgentInstructions(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + prefix.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    });
  }, []);

  const scrollToLine = useCallback((line: number) => {
    const textarea = instructionsRef.current;
    if (!textarea) return;
    const lines = textarea.value.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    textarea.focus();
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos;
    const lineHeight = 16;
    textarea.scrollTop = Math.max(0, line * lineHeight - textarea.clientHeight / 3);
  }, []);

  const headings = useMemo(() => {
    return agentInstructions
      .split("\n")
      .map((line, i) => {
        const match = line.match(/^(#{1,6})\s+(.+)/);
        if (match) return { level: match[1].length, text: match[2], line: i };
        return null;
      })
      .filter((h): h is { level: number; text: string; line: number } => h !== null);
  }, [agentInstructions]);

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
            className="bg-background flex w-2xl shrink-0 flex-col border"
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
                      Upload your procedure here
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
              <Button
                size="sm"
                disabled={!file}
                onClick={() => {
                  if (file) processFileWithAgent(file);
                  setStep("configure");
                }}
              >
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Accordion
        type="single"
        defaultValue="procedure"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
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
          <AccordionContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex h-0 flex-1 border-t">
              {agentLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <LoaderIcon className="text-muted-foreground size-5 animate-spin" />
                  <p className="text-muted-foreground font-mono text-sm">
                    Processing procedure&hellip;
                  </p>
                  <p className="text-muted-foreground/60 text-xs">
                    The agent is reading your document and mapping it to lab actions.
                  </p>
                </div>
              ) : agentError ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <p className="font-mono text-sm text-red-400">{agentError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => file && processFileWithAgent(file)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <ProcedureEditor sourceFile={file} initialSteps={initialSteps} />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="agent"
          className={cn(
            "bg-background flex flex-col border data-[state=open]:flex-1",
            !agentTrace && "rounded-b-md",
            agentTrace && "border-b-0",
          )}
        >
          <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
            <span className="flex items-center gap-2">
              <BotIcon className="text-muted-foreground size-4" />
              Agent Instructions
              {agentLoading && <LoaderIcon className="text-muted-foreground size-3 animate-spin" />}
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex h-0 flex-1 flex-col border-t">
              {agentLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-muted-foreground font-mono text-sm">
                    Waiting for agent&hellip;
                  </p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 border-b px-2 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Bold"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("**");
                      }}
                    >
                      <BoldIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Italic"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("_");
                      }}
                    >
                      <ItalicIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Strikethrough"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("~~");
                      }}
                    >
                      <StrikethroughIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Inline code"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("`");
                      }}
                    >
                      <CodeIcon className="size-3.5" />
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-4" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Heading 1"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("# ");
                      }}
                    >
                      <Heading1Icon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Heading 2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("## ");
                      }}
                    >
                      <Heading2Icon className="size-3.5" />
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-4" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Bullet list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("- ");
                      }}
                    >
                      <ListIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Numbered list"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("1. ");
                      }}
                    >
                      <ListOrderedIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Checkbox"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("- [ ] ");
                      }}
                    >
                      <CheckSquareIcon className="size-3.5" />
                    </Button>

                    <Separator orientation="vertical" className="mx-1 h-4" />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Quote"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("> ");
                      }}
                    >
                      <QuoteIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Horizontal rule"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("\n---\n", "");
                      }}
                    >
                      <MinusIcon className="size-3.5" />
                    </Button>
                  </div>

                  {/* Editor + Outline */}
                  <div className="flex min-h-0 flex-1">
                    <textarea
                      ref={instructionsRef}
                      className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed focus:outline-none"
                      placeholder="Define the high-level goals for this experiment. What are we trying to learn? What hypotheses are we testing? What should the agent focus on during data analysis?"
                      value={agentInstructions}
                      onChange={(e) => setAgentInstructions(e.target.value)}
                    />

                    {/* Outline */}
                    <div className="w-md shrink-0 overflow-y-auto border-l p-3">
                      <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest uppercase">
                        Outline
                      </p>
                      {headings.length > 0 ? (
                        <div className="space-y-0.5">
                          {headings.map((h, i) => (
                            <button
                              key={`${h.line}-${i}`}
                              type="button"
                              className="text-muted-foreground hover:text-foreground block w-full cursor-pointer truncate text-left font-mono text-xs transition-colors"
                              style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                              onClick={() => scrollToLine(h.line)}
                            >
                              {h.text}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground/40 font-mono text-xs">
                          Add headings to see outline
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Agent Trace — only shown when an import was processed */}
        {agentTrace && (
          <AccordionItem
            value="trace"
            className="bg-background flex flex-col rounded-b-md border data-[state=open]:flex-1"
          >
            <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
              <span className="flex items-center gap-2">
                <ScrollTextIcon className="text-muted-foreground size-4" />
                Agent Trace
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex h-0 flex-1 flex-col overflow-y-auto border-t p-4">
                <p className="text-muted-foreground font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {agentTrace}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="bg-background flex items-center justify-end gap-2 border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFile(null);
            setStep(null);
            onCancel?.();
          }}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={agentLoading}
          onClick={() => {
            setStep(null);
            onConfirm?.();
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
