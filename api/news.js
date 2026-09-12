import Parser from 'rss-parser';

// Curated high-reliability RSS Feeds by category
const RSS_FEEDS = {
    top: [
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        'https://www.theguardian.com/world/rss',
        'https://feeds.npr.org/1001/rss.xml',
        'http://rss.cnn.com/rss/cnn_topstories.rss',
        'https://www.cnbc.com/id/100003114/device/rss/rss.html'
    ],
    technology: [
        'https://techcrunch.com/feed/',
        'https://www.theverge.com/rss/index.xml',
        'https://www.wired.com/feed/rss',
        'https://feeds.arstechnica.com/arstechnica/index',
        'https://www.engadget.com/rss.xml',
        'https://news.ycombinator.com/rss',
        'https://9to5mac.com/feed/',
        'https://www.androidauthority.com/feed/',
        'https://www.tomshardware.com/feeds/all',
        'https://www.bleepingcomputer.com/feed/',
        'https://gizmodo.com/rss',
        'https://slashdot.org/rss/slashdot.rss'
    ],
    world: [
        'https://feeds.bbci.co.uk/news/world/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
        'https://www.aljazeera.com/xml/rss/all.xml',
        'https://www.theguardian.com/world/rss',
        'https://feeds.npr.org/1004/rss.xml'
    ],
    business: [
        'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
        'https://feeds.npr.org/1006/rss.xml',
        'https://www.theguardian.com/business/rss'
    ],
    politics: [
        'https://rss.politico.com/politics-news.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml',
        'https://thehill.com/feed/',
        'https://feeds.npr.org/1014/rss.xml'
    ],
    science: [
        'https://www.nasa.gov/rss/dyn/breaking_news.rss',
        'https://www.sciencedaily.com/rss/top/science.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
        'https://www.space.com/feeds/all',
        'https://phys.org/rss-feed/'
    ],
    health: [
        'https://www.medicalnewstoday.com/feed',
        'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
        'https://feeds.npr.org/1128/rss.xml',
        'https://www.nih.gov/news-events/feed.xml'
    ],
    entertainment: [
        'https://variety.com/feed/',
        'https://www.hollywoodreporter.com/feed/',
        'https://deadline.com/feed/',
        'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml'
    ],
    sports: [
        'https://www.espn.com/espn/rss/news',
        'https://feeds.bbci.co.uk/sport/rss.xml',
        'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
        'https://sports.yahoo.com/rss/'
    ],
    india: [
        'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        'https://www.thehindu.com/news/national/feeder/default.rss',
        'https://indianexpress.com/section/india/feed/',
        'https://www.news18.com/common-feeds/v1/cne/rss/india.xml'
    ]
};

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'mediaContent', { keepArray: true }],
            ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

const memoryCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes server-side cache

/**
 * Fetch a single feed with a strict timeout using fetch + parseString
 */
async function fetchFeedWithTimeout(url, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/',
                'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const xml = await response.text();
        const feed = await parser.parseString(xml);
        return feed;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Normalize text to strip HTML tags and decode basic entities
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '&')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

/**
 * Unpack true publisher URL from search engines (Bing News apiclick, Yahoo, etc.)
 */
