/* siegecore.js - the rules of "Siege of Ilesanmi: Reforged" (no screen, no sound: pure logic)

   You hold a walled citadel with three sectors: the West Gate (W), the North Wall (N), the River Gate (R).
   A besieging army hammers it every night. Hold until the relief army comes, break the enemy's will,
   or gamble everything on a grand sortie.

   WHAT MAKES IT A STRATEGY GAME
   1. The enemy brings DIFFERENT WEAPONS to different sectors: ladders, rams (gates), siege towers (north),
      sappers (west, north) and river boats. Each is beaten by a specific counter, and each arrives on its own day.
   2. You can build PERMANENT WORKS: archer platforms, counter-mines, a river boom. Timber is scarce.
   3. At dusk you LISTEN to the night (the weapons make different sounds), then spend command points on
      oil, fire arrows, sallies and bracing, sector by sector. Oil is limited, so you cannot counter everything.
   4. One of your three informants is the ENEMY'S SPY (it is random). Question them, set a bait,
      read the evidence, then arrest the right person. Arrest the wrong one and you pay for it.
   5. When a sector wavers you choose: commit the reserve, fall back behind the inner wall, or hold.
      A breach is no longer instant defeat, it is an open wound you must seal. Two open breaches lose the citadel.
   6. Three ways to win: outlast the siege (and send riders to hurry the relief), break the enemy's will,
      or, when he is shaken, launch the grand sortie.
   Nothing in this file touches the DOM.                                                                       */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Siege = factory();
})(this, function () {
  'use strict';
  var SECT = ['W', 'N', 'R'];
  var NAME = { W: 'the West Gate', N: 'the North Wall', R: 'the River Gate', res: 'the reserve' };
  var SHORT = { W: 'West', N: 'North', R: 'River', res: 'Reserve' };
  var SRCS = ['adaora', 'sule', 'kolade'];
  var SRCNAME = { adaora: 'Adaora', sule: 'Baba Sule', kolade: 'Kolade' };

  var TYPES = {
    ladders: { eng: 1.0, where: ['W', 'N', 'R'], ready: 1, name: 'scaling ladders', hear: 'a rattle of ladders and a rising roar' },
    ram: { eng: 1.3, where: ['W', 'R'], ready: 3, name: 'a battering ram', hear: 'a slow, heavy thudding, like a ram' },
    tower: { eng: 1.35, where: ['N'], ready: 5, name: 'a siege tower', hear: 'groaning timber and creaking wheels, like a siege tower' },
    sappers: { eng: 1.15, where: ['W', 'N'], ready: 3, name: 'sappers', hear: 'scratching and muffled digging underground, like sappers' },
    boats: { eng: 1.25, where: ['R'], ready: 4, name: 'river boats', hear: 'splashing oars in the dark, like boats' }
  };
  var TKEYS = ['ladders', 'ram', 'tower', 'sappers', 'boats'];
  var WORKS = {
    plat: { name: 'an archer platform', cost: 2, where: ['W', 'N', 'R'], what: 'Fire arrows here cost no oil, and the sector fights ten percent better.' },
    mine: { name: 'a counter-mine', cost: 3, where: ['W', 'N'], what: 'Sappers here are caught underground and cannot hurt the wall.' },
    boom: { name: 'a river boom', cost: 3, where: ['R'], what: 'A chain across the river blunts the boats.' }
  };

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function total(S) { return S.troops.W + S.troops.N + S.troops.R + S.troops.res; }
  function pick(rng, a) { return a[Math.floor(rng() * a.length)]; }

  var DIFF = {
    easy: { str: 195, food: 11, oil: 4, timber: 7, morale: 8, eb: 1, ap: 4 },
    hard: { str: 232, food: 10, oil: 3, timber: 6, morale: 7, eb: 0, ap: 4 },
    warlord: { str: 272, food: 9, oil: 3, timber: 5, morale: 6, eb: -1, ap: 4 }
  };
  function blank() { return { right: 0, wrong: 0, slips: 0, exposed: false, turned: false, jailed: false, qDay: 0 }; }

  function newGame(rng, opts) {
    rng = rng || Math.random; opts = opts || {};
    var d = DIFF[opts.diff] ? opts.diff : 'easy', P = DIFF[d], mr = rng();
    return {
      rng: rng, diff: d, easy: d === 'easy', day: 1, ap: P.ap, apMax: P.ap, R: 9 + Math.floor(rng() * 3), relief: false,
      troops: { W: 30, N: 30, R: 30, res: 30 }, wall: { W: 8, N: 8, R: 8 }, works: { W: {}, N: {}, R: {} }, breach: { W: false, N: false, R: false },
      food: P.food, timber: P.timber, oil: P.oil, morale: P.morale, ration: 'full', starve: 0,
      enemy: { str: P.str, morale: 8, rest: false, ready: { ladders: 1, ram: 3 + P.eb, sappers: 3 + P.eb, boats: 4 + P.eb, tower: 5 + P.eb } },
      mole: mr < .5 ? 'kolade' : mr < .75 ? 'adaora' : 'sule',
      src: { adaora: blank(), sule: blank(), kolade: blank() }, post: { kolade: .5, adaora: .25, sule: .25 },
      plan: null, fed: null, bait: null, baitTaken: false, ambush: null, pending: null, rain: false, raid: { W: 1, N: 1, R: 1 }, truce: false,
      reports: [], scouted: {}, cmd: [], cp: 0, heard: null, news: [], over: null, usedEvents: [], hints: 0, score: 0,
      riders: { sent: 0, ok: 0 }, sortieDone: false,
      stats: { held: 0, breached: 0, raids: 0, truces: 0, scouts: 0, commits: 0, counters: 0, sallies: 0, baits: 0, falls: 0, perfect: 0, wrongArrest: 0 }
    };
  }

  function mFactor(S) { return 0.85 + 0.03 * S.morale; }
  function wallF(S, s) { return 0.6 + 0.07 * S.wall[s]; }
  function hasCmd(cmds, k, s) { for (var i = 0; i < (cmds || []).length; i++) if (cmds[i].k === k && cmds[i].s === s) return true; return false; }
  function defence(S, s, extraRes, cmds) {
    var f = (S.troops[s] + (extraRes || 0)) * wallF(S, s) * mFactor(S);
    if (S.works[s].plat) f *= 1.1;
    if (S.breach[s]) f *= 0.7;
    if (hasCmd(cmds, 'brace', s)) f *= 1.15;
    if (S.ambush === s) f *= 1.2;
    return f;
  }
  function classify(r) { return r >= 1.4 ? 'held' : r >= 1.0 ? 'costly' : r >= 0.55 ? 'wavering' : 'breach'; }
  function ready(S, t) { return S.day >= S.enemy.ready[t]; }
  function avail(S, s) { return TKEYS.filter(function (t) { return TYPES[t].where.indexOf(s) >= 0 && ready(S, t); }); }
  function moleActive(S) { var r = S.src[S.mole]; return !r.exposed && !r.jailed; }
  function other(S, not) { return pick(S.rng, SECT.filter(function (s) { return s !== not; })); }
  function loseTroops(S, n) {
    var order = ['res', 'W', 'N', 'R'];
    for (var i = 0; i < order.length && n > 0; i++) { var k = order[i], t = Math.min(S.troops[k], n); S.troops[k] -= t; n -= t; }
  }
  function cpMax(S) { return 2 + (S.morale >= 8 ? 1 : 0); }

  function setup(S, W, N, R, res) {
    if (W + N + R + res !== 120 || [W, N, R, res].some(function (x) { return x < 0; })) return false;
    S.troops = { W: W, N: N, R: R, res: res }; return true;
  }

  /* ---- the enemy's plan for tonight: who, where, with what ---- */
  function counteredByWork(S, s, t) { return (t === 'sappers' && S.works[s].mine) || (t === 'boats' && S.works[s].boom); }
  function planNight(S) {
    var rng = S.rng, w = {}, leak = moleActive(S) && S.day >= 3;
    SECT.forEach(function (s) {
      var d = defence(S, s, 0) + S.troops.res * 0.25;
      w[s] = 1 + Math.max(0, (60 - d) / 60) * 2.2 + rng() * (leak ? 0.35 : 0.8) + (S.breach[s] ? 1.2 : 0);
    });
    var order = SECT.slice().sort(function (a, b) { return w[b] - w[a]; });
    var plan = { main: order[0], feint: order[1], probe: order[2], type: {} };
    SECT.forEach(function (s) {
      var av = avail(S, s), t = 'ladders';
      if (s === plan.main) {
        var bv = 0;
        av.forEach(function (k) { var v = TYPES[k].eng; if (counteredByWork(S, s, k) && (leak || rng() < 0.4)) v = 0.9; v *= (0.85 + rng() * 0.3); if (v > bv) { bv = v; t = k; } });
      } else t = rng() < 0.45 ? 'ladders' : pick(rng, av);
      plan.type[s] = t;
    });
    S.plan = plan; return plan;
  }

  /* ---- what your informants tell you at dawn ---- */
  var PCORR = { adaora: .58, sule: .5, kolade: .62 };
  function pCorrect(S, src, h, day, rain) {
    if (src === h) return day < 3 ? 0.95 : 0.05;
    var b = PCORR[src]; if (src === 'adaora') b += (S.easy ? .12 : 0) - (rain ? .2 : 0);
    return clamp(b, .05, .95);
  }
  function weakest(S) { return SECT.slice().sort(function (a, b) { return defence(S, a, 0) - defence(S, b, 0); })[0]; }
  function strongest(S) { return SECT.slice().sort(function (a, b) { return defence(S, b, 0) - defence(S, a, 0); })[0]; }
  function makeReports(S) {
    var rng = S.rng, p = S.plan, out = [];
    SRCS.forEach(function (src) {
      var rec = S.src[src]; if (rec.exposed || rec.jailed) return;
      var armed = S.mole === src && S.day >= 3, claim, type = null, conf = 'fairly sure';
      if (src === 'sule') claim = armed ? strongest(S) : weakest(S);
      else {
        var ok = armed ? false : rng() < pCorrect(S, src, 'none', S.day, S.rain);
        claim = ok ? p.main : other(S, p.main);
        if (src === 'kolade') conf = 'certain'; else conf = rng() < (ok ? 0.7 : 0.55) ? 'fairly sure' : 'not certain';
      }
      if (src === 'adaora') {
        var av = TKEYS.filter(function (t) { return TYPES[t].where.indexOf(claim) >= 0; });
        type = (claim === p.main && rng() < 0.7) ? p.type[claim] : pick(rng, av);
      }
      out.push({ src: src, claim: claim, conf: conf, type: type, day: S.day });
    });
    S.reports = out; S.scouted = {};
    return out;
  }

  /* ---- dawn: relief check, events, fresh plan and reports ---- */
  var EVENTS = [
    { id: 'rain', min: 2, text: 'Dark clouds roll in from the river. Rain tonight. Ladders will slip, but oil and fire will struggle too.', sfx: 'rain', apply: function (S) { S.rain = true; } },
    { id: 'griot', min: 2, text: 'At dawn an old griot climbs the wall and sings of the city\'s first defenders. The soldiers stand taller.', sfx: 'song', apply: function (S) { S.morale = clamp(S.morale + 1, 0, 10); } },
    { id: 'convoy', min: 2, text: 'Farmers slip two boat-loads of yams and dried fish through the reeds to the River Gate. Food is up by two, and they leave a jar of pitch.', sfx: 'water', apply: function (S) { S.food += 2; S.oil += 1; } },
    { id: 'crack', min: 3, text: 'A stretch of old wall groans and slumps in the night. One sector has lost a little strength.', sfx: 'rumble', apply: function (S) { var s = pick(S.rng, SECT); S.wall[s] = Math.max(1, S.wall[s] - 1); S.eventSector = s; } },
    { id: 'column', min: 4, text: 'Dust on the northern road. A second enemy column has joined the besiegers. Their army has grown.', sfx: 'horn', apply: function (S) { S.enemy.str += 30; } },
    { id: 'defectors', min: 3, text: 'Three enemy soldiers slip over the wall at dawn, starving and afraid. They talk.', sfx: 'steps', apply: function (S) { var ok = S.rng() < 0.8; S.reports.defectors = { src: 'defectors', claim: ok ? S.plan.main : other(S, S.plan.main), conf: 'fairly sure', type: null, day: S.day }; S._defectors = true; } },
    {
      id: 'fever', min: 2, sfx: 'cough', choice: true, text: 'Fever in the barracks. Many soldiers cannot stand. Quarantine the sick, or tend them openly?',
      opts: [
        { t: 'Quarantine them. Eight soldiers are lost to the sickhouse, and spirits sink.', f: function (S) { loseTroops(S, 8); S.morale = clamp(S.morale - .5, 0, 10); return 'The sick are sealed in the east tower. Eight soldiers are gone from the line.'; } },
        { t: 'Tend them openly. It costs food, and the fever may spread.', f: function (S) { S.food = Math.max(0, S.food - 1.5); loseTroops(S, 3); if (S.rng() < .35) { loseTroops(S, 8); return 'You tend the sick. The fever spreads anyway: eleven soldiers are lost, and food is down.'; } S.morale = clamp(S.morale + .5, 0, 10); return 'You tend the sick. Only three die, and the garrison respects you for it. Food is down.'; } }
      ]
    },
    {
      id: 'refugees', min: 2, sfx: 'steps', choice: true, text: 'Hundreds of refugees crowd the gate, begging to be let in. Among them are men who can fight.',
      opts: [
        { t: 'Open the gate to all. Food falls by two, twelve militia join the reserve, and a saboteur may slip in.', f: function (S) { S.food = Math.max(0, S.food - 2); S.troops.res += 12; S.morale = clamp(S.morale + .5, 0, 10); if (S.rng() < .25) { S.timber = Math.max(0, S.timber - 2); S.oil = Math.max(0, S.oil - 1); return 'The gates open. Twelve militia join the reserve, but in the night a fire in the stores costs you timber and oil.'; } return 'The gates open. Twelve militia join the reserve, and the people bless your name. Food is down.'; } },
        { t: 'Admit only the fit men. Food falls by one, six soldiers join.', f: function (S) { S.food = Math.max(0, S.food - 1); S.troops.res += 6; return 'Six fit men are admitted. The rest weep outside the wall.'; } },
        { t: 'Turn them all away. The garrison is troubled.', f: function (S) { S.morale = clamp(S.morale - 1, 0, 10); return 'The gate stays shut. The sound of weeping carries all night, and the soldiers do not meet your eye.'; } }
      ]
    },
    {
      id: 'merchant', min: 3, sfx: 'water', choice: true, text: 'A river trader has slipped past the enemy pickets. He offers to trade at a price.',
      opts: [
        { t: 'Three days of food for three loads of oil.', f: function (S) { if (S.food < 4) return 'You cannot spare the food. The trader shrugs and drifts away.'; S.food -= 3; S.oil += 3; return 'Three days of food for three loads of oil. The stores are leaner, but the cauldrons are full.'; } },
        { t: 'Two days of food for three loads of timber.', f: function (S) { if (S.food < 3) return 'You cannot spare the food. The trader shrugs and drifts away.'; S.food -= 2; S.timber += 3; return 'Two days of food for three loads of timber. The masons smile.'; } },
        { t: 'Send him away.', f: function () { return 'The trader vanishes into the reeds.'; } }
      ]
    },
    {
      id: 'envoy', min: 4, sfx: 'horn', choice: true, text: 'Zarkan\'s envoy rides to the gate with an offer of gold and safe passage for your captains.',
      opts: [
        { t: 'Refuse him in front of the garrison. Morale rises.', f: function (S) { S.morale = clamp(S.morale + .7, 0, 10); return 'You throw his gold from the wall. The garrison roars.'; } },
        { t: 'Hear him out to learn what you can. It may shake the garrison.', f: function (S) { var ok = S.rng() < .8, c = ok ? S.plan.main : other(S, S.plan.main); S.reports.defectors = { src: 'defectors', claim: c, conf: 'fairly sure', type: null, day: S.day }; S._defectors = true; if (S.rng() < .3) { S.morale = clamp(S.morale - 1, 0, 10); return 'The envoy lets slip where tonight\'s blow will fall, but word of the meeting spreads and the soldiers whisper.'; } return 'The envoy boasts too much. You learn where he thinks tonight\'s blow will fall.'; } }
      ]
    }
  ];
  var FORE = { ram: 'Hammering all night in the enemy camp: a battering ram is almost finished.', tower: 'Tall timbers rise behind the enemy lines: a siege tower will roll tomorrow.', sappers: 'Enemy diggers were seen crawling toward the wall: sappers will start work tomorrow.', boats: 'Flat boats are being dragged to the river: tomorrow they may land at the River Gate.' };
  var NOW = { ram: 'The enemy ram is finished. Expect it at a gate tonight.', tower: 'The siege tower is finished. Expect it at the North Wall.', sappers: 'The enemy sappers are ready. Expect tunnelling at the West Gate or North Wall.', boats: 'The enemy boats are on the river. Expect a landing at the River Gate.' };
  function beginDay(S) {
    S.eventText = null; S.eventSfx = null; S.eventSector = null; S._defectors = false; S.pending = null; S.news = []; S.eventResult = null; S.eventId = null;
    if (S.day >= S.R) { S.over = { win: true, kind: 'relief' }; S.score += 60; return S; }
    S.ap = S.apMax; S.fed = null; S.bait = null; S.baitTaken = false; S.ambush = null; S.truce = false; S.cmd = []; S.cp = 0; S.heard = null;
    S.raid = { W: 1, N: 1, R: 1 }; S.rain = false;
    SRCS.forEach(function (k) { S.src[k].qDay = 0; });
    planNight(S);
    var ev = null;
    if (S.day === 4 && !S.relief) { S.relief = true; ev = { id: 'rider', text: 'A rider, half dead from the road, brings word: the relief army will reach the pass at dawn on day ' + S.R + '. Hold until then.', sfx: 'horn' }; }
    else if (S.day >= 2 && S.rng() < 0.6) {
      var pool = EVENTS.filter(function (e) { return (e.id === 'rain' && S.day >= 2) || (S.day >= e.min && S.usedEvents.indexOf(e.id) < 0); });
      if (pool.length) { ev = pick(S.rng, pool); if (ev.id !== 'rain') S.usedEvents.push(ev.id); }
    }
    makeReports(S);
    if (ev && ev.apply) ev.apply(S);
    if (ev && ev.id === 'rain') makeReports(S);
    if (ev) { S.eventText = ev.text; S.eventSfx = ev.sfx; S.eventId = ev.id; }
    if (ev && ev.choice) S.pending = { id: ev.id, text: ev.text, opts: ev.opts.map(function (o) { return { t: o.t }; }), _o: ev.opts };
    TKEYS.forEach(function (t) {
      if (t === 'ladders') return; var r = S.enemy.ready[t];
      if (r === S.day + 1) S.news.push(FORE[t]);
      if (r === S.day) S.news.push(NOW[t]);
    });
    return S;
  }
  function resolveEvent(S, i) {
    var p = S.pending; if (!p || !p._o[i]) return { ok: false, msg: 'There is no such choice.' };
    var msg = p._o[i].f(S); S.pending = null; S.eventResult = msg; return { ok: true, msg: msg };
  }

  /* ---- orders (each returns {ok, msg, ...}) ---- */
  function need(S, cost) { return S.ap >= cost ? null : { ok: false, msg: 'You do not have enough orders left. That needs ' + cost + '.' }; }
  function needT(S, n) { return S.timber >= n ? null : { ok: false, msg: 'You need ' + n + ' loads of timber and have ' + Math.floor(S.timber) + '.' }; }
  function redeploy(S, from, to) {
    var e = need(S, 1); if (e) return e;
    if (from === to || S.troops[from] < 10) return { ok: false, msg: 'There are not enough soldiers there to move.' };
    var n = Math.min(20, S.troops[from]); S.troops[from] -= n; S.troops[to] += n; S.ap -= 1;
    return { ok: true, n: n, msg: n + ' soldiers march from ' + NAME[from] + ' to ' + NAME[to] + '.' };
  }
  function fortify(S, s) {
    var e = need(S, 1) || needT(S, 1); if (e) return e;
    if (S.wall[s] >= 10) return { ok: false, msg: 'That wall is already as strong as it can be.' };
    S.wall[s] = Math.min(10, S.wall[s] + 1.5); S.ap -= 1; S.timber -= 1;
    return { ok: true, msg: 'Masons rebuild ' + NAME[s] + ' through the afternoon. Its wall is now ' + (Math.round(S.wall[s] * 2) / 2) + ' of 10. One load of timber used.' };
  }
  function build(S, s, k) {
    var W = WORKS[k]; if (!W || W.where.indexOf(s) < 0) return { ok: false, msg: 'That cannot be built there.' };
    var e = need(S, 1) || needT(S, W.cost); if (e) return e;
    if (S.works[s][k]) return { ok: false, msg: 'You already have that there.' };
    S.works[s][k] = true; S.ap -= 1; S.timber -= W.cost;
    return { ok: true, msg: 'Your carpenters build ' + W.name + ' at ' + NAME[s] + '. ' + W.what + ' ' + W.cost + ' timber used.' };
  }
  function seal(S, s) {
    var e = need(S, 1) || needT(S, 2); if (e) return e;
    if (!S.breach[s]) return { ok: false, msg: 'There is no breach there.' };
    if (S.troops[s] < 10) return { ok: false, msg: 'There are too few soldiers there to seal it. Move some in first.' };
    S.breach[s] = false; S.wall[s] = Math.max(S.wall[s], 4); S.ap -= 1; S.timber -= 2;
    return { ok: true, msg: 'Soldiers and masons pile stone and timber into the gap at ' + NAME[s] + '. The breach is sealed, and the wall stands at four.' };
  }
  function scout(S, s) {
    var e = need(S, 1); if (e) return e;
    S.ap -= 1; S.stats.scouts++;
    if (S.rng() < 0.2) { S.morale = clamp(S.morale - 1, 0, 10); return { ok: true, lost: true, msg: 'The scout does not return. By evening his drum is silent, and the garrison knows it.' }; }
    var heavy = (S.plan.main === s) ? S.rng() < 0.88 : S.rng() < 0.12, t = S.plan.type[s];
    if (S.rng() > 0.9) t = pick(S.rng, avail(S, s));
    S.scouted[s] = { role: heavy ? 'heavy' : 'light', type: t };
    return { ok: true, lost: false, heavy: heavy, type: t, msg: heavy ? 'Your scout crawls back at dusk. Opposite ' + NAME[s] + ' he saw torches, ladders and the shape of ' + TYPES[t].name + '. A heavy assault is likely there.' : 'Your scout crawls back at dusk. Opposite ' + NAME[s] + ' he saw few fires and little movement. No heavy assault is likely there. He did see ' + TYPES[t].name + ' being readied.' };
  }
  function raid(S, target) {
    var e = need(S, 2); if (e) return e;
    S.ap -= 2; var win;
    if (target === 'supply') {
      win = S.rng() < 0.5;
      if (win) { S.enemy.morale = clamp(S.enemy.morale - 2, 0, 10); S.enemy.str = Math.max(0, S.enemy.str - 10); S.stats.raids++; S.score += 20; return { ok: true, win: true, msg: 'Your raiders slip out of the River Gate, set fire to the enemy supply wagons and vanish. Flames light the whole plain. Enemy spirits crack.' }; }
    } else if (TYPES[target] && target !== 'ladders') {
      win = S.rng() < 0.55;
      if (win) { S.enemy.ready[target] = Math.max(S.enemy.ready[target], S.day + 3); S.enemy.morale = clamp(S.enemy.morale - 0.5, 0, 10); S.stats.raids++; S.score += 15; return { ok: true, win: true, msg: 'Your raiders creep into the siege park and burn ' + TYPES[target].name + '. The enemy will need three days to build another.' }; }
    } else {
      win = S.rng() < 0.6;
      if (win) { S.raid[target] = 0.7; S.enemy.morale = clamp(S.enemy.morale - 0.5, 0, 10); S.stats.raids++; S.score += 8; return { ok: true, win: true, msg: 'Your raiders burn ladders and gear opposite ' + NAME[target] + '. Tonight\'s attack there will be weaker.' }; }
    }
    loseTroops(S, 15); S.morale = clamp(S.morale - 1, 0, 10);
    return { ok: true, win: false, msg: 'The raid is spotted. Fifteen soldiers never come back, and the garrison hears it from the survivors.' };
  }
  function parley(S) {
    var e = need(S, 2); if (e) return e;
    S.ap -= 2;
    if (S.rng() < 0.4) { S.truce = true; S.stats.truces++; TKEYS.forEach(function (t) { if (S.enemy.ready[t] > S.day) S.enemy.ready[t] -= 1; }); return { ok: true, win: true, msg: 'The enemy envoy agrees to a night of truce to bury the dead. No assault tonight. But your sentries report their engineers working through the dark.' }; }
    S.morale = clamp(S.morale - 1, 0, 10);
    return { ok: true, win: false, msg: 'The envoy laughs and demands surrender. Word spreads, and some of your soldiers wonder if you are afraid.' };
  }
  function rally(S) {
    var e = need(S, 1); if (e) return e;
    S.ap -= 1; S.morale = clamp(S.morale + 1, 0, 10); S.food = Math.max(0, S.food - 0.5);
    return { ok: true, msg: 'You share a meal with the soldiers on the wall and speak plainly about why this city matters. Morale rises, and the food stores shrink a little.' };
  }
  function forage(S) {
    var e = need(S, 1); if (e) return e;
    S.ap -= 1;
    if (S.rng() < 0.25) { loseTroops(S, 6); return { ok: true, win: false, msg: 'The foragers are ambushed outside the walls. Six soldiers do not come back, and they bring nothing.' }; }
    S.food += 1.5; S.timber += 2; S.oil += S.rng() < .35 ? 1 : 0;
    return { ok: true, win: true, msg: 'Parties slip out at first light and return with timber from the river orchards and sacks of grain. Food is up by one and a half, and timber by two.' };
  }
  function rider(S) {
    var e = need(S, 1); if (e) return e;
    if (S.riders.ok >= 2) return { ok: false, msg: 'Two riders have already got through. The relief army is marching as fast as it can.' };
    S.ap -= 1; S.riders.sent++;
    if (S.rng() < 0.5) { S.riders.ok++; S.R = Math.max(S.day + 2, S.R - 1); S.relief = true; return { ok: true, win: true, msg: 'Your rider slips through the enemy pickets. A drum answers from the ridge: the relief army will march harder. It will now reach the pass at dawn on day ' + S.R + '.' }; }
    S.morale = clamp(S.morale - .3, 0, 10);
    return { ok: true, win: false, msg: 'Your rider is cut down at the river crossing. His horse returns riderless at dusk.' };
  }
  function setRation(S, mode) { S.ration = mode; return { ok: true, msg: mode === 'full' ? 'Full rations: the garrison eats well, and the stores shrink by one a day.' : 'Short rations: the stores shrink by half a day, but hungry soldiers grumble.' }; }

  /* ---- counter-intelligence ---- */
  function normPost(S) {
    var t = 0, k; for (k in S.post) t += S.post[k];
    if (t <= 0) { SRCS.forEach(function (s) { S.post[s] = s === S.mole ? 1 : 0; }); return; }
    for (k in S.post) S.post[k] /= t;
  }
  function interrogate(S, src) {
    var e = need(S, 1); if (e) return e; var r = S.src[src];
    if (r.exposed || r.jailed) return { ok: false, msg: 'He is no longer with you.' };
    if (r.qDay === S.day) return { ok: false, msg: 'You have already questioned ' + SRCNAME[src] + ' today. He has nothing more to say.' };
    S.ap -= 1; r.qDay = S.day;
    var mole = S.mole === src, slip = S.rng() < (mole ? .65 : .2);
    SRCS.forEach(function (k) { S.post[k] *= k === src ? (slip ? .65 / .2 : .35 / .8) : 1; }); normPost(S);
    if (slip) r.slips++;
    return { ok: true, slip: slip, msg: slip ? 'You question ' + SRCNAME[src] + ' about the ridge camp. His story is smooth, but his eyes slide away when you ask about his family, and he asks twice how many soldiers you keep in reserve. Something is not right.' : 'You question ' + SRCNAME[src] + ' closely. His answers are steady and nothing in his story is out of place.' };
  }
  function bait(S, src, s) {
    var e = need(S, 1); if (e) return e; var r = S.src[src];
    if (r.exposed || r.jailed) return { ok: false, msg: 'He is no longer with you.' };
    if (S.bait) return { ok: false, msg: 'You have already whispered a secret today. Two lies would only muddy the water.' };
    S.ap -= 1; S.bait = { src: src, s: s }; S.stats.baits++;
    return { ok: true, msg: 'You take ' + SRCNAME[src] + ' aside and confide, as a great secret, that ' + NAME[s] + ' is thinly held tonight. If he is the spy, the enemy will hear it before dark. Watch where the main blow falls.' };
  }
  function arrest(S, src) {
    var e = need(S, 1); if (e) return e; var r = S.src[src];
    if (r.exposed || r.jailed) return { ok: false, msg: 'He is no longer with you.' };
    S.ap -= 1;
    if (S.mole === src) { r.exposed = true; S.post[src] = 1; SRCS.forEach(function (k) { if (k !== src) S.post[k] = 0; }); S.score += 35; return { ok: true, right: true, msg: SRCNAME[src] + ' is seized. A talking-drum token is sewn into his sandal. He is the enemy\'s spy.' }; }
    r.jailed = true; S.morale = clamp(S.morale - 2, 0, 10); S.stats.wrongArrest++; S.post[src] = 0; normPost(S);
    return { ok: true, right: false, msg: SRCNAME[src] + ' is seized, and nothing is found on him. He is innocent. The garrison is shaken, his reports are lost to you, and the real spy is still among your people.' };
  }
  function turnAgent(S) {
    var e = need(S, 1); if (e) return e; var k = S.src[S.mole];
    if (!k.exposed || k.turned) return { ok: false, msg: 'That is not possible now.' };
    S.ap -= 1; k.turned = true;
    return { ok: true, msg: 'You do not hang him. You offer him his life if he carries your words back to the enemy. He agrees, white-faced. From now on you can feed him false plans.' };
  }
  function feed(S, s) {
    var e = need(S, 1); if (e) return e; var k = S.src[S.mole];
    if (!k.turned) return { ok: false, msg: 'You have no turned agent to carry false plans.' };
    S.ap -= 1; S.fed = s;
    return { ok: true, msg: 'Your turned spy slips away with a careful lie: ' + NAME[s] + ' is thinly held tonight. Whether the enemy believes him, you will learn at dark.' };
  }

  /* ---- the grand sortie ---- */
  function sortieChance(S) { return clamp(0.25 + (5 - S.enemy.morale) * 0.1 + (total(S) / 120 - 0.5) * 0.4, 0.12, 0.85); }
  function canSortie(S) { return S.enemy.morale <= 4 && S.day >= 5 && !S.sortieDone; }
  function sortie(S) {
    var e = need(S, 2); if (e) return e;
    if (!canSortie(S)) return { ok: false, msg: 'The enemy is not shaken enough. A sortie now would be suicide.' };
    S.ap -= 2; S.sortieDone = true; var p = sortieChance(S);
    if (S.rng() < p) { S.over = { win: true, kind: 'sortie' }; S.score += 100; return { ok: true, win: true, msg: 'The gates fly open. Your whole garrison pours out at the enemy\'s shaken camp, and the Confederacy breaks and runs.' }; }
    loseTroops(S, 40); S.morale = clamp(S.morale - 2, 0, 10);
    return { ok: true, win: false, msg: 'The sortie is thrown back with terrible losses. Forty soldiers never return, and the garrison is stunned.' };
  }

  /* ---- dusk: the enemy decides, then you listen ---- */
  function hearType(S, s, t, lvl) {
    if (S.scouted[s]) return S.scouted[s].type;
    if (t === 'sappers' && S.works[s].mine) return 'sappers';
    if (t === 'boats' && S.works[s].boom) return 'boats';
    if (lvl < 0.3) return null;
    if (S.rng() < 0.72 + (S.works[s].plat ? 0.08 : 0)) return t;
    var av = avail(S, s).filter(function (x) { return x !== t; }); return av.length ? pick(S.rng, av) : t;
  }
  function dusk(S) {
    var rng = S.rng, p = S.plan, changed = false;
    function moveMain(to) {
      if (p.main === to) return false; var old = p.main, ot = p.type[old], tt = p.type[to];
      if (p.feint === to) p.feint = old; else p.probe = old;
      p.main = to; p.type[to] = ot; p.type[old] = tt; return true;
    }
    if (S.fed && rng() < 0.67) { changed = moveMain(S.fed); S.ambush = S.fed; }
    else if (S.bait && S.bait.src === S.mole && moleActive(S) && rng() < 0.85) { changed = moveMain(S.bait.s); S.baitTaken = true; S.ambush = S.bait.s; }
    var heard = {};
    SECT.forEach(function (s) {
      var base = p.main === s ? 1 : p.feint === s ? 0.6 : 0.35, lvl = clamp(base * (0.75 + rng() * 0.5), 0.1, 1);
      heard[s] = { lvl: lvl, type: hearType(S, s, p.type[s], lvl) };
    });
    S.heard = heard; S.cp = cpMax(S); S.cmd = [];
    return { changed: changed, heard: heard };
  }

  /* ---- battle orders at dusk ---- */
  var CMD = {
    oil: { name: 'Pour boiling oil', what: 'Costs one load of oil. Burns rams and ladders.' },
    fire: { name: 'Loose fire arrows', what: 'Costs one load of oil, or nothing with an archer platform. Burns towers and boats.' },
    sally: { name: 'Sally out', what: 'Costs six soldiers and may fail. Destroys any siege engine.' },
    brace: { name: 'Brace the wall', what: 'Free. The sector fights fifteen percent better and its wall takes less harm.' }
  };
  function addCmd(S, k, s) {
    if (S.cp < 1) return { ok: false, msg: 'You have no command points left.' };
    if (hasCmd(S.cmd, k, s)) return { ok: false, msg: 'That order is already given there.' };
    if (k === 'oil' && S.oil < 1) return { ok: false, msg: 'There is no oil left.' };
    if (k === 'fire' && !S.works[s].plat && S.oil < 1) return { ok: false, msg: 'There is no oil left, and no archer platform there.' };
    if (k === 'sally' && (S.troops[s] < 12 || S.breach[s])) return { ok: false, msg: 'There are too few soldiers there to sally.' };
    var free = k === 'fire' && !!S.works[s].plat;
    if (k === 'oil' || (k === 'fire' && !free)) S.oil -= 1;
    S.cmd.push({ k: k, s: s, free: free }); S.cp -= 1;
    return { ok: true, msg: CMD[k].name + ' at ' + NAME[s] + '.' };
  }
  function clearCmds(S) {
    S.cmd.forEach(function (c) { if (c.k === 'oil' || (c.k === 'fire' && !c.free)) S.oil += 1; });
    S.cmd = []; S.cp = cpMax(S); return { ok: true, msg: 'Orders cancelled. Your oil is returned to the cauldrons.' };
  }

  /* ---- the assault, stage 1 ---- */
  function loseAt(S, s, n) { S.troops[s] -= Math.min(S.troops[s], n); }
  function assault(S) {
    var rng = S.rng, p = S.plan, n = S.day, cmds = S.cmd;
    if (S.truce) return { truce: true, sec: {}, pending: [], cmd: cmds };
    var base = S.enemy.str * (0.235 + 0.021 * (n - 1)) * (0.6 + 0.04 * S.enemy.morale) * (S.enemy.rest ? 1.15 : 1);
    var MULT = { main: 1.25, feint: 0.34, probe: 0.17 }, sec = {}, pending = [], fx = S.rain ? 0.1 : 0;
    SECT.forEach(function (s) {
      var role = p.main === s ? 'main' : p.feint === s ? 'feint' : 'probe', t = p.type[s], A = base * MULT[role] * (0.9 + rng() * 0.2) * S.raid[s];
      var oil = hasCmd(cmds, 'oil', s), fire = hasCmd(cmds, 'fire', s), sal = hasCmd(cmds, 'sally', s), info = { type: t, answer: null, wallHit: 0, destroyed: false, sally: null };
      if (sal) {
        S.stats.sallies++;
        if (rng() < 0.75) { loseAt(S, s, 6); info.sally = 'win'; } else { loseAt(S, s, 12); info.sally = 'fail'; S.morale = clamp(S.morale - .5, 0, 10); }
      }
      var sw = info.sally === 'win';
      if (t === 'ladders') { if (oil) { A *= (0.8 + fx); info.answer = 'oil'; } else if (sw) A *= 0.9; }
      else if (t === 'ram') { if (oil) { A *= (0.8 + fx); info.answer = 'oil'; info.destroyed = true; } else if (sw) { A *= 0.85; info.answer = 'sally'; info.destroyed = true; } else { A *= TYPES.ram.eng; info.wallHit = 1; } }
      else if (t === 'tower') { if (fire) { A *= (0.8 + fx); info.answer = 'fire'; info.destroyed = true; } else if (sw) { A *= 0.85; info.answer = 'sally'; info.destroyed = true; } else A *= TYPES.tower.eng; }
      else if (t === 'sappers') { if (S.works[s].mine) info.answer = 'mine'; else if (sw) { info.answer = 'sally'; info.destroyed = true; } else { A *= TYPES.sappers.eng; S.wall[s] = Math.max(0, S.wall[s] - 2); info.wallHit = 2; info.preHit = true; } }
      else if (t === 'boats') { if (S.works[s].boom) { A *= 0.85; info.answer = 'boom'; } else if (fire) { A *= (0.8 + fx); info.answer = 'fire'; info.destroyed = true; } else if (sw) { A *= 0.85; info.answer = 'sally'; info.destroyed = true; } else A *= TYPES.boats.eng; }
      if (S.rain && s === 'W') A *= 0.85;
      var D = defence(S, s, 0, cmds), r = D / A, out = classify(r);
      sec[s] = { role: role, type: t, A: A, D: D, r: r, out: out, info: info };
      if (out === 'wavering' || out === 'breach') pending.push(s);
    });
    return { truce: false, sec: sec, pending: pending, base: base, cmd: cmds };
  }

  /* ---- stage 2: apply it. choice = {k:'reserve'|'fall', s} or null ---- */
  var KD = { held: 0.05, costly: 0.09, barely: 0.14, breach: 0.20 }, KE = { held: 0.11, costly: 0.08, barely: 0.06, breach: 0.04 };
  var WALLDMG = { held: 0, costly: 1, barely: 1, breach: 4 }, MOR = { held: 0.5, costly: 0.1, barely: -0.3, breach: -1.0 }, EMOR = { held: -0.3, costly: -0.1, barely: 0.3, breach: 0.8 };
  function finish(S, st, choice) {
    var rng = S.rng, res = { sec: {}, fell: null, choice: choice || null, breached: [], counters: [], score: 0 }, enemyLoss = 0, defLoss = 0, wasOpen = {};
    SECT.forEach(function (s) { wasOpen[s] = S.breach[s]; });
    if (st.truce) { S.enemy.rest = true; res.truce = true; return afterNight(S, res); }
    SECT.forEach(function (s) {
      var x = st.sec[s], D = x.D, out = x.out, resUsed = 0, fb = false;
      if (choice && choice.k === 'reserve' && choice.s === s && S.troops.res > 0) {
        resUsed = S.troops.res; S.stats.commits++; D = defence(S, s, resUsed, st.cmd); var r0 = D / x.A;
        out = r0 >= 1.4 ? 'held' : r0 >= 1.0 ? 'costly' : r0 >= 0.8 ? 'barely' : 'breach';
      } else if (choice && choice.k === 'fall' && choice.s === s) { out = 'barely'; fb = true; S.stats.falls++; }
      else if (out === 'wavering') out = (x.r >= 0.85) ? 'barely' : 'breach';
      var dl = Math.round(x.A * KD[out] * (fb ? 0.5 : 1)), share = resUsed ? Math.round(dl * resUsed / (S.troops[s] + resUsed)) : 0;
      var fromSector = Math.min(S.troops[s], dl - share); S.troops[s] -= fromSector; S.troops.res -= Math.min(S.troops.res, share);
      var el = Math.round(D * KE[out]); enemyLoss += el; defLoss += fromSector + share;
      var wd = WALLDMG[out] + (x.info.wallHit === 1 ? 1 : 0); if (fb) wd = 3; if (out === 'held' && rng() < 0.3) wd = 1;
      if (hasCmd(st.cmd, 'brace', s)) wd = Math.max(0, wd - 1);
      S.wall[s] = Math.max(0, S.wall[s] - wd);
      S.morale = clamp(S.morale + MOR[out] + (fb ? -0.2 : 0), 0, 10); S.enemy.morale = clamp(S.enemy.morale + EMOR[out] + (fb ? 0.1 : 0), 0, 10);
      if (out === 'held') S.stats.held++;
      var rr = D / x.A;
      res.sec[s] = { out: out, role: x.role, type: x.type, info: x.info, defLoss: fromSector + share, enemyLoss: el, wall: S.wall[s], A: x.A, D: D, fb: fb, reserve: resUsed > 0 };
      if (x.info.answer) res.counters.push({ s: s, type: x.type, answer: x.info.answer, destroyed: x.info.destroyed });
      if (out === 'breach') { res.breached.push(s); S.stats.breached++; if (wasOpen[s] || rr < 0.35 || S.troops[s] <= 0) { if (!res.fell) { res.fell = s; res.overrun = rr < 0.35; } } else { S.breach[s] = true; S.wall[s] = Math.min(S.wall[s], 2); } }
      res.score += out === 'held' ? 5 : out === 'costly' ? 2 : 0;
    });
    if (res.breached.length >= 2 && !res.fell) res.fell = res.breached[0];
    S.enemy.str = Math.max(0, S.enemy.str - enemyLoss);
    res.enemyLoss = enemyLoss; res.defLoss = defLoss; S.enemy.rest = false;
    res.counters.forEach(function (c) { if (c.destroyed) S.enemy.ready[c.type] = Math.max(S.enemy.ready[c.type], S.day + 3); S.stats.counters++; res.score += 12; });
    if (!res.breached.length && SECT.every(function (s) { return res.sec[s].out === 'held' || res.sec[s].out === 'costly'; })) { S.stats.perfect++; res.score += 8; }
    if (res.fell) S.over = { win: false, kind: 'fall', sector: res.fell };
    S.score += res.score;
    return afterNight(S, res);
  }
  function afterNight(S, res) {
    var p = S.plan; res.reveal = [];
    S.reports.forEach(function (r) {
      var ok = r.claim === p.main, rec = S.src[r.src]; if (!rec) return;
      if (ok) rec.right++; else rec.wrong++;
      SRCS.forEach(function (h) { var pc = pCorrect(S, r.src, h, r.day, S.rain); S.post[h] *= ok ? pc : (1 - pc); });
      normPost(S);
      res.reveal.push({ src: r.src, claim: r.claim, ok: ok, type: r.type });
    });
    if (S._defectors && S.reports.defectors) { var d = S.reports.defectors; res.reveal.push({ src: 'defectors', claim: d.claim, ok: d.claim === p.main }); }
    if (S.bait) {
      var hit = p.main === S.bait.s, bs = S.bait.src, a = S.src[bs];
      if (!a.exposed && !a.jailed) {
        SRCS.forEach(function (h) { if (S.src[h].exposed || S.src[h].jailed) return; S.post[h] *= h === bs ? (hit ? .9 : .1) : (hit ? 1 / 3 : 2 / 3); }); normPost(S);
      }
      res.bait = { src: bs, s: S.bait.s, hit: hit, taken: S.baitTaken, real: S.baitTaken && S.mole === bs };
      if (res.bait.real) { S.score += 20; res.score += 20; S.stats.baitHits = (S.stats.baitHits || 0) + 1; }
    }
    res.plan = { main: p.main, feint: p.feint, probe: p.probe, type: JSON.parse(JSON.stringify(p.type)) };
    SECT.forEach(function (s) { S.raid[s] = 1; });
    if (S.over) return res;
    if (S.enemy.morale <= 0 || S.enemy.str <= 40) { S.over = { win: true, kind: 'withdraw' }; S.score += 80; return res; }
    return upkeep(S, res);
  }
  function upkeep(S, res) {
    S.food = Math.max(0, S.food - (S.ration === 'full' ? 1 : 0.5));
    if (S.ration === 'short') S.morale = clamp(S.morale - 0.5, 0, 10);
    res.upkeep = [];
    SECT.forEach(function (s) { if (S.breach[s]) { S.morale = clamp(S.morale - 0.5, 0, 10); res.upkeep.push('The enemy holds a foothold at ' + NAME[s] + '. The breach must be sealed.'); } });
    if (S.food <= 0) { S.starve++; loseTroops(S, 10); S.morale = clamp(S.morale - 1, 0, 10); res.upkeep.push('The granaries are empty. Soldiers faint on the wall, ten are lost, and morale falls.'); if (S.starve >= 3) { S.over = { win: false, kind: 'starve' }; return res; } }
    if (S.morale <= 2 && S.morale > 0) { loseTroops(S, 8); res.upkeep.push('Despair spreads. Eight soldiers desert in the night.'); }
    if (S.morale <= 0) { S.over = { win: false, kind: 'mutiny' }; return res; }
    if (total(S) <= 15) { S.over = { win: false, kind: 'fall', sector: null }; return res; }
    S.timber += 1; S.score += 5; S.enemy.str += 6; S.day++; return res;
  }

  function ending(S) {
    var o = S.over, t = total(S), rank, sc = S.score - 5 * S.hints;
    if (!o) return null;
    if (o.win) { sc += Math.round(t / 2); rank = (o.kind === 'withdraw' || o.kind === 'sortie') ? 'Legend of Ilesanmi' : (sc >= 300 ? 'Defender of Ilesanmi' : 'Survivor of Ilesanmi'); }
    else rank = 'Fallen Commander';
    return { win: o.win, kind: o.kind, rank: rank, troops: t, day: S.day, held: S.stats.held, breached: S.stats.breached, score: Math.max(0, Math.round(sc)), mole: S.mole, exposed: S.src[S.mole].exposed };
  }
  function assessment(S) {
    return SRCS.filter(function (k) { return !S.src[k].jailed; }).map(function (k) { return { src: k, p: Math.round(S.post[k] * 100), exposed: S.src[k].exposed }; }).sort(function (a, b) { return b.p - a.p; });
  }
  function hint(S) {
    var open = SECT.filter(function (s) { return S.breach[s]; });
    if (open.length) return 'There is an open breach at ' + NAME[open[0]] + '. Move soldiers in if you must, then seal it. A second breach loses the citadel.';
    var as = assessment(S), top = as[0], k = S.src[S.mole];
    if (!k.exposed && top && top.p >= 70) return SRCNAME[top.src] + ' looks very likely to be the spy, ' + top.p + ' percent. If you are ready to stake your reputation on it, arrest him. If not, whisper a bait first.';
    if (!k.exposed && S.day >= 3 && as.every(function (a) { return a.p < 55; })) return 'You do not know yet who the spy is. Question each informant, or whisper a bait to one and watch where the main blow falls.';
    var coming = TKEYS.filter(function (t) { return t !== 'ladders' && S.enemy.ready[t] <= S.day + 1; });
    if (coming.indexOf('tower') >= 0 && !S.works.N.plat) return 'The siege tower is almost ready. An archer platform at the North Wall lets you burn it with fire arrows for free.';
    if (coming.indexOf('sappers') >= 0 && !S.works.W.mine && !S.works.N.mine) return 'Sappers are coming. A counter-mine at the West Gate or the North Wall stops them cold.';
    if (coming.indexOf('boats') >= 0 && !S.works.R.boom) return 'Boats are coming. A river boom at the River Gate blunts them without spending a drop of oil.';
    if (S.riders.ok < 2 && S.day <= S.R - 3) return 'Every rider who gets through brings the relief army a day closer. Consider sending one.';
    if (S.oil < 1) return 'You are out of oil. A merchant, a convoy or foraging may bring more. Platforms, mines and booms do not need it.';
    var claims = {}; S.reports.forEach(function (x) { claims[x.claim] = 1; });
    if (Object.keys(claims).length > 1) return 'Your informants disagree. Do not guess. Send a scout to the sector they argue about, and weigh each source by its record.';
    if (S.troops.res < 10) return 'You have almost no reserve. When a sector starts to waver, nothing can save it.';
    return 'Where your informants agree, put your strength. Keep a reserve, build the works the enemy\'s weapons demand, and never leave one sector looking weak.';
  }

  return {
    SECT: SECT, NAME: NAME, SHORT: SHORT, SRCS: SRCS, SRCNAME: SRCNAME, TYPES: TYPES, TKEYS: TKEYS, WORKS: WORKS, CMD: CMD,
    mulberry: mulberry, newGame: newGame, setup: setup, beginDay: beginDay, resolveEvent: resolveEvent, redeploy: redeploy, fortify: fortify, build: build, seal: seal, scout: scout, raid: raid,
    parley: parley, rally: rally, forage: forage, rider: rider, setRation: setRation, interrogate: interrogate, bait: bait, arrest: arrest, turnAgent: turnAgent, feed: feed,
    sortie: sortie, canSortie: canSortie, sortieChance: sortieChance, dusk: dusk, addCmd: addCmd, clearCmds: clearCmds, assault: assault, finish: finish, ending: ending, hint: hint,
    assessment: assessment, defence: defence, total: total, classify: classify, avail: avail, cpMax: cpMax, moleActive: moleActive
  };
});
