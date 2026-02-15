import { createAnthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { agentActionSchema, toActions } from "@/lib/schemas/procedure";

const anthropic = createAnthropic({ apiKey: process.env.CLAUDE_API_KEY });

// ── Shared context ────────────────────────────────────────────────────────
const HARDWARE_CONTEXT = `You are a lab procedure interpreter for Co:Lab, an automated laboratory platform.

## Available Hardware

The system has a carousel with 3 reagent dispensers arranged in a circle:
  - Position A (-120°): Hydrogen Peroxide (H₂O₂)
  - Position B (0°, home): Dish Soap (Foaming Agent)
  - Position C (+120°): Yeast (Catalyst)

The carousel starts at position B (home). The servo can only rotate ±120° at a time due to wire constraints, so moving from A to C requires an intermediate stop at B.`;

// ── Shared rules ──────────────────────────────────────────────────────────
const ACTION_CONTEXT = `## Available Actions

1. **dispense** — Dispense a reagent into the flask.
   - reagent: "A" | "B" | "C"
   - amount: positive number
   - unit: "mL" | "tsp" | "tbsp"

2. **stir** — Activate the electric stirrer.
   - duration: positive number
   - unit: "s" | "ms"

3. **cleanup** — Remove the current flask and place a fresh empty one.

## Rules

- Map each document instruction to the closest action(s). Preserve order.
- "mix" / "swirl" → stir with an appropriate duration.
- Substance additions → dispense from the matching reagent position.
- Vague amounts → reasonable defaults (e.g. "a splash" → 5 mL, "briefly stir" → 5 s).
- End with a cleanup action if the procedure doesn't already.`;

// ── Steps prompt (actions only) ───────────────────────────────────────────
const STEPS_SYSTEM_PROMPT = `${HARDWARE_CONTEXT}

Translate the lab procedure into an ordered list of machine-executable actions.

${ACTION_CONTEXT}

Respond with ONLY a JSON object — no markdown fences, no commentary.
Schema: { "steps": [ { "type": "dispense"|"stir"|"cleanup", "reagent": "A"|"B"|"C"|null, "amount": number|null, "unit": string|null, "duration": number|null } ] }`;

// ── Reasoning prompt ──────────────────────────────────────────────────────
const REASONING_SYSTEM_PROMPT = `${HARDWARE_CONTEXT}

${ACTION_CONTEXT}

Provide a concise step-by-step analysis of how the source document maps to lab actions.
Explain what the procedure is trying to achieve and why each action was chosen.
Be direct and brief — no more than a short paragraph per mapping decision.
Respond with plain text only.

## Important
- Do not editorialize or comment on the nature of the experiment.
- Do not reference whether the experiment is well-known, classic, common, or simple.
- Refer only to the chemical processes and reagents involved.`;

// ── Goals prompt ──────────────────────────────────────────────────────────
const GOALS_SYSTEM_PROMPT = `${HARDWARE_CONTEXT}

Read a laboratory procedure and identify high-level experimental goals.
Focus on what to observe, what data to collect, and what future experiments to consider.
Do NOT list procedural preparation steps as goals.

Respond with ONLY a JSON object — no markdown fences, no commentary.
Schema: { "goals": ["goal 1", "goal 2", ...] }

## Important
- Do not editorialize or comment on the nature of the experiment.
- Do not reference whether the experiment is well-known, classic, common, or simple.
- Refer only to the chemical processes and reagents involved.`;

// ── Schemas for parallel calls ────────────────────────────────────────────
const stepsResultSchema = z.object({
  steps: z
    .array(agentActionSchema)
    .describe("The ordered list of lab actions derived from the source document."),
});

const goalsResultSchema = z.object({
  goals: z
    .array(z.string())
    .describe(
      "A list of high-level goals the procedure is trying to accomplish, " +
        "in the order they should be achieved.",
    ),
});

export async function POST(req: Request) {
  const t0 = performance.now();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const tFormData = performance.now();
  console.log(`[procedure] formData parsed in ${(tFormData - t0).toFixed(0)}ms`);

  // Extract text content from the file
  let textContent: string;

  if (file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const tBuffer = performance.now();
    console.log(`[procedure] arrayBuffer read in ${(tBuffer - tFormData).toFixed(0)}ms`);

    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const tProxy = performance.now();
    console.log(`[procedure] getDocumentProxy in ${(tProxy - tBuffer).toFixed(0)}ms`);

    const { text } = await extractText(pdf, { mergePages: true });
    const tExtract = performance.now();
    console.log(`[procedure] extractText in ${(tExtract - tProxy).toFixed(0)}ms`);

    textContent = text;
  } else {
    textContent = await file.text();
    console.log(`[procedure] text read in ${(performance.now() - tFormData).toFixed(0)}ms`);
  }

  console.log(`[procedure] extracted ${textContent.length} chars, starting parallel LLM calls...`);
  const tLLM = performance.now();
  const userPrompt = `Read the following lab procedure and translate it into machine-executable actions for our robotic lab system.\n\n---\n\n${textContent}`;

  const [stepsResult, reasoningResult, goalsResult] = await Promise.all([
    generateObject({
      model: anthropic("claude-haiku-4-5"),
      system: STEPS_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: stepsResultSchema,
    }).then((r) => {
      console.log(`[procedure] steps in ${(performance.now() - tLLM).toFixed(0)}ms`);
      return r;
    }),
    generateText({
      model: anthropic("claude-haiku-4-5"),
      system: REASONING_SYSTEM_PROMPT,
      prompt: userPrompt,
    }).then((r) => {
      console.log(`[procedure] reasoning in ${(performance.now() - tLLM).toFixed(0)}ms`);
      return r;
    }),
    generateObject({
      model: anthropic("claude-haiku-4-5"),
      system: GOALS_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: goalsResultSchema,
    }).then((r) => {
      console.log(`[procedure] goals in ${(performance.now() - tLLM).toFixed(0)}ms`);
      return r;
    }),
  ]);

  const tDone = performance.now();
  console.log(`[procedure] parallel LLM wall time: ${(tDone - tLLM).toFixed(0)}ms`);
  console.log(`[procedure] total request time: ${(tDone - t0).toFixed(0)}ms`);

  const { steps } = stepsResult.object;
  const reasoning = reasoningResult.text;
  const { goals } = goalsResult.object;
  return Response.json({ reasoning, goals, steps: toActions(steps) });
}
