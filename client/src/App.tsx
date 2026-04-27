import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import AppErrorBoundary from "@/components/AppErrorBoundary";
// Keep Dashboard + Login eagerly imported — they're on the critical path
// (unauthed = Login, authed home = Dashboard). Everything else is code-
// split so the initial bundle stays small and first paint is fast.
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";

const Apps = lazy(() => import("@/pages/Apps"));
const BettingApp = lazy(() => import("@/pages/apps/BettingApp"));
const FantasyApp = lazy(() => import("@/pages/apps/FantasyApp"));
const AnalystApp = lazy(() => import("@/pages/apps/AnalystApp"));
const PickEmApp = lazy(() => import("@/pages/apps/PickEmApp"));
const Profile = lazy(() => import("@/pages/Profile"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
// Dev-only diagnostic page. The conditional collapses to `null` in
// production builds because Vite statically inlines `import.meta.env.DEV`
// as `false`, so the dynamic import string never reaches Rollup and the
// chunk is never emitted.
const AuthDebug = import.meta.env.DEV
  ? lazy(() => import("@/pages/AuthDebug"))
  : null;

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <MainLayout>
      <Suspense fallback={<FullScreenLoader />}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/apps" component={Apps} />
          <Route path="/apps/betting" component={BettingApp} />
          <Route path="/apps/fantasy" component={FantasyApp} />
          <Route path="/apps/analyst" component={AnalystApp} />
          <Route path="/apps/pickem" component={PickEmApp} />
          {AuthDebug && <Route path="/auth-debug" component={AuthDebug} />}
          <Route path="/profile" component={Profile} />
          <Route component={Dashboard} />
        </Switch>
      </Suspense>
    </MainLayout>
  );
}

function AuthGate() {
  const { user, loading, isNewUser } = useAuth();

  // Dev-only escape hatch: /auth-debug bypasses the loading/login screens
  // so the diagnostic can be opened even when those are stuck. Production
  // builds tree-shake this branch (AuthDebug is null when DEV is false).
  if (
    AuthDebug &&
    typeof window !== "undefined" &&
    window.location.pathname === "/auth-debug"
  ) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <AuthDebug />
      </Suspense>
    );
  }

  if (loading) return <FullScreenLoader />;
  if (!user) return <Login />;

  // Check per-user onboarding completion
  const onboardingKey = `onboarding_complete_${user.id}`;
  const onboardingDone = !!localStorage.getItem(onboardingKey) || !!localStorage.getItem("onboarding_complete");

  if (isNewUser || !onboardingDone) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Onboarding />
      </Suspense>
    );
  }

  return <Router />;
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ViewModeProvider>
            <AuthProvider>
              <UserPreferencesProvider>
                <TooltipProvider>
                  <Toaster />
                  <AuthGate />
                </TooltipProvider>
              </UserPreferencesProvider>
            </AuthProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
