/* polish.js - the moving picture of The Detective, shared by the menu and every game

   What it adds (all decoration: aria-hidden, no pointer events, nothing a screen reader can trip over):
     - a living night behind the game: twinkling stars, drifting haze, fireflies, and (Balogun) a lit skyline that slides with you
     - every new screen settles in (fade + rise), and buttons, cards and clue papers pop in one after another
     - the text panel fades in line by line
     - a ring ripples out from every tap or click, so touch screens feel alive
     - buttons lift on hover and press down when pushed
     - Polish.parallax(n)  slide the skyline (Balogun calls this as you walk)
     - Polish.skyline(opts) turn the lit skyline on
     - Polish.dust(x, y)    a puff of dust at a point (footsteps)

   It stands down for the Visual effects setting (dt_fx = 0), the system "reduce motion" setting, and high contrast. */
(function (w) {
  'use strict';
  var D = document, P = {}, RM = false, made = false, sky = null;
  try { RM = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  function on() {
    var fx = true; try { fx = localStorage.getItem('dt_fx') !== '0'; } catch (e) {}
    return fx && !RM && !D.documentElement.classList.contains('hc');
  }

  var CSS = '' +
    'html{-webkit-tap-highlight-color:transparent}' +
    'button,.btn,.spot,.sm{touch-action:manipulation}' +
    '#pl-sky{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;transition:opacity 1.2s}' +
    'body.dawn #pl-sky .st,body.dawn #pl-sky .ff{opacity:0}body.court #pl-sky .sk{opacity:0}' +
    'html.hc #pl-sky,html.pl-off #pl-sky{display:none}' +
    '#pl-sky .st{position:absolute;left:0;top:0;width:2px;height:2px;border-radius:50%;background:transparent;animation:plTw 4.6s ease-in-out infinite alternate}' +
    '#pl-sky .st.b{animation-duration:6.4s;animation-delay:-2.3s}' +
    '@keyframes plTw{0%{opacity:.25}100%{opacity:.95}}' +
    '#pl-sky .hz{position:absolute;width:70vw;height:50vh;border-radius:50%;filter:blur(60px);opacity:.22;animation:plHz 38s ease-in-out infinite alternate}' +
    '#pl-sky .hz.a{left:-15vw;top:5vh;background:#6a3fa0}#pl-sky .hz.b{right:-20vw;top:30vh;background:#c0562f;animation-duration:52s;animation-delay:-14s;opacity:.14}' +
    '@keyframes plHz{to{transform:translate(18vw,6vh) scale(1.25)}}' +
    '#pl-sky .ff{position:absolute;width:5px;height:5px;border-radius:50%;background:#ffe08a;box-shadow:0 0 12px 4px rgba(255,214,102,.55);opacity:0;animation:plFf var(--d,14s) ease-in-out infinite;animation-delay:var(--w,0s)}' +
    '@keyframes plFf{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}50%{opacity:.5;transform:translate(var(--dx,30px),var(--dy,-60px))}85%{opacity:.9}100%{opacity:0;transform:translate(calc(var(--dx,30px)*-.6),calc(var(--dy,-60px)*1.6))}}' +
    '#pl-sky .sk{position:absolute;left:0;right:0;opacity:.85;transition:opacity 1s;background-repeat:repeat-x;background-size:auto 100%;background-position:calc(var(--pl-x,0) * -.9vw) 100%}' +
    /* screens settle in */
    '@keyframes plIn{from{opacity:0;transform:translateY(14px)}}' +
    '@keyframes plPop{from{opacity:0;transform:translateY(12px) scale(.96)}}' +
    '@keyframes plTxt{from{opacity:0;filter:blur(3px)}}' +
    '.pl-in{animation:plIn .42s cubic-bezier(.2,.8,.25,1) both}' +
    '.pl-pop{animation:plPop .4s cubic-bezier(.2,.9,.3,1.15) backwards}' +
    '.pl-txt{animation:plTxt .5s ease-out}' +
    /* tactile buttons */
    '.btn,.spot,.sm,#opts button:not(.pad){transition:transform .16s cubic-bezier(.3,1.4,.5,1),box-shadow .2s,background-color .15s,color .15s,border-color .15s}' +
    '@media(hover:hover){.btn:hover,.spot:hover,.sm:hover,#opts button:not(.pad):hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.35)}}' +
    '.btn:active,.spot:active,.sm:active,#opts button:not(.pad):active{transform:translateY(1px) scale(.975);box-shadow:none}' +
    '#pl-rip{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483200;pointer-events:none}' +
    '#pl-rip i{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid rgba(255,212,0,.9);animation:plRip .55s ease-out forwards}' +
    '@keyframes plRip{to{transform:scale(7);opacity:0;border-width:1px}}' +
    '#pl-rip u{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:rgba(255,214,150,.7);text-decoration:none;animation:plDust .8s ease-out forwards}' +
    '@keyframes plDust{to{transform:translate(var(--dx,0),var(--dy,-20px)) scale(2.4);opacity:0}}' +
    'html.pl-off .pl-in,html.pl-off .pl-pop,html.pl-off .pl-txt{animation:none}' +
    '@media(prefers-reduced-motion:reduce){.pl-in,.pl-pop,.pl-txt{animation:none!important}#pl-sky *{animation:none!important}}';

  var st = D.createElement('style'); st.textContent = CSS; (D.head || D.documentElement).appendChild(st);

  /* a tiny seeded generator, so the skyline and stars look the same on every visit */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function stars(n, seed, cls) {
    var r = rng(seed), s = [];
    for (var i = 0; i < n; i++) s.push((r() * 100).toFixed(1) + 'vw ' + (r() * 62).toFixed(1) + 'vh 0 ' + (r() < .2 ? '1px' : '0') + ' rgba(255,246,220,' + (.5 + r() * .5).toFixed(2) + ')');
    var d = D.createElement('div'); d.className = 'st ' + (cls || ''); d.style.boxShadow = s.join(','); return d;
  }
  function make() {
    if (made || !D.body) return; made = true;
    sky = D.createElement('div'); sky.id = 'pl-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.appendChild(stars(46, 11)); sky.appendChild(stars(34, 77, 'b'));
    ['a', 'b'].forEach(function (c) { var h = D.createElement('div'); h.className = 'hz ' + c; sky.appendChild(h); });
    var r = rng(5);
    for (var i = 0; i < 12; i++) {
      var f = D.createElement('div'); f.className = 'ff';
      f.style.left = (r() * 96).toFixed(1) + 'vw'; f.style.top = (38 + r() * 50).toFixed(1) + 'vh';
      f.style.setProperty('--dx', ((r() - .5) * 120).toFixed(0) + 'px'); f.style.setProperty('--dy', (-30 - r() * 90).toFixed(0) + 'px');
      f.style.setProperty('--d', (11 + r() * 12).toFixed(1) + 's'); f.style.setProperty('--w', (-r() * 14).toFixed(1) + 's');
      sky.appendChild(f);
    }
    D.body.insertBefore(sky, D.body.firstChild);
    var rp = D.createElement('div'); rp.id = 'pl-rip'; rp.setAttribute('aria-hidden', 'true'); D.body.appendChild(rp);
    sync();
  }
  function sync() { D.documentElement.classList.toggle('pl-off', !on()); }

  /* ---- Lagos skyline: lit windows, water towers, a mast. One SVG tile, repeated. ---- */
  P.skyline = function (o) {
    o = o || {}; make(); if (!sky) return;
    var r = rng(23), W = 1200, H = 300, x = 0, svg = '';
    while (x < W) {
      var bw = 50 + r() * 90, bh = 70 + r() * 170, col = r() < .5 ? '#1a1236' : '#211846';
      svg += '<rect x="' + x.toFixed(0) + '" y="' + (H - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" fill="' + col + '"/>';
      if (r() < .3) svg += '<rect x="' + (x + bw * .3).toFixed(0) + '" y="' + (H - bh - 26).toFixed(0) + '" width="' + (bw * .4).toFixed(0) + '" height="26" fill="' + col + '"/><rect x="' + (x + bw * .46).toFixed(0) + '" y="' + (H - bh - 60).toFixed(0) + '" width="3" height="34" fill="' + col + '"/>';
      for (var wy = H - bh + 12; wy < H - 14; wy += 20) for (var wx = x + 8; wx < x + bw - 10; wx += 16) if (r() < .34) svg += '<rect x="' + wx.toFixed(0) + '" y="' + wy.toFixed(0) + '" width="6" height="9" fill="#ffd27a" opacity="' + (.35 + r() * .6).toFixed(2) + '"/>';
      x += bw + 2 + r() * 10;
    }
    var uri = "url(\"data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + svg + '</svg>') + "\")";
    var d = D.createElement('div'); d.className = 'sk'; d.style.bottom = o.bottom || '40%'; d.style.height = o.height || '26vh'; d.style.backgroundImage = uri;
    d.style.backgroundSize = 'auto 100%';
    sky.appendChild(d);
  };
  P.parallax = function (n) { if (sky) D.documentElement.style.setProperty('--pl-x', String(n)); };

  /* ---- ripple and dust ---- */
  function ripple(x, y) {
    if (!on()) return; make(); var rp = D.getElementById('pl-rip'); if (!rp) return;
    var i = D.createElement('i'); i.style.left = x + 'px'; i.style.top = y + 'px'; rp.appendChild(i); setTimeout(function () { i.remove(); }, 600);
  }
  P.dust = function (x, y) {
    if (!on()) return; make(); var rp = D.getElementById('pl-rip'); if (!rp) return;
    for (var k = 0; k < 3; k++) {
      var u = D.createElement('u'); u.style.left = (x + (Math.random() - .5) * 18) + 'px'; u.style.top = y + 'px';
      u.style.setProperty('--dx', ((Math.random() - .5) * 40) + 'px'); u.style.setProperty('--dy', (-8 - Math.random() * 22) + 'px');
      rp.appendChild(u); (function (e) { setTimeout(function () { e.remove(); }, 850); })(u);
    }
  };
  w.addEventListener('pointerdown', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    if (t.closest('button,.btn,.spot,.sm,[role=button],a')) ripple(e.clientX, e.clientY);
  }, { capture: true, passive: true });

  /* ---- things settle in ---- */
  function stagger(root) {
    var kids = root.querySelectorAll('.btn,.spot,.card,.paper,.log,button'), n = 0;
    for (var i = 0; i < kids.length && n < 16; i++) {
      var k = kids[i]; if (k.classList.contains('pad')) continue;
      k.classList.remove('pl-pop'); k.style.animationDelay = (60 + n * 45) + 'ms'; void k.offsetWidth; k.classList.add('pl-pop'); n++;
    }
  }
  function watch() {
    var main = D.getElementById('main');      // Echo, Siege and the menu shell render into #main (or swap whole screens)
    if (main && main.tagName === 'MAIN' && !main.hasAttribute('data-pl')) {
      main.setAttribute('data-pl', '1');
      var busy = false;
      new MutationObserver(function () {
        if (busy || !on()) return; busy = true;
        requestAnimationFrame(function () {
          main.classList.remove('pl-in'); void main.offsetWidth; main.classList.add('pl-in'); stagger(main);
          setTimeout(function () { main.classList.remove('pl-in'); busy = false; }, 650);
        });
      }).observe(main, { childList: true });
    }
    var txt = D.getElementById('txt'), opts = D.getElementById('opts');     // Balogun's story panel
    if (txt && !txt.hasAttribute('data-pl')) {
      txt.setAttribute('data-pl', '1');
      new MutationObserver(function () { if (!on()) return; txt.classList.remove('pl-txt'); void txt.offsetWidth; txt.classList.add('pl-txt'); }).observe(txt, { childList: true, characterData: true });
    }
    if (opts && !opts.hasAttribute('data-pl')) {
      opts.setAttribute('data-pl', '1');
      new MutationObserver(function () { if (!on()) return; stagger(opts); }).observe(opts, { childList: true });
    }
  }

  P.enter = function (el) {
    if (!el || !on()) return;
    el.classList.remove('pl-in'); void el.offsetWidth; el.classList.add('pl-in'); stagger(el);
    setTimeout(function () { el.classList.remove('pl-in'); }, 700);
  };
  P.refresh = sync;
  w.Polish = P;
  function boot() { make(); watch(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
  w.addEventListener('storage', sync);
})(window);
