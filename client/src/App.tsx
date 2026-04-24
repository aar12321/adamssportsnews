import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Apps from "@/pages/Apps";
import BettingApp from "@/pages/apps/BettingApp";
import FantasyApp from "@/pages/apps/FantasyApp";
import AnalystApp from "@/pages/apps/AnalystApp";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import AurzoSettingsPage from "@/pages/AurzoSettingsPage";
import AurzoAuthGate from "@/lib/aurzo/AurzoAuthGate";
import { Loader2 } from "lucide-react";

/**
 * Routes that live inside the authenticated shell (MainLayout + nav).
 * Everything in here assumes a valid session and platform access, which
 * AurzoAuthGate enforces one level up.
 */
function AuthedRoutes() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/apps" component={Apps} />
        <Route path="/apps/betting" component={BettingApp} />
        <Route path="/apps/fantasy" component={FantasyApp} />
        <Route path="/apps/analyst" component={AnalystApp} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={AurzoSettingsPage} />
        <Route component={Dashboard} />
      </Switch>
    </MainLayout>
  );
}

/**
 * Top-level router.
 *
 * `/login` and `/onboarding` are public(-ish) — Login is always public,
 * and Onboarding checks the session itself (AuthContext) and RPC status.
 * Everything else is wrapped in AurzoAuthGate so it requires both a
 * Supabase session AND `me_has_platform_access = true`.
 */
function RootRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      <Route path="/onboarding">
        {user ? <Onboarding /> : <Redirect to="/login" />}
      </Route>
      <Route>
        {/* Everything else requires both session and platform access. */}
        <AurzoAuthGate>
          <AuthedRoutes />
        </AurzoAuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ViewModeProvider>
          <AuthProvider>
            <UserPreferencesProvider>
              <TooltipProvider>
                <Toaster />
                <RootRouter />
              </TooltipProvider>
            </UserPreferencesProvider>
          </AuthProvider>
        </ViewModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
