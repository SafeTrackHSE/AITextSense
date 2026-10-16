import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import http from 'http';

// Single source of truth for the app version: package.json. Injected at build
// time so no other file needs its own hardcoded version literal (see src/version.ts).
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

function neutralProxyPlugin() {
  return {
    name: 'neutral-llm-proxy',
    configureServer(server: any) {
      // 1. LLM Proxy endpoint to eliminate browser CORS on local & external APIs
      server.middlewares.use('/api/llm-proxy', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { url, method = 'POST', headers = {}, body: reqBody } = JSON.parse(body || '{}');
            // Auto normalize localhost to 127.0.0.1 for rock-solid IPv4 socket binding
            const targetUrl = url.replace('http://localhost:', 'http://127.0.0.1:');

            const fetchHeaders: Record<string, string> = { ...headers };
            delete fetchHeaders['host'];
            delete fetchHeaders['connection'];
            delete fetchHeaders['content-length'];
            if (!fetchHeaders['User-Agent'] && !fetchHeaders['user-agent']) {
              fetchHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
            }

            const fetchRes = await fetch(targetUrl, {
              method,
              headers: fetchHeaders,
              body: typeof reqBody === 'string' ? reqBody : reqBody ? JSON.stringify(reqBody) : undefined,
            });

            const resData = await fetchRes.text();
            res.statusCode = fetchRes.status;
            res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.end(resData);
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: err?.message || String(err) }));
          }
        });
      });

      // 2. Dual-port listener: also listen on port 1420 so http://localhost:1420 immediately forwards to 5173
      try {
        const port1420Server = http.createServer((req, res) => {
          res.writeHead(302, { Location: `http://localhost:5173${req.url || ''}` });
          res.end();
        });
        port1420Server.on('error', () => {
          // Port 1420 already occupied or restricted - ignore safely
        });
        port1420Server.listen(1420, '0.0.0.0');
      } catch {
        // ignore
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), neutralProxyPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version as string),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
  },
});
