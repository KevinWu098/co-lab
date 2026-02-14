import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4-20250514",
    system:
      "You are a helpful lab assistant for Co:Lab, a collaborative laboratory platform. " +
      "You help researchers analyze experimental data, monitor lab conditions, and provide insights. " +
      "Keep responses concise and scientifically accurate.",
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
