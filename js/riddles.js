/* ===========================================================
   riddles.js — מְנוֹעַ הַחִידוֹת.

   ההבדל מ-games.js: שם מציגים אות ושואלים "מי זו?", והטיפ
   מגיע אחרי התשובה כמשוב. כאן הרמז מגיע *לפני*, והתלמיד מסיק.

   שבעה שלבים בסולם עולה — כמה נחשף, כמה מוסתר:
     r-open      עולם 0 — חידת הפתיחה: כמה אתה כבר יודע?
     r-sign      עולם 1 — האות מוצגת + רמז מכריע → מי זו?
     r-family    עולם 2 — בלי האות. רמז → בחר מתוך האשכול.
     r-detective עולם 3 — רמז אחר רמז, כל רמז עולה נקודות.
     r-word      עולם 4 — מילה אמיתית עם אות חסרה.
     r-line      עולם 5 — קטע רש״י עם מילה חסרה.
     r-fluent    עולם 6 — בלי רמזים בכלל.
   =========================================================== */
window.Riddles = (function () {
  const el = UI.el, rashi = UI.rashi, square = UI.square, shuffle = UI.shuffle, pick = UI.pick;
  const NAME = (c) => (window.LETTER_BY_CHAR[c] || {}).name || c;
  const CLUES = () => window.CLUES || {};
  const Q = 6;
  /* "1 נקודות" זו עברית שבורה — ולנער בן 15 זה בדיוק מה שמסגיר תוכנה חובבנית */
  const pts = (n) => n === 1 ? "נְקֻדָּה" : "נְקֻדּוֹת";


  /* ===========================================================
     "אֵיפֹה טָעִיתִי" — הרכיב שהופך טעות לרגע לימוד.
     לא "נפסלת", אלא: זו האות שבחרת, זו הנכונה, וזה הסימן
     שמבדיל ביניהן. בדיוק הסימן, לא "הן דומות".
     =========================================================== */
  function letterChip(c, kind) {
    return el("span", { class: "ww-chip " + kind }, [
      el("span", { class: "ww-glyph" }, [rashi(c)]),
      el("small", {}, [NAME(c)])
    ]);
  }
  function decisive(c) {
    const cl = (CLUES()[c] || {}).clues;
    return cl ? cl[cl.length - 1] : null;
  }
  function whyWrong(chosen, correct) {
    const d = decisive(correct);
    return el("div", { class: "whywrong" }, [
      el("div", { class: "ww-row" }, [
        letterChip(chosen, "bad"), el("span", { class: "ww-vs" }, ["≠"]), letterChip(correct, "good")
      ]),
      d ? el("p", { class: "ww-why" }, [NAME(correct) + " אוֹמֶרֶת: " + d]) : null,
      el("b", { class: "retry" }, ["נַסֵּה שׁוּב"])
    ]);
  }
  /* למרוץ ההתאמה: שני אריחים שאינם זוג */
  function pairHint(a, b) {
    return el("div", { class: "whywrong" }, [
      el("div", { class: "ww-row" }, [
        letterChip(a, "bad"), el("span", { class: "ww-vs" }, ["≠"]), letterChip(b, "bad")
      ]),
      el("p", { class: "ww-why" }, ["אֵלֶּה שְׁתֵּי אוֹתִיּוֹת שׁוֹנוֹת. " +
        (decisive(a) ? NAME(a) + " אוֹמֶרֶת: " + decisive(a) : "")]),
      el("b", { class: "retry" }, ["נַסֵּה שׁוּב"])
    ]);
  }
  /* הסבר לחידת מילה/שורה, שבהן האפשרויות אינן אותיות בודדות */
  function whyWrongText(chosenTxt, correctTxt, note) {
    return el("div", { class: "whywrong" }, [
      el("div", { class: "ww-row txt" }, [
        el("span", { class: "ww-chip bad" }, [rashi(chosenTxt)]),
        el("span", { class: "ww-vs" }, ["≠"]),
        el("span", { class: "ww-chip good" }, [rashi(correctTxt)])
      ]),
      note ? el("p", { class: "ww-why" }, [note]) : null,
      el("b", { class: "retry" }, ["נַסֵּה שׁוּב"])
    ]);
  }

  /* מעטפת אחידה לכל חידה: כותרת "חִידָה מס׳ X" + גוף */
  function riddleCard(kids, cls) {
    return el("div", { class: "riddle " + (cls || "") }, kids);
  }
  function clueLine(txt, n) {
    return el("div", { class: "clue" }, [
      el("span", { class: "clue-n" }, ["רֶמֶז " + n]),
      el("span", { class: "clue-t" }, [txt])
    ]);
  }
  function ask(txt) { return el("div", { class: "riddle-ask" }, [txt]); }

  function poolChars(name) {
    if (name === "easy") return window.easyLetters().map(l => l.c);
    if (name === "hard") return window.hardLetters().map(l => l.c);
    if (name === "down") return window.descenders();
    if (name === "all") return window.LETTERS.map(l => l.c);
    return window.LETTERS.map(l => l.c);
  }
  /* אותיות שיש להן קורפוס רמזים ושייכות לבריכה המבוקשת */
  function clued(poolName) {
    return poolChars(poolName).filter(c => (CLUES()[c] || {}).clues);
  }

  /* ============ 0. חִידַת הַפְּתִיחָה ============ */
  function open(game, world) {
    Games.frame(game, world, (body) => {
      const word = "שָׁלוֹם", plain = "שלום";
      body.appendChild(riddleCard([
        ask("הַמִּלָּה הַזֹּאת כְּתוּבָה בִּכְתָב רָשִׁ״י. כַּמָּה מֵהָאוֹתִיּוֹת שֶׁבָּהּ אַתָּה כְּבָר מְזַהֶה?"),
        el("div", { class: "hero-word" }, [rashi(word)])
      ]));
      const guessRow = el("div", { class: "guess-row" });
      body.appendChild(guessRow);
      [0, 1, 2, 3, 4].forEach(n => {
        guessRow.appendChild(el("button", { class: "guess-btn", onclick: () => reveal(n) }, [String(n)]));
      });
      const out = el("div", { class: "reveal-wrap" });
      body.appendChild(out);

      function reveal(guess) {
        guessRow.remove();
        out.appendChild(el("p", { class: "lead" }, ["נִבְדֹּק. אוֹת־אוֹת:"]));
        const row = el("div", { class: "reveal-row" });
        out.appendChild(row);
        const chars = plain.split("");
        let i = 0;
        const btn = el("button", { class: "btn primary big" }, ["🔦 חֲשֹׂף אוֹת"]);
        out.appendChild(btn);
        btn.addEventListener("click", () => {
          if (i < chars.length) {
            const c = chars[i];
            row.appendChild(el("div", { class: "reveal-cell pop" }, [
              rashi(c), el("i", {}, [square(c).innerHTML]), el("small", {}, [NAME(c)])
            ]));
            Audio2.sfx.tap(); Audio2.speak(NAME(c));
            i++;
            if (i === chars.length) btn.textContent = "אָז מָה הַתְּשׁוּבָה? ›";
          } else {
            out.appendChild(el("div", { class: "riddle-solve" }, [
              el("b", {}, ["כָּל אַרְבַּעְתָּן."]),
              el("p", {}, ["נִחַשְׁתָּ " + guess + ". הָאֱמֶת הִיא שֶׁ־18 מִתּוֹךְ 27 הַסִּימָנִים כִּמְעַט זֵהִים לַכְּתָב שֶׁאַתָּה קוֹרֵא כָּל יוֹם. נִשְׁאֲרוּ 9."]),
              el("p", { class: "dim" }, ["מִכָּאן וָהָלְאָה: כָּל אוֹת הִיא חִידָה. יֵשׁ רֶמֶז, וְאַתָּה מַסִּיק."])
            ]));
            btn.remove();
            setTimeout(() => Games.finish(game, world, 1, 1), 2200);
          }
        });
      }
    });
  }

  /* ============ 1. חִידַת סִימָן — האות מוצגת ============ */
  function sign(game, world) {
    const pool = clued(game.pool || "easy");
    const due = State.dueChars(pool);
    const order = shuffle([...new Set([...due, ...pool])]).slice(0, Q);
    const qs = order.map(c => {
      const cl = CLUES()[c].clues;
      const distract = shuffle(pool.filter(x => x !== c)).slice(0, 3);
      const options = shuffle([{ t: NAME(c), c, ok: true }, ...distract.map(x => ({ t: NAME(x), c: x, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(riddleCard([
            el("div", { class: "big-letter" }, [rashi(c)]),
            clueLine(cl[cl.length - 1], "מַכְרִיעַ"),
            ask("אָז מִי אֲנִי?")
          ]));
        },
        options: options.map(o => ({ node: el("span", { class: "name" }, [o.t]), ok: o.ok, c: o.c })),
        explain: (o) => whyWrong(o.c, c),
        onResult: (ok) => { if (ok) Audio2.speak(NAME(c)); State.recordResult(c, ok); }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 2. חִידַת אֶשְׁכּוֹל — בלי האות ============ */
  function family(game, world) {
    const fams = (window.FAMILIES || []).filter(f => f.chars.length >= 2);
    const list = shuffle(game.fams ? fams.filter(f => game.fams.includes(f.id)) : fams);
    const qs = [];
    for (let k = 0; k < Q; k++) {
      const f = list[k % list.length];
      const c = f.chars[Math.floor(Math.random() * f.chars.length)];
      const cl = CLUES()[c].clues;
      qs.push({
        prompt: (n) => {
          n.appendChild(riddleCard([
            el("div", { class: "fam-tag" }, [f.name]),
            clueLine(cl[1], "א׳"),
            clueLine(cl[2], "ב׳"),
            ask("אֵיזוֹ מֵהֶן אֲנִי?")
          ]));
        },
        options: shuffle(f.chars).map(x => ({
          node: el("div", { class: "big-letter sm" }, [rashi(x)]), ok: x === c, c: x
        })),
        explain: (o) => whyWrong(o.c, c),
        tip: "זוֹ " + NAME(c) + ".",
        onResult: (ok) => { State.recordResult(c, ok); if (ok) Audio2.speak(NAME(c)); }
      });
    }
    Games.runMC(game, world, qs);
  }

  /* ============ 3. הַבַּלָּשׁ — רמז אחר רמז ============ */
  /* כאן החידה אמיתית: מתחילים בלי כלום, וכל רמז עולה נקודות.
     5 נק׳ ברמז אחד · 3 בשניים · 1 בשלושה. */
  function detective(game, world) {
    const pool = clued(game.pool || "hard");
    const targets = pick(pool, Math.min(5, pool.length));
    let idx = 0, score = 0, over = false, ch = null;

    function end(won, why) {
      if (over) return; over = true; ch && ch.stop();
      Games.scoreCard(game, world, {
        won, why, ch, base: score,
        rows: [["חִידוֹת שֶׁפִּצַּחְתָּ", (won ? targets.length : idx) + "/" + targets.length],
               ["נְקֻדּוֹת רְמָזִים", score]]
      });
    }

    function step() {
      if (over) return;
      if (idx >= targets.length) return end(true);
      const c = targets[idx];
      const cl = CLUES()[c].clues;
      const fam = window.familyOf(c);
      // המסיחים: קודם מהאשכול, ואז ממאגר רחב — כדי שהרמז הראשון באמת יידרש
      const sameFam = (fam ? fam.chars : []).filter(x => x !== c);
      const others = shuffle(pool.filter(x => x !== c && sameFam.indexOf(x) < 0));
      const opts = shuffle([c, ...sameFam.slice(0, 2), ...others].slice(0, 4));
      let shown = 1, locked = false;

      Games.frame(game, world, (body) => {
        // השעון והפסילות נמשכים על פני כל חמש החידות, לא מתאפסים בכל אחת
        if (!ch) ch = Games.challenge(body, () => end(false, "נִגְמַר הַזְּמַן"));
        else body.appendChild(ch.hud);
        const head = el("div", { class: "det-head" }, [
          el("span", {}, ["חִידָה " + (idx + 1) + " מִתּוֹךְ " + targets.length]),
          el("span", { class: "det-worth" }, ["שָׁוָה עַכְשָׁו: ", el("b", {}, ["5"]), " ", el("i", { class: "pts-w" }, [pts(5)])])
        ]);
        const clues = el("div", { class: "clues" }, [clueLine(cl[0], "רִאשׁוֹן")]);
        const more = el("button", { class: "btn ghost more-clue", onclick: addClue }, ["🔍 עוֹד רֶמֶז (עוֹלֶה נְקֻדּוֹת)"]);
        const grid = el("div", { class: "det-opts" });
        const tip = el("div", { class: "tip" });
        opts.forEach(x => {
          const b = el("button", { class: "opt det-opt" }, [el("div", { class: "big-letter sm" }, [rashi(x)])]);
          b.addEventListener("click", () => choose(x, b));
          grid.appendChild(b);
        });
        body.appendChild(riddleCard([head, clues, more, ask("מִי אֲנִי?"), grid, tip], "det"));
        ch.start();

        function worth() { return shown === 1 ? 5 : shown === 2 ? 3 : 1; }
        function addClue() {
          if (locked || shown >= cl.length) return;
          clues.appendChild(clueLine(cl[shown], shown === 1 ? "שֵׁנִי" : "מַכְרִיעַ"));
          shown++;
          head.querySelector(".det-worth b").textContent = String(worth());
          head.querySelector(".pts-w").textContent = pts(worth());
          Audio2.sfx.tap();
          if (shown >= cl.length) more.remove();
        }
        function choose(x, btn) {
          if (over || btn.classList.contains("locked")) return;
          if (x === c) {
            locked = true;
            [...grid.children].forEach(n => n.classList.add("locked"));
            btn.classList.add("ok"); score += worth(); Audio2.sfx.correct(); Audio2.speak(NAME(c));
            tip.innerHTML = ""; tip.textContent = "כֵּן. זוֹ " + NAME(c) + ". +" + worth() + " " + pts(worth()) + ".";
            State.recordResult(c, true);
            setTimeout(() => { idx++; step(); }, 1100);
            return;
          }
          /* טעות בבלש לא מסיימת את התיק — מראים את ההבדל וממשיכים לנסות */
          btn.classList.add("bad", "locked"); Audio2.sfx.wrong();
          State.recordResult(c, false);
          tip.innerHTML = ""; tip.appendChild(whyWrong(x, c));
          if (ch.strike()) {
            locked = true;
            [...grid.children].forEach((n, i) => { n.classList.add("locked"); if (opts[i] === c) n.classList.add("ok"); });
            setTimeout(() => end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת"), 2400);
          }
        }
      });
    }
    step();
  }

  /* ============ 4. חִידַת מִלָּה — אות חסרה ============ */
  function word(game, world) {
    const lvls = game.lvl || [1, 2];
    const words = pick(window.WORDS.filter(w => lvls.includes(w.lvl) && w.p.length >= 3), Q);
    const qs = words.map(w => {
      const chars = w.p.split("");
      const hardIdx = chars.map((c, i) => i).filter(i => (CLUES()[chars[i]] || {}).clues);
      const idx = (hardIdx.length ? hardIdx : chars.map((c, i) => i))[Math.floor(Math.random() * (hardIdx.length || chars.length))];
      const answer = chars[idx];
      const cl = (CLUES()[answer] || {}).clues || [];
      const shown = chars.map((c, i) => i === idx ? '<b class="blank">◻</b>' : c).join("");
      const distract = pick(window.LETTERS.map(l => l.c).filter(c => c !== answer), 3);
      const options = shuffle([{ c: answer, ok: true }, ...distract.map(c => ({ c, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(riddleCard([
            el("div", { class: "big-word fill", html: '<span class="rashi">' + shown + "</span>" }),
            clueLine("הַמִּלָּה הַזֹּאת הִיא: " + w.m + ".", "הַמִּלָּה"),
            cl.length ? clueLine(cl[cl.length - 1], "הָאוֹת") : null,
            ask("אֵיזוֹ אוֹת נֶעֶלְמָה?")
          ]));
        },
        options: options.map(o => ({ node: el("div", { class: "big-letter sm" }, [rashi(o.c)]), ok: o.ok, c: o.c })),
        explain: (o) => whyWrong(o.c, answer),
        onResult: (ok) => { State.recordResult(answer, ok); if (ok) { Audio2.speak(w.t); UI.toast(w.t.replace(/[֑-ׇ]/g, "")); } }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 5. חִידַת שׁוּרָה — מילה חסרה בקטע רש״י ============ */
  function line(game, world) {
    const list = window.passagesByLevel(game.lvl || 5).filter(p => p.t.split(" ").length >= 4);
    const chosen = pick(list, Math.min(4, list.length));
    const qs = chosen.map(p => {
      const ws = p.t.split(" "), ps = p.plain.split(" ");
      const wi = 1 + Math.floor(Math.random() * (ws.length - 1));
      const answer = ws[wi];
      const masked = ws.map((x, i) => i === wi ? '<b class="blank">◻◻◻</b>' : x).join(" ");
      const distract = pick(window.PASSAGES.filter(x => x.id !== p.id).flatMap(x => x.t.split(" ")).filter(x => x.length > 2 && x !== answer), 3);
      const options = shuffle([{ t: answer, ok: true }, ...distract.map(t => ({ t, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(riddleCard([
            el("div", { class: "src" }, [p.src]),
            el("div", { class: "passage masked", html: '<span class="rashi">' + masked + "</span>" }),
            clueLine(p.tr, "מָה הַקֶּטַע אוֹמֵר"),
            ask("אֵיזוֹ מִלָּה נֶעֶלְמָה?")
          ]));
        },
        options: options.map(o => ({ node: el("span", { class: "wopt" }, [rashi(o.t)]), ok: o.ok, t: o.t })),
        explain: (o) => whyWrongText(o.t, answer, "לְפִי מָה שֶׁהַקֶּטַע אוֹמֵר: " + p.tr),
        onResult: (ok) => { if (ok) { Audio2.speak(ps[wi] || ""); State.award(4); } }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 6. חִידַת שֶׁטֶף — בלי רמזים ============ */
  function fluent(game, world) {
    const list = window.passagesByLevel(game.lvl || 6);
    const p = list[Math.floor(Math.random() * list.length)];
    let ch = null, over = false;
    Games.frame(game, world, (body) => {
      /* כאן השעון רץ כבר בזמן הקריאה. בעולם הזה המהירות היא כל העניין —
         שטף זה לא "לפענח בסוף", זה לקרוא. אותו שעון ממשיך לשאלה. */
      ch = Games.challenge(body, () => {
        if (over) return; over = true; ch.stop();
        Games.scoreCard(game, world, { won: false, why: "נִגְמַר הַזְּמַן", ch, base: 0,
          rows: [["הַקֶּטַע", p.src]] });
      });
      body.appendChild(riddleCard([
        el("div", { class: "src" }, [p.src]),
        ask("הַפַּעַם אֵין רְמָזִים. קְרָא, וְאָז עֲנֵה מָה כָּתוּב כָּאן."),
        el("div", { class: "passage" }, [rashi(p.t)])
      ]));
      body.appendChild(el("button", { class: "btn primary big", onclick: solve }, ["קָרָאתִי — לַחִידָה ›"]));
      ch.start();
    });

    function solve() {
      if (over) return;
      const others = shuffle(window.PASSAGES.filter(x => x.id !== p.id)).slice(0, 3);
      const options = shuffle([{ p, ok: true }, ...others.map(x => ({ p: x, ok: false }))]);
      Games.runMC(game, world, [{
        prompt: (n) => n.appendChild(riddleCard([
          el("div", { class: "passage sm" }, [rashi(p.t)]),
          ask("מָה הַקֶּטַע הַזֶּה אוֹמֵר?")
        ])),
        options: options.map(o => ({ node: el("span", { class: "tropt" }, [o.p.tr]), ok: o.ok })),
        onResult: (ok) => { if (ok) State.award(8); }
      }], ch);
    }
  }

  const TYPES = {
    "r-open": open, "r-sign": sign, "r-family": family, "r-detective": detective,
    "r-word": word, "r-line": line, "r-fluent": fluent
  };
  return { play: (g, w) => (TYPES[g.type] || sign)(g, w), TYPES, whyWrong, pairHint, whyWrongText };
})();
