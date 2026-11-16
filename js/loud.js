/* loud.js - one master volume for every sound the games synthesise.
   The games mix their tones and drums quietly. This sits in front of every AudioContext output,
   lifts it by a chosen amount, and uses a limiter so loud moments never clip or distort.
   Load it FIRST on every page. Setting is remembered (dt_vol). Default is "Loud". */
(function (w) {
  'use strict';
  var AN = w.AudioNode; if (!AN || w.Loud) return;
  var oc = AN.prototype.connect, buses = [];
  var LEVELS = [['Normal', 1], ['Loud', 2], ['Louder', 3.2], ['Max', 4.5]];
  function lvl() { var v = 2; try { var s = localStorage.getItem('dt_vol'); if (s !== null && +s > 0) v = +s; } catch (e) {} return v; }
  function bus(ctx) {
    if (ctx.__dtb) return ctx.__dtb;
    var g = ctx.createGain(), c = ctx.createDynamicsCompressor();
    g.gain.value = lvl();
    c.threshold.value = -10; c.knee.value = 8; c.ratio.value = 10; c.attack.value = .004; c.release.value = .2;
    oc.call(g, c); oc.call(c, ctx.destination);
    ctx.__dtb = g; buses.push(g); return g;
  }
  AN.prototype.connect = function (d) {
    try { if (w.AudioDestinationNode && d instanceof w.AudioDestinationNode) arguments[0] = bus(d.context); } catch (e) {}
    return oc.apply(this, arguments);
  };
  function name(v) { var best = LEVELS[1]; LEVELS.forEach(function (l) { if (Math.abs(l[1] - v) < Math.abs(best[1] - v)) best = l; }); return best[0]; }
  w.Loud = {
    get: lvl, name: function () { return name(lvl()); },
    set: function (v) { try { localStorage.setItem('dt_vol', String(v)); } catch (e) {} buses.forEach(function (b) { try { b.gain.setTargetAtTime(v, b.context.currentTime, .05); } catch (e) {} }); },
    cycle: function () {
      var cur = name(lvl()), i = 0; LEVELS.forEach(function (l, k) { if (l[0] === cur) i = k; });
      var n = LEVELS[(i + 1) % LEVELS.length]; w.Loud.set(n[1]); return n[0];
    }
  };
  w.addEventListener('storage', function () { var v = lvl(); buses.forEach(function (b) { try { b.gain.value = v; } catch (e) {} }); });
})(window);
