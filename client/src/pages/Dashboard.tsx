import React, { useState } from "react";
import { Activity, Newspaper, Trophy } from "lucide-react";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { cn } from "@/lib/utils";
import LiveScoresWidget from "@/components/dashboard/LiveScoresWidget";
import NewsFeed from "@/components/dashboard/NewsFeed";
import AppSummaries from "@/components/dashboard/AppSummaries";

export default function Dashboard() {
  const { preferences } = useUserPreferences();
  const { viewMode } = useViewMode();
  const isMobile = viewMode === "mobile";
  const [activeTab, setActiveTab] = useState<"scores" | "news" | "apps">("scores");
  const { dashboardLayout } = preferences;

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

      {isMobile ? (
        <div>
          <div className="tab-bar mb-4">
            {[
              { key: "scores", label: "Scores", Icon: Activity },
              { key: "news", label: "News", Icon: Newspaper },
              { key: "apps", label: "Apps", Icon: Trophy },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                className={cn("tab-item", activeTab === key && "active")}
                onClick={() => setActiveTab(key as typeof activeTab)}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
              </button>
            ))}
          </div>
          {activeTab === "scores" && <LiveScoresWidget sports={dashboardLayout.scoresSports} />}
          {activeTab === "news" && (
            <NewsFeed
              categories={dashboardLayout.newsCategories}
              count={dashboardLayout.newsCount}
              favoriteSports={preferences.favoriteSports}
              favoriteTeams={preferences.favoriteTeams}
              favoritePlayers={preferences.favoritePlayers}
            />
          )}
          {activeTab === "apps" && <AppSummaries />}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top row: Apps hub (compact, full width) */}
          {dashboardLayout.showAppSummaries && (
            <div>
              <AppSummaries />
            </div>
          )}

          {/* Main content: Live Scores + News side by side with breathing room */}
          <div className="grid grid-cols-12 gap-6">
            {dashboardLayout.showLiveScores && (
              <div className={cn(
                dashboardLayout.showNewsFeed ? "col-span-5 xl:col-span-4" : "col-span-12"
              )}>
                <LiveScoresWidget sports={dashboardLayout.scoresSports} />
              </div>
            )}
            {dashboardLayout.showNewsFeed && (
              <div className={cn(
                dashboardLayout.showLiveScores ? "col-span-7 xl:col-span-8" : "col-span-12"
              )}>
                <NewsFeed
                  categories={dashboardLayout.newsCategories}
                  count={dashboardLayout.newsCount}
                  favoriteSports={preferences.favoriteSports}
                  favoriteTeams={preferences.favoriteTeams}
                  favoritePlayers={preferences.favoritePlayers}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
