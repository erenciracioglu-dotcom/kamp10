/* Kamp ders motoru - cekirdek.
   Veri: window.KURS (veri/kurs.js), window.DERS[id] (veri/ders-<id>.js), window.AUDIO[id] (veri/ses-<id>.js),
   window.DENEME[id] (veri/deneme-<id>.js), window.TASLAR + window.YETENEK + window.DIZIN (motor/oyun-veri.js).
   Ilerleme: localStorage 'kamp1:<ders>' (ders basina) ve 'kamp1:oyuncu' (XP, gucler, seri: uc ders ortak).
   Calisir: file://, yerel sunucu, GitHub Pages. Disaridan hicbir sey yuklemez. */
(function () {
  'use strict';
  var K = window.KAMP = window.KAMP || {};
  K.widgets = K.widgets || {};
  var KURS = window.KURS || { id: 'x', name: 'Ders', themes: [], lessons: {} };
  var TASLAR = window.TASLAR || {}, YETENEK = window.YETENEK || [], DIZIN = window.DIZIN || {};
  document.documentElement.setAttribute('data-course', KURS.id);

  /* ------------------------------------------------------------ yardimcilar */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function h(tag, a) {
    var el = document.createElement(tag), k, i;
    a = a || {};
    for (k in a) {
      if (!a.hasOwnProperty(k) || a[k] == null || a[k] === false) continue;
      var v = a[k];
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function tex(s, display) {
    if (!window.katex) return esc(s);
    try { return katex.renderToString(s, { throwOnError: false, displayMode: !!display, strict: 'ignore', output: 'html' }); }
    catch (e) { return '<code>' + esc(s) + '</code>'; }
  }
  /* satir ici bicim: $..$ $$..$$ **kalin** *italik* ==isaret== __alti__ ; \$ = dolar isareti */
  function inline(s) {
    var keep = [];
    s = String(s).replace(/\\\$/g, '\u0001');
    s = s.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, function (m, d, i) {
      keep.push(d != null ? tex(d, true) : tex(i, false));
      return '\u0000' + (keep.length - 1) + '\u0000';
    });
    s = esc(s)
      .replace(/\*\*([^*]+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\w)/g, '$1<i>$2</i>')
      .replace(/==([^=]+?)==/g, '<mark>$1</mark>')
      .replace(/__([^_]+?)__/g, '<u>$1</u>')
      .replace(/\u0001/g, '$');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, n) { return keep[+n]; });
  }
  function md(src) {
    if (src == null) return '';
    if (Array.isArray(src)) src = src.join('\n');
    var blocks = String(src).replace(/\r/g, '').split(/\n\s*\n/);
    return blocks.map(function (b) {
      var lines = b.split('\n').filter(function (l) { return l.trim() !== ''; });
      if (!lines.length) return '';
      if (lines.every(function (l) { return /^\s*[-•]\s+/.test(l); }))
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>'; }).join('') + '</ul>';
      if (lines.every(function (l) { return /^\s*\d+[.)]\s+/.test(l); }))
        return '<ol>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>'; }).join('') + '</ol>';
      return '<p>' + lines.map(inline).join('<br>') + '</p>';
    }).join('');
  }
  function mdEl(tag, src, cls) { return h(tag, { class: 'md ' + (cls || ''), html: md(src) }); }
  function inl(tag, src, cls) { return h(tag, { class: cls || '', html: inline(src == null ? '' : src) }); }
  function shuffle(a, seed) {
    a = a.slice(); var s = seed || 7, i, j, t;
    for (i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; j = Math.floor(s / 233280 * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function hashStr(s) { var x = 0, i; s = String(s); for (i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return Math.abs(x) + 1; }
  function trLower(s) { return String(s).toLocaleLowerCase('tr-TR'); }
  function norm(s) {
    return trLower(s).replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
      .replace(/[.,;:!?'"’‘“”()\[\]{}«»\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function parseNum(s) {
    s = String(s).trim().replace(/\s/g, '').replace(',', '.');
    if (/^[-+]?\d+(\.\d+)?\/[-+]?\d+(\.\d+)?$/.test(s)) { var p = s.split('/'); return parseFloat(p[0]) / parseFloat(p[1]); }
    if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return parseFloat(s);
    return NaN;
  }
  function fmtNum(x, d) { var r = Math.round(x * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d); return String(r).replace('.', ','); }
  function dayNum(ts) { var d = new Date(ts == null ? Date.now() : ts); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  K.util = { h: h, add: add, esc: esc, tex: tex, md: md, inline: inline, mdEl: mdEl, inl: inl, shuffle: shuffle, norm: norm, parseNum: parseNum, fmt: fmtNum, $: $, $$: $$ };

  /* ------------------------------------------------------------ kayit */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  function fixP(p) {
    p = p && typeof p === 'object' ? p : {};
    ['done', 'beat', 'prac', 'teach', 'exam', 'open', 'stone', 'taze'].forEach(function (k) { if (!p[k] || typeof p[k] !== 'object') p[k] = {}; });
    return p;
  }
  var SKEY = 'kamp1:' + KURS.id;
  var P = fixP(store.get(SKEY, {}));
  function save() { store.set(SKEY, P); }
  function courseP(c) { return c === KURS.id ? P : fixP(store.get('kamp1:' + c, {})); }

  var OKEY = 'kamp1:oyuncu';
  var O = store.get(OKEY, null) || {};
  if (typeof O.xp !== 'number') O.xp = 0;
  if (!O.pw) O.pw = { kedi: 2, fisilti: 2, sans: 1, kalkan: 1, kazma: 0 };
  ['kedi', 'fisilti', 'sans', 'kalkan', 'kazma'].forEach(function (k) { if (typeof O.pw[k] !== 'number') O.pw[k] = 0; });
  if (!O.granted) O.granted = {};
  if (!Array.isArray(O.days)) O.days = [];
  if (!Array.isArray(O.shield)) O.shield = [];
  if (!O.lvl) O.lvl = 1;
  function saveO() { store.set(OKEY, O); }

  var S = store.get('kamp1:ayar', null) || {};
  if (S.speed == null) S.speed = 1;
  if (S.auto == null) S.auto = true;
  if (S.subs == null) S.subs = true;
  if (S.sound == null) S.sound = true;
  if (!S.theme) S.theme = 'auto';
  function saveS() { store.set('kamp1:ayar', S); applyTheme(); }
  function applyTheme() {
    if (S.theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', S.theme);
  }
  applyTheme();

  /* ------------------------------------------------------------ ses efektleri */
  var actx = null;
  function beep(kind) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var notes = kind === 'ok' ? [660, 880] : kind === 'bad' ? [220, 180] : kind === 'win' ? [523, 659, 784, 1046] : kind === 'magic' ? [784, 988, 1175, 1568] : [440];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + i * 0.11;
        o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.05 : 0.12, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.2);
      });
    } catch (e) { }
  }
  K.beep = beep;

  /* ------------------------------------------------------------ simgeler */
  var IC = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    replay: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
    gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 9h20M9 3l3 18M15 3l-3 18" stroke="currentColor" stroke-width="1.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    tree: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="5" cy="19" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="19" cy="19" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7.6v4.4M12 12l-5.6 4.6M12 12l5.6 4.6" stroke="currentColor" stroke-width="2"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  K.IC = IC;
  function icon(n) { return h('span', { html: IC[n], style: 'display:inline-flex' }); }
  K.avatar = function (who) {
    if (who === 'pofuduk') return '<svg class="av" viewBox="0 0 64 64"><path d="M8 58c2-14 10-22 24-22s22 8 24 22z" fill="#b9864f" stroke="#2d2a26" stroke-width="2"/>' +
      '<path d="M12 44l-6 6 9-1-5 7 10-4M52 44l6 6-9-1 5 7-10-4" fill="#d9b48a" stroke="#2d2a26" stroke-width="1.6"/>' +
      '<path d="M14 30L12 8l14 10M50 30l2-22-14 10" fill="#a87443" stroke="#2d2a26" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="32" cy="32" rx="20" ry="17" fill="#c08a52" stroke="#2d2a26" stroke-width="2"/>' +
      '<path d="M24 18l3 8M32 16v9M40 18l-3 8M14 34h6M44 34h6" stroke="#6b4423" stroke-width="2.2" stroke-linecap="round"/>' +
      '<ellipse cx="32" cy="40" rx="9" ry="6" fill="#f3e3cc"/><circle cx="25" cy="32" r="2.6" fill="#2d2a26"/><circle cx="39" cy="32" r="2.6" fill="#2d2a26"/>' +
      '<path d="M30 37h4l-2 2.4z" fill="#d1495b"/><path d="M32 39.5q-2 3-5 2M32 39.5q2 3 5 2" fill="none" stroke="#2d2a26" stroke-width="1.4"/></svg>';
    return '<svg class="av" viewBox="0 0 64 64"><path d="M14 30L12 7l15 11M50 30l2-23-15 11" fill="#232323" stroke="#2d2a26" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M15 26l-1-12 8 6M49 26l1-12-8 6" fill="#e9a3a8"/>' +
      '<ellipse cx="32" cy="34" rx="20" ry="18" fill="#262626" stroke="#2d2a26" stroke-width="2"/>' +
      '<path d="M22 52q10-14 20 0z" fill="#fff"/><ellipse cx="32" cy="42" rx="8" ry="5.5" fill="#fff"/>' +
      '<ellipse cx="24.5" cy="32" rx="3.6" ry="4.4" fill="#f2c94c"/><ellipse cx="39.5" cy="32" rx="3.6" ry="4.4" fill="#f2c94c"/>' +
      '<ellipse cx="24.5" cy="32" rx="1.3" ry="3.4" fill="#111"/><ellipse cx="39.5" cy="32" rx="1.3" ry="3.4" fill="#111"/>' +
      '<path d="M30 38.5h4l-2 2.2z" fill="#e98a95"/><path d="M32 41q-2 2.6-4.6 1.6M32 41q2 2.6 4.6 1.6" fill="none" stroke="#555" stroke-width="1.3"/>' +
      '<path d="M8 38h10M8 42l10-1M46 38h10M46 41l10 1" stroke="#bbb" stroke-width="1"/></svg>';
  };

  /* ------------------------------------------------------------ oyun: gucler, XP, unvan, taslar, yetenekler */
  var GUC = {
    kedi: { ad: 'Kedi Gözü', kisa: 'Kiki yanlış bir şıkkı siler.', svg: function () { return K.avatar('kiki'); } },
    fisilti: { ad: 'Pofuduk Fısıltısı', kisa: 'Çözümün ilk adımını fısıldar.', svg: function () { return K.avatar('pofuduk'); } },
    sans: { ad: 'İkinci Şans', kisa: 'Bir yanlışını saymaz, bir hak daha verir.', svg: function () { return '<svg class="av" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#3a9d5d" stroke="#2d2a26" stroke-width="2.5"/><path d="M20 34a12 12 0 1 0 4-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M18 18v9h9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="32" y="39" text-anchor="middle" font-size="16" font-weight="700" fill="#fff" font-family="system-ui">2</text></svg>'; } },
    kalkan: { ad: 'Seri Kalkanı', kisa: 'Bir gün çalışamazsan serini korur.', svg: function () { return '<svg class="av" viewBox="0 0 64 64"><path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="#3d7cc9" stroke="#2d2a26" stroke-width="2.5"/><path d="M32 14l14 5v11c0 9-6 16-14 19z" fill="#9cc3ef"/><path d="M24 31l6 6 11-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'; } },
    kazma: { ad: 'Altın Kazma', kisa: 'İstediğin bir taşı bir seviye büyütür.', svg: function () { return '<svg class="av" viewBox="0 0 64 64"><path d="M10 22c12-12 32-14 44-6-14-2-28 2-38 12z" fill="#f2c94c" stroke="#2d2a26" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 20l6 6-20 30-6-4z" fill="#a0522d" stroke="#2d2a26" stroke-width="2.5" stroke-linejoin="round"/><circle cx="48" cy="12" r="3" fill="#fff8d6"/><path d="M48 4v4M48 16v4M40 12h4M52 12h4" stroke="#f2c94c" stroke-width="2"/></svg>'; } }
  };
  K.GUC = GUC;
  var UNVAN = [['Çırak Madenci', 0], ['Kazmacı', 250], ['Damar Avcısı', 650], ['Kalfa Madenci', 1200], ['Kristal Kâşifi', 2000], ['Usta Madenci', 3000], ['Mücevher Ustası', 4300], ['Efsane Madenci', 6000]];
  function levelOf(xp) { var l = 1; UNVAN.forEach(function (u, i) { if (xp >= u[1]) l = i + 1; }); return l; }
  K.levelOf = levelOf;
  var TASSEV = ['', 'Ham taş', 'Cilalı taş', 'Kristal'];
  var YETSEV = ['Kilitli', 'Açık', 'Altın'];
  var TAZE_GUN = 2;

  /* kutlama kuyrugu ve bildirim */
  var cq = [], cOpen = false;
  function celebrate(c) { cq.push(c); if (!cOpen) nextCel(); }
  function nextCel() {
    var c = cq.shift(); if (!c) { cOpen = false; return; }
    cOpen = true; beep(c.sound || 'win'); if (c.confetti !== false) confetti();
    var ov = h('div', { class: 'overlay' }), card = h('div', { class: 'card' });
    if (c.kicker) card.appendChild(h('div', { class: 'hand', style: 'font-size:1.25rem;color:var(--acc)', text: c.kicker }));
    if (c.img) card.appendChild(h('img', { class: 'reward-img', src: c.img, alt: '', onerror: "this.style.display='none'" }));
    if (c.svg) card.appendChild(h('div', { class: 'reward-svg', html: c.svg }));
    if (c.title) card.appendChild(h('h2', { text: c.title }));
    if (c.html) card.appendChild(h('div', { html: c.html }));
    if (c.text) card.appendChild(mdEl('div', c.text, 'muted'));
    var row = h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' });
    (c.buttons || []).forEach(function (b) { row.appendChild(h('a', { class: 'btn' + (b.pri ? ' pri' : ''), href: b.href || '#', onclick: function (e) { if (!b.href) e.preventDefault(); close(); if (b.fn) b.fn(); } }, b.t)); });
    if (!(c.buttons || []).length) row.appendChild(h('button', { class: 'btn pri', type: 'button', onclick: close }, 'Süper!'));
    card.appendChild(row); ov.appendChild(card); document.body.appendChild(ov);
    function close() { ov.remove(); setTimeout(nextCel, 120); }
  }
  K.celebrate = celebrate;
  function toast(msg) {
    var t = h('div', { class: 'toast', html: inline(msg) });
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3200);
  }
  K.toast = toast;
  function confetti() {
    var c = h('div', { class: 'confetti' }), cols = ['#2a9d8f', '#e07a3f', '#f2c94c', '#d1495b', '#3d7cc9'], j;
    for (j = 0; j < 70; j++) c.appendChild(h('i', { style: 'left:' + (Math.random() * 100) + '%;background:' + cols[j % 5] + ';animation-duration:' + (1.6 + Math.random() * 1.8) + 's;animation-delay:' + (Math.random() * 0.6) + 's' }));
    document.body.appendChild(c); setTimeout(function () { c.remove(); }, 4200);
  }

  function powerHtml(k, n) { return '<span class="pw-ic">' + GUC[k].svg() + '</span>' + (n != null ? '<b>×' + n + '</b>' : ''); }
  function grant(bundle, why) {
    var parts = [];
    Object.keys(bundle).forEach(function (k) { if (bundle[k] > 0) { O.pw[k] = (O.pw[k] || 0) + bundle[k]; parts.push(bundle[k] + ' ' + GUC[k].ad); } });
    saveO();
    return parts.join(', ');
  }
  function usePower(k) { if ((O.pw[k] || 0) <= 0) return false; O.pw[k]--; saveO(); refreshPowerBars(); return true; }
  K.usePower = usePower;
  function addXP(n, why) {
    if (!n) return;
    O.xp += n; saveO();
    if (why) toast('+' + n + ' XP · ' + why);
    var l = levelOf(O.xp);
    while (O.lvl < l) {
      O.lvl++;
      var b = { kedi: 1, fisilti: 1 };
      if (O.lvl % 2 === 1) { b.sans = 1; b.kalkan = 1; }
      if (O.lvl % 2 === 0) b.kazma = 1;
      var got = grant(b);
      saveO();
      celebrate({ kicker: 'Seviye ' + O.lvl + '!', title: UNVAN[O.lvl - 1][0], svg: GUC.kazma.svg(), text: 'Yeni unvanın hayırlı olsun! Hediye güçler: **' + got + '**.' });
    }
  }
  K.addXP = addXP;
  function touchDay() {
    var t = dayNum(), last = O.days.length ? O.days[O.days.length - 1] : null;
    if (last === t) return;
    if (last != null && t - last > 1) {
      var missed = t - last - 1;
      if (missed <= 2 && (O.pw.kalkan || 0) >= missed && streakAt(last) >= 2) {
        O.pw.kalkan -= missed;
        for (var d = last + 1; d < t; d++) O.shield.push(d);
        setTimeout(function () { celebrate({ kicker: 'Seri Kalkanı devrede', title: 'Serin korundu!', svg: GUC.kalkan.svg(), text: missed + ' gün ara verdin ama ' + missed + ' Seri Kalkanı serini kurtardı. Devam!', confetti: false }); }, 300);
      }
    }
    O.days.push(t); if (O.days.length > 500) O.days.shift();
    if (O.shield.length > 100) O.shield.shift();
    saveO();
    addXP(10, 'günün ilk çalışması');
  }
  function streakAt(day) {
    var set = {}; O.days.forEach(function (x) { set[x] = 1; }); O.shield.forEach(function (x) { set[x] = 1; });
    var n = 0, d = day; while (set[d]) { n++; d--; } return n;
  }
  function streak() { var t = dayNum(); var set = {}; O.days.forEach(function (x) { set[x] = 1; }); return streakAt(set[t] ? t : t - 1); }

  function stoneOfId(sid) { return TASLAR[sid] || null; }
  function stoneOf(id) { var m = KURS.lessons[id] || {}; return stoneOfId(m.stone); }
  function stoneImg(sid, lvl, course) {
    var base = course && course !== KURS.id && DIZIN[course] ? (KURS.landing ? '' : '../') + DIZIN[course] + '/' : '';
    return base + 'gorsel/tas/' + sid + '-' + Math.max(1, Math.min(3, lvl || 1)) + '.webp';
  }
  K.stoneImg = stoneImg;
  function lvlOf(id, course) { var p = courseP(course || KURS.id); return (p.stone[id] || {}).l || 0; }
  function setStone(id, l, via) {
    var cur = P.stone[id] || { l: 0, t: 0 };
    if (l <= cur.l) return false;
    l = Math.min(3, l);
    var first = cur.l === 0;
    P.stone[id] = { l: l, t: Date.now(), via: via }; save();
    var st = stoneOf(id);
    if (!first) addXP(30 * (l - cur.l), 'taş büyüdü');
    if (st) celebrate({
      kicker: first ? 'Yeni taş!' : (l === 3 ? 'Kristale dönüştü!' : 'Taşın cilalandı!'), title: st.name + ' · ' + TASSEV[l], img: stoneImg(st.id, l),
      text: (first && l > 1 ? 'Alıştırmadaki başarın sayesinde taşın doğrudan **' + TASSEV[l].toLowerCase() + '** olarak geldi! ' : '') + (l === 3 && st.sir ? '**Kristal sırrı:** ' + st.sir : st.fact || '')
    });
    checkSkills();
    return true;
  }
  function skillTier(sk) {
    var lv = sk.dersler.map(function (id) { return lvlOf(id, sk.c); });
    if (!lv.length) return { tier: 0, c2: 0, c3: 0, n: 0 };
    var c2 = lv.filter(function (x) { return x >= 2; }).length, c3 = lv.filter(function (x) { return x >= 3; }).length;
    return { tier: c3 === lv.length ? 2 : c2 === lv.length ? 1 : 0, c2: c2, c3: c3, n: lv.length };
  }
  K.skillTier = skillTier;
  function checkSkills() {
    YETENEK.forEach(function (sk) {
      var t = skillTier(sk).tier, g = O.granted[sk.id] || 0;
      while (g < t) {
        g++; O.granted[sk.id] = g; saveO();
        var b = {}; b[sk.guc] = 2; if (g === 2) b.kazma = 1;
        var got = grant(b);
        addXP(g === 2 ? 200 : 100, null);
        celebrate({ kicker: g === 2 ? 'Yetenek altına yükseldi!' : 'Yeni yetenek açıldı!', title: sk.ad + (g === 2 ? ' · Altın' : ''), svg: skillBadge(sk, g),
          text: sk.desc + '\n\nKazandığın güçler: **' + got + '**.', buttons: [{ t: 'Yetenek ağacı', href: '#/yetenek', pri: true }, { t: 'Kapat' }] });
      }
    });
  }
  function skillBadge(sk, tier) {
    var fill = tier === 2 ? '#f2c94c' : tier === 1 ? 'var(--acc)' : 'var(--soft)';
    return '<svg class="sk-badge" viewBox="0 0 80 80"><path d="M40 4l32 18v36L40 76 8 58V22z" style="fill:' + fill + ';stroke:var(--ink);stroke-width:3"/>' +
      '<path d="M40 16l20 11v24L40 62 20 51V27z" style="fill:rgba(255,255,255,.35);stroke:var(--ink);stroke-width:1.5"/>' +
      '<text x="40" y="47" text-anchor="middle" style="font-family:var(--hand);font-size:24px;fill:var(--ink)">' + esc(sk.ad.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</text></svg>';
  }

  /* ------------------------------------------------------------ betik yukleme */
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res) {
      var s = document.createElement('script');
      s.src = src; s.onload = function () { res(true); }; s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  function loadLesson(id) {
    window.DERS = window.DERS || {}; window.AUDIO = window.AUDIO || {};
    return Promise.all([loadScript('veri/ders-' + id + '.js'), loadScript('veri/ses-' + id + '.js')]).then(function () { return window.DERS[id]; });
  }

  /* ------------------------------------------------------------ yonlendirme */
  var app, cleanup = [];
  function onLeave(fn) { cleanup.push(fn); }
  function route() {
    cleanup.forEach(function (f) { try { f(); } catch (e) { } }); cleanup = [];
    stopAudio();
    var hsh = location.hash.replace(/^#\/?/, ''), parts = hsh.split('/');
    app = app || document.getElementById('app');
    app.innerHTML = '';
    window.scrollTo(0, 0);
    if (parts[0] === 'd' && parts[1]) {
      loadLesson(parts[1]).then(function (L) {
        if (!L) { app.appendChild(notFound(parts[1])); return; }
        if (parts[2] === 'a') return practiceView(L);
        if (parts[2] === 's') return finishView(L);
        if (parts[2] === 't') return tazeView(L);
        playerView(L, parts[2] === 'bas' ? 0 : null);
      });
    } else if (parts[0] === 'deneme' && parts[1]) {
      window.DENEME = window.DENEME || {};
      loadScript('veri/deneme-' + parts[1] + '.js').then(function () {
        var D = window.DENEME[parts[1]];
        if (!D) { app.appendChild(notFound(parts[1])); return; }
        examView(D);
      });
    } else if (parts[0] === 'koleksiyon') collectionView();
    else if (parts[0] === 'yetenek') skillView();
    else if (parts[0] === 'plan') planView();
    else homeView();
  }
  window.addEventListener('hashchange', route);
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  K.go = go;
  function notFound(id) {
    return h('div', { class: 'wrap' }, h('div', { class: 'card' }, h('h2', { text: 'Bu ders henüz hazır değil' }),
      h('p', { class: 'muted', text: id }), h('a', { class: 'btn', href: '#/' }, 'Ana sayfa')));
  }
  function topbar(title, backHash, right) {
    return h('div', { class: 'topbar' },
      h('a', { class: 'btn ghost iconbtn', href: backHash || '#/', 'aria-label': 'Geri', html: IC.back }),
      h('div', { class: 'title', text: title }), right || null);
  }

  /* ------------------------------------------------------------ ana sayfa */
  function lessonOrder() {
    var out = [];
    (KURS.themes || []).forEach(function (t) { (t.lessons || []).forEach(function (id) { if (KURS.lessons[id]) out.push(id); }); });
    return out;
  }
  function nextLesson() {
    var ord = lessonOrder(), i;
    for (i = 0; i < ord.length; i++) if (!P.done[ord[i]] && KURS.lessons[ord[i]].ready !== false) return ord[i];
    return null;
  }
  function tazeState(id, c) {
    /* {ok:bool, kristal:bool, wait:gun} */
    var PP = courseP(c || KURS.id);
    if (!PP.done[id]) return { ok: false, wait: null };
    var s = PP.stone[id] || { l: 1, t: PP.done[id].t }, tz = PP.taze[id] || {}, now = dayNum();
    if (tz.last != null && tz.last === now) return { ok: false, wait: 1, today: true, kristal: s.l >= 3 };
    if (s.l >= 3) return { ok: true, kristal: true };
    if (tz.fail != null && now - tz.fail < 1) return { ok: false, wait: 1 };
    var gap = now - dayNum(s.t);
    return gap >= TAZE_GUN ? { ok: true } : { ok: false, wait: TAZE_GUN - gap };
  }
  function weeksLeft() {
    if (!KURS.examDate) return null;
    var ms = new Date(KURS.examDate + 'T09:00:00') - new Date();
    return Math.max(0, Math.ceil(ms / (7 * 864e5)));
  }
  var pwBars = [];
  function refreshPowerBars() { pwBars = pwBars.filter(function (f) { return f(); }); }
  function playerStrip() {
    var l = levelOf(O.xp), cur = UNVAN[l - 1][1], nx = UNVAN[l] ? UNVAN[l][1] : null;
    var pct = nx ? Math.round(100 * (O.xp - cur) / (nx - cur)) : 100;
    var pw = h('div', { class: 'pw-row' });
    function drawPw() { if (!pw.isConnected && pw.parentNode) return false; pw.innerHTML = ''; Object.keys(GUC).forEach(function (k) { pw.appendChild(h('span', { class: 'pw-chip', title: GUC[k].ad + ': ' + GUC[k].kisa, html: powerHtml(k, O.pw[k] || 0) })); }); return true; }
    drawPw(); pwBars.push(drawPw);
    return h('a', { class: 'card player-strip', href: '#/yetenek' },
      h('div', { class: 'row', style: 'justify-content:space-between;align-items:baseline' },
        h('div', {}, h('div', { class: 'hand', style: 'font-size:1.45rem;line-height:1.1', text: UNVAN[l - 1][0] }), h('div', { class: 'small muted', text: 'Seviye ' + l + ' · ' + O.xp + ' XP' + (nx ? ' · sonraki unvan: ' + UNVAN[l][0] : '') })),
        h('span', { class: 'small', style: 'color:var(--acc);font-family:var(--hand);font-size:1.1rem' }, icon('tree'), ' Yetenek ağacı')),
      h('div', { class: 'bar', style: 'margin:8px 0' }, h('i', { style: 'width:' + pct + '%' })), pw);
  }
  function homeView() {
    if (KURS.landing) return landingView();
    var ord = lessonOrder(), done = ord.filter(function (id) { return P.done[id]; }).length, nx = nextLesson();
    var wrap = h('div', { class: 'wrap' });
    var right = h('button', { class: 'btn ghost iconbtn', 'aria-label': 'Ayarlar', html: IC.gear, onclick: function () { settingsSheet(); } });
    app.appendChild(h('div', { class: 'topbar' },
      KURS.home ? h('a', { class: 'btn ghost iconbtn', href: KURS.home, 'aria-label': 'Tüm dersler', html: IC.home }) : null,
      h('div', { class: 'title', text: KURS.name + ' · ' + (KURS.grade || 10) + '. sınıf' }), right));
    app.appendChild(wrap);
    var wl = weeksLeft(), nxMeta = nx ? KURS.lessons[nx] : null;
    var hero = h('div', { class: 'card acc hero' },
      h('div', {},
        h('div', { class: 'big', text: (KURS.hello || 'Merhaba Eray!') }),
        h('p', { class: 'muted', style: 'margin:.2em 0 .8em', text: KURS.motto || '' }),
        nx ? h('a', { class: 'btn pri', href: '#/d/' + nx }, icon('play'), (P.beat[nx] ? 'Devam et: ' : 'Sıradaki: ') + nxMeta.title)
          : h('div', { class: 'hand', style: 'font-size:1.4rem', text: 'Bütün dersleri bitirdin. Şimdi denemelerle prova zamanı!' })),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', { text: done + ' / ' + ord.length }), 'ders bitti', h('div', { class: 'bar', style: 'margin-top:6px' }, h('i', { style: 'width:' + (ord.length ? Math.round(100 * done / ord.length) : 0) + '%' }))),
        h('div', { class: 'stat' }, h('b', { text: String(streak()) }), 'günlük seri'),
        wl != null ? h('div', { class: 'stat' }, h('b', { text: '~' + wl + ' hafta' }), 'sınava kaldı') : null));
    wrap.appendChild(hero);
    wrap.appendChild(playerStrip());
    /* tazeleme kuyrugu */
    var ready = ord.filter(function (id) { var s = tazeState(id); return s.ok && !s.kristal; });
    if (ready.length) {
      var tq = h('div', { class: 'card taze' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, icon('clock'), ' Tazeleme zamanı'), h('span', { class: 'pill', text: ready.length + ' taş' })),
        h('p', { class: 'small muted', style: 'margin:.2em 0 .6em', text: 'Birkaç gün önce bitirdiğin dersler. Kısa bir turla hem hatırla hem taşını büyüt.' }));
      var tl = h('div', { class: 'taze-list' });
      ready.slice(0, 6).forEach(function (id) {
        var st = stoneOf(id), l = lvlOf(id);
        tl.appendChild(h('a', { class: 'taze-item', href: '#/d/' + id + '/t' }, st ? h('img', { src: stoneImg(st.id, l), alt: '', onerror: "this.style.visibility='hidden'" }) : null, h('span', { text: KURS.lessons[id].title })));
      });
      tq.appendChild(tl); wrap.appendChild(tq);
    }
    wrap.appendChild(h('div', { class: 'row', style: 'margin:4px 0 8px' },
      h('a', { class: 'btn sm', href: '#/plan' }, icon('cal'), 'Çalışma planı'),
      h('a', { class: 'btn sm', href: '#/koleksiyon' }, icon('gem'), 'Taş koleksiyonu'),
      (KURS.exams || []).length ? h('a', { class: 'btn sm', href: '#denemeler', onclick: function (e) { e.preventDefault(); var t = $('#denemeler'); if (t) t.scrollIntoView({ behavior: 'smooth' }); } }, icon('pen'), 'Denemeler') : null));
    (KURS.themes || []).forEach(function (t) {
      var ids = (t.lessons || []).filter(function (id) { return KURS.lessons[id]; });
      if (!ids.length) return;
      var nd = ids.filter(function (id) { return P.done[id]; }).length;
      var sk = YETENEK.filter(function (y) { return y.id === t.skill; })[0];
      var th = h('div', { class: 'theme-h' }, h('h2', { text: t.name }), h('span', { class: 'pill', text: nd + '/' + ids.length }));
      if (sk) { var tr = skillTier(sk); th.appendChild(h('a', { class: 'sk-chip tier' + tr.tier, href: '#/yetenek', html: skillBadge(sk, tr.tier) + '<span>' + esc(sk.ad) + '</span>' })); }
      wrap.appendChild(th);
      if (t.note) wrap.appendChild(h('p', { class: 'muted small', style: 'margin:0 4px 8px', text: t.note }));
      var list = h('div', { class: 'lessons' });
      ids.forEach(function (id) {
        var m = KURS.lessons[id], isDone = !!P.done[id], st = stoneOf(id), l = lvlOf(id), ts = tazeState(id);
        if (m.ready === false) { list.appendChild(h('div', { class: 'lesson soon' }, h('div', { class: 'num', text: m.short || String(m.order) }), h('div', {}, h('div', { class: 't', text: m.title }), h('div', { class: 's', text: m.tagline || '' })), h('div', { class: 'meta', text: 'yakında' }))); return; }
        list.appendChild(h('a', { class: 'lesson' + (isDone ? ' done' : '') + (id === nx ? ' next' : ''), href: '#/d/' + id },
          h('div', { class: 'num', text: m.short || String(m.order) }),
          h('div', { style: 'min-width:0' }, h('div', { class: 't', text: m.title }), h('div', { class: 's', text: m.tagline || '' }),
            isDone && ts.ok && !ts.kristal ? h('span', { class: 'chip-taze', html: IC.clock + ' tazeleme hazır' }) : null),
          h('div', { class: 'meta' },
            isDone && st ? h('img', { class: 'stone-mini lv' + l, src: stoneImg(st.id, l), alt: st.name, onerror: "this.style.visibility='hidden'" }) : null,
            isDone ? h('div', { class: 'lvname', text: TASSEV[l] || '' }) : h('div', { text: (m.minutes || 12) + ' dk' }))));
      });
      wrap.appendChild(list);
    });
    if ((KURS.exams || []).length) {
      wrap.appendChild(h('div', { class: 'theme-h', id: 'denemeler' }, h('h2', { text: 'Sorumluluk sınavı provası' })));
      wrap.appendChild(h('p', { class: 'muted small', style: 'margin:0 4px 8px', text: 'Gerçek sınav gibi: açık uçlu sorular, puanlar, süre. Kâğıda yazıp çözmek için yazdırabilirsin.' }));
      var el = h('div', { class: 'lessons' });
      KURS.exams.forEach(function (x) {
        var r = P.exam[x.id];
        if (x.ready === false) { el.appendChild(h('div', { class: 'lesson soon' }, h('div', { class: 'num', html: IC.pen }), h('div', {}, h('div', { class: 't', text: x.title }), h('div', { class: 's', text: x.note || '' })), h('div', { class: 'meta', text: 'yakında' }))); return; }
        el.appendChild(h('a', { class: 'lesson', href: '#/deneme/' + x.id },
          h('div', { class: 'num', html: IC.pen }),
          h('div', {}, h('div', { class: 't', text: x.title }), h('div', { class: 's', text: x.note || '' })),
          h('div', { class: 'meta', text: r ? 'En iyi: ' + r.best + ' puan' : (x.minutes || 40) + ' dk' })));
      });
      wrap.appendChild(el);
    }
    wrap.appendChild(h('p', { class: 'muted small center', style: 'margin-top:28px', text: KURS.footer || 'MEB Türkiye Yüzyılı Maarif Modeli 10. sınıf programına göre hazırlandı.' }));
  }

  function landingView() {
    var wrap = h('div', { class: 'wrap' });
    app.appendChild(h('div', { class: 'topbar' }, h('div', { class: 'title', text: KURS.name }),
      h('button', { class: 'btn ghost iconbtn', 'aria-label': 'Ayarlar', html: IC.gear, onclick: function () { settingsSheet(); } })));
    app.appendChild(wrap);
    var wl = weeksLeft();
    wrap.appendChild(h('div', { class: 'card acc' }, h('div', { class: 'big hand', style: 'font-size:2.3rem;line-height:1.05', text: KURS.hello || 'Merhaba Eray!' }),
      h('p', { class: 'muted', text: KURS.motto || '' }),
      h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', { text: String(streak()) }), 'günlük seri'), wl != null ? h('div', { class: 'stat' }, h('b', { text: '~' + wl + ' hafta' }), 'sınava kaldı') : null)));
    wrap.appendChild(playerStrip());
    var ready = [];
    YETENEK.forEach(function (sk) { sk.dersler.forEach(function (id, i) { var s = tazeState(id, sk.c); if (s.ok && !s.kristal) ready.push({ c: sk.c, id: id, sid: sk.taslar[i], t: sk.basliklar[i], l: lvlOf(id, sk.c) }); }); });
    if (ready.length) {
      var tl = h('div', { class: 'taze-list' });
      ready.slice(0, 10).forEach(function (r) { tl.appendChild(h('a', { class: 'taze-item', href: DIZIN[r.c] + '/index.html#/d/' + r.id + '/t' }, h('img', { src: stoneImg(r.sid, r.l, r.c), alt: '', onerror: "this.style.visibility='hidden'" }), h('span', { text: r.t }))); });
      wrap.appendChild(h('div', { class: 'card taze' }, h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0' }, icon('clock'), ' Tazeleme zamanı'), h('span', { class: 'pill', text: ready.length + ' taş' })), tl));
    }
    var cg = h('div', { class: 'course-grid' });
    (KURS.courses || []).forEach(function (c) {
      var p = courseP(c.id), done = Object.keys(p.done).length, cnt = [0, 0, 0, 0];
      YETENEK.filter(function (y) { return y.c === c.id; }).forEach(function (y) { y.dersler.forEach(function (id) { cnt[lvlOf(id, c.id)]++; }); });
      var next = null;
      YETENEK.filter(function (y) { return y.c === c.id; }).some(function (y) { return y.dersler.some(function (id, i) { if (!p.done[id]) { next = y.basliklar[i]; return true; } return false; }); });
      cg.appendChild(h('a', { class: 'course-card c-' + c.id, href: c.dir + '/index.html' },
        h('div', { class: 'cc-name', text: c.name }),
        h('div', { class: 'small muted', text: done + ' / ' + c.n + ' ders bitti' }),
        h('div', { class: 'bar', style: 'margin:6px 0' }, h('i', { style: 'width:' + Math.round(100 * done / Math.max(1, c.n)) + '%' })),
        h('div', { class: 'row small' }, h('span', { class: 'pill', text: cnt[1] + ' ham' }), h('span', { class: 'pill', text: cnt[2] + ' cilalı' }), h('span', { class: 'pill', text: cnt[3] + ' kristal' })),
        next ? h('div', { class: 'small', style: 'margin-top:6px', text: 'Sıradaki: ' + next }) : null));
    });
    wrap.appendChild(cg);
    wrap.appendChild(h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' }, h('a', { class: 'btn', href: '#/yetenek' }, icon('tree'), 'Yetenek ağacı')));
    wrap.appendChild(h('p', { class: 'muted small center', style: 'margin-top:24px', text: 'MEB Türkiye Yüzyılı Maarif Modeli 10. sınıf programına göre hazırlandı.' }));
  }

  /* ------------------------------------------------------------ ses oynatici */
  var audio = new Audio(); audio.preload = 'auto';
  var timer = null;
  function stopAudio() { try { audio.pause(); } catch (e) { } clearTimeout(timer); timer = null; }
  K.audio = audio;

  /* ------------------------------------------------------------ gosterim (beat) */
  function imgEl(id, cls) {
    var im = h('img', { class: cls == null ? 'img' : cls, src: 'gorsel/' + id + '.webp', alt: '', loading: 'eager' });
    im.onerror = function () { im.onerror = null; im.style.display = 'none'; };
    return im;
  }
  K.imgEl = imgEl;
  function renderShow(sh, ctx) {
    sh = sh || { type: 'text', text: '' };
    var t = sh.type || 'text', box = h('div', { class: 'show show-' + t });
    if (t === 'title') {
      if (sh.img) box.appendChild(imgEl(sh.img));
      box.appendChild(h('div', { class: 'center', style: 'margin-top:10px' },
        h('h1', { text: sh.title || '' }), sh.sub ? inl('div', sh.sub, 'muted hand') : null));
      box.style.textAlign = 'center';
    } else if (t === 'image') {
      box.appendChild(imgEl(sh.img));
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'text') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      if (sh.img) box.appendChild(imgEl(sh.img));
      box.appendChild(mdEl('div', sh.text, 'say-text'));
    } else if (t === 'rule') {
      box.appendChild(h('div', { class: 'rule' }, h('div', { class: 'rt', html: inline(sh.title || 'Kural') }), mdEl('div', sh.text)));
      if (sh.note) box.appendChild(mdEl('div', sh.note, 'cap muted'));
    } else if (t === 'steps') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      if (sh.text) box.appendChild(mdEl('div', sh.text));
      var lines = sh.lines || [], upto = sh.upto == null ? lines.length : Math.min(sh.upto, lines.length);
      var ol = h('ol', { class: 'steps' });
      lines.forEach(function (ln, i) {
        if (i >= upto) return;
        var o = typeof ln === 'string' ? { t: ln } : ln;
        ol.appendChild(h('li', { class: sh.upto != null && i === upto - 1 ? 'cur' : '' },
          h('span', { html: inline(o.t) }), o.why ? h('span', { class: 'why', html: inline(o.why) }) : null));
      });
      box.appendChild(ol);
    } else if (t === 'table') {
      if (sh.title) box.appendChild(h('h3', { html: inline(sh.title) }));
      box.appendChild(tableEl(sh));
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'cards') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      var cg = h('div', { class: 'cards' });
      (sh.cards || []).forEach(function (c) {
        var f = h('div', { class: 'flip', onclick: function () { f.classList.toggle('on'); } },
          h('div', { class: 'in' }, h('div', { class: 'f', html: inline(c.front) }), h('div', { class: 'b', html: md(c.back) })));
        cg.appendChild(f);
      });
      box.appendChild(cg);
      box.appendChild(h('p', { class: 'muted small center', text: 'Kartlara dokun, arkasını gör.' }));
    } else if (t === 'compare') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      var cp = h('div', { class: 'compare' });
      (sh.cols || []).forEach(function (c) {
        cp.appendChild(h('div', {}, h('h3', { html: inline(c.title) }), h('ul', {}, (c.items || []).map(function (it) { return h('li', { html: inline(it) }); }))));
      });
      box.appendChild(cp);
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'widget') {
      if (sh.title) box.appendChild(h('h3', { html: inline(sh.title) }));
      var w = h('div', { class: 'wdg' });
      box.appendChild(w);
      var fn = K.widgets[sh.w];
      if (fn) { try { fn(w, sh, ctx || {}); } catch (e) { w.appendChild(h('pre', { text: 'Araç hatası: ' + e.message })); if (window.console) console.error(e); } }
      else w.appendChild(h('p', { text: 'Bilinmeyen araç: ' + sh.w }));
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'quiz') {
      box.appendChild(questionEl(sh.quiz || sh, function (r) { if (ctx && ctx.onAnswer) ctx.onAnswer(r); }, { inline: true }));
    } else if (t === 'kiki') {
      box.appendChild(questionEl({ type: 'spot', q: sh.q || sh.text || 'Kiki bu soruyu çözmüş ama bir yerde hata var. Hatalı adımı bul!', lines: sh.lines, wrong: sh.wrong, solution: sh.solution, hint: sh.hint }, function (r) { if (ctx && ctx.onAnswer) ctx.onAnswer(r); }, { inline: true }));
    } else if (t === 'poem') {
      var d = h('div'); if (K.widgets.poem) K.widgets.poem(d, sh, ctx); box.appendChild(d);
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'video') {
      box.appendChild(h('video', { class: 'img', src: sh.src, controls: true, playsinline: true, poster: sh.poster || null, preload: 'metadata' }));
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'storyboard') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      var st = h('div', { class: 'strip' });
      (sh.panels || []).forEach(function (p, i) {
        st.appendChild(h('div', { class: 'pn' }, p.img ? imgEl(p.img, '') : null, h('div', { class: 'pt' }, h('span', { class: 'no', text: (i + 1) + '. kare  ' }), h('span', { html: inline(p.text || '') }))));
      });
      box.appendChild(st);
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'timeline') {
      if (sh.title) box.appendChild(h('h2', { html: inline(sh.title) }));
      var tl = h('div', { class: 'timeline' });
      (sh.items || []).forEach(function (it) {
        tl.appendChild(h('div', { class: 'ti' + (it.hl ? ' hl' : '') }, h('b', { html: inline(it.label || '') }), it.text ? h('div', { class: 'small', html: inline(it.text) }) : null));
      });
      box.appendChild(tl);
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else if (t === 'svg') {
      box.appendChild(h('div', { class: 'wdg', html: sh.svg || '' }));
      if (sh.text) box.appendChild(mdEl('div', sh.text, 'cap'));
    } else {
      box.appendChild(mdEl('div', sh.text || ''));
    }
    return box;
  }
  K.renderShow = renderShow;
  function tableEl(sh) {
    var tb = h('table', { class: 't' }), hl = sh.hl || [];
    function isHl(r, c) { return hl.some(function (x) { return x[0] === r && x[1] === c; }); }
    if (sh.head) tb.appendChild(h('thead', {}, h('tr', {}, sh.head.map(function (x, c) { return h('th', { class: isHl(-1, c) ? 'hl' : '', html: inline(x) }); }))));
    tb.appendChild(h('tbody', {}, (sh.rows || []).map(function (r, ri) {
      return h('tr', {}, r.map(function (x, c) { return h(c === 0 && sh.rowhead ? 'th' : 'td', { class: isHl(ri, c) ? 'hl' : '', html: inline(x) }); }));
    })));
    return h('div', { class: 'tscroll' }, tb);
  }
  K.tableEl = tableEl;

  /* ------------------------------------------------------------ soru motoru */
  /* q.type: mc | tf | num | text | order | match | spot | open | tag ; done({ok, first})
     opt.powers: Kedi Gozu / Pofuduk Fisiltisi / Ikinci Sans kullanilabilir (alistirma, tazeleme) */
  function questionEl(q, done, opt) {
    opt = opt || {};
    var T = q.type || 'mc', box = h('div', { class: 'q' }), tries = 0, forgiven = 0, finished = false, sansUsedFor = -1;
    var maxT = q.tries || ({ mc: (q.choices || []).length > 2 ? 2 : 1, tf: 1, num: 2, text: 2, order: 3, spot: 2, tag: 2 }[T] || 2);
    box.appendChild(mdEl('div', q.q || '', 'qtext'));
    if (q.img) box.appendChild(imgEl(q.img));
    if (q.table) box.appendChild(tableEl(q.table));
    if (q.widget) { var wd = h('div', { class: 'wdg' }); box.appendChild(wd); var wf = K.widgets[q.widget.w]; if (wf) try { wf(wd, q.widget, {}); } catch (e) { } }
    var pbar = h('div', { class: 'qpowers' }), area = h('div'), fb = h('div');
    box.appendChild(pbar); box.appendChild(area); box.appendChild(fb);
    var revealCorrect = function () { }, enableRetry = function () { };
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function feedback(kind, title, msg) {
      fb.innerHTML = '';
      fb.appendChild(h('div', { class: 'fb ' + kind }, h('div', { class: 'h', text: title }), msg ? mdEl('div', msg) : null));
    }
    function isFirst() { return tries - forgiven <= 1; }
    function finish(ok) {
      if (finished) return; finished = true;
      beep(ok ? 'ok' : 'bad');
      pbar.innerHTML = '';
      var sol = q.solution ? h('div', { class: 'model' }, h('div', { class: 'hand', style: 'font-size:1.2rem', text: 'Çözüm' }), mdEl('div', q.solution)) : null;
      fb.innerHTML = '';
      fb.appendChild(h('div', { class: 'fb ' + (ok ? 'ok' : 'bad') },
        h('div', { class: 'h', text: ok ? (isFirst() ? pick(['Harika!', 'Doğru!', 'Süpersin!', 'Tam isabet!']) : 'Doğru, sonunda yakaladın!') : 'Doğrusu şöyle:' }), sol));
      if (done) done({ ok: ok, first: ok && isFirst() });
    }
    function wrong(msg) {
      beep('bad');
      if (tries - forgiven >= maxT) {
        if (opt.powers && (O.pw.sans || 0) > 0) { offerSans(true); return; }
        revealCorrect(); finish(false); return;
      }
      feedback(q.hint ? 'hint' : 'bad', pick(['Olmadı, bir daha dene.', 'Yaklaştın ama değil.', 'Hımm, tekrar bak.']), msg || (q.hint ? '**İpucu:** ' + q.hint : null));
      if (opt.powers && (O.pw.sans || 0) > 0 && sansUsedFor !== tries) offerSans(false);
    }
    function offerSans(final) {
      var wrapS = h('div', { class: 'fb hint' },
        h('div', { class: 'h', text: final ? 'Hakkın bitti ama…' : 'İstersen İkinci Şans' }),
        h('div', { text: final ? 'İkinci Şans kullanırsan bu yanlış sayılmaz ve bir hakkın daha olur.' : 'Bu yanlışı saymasın; doğru bulursan ilk denemede bilmiş sayılırsın.' }),
        q.hint && final ? mdEl('div', '**İpucu:** ' + q.hint) : null);
      var useB = h('button', { class: 'btn sm pri', type: 'button', html: powerHtml('sans') + ' İkinci Şans kullan (' + (O.pw.sans || 0) + ')' });
      useB.onclick = function () {
        if (!usePower('sans')) return;
        forgiven++; sansUsedFor = tries; beep('magic');
        if (final) enableRetry();
        feedback('hint', 'İkinci Şans!', 'Bu yanlış sayılmadı. Tekrar dene.' + (q.hint ? '\n\n**İpucu:** ' + q.hint : ''));
      };
      var row = h('div', { class: 'row', style: 'margin-top:8px' }, useB);
      if (final) row.appendChild(h('button', { class: 'btn sm', type: 'button', text: 'Çözümü göster', onclick: function () { revealCorrect(); finish(false); } }));
      wrapS.appendChild(row);
      if (!final) { fb.appendChild(wrapS); } else { fb.innerHTML = ''; fb.appendChild(wrapS); }
    }
    /* guc dugmeleri */
    function powerButtons() {
      if (!opt.powers) {
        if (q.hint && T !== 'open') { var hb = h('button', { class: 'btn ghost sm', type: 'button', text: 'İpucu' }); hb.onclick = function () { hb.remove(); feedback('hint', 'İpucu', q.hint); }; pbar.appendChild(hb); }
        return;
      }
      pbar.innerHTML = '';
      if (T === 'mc' && (q.choices || []).length > 2) {
        var kb = h('button', { class: 'pw-btn', type: 'button', disabled: !(O.pw.kedi > 0) || kediUsed, html: powerHtml('kedi', O.pw.kedi || 0) + '<span>Kedi Gözü</span>' });
        kb.onclick = function () { if (finished || kediUsed) return; if (!usePower('kedi')) return; kediUsed = true; kediErase(); beep('magic'); powerButtons(); };
        pbar.appendChild(kb);
      }
      if (q.hint && T !== 'open') {
        var fbn = h('button', { class: 'pw-btn', type: 'button', disabled: !(O.pw.fisilti > 0) || fisUsed, html: powerHtml('fisilti', O.pw.fisilti || 0) + '<span>Pofuduk Fısıltısı</span>' });
        fbn.onclick = function () {
          if (finished || fisUsed) return; if (!usePower('fisilti')) return; fisUsed = true; beep('magic');
          area.parentNode.insertBefore(h('div', { class: 'whisper', html: K.avatar('pofuduk') + '<div>' + md('**Pofuduk fısıldıyor:** ' + q.hint) + '</div>' }), area);
          powerButtons();
        };
        pbar.appendChild(fbn);
      }
    }
    var kediUsed = false, fisUsed = false, kediErase = function () { };
    if (T === 'mc' || T === 'tf') {
      var ch = T === 'tf' ? ['Doğru', 'Yanlış'] : q.choices || [];
      var ans = T === 'tf' ? (q.answer ? 0 : 1) : q.answer;
      var order = ch.map(function (_, i) { return i; });
      if (T === 'mc' && q.shuffle !== false) order = shuffle(order, hashStr(q.q || ''));
      var grid = h('div', { class: 'choices' });
      var btns = [];
      order.forEach(function (ci, k) {
        var b = h('button', { class: 'choice', type: 'button' }, h('span', { class: 'k', text: 'ABCDEFGH'[k] }), h('span', { html: inline(ch[ci]) }));
        b._ci = ci; btns.push(b);
        b.onclick = function () {
          if (finished || b.disabled) return;
          tries++;
          if (ci === ans) { b.classList.add('ok'); btns.forEach(function (x) { x.disabled = true; }); finish(true); }
          else { b.classList.add('bad'); b.disabled = true; wrong(q.why && q.why[ci] ? q.why[ci] : null); }
        };
        grid.appendChild(b);
      });
      revealCorrect = function () { btns.forEach(function (x) { x.disabled = true; if (x._ci === ans) x.classList.add('ok'); }); };
      enableRetry = function () { maxT++; };
      kediErase = function () {
        var cands = btns.filter(function (x) { return x._ci !== ans && !x.disabled; });
        if (!cands.length) return;
        var x = cands[Math.floor(Math.random() * cands.length)];
        x.disabled = true; x.classList.add('gone');
        x.appendChild(h('span', { class: 'paw', html: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="15" rx="5" ry="4" fill="currentColor"/><circle cx="6.5" cy="9.5" r="2.2" fill="currentColor"/><circle cx="10" cy="6.5" r="2.2" fill="currentColor"/><circle cx="14" cy="6.5" r="2.2" fill="currentColor"/><circle cx="17.5" cy="9.5" r="2.2" fill="currentColor"/></svg>' }));
      };
      area.appendChild(grid);
    } else if (T === 'num' || T === 'text') {
      var inp = h('input', { class: 'inp', type: 'text', inputmode: T === 'num' ? 'decimal' : 'text', placeholder: T === 'num' ? 'Sayıyı yaz (ör. 12,5 veya 3/4)' : 'Cevabını yaz', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
      var btn = h('button', { class: 'btn pri', type: 'button', text: 'Kontrol et' });
      var check = function () {
        if (finished) return;
        var v = inp.value.trim(); if (!v) return;
        tries++;
        var ok = false;
        if (T === 'num') {
          var x = parseNum(v), answers = Array.isArray(q.answer) ? q.answer : [q.answer], tol = q.tol == null ? 1e-6 : q.tol;
          ok = !isNaN(x) && answers.some(function (a) { return Math.abs(x - a) <= tol + 1e-9 * Math.abs(a); });
        } else {
          var nv = norm(v);
          ok = (q.accept || []).some(function (a) { return norm(a) === nv; });
        }
        if (ok) { inp.disabled = true; btn.disabled = true; finish(true); }
        else wrong();
      };
      revealCorrect = function () { inp.disabled = true; btn.disabled = true; };
      enableRetry = function () { maxT++; };
      btn.onclick = check;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      area.appendChild(h('div', { class: 'row' }, inp, q.unit ? h('span', { html: inline(q.unit) }) : null, btn));
    } else if (T === 'order') {
      var items = q.items || [], cur = shuffle(items.map(function (_, i) { return i; }), hashStr((q.q || '') + 'o'));
      if (cur.every(function (v, i) { return v === i; }) && cur.length > 1) cur.reverse();
      var list = h('div', { class: 'ordlist' }), lock = false;
      var draw = function () {
        list.innerHTML = '';
        cur.forEach(function (ii, pos) {
          list.appendChild(h('div', { class: 'orditem' }, h('span', { class: 'hand', style: 'font-size:1.2rem', text: (pos + 1) + '.' }), h('span', { class: 'tx', html: inline(items[ii]) }),
            h('span', { class: 'mv' },
              h('button', { type: 'button', 'aria-label': 'Yukarı', text: '↑', disabled: pos === 0 || lock, onclick: function () { var t = cur[pos - 1]; cur[pos - 1] = cur[pos]; cur[pos] = t; draw(); } }),
              h('button', { type: 'button', 'aria-label': 'Aşağı', text: '↓', disabled: pos === cur.length - 1 || lock, onclick: function () { var t = cur[pos + 1]; cur[pos + 1] = cur[pos]; cur[pos] = t; draw(); } }))));
        });
      };
      draw();
      var ob = h('button', { class: 'btn pri', type: 'button', text: 'Sıralamayı kontrol et' });
      ob.onclick = function () {
        if (finished) return;
        tries++;
        var ok = cur.every(function (v, i) { return v === i; });
        $$('.orditem', list).forEach(function (el, i) { el.classList.toggle('ok', cur[i] === i); el.classList.toggle('bad', cur[i] !== i); });
        if (ok) { ob.disabled = true; lock = true; finish(true); }
        else wrong('Yeşiller doğru yerde, kırmızıları düzelt.');
      };
      revealCorrect = function () { ob.disabled = true; lock = true; cur = items.map(function (_, i) { return i; }); draw(); };
      enableRetry = function () { maxT++; };
      area.appendChild(list); area.appendChild(ob);
    } else if (T === 'match') {
      var pairs = q.pairs || [], left = shuffle(pairs.map(function (_, i) { return i; }), hashStr((q.q || '') + 'l')), right = shuffle(pairs.map(function (_, i) { return i; }), hashStr((q.q || '') + 'r'));
      var selL = null, matched = 0, mistakes = 0, grid2 = h('div', { class: 'match' }), donel = h('div', { class: 'pairs-done' });
      var lb = [];
      left.forEach(function (li, k) {
        var b1 = h('button', { type: 'button', html: inline(pairs[li][0]) }), ri = right[k], b2 = h('button', { type: 'button', html: inline(pairs[ri][1]) });
        b1._li = li; lb.push(b1);
        b1.onclick = function () { if (b1.classList.contains('done') || finished) return; lb.forEach(function (x) { x.classList.remove('sel'); }); b1.classList.add('sel'); selL = li; };
        b2.onclick = function () {
          if (b2.classList.contains('done') || selL == null || finished) return;
          if (selL === ri) {
            beep('ok');
            lb.forEach(function (x) { if (x.classList.contains('sel')) { x.classList.remove('sel'); x.classList.add('done'); x.disabled = true; } });
            b2.classList.add('done'); b2.disabled = true; matched++;
            donel.appendChild(h('div', { html: inline(pairs[ri][0]) + ' → ' + inline(pairs[ri][1]) }));
            selL = null;
            if (matched === pairs.length) { tries = mistakes > 1 ? 2 : 1; finish(true); }
          } else { mistakes++; beep('bad'); b2.classList.add('wrong'); setTimeout(function () { b2.classList.remove('wrong'); }, 400); }
        };
        grid2.appendChild(b1); grid2.appendChild(b2);
      });
      area.appendChild(h('p', { class: 'muted small', text: 'Önce soldan, sonra sağdan eşini seç. (En fazla 1 hatayla bitirirsen ilk denemede bilmiş sayılırsın.)' }));
      area.appendChild(grid2); area.appendChild(donel);
    } else if (T === 'spot') {
      var head = h('div', { class: 'kiki-head', html: K.avatar('kiki') });
      head.appendChild(h('div', { class: 'hand', style: 'font-size:1.2rem', text: q.who || 'Kiki çözdü:' }));
      area.appendChild(head);
      var sp = h('div', { class: 'spot' }), sbtn = [];
      (q.lines || []).forEach(function (ln, i) {
        var b = h('button', { type: 'button', html: '<span class="hand" style="color:var(--acc)">' + (i + 1) + '.</span> ' + inline(ln) });
        sbtn.push(b);
        b.onclick = function () {
          if (finished || b.disabled) return; tries++;
          if (i === q.wrong) { b.classList.add('ok'); finish(true); }
          else { b.classList.add('bad'); b.disabled = true; wrong('Bu adım doğru. Başka bir adıma bak.'); }
        };
        sp.appendChild(b);
      });
      revealCorrect = function () { if (sbtn[q.wrong]) sbtn[q.wrong].classList.add('ok'); sbtn.forEach(function (x) { x.disabled = true; }); };
      enableRetry = function () { maxT++; };
      area.appendChild(sp);
    } else if (T === 'open') {
      var ta = h('textarea', { class: 'inp', placeholder: 'Cevabını buraya ya da kâğıda yaz. Sonra model cevapla karşılaştır.' });
      var key = 'q' + hashStr(q.q || '');
      if (P.open[key]) ta.value = P.open[key];
      ta.addEventListener('input', function () { P.open[key] = ta.value; save(); });
      var show = h('button', { class: 'btn', type: 'button', text: 'Model cevabı göster' });
      var res = h('div');
      show.onclick = function () {
        show.disabled = true;
        var total = 0, rub = h('div', { class: 'rubric' }), sc = h('div', { class: 'hand', style: 'font-size:1.3rem' });
        var maxp = (q.rubric || []).reduce(function (a, r) { return a + (r.p || 0); }, 0) || q.points || 0;
        function upd() { total = 0; $$('input', rub).forEach(function (c, i) { if (c.checked) total += q.rubric[i].p || 0; }); sc.textContent = 'Kendi puanın: ' + total + ' / ' + maxp; }
        (q.rubric || []).forEach(function (r) {
          rub.appendChild(h('label', {}, h('input', { type: 'checkbox', onchange: upd }), h('span', { html: inline(r.t) }), h('span', { class: 'p', text: '+' + (r.p || 0) })));
        });
        res.appendChild(h('div', { class: 'model' }, h('div', { class: 'hand', style: 'font-size:1.25rem', text: 'Tam puanlık cevap' }), mdEl('div', q.answer || q.solution || '')));
        if (q.rubric && q.rubric.length) { res.appendChild(h('p', { class: 'small muted', text: 'Cevabında olanları işaretle:' })); res.appendChild(rub); res.appendChild(sc); upd(); }
        var fin = h('button', { class: 'btn pri', type: 'button', text: 'Tamam' });
        fin.onclick = function () { fin.disabled = true; finished = true; if (done) done({ ok: true, first: true, pts: total, max: maxp }); };
        res.appendChild(h('div', { style: 'margin-top:10px' }, fin));
      };
      area.appendChild(ta); area.appendChild(h('div', { style: 'margin-top:8px' }, show)); area.appendChild(res);
    } else if (T === 'tag') {
      var words = String(q.text || '').split(/\s+/), sel = null, given = {}, tw = h('div', { class: 'tagtext' }), wEls = [], targets = q.answers || {};
      words.forEach(function (w, i) {
        var isT = targets.hasOwnProperty(String(i));
        var sp2 = h('span', { class: isT ? 'w' : '', html: esc(w) });
        if (isT) { sp2._i = i; sp2.onclick = function () { if (finished) return; wEls.forEach(function (x) { x.classList.remove('sel'); }); sp2.classList.add('sel'); sel = i; }; wEls.push(sp2); }
        tw.appendChild(sp2); tw.appendChild(document.createTextNode(' '));
      });
      var bar = h('div', { class: 'tagbar' });
      (q.tags || []).forEach(function (tg) {
        bar.appendChild(h('button', { class: 'btn sm', type: 'button', text: tg, onclick: function () {
          if (sel == null || finished) return;
          given[sel] = tg;
          wEls.forEach(function (x) { if (x._i === sel) { var lab = x.querySelector('.lab'); if (!lab) { lab = h('span', { class: 'lab' }); x.appendChild(lab); } lab.textContent = tg; x.classList.remove('sel'); } });
          sel = null;
        } }));
      });
      var tb = h('button', { class: 'btn pri', type: 'button', text: 'Kontrol et' });
      tb.onclick = function () {
        if (finished) return;
        var keys = Object.keys(targets);
        if (keys.some(function (k) { return !given[k]; })) { feedback('hint', 'Az kaldı', 'Önce işaretli bütün sözcükleri etiketle.'); return; }
        tries++;
        var ok = true;
        wEls.forEach(function (x) { x.classList.remove('ok', 'bad'); var good = trLower(given[x._i] || '') === trLower(targets[String(x._i)]); ok = ok && good; x.classList.add(good ? 'ok' : 'bad'); });
        if (ok) { tb.disabled = true; finish(true); }
        else wrong('Kırmızı olanları tekrar düşün.');
      };
      revealCorrect = function () { tb.disabled = true; wEls.forEach(function (x) { var lab = x.querySelector('.lab'); if (!lab) { lab = h('span', { class: 'lab' }); x.appendChild(lab); } lab.textContent = targets[String(x._i)]; }); };
      enableRetry = function () { maxT++; };
      area.appendChild(h('p', { class: 'muted small', text: 'Altı noktalı sözcüğe dokun, sonra türünü seç.' }));
      area.appendChild(tw); area.appendChild(bar); area.appendChild(tb);
    }
    powerButtons();
    if (opt.powers) pwBars.push(function () { if (!box.isConnected) return false; if (!finished) powerButtons(); return true; });
    return box;
  }
  K.questionEl = questionEl;

  /* ------------------------------------------------------------ ders oynatici */
  function playerView(L, startAt) {
    var id = L.id, beats = L.beats || [], n = beats.length;
    var A = (window.AUDIO || {})[id];
    var files = {};
    if (A && A.beats) A.beats.forEach(function (b) { files[b.i] = b; });
    var i = startAt != null ? startAt : Math.min(P.beat[id] || 0, n - 1);
    if (P.beat[id] >= n && startAt == null) i = 0;
    if (i >= n || i < 0) i = 0;
    var playing = false, answered = {};
    var root = h('div', { class: 'player' });
    var pb = h('div', { class: 'pbar' }, h('i'));
    var counter = h('span', { class: 'pill' });
    root.appendChild(topbar(L.title, '#/', counter));
    root.appendChild(pb);
    var stage = h('div', { class: 'stage' });
    var subs = h('div', { class: 'subs' });
    root.appendChild(h('div', { class: 'stage-wrap' }, stage, subs));
    var prev = h('button', { class: 'btn iconbtn', 'aria-label': 'Önceki', html: IC.back });
    var play = h('button', { class: 'btn pri iconbtn play', 'aria-label': 'Oynat', html: IC.play });
    var next = h('button', { class: 'btn iconbtn', 'aria-label': 'Sonraki', html: IC.next });
    var speed = h('button', { class: 'btn sm ghost ctl-small', text: fmtNum(S.speed, 2) + 'x' });
    var setb = h('button', { class: 'btn ghost iconbtn', 'aria-label': 'Ayarlar', html: IC.gear });
    root.appendChild(h('div', { class: 'controls' }, speed, prev, play, next, setb));
    app.appendChild(root);
    touchDay();
    function blocking(k) { var s = (beats[k] || {}).show || {}; return (s.type === 'quiz' || s.type === 'kiki') && !answered[k]; }
    function setPlayIcon() { play.innerHTML = playing ? IC.pause : IC.play; play.setAttribute('aria-label', playing ? 'Durdur' : 'Oynat'); }
    function show(k, autoplay) {
      stopAudio();
      i = k; P.beat[id] = Math.max(P.beat[id] || 0, k); save();
      var b = beats[k];
      stage.innerHTML = '';
      stage.classList.remove('fade-in'); void stage.offsetWidth; stage.classList.add('fade-in');
      stage.appendChild(renderShow(b.show, { lesson: L, beat: k, onAnswer: function (r) {
        answered[k] = true; next.disabled = false;
        if (r && r.ok) addXP(r.first ? 5 : 2, null);
        if (playing && S.auto) timer = setTimeout(advance, 1800);
      } }));
      subs.innerHTML = '';
      var hasAudio = !!files[k];
      subs.classList.toggle('hidden', !(S.subs || !hasAudio));
      subs.appendChild(h('span', { html: inline(b.sub || b.say || '') }));
      pb.firstChild.style.width = Math.round(100 * (k + 1) / n) + '%';
      counter.textContent = (k + 1) + '/' + n;
      prev.disabled = k === 0;
      next.disabled = blocking(k);
      if (autoplay) startBeat(); else { playing = false; setPlayIcon(); }
    }
    function startBeat() {
      var f = files[i];
      playing = true; setPlayIcon();
      if (f) {
        audio.src = f.file; audio.playbackRate = S.speed;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { playing = false; setPlayIcon(); });
      } else {
        var txt = (beats[i].say || '').length;
        timer = setTimeout(beatEnded, Math.max(2500, txt * 62 / S.speed));
      }
    }
    function beatEnded() {
      if (!playing) return;
      if (blocking(i)) return;
      if (S.auto) timer = setTimeout(advance, 700);
      else { playing = false; setPlayIcon(); }
    }
    audio.onended = beatEnded;
    function advance() {
      if (blocking(i)) return;
      if (i < n - 1) show(i + 1, true);
      else endScreen();
    }
    function endScreen() {
      stopAudio(); playing = false; setPlayIcon();
      P.beat[id] = n; save();
      stage.innerHTML = '';
      var hasP = (L.practice || []).length;
      stage.appendChild(h('div', { class: 'center' },
        h('h1', { text: 'Anlatım bitti!' }),
        h('p', { class: 'muted', text: hasP ? 'Şimdi alıştırma zamanı: ' + hasP + ' soru. İlk denemede %70 üstü yaparsan taşın cilalı gelir, %90 üstü yaparsan kristal!' : 'Şimdi dersi bitirelim.' }),
        h('div', { class: 'row', style: 'justify-content:center' },
          h('a', { class: 'btn pri', href: hasP ? '#/d/' + id + '/a' : '#/d/' + id + '/s' }, icon('next'), hasP ? 'Alıştırmalara geç' : 'Devam'),
          h('button', { class: 'btn', type: 'button', onclick: function () { show(0, false); } }, icon('replay'), 'Baştan'))));
      subs.classList.add('hidden');
      pb.firstChild.style.width = '100%';
      next.disabled = true;
      counter.textContent = n + '/' + n;
    }
    play.onclick = function () {
      if (playing) { playing = false; stopAudio(); setPlayIcon(); }
      else startBeat();
    };
    next.onclick = function () { if (!next.disabled) { var was = playing; stopAudio(); if (i < n - 1) show(i + 1, was || S.auto); else endScreen(); } };
    prev.onclick = function () { if (i > 0) show(i - 1, playing); };
    speed.onclick = function () {
      var sp = [0.85, 1, 1.15, 1.3], k = sp.indexOf(S.speed); S.speed = sp[(k + 1) % sp.length]; saveS();
      speed.textContent = fmtNum(S.speed, 2) + 'x'; audio.playbackRate = S.speed;
    };
    setb.onclick = function () { settingsSheet(function () { subs.classList.toggle('hidden', !(S.subs || !files[i])); }); };
    function key(e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') next.onclick();
      else if (e.key === 'ArrowLeft') prev.onclick();
      else if (e.key === ' ') { e.preventDefault(); play.onclick(); }
    }
    document.addEventListener('keydown', key);
    onLeave(function () { document.removeEventListener('keydown', key); audio.onended = null; });
    show(i, false);
    var cover = h('div', { class: 'overlay' }, h('div', { class: 'card' },
      L.images && L.images[0] ? imgEl(L.images[0].id) : null,
      h('h2', { text: L.title }), L.goal ? mdEl('div', L.goal, 'muted') : null,
      h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' },
        h('button', { class: 'btn pri', type: 'button', onclick: function () { cover.remove(); startBeat(); } }, icon('play'), i > 0 ? 'Kaldığın yerden dinle' : 'Başla'),
        h('button', { class: 'btn', type: 'button', onclick: function () { cover.remove(); } }, 'Sessiz oku'))));
    document.body.appendChild(cover);
    onLeave(function () { cover.remove(); });
  }

  /* ------------------------------------------------------------ alistirma */
  function quizRun(wrap, Q, opts, onEnd) {
    var k = 0, res = [], dots = h('div', { class: 'qdots' });
    function drawDots() { dots.innerHTML = ''; Q.forEach(function (_, j) { dots.appendChild(h('i', { class: (res[j] == null ? '' : res[j] ? 'ok' : 'bad') + (j === k ? ' cur' : '') })); }); }
    function showQ() {
      wrap.innerHTML = '';
      if (opts.head) wrap.appendChild(opts.head);
      if (k >= Q.length) return onEnd(res);
      drawDots(); wrap.appendChild(dots);
      var nextB = h('button', { class: 'btn pri', type: 'button', disabled: true }, k < Q.length - 1 ? 'Sonraki soru' : 'Sonucu gör', icon('next'));
      var lv = Q[k].level ? ['', 'kolay', 'orta', 'zor'][Q[k].level] : '';
      wrap.appendChild(h('div', { class: 'card' }, h('div', { class: 'muted small', text: 'Soru ' + (k + 1) + ' / ' + Q.length + (lv ? '  ·  ' + lv : '') }),
        questionEl(Q[k], function (r) { res[k] = !!r.first; drawDots(); nextB.disabled = false; try { nextB.focus({ preventScroll: true }); } catch (e) { } }, { powers: true })));
      wrap.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end' }, nextB));
      nextB.onclick = function () { k++; showQ(); window.scrollTo(0, 0); };
    }
    showQ();
  }
  function stoneTarget(sc) { return 1 + (sc >= 0.7 ? 1 : 0) + (sc >= 0.9 ? 1 : 0); }
  function practiceView(L) {
    var id = L.id, Q = L.practice || [];
    var wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Alıştırma · ' + L.title, '#/d/' + id));
    app.appendChild(wrap);
    touchDay();
    var firstAttempt = !P.prac[id] || P.prac[id].first == null;
    var head = h('div', { class: 'small muted center', style: 'margin:4px 0', text: firstAttempt ? 'İlk deneme taşını belirler: %70 üstü cilalı, %90 üstü kristal.' : 'Tekrar çözüyorsun: bu kez puanın taşını değiştirmez ama pekiştirir.' });
    quizRun(wrap, Q, { head: head }, function (res) {
      var ok = res.filter(Boolean).length, sc = Q.length ? ok / Q.length : 1;
      var pr = P.prac[id] || {};
      if (pr.first == null) { pr.first = sc; addXP(ok * 10, ok + ' doğru'); }
      else addXP(ok * 2, 'tekrar');
      pr.best = Math.max(pr.best || 0, sc); pr.last = sc; pr.t = Date.now();
      P.prac[id] = pr; save();
      if (P.done[id]) setStone(id, stoneTarget(pr.first), 'alistirma');
      var stars = sc >= 0.9 ? 3 : sc >= 0.7 ? 2 : 1, tgt = stoneTarget(pr.first);
      beep(stars >= 2 ? 'win' : 'ok');
      wrap.appendChild(h('div', { class: 'card center' },
        h('div', { class: 'stars', text: '★★★'.slice(0, stars) + '☆☆☆'.slice(0, 3 - stars) }),
        h('div', { class: 'score-big', text: ok + ' / ' + Q.length }),
        h('p', { text: sc >= 0.9 ? 'Çok iyi! Bu konu sende.' : sc >= 0.7 ? 'Güzel! Yanlışlarının çözümlerine bir kez daha bak.' : 'Sorun değil; anlatımı bir kez daha izleyip birkaç gün sonra tazeleme turuyla taşını büyütebilirsin.' }),
        firstAttempt ? h('p', { class: 'hand', style: 'font-size:1.25rem;color:var(--acc)', text: 'Bu dersin taşı: ' + TASSEV[tgt] }) : null,
        h('div', { class: 'row', style: 'justify-content:center' },
          h('a', { class: 'btn pri', href: '#/d/' + id + '/s' }, (L.exam || []).length ? 'Sınav köşesine geç' : 'Dersi bitir', icon('next')),
          h('button', { class: 'btn', type: 'button', onclick: function () { practiceView2(); } }, icon('replay'), 'Tekrar çöz'))));
      function practiceView2() { app.innerHTML = ''; practiceView(L); }
    });
  }

  /* ------------------------------------------------------------ tazeleme turu */
  function tazeView(L) {
    var id = L.id, wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Tazeleme · ' + L.title, '#/'));
    app.appendChild(wrap);
    var st = stoneOf(id), s = tazeState(id), l = lvlOf(id);
    if (!P.done[id]) { wrap.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Önce dersi bitir' }), h('a', { class: 'btn pri', href: '#/d/' + id }, 'Derse git'))); return; }
    if (!s.ok) {
      wrap.appendChild(h('div', { class: 'card center' }, st ? h('img', { class: 'reward-img', src: stoneImg(st.id, l), alt: '' }) : null,
        h('h2', { text: 'Taşın dinleniyor' }),
        h('p', { class: 'muted', text: s.today ? 'Bugün bu taş için tazeleme yaptın. Yarın tekrar gel.' : 'Tazeleme turu ' + s.wait + ' gün sonra açılacak. Beyin, bilgiyi biraz unutmaya başladığında yapılan tekrardan en çok faydayı görür.' }),
        h('a', { class: 'btn', href: '#/' }, 'Ana sayfa')));
      return;
    }
    touchDay();
    var pool = (L.review && L.review.length ? L.review : (L.practice || []).filter(function (q) { return q.type !== 'open'; }));
    var Q = shuffle(pool, hashStr(id + dayNum())).slice(0, Math.min(6, pool.length));
    var head = h('div', { class: 'card acc', style: 'display:flex;gap:12px;align-items:center' },
      st ? h('img', { class: 'stone-mini lv' + l, style: 'width:64px;height:64px', src: stoneImg(st.id, l), alt: '' }) : null,
      h('div', {}, h('div', { class: 'hand', style: 'font-size:1.3rem', text: s.kristal ? 'Kristali parlat' : 'Taşını büyüt: ' + TASSEV[l] + ' → ' + TASSEV[l + 1] }),
        h('div', { class: 'small muted', text: 'İlk denemede en az %80 doğru gerekir. ' + Q.length + ' soru.' })));
    quizRun(wrap, Q, { head: head }, function (res) {
      var ok = res.filter(Boolean).length, sc = Q.length ? ok / Q.length : 0, pass = sc >= 0.8, tz = P.taze[id] || {};
      tz.last = dayNum(); tz.n = (tz.n || 0) + 1;
      if (pass) { tz.fail = null; tz.ok = (tz.ok || 0) + 1; } else tz.fail = dayNum();
      P.taze[id] = tz; save();
      wrap.appendChild(h('div', { class: 'card center' },
        h('div', { class: 'score-big', text: ok + ' / ' + Q.length }),
        h('p', { text: pass ? (s.kristal ? 'Kristalin pırıl pırıl! Bilgi tazelendi.' : 'Başardın! Taşın büyüyor…') : 'Bu sefer olmadı. Anlatıma bir göz at, yarın tekrar dene.' }),
        h('div', { class: 'row', style: 'justify-content:center' }, h('a', { class: 'btn pri', href: '#/' }, 'Ana sayfa'), h('a', { class: 'btn', href: '#/d/' + id + '/bas' }, 'Anlatımı izle'))));
      if (pass && !s.kristal) { addXP(40, 'tazeleme'); setStone(id, l + 1, 'tazeleme'); }
      else if (pass) addXP(20, 'kristal parlatma');
      else addXP(10, 'emek');
    });
  }

  /* ------------------------------------------------------------ sinav kosesi + ozet + bitis */
  function finishView(L) {
    var id = L.id, wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Bitiş · ' + L.title, (L.practice || []).length ? '#/d/' + id + '/a' : '#/d/' + id));
    app.appendChild(wrap);
    var ex = L.exam || [];
    if (ex.length) {
      wrap.appendChild(h('div', { class: 'card acc' }, h('h2', { text: 'Sınav köşesi' }),
        h('p', { class: 'muted', text: 'Sorumluluk sınavında sorular açık uçlu gelir: çözümünü adım adım yazmalısın. Aşağıdaki soruyu önce kendin çöz, sonra tam puanlık cevapla karşılaştır.' })));
      ex.forEach(function (q, j) {
        var qq = {}; for (var kk in q) qq[kk] = q[kk]; qq.type = 'open';
        wrap.appendChild(h('div', { class: 'card' }, h('div', { class: 'muted small', text: (j + 1) + '. soru' + (q.points ? '  ·  ' + q.points + ' puan' : '') }), questionEl(qq, function () { addXP(5, null); })));
      });
    }
    if ((L.summary || []).length) {
      wrap.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Özet kartı' }),
        h('ul', {}, L.summary.map(function (s) { return h('li', { html: inline(s) }); }))));
    }
    if (L.teach) {
      var ta = h('textarea', { class: 'inp', placeholder: 'Kendi cümlelerinle yaz (ya da sesli anlat).' });
      ta.value = P.teach[id] || '';
      ta.addEventListener('input', function () { P.teach[id] = ta.value; save(); });
      wrap.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Polen\'e anlat' }), mdEl('div', L.teach, 'muted'), ta,
        h('p', { class: 'small muted', text: 'Bir konuyu başkasına anlatabiliyorsan gerçekten öğrenmişsindir.' })));
    }
    var fin = h('button', { class: 'btn pri', type: 'button' }, icon('gem'), P.done[id] ? 'Dersi tekrar bitir' : 'Dersi bitir, taşını al');
    fin.onclick = function () {
      var first = !P.done[id];
      P.done[id] = { t: Date.now(), score: (P.prac[id] || {}).first }; save();
      touchDay();
      if (first) addXP(50, 'ders bitti');
      var pr = P.prac[id] || {};
      var changed = setStone(id, pr.first != null ? stoneTarget(pr.first) : 1, first ? 'ders' : 'alistirma');
      var nx = nextLesson();
      celebrate({ kicker: 'Ders bitti', title: L.title, confetti: false, sound: 'ok', text: first ? 'Harika iş! Taşın koleksiyonuna eklendi. ' + TAZE_GUN + ' gün sonra tazeleme turuyla büyütebilirsin.' : 'Bu dersi zaten bitirmiştin; taşın koleksiyonunda.',
        buttons: [nx ? { t: 'Sıradaki ders', href: '#/d/' + nx, pri: true } : null, { t: 'Ana sayfa', href: '#/' }].filter(Boolean) });
    };
    wrap.appendChild(h('div', { class: 'row', style: 'justify-content:center;margin-top:16px' }, fin));
  }

  /* ------------------------------------------------------------ deneme sinavi */
  function examView(D) {
    var bonus = YETENEK.filter(function (y) { return y.c === KURS.id; }).reduce(function (a, y) { return a + (skillTier(y).tier >= 2 ? 3 : 0); }, 0);
    var mins = (D.minutes || 40) + bonus, left = mins * 60, tick = null;
    var wrap = h('div', { class: 'wrap' }), tm = h('span', { class: 'timer', text: mins + ':00' });
    app.appendChild(topbar(D.title, '#/', tm));
    app.appendChild(wrap);
    touchDay();
    var head = h('div', { class: 'card acc' }, h('h2', { text: D.title }), mdEl('div', D.intro || 'Süre: ' + (D.minutes || 40) + ' dakika. Her sorunun puanı yanında yazıyor. Çözümlerini adım adım yaz; yalnız sonucu yazmak tam puan getirmez.'),
      bonus ? h('p', { class: 'small', html: inline('Altın yeteneklerin sana **+' + bonus + ' dakika** kazandırdı.') }) : null,
      h('div', { class: 'row noprint', style: 'margin-top:8px' },
        h('button', { class: 'btn pri', type: 'button', onclick: function (e) { e.currentTarget.disabled = true; startT(); } }, 'Süreyi başlat'),
        h('button', { class: 'btn', type: 'button', onclick: function () { window.print(); } }, 'Yazdır (kâğıtta çöz)')));
    wrap.appendChild(head);
    function startT() {
      clearInterval(tick);
      tick = setInterval(function () { left--; if (left <= 0) { clearInterval(tick); left = 0; beep('bad'); } tm.textContent = Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); }, 1000);
    }
    onLeave(function () { clearInterval(tick); });
    var areas = [];
    (D.questions || []).forEach(function (q, j) {
      var ta = h('textarea', { class: 'inp noprint', placeholder: 'Çözümün (istersen kâğıda yaz)' });
      var key = 'e:' + D.id + ':' + j; ta.value = P.open[key] || '';
      ta.addEventListener('input', function () { P.open[key] = ta.value; save(); });
      var res = h('div'), qbox = h('div', { class: 'exam-q' }, h('span', { class: 'pts', text: (q.points || 0) + ' puan' }), h('span', { class: 'no', text: (j + 1) + '. ' }), mdEl('div', q.q));
      areas.push({ q: q, res: res });
      if (q.img) qbox.appendChild(imgEl(q.img));
      if (q.table) qbox.appendChild(tableEl(q.table));
      if (q.widget) { var wd = h('div', { class: 'wdg' }); qbox.appendChild(wd); var wf = K.widgets[q.widget.w]; if (wf) try { wf(wd, q.widget, {}); } catch (e) { } }
      if (q.hint) {
        var hb = h('button', { class: 'pw-btn noprint', type: 'button', html: powerHtml('fisilti', O.pw.fisilti || 0) + '<span>Pofuduk Fısıltısı</span>' });
        hb.onclick = function () { if (!usePower('fisilti')) { toast('Pofuduk Fısıltısı kalmadı'); return; } beep('magic'); hb.replaceWith(h('div', { class: 'whisper', html: K.avatar('pofuduk') + '<div>' + md('**Pofuduk fısıldıyor:** ' + q.hint) + '</div>' })); };
        qbox.appendChild(h('div', { class: 'qpowers' }, hb));
      }
      qbox.appendChild(ta); qbox.appendChild(res);
      wrap.appendChild(qbox);
    });
    var total = h('div', { class: 'card center hidden' });
    var fin = h('button', { class: 'btn pri noprint', type: 'button', text: 'Bitir ve cevapları göster' });
    var awarded = false;
    fin.onclick = function () {
      clearInterval(tick); fin.disabled = true;
      var sumMax = 0;
      areas.forEach(function (a) {
        var rub = h('div', { class: 'rubric' }), q = a.q;
        sumMax += q.points || 0;
        (q.rubric || []).forEach(function (r) { rub.appendChild(h('label', {}, h('input', { type: 'checkbox', onchange: upd }), h('span', { html: inline(r.t) }), h('span', { class: 'p', text: '+' + (r.p || 0) }))); });
        a.res.appendChild(h('div', { class: 'model' }, h('div', { class: 'hand', style: 'font-size:1.2rem', text: 'Tam puanlık cevap' }), mdEl('div', q.answer || '')));
        if ((q.rubric || []).length) { a.res.appendChild(h('p', { class: 'small muted', text: 'Senin cevabında olanları işaretle:' })); a.res.appendChild(rub); }
        a.rub = rub;
      });
      total.classList.remove('hidden');
      var saveB = h('button', { class: 'btn pri', type: 'button', text: 'Puanımı kaydet' });
      function upd() {
        var s = 0;
        areas.forEach(function (a) { if (a.rub) $$('input', a.rub).forEach(function (c, i) { if (c.checked) s += a.q.rubric[i].p || 0; }); });
        total.innerHTML = '';
        total.appendChild(h('div', { class: 'score-big', text: s + ' / ' + sumMax }));
        total.appendChild(h('p', { text: s >= 50 ? 'Geçer not 50. Bu puanla sınavı geçiyorsun!' : 'Geçer not 50. Eksik kalan konuların derslerine dönüp tekrar dene.' }));
        saveB.onclick = function () {
          var prev = P.exam[D.id] || {}; P.exam[D.id] = { best: Math.max(prev.best || 0, s), last: s, t: Date.now() }; save();
          if (!awarded) { awarded = true; addXP(Math.round(s), 'deneme'); }
          saveB.disabled = true; saveB.textContent = 'Kaydedildi';
        };
        total.appendChild(saveB);
      }
      upd();
      total.scrollIntoView({ behavior: 'smooth' });
    };
    wrap.appendChild(h('div', { class: 'row', style: 'justify-content:center;margin:18px 0' }, fin));
    wrap.appendChild(total);
  }

  /* ------------------------------------------------------------ koleksiyon */
  function collectionView() {
    var wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Taş koleksiyonu', '#/'));
    app.appendChild(wrap);
    var ids = lessonOrder(), got = ids.filter(function (id) { return lvlOf(id) > 0; });
    var cnt = [0, 0, 0, 0]; ids.forEach(function (id) { cnt[lvlOf(id)]++; });
    wrap.appendChild(h('div', { class: 'card acc' }, h('h2', { text: (KURS.stoneTitle || 'Koleksiyon') + ' · ' + got.length + '/' + ids.length }),
      h('p', { class: 'muted', text: 'Ham taş: dersi bitir. Cilalı taş: alıştırmada ilk denemede %70 üstü ya da tazeleme turu. Kristal: %90 üstü ya da bir tazeleme turu daha. Taşa dokun, hikâyesini oku.' }),
      h('div', { class: 'row small' }, h('span', { class: 'pill', text: cnt[1] + ' ham' }), h('span', { class: 'pill', text: cnt[2] + ' cilalı' }), h('span', { class: 'pill acc', text: cnt[3] + ' kristal' }),
        h('span', { class: 'pw-chip', html: powerHtml('kazma', O.pw.kazma || 0) }))));
    var grid = h('div', { class: 'stones' });
    ids.forEach(function (id) {
      var st = stoneOf(id); if (!st) return;
      var l = lvlOf(id);
      var el = h('div', { class: 'stone lv' + l + (l ? '' : ' locked') },
        h('img', { src: stoneImg(st.id, l || 1), alt: l ? st.name : '?', onerror: "this.style.visibility='hidden'" }),
        h('div', { class: 'n', text: l ? st.name : '???' }),
        h('div', { class: 'f', text: l ? TASSEV[l] : KURS.lessons[id].title + ' dersini bitir' }));
      if (l) el.onclick = function () { stoneDetail(id); };
      grid.appendChild(el);
    });
    wrap.appendChild(grid);
  }
  function stoneDetail(id) {
    var st = stoneOf(id), l = lvlOf(id), s = tazeState(id);
    var ov = h('div', { class: 'overlay', onclick: function (e) { if (e.target === ov) ov.remove(); } });
    var lvls = h('div', { class: 'lvls' });
    [1, 2, 3].forEach(function (k) { lvls.appendChild(h('div', { class: 'lvl' + (k <= l ? ' on' : '') }, h('img', { src: stoneImg(st.id, k), alt: '', onerror: "this.style.visibility='hidden'" }), h('span', { text: TASSEV[k] }))); });
    var next = l >= 3 ? 'Bu taş en yüksek seviyede: kristal!' : s.ok ? 'Tazeleme turu hazır: geç ve taşını büyüt.' : 'Tazeleme turu ' + (s.wait || 1) + ' gün sonra açılacak.';
    var card = h('div', { class: 'card' }, h('img', { class: 'reward-img', src: stoneImg(st.id, l), alt: st.name }), h('h2', { text: st.name + ' · ' + TASSEV[l] }),
      st.formula ? h('div', { html: tex('\\ce{' + st.formula + '}') }) : null, mdEl('div', st.fact, 'muted'),
      l >= 3 && st.sir ? h('div', { class: 'model' }, h('div', { class: 'hand', style: 'font-size:1.15rem', text: 'Kristal sırrı' }), mdEl('div', st.sir)) : (st.sir ? h('p', { class: 'small muted', text: 'Kristal seviyesinde bu taşın sırrı açılacak.' }) : null),
      lvls, h('p', { class: 'small', text: next }));
    var row = h('div', { class: 'row', style: 'justify-content:center' });
    if (l < 3 && s.ok) row.appendChild(h('a', { class: 'btn pri', href: '#/d/' + id + '/t', onclick: function () { ov.remove(); } }, icon('clock'), 'Tazeleme turu'));
    if (l < 3) row.appendChild(h('button', { class: 'btn', type: 'button', disabled: !(O.pw.kazma > 0), html: powerHtml('kazma', O.pw.kazma || 0) + ' Altın Kazma kullan', onclick: function () {
      if (!usePower('kazma')) return; beep('magic'); ov.remove(); setStone(id, l + 1, 'kazma');
    } }));
    row.appendChild(h('button', { class: 'btn ghost', type: 'button', text: 'Kapat', onclick: function () { ov.remove(); } }));
    card.appendChild(row); ov.appendChild(card); document.body.appendChild(ov);
    onLeave(function () { ov.remove(); });
  }

  /* ------------------------------------------------------------ yetenek agaci */
  function skillView() {
    var wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Yetenek ağacı', '#/'));
    app.appendChild(wrap);
    var l = levelOf(O.xp), cur = UNVAN[l - 1][1], nx = UNVAN[l] ? UNVAN[l][1] : null;
    var lad = h('div', { class: 'ladder' });
    UNVAN.forEach(function (u, i) { lad.appendChild(h('div', { class: 'rung' + (i + 1 <= l ? ' on' : '') + (i + 1 === l ? ' cur' : '') }, h('b', { text: u[0] }), h('span', { text: u[1] + ' XP' }))); });
    wrap.appendChild(h('div', { class: 'card acc' }, h('div', { class: 'hand', style: 'font-size:1.8rem', text: UNVAN[l - 1][0] }),
      h('div', { class: 'small muted', text: 'Seviye ' + l + ' · ' + O.xp + ' XP' + (nx ? ' · ' + (nx - O.xp) + ' XP sonra: ' + UNVAN[l][0] : ' · en yüksek unvan!') }),
      h('div', { class: 'bar', style: 'margin:8px 0' }, h('i', { style: 'width:' + (nx ? Math.round(100 * (O.xp - cur) / (nx - cur)) : 100) + '%' })), lad));
    wrap.appendChild(h('h2', { text: 'Güçlerin' }));
    var pg = h('div', { class: 'powers-grid' });
    Object.keys(GUC).forEach(function (k) {
      pg.appendChild(h('div', { class: 'power-card' }, h('div', { class: 'pc-ic', html: GUC[k].svg() }), h('div', {}, h('b', { text: GUC[k].ad + ' ×' + (O.pw[k] || 0) }), h('div', { class: 'small muted', text: GUC[k].kisa }))));
    });
    wrap.appendChild(pg);
    wrap.appendChild(h('p', { class: 'small muted', text: 'Güçleri yeteneklerden ve seviye atlayarak kazanırsın. Üç dersin güçleri ortaktır. Kedi Gözü ve Pofuduk Fısıltısı alıştırma ve tazeleme sorularında, İkinci Şans yanlış cevaptan sonra, Altın Kazma koleksiyonda kullanılır. Seri Kalkanı bir gün ara verirsen kendiliğinden devreye girer.' }));
    var names = { mat: 'Matematik', kim: 'Kimya', ede: 'Edebiyat' };
    ['mat', 'kim', 'ede'].forEach(function (c) {
      var list = YETENEK.filter(function (y) { return y.c === c; });
      if (!list.length) return;
      wrap.appendChild(h('div', { class: 'theme-h' }, h('h2', { text: names[c] || c })));
      var tree = h('div', { class: 'sk-tree' });
      list.forEach(function (sk) {
        var tr = skillTier(sk), here = c === KURS.id, base = here ? '' : (DIZIN[c] ? (KURS.landing ? '' : '../') + DIZIN[c] + '/index.html' : '');
        var stones = h('div', { class: 'sk-stones' });
        sk.dersler.forEach(function (id, i) {
          var lv = lvlOf(id, c), sid = (sk.taslar || [])[i];
          stones.appendChild(h('a', { class: 'sk-st lv' + lv, href: base + '#/d/' + id, title: (sk.basliklar || [])[i] || id },
            sid && lv ? h('img', { src: stoneImg(sid, lv, c), alt: '', onerror: "this.style.visibility='hidden'" }) : h('span', { text: '?' })));
        });
        tree.appendChild(h('div', { class: 'sk-node tier' + tr.tier },
          h('div', { class: 'sk-top' }, h('div', { html: skillBadge(sk, tr.tier) }),
            h('div', {}, h('div', { class: 'hand', style: 'font-size:1.35rem;line-height:1.1', text: sk.ad }), h('div', { class: 'small muted', text: sk.tema + ' · ' + YETSEV[tr.tier] }))),
          mdEl('div', sk.desc, 'small'),
          h('div', { class: 'small' }, 'Ödül: ', h('span', { class: 'pw-chip', html: powerHtml(sk.guc, 2) }), ' ', GUC[sk.guc].ad, tr.tier < 2 ? ' · altında +2 daha ve 1 Altın Kazma' : ''),
          h('div', { class: 'small muted', text: tr.tier === 0 ? 'Açmak için: ' + tr.c2 + '/' + tr.n + ' taş cilalı' : tr.tier === 1 ? 'Altın için: ' + tr.c3 + '/' + tr.n + ' taş kristal' : 'Altın yetenek: deneme sınavlarında +3 dakika!' }),
          stones));
      });
      wrap.appendChild(tree);
    });
  }

  /* ------------------------------------------------------------ plan */
  function planView() {
    var wrap = h('div', { class: 'wrap' });
    app.appendChild(topbar('Çalışma planı', '#/'));
    app.appendChild(wrap);
    wrap.appendChild(h('div', { class: 'card acc' }, h('h2', { text: 'Şubat\'a kadar plan' }), mdEl('div', KURS.planNote || 'Haftada birkaç kısa ders yeter. Bir hafta kaçırırsan dert etme, bir sonraki haftaya ekle.')));
    var now = new Date();
    (KURS.plan || []).forEach(function (w) {
      var st = new Date(w.start + 'T00:00:00'), en = new Date(st.getTime() + 7 * 864e5);
      var cur = now >= st && now < en;
      var items = (w.items || []).filter(function (id) { return KURS.lessons[id] || (KURS.exams || []).some(function (x) { return x.id === id; }); });
      wrap.appendChild(h('div', { class: 'week' + (cur ? ' now' : '') },
        h('div', { class: 'wh' }, h('span', { text: w.week + '. hafta' + (cur ? '  (bu hafta)' : '') }), h('span', { class: 'muted small', text: st.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) })),
        w.note ? h('div', { class: 'small muted', text: w.note }) : null,
        h('ul', {}, items.map(function (id) {
          var m = KURS.lessons[id], isEx = !m, d = isEx ? P.exam[id] : P.done[id];
          var title = m ? m.title : ((KURS.exams || []).filter(function (x) { return x.id === id; })[0] || {}).title;
          return h('li', {}, h('span', { class: 'chk' + (d ? ' on' : ''), text: d ? '✓' : '' }), h('a', { href: isEx ? '#/deneme/' + id : '#/d/' + id, html: inline(title || id) }));
        }))));
    });
  }

  /* ------------------------------------------------------------ ayarlar */
  function settingsSheet(after) {
    var old = $('.sheet'); if (old) { old.remove(); return; }
    function seg(opts, val, set) {
      var s = h('div', { class: 'seg' });
      opts.forEach(function (o) {
        var b = h('button', { type: 'button', class: o[0] === val ? 'on' : '', text: o[1] });
        b.onclick = function () { set(o[0]); $$('button', s).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); if (after) after(); };
        s.appendChild(b);
      });
      return s;
    }
    var code = h('textarea', { class: 'inp', style: 'min-height:70px;font-size:.8rem', placeholder: 'İlerleme kodunu buraya yapıştır' });
    var msg = h('div', { class: 'small muted' });
    var resetN = 0;
    function exportAll() { var o = { o: O }; ['mat', 'kim', 'ede'].forEach(function (c) { o[c] = courseP(c); }); return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
    function importAll(txt) {
      var o = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      ['mat', 'kim', 'ede'].forEach(function (c) {
        if (!o[c]) return; var p = courseP(c);
        ['done', 'prac', 'exam', 'teach', 'open', 'beat', 'taze'].forEach(function (k) { if (o[c][k]) for (var x in o[c][k]) if (!p[k][x]) p[k][x] = o[c][k][x]; });
        if (o[c].stone) for (var x in o[c].stone) { if (!p.stone[x] || (o[c].stone[x].l || 0) > (p.stone[x].l || 0)) p.stone[x] = o[c].stone[x]; }
        if (c === KURS.id) { P = p; save(); } else store.set('kamp1:' + c, p);
      });
      if (o.o) {
        O.xp = Math.max(O.xp, o.o.xp || 0); O.lvl = Math.max(O.lvl, o.o.lvl || 1);
        Object.keys(O.pw).forEach(function (k) { O.pw[k] = Math.max(O.pw[k] || 0, (o.o.pw || {})[k] || 0); });
        for (var g in (o.o.granted || {})) O.granted[g] = Math.max(O.granted[g] || 0, o.o.granted[g]);
        (o.o.days || []).forEach(function (d) { if (O.days.indexOf(d) < 0) O.days.push(d); }); O.days.sort(function (a, b) { return a - b; });
        saveO();
      }
    }
    var sheet = h('div', { class: 'sheet' },
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { style: 'margin:0', text: 'Ayarlar' }), h('button', { class: 'btn sm', type: 'button', onclick: function () { sheet.remove(); } }, 'Kapat')),
      h('div', { class: 'opt' }, h('span', { text: 'Otomatik ilerle' }), seg([[true, 'Açık'], [false, 'Kapalı']], S.auto, function (v) { S.auto = v; saveS(); })),
      h('div', { class: 'opt' }, h('span', { text: 'Altyazı' }), seg([[true, 'Açık'], [false, 'Kapalı']], S.subs, function (v) { S.subs = v; saveS(); })),
      h('div', { class: 'opt' }, h('span', { text: 'Ses efektleri' }), seg([[true, 'Açık'], [false, 'Kapalı']], S.sound, function (v) { S.sound = v; saveS(); })),
      h('div', { class: 'opt' }, h('span', { text: 'Görünüm' }), seg([['auto', 'Oto'], ['light', 'Açık'], ['dark', 'Koyu']], S.theme, function (v) { S.theme = v; saveS(); })),
      h('div', { class: 'opt', style: 'display:block' }, h('div', { text: 'İlerleme kodu (telefon ↔ bilgisayar taşımak için; üç ders birden)' }),
        h('div', { class: 'row', style: 'margin:6px 0' },
          h('button', { class: 'btn sm', type: 'button', onclick: function () { var c = exportAll(); code.value = c; try { navigator.clipboard.writeText(c); msg.textContent = 'Kod kopyalandı.'; } catch (e) { msg.textContent = 'Kodu seçip kopyala.'; } } }, 'Kodu al'),
          h('button', { class: 'btn sm', type: 'button', onclick: function () { try { importAll(code.value); msg.textContent = 'İlerleme birleştirildi.'; } catch (e) { msg.textContent = 'Kod okunamadı.'; } } }, 'Kodu yükle')), code, msg),
      h('div', { class: 'opt' }, h('span', { class: 'muted', text: 'Bu dersteki ilerlemeyi sıfırla' }),
        h('button', { class: 'btn sm', type: 'button', text: 'Sıfırla', onclick: function (e) {
          resetN++; if (resetN < 2) { e.currentTarget.textContent = 'Emin misin? Tekrar dokun'; return; }
          P = fixP({}); save(); sheet.remove(); route();
        } })));
    document.body.appendChild(sheet);
    onLeave(function () { sheet.remove(); });
  }

  /* ------------------------------------------------------------ baslat */
  document.addEventListener('DOMContentLoaded', function () {
    app = document.getElementById('app');
    checkSkills();
    route();
  });
})();
