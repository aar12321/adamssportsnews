import React, { useState } from "react";
import {
  User, Palette, Bell, LayoutDashboard, Trophy, Target, Smartphone,
  Monitor, Sun, Moon, ChevronRight, Check, Save, RotateCcw,
  Shield, Activity, AlertCircle, DollarSign, Users, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useViewMode } from "@/contexts/ViewModeContext";

const SPORTS = [
  { key: "basketball", label: "Basketball (NBA)", emoji: "🏀" },
  { key: "football", label: "Football (NFL)", emoji: "🏈" },
  { key: "soccer", label: "Soccer", emoji: "⚽" },
  { key: "baseball", label: "Baseball (MLB)", emoji: "⚾" },
  { key: "hockey", label: "Hockey (NHL)", emoji: "🏒" },
];

const RISK_LEVELS = [
  { key: "conservative", label: "Conservative", desc: "Low-risk bets, steady returns", color: "text-green-400" },
  { key: "moderate", label: "Moderate", desc: "Balanced risk/reward", color: "text-yellow-400" },
  { key: "aggressive", label: "Aggressive", desc: "High risk, high reward", color: "text-red-400" },
];

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-all duration-300",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300",
          checked && "translate-x-5"
        )} />
      </button>
    </div>
  );
}

function SportBadge({ sport, selected, onClick }: { sport: typeof SPORTS[0]; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
        selected
          ? "bg-primary/15 border-primary/40 text-foreground"
          : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
      )}
    >
      <span>{sport.emoji}</span>
      <span>{sport.label.split(" ")[0]}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
    </button>
  );
}

