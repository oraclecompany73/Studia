-- Link each quiz to a lesson PDF/file (optional historically; new quizzes should set it).
alter table public.quizzes
  add column if not exists material_id uuid references public.materials(id) on delete set null;

create index if not exists quizzes_material_id_idx on public.quizzes (material_id);
