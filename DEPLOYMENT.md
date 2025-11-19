# Deployment Guide

## Quick Deploy Options

### Option 1: Vercel (Recommended for Frontend + API)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and configure environment variables in Vercel dashboard

### Option 2: Railway

1. Go to [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `adam-sports-project` repository
4. Railway will auto-detect and deploy
5. Add environment variables in Railway dashboard

### Option 3: Render

1. Go to [Render](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Build command: `npm install && npm run build`
5. Start command: `npm start`
6. Add environment variables

### Option 4: Heroku

1. Install Heroku CLI:
```bash
npm i -g heroku
```

2. Login and create app:
```bash
heroku login
heroku create adam-sports-project
```

3. Deploy:
```bash
git push heroku main
```

4. Add environment variables:
```bash
heroku config:set NEWS_API_KEY=your_key
heroku config:set GNEWS_API_KEY=your_key
heroku config:set API_FOOTBALL_KEY=your_key
```

## Environment Variables

Set these in your deployment platform:

```env
NEWS_API_KEY=4cf6b8fb6349484382058ee647f31586
GNEWS_API_KEY=057a499ec2f0d1981d4f2e2d6118a17a
API_FOOTBALL_KEY=e5680ca1abecaba3f812e224c23151d3
PORT=5000
NODE_ENV=production
```

## Production Checklist

- [ ] Set all environment variables
- [ ] Enable HTTPS
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure CORS if needed
- [ ] Set up rate limiting
- [ ] Enable logging
- [ ] Set up health checks
- [ ] Configure caching headers

## Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t adam-sports-project .
docker run -p 5000:5000 adam-sports-project
```

---

**Choose the deployment option that works best for you! 🚀**