function extractRealUrl(rawLink) {
    if (!rawLink) return '';
    try {
        if (rawLink.includes('bing.com/news/apiclick.aspx') || rawLink.includes('bing.com/ck/')) {
            const parsed = new URL(rawLink);
            const target = parsed.searchParams.get('url');
            if (target && /^https?:\/\//i.test(target)) {
                return target;
            }
        }
        if (rawLink.includes('yahoo.com') && rawLink.includes('/RU=')) {
            const match = rawLink.match(/\/RU=([^/]+)/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        }
    } catch {
        // fallback
    }
    return rawLink;
}

/**
 * Clean and format brand name for news sources
 */
function normalizeSourceName(rawSource, feedUrl = '') {
    const combined = `${rawSource || ''} ${feedUrl || ''}`.toLowerCase();
    if (combined.includes('bbc')) return 'BBC News';
    if (combined.includes('nytimes') || combined.includes('nyt')) return 'The New York Times';
    if (combined.includes('guardian')) return 'The Guardian';
    if (combined.includes('npr')) return 'NPR';
    if (combined.includes('cnn')) return 'CNN';
    if (combined.includes('cnbc')) return 'CNBC';
    if (combined.includes('techcrunch')) return 'TechCrunch';
    if (combined.includes('theverge') || combined.includes('the verge')) return 'The Verge';
    if (combined.includes('wired')) return 'Wired';
    if (combined.includes('arstechnica') || combined.includes('ars technica')) return 'Ars Technica';
    if (combined.includes('engadget')) return 'Engadget';
    if (combined.includes('ycombinator') || combined.includes('hacker news')) return 'Hacker News';
    if (combined.includes('9to5mac')) return '9to5Mac';
    if (combined.includes('androidauthority') || combined.includes('android authority')) return 'Android Authority';
    if (combined.includes('tomshardware') || combined.includes("tom's hardware")) return "Tom's Hardware";
    if (combined.includes('bleepingcomputer') || combined.includes('bleeping computer')) return 'BleepingComputer';
    if (combined.includes('gizmodo')) return 'Gizmodo';
    if (combined.includes('slashdot')) return 'Slashdot';
    if (combined.includes('politico')) return 'Politico';
    if (combined.includes('thehill') || combined.includes('the hill')) return 'The Hill';
    if (combined.includes('aljazeera') || combined.includes('al jazeera')) return 'Al Jazeera';
    if (combined.includes('nasa')) return 'NASA';
    if (combined.includes('space.com')) return 'Space.com';
    if (combined.includes('phys.org')) return 'Phys.org';
    if (combined.includes('sciencedaily') || combined.includes('science daily')) return 'Science Daily';
    if (combined.includes('variety')) return 'Variety';
    if (combined.includes('hollywoodreporter') || combined.includes('hollywood reporter')) return 'The Hollywood Reporter';
    if (combined.includes('deadline')) return 'Deadline';
    if (combined.includes('espn')) return 'ESPN';
    if (combined.includes('yahoo')) return 'Yahoo';
    if (combined.includes('thehindu') || combined.includes('hindu')) return 'The Hindu';
    if (combined.includes('timesofindia') || combined.includes('indiatimes')) return 'Times of India';
    if (combined.includes('indianexpress')) return 'Indian Express';
    if (combined.includes('news18')) return 'News18';
    if (combined.includes('google')) return 'Google News';
    if (combined.includes('bing')) return 'Bing News';

    return (rawSource || '')
        .replace(/^(RSS\s*Feed|Latest\s*News\s*-\s*|Google\s*News\s*-\s*|Bing\s*News\s*-\s*)/i, '')
        .replace(/(\s*-\s*RSS\s*Feed|\s*-\s*Top\s*Stories|\s*\|\s*The\s*Guardian)/i, '')
        .trim() || 'News';
}

/**
 * Robust extraction of article image from RSS fields
 */
function extractImage(item) {
    // 1. Check enclosure tag
    if (item.enclosure?.url) {
        const type = (item.enclosure.type || '').toLowerCase();
        const url = item.enclosure.url;
        if (type.startsWith('image') || /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(url)) {
            return url;
        }
    }

    // 2. Check media:content array or object
    if (item.mediaContent) {
        const mediaList = Array.isArray(item.mediaContent) ? item.mediaContent : [item.mediaContent];
        for (const m of mediaList) {
            if (m?.$?.url) return m.$.url;
            if (m?.url) return m.url;
        }
    }

    // 3. Check media:thumbnail
    if (item.mediaThumbnail) {
        const thumbList = Array.isArray(item.mediaThumbnail) ? item.mediaThumbnail : [item.mediaThumbnail];
        for (const t of thumbList) {
            if (t?.$?.url) return t.$.url;
            if (t?.url) return t.url;
        }
    }

    // 4. Fallback: inspect raw content or description for <img> tag
    const content = item.contentEncoded || item.content || item.description || '';
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1] && !match[1].includes('feedburner.com') && !match[1].includes('doubleclick')) {
        return match[1];
    }

    return null;
}

/**
 * Compute reading time estimate (approx 200 words/min)
 */
