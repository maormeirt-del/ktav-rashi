/* Service Worker — אופליין מלא. אפס תלות ברשת אחרי טעינה ראשונה. */
const CACHE = "rashi-v45";
const ASSETS = [
  "./", "./index.html", "./mic.html", "./manifest.json",
  "./css/style.css", "./fonts/fonts.css",
  "./fonts/noto-rashi-400.woff2", "./fonts/noto-rashi-700.woff2",
  "./fonts/tel-aviv-modernist-400.woff2", "./fonts/tel-aviv-modernist-700.woff2",
  "./fonts/heebo-400.woff2", "./fonts/heebo-500.woff2", "./fonts/heebo-700.woff2",
  "./fonts/rubik-400.woff2", "./fonts/rubik-500.woff2", "./fonts/rubik-700.woff2", "./fonts/rubik-900.woff2",
  "./fonts/frank-ruhl-libre-400.woff2", "./fonts/frank-ruhl-libre-700.woff2",
  "./assets/icon.svg",
  "./data/letters.js", "./data/riddles.js", "./data/abbrev.js", "./data/words.js", "./data/passages.js", "./data/content.js", "./data/library.js", "./data/gamehall.js",
  "./js/state.js", "./js/audio.js", "./js/ui.js", "./js/games.js", "./js/riddles.js", "./js/minigames.js", "./js/app.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* ⚠️ קוד = network-first. פונטים ותמונות = cache-first.
   קודם הכל היה cache-first, והתוצאה: תיקון שנפרס לא הגיע למכשיר
   שכבר התקין את האפליקציה. הלומד נשאר עם באג שכבר תוקן, ואין לו
   שום דרך לדעת. פונטים לא משתנים לעולם ולכן הם נשארים מהמטמון. */
const STATIC = /\.(?:woff2|svg|png|jpg|webp|mp3)$/i;
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (STATIC.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    })));
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))   // אופליין — נופלים למטמון
  );
});
