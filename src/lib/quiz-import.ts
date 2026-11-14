import type { Question, QuizDifficulty } from "./data";

export type ImportedQuiz = {
  title?: string;
  minutes?: number;
  difficulty: QuizDifficulty;
  questions: Question[];
};

export class QuizImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizImportError";
  }
}

function stripFences(raw: string): string {
  let s = raw.trim();
  const fenced = /^```(?:json|JSON)?\s*([\s\S]*?)```$/m.exec(s);
  if (fenced?.[1]) s = fenced[1].trim();
  // Some models wrap with prose before/after the object — take outermost { ... }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

function asString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new QuizImportError(`Missing or empty "${field}".`);
  return v.trim();
}

function newId(): string {
  return crypto.randomUUID();
}

function parseDifficulty(v: unknown): QuizDifficulty {
  if (v === "easy" || v === "medium" || v === "hard") return v;
  return "medium";
}

function parseQuestion(raw: unknown, index: number): Question {
  if (!raw || typeof raw !== "object")
    throw new QuizImportError(`Question ${index + 1} is not an object.`);
  const q = raw as Record<string, unknown>;
  const type = q["type"];
  const id = typeof q["id"] === "string" && q["id"].trim() ? q["id"].trim() : newId();
  const prompt = asString(q["prompt"], `questions[${index}].prompt`);
  const explanation = typeof q["explanation"] === "string" ? q["explanation"].trim() : "";

  if (type === "mcq") {
    const options = Array.isArray(q["options"])
      ? q["options"].map((o) => String(o ?? "").trim())
      : [];
    if (options.filter(Boolean).length < 2)
      throw new QuizImportError(`Question ${index + 1}: MCQ needs at least 2 options.`);
    const answer = Number(q["answer"]);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      throw new QuizImportError(`Question ${index + 1}: MCQ answer index out of range.`);
    }
    return { id, type: "mcq", prompt, options, answer, explanation };
  }

  if (type === "truefalse") {
    if (typeof q["answer"] !== "boolean")
      throw new QuizImportError(`Question ${index + 1}: truefalse answer must be boolean.`);
    return { id, type: "truefalse", prompt, answer: q["answer"], explanation };
  }

  if (type === "fill") {
    const answer = Array.isArray(q["answer"])
      ? q["answer"].map((a) => String(a ?? "").trim()).filter(Boolean)
      : typeof q["answer"] === "string" && q["answer"].trim()
        ? [q["answer"].trim()]
        : [];
    if (!answer.length)
      throw new QuizImportError(`Question ${index + 1}: fill needs at least one accepted answer.`);
    return { id, type: "fill", prompt, answer, explanation };
  }

  if (type === "essay") {
    const keywords = Array.isArray(q["keywords"])
      ? q["keywords"].map((k) => String(k ?? "").trim()).filter(Boolean)
      : [];
    const minWords = Math.max(1, Number(q["minWords"]) || 30);
    return { id, type: "essay", prompt, keywords, minWords, explanation };
  }

  throw new QuizImportError(`Question ${index + 1}: unsupported type "${String(type)}".`);
}

/** Parse AI JSON (optionally fenced) into a Studia quiz payload. */
export function parseQuizImport(raw: string): ImportedQuiz {
  if (!raw.trim()) throw new QuizImportError("Paste the AI JSON first.");
  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch {
    throw new QuizImportError("Could not parse AI output. Check the JSON and try again.");
  }
  if (!data || typeof data !== "object") throw new QuizImportError("Root JSON must be an object.");
  const obj = data as Record<string, unknown>;
  const list = obj["questions"];
  if (!Array.isArray(list) || list.length === 0)
    throw new QuizImportError('JSON must include a non-empty "questions" array.');

  const questions = list.map((q, i) => parseQuestion(q, i));
  const minutesRaw = Number(obj["minutes"]);
  const minutes = Number.isFinite(minutesRaw)
    ? Math.max(1, Math.min(180, Math.round(minutesRaw)))
    : undefined;
  const title =
    typeof obj["title"] === "string" && obj["title"].trim() ? obj["title"].trim() : undefined;

  return {
    ...(title ? { title } : {}),
    ...(minutes !== undefined ? { minutes } : {}),
    difficulty: parseDifficulty(obj["difficulty"]),
    questions,
  };
}
