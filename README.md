# Mini Campaign Manager

A simplified MarTech tool that lets marketers create, manage, and track email campaigns. Built as a yarn workspace monorepo.

## Tech stack

- **Backend:** Node.js · Express · PostgreSQL · Sequelize · JWT · Zod
- **Frontend:** React 18 · TypeScript · Vite · Chakra UI · React Query · Zustand
- **Infra:** Docker Compose · yarn workspaces

## Project structure

```
mini-campaign-manager/
├── packages/
│   ├── backend/    # Express API (@campaign-manager/backend)
│   └── frontend/   # React app  (@campaign-manager/frontend)
├── docker-compose.yml
├── .env.example
└── package.json    # workspace root
```

See per-package READMEs for package-specific details:
- [`packages/backend/README.md`](packages/backend/README.md)
- [`packages/frontend/README.md`](packages/frontend/README.md)

## Local setup

### Prerequisites

- Node.js 20+ (use `nvm use` to pick up `.nvmrc`)
- Yarn 1.22+ (via `corepack enable`)
- Docker + Docker Compose

### 1. Clone and configure

```bash
git clone <repo-url>
cd mini-campaign-manager
cp .env.example .env
# Edit .env — at minimum, set a real JWT_SECRET
```

### 2. Install dependencies

```bash
nvm use
corepack enable          # one-time, makes the pinned yarn version available
yarn install
```

### 3. Start the database and apply migrations

```bash
docker compose up -d db        # Postgres on :5432
yarn backend migrate           # creates all tables
```

### 4. Run the app

In two terminals:

```bash
# Terminal 1 — backend on :4000
yarn backend dev
```

```bash
# Terminal 2 — frontend on :5173
yarn frontend dev
```

Open http://localhost:5173 — the home page does an end-to-end connectivity check against the API. A green **connected** badge means the whole stack is wired correctly.

### Stopping everything

```bash
docker compose down           # stops containers, keeps the volume (data persists)
docker compose down -v        # also removes the db volume (fresh start)
```

## Development workflow

- Each feature lands as a small, reviewable feature branch
  (`chore/*`, `feat/*`, `fix/*`, `docs/*`)
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- Branches are merged with `--no-ff` to preserve the slice in history
- Run `yarn backend lint && yarn frontend lint` before committing

## License

MIT
