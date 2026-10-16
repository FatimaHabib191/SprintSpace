# SprintSpace

A single-user project and task management app: projects, a database-backed drag-and-drop Kanban board, deadlines, search/filters, and analytics computed from real records. No AI/LLM features.

**Stack:** MongoDB Atlas · Express 5 · Mongoose · React 19 + Vite + TypeScript · Tailwind CSS v4 + shadcn-style Radix components · React Router · TanStack Query · React Hook Form + Zod · dnd-kit · Recharts.

```
sprintspace/
├── backend/    Express API (TypeScript)
│   └── src/ routes · controllers · services · models · validation · middleware · utils
├── frontend/   React SPA (Vite)
│   └── src/ pages · components · hooks · api · lib · context
├── render.yaml         Render blueprint for the API
└── frontend/vercel.json  Vercel config (SPA fallback + /api proxy)
```

## Architecture

- **Layering (backend):** `routes` → `controllers` (thin: parse + respond) → `services` (business rules, queries) → `models`. Zod schemas in `validation/` are applied before services run; one `errorHandler` produces every error response.
- **Response format:** success `{ "data": ..., "meta"?: { page, limit, total, totalPages } }`; error `{ "error": { "code", "message", "details"? } }`.
- **Auth:** register/login issue a JWT in an `HttpOnly` cookie (`ss_token`, `Secure` in production, configurable `SameSite`). `requireAuth` verifies the JWT, confirms the user still exists and sets `req.userId`. **The user id is never read from the request body, query or URL.** Passwords are hashed with bcryptjs. Expired sessions return `401 SESSION_EXPIRED`; the SPA clears its state and redirects to sign-in.
- **CSRF:** because auth is cookie based, every non-GET `/api` request must send `X-Requested-With: sprintspace` (the client does this automatically). Together with credentialed, allow-listed CORS this blocks cross-site form posts.
- **Authorization:** every project and task carries an `owner`. All queries filter by `{ _id, owner }`, so another user's resource is indistinguishable from a missing one (404). When a task is created or moved to another project, the target project must also belong to the caller. Client-supplied `owner` fields are ignored.
- **Kanban ordering:** each task has a float `position` within its `(project, status)` column. A move sends `{ status, index }`; the server computes a position between the neighbours (renumbering the column in one `bulkWrite` if the gap is exhausted). The UI updates optimistically and **rolls back and shows an error toast** if the request fails; the cache is re-fetched afterwards.
- **Analytics:** `/api/dashboard/summary` runs MongoDB aggregations (`$facet`) over the caller's tasks. Nothing is hardcoded and there is no fabricated history; empty accounts get empty states. Overdue = not done, has a due date, due before today (the client passes its local `today`).
- **Project deletion:** tasks are removed first, then the project. This order is deliberate and idempotent: a failure part-way never leaves tasks pointing at a missing project, and retrying completes the deletion. (Multi-document transactions require a replica set; Atlas has one, but the explicit ordered workflow also works on a standalone `mongod`.)

## Database schema

**users** — `name`, `email` (unique, lowercase), `passwordHash` (`select: false`), timestamps.

**projects** — `owner → User` (indexed), `name`, `description`, `color` (hex), `startDate`, `deadline`, `archived`, `archivedAt`, timestamps.
Indexes: `{owner, archived, updatedAt:-1}`, `{owner, name}`.

**tasks** — `owner → User`, `project → Project`, `title`, `description`, `status` (`todo | in_progress | done`), `priority` (`low | medium | high | urgent`), `dueDate`, `position`, `completedAt`, timestamps.
Indexes: `{owner, project, status, position}`, `{owner, status, dueDate}`, `{owner, updatedAt:-1}`.

## API

All routes are under `/api`. Everything except `register`, `login`, `logout` and `health` requires the session cookie.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness probe |
| POST | `/auth/register` | `{ name, email, password }` (min 8 chars, letter + number) → 201, sets cookie |
| POST | `/auth/login` | `{ email, password }` → sets cookie (rate limited) |
| POST | `/auth/logout` | Clears cookie |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | `{ name }` |
| POST | `/auth/me/password` | `{ currentPassword, newPassword }` |
| GET | `/projects` | Query: `search`, `archived=true\|false\|all` (default `false`), `page`, `limit≤100`, `today`. Includes task counts and completion % |
| POST | `/projects` | `{ name, description?, color?, startDate?, deadline? }` (dates `YYYY-MM-DD`, deadline ≥ start) |
| GET | `/projects/:id` | |
| PATCH | `/projects/:id` | Partial update; `{ archived: true\|false }` archives/restores |
| DELETE | `/projects/:id` | Deletes the project and its tasks; returns `{ data: { deletedTasks } }` |
| GET | `/projects/:id/tasks` | Same filters as `/tasks` |
| POST | `/projects/:id/tasks` | `{ title, description?, status?, priority?, dueDate? }` |
| GET | `/tasks` | Query: `search`, `status`, `priority`, `project`, `overdue=true`, `sort=position\|dueDate\|createdAt\|updatedAt`, `page`, `limit≤500`, `today` |
| POST | `/tasks` | Task fields + `project` |
| GET / PATCH / DELETE | `/tasks/:id` | PATCH may change `project` (must be yours) |
| PATCH | `/tasks/:id/move` | `{ status, index }` — reorder / move between columns; persists position |
| GET | `/dashboard/summary` | Totals, completed, in-progress, overdue, completion %, `byStatus`, `byPriority`, per-project progress |

