import type { PublicQuestion, Question } from "./data";

export type AnswerValue = number | boolean | string | undefined;

function normalizeFill(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

export function isCorrect(q: Question, a: AnswerValue): boolean {
  switch (q.type) {
    case "mcq":
      return a === q.answer;
    case "truefalse":
      return a === q.answer;
    case "fill":
      return (
        typeof a === "string" && q.answer.some((ans) => normalizeFill(ans) === normalizeFill(a))
      );
    case "essay": {
      if (typeof a !== "string") return false;
      const text = a.toLowerCase();
      const words = text.split(/\s+/).filter(Boolean).length;
      const hits = q.keywords.filter((k) => text.includes(k.toLowerCase())).length;
      return words >= q.minWords && hits >= Math.ceil(q.keywords.length / 2);
    }
  }
}

export function scoreQuiz(questions: Question[], answers: Record<string, AnswerValue>) {
  const correct = questions.filter((q) => isCorrect(q, answers[q.id])).length;
  const total = questions.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

/** Strip answer keys and explanations so the client can render the player safely. */
export function toPublicQuestion(q: Question): PublicQuestion {
  switch (q.type) {
    case "mcq":
      return { id: q.id, type: "mcq", prompt: q.prompt, options: q.options };
    case "truefalse":
      return { id: q.id, type: "truefalse", prompt: q.prompt };
    case "fill":
      return { id: q.id, type: "fill", prompt: q.prompt };
    case "essay":
      return { id: q.id, type: "essay", prompt: q.prompt, minWords: q.minWords };
  }
}

export function toPublicQuestions(questions: Question[]): PublicQuestion[] {
  return questions.map(toPublicQuestion);
}

/** Shape of a question row as stored in the jsonb column (untrusted). */
type RawQuestion = {
  id?: unknown;
  type?: unknown;
  prompt?: unknown;
  options?: unknown;
  answer?: unknown;
  explanation?: unknown;
  keywords?: unknown;
  minWords?: unknown;
};

/** Parse student-facing quiz JSON (answers already stripped by student_quizzes). */
export function parsePublicQuestions(raw: unknown): PublicQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = item as RawQuestion;
    const id = typeof q.id === "string" ? q.id : "";
    const prompt = typeof q.prompt === "string" ? q.prompt : "";
    if (!id || !prompt) continue;
    if (q.type === "mcq" && Array.isArray(q.options)) {
      out.push({ id, type: "mcq", prompt, options: q.options.map(String) });
    } else if (q.type === "truefalse") {
      out.push({ id, type: "truefalse", prompt });
    } else if (q.type === "fill") {
      out.push({ id, type: "fill", prompt });
    } else if (q.type === "essay") {
      const minWords = typeof q.minWords === "number" ? q.minWords : 30;
      out.push({ id, type: "essay", prompt, minWords });
    }
  }
  return out;
}

export type QuizReviewItem = {
  id: string;
  type: Question["type"];
  prompt: string;
  options?: string[];
  explanation: string;
  ok: boolean;
  correctLabel: string;
};

export function buildQuizReview(
  questions: Question[],
  answers: Record<string, AnswerValue>,
  labels: { true: string; false: string },
): QuizReviewItem[] {
  return questions.map((q) => {
    const ok = isCorrect(q, answers[q.id]);
    let correctLabel = "";
    if (q.type === "mcq") correctLabel = q.options[q.answer] ?? "";
    else if (q.type === "truefalse") correctLabel = q.answer ? labels.true : labels.false;
    else if (q.type === "fill") correctLabel = q.answer[0] ?? "";
    const item: QuizReviewItem = {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      ok,
      correctLabel,
    };
    return q.type === "mcq" ? { ...item, options: q.options } : item;
  });
}

/** Best-effort parse of jsonb quiz questions from the database. */
export function parseStoredQuestions(raw: unknown): Question[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: Question[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const q = item as RawQuestion;
    const id = typeof q.id === "string" ? q.id : "";
    const prompt = typeof q.prompt === "string" ? q.prompt : "";
    const explanation = typeof q.explanation === "string" ? q.explanation : "";
    if (!id || !prompt) return null;
    if (q.type === "mcq") {
      if (!Array.isArray(q.options) || typeof q.answer !== "number") return null;
      out.push({
        id,
        type: "mcq",
        prompt,
        options: q.options.map(String),
        answer: q.answer,
        explanation,
      });
    } else if (q.type === "truefalse") {
      if (typeof q.answer !== "boolean") return null;
      out.push({ id, type: "truefalse", prompt, answer: q.answer, explanation });
    } else if (q.type === "fill") {
      if (!Array.isArray(q.answer)) return null;
      out.push({ id, type: "fill", prompt, answer: q.answer.map(String), explanation });
    } else if (q.type === "essay") {
      if (!Array.isArray(q.keywords) || typeof q.minWords !== "number") return null;
      out.push({
        id,
        type: "essay",
        prompt,
        keywords: q.keywords.map(String),
        minWords: q.minWords,
        explanation,
      });
    } else {
      return null;
    }
  }
  return out;
}
