#!/usr/bin/env node
// ============================================================
//  استرجاع نسخة احتياطية
//
//    node tools/backup/restore.mjs .data/backups/ict-db-2026-10-21_0100.json.gz.enc
//
//  بيفك التشفير (BACKUP_PASSPHRASE) ويفك الضغط، وبيكتب:
//    - data.json    : البيانات كما هي (JSON)
//    - restore.sql  : أوامر INSERT جاهزة للصق في Supabase → SQL Editor
//
//  الخيارات:
//    --out <dir>   مكان الكتابة (افتراضي: نفس مجلد الملف)
//    --pass <key>  كلمة سر التشفير (بديل BACKUP_PASSPHRASE)
// ============================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';

import { decrypt, isEncrypted } from './lib/box.mjs';

const JSONB_COLUMNS = { students: ['progress'], events: ['meta'] };
const TABLE_ORDER = ['students', 'devices', 'events'];

const argv = process.argv.slice(2);
const file = argv.find(arg => !arg.startsWith('--') && !isFlagValue(arg));
const outIndex = argv.indexOf('--out');
const passIndex = argv.indexOf('--pass');
const outDir = outIndex >= 0 ? argv[outIndex + 1] : null;
const passphrase = passIndex >= 0 ? argv[passIndex + 1] : process.env.BACKUP_PASSPHRASE;

if (!file) {
  console.error('الاستخدام: node tools/backup/restore.mjs <ملف النسخة> [--out مجلد] [--pass كلمة السر]');
  process.exit(2);
}

function isFlagValue(arg) {
  const index = argv.indexOf(arg);
  return index > 0 && ['--out', '--pass'].includes(argv[index - 1]);
}

const source = path.resolve(file);
if (!existsSync(source)) {
  console.error(`الملف مش موجود: ${source}`);
  process.exit(2);
}

let bytes = readFileSync(source);
let encrypted = false;

if (isEncrypted(bytes)) {
  encrypted = true;
  if (!passphrase) {
    console.error('الملف مشفّر — حط BACKUP_PASSPHRASE أو استخدم --pass.');
    process.exit(2);
  }
  try {
    bytes = decrypt(bytes, passphrase);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(2);
  }
}

let json;
try {
  json = JSON.parse(gunzipSync(bytes).toString('utf8'));
} catch (error) {
  console.error(`مش قادر أقرا الملف (مضغوط بشكل غلط؟): ${error.message}`);
  process.exit(1);
}

if (json?.format !== 'ict-backup-v1') {
  console.warn('تحذير: صيغة الملف مش معروفة — بكمّل على أي حال.');
}

const target = path.resolve(outDir || path.dirname(source));
mkdirSync(target, { recursive: true });

const dataFile = path.join(target, 'data.json');
writeFileSync(dataFile, JSON.stringify(json, null, 2));

const sqlFile = path.join(target, 'restore.sql');
writeFileSync(sqlFile, buildSql(json), 'utf8');

const counts = Object.entries(json.counts || {}).map(([table, count]) => `${table}=${count}`).join(' · ');
console.log(`✅ تم فك ${encrypted ? 'التشفير و' : ''}الضغط — ${json.cairo || json.createdAt}`);
console.log(`   الجداول: ${counts}`);
console.log(`   ${dataFile}`);
console.log(`   ${sqlFile}`);
console.log('');
console.log('للاسترجاع: افتح Supabase → SQL Editor → الصق محتوى restore.sql → Run.');

/* --------------------------- توليد SQL --------------------------- */
function buildSql(backup) {
  const lines = [
    `-- ============================================================`,
    `-- استرجاع نسخة ICT — ${backup.cairo || backup.createdAt}`,
    `-- الجداول: ${Object.entries(backup.counts || {}).map(([t, c]) => `${t}=${c}`).join(' · ')}`,
    `-- آمن للتشغيل أكتر من مرة: on conflict do nothing`,
    `-- ============================================================`,
    'begin;',
    ''
  ];

  const tables = backup.tables || {};
  const order = [...TABLE_ORDER.filter(name => tables[name]), ...Object.keys(tables).filter(name => !TABLE_ORDER.includes(name))];

  for (const table of order) {
    const rows = tables[table] || [];
    if (rows.length === 0) {
      lines.push(`-- ${table}: مفيش صفوف`);
      lines.push('');
      continue;
    }

    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const jsonb = new Set(JSONB_COLUMNS[table] || []);

    lines.push(`-- ${table}: ${rows.length} صف`);
    const values = rows.map(row =>
      `  (${columns.map(column => sqlValue(row[column], jsonb.has(column))).join(', ')})`
    );
    lines.push(`insert into public.${table} (${columns.map(quoteIdent).join(', ')}) values`);
    lines.push(values.join(',\n'));
    lines.push('on conflict do nothing;');
    lines.push('');
  }

  lines.push(`-- إرجاع عدّاد events لآخر id موجود`);
  lines.push(`select setval(pg_get_serial_sequence('public.events', 'id'), coalesce((select max(id) from public.events), 1), true);`);
  lines.push('commit;');
  lines.push('');
  return lines.join('\n');
}

function quoteIdent(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name) ? name : `"${String(name).replace(/"/g, '""')}"`;
}

function sqlValue(value, forceJsonb = false) {
  if (value === null || value === undefined) return 'null';
  if (forceJsonb || (typeof value === 'object')) return `${quoteString(JSON.stringify(value))}::jsonb`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return quoteString(String(value));
}

function quoteString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}
