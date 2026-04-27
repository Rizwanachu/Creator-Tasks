# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## CreatorTasks PWA notes

- `public/manifest.webmanifest` — default install (start_url `/`).
- `public/admin-manifest.webmanifest` — admin install (start_url `/letsmakesomemoney2026`, name "CreatorTasks Admin").
- `src/components/pwa-enhancements.tsx` — swaps the active `<link rel="manifest">` based on the signed-in user's email (admin = `VITE_ADMIN_EMAIL`, falls back to `rizwanachoo123@gmail.com` to mirror the server's `lib/owner.ts`). Persists an `ct.isAdmin` localStorage flag so the admin manifest is applied early on subsequent loads (before Clerk finishes loading).
- Same component auto-prompts the browser push permission once the user is signed in, push is supported, and the app is running standalone (PWA). 7-day cooldown after dismissal via `markAutoPromptDismissed` in `src/lib/web-push.ts`.
- iOS push gating: `isPushSupported()` returns false on iOS unless the page is launched from the Home Screen (`navigator.standalone` / display-mode standalone) AND iOS ≥ 16.4. The Notifications page renders contextual help (install, update iOS, etc.) instead of a generic unsupported message.
