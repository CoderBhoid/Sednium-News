/**
 * Article Proxy API for Sednium News (Vercel Serverless Function)
 * 
 * Fetches article HTML from source websites and returns it
 * This bypasses CORS issues since it runs server-side
 * 
 * Endpoint: /api/proxy?url=https://example.com/article
 */

export default async function handler(req, res) {
    // Enable CORS for the frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }

    try {
        // Decode the URL
        const targetUrl = decodeURIComponent(url);

        // Validate URL
        try {
            new URL(targetUrl);
        } catch {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        // Fetch the article with a browser-like user agent
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Failed to fetch: ${response.status}`
            });
        }

        const html = await response.text();

        // Return the HTML content
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.status(200).send(html);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
}
