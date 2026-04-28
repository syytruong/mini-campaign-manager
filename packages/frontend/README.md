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

## Stack

- **React 18** with **TypeScript**
- **Vite** for dev server and build
- **Chakra UI v2** for components
- **React Router v6** for routing
- **React Query v5** for server state (lists, details, stats)
- **Zustand** for client state (auth token, current user)

## Env vars

Loaded from the monorepo root `.env`:

- `VITE_API_URL` — backend base URL (default `http://localhost:4000`)
- `WEB_PORT` — vite dev server port (default `5173`)

Only variables prefixed `VITE_` are exposed to the browser bundle.

## Auth model

- The JWT is stored in `localStorage` via Zustand's `persist` middleware,
  so refreshes preserve the session.
- The API client reads the token from the store on every request — no
  stale-closure bugs.
- A `401` response from any endpoint clears the store automatically,
  triggering a redirect to `/login` via `RequireAuth`.

> **Tradeoff:** `localStorage` is vulnerable to XSS exfiltration. The
> spec offered "memory or httpOnly cookie" — memory loses sessions on
> reload (poor demo UX); httpOnly cookies require backend changes
> (CSRF, SameSite). For this challenge, `localStorage` is the standard
> pragmatic choice. A production deployment should switch to httpOnly
> cookies once a CSRF strategy is in place.

## Structure

```
src/
├── main.tsx                # React entry — wires Chakra, React Query, router
├── types.ts                # DTOs that mirror backend response shapes
├── api/
│   ├── client.ts           # typed fetch wrapper, error envelope, 401 auto-logout
│   ├── auth.ts             # /auth/register, /auth/login
│   ├── campaigns.ts        # /campaigns endpoints + useCampaignsList hook
│   └── queryClient.ts      # React Query default config
├── store/
│   └── authStore.ts        # Zustand store with persist middleware
├── router/
│   ├── index.tsx           # createBrowserRouter config
│   └── RequireAuth.tsx     # redirect-to-/login guard
├── components/
│   ├── AppLayout.tsx       # top bar + Outlet for protected pages
│   ├── EmptyState.tsx      # reusable empty placeholder
│   ├── ErrorAlert.tsx      # reusable Chakra Alert renderer for ApiError
│   └── StatusBadge.tsx     # color-mapped Badge for CampaignStatus
└── pages/
    ├── LoginPage.tsx       # /login (sign-in + register tabs)
    └── CampaignsPage.tsx   # /campaigns (list with filter + pagination)
```

## Routes

| Path             | Auth | Description                               |
|------------------|------|-------------------------------------------|
| `/login`         | -    | Sign in or create an account              |
| `/campaigns`     | JWT  | List campaigns with status filter         |

URL search params on `/campaigns`:
- `?status=` — `draft|scheduled|sending|sent` to filter
- `?page=` — 1-indexed page number (defaults to 1)

These live in URL state so filters are deep-linkable and survive refresh.

## Status colors

| Status      | Color  |
|-------------|--------|
| `draft`     | grey   |
| `scheduled` | blue   |
| `sending`   | orange |
| `sent`      | green  |

Defined once in `components/StatusBadge.tsx`.

## Errors

API errors are rendered as Chakra `Alert` components showing the backend's
`error.code` and `error.message`. The error envelope from the backend matches
the shape the API client expects — every error in the system surfaces with
the same UX.
