// ============================================================
//  طبقة البيانات (Data layer)
//  - supabase: Postgres عبر REST (الإنتاج على Vercel) — مفيش مكتبات إضافية.
//  - file    : ملف JSON محلي للتطوير على الجهاز (.data/ict-db.json).
//  الاتنين بنفس الواجهة، فكل الكود اللي فوق بيتعامل معاهم بنفس الشكل.
// ============================================================
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..');
const DB_FILE = process.env.ICT_DB_FILE || path.join(projectRoot, '.data', 'ict-db.json');

const sbUrl = () => String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const sbKey = () => String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

/** 'supabase' | 'file' | 'none'  ('none' = على Vercel بدون قاعدة بيانات) */
export function backend() {
  if (sbUrl() && sbKey()) return 'supabase';
  return process.env.VERCEL ? 'none' : 'file';
}

/* ---------------------------- Supabase REST ---------------------------- */
async function sb(pathAndQuery, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${sbUrl()}/rest/v1/${pathAndQuery}`, {
    method,
    headers: {
      apikey: sbKey(),
      authorization: `Bearer ${sbKey()}`,
      'content-type': 'application/json',
      ...(prefer ? { prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error((data && (data.message || data.hint || data.details)) || `Supabase error ${response.status}`);
    error.status = response.status;
    error.code = data && data.code;
    throw error;
  }
  return data;
}

const eq = value => `eq.${encodeURIComponent(String(value))}`;

const supabaseStore = {
  kind: 'supabase',

  createStudent(row) {
    return sb('students', { method: 'POST', body: [row], prefer: 'return=representation' }).then(rows => rows[0]);
  },
  getStudentByPhone(phone) {
    return sb(`students?select=*&phone=${eq(phone)}&limit=1`).then(rows => rows[0] || null);
  },
  getStudentById(id) {
    return sb(`students?select=*&id=${eq(id)}&limit=1`).then(rows => rows[0] || null);
  },
  listStudents() {
    return sb('students?select=*&order=created_at.desc&limit=2000');
  },
  async updateStudent(id, patch) {
    const rows = await sb(`students?id=${eq(id)}`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
    return rows[0] || null;
  },
  deleteStudent(id) {
    return sb(`students?id=${eq(id)}`, { method: 'DELETE' });
  },

  listDevices(studentId) {
    const filter = studentId ? `&student_id=${eq(studentId)}` : '';
    return sb(`devices?select=*&order=created_at.desc${filter}`);
  },
  getDeviceByToken(token) {
    return sb(`devices?select=*&token=${eq(token)}&limit=1`).then(rows => rows[0] || null);
  },
  createDevice(row) {
    return sb('devices', { method: 'POST', body: [row], prefer: 'return=representation' }).then(rows => rows[0]);
  },
  async updateDevice(id, patch) {
    const rows = await sb(`devices?id=${eq(id)}`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
    return rows[0] || null;
  },
  deleteStudentDevices(studentId) {
    return sb(`devices?student_id=${eq(studentId)}`, { method: 'DELETE' });
  },

  async addEvents(rows) {
    if (!rows.length) return;
    await sb('events', { method: 'POST', body: rows, prefer: 'return=minimal' });
  },
  recentEvents({ sinceISO, limit = 5000 }) {
    const since = sinceISO ? `&created_at=gte.${encodeURIComponent(sinceISO)}` : '';
    return sb(`events?select=*&order=created_at.desc&limit=${limit}${since}`);
  }
};

/* --------------------------- ملف محلي (تطوير) --------------------------- */
function readDb() {
  try {
    const db = JSON.parse(readFileSync(DB_FILE, 'utf8'));
    return { students: db.students || [], devices: db.devices || [], events: db.events || [], seq: db.seq || 0 };
  } catch {
    return { students: [], devices: [], events: [], seq: 0 };
  }
}
function writeDb(db) {
  mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_FILE);
}
const nowISO = () => new Date().toISOString();
function duplicatePhone() {
  const error = new Error('duplicate key value violates unique constraint "students_phone_key"');
  error.code = '23505';
  return error;
}

const fileStore = {
  kind: 'file',

  async createStudent(row) {
    const db = readDb();
    if (db.students.some(s => s.phone === row.phone)) throw duplicatePhone();
    const student = {
      id: randomUUID(), name: row.name, phone: row.phone, grade: row.grade,
      pass_hash: row.pass_hash, status: 'pending', points: 0, certs: 0, progress: {},
      note: null, created_at: nowISO(), activated_at: null, last_seen: null
    };
    db.students.push(student); writeDb(db);
    return student;
  },
  async getStudentByPhone(phone) {
    return readDb().students.find(s => s.phone === phone) || null;
  },
  async getStudentById(id) {
    return readDb().students.find(s => s.id === id) || null;
  },
  async listStudents() {
    return readDb().students.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  },
  async updateStudent(id, patch) {
    const db = readDb();
    const student = db.students.find(s => s.id === id);
    if (!student) return null;
    Object.assign(student, patch); writeDb(db);
    return student;
  },
  async deleteStudent(id) {
    const db = readDb();
    db.students = db.students.filter(s => s.id !== id);
    db.devices = db.devices.filter(d => d.student_id !== id);
    db.events = db.events.filter(e => e.student_id !== id);
    writeDb(db);
  },

  async listDevices(studentId) {
    const all = readDb().devices.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return studentId ? all.filter(d => d.student_id === studentId) : all;
  },
  async getDeviceByToken(token) {
    return readDb().devices.find(d => d.token === token) || null;
  },
  async createDevice(row) {
    const db = readDb();
    const device = { id: randomUUID(), revoked: false, created_at: nowISO(), last_seen: nowISO(), ...row };
    db.devices.push(device); writeDb(db);
    return device;
  },
  async updateDevice(id, patch) {
    const db = readDb();
    const device = db.devices.find(d => d.id === id);
    if (!device) return null;
    Object.assign(device, patch); writeDb(db);
    return device;
  },
  async deleteStudentDevices(studentId) {
    const db = readDb();
    db.devices = db.devices.filter(d => d.student_id !== studentId);
    writeDb(db);
  },

  async addEvents(rows) {
    if (!rows.length) return;
    const db = readDb();
    rows.forEach(row => { db.seq += 1; db.events.push({ id: db.seq, created_at: nowISO(), ...row }); });
    if (db.events.length > 20_000) db.events = db.events.slice(-20_000);
    writeDb(db);
  },
  async recentEvents({ sinceISO, limit = 5000 }) {
    const events = readDb().events.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const filtered = sinceISO ? events.filter(e => String(e.created_at) >= sinceISO) : events;
    return filtered.slice(0, limit);
  }
};

/* ------------------------------- المصدَّر ------------------------------- */
const none = {
  kind: 'none',
  async createStudent() { const e = new Error('قاعدة البيانات مش مضبوطة.'); e.status = 503; throw e; },
  async getStudentByPhone() { return null; },
  async getStudentById() { return null; },
  async listStudents() { return []; },
  async updateStudent() { return null; },
  async deleteStudent() {},
  async listDevices() { return []; },
  async getDeviceByToken() { return null; },
  async createDevice() { return null; },
  async updateDevice() { return null; },
  async deleteStudentDevices() {},
  async addEvents() {},
  async recentEvents() { return []; }
};

export const store = backend() === 'supabase' ? supabaseStore : backend() === 'file' ? fileStore : none;

/** هل نظام الحسابات شغّال؟ (مش شغّال على Vercel بدون قاعدة بيانات) */
export const authReady = () => backend() !== 'none';
export const authBackend = () => backend();
export const dbFile = () => DB_FILE;
export { nowISO };
