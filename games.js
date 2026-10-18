/* ============================================================
   ICT Secondary — games.js
   Educational games. Each: { id, icon, titleAr/En, descAr/En, html(), init(root) }
   ============================================================ */
(function () {
  'use strict';

  function __L(ar, en) { return (window.ICT && window.ICT.getLang && window.ICT.getLang() === 'en') ? en : ar; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function award(n) { if (window.ICT && window.ICT.awardPoints) window.ICT.awardPoints(n); }

  var GAMES = [

    /* ---------------- 1) Term match ---------------- */
    {
      id: 'match', icon: '🧩',
      titleAr: 'وصّل المصطلح', titleEn: 'Match the Term',
      descAr: 'صِل كل مصطلح بتعريفه الصحيح قبل ما الوقت يخلص.',
      descEn: 'Connect each term to its correct definition.',
      html: function () {
        return '<div class="game-head"><span>⏱️ <b data-role="time">45</b> ' + __L('ثانية', 'seconds') + '</span><span>✅ ' + __L('النقاط: ', 'Score: ') + '<b data-role="score">0</b></span></div>' +
          '<div class="match-wrap"><div class="match-col" data-role="terms"></div><div class="match-col" data-role="defs"></div></div>' +
          '<div class="game-actions"><button class="btn-primary" data-role="restart">🔄 ' + __L('لعبة جديدة', 'New game') + '</button><span class="game-msg" data-role="msg"></span></div>';
      },
      init: function (root) {
        var TERMS = [
          { t: __L('البيانات', 'Data'), d: __L('حقائق خام بلا معنى بحد ذاتها', 'Raw facts that have no meaning on their own') },
          { t: __L('المعلومات', 'Information'), d: __L('معنى أو قيمة تُستخدم لاتخاذ قرار', 'Meaning or value used to make a decision') },
          { t: __L('التشفير', 'Encryption'), d: __L('تحويل المعلومات لصيغة سرّية بمفتاح', 'Turning information into a secret form using a key') },
          { t: __L('المصادقة', 'Authentication'), d: __L('التحقق من هوية المستخدم قبل الوصول', 'Verifying the user’s identity before giving access') },
          { t: __L('عنوان IP', 'IP address'), d: __L('رقم فريد يحدد موقع الجهاز على الشبكة', 'A unique number that identifies a device on the network') },
          { t: __L('DNS', 'DNS'), d: __L('يترجم أسماء النطاقات إلى عناوين IP', 'Translates domain names into IP addresses') },
          { t: __L('البايت', 'Byte'), d: __L('يساوي 8 بِتات', 'Equals 8 bits') },
          { t: __L('إنترنت الأشياء', 'Internet of Things'), d: __L('ربط الأجهزة بالإنترنت لتتبادل البيانات', 'Connecting devices to the internet to exchange data') },
          { t: __L('المفتاح الأساسي', 'Primary key'), d: __L('حقل فريد يميّز كل سجل في الجدول', 'A unique field that identifies each record in a table') },
          { t: __L('الواقع المعزز', 'Augmented reality'), d: __L('إضافة معلومات رقمية إلى البيئة الواقعية', 'Adding digital information to the real environment') },
          { t: __L('الفجوة الرقمية', 'Digital divide'), d: __L('تفاوت بين من يستفيد من التقنية ومن لا يستفيد', 'The gap between those who benefit from technology and those who do not') },
          { t: __L('الخوارزمية', 'Algorithm'), d: __L('إجراء أو طريقة لحلّ مشكلة', 'A procedure or method for solving a problem') }
        ];
        var picked = null, matched = 0, score = 0, timer = null, left = 45;
        var done = false;
        var start = function () {
          clearInterval(timer);
          picked = null; matched = 0; score = 0; left = 45; done = false;
          root.querySelector('[data-role="score"]').textContent = '0';
          root.querySelector('[data-role="time"]').textContent = '45';
          root.querySelector('[data-role="msg"]').textContent = '';
          var sel = shuffle(TERMS).slice(0, 5);
          var terms = shuffle(sel), defs = shuffle(sel);
          root.querySelector('[data-role="terms"]').innerHTML = terms.map(function (x) { return '<button class="match-item term" data-t="' + esc(x.t) + '">' + esc(x.t) + '</button>'; }).join('');
          root.querySelector('[data-role="defs"]').innerHTML = defs.map(function (x) { return '<button class="match-item def" data-t="' + esc(x.t) + '">' + esc(x.d) + '</button>'; }).join('');
          root.querySelectorAll('.match-item').forEach(function (b) {
            b.onclick = function () {
              if (done || b.classList.contains('done')) return;
              if (b.classList.contains('term')) {
                root.querySelectorAll('.match-item.term').forEach(function (x) { x.classList.remove('sel'); });
                b.classList.add('sel'); picked = b;
              } else if (picked) {
                if (b.getAttribute('data-t') === picked.getAttribute('data-t')) {
                  picked.classList.remove('sel'); picked.classList.add('done'); b.classList.add('done');
                  matched++; score += 10; root.querySelector('[data-role="score"]').textContent = score;
                  picked = null;
                  if (matched === 5) { done = true; clearInterval(timer); root.querySelector('[data-role="msg"]').textContent = __L('🎉 خلصت! نتيجة ', '🎉 All matched! Score ') + score; award(score); }
                } else { b.classList.add('bad'); var bb = b; setTimeout(function () { bb.classList.remove('bad'); }, 400); picked.classList.remove('sel'); picked = null; }
              }
            };
          });
          timer = setInterval(function () {
            if (!root.querySelector('[data-role="time"]')) { clearInterval(timer); return; }
            left--; root.querySelector('[data-role="time"]').textContent = left;
            if (left <= 0) { clearInterval(timer); done = true; root.querySelector('[data-role="msg"]').textContent = __L('⏰ انتهى الوقت! نتيجة ', '⏰ Time is up! Score ') + score; award(score); }
          }, 1000);
        };
        root.querySelector('[data-role="restart"]').onclick = start;
        start();
        return function () { clearInterval(timer); };
      }
    },

    /* ---------------- 2) True / False ---------------- */
    {
      id: 'tf', icon: '⚡',
      titleAr: 'صح أم خطأ؟', titleEn: 'True or False?',
      descAr: 'جاوب بسرعة على أكبر عدد من العبارات قبل انتهاء الوقت.',
      descEn: 'Answer as many statements as you can before time runs out.',
      html: function () {
        return '<div class="game-head"><span>⏱️ <b data-role="time">30</b></span><span>✅ <b data-role="score">0</b></span><span>🔢 <b data-role="qs">0</b>/8</span></div>' +
          '<div class="tf-q" data-role="q">' + __L('اضغط ابدأ', 'Press Start') + '</div>' +
          '<div class="game-actions"><button class="btn-primary big" data-role="true">✔️ ' + __L('صح', 'True') + '</button><button class="btn-outline big" data-role="false">✖️ ' + __L('خطأ', 'False') + '</button></div>' +
          '<div class="game-actions"><button class="btn-primary" data-role="start">▶️ ' + __L('ابدأ', 'Start') + '</button><span class="game-msg" data-role="msg"></span></div>';
      },
      init: function (root) {
        var TF = [
          [__L('المعلومات هي حقائق خام بلا معنى.', 'Information is raw facts with no meaning.'), false],
          [__L('التشفير المتماثل يستخدم نفس المفتاح للتشفير والفك.', 'Symmetric encryption uses the same key to encrypt and decrypt.'), true],
          [__L('بصمة الإصبع تُعدّ شيئاً "تملكه".', 'A fingerprint counts as something you "have".'), false],
          [__L('8 بِتات تساوي بايت واحد.', '8 bits equal one byte.'), true],
          [__L('DNS يحوّل عناوين IP إلى أسماء نطاقات.', 'DNS converts IP addresses into domain names.'), false],
          [__L('إنترنت الأشياء يربط الأجهزة بالإنترنت لتتبادل البيانات.', 'The Internet of Things connects devices to the internet so they can exchange data.'), true],
          [__L('المفتاح الأساسي يسمح بتكرار القيم في الجدول.', 'A primary key allows repeated values in a table.'), false],
          [__L('الفجوة الرقمية تعني التفاوت في الاستفادة من التقنية.', 'The digital divide means unequal benefit from technology.'), true],
          [__L('الواقع الافتراضي يستبدل الواقع ببيئة محاكاة كاملة.', 'Virtual reality replaces reality with a complete simulated environment.'), true],
          [__L('الفهرس في قوائم بايثون يبدأ من 1.', 'The index in Python lists starts at 1.'), false],
          [__L('العدد 255 يساوي FF بالست عشري.', 'The number 255 equals FF in hexadecimal.'), true],
          [__L('print دالة مضمّنة (built-in) في بايثون.', 'print is a built-in function in Python.'), true]
        ];
        var list = [], idx = 0, score = 0, left = 30, timer = null, playing = false, answered = 0;
        var show = function () {
          if (!root.querySelector('[data-role="q"]')) return;
          if (idx >= list.length) { end(__L('خلصت كل الأسئلة!', 'You finished all the questions!')); return; }
          root.querySelector('[data-role="q"]').textContent = list[idx][0];
        };
        var end = function (msg) {
          playing = false; clearInterval(timer);
          if (!root.querySelector('[data-role="msg"]')) return;
          root.querySelector('[data-role="msg"]').textContent = msg + __L(' نتيجة ', ' Score ') + score;
          award(score);
        };
        var answer = function (val) {
          if (!playing || idx >= list.length || !root.querySelector('[data-role="q"]')) return;
          if (list[idx][1] === val) { score += 10; root.querySelector('[data-role="q"]').classList.add('ok'); }
          else { root.querySelector('[data-role="q"]').classList.add('bad'); }
          root.querySelector('[data-role="score"]').textContent = score;
          idx++; answered++; root.querySelector('[data-role="qs"]').textContent = Math.min(answered, 8);
          var q = root.querySelector('[data-role="q"]');
          setTimeout(function () { if (!document.contains(q)) return; q.classList.remove('ok', 'bad'); show(); }, 250);
        };
        root.querySelector('[data-role="start"]').onclick = function () {
          clearInterval(timer);
          list = shuffle(TF).slice(0, 8); idx = 0; score = 0; left = 30; playing = true;
          root.querySelector('[data-role="score"]').textContent = '0';
          root.querySelector('[data-role="qs"]').textContent = '0';
          root.querySelector('[data-role="msg"]').textContent = '';
          show();
          timer = setInterval(function () { if (!root.querySelector('[data-role="time"]')) { clearInterval(timer); return; } left--; root.querySelector('[data-role="time"]').textContent = left; if (left <= 0) end(__L('⏰ انتهى الوقت!', '⏰ Time is up!')); }, 1000);
        };
        root.querySelector('[data-role="true"]').onclick = function () { answer(true); };
        root.querySelector('[data-role="false"]').onclick = function () { answer(false); };
        return function () { clearInterval(timer); };
      }
    },

    /* ---------------- 3) Order the steps ---------------- */
    {
      id: 'order', icon: '🔢',
      titleAr: 'رتّب الخطوات', titleEn: 'Order the Steps',
      descAr: 'اضغط الخطوات بالترتيب الصحيح من الأول للآخر.',
      descEn: 'Click the steps in the correct order.',
      html: function () {
        return '<div class="game-head"><span data-role="title"></span><span>✅ <b data-role="score">0</b></span></div>' +
          '<div class="order-picked" data-role="picked"></div>' +
          '<div class="order-pool" data-role="pool"></div>' +
          '<div class="game-actions"><button class="btn-primary" data-role="restart">🔄 ' + __L('ترتيب جديد', 'New order') + '</button><span class="game-msg" data-role="msg"></span></div>';
      },
      init: function (root) {
        var SEQUENCES = [
          { title: __L('خطوات تحليل البيانات', 'Data analysis steps'), steps: [__L('تحديد السؤال/الهدف', 'Define the question/goal'), __L('جمع البيانات', 'Collect the data'), __L('تنظيف البيانات', 'Clean the data'), __L('تحليلها واستكشافها', 'Analyze and explore it'), __L('استخلاص القرار', 'Reach a decision')] },
          { title: __L('رحلة طلب صفحة ويب', 'The journey of a web page request'), steps: [__L('المتصفح يرسل طلب HTTP', 'The browser sends an HTTP request'), __L('DNS يترجم الاسم إلى IP', 'DNS translates the name into an IP'), __L('الطلب يصل للخادم', 'The request reaches the server'), __L('الخادم يردّ بمحتوى الصفحة', 'The server replies with the page content'), __L('المتصفح يعرض الصفحة', 'The browser displays the page')] },
          { title: __L('خطوات التشفير غير المتماثل', 'Asymmetric encryption steps'), steps: [__L('المُرسِل يحصل على المفتاح العام', 'The sender gets the public key'), __L('يشفّر الرسالة بالمفتاح العام', 'Encrypt the message with the public key'), __L('يرسل الرسالة المشفّرة', 'Send the encrypted message'), __L('المُستقبِل يفكّها بمفتاحه الخاص', 'The receiver decrypts it with their private key')] }
        ];
        var cur = null, chosen = [];
        var start = function () {
          if (!root.querySelector('[data-role="pool"]')) return;
          cur = SEQUENCES[Math.floor(Math.random() * SEQUENCES.length)];
          chosen = [];
          root.querySelector('[data-role="title"]').textContent = cur.title;
          root.querySelector('[data-role="msg"]').textContent = '';
          root.querySelector('[data-role="score"]').textContent = '0';
          root.querySelector('[data-role="picked"]').innerHTML = '';
          root.querySelector('[data-role="pool"]').innerHTML = shuffle(cur.steps).map(function (s) { return '<button class="order-item" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
          root.querySelectorAll('.order-item').forEach(function (b) {
            b.onclick = function () {
              chosen.push(b.getAttribute('data-s'));
              var i = cur.steps.indexOf(b.getAttribute('data-s'));
              var correctSoFar = chosen.every(function (c, k) { return cur.steps[k] === c; });
              b.disabled = true;
              var chip = document.createElement('span');
              chip.className = 'order-chip ' + (correctSoFar ? 'ok' : 'bad');
              chip.textContent = chosen.length + '. ' + b.getAttribute('data-s');
              root.querySelector('[data-role="picked"]').appendChild(chip);
              if (!correctSoFar) { root.querySelector('[data-role="msg"]').textContent = __L('❌ الترتيب اتلخبط — جرّب تاني.', '❌ The order got mixed up — try again.'); setTimeout(start, 1400); return; }
              root.querySelector('[data-role="score"]').textContent = chosen.length * 10;
              if (chosen.length === cur.steps.length) { root.querySelector('[data-role="msg"]').textContent = __L('🎉 ترتيب صحيح تماماً!', '🎉 Perfect order!'); award(chosen.length * 10); }
            };
          });
        };
        root.querySelector('[data-role="restart"]').onclick = start;
        start();
      }
    },

    /* ---------------- 4) Guess the number (Python logic) ---------------- */
    {
      id: 'guess', icon: '🐍',
      titleAr: 'خمّن الرقم (منطق بايثون)', titleEn: 'Guess the Number',
      descAr: 'لعبة تعتمد على المقارنة والتكرار — نفس منطق حلقات بايثون.',
      descEn: 'A comparison + repetition game — the logic behind Python loops.',
      html: function () {
        return '<div class="game-head"><span>🎯 ' + __L('خمّن من 1 إلى 20', 'Guess from 1 to 20') + '</span><span>🔁 ' + __L('المحاولات: ', 'Tries: ') + '<b data-role="tries">0</b></span></div>' +
          '<div class="guess-row"><input class="lab-input" type="number" data-role="in" min="1" max="20" placeholder="' + __L('اكتب رقم...', 'Type a number...') + '"><button class="btn-primary" data-role="go">' + __L('جرّب', 'Try') + '</button></div>' +
          '<div class="guess-fb" data-role="fb">' + __L('ابدا خمّن!', 'Start guessing!') + '</div>' +
          '<div class="game-actions"><button class="btn-outline" data-role="new">🔄 ' + __L('رقم جديد', 'New number') + '</button></div>';
      },
      init: function (root) {
        var secret, tries;
        var reset = function () { secret = Math.floor(Math.random() * 20) + 1; tries = 0; root.querySelector('[data-role="tries"]').textContent = '0'; root.querySelector('[data-role="fb"]').textContent = __L('ابدا خمّن!', 'Start guessing!'); root.querySelector('[data-role="fb"]').className = 'guess-fb'; };
        root.querySelector('[data-role="go"]').onclick = function () {
          var v = parseInt(root.querySelector('[data-role="in"]').value, 10);
          if (isNaN(v) || v < 1 || v > 20) { root.querySelector('[data-role="fb"]').textContent = __L('اكتب رقم من 1 لـ 20.', 'Type a number from 1 to 20.'); return; }
          tries++; root.querySelector('[data-role="tries"]').textContent = tries;
          var fb = root.querySelector('[data-role="fb"]');
          if (v === secret) { fb.textContent = __L('🎉 صح! الرقم كان ', '🎉 Correct! The number was ') + secret + __L(' في ', ' in ') + tries + __L(' محاولات.', ' tries.'); fb.className = 'guess-fb ok'; award(Math.max(10, 60 - tries * 5)); reset(); }
          else if (v < secret) { fb.textContent = __L('⬆️ الرقم السري أكبر.', '⬆️ The secret number is bigger.'); fb.className = 'guess-fb'; }
          else { fb.textContent = __L('⬇️ الرقم السري أصغر.', '⬇️ The secret number is smaller.'); fb.className = 'guess-fb'; }
        };
        root.querySelector('[data-role="new"]').onclick = reset;
        reset();
      }
    },

    /* ---------------- 5) Data detective ---------------- */
    {
      id: 'detective', icon: '🔍',
      titleAr: 'محقق البيانات', titleEn: 'Data Detective',
      descAr: 'اقرأ قيم الفئات واختر الفئة الأكبر — تدريب على قراءة البيانات.',
      descEn: 'Read the categories and pick the largest value.',
      html: function () {
        return '<div class="game-head"><span>🕵️ ' + __L('الجولة: ', 'Round: ') + '<b data-role="round">1</b></span><span>✅ <b data-role="score">0</b></span></div>' +
          '<div class="det-bars" data-role="bars"></div>' +
          '<div class="det-opts" data-role="opts"></div>' +
          '<div class="game-actions"><button class="btn-primary" data-role="next" style="display:none">➡️ ' + __L('الجولة التالية', 'Next round') + '</button><span class="game-msg" data-role="msg"></span></div>';
      },
      init: function (root) {
        var round = 1, score = 0, answer = '';
        var cats = [__L('الرياضيات', 'Math'), __L('العلوم', 'Science'), __L('اللغات', 'Languages'), __L('الحاسب', 'Computing'), __L('الفنون', 'Art'), __L('الرياضة', 'Sports')];
        var newRound = function () {
          root.querySelector('[data-role="round"]').textContent = round;
          root.querySelector('[data-role="msg"]').textContent = '';
          root.querySelector('[data-role="next"]').style.display = 'none';
          var sel = shuffle(cats).slice(0, 4);
          var data = sel.map(function (c) { return { c: c, v: Math.floor(Math.random() * 90) + 10 }; });
          answer = data.reduce(function (m, x) { return x.v > m.v ? x : m; }, data[0]).c;
          root.querySelector('[data-role="bars"]').innerHTML = data.map(function (d) { return '<div class="det-bar"><span class="det-label">' + esc(d.c) + '</span><div class="det-track"><div class="det-fill" style="width:' + d.v + '%">' + d.v + '</div></div></div>'; }).join('');
          root.querySelector('[data-role="opts"]').innerHTML = data.map(function (d) { return '<button class="btn-outline" data-c="' + esc(d.c) + '">' + esc(d.c) + '</button>'; }).join('');
          root.querySelectorAll('.det-opts .btn-outline').forEach(function (b) {
            b.onclick = function () {
              if (b.getAttribute('data-c') === answer) { b.classList.add('right'); score += 15; root.querySelector('[data-role="score"]').textContent = score; root.querySelector('[data-role="msg"]').textContent = __L('✅ صح! الفئة الأكبر هي ', '✅ Correct! The largest category is ') + answer; award(15); root.querySelector('[data-role="next"]').style.display = 'inline-flex'; round++; }
              else { b.classList.add('wrong'); root.querySelector('[data-role="msg"]').textContent = __L('❌ قارن الأطوال وجرّب تاني.', '❌ Compare the bar lengths and try again.'); }
            };
          });
        };
        root.querySelector('[data-role="next"]').onclick = newRound;
        newRound();
      }
    }
  ];

  window.ICT_GAMES = GAMES;
})();
