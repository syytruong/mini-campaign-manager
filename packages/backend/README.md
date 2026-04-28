# @campaign-manager/backend

Express + TypeScript + Sequelize API for the Mini Campaign Manager.

## Scripts

Run from the monorepo root:

```bash
yarn backend dev        # tsx watch mode
yarn backend build      # tsc -p tsconfig.build.json
yarn backend start      # run compiled output
yarn backend migrate    # apply pending SQL migrations
yarn backend test       # jest (uses TEST_DATABASE_URL if set)
yarn backend lint       # eslint
```

## Database

Schema is managed by raw SQL migrations under `migrations/` and applied with
the small runner in `src/migrate.ts`. The runner records applied filenames in
a `schema_migrations` table so it's idempotent.

```bash
docker compose up -d db        # ensure Postgres is running
yarn backend migrate           # creates all tables
```

To reset the schema during development:

```bash
docker compose down -v         # destroys the db volume
docker compose up -d db
yarn backend migrate
```

### Tests

Tests truncate tables between runs, so use a separate test database:

```bash
docker exec campaign_manager_db psql -U postgres -c "CREATE DATABASE campaign_manager_test;"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/campaign_manager_test \
  yarn backend migrate
yarn backend test
```

`TEST_DATABASE_URL` (in the root `.env`) is picked up by jest via
`src/test/setup.ts` and swaps `DATABASE_URL` before any model code runs.

## Endpoints

| Method | Path                       | Auth | Description                                          |
|--------|----------------------------|------|------------------------------------------------------|
| GET    | `/health`                  | -    | Service + database connectivity check                |
| POST   | `/auth/register`           | -    | Register a new user                                  |
| POST   | `/auth/login`              | -    | Login, returns JWT                                   |
| GET    | `/recipients`              | JWT  | List recipients (paginated)                          |
| POST   | `/recipients`              | JWT  | Create or upsert a recipient by email                |
| GET    | `/campaigns`               | JWT  | List the user's campaigns (paginated, filter status) |
| POST   | `/campaigns`               | JWT  | Create a draft campaign with optional recipients     |
| GET    | `/campaigns/:id`           | JWT  | Campaign detail with attached recipients             |
| PATCH  | `/campaigns/:id`           | JWT  | Update a draft (403 otherwise)                       |
| DELETE | `/campaigns/:id`           | JWT  | Delete a draft (403 otherwise)                       |
| POST   | `/campaigns/:id/schedule`  | JWT  | Schedule for a future timestamp                      |
| POST   | `/campaigns/:id/send`      | JWT  | Kick off async sending (202 Accepted)                |

### State machine

```
draft  ──schedule──▶  scheduled  ──send──▶  sending  ──(async done)──▶  sent
   │                                  ▲
   └─────────────────send─────────────┘
```

All transitions are enforced server-side via a single transition map. Any
attempt to transition to a non-allowed state returns `403 Forbidden`.

### Async send simulation

`POST /campaigns/:id/send` flips the campaign to `sending` inside a transaction
with a row-level lock (so a double-click can't race), then returns `202
Accepted`. The actual per-recipient outcome runs in the background:

- Each pending `CampaignRecipient` is updated to `sent` or `failed` randomly
  (15% failure rate)
- `sent_at` is set on each row as it's processed
- When all recipients are processed, the campaign flips to `sent`

This is an in-process simulation. A production system would use a job queue
(BullMQ, SQS, etc.) so jobs survive restarts. The simulation lives in
`campaignService.runSendSimulation`.

### Pagination

List endpoints accept `?limit=` (max 100, default 20) and `?offset=` (default 0).
Responses include a `pagination` object with `total`, `limit`, `offset`, `hasMore`.
The total count is also returned in the `X-Total-Count` header (exposed via CORS).

### POST /recipients

Idempotent — POSTing an email that already exists returns the existing record
with status `200 OK`. New recipients return `201 Created`.

### Ownership scope

A user only sees their own campaigns. Requests for someone else's campaign
return `404 Not Found` (not `403`) — we don't leak the existence of
out-of-scope resources.

## Env vars

Loaded from the monorepo root `.env` file. Required:

- `DATABASE_URL` — full Postgres connection string
- `JWT_SECRET` — used to sign and verify JWTs (use a long random string)
- `API_PORT` — defaults to 4000
- `NODE_ENV` — defaults to `development`
- `JWT_EXPIRES_IN` — defaults to `7d`
- `CORS_ORIGINS` — comma-separated allowlist (defaults to `http://localhost:5173`)
- `TEST_DATABASE_URL` — optional, used by jest

## Architecture notes

```
src/
├── app.ts                  # Express app factory (testable)
├── config.ts               # env loader with required-var validation
├── db.ts                   # Sequelize instance + healthcheck
├── index.ts                # server entrypoint (boot + graceful shutdown)
├── migrate.ts              # SQL migration runner
├── errors/
│   └── AppError.ts         # domain errors with statusCode + code
├── middleware/
│   ├── errorHandler.ts     # central HTTP error renderer
│   ├── pagination.ts       # shared pagination Zod schema
│   └── requireAuth.ts      # JWT verification, attaches typed req.user
├── models/                 # Sequelize models + association graph
├── routes/                 # thin Express routers — call services
├── services/               # business logic, no Express imports
└── test/
    ├── helpers.ts          # resetDatabase, closeDatabase
    └── setup.ts            # jest globalSetup — swaps DB URL for tests
```

The boundary between routes and services is enforced by convention: services
throw `AppError`, routes catch nothing and pass errors to `next()`. The
`errorHandler` middleware renders every error consistently.
