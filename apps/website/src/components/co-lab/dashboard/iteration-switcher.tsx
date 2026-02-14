"use client";

import { BotIcon, BotOffIcon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useExperiments } from "@/components/dashboard/experiments-provider";
import type { Experiment } from "@/components/dashboard/sidebar/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IterationSwitcherProps {
  experiment: Experiment;
  chatVisible?: boolean;
  onToggleChat?: () => void;
}

export function IterationSwitcher({
  experiment,
  chatVisible = true,
  onToggleChat,
}: IterationSwitcherProps) {
  const iterations = experiment.iterations;
  const { updateExperiment } = useExperiments();
  const [selected, setSelected] = useState(iterations[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(experiment.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitTitle = () => {
    const trimmed = title.trim();
    const finalTitle = trimmed || "Untitled experiment";
    setTitle(finalTitle);
    setEditing(false);
    if (finalTitle !== experiment.title) {
      updateExperiment(experiment.id, { title: finalTitle });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {editing ? (
          <input
            ref={(el) => {
              (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              el?.focus();
            }}
            className="bg-background flex h-9 max-w-56 items-center border px-3 text-sm font-medium outline-none focus:ring-1 focus:ring-ring"
            onBlur={commitTitle}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitle(experiment.title);
                setEditing(false);
              }
            }}
            value={title}
          />
        ) : (
          <button
            className="bg-background flex h-9 max-w-56 cursor-text items-center border px-3 text-sm font-medium"
            onClick={() => setEditing(true)}
            type="button"
          >
            <span className="truncate">{experiment.title}</span>
          </button>
        )}

        {iterations.length > 0 && (
          <Select onValueChange={setSelected} value={selected}>
            <SelectTrigger className="bg-background rounded-l-none border-l-0 px-2 [&>span]:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iterations.map((it) => (
                <SelectItem key={it.id} value={it.id}>
                  Iteration {it.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex">
        {iterations.length > 0 && (
          <Button className="rounded-r-none" size="sm" variant="outline">
            <PlusIcon />
            New iteration
          </Button>
        )}
        <Button
          aria-label={chatVisible ? "Hide chat" : "Show chat"}
          className={`cursor-pointer ${iterations.length > 0 ? "rounded-l-none border-l-0" : ""}`}
          onClick={onToggleChat}
          size="sm"
          variant="outline"
        >
          {chatVisible ? <BotIcon className="size-4" /> : <BotOffIcon className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
