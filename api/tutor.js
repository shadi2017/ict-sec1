// Vercel serverless function -> POST /api/tutor
import { answerTutor } from '../lib/tutor.mjs';

export const config = { maxDuration: 30 };

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }
  return answerTutor(request, response);
}
