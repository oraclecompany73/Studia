import { describe, expect, it } from "vitest";
import { parseQuizImport, QuizImportError } from "./quiz-import";

const sample = {
  title: "Algebra basics",
  minutes: 15,
  difficulty: "easy",
  questions: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      type: "mcq",
      prompt: "2+2?",
      options: ["3", "4", "5"],
      answer: 1,
      explanation: "2+2 equals 4.",
    },
    {
      type: "truefalse",
      prompt: "The sky is green.",
      answer: false,
      explanation: "The sky appears blue.",
    },
    {
      type: "fill",
      prompt: "Capital of France?",
      answer: ["Paris"],
      explanation: "Paris is the capital.",
    },
    {
      type: "essay",
      prompt: "Explain gravity.",
      keywords: ["force", "mass"],
      minWords: 20,
      explanation: "Gravity attracts masses.",
    },
  ],
};

describe("parseQuizImport", () => {
  it("parses clean JSON and fills missing ids", () => {
    const r = parseQuizImport(JSON.stringify(sample));
    expect(r.title).toBe("Algebra basics");
    expect(r.minutes).toBe(15);
    expect(r.difficulty).toBe("easy");
    expect(r.questions).toHaveLength(4);
    expect(r.questions[1]?.id).toBeTruthy();
    expect(r.questions[1]?.type).toBe("truefalse");
  });

  it("strips markdown fences", () => {
    const r = parseQuizImport("```json\n" + JSON.stringify(sample) + "\n```");
    expect(r.questions).toHaveLength(4);
  });

  it("rejects invalid MCQ answers", () => {
    const bad = {
      ...sample,
      questions: [{ type: "mcq", prompt: "x", options: ["a"], answer: 0, explanation: "" }],
    };
    expect(() => parseQuizImport(JSON.stringify(bad))).toThrow(QuizImportError);
  });

  it("defaults difficulty to medium when missing", () => {
    const { difficulty: _d, ...rest } = sample;
    const r = parseQuizImport(JSON.stringify(rest));
    expect(r.difficulty).toBe("medium");
  });
});
