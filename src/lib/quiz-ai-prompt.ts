import type { Question, QuizDifficulty } from "./data";

export type QuizAiPromptInput = {
  subjectName: string;
  lessonTitle: string;
  materialTitle: string;
  /** Extracted lesson notes + PDF text. */
  sourceContent: string;
  title: string;
  difficulty: QuizDifficulty;
  count: number;
  minutes: number;
  lang: "ar" | "en";
  types: Question["type"][];
};

const typeDocs: Record<Question["type"], string> = {
  mcq: `{ "id": "<uuid>", "type": "mcq", "prompt": "...", "options": ["A","B","C","D"], "answer": 0, "explanation": "detailed why" }
  - options: 2–6 strings
  - answer: 0-based index of the correct option`,
  truefalse: `{ "id": "<uuid>", "type": "truefalse", "prompt": "...", "answer": true, "explanation": "detailed why" }
  - answer: boolean`,
  fill: `{ "id": "<uuid>", "type": "fill", "prompt": "...", "answer": ["accepted1","accepted2"], "explanation": "detailed why" }
  - answer: non-empty array of accepted strings (case-insensitive match)`,
  essay: `{ "id": "<uuid>", "type": "essay", "prompt": "...", "keywords": ["kw1","kw2"], "minWords": 30, "explanation": "model answer / rubric notes" }
  - keywords: used for soft scoring
  - minWords: positive integer`,
};

/** Builds a strict prompt the admin can paste into Gemini (or any AI). */
export function buildQuizAiPrompt(input: QuizAiPromptInput): string {
  const count = Math.max(1, Math.min(50, Math.round(input.count) || 10));
  const minutes = Math.max(1, Math.min(180, Math.round(input.minutes) || 10));
  const types = input.types.length
    ? input.types
    : (["mcq", "truefalse", "fill", "essay"] as Question["type"][]);
  const langLine =
    input.lang === "ar"
      ? "Write every prompt, option, explanation and keyword in clear Modern Standard Arabic."
      : "Write every prompt, option, explanation and keyword in clear English.";

  const typeBlocks = types.map((t) => `### ${t}\n${typeDocs[t]}`).join("\n\n");
  const source = input.sourceContent.trim() || "(No source text available.)";

  return `You are generating quiz content for Studia (a university learning app).

## Task
Create a ${input.difficulty} difficulty quiz grounded ONLY in the study material below.
Subject: "${input.subjectName || "General"}"
Lesson: "${input.lessonTitle || "—"}"
Source file (PDF/notes): "${input.materialTitle || "—"}"
Title hint (optional): "${input.title || "Practice quiz"}"
Number of questions: exactly ${count}
Suggested time limit (minutes): ${minutes}
Allowed question types (mix them thoughtfully): ${types.join(", ")}

${langLine}

## CRITICAL grounding rules
1. Use ONLY facts, definitions, procedures and examples that appear in the SOURCE MATERIAL section.
2. Do NOT invent topics that are not covered in the source.
3. Prefer questions that check understanding of the PDF/lesson explanation.
4. If the source is thin, stay within it — never pad with unrelated curriculum.

## Difficulty guidance
- easy: foundational recall and direct application from the source; short stems.
- medium: multi-step reasoning from the source; plausible distractors for MCQ.
- hard: synthesis / edge cases / misconceptions that still follow from the source.

## SOURCE MATERIAL (from the selected lesson PDF / notes)
<<<
${source}
>>>

## Output rules (CRITICAL)
1. Respond with RAW JSON only. No markdown fences, no commentary, no trailing text.
2. The JSON MUST match this shape:
{
  "title": "string",
  "minutes": ${minutes},
  "difficulty": "${input.difficulty}",
  "questions": [ /* ${count} question objects */ ]
}
3. difficulty must be exactly one of: "easy" | "medium" | "hard".
4. Each question MUST include a non-empty "explanation" that teaches the correct answer in detail (cite the idea from the source).
5. Generate a new UUID string for every question "id".
6. Do not invent unsupported "type" values.

## Question object schemas

${typeBlocks}

## Quality checklist before you answer
- Exactly ${count} questions.
- Only types from: ${types.join(", ")}.
- Valid JSON (double quotes, no trailing commas).
- MCQ answer index in range; fill answers non-empty; essay minWords >= 1.
- Every question is answerable from the SOURCE MATERIAL alone.
`;
}
