# دكيومنتيشن منصة ICT — أولى ثانوي · الترم الأول

> آخر تحديث: 2026-10-19
> المشروع: `E:\simulation\ict-sec1` · الريبو: `shadi2017/ict-sec1` · الإنتاج: <https://ict-sec1.vercel.app>
>
> 🔐 **الباسوردات والمفاتيح** موجودة في ملف منفصل: [`CREDENTIALS.local.md`](CREDENTIALS.local.md) — مستثنى من Git وممنوع يترفع أو يتشير.

---

## 1) نظرة عامة

منصة تعليمية ثنائية اللغة (عربي/إنجليزي) لمادة ICT للصف الأول الثانوي — الترم الأول.
الواجهة **SPA ثابتة** (HTML/CSS/JS من غير build step)، والـ API **Node** بيشتغل بطريقتين:

| البيئة | طريقة التشغيل |
|---|---|
| محلي / Render | `server.mjs` — سيرفر Node واحد بيقدّم الملفات الثابتة + `/api/*` |
| Vercel (الإنتاج) | ملفات ثابتة من جذر الريبو + Serverless Functions في `api/**/*.js` |

الاتنين بيستخدموا نفس الكود المشترك في `lib/`.

### المكوّنات الأساسية
- **11 وحدة / 40 درس** + اختبار قصير بعد كل درس.
- **10 معامل تفاعلية** + **5 ألعاب** + **29 مشروع** بديمو لكل واحد.
- **المدرّس الذكي** (Gemini) — وضع متصل، ووضع محلي تلقائي لو مفيش مفتاح.
- **حسابات الطلاب**: تسجيل → انتظار تفعيل المدرس → دخول، بحد أجهزة 2.
- **لوحة المدرس**: الحسابات، التفعيل/الإيقاف، تجديد كلمة المرور، تصفير الأجهزة، الحذف، والتحليلات.

---

## 2) الروابط المهمة

| الحاجة | الرابط |
|---|---|
| الموقع (الإنتاج) | https://ict-sec1.vercel.app |
| فحص صحة السيرفر | https://ict-sec1.vercel.app/api/health |
| الريبو على GitHub | https://github.com/shadi2017/ict-sec1 |
| لوحة Vercel | https://vercel.com/dashboard → مشروع `ict-sec1` |
| مشروع Supabase | https://supabase.com/dashboard/project/bbqwnmwkoofosrhrjass |
| SQL Editor (لتشغيل الـ schema) | Supabase → SQL Editor → New query |
| مفاتيح Supabase | Supabase → Project Settings → API |
| مفتاح Gemini | https://aistudio.google.com/apikey |
| Render (اختياري) | https://dashboard.render.com (الملف `render.yaml` جاهز) |

### حالة الإنتاج الحالية (متحقّق منها)
```json
GET https://ict-sec1.vercel.app/api/health
{"ready":true,"accounts":true,"backend":"supabase","admin":true}
```
- `ready` = مفتاح Gemini مضبوط.
- `accounts` = Supabase مضبوط.
- `backend` = `supabase`.
- `admin` = `ADMIN_PASSWORD` موجود.

---

## 3) الدخول والحسابات

### أ) الطالب
- الموقع نفسه: https://ict-sec1.vercel.app
- التسجيل: الاسم + رقم موبايل (11 رقم يبدأ بـ `01`) + الصف + كلمة مرور (6+).
- بعد التسجيل الحساب بيبقى **`pending`** والمنصة مقفولة لحد ما المدرس يفعّله.
- حد الأجهزة: **2**. ثالث جهاز يدخل → الأقدم بيتخرج تلقائيًا.
- تسجيل خروج: من الشريط العلوي أو الملف الشخصي.

### ب) المدرس (لوحة المدرس)
- من الموقع: دوس لينك **«لوحة المدرس»** في الهيدر (`#adminLink`) أو من شاشة حساب الطالب.
- أو من الرابط المباشر: https://ict-sec1.vercel.app/#admin — **ملاحظة:** الـ SPA مش بيعتمد على الـ hash، فالأضمن تدوس اللينك في الواجهة.
- بيانات الدخول: `ADMIN_USER` + `ADMIN_PASSWORD` (القيم في `CREDENTIALS.local.md`).
- اللوحة فيها: قائمة الطلاب + بحث/فلترة، تفعيل/إيقاف/تعليق، تصفير الأجهزة، تجديد كلمة المرور (توليد تلقائي أو يدوي)، حذف، وتبويب التحليلات.

