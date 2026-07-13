# Handover — المنصة الحكومية لتخطيط ومتابعة مشروع الذكاء الاصطناعي المساعد

Go-live handover for the IT team. The repository ships **clean**: no demo
items, no launch plans, an **empty users table**, no role switcher, and the
portal opens as **ممثل الجهة** after sign-in.

## 1. What the system is

A Next.js 14 (App Router, TypeScript) portal + PostgreSQL 16 (Prisma ORM).
Four roles work the same data through one workflow:

| Role | Responsibility |
|---|---|
| منسق المسار في الجهة | Creates items (مشروع/مبادرة، عملية، خدمة) manually or via Excel bulk upload, manages خطط الإطلاق per مرحلة, submits for approval |
| ممثل الجهة | Approves/returns submissions, tracks totals incl. execution & launch budgets |
| رئيس المسار | Oversees their stream across entities, nominates items for funding (ترشيح للتمويل) |
| اللجنة الوطنية | Reviews nominations, funds items against the approved 100M budget |

Item lifecycle: `مسودة → بانتظار اعتماد ممثل الجهة → مخطط · المرحلة ١…٤ → مكتمل`.
Cost model: each item carries an **execution budget**; a launch plan's
execution budget is **derived** (sum of its attached items) and its
**launch budget** is informational only — funding totals count execution
money exclusively.

## 2. Repository layout

- `app/` — routes + API (`/api/state`, `/api/ai-review`, `/api/auth/uaepass/*`)
- `lib/` — domain model, Zustand store, view-model, workplan Excel importer
- `components/` — UI (all inline-styled RTL, Cairo font)
- `prisma/` — schema, migrations `0001…0005`, idempotent seed
- `k8s/` — Kubernetes manifests (see `k8s/README.md`)
- `Dockerfile`, `docker-compose.yml`, `.env.example`
- `DEPLOYMENT.md` — step-by-step environment/DB setup

## 3. Database

`prisma migrate deploy` creates 20 tables. Verified on a fresh
PostgreSQL 16: migrations apply cleanly; `prisma db seed` inserts
**reference data only** — 5 `streams` (official order + رؤساء المسارات as
`head_name`), 35 `entities`, 3 `program_phases`, 5 `exec_batches`
(المراحل), the 100M budget in `settings` — and leaves `users`, `items`,
`launch_plans` and every transaction table **empty**.

Transaction tables: `items`, `item_launch_plans`, `launch_plans`,
`launches`, `item_launches`, `exec_checklist_items`, `sub_milestones`,
`log_entries` (audit trail of every action with actor + timestamp),
`nominations`, `fundings`, `funding_cancellations`, `entity_reps`,
`stream_owners`, `app_state`.

## 4. DB linking

Set `NEXT_PUBLIC_DATA_MODE=api` and `DATABASE_URL`. The UI persists through
`/api/state` (guard it with `STATE_API_TOKEN`). `local` mode (browser
storage) exists for demos only — do not use it in production.

## 5. Kubernetes

Manifests in `k8s/`: namespace, configmap, secret template, migration Job,
2-replica Deployment (non-root, no privilege escalation, probes, resource
limits), Service, TLS Ingress. Flow: build image → apply namespace/config →
create secret → run migrate Job → roll deployment. Prefer a managed
PostgreSQL over in-cluster.

## 6. Security status & checklist

Done in the app:
- Security headers on all routes (CSP, `X-Frame-Options: DENY`,
  `nosniff`, referrer policy) — `next.config.mjs`
- `/api/state` bearer-token guard (`STATE_API_TOKEN`)
- UAE PASS OIDC scaffold with state/nonce (mock mode until creds exist)
- No secrets in the repo; `.env*` git-ignored
- Dependencies: no critical advisories. **Known open advisories** on
  Next 14.2.x (DoS-class: image-optimizer, RSC request handling, rewrites
  smuggling — fixed only in Next 16): the app uses no `next/image`, no
  rewrites; mitigate at the WAF/ingress (rate-limit, body-size limit,
  request normalization) and plan a post-go-live upgrade to Next 16.

For IT before go-live:
- [ ] TLS everywhere; WAF/rate limiting at the edge
- [ ] Real UAE PASS credentials (`NEXT_PUBLIC_UAEPASS_MODE=live`)
- [ ] **Role mapping**: after sign-in, resolve the user in the `users`
      table (create accounts per entity; رؤساء المسارات names are already
      official in the app) and set role/stream/entity in the session
- [ ] Strong `STATE_API_TOKEN`; rotate any tokens used during development
- [ ] Postgres backups + point-in-time recovery
- [ ] Pen-test against the deployed environment

## 7. Testing checklist (functional)

1. Sign in (mock) → team setup → dashboard opens as ممثل الجهة, all zeros.
2. As coordinator (set `NEXT_PUBLIC_DEFAULT_ROLE=coord` on a test deploy):
   create items of each type (name required; وضع dropdown per type;
   الوحدة التنظيمية field), bulk upload via the Excel template.
3. إدارة خطط الإطلاق: add a launch per مرحلة, attach items — the execution
   budget fills automatically from the items; launch budget is manual.
4. Submit → approve as ممثل الجهة → status becomes مخطط · المرحلة N.
5. Nominate as رئيس المسار → fund as اللجنة الوطنية → totals move; verify
   only execution money is counted.
6. Complete launches → item becomes مكتمل; verify audit log entries.

## 8. Known gaps / next steps

- Role/permission enforcement is client-side presentation logic; the
  server API is a single state endpoint. Before multi-tenant production,
  move approval/funding transitions server-side using the relational
  tables (they are already modeled).
- Users table is empty by design; sign-in → user resolution is IT's wiring.
- AI review uses the heuristic fallback until `AI_API_BASE_URL` points to
  the internal model.
- Next 16 upgrade (see §6).
