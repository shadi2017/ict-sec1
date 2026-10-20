# النسخ الاحتياطي اليومي (Database Backup)

نسخة كاملة من قاعدة بيانات Supabase كل يوم **الساعة 1:00 صباحًا بتوقيت القاهرة**، بتروح على
**تيليجرام + Google Drive + إيميل**، وكمان بتتحفظ جوّه GitHub كـ artifact لمدة 14 يوم.

الملف نفسه **مشفّر** (AES-256-GCM) قبل ما يسيب السيرفر، لأن الجداول فيها أرقام موبايلات
وهاشات كلمات مرور.

---

## إيه اللي بيحصل بالظبط

```
كل يوم 1:00 ص (القاهرة)
        │
        ▼
GitHub Actions  ──►  tools/backup/backup.mjs
        │
        ├─ 1. يقرا students + devices + events من Supabase (REST، صفحة صفحة)
        ├─ 2. يجمّعهم في JSON → gzip → تشفير AES-256-GCM
        ├─ 3. يحفظ نسخة محلية في .data/backups/  (آخر 30 يوم)
        └─ 4. يرفع نفس الملف على:
                 • تليجرام (ملف + ملخص)
                 • Google Drive (مجلد مخصص، آخر 30 يوم)
                 • إيميل (مرفق + جدول أرقام)
```

لو وجهة فشلت، الباقي بيكمّل، والـ workflow بيتعلّم ❌ عشان GitHub يبعتلك إشعار.
ولو كل الوجهات فشلت، الملف لسه موجود في `.data/backups/` وفي الـ artifact.

---

## الملفات

| الملف | وظيفته |
|---|---|
| `backup.mjs` | السكربت الرئيسي (سحب → تشفير → رفع) |
| `lib/dump.mjs` | قراءة جداول Supabase عبر REST |
| `lib/box.mjs` | تشفير/فك تشفير AES-256-GCM + scrypt |
| `lib/telegram.mjs` | إرسال الملف على تليجرام |
| `lib/drive.mjs` | رفع/تنضيف Google Drive بحساب خدمة |
| `lib/mail.mjs` | إرسال الإيميل عبر Resend |
| `restore.mjs` | فك التشفير + توليد `restore.sql` |
| `.github/workflows/backup.yml` | المجدول (cron) |

---

## الإعداد — مرة واحدة بس

### 1) مفاتيح Supabase

من Supabase → **Project Settings → API**:
- `SUPABASE_URL` = `https://xxxx.supabase.co`
- `SUPABASE_SERVICE_KEY` = مفتاح `service_role` (سرّي جدًا)

> نفس المفاتيح اللي في `.env` بتاعتك.

### 2) كلمة سر التشفير

أي نص طويل عشوائي (32 حرف كفاية). **لو ضاعت، النسخ القديمة مش هتتفتح** — احفظها في
مكان آمن (مدير باسوردات) مش بس في GitHub.

```
BACKUP_PASSPHRASE=اكتب-هنا-نص-طويل-عشوائي
```

### 3) تليجرام

