import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { ExperimentItem } from "./experiment-item";
import type { Experiment } from "./types";

export function ExperimentGroup({
  label,
  experiments,
  active = true,
}: {
  label: string;
  experiments: Experiment[];
  active?: boolean;
}) {
  if (experiments.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[0.65rem] tracking-widest uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu>
        {experiments.map((exp) => (
          <ExperimentItem key={exp.id} experiment={exp} active={active} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
