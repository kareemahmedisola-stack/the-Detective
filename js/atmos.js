/* atmos.js - the look of suspense, shared by the menu and every game

   Atmos.danger(0..1)   a red vignette that pulses faster and harder as danger rises
                        (Echo: Heat and the clock. Balogun: hours running out. Siege: night, morale.)
   Atmos.cut(ms)        a quick dark curtain between scenes, like a film cut
   Atmos.letterbox(on, ms)   cinematic bars slide in for big moments (the accusation, the assault)
   Atmos.flash(color, a)     a single screen flash
   Film grain sits over everything very faintly.

   Everything is decoration (aria-hidden, no pointer events). It switches off with the Visual effects
   setting, with the system "reduce motion" setting, and in high-contrast mode.                      */
(function (w) {
  'use strict';
  var D = document, T = { enabled: true }, level = 0, lbT = null, RM = false, el = {};
  try { RM = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  try { T.enabled = localStorage.getItem('dt_fx') !== '0'; } catch (e) {}

  var GR = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='170'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  var CSS = '' +
    '#atm-vig{position:fixed;inset:0;pointer-events:none;z-index:2147480000;opacity:0;transition:opacity .9s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(160,0,20,.95) 135%)}' +
    '#atm-vig.on{animation:atmP var(--atm-r,3s) ease-in-out infinite}' +
    '@keyframes atmP{0%,100%{opacity:calc(var(--atm-i,.2)*.5)}50%{opacity:var(--atm-i,.2)}}' +
    '#atm-gr{position:fixed;inset:-40px;pointer-events:none;z-index:2147480100;opacity:.055;mix-blend-mode:overlay;background-image:' + GR + ';animation:atmG .7s steps(5) infinite}' +
    '@keyframes atmG{0%{transform:translate(0,0)}20%{transform:translate(-18px,9px)}40%{transform:translate(12px,-14px)}60%{transform:translate(-9px,-6px)}80%{transform:translate(15px,12px)}100%{transform:translate(0,0)}}' +
    '#atm-cut,#atm-fl{position:fixed;inset:0;pointer-events:none;opacity:0;z-index:2147480500;background:#000}' +
    '.atm-bar{position:fixed;left:0;right:0;height:0;background:#000;pointer-events:none;z-index:2147480600;transition:height .65s cubic-bezier(.2,.8,.2,1)}.atm-bar.t{top:0}.atm-bar.b{bottom:0}' +
    'html.atm-lb .atm-bar{height:8vh}' +
    'html.hc #atm-gr,html.hc #atm-vig,html.hc .atm-bar{display:none}' +
    '@media(prefers-reduced-motion:reduce){#atm-vig.on{animation:none;opacity:calc(var(--atm-i,.2)*.7)}#atm-gr{animation:none}}';
  var st = D.createElement('style'); st.textContent = CSS; (D.head || D.documentElement).appendChild(st);

  function make() {
    if (el.vig || !D.body) return;
    function mk(id, cls) { var d = D.createElement('div'); if (id) d.id = id; if (cls) d.className = cls; d.setAttribute('aria-hidden', 'true'); D.body.appendChild(d); return d; }
    el.vig = mk('atm-vig'); el.gr = mk('atm-gr'); el.cut = mk('atm-cut'); el.fl = mk('atm-fl'); mk(null, 'atm-bar t'); mk(null, 'atm-bar b'); apply();
  }
  function hc() { return D.documentElement.classList.contains('hc'); }
  function apply() {
    if (!el.vig) return; var on = T.enabled && !hc() && level > .08;
    el.vig.classList.toggle('on', on); el.vig.style.setProperty('--atm-i', (.1 + level * .55).toFixed(2)); el.vig.style.setProperty('--atm-r', (3.6 - level * 2.8).toFixed(2) + 's');
    if (!on) el.vig.style.opacity = 0; else el.vig.style.opacity = '';
    el.gr.style.display = T.enabled && !hc() ? '' : 'none';
  }
  T.danger = function (l) { level = Math.max(0, Math.min(1, +l || 0)); make(); apply(); };
  T.refresh = apply;
  T.setEnabled = function (on) { T.enabled = !!on; make(); apply(); if (!on) D.documentElement.classList.remove('atm-lb'); };
  T.cut = function (ms) { if (!T.enabled || RM || hc()) return; make(); try { el.cut.animate([{ opacity: 0 }, { opacity: .85, offset: .35 }, { opacity: 0 }], { duration: ms || 280, easing: 'ease-in-out' }); } catch (e) {} };
  T.flash = function (c, a) { if (!T.enabled || RM || hc()) return; make(); el.fl.style.background = c || '#fff'; try { el.fl.animate([{ opacity: a || .5 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }); } catch (e) {} };
  T.letterbox = function (on, ms) {
    make(); clearTimeout(lbT); D.documentElement.classList.toggle('atm-lb', !!on && T.enabled && !RM && !hc());
    if (on && ms) lbT = setTimeout(function () { D.documentElement.classList.remove('atm-lb'); }, ms);
  };
  w.Atmos = T;
  if (D.body) make(); else D.addEventListener('DOMContentLoaded', make);
})(window);
