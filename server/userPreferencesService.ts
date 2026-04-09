import type { UserPreferences } from "@shared/schema";

const defaultPreferences: UserPreferences = {
  userId: "default",
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

const userPreferencesStore = new Map<string, UserPreferences>();

export class UserPreferencesService {
  getPreferences(userId: string = "default"): UserPreferences {
    if (!userPreferencesStore.has(userId)) {
      userPreferencesStore.set(userId, { ...defaultPreferences, userId });
    }
    return userPreferencesStore.get(userId)!;
  }

  updatePreferences(userId: string = "default", updates: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences(userId);
    const updated = this.deepMerge(current, updates) as UserPreferences;
    updated.userId = userId;
    userPreferencesStore.set(userId, updated);
    return updated;
  }

  resetPreferences(userId: string = "default"): UserPreferences {
    const fresh = { ...defaultPreferences, userId };
    userPreferencesStore.set(userId, fresh);
    return fresh;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

export const userPreferencesService = new UserPreferencesService();
