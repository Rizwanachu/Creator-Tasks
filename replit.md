# CreatorTasks

## Overview

CreatorTasks is an AI Content Job Board — a full-stack marketplace where users post AI content tasks (viral reels, hooks, thumbnails) and others complete them for money. The platform takes a 10% commission on every approved task.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (email + Google OAuth)
- **Payments**: Razorpay (deposits via checkout, withdrawals via UPI)
- **Toasts**: Sonner
- **Routing**: Wouter

## Architecture

- `artifacts/creatortasks` — React+Vite frontend (served at `/`)
- `artifacts/api-server` — Express API server (served at `/api`)
- `lib/db` — Drizzle ORM schema and DB client

## Database Schema

- **users** — id, clerkId, email, name, balance, pendingBalance, referrerId (uuid, nullable)
- **tasks** — id, title, description, budget, category, status, revisionNote, revisionCount (default 0), creatorId, workerId, createdAt
- **submissions** — id, taskId, content, status (pending/approved/rejected)
- **transactions** — id, userId, amount, type (earning/fee/deposit/refund), createdAt
- **withdrawals** — id, userId, amount, upiId, status (pending/completed), createdAt
- **applications** — id, taskId, workerId, message, portfolioUrl, status (pending/accepted/rejected), createdAt
- **invites** — id, taskId, workerId, creatorId, status (pending/accepted/declined), createdAt

## Task Status Flow

```
open → (workers apply / creators invite) → creator selects worker → in_progress → submitted → completed
                                                                                           ↘ revision_requested → submitted (resubmit)
                                                                                           ↘ open (rejected — only after revisionCount > 0)
open → cancelled (creator cancels, escrow refunded)
```

## Hiring System (Application + Invite)

- Workers apply to open tasks with a proposal message and optional portfolio link
- Creators review applicants (see profile, earnings, completed tasks, rating) and assign the best one
- Creators can also directly invite workers to tasks via search
- When a worker is assigned (via application accept or invite accept), all other pending applications/invites are auto-rejected
- Only the assigned worker can submit work

## Core Business Logic

- **Escrow on post**: when posting a task, budget is deducted from `balance` and added to `pendingBalance` atomically. Requires sufficient balance.
- **Approve**: releases `pendingBalance` (not `balance`), credits 90% to worker, logs 10% fee. Triple-guarded against double-spend.
- **Reject**: only allowed if `revisionCount > 0` (must request at least 1 revision first). Refunds escrow (`pendingBalance → balance`).
- **Request revision**: increments `revisionCount`, sets status to `revision_requested`. Max 2 revisions enforced — after that creator must approve or raise a dispute.
- **Cancel**: creator can cancel open (unassigned) tasks, refunds escrow to available balance.
- **Application system**: workers apply with message + portfolio, creator reviews and assigns
- **Direct invite**: creator searches workers and sends task invites, worker accepts/declines
- **Assignment atomicity**: accepting an application or invite atomically assigns worker, rejects all other pending apps/invites
- **Deposit**: Razorpay order creation stores `userId` in order notes. Two-path verification: (a) frontend calls `/api/wallet/deposit/verify` on success, (b) Razorpay webhook `POST /api/webhooks/razorpay` is the source of truth for missed tab-close cases. Both paths are idempotent via `paymentId` uniqueness.
- **Withdrawal**: deduct balance atomically, create pending withdrawal row (manual payout). Guards: must have ≥1 completed task, no open disputes.
- **Fraud guards**: max 3 tasks/day per poster; referral commission only triggers for tasks with budget ≥ ₹300.

## API Routes

- GET/POST /api/tasks (supports ?category= filter)
- GET /api/tasks/:id
- POST /api/tasks/:id/apply (worker submits application)
- GET /api/tasks/:id/applications (creator views applicants)
- GET /api/tasks/:id/my-application (worker checks own application)
- POST /api/applications/:id/accept (creator assigns worker)
- POST /api/applications/:id/reject (creator rejects applicant)
- POST /api/tasks/:id/invite (creator invites worker)
- GET /api/tasks/:id/invites (creator views sent invites)
- GET /api/invites (worker views received invites)
- POST /api/invites/:id/accept (worker accepts invite)
- POST /api/invites/:id/decline (worker declines invite)
- GET /api/users/search?q= (search users by name)
- POST /api/tasks/:id/submit
- POST /api/tasks/:id/approve
- POST /api/tasks/:id/reject (requires revisionCount > 0)
- POST /api/tasks/:id/request-revision (increments revisionCount)
- POST /api/tasks/:id/cancel (open tasks only — refunds escrow)
- GET /api/wallet
- POST /api/wallet/deposit/create-order
- POST /api/wallet/deposit/verify
- POST /api/wallet/withdraw
- GET /api/dashboard

## Environment Variables Required

### Replit (Secrets panel)
- `RAZORPAY_KEY_ID` — Razorpay public key (starts with `rzp_test_` or `rzp_live_`)
- `RAZORPAY_KEY_SECRET` — Razorpay secret key for HMAC verification
- `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook secret (set in Razorpay Dashboard → Webhooks, URL: `https://creatortasks.vercel.app/api/webhooks/razorpay`, event: `payment.captured`)
- `DATABASE_URL` — PostgreSQL connection string
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (pk_live_…)
- `CLERK_SECRET_KEY` — Clerk secret key (sk_live_…)

### Vercel (Environment Variables dashboard)
Same vars as above, minus `VITE_CLERK_PROXY_URL` (not needed on Vercel).
See `.env.example` for the full list.

## Vercel Deployment

The project is Vercel-ready:

- **`vercel.json`** at the root: sets `buildCommand` (just the Vite frontend build), `outputDirectory`, and rewrites `/api/*` to a serverless function.
- **`api/index.ts`** at the root: thin TypeScript entry point that re-exports the Express app (`export { default } from "../artifacts/api-server/src/app"`). Vercel's `@vercel/node` bundles it natively with esbuild, resolving all workspace packages via pnpm symlinks.
- DB schema migrations (`drizzle-kit push`) are NOT in the build command — run them manually after schema changes.
- **`vite.config.ts`**: `PORT` is only validated in dev mode; `BASE_PATH` defaults to `/` for production builds — no env vars needed for `vercel build`.

Steps to deploy on Vercel:
1. Connect your GitHub repo on vercel.com
2. Set environment variables in the Vercel dashboard (see `.env.example`)
3. Deploy — Vercel runs `pnpm install` + builds the Vite frontend + bundles the API TypeScript serverless function automatically

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/creatortasks run dev` — run frontend locally
- `pnpm --filter @workspace/db exec tsc --build` — rebuild DB type declarations after schema changes
