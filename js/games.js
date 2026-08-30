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
      el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => {
        const n = nextTask(game, world);
        n ? play(n.g, n.w) : App.world(world.id);
      }) }, ["בּוֹא נַתְחִיל ›"])
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

  const PEEK_COST = 8;   // שניות. "הצץ" עולה זמן — לא נספר כטעות.
  function challenge(host, onTimeout, opts) {
    opts = opts || {};
    let onTime = onTimeout;
    const MAX = opts.tries || CH_STRIKES;
    const LIMIT = opts.limit || CH_LIMIT;
    let left = LIMIT, strikes = 0, banked = 0, peeks = 0, timer = null, running = false;
    /* הדרך היחידה לגלות אות באפליקציה הייתה לטעות. בחוברת המודפסת
       יש מפתח פתרונות; כאן הוא עולה שניות, לא פסילה. */
    const peekBtn = opts.peek === false ? null
      : el("button", { class: "hud hud-peek", onclick: () => {
          left = Math.max(1, left - PEEK_COST); peeks++; paint();
          State.progress.peeks = (State.progress.peeks || 0) + 1; State.save();
          App.keySheet(true);
        } }, ["👁 הַצֵּץ (−" + PEEK_COST + "שׁ)"]);
    const hud = el("div", { class: "race-hud" }, [
      el("span", { class: "hud hud-time" }, ["⏱ " + left]),
      opts.pairs ? el("span", { class: "hud hud-pairs" }, ["✓ 0/" + opts.pairs]) : null,
      el("span", { class: "hud hud-tries" }, ["🔁 " + MAX]),
      peekBtn
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
      /* בעולמות הלימוד מיצוי הניסיונות סוגר שאלה, לא סבב. הפסילות
         נצברות לצורך בונוס הדיוק, אבל המונה מתאפס לשאלה הבאה. */
      resetStrikes() { banked += strikes; strikes = 0; paint(); },
      /* אותו שעון ממשיך לשלב הבא (קריאה → שאלה), רק היעד משתנה */
      handOff(fn) { onTime = fn; return this; },
      get left()    { return Math.max(0, left); },
      get used()    { return LIMIT - Math.max(0, left); },
      get max()     { return MAX; },
      get limit()   { return LIMIT; },
      get strikes() { return strikes; },
      get allStrikes() { return banked + strikes; },
      get peeks()   { return peeks; }
    };
  }

  /* המשימה הבאה ברצף — ממשיכה גם אל תוך העולם הבא.
     הילד לא צריך לחזור למפה, לבחור, ולהיזכר איפה הוא היה. */
  function nextTask(game, world) {
    const ws = window.WORLDS;
    const wi = ws.findIndex(w => w.id === world.id);
    const gi = world.games.findIndex(g => g.id === game.id);
    /* אתגר שיא אינו "המשימה הבאה" — הוא נפתח אחרי שהעולם נגמר */
    for (let k = gi + 1; k > 0 && k < world.games.length; k++)
      if (!world.games[k].bonus) return { g: world.games[k], w: world };
    for (let i = wi + 1; i < ws.length; i++) {
      const g = ws[i].games.find(x => !x.bonus);
      if (g) return { g, w: ws[i] };
    }
    return null;
  }

  /* כרטיס סיום אחיד — אותה מתמטיקה בכל משימה */
  function scoreCard(game, world, o) {
    const timeBonus = o.won ? o.ch.left : 0;
    /* מנורמל ל-30 בשיא: אחרת עולם עם 5 ניסיונות היה מחלק יותר נקודות
       מעולם עם 3, והציונים בין העולמות לא היו ברי-השוואה.
       בעולם רך הפסילות נצברות על פני כל השאלות, ולכן גם המכנה. */
    const accMax    = o.softQ ? o.ch.max * o.softQ : o.ch.max;
    const accUsed   = o.softQ ? o.ch.allStrikes : o.ch.strikes;
    const accBonus  = o.won ? Math.round(Math.max(0, accMax - accUsed) / accMax * 30) : 0;
    const total     = Math.max(0, o.base) + timeBonus + accBonus;
    const first = State.markGameDone(game.id, world.id, total);
    if (!first && total) State.award(total);

    /* אם המשימה הקליטה קריאה בקול, הקצב הוא המדד האמיתי של שטף */
    const rd = game && game._reading;
    const rows = (rd ? [["קְצַב קְרִיאָה", rd.wpm + " מִלִּים לְדַקָּה"]] : []).concat(o.rows || []).concat([
      ["זְמַן", o.ch.used + " שְׁנִיּוֹת"],
      ["נִסְיוֹנוֹת נוֹסָפִים", accUsed + " מִתּוֹךְ " + accMax]
    ]).concat(o.ch.peeks ? [["הֲצָצוֹת בַּמַּפְתֵּחַ", o.ch.peeks]] : []);
    const perfect = o.won && accUsed === 0;
    const nxt = nextTask(game, world);
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
        nxt
          ? el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => play(nxt.g, nxt.w)) },
              [(nxt.w.id !== world.id ? nxt.w.emoji + " " + nxt.w.title : nxt.g.title) + " ›"])
          : el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => App.world(world.id)) }, ["סִיַּמְתָּ הַכֹּל 🏆"])
      ]),
      el("button", { class: "map-link", onclick: () => UI.drainRewards(() => App.world(world.id)) }, ["חֲזָרָה לַמַּפָּה"])
    ]);
    if (o.won) { UI.burst(); Audio2.sfx.reward(); }
    UI.setScreen(el("div", { class: "game center" }, [card]));
  }

  /* בעולמות הלימוד מיצוי הניסיונות סוגר את *השאלה*, לא את הסבב.
     אצל מתחיל חמש טעויות על שש שאלות הן מצב נורמלי; לסיים לו את הכל
     ולהתחיל מאפס זה לא מדד, זה עונש. הציון בסוף. */
  const SOFT_WORLDS = ["w1", "w2", "w5h"];
  const SOFT_LIMIT = 90;    // יותר ניסיונות לשאלה = צריך יותר זמן לסבב
  /* שלושה לשאלה, לא חמישה לסבב. בשאלה של ארבע אפשרויות, חמישה
     ניסיונות הם יותר מכל המסיחים גם יחד — כלומר המנגנון לא קיים.
     שלושה סוגרים את השאלה ומראים את התשובה במקום להשאיר את
     הלומד ללחוץ על מה שנשאר. בסך הכל: 18 טעויות מותרות בסבב
     במקום 5, וכל אחת מהן נגמרת בהסבר. */
  const SOFT_TRIES = 3;

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
    const soft = !ch0 && world && SOFT_WORLDS.indexOf(world.id) > -1;
    const ch = ch0
      ? (body.appendChild(ch0.hud), ch0.handOff(() => end(false, "נִגְמַר הַזְּמַן")))
      : challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
          { tries: soft ? SOFT_TRIES : triesFor(game, world),
            limit: game.limit || (soft ? SOFT_LIMIT : null) });
    const setDot = progressDots(questions.length, body);
    const stage = el("div", { class: "stage" }); body.appendChild(stage);
    let i = 0, score = 0, over = false;
    ch.start();

    function end(won, why) {
      if (over) return; over = true; ch.stop();
      scoreCard(game, world, {
        won, why, ch, base: score * 5, softQ: soft ? questions.length : 0,
        rows: [["תְּשׁוּבוֹת נְכוֹנוֹת", score + "/" + questions.length]]
      });
    }

    function show() {
      if (over) return;
      if (i >= questions.length) return end(true);
      const q = questions[i]; stage.innerHTML = "";
      const promptWrap = el("div", { class: "prompt" }); q.prompt(promptWrap);
      /* אפשרויות טקסט (מילה, תרגום, שם אות) יורדות ברשימה אנכית, כמו
         ב"אותיות של אור". גליפים נשארים ברשת — שם רוחב הוא מה שמאפשר
         לראות את הצורה. */
      const textOpts = q.options.every(o =>
        o.node && /\b(wopt|tropt|sqword|name)\b/.test(o.node.className || ""));
      const opts = el("div", { class: "options n" + q.options.length + (textOpts ? " stack" : "") });
      q.options.forEach(o => {
        const b = el("button", { class: "opt", onclick: () => choose(o, b) }, [o.node]);
        opts.appendChild(b);
      });
      const tip = el("div", { class: "tip" });
      const card = el("div", { class: "q-card" }, [promptWrap, opts, tip]);
      stage.appendChild(card);

      function choose(o, btn) {
        if (over || btn.classList.contains("locked")) return;
        if (o.ok) {
          [...opts.children].forEach(c => c.classList.add("locked"));
          btn.classList.add("ok"); score++; setDot(i, true); Audio2.sfx.correct();
          q.onResult && q.onResult(true);
          tip.innerHTML = "";
          tip.appendChild(el("b", { class: "fb-ok" }, ["מְצֻיָּן! 🎉"]));
          if (q.tip) tip.appendChild(el("span", { class: "fb-note" }, [q.tip]));
          setTimeout(() => { i++; show(); }, 520);
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
          if (soft) {
            /* מראים את התשובה, מסמנים ל-SR, וממשיכים לשאלה הבאה */
            q.onShown && q.onShown();
            tip.appendChild(el("b", { class: "retry moveon" }, ["זֹאת הַתְּשׁוּבָה. מַמְשִׁיכִים ›"]));
            ch.resetStrikes();
            setTimeout(() => { i++; show(); }, 2600);
          } else {
            setTimeout(() => end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת"), 2200);
          }
        }
      }
    }
    show();
  }

  /* ======================= סוגי משחק ======================= */
  /* ד1 — נמחקו כאן שמונה טיפוסים שלא היו נגישים מ-WORLDS:
       intro · identify · contrast · fill · arcade — כפילות של מנוע החידות.
       swap · readword · readpassage — הפתרונות לב1, ב2 ו-ג5; הוחיו
       בתוך riddles.js (learnCard · r-readword) ובתוך בית המדרש
       (חשיפה לפי מילה), ולא כטיפוסי משחק מקבילים.
     נשאר match בלבד — הוא היחיד שמגיע מ-WORLDS. */

  /* --- 4. מֵרוֹץ הַהַתְאָמָה ---
     שתי גרסאות מאותו קוד: שַׁעַר של 9 זוגות בתוך העולם, ומרוץ מלא
     של כל 27 כאתגר שיא אחרי סיומו. 27 זוגות בדקה = 2.2 שניות לזוג
     כולל סריקה — זה שיא, לא תנאי מעבר.
     ⚠️ הדקה עצמה נשארת כמו שהיא, לבקשת מאור. */
  function match(game, world) {
    const chars = game.n ? pick(ALL_CHARS(), game.n) : ALL_CHARS();
    frame(game, world, (body) => {
      let sel = null, matched = 0, over = false;

      body.appendChild(el("p", { class: "lead dim" }, [
        (game.n ? chars.length + " זוּגוֹת עַל הַלּוּחַ." : "כָּל " + chars.length + " הַסִּימָנִים עַל הַלּוּחַ.") +
        " לַחַץ עַל אוֹת רָשִׁ״י, וְאָז עַל הַתְּאוֹמָה הַמְּרֻבַּעַת שֶׁלָּהּ."
      ]));
      const ch = challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
        { pairs: chars.length, tries: triesFor(game, world), limit: game.limit });
      const status = el("div", { class: "tip" });
      const grid = el("div", { class: "race-grid" });
      /* ההסבר יושב מעל הלוח: מתחת ל-54 אריחים הוא נופל מחוץ למסך,
         והלומד לא רואה בדיוק את מה שנועד ללמד אותו. */
      body.appendChild(status); body.appendChild(grid);
      const start = el("button", { class: "btn primary big", onclick: begin },
        ["הַתְחֵל ⏱ " + (game.limit || CH_LIMIT) + " שְׁנִיּוֹת"]);
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

  const TYPES = { match };
  function play(game, world) {
    /* טיפוסי חידה מנותבים למנוע החידות (riddles.js) */
    if (window.Riddles && window.Riddles.TYPES[game.type]) return window.Riddles.play(game, world);
    (TYPES[game.type] || match)(game, world);
  }
  return { play, finish, runMC, frame, progressDots, challenge, scoreCard, triesFor, nextTask, CH_LIMIT, CH_STRIKES };
})();
