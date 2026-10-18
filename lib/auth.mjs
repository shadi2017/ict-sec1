// ============================================================
//  المصادقة: كلمات المرور، الجلسات، الكوكيز، وحماية الأدمن.
//  مفيش أي مكتبات خارجية — node:crypto بس.
// ============================================================
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { store } from './store.mjs';

export const STUDENT_COOKIE = 'ict_session';
export const ADMIN_COOKIE = 'ict_admin';
const SESSION_DAYS = 30;
const ADMIN_HOURS = 12;

/* --------------------------- كلمات المرور --------------------------- */
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(String(password), salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const newToken = () => randomBytes(32).toString('hex');

/** كلمة مرور مؤقتة سهلة القراءة والكتابة (من غير حروف متشابهة). */
export function randomPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}
export const sha256 = value => createHash('sha256').update(String(value)).digest('hex');

/* ------------------------------- الكوكيز ------------------------------- */
export function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 1) return;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return out;
}

function isHttps(request) {
  const proto = request && request.headers && (request.headers['x-forwarded-proto'] || '');
  return String(proto).split(',')[0].trim() === 'https';
}

export function cookie(name, value, maxAgeSeconds, request) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}` +
    (isHttps(request) ? '; Secure' : '');
}
export const clearCookie = name => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
export const studentCookie = (token, request) => cookie(STUDENT_COOKIE, token, SESSION_DAYS * 86_400, request);
export const adminCookie = (token, request) => cookie(ADMIN_COOKIE, token, ADMIN_HOURS * 3600, request);

/* ------------------------------- الجلسات ------------------------------- */
/** الطالب الحالي حسب كوكي الجلسة، أو null. */
export async function currentSession(request) {
  const token = parseCookies(request.headers && request.headers.cookie)[STUDENT_COOKIE];
  if (!token) return null;
  const device = await store.getDeviceByToken(token);
  if (!device || device.revoked) return null;
  const student = await store.getStudentById(device.student_id);
  if (!student) return null;
  return { student, device, token };
}

/** الجلسة لازم تكون مفعّلة من الأدمن. */
export async function activeSession(request) {
  const session = await currentSession(request);
  return session && session.student.status === 'active' ? session : null;
}

/* -------------------------------- الأدمن -------------------------------- */
const adminSecret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'ict-local-dev-secret';
export const adminUser = () => process.env.ADMIN_USER || 'admin';
export const adminReady = () => Boolean(process.env.ADMIN_PASSWORD);

export function signAdmin() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ADMIN_HOURS * 3600 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', adminSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdmin(request) {
  if (!adminReady()) return false;
  const token = parseCookies(request.headers && request.headers.cookie)[ADMIN_COOKIE];
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return false;
  const expected = createHmac('sha256', adminSecret()).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    return Date.now() < JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).exp;
  } catch { return false; }
}

/* ------------------------------ التحقق من المدخلات ------------------------------ */
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** يحوّل الأرقام العربية لأرقام عادية وينضّف رقم الموبايل. */
export function normalizePhone(value) {
  let text = String(value || '').trim().replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)));
  text = text.replace(/[\s\-().]/g, '');
  if (text.startsWith('+')) text = text.slice(1);
  if (text.startsWith('00')) text = text.slice(2);
  if (text.startsWith('20')) text = `0${text.slice(2)}`;
  return text.replace(/\D/g, '');
}

export const validPhone = phone => /^01\d{9}$/.test(phone);
export const GRADES = { y1: 'أولى ثانوي', y2: 'تانية ثانوي', y3: 'تالتة ثانوي' };
export const validGrade = grade => Object.prototype.hasOwnProperty.call(GRADES, grade);

export const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 60);

/** وصف مقروء للجهاز للأدمن (زي: أندرويد · Chrome). */
export function deviceLabel(userAgent) {
  const ua = String(userAgent || '');
  const os = /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iPhone/iPad'
    : /Windows/i.test(ua) ? 'Windows'
    : /Macintosh|Mac OS X/i.test(ua) ? 'Mac'
    : /Linux/i.test(ua) ? 'Linux' : 'جهاز';
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\/|Opera/i.test(ua) ? 'Opera'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari'
    : /Firefox\//i.test(ua) ? 'Firefox' : 'متصفح';
  return `${os} · ${browser}`;
}

export function clientFingerprint(request, clientFp) {
  const ua = String((request.headers && request.headers['x-user-agent']) || request.headers?.['user-agent'] || '');
  return sha256(`${clientFp || ''}|${ua}`).slice(0, 40);
}

/* ------------------------------ حد المعدّل ------------------------------ */
const hits = new Map();
/** حد بسيط لكل IP (في الذاكرة). */
export function rateLimit(request, key, max = 12, windowMs = 60_000) {
  const forwarded = request.headers && request.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' && forwarded.trim() ? forwarded.split(',')[0].trim() : '')
    || (request.socket && request.socket.remoteAddress) || 'unknown';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(id) || []).filter(time => now - time < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(id, recent);
  return true;
}
