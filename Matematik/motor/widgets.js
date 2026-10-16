/* Kamp ders motoru - etkilesimli araclar (widget). Her arac: KAMP.widgets.<ad>(el, o, ctx).
   plot, triangle, unitcircle, tree, modclock, pascal, flow, twoway, particles, balance, gas, beaker, poem */
(function () {
  'use strict';
  var K = window.KAMP, U = K.util, h = U.h, W = K.widgets;
  var NS = 'http://www.w3.org/2000/svg';
  var FS = 1.35; /* svg yazi olcegi (640 birim genislik telefonda ~0.55x gorunur) */
  var COL = ['var(--teal)', 'var(--orange)', 'var(--blue)', 'var(--plum)', 'var(--red)', 'var(--green)', 'var(--ink)'];
  function col(c) { return typeof c === 'number' ? COL[c % COL.length] : (c || COL[0]); }
  function S(tag, a, parent) {
    var e = document.createElementNS(NS, tag), k;
    for (k in a) if (a[k] != null) { if (k === 'text') e.textContent = a[k]; else if (k === 'style') e.setAttribute('style', a[k]); else e.setAttribute(k, a[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgRoot(el, w, hgt) { var s = S('svg', { viewBox: '0 0 ' + w + ' ' + hgt, preserveAspectRatio: 'xMidYMid meet' }); el.appendChild(s); return s; }
  function txt(parent, x, y, t, a) {
    a = a || {};
    return S('text', { x: x, y: y, text: t, 'text-anchor': a.anchor || 'middle', 'dominant-baseline': a.base || 'middle', class: 'svg-text',
      style: 'font-size:' + Math.round((a.size || 15) * FS) + 'px;' + (a.bold ? 'font-weight:700;' : '') + (a.fill ? 'fill:' + a.fill + ';' : '') + (a.hand ? 'font-family:var(--hand);' : '') }, parent);
  }
  function line(parent, x1, y1, x2, y2, c, w, dash) {
    return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, style: 'stroke:' + (c || 'var(--ink)') + ';stroke-width:' + (w || 2) + ';' + (dash ? 'stroke-dasharray:6 5;' : '') + 'stroke-linecap:round' }, parent);
  }
  function fmt(x, d) {
    if (!isFinite(x)) return '—';
    var r = Math.round(x * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d);
    if (Object.is(r, -0)) r = 0;
    return String(r).replace('.', ',');
  }
  function slider(parent, p, onInput) {
    var inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step || 1, value: p.val });
    var out = h('output', { text: fmt(+p.val, 3) + (p.unit || '') });
    inp.addEventListener('input', function () { out.textContent = fmt(+inp.value, 3) + (p.unit || ''); onInput(+inp.value); });
    var row = h('div', { class: 'sl' }, h('label', { html: U.inline(p.label || '') }), inp, out);
    parent.appendChild(row);
    return { input: inp, set: function (v) { inp.value = v; out.textContent = fmt(+v, 3) + (p.unit || ''); } };
  }
  function toggles(parent, items, onChange, multi) {
    var bar = h('div', { class: 'tog' }), state = {};
    items.forEach(function (it) {
      state[it.k] = !!it.on;
      var b = h('button', { type: 'button', class: it.on ? 'on' : '', html: U.inline(it.t) });
      b.onclick = function () {
        if (multi === false) { Object.keys(state).forEach(function (k) { state[k] = false; }); U.$$('button', bar).forEach(function (x) { x.classList.remove('on'); }); state[it.k] = true; b.classList.add('on'); }
        else { state[it.k] = !state[it.k]; b.classList.toggle('on', state[it.k]); }
        onChange(state, it.k);
      };
      bar.appendChild(b);
    });
    parent.appendChild(bar);
    return state;
  }
  function readout(parent) { var r = h('div', { class: 'readout' }); parent.appendChild(r); return r; }
  function cssVar(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim() || '#333'; }
  function alive(el) { return el && el.isConnected; }

  /* ---------- ifade degerlendirici (icerik bizim; yine de yalniz izinli adlar) */
  var MATH = {
    sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max,
    exp: Math.exp, ln: Math.log, log: function (v) { return Math.log10(v); }, sign: Math.sign, pi: Math.PI, PI: Math.PI,
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sind: function (d) { return Math.sin(d * Math.PI / 180); }, cosd: function (d) { return Math.cos(d * Math.PI / 180); }, tand: function (d) { return Math.tan(d * Math.PI / 180); },
    dist: function (a, b, c, d) { return Math.hypot(c - a, d - b); }
  };
  var cache = {};
  function compile(expr) {
    expr = String(expr);
    if (cache[expr]) return cache[expr];
    var src = expr.replace(/\^/g, '**').replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2').replace(/\)\s*([a-zA-Z0-9(])/g, ')*$1').replace(/\bx\s*\(/g, 'x*(');
    var f;
    try { f = new Function('S', 'with(S){return (' + src + ');}'); } catch (e) { f = function () { return NaN; }; }
    cache[expr] = f;
    return f;
  }
  function ev(expr, scope) {
    if (typeof expr === 'number') return expr;
    if (expr == null || expr === '') return NaN;
    try { var v = compile(expr)(scope); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; }
  }
  function template(t, scope) {
    return String(t).replace(/\{([^{}]+)\}/g, function (m, e) { var v = ev(e, scope); return isNaN(v) ? m : fmt(v, 2); });
  }
  K.ev = ev;

  /* ============================================================ plot: fonksiyon / koordinat */
  W.plot = function (el, o) {
    var x0 = (o.x || [-6, 6])[0], x1 = (o.x || [-6, 6])[1], y0 = (o.y || [-4, 6])[0], y1 = (o.y || [-4, 6])[1];
    var Wd = 640, pad = 30;
    var Ht = o.equal ? Math.round((Wd - 2 * pad) * (y1 - y0) / (x1 - x0) + 2 * pad) : (o.h || 420);
    Ht = Math.max(240, Math.min(820, Ht));
    var svg = svgRoot(el, Wd, Ht);
    function X(x) { return pad + (x - x0) / (x1 - x0) * (Wd - 2 * pad); }
    function Y(y) { return Ht - pad - (y - y0) / (y1 - y0) * (Ht - 2 * pad); }
    function IX(px) { return x0 + (px - pad) / (Wd - 2 * pad) * (x1 - x0); }
    function IY(py) { return y0 + (Ht - pad - py) / (Ht - 2 * pad) * (y1 - y0); }
    var st = S('g', {}, svg);
    var g = o.grid == null ? 1 : o.grid, gx, gy;
    if (g) {
      for (gx = Math.ceil(x0 / g) * g; gx <= x1 + 1e-9; gx += g) line(st, X(gx), Y(y0), X(gx), Y(y1), 'var(--soft)', 1);
      for (gy = Math.ceil(y0 / g) * g; gy <= y1 + 1e-9; gy += g) line(st, X(x0), Y(gy), X(x1), Y(gy), 'var(--soft)', 1);
    }
    if (o.axes !== false) {
      var ax = Math.max(y0, Math.min(y1, 0)), ay = Math.max(x0, Math.min(x1, 0));
      line(st, X(x0), Y(ax), X(x1), Y(ax), 'var(--ink)', 2); line(st, X(ay), Y(y0), X(ay), Y(y1), 'var(--ink)', 2);
      S('path', { d: 'M' + X(x1) + ' ' + Y(ax) + 'l-9 -5v10z', style: 'fill:var(--ink)' }, st);
      S('path', { d: 'M' + X(ay) + ' ' + Y(y1) + 'l-5 9h10z', style: 'fill:var(--ink)' }, st);
      txt(st, X(x1) - 6, Y(ax) - 14, (o.labels || {}).x || 'x', { size: 16, bold: true });
      txt(st, X(ay) + 14, Y(y1) + 8, (o.labels || {}).y || 'y', { size: 16, bold: true, anchor: 'start' });
      var tk = o.ticks || g || 1, step = tk;
      var spanX = (x1 - x0) / tk; if (spanX > 16) step = tk * Math.ceil(spanX / 16);
      for (gx = Math.ceil(x0 / step) * step; gx <= x1 - step * 0.5; gx += step) if (Math.abs(gx) > 1e-9) { line(st, X(gx), Y(ax) - 4, X(gx), Y(ax) + 4, 'var(--ink)', 1.5); txt(st, X(gx), Y(ax) + 16, fmt(gx, 2), { size: 12, fill: 'var(--ink2)' }); }
      var stepY = tk, spanY = (y1 - y0) / tk; if (spanY > 14) stepY = tk * Math.ceil(spanY / 14);
      for (gy = Math.ceil(y0 / stepY) * stepY; gy <= y1 - stepY * 0.5; gy += stepY) if (Math.abs(gy) > 1e-9) { line(st, X(ay) - 4, Y(gy), X(ay) + 4, Y(gy), 'var(--ink)', 1.5); txt(st, X(ay) - 8, Y(gy), fmt(gy, 2), { size: 12, anchor: 'end', fill: 'var(--ink2)' }); }
      txt(st, X(ay) - 8, Y(ax) + 14, '0', { size: 12, anchor: 'end', fill: 'var(--ink2)' });
    }
    var dyn = S('g', {}, svg);
    var scope = Object.create(MATH);
    var params = o.params || {};
    Object.keys(params).forEach(function (k) { scope[k] = +params[k].val; });
    var pts = (o.points || []).map(function (p, i) { return { p: p, name: p.name || p.n || ('P' + i), x: 0, y: 0 }; });
    function computePts() {
      pts.forEach(function (q) {
        if (q.dragged) { /* surukleneni koru */ }
        else { q.x = ev(q.p.x, scope); q.y = ev(q.p.y, scope); }
        scope[q.name + 'x'] = q.x; scope[q.name + 'y'] = q.y;
      });
    }
    function getXY(a) {
      if (typeof a === 'string') { var f = pts.filter(function (q) { return q.name === a; })[0]; return f ? [f.x, f.y] : [NaN, NaN]; }
      return [ev(a[0], scope), ev(a[1], scope)];
    }
    var ro = o.readout ? null : null;
    function sample(f, dom) {
      var a = dom ? Math.max(x0, ev(dom[0], scope)) : x0, b = dom ? Math.min(x1, ev(dom[1], scope)) : x1, N = 480, d = '', pen = false, prevY = null, i;
      for (i = 0; i <= N; i++) {
        var x = a + (b - a) * i / N, y = ev(f, (scope.x = x, scope));
        if (!isFinite(y) || y > y1 + (y1 - y0) * 3 || y < y0 - (y1 - y0) * 3 || (prevY != null && Math.abs(y - prevY) > (y1 - y0) * 1.5)) { pen = false; prevY = isFinite(y) ? y : null; continue; }
        d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1); pen = true; prevY = y;
      }
      return d;
    }
    var clipId = 'c' + Math.random().toString(36).slice(2);
    var defs = S('defs', {}, svg); var cp = S('clipPath', { id: clipId }, defs); S('rect', { x: pad, y: pad, width: Wd - 2 * pad, height: Ht - 2 * pad }, cp);
    dyn.setAttribute('clip-path', 'url(#' + clipId + ')');
    var top = S('g', {}, svg);
    function render() {
      computePts();
      dyn.innerHTML = ''; top.innerHTML = '';
      (o.shade || []).forEach(function (sh) {
        var a = Math.max(x0, ev(sh.from != null ? sh.from : x0, scope)), b = Math.min(x1, ev(sh.to != null ? sh.to : x1, scope)), N = 200, up = '', dn = [], i;
        for (i = 0; i <= N; i++) {
          var x = a + (b - a) * i / N; scope.x = x;
          var f1 = sh.f1 != null ? ev(sh.f1, scope) : y0 - 1, f2 = sh.f2 != null ? ev(sh.f2, scope) : y1 + 1;
          f1 = Math.max(y0 - 1, Math.min(y1 + 1, f1)); f2 = Math.max(y0 - 1, Math.min(y1 + 1, f2));
          up += (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(f2).toFixed(1); dn.push(X(x).toFixed(1) + ' ' + Y(f1).toFixed(1));
        }
        S('path', { d: up + 'L' + dn.reverse().join('L') + 'Z', style: 'fill:' + col(sh.c == null ? 0 : sh.c) + ';opacity:.18' }, dyn);
      });
      (o.polys || []).forEach(function (pl) {
        var d = (pl.pts || []).map(function (a, i) { var p = getXY(a); return (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]); }).join('') + (pl.open ? '' : 'Z');
        S('path', { d: d, style: 'fill:' + (pl.fill ? col(pl.c) : 'none') + ';fill-opacity:.18;stroke:' + col(pl.c) + ';stroke-width:' + (pl.w || 2.5) + ';' + (pl.dash ? 'stroke-dasharray:6 5;' : '') }, dyn);
      });
      (o.vlines || []).forEach(function (v) { var x = ev(v.x, scope); line(dyn, X(x), Y(y0), X(x), Y(y1), col(v.c == null ? 6 : v.c), v.w || 1.8, v.dash !== false); if (v.label) txt(top, X(x) + 4, pad + 12, template(v.label, scope), { anchor: 'start', size: 13, fill: col(v.c == null ? 6 : v.c) }); });
      (o.hlines || []).forEach(function (v) { var y = ev(v.y, scope); line(dyn, X(x0), Y(y), X(x1), Y(y), col(v.c == null ? 6 : v.c), v.w || 1.8, v.dash !== false); if (v.label) txt(top, Wd - pad - 4, Y(y) - 10, template(v.label, scope), { anchor: 'end', size: 13, fill: col(v.c == null ? 6 : v.c) }); });
      (o.fns || []).forEach(function (fn, i) {
        S('path', { d: sample(fn.f, fn.dom), style: 'fill:none;stroke:' + col(fn.c == null ? i : fn.c) + ';stroke-width:' + (fn.w || 3.2) + ';stroke-linejoin:round;stroke-linecap:round;' + (fn.dash ? 'stroke-dasharray:8 6;' : '') }, dyn);
        if (fn.label) {
          var lx = fn.lx != null ? ev(fn.lx, scope) : x1 - (x1 - x0) * 0.08; scope.x = lx; var ly = ev(fn.f, scope);
          if (isFinite(ly) && ly < y1 && ly > y0) txt(top, X(lx), Y(ly) - 14, template(fn.label, scope), { size: 15, bold: true, fill: col(fn.c == null ? i : fn.c) });
        }
      });
      (o.segs || []).forEach(function (sg) {
        var a = getXY(sg.a), b = getXY(sg.b);
        if (sg.extend) { var dx = b[0] - a[0], dy = b[1] - a[1], L = 1e3; a = [a[0] - dx * L, a[1] - dy * L]; b = [b[0] + dx * L, b[1] + dy * L]; }
        line(dyn, X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), col(sg.c == null ? 6 : sg.c), sg.w || 2.5, sg.dash);
        if (sg.label) { var mx = (X(a[0]) + X(b[0])) / 2, my = (Y(a[1]) + Y(b[1])) / 2; txt(top, mx + (sg.lx || 0), my + (sg.ly || -12), template(sg.label, scope), { size: 14, bold: true, fill: col(sg.c == null ? 6 : sg.c) }); }
      });
      pts.forEach(function (q, i) {
        if (!isFinite(q.x) || !isFinite(q.y)) return;
        var c = col(q.p.c == null ? 1 : q.p.c);
        if (q.p.drag) S('circle', { cx: X(q.x), cy: Y(q.y), r: 15, style: 'fill:' + c + ';opacity:.18' }, top);
        S('circle', { cx: X(q.x), cy: Y(q.y), r: q.p.r || 8, style: 'fill:' + (q.p.hollow ? 'var(--card)' : c) + ';stroke:var(--ink);stroke-width:2' }, top);
        if (q.p.label !== false) {
          var lab = q.p.label != null ? template(q.p.label, scope) : q.name + '(' + fmt(q.x, 2) + ', ' + fmt(q.y, 2) + ')';
          txt(top, X(q.x) + (q.p.lx != null ? q.p.lx : 10), Y(q.y) + (q.p.ly != null ? q.p.ly : -14), lab, { anchor: q.p.anchor || 'start', size: 14, bold: true });
        }
      });
      (o.texts || []).forEach(function (t) { txt(top, X(ev(t.x, scope)), Y(ev(t.y, scope)), template(t.t, scope), { size: t.size || 15, fill: col(t.c == null ? 6 : t.c), anchor: t.anchor || 'middle', bold: t.bold }); });
      if (ro) ro.innerHTML = U.inline(template(o.readout, scope));
    }
    var ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr);
    Object.keys(params).forEach(function (k) {
      var p = params[k];
      slider(ctr, { label: p.label || k, min: p.min, max: p.max, step: p.step || 0.1, val: p.val, unit: p.unit }, function (v) { scope[k] = v; render(); });
    });
    if (o.readout) ro = readout(el);
    /* surukleme */
    var drag = null;
    function evPt(e) { var r = svg.getBoundingClientRect(); var sx = Wd / r.width, sy = Ht / r.height; return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy]; }
    svg.addEventListener('pointerdown', function (e) {
      var p = evPt(e), best = null, bd = 30;
      pts.forEach(function (q) { if (!q.p.drag) return; var d = Math.hypot(X(q.x) - p[0], Y(q.y) - p[1]); if (d < bd) { bd = d; best = q; } });
      if (best) { drag = best; svg.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = evPt(e), sn = drag.p.snap == null ? 1 : drag.p.snap;
      var nx = IX(p[0]), ny = IY(p[1]);
      if (sn) { nx = Math.round(nx / sn) * sn; ny = Math.round(ny / sn) * sn; }
      nx = Math.max(x0, Math.min(x1, nx)); ny = Math.max(y0, Math.min(y1, ny));
      if (drag.p.onfn != null) { scope.x = nx; ny = ev((o.fns[drag.p.onfn] || {}).f, scope); }
      drag.p.x = nx; drag.p.y = ny;
      render();
    });
    function up() { drag = null; }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    render();
  };

  /* ============================================================ triangle: trigonometri ve ucgen */
  function ang(a, b, c) { /* b kosesindeki aci (derece) */
    var v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    var cs = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]));
    return Math.acos(Math.max(-1, Math.min(1, cs))) * 180 / Math.PI;
  }
  function D(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function footPerp(p, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy); return [a[0] + t * dx, a[1] + t * dy]; }
  function circum(A, B, C) {
    var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    var ux = ((A[0] * A[0] + A[1] * A[1]) * (B[1] - C[1]) + (B[0] * B[0] + B[1] * B[1]) * (C[1] - A[1]) + (C[0] * C[0] + C[1] * C[1]) * (A[1] - B[1])) / d;
    var uy = ((A[0] * A[0] + A[1] * A[1]) * (C[0] - B[0]) + (B[0] * B[0] + B[1] * B[1]) * (A[0] - C[0]) + (C[0] * C[0] + C[1] * C[1]) * (B[0] - A[0])) / d;
    return [ux, uy];
  }
  function rightMark(g, P, a, b, s) {
    var u = [(a[0] - P[0]), (a[1] - P[1])], v = [(b[0] - P[0]), (b[1] - P[1])], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    u = [u[0] / lu * s, u[1] / lu * s]; v = [v[0] / lv * s, v[1] / lv * s];
    S('path', { d: 'M' + (P[0] + u[0]) + ' ' + (P[1] + u[1]) + 'L' + (P[0] + u[0] + v[0]) + ' ' + (P[1] + u[1] + v[1]) + 'L' + (P[0] + v[0]) + ' ' + (P[1] + v[1]), style: 'fill:none;stroke:var(--ink);stroke-width:1.8' }, g);
  }
  function arcMark(g, P, a, b, r, c, label) {
    var a1 = Math.atan2(a[1] - P[1], a[0] - P[0]), a2 = Math.atan2(b[1] - P[1], b[0] - P[0]);
    var d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    var e = a1 + d, sweep = d > 0 ? 1 : 0;
    S('path', { d: 'M' + (P[0] + r * Math.cos(a1)) + ' ' + (P[1] + r * Math.sin(a1)) + 'A' + r + ' ' + r + ' 0 0 ' + sweep + ' ' + (P[0] + r * Math.cos(e)) + ' ' + (P[1] + r * Math.sin(e)), style: 'fill:none;stroke:' + (c || 'var(--orange)') + ';stroke-width:2.5' }, g);
    if (label) { var m = a1 + d / 2; txt(g, P[0] + (r + 16) * Math.cos(m), P[1] + (r + 16) * Math.sin(m), label, { size: 15, bold: true, fill: c || 'var(--orange)' }); }
  }
  W.triangle = function (el, o) {
    var mode = o.mode || 'trig', Wd = 640, Ht = mode === 'trig' ? 400 : 440;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr);
    var ro = readout(el);
    if (mode === 'trig') {
      var a = o.angle || 30, show = o.show || ['sin', 'cos', 'tan'], hl = o.hl || null, hyp = o.hyp || null;
      var names = o.names || ['A', 'B', 'C'];
      var drawT = function () {
        g.innerHTML = '';
        var r = a * Math.PI / 180, L = 470, Ax = 80, Ay = 340, adj = L * Math.cos(r), opp = L * Math.sin(r);
        var sc = Math.min(1, 300 / opp); adj *= sc; opp *= sc;
        var A = [Ax, Ay], C = [Ax + adj, Ay], B = [Ax + adj, Ay - opp];
        var cAdj = 'var(--blue)', cOpp = 'var(--orange)', cHyp = 'var(--teal)';
        function w(k) { return hl && hl.indexOf(k) >= 0 ? 6 : 3.5; }
        line(g, A[0], A[1], C[0], C[1], cAdj, w('komsu'));
        line(g, C[0], C[1], B[0], B[1], cOpp, w('karsi'));
        line(g, A[0], A[1], B[0], B[1], cHyp, w('hipotenus'));
        rightMark(g, C, A, B, 16);
        arcMark(g, A, C, B, 46, 'var(--red)', 'α');
        txt(g, A[0] - 14, A[1] + 6, names[0], { size: 18, bold: true });
        txt(g, B[0] + 14, B[1] - 4, names[1], { size: 18, bold: true });
        txt(g, C[0] + 14, C[1] + 8, names[2], { size: 18, bold: true });
        var k = hyp ? hyp : 1, sh = hyp ? fmt(hyp * Math.cos(r), 2) : '', so = hyp ? fmt(hyp * Math.sin(r), 2) : '';
        txt(g, (A[0] + C[0]) / 2, A[1] + 22, 'komşu dik kenar' + (hyp ? ' = ' + sh : ''), { size: 15, fill: cAdj, bold: true });
        txt(g, C[0] + 12, (C[1] + B[1]) / 2, 'karşı dik' + (hyp ? ' = ' + so : ''), { size: 15, fill: cOpp, bold: true, anchor: 'start' });
        var hm = mid(A, B);
        txt(g, hm[0] - 18, hm[1] - 16, 'hipotenüs' + (hyp ? ' = ' + fmt(hyp, 2) : ''), { size: 15, fill: cHyp, bold: true, anchor: 'end' });
        var s = Math.sin(r), c = Math.cos(r), t = Math.tan(r), ct = 1 / t, parts = [];
        if (show.indexOf('sin') >= 0) parts.push('$\\sin\\alpha=\\dfrac{\\text{karşı}}{\\text{hipotenüs}}\\approx ' + fmt(s, 3).replace(',', '{,}') + '$');
        if (show.indexOf('cos') >= 0) parts.push('$\\cos\\alpha=\\dfrac{\\text{komşu}}{\\text{hipotenüs}}\\approx ' + fmt(c, 3).replace(',', '{,}') + '$');
        if (show.indexOf('tan') >= 0) parts.push('$\\tan\\alpha=\\dfrac{\\text{karşı}}{\\text{komşu}}\\approx ' + fmt(t, 3).replace(',', '{,}') + '$');
        if (show.indexOf('cot') >= 0) parts.push('$\\cot\\alpha=\\dfrac{\\text{komşu}}{\\text{karşı}}\\approx ' + fmt(ct, 3).replace(',', '{,}') + '$');
        ro.innerHTML = '<div style="font-family:var(--hand);font-size:1.3rem">α = ' + a + '°</div>' + parts.map(function (p) { return '<div style="margin:4px 0">' + U.inline(p) + '</div>'; }).join('');
      };
      if (o.slider !== false) slider(ctr, { label: 'Açı α', min: o.min || 5, max: o.max || 85, step: 1, val: a, unit: '°' }, function (v) { a = v; drawT(); });
      drawT();
      return;
    }
    /* suruklenebilir koseli ucgen */
    var P = (o.pts || [[120, 360], [520, 360], [300, 90]]).map(function (p) { return p.slice(); });
    var on = {}, tg;
    if (mode === 'centers') {
      tg = toggles(ctr, [{ k: 'med', t: 'Kenarortay', on: (o.on || []).indexOf('med') >= 0 }, { k: 'bis', t: 'Açıortay', on: (o.on || []).indexOf('bis') >= 0 },
        { k: 'perp', t: 'Kenar orta dikme', on: (o.on || []).indexOf('perp') >= 0 }, { k: 'alt', t: 'Yükseklik', on: (o.on || []).indexOf('alt') >= 0 }], function (s) { on = s; draw(); });
      on = tg;
    }
    var bslider = null, hslider = null;
    if (mode === 'area') {
      var base = o.base || 6, hh = o.height || 4;
      bslider = slider(ctr, { label: 'Taban', min: 1, max: 10, step: 1, val: base, unit: ' br' }, function (v) { base = v; draw(); });
      hslider = slider(ctr, { label: 'Yükseklik', min: 1, max: 8, step: 1, val: hh, unit: ' br' }, function (v) { hh = v; draw(); });
    }
    var sb = o.b || 5, sc2 = o.c || 6, sA = o.A || 60;
    if (mode === 'sinarea') {
      slider(ctr, { label: 'b', min: 1, max: 10, step: 1, val: sb }, function (v) { sb = v; draw(); });
      slider(ctr, { label: 'c', min: 1, max: 10, step: 1, val: sc2 }, function (v) { sc2 = v; draw(); });
      slider(ctr, { label: 'A açısı', min: 5, max: 175, step: 5, val: sA, unit: '°' }, function (v) { sA = v; draw(); });
    }
    function draw() {
      g.innerHTML = '';
      var A = P[0], B = P[1], C = P[2];
      if (mode === 'area') {
        var u = 40, ox = 70, oy = 380;
        A = [ox, oy]; B = [ox + base * u, oy]; C = [ox + (o.apex == null ? base * u / 2 : o.apex * u), oy - hh * u];
        for (var gx = 0; gx <= 13; gx++) line(g, ox + gx * u - u, oy + 20, ox + gx * u - u, oy - 9 * u, 'var(--soft)', 1);
        S('path', { d: 'M' + A + 'L' + B + 'L' + C + 'Z', style: 'fill:var(--teal);fill-opacity:.18;stroke:var(--ink);stroke-width:3' }, g);
        var F = [C[0], oy];
        line(g, C[0], C[1], F[0], F[1], 'var(--orange)', 2.5, true);
        if (C[0] > A[0] && C[0] < B[0]) rightMark(g, F, A, C, 12);
        txt(g, (A[0] + B[0]) / 2, oy + 22, 'taban = ' + base, { size: 16, bold: true, fill: 'var(--blue)' });
        txt(g, C[0] + 10, (C[1] + oy) / 2, 'h = ' + hh, { size: 16, bold: true, fill: 'var(--orange)', anchor: 'start' });
        ro.innerHTML = U.inline('Alan $=\\dfrac{\\text{taban}\\cdot h}{2}=\\dfrac{' + base + '\\cdot ' + hh + '}{2}=' + fmt(base * hh / 2, 2).replace(',', '{,}') + '$ birimkare');
        return;
      }
      if (mode === 'sinarea') {
        var u2 = 34, Ax = 70, Ay = 380, rr = sA * Math.PI / 180;
        A = [Ax, Ay]; B = [Ax + sc2 * u2, Ay]; C = [Ax + sb * u2 * Math.cos(rr), Ay - sb * u2 * Math.sin(rr)];
        S('path', { d: 'M' + A + 'L' + B + 'L' + C + 'Z', style: 'fill:var(--teal);fill-opacity:.18;stroke:var(--ink);stroke-width:3' }, g);
        arcMark(g, A, B, C, 34, 'var(--red)', sA + '°');
        var Fh = footPerp(C, A, B);
        line(g, C[0], C[1], Fh[0], Fh[1], 'var(--orange)', 2, true);
        txt(g, (A[0] + B[0]) / 2, Ay + 22, 'c = ' + sc2, { size: 16, bold: true, fill: 'var(--blue)' });
        var mc = mid(A, C); txt(g, mc[0] - 16, mc[1], 'b = ' + sb, { size: 16, bold: true, fill: 'var(--plum)', anchor: 'end' });
        txt(g, A[0] - 12, A[1] + 6, 'A', { size: 18, bold: true }); txt(g, B[0] + 12, B[1] + 6, 'B', { size: 18, bold: true }); txt(g, C[0], C[1] - 14, 'C', { size: 18, bold: true });
        var ar = 0.5 * sb * sc2 * Math.sin(rr);
        ro.innerHTML = U.inline('Yükseklik $h=b\\cdot\\sin A$ olduğu için Alan $=\\tfrac12\\cdot b\\cdot c\\cdot \\sin A=\\tfrac12\\cdot ' + sb + '\\cdot ' + sc2 + '\\cdot\\sin ' + sA + '^\\circ\\approx ' + fmt(ar, 2).replace(',', '{,}') + '$');
        return;
      }
      S('path', { d: 'M' + A + 'L' + B + 'L' + C + 'Z', style: 'fill:var(--teal);fill-opacity:.12;stroke:var(--ink);stroke-width:3;stroke-linejoin:round' }, g);
      var nm = o.names || ['A', 'B', 'C'], cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      [A, B, C].forEach(function (p, i) { var dx = p[0] - cen[0], dy = p[1] - cen[1], l = Math.hypot(dx, dy) || 1; txt(g, p[0] + dx / l * 22, p[1] + dy / l * 22, nm[i], { size: 19, bold: true }); });
      var a = D(B, C), b = D(A, C), c = D(A, B), unit = o.unit || 40;
      var lines = [];
      if (mode === 'centers') {
        if (on.med) {
          var Ma = mid(B, C), Mb = mid(A, C), Mc = mid(A, B), G = cen;
          line(g, A[0], A[1], Ma[0], Ma[1], 'var(--blue)', 2.2); line(g, B[0], B[1], Mb[0], Mb[1], 'var(--blue)', 2.2); line(g, C[0], C[1], Mc[0], Mc[1], 'var(--blue)', 2.2);
          [Ma, Mb, Mc].forEach(function (m) { S('circle', { cx: m[0], cy: m[1], r: 4, style: 'fill:var(--blue)' }, g); });
          S('circle', { cx: G[0], cy: G[1], r: 7, style: 'fill:var(--blue);stroke:var(--ink);stroke-width:2' }, g); txt(g, G[0] + 12, G[1] - 10, 'G', { size: 16, bold: true, fill: 'var(--blue)' });
          lines.push('**Kenarortaylar** tek noktada kesişir: ağırlık merkezi $G$. $|AG| = 2\\,|GD|$ (köşeye uzaklık, kenara uzaklığın 2 katı): ' + fmt(D(A, G) / unit, 2) + ' ve ' + fmt(D(G, Ma) / unit, 2) + '.');
        }
        if (on.bis) {
          var I = [(a * A[0] + b * B[0] + c * C[0]) / (a + b + c), (a * A[1] + b * B[1] + c * C[1]) / (a + b + c)];
          var s = (a + b + c) / 2, area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))), r = area / s;
          [[A, B, C, a, b, c], [B, C, A, b, c, a], [C, A, B, c, a, b]].forEach(function (t) {
            /* aciortay ayagi: karsi kenari komsu kenarlar oraninda boler */
            var P0 = t[0], P1 = t[1], P2 = t[2], l1 = D(P0, P1), l2 = D(P0, P2), Fx = [(P1[0] * l2 + P2[0] * l1) / (l1 + l2), (P1[1] * l2 + P2[1] * l1) / (l1 + l2)];
            line(g, P0[0], P0[1], Fx[0], Fx[1], 'var(--plum)', 2.2);
          });
          S('circle', { cx: I[0], cy: I[1], r: r, style: 'fill:none;stroke:var(--plum);stroke-width:2;stroke-dasharray:5 4' }, g);
          S('circle', { cx: I[0], cy: I[1], r: 6, style: 'fill:var(--plum);stroke:var(--ink);stroke-width:2' }, g); txt(g, I[0] + 12, I[1] + 12, 'I', { size: 16, bold: true, fill: 'var(--plum)' });
          lines.push('**Açıortaylar** iç teğet çemberin merkezi $I$\'da kesişir; $I$ üç kenara eşit uzaklıktadır ($r\\approx ' + fmt(r / unit, 2).replace(',', '{,}') + '$).');
        }
        if (on.perp) {
          var O = circum(A, B, C), R = D(O, A);
          [[A, B], [B, C], [C, A]].forEach(function (e) {
            var m = mid(e[0], e[1]), dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
            line(g, m[0] - nx * 600, m[1] - ny * 600, m[0] + nx * 600, m[1] + ny * 600, 'var(--orange)', 1.8, true);
            rightMark(g, m, e[1], [m[0] + nx * 30, m[1] + ny * 30], 9);
          });
          S('circle', { cx: O[0], cy: O[1], r: R, style: 'fill:none;stroke:var(--orange);stroke-width:2' }, g);
          S('circle', { cx: O[0], cy: O[1], r: 6, style: 'fill:var(--orange);stroke:var(--ink);stroke-width:2' }, g); txt(g, O[0] + 12, O[1] - 12, 'O', { size: 16, bold: true, fill: 'var(--orange)' });
          lines.push('**Kenar orta dikmeler** çevrel çemberin merkezi $O$\'da kesişir; $O$ üç köşeye eşit uzaklıktadır ($R\\approx ' + fmt(R / unit, 2).replace(',', '{,}') + '$).');
        }
        if (on.alt) {
          var Ha = footPerp(A, B, C), Hb = footPerp(B, A, C), Hc = footPerp(C, A, B);
          [[A, Ha, B, C], [B, Hb, A, C], [C, Hc, A, B]].forEach(function (t) {
            line(g, t[0][0], t[0][1], t[1][0], t[1][1], 'var(--red)', 2.2);
            var e1 = t[2], e2 = t[3];
            var tt = ((t[1][0] - e1[0]) * (e2[0] - e1[0]) + (t[1][1] - e1[1]) * (e2[1] - e1[1])) / Math.pow(D(e1, e2), 2);
            if (tt < 0 || tt > 1) { var nearer = tt < 0 ? e1 : e2; line(g, nearer[0], nearer[1], t[1][0], t[1][1], 'var(--red)', 1.4, true); }
            rightMark(g, t[1], t[0], Math.abs(D(t[1], e1)) > 2 ? e1 : e2, 10);
          });
          var x1 = A[0], y1 = A[1];
          var Hx = (function () { var d1 = [Ha[0] - A[0], Ha[1] - A[1]], d2 = [Hb[0] - B[0], Hb[1] - B[1]], den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-9) return null; var t = ((B[0] - x1) * d2[1] - (B[1] - y1) * d2[0]) / den; return [x1 + t * d1[0], y1 + t * d1[1]]; })();
          if (Hx) { S('circle', { cx: Hx[0], cy: Hx[1], r: 6, style: 'fill:var(--red);stroke:var(--ink);stroke-width:2' }, g); txt(g, Hx[0] - 12, Hx[1] - 12, 'H', { size: 16, bold: true, fill: 'var(--red)' }); }
          lines.push('**Yükseklikler** (veya uzantıları) diklik merkezi $H$\'de kesişir. Yükseklik, köşeden karşı kenara inilen dikmedir.');
        }
        if (!lines.length) lines.push('Bir düğmeye dokun. Köşeleri sürükleyerek üçgeni değiştir.');
        ro.innerHTML = lines.map(function (l) { return '<div style="margin:3px 0">' + U.inline(l) + '</div>'; }).join('');
      } else if (mode === 'law') {
        var Aa = ang(B, A, C), Bb = ang(A, B, C), Cc = ang(A, C, B);
        arcMark(g, A, B, C, 30, 'var(--red)', fmt(Aa, 0) + '°'); arcMark(g, B, C, A, 30, 'var(--red)', fmt(Bb, 0) + '°'); arcMark(g, C, A, B, 30, 'var(--red)', fmt(Cc, 0) + '°');
        var ma = mid(B, C), mb = mid(A, C), mc = mid(A, B);
        txt(g, ma[0] + 16, ma[1], 'a=' + fmt(a / unit, 1), { size: 15, bold: true, fill: 'var(--blue)', anchor: 'start' });
        txt(g, mb[0] - 16, mb[1], 'b=' + fmt(b / unit, 1), { size: 15, bold: true, fill: 'var(--blue)', anchor: 'end' });
        txt(g, mc[0], mc[1] + 20, 'c=' + fmt(c / unit, 1), { size: 15, bold: true, fill: 'var(--blue)' });
        var r1 = a / unit / Math.sin(Aa * Math.PI / 180), r2 = b / unit / Math.sin(Bb * Math.PI / 180), r3 = c / unit / Math.sin(Cc * Math.PI / 180);
        var cosA = Math.cos(Aa * Math.PI / 180), lhs = Math.pow(a / unit, 2), rhs = Math.pow(b / unit, 2) + Math.pow(c / unit, 2) - 2 * (b / unit) * (c / unit) * cosA;
        if (o.law === 'cos') ro.innerHTML = U.inline('Kosinüs teoremi: $a^2=b^2+c^2-2bc\\cos A$<br>$' + fmt(lhs, 2).replace(',', '{,}') + '\\approx ' + fmt(rhs, 2).replace(',', '{,}') + '$');
        else ro.innerHTML = U.inline('Sinüs teoremi: $\\dfrac{a}{\\sin A}=\\dfrac{b}{\\sin B}=\\dfrac{c}{\\sin C}$<br>$' + [r1, r2, r3].map(function (v) { return fmt(v, 2).replace(',', '{,}'); }).join('\\approx ') + '$  (hepsi eşit = $2R$)');
      }
    }
    if (mode === 'centers' || mode === 'law') {
      var drag = -1;
      var evp = function (e) { var r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * Wd / r.width, (e.clientY - r.top) * Ht / r.height]; };
      svg.addEventListener('pointerdown', function (e) { var p = evp(e); drag = -1; P.forEach(function (q, i) { if (D(q, p) < 34) drag = i; }); if (drag >= 0) { svg.setPointerCapture(e.pointerId); e.preventDefault(); } });
      svg.addEventListener('pointermove', function (e) { if (drag < 0) return; var p = evp(e); P[drag] = [Math.max(30, Math.min(Wd - 30, p[0])), Math.max(30, Math.min(Ht - 30, p[1]))]; draw(); });
      svg.addEventListener('pointerup', function () { drag = -1; });
      ctr.appendChild(h('p', { class: 'muted small', style: 'margin:0', text: 'Köşeleri parmağınla sürükle.' }));
    }
    draw();
  };

  /* ============================================================ birim cember */
  W.unitcircle = function (el, o) {
    var Wd = 560, Ht = 420, cx = 280, cy = 250, R = 180, a = o.angle == null ? 30 : o.angle, snap = o.snap !== false;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    var special = [0, 30, 45, 60, 90, 120, 135, 150, 180];
    var exact = { 0: ['0', '1', '0'], 30: ['\\tfrac12', '\\tfrac{\\sqrt3}{2}', '\\tfrac{\\sqrt3}{3}'], 45: ['\\tfrac{\\sqrt2}{2}', '\\tfrac{\\sqrt2}{2}', '1'], 60: ['\\tfrac{\\sqrt3}{2}', '\\tfrac12', '\\sqrt3'],
      90: ['1', '0', '\\text{tanımsız}'], 120: ['\\tfrac{\\sqrt3}{2}', '-\\tfrac12', '-\\sqrt3'], 135: ['\\tfrac{\\sqrt2}{2}', '-\\tfrac{\\sqrt2}{2}', '-1'], 150: ['\\tfrac12', '-\\tfrac{\\sqrt3}{2}', '-\\tfrac{\\sqrt3}{3}'], 180: ['0', '-1', '0'] };
    function draw() {
      g.innerHTML = '';
      line(g, cx - R - 30, cy, cx + R + 30, cy, 'var(--ink)', 2); line(g, cx, cy + 40, cx, cy - R - 30, 'var(--ink)', 2);
      S('path', { d: 'M' + (cx - R) + ' ' + cy + 'A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy, style: 'fill:none;stroke:var(--ink);stroke-width:2.5' }, g);
      S('path', { d: 'M' + (cx - R) + ' ' + cy + 'A' + R + ' ' + R + ' 0 0 0 ' + (cx + R) + ' ' + cy, style: 'fill:none;stroke:var(--soft);stroke-width:2;stroke-dasharray:4 5' }, g);
      txt(g, cx + R + 8, cy + 16, '1', { size: 13 }); txt(g, cx - R - 8, cy + 16, '−1', { size: 13 }); txt(g, cx - 12, cy - R - 2, '1', { size: 13 });
      var r = a * Math.PI / 180, px = cx + R * Math.cos(r), py = cy - R * Math.sin(r);
      line(g, cx, cy, px, py, 'var(--teal)', 3.5);
      line(g, px, py, px, cy, 'var(--orange)', 3, true);
      line(g, cx, cy, px, cy, 'var(--blue)', 4);
      arcMark(g, [cx, cy], [cx + 50, cy], [px, py], 40, 'var(--red)', a + '°');
      S('circle', { cx: px, cy: py, r: 9, style: 'fill:var(--teal);stroke:var(--ink);stroke-width:2' }, g);
      txt(g, px + (a > 90 ? -14 : 14), py - 14, 'P(cos α, sin α)', { size: 14, bold: true, anchor: a > 90 ? 'end' : 'start' });
      txt(g, (cx + px) / 2, cy + 20, 'cos α', { size: 14, bold: true, fill: 'var(--blue)' });
      txt(g, px + (a > 90 ? -10 : 10), (py + cy) / 2, 'sin α', { size: 14, bold: true, fill: 'var(--orange)', anchor: a > 90 ? 'end' : 'start' });
      var s = Math.sin(r), c = Math.cos(r), ex = exact[a];
      var tn = Math.abs(c) < 1e-9 ? 'tanımsız' : fmt(s / c, 3);
      ro.innerHTML = U.inline('$\\alpha=' + a + '^\\circ$: &nbsp; $\\sin\\alpha' + (ex ? '=' + ex[0] : '') + '\\approx ' + fmt(s, 3).replace(',', '{,}') + '$, &nbsp; $\\cos\\alpha' + (ex ? '=' + ex[1] : '') + '\\approx ' + fmt(c, 3).replace(',', '{,}') + '$, &nbsp; $\\tan\\alpha' + (ex ? '=' + ex[2] : '') + '$' + (ex ? '' : ' ≈ ' + tn));
    }
    slider(ctr, { label: 'Açı α', min: 0, max: o.max || 180, step: snap ? 15 : 1, val: a, unit: '°' }, function (v) { a = v; draw(); });
    if (snap) ctr.appendChild(h('p', { class: 'muted small', style: 'margin:0', text: 'Kaydırıcı 15°\'lik adımlarla gider; 30°, 45°, 60° gibi özel açılarda tam değerler görünür.' }));
    draw();
  };

  /* ============================================================ agac: carpan agaci, sayma, olasilik */
  W.tree = function (el, o) {
    var root = o.root, dir = o.dir || 'down', upto = o.upto == null ? 99 : o.upto;
    function leaves(n, d) { if (!n.c || !n.c.length || d >= upto) return 1; return n.c.reduce(function (s, k) { return s + leaves(k, d + 1); }, 0); }
    function depth(n, d) { if (!n.c || !n.c.length || d >= upto) return d; return Math.max.apply(null, n.c.map(function (k) { return depth(k, d + 1); })); }
    var nl = leaves(root, 0), nd = depth(root, 0);
    var gapL = dir === 'down' ? 74 : 66, gapD = dir === 'down' ? 96 : 190;
    var Wd = dir === 'down' ? Math.max(360, nl * gapL + 40) : (nd + 1) * gapD + 140, Ht = dir === 'down' ? (nd + 1) * gapD + 30 : Math.max(220, nl * gapL + 30);
    var svg = svgRoot(el, Wd, Ht), gE = S('g', {}, svg), gN = S('g', {}, svg), li = 0;
    if (dir === 'down' && Wd > 640) el.style.overflowX = 'auto';
    function place(n, d) {
      var kids = (n.c && d < upto) ? n.c : [];
      if (!kids.length) { n._p = li++; } else { kids.forEach(function (k) { place(k, d + 1); }); n._p = (kids[0]._p + kids[kids.length - 1]._p) / 2; }
      n._d = d;
    }
    place(root, 0);
    function pos(n) { return dir === 'down' ? [20 + gapL / 2 + n._p * gapL, 34 + n._d * gapD] : [60 + n._d * gapD, 20 + gapL / 2 + n._p * gapL]; }
    function drawN(n) {
      var p = pos(n), kids = (n.c && n._d < upto) ? n.c : [];
      kids.forEach(function (k) {
        var q = pos(k);
        line(gE, p[0], p[1], q[0], q[1], 'var(--ink2)', 2);
        if (k.e != null) { var m = mid(p, q); txt(gE, m[0] + (dir === 'down' ? (q[0] < p[0] ? -12 : 12) : 0), m[1] - (dir === 'down' ? 0 : 12), String(k.e), { size: 14, bold: true, fill: 'var(--orange)', anchor: dir === 'down' ? (q[0] < p[0] ? 'end' : q[0] > p[0] ? 'start' : 'middle') : 'middle' }); }
        drawN(k);
      });
      var leaf = !kids.length, hl = n.hl != null ? n.hl : (o.hlLeaves && leaf);
      var label = String(n.t), w = Math.max(48, label.length * 13 + 22);
      S('rect', { x: p[0] - w / 2, y: p[1] - 22, width: w, height: 44, rx: hl && o.circleHl !== false ? 22 : 10, style: 'fill:' + (hl ? 'var(--acc)' : 'var(--card)') + ';stroke:var(--ink);stroke-width:2' }, gN);
      txt(gN, p[0], p[1] + 1, label, { size: 16, bold: true, fill: hl ? '#fff' : 'var(--ink)' });
      if (n.note) txt(gN, p[0] + (dir === 'down' ? 0 : w / 2 + 8), p[1] + (dir === 'down' ? 32 : 0), String(n.note), { size: 13, fill: 'var(--ink2)', anchor: dir === 'down' ? 'middle' : 'start' });
    }
    drawN(root);
  };

  /* ============================================================ modclock: kalan saati */
  W.modclock = function (el, o) {
    var m = o.m || 5, n = o.n == null ? 17 : o.n, Wd = 420, Ht = 400, cx = 210, cy = 200, R = 150, anim = null;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    function posOf(k) { var t = -Math.PI / 2 + 2 * Math.PI * k / m; return [cx + R * Math.cos(t), cy + R * Math.sin(t)]; }
    function draw(step) {
      g.innerHTML = '';
      S('circle', { cx: cx, cy: cy, r: R, style: 'fill:none;stroke:var(--ink);stroke-width:2.5' }, g);
      var cur = step % m, laps = Math.floor(step / m);
      for (var k = 0; k < m; k++) {
        var p = posOf(k), on = k === cur;
        S('circle', { cx: p[0], cy: p[1], r: on ? 24 : 19, style: 'fill:' + (on ? 'var(--acc)' : 'var(--card)') + ';stroke:var(--ink);stroke-width:2' }, g);
        txt(g, p[0], p[1] + 1, String(k), { size: 18, bold: true, fill: on ? '#fff' : 'var(--ink)' });
      }
      txt(g, cx, cy - 14, String(step), { size: 34, hand: true });
      txt(g, cx, cy + 22, laps + ' tur', { size: 16, fill: 'var(--ink2)' });
      ro.innerHTML = U.inline('$' + step + ' = ' + m + '\\cdot ' + laps + ' + ' + cur + '$ &nbsp;→ &nbsp;bölüm $' + laps + '$, kalan $' + cur + '$');
    }
    function run() {
      cancelAnimationFrame(anim); var s = 0, t0 = null, per = Math.max(60, Math.min(260, 3200 / Math.max(1, n)));
      function f(t) { if (!alive(el)) return; if (t0 == null) t0 = t; var k = Math.min(n, Math.floor((t - t0) / per)); if (k !== s) { s = k; draw(s); if (k > 0) K.beep && 0; } if (k < n) anim = requestAnimationFrame(f); }
      draw(0); anim = requestAnimationFrame(f);
    }
    if (o.slider !== false) slider(ctr, { label: 'Sayı', min: 0, max: o.maxN || 60, step: 1, val: n }, function (v) { n = v; cancelAnimationFrame(anim); draw(n); });
    if (o.mslider) slider(ctr, { label: 'Bölen', min: 2, max: 12, step: 1, val: m }, function (v) { m = v; draw(n); });
    ctr.appendChild(h('div', {}, h('button', { class: 'btn sm', type: 'button', text: 'Adım adım say', onclick: run })));
    draw(n);
  };

  /* ============================================================ pascal ucgeni */
  W.pascal = function (el, o) {
    var rows = o.rows || 7, hl = o.hl || [], comb = !!o.comb, Wd = 640, rh = 50, Ht = rows * rh + 30;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr);
    function C(n, k) { var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
    function draw() {
      g.innerHTML = '';
      for (var n = 0; n < rows; n++) {
        txt(g, 22, 30 + n * rh, 'n=' + n, { size: 12, fill: 'var(--ink3)', anchor: 'start' });
        for (var k = 0; k <= n; k++) {
          var x = Wd / 2 + (k - n / 2) * 64, y = 30 + n * rh, on = hl.some(function (p) { return p[0] === n && p[1] === k; });
          S('rect', { x: x - 28, y: y - 18, width: 56, height: 36, rx: 18, style: 'fill:' + (on ? 'var(--yellow)' : 'var(--card)') + ';stroke:var(--ink);stroke-width:1.8' }, g);
          txt(g, x, y + 1, comb ? 'C(' + n + ',' + k + ')' : String(C(n, k)), { size: comb ? 12 : 16, bold: !comb });
        }
      }
    }
    toggles(ctr, [{ k: 'num', t: 'Sayılar', on: !comb }, { k: 'comb', t: 'C(n, r)', on: comb }], function (s) { comb = !!s.comb; draw(); }, false);
    draw();
  };

  /* ============================================================ flow: akis semasi + adim adim iz */
  W.flow = function (el, o) {
    var nodes = o.nodes || [], trace = o.trace || [], step = -1, Wd = 640, bh = 46, gap = 30;
    var Ht = nodes.length * (bh + gap) + 20;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    var idx = {}; nodes.forEach(function (n, i) { idx[n.id] = i; });
    var cx = 260, bw = 330;
    function yOf(i) { return 14 + i * (bh + gap); }
    var defs = S('defs', {}, svg), mk = S('marker', { id: 'arw', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    S('path', { d: 'M0 0L10 5L0 10z', style: 'fill:var(--ink)' }, mk);
    function draw() {
      g.innerHTML = '';
      var cur = step >= 0 && trace[step] ? trace[step].at : null, side = 0;
      nodes.forEach(function (n, i) {
        var y = yOf(i), on = n.id === cur, fill = on ? 'var(--yellow)' : 'var(--card)', k = n.k || 'op';
        if (k === 'start' || k === 'end') S('rect', { x: cx - bw / 2 + 40, y: y, width: bw - 80, height: bh, rx: 23, style: 'fill:' + fill + ';stroke:var(--ink);stroke-width:2' }, g);
        else if (k === 'if') S('path', { d: 'M' + cx + ' ' + (y - 4) + 'L' + (cx + bw / 2) + ' ' + (y + bh / 2) + 'L' + cx + ' ' + (y + bh + 4) + 'L' + (cx - bw / 2) + ' ' + (y + bh / 2) + 'Z', style: 'fill:' + fill + ';stroke:var(--ink);stroke-width:2' }, g);
        else if (k === 'io') S('path', { d: 'M' + (cx - bw / 2 + 18) + ' ' + y + 'H' + (cx + bw / 2) + 'L' + (cx + bw / 2 - 18) + ' ' + (y + bh) + 'H' + (cx - bw / 2) + 'Z', style: 'fill:' + fill + ';stroke:var(--ink);stroke-width:2' }, g);
        else S('rect', { x: cx - bw / 2, y: y, width: bw, height: bh, rx: 6, style: 'fill:' + fill + ';stroke:var(--ink);stroke-width:2' }, g);
        txt(g, cx, y + bh / 2 + 1, n.t, { size: 15 });
        var nx = n.next || (k === 'if' ? n.yes : null), nxi = nx != null ? idx[nx] : (k !== 'end' && k !== 'if' && i < nodes.length - 1 ? i + 1 : null);
        function arrow(ti, lab, dxs) {
          if (ti == null) return;
          if (ti === i + 1) { S('line', { x1: cx, y1: y + bh + (k === 'if' ? 4 : 0), x2: cx, y2: yOf(ti) - 3, 'marker-end': 'url(#arw)', style: 'stroke:var(--ink);stroke-width:2' }, g); if (lab) txt(g, cx + 10, y + bh + 14, lab, { size: 13, anchor: 'start', fill: 'var(--teal)', bold: true }); }
          else {
            side++; var xo = cx + bw / 2 + 22 + side * 16, y2 = yOf(ti) + bh / 2;
            S('path', { d: 'M' + (cx + (k === 'if' ? bw / 2 : bw / 2)) + ' ' + (y + bh / 2) + 'H' + xo + 'V' + y2 + 'H' + (cx + bw / 2 + 2), 'marker-end': 'url(#arw)', style: 'fill:none;stroke:var(--ink);stroke-width:2' }, g);
            if (lab) txt(g, cx + bw / 2 + 8, y + bh / 2 - 10, lab, { size: 13, anchor: 'start', fill: lab === 'Evet' ? 'var(--teal)' : 'var(--red)', bold: true });
          }
        }
        if (k === 'if') { arrow(idx[n.yes], 'Evet'); arrow(idx[n.no], 'Hayır'); }
        else if (k !== 'end') arrow(nxi, null);
      });
      if (step < 0) { ro.innerHTML = U.inline(o.intro || 'Adım düğmesine bas, algoritmayı birlikte çalıştıralım.'); return; }
      var t = trace[step], vars = t.vars || {};
      ro.innerHTML = '<div style="font-family:var(--hand);font-size:1.15rem">Adım ' + (step + 1) + ' / ' + trace.length + '</div>' +
        (Object.keys(vars).length ? '<table class="t" style="margin:6px 0"><tr>' + Object.keys(vars).map(function (k) { return '<th>' + U.esc(k) + '</th>'; }).join('') + '</tr><tr>' + Object.keys(vars).map(function (k) { return '<td>' + U.esc(String(vars[k])) + '</td>'; }).join('') + '</tr></table>' : '') +
        (t.note ? '<div>' + U.inline(t.note) + '</div>' : '') + (t.out != null ? '<div><b>Çıktı:</b> ' + U.inline(String(t.out)) + '</div>' : '');
    }
    var nb = h('button', { class: 'btn sm pri', type: 'button', text: 'Adım' }), rb = h('button', { class: 'btn sm', type: 'button', text: 'Baştan' });
    nb.onclick = function () { if (step < trace.length - 1) { step++; draw(); } nb.disabled = step >= trace.length - 1; };
    rb.onclick = function () { step = -1; nb.disabled = !trace.length; draw(); };
    if (trace.length) ctr.appendChild(h('div', { class: 'row' }, nb, rb));
    draw();
  };

  /* ============================================================ twoway: iki yonlu tablo + kosullu olasilik */
  W.twoway = function (el, o) {
    var rows = o.rows, cols = o.cols, data = o.data, mode = o.mode || 'count', sel = o.sel || null;
    var box = h('div', { class: 'tscroll' }), ctr = h('div', { class: 'ctrls' }); el.appendChild(box); el.appendChild(ctr); var ro = readout(el);
    var rt = data.map(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
    var ct = cols.map(function (_, j) { return data.reduce(function (a, r) { return a + r[j]; }, 0); });
    var T = rt.reduce(function (a, b) { return a + b; }, 0);
    function cell(v, i, j) {
      if (mode === 'count') return String(v);
      if (mode === 'row') return fmt(100 * v / (i < 0 ? T : rt[i]), 1) + '%';
      if (mode === 'col') return fmt(100 * v / (j < 0 ? T : ct[j]), 1) + '%';
      return fmt(100 * v / T, 1) + '%';
    }
    function draw() {
      var hh = '<table class="t"><tr><th>' + U.inline(o.corner || '') + '</th>' + cols.map(function (c) { return '<th>' + U.inline(c) + '</th>'; }).join('') + '<th>Toplam</th></tr>';
      data.forEach(function (r, i) {
        hh += '<tr><th>' + U.inline(rows[i]) + '</th>' + r.map(function (v, j) { var on = sel && sel[0] === i && sel[1] === j; return '<td data-i="' + i + '" data-j="' + j + '" class="' + (on ? 'hl' : '') + '" style="cursor:pointer">' + cell(v, i, j) + '</td>'; }).join('') +
          '<td><b>' + (mode === 'row' ? '100%' : cell(rt[i], i, -1)) + '</b></td></tr>';
      });
      hh += '<tr><th>Toplam</th>' + ct.map(function (v, j) { return '<td><b>' + (mode === 'col' ? '100%' : cell(v, -1, j)) + '</b></td>'; }).join('') + '<td><b>' + (mode === 'count' ? T : '100%') + '</b></td></tr></table>';
      box.innerHTML = hh;
      U.$$('td[data-i]', box).forEach(function (td) { td.onclick = function () { sel = [+td.getAttribute('data-i'), +td.getAttribute('data-j')]; draw(); }; });
      if (sel) {
        var v = data[sel[0]][sel[1]], R = rows[sel[0]], C = cols[sel[1]];
        ro.innerHTML = U.inline('Seçili hücre: **' + R + ' ve ' + C + '** = ' + v + '<br>' +
          '$P(\\text{' + C + '}\\mid \\text{' + R + '})=\\dfrac{' + v + '}{' + rt[sel[0]] + '}\\approx ' + fmt(v / rt[sel[0]], 3).replace(',', '{,}') + '$ (satır toplamına böl)<br>' +
          '$P(\\text{' + R + '}\\mid \\text{' + C + '})=\\dfrac{' + v + '}{' + ct[sel[1]] + '}\\approx ' + fmt(v / ct[sel[1]], 3).replace(',', '{,}') + '$ (sütun toplamına böl)');
      } else ro.innerHTML = U.inline(o.intro || 'Bir hücreye dokun: koşullu oranları görelim.');
    }
    toggles(ctr, [{ k: 'count', t: 'Sayılar', on: mode === 'count' }, { k: 'row', t: 'Satır %', on: mode === 'row' }, { k: 'col', t: 'Sütun %', on: mode === 'col' }, { k: 'all', t: 'Genel %', on: mode === 'all' }],
      function (s, k) { mode = k; draw(); }, false);
    draw();
  };

  /* ============================================================ kimya: formul ayristirma ve atom cizimi */
  var ATOM = { H: ['#ffffff', 9], C: ['#3c3c3c', 14], N: ['#3d7cc9', 14], O: ['#e5383b', 14], F: ['#8bc34a', 12], Cl: ['#43a047', 16], Br: ['#a0522d', 17], I: ['#7b1fa2', 18],
    S: ['#f2c94c', 16], P: ['#ff9800', 16], Na: ['#8e6ccf', 17], K: ['#6a4fb0', 19], Li: ['#c06cbf', 15], Ca: ['#9aa5b1', 18], Mg: ['#7cb342', 16], Al: ['#b0bec5', 16],
    Fe: ['#e07a3f', 17], Cu: ['#c77d3f', 16], Zn: ['#8a9bb0', 16], Ag: ['#c0c0c0', 17], Pb: ['#5f6368', 18], Ba: ['#00897b', 19], Si: ['#d4a373', 16], He: ['#bfe9ff', 11], Ne: ['#ffb3c1', 12], Ar: ['#80deea', 14], Hg: ['#b0b0b0', 17] };
  function parseFormula(f) {
    var s = String(f).replace(/[+\-]$/, '').replace(/\^?\d*[+\-]$/, ''), out = [];
    function grp(str) {
      var res = [], i = 0;
      while (i < str.length) {
        var ch = str[i];
        if (ch === '(') {
          var d = 1, j = i + 1; while (j < str.length && d) { if (str[j] === '(') d++; else if (str[j] === ')') d--; j++; }
          var inner = grp(str.slice(i + 1, j - 1)), m = /^\d+/.exec(str.slice(j)), n = m ? +m[0] : 1;
          for (var r = 0; r < n; r++) res = res.concat(inner);
          i = j + (m ? m[0].length : 0);
        } else if (/[A-Z]/.test(ch)) {
          var mm = /^([A-Z][a-z]?)(\d*)/.exec(str.slice(i)); var cnt = mm[2] ? +mm[2] : 1;
          for (var q = 0; q < cnt; q++) res.push(mm[1]);
          i += mm[0].length;
        } else i++;
      }
      return res;
    }
    out = grp(s.split(/[·.*]/)[0]);
    return out;
  }
  K.parseFormula = parseFormula;
  function drawMolecule(g, f, cx, cy, sc) {
    var atoms = parseFormula(f), n = atoms.length; sc = sc || 1;
    if (!n) return;
    var heavy = atoms.map(function (a, i) { return [a, i]; }).filter(function (x) { return x[0] !== 'H'; });
    var center = heavy.length ? heavy[0][1] : 0;
    var rest = atoms.map(function (a, i) { return i; }).filter(function (i) { return i !== center; });
    var pos = {};
    pos[center] = [cx, cy];
    var ionic = /^(Na|K|Li|Ca|Mg|Ba|Al|Fe|Cu|Zn|Ag|Pb)/.test(f) && !/^(C|N|O|S|P|H)/.test(f) && n > 1;
    var rC = (ATOM[atoms[center]] || ['#999', 15])[1] * sc;
    rest.forEach(function (i, k) {
      var r = (ATOM[atoms[i]] || ['#999', 15])[1] * sc, dist = (rC + r) * (ionic ? 1.02 : 0.82);
      var angle = rest.length === 1 ? 0 : (atoms.length === 3 && atoms[center] === 'O' && rest.every(function (j) { return atoms[j] === 'H'; }) ? (k ? 0.92 : 2.22) - Math.PI / 2 + Math.PI : -Math.PI / 2 + 2 * Math.PI * k / rest.length + (rest.length === 2 ? Math.PI / 2 : 0));
      pos[i] = [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
    });
    var order = atoms.map(function (a, i) { return i; }).sort(function (a, b) { return (a === center) - (b === center); });
    order.forEach(function (i) {
      var a = atoms[i], c = ATOM[a] || ['#999', 15], r = c[1] * sc;
      S('circle', { cx: pos[i][0], cy: pos[i][1], r: r, style: 'fill:' + c[0] + ';stroke:#2d2a26;stroke-width:1.6' }, g);
      txt(g, pos[i][0], pos[i][1] + 1, a, { size: Math.max(9, r * 0.9), bold: true, fill: ['C', 'N', 'O', 'Cl', 'Na', 'K', 'Fe', 'Ba', 'Pb', 'I', 'Br', 'Cu'].indexOf(a) >= 0 ? '#fff' : '#2d2a26' });
    });
  }
  K.drawMolecule = drawMolecule;
  function countAtoms(list) { var c = {}; list.forEach(function (it) { parseFormula(it[0]).forEach(function (a) { c[a] = (c[a] || 0) + it[1]; }); }); return c; }

  W.particles = function (el, o) {
    var before = o.before || [], after = o.after || [], Wd = 680, Ht = 300;
    var svg = svgRoot(el, Wd, Ht), g = S('g', {}, svg), ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    function box(x, list, title) {
      S('rect', { x: x, y: 30, width: 280, height: 250, rx: 16, style: 'fill:var(--card);stroke:var(--ink);stroke-width:2.5' }, g);
      txt(g, x + 140, 16, title, { size: 16, hand: true });
      var items = []; list.forEach(function (it) { for (var k = 0; k < it[1]; k++) items.push(it[0]); });
      var n = items.length, cols = Math.max(1, Math.ceil(Math.sqrt(n * 1.3))), rowsN = Math.ceil(n / cols);
      items.forEach(function (f, i) {
        var cxx = x + 140 + ((i % cols) - (cols - 1) / 2) * (240 / cols), cyy = 155 + (Math.floor(i / cols) - (rowsN - 1) / 2) * (200 / Math.max(rowsN, 1));
        drawMolecule(g, f, cxx, cyy, n > 9 ? 0.75 : 1);
      });
    }
    box(20, before, o.t1 || 'Önce (girenler)');
    S('path', { d: 'M318 155h40', style: 'stroke:var(--ink);stroke-width:4' }, g); S('path', { d: 'M366 155l-12 -8v16z', style: 'fill:var(--ink)' }, g);
    box(380, after, o.t2 || 'Sonra (ürünler)');
    function eq(list) { return list.map(function (it) { return (it[1] > 1 ? it[1] : '') + it[0]; }).join(' + '); }
    var showCount = !!o.count;
    function upd() {
      var html = U.inline('$\\ce{' + eq(before) + ' -> ' + eq(after) + '}$');
      if (showCount) {
        var A = countAtoms(before), B = countAtoms(after), keys = Object.keys(A).concat(Object.keys(B)).filter(function (v, i, a) { return a.indexOf(v) === i; });
        html += '<table class="t" style="margin-top:8px"><tr><th>Atom</th><th>Önce</th><th>Sonra</th></tr>' + keys.map(function (k) { var ok = (A[k] || 0) === (B[k] || 0); return '<tr><th>' + k + '</th><td>' + (A[k] || 0) + '</td><td>' + (B[k] || 0) + '</td></tr>'; }).join('') + '</table>' +
          (keys.every(function (k) { return (A[k] || 0) === (B[k] || 0); }) ? '<div style="margin-top:6px">Her atomdan önce kaç tane varsa sonra da o kadar var: <b>atomlar korunur</b>, yalnız bağlar değişir.</div>' : '');
      }
      ro.innerHTML = html;
    }
    if (o.count !== true) ctr.appendChild(h('div', {}, h('button', { class: 'btn sm', type: 'button', text: 'Atomları say', onclick: function () { showCount = !showCount; this.classList.toggle('pri', showCount); upd(); } })));
    upd();
  };

  /* ============================================================ balance: denklem denklestirme */
  W.balance = function (el, o) {
    var L = o.left || [], R = o.right || [], co = (o.start || L.concat(R).map(function () { return 1; })).slice();
    var eqBox = h('div', { class: 'row', style: 'justify-content:center;font-size:1.15rem;gap:6px' }), tb = h('div'), msg = h('div');
    el.appendChild(eqBox); el.appendChild(tb); el.appendChild(msg);
    var solvedOnce = false;
    function term(i, f) {
      var v = h('span', { class: 'hand', style: 'font-size:1.6rem;min-width:1.2em;text-align:center', text: String(co[i]) });
      var w = h('span', { style: 'display:inline-flex;flex-direction:column;align-items:center;gap:2px' },
        h('button', { class: 'btn sm', type: 'button', style: 'min-height:30px;padding:0 10px', text: '+', onclick: function () { if (co[i] < 12) { co[i]++; upd(); } } }),
        v,
        h('button', { class: 'btn sm', type: 'button', style: 'min-height:30px;padding:0 10px', text: '−', onclick: function () { if (co[i] > 1) { co[i]--; upd(); } } }));
      return h('span', { style: 'display:inline-flex;align-items:center;gap:4px' }, w, h('span', { html: U.tex('\\ce{' + f + '}') }));
    }
    function draw() {
      eqBox.innerHTML = '';
      L.forEach(function (f, i) { if (i) eqBox.appendChild(h('span', { text: '+' })); eqBox.appendChild(term(i, f)); });
      eqBox.appendChild(h('span', { html: U.tex('\\longrightarrow') }));
      R.forEach(function (f, j) { if (j) eqBox.appendChild(h('span', { text: '+' })); eqBox.appendChild(term(L.length + j, f)); });
    }
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    function upd() {
      draw();
      var A = {}, B = {};
      L.forEach(function (f, i) { parseFormula(f).forEach(function (a) { A[a] = (A[a] || 0) + co[i]; }); });
      R.forEach(function (f, j) { parseFormula(f).forEach(function (a) { B[a] = (B[a] || 0) + co[L.length + j]; }); });
      var keys = Object.keys(A).concat(Object.keys(B)).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var ok = keys.every(function (k) { return A[k] === B[k]; });
      tb.innerHTML = '<table class="t" style="margin-top:10px"><tr><th>Atom</th><th>Sol</th><th>Sağ</th><th></th></tr>' +
        keys.map(function (k) { var e = A[k] === B[k]; return '<tr><th>' + k + '</th><td>' + (A[k] || 0) + '</td><td>' + (B[k] || 0) + '</td><td style="color:' + (e ? 'var(--ok)' : 'var(--bad)') + ';font-weight:700">' + (e ? '✓' : '✗') + '</td></tr>'; }).join('') + '</table>';
      var g = co.reduce(function (a, b) { return gcd(a, b); });
      if (ok && g === 1) { msg.innerHTML = '<div class="fb ok"><div class="h">Denkleşti!</div>Her atom iki tarafta eşit. Katsayılar en küçük tam sayılar.</div>'; if (!solvedOnce) { solvedOnce = true; K.beep('ok'); } }
      else if (ok) msg.innerHTML = '<div class="fb hint"><div class="h">Neredeyse</div>Denk ama katsayıları ortak bölenle sadeleştir (en küçük tam sayılar kullanılır).</div>';
      else msg.innerHTML = '<div class="small muted" style="margin-top:6px">Katsayıları +/− ile değiştir. Formüllerin içindeki küçük sayılara dokunulmaz!</div>';
    }
    upd();
  };

  /* ============================================================ gas: piston, gaz yasalari, Graham */
  W.gas = function (el, o) {
    var mode = o.mode || 'free', R = 0.082;
    var cv = h('canvas', { style: 'width:100%;height:auto;display:block;border-radius:12px' }); el.appendChild(cv);
    var ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    var dpr = Math.min(2, window.devicePixelRatio || 1), Wd = 640, Ht = mode === 'graham' ? 220 : 360;
    cv.width = Wd * dpr; cv.height = Ht * dpr; var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var ink = cssVar('--ink', el), acc = cssVar('--acc', el), card = cssVar('--card', el), soft = cssVar('--soft', el), orange = cssVar('--orange', el), teal = cssVar('--teal', el);
    if (mode === 'graham') {
      var g1 = o.g1 || { f: 'NH3', M: 17 }, g2 = o.g2 || { f: 'HCl', M: 36.5 }, t = 0, run = false, raf;
      var v1 = 1 / Math.sqrt(g1.M), v2 = 1 / Math.sqrt(g2.M), L = 540, meet = L * v1 / (v1 + v2);
      function drawG() {
        c.clearRect(0, 0, Wd, Ht);
        c.fillStyle = card; c.strokeStyle = ink; c.lineWidth = 3;
        c.beginPath(); c.roundRect ? c.roundRect(50, 80, L, 60, 30) : c.rect(50, 80, L, 60); c.fill(); c.stroke();
        var d1 = Math.min(meet, t * v1 * 900), d2 = Math.min(L - meet, t * v2 * 900);
        c.fillStyle = 'rgba(61,124,201,.35)'; c.fillRect(56, 86, d1, 48);
        c.fillStyle = 'rgba(67,160,71,.35)'; c.fillRect(50 + L - 6 - d2, 86, d2, 48);
        for (var i = 0; i < 26; i++) { c.fillStyle = '#3d7cc9'; c.beginPath(); c.arc(58 + Math.random() * Math.max(1, d1 - 4), 92 + Math.random() * 36, 3.4, 0, 7); c.fill(); c.fillStyle = '#43a047'; c.beginPath(); c.arc(50 + L - 8 - Math.random() * Math.max(1, d2 - 4), 92 + Math.random() * 36, 3.4, 0, 7); c.fill(); }
        if (d1 >= meet - 1 && d2 >= L - meet - 1) { c.fillStyle = '#ffffff'; c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.ellipse(50 + meet, 110, 10, 30, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = ink; c.font = '15px system-ui'; c.textAlign = 'center'; c.fillText(o.ring || 'beyaz halka', 50 + meet, 165); }
        c.fillStyle = ink; c.font = 'bold 16px system-ui'; c.textAlign = 'left'; c.fillText(g1.f + ' (M=' + String(g1.M).replace('.', ',') + ')', 50, 60);
        c.textAlign = 'right'; c.fillText(g2.f + ' (M=' + String(g2.M).replace('.', ',') + ')', 50 + L, 60);
      }
      function loop() { if (!alive(el) || !run) return; t += 1 / 60; drawG(); if (t * v1 * 900 < meet || t * v2 * 900 < L - meet) raf = requestAnimationFrame(loop); else run = false; }
      ctr.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn sm pri', type: 'button', text: 'Musluğu aç', onclick: function () { t = 0; run = true; cancelAnimationFrame(raf); loop(); } })));
      ro.innerHTML = U.inline('Hafif gaz daha hızlı yayılır: $\\dfrac{v_{1}}{v_{2}}=\\sqrt{\\dfrac{M_{2}}{M_{1}}}=\\sqrt{\\dfrac{' + fmt(g2.M, 1).replace(',', '{,}') + '}{' + fmt(g1.M, 1).replace(',', '{,}') + '}}\\approx ' + fmt(v1 / v2, 2).replace(',', '{,}') + '$. Halka, ağır gazın (' + g2.f + ') tarafına daha yakın oluşur.');
      drawG();
      return;
    }
    var st = { P: o.P || 1, V: o.V || 10, T: o.T || 300, n: o.n || 0.4 };
    function solve() {
      if (mode === 'boyle' || mode === 'gay' || mode === 'free') st.P = st.n * R * st.T / st.V;
      else if (mode === 'charles' || mode === 'avogadro') st.V = st.n * R * st.T / st.P;
    }
    var fixedK = st.n * R * st.T;
    if (mode === 'boyle') st.P = fixedK / st.V;
    var parts = [], NP = 0;
    function syncParticles() {
      var want = Math.max(4, Math.min(140, Math.round(st.n * 110)));
      while (parts.length < want) parts.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6.283 });
      parts.length = want;
    }
    var sl = [];
    function addS(key, label, min, max, step, unit) { sl.push(slider(ctr, { label: label, min: min, max: max, step: step, val: st[key], unit: unit }, function (v) { st[key] = v; solve(); syncParticles(); upd(); })); }
    if (mode === 'boyle') addS('V', 'Hacim V', 2, 20, 1, ' L');
    else if (mode === 'charles') addS('T', 'Sıcaklık T', 100, 600, 10, ' K');
    else if (mode === 'gay') addS('T', 'Sıcaklık T', 100, 600, 10, ' K');
    else if (mode === 'avogadro') addS('n', 'Mol sayısı n', 0.1, 1.2, 0.1, ' mol');
    else { addS('V', 'Hacim V', 2, 20, 1, ' L'); addS('T', 'Sıcaklık T', 100, 600, 10, ' K'); addS('n', 'Mol sayısı n', 0.1, 1.2, 0.1, ' mol'); }
    solve(); syncParticles();
    function upd() {
      var lines = ['$P\\approx ' + fmt(st.P, 2).replace(',', '{,}') + '$ atm', '$V\\approx ' + fmt(st.V, 2).replace(',', '{,}') + '$ L', '$T=' + fmt(st.T, 0) + '$ K', '$n=' + fmt(st.n, 2).replace(',', '{,}') + '$ mol'];
      var law = { boyle: 'Boyle: $T$ ve $n$ sabit → $P\\cdot V$ sabit: $' + fmt(st.P * st.V, 2).replace(',', '{,}') + '$', charles: 'Charles: $P$ ve $n$ sabit → $V/T$ sabit: $' + fmt(st.V / st.T, 4).replace(',', '{,}') + '$',
        gay: 'Gay-Lussac: $V$ ve $n$ sabit → $P/T$ sabit: $' + fmt(st.P / st.T, 4).replace(',', '{,}') + '$', avogadro: 'Avogadro: $P$ ve $T$ sabit → $V/n$ sabit: $' + fmt(st.V / st.n, 2).replace(',', '{,}') + '$', free: '$PV=nRT$, $R\\approx 0{,}082$' }[mode];
      ro.innerHTML = U.inline(lines.join(' &nbsp;·&nbsp; ') + '<br>' + law);
    }
    upd();
    var last = 0, raf2;
    function frame(ts) {
      if (!alive(el)) return;
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      c.clearRect(0, 0, Wd, Ht);
      var bx = 60, by = 40, bw = 300, maxH = 290, hgt = Math.max(30, Math.min(maxH, st.V / 20 * maxH)), top = by + maxH - hgt;
      c.strokeStyle = ink; c.lineWidth = 3; c.fillStyle = card;
      c.beginPath(); c.moveTo(bx, by - 10); c.lineTo(bx, by + maxH); c.lineTo(bx + bw, by + maxH); c.lineTo(bx + bw, by - 10); c.stroke();
      c.fillStyle = 'rgba(42,157,143,.08)'; c.fillRect(bx + 2, top, bw - 4, hgt - 2);
      c.fillStyle = soft; c.fillRect(bx + 3, top - 16, bw - 6, 16); c.strokeRect(bx + 3, top - 16, bw - 6, 16);
      c.fillRect(bx + bw / 2 - 8, by - 30, 16, top - 16 - by + 30); c.strokeRect(bx + bw / 2 - 8, by - 30, 16, top - 16 - by + 30);
      var sp = 0.18 * Math.sqrt(st.T / 300);
      c.fillStyle = orange;
      parts.forEach(function (p) {
        p.x += Math.cos(p.a) * sp * dt * 4; p.y += Math.sin(p.a) * sp * dt * 4 * (maxH / hgt);
        if (p.x < 0) { p.x = -p.x; p.a = Math.PI - p.a; } if (p.x > 1) { p.x = 2 - p.x; p.a = Math.PI - p.a; }
        if (p.y < 0) { p.y = -p.y; p.a = -p.a; } if (p.y > 1) { p.y = 2 - p.y; p.a = -p.a; }
        c.beginPath(); c.arc(bx + 8 + p.x * (bw - 16), top + 6 + p.y * (hgt - 14), 4.2, 0, 6.283); c.fill();
      });
      /* basinc gostergesi */
      var gx = 500, gy = 190, gr = 90, frac = Math.min(1, st.P / (o.Pmax || 5));
      c.lineWidth = 3; c.strokeStyle = ink; c.fillStyle = card; c.beginPath(); c.arc(gx, gy, gr, 0, 6.283); c.fill(); c.stroke();
      for (var k = 0; k <= 10; k++) { var an = Math.PI * 0.75 + k / 10 * Math.PI * 1.5; c.beginPath(); c.moveTo(gx + Math.cos(an) * (gr - 6), gy + Math.sin(an) * (gr - 6)); c.lineTo(gx + Math.cos(an) * (gr - 16), gy + Math.sin(an) * (gr - 16)); c.stroke(); }
      var a2 = Math.PI * 0.75 + frac * Math.PI * 1.5; c.strokeStyle = teal; c.lineWidth = 5; c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.cos(a2) * (gr - 22), gy + Math.sin(a2) * (gr - 22)); c.stroke();
      c.fillStyle = ink; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText(fmt(st.P, 2) + ' atm', gx, gy + 48);
      c.font = '14px system-ui'; c.fillText('basınç', gx, gy - 30);
      c.textAlign = 'left'; c.fillText('T = ' + Math.round(st.T) + ' K', bx, by + maxH + 22);
      raf2 = requestAnimationFrame(frame);
    }
    raf2 = requestAnimationFrame(frame);
  };

  /* ============================================================ beaker: derisim, seyreltme, cozunme, doygunluk */
  W.beaker = function (el, o) {
    var mode = o.mode || 'molarity';
    var cv = h('canvas', { style: 'width:100%;height:auto;display:block' }); el.appendChild(cv);
    var ctr = h('div', { class: 'ctrls' }); el.appendChild(ctr); var ro = readout(el);
    var dpr = Math.min(2, window.devicePixelRatio || 1), Wd = 640, Ht = 340;
    cv.width = Wd * dpr; cv.height = Ht * dpr; var c = cv.getContext('2d'); c.scale(dpr, dpr);
    var ink = cssVar('--ink', el), card = cssVar('--card', el);
    var st = { n: o.n == null ? 0.5 : o.n, V: o.V == null ? 1 : o.V, M1: o.M1 || 2, V1: o.V1 || 0.25, V2: o.V2 || 0.25, add: o.add || 20, T: o.T || 20 };
    var color = o.color || [61, 124, 201];
    var ions = [], stir = 0, t0 = performance.now();
    var solute = o.solute || 'NaCl';
    function beakerPath(x, y, w, hh) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + hh); c.quadraticCurveTo(x, y + hh + 10, x + 10, y + hh + 10); c.lineTo(x + w - 10, y + hh + 10); c.quadraticCurveTo(x + w, y + hh + 10, x + w, y + hh); c.lineTo(x + w, y); }
    function sol(T) { /* cozunurluk egrisi: o.curve = [[T,g],...] */ var cu = o.curve || [[0, 35.7], [20, 36], [40, 36.6], [60, 37.3], [80, 38.4], [100, 39.8]]; for (var i = 0; i < cu.length - 1; i++) if (T <= cu[i + 1][0]) { var a = cu[i], b = cu[i + 1]; return a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]); } return cu[cu.length - 1][1]; }
    if (mode === 'molarity') {
      slider(ctr, { label: 'Çözünen n', min: 0.1, max: 2, step: 0.1, val: st.n, unit: ' mol' }, function (v) { st.n = v; });
      slider(ctr, { label: 'Hacim V', min: 0.2, max: 2, step: 0.1, val: st.V, unit: ' L' }, function (v) { st.V = v; });
    } else if (mode === 'dilution') {
      slider(ctr, { label: 'Su ekle', min: 0, max: 1.75, step: 0.05, val: 0, unit: ' L' }, function (v) { st.V2 = st.V1 + v; });
      st.V2 = st.V1;
    } else if (mode === 'saturation') {
      slider(ctr, { label: 'Eklenen', min: 0, max: o.maxAdd || 60, step: 1, val: st.add, unit: ' g' }, function (v) { st.add = v; });
      slider(ctr, { label: 'Sıcaklık', min: o.Tmin == null ? 0 : o.Tmin, max: o.Tmax || 100, step: 5, val: st.T, unit: ' °C' }, function (v) { st.T = v; });
    } else if (mode === 'dissolve') {
      var lat = []; var NI = solute === 'oil' ? 0 : 16;
      for (var i = 0; i < NI; i++) lat.push({ hx: (i % 4), hy: Math.floor(i / 4), x: 0, y: 0, free: 0, kind: solute === 'NaCl' ? ((i % 4 + Math.floor(i / 4)) % 2 ? 'Cl' : 'Na') : 'sk', a: Math.random() * 6.28 });
      ions = lat;
      ctr.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn sm pri', type: 'button', text: 'Suya at ve karıştır', onclick: function () { stir = performance.now(); } }), h('button', { class: 'btn sm', type: 'button', text: 'Baştan', onclick: function () { stir = 0; ions.forEach(function (p) { p.free = 0; }); } })));
    }
    function frame(ts) {
      if (!alive(el)) return;
      c.clearRect(0, 0, Wd, Ht);
      var bx = 150, by = 40, bw = 300, bh = 260;
      c.lineWidth = 3; c.strokeStyle = ink;
      if (mode === 'molarity' || mode === 'dilution') {
        var V = mode === 'molarity' ? st.V : st.V2, n = mode === 'molarity' ? st.n : st.M1 * st.V1, M = n / V, lev = Math.min(1, V / 2) * bh;
        var alpha = Math.min(0.85, 0.08 + M * 0.22);
        c.fillStyle = 'rgba(' + color.join(',') + ',' + alpha + ')';
        c.fillRect(bx + 2, by + bh - lev, bw - 4, lev + 8);
        beakerPath(bx, by, bw, bh); c.stroke();
        for (var k = 1; k <= 4; k++) { var yy = by + bh - k / 4 * bh; c.beginPath(); c.moveTo(bx, yy); c.lineTo(bx + 18, yy); c.stroke(); c.fillStyle = ink; c.font = '13px system-ui'; c.textAlign = 'left'; c.fillText(String(k / 2).replace('.', ',') + ' L', bx + 22, yy + 4); }
        var dots = Math.round(n * 30);
        c.fillStyle = 'rgba(' + color.join(',') + ',1)';
        for (var d = 0; d < dots; d++) { var rx = (Math.sin(d * 12.9898) * 43758.5453) % 1, ry = (Math.sin(d * 78.233) * 12345.678) % 1; rx = Math.abs(rx); ry = Math.abs(ry); c.beginPath(); c.arc(bx + 12 + rx * (bw - 24), by + bh - lev + 8 + ry * (lev - 12), 3.2, 0, 6.283); c.fill(); }
        ro.innerHTML = U.inline(mode === 'molarity' ? '$M=\\dfrac{n}{V}=\\dfrac{' + fmt(n, 2).replace(',', '{,}') + '\\ \\text{mol}}{' + fmt(V, 2).replace(',', '{,}') + '\\ \\text{L}}=' + fmt(M, 2).replace(',', '{,}') + '\\ \\text{M}$ (mol/L). Renk koyuluğu derişimi gösterir.'
          : 'Su eklenince mol sayısı değişmez: $n=M_1V_1=' + fmt(n, 2).replace(',', '{,}') + '$ mol. $M_2=\\dfrac{M_1V_1}{V_2}=\\dfrac{' + fmt(n, 2).replace(',', '{,}') + '}{' + fmt(V, 2).replace(',', '{,}') + '}=' + fmt(M, 2).replace(',', '{,}') + '\\ \\text{M}$');
      } else if (mode === 'saturation') {
        var S0 = sol(st.T) * (o.water || 100) / 100, dis = Math.min(st.add, S0), ex = Math.max(0, st.add - S0);
        c.fillStyle = 'rgba(' + color.join(',') + ',' + (0.08 + 0.5 * dis / Math.max(S0, 1)) + ')'; c.fillRect(bx + 2, by + 60, bw - 4, bh - 52);
        if (ex > 0) { c.fillStyle = '#f4f1ea'; c.strokeStyle = ink; c.lineWidth = 1.5; var hh2 = Math.min(70, 4 + ex * 1.5); c.beginPath(); c.moveTo(bx + 4, by + bh + 8); c.quadraticCurveTo(bx + bw / 2, by + bh + 8 - hh2 * 2, bx + bw - 4, by + bh + 8); c.fill(); c.stroke(); c.lineWidth = 3; c.strokeStyle = ink; }
        beakerPath(bx, by, bw, bh); c.stroke();
        var state = ex > 0 ? 'doymuş (dipte çözünmemiş katı var)' : (Math.abs(dis - S0) < 0.5 ? 'tam doymuş' : 'doymamış');
        ro.innerHTML = U.inline((o.name || 'Tuz') + ' çözünürlüğü ' + st.T + ' °C\'de ≈ ' + fmt(sol(st.T), 1) + ' g / 100 g su. Eklenen: ' + st.add + ' g → **' + state + '**' + (ex > 0 ? ', dipte ≈ ' + fmt(ex, 1) + ' g kalır.' : '.'));
      } else if (mode === 'dissolve') {
        c.fillStyle = 'rgba(61,124,201,.10)'; c.fillRect(bx + 2, by + 40, bw - 4, bh - 32);
        beakerPath(bx, by, bw, bh); c.stroke();
        var el2 = stir ? (ts - stir) / 1000 : 0;
        if (solute === 'oil') {
          var oh = Math.min(40, el2 * 20 + 20);
          c.fillStyle = 'rgba(242,201,76,.85)'; c.fillRect(bx + 2, by + 40, bw - 4, oh); c.strokeStyle = ink; c.lineWidth = 1.5; c.strokeRect(bx + 2, by + 40, bw - 4, oh); c.lineWidth = 3;
          ro.innerHTML = U.inline(o.say || 'Yağ apolar, su polar: karışmazlar. Yağ üstte ayrı bir katman olarak kalır ("benzer benzeri çözer").');
        } else {
          ions.forEach(function (p, i) {
            var hx = bx + bw / 2 - 45 + p.hx * 30, hy = by + bh - 100 + p.hy * 26;
            if (stir && el2 > 0.4 + (i % 7) * 0.25) p.free = Math.min(1, p.free + 0.012);
            p.a += 0.03;
            var tx = bx + 30 + ((i * 53) % (bw - 60)), ty = by + 70 + ((i * 37) % (bh - 110));
            var x = hx + (tx - hx) * p.free + Math.cos(p.a + i) * 4 * p.free, y = hy + (ty - hy) * p.free + Math.sin(p.a * 1.3 + i) * 4 * p.free;
            if (p.free > 0.3) { c.fillStyle = 'rgba(61,124,201,.55)'; for (var w = 0; w < 4; w++) { var aw = w * 1.57 + p.a; c.beginPath(); c.arc(x + Math.cos(aw) * 17, y + Math.sin(aw) * 17, 4.5, 0, 6.283); c.fill(); } }
            if (p.kind === 'sk') { c.fillStyle = '#f2e6c9'; c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 13, 9, 0.3, 0, 6.283); c.fill(); c.stroke(); }
            else { c.fillStyle = p.kind === 'Na' ? '#8e6ccf' : '#43a047'; c.beginPath(); c.arc(x, y, p.kind === 'Na' ? 9 : 12, 0, 6.283); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 10px system-ui'; c.textAlign = 'center'; c.fillText(p.kind === 'Na' ? 'Na⁺' : 'Cl⁻', x, y + 3); }
          });
          c.lineWidth = 3;
          ro.innerHTML = U.inline(o.say || (solute === 'NaCl' ? 'İyonik katı: su molekülleri iyonları çekip birbirinden ayırır, her iyonun etrafını sarar (**iyonik çözünme**). Çözelti elektriği iletir.' : 'Moleküler katı (şeker): moleküller birbirinden ayrılır ama bölünmez (**moleküler çözünme**). İyon oluşmaz, elektriği iletmez.'));
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };


  /* ============================================================ dots: dikdortgen dizilimler (bolen ciftleri) */
  W.dots = function (el, o) {
    var n = o.n || 12, box = h('div'), ctr = h('div', { class: 'ctrls' }); el.appendChild(box); el.appendChild(ctr); var ro = readout(el);
    function draw() {
      box.innerHTML = '';
      var pairs = [], a, divs = [];
      for (a = 1; a <= n; a++) if (n % a === 0) divs.push(a);
      for (a = 1; a * a <= n; a++) if (n % a === 0) pairs.push([a, n / a]);
      var Wd = 420, y = 10, parts = [];
      pairs.forEach(function (p) {
        var rows = p[0], cols = p[1], sp = Math.min(30, (Wd - 96) / cols), r = Math.max(2.6, sp * 0.38);
        parts.push({ rows: rows, cols: cols, sp: sp, r: r, y: y });
        y += rows * sp + 34;
      });
      var svg = svgRoot(box, Wd, y), cols3 = ['var(--teal)', 'var(--orange)', 'var(--blue)', 'var(--plum)', 'var(--red)', 'var(--green)'];
      parts.forEach(function (q, i) {
        txt(svg, 4, q.y + q.rows * q.sp / 2 + 2, q.rows + '×' + q.cols, { anchor: 'start', size: 15, bold: true, fill: cols3[i % 6] });
        for (var rr = 0; rr < q.rows; rr++) for (var cc = 0; cc < q.cols; cc++)
          S('circle', { cx: 86 + cc * q.sp + q.sp / 2, cy: q.y + rr * q.sp + q.sp / 2, r: q.r, style: 'fill:' + cols3[i % 6] + ';fill-opacity:.75;stroke:var(--ink);stroke-width:1' }, svg);
      });
      ro.innerHTML = U.inline('$' + n + '$ taşın dikdörtgen dizilişleri: **' + pairs.length + '** farklı düzen. Pozitif bölenler: ' + divs.join(', ') + ' (**' + divs.length + '** tane)' + (divs.length === 2 ? ' → yalnızca 1 × ' + n + ' dizilebiliyor: **asal sayı!**' : n === 1 ? '' : ''));
    }
    if (o.slider !== false) slider(ctr, { label: 'Taş sayısı', min: o.min || 2, max: o.max || 36, step: 1, val: n }, function (v) { n = v; draw(); });
    draw();
  };

  /* ============================================================ poem: hece, durak, kafiye-redif */
  var VOW = 'aeıioöuüâîûAEIİOÖUÜÂÎÛ';
  function syllabify(word) {
    var w = word, vi = [], i;
    for (i = 0; i < w.length; i++) if (VOW.indexOf(w[i]) >= 0) vi.push(i);
    if (vi.length <= 1) return [w];
    var cuts = [];
    for (i = 0; i < vi.length - 1; i++) {
      var a = vi[i], b = vi[i + 1], between = [];
      for (var j = a + 1; j < b; j++) if (/[a-zA-ZçğışöüÇĞİŞÖÜâîûÂÎÛ]/.test(w[j])) between.push(j);
      if (!between.length) cuts.push(b);
      else cuts.push(between[between.length - 1]);
    }
    var out = [], prev = 0;
    cuts.forEach(function (cpos) { out.push(w.slice(prev, cpos)); prev = cpos; });
    out.push(w.slice(prev));
    return out;
  }
  K.syllabify = syllabify;
  function lineSyl(line) {
    return line.split(/\s+/).filter(Boolean).map(function (wd) {
      var core = wd.replace(/[^a-zA-ZçğışöüÇĞİŞÖÜâîûÂÎÛ'’]/g, '');
      return { w: wd, s: core ? syllabify(core.replace(/['’]/g, '')) : [] };
    });
  }
  W.poem = function (el, o) {
    var lines = o.lines || [], mode = o.mode || 'plain';
    var box = h('div', { class: 'poem' }); el.appendChild(box);
    var ctr = h('div'); el.appendChild(ctr);
    var avail = [{ k: 'plain', t: 'Metin' }];
    if (o.hece !== false) avail.push({ k: 'hece', t: 'Hece say' });
    if (o.rhyme) avail.push({ k: 'kafiye', t: 'Kafiye · redif' });
    function draw() {
      box.innerHTML = '';
      if (o.title) box.appendChild(h('div', { class: 'pt', text: o.title }));
      if (o.author) box.appendChild(h('div', { class: 'pa', text: o.author }));
      var stz = h('div', { class: 'stz' }), li = 0, durakAt = o.olcu ? o.olcu.split('+').map(Number) : null;
      lines.forEach(function (ln, idx) {
        if (ln === '') { box.appendChild(stz); stz = h('div', { class: 'stz' }); return; }
        var row = h('div', { class: 'ln' }), tx = h('div', { class: 'tx' }), cnt = h('div', { class: 'cnt' });
        if (mode === 'hece') {
          var ws = lineSyl(ln), total = 0, marks = [], acc2 = 0;
          if (durakAt) durakAt.slice(0, -1).forEach(function (d) { acc2 += d; marks.push(acc2); });
          ws.forEach(function (wd, wi) {
            var wEl = h('span');
            if (!wd.s.length) wEl.appendChild(document.createTextNode(wd.w));
            wd.s.forEach(function (sy) { total++; wEl.appendChild(h('span', { class: 'hc', text: sy })); });
            tx.appendChild(wEl);
            if (marks.indexOf(total) >= 0 && wi < ws.length - 1) tx.appendChild(h('span', { class: 'durak', text: '/' }));
            else tx.appendChild(document.createTextNode(' '));
          });
          cnt.textContent = total;
        } else if (mode === 'kafiye') {
          var r = (o.rhyme || [])[li] || {}, k = r.k || '', rd = r.r || '', end = (k + rd);
          var pos = end ? ln.toLocaleLowerCase('tr-TR').lastIndexOf(end.toLocaleLowerCase('tr-TR')) : -1;
          if (pos >= 0) {
            tx.appendChild(document.createTextNode(ln.slice(0, pos)));
            if (k) tx.appendChild(h('span', { class: 'rk', text: ln.slice(pos, pos + k.length) }));
            if (rd) tx.appendChild(h('span', { class: 'rr', text: ln.slice(pos + k.length, pos + k.length + rd.length) }));
            tx.appendChild(document.createTextNode(ln.slice(pos + end.length)));
          } else tx.textContent = ln;
          cnt.textContent = (o.scheme || [])[li] || '';
        } else { tx.textContent = ln; cnt.textContent = (o.scheme && o.showScheme) ? o.scheme[li] || '' : ''; }
        row.appendChild(tx); row.appendChild(cnt); stz.appendChild(row); li++;
      });
      box.appendChild(stz);
      if (mode === 'hece') box.appendChild(h('div', { class: 'legend' }, h('span', { html: 'Her hece altı çizgili parça; sağdaki sayı dizedeki hece sayısı.' + (o.olcu ? ' <b style="color:var(--orange)">/</b> = durak (' + o.olcu + ')' : '') })));
      if (mode === 'kafiye') box.appendChild(h('div', { class: 'legend' }, h('span', {}, h('i', { style: 'background:rgba(242,201,76,.8)' }), 'kafiye (ses benzerliği)'), h('span', {}, h('i', { style: 'background:rgba(42,157,143,.45)' }), 'redif (aynen tekrar eden ek/sözcük)'), o.scheme ? h('span', { text: 'sağda: kafiye şeması' }) : null));
    }
    if (avail.length > 1 && o.toggle !== false) toggles(ctr, avail.map(function (a) { a.on = a.k === mode; return a; }), function (s, k) { mode = k; draw(); }, false);
    draw();
  };
})();
