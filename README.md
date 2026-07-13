# المنصة الحكومية لتخطيط ومتابعة مشروع الذكاء الاصطناعي المساعد

**AI Transformation Portal** — an Arabic, right-to-left government portal to collect, review, score, fund, and track AI‑transformation candidates (projects, initiatives, operations, services) submitted by federal entities across five predefined transformation streams.

This is a faithful reimplementation of the Claude Design prototype (`AI Transformation Portal.dc.html`) in a real stack: **Next.js 14 (App Router) · React · TypeScript · Tailwind · Postgres · Docker**, with the AI review step wired to an internal, self‑hosted OpenAI‑compatible model.

> The original design bundle (`project/`, `chats/`) and the extracted specs are kept for reference. The build reproduces the prototype exactly; nothing in the design was changed without sign‑off.

---

## Roles (4)

| Role (Arabic) | Key | Scope | Can create | Fills data | Approves | Funding |
|---|---|---|---|---|---|---|
| منسق المسار في الجهة | `coord` | own entity + own stream | ✅ | ✅ | — | — |
| ممثل المسار | `path` | own stream, all entities | — | read‑only | — | nominates |
| ممثل الجهة | `entity` | whole entity | — | — | ✅ (sole approver) | receives notices |
| اللجنة الوطنية | `ai` | everything | — | — | — | funds (basket) |

A role switcher in the header previews all four profiles against shared data (as in the prototype).

Workflow: `draft → ent1 (بانتظار اعتماد ممثل الجهة) → exec → launch → done`. Every submission passes an **AI review** first. The national committee **funds** items via a basket instead of approving gates.

---

## Running it

### Option A — quick preview (no backend)

Fully client‑side, persists to `localStorage` (exactly like the prototype).

```bash
npm install
npm run dev          # http://localhost:3000
```

### Option B — full stack (Postgres + Docker)

```bash
cp .env.example .env        # set AI_API_BASE_URL to your internal model
docker compose up --build   # app on :3000, Postgres on :5432
```

On first boot the container pushes the schema and seeds the database. The schema is **fully relational (17 tables)** — `streams` (+ رؤساء المسارات), `entities` (34 federal + the session entity), `items` with child tables for the execution checklist, per‑batch sub‑milestones, the approval/action `log_entries`, `nominations` / `fundings` / `funding_cancellations`, plus **shared launches** modeled properly as `launches` ↔ `item_launches` (many‑to‑many, completion synced once for all sharers), and reference tables for the quarterly `exec_batches`, `program_phases` and `settings` (approved budget). A baseline migration is checked in at `prisma/migrations/0001_init/`. Set `NEXT_PUBLIC_DATA_MODE=api` to use the Postgres‑backed API instead of localStorage.

### Option C — static export (GitHub Pages)

```bash
npm run export       # → ./out  (client-side, heuristic AI review)
```

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) publishes this to Pages on every push to `main`. For a project site under `/<repo>` set `NEXT_PUBLIC_BASE_PATH=/Transformation`.

---

## AI review (مراجعة ذكية)

The review/scope/bulk steps POST to `/api/ai-review`, which proxies to your internal model (`AI_API_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — any OpenAI‑compatible `/chat/completions`). If the endpoint is unset or unreachable, the app falls back to the exact deterministic Arabic heuristic from the prototype, so it always works offline (and on GitHub Pages).

---

## Real entities dataset

`lib/data/` holds the real federal dataset lifted from the existing workplan portal:

- `federalServices.json` — entity → services
- `federalSubServices.json` — entity → **department** → services (34 entities)
- `servicePackages.json` — entity → package → services
- `ENTITIES_DEPARTMENTS.md` — readable index

Exposed via `lib/entities.ts` (`FEDERAL_ENTITIES`, `departmentsOf`, `servicesOf`, …) for the services stream and the entity filters.

---

## Project layout

```
app/            Next.js routes (page.tsx root, api/ai-review proxy, layout, globals.css)
components/     Login, TeamSetup, Dashboard, CreatePanel, DetailPanel, Basket, Overlays, Toast, Icon
lib/
  domain.ts     types, constants (PATHS/TYPE/ROLE), workflow (wfOf/WFMETA), scoring, program phases
  seed.ts       the 14 prototype demo items (verbatim)
  store.ts      Zustand store: state + all actions (ported methods) + localStorage persistence
  viewModel.ts  port of renderVals() → the derived object the UI renders from
  ai.ts         AI review client + heuristic fallbacks
  entities.ts   real federal entities registry + lookups
prisma/         schema.prisma + seed.ts (Postgres/Docker)
project/,chats/ original Claude Design bundle (reference)
```

## Design tokens

Blue `#2E74EE→#1F5FE0` · navy `#0B2A66/#0F1F3D` · approve green `#0B8A4B` · basket teal `#0E7C86` · statuses reject `#C0303B` / pending `#B45309`. Font: **Cairo**. RTL throughout.
