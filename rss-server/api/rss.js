/**
 * RSS Feed Server for Sednium News
 * 
 * This server fetches news from NewsData.io API and serves it as an RSS 2.0 feed.
 * Compatible with Smart Launcher 6 and other RSS readers.
 * 
 * Deployment: Vercel, Render, Railway, Glitch, or any Node.js host
 */

const express = require('express');
const app = express();

// Configuration
const API_KEY = 'pub_26dbb5b22f5c46fa9730e78775239e27';
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'https://sednium-news.vercel.app';

/**
 * Escapes special XML characters to prevent parsing errors
 */
function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Converts ISO date to RFC 822 format required by RSS
 */
function toRfc822Date(isoDate) {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return new Date().toUTCString();
    return date.toUTCString();
}

/**
 * Fetches news from NewsData.io API
 */
async function fetchNews(category = 'top') {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=${category}&size=10`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

/**
 * Generates RSS 2.0 XML from news articles
 */
function generateRss(articles, category = 'Headlines') {
    const now = new Date().toUTCString();

    const items = articles.map(article => {
        const title = escapeXml(article.title || 'Untitled');
        const link = escapeXml(article.link || '');
        const description = escapeXml(article.description || article.content || 'No description available.');
        const pubDate = toRfc822Date(article.pubDate);
        const source = escapeXml(article.source_id || 'Unknown');
        const imageUrl = article.image_url || '';

        // Build media content for images (Smart Launcher 6 supports this)
        const mediaContent = imageUrl
            ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0"/>`
            : '';

        return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <source url="${link}">${source}</source>
      ${mediaContent}
      <guid isPermaLink="true">${link}</guid>
    </item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sednium News - ${category}</title>
    <link>${SITE_URL}</link>
    <description>Latest news from Sednium News</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/assets/logo.png</url>
      <title>Sednium News</title>
      <link>${SITE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;
}

// RSS endpoint - supports category query parameter
app.get('/rss', async (req, res) => {
    const category = req.query.category || 'top';
    const validCategories = ['top', 'technology', 'sports', 'business', 'entertainment', 'science', 'health'];
    const selectedCategory = validCategories.includes(category) ? category : 'top';

    const articles = await fetchNews(selectedCategory);

    // Deduplicate articles by title (case-insensitive)
    const seenTitles = new Set();
    const uniqueArticles = articles.filter(article => {
        const titleLower = (article.title || '').toLowerCase().trim();
        if (seenTitles.has(titleLower)) {
            return false;
        }
        seenTitles.add(titleLower);
        return true;
    });

    const rss = generateRss(uniqueArticles, selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1));

    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(rss);
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Sednium News RSS Server',
        endpoints: {
            rss: '/rss',
            rssWithCategory: '/rss?category=technology'
        }
    });
});

// Start server (for local development and non-serverless hosts)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`RSS Server running at http://localhost:${PORT}`);
        console.log(`RSS Feed: http://localhost:${PORT}/rss`);
    });
}

// Export for Vercel serverless
module.exports = app;
