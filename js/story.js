/* story.js: the Story Compass, shared by all three games.
   1. A strategic world state (Trust, Leverage, Exposure) that every choice moves, like pieces on a board.
   2. Odds, not scripts: Story.roll(p) decides trials and verdicts, and p is built from what the player did.
   3. The intelligent pointer (press J): scores every open lead for value, distance and risk, names the
      best next move and the phase of the game (opening, middlegame, endgame). It never gives away the culprit.
   4. Replay memory: endings found, story threads never pulled, and a twist that differs from last run. */
(function (w) {
  'use strict';
  var KEY = 'det_story_v1', R = null, M = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(M)); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  M.end = M.end || {}; M.seen = M.seen || {}; M.last = M.last || {}; M.runs = M.runs || {};

  var ENDINGS = {
    balogun: { clean: 'The Market Stands With Tunde', costly: 'Justice With a Price', standard: 'Case Closed', plea: 'The Quiet Confession', adjourned: 'Bail, Not Justice', lost: 'The Clock Wins' },
    echo: { chiefs: 'The Ledger Speaks', scandal: 'Won on a Knife Edge', second: 'The Court Needed Convincing', escaped: 'The Evening Boat', runout: 'Police Take Over' },
    siege: { relief: 'The Relief Army Rides In', withdraw: 'The Enemy Breaks', sortie: 'The Grand Sortie', fall: 'Ilesanmi Falls' }
  };
  var THREADS = {
    balogun: {
      confide: 'One keeper at the stalls will confide only if you reassure and spend an hour, instead of pressing.',
      bargain: 'Trading what you know can buy legal leverage, and leverage opens a quiet ending.',
      press: 'Pressing a witness is fast, but the thief hears about it.',
      struck: 'When the thief learns how close you are, he silences a witness overnight.',
      adjourn: 'A first failed trial teaches you what the bench wants, if you ask for time.',
      velvet: 'There is a velvet doorway in the middle of the street.'
    },
    echo: {
      doubted: 'The court may doubt a true accusation. A failed hearing shows you the weak link.',
      rush: 'Name the right person with thin proof and the bench may not believe you.',
      love: 'The jetty clerk hums a tune that tells you something.'
    },
    siege: {
      rotate: 'The enemy refuses to hit a wall it has seen you strengthen twice in a row. Rotate your strength.',
      spy: 'The spy is not always the deserter.',
      sortie: 'Once the enemy is shaken, a grand sortie can end the siege in one night.'
    }
  };

  var S = {
    begin: function (game, o) {
      o = o || {};
      R = { game: game, m: { trust: 2, leverage: 0, exposure: 0 }, f: {} };
      M.runs[game] = (M.runs[game] || 0) + 1; save();
      return R;
    },
    run: function () { return R || S.begin('x'); },
    /* a different twist every run: never the one used last time */
    pick: function (game, n) {
      var i, t = 0; do { i = Math.floor(Math.random() * n); t++; } while (n > 1 && i === M.last[game] && t < 20);
      M.last[game] = i; save(); return i;
    },
    m: function (k, d) { var r = S.run(); r.m[k] = clamp(r.m[k] + (d || 0), 0, 6); return r.m[k]; },
    flag: function (k) { var r = S.run(); r.f[k] = 1; (M.seen[r.game] = M.seen[r.game] || {})[k] = 1; save(); },
    has: function (k) { return !!S.run().f[k]; },
    /* odds are never certain: clamp to 8 to 92 percent */
    odds: function (p) { return clamp(p, .08, .92); },
    roll: function (p) { p = S.odds(p); return { ok: Math.random() < p, p: p }; },
    /* the pointer: leads are {name, value, dist, risk, urgent, why} */
    best: function (leads) {
      var b = null, bs = -1e9;
      (leads || []).forEach(function (l) {
        var s = (l.value || 1) * 3 - (l.dist || 0) / 25 - (l.risk || 0) * 1.5 + (l.urgent ? 2.5 : 0);
        if (s > bs) { bs = s; b = l; }
      });
      return b;
    },
    phase: function (frac) {
      return frac < .34 ? 'Opening. Develop your leads before you commit.'
        : frac < .8 ? 'Middlegame. Every move trades one resource for another.'
          : 'Endgame. One slip decides it, so check your position before you strike.';
    },
    meters: function () { var m = S.run().m; return 'Trust ' + m.trust + ', Leverage ' + m.leverage + ', Exposure ' + m.exposure + '.'; },
    bind: function (fn) { S.thread = fn; },
    speakThread: function () {
      var t = ''; try { t = S.thread ? S.thread() : ''; } catch (e) {}
      if (!t) t = 'No thread yet. Start by exploring.';
      t = 'The thread. ' + t;
      if (w.Access && Access.say) Access.say(t); else if (w.speechSynthesis) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); }
    },
    /* endings and the hook to play again */
    finish: function (game, id) {
      var all = ENDINGS[game] || {}, e = M.end[game] = M.end[game] || {}, fresh = !e[id];
      e[id] = (e[id] || 0) + 1; (M.lastEnd = M.lastEnd || {})[game] = id;
      var found = Object.keys(e).length, total = Object.keys(all).length || found;
      var seen = M.seen[game] || {}, th = THREADS[game] || {}, open = Object.keys(th).filter(function (k) { return !seen[k]; });
      var out = (all[id] ? 'Ending: ' + all[id] + '. ' : '') + (fresh ? 'New ending. ' : 'You have reached this ending before. ') + found + ' of ' + total + ' endings found.';
      if (open.length) out += ' A thread you never pulled: ' + th[open[Math.floor(Math.random() * open.length)]];
      save(); return out;
    },
    threads: THREADS, endings: ENDINGS
  };
  w.Story = S;
})(window);
