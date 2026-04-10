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

- **users** — id, clerkId, email, name, balance, pendingBalance
- **tasks** — id, title, description, budget, category, status, revisionNote, revisionCount (default 0), creatorId, workerId, createdAt
- **submissions** — id, taskId, content, status (pending/approved/rejected)
- **transactions** — id, userId, amount, type (earning/fee/deposit/refund), createdAt
- **withdrawals** — id, userId, amount, upiId, status (pending/completed), createdAt

## Task Status Flow

```
open → in_progress → submitted → completed
                              ↘ revision_requested → submitted (resubmit)
                              ↘ open (rejected — only after revisionCount > 0)
open → cancelled (creator cancels, escrow refunded)
```

## Core Business Logic

- **Escrow on post**: when posting a task, budget is deducted from `balance` and added to `pendingBalance` atomically. Requires sufficient balance.
- **Approve**: releases `pendingBalance` (not `balance`), credits 90% to worker, logs 10% fee. Triple-guarded against double-spend.
- **Reject**: only allowed if `revisionCount > 0` (must request at least 1 revision first). Refunds escrow (`pendingBalance → balance`).
- **Request revision**: increments `revisionCount`, sets status to `revision_requested`.
- **Cancel**: creator can cancel open (unassigned) tasks, refunds escrow to available balance.
- Accept race: atomic WHERE status='open', 409 if taken
- Deposit: Razorpay order → webhook-free verify via HMAC signature → credit balance
- Withdrawal: deduct balance atomically, create pending withdrawal row (manual payout)

## API Routes

- GET/POST /api/tasks (supports ?category= filter)
- GET /api/tasks/:id
- POST /api/tasks/:id/accept
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
- `DATABASE_URL` — PostgreSQL connection string
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (pk_live_…)
- `CLERK_SECRET_KEY` — Clerk secret key (sk_live_…)

### Vercel (Environment Variables dashboard)
Same vars as above, minus `VITE_CLERK_PROXY_URL` (not needed on Vercel).
See `.env.example` for the full list.

## Vercel Deployment

The project is Vercel-ready:

- **`vercel.json`** at the root: sets `buildCommand`, `outputDirectory`, and rewrites `/api/*` to a serverless function.
- **`api/index.ts`** at the root: exports the Express app as a Vercel Node.js serverless handler. Vercel bundles this with all its workspace dependencies.
- **`vite.config.ts`**: `PORT` is only validated in dev mode; `BASE_PATH` defaults to `/` for production builds — no env vars needed for `vercel build`.

Steps to deploy on Vercel:
1. Connect your GitHub repo on vercel.com
2. Set environment variables in the Vercel dashboard (see `.env.example`)
3. Deploy — Vercel runs `pnpm install` + builds the frontend, then compiles the API serverless function automatically

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/creatortasks run dev` — run frontend locally
- `pnpm --filter @workspace/db exec tsc --build` — rebuild DB type declarations after schema changes
