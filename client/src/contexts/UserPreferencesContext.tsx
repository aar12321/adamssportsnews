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

/** Where the auto-save loop is in its lifecycle. */
export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UserPreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  updateDashboardLayout: (updates: Partial<UserPreferences["dashboardLayout"]>) => void;
  updateNotifications: (updates: Partial<UserPreferences["notifications"]>) => void;
  updateBettingPrefs: (updates: Partial<UserPreferences["betting"]>) => void;
  bulkUpdate: (updater: (prev: UserPreferences) => UserPreferences) => void;
  resetPreferences: () => void;
  isLoading: boolean;
  /** Lifecycle of the auto-save loop, surfaced to the UI. */
  saveStatus: SaveStatus;
  /** Epoch millis of the most recent successful server save, or null. */
  lastSavedAt: number | null;
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // Skip the very first auto-save tick — it would fire just because we
  // mounted and hydrated, not because the user changed anything.
  const skipFirstSyncRef = React.useRef(true);

  // Update preferences when the authenticated user changes. Critically:
  // when `user` becomes null (sign-out), reset back to defaults so the
  // prior user's display name, favourites, and dashboard layout don't
  // bleed into the next sign-in or the "default" server bucket.
  useEffect(() => {
    if (user) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setPreferences(prev => ({ ...prev, ...JSON.parse(stored), userId }));
        } else {
          const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Sports Fan";
          setPreferences(prev => ({ ...prev, userId, displayName: prev.displayName === "Sports Fan" ? displayName : prev.displayName }));
        }
      } catch {
        setPreferences(prev => ({ ...prev, userId }));
      }
    } else {
      setPreferences({ ...defaultPreferences, userId: "default" });
    }
  }, [userId, storageKey, user]);

  // Sync to server — but only while a real user is signed in. Without
  // this guard, the debounced PATCH kept firing after sign-out, pushing
  // the previous user's prefs up to /api/preferences/default (and now
  // the server would 401 that anyway because no token is attached).
  useEffect(() => {
    if (!user) return;
    if (skipFirstSyncRef.current) {
      skipFirstSyncRef.current = false;
      return;
    }
    setSaveStatus("pending");
    const timeout = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/preferences/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setLastSavedAt(Date.now());
        setSaveStatus("saved");
      } catch {
        // Local state is still the source of truth, so the user doesn't
        // lose their pick — but we surface the failure so they know the
        // server didn't accept it (network, 401, etc.).
        setSaveStatus("error");
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [preferences, userId, user]);

  // Re-arm the skip guard whenever the user identity flips so the
  // initial hydrate after a fresh sign-in doesn't trigger a phantom save.
  useEffect(() => {
    skipFirstSyncRef.current = true;
    setSaveStatus("idle");
    setLastSavedAt(null);
  }, [userId]);

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
      saveStatus,
      lastSavedAt,
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
