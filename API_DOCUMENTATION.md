# Sports News & Scores API Documentation

## Overview

Your **Bloomberg Terminal for Sports** API aggregates real-time sports news and live scores from multiple sources:
- **ESPN** (News & Scores)
- **NewsAPI** (Aggregated news)
- **Gnews.io** (Global news)
- **Reddit** (Viral/buzz content)
- **TheSportsDB** (Events & scores)

## Base URL

```
http://localhost:5000/api
```

## 🔥 News Endpoints

### 1. Get Latest News (All Sources Aggregated)

Retrieve the latest sports news from ALL integrated sources, automatically deduplicated and sorted.

**Endpoint:** `GET /api/news`

**Query Parameters:**
- `sport` (optional): Filter by sport. Valid values: `basketball`, `football`, `soccer`
- `limit` (optional): Maximum number of articles (default: 50, max: 100)
- `refresh` (optional): Force refresh cache. Set to `true` to bypass cache

**Example Requests:**
```bash
# Get all latest news from all sources
GET /api/news

# Get basketball news only
GET /api/news?sport=basketball

# Get top 20 football news articles
GET /api/news?sport=football&limit=20

# Force refresh (bypass cache)
GET /api/news?refresh=true
```

**Response:**
```json
{
  "articles": [
    {
      "id": "espn_1234567890_0",
      "title": "Lakers Make Blockbuster Trade",
      "description": "The Los Angeles Lakers have completed...",
      "content": "Full article content...",
      "url": "https://espn.com/article",
      "imageUrl": "https://espn.com/image.jpg",
      "source": "ESPN",
      "author": "John Doe",
      "publishedAt": "2025-01-17T10:00:00.000Z",
      "sportId": "basketball",
      "category": "trade",
      "tags": ["trade", "breaking"]
    }
  ],
  "totalResults": 45,
  "sport": "basketball",
  "lastUpdated": "2025-01-17T12:00:00.000Z"
}
```

### 2. Get News by Category

Retrieve news articles filtered by category or tag.

**Endpoint:** `GET /api/news/category/:category`

**Path Parameters:**
- `category`: Category to filter by (e.g., `trade`, `injury`, `contract`, `draft`, `transfer`, `viral`)

**Query Parameters:**
- `sport` (optional): Filter by sport
- `limit` (optional): Maximum articles (default: 50)

**Example Requests:**
```bash
# Get all trade-related news
GET /api/news/category/trade

# Get injury news for basketball
GET /api/news/category/injury?sport=basketball

# Get viral Reddit content
GET /api/news/category/viral
```

### 3. Get News by Source

Get news from a specific source only.

**Endpoint:** `GET /api/news/source/:source`

**Path Parameters:**
- `source`: Source name (e.g., `espn`, `reddit`, `gnews`, `newsapi`)

**Query Parameters:**
- `sport` (optional): Filter by sport
- `limit` (optional): Maximum articles (default: 50)

**Example Requests:**
```bash
# Get ESPN news only
GET /api/news/source/espn

# Get Reddit viral content for basketball
GET /api/news/source/reddit?sport=basketball
```

### 4. News Cache Management

**Clear Cache:**
```bash
POST /api/news/clear-cache
```

**Get Cache Stats:**
```bash
GET /api/news/cache-stats
```

## ⚽ Scores Endpoints

### 1. Get Live Scores

Retrieve live scores from ESPN and TheSportsDB.

**Endpoint:** `GET /api/scores`

**Query Parameters:**
- `sport` (optional): Filter by sport (`basketball`, `football`, `soccer`)
- `refresh` (optional): Force refresh cache (`true`)

**Example Requests:**
```bash
# Get all live scores
GET /api/scores

# Get basketball scores only
GET /api/scores?sport=basketball

# Force refresh
GET /api/scores?refresh=true
```

**Response:**
```json
{
  "scores": [
    {
      "id": "espn_12345",
      "sportId": "basketball",
      "league": "NBA",
      "homeTeam": "Los Angeles Lakers",
      "awayTeam": "Golden State Warriors",
      "homeScore": 112,
      "awayScore": 118,
      "status": "finished",
      "startTime": "2025-01-17T19:00:00.000Z",
      "period": "Final",
      "venue": "Crypto.com Arena",
      "source": "ESPN"
    }
  ],
  "totalResults": 12,
  "sport": "basketball",
  "lastUpdated": "2025-01-17T12:00:00.000Z"
}
```

### 2. Get Scoreboard

Get scoreboard for a specific date.

**Endpoint:** `GET /api/scores/scoreboard`

**Query Parameters:**
- `sport` (optional): Filter by sport
- `date` (optional): Date in YYYY-MM-DD format (default: today)

**Example Requests:**
```bash
# Get today's scoreboard
GET /api/scores/scoreboard

# Get basketball scoreboard for specific date
GET /api/scores/scoreboard?sport=basketball&date=2025-01-17
```

