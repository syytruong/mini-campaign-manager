# Mini Campaign Manager

A simplified MarTech tool that lets marketers create, manage, and track email campaigns. Submitted as the AI Full-Stack Code Challenge.

**At a glance:**

- Create campaigns, add recipients, schedule for the future, send now
- Live status tracking with progress bars (open rate, send rate)
- Status-aware UI — buttons appear only when they make sense
- Per-recipient delivery outcomes simulated asynchronously
- 10 backend tests covering the core business rules

---

## Tech stack

- **Backend:** Node.js · Express · PostgreSQL · Sequelize · JWT · Zod
- **Frontend:** React 18 · TypeScript · Vite · Chakra UI · React Query · Zustand
- **Infra:** Docker Compose · yarn workspaces

## Project structure

```
mini-campaign-manager/
├── packages/
│   ├── backend/    # Express API   (see packages/backend/README.md)
│   └── frontend/   # React app     (see packages/frontend/README.md)
├── docker-compose.yml
├── .env.example
└── package.json    # workspace root
```

---

## Local setup

> **For non-developer reviewers:** if you can install Docker and run a couple of terminal commands, you can run this. Each step below is copy-pasteable.

### Prerequisites

| Tool             | Version | Install                                               |
|------------------|---------|-------------------------------------------------------|
| Node.js          | 20+     | https://nodejs.org or via [nvm](https://github.com/nvm-sh/nvm) |
| Yarn (Classic)   | 1.22+   | comes with Node 20 via `corepack` (see step 2 below)  |
| Docker Desktop   | latest  | https://www.docker.com/products/docker-desktop        |

> **macOS note:** make sure Docker Desktop is **running** before you start. If you don't see the whale icon in the menu bar, launch the Docker app first.

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd mini-campaign-manager
cp .env.example .env
```

The `.env` file holds local configuration. Open it in any text editor and replace the `JWT_SECRET` value with a random string. To generate one quickly:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output as `JWT_SECRET` in your `.env` file. The other defaults work as-is.

> **macOS note:** the `.env.example` file starts with a `.` so Finder hides it by default. Use the terminal commands above (which see all files), or press `Cmd+Shift+.` in Finder to toggle hidden files.

### 2. Install dependencies

```bash
nvm use                  # picks up Node 20 from .nvmrc (skip if you set Node 20 globally)
corepack enable          # one-time, activates the pinned Yarn version
yarn install             # installs both backend and frontend dependencies
```

If `corepack enable` complains about permissions, run it with `sudo`:

```bash
sudo corepack enable
```

### 3. Start the database and apply migrations

```bash
docker compose up -d db        # starts Postgres on port 5432 in the background
yarn backend migrate           # creates all tables in the dev database
```

You should see:
```
[migrate] applied 6 migration(s)
```

### 4. Run the app

You'll need **two terminal windows**, both at the project root.

**Terminal 1 — backend API on port 4000:**

```bash
yarn backend dev
```

You should see `[api] listening on http://localhost:4000`.

**Terminal 2 — frontend on port 5173:**

```bash
yarn frontend dev
```

You should see Vite's "ready in Xms" message with a link.

### 5. Open the app

Go to **http://localhost:5173**. Click **Create account** and register with any email and a password (8+ characters).

---

## Quick walkthrough — what to try

Once you're signed in, this 5-minute tour exercises every feature:

1. **Create a campaign** — click "New campaign", fill in name/subject/body, **leave recipients empty**, hit Create. You land on the detail page.
2. **Notice the empty state** — the recipients section says "No recipients yet" and the **Send** button is disabled with a tooltip explaining why.
3. **Add recipients** — click "Add recipients" in the empty state and paste a few emails (any format: spaces, commas, semicolons, or new lines). The valid emails appear as blue tags. Hit Add.
4. **Schedule it** — click "Schedule", pick a future date/time, confirm. Notice the status badge change from grey "Draft" to blue "Scheduled".
5. **Remove a recipient** — even on a scheduled campaign you can still adjust the audience. Click the × next to one of the recipient rows.
6. **Send now** — click "Send now" and confirm. The status flips to orange "Sending", the page polls every 2 seconds, and within a moment the status is green "Sent" with stats populated.
7. **Try editing now** — the Schedule, Send, and Delete buttons are all gone. The campaign is locked. Try `PATCH`-ing it via curl and you'll get `403 Forbidden`.

