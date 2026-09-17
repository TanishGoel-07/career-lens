# CareerLens AI — Backend

Node.js + TypeScript monorepo implementing the backend described in
`docs/architecture.md` (published separately). Three deployable
processes:

- **`apps/api`** — NestJS HTTP API (auth, resumes, jobs, matching,
  skills/roadmap, AI gateway, RAG, coach, interview, admin)
- **`apps/job-worker`** — BullMQ consumers for resume parsing,
  embeddings, AI analysis, job ingestion
- **`apps/sandbox-worker`** — isolated Docker-based code execution for
  the interview platform (see `docs/sandbox-security.md`)

Shared packages:

- **`packages/db`** — Prisma schema, client, seed data
- **`packages/shared-types`** — DTOs shared with the frontend

## Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL 16+ with the `pgvector` extension available
- Redis 7+
- Docker (only required to run `apps/sandbox-worker`)

## Setup

```bash
pnpm install
cp .env.example .env        # then fill in real secrets — never commit .env
pnpm db:generate
pnpm db:migrate              # creates tables from packages/db/prisma/schema.prisma
pnpm db:seed                 # seed skill graph + dev admin user
```

Run each process in its own terminal:

```bash
pnpm api:dev
pnpm job-worker:dev
pnpm sandbox-worker:dev      # requires Docker; build the sandbox images first (see below)
```

The API listens on `:3000` by default; Swagger UI is at
`http://localhost:3000/api/docs`.

## Building the sandbox images

`apps/sandbox-worker` expects three pre-built images (see
`apps/sandbox-worker/src/runners/language-configs.ts` for exact tags):
`careerlens/sandbox-python:3.12-slim`, `careerlens/sandbox-cpp:gcc13`,
`careerlens/sandbox-java:21-jdk-slim`. Dockerfiles for these are the
next concrete piece of work — see `docs/sandbox-security.md` for the
hardening requirements they must meet (no runtime package-manager
network access, minimal base image, etc.) before they're written.

## Testing

```bash
pnpm test          # unit tests, all packages
pnpm test:e2e       # (apps/api) integration tests against a test DB
```

Set `AI_PROVIDER=mock` (the default) to run the full AI pipeline —
prompt building, schema validation, persistence — without any real API
key or network call, via `MockProvider`.

## What's implemented vs. flagged as follow-up

This repo implements the full architecture in `docs/architecture.md`
end-to-end for a v1 pass. A few things are deliberately left as
explicit, documented follow-ups rather than being half-built or
fabricated:

- Job-source ingestion **adapters** (the actual HTTP clients for
  specific job boards) — `job-ingestion.processor.ts` is the stable
  seam they plug into; no real source/credentials were available to
  implement one concretely.
- A curated **interview question bank** — question creation currently
  produces a placeholder prompt; `InterviewQuestion.testCases` is
  modeled and consumed correctly by the sandbox worker, but needs real
  content.
- Sandbox **Docker images** themselves (Dockerfiles), per above.
- Consolidating the AI-calling logic duplicated between `apps/api`'s
  `AiGatewayService` and `apps/job-worker`'s `ai-analysis.processor.ts`
  into one shared `@career-lens/ai` package.
- A dedicated `CoachSession`/`CoachMessage` table for persisted,
  multi-turn coach conversations (current `coach.service.ts` computes
  context correctly per-call but doesn't yet persist conversation
  history across turns).
- Docker/CI deployment manifests were out of scope for this pass
  (Agent 3's remit per the master prompt).

No performance or accuracy numbers are claimed anywhere in this repo —
none have been measured yet. Benchmarking (§9, §24 in the architecture
doc) is real follow-up work, not a formality.