### ج) حساب التجربة
| البند | القيمة |
|---|---|
| الموبايل | `01555550001` |
| الباسورد | `test12345` |
| الاسم | طالب تجربة الموقع |
| الحالة | `active` (مفعّل) |

> ⚠️ **مهم:** باسورد الأدمن المحلي (اللي في `.env`) **مش مطابق** للقيمة على Vercel — جرّبت أدخل بيه على prod ورجع `401`. يعني لازم تحدد القيمة الصح من Vercel → Settings → Environment Variables، أو تعمل Redeploy بقيمة جديدة. التفاصيل في `CREDENTIALS.local.md`.

---

## 4) هيكل المشروع (فين كل حاجة)

```
ict-sec1/
├── index.html            SPA shell + ترتيب تحميل السكربتات
├── styles.css            كل التنسيقات (ثيمات، RTL، معامل، ألعاب، شات)
├── data.js               نصوص الواجهة (ar/en) + هيكل الصفوف/الترمات
├── data-units-1.js       الوحدات 1–4 (المحتوى العربي)
├── data-units-2.js       الوحدات 5–8
├── data-units-3.js       الوحدات 9–11 (+ دروس بايثون)
├── data-en-1.js          الترجمة الإنجليزية للوحدات 1–4
├── data-en-2.js          الترجمة الإنجليزية للوحدات 5–8
├── data-en-3.js          الترجمة الإنجليزية للوحدات 9–11
├── data-en-projects.js   الترجمة الإنجليزية للمشاريع
├── labs.js               المعامل التفاعلية (window.ICT_LABS)
├── games.js              الألعاب (window.ICT_GAMES)
├── projects.js           بنك المشاريع (window.ICT_PROJECTS)
├── demos.js              ديمو المشاريع (window.ICT_PROJECT_DEMOS)
├── engine.js             مفسّر بايثون مصغّر (window.ICTPython.run)
├── app.js                منطق الواجهة (render-from-state) + window.ICT
├── auth.js               بوابة الحسابات: تسجيل/دخول/انتظار/مزامنة + فتح لوحة المدرس
├── admin.js              لوحة المدرس: الحسابات + التحليلات + تجديد كلمة المرور
├── supabase-schema.sql   جداول students / devices / events (تُنفّذ مرة واحدة)
├── server.mjs            سيرفر Node محلي/Render: ثابت + /api/*
├── lib/
│   ├── tutor.mjs         منطق المدرّس الذكي (Gemini/OpenAI) + قراءة .env + rate limit
│   ├── store.mjs         طبقة البيانات: Supabase REST أو ملف JSON محلي
│   ├── auth.mjs          scrypt، الجلسات، الكوكيز، توقيع جلسة الأدمن، rate limit
│   └── api.mjs           موجّه الـ API (منطق واحد لـ Vercel و Node)
├── api/
│   ├── health.js         GET /api/health
│   ├── tutor.js          POST /api/tutor
│   ├── auth/             register · login · logout · me · sync
│   └── admin/            login · logout · session · students · analytics
├── package.json          npm start
├── .env                  الأسرار المحلية (متجاهل في git)
├── .env.example          قالب المفاتيح
├── vercel.json           framework=null (إجباري) + maxDuration=30
├── render.yaml           نشر Render (Blueprint)
├── .vercelignore         ملفات مش محتاجة تترفع
└── DOCUMENTATION.md      الملف ده
```

### فين البيانات بتتخزن؟
| الوضع | المكان |
|---|---|
| الإنتاج (Vercel) | **Supabase Postgres** عبر REST (`store.mjs`) |
| محلي مع Supabase في `.env` | نفس قاعدة بيانات الإنتاج (احترس!) |
| محلي بدون Supabase | ملف `.data/ict-db.json` (متجاهل في git) |
| المتصفح | `localStorage`: `ict-progress-v2` · `ict-awarded` · `ict-points` · `ict-certs` · `ict-name` · `ict-theme` · `ict-lang` |

> ⚠️ سيرفرك المحلي حاليًا شغّال **بـ Supabase** (نفس قاعدة بيانات prod) لأن `.env` فيه `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`. أي تجربة محلية بتأثر على بيانات الإنتاج.

---

## 5) التشغيل المحلي

```powershell
cd E:\simulation\ict-sec1
npm start            # node server.mjs
# → http://127.0.0.1:4173
```

