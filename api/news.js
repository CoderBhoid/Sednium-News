import Parser from 'rss-parser';

// RSS Feed sources by category
// Note: We use public RSS feeds.
const FEEDS = {
    top: [
        'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', // Google News Top
        'http://feeds.bbci.co.uk/news/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', // NYT Global
        'https://www.theguardian.com/world/rss', // The Guardian
        'http://rss.cnn.com/rss/edition.rss',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://feeds.reuters.com/reuters/topNews'
    ],
    technology: [
        'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
        'https://www.theverge.com/rss/index.xml',
        'https://techcrunch.com/feed/',
        'https://www.wired.com/feed/rss',
        'https://arstechnica.com/feed/',
        'https://www.engadget.com/rss.xml'
    ],
    sports: [
        'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
        'https://www.espn.com/espn/rss/news',
        'http://feeds.bbci.co.uk/sport/rss.xml',
        'https://www.si.com/.rss/full/'
    ],
    business: [
        'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'https://feeds.reuters.com/reuters/businessNews',
        'https://www.economist.com/business/rss.xml'
    ],
    entertainment: [
        'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
        'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
        'https://variety.com/feed/',
        'https://www.hollywoodreporter.com/feed/'
    ],
    science: [
        'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
        'https://www.nasa.gov/rss/dyn/breaking_news.rss', // NASA
        'https://www.sciencedaily.com/rss/top/science.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
        'https://www.space.com/feeds/all'
    ],
    health: [
        'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
        'https://www.medicalnewstoday.com/feed',
        'http://rss.cnn.com/rss/cnn_health.rss',
        'https://www.nih.gov/news-events/feed.xml'
    ],
    world: [
        'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
        'http://feeds.bbci.co.uk/news/world/rss.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://www.reuters.com/rssFeed/worldNews'
    ],
    politics: [
        'http://rss.cnn.com/rss/cnn_allpolitics.rss',
        'https://feeds.reuters.com/reuters/politicsNews',
        'https://www.politico.com/rss/politics08.xml'
    ]
};

// Fallback image if none found (used as last resort)
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';

export default async function handler(req, res) {
    const parser = new Parser();
    const category = (req.query.category || 'top').toLowerCase();

    // Select feeds based on category, fallback to 'top'
    const feedUrls = FEEDS[category] || FEEDS['top'];

    try {
        // Fetch all feeds in parallel
        const feedPromises = feedUrls.map(async (url) => {
            try {
                const feed = await parser.parseURL(url);
                return feed.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    description: item.contentSnippet || item.content || '',
                    pubDate: item.pubDate,
                    source_id: feed.title || 'Unknown Source', // Map feed title to source_id
                    // Try to find an image in enclosures or content
                    image_url: extractImage(item) || null,
                    creator: item.creator ? [item.creator] : null
                }));
            } catch (err) {
                console.error(`Failed to parse feed ${url}:`, err.message);
                return []; // Return empty array on failure so one bad feed doesn't break all
            }
        });

        const results = await Promise.all(feedPromises);

        // Flatten array of arrays
        const allArticles = results.flat();

        // Sort by date (newest first)
        allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // Format to match old NewsData.io structure expected by frontend
        const responseData = {
            status: 'success',
            totalResults: allArticles.length,
            results: allArticles.slice(0, 40) // Limit to 40 items for performance
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Cache for 5 mins
        res.status(200).json(responseData);

    } catch (error) {
        console.error('Aggregator error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch news' });
    }
}

/**
 * Helper to extract image URL from RSS item
 */
function extractImage(item) {
    // Check for enclosure (standard RSS media)
    if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image')) {
        return item.enclosure.url;
    }

    // Check for media:content (Yahoo RSS / Common extension)
    if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
        return item['media:content'].$.url;
    }

    // Try to regex parse <img src="..."> from content
    const imgRegex = /<img[^>]+src="?([^"\s]+)"?\s*/i;
    const content = item.content || item['content:encoded'] || item.description || '';
    const match = content.match(imgRegex);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}
