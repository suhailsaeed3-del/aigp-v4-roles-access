# Security

Security posture of the AI Transformation Portal.

## Transport & headers (server deployment)
The Next.js server sets strict headers on every response (`next.config.mjs`):
- **Content-Security-Policy** — `default-src 'self'`; scripts limited to self; `frame-ancestors 'none'`; connections restricted to self, `*.uaepass.ae`, and the configured internal AI origin.
- **Strict-Transport-Security** (HSTS, 2y, preload), **X-Frame-Options: DENY**, **X-Content-Type-Options: nosniff**, **Referrer-Policy: strict-origin-when-cross-origin**, **Permissions-Policy** (camera/mic/geo denied), **Cross-Origin-Opener-Policy: same-origin**. `X-Powered-By` is disabled.
- Run behind TLS; `upgrade-insecure-requests` is set.

## Authentication — UAE PASS SSO
- Standard OIDC authorization-code flow (`lib/uaepass.ts`, `app/api/auth/uaepass/*`).
- Anti-CSRF `state` is generated per request and stored in an **httpOnly, SameSite=Lax, Secure** cookie and verified on callback.
- The session cookie is **httpOnly / SameSite=Lax / Secure**, 8h TTL.
- **Before production:** sign/encrypt the session (JWT/JWE), validate the `id_token` signature and `nonce`, and map the UAE PASS `sub` to a portal user → role → entity. Store `CLIENT_SECRET` only in the server environment.
- For the presentation build the login is a mock (`NEXT_PUBLIC_UAEPASS_MODE=mock`) and never contacts the IdP.

## API routes
- `/api/ai-review` — POST only; rejects bodies > 64 KB and prompts > 20 KB; upstream call has a 20s timeout; the internal AI base URL is server-side env only (no user-supplied URLs → no SSRF).
- `/api/state` — payload capped at 2 MB; optional `STATE_API_TOKEN` Bearer guard for shared deployments; rejects non-object bodies.
- All DB access is via Prisma (parameterized — no SQL injection).

## Frontend
- React escapes all interpolated content; the app uses **no `dangerouslySetInnerHTML`** and no `eval`.
- No secrets shipped to the client (only `NEXT_PUBLIC_*` config flags).

## Secrets & supply chain
- `.env*` is git-ignored; `.env.example` documents variables with empty values.
- `.dockerignore` keeps env files, VCS, and scratch out of images.
- Pinned via `package-lock.json`; run `npm audit` in CI.
- **Dependency audit status:**
  - Replaced the unmaintained `xlsx` (SheetJS — high: ReDoS + prototype pollution) with actively-maintained **`exceljs`**; pinned its transitive `uuid` to a patched version via `overrides`.
  - **Next.js** pinned to the latest **14.2.35** patch (clears the critical batch incl. the CVE-2025-29927 middleware auth-bypass, SSRF, cache-poisoning). One residual framework advisory remains (RSC "Denial of Service with Server Components", fixed only in 15.x/16.x) plus a build-time PostCSS advisory inside Next's own toolchain. **Neither is exploitable here:** the app is a client SPA with no Server Actions and only four small route handlers that don't render untrusted RSC payloads; PostCSS runs at build time on our own CSS. Upgrade path to a fully-clean audit: Next 16 + React 19 (deferred to avoid destabilizing the verified build).

## Data
- Default persistence is browser `localStorage` (per-device). The optional Postgres store holds a single app-state blob for the demo; a production build should model per-user/entity records with row-level authorization.

## Reporting
Report vulnerabilities privately to the maintainers; do not open public issues for security reports.
