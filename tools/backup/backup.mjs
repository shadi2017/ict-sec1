#!/usr/bin/env node
// ============================================================
//  نسخة احتياطية يومية لقاعدة بيانات منصة ICT
//
//  بتشتغل من مكانين:
//    1) GitHub Actions (.github/workflows/backup.yml) — كل يوم 1 صباحًا بتوقيت القاهرة
//    2) على الجهاز محليًا:  npm run backup
//
//  الخطوات: سحب الجداول → تجميعها في JSON → gzip → تشفير AES-256-GCM
//           → رفع على تليجرام + Google Drive + إيميل، مع نسخة محلية.
// ============================================================
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dumpAll, TABLES } from './lib/dump.mjs';
import { encrypt, decrypt } from './lib/box.mjs';
import { sendToTelegram } from './lib/telegram.mjs';
import { loadServiceAccount, getAccessToken, uploadToDrive, pruneDrive } from './lib/drive.mjs';
import { rcloneUpload, rclonePrune } from './lib/rclone.mjs';
import { sendMail } from './lib/mail.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..', '..');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(projectRoot, '.data', 'backups');
const LOCAL_KEEP_DAYS = Number(process.env.BACKUP_LOCAL_KEEP_DAYS || 30);
const DRIVE_KEEP_DAYS = Number(process.env.BACKUP_DRIVE_KEEP_DAYS || 30);
const FILE_PREFIX = 'ict-db-';

const startedAt = Date.now();
const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);

/* ------------------------------- إعدادات ------------------------------- */
function loadEnvFile() {
  for (const name of ['.env', '.env.local']) {
    const file = path.join(projectRoot, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      let value = raw.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

const cairoDate = date =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const cairoTime = date =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

const cairoHour = date =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hour12: false }).format(date));

