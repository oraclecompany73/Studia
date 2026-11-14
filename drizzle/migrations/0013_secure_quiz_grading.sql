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
