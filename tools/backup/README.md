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

## الباكاب المحلي اليومي على الويندوز

بالإضافة للـ GitHub Actions، في **مهمة مجدولة على الجهاز** بتعمل نفس النسخة المشفّرة
كل يوم **1:00 صباحًا** (محلي + تليجرام + Drive) وتكتب سجل بالنتيجة.

| البند | القيمة |
|---|---|
| اسم المهمة | `ICT-Daily-Backup` |
| الموعد | يوميًا 1:00 ص (بتوقيت الجهاز) |
| الأمر | `tools\backup\run-local.ps1` |
| مكان النسخ | `.data\backups\` (آخر 30 يوم) |
| السجل | `.data\backups\backup.log` |

### أوامر مفيدة

```powershell
schtasks /Query /TN "ICT-Daily-Backup" /FO LIST /V   # الحالة وآخر نتيجة
schtasks /Run   /TN "ICT-Daily-Backup"               # تشغيل فوري
schtasks /Change /TN "ICT-Daily-Backup" /DISABLE     # إيقاف مؤقت
schtasks /Change /TN "ICT-Daily-Backup" /ENABLE      # رجوع
schtasks /Delete /TN "ICT-Daily-Backup" /F           # حذف
```

- المهمة بتشتغل **لما المستخدم يكون داخل (Interactive)**. لو الجهاز مقفول/مطفي،
  هتشتغل أول ما تدخل (StartWhenAvailable) — بس مش هتشتغل لو محدش مسجّل دخول.
- عشان تشتغل من غير تسجيل دخول لازم تتسجل بحساب فيه صلاحية
  (Task Scheduler → Run whether user is logged on or not) — وده محتاج Admin.
- النسخة المحلية **مشفّرة** بنفس `BACKUP_PASSPHRASE`.

### فحص الصحة (تنبيه تلقائي)

مهمة تانية اسمها `ICT-Backup-Health` بتشتغل كل يوم **10:00 ص** وبتتأكد إن:

- آخر نسخة محلية عمرها أقل من 30 ساعة.
- آخر نسخة **بتتفك فعلًا** (تشفير + gzip + JSON سليم).
- في نسخة على Drive عمرها أقل من 30 ساعة.

لو أي واحدة فشلت → **رسالة تنبيه على تليجرام** فيها السبب.
السجل: `.data\backups\health.log`

```powershell
schtasks /Query /TN "ICT-Backup-Health" /FO LIST /V
schtasks /Run   /TN "ICT-Backup-Health"
npm run backup:health
```

---

## الملفات

| الملف | وظيفته |
|---|---|
| `backup.mjs` | السكربت الرئيسي (سحب → تشفير → رفع) |
| `run-local.ps1` | مشغّل المهمة المجدولة (نسخة كاملة + سجل) |
| `health.mjs` | فحص الصحة (عمر النسخة + فك التشفير + وجودها على Drive) |
| `run-health.ps1` | مشغّل فحص الصحة للمهمة المجدولة |
| `telegram-id.mjs` | مساعد لجلب `TELEGRAM_CHAT_ID` من التوكن (`npm run telegram:id`) |
| `drive-setup.mjs` | بديل لحساب الخدمة (Shared Drives فقط) — `npm run backup:drive` |
| `lib/dump.mjs` | قراءة جداول Supabase عبر REST |
| `lib/box.mjs` | تشفير/فك تشفير AES-256-GCM + scrypt |
| `lib/telegram.mjs` | إرسال الملف على تليجرام |
| `lib/rclone.mjs` | رفع/تنضيف Drive عبر rclone (OAuth) |
| `lib/drive.mjs` | رفع/تنضيف Google Drive بحساب خدمة (Shared Drives) |
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

### 4) Google Drive (rclone — OAuth بحسابك)

> ⚠️ **حساب الخدمة (Service Account) مش هينفع** مع الـ My Drive العادي — جوجل بترفض
> الرفع منه (`storageQuotaExceeded`) لأنه مالوش مساحة تخزين. الحل ده بيشتغل بس مع
> **Shared Drives** في Google Workspace المدفوع.
> عشان كده بنستخدم **rclone** بحسابك الشخصي.

1. نزّل rclone:

   ```powershell
   scoop install rclone
   ```

2. في Google Drive: اعمل مجلد اسمه `ICT Backups`.

3. سجّل الدخول مرة واحدة (هيفتح المتصفح):

   ```powershell
   rclone config create gdrive drive scope=drive
   rclone config reconnect gdrive:
   ```

   - لو سألك عن `shared client_id` اختار **Yes** (`y`).
   - في المتصفح اختار حساب جوجل بتاع الباكاب → **Allow**.
   - التأكيد: `rclone lsd gdrive:` لازم يعرض مجلداتك.

4. في `.env`:

   ```
   RCLONE_REMOTE=gdrive
   RCLONE_FOLDER=ICT Backups
   ```

5. جرّب:

   ```powershell
   npm run backup:force
   ```

- التوكن محفوظ في `%APPDATA%\rclone\rclone.conf` وبيتجدد لوحده — مش محتاج تعمل
  الدخول ده تاني.
- **GitHub Actions:** ضيف secret اسمه `RCLONE_CONF_B64` = base64 لملف `rclone.conf`
  (`[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:APPDATA\rclone\rclone.conf"))`)
  + `RCLONE_REMOTE` + `RCLONE_FOLDER`.

> ملحوظة: rclone بيستخدم حاليًا الـ client_id المشترك بتاعه، وجوجل هتوقفه خلال 2026.
> لو الرفع وقف فجأة، اتبع [الصفحة دي](https://rclone.org/drive/#making-your-own-client-id)
> لإنشاء client_id خاص، وبعدها `rclone config update gdrive client_id=... client_secret=...`.

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
| `RCLONE_CONF_B64` | اختياري | ملف rclone.conf كـ base64 (للرفع على Drive من GitHub) |
| `RCLONE_REMOTE` | اختياري | اسم الريموت (مثلاً `gdrive`) |
| `RCLONE_FOLDER` | اختياري | اسم المجلد (مثلاً `ICT Backups`) |
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
npm run backup:local
```
لو مفيش وجهات مضبوطة، هيقولك `متخطّى` ويحفظ نسخة محلية بس.

### نسخة محلية فقط (من غير رفع)

```bash
npm run backup:local
```

المهمة المجدولة بتشغّل النسخة الكاملة (`--force`) — مش `--local-only`.

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
| `storageQuotaExceeded` | حساب خدمة على My Drive — استخدم rclone (خطوة 4) |
| `rclone: couldn't find section in config file` | `RCLONE_REMOTE` غلط أو `rclone config` ما اتعملهوش |
| `إرسال الإيميل فشل: 403` | الدومين مش متحقق، أو المستلم مش إيميل صاحب حساب Resend |
| `قراءة جدول … فشلت (401)` | `SUPABASE_SERVICE_KEY` غلط أو منتهي |
| الـ workflow بيقول `مش الساعة 1 … تخطي` | ده طبيعي: الـ cron بيشتغل مرتين، والنسخة بتحصل مرة واحدة |

## تغيير الموعد

- الموعد في `.github/workflows/backup.yml` (سطر `cron`) — بتوقيت UTC.
- فحص الساعة نفسها في `backup.mjs` (دالة `cairoHour`) — لو غيّرت الموعد غيّرها كمان.
- مصر بتغيّر التوقيت صيفًا/شتويًا، عشان كده الـ cron بيشتغل `22:00` و`23:00` UTC
  والسكربت بيختار اللي يوافق 1:00 بالقاهرة.
