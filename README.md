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
│   ├── backend/    # Express API
│   └── frontend/   # React app (Vite)
├── docker-compose.yml
└── package.json    # workspace root
```

## Quick start

> Setup instructions will be filled in as the project comes together. See the per-package READMEs once they exist.

```bash
# Prereqs: Node 20+, Yarn 1.22+, Docker
nvm use
yarn install
```

## Status

Work in progress. Building this incrementally — each commit is a small, reviewable slice.

## License

MIT
