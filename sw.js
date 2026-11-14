/* The Detective - service worker
   Caches the whole game on first visit, so it installs as an app and then plays with no network.
   Bump VERSION whenever a file changes, so players get the new files. */
const VERSION = 'detective-v3';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './games/balogun.html', './games/echo.html', './games/siege.html',
  './js/access.js', './js/atmos.js', './js/lagos.js', './js/people.js', './js/polish.js', './js/sfx.js',
  './js/siegecore.js', './js/suspense.js', './js/traffic.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png',
  './sounds/cars-on-the-highway.mp3', './sounds/clap.mp3', './sounds/emotional-damage.mp3', './sounds/intro.mp3',
  './sounds/sad-tune.mp3', './sounds/slap.mp3', './sounds/why-are-you-running.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('detective-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Audio and video ask for byte ranges. Safari refuses a media file unless the answer is a proper 206,
   so slice the cached file ourselves. */
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const size = buf.byteLength;
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(end - start + 1),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Accept-Ranges': 'bytes'
    }
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    // ignoreSearch: index.html?g=balogun and ?source=pwa are the same page
    let hit = await cache.match(req, { ignoreSearch: true });
    if (!hit && req.mode === 'navigate') hit = await cache.match('./index.html');
    if (hit) {
      if (req.headers.has('range')) return rangeResponse(req, hit);
      // refresh in the background so the next visit has the latest files
      e.waitUntil(fetch(req).then((r) => { if (r && r.ok && r.status === 200) cache.put(req, r.clone()); }).catch(() => {}));
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok && res.status === 200 && !req.headers.has('range')) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
