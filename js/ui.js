/* ui.js - interface and accessibility fixes shared by the menu and every game

   - Tidy, equal-height, evenly aligned buttons; every button is at least 44px tall (a comfortable touch target)
   - The caption bar no longer hides the buttons under it: the page makes room for it, and a tap folds it away
   - Headings that take focus no longer show a wide stray box
   - A touch-friendly accessibility button (bottom right) with Where am I, Goal, Recap, Compass, Evidence,
     Help, High contrast and Text size, so phone players can reach everything the keyboard keys do
   - Text size (100, 115, 130, 150 percent), remembered, shared by every game
   - Respects safe areas (notches, home bar) and "reduce motion"                                              */
(function (w) {
  'use strict';
  var D = document, U = {};
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var CSS = '' +
    'button,.btn,.sm,.acc-b,select,summary{min-height:44px}' +
    'button,.btn,.sm{-webkit-user-select:none;user-select:none}' +
    '.btn,.sm,#opts button,.acc-b{display:flex;align-items:center;gap:.55rem;line-height:1.3}' +
    '.sm,#opts button:not(.pad){justify-content:center;text-align:center}' +
    '.btn{justify-content:flex-start;text-align:left}.btn.primary,.btn.big{justify-content:center;text-align:center}' +
    '.btn b,.btn span{display:block}' +
    /* headings that take focus: a tidy underline, not a full-width box */
    'h1[tabindex="-1"],h2[tabindex="-1"]{width:fit-content;max-width:100%}' +
    'h1[tabindex="-1"]:focus-visible,h2[tabindex="-1"]:focus-visible{outline:0!important;box-shadow:0 .28em 0 -.16em currentColor}' +
    /* a clear, consistent keyboard focus ring everywhere */
    ':focus-visible{outline:3px solid #fff!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(0,0,0,.55)}' +
    'a{text-underline-offset:.15em}' +
    /* caption bar */
    '#cap{max-height:min(20vh,9rem);overflow:auto;pointer-events:auto!important;cursor:pointer;padding-bottom:calc(.6rem + env(safe-area-inset-bottom))!important}' +
    '#cap.ui-min{max-height:2.7em;overflow:hidden}' +
    '#cap:not(:empty)::after{content:"Tap to fold";display:block;margin-top:.25rem;font-size:.75rem;opacity:.6;text-align:right}' +
    '#cap.ui-min:not(:empty)::after{content:"Tap to unfold"}' +
    'body.ui-has-cap main#main{padding-bottom:calc(var(--ui-cap,0px) + 5rem)!important}' +
    /* floating accessibility button */
    '#ui-fab{position:fixed;right:max(.7rem,env(safe-area-inset-right));bottom:calc(var(--ui-cap,0px) + max(.7rem,env(safe-area-inset-bottom)) + .4rem);z-index:2147483100;width:48px;height:48px;min-height:48px;padding:0;border-radius:50%;border:2px solid #ffd400;background:#120e28;color:#ffd400;font:800 1.15rem/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.5);display:grid;place-items:center}' +
    '#ui-fab[aria-expanded=true]{background:#ffd400;color:#120e28}' +
    '#ui-menu{position:fixed;right:max(.7rem,env(safe-area-inset-right));bottom:calc(var(--ui-cap,0px) + max(.7rem,env(safe-area-inset-bottom)) + 4rem);z-index:2147483100;width:min(17rem,calc(100vw - 1.4rem));max-height:70vh;overflow:auto;padding:.5rem;border-radius:14px;border:2px solid #ffd400;background:rgba(18,14,40,.97);box-shadow:0 10px 30px rgba(0,0,0,.6)}' +
    '#ui-menu[hidden]{display:none}' +
    '#ui-menu button{display:flex;width:100%;margin:.2rem 0;padding:.55rem .8rem;border-radius:9px;border:2px solid #6a5a9a;background:#1d1538;color:#f6efe2;font:600 .98rem/1.25 system-ui,sans-serif;text-align:left;justify-content:flex-start;cursor:pointer}' +
    '#ui-menu button:hover{background:#f2a93b;color:#111}' +
    '#ui-menu kbd{margin-left:auto;font:600 .8rem ui-monospace,monospace;opacity:.8;border:1px solid currentColor;border-radius:4px;padding:0 .3rem}' +
    'html.hc #ui-fab,html.hc #ui-menu,html.hc #ui-menu button{background:#000!important;color:#ffeb3b!important;border-color:#ffeb3b!important}' +
    '@media(prefers-reduced-motion:reduce){#cap{transition:none}}' +
    '@media print{#ui-fab,#ui-menu{display:none}}';
  var st = D.createElement('style'); st.id = 'ui-css'; st.textContent = CSS; (D.head || D.documentElement).appendChild(st);

  /* ---- text size ---- */
  var SIZES = [100, 115, 130, 150];
  function applySize() {
    var p = +get('dt_ts', '100'); if (SIZES.indexOf(p) < 0) p = 100;
    D.documentElement.style.fontSize = p === 100 ? '' : p + '%';
  }
  U.textSize = function () { return +get('dt_ts', '100'); };
  U.cycleText = function () {
    var i = SIZES.indexOf(U.textSize()); var n = SIZES[(i + 1) % SIZES.length];
    put('dt_ts', String(n)); applySize();
    try { w.Access && Access.say('Text size ' + n + ' percent.'); } catch (e) {}
    paintMenu(); return n;
  };
  applySize();
  w.addEventListener('storage', applySize);

  /* ---- caption bar: make room, and fold on tap ---- */
  function watchCaption() {
    var cap = D.getElementById('cap'); if (!cap || cap.getAttribute('data-ui')) return;
    cap.setAttribute('data-ui', '1'); D.body.classList.add('ui-has-cap');
    cap.addEventListener('click', function () { cap.classList.toggle('ui-min'); size(); });
    function size() { D.documentElement.style.setProperty('--ui-cap', (cap.offsetHeight || 0) + 'px'); }
    try { new ResizeObserver(size).observe(cap); } catch (e) { setInterval(size, 800); }
    new MutationObserver(size).observe(cap, { childList: true, characterData: true, subtree: true });
    size();
  }

  /* ---- Balogun's option buttons: one column when the labels are long sentences ---- */
  function watchOpts() {
    var o = D.getElementById('opts'); if (!o || o.getAttribute('data-ui')) return; o.setAttribute('data-ui', '1');
    function fit() { var long = false, bs = o.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) if ((bs[i].textContent || '').length > 28) long = true; o.classList.toggle('ui-long', long); }
    new MutationObserver(fit).observe(o, { childList: true }); fit();
  }

  /* ---- the accessibility button ---- */
  var fab, menu;
  function call(name) {
    return function () {
      closeMenu();
      try { if (w.Access && typeof Access[name] === 'function') Access[name](); } catch (e) {}
    };
  }
  function items() {
    var hc = false; try { hc = !!Access.hc; } catch (e) {}
    return [
      ['Where am I', 'W', call('summary')], ['What is my goal', 'G', call('goal')], ['What just happened', 'Y', call('recap')],
      ['Audio compass', 'Q', call('compass')], ['Evidence board', 'E', call('evidence')], ['Help and settings', '?', call('help')],
      ['High contrast: ' + (hc ? 'on' : 'off'), 'K', function () { try { Access.setHC(!Access.hc); } catch (e) {} paintMenu(); }],
      ['Text size: ' + U.textSize() + '%', 'Aa', function () { U.cycleText(); }]
    ];
  }
  function paintMenu() {
    if (!menu) return; menu.innerHTML = '';
    items().forEach(function (it) {
      var b = D.createElement('button'); b.type = 'button'; b.innerHTML = '<span></span><kbd></kbd>';
      b.firstChild.textContent = it[0]; b.lastChild.textContent = it[1]; b.onclick = it[2]; menu.appendChild(b);
    });
  }
  function openMenu() { paintMenu(); menu.hidden = false; fab.setAttribute('aria-expanded', 'true'); var f = menu.querySelector('button'); if (f) f.focus(); }
  function closeMenu() { if (!menu) return; menu.hidden = true; fab.setAttribute('aria-expanded', 'false'); }
  function build() {
    if (fab || !D.body) return;
    fab = D.createElement('button'); fab.id = 'ui-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Accessibility tools'); fab.setAttribute('aria-haspopup', 'true'); fab.setAttribute('aria-expanded', 'false'); fab.textContent = '♿';
    menu = D.createElement('div'); menu.id = 'ui-menu'; menu.hidden = true; menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', 'Accessibility tools');
    fab.onclick = function () { menu.hidden ? openMenu() : closeMenu(); };
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); fab.focus(); } });
    D.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== fab) closeMenu(); }, true);
    D.body.appendChild(menu); D.body.appendChild(fab);
    watchCaption(); watchOpts();
    new MutationObserver(watchCaption).observe(D.body, { childList: true });
  }
  w.UI = U;
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', build); else build();
})(window);
