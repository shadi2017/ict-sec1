/* ============================================================
   auth.js — بوابة الحسابات
   • تسجيل حساب جديد (اسم + موبايل + صف + كلمة مرور)
   • دخول / خروج، وشاشة «في انتظار تفعيل المدرس»
   • مزامنة التقدم والأحداث مع السيرفر (للتحليلات)
   • تسجيل نشاط الطالب: دروس، اختبارات، معامل، ألعاب، مدرّس ذكي
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var session = { enabled: true, account: null, devices: 0, maxDevices: 2, screen: 'login', notice: '' };
  var queue = [];
  var flushTimer = null, soonTimer = null, lastSignature = '';
  var gate = null;

  /* ----------------------------- أدوات ----------------------------- */
  function lang() { try { return window.ICT.getLang(); } catch (e) { return 'ar'; } }

  function T(key, fallback) {
    var copy = window.COPY || {};
    var table = copy[lang()] || {};
    if (table[key] != null) return table[key];
    if (copy.ar && copy.ar[key] != null) return copy.ar[key];
    return fallback != null ? fallback : key;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function api(path, options) {
    var opts = options || {};
    return fetch(path, {
      method: opts.method || 'GET',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { status: response.status, data: data && typeof data === 'object' ? data : {} };
      });
    });
  }

  /** كود الخطأ القادم من السيرفر → نص مترجم (ولو مش معروف نستخدم نص السيرفر). */
  function errorText(data) {
    var code = data && data.error ? String(data.error) : 'generic';
    var translated = T('err_' + code, null);
    if (translated) return translated;
    return (data && data.message) || T('err_generic');
  }

  function toast(message) {
    var el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 4200);
  }

  function setNotice(message) {
    session.notice = message || '';
    if (message) toast(message);
  }

  function readProgress() {
    try { return JSON.parse(localStorage.getItem('ict-progress-v2') || '{}'); } catch (e) { return {}; }
  }

  function signature() {
    var user = window.ICT && window.ICT.getUser ? window.ICT.getUser() : {};
    var progress = readProgress();
    return [user.points || 0, user.certs || 0, Object.keys(progress).join(',')].join('|');
  }

  /* ------------------------- بصمة الجهاز ------------------------- */
  function fallbackHash(value) {
    var hash = 5381;
    for (var i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
    return 'f' + (hash >>> 0).toString(16) + '-' + value.length.toString(16);
  }

  /** بصمة مستقرة لنفس المتصفح على نفس الجهاز (مابتعتمدش على حجم النافذة ولا الزووم). */
  function fingerprint() {
    var screen1 = Math.min(window.screen.width, window.screen.height) + 'x' + Math.max(window.screen.width, window.screen.height);
    var timezone = '';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    var raw = [
      navigator.userAgent, navigator.language, screen1,
      String(window.screen.colorDepth), timezone, navigator.platform || '',
      String(navigator.hardwareConcurrency || ''), String(navigator.maxTouchPoints || '')
    ].join('|');
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
        .then(function (buffer) {
          var out = '';
          new Uint8Array(buffer).forEach(function (byte) { out += ('0' + byte.toString(16)).slice(-2); });
          return out;
        })
        .catch(function () { return fallbackHash(raw); });
    }
    return Promise.resolve(fallbackHash(raw));
  }

  /* --------------------------- شكل الشاشات --------------------------- */
  function langButton() {
    return '<button type="button" class="auth-lang" data-act="lang" title="عربي/English">' + (lang() === 'ar' ? 'EN' : 'ع') + '</button>';
  }

  function noticeHTML(id) {
    var notice = session.notice;
    session.notice = '';
    return '<div class="auth-msg' + (notice ? ' show' : '') + '" id="' + (id || 'authMsg') + '">' + esc(notice) + '</div>';
  }

  function checkingHTML() {
    return '<div class="auth-card auth-status"><div class="auth-spinner"></div>' +
      '<p class="auth-sub">' + esc(T('authSubLogin')) + '</p></div>';
  }

  function loginHTML() {
    return '<div class="auth-card">' + langButton() +
      '<div class="auth-logo">ICT</div>' +
      '<h1>' + esc(T('authLoginTitle')) + '</h1>' +
      '<p class="auth-sub">' + esc(T('authSubLogin')) + '</p>' +
      '<div class="auth-tabs">' +
        '<button type="button" class="active" data-act="tab-login">' + esc(T('authTabLogin')) + '</button>' +
        '<button type="button" data-act="tab-register">' + esc(T('authTabRegister')) + '</button>' +
      '</div>' +
      '<form data-form="login" novalidate>' +
        '<label class="auth-field"><span>' + esc(T('authPhone')) + '</span>' +
          '<input name="phone" inputmode="tel" autocomplete="tel" placeholder="' + esc(T('authPhonePh')) + '"></label>' +
        '<label class="auth-field"><span>' + esc(T('authPassword')) + '</span>' +
          '<input name="password" type="password" autocomplete="current-password" placeholder="' + esc(T('authPasswordPh')) + '"></label>' +
        noticeHTML() +
        '<button class="btn-primary auth-submit" type="submit">' + esc(T('authLoginBtn')) + '</button>' +
      '</form>' +
      '<p class="auth-switch">' + esc(T('authNoAccount')) + ' <button type="button" data-act="tab-register">' + esc(T('authRegisterBtn')) + '</button></p>' +
      '<p class="auth-note">' + esc(T('authDeviceNote')) + '</p>' +
      '<p class="auth-admin"><button type="button" data-act="admin">' + esc(T('adminLink')) + '</button></p>' +
    '</div>';
  }

  function gradeOptions() {
    var years = (window.CURRICULUM && window.CURRICULUM.years) || [];
    return '<option value="">' + esc(T('authGradeChoose')) + '</option>' + years.map(function (year) {
      return '<option value="' + esc(year.id) + '">' + esc(lang() === 'ar' ? year.nameAr : year.nameEn) + '</option>';
    }).join('');
  }

  function registerHTML() {
    return '<div class="auth-card">' + langButton() +
      '<div class="auth-logo">ICT</div>' +
      '<h1>' + esc(T('authRegisterTitle')) + '</h1>' +
      '<p class="auth-sub">' + esc(T('authSubRegister')) + '</p>' +
      '<div class="auth-tabs">' +
        '<button type="button" data-act="tab-login">' + esc(T('authTabLogin')) + '</button>' +
        '<button type="button" class="active" data-act="tab-register">' + esc(T('authTabRegister')) + '</button>' +
      '</div>' +
      '<form data-form="register" novalidate>' +
        '<label class="auth-field"><span>' + esc(T('authName')) + '</span>' +
          '<input name="name" autocomplete="name" placeholder="' + esc(T('authNamePh')) + '"></label>' +
        '<label class="auth-field"><span>' + esc(T('authPhone')) + '</span>' +
          '<input name="phone" inputmode="tel" autocomplete="tel" placeholder="' + esc(T('authPhonePh')) + '"></label>' +
        '<label class="auth-field"><span>' + esc(T('authGrade')) + '</span>' +
          '<select name="grade">' + gradeOptions() + '</select></label>' +
        '<label class="auth-field"><span>' + esc(T('authPassword')) + '</span>' +
          '<input name="password" type="password" autocomplete="new-password" placeholder="' + esc(T('authPasswordPh')) + '"></label>' +
        '<label class="auth-field"><span>' + esc(T('authConfirm')) + '</span>' +
          '<input name="confirm" type="password" autocomplete="new-password" placeholder="' + esc(T('authConfirmPh')) + '"></label>' +
        noticeHTML() +
        '<button class="btn-primary auth-submit" type="submit">' + esc(T('authRegisterBtn')) + '</button>' +
      '</form>' +
      '<p class="auth-switch">' + esc(T('authHaveAccount')) + ' <button type="button" data-act="tab-login">' + esc(T('authLoginBtn')) + '</button></p>' +
      '<p class="auth-note">' + esc(T('authDeviceNote')) + '</p>' +
    '</div>';
  }

  function statusHTML(kind) {
    var account = session.account || {};
    var active = kind === 'active';
    var blocked = kind === 'blocked';
    var icon = active ? '✅' : blocked ? '🚫' : '⏳';
    var title = active ? T('authActiveTitle') : blocked ? T('authBlockedTitle') : T('authPendingTitle');
    var body = active ? T('authActiveText') : blocked ? T('authBlockedText') : T('authPendingText');
    return '<div class="auth-card auth-status">' + langButton() +
      '<div class="auth-icon">' + icon + '</div>' +
      '<h1>' + esc(title) + '</h1>' +
      '<p class="auth-sub">' + esc(body) + '</p>' +
      '<div class="auth-who">' +
        '<div><b>' + esc(T('authName')) + '</b><span>' + esc(account.name || '') + '</span></div>' +
        '<div><b>' + esc(T('authPhone')) + '</b><span>' + esc(account.phone || '') + '</span></div>' +
        '<div><b>' + esc(T('authGradeLbl')) + '</b><span>' + esc(account.gradeName || '') + '</span></div>' +
        (session.devices ? '<div><b>' + esc(T('authDevices')) + '</b><span>' + session.devices + ' / ' + session.maxDevices + '</span></div>' : '') +
      '</div>' +
      noticeHTML() +
      (active ? '<button type="button" class="btn-primary auth-submit" data-act="enter">' + esc(T('authEnter')) + '</button>' : '') +
      '<button type="button" class="btn-primary auth-submit' + (active ? ' btn-outline' : '') + '" data-act="refresh">' + esc(T('authRefresh')) + '</button>' +
      '<button type="button" class="btn-outline auth-submit" data-act="logout">' + esc(T('authLogout')) + '</button>' +
      '<p class="auth-note">' + esc(T('authDeviceNote')) + '</p>' +
    '</div>';
  }

  function showApp() {
    document.documentElement.setAttribute('data-gate', 'off');
    if (gate) { gate.hidden = true; gate.innerHTML = ''; }
  }

  function showGate(screen, notice) {
    session.screen = screen || 'login';
    if (notice) session.notice = notice;
    document.documentElement.setAttribute('data-gate', 'on');
    if (!gate) return;
    gate.hidden = false;
    gate.innerHTML = session.screen === 'register' ? registerHTML()
      : session.screen === 'pending' || session.screen === 'blocked' || session.screen === 'active' ? statusHTML(session.screen)
      : session.screen === 'checking' ? checkingHTML()
      : loginHTML();
    if (session.screen === 'login' || session.screen === 'register') {
      var first = gate.querySelector('input');
      if (first && window.innerWidth > 640) first.focus();
    } else if (session.notice && !notice) {
      toast(session.notice);
    }
  }

  function setMsg(message) {
    var el = $('authMsg');
    if (!el) { if (message) toast(message); return; }
    el.textContent = message;
    el.className = 'auth-msg show';
  }

  function setBusy(form, busy) {
    Array.prototype.forEach.call(form.querySelectorAll('button, input, select'), function (el) { el.disabled = busy; });
  }

  /* ------------------------- الجلسة والمزامنة ------------------------- */
  function acceptSession(data) {
    session.enabled = true;
    session.account = data.account || session.account;
    session.devices = data.devices || session.devices || 1;
    session.maxDevices = data.maxDevices || 2;
    var status = session.account ? session.account.status : 'pending';
    if (status !== 'active') { showGate(status === 'blocked' ? 'blocked' : 'pending'); return; }
    if (window.ICT && window.ICT.applyAccount) window.ICT.applyAccount(session.account, { devices: session.devices, maxDevices: session.maxDevices });
    if (data.revoked) toast(T('authDeviceNote'));
    showApp();
    startSync();
  }

  function sessionKicked() {
    session.account = null;
    queue = [];
    if (flushTimer) { window.clearInterval(flushTimer); flushTimer = null; }
    showGate('login', T('authKicked'));
  }

  function flush(useBeacon, force) {
    if (!session.enabled || !session.account || session.account.status !== 'active') return;
    var events = queue.slice(0, 40);
    var sig = signature();
    if (!useBeacon && !force && !events.length && sig === lastSignature) return;
    lastSignature = sig;
    queue = queue.slice(events.length);

    var user = window.ICT && window.ICT.getUser ? window.ICT.getUser() : {};
    var payload = { points: user.points || 0, certs: user.certs || 0, progress: readProgress(), events: events };

    if (useBeacon && navigator.sendBeacon) {
      try {
        navigator.sendBeacon('/api/auth/sync', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        return;
      } catch (e) { /* نكمل بالطلب العادي */ }
    }

    api('/api/auth/sync', { method: 'POST', body: payload }).then(function (res) {
      if (res.status === 401) { sessionKicked(); return; }
      if (res.status === 403) { window.location.reload(); return; } // حساب موقوف/لسه مش مفعّل
      if (session.account && res.data && typeof res.data.points === 'number') session.account.points = res.data.points;
    }).catch(function () {
      queue = events.concat(queue).slice(0, 200);
    });
  }

  function scheduleFlush() {
    if (soonTimer) return;
    soonTimer = window.setTimeout(function () { soonTimer = null; flush(); }, 5000);
  }

  function startSync() {
    if (flushTimer) return;
    // كل دقيقة بنبعت حالة الطالب (وكمان عشان نعرف لو الأدمن قفل حسابه أو صفّر أجهزته)
    flushTimer = window.setInterval(function () { if (!document.hidden) flush(false, true); }, 60000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) flush(true); });
    window.addEventListener('pagehide', function () { flush(true); });
    flush(false, true);
  }

  /* --------------------------- تسجيل النشاط --------------------------- */
  window.ICTLog = function (kind, ref, value) {
    if (!session.account || session.account.status !== 'active') return;
    queue.push({
      kind: kind,
      ref: ref == null ? null : String(ref).slice(0, 60),
      value: typeof value === 'number' && isFinite(value) ? Math.round(value) : null
    });
    if (queue.length >= 15) flush(); else scheduleFlush();
  };

  function wrapNavigation() {
    var ICT = window.ICT;
    if (!ICT) return;
    var views = { openLesson: 'lesson', openLab: 'lab', openGame: 'game' };
    Object.keys(views).forEach(function (name) {
      var original = ICT[name];
      if (typeof original !== 'function') return;
      ICT[name] = function () {
        var result = original.apply(ICT, arguments);
        var state = ICT.getState ? ICT.getState() : {};
        var ref = name === 'openLesson' ? (state.unit + ':' + state.lesson) : (name === 'openLab' ? state.lab : state.game);
        window.ICTLog(views[name], ref);
        return result;
      };
    });
    ['openDemo', 'askTutor', 'sendTutor'].forEach(function (name) {
      var original = ICT[name];
      if (typeof original !== 'function') return;
      ICT[name] = function (value) {
        window.ICTLog(name === 'openDemo' ? 'demo' : 'tutor', typeof value === 'string' ? value : 'course');
        return original.apply(ICT, arguments);
      };
    });
  }

  /* ------------------------------ الأحداث ------------------------------ */
  function submitLogin(form) {
    var phone = String(form.phone.value || '').trim();
    var password = String(form.password.value || '');
    if (!phone || !password) { setMsg(T('err_badLogin')); return; }
    setBusy(form, true);
    fingerprint()
      .then(function (fp) { return api('/api/auth/login', { method: 'POST', body: { phone: phone, password: password, fp: fp } }); })
      .then(function (res) {
        setBusy(form, false);
        if (res.status === 200 && res.data.ok) { acceptSession(res.data); return; }
        setMsg(errorText(res.data));
      })
      .catch(function () { setBusy(form, false); setMsg(T('authConn')); });
  }

  function submitRegister(form) {
    var name = String(form.name.value || '').trim();
    var phone = String(form.phone.value || '').trim();
    var grade = String(form.grade.value || '');
    var password = String(form.password.value || '');
    var confirm = String(form.confirm.value || '');
    if (name.length < 3) { setMsg(T('authErrName')); return; }
    if (!/^0?1?\d{9,10}$/.test(phone.replace(/\D/g, ''))) { setMsg(T('authErrPhone')); return; }
    if (!grade) { setMsg(T('authErrGrade')); return; }
    if (password.length < 6) { setMsg(T('authErrPass')); return; }
    if (password !== confirm) { setMsg(T('authErrMatch')); return; }

    setBusy(form, true);
    api('/api/auth/register', { method: 'POST', body: { name: name, phone: phone, grade: grade, password: password } })
      .then(function (res) {
        setBusy(form, false);
        if (res.status === 201) {
          session.account = { name: name, phone: phone, grade: grade, gradeName: gradeName(grade), status: 'pending' };
          showGate('pending');
          return;
        }
        setMsg(errorText(res.data));
      })
      .catch(function () { setBusy(form, false); setMsg(T('authConn')); });
  }

  function gradeName(id) {
    var years = (window.CURRICULUM && window.CURRICULUM.years) || [];
    var found = years.filter(function (year) { return year.id === id; })[0];
    return found ? (lang() === 'ar' ? found.nameAr : found.nameEn) : '';
  }

  function refreshStatus(button) {
    if (button) button.disabled = true;
    api('/api/auth/me').then(function (res) {
      if (button) button.disabled = false;
      var data = res.data || {};
      if (data.authenticated && data.account) {
        if (data.account.status === 'active') { acceptSession(data); return; }
        session.account = data.account;
        session.devices = data.devices || session.devices;
        showGate(data.account.status === 'blocked' ? 'blocked' : 'pending');
        return;
      }
      showGate('login');
    }).catch(function () {
      if (button) button.disabled = false;
      setMsg(T('authConn'));
    });
  }

  function logout() {
    api('/api/auth/logout', { method: 'POST' })
      .catch(function () { /* حتى لو فشل، بنخرج محليًا */ })
      .then(function () {
        session.account = null;
        queue = [];
        lastSignature = '';
        window.location.reload();
      });
  }

  /* ------------------------------- البداية ------------------------------- */
  function boot() {
    gate = $('authGate');
    if (!gate) return;

    gate.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-act]') : null;
      if (!button) return;
      var act = button.getAttribute('data-act');
      if (act === 'tab-login') showGate('login');
      else if (act === 'tab-register') showGate('register');
      else if (act === 'lang') { window.ICT.toggleLang(); showGate(session.screen === 'register' ? 'register' : session.screen); }
      else if (act === 'refresh') refreshStatus(button);
      else if (act === 'logout') logout();
      else if (act === 'enter') showApp();
      else if (act === 'admin') { if (window.ICTAdmin) window.ICTAdmin.open(); }
    });

    gate.addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.target;
      if (form.getAttribute('data-form') === 'login') submitLogin(form); else submitRegister(form);
    });

    var adminLink = $('adminLink');
    if (adminLink) adminLink.addEventListener('click', function () { if (window.ICTAdmin) window.ICTAdmin.open(); });

    wrapNavigation();
    showGate('checking');

    api('/api/auth/me').then(function (res) {
      var data = res.data || {};
      if (data.enabled === false) { showApp(); return; }
      session.enabled = true;
      if (data.authenticated && data.account) { acceptSession(data); return; }
      showGate('login');
    }).catch(function () {
      api('/api/auth/me').then(function (res) {
        var data = res.data || {};
        if (data.enabled === false) { showApp(); return; }
        if (data.authenticated && data.account) { acceptSession(data); return; }
        showGate('login');
      }).catch(function () { showGate('login', T('authConn')); });
    });
  }

  window.ICTAuth = {
    open: function () { showGate('login'); },
    account: function () { return session.account; },
    log: window.ICTLog,
    sync: function () { flush(); },
    logout: logout
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
