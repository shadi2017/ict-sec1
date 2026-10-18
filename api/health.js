// Vercel serverless function -> GET /api/health
import { activeKey } from '../lib/tutor.mjs';
import { authBackend, authReady } from '../lib/store.mjs';
import { adminReady } from '../lib/auth.mjs';

export default function handler(request, response) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify({
    ready: Boolean(activeKey()),
    accounts: authReady(),
    backend: authBackend(),
    admin: adminReady()
  }));
}
