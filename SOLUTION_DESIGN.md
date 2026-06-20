# CRM Lead & Sales System — Solution Design & Technology Recommendation

**Version:** 1.0 · **Date:** 2026-06-19
**Source:** `CRM_Lead_Sales_System_Requirements.xlsx` (28 modules, ~280 requirements) + stakeholder technology brief

---

## 1. What this system actually is

Reading past the generic "enterprise CRM" framing, the requirements describe a **specialized outbound-calling sales CRM for a US tax / bookkeeping firm** (lead → call → convert). The defining characteristics:

- **Lead operations by geography**: leads are organized by **Timezone (EST/CST/MST/PST) → State → City**, each city carrying a **target**, and progress measured as `Total / Planned`.
- **A call center at the core**: click-to-call, live timers, auto-save call records, dispositions, auto-advance to next lead, recordings, and **live supervisor dashboards**.
- **Productivity & coaching**: per-caller calls/talk-time/idle-time tracking, daily summaries, and AI voice coaching.
- **Domain-specific AI**: a training chatbot grounded in *tax / bookkeeping / sales-script* knowledge, plus lead scoring and territory prediction.
- **Three hard roles** (Admin / Team Leader / Employee-Caller, + Viewer) with a precise permission matrix including "own-records-only" granularity.

**Scale reality:** tens of callers, hundreds of thousands of lead rows, real-time events for a small concurrent user base. This is a **moderate-scale, write-and-read-heavy operational app** — not a multi-tenant SaaS at millions of users.

> This distinction drives the single most important recommendation below.

---

## 2. Recommended stack (reconciled)

The stakeholder brief asks for a "next-generation, enterprise-grade" stack (Kubernetes, microservices, GraphQL, multi-cloud, OpenAI). The spreadsheet specifies a more pragmatic, ship-fast stack (modular NestJS, Vercel + Railway, Clerk/Auth0, Twilio, Recharts). **My recommendation reconciles the two: build the pragmatic stack now, but structure it so the enterprise capabilities are a configuration/scaling change, not a rewrite.**

| Layer | Recommendation | Notes / divergence from brief |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind + **shadcn/ui** | As specified. Use **TanStack Query** for server state, **Zustand** for UI state, **Framer Motion** for transitions. |
| **Charts** | **Recharts** for the 3 standard charts; **Apache ECharts** only where Recharts falls short | Don't run both libraries unless needed — pick Recharts first. |
| **Maps** | **Mapbox GL** (or Google Maps) with a US states/cities GeoJSON layer | Pin color = on-track/behind; popups per state & city. Mapbox is cheaper at scale and better for custom choropleth. |
| **Backend** | **Node.js + NestJS**, **modular monolith** (not microservices yet) | ✅ Keep NestJS. ⚠️ **Skip microservices & Kubernetes for launch** — see §3. |
| **API style** | **REST** (OpenAPI/Swagger) as primary; **GraphQL deferred** | ⚠️ GraphQL adds cost with little payoff for a dashboard app. Add later only if a mobile app needs flexible querying. |
| **ORM / DB** | **Prisma** + **PostgreSQL** | ✅ As specified. UUID PKs, soft-delete on leads, indexes on all filter columns. |
| **Cache / queue / realtime fan-out** | **Redis** (BullMQ for jobs, Redis adapter for Socket.IO) | Powers bulk import jobs, daily summary jobs, recording-analysis jobs, and multi-instance websocket scaling. |
| **Real-time** | **Socket.IO** gateway in NestJS | Live call status, live team dashboard, KPI refresh, notification bell. |
| **Auth** | **NestJS JWT + Passport + custom RBAC guards**, with **TOTP MFA** | ⚠️ I recommend **custom auth** over Clerk/Auth0 because your permission matrix has domain-specific "own-records" rules that live best in app guards + row-level filters. Clerk/Auth0 remains a valid faster-to-market alternative — decision in §12. |
| **Calling** | **Twilio** (Programmable Voice + Recordings + webhooks) | ✅ As specified. Abstract behind a `CallingProvider` interface so Aircall/RingCentral/JustCall can be swapped. |
| **AI** | **Claude (Anthropic API)** as the primary LLM, with **RAG** over an internal knowledge base | The brief says "OpenAI / LLM". I recommend **Claude (e.g., the latest Opus/Sonnet)** for the chatbot + report generation; use it through a thin provider abstraction so the model is swappable. Embeddings via `pgvector` in the same Postgres. |
| **Storage** | S3-compatible object storage for recordings & exports, served via **pre-signed URLs** | Access-controlled per §9 (SEC-002). |
| **Infra (launch)** | Frontend → **Vercel**; API + workers → **Railway / Render / a single AWS ECS-Fargate service**; DB → **Neon or Supabase** (managed Postgres); Redis → managed (Upstash/Railway) | ✅ Matches the spec. |
| **Infra (scale path)** | Containerized from day 1 (Docker); move API/workers to **ECS Fargate or EKS** when justified | Kubernetes is a *later* lever, not a launch requirement. |
| **CI/CD** | **GitHub Actions**: lint → typecheck → test → build → deploy | ✅ As specified. |

