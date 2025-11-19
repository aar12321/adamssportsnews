import type { SportId } from "@shared/schema";
import { apiManager } from "./apiManager";

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  source: string;
  author?: string;
  publishedAt: string;
  sportId: SportId;
  category?: string;
  tags?: string[];
}

/**
 * Enhanced News Service with Layered Fallback System
 * Implements priority-based API fallback for maximum resilience
 * 
 * API Priority Layers (tries in order, falls back if unavailable):
 * Layer 1: ESPN (no key, reliable)
 * Layer 2: NewsAPI, Gnews.io (paid keys)
 * Layer 3: Reddit (no key, rate limited)
 * Layer 4: API-Football (soccer/football specific)
 * Layer 5: TheSportsDB (free tier, limited)
 * Layer 6: Mock data (always available)
 */
export class NewsService {
  // API Keys
  private newsApiKey: string;
  private gnewsApiKey: string;
  private apiFootballKey: string;
  private theSportsDbKey: string = "123"; // Free key
  
  // API Priority Order (tried sequentially with fallback)
  private readonly NEWS_API_PRIORITY = [
    "espn",        // Layer 1: Most reliable, no key needed
    "newsapi",     // Layer 2: Paid, good coverage
    "gnews",       // Layer 2: Paid, global news
    "reddit",      // Layer 3: Free, viral content
    "apifootball", // Layer 4: Soccer/football specific
    "sportsdb",    // Layer 5: Free tier, limited
  ];
  
  private cache: Map<string, { data: NewsArticle[]; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // @ts-ignore - process.env is available in Node.js runtime
    const env = process.env || {};
    this.newsApiKey = env.NEWS_API_KEY || "4cf6b8fb6349484382058ee647f31586";
    this.gnewsApiKey = env.GNEWS_API_KEY || "057a499ec2f0d1981d4f2e2d6118a17a";
    this.apiFootballKey = env.API_FOOTBALL_KEY || "e5680ca1abecaba3f812e224c23151d3";
    
    this.cache = new Map();
    
    // Register all APIs with the manager
    this.NEWS_API_PRIORITY.forEach(api => apiManager.registerApi(api));
  }

