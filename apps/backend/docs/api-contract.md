# CareerLens AI — API Contract (v1)

Base path: `/api/v1`. Full interactive docs are also served at
`/api/docs` (Swagger, generated from the same NestJS decorators — this
file is the human-readable summary, the Swagger UI is the
machine-checkable source of truth per architecture §20).

Envelope:
- Success: `{ "data": ..., "meta"?: {...} }` (list endpoints use `meta.nextCursor` for cursor pagination)
- Error: `{ "error": { "code": string, "message": string, "details"?: unknown }, "requestId": string }`

Auth: Bearer JWT access token in `Authorization` header, unless marked public.

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | rate-limited 5/min |
| POST | `/auth/login` | public | rate-limited 8/min |
| POST | `/auth/refresh` | public (refresh token in body) | rotates token, detects reuse |
| POST | `/auth/logout` | public (refresh token in body) | revokes one session family |
| POST | `/auth/logout-all` | user | revokes all sessions, bumps tokenVersion |

## Users
| Method | Path | Auth |
|---|---|---|
| GET | `/users/me` | user |
| PATCH | `/users/me/profile` | user |

## Resumes
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/resumes` | user | multipart upload, PDF/DOCX, size-capped |
| GET | `/resumes` | user | |
| GET | `/resumes/:id` | user, ownership-checked | |
| GET | `/resumes/:id/evaluation` | user, ownership-checked | CareerLens Resume Evaluation Score |

## Jobs
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/jobs` | public | `?q=&location=&cursor=`, cursor pagination |
| GET | `/jobs/:id` | public | |
| POST | `/jobs/:id/save` | user | upserts SavedJob status/notes |
| GET | `/jobs/saved/mine` | user | |

## Matching
| Method | Path | Auth |
|---|---|---|
| GET | `/matches/:resumeId/:jobId` | user (resume ownership enforced in service) |

## Skills / Skill Gaps
| Method | Path | Auth |
|---|---|---|
| POST | `/skills/mine` | user |
| GET | `/skills/mine` | user |
| POST | `/target-roles` | user |
| GET | `/target-roles/:id/skill-gaps` | user |

## Roadmap
| Method | Path | Auth |
|---|---|---|
| POST | `/target-roles/:id/roadmap` | user |
| GET | `/roadmaps/mine` | user |
| POST | `/roadmap-modules/:id/status` | user |

## Coach
| Method | Path | Auth |
|---|---|---|
| POST | `/coach/message` | user | context-limited, budget-controlled |

## Interview
| Method | Path | Auth |
|---|---|---|
| POST | `/interview/sessions` | user |
| POST | `/interview/sessions/:id/next-question` | user |
| POST | `/interview/questions/:id/answer` | user | verbal/HR/behavioral answers |

## Code Execution
| Method | Path | Auth |
|---|---|---|
| POST | `/submissions` | user | enqueues only; never executes in-process |
| GET | `/submissions/:id` | user, ownership-checked |

## Admin (all require ADMIN role)
| Method | Path |
|---|---|
| GET | `/admin/users` |
| POST | `/admin/users/:id/promote` |
| GET | `/admin/jobs/failed` |
| POST | `/admin/jobs/resume-processing/:jobId/retry` |
| GET | `/admin/ai/usage` |
| GET | `/admin/audit-logs` |

## Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness only |
| GET | `/readiness` | checks DB + Redis reachability |

## Errors (representative, not exhaustive)
| HTTP | code | when |
|---|---|---|
| 400 | BAD_REQUEST | validation failure, malformed upload |
| 401 | UNAUTHORIZED | missing/expired/invalid token, bad credentials |
| 403 | FORBIDDEN | authenticated but not permitted (role or ownership) |
| 404 | NOT_FOUND | resource missing OR not owned by caller (indistinguishable by design, see OwnershipGuard) |
| 409 | CONFLICT | duplicate registration, etc. |
| 429 | TOO_MANY_REQUESTS | rate limit exceeded |
| 500 | INTERNAL_ERROR | unexpected server error (never leaks internals) |

This document is kept in sync manually alongside the Swagger output;
any drift found during frontend integration should be treated as a bug
in this file, not the code.