**Response:**
```json
{
  "date": "2025-01-17",
  "scores": [
    {
      "id": "espn_12345",
      "sportId": "basketball",
      "league": "NBA",
      "homeTeam": "Lakers",
      "awayTeam": "Warriors",
      "homeScore": 112,
      "awayScore": 118,
      "status": "finished",
      "startTime": "2025-01-17T19:00:00.000Z",
      "source": "ESPN"
    }
  ]
}
```

### 3. Clear Scores Cache

```bash
POST /api/scores/clear-cache
```

## 📊 Data Sources

### ESPN API
- **News:** `http://site.api.espn.com/apis/site/v2/sports/[SPORT]/[LEAGUE]/news`
- **Scores:** `http://site.api.espn.com/apis/site/v2/sports/[SPORT]/[LEAGUE]/scoreboard`
- **Sports:** Basketball (NBA), Football (NFL), Soccer (EPL)

### NewsAPI
- **Key:** `4cf6b8fb6349484382058ee647f31586` (configured)
- **Rate Limit:** 100 requests/day (free tier)

### Gnews.io
- **Key:** `057a499ec2f0d1981d4f2e2d6118a17a` (configured)
- **Features:** Global news aggregation

### Reddit
- **No Key Required:** Uses `.json` trick
- **Subreddits:** r/nba, r/nfl, r/soccer
- **Rate Limit:** ~100 queries/minute

### TheSportsDB
- **Key:** `123` (free tier)
- **Features:** Events, scores, team data
- **Rate Limit:** 30 requests/minute (free)

## 🎯 Supported Sports

- `basketball` - NBA, basketball news
- `football` - NFL, American football
- `soccer` - Premier League, La Liga, Champions League

## 🏷️ News Categories

- `trade` - Trade news and rumors
- `injury` - Injury updates
- `contract` - Contract extensions and signings
- `draft` - Draft news
- `transfer` - Soccer transfer news
- `breaking` - Breaking news
- `viral` - Viral/trending content (Reddit)
- `event` - Event-related news

## ⚡ Caching

- **News Cache:** 5 minutes TTL
- **Scores Cache:** 1 minute TTL (live data)
- Use `?refresh=true` to bypass cache

## 📝 News Article Schema

```typescript
{
  id: string;              // Unique article identifier
  title: string;           // Article headline
  description: string;     // Article summary
  content?: string;        // Full article content
  url: string;            // Link to original article
  imageUrl?: string;      // Article image URL
  source: string;         // News source (ESPN, Reddit, etc.)
  author?: string;        // Article author
  publishedAt: string;    // ISO 8601 timestamp
  sportId: "basketball" | "football" | "soccer";
  category?: string;      // Article category
  tags?: string[];        // Relevant tags
}
```

## 📝 Score Schema

```typescript
{
  id: string;
  sportId: "basketball" | "football" | "soccer";
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  startTime: string;      // ISO 8601 timestamp
  period?: string;        // Game period/quarter
  venue?: string;        // Venue name
  source: string;        // Data source
}
```

## 🔧 Usage Examples

### JavaScript/TypeScript

```typescript
// Get all news from all sources
const response = await fetch('http://localhost:5000/api/news');
const { articles } = await response.json();

// Get live scores
const scores = await fetch('http://localhost:5000/api/scores?sport=basketball');
const { scores: liveScores } = await scores.json();

// Get Reddit viral content
const reddit = await fetch('http://localhost:5000/api/news/source/reddit?sport=basketball');
```

### cURL

```bash
# Get all news
curl http://localhost:5000/api/news

# Get basketball scores
curl "http://localhost:5000/api/scores?sport=basketball"

# Get trade news
curl "http://localhost:5000/api/news/category/trade?sport=basketball"
```

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Test the API:**
   ```bash
   curl http://localhost:5000/api/news
   curl http://localhost:5000/api/scores
   ```

3. **All API keys are pre-configured!** No setup needed.

## ⚠️ Rate Limits

- **NewsAPI:** 100 requests/day
- **Gnews.io:** Varies by plan
- **Reddit:** ~100 queries/minute
- **TheSportsDB:** 30 requests/minute (free)
- **ESPN:** No official limit (be respectful)

## 🎉 Features

✅ **Multi-source aggregation** - News from 5+ sources  
✅ **Automatic deduplication** - No duplicate articles  
✅ **Smart caching** - Fast responses, reduced API calls  
✅ **Live scores** - Real-time game data  
✅ **Source filtering** - Get news from specific sources  
✅ **Category filtering** - Filter by news type  
✅ **Sport filtering** - Basketball, Football, Soccer  
✅ **Bloomberg Terminal style** - Information-dense, real-time updates

---

**Your Bloomberg Terminal for Sports is ready! 🏀🏈⚽**
