/**
 * Article Proxy API for Sednium News (Vercel Serverless Function)
 * Fetches raw HTML to bypass client-side CORS restrictions.
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    let targetUrl;
    try {
        targetUrl = decodeURIComponent(url);
        const parsed = new URL(targetUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: 'Invalid URL protocol' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL provided' });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let response;
        try {
            response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                redirect: 'follow',
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Failed to fetch: HTTP ${response.status}`
            });
        }

        const html = await response.text();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({ error: error.message || 'Internal proxy error' });
    }
}
