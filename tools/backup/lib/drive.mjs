// رفع النسخة على Google Drive بحساب خدمة (Service Account) — من غير مكتبات.
// الطريقة: JWT موقّع بـ RS256 → access token → رفع multipart/related.
import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/drive';

const b64url = value => Buffer.from(value).toString('base64url');

/** بيقبل JSON خام أو نفس الـ JSON متحول base64 (أسهل في أسرار GitHub). */
export function loadServiceAccount(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  let json = text;
  if (!text.startsWith('{')) json = Buffer.from(text, 'base64').toString('utf8');
  const account = JSON.parse(json);
  if (!account.client_email || !account.private_key) {
    throw new Error('ملف حساب الخدمة ناقص client_email أو private_key.');
  }
  return account;
}

/**
 * JWT موقّع بـ RS256 لطلب access token.
 * مفتوح للتصدير عشان نقدر نختبره من غير ما نكلّم Google.
 */
export function buildAssertion(account, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now - 30,
    exp: now + 3600
  }));

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  signer.end();
  const signature = signer.sign(account.private_key, 'base64url');
  return `${header}.${claims}.${signature}`;
}

export async function getAccessToken(account) {
  const assertion = buildAssertion(account);
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    }),
    signal: AbortSignal.timeout(30_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`Google رفض توثيق حساب الخدمة: ${data.error_description || data.error || response.status}`);
  }
  return data.access_token;
}

export async function uploadToDrive({ accessToken, folderId, filename, bytes }) {
  const boundary = `ictb${Date.now().toString(36)}`;
  const metadata = JSON.stringify({
    name: filename,
    mimeType: 'application/octet-stream',
    ...(folderId ? { parents: [folderId] } : {})
  });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': `multipart/related; boundary=${boundary}`
      },
      body,
      signal: AbortSignal.timeout(180_000)
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`رفع الملف على Drive فشل: ${data?.error?.message || `HTTP ${response.status}`}`);
  }
  return { id: data.id, link: data.webViewLink, size: data.size };
}

/** بيحذف النسخ الأقدم من عدد الأيام المطلوب (افتراضي 30 يوم). */
export async function pruneDrive({ accessToken, folderId, keepDays = 30, prefix = 'ict-db-' }) {
  const query = [
    folderId ? `'${folderId}' in parents` : null,
    'trashed = false',
    `name contains '${prefix}'`
  ].filter(Boolean).join(' and ');

  const files = [];
  let pageToken = null;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'nextPageToken,files(id,name,createdTime)');
    url.searchParams.set('orderBy', 'createdTime');
    url.searchParams.set('pageSize', '200');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(60_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`قراءة ملفات Drive فشلت: ${data?.error?.message || `HTTP ${response.status}`}`);
    }
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const old = files.filter(file => Date.parse(file.createdTime) < cutoff);

  const deleted = [];
  for (const file of old) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30_000)
    });
    if (response.ok || response.status === 404) deleted.push(file.name);
  }
  return { scanned: files.length, deleted };
}
