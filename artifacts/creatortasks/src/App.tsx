import React, { useEffect, useRef } from "react";
import { useProfileComplete } from "@/hooks/use-profile";

// Patch history API once so query-string changes fire a custom 'urlchange' event
// that components can listen to (wouter only tracks pathname, not search params)
(function patchHistory() {
  const fire = () => window.dispatchEvent(new Event("urlchange"));
  const orig = { push: history.pushState, replace: history.replaceState };
  history.pushState = function (...args) { orig.push.apply(history, args); fire(); };
  history.replaceState = function (...args) { orig.replace.apply(history, args); fire(); };
}());
import { ClerkProvider, useClerk, useAuth } from '@clerk/react';
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { Layout } from "@/components/layout";

// Pages
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { Tasks } from "@/pages/tasks";
import { CreateTask } from "@/pages/create";
import { TaskDetail } from "@/pages/task-detail";
import { Dashboard } from "@/pages/dashboard";
import { SignInPage, SignUpPage } from "@/pages/auth";
import { NotificationsPage } from "@/pages/notifications";
import { ProfilePage } from "@/pages/profile";
import { CreatorPage } from "@/pages/creator";
import { CreatorsPage } from "@/pages/creators";
import { ProfileEditPage } from "@/pages/profile-edit";
import { AdminPage } from "@/pages/admin";
import { LeaderboardPage } from "@/pages/leaderboard";
import { TermsPage } from "@/pages/terms";
import { PrivacyPage } from "@/pages/privacy";
import { RefundPolicyPage } from "@/pages/refund-policy";
import { ContactPage } from "@/pages/contact";
import { MessagesPage } from "@/pages/messages";
import { OnboardingPage } from "@/pages/onboarding";
import { ProPage } from "@/pages/pro";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  
  return <Component />;
}

function ProfileGatedRoute({ component: Component, path }: { component: React.ComponentType; path: string }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isComplete, isLoading } = useProfileComplete(userId ?? undefined);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (isLoading) return null;
  if (!isComplete) return <Redirect to={`/onboarding?next=${encodeURIComponent(path)}`} />;

  return <Component />;
}

const REF_STORAGE_KEY = "pending_ref_code";

function RefCapture() {
  const { isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(REF_STORAGE_KEY, ref.toUpperCase());
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const code = localStorage.getItem(REF_STORAGE_KEY);
    if (!code) return;

    const apply = async () => {
      try {
        const token = await getToken();
        const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
        await fetch(`${apiBase}/api/referral/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code }),
        });
        localStorage.removeItem(REF_STORAGE_KEY);
        queryClient.invalidateQueries({ queryKey: ["wallet"] });
        queryClient.invalidateQueries({ queryKey: ["referral"] });
      } catch {
        localStorage.removeItem(REF_STORAGE_KEY);
      }
    };
    apply();
  }, [isSignedIn, getToken, queryClient]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  useEffect(() => {
    const handler = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.addEventListener("urlchange", handler);
    return () => window.removeEventListener("urlchange", handler);
  }, []);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ScrollToTop />
        <RefCapture />
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/tasks" component={Tasks} />
            <Route path="/creators" component={CreatorsPage} />
            <Route path="/tasks/:id" component={TaskDetail} />
            
            <Route path="/create">
              <ProfileGatedRoute component={CreateTask} path="/create" />
            </Route>
            
            <Route path="/dashboard">
              <ProtectedRoute component={Dashboard} />
            </Route>

            <Route path="/notifications">
              <ProtectedRoute component={NotificationsPage} />
            </Route>

            <Route path="/onboarding">
              <ProtectedRoute component={OnboardingPage} />
            </Route>

            <Route path="/profile/edit">
              <ProtectedRoute component={ProfileEditPage} />
            </Route>

            <Route path="/profile/:clerkId" component={ProfilePage} />
            <Route path="/creator/:username" component={CreatorPage} />

            <Route path="/admin">
              <ProtectedRoute component={AdminPage} />
            </Route>

            <Route path="/leaderboard" component={LeaderboardPage} />

            <Route path="/messages">
              <ProtectedRoute component={MessagesPage} />
            </Route>

            <Route path="/pro" component={ProPage} />

            <Route path="/terms" component={TermsPage} />
            <Route path="/privacy" component={PrivacyPage} />
            <Route path="/refund-policy" component={RefundPolicyPage} />
            <Route path="/contact" component={ContactPage} />
            
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster theme={(resolvedTheme === "light" ? "light" : "dark") as "light" | "dark"} />;
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <ClerkProviderWithRoutes />
          </WouterRouter>
          <ThemedToaster />
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
