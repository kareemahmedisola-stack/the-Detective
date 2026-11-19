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
    balogun: { clean: 'The Market Stands With Tunde', costly: 'Justice With a Price', standard: 'Case Closed', betrayal: 'The Trusted Friend', windfall: 'Reward Money', plea: 'The Quiet Confession', adjourned: 'Bail, Not Justice', lost: 'The Clock Wins' },
    echo: { chiefs: 'The Ledger Speaks', scandal: 'Won on a Knife Edge', second: 'The Court Needed Convincing', escaped: 'The Evening Boat', runout: 'Police Take Over', betrayal: 'The Double Agent', windfall: 'The Grateful Island' },
    siege: { relief: 'The Relief Army Rides In', withdraw: 'The Enemy Breaks', sortie: 'The Grand Sortie', fall: 'Ilesanmi Falls', airlift: 'Air Cover Arrives', mercenary: 'The Mercenary Betrays' }
  };
  /* randomised endings: the same play can end three different ways, and about one game in three ends on a twist */
  var FL = {
    balogun: { clean: ['The market sings your name at dusk.', 'Mama Ify closes her stall early and walks you home.', 'Children chalk your name on the pavement.'],
      standard: ['Tunde cries, then laughs, then cries again.', 'The magistrate nods at you, once.', 'The street goes back to selling, as if nothing had happened.'],
      costly: ['A stranger watches your door all night.', 'The note under your door is unsigned and unforgettable.', 'Your phone rings and nobody speaks.'],
      lost: ['Somewhere in the market a thief is counting coins.', 'The stalls close and the thief wins by a day.', 'Tunde sits in the dark, still waiting.'] },
    echo: { chiefs: ['The Chief stares at the floor and the courtroom exhales.', 'The ledger is read aloud, line by line.', 'Newspaper boys shout his name until midnight.'],
      scandal: ['One more doubt and the case would have died.', 'You leave the court shaking.', 'It was closer than anyone will admit.'],
      second: ['The bench thanks you for your patience, and means it.', 'Twice doubted, once proved.', 'The clerk quietly stamps the file.'] },
    siege: { relief: ['Dust on the horizon becomes banners.', 'The relief horns reach the wall at dawn.', 'Children are lifted onto the battlements to see.'],
      withdraw: ['The enemy camp is empty by morning.', 'Their fires die one by one.', 'A white cloth hangs from a single tent.'],
      sortie: ['Your riders crash through the camp before they wake.', 'The enemy never saw the gate open.', 'It was over in one night.'],
      fall: ['The garrison walks out with its heads high.', 'The banner is lowered with care.', 'Some of them will fight again.'] }
  };
  var TW = {
    balogun: { win: [{ id: 'betrayal', text: 'But at the celebration a trusted market friend slips away with the recovered savings. The thief was not alone, and your victory has a quiet shadow.', funds: 150 }, { id: 'windfall', text: 'The grateful market takes up a collection for your office. It is more money than you have ever held.', funds: 700 }],
      lose: [{ id: 'betrayal', text: 'Later you learn that someone you trusted at the stalls had been feeding the thief your every move.', funds: 0 }] },
    echo: { win: [{ id: 'betrayal', text: 'The Chief is convicted, but the clerk who handled the ledger vanishes on the evening boat. He was working for the syndicate all along.', funds: 150 }, { id: 'windfall', text: 'The recovered ledger frees a hundred traders from false debts, and the Island pays you in gratitude.', funds: 700 }],
      lose: [{ id: 'betrayal', text: 'You learn too late that your informant was paid by the Chief.', funds: 0 }] },
    siege: { win: [{ id: 'airlift', text: 'As the enemy retreats, two fighter jets thunder overhead. The syndicate has changed sides now that it smells defeat, and a cargo of supplies drops into the citadel.', funds: 800 }],
      lose: [{ id: 'mercenary', text: 'At the last hour, the mercenaries you trusted open the gate from inside for a higher bidder.', funds: 0 }] }
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
    flavour: function (game, id) { var a = (FL[game] || {})[id]; return a ? a[Math.floor(Math.random() * a.length)] : ''; },
    twistEnd: function (game, id, win) {
      var T = TW[game] && TW[game][win ? 'win' : 'lose'];
      if (!T || Math.random() > .32) return { id: id, text: '', funds: 0 };
      var t = T[Math.floor(Math.random() * T.length)]; return { id: t.id, text: t.text, funds: t.funds || 0 };
    },
    threads: THREADS, endings: ENDINGS
  };
  w.Story = S;
})(window);
