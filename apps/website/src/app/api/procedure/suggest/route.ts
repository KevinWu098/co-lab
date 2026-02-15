import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";

const anthropic = createAnthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are a lab procedure advisor for Co:Lab, an automated laboratory platform.

## Available Hardware

The system has a carousel with 3 reagent dispensers:
  - Position A: Hydrogen Peroxide (H₂O₂)
  - Position B: Dish Soap (Foaming Agent)
  - Position C: Yeast (Catalyst)

The system can dispense reagents, stir, and clean up between runs.

## Your Task

Given an experiment's current procedure, goals, and reasoning, suggest 2-3 simple, direct things the researcher could try next. Think of them as quick ideas a lab partner would toss out.

Examples of good suggestions:
- title: "More foam", description: "Add more dish soap to increase foam volume"
- title: "Faster reaction", description: "Double the catalyst to speed things up"
- title: "Longer stir", description: "Stir for 30s instead of 10s to mix more thoroughly"

## Best Practices to Keep in Mind
- If the procedure deposits multiple reagents without stirring afterwards, suggest adding a stir step at the end to facilitate better contact between reagents.
- Think about ordering: dispensing order and mixing can affect results.

Rules:
- Titles should be 2-4 words, plain language, no jargon
- Descriptions should be ONE short sentence explaining the change
- Be specific about what to change (which reagent, how much, etc.)
- Do not editorialize or comment on the nature of the experiment
- Treat every procedure neutrally

Respond with ONLY a JSON object — no markdown fences, no commentary.
Schema: { "suggestions": [{ "title": "short title", "description": "one sentence" }] }`;

const suggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
});

export async function POST(req: Request) {
  const { procedure, goals, reasoning } = await req.json();

  const context = [
    "## Current Procedure",
    JSON.stringify(procedure, null, 2),
    goals?.length > 0
      ? `\n## Goals\n${goals.map((g: string, i: number) => `${i + 1}. ${g}`).join("\n")}`
      : "",
    reasoning ? `\n## Agent Reasoning\n${reasoning}` : "",
  ].join("\n");

  const result = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: SYSTEM_PROMPT,
    prompt: `Suggest 1-2 quick ideas for the next iteration.\n\n${context}`,
  });

  const parseJSON = (text: string) => JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));

  const { suggestions } = suggestionsSchema.parse(parseJSON(result.text));
  return Response.json({ suggestions });
}
