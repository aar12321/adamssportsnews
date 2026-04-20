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
import Dashboard from "@/pages/Dashboard";
import Apps from "@/pages/Apps";
import BettingApp from "@/pages/apps/BettingApp";
import FantasyApp from "@/pages/apps/FantasyApp";
import AnalystApp from "@/pages/apps/AnalystApp";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/apps" component={Apps} />
        <Route path="/apps/betting" component={BettingApp} />
        <Route path="/apps/fantasy" component={FantasyApp} />
        <Route path="/apps/analyst" component={AnalystApp} />
        <Route path="/profile" component={Profile} />
        <Route component={Dashboard} />
      </Switch>
    </MainLayout>
  );
}

function AuthGate() {
  const { user, loading, isNewUser } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Check per-user onboarding completion
  const onboardingKey = `onboarding_complete_${user.id}`;
  const onboardingDone = !!localStorage.getItem(onboardingKey) || !!localStorage.getItem("onboarding_complete");

  if (isNewUser || !onboardingDone) {
    return <Onboarding />;
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
