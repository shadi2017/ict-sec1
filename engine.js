/* ============================================================
   ICT Secondary — Python mini-engine
   A small, dependency-free interpreter for the subset taught in
   the Grade 10 ICT curriculum:
     print(), variables, arithmetic (+ - * / // % **), strings,
     lists + indexing, len/str/int/float/abs/sum/max/min,
     for ... in range(...), while, if/elif/else, def/return,
     break/continue.
   It is NOT a full Python implementation, but it really runs code.
   ============================================================ */
(function () {
  'use strict';

  var MAX_OUTPUT = 4000;
  var MAX_STEPS = 200000;

  function ReturnSignal(v) { this.value = v; }
  function BreakSignal() {}
  function ContinueSignal() {}

  function tokenize(src) {
    var tokens = [], i = 0;
    while (i < src.length) {
      var c = src[i];
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '#') break;
      if (c === '"' || c === "'") {
        var j = i + 1, str = '';
        while (j < src.length && src[j] !== c) {
          if (src[j] === '\\' && j + 1 < src.length) {
            var e = src[j + 1];
            str += e === 'n' ? '\n' : e === 't' ? '\t' : e;
            j += 2; continue;
          }
          str += src[j]; j++;
        }
        if (j >= src.length) throw new Error('سلسلة نصية غير مغلقة');
        tokens.push({ t: 'str', v: str }); i = j + 1; continue;
      }
      if (/[0-9]/.test(c)) {
        var jn = i; while (jn < src.length && /[0-9.]/.test(src[jn]) && !(src[jn] === '.' && src[jn + 1] === '.')) jn++;
        tokens.push({ t: 'num', v: parseFloat(src.slice(i, jn)) }); i = jn; continue;
      }
      if (/[A-Za-z_\u0600-\u06FF]/.test(c)) {
        var ji = i; while (ji < src.length && /[A-Za-z0-9_\u0600-\u06FF]/.test(src[ji])) ji++;
        tokens.push({ t: 'id', v: src.slice(i, ji) }); i = ji; continue;
      }
      var three = src.substr(i, 3), two = src.substr(i, 2);
      if (three === '**=' || three === '//=') { tokens.push({ t: 'op', v: three }); i += 3; continue; }
      if (['**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%='].indexOf(two) >= 0) { tokens.push({ t: 'op', v: two }); i += 2; continue; }
      if ('+-*/%<>,()[]:=.'.indexOf(c) >= 0) { tokens.push({ t: 'op', v: c }); i++; continue; }
      throw new Error('رمز غير معروف: ' + c);
    }
    return tokens;
  }

  function parse(tokens) {
    var pos = 0;
    function peek() { return tokens[pos]; }
    function next() { return tokens[pos++]; }
    function expect(v) { var t = next(); if (!t || t.v !== v) throw new Error('متوقع "' + v + '"'); return t; }

    function parseExpr() { return parseOr(); }
    function parseOr() {
      var left = parseAnd();
      while (peek() && peek().t === 'id' && peek().v === 'or') { next(); left = { t: 'or', l: left, r: parseAnd() }; }
      return left;
    }
    function parseAnd() {
      var left = parseNot();
      while (peek() && peek().t === 'id' && peek().v === 'and') { next(); left = { t: 'and', l: left, r: parseNot() }; }
      return left;
    }
    function parseNot() {
      if (peek() && peek().t === 'id' && peek().v === 'not') { next(); return { t: 'not', e: parseNot() }; }
      return parseComparison();
    }
    function parseComparison() {
      var left = parseAdd();
      while (peek() && peek().t === 'op' && ['==', '!=', '<', '>', '<=', '>='].indexOf(peek().v) >= 0) {
        var op = next().v; left = { t: 'cmp', op: op, l: left, r: parseAdd() };
      }
      return left;
    }
    function parseAdd() {
      var left = parseMul();
      while (peek() && peek().t === 'op' && ['+', '-'].indexOf(peek().v) >= 0) {
        var op = next().v; left = { t: 'bin', op: op, l: left, r: parseMul() };
      }
      return left;
    }
    function parseMul() {
      var left = parseUnary();
      while (peek() && peek().t === 'op' && ['*', '/', '//', '%'].indexOf(peek().v) >= 0) {
        var op = next().v; left = { t: 'bin', op: op, l: left, r: parseUnary() };
      }
      return left;
    }
    function parseUnary() {
      if (peek() && peek().t === 'op' && peek().v === '-') { next(); return { t: 'neg', e: parseUnary() }; }
      if (peek() && peek().t === 'op' && peek().v === '+') { next(); return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var base = parseAtom();
      if (peek() && peek().t === 'op' && peek().v === '**') { next(); return { t: 'bin', op: '**', l: base, r: parseUnary() }; }
      return base;
    }
    function parseAtom() {
      var node = parsePrimary();
      while (peek()) {
        if (peek().t === 'op' && peek().v === '(') {
          next(); var args = [];
          if (!(peek() && peek().t === 'op' && peek().v === ')')) {
            args.push(parseExpr());
            while (peek() && peek().t === 'op' && peek().v === ',') { next(); args.push(parseExpr()); }
          }
          expect(')'); node = { t: 'call', callee: node, args: args };
        } else if (peek().t === 'op' && peek().v === '[') {
          next(); var idx = parseExpr(); expect(']'); node = { t: 'index', obj: node, index: idx };
        } else break;
      }
      return node;
    }
    function parsePrimary() {
      var t = peek();
      if (!t) throw new Error('تعبير غير مكتمل');
      if (t.t === 'num') { next(); return { t: 'num', v: t.v }; }
      if (t.t === 'str') { next(); return { t: 'str', v: t.v }; }
      if (t.t === 'id') {
        next();
        if (t.v === 'True') return { t: 'bool', v: true };
        if (t.v === 'False') return { t: 'bool', v: false };
        if (t.v === 'None') return { t: 'none' };
        return { t: 'name', v: t.v };
      }
      if (t.t === 'op' && t.v === '(') { next(); var e = parseExpr(); expect(')'); return e; }
      if (t.t === 'op' && t.v === '[') {
        next(); var items = [];
        if (!(peek() && peek().t === 'op' && peek().v === ']')) {
          items.push(parseExpr());
          while (peek() && peek().t === 'op' && peek().v === ',') { next(); items.push(parseExpr()); }
        }
        expect(']'); return { t: 'list', items: items };
      }
      throw new Error('تعبير غير صالح: ' + JSON.stringify(t.v));
    }

    var ast = parseExpr();
    if (pos < tokens.length) throw new Error('رموز زائدة في نهاية التعبير');
    return ast;
  }

  function truthy(v) {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.length > 0;
    return !!v;
  }

  function fmt(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (Array.isArray(v)) return '[' + v.map(fmt).join(', ') + ']';
    if (typeof v === 'number') {
      if (Number.isInteger(v)) return String(v);
      return String(Math.round(v * 1e10) / 1e10);
    }
    return String(v);
  }

  function binop(op, a, b) {
    switch (op) {
      case '+':
        if (typeof a === 'string' || typeof b === 'string') return fmt2(a) + fmt2(b);
        if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
        return a + b;
      case '-': return a - b;
      case '*':
        if (typeof a === 'string' && typeof b === 'number') return a.repeat(Math.max(0, b));
        if (typeof b === 'string' && typeof a === 'number') return b.repeat(Math.max(0, a));
        return a * b;
      case '/':
        if (b === 0) throw new Error('القسمة على صفر');
        return a / b;
      case '//':
        if (b === 0) throw new Error('القسمة على صفر');
        return Math.floor(a / b);
      case '%':
        if (b === 0) throw new Error('القسمة على صفر');
        return ((a % b) + b) % b;
      case '**': return Math.pow(a, b);
    }
    throw new Error('عملية غير معروفة: ' + op);
  }
  function fmt2(v) { return typeof v === 'string' ? v : fmt(v); }

  function compare(op, a, b) {
    switch (op) {
      case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
    }
    throw new Error('مقارنة غير معروفة: ' + op);
  }

  function evalAst(node, ctx) {
    switch (node.t) {
      case 'num': case 'str': case 'bool': return node.v;
      case 'none': return null;
      case 'name':
        if (node.v in ctx.vars) return ctx.vars[node.v];
        throw new Error('اسم غير معرّف: ' + node.v);
      case 'list': return node.items.map(function (n) { return evalAst(n, ctx); });
      case 'neg': return -Number(evalAst(node.e, ctx));
      case 'not': return !truthy(evalAst(node.e, ctx));
      case 'and': return truthy(evalAst(node.l, ctx)) ? evalAst(node.r, ctx) : evalAst(node.l, ctx);
      case 'or': return truthy(evalAst(node.l, ctx)) ? evalAst(node.l, ctx) : evalAst(node.r, ctx);
      case 'cmp': return compare(node.op, evalAst(node.l, ctx), evalAst(node.r, ctx));
      case 'bin': return binop(node.op, evalAst(node.l, ctx), evalAst(node.r, ctx));
      case 'index': {
        var o = evalAst(node.obj, ctx), ix = evalAst(node.index, ctx);
        if (typeof o === 'string') return o[ix < 0 ? o.length + ix : ix];
        return o[ix < 0 ? o.length + ix : ix];
      }
      case 'call': {
        if (node.callee.t !== 'name') throw new Error('استدعاء دالة غير مدعوم');
        var args = node.args.map(function (a) { return evalAst(a, ctx); });
        return callBuiltin(node.callee.v, args, ctx);
      }
    }
    throw new Error('عقدة غير معروفة');
  }

  function callBuiltin(name, args, ctx) {
    switch (name) {
      case 'range': {
        var start = 0, stop, step = 1;
        if (args.length === 1) { stop = args[0]; }
        else if (args.length === 2) { start = args[0]; stop = args[1]; }
        else { start = args[0]; stop = args[1]; step = args[2]; }
        var arr = [];
        if (step === 0) throw new Error('step في range لا يمكن أن يكون صفراً');
        if (step > 0) { for (var x = start; x < stop; x += step) arr.push(x); }
        else { for (var y = start; y > stop; y += step) arr.push(y); }
        return arr;
      }
      case 'len': return args[0].length;
      case 'str': return fmt(args[0]);
      case 'int': return Math.trunc(Number(args[0]));
      case 'float': return Number(args[0]);
      case 'abs': return Math.abs(args[0]);
      case 'sum': return args[0].reduce(function (a, b) { return a + b; }, 0);
      case 'max': return (args.length === 1 && Array.isArray(args[0])) ? Math.max.apply(null, args[0]) : Math.max.apply(null, args);
      case 'min': return (args.length === 1 && Array.isArray(args[0])) ? Math.min.apply(null, args[0]) : Math.min.apply(null, args);
      case 'input': return args.length ? args[0] : '';
      case 'print': ctx.out.push(args.map(fmt).join(' ')); return null;
      default: {
        var fn = ctx.funcs[name];
        if (!fn) throw new Error('دالة غير معرّفة: ' + name);
        var child = Object.assign({}, ctx);
        child.vars = Object.create(ctx.vars);
        fn.params.forEach(function (p, idx) { child.vars[p] = args[idx]; });
        try { execBlock(ctx.lines, fn.bs, fn.be, child); }
        catch (e) { if (e instanceof ReturnSignal) return e.value; throw e; }
        return null;
      }
    }
  }

  var stepCount = 0;
  function tick() { if (++stepCount > MAX_STEPS) throw new Error('تم إيقاف التنفيذ: عدد خطوات كبير جداً (حلقة لا نهائية؟)'); }

  function parseLines(src) {
    var raw = String(src).replace(/\r\n?/g, '\n').split('\n');
    var lines = [];
    for (var i = 0; i < raw.length; i++) {
      var line = raw[i];
      var stripped = line.replace(/\t/g, '    ');
      var text = stripped.replace(/\s+$/, '');
      if (text.trim() === '') continue;
      if (text.trim().charAt(0) === '#') continue;
      var indent = text.length - text.replace(/^\s+/, '').length;
      lines.push({ indent: indent, text: text.trim() });
    }
    return lines;
  }

  function blockEnd(lines, start, end, indent) {
    var j = start;
    while (j < end && lines[j].indent > indent) j++;
    return j;
  }

  function execSimple(text, ctx) {
    if (/^pass$/.test(text)) return;
    if (/^break$/.test(text)) throw new BreakSignal();
    if (/^continue$/.test(text)) throw new ContinueSignal();
    var r = text.match(/^return\b([\s\S]*)$/);
    if (r) {
      var val = r[1].trim() === '' ? null : evalAst(parse(tokenize(r[1])), ctx);
      throw new ReturnSignal(val);
    }
    var m = text.match(/^([A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*)\s*(\*\*=|\/\/=|\+=|-=|\*=|\/=|%=|=(?!=))\s*([\s\S]+)$/);
    if (m) {
      var name = m[1], op = m[2], expr = m[3];
      var value = evalAst(parse(tokenize(expr)), ctx);
      if (op === '=') { ctx.vars[name] = value; return; }
      var cur = ctx.vars[name];
      var baseOp = op.slice(0, -1);
      ctx.vars[name] = binop(baseOp, cur, value);
      return;
    }
    // bare expression statement (e.g. print(...))
    evalAst(parse(tokenize(text)), ctx);
  }

  function execIfChain(lines, i, end, ctx) {
    var indent = lines[i].indent;
    var cur = i;
    while (cur < end) {
      var text = lines[cur].text;
      var m = text.match(/^(if|elif|else)\b([\s\S]*):$/);
      if (!m) break;
      var j = blockEnd(lines, cur + 1, end, indent);
      var cond = m[2].trim();
      if (m[1] === 'else' || truthy(evalAst(parse(tokenize(cond)), ctx))) {
        execBlock(lines, cur + 1, j, ctx);
        var k = j;
        while (k < end && lines[k].indent === indent && /^(elif|else)\b/.test(lines[k].text)) {
          k = blockEnd(lines, k + 1, end, indent);
        }
        return k;
      }
      if (j >= end || lines[j].indent !== indent) return j;
      if (!/^(elif|else)\b/.test(lines[j].text)) return j;
      cur = j;
    }
    return cur;
  }

  function execBlock(lines, start, end, ctx) {
    var i = start;
    while (i < end) {
      tick();
      var line = lines[i];
      var text = line.text;
      var head = text.match(/^(for|while|if|def)\b[\s\S]*:$/);
      if (head) {
        var j = blockEnd(lines, i + 1, end, line.indent);
        if (head[1] === 'for') {
          var fm = text.match(/^for\s+([A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*)\s+in\s+([\s\S]*):$/);
          if (!fm) throw new Error('صيغة for غير صحيحة');
          var iterable = evalAst(parse(tokenize(fm[2])), ctx);
          if (!Array.isArray(iterable)) iterable = [];
          for (var a = 0; a < iterable.length; a++) {
            tick();
            ctx.vars[fm[1]] = iterable[a];
            try { execBlock(lines, i + 1, j, ctx); }
            catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
          }
          i = j; continue;
        }
        if (head[1] === 'while') {
          var cond = text.replace(/^while\s+/, '').replace(/:$/, '');
          var guard = 0;
          while (truthy(evalAst(parse(tokenize(cond)), ctx))) {
            tick();
            if (++guard > 10000) throw new Error('حلقة while لا تنتهي (تجاوزت 10000 تكرار)');
            try { execBlock(lines, i + 1, j, ctx); }
            catch (e) { if (e instanceof BreakSignal) break; if (e instanceof ContinueSignal) continue; throw e; }
          }
          i = j; continue;
        }
        if (head[1] === 'def') {
          var dm = text.match(/^def\s+([A-Za-z_\u0600-\u06FF][A-Za-z0-9_\u0600-\u06FF]*)\s*\((.*)\)\s*:$/);
          if (!dm) throw new Error('صيغة def غير صحيحة');
          ctx.funcs[dm[1]] = {
            params: dm[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean),
            bs: i + 1, be: j
          };
          i = j; continue;
        }
        // if
        i = execIfChain(lines, i, end, ctx);
        continue;
      }
      execSimple(text, ctx);
      i++;
    }
  }

  function runPython(src) {
    try {
      stepCount = 0;
      var lines = parseLines(src);
      var ctx = { out: [], vars: {}, funcs: {}, lines: lines };
      try { execBlock(lines, 0, lines.length, ctx); }
      catch (e) { if (!(e instanceof ReturnSignal)) throw e; }
      var out = ctx.out.join('\n');
      if (out.length > MAX_OUTPUT) out = out.slice(0, MAX_OUTPUT) + '\n...';
      return { ok: true, output: out };
    } catch (e) {
      return { ok: false, output: '', error: (e && e.message) ? e.message : String(e) };
    }
  }

  window.ICTPython = { run: runPython };
})();
