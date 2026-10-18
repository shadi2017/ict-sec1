// ============================================================
//  موجّه الـ API — منطق واحد بيستخدمه:
//    * api/*.js            (Vercel serverless)
//    * server.mjs          (التطوير المحلي / أي استضافة Node)
//  بيرجّع { status, payload, headers }.
// ============================================================
import {
  ADMIN_COOKIE, GRADES, STUDENT_COOKIE, adminCookie, adminReady, adminUser, cleanName,
  clearCookie, clientFingerprint, currentSession, deviceLabel, hashPassword, newToken,
  normalizePhone, randomPassword, rateLimit, signAdmin, studentCookie, validGrade, validPhone, verifyAdmin, verifyPassword
} from './auth.mjs';
import { authBackend, authReady, nowISO, store } from './store.mjs';
import { getBody, handleTutor } from './tutor.mjs';

export const MAX_DEVICES = 2;
const EVENT_KINDS = new Set(['lesson', 'quiz', 'lab', 'game', 'demo', 'tutor', 'unit', 'code', 'view']);

const ok = (payload = { ok: true }, headers = []) => ({ status: 200, payload, headers });

// رسائل السيرفر بترجع كود + نص عربي احتياطي، والواجهة بتترجم الكود للعربي/الإنجليزي.
const ERR_TEXT = {
  authOff: 'نظام الحسابات مش مضبوط على السيرفر (قاعدة البيانات ناقصة). كلّم المدرس.',
  tooFast: 'محاولات كتير بسرعة. استنى دقيقة وجرّب تاني.',
  badLogin: 'رقم الموبايل أو كلمة المرور غير صحيحة.',
  needLogin: 'لازم تسجّل دخول الأول.',
  needActive: 'حسابك لسه محتاج تفعيل من المدرس.',
  blocked: 'حسابك موقوف. كلّم المدرس.',
  nameShort: 'اكتب اسمك بالكامل (٣ حروف على الأقل).',
  phoneBad: 'رقم الموبايل غير صحيح — ١١ رقم تبدأ بـ 01.',
  gradeBad: 'اختر الصف الدراسي.',
  passShort: 'كلمة المرور لازم ٦ حروف أو أرقام على الأقل.',
  phoneTaken: 'الرقم ده مسجّل قبل كده — جرّب تسجّل دخول.',
  notFound: 'مش موجود.',
  badAction: 'إجراء غير معروف.',
  noId: 'معرّف الطالب ناقص.',
  needAdmin: 'لازم تسجّل دخول كمدرس.',
  adminWrong: 'بيانات المدرس غير صحيحة.',
  adminOff: 'لازم تحدّد ADMIN_PASSWORD على السيرفر الأول.',
  noRoute: 'المسار غير موجود.',
  badRequest: 'طلب غير صحيح.',
  generic: 'حصلت مشكلة، جرّب تاني بعد لحظة.'
};

/** كود معروف → { error: code, message: عربي }، وأي نص تاني يتحوّل لـ generic. */
function fail(status, value) {
  const known = Object.prototype.hasOwnProperty.call(ERR_TEXT, value);
  return { status, payload: { error: known ? value : 'generic', message: known ? ERR_TEXT[value] : String(value) } };
}

const MSG = Object.keys(ERR_TEXT).reduce((acc, key) => { acc[key] = key; return acc; }, {});

const text = (value, max) => String(value == null ? '' : value).trim().slice(0, max);
const clampInt = (value, max) => Math.max(0, Math.min(max, Number.parseInt(value, 10) || 0));

/* ------------------------------- الطلاب ------------------------------- */
async function register(request, body) {
  if (!authReady()) return fail(503, MSG.authOff);
  if (!rateLimit(request, 'register', 10)) return fail(429, MSG.tooFast);

  const name = cleanName(body.name);
  const phone = normalizePhone(body.phone);
  const grade = text(body.grade, 10);
  const password = String(body.password || '');

  if (name.length < 3) return fail(400, MSG.nameShort);
  if (!validPhone(phone)) return fail(400, MSG.phoneBad);
  if (!validGrade(grade)) return fail(400, MSG.gradeBad);
  if (password.length < 6) return fail(400, MSG.passShort);

  if (await store.getStudentByPhone(phone)) return fail(409, MSG.phoneTaken);

  try {
    const student = await store.createStudent({ name, phone, grade, pass_hash: hashPassword(password) });
    await store.addEvents([{ student_id: student.id, kind: 'register', ref: grade }]);
    return { status: 201, payload: { ok: true, name: student.name, status: 'pending' } };
  } catch (error) {
    if (error.code === '23505') return fail(409, MSG.phoneTaken);
    console.error('[register]', error.message);
    return fail(502, MSG.generic);
  }
}