---

## 3. The key architectural call: modular monolith, not microservices (yet)

The brief asks for "microservices-ready" + Kubernetes. For this workload that would be **premature optimization** — it multiplies infra, observability, and deployment cost while the team is small and the domain is still being discovered.

**Recommendation:** Build a **modular monolith** in NestJS where each domain is a self-contained module with clear boundaries (`auth`, `users`, `leads`, `import`, `assignments`, `targets`, `reports`, `calls`, `productivity`, `notifications`, `ai`). This gives you:

- One deploy, one codebase, easy local dev (`docker-compose up`).
- **Microservices-ready** boundaries: because modules already communicate through service interfaces and events (via Redis/BullMQ), any hot module (e.g. `calls` or `ai`) can be extracted into its own service later **without a rewrite**.
- Background-heavy work (imports, daily summaries, recording analysis) runs as **BullMQ workers** — already a separate process, which is 80% of the "microservices" benefit for this app.

```
                         ┌─────────────────────────┐
                         │   Next.js (Vercel)       │
                         │   shadcn/ui · TanStack   │
                         │   Recharts · Mapbox      │
                         └───────────┬─────────────┘
                          REST + WSS │
                         ┌───────────▼─────────────┐        ┌───────────────┐
                         │   NestJS API (monolith)  │◄──────►│ Twilio (Voice,│
                         │   ├ auth/RBAC + MFA       │ webhook│ Recording)    │
                         │   ├ leads / import        │        └───────────────┘
                         │   ├ assignments / targets │
                         │   ├ calls (+gateway WSS)  │        ┌───────────────┐
                         │   ├ reports / productivity│◄──────►│ Anthropic API │
                         │   ├ notifications         │  RAG   │ (Claude)      │
                         │   └ ai (RAG + scoring)    │        └───────────────┘
                         └───┬─────────┬─────────┬───┘
                             │         │         │
                    ┌────────▼──┐ ┌────▼────┐ ┌──▼─────────────┐
                    │ Postgres  │ │  Redis  │ │ BullMQ Workers │
                    │ +pgvector │ │ cache/  │ │ import · daily │
                    │ (Neon)    │ │ pub-sub │ │ summary · AI   │
                    └───────────┘ └─────────┘ └────────────────┘
                                                      │
                                               ┌──────▼──────┐
                                               │ S3 storage  │
                                               │ recordings  │
                                               │ exports     │
                                               └─────────────┘
```

---

## 4. Repository structure (npm-workspaces monorepo)

The spec's file paths already imply a monorepo (`apps/crm-web/`, `apps/crm-api/`, `packages/database/`). Adopt that. Orchestration uses **npm workspaces** (`npm run <task> --workspaces`) plus **concurrently** for the parallel dev loop — chosen over Turborepo, whose binary mis-reports child exit codes on this Windows environment. Turborepo can be layered back on later for build caching where it runs reliably.

