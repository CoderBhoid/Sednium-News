import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vite dev plugin to execute serverless API handlers in local development
 */
function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const url = new URL(req.url, 'http://localhost');
        const pathname = url.pathname;

        let relativeHandler: string | null = null;
        const query: Record<string, string> = {};
        for (const [k, v] of url.searchParams.entries()) {
          query[k] = v;
        }

        if (pathname === '/api/news') {
          relativeHandler = './api/news.js';
        } else if (pathname === '/api/read') {
          relativeHandler = './api/read.js';
        } else if (pathname === '/api/proxy') {
          relativeHandler = './api/proxy.js';
        } else if (pathname === '/api/rss' || pathname.startsWith('/rss')) {
          relativeHandler = './api/rss.js';
          if (pathname.startsWith('/rss/')) {
            query.category = pathname.replace('/rss/', '');
          }
        }

        if (relativeHandler) {
          try {
            // Emulate Vercel serverless helper methods on IncomingMessage / ServerResponse
            (req as any).query = query;
            (res as any).status = function (code: number) {
              res.statusCode = code;
              return res;
            };
            (res as any).json = function (data: any) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data));
              return res;
            };
            (res as any).send = function (data: any) {
              res.end(data);
              return res;
            };

            const fullPath = path.resolve(__dirname, relativeHandler);
            const fileUrl = `${pathToFileURL(fullPath).href}?t=${Date.now()}`;
            const mod = await import(fileUrl);
            await mod.default(req, res);
            return;
          } catch (err: any) {
            console.error('API Dev Server Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
    host: true,
    open: false,
  },
});
