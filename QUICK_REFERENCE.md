# Sports API Quick Reference

## 🚀 All APIs Integrated & Ready!

Your Bloomberg Terminal for Sports now aggregates data from:

✅ **ESPN** - News & Live Scores  
✅ **NewsAPI** - Aggregated news (key: `4cf6b8fb6349484382058ee647f31586`)  
✅ **Gnews.io** - Global news (key: `057a499ec2f0d1981d4f2e2d6118a17a`)  
✅ **Reddit** - Viral/buzz content (no key needed)  
✅ **TheSportsDB** - Events & scores (key: `123`)

## 📡 Key Endpoints

### News
```bash
# All news (aggregated from all sources)
GET /api/news
GET /api/news?sport=basketball
GET /api/news?limit=20

# By category
GET /api/news/category/trade
GET /api/news/category/injury?sport=basketball

# By source
GET /api/news/source/espn
GET /api/news/source/reddit
```

### Scores
```bash
# Live scores
GET /api/scores
GET /api/scores?sport=basketball

# Scoreboard
GET /api/scores/scoreboard
GET /api/scores/scoreboard?date=2025-01-17
```

## 🎯 Test It Now

```bash
# Start server
npm run dev

# Test endpoints
curl http://localhost:5000/api/news
curl http://localhost:5000/api/scores
curl "http://localhost:5000/api/news/source/reddit"
```

## 📚 Full Documentation

See `API_DOCUMENTATION.md` for complete details.

---

**All API keys are pre-configured. Just start the server and go! 🎉**

