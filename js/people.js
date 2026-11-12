/* people.js v2 - lifelike animated SVG people, hearts and slow dance (shared by both cases)

   WHY IT LOOKS ALIVE NOW (v1 swung rigid rectangles back and forth at a fixed beat)
   - Real joints: shoulder + elbow on every arm, hip + knee on every leg, neck, spine.
   - Layered motion: a "pose" layer (eased, with overshoot) and a separate "motion" layer
     (breathing, drift, gestures), so a smile never freezes the breathing.
   - Nothing is in lock-step: every person gets a random seed (--s) that shifts the phase
     and length of their breathing, blinking, glances and weight shifts.
   - Irregular rhythms: speech uses uneven syllable steps and unequal beat gestures,
     blinks come singly or in pairs, eyes glance, heads drift.
   - Follow-through: forearms lag the upper arm, the head counter-balances the walk, the
     shadow squashes with every step, the body bobs on each footfall.
   - Walks ramp up and wind down smoothly (a registered CSS number, --amp) instead of
     starting and stopping like a machine.
   - A tiny "director" makes idle people glance around, shrug and shift now and then.

   API (unchanged)   People.html(o) / People.el(o)   o = {skin,hair,hc,top,bot,dress,acc,cls,style}
   hair: short afro gele cap tophat wig fedora bald     acc: tie badge glasses
   State classes on .pp: walk run talk wave blush sad angry dance (+rev for the partner)
   NEW helpers       People.walk(pp,on)  graceful start/stop of walking (use instead of add/remove 'walk')
                     People.run(pp,on)   same, but a sprint
                     People.talk(pp,ms)  talk for a while, then stop
                     People.react(pp,'sad'|'angry'|'blush'|'wave',ms)  temporary emotion
   People.cast = ready-made characters     People.hearts(host,n) = floating hearts */
