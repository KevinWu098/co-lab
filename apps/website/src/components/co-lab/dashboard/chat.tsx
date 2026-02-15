"use client";

import { useChat } from "@ai-sdk/react";
import {
  BeakerIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LoaderIcon,
  Maximize2Icon,
  Minimize2Icon,
} from "lucide-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import type { ArxivPaper } from "@/lib/tools/arxiv";

/* ------------------------------------------------------------------ */
/*  Tool result components                                            */
/* ------------------------------------------------------------------ */

function ToolLoading({ toolName, query }: { toolName: string; query?: string }) {
  const label =
    toolName === "searchArxiv"
      ? "Searching arxiv"
      : toolName === "web_search"
        ? "Searching the web"
        : `Running ${toolName}`;

  return (
    <div className="flex items-center gap-2 py-1.5">
      <LoaderIcon className="text-muted-foreground size-3 animate-spin" />
      <span className="text-muted-foreground font-mono text-[0.65rem]">
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
        <span className="font-mono text-[0.65rem]">
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
              <p className="text-muted-foreground mt-1 font-mono text-[0.6rem]">
                {paper.authors.slice(0, 3).join(", ")}
                {paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ""}
              </p>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-[0.6rem] leading-relaxed">
                {paper.abstract}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-muted-foreground/60 font-mono text-[0.55rem]">
                  {paper.arxivId}
                </span>
                {paper.categories.slice(0, 2).map((cat) => (
                  <span
                    className="bg-muted text-muted-foreground rounded px-1 py-0.5 font-mono text-[0.55rem]"
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
        <span className="font-mono text-[0.65rem]">
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
              <span className="truncate font-mono text-[0.6rem]">{source.title || source.url}</span>
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
      <span className="font-mono text-[0.65rem]">Tool error: {error || "Unknown error"}</span>
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
        <span className="font-mono text-[0.65rem]">{toolName} result</span>
        <ChevronDownIcon className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 font-mono text-[0.6rem]">
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

export function Chat({ expanded = false, onToggleExpand }: ChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat();

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
        <span className="text-muted-foreground font-mono text-[0.65rem] font-medium tracking-widest uppercase">
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

      <Conversation className="min-h-0 flex-1 [&>div>div]:h-full [&>div>div]:overflow-y-auto">
        {messages.length === 0 ? (
          <ConversationEmptyState className="h-full gap-4 px-6">
            <div className="text-muted-foreground flex size-10 max-h-10 items-center justify-center border border-dashed">
              <BeakerIcon className="size-5" />
            </div>
            <div className="h-fit max-h-fit space-y-1.5">
              <h3 className="font-mono text-sm font-medium">Co:Lab Assistant</h3>
              <p className="text-muted-foreground max-w-[30ch] text-xs leading-relaxed">
                Ask about your experiment data, search arxiv for papers, or get real-time web
                results.
              </p>
            </div>
          </ConversationEmptyState>
        ) : (
          <ConversationContent className="gap-4 p-3">
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

      <div className="border-t p-3">
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
