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
import type {
  Action,
  AgentProcedureResult,
  ProcedureStep,
} from "@/lib/schemas/procedure";
import { cn } from "@/lib/utils";

const setupSteps = ["choice", "import", "configure"] as const;

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = ".pdf,.docx,.doc,.txt";

const PDF_EXT_RE = /\.pdf$/i;
const FILE_EXT_RE = /\.(pdf|docx?|txt)$/i;
const HEADING_RE = /^(#{1,6})\s+(.+)/;

const ease = [0.16, 1, 0.3, 1] as const;

export interface SetupResult {
  procedure: ProcedureStep[];
  reasoning: string;
  goals: string[];
}

export function NewExperimentSetup({
  onCancel,
  onConfirm,
}: {
  onCancel?: () => void;
  onConfirm?: (result: SetupResult) => void;
}) {
  const [step, setStep] = useQueryState(
    "setup",
    parseAsStringLiteral(setupSteps)
      .withDefault("choice")
      .withOptions({ history: "push" })
  );

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent processing state
  const [agentResult, setAgentResult] = useState<AgentProcedureResult | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [initialSteps, setInitialSteps] = useState<Action[] | null>(null);
  const [agentInstructions, setAgentInstructions] = useState("");
  const [agentTrace, setAgentTrace] = useState("");
  const instructionsRef = useRef<HTMLTextAreaElement>(null);
  const [editorSteps, setEditorSteps] = useState<ProcedureStep[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const procedureValid = useMemo(() => {
    if (editorSteps.length === 0) return false;
    return editorSteps.every(({ action }) => {
      switch (action.type) {
        case "dispense":
          return action.reagent != null && action.amount != null && action.unit != null;
        case "stir":
          return action.duration != null && action.unit != null;
        case "cleanup":
          return true;
        default:
          return false;
      }
    });
  }, [editorSteps]);

  const fileUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  const isPdf =
    file?.type === "application/pdf" || PDF_EXT_RE.test(file?.name ?? "");

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
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
      setAgentError(
        err instanceof Error ? err.message : "Failed to process file"
      );
    } finally {
      setAgentLoading(false);
    }
  }, []);

  const handleFile = useCallback((f: File) => {
    if (ACCEPTED_TYPES.includes(f.type) || FILE_EXT_RE.test(f.name)) {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) {
        handleFile(dropped);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragging(false);
  }, []);

  /* ── Markdown toolbar helpers ── */
  const applyFormat = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = instructionsRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const newText =
      text.substring(0, start) +
      prefix +
      selected +
      suffix +
      text.substring(end);
    setAgentInstructions(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = end + prefix.length;
    });
  }, []);

  const applyLinePrefix = useCallback((prefix: string) => {
    const textarea = instructionsRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newText =
      text.substring(0, lineStart) + prefix + text.substring(lineStart);
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
    if (!textarea) {
      return;
    }
    const lines = textarea.value.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    textarea.focus();
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos;
    const lineHeight = 16;
    textarea.scrollTop = Math.max(
      0,
      line * lineHeight - textarea.clientHeight / 3
    );
  }, []);

  const headings = useMemo(() => {
    return agentInstructions
      .split("\n")
      .map((line, i) => {
        const match = line.match(HEADING_RE);
        if (match) {
          return { level: match[1].length, text: match[2], line: i };
        }
        return null;
      })
      .filter(
        (h): h is { level: number; text: string; line: number } => h !== null
      );
  }, [agentInstructions]);

  /* ── Choice / Import ── */
  if (step === "choice" || step === "import") {
    return (
      <ChoiceImportView
        dragging={dragging}
        file={file}
        fileInputRef={fileInputRef}
        fileUrl={fileUrl}
        isPdf={isPdf}
        onClearFile={() => setFile(null)}
        onConfirmImport={() => {
          if (file) {
            processFileWithAgent(file);
          }
          setStep("configure");
        }}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileSelect={handleFile}
        onSetStep={setStep}
        step={step}
      />
    );
  }

  /* ── Configure (accordion) ── */
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Accordion
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        defaultValue="procedure"
        type="single"
      >
        <AccordionItem
          className="flex flex-col border border-b-0 bg-background data-[state=open]:flex-1"
          value="procedure"
        >
          <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
            <span className="flex items-center gap-2">
              <ClipboardListIcon className="size-4 text-muted-foreground" />
              Experiment Procedure
            </span>
          </AccordionTrigger>
          <AccordionContent className="overflow-hidden p-0">
            <div className="flex h-0 flex-1 border-t">
              <ProcedureContent
                agentError={agentError}
                agentLoading={agentLoading}
                file={file}
                initialSteps={initialSteps}
                onChange={setEditorSteps}
                onRetry={() => file && processFileWithAgent(file)}
                showValidation={showValidation}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          className={cn(
            "flex flex-col border bg-background data-[state=open]:flex-1",
            !agentTrace && "",
            agentTrace && "border-b-0"
          )}
          value="agent"
        >
          <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
            <span className="flex items-center gap-2">
              <BotIcon className="size-4 text-muted-foreground" />
              Agent Instructions
              {agentLoading && (
                <LoaderIcon className="size-3 animate-spin text-muted-foreground" />
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <div className="flex h-0 flex-1 flex-col border-t">
              {agentLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="font-mono text-muted-foreground text-sm">
                    Waiting for agent&hellip;
                  </p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 border-b px-2 py-1">
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("**");
                      }}
                      size="icon"
                      title="Bold"
                      variant="ghost"
                    >
                      <BoldIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("_");
                      }}
                      size="icon"
                      title="Italic"
                      variant="ghost"
                    >
                      <ItalicIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("~~");
                      }}
                      size="icon"
                      title="Strikethrough"
                      variant="ghost"
                    >
                      <StrikethroughIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("`");
                      }}
                      size="icon"
                      title="Inline code"
                      variant="ghost"
                    >
                      <CodeIcon className="size-3.5" />
                    </Button>

                    <Separator className="mx-1 h-4" orientation="vertical" />

                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("# ");
                      }}
                      size="icon"
                      title="Heading 1"
                      variant="ghost"
                    >
                      <Heading1Icon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("## ");
                      }}
                      size="icon"
                      title="Heading 2"
                      variant="ghost"
                    >
                      <Heading2Icon className="size-3.5" />
                    </Button>

                    <Separator className="mx-1 h-4" orientation="vertical" />

                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("- ");
                      }}
                      size="icon"
                      title="Bullet list"
                      variant="ghost"
                    >
                      <ListIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("1. ");
                      }}
                      size="icon"
                      title="Numbered list"
                      variant="ghost"
                    >
                      <ListOrderedIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("- [ ] ");
                      }}
                      size="icon"
                      title="Checkbox"
                      variant="ghost"
                    >
                      <CheckSquareIcon className="size-3.5" />
                    </Button>

                    <Separator className="mx-1 h-4" orientation="vertical" />

                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyLinePrefix("> ");
                      }}
                      size="icon"
                      title="Quote"
                      variant="ghost"
                    >
                      <QuoteIcon className="size-3.5" />
                    </Button>
                    <Button
                      className="size-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyFormat("\n---\n", "");
                      }}
                      size="icon"
                      title="Horizontal rule"
                      variant="ghost"
                    >
                      <MinusIcon className="size-3.5" />
                    </Button>
                  </div>

                  {/* Editor + Outline */}
                  <div className="flex min-h-0 flex-1">
                    <textarea
                      className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed focus:outline-none"
                      onChange={(e) => setAgentInstructions(e.target.value)}
                      placeholder="Define the high-level goals for this experiment. What are we trying to learn? What hypotheses are we testing? What should the agent focus on during data analysis?"
                      ref={instructionsRef}
                      value={agentInstructions}
                    />

                    {/* Outline */}
                    <div className="w-md shrink-0 overflow-y-auto border-l p-3">
                      <p className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        Outline
                      </p>
                      {headings.length > 0 ? (
                        <div className="space-y-0.5">
                          {headings.map((h, i) => (
                            <button
                              className="block w-full cursor-pointer truncate text-left font-mono text-muted-foreground text-xs transition-colors hover:text-foreground"
                              key={`${h.line}-${i}`}
                              onClick={() => scrollToLine(h.line)}
                              style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                              type="button"
                            >
                              {h.text}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="font-mono text-muted-foreground/40 text-xs">
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
            className="flex flex-col border bg-background data-[state=open]:flex-1"
            value="trace"
          >
            <AccordionTrigger className="cursor-pointer px-4 py-3 hover:no-underline data-[state=open]:cursor-default">
              <span className="flex items-center gap-2">
                <ScrollTextIcon className="size-4 text-muted-foreground" />
                Agent Trace
              </span>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="flex h-0 flex-1 flex-col overflow-y-auto border-t p-4">
                <p className="whitespace-pre-wrap font-mono text-muted-foreground text-sm leading-relaxed">
                  {agentTrace}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="flex items-center justify-end gap-2 border bg-background px-4 py-3">
        <Button
          onClick={() => {
            setFile(null);
            setStep(null);
            onCancel?.();
          }}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          disabled={agentLoading}
          onClick={() => {
            if (!procedureValid) {
              setShowValidation(true);
              return;
            }
            setStep(null);
            onConfirm?.({
              procedure: editorSteps,
              reasoning: agentTrace,
              goals: agentResult?.goals ?? [],
            });
          }}
          size="sm"
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

/* ── Extracted to reduce cognitive complexity ── */

function CountdownTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds * 10);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 100);
    return () => clearInterval(id);
  }, [remaining]);

  return (
    <span className="text-primary font-mono text-2xl font-semibold tabular-nums">
      {(remaining / 10).toFixed(1)}s
    </span>
  );
}