(function (w) {
  'use strict';

  var CSS = '' +
  /* a registered number lets us ease the walk amplitude in and out */
  '@property --amp{syntax:"<number>";inherits:true;initial-value:0}' +
  '.pp{display:block;width:80px;height:152px;position:relative;pointer-events:none;--s:.5;--A:1;--wt:.92s;--amp:0;transition:--amp .42s ease-in-out}' +
  '.pp svg{width:100%;height:100%;overflow:visible;display:block}' +
  '.pp.walk{--amp:1}.pp.run{--A:1.55;--wt:.5s}' +

  /* ---- pose layer: eased, with a little overshoot so changes feel physical ---- */
  '.pp .tor,.pp .hd,.pp .al,.pp .ar,.pp .fa,.pp .bw,.pp .bwl,.pp .bwr,.pp .ep,.pp .mo,.pp .ll,.pp .lr,.pp .sh{transition:transform .6s cubic-bezier(.34,1.32,.5,1)}' +
  '.pp .ck{opacity:0;transition:opacity .8s ease}' +
  '.pp .all{transform-origin:50px 186px}.pp .tor,.pp .ti{transform-origin:50px 106px}' +
  '.pp .hd,.pp .hi{transform-origin:50px 50px}.pp .ey{transform-origin:50px 34px}' +
  '.pp .bwl{transform-origin:44px 28px}.pp .bwr{transform-origin:56px 28px}.pp .mo{transform-origin:50px 45px}' +
  '.pp .bd{transform-origin:50px 62px}.pp .shd{transform-origin:50px 186px}' +
  '.pp .al .fa,.pp .al .fi{transform-origin:23.5px 77px}.pp .ar .fa,.pp .ar .fi{transform-origin:76.5px 77px}' +
  '.pp .al,.pp .al .ai{transform-origin:23.5px 53px}.pp .ar,.pp .ar .ai{transform-origin:76.5px 53px}' +
  /* relaxed resting arms: a small bend at the elbow */
  '.pp .al .fa{transform:rotate(-8deg)}.pp .ar .fa{transform:rotate(8deg)}' +

  /* ---- idle life (always running, phase-shifted per person) ---- */
  '@keyframes pw{0%,100%{transform:translateX(0) rotate(0)}28%{transform:translateX(-1.4px) rotate(-.7deg)}62%{transform:translateX(1.5px) rotate(.8deg)}}' +
  '@keyframes pb{0%,100%{transform:translateY(0)}45%{transform:translateY(-.9px)}}' +
  '@keyframes pbd{0%,100%{transform:scale(1,1)}45%{transform:scale(1.012,1.02)}}' +
  '@keyframes ph{0%,100%{transform:rotate(0) translateY(0)}22%{transform:rotate(1.7deg)}52%{transform:rotate(-1.3deg) translateY(.5px)}78%{transform:rotate(.6deg)}}' +
  '@keyframes pk{0%,84%,88.5%,94%,98%,100%{transform:scaleY(1)}86%{transform:scaleY(.06)}95.8%{transform:scaleY(.06)}}' +
  '@keyframes pg{0%,18%,100%{transform:translate(0,0)}22%,42%{transform:translate(-1.3px,.2px)}48%,68%{transform:translate(1.2px,-.3px)}74%{transform:translate(0,0)}}' +
  '@keyframes pas{0%,100%{transform:rotate(0)}50%{transform:rotate(1.8deg)}}@keyframes pas2{0%,100%{transform:rotate(0)}50%{transform:rotate(-1.8deg)}}' +
  '.pp .all{animation:pw calc(7s + var(--s)*4s) ease-in-out infinite;animation-delay:calc(var(--s)*-9s)}' +
  '.pp .ti{animation:pb calc(3.4s + var(--s)*1.5s) ease-in-out infinite;animation-delay:calc(var(--s)*-5s)}' +
  '.pp .bd{animation:pbd calc(3.4s + var(--s)*1.5s) ease-in-out infinite;animation-delay:calc(var(--s)*-5s)}' +
  '.pp .hi{animation:ph calc(8s + var(--s)*5s) ease-in-out infinite;animation-delay:calc(var(--s)*-7s)}' +
  '.pp .ey{animation:pk calc(4.4s + var(--s)*3.4s) linear infinite;animation-delay:calc(var(--s)*-6s)}' +
  '.pp .pu{animation:pg calc(5.2s + var(--s)*4.4s) ease-in-out infinite;animation-delay:calc(var(--s)*-8s)}' +
  '.pp .al .ai{animation:pas calc(4.6s + var(--s)*2s) ease-in-out infinite}.pp .ar .ai{animation:pas2 calc(5.1s + var(--s)*2s) ease-in-out infinite;animation-delay:calc(var(--s)*-3s)}' +

  /* ---- talking: uneven syllables, nods, raised brows, beat gestures ---- */
  '@keyframes pt{0%{transform:scale(1,.3)}14%{transform:scale(1.06,1.5)}27%{transform:scale(.84,.55)}41%{transform:scale(1.1,1.9)}55%{transform:scale(.92,.3)}68%{transform:scale(1,1.25)}82%{transform:scale(.82,.5)}100%{transform:scale(1,.3)}}' +
  '@keyframes pth{0%,100%{transform:rotate(0) translateY(0)}9%{transform:rotate(-2deg) translateY(1.1px)}22%{transform:rotate(1.6deg) translateY(0)}38%{transform:rotate(-1.2deg) translateY(.9px)}54%{transform:rotate(2.4deg) translateY(0)}70%{transform:rotate(.4deg) translateY(.6px)}85%{transform:rotate(-1.6deg) translateY(.2px)}}' +
  '@keyframes pbw{0%,100%{transform:translateY(0)}9%{transform:translateY(-1.8px)}22%{transform:translateY(0)}38%{transform:translateY(-1px)}54%{transform:translateY(-2.2px)}70%{transform:translateY(0)}}' +
  '@keyframes pgr{0%,100%{transform:rotate(0)}12%{transform:rotate(-34deg)}24%{transform:rotate(-26deg)}36%{transform:rotate(-8deg)}56%{transform:rotate(-30deg)}66%{transform:rotate(-14deg)}84%{transform:rotate(0)}}' +
  '@keyframes pgf{0%,100%{transform:rotate(0)}12%{transform:rotate(-30deg)}24%{transform:rotate(-8deg)}36%{transform:rotate(-34deg)}56%{transform:rotate(-12deg)}66%{transform:rotate(-36deg)}84%{transform:rotate(0)}}' +
  '@keyframes pgl{0%,100%{transform:rotate(0)}20%{transform:rotate(15deg)}34%{transform:rotate(6deg)}62%{transform:rotate(18deg)}78%{transform:rotate(0)}}' +
  '.pp.talk .mo{animation:pt calc(1.05s + var(--s)*.5s) ease-in-out infinite}' +
  '.pp.talk .hi{animation:pth calc(2.6s + var(--s)*1s) ease-in-out infinite}' +
  '.pp.talk .bw{animation:pbw calc(2.6s + var(--s)*1s) ease-in-out infinite}' +
  '.pp.talk .ar .ai{animation:pgr calc(3.4s + var(--s)*1.2s) ease-in-out infinite}' +
  '.pp.talk .ar .fi{animation:pgf calc(3.4s + var(--s)*1.2s) ease-in-out infinite}' +
  '.pp.talk .al .ai{animation:pgl calc(5.1s + var(--s)*1.5s) ease-in-out infinite;animation-delay:calc(var(--s)*-2s)}' +

  /* ---- walking: knees, hips, bob, sway, counter-swing, lagging forearms, squashing shadow ---- */
  '@keyframes wl{0%,100%{transform:rotate(calc(15deg*var(--amp)*var(--A)))}50%{transform:rotate(calc(-15deg*var(--amp)*var(--A)))}}' +
  '@keyframes wk{0%,50%,100%{transform:translateY(0) scaleY(1)}75%{transform:translateY(calc(-3.6px*var(--amp)*var(--A))) scaleY(calc(1 - .22*var(--amp)))}}' +
  '@keyframes wb{0%,100%{transform:translate(calc(-1.4px*var(--amp)),0) rotate(calc(-2.2deg*var(--amp)*var(--A)))}25%,75%{transform:translate(0,calc(-2.7px*var(--amp)*var(--A))) rotate(0)}50%{transform:translate(calc(1.4px*var(--amp)),0) rotate(calc(2.2deg*var(--amp)*var(--A)))}}' +
  '@keyframes wh{0%,100%{transform:rotate(calc(1.3deg*var(--amp)))}25%,75%{transform:rotate(0) translateY(calc(.9px*var(--amp)))}50%{transform:rotate(calc(-1.3deg*var(--amp)))}}' +
  '@keyframes wal{0%,100%{transform:rotate(calc(-4deg*var(--amp)*var(--A)))}50%{transform:rotate(calc(14deg*var(--amp)*var(--A)))}}' +
  '@keyframes war{0%,100%{transform:rotate(calc(4deg*var(--amp)*var(--A)))}50%{transform:rotate(calc(-14deg*var(--amp)*var(--A)))}}' +
  '@keyframes wfl{0%,100%{transform:rotate(calc(-8deg - 1deg*var(--amp)))}50%{transform:rotate(calc(-8deg - 11deg*var(--amp)*var(--A)))}}' +
  '@keyframes wfr{0%,100%{transform:rotate(calc(8deg + 1deg*var(--amp)))}50%{transform:rotate(calc(8deg + 11deg*var(--amp)*var(--A)))}}' +
  '@keyframes ws{0%,100%{transform:scale(1,1);opacity:1}25%,75%{transform:scale(calc(1 - .1*var(--amp)),1);opacity:calc(1 - .25*var(--amp))}}' +
  '.pp.walk .ll,.pp.walk .lr{animation:wl var(--wt) cubic-bezier(.45,.05,.55,.95) infinite}' +
  '.pp.walk .lr{animation-delay:calc(var(--wt)*-.5)}' +
  '.pp.walk .sh{animation:wk var(--wt) cubic-bezier(.45,.05,.55,.95) infinite}.pp.walk .lr .sh{animation-delay:calc(var(--wt)*-.5)}' +
  '.pp.walk .tor{animation:wb var(--wt) ease-in-out infinite}.pp.walk .hd{animation:wh var(--wt) ease-in-out infinite;animation-delay:calc(var(--wt)*.08)}' +
  '.pp.walk .al{animation:wal var(--wt) ease-in-out infinite}.pp.walk .ar{animation:war var(--wt) ease-in-out infinite}' +
  '.pp.walk .al .fa{animation:wfl var(--wt) ease-in-out infinite;animation-delay:calc(var(--wt)*.12)}' +
  '.pp.walk .ar .fa{animation:wfr var(--wt) ease-in-out infinite;animation-delay:calc(var(--wt)*.12)}' +
  '.pp.walk .shd{animation:ws calc(var(--wt)/2) ease-in-out infinite}' +

  /* ---- waving: the arm swings up with overshoot, then the forearm waves from the elbow ---- */
  '@keyframes pwv{from{transform:rotate(-22deg)}to{transform:rotate(27deg)}}@keyframes pwu{from{transform:rotate(-5deg)}to{transform:rotate(6deg)}}' +
  '.pp.wave .ar{transform:rotate(-152deg)}.pp.wave .ar .fi{animation:pwv .52s ease-in-out infinite alternate}.pp.wave .ar .ai{animation:pwu 1.04s ease-in-out infinite alternate}' +
  '.pp.wave .hd{transform:rotate(-4deg)}.pp.wave .bw{transform:translateY(-1.4px)}' +

  /* ---- emotions ---- */
  '.pp.blush .ck{opacity:.88}.pp.blush .hd{transform:rotate(-6deg) translateY(1.2px)}.pp.blush .ep{transform:translate(-1.2px,1.6px)}' +
  '.pp.blush .al{transform:rotate(-5deg)}.pp.blush .ar{transform:rotate(5deg)}.pp.blush .tor{transform:translateY(-1px) rotate(-1deg)}' +
  '@keyframes pbs{0%,100%{transform:rotate(-1.4deg)}50%{transform:rotate(1.4deg)}}.pp.blush .all{animation:pbs 2.6s ease-in-out infinite}' +
  '@keyframes psg{0%,100%{transform:translateY(0)}30%{transform:translateY(-1.7px)}58%{transform:translateY(2.4px)}}' +
  '.pp.sad .hd{transform:rotate(-7deg) translateY(3px)}.pp.sad .mo{transform:scaleY(-1)}.pp.sad .tor{transform:rotate(1.8deg) translateY(2px)}' +
  '.pp.sad .al{transform:rotate(5deg)}.pp.sad .ar{transform:rotate(-5deg)}.pp.sad .ep{transform:translateY(1.8px)}' +
  '.pp.sad .bwl{transform:rotate(-13deg)}.pp.sad .bwr{transform:rotate(13deg)}.pp.sad .ti{animation:psg 4.4s ease-in-out infinite}' +
  '@keyframes pat{0%,100%{transform:translate(0,0)}22%{transform:translate(.9px,-.5px)}47%{transform:translate(-.8px,.4px)}73%{transform:translate(.5px,.7px)}}' +
  '@keyframes pag{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-1.4px) scaleY(1.02)}}' +
  '.pp.angry .hd{transform:translateY(1.6px)}.pp.angry .mo{transform:scaleY(-1)}.pp.angry .bwl{transform:rotate(16deg)}.pp.angry .bwr{transform:rotate(-16deg)}' +
  '.pp.angry .hi{animation:pat .24s linear infinite}.pp.angry .ti{animation:pag .62s ease-in-out infinite}' +
  '.pp.angry .ar{transform:rotate(-30deg)}.pp.angry .ar .fa{transform:rotate(-78deg)}.pp.angry .al{transform:rotate(26deg)}.pp.angry .al .fa{transform:rotate(66deg)}' +

  /* ---- slow dance: sway, bounce on the beat, knees give, heads tilt together ---- */
  '@keyframes pdn{from{transform:rotate(-4deg) translateX(-4px)}to{transform:rotate(4deg) translateX(4px)}}' +
  '@keyframes pdb{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-2.4px)}}' +
  '@keyframes pdk{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.88) translateY(-1px)}}' +
  '.pp.dance .all{animation:pdn 1.9s ease-in-out infinite alternate}.pp.dance .ti{animation:pdb .95s ease-in-out infinite}' +
  '.pp.dance .sh{animation:pdk .95s ease-in-out infinite}.pp.dance .lr .sh{animation-delay:-.475s}' +
  '.pp.dance .ar{transform:rotate(-78deg)}.pp.dance .ar .fa{transform:rotate(-12deg)}.pp.dance.rev .ar{transform:none}.pp.dance.rev .al{transform:rotate(78deg)}' +
  '.pp.dance .hd{transform:rotate(7deg)}.pp.dance.rev .hd{transform:rotate(-7deg)}.pp.dance .ck{opacity:.55}' +

  /* ---- glances the director hands out to idle people ---- */
  '.pp.gl1 .ep{transform:translateX(-1.7px)}.pp.gl1 .hd{transform:rotate(-8deg) translateX(-1px)}' +
  '.pp.gl2 .ep{transform:translateX(1.7px)}.pp.gl2 .hd{transform:rotate(8deg) translateX(1px)}' +
  '.pp.gl3 .ep{transform:translateY(-1.2px)}.pp.gl3 .tor{transform:translateY(-1.6px)}.pp.gl3 .al{transform:rotate(9deg)}.pp.gl3 .ar{transform:rotate(-9deg)}.pp.gl3 .hd{transform:rotate(3deg) translateY(-.8px)}' +

  /* ---- couples and hearts ---- */
  '.cpl{display:flex;justify-content:center;align-items:flex-end;margin:.5rem 0;position:relative}.cpl .pp{width:110px;height:209px}.cpl .pp+.pp{margin-left:-18px}' +
  '.hrt{position:absolute;bottom:0;font-size:1.5rem;pointer-events:none;--dx:20px;animation:pph 3s ease-out forwards}' +
  '@keyframes pph{0%{transform:translate(0,0) scale(.4);opacity:0}8%{transform:translate(0,-2vh) scale(1.25);opacity:1}28%{transform:translate(calc(var(--dx)*.7),-9vh) scale(.95) rotate(-8deg);opacity:1}55%{transform:translate(calc(var(--dx)*-.5),-18vh) scale(1.1) rotate(8deg);opacity:.9}100%{transform:translate(calc(var(--dx)*.4),-32vh) scale(1.3) rotate(12deg);opacity:0}}' +
  '@media(prefers-reduced-motion:reduce){.pp *{animation:none!important;transition:none!important}.hrt{display:none}}';

  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  function svg(q) {
    var o = { skin: '#7b4a2e', hair: 'short', hc: '#150d0d', top: '#3b4cc0', bot: '#2a2a3a', shoe: '#1a1414', dress: 0, acc: '' };
    for (var k in q) o[k] = q[k];
    var s = o.skin, t = o.top, h = o.hc, hb = '';
    if (o.hair === 'afro') hb = '<circle cx="50" cy="27" r="21" fill="' + h + '"/>';
    if (o.hair === 'wig') hb = '<circle cx="33" cy="36" r="9" fill="#f2f2f2"/><circle cx="67" cy="36" r="9" fill="#f2f2f2"/><circle cx="31" cy="46" r="6" fill="#f2f2f2"/><circle cx="69" cy="46" r="6" fill="#f2f2f2"/>';
    var H = {
      short: '<path d="M35 32Q33 14 50 14Q67 14 65 32Q58 23 50 24Q42 23 35 32Z" fill="' + h + '"/>',
      afro: '<path d="M35 30Q50 17 65 30Q58 24 50 25Q42 24 35 30Z" fill="' + h + '"/>',
      gele: '<path d="M31 33Q29 8 52 6Q75 8 69 33Q58 19 46 22Q36 23 31 33Z" fill="' + h + '"/><path d="M58 9Q80 -4 83 16Q70 15 58 9Z" fill="' + h + '"/>',
      cap: '<path d="M34 29Q50 7 66 29Z" fill="' + h + '"/><rect x="31" y="27" width="38" height="4" rx="2" fill="' + h + '"/>',
      tophat: '<rect x="38" y="-2" width="24" height="23" rx="2" fill="' + h + '"/><rect x="30" y="19" width="40" height="5" rx="2" fill="' + h + '"/>',
      wig: '<path d="M34 31Q50 6 66 31Q58 20 50 21Q42 20 34 31Z" fill="#f2f2f2"/>',
      fedora: '<path d="M37 25Q38 6 50 6Q62 6 63 25Z" fill="' + h + '"/><ellipse cx="50" cy="25" rx="22" ry="4.5" fill="' + h + '"/>'
    };
    var words = o.acc.split(' ');
    var glasses = words.indexOf('glasses') >= 0 ? '<g fill="none" stroke="#222" stroke-width="1.6"><circle cx="44" cy="34" r="5.5"/><circle cx="56" cy="34" r="5.5"/><path d="M49.5 34h1"/></g>' : '';
    var bodyAcc = (words.indexOf('tie') >= 0 ? '<path d="M50 52L46 60L50 88L54 60Z" fill="#c0222f"/>' : '') + (words.indexOf('badge') >= 0 ? '<circle cx="61" cy="66" r="4" fill="#ffd400"/>' : '');
    var body = o.dress ? '<path class="bd" d="M31 50Q50 44 69 50L72 100L84 168L16 168L28 100Z" fill="' + t + '"/>' : '<path class="bd" d="M30 50Q50 44 70 50L72 108L28 108Z" fill="' + t + '"/>';

    /* leg = hip joint + knee joint; pivots are set in user units so they rotate where a real leg would */
    function leg(c, x, cx) {
      if (o.dress) {
        return '<g class="' + c + '" style="transform-origin:' + (x + 7.5) + 'px 150px"><rect x="' + (x + 3) + '" y="148" width="9" height="20" rx="4" fill="' + s + '"/>' +
          '<g class="sh" style="transform-origin:' + (x + 7.5) + 'px 166px"><rect x="' + (x + 3) + '" y="164" width="9" height="19" rx="4" fill="' + s + '"/><ellipse cx="' + cx + '" cy="185" rx="8" ry="4" fill="' + o.shoe + '"/></g></g>';
      }
      return '<g class="' + c + '" style="transform-origin:' + (x + 7.5) + 'px 108px"><rect x="' + x + '" y="106" width="15" height="36" rx="6" fill="' + o.bot + '"/>' +
        '<g class="sh" style="transform-origin:' + (x + 7.5) + 'px 140px"><rect x="' + (x + .5) + '" y="138" width="14" height="32" rx="6" fill="' + o.bot + '"/><ellipse cx="' + cx + '" cy="172" rx="10" ry="5" fill="' + o.shoe + '"/></g></g>';
    }
    /* arm = shoulder joint + elbow joint; .al/.ar carry the pose, .ai/.fi carry the motion */
    function arm(c, x, hx) {
      return '<g class="' + c + '"><g class="ai"><rect x="' + x + '" y="50" width="11" height="28" rx="5.5" fill="' + t + '"/>' +
        '<g class="fa"><g class="fi"><rect x="' + (x + .8) + '" y="75" width="9.4" height="28" rx="4.7" fill="' + t + '"/><circle cx="' + hx + '" cy="104" r="5.5" fill="' + s + '"/></g></g></g></g>';
    }
    return '<svg viewBox="0 0 100 190" aria-hidden="true"><ellipse class="shd" cx="50" cy="186" rx="30" ry="4" fill="rgba(0,0,0,.3)"/><g class="all">' +
      leg('ll', 33, 38) + leg('lr', 52, 62) +
      '<g class="tor"><g class="ti">' + body + bodyAcc + arm('al', 18, 23.5) + arm('ar', 71, 76.5) + '<rect x="45" y="44" width="10" height="10" fill="' + s + '"/>' +
      '<g class="hd"><g class="hi">' + hb + '<circle cx="50" cy="34" r="15" fill="' + s + '"/>' +
      '<g class="ep"><g class="ey"><g class="pu"><ellipse cx="44" cy="34" rx="2.1" ry="2.8" fill="#1a1010"/><ellipse cx="56" cy="34" rx="2.1" ry="2.8" fill="#1a1010"/><circle cx="44.8" cy="33" r=".7" fill="#fff" opacity=".8"/><circle cx="56.8" cy="33" r=".7" fill="#fff" opacity=".8"/></g></g></g>' +
      '<g class="bw"><path class="bwl" d="M40 28.5Q44 26.5 47.5 28.5" stroke="#1a1010" stroke-width="1.7" fill="none" stroke-linecap="round"/><path class="bwr" d="M52.5 28.5Q56 26.5 60 28.5" stroke="#1a1010" stroke-width="1.7" fill="none" stroke-linecap="round"/></g>' +
      '<circle class="ck" cx="40" cy="41" r="3.8" fill="#ff5d8a"/><circle class="ck" cx="60" cy="41" r="3.8" fill="#ff5d8a"/>' +
      '<path class="mo" d="M43.5 44.5Q50 51 56.5 44.5Z" fill="#4a1515" stroke="#4a1515" stroke-width="1.4" stroke-linejoin="round"/>' +
      (H[o.hair] || '') + glasses + '</g></g></g></g></g></svg>';
  }
  function html(o) {
    var seed = (Math.random()).toFixed(3);
    return '<div class="pp ' + (o.cls || '') + '" style="--s:' + seed + ';' + (o.style || '') + '">' + svg(o) + '</div>';
  }
  function el(o) { var d = document.createElement('div'); d.innerHTML = html(o); return d.firstChild; }

  /* ---- graceful state helpers ---- */
  function walk(pp, on) {
    if (!pp) return; clearTimeout(pp._wt);
    if (on) { pp.style.removeProperty('--amp'); pp.classList.add('walk'); return; }
    if (!pp.classList.contains('walk')) return;
    pp.style.setProperty('--amp', '0');                       /* wind the stride down, then stop the cycle */
    pp._wt = setTimeout(function () { pp.classList.remove('walk'); pp.style.removeProperty('--amp'); }, 480);
  }
  function run(pp, on) { if (!pp) return; if (on) { pp.classList.add('run'); walk(pp, true); } else { walk(pp, false); setTimeout(function () { pp.classList.remove('run'); }, 500); } }
  function talk(pp, ms) { if (!pp) return; pp.classList.add('talk'); clearTimeout(pp._tt); pp._tt = setTimeout(function () { pp.classList.remove('talk'); }, ms || 2500); }
  function react(pp, state, ms) { if (!pp) return; pp.classList.add(state); clearTimeout(pp['_r' + state]); pp['_r' + state] = setTimeout(function () { pp.classList.remove(state); }, ms || 2500); }

  function hearts(host, n) {
    for (var i = 0; i < (n || 8); i++) (function (i) {
      setTimeout(function () {
        var h = document.createElement('span'); h.className = 'hrt'; h.textContent = ['\u2764', '\uD83D\uDC97', '\uD83D\uDC96'][i % 3];
        h.style.left = (30 + Math.random() * 40) + '%'; h.style.animationDuration = (2.4 + Math.random() * 1.6) + 's';
        h.style.setProperty('--dx', ((Math.random() < .5 ? -1 : 1) * (14 + Math.random() * 22)) + 'px');
        host.appendChild(h); setTimeout(function () { h.remove(); }, 4200);
      }, i * 220 + Math.random() * 120);
    })(i);
  }

  /* ---- the director: idle people glance around, shrug, shift now and then ---- */
  var BUSY = /\b(walk|run|talk|dance|sad|angry|wave|blush|gl\d)\b/;
  var RM = w.matchMedia && w.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!RM) setInterval(function () {
    if (document.hidden) return;
    var all = Array.prototype.filter.call(document.querySelectorAll('.pp'), function (p) { return !BUSY.test(p.className); });
    var n = Math.min(all.length, 1 + (Math.random() < .4 ? 1 : 0));
    for (var i = 0; i < n; i++) {
      var p = all.splice((Math.random() * all.length) | 0, 1)[0]; if (!p) break;
      var k = 'gl' + (1 + ((Math.random() * 3) | 0));
      p.classList.add(k);
      (function (p, k) { setTimeout(function () { p.classList.remove(k); }, 1000 + Math.random() * 1700); })(p, k);
    }
  }, 2100);

  var cast = {
    ada: { dress: 1, top: '#2a2a48', hair: 'afro', skin: '#7b4a2e' }, kelechi: { skin: '#5a3a28', hc: '#0e0a0a', top: '#e8e1d0', bot: '#3a3f5a', acc: 'glasses' },
    nkechi: { hair: 'gele', hc: '#e0a31f', top: '#c0392b', dress: 1, skin: '#8d5a3b' }, okoro: { hair: 'bald', top: '#3f6e5c', acc: 'glasses', skin: '#6b4028' },
    baba: { hair: 'cap', hc: '#555', top: '#8a6a3a', bot: '#3a3020', skin: '#5a3a28' }, sade: { hair: 'gele', hc: '#2e7d5b', top: '#f5c518', dress: 1, skin: '#a0643c' },
    magistrate: { hair: 'wig', top: '#1a1a1a', dress: 1 }, prosecutor: { hair: 'wig', top: '#222', bot: '#222', acc: 'tie' },
    danladi: { hair: 'cap', hc: '#1f3b8a', top: '#2c4a9a', bot: '#1f3b8a', acc: 'badge' }, bello: { hair: 'cap', hc: '#c0392b', top: '#d8d0b8', dress: 1, skin: '#6b4028' },
    ify: { hair: 'gele', hc: '#7a2fa0', top: '#2e86c1', dress: 1 }, eze: { hair: 'tophat', hc: '#1a1a1a', top: '#6a1b9a', dress: 1, skin: '#5a3a28' },
    musa: { hair: 'cap', hc: '#2b3a8c', top: '#3b4cc0' }, tunde: { top: '#c9c9c9', bot: '#7a6a4a', skin: '#6b4028' },
    mamaput: { hair: 'gele', hc: '#e07a1f', top: '#3b8e8e', dress: 1, skin: '#8d5a3b' }, ngozi: { hair: 'gele', hc: '#8e44ad', top: '#f1c40f', dress: 1, skin: '#6b4028' },
    chief: { hair: 'tophat', hc: '#1a1a1a', top: '#1d6b4f', dress: 1, skin: '#5a3a28' }, emeka: { hair: 'cap', hc: '#222', top: '#e8e8e8', bot: '#222', acc: 'tie', skin: '#6b4028' },
    sani: { hair: 'cap', hc: '#2e4a2e', top: '#3d5a3d', bot: '#2e3a2e', acc: 'badge', skin: '#4a2f20' }, kunle: { hc: '#120c0c', top: '#c0562f', bot: '#2c3e50' },
    kunleShore: { hc: '#120c0c', top: '#c0562f', bot: '#2c3e50', cls: 'sad' }, tobi: { hc: '#0e0a0a', top: '#7b2d4e', acc: 'glasses', skin: '#6b4028' },
    bola: { hair: 'short', hc: '#1a0f0f', top: '#e67e22', bot: '#2c3e50', skin: '#7b4a2e' },
    you: { hair: 'fedora', hc: '#3a2d1a', top: '#6b5a3a', bot: '#2a2a2a', acc: 'tie' }
  };
  w.People = { svg: svg, html: html, el: el, hearts: hearts, cast: cast, walk: walk, run: run, talk: talk, react: react };
})(window);
