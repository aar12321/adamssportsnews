import React, { useState } from "react";
import {
  Trophy, ChevronRight, ChevronLeft, Check, Target, BarChart3,
  Users, Zap, Star, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import type { SportId } from "@shared/schema";

const SPORTS = [
  { key: "basketball" as SportId, label: "Basketball", league: "NBA", emoji: "\u{1F3C0}" },
  { key: "football" as SportId, label: "Football", league: "NFL", emoji: "\u{1F3C8}" },
  { key: "soccer" as SportId, label: "Soccer", league: "EPL", emoji: "\u26BD" },
  { key: "baseball" as SportId, label: "Baseball", league: "MLB", emoji: "\u26BE" },
  { key: "hockey" as SportId, label: "Hockey", league: "NHL", emoji: "\u{1F3D2}" },
];

const POPULAR_TEAMS: Record<string, { name: string; short: string }[]> = {
  basketball: [
    { name: "Boston Celtics", short: "BOS" },
    { name: "Los Angeles Lakers", short: "LAL" },
    { name: "Golden State Warriors", short: "GSW" },
    { name: "Oklahoma City Thunder", short: "OKC" },
    { name: "Denver Nuggets", short: "DEN" },
    { name: "Cleveland Cavaliers", short: "CLE" },
    { name: "Miami Heat", short: "MIA" },
    { name: "New York Knicks", short: "NYK" },
  ],
  football: [
    { name: "Kansas City Chiefs", short: "KC" },
    { name: "Philadelphia Eagles", short: "PHI" },
    { name: "Buffalo Bills", short: "BUF" },
    { name: "Dallas Cowboys", short: "DAL" },
    { name: "San Francisco 49ers", short: "SF" },
    { name: "Baltimore Ravens", short: "BAL" },
    { name: "Detroit Lions", short: "DET" },
    { name: "Green Bay Packers", short: "GB" },
  ],
  soccer: [
    { name: "Manchester City", short: "MCI" },
    { name: "Arsenal", short: "ARS" },
    { name: "Liverpool", short: "LIV" },
    { name: "Real Madrid", short: "RMA" },
    { name: "Barcelona", short: "BAR" },
    { name: "Bayern Munich", short: "BAY" },
    { name: "Chelsea", short: "CHE" },
    { name: "PSG", short: "PSG" },
  ],
  baseball: [
    { name: "New York Yankees", short: "NYY" },
    { name: "Los Angeles Dodgers", short: "LAD" },
    { name: "Atlanta Braves", short: "ATL" },
    { name: "Houston Astros", short: "HOU" },
  ],
  hockey: [
    { name: "Edmonton Oilers", short: "EDM" },
    { name: "Florida Panthers", short: "FLA" },
    { name: "New York Rangers", short: "NYR" },
    { name: "Dallas Stars", short: "DAL" },
  ],
};

const INTERESTS = [
  { key: "betting", label: "Sports Betting", desc: "Mock bets, odds analysis, bankroll tracking", icon: Target, color: "text-green-400 bg-green-500/10 border-green-500/20" },
  { key: "fantasy", label: "Fantasy Sports", desc: "Build rosters, track players, analyze trades", icon: Users, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { key: "analyst", label: "Stats & Analysis", desc: "Team comparisons, player stats, league leaders", icon: BarChart3, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
];

const EXPERIENCE_LEVELS = [
  { key: "beginner", label: "New to Sports", desc: "I'm just getting into following sports" },
  { key: "casual", label: "Casual Fan", desc: "I follow my teams but don't go deep on stats" },
  { key: "serious", label: "Serious Fan", desc: "I track stats, follow trades, and watch lots of games" },
  { key: "expert", label: "Expert / Analyst", desc: "I do deep analysis, fantasy leagues, and/or betting" },
];

export default function Onboarding() {
  const { user, setIsNewUser } = useAuth();
  const { updatePreferences, updateBettingPrefs, updateDashboardLayout } = useUserPreferences();
  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<SportId[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [experience, setExperience] = useState<string>("");
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Sports Fan"
  );

  const totalSteps = 5;

  const toggleSport = (sport: SportId) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return displayName.trim().length > 0;
      case 1: return selectedSports.length > 0;
      case 2: return true; // teams are optional
      case 3: return selectedInterests.length > 0;
      case 4: return experience !== "";
      default: return true;
    }
  };

  const handleComplete = () => {
    // Save all preferences
    updatePreferences({
      displayName,
      favoriteSports: selectedSports,
      favoriteTeams: selectedTeams,
    });

    updateDashboardLayout({
      scoresSports: selectedSports,
    });

    // Set risk level based on experience
    if (experience === "beginner" || experience === "casual") {
      updateBettingPrefs({ riskLevel: "conservative", defaultStake: 25 });
    } else if (experience === "serious") {
      updateBettingPrefs({ riskLevel: "moderate", defaultStake: 50 });
    } else {
      updateBettingPrefs({ riskLevel: "aggressive", defaultStake: 100 });
    }

    localStorage.setItem("onboarding_complete", "true");
    setIsNewUser(false);
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_complete", "true");
    setIsNewUser(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip setup
            </button>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 0: Welcome + Name */}
        {step === 0 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome to Adams Sports</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Let's personalize your experience. This takes about 30 seconds.
              </p>
            </div>

            <div className="glass-card p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What should we call you?</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-11 px-4 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Favorite Sports */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Which sports do you follow?</h2>
              <p className="text-sm text-muted-foreground mt-1">Select at least one to customize your feed</p>
            </div>

            <div className="space-y-2">
              {SPORTS.map(sport => (
                <button
                  key={sport.key}
                  onClick={() => toggleSport(sport.key)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                    selectedSports.includes(sport.key)
                      ? "bg-primary/15 border-primary/40"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-2xl">{sport.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{sport.label}</p>
                    <p className="text-xs text-muted-foreground">{sport.league}</p>
                  </div>
                  {selectedSports.includes(sport.key) && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Favorite Teams */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Pick your favorite teams</h2>
              <p className="text-sm text-muted-foreground mt-1">Optional - you can change these later</p>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {selectedSports.map(sport => {
                const sportInfo = SPORTS.find(s => s.key === sport);
                const teams = POPULAR_TEAMS[sport] || [];
                return (
                  <div key={sport}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {sportInfo?.emoji} {sportInfo?.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {teams.map(team => (
                        <button
                          key={team.name}
                          onClick={() => toggleTeam(team.name)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                            selectedTeams.includes(team.name)
                              ? "bg-primary/15 border-primary/40 text-foreground"
                              : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {team.short}
                          {selectedTeams.includes(team.name) && (
                            <Check className="inline w-3 h-3 ml-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">What are you interested in?</h2>
              <p className="text-sm text-muted-foreground mt-1">We'll highlight the right tools for you</p>
            </div>

            <div className="space-y-3">
              {INTERESTS.map(({ key, label, desc, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => toggleInterest(key)}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left",
                    selectedInterests.includes(key)
                      ? "bg-primary/10 border-primary/40"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {selectedInterests.includes(key) && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Experience Level */}
        {step === 4 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">How would you describe yourself?</h2>
              <p className="text-sm text-muted-foreground mt-1">This helps us tailor complexity and recommendations</p>
            </div>

            <div className="space-y-2">
              {EXPERIENCE_LEVELS.map(level => (
                <button
                  key={level.key}
                  onClick={() => setExperience(level.key)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                    experience === level.key
                      ? "bg-primary/15 border-primary/40"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <div>
                    <p className="font-semibold text-foreground">{level.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{level.desc}</p>
                  </div>
                  {experience === level.key && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              step === 0
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                canProceed()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                canProceed()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Zap className="w-4 h-4" />
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
