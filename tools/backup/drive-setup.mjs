#!/usr/bin/env node
// ============================================================
//  إعداد Google Drive للباكاب في خطوة واحدة.
//
//  الاستخدام:
//    node tools/backup/drive-setup.mjs --key .secrets/gdrive-sa.json --folder <FOLDER_ID>
//
//  بيعمل إيه:
//   1. يتأكد إن ملف حساب الخدمة سليم (client_email + private_key).
//   2. يحوّله base64 ويحفظه في .env  → GDRIVE_SA_JSON
//   3. يحفظ GDRIVE_FOLDER_ID في .env
//   4. يطبع إيميل حساب الخدمة اللي لازم تشارك المجلد معاه (Editor).
// ============================================================
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const envFile = path.join(root, '.env');

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? String(process.argv[index + 1] || '') : fallback;
}

const keyPath = path.resolve(root, arg('key', path.join('.secrets', 'gdrive-sa.json')));
const folderId = arg('folder').trim();

if (!existsSync(keyPath)) {
  console.error(`❌ ملف المفتاح مش موجود: ${keyPath}`);
  console.error('   نزّل JSON key من Google Cloud (Service Account → Keys) وحطه في .secrets/gdrive-sa.json');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(keyPath, 'utf8');
} catch (error) {
  console.error(`❌ مش قادر أقرا الملف: ${error.message}`);
  process.exit(2);
}

let account;
try {
  account = JSON.parse(raw);
} catch {
  console.error('❌ الملف مش JSON صالح.');
  process.exit(2);
}

if (!account.client_email || !account.private_key) {
  console.error('❌ الملف مش حساب خدمة (ناقص client_email أو private_key).');
  process.exit(2);
}
if (!folderId) {
  console.error('❌ محتاج --folder <FOLDER_ID> — الـ id من رابط مجلد Drive.');
  process.exit(2);
}

// .env: نحافظ على نهايات السطور ونحدّث القيم لو موجودة.
const newline = existsSync(envFile) && readFileSync(envFile, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const current = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
const base64 = Buffer.from(raw, 'utf8').toString('base64');

const upsert = (text, name, value) => {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^\\s*${name}\\s*=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\s*$/, '')}${newline}${line}${newline}`;
};

let next = upsert(current, 'GDRIVE_SA_JSON', base64);
next = upsert(next, 'GDRIVE_FOLDER_ID', folderId);
writeFileSync(envFile, next, 'utf8');

console.log('✅ اتحفظ في .env:');
console.log(`   GDRIVE_SA_JSON   (${base64.length} حرف)`);
console.log(`   GDRIVE_FOLDER_ID = ${folderId}`);
console.log('');
console.log('📁 شارك مجلد Drive مع الإيميل ده كـ Editor:');
console.log(`   ${account.client_email}`);
console.log('');
console.log('بعد المشاركة، جرّب:');
console.log('   npm run backup:force');
console.log('');
console.log('وعشان GitHub Actions يشتغل، ضيف نفس القيمتين في:');
console.log('   Repo → Settings → Secrets and variables → Actions');
console.log('   GDRIVE_SA_JSON   = محتوى .env (base64)');
console.log('   GDRIVE_FOLDER_ID = نفس الـ id');
