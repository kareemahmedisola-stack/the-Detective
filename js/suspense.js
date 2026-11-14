/* suspense.js - anticipation sounds for The Detective

   Everything here is synthesised with Web Audio, so it adds no download weight and works offline.
   It hooks the shared Atmos layer, so every game gets it without further wiring:

     Atmos.danger(level)        a heartbeat that speeds up as danger rises, plus a ticking clock when it is high
     Atmos.letterbox(true,ms)   short moment (the accusation): a rising drum roll that ends on a low boom
                                long moment (the night assault): a dread drone until the bars go away
     Atmos.cut()                a soft whoosh between scenes (rate limited)

   Direct cues (all safe to call at any time, they do nothing while muted or before the first tap):
     Tense.riser(ms)        rising noise + drum roll, then a boom
     Tense.impact()         a low boom
     Tense.dread(on)        low unsettling drone
     Tense.alert()          two quick rising pings (something has just changed)
     Tense.sting(kind)      'reveal' | 'danger' | 'win'
     Tense.steps(n, pan)    footsteps that come closer
     Tense.whoosh(pan)      Tense.countdown(onStep, onDone)   Tense.hold(level)   Tense.enable(bool)

   Switch off with Tense.enable(false), or localStorage dt_tense = 0.                                    */
(function (w) {
  'use strict';
  var T = {}, ac = null, out = null, noiseBuf = null, lvl = 0, held = 0, timer = null;
  var layers = { heart: true, dread: true }, nextBeat = 0, nextTick = 0, tickFlip = 0, dread = null, dreadWant = false, lastCut = 0, enabled = true;
  try { enabled = localStorage.getItem('dt_tense') !== '0'; } catch (e) {}

  function muted() { try { return !!(w.Sfx && Sfx.isMuted && Sfx.isMuted()); } catch (e) { return false; } }
  function live() { return !!(ac && ac.state === 'running' && enabled && !muted() && !document.hidden); }

  function unlock() {
    if (!ac) {
      try {
        var A = w.AudioContext || w.webkitAudioContext; if (!A) return;
        ac = new A();
        var comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 5;
        out = ac.createGain(); out.gain.value = .9; out.connect(comp); comp.connect(ac.destination);
        var n = ac.sampleRate * 2, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        noiseBuf = b;
      } catch (e) { ac = null; return; }
    }
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { w.addEventListener(ev, unlock, { capture: true, passive: true }); });

  /* ---- small building blocks ---- */
  function gainNode(v, pan) {
    var g = ac.createGain(); g.gain.value = v;
    if (pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(out); }
    else g.connect(out);
    return g;
  }
  function osc(type, f0, f1, t, d, vol, pan) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.015, d / 3)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(gainNode(1, pan)); o.start(t); o.stop(t + d + .05);
    return o;
  }
  function noise(t, d, vol, type, f, q, pan, f1) {
    var s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + d); fl.Q.value = q || 1;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(.01, d / 3)); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(gainNode(1, pan)); s.start(t, Math.random()); s.stop(t + d + .05);
  }

  /* ---- heartbeat and clock ---- */
  function beat(t, L) {
    var v = .16 + L * .5;
    osc('sine', 78, 40, t, .16, v);                 // lub
    osc('triangle', 150, 60, t, .06, v * .35);      // chest knock, so phone speakers can hear it
    osc('sine', 70, 38, t + .17, .15, v * .62);     // dub
  }
  function tick(t, L) {
    tickFlip ^= 1;
    noise(t, .03, .05 + L * .06, 'bandpass', tickFlip ? 2300 : 1700, 9);
  }
  function sched() {
    if (!ac) return;
    if (!live()) { nextBeat = 0; nextTick = 0; if (dread) fadeDread(); return; }
    if (dreadWant && !dread && layers.dread) startDread();
    var L = Math.max(lvl, held), t = ac.currentTime;
    if (L < .3 || !layers.heart) { nextBeat = 0; nextTick = 0; return; }
    var per = 60 / (52 + L * 100);
    if (!nextBeat || nextBeat < t) nextBeat = t + .05;
    while (nextBeat < t + .3) { beat(nextBeat, L); nextBeat += per; }
    if (L > .62) {
      if (!nextTick || nextTick < t) nextTick = t + .1;
      while (nextTick < t + .3) { tick(nextTick, L); nextTick += 1; }
    } else nextTick = 0;
  }
  timer = setInterval(sched, 90);

  /* ---- riser, boom, drum roll ---- */
  T.impact = function (at) {
    if (!live()) return; var t = at || ac.currentTime + .01;
    osc('sine', 95, 28, t, 1.1, .75); noise(t, .35, .35, 'lowpass', 1100, .7, 0, 120); if (!at) buzz([60, 40, 90]);
  };
  T.riser = function (ms, noBoom) {
    if (!live()) return; ms = Math.max(900, ms || 2600); var d = ms / 1000, t = ac.currentTime + .02;
    noise(t, d, .24, 'bandpass', 220, 1.4, 0, 5200);
    osc('sawtooth', 70, 360, t, d, .09);
    osc('sine', 140, 700, t, d, .08);
    // drum roll: the gaps shrink and the hits grow
    var x = 0, gap = .2, k = 0;
    while (x < d - .12) { var vv = .035 + (x / d) * .16; noise(t + x, .07, vv, 'highpass', 1500, .8, (k % 2 ? .12 : -.12)); osc('sine', 130, 85, t + x, .09, vv * 2.2); gap = Math.max(.045, gap * .93); x += gap; k++; }
    if (!noBoom) T.impact(t + d);
  };

  /* ---- dread drone (the night assault) ---- */
  function startDread() {
    if (!live() || dread || !layers.dread) return;
    var t = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + 2);
    f.type = 'lowpass'; f.frequency.value = 150;
    var a = ac.createOscillator(), b = ac.createOscillator(); a.type = b.type = 'sawtooth'; a.frequency.value = 55; b.frequency.value = 58.3;
    lfo.frequency.value = .22; lg.gain.value = .03; lfo.connect(lg); lg.connect(g.gain);
    a.connect(f); b.connect(f); f.connect(g); g.connect(out);
    a.start(t); b.start(t); lfo.start(t);
    dread = { g: g, nodes: [a, b, lfo] };
  }
  function fadeDread() {
    if (!dread) return; var d = dread; dread = null;
    try { var t = ac.currentTime; d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(Math.max(.0001, d.g.gain.value), t); d.g.gain.exponentialRampToValueAtTime(.0001, t + .9); } catch (e) {}
    setTimeout(function () { d.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 1100);
  }
  T.dread = function (on) { dreadWant = !!on; if (on) startDread(); else fadeDread(); };

  /* ---- short cues ---- */
  T.alert = function () {
    if (!live()) return; var t = ac.currentTime + .01;
    osc('triangle', 740, 740, t, .16, .16); osc('triangle', 988, 988, t + .15, .24, .16);
  };
  T.sting = function (kind) {
    if (!live()) return; var t = ac.currentTime + .01;
    if (kind === 'win') { [523, 659, 784, 1047].forEach(function (f, i) { osc('triangle', f, f, t + i * .09, .5, .14); }); return; }
    if (kind === 'danger') { osc('sawtooth', 220, 150, t, .6, .12); osc('sawtooth', 311, 210, t, .6, .12); noise(t, .5, .1, 'lowpass', 600, 1); return; }
    // reveal: a held minor third that swells, with a glassy bell on top
    osc('sine', 220, 220, t, 1.6, .16); osc('sine', 261.6, 261.6, t, 1.6, .13); osc('sine', 880, 880, t + .25, 1.4, .06); osc('sine', 1318, 1318, t + .27, 1.2, .04);
  };
  T.steps = function (n, pan) {
    if (!live()) return; n = n || 4; var t = ac.currentTime + .02, p = pan == null ? -.8 : pan;
    for (var i = 0; i < n; i++) {
      var k = i / Math.max(1, n - 1), v = .05 + k * .22, tt = t + i * (.42 - k * .1), pp = p * (1 - k);
      noise(tt, .09, v, 'lowpass', 420, .8, pp); osc('sine', 100, 55, tt, .1, v * 1.4, pp);
    }
  };
  T.whoosh = function (pan) { if (!live()) return; var t = ac.currentTime + .01; noise(t, .32, .09, 'bandpass', 300, 1.2, pan || 0, 2600); };
  T.countdown = function (onStep, onDone) {
    var N = 3;
    for (var i = 0; i < N; i++) (function (i) {
      setTimeout(function () {
        if (live()) { var t = ac.currentTime + .005; osc('square', 440 + i * 110, 440 + i * 110, t, .18, .09); osc('sine', 110, 60, t, .2, .3); }
        if (onStep) try { onStep(N - i); } catch (e) {}
      }, i * 800);
    })(i);
    setTimeout(function () {
      if (live()) { var t = ac.currentTime + .005; osc('square', 990, 990, t, .5, .1); osc('square', 1320, 1320, t, .5, .07); osc('sine', 95, 40, t, .6, .5); }
      if (onDone) try { onDone(); } catch (e) {}
    }, N * 800);
  };

  /* ---- anticipation cues (new): the sounds of "something is about to happen" ---- */
  function buzz(p) { try { if (enabled && !muted() && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  T.buzz = buzz;
  // before a pattern is played: a held breath, a faint rising glide and two soft ticks
  T.listen = function () {
    if (!live()) return; var t = ac.currentTime + .02;
    noise(t, 1.3, .07, 'bandpass', 380, 1.1, 0, 1700);
    osc('sine', 247, 392, t, 1.3, .05);
    osc('sine', 880, 880, t + 1.1, .12, .05); osc('sine', 1175, 1175, t + 1.25, .18, .05);
  };
  // your turn: a bright bell that blooms, so you know the floor is yours
  T.yourTurn = function () {
    if (!live()) return; var t = ac.currentTime + .01;
    osc('sine', 988, 988, t, .6, .12); osc('sine', 1976, 1976, t, .35, .04); osc('sine', 1319, 1319, t + .12, .6, .09);
    buzz(25);
  };
  // a nervous person has just given something away: a thin whine that rises while the window is open
  T.tell = function () {
    if (!live()) return; var t = ac.currentTime + .01;
    osc('sine', 520, 1500, t, .7, .05); osc('triangle', 1040, 3000, t, .7, .02);
  };
  // a wooden floor, a rope, a door: slow and uneasy
  T.creak = function (pan) {
    if (!live()) return; var t = ac.currentTime + .02, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(), l = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(150, t + .5); o.frequency.linearRampToValueAtTime(110, t + .95);
    l.frequency.value = 23; lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 6;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.055, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + 1);
    o.connect(f); f.connect(g); g.connect(gainNode(1, pan || 0)); o.start(t); l.start(t); o.stop(t + 1.05); l.stop(t + 1.05);
  };
  // someone is coming for you: footsteps that close in, a rustle, then a short sting of alarm
  T.approach = function (pan) {
    if (!live()) return; T.steps(5, pan == null ? -.85 : pan);
    setTimeout(function () { if (live()) { T.creak(0); } }, 1500);
    setTimeout(function () { T.alert(); buzz([40, 50, 40]); }, 2100);
  };
  // a swindler's smile: two out-of-tune pipes that slide apart. Used when a decoy is about to bite.
  T.sly = function () {
    if (!live()) return; var t = ac.currentTime + .02;
    osc('triangle', 392, 370, t, .5, .07); osc('triangle', 415, 350, t, .5, .06); osc('sine', 1568, 1480, t + .1, .35, .03);
  };
  // you spotted the lie: a short, satisfying "click-shut" plus a rising pair
  T.caught = function () {
    if (!live()) return; var t = ac.currentTime + .01;
    noise(t, .05, .12, 'bandpass', 2600, 6); osc('triangle', 523, 523, t + .06, .3, .12); osc('triangle', 784, 784, t + .16, .45, .12);
    buzz(35);
  };
  // which layers a game wants. Siege has its own heartbeat and drone, so it switches ours off.
  T.layers = function (o) { o = o || {}; if (o.heart != null) layers.heart = !!o.heart; if (o.dread != null) layers.dread = !!o.dread; if (!layers.dread) fadeDread(); };

  T.active = function () { return !!(live() && layers.heart && Math.max(lvl, held) >= .3); };
  T.hold = function (l) { held = l == null ? 0 : Math.max(0, Math.min(1, +l || 0)); };
  T.level = function (l) { lvl = Math.max(0, Math.min(1, +l || 0)); };
  T.enable = function (on) { enabled = !!on; try { localStorage.setItem('dt_tense', on ? '1' : '0'); } catch (e) {} if (!enabled) fadeDread(); };
  T.enabled = function () { return enabled; };
  w.Tense = T;

  /* ---- hook the Atmos layer, so every game gets these sounds for free ---- */
  var A = w.Atmos;
  if (A && !A.__tense) {
    A.__tense = 1;
    var d0 = A.danger, l0 = A.letterbox, c0 = A.cut;
    A.danger = function (l) { var r = d0.apply(A, arguments); lvl = Math.max(0, Math.min(1, +l || 0)); return r; };
    A.letterbox = function (on, ms) {
      var r = l0.apply(A, arguments);
      if (on) { if (ms && ms <= 9000) T.riser(2800); else T.dread(true); }
      else T.dread(false);
      return r;
    };
    A.cut = function () {
      var r = c0.apply(A, arguments), n = Date.now();
      if (n - lastCut > 900) { lastCut = n; T.whoosh(0); }
      return r;
    };
  }
})(window);
