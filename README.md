# 🏀⚽🏈 Adam Sports Project

**The Bloomberg Terminal for Sports News & Scores**

A comprehensive sports news and live scores aggregation platform that combines data from multiple APIs with intelligent fallback systems for maximum reliability.

## 🌟 Features

- **Multi-Source News Aggregation** - News from 6+ sources automatically deduplicated
- **Live Scores** - Real-time scores from ESPN, API-Football, and TheSportsDB
- **Intelligent Fallback System** - Automatic API failover with health monitoring
- **Rate Limit Management** - Smart caching and rate limit tracking
- **Bloomberg Terminal Style** - Information-dense, real-time updates
- **RESTful API** - Clean, well-documented endpoints

## 📡 Integrated APIs

### News Sources (Layered Fallback System)

1. **ESPN** (Layer 1 - Highest Priority)
   - No API key required
   - Most reliable source
   - NBA, NFL, EPL news

2. **NewsAPI** (Layer 2)
   - Key: `4cf6b8fb6349484382058ee647f31586`
   - Aggregated news from thousands of sources
   - 100 requests/day (free tier)

3. **Gnews.io** (Layer 2)
   - Key: `057a499ec2f0d1981d4f2e2d6118a17a`
   - Global news aggregation

4. **Reddit** (Layer 3)
   - No key required (uses `.json` trick)
   - Viral/buzz content from r/nba, r/nfl, r/soccer
   - ~100 queries/minute

5. **API-Football** (Layer 4)
   - Key: `e5680ca1abecaba3f812e224c23151d3`
   - Soccer/football specific data
   - Live fixtures and scores

6. **TheSportsDB** (Layer 5)
   - Free key: `123`
   - Events and historical data
   - 30 requests/minute (free tier)

7. **Mock Data** (Layer 6 - Final Fallback)
   - Always available
   - Ensures service never fails completely

### Scores Sources

- **ESPN** - Live scoreboards
- **API-Football** - Soccer/football scores
- **TheSportsDB** - Event scores

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/adam-sports-project.git
cd adam-sports-project

# Install dependencies
npm install

# Start development server
npm run dev
```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### News Endpoints

```bash
# Get all news (aggregated from all sources)
GET /api/news

# Get news by sport
GET /api/news?sport=basketball

# Get news by category
GET /api/news/category/trade

# Get news by source
GET /api/news/source/espn
```

### Scores Endpoints

```bash
# Get live scores
GET /api/scores

# Get scoreboard
GET /api/scores/scoreboard?date=2025-01-17
```

### Status & Monitoring

```bash
# Get API health status
GET /api/status

# Reset API health (manual recovery)
POST /api/status/reset/:apiName
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete documentation.

## 🛡️ Fallback System

The system implements a **6-layer fallback architecture**:

1. **Health Monitoring** - Tracks API health and consecutive failures
2. **Rate Limit Tracking** - Monitors rate limits and automatically avoids exhausted APIs
3. **Priority-Based Fallback** - Tries APIs in priority order
4. **Parallel Fetching** - Fetches from multiple sources simultaneously when available
5. **Automatic Recovery** - Unhealthy APIs are retried after cooldown period
6. **Final Fallback** - Mock data ensures service never fails completely

### How It Works

```
Request → Check Cache → Try Layer 1 (ESPN)
                    ↓ (if fails)
                  Try Layer 2 (NewsAPI, Gnews)
                    ↓ (if fails)
                  Try Layer 3 (Reddit)
                    ↓ (if fails)
                  Try Layer 4 (API-Football)
                    ↓ (if fails)
                  Try Layer 5 (TheSportsDB)
                    ↓ (if all fail)
                  Return Mock Data
```

## 🏗️ Project Structure

```
adam-sports-project/
├── server/
│   ├── index.ts           # Express server setup
│   ├── routes.ts          # API routes
│   ├── newsService.ts     # News aggregation service
│   ├── scoresService.ts   # Scores service
│   └── apiManager.ts      # API health & fallback manager
├── client/
│   └── src/               # React frontend
├── shared/
│   └── schema.ts          # Shared TypeScript schemas
├── API_DOCUMENTATION.md   # Complete API docs
└── README.md              # This file
```

## 🔧 Configuration

API keys are pre-configured in the code. For production, use environment variables:

```env
NEWS_API_KEY=your_key_here
GNEWS_API_KEY=your_key_here
API_FOOTBALL_KEY=your_key_here
PORT=5000
```

## 📊 Rate Limits

| API | Free Tier Limit | Notes |
|-----|----------------|-------|
| ESPN | No limit | Be respectful |
| NewsAPI | 100/day | Free tier |
| Gnews.io | Varies | Check your plan |
| Reddit | ~100/min | No key needed |
| API-Football | Varies | Check dashboard |
| TheSportsDB | 30/min | Free tier |

## 🧪 Testing

```bash
# Test news endpoint
curl http://localhost:5000/api/news

# Test scores endpoint
curl http://localhost:5000/api/scores

# Check API status
curl http://localhost:5000/api/status
```

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run check    # Type check
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- ESPN for public API access
- NewsAPI, Gnews.io, API-Football, TheSportsDB for data
- Reddit for community content

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with ❤️ for sports fans who want the latest news and scores in one place.**