```
crm/
├─ apps/
│  ├─ crm-web/                 # Next.js frontend
│  │  ├─ app/                  # routes: /login, /dashboard, /leads, /caller, /manager, /ai-training, /admin
│  │  ├─ components/           # dashboard/, charts/, maps/, filters/, caller/, manager/, leads/, layout/
│  │  └─ lib/                  # api client, socket client, maps
│  └─ crm-api/                 # NestJS backend
│     └─ src/
│        ├─ modules/           # auth, users, leads, import, assignments, targets,
│        │                     #   calls, reports, productivity, notifications, ai
│        ├─ gateway/           # Socket.IO gateway
│        ├─ jobs/              # BullMQ processors
│        └─ common/            # guards, interceptors, validation, RBAC
├─ packages/
│  ├─ database/                # Prisma schema, migrations, seed
│  ├─ types/                   # shared TS types / DTO contracts
│  └─ config/                  # shared eslint/tsconfig
├─ infrastructure/
│  ├─ docker/                  # docker-compose.yml (postgres, redis, api, web)
│  ├─ db/ backup/ nginx/
│  └─ ...
└─ .github/workflows/          # ci.yml, deploy.yml
```

---

## 5. Data model (from the Database Design sheet)

Core tables (Prisma, UUID PKs, `gen_random_uuid()`):

| Table | Purpose | Key fields |
|---|---|---|
| `users` | All accounts | role (`admin`/`team_leader`/`employee`), is_active (soft delete) |
| `employees` | Caller profile extension | shift_timezone, performance_score |
| `leads` | Central lead table | business_name, phone, email, state, city, timezone, status, assigned_to, **quality_score**, deleted_at |
| `targets` | Per-city planned leads | state, city, timezone, monthly_target |
| `assignments` | Lead → caller mapping | caller_id, assigned_by, batch_name |
| `calls` | Call records | start/end_time, duration_secs, recording_url, outcome (7 dispositions) |
| `notes` | Call notes | note_text, next_followup_date, call_id |
| `activities` | **Immutable audit log** | action, old_value, new_value (insert-only) |
| `productivity_logs` | Daily per-caller | calls_made, connected_calls, productive/idle_time_secs, deals_closed |
| `notifications` | In-app alerts | type (`target_complete`/`low_progress`/`new_leads`/`idle_alert`), is_read |
| `ai_training_sessions` | Chatbot Q&A log | question, answer, topic |
| `voice_coaching_reports` | Per-call AI analysis | confidence_score, speaking_speed_rating, objection_handling_score, missed_opportunities (JSONB) |

**Standards (DB-013→017):** UUID PKs everywhere, soft-delete on `leads`, **indexes on `leads(state, city, timezone, status, assigned_to)`** (target query < 200ms), Prisma-only access (raw SQL only for heavy reporting/pivots), seed script (1 admin, 3 leaders, 10 callers, 500 leads, targets).

> **Reporting note:** the dashboard pivots (Timezone→State→City with Total/Planned/Balance/Progress) are aggregation-heavy. Serve them with **indexed `GROUP BY` queries** initially; if they get slow, add a **materialized view** (`mv_territory_progress`) refreshed on import / on a schedule. `pgvector` lives in the same DB for AI embeddings.

---

## 6. Module → build mapping

