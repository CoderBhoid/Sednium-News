import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Global persistent in-memory cache for parsed articles (1 hour TTL, max 250 items)
const articleCache = globalThis.__articleCache || (globalThis.__articleCache = new Map());
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 250;

/**
 * Unpack true publisher URL if wrapped in Bing click tracker or Yahoo redirect
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

const JUNK_TEXT_PATTERNS = [
    /^ad\s*feedback$/i,
    /^advertisement(s)?$/i,
    /^advertising$/i,
    /^sponsored(\s+(content|post|story|stories|article|links?))?$/i,
    /^promoted(\s+(content|post|story|stories|links?))?$/i,
    /^read\s*more[:\s\.\-—–»>]*$/i,
    /^(also\s*read|read\s*also)[:\s\.\-—–»>]*$/i,
    /^(related\s*stories|related\s*articles?|related\s*news|more\s*stories)[:\s\.\-—–»>]*$/i,
    /^(trending\s*now|trending\s*stories|popular\s*stories|latest\s*stories)[:\s\.\-—–»>]*$/i,
    /^(watch\s*now|watch\s*live|listen\s*now)[:\s\.\-—–»>]*$/i,
    /^(sign\s*up\s*for|subscribe\s*to)\s*(our\s*)?(newsletter|daily\s*briefing|updates)?[:\s\.\-—–»>]*$/i,
    /^(click\s*here\s*to\s*subscribe|subscribe\s*now|support\s*independent\s*journalism)[:\s\.\-—–»>]*$/i,
    /^(give\s*feedback|report\s*(this\s*)?ad|about\s*(our\s*)?ads)$/i,
    /^(story\s*continues\s*below(\s*advertisement)?|continue\s*reading(\s*below)?)$/i,
    /^(share\s*(this\s*)?(story|article|post)?|follow\s*us(\s*on\s*[a-z\s]+)?)$/i
];

const CROSS_PROMO_PREFIX_PATTERN = /^(read\s*more|also\s*read|read\s*also|see\s*also|more\s*from|related\s*(story|stories|articles?|coverage)|trending\s*(story|stories|now)|check\s*out|watch\s*now)[:\s\.\-—–»>]+/i;

const JUNK_SELECTORS = [
    '[class*="ad-feedback" i]',
    '[id*="ad-feedback" i]',
    '[class*="ad-banner" i]',
    '[class*="ad-container" i]',
    '[class*="ad-wrapper" i]',
    '[class*="ad-slot" i]',
    '[class*="adunit" i]',
    '[class*="advertisement" i]',
    '[class*="sponsored" i]',
    '[class*="taboola" i]',
    '[class*="outbrain" i]',
    '[class*="newsletter" i]',
    '[class*="social-share" i]',
    '[aria-label*="advertisement" i]',
    '[aria-label*="ad feedback" i]',
    '.ad',
    '.ads',
    '.advert',
    '[data-ad]',
    '[data-advertisement]'
];

/**
 * Filter algorithm to thoroughly eliminate Ad Feedback, READ MORE, ad placeholders,
 * and cross-promotional teaser links from article DOM.
 */
function cleanArticleDom(rootElement) {
    if (!rootElement) return;

    // 1. Selector-based cleanup of ad containers and feedback elements
    for (const selector of JUNK_SELECTORS) {
        try {
            rootElement.querySelectorAll(selector).forEach(el => el.remove());
        } catch {
            // ignore invalid selector in older environments
        }
    }

    // 2. Scan block and inline elements for junk text & teaser links
    const candidates = Array.from(rootElement.querySelectorAll('p, div, span, h2, h3, h4, h5, h6, li, aside, section, blockquote, a, em, strong'));
    for (const el of candidates) {
        if (!el.parentNode) continue;
        const text = el.textContent ? el.textContent.trim() : '';

        // Exact or near-exact ad/boilerplate text
        if (JUNK_TEXT_PATTERNS.some(pat => pat.test(text))) {
            el.remove();
            continue;
        }

        // Cross-promotional teaser links (e.g. "READ MORE: Next story...")
        if (text.length < 160 && CROSS_PROMO_PREFIX_PATTERN.test(text)) {
            if (el.tagName.toLowerCase() === 'a' || el.querySelector('a') || el.closest('a')) {
                el.remove();
                continue;
            }
        }
    }

    // 3. Prune empty parent wrappers (paragraphs or divs left empty after purging)
    let changed = true;
    let passes = 0;
    while (changed && passes < 4) {
        changed = false;
        passes++;
        rootElement.querySelectorAll('p, div, span, li, section, aside, blockquote').forEach(el => {
            if (el.querySelector('img, figure, picture, video')) return;
            const t = el.textContent ? el.textContent.replace(/[\u00A0\s]+/g, '').trim() : '';
            if (t.length === 0 && el.children.length === 0) {
                el.remove();
                changed = true;
            }
        });
    }
}