1. افتح [@BotFather](https://t.me/BotFather) → `/newbot` → اختار اسم ويوزرنيم → هيديك توكن شكله
   `123456789:AAH...` → ده `TELEGRAM_BOT_TOKEN`.
2. افتح البوت اللي عملته وابعتله `/start`.
3. هات الـ chat id: افتح في المتصفح
   `https://api.telegram.org/bot<التوكن>/getUpdates` → دوّر على `"chat":{"id":123456789`.
   ده `TELEGRAM_CHAT_ID`.
   - لو عايز النسخ تروح لقناة: ضيف البوت أدمن في القناة، وحدد الـ id بتاعها (بيبدأ بـ `-100`).

### 4) Google Drive (حساب خدمة)

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project** → اسم أي حاجة.
2. **APIs & Services → Library** → دوّر على **Google Drive API** → **Enable**.
3. **IAM & Admin → Service Accounts → Create Service Account** → اسم أي حاجة → **Done**.
4. من الصفحة بتاعتها: **Keys → Add key → Create new key → JSON** → هيتنزّل ملف.
5. افتح الملف وهات `client_email` (شكله `xxx@xxx.iam.gserviceaccount.com`).
6. في Google Drive: اعمل مجلد جديد (مثلاً `ICT Backups`) → **Share** → الصق الإيميل ده →
   **Editor** → Send.
7. هات الـ folder id من رابط المجلد: `drive.google.com/drive/folders/`**`<ده هو>`**.
8. حوّل ملف الـ JSON لـ base64 (أسهل طريقة إنك تلصقه كسر واحد):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\key.json"))
   ```

   - `GDRIVE_SA_JSON` = الناتج (أو محتوى الـ JSON نفسه، السكربت بيقبل الاتنين).
   - `GDRIVE_FOLDER_ID` = الـ id بتاع المجلد.

> ⚠️ لو ظهر خطأ `storageQuotaExceeded`: تأكد إن المجلد **مشترك** مع الإيميل (خطوة 6)،
> وإن حساب الخدمة مش بيحاول يرفع على Drive بتاعه.

### 5) الإيميل (Resend)

1. [resend.com](https://resend.com) → سجّل بحساب GitHub (مجاني، بدون كارت).
2. **API Keys → Create API Key** → انسخه → `RESEND_API_KEY`.
3. `BACKUP_EMAIL_TO` = الإيميل اللي هيستقبل (ممكن أكتر من واحد مفصولين بفاصلة).
4. `BACKUP_EMAIL_FROM` (اختياري): سيبها فاضية وهيبعت من `onboarding@resend.dev` —
   **بس المرسل التجريبي ده بيبعت لصاحب حساب Resend بس**. عايز تبعت لأي إيميل تاني؟
   لازم تضيف الدومين بتاعك في **Domains** وتستنى التحقق.

### 6) أسرار GitHub

الريبو → **Settings → Secrets and variables → Actions → New repository secret**:

| الاسم | إجباري؟ | إيه هو |
|---|---|---|
| `SUPABASE_URL` | ✅ | رابط المشروع |
| `SUPABASE_SERVICE_KEY` | ✅ | مفتاح service_role |
| `BACKUP_PASSPHRASE` | ✅ | كلمة سر التشفير |
| `TELEGRAM_BOT_TOKEN` | اختياري | توكن البوت |
| `TELEGRAM_CHAT_ID` | اختياري | id الشات/القناة |
| `GDRIVE_SA_JSON` | اختياري | ملف حساب الخدمة (base64 أو JSON) |
| `GDRIVE_FOLDER_ID` | اختياري | id مجلد Drive |
| `RESEND_API_KEY` | اختياري | مفتاح Resend |
| `BACKUP_EMAIL_TO` | اختياري | المستلم |
| `BACKUP_EMAIL_FROM` | اختياري | المرسل |

الوجهات الاختيارية اللي مش هتحط مفاتيحها بتتخطى بهدوء.

> 🔁 **مهم:** السرّ اللي في GitHub بيتبدّل من مكان واحد بس. لو غيّرت
> `SUPABASE_SERVICE_KEY` في Supabase، غيّّره هنا كمان وإلا الباك أب هيفشل.

---

## تجربة فورية

### من GitHub (الطريقة اللي هتستخدمها)

**Actions → Database backup → Run workflow**.
بيتخطى فحص الساعة لما تشغّله يدوي.

### من جهازك

1. ضيف المتغيّرات في `.env` (ملف مستثنى من Git).
2. شغّل:

```bash
npm run backup:force
```

### اختبار بدون رفع

```bash
npm run backup:force
```
لو مفيش وجهات مضبوطة، هيقولك `متخطّى` ويحفظ نسخة محلية بس.

---

## الاسترجاع

```bash
node tools/backup/restore.mjs .data/backups/ict-db-2026-10-21_0100.json.gz.enc
# أو لو كلمة السر مش في البيئة:
node tools/backup/restore.mjs <الملف> --pass "كلمة السر"
```

هيطلعلك ملفين في نفس المجلد:
- `data.json` — البيانات كاملة (للقراءة أو المعالجة).
- `restore.sql` — أوامر `insert … on conflict do nothing` جاهزة.

**طريقة الاسترجاع على Supabase:** افتح **SQL Editor → New query** → الصق محتوى
`restore.sql` → **Run**. آمن إنك تشغّله أكتر من مرة (مش هيكرّر صفوف).

الملف فيه كل الأعمدة بما فيها `id` و`created_at`، وبيرجّع عدّاد `events` لآخر قيمة.

---

## الأمان

- **مشفّر دايمًا** قبل الرفع. المفاتيح مش بتتكتب في الكود ولا في الملف.
- الـ `service_role` بيقرا كل حاجة، فمتحطّهوش في أي مكان عام.
- تليجرام/الإيميل/درايف كلهم بيستقبلوا **ملف مشفّر**، مش JSON مكشوف.
- لو حسّيت إن نسخة اتسرّبت: غيّر `BACKUP_PASSPHRASE` (النسخ القديمة هتفضل بسرّها القديم)
  وغيّر مفاتيح Supabase.
- `.data/` و`.env` مستثنيين من Git.

---

## استكشاف الأخطاء

| الأعراض | السبب المحتمل |
|---|---|
| `TELEGRAM … chat not found` | مبعتتش `/start` للبوت، أو الـ chat id غلط |
| `Google رفض توثيق حساب الخدمة` | الـ JSON ناقص/تالف أو Drive API مش مفعّل |
| `رفع الملف على Drive فشل: storageQuotaExceeded` | المجلد مش مشترك مع إيميل حساب الخدمة |
| `إرسال الإيميل فشل: 403` | الدومين مش متحقق، أو المستلم مش إيميل صاحب حساب Resend |
| `قراءة جدول … فشلت (401)` | `SUPABASE_SERVICE_KEY` غلط أو منتهي |
| الـ workflow بيقول `مش الساعة 1 … تخطي` | ده طبيعي: الـ cron بيشتغل مرتين، والنسخة بتحصل مرة واحدة |

## تغيير الموعد

- الموعد في `.github/workflows/backup.yml` (سطر `cron`) — بتوقيت UTC.
- فحص الساعة نفسها في `backup.mjs` (دالة `cairoHour`) — لو غيّرت الموعد غيّرها كمان.
- مصر بتغيّر التوقيت صيفًا/شتويًا، عشان كده الـ cron بيشتغل `22:00` و`23:00` UTC
  والسكربت بيختار اللي يوافق 1:00 بالقاهرة.
