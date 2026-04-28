# Mini Campaign Manager

A simplified MarTech tool that lets marketers create, manage, and track email campaigns. Built as a yarn workspace monorepo.

## Tech stack

- **Backend:** Node.js · Express · PostgreSQL · Sequelize · JWT · Zod
- **Frontend:** React 18 · TypeScript · Vite · Chakra UI · React Query · Zustand
- **Infra:** Docker Compose · yarn workspaces

## Project structure

```
campaign-manager/
├── packages/
│   ├── backend/    # Express API (coming next)
│   └── frontend/   # React app (coming next)
├── docker-compose.yml
├── .env.example
└── package.json    # workspace root
```

## Local setup

### Prerequisites

- Node.js 20+ (use `nvm use` to pick up `.nvmrc`)
- Yarn 1.22+
- Docker + Docker Compose

### 1. Clone and configure

```bash
git clone <repo-url>
cd mini-campaign-manager
cp .env.example .env
# Edit .env — at minimum, set a real JWT_SECRET
```

### 2. Start the database

```bash
docker compose up -d db
```

Verify it's healthy:

```bash
docker compose ps
# db should show "healthy"
```

### 3. Install dependencies

```bash
nvm use
yarn install
```

> Note: `yarn install` will warn that there are no workspace packages yet — that's expected until steps 3 and 4 add the backend and frontend.

### Stopping everything

```bash
docker compose down           # stops containers, keeps the volume
docker compose down -v        # also removes the db volume (fresh start)
```

## Status

Work in progress. Building this incrementally — each commit is a small, reviewable slice.

| Step | Slice | Status |
|------|-------|--------|
| 1 | Monorepo init | ✅ |
| 2 | Docker Compose (Postgres) | ✅ |
| 3 | Backend scaffold | ⏳ |
| 4 | Frontend scaffold | ⏳ |
| 5+ | Feature slices | ⏳ |

## License

MIT
