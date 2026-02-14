import { cn } from "@/lib/utils";

type PulseVariant = "running" | "waiting" | "idle" | "inactive";

const variantStyles: Record<PulseVariant, { dot: string; ping: string }> = {
  running: {
    dot: "bg-emerald-500",
    ping: "bg-emerald-500 animate-ping",
  },
  waiting: {
    dot: "bg-amber-400",
    ping: "bg-amber-400 animate-ping",
  },
  idle: {
    dot: "bg-blue-400",
    ping: "",
  },
  inactive: {
    dot: "bg-neutral-300",
    ping: "",
  },
};

export function Pulse({
  variant = "running",
  className,
}: {
  variant?: PulseVariant;
  className?: string;
}) {
  const styles = variantStyles[variant];

  return (
    <div className={cn("relative flex size-5 items-center justify-center p-1", className)}>
      {styles.ping && (
        <div className={cn("absolute size-2.5 rounded-full opacity-75", styles.ping)} />
      )}
      <div className={cn("size-2.5 rounded-full", styles.dot)} />
    </div>
  );
}
