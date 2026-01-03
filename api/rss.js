/**
 * RSS Feed API for Sednium News (Vercel Serverless Function)
 * 
 * Endpoint: /rss or /rss?category=technology
 */

// Configuration
const API_KEY = 'pub_26dbb5b22f5c46fa9730e78775239e27';
const SITE_URL = process.env.SITE_URL || 'https://sednium-news.vercel.app';

function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toRfc822Date(isoDate) {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return new Date().toUTCString();
    return date.toUTCString();
}

async function fetchNews(category = 'top') {
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&language=en&category=${category}&size=10`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

function generateRss(articles, category = 'Headlines') {
    const now = new Date().toUTCString();

    // Deduplicate by title
    const seenTitles = new Set();
    const uniqueArticles = articles.filter(article => {
        const titleLower = (article.title || '').toLowerCase().trim();
        if (seenTitles.has(titleLower)) return false;
        seenTitles.add(titleLower);
        return true;
    });

    const items = uniqueArticles.map(article => {
        const title = escapeXml(article.title || 'Untitled');
        const link = escapeXml(article.link || '');
        const description = escapeXml(article.description || 'No description');
        const pubDate = toRfc822Date(article.pubDate);
        const source = escapeXml(article.source_id || 'Unknown');
        const imageUrl = article.image_url || '';

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
    ${items}
  </channel>
</rss>`;
}

// Vercel Serverless Function Handler
export default async function handler(req, res) {
    const category = req.query.category || 'top';
    const validCategories = ['top', 'technology', 'sports', 'business', 'entertainment', 'science', 'health'];
    const selectedCategory = validCategories.includes(category) ? category : 'top';

    const articles = await fetchNews(selectedCategory);
    const rss = generateRss(articles, selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1));

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(rss);
}
