import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  balance: integer("balance").default(0),
  pendingBalance: integer("pending_balance").default(0),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: integer("budget").notNull(),
  status: text("status").default("open"),
  creatorId: uuid("creator_id").notNull(),
  workerId: uuid("worker_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  content: text("content").notNull(),
  status: text("status").default("pending"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  status: text("status").default("completed"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});
