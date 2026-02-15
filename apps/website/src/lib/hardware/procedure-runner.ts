import { REAGENT_TO_DROPPER, toMilliliters, toSeconds } from "./constants";
import type {
  ExecutionState,
  HardwareCommand,
  WsAckMessage,
} from "./types";
import type { ProcedureStep } from "@/lib/schemas/procedure";

// ── Step → Command translation ──────────────────────────────────────────────

export function stepToCommand(step: ProcedureStep): HardwareCommand | null {
  const { action } = step;

  switch (action.type) {
    case "dispense": {
      if (!action.reagent || action.amount == null || !action.unit) {
        return null;
      }
      return {
        type: "automation_dispense",
        dropper: REAGENT_TO_DROPPER[action.reagent],
        amountMl: toMilliliters(action.amount, action.unit),
      };
    }

    case "stir": {
      if (action.duration == null || !action.unit) {
        return null;
      }
      return {
        type: "automation_stir",
        durationS: toSeconds(action.duration, action.unit),
      };
    }

    case "cleanup": {
      return {
        type: "automation_cleanup",
      };
    }

    default:
      return null;
  }
}

// ── Expected ack for each command type ──────────────────────────────────────

function expectedAck(cmd: HardwareCommand): { subsystem: string; action: string } {
  switch (cmd.type) {
    case "automation_dispense":
      return { subsystem: "automation", action: "dispense" };
    case "automation_stir":
      return { subsystem: "automation", action: "stir" };
    case "automation_cleanup":
      return { subsystem: "automation", action: "cleanup" };
    default:
      return { subsystem: "unknown", action: "unknown" };
  }
}

// ── Timeout heuristic per command ───────────────────────────────────────────

function commandTimeoutMs(cmd: HardwareCommand): number {
  switch (cmd.type) {
    case "automation_dispense":
      // ~0.6s per 20mL send + overhead
      return Math.max(15_000, (cmd.amountMl / 20) * 2000 + 10_000);
    case "automation_stir":
      return (cmd.durationS + 10) * 1000;
    case "automation_cleanup":
      // 17 steps × ~600ms + overhead
      return 30_000;
    default:
      return 30_000;
  }
}

// ── Procedure runner ────────────────────────────────────────────────────────

export interface ProcedureRunnerDeps {
  sendCommand: (cmd: HardwareCommand) => boolean;
  waitForAck: (
    subsystem: string,
    action: string,
    timeoutMs?: number,
  ) => Promise<WsAckMessage>;
  setExecution: React.Dispatch<React.SetStateAction<ExecutionState>>;
}

/**
 * Execute a procedure by sending each step's command sequentially and waiting
 * for the hardware ack before moving to the next step.
 *
 * Returns an AbortController that can be used to cancel the run.
 */
export function runProcedure(
  steps: ProcedureStep[],
  deps: ProcedureRunnerDeps,
): AbortController {
  const controller = new AbortController();

  const run = async () => {
    const { sendCommand, waitForAck, setExecution } = deps;

    setExecution({
      status: "running",
      currentStep: 0,
      totalSteps: steps.length,
      error: null,
    });

    for (let i = 0; i < steps.length; i++) {
      if (controller.signal.aborted) {
        setExecution((prev) => ({
          ...prev,
          status: "idle",
          error: "Aborted",
        }));
        return;
      }

      setExecution((prev) => ({ ...prev, currentStep: i }));

      const cmd = stepToCommand(steps[i]);
      if (!cmd) {
        setExecution({
          status: "error",
          currentStep: i,
          totalSteps: steps.length,
          error: `Step ${i + 1}: invalid or incomplete action`,
        });
        return;
      }

      const sent = sendCommand(cmd);
      if (!sent) {
        setExecution({
          status: "error",
          currentStep: i,
          totalSteps: steps.length,
          error: `Step ${i + 1}: hardware not connected`,
        });
        return;
      }

      try {
        const { subsystem, action } = expectedAck(cmd);
        await waitForAck(subsystem, action, commandTimeoutMs(cmd));
      } catch (err) {
        setExecution({
          status: "error",
          currentStep: i,
          totalSteps: steps.length,
          error: `Step ${i + 1}: ${err instanceof Error ? err.message : "unknown error"}`,
        });
        return;
      }
    }

    setExecution({
      status: "completed",
      currentStep: steps.length,
      totalSteps: steps.length,
      error: null,
    });
  };

  run();
  return controller;
}