- المنفذ من `PORT` في `.env` (حاليًا `4173`).
- `server.mjs` بيقرا `.env` من مجلد المشروع.
- لو عايز تجرب من غير ما تلمس بيانات الإنتاج: علّق `SUPABASE_URL` و`SUPABASE_SERVICE_KEY` في `.env` → هيشتغل على `.data/ict-db.json`.
- حاليًا في **أكثر من عملية `node server.mjs`** شغالة (واحدة منهم من 5:33 م والتانية من 6:52 م)؛ سيب واحدة بس عشان ما يحصلش تعارض.

---

## 6) النشر

### Vercel (الإنتاج الحالي)
1. الريبو `shadi2017/ict-sec1` مربوط بمشروع Vercel.
2. كل `git push` على `main` → **Redeploy تلقائي**.
3. **Environment Variables المطلوبة** (Settings → Environment Variables ثم Redeploy):

| المتغير | إجباري؟ | الغرض |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | المدرّس الذكي |
| `GEMINI_MODEL` | اختياري | الافتراضي `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODELS` | اختياري | بدائل لو الموديل خلص/وقف |
| `TUTOR_DAILY_LIMIT` | اختياري | حد أسئلة المدرّس في اليوم (افتراضي 500) |
| `SUPABASE_URL` | ✅ للحسابات | رابط مشروع Supabase |
| `SUPABASE_SERVICE_KEY` | ✅ للحسابات | service_role key (سري) |
| `ADMIN_USER` | اختياري | افتراضي `admin` |
| `ADMIN_PASSWORD` | ✅ للوحة | باسورد المدرس |
| `SESSION_SECRET` | ✅ | توقيع جلسة الأدمن (تغييره يخرج الأدمن فورًا) |
| `NODE_ENV` | اختياري | `production` |

4. **`vercel.json` فيه `"framework": null` — إجباري.** لو Vercel اكتشف إطار عمل، هيتوقع `public/` أو `dist/` وكل الروابط هترجع `500 FUNCTION_INVOCATION_FAILED`.
   - لو حصل: Settings → Build & Development Settings → **Framework Preset = Other**، **Root Directory** فاضية، **Output Directory** فاضية.

### Render (بديل، غير منشور حاليًا)
- `render.yaml` جاهز: New → Blueprint → اختار الريبو → حط `GEMINI_API_KEY`.
- بيعمل health check على `/api/health`، والخطة المجانية بتنام بعد خمول.

---

## 7) التكاملات (Integrations)

### أ) Supabase (قاعدة البيانات + الحسابات)
- **Project ref:** `bbqwnmwkoofosrhrjass`
- **الاتصال:** REST مباشر (`/rest/v1/...`) باستخدام `service_role` key — مفيش SDK.
- **الـ schema:** `supabase-schema.sql` (شغّله مرة واحدة في SQL Editor).

| الجدول | الغرض | ملاحظات |
|---|---|---|
| `students` | حسابات الطلاب | `phone` unique · `status` = pending/active/blocked · `pass_hash` (scrypt) · `progress` jsonb |
| `devices` | جلسات الأجهزة | `token` unique · `fp` بصمة · `revoked` · بحد أقصى **2** لكل طالب |
| `events` | أحداث التحليلات | `kind` = login/lesson/quiz/lab/game/demo/tutor/unit/register · `value` · `meta` |

- **الأمان:** RLS مفعّل على الجداول الثلاثة **من غير أي policies** → محدش يوصل غير بمفتاح `service_role` اللي على السيرفر بس.
- الصفحات: `sbAll()` بتجيب النتائج على صفحات 1000 صف عشان أرقام التحليلات تطلع صح.

### ب) Gemini (المدرّس الذكي)
- **الموديل الأساسي:** `gemini-3.8-flash`
- **البدائل الافتراضية:** `gemini-3.5-flash, gemini-3.6-flash, gemini-flash-latest, gemini-3.1-flash-lite, gemini-2.5-flash`
- **السلوك:** لو الموديل رجّع 404/429/5xx بينتقل للي بعده، وبيتذكر آخر موديل شغّال.
- **الحدود:**
  - 20 سؤال/دقيقة لكل IP.
  - 500 سؤال/يوم افتراضيًا (`TUTOR_DAILY_LIMIT`).
  - Timeout 30 ثانية (Vercel function max 30s).
- **الأوضاع:** `lesson` · `explain` · `example` · `summary` · `chat`.
- **آخر موديل شغّال** بيتخزن في الذاكرة فقط (بيرجع للأساسي مع كل cold start).

