import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { toast } from "sonner";
import {
  enableWebPush,
  isCurrentlySubscribed,
  shouldAutoPrompt,
  markAutoPromptDismissed,
  isStandalone,
} from "@/lib/web-push";

const ADMIN_EMAIL = (
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? "rizwanachoo123@gmail.com"
).toLowerCase();

const DEFAULT_MANIFEST = `${import.meta.env.BASE_URL}manifest.webmanifest`;
const ADMIN_MANIFEST = `${import.meta.env.BASE_URL}admin-manifest.webmanifest`;

const ADMIN_FLAG_KEY = "ct.isAdmin";

function setManifestHref(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  if (link.href !== new URL(href, window.location.origin).href) {
    link.href = href;
  }
}

// Pre-Clerk-load hint: if we already know this device belongs to an admin
// from a previous sign-in, swap the manifest immediately so that an "Add to
// Home Screen" tap before Clerk finishes loading still picks the admin variant.
(function applyEarlyAdminManifest() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(ADMIN_FLAG_KEY) === "1") {
      setManifestHref(ADMIN_MANIFEST);
    }
  } catch { /* ignore */ }
})();

/**
 * - Swaps the PWA manifest to an admin-specific one (start_url=/letsmakesomemoney2026)
 *   when the signed-in user matches the admin email. This way, when the admin taps
 *   "Add to Home Screen", their installed app opens directly into the admin panel.
 * - Auto-prompts the browser push permission once the user is signed in and the
 *   environment supports it (skipping iPhones not yet installed to home screen).
 */
export function PWAEnhancements() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const promptedRef = useRef(false);

  // Swap manifest based on admin status
  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
    const isAdmin = !!email && email === ADMIN_EMAIL;
    setManifestHref(isAdmin ? ADMIN_MANIFEST : DEFAULT_MANIFEST);
    try {
      if (isAdmin) {
        localStorage.setItem(ADMIN_FLAG_KEY, "1");
      } else if (isSignedIn) {
        // Only clear when we're certain (signed in as a non-admin user)
        localStorage.removeItem(ADMIN_FLAG_KEY);
      }
    } catch { /* ignore */ }
  }, [isLoaded, isSignedIn, user?.primaryEmailAddress?.emailAddress]);

  // Auto-prompt for push notifications
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (promptedRef.current) return;
    if (!shouldAutoPrompt()) return;

    // Only auto-prompt on installed PWAs (avoids being annoying in-browser)
    // — desktop browsers also expose display-mode standalone after install.
    if (!isStandalone()) return;

    promptedRef.current = true;

    // Defer slightly so it doesn't fire during initial route work
    const t = setTimeout(async () => {
      try {
        const r = await enableWebPush(getToken);
        if (r.ok) {
          toast.success("Notifications turned on");
        } else {
          markAutoPromptDismissed();
        }
      } catch {
        markAutoPromptDismissed();
      }
    }, 1500);

    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, getToken]);

  // If user is already subscribed elsewhere, mark as dismissed so we don't keep nagging
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      const sub = await isCurrentlySubscribed();
      if (sub && !cancelled) markAutoPromptDismissed();
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  return null;
}
