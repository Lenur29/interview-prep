# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Status:** post-fork from a UGI university monorepo. Many conventions
> from the previous codebase still echo through the foundation we kept;
> they will be revised as the LemurJS app takes shape. Treat this file as
> a starting outline, not the source of truth.

## Project Overview

LemurJS is a JavaScript interview prep app — topic-based questions, self-rating,
and progress tracking. The repo is a **pnpm monorepo** with a React frontend
(`apps/app`), a NestJS GraphQL API (`apps/api`), CLI tooling (`apps/cli`), and
shared libraries (`@lm/graphql`, `@lm/permissions`).

### Repository Structure

```
lemurjs/
├── apps/
│   ├── api/                # NestJS GraphQL API (@lm/api)
│   ├── app/                # React frontend (@lm/app)
│   └── cli/                # CLI utility (@lm/cli)
├── libs/
│   ├── graphql/            # Centralized GraphQL types & codegen (@lm/graphql)
│   └── permissions/        # Permission union — single source of truth (@lm/permissions)
├── e2e/                    # Playwright tests (@lm/e2e)
├── infra/local/up.sh       # Local dev stack (Caddy + dnsmasq + MinIO + Mailpit)
├── turbo.json              # Turbo build orchestration
└── pnpm-workspace.yaml     # Workspace + dependency catalog
```

## Essential Commands

```bash
pnpm dev:api               # Start NestJS API (APP_ENV=local)
pnpm dev:app               # Start the React app

pnpm build                 # Build all packages
pnpm type-check            # Type-check all packages
pnpm lint                  # Lint all packages

pnpm codegen               # Regenerate GraphQL types in @lm/graphql

pnpm dev:up                # Bring up the local Caddy/dnsmasq/MinIO/Mailpit stack
pnpm dev:down              # Tear it down

pnpm --filter @lm/cli dev db seed --env local --clean   # Seed superadmin
```

## Architecture Notes

- **Database:** PostgreSQL via TypeORM. In `local` mode `synchronize: true`
  is on so schema follows the entities; migrations will be reintroduced
  when the schema stabilizes.
- **Auth:** session-based via HTTP-only cookies, with optional 2FA/OTP.
  Roles: `GUEST`, `AUTHORIZED`, `SUPERADMIN` (more to come).
- **Permissions:** the `Permission` union in `libs/permissions/src/permission.ts`
  is the single source of truth, prefixed with `lm:` (e.g. `lm:topics:read`,
  `lm:questions:manage`). Both the API guards and the frontend reference it.
- **Notifications:** `apps/api/src/modules/notifications` provides the
  registry/sender plumbing plus a base Firebase push sender. Specific
  notification entities/senders are added per feature.

## GraphQL

- All `.graphql` operations live in `libs/graphql/src/<feature>/{queries,mutations,fragments}/`.
  Filenames are kebab-case.
- Run `pnpm codegen` after changing schema or operations. Generated types end
  up in `libs/graphql/src/types.ts` (do not hand-edit).
- The schema URL is read from `VITE_LEMUR_API_GQL_URL` (falls back to
  `https://api.lemurjs.local/graphql`).

## React App (`apps/app`)

Vue is gone. The frontend is React 19 + React Router + Tailwind CSS 4.
Conventions are still being defined; defer to the structure already on
disk (`src/app`, `src/layouts`, `src/modules`, `src/shared`).

## E2E

Playwright tests live in `e2e/`. The convention from the previous
codebase still applies: every test creates its own users at runtime via
the API factories in `e2e/fixtures/auth.fixture.ts`. The fixtures rely
on the seeded `superadmin@lemur.test` user — run the CLI seed before
running tests locally.

## Path Aliases

- `@/` resolves to `src/` within each app
- Configured in each app's `vite.config.ts` / `tsconfig.json`
