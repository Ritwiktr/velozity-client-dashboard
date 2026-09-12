# Velozity Project Desk

Internal client-project dashboard for a small agency: JWT auth with refresh cookies, API-enforced roles, Socket.IO live activity, persisted status logs, and a scheduled overdue flagger.

## Live URL

Frontend (Vercel): *add after deploy*  
API + WebSocket (persistent Node process): *add after deploy*  

Vercel is used for the React app. The API stays on a long-running Node host (Docker locally, Render or similar in production) because Socket.IO rooms, presence, and `node-cron` need a process that is not frozen between requests.

## Seeded logins

Password for every account: `Passw0rd!`

| Role | Email |
| --- | --- |
| Admin | `admin@velozity.test` |
| Project Manager | `pm.ravi@velozity.test`, `pm.meera@velozity.test` |
| Developer | `dev.arjun@velozity.test`, `dev.sara@velozity.test`, `dev.nikhil@velozity.test`, `dev.priya@velozity.test` |

Ravi owns Northwind + Lumen. Meera owns Harbor. Developers only see tasks assigned to them.

## Local setup (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Then seed once:

```bash
docker compose exec backend npx prisma db seed
```

App: http://localhost:5173 · API: http://localhost:4000

### Local without full compose

```bash
docker compose up db -d
cd backend && cp ../.env.example ../backend/.env && npm install && npx prisma migrate deploy && npx prisma db seed && npm run dev
cd frontend && npm install && npm run dev
```

## Database schema

```
User 1──* Project (createdBy)
Client 1──* Project
Project 1──* Task
User 1──* Task (assignedTo)
Task 1──* TaskStatusLog   # append-only status history
Task 1──* ActivityEvent
User 1──* ActivityEvent / Notification / RefreshToken
```

`Task.isOverdue` is a stored flag written by the cron job, not computed in GET handlers.

### Indexing

- `Task(projectId, status)` — project boards and status counts  
- `Task(assignedToId, priority, dueDate)` — developer lists  
- `Task(dueDate)`, `Task(isOverdue)` — overdue job + admin overdue count  
- `ActivityEvent(projectId, createdAt)` and `(assignedToId, createdAt)` — last-20 catch-up by role  
- `Notification(userId, read, createdAt)` — badge queries  
- `Project(createdById)` — PM isolation  
- `RefreshToken(tokenHash)` unique — lookup on rotate  

## Architecture decisions

**Express, not Fastify.** Socket.IO attaches to the Node HTTP server Express already uses. The assessment’s middleware story (auth then role then handler) maps cleanly onto Express. Fastify would add a plugin layer without a product benefit here.

**Socket.IO, not raw WebSockets.** Rooms (`role:admin`, `pm:{id}`, `dev:{id}`), auth handshake, and automatic reconnect matter more than a smaller dependency. Events are emitted only into rooms the recipient is allowed to join — a developer socket never receives another developer’s activity.

**node-cron, not Bull.** Overdue flagging is a single periodic SQL update. Bull would require Redis for no extra reliability we need in this scope. The job runs every minute and writes `isOverdue` plus an `ActivityEvent` row.

**Refresh token in an HttpOnly cookie.** Access JWT is 15 minutes, returned in JSON and kept in memory on the client. Refresh JWT is set on `path=/api/auth`, HttpOnly, rotated on each refresh, hashed in Postgres. A stolen access token expires quickly; XSS cannot read the refresh cookie.

Role checks run in Express middleware and again in query `where` clauses (`createdById` for PMs, `assignedToId` for developers). Editing another PM’s project or another developer’s task returns 403 from the API even with a valid JWT.

Missed activity is `GET /api/activity?limit=20` from Postgres, filtered by the same role `where`. It is not stored in the Socket.IO adapter.

Task filters (`status`, `priority`, `dueFrom`, `dueTo`) are query parameters so the Tasks URL is shareable.

## Known limitations

- One Node instance: presence and live emit are in-process. Multiple API replicas would need Redis adapter for Socket.IO.  
- Overdue cron is per-process; run a single API replica or the job will duplicate (activity is still keyed by `isOverdue=false` so the flag itself stays idempotent).  
- Access token lives in memory only; a full page refresh uses the refresh cookie.  
- Production cookies need `COOKIE_SECURE=true` and `sameSite=none` across Vercel ↔ API origins.  
- No file attachments, comments, or email.

## Explanation (for the submission form)

The hardest part was making the live feed correct under three different permission models at once. A naïve `project:{id}` Socket.IO room would leak other developers’ status changes to anyone who opened the same project. I split rooms by role (`role:admin`, `pm:{userId}`, `dev:{userId}`) and stamp each `ActivityEvent` with `projectId` and `assignedToId`. Emits go only to admin, the creating PM, and the assigned developer. Catch-up is a Postgres query with the same predicates, so an offline user does not depend on in-memory buffers. Status history is a separate append-only `TaskStatusLog` so the timeline is stored, not inferred from current state. If I did this again I would put Socket.IO on a Redis adapter from day one and replace node-cron with a single leader-elected worker so horizontal scaling does not require extra operational rules.
