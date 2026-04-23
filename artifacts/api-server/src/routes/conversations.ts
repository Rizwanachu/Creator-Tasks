import { Router } from "express";
import { db, conversations, messages, tasks, users, invites } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// In-memory rate limiter: userId → list of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 5000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const window = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => t > window);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

const EXTERNAL_CONTACT_PATTERNS = [
  /whatsapp/i,
  /telegram/i,
  /call\s*me/i,
  /\+?\d[\d\s\-]{8,}\d/,
];

function hasExternalContact(content: string): boolean {
  return EXTERNAL_CONTACT_PATTERNS.some((p) => p.test(content));
}

async function isEligible(taskId: string, meId: string, otherId: string): Promise<boolean> {
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) return false;

  if (
    (task.creatorId === meId && task.workerId === otherId) ||
    (task.workerId === meId && task.creatorId === otherId)
  ) return true;

  const invite = await db.query.invites.findFirst({
    where: and(
      eq(invites.taskId, taskId),
      or(
        and(eq(invites.creatorId, meId), eq(invites.workerId, otherId)),
        and(eq(invites.creatorId, otherId), eq(invites.workerId, meId))
      )
    ),
  });

  return !!invite;
}

// POST /api/conversations/start
router.post("/conversations/start", requireAuth, async (req, res) => {
  try {
    const me = req.dbUser!;
    const { taskId, otherUserId } = req.body as { taskId?: string; otherUserId: string };

    if (!otherUserId || otherUserId === me.id) {
      res.status(400).json({ error: "Invalid otherUserId" });
      return;
    }

    const other = await db.query.users.findFirst({ where: eq(users.id, otherUserId) });
    if (!other) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (taskId) {
      const eligible = await isEligible(taskId, me.id, otherUserId);
      if (!eligible) {
        res.status(403).json({ error: "You are not eligible to message this user for this task" });
        return;
      }
    }

    const existing = await db.query.conversations.findFirst({
      where: or(
        and(eq(conversations.participantOneId, me.id), eq(conversations.participantTwoId, otherUserId)),
        and(eq(conversations.participantOneId, otherUserId), eq(conversations.participantTwoId, me.id))
      ),
    });

    if (existing) {
      res.json({ conversation: existing });
      return;
    }

    const [conv] = await db
      .insert(conversations)
      .values({
        taskId: taskId ?? null,
        participantOneId: me.id,
        participantTwoId: otherUserId,
      })
      .returning();

    res.json({ conversation: conv });
  } catch (err) {
    req.log.error({ err }, "Error starting conversation");
    res.status(500).json({ error: "Failed to start conversation" });
  }
});

// GET /api/conversations
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const me = req.dbUser!;

    const myConvs = await db.query.conversations.findMany({
      where: or(
        eq(conversations.participantOneId, me.id),
        eq(conversations.participantTwoId, me.id)
      ),
      orderBy: desc(conversations.createdAt),
    });

    if (myConvs.length === 0) {
      res.json({ conversations: [] });
      return;
    }

    const otherUserIds = myConvs.map((c) =>
      c.participantOneId === me.id ? c.participantTwoId : c.participantOneId
    );

    const uniqueOtherIds = [...new Set(otherUserIds)];
    const otherUsers = await db.query.users.findMany({
      where: or(...uniqueOtherIds.map((id) => eq(users.id, id))),
      columns: { id: true, name: true, avatarUrl: true, clerkId: true },
    });
    const userMap = new Map(otherUsers.map((u) => [u.id, u]));

    const results = await Promise.all(
      myConvs.map(async (conv) => {
        const otherId = conv.participantOneId === me.id ? conv.participantTwoId : conv.participantOneId;
        const otherUser = userMap.get(otherId) ?? null;

        const [lastMsg] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isRead, false),
              sql`${messages.senderId} != ${me.id}`
            )
          );

        return {
          ...conv,
          otherUser,
          lastMessage: lastMsg ?? null,
          unreadCount: count,
        };
      })
    );

    results.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return new Date(bTime!).getTime() - new Date(aTime!).getTime();
    });

    res.json({ conversations: results });
  } catch (err) {
    req.log.error({ err }, "Error fetching conversations");
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET /api/conversations/:id
router.get("/conversations/:id", requireAuth, async (req, res) => {
  try {
    const me = req.dbUser!;
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, req.params.id as string),
    });

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conv.participantOneId !== me.id && conv.participantTwoId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const otherId = conv.participantOneId === me.id ? conv.participantTwoId : conv.participantOneId;
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherId),
      columns: { id: true, name: true, avatarUrl: true, clerkId: true },
    });

    const limit = parseInt(String(req.query.limit ?? "50"));
    const offset = parseInt(String(req.query.offset ?? "0"));

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conv.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      conversation: { ...conv, otherUser },
      messages: msgs.reverse(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching conversation");
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// POST /api/messages
router.post("/messages", requireAuth, async (req, res) => {
  try {
    const me = req.dbUser!;
    const { conversationId, content } = req.body as { conversationId: string; content: string };

    if (!conversationId || !content?.trim()) {
      res.status(400).json({ error: "conversationId and content are required" });
      return;
    }

    if (content.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 characters)" });
      return;
    }

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (conv.participantOneId !== me.id && conv.participantTwoId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (!checkRateLimit(me.id)) {
      res.status(429).json({ error: "Slow down — you're sending messages too quickly" });
      return;
    }

    const warn = hasExternalContact(content);

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: me.id,
        content: content.trim(),
        isRead: false,
      })
      .returning();

    res.json({ message: msg, warn: warn ? "Keep communication on platform. Avoid sharing personal contact details." : null });
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/messages/read
router.post("/messages/read", requireAuth, async (req, res) => {
  try {
    const me = req.dbUser!;
    const { conversationId } = req.body as { conversationId: string };

    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conv || (conv.participantOneId !== me.id && conv.participantTwoId !== me.id)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false),
          sql`${messages.senderId} != ${me.id}`
        )
      );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error marking messages read");
    res.status(500).json({ error: "Failed to mark messages read" });
  }
});

export default router;
