import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnswerValue } from "./quiz";
import { buildQuizReview, parseStoredQuestions, scoreQuiz } from "./quiz";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseAnswers(raw: unknown): Record<string, AnswerValue> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, AnswerValue> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!id || id.length > 80) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[id] = value;
    else if (typeof value === "boolean") out[id] = value;
    else if (typeof value === "string") out[id] = value.slice(0, 10_000);
  }
  return out;
}

/** Grade against the DB answer key and record the attempt. Never trust client scores. */
export const submitQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { quizId: string; answers: Record<string, AnswerValue> }) => {
    const quizId = String(input?.quizId ?? "");
    if (!UUID_RE.test(quizId)) throw new Error("Invalid quiz.");
    return { quizId, answers: parseAnswers(input?.answers) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("quizzes")
      .select("id, questions")
      .eq("id", data.quizId)
      .maybeSingle();
    if (error) {
      console.error("Loading quiz for grading failed:", error.message);
      return {
        ok: false as const,
        status: 500,
        error: "Couldn't grade this quiz. Please try again.",
      };
    }
    if (!row) return { ok: false as const, status: 404, error: "That quiz couldn't be found." };

    const questions = parseStoredQuestions(row.questions);
    if (!questions)
      return { ok: false as const, status: 400, error: "This quiz has no valid questions yet." };

    const score = scoreQuiz(questions, data.answers);
    const review = buildQuizReview(questions, data.answers, { true: "True", false: "False" });

    const { error: insertError } = await supabaseAdmin.from("quiz_attempts").insert({
      user_id: context.userId,
      quiz_id: data.quizId,
      correct: score.correct,
      total: score.total,
      percent: score.percent,
    });
    if (insertError) {
      console.error("Saving quiz attempt failed:", insertError.message);
      return {
        ok: false as const,
        status: 500,
        error: "Your score couldn't be saved to your progress.",
      };
    }

    return { ok: true as const, ...score, review };
  });
