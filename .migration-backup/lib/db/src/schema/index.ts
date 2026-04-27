import { pgTable, text, integer, uuid, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  username: text("username").unique(),
  bio: text("bio"),
  skills: text("skills").array(),
  portfolioUrl: text("portfolio_url"),
  instagramHandle: text("instagram_handle"),
  youtubeHandle: text("youtube_handle"),
  upiId: text("upi_id"),
  avatarUrl: text("avatar_object_path"),
  referralCode: text("referral_code").unique(),
  referrerId: uuid("referrer_id"),
  totalEarnings: integer("total_earnings").default(0),
  balance: integer("balance").default(0),
  pendingBalance: integer("pending_balance").default(0),
  isAvailable: boolean("is_available").default(true),
  isPro: boolean("is_pro").default(false),
  proUntil: timestamp("pro_until"),
  razorpayCustomerId: text("razorpay_customer_id"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("owner_clerk_id").notNull(),
  url: text("image_object_path").notNull(),
  caption: text("caption"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: integer("budget").notNull(),
  category: text("category").notNull().default("other"),
  status: text("status").default("open"),
  revisionNote: text("revision_note"),
  revisionCount: integer("revision_count").default(0),
  creatorId: uuid("creator_id").notNull(),
  workerId: uuid("worker_id"),
  deadline: timestamp("deadline"),
  attachmentUrl: text("attachment_url"),
  imageUrl: text("image_url"),
  flagged: boolean("flagged").default(false),
  isAi: boolean("is_ai").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  workerIdIdx: index("tasks_worker_id_idx").on(table.workerId),
  creatorIdIdx: index("tasks_creator_id_idx").on(table.creatorId),
}));

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  content: text("content").notNull(),
  submissionUrl: text("submission_url"),
  status: text("status").default("pending"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  paymentId: text("payment_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  amount: integer("amount").notNull(),
  upiId: text("upi_id").notNull(),
  status: text("status").notNull().default("pending"),
  razorpayPayoutId: text("razorpay_payout_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  taskId: uuid("task_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  ratingBy: uuid("rating_by").notNull(),
  ratingFor: uuid("rating_for").notNull(),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  ratingForIdx: index("ratings_rating_for_idx").on(table.ratingFor),
}));

export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  reportedBy: uuid("reported_by").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  adminNote: text("admin_note"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").notNull(),
  referredUserId: uuid("referred_user_id").notNull(),
  commissionEarned: integer("commission_earned").default(0),
  completedTaskCount: integer("completed_task_count").default(0),
  milestone3Paid: boolean("milestone_3_paid").default(false),
  milestone5Paid: boolean("milestone_5_paid").default(false),
  paidOut: boolean("paid_out").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  taskId: uuid("task_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  workerId: uuid("worker_id").notNull(),
  message: text("message").notNull(),
  portfolioUrl: text("portfolio_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  workerId: uuid("worker_id").notNull(),
  creatorId: uuid("creator_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id"),
  participantOneId: uuid("participant_one_id").notNull(),
  participantTwoId: uuid("participant_two_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
  razorpayPlanId: text("razorpay_plan_id"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
  razorpaySubIdIdx: index("subscriptions_razorpay_sub_id_idx").on(table.razorpaySubscriptionId),
}));

export const skillEndorsements = pgTable("skill_endorsements", {
  id: uuid("id").defaultRandom().primaryKey(),
  endorsedById: uuid("endorsed_by_id").notNull(),
  endorsedUserId: uuid("endorsed_user_id").notNull(),
  skill: text("skill").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueEndorsement: uniqueIndex("skill_endorsements_unique_idx").on(table.endorsedById, table.endorsedUserId, table.skill),
}));

export const experience = pgTable("experience", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("clerk_id").notNull(),
  jobTitle: text("job_title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  isCurrent: boolean("is_current").default(false),
  description: text("description"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const education = pgTable("education", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("clerk_id").notNull(),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  fieldOfStudy: text("field_of_study"),
  startYear: integer("start_year").notNull(),
  endYear: integer("end_year"),
  isCurrent: boolean("is_current").default(false),
  grade: text("grade"),
  activities: text("activities"),
  description: text("description"),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
