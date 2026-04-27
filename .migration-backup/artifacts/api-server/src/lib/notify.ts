// Helper to create in-app notifications from any route handler.
import { db, notifications } from "@workspace/db";
import { sendPushToUser } from "./push";

const PUSH_TITLES: Record<string, string> = {
  task_accepted: "Your task was accepted",
  work_submitted: "Work submitted for review",
  task_approved: "Your work was approved",
  revision_requested: "Revision requested",
  task_rejected: "Task update",
  task_cancelled: "Task cancelled",
  wallet_credited: "Wallet credited",
  dispute_opened: "Dispute opened",
  dispute_resolved: "Dispute resolved",
  referral_commission: "Referral commission earned",
  application_received: "New application received",
  application_accepted: "Application accepted",
  application_rejected: "Application rejected",
  task_invite: "You were invited to a task",
  invite_accepted: "Invite accepted",
  invite_declined: "Invite declined",
  withdrawal_requested: "Withdrawal requested",
  withdrawal_paid: "Withdrawal paid",
  withdrawal_rejected: "Withdrawal rejected",
  admin_new_task: "New task posted",
  admin_new_user: "New user signed up",
  admin_withdrawal_request: "New withdrawal request",
};

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
  | "referral_commission"
  | "application_received"
  | "application_accepted"
  | "application_rejected"
  | "task_invite"
  | "invite_accepted"
  | "invite_declined"
  | "withdrawal_requested"
  | "withdrawal_paid"
  | "withdrawal_rejected"
  | "admin_new_task"
  | "admin_new_user"
  | "admin_withdrawal_request";

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
    // Notification insert failures are non-fatal
  }

  // Fan out to push devices (web + expo) — best effort
  try {
    const title = PUSH_TITLES[type] ?? "CreatorTasks";
    const url = type.startsWith("admin_")
      ? "/letsmakesomemoney2026"
      : taskId
        ? `/tasks/${taskId}`
        : "/notifications";
    await sendPushToUser(userId, { title, body: message, url, tag: type });
  } catch {
    // push delivery failures are non-fatal
  }
}
