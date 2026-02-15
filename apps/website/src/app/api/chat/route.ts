import { gateway } from "@ai-sdk/gateway";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { searchArxiv } from "@/lib/tools/arxiv";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

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
      "asks about research papers, scientific literature, or wants to find studies on a specific topic.\n\n" +
      "When you use a tool, incorporate the results naturally into your response. " +
      "Cite papers by title and arxiv ID when referencing arxiv results.",
    messages: await convertToModelMessages(messages),
    tools: {
      web_search: gateway.tools.perplexitySearch({ maxResults: 5 }),
      searchArxiv,
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
