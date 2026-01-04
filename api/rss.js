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

// Vercel Serverless Function Handler
export default async function handler(req, res) {
    // robust query param handling
    const queryCategory = (req.query.category || 'top').toLowerCase();
    const validCategories = ['top', 'technology', 'sports', 'business', 'entertainment', 'science', 'health', 'world', 'politics'];

    // Default to 'top' only if invalid category is requested
    const selectedCategory = validCategories.includes(queryCategory) ? queryCategory : 'top';

    const articles = await fetchNews(selectedCategory);

    // Capitalize for display
    const displayCategory = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
    const rss = generateRss(articles, displayCategory);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.status(200).send(rss);
}

function generateRss(articles, categoryName) {
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
        const description = escapeXml(article.description || article.content || 'No description available.');
        const title = article.title || 'Untitled';
        const description = article.description || article.content || 'No description available.';
        const pubDate = toRfc822Date(article.pubDate);
        const source = escapeXml(article.source_id || 'Sednium News');
        const imageUrl = article.image_url;

        // Redirect to our reader view
        const readerLink = `${SITE_URL}/?read=${encodeURIComponent(article.link)}`;

        // Smart Launcher prefers <media:content> or <enclosure>
        // We provide enclosure for max compatibility
        const mediaTag = imageUrl
            ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />`
            : '';

        return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${readerLink}</link>
      <description><![CDATA[${description}]]></description>
      <category>${categoryName}</category>
      <pubDate>${pubDate}</pubDate>
      <source url="${escapeXml(article.link)}">${source}</source>
      ${mediaTag}
      <guid isPermaLink="false">${article.link}</guid>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Sednium News - ${categoryName}</title>
    <link>${SITE_URL}</link>
    <description>Latest ${categoryName} news from Sednium.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Sednium RSS Generator</generator>
    <image>
        <url>${SITE_URL}/assets/logolight.png</url>
        <title>Sednium News</title>
        <link>${SITE_URL}</link>
    </image>
    <atom:link href="${SITE_URL}/rss?category=${categoryName.toLowerCase()}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
}
