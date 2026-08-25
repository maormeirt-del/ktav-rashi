/* ===========================================================
   games.js — מנוע המשחקים. כל עולם מורכב ממשחקים; כל משחק
   מריץ סבב שאלות, מזין את מנוע ה-SR, ומעניק נקודות + בונוס סיום.
   =========================================================== */
window.Games = (function () {
  const el = UI.el, rashi = UI.rashi, square = UI.square, shuffle = UI.shuffle, pick = UI.pick;
  const ALL_CHARS = () => window.LETTERS.map(l => l.c);
  const NAME = (c) => (window.LETTER_BY_CHAR[c] || {}).name || c;
  const TIER = (c) => (window.LETTER_BY_CHAR[c] || {}).tier;
  const Q = 6;   // שאלות לסבב

  function poolChars(name) {
    if (name === "easy") return window.easyLetters().map(l => l.c);
    if (name === "hard") return window.hardLetters().map(l => l.c);
    if (name === "similar") {
      const s = new Set(); window.CONFUSIONS.forEach(p => p.pair.forEach(c => s.add(c))); return [...s];
    }
    return ALL_CHARS();
  }

  /* ---------- מסגרת משחק ---------- */
  function frame(game, world, bodyBuilder) {
    State.startSession();
    const head = el("div", { class: "game-top" }, [
      el("button", { class: "back", onclick: () => App.world(world.id) }, ["›"]),
      el("div", { class: "game-title" }, [game.emoji + " " + game.title])
    ]);
    const body = el("div", { class: "game-body" });
    UI.setScreen(el("div", { class: "game" }, [head, body]));
    bodyBuilder(body);
  }
  function progressDots(n, host) {
    const wrap = el("div", { class: "dots" });
    for (let i = 0; i < n; i++) wrap.appendChild(el("i", { class: "dot" }));
    host.appendChild(wrap);
    return (i, ok) => { const d = wrap.children[i]; if (d) d.className = "dot " + (ok ? "ok" : "bad"); };
  }

  function finish(game, world, score, total) {
    const first = State.markGameDone(game.id, world.id, 8 + Math.round((score / Math.max(1, total)) * 8));
    const inner = el("div", { class: "done-card" }, [
      el("div", { class: "done-emoji" }, [score === total ? "🌟" : "👏"]),
      el("div", { class: "done-title" }, [score === total ? "מֻשְׁלָם!" : "כָּל הַכָּבוֹד!"]),
      el("div", { class: "done-score" }, [`${score}/${total} נְכוֹנוֹת`]),
      first ? el("div", { class: "done-note" }, ["+" + (8 + Math.round((score / Math.max(1, total)) * 8)) + " נְקֻדּוֹת"]) : null,
      el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => App.world(world.id)) }, ["הַמְשֵׁךְ"])
    ]);
    UI.burst(); Audio2.sfx.reward();
    UI.setScreen(el("div", { class: "game center" }, [inner]));
  }

  /* ===========================================================
     שִׁכְבַת הָאֶתְגָּר — חלה על כל המשימות באפליקציה.
     שעון · מספר ניסיונות · מי שסיים מהר יותר וטעה פחות מקבל יותר.

     שניהם מדורגים: בעולמות הלימוד נדיב (5 ניסיונות), בעולמות
     השליטה הדוק (3). הרעיון — כשעוד לומדים את הסימנים, טעות היא
     חלק מהלימוד; כשכבר יודעים, דיוק הוא כל העניין.
     גם השעון נגזר מגודל המשימה ולא קבוע: 54 סמ״כים מתוך 195 תאים
     אינם אותה משימה כמו 6 שאלות רב-ברירה.

     למה על הכל ולא רק על המרוץ: זיהוי בלי לחץ הוא זיהוי איטי,
     ובדף גמרא אף אחד לא עוצר לחשוב שלוש שניות על כל אות.
     חידת הפתיחה (w0) פטורה — אין בה נכון ולא נכון.
     =========================================================== */
  const CH_LIMIT = 60, CH_STRIKES = 3;
  /* כמה ניסיונות מגיעים בכל עולם. ברירת המחדל היא של עולמות הלימוד. */
  const TRIES_BY_WORLD = { w1: 5, w2: 5, w5h: 5, w3: 4, w4: 4, w5: 3, w6: 3 };
  const triesFor = (game, world) =>
    game && game.tries != null ? game.tries
      : (world && TRIES_BY_WORLD[world.id]) || CH_STRIKES;

  function challenge(host, onTimeout, opts) {
    opts = opts || {};
    let onTime = onTimeout;
    const MAX = opts.tries || CH_STRIKES;
    const LIMIT = opts.limit || CH_LIMIT;
    let left = LIMIT, strikes = 0, timer = null, running = false;
    const hud = el("div", { class: "race-hud" }, [
      el("span", { class: "hud hud-time" }, ["⏱ " + left]),
      opts.pairs ? el("span", { class: "hud hud-pairs" }, ["✓ 0/" + opts.pairs]) : null,
      el("span", { class: "hud hud-tries" }, ["🔁 " + MAX])
    ]);
    host.appendChild(hud);
    function paint(pairsDone) {
      const t = hud.querySelector(".hud-time");
      t.textContent = "⏱ " + Math.max(0, left);
      t.classList.toggle("warn", left <= 10);
      const tr = hud.querySelector(".hud-tries");
      tr.textContent = "🔁 " + (MAX - strikes);
      tr.classList.toggle("warn", MAX - strikes <= 1);
      const p = hud.querySelector(".hud-pairs");
      if (p && pairsDone != null) p.textContent = "✓ " + pairsDone + "/" + opts.pairs;
    }
    function stop() { running = false; clearInterval(timer); timer = null; }
    return {
      hud, paint, stop,
      start() {
        if (running) return; running = true;
        timer = setInterval(() => {
          left--; paint();
          if (left <= 0) { stop(); onTime && onTime(); }
        }, 1000);
      },
      strike() { strikes++; paint(); return strikes >= MAX; },   // true = נגמר
      /* אותו שעון ממשיך לשלב הבא (קריאה → שאלה), רק היעד משתנה */
      handOff(fn) { onTime = fn; return this; },
      get left()    { return Math.max(0, left); },
      get used()    { return LIMIT - Math.max(0, left); },
      get max()     { return MAX; },
      get limit()   { return LIMIT; },
      get strikes() { return strikes; }
    };
  }

  /* כרטיס סיום אחיד — אותה מתמטיקה בכל משימה */
  function scoreCard(game, world, o) {
    const timeBonus = o.won ? o.ch.left : 0;
    /* מנורמל ל-30 בשיא: אחרת עולם עם 5 ניסיונות היה מחלק יותר נקודות
       מעולם עם 3, והציונים בין העולמות לא היו ברי-השוואה. */
    const accBonus  = o.won ? Math.round((o.ch.max - o.ch.strikes) / o.ch.max * 30) : 0;
    const total     = Math.max(0, o.base) + timeBonus + accBonus;
    const first = State.markGameDone(game.id, world.id, total);
    if (!first && total) State.award(total);

    const rows = (o.rows || []).concat([
      ["זְמַן", o.ch.used + " שְׁנִיּוֹת"],
      ["נִסְיוֹנוֹת נוֹסָפִים", o.ch.strikes + " מִתּוֹךְ " + o.ch.max]
    ]);
    const perfect = o.won && o.ch.strikes === 0;
    const card = el("div", { class: "done-card race-done" }, [
      el("div", { class: "done-emoji" }, [o.won ? (perfect ? "🏆" : "🎉") : "⏱"]),
      el("div", { class: "done-title" }, [o.won ? (perfect ? "מֻשְׁלָם, בְּלִי טָעוּת אַחַת!" : "סִיַּמְתָּ!") : (o.why || "נִגְמַר")]),
      el("div", { class: "score-rows" }, rows.map(r =>
        el("div", { class: "score-row" }, [el("span", {}, [r[0]]), el("b", {}, [String(r[1])])]))),
      o.won ? el("div", { class: "score-rows bonus" }, [
        el("div", { class: "score-row" }, [el("span", {}, ["בָּסִיס"]), el("b", {}, ["+" + Math.max(0, o.base)])]),
        el("div", { class: "score-row" }, [el("span", {}, ["בּוֹנוּס זְמַן"]), el("b", {}, ["+" + timeBonus])]),
        el("div", { class: "score-row" }, [el("span", {}, ["בּוֹנוּס דִּיּוּק"]), el("b", {}, ["+" + accBonus])])
      ]) : null,
      el("div", { class: "done-score" }, ["✦ " + total + " נְקֻדּוֹת"]),
      el("div", { class: "race-actions" }, [
        el("button", { class: "btn ghost", onclick: () => play(game, world) }, ["🔁 שׁוּב"]),
        el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => App.world(world.id)) }, ["הַמְשֵׁךְ"])
      ])
    ]);
    if (o.won) { UI.burst(); Audio2.sfx.reward(); }
    UI.setScreen(el("div", { class: "game center" }, [card]));
  }

  /* ---------- רץ שאלות רב-ברירה (תחת שכבת האתגר) ---------- */
  // questions: [{ prompt(node), options:[{node, ok, char}], tip, onResult(ok) }]
  function runMC(game, world, questions, ch0) {
    const body = el("div", { class: "mc" });
    UI.setScreen(el("div", { class: "game" }, [
      el("div", { class: "game-top" }, [
        el("button", { class: "back", onclick: () => App.world(world.id) }, ["›"]),
        el("div", { class: "game-title" }, [game.emoji + " " + game.title])
      ]), body
    ]));
    const ch = ch0
      ? (body.appendChild(ch0.hud), ch0.handOff(() => end(false, "נִגְמַר הַזְּמַן")))
      : challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
          { tries: triesFor(game, world), limit: game.limit });
    const setDot = progressDots(questions.length, body);
    const stage = el("div", { class: "stage" }); body.appendChild(stage);
    let i = 0, score = 0, over = false;
    ch.start();

    function end(won, why) {
      if (over) return; over = true; ch.stop();
      scoreCard(game, world, {
        won, why, ch, base: score * 5,
        rows: [["תְּשׁוּבוֹת נְכוֹנוֹת", score + "/" + questions.length]]
      });
    }

    function show() {
      if (over) return;
      if (i >= questions.length) return end(true);
      const q = questions[i]; stage.innerHTML = "";
      const promptWrap = el("div", { class: "prompt" }); q.prompt(promptWrap);
      const opts = el("div", { class: "options n" + q.options.length });
      q.options.forEach(o => {
        const b = el("button", { class: "opt", onclick: () => choose(o, b) }, [o.node]);
        opts.appendChild(b);
      });
      const tip = el("div", { class: "tip" });
      stage.appendChild(promptWrap); stage.appendChild(opts); stage.appendChild(tip);

      function choose(o, btn) {
        if (over || btn.classList.contains("locked")) return;
        if (o.ok) {
          [...opts.children].forEach(c => c.classList.add("locked"));
          btn.classList.add("ok"); score++; setDot(i, true); Audio2.sfx.correct();
          q.onResult && q.onResult(true);
          tip.innerHTML = ""; if (q.tip) tip.textContent = q.tip;
          setTimeout(() => { i++; show(); }, 780);
          return;
        }
        /* טעות אינה סוף. מראים בדיוק מה ההבדל, ונותנים ניסיון נוסף. */
        btn.classList.add("bad", "locked"); Audio2.sfx.wrong();
        q.onResult && q.onResult(false);
        tip.innerHTML = "";
        tip.appendChild(q.explain ? q.explain(o) : el("b", { class: "retry" }, ["נַסֵּה שׁוּב"]));
        if (ch.strike()) {
          [...opts.children].forEach((c, ci) => { if (q.options[ci].ok) c.classList.add("ok"); });
          [...opts.children].forEach(c => c.classList.add("locked"));
          setDot(i, false);
          setTimeout(() => end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת"), 2200);
        }
      }
    }
    show();
  }

  /* ======================= סוגי משחק ======================= */

  /* --- 0. הַגִּלּוּי (intro) --- */
  function intro(game, world) {
    frame(game, world, (body) => {
      const word = "שָׁלוֹם", plain = "שלום";
      body.appendChild(el("p", { class: "lead" }, ["הַמִּלָּה הַזֹּאת כְּתוּבָה בִּכְתָב רָשִׁ״י:"]));
      body.appendChild(el("div", { class: "hero-word" }, [rashi(word)]));
      const revealed = el("div", { class: "reveal-row" });
      body.appendChild(revealed);
      const note = el("p", { class: "lead dim" }, ["לַחַץ — וְנֶחְשֹׂף אוֹת־אוֹת."]);
      body.appendChild(note);
      const btn = el("button", { class: "btn primary big" }, ["🔦 חֲשֹׂף"]);
      body.appendChild(btn);
      let step = 0; const chars = plain.split("");
      btn.addEventListener("click", () => {
        if (step < chars.length) {
          const c = chars[step];
          const cell = el("div", { class: "reveal-cell pop" }, [
            rashi(c), el("i", {}, [square(c).innerHTML]), el("small", {}, [NAME(c)])
          ]);
          revealed.appendChild(cell); Audio2.sfx.tap(); Audio2.speak(NAME(c));
          step++;
          if (step === chars.length) { btn.textContent = "רָאִיתָ? אַתָּה כְּבָר מְזַהֶה! ✓"; }
        } else {
          note.textContent = "כָּל הָאוֹתִיּוֹת הָאֵלֶּה כִּמְעַט זֵהוֹת לַכְּתָב הָרָגִיל.";
          finish(game, world, 1, 1);
        }
      });
    });
  }

  /* --- 1. זִהוּי אוֹת --- */
  function identify(game, world) {
    let pool = poolChars(game.pool);
    const due = State.dueChars(pool);
    const order = shuffle([...new Set([...due, ...pool])]).slice(0, Q);
    const qs = order.map(c => {
      const distract = shuffle(pool.filter(x => x !== c)).slice(0, 3).map(NAME);
      const options = shuffle([{ t: NAME(c), ok: true }, ...distract.map(t => ({ t, ok: false }))]);
      return {
        prompt: (n) => { n.appendChild(el("div", { class: "big-letter" }, [rashi(c)]));
                         n.appendChild(el("div", { class: "ask" }, ["מִי הָאוֹת?"])); },
        options: options.map(o => ({ node: el("span", { class: "name" }, [o.t]), ok: o.ok })),
        onResult: (ok) => { if (ok) Audio2.speak(NAME(c)); State.recordResult(c, ok); }
      };
    });
    runMC(game, world, qs);
  }

  /* --- 2. נִגּוּד זוּגוֹת --- */
  function contrast(game, world) {
    let pairs = window.CONFUSIONS.slice();
    if (game.boss) pairs = pairs.filter(p => p.boss).concat(pairs.filter(p => window.LETTER_BY_CHAR[p.pair[0]] && (TIER(p.pair[0]) === "hard" || TIER(p.pair[1]) === "hard")));
    pairs = shuffle(pairs);
    const qs = [];
    for (let k = 0; k < Q; k++) {
      const p = pairs[k % pairs.length];
      const target = p.pair[Math.floor(Math.random() * 2)];
      const opts = shuffle(p.pair.map(c => ({ c, ok: c === target })));
      qs.push({
        prompt: (n) => { n.appendChild(el("div", { class: "ask big" }, ["אֵיזוֹ מֵהֶן ", el("b", {}, [NAME(target)]), "?"]));
                         Audio2.speak(NAME(target)); },
        options: opts.map(o => ({ node: el("div", { class: "big-letter sm" }, [rashi(o.c)]), ok: o.ok })),
        tip: p.tip,
        onResult: (ok) => { State.recordResult(target, ok); }
      });
    }
    runMC(game, world, qs);
  }

  /* --- 3. הָאוֹת הַמִּתְחַלֶּפֶת (ם / ס) --- */
  function swap(game, world) {
    frame(game, world, (body) => {
      body.appendChild(el("div", { class: "swap-explain" }, [
        el("p", { class: "lead" }, ["בַּכְּתָב הָרָגִיל ס עֲגֻלָּה וְ־ם מְרֻבַּעַת. בִּכְתָב רָשִׁ״י שְׁתֵּיהֶן עֲגֻלּוֹת — וְלָכֵן צָרִיךְ סִימָן חָדָשׁ:"]),
        el("div", { class: "swap-pair" }, [
          el("div", {}, [rashi("ס"), el("small", {}, ["סָמֶךְ — יֵשׁ לָהּ רֶגֶל שֶׁיּוֹרֶדֶת מִתַּחַת לַשּׁוּרָה"])]),
          el("div", {}, [rashi("ם"), el("small", {}, ["מֵם סוֹפִית — סְגוּרָה, יוֹשֶׁבֶת עַל הַשּׁוּרָה"])])
        ]),
        el("button", { class: "btn primary big", onclick: run }, ["הֵבַנְתִּי — לַתַּרְגּוּל!"])
      ]));
    });
    function run() {
      const qs = [];
      for (let k = 0; k < Q; k++) {
        const c = Math.random() < 0.5 ? "ס" : "ם";
        const options = shuffle([{ t: "סָמֶךְ", c: "ס" }, { t: "מֵם סוֹפִית", c: "ם" }]);
        qs.push({
          prompt: (n) => n.appendChild(el("div", { class: "big-letter" }, [rashi(c)])),
          options: options.map(o => ({ node: el("span", { class: "name" }, [o.t]), ok: o.c === c })),
          tip: c === "ס" ? "זוֹ סָמֶךְ — יֵשׁ לָהּ רֶגֶל שֶׁיּוֹרֶדֶת מִתַּחַת לַשּׁוּרָה" : "זוֹ מֵם סוֹפִית — סְגוּרָה, בְּלִי רֶגֶל",
          onResult: (ok) => State.recordResult(c, ok)
        });
      }
      runMC(game, world, qs);
    }
  }

  /* --- 4. מֵרוֹץ הַהַתְאָמָה — כָּל 27 עַל לוּחַ אֶחָד ---
     לא בריכה חלקית: כל 27 הסימנים. שכבת האתגר (דקה/שלוש פסילות)
     משותפת לכל המשימות — ראה challenge() למעלה. */
  function match(game, world) {
    const chars = ALL_CHARS();
    frame(game, world, (body) => {
      let sel = null, matched = 0, over = false;

      body.appendChild(el("p", { class: "lead dim" }, [
        "כָּל " + chars.length + " הַסִּימָנִים עַל הַלּוּחַ. לַחַץ עַל אוֹת רָשִׁ״י, וְאָז עַל הַתְּאוֹמָה הַמְּרֻבַּעַת שֶׁלָּהּ."
      ]));
      const ch = challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
        { pairs: chars.length, tries: triesFor(game, world), limit: game.limit });
      const status = el("div", { class: "tip" });
      const grid = el("div", { class: "race-grid" });
      /* ההסבר יושב מעל הלוח: מתחת ל-54 אריחים הוא נופל מחוץ למסך,
         והלומד לא רואה בדיוק את מה שנועד ללמד אותו. */
      body.appendChild(status); body.appendChild(grid);
      const start = el("button", { class: "btn primary big", onclick: begin }, ["הַתְחֵל ⏱ דַּקָּה"]);
      body.appendChild(start);

      shuffle([...chars.map(c => ({ c, side: "r" })), ...chars.map(c => ({ c, side: "s" }))])
        .forEach(t => {
          const b = el("button", { class: "mtile" + (t.side === "r" ? " rashi-tile" : "") },
            [t.side === "r" ? rashi(t.c) : square(t.c)]);
          b.addEventListener("click", () => tap(t, b));
          grid.appendChild(b);
        });

      let running = false;
      function begin() { start.remove(); running = true; grid.classList.add("live"); ch.start(); }
      function tap(t, btn) {
        if (!running || over || btn.classList.contains("gone")) return;
        Audio2.sfx.tap();
        if (!sel) { sel = { t, btn }; btn.classList.add("sel"); return; }
        if (sel.btn === btn) { btn.classList.remove("sel"); sel = null; return; }
        if (sel.t.side !== t.side && sel.t.c === t.c) {
          [sel.btn, btn].forEach(x => { x.classList.remove("sel"); x.classList.add("gone"); });
          Audio2.sfx.correct(); State.recordResult(t.c, true);
          matched++; sel = null; ch.paint(matched);
          if (matched === chars.length) return end(true);
        } else {
          const a = sel.t, bad = [sel.btn, btn];
          bad.forEach(x => x.classList.add("shake"));
          Audio2.sfx.wrong(); State.recordResult(sel.t.c, false);
          sel.btn.classList.remove("sel"); sel = null;
          const dead = ch.strike(); ch.paint(matched);
          status.innerHTML = "";
          status.appendChild(window.Riddles && Riddles.pairHint
            ? Riddles.pairHint(a.c, t.c)
            : el("b", { class: "retry" }, ["נַסֵּה שׁוּב"]));
          setTimeout(() => bad.forEach(x => x.classList.remove("shake")), 450);
          if (dead) return end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת");
        }
      }
      function end(won, why) {
        if (over) return; over = true; running = false; ch.stop();
        scoreCard(game, world, {
          won, why, ch, base: won ? 20 : matched,
          rows: [["הַתְאָמוֹת", matched + "/" + chars.length]]
        });
      }
    });
  }

  /* --- 5. קְרִיאַת מִלָּה --- */
  function readword(game, world) {
    const lvls = game.lvl || [1, 2];
    let words = window.WORDS.filter(w => lvls.includes(w.lvl));
    words = pick(words, Q);
    const qs = words.map(w => {
      const distract = pick(window.WORDS.filter(x => x.p !== w.p), 3);
      const options = shuffle([{ w, ok: true }, ...distract.map(x => ({ w: x, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(el("div", { class: "big-word", onclick: () => Audio2.speak(w.t) }, [rashi(w.t)]));
          n.appendChild(el("div", { class: "ask" }, ["מַהִי הַמִּלָּה? (לַחַץ לִשְׁמֹעַ)"]));
        },
        options: options.map(o => ({ node: el("span", { class: "sqword" }, [square(o.w.p)]), ok: o.ok })),
        onResult: (ok) => { if (ok) { Audio2.speak(w.t); UI.toast(w.m); } }
      };
    });
    runMC(game, world, qs);
  }

  /* --- 6. הַשְׁלֵם אֶת הָאוֹת --- */
  function fill(game, world) {
    const lvls = game.lvl || [1, 2];
    let words = pick(window.WORDS.filter(w => lvls.includes(w.lvl) && w.p.length >= 3), Q);
    const qs = words.map(w => {
      const chars = w.p.split("");
      // עדיף להסתיר אות קשה
      let idxs = chars.map((c, i) => i).filter(i => TIER(chars[i]) === "hard");
      const idx = (idxs.length ? idxs : chars.map((c, i) => i))[Math.floor(Math.random() * (idxs.length || chars.length))];
      const answer = chars[idx];
      const shown = chars.map((c, i) => i === idx ? "◻" : c).join("");
      const distract = pick(ALL_CHARS().filter(c => c !== answer), 3);
      const options = shuffle([{ c: answer, ok: true }, ...distract.map(c => ({ c, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(el("div", { class: "big-word fill" }, [rashi(shown.replace("◻", '<b class="blank">◻</b>'))]));
          n.appendChild(el("div", { class: "ask" }, ["אֵיזוֹ אוֹת חֲסֵרָה?"]));
        },
        options: options.map(o => ({ node: el("div", { class: "big-letter sm" }, [rashi(o.c)]), ok: o.ok })),
        onResult: (ok) => { State.recordResult(answer, ok); if (ok) { Audio2.speak(w.t); UI.toast(w.t.replace(/[֑-ׇ]/g, "")); } }
      };
    });
    runMC(game, world, qs);
  }

  /* --- 7. קְרִיאַת קֶטַע רָשִׁ״י --- */
  function readpassage(game, world) {
    const list = window.passagesByLevel(game.lvl);
    const p = list[Math.floor(Math.random() * list.length)];
    const allowHint = game.hint !== false;
    frame(game, world, (body) => {
      body.appendChild(el("div", { class: "src" }, [p.src]));
      const passage = el("div", { class: "passage" });
      // כל מילה — לחיצה חושפת מרובע (scaffold), רק אם מותר
      p.t.split(" ").forEach((word, wi) => {
        const wSpan = el("span", { class: "pw" }, [rashi(word)]);
        if (allowHint) wSpan.addEventListener("click", () => {
          const plain = (p.plain.split(" ")[wi] || "");
          wSpan.innerHTML = ""; wSpan.appendChild(square(plain)); wSpan.classList.add("revealed");
          Audio2.sfx.tap();
        });
        passage.appendChild(wSpan); passage.appendChild(document.createTextNode(" "));
      });
      body.appendChild(passage);
      if (allowHint) body.appendChild(el("p", { class: "hint-note" }, ["💡 לַחַץ עַל מִלָּה קָשָׁה כְּדֵי לִרְאוֹת אוֹתָהּ בִּכְתָב רָגִיל."]));

      const bar = el("div", { class: "passage-actions" });
      bar.appendChild(el("button", { class: "btn ghost", onclick: () => Audio2.speak(p.plain, 0.85) }, ["🔊 הַקְרֵא"]));
      let shownTr = false;
      const trBtn = el("button", { class: "btn ghost", onclick: () => {
        if (shownTr) return; shownTr = true;
        body.insertBefore(el("div", { class: "translation" }, ["📖 " + p.tr]), bar);
      } }, ["📖 הֶסְבֵּר"]);
      bar.appendChild(trBtn);
      body.appendChild(bar);

      // מבחן הבנה קטן: לזהות את הקטע הנכון לפי ההסבר
      const check = el("button", { class: "btn primary big", onclick: comprehend }, ["קָרָאתִי — לַשְּׁאֵלָה ›"]);
      body.appendChild(check);

      function comprehend() {
        const others = shuffle(window.PASSAGES.filter(x => x.id !== p.id)).slice(0, 2);
        const options = shuffle([{ p, ok: true }, ...others.map(x => ({ p: x, ok: false }))]);
        runMC(game, world, [{
          prompt: (n) => n.appendChild(el("div", { class: "ask big" }, ["מָה הַהֶסְבֵּר הַנָּכוֹן לַקֶּטַע?"])),
          options: options.map(o => ({ node: el("span", { class: "tropt" }, [o.p.tr]), ok: o.ok })),
          onResult: (ok) => { if (ok) State.award(6); }
        }]);
      }
    });
  }

  /* --- 8. ארקייד: צַיָּד הָאוֹתִיּוֹת --- */
  function arcade(game, world) {
    const pool = poolChars(game.pool);
    frame(game, world, (body) => {
      const target = pool[Math.floor(Math.random() * pool.length)];
      let score = 0, left = 30, timer = null, running = false;
      const head = el("div", { class: "arc-head" }, [
        el("div", {}, ["מְצָא אֶת: ", el("b", { class: "arc-target" }, [rashi(target)]), " (", NAME(target), ")"]),
        el("div", { class: "arc-stats" }, [ el("span", { class: "arc-time" }, ["⏱ 30"]), el("span", { class: "arc-score" }, ["✦ 0"]) ])
      ]);
      const grid = el("div", { class: "arc-grid" });
      body.appendChild(head); body.appendChild(grid);
      const start = el("button", { class: "btn primary big", onclick: begin }, ["הַתְחֵל!"]);
      body.appendChild(start);

      function fill() {
        grid.innerHTML = "";
        const cells = [];
        const hits = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < 16; i++) cells.push(i < hits ? target : pool[Math.floor(Math.random() * pool.length)]);
        shuffle(cells).forEach(c => {
          const b = el("button", { class: "arc-cell" }, [rashi(c)]);
          b.addEventListener("click", () => {
            if (!running || b.classList.contains("used")) return;
            b.classList.add("used");
            if (c === target) { score++; b.classList.add("hit"); Audio2.sfx.correct(); }
            else { score = Math.max(0, score - 1); b.classList.add("miss"); Audio2.sfx.wrong(); }
            head.querySelector(".arc-score").textContent = "✦ " + score;
            if (![...grid.children].some(x => !x.classList.contains("used") && x.textContent === target)) setTimeout(fill, 250);
          });
          grid.appendChild(b);
        });
      }
      function begin() {
        start.remove(); running = true; fill();
        timer = setInterval(() => {
          left--; head.querySelector(".arc-time").textContent = "⏱ " + left;
          if (left <= 0) { clearInterval(timer); running = false; end(); }
        }, 1000);
      }
      function end() {
        State.award(score); State.recordResult(target, score >= 5);
        finish(game, world, Math.min(score, 10), 10);
      }
    });
  }

  const TYPES = { intro, identify, contrast, swap, match, readword, fill, readpassage, arcade };
  function play(game, world) {
    /* טיפוסי חידה מנותבים למנוע החידות (riddles.js) */
    if (window.Riddles && window.Riddles.TYPES[game.type]) return window.Riddles.play(game, world);
    (TYPES[game.type] || identify)(game, world);
  }
  return { play, finish, runMC, frame, progressDots, challenge, scoreCard, triesFor, CH_LIMIT, CH_STRIKES };
})();
