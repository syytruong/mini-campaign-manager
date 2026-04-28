# @campaign-manager/backend

Express + TypeScript + Sequelize API for the Mini Campaign Manager.

## Scripts

Run from the monorepo root:

```bash
yarn backend dev        # tsx watch mode
yarn backend build      # compile to dist/
yarn backend start      # run compiled output
yarn backend migrate    # apply pending SQL migrations
yarn backend test       # jest
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

## Endpoints

| Method | Path      | Auth | Description                                |
|--------|-----------|------|--------------------------------------------|
| GET    | `/health` | -    | Service + database connectivity check      |

More endpoints coming in subsequent commits.

## Env vars

Loaded from the monorepo root `.env` file. Required:

- `DATABASE_URL` — full Postgres connection string
- `API_PORT` — defaults to 4000
- `NODE_ENV` — defaults to `development`
- `CORS_ORIGINS` — comma-separated allowlist (defaults to `http://localhost:5173`)
