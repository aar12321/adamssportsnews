import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SportId, InfoType, TimeRange } from "@shared/schema";

interface FilterBarProps {
  selectedSports: SportId[];
  setSelectedSports: (sports: SportId[]) => void;
  selectedTypes: ("games" | InfoType)[];
  setSelectedTypes: (types: ("games" | InfoType)[]) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalResults: number;
}

const sports: { id: SportId; name: string }[] = [
  { id: "basketball", name: "Basketball" },
  { id: "football", name: "Football" },
  { id: "soccer", name: "Soccer" },
];

const contentTypes: { id: "games" | InfoType; name: string }[] = [
  { id: "games", name: "Games" },
  { id: "rumor", name: "Rumors" },
  { id: "injury", name: "Injuries" },
  { id: "news", name: "News" },
];

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "3d", label: "Last 3 days" },
  { value: "7d", label: "Last 7 days" },
];

export function FilterBar({
  selectedSports,
  setSelectedSports,
  selectedTypes,
  setSelectedTypes,
  timeRange,
  setTimeRange,
  searchQuery,
  setSearchQuery,
  totalResults,
}: FilterBarProps) {
  const toggleSport = (sportId: SportId) => {
    if (selectedSports.includes(sportId)) {
      setSelectedSports(selectedSports.filter((s) => s !== sportId));
    } else {
      setSelectedSports([...selectedSports, sportId]);
    }
  };

  const toggleType = (type: "games" | InfoType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const clearFilters = () => {
    setSelectedSports(["basketball", "football", "soccer"]);
    setSelectedTypes(["games", "rumor", "injury", "news"]);
    setTimeRange("7d");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedSports.length < 3 ||
    selectedTypes.length < 4 ||
    timeRange !== "7d" ||
    searchQuery !== "";

  return (
    <div className="sticky top-16 z-40 bg-background border-b" data-testid="filter-bar">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          {/* Sport Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Sports:</span>
            {sports.map((sport) => (
              <Button
                key={sport.id}
                variant={selectedSports.includes(sport.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSport(sport.id)}
                className="rounded-full"
                data-testid={`filter-sport-${sport.id}`}
              >
                {sport.name}
              </Button>
            ))}
          </div>

          {/* Content Type Checkboxes */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Show:</span>
            {contentTypes.map((type) => (
              <div key={type.id} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${type.id}`}
                  checked={selectedTypes.includes(type.id)}
                  onCheckedChange={() => toggleType(type.id)}
                  data-testid={`filter-type-${type.id}`}
                />
                <Label
                  htmlFor={`type-${type.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {type.name}
                </Label>
              </div>
            ))}
          </div>

          {/* Time Range and Search */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[180px]" data-testid="filter-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search players, teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
                data-testid="filter-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                Clear all
              </Button>
            )}

            <Badge variant="secondary" className="ml-auto" data-testid="results-count">
              {totalResults} results
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
