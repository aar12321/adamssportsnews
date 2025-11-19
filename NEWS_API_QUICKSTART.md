# Sports News API - Quick Start Guide

## 🚀 Getting Started

Your Sports News API is now ready! This is your Bloomberg Terminal for sports news.

## 📡 API Endpoints

### Main Endpoint
```
GET /api/news
```

**Get all latest sports news:**
```bash
curl http://localhost:5000/api/news
```

**Get basketball news only:**
```bash
curl "http://localhost:5000/api/news?sport=basketball"
```

**Get top 20 football articles:**
```bash
curl "http://localhost:5000/api/news?sport=football&limit=20"
```

### Category Endpoint
```
GET /api/news/category/:category
```

**Get trade-related news:**
```bash
curl "http://localhost:5000/api/news/category/trade"
```

**Get injury news for basketball:**
```bash
curl "http://localhost:5000/api/news/category/injury?sport=basketball"
```

## 🔑 Optional: Add NewsAPI Key

For real news from NewsAPI (free tier: 100 requests/day):

1. Get a free API key at: https://newsapi.org/
2. Create a `.env` file in the project root:
   ```env
   NEWS_API_KEY=your_key_here
   ```
3. Restart the server

**Note:** The API works without a key using mock data, but adding a key enables real news feeds!

## 📊 Response Format

```json
{
  "articles": [
    {
      "id": "news_1",
      "title": "Lakers Make Blockbuster Trade",
      "description": "The Los Angeles Lakers...",
      "url": "https://example.com/article",
      "source": "ESPN",
      "publishedAt": "2025-01-17T10:00:00.000Z",
      "sportId": "basketball",
      "category": "trade",
      "tags": ["trade", "breaking"]
    }
  ],
  "totalResults": 14,
  "sport": "basketball",
  "lastUpdated": "2025-01-17T12:00:00.000Z"
}
```

## 🎯 Supported Sports

- `basketball` - NBA, NCAA, and basketball news
- `football` - NFL, College Football news
- `soccer` - Premier League, La Liga, Champions League, etc.

## 🏷️ Common Categories/Tags

- `trade` - Trade news and rumors
- `injury` - Injury updates
- `contract` - Contract extensions and signings
- `draft` - Draft news
- `transfer` - Soccer transfer news
- `breaking` - Breaking news
- `playoff` - Playoff-related news

## ⚡ Caching

- News is cached for 5 minutes
- Use `?refresh=true` to force refresh
- Clear cache: `POST /api/news/clear-cache`

## 🔧 Example Usage in JavaScript

```javascript
// Fetch all news
const response = await fetch('http://localhost:5000/api/news');
const { articles } = await response.json();

// Fetch basketball news
const basketballNews = await fetch(
  'http://localhost:5000/api/news?sport=basketball&limit=20'
);
const { articles: bballArticles } = await basketballNews.json();

// Fetch trade news
const tradeNews = await fetch(
  'http://localhost:5000/api/news/category/trade?sport=basketball'
);
```

## 📚 Full Documentation

See `API_DOCUMENTATION.md` for complete API reference.

## 🎉 You're All Set!

Your sports news API is ready to use. Start the server and begin fetching the latest sports news!

```bash
npm run dev
```

Then visit: `http://localhost:5000/api/news`

