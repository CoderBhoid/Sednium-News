# Sednium News RSS Server

A lightweight RSS feed server for the Sednium News app, compatible with **Smart Launcher 6** and other RSS readers.

## Quick Start (Local)

```bash
cd rss-server
npm install
npm start
```

Open `http://localhost:3000/rss` to see the RSS feed.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/rss` | Headlines RSS feed |
| `/rss?category=technology` | Technology news feed |
| `/rss?category=sports` | Sports news feed |

**Available categories:** `top`, `technology`, `sports`, `business`, `entertainment`, `science`, `health`

## Deploy to Vercel

```bash
cd rss-server
vercel
```

Your RSS feed will be at: `https://sednium-news.vercel.app/rss`

## Add to Smart Launcher 6

1. Long press home → Widgets
2. Add "RSS Widget" or "News Widget"
3. Enter URL: `https://sednium-news.vercel.app/rss`
