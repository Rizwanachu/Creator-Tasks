import webpush from "web-push";
import { db, pushDevices } from "@workspace/db";
import { eq } from "drizzle-orm";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

async function sendOneWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  if (!ensureConfigured()) return { ok: false, gone: false };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
    return { ok: true, gone: false };
  } catch (err: any) {
    const status = err?.statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}

async function sendOneExpoPush(token: string, payload: PushPayload): Promise<{ ok: boolean; gone: boolean }> {
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify([{
        to: token,
        title: payload.title,
        body: payload.body,
        sound: "default",
        data: { url: payload.url, ...payload.data },
      }]),
    });
    if (!res.ok) return { ok: false, gone: false };
    const json: any = await res.json();
    const detail = Array.isArray(json?.data) ? json.data[0] : null;
    if (detail?.status === "error") {
      const code = detail?.details?.error;
      const gone = code === "DeviceNotRegistered";
      return { ok: false, gone };
    }
    return { ok: true, gone: false };
  } catch {
    return { ok: false, gone: false };
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, userId));
    if (devices.length === 0) return;

    await Promise.all(devices.map(async (d) => {
      let result: { ok: boolean; gone: boolean } = { ok: false, gone: false };
      if (d.kind === "web" && d.endpoint && d.p256dh && d.auth) {
        result = await sendOneWebPush(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          payload,
        );
      } else if (d.kind === "expo" && d.expoToken) {
        result = await sendOneExpoPush(d.expoToken, payload);
      }
      if (result.gone) {
        try {
          await db.delete(pushDevices).where(eq(pushDevices.id, d.id));
        } catch {
          /* ignore */
        }
      }
    }));
  } catch {
    // push delivery is best-effort
  }
}
