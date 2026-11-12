/* lagos.js - the city around the case (shared by both cases)

   Three systems that make the game feel like a living Lagos, all playable by ear:

   1. HEAT (0 to 5)   Pushing hard gets you noticed. Wrong accusations, bluffing, and cracking
                      people raise Heat; time, walking, good answers and knowing your rights cool it.
                      3+  police watch the roads, checkpoints become likely
                      4+  doors close: people stall you
                      5   roadblocks everywhere
   2. MAP & TRAVEL    Places are far apart. Walk (slow, safe, cools Heat), danfo (cheap, quick,
                      police stop buses), okada (fastest, risky in rain) or ferry (the Far Shore).
                      Roads change each trip: go-slows, rain, roadblocks.
   3. RADIO           Lagos Radio 99.9 tells the truth about the roads, reacts to what you have done,
                      runs call-in shows, and sometimes passes on unconfirmed tips. Some tips are
                      decoys, so think before you chase them.
   4. CHECKPOINTS     An officer waves you down. Cite the right Section of the Constitution to pass,
                      or "settle am" (pay, and lose reputation). Wrong answers cost time and Heat.

   State lives on the object the game passes in (Echo: G, Balogun: g).
   Fields used: heat, rumour[], cond, rIdx, tipUsed[], radio.                                     */