const humanSize = bytes => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/* ------------------------------ التنفيذ ------------------------------ */
async function main() {
  loadEnvFile();

  const forced = process.argv.includes('--force') || process.env.BACKUP_FORCE === '1';
  // نسخة محلية بس (من غير رفع على تليجرام/درايف/إيميل) — بتستخدمها المهمة اليومية على الجهاز
  // عشان ما نبعتش نفس النسخة مرتين لما GitHub Actions بيشتغل في نفس الوقت.
  const localOnly = process.argv.includes('--local-only') || process.env.BACKUP_LOCAL_ONLY === '1';
  // المهمة المحلية بتتخطى تليجرام عشان GitHub Actions هو اللي يبعت الرسالة اليومية — من غير تكرار.
  const noTelegram = process.argv.includes('--no-telegram') || process.env.BACKUP_NO_TELEGRAM === '1';
  // الـ cron بيشتغل مرتين (22:00 و23:00 UTC) عشان التوقيت الصيفي/الشتوي في مصر.
  // السكربت نفسه بيقرر إذا كانت الساعة 1 بتوقيت القاهرة.
  if (!forced && process.env.GITHUB_EVENT_NAME === 'schedule' && cairoHour(new Date()) !== 1) {
    log(`مش الساعة 1 بتوقيت القاهرة (دلوقتي ${cairoHour(new Date())}:00) — تخطي.`);
    return 0;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const passphrase = process.env.BACKUP_PASSPHRASE;
  const allowPlaintext = process.env.BACKUP_ALLOW_PLAINTEXT === '1';

  if (!passphrase && !allowPlaintext) {
    throw new Error('BACKUP_PASSPHRASE مش مضبوطة — ممنوع نطلّع نسخة فيها بيانات طلبة من غير تشفير. لو متعمّد: BACKUP_ALLOW_PLAINTEXT=1');
  }

  log('1/4 سحب البيانات من Supabase…');
  const dump = await dumpAll({ url: supabaseUrl, key: supabaseKey, log });
  log(`   خلص في ${dump.durationMs} ms — إجمالي ${Object.values(dump.counts).reduce((a, b) => a + b, 0)} صف.`);

  const now = new Date();
  const payload = {
    format: 'ict-backup-v1',
    createdAt: now.toISOString(),
    cairo: `${cairoDate(now)} ${cairoTime(now)}`,
    source: { project: 'ict-sec1', host: safeHost(supabaseUrl), tables: TABLES.map(entry => entry.table) },
    counts: dump.counts,
    totals: dump.totals,
    durationMs: dump.durationMs,
    tables: dump.tables
  };

  const json = Buffer.from(JSON.stringify(payload), 'utf8');
  const gzipped = gzipSync(json, { level: 9 });

  const stamp = `${cairoDate(now)}_${cairoTime(now).replace(':', '')}`;
  const encoded = passphrase ? encrypt(gzipped, passphrase) : gzipped;
  const filename = `${FILE_PREFIX}${stamp}.json.gz${passphrase ? '.enc' : ''}`;

  log(`2/4 تجهيز الملف: ${filename} — ${humanSize(gzipped.length)} → ${humanSize(encoded.length)}`);

  mkdirSync(BACKUP_DIR, { recursive: true });
  const localFile = path.join(BACKUP_DIR, filename);
  writeFileSync(localFile, encoded);
  const removedLocal = pruneLocal();
  log(`   نسخة محلية: ${localFile}${removedLocal.length ? ` (اتمسح ${removedLocal.length} قديمة)` : ''}`);

  // تحقق فوري: بنقرا الملف من الديسك ونفكّه ونقارن الأرقام.
  // لو حصلت أي مشكلة (تشفير/ضغط/كتابة) بنوقف قبل ما نرفع نسخة تالفة.
  verifyBackupFile(localFile, passphrase, dump.counts);
  log('   ✅ تحقق: الملف بيتفك والأرقام مطابقة.');

  const summary = {
    filename,
    createdAt: payload.createdAt,
    cairo: payload.cairo,
    counts: payload.counts,
    size: humanSize(encoded.length),
    encrypted: Boolean(passphrase),
    verified: true,
    targets: {}
  };

  log(localOnly ? '3/4 وضع محلي فقط — تخطي الرفع.' : '3/4 الرفع على الوجهات…');
  const results = localOnly
    ? [{ status: 'fulfilled', value: { name: 'الرفع', skipped: true, reason: 'وضع النسخة المحلية فقط (--local-only)' } }]
    : await Promise.allSettled([
        run('تيليجرام', () => (noTelegram
          ? { skipped: true, reason: 'متخطّى (--no-telegram)' }
          : sendToTelegram({
              token: process.env.TELEGRAM_BOT_TOKEN,
              chatId: process.env.TELEGRAM_CHAT_ID,
              filename,
              bytes: encoded,
              caption: telegramCaption(payload, encoded.length, Boolean(passphrase))
            }))),
        run('Google Drive', () => driveUpload(filename, encoded, summary, localFile)),
        run('الإيميل', () => sendMail({
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.BACKUP_EMAIL_FROM,
          to: process.env.BACKUP_EMAIL_TO,
          subject: `نسخة احتياطية ICT — ${cairoDate(now)}`,
          html: emailBody(payload, filename, encoded.length, Boolean(passphrase)),
          filename,
          bytes: encoded
        }))
      ]);

  for (const result of results) {
    const value = result.status === 'fulfilled' ? result.value : { ok: false, error: String(result.reason?.message || result.reason) };
    summary.targets[value.name] = value.ok ? { ok: true, ...value } : value.skipped ? { skipped: true, reason: value.reason } : { ok: false, error: value.error };
  }

  log('4/4 النتيجة:');
  for (const [name, state] of Object.entries(summary.targets)) {
    if (state.skipped) log(`   ${name}: متخطّى (${state.reason})`);
    else if (state.ok) log(`   ${name}: ✅`);
    else log(`   ${name}: ❌ ${state.error}`);
  }
  log(`   المدة الكلية: ${((Date.now() - startedAt) / 1000).toFixed(1)} ثانية.`);

  await writeStepSummary(summary);
  console.log(JSON.stringify(summary, null, 2));

  const failed = Object.values(summary.targets).filter(state => state.ok === false);
  if (failed.length) {
    log(`⚠️ فشل ${failed.length} وجهة — النسخة المحلية اتحفظت في ${localFile} ونسخة GitHub Actions محفوظة كـ artifact.`);
    return 1;
  }
  return 0;
}

async function run(name, fn) {
  try {
    const value = await fn();
    return { name, ...value };
  } catch (error) {
    return { name, ok: false, error: String(error?.message || error) };
  }
}

async function driveUpload(filename, bytes, summary, localFile) {
  // 1) rclone (OAuth بحسابك الشخصي) — ده المسار المفضّل لأنه بيشتغل مع My Drive.
  const remote = process.env.RCLONE_REMOTE;
  if (remote) {
    const folder = process.env.RCLONE_FOLDER || '';
    const uploaded = await rcloneUpload({ remote, folder, localFile, filename });
    let pruned = { deleted: [] };
    try {
      pruned = await rclonePrune({ remote, folder, keepDays: DRIVE_KEEP_DAYS, prefix: FILE_PREFIX });
    } catch (error) {
      log(`   تحذير: تنضيف Drive القديم فشل (${error.message}) — الملف الجديد اترفع عادي.`);
    }
    summary.driveLink = `https://drive.google.com/drive/folders/${process.env.GDRIVE_FOLDER_ID || ''}`.replace(/\/$/, '');
    return { ok: true, ...uploaded, pruned: pruned.deleted.length };
  }

  // 2) حساب خدمة (Service Account) — بيشتغل بس مع Shared Drives (Workspace).
  const raw = process.env.GDRIVE_SA_JSON;
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!raw) return { skipped: true, reason: 'RCLONE_REMOTE أو GDRIVE_SA_JSON مش مضبوطين' };

  const account = loadServiceAccount(raw);
  const accessToken = await getAccessToken(account);
  const uploaded = await uploadToDrive({ accessToken, folderId, filename, bytes });
  let pruned = { deleted: [] };
  try {
    pruned = await pruneDrive({ accessToken, folderId, keepDays: DRIVE_KEEP_DAYS, prefix: FILE_PREFIX });
  } catch (error) {
    log(`   تحذير: تنضيف Drive القديم فشل (${error.message}) — الملف الجديد اترفع عادي.`);
  }
  summary.driveLink = uploaded.link;
  return { ok: true, ...uploaded, pruned: pruned.deleted.length };
}

