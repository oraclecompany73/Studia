alter table public.quizzes
  add column if not exists difficulty text not null default 'medium';

alter table public.quizzes
  drop constraint if exists quizzes_difficulty_check;

alter table public.quizzes
  add constraint quizzes_difficulty_check
  check (difficulty in ('easy', 'medium', 'hard'));
