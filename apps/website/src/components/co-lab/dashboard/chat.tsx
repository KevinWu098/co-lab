"use client";

import { useChat } from "@ai-sdk/react";
import { BeakerIcon, Maximize2Icon, Minimize2Icon } from "lucide-react";
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
      className={`bg-background relative flex h-full flex-col border ${expanded ? "w-full flex-1" : "w-xs"}`}
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

      <Conversation className="flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState className="gap-4 px-6">
            <div className="text-muted-foreground flex size-10 items-center justify-center border border-dashed">
              <BeakerIcon className="size-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-mono text-sm font-medium">Co:Lab Assistant</h3>
              <p className="text-muted-foreground max-w-[30ch] text-xs leading-relaxed">
                Ask about your experiment data, lab conditions, or analysis.
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
