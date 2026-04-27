import { apiFetch } from "@/lib/api";

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
const SW_PATH = `${import.meta.env.BASE_URL}sw.js`;
const SW_SCOPE = import.meta.env.BASE_URL || "/";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as MacIntel with touch
  return ua.includes("Mac") && "ontouchend" in document;
}

export function getIOSVersion(): number | null {
  if (typeof navigator === "undefined") return null;
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)(?:_(\d+))?/);
  if (!m) return null;
  return parseFloat(`${m[1]}.${m[2]}`);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari sets navigator.standalone; modern browsers expose display-mode media query
  // @ts-expect-error - non-standard iOS prop
  if (navigator.standalone === true) return true;
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
    return false;
  }
  // iOS only allows web push from a home-screen installed PWA (iOS 16.4+)
  if (isIOS()) {
    if (!isStandalone()) return false;
    const v = getIOSVersion();
    if (v !== null && v < 16.4) return false;
  }
  return true;
}

export function getPushPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
}

async function getOrRegisterSW(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
}

export async function enableWebPush(getToken: () => Promise<string | null>): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) {
    if (isIOS() && !isStandalone()) {
      return { ok: false, error: "On iPhone, install the app to your Home Screen first (Share → Add to Home Screen), then open it from there." };
    }
    return { ok: false, error: "Push notifications aren't supported on this device or browser." };
  }

  let publicKey = VAPID_PUBLIC_KEY;
  if (!publicKey) {
    try {
      const r = await apiFetch<{ publicKey: string }>("/api/push/vapid-public-key", {}, getToken);
      publicKey = r.publicKey;
    } catch {
      return { ok: false, error: "Push isn't configured on the server yet." };
    }
  }
  if (!publicKey) return { ok: false, error: "Push isn't configured on the server yet." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permission denied. Enable notifications for this site in your browser settings." };
  }

  try {
    const registration = await getOrRegisterSW();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = subscription.toJSON();
    await apiFetch("/api/push/web-subscribe", {
      method: "POST",
      data: {
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      },
    }, getToken);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to enable notifications" };
  }
}

export async function disableWebPush(getToken: () => Promise<string | null>): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      try { await subscription.unsubscribe(); } catch { /* ignore */ }
      try {
        await apiFetch("/api/push/web-unsubscribe", { method: "POST", data: { endpoint } }, getToken);
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

export async function isCurrentlySubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (!registration) return false;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

const AUTO_PROMPT_KEY = "ct.pushAutoPromptDismissedAt";
const AUTO_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function shouldAutoPrompt(): boolean {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "default") return false;
  try {
    const ts = Number(localStorage.getItem(AUTO_PROMPT_KEY) || "0");
    if (ts && Date.now() - ts < AUTO_PROMPT_COOLDOWN_MS) return false;
  } catch {
    /* ignore */
  }
  return true;
}

export function markAutoPromptDismissed(): void {
  try { localStorage.setItem(AUTO_PROMPT_KEY, String(Date.now())); } catch { /* ignore */ }
}