/**
 * يتأكد إن الملف اللي اتكتب فعلًا بيتفك وبيحتوي نفس عدد الصفوف.
 * أي خلل هنا معناه إن النسخة مش صالحة — فبنوقف بدل ما نرفعها.
 */
function verifyBackupFile(filePath, passphrase, expectedCounts) {
  const bytes = readFileSync(filePath);
  let plain;
  try {
    plain = passphrase ? decrypt(bytes, passphrase) : bytes;
  } catch (error) {
    throw new Error(`التحقق فشل — النسخة الجديدة مش بتتفك: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(gunzipSync(plain).toString('utf8'));
  } catch (error) {
    throw new Error(`التحقق فشل — محتوى النسخة مش JSON صالح: ${error.message}`);
  }

  if (parsed.format !== 'ict-backup-v1') {
    throw new Error(`التحقق فشل — صيغة غير متوقعة: ${parsed.format}`);
  }

  for (const [table, expected] of Object.entries(expectedCounts)) {
    const actual = Array.isArray(parsed.tables?.[table]) ? parsed.tables[table].length : -1;
    if (actual !== expected) {
      throw new Error(`التحقق فشل — جدول ${table}: متوقع ${expected} صف، الموجود ${actual}.`);
    }
  }

  return true;
}

function pruneLocal() {
  const removed = [];
  const cutoff = Date.now() - LOCAL_KEEP_DAYS * 24 * 60 * 60 * 1000;
  for (const name of readdirSync(BACKUP_DIR)) {
    if (!name.startsWith(FILE_PREFIX)) continue;
    const file = path.join(BACKUP_DIR, name);
    try {
      if (statSync(file).mtimeMs < cutoff) {
        unlinkSync(file);
        removed.push(name);
      }
    } catch {
      /* ملف مقفول أو متمسوح — مش مشكلة */
    }
  }
  return removed;
}

const safeHost = value => {
  try {
    return new URL(value).host;
  } catch {
    return 'unknown';
  }
};

function telegramCaption(payload, size, encrypted) {
  return [
    `🗄️ نسخة احتياطية ICT — ${payload.cairo}`,
    `الطلاب: ${payload.counts.students ?? 0} · الأجهزة: ${payload.counts.devices ?? 0} · الأحداث: ${payload.counts.events ?? 0}`,
    `الحجم: ${humanSize(size)}${encrypted ? ' · مشفّرة ✅' : ' · ⚠️ غير مشفّرة'}`
  ].join('\n');
}

function emailBody(payload, filename, size, encrypted) {
  const rows = Object.entries(payload.counts)
    .map(([table, count]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${table}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${count}</td></tr>`)
    .join('');
  return `
  <div dir="rtl" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.8;color:#1f2937">
    <h2 style="margin:0 0 8px">🗄️ نسخة احتياطية لقاعدة بيانات منصة ICT</h2>
    <p style="margin:0 0 16px;color:#6b7280">${payload.cairo} (توقيت القاهرة)</p>
    <table style="border-collapse:collapse;margin-bottom:16px">
      <tr><th style="text-align:right;padding:6px 12px;background:#f3f4f6">الجدول</th><th style="text-align:right;padding:6px 12px;background:#f3f4f6">عدد الصفوف</th></tr>
      ${rows}
    </table>
    <p style="margin:0 0 8px">الملف: <code>${filename}</code> — ${humanSize(size)}</p>
    <p style="margin:0;color:#b45309">${encrypted ? '🔐 الملف مشفّر — محتاج BACKUP_PASSPHRASE لفكّه (شوف tools/backup/README.md).' : '⚠️ الملف مش مشفّر.'}</p>
  </div>`;
}

async function writeStepSummary(summary) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const lines = [
    '## 🗄️ Backup',
    '',
    `- **الملف:** \`${summary.filename}\` (${summary.size})`,
    `- **الوقت:** ${summary.cairo} (توقيت القاهرة)`,
    `- **الجداول:** ${Object.entries(summary.counts).map(([table, count]) => `${table}=${count}`).join(' · ')}`,
    `- **التشفير:** ${summary.encrypted ? 'AES-256-GCM ✅' : '⚠️ غير مشفّرة'}`,
    '',
    '| الوجهة | النتيجة |',
    '|---|---|',
    ...Object.entries(summary.targets).map(([name, state]) =>
      `| ${name} | ${state.skipped ? `متخطّى — ${state.reason}` : state.ok ? '✅' : `❌ ${state.error}`} |`)
  ];
  try {
    appendFileSync(file, `${lines.join('\n')}\n`);
  } catch {
    /* الـ summary مش إجباري */
  }
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('❌ فشل الباك أب:', error?.message || error);
    process.exit(1);
  });