| Spec module(s) | Frontend | Backend |
|---|---|---|
| M1 Login & Roles | `/login`, theme toggle | `auth/` (JWT, MFA, RBAC guards), `users/` |
| M2 Lead Import | upload + preview + progress | `import/` (validation, column-map, BullMQ bulk job) |
| M3 Dashboard | KPI cards, layout grid, live refresh | `reports/metric.service` + Socket.IO |
| M4 Filters | timezone/state/city/date/team dropdowns, chips, URL params | cascading filter endpoints |
| M5 Metric Calculator | metric cards | `reports/metric.service` (Total/Target/Balance/Progress, all levels) |
| M6 Charts | bar / pie / line (Recharts) | filtered aggregation endpoints |
| M7–M8 Maps | USA state map → city drill-down (Mapbox) | per-territory metrics |
| M9 Pivot | expandable tree + Excel/PDF export | `reports/export.service` |
| M10 Lead Work | status workflow + audit timeline | `leads/` + `activities/` |
| M11 Productivity | per-caller table | `productivity/` |
| M12 Notifications | bell + history | `notifications/` |
| Caller Dashboard / Screen / Notes / Auto-Next | caller workspace, live timer, dispositions | `calls/`, `next-lead.service` |
| Calling API | — | `calls/calling-api.service` + Twilio + webhooks |
| Productivity Monitor / Daily Summary | manager views | idle tracking, scheduled summary job + email |
| Sales Manager Dashboard | live team status, live KPIs, drill-down | Socket.IO + live aggregation |
| AI Features / Training / Voice Coaching | AI training tab + chatbot, coaching reports | `ai/` (RAG, scoring, prediction, voice analysis) |

---

## 7. Calling integration design (the riskiest module)

Twilio click-to-call has real moving parts — design it deliberately:

