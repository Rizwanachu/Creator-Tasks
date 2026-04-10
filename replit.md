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
- **Toasts**: Sonner
- **Routing**: Wouter

## Architecture

- `artifacts/creatortasks` — React+Vite frontend (served at `/`)
- `artifacts/api-server` — Express API server (served at `/api`)
- `lib/db` — Drizzle ORM schema and DB client

## Database Schema

- **users** — id, clerkId, email, name, balance, pendingBalance
- **tasks** — id, title, description, budget, status (open/in_progress/submitted/completed), creatorId, workerId, createdAt
- **submissions** — id, taskId, content, status (pending/approved/rejected)
- **transactions** — id, userId, amount, type (earning/fee), createdAt

## Core Business Logic

- Budget is virtual escrow (no deduction at task creation)
- On task approval: worker gets 90%, platform logs 10% fee
- Accept race condition: atomic DB update WHERE status='open', returns 409 if taken

## API Routes

- GET/POST /api/tasks
- GET /api/tasks/:id
- POST /api/tasks/:id/accept
- POST /api/tasks/:id/submit
- POST /api/tasks/:id/approve
- POST /api/tasks/:id/reject
- GET /api/wallet
- GET /api/dashboard

## Key Commands

- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/creatortasks run dev` — run frontend locally
