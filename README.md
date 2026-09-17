# CareerLens AI 🎯

> **AI-Powered Career Progression, Deterministic Resume Evaluation, Skill Gap Sequencing, and Secure Sandboxed Coding Practice.**

---

## 🌟 Overview

CareerLens AI is a full-stack platform that transforms ambiguous career goals into measurable, actionable daily milestones. Unlike generic chatbots, CareerLens pairs **deterministic algorithms** (ATS rule engines, topological skill-gap prerequisite graphs, pgvector semantic similarity) with **AI guidance** (interactive coaching, personalized feedback, interview simulation) and **isolated containerized code execution** (Docker sandbox).

---

## 🏗️ Architecture

The repository is organized as a pnpm monorepo:

```
career-lens/
├── apps/
│   ├── frontend/                 # Next.js 16 (Turbopack, Tailwind CSS, Lucide icons, Base UI)
│   │   ├── app/                  # App router with unified interactive workspace
│   │   ├── components/           # Views: Overview, Resumes, Jobs, Skills, Roadmap, Assistant, Practice
│   │   └── lib/api-client.ts     # Typed API client with automatic JWT rotation & error normalization
│   │
│   └── backend/                  # NestJS modular enterprise backend
│       ├── apps/
│       │   ├── api/              # Public REST API (Auth, Resumes, Jobs, Skills, Roadmap, Interview, Code)
│       │   ├── job-worker/       # BullMQ async processor (PDF parsing, pgvector chunking, ATS rubric scoring)
│       │   └── sandbox-worker/   # Isolated code execution worker (Python, C++, Java runner)
│       └── packages/
│           ├── db/               # Prisma ORM schema (PostgreSQL + pgvector extension) & seed scripts
│           └── shared-types/     # Common interfaces & DTOs
│
├── infrastructure/
│   └── docker/
│       └── sandbox/              # Hardened unprivileged Dockerfiles (python, cpp, java)
│
├── docker-compose.yml            # PostgreSQL 16 (pgvector) on port 5433, Redis 7 on port 6380
└── .github/workflows/ci.yml      # Automated CI/CD pipeline (Lint, Typecheck, Unit Tests, E2E)
```

---

## ⚡ Key Architectural Decisions

1. **Deterministic Scoring + AI Explanation**:
   - Resumes and Job Matches are scored through deterministic formulas (section completeness, keyword density, layout, impact metrics, experience gaps).
   - The LLM is used **strictly to formulate human-readable explanations**—it never invents the numerical scores.
2. **Topological Skill-Gap Sequencing**:
   - Skills form a directed acyclic prerequisite graph. Missing skills are ordered so foundational competencies unlock downstream learning milestones first.
3. **Rotating Refresh Tokens with Reuse Detection**:
   - Access tokens are short-lived (15 min). Refresh tokens are stored only as SHA-256 hashes and linked in families. If an already-rotated token is replayed, the entire token family is immediately revoked to thwart token theft.
4. **Isolated Code Execution Sandbox**:
   - User submissions run in non-root Docker containers with strict resource boundaries: 256MB memory cap, 0.5 CPU quota, 64 PID limit, dropped capabilities (`--cap-drop ALL`), and no network access.
5. **Multi-Provider AI Gateway with Fallback**:
   - Supports `mock` (for local offline development and tests), `gemini`, and `openai`. All outputs are validated against runtime Zod schemas.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v20 or v22
- **pnpm**: v9+ (`npm install -g pnpm`)
- **Docker Desktop**: running on your host machine

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/TanishGoel-07/career-lens.git
cd career-lens
pnpm install
```

### 3. Start Database & Redis (Docker Compose)
```bash
docker compose up -d
```
*Note: Configured to use port `5433` for PostgreSQL and `6380` for Redis to avoid host conflicts.*

### 4. Push Database Schema & Seed Initial Data
```bash
cd apps/backend
pnpm db:push
pnpm db:seed
```
*Seeded test users:*
- **Admin**: `admin@careerlens.dev` / `ChangeMe123!`
- **Member**: `alex.morgan@careerlens.dev` / `Password123!`

### 5. Start Development Servers

You can launch all services independently or together:

```bash
# Terminal 1 — Backend API (port 3001)
pnpm --filter @career-lens/api start:dev

