import type { Article } from '../types';

export interface NewsResponse {
  status: string;
  category?: string;
  totalResults: number;
  results: Article[];
}

export interface ReadResponse {
  status: string;
  title: string;
  byline?: string;
  excerpt?: string;
  content: string;
  textContent?: string;
  original_url: string;
  siteName?: string;
  wordCount?: number;
  readingTimeMin?: number;
}

// Client-side in-memory and session caches
const clientReadCache = new Map<string, ReadResponse>();
const pendingFetches = new Map<string, Promise<ReadResponse>>();

export const ApiService = {
  async getNews(category: string = 'top', query: string = '', customUrl?: string): Promise<Article[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);
    if (customUrl) params.set('custom_url', customUrl);

    const endpoint = `/api/news?${params.toString()}`;

    try {
      const response = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`API responded with HTTP ${response.status}`);
      }

      const data: NewsResponse = await response.json();
      return data.results || [];
    } catch (err: any) {
      console.warn('Primary news fetch failed, attempting client-side fallback...', err.message);
      return this.fallbackFetch(category, customUrl, query);
    }
  },

  async readArticle(url: string): Promise<ReadResponse> {
    if (!url) {
      return { status: 'fallback', title: '', content: '', original_url: url, readingTimeMin: 2 };
    }

    // 1. Check in-memory client cache
    if (clientReadCache.has(url)) {
      return clientReadCache.get(url)!;
    }

    // 2. Check session storage cache
    try {
      const stored = sessionStorage.getItem(`read_cache_${url}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ReadResponse;
        if (parsed && parsed.status) {
          clientReadCache.set(url, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }

    // 3. Deduplicate in-flight fetch if prefetch already started
    if (pendingFetches.has(url)) {
      return pendingFetches.get(url)!;
    }

    const fetchPromise = (async () => {
      const endpoint = `/api/read?url=${encodeURIComponent(url)}`;
      try {
        const response = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`Reader API failed with HTTP ${response.status}`);
        }

        const data: ReadResponse = await response.json();
        const result: ReadResponse = data.status === 'fallback'
          ? { status: 'fallback', title: data.title || '', content: '', original_url: url, readingTimeMin: 2 }
          : data;

        // Cache in memory and session storage
        clientReadCache.set(url, result);
        try {
          sessionStorage.setItem(`read_cache_${url}`, JSON.stringify(result));
        } catch {
          // ignore session quota
        }

        return result;
      } catch (err: any) {
        console.warn('Reader API extraction notice:', err.message);
        return {
          status: 'fallback',
          title: '',
          content: '',
          original_url: url,
          readingTimeMin: 2
        };
      } finally {
        pendingFetches.delete(url);
      }
    })();

    pendingFetches.set(url, fetchPromise);
    return fetchPromise;
  },

  prefetchArticle(url: string): void {
    if (!url || clientReadCache.has(url) || pendingFetches.has(url)) return;
    try {
      if (sessionStorage.getItem(`read_cache_${url}`)) return;
    } catch {
      // ignore
    }
    // Silently pre-warm in background
    this.readArticle(url).catch(() => {});
  },

  async fallbackFetch(category: string, customUrl?: string, query?: string): Promise<Article[]> {
    let targetUrl: string;
    let fallbackSourceName = 'BBC News';

    if (query) {
      targetUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      fallbackSourceName = 'Google News';
    } else if (customUrl) {
      targetUrl = customUrl;
      try {
        fallbackSourceName = new URL(customUrl).hostname.replace(/^www\./, '');
      } catch {
        fallbackSourceName = 'Custom Feed';
      }
    } else if (category === 'technology') {
      targetUrl = 'https://techcrunch.com/feed/';
      fallbackSourceName = 'TechCrunch';
    } else {
      targetUrl = 'https://feeds.bbci.co.uk/news/rss.xml';
      fallbackSourceName = 'BBC News';
    }

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      const xml = await res.text();
      const dom = new DOMParser().parseFromString(xml, 'text/xml');
      const channelTitle = dom.querySelector('channel > title')?.textContent?.replace(/^(RSS\s*Feed|Latest\s*News\s*-\s*)/i, '').trim();
      const items = Array.from(dom.querySelectorAll('item'));

      return items.map(item => {
        let title = item.querySelector('title')?.textContent || 'Untitled';
        const link = item.querySelector('link')?.textContent || '';
        const desc = item.querySelector('description')?.textContent || item.querySelector('content')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
        const cleanDesc = desc.replace(/<[^>]+>/g, '').trim();

        // Dynamically resolve real source name
        let itemSource = item.querySelector('source')?.textContent?.trim() || channelTitle || fallbackSourceName;
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          if (parts.length > 1) {
            itemSource = parts[parts.length - 1].trim();
            title = parts.slice(0, -1).join(' - ').trim();
          }
        }

        // Extract image from enclosure or media tag
        let imageUrl: string | null = null;
        const enclosure = item.querySelector('enclosure');
        if (enclosure?.getAttribute('url')) {
          imageUrl = enclosure.getAttribute('url');
        }
        if (!imageUrl) {
          const media = item.querySelector('media\\:content, content') || item.querySelector('media\\:thumbnail, thumbnail');
          if (media?.getAttribute('url')) {
            imageUrl = media.getAttribute('url');
          }
        }
        if (!imageUrl) {
          const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
          }
        }

        const words = cleanDesc.split(/\s+/).filter(Boolean).length;
        const readingTimeMin = words > 80 ? Math.ceil(words / 200) : Math.max(2, Math.min(5, Math.ceil(words / 35) + 1));

        return {
          title,
          link,
          description: cleanDesc,
          pubDate,
          source_id: itemSource,
          image_url: imageUrl,
          reading_time_min: readingTimeMin
        };
      }).filter(a => a.title && a.link);
    } catch {
      return [];
    }
  }
};
