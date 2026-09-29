# Dev Supabase without Docker

`supabase start` (Docker) is the normal way to run the backend locally. Use it if you can.

This folder is a fallback for machines without Docker (like cloud dev containers).
It runs the pieces StudyPilot uses against a local Postgres 16:

- **GoTrue** (Supabase Auth) on :9999
- **PostgREST** on :3001
- a tiny Node proxy on :54321 that exposes them as `/auth/v1` and `/rest/v1`, like Supabase does

Storage and Realtime are not included; features that need them degrade gracefully.

```bash
bash scripts/dev-supabase/setup.sh   # once: downloads binaries, creates roles, writes .env.local
bash scripts/dev-supabase/start.sh   # every time: starts GoTrue, PostgREST, proxy; applies migrations
```

Emails (verification codes, password reset) are not sent. GoTrue logs them to
`.dev-supabase/gotrue.log`, and the app prints dev codes to the server console.
