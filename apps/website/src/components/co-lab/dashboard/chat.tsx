"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useChat } from "@ai-sdk/react";
import { FlaskConicalIcon } from "lucide-react";
import { useState } from "react";

export function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="font-sans text-sm font-medium">Lab Assistant</h2>
      </div>

      <Conversation className="flex-1">
        {messages.length === 0 ? (
          <ConversationEmptyState
            description="Ask about your experiment data, lab conditions, or analysis."
            icon={<FlaskConicalIcon className="size-6" />}
            title="Lab Assistant"
          />
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
                          <MessageResponse key={key}>
                            {part.text}
                          </MessageResponse>
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
