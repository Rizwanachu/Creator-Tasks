// Helper to create in-app notifications from any route handler.
import { db, notifications } from "@workspace/db";

type NotifType =
  | "task_accepted"
  | "work_submitted"
  | "task_approved"
  | "revision_requested"
  | "task_rejected"
  | "task_cancelled"
  | "wallet_credited"
  | "dispute_opened"
  | "dispute_resolved"
  | "referral_commission";

export async function createNotification(
  userId: string,
  type: NotifType,
  message: string,
  taskId?: string,
): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      message,
      taskId: taskId ?? null,
    });
  } catch {
    // Notification failures are non-fatal
  }
}