# Terminal 2 — Job Worker (BullMQ queue processor)
pnpm --filter @career-lens/job-worker start:dev

# Terminal 3 — Sandbox Worker (Code execution queue)
pnpm --filter @career-lens/sandbox-worker start:dev

# Terminal 4 — Frontend (Next.js on port 3002)
pnpm --filter @careerlens/frontend dev
```

Visit the frontend at [http://localhost:3002](http://localhost:3002) and the Swagger API docs at [http://localhost:3001/api/docs](http://localhost:3001/api/docs).

---

## 🧪 Automated Testing

### Unit Tests
```bash
cd apps/backend/apps/api
pnpm test
```
Runs 18 unit tests across:
- `auth.service.spec.ts` (Registration, Argon2 password validation, credential checks)
- `tokens.service.spec.ts` (JWT minting, token family rotation, replay detection)
- `matching.service.spec.ts` (Deterministic skill & experience matching, AI explanation fallback)
- `skill-gap.service.spec.ts` (Graph prerequisites checking, priority ordering)
- `roadmap.service.spec.ts` (Topological sorting, milestone creation)
- `ai-gateway.service.spec.ts` (Budget limits, Redis caching, Zod schema validation)

### End-to-End User Journey Tests
```bash
cd apps/backend/apps/api
pnpm run test:e2e
```
Executes a 14-step integration test against the running database and Redis:
1. Health & readiness validation (`/api/v1/health`, `/api/v1/readiness`)
2. User registration (`/api/v1/auth/register`)
3. User login & token generation (`/api/v1/auth/login`)
4. Authenticated profile lookup (`/api/v1/users/me`)
5. Profile updating (`PATCH /api/v1/users/me/profile`)
6. Job catalog querying (`/api/v1/jobs`)
7. User skill addition (`/api/v1/skills/mine`)
8. Target role definition (`/api/v1/target-roles`)
9. Topological skill gap analysis (`/api/v1/target-roles/:id/skill-gaps`)
10. Automatic roadmap generation (`/api/v1/target-roles/:id/roadmap`)
11. Technical interview practice question retrieval (`/api/v1/interview/sessions/:id/next-question`)
12. Interactive career coach chat (`/api/v1/coach/message`)
13. Refresh token rotation & replay attack rejection (`/api/v1/auth/refresh`)
14. Session revocation & logout (`/api/v1/auth/logout`)

### Production Builds
```bash
# Build all backend applications (API + Workers)
cd apps/backend && pnpm build

# Build frontend production bundle
cd ../../apps/frontend && pnpm build
```

---

## ⚙️ Environment Configuration

Sample configuration (`apps/backend/.env`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Environment mode (`development` / `production`) |
| `PORT` | `3001` | API HTTP port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/careerlens` | PostgreSQL connection with pgvector |
| `REDIS_URL` | `redis://localhost:6380` | Redis connection URL |
| `JWT_ACCESS_SECRET` | *(string)* | Secret for signing access tokens |
| `JWT_ACCESS_TTL` | `15m` | Access token lifespan |
| `JWT_REFRESH_TTL_DAYS` | `30` | Refresh token lifespan |
| `AI_PROVIDER` | `mock` | `mock`, `gemini`, or `openai` |
| `MOCK_EMBEDDINGS` | `true` | When true, generates deterministic vector embeddings |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API Key |
| `OPENAI_API_KEY` | *(optional)* | OpenAI API Key |
| `AI_DAILY_TOKEN_BUDGET_PER_USER` | `100000` | Token limit enforced per user per day |
| `FRONTEND_ORIGIN` | `http://localhost:3002,...` | Allowed CORS origins |

Frontend configuration (`apps/frontend/.env.local`):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api/v1` | Backend API base endpoint |

---

## 🔒 Security Summary

- **Authentication**: Argon2id password hashing, rotating refresh token families with replay detection.
- **Code Sandbox**: Rootless execution inside ephemeral containers, read-only root filesystems where applicable, resource-bounded memory and CPU limits.
- **Data Privacy**: Resume uploads are private and isolated per tenant user ID.
- **Zero Hallucination Scoring**: Mathematical score calculations remain deterministic and testable; AI does not guess numerical match percentages.

---

## 📄 License
MIT © CareerLens Team
