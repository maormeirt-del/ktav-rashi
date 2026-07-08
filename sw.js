/* Service Worker — אופליין מלא. אפס תלות ברשת אחרי טעינה ראשונה. */
const CACHE = "rashi-v3";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./css/style.css", "./fonts/fonts.css",
  "./fonts/noto-rashi-400.woff2", "./fonts/noto-rashi-700.woff2",
  "./fonts/tel-aviv-modernist-400.woff2", "./fonts/tel-aviv-modernist-700.woff2",
  "./fonts/heebo-400.woff2", "./fonts/heebo-500.woff2", "./fonts/heebo-700.woff2",
  "./fonts/rubik-400.woff2", "./fonts/rubik-500.woff2", "./fonts/rubik-700.woff2", "./fonts/rubik-900.woff2",
  "./fonts/frank-ruhl-libre-400.woff2", "./fonts/frank-ruhl-libre-700.woff2",
  "./assets/icon.svg",
  "./data/letters.js", "./data/words.js", "./data/passages.js", "./data/content.js", "./data/library.js", "./data/gamehall.js",
  "./js/state.js", "./js/audio.js", "./js/ui.js", "./js/games.js", "./js/minigames.js", "./js/app.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
