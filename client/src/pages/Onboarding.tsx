import React, { useState, useMemo, useEffect } from "react";
import {
  Trophy, ChevronRight, ChevronLeft, Check, Target, BarChart3,
  Users, Zap, Search, X, Settings
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

// Comprehensive teams list - all 30 NBA, 32 NFL, top EPL + European, all 30 MLB, all 32 NHL
const ALL_TEAMS: Record<string, string[]> = {
  basketball: [
    "Atlanta Hawks", "Boston Celtics", "Brooklyn Nets", "Charlotte Hornets", "Chicago Bulls",
    "Cleveland Cavaliers", "Dallas Mavericks", "Denver Nuggets", "Detroit Pistons", "Golden State Warriors",
    "Houston Rockets", "Indiana Pacers", "LA Clippers", "Los Angeles Lakers", "Memphis Grizzlies",
    "Miami Heat", "Milwaukee Bucks", "Minnesota Timberwolves", "New Orleans Pelicans", "New York Knicks",
    "Oklahoma City Thunder", "Orlando Magic", "Philadelphia 76ers", "Phoenix Suns", "Portland Trail Blazers",
    "Sacramento Kings", "San Antonio Spurs", "Toronto Raptors", "Utah Jazz", "Washington Wizards",
  ],
  football: [
    "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers",
    "Chicago Bears", "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos",
    "Detroit Lions", "Green Bay Packers", "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars",
    "Kansas City Chiefs", "Las Vegas Raiders", "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins",
    "Minnesota Vikings", "New England Patriots", "New Orleans Saints", "New York Giants", "New York Jets",
    "Philadelphia Eagles", "Pittsburgh Steelers", "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers",
    "Tennessee Titans", "Washington Commanders",
  ],
  soccer: [
    "Arsenal", "Aston Villa", "Brighton", "Chelsea", "Crystal Palace", "Everton", "Fulham", "Liverpool",
    "Manchester City", "Manchester United", "Newcastle United", "Nottingham Forest", "Tottenham Hotspur",
    "West Ham United", "Wolves", "Real Madrid", "Barcelona", "Atletico Madrid", "Bayern Munich",
    "Borussia Dortmund", "Paris Saint-Germain", "Juventus", "Inter Milan", "AC Milan", "Napoli",
    "Ajax", "Benfica", "Porto", "Celtic", "Rangers",
  ],
  baseball: [
    "Arizona Diamondbacks", "Atlanta Braves", "Baltimore Orioles", "Boston Red Sox", "Chicago Cubs",
    "Chicago White Sox", "Cincinnati Reds", "Cleveland Guardians", "Colorado Rockies", "Detroit Tigers",
    "Houston Astros", "Kansas City Royals", "Los Angeles Angels", "Los Angeles Dodgers", "Miami Marlins",
    "Milwaukee Brewers", "Minnesota Twins", "New York Mets", "New York Yankees", "Oakland Athletics",
    "Philadelphia Phillies", "Pittsburgh Pirates", "San Diego Padres", "San Francisco Giants", "Seattle Mariners",
    "St. Louis Cardinals", "Tampa Bay Rays", "Texas Rangers", "Toronto Blue Jays", "Washington Nationals",
  ],
  hockey: [
    "Anaheim Ducks", "Boston Bruins", "Buffalo Sabres", "Calgary Flames", "Carolina Hurricanes",
    "Chicago Blackhawks", "Colorado Avalanche", "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings",
    "Edmonton Oilers", "Florida Panthers", "Los Angeles Kings", "Minnesota Wild", "Montreal Canadiens",
    "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers", "Ottawa Senators",
    "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks", "Seattle Kraken", "St. Louis Blues",
    "Tampa Bay Lightning", "Toronto Maple Leafs", "Utah Hockey Club", "Vancouver Canucks", "Vegas Golden Knights",
    "Washington Capitals", "Winnipeg Jets",
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
  const { bulkUpdate } = useUserPreferences();
  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<SportId[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [experience, setExperience] = useState<string>("");
  const [teamSearch, setTeamSearch] = useState("");
  const [completing, setCompleting] = useState(false);
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Sports Fan"
  );

  const totalSteps = 5;

  // Persist in-progress onboarding state to localStorage so a refresh,
  // accidental tab close, or session-init flicker doesn't make the user
  // re-pick everything. Keyed per-user so a shared device doesn't leak
  // selections between accounts.
  const draftKey = `onboarding_draft_${user?.id || "anon"}`;

  // Hydrate from any prior draft once on mount. Wrapped in try/catch
  // because a corrupted entry shouldn't keep the user out of the flow.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        step: number;
        displayName: string;
        selectedSports: SportId[];
        selectedTeams: string[];
        selectedInterests: string[];
        experience: string;
      }>;
      if (typeof draft.step === "number" && draft.step >= 0 && draft.step < totalSteps) setStep(draft.step);
      if (typeof draft.displayName === "string" && draft.displayName.trim()) setDisplayName(draft.displayName);
      if (Array.isArray(draft.selectedSports)) setSelectedSports(draft.selectedSports);
      if (Array.isArray(draft.selectedTeams)) setSelectedTeams(draft.selectedTeams);
      if (Array.isArray(draft.selectedInterests)) setSelectedInterests(draft.selectedInterests);
      if (typeof draft.experience === "string") setExperience(draft.experience);
    } catch { /* ignore corrupt draft */ }
    // Only ever runs once for a given user — `draftKey` won't change
    // mid-session because the user object is stable while signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Write the draft on every change. Cheap (one localStorage write) and
  // bounded (state values are small), so no debounce needed.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        step, displayName, selectedSports, selectedTeams, selectedInterests, experience,
      }));
    } catch { /* quota exceeded / private mode — silently skip */ }
  }, [draftKey, step, displayName, selectedSports, selectedTeams, selectedInterests, experience]);

  // Search teams across all selected sports
  const searchableTeams = useMemo(() => {
    const teams: { name: string; sport: SportId; sportLabel: string }[] = [];
    selectedSports.forEach(sport => {
      const sportInfo = SPORTS.find(s => s.key === sport);
      (ALL_TEAMS[sport] || []).forEach(teamName => {
        teams.push({ name: teamName, sport, sportLabel: sportInfo?.league || "" });
      });
    });
    return teams;
  }, [selectedSports]);

  const filteredSearchTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return [];
    return searchableTeams
      .filter(t => t.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [teamSearch, searchableTeams]);

  // If the user removes a sport after picking teams from it, drop those
  // teams so they don't end up saving favorites for a sport they no longer
  // follow. Uses a Set of valid team names derived from current sports.
  useEffect(() => {
    setSelectedTeams(prev => {
      const valid = new Set<string>();
      selectedSports.forEach(s => (ALL_TEAMS[s] || []).forEach(t => valid.add(t)));
      const next = prev.filter(t => valid.has(t));
      return next.length === prev.length ? prev : next;
    });
  }, [selectedSports]);

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
      case 2: return true;
      case 3: return selectedInterests.length > 0;
      case 4: return experience !== "";
      default: return true;
    }
  };

  // Surfaced under the disabled Continue button so the user knows
  // what they have to do, instead of staring at a greyed-out CTA.
  const proceedHint = (): string | null => {
    if (canProceed()) return null;
    switch (step) {
      case 0: return "Enter a name to continue";
      case 1: return "Pick at least one sport to continue";
      case 3: return "Choose what you want to do — pick at least one";
      case 4: return "Tell us how into sports you are to continue";
      default: return null;
    }
  };

  // Let Enter advance through the onboarding flow from any input. Skipped
  // when the user has focus on a textarea (we don't have any, but keep
  // the escape hatch) or when the current step can't proceed anyway.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA") return;
      // Don't hijack Enter while the team search dropdown is up — the
      // user may be about to click/tab-select a search result.
      if (step === 2 && teamSearch.trim().length > 0) return;
      if (!canProceed()) return;
      e.preventDefault();
      if (step < totalSteps - 1) {
        setStep(s => s + 1);
      } else if (!completing) {
        handleComplete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // canProceed / handleComplete close over everything that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, displayName, selectedSports, selectedInterests, experience, teamSearch, completing]);

  const handleComplete = () => {
    if (completing) return;
    setCompleting(true);

    // Determine betting prefs from experience
    const bettingPrefs =
      experience === "beginner" || experience === "casual"
        ? { riskLevel: "conservative" as const, defaultStake: 25 }
        : experience === "serious"
        ? { riskLevel: "moderate" as const, defaultStake: 50 }
        : { riskLevel: "aggressive" as const, defaultStake: 100 };

    // Single atomic update - no cascading state updates, no lag
    bulkUpdate(prev => ({
      ...prev,
      displayName,
      favoriteSports: selectedSports,
      favoriteTeams: selectedTeams,
      dashboardLayout: {
        ...prev.dashboardLayout,
        scoresSports: selectedSports,
      },
      betting: {
        ...prev.betting,
        ...bettingPrefs,
      },
    }));

    // Persist completion flag and exit onboarding immediately
    try {
      localStorage.setItem(`onboarding_complete_${user?.id || "default"}`, "true");
      localStorage.setItem("onboarding_complete", "true");
      localStorage.removeItem(draftKey);
    } catch {}
    setIsNewUser(false);
  };

  const handleSkip = () => {
    // Skip still persists whatever the user has already entered in earlier
    // steps, so their display name and any picked sports/teams/interests
    // aren't silently discarded when they bail partway through setup.
    const name = displayName.trim();
    bulkUpdate(prev => ({
      ...prev,
      ...(name ? { displayName: name } : {}),
      ...(selectedSports.length > 0 ? { favoriteSports: selectedSports } : {}),
      ...(selectedTeams.length > 0 ? { favoriteTeams: selectedTeams } : {}),
      ...(selectedSports.length > 0
        ? { dashboardLayout: { ...prev.dashboardLayout, scoresSports: selectedSports } }
        : {}),
    }));
    try {
      localStorage.setItem(`onboarding_complete_${user?.id || "default"}`, "true");
      localStorage.setItem("onboarding_complete", "true");
      localStorage.removeItem(draftKey);
    } catch {}
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
                Let's personalize your experience. You can change any of this later in your Profile.
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
              <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-xl">
                <Settings className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Everything you set up here is editable anytime from your <span className="font-semibold text-foreground">Profile</span> page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Favorite Sports */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">Which sports do you follow?</h2>
              <p className="text-sm text-muted-foreground mt-1">Only selected sports will appear across the platform</p>
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
              <p className="text-sm text-muted-foreground mt-1">Search any team or skip this step</p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Search by team name..."
                className="w-full h-11 pl-10 pr-10 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {teamSearch && (
                <button
                  onClick={() => setTeamSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search results */}
            {teamSearch && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredSearchTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No teams match "{teamSearch}"
                  </p>
                ) : (
                  filteredSearchTeams.map(team => {
                    const isSelected = selectedTeams.includes(team.name);
                    return (
                      <button
                        key={team.name}
                        onClick={() => toggleTeam(team.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-primary/15 border-primary/40"
                            : "bg-card border-border hover:border-primary/30"
                        )}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.sportLabel}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected teams chips */}
            {selectedTeams.length > 0 && !teamSearch && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Selected ({selectedTeams.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTeams.map(team => (
                    <span
                      key={team}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/40 rounded-xl text-xs font-medium text-foreground"
                    >
                      {team}
                      <button
                        onClick={() => toggleTeam(team)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedTeams.length === 0 && !teamSearch && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Type a team name above to add it to your favorites
              </p>
            )}
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

        {/* Helper text — explains why the Continue/Get Started button
            is disabled so the user knows what's left to do. */}
        {proceedHint() && (
          <p className="mt-6 text-center text-xs text-muted-foreground" role="status">
            {proceedHint()}
          </p>
        )}

        {/* Navigation */}
        <div className={cn("flex items-center justify-between", proceedHint() ? "mt-3" : "mt-8")}>
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0 || completing}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              step === 0 || completing
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
              disabled={!canProceed() || completing}
              className={cn(
                "flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all",
                canProceed() && !completing
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Zap className="w-4 h-4" />
              {completing ? "Setting up..." : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
