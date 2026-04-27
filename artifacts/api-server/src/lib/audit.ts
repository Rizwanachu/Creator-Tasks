import { db, adminAuditLogs } from "@workspace/db";

export interface AuditLogEntry {
  adminUserId: string;
  adminEmail?: string | null;
  action: string;
  targetUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(adminAuditLogs).values({
      adminUserId: entry.adminUserId,
      adminEmail: entry.adminEmail ?? null,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      reason: entry.reason ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch {
    // Audit logging must never break the action it's tracking.
  }
}