### ج) GitHub
- `origin` = https://github.com/shadi2017/ict-sec1.git
- الفرع الرئيسي: `main` — أي push بيعمل deploy.
- `.env` و`.data/` و`*.log` متجاهلين.

### د) النسخ الاحتياطي (Backup)
- **الموعد:** كل يوم **1:00 ص** بتوقيت القاهرة — GitHub Actions (`.github/workflows/backup.yml`).
  الـ cron بيتحدد بـ UTC (22:00 و23:00) والسكربت بيختار اللي يوافق 1 ص بالقاهرة (توقيت مصر الصيفي/الشتوي).
- **المصدر:** `students` + `devices` + `events` عبر Supabase REST (صفحات 1000 صف).
- **التشفير:** gzip ثم AES-256-GCM بمفتاح من `scrypt(BACKUP_PASSPHRASE)` — البيانات فيها
  أرقام موبايلات وهاشات، فمفيش نسخة بتطلع من غير تشفير.
- **الوجهات:** تليجرام (Bot API) · Google Drive (Service Account) · إيميل (Resend) ·
  نسخة محلية في `.data/backups/` (30 يوم) + Actions artifact (14 يوم).
- **الاسترجاع:** `node tools/backup/restore.mjs <الملف>` → `data.json` + `restore.sql`
  جاهز للصق في Supabase SQL Editor.
- **الأسرار:** كلها GitHub Secrets مش في الكود. الدليل الكامل: `tools/backup/README.md`.

---

## 8) الـ API (كل المسارات)

| Method | المسار | الوظيفة | محتاج |
|---|---|---|---|
| GET | `/api/health` | حالة السيرفر | — |
| POST | `/api/tutor` | سؤال للمدرّس الذكي | — |
| POST | `/api/auth/register` | تسجيل طالب | — |
| POST | `/api/auth/login` | دخول طالب | — |
| POST | `/api/auth/logout` | خروج (يلغي الجهاز) | جلسة طالب |
| GET | `/api/auth/me` | بيانات الطالب الحالي | جلسة طالب |
| POST | `/api/auth/sync` | مزامنة التقدم/النقاط/الأحداث | جلسة طالب مفعّلة |
| POST | `/api/admin/login` | دخول المدرس | — |
| POST | `/api/admin/logout` | خروج المدرس | جلسة أدمن |
| GET | `/api/admin/session` | حالة جلسة الأدمن | — |
| GET | `/api/admin/students` | قائمة الطلاب + الأجهزة | أدمن |
| POST | `/api/admin/students` | إجراء على طالب | أدمن |
| GET | `/api/admin/analytics` | التحليلات | أدمن |

**إجراءات `POST /api/admin/students`** (body: `{ id, action, ... }`):
`approve` · `block` · `pending` · `reset-devices` · `password` (بيرجّع الباسورد الجديد) · `note` · `delete`.

**أكواد الأخطاء المعروفة:** `authOff` · `tooFast` · `badLogin` · `needLogin` · `needActive` · `blocked` · `phoneTaken` · `notFound` · `needAdmin` · `adminWrong` · `adminOff`.

---

## 9) تدفّق الحسابات (خطوة بخطوة)

1. الطالب يسجّل → `students.status = pending` + حدث `register`.
2. المدرس يفتح اللوحة → **تفعيل** → `status = active`.
3. الطالب يدخل → `attachDevice`:
   - نفس البصمة → يحدّث التوكن (`last_seen`).
   - جهاز جديد ومعاهم أقل من 2 → يضيف.
   - جهاز تالت → يلغي **الأقدم** (`revoked = true`) ويرجّع `revoked` في الرد.
4. كل نشاط (درس/اختبار/معمل/لعبة/ديمو/سؤال) بيتسجل في `events`.
5. **تجديد كلمة المرور:** المدرس يولّد باسورد جديد → `pass_hash` يتحدّث → الباسورد يظهر للمدرس مرة واحدة → الطالب يدخل بيه.
6. **تسجيل الخروج:** بيلغي جهاز الجلسة (`revoked = true`).

---

## 10) الأمان

