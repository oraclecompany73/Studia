import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminQuizzesQuery,
  subjectsQuery,
  type AdminQuiz,
  type Material,
  type Subject,
} from "@/lib/content";
import type { Question, QuizDifficulty } from "@/lib/data";
import { quizDifficulties, quizDifficultyLabel } from "@/lib/data";
import { notifyNewQuiz } from "@/lib/push.functions";
import { QuizAiImport } from "./QuizAiImport";
import {
  Badge,
  btn,
  btnDanger,
  btnGhost,
  Card,
  confirmDelete,
  EmptyState,
  field,
  Label,
  SearchField,
  SectionCard,
  Spinner,
  useSave,
} from "./shared";
import { translate as tr } from "@/lib/i18n";

const KEYS = [["quizzes"], ["admin-quizzes"]];
const typeLabel = {
  mcq: "Multiple choice",
  truefalse: "True / False",
  fill: "Fill in the blank",
  essay: "Short essay",
};

function blank(type: Question["type"]): Question {
  const id = crypto.randomUUID();
  if (type === "mcq")
    return { id, type, prompt: "", options: ["", ""], answer: 0, explanation: "" };
  if (type === "truefalse") return { id, type, prompt: "", answer: true, explanation: "" };
  if (type === "fill") return { id, type, prompt: "", answer: [""], explanation: "" };
  return { id, type, prompt: "", keywords: [], minWords: 30, explanation: "" };
}

type MaterialOption = Material & { lessonTitle: string };

function materialsForSubject(subjects: Subject[], subjectId: string): MaterialOption[] {
  const subject = subjects.find((s) => s.id === subjectId);
  if (!subject) return [];
  return subject.lessons.flatMap((l) => l.materials.map((m) => ({ ...m, lessonTitle: l.title })));
}

function materialLabel(subjects: Subject[], materialId: string | null): string {
  if (!materialId) return "";
  for (const s of subjects) {
    for (const l of s.lessons) {
      const m = l.materials.find((x) => x.id === materialId);
      if (m) return `${m.title} · ${l.title}`;
    }
  }
  return "";
}

const difficultyTone = { easy: "success", medium: "warning", hard: "danger" } as const;

