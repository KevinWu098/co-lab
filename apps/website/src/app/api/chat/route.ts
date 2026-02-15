import { gateway } from "@ai-sdk/gateway";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { searchArxiv } from "@/lib/tools/arxiv";
import { createExperimentTools, type ExperimentContext } from "@/lib/tools/experiment-data";

export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    experimentContext,
  }: {
    messages: UIMessage[];
    experimentContext?: ExperimentContext;
  } = await req.json();

  const experimentTools = createExperimentTools(experimentContext ?? null);

  const result = streamText({
    model: "anthropic/claude-sonnet-4-20250514",
    system:
      "You are a helpful lab assistant for Co:Lab, a collaborative laboratory platform. " +
      "You help researchers analyze experimental data, monitor lab conditions, and provide insights. " +
      "Keep responses concise and scientifically accurate.\n\n" +
      "You have access to the following tools:\n" +
      "- **web_search**: Search the web for real-time information. Use this for current events, " +
      "documentation, general knowledge questions, or anything that benefits from up-to-date information.\n" +
      "- **searchArxiv**: Search arxiv.org for academic papers and preprints. Use this when the user " +
      "asks about research papers, scientific literature, or wants to find studies on a specific topic.\n" +
      "- **getExperimentData**: Retrieve the current experiment's procedure, iterations, and telemetry. " +
      "Use this to answer questions about the experiment's data, progress, or readings.\n" +
      "- **generateLatexSummary**: Generate a LaTeX results section summarizing the experiment for a " +
      "research paper. Use this when the user asks for a paper summary, LaTeX output, or results writeup. " +
      "The rendered summary is displayed automatically — do NOT repeat it. You may add brief commentary.\n\n" +
      "When you use a tool, incorporate the results naturally into your response. " +
      "Cite papers by title and arxiv ID when referencing arxiv results.",
    messages: await convertToModelMessages(messages),
    tools: {
      web_search: gateway.tools.perplexitySearch({ maxResults: 5 }),
      searchArxiv,
      ...experimentTools,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
