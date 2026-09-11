/**
 * RSS Feed Generator for Sednium News (Vercel Serverless Function)
 * Produces clean RSS 2.0 feeds compatible with Smart Launcher, Feedly, and RSS readers.
 */

import Parser from 'rss-parser';

const SITE_URL = process.env.SITE_URL || 'https://news.sednium.com';

const RSS_FEEDS = {
    top: [
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        'https://www.theguardian.com/world/rss'
    ],
    technology: [
        'https://techcrunch.com/feed/',
        'https://www.theverge.com/rss/index.xml',
        'https://arstechnica.com/feed/'
    ],
    world: [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        'https://www.aljazeera.com/xml/rss/all.xml'
    ],
    business: [
        'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml'
    ],
    politics: [
        'https://rss.politico.com/politics-news.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml'
    ],
    science: [
        'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml'
    ],
    health: [
        'https://www.medicalnewstoday.com/feed',
        'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml'
    ],
    entertainment: [
        'https://variety.com/feed/',
        'https://www.hollywoodreporter.com/feed/'
    ],
    sports: [
        'https://www.espn.com/espn/rss/news',
        'https://feeds.bbci.co.uk/sport/rss.xml'
    ],
    india: [
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        'https://www.thehindu.com/news/national/feeder/default.rss'
    ]
};

const parser = new Parser();

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

function extractImage(item) {
    if (item.enclosure?.url) return item.enclosure.url;
    if (item['media:content']?.$?.url) return item['media:content'].$.url;
    const match = (item.content || item['content:encoded'] || item.description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const queryCategory = (req.query.category || 'top').toLowerCase();
    const validCategories = Object.keys(RSS_FEEDS);
    const selectedCategory = validCategories.includes(queryCategory) ? queryCategory : 'top';
    const feedUrls = RSS_FEEDS[selectedCategory];

    try {
        const fetchPromises = feedUrls.map(async (url) => {
            try {
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'SedniumNewsBot/2.0' },
                    signal: AbortSignal.timeout(4000)
                });
                const xml = await response.text();
                return await parser.parseString(xml);
            } catch {
                return null;
            }
        });

        const feeds = (await Promise.all(fetchPromises)).filter(Boolean);
        const allArticles = [];

        for (const feed of feeds) {
            if (feed.items) {
                for (const item of feed.items.slice(0, 10)) {
                    allArticles.push({
                        title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
                        link: item.link || '',
                        description: (item.contentSnippet || item.content || item.description || '').replace(/<[^>]+>/g, '').trim(),
                        pubDate: item.pubDate || new Date().toISOString(),
                        source_id: feed.title?.replace(/^(RSS\s*Feed|Latest\s*News\s*-\s*)/i, '').trim() || 'Sednium News',
                        image_url: extractImage(item)
                    });
                }
            }
        }

        const seen = new Set();
        const uniqueArticles = allArticles.filter(art => {
            const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 35);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        const displayCategory = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
        const rssXml = generateRss(uniqueArticles.slice(0, 30), displayCategory, selectedCategory);

        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).send(rssXml);

    } catch (err) {
        console.error('RSS generation error:', err);
        return res.status(500).send('<?xml version="1.0"?><rss version="2.0"><channel><title>Error</title></channel></rss>');
    }
}

function generateRss(articles, categoryName, categorySlug) {
    const now = new Date().toUTCString();

    const items = articles.map(article => {
        const title = escapeXml(article.title || 'Untitled');
        const description = escapeXml(article.description || 'No summary provided.');
        const pubDate = toRfc822Date(article.pubDate);
        const source = escapeXml(article.source_id);
        const articleLink = escapeXml(article.link);
        const readerLink = `${SITE_URL}/?read=${encodeURIComponent(article.link)}`;

        const mediaTag = article.image_url
            ? `<enclosure url="${escapeXml(article.image_url)}" type="image/jpeg" length="0" />`
            : '';

        return `    <item>
      <title>${title}</title>
      <link>${readerLink}</link>
      <description>${description}</description>
      <category>${categoryName}</category>
      <pubDate>${pubDate}</pubDate>
      <source url="${articleLink}">${source}</source>
      ${mediaTag}
      <guid isPermaLink="false">${articleLink}</guid>
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom" 
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Sednium News - ${categoryName}</title>
    <link>${SITE_URL}</link>
    <description>Latest ${categoryName} news curated by Sednium News.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>30</ttl>
    <generator>Sednium News Engine 2.0</generator>
    <atom:link href="${SITE_URL}/rss/${categorySlug}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}
