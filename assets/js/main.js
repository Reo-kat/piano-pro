(function () {
  'use strict';
  var FR = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
  var IN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var SEMI = [0, 2, 4, 5, 7, 9, 11];
  var BLACK_AFTER = { 0: 1, 1: 1, 3: 1, 4: 1, 5: 1 }; // positions des touches noires (degrés Do, Ré, Fa, Sol, La)
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Son : synthèse simple, uniquement après un geste de l'utilisateur ---------- */
  var ctx = null, master = null;
  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(midi, when, dur, vel) {
    var c = audio(); if (!c) return;
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var t = when || c.currentTime;
    var g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = Math.min(7000, f * 7);
    var o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
    var o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    var g2 = c.createGain(); g2.gain.value = 0.22;
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel || 0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 1.6));
    o1.start(t); o2.start(t); o1.stop(t + (dur || 1.6) + 0.05); o2.stop(t + (dur || 1.6) + 0.05);
  }

  /* ---------- Construction d'un clavier (touches blanches à partir d'un Do) ---------- */
  function buildPiano(el, opts) {
    var n = opts.nWhite, start = opts.startMidi, keys = {};
    el.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var deg = i % 7, midi = start + 12 * Math.floor(i / 7) + SEMI[deg];
      var b = document.createElement(opts.interactive ? 'button' : 'div');
      if (opts.interactive) { b.type = 'button'; b.setAttribute('aria-label', FR[deg] + ' (' + IN[deg] + ')'); }
      b.className = 'key';
      b.dataset.midi = midi;
      b.innerHTML = '<span>' + FR[deg] + '</span><small>' + IN[deg] + '</small>';
      el.appendChild(b); keys[midi] = b;
    }
    for (var j = 0; j < n - 1; j++) {
      if (!BLACK_AFTER[j % 7]) continue;
      var bm = start + 12 * Math.floor(j / 7) + SEMI[j % 7] + 1;
      var k = document.createElement(opts.interactive ? 'button' : 'div');
      if (opts.interactive) { k.type = 'button'; k.setAttribute('aria-label', FR[j % 7] + ' dièse (' + IN[j % 7] + ' sharp)'); }
      k.className = 'bkey'; k.dataset.midi = bm;
      k.style.left = ((j + 1) * 100 / n) + '%';
      k.style.width = (100 / n * 0.62) + '%';
      el.appendChild(k); keys[bm] = k;
    }
    return keys;
  }
  function flash(node, ms, cls) {
    if (!node) return;
    cls = cls || 'is-on';
    node.classList.add(cls);
    setTimeout(function () { node.classList.remove(cls); }, ms || 380);
  }

  /* ---------- Clavier du hero ---------- */
  var heroEl = document.getElementById('heroPiano');
  if (heroEl) {
    var hk = buildPiano(heroEl, { nWhite: 8, startMidi: 60, interactive: true });
    var hint = document.getElementById('pianoHint');
    var recent = [], done = false;
    var defaultHint = hint ? hint.innerHTML : '';
    heroEl.addEventListener('pointerdown', function (e) {
      var t = e.target.closest('[data-midi]'); if (!t) return;
      var m = +t.dataset.midi;
      tone(m, 0, 1.7, 0.5); flash(t, 420);
      var now = Date.now();
      recent = recent.filter(function (r) { return now - r.t < 2500 && r.m !== m; });
      recent.push({ m: m, t: now });
      var set = recent.map(function (r) { return r.m; });
      if (!done && [60, 64, 67].every(function (x) { return set.indexOf(x) > -1; })) {
        done = true;
        if (hint) hint.innerHTML = '<b>Bravo :</b> vous venez de jouer l’accord de Do majeur, Do – Mi – Sol (C – E – G).';
        [60, 64, 67].forEach(function (x) { flash(hk[x], 900); });
        setTimeout(function () { done = false; if (hint) hint.innerHTML = defaultHint; }, 6000);
      }
    });
    heroEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { var t = e.target.closest('[data-midi]'); if (t) { e.preventDefault(); tone(+t.dataset.midi, 0, 1.7, 0.5); flash(t, 420); } }
    });
  }

  /* ---------- Laboratoire d'accords ---------- */
  var CHORDS = [
    { id: 'do',  label: 'Do',   full: 'Accord de Do majeur (C)',  root: 60, minor: false },
    { id: 'fa',  label: 'Fa',   full: 'Accord de Fa majeur (F)',  root: 65, minor: false },
    { id: 'sol', label: 'Sol',  full: 'Accord de Sol majeur (G)', root: 67, minor: false },
    { id: 'lam', label: 'La m', full: 'Accord de La mineur (Am)', root: 69, minor: true },
    { id: 'rem', label: 'Ré m', full: 'Accord de Ré mineur (Dm)', root: 62, minor: true },
    { id: 'mim', label: 'Mi m', full: 'Accord de Mi mineur (Em)', root: 64, minor: true }
  ];
  var PC = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };
  function nameOf(m) { var d = PC[m % 12]; return { fr: FR[d], en: IN[d] }; }

  var labEl = document.getElementById('labPiano');
  if (labEl) {
    var tabs = document.getElementById('chordTabs');
    var kind = document.getElementById('labKind'), notesEl = document.getElementById('labNotes'),
        formula = document.getElementById('labFormula'), fingers = document.getElementById('labFingers'),
        playBtn = document.getElementById('labPlay');
    var lk = buildPiano(labEl, { nWhite: 10, startMidi: 60, interactive: false });
    var cur = CHORDS[0], busy = false;

    function show(ch) {
      cur = ch;
      var iv = ch.minor ? [0, 3, 7] : [0, 4, 7];
      var ms = iv.map(function (x) { return ch.root + x; });
      Object.keys(lk).forEach(function (k) { lk[k].classList.remove('is-on'); var b = lk[k].querySelector('.badge'); if (b) b.remove(); });
      ms.forEach(function (m, i) {
        var node = lk[m]; if (!node) return;
        node.classList.add('is-on');
        var bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = [1, 3, 5][i];
        node.appendChild(bd);
      });
      var nm = ms.map(nameOf);
      kind.textContent = ch.minor ? 'Accord mineur' : 'Accord majeur';
      notesEl.textContent = nm.map(function (n) { return n.fr; }).join(' – ') + ' (' + nm.map(function (n) { return n.en; }).join(' – ') + ')';
      formula.textContent = 'Formule : ' + nm[0].fr + ' → ' + nm[1].fr + ' = ' + iv[1] + ' demi-tons, puis ' + nm[1].fr + ' → ' + nm[2].fr + ' = ' + (iv[2] - iv[1]) + ' demi-tons.';
      fingers.textContent = 'Main droite, doigts 1 – 3 – 5.';
      [].forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', b.dataset.id === ch.id ? 'true' : 'false'); });
    }
    CHORDS.forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.id = ch.id;
      b.textContent = ch.label; b.setAttribute('aria-label', ch.full);
      b.addEventListener('click', function () { show(ch); });
      tabs.appendChild(b);
    });
    show(CHORDS[0]);

    playBtn.addEventListener('click', function () {
      if (busy) return;
      var c = audio(); if (!c) return;
      busy = true; playBtn.disabled = true;
      var iv = cur.minor ? [0, 3, 7] : [0, 4, 7];
      var ms = iv.map(function (x) { return cur.root + x; });
      var t0 = c.currentTime + 0.05;
      ms.forEach(function (m, i) {
        tone(m, t0 + i * 0.5, 0.9, 0.45);
        setTimeout(function () { flash(lk[m], 380, 'hit'); }, 50 + i * 500);
      });
      var tc = t0 + 1.8;
      ms.forEach(function (m) { tone(m, tc, 2.4, 0.4); });
      setTimeout(function () { ms.forEach(function (m) { flash(lk[m], 1500, 'hit'); }); }, 1850);
      setTimeout(function () { busy = false; playBtn.disabled = false; }, 4200);
    });
  }

  /* ---------- Apparition au défilement ---------- */
  var rev = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    [].forEach.call(rev, function (r) { io.observe(r); });
  } else {
    [].forEach.call(rev, function (r) { r.classList.add('in'); });
  }

  /* ---------- Barre d'achat mobile : visible après le hero, masquée près de l'appel final ---------- */
  var sticky = document.getElementById('sticky');
  var heroSec = document.querySelector('.hero'), finalSec = document.getElementById('acheter');
  if (sticky && heroSec && 'IntersectionObserver' in window) {
    var state = { hero: true, fin: false };
    function upd() {
      var on = !state.hero && !state.fin;
      sticky.classList.toggle('show', on);
      sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
      var a = sticky.querySelector('a'); if (a) a.tabIndex = on ? 0 : -1;
    }
    new IntersectionObserver(function (es) { state.hero = es[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(heroSec);
    if (finalSec) new IntersectionObserver(function (es) { state.fin = es[0].isIntersecting; upd(); }, { threshold: 0.2 }).observe(finalSec);
  }
})();
