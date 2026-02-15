"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  BeakerIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  LoaderIcon,
  Maximize2Icon,
  Minimize2Icon,
  WrenchIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Pulse } from "@/components/co-lab/pulse";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import { Button } from "@/components/ui/button";
import { useHardwareContext } from "@/lib/hardware/hardware-provider";
import type { ArxivPaper } from "@/lib/tools/arxiv";
import type { ExperimentContext, TelemetrySummary } from "@/lib/tools/experiment-data";

/* ------------------------------------------------------------------ */
/*  Tool result components                                            */
/* ------------------------------------------------------------------ */

function ToolLoading({ toolName, query }: { toolName: string; query?: string }) {
  const label =
    toolName === "searchArxiv"
      ? "Searching arxiv"
      : toolName === "web_search"
        ? "Searching the web"
        : toolName === "getExperimentData"
          ? "Reading experiment data"
          : toolName === "generateLatexSummary"
            ? "Generating LaTeX summary"
            : `Running ${toolName}`;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
      <span className="text-muted-foreground font-mono text-xs">
        {label}
        {query ? <> for &ldquo;{query}&rdquo;</> : null}&hellip;
      </span>
    </div>
  );
}

function ArxivResults({ papers }: { papers: ArxivPaper[] }) {
  const [open, setOpen] = useState(false);

  if (!papers || papers.length === 0) return null;

  return (
    <div className="my-1.5">
      <button
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <BookOpenIcon className="size-3" />
        <span className="font-mono text-xs">
          {papers.length} paper{papers.length !== 1 ? "s" : ""} found
        </span>
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {papers.map((paper) => (
            <a
              className="hover:bg-muted/50 group block border p-2.5 transition-colors"
              href={`https://arxiv.org/abs/${paper.arxivId}`}
              key={paper.arxivId}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-mono text-xs leading-snug font-medium">{paper.title}</h4>
                <ExternalLinkIcon className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-1 font-mono text-[0.7rem]">
                {paper.authors.slice(0, 3).join(", ")}
                {paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ""}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-[0.7rem] leading-relaxed">
                {paper.abstract}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-muted-foreground/60 font-mono text-xs">{paper.arxivId}</span>
                {paper.categories.slice(0, 2).map((cat) => (
                  <span
                    className="bg-muted text-muted-foreground rounded px-1 py-0.5 font-mono text-xs"
                    key={cat}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function WebSearchSources({ output }: { output: unknown }) {
  const [open, setOpen] = useState(false);

  const sources: { title?: string; url?: string }[] = [];
  if (output && typeof output === "object") {
    const out = output as Record<string, unknown>;
    if (Array.isArray(out.sources)) {
      for (const s of out.sources) sources.push(s as { title?: string; url?: string });
    } else if (Array.isArray(out.results)) {
      for (const s of out.results) sources.push(s as { title?: string; url?: string });
    }
  }

  return (
    <div className="my-1.5">
      <button
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <GlobeIcon className="size-3" />
        <span className="font-mono text-xs">
          {sources.length > 0
            ? `${sources.length} source${sources.length !== 1 ? "s" : ""}`
            : "Web search complete"}
        </span>
        {sources.length > 0 && (
          <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && sources.length > 0 && (
        <div className="mt-2 space-y-1">
          {sources.map((source) => (
            <a
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              href={source.url}
              key={source.url ?? source.title}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon className="size-2.5 shrink-0" />
              <span className="truncate font-mono text-[0.7rem]">{source.title || source.url}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolError({ error }: { error?: string }) {
  return (
    <div className="text-destructive flex items-center gap-1.5 py-1.5">
      <span className="font-mono text-xs">Tool error: {error || "Unknown error"}</span>
    </div>
  );
}

function LatexResult({ output }: { output: unknown }) {
  const [copied, setCopied] = useState(false);
  const [showSource, setShowSource] = useState(false);

  // The AI SDK may nest tool output under a `result` key or pass it directly
  let out: Record<string, unknown> | null = null;
  if (output && typeof output === "object") {
    const raw = output as Record<string, unknown>;
    if ("rendered" in raw || "latex" in raw) {
      out = raw;
    } else if (raw.result && typeof raw.result === "object") {
      out = raw.result as Record<string, unknown>;
    }
  }

  const rendered = (out?.rendered as string) || undefined;
  const latex = (out?.latex as string) || undefined;
  const error = (out?.error as string) || ((output as Record<string, unknown>)?.error as string);

  if (!rendered && !latex && !error) return null;

  const handleCopy = () => {
    if (!latex) return;
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-1.5 space-y-2">
      {error && (
        <div className="text-destructive flex items-center gap-1.5 py-1.5">
          <span className="font-mono text-xs">Error: {error}</span>
        </div>
      )}

      {rendered && (
        <div className="border-l-2 border-emerald-500/40 pl-3">
          <MessageResponse className="text-xs [&_table]:text-xs [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:py-1">
            {rendered}
          </MessageResponse>
        </div>
      )}

      {latex && (
        <div className="flex items-center gap-2">
          <button
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
            onClick={() => setShowSource((v) => !v)}
            type="button"
          >
            <FileTextIcon className="size-3" />
            <span className="font-mono text-[0.65rem]">
              {showSource ? "Hide" : "View"} LaTeX source
            </span>
            <ChevronDownIcon
              className={`size-3 transition-transform ${showSource ? "rotate-180" : ""}`}
            />
          </button>
          <button
            className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
            onClick={handleCopy}
            type="button"
          >
            {copied ? <ClipboardCheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            <span className="font-mono text-[0.65rem]">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}

      {showSource && latex && (
        <pre className="bg-muted max-h-48 overflow-auto rounded p-3 font-mono text-[0.6rem] leading-relaxed">
          {latex}
        </pre>
      )}
    </div>
  );
}

function ExperimentDataResult({ output }: { output: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1.5">
      <button
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <BeakerIcon className="size-3" />
        <span className="font-mono text-xs">Experiment data loaded</span>
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 font-mono text-[0.7rem]">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}

function GenericToolResult({ toolName, output }: { toolName: string; output: unknown }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1.5">
      <button
        className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="font-mono text-xs">{toolName} result</span>
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 font-mono text-[0.7rem]">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Render a single tool part                                         */
/* ------------------------------------------------------------------ */

function ToolPart({
  toolName,
  state,
  input,
  output,
  errorText,
}: {
  toolName: string;
  state: string;
  input: unknown;
  output: unknown;
  errorText?: string;
}) {
  switch (state) {
    case "input-streaming":
    case "input-available": {
      const query =
        input && typeof input === "object"
          ? ((input as Record<string, unknown>).query as string | undefined)
          : undefined;
      return <ToolLoading query={query} toolName={toolName} />;
    }
    case "output-available": {
      if (toolName === "searchArxiv") {
        const data = output as { papers: ArxivPaper[] } | undefined;
        return <ArxivResults papers={data?.papers ?? []} />;
      }
      if (toolName === "web_search") {
        return <WebSearchSources output={output} />;
      }
      if (toolName === "getExperimentData") {
        return <ExperimentDataResult output={output} />;
      }
      if (toolName === "generateLatexSummary") {
        return <LatexResult output={output} />;
      }
      return <GenericToolResult output={output} toolName={toolName} />;
    }
    case "output-error":
      return <ToolError error={errorText} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Chat                                                              */
/* ------------------------------------------------------------------ */

interface ChatProps {
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const AGENT_TOOLS = [
  {
    name: "web_search",
    label: "Web Search",
    icon: GlobeIcon,
    description: "Search the web for real-time information, documentation, and current events.",
    provider: "Perplexity",
  },
  {
    name: "searchArxiv",
    label: "Arxiv Search",
    icon: BookOpenIcon,
    description: "Search arxiv.org for academic papers, preprints, and scientific literature.",
    provider: "Arxiv API",
  },
  {
    name: "getExperimentData",
    label: "Experiment Data",
    icon: BeakerIcon,
    description: "Access the current experiment's procedure, iterations, and telemetry readings.",
    provider: "Local",
  },
  {
    name: "generateLatexSummary",
    label: "LaTeX Summary",
    icon: FileTextIcon,
    description:
      "Generate a LaTeX results section summarizing the experiment for a research paper.",
    provider: "Local",
  },
];

export function Chat({ expanded = false, onToggleExpand }: ChatProps) {
  const [input, setInput] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);

  // Build experiment context for the API
  const { slug } = useParams<{ slug: string }>();
  const { experiments } = useExperiments();
  const { telemetry } = useHardwareContext();
  const experiment = experiments.find((e) => e.id === slug);

  const experimentContext = useMemo((): ExperimentContext | undefined => {
    if (!experiment) return undefined;

    // Summarize telemetry so we don't send the full time-series
    const temps = telemetry.map((p) => p.tempC).filter((v): v is number => v != null);
    const last = telemetry[telemetry.length - 1];
    const telSummary: TelemetrySummary = {
      samples: telemetry.length,
      elapsedS: last?.elapsed ?? 0,
      temperature: {
        current: temps.length > 0 ? temps[temps.length - 1] : null,
        min: temps.length > 0 ? Math.min(...temps) : null,
        max: temps.length > 0 ? Math.max(...temps) : null,
        avg: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      },
      volume: {
        total: last?.totalVolumeMl ?? 0,
        h2o2: last?.dispensed.h2o2 ?? 0,
        soap: last?.dispensed.soap ?? 0,
        catalyst: last?.dispensed.catalyst ?? 0,
      },
    };

    return {
      id: experiment.id,
      title: experiment.title,
      status: experiment.status,
      reasoning: experiment.reasoning,
      goals: experiment.goals,
      iterations: experiment.iterations.map((it) => ({
        number: it.number,
        summary: it.summary,
        createdAt: it.createdAt,
      })),
      procedure: (experiment.procedure ?? []).map((s) => ({ ...s.action })),
      telemetry: telSummary,
    };
  }, [experiment, telemetry]);

  // Use a ref so the transport always sends the latest context
  const experimentContextRef = useRef(experimentContext);
  experimentContextRef.current = experimentContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ experimentContext: experimentContextRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, stop } = useChat({ transport });

  const pulseVariant =
    status === "streaming" ? "running" : status === "submitted" ? "waiting" : "idle";

  return (
    <div
      className={`bg-background relative flex h-full min-h-0 flex-col border ${expanded ? "w-full flex-1" : "w-xs"}`}
    >
      {expanded && onToggleExpand && (
        <button
          aria-label="Collapse chat"
          className="group hover:bg-muted absolute inset-y-0 left-0 z-10 flex w-1.5 cursor-pointer items-center justify-center opacity-0 transition-opacity duration-150 hover:opacity-100"
          onClick={onToggleExpand}
          type="button"
        >
          <Minimize2Icon className="text-muted-foreground size-3" />
        </button>
      )}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <BeakerIcon className="text-muted-foreground size-3.5" />
        <span className="text-muted-foreground font-mono text-xs font-medium tracking-widest uppercase">
          Lab Assistant
        </span>
        <Pulse className="ml-auto" variant={pulseVariant} />
        {onToggleExpand && (
          <Button
            aria-label={expanded ? "Collapse chat" : "Expand chat"}
            className="size-7 cursor-pointer"
            onClick={onToggleExpand}
            size="icon"
            variant="ghost"
          >
            {expanded ? (
              <Minimize2Icon className="text-muted-foreground size-3.5" />
            ) : (
              <Maximize2Icon className="text-muted-foreground size-3.5" />
            )}
          </Button>
        )}
      </div>

      <Conversation className="h-0 flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState className="h-full gap-4 px-6">
            <div className="text-muted-foreground flex size-10 max-h-10 items-center justify-center border border-dashed">
              <BeakerIcon className="size-5" />
            </div>
            <div className="h-fit max-h-fit space-y-1.5">
              <h3 className="font-mono text-sm font-medium">Co:Lab Assistant</h3>
              <p className="text-muted-foreground max-w-[30ch] text-xs leading-relaxed">
                Ask about your experiment data, generate a LaTeX summary, search arxiv, or get
                real-time web results.
              </p>
            </div>
          </ConversationEmptyState>
        ) : (
          <ConversationContent className="gap-4 p-3" scrollClassName="absolute inset-0 overflow-auto">
            {messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    const key = `${message.id}-${i}`;
                    switch (part.type) {
                      case "text":
                        return message.role === "assistant" ? (
                          <MessageResponse key={key}>{part.text}</MessageResponse>
                        ) : (
                          <p key={key}>{part.text}</p>
                        );

                      case "dynamic-tool":
                        return (
                          <ToolPart
                            errorText={part.state === "output-error" ? part.errorText : undefined}
                            input={part.input}
                            key={key}
                            output={"output" in part ? part.output : undefined}
                            state={part.state}
                            toolName={part.toolName}
                          />
                        );

                      default:
                        return null;
                    }
                  })}
                </MessageContent>
              </Message>
            ))}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      <div className="w-full border-t">
        <button
          aria-label={toolsOpen ? "Hide tools" : "Show tools"}
          className="text-muted-foreground hover:text-foreground hover:bg-accent ml-auto flex size-6 w-12 cursor-pointer items-center justify-center border border-t-0 border-b-0 transition-colors"
          onClick={() => setToolsOpen((v) => !v)}
          type="button"
        >
          <WrenchIcon className="size-3" />
        </button>
      </div>

      {/* Tools panel */}
      {toolsOpen && (
        <div className="border-t p-4 pt-2">
          <span className="text-muted-foreground font-mono text-[0.65rem] tracking-wider uppercase">
            Agent Tools
          </span>
          <div className="mt-1.5 space-y-1.5">
            {AGENT_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div className="flex items-start gap-2 border px-2.5 py-2" key={tool.name}>
                  <Icon className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium">{tool.label}</span>
                      <span className="bg-muted text-muted-foreground rounded px-1 py-px font-mono text-[0.6rem]">
                        {tool.provider}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[0.65rem] leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: focus proxy for textarea */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focus proxy for textarea */}
      <div
        className="cursor-text"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("button")) {
            (e.currentTarget.querySelector("textarea") as HTMLTextAreaElement)?.focus();
          }
        }}
      >
        <PromptInput
          onSubmit={(message) => {
            sendMessage({ text: message.text });
            setInput("");
          }}
        >
          <PromptInputTextarea
            className="min-h-10 text-xs"
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your experiment..."
            value={input}
          />
          <PromptInputFooter className="justify-end p-2">
            <PromptInputSubmit
              disabled={status !== "ready" && status !== "error"}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
