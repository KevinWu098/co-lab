import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import { agentActionSchema, toActions } from "@/lib/schemas/procedure";

const anthropic = createAnthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are a lab procedure interpreter for Co:Lab, an automated laboratory platform.

## Available Hardware

The system has a carousel with 3 reagent dispensers arranged in a circle:
  - Position A (-120°): Hydrogen Peroxide (H₂O₂)
  - Position B (0°, home): Dish Soap (Foaming Agent)
  - Position C (+120°): Yeast (Catalyst)

The carousel starts at position B (home). The servo can only rotate ±120° at a time due to wire constraints, so moving from A to C requires an intermediate stop at B.

## Available Actions

1. **dispense** — Dispense a reagent into the flask.
   - reagent: "A" | "B" | "C"
   - amount: positive number
   - unit: "mL" | "tsp" | "tbsp"

2. **stir** — Activate the electric stirrer.
   - duration: positive number
   - unit: "s" | "ms"

3. **cleanup** — Remove the current flask and place a fresh empty one.

## Your Task

You are helping a researcher iterate on a lab procedure. You will receive:
1. The previous iteration's procedure (as a JSON action array)
2. The experiment goals
3. The researcher's instructions for what to change

Produce an updated procedure based on the researcher's instructions.
Apply the requested changes to the previous procedure. If no previous procedure exists, create one from scratch.
End with a cleanup action if the procedure doesn't already.

Produce the updated reasoning, goals, and steps.`;

const resultSchema = z.object({
  reasoning: z.string().describe("Brief explanation of what changed and why."),
  goals: z
    .array(z.string())
    .describe("Updated high-level experiment goals."),
  steps: z
    .array(agentActionSchema)
    .describe("The updated ordered list of lab actions."),
});

export async function POST(req: Request) {
  const t0 = performance.now();
  const { prompt, previousProcedure, goals } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "No prompt provided" }, { status: 400 });
  }

  const previousJson =
    previousProcedure && previousProcedure.length > 0
      ? JSON.stringify(previousProcedure, null, 2)
      : "(no previous procedure — create from scratch)";

  const goalsText =
    goals && goals.length > 0
      ? goals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")
      : "(no goals defined yet)";

  const userPrompt = `## Previous Procedure\n\`\`\`json\n${previousJson}\n\`\`\`\n\n## Experiment Goals\n${goalsText}\n\n## Researcher Instructions\n${prompt}`;

  console.log(`[iterate] starting LLM call...`);
  const tLLM = performance.now();

  const result = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    system: SYSTEM_PROMPT,
    schema: resultSchema,
    prompt: userPrompt,
  });

  console.log(`[iterate] generateObject in ${(performance.now() - tLLM).toFixed(0)}ms`);
  console.log(`[iterate] total: ${(performance.now() - t0).toFixed(0)}ms`);

  const parsed = result.object;

  return Response.json({
    reasoning: parsed.reasoning,
    goals: parsed.goals,
    steps: toActions(parsed.steps),
  });
}