(function (w) {
  'use strict';
  var L = {};
  var rnd = Math.random;
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ================================================================ SOUND ====
     All procedural (no files), so it works offline and is tiny.                  */
  var ac = null, master = null, beds = [];
  function ctx() {
    if (!ac) { try { ac = new (w.AudioContext || w.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination); } catch (e) { return null; } }
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function on() { return !(w.Sfx && w.Sfx.isMuted && w.Sfx.isMuted()) && ctx(); }
  function chain(vol, pan) {
    var g = ac.createGain(); g.gain.value = vol; var last = g;
    if (ac.createStereoPanner && pan) { var p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
    last.connect(master); return g;
  }
  function osc(type, f, t0, dur, vol, pan, f2) {
    var o = ac.createOscillator(), g = chain(.0001, pan);
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); o.start(t0); o.stop(t0 + dur + .05); return o;
  }
  function noise(dur) {
    var n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
    var s = ac.createBufferSource(); s.buffer = b; return s;
  }
  function nburst(t0, dur, type, freq, vol, pan) {
    var s = noise(dur), f = ac.createBiquadFilter(), g = chain(.0001, pan);
    f.type = type; f.frequency.value = freq; s.connect(f); f.connect(g);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); s.start(t0); return s;
  }
  var sfx = {
    horn: function (pan) { if (!on()) return; var t = ac.currentTime, v = .09; osc('square', 420, t, .38, v, pan); osc('square', 535, t, .38, v, pan); },
    beep: function (pan) { if (!on()) return; var t = ac.currentTime; osc('square', 900, t, .1, .07, pan); osc('square', 900, t + .17, .1, .07, pan); },
    siren: function (ms) {
      if (!on()) return; var t = ac.currentTime, o = ac.createOscillator(), l = ac.createOscillator(), lg = ac.createGain(), g = chain(.0001, 0);
      o.type = 'sawtooth'; o.frequency.value = 780; l.frequency.value = 1.6; lg.gain.value = 190; l.connect(lg); lg.connect(o.frequency);
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; o.connect(lp); lp.connect(g);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.1, t + .15); g.gain.setValueAtTime(.1, t + ms / 1000 - .2); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
      o.start(t); l.start(t); o.stop(t + ms / 1000 + .05); l.stop(t + ms / 1000 + .05);
    },
    whistle: function () {
      if (!on()) return; var t = ac.currentTime;
      [0, .32].forEach(function (d) { var o = osc('sine', 2800, t + d, .22, .12, 0), l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 38; lg.gain.value = 130; l.connect(lg); lg.connect(o.frequency); l.start(t + d); l.stop(t + d + .3); });
    },
    stat: function (dur) { if (!on()) return; nburst(ac.currentTime, dur || .3, 'bandpass', 1900, .12, 0); },
    jingle: function () {
      if (!on()) return; var t = ac.currentTime; nburst(t, .28, 'bandpass', 1900, .1, 0);
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { osc('sine', f, t + .25 + i * .13, .3, .09, 0); });
    },
    pay: function () { if (!on()) return; var t = ac.currentTime; osc('sine', 1760, t, .09, .1, 0); osc('sine', 2349, t + .09, .12, .1, 0); nburst(t, .08, 'highpass', 4000, .06, 0); },
    ok: function () { if (!on()) return; var t = ac.currentTime; [660, 880, 1320].forEach(function (f, i) { osc('sine', f, t + i * .1, .25, .1, 0); }); },
    bad: function () { if (!on()) return; var t = ac.currentTime; osc('sawtooth', 160, t, .5, .12, 0, 80); },
    crash: function () { if (!on()) return; var t = ac.currentTime; nburst(t, .55, 'lowpass', 500, .55, 0); osc('sine', 90, t, .45, .4, 0, 40); },
    coin: function () { sfx.pay(); },
    /* a sustained sound bed that stops itself. kind: danfo okada ferry walk generator rain */
    bed: function (kind, ms, o) {
      if (!on()) return function () {}; o = o || {};
      var t = ac.currentTime, nodes = [], timers = [], master2 = chain(.0001, 0);
      master2.gain.setValueAtTime(.0001, t); master2.gain.exponentialRampToValueAtTime(1, t + .4);
      function lfo(f, depth, target) { var l = ac.createOscillator(), g = ac.createGain(); l.frequency.value = f; g.gain.value = depth; l.connect(g); g.connect(target); l.start(); nodes.push(l); }
      function layer(type, f, vol, filt, ff) {
        var os = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
        os.type = type; os.frequency.value = f; g.gain.value = vol; fl.type = filt || 'lowpass'; fl.frequency.value = ff || 400;
        os.connect(fl); fl.connect(g); g.connect(master2); os.start(); nodes.push(os); return os;
      }
      function hiss(vol, filt, ff) {
        var s = noise(2), g = ac.createGain(), fl = ac.createBiquadFilter(); s.loop = true; fl.type = filt; fl.frequency.value = ff; g.gain.value = vol;
        s.connect(fl); fl.connect(g); g.connect(master2); s.start(); nodes.push(s); return g;
      }
      if (kind === 'danfo') {
        var e = layer('sawtooth', 56, .2, 'lowpass', 260); lfo(7, 5, e.frequency); hiss(.05, 'lowpass', 600);
        (function loop() { timers.push(setTimeout(function () { sfx.horn((rnd() * 2 - 1) * .8); loop(); }, 1100 + rnd() * 1800)); })();
      } else if (kind === 'okada') {
        var q = layer('square', 130, .1, 'bandpass', 650); lfo(17, 14, q.frequency); hiss(.06, 'highpass', 1500);
        (function rev() { timers.push(setTimeout(function () { try { q.frequency.setTargetAtTime(200, ac.currentTime, .05); q.frequency.setTargetAtTime(130, ac.currentTime + .4, .2); } catch (e) {} rev(); }, 900 + rnd() * 1200)); })();
        (function bp() { timers.push(setTimeout(function () { sfx.beep((rnd() * 2 - 1) * .9); bp(); }, 1500 + rnd() * 2200)); })();
      } else if (kind === 'ferry') {
        var wg = hiss(.16, 'lowpass', 420); lfo(.3, .08, wg.gain); layer('sawtooth', 38, .1, 'lowpass', 120);
        timers.push(setTimeout(function () { var t2 = ac.currentTime; osc('sawtooth', 150, t2, .9, .12, 0, 140); }, 150));
        (function gull() { timers.push(setTimeout(function () { var t2 = ac.currentTime, p = (rnd() * 2 - 1) * .8; osc('sine', 1900, t2, .25, .05, p, 1300); osc('sine', 1700, t2 + .3, .2, .04, p, 1200); gull(); }, 1800 + rnd() * 2500)); })();
      } else if (kind === 'generator') {
        layer('sawtooth', 48, .16, 'lowpass', 220); hiss(.04, 'bandpass', 800);
      } else if (kind === 'walk') {
        hiss(.05, 'bandpass', 700); var side = 1;
        (function step() { timers.push(setTimeout(function () { nburst(ac.currentTime, .06, 'highpass', 1200, .22, side * .3); side = -side; step(); }, 430 + rnd() * 60)); })();
        (function far() { timers.push(setTimeout(function () { sfx.horn((rnd() * 2 - 1)); far(); }, 2500 + rnd() * 3000)); })();
      }
      if (o.rain) hiss(.05, 'highpass', 2600);
      var bed = { stopped: 0, stop: function () {
        if (bed.stopped) return; bed.stopped = 1; timers.forEach(clearTimeout);
        try { master2.gain.cancelScheduledValues(ac.currentTime); master2.gain.setTargetAtTime(.0001, ac.currentTime, .12); } catch (e) {}
        setTimeout(function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 600);
      } };
      beds.push(bed); if (ms) timers.push(setTimeout(bed.stop, ms)); return bed.stop;
    },
    stop: function () { beds.forEach(function (b) { b.stop(); }); beds = []; }
  };
  L.sfx = sfx;

  /* ================================================================ HEAT ==== */
  var TIP = ['Nobody is watching you.', 'Someone has noticed you.', 'People are starting to whisper.',
    'Police are watching the roads. Checkpoints are likely.', 'Doors are closing. People stall you, and checkpoints are everywhere.',
    'The whole city is looking for you. Every road has a roadblock.'];
  L.heatTip = function (h) { return TIP[Math.max(0, Math.min(5, h || 0))]; };
  L.addHeat = function (st, n, why) {
    var from = st.heat || 0, to = Math.max(0, Math.min(5, from + n)); st.heat = to; st.rumour = st.rumour || [];
    if (n > 0 && why) st.rumour.push(why);
    var msg = to === from ? '' : ((to > from ? 'Heat rises' : 'Heat cools') + ' to ' + to + ' of 5. ' + TIP[to]);
    return { from: from, to: to, msg: msg };
  };

  /* ========================================================= MAP & TRAVEL ==== */
  var D = { 'office-market': 10, 'office-jetty': 22, 'office-shore': 38, 'market-jetty': 12, 'market-shore': 30, 'jetty-shore': 15 };
  L.dist = function (a, b) { return a === b ? 0 : (D[a + '-' + b] || D[b + '-' + a] || 15); };
  L.roll = function (st) {
    var h = st.heat || 0;
    st.cond = { slow: rnd() < .38, rain: rnd() < .22, block: h >= 5 || rnd() < (.18 + .08 * h) };
    return st.cond;
  };
  function cpChance(base, heat, cond) { if (heat >= 5) return 1; return Math.min(.85, base + .12 * heat + (cond.block ? .3 : 0)); }
  L.modes = function (from, to, cond, heat) {
    cond = cond || {}; heat = heat || 0;
    var d = L.dist(from, to), out = [];
    if (from === 'shore' || to === 'shore') {
      out.push({ id: 'ferry', name: 'Ferry', nom: d, mins: d + (cond.rain ? 10 : 0), cp: heat >= 4 ? .25 : 0, crash: 0, note: 'The only way across the water. Slow in rain. Police rarely board.' });
    } else {
      out.push({ id: 'walk', name: 'Walk', nom: d, mins: d, cp: Math.min(.3, .03 * heat), crash: 0, note: 'Slow, quiet and safe. Lets Heat cool by one.' });
      var dn = Math.max(2, Math.ceil(d * .55));
      out.push({ id: 'danfo', name: 'Danfo', nom: dn, mins: dn + (cond.slow ? Math.ceil(d * .6) : 0), cp: cpChance(.10, heat, cond), crash: 0, note: 'Cheap and quick, but police love stopping buses. A go-slow ruins it.' });
      var on2 = Math.max(2, Math.ceil(d * .35));
      out.push({ id: 'okada', name: 'Okada', nom: on2, mins: on2 + (cond.slow ? Math.ceil(d * .1) : 0), cp: cpChance(.12, heat, cond), crash: cond.rain ? .3 : .06, note: 'Fastest, and weaves through a go-slow. Risky when the road is wet.' });
    }
    return out;
  };
  L.plan = function (st, from, to, mid) {
    var m = L.modes(from, to, st.cond, st.heat).filter(function (x) { return x.id === mid; })[0] || L.modes(from, to, st.cond, st.heat)[0];
    var crash = rnd() < (m.crash || 0), cp = rnd() < (m.cp || 0);
    return { mid: m.id, mins: m.mins + (crash ? 10 : 0), base: m.mins, crash: crash, cp: cp, cool: m.id === 'walk' };
  };
  L.rideText = function (mid, fromN, toN, cond) {
    cond = cond || {}; var t;
    if (mid === 'danfo') t = 'You squeeze into a yellow danfo. The conductor hangs from the door, shouting ' + toN + ', ' + toN + ', ' + toN + '! Somebody\'s elbow is in your ribs and the driver leans on his horn. ';
    else if (mid === 'okada') t = 'You climb behind an okada rider who does not believe in brakes. The engine screams as he weaves between buses, a hand\'s width from every mirror. ';
    else if (mid === 'ferry') t = 'The ferry pushes off with a low horn. Water laps against the hull, gulls cry overhead, and the city slides away behind you. ';
    else t = 'You walk. Hawkers call out, a generator coughs, and your feet find the rhythm of the street. ';
    if (mid !== 'ferry' && mid !== 'walk' && cond.slow) t += 'The road is a go-slow. Nothing moves, and everybody honks anyway. ';
    if (cond.rain) t += mid === 'ferry' ? 'Rain whips the deck and the boat rolls. ' : 'Rain drums on everything and the road shines. ';
    return t;
  };
  var POS = { office: [55, 62], market: [140, 142], jetty: [255, 112], shore: [352, 50] };
  L.mapSVG = function (o) {
    var keys = o.keys || ['office', 'market', 'jetty'], names = o.names || {}, here = o.here, to = o.to, h = '';
    h += '<svg viewBox="0 0 410 230" role="img" aria-label="Map of the market district" style="font-family:system-ui,sans-serif">';
    h += '<rect width="410" height="230" rx="12" fill="#17202c"/>';
    h += '<path d="M300 0 L410 0 L410 230 L240 230 Q300 150 300 90 Z" fill="#1d4a6b" opacity=".55"/>';
    h += '<text x="378" y="150" fill="#7fb6dc" font-size="10" text-anchor="middle" transform="rotate(90 378 150)">THE LAGOON</text>';
    for (var i = 0; i < keys.length; i++) for (var j = i + 1; j < keys.length; j++) {
      var a = POS[keys[i]], b = POS[keys[j]], sea = keys[i] === 'shore' || keys[j] === 'shore', hot = (keys[i] === here && keys[j] === to) || (keys[j] === here && keys[i] === to);
      h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + (hot ? '#ffd400' : '#3a4a5e') + '" stroke-width="' + (hot ? 3 : 1.5) + '" stroke-dasharray="' + (sea ? '2 5' : '') + '"/>';
    }
    keys.forEach(function (k) {
      var p = POS[k], me = k === here, dst = k === to;
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (me || dst ? 12 : 9) + '" fill="' + (me ? '#e8743b' : dst ? '#ffd400' : '#2a3b52') + '" stroke="#d99a4e" stroke-width="2"/>';
      h += '<text x="' + p[0] + '" y="' + (p[1] + 28) + '" fill="#f3e9dc" font-size="11" text-anchor="middle">' + (names[k] || k) + '</text>';
      if (me) h += '<text x="' + p[0] + '" y="' + (p[1] + 4) + '" font-size="12" text-anchor="middle">\uD83D\uDCCD</text>';
    });
    if (o.anim && here && to) {
      var a2 = POS[here], b2 = POS[to], ic = { danfo: '\uD83D\uDE8C', okada: '\uD83C\uDFCD', ferry: '\u26F4', walk: '\uD83D\uDEB6' }[o.mode] || '\uD83D\uDE8C';
      h += '<g transform="translate(' + a2[0] + ',' + a2[1] + ')"><g><animateMotion path="M0 0 L' + (b2[0] - a2[0]) + ' ' + (b2[1] - a2[1]) + '" dur="' + (o.anim / 1000) + 's" fill="freeze" calcMode="spline" keySplines=".4 0 .2 1" keyTimes="0;1"/><text font-size="20" text-anchor="middle" dy="7">' + ic + '</text></g></g>';
    }
    return h + '</svg>';
  };

  /* ================================================================ RADIO ====
     Lagos Radio 99.9. The traffic report is always truthful, so listening pays.
     Call-in tips are labelled unconfirmed, and some are decoys.                    */
  var RUM = {
    wrong: 'A detective named the wrong person today, and the accused is demanding an apology. ',
    crack: 'A witness is said to have broken down under questioning. ',
    bribe: 'An officer at a checkpoint was reportedly settled by a man answering the detective\'s description. We cannot confirm this. ',
    bluff: 'Someone was shown a clue that proved nothing, and he laughed about it all afternoon. '
  };
  var CALLS = [
    'Caller from Mile Twelve: Oga presenter, why does the danfo conductor shout Oshodi, Oshodi, when we have never reached Oshodi? The presenter laughs. Because that is how the conductor shows love.',
    'Caller from Surulere: NEPA took light again, and I was in the middle of boiling beans! The presenter says: my brother, beans do not know about NEPA. [gen]',
    'Caller from Yaba: I just want to say, no condition is permanent. Also, the okada rider who charged me five thousand naira for one bridge is not permanent either.',
    'Caller from Festac: Settle it once and for all. Whose jollof is better? The presenter says: Lagos jollof, and I will take no more questions.',
    'Caller from Lekki: The flood has entered my compound, but my neighbour still wants to hold a party tonight. Lagos people are strong, I tell you.',
    'Caller from Ikeja: Whoever is driving on the shoulder of the go-slow, we see you! The presenter says: and God sees you too.'
  ];
  var ADS = [
    'This hour is brought to you by Mama Cass Pepper Soup. Hot enough to wake the dead.',
    'Stay with us. Next up, the Lagos Lunchtime Mix, and a reminder from Danfo Safety: please, do not hang from the door.',
    'This bulletin is sponsored by Agbado Fresh. Roasted corn and coconut, the breakfast of go-slow champions.'
  ];
  var TIPS = {
    'echo-1': [
      'Unconfirmed tip from a caller: the thief is not a quiet person. You can hear them coming from three stalls away. We cannot confirm this.',
      'Another caller insists the watchman at the gate left his post that night. We cannot confirm this, and we advise listeners not to point fingers without proof.',
      'A caller says the old gate bell can only be rung by a person standing at the gate, so if it rang, someone was there. We cannot confirm this.'],
    'echo-2': [
      'A caller says a big car with a strange horn was parked on the far shore at night. We cannot confirm this.',
      'A caller says a poor market woman has been hiding a lot of money. We cannot confirm this, and we remind listeners that poor people are often ashamed, not guilty.',
      'A caller says the man who paid the thief wore crisp new notes like perfume. We cannot confirm this.'],
    'balogun': [
      'A caller says brass rings are common in the market. One matching clue never makes a thief. Count how many of your clues fit.',
      'A caller says indigo stains do not wash off the hands for days. Look at who has stains. We cannot confirm this.',
      'A caller says anyone who tells you a story that fits only some of your clues is selling something. We cannot confirm this.']
  };
  function trafficText(st) {
    var c = st.cond || L.roll(st), t = 'Traffic and weather on Lagos Radio. ';
    t += c.slow ? 'There is a heavy go-slow on the main roads. Danfo are crawling, and the okada riders are squeezing through the gaps. ' : 'The roads are moving freely for once. ';
    t += c.rain ? 'Rain is falling over the Island. Okada riders are skidding, and the ferry will take longer to cross. ' : 'The sky is clear and the water is calm. ';
    t += c.block ? 'Police have set up roadblocks on the main roads. Carry your identity and know your rights. ' : 'No major roadblocks reported. ';
    return t + pick(['Shine your eye out there.', 'Drive well, and na God dey.', 'That was your traffic.']);
  }
  function newsText(st, c) {
    var h = st.heat || 0, t = 'News on Lagos Radio. ';
    if (st.rumour && st.rumour.length) { var r = st.rumour.shift(); t += RUM[r] || ''; }
    else if (h >= 5) t += 'Breaking news. Roadblocks are going up across the Island after complaints about a detective stirring up powerful men. Motorists should carry identification. ';
    else if (h >= 3) t += 'Reports say a detective asking questions has upset some very powerful people, and men are said to be watching the roads. ';
    else if (h >= 1) t += 'A quiet day on the Island, though traders say a detective has been asking sharp questions. ';
    else t += 'No major news today. The city is busy and everyone is hustling. ';
    if (c.clock) t += 'The time is ' + c.clock + '. ' + (c.act === 2 ? 'The police are expected to take over the case this afternoon. ' : 'The last boat leaves the jetty at six. ');
    if (c.game === 'balogun') t += 'Tunde has ' + c.hrs + ' hours left before he is charged. ';
    if ((c.clues || 0) >= 8) t += 'Insiders say the missing ledger is not as lost as it was. ';
    return t;
  }
  L.radio = {
    bulletin: function (st, c, force) {
      c = c || {}; st.rIdx = (st.rIdx || 0); var kinds = ['traffic', 'news', 'call', 'tip', 'traffic', 'news'];
      var kind = force || kinds[st.rIdx % kinds.length]; if (!force) st.rIdx++;
      var text, fx = null;
      if (kind === 'traffic') text = trafficText(st);
      else if (kind === 'news') text = newsText(st, c);
      else if (kind === 'tip') {
        var key = c.game === 'balogun' ? 'balogun' : 'echo-' + (c.act || 1), pool = TIPS[key] || TIPS['echo-1'];
        st.tipUsed = st.tipUsed || []; var left = pool.filter(function (x) { return st.tipUsed.indexOf(x) < 0; });
        if (!left.length) { st.tipUsed = []; left = pool; }
        var tp = pick(left); st.tipUsed.push(tp); text = 'Lagos Radio call-in. ' + tp;
      } else { text = pick(CALLS); if (/\[gen\]/.test(text)) { fx = 'gen'; text = text.replace(' [gen]', ''); } text += ' ' + pick(ADS); }
      return { kind: kind, text: text, fx: fx };
    },
    intro: 'Lagos Radio, ninety nine point nine. The voice of the city. '
  };

  /* ============================================================ CHECKPOINTS ====
     Accurate to the 1999 Constitution (Chapter IV, Fundamental Rights).            */
  var SC = [
    { off: 'An officer steps into the road, whistling. "Where is your pass? You cannot move around here without permission."', r: 'Section 41: freedom of movement', w: ['Section 38: freedom of religion', 'Section 44: protection of property'], why: 'Section 41 lets every Nigerian citizen move freely throughout Nigeria. You need no pass to walk or ride on a public road.' },
    { off: 'The officer points at your phone. "Give it to me. I want to read all your messages."', r: 'Section 37: privacy of your phone and correspondence', w: ['Section 41: freedom of movement', 'Section 39: freedom of expression'], why: 'Section 37 guarantees the privacy of citizens, their homes, their correspondence and their telephone conversations.' },
    { off: 'The officer says, "You are under arrest. We will tell you why later, maybe next week."', r: 'Section 35: you must be told why, in writing, within 24 hours', w: ['Section 34: freedom from forced labour', 'Section 42: freedom from discrimination'], why: 'Under Section 35(3), a person arrested must be informed in writing within twenty-four hours, in a language they understand, of the facts and grounds for the arrest.' },
    { off: 'The officer folds his arms. "You are looking guilty, so you must prove that you are innocent."', r: 'Section 36(5): presumed innocent until proven guilty', w: ['Section 37: right to privacy', 'Section 40: freedom of assembly'], why: 'Section 36(5) says everyone charged with a crime is presumed innocent until proved guilty. The burden is on the accuser.' },
    { off: 'The officer shoves you against the car and shouts in your face.', r: 'Section 34: respect for the dignity of your person', w: ['Section 41: freedom of movement', 'Section 43: owning immovable property'], why: 'Section 34 protects the dignity of every person: no torture, no inhuman or degrading treatment.' },
    { off: 'The officer says, "Pay me now, or I keep your bike and your goods."', r: 'Section 44: no property taken without law and fair payment', w: ['Section 38: freedom of religion', 'Section 42: freedom from discrimination'], why: 'Section 44 says no moveable property can be taken by force except under a law that requires prompt and fair compensation.' },
    { off: 'The officer sneers, "People from your area are all criminals. Everybody from there is guilty."', r: 'Section 42: freedom from discrimination', w: ['Section 41: freedom of movement', 'Section 37: right to privacy'], why: 'Section 42 protects you from being treated differently because of your ethnic group, place of origin, religion, sex or political opinion.' }
  ];
  L.checkpoint = function (st) {
    st.cpUsed = st.cpUsed || []; var left = SC.filter(function (s, i) { return st.cpUsed.indexOf(i) < 0; });
    if (!left.length) { st.cpUsed = []; left = SC; }
    var s = pick(left); st.cpUsed.push(SC.indexOf(s));
    var opts = shuffle([{ t: s.r, ok: 1 }, { t: s.w[0] }, { t: s.w[1] }]);
    return { off: s.off, q: 'Which right do you cite?', o: opts.map(function (x) { return x.t; }), a: opts.findIndex(function (x) { return x.ok; }), why: s.why };
  };

  w.Lagos = L;
})(window);
