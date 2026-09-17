# CareerLens frontend API contracts

The current repository does not expose backend routes. The UI uses `lib/api.ts` as a typed development adapter and must be replaced with a real client when routes are available. Frontend role checks are UX-only; backend authorization is authoritative.

## Resume evaluation

| Method | Path | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| POST | `/api/resumes/evaluate` | USER session | `multipart/form-data`, field `resume` (PDF/DOCX, max 10 MB) | `{ score: number, label: string, strengths: string[], weaknesses: string[], formatting: { status: string, details: string }, missingSkills: string[], suggestions: string[] }` | `400` invalid file, `401` unauthenticated, `413` too large, `422` unreadable, `429` rate limited, `500` processing failure |

## Assistant message

| Method | Path | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| POST | `/api/assistant/messages` | USER session | `{ message: string, context?: { resumeId?: string, roadmapId?: string } }` | `{ message: string, conversationId: string }` | `400`, `401`, `429`, `500` |

## Coding submission

| Method | Path | Auth | Request | Response | Errors |
|---|---|---|---|---|---|
| POST | `/api/practice/submissions` | USER session | `{ problemId: string, language: string, source: string }` | `{ submissionId: string, status: 'queued'|'running'|'completed'|'failed', tests?: { passed: number, total: number }, aiFeedback?: string }` | `400`, `401`, `413`, `429`, `500`, `503` sandbox unavailable |

## Admin surfaces

Admin-only analytics and moderation routes should return `403` for authenticated non-admin users. The frontend may hide admin navigation based on the session role, but it must redirect or show an unauthorized state after a backend `403`. No admin data is currently requested by this frontend.

## Failure handling requirements

The production client should normalize network errors, preserve request IDs for support, abort stale requests, and expose retry actions for `429`, `5xx`, and sandbox queue failures. Never send credentials, tokens, or unnecessary database state from client components.
