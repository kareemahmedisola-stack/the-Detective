/* ==========================================================================
   sfx.js  -  shared sound + effects manager for The Detective
   Used by index.html (menu), games/balogun.html, games/echo.html, js/traffic.js

   Sound map
     intro     Intro sound.mp3           menu screens, and before a case starts
     slap      Slap.mp3                  the Chief slaps you when you accuse him
     sad       Sad tune.mp3              wrong person accused / case lost
     clap      clapp.mp3                 a right decision is taken
     running   why are you running.mp3   police catch up with the culprit
     emotional Emotional damage.mp3      a trick catches you out
     traffic   Cars on the highway.mp3   the traffic chase (looped)

   API
     Sfx.play(name, {vol, maxMs, fade, loop, onend})
     Sfx.stop(name, fadeMs)      Sfx.stopAll(fadeMs)
     Sfx.intro()                 start the menu music (no-op if already on)
     Sfx.stopIntro(fadeMs)       stop it (when a case begins)
     Sfx.setMuted(bool)          Sfx.isMuted()
     Sfx.slapFx(who)             full-screen "SLAP!" effect (also plays the slap)
   ========================================================================== */
(function (w) {
  'use strict';

  var here = document.currentScript && document.currentScript.src;
  var BASE = here ? new URL('../sounds/', here).href : 'sounds/';

  var FILES = {
    intro: 'intro.mp3',
    slap: 'slap.mp3',
    sad: 'sad-tune.mp3',
    clap: 'clap.mp3',
    running: 'why-are-you-running.mp3',
    emotional: 'emotional-damage.mp3',
    traffic: 'cars-on-the-highway.mp3'
  };
  var VOL = { intro: 0.55, slap: 1, sad: 0.8, clap: 0.9, running: 1, emotional: 1, traffic: 0.5 };

  var embedded = w.parent !== w;
  if (embedded) document.documentElement.classList.add('emb');          // running inside the menu shell?
  var muted = false;
  try { muted = localStorage.getItem('dt_muted') === '1'; } catch (e) {}

  var assist = true; try { assist = localStorage.getItem('dt_assist') !== '0'; } catch (e) {}
  var els = {}, timers = {}, fades = {};
  var wantIntro = false, introOn = false;

  function el(name) {
    if (!els[name]) {
      var a = new Audio(BASE + FILES[name]);
      a.preload = name === 'intro' ? 'auto' : 'auto';
      els[name] = a;
    }
    return els[name];
  }

  function clearT(name) {
    if (timers[name]) { clearTimeout(timers[name]); timers[name] = null; }
    if (fades[name]) { clearInterval(fades[name]); fades[name] = null; }
  }

  function play(name, o) {
    o = o || {};
    if (!FILES[name]) return null;
    var done = false;
    function finish() { if (!done) { done = true; if (o.onend) o.onend(); } }
    if (muted) { if (o.onend) setTimeout(finish, Math.min(o.maxMs || 1800, 1800)); return null; }
    var a = el(name);
    clearT(name);
    a.onended = null;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
    a.loop = !!o.loop;
    a.volume = Math.min(1, (o.vol != null ? o.vol : VOL[name]) * 1);
    a.onended = finish;
    var p = a.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay blocked: retry on the first key press or tap.
        var retry = function () {
          removeEventListener('pointerdown', retry, true);
          removeEventListener('keydown', retry, true);
          if (name === 'intro' && !wantIntro) return;
          a.play().catch(function () {});
        };
        addEventListener('pointerdown', retry, true);
        addEventListener('keydown', retry, true);
        if (o.onend) setTimeout(finish, 1500);
      });
    }
    if (o.maxMs) timers[name] = setTimeout(function () { stop(name, o.fade || 500); finish(); }, o.maxMs);
    return a;
  }

  function stop(name, fadeMs) {
    var a = els[name];
    if (!a) return;
    if (timers[name]) { clearTimeout(timers[name]); timers[name] = null; }
    if (fades[name]) { clearInterval(fades[name]); fades[name] = null; }
    if (!fadeMs || a.paused) { try { a.pause(); a.currentTime = 0; } catch (e) {} return; }
    var steps = 12, i = 0, v0 = a.volume;
    fades[name] = setInterval(function () {
      i++;
      a.volume = Math.max(0, v0 * (1 - i / steps));
      if (i >= steps) {
        clearInterval(fades[name]); fades[name] = null;
        try { a.pause(); a.currentTime = 0; } catch (e) {}
        a.volume = v0;
      }
    }, fadeMs / steps);
  }

  function stopAll(fadeMs) { Object.keys(els).forEach(function (n) { stop(n, fadeMs); }); }

  /* ---- intro / menu music --------------------------------------------- */
  function intro() {
    wantIntro = true;
    if (embedded) { try { w.parent.postMessage({ dt: 'intro', on: true }, '*'); } catch (e) {} return; }
    if (introOn && els.intro && !els.intro.paused) return;
    introOn = true;
    play('intro', { loop: true });
  }
  function stopIntro(fadeMs) {
    wantIntro = false;
    if (embedded) { try { w.parent.postMessage({ dt: 'intro', on: false, fade: fadeMs || 700 }, '*'); } catch (e) {} return; }
    introOn = false;
    stop('intro', fadeMs == null ? 700 : fadeMs);
  }

  /* ---- mute ------------------------------------------------------------ */
  function setMuted(m, fromParent) {
    muted = !!m;
    try { localStorage.setItem('dt_muted', muted ? '1' : '0'); } catch (e) {}
    if (muted) stopAll(0);
    else if (wantIntro && !embedded) { introOn = false; intro(); }
    if (!embedded && !fromParent) {
      var fr = document.getElementsByTagName('iframe');
      for (var i = 0; i < fr.length; i++) { try { fr[i].contentWindow.postMessage({ dt: 'mute', on: muted }, '*'); } catch (e) {} }
    }
  }
  addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.dt === 'mute' && e.source === w.parent) setMuted(d.on, true);
  });

  /* ---- Alt+M from inside a game returns to the menu -------------------- */
  addEventListener('keydown', function (e) {
    if (e.altKey && (e.key === 'm' || e.key === 'M') && embedded) {
      e.preventDefault();
      try { w.parent.postMessage({ dt: 'menu' }, '*'); } catch (err) {}
    }
  });

  /* ---- slap effect ------------------------------------------------------ */
  /* The slap, staged like a real hit: a wind-up (the hand pulls back first), a fast whip across,
     an impact frame (white flash + burst lines + squashed text), a damped shake that settles on its
     own, then a red "stinging cheek" vignette that fades slowly. */
  var css = '' +
    '#dt-slap{position:fixed;inset:0;z-index:2147483000;pointer-events:none;display:none;overflow:hidden}' +
    '#dt-slap.on{display:block}' +
    '#dt-slap .fl{position:absolute;inset:0;background:#fff;opacity:0}' +
    '#dt-slap.on .fl{animation:dtfl .7s .3s ease-out both}' +
    '#dt-slap .vg{position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(190,0,30,.7) 100%)}' +
    '#dt-slap.on .vg{animation:dtvg 1.5s .3s ease-out both}' +
    '#dt-slap .ray{position:absolute;left:50%;top:42%;width:min(120vw,900px);height:min(120vw,900px);opacity:0;border-radius:50%;transform:translate(-50%,-50%);background:repeating-conic-gradient(#ffd400 0 5deg,transparent 5deg 15deg);-webkit-mask:radial-gradient(circle,transparent 8%,#000 14%,#000 42%,transparent 70%);mask:radial-gradient(circle,transparent 8%,#000 14%,#000 42%,transparent 70%)}' +
    '#dt-slap.on .ray{animation:dtray .55s .3s cubic-bezier(.2,.8,.3,1) both}' +
    '#dt-slap .hand{position:absolute;top:30%;left:-35%;font-size:min(46vw,380px);line-height:1;opacity:0;filter:drop-shadow(0 0 30px rgba(255,60,40,.7));transform-origin:30% 90%}' +
    '#dt-slap.on .hand{animation:dthand 1.05s cubic-bezier(.4,0,.2,1) both}' +
    '#dt-slap .txt{position:absolute;left:0;right:0;top:12%;text-align:center;font:900 min(18vw,150px)/1 Impact,"Arial Black",sans-serif;color:#ffd400;-webkit-text-stroke:4px #b00020;letter-spacing:.05em;opacity:0}' +
    '#dt-slap.on .txt{animation:dttxt 1.5s .3s ease-out both}' +
    '#dt-slap .who{position:absolute;left:0;right:0;bottom:18%;text-align:center;font:700 min(5vw,34px) system-ui,sans-serif;color:#fff;text-shadow:0 2px 8px #000;opacity:0}' +
    '#dt-slap.on .who{animation:dtwho 1.6s .5s ease-out both}' +
    '@keyframes dtfl{0%{opacity:.95}100%{opacity:0}}' +
    '@keyframes dtvg{0%{opacity:0}12%{opacity:1}100%{opacity:0}}' +
    '@keyframes dtray{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0)}15%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(1.25) rotate(24deg)}}' +
    '@keyframes dthand{0%{left:-35%;top:44%;opacity:0;transform:rotate(-40deg) scale(.9)}' +
      '16%{left:-10%;top:36%;opacity:1;transform:rotate(-58deg) scale(1)}' +        /* wind-up: pull back first */
      '30%{left:36%;top:31%;opacity:1;transform:rotate(4deg) scale(1.22)}' +         /* whip across */
      '35%{left:41%;top:31%;opacity:1;transform:rotate(12deg) scale(1.34)}' +        /* impact, squashed a touch */
      '48%{left:43%;top:32%;opacity:1;transform:rotate(15deg) scale(1.28)}' +
      '75%{left:47%;top:33%;opacity:.9;transform:rotate(22deg) scale(1.12)}' +       /* recoil and settle */
      '100%{left:62%;top:37%;opacity:0;transform:rotate(34deg) scale(1)}}' +
    '@keyframes dttxt{0%{opacity:0;transform:scale(.3) rotate(-10deg)}14%{opacity:1;transform:scale(1.45) rotate(-5deg)}26%{transform:scale(.94) rotate(-6deg)}38%{transform:scale(1.06) rotate(-6deg)}70%{opacity:1;transform:scale(1) rotate(-6deg)}100%{opacity:0;transform:scale(1.06) rotate(-6deg)}}' +
    '@keyframes dtwho{0%{opacity:0;transform:translateY(10px)}25%{opacity:1;transform:none}100%{opacity:0}}' +
    /* a damped shake: big first, then it settles like a real jolt */
    '@keyframes dtshake{0%{transform:translate(0,0)}8%{transform:translate(-26px,6px) rotate(-1.6deg)}18%{transform:translate(22px,-5px) rotate(1.3deg)}30%{transform:translate(-15px,4px) rotate(-.9deg)}44%{transform:translate(10px,-3px) rotate(.6deg)}60%{transform:translate(-6px,2px)}78%{transform:translate(3px,-1px)}100%{transform:translate(0,0)}}' +
    '.dt-shake{animation:dtshake .65s ease-out}' +
    '@media(prefers-reduced-motion:reduce){#dt-slap .hand,#dt-slap .txt,#dt-slap .who,#dt-slap .fl,#dt-slap .ray,#dt-slap .vg{animation:none!important}#dt-slap.on .txt{opacity:1;transform:none}.dt-shake{animation:none}}';

  function slapFx(who) {
    if (!document.getElementById('dt-slap-css')) {
      var st = document.createElement('style'); st.id = 'dt-slap-css'; st.textContent = css; document.head.appendChild(st);
    }
    var box = document.getElementById('dt-slap');
    if (!box) {
      box = document.createElement('div'); box.id = 'dt-slap'; box.setAttribute('aria-hidden', 'true');
      box.innerHTML = '<div class="fl"></div><div class="vg"></div><div class="ray"></div><div class="hand">\uD83D\uDD90\uD83C\uDFFE</div><div class="txt">SLAP!</div><div class="who"></div>';
      document.body.appendChild(box);
    }
    /* shake the game's main area, not <body>: a transform on body would drag every fixed element with it */
    var tgt = document.querySelector('main') || document.body;
    box.querySelector('.who').textContent = who ? who + ' slaps you across the face!' : '';
    box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
    tgt.classList.remove('dt-shake'); void tgt.offsetWidth;
    setTimeout(function () { tgt.classList.add('dt-shake'); }, 330);   // lands with the hit
    setTimeout(function () { tgt.classList.remove('dt-shake'); }, 1050);
    setTimeout(function () { box.classList.remove('on'); }, 2000);
    setTimeout(function () { play('slap'); }, 330);
  }

  w.Sfx = {
    play: play, stop: stop, stopAll: stopAll,
    intro: intro, stopIntro: stopIntro,
    setMuted: function (m) { setMuted(m, false); },
    isMuted: function () { return muted; },
    slapFx: slapFx,
    // tell the menu shell a case has been solved (lets "Play both" offer the next case)
    done: function (game, result) { if (embedded) { try { w.parent.postMessage({ dt: 'done', game: game, result: result }, '*'); } catch (e) {} } },
    embedded: embedded,
    assist: function () { return assist; },
    setAssist: function (v) { assist = !!v; try { localStorage.setItem('dt_assist', v ? '1' : '0'); } catch (e) {} }
  };
})(window);
