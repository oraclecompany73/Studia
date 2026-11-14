import { extractText, getDocumentProxy } from "unpdf";

const MAX_CHARS = 24_000;

export type QuizMaterialSource = {
  subjectName: string;
  lessonTitle: string;
  materialTitle: string;
  mimeType: string;
  /** Lesson notes + extracted PDF text (truncated). */
  content: string;
};

/** Downloads a material and builds text the AI prompt can ground on. */
export async function loadQuizMaterialSource(materialId: string): Promise<QuizMaterialSource> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: material, error } = await supabaseAdmin
    .from("materials")
    .select(
      "id, title, file_path, mime_type, lesson:lessons(id, title, summary, explanation, subject:subjects(id, name))",
    )
    .eq("id", materialId)
    .maybeSingle();

  if (error || !material) throw new Error("Material not found.");

  const lessonRaw = material.lesson as unknown;
  const lesson = (Array.isArray(lessonRaw) ? lessonRaw[0] : lessonRaw) as {
    title: string;
    summary: string;
    explanation: string;
    subject: { name: string } | { name: string }[] | null;
  } | null;

  if (!lesson) throw new Error("Lesson not found for this file.");
  const subject = Array.isArray(lesson.subject) ? lesson.subject[0] : lesson.subject;
  const subjectName = subject?.name ?? "Studia";

  const parts: string[] = [];
  parts.push(`Lesson: ${lesson.title}`);
  if (lesson.summary?.trim()) parts.push(`Summary:\n${lesson.summary.trim()}`);
  if (lesson.explanation?.trim()) parts.push(`Explanation notes:\n${lesson.explanation.trim()}`);

  const mime = (material.mime_type || "").toLowerCase();
  const path = material.file_path;
  const isPdf = mime.includes("pdf") || path.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const { data: file, error: dlError } = await supabaseAdmin.storage
      .from("materials")
      .download(path);
    if (dlError || !file) {
      console.error("PDF download failed:", dlError?.message);
      parts.push(
        `PDF file title: ${material.title}\n(Could not extract PDF text; use the lesson notes above and the file title as context.)`,
      );
    } else {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await getDocumentProxy(bytes);
        const extracted = await extractText(pdf, { mergePages: true });
        const text = (typeof extracted.text === "string" ? extracted.text : "").trim();
        if (text) parts.push(`PDF content ("${material.title}"):\n${text}`);
        else parts.push(`PDF file title: ${material.title}\n(No extractable text in this PDF.)`);
      } catch (e) {
        console.error("PDF extract failed:", e);
        parts.push(
          `PDF file title: ${material.title}\n(PDF text extraction failed; use the lesson notes and file title.)`,
        );
      }
    }
  } else {
    parts.push(`Attached file: ${material.title} (${material.mime_type || "file"})`);
  }

  let content = parts.join("\n\n");
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + "\n\n[…truncated for length…]";
  }

  return {
    subjectName,
    lessonTitle: lesson.title,
    materialTitle: material.title,
    mimeType: material.mime_type,
    content,
  };
}