function ProcedureContent({
  agentLoading,
  agentError,
  file,
  initialSteps,
  onChange,
  onRetry,
  showValidation,
}: {
  agentLoading: boolean;
  agentError: string | null;
  file: File | null;
  initialSteps: Action[] | null;
  onChange: (steps: ProcedureStep[]) => void;
  onRetry: () => void;
  showValidation?: boolean;
}) {
  if (agentLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <CountdownTimer seconds={5} />
        <div className="flex items-center gap-2">
          <LoaderIcon className="text-muted-foreground size-3.5 animate-spin" />
          <p className="text-muted-foreground font-mono text-sm">
            Processing procedure&hellip;
          </p>
        </div>
        <p className="text-muted-foreground/60 text-xs">
          The agent is reading your document and mapping it to lab actions.
        </p>
      </div>
    );
  }

  if (agentError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="font-mono text-red-400 text-sm">{agentError}</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <ProcedureEditor
      initialSteps={initialSteps}
      onChange={onChange}
      showValidation={showValidation}
      sourceFile={file}
    />
  );
}

function ChoiceImportView({
  step,
  file,
  fileUrl,
  isPdf,
  dragging,
  fileInputRef,
  onSetStep,
  onClearFile,
  onFileSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onConfirmImport,
}: {
  step: "choice" | "import";
  file: File | null;
  fileUrl: string | null;
  isPdf: boolean;
  dragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSetStep: (step: "choice" | "import" | "configure") => void;
  onClearFile: () => void;
  onFileSelect: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onConfirmImport: () => void;
}) {
  const isImport = step === "import";

  return (
    <div className="flex h-full w-full gap-3">
      {/* Left: stacked choice panel */}
      <div className={cn("flex h-fit w-full flex-col border bg-background")}>
        <div className="border-b px-4 py-3">
          <h2 className="font-medium font-mono text-sm">Set up experiment</h2>
          <p className="mt-1 text-muted-foreground text-xs">
            Choose a method to begin.
          </p>
        </div>

        <div
          className={cn(
            "grid gap-3 p-4",
            isImport ? "grid-cols-1" : "grid-cols-2"
          )}
        >
          <button
            className={`flex cursor-pointer flex-col items-center gap-2 border px-4 py-5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/50 ${
              isImport
                ? "border-foreground/50 bg-muted/40 hover:bg-muted/20"
                : "bg-background hover:border-foreground/25 hover:bg-muted/30"
            }`}
            onClick={() => onSetStep(isImport ? "choice" : "import")}
            type="button"
          >
            <FileTextIcon
              className={`size-4 ${isImport ? "text-foreground" : "text-muted-foreground"}`}
            />
            <span
              className={`font-medium font-mono text-xs ${isImport ? "" : "text-muted-foreground"}`}
            >
              From procedure
            </span>
          </button>

          <button
            className="flex cursor-pointer flex-col items-center gap-2 border bg-background px-4 py-5 transition-colors hover:border-foreground/25 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/50"
            onClick={() => onSetStep("configure")}
            type="button"
          >
            <PenLineIcon className="size-4 text-muted-foreground" />
            <span className="font-medium font-mono text-muted-foreground text-xs">
              Start manually
            </span>
          </button>
        </div>
      </div>

      {/* Right: dropzone panel (slides in when import selected) */}
      {isImport && (
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="flex w-2xl shrink-0 flex-col border bg-background"
          initial={{ opacity: 0, x: 80 }}
          transition={{ duration: 0.35, ease }}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium font-mono text-sm">Import procedure</h2>
            <Button
              className="size-7"
              onClick={() => {
                onClearFile();
                onSetStep("choice");
              }}
              size="icon"
              variant="ghost"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <input
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onFileSelect(f);
                }
              }}
              ref={fileInputRef}
              type="file"
            />

            {file ? (
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 border px-3 py-2">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-mono text-sm">
                    {file.name}
                  </span>
                  <Button
                    className="size-6 shrink-0"
                    onClick={onClearFile}
                    size="icon"
                    variant="ghost"
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
                {isPdf && fileUrl ? (
                  <iframe
                    className="flex-1 border"
                    src={`${fileUrl}#toolbar=0`}
                    title="PDF preview"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center border border-dashed font-mono text-muted-foreground text-sm">
                    Preview not available for this file type
                  </div>
                )}
              </div>
            ) : (
              <button
                className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 border border-dashed transition-colors ${
                  dragging
                    ? "border-foreground/50 bg-muted/50"
                    : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                type="button"
              >
                <UploadIcon className="size-6 text-muted-foreground" />
                <div className="space-y-1 text-center">
                  <p className="font-mono text-muted-foreground text-sm">
                    Upload your procedure here
                  </p>
                  <p className="text-muted-foreground/60 text-xs">
                    .pdf, .docx, .doc, .txt
                  </p>
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
            <Button
              onClick={() => {
                onClearFile();
                onSetStep("choice");
              }}
              size="sm"
              variant="ghost"
            >
              Back
            </Button>
            <Button disabled={!file} onClick={onConfirmImport} size="sm">
              Confirm
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