/**
 * Convert clean markdown into semantic HTML paragraphs, headings, blockquotes, and figures
 */
function markdownToHtml(md) {
    if (!md) return '';
    const lines = md.split(/\r?\n/);
    const html = [];
    let currentParagraph = [];

    const flushParagraph = () => {
        if (currentParagraph.length > 0) {
            let text = currentParagraph.join(' ').trim();
            if (text) {
                // Images: ![alt](url)
                text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure><img src="$2" alt="$1" /><figcaption>$1</figcaption></figure>');
                // Links: [text](url)
                text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
                // Bold and italics
                text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                html.push(`<p>${text}</p>`);
            }
            currentParagraph = [];
        }
    };

    for (let line of lines) {
        line = line.trim();
        if (!line) {
            flushParagraph();
            continue;
        }

        if (line.startsWith('#')) {
            flushParagraph();
            const level = Math.min(3, line.match(/^#+/)[0].length);
            const title = line.replace(/^#+\s*/, '');
            html.push(`<h${level}>${title}</h${level}>`);
        } else if (line.startsWith('>')) {
            flushParagraph();
            const quote = line.replace(/^>\s*/, '');
            html.push(`<blockquote>${quote}</blockquote>`);
        } else {
            currentParagraph.push(line);
        }
    }
    flushParagraph();
    return html.join('\n');
}

/**
 * Robust secondary extraction engine via reader proxy for WAF / Cloudflare / paywall-protected sites
 */
async function fetchFromReaderProxy(targetUrl, timeoutMs = 6500) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const proxyEndpoint = `https://r.jina.ai/${targetUrl}`;
        const res = await fetch(proxyEndpoint, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!res.ok) return null;
        const json = await res.json();
        const data = json?.data;
        if (!data || !data.content || data.content.trim().length < 120) return null;

        const html = markdownToHtml(data.content);
        const text = data.content.replace(/[#*>\\[\\]!]/g, '').replace(/\s+/g, ' ').trim();
        const wordCount = text.split(/\s+/).filter(Boolean).length;
        const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

        let site = 'Source';
        try {
            site = new URL(targetUrl).hostname.replace(/^www\./, '');
        } catch {
            // ignore
        }

        return {
            status: 'success',
            title: data.title || '',
            byline: data.author || '',
            excerpt: data.description || '',
            content: html,
            textContent: text,
            original_url: targetUrl,
            siteName: site,
            wordCount,
            readingTimeMin
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const rawUrl = req.query.url;
    if (!rawUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    const targetUrl = extractRealUrl(rawUrl);

    let parsedUrl;
    try {
        parsedUrl = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ error: 'Invalid URL protocol' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    // Check in-memory cache for immediate sub-millisecond return
    const cached = articleCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
        res.setHeader('X-Reader-Cache', 'HIT');
        return res.status(200).json(cached.data);
    }

    // Helper to store in cache and respond
    const cacheAndRespond = (payload) => {
        if (articleCache.size >= MAX_CACHE_SIZE) {
            const oldest = articleCache.keys().next().value;
            if (oldest) articleCache.delete(oldest);
        }
        articleCache.set(targetUrl, { data: payload, timestamp: Date.now() });

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
        return res.status(200).json(payload);
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6500);

        let response;
        try {
            response = await fetch(targetUrl, {
                signal: controller.signal,
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/',
                    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            });
        } finally {
            clearTimeout(timeout);
        }

        // If direct fetch is challenged by WAF (e.g. AWS WAF 202 on Ars Technica, or 403 on Cloudflare)
        if (!response.ok || response.status === 202) {
            // Attempt proxy reader extraction
            const proxyArticle = await fetchFromReaderProxy(targetUrl);
            if (proxyArticle) {
                return cacheAndRespond(proxyArticle);
            }

            // Fallback response if all tiers exhausted
            return res.status(200).json({
                status: 'fallback',
                isProtected: true,
                message: `Publisher protected (${response.status})`,
                original_url: targetUrl,
                siteName: parsedUrl.hostname
            });
        }

        const rawHtml = await response.text();

        // Check if returned page is an anti-bot challenge interstitial (e.g. Cloudflare or AWS WAF)
        if (rawHtml.length < 2500 && (rawHtml.includes('cf-browser-verification') || rawHtml.includes('Just a moment...') || rawHtml.includes('x-amzn-waf-action') || rawHtml.includes('Challenge Validation'))) {
            const proxyArticle = await fetchFromReaderProxy(targetUrl);
            if (proxyArticle) {
                return cacheAndRespond(proxyArticle);
            }
        }

        // Strip scripts, styles, SVG, comments, noscript, iframes, audio, video before DOM construction for blazing-fast parsing
        const cleanedHtml = rawHtml
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
            .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<video\b[^<]*(?:(?!<\/video>)<[^<]*)*<\/video>/gi, '')
            .replace(/<audio\b[^<]*(?:(?!<\/audio>)<[^<]*)*<\/audio>/gi, '');

        // Use virtual console to silence third-party CSS parser warnings
        const virtualConsole = new VirtualConsole();
        virtualConsole.on('error', () => {});
        virtualConsole.on('warn', () => {});

        const dom = new JSDOM(cleanedHtml, { url: targetUrl, virtualConsole });
        const doc = dom.window.document;

        // Pre-clean doc body to strip ad frames and noise before Readability analysis
        cleanArticleDom(doc.body);

        // 1. Primary extraction with Mozilla Readability
        const reader = new Readability(doc, {
            charThreshold: 80
        });
        const article = reader.parse();

        if (article && article.textContent && article.textContent.trim().length > 120) {
            // Clean article content to eliminate ad feedback and inline promotional noise
            const contentDom = new JSDOM(article.content, { virtualConsole });
            cleanArticleDom(contentDom.window.document.body);

            const cleanedContent = contentDom.window.document.body.innerHTML;
            const paragraphElements = Array.from(contentDom.window.document.body.querySelectorAll('p, h2, h3, h4, blockquote, li'));
            const cleanedText = paragraphElements.length > 0
                ? paragraphElements.map(el => el.textContent.trim()).filter(Boolean).join('\n\n')
                : contentDom.window.document.body.textContent.trim();

            const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
            const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

            return cacheAndRespond({
                status: 'success',
                title: article.title || '',
                byline: article.byline || '',
                excerpt: article.excerpt || '',
                content: cleanedContent,
                textContent: cleanedText,
                original_url: targetUrl,
                siteName: article.siteName || parsedUrl.hostname,
                wordCount,
                readingTimeMin
            });
        }

        // 2. Secondary fallback extraction: DOM heuristics
        // Remove known junk elements
        doc.querySelectorAll('script, style, noscript, nav, header, footer, iframe, aside, svg, button, form, .ad, .ads, [class*="advertisement"]').forEach(el => el.remove());

        const candidateSelectors = [
            'article',
            '[itemprop="articleBody"]',
            '.article-body',
            '.story-body',
            '.article__content',
            '.post-content',
            '.entry-content',
            '.article-content',
            'main',
            '#main-content'
        ];

        let bodyElement = null;
        for (const sel of candidateSelectors) {
            const el = doc.querySelector(sel);
            if (el && el.textContent.trim().length > 150) {
                bodyElement = el;
                break;
            }
        }

        // If candidate selector not found, cluster substantial paragraphs
        if (!bodyElement) {
            const validParagraphs = Array.from(doc.querySelectorAll('p'))
                .filter(p => p.textContent.trim().length > 35);

            if (validParagraphs.length >= 2) {
                const wrapper = doc.createElement('div');
                validParagraphs.forEach(p => wrapper.appendChild(p.cloneNode(true)));
                bodyElement = wrapper;
            }
        }

        if (bodyElement && bodyElement.textContent.trim().length > 100) {
            cleanArticleDom(bodyElement);

            const fallbackTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
                || doc.querySelector('title')?.textContent?.trim()
                || '';
            const fallbackByline = doc.querySelector('meta[name="author"]')?.getAttribute('content')
                || doc.querySelector('meta[property="article:author"]')?.getAttribute('content')
                || '';
            const fallbackExcerpt = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
                || doc.querySelector('meta[name="description"]')?.getAttribute('content')
                || '';

            const paragraphElements = Array.from(bodyElement.querySelectorAll('p, h2, h3, h4, blockquote, li'));
            const textContent = paragraphElements.length > 0
                ? paragraphElements.map(el => el.textContent.trim()).filter(Boolean).join('\n\n')
                : bodyElement.textContent.trim();
            const wordCount = textContent.split(/\s+/).filter(Boolean).length;
            const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

            return cacheAndRespond({
                status: 'success',
                title: fallbackTitle,
                byline: fallbackByline,
                excerpt: fallbackExcerpt,
                content: bodyElement.innerHTML,
                textContent,
                original_url: targetUrl,
                siteName: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || parsedUrl.hostname,
                wordCount,
                readingTimeMin
            });
        }

        // 3. Fallback extraction: try reader proxy if direct DOM extraction yield is low
        const proxyArticle = await fetchFromReaderProxy(targetUrl);
        if (proxyArticle) {
            return cacheAndRespond(proxyArticle);
        }

        return res.status(200).json({
            status: 'fallback',
            isProtected: false,
            message: 'Publisher layout not suited for automated reader',
            original_url: targetUrl,
            siteName: parsedUrl.hostname
        });

    } catch (error) {
        console.warn('Reader extraction notice:', error.message);
        return res.status(200).json({
            status: 'fallback',
            isProtected: true,
            message: error.message || 'Unable to load article content',
            original_url: targetUrl,
            siteName: parsedUrl?.hostname || 'Source'
        });
    }
}
