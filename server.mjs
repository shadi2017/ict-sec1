// Local Node server (also used on Render / any Node host).
// Vercel uses api/tutor.js and api/health.js instead; both share lib/tutor.mjs.
import http from 'node:http';
import { readFile } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerTutor, json, activeKey, provider } from './lib/tutor.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname === '/' ? '/index.html' : pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const filename = path.resolve(root, `.${decoded}`);
  if (!filename.startsWith(`${root}${path.sep}`) || !mimeTypes[path.extname(filename)]) {
    response.writeHead(404).end('Not found');
    return;
  }
  readFile(filename, (error, content) => {
    if (error) { response.writeHead(404).end('Not found'); return; }
    response.writeHead(200, { 'content-type': mimeTypes[path.extname(filename)], 'cache-control': 'no-cache' });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return json(response, 200, { ready: Boolean(activeKey()) });
  }
  if (request.method === 'POST' && url.pathname === '/api/tutor') return answerTutor(request, response);
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: 'Method not allowed.' });
  return serveStatic(request, response, url.pathname);
});

const port = Number(process.env.PORT || 4173);
// listen on all interfaces when hosted (Render/containers); locally stay on 127.0.0.1 unless HOST is set
const host = process.env.HOST || ((process.env.RENDER || process.env.NODE_ENV === 'production') ? '0.0.0.0' : '127.0.0.1');
server.listen(port, host, () => {
  console.log(`ICT Secondary running at http://${host}:${port}`);
  console.log(activeKey() ? `AI tutor: configured (${provider()})` : 'AI tutor: needs GEMINI_API_KEY or OPENAI_API_KEY in .env');
});
