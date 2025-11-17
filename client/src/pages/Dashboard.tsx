import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilterBar } from "@/components/FilterBar";
import { GamesSection } from "@/components/GamesSection";
import { InfoSection } from "@/components/InfoSection";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";
import type { Game, InfoItem, SportId, InfoType, TimeRange } from "@shared/schema";

export default function Dashboard() {
  const [selectedSports, setSelectedSports] = useState<SportId[]>(["basketball", "football", "soccer"]);
  const [selectedTypes, setSelectedTypes] = useState<("games" | InfoType)[]>(["games", "rumor", "injury", "news"]);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useTheme();

  // Fetch games
  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  // Fetch info items
  const { data: infoItems = [], isLoading: itemsLoading } = useQuery<InfoItem[]>({
    queryKey: ["/api/info-items"],
  });

  // Filtering logic
  const { filteredGames, filteredInfoItems } = useMemo(() => {
    const now = new Date();
    const timeRangeMs = {
      "24h": 24 * 60 * 60 * 1000,
      "3d": 3 * 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    };

    const cutoffTime = now.getTime() - timeRangeMs[timeRange];

    // Filter games
    let filteredGames = games.filter((game) => {
      // Sport filter
      if (!selectedSports.includes(game.sportId)) return false;

      // Type filter (games)
      if (!selectedTypes.includes("games")) return false;

      // Time filter
      const gameTime = new Date(game.startTime).getTime();
      if (gameTime < cutoffTime) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          game.homeTeam.toLowerCase().includes(query) ||
          game.awayTeam.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Filter info items
    let filteredInfoItems = infoItems.filter((item) => {
      // Sport filter
      if (!selectedSports.includes(item.sportId)) return false;

      // Type filter
      if (!selectedTypes.includes(item.type)) return false;

      // Time filter
      const itemTime = new Date(item.timestamp).getTime();
      if (itemTime < cutoffTime) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.player && item.player.toLowerCase().includes(query)) ||
          (item.team && item.team.toLowerCase().includes(query))
        );
      }

      return true;
    });

    // Sort by newest first
    filteredGames.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    filteredInfoItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { filteredGames, filteredInfoItems };
  }, [games, infoItems, selectedSports, selectedTypes, timeRange, searchQuery]);

  const totalResults = filteredGames.length + filteredInfoItems.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b h-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-full flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="app-title">Sports Intel Board</h1>
            <p className="text-xs text-muted-foreground">Pure stats and updates. Basketball • Football • Soccer</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Filter Bar */}
      <FilterBar
        selectedSports={selectedSports}
        setSelectedSports={setSelectedSports}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalResults={totalResults}
      />

      {/* Main Content */}
      <main className="pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 space-y-8">
          {gamesLoading || itemsLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading sports data...</div>
          ) : (
            <>
              <GamesSection games={filteredGames} />
              <InfoSection items={filteredInfoItems} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
