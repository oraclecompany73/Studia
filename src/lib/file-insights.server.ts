import { streamText } from "ai";
import { createOpenRouterProvider, GatewayError, openRouterModel } from "./ai.server";

export type InsightTurn = { role: "user" | "assistant"; content: string };

/** Answers an admin's question about file-open engagement, grounded only in the given dataset. */
export async function answerFileInsights(
  dataset: string,
  history: InsightTurn[],
  lang: "ar" | "en",
): Promise<string> {
  const { provider, takeError } = createOpenRouterProvider();

  const result = streamText({
    model: provider.chat(openRouterModel()),
    maxRetries: 0,
    system:
      "You are a learning-analytics assistant for a school admin. You analyse how students engage with lesson files attached to schedule items. " +
      "Answer ONLY from the dataset below; never invent students, files or numbers. If the data can't answer the question, say so and suggest what to track. " +
      "Be concrete: cite counts and percentages, name students and files when relevant. " +
      "Structure answers in Markdown: '## Summary' (2-4 bullets), '## What stands out' (patterns: low-engagement items, students who never open files, late openers vs early), and '## Recommendations' (3-5 actionable steps the admin can take this week, e.g. who to follow up with, when to send reminders, which files to re-share). Keep it under 350 words unless asked for more. " +
      (lang === "ar"
        ? "Write everything in clear, simple Arabic, including headings ('## الملخص', '## أبرز الملاحظات', '## توصيات عملية')."
        : "Write in English.") +
      `\n\nDATASET (generated ${new Date().toISOString()}):\n${dataset}`,
    messages: history,
  });

  let text = "";
  try {
    text = await result.text;
  } catch (e) {
    const gatewayError = takeError();
    if (gatewayError) throw gatewayError;
    throw e;
  }
  const gatewayError = takeError();
  if (gatewayError) throw gatewayError;
  if (!text.trim()) throw new GatewayError(422, "The AI couldn't answer this question.");
  return text;
}
