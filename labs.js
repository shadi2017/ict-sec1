/* ============================================================
   ICT Secondary — labs.js
   Interactive labs — real working widgets.
   Each lab: { id, unit, icon, titleAr/En, descAr/En, html(), init(root) }
   ============================================================ */
(function () {
  'use strict';

  function __L(ar, en) { return (window.ICT && window.ICT.getLang && window.ICT.getLang() === 'en') ? en : ar; }

  var AR_ALPHA = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function getCtx(root, id, w, h) {
    var cv = root.querySelector('#' + id);
    if (!cv) return null;
    var dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = '100%'; cv.style.height = 'auto';
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }

  var LABS = [

    /* ---------------- 1) Caesar cipher (Unit 3) ---------------- */
    {
      id: 'cipher', unit: 'u3', icon: '🔐',
      titleAr: 'معمل التشفير (شفرة قيصر)', titleEn: 'Cipher Lab (Caesar)',
      descAr: 'شفّر وفكّ أي نص عربي أو إنجليزي بإزاحة سرّية، وشوف خريطة الحروف بنفسك.',
      descEn: 'Encrypt and decrypt Arabic or English text with a secret shift.',
      html: function () {
        return '<div class="lab-grid">' +
          '<div class="lab-field"><label>' + __L('النص / Text', 'Text') + '</label><textarea class="lab-input" data-role="text">' + __L('أمن المعلومات يبدأ بكلمة مرور قوية', 'Information security starts with a strong password') + '</textarea></div>' +
          '<div class="lab-row"><div class="lab-field"><label>' + __L('الإزاحة (المفتاح)', 'Shift (key)') + '</label><input class="lab-input" type="number" data-role="shift" value="3" min="1" max="25"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="enc">' + __L('🔒 تشفير', '🔒 Encrypt') + '</button><button class="btn-outline" data-role="dec">' + __L('🔓 فك التشفير', '🔓 Decrypt') + '</button></div></div>' +
          '<div class="lab-out"><strong>' + __L('النتيجة:', 'Result:') + '</strong><div class="lab-result" data-role="out">—</div></div>' +
          '<div class="lab-out"><strong>' + __L('خريطة الحروف:', 'Letter map:') + '</strong><div class="cipher-map" data-role="map"></div></div>' +
          '</div>';
      },
      init: function (root) {
        var shiftWithin = function (s, shift) {
          var out = '';
          for (var i = 0; i < s.length; i++) {
            var ch = s[i], idx;
            if (/[a-z]/.test(ch)) { idx = (ch.charCodeAt(0) - 97 + shift + 26) % 26; out += String.fromCharCode(97 + idx); }
            else if (/[A-Z]/.test(ch)) { idx = (ch.charCodeAt(0) - 65 + shift + 26) % 26; out += String.fromCharCode(65 + idx); }
            else if ((idx = AR_ALPHA.indexOf(ch)) >= 0) { out += AR_ALPHA[(idx + shift + AR_ALPHA.length) % AR_ALPHA.length]; }
            else out += ch;
          }
          return out;
        };
        var run = function (dir) {
          var txt = root.querySelector('[data-role="text"]').value;
          var raw = parseInt(root.querySelector('[data-role="shift"]').value, 10) || 1;
          var s = ((raw % 26) + 26) % 26 * (dir === 'enc' ? 1 : -1);
          var res = shiftWithin(txt, dir === 'enc' ? (raw % 26) : -(raw % 26));
          root.querySelector('[data-role="out"]').textContent = res;
          var map = '';
          for (var i = 0; i < 26; i++) map += '<span class="cipher-cell"><b>' + String.fromCharCode(65 + i) + '</b>→<i>' + String.fromCharCode(65 + ((i + raw) % 26)) + '</i></span>';
          root.querySelector('[data-role="map"]').innerHTML = map;
        };
        root.querySelector('[data-role="enc"]').onclick = function () { run('enc'); };
        root.querySelector('[data-role="dec"]').onclick = function () { run('dec'); };
        run('enc');
      }
    },

    /* ---------------- 2) Password strength (Unit 3) ---------------- */
    {
      id: 'password', unit: 'u3', icon: '🔑',
      titleAr: 'مقياس قوة كلمة المرور', titleEn: 'Password Strength Meter',
      descAr: 'اكتب كلمة مرور وشوف قوتها فوراً، واعرف إيه اللي يخليها أقوى.',
      descEn: 'Type a password to see its strength and how to improve it.',
      html: function () {
        return '<div class="lab-field"><label>' + __L('كلمة المرور', 'Password') + '</label>' +
          '<input class="lab-input" type="text" data-role="pw" placeholder="' + __L('اكتب كلمة مرور للتجربة...', 'Type a password to try...') + '" autocomplete="off"></div>' +
          '<div class="pw-bar"><div class="pw-fill" data-role="fill"></div></div>' +
          '<div class="lab-row"><span class="pw-label" data-role="label">' + __L('ضعيفة جداً', 'Very weak') + '</span><span class="pw-score" data-role="score">0 / 6</span></div>' +
          '<div class="pw-checks" data-role="checks"></div>' +
          '<p class="lab-note">' + __L('لا تُدخل كلمة مرورك الحقيقية — دي مجرد تجربة محلية في المتصفح.', 'Do not enter your real password — this is just a local test in your browser.') + '</p>';
      },
      init: function (root) {
        var rules = [
          { t: __L('12 حرفاً على الأقل', 'At least 12 characters'), f: function (p) { return p.length >= 12; } },
          { t: __L('حروف كبيرة (A-Z)', 'Uppercase letters (A-Z)'), f: function (p) { return /[A-Z]/.test(p); } },
          { t: __L('حروف صغيرة (a-z)', 'Lowercase letters (a-z)'), f: function (p) { return /[a-z]/.test(p); } },
          { t: __L('أرقام (0-9)', 'Digits (0-9)'), f: function (p) { return /[0-9]/.test(p); } },
          { t: __L('رموز (!@#…)', 'Symbols (!@#…)'), f: function (p) { return /[^A-Za-z0-9]/.test(p); } },
          { t: __L('ليست كلمة شائعة', 'Not a common word'), f: function (p) { return p.length > 0 && !/^(password|123456|111111|qwerty|ahmed|admin)/i.test(p); } }
        ];
        var upd = function () {
          var p = root.querySelector('[data-role="pw"]').value;
          var score = rules.filter(function (r) { return r.f(p); }).length;
          var pct = Math.round(score / rules.length * 100);
          var fill = root.querySelector('[data-role="fill"]');
          fill.style.width = pct + '%';
          var colors = ['#dc2626', '#dc2626', '#f59e0b', '#f59e0b', '#16a34a', '#16a34a', '#0f766e'];
          fill.style.background = colors[score];
          var labels = [__L('ضعيفة جداً', 'Very weak'), __L('ضعيفة', 'Weak'), __L('متوسطة', 'Medium'), __L('جيدة', 'Good'), __L('قوية', 'Strong'), __L('قوية جداً', 'Very strong'), __L('ممتازة', 'Excellent')];
          root.querySelector('[data-role="label"]').textContent = p ? labels[score] : '—';
          root.querySelector('[data-role="score"]').textContent = score + ' / ' + rules.length;
          root.querySelector('[data-role="checks"]').innerHTML = rules.map(function (r) {
            var ok = r.f(p);
            return '<div class="pw-check ' + (ok ? 'ok' : '') + '">' + (ok ? '✓' : '○') + ' ' + esc(r.t) + '</div>';
          }).join('');
        };
        root.querySelector('[data-role="pw"]').oninput = upd;
        upd();
      }
    },

    /* ---------------- 3) Binary / Hex (Unit 5) ---------------- */
    {
      id: 'binary', unit: 'u5', icon: '💠',
      titleAr: 'محوّل الأنظمة العددية', titleEn: 'Binary & Hex Converter',
      descAr: 'حوّل بين العشري والثنائي والست عشري، وشوف تمثيل الأحرف رقمياً (ASCII).',
      descEn: 'Convert between decimal, binary and hexadecimal, and see character codes.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('عدد عشري', 'Decimal') + '</label><input class="lab-input" type="number" data-role="dec" value="255"></div>' +
          '<div class="lab-field"><label>' + __L('ثنائي', 'Binary') + '</label><input class="lab-input" data-role="bin" placeholder="11111111"></div></div>' +
          '<div class="lab-row"><div class="lab-field"><label>' + __L('ست عشري', 'Hexadecimal') + '</label><input class="lab-input" data-role="hex" placeholder="FF"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="conv">' + __L('↔ تحويل', '↔ Convert') + '</button></div></div>' +
          '<div class="lab-field"><label>' + __L('نص → رموز', 'Text → codes') + '</label><input class="lab-input" data-role="txt" value="ICT" maxlength="16"></div>' +
          '<div class="lab-out"><div class="lab-result" data-role="txtout">—</div></div>' +
          '<div class="bit-row" data-role="bits"></div>';
      },
      init: function (root) {
        var render = function () {
          var dec = parseInt(root.querySelector('[data-role="dec"]').value, 10);
          if (isNaN(dec) || dec < 0) dec = 0;
          root.querySelector('[data-role="bin"]').value = dec.toString(2);
          root.querySelector('[data-role="hex"]').value = dec.toString(16).toUpperCase();
          var bits = dec.toString(2).padStart(8, '0').slice(-8);
          root.querySelector('[data-role="bits"]').innerHTML = bits.split('').map(function (b, i) {
            var w = Math.pow(2, 7 - i);
            return '<span class="bit ' + (b === '1' ? 'on' : '') + '">' + b + '<small>' + w + '</small></span>';
          }).join('');
          var txt = root.querySelector('[data-role="txt"]').value;
          root.querySelector('[data-role="txtout"]').innerHTML = txt.split('').map(function (c) {
            var code = c.charCodeAt(0);
            return '<span class="char-cell"><b>' + esc(c) + '</b><span>dec ' + code + '</span><span>bin ' + code.toString(2) + '</span><span>hex ' + code.toString(16).toUpperCase() + '</span></span>';
          }).join('');
        };
        root.querySelector('[data-role="dec"]').oninput = render;
        root.querySelector('[data-role="txt"]').oninput = render;
        root.querySelector('[data-role="conv"]').onclick = function () {
          var bin = root.querySelector('[data-role="bin"]').value.trim();
          var hex = root.querySelector('[data-role="hex"]').value.trim();
          var d = NaN;
          if (/^[01]+$/.test(bin)) d = parseInt(bin, 2);
          else if (/^[0-9a-f]+$/i.test(hex)) d = parseInt(hex, 16);
          if (!isNaN(d)) root.querySelector('[data-role="dec"]').value = d;
          render();
        };
        render();
      }
    },

    /* ---------------- 4) ADC sampler (Unit 5) ---------------- */
    {
      id: 'adc', unit: 'u5', icon: '🎚️',
      titleAr: 'معمل التحويل تناظري → رقمي', titleEn: 'Analogue → Digital Lab',
      descAr: 'غيّر التردد ومعدّل العينات، وشوف الموجة بتتحوّل لبتات 0 و 1.',
      descEn: 'Change frequency and sample rate to see a wave become bits.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('التردد (Hz): ', 'Frequency (Hz): ') + '<b data-role="fv">1</b></label><input type="range" data-role="freq" min="1" max="8" value="1"></div>' +
          '<div class="lab-field"><label>' + __L('معدل العينات: ', 'Sample rate: ') + '<b data-role="sv">8</b></label><input type="range" data-role="samp" min="2" max="24" value="8"></div></div>' +
          '<canvas id="adcCanvas" class="lab-canvas" width="640" height="220"></canvas>' +
          '<div class="lab-out"><strong>' + __L('البِتات:', 'Bits:') + '</strong><div class="lab-result mono" data-role="bits">—</div></div>' +
          '<p class="lab-note">' + __L('كل ما معدل العينات يعلى، النبضة الرقمية تقرّب أكتر من الموجة الأصلية.', 'The higher the sample rate, the closer the digital signal gets to the original wave.') + '</p>';
      },
      init: function (root) {
        var draw = function () {
          var f = +root.querySelector('[data-role="freq"]').value;
          var n = +root.querySelector('[data-role="samp"]').value;
          root.querySelector('[data-role="fv"]').textContent = f;
          root.querySelector('[data-role="sv"]').textContent = n;
          var ctx = getCtx(root, 'adcCanvas', 640, 220); if (!ctx) return;
          var W = 640, H = 220, mid = H / 2, amp = 70;
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(20, mid); ctx.lineTo(W - 20, mid); ctx.stroke();
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath();
          for (var x = 20; x <= W - 20; x++) {
            var t = (x - 20) / (W - 40);
            var y = mid - Math.sin(t * f * Math.PI * 2) * amp;
            if (x === 20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
          var bits = '';
          ctx.fillStyle = '#f59e0b';
          for (var i = 0; i < n; i++) {
            var tx = 20 + (W - 40) * (i / (n - 1));
            var v = Math.sin((i / (n - 1)) * f * Math.PI * 2);
            var bit = v >= 0 ? 1 : 0;
            bits += bit;
            ctx.beginPath(); ctx.arc(tx, mid - v * amp, 4, 0, 7); ctx.fill();
            ctx.fillStyle = bit ? '#22c55e' : '#ef4444';
            ctx.fillRect(tx - 6, H - 24, 12, 16);
            ctx.fillStyle = '#0b1220'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText(String(bit), tx, H - 12);
            ctx.fillStyle = '#f59e0b';
          }
          root.querySelector('[data-role="bits"]').textContent = bits;
        };
        root.querySelector('[data-role="freq"]').oninput = draw;
        root.querySelector('[data-role="samp"]').oninput = draw;
        draw();
      }
    },

    /* ---------------- 5) Logic gates (Unit 6) ---------------- */
    {
      id: 'logic', unit: 'u6', icon: '⚡',
      titleAr: 'محاكي البوابات المنطقية', titleEn: 'Logic Gates Simulator',
      descAr: 'بدّل قيمتي الإدخال A و B، وشوف خرج كل بوابة فوراً مع جدول الحقيقة.',
      descEn: 'Toggle inputs A and B and watch every gate output live.',
      html: function () {
        return '<div class="logic-switches">' +
          '<button class="logic-sw" data-role="a" data-v="0">A = <b>0</b></button>' +
          '<button class="logic-sw" data-role="b" data-v="0">B = <b>0</b></button></div>' +
          '<div class="gate-grid" data-role="gates"></div>' +
          '<div class="truth" data-role="truth"></div>';
      },
      init: function (root) {
        var A = 0, B = 0;
        var draw = function () {
          root.querySelector('[data-role="a"]').innerHTML = 'A = <b>' + A + '</b>';
          root.querySelector('[data-role="b"]').innerHTML = 'B = <b>' + B + '</b>';
          root.querySelector('[data-role="a"]').classList.toggle('on', A === 1);
          root.querySelector('[data-role="b"]').classList.toggle('on', B === 1);
          var gates = [
            ['AND', A && B], ['OR', A || B], ['NOT A', A ? 0 : 1], ['NAND', !(A && B) ? 1 : 0],
            ['NOR', !(A || B) ? 1 : 0], ['XOR', A !== B ? 1 : 0]
          ];
          root.querySelector('[data-role="gates"]').innerHTML = gates.map(function (g) {
            return '<div class="gate ' + (g[1] ? 'on' : '') + '"><span class="gate-name">' + g[0] + '</span><span class="bulb">' + (g[1] ? 1 : 0) + '</span></div>';
          }).join('');
          var rows = [[0, 0], [0, 1], [1, 0], [1, 1]].map(function (r) {
            var a = r[0], b = r[1];
            return '<tr><td>' + a + '</td><td>' + b + '</td><td>' + (a && b ? 1 : 0) + '</td><td>' + (a || b ? 1 : 0) + '</td><td>' + (a !== b ? 1 : 0) + '</td></tr>';
          }).join('');
          root.querySelector('[data-role="truth"]').innerHTML = '<table class="truth-table"><thead><tr><th>A</th><th>B</th><th>AND</th><th>OR</th><th>XOR</th></tr></thead><tbody>' + rows + '</tbody></table>';
        };
        root.querySelector('[data-role="a"]').onclick = function () { A = A ? 0 : 1; draw(); };
        root.querySelector('[data-role="b"]').onclick = function () { B = B ? 0 : 1; draw(); };
        draw();
      }
    },

    /* ---------------- 6) DNS resolver (Unit 7) ---------------- */
    {
      id: 'dns', unit: 'u7', icon: '🌐',
      titleAr: 'محاكي DNS والإنترنت', titleEn: 'DNS & IP Simulator',
      descAr: 'اكتب اسم موقع، وشوف رحلة الترجمة من الاسم لعنوان IP خطوة بخطوة.',
      descEn: 'Type a domain and watch it resolve to an IP step by step.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('اسم النطاق', 'Domain name') + '</label><input class="lab-input" data-role="domain" value="school.edu.eg"></div>' +
          '<div class="lab-field lab-btns"><button class="btn-primary" data-role="go">' + __L('🌐 افتح الموقع', '🌐 Open the site') + '</button></div></div>' +
          '<div class="dns-steps" data-role="steps"></div>';
      },
      init: function (root) {
        var hashCode = function (s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
        root.querySelector('[data-role="go"]').onclick = function () {
          var d = root.querySelector('[data-role="domain"]').value.trim() || 'example.com';
          var h = hashCode(d);
          var ip = '203.' + (h % 255) + '.' + ((h >> 8) % 255) + '.' + ((h >> 16) % 254 + 1);
          var steps = [
            ['🧑‍💻', __L('المتصفح', 'Browser'), __L('بتكتب: ', 'Typing: ') + esc(d)],
            ['📇', 'DNS Server', __L('بيدوّر على الاسم في قاعدة العناوين…', 'Looking up the name in the address database…')],
            ['✅', __L('عنوان IP', 'IP address'), __L('اسم النطاق يتحوّل إلى: ', 'Domain name resolves to: ') + ip],
            ['🖥️', __L('الخادم (Server)', 'Server'), __L('طلب HTTP رايح للخادم عند ', 'HTTP request goes to the server at ') + ip],
            ['📄', __L('المتصفح', 'Browser'), __L('الخادم رجّع الصفحة، والمتصفح عرضها.', 'The server returned the page and the browser displayed it.')]
          ];
          var el = root.querySelector('[data-role="steps"]');
          el.innerHTML = steps.map(function (s) { return '<div class="dns-step"><span class="dns-ic">' + s[0] + '</span><div><b>' + s[1] + '</b><p>' + s[2] + '</p></div></div>'; }).join('');
        };
        root.querySelector('[data-role="go"]').click();
      }
    },

    /* ---------------- 7) Data explorer (Unit 9) ---------------- */
    {
      id: 'data', unit: 'u9', icon: '📊',
      titleAr: 'مستكشف البيانات والرسوم', titleEn: 'Data Explorer & Charts',
      descAr: 'اكتب مجموعة أرقام، وشوف الإحصاءات والرسم البياني بتتغيّر فوراً.',
      descEn: 'Enter numbers to see live statistics and a chart.',
      html: function () {
        return '<div class="lab-field"><label>' + __L('أرقام مفصولة بفواصل', 'Numbers separated by commas') + '</label><textarea class="lab-input" data-role="nums">85, 92, 78, 90, 88, 74, 95</textarea></div>' +
          '<div class="lab-row"><div class="lab-field lab-btns"><button class="btn-primary active" data-role="bars">' + __L('📊 أعمدة', '📊 Bars') + '</button><button class="btn-outline" data-role="line">' + __L('📈 خطي', '📈 Line') + '</button></div></div>' +
          '<div class="stat-grid" data-role="stats"></div>' +
          '<canvas id="dataCanvas" class="lab-canvas" width="640" height="240"></canvas>';
      },
      init: function (root) {
        var mode = 'bars';
        var draw = function () {
          var nums = root.querySelector('[data-role="nums"]').value.split(/[\s,،]+/).map(Number).filter(function (n) { return !isNaN(n); });
          if (!nums.length) nums = [0];
          var sum = nums.reduce(function (a, b) { return a + b; }, 0);
          var mean = sum / nums.length;
          var sorted = nums.slice().sort(function (a, b) { return a - b; });
          var median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
          var stats = [[__L('العدد', 'Count'), nums.length], [__L('المجموع', 'Sum'), Math.round(sum * 100) / 100], [__L('المتوسط', 'Mean'), Math.round(mean * 100) / 100], [__L('الوسيط', 'Median'), median], [__L('الأصغر', 'Smallest'), sorted[0]], [__L('الأكبر', 'Largest'), sorted[sorted.length - 1]]];
          root.querySelector('[data-role="stats"]').innerHTML = stats.map(function (s) { return '<div class="stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>'; }).join('');
          var ctx = getCtx(root, 'dataCanvas', 640, 240); if (!ctx) return;
          var W = 640, H = 240, pad = 30;
          var max = Math.max.apply(null, nums.concat([1]));
          ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
          if (mode === 'bars') {
            var bw = (W - pad * 2) / nums.length;
            nums.forEach(function (v, i) {
              var h = (v / max) * (H - pad * 2);
              var x = pad + i * bw + bw * 0.15;
              var grad = ctx.createLinearGradient(0, H - pad - h, 0, H - pad);
              grad.addColorStop(0, '#38bdf8'); grad.addColorStop(1, '#0f3d63');
              ctx.fillStyle = grad; ctx.fillRect(x, H - pad - h, bw * 0.7, h);
              ctx.fillStyle = '#93c5fd'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
              ctx.fillText(String(v), x + bw * 0.35, H - pad - h - 5);
            });
          } else {
            ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.beginPath();
            nums.forEach(function (v, i) {
              var x = pad + (W - pad * 2) * (nums.length === 1 ? 0.5 : i / (nums.length - 1));
              var y = H - pad - (v / max) * (H - pad * 2);
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            nums.forEach(function (v, i) {
              var x = pad + (W - pad * 2) * (nums.length === 1 ? 0.5 : i / (nums.length - 1));
              var y = H - pad - (v / max) * (H - pad * 2);
              ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
            });
          }
        };
        root.querySelector('[data-role="nums"]').oninput = draw;
        root.querySelector('[data-role="bars"]').onclick = function () { mode = 'bars'; root.querySelector('[data-role="bars"]').classList.add('active'); root.querySelector('[data-role="line"]').classList.remove('active'); draw(); };
        root.querySelector('[data-role="line"]').onclick = function () { mode = 'line'; root.querySelector('[data-role="line"]').classList.add('active'); root.querySelector('[data-role="bars"]').classList.remove('active'); draw(); };
        draw();
      }
    },

    /* ---------------- 8) Population simulation (Unit 10) ---------------- */
    {
      id: 'sim', unit: 'u10', icon: '🧪',
      titleAr: 'محاكاة النمو السكاني', titleEn: 'Population Simulation',
      descAr: 'غيّر معدّل النمو وعدد السنين، وشوف المحاكاة بتتنبأ بالمستقبل.',
      descEn: 'Change growth rate and years to simulate a population trend.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field"><label>' + __L('العدد الابتدائي: ', 'Starting population: ') + '<b data-role="pv">1000</b></label><input type="range" data-role="pop" min="100" max="5000" step="100" value="1000"></div>' +
          '<div class="lab-field"><label>' + __L('معدل النمو السنوي %: ', 'Annual growth rate %: ') + '<b data-role="rv">5</b></label><input type="range" data-role="rate" min="-5" max="20" value="5"></div>' +
          '<div class="lab-field"><label>' + __L('عدد السنين: ', 'Number of years: ') + '<b data-role="yv">10</b></label><input type="range" data-role="years" min="3" max="20" value="10"></div></div>' +
          '<canvas id="simCanvas" class="lab-canvas" width="640" height="240"></canvas>' +
          '<div class="lab-out"><strong>' + __L('النتيجة بعد ', 'Result after ') + '<span data-role="yn">10</span>' + __L(' سنين:', ' years:') + '</strong> <span class="lab-result" data-role="final">—</span></div>';
      },
      init: function (root) {
        var draw = function () {
          var p0 = +root.querySelector('[data-role="pop"]').value;
          var r = +root.querySelector('[data-role="rate"]').value / 100;
          var y = +root.querySelector('[data-role="years"]').value;
          root.querySelector('[data-role="pv"]').textContent = p0;
          root.querySelector('[data-role="rv"]').textContent = Math.round(r * 100);
          root.querySelector('[data-role="yv"]').textContent = y;
          root.querySelector('[data-role="yn"]').textContent = y;
          var vals = [];
          for (var i = 0; i <= y; i++) vals.push(Math.max(0, Math.round(p0 * Math.pow(1 + r, i))));
          root.querySelector('[data-role="final"]').textContent = vals[y].toLocaleString('en-US');
          var ctx = getCtx(root, 'simCanvas', 640, 240); if (!ctx) return;
          var W = 640, H = 240, pad = 30, max = Math.max.apply(null, vals.concat([1]));
          ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
          var bw = (W - pad * 2) / vals.length;
          vals.forEach(function (v, i) {
            var h = (v / max) * (H - pad * 2);
            var x = pad + i * bw + bw * 0.15;
            ctx.fillStyle = '#22c55e'; ctx.fillRect(x, H - pad - h, bw * 0.7, h);
          });
          ctx.fillStyle = '#93c5fd'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
          ctx.fillText(__L('سنة 0', 'Year 0'), pad, H - 10); ctx.fillText(__L('سنة ', 'Year ') + y, W - pad, H - 10);
        };
        ['pop', 'rate', 'years'].forEach(function (k) { root.querySelector('[data-role="' + k + '"]').oninput = draw; });
        draw();
      }
    },

    /* ---------------- 9) Smart home (Unit 4) ---------------- */
    {
      id: 'smarthome', unit: 'u4', icon: '🏠',
      titleAr: 'معمل المنزل الذكي (IoT)', titleEn: 'Smart Home (IoT) Lab',
      descAr: 'شغّل أجهزة المنزل الذكي وشوف استهلاك الكهرباء بيتغيّر لحظياً.',
      descEn: 'Toggle smart devices and watch live power usage.',
      html: function () {
        var devs = [['💡', __L('إضاءة', 'Lighting'), 60], ['❄️', __L('تكييف', 'Air conditioner'), 1500], ['📺', __L('تلفاز', 'TV'), 120], ['🧺', __L('غسالة', 'Washing machine'), 800], ['🔒', __L('أمن', 'Security'), 30]];
        return '<div class="device-grid" data-role="devices">' + devs.map(function (d, i) {
          return '<button class="device" data-role="d' + i + '" data-w="' + d[2] + '"><span class="dev-ic">' + d[0] + '</span><span class="dev-name">' + d[1] + '</span><span class="dev-w">' + d[2] + __L(' واط', ' W') + '</span></button>';
        }).join('') + '</div>' +
          '<div class="lab-out power"><strong>' + __L('الاستهلاك الحالي:', 'Current usage:') + '</strong> <span class="lab-result" data-role="total">' + __L('0 واط', '0 W') + '</span></div>' +
          '<p class="lab-note">' + __L('لو الاستهلاك زاد عن 2000 واط، النظام الذكي ممكن ينبّهك أو يفصل الأحمال الزائدة.', 'If usage goes above 2000 W, the smart system can alert you or cut off the extra loads.') + '</p>';
      },
      init: function (root) {
        var on = {};
        var upd = function () {
          var total = 0;
          root.querySelectorAll('.device').forEach(function (b) {
            var idx = b.getAttribute('data-role');
            var w = +b.getAttribute('data-w');
            if (on[idx]) { total += w; b.classList.add('on'); } else b.classList.remove('on');
          });
          root.querySelector('[data-role="total"]').textContent = total.toLocaleString('en-US') + __L(' واط', ' W') + (total > 2000 ? __L(' ⚠️ حمل زائد', ' ⚠️ Overload') : '');
        };
        root.querySelectorAll('.device').forEach(function (b) {
          b.onclick = function () { var k = b.getAttribute('data-role'); on[k] = !on[k]; upd(); };
        });
        upd();
      }
    },

    /* ---------------- 10) Machine learning (Unit 4) ---------------- */
    {
      id: 'ml', unit: 'u4', icon: '🤖',
      titleAr: 'كيف "يتعلّم" الذكاء الاصطناعي؟', titleEn: 'How AI Learns',
      descAr: 'اضغط "درّب النموذج" وشوف الكمبيوتر يستخرج الخط الأفضل من نقاط البيانات.',
      descEn: 'Train a model to find the best-fit line through noisy data points.',
      html: function () {
        return '<div class="lab-row"><div class="lab-field lab-btns"><button class="btn-primary" data-role="train">' + __L('🧠 درّب النموذج', '🧠 Train the model') + '</button><button class="btn-outline" data-role="reset">' + __L('🔄 بيانات جديدة', '🔄 New data') + '</button></div>' +
          '<div class="lab-field"><label>' + __L('توقّع عند x = ', 'Predict at x = ') + '<b data-role="xv">50</b></label><input type="range" data-role="x" min="0" max="100" value="50"></div></div>' +
          '<canvas id="mlCanvas" class="lab-canvas" width="640" height="240"></canvas>' +
          '<div class="lab-out"><strong>' + __L('توقّع النموذج:', 'Model prediction:') + '</strong> <span class="lab-result" data-role="pred">' + __L('درّب النموذج الأول', 'Train the model first') + '</span></div>' +
          '<p class="lab-note">' + __L('البيانات فيها تشويش (noise)، والنموذج بيدوّر على العلاقة العامة — ده جوهر التعلّم الآلي.', 'The data contains noise, and the model looks for the overall relationship — this is the essence of machine learning.') + '</p>';
      },
      init: function (root) {
        var pts = [], m = null, b = null;
        var gen = function () { pts = []; for (var i = 0; i < 18; i++) { var x = Math.random() * 100; pts.push([x, 0.6 * x + 15 + (Math.random() - 0.5) * 24]); } };
        var fit = function () {
          var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
          pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
          m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
          b = (sy - m * sx) / n;
        };
        var pred = function () { return m == null ? null : m * (+root.querySelector('[data-role="x"]').value) + b; };
        var draw = function () {
          root.querySelector('[data-role="xv"]').textContent = root.querySelector('[data-role="x"]').value;
          var ctx = getCtx(root, 'mlCanvas', 640, 240); if (!ctx) return;
          var W = 640, H = 240, pad = 30;
          ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.stroke();
          var X = function (x) { return pad + x / 100 * (W - pad * 2); };
          var Y = function (y) { return H - pad - Math.min(1, y / 90) * (H - pad * 2); };
          ctx.fillStyle = '#38bdf8';
          pts.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), 4, 0, 7); ctx.fill(); });
          if (m != null) {
            ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2; ctx.beginPath();
            ctx.moveTo(X(0), Y(b)); ctx.lineTo(X(100), Y(m * 100 + b)); ctx.stroke();
            var px = +root.querySelector('[data-role="x"]').value, py = pred();
            ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(X(px), Y(py), 6, 0, 7); ctx.fill();
            root.querySelector('[data-role="pred"]').textContent = 'y ≈ ' + Math.round(py * 10) / 10;
          } else root.querySelector('[data-role="pred"]').textContent = __L('درّب النموذج الأول', 'Train the model first');
        };
        root.querySelector('[data-role="train"]').onclick = function () { fit(); draw(); };
        root.querySelector('[data-role="reset"]').onclick = function () { m = null; b = null; gen(); draw(); };
        root.querySelector('[data-role="x"]').oninput = draw;
        gen(); draw();
      }
    }
  ];

  window.ICT_LABS = LABS;
})();
