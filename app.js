/* ============================================================
   ICT Secondary — app.js
   Render-from-state SPA. Sections: Lessons · Labs · Games · Projects,
   plus an in-lesson AI tutor (with a local offline fallback).
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    lang: localStorage.getItem('ict-lang') || 'ar',
    theme: localStorage.getItem('ict-theme') || 'light',
    year: 0, term: 0, unit: null, lesson: null,
    view: 'lessons', lab: null, game: null,
    picks: {}, tutor: {}, tutorReady: null,
    progress: JSON.parse(localStorage.getItem('ict-progress-v2') || '{}'),
    awarded: JSON.parse(localStorage.getItem('ict-awarded') || '[]'),
    user: {
      name: localStorage.getItem('ict-name') || '',
      points: parseInt(localStorage.getItem('ict-points') || '0', 10) || 0,
      certs: parseInt(localStorage.getItem('ict-certs') || '0', 10) || 0
    }
  };

  /* ----------------------------- helpers ----------------------------- */
  function t(k) { return (COPY[state.lang] && COPY[state.lang][k]) || COPY.ar[k] || k; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lang(o, base) { var k = base + (state.lang === 'ar' ? 'Ar' : 'En'); return o[k] != null ? o[k] : o[base + 'Ar']; }

  /* --- English content overlays (data-en-*.js). Arabic is the base content. --- */
  var _enLessons = null, _enProj = null;
  function enLesson(id) {
    if (state.lang !== 'en') return null;
    if (!_enLessons) _enLessons = Object.assign({}, window.__EN_UNITS_A, window.__EN_UNITS_B, window.__EN_UNITS_C);
    return _enLessons[id] || null;
  }
  function lText(l, base) { var e = enLesson(l.id), v = e && e[base]; return (v != null && v !== '') ? v : l[base + 'Ar']; }
  function lList(l, base) { var e = enLesson(l.id), v = e && e[base]; return (v && v.length) ? v : (l[base + 'Ar'] || []); }
  function lQuiz(l) { var e = enLesson(l.id); return (e && e.quiz && e.quiz.length === (l.quizAr || []).length) ? e.quiz : (l.quizAr || []); }
  function lCode(l) { var e = enLesson(l.id); return (e && e.code) ? e.code : l.codeAr; }
  function enProj(uid, i) {
    if (state.lang !== 'en') return null;
    if (!_enProj) _enProj = window.__EN_PROJECTS || {};
    var a = _enProj[uid];
    return (a && a[i]) || null;
  }
  function pText(uid, i, p, base) { var e = enProj(uid, i), v = e && e[base]; return (v != null && v !== '') ? v : p[base + 'Ar']; }
  function pSteps(uid, i, p) { var e = enProj(uid, i); return (e && e.steps && e.steps.length) ? e.steps : (p.stepsAr || []); }
  function currentYear() { return CURRICULUM.years[state.year]; }
  function currentTerm() { return currentYear().terms[state.term]; }
  function units() { return currentTerm().units || []; }
  function unitById(id) { return units().filter(function (u) { return u.id === id; })[0] || null; }
  function yearName() { var y = currentYear(); return state.lang === 'ar' ? y.nameAr : y.nameEn; }
  function termName() { var tm = currentTerm(); return state.lang === 'ar' ? tm.nameAr : tm.nameEn; }
  function currentLesson() { var u = unitById(state.unit); return (u && state.lesson != null) ? u.lessons[state.lesson] : null; }
  function displayName() { return state.user.name || (state.lang === 'ar' ? 'طالب/ـة ICT' : 'ICT Student'); }
  function labs() { return window.ICT_LABS || []; }
  function games() { return window.ICT_GAMES || []; }
  function activeLabs() {
    var ids = {}; units().forEach(function (u) { ids[u.id] = true; });
    return labs().filter(function (l) { return ids[l.unit]; });
  }
  function labsForUnit(id) { return labs().filter(function (l) { return l.unit === id; }); }

  function pkey(u, l) { return u + ':' + l; }
  function isDone(u, l) { return !!state.progress[pkey(u, l)]; }
  function unitDone(u) { return u.lessons.filter(function (l) { return isDone(u.id, l.id); }).length; }
  function totalLessons() { return units().reduce(function (n, u) { return n + u.lessons.length; }, 0); }
  function doneLessons() { return units().reduce(function (n, u) { return n + unitDone(u); }, 0); }
  function saveProgress() { localStorage.setItem('ict-progress-v2', JSON.stringify(state.progress)); }

  var toastTimer = null;
  var activeCleanup = null;
  function stopActiveWidget() { if (activeCleanup) { try { activeCleanup(); } catch (e) {} activeCleanup = null; } }
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  /* ----------------------------- render ----------------------------- */
  function render() {
    var html = document.documentElement;
    html.setAttribute('lang', state.lang);
    html.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    html.setAttribute('data-theme', state.theme);
    document.title = state.lang === 'ar' ? 'ICT ثانوي | منصة تكنولوجيا المعلومات والاتصالات' : 'ICT Secondary | Learning Platform';
    html.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    html.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    html.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    stopActiveWidget();
    renderTopbar(); renderSidebar(); renderMain(); renderProgress(); afterRender();
  }

  function renderTopbar() {
    $('langLabel').textContent = state.lang === 'ar' ? 'EN' : 'ع';
    $('avatarBtn').textContent = (displayName().trim()[0] || (state.lang === 'ar' ? 'ع' : 'S'));
    var logoutTop = $('logoutTop');
    if (logoutTop) logoutTop.hidden = !state.user.account;
    $('avatarBtn').setAttribute('title', t('profileTitle'));
    $('themeToggle').querySelector('.theme-icon').textContent = state.theme === 'dark' ? '☀️' : '🌙';
    $('termLabel').textContent = termName();
    $('sidebarMeta').textContent = yearName() + ' · ' + termName();
    var titles = { lessons: t('unitsTitle'), labs: t('labsTitle'), games: t('gamesTitle'), projects: t('projectsTitle') };
    $('sidebarTitle').textContent = titles[state.view];
    $('sectionNav').querySelectorAll('[data-view]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === state.view);
    });
    $('yearSwitch').innerHTML = CURRICULUM.years.map(function (y, i) {
      var nm = state.lang === 'ar' ? y.nameAr : y.nameEn;
      return '<button type="button" class="year-btn' + (i === state.year ? ' active' : '') + '" onclick="ICT.setYear(' + i + ')">' + esc(nm) + '</button>';
    }).join('');
  }

  function renderSidebar() {
    var list = $('unitList');
    if (state.view === 'labs') {
      var al = activeLabs();
      if (!al.length) { list.innerHTML = '<div class="sidebar-empty">' + esc(t('comingTitle')) + '</div>'; return; }
      list.innerHTML = al.map(function (l) {
        return '<button type="button" class="unit-item' + (state.lab === l.id ? ' active' : '') + '" onclick="ICT.openLab(\'' + l.id + '\')">' +
          '<span class="unit-number">' + l.icon + '</span><span class="unit-copy"><span class="unit-title">' + esc(lang(l, 'title')) + '</span></span></button>';
      }).join('');
      return;
    }
    if (state.view === 'games') {
      list.innerHTML = games().map(function (g) {
        return '<button type="button" class="unit-item' + (state.game === g.id ? ' active' : '') + '" onclick="ICT.openGame(\'' + g.id + '\')">' +
          '<span class="unit-number">' + g.icon + '</span><span class="unit-copy"><span class="unit-title">' + esc(lang(g, 'title')) + '</span></span></button>';
      }).join('');
      return;
    }
    var us = units();
    if (state.view === 'projects') {
      list.innerHTML = us.map(function (u) {
        return '<button type="button" class="unit-item" onclick="ICT.gotoProject(\'' + u.id + '\')">' +
          '<span class="unit-number">' + u.num + '</span><span class="unit-copy"><span class="unit-title">' + esc(lang(u, 'title')) + '</span></span></button>';
      }).join('');
      return;
    }
    if (!us.length) { list.innerHTML = '<div class="sidebar-empty">' + esc(t('comingTitle')) + '</div>'; return; }
    list.innerHTML = us.map(function (u) {
      var d = unitDone(u), n = u.lessons.length;
      return '<button type="button" class="unit-item' + (state.unit === u.id ? ' active' : '') + '" onclick="ICT.openUnit(\'' + u.id + '\')">' +
        '<span class="unit-number">' + u.num + '</span><span class="unit-copy"><span class="unit-title">' + esc(lang(u, 'title')) + '</span>' +
        '<span class="unit-progress">' + d + '/' + n + ' ' + esc(t('lessons')) + '</span></span></button>';
    }).join('');
  }

  function renderProgress() {
    var tot = totalLessons(), done = doneLessons(), pct = tot ? Math.round(done / tot * 100) : 0;
    $('overallProgressBar').style.width = pct + '%';
    $('overallProgressText').textContent = pct + '% · ' + done + '/' + tot;
  }

  function renderMain() {
    var c = $('container');
    if (state.view === 'labs') { c.innerHTML = (state.lab ? labView() : labsList()); return; }
    if (state.view === 'games') { c.innerHTML = (state.game ? gameView() : gamesList()); return; }
    if (state.view === 'projects') { c.innerHTML = projectsView(); return; }
    var us = units();
    if (!us.length) { c.innerHTML = overview(); return; }
    if (state.lesson != null && unitById(state.unit)) c.innerHTML = lessonView();
    else if (unitById(state.unit)) c.innerHTML = unitView();
    else c.innerHTML = overview();
  }

  function afterRender() {
    if (state.view === 'labs' && state.lab) {
      var l = labs().filter(function (x) { return x.id === state.lab; })[0];
      if (l && l.init) { try { l.init($('container')); } catch (e) { console.error(e); } }
    }
    if (state.view === 'games' && state.game) {
      var g = games().filter(function (x) { return x.id === state.game; })[0];
      if (g && g.init) { try { activeCleanup = g.init($('container')) || null; } catch (e) { console.error(e); } }
    }
  }

  /* ----------------------------- lessons views ----------------------------- */
  function overview() {
    var us = units();
    var head = '<section class="hero"><span class="hero-badge">' + esc(yearName()) + ' · ' + esc(termName()) + '</span>' +
      '<h1>' + esc(t('heroTitle')) + '</h1><p>' + esc(t('heroText')) + '</p>' +
      '<div class="hero-stats"><div><b>' + us.length + '</b><span>' + esc(t('units')) + '</span></div>' +
      '<div><b>' + totalLessons() + '</b><span>' + esc(t('lessons')) + '</span></div>' +
      '<div><b>' + activeLabs().length + '</b><span>' + esc(t('labsCount')) + '</span></div>' +
      '<div><b>' + games().length + '</b><span>' + esc(t('gamesCount')) + '</span></div>' +
      '<div><b>' + doneLessons() + '</b><span>' + esc(t('done')) + '</span></div></div></section>';
    if (!us.length) return head + '<div class="empty-state"><div class="empty-icon">🚧</div><h2>' + esc(t('comingTitle')) + '</h2><p>' + esc(t('comingText')) + '</p></div>';
    var shortcuts = '<div class="quick-row">' +
      '<button class="quick-card" onclick="ICT.setView(\'labs\')"><span class="quick-ic">🔬</span><b>' + esc(t('labsTitle')) + '</b><small>' + esc(t('labsIntro')) + '</small></button>' +
      '<button class="quick-card" onclick="ICT.setView(\'games\')"><span class="quick-ic">🎮</span><b>' + esc(t('gamesTitle')) + '</b><small>' + esc(t('gamesIntro')) + '</small></button>' +
      '<button class="quick-card" onclick="ICT.setView(\'projects\')"><span class="quick-ic">🛠️</span><b>' + esc(t('projectsTitle')) + '</b><small>' + esc(t('projectsIntro')) + '</small></button>' +
      '</div>';
    var cards = us.map(function (u) {
      var d = unitDone(u), n = u.lessons.length, pct = Math.round(d / n * 100), done = d === n;
      return '<article class="lesson-card unit-card" style="--unit-color:' + u.color + '"><span class="unit-badge">' + esc(t('unit')) + ' ' + u.num + '</span>' +
        '<h3>' + esc(lang(u, 'title')) + '</h3><p>' + esc(lang(u, 'desc')) + '</p>' +
        '<div class="card-progress"><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div><span>' + d + '/' + n + '</span></div>' +
        '<div class="lesson-actions"><button type="button" class="btn btn-primary" onclick="ICT.openUnit(\'' + u.id + '\')">' +
        esc(done ? t('reopen') : (d ? t('continueLearning') : t('startCourse'))) + '</button></div></article>';
    }).join('');
    return head + shortcuts + '<h2 class="section-title">' + esc(t('browse')) + '</h2><div class="lessons-grid">' + cards + '</div>';
  }

  function unitView() {
    var u = unitById(state.unit);
    if (!u) return overview();
    var d = unitDone(u), n = u.lessons.length, pct = Math.round(d / n * 100);
    var head = '<section class="unit-header"><div class="unit-header-top"><div><span class="unit-kicker">' + esc(t('unit')) + ' ' + u.num + '</span>' +
      '<h1>' + esc(lang(u, 'title')) + '</h1><p>' + esc(lang(u, 'desc')) + '</p></div>' +
      '<div class="unit-ring" style="--pct:' + pct + '"><span>' + pct + '%</span></div></div>' +
      '<div class="lesson-rail">' + u.lessons.map(function (l, i) {
        return '<button type="button" class="lesson-chip' + (isDone(u.id, l.id) ? ' done' : '') + '" title="' + esc(lang(l, 'title')) + '" onclick="ICT.openLesson(' + i + ')">' + (i + 1) + '</button>';
      }).join('') + '</div></section>';
    var cards = u.lessons.map(function (l, i) {
      var done = isDone(u.id, l.id);
      return '<article class="lesson-card' + (done ? ' done' : '') + '"><span class="lesson-tag">' + esc(t('lesson')) + ' ' + (i + 1) + (l.type === 'code' ? ' · Python' : '') + '</span>' +
        '<h3>' + esc(lang(l, 'title')) + '</h3><p>' + esc(lText(l, 'goal') || '') + '</p>' +
        '<div class="lesson-meta"><span class="lesson-dot"></span>' + esc(done ? t('completed') : t('notCompleted')) + '</div>' +
        '<div class="lesson-actions"><button type="button" class="btn btn-primary" onclick="ICT.openLesson(' + i + ')">' + esc(done ? t('reopen') : t('start')) + '</button></div></article>';
    }).join('');
    var extra = '';
    var ul = labsForUnit(u.id);
    var proj = (window.ICT_PROJECTS || {})[u.id] || [];
    if (ul.length || proj.length) {
      extra = '<h2 class="section-title">' + esc(t('relatedLab')) + ' & ' + esc(t('unitProjects')) + '</h2><div class="lessons-grid">';
      ul.forEach(function (l) { extra += '<article class="lesson-card"><span class="lesson-tag">🔬 ' + esc(l.icon) + '</span><h3>' + esc(lang(l, 'title')) + '</h3><p>' + esc(lang(l, 'desc')) + '</p><div class="lesson-actions"><button type="button" class="btn btn-primary" onclick="ICT.openLab(\'' + l.id + '\')">' + esc(t('openLab')) + '</button></div></article>'; });
      proj.forEach(function (p, i) { extra += '<article class="lesson-card"><span class="lesson-tag">🛠️ ' + esc(p.icon) + '</span><h3>' + esc(pText(u.id, i, p, 'title')) + '</h3><p>' + esc(pText(u.id, i, p, 'desc')) + '</p><div class="lesson-actions"><button type="button" class="btn-outline" onclick="ICT.gotoProject(\'' + u.id + '\')">' + esc(t('relatedProject')) + '</button></div></article>'; });
      extra += '</div>';
    }
    return head + '<div class="lessons-grid">' + cards + '</div>' + extra;
  }

  function paragraphs(text) {
    if (!text) return '';
    return text.split(/\n\s*\n/).map(function (p) { return '<p class="content-text">' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  function lessonView() {
    var u = unitById(state.unit), idx = state.lesson, l = u.lessons[idx], done = isDone(u.id, l.id);
    var nav = '<div class="lesson-navbar"><button type="button" class="btn-outline" onclick="ICT.openUnit(\'' + u.id + '\')">← ' + esc(t('backToUnit')) + '</button>' +
      '<span class="lesson-navbar-meta">' + esc(t('unit')) + ' ' + u.num + ' · ' + esc(t('lesson')) + ' ' + (idx + 1) + '/' + u.lessons.length + '</span>' +
      '<button type="button" class="mark-done' + (done ? ' done' : '') + '" onclick="ICT.toggleDone()">' + esc(done ? t('markUndone') : t('markDone')) + '</button></div>';

    var kp = lList(l, 'keyPoints'), exL = lList(l, 'examples'), pr = lText(l, 'practice');
    var body = paragraphs(lText(l, 'content'));
    if (kp.length) body += '<h3 class="body-h">' + esc(t('concepts')) + '</h3><ul class="concept-list">' + kp.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>';
    if (exL.length) body += '<h3 class="body-h">' + esc(exL.length > 1 ? t('examples') : t('example')) + '</h3>' +
      exL.map(function (e, i) { return '<div class="example-card"><span class="ex-label">' + esc(t('example')) + ' ' + (i + 1) + '</span><p>' + esc(e) + '</p></div>'; }).join('');
    if (pr) body += '<div class="lesson-callout challenge"><strong>🎯 ' + esc(t('challengeTitle')) + '</strong><p>' + esc(pr) + '</p></div>';
    if (l.type === 'code' && l.codeAr) body += '<h3 class="body-h">Python</h3><div class="lesson-playground"><div class="lp-bar"><span class="lp-title">python</span>' +
      '<button type="button" class="lp-run" onclick="ICT.runCode()">▶ ' + esc(t('run')) + '</button></div>' +
      '<textarea class="lp-editor" id="lpEditor" spellcheck="false">' + esc(lCode(l)) + '</textarea>' +
      '<div class="lp-output" id="lpOutput">' + esc(t('output')) + '</div></div>';
    body += quizBlock(l);
    body += tutorPanel(l);
    body += projectsMini(u);

    body += '<div class="lesson-nav">' + (idx > 0 ? '<button type="button" class="btn-outline" onclick="ICT.openLesson(' + (idx - 1) + ')">' + esc(t('prevLesson')) + '</button>' : '<span></span>') +
      (idx < u.lessons.length - 1 ? '<button type="button" class="btn-primary" onclick="ICT.openLesson(' + (idx + 1) + ')">' + esc(t('nextLesson')) + '</button>' : '') + '</div>';

    var gl = lText(l, 'goal');
    return nav + '<article class="lesson-view-card"><div class="lesson-head"><span class="lesson-kicker">' + esc(t('lesson')) + ' ' + (idx + 1) + ' · ' + esc(lang(u, 'title')) + '</span>' +
      '<h2>' + esc(lang(l, 'title')) + '</h2>' + (gl ? '<p class="lesson-goal"><b>' + esc(t('lessonGoal')) + ':</b> ' + esc(gl) + '</p>' : '') +
      '</div><div class="lesson-body">' + body + '</div></article>';
  }

  function quizBlock(l) {
    var h = '<div class="quiz-block"><h3>🎯 ' + esc(t('quizTitle')) + '</h3>';
    lQuiz(l).forEach(function (q, qi) {
      h += '<div class="quiz-card" data-q="' + qi + '"><div class="quiz-q">' + (qi + 1) + '. ' + esc(q.q) + '</div><div class="quiz-options">';
      q.o.forEach(function (opt, oi) { h += '<button type="button" class="quiz-option" data-o="' + oi + '" onclick="ICT.pick(' + qi + ',' + oi + ')"><span class="qletter">' + ('ABCD'[oi] || (oi + 1)) + '</span><span>' + esc(opt) + '</span></button>'; });
      h += '</div><div class="quiz-feedback" id="qfb' + qi + '"></div></div>';
    });
    return h + '<div class="quiz-actions"><button type="button" class="btn-primary" onclick="ICT.checkQuiz()">' + esc(t('check')) + '</button><span class="quiz-result" id="quizResult"></span></div></div>';
  }

  function projectsMini(u) {
    var proj = (window.ICT_PROJECTS || {})[u.id] || [];
    if (!proj.length) return '';
    return '<div class="mini-projects"><h3 class="body-h">🛠️ ' + esc(t('unitProjects')) + '</h3><div class="mini-grid">' +
      proj.map(function (p, i) { return '<div class="mini-card"><b>' + esc(p.icon) + ' ' + esc(pText(u.id, i, p, 'title')) + '</b><p>' + esc(pText(u.id, i, p, 'desc')) + '</p></div>'; }).join('') + '</div></div>';
  }

  /* ----------------------------- tutor ----------------------------- */
  function tutorKey() { return state.unit + ':' + state.lesson; }
  function tutorPanel(l) {
    var h = '<div class="tutor"><div class="tutor-head"><span>🤖 ' + esc(t('tutorTitle')) + '</span><span class="tutor-status" id="tutorStatus">' +
      (state.tutorReady === false ? esc(t('tutorOffline')) : esc(t('tutorReady'))) + '</span></div>' +
      '<p class="tutor-intro">' + esc(t('tutorIntro')) + '</p>' +
      '<div class="tutor-quick"><button type="button" onclick="ICT.askTutor(\'explain\')">📖 ' + esc(t('tutorExplain')) + '</button>' +
      '<button type="button" onclick="ICT.askTutor(\'summary\')">📝 ' + esc(t('tutorSummary')) + '</button>' +
      '<button type="button" onclick="ICT.askTutor(\'example\')">💡 ' + esc(t('tutorExample')) + '</button></div>' +
      '<div class="tutor-log" id="tutorLog">' + tutorLogHTML() + '</div>' +
      '<div class="tutor-input"><input id="tutorInput" placeholder="' + esc(t('tutorPlaceholder')) + '" onkeydown="if(event.key===\'Enter\')ICT.sendTutor()">' +
      '<button type="button" class="btn-primary" onclick="ICT.sendTutor()">' + esc(t('tutorAsk')) + '</button></div></div>';
    return h;
  }
  function fmtTutor(text) {
    var s = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return s.split('\n').map(function (line) {
      var l = line.trim();
      if (/^#{1,6}\s+/.test(l)) return '<div class="t-h">' + l.replace(/^#{1,6}\s+/, '') + '</div>';
      if (/^(\*\s*){3,}$/.test(l) || /^-{3,}$/.test(l)) return '<div class="t-hr"></div>';
      if (/^[-*•]\s+/.test(l)) return '<div class="t-line">• ' + l.replace(/^[-*•]\s+/, '') + '</div>';
      if (/^\d+[.)]\s+/.test(l)) return '<div class="t-line">' + l + '</div>';
      if (l === '') return '<div class="t-gap"></div>';
      return '<div class="t-line">' + l + '</div>';
    }).join('');
  }
  function tutorLogHTML() {
    var msgs = state.tutor[tutorKey()] || [];
    if (!msgs.length) return '<div class="t-msg a">' + fmtTutor(t('tutorWelcome')) + '</div>';
    return msgs.map(function (m) { return '<div class="t-msg ' + (m.role === 'user' ? 'u' : 'a') + '">' + fmtTutor(m.content) + '</div>'; }).join('');
  }
  function appendTutor(role, content) {
    var k = tutorKey();
    state.tutor[k] = state.tutor[k] || [];
    state.tutor[k].push({ role: role, content: content });
    var log = $('tutorLog');
    if (log) { var div = document.createElement('div'); div.className = 't-msg ' + (role === 'user' ? 'u' : 'a'); div.innerHTML = fmtTutor(content); log.appendChild(div); log.scrollTop = log.scrollHeight; }
  }
  function tutorContext(l) {
    var u = unitById(state.unit);
    return {
      year: yearName() + ' / ' + termName(), unit: lang(u, 'title'), lesson: lang(l, 'title'),
      content: lText(l, 'content'), keyPoints: lList(l, 'keyPoints'), examples: lList(l, 'examples'),
      practice: lText(l, 'practice') || '', questions: lQuiz(l).map(function (q) { return q.q; })
    };
  }
  function localTutor(mode, question, l) {
    var en = state.lang === 'en';
    var title = lang(l, 'title');
    var kp = lList(l, 'keyPoints'), ex = lList(l, 'examples'), pr = lText(l, 'practice') || '', ct = lText(l, 'content') || '';
    if (mode === 'summary') return (en ? '**Summary of “' + title + '”:**\n' : '**ملخص «' + title + '»:**\n') + kp.map(function (k) { return '- ' + k; }).join('\n');
    if (mode === 'explain') {
      var paras = ct.split(/\n\s*\n/).map(function (p) { return '- ' + p.replace(/\n/g, ' '); }).join('\n');
      var h1 = en ? '**Let’s break down “' + title + '” step by step:**\n' : '**تعال نشرح «' + title + '» من الأول خطوة خطوة:**\n';
      var h2 = en ? '\n**Key points:**\n' : '\n**أهم النقاط:**\n';
      return h1 + paras + h2 + kp.map(function (k) { return '- ' + k; }).join('\n');
    }
    if (mode === 'example') {
      var exs = ex.map(function (e, i) { return (en ? '**Example ' : '**مثال ') + (i + 1) + ':** ' + e; }).join('\n');
      var head = en ? '**Examples for “' + title + '”:**\n' : '**أمثلة على «' + title + '»:**\n';
      var tail = en ? '\n**Try it yourself:** ' : '\n**جرّب بنفسك:** ';
      var none = en ? '- No extra examples.' : '- لا توجد أمثلة إضافية.';
      return head + (exs || none) + tail + pr;
    }
    var q = String(question || '').trim();
    if (!q) return en ? 'Type your question about the lesson and I’ll help.' : 'اكتب سؤالك عن الدرس وأنا أساعدك.';
    var words = q.split(/\s+/).filter(function (w) { return w.length > 3; });
    var pool = kp.concat(ex).concat(pr.split('.'));
    var hits = pool.filter(function (x) { return words.some(function (w) { return x.indexOf(w) >= 0; }); }).slice(0, 3);
    var hd = en ? '**Look at the lesson “' + title + '”:**' : '**بص على الدرس «' + title + '»:**';
    if (hits.length) return hd + '\n' + hits.map(function (h) { return '- ' + h; }).join('\n') + (en ? '\nWant a specific point in detail? Type it.' : '\nتحب أشرح نقطة معيّنة بالتفصيل؟ اكتبها.');
    return hd + '\n' + kp.map(function (k) { return '- ' + k; }).join('\n') + (en ? '\nIf your question is about a specific point, type its name and I’ll clarify.' : '\nلو سؤالك عن نقطة محددة، اكتب اسمها وأنا أوضّحها.');
  }
  function askTutor(mode) {
    var l = currentLesson(); if (!l) return;
    appendTutor('user', mode === 'explain' ? t('tutorExplain') : mode === 'summary' ? t('tutorSummary') : t('tutorExample'));
    var thinking = appendThinking();
    callTutor(mode, '').then(function (ans) { replaceThinking(thinking, ans); })
      .catch(function (err) { replaceThinking(thinking, (err && !err.silent && err.message ? 'ℹ️ ' + err.message + '\n' : '') + localTutor(mode, '', l)); });
  }
  function sendTutor() {
    var l = currentLesson(); if (!l) return;
    var inp = $('tutorInput'); var q = inp.value.trim(); if (!q) return;
    inp.value = '';
    appendTutor('user', q);
    var thinking = appendThinking();
    callTutor('chat', q).then(function (ans) { replaceThinking(thinking, ans); })
      .catch(function (err) { replaceThinking(thinking, (err && !err.silent && err.message ? 'ℹ️ ' + err.message + '\n' : '') + localTutor('chat', q, l)); });
  }
  function appendThinking() {
    var log = $('tutorLog'); var div = document.createElement('div');
    div.className = 't-msg a thinking'; div.textContent = t('tutorThinking');
    if (log) { log.appendChild(div); log.scrollTop = log.scrollHeight; }
    return div;
  }
  function replaceThinking(el, text) {
    var k = tutorKey();
    state.tutor[k] = state.tutor[k] || [];
    state.tutor[k].push({ role: 'assistant', content: text });
    if (el) { el.classList.remove('thinking'); el.innerHTML = fmtTutor(text); var log = $('tutorLog'); if (log) log.scrollTop = log.scrollHeight; }
  }
  function callTutor(mode, question) {
    var l = currentLesson();
    var key = tutorKey();
    var history = (state.tutor[key] || []).slice(-8).map(function (m) { return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content }; });
    return fetch('/api/tutor', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: mode, question: question, history: history, context: tutorContext(l), language: state.lang })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error((d && d.error) || ''); if (!e.message) e.silent = true; throw e; }
        return d.answer;
      });
    }).catch(function (err) {
      if (err && !err.silent && typeof err.message === 'string' && err.message.length > 8) throw err;
      var e2 = new Error(''); e2.silent = true; throw e2;
    });
  }

  /* ----------------------------- labs / games / projects ----------------------------- */
  function labsList() {
    var al = activeLabs();
    if (!al.length) return '<section class="hero slim"><h1>' + esc(t('labsTitle')) + '</h1><p>' + esc(t('labsIntro')) + '</p></section>' +
      '<div class="empty-state"><div class="empty-icon">🚧</div><h2>' + esc(t('comingTitle')) + '</h2><p>' + esc(t('comingText')) + '</p></div>';
    return '<section class="hero slim"><h1>' + esc(t('labsTitle')) + '</h1><p>' + esc(t('labsIntro')) + '</p></section><div class="lessons-grid">' +
      al.map(function (l) {
        var u = units().filter(function (x) { return x.id === l.unit; })[0];
        return '<article class="lesson-card lab-card"><span class="lesson-tag">' + l.icon + ' ' + (u ? esc(t('unit')) + ' ' + u.num : '') + '</span>' +
          '<h3>' + esc(lang(l, 'title')) + '</h3><p>' + esc(lang(l, 'desc')) + '</p>' +
          '<div class="lesson-actions"><button type="button" class="btn btn-primary" onclick="ICT.openLab(\'' + l.id + '\')">' + esc(t('openLab')) + '</button></div></article>';
      }).join('') + '</div>';
  }
  function labView() {
    var l = labs().filter(function (x) { return x.id === state.lab; })[0];
    if (!l) return labsList();
    return '<div class="lesson-navbar"><button type="button" class="btn-outline" onclick="ICT.setView(\'labs\')">← ' + esc(t('backToList')) + '</button>' +
      '<span class="lesson-navbar-meta">🔬 ' + esc(t('labsTitle')) + '</span><span></span></div>' +
      '<article class="lesson-view-card"><div class="lesson-head"><span class="lesson-kicker">🔬 ' + esc(l.icon) + ' ' + esc(t('labsTitle')) + '</span>' +
      '<h2>' + esc(lang(l, 'title')) + '</h2><p class="lesson-goal">' + esc(lang(l, 'desc')) + '</p></div>' +
      '<div class="lesson-body"><div class="lab-widget">' + l.html() + '</div></div></article>';
  }
  function gamesList() {
    return '<section class="hero slim"><h1>' + esc(t('gamesTitle')) + '</h1><p>' + esc(t('gamesIntro')) + '</p></section><div class="lessons-grid">' +
      games().map(function (g) {
        return '<article class="lesson-card game-card"><span class="lesson-tag">' + g.icon + '</span><h3>' + esc(lang(g, 'title')) + '</h3><p>' + esc(lang(g, 'desc')) + '</p>' +
          '<div class="lesson-actions"><button type="button" class="btn btn-primary" onclick="ICT.openGame(\'' + g.id + '\')">' + esc(t('openGame')) + '</button></div></article>';
      }).join('') + '</div>';
  }
  function gameView() {
    var g = games().filter(function (x) { return x.id === state.game; })[0];
    if (!g) return gamesList();
    return '<div class="lesson-navbar"><button type="button" class="btn-outline" onclick="ICT.setView(\'games\')">← ' + esc(t('backToList')) + '</button>' +
      '<span class="lesson-navbar-meta">🎮 ' + esc(t('gamesTitle')) + '</span><span></span></div>' +
      '<article class="lesson-view-card"><div class="lesson-head"><span class="lesson-kicker">🎮 ' + esc(g.icon) + ' ' + esc(t('gamesTitle')) + '</span>' +
      '<h2>' + esc(lang(g, 'title')) + '</h2><p class="lesson-goal">' + esc(lang(g, 'desc')) + '</p></div>' +
      '<div class="lesson-body"><div class="lab-widget game-widget">' + g.html() + '</div></div></article>';
  }
  function projectsView() {
    var us = units();
    if (!us.length) return '<div class="empty-state"><div class="empty-icon">🚧</div><h2>' + esc(t('comingTitle')) + '</h2><p>' + esc(t('comingText')) + '</p></div>';
    var out = '<section class="hero slim"><h1>' + esc(t('projectsTitle')) + '</h1><p>' + esc(t('projectsIntro')) + '</p></section>';
    us.forEach(function (u) {
      var proj = (window.ICT_PROJECTS || {})[u.id] || [];
      if (!proj.length) return;
      out += '<section class="proj-unit" id="proj-' + u.id + '"><h2 class="section-title">' + esc(t('unit')) + ' ' + u.num + ' · ' + esc(lang(u, 'title')) + '</h2><div class="lessons-grid">';
      proj.forEach(function (p, i) {
        var key = u.id + ':' + i;
        var hasDemo = !!(window.ICT_PROJECT_DEMOS || {})[key];
        out += '<article class="lesson-card proj-card"><span class="lesson-tag">' + esc(p.icon) + (hasDemo ? ' · 🎬 ' + esc(t('demoBadge')) : '') + '</span><h3>' + esc(pText(u.id, i, p, 'title')) + '</h3><p>' + esc(pText(u.id, i, p, 'desc')) + '</p>' +
          '<ol class="proj-steps">' + pSteps(u.id, i, p).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
          '<div class="topic-tags">' + (p.tags || []).map(function (tg) { return '<span class="topic-tag">' + esc(tg) + '</span>'; }).join('') + '</div>' +
          (hasDemo ? '<div class="lesson-actions"><button type="button" class="btn-primary demo-open-btn" onclick="ICT.openDemo(\'' + key + '\')">▶️ ' + esc(t('showDemo')) + '</button></div>' : '') +
          '</article>';
      });
      out += '</div></section>';
    });
    return out;
  }

  /* ----------------------------- project demos ----------------------------- */
  function openDemo(key) {
    var demo = (window.ICT_PROJECT_DEMOS || {})[key];
    if (!demo) return;
    var widget = demo;
    if (demo.lab) widget = labs().filter(function (x) { return x.id === demo.lab; })[0];
    else if (demo.game) widget = games().filter(function (x) { return x.id === demo.game; })[0];
    if (!widget || !widget.html) return;
    var parts = key.split(':');
    var p = ((window.ICT_PROJECTS || {})[parts[0]] || [])[parseInt(parts[1], 10)];
    $('demoTitle').textContent = p ? p.icon + ' ' + pText(parts[0], parseInt(parts[1], 10), p, 'title') : t('showDemo');
    var note = (state.lang === 'en' && demo.noteEn) ? demo.noteEn : demo.noteAr;
    var body = $('demoBody');
    body.innerHTML = '<div class="demo-hint">🎬 ' + esc(t('demoHint')) + '</div>' +
      (note ? '<p class="demo-note">' + esc(note) + '</p>' : '') +
      '<div class="demo-widget">' + widget.html() + '</div>';
    var m = $('demoModal');
    if (!m.open) m.showModal();
    if (widget.init) { try { activeCleanup = widget.init(body) || null; } catch (e) { console.error(e); } }
  }
  function closeDemo() {
    stopActiveWidget();
    var m = $('demoModal'); var b = $('demoBody');
    if (b) b.innerHTML = '';
    if (m && m.open) m.close();
  }

  /* ----------------------------- actions ----------------------------- */
  function setYear(i) { if (i === state.year) return; state.year = i; state.term = 0; state.unit = null; state.lesson = null; render(); scrollTop(); }
  function setTerm(i) { if (i === state.term) return; state.term = i; state.unit = null; state.lesson = null; render(); scrollTop(); }
  function toggleTerm() { setTerm(state.term === 0 ? 1 : 0); }
  function setView(v) { state.view = v; state.lab = null; state.game = null; render(); scrollTop(); }
  function openLab(id) { state.view = 'labs'; state.lab = id; state.game = null; render(); scrollTop(); }
  function openGame(id) { state.view = 'games'; state.game = id; state.lab = null; render(); scrollTop(); }
  function gotoProject(uid) {
    state.view = 'projects'; state.lab = null; state.game = null; render();
    var el = document.getElementById('proj-' + uid); if (el) el.scrollIntoView({ block: 'start' });
  }
  function openUnit(id) { state.view = 'lessons'; state.unit = id; state.lesson = null; if (window.innerWidth <= 900) $('sidebar').classList.remove('open'); render(); scrollTop(); }
  function openLesson(i) { if (!unitById(state.unit)) return; state.lesson = i; if (window.innerWidth <= 900) $('sidebar').classList.remove('open'); render(); scrollTop(); }
  function scrollTop() { window.scrollTo(0, 0); var m = $('main'); if (m) m.scrollTop = 0; }

  function toggleLang() { state.lang = state.lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('ict-lang', state.lang); render(); }
  function toggleTheme() { state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('ict-theme', state.theme); render(); toast(state.theme === 'light' ? t('themeLight') : t('themeDark')); }

  function markDone(u, l) { state.progress[pkey(u, l)] = true; saveProgress(); }
  function unmarkDone(u, l) { delete state.progress[pkey(u, l)]; saveProgress(); }
  function toggleDone() {
    var u = unitById(state.unit); if (!u || state.lesson == null) return;
    var l = u.lessons[state.lesson];
    if (isDone(u.id, l.id)) unmarkDone(u.id, l.id); else { markDone(u.id, l.id); awardPoints(10); checkUnitAward(u); }
    refreshProgressUI();
  }
  function awardPoints(n) { state.user.points += n; localStorage.setItem('ict-points', String(state.user.points)); }
  function checkUnitAward(u) {
    var all = u.lessons.every(function (l) { return isDone(u.id, l.id); });
    if (all && state.awarded.indexOf(u.id) < 0) {
      state.awarded.push(u.id); localStorage.setItem('ict-awarded', JSON.stringify(state.awarded));
      state.user.certs += 1; localStorage.setItem('ict-certs', String(state.user.certs)); awardPoints(50);
      if (window.ICTLog) window.ICTLog('unit', u.id, 100);
      toast(state.lang === 'en' ? '🎉 Unit “' + lang(u, 'title').slice(0, 28) + '” complete — +50 pts' : '🎉 أكملت «' + lang(u, 'title').slice(0, 28) + '» — +50 نقطة');
    }
  }
  function refreshProgressUI() {
    renderSidebar(); renderProgress();
    var u = unitById(state.unit);
    if (u && state.lesson != null) {
      var l = u.lessons[state.lesson], done = isDone(u.id, l.id), mb = document.querySelector('.mark-done');
      if (mb) { mb.classList.toggle('done', done); mb.textContent = done ? t('markUndone') : t('markDone'); }
    }
  }
  function pick(qi, oi) {
    var u = unitById(state.unit); if (!u || state.lesson == null) return;
    var l = u.lessons[state.lesson], lid = state.unit + ':' + l.id;
    state.picks[lid] = state.picks[lid] || {}; state.picks[lid][qi] = oi;
    document.querySelectorAll('.quiz-card[data-q="' + qi + '"] .quiz-option').forEach(function (el) { el.classList.toggle('selected', parseInt(el.getAttribute('data-o'), 10) === oi); });
  }
  function checkQuiz() {
    var u = unitById(state.unit); if (!u || state.lesson == null) return;
    var l = u.lessons[state.lesson], lid = state.unit + ':' + l.id, picks = state.picks[lid] || {};
    var correct = 0, answered = 0, total = lQuiz(l).length;
    lQuiz(l).forEach(function (q, qi) {
      var chosen = picks[qi], fb = $('qfb' + qi);
      document.querySelectorAll('.quiz-card[data-q="' + qi + '"] .quiz-option').forEach(function (el) {
        var oi = parseInt(el.getAttribute('data-o'), 10); el.classList.remove('correct', 'wrong');
        if (oi === q.a) el.classList.add('correct'); else if (oi === chosen) el.classList.add('wrong');
      });
      if (chosen === undefined) { fb.className = 'quiz-feedback no'; fb.textContent = t('needAll'); }
      else { answered++; if (chosen === q.a) { correct++; fb.className = 'quiz-feedback ok'; fb.textContent = '✓ ' + (q.why || t('correct')); } else { fb.className = 'quiz-feedback no'; fb.textContent = '✗ ' + t('wrong') + (q.why ? ' — ' + q.why : ''); } }
    });
    var res = $('quizResult');
    if (answered < total) { res.textContent = t('needAll'); return; }
    res.textContent = correct + '/' + total + ' ✓';
    if (window.ICTLog) window.ICTLog('quiz', u.id + ':' + l.id, Math.round(correct / total * 100));
    if (correct === total) {
      var was = isDone(u.id, l.id); markDone(u.id, l.id);
      if (!was) { awardPoints(10); checkUnitAward(u); }
      toast(t('passed')); refreshProgressUI();
    } else toast(t('again'));
  }
  function runCode() {
    var ed = $('lpEditor'), out = $('lpOutput'); if (!ed || !out) return;
    var res = window.ICTPython.run(ed.value);
    if (res.ok) { out.textContent = res.output || t('empty'); out.style.color = '#67e8f9'; }
    else { out.textContent = t('error') + ': ' + res.error; out.style.color = '#fca5a5'; }
  }

  /* ----------------------------- profile / cert ----------------------------- */
  function openProfile() {
    $('profileName').textContent = displayName(); $('profilePoints').textContent = state.user.points; $('profileCerts').textContent = state.user.certs;
    $('profileAvatar').textContent = (displayName().trim()[0] || (state.lang === 'ar' ? 'ع' : 'S'));
    var account = state.user.account;
    var phoneRow = $('profilePhoneRow'), gradeRow = $('profileGradeRow'), devicesRow = $('profileDevicesRow');
    if (account) {
      $('profilePhone').textContent = account.phone || '—';
      $('profileGrade').textContent = account.gradeName || '—';
      $('profileDevices').textContent = (state.user.devices || 1) + ' / ' + (state.user.maxDevices || 2);
      phoneRow.hidden = false; gradeRow.hidden = false; devicesRow.hidden = false;
      $('profileDeviceNote').hidden = false;
      $('logoutBtn').hidden = false;
      $('profileName').classList.remove('editable');
    } else {
      phoneRow.hidden = true; gradeRow.hidden = true; devicesRow.hidden = true;
      $('profileDeviceNote').hidden = true;
      $('logoutBtn').hidden = true;
      $('profileName').classList.add('editable');
    }
    $('profileModal').showModal();
  }
  function renameUser() {
    if (state.user.account) return; // الاسم جاي من الحساب المسجّل
    var n = prompt(t('name') + ':', displayName());
    if (n && n.trim()) { state.user.name = n.trim(); localStorage.setItem('ict-name', state.user.name); openProfile(); render(); }
  }
  function logoutUser() {
    if (!window.ICTAuth || !ICTAuth.logout) return;
    if (!confirm(t('logoutConfirm'))) return;
    ICTAuth.logout();
  }
  function resetAll() {
    if (!confirm(t('resetConfirm'))) return;
    state.progress = {}; state.awarded = []; state.picks = {}; state.tutor = {}; state.user.points = 0; state.user.certs = 0;
    ['ict-progress-v2', 'ict-awarded', 'ict-points', 'ict-certs'].forEach(function (k) { localStorage.removeItem(k); });
    $('profileModal').close(); render(); toast(t('resetDone'));
    if (state.user.account && window.ICTAuth && ICTAuth.sync) ICTAuth.sync();
  }
  function openCert() {
    var tot = totalLessons(), done = doneLessons(), complete = tot > 0 && done === tot;
    var d = new Date(), dateStr = d.toLocaleDateString(state.lang === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    $('certName').textContent = displayName();
    $('certUnit').textContent = t('heroTitle') + ' — ' + yearName() + ' / ' + termName();
    $('certDate').textContent = dateStr + ' · ' + (complete ? '100%' : Math.round(done / (tot || 1) * 100) + '%');
    var head = $('certModal').querySelector('.cert-title'); if (head) head.textContent = complete ? t('certHead') : t('certProgress');
    $('certModal').showModal();
  }
  function downloadCert() {
    var complete = totalLessons() > 0 && doneLessons() === totalLessons();
    var w = window.open('', '_blank'); if (!w) { toast(t('popupBlocked')); return; }
    var dir = state.lang === 'ar' ? 'rtl' : 'ltr', lg = state.lang;
    var dateStr = new Date().toLocaleDateString(state.lang === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    w.document.write('<!doctype html><html dir="' + dir + '" lang="' + lg + '"><head><meta charset="utf-8"><title>' + esc(complete ? t('certHead') : t('certProgress')) + '</title>' +
      '<style>body{font-family:"Segoe UI",Tahoma,sans-serif;padding:40px;text-align:center;color:#0f3d63}.frame{border:10px double #0f3d63;padding:50px;border-radius:14px}' +
      'h1{font-size:34px;margin:0 0 8px}h2{font-size:26px;margin:22px 0;color:#111}.seal{font-size:40px;font-weight:900;color:#0f3d63}p{color:#444}</style></head><body>' +
      '<div class="frame"><div class="seal">ICT</div><h1>' + esc(complete ? t('certHead') : t('certProgress')) + '</h1><p>' + esc(t('certSub')) + '</p>' +
      '<h2>' + esc(displayName()) + '</h2><p>' + esc(t('certCourse')) + '</p><h2>' + esc(t('heroTitle')) + '</h2>' +
      '<p>' + esc(yearName()) + ' — ' + esc(termName()) + '</p><p>' + esc(dateStr) + '</p></div>' +
      '<script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }

  /* --------------- حساب الطالب القادم من السيرفر (auth.js) --------------- */
  function applyAccount(account, extra) {
    if (!account) return;
    var first = !state.user.account;
    state.user.account = account;
    if (extra) { state.user.devices = extra.devices; state.user.maxDevices = extra.maxDevices; }
    if (account.name) state.user.name = account.name;
    state.user.points = Math.max(state.user.points, account.points || 0);
    state.user.certs = Math.max(state.user.certs, account.certs || 0);
    state.progress = Object.assign({}, account.progress || {}, state.progress);
    localStorage.setItem('ict-name', state.user.name);
    localStorage.setItem('ict-points', String(state.user.points));
    localStorage.setItem('ict-certs', String(state.user.certs));
    saveProgress();
    if (first && account.grade) {
      var index = -1;
      CURRICULUM.years.forEach(function (y, i) { if (y.id === account.grade) index = i; });
      if (index >= 0) { state.year = index; state.term = 0; }
    }
    render();
  }

  /* ----------------------------- init ----------------------------- */
  function checkTutor() {
    fetch('/api/health').then(function (r) { return r.ok ? r.json() : { ready: false }; })
      .then(function (d) { state.tutorReady = !!d.ready; })
      .catch(function () { state.tutorReady = false; });
  }
  function init() {
    $('navToggle').addEventListener('click', function () { $('sidebar').classList.toggle('open'); });
    $('sectionNav').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-view]') : null;
      if (b) { setView(b.getAttribute('data-view')); if (window.innerWidth <= 900) $('sidebar').classList.remove('open'); }
    });
    $('themeToggle').addEventListener('click', toggleTheme);
    $('langToggle').addEventListener('click', toggleLang);
    $('termToggle').addEventListener('click', toggleTerm);
    $('avatarBtn').addEventListener('click', openProfile);
    $('certBtn').addEventListener('click', openCert);
    $('closeProfile').addEventListener('click', function () { $('profileModal').close(); });
    $('closeCert').addEventListener('click', function () { $('certModal').close(); });
    $('closeDemo').addEventListener('click', closeDemo);
    $('demoModal').addEventListener('close', function () { stopActiveWidget(); var b = $('demoBody'); if (b) b.innerHTML = ''; });
    $('resetProgress').addEventListener('click', resetAll);
    $('logoutBtn').addEventListener('click', logoutUser);
    $('logoutTop').addEventListener('click', logoutUser);
    $('downloadCert').addEventListener('click', downloadCert);
    $('brandHome').addEventListener('click', function (e) { e.preventDefault(); state.view = 'lessons'; state.unit = null; state.lesson = null; render(); scrollTop(); });
    $('profileName').addEventListener('click', renameUser);
    $('profileModal').addEventListener('click', function (e) { if (e.target === $('profileModal')) $('profileModal').close(); });
    $('certModal').addEventListener('click', function (e) { if (e.target === $('certModal')) $('certModal').close(); });
    $('demoModal').addEventListener('click', function (e) { if (e.target === $('demoModal')) closeDemo(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('profileModal').open) $('profileModal').close(); if ($('certModal').open) $('certModal').close(); } });
    checkTutor();
    render();
  }

  window.ICT = {
    setYear: setYear, setTerm: setTerm, toggleTerm: toggleTerm, setView: setView,
    openUnit: openUnit, openLesson: openLesson, openLab: openLab, openGame: openGame, gotoProject: gotoProject,
    openDemo: openDemo, closeDemo: closeDemo,
    toggleDone: toggleDone, pick: pick, checkQuiz: checkQuiz, runCode: runCode, awardPoints: awardPoints,
    toggleLang: toggleLang, toggleTheme: toggleTheme, askTutor: askTutor, sendTutor: sendTutor,
    applyAccount: applyAccount, openProfile: openProfile, logoutUser: logoutUser,
    getState: function () { return { year: state.year, term: state.term, unit: state.unit, lesson: state.lesson, view: state.view, lab: state.lab, game: state.game }; },
    getUser: function () { return { name: state.user.name, points: state.user.points, certs: state.user.certs }; },
    getLang: function () { return state.lang; }, getYear: function () { return state.year; }, getTerm: function () { return state.term; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
