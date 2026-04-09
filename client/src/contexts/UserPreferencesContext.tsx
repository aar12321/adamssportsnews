import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserPreferences, SportId } from "@shared/schema";

const USER_ID = "default";

const defaultPreferences: UserPreferences = {
  userId: USER_ID,
  displayName: "Sports Fan",
  favoriteSports: ["basketball", "football"],
  favoriteTeams: ["Boston Celtics", "Kansas City Chiefs"],
  favoritePlayers: ["Nikola Jokic", "Patrick Mahomes"],
  theme: "dark",
  viewMode: "auto",
  dashboardLayout: {
    showLiveScores: true,
    showNewsFeed: true,
    showAppSummaries: true,
    newsCategories: ["breaking", "injury", "trade", "rumor"],
    scoresSports: ["basketball", "football", "soccer"],
    newsCount: 12,
  },
  notifications: {
    liveScores: true,
    injuryNews: true,
    tradeNews: true,
    breakingNews: true,
    fantasyAlerts: true,
    bettingAlerts: false,
  },
  betting: {
    defaultStake: 50,
    riskLevel: "moderate",
    favoriteLeagues: ["NBA", "NFL"],
  },
  fantasy: {
    teams: [],
    trackingPlayers: ["p1", "p2", "p3"],
  },
  analyst: {
    trackedTeams: ["bos", "okc", "kc"],
    trackedPlayers: ["ps1", "ps2", "ps3"],
    compareHistory: [],
  },
};

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateDashboardLayout: (updates: Partial<UserPreferences["dashboardLayout"]>) => void;
  updateNotifications: (updates: Partial<UserPreferences["notifications"]>) => void;
  updateBettingPrefs: (updates: Partial<UserPreferences["betting"]>) => void;
  resetPreferences: () => void;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem("userPreferences");
      return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync to server
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/preferences/${USER_ID}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
      } catch {
        // Silent fail - local state is source of truth
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [preferences]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem("userPreferences", JSON.stringify(preferences));
    } catch {}
  }, [preferences]);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const updateDashboardLayout = useCallback((updates: Partial<UserPreferences["dashboardLayout"]>) => {
    setPreferences(prev => ({
      ...prev,
      dashboardLayout: { ...prev.dashboardLayout, ...updates },
    }));
  }, []);

  const updateNotifications = useCallback((updates: Partial<UserPreferences["notifications"]>) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, ...updates },
    }));
  }, []);

  const updateBettingPrefs = useCallback((updates: Partial<UserPreferences["betting"]>) => {
    setPreferences(prev => ({
      ...prev,
      betting: { ...prev.betting, ...updates },
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    try {
      localStorage.removeItem("userPreferences");
    } catch {}
  }, []);

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      updateDashboardLayout,
      updateNotifications,
      updateBettingPrefs,
      resetPreferences,
      isLoading,
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  return ctx;
}
