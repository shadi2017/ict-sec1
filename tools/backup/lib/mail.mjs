// إرسال النسخة على الإيميل عن طريق Resend (HTTP API — من غير مكتبات).
// مجاني: 100 إيميل/يوم، وبدون كارت.
// ملحوظة: لو المستخدم لسه على المرسل التجريبي onboarding@resend.dev
// لازم المستلم يكون نفس إيميل صاحب حساب Resend.
export async function sendMail({ apiKey, from, to, subject, html, filename, bytes }) {
  const recipients = (Array.isArray(to) ? to : String(to || '').split(','))
    .map(value => value.trim())
    .filter(Boolean);

  if (!apiKey || recipients.length === 0) {
    return { skipped: true, reason: 'RESEND_API_KEY أو BACKUP_EMAIL_TO مش مضبوطين' };
  }

  const payload = {
    from: from || 'ICT Backups <onboarding@resend.dev>',
    to: recipients,
    subject,
    html,
    attachments: [{ filename, content: bytes.toString('base64') }]
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`إرسال الإيميل فشل: ${data?.message || data?.error?.message || `HTTP ${response.status}`}`);
  }
  return { ok: true, id: data.id, to: recipients };
}