/** يسجّل جهاز جديد مع حد أقصى، ولو زاد يقفل الأقدم تلقائيًا. */
async function attachDevice(request, student, fingerprint) {
  const label = deviceLabel(request.headers && request.headers['user-agent']);
  const token = newToken();
  const devices = (await store.listDevices(student.id)).filter(d => !d.revoked);
  const known = devices.find(d => d.fp === fingerprint);

  if (known) {
    await store.updateDevice(known.id, { token, last_seen: nowISO(), label });
    return { token, revoked: null, count: devices.length };
  }

  const device = await store.createDevice({ student_id: student.id, fp: fingerprint, label, token });
  const after = (await store.listDevices(student.id)).filter(d => !d.revoked);
  let revoked = null;
  if (after.length > MAX_DEVICES) {
    const oldest = after.slice().sort((a, b) => String(a.last_seen).localeCompare(String(b.last_seen)))[0];
    if (oldest && oldest.id !== device.id) {
      await store.updateDevice(oldest.id, { revoked: true });
      revoked = oldest.label || null;
    }
  }
  return { token, revoked, count: Math.min(after.length, MAX_DEVICES) };
}

async function login(request, body) {
  if (!authReady()) return fail(503, MSG.authOff);
  if (!rateLimit(request, 'login', 15)) return fail(429, MSG.tooFast);

  const phone = normalizePhone(body.phone);
  const password = String(body.password || '');
  const student = phone ? await store.getStudentByPhone(phone) : null;
  if (!student || !verifyPassword(password, student.pass_hash)) return fail(401, MSG.badLogin);

  const fingerprint = clientFingerprint(request, text(body.fp, 80));
  const { token, revoked, count } = await attachDevice(request, student, fingerprint);
  await store.updateStudent(student.id, { last_seen: nowISO() });
  await store.addEvents([{ student_id: student.id, kind: 'login', meta: { device: deviceLabel(request.headers['user-agent']) } }]);

  return {
    status: 200,
    payload: { ok: true, account: publicAccount(student, revoked), enabled: true, devices: count, maxDevices: MAX_DEVICES },
    headers: [studentCookie(token, request)]
  };
}

function publicAccount(student, revoked) {
  return {
    id: student.id,
    name: student.name,
    phone: student.phone,
    grade: student.grade,
    gradeName: GRADES[student.grade] || student.grade,
    status: student.status,
    points: student.points || 0,
    certs: student.certs || 0,
    progress: student.progress || {},
    revoked: revoked || null
  };
}

async function me(request) {
  const enabled = authReady();
  if (!enabled) return ok({ enabled: false, backend: authBackend(), authenticated: false });

  const session = await currentSession(request);
  if (!session) return ok({ enabled: true, authenticated: false });

  const stale = !session.student.last_seen || (Date.now() - new Date(session.student.last_seen).getTime()) > 600_000;
  if (stale) {
    await store.updateStudent(session.student.id, { last_seen: nowISO() });
    await store.updateDevice(session.device.id, { last_seen: nowISO() });
  }
  const devices = (await store.listDevices(session.student.id)).filter(d => !d.revoked);
  return ok({
    enabled: true,
    authenticated: true,
    account: publicAccount(session.student, null),
    devices: devices.length,
    maxDevices: MAX_DEVICES
  });
}

function sanitizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  Object.keys(value).slice(0, 500).forEach(key => {
    if (key.length <= 24 && value[key]) out[key] = true;
  });
  return out;
}

async function sync(request, body) {
  if (!authReady()) return ok({ ok: true });
  const session = await currentSession(request);
  if (!session) return fail(401, MSG.needLogin);
  if (session.student.status !== 'active') return fail(403, session.student.status === 'blocked' ? MSG.blocked : MSG.needActive);

  const patch = { last_seen: nowISO() };
  if (body.points !== undefined) patch.points = clampInt(body.points, 200_000);
  if (body.certs !== undefined) patch.certs = clampInt(body.certs, 100);
  const progress = sanitizeProgress(body.progress);
  if (progress) patch.progress = progress;

  await store.updateStudent(session.student.id, patch);
  await store.updateDevice(session.device.id, { last_seen: nowISO() });

  const events = (Array.isArray(body.events) ? body.events : []).slice(0, 40)
    .map(item => ({
      student_id: session.student.id,
      kind: EVENT_KINDS.has(item && item.kind) ? item.kind : 'view',
      ref: text(item && item.ref, 60) || null,
      value: item && item.value !== undefined ? clampInt(item.value, 100) : null,
      meta: item && item.meta && typeof item.meta === 'object' ? item.meta : null
    }));
  await store.addEvents(events);
  return ok({ ok: true, points: patch.points !== undefined ? patch.points : session.student.points });
}

