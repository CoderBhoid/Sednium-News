import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Fetch raw HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // Create virtual DOM
        const dom = new JSDOM(html, { url });

        // Use Readability to extract content
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
            return res.status(500).json({ error: 'Failed to parse article content' });
        }

        // Return clean data
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour

        res.status(200).json({
            status: 'success',
            title: article.title,
            byline: article.byline,
            excerpt: article.excerpt,
            content: article.content, // HTML string of clean content
            textContent: article.textContent,
            original_url: url,
            siteName: article.siteName
        });

    } catch (error) {
        console.error('Reader error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}
