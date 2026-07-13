# Deployment guide — المنصة الحكومية لتخطيط ومتابعة مشروع الذكاء الاصطناعي المساعد

Handoff notes for the IT team. The app is a Next.js 14 portal with a Postgres
database (Prisma). It ships **clean**: no mock data, the role switcher is
removed, and the portal opens as **ممثل الجهة** after sign-in.

## 1. Prerequisites

- Node.js 20+ (or Docker)
- PostgreSQL 16
- Optional: an OpenAI-compatible endpoint for the AI review step
- UAE PASS OIDC credentials for production sign-in

## 2. Quick start (Docker)

```bash
cp .env.example .env          # fill in values (see §4)
docker compose up -d db       # Postgres 16
npm ci
npx prisma migrate deploy     # creates ALL tables (migrations 0001–0005)
npx prisma db seed            # reference data only (see §3)
npm run build && npm start    # or: docker compose up -d app
```

## 3. Database

`prisma/schema.prisma` + `prisma/migrations/` are the source of truth.
`prisma migrate deploy` creates 20 tables, including:

- **Reference:** `streams` (the 5 مسارات in official order, with the
  predefined رؤساء المسارات), `entities` (35 = the federal entities + the
  session entity), `program_phases`, `exec_batches` (المراحل), `settings`
  (approved committee budget = 100M).
- **Users:** `users` — login accounts. The seed pre-creates the five
  **رؤساء المسارات** with their official names/titles; **emails and phone
  numbers are intentionally NULL** and should be filled by IT when wiring
  sign-in. Entity reps / coordinators / committee users are added per entity.
- **Transactions:** `items`, `item_launch_plans`, `launch_plans`
  (execution budget is **derived** = sum of attached items' budgets;
  `launch_budget` is informational), `launches`, `item_launches`,
  `exec_checklist_items`, `sub_milestones`, `log_entries` (audit trail),
  `nominations`, `fundings`, `funding_cancellations`, `entity_reps`,
  `stream_owners`, `app_state`.

The seed is idempotent — safe to run repeatedly.

## 4. Environment (`.env.example`)

- `NEXT_PUBLIC_DATA_MODE=api` — use Postgres through the API routes
  (`local` keeps everything in the browser, for demos only).
- `DATABASE_URL` — Postgres connection string.
- `STATE_API_TOKEN` — set a strong value for any shared deployment.
- `AI_API_BASE_URL` / `AI_API_KEY` / `AI_MODEL` — internal OpenAI-compatible
  model for the AI review; falls back to a heuristic if unset.
- `NEXT_PUBLIC_UAEPASS_MODE=live` + `UAEPASS_*` — real UAE PASS OIDC.
  In `mock` mode the sign-in button goes straight into the app.
- `NEXT_PUBLIC_DEFAULT_ROLE` — role used until real role-mapping is wired
  (default `entity`). Valid: `entity | coord | path | ai`.

## 5. What IT still needs to wire

1. **Role mapping:** the header role switcher was removed. After UAE PASS
   sign-in, resolve the user against the `users` table (by email/Emirates ID)
   and set their role/stream/entity in the session.
2. **Stream-head accounts:** fill `email`/`phone` for the five pre-seeded
   رؤساء المسارات rows in `users`.
3. **TLS / reverse proxy**, secrets management, and backups for Postgres.

## 6. Verification checklist (already run against a fresh Postgres 16)

- `npx prisma migrate deploy` → 5 migrations apply cleanly.
- `npx prisma db seed` → 5 streams, 35 entities, 5 users (stream heads),
  0 items (clean start).
- `npm run build` → compiles with no errors.
