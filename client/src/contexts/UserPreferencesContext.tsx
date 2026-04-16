import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserPreferences, SportId } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";

const defaultPreferences: UserPreferences = {
  userId: "default",
  displayName: "Sports Fan",
  favoriteSports: ["basketball", "football"],
  favoriteTeams: [],
  favoritePlayers: [],
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
    trackingPlayers: [],
  },
  analyst: {
    trackedTeams: [],
    trackedPlayers: [],
    compareHistory: [],
  },
};

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateDashboardLayout: (updates: Partial<UserPreferences["dashboardLayout"]>) => void;
  updateNotifications: (updates: Partial<UserPreferences["notifications"]>) => void;
  updateBettingPrefs: (updates: Partial<UserPreferences["betting"]>) => void;
  bulkUpdate: (updater: (prev: UserPreferences) => UserPreferences) => void;
  resetPreferences: () => void;
  isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || "default";
  const storageKey = `userPreferences_${userId}`;

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return { ...defaultPreferences, ...JSON.parse(stored), userId };
      // Try the old key for backward compatibility
      const old = localStorage.getItem("userPreferences");
      if (old) return { ...defaultPreferences, ...JSON.parse(old), userId };
      // Use user metadata for display name
      const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Sports Fan";
      return { ...defaultPreferences, userId, displayName };
    } catch {
      return { ...defaultPreferences, userId };
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Update userId when user changes + hydrate from server so preferences
  // sync across devices. Server is authoritative when both sources exist;
  // localStorage acts as a fast-path cache.
  //
  // On sign-out (`!user`) we reset state to defaults so user A's edits
  // don't leak into the unauthenticated UI or to a user B who signs in
  // next on the same browser.
  useEffect(() => {
    if (!user) {
      setPreferences({ ...defaultPreferences, userId: "default" });
      return;
    }
    let cancelled = false;
    (async () => {
      // Fast-path: local cache
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && !cancelled) {
          setPreferences((prev) => ({ ...prev, ...JSON.parse(stored), userId }));
        } else if (!cancelled) {
          // Start from defaults (not whatever the previous user left in
          // memory) and seed the display name from auth metadata.
          const displayName =
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "Sports Fan";
          setPreferences({ ...defaultPreferences, userId, displayName });
        }
      } catch {
        if (!cancelled) setPreferences({ ...defaultPreferences, userId });
      }

      // Authoritative: server. Only merges if the returned userId matches
      // what we asked for (otherwise a late-arriving response for a prior
      // user could overwrite the current user's state).
      try {
        setIsLoading(true);
        const res = await fetch(`/api/preferences/${userId}`);
        if (res.ok && !cancelled) {
          const remote = await res.json();
          if (remote && typeof remote === "object" && remote.userId === userId) {
            setPreferences((prev) => ({ ...prev, ...remote, userId }));
          }
        }
      } catch {
        /* offline / unauthenticated — local state stays authoritative */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, storageKey, user]);

  // Sync to server. Skip when unauthenticated (preferences.userId ===
  // "default") or when local state drifted out of sync with the current
  // userId — both cases would produce 401s or corrupt another user's
  // prefs. Local cache still saves via the next effect.
  useEffect(() => {
    if (!user || !userId || userId === "default") return;
    if (preferences.userId !== userId) return;
    const timeout = setTimeout(async () => {
      try {
        await fetch(`/api/preferences/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
      } catch {
        // Silent fail - local state is source of truth
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [preferences, userId]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {}
  }, [preferences, storageKey]);

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

  const bulkUpdate = useCallback((updater: (prev: UserPreferences) => UserPreferences) => {
    setPreferences(updater);
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({ ...defaultPreferences, userId });
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [userId, storageKey]);

  return (
    <UserPreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      updateDashboardLayout,
      updateNotifications,
      updateBettingPrefs,
      bulkUpdate,
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
