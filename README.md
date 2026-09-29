# StudyPilot

A gamified, AI-powered study app for high-school students, starting with the NSW HSC and also supporting SAT, ACT, AP, GCSE, A-Level and IB. The AI tutor is **Pip**, a cheerful blue bird. The app launches as a **private beta**: invited students get every feature free.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + RLS, Auth, Storage, Realtime) · Anthropic Claude (server-side only) · Recharts · KaTeX · Stripe (behind a flag) · PWA.

## Features

| Area | What's there |
|---|---|
| Accounts | Email + password with a 6-digit email code, Google (Apple behind a flag), "keep me logged in", password reset by code, TOTP two-factor, login history, accounts-on-this-device switcher, demo student |
| Private beta | Server-side invite codes (`PREFIX-XXXX`, usage limits, enable/disable, lockout after 8 failures), BETA TESTER badge and tags, removal sends students back to the code screen |
| Gamification | XP rules from the spec, levels `floor(sqrt(xp/40))+1`, streaks, 11 badges, level-up modal, toasts, notifications |
| Lessons | Duolingo-style path for 20 courses (265 lessons), lesson player (steps, worked examples, 4 check questions, stars), 2 built-in lessons, AI lessons cached per course + lesson + system + language, "Get a new version" |
| Ask Pip | Streaming tutor with subject, mode and level, Markdown + KaTeX, stop, history, ratings filed as AI-accuracy feedback |
| Exam papers | AI generator in real-exam format, sample HSC paper, countdown with auto-submit, autosave, AI marking with clamped marks, bands, essay analysis, mistakes → flashcards |
| Flashcards | AI decks from notes, text files, PDFs and photos; Leitner spaced repetition; flip-card review; quiz |
| Planner | Weekly plan algorithm, hours sliders, exams, homework (+15 XP), month calendar, AI revision timeline |
| Groups | Codes, weekly/all-time leaderboards (privacy-aware), shared goal, weekly papers challenge (+200 XP), moderated announcements, realtime |
| Progress | Hours, average score + trend, accuracy, predicted band; charts for daily minutes, paper scores, time by subject, subject performance; weak areas |
| Study tools | Pomodoro (server-verified focus blocks, wake lock), safe scientific calculator (no `eval`), cloud notes → flashcards |
| Verified study | Evidence upload with hashing (reuse rejected), 6h/day cap, AI photo check, suspicious-pattern flags, admin review |
| Beta admin | Metrics, invite codes, beta users (remove/restore), most-used features, announcements, feedback triage with status notifications, anti-cheat review, moderation, Sentry link |
| Plans | Free / Premium $20 / Premium Exam $30 (AUD), pick-for-launch, comparison; Stripe checkout, portal and webhook when `BILLING_ENABLED=1`; AI quotas per plan |
| Notifications | In-app bell; hourly job for reminders at each student's local reminder time, exam countdowns, streak risk, competition, challenges; web push and email (Resend) respecting quiet hours and frequency |
| Everything else | Light/dark/system themes, 5 languages (navigation and AI output), PWA with offline page, WCAG AA contrast (axe-tested in both themes), responsive to 390px |

## Getting started

Requirements: Node 20.9+, pnpm 10.

```bash
pnpm install
cp .env.example .env.local
```

### Option A: Supabase CLI (recommended, needs Docker)

```bash
npx supabase start          # runs migrations and supabase/seed.sql
npx supabase status         # copy API URL, anon key and service_role key into .env.local
pnpm dev
```

### Option B: no Docker (cloud dev containers)

Runs GoTrue, PostgREST and a small proxy against a local Postgres 16. See [`scripts/dev-supabase/README.md`](scripts/dev-supabase/README.md).

```bash
pnpm db:setup    # once: downloads binaries, creates roles, fills .env.local
pnpm db:start    # starts the backend and applies migrations + seed
pnpm dev
```

Verification and reset codes appear in `.dev-supabase/mail.log`. Storage and Realtime aren't available in this mode: evidence uploads are skipped outside production, and groups fall back to polling.

### Try it

- Sign up, enter the code from `.dev-supabase/mail.log` (option B) or Inbucket at http://localhost:54324 (option A), then use invite code **`PILOT-2026`**.
- Or click **Explore with the demo student** on the login page (`NEXT_PUBLIC_DEMO_MODE=1`).
- Seed invite codes: `PILOT-2026` (25 uses), `HSC-EARLY-7QX4` (1 use), `NEWCASTLE-BETA` (disabled).
- **ardennescorporate@gmail.com** becomes an admin on sign-up (via the `admin_emails` table) and sees **Beta Admin** in the sidebar.