- كلمات المرور: **scrypt** بملح عشوائي (`scrypt$salt$hash`) — مفيش تخزين نص صريح.
- `pass_hash` مش بيتبعت للمتصفح أبدًا (`publicAccount`).
- جلسة الطالب: كوكي `ict_session` (HttpOnly, SameSite=Lax, Secure على HTTPS, 30 يوم).
- جلسة الأدمن: كوكي `ict_admin` موقّع HMAC-SHA256 بـ `SESSION_SECRET` (12 ساعة).
- `SUPABASE_SERVICE_KEY` و`GEMINI_API_KEY` على السيرفر فقط — مش في أي ملف بيترفع.
- Rate limiting في الذاكرة: تسجيل 10/دقيقة · دخول 12/دقيقة · أدمن 10/دقيقة · مدرّس 20/دقيقة.
- ⚠️ **ملاحظة أمانة:** ملفات المحتوى الثابتة (`data-units-*.js`) بتتقدّم كملفات عادية، فأي حد يقدر ينزّلها. المحمي فعليًا هو المنصة والـ APIs.

---

## 11) استكشاف الأخطاء

| المشكلة | السبب / الحل |
|---|---|
| `500 FUNCTION_INVOCATION_FAILED` على كل الروابط | `framework` في `vercel.json` لازم يكون `null` + Framework Preset = Other |
| المدرّس بيرد «وضع محلي» | الصفحة مفتوحة من `file://` أو سيرفر ثابت مش Node، أو `GEMINI_API_KEY` ناقص → Redeploy |
| `/api/health` بيرجّع `accounts:false` | `SUPABASE_URL` أو `SUPABASE_SERVICE_KEY` ناقص/غلط |
| `admin:false` | `ADMIN_PASSWORD` مش مضبوط على الاستضافة |
| لوحة المدرس بتقول «مش مفعّلة» | نفس السبب — `ADMIN_PASSWORD` ناقص |
| `adminWrong` على prod بس | قيمة `ADMIN_PASSWORD` على Vercel مختلفة عن `.env` المحلي |
| الحسابات اتقفلت فجأة | `status` اتغيّر من اللوحة، أو الجهاز اتلغى (حد الأجهزة) |
| التحليلات أرقامها ناقصة | لازم `supabase-schema.sql` يكون متشغّل بالكامل (بما فيه indexes) |

---

## 12) النسخ الاحتياطي اليومي

| الوجهة | إيه بيحصل | الإعداد |
|---|---|---|
| **محلي** | نسخة مشفّرة كل يوم 1:00 ص في `.data\backups\` (آخر 30 يوم) | مهمة Windows: `ICT-Daily-Backup` |
| **تيليجرام** | ملف مشفّر + ملخص يومي | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |
| **Google Drive** | ملف مشفّر في مجلد مخصص (آخر 30 يوم) | `GDRIVE_SA_JSON` + `GDRIVE_FOLDER_ID` |
| **GitHub Actions** | نسخة سحابية احتياطية (14 يوم) | `.github/workflows/backup.yml` |

- التشفير **AES-256-GCM** بمفتاح مشتق من `BACKUP_PASSPHRASE` — ممنوع رفع نسخة غير مشفّرة.
- الاسترجاع: `node tools/backup/restore.mjs <الملف>` → يطلّع `data.json` + `restore.sql`.
- التفاصيل الكاملة: [`tools/backup/README.md`](tools/backup/README.md).

```powershell
npm run backup:force      # نسخة + رفع على كل الوجهات المضبوطة
npm run backup:local      # نسخة محلية بس
npm run backup:restore    # استرجاع
```

---

## 13) الخطوات القادمة

- [x] الترجمة الإنجليزية الكاملة (دروس + اختبارات + مشاريع + معامل + ألعاب + ديمو).
- [x] الحسابات: تسجيل → تفعيل → حد جهازين → تحليلات → لوحة مدرس.
- [x] تجديد كلمة المرور + تسجيل الخروج.
- [x] تشغيل Supabase على النسخة المنشورة (prod شغال).
- [ ] ضبط `ADMIN_PASSWORD` على Vercel ليطابق المحلي (أو العكس).
- [ ] محتوى الترم الثاني للصف الأول الثانوي.
- [ ] الصف الثاني والثالث الثانوي.
- [ ] حذف ريبو `shadi2017/ICT` القديم (يدوي من GitHub).

---

## 14) آخر تغييرات (Git)

```
24dd6ae  Pick the data store at request time instead of load time
9984017  Redeploy to pick up Supabase and admin environment variables
7238997  Page through Supabase results so analytics counts stay correct
634323c  Add student accounts, teacher dashboard, device limit and password reset
6c556d6  Docs: explain the framework:null Vercel fix and how to debug 500 errors
```
