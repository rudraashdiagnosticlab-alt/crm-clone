# CRM Lead & Sales System

Outbound-calling sales CRM for a US tax/bookkeeping firm. Leads are organized by
**Timezone → State → City** with per-city targets; the system covers lead import,
a geo sales dashboard, a Twilio calling workspace, productivity/live supervisor
dashboards, and a domain-grounded AI layer.

See [SOLUTION_DESIGN.md](SOLUTION_DESIGN.md) for the full architecture and roadmap.

## Stack

- **Frontend:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · TanStack Query · Zustand
- **Backend:** NestJS (modular monolith) · Prisma · PostgreSQL · Redis · Socket.IO · BullMQ
- **Auth:** custom JWT + Passport + RBAC guards + TOTP MFA
- **Calling:** Twilio (provider-abstracted) · **AI:** Claude (provider-abstracted)
- **Infra:** Docker · GitHub Actions · Vercel (web) + Railway/Fargate (api) + Neon/Supabase (db)

## Monorepo layout

```
apps/crm-web      Next.js frontend
apps/crm-api      NestJS backend (modular monolith)
packages/database Prisma schema, migrations, seed
infrastructure/   docker-compose, deploy config
```

## Phase 0 — local setup

```bash
# 1. install deps
npm install

# 2. env
cp .env.example .env          # then fill in secrets

# 3. start postgres + redis
npm run docker:up

# 4. generate client, run migration, seed demo data
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. run everything (api on :4000, web on :3000)
npm run dev
```

### Demo logins (after seed)

| Role        | Email                  | Password    |
|-------------|------------------------|-------------|
| Admin       | admin@crm.local        | Passw0rd!   |
| Team Leader | leader1@crm.local      | Passw0rd!   |
| Caller      | caller1@crm.local      | Passw0rd!   |

## Status

**Phase 0 (Foundation)** scaffolded: monorepo, Prisma schema (12 tables), Docker,
CI, auth + RBAC + MFA, user management. Subsequent phases per the roadmap in
SOLUTION_DESIGN.md §11.