### AI

Set `ANTHROPIC_API_KEY` for real AI. Without it, development runs in **mock mode** with canned lessons, papers, marking and tutor replies. Production shows a friendly "not configured" message instead. Models are `claude-opus-5-5` for lessons, papers, marking, tutor and timelines, and `claude-haiku-4-5` for evidence checks and flashcards. Override them with `AI_MODEL_STRONG` / `AI_MODEL_FAST`. Strong-model calls opt in to server-side refusal fallbacks.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | Route types + `tsc` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest: domain unit tests, plus database integration tests (RLS, invite codes, XP) when Postgres is reachable |
| `pnpm test:e2e` | Playwright: sign-up flow, beta gate, lesson flow, paper flow, no horizontal scroll at 390px, axe accessibility in light and dark. Set `CHROMIUM_PATH` if browsers aren't installed. |
| `node --experimental-strip-types scripts/gen-content-sql.mts` | Regenerates the curricula/achievements migration from `src/lib/content/*` |
| `node scripts/gen-icons.mjs` | Re-renders Pip app icons (needs `pnpm dev` running) |

## Architecture

```
src/app/(auth)/        sign-up, verify, invite, profile setup, login, 2FA, reset
src/app/(app)/         the app (layout enforces: signed in → verified → 2FA → beta → onboarded)
src/app/api/           tutor stream, cron tick, push subscribe, Stripe webhook, visit tracking
src/lib/domain/        pure, unit-tested rules: levels, XP, streaks, SRS, planner, bands, codes, calculator, moderation
src/lib/server/        server-only services: gamify (XP/badges), lessons, papers, flashcards, study (anti-cheat), jobs, delivery, billing
src/lib/ai/            the only place Claude is called: quotas, usage logging, validated JSON with retries, streaming, safety prompt
supabase/migrations/   schema + RLS; supabase/seed.sql is dev-only
```

**Security model.** Row Level Security is on for every table. Students can only update "safe" profile columns (column-level grants). XP, streak, role, plan and beta status change only through `security definer` functions (`award_xp`, `redeem_beta_code`) or the server's service role after server-side checks. All AI output is validated and clamped before it affects marks or XP. Answer keys never reach the browser while a paper is open. Rate limits cover login, codes, resets, invite codes, AI and posting.

## Deploying (Vercel + Supabase)

1. Create a Supabase project and run the migrations (`npx supabase link && npx supabase db push`). Don't run `seed.sql` in production. Create invite codes from Beta Admin instead.
2. In Supabase **Auth**:
   - Enable email confirmations with a 6-digit OTP.
   - Paste the templates from `supabase/templates/` (they use `{{ .Token }}`).
   - Set the site URL and redirect URLs (`https://your-domain/auth/callback`).
   - Enable TOTP MFA.
   - Add Google OAuth. Add Apple later.
   - Configure custom SMTP (for example Resend) so emails come from your domain.
3. Check the private `evidence` storage bucket exists (migration 0004 creates it). Realtime is enabled for group tables by migration 0006.
4. Import the repo into Vercel and set every variable from `.env.example`: Supabase keys, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, VAPID keys (`npx web-push generate-vapid-keys`), `RESEND_API_KEY`, and `NEXT_PUBLIC_DEMO_MODE=0` for production.
5. `vercel.json` schedules `/api/cron/tick` hourly. Hourly crons need a paid Vercel plan. On Hobby, change it to daily and set everyone's reminder hour to match.
6. **Uploads:** Vercel limits request bodies to about 4.5 MB. Photos are compressed in the browser first, but large PDFs for flashcards may hit this limit. If they do, switch those uploads to Supabase signed upload URLs.
7. Billing: create AUD monthly prices in Stripe, set `STRIPE_*`, point a webhook at `/api/billing/webhook` (subscription events), and set `BILLING_ENABLED=1` at launch.

## Notes and decisions

- **No prototype file was provided**, so Pip's SVG, the two built-in lessons, the sample HSC paper and the demo student were written from the spec. Drop `studypilot-prototype.html` into `reference/` to reconcile details.
- **Colour tokens for accessibility:**
  - `ink-3` is slightly darker in light mode (`#5A6782`) and lighter in dark mode (`#8E9BB8`) than the spec, to meet WCAG AA.
  - Text uses darker/lighter "ink" versions of blue, green, amber and red. Fills keep the spec colours.
  - Solid blue areas behind white text use `blue-fill` (`#1F66D9`).
- Under-16s may use the app without a parental-consent step, as instructed. The privacy policy covers parents and guardians.
- Have a subject-matter expert review AI-generated lessons before launch (`lesson_content.reviewed`).
