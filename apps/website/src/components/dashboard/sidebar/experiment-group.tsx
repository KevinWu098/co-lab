import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { ExperimentItem } from "./experiment-item";
import type { Experiment } from "./types";

export function ExperimentGroup({
  label,
  experiments,
  active = true,
  defaultFirstSelected = false,
}: {
  label: string;
  experiments: Experiment[];
  active?: boolean;
  defaultFirstSelected?: boolean;
}) {
  if (experiments.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[0.65rem] tracking-widest uppercase group-data-[collapsible=icon]:hidden">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {experiments.map((exp, i) => (
          <ExperimentItem
            active={active}
            defaultSelected={defaultFirstSelected && i === 0}
            experiment={exp}
            key={exp.id}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