---

## Stopping everything

```bash
docker compose down           # stops containers, keeps the database
docker compose down -v        # ALSO deletes the database volume (fresh start)
```

`Ctrl+C` in either dev-server terminal stops that server. Both can be restarted independently.

---

## Testing

```bash
# One-time setup: create a separate database for tests
docker exec campaign_manager_db psql -U postgres -c "CREATE DATABASE campaign_manager_test;"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/campaign_manager_test \
  yarn backend migrate

# Run the test suite
yarn backend test
```

The test suite includes 10 cases covering the central business rules: registration uniqueness, login non-enumeration, the draft-only edit/delete guard (parameterized over every non-draft status), ownership isolation between users, and the "cannot send a campaign with zero recipients" rule.

See [`packages/backend/README.md`](packages/backend/README.md#tests) for more on the test infrastructure.

---

## Development workflow

This project was built incrementally as small, reviewable feature branches. The commit history reads top-to-bottom as the system being assembled:

- Branches: `chore/*`, `feat/*`, `fix/*`, `docs/*`
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
- Branches merged with `--no-ff` so each slice is visible as a unit in `git log --graph`
- Lint clean before every commit: `yarn backend lint && yarn frontend lint`

---

## How I Used Claude Code

I treated Claude as a fast junior engineer with no taste — useful for
typing things I already knew how to write, dangerous for anything where
the call required judgment. The split below reflects that.

### What I delegated

- **Boilerplate scaffolding.** Yarn workspace setup, Vite + React +
  Chakra config, Sequelize model definitions with `InferAttributes`
  typing, Zod schemas, the typed `fetch` wrapper, the central
  `errorHandler` middleware. All things where the shape was obvious
  to me; Claude saved me the typing.
- **SQL migrations.** I gave Claude the table list and the indexes I
  wanted, and it produced the `.sql` files. I read every line before
  committing.
- **Repetitive frontend pieces.** Status badge color mapping,
  `EmptyState` component, the recipient-emails parser, modal/dialog
  scaffolding. These are pattern-following work where the cost of
  reviewing the output is low.
- **README polish.** Section ordering, copy editing, the "what to try"
  walkthrough.

### What I kept on myself

- **Architecture decisions.** The state machine design, the routes ↔
  services ↔ models layering, the `assertEditable` vs
  `assertRecipientEditable` split, the choice of `404` over `403` for
  cross-user access — every call where the project's correctness
  depended on the choice.
- **Tradeoffs.** JWT in `localStorage` vs `httpOnly` cookies,
  in-process simulation vs queue, custom migration runner vs
  `sequelize-cli`. Claude can list options; only I can decide which
  cost is acceptable for this scope.
- **Test scope.** Claude offered to add tests for the recipient
  `findOrCreate` and the stats `GROUP BY`. I declined — those are
  testing Sequelize and Postgres respectively. The 10 tests we kept
  are all rules whose violation would break the product.
- **Security-sensitive code.** bcrypt cost factor, JWT secret
  handling, the `passwordHash` projection on the User model, the
  generic-message login (no email enumeration). I read these
  line-by-line.
- **Scope discipline.** Claude tends toward "while we're here, let's
  also add X." I cut: refresh tokens, recipient bulk import,
  recipient update endpoints, skeleton loaders, a real job queue.
  Each was a deliberate "not now."

### Real prompts I used

A representative sample, paraphrased from my actual session:

> "Plan the full architecture before writing any code. I want to see
> the data model, the state machine for campaign status, the API
> surface, and the package layout — then we'll build it slice by
> slice with one feature branch per slice."

> "Generate the Sequelize migrations for these four tables. Use
> Postgres ENUMs for the two status fields, UUIDs as primary keys via
> `gen_random_uuid()`, and add these specific indexes: `users.email`
> unique, `(created_by, status)` composite on campaigns,
> `(campaign_id, status)` composite on `campaign_recipients`. Each
> migration in its own file."

> "Why is ESLint flagging this test file as not in any project? Don't
> just patch it — explain what's actually misconfigured."

The last one is the prompt pattern I leaned on most: never accept a
fix without understanding the cause. "Make the error go away" prompts
produce code that breaks again two steps later in a way that's harder
to diagnose.

### Where Claude was wrong, and what I did about it

- **Migration runner typing.** Claude's first version of the migration
  runner used Sequelize's `query<T>()` overload incorrectly and
  reached for `as never` to silence the resulting type error. I
  rejected the cast and rewrote it with `QueryTypes.SELECT`, which is
  the API Sequelize actually documents. Lesson: Claude knows
  TypeScript, but doesn't always know the *idiomatic* way to use a
  specific library. Library-specific judgment stays mine.

- **`CASE WHEN ... THEN col` against a column that may not exist.**
  Claude proposed a clever `CASE WHEN EXISTS(... checksum column ...)
  THEN checksum ELSE NULL END` query so the migration runner could
  handle both pre- and post-checksum schemas in one statement.
  Postgres parses the entire CASE expression at prepare time, so the
  reference to `checksum` errors out before the runtime guard fires.
  I split it into a separate existence check followed by one of two
  SELECTs. Lesson: "clever" SQL is a smell when correctness depends
  on understanding the parser's semantics, not just the language.

- **`tsconfig.json` was the wrong shape for the editor.** Claude's
  initial split — narrow build config + separate `tsconfig.eslint.json`
  — fixed CLI lint but left the editor unable to find Jest globals in
  test files. I restructured: `tsconfig.json` is the broad,
  editor-friendly default with `noEmit: true`; `tsconfig.build.json`
  is the narrow one used by `tsc`. Claude's first instinct was to fix
  the symptom (editor errors) by adding a `.vscode/settings.json`. I
  pushed for the structural fix instead.

- **Commented-out placeholder services in `docker-compose.yml`.**
  Claude generated the file with `api` and `web` service blocks
  commented out as "placeholders for the future." I removed them.
  Each commit should look complete on its own terms — commented-out
  code is leaking future plans into the present.

- **Stale README references.** The home-page placeholder text from
  Step 4 ("a green connected badge means everything works") survived
  in the README until the last commit, even though the home page is
  now `/login`. Claude carried it forward across edits without
  noticing the staleness. Lesson: documentation diff review matters
  as much as code diff review.

### What I would not let Claude do — and why

- **Choose tradeoffs.** Every "Decisions and tradeoffs" entry in this
  README is a choice I made. Claude can enumerate options
  exhaustively, but it can't decide which cost is acceptable in this
  scope. Letting it choose would produce a project full of "industry
  best practices" — many of them inappropriate for a 4–8 hour
  take-home.

- **Decide what to test.** Claude offered to push test coverage well
  past the 3-test minimum. I declined any test that was effectively
  testing a third-party library. The test list should advertise the
  rules that matter, not coverage percentage.

- **Choose the commit/branch strategy.** Atomic feature branches,
  Conventional Commits, `--no-ff` merges — these are signals about
  how I work as an engineer. They're not a strategy I'd want
  generated.

- **Touch security code without close review.** Auth, rate limiting,
  password handling, JWT signing. I drafted the patterns; Claude
  filled in some boilerplate; every line went through me before
  commit.

- **Decide what to cut.** The "what I deliberately didn't add" list
  in the architecture is a series of "not now" calls. Claude's
  default is to add features. Saying no is a senior judgment that
  I keep.

### Summary

I shipped about 30 commits over the project. Roughly 60% of the
characters were typed by Claude. None of the architecture decisions
were. None of the tradeoffs were. Every commit was reviewed and
edited before push. The output is what I would have written, just
faster — which is the correct way to use this kind of tool.

---

## Decisions and tradeoffs

This section explains the non-obvious calls made during development. Each is framed as "the cost I'm paying, why the cost is acceptable in this scope, when I'd revisit it."

### JWT in localStorage

The spec offered "memory or httpOnly cookie." I chose a third option: `localStorage` via Zustand's `persist` middleware.

The threat model for a take-home demo is different from production. Memory loses sessions on every reload, which is hostile to a reviewer who refreshes the browser to inspect network tabs. httpOnly cookies are the right production answer but require backend cookie issuance, CORS `credentials: include`, and a CSRF mitigation strategy (double-submit token or `SameSite=Strict` with all the dev/prod parity issues that brings) — another 1–2 hours that don't demonstrate anything the rubric is asking for.

The cost is XSS exposure: any script that runs on the page can read the token. I accept this for a demo where the consequences of token theft are zero. **In production with real PII or money, I'd switch to httpOnly cookies + double-submit CSRF tokens.** That's a deliberate "not now" decision, not an "it's fine" one.

### In-process send simulation

`POST /campaigns/:id/send` runs the per-recipient simulation via `setImmediate` inside the same Node process. There's no queue, no retry, no persistence beyond what's already in Postgres.

`runSendSimulation` takes a `campaignId` parameter — not a closure over the request — so swapping in a real queue handler is genuinely a one-line change at the call site. The cost I'm paying is documented inline in the code: **if Node crashes between the campaign flipping to `sending` and the loop completing, the campaign is permanently stuck in `sending` with no recovery path.** In production, this is solved by a queue's at-least-once delivery semantics plus a stuck-job watchdog. I deliberately chose not to fake those semantics here, because building half a recovery system would suggest the system is more robust than it is.

In production: BullMQ or SQS, not setImmediate.

### Custom SQL migration runner

I wrote ~150 lines of migration runner instead of pulling in `node-pg-migrate` or `umzug`. The runner reads `.sql` files, applies each in a transaction, tracks applied filenames and a SHA-256 checksum in `schema_migrations`, and halts if an applied file has been edited.

The reason wasn't "I could write it." It was that reviewers can read each `.sql` file and immediately know what runs against the DB — no library conventions to learn.

The cost is honest: **no rollback, no out-of-order detection, no advisory-lock concurrency control.** Those features are 5–10 lines each in a custom runner, and the absence of them would be a real footgun on a team larger than one. I added the checksum (immutability check) because that one matters even at small scale; the others are about coordinating with humans and machines I don't have here. **In production, I'd reach for `node-pg-migrate` or `umzug` and stop maintaining migration infrastructure myself.**

### UUIDs over serial integer IDs

Every primary key is a UUID via `gen_random_uuid()`. The reason isn't aesthetic — it's that serial IDs are enumerable. `/campaigns/2` reveals there's a `/campaigns/1` belonging to someone else. UUIDs avoid the enumeration problem and are safe to merge across systems if this ever federates.

The cost: a few extra bytes per row, and at very high write volumes UUIDv4's randomness fragments the B-tree index and hurts cache locality. **At the scale this challenge implies, irrelevant.** At 100M rows, the answer is UUIDv7 (time-ordered) or ULIDs — same migration shape, different generator function.

### 404 (not 403) for cross-user resource access

If you `GET /campaigns/<someone-else's-id>`, the API returns `404 Not Found`, not `403 Forbidden`. The implementation is a single `findCampaignForUser(id, userId)` helper used by every endpoint that touches a campaign, so the behavior is consistent: same status code, same response body, in both "doesn't exist anywhere" and "exists but not yours" cases. Returning `403` would leak the existence of the resource through the difference in status codes. Standard pattern; GitHub and Stripe do the same.


---

## Per-package documentation

The READMEs under each package contain the full API surface and architecture notes:

- [`packages/backend/README.md`](packages/backend/README.md) — endpoints, state machine, env vars, internal layout
- [`packages/frontend/README.md`](packages/frontend/README.md) — routes, components, status colors, action visibility matrix

## License

MIT