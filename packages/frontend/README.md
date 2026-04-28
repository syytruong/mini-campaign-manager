# @campaign-manager/frontend

React 18 + Vite + TypeScript + Chakra UI frontend for the Mini Campaign Manager.

## Scripts

Run from the monorepo root:

```bash
yarn frontend dev        # vite dev server (default :5173)
yarn frontend build      # tsc + vite build
yarn frontend preview    # serve the production build
yarn frontend lint
```

Or from inside `packages/frontend`:

```bash
yarn dev
```

## Env vars

Loaded from the monorepo root `.env`:

- `VITE_API_URL` — backend base URL (default `http://localhost:4000`)
- `WEB_PORT` — vite dev server port (default `5173`)

## Structure

```
src/
├── App.tsx       # placeholder home page (API health check)
├── main.tsx      # React + ChakraProvider entry
└── vite-env.d.ts # Vite client types
```

More pages and structure (routing, state, API client) coming in subsequent commits.
