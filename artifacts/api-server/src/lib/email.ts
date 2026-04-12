// Resend email helper — gracefully no-ops if RESEND_API_KEY is not configured.
// Set RESEND_API_KEY in your environment to enable email notifications.

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

const SITE_URL = process.env["FRONTEND_URL"] ?? "https://creatortasks.vercel.app";

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) return; // silently skip if not configured

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CreatorTasks <noreply@creatortasks.vercel.app>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });
  } catch {
    // Email failures are non-fatal — log and continue
  }
}

function wrap(body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
      <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:24px 32px">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">CreatorTasks</h1>
      </div>
      <div style="padding:32px">${body}</div>
      <div style="padding:16px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
        CreatorTasks · The AI Content Job Board · <a href="${SITE_URL}" style="color:#7c3aed">creatortasks.vercel.app</a>
      </div>
    </div>`;
}

export function emailTaskAccepted(to: string, workerName: string, taskTitle: string, taskId: string) {
  return sendEmail({
    to,
    subject: `Your task "${taskTitle}" has been accepted`,
    html: wrap(`
      <p>Hi,</p>
      <p><strong>${workerName}</strong> has accepted your task <strong>"${taskTitle}"</strong> and will begin working on it shortly.</p>
      <a href="${SITE_URL}/tasks/${taskId}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Task</a>
    `),
  });
}

export function emailWorkSubmitted(to: string, taskTitle: string, taskId: string) {
  return sendEmail({
    to,
    subject: `Work submitted for "${taskTitle}" — review it now`,
    html: wrap(`
      <p>Hi,</p>
      <p>The worker has submitted their work for <strong>"${taskTitle}"</strong>. Please review the submission and approve, request a revision, or reject it.</p>
      <a href="${SITE_URL}/tasks/${taskId}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Review Submission</a>
    `),
  });
}

export function emailTaskApproved(to: string, taskTitle: string, amount: number, taskId: string) {
  return sendEmail({
    to,
    subject: `✅ Work approved — ₹${amount} credited to your wallet`,
    html: wrap(`
      <p>Hi,</p>
      <p>Your submission for <strong>"${taskTitle}"</strong> has been approved! <strong>₹${amount}</strong> has been credited to your CreatorTasks wallet.</p>
      <a href="${SITE_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Wallet</a>
    `),
  });
}

export function emailRevisionRequested(to: string, taskTitle: string, note: string | null, taskId: string) {
  return sendEmail({
    to,
    subject: `Revision requested for "${taskTitle}"`,
    html: wrap(`
      <p>Hi,</p>
      <p>The creator has requested a revision for <strong>"${taskTitle}"</strong>.</p>
      ${note ? `<blockquote style="border-left:3px solid #7c3aed;margin:16px 0;padding:12px 16px;background:#f5f3ff;border-radius:4px">${note}</blockquote>` : ""}
      <a href="${SITE_URL}/tasks/${taskId}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Resubmit Work</a>
    `),
  });
}

export function emailWalletDeposit(to: string, amount: number) {
  return sendEmail({
    to,
    subject: `₹${amount} added to your CreatorTasks wallet`,
    html: wrap(`
      <p>Hi,</p>
      <p><strong>₹${amount}</strong> has been successfully added to your CreatorTasks wallet. You can now post tasks or accept existing ones!</p>
      <a href="${SITE_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a>
    `),
  });
}
