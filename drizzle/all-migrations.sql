-- Studia schema (concat of drizzle/migrations/*.sql)
-- Prefer applying numbered migrations in order on an existing DB.

-- ===== 0000_student_progress.sql =====

CREATE TABLE public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  lesson_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_key)
);
GRANT SELECT, INSERT, DELETE ON public.lesson_completions TO authenticated;
GRANT ALL ON public.lesson_completions TO service_role;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions read" ON public.lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own completions insert" ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own completions delete" ON public.lesson_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  quiz_id text NOT NULL,
  correct int NOT NULL,
  total int NOT NULL,
  percent int NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts read" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own attempts insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);


-- ===== 0001_content_and_admin.sql =====

CREATE TABLE public.admin_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.admin_emails TO authenticated;
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "admins read admin list" ON public.admin_emails FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "admins add admins" ON public.admin_emails FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admins remove admins" ON public.admin_emails FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'book',
  instructor text NOT NULL DEFAULT '',
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  explanation text NOT NULL DEFAULT '',
  solutions jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  minutes int NOT NULL DEFAULT 10,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'class',
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'news',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects, public.lessons, public.materials, public.quizzes, public.events, public.announcements TO authenticated;
GRANT ALL ON public.subjects, public.lessons, public.materials, public.quizzes, public.events, public.announcements TO service_role;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write subjects" ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write lessons" ON public.lessons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students read materials" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write materials" ON public.materials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students read quizzes" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write quizzes" ON public.quizzes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write events" ON public.events FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "students read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins write announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE public.announcement_reads (
  user_id uuid NOT NULL DEFAULT auth.uid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reads select" ON public.announcement_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reads insert" ON public.announcement_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "students read material files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'materials');
CREATE POLICY "admins upload material files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials' AND public.is_admin());
CREATE POLICY "admins delete material files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'materials' AND public.is_admin());


-- ===== 0002_push_notifications.sql =====

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  lang text NOT NULL DEFAULT 'ar',
  time_zone text NOT NULL DEFAULT 'Africa/Cairo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subscriptions read" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own push subscriptions delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.announcements ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
CREATE INDEX announcements_event_id_idx ON public.announcements(event_id);


-- ===== 0003_scope_course_content_reads_to_signed_in.sql =====

ALTER POLICY "students read subjects" ON public.subjects USING ((select auth.uid()) IS NOT NULL);
ALTER POLICY "students read lessons" ON public.lessons USING ((select auth.uid()) IS NOT NULL);
ALTER POLICY "students read materials" ON public.materials USING ((select auth.uid()) IS NOT NULL);
ALTER POLICY "students read quizzes" ON public.quizzes USING ((select auth.uid()) IS NOT NULL);
ALTER POLICY "students read events" ON public.events USING ((select auth.uid()) IS NOT NULL);
ALTER POLICY "students read announcements" ON public.announcements USING ((select auth.uid()) IS NOT NULL);


-- ===== 0004_limit_material_file_reads_to_published.sql =====

DROP POLICY IF EXISTS "students read material files" ON storage.objects;
CREATE POLICY "students read material files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'materials'
  AND (select auth.uid()) IS NOT NULL
  AND (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.materials m WHERE m.file_path = storage.objects.name)
  )
);


-- ===== 0005_event_materials.sql =====

CREATE TABLE public.event_materials (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, material_id)
);
CREATE INDEX event_materials_material_id_idx ON public.event_materials(material_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_materials TO authenticated;
GRANT ALL ON public.event_materials TO service_role;
ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read event materials" ON public.event_materials FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "admins write event materials" ON public.event_materials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ===== 0006_material_opens_stats.sql =====

CREATE TABLE public.material_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  opened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX material_opens_event_idx ON public.material_opens(event_id);
GRANT SELECT, INSERT ON public.material_opens TO authenticated;
GRANT ALL ON public.material_opens TO service_role;
ALTER TABLE public.material_opens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students log own opens" ON public.material_opens FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.event_materials em WHERE em.event_id = material_opens.event_id AND em.material_id = material_opens.material_id)
  );
CREATE POLICY "own opens read" ON public.material_opens FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- Admin-only: every signed-up student with name/email, for open-rate stats.
CREATE OR REPLACE FUNCTION public.admin_students()
RETURNS TABLE (user_id uuid, email text, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')::text
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(u.email))
    ORDER BY 3, 2;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_students() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_students() TO authenticated;


-- ===== 0007_admin_student_accounts.sql =====

CREATE OR REPLACE FUNCTION public.admin_student_accounts()
RETURNS TABLE (user_id uuid, email text, full_name text, avatar_url text, provider text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
    SELECT u.id, u.email::text,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')::text,
      coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '')::text,
      coalesce(u.raw_app_meta_data ->> 'provider', 'email')::text,
      u.created_at, u.last_sign_in_at, u.email_confirmed_at
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.admin_emails a WHERE lower(a.email) = lower(u.email))
    ORDER BY u.created_at DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_student_accounts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_accounts() TO authenticated;


-- ===== 0008_restrict_pua_email.sql =====

-- Only allow accounts with @pua.edu.eg email addresses.
create or replace function public.enforce_pua_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null
     or lower(new.email) !~ '^[^@[:space:]]+@pua\.edu\.eg$' then
    raise exception 'Only @pua.edu.eg email addresses are allowed'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_pua_email_on_signup on auth.users;
create trigger enforce_pua_email_on_signup
  before insert or update of email on auth.users
  for each row
  execute function public.enforce_pua_email();


-- ===== 0009_owner_admin_roles.sql =====

-- Three roles: owner (single), admin (many), student (everyone else — no row needed).
alter table public.admin_emails
  add column if not exists role text not null default 'admin';

alter table public.admin_emails
  drop constraint if exists admin_emails_role_check;

alter table public.admin_emails
  add constraint admin_emails_role_check check (role in ('owner', 'admin'));

-- Exactly one owner row at a time.
drop index if exists public.admin_emails_one_owner;
create unique index admin_emails_one_owner
  on public.admin_emails ((true))
  where role = 'owner';

-- Seed / promote the platform owner. Safe to re-run.
insert into public.admin_emails (email, role)
values ('202604193@pua.edu.eg', 'owner')
on conflict (email) do update set role = 'owner';

-- Demote any other accidental owners (keeps the seeded email as the sole owner).
update public.admin_emails
set role = 'admin'
where role = 'owner'
  and lower(email) <> lower('202604193@pua.edu.eg');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and role = 'owner'
  );
$$;

grant execute on function public.is_owner() to authenticated;

-- Replace admin-management policies: only the owner may add/remove admins.
drop policy if exists "admins add admins" on public.admin_emails;
drop policy if exists "admins remove admins" on public.admin_emails;
drop policy if exists "owner add admins" on public.admin_emails;
drop policy if exists "owner remove admins" on public.admin_emails;

create policy "owner add admins"
  on public.admin_emails
  for insert
  to authenticated
  with check (public.is_owner() and role = 'admin');

create policy "owner remove admins"
  on public.admin_emails
  for delete
  to authenticated
  using (public.is_owner() and role = 'admin');

-- Transfer ownership: demote current owner to admin, promote the target to owner.
create or replace function public.transfer_ownership(new_owner_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := lower(coalesce(auth.jwt() ->> 'email', ''));
  target text := lower(trim(new_owner_email));
begin
  if not public.is_owner() then
    raise exception 'Only the owner can transfer ownership'
      using errcode = '42501';
  end if;
  if target is null or target !~ '^[^@[:space:]]+@pua\.edu\.eg$' then
    raise exception 'Owner must use a @pua.edu.eg email'
      using errcode = '22023';
  end if;
  if target = me then
    raise exception 'You are already the owner'
      using errcode = '22023';
  end if;

  update public.admin_emails
  set role = 'admin'
  where lower(email) = me and role = 'owner';

  insert into public.admin_emails (email, role)
  values (target, 'owner')
  on conflict (email) do update set role = excluded.role;
end;
$$;

grant execute on function public.transfer_ownership(text) to authenticated;


-- ===== 0010_quiz_difficulty.sql =====

alter table public.quizzes
  add column if not exists difficulty text not null default 'medium';

alter table public.quizzes
  drop constraint if exists quizzes_difficulty_check;

alter table public.quizzes
  add constraint quizzes_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));


-- ===== 0011_quiz_material.sql =====

-- Link each quiz to a lesson PDF/file (optional historically; new quizzes should set it).
alter table public.quizzes
  add column if not exists material_id uuid references public.materials(id) on delete set null;

create index if not exists quizzes_material_id_idx on public.quizzes (material_id);


-- ===== 0012_materials_bucket.sql =====

-- Create the private "materials" storage bucket (needed for lesson PDF uploads).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'video/mp4',
    'application/octet-stream'
  ]
)
on conflict (id) do nothing;


-- ===== 0013_secure_quiz_grading.sql =====

-- Hide answer keys from students and stop client-trusted quiz scores.
-- Students read quizzes via student_quizzes(); attempts are inserted only by the
-- authenticated submitQuizAttempt server fn (service role).

DROP POLICY IF EXISTS "students read quizzes" ON public.quizzes;

-- Admins already have FOR ALL via "admins write quizzes". Explicit SELECT keeps
-- intent clear if that write policy is ever narrowed.
DROP POLICY IF EXISTS "admins read quizzes" ON public.quizzes;
CREATE POLICY "admins read quizzes" ON public.quizzes
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.strip_quiz_question(q jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE q->>'type'
    WHEN 'mcq' THEN jsonb_build_object(
      'id', q->'id',
      'type', q->'type',
      'prompt', q->'prompt',
      'options', COALESCE(q->'options', '[]'::jsonb)
    )
    WHEN 'truefalse' THEN jsonb_build_object(
      'id', q->'id',
      'type', q->'type',
      'prompt', q->'prompt'
    )
    WHEN 'fill' THEN jsonb_build_object(
      'id', q->'id',
      'type', q->'type',
      'prompt', q->'prompt'
    )
    WHEN 'essay' THEN jsonb_build_object(
      'id', q->'id',
      'type', q->'type',
      'prompt', q->'prompt',
      'minWords', COALESCE((q->>'minWords')::int, 30)
    )
    ELSE jsonb_build_object(
      'id', q->'id',
      'type', COALESCE(q->>'type', 'mcq'),
      'prompt', COALESCE(q->>'prompt', '')
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.student_quizzes()
RETURNS SETOF public.quizzes
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN QUERY
  SELECT
    q.id,
    q.subject_id,
    q.title,
    q.minutes,
    COALESCE(
      (
        SELECT jsonb_agg(public.strip_quiz_question(t.elem) ORDER BY t.ord)
        FROM jsonb_array_elements(COALESCE(q.questions, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
      ),
      '[]'::jsonb
    ) AS questions,
    q.created_at,
    q.difficulty,
    q.material_id
  FROM public.quizzes q
  ORDER BY q.created_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.strip_quiz_question(jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.student_quizzes() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.student_quizzes() TO authenticated;

DROP POLICY IF EXISTS "own attempts insert" ON public.quiz_attempts;
REVOKE INSERT ON public.quiz_attempts FROM authenticated;


-- ===== 0014_p1_opens_and_mimes.sql =====

-- One open log per student per event file (stops spam that inflates engagement stats).
DELETE FROM public.material_opens a
USING public.material_opens b
WHERE a.user_id = b.user_id
  AND a.event_id = b.event_id
  AND a.material_id = b.material_id
  AND a.opened_at > b.opened_at;

DELETE FROM public.material_opens a
USING public.material_opens b
WHERE a.user_id = b.user_id
  AND a.event_id = b.event_id
  AND a.material_id = b.material_id
  AND a.opened_at = b.opened_at
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS material_opens_user_event_material_uidx
  ON public.material_opens (user_id, event_id, material_id);

-- Align storage MIME allow-list with admin upload accept (Word + existing types).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'application/octet-stream'
]
WHERE id = 'materials';


