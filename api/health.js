// Vercel serverless function -> GET /api/health
import { activeKey } from '../lib/tutor.mjs';

export default function handler(request, response) {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ ready: Boolean(activeKey()) }));
}