Status codes: `200/201/204` success (task and auth-logout deletes return 204) · `400` validation (`details` has field errors) · `401` unauthenticated/expired · `403` missing CSRF header · `404` not found or not yours · `409` duplicate email · `429` rate limited.

## Environment variables

**Backend** (`backend/.env`, see `.env.example`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | Atlas connection string (required to run the server) |
| `JWT_SECRET` | ≥ 32 random chars in production (`openssl rand -hex 48`) |
| `JWT_EXPIRES_IN` | Default `7d` |
| `CLIENT_ORIGIN` | Comma-separated allowed browser origins (credentialed CORS) |
| `COOKIE_SAMESITE` | `lax` (default in dev; use with the Vercel proxy) or `none` (cross-site; forces `Secure`) |
| `PORT`, `NODE_ENV` | Default `5000`, `development` |

**Frontend** (`frontend/.env`, optional): `VITE_API_URL` — absolute API URL. Leave unset to use the relative `/api` (Vite dev proxy locally, Vercel rewrite in production).

## Local setup

```bash
# 1. API
cd backend
cp .env.example .env        # fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev                 # http://localhost:5000

# 2. Web (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :5000)
```

Free Atlas cluster: create a cluster → Database Access user → Network Access (allow your IP, or `0.0.0.0/0` for Render's dynamic IPs) → Connect → Drivers → copy the URI and add `/sprintspace` as the database name.

## Testing

```bash
cd backend
npm run typecheck && npm run lint
npm test                                    # downloads an in-memory mongod on first run
MONGODB_TEST_URI="mongodb://localhost:27017" npm test   # or use an existing MongoDB (throwaway DB, dropped afterwards)

cd ../frontend
npm run typecheck && npm run lint && npm test && npm run build
```

Backend integration tests (supertest) cover: register/login/logout/`me`, expired/invalid tokens; project create/edit/archive/restore/delete with task cascade; task CRUD, validation and filters; move/reorder persistence; dashboard numbers after each kind of mutation; and cross-user isolation (read, update, delete, move, and forged `owner`/`project` in bodies). Unit tests cover position math. Frontend tests cover Zod schemas, utilities, move-position logic and sign-in behaviour (validation, server errors, duplicate-submit prevention).

## Deployment

**1. MongoDB Atlas** — create the cluster and URI as above.

**2. API on Render**
1. Push the repo to GitHub. Render → New → **Blueprint** → select the repo (uses `render.yaml`).
2. Set `MONGODB_URI` and `CLIENT_ORIGIN` (your future Vercel URL, e.g. `https://sprintspace.vercel.app`). `JWT_SECRET` is generated.
3. Deploy; confirm `https://<service>.onrender.com/api/health` returns `{"data":{"status":"ok"}}`.
(Railway works the same: root `backend`, build `npm ci --include=dev && npm run build`, start `npm start`, same variables.)

**3. Frontend on Vercel**
1. In `frontend/vercel.json`, replace `YOUR-RENDER-SERVICE.onrender.com` with your Render host and commit.
2. Vercel → New Project → import the repo → **Root Directory: `frontend`** (Vite is auto-detected).
3. Deploy, then make sure Render's `CLIENT_ORIGIN` exactly matches the Vercel URL (no trailing slash) and redeploy the API if you changed it.

**Why a proxy?** With the `/api` rewrite the browser only talks to the Vercel origin, so the session cookie is first-party and works in Safari/Firefox/Chrome despite third-party-cookie blocking. If you prefer direct cross-origin calls, set `VITE_API_URL`, `COOKIE_SAMESITE=none` and `CLIENT_ORIGIN`; expect some browsers to block the cookie.

Note: Render's free tier sleeps when idle, so the first request after a pause can take ~30 s.

## Known limitations

- Single-user by design: no teams, sharing, comments or real-time sync.
- Project deletion is an ordered two-step delete, not a multi-document transaction.
- Overdue is evaluated against the client's local date.
