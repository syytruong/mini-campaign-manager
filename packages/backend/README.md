# @campaign-manager/backend

Express + TypeScript + Sequelize API for the Mini Campaign Manager.

## Scripts

Run from the monorepo root:

```bash
yarn backend dev        # tsx watch mode
yarn backend build      # compile to dist/
yarn backend start      # run compiled output
yarn backend test       # jest
yarn backend lint       # eslint
```

Or from inside `packages/backend`:

```bash
yarn dev
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
