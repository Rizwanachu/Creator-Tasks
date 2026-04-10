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

## Environment Secrets Required

- `RAZORPAY_KEY_ID` — Razorpay public key (starts with `rzp_test_` or `rzp_live_`)
- `RAZORPAY_KEY_SECRET` — Razorpay secret key for HMAC verification

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/creatortasks run dev` — run frontend locally
- `pnpm --filter @workspace/db exec tsc --build` — rebuild DB type declarations after schema changes