export default function Profile() {
  const { preferences, updatePreferences, updateDashboardLayout, updateNotifications, updateBettingPrefs, resetPreferences } = useUserPreferences();
  const { theme, setTheme } = useTheme();
  const { viewMode, setViewMode } = useViewMode();
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("account");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleFavoriteSport = (sport: string) => {
    const current = preferences.favoriteSports;
    const updated = current.includes(sport as any)
      ? current.filter(s => s !== sport)
      : [...current, sport as any];
    updatePreferences({ favoriteSports: updated });
  };

  const toggleNewsCategory = (cat: string) => {
    const current = preferences.dashboardLayout.newsCategories;
    const updated = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    updateDashboardLayout({ newsCategories: updated });
  };

  const toggleScoresSport = (sport: string) => {
    const current = preferences.dashboardLayout.scoresSports;
    const updated = current.includes(sport as any)
      ? current.filter(s => s !== sport)
      : [...current, sport as any];
    updateDashboardLayout({ scoresSports: updated as any });
  };

  const sections = [
    { key: "account", label: "Account", icon: User },
    { key: "appearance", label: "Appearance", icon: Palette },
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "sports", label: "Sports", icon: Trophy },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "betting", label: "Betting", icon: DollarSign },
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customize your experience</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetPreferences}
            className="btn-ghost gap-1.5 py-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            className={cn("btn-primary py-2", saved && "bg-green-500")}
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar nav */}
        <div className="lg:col-span-1">
          <div className="glass-card p-2 sticky top-8">
            {/* Avatar */}
            <div className="flex flex-col items-center p-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mb-3">
                <User className="w-8 h-8 text-white" />
              </div>
              <p className="font-bold text-foreground">{preferences.displayName}</p>
              <p className="text-xs text-muted-foreground">Member</p>
            </div>

            <nav className="space-y-0.5">
              {sections.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    activeSection === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-5">

          {/* Account */}
          {activeSection === "account" && (
            <Section title="Account" icon={User}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={preferences.displayName}
                    onChange={e => updatePreferences({ displayName: e.target.value })}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favorite Teams</label>
                  <div className="flex flex-wrap gap-2">
                    {preferences.favoriteTeams.map(team => (
                      <span key={team} className="px-3 py-1.5 bg-primary/15 border border-primary/30 rounded-xl text-xs font-medium text-foreground">
                        {team}
                      </span>
                    ))}
                    <button className="px-3 py-1.5 bg-muted border border-dashed border-border rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors">
                      + Add Team
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Member Benefits</p>
                  </div>
                  <ul className="space-y-1.5">
                    {["Full access to all 3 premium apps", "Real-time scores & news", "AI-powered betting analysis", "Fantasy management tools", "Unlimited stat research"].map(benefit => (
                      <li key={benefit} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Section>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <Section title="Appearance" icon={Palette}>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "dark", label: "Dark Mode", icon: Moon, desc: "Easy on the eyes" },
                      { key: "light", label: "Light Mode", icon: Sun, desc: "Classic look" },
                    ].map(({ key, label, icon: Icon, desc }) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key as "dark" | "light")}
                        className={cn(
                          "p-4 rounded-xl border transition-all text-left",
                          theme === key
                            ? "bg-primary/15 border-primary/40"
                            : "bg-muted/30 border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 mb-2", theme === key ? "text-primary" : "text-muted-foreground")} />
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">View Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "mobile", label: "Mobile View", icon: Smartphone, desc: "Compact, touch-friendly" },
                      { key: "desktop", label: "Desktop View", icon: Monitor, desc: "Multi-column, data-rich" },
                    ].map(({ key, label, icon: Icon, desc }) => (
                      <button
                        key={key}
                        onClick={() => setViewMode(key as "mobile" | "desktop")}
                        className={cn(
                          "p-4 rounded-xl border transition-all text-left",
                          viewMode === key
                            ? "bg-primary/15 border-primary/40"
                            : "bg-muted/30 border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("w-5 h-5 mb-2", viewMode === key ? "text-primary" : "text-muted-foreground")} />
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Manually override the layout regardless of your device size.
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <Section title="Dashboard Layout" icon={LayoutDashboard}>
              <div className="space-y-5">
                <div className="space-y-1 divide-y divide-border">
                  <Toggle
                    label="Live Scores"
                    description="Show live game scores widget"
                    checked={preferences.dashboardLayout.showLiveScores}
                    onChange={v => updateDashboardLayout({ showLiveScores: v })}
                  />
                  <Toggle
                    label="News Feed"
                    description="Show sports news and updates"
                    checked={preferences.dashboardLayout.showNewsFeed}
                    onChange={v => updateDashboardLayout({ showNewsFeed: v })}
                  />
                  <Toggle
                    label="App Summaries"
                    description="Show quick views from Betting, Fantasy, and Analyst"
                    checked={preferences.dashboardLayout.showAppSummaries}
                    onChange={v => updateDashboardLayout({ showAppSummaries: v })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">News Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {["breaking", "injury", "trade", "rumor", "news"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleNewsCategory(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize",
                          preferences.dashboardLayout.newsCategories.includes(cat)
                            ? cn("border",
                               cat === "breaking" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                               cat === "injury" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                               cat === "trade" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                               cat === "rumor" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                               "bg-blue-500/20 text-blue-400 border-blue-500/30")
                            : "bg-muted border-transparent text-muted-foreground"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                    News Count: {preferences.dashboardLayout.newsCount}
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={30}
                    step={2}
                    value={preferences.dashboardLayout.newsCount}
                    onChange={e => updateDashboardLayout({ newsCount: parseInt(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>4</span><span>30</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Scores Sports</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map(sport => (
                      <button
                        key={sport.key}
                        onClick={() => toggleScoresSport(sport.key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          preferences.dashboardLayout.scoresSports.includes(sport.key as any)
                            ? "bg-primary/15 border-primary/40 text-foreground"
                            : "bg-muted border-transparent text-muted-foreground"
                        )}
                      >
                        <span>{sport.emoji}</span>
                        {sport.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Sports */}
          {activeSection === "sports" && (
            <Section title="Favorite Sports" icon={Trophy}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Select the sports you follow to personalize your experience.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SPORTS.map(sport => (
                    <SportBadge
                      key={sport.key}
                      sport={sport}
                      selected={preferences.favoriteSports.includes(sport.key as any)}
                      onClick={() => toggleFavoriteSport(sport.key)}
                    />
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <Section title="Notifications" icon={Bell}>
              <div className="space-y-1 divide-y divide-border">
                <Toggle
                  label="Live Score Alerts"
                  description="Get notified when your teams score"
                  checked={preferences.notifications.liveScores}
                  onChange={v => updateNotifications({ liveScores: v })}
                />
                <Toggle
                  label="Breaking News"
                  description="Instant alerts for major stories"
                  checked={preferences.notifications.breakingNews}
                  onChange={v => updateNotifications({ breakingNews: v })}
                />
                <Toggle
                  label="Injury Reports"
                  description="Updates on player injuries"
                  checked={preferences.notifications.injuryNews}
                  onChange={v => updateNotifications({ injuryNews: v })}
                />
                <Toggle
                  label="Trade News"
                  description="Latest trade rumors and confirmed deals"
                  checked={preferences.notifications.tradeNews}
                  onChange={v => updateNotifications({ tradeNews: v })}
                />
                <Toggle
                  label="Fantasy Alerts"
                  description="Player status changes affecting your fantasy team"
                  checked={preferences.notifications.fantasyAlerts}
                  onChange={v => updateNotifications({ fantasyAlerts: v })}
                />
                <Toggle
                  label="Betting Reminders"
                  description="Reminders about pending bets"
                  checked={preferences.notifications.bettingAlerts}
                  onChange={v => updateNotifications({ bettingAlerts: v })}
                />
              </div>
            </Section>
          )}

          {/* Betting */}
          {activeSection === "betting" && (
            <Section title="Betting Preferences" icon={DollarSign}>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Default Stake: ${preferences.betting.defaultStake}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[10, 25, 50, 100, 250, 500].map(amount => (
                      <button
                        key={amount}
                        onClick={() => updateBettingPrefs({ defaultStake: amount })}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                          preferences.betting.defaultStake === amount
                            ? "bg-primary/15 border-primary/40 text-foreground"
                            : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Risk Level</label>
                  <div className="space-y-2">
                    {RISK_LEVELS.map(({ key, label, desc, color }) => (
                      <button
                        key={key}
                        onClick={() => updateBettingPrefs({ riskLevel: key as any })}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          preferences.betting.riskLevel === key
                            ? "bg-primary/10 border-primary/40"
                            : "bg-muted/30 border-border hover:border-primary/30"
                        )}
                      >
                        <div>
                          <p className={cn("text-sm font-semibold", preferences.betting.riskLevel === key ? color : "text-foreground")}>{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        {preferences.betting.riskLevel === key && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-semibold text-yellow-400">Disclaimer</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All betting features on this platform use virtual (mock) money only. No real currency is involved.
                    This is for entertainment and educational purposes only.
                  </p>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