export function QuizzesAdmin() {
  const { data: quizzes } = useSuspenseQuery(adminQuizzesQuery);
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const [editing, setEditing] = useState<AdminQuiz | "new" | null>(null);
  const [q, setQ] = useState("");
  const save = useSave();
  const hasFiles = subjects.some((s) => s.lessons.some((l) => l.materials.length > 0));
  const needle = q.trim().toLowerCase();
  const filtered = quizzes.filter((z) =>
    `${z.title} ${subjects.find((s) => s.id === z.subject_id)?.name ?? ""}`
      .toLowerCase()
      .includes(needle),
  );

  if (editing)
    return (
      <QuizEditor
        {...(editing === "new" ? {} : { initial: editing })}
        onDone={() => setEditing(null)}
      />
    );

  return (
    <SectionCard
      title="Quizzes"
      hint={quizzes.length ? tr("{n} quizzes total", { n: quizzes.length }) : undefined}
      actions={
        <button className={btn} disabled={!hasFiles} onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          {tr("New quiz")}
        </button>
      }
      bodyClassName="space-y-4"
    >
      {!subjects.length && (
        <EmptyState
          icon={ListChecks}
          title="Add a subject first."
          hint="Quizzes attach to a subject and its lesson PDFs."
        />
      )}
      {subjects.length > 0 && !hasFiles && (
        <EmptyState
          icon={ListChecks}
          title="Upload a lesson PDF first"
          hint="Upload a lesson PDF under Subjects before creating a quiz."
        />
      )}
      {hasFiles && quizzes.length > 0 && (
        <SearchField value={q} onChange={setQ} placeholder="Search quizzes" />
      )}
      {hasFiles && quizzes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">{tr("No quizzes match your search.")}</p>
      )}
      <ul className="divide-y">
        {filtered.map((qz) => (
          <li key={qz.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{qz.title}</p>
                <Badge tone={difficultyTone[qz.difficulty]}>
                  {tr(quizDifficultyLabel[qz.difficulty])}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {subjects.find((s) => s.id === qz.subject_id)?.name}
                {qz.material_id ? ` · ${materialLabel(subjects, qz.material_id)}` : ""}
                {" · "}
                {tr(qz.questions.length === 1 ? "{n} question" : "{n} questions", {
                  n: qz.questions.length,
                })}
                {" · "}
                {tr("{n} min", { n: qz.minutes })}
              </p>
            </div>
            <button className={btnGhost} onClick={() => setEditing(qz)}>
              <Pencil className="h-4 w-4" />
              {tr("Edit")}
            </button>
            <button
              className={btnDanger}
              aria-label={tr("Delete quiz")}
              onClick={async () => {
                if (confirmDelete(tr('quiz "{title}"', { title: qz.title })))
                  await save(
                    () => supabase.from("quizzes").delete().eq("id", qz.id),
                    "Quiz deleted",
                    KEYS,
                  );
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {hasFiles && quizzes.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No quizzes yet."
          hint="Create your first quiz from a lesson PDF — AI can draft the questions."
          action={
            <button className={btnGhost} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              {tr("New quiz")}
            </button>
          }
        />
      )}
    </SectionCard>
  );
}

function QuizEditor({ initial, onDone }: { initial?: AdminQuiz; onDone: () => void }) {
  const { data: subjects } = useSuspenseQuery(subjectsQuery);
  const save = useSave();
  const qc = useQueryClient();
  const notifyQuiz = useServerFn(notifyNewQuiz);

  const firstSubjectWithFiles = subjects.find((s) => s.lessons.some((l) => l.materials.length > 0));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subjectId, setSubjectId] = useState(
    initial?.subject_id ?? firstSubjectWithFiles?.id ?? subjects[0]?.id ?? "",
  );
  const files = useMemo(() => materialsForSubject(subjects, subjectId), [subjects, subjectId]);
  const [materialId, setMaterialId] = useState<string>(initial?.material_id ?? files[0]?.id ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? 10);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(initial?.difficulty ?? "medium");
  const [questions, setQuestions] = useState<Question[]>(initial?.questions ?? []);
  const [notify, setNotify] = useState(!initial);
  const [busy, setBusy] = useState(false);

  const setQ = (i: number, q: Question) =>
    setQuestions((xs) => xs.map((x, j) => (j === i ? q : x)));

  function onSubjectChange(id: string) {
    setSubjectId(id);
    const next = materialsForSubject(subjects, id);
    setMaterialId(next[0]?.id ?? "");
  }

  async function submit() {
    if (!title.trim()) {
      toast.error(tr("Quiz title is required."));
      return;
    }
    if (!materialId) {
      toast.error(tr("Select a lesson PDF for this quiz."));
      return;
    }
    if (!questions.length) {
      toast.error(tr("Add at least one question."));
      return;
    }
    for (const [n, q] of questions.entries()) {
      if (!q.prompt.trim()) {
        toast.error(tr("Question {n} needs a prompt.", { n: n + 1 }));
        return;
      }
      if (q.type === "mcq" && q.options.filter((o) => o.trim()).length < 2) {
        toast.error(tr("Question {n} needs at least 2 options.", { n: n + 1 }));
        return;
      }
      if (q.type === "fill" && !q.answer.some((a) => a.trim())) {
        toast.error(tr("Question {n} needs an accepted answer.", { n: n + 1 }));
        return;
      }
    }
    const clean = questions.map((q): Question => {
      if (q.type === "mcq") return { ...q, options: q.options.map((o) => o.trim()) };
      if (q.type === "fill") return { ...q, answer: q.answer.map((a) => a.trim()).filter(Boolean) };
      if (q.type === "essay")
        return { ...q, keywords: q.keywords.map((k) => k.trim()).filter(Boolean) };
      return q;
    });
    setBusy(true);
    const row = {
      title: title.trim(),
      subject_id: subjectId,
      material_id: materialId,
      minutes: Math.max(1, Math.min(180, minutes)),
      difficulty,
      questions: clean,
    };
    let quizId = initial?.id;
    const ok = await save(
      async () => {
        if (initial) return supabase.from("quizzes").update(row).eq("id", initial.id);
        const r = await supabase.from("quizzes").insert(row).select("id").single();
        quizId = r.data?.id;
        return r;
      },
      "Quiz saved",
      KEYS,
    );
    if (ok && notify && quizId && !initial) {
      try {
        const { sent } = await notifyQuiz({ data: { quizId } });
        await qc.invalidateQueries({ queryKey: ["announcements"] });
        toast.success(tr("Students notified ({n} devices)", { n: sent }));
      } catch (err) {
        console.error(err);
        toast.error(tr("Saved, but phone notifications couldn't be sent."));
      }
    }
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <div className="space-y-4">
      <Card title={initial ? "Edit quiz" : "New quiz"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <Label>Title</Label>
            <input
              className={field}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="block">
            <Label>Subject</Label>
            <select
              className={field}
              value={subjectId}
              onChange={(e) => onSubjectChange(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Lesson PDF</Label>
            <select
              className={field}
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
            >
              {files.length === 0 && <option value="">{tr("No PDFs in this subject")}</option>}
              {files.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} — {m.lessonTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Label>Minutes</Label>
            <input
              type="number"
              min={1}
              max={180}
              className={field}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <Label>Difficulty</Label>
            <select
              className={field}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
            >
              {quizDifficulties.map((d) => (
                <option key={d} value={d}>
                  {tr(quizDifficultyLabel[d])}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {tr("Quizzes are based on a subject lesson PDF — you don't write a separate topic.")}
        </p>
        <div className="mt-3">
          <QuizAiImport
            materialId={materialId || null}
            title={title}
            minutes={minutes}
            difficulty={difficulty}
            onImported={(data) => {
              if (data.title) setTitle(data.title);
              if (data.minutes) setMinutes(data.minutes);
              setDifficulty(data.difficulty);
              setQuestions(data.questions);
            }}
          />
        </div>
      </Card>

      {questions.map((q, i) => (
        <Card key={q.id}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-primary">
              {tr("Question {n} · {type}", { n: i + 1, type: tr(typeLabel[q.type]) })}
            </p>
            <button
              className={btnDanger}
              aria-label={tr("Remove question")}
              onClick={() => setQuestions((xs) => xs.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <textarea
              className={field}
              rows={2}
              placeholder={tr("Question")}
              value={q.prompt}
              onChange={(e) => setQ(i, { ...q, prompt: e.target.value })}
            />
            {q.type === "mcq" && (
              <div className="space-y-2">
                <Label hint="(pick the correct one)">Options</Label>
                {q.options.map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`ans-${q.id}`}
                      aria-label={tr("Option {n} is correct", { n: k + 1 })}
                      checked={q.answer === k}
                      onChange={() => setQ(i, { ...q, answer: k })}
                    />
                    <input
                      className={field}
                      placeholder={tr("Option {l}", { l: String.fromCharCode(65 + k) })}
                      value={o}
                      onChange={(e) =>
                        setQ(i, {
                          ...q,
                          options: q.options.map((x, j) => (j === k ? e.target.value : x)),
                        })
                      }
                    />
                    {q.options.length > 2 && (
                      <button
                        className={btnDanger}
                        aria-label={tr("Remove option")}
                        onClick={() =>
                          setQ(i, {
                            ...q,
                            options: q.options.filter((_, j) => j !== k),
                            answer: q.answer === k ? 0 : q.answer > k ? q.answer - 1 : q.answer,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <button
                    className={btnGhost}
                    onClick={() => setQ(i, { ...q, options: [...q.options, ""] })}
                  >
                    <Plus className="h-4 w-4" />
                    {tr("Add option")}
                  </button>
                )}
              </div>
            )}
            {q.type === "truefalse" && (
              <label className="block">
                <Label>Correct answer</Label>
                <select
                  className={field}
                  value={q.answer ? "true" : "false"}
                  onChange={(e) => setQ(i, { ...q, answer: e.target.value === "true" })}
                >
                  <option value="true">{tr("True")}</option>
                  <option value="false">{tr("False")}</option>
                </select>
              </label>
            )}
            {q.type === "fill" && (
              <label className="block">
                <Label hint="(comma separated)">Accepted answers</Label>
                <input
                  className={field}
                  value={q.answer.join(", ")}
                  onChange={(e) => setQ(i, { ...q, answer: e.target.value.split(",") })}
                />
              </label>
            )}
            {q.type === "essay" && (
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <label className="block">
                  <Label hint="(comma separated, used for scoring)">Key words</Label>
                  <input
                    className={field}
                    value={q.keywords.join(", ")}
                    onChange={(e) => setQ(i, { ...q, keywords: e.target.value.split(",") })}
                  />
                </label>
                <label className="block">
                  <Label>Min words</Label>
                  <input
                    type="number"
                    min={1}
                    className={field}
                    value={q.minWords}
                    onChange={(e) => setQ(i, { ...q, minWords: Number(e.target.value) })}
                  />
                </label>
              </div>
            )}
            <input
              className={field}
              placeholder={tr("Explanation shown after the quiz")}
              value={q.explanation}
              onChange={(e) => setQ(i, { ...q, explanation: e.target.value })}
            />
          </div>
        </Card>
      ))}

      <Card>
        <p className="mb-3 text-sm font-semibold">{tr("Add a question")}</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(typeLabel) as Question["type"][]).map((t) => (
            <button
              key={t}
              className={btnGhost}
              onClick={() => setQuestions((xs) => [...xs, blank(t)])}
            >
              <Plus className="h-4 w-4" />
              {tr(typeLabel[t])}
            </button>
          ))}
        </div>
      </Card>

      {!initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          {tr("Notify students on their phones")}
        </label>
      )}
      <div className="flex gap-2">
        <button className={btn} disabled={busy} onClick={submit}>
          {busy && <Spinner />}
          {tr("Save quiz")}
        </button>
        <button className={btnGhost} onClick={onDone}>
          {tr("Cancel")}
        </button>
      </div>
    </div>
  );
}
