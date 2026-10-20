// إرسال النسخة كملف على تليجرام (Bot API — sendDocument، حد 50 ميجا).
export async function sendToTelegram({ token, chatId, filename, bytes, caption }) {
  if (!token || !chatId) {
    return { skipped: true, reason: 'TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID مش مضبوطين' };
  }

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', String(caption || '').slice(0, 1000));
  form.append('document', new Blob([bytes], { type: 'application/octet-stream' }), filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120_000)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(`تيليجرام رفض الملف: ${data?.description || `HTTP ${response.status}`}`);
  }
  return { ok: true, messageId: data.result?.message_id, chatId: data.result?.chat?.id };
}

/** للتأكد إن التوكن والـ chat id شغالين قبل ما نعتمد عليهم. */
export async function checkTelegram({ token }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    signal: AbortSignal.timeout(20_000)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.description || `HTTP ${response.status}`);
  return data.result?.username;
}