1. **Click-to-Call** → API creates a `calls` row immediately (start_time, caller, lead) and triggers Twilio (browser **Voice SDK** for softphone, or dial-out to the caller's phone).
2. **Live timer** runs client-side; **authoritative duration** comes from Twilio.
3. **Webhooks** (`call.started`, `call.ended`, recording-ready) update the `calls` row and push a Socket.IO event → manager dashboard updates live.
4. **Recording**: Twilio stores it; we copy to our **S3** and expose only via **short-lived pre-signed URLs** gated by RBAC (SEC-002).
5. **Errors** (no-answer/busy/invalid/network) are logged, surfaced to the caller, and the lead is **not** marked called.
6. **Provider abstraction**: a `CallingProvider` interface keeps Twilio swappable (Aircall/RingCentral/JustCall/Dialpad).

---

## 8. AI layer design

- **Provider abstraction** (`LlmProvider`) — recommend **Claude (Anthropic API)** as default; swappable. Set per-feature model (cheaper model for scoring, stronger model for chatbot/coaching).
- **Training chatbot (RAG):** curated knowledge base (company ops, tax, bookkeeping, sales scripts) → chunked + embedded in **pgvector** → retrieve → answer with citations. Log to `ai_training_sessions`. Target < 3s response.
- **Lead scoring (0–100):** start **rule-based** (completeness, location, business type) and layer ML later; store `quality_score` on `leads`.
- **Duplicate detection:** rule-based fuzzy match on phone/email/business name at **import preview** (skip/merge) — don't gate this behind the LLM.
- **Territory/timezone insights & target-date prediction:** scheduled jobs writing cached recommendations to the dashboard.
- **Voice coaching:** async BullMQ job — transcribe recording → analyze confidence/pace/objections/missed-ops → write `voice_coaching_reports` within ~5 min of call end.

> All AI features are **additive and feature-flagged**. The CRM must be fully functional with AI disabled.

---

## 9. Security & compliance

- **RBAC** enforced at the API (guards) **and** with row-level filtering for "own-records-only" (callers see only assigned leads/their recordings/their reports — matches the Permission Matrix exactly).
- **MFA** (TOTP) — satisfies the brief's MFA requirement.
- **Recording access control** via pre-signed, expiring URLs + role check (SEC-002).
- **Passwords:** bcrypt ≥ 12 rounds; never logged.
- **Audit logs:** immutable `activities` table; login/update/call/status logged with user, timestamp, IP; retained ≥ 1 year.
- **Transport & input:** HTTPS-only; `class-validator` on every DTO; Prisma parameterized queries (no SQLi); **rate limit** login (10 / 15 min / IP).
- **Encryption at rest:** managed Postgres + S3 encryption; secrets only in env vars (`.env.example` committed with placeholders, never real secrets).
- **Backups:** automated daily Postgres backup (02:00), monthly restore test.

---

## 10. Infrastructure & DevOps

- **Local dev:** `docker-compose up` → postgres + redis + crm-api + crm-web.
- **Launch hosting:** Vercel (web) · Railway/Render/Fargate (api + workers) · Neon/Supabase (Postgres) · Upstash/managed (Redis) · S3 (storage).
- **CI/CD (GitHub Actions):** push to `main` → lint → typecheck → test → build → deploy (< 10 min, fails on test errors).
- **Scale path (only when metrics justify):** containerize → ECS Fargate / EKS, read replicas for reporting, CDN for assets. Add observability (Sentry + structured logs + uptime/health checks) from day 1.

---

## 11. Delivery roadmap

Sequenced by dependency and the spec's `Critical → High → Medium` priorities.

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Foundation** | Monorepo, Docker, Prisma schema + seed, CI/CD, auth + RBAC + MFA, user mgmt | Login works, roles enforced, deployable skeleton |
| **1 — Lead core** | Import (validate/map/preview/bulk job), leads CRUD, status workflow, audit log, targets | Leads in system, assignable, statuses tracked |
| **2 — Dashboard & analytics** | KPI cards, cascading filters, metric calculator, 3 charts, USA/city maps, pivot + export | The "sales dashboard" the brief centers on |
| **3 — Calling** | Twilio click-to-call, call records, timer, notes/dispositions, auto-next, recordings | Callers fully operational |
| **4 — Productivity & realtime** | Caller dashboard, live manager dashboard (Socket.IO), idle tracking, daily summary + email, notifications | Supervisors get live visibility |
| **5 — AI** | Training chatbot (RAG), lead scoring, duplicate detection, territory/prediction insights, voice coaching | AI layer, feature-flagged |
| **Future (Phase 3+ in spec)** | WhatsApp, auto-email outreach, auto-dialer, React Native mobile, live voice assistant | Roadmap items |

---

## 12. Decisions to confirm

These genuinely change the build — worth confirming before Phase 0:

1. **Auth: custom NestJS JWT (recommended) vs Clerk/Auth0.** Custom gives precise control over the "own-records" permission matrix and avoids per-MAU vendor cost; Clerk/Auth0 ships MFA + user management faster. *Recommendation: custom.*
2. **Deployment posture: pragmatic (Vercel + Railway/Fargate + managed DB, recommended) vs full enterprise (EKS/Kubernetes + multi-cloud from day 1).** The latter is justified only if you're committing to scale/compliance now. *Recommendation: pragmatic, with a clean container path to enterprise.*
3. **GraphQL: defer (recommended) vs include now.** *Recommendation: REST now; add GraphQL only when a mobile client needs it.*
4. **LLM provider: Claude (recommended) vs OpenAI.** Either works behind the provider abstraction. *Recommendation: Claude default, swappable.*

---

## 13. Honest assessment of the brief vs. the requirements

- The requirements are **well-specified and internally consistent** (clear modules, acceptance criteria, a real data model, a permission matrix). This is a buildable spec.
- The stakeholder technology brief is **slightly over-scoped** for the actual workload: **Kubernetes, microservices, GraphQL, and multi-cloud are not needed at launch** and would slow delivery. The spreadsheet's pragmatic stack is the right starting point — and the design above keeps every enterprise lever (containers, service extraction, GraphQL, managed scaling) available without a rewrite.
- The **two genuinely hard areas** are (a) the **Twilio calling pipeline + live dashboards** and (b) **domain-grounded AI**. Budget engineering time there; the dashboards/charts/maps are comparatively routine.

*Net: keep NestJS + Next.js + Postgres + Prisma + Redis + Twilio. Build a modular monolith. Defer K8s/microservices/GraphQL. Use Claude for AI. Ship in the phased order above.*
