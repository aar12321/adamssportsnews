import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, Filter, Zap, AlertTriangle, ArrowLeftRight, MessageCircle, Newspaper, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchJson } from "@/lib/queryClient";
import type { SportId } from "@shared/schema";
import NewsCard, { type NewsCategory } from "./NewsCard";

const CATEGORIES: { key: NewsCategory; label: string; Icon: any }[] = [
  { key: "breaking", label: "Breaking", Icon: Zap },
  { key: "injury", label: "Injury", Icon: AlertTriangle },
  { key: "trade", label: "Trade", Icon: ArrowLeftRight },
  { key: "rumor", label: "Rumor", Icon: MessageCircle },
  { key: "news", label: "News", Icon: Newspaper },
];

function detectCategory(article: any): NewsCategory {
  const text = `${article.title} ${article.description} ${article.category || ""}`.toLowerCase();
  const tags = (article.tags || []).map((t: string) => t.toLowerCase());
  const allText = [...tags, text].join(" ");

  if (allText.includes("breaking") || allText.includes("just in") || allText.includes("alert")) return "breaking";
  if (allText.includes("injur") || allText.includes("hurt") || allText.includes("out for") || allText.includes("questionable") || allText.includes("doubtful") || allText.includes("ir ") || allText.includes("hamstring") || allText.includes("knee") || allText.includes("ankle")) return "injury";
  if (allText.includes("trade") || allText.includes("deal") || allText.includes("acquir") || allText.includes("transfer")) return "trade";
  if (allText.includes("rumor") || allText.includes("report") || allText.includes("sources say") || allText.includes("could") || allText.includes("may") || allText.includes("might")) return "rumor";
  return "news";
}

function deduplicateNews(articles: any[]): any[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface NewsFeedProps {
  categories: string[];
  count: number;
  /** Sports the user follows. When provided, the feed only loads those sports. */
  sports?: SportId[];
}

export default function NewsFeed({ categories, count, sports }: NewsFeedProps) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeSport, setActiveSport] = useState<SportId | "all">("all");

  // If the user changes their favourite sports in Profile, drop a stale
  // sport-chip selection so the feed can't silently exclude everything.
  useEffect(() => {
    if (activeSport !== "all" && sports && !sports.includes(activeSport)) {
      setActiveSport("all");
    }
  }, [sports, activeSport]);

  const sportQuery = activeSport !== "all" ? activeSport : undefined;

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    // Include the active sport so different chips don't collide in cache.
    queryKey: ["/api/news", sportQuery ?? "all"],
    queryFn: async () => {
      const suffix = sportQuery ? `&sport=${encodeURIComponent(sportQuery)}` : "";
      return fetchJson<{ articles: any[] }>(`/api/news?limit=80${suffix}`);
    },
    refetchInterval: 5 * 60 * 1000, // 5 min
    placeholderData: (prev) => prev,
  });

  // Tick a bit slower than the scores widget — news refreshes every 5
  // minutes so per-second precision would just spin the CPU for nothing.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const id = setInterval(() => forceTick(t => t + 1), 15_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const updatedLabel = (() => {
    if (!dataUpdatedAt) return null;
    const seconds = Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000));
    if (seconds < 30) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  })();

  const processedArticles = useMemo(() => {
    if (!data?.articles) return [];
    const deduped = deduplicateNews(data.articles);
    return deduped.map((a: any) => ({
      ...a,
      detectedCategory: detectCategory(a),
    }));
  }, [data?.articles]);

  const filteredArticles = useMemo(() => {
    let articles = processedArticles;

    // Filter by enabled categories from preferences
    if (categories.length > 0) {
      articles = articles.filter(a => categories.includes(a.detectedCategory));
    }

    // Filter by active category tab
    if (activeCategory !== "all") {
      articles = articles.filter(a => a.detectedCategory === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.source?.toLowerCase().includes(q)
      );
    }

    return articles.slice(0, count);
  }, [processedArticles, activeCategory, searchQuery, categories, count]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    processedArticles.forEach(a => {
      counts[a.detectedCategory] = (counts[a.detectedCategory] || 0) + 1;
    });
    return counts;
  }, [processedArticles]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-foreground">News Feed</h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          {updatedLabel && (
            <span
              className="text-[11px] text-muted-foreground tabular-nums hidden sm:inline"
              title={`Last updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`}
            >
              {isFetching ? "Refreshing…" : `Updated ${updatedLabel}`}
            </span>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            aria-label={showSearch ? "Hide search" : "Search news"}
            aria-pressed={showSearch}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
              showSearch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh news"
            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <input
          type="text"
          placeholder="Search news..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input-field animate-fade-in"
          autoFocus
        />
      )}

      {/* Sport chips (only when the user has favourites) */}
      {sports && sports.length > 1 && (
        <div className="scroll-row">
          <button
            onClick={() => setActiveSport("all")}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              activeSport === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            All sports
          </button>
          {sports.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSport(s)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize",
                activeSport === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Category filters */}
      <div className="scroll-row">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            activeCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          All {processedArticles.length > 0 && `(${processedArticles.length})`}
        </button>
        {CATEGORIES.filter(c => categories.includes(c.key) || categories.length === 0).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key === activeCategory ? "all" : key)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              activeCategory === key
                ? cn("border", key === "breaking" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                   key === "injury" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                   key === "trade" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                   key === "rumor" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                   "bg-blue-500/20 text-blue-400 border-blue-500/30")
                : "bg-muted border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
            {categoryCounts[key] && (
              <span className="bg-muted-foreground/20 text-xs px-1.5 py-0.5 rounded-full num">
                {categoryCounts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* News grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 bg-muted rounded-lg w-20" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
              <div className="h-4 bg-muted rounded mb-2 w-full" />
              <div className="h-4 bg-muted rounded mb-2 w-5/6" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : isError && filteredArticles.length === 0 ? (
        <div className="glass-card p-8 text-center border-destructive/30">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Couldn&apos;t load news</p>
          <p className="text-xs text-muted-foreground mt-1">All upstream sources unavailable. Try again in a moment.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No articles match your search" : "No news available"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredArticles.map((article, i) => (
            <div key={article.id || i} className={cn("animate-fade-in", `stagger-${Math.min(i + 1, 4)}`)}>
              <NewsCard
                id={article.id}
                title={article.title}
                description={article.description || ""}
                content={article.content}
                category={article.detectedCategory}
                sport={article.sportId || "news"}
                source={article.source || "Unknown"}
                url={article.url}
                imageUrl={article.imageUrl}
                publishedAt={article.publishedAt || new Date().toISOString()}
                tags={article.tags}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