  /**
   * Fetch latest sports news with intelligent fallback system
   * Tries APIs in priority order, falls back automatically if one fails
   */
  async getLatestNews(
    sportId?: SportId,
    limit: number = 50,
    useCache: boolean = true
  ): Promise<NewsArticle[]> {
    const cacheKey = `news_${sportId || "all"}_${limit}`;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    try {
      // Get available APIs in priority order
      const availableApis = apiManager.getAvailableApis(this.NEWS_API_PRIORITY);
      
      if (availableApis.length === 0) {
        console.warn("All APIs unavailable, using mock data");
        return this.getMockNews(sportId, limit);
      }

      // Try to fetch from available APIs in parallel (but respect priority)
      const results = await Promise.allSettled(
        availableApis.map(api => this.fetchFromApi(api, sportId, limit))
      );

      // Aggregate all successful results
      const allArticles: NewsArticle[] = [];
      
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.length > 0) {
          allArticles.push(...result.value);
          // Record success
          apiManager.recordSuccess(availableApis[index]);
        } else if (result.status === "rejected") {
          // Record failure
          apiManager.recordFailure(
            availableApis[index],
            result.reason?.message || "Unknown error"
          );
        }
      });

      // If we got some results, use them
      if (allArticles.length > 0) {
        const uniqueArticles = this.deduplicateArticles(allArticles);
        const sorted = uniqueArticles.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        const result = sorted.slice(0, limit);
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        return result;
      }

      // If all APIs failed, fall back to mock data
      console.warn("All API calls failed, using mock data");
      return this.getMockNews(sportId, limit);
    } catch (error) {
      console.error("Error fetching news:", error);
      return this.getMockNews(sportId, limit);
    }
  }

  /**
   * Fetch from a specific API by name
   */
  private async fetchFromApi(
    apiName: string,
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    switch (apiName) {
      case "espn":
        return this.fetchFromESPN(sportId, limit);
      case "newsapi":
        return this.fetchFromNewsAPI(sportId, limit);
      case "gnews":
        return this.fetchFromGnews(sportId, limit);
      case "reddit":
        return this.fetchFromReddit(sportId, limit);
      case "apifootball":
        return this.fetchFromApiFootball(sportId, limit);
      case "sportsdb":
        return this.fetchFromTheSportsDB(sportId, limit);
      default:
        return [];
    }
  }

  /**
   * Fetch news from ESPN API (Layer 1 - Highest Priority)
   */
  private async fetchFromESPN(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    const espnEndpoints: Record<SportId, string> = {
      basketball: "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/news",
      football: "http://site.api.espn.com/apis/site/v2/sports/football/nfl/news",
      soccer: "http://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news",
    };

    try {
      const endpoints = sportId
        ? [espnEndpoints[sportId]]
        : Object.values(espnEndpoints);

      const allArticles: NewsArticle[] = [];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limited");
          }
          continue;
        }

        const data = await response.json();
        if (data.articles && Array.isArray(data.articles)) {
          const articles = data.articles.slice(0, limit).map((article: any, index: number) => ({
            id: `espn_${Date.now()}_${index}`,
            title: article.headline || article.title || "",
            description: article.description || "",
            content: article.content,
            url: article.links?.web?.href || article.url || "",
            imageUrl: article.images?.[0]?.url || article.image,
            source: "ESPN",
            author: article.byline,
            publishedAt: article.published || new Date().toISOString(),
            sportId: this.detectSport(article.headline || article.title || ""),
            category: this.extractCategory(article.headline || article.title || ""),
            tags: this.extractTags(article.headline || "", article.description || ""),
          }));
          allArticles.push(...articles);
        }
      }

      return allArticles;
    } catch (error: any) {
      throw new Error(`ESPN: ${error.message}`);
    }
  }

  /**
   * Fetch news from NewsAPI (Layer 2)
   */
  private async fetchFromNewsAPI(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      throw new Error("NewsAPI key not configured");
    }

    const sportKeywords: Record<SportId, string> = {
      basketball: "basketball OR NBA",
      football: "NFL OR American football",
      soccer: "soccer OR Premier League OR La Liga OR Champions League",
    };

    const query = sportId
      ? sportKeywords[sportId]
      : "basketball OR NBA OR NFL OR football OR soccer OR Premier League";

    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&sortBy=publishedAt&pageSize=${limit}&language=en&apiKey=${this.newsApiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited");
        }
        throw new Error(`NewsAPI error: ${response.status}`);
      }

      const data = await response.json();

      // Extract rate limit info from headers if available
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");

      if (data.status === "ok" && data.articles) {
        const articles = data.articles
          .filter((article: any) => article.title && article.url)
          .map((article: any, index: number) => ({
            id: `newsapi_${Date.now()}_${index}`,
            title: article.title || "",
            description: article.description || "",
            content: article.content,
            url: article.url,
            imageUrl: article.urlToImage,
            source: article.source?.name || "NewsAPI",
            author: article.author,
            publishedAt: article.publishedAt || new Date().toISOString(),
            sportId: this.detectSport(article.title + " " + article.description),
            category: this.extractCategory(article.title),
            tags: this.extractTags(article.title, article.description || ""),
          }));
        
        // Record success with rate limit info
        apiManager.recordSuccess(
          "newsapi",
          rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
          rateLimitReset ? parseInt(rateLimitReset) * 1000 : undefined
        );
        
        return articles;
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`NewsAPI: ${error.message}`);
    }
  }

  /**
   * Fetch news from Gnews.io (Layer 2)
   */
  private async fetchFromGnews(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    if (!this.gnewsApiKey) {
      throw new Error("Gnews key not configured");
    }

    const sportQueries: Record<SportId, string> = {
      basketball: "NBA basketball",
      football: "NFL football",
      soccer: "soccer Premier League",
    };

    const query = sportId ? sportQueries[sportId] : "sports";

    try {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
        query
      )}&lang=en&max=${limit}&apikey=${this.gnewsApiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited");
        }
        throw new Error(`Gnews error: ${response.status}`);
      }

      const data = await response.json();

      if (data.articles && Array.isArray(data.articles)) {
        return data.articles.map((article: any, index: number) => ({
          id: `gnews_${Date.now()}_${index}`,
          title: article.title || "",
          description: article.description || "",
          content: article.content,
          url: article.url,
          imageUrl: article.image,
          source: article.source?.name || "Gnews",
          author: article.source?.name,
          publishedAt: article.publishedAt || new Date().toISOString(),
          sportId: this.detectSport(article.title + " " + article.description),
          category: this.extractCategory(article.title),
          tags: this.extractTags(article.title, article.description || ""),
        }));
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`Gnews: ${error.message}`);
    }
  }

  /**
   * Fetch viral/buzz content from Reddit (Layer 3)
   */
  private async fetchFromReddit(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    const subreddits: Record<SportId, string> = {
      basketball: "nba",
      football: "nfl",
      soccer: "soccer",
    };

    try {
      const subreddit = sportId
        ? subreddits[sportId]
        : "sports";

      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${Math.min(limit, 25)}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "AdamSportsProject/1.0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited");
        }
        return [];
      }

      const data = await response.json();

      if (data.data && data.data.children) {
        return data.data.children
          .filter((post: any) => post.data && !post.data.stickied)
          .map((post: any, index: number) => ({
            id: `reddit_${post.data.id}`,
            title: post.data.title || "",
            description: post.data.selftext?.substring(0, 300) || "",
            content: post.data.selftext,
            url: `https://reddit.com${post.data.permalink}`,
            imageUrl: post.data.thumbnail && post.data.thumbnail.startsWith("http") ? post.data.thumbnail : undefined,
            source: `r/${subreddit}`,
            author: post.data.author,
            publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
            sportId: this.detectSport(post.data.title || ""),
            category: "viral",
            tags: ["reddit", "community"].concat(
              this.extractTags(post.data.title, post.data.selftext || "")
            ),
          }));
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`Reddit: ${error.message}`);
    }
  }

  /**
   * Fetch news from API-Football (Layer 4 - Soccer/Football specific)
   */
  private async fetchFromApiFootball(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    // API-Football is primarily for soccer/football
    if (sportId && sportId !== "soccer" && sportId !== "football") {
      return [];
    }

    if (!this.apiFootballKey) {
      throw new Error("API-Football key not configured");
    }

    try {
      // API-Football doesn't have a direct news endpoint, but we can get fixtures/events
      // which can be treated as news-like content
      const url = "https://v3.football.api-sports.io/fixtures?live=all";
      
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": this.apiFootballKey,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited");
        }
        throw new Error(`API-Football error: ${response.status}`);
      }

      const data = await response.json();

      if (data.response && Array.isArray(data.response)) {
        return data.response.slice(0, limit).map((fixture: any, index: number) => ({
          id: `apifootball_${fixture.fixture?.id || Date.now()}_${index}`,
          title: `${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name}`,
          description: `Live match: ${fixture.league?.name} - ${fixture.fixture?.status?.long || "Scheduled"}`,
          url: `https://www.api-football.com/fixtures/${fixture.fixture?.id}`,
          imageUrl: fixture.league?.logo,
          source: "API-Football",
          publishedAt: fixture.fixture?.date || new Date().toISOString(),
          sportId: "soccer",
          category: "live",
          tags: ["live", "fixture", "match"],
        }));
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`API-Football: ${error.message}`);
    }
  }

  /**
   * Fetch news from TheSportsDB (Layer 5)
   */
  private async fetchFromTheSportsDB(
    sportId?: SportId,
    limit: number = 50
  ): Promise<NewsArticle[]> {
    try {
      const leagues: Record<SportId, string> = {
        basketball: "4387", // NBA
        football: "4391", // NFL
        soccer: "4328", // Premier League
      };

      if (!sportId) return [];

      const leagueId = leagues[sportId];
      if (!leagueId) return [];

      const url = `https://www.thesportsdb.com/api/v1/json/${this.theSportsDbKey}/eventspastleague.php?id=${leagueId}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited");
        }
        return [];
      }

      const data = await response.json();

      if (data.events && Array.isArray(data.events)) {
        return data.events.slice(0, limit).map((event: any, index: number) => ({
          id: `sportsdb_${event.idEvent || Date.now()}_${index}`,
          title: `${event.strHomeTeam} vs ${event.strAwayTeam} - ${event.strEvent || ""}`,
          description: event.strDescriptionEN || event.strEvent || "",
          url: event.strVideo || "",
          imageUrl: event.strThumb,
          source: "TheSportsDB",
          publishedAt: event.dateEvent ? `${event.dateEvent}T${event.strTime || "00:00:00"}` : new Date().toISOString(),
          sportId: sportId,
          category: "event",
          tags: ["event", "score"],
        }));
      }
      
      return [];
    } catch (error: any) {
      throw new Error(`TheSportsDB: ${error.message}`);
    }
  }

  /**
   * Remove duplicate articles by URL
   */
  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter((article) => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    });
  }

  /**
   * Detect sport from text content
   */
  private detectSport(text: string): SportId {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("nba") ||
      lowerText.includes("basketball") ||
      lowerText.includes("lakers") ||
      lowerText.includes("warriors") ||
      lowerText.includes("celtics")
    ) {
      return "basketball";
    }

    if (
      lowerText.includes("nfl") ||
      (lowerText.includes("football") && !lowerText.includes("soccer")) ||
      lowerText.includes("chiefs") ||
      lowerText.includes("bills") ||
      lowerText.includes("packers")
    ) {
      return "football";
    }

    if (
      lowerText.includes("soccer") ||
      lowerText.includes("premier league") ||
      lowerText.includes("la liga") ||
      lowerText.includes("champions league") ||
      lowerText.includes("manchester") ||
      lowerText.includes("liverpool") ||
      lowerText.includes("barcelona") ||
      lowerText.includes("real madrid")
    ) {
      return "soccer";
    }

    return "basketball"; // Default
  }

  /**
   * Extract category from title
   */
  private extractCategory(title: string): string {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("trade")) return "trade";
    if (lowerTitle.includes("injury")) return "injury";
    if (lowerTitle.includes("draft")) return "draft";
    if (lowerTitle.includes("contract") || lowerTitle.includes("sign")) return "contract";
    if (lowerTitle.includes("transfer")) return "transfer";
    if (lowerTitle.includes("breaking")) return "breaking";
    return "general";
  }

  /**
   * Extract tags from article content
   */
  private extractTags(title: string, description: string): string[] {
    const text = (title + " " + description).toLowerCase();
    const tags: string[] = [];

    const commonTags = [
      "trade",
      "injury",
      "draft",
      "playoff",
      "championship",
      "transfer",
      "contract",
      "signing",
      "rumor",
      "breaking",
    ];

    commonTags.forEach((tag) => {
      if (text.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  /**
   * Get mock news data (Layer 6 - Final Fallback)
   */
  private getMockNews(sportId?: SportId, limit: number = 50): NewsArticle[] {
    const now = new Date();
    const hoursAgo = (hours: number) =>
      new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

    const allNews: NewsArticle[] = [
      {
        id: "news_1",
        title: "Lakers Make Blockbuster Trade Ahead of Deadline",
        description: "The Los Angeles Lakers have completed a major trade...",
        url: "https://example.com/lakers-trade",
        source: "ESPN",
        publishedAt: hoursAgo(1),
        sportId: "basketball",
        category: "trade",
        tags: ["trade", "breaking"],
      },
      {
        id: "news_2",
        title: "Chiefs Quarterback Sets New Passing Record",
        description: "In a historic performance...",
        url: "https://example.com/chiefs-record",
        source: "NFL Network",
        publishedAt: hoursAgo(2),
        sportId: "football",
        category: "record",
        tags: ["record", "playoff"],
      },
      {
        id: "news_3",
        title: "Manchester City Wins Thrilling Derby Match",
        description: "In a highly anticipated derby...",
        url: "https://example.com/city-derby",
        source: "BBC Sport",
        publishedAt: hoursAgo(1),
        sportId: "soccer",
        category: "game",
        tags: ["derby", "victory"],
      },
    ];

    const filtered = sportId
      ? allNews.filter((news) => news.sportId === sportId)
      : allNews;

    return filtered.slice(0, limit);
  }

  /**
   * Clear the news cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const newsService = new NewsService();
