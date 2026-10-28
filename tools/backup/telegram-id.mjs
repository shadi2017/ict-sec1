#!/usr/bin/env node
// ============================================================
//  مساعد صغير: بيجيب TELEGRAM_CHAT_ID بتاعك من التوكن.
//
//  الاستخدام:
//     npm run telegram:id
//
//  قبلها لازم:
//    1) TELEGRAM_BOT_TOKEN يكون في .env
//    2) تفتح البوت وتبعتله /start (أو أي رسالة)
// ============================================================
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN مش موجود في .env — حطه الأول.');
  process.exit(2);
}

const api = method => `https://api.telegram.org/bot${token}/${method}`;

const me = await fetch(api('getMe'), { signal: AbortSignal.timeout(20_000) })
  .then(response => response.json())
  .catch(() => null);

if (!me?.ok) {
  console.error(`❌ التوكن مش شغال: ${me?.description || 'رد غير متوقع'}`);
  process.exit(1);
}
console.log(`🤖 البوت: @${me.result.username} (${me.result.first_name})`);

const hook = await fetch(api('getWebhookInfo'), { signal: AbortSignal.timeout(20_000) })
  .then(response => response.json())
  .catch(() => null);

if (hook?.ok && hook.result?.url) {
  console.warn('⚠️ في webhook متضبط على البوت، وده بيمنع getUpdates.');
  console.warn('   لو مش محتاجه: افتح الرابط ده في المتصفح عشان تشيله:');
  console.warn(`   ${api('deleteWebhook')}`);
  process.exit(1);
}

const updates = await fetch(api('getUpdates?limit=100'), { signal: AbortSignal.timeout(30_000) })
  .then(response => response.json())
  .catch(() => null);

if (!updates?.ok) {
  console.error(`❌ getUpdates فشل: ${updates?.description || 'رد غير متوقع'}`);
  process.exit(1);
}

const chats = new Map();
for (const update of updates.result || []) {
  const chat =
    update.message?.chat ||
    update.edited_message?.chat ||
    update.channel_post?.chat ||
    update.my_chat_member?.chat ||
    update.chat_member?.chat;
  if (!chat) continue;
  const label = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || '';
  chats.set(chat.id, `${chat.id}  (${chat.type}${label ? ` — ${label}` : ''})`);
}

if (chats.size === 0) {
  console.log('');
  console.log('مفيش رسائل وصلت للبوت لسه.');
  console.log('افتح البوت نفسه في تليجرام (@' + me.result.username + ') وابعتله /start،');
  console.log('وبعدها شغّل الأمر ده تاني.');
  process.exit(0);
}

console.log('');
console.log('الـ chat id المتاح:');
for (const line of chats.values()) console.log(`   ${line}`);
console.log('');
console.log('حط الرقم اللي فوق في .env:');
console.log('   TELEGRAM_CHAT_ID=<الرقم>');
