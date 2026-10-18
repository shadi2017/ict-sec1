// Vercel serverless function -> GET | POST /api/admin/students
import { handleApi, sendJson } from '../../lib/api.mjs';

export default async function handler(request, response) {
  return sendJson(response, await handleApi(request));
}
