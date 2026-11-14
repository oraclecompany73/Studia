import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Question, QuizDifficulty } from "@/lib/data";
import { quizDifficulties, quizDifficultyLabel } from "@/lib/data";
import { buildQuizAiPrompt } from "@/lib/quiz-ai-prompt";
import { parseQuizImport, QuizImportError } from "@/lib/quiz-import";
import { getQuizMaterialSource } from "@/lib/quiz-material.functions";
import { translate as tr } from "@/lib/i18n";
import { btn, btnGhost, Card, field, Label } from "./shared";

const allTypes: Question["type"][] = ["mcq", "truefalse", "fill", "essay"];
const typeLabel: Record<Question["type"], string> = {
  mcq: "Multiple choice",
  truefalse: "True / False",
  fill: "Fill in the blank",
  essay: "Short essay",
};

export type QuizAiImportResult = {
  title?: string;
  minutes?: number;
  difficulty: QuizDifficulty;
  questions: Question[];
};

type Props = {
  materialId: string | null;
  title: string;
  minutes: number;
  difficulty: QuizDifficulty;
  onImported: (data: QuizAiImportResult) => void;
};

export function QuizAiImport({ materialId, title, minutes, difficulty, onImported }: Props) {
  const loadSource = useServerFn(getQuizMaterialSource);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [diff, setDiff] = useState<QuizDifficulty>(difficulty);
  const [types, setTypes] = useState<Question["type"][]>(["mcq", "truefalse"]);
  const [paste, setPaste] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  const [source, setSource] = useState<{
    subjectName: string;
    lessonTitle: string;
    materialTitle: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !materialId) {
      setSource(null);
      return;
    }
    let cancelled = false;
    setLoadingSource(true);
    setSource(null);
    loadSource({ data: { materialId } })
      .then((s) => {
        if (!cancelled) setSource(s);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          setSource(null);
          toast.error(tr("Couldn't read the lesson PDF. Check the file and try again."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSource(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, materialId, loadSource]);

  const prompt = useMemo(() => {
    if (!source) return "";
    return buildQuizAiPrompt({
      subjectName: source.subjectName,
      lessonTitle: source.lessonTitle,
      materialTitle: source.materialTitle,
      sourceContent: source.content,
      title,
      difficulty: diff,
      count,
      minutes,
      lang,
      types,
    });
  }, [source, title, diff, count, minutes, lang, types]);

  function toggleType(t: Question["type"]) {
    setTypes((xs) => {
      if (xs.includes(t)) return xs.length === 1 ? xs : xs.filter((x) => x !== t);
      return [...xs, t];
    });
  }

  async function copyPrompt() {
    if (!prompt) {
      toast.error(tr("Select a lesson PDF first."));
      return;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(tr("Prompt copied"));
    } catch {
      toast.error(tr("Something went wrong."));
    }
  }

  function importJson() {
    try {
      const data = parseQuizImport(paste);
      onImported(data);
      toast.success(tr("Questions imported ({n})", { n: data.questions.length }));
      setOpen(false);
    } catch (e) {
      const msg =
        e instanceof QuizImportError
          ? e.message
          : tr("Could not parse AI output. Check the JSON and try again.");
      toast.error(msg);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className={btnGhost}
        disabled={!materialId}
        title={!materialId ? tr("Select a lesson PDF first.") : undefined}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        {tr("Generate with AI")}
      </button>
    );
  }

  return (
    <Card title={tr("Build an AI prompt")}>
      <p className="mb-4 text-sm text-muted-foreground">
        {tr(
          "The quiz topic is taken from the selected lesson PDF. Copy the prompt to Gemini, then paste the JSON below.",
        )}
      </p>

      {loadingSource && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("Reading lesson PDF…")}
        </p>
      )}

      {source && !loadingSource && (
        <p className="mb-3 rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="font-semibold">{source.materialTitle}</span>
          <span className="text-muted-foreground">
            {" "}
            · {source.lessonTitle} · {source.subjectName}
          </span>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Label>Difficulty</Label>
          <select
            className={field}
            value={diff}
            onChange={(e) => setDiff(e.target.value as QuizDifficulty)}
          >
            {quizDifficulties.map((d) => (
              <option key={d} value={d}>
                {tr(quizDifficultyLabel[d])}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Number of questions</Label>
          <input
            type="number"
            min={1}
            max={50}
            className={field}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <Label>Question language</Label>
          <select
            className={field}
            value={lang}
            onChange={(e) => setLang(e.target.value as "ar" | "en")}
          >
            <option value="ar">{tr("Arabic")}</option>
            <option value="en">{tr("English")}</option>
          </select>
        </label>
        <div className="block sm:col-span-2">
          <Label>Allowed question types</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allTypes.map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
              >
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} />
                {tr(typeLabel[t])}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{tr("Copy prompt")}</p>
          <button
            type="button"
            className={btnGhost}
            disabled={!prompt || loadingSource}
            onClick={copyPrompt}
          >
            <Copy className="h-4 w-4" />
            {tr("Copy prompt")}
          </button>
        </div>
        <textarea
          className={`${field} font-mono text-xs`}
          rows={10}
          readOnly
          value={prompt || tr("Select a lesson PDF first.")}
          dir="ltr"
        />
      </div>

      <div className="mt-4">
        <Label>Paste AI output (JSON)</Label>
        <textarea
          className={`${field} mt-1 font-mono text-xs`}
          rows={8}
          dir="ltr"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder='{ "title": "...", "difficulty": "medium", "questions": [ ... ] }'
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={importJson}>
          <Upload className="h-4 w-4" />
          {tr("Import questions")}
        </button>
        <button type="button" className={btnGhost} onClick={() => setOpen(false)}>
          {tr("Cancel")}
        </button>
      </div>
    </Card>
  );
}
