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

  /* ---------- רץ שאלות רב-ברירה ---------- */
  // questions: [{ prompt(node), options:[{node, ok, char}], tip, onResult(ok) }]
  function runMC(game, world, questions) {
    const body = el("div", { class: "mc" });
    UI.setScreen(el("div", { class: "game" }, [
      el("div", { class: "game-top" }, [
        el("button", { class: "back", onclick: () => App.world(world.id) }, ["›"]),
        el("div", { class: "game-title" }, [game.emoji + " " + game.title])
      ]), body
    ]));
    const setDot = progressDots(questions.length, body);
    const stage = el("div", { class: "stage" }); body.appendChild(stage);
    let i = 0, score = 0;

    function show() {
      if (i >= questions.length) return finish(game, world, score, questions.length);
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
        [...opts.children].forEach(c => c.classList.add("locked"));
        if (o.ok) {
          btn.classList.add("ok"); score++; setDot(i, true); Audio2.sfx.correct();
          q.onResult && q.onResult(true);
        } else {
          btn.classList.add("bad"); setDot(i, false); Audio2.sfx.wrong();
          [...opts.children].forEach((c, ci) => { if (q.options[ci].ok) c.classList.add("ok"); });
          q.onResult && q.onResult(false);
        }
        if (q.tip) tip.textContent = q.tip;
        setTimeout(() => { i++; show(); }, o.ok ? 780 : 1500);
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
        el("p", { class: "lead" }, ["בִּכְתָב רָשִׁ״י שְׁתֵּי הָאוֹתִיּוֹת הָאֵלֶּה מִתְחַלְּפוֹת:"]),
        el("div", { class: "swap-pair" }, [
          el("div", {}, [rashi("ס"), el("small", {}, ["סָמֶךְ — נִרְאֵית כְּמוֹ ם"])]),
          el("div", {}, [rashi("ם"), el("small", {}, ["מֵם סוֹפִית — נִרְאֵית כְּמוֹ ס"])])
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
          tip: c === "ס" ? "זוֹ סָמֶךְ — לַמְרוֹת שֶׁנִּרְאֵית כְּמוֹ ם" : "זוֹ מֵם סוֹפִית — לַמְרוֹת שֶׁנִּרְאֵית כְּמוֹ ס",
          onResult: (ok) => State.recordResult(c, ok)
        });
      }
      runMC(game, world, qs);
    }
  }

  /* --- 4. הַתְאָמָה: רָשִׁ״י ↔ מְרֻבָּע --- */
  function match(game, world) {
    frame(game, world, (body) => {
      const chars = pick(poolChars(game.pool), 5);
      body.appendChild(el("p", { class: "lead dim" }, ["לַחַץ עַל אוֹת רָשִׁ״י, וְאָז עַל הַתְּאוֹמָה הַמְּרֻבַּעַת שֶׁלָּהּ."]));
      const rCol = el("div", { class: "mcol" }), sCol = el("div", { class: "mcol" });
      const status = el("div", { class: "tip" });
      let sel = null, matched = 0;

      function tile(c, side) {
        const t = el("button", { class: "mtile" + (side === "r" ? " rashi-tile" : "") }, [side === "r" ? rashi(c) : square(c)]);
        t.addEventListener("click", () => tap(side, c, t));   // מאזין יחיד — בלי כפילות
        return t;
      }
      shuffle(chars).forEach(c => rCol.appendChild(tile(c, "r")));
      shuffle(chars).forEach(c => sCol.appendChild(tile(c, "s")));
      body.appendChild(el("div", { class: "match-grid" }, [rCol, sCol]));
      body.appendChild(status);

      function tap(side, c, btn) {
        if (btn.classList.contains("gone")) return;
        Audio2.sfx.tap();
        if (!sel) { sel = { side, c, btn }; btn.classList.add("sel"); status.textContent = "עַכְשָׁו לַחַץ עַל הַתְּאוֹמָה שֶׁלָּהּ ↔"; return; }
        if (sel.btn === btn) { btn.classList.remove("sel"); sel = null; status.textContent = ""; return; }
        if (sel.side !== side && sel.c === c) {
          [sel.btn, btn].forEach(b => { b.classList.remove("sel"); b.classList.add("gone"); });
          Audio2.sfx.correct(); Audio2.speak(NAME(c)); State.recordResult(c, true);
          matched++; sel = null; status.textContent = "";
          if (matched === chars.length) { status.textContent = "כָּל הַכָּבוֹד!"; setTimeout(() => finish(game, world, chars.length, chars.length), 600); }
        } else {
          const bad = [sel.btn, btn]; bad.forEach(b => b.classList.add("shake"));
          Audio2.sfx.wrong(); sel.btn.classList.remove("sel"); sel = null; status.textContent = "";
          setTimeout(() => bad.forEach(b => b.classList.remove("shake")), 500);
        }
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
    (TYPES[game.type] || identify)(game, world);
  }
  return { play };
})();
