/* arsenal.js: funds, contracts (tasks), modern weapons, vehicles and their synthesized sounds.
   Funds persist across all three games. Contracts pay funds or a free weapon crate. All sound is generated live. */
(function (w) {
  'use strict';
  var KEY = 'det_funds_v1', AC = null, NB = null, R = { game: '', c: {}, tasks: [], crates: {}, done: {} };
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  var P = load(); P.funds = P.funds || 0;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  /* a new player starts with a large purse, once only */
  var START = 5000;
  if (!P.started) { P.started = 1; P.funds += START; save(); }

  /* ---------- catalogue ---------- */
  var ITEMS = {
    pistol: { n: 'semi-automatic pistol', cost: 150, kind: 'gun', what: 'Officers carry it. Raises the strength of one sector by 3 percent.' },
    rifle: { n: 'semi-automatic rifle', cost: 300, kind: 'gun', what: 'Accurate fire from the wall. Raises one sector by 6 percent.' },
    smg: { n: 'submachine gun', cost: 450, kind: 'gun', what: 'Fast bursts at close range. Raises one sector by 8 percent.' },
    mg: { n: 'belt-fed machine gun', cost: 700, kind: 'gun', what: 'Sweeps the ladders off the wall. Raises one sector by 15 percent and counters ladders.' },
    rpg: { n: 'rocket-propelled grenade launcher', cost: 800, kind: 'gun', what: 'Smashes rams and siege towers. Counters both in its sector.' },
    sniper: { n: 'sniper rifle', cost: 600, kind: 'gun', what: 'Picks off enemy officers. Weakens the enemy army by 4 percent at once.' },
    aa: { n: 'shoulder-fired anti-air missile', cost: 650, kind: 'gun', what: 'Protects against enemy aircraft and gives the next air strike extra effect.' },
    car: { n: 'armoured car', cost: 900, kind: 'veh', what: 'Moves orders and officers fast. You get one extra order every day.' },
    bike: { n: 'power bike courier', cost: 500, kind: 'veh', what: 'A rider that cannot be caught. The relief army arrives one day sooner and one rider counts as through.' },
    boat: { n: 'armed war boat', cost: 1100, kind: 'veh', what: 'Guards the River Gate. Adds 15 percent there and counters enemy boats.' },
    jet: { n: 'fighter jet strike', cost: 1500, kind: 'veh', what: 'An air strike on the enemy camp. Cuts their army by 15 percent and delays all their weapons by two days.' }
  };

  /* ---------- sound ---------- */
  function ctx() { if (!AC) { try { AC = new (w.AudioContext || w.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === 'suspended') AC.resume(); return AC; }
  function nbuf(c) { if (!NB) { NB = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); var d = NB.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return NB; }
  function out(c, pan) { var g = c.createGain(); g.gain.value = .55; var p = c.createStereoPanner ? c.createStereoPanner() : null; if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(c.destination); } else g.connect(c.destination); return g; }
  function noise(c, o, t, d, type, f0, f1, v, pan) {
    var s = c.createBufferSource(); s.buffer = nbuf(c); var f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    var g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(.01, d / 4)); g.gain.exponentialRampToValueAtTime(.001, t + d);
    s.connect(f); f.connect(g); g.connect(o); s.start(t, Math.random()); s.stop(t + d + .05);
  }
  function osc(c, o, t, d, type, f0, f1, v) {
    var s = c.createOscillator(); s.type = type; s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
    var g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(g); g.connect(o); s.start(t); s.stop(t + d + .05);
  }
  function shot(c, o, t, big, v) { noise(c, o, t, big ? .16 : .08, 'highpass', big ? 900 : 1400, 300, v, 0); osc(c, o, t, big ? .12 : .07, 'sine', big ? 150 : 200, 45, v * .9); }
  function boom(c, o, t, v) { noise(c, o, t, 1.4, 'lowpass', 1100, 90, v, 0); osc(c, o, t, 1.1, 'sine', 95, 28, v); }
  var SND = {
    pistol: function (c, o, t) { shot(c, o, t, 0, .7); },
    rifle: function (c, o, t) { for (var i = 0; i < 3; i++) shot(c, o, t + i * .24, 1, .75); },
    smg: function (c, o, t) { for (var i = 0; i < 8; i++) shot(c, o, t + i * .065, 0, .55); },
    mg: function (c, o, t) { for (var i = 0; i < 18; i++) shot(c, o, t + i * .075, 1, .5); },
    sniper: function (c, o, t) { shot(c, o, t, 1, 1); noise(c, o, t + .08, .9, 'bandpass', 1800, 400, .25, 0); },
    rpg: function (c, o, t) { noise(c, o, t, .9, 'bandpass', 400, 2600, .5, 0); osc(c, o, t, .9, 'sawtooth', 220, 700, .12); boom(c, o, t + 1, 1); },
    explosion: function (c, o, t) { boom(c, o, t, 1); },
    aa: function (c, o, t) { noise(c, o, t, .7, 'bandpass', 600, 3000, .45, 0); boom(c, o, t + 1.3, .8); },
    jet: function (c, o, t) { noise(c, o, t, 3, 'bandpass', 300, 2400, .7, 0); osc(c, o, t, 3, 'sawtooth', 160, 480, .16); boom(c, o, t + 3, .9); },
    car: function (c, o, t) { osc(c, o, t, .6, 'sawtooth', 70, 140, .22); osc(c, o, t + .6, 1, 'sawtooth', 140, 90, .2); noise(c, o, t, 1.6, 'lowpass', 500, 300, .1, 0); },
    bike: function (c, o, t) { osc(c, o, t, .5, 'sawtooth', 120, 300, .2); osc(c, o, t + .5, .5, 'sawtooth', 300, 420, .18); osc(c, o, t + 1, 1, 'sawtooth', 420, 160, .18); },
    boat: function (c, o, t) { osc(c, o, t, 1.2, 'sine', 196, 190, .35); osc(c, o, t, 1.2, 'sine', 247, 240, .3); noise(c, o, t + 1.2, 1.2, 'lowpass', 400, 200, .12, 0); },
    cash: function (c, o, t) { osc(c, o, t, .25, 'sine', 880, 880, .3); osc(c, o, t + .12, .4, 'sine', 1320, 1320, .3); }
  };
  function snd(name, pan, delay) {
    var c = ctx(); if (!c || !SND[name]) return; var o = out(c, pan); SND[name](c, o, c.currentTime + .02 + (delay || 0));
  }
  /* at nightfall every sector fires the guns it owns, left to right */
  function nightFire(S, PAN) {
    var d = 0; ['W', 'N', 'R'].forEach(function (s) {
      var g = (S.gear || {})[s] || {}, p = PAN ? PAN[s] : 0;
      ['mg', 'smg', 'rifle', 'pistol'].some(function (k) { if (g[k]) { snd(k, p, d); d += .6; return true; } });
      if (g.rpg) { snd('rpg', p, d); d += 1.6; }
      if (g.sniper) { snd('sniper', p, d); d += .5; }
      if (g.boat) { snd('boat', p, d); d += .8; }
    });
  }

  /* ---------- contracts (tasks) ---------- */
  var TASKS = {
    siege: [
      { id: 'scout', k: 'scout', n: 3, t: 'Scout the enemy three times', r: { funds: 300 } },
      { id: 'hold', k: 'hold', n: 3, t: 'Hold three nights without a fall', r: { funds: 450 } },
      { id: 'counter', k: 'counter', n: 2, t: 'Counter two enemy weapons with the right answer', r: { crate: 'rifle' } },
      { id: 'raid', k: 'raid', n: 1, t: 'Launch one successful raid', r: { funds: 350 } },
      { id: 'bait', k: 'bait', n: 1, t: 'Feed the spy a false report', r: { crate: 'smg' } },
      { id: 'perfect', k: 'perfect', n: 1, t: 'Win one night perfectly', r: { crate: 'rpg' } },
      { id: 'sortie', k: 'sally', n: 1, t: 'Make a sortie', r: { funds: 500 } }
    ],
    balogun: [
      { id: 'reassure', k: 'reassure', n: 2, t: 'Reassure two witnesses', r: { funds: 300 } },
      { id: 'streak', k: 'right', n: 3, t: 'Answer three law questions correctly', r: { funds: 250 } },
      { id: 'bargain', k: 'bargain', n: 1, t: 'Win legal leverage by bargaining', r: { funds: 350 } },
      { id: 'clues', k: 'stall', n: 4, t: 'Visit every stall', r: { funds: 400 } }
    ],
    echo: [
      { id: 'clues', k: 'clue', n: 6, t: 'Collect six clues', r: { funds: 350 } },
      { id: 'clues2', k: 'clue', n: 10, t: 'Collect ten clues', r: { funds: 500 } }
    ]
  };
  function begin(game) {
    R = { game: game, c: {}, tasks: [], crates: {}, done: {} };
    var pool = (TASKS[game] || []).slice(), n = Math.min(3, pool.length);
    while (n-- > 0) R.tasks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  function count(k, n) { R.c[k] = (R.c[k] || 0) + (n || 1); return check(); }
  function setc(k, v) { if (v > (R.c[k] || 0)) R.c[k] = v; return check(); }
  /* returns spoken text for any contract just completed, and pays it out */
  function check() {
    var m = [];
    R.tasks.forEach(function (t) {
      if (R.done[t.id] || (R.c[t.k] || 0) < t.n) return;
      R.done[t.id] = 1;
      if (t.r.funds) { P.funds += t.r.funds; m.push('Contract complete: ' + t.t + '. You earn ' + t.r.funds + ' funds.'); }
      if (t.r.crate) { R.crates[t.r.crate] = (R.crates[t.r.crate] || 0) + 1; m.push('Contract complete: ' + t.t + '. A free ' + ITEMS[t.r.crate].n + ' is waiting at the armoury.'); }
    });
    if (m.length) { save(); snd('cash', 0); var s = m.join(' '); if (w.Access && Access.say) setTimeout(function () { Access.say(s); }, 400); }
    return m.join(' ');
  }
  function brief() {
    var open = R.tasks.filter(function (t) { return !R.done[t.id]; });
    return open.length ? 'Contracts: ' + open.map(function (t) { return t.t + ' (' + Math.min(R.c[t.k] || 0, t.n) + ' of ' + t.n + ')'; }).join('; ') + '.' : 'All contracts complete.';
  }
  function award(n) { if (n > 0) { P.funds += n; save(); snd('cash', 0); } return P.funds; }
  function buy(id) {
    var it = ITEMS[id]; if (!it) return { ok: false, msg: 'Unknown item.' };
    if (R.crates[id] > 0) { R.crates[id]--; return { ok: true, free: true, msg: 'You collect the free ' + it.n + '.' }; }
    if (P.funds < it.cost) return { ok: false, msg: 'You need ' + it.cost + ' funds for the ' + it.n + ' and have ' + P.funds + '.' };
    P.funds -= it.cost; save(); return { ok: true, msg: 'Bought the ' + it.n + ' for ' + it.cost + ' funds. ' + P.funds + ' left.' };
  }
  w.Arsenal = { ITEMS: ITEMS, begin: begin, count: count, set: setc, check: check, brief: brief, award: award, buy: buy, snd: snd, nightFire: nightFire,
    funds: function () { return P.funds; }, crates: function () { return R.crates; }, tasks: function () { return R.tasks; }, done: function () { return R.done; } };
})(window);
