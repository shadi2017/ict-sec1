// Vercel serverless function -> POST /api/tutor
// بيمرّ على الموجّه الموحّد عشان يتأكد إن الطالب مسجّل وحسابه مفعّل.
import { handleApi, sendJson } from '../lib/api.mjs';

export const config = { maxDuration: 30 };

export default async function handler(request, response) {
  return sendJson(response, await handleApi(request));
}
