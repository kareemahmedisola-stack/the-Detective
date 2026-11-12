/* ==========================================================================
   traffic.js  -  the Lagos traffic chase (shared by both cases)

   When the right culprit is accused, they run for their car and the chase
   goes through Lagos traffic. Dodge the traffic, close the gap, and the
   police catch up: "Why are you running?" plays, then onDone() is called.

   Usage
     Traffic.start({
       target: 'Chief Bello',            // who is running (spoken / shown)
       plate:  'CHIEF 1',                // number plate on the getaway car
       speak:  function(text){...},      // optional: your game's voice (else aria-live is used)
       onDone: function(result){...}     // called after the catch (result.crashes, result.skipped)
     });

   Controls
     Left / Right or A / D   change lane          (or tap the left / right side)
     Space / Up / Enter      counter the culprit's trick when the alarm sounds
     S                       skip the chase (offered after the first failed try)

   Sounds: Cars on the highway (loop) | Emotional damage (a trick catches you)
           Sad tune (he escapes)      | Why are you running (you catch him)
   ========================================================================== */
(function (w) {
  'use strict';

  var CSS = '' +
    '#dt-traffic{position:fixed;inset:0;z-index:2147482000;background:#07070f;color:#f6efe2;font-family:"Trebuchet MS",Verdana,system-ui,sans-serif;display:flex;flex-direction:column;touch-action:none;user-select:none}' +
    '#dt-traffic .hud{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;padding:.5rem .9rem;background:rgba(0,0,0,.65);border-bottom:2px solid #ffd400;z-index:2}' +
    '#dt-traffic .hud b{color:#ffd400;font-size:1.05rem}' +
    '#dt-traffic .gapw{flex:1;min-width:140px;height:14px;background:#222;border:1px solid #555;border-radius:8px;overflow:hidden}' +
    '#dt-traffic .gap{height:100%;width:80%;background:linear-gradient(90deg,#4be08a,#ffd400 60%,#ff2d4d);transition:width .12s linear}' +
    '#dt-traffic canvas{flex:1;width:100%;min-height:0;display:block}' +
    '#dt-traffic .ctl{display:flex;gap:.6rem;justify-content:center;padding:.5rem;background:rgba(0,0,0,.65)}' +
    '#dt-traffic button{font:inherit;font-size:1.05rem;padding:.7rem 1.2rem;border-radius:10px;border:2px solid #f2a93b;background:#1d1538;color:#f6efe2;cursor:pointer;min-height:48px}' +
    '#dt-traffic button:hover,#dt-traffic button:focus-visible{background:#f2a93b;color:#111;outline:3px solid #fff}' +
    '#dt-traffic .msg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92vw,560px);background:rgba(8,6,20,.96);border:3px solid #ffd400;border-radius:14px;padding:1.2rem 1.3rem;text-align:center;z-index:3}' +
    '#dt-traffic .msg h2{margin:.1rem 0 .5rem;font:800 1.7rem "Arial Narrow",Impact,sans-serif;color:#ffd400;letter-spacing:.04em}' +
    '#dt-traffic .msg p{margin:.4rem 0 .9rem;line-height:1.5;font-size:1.05rem}' +
    '#dt-traffic .banner{position:absolute;left:50%;top:16%;transform:translateX(-50%);z-index:3;background:#ff2d4d;color:#fff;font:800 1.5rem Impact,"Arial Black",sans-serif;padding:.5rem 1.1rem;border-radius:10px;display:none;text-align:center;box-shadow:0 0 30px #ff2d4d}' +
    '#dt-traffic .banner.on{display:block;animation:dtpul .35s infinite alternate}' +
    '@keyframes dtpul{to{transform:translateX(-50%) scale(1.08)}}' +
    '#dt-traffic .sr{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}';

  function start(opts) {
    var o = {
      target: 'the culprit', plate: 'GO 1 GO', speak: null, onDone: function () {}
    };
    for (var k in (opts || {})) o[k] = opts[k];

    if (!document.getElementById('dt-traffic-css')) {
      var st = document.createElement('style'); st.id = 'dt-traffic-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    var prevFocus = document.activeElement;
    var root = document.createElement('div');
    root.id = 'dt-traffic'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Traffic chase');
    root.innerHTML =
      '<div class="hud"><b>Traffic chase</b><span>Gap to ' + esc(o.target) + '</span><div class="gapw"><div class="gap"></div></div><span>Crashes: <b class="cr">0</b></span></div>' +
      '<canvas aria-hidden="true"></canvas>' +
      '<div class="banner"></div>' +
      '<div class="ctl"><button type="button" data-a="L" aria-label="Move left">◀ Left</button><button type="button" data-a="T" aria-label="Counter the trick">⚡ Counter</button><button type="button" data-a="R" aria-label="Move right">Right ▶</button></div>' +
      '<div class="msg" role="document"></div>' +
      '<div class="sr" role="status" aria-live="' + (o.speak ? 'off' : 'polite') + '"></div>';
    document.body.appendChild(root);

    var cv = root.querySelector('canvas'), cx = cv.getContext('2d');
    var msg = root.querySelector('.msg'), banner = root.querySelector('.banner');
    var gapEl = root.querySelector('.gap'), crEl = root.querySelector('.cr'), live = root.querySelector('.sr');
    var W = 0, H = 0, dpr = Math.min(2, w.devicePixelRatio || 1);

    function resize() {
      var r = cv.getBoundingClientRect();
      W = Math.max(280, r.width); H = Math.max(240, r.height);
      cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    w.addEventListener('resize', resize); resize();

    function say(t, force) {
      if (o.speak) { try { o.speak(t); } catch (e) {} }
      else { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    }

    /* ---------- tiny synth for lane warnings and crashes ---------- */
    var ac = null;
    try { ac = new (w.AudioContext || w.webkitAudioContext)(); } catch (e) {}
    function tone(f, d, v, type, pan, f2) {
      if (!ac || Sfx.isMuted()) return;
      var t = ac.currentTime, os = ac.createOscillator(), g = ac.createGain();
      os.type = type || 'square'; os.frequency.setValueAtTime(f, t);
      if (f2) os.frequency.exponentialRampToValueAtTime(f2, t + d * .8);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      var node = g;
      if (ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); node = p; }
      os.connect(g); node.connect(ac.destination); os.start(t); os.stop(t + d + .02);
    }
    function honk(pan) { tone(330, .16, .12, 'square', pan); setTimeout(function () { tone(262, .2, .12, 'square', pan); }, 150); }
    function crash() { tone(90, .35, .35, 'sawtooth', 0, 40); tone(1200, .12, .15, 'square', 0, 200); }
    function alarm() { tone(880, .14, .14, 'square'); setTimeout(function () { tone(1175, .14, .14, 'square'); }, 160); }

    /* ---------- game state ---------- */
    var S = {};
    var tries = 0, state = 'ready', raf = 0, last = 0, ended = false;
    function rand(a, b) { return a + Math.random() * (b - a); }
    var COLORS = ['#e5483f', '#3b8be5', '#e8e8e8', '#8e6bd6', '#2fb36d', '#f08a24'];

    function reset() {
      S = { gap: .75, lane: 1, px: 1, obs: [], spawn: .6, crashes: 0, inv: 0, scroll: 0, t: 0, trick: null, tricksDone: 0, shake: 0, warnT: 0, lastLaneWarn: 0, tx: 1, tlane: 1, tswitch: 2, nextAnn: 5, fx: [], lean: 0, tlean: 0, smoke: 0, brake: 0 };
      gapEl.style.width = '75%'; crEl.textContent = '0'; banner.classList.remove('on');
    }
    reset();

    function road() { var rw = Math.min(W * .92, 500); return { x: (W - rw) / 2, w: rw, lw: rw / 3 }; }
    function laneX(l) { var r = road(); return r.x + r.lw * (l + .5); }
    function carSize() { var r = road(); return { w: r.lw * .56, h: r.lw * .56 * 1.75 }; }
    function playerY() { return H * .8; }
    function targetY() { var cs = carSize(), py = playerY() - cs.h * 1.08, top = H * .1; return py - S.gap * (py - top); }

    /* ---------- messages / flow ---------- */
    function showMsg(title, body, buttons) {
      msg.innerHTML = '<h2>' + title + '</h2><p>' + body + '</p>' + (buttons || []).map(function (b, i) { return '<button type="button" data-b="' + i + '">' + b.t + '</button> '; }).join('');
      msg.style.display = 'block';
      (buttons || []).forEach(function (b, i) { msg.querySelector('[data-b="' + i + '"]').onclick = b.f; });
      var f = msg.querySelector('button'); if (f) f.focus({ preventScroll: true });
    }
    function hideMsg() { msg.style.display = 'none'; try { root.focus(); } catch (e) {} }

    function intro() {
      state = 'ready';
      var txt = o.target + ' has jumped into a car and is speeding away through Lagos traffic. You are in the police car. Press Left and Right, or A and D, to change lane and dodge the traffic. Each crash lets him pull away. When the alarm sounds, press Space to counter his trick. Close the gap and the police catch him.';
      var as = Sfx.assist() ? ' Assisted mode is on: slower traffic, longer time for tricks, and spoken left and right guidance. Press T to switch it off.' : ' Assisted mode is off. Press T to switch it on.';
      showMsg('CHASE!', esc(txt + as), [{ t: 'Start the chase (Enter)', f: go }, { t: 'Assisted mode: ' + (Sfx.assist() ? 'on' : 'off') + ' (T)', f: tog }, { t: 'Skip the chase (S)', f: function () { caught(true); } }]);
      say(txt + as + ' Press Enter to start, or S to skip the chase.');
      Sfx.play('traffic', { loop: true });
    }

    function tog() { Sfx.setAssist(!Sfx.assist()); intro(); }
    function go() {
      tries++; reset(); hideMsg(); state = 'run'; last = 0;
      try { if (ac && ac.state === 'suspended') ac.resume(); } catch (e) {}
      Sfx.play('traffic', { loop: true });
      say('Go! Dodge the traffic.');
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    }

    function lose() {
      state = 'lost'; banner.classList.remove('on');
      Sfx.stop('traffic', 600); Sfx.play('sad', { maxMs: 7000, fade: 1200 });
      var b = [{ t: 'Try again (Enter)', f: go }];
      b.push({ t: 'Skip the chase (S)', f: function () { caught(true); } });
      var txt = o.target + ' gets away in the traffic! Don\'t give up.';
      showMsg('HE ESCAPED!', esc(txt), b);
      say(txt + ' Press Enter to try again' + (tries >= 1 ? ', or S to skip the chase.' : '.'));
    }

    function caught(skipped) {
      if (state === 'caught') return;
      state = 'caught'; cancelAnimationFrame(raf); banner.classList.remove('on');
      Sfx.stop('traffic', 500); Sfx.stop('sad', 200);
      showMsg('CAUGHT!', '🚔 The police cut off ' + esc(o.target) + '. <i>"Why are you running?"</i>', []);
      say('The police catch up with ' + o.target + '. Why are you running?');
      var done = false;
      function fin() {
        if (done) return; done = true; clearTimeout(safety);
        cleanup();
        o.onDone({ crashes: S.crashes, skipped: !!skipped });
      }
      var safety = setTimeout(fin, 9500);
      setTimeout(function () { Sfx.play('running', { onend: function () { setTimeout(fin, 500); } }); }, 400);
    }

    function cleanup() {
      if (ended) return; ended = true;
      cancelAnimationFrame(raf); w.removeEventListener('keydown', onKey, true); w.removeEventListener('resize', resize);
      Sfx.stop('traffic', 300);
      try { ac && ac.close(); } catch (e) {}
      if (root.parentNode) root.parentNode.removeChild(root);
      try { prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true }); } catch (e) {}
    }

    /* ---------- input ---------- */
    function lane(d) {
      if (state !== 'run') return;
      var n = Math.max(0, Math.min(2, S.lane + d));
      if (n === S.lane) { tone(120, .08, .15, 'square', d * .8); return; }
      S.lane = n; tone(n === 1 ? 300 : 360, .06, .08, 'triangle', (n - 1) * .8);
    }
    function counter() {
      if (state !== 'run' || !S.trick || S.trick.done) return;
      S.trick.done = true; S.brake = .5; S.gap = Math.max(0, S.gap - .1);
      banner.classList.remove('on'); tone(660, .12, .15, 'triangle'); setTimeout(function () { tone(990, .2, .15, 'triangle'); }, 110);
      Sfx.play('clap', { maxMs: 1500, fade: 300, vol: .6 });
      say('Got him! You counter the trick.');
    }
    function onKey(e) {
      var k = e.key, used = false;
      if (e.altKey || e.ctrlKey || e.metaKey || k === 'Tab') return;   // Alt+M (menu) and Tab (buttons) still work
      if (state === 'run') {
        used = true;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') lane(-1);
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') lane(1);
        else if (k === ' ' || k === 'ArrowUp' || k === 'Enter' || k === 'w' || k === 'W') counter();
        else if (k === 's' || k === 'S') caught(true);
        else used = false;
      } else if (state === 'ready') {
        used = true;
        if (k === 'Enter' || k === ' ') go(); else if (k === 't' || k === 'T') tog(); else if (k === 's' || k === 'S') caught(true); else used = false;
      } else if (state === 'lost') {
        used = true;
        if (k === 'Enter' || k === ' ') go(); else if (k === 's' || k === 'S') caught(true); else used = false;
      } else used = true;   // caught: swallow keys while the sound plays
      if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
    }
    w.addEventListener('keydown', onKey, true);
    root.setAttribute('tabindex', '-1');

    cv.addEventListener('pointerdown', function (e) {
      if (state === 'ready') return;
      var r = cv.getBoundingClientRect(); lane((e.clientX - r.left) < r.width / 2 ? -1 : 1);
    });
    Array.prototype.forEach.call(root.querySelectorAll('.ctl button'), function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); var a = b.dataset.a;
        if (a === 'L') lane(-1); else if (a === 'R') lane(1); else counter();
      });
      b.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });

    /* ---------- simulation ---------- */
    function spawnRow() {
      var cs = carSize(), n = Math.random() < .35 ? 2 : 1, free = Math.floor(Math.random() * 3), lanes = [0, 1, 2].filter(function (l) { return l !== free; });
      if (n === 1) lanes = [lanes[Math.floor(Math.random() * 2)]];
      lanes.forEach(function (l) {
        var kinds = ['car', 'car', 'danfo', 'okada', 'truck'], kd = kinds[Math.floor(Math.random() * kinds.length)];
        var sz = { car: [cs.w, cs.h], danfo: [cs.w * 1.05, cs.h * 1.25], okada: [cs.w * .38, cs.h * .8], truck: [cs.w * 1.1, cs.h * 1.5] }[kd];
        S.obs.push({ lane: l, y: -sz[1], w: sz[0], h: sz[1], kind: kd, color: kd === 'danfo' ? '#f5c518' : COLORS[Math.floor(Math.random() * COLORS.length)], warned: false, hit: false });
      });
    }

    function update(dt) {
      var AS = Sfx.assist(), spd = H * (AS ? .3 : .6);
      S.t += dt; S.scroll = (S.scroll + spd * dt) % 80; S.px += (S.lane - S.px) * Math.min(1, dt * 9);
      S.lean += ((S.lane - S.px) * .22 - S.lean) * Math.min(1, dt * 10); S.tlean += ((S.tlane - S.tx) * .22 - S.tlean) * Math.min(1, dt * 8);
      S.spawn -= dt; if (S.spawn <= 0) { spawnRow(); S.spawn = (.75 + Math.random() * .75) * (AS ? 1.8 : 1); }
      if (S.brake > 0) S.brake -= dt;
      if (S.inv > 0) S.inv -= dt; if (S.shake > 0) S.shake -= dt;
      S.tswitch -= dt; if (S.tswitch <= 0) { S.tlane = Math.floor(Math.random() * 3); S.tswitch = 1.2 + Math.random() * 1.5; }
      S.tx += (S.tlane - S.tx) * Math.min(1, dt * 3.2);

      var cs = carSize(), py = playerY(), dangerNow = null, rd = road();
      // particles: sparks, smoke, debris
      S.fx.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.l -= dt; });
      S.fx = S.fx.filter(function (p) { return p.l > 0; });
      S.smoke -= dt; if (S.smoke <= 0 && S.fx.length < 160) { S.smoke = .045; S.fx.push({ x: rd.x + rd.lw * (S.px + .5) + rand(-4, 4), y: py + cs.h * .52, vx: rand(-12, 12), vy: spd * .35, g: 0, l: .7, m: .7, r: rand(2.5, 5), c: '190,190,200', k: 's' }); }
      S.obs.forEach(function (ob) {
        ob.y += spd * dt;
        if (ob.hit) { ob.ox = (ob.ox || 0) + ob.push * dt; ob.rot = (ob.rot || 0) + ob.spin * dt; }
        if (!ob.warned && ob.y > H * .02) { ob.warned = true; honk((ob.lane - 1) * .85); }
        var dy = Math.abs(ob.y - py), dxl = Math.abs(ob.lane - S.px);
        if (!ob.hit && S.inv <= 0 && dy < (ob.h + cs.h) * .46 && dxl < .62) {
          ob.hit = true; S.inv = .9; S.crashes++; crEl.textContent = S.crashes; S.gap = Math.min(1.05, S.gap + (AS ? .05 : .12)); S.shake = .35;
          crash(); say('Crash! He pulls away.');
          var hx = rd.x + rd.lw * (S.px + .5);
          ob.push = (ob.lane < S.px ? -1 : ob.lane > S.px ? 1 : (Math.random() < .5 ? -1 : 1)) * rand(120, 220); ob.spin = (Math.random() < .5 ? -1 : 1) * rand(2.5, 5);
          for (var q = 0; q < 22; q++) S.fx.push({ x: hx, y: py - cs.h * .45, vx: rand(-190, 190), vy: rand(-240, -20), g: 560, l: rand(.3, .8), m: .8, r: rand(1.4, 3), c: '255,' + Math.floor(rand(150, 235)) + ',60', k: 'p' });
          for (var q2 = 0; q2 < 8; q2++) S.fx.push({ x: hx, y: py - cs.h * .3, vx: rand(-60, 60), vy: rand(-80, -10), g: 0, l: 1, m: 1, r: rand(5, 9), c: '120,120,130', k: 's' });
        }
        if (ob.y > py - H * .45 && ob.y < py - cs.h && ob.lane === S.lane) dangerNow = ob;
      });
      S.obs = S.obs.filter(function (ob) { return ob.y < H + 120; });

      // spoken lane warning (for players who cannot see the road)
      S.lastLaneWarn -= dt;
      if (dangerNow && S.lastLaneWarn <= 0) {
        var occ = {}; S.obs.forEach(function (ob) { if (ob.y > py - H * .6 && ob.y < py) occ[ob.lane] = 1; });
        var freeL = [0, 1, 2].filter(function (l) { return !occ[l]; }), dir = '';
        if (freeL.length) { var best = freeL.sort(function (a, b) { return Math.abs(a - S.lane) - Math.abs(b - S.lane); })[0]; dir = best < S.lane ? ' Go left.' : ' Go right.'; }
        S.lastLaneWarn = 1.6; say(dir ? dir.trim() : 'Traffic ahead.'); tone(520, .09, .1, 'triangle', (S.lane - 1) * .8);
      }

      // closing in
      S.gap -= dt * (AS ? .07 : .045);
      S.nextAnn -= dt;
      if (AS && !dangerNow && S.nextAnn <= 0 && !(S.trick && !S.trick.done)) { S.nextAnn = 7; say(S.gap < .3 ? 'Almost on him.' : S.gap < .6 ? 'Closing in.' : 'He is still far ahead.'); }
      gapEl.style.width = Math.max(0, Math.min(100, S.gap * 100)) + '%';

      // the culprit's tricks
      if (!S.trick && ((S.tricksDone === 0 && S.gap < .5) || (S.tricksDone === 1 && S.gap < .25))) {
        S.trick = { t: AS ? 6 : 2.2, done: false }; S.tricksDone++;
        var msgs = ['TRICK! He swerves and hurls open a door! SPACE!', 'TRICK! Fake siren behind you! SPACE!'];
        banner.textContent = msgs[S.tricksDone - 1] || msgs[0]; banner.classList.add('on');
        alarm(); setTimeout(alarm, 450);
        say(msgs[S.tricksDone - 1].replace('SPACE', 'press Space'));
      }
      if (S.trick && !S.trick.done) {
        S.trick.t -= dt;
        if (S.trick.t <= 0) {
          S.trick.done = true; banner.classList.remove('on');
          S.gap = Math.min(1.05, S.gap + (AS ? .03 : .1)); S.shake = .3;
          Sfx.play('emotional');                 // the trick caught you out
          say('You fell for it! He pulls away.');
        }
      }
      if (S.trick && S.trick.done && S.trick.t > -3) S.trick.t -= dt;
      if (S.trick && S.trick.done && S.trick.t <= -3) S.trick = null;

      if (S.gap <= .02) { caught(false); return; }
      if (S.gap >= 1 || S.t > (AS ? 120 : 40)) lose();   // too many crashes, or too slow
    }

    /* ---------- drawing ---------- */
    function rr(x, y, w_, h_, r) {
      cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w_, y, x + w_, y + h_, r); cx.arcTo(x + w_, y + h_, x, y + h_, r);
      cx.arcTo(x, y + h_, x, y, r); cx.arcTo(x, y, x + w_, y, r); cx.closePath();
    }
    function vehicle(x, y, w_, h_, color, kind, flash, rot) {
      cx.save(); cx.translate(x, y); if (rot) cx.rotate(rot);
      cx.fillStyle = 'rgba(0,0,0,.35)'; rr(-w_ / 2 + 3, -h_ / 2 + 5, w_, h_, w_ * .18); cx.fill();
      if (kind === 'okada') {
        cx.fillStyle = color; rr(-w_ * .35, -h_ / 2, w_ * .7, h_, w_ * .3); cx.fill();
        cx.fillStyle = '#ffd29a'; cx.beginPath(); cx.arc(0, -h_ * .12, w_ * .36, 0, 7); cx.fill();
        cx.fillStyle = '#222'; cx.beginPath(); cx.arc(0, -h_ * .12, w_ * .22, 0, 7); cx.fill();
        cx.restore(); return;
      }
      cx.fillStyle = color; rr(-w_ / 2, -h_ / 2, w_, h_, w_ * .18); cx.fill();
      if (kind === 'danfo') { cx.fillStyle = '#111'; cx.fillRect(-w_ / 2, -h_ * .04, w_, h_ * .1); }
      cx.fillStyle = 'rgba(20,30,50,.85)'; rr(-w_ * .38, -h_ * .36, w_ * .76, h_ * .2, w_ * .06); cx.fill();      // windscreen
      cx.fillStyle = 'rgba(20,30,50,.6)'; rr(-w_ * .36, h_ * .2, w_ * .72, h_ * .13, w_ * .05); cx.fill();         // rear window
      cx.fillStyle = '#ff2d4d'; cx.fillRect(-w_ * .42, h_ / 2 - 5, w_ * .2, 4); cx.fillRect(w_ * .22, h_ / 2 - 5, w_ * .2, 4);
      cx.globalAlpha = flash ? .55 : .22; cx.beginPath(); cx.arc(-w_ * .32, h_ / 2 - 3, w_ * (flash ? .34 : .22), 0, 7); cx.arc(w_ * .32, h_ / 2 - 3, w_ * (flash ? .34 : .22), 0, 7); cx.fill(); cx.globalAlpha = 1;
      cx.restore();
    }

    function draw() {
      var r = road(), cs = carSize();
      cx.save();
      if (S.shake > 0) { var amp = Math.min(1, S.shake / .35) * 12; cx.translate((Math.random() - .5) * amp, (Math.random() - .5) * amp); }
      cx.fillStyle = '#07070f'; cx.fillRect(-20, -20, W + 40, H + 40);
      // city lights either side
      for (var i = 0; i < 14; i++) {
        var yy = ((i * 70 + S.scroll * 1.2) % (H + 60)) - 30;
        cx.fillStyle = i % 3 === 0 ? '#f2a93b' : i % 3 === 1 ? '#3b4cc0' : '#ff2d4d';
        cx.globalAlpha = .55; cx.fillRect(r.x - 18 - (i % 4) * 9, yy, 5, 5); cx.fillRect(r.x + r.w + 12 + (i % 4) * 9, yy + 20, 5, 5); cx.globalAlpha = 1;
      }
      // road
      cx.fillStyle = '#2b2b33'; cx.fillRect(r.x, 0, r.w, H);
      cx.fillStyle = '#ffd400'; cx.fillRect(r.x - 4, 0, 4, H); cx.fillRect(r.x + r.w, 0, 4, H);
      cx.fillStyle = '#d8d8d8';
      for (var l = 1; l < 3; l++) for (var d = -80; d < H + 80; d += 80) cx.fillRect(r.x + r.lw * l - 2, d + S.scroll, 4, 38);

      // obstacles
      // speed streaks along the road edges
      cx.fillStyle = 'rgba(255,255,255,.12)';
      for (var sl = 0; sl < 10; sl++) { var sy = ((sl * 97 + S.scroll * 5) % (H + 80)) - 40; cx.fillRect(r.x + 6 + (sl % 3) * 5, sy, 2, 26 + (sl % 4) * 10); cx.fillRect(r.x + r.w - 8 - (sl % 3) * 5, sy + 30, 2, 26 + (sl % 4) * 10); }
      S.obs.forEach(function (ob) { vehicle(laneX(ob.lane) + (ob.ox || 0), ob.y, ob.w, ob.h, ob.color, ob.kind, false, (ob.rot || 0) + Math.sin(S.t * 3 + ob.lane) * .008); });

      // the getaway car
      var ty = targetY(), tx = r.x + r.lw * (S.tx + .5);
      vehicle(tx, ty, cs.w, cs.h, '#15151c', 'car', S.brake > 0, S.tlean);
      cx.fillStyle = '#d9a441'; cx.fillRect(tx - cs.w / 2, ty - cs.h * .02, cs.w, 3);
      cx.fillStyle = '#fff'; cx.font = 'bold ' + Math.max(8, cs.w * .17) + 'px monospace'; cx.textAlign = 'center'; cx.fillText(o.plate, tx, ty + cs.h * .42);

      // the police car
      var px = r.x + r.lw * (S.px + .5), py = playerY(), fl = Math.floor(S.t * 8) % 2;
      var cone = cx.createLinearGradient(0, py - cs.h * .5, 0, py - cs.h * 3.2); cone.addColorStop(0, 'rgba(255,245,200,.26)'); cone.addColorStop(1, 'rgba(255,245,200,0)');
      cx.fillStyle = cone; cx.beginPath(); cx.moveTo(px - cs.w * .3, py - cs.h * .5); cx.lineTo(px - cs.w * .9, py - cs.h * 3.2); cx.lineTo(px + cs.w * .9, py - cs.h * 3.2); cx.lineTo(px + cs.w * .3, py - cs.h * .5); cx.fill();
      cx.save(); cx.translate(px, py); cx.rotate(S.lean); cx.translate(-px, -py);
      vehicle(px, py, cs.w, cs.h, '#f4f4f4', 'car');
      cx.fillStyle = '#1b4fd6'; cx.fillRect(px - cs.w / 2, py - cs.h * .02, cs.w, cs.h * .1);
      cx.fillStyle = fl ? '#ff2d4d' : '#3b6bff'; cx.fillRect(px - cs.w * .3, py - cs.h * .08, cs.w * .25, 6);
      cx.fillStyle = fl ? '#3b6bff' : '#ff2d4d'; cx.fillRect(px + cs.w * .05, py - cs.h * .08, cs.w * .25, 6);
      cx.globalAlpha = .18; cx.fillStyle = fl ? '#ff2d4d' : '#3b6bff'; cx.beginPath(); cx.arc(px, py, cs.w * 1.6, 0, 7); cx.fill(); cx.globalAlpha = 1;
      if (S.inv > 0 && Math.floor(S.t * 20) % 2) { cx.strokeStyle = '#fff'; cx.lineWidth = 3; rr(px - cs.w / 2 - 3, py - cs.h / 2 - 3, cs.w + 6, cs.h + 6, 8); cx.stroke(); }
      cx.restore();
      // sparks and smoke
      S.fx.forEach(function (p) {
        var k = Math.max(0, p.l / p.m); cx.globalAlpha = p.k === 's' ? k * .38 : k; cx.fillStyle = 'rgb(' + p.c + ')';
        cx.beginPath(); cx.arc(p.x, p.y, p.r * (p.k === 's' ? 1 + (1 - k) * 1.8 : 1), 0, 7); cx.fill();
      });
      cx.globalAlpha = 1;

      // headlight vignette
      var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(7,7,15,.65)'); g.addColorStop(.35, 'rgba(7,7,15,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.restore();
    }

    function loop(ts) {
      if (state !== 'run') { draw(); return; }
      if (!last) last = ts; var dt = Math.min(.05, (ts - last) / 1000); last = ts;
      update(dt); draw();
      if (state === 'run') raf = requestAnimationFrame(loop);
    }

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    draw();
    intro();
    return { skip: function () { caught(true); }, cleanup: cleanup,
      peek: function () { return { S: S, H: H, py: playerY(), cs: carSize(), state: state }; } };   // read-only view, handy for testing
  }

  w.Traffic = { start: start };
})(window);