/* -------------------------------- الأدمن -------------------------------- */
async function adminLogin(request, body) {
  if (!adminReady()) return fail(503, MSG.adminOff);
  if (!rateLimit(request, 'admin', 10)) return fail(429, MSG.tooFast);
  const user = text(body.user, 40) || 'admin';
  const password = String(body.password || '');
  if (user !== adminUser() || password !== process.env.ADMIN_PASSWORD) return fail(401, MSG.adminWrong);
  return { status: 200, payload: { ok: true }, headers: [adminCookie(signAdmin(), request)] };
}

const needAdmin = request => verifyAdmin(request) ? null : fail(401, MSG.needAdmin);

async function adminStudents(request, body) {
  const denied = needAdmin(request); if (denied) return denied;

  if (request.method === 'GET') {
    const [students, devices] = await Promise.all([store.listStudents(), store.listDevices()]);
    const active = devices.filter(d => !d.revoked);
    const counts = {};
    active.forEach(d => { counts[d.student_id] = (counts[d.student_id] || 0) + 1; });
    const list = students.map(student => ({
      id: student.id,
      name: student.name,
      phone: student.phone,
      grade: student.grade,
      gradeName: GRADES[student.grade] || student.grade,
      status: student.status,
      points: student.points || 0,
      certs: student.certs || 0,
      lessons: Object.keys(student.progress || {}).length,
      note: student.note || '',
      created_at: student.created_at,
      activated_at: student.activated_at,
      last_seen: student.last_seen,
      devices: counts[student.id] || 0,
      deviceList: active.filter(d => d.student_id === student.id)
        .map(d => ({ label: d.label, last_seen: d.last_seen }))
    }));
    return ok({ students: list, grades: GRADES, maxDevices: MAX_DEVICES });
  }

  const id = text(body.id, 60);
  const action = text(body.action, 20);
  if (!id) return fail(400, MSG.noId);
  const student = await store.getStudentById(id);
  if (!student) return fail(404, MSG.notFound);

  if (action === 'approve') {
    await store.updateStudent(id, { status: 'active', activated_at: nowISO() });
  } else if (action === 'block') {
    await store.updateStudent(id, { status: 'blocked' });
  } else if (action === 'pending') {
    await store.updateStudent(id, { status: 'pending' });
  } else if (action === 'reset-devices') {
    await store.deleteStudentDevices(id);
  } else if (action === 'password') {
    // كلمة مرور جديدة للطالب اللي نسيها (الأدمن بيشوفها ويوديها له)
    const newPassword = text(body.password, 60) || randomPassword();
    if (newPassword.length < 6) return fail(400, MSG.passShort);
    await store.updateStudent(id, { pass_hash: hashPassword(newPassword) });
    await store.addEvents([{ student_id: id, kind: 'reset', ref: 'password' }]);
    return ok({ ok: true, password: newPassword, name: student.name, phone: student.phone });
  } else if (action === 'note') {
    await store.updateStudent(id, { note: text(body.note, 300) || null });
  } else if (action === 'delete') {
    await store.deleteStudent(id);
  } else {
    return fail(400, MSG.badAction);
  }
  return ok({ ok: true });
}

/* ------------------------------ التحليلات ------------------------------ */
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayKey = value => { try { return dayFormatter.format(new Date(value)); } catch { return ''; } };

