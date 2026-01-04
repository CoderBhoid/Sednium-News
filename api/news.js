import Parser from 'rss-parser';

// RSS Feed sources by category
// Note: We use public RSS feeds.
// RSS Feed sources by category
// Note: We use public RSS feeds.
const RSS_FEEDS = {
    top: [
        'http://feeds.bbci.co.uk/news/rss.xml',
        'https://rss.cnn.com/rss/edition.rss',
        'https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best',
        'https://www.theguardian.com/world/rss',
        'https://feeds.washingtonpost.com/rss/world',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html'
    ],
    technology: [
        'https://feeds.feedburner.com/TechCrunch',
        'https://www.theverge.com/rss/index.xml',
        'https://www.wired.com/feed/rss',
        'https://arstechnica.com/feed/',
        'https://www.engadget.com/rss.xml'
    ],
    sports: [
        'https://www.espn.com/espn/rss/news',
        'http://feeds.bbci.co.uk/sport/rss.xml',
        'https://www.si.com/.rss/full/'
    ],
    business: [
        'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'https://feeds.reuters.com/reuters/businessNews',
        'https://www.economist.com/business/rss.xml'
    ],
    entertainment: [
        'https://www.eonline.com/syndication/feeds/rssfeeds/topstories.xml',
        'https://variety.com/feed/',
        'https://www.hollywoodreporter.com/feed/'
    ],
    science: [
        'https://www.nasa.gov/rss/dyn/breaking_news.rss', // NASA
        'https://www.sciencedaily.com/rss/top/science.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
        'https://www.space.com/feeds/all'
    ],
    health: [
        'https://www.medicalnewstoday.com/feed',
        'http://rss.cnn.com/rss/cnn_health.rss',
        'https://www.nih.gov/news-events/feed.xml'
    ],
    world: [
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
    const feedUrls = RSS_FEEDS[category] || RSS_FEEDS['top'];

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

        // Round-Robin Interleaving for Variety
        // Instead of sorting purely by date (which clumps sources), we pick 1 from each feed in turns.
        const allArticles = [];
        const maxLength = Math.max(...results.map(r => r.length));

        for (let i = 0; i < maxLength; i++) {
            for (const feedResults of results) {
                if (feedResults[i]) {
                    allArticles.push(feedResults[i]);
                }
            }
        }

        // Format to match old NewsData.io structure expected by frontend
        const responseData = {
            status: 'success',
            totalResults: allArticles.length,
            results: allArticles.slice(0, 50) // Limit to 50 items (increased from 40 for variety)
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
