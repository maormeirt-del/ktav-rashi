/* ===========================================================
   state.js — פרופיל + התקדמות + מנוע חזרה מרווחת (SR).
   הכל ב-localStorage. אפס שרת, אפס טוקנים.
   =========================================================== */
window.State = (function () {
  const PKEY = "rashi_profile", GKEY = "rashi_progress";
  const SR_INTERVALS = [1, 2, 4, 8, 16, 32];   // Leitner — לפי תיבה
  const MASTERY_BOX = 3;                         // מתיבה 3 ומעלה = "נשלט"

  const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const today = () => new Date().toISOString().slice(0, 10);

  function defaultProgress() {
    return {
      points: 0, done: {}, sr: {}, session: 0,
      worldsDone: {}, opened: {}, seals: [], medals: [],
      mastered: 0,
      streak: { count: 0, last: null }, readDays: {},
      daily: { date: null, games: 0, points: 0, claimed: false },
      lastWorld: "w0"
    };
  }
  function loadProgress() {
    const p = load(GKEY); if (!p) return defaultProgress();
    return Object.assign(defaultProgress(), p);
  }

  let profile = load(PKEY);
  let progress = loadProgress();
  const save = () => localStorage.setItem(GKEY, JSON.stringify(progress));

  /* ---- תורים לפופ-אפים (דרגה/מדליה/חותם/ספר חדשים) ---- */
  const queue = { rank: [], medal: [], seal: [], sefer: [] };
  function popRank()  { return queue.rank.shift(); }
  function popMedal() { return queue.medal.shift(); }
  function popSeal()  { return queue.seal.shift(); }
  function popSefer() { return queue.sefer.shift(); }

  /* ---- נקודות + דרגה ---- */
  function rollDaily() {
    if (progress.daily.date !== today())
      progress.daily = { date: today(), games: 0, points: 0, claimed: false };
  }
  function award(n) {
    rollDaily();
    const before = window.rankFor(progress.points).name;
    progress.points += n; progress.daily.points += n;
    const after = window.rankFor(progress.points);
    if (after.name !== before) queue.rank.push(after);
    save();
  }

  /* ---- מנוע SR — לכל אות ---- */
  function srOf(c) { return progress.sr[c] || { box: 0, due: 0, seen: 0, correct: 0 }; }
  function recordResult(c, correct) {
    const s = srOf(c); s.seen++;
    if (correct) { s.correct++; s.box = Math.min(5, s.box + 1); }
    else         { s.box = Math.max(0, s.box - 1); }
    s.due = progress.session + SR_INTERVALS[s.box];
    progress.sr[c] = s;
    const tier = (window.LETTER_BY_CHAR[c] || {}).tier;
    award(correct ? (tier === "hard" ? 4 : 2) : 0);
    recountMastery();
    save();
  }
  function recountMastery() {
    progress.mastered = Object.values(progress.sr).filter(s => s.box >= MASTERY_BOX).length;
  }
  function boxOf(c) { return srOf(c).box; }
  function startSession() { progress.session++; save(); }
  function dueChars(pool) {   // pool = array of chars; מחזיר את מה שצריך חזרה, קשים קודם
    return pool.filter(c => srOf(c).due <= progress.session)
               .sort((a, b) => srOf(a).box - srOf(b).box);
  }

  /* ---- סיום משחק + פתיחת עולם ---- */
  function isDone(id) { return !!progress.done[id]; }
  function markGameDone(gameId, worldId, reward) {
    const first = !progress.done[gameId];
    progress.done[gameId] = true;
    if (first) {
      rollDaily(); progress.daily.games += 1;
      if (reward) award(reward);
      touchStreak();
    }
    checkWorldComplete(worldId);
    checkMedals();
    save();
    return first;
  }
  function worldComplete(worldId) {
    const w = window.worldById(worldId); if (!w) return false;
    return w.games.every(g => progress.done[g.id]);
  }
  function checkWorldComplete(worldId) {
    if (!worldId || progress.worldsDone[worldId]) return;
    if (!worldComplete(worldId)) return;
    progress.worldsDone[worldId] = true;
    const w = window.worldById(worldId);
    // פתיחת ספר בארון
    if (w && w.opens) openSefer(w.opens, /*silent*/ false);
    // חותם מדפיס
    (window.SEALS || []).forEach(sl => {
      if (sl.when === worldId && !progress.seals.includes(sl.id)) {
        progress.seals.push(sl.id); queue.seal.push(sl);
      }
    });
  }

  /* ---- אֲרוֹן הַסְּפָרִים ---- */
  function seferUnlocked(sef) {
    if (!sef.unlock) return true;              // ספר פתיחה
    return !!progress.worldsDone[sef.unlock];
  }
  function openSefer(id, silent) {
    const sef = (window.SEFORIM || []).find(s => s.id === id); if (!sef) return;
    if (!progress.opened[id]) { progress.opened[id] = true; if (!silent) queue.sefer.push(sef); }
    save();
  }
  function seforimState() {
    return (window.SEFORIM || []).map(s => ({
      ...s, unlocked: seferUnlocked(s), opened: !!progress.opened[s.id]
    }));
  }

  /* ---- רֶצֶף ימים ---- */
  function touchStreak() {
    const td = today(); progress.readDays[td] = true;
    if (progress.streak.last === td) return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    progress.streak.count = (progress.streak.last === yest) ? progress.streak.count + 1 : 1;
    progress.streak.last = td;
  }
  function last14() {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      out.push({ date: d, read: !!progress.readDays[d] });
    }
    return out;
  }

  /* ---- אתגר יומי ---- */
  const MISSION = { games: 3, reward: 20 };
  function daily() {
    rollDaily();
    const met = progress.daily.games >= MISSION.games;
    return { goal: MISSION.games, games: progress.daily.games, met, claimed: progress.daily.claimed, reward: MISSION.reward };
  }
  function claimDaily() {
    const d = daily(); if (!d.met || d.claimed) return 0;
    progress.daily.claimed = true; award(MISSION.reward); return MISSION.reward;
  }

  /* ---- מדליות ---- */
  function checkMedals() {
    (window.MEDALS || []).forEach(m => {
      if (!progress.medals.includes(m.id) && m.test(progress)) {
        progress.medals.push(m.id); queue.medal.push(m);
      }
    });
  }

  /* ---- דרגה ---- */
  function rank() { return window.rankFor(progress.points); }
  function nextRank() { return window.nextRank(progress.points); }
  function rankProgress() {
    const r = rank(), n = nextRank();
    if (!n) return 1;
    return Math.min(1, (progress.points - r.min) / (n.min - r.min));
  }

  function reset() {
    localStorage.removeItem(PKEY); localStorage.removeItem(GKEY);
    profile = null; progress = defaultProgress();
  }

  return {
    get profile() { return profile; },
    setProfile(p) { profile = p; localStorage.setItem(PKEY, JSON.stringify(p)); },
    get progress() { return progress; },
    get mode() { return (profile && profile.mode) || "kid"; },
    setMode(m) { if (profile) { profile.mode = m; localStorage.setItem(PKEY, JSON.stringify(profile)); } },
    save,
    award, recordResult, boxOf, dueChars, startSession, recountMastery,
    isDone, markGameDone, worldComplete,
    seferUnlocked, openSefer, seforimState,
    touchStreak, last14, daily, claimDaily,
    rank, nextRank, rankProgress,
    popRank, popMedal, popSeal, popSefer, reset
  };
})();
