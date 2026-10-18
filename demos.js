/* ============================================================
   ICT Secondary — demos.js
   For every project there is a "demo" where the student sees the expected final result.
   Key = "unitId:projectIndex"
   Shape:
     { lab:'cipher' }                       -> reuse an existing lab
     { game:'guess' }                       -> reuse a game
     { html:fn, init:fn, noteAr, noteEn }   -> custom interactive demo
     { html:fn, noteAr, noteEn }            -> "what the output looks like" (visual mock)
   ============================================================ */
(function () {
  'use strict';

  function __L(ar, en) { return (window.ICT && window.ICT.getLang && window.ICT.getLang() === 'en') ? en : ar; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------------- preview builders (what the output looks like) ---------------- */
  function poster(title, rules) {
    return '<div class="mock"><div class="mock-title">🪧 ' + esc(title) + '</div><ul class="mock-list">' +
      rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>';
  }
  function doc(title, sections) {
    return '<div class="mock"><div class="mock-title">📄 ' + esc(title) + '</div>' +
      sections.map(function (s) { return '<div class="mock-sec"><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></div>'; }).join('') + '</div>';
  }
  function table(head, rows) {
    return '<div class="mock"><table class="mock-table"><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function timeline(steps) {
    return '<div class="mock"><div class="mock-timeline">' + steps.map(function (s, i) {
      return '<div class="tl-item"><span class="tl-dot">' + (i + 1) + '</span><div><b>' + esc(s[0]) + '</b><p>' + esc(s[1]) + '</p></div></div>';
    }).join('') + '</div></div>';
  }
  function flow(steps) {
    return '<div class="mock mock-flow">' + steps.map(function (s, i) {
      return (i ? '<span class="flow-arrow">←</span>' : '') + '<span class="flow-step">' + esc(s) + '</span>';
    }).join('') + '</div>';
  }
  function wire(title, blocks) {
    return '<div class="mock wire"><div class="wire-screen"><div class="wire-top">' + esc(title) + '</div>' +
      blocks.map(function (b) { return '<div class="wire-block">' + esc(b) + '</div>'; }).join('') + '</div></div>';
  }
  function grid(items) {
    return '<div class="mock mock-grid">' + items.map(function (it) {
      return '<div class="grid-cell"><span>' + it[0] + '</span><b>' + esc(it[1]) + '</b></div>';
    }).join('') + '</div>';
  }
  function compare(a, b) {
    return '<div class="mock mock-compare"><div class="cmp-col"><b>' + esc(a[0]) + '</b><ul class="mock-list">' +
      a[1].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="cmp-col"><b>' + esc(b[0]) + '</b><ul class="mock-list">' + b[1].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>';
  }
  function cards(items) {
    return '<div class="mock mock-cards">' + items.map(function (it) {
      return '<div class="mock-card"><span>' + it[0] + '</span><b>' + esc(it[1]) + '</b><p>' + esc(it[2]) + '</p></div>';
    }).join('') + '</div>';
  }
  function preview(inner) { return '<div class="demo-preview">' + inner + '</div>'; }

  /* ---------------- interactive helpers ---------------- */
  function stat(label, role) { return '<div class="stat"><span>' + esc(label) + '</span><b data-role="' + role + '">—</b></div>'; }

  var DEMOS = {

    /* ==================== Unit 1 ==================== */
    'u1:0': {
      noteAr: 'ده مشروع «من البيانات للمعرفة»: اكتب بياناتك واضغط «معالجة» تشوف إزاي الأرقام الخام بقت معلومة وقرار.',
      noteEn: 'This is the "From Data to Knowledge" project: type your data and press "Process" to see how raw numbers become information and a decision.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('بيانات خام (أرقام مفصولة بفواصل)', 'Raw data (numbers separated by commas)') + '</label>' +
          '<input class="lab-input" data-role="raw" value="15, 19, 12, 18, 20, 17"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="go">' + __L('⚙️ معالجة البيانات', '⚙️ Process the data') + '</button></div></div>' +
          '<div class="lab-out"><strong>' + __L('1) البيانات (خام):', '1) Data (raw):') + '</strong><div class="lab-result" data-role="data">—</div></div>' +
          '<div class="lab-out"><strong>' + __L('2) المعلومة (بعد المعالجة):', '2) Information (after processing):') + '</strong><div class="lab-result" data-role="info">—</div></div>' +
          '<div class="lab-out"><strong>' + __L('3) المعرفة (القرار):', '3) Knowledge (the decision):') + '</strong><div class="lab-result" data-role="know">—</div></div>';
      },
      init: function (root) {
        var run = function () {
          var nums = root.querySelector('[data-role="raw"]').value.split(/[\s,\u060C]+/).map(Number).filter(function (n) { return !isNaN(n); });
          if (!nums.length) { root.querySelector('[data-role="data"]').textContent = __L('اكتب بيانات صحيحة.', 'Enter valid data.'); return; }
          var sum = nums.reduce(function (a, b) { return a + b; }, 0), avg = sum / nums.length;
          var max = Math.max.apply(null, nums), min = Math.min.apply(null, nums);
          root.querySelector('[data-role="data"]').textContent = nums.join(__L(' ، ', ', ')) + '  (' + nums.length + __L(' قيمة)', ' values)');
          root.querySelector('[data-role="info"]').textContent = __L('المتوسط = ', 'Average = ') + (Math.round(avg * 10) / 10) + __L(' · الأعلى = ', ' · Highest = ') + max + __L(' · الأدنى = ', ' · Lowest = ') + min;
          var know = avg >= 85 ? __L('مستوى ممتاز، حافظ عليه.', 'Excellent level — keep it up.') : avg >= 70 ? __L('مستوى جيد، محتاجين تقوية بسيطة.', 'Good level — a little extra practice is needed.') : avg >= 50 ? __L('مستوى مقبول، اعمل خطة تحسين.', 'Acceptable level — make an improvement plan.') : __L('مستوى ضعيف، ابدأ بمراجعة الأساسيات.', 'Weak level — start by revising the basics.');
          root.querySelector('[data-role="know"]').textContent = know;
        };
        root.querySelector('[data-role="go"]').onclick = run; run();
      }
    },
    'u1:1': {
      noteAr: 'شكل بوستر «دليل الأخلاقيات» اللي المفروض تصمّمه.',
      noteEn: 'The layout of the "Ethics Guide" poster you are supposed to design.',
      html: function () {
        return preview(poster(__L('دليل الأخلاقيات الرقمية', 'Digital Ethics Guide'), [
          __L('لا تنشر بياناتك الشخصية أو عنوانك.', 'Do not publish your personal data or your address.'),
          __L('احترم خصوصية الآخرين ولا تنشر صورهم بغير إذن.', 'Respect other people\'s privacy and do not post their photos without permission.'),
          __L('تأكد من صحة المعلومة قبل ما تشاركها.', 'Check that the information is correct before you share it.'),
          __L('اذكر المصدر عند استخدام عمل غيرك.', 'Cite the source when you use someone else\'s work.'),
          __L('لا تتنمّر ولا تشترك في إساءة لأي شخص.', 'Do not bully anyone or take part in abusing them.'),
          __L('استخدم كلمة مرور قوية وما تشاركهاش.', 'Use a strong password and never share it.'),
          __L('بلّغ عن أي محتوى مؤذي أو غير قانوني.', 'Report any harmful or illegal content.')
        ]));
      }
    },
    'u1:2': {
      noteAr: 'ده مشروع «معرض الوسائط»: صنّف كل وسيط لنوعه الصح (تعبير / نقل / تخزين).',
      noteEn: 'This is the "Media Gallery" project: sort each medium into its correct type (expression / transmission / storage).',
      html: function () {
        /* the data-ans / data-c values are category identifiers (not display text):
           kept byte-identical via escapes so no literal Arabic sits outside noteAr / __L */
        var items = [['📝', __L('نص', 'Text'), '\u062A\u0639\u0628\u064A\u0631'], ['🖼️', __L('صورة', 'Image'), '\u062A\u0639\u0628\u064A\u0631'], ['🎥', __L('فيديو', 'Video'), '\u062A\u0639\u0628\u064A\u0631'], ['🧵', __L('كابل ألياف', 'Fibre cable'), '\u0646\u0642\u0644'], ['📡', __L('موجات راديو', 'Radio waves'), '\u0646\u0642\u0644'], ['💾', __L('فلاشة', 'Flash drive'), '\u062A\u062E\u0632\u064A\u0646'], ['💿', __L('قرص CD', 'CD'), '\u062A\u062E\u0632\u064A\u0646'], ['🗄️', __L('قرص صلب', 'Hard disk'), '\u062A\u062E\u0632\u064A\u0646']];
        var cats = [['\u062A\u0639\u0628\u064A\u0631', 'Expression'], ['\u0646\u0642\u0644', 'Transmission'], ['\u062A\u062E\u0632\u064A\u0646', 'Storage']];
        return '<div class="sorter" data-role="sorter">' + items.map(function (it, i) {
          return '<div class="sort-row" data-ans="' + esc(it[2]) + '"><span class="sort-name">' + it[0] + ' ' + esc(it[1]) + '</span>' +
            '<span class="sort-btns">' + cats.map(function (c) { return '<button type="button" class="sort-btn" data-c="' + esc(c[0]) + '">' + esc(__L(c[0], c[1])) + '</button>'; }).join('') + '</span></div>';
        }).join('') + '</div><div class="game-msg" data-role="msg"></div>';
      },
      init: function (root) {
        var score = 0, done = 0, total = root.querySelectorAll('.sort-row').length;
        root.querySelectorAll('.sort-row').forEach(function (row) {
          row.querySelectorAll('.sort-btn').forEach(function (b) {
            b.onclick = function () {
              if (row.classList.contains('ok')) return;
              if (b.getAttribute('data-c') === row.getAttribute('data-ans')) {
                row.classList.add('ok'); row.querySelectorAll('.sort-btn').forEach(function (x) { x.disabled = true; });
                score += 10; done++;
                root.querySelector('[data-role="msg"]').textContent = done === total ? __L('🎉 صنّفت كل الوسائط صح! نتيجة ', '🎉 You sorted every medium correctly! Score ') + score : __L('تصنيف صحيح ✓', 'Correct ✓');
              } else { b.classList.add('bad'); setTimeout(function () { b.classList.remove('bad'); }, 400); }
            };
          });
        });
      }
    },

    /* ==================== Unit 2 ==================== */
    'u2:0': {
      noteAr: 'شكل «ميثاق خصوصية الفصل» بتاعك.',
      noteEn: 'The layout of your "Class Privacy Charter".',
      html: function () {
        return preview(doc(__L('ميثاق خصوصية الفصل', 'Class Privacy Charter'), [
          [__L('البيانات اللي بنجمعها', 'Data we collect'), __L('الاسم، الحضور، نتائج الاختبارات فقط.', 'Name, attendance and test results only.')],
          [__L('البيانات اللي ممنوعة', 'Data that is not allowed'), __L('رقم الهاتف، العنوان، صور عائلية، كلمات المرور.', 'Phone number, address, family photos and passwords.')],
          [__L('مين يشوف البيانات؟', 'Who can see the data?'), __L('المعلّم فقط، وبإذن ولي الأمر عند الحاجة.', 'The teacher only, with a parent\'s permission when needed.')],
          [__L('مدة الاحتفاظ', 'Retention period'), __L('تُحذف النتائج التفصيلية بنهاية العام الدراسي.', 'Detailed results are deleted at the end of the school year.')],
          [__L('حقوق الطالب', 'Student rights'), __L('لك حق تعرف بياناتك وتصحّحها وتمسحها.', 'You have the right to know your data, correct it and delete it.')]
        ]));
      }
    },
    'u2:1': {
      noteAr: 'أهم 3 أنواع ملكية فكرية بتقارنها في دليلك.',
      noteEn: 'The three most important types of intellectual property that you compare in your guide.',
      html: function () {
        return preview(cards([
          ['©️', __L('حقوق المؤلف', 'Copyright'), __L('تحمي الأعمال الأدبية والفنية والبرمجية.', 'Protects literary, artistic and software works.')],
          ['🏭', __L('الملكية الصناعية', 'Industrial property'), __L('براءات الاختراع والعلامات التجارية والتصميمات.', 'Patents, trademarks and designs.')],
          ['🧠', __L('الملكية الفكرية', 'Intellectual property'), __L('المظلة الجامعة لحقوق المؤلف والملكية الصناعية.', 'The umbrella covering copyright and industrial property.')]
        ]));
      }
    },

    /* ==================== Unit 3 ==================== */
    'u3:0': {
      lab: 'cipher',
      noteAr: 'ده نفس «معمل التشفير» — كده هيبقى شكل أداة التشفير بتاعتك.',
      noteEn: 'This is the same "Cipher Lab" — this is how your encryption tool will look.'
    },
    'u3:1': {
      noteAr: 'شكل بوستر «حملة أمن المعلومات» اللي هتعمله للمدرسة.',
      noteEn: 'The layout of the "Information Security Campaign" poster you will make for the school.',
      html: function () {
        return preview(poster(__L('🛡️ حملة أمن المعلومات', '🛡️ Information Security Campaign'), [
          __L('اقفل شاشتك قبل ما تسيب الجهاز.', 'Lock your screen before you leave the device.'),
          __L('ما تفتحش روابط من مصادر مجهولة (التصيّد).', 'Do not open links from unknown sources (phishing).'),
          __L('استخدم مصادقة ثنائية على حساباتك المهمة.', 'Use two-factor authentication on your important accounts.'),
          __L('حدّث نظامك وبرامجك باستمرار.', 'Keep your system and apps up to date.'),
          __L('اعمل نسخ احتياطية لملفاتك المهمة.', 'Make backup copies of your important files.'),
          __L('استخدم كلمة مرور مختلفة لكل حساب.', 'Use a different password for every account.')
        ]));
      }
    },
    'u3:2': {
      noteAr: 'شكل «سياسة أمن الفصل» النهائية.',
      noteEn: 'The layout of the final "Class Security Policy".',
      html: function () {
        return preview(doc(__L('سياسة أمن الفصل', 'Class Security Policy'), [
          [__L('كلمات المرور', 'Passwords'), __L('12 حرفًا على الأقل، وتبديل دوري كل ترم.', 'At least 12 characters, changed regularly every term.')],
          [__L('الأجهزة', 'Devices'), __L('لا يُثبَّت برنامج إلا بإذن المعلّم.', 'No software may be installed without the teacher\'s permission.')],
          [__L('المشاركة', 'Sharing'), __L('يُمنع مشاركة الحسابات بين الطلاب.', 'Sharing accounts between students is not allowed.')],
          [__L('النسخ الاحتياطي', 'Backups'), __L('نسخة أسبوعية على قرص خارجي.', 'A weekly copy on an external disk.')],
          [__L('الطوارئ', 'Emergencies'), __L('الإبلاغ الفوري عن أي اختراق أو فقد بيانات.', 'Report any hacking or data loss immediately.')]
        ]));
      }
    },

    /* ==================== Unit 4 ==================== */
    'u4:0': {
      noteAr: 'شكل واجهة تطبيق الذكاء الاصطناعي بتاعك (تصميم أولي).',
      noteEn: 'The interface layout of your artificial intelligence app (first draft design).',
      html: function () {
        return preview(wire(__L('📱 مُصحِّح الواجبات الذكي', '📱 Smart Homework Checker'), [
          __L('📷 صوّر الواجب', '📷 Photograph the homework'),
          __L('🧠 تحليل صورة الواجب بالذكاء الاصطناعي', '🧠 AI analyses the homework image'),
          __L('✅ الأخطاء + التصحيح', '✅ Mistakes + correction'),
          __L('💡 نصيحة للتحسين', '💡 Tip for improvement'),
          __L('📊 تقرير أسبوعي', '📊 Weekly report')
        ]));
      }
    },
    'u4:1': {
      lab: 'smarthome',
      noteAr: 'ده «معمل المنزل الذكي» — جرّب الأجهزة كإنك بتصمّم نموذجك.',
      noteEn: 'This is the "Smart Home Lab" — try the devices as if you are designing your own model.'
    },
    'u4:2': {
      noteAr: 'خطوات لعبة الواقع المعزّز (AR) بتاعتك.',
      noteEn: 'The steps of your Augmented Reality (AR) game.',
      html: function () {
        return preview(flow([__L('📷 كاميرا تطابق الصورة', '📷 Camera matches the image'), __L('🧩 التعرف على الصورة', '🧩 Recognise the image'), __L('➕ إضافة المعلومات الرقمية', '➕ Add the digital information'), __L('📱 العرض على الشاشة', '📱 Show it on the screen')]));
      }
    },

    /* ==================== Unit 5 ==================== */
    'u5:0': {
      lab: 'binary',
      noteAr: 'ده «محوّل الأنظمة العددية» — نفس أداة مشروع الآلة الحاسبة الثنائية.',
      noteEn: 'This is the "Number Systems Converter" — the same tool as in the binary calculator project.'
    },
    'u5:1': {
      noteAr: 'الخط الزمني لوسائل الاتصال من الأقدم للأحدث.',
      noteEn: 'A timeline of communication methods from the oldest to the newest.',
      html: function () {
        return preview(timeline([
          [__L('الرسائل اليدوية', 'Handwritten messages'), __L('الحمام الزاجل والرسائل المكتوبة.', 'Carrier pigeons and written letters.')],
          [__L('البرق (التلغراف)', 'Telegraph'), __L('أول نقل إلكتروني سريع للرسائل.', 'The first fast electronic transfer of messages.')],
          [__L('الهاتف', 'Telephone'), __L('نقل الصوت مباشرة عبر الأسلاك.', 'Sending voice directly through wires.')],
          [__L('البث (راديو/تلفاز)', 'Broadcasting (radio/TV)'), __L('نقل جماعي لمسافات واسعة.', 'Mass transmission over long distances.')],
          [__L('الإنترنت', 'The Internet'), __L('نقل البيانات والصوت والفيديو عالميًا.', 'Transferring data, sound and video worldwide.')]
        ]));
      }
    },
    'u5:2': {
      lab: 'adc',
      noteAr: 'ده «معمل تناظري → رقمي» — شوف إزاي الصوت/الصورة تتحول لبتات.',
      noteEn: 'This is the "Analog → Digital Lab" — see how sound and images turn into bits.'
    },

    /* ==================== Unit 6 ==================== */
    'u6:0': {
      noteAr: 'مكونات الحاسوب الخمسة الأساسية (نسخة مصغّرة من مخططك).',
      noteEn: 'The five main computer components (a mini version of your diagram).',
      html: function () {
        return preview(grid([['🧠', __L('المعالج CPU', 'Processor CPU')], ['🧮', __L('الذاكرة RAM', 'RAM memory')], ['⌨️', __L('الإدخال', 'Input')], ['🖥️', __L('الإخراج', 'Output')], ['💾', __L('التخزين', 'Storage')]]));
      }
    },
    'u6:1': {
      lab: 'logic',
      noteAr: 'ده «محاكي البوابات» — نفس جدول الحقيقة اللي في مشروعك.',
      noteEn: 'This is the "Logic Gates Simulator" — the same truth table as in your project.'
    },
    'u6:2': {
      noteAr: 'نموذج جدول المقارنة بين حاسوب مكتبي ولابتوب.',
      noteEn: 'A sample comparison table between a desktop computer and a laptop.',
      html: function () {
        return preview(compare([__L('🖥️ حاسوب مكتبي', '🖥️ Desktop computer'), [__L('ذاكرة أكبر', 'Bigger memory'), __L('أرخص لنفس الأداء', 'Cheaper for the same performance'), __L('مش سهل ننقله', 'Not easy to move around')]], [__L('💻 لابتوب', '💻 Laptop'), [__L('بطارية مدمجة', 'Built-in battery'), __L('خفيف وسهل النقل', 'Light and easy to carry'), __L('توسيع مكوّنات أصعب', 'Harder to upgrade components')]]));
      }
    },

    /* ==================== Unit 7 ==================== */
    'u7:0': {
      noteAr: 'مكوّنات شبكة المدرسة اللي هيظهر في رسمك.',
      noteEn: 'The school network components that will appear in your drawing.',
      html: function () {
        return preview(cards([
          ['🖥️', __L('أجهزة الطلاب', 'Student devices'), __L('متّصلة بالشبكة المحلية LAN.', 'Connected to the local area network LAN.')],
          ['🔀', __L('السويتش', 'Switch'), __L('يوزّع البيانات بين الأجهزة.', 'Distributes the data between the devices.')],
          ['📶', __L('الموجّه Router', 'Router'), __L('يوصل الشبكة بالإنترنت.', 'Connects the network to the Internet.')],
          ['🗄️', __L('الخادم Server', 'Server'), __L('يخزّن الملفات وبيانات المدرسة.', 'Stores the files and the school data.')]
        ]));
      }
    },
    'u7:1': {
      lab: 'dns',
      noteAr: 'ده «محاكي DNS» — نفس الخطوات اللي هتشرحها في مشروعك.',
      noteEn: 'This is the "DNS Simulator" — the same steps you will explain in your project.'
    },
    'u7:2': {
      noteAr: 'لعبة توصيل البروتوكول بوظيفته (ده شكل بطاقاتك).',
      noteEn: 'A game that matches each protocol with its job (this is how your cards will look).',
      html: function () {
        return '<div class="match-wrap"><div class="match-col" data-role="col1"></div><div class="match-col" data-role="col2"></div></div><div class="game-msg" data-role="msg"></div>';
      },
      init: function (root) {
        var pairs = [['HTTP', __L('نقل صفحات الويب', 'Transfers web pages')], ['SMTP', __L('إرسال البريد الإلكتروني', 'Sends email')], ['FTP', __L('نقل الملفات', 'Transfers files')], ['DNS', __L('ترجمة الأسماء إلى IP', 'Translates names into IP')]];
        var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
        var picked = null, matched = 0, score = 0;
        root.querySelector('[data-role="col1"]').innerHTML = shuffle(pairs).map(function (p) { return '<button class="match-item term" data-t="' + esc(p[0]) + '">' + esc(p[0]) + '</button>'; }).join('');
        root.querySelector('[data-role="col2"]').innerHTML = shuffle(pairs).map(function (p) { return '<button class="match-item def" data-t="' + esc(p[0]) + '">' + esc(p[1]) + '</button>'; }).join('');
        root.querySelectorAll('.match-item').forEach(function (b) {
          b.onclick = function () {
            if (b.classList.contains('done')) return;
            if (b.classList.contains('term')) { root.querySelectorAll('.match-item.term').forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); picked = b; return; }
            if (!picked) return;
            if (b.getAttribute('data-t') === picked.getAttribute('data-t')) {
              picked.classList.remove('sel'); picked.classList.add('done'); b.classList.add('done'); picked = null; matched++; score += 10;
              root.querySelector('[data-role="msg"]').textContent = matched === 4 ? __L('🎉 وصّلت كل البروتوكولات صح!', '🎉 You matched every protocol correctly!') : __L('توصيل صحيح ✓', 'Correct match ✓');
            } else { b.classList.add('bad'); var bb = b; setTimeout(function () { bb.classList.remove('bad'); }, 400); picked.classList.remove('sel'); picked = null; }
          };
        });
      }
    },

    /* ==================== Unit 8 ==================== */
    'u8:0': {
      noteAr: 'ده مشروع «مكتبة الفصل»: ضيف كتب وشوف المفتاح الأساسي بيشتغل إزاي.',
      noteEn: 'This is the "Class Library" project: add books and see how the primary key works.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('عنوان الكتاب', 'Book title') + '</label><input class="lab-input" data-role="t" placeholder="' + __L('مثال: أساسيات بايثون', 'Example: Python basics') + '"></div>' +
          '<div class="lab-field"><label>' + __L('المؤلف', 'Author') + '</label><input class="lab-input" data-role="a" placeholder="' + __L('اسم المؤلف', 'Author name') + '"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="add">' + __L('➕ إضافة سجل', '➕ Add record') + '</button></div></div>' +
          '<div class="mock"><table class="mock-table"><thead><tr><th>' + __L('المفتاح الأساسي', 'Primary key') + '</th><th>' + __L('العنوان', 'Title') + '</th><th>' + __L('المؤلف', 'Author') + '</th><th></th></tr></thead><tbody data-role="rows"></tbody></table></div>';
      },
      init: function (root) {
        var id = 0;
        var add = function (t, a) {
          id++;
          var tr = document.createElement('tr');
          tr.innerHTML = '<td class="pk">' + id + '</td><td>' + esc(t) + '</td><td>' + esc(a) + '</td><td><button class="btn-outline del">✕</button></td>';
          tr.querySelector('.del').onclick = function () { tr.remove(); };
          root.querySelector('[data-role="rows"]').appendChild(tr);
        };
        root.querySelector('[data-role="add"]').onclick = function () {
          var t = root.querySelector('[data-role="t"]').value.trim(), a = root.querySelector('[data-role="a"]').value.trim();
          if (!t) return;
          add(t, a || '—');
          root.querySelector('[data-role="t"]').value = ''; root.querySelector('[data-role="a"]').value = '';
        };
        add(__L('أساسيات بايثون', 'Python basics'), __L('م. أحمد', 'Mr. Ahmed')); add(__L('أمن المعلومات', 'Information security'), __L('د. سارة', 'Dr. Sara'));
      }
    },
    'u8:1': {
      noteAr: 'ده مشروع «سجل الطلاب»: اكتب الدرجات وشوف الإحصاءات فورًا.',
      noteEn: 'This is the "Student Record" project: enter the marks and see the statistics instantly.',
      html: function () {
        return '<div class="lab-field"><label>' + __L('درجات الطلاب (مفصولة بفواصل)', 'Student marks (separated by commas)') + '</label><textarea class="lab-input" data-role="g">88, 95, 72, 64, 90, 55, 78</textarea></div>' +
          '<div class="stat-grid">' + stat(__L('العدد', 'Count'), 'n') + stat(__L('المجموع', 'Total'), 'sum') + stat(__L('المتوسط', 'Average'), 'avg') + stat(__L('الأعلى', 'Highest'), 'max') + stat(__L('الأدنى', 'Lowest'), 'min') + stat(__L('الناجحون', 'Passed'), 'pass') + '</div>';
      },
      init: function (root) {
        var run = function () {
          var g = root.querySelector('[data-role="g"]').value.split(/[\s,\u060C]+/).map(Number).filter(function (n) { return !isNaN(n); });
          var sum = g.reduce(function (a, b) { return a + b; }, 0);
          root.querySelector('[data-role="n"]').textContent = g.length;
          root.querySelector('[data-role="sum"]').textContent = Math.round(sum * 10) / 10;
          root.querySelector('[data-role="avg"]').textContent = g.length ? Math.round(sum / g.length * 10) / 10 : 0;
          root.querySelector('[data-role="max"]').textContent = g.length ? Math.max.apply(null, g) : 0;
          root.querySelector('[data-role="min"]').textContent = g.length ? Math.min.apply(null, g) : 0;
          root.querySelector('[data-role="pass"]').textContent = g.filter(function (x) { return x >= 50; }).length + '/' + g.length;
        };
        root.querySelector('[data-role="g"]').oninput = run; run();
      }
    },

    /* ==================== Unit 9 ==================== */
    'u9:0': {
      lab: 'data',
      noteAr: 'ده «مستكشف البيانات» — استخدمه لتحليل نتائج استبيان الفصل.',
      noteEn: 'This is the "Data Explorer" — use it to analyse the results of the class survey.'
    },
    'u9:1': {
      noteAr: 'ده «مستكشف البيانات» بوضع الرسم الخطي — مناسب لمتابعة درجات الحرارة أسبوعيًا.',
      noteEn: 'This is the "Data Explorer" in line-chart mode — good for tracking temperatures week by week.',
      lab: 'data'
    },

    /* ==================== Unit 10 ==================== */
    'u10:0': {
      noteAr: 'ده مشروع «محاكاة طابور المقصف»: غيّر عدد الطلاب والكاشير وشوف وقت الانتظار.',
      noteEn: 'This is the "Canteen Queue Simulation" project: change the number of students and cashiers and see the waiting time.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('عدد الطلاب: ', 'Number of students: ') + '<b data-role="nv">30</b></label><input type="range" data-role="n" min="5" max="80" value="30"></div>' +
          '<div class="lab-field"><label>' + __L('عدد الكاشير: ', 'Number of cashiers: ') + '<b data-role="cv">1</b></label><input type="range" data-role="c" min="1" max="4" value="1"></div>' +
          '<div class="lab-field"><label>' + __L('مدة خدمة الطالب (ثانية): ', 'Service time per student (seconds): ') + '<b data-role="sv">20</b></label><input type="range" data-role="s" min="5" max="60" value="20"></div></div>' +
          '<div class="lab-out"><strong>' + __L('آخر طالب يستلم بعد:', 'The last student is served after:') + '</strong> <span class="lab-result" data-role="out">—</span></div>' +
          '<p class="lab-note" data-role="tip"></p>';
      },
      init: function (root) {
        var run = function () {
          var n = +root.querySelector('[data-role="n"]').value, c = +root.querySelector('[data-role="c"]').value, s = +root.querySelector('[data-role="s"]').value;
          root.querySelector('[data-role="nv"]').textContent = n;
          root.querySelector('[data-role="cv"]').textContent = c;
          root.querySelector('[data-role="sv"]').textContent = s;
          var total = n * s / c;
          root.querySelector('[data-role="out"]').textContent = Math.floor(total / 60) + __L(' دقيقة و ', ' minutes and ') + Math.round(total % 60) + __L(' ثانية', ' seconds');
          root.querySelector('[data-role="tip"]').textContent = c > 1 ? __L('بزيادة الكاشير قلّ وقت الانتظار للنص تقريبًا.', 'With more cashiers, the waiting time is roughly halved.') : __L('لو زوّدت كاشير تاني، وقت الانتظار هيقل للنص.', 'If you add another cashier, the waiting time will be halved.');
        };
        ['n', 'c', 's'].forEach(function (k) { root.querySelector('[data-role="' + k + '"]').oninput = run; });
        run();
      }
    },
    'u10:1': {
      lab: 'sim',
      noteAr: 'ده «معمل المحاكاة» — غيّر معدّل النمو والسنين وشوف انتشار الفكرة/الظاهرة.',
      noteEn: 'This is the "Simulation Lab" — change the growth rate and the number of years and watch the idea/phenomenon spread.'
    },

    /* ==================== Unit 11 ==================== */
    'u11:0': {
      noteAr: 'ده مشروع «حاسبة الدرجات» بالمنطق نفسه: اكتب الدرجات وشوف المجموع والمتوسط والتقدير.',
      noteEn: 'This is the "Marks Calculator" project with the same logic: enter the marks and see the total, the average and the grade.',
      html: function () {
        return '<div class="lab-field"><label>' + __L('الدرجات (مفصولة بفواصل)', 'Marks (separated by commas)') + '</label><input class="lab-input" data-role="g" value="90, 85, 77, 60, 95"></div>' +
          '<div class="stat-grid">' + stat(__L('المجموع', 'Total'), 'sum') + stat(__L('المتوسط', 'Average'), 'avg') + stat(__L('التقدير', 'Grade'), 'grade') + '</div>';
      },
      init: function (root) {
        var run = function () {
          var g = root.querySelector('[data-role="g"]').value.split(/[\s,\u060C]+/).map(Number).filter(function (n) { return !isNaN(n); });
          var sum = g.reduce(function (a, b) { return a + b; }, 0), avg = g.length ? sum / g.length : 0;
          var grade = avg >= 90 ? __L('ممتاز 🏆', 'Excellent 🏆') : avg >= 80 ? __L('جيد جدًا ⭐', 'Very good ⭐') : avg >= 65 ? __L('جيد 👍', 'Good 👍') : avg >= 50 ? __L('مقبول', 'Acceptable') : __L('راسب ⚠️', 'Fail ⚠️');
          root.querySelector('[data-role="sum"]').textContent = Math.round(sum * 10) / 10;
          root.querySelector('[data-role="avg"]').textContent = Math.round(avg * 10) / 10;
          root.querySelector('[data-role="grade"]').textContent = g.length ? grade : '—';
        };
        root.querySelector('[data-role="g"]').oninput = run; run();
      }
    },
    'u11:1': {
      game: 'guess',
      noteAr: 'ده «خمّن الرقم» — نفس منطق while/if اللي هتكتبه في برنامجك.',
      noteEn: 'This is "Guess the Number" — the same while/if logic you will write in your program.'
    },
    'u11:2': {
      noteAr: 'ده مشروع «مدير المهام»: ضيف واحذف وشوف القائمة بتتحدّث.',
      noteEn: 'This is the "Task Manager" project: add and delete tasks and watch the list update.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('مهمة جديدة', 'New task') + '</label><input class="lab-input" data-role="task" placeholder="' + __L('مثال: أراجع الفصل الأول', 'Example: revise chapter one') + '"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="add">' + __L('➕ أضف', '➕ Add') + '</button></div></div>' +
          '<ul class="todo-list" data-role="list"></ul>' +
          '<p class="lab-note" data-role="count">' + __L('عدد المهام: 0', 'Number of tasks: 0') + '</p>';
      },
      init: function (root) {
        var upd = function () { root.querySelector('[data-role="count"]').textContent = __L('عدد المهام: ', 'Number of tasks: ') + root.querySelectorAll('.todo-list li').length; };
        var add = function (txt) {
          var li = document.createElement('li');
          li.innerHTML = '<span>' + esc(txt) + '</span><button class="btn-outline del">✕</button>';
          li.querySelector('.del').onclick = function () { li.remove(); upd(); };
          root.querySelector('[data-role="list"]').appendChild(li); upd();
        };
        root.querySelector('[data-role="add"]').onclick = function () {
          var v = root.querySelector('[data-role="task"]').value.trim(); if (!v) return;
          add(v); root.querySelector('[data-role="task"]').value = '';
        };
        root.querySelector('[data-role="task"]').onkeydown = function (e) { if (e.key === 'Enter') root.querySelector('[data-role="add"]').click(); };
        add(__L('أذاكر درس البيانات والمعلومات', 'Study the data and information lesson')); add(__L('أحل اختبار الوحدة', 'Do the unit quiz'));
      }
    }
  };

  window.ICT_PROJECT_DEMOS = DEMOS;
})();