function estimateReadingTime(item, cleanDesc) {
    const fullContent = item['content:encoded'] || item.content || '';
    const cleanFull = cleanText(fullContent);
    const words = cleanFull.split(/\s+/).filter(Boolean).length;
    if (words > 80) {
        return Math.max(1, Math.ceil(words / 200));
    }
    const snippetWords = cleanDesc ? cleanDesc.split(/\s+/).filter(Boolean).length : 0;
    const titleLength = (item.title || '').length;
    const variance = (titleLength % 3); // 0, 1, or 2
    return Math.max(2, Math.min(6, Math.max(2, Math.ceil(snippetWords / 35) + 1) + variance));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const category = (req.query.category || 'top').toLowerCase();
    const customUrl = req.query.custom_url;
    const searchQuery = (req.query.q || '').toLowerCase().trim();

    // Check in-memory cache for blazing fast responses
    const cacheKey = `${category}:${searchQuery}:${customUrl || ''}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
        return res.status(200).json(cached.data);
    }

    let feedUrls = RSS_FEEDS[category] || RSS_FEEDS['top'];

    if (searchQuery) {
        feedUrls = [
            `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`,
            `https://www.bing.com/news/search?q=${encodeURIComponent(searchQuery)}&format=rss`
        ];
    } else if (customUrl) {
        try {
            new URL(customUrl);
            feedUrls = [customUrl];
        } catch {
            return res.status(400).json({ status: 'error', message: 'Invalid custom feed URL' });
        }
    }

    try {
        // Fetch all feeds in parallel with individual timeouts
        const feedSettled = await Promise.allSettled(
            feedUrls.map(url => fetchFeedWithTimeout(url, 5000))
        );

        const resultsPerFeed = [];

        for (let i = 0; i < feedSettled.length; i++) {
            const result = feedSettled[i];
            if (result.status === 'fulfilled' && result.value?.items) {
                const feed = result.value;
                const defaultSource = feed.title?.replace(/^(RSS\s*Feed|Latest\s*News\s*-\s*|Google\s*News\s*-\s*|Bing\s*News\s*-\s*)/i, '').trim() || 'News';

                const parsedItems = feed.items.map(item => {
                    let cleanDesc = cleanText(item.contentSnippet || item.description || item.content || '');
                    if (/^comments\s*$/i.test(cleanDesc) || cleanDesc.length < 5) {
                        cleanDesc = '';
                    }

                    // Extract source title from Google/Bing search RSS or title suffix
                    let itemSource = defaultSource;
                    if (item.source && typeof item.source === 'object') {
                        itemSource = cleanText(item.source._ || item.source.title || defaultSource);
                    } else if (typeof item.source === 'string' && item.source) {
                        itemSource = cleanText(item.source);
                    } else if (item.title && item.title.includes(' - ')) {
                        const parts = item.title.split(' - ');
                        if (parts.length > 1) {
                            itemSource = cleanText(parts[parts.length - 1]);
                        }
                    }

                    itemSource = normalizeSourceName(itemSource, feedUrls[i] || item.link);

                    let rawTitle = cleanText(item.title) || 'Untitled';
                    if (item.title && item.title.includes(' - ')) {
                        const lastDash = rawTitle.lastIndexOf(' - ');
                        if (lastDash > 10) {
                            rawTitle = rawTitle.slice(0, lastDash).trim();
                        }
                    }

                    const directLink = extractRealUrl(item.link || '');

                    return {
                        title: rawTitle,
                        link: directLink,
                        description: cleanDesc,
                        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                        source_id: itemSource,
                        image_url: extractImage(item),
                        creator: item.creator ? [cleanText(item.creator)] : null,
                        reading_time_min: estimateReadingTime(item, cleanDesc)
                    };
                }).filter(item => item.title && item.link);

                resultsPerFeed.push(parsedItems);
            } else if (result.status === 'rejected') {
                console.warn(`Feed fetch failed for ${feedUrls[i]}:`, result.reason?.message);
            }
        }

        // Interleave feeds round-robin for varied coverage
        const interleaved = [];
        const maxLen = Math.max(...resultsPerFeed.map(r => r.length), 0);
        for (let idx = 0; idx < maxLen; idx++) {
            for (const feedArticles of resultsPerFeed) {
                if (feedArticles[idx]) {
                    interleaved.push(feedArticles[idx]);
                }
            }
        }

        // Deduplicate headlines using normalized titles
        const seen = new Set();
        let finalArticles = interleaved.filter(art => {
            const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });


        // Edge cache for 10 minutes, stale-while-revalidate for 30 minutes
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');

        const responseData = {
            status: 'success',
            category,
            totalResults: finalArticles.length,
            results: finalArticles.slice(0, 60)
        };

        memoryCache.set(cacheKey, { timestamp: Date.now(), data: responseData });

        return res.status(200).json(responseData);

    } catch (err) {
        console.error('Aggregator error:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to aggregate news feeds'
        });
    }
}
