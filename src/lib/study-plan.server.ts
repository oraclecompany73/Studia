import { streamText } from "ai";
import { createOpenRouterProvider, GatewayError, openRouterModel } from "./ai.server";

export type StudyPlanInput = {
  subject: string;
  goal: string;
  completed: string[];
  remaining: string[];
  quizzes: { title: string; percent: number; takenAt: string }[];
  lang?: "ar" | "en";
};

export { GatewayError };

export async function generateStudyPlan(input: StudyPlanInput): Promise<string> {
  const { provider, takeError } = createOpenRouterProvider();

  const list = (xs: string[], empty: string) =>
    xs.length ? xs.map((x) => `- ${x}`).join("\n") : `- ${empty}`;
  const quizLines = input.quizzes.length
    ? input.quizzes.map((q) => `- ${q.title}: ${q.percent}% (${q.takenAt.slice(0, 10)})`).join("\n")
    : "- No quizzes taken yet.";

  const result = streamText({
    model: provider.chat(openRouterModel()),
    maxRetries: 0,
    system:
      "You are a warm, encouraging study coach for students. Create a concise, practical, personalized study plan. Base it on the lessons they completed and their quiz scores. Use quiz scores to find weak spots (below 70% needs review, 70-85% needs practice, above 85% is solid). Format in Markdown with these sections: '## Where you stand', '## Your plan' (a numbered day-by-day plan for 7 days, 20-45 minutes each), '## Focus areas', '## Quick tip'. Keep it under 400 words." +
      (input.lang === "ar"
        ? " Write the entire plan in clear, simple Arabic, including the section headings (use: '## أين تقف الآن', '## خطتك', '## نقاط التركيز', '## نصيحة سريعة')."
        : " Write the plan in English."),
    messages: [
      {
        role: "user",
        content: `Subject: ${input.subject}\nMy learning goal: ${input.goal}\n\nCompleted lessons:\n${list(input.completed, "None yet.")}\n\nLessons not done yet:\n${list(input.remaining, "None — all done!")}\n\nQuiz attempts:\n${quizLines}`,
      },
    ],
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
  if (!text.trim()) throw new GatewayError(422, "The AI couldn't create a plan for this request.");
  return text;
}
