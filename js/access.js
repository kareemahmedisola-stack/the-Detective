/* access.js - one accessibility layer for every game in the package

   This turns the prototype "Accessibility Upgrade Pack" into real features that work inside Echo
   Detective, The Balogun Case and Siege of Ilesanmi, and on the main menu.

   KEYS (the same in every game; none of them clash with a game's own keys)
     Q  Audio compass     pings from where things are (left, centre, right) and says what they are
     W  Where am I        a one-breath summary of the scene
     G  Goal              what you are trying to do right now, without spoiling anything
     Y  Recap             what just happened, in your own game's words
     E  Evidence board    everything you know, in a dialog you can read line by line
     K  High contrast     bold black, white and yellow, thick outlines
     F  Partner (co-op)   a large-print panel for a sighted partner, longer timers, "talk it over" prompts
     ?  Help              all of these keys, plus switches for contrast, partner mode, idle reminders and effects

   A game connects by calling Access.register({ speak, compass, summary, goal, evidence, recap, busy }).
     compass()  -> { say, items:[{ pan:-1..1, label }] }
     evidence() -> { title, rows:[{ h, t, tag }], say }                                                   */
(function (w) {
  'use strict';
  var D = document, A = { prov: null, log: [], modal: null, idleMs: 75000, last: '', muteNote: false };
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  A.hc = get('dt_hc', '0') === '1'; A.coop = get('dt_coop', '0') === '1'; A.idle = get('dt_idle', '1') === '1'; A.fx = get('dt_fx', '1') === '1';

  /* ---------------------------------------------------------------- styles */
  var CSS = '' +
    '.acc-dlg{position:fixed;inset:0;z-index:2147482000;background:rgba(5,2,8,.86);display:flex;align-items:flex-start;justify-content:center;padding:4vh 1rem;overflow:auto}' +
    '.acc-box{width:min(42rem,100%);background:#1b1320;color:#f6ecdf;border:2px solid #f2c14e;border-radius:14px;padding:1rem 1.2rem 1.2rem;font:1.05rem/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.6);animation:accIn .25s ease-out}' +
    '@keyframes accIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
    '.acc-box h2{margin:.1rem 0 .6rem;font:800 1.5rem/1.2 Georgia,serif;color:#f2c14e;outline:none}.acc-box h2:focus-visible{outline:3px solid #ff8a3d;outline-offset:5px}' +
    '.acc-row{border-top:1px solid #4a3340;padding:.55rem 0}.acc-row p{margin:.15rem 0 0}.acc-row b{color:#ffd9a0}' +
    '.acc-tag{display:inline-block;margin-left:.4rem;padding:0 .5rem;border-radius:1rem;background:#3a2428;color:#ffc9a0;font-size:.85rem;font-weight:700}' +
    '.acc-b{display:block;width:100%;margin:.5rem 0 0;padding:.65rem .9rem;text-align:left;font:inherit;font-weight:700;color:#f6ecdf;background:#2d1d22;border:2px solid #6a4540;border-radius:.6rem;cursor:pointer}' +
    '.acc-b:hover{background:#3b262b}.acc-b:focus-visible{outline:3px solid #ff8a3d;outline-offset:2px}.acc-b.x{background:#f2c14e;color:#1b1105;text-align:center;border-color:#f2c14e}' +
    '#acc-coop{position:fixed;top:3.2rem;right:.6rem;width:min(22rem,42vw);max-height:62vh;overflow:auto;z-index:2147481000;background:rgba(10,5,12,.93);color:#fff;border:2px solid #f2c14e;border-radius:12px;padding:.7rem .9rem;font:1.05rem/1.45 system-ui,sans-serif}@media(max-width:900px){#acc-coop{top:auto;bottom:5.2rem;left:.5rem;right:.5rem;width:auto;max-height:22vh}}' +
    '#acc-coop h3{margin:0 0 .3rem;font:800 1rem/1.2 system-ui;color:#f2c14e;letter-spacing:.06em;text-transform:uppercase}#acc-coop p{margin:.35rem 0}#acc-coop .k{color:#ffd9a0;font-weight:700}' +
    '#acc-live{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    'html.hc body{background:#000!important;color:#fff!important;background-image:none!important}' +
    'html.hc .btn,html.hc button,html.hc .acc-b,html.hc select,html.hc input{background:#000!important;color:#fff!important;border:3px solid #ffeb3b!important;text-shadow:none!important;box-shadow:none!important}' +
    'html.hc .btn.primary,html.hc .acc-b.x,html.hc .btn.big{background:#ffeb3b!important;color:#000!important}' +
    'html.hc .card,html.hc .paper,html.hc .acc-box,html.hc #cap,html.hc #acc-coop,html.hc details,html.hc header,html.hc .hint{background:#000!important;color:#fff!important;border-color:#fff!important}' +
    'html.hc h1,html.hc h2,html.hc h3,html.hc .brand,html.hc b,html.hc .rank{color:#ffeb3b!important;text-shadow:none!important}' +
    'html.hc a{color:#00e5ff!important}html.hc :focus-visible{outline:4px solid #00e5ff!important;outline-offset:3px!important}' +
    'html.hc .mut,html.hc p,html.hc span,html.hc li,html.hc small{color:#fff!important}html.hc .tape,html.hc #siren{display:none!important}' +
    'html.hc #sc,html.hc svg{filter:contrast(1.25) brightness(1.1)}';
  var st = D.createElement('style'); st.textContent = CSS; (D.head || D.documentElement).appendChild(st);
  function applyHC() { D.documentElement.classList.toggle('hc', A.hc); try { w.Atmos && Atmos.refresh(); } catch (e) {} }
  applyHC();

  /* ---------------------------------------------------------------- sound (pings) */
  var ac = null;
  function actx() { if (!ac) { try { ac = new (w.AudioContext || w.webkitAudioContext)(); } catch (e) { return null; } } if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} } return ac; }
  function muted() { return !!(w.Sfx && Sfx.isMuted && Sfx.isMuted()); }
  function ping(pan, f, delay) {
    if (muted()) return; var c = actx(); if (!c) return;
    var t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(), last = g;
    o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.2, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
    if (c.createStereoPanner) { var p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); last = p; }
    o.connect(g); last.connect(c.destination); o.start(t); o.stop(t + .34);
  }
  function chime(ok) { ping(0, ok ? 660 : 330, 0); ping(0, ok ? 880 : 247, .12); }

  /* ---------------------------------------------------------------- speaking and the recap log */
  function live() { var l = D.getElementById('acc-live'); if (!l) { l = D.createElement('div'); l.id = 'acc-live'; l.setAttribute('role', 'status'); l.setAttribute('aria-live', 'polite'); D.body.appendChild(l); } return l; }
  function fallbackSpeak(t) {
    var l = live(); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30);
    try { var m = JSON.parse(get('ed_settings', '{}')).mode; if (m !== 'sr' && w.speechSynthesis && !muted()) { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); speechSynthesis.speak(u); } } catch (e) {}
  }
  A.live = function (t) { var l = live(); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); };
  A.say = function (text) {
    A.last = text; A.muteNote = true;
    try { if (A.prov && A.prov.speak) A.prov.speak(text); else fallbackSpeak(text); } finally { A.muteNote = false; }
    if (A.coop) A.refreshCoop(text);
  };
  A.note = function (text) {
    if (A.muteNote || !text) return; text = String(text).replace(/\s+/g, ' ').trim();
    if (!text || /^(Recap|Reminder)\./.test(text) || A.log[A.log.length - 1] === text) return;
    A.log.push(text); if (A.log.length > 16) A.log.shift(); if (A.coop) A.refreshCoop();
  };
  function brief(t, n) { if (t.length <= n) return t; var cut = t.slice(0, n), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! ')); return i > 50 ? cut.slice(0, i + 1) : cut.replace(/\s+\S*$/, '') + '...'; }

  /* ---------------------------------------------------------------- the five information keys */
  A.compass = function () {
    var c = A.prov && A.prov.compass && A.prov.compass();
    if (!c || !c.items || !c.items.length) { A.say('There is nothing to locate here.'); return; }
    var items = c.items.slice().sort(function (a, b) { return a.pan - b.pan; }).slice(0, 7);
    items.forEach(function (it, i) { ping(it.pan, 520 + i * 55, i * .32); });
    setTimeout(function () { A.say(c.say); }, items.length * 320 + 200);
  };
  A.summary = function () { var s = A.prov && A.prov.summary && A.prov.summary(); A.say(s || 'No scene summary is available here.'); };
  A.goal = function () { var g = A.prov && A.prov.goal && A.prov.goal(); A.say(g || 'Choose a mission from the menu. For the whole story, choose the full campaign.'); };
  A.recap = function () {
    var p = A.prov, own = p && p.recap && p.recap(), items = A.log.slice(-4), parts = [];
    if (own) parts.push(own);
    items.forEach(function (t, i) { parts.push((items.length === 1 ? 'Last thing said: ' : i === items.length - 1 ? 'Most recently: ' : i === 0 ? 'Earlier: ' : 'Then: ') + brief(t, 200)); });
    A.say('Recap. ' + (parts.length ? parts.join(' ') : 'Nothing has happened yet.'));
  };
  A.evidence = function () {
    var b = A.prov && A.prov.evidence && A.prov.evidence();
    if (!b) { A.say('There is no evidence board here.'); return; } A.board(b);
  };

  /* ---------------------------------------------------------------- dialogs: evidence board and help */
  function focusables(root) { return [].slice.call(root.querySelectorAll('button,[href],input,select,[tabindex]:not([tabindex="-1"])')).filter(function (x) { return !x.disabled; }); }
  A.board = function (b) {
    A.closeBoard(true);
    var prev = D.activeElement, d = D.createElement('div'); d.className = 'acc-dlg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'acc-t');
    var box = D.createElement('div'); box.className = 'acc-box'; d.appendChild(box);
    var h = D.createElement('h2'); h.id = 'acc-t'; h.tabIndex = -1; h.textContent = b.title || 'Board'; box.appendChild(h);
    (b.rows || []).forEach(function (r) {
      var row = D.createElement('div'); row.className = 'acc-row';
      var hh = D.createElement('b'); hh.textContent = r.h || ''; row.appendChild(hh);
      if (r.tag) { var tg = D.createElement('span'); tg.className = 'acc-tag'; tg.textContent = r.tag; row.appendChild(tg); }
      if (r.t) { var p = D.createElement('p'); p.textContent = r.t; row.appendChild(p); }
      box.appendChild(row);
    });
    (b.controls || []).forEach(function (c) {
      var btn = D.createElement('button'); btn.type = 'button'; btn.className = 'acc-b'; btn.textContent = c.label();
      btn.onclick = function () { c.fn(); btn.textContent = c.label(); }; box.appendChild(btn);
    });
    var x = D.createElement('button'); x.type = 'button'; x.className = 'acc-b x'; x.textContent = 'Close (Escape)'; x.onclick = function () { A.closeBoard(); }; box.appendChild(x);
    D.body.appendChild(d); A.modal = { el: d, prev: prev }; h.focus();
    setTimeout(function () { if (b.say) A.say(b.say); }, 120); chime(true);
  };
  A.closeBoard = function (quiet) {
    if (!A.modal) return; var m = A.modal; A.modal = null; if (m.el.parentNode) m.el.parentNode.removeChild(m.el);
    try { if (m.prev && m.prev.focus) m.prev.focus(); } catch (e) {} if (!quiet) { A.say('Closed.'); }
  };
  A.help = function () {
    A.board({
      title: 'Accessibility help',
      rows: [
        { h: 'Q: audio compass', t: 'Pings play from where things are: left, centre, right. Then it says what each one is.' },
        { h: 'W: where am I', t: 'A short summary of the scene you are in.' },
        { h: 'G: goal', t: 'What you are trying to do now, without spoilers.' },
        { h: 'Y: recap', t: 'What just happened, so you can pick up the thread.' },
        { h: 'E: evidence board', t: 'Everything you know, grouped and readable line by line.' },
        { h: 'K: high contrast', t: 'Bold black, white and yellow with thick outlines.' },
        { h: 'F: partner mode', t: 'A large-print panel for a sighted partner, longer timers, and prompts to talk decisions over.' },
        { h: 'Alt and M', t: 'Back to the main menu.' }
      ],
      controls: [
        { label: function () { return 'High contrast: ' + (A.hc ? 'on' : 'off'); }, fn: function () { A.setHC(!A.hc, true); } },
        { label: function () { return 'Partner mode: ' + (A.coop ? 'on' : 'off'); }, fn: function () { A.setCoop(!A.coop, true); } },
        { label: function () { return 'Idle reminders: ' + (A.idle ? 'on' : 'off'); }, fn: function () { A.setIdle(!A.idle, true); } },
        { label: function () { return 'Visual effects: ' + (A.fx ? 'on' : 'off'); }, fn: function () { A.setFx(!A.fx, true); } },
        { label: function () { return 'Text size: ' + (w.UI ? UI.textSize() : 100) + ' percent'; }, fn: function () { if (w.UI) UI.cycleText(); } }
      ],
      say: 'Accessibility help. The keys are Q for the audio compass, W for where am I, G for your goal, Y for a recap, E for the evidence board, K for high contrast, F for partner mode. Switches follow. Press Escape to close.'
    });
  };

  /* ---------------------------------------------------------------- switches */
  function broadcast() { try { if (w.parent && w.parent !== w) w.parent.postMessage({ dt: 'prefs', hc: A.hc, coop: A.coop, idle: A.idle, fx: A.fx }, '*'); } catch (e) {} }
  A.setHC = function (on, quiet) { A.hc = !!on; put('dt_hc', on ? '1' : '0'); applyHC(); broadcast(); if (!quiet) A.say('High contrast ' + (on ? 'on.' : 'off.')); };
  A.setIdle = function (on, quiet) { A.idle = !!on; put('dt_idle', on ? '1' : '0'); if (!quiet) A.say('Idle reminders ' + (on ? 'on.' : 'off.')); };
  A.setFx = function (on, quiet) { A.fx = !!on; put('dt_fx', on ? '1' : '0'); try { w.Atmos && Atmos.setEnabled(A.fx); } catch (e) {} broadcast(); if (!quiet) A.say('Visual effects ' + (on ? 'on.' : 'off.')); };
  A.setCoop = function (on, quiet) {
    A.coop = !!on; put('dt_coop', on ? '1' : '0'); var p = D.getElementById('acc-coop');
    if (on && !A.noPanel) { if (!p) { p = D.createElement('aside'); p.id = 'acc-coop'; p.setAttribute('aria-label', 'Partner panel'); D.body.appendChild(p); } A.refreshCoop(); }
    else if (p) p.parentNode.removeChild(p);
    broadcast(); if (!quiet) A.say(on ? 'Partner mode on. A large-print panel now shows the scene, the goal and the latest events. Timers are longer. Press F to turn it off.' : 'Partner mode off.');
  };
  A.refreshCoop = function () {
    var p = D.getElementById('acc-coop'); if (!p) return; var pr = A.prov || {}, h = '<h3>Partner panel</h3>';
    function line(k, t) { if (t) h += '<p><span class="k">' + k + '</span> ' + String(t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + '</p>'; }
    try { line('Scene:', brief(String(pr.summary ? pr.summary() : ''), 170)); line('Goal:', brief(String(pr.goal ? pr.goal() : ''), 150)); var c = pr.compass && pr.compass(); if (c && c.items) line('Layout, left to right:', c.items.slice().sort(function (a, b) { return a.pan - b.pan; }).map(function (i) { return i.label; }).join('; ')); } catch (e) {}
    if (A.log.length) line('Just now:', brief(A.log[A.log.length - 1], 150));
    h += '<p class="k">Tip: describe what you see, then decide together.</p>'; p.innerHTML = h;
  };
  A.applyPrefs = function (q) {
    if (q.hc !== undefined) { A.hc = !!q.hc; put('dt_hc', A.hc ? '1' : '0'); applyHC(); }
    if (q.fx !== undefined) { A.fx = !!q.fx; put('dt_fx', A.fx ? '1' : '0'); try { w.Atmos && Atmos.setEnabled(A.fx); } catch (e) {} }
    if (q.coop !== undefined) { A.coop = !!q.coop; put('dt_coop', A.coop ? '1' : '0'); }
    if (q.idle !== undefined) { A.idle = !!q.idle; put('dt_idle', A.idle ? '1' : '0'); }
  };
  A.timeScale = function () { return A.coop ? 1.6 : 1; };
  A.coopSay = function () { return A.coop ? ' Partner mode: talk it over with your partner before you decide.' : ''; };

  /* ---------------------------------------------------------------- connecting a game */
  A.register = function (p) { A.prov = p; if (A.coop) A.setCoop(true, true); };
  setInterval(function () { if (A.coop) A.refreshCoop(); }, 2500);

  /* idle reminders: if nothing has happened for a while, quietly restate the goal */
  var lastIn = Date.now(), nudges = 0;
  function touch() { lastIn = Date.now(); nudges = 0; }
  setInterval(function () {
    if (!A.idle || !A.prov || A.modal || nudges >= 3 || Date.now() - lastIn < A.idleMs) return;
    if (A.prov.busy && A.prov.busy()) return;
    var g = A.prov.goal && A.prov.goal(); if (g) { nudges++; lastIn = Date.now(); A.say('Reminder. ' + g); }
  }, 5000);
  D.addEventListener('pointerdown', touch, true);

  /* ---------------------------------------------------------------- keyboard (capture phase, so we only ever take our own keys) */
  addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    touch(); var k = e.key, lk = k && k.length === 1 ? k.toLowerCase() : k;
    if (A.modal) {                                  /* a dialog is open: it owns the keyboard */
      if (k === 'Escape' || lk === 'e') { e.preventDefault(); e.stopPropagation(); A.closeBoard(); return; }
      if (k === 'Tab') { var f = focusables(A.modal.el); if (f.length) { var i = f.indexOf(D.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? -1 + f.length : 1)) % f.length].focus(); } e.stopPropagation(); return; }
      if (k === 'Enter' || k === ' ') return;       /* let buttons work */
      e.stopPropagation(); return;
    }
    var map = { q: A.compass, w: A.summary, g: A.goal, y: A.recap, e: A.evidence, k: function () { A.setHC(!A.hc); }, f: function () { A.setCoop(!A.coop); }, '?': A.help, F1: A.help };
    if (map[lk]) { e.preventDefault(); e.stopPropagation(); map[lk](); }
  }, true);

  addEventListener('message', function (e) { var d = e.data; if (d && d.dt === 'prefs' && e.source === w.parent) A.applyPrefs(d); });
  w.Access = A;
  if (A.coop) { if (D.body) A.setCoop(true, true); else D.addEventListener('DOMContentLoaded', function () { A.setCoop(true, true); }); }
})(window);
