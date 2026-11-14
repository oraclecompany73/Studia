# Studia

Arabic-first student learning companion (PWA): lessons, schedule, quizzes, progress, AI study plans, and an admin CMS.

**Stack:** TanStack Start · React 19 · Supabase (your own project) · Cloudflare Workers

Everything runs against a Supabase project that you own. Audio/PDF files live in a private `materials` bucket, AI calls go through OpenRouter, and the app deploys as a Cloudflare Worker.

---

## 1. Create your Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (pick your own organization, region and strong DB password).
2. Wait for provisioning, then note the values under **Project Settings → API**:
   - **Project URL** → `https://<project-ref>.supabase.co`
   - **Publishable key** (`sb_publishable_…`, client-safe)
   - **Secret key / service role** (`sb_secret_…` — server only, never in the browser)

## 2. Create the database schema

The whole schema (tables, RLS policies, storage bucket, functions, triggers) is in one file:

1. Open your project → **SQL Editor** → **New query**.
2. Paste the contents of [`drizzle/all-migrations.sql`](drizzle/all-migrations.sql) and run it once on the empty database.

This creates `subjects`, `lessons`, `materials`, `quizzes`, `events`, `announcements`, progress tables, `push_subscriptions`, the private `materials` storage bucket, all RLS policies, `is_admin()` / `is_owner()` / `student_quizzes()` / `admin_students()`, and the `@pua.edu.eg` signup trigger.

The numbered files in `drizzle/migrations/` are the same statements in order — use them instead if you prefer applying them one by one.

## 3. Enable Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → create an **OAuth client ID** (Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google** → paste the client ID/secret and enable it.
4. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: your deployed URL (e.g. `https://studia.<you>.workers.dev`)
   - **Redirect URLs**: add the deployed URL, `http://localhost:5173`, and `http://localhost:5173/dashboard`

## 4. Environment variables

Copy `.env.example` to `.env` and fill it in (see the table below). Only `@pua.edu.eg` accounts may sign in.

| Variable | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | `.env` + `wrangler.jsonc` vars | Your project URL (server) |
| `SUPABASE_PUBLISHABLE_KEY` | `.env` + `wrangler.jsonc` vars | Publishable key (server) |
| `VITE_SUPABASE_URL` | `.env` | Same URL, baked into the client bundle |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` | Same publishable key, for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | secret only | Server-side admin client (grading, push, stats) |
| `OPENROUTER_API_KEY` | secret, optional | AI study plans + file insights |
| `OPENROUTER_MODEL` | env, optional | Defaults to `openrouter/free` |
| `VAPID_SEED` | secret, optional | Web Push (VAPID keys are derived from it) |
| `DATABASE_URL` | `.env`, optional | Only for `drizzle-kit` migrations |

`wrangler.jsonc` `vars` must contain the same `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` you use locally.

> **IPv6 note:** for new projects the direct host `db.<ref>.supabase.co` resolves to IPv6 only.
> If your network has no IPv6 (or `drizzle-kit` fails with `ENOTFOUND`), use the connection pooler
> shown under **Project Settings → Database → Connection pooling**:
> `postgresql://postgres.<ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres`

## 5. Local development

```sh
npm i
cp .env.example .env   # fill in the Supabase values
npm run dev
```

## 6. Deploy to Cloudflare Workers

```sh
npx wrangler login
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put OPENROUTER_API_KEY   # optional
npx wrangler secret put VAPID_SEED           # optional
npm run deploy
```

Then add the deployed URL to Supabase **Authentication → URL Configuration** (Site URL + Redirect URLs).

## 7. First owner account

The schema seeds one owner row: `202604193@pua.edu.eg` in `admin_emails`. To use a different account, run this in the SQL editor before your first sign-in:

```sql
update public.admin_emails
set email = 'your.name@pua.edu.eg'
where role = 'owner';
```

That account becomes the owner (full admin access, can add/remove admins and transfer ownership). Every other `@pua.edu.eg` account is a student.

> To allow a different university domain, update both `src/lib/auth-email.ts` and the
> `enforce_pua_email()` trigger in the database.

## Scripts

| Command          | Purpose                      |
| ---------------- | ---------------------------- |
| `npm run dev`    | Local Vite + Workers runtime |
| `npm run build`  | Production build             |
| `npm run deploy` | Build + `wrangler deploy`    |
| `npm test`       | Vitest                       |
| `npm run lint`   | ESLint + Prettier            |
