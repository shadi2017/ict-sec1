/* ============================================================
   admin.js — لوحة المدرس
   • كل الحسابات: تفعيل / إيقاف / تصفير الأجهزة / حذف
   • تحليلات: أرقام عامة، نشاط ١٤ يوم، أكتر الدروس، أعلى الطلاب،
     الطلاب المتوقفين، أسئلة المدرّس الذكي، ومتوسط الاختبارات
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    authed: false, ready: true, user: 'admin', tab: 'students',
    filter: 'all', query: '', students: [], analytics: null,
    loading: false, error: '', focusSearch: false,
    modal: null // { student, value, result }
  };
  var panel = null;

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

  function errorText(data) {
    var code = data && data.error ? String(data.error) : 'generic';
    return T('err_' + code, null) || (data && data.message) || T('err_generic');
  }

  function toast(message) {
    var el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  function num(value) { return Number(value || 0).toLocaleString(lang() === 'ar' ? 'ar-EG' : 'en-GB'); }

  function when(iso) {
    if (!iso) return T('adminNever');
    var diff = Date.now() - new Date(iso).getTime();
    var minutes = Math.round(diff / 60000);
    if (diff < 0 || minutes < 1) return lang() === 'ar' ? 'دلوقتي' : 'now';
    if (minutes < 60) return lang() === 'ar' ? 'من ' + minutes + ' دقيقة' : minutes + 'm ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return lang() === 'ar' ? 'من ' + hours + ' ساعة' : hours + 'h ago';
    var days = Math.round(hours / 24);
    if (days === 1) return lang() === 'ar' ? 'امبارح' : 'yesterday';
    if (days < 14) return lang() === 'ar' ? 'من ' + days + ' يوم' : days + 'd ago';
    return new Date(iso).toLocaleDateString(lang() === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' });
  }

  function shortDay(day) {
    var parts = String(day || '').split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] : day;
  }

  /* ------------------------------ الدخول ------------------------------ */
  function loginHTML() {
    return '<div class="admin-login">' +
      '<div class="auth-card">' +
        '<div class="auth-logo">ICT</div>' +
        '<h1>' + esc(T('adminLoginTitle')) + '</h1>' +
        '<p class="auth-sub">' + esc(T('adminTitle')) + '</p>' +
        (state.ready ? '' : '<div class="auth-msg show">' + esc(T('err_adminOff')) + '</div>') +
        '<form data-form="admin" novalidate>' +
          '<label class="auth-field"><span>' + esc(T('adminUser')) + '</span>' +
            '<input name="user" autocomplete="username" value="' + esc(state.user) + '"' + (state.ready ? '' : ' disabled') + '></label>' +
          '<label class="auth-field"><span>' + esc(T('adminPassword')) + '</span>' +
            '<input name="password" type="password" autocomplete="current-password"' + (state.ready ? '' : ' disabled') + '></label>' +
          '<div class="auth-msg" id="adminMsg"></div>' +
          '<button class="btn-primary auth-submit" type="submit"' + (state.ready ? '' : ' disabled') + '>' + esc(T('adminEnter')) + '</button>' +
        '</form>' +
        '<button type="button" class="btn-outline auth-submit" data-act="close">' + esc(T('adminBack')) + '</button>' +
      '</div></div>';
  }

  function submitLogin(form) {
    var message = $('adminMsg');
    api('/api/admin/login', { method: 'POST', body: { user: form.user.value.trim() || 'admin', password: form.password.value } })
      .then(function (res) {
        if (res.status === 200) { state.authed = true; render(); loadStudents(); return; }
        if (message) { message.textContent = errorText(res.data); message.className = 'auth-msg show'; }
      })
      .catch(function () {
        if (message) { message.textContent = T('authConn'); message.className = 'auth-msg show'; }
      });
  }

  /* ------------------------------ الشكل ------------------------------ */
  function dashboardHTML() {
    var pending = state.students.filter(function (s) { return s.status === 'pending'; }).length;
    return '<div class="admin-shell">' +
      '<header class="admin-top">' +
        '<div class="admin-brand"><span class="admin-mark">ICT</span>' +
          '<span class="admin-brand-text"><strong>' + esc(T('adminTitle')) + '</strong><small>' + esc(T('adminDevicesHint')) + '</small></span></div>' +
        '<div class="admin-actions">' +
          '<button type="button" class="btn-outline" data-act="reload">↻ ' + esc(T('adminUpdated').replace('✓', '')) + '</button>' +
          '<button type="button" class="btn-outline" data-act="close">' + esc(T('adminBack')) + '</button>' +
          '<button type="button" class="btn-outline danger" data-act="admin-logout">' + esc(T('adminLogout')) + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="admin-tabs">' +
        '<button type="button" class="' + (state.tab === 'students' ? 'active' : '') + '" data-act="tab-students">' +
          esc(T('adminStudents')) + (pending ? ' <span class="admin-badge">' + num(pending) + '</span>' : '') + '</button>' +
        '<button type="button" class="' + (state.tab === 'analytics' ? 'active' : '') + '" data-act="tab-analytics">' + esc(T('adminAnalytics')) + '</button>' +
      '</div>' +
      '<div class="admin-body" data-region="body"></div>' +
      modalHTML() +
    '</div>';
  }

  function randomPassword() {
    var alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var bytes = new Uint8Array(8);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    var out = '';
    for (var i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
    return out.slice(0, 4) + '-' + out.slice(4);
  }

  function modalHTML() {
    if (!state.modal) return '';
    var student = state.modal.student;
    var who = '<p class="muted">' + esc(student.name) + ' · <span class="mono">' + esc(student.phone) + '</span></p>';
    if (state.modal.result) {
      return '<div class="admin-modal-backdrop">' +
        '<div class="admin-modal" data-modal>' +
          '<h3>✅ ' + esc(T('adminPassDone')) + '</h3>' + who +
          '<div class="pass-result" id="passResult">' + esc(state.modal.result) + '</div>' +
          '<p class="muted small">' + esc(T('adminPassShare')) + '</p>' +
          '<p class="muted small">' + esc(T('adminPassSame')) + '</p>' +
          '<div class="admin-modal-actions">' +
            '<button type="button" class="mini" data-act="pass-copy">' + esc(T('adminCopy')) + '</button>' +
            '<button type="button" class="mini primary" data-act="modal-close">' + esc(T('adminDone')) + '</button>' +
          '</div>' +
        '</div></div>';
    }
    return '<div class="admin-modal-backdrop">' +
      '<div class="admin-modal" data-modal>' +
        '<h3>🔑 ' + esc(T('adminNewPass')) + '</h3>' + who +
        '<label class="auth-field"><span>' + esc(T('adminPassword')) + '</span>' +
          '<input data-pass-input autocomplete="off" value="' + esc(state.modal.value) + '"></label>' +
        '<p class="muted small">' + esc(T('adminNewPassHint')) + '</p>' +
        '<div class="admin-modal-actions">' +
          '<button type="button" class="mini" data-act="pass-generate">' + esc(T('adminGenerate')) + '</button>' +
          '<button type="button" class="mini primary" data-act="pass-save">' + esc(T('adminSave')) + '</button>' +
          '<button type="button" class="mini" data-act="modal-close">' + esc(T('adminCancel')) + '</button>' +
        '</div>' +
      '</div></div>';
  }

  function render() {
    if (!panel) return;
    document.documentElement.setAttribute('data-gate', 'admin');
    panel.hidden = false;
    panel.innerHTML = state.authed ? dashboardHTML() : loginHTML();
    if (state.authed) renderBody();
  }

  function renderBody() {
    var region = panel.querySelector('[data-region="body"]');
    if (!region) return;
    region.innerHTML = state.tab === 'students' ? studentsHTML() : analyticsHTML();
    if (state.focusSearch) {
      var input = region.querySelector('[data-search]');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      state.focusSearch = false;
    }
  }

  /* ------------------------------ الطلاب ------------------------------ */
  function filtered() {
    var query = state.query.trim().toLowerCase();
    return state.students.filter(function (student) {
      if (state.filter !== 'all' && student.status !== state.filter) return false;
      if (!query) return true;
      return String(student.name || '').toLowerCase().indexOf(query) >= 0 || String(student.phone || '').indexOf(query) >= 0;
    });
  }

  function chipHTML(value, label) {
    var count = value === 'all' ? state.students.length : state.students.filter(function (s) { return s.status === value; }).length;
    return '<button type="button" class="chip' + (state.filter === value ? ' active' : '') + '" data-act="filter" data-value="' + value + '">' +
      esc(label) + ' <b>' + num(count) + '</b></button>';
  }

  function statusPill(status) {
    return '<span class="status-pill ' + esc(status) + '">' + esc(T(status === 'active' ? 'adminActive' : status === 'blocked' ? 'adminBlocked' : 'adminPending')) + '</span>';
  }

  function studentsHTML() {
    var rows = filtered();
    return '<div class="admin-toolbar">' +
        '<input type="search" data-search placeholder="' + esc(T('adminSearch')) + '" value="' + esc(state.query) + '">' +
        '<div class="chips">' +
          chipHTML('all', T('adminAll')) + chipHTML('pending', T('adminPending')) +
          chipHTML('active', T('adminActive')) + chipHTML('blocked', T('adminBlocked')) +
        '</div>' +
      '</div>' +
      (state.loading ? '<p class="admin-empty">…</p>' : rows.length === 0 ? '<p class="admin-empty">' + esc(T('adminNoStudents')) + '</p>' :
      '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>' +
        ['adminThName', 'adminThPhone', 'adminThGrade', 'adminThStatus', 'adminThLessons', 'adminThPoints', 'adminThDevices', 'adminThSeen', ''].map(function (key) {
          return '<th>' + (key ? esc(T(key)) : '') + '</th>';
        }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (student) {
        var isActive = student.status === 'active';
        return '<tr class="row-' + esc(student.status) + '">' +
          '<td><b>' + esc(student.name) + '</b></td>' +
          '<td class="mono">' + esc(student.phone) + '</td>' +
          '<td>' + esc(student.gradeName || '') + '</td>' +
          '<td>' + statusPill(student.status) + '</td>' +
          '<td>' + num(student.lessons) + '</td>' +
          '<td>' + num(student.points) + '</td>' +
          '<td title="' + esc((student.deviceList || []).map(function (d) { return d.label; }).join(' · ')) + '">' + num(student.devices) + '</td>' +
          '<td class="muted">' + esc(when(student.last_seen)) + '</td>' +
          '<td class="admin-row-actions">' +
            '<button type="button" class="mini ' + (isActive ? '' : 'primary') + '" data-act="approve" data-id="' + esc(student.id) + '">' + esc(T('adminApprove')) + '</button>' +
            '<button type="button" class="mini" data-act="block" data-id="' + esc(student.id) + '">' + esc(T('adminBlock')) + '</button>' +
            '<button type="button" class="mini" data-act="reset-devices" data-id="' + esc(student.id) + '" title="' + esc(T('adminDevicesHint')) + '">' + esc(T('adminResetDevices')) + '</button>' +
            '<button type="button" class="mini" data-act="password" data-id="' + esc(student.id) + '" title="' + esc(T('adminNewPass')) + '">🔑 ' + esc(T('adminPassBtn')) + '</button>' +
            '<button type="button" class="mini danger" data-act="delete" data-id="' + esc(student.id) + '">' + esc(T('adminDelete')) + '</button>' +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div>');
  }

  /* ---------------------------- التحليلات ---------------------------- */
  function kpi(label, value, hint) {
    return '<div class="kpi"><span class="kpi-label">' + esc(label) + '</span>' +
      '<span class="kpi-value">' + esc(String(value)) + '</span>' +
      (hint ? '<span class="kpi-hint">' + esc(hint) + '</span>' : '') + '</div>';
  }

  function chartHTML(days) {
    var max = 1;
    days.forEach(function (day) { max = Math.max(max, day.logins || 0, day.active || 0); });
    return '<div class="chart">' + days.map(function (day) {
      return '<div class="chart-col" title="' + esc(day.day) + ' — ' + esc(T('adminLogins')) + ': ' + num(day.logins) + ' · ' + esc(T('adminActiveStudents')) + ': ' + num(day.active) + '">' +
        '<div class="chart-bars">' +
          '<span class="bar-login" style="height:' + Math.round((day.logins || 0) / max * 100) + '%"></span>' +
          '<span class="bar-active" style="height:' + Math.round((day.active || 0) / max * 100) + '%"></span>' +
        '</div><small>' + esc(shortDay(day.day)) + '</small></div>';
    }).join('') + '</div>' +
    '<div class="chart-legend"><span><i class="bar-login"></i>' + esc(T('adminLogins')) + '</span>' +
    '<span><i class="bar-active"></i>' + esc(T('adminActiveStudents')) + '</span></div>';
  }

  function barsHTML(items, labelKey) {
    if (!items.length) return '<p class="admin-empty">' + esc(T('adminEmpty')) + '</p>';
    var max = items.reduce(function (top, item) { return Math.max(top, item.count); }, 1);
    return '<ul class="bar-list">' + items.map(function (item) {
      return '<li><span class="bar-name">' + esc(labelKey ? T(labelKey(item.kind)) : item.name) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(item.count / max * 100) + '%"></span></span>' +
        '<b>' + num(item.count) + '</b></li>';
    }).join('') + '</ul>';
  }

  function analyticsHTML() {
    var data = state.analytics;
    if (!data) return '<p class="admin-empty">…</p>';
    var totals = data.totals || {};
    return '<div class="kpi-grid">' +
        kpi(T('adminKpiStudents'), num(totals.students)) +
        kpi(T('adminKpiActive'), num(totals.active)) +
        kpi(T('adminKpiPending'), num(totals.pending)) +
        kpi(T('adminKpiBlocked'), num(totals.blocked)) +
        kpi(T('adminKpiDevices'), num(totals.devices), '2 × ' + num(totals.active)) +
        kpi(T('adminKpiNew'), num(totals.newThisWeek)) +
        kpi(T('adminKpiEvents'), num(totals.events)) +
        kpi(T('adminKpiQuiz'), (data.quiz && data.quiz.attempts ? data.quiz.avg + '%' : '—'), data.quiz && data.quiz.attempts ? num(data.quiz.attempts) + ' ' + T('adminAvg') : '') +
        kpi(T('adminKpiTutor'), num(data.tutor && data.tutor.questions)) +
      '</div>' +
      '<div class="admin-grid">' +
        '<section class="admin-card span-2"><h3>' + esc(T('adminChart14')) + '</h3>' + chartHTML(data.days || []) + '</section>' +
        '<section class="admin-card"><h3>' + esc(T('adminByKind')) + '</h3>' + barsHTML((data.activityByKind || []).slice(0, 8), function (kind) { return 'kind' + kind.charAt(0).toUpperCase() + kind.slice(1); }) + '</section>' +
        '<section class="admin-card"><h3>' + esc(T('adminTopLessons')) + '</h3>' +
          ((data.topLessons || []).length ? '<ul class="bar-list">' + data.topLessons.map(function (lesson) {
            return '<li><span class="bar-name mono">' + esc(lesson.ref) + '</span><span class="bar-track"><span class="bar-fill" style="width:' +
              Math.round(lesson.count / data.topLessons[0].count * 100) + '%"></span></span><b>' + num(lesson.count) + '</b></li>';
          }).join('') + '</ul>' : '<p class="admin-empty">' + esc(T('adminEmpty')) + '</p>') + '</section>' +
        '<section class="admin-card span-2"><h3>' + esc(T('adminTopStudents')) + '</h3>' +
          ((data.topStudents || []).length ? '<table class="admin-table compact"><tbody>' + data.topStudents.map(function (student, index) {
            return '<tr><td class="rank">' + (index + 1) + '</td><td><b>' + esc(student.name) + '</b><small class="muted"> ' + esc(student.gradeName || '') + '</small></td>' +
              '<td class="muted mono">' + esc(student.phone) + '</td><td>' + num(student.lessons) + ' ' + esc(T('lessons')) + '</td>' +
              '<td><b>' + num(student.points) + '</b> ' + esc(T('pointsLbl')) + '</td><td class="muted">' + esc(when(student.last_seen)) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<p class="admin-empty">' + esc(T('adminEmpty')) + '</p>') + '</section>' +
        '<section class="admin-card"><h3>' + esc(T('adminInactive')) + '</h3>' +
          ((data.inactive || []).length ? '<ul class="plain-list">' + data.inactive.map(function (student) {
            return '<li><b>' + esc(student.name) + '</b><span class="muted">' + esc(student.phone) + ' · ' + esc(when(student.last_seen)) + '</span></li>';
          }).join('') + '</ul>' : '<p class="admin-empty">' + esc(T('adminEmpty')) + '</p>') + '</section>' +
      '</div>';
  }

  /* ------------------------------ التحميل ------------------------------ */
  function loadStudents() {
    state.loading = true;
    renderBody();
    api('/api/admin/students').then(function (res) {
      state.loading = false;
      if (res.status === 401) { state.authed = false; render(); return; }
      state.students = (res.data && res.data.students) || [];
      render();
    }).catch(function () { state.loading = false; renderBody(); });
  }

  function loadAnalytics() {
    state.analytics = null;
    renderBody();
    api('/api/admin/analytics').then(function (res) {
      if (res.status === 401) { state.authed = false; render(); return; }
      state.analytics = res.data && res.data.totals ? res.data : { totals: {} };
      renderBody();
    }).catch(function () { state.analytics = { totals: {} }; renderBody(); });
  }

  function studentAction(id, action) {
    if (action === 'delete' && !window.confirm(T('adminConfirmDelete'))) return;
    api('/api/admin/students', { method: 'POST', body: { id: id, action: action } }).then(function (res) {
      if (res.status === 200) { toast(T(action === 'delete' ? 'adminDeleted' : 'adminUpdated')); loadStudents(); }
      else toast(errorText(res.data));
    }).catch(function () { toast(T('authConn')); });
  }

  function openPasswordModal(id) {
    var student = state.students.filter(function (s) { return s.id === id; })[0];
    if (!student) return;
    state.modal = { student: student, value: randomPassword(), result: null };
    render();
    var input = panel.querySelector('[data-pass-input]');
    if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
  }

  function closeModal() {
    state.modal = null;
    render();
  }

  function savePassword() {
    if (!state.modal) return;
    var input = panel.querySelector('[data-pass-input]');
    var value = input ? String(input.value || '').trim() : '';
    if (value.length < 6) { toast(T('adminPassMin')); if (input) input.focus(); return; }
    var student = state.modal.student;
    api('/api/admin/students', { method: 'POST', body: { id: student.id, action: 'password', password: value } })
      .then(function (res) {
        if (res.status !== 200) { toast(errorText(res.data)); return; }
        state.modal = { student: student, value: value, result: (res.data && res.data.password) || value };
        render();
        loadStudents();
      })
      .catch(function () { toast(T('authConn')); });
  }

  function copyPassword() {
    var text = state.modal && state.modal.result ? state.modal.result : '';
    if (!text) return;
    var done = function () { toast(T('adminCopied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { selectResult(); });
      return;
    }
    selectResult();
  }

  function selectResult() {
    var el = panel.querySelector('#passResult');
    if (!el) return;
    var range = document.createRange(); range.selectNodeContents(el);
    var selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    try { document.execCommand('copy'); toast(T('adminCopied')); } catch (e) { toast(T('adminCopy')); }
  }

  /* ------------------------------ الأحداث ------------------------------ */
  function open() {
    panel = panel || $('adminPanel');
    if (!panel) return;
    state.modal = null;
    document.documentElement.setAttribute('data-gate', 'admin');
    panel.hidden = false;
    panel.innerHTML = '<div class="admin-login"><div class="auth-card auth-status"><div class="auth-spinner"></div></div></div>';
    api('/api/admin/session').then(function (res) {
      state.authed = Boolean(res.data && res.data.ok);
      state.ready = !(res.data && res.data.ready === false);
      if (res.data && res.data.user) state.user = res.data.user;
      render();
      if (state.authed) { loadStudents(); if (state.tab === 'analytics') loadAnalytics(); }
    }).catch(function () { state.authed = false; state.ready = false; render(); });
  }

  function close() {
    if (!panel) return;
    panel.hidden = true;
    panel.innerHTML = '';
    if (window.ICTAuth && window.ICTAuth.account && window.ICTAuth.account()) {
      document.documentElement.setAttribute('data-gate', 'off');
      window.location.reload();
    } else {
      window.location.reload();
    }
  }

  function adminLogout() {
    api('/api/admin/logout', { method: 'POST' }).catch(function () {}).then(function () {
      state.authed = false;
      state.students = [];
      state.analytics = null;
      state.modal = null;
      render();
    });
  }

  function bind() {
    panel = $('adminPanel');
    if (!panel) return;

    panel.addEventListener('click', function (event) {
      if (event.target.classList && event.target.classList.contains('admin-modal-backdrop')) { closeModal(); return; }
      var button = event.target.closest ? event.target.closest('[data-act]') : null;
      if (!button) return;
      var act = button.getAttribute('data-act');
      if (act === 'close') close();
      else if (act === 'admin-logout') adminLogout();
      else if (act === 'reload') { loadStudents(); if (state.tab === 'analytics') loadAnalytics(); }
      else if (act === 'tab-students') { state.tab = 'students'; state.focusSearch = false; render(); loadStudents(); }
      else if (act === 'tab-analytics') { state.tab = 'analytics'; render(); loadAnalytics(); }
      else if (act === 'filter') { state.filter = button.getAttribute('data-value'); renderBody(); }
      else if (act === 'password') openPasswordModal(button.getAttribute('data-id'));
      else if (act === 'modal-close') closeModal();
      else if (act === 'pass-generate') {
        var passInput = panel.querySelector('[data-pass-input]');
        if (passInput) passInput.value = randomPassword();
      }
      else if (act === 'pass-save') savePassword();
      else if (act === 'pass-copy') copyPassword();
      else if (act === 'approve' || act === 'block' || act === 'reset-devices' || act === 'delete') {
        studentAction(button.getAttribute('data-id'), act);
      }
    });

    panel.addEventListener('input', function (event) {
      if (event.target.matches && event.target.matches('[data-search]')) {
        state.query = event.target.value;
        state.focusSearch = true;
        renderBody();
        state.focusSearch = true;
      }
    });

    panel.addEventListener('submit', function (event) {
      if (event.target.getAttribute('data-form') === 'admin') { event.preventDefault(); submitLogin(event.target); }
    });

    window.ICTAdmin = { open: open, close: close };
  }

  window.ICTAdmin = window.ICTAdmin || { open: function () { open(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
  window.ICTAdmin.open = open;
})();