async function analytics(request) {
  const denied = needAdmin(request); if (denied) return denied;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [students, devices, events] = await Promise.all([
    store.listStudents(),
    store.listDevices(),
    store.recentEvents({ sinceISO: since, limit: 8000 })
  ]);

  const activeDevices = devices.filter(d => !d.revoked);
  const totals = {
    students: students.length,
    active: students.filter(s => s.status === 'active').length,
    pending: students.filter(s => s.status === 'pending').length,
    blocked: students.filter(s => s.status === 'blocked').length,
    devices: activeDevices.length,
    events: events.length,
    newThisWeek: students.filter(s => s.created_at && Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000).length
  };

  const days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000));
    days.push({ day: key, logins: 0, active: 0, events: 0 });
  }
  const byDay = new Map(days.map(d => [d.day, d]));
  const dayStudents = new Map();

  const kindCount = {};
  const lessonCount = {};
  const perStudent = new Map();
  const tutorDays = new Set();
  let quizAttempts = 0, quizSum = 0;

  events.forEach(event => {
    const key = dayKey(event.created_at);
    const bucket = byDay.get(key);
    kindCount[event.kind] = (kindCount[event.kind] || 0) + 1;
    if (bucket) {
      bucket.events += 1;
      if (event.kind === 'login') bucket.logins += 1;
    }
    if (event.student_id) {
      if (!dayStudents.has(key)) dayStudents.set(key, new Set());
      dayStudents.get(key).add(event.student_id);
    }
    if (event.kind === 'lesson' && event.ref) lessonCount[event.ref] = (lessonCount[event.ref] || 0) + 1;
    if (event.kind === 'quiz' && event.value != null) { quizAttempts += 1; quizSum += Number(event.value) || 0; }
    if (event.kind === 'tutor') tutorDays.add(`${event.student_id}:${key}`);
    if (event.student_id) perStudent.set(event.student_id, (perStudent.get(event.student_id) || 0) + 1);
  });
  days.forEach(d => { d.active = (dayStudents.get(d.day) || new Set()).size; });

  const deviceCount = {};
  activeDevices.forEach(d => { deviceCount[d.student_id] = (deviceCount[d.student_id] || 0) + 1; });

  const rows = students.map(student => ({
    id: student.id,
    name: student.name,
    phone: student.phone,
    gradeName: GRADES[student.grade] || student.grade,
    status: student.status,
    points: student.points || 0,
    lessons: Object.keys(student.progress || {}).length,
    devices: deviceCount[student.id] || 0,
    events: perStudent.get(student.id) || 0,
    last_seen: student.last_seen,
    created_at: student.created_at
  }));

  const inactive = rows
    .filter(row => row.status === 'active' && (!row.last_seen || Date.now() - new Date(row.last_seen).getTime() > 7 * 86_400_000))
    .sort((a, b) => String(a.last_seen || '').localeCompare(String(b.last_seen || '')))
    .slice(0, 20);

  return ok({
    totals,
    days,
    activityByKind: Object.entries(kindCount).map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count),
    topLessons: Object.entries(lessonCount).map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    quiz: { attempts: quizAttempts, avg: quizAttempts ? Math.round(quizSum / quizAttempts) : 0 },
    tutor: { questions: kindCount.tutor || 0, activeDays: tutorDays.size },
    topStudents: rows.slice().sort((a, b) => b.points - a.points || b.events - a.events).slice(0, 10),
    inactive,
    generatedAt: nowISO()
  });
}

/* ------------------------------- الموجّه ------------------------------- */
export async function handleApi(request) {
  let url;
  try { url = new URL(request.url, 'http://localhost'); } catch { return fail(400, MSG.badRequest); }
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method || 'GET';

  let body = {};
  try { if (method === 'POST' || method === 'PUT' || method === 'PATCH') body = (await getBody(request)) || {}; }
  catch (error) { return fail(error.status || 400, error.message); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  try {
    // عام
    if (pathname === '/api/auth/register' && method === 'POST') return await register(request, body);
    if (pathname === '/api/auth/login' && method === 'POST') return await login(request, body);
    if (pathname === '/api/auth/logout' && method === 'POST') {
      // بنقفل الجهاز ده فعلًا على السيرفر، وكمان بنمسح الكوكي
      const session = await currentSession(request);
      if (session) await store.updateDevice(session.device.id, { revoked: true });
      return { status: 200, payload: { ok: true }, headers: [clearCookie(STUDENT_COOKIE)] };
    }
    if (pathname === '/api/auth/me' && method === 'GET') return await me(request);
    if (pathname === '/api/auth/sync' && method === 'POST') return await sync(request, body);

    // الأدمن
    if (pathname === '/api/admin/login' && method === 'POST') return await adminLogin(request, body);
    if (pathname === '/api/admin/logout' && method === 'POST') return { status: 200, payload: { ok: true }, headers: [clearCookie(ADMIN_COOKIE)] };
    if (pathname === '/api/admin/session' && method === 'GET') return ok({ ok: verifyAdmin(request), user: adminUser(), ready: adminReady() });
    if (pathname === '/api/admin/students') return await adminStudents(request, body);
    if (pathname === '/api/admin/analytics' && method === 'GET') return await analytics(request);

    // المدرّس الذكي (محتاج حساب مفعّل لما الحسابات تكون شغّالة)
    if (pathname === '/api/tutor' && method === 'POST') {
      if (authReady()) {
        const session = await currentSession(request);
        if (!session) return fail(401, MSG.needLogin);
        if (session.student.status !== 'active') return fail(403, session.student.status === 'blocked' ? MSG.blocked : MSG.needActive);
      }
      return await handleTutor(body, request);
    }

    return fail(404, MSG.noRoute);
  } catch (error) {
    console.error('[api]', pathname, error && error.message);
    return fail(502, MSG.generic);
  }
}

/* ------------------- إرسال الرد (Vercel + Node معًا) ------------------- */
export function sendJson(response, result) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  };
  if (result.headers && result.headers.length) headers['set-cookie'] = result.headers;
  response.writeHead(result.status, headers);
  response.end(JSON.stringify(result.payload));
}
