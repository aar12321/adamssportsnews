import React, { useEffect, useState } from "react";
import { Activity, Newspaper, Trophy, LayoutDashboard } from "lucide-react";
import { Link } from "wouter";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { cn } from "@/lib/utils";
import LiveScoresWidget from "@/components/dashboard/LiveScoresWidget";
import NewsFeed from "@/components/dashboard/NewsFeed";
import AppSummaries from "@/components/dashboard/AppSummaries";
import NextGameCard from "@/components/dashboard/NextGameCard";
import InjuryAlertsCard from "@/components/dashboard/InjuryAlertsCard";
import PendingBetsCard from "@/components/dashboard/PendingBetsCard";

type DashboardTabKey = "scores" | "news" | "apps";

function DashboardEmptyState() {
  return (
    <div className="glass-card p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <LayoutDashboard className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="font-bold text-foreground">Your dashboard is empty</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Live Scores, News Feed, and App Summaries are all turned off. Re-enable
          any of them in your Profile to bring the dashboard back.
        </p>
      </div>
      <Link href="/profile">
        <a className="btn-primary inline-flex py-2 text-xs">Open Dashboard settings</a>
      </Link>
    </div>
  );
}

export default function Dashboard() {
  const { preferences } = useUserPreferences();
  const { viewMode } = useViewMode();
  const isMobile = viewMode === "mobile";
  const { dashboardLayout } = preferences;
  const { showLiveScores, showNewsFeed, showAppSummaries } = dashboardLayout;
  const anyWidgetEnabled = showLiveScores || showNewsFeed || showAppSummaries;

  const mobileTabs: { key: DashboardTabKey; label: string; Icon: typeof Activity; enabled: boolean }[] = [
    { key: "scores", label: "Scores", Icon: Activity, enabled: showLiveScores },
    { key: "news", label: "News", Icon: Newspaper, enabled: showNewsFeed },
    { key: "apps", label: "Apps", Icon: Trophy, enabled: showAppSummaries },
  ];
  const visibleTabs = mobileTabs.filter(t => t.enabled);

  const [activeTab, setActiveTab] = useState<DashboardTabKey>(
    visibleTabs[0]?.key ?? "scores"
  );

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, <span className="gradient-text">{preferences.displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="live-dot" />
            <span className="text-xs font-medium text-green-400">Live</span>
          </div>
        </div>
      </div>

      {/* Daily briefing — one glance at what matters today for this user. */}
      <div className="mb-5 space-y-3">
        <NextGameCard
          favoriteTeams={preferences.favoriteTeams}
          displayName={preferences.displayName}
        />
        <PendingBetsCard />
        <InjuryAlertsCard
          favoriteTeams={preferences.favoriteTeams}
          favoritePlayers={preferences.favoritePlayers}
        />
      </div>

      {!anyWidgetEnabled ? (
        <DashboardEmptyState />
      ) : isMobile ? (
        <div>
          {visibleTabs.length > 1 && (
            <div className="tab-bar mb-4">
              {visibleTabs.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  className={cn("tab-item", activeTab === key && "active")}
                  onClick={() => setActiveTab(key)}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
          {activeTab === "scores" && showLiveScores && <LiveScoresWidget sports={dashboardLayout.scoresSports} />}
          {activeTab === "news" && showNewsFeed && <NewsFeed categories={dashboardLayout.newsCategories} count={dashboardLayout.newsCount} sports={preferences.favoriteSports} />}
          {activeTab === "apps" && showAppSummaries && <AppSummaries />}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: Apps hub (compact, full width) */}
          {showAppSummaries && (
            <div>
              <AppSummaries />
            </div>
          )}

          {/* Main content: Live Scores + News side by side with breathing room */}
          {(showLiveScores || showNewsFeed) && (
            <div className="grid grid-cols-12 gap-6">
              {showLiveScores && (
                <div className={cn(
                  showNewsFeed ? "col-span-5 xl:col-span-4" : "col-span-12"
                )}>
                  <LiveScoresWidget sports={dashboardLayout.scoresSports} />
                </div>
              )}
              {showNewsFeed && (
                <div className={cn(
                  showLiveScores ? "col-span-7 xl:col-span-8" : "col-span-12"
                )}>
                  <NewsFeed categories={dashboardLayout.newsCategories} count={dashboardLayout.newsCount} sports={preferences.favoriteSports} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
