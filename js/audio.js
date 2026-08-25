/* ===========================================================
   audio.js — הקראה עברית (Web Speech, חינמי) + אפקטי קול (WebAudio).
   אפס רשת, אפס טוקנים.
   =========================================================== */
window.Audio2 = (function () {
  let hebVoice = null, muted = false;
  function pickVoice() {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    hebVoice = vs.find(v => /he[-_]?IL/i.test(v.lang) || /hebrew|עברית/i.test(v.name)) ||
               vs.find(v => /^he/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text, rate) {
    if (muted || !window.speechSynthesis || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = "he-IL"; u.rate = rate || 0.92; u.pitch = 1;
      if (hebVoice) u.voice = hebVoice;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* --- אפקטי קול --- */
  let ctx = null;
  function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ctx; }
  function tone(freq, dur, type, when, gain) {
    const c = ac(); if (!c || muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    const t = c.currentTime + (when || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    tap()    { tone(440, 0.08, "sine", 0, 0.12); },
    correct(){ tone(660, 0.12, "sine"); tone(880, 0.14, "sine", 0.1); },
    wrong()  { tone(200, 0.18, "sawtooth", 0, 0.14); },
    reward() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", i * 0.1, 0.18)); },
    unlock() { [392, 523, 659, 880].forEach((f, i) => tone(f, 0.22, "sine", i * 0.12, 0.2)); }
  };

  const PRAISE = ["כָּל הַכָּבוֹד", "מְצֻיָּן", "יָפֶה מְאֹד", "אַתָּה מִתְקַדֵּם", "נָכוֹן!", "אַלּוּף"];
  function praise(name) {
    const p = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    speak(name ? `${p}, ${name}!` : p);
  }
  return {
    speak, sfx, praise,
    setMuted(m) { muted = m; if (m && window.speechSynthesis) speechSynthesis.cancel(); },
    get muted() { return muted; }
  };
})();
