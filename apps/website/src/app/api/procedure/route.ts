import { generateObject } from "ai";
import { extractText, getDocumentProxy } from "unpdf";
import { agentProcedureResultSchema, toActions } from "@/lib/schemas/procedure";

const SYSTEM_PROMPT = `You are a lab procedure interpreter for Co:Lab, an automated laboratory platform.

Your job is to read a laboratory procedure document and translate it into a sequence of machine-executable actions for a robotic lab system.

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
   The system will automatically spin the carousel to the correct position before dispensing.

2. **stir** — Activate the electric stirrer.
   - duration: positive number
   - unit: "s" | "ms"

3. **cleanup** — A robotic arm removes the current flask and materials, then places a fresh empty flask. Use this to reset between trials or at the end.

## Rules

- Map each instruction in the source document to the closest available action(s).
- Preserve the order of operations from the document.
- If the document says to "mix" or "swirl", use a stir action with an appropriate duration.
- If the document mentions adding a substance, identify which reagent position it maps to and use a dispense action.
- Use reasonable default amounts/durations if the document is vague (e.g. "a splash" → 5 mL, "briefly stir" → 5s).
- If the document mentions cleaning or resetting, use a cleanup action.
- Include a cleanup action at the end if the procedure doesn't already end with one.

## Output

Provide:
1. **reasoning**: Your step-by-step analysis of how you interpreted the document into actions.
2. **goals**: High-level experiment outcomes and what we want to learn. Focus on what to observe, what data to collect, and what future experiments to consider. For example: "Observe the exothermic reaction and measure temperature change over time", "Record foam volume as a proxy for reaction rate", "Determine whether catalyst concentration affects peak temperature to inform follow-up trials". Do NOT list procedural preparation steps as goals.
3. **steps**: The ordered array of actions.

## Important
- Do not editorialize or comment on the nature of the experiment.
- Do not reference whether the experiment is well-known, classic, common, or simple.
- Refer only to the chemical processes and reagents involved.
- Treat every procedure neutrally as a set of instructions to be faithfully translated.`;

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  // Extract text content from the file
  let textContent: string;

  if (file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    textContent = text;
  } else {
    textContent = await file.text();
  }

  const result = await generateObject({
    model: "openai/gpt-5",
    system: SYSTEM_PROMPT,
    schema: agentProcedureResultSchema,
    prompt: `Read the following lab procedure and translate it into machine-executable actions for our robotic lab system.\n\n---\n\n${textContent}`,
  });

  const { reasoning, goals, steps } = result.object;
  return Response.json({ reasoning, goals, steps: toActions(steps) });
}
