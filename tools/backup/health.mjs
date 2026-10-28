#!/usr/bin/env node
// ============================================================
//  فحص صحة النسخ الاحتياطي.
//
//  بيتشغّل كل يوم بعد الباكاب (10:00 ص) وبيتأكد من حاجتين:
//    1. آخر نسخة عمرها أقل من 30 ساعة.
//    2. آخر نسخة بتتفك فعلًا (تشفير + gzip + JSON سليم).
//
//  لو فيه مشكلة بيبعت تنبيه على تليجرام.
//  الاستخدام:  npm run backup:health
// ============================================================
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { decrypt } from './lib/box.mjs';
import { rcloneList } from './lib/rclone.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..', '..');

for (const name of ['.env', '.env.local']) {
  const file = path.join(projectRoot, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(projectRoot, '.data', 'backups');
const MAX_AGE_HOURS = Number(process.env.BACKUP_MAX_AGE_HOURS || 30);

/** يستخرج وقت النسخة من اسم الملف: ict-db-2026-10-28_2141…. */
function fileTimestamp(name) {
  const match = String(name).match(/^ict-db-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})/);
  if (!match) return 0;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
}

async function sendAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('⚠️ مفيش تليجرام مضبوط — التنبيه هيظهر في اللوج بس.');
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error(`⚠️ إرسال التنبيه فشل: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!existsSync(BACKUP_DIR)) {
    await sendAlert(`⚠️ فحص الباكاب: مجلد النسخ مش موجود (${BACKUP_DIR}).`);
    return 1;
  }

  const files = readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('ict-db-') && name.endsWith('.enc'))
    .sort();

  if (files.length === 0) {
    await sendAlert('⚠️ فحص الباكاب: مفيش أي نسخة محفوظة على الجهاز.');
    return 1;
  }

  const latest = files[files.length - 1];
  const full = path.join(BACKUP_DIR, latest);
  const ageHours = (Date.now() - statSync(full).mtimeMs) / 3_600_000;

  const problems = [];

  if (ageHours > MAX_AGE_HOURS) {
    problems.push(`آخر نسخة عمرها ${ageHours.toFixed(1)} ساعة (المسموح ${MAX_AGE_HOURS}).`);
  }

  try {
    const passphrase = process.env.BACKUP_PASSPHRASE;
    const bytes = readFileSync(full);
    const plain = passphrase ? decrypt(bytes, passphrase) : bytes;
    const parsed = JSON.parse(gunzipSync(plain).toString('utf8'));
    if (parsed.format !== 'ict-backup-v1') {
      problems.push(`صيغة الملف غير متوقعة: ${parsed.format}`);
    }
  } catch (error) {
    problems.push(`آخر نسخة مش بتتفك: ${error.message}`);
  }

  const remote = process.env.RCLONE_REMOTE;
  if (remote) {
    try {
      const remoteFiles = (await rcloneList({ remote, folder: process.env.RCLONE_FOLDER || '' }))
        .filter(name => name.startsWith('ict-db-'));
      if (remoteFiles.length === 0) {
        problems.push('مفيش أي نسخة على Drive.');
      } else {
        const newestRemote = remoteFiles.sort((a, b) => fileTimestamp(a) - fileTimestamp(b)).at(-1);
        const remoteAge = (Date.now() - fileTimestamp(newestRemote)) / 3_600_000;
        if (remoteAge > MAX_AGE_HOURS) {
          problems.push(`آخر نسخة على Drive عمرها ${remoteAge.toFixed(1)} ساعة (${newestRemote}).`);
        }
      }
    } catch (error) {
      problems.push(`مش قادر أتأكد من Drive: ${error.message}`);
    }
  }

  if (problems.length === 0) {
    console.log(`✅ سليم — آخر نسخة: ${latest} (${ageHours.toFixed(1)} ساعة) وبتتفك عادي.`);
    return 0;
  }

  const text = ['⚠️ مشكلة في النسخ الاحتياطي', '', ...problems.map(p => `• ${p}`), '', `آخر ملف: ${latest}`].join('\n');
  console.error(text);
  await sendAlert(text);
  return 1;
}

main()
  .then(code => process.exit(code))
  .catch(async error => {
    const message = `⚠️ فحص الباكاب وقع: ${error?.message || error}`;
    console.error(message);
    await sendAlert(message);
    process.exit(1);
  });
