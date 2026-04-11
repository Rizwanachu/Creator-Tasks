import React, { useEffect, useRef } from "react";

// Patch history API once so query-string changes fire a custom 'urlchange' event
// that components can listen to (wouter only tracks pathname, not search params)
(function patchHistory() {
  const fire = () => window.dispatchEvent(new Event("urlchange"));
  const orig = { push: history.pushState, replace: history.replaceState };
  history.pushState = function (...args) { orig.push.apply(history, args); fire(); };
  history.replaceState = function (...args) { orig.replace.apply(history, args); fire(); };
}());
import { ClerkProvider, Show, useClerk, useAuth } from '@clerk/react';
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
import { AdminPage } from "@/pages/admin";

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
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/tasks" component={Tasks} />
            <Route path="/tasks/:id" component={TaskDetail} />
            
            <Route path="/create">
              <ProtectedRoute component={CreateTask} />
            </Route>
            
            <Route path="/dashboard">
              <ProtectedRoute component={Dashboard} />
            </Route>

            <Route path="/notifications">
              <ProtectedRoute component={NotificationsPage} />
            </Route>

            <Route path="/profile/:clerkId" component={ProfilePage} />

            <Route path="/admin">
              <ProtectedRoute component={AdminPage} />
            </Route>
            
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
