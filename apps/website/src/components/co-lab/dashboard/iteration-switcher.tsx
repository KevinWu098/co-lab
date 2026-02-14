"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
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
}

export function IterationSwitcher({ experiment }: IterationSwitcherProps) {
  const iterations = experiment.iterations;

  const [selected, setSelected] = useState(iterations[0]?.id ?? "");

  if (iterations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex h-9 items-center rounded-l-md border bg-background px-3 font-medium text-sm">
          {experiment.title}
        </div>

        <Select onValueChange={setSelected} value={selected}>
          <SelectTrigger className="rounded-l-none border-l-0 bg-background px-2 [&>span]:hidden">
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
      </div>

      <Button size="sm" variant="outline">
        <PlusIcon />
        New iteration
      </Button>
    </div>
  );
}
