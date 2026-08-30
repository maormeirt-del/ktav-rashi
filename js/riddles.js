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
  /* ההסבר חייב לענות על "לָמָּה לֹא מָה שֶׁבָּחַרְתִּי" — ולכן הוא מציג
     את הסימן של *שתי* האותיות זו מול זו, לא מדקלם את הנכונה בלבד.
     בלי זה נוצר אבסורד: בוחרים ש, ומקבלים הסבר על ההבדל בין ב ל-כ. */
  function whyWrong(chosen, correct) {
    const sc = window.shortOf(chosen), st = window.shortOf(correct);
    return el("div", { class: "whywrong" }, [
      el("div", { class: "ww-row" }, [
        letterChip(chosen, "bad"), el("span", { class: "ww-vs" }, ["≠"]), letterChip(correct, "good")
      ]),
      el("div", { class: "ww-cmp" }, [
        sc ? el("div", { class: "cmp bad" }, [el("b", {}, [NAME(chosen)]), el("span", {}, [sc])]) : null,
        st ? el("div", { class: "cmp good" }, [el("b", {}, [NAME(correct)]), el("span", {}, [st])]) : null
      ]),
      el("b", { class: "retry" }, ["נַסֵּה שׁוּב"])
    ]);
  }
  /* למרוץ ההתאמה: שני אריחים שאינם זוג */
  function pairHint(a, b) {
    return el("div", { class: "whywrong" }, [
      el("div", { class: "ww-row" }, [
        letterChip(a, "bad"), el("span", { class: "ww-vs" }, ["≠"]), letterChip(b, "bad")
      ]),
      el("div", { class: "ww-cmp" }, [
        el("div", { class: "cmp bad" }, [el("b", {}, [NAME(a)]), el("span", {}, [window.shortOf(a)])]),
        el("div", { class: "cmp bad" }, [el("b", {}, [NAME(b)]), el("span", {}, [window.shortOf(b)])])
      ]),
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


  /* ===========================================================
     מַסִּיחִים שֶׁמַּכְרִיחִים לְפַעֲנֵחַ.
     מסיח שנשלף מקטע אחר נפסל במשמעות: מספיק להבין את התרגום
     ולבחור את מה שמתאים, בלי להסתכל על אף גליף. מסיח שנבדל
     מהתשובה באות אחת — ד/ר, ב/כ, ס/ם — אי אפשר לפסול בלי לקרוא.
     =========================================================== */
  const CONS = /[\u05D0-\u05EA]/;
  const FINALS = "ךםןףץ";
  const NO_DAGESH = "אהחער";
  function consIdx(w) { const a = []; for (let i = 0; i < w.length; i++) if (CONS.test(w[i])) a.push(i); return a; }
  function swapAt(w, i, t) {
    let rest = w.slice(i + 1);
    /* דגש אחרי א/ה/ח/ע/ר הוא צורה שלא קיימת — משמיטים אותו,
       אחרת המסיח מסגיר את עצמו כזיוף לפני שקוראים אותו. */
    if (NO_DAGESH.indexOf(t) > -1 && rest[0] === "\u05BC") rest = rest.slice(1);
    return w.slice(0, i) + t + rest;
  }
  /* מחזיר עד n גרסאות של המילה שנבדלות ממנה באות אחת */
  function twinVariants(w, n, banned) {
    const out = [], ban = new Set(banned || []);
    const idxs = consIdx(w); if (!idxs.length) return out;
    const lastC = idxs[idxs.length - 1];
    shuffle(idxs).forEach(i => {
      shuffle(window.twinsOf(w[i])).forEach(t => {
        if (out.length >= n) return;
        // חוק האות הסופית: ם באמצע מילה נפסלת בלי להסתכל על הצורה
        if (FINALS.indexOf(t) > -1 && i !== lastC) return;
        if (FINALS.indexOf(w[i]) > -1 && i === lastC && FINALS.indexOf(t) < 0) return;
        const v = swapAt(w, i, t);
        if (v === w || ban.has(v) || out.indexOf(v) > -1) return;
        out.push(v);
      });
    });
    return out.slice(0, n);
  }
  /* האות שבה נבדלות שתי מחרוזות באותו אורך — לצורך ההסבר */
  function diffLetter(a, b) {
    const ca = a.split("").filter(x => CONS.test(x)), cb = b.split("").filter(x => CONS.test(x));
    if (ca.length !== cb.length) return null;
    for (let i = 0; i < ca.length; i++) if (ca[i] !== cb[i]) return [ca[i], cb[i]];
    return null;
  }

  /* מעטפת אחידה לכל חידה: כותרת "חִידָה מס׳ X" + גוף */
  function riddleCard(kids, cls) {
    return el("div", { class: "riddle " + (cls || "") }, kids);
  }
  function clueLine(txt, n) {
    return el("div", { class: "clue" }, [
      n ? el("span", { class: "clue-n" }, ["רֶמֶז " + n]) : null,
      el("span", { class: "clue-t" }, [txt])
    ]);
  }
  /* הרמז הקצר — שורה אחת, בלי תווית, בלי "מי אני?". זה כל מה
     שהתלמיד קורא בתרגול. הנוסח המלא שמור לרגע הטעות. */
  function hint(c) { return el("div", { class: "hint-chip" }, [window.shortOf(c)]); }
  function ask(txt) { return el("div", { class: "riddle-ask" }, [txt]); }
  /* דרגת הניקוד היא חלק מהמשימה, ולכן היא כתובה על המסך */
  const nikOf = (game) => game.nik || "full";
  function nikTag(game) {
    const n = nikOf(game);
    return n === "full" ? null : el("span", { class: "nik-tag " + n }, [window.NIK_LABEL[n]]);
  }

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
            hint(c)
          ], "tight"));
        },
        options: options.map(o => ({ node: el("span", { class: "name" }, [o.t]), ok: o.ok, c: o.c })),
        explain: (o) => whyWrong(o.c, c),
        onResult: (ok) => { if (ok) Audio2.speak(NAME(c)); State.recordResult(c, ok); }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 2. חִידַת אֶשְׁכּוֹל — בלי האות ============ */

  /* --- רֶגַע לִמּוּד: כרטיס היכרות לפני האשכול, בלי שעון ---
     עד היום challenge() נקראה בכל משימה חוץ מ-w0, כלומר לא היה
     באפליקציה אף מסך שבו רואים אות חדשה בלי שעון שרץ. זה המסך. */
  function learnCard(fams, onDone) {
    const wrap = el("div", { class: "learn" });
    fams.forEach(f => {
      wrap.appendChild(el("div", { class: "learn-fam" + (f.boss ? " boss" : "") }, [
        el("div", { class: "lf-name" }, [f.name]),
        f.ask ? el("p", { class: "lf-ask" }, [f.ask]) : null
      ]));
      const row = el("div", { class: "learn-row n" + f.chars.length });
      f.chars.forEach(c => {
        const L = window.LETTER_BY_CHAR[c] || {};
        row.appendChild(el("button", { class: "learn-cell", onclick: () => Audio2.speak(NAME(c)) }, [
          el("div", { class: "lc-glyph" }, [rashi(c)]),
          el("div", { class: "lc-sq" }, [square(c)]),
          el("b", {}, [L.name || c]),
          el("small", {}, [window.shortOf(c) || ""])
        ]));
      });
      wrap.appendChild(row);
      if (f.rule) wrap.appendChild(el("div", { class: "learn-rule" }, [el("span", {}, ["הַכְּלָל"]), f.rule]));
    });
    wrap.appendChild(el("button", { class: "btn primary big", onclick: onDone }, ["הֵבַנְתִּי — לַתַּרְגּוּל ›"]));
    return wrap;
  }

  function family(game, world) {
    const fams = (window.FAMILIES || []).filter(f => f.chars.length >= 2);
    const list = shuffle(game.fams ? fams.filter(f => game.fams.includes(f.id)) : fams);
    const shown = game.fams ? fams.filter(f => game.fams.includes(f.id)) : [];

    function run() {
      const qs = [];
      for (let k = 0; k < Q; k++) {
        const f = list[k % list.length];
        const c = f.chars[Math.floor(Math.random() * f.chars.length)];
        qs.push({
          prompt: (n) => {
            n.appendChild(riddleCard([
              el("div", { class: "fam-tag" }, [f.name]),
              hint(c)
            ], "tight"));
          },
          options: shuffle(f.chars).map(x => ({
            node: el("div", { class: "big-letter sm" }, [rashi(x)]), ok: x === c, c: x
          })),
          explain: (o) => whyWrong(o.c, c),
          tip: "זוֹ " + NAME(c) + ".",
          onShown: () => Audio2.speak(NAME(c)),
          onResult: (ok) => { State.recordResult(c, ok); if (ok) Audio2.speak(NAME(c)); }
        });
      }
      Games.runMC(game, world, qs);
    }

    if (!shown.length) return run();
    Games.frame(game, world, (body) => body.appendChild(learnCard(shown, run)));
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
        if (!ch) ch = Games.challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
          { tries: Games.triesFor(game, world), limit: game.limit });
        else body.appendChild(ch.hud);
        const head = el("div", { class: "det-head" }, [
          el("span", {}, ["חִידָה " + (idx + 1) + " מִתּוֹךְ " + targets.length]),
          el("span", { class: "det-worth" }, ["שָׁוָה עַכְשָׁו: ", el("b", {}, ["5"]), " ", el("i", { class: "pts-w" }, [pts(5)])])
        ]);
        /* קצר → קצר → מלא. הרמז הראשון רק ממקם באשכול, השני הוא
           הסימן בשתי מילים, ורק השלישי מסביר בנוסח מלא. */
        const ladder = [fam ? fam.name : cl[0], window.shortOf(c), cl[cl.length - 1]];
        const clues = el("div", { class: "clues" }, [clueLine(ladder[0], "")]);
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
          if (locked || shown >= ladder.length) return;
          clues.appendChild(clueLine(ladder[shown], ""));
          shown++;
          head.querySelector(".det-worth b").textContent = String(worth());
          head.querySelector(".pts-w").textContent = pts(worth());
          Audio2.sfx.tap();
          if (shown >= ladder.length) more.remove();
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
      /* שלושה סינונים על המסיחים, בסדר הזה:
         1. אסור ליצור מילה אמיתית אחרת — אחרת יש שתי תשובות נכונות
            ("תּוֹרָה" בלי ת מקבלת גם מ, כי "מוֹרֶה" קיימת).
         2. אסור להפר את חוק האות הסופית — ם באמצע מילה היא לא מסיח,
            היא מתנה: התלמיד פוסל אותה בלי להסתכל על הצורה בכלל.
         3. עדיפות לאותיות מאותו אשכול — מסיח אקראי לא מלמד כלום,
            מסיח מבלבל מאמן בדיוק את ההבחנה שקשה. */
      const WORDSET = new Set(window.WORDS.map(x => x.p));
      const FINALS = "ךםןףץ";
      const last = idx === w.p.length - 1 || w.p[idx + 1] === " ";
      const legal = window.LETTERS.map(l => l.c).filter(c => {
        if (c === answer) return false;
        if (FINALS.indexOf(c) > -1 && !last) return false;          // סופית לא באמצע
        const alt = w.p.slice(0, idx) + c + w.p.slice(idx + 1);
        return !WORDSET.has(alt);
      });
      const famChars = (window.familyOf(answer) || { chars: [] }).chars.filter(c => legal.includes(c));
      const rest = legal.filter(c => !famChars.includes(c));
      const distract = [...shuffle(famChars), ...shuffle(rest)].slice(0, 3);
      const options = shuffle([{ c: answer, ok: true }, ...distract.map(c => ({ c, ok: false }))]);
      return {
        prompt: (n) => {
          n.appendChild(riddleCard([
            el("div", { class: "big-word fill", html: '<span class="rashi">' + shown + "</span>" }),
            el("div", { class: "hint-chip" }, [w.m])
          ], "tight"));
        },
        options: options.map(o => ({ node: el("div", { class: "big-letter sm" }, [rashi(o.c)]), ok: o.ok, c: o.c })),
        explain: (o) => whyWrong(o.c, answer),
        onResult: (ok) => { State.recordResult(answer, ok); if (ok) { Audio2.speak(w.t); UI.toast(w.t.replace(/[֑-ׇ]/g, "")); } }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 4ב. קְרִיאַת מִלָּה שְׁלֵמָה ============
     w4 שאל "איזו אות חסרה", w6 שאל "מה זה אומר" — ואף משימה לא
     שאלה את השאלה הפשוטה: המילה הזאת בכתב רש״י, מה היא?
     בלי רמז משמעות. ההקראה מגיעה אחרי התשובה, לא לפניה. */
  function readword(game, world) {
    const lvls = game.lvl || [1, 2];
    const pool = window.WORDS.filter(w => lvls.includes(w.lvl));
    const words = pick(pool, Math.min(Q, pool.length));
    const nik = nikOf(game);
    const qs = words.map(w => {
      const T = window.applyNik(w.t, nik);
      const twins = twinVariants(T, 2, [T]);
      const near = shuffle(pool.filter(x => x.p !== w.p)).map(x => window.applyNik(x.t, nik));
      const distract = [...twins, ...near].slice(0, 3);
      const options = shuffle([{ t: T, ok: true }, ...distract.map(t => ({ t, ok: false }))]);
      return {
        prompt: (n) => n.appendChild(riddleCard([
          el("div", { class: "big-word" }, [rashi(T)]),
          ask("אֵיזוֹ מִלָּה זֹאת?"), nikTag(game)
        ], "tight")),
        options: options.map(o => ({
          node: el("span", { class: "sqword" }, [square(window.stripNikud(o.t))]), ok: o.ok, t: o.t })),
        explain: (o) => {
          const d = diffLetter(o.t, T);
          return whyWrongText(o.t, T, d
            ? "אוֹת אַחַת: בָּחַרְתָּ " + NAME(d[0]) + ", וְצָרִיךְ " + NAME(d[1]) + ". " + (window.shortOf(d[1]) || "")
            : null);
        },
        onShown: () => Audio2.speak(w.t),
        onResult: (ok) => { State.recordResult("word:" + w.p, ok, 3); if (ok) Audio2.speak(w.t); }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 5. חִידַת שׁוּרָה — מילה חסרה בקטע רש״י ============
     המסיחים באים **מתוך הקטע עצמו**: קודם זוגות מינימליים של המילה
     החסרה, ואז מילים אחרות מאותו קטע. כך התרגום נשאר הקשר, ולא פתרון. */
  /* כל משימה שיש בה טקסט אמיתי עוברת דרך קריאה בקול: הטקסט, הקלטה,
     ואז השאלות. זו הצורה של "אותיות של אור" — קוראים, שומעים את
     עצמך, ורק אז נשאלים. הדילוג קיים תמיד. */
  function readAloudThen(game, world, passage, ch, host, onDone) {
    host.appendChild(el("div", { class: "rec-lead" }, ["קְרָא אֶת הַקֶּטַע בְּקוֹל, וְאָז נִשְׁאַל עָלָיו."]));
    host.appendChild(recordBlock(passage, (m) => { if (m) game._reading = m; onDone(); }));
  }

  function line(game, world) {
    /* קטע אחד, לא ארבעה. קוראים אותו בקול, מקליטים, ואז נשאלים
       שלוש שאלות עליו — כמו שסיפור ב"אותיות של אור" עובד. */
    const list = window.passagesByLevel(game.lvl || 5).filter(p => p.t.split(" ").length >= 5);
    const p = list[Math.floor(Math.random() * list.length)];
    let ch = null, over = false;

    Games.frame(game, world, (body) => {
      ch = Games.challenge(body, () => {
        if (over) return; over = true; ch.stop();
        Games.scoreCard(game, world, { won: false, why: "נִגְמַר הַזְּמַן", ch, base: 0,
          rows: [["הַקֶּטַע", p.src]] });
      }, { tries: Games.triesFor(game, world), limit: game.limit, peek: true });
      body.appendChild(riddleCard([
        el("div", { class: "src" }, [p.src, nikTag(game)]),
        el("div", { class: "passage" }, [rashi(window.applyNik(p.t, nikOf(game)))]),
        el("div", { class: "hint-chip wrap" }, [p.tr])
      ]));
      readAloudThen(game, world, p, ch, body, ask3);
      ch.start();
    });

    function ask3() {
      if (over) return;
      const ws = window.applyNik(p.t, nikOf(game)).split(" "), ps = p.plain.split(" ");
      const idxs = ws.map((w, i) => i).filter(i =>
        i > 0 && ws[i].replace(/[\u0591-\u05C7]/g, "").length >= 3);
      const qs = pick(idxs, Math.min(3, idxs.length)).map(wi => {
        const answer = ws[wi];
        const masked = ws.map((x, i) => i === wi ? '<b class="blank">◻◻◻</b>' : x).join(" ");
        const own = ws.filter((x, i) => i !== wi && x.length > 2 && x !== answer);
        const twins = twinVariants(answer, 2, ws);
        const distract = [...twins, ...shuffle(own)].slice(0, 3);
        const options = shuffle([{ t: answer, ok: true }, ...distract.map(t => ({ t, ok: false }))]);
        const key = "word:" + (ps[wi] || answer).replace(/[\u0591-\u05C7]/g, "");
        return {
          prompt: (n) => {
            n.appendChild(riddleCard([
              el("div", { class: "passage masked", html: '<span class="rashi">' + masked + "</span>" }),
              el("div", { class: "hint-chip" }, ["אֵיזוֹ מִלָּה חֲסֵרָה?"])
            ], "tight"));
          },
          options: options.map(o => ({ node: el("span", { class: "wopt" }, [rashi(o.t)]), ok: o.ok, t: o.t })),
          explain: (o) => {
            const d = diffLetter(o.t, answer);
            return whyWrongText(o.t, answer, d
              ? "הַהֶבְדֵּל הוּא אוֹת אַחַת: בָּחַרְתָּ " + NAME(d[0]) + ", וְצָרִיךְ " + NAME(d[1]) + ". " + (window.shortOf(d[1]) || "")
              : "לְפִי מָה שֶׁהַקֶּטַע אוֹמֵר: " + p.tr);
          },
          onResult: (ok) => { if (ok) Audio2.speak(ps[wi] || ""); State.recordResult(key, ok, 4); }
        };
      });
      Games.runMC(game, world, qs, ch);
    }
  }


  /* ===========================================================
     הַקְלָטַת הַקְּרִיאָה — עולם "בלי רמזים" בלבד.
     "קראתי" הוא הצהרה שאי אפשר לבדוק. שטף נמדד בקריאה בקול,
     ולכן כאן הנער קורא, שומע את עצמו, ורואה מדד קצב אמיתי.

     ⚠️ פרטיות: ההקלטה נשארת blob מקומי בזיכרון הדפדפן.
     היא לא נשלחת לשום מקום ולא נשמרת. זה קולו של קטין.
     המיקרופון משוחרר מיד בסיום (stop על כל track).
     =========================================================== */
  function canRecord() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }
  function recordBlock(passage, onDone) {
    const words = passage.plain.trim().split(/\s+/).length;
    const wrap = el("div", { class: "rec-wrap" });
    const box = el("div", { class: "rec-box" });
    const play = el("div", { class: "rec-play" });
    const note = el("div", { class: "rec-err" });
    const timer = el("div", { class: "rec-time" });
    const btn = el("button", { class: "btn primary big" }, ["🔴 הַתְחֵל הַקְלָטָה"]);
    const skip = el("button", { class: "btn ghost", onclick: () => finishUp(null) }, ["דַּלֵּג ←"]);
    box.appendChild(btn); box.appendChild(timer); box.appendChild(note); box.appendChild(play);
    wrap.appendChild(box); wrap.appendChild(skip);

    let rec = null, stream = null, chunks = [], url = null, t0 = 0;
    let recording = false, busy = false, tick = null, finalized = false;

    function finishUp(m) {
      cleanup();
      if (url) URL.revokeObjectURL(url);
      onDone(m);
    }
    function cleanup() {
      if (tick) { clearInterval(tick); tick = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    }
    function fail(msg) {
      cleanup(); recording = false; busy = false;
      btn.classList.remove("recording");
      btn.textContent = "🔴 נַסֵּה שׁוּב";
      timer.textContent = "";
      /* שורה קבועה על המסך, לא רק toast חולף: אם ההודעה נעלמת
         הלומד רואה "לחצתי ולא קרה כלום" ולא מבין למה. */
      note.textContent = msg;
    }
    if (!canRecord()) {
      btn.disabled = true; btn.textContent = "🎙️ אֵין הַקְלָטָה בַּדַּפְדְּפָן הַזֶּה";
      skip.className = "btn primary big"; skip.textContent = "קָרָאתִי — לַחִידָה ›";
      return wrap;
    }

    btn.addEventListener("click", () => {
      if (busy) return;                    // מונע לחיצה כפולה בזמן בקשת ההרשאה
      recording ? stop() : start();
    });

    async function start() {
      busy = true; note.textContent = ""; play.innerHTML = "";
      btn.textContent = "מְבַקֵּשׁ גִּישָׁה לַמִּיקְרוֹפוֹן…";
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) {
        return fail(e && e.name === "NotAllowedError"
          ? "הַגִּישָׁה לַמִּיקְרוֹפוֹן נֶחְסְמָה. אַפְשֵׁר אוֹתָהּ בְּהַגְדָּרוֹת הַדַּפְדְּפָן."
          : "לֹא נִמְצָא מִיקְרוֹפוֹן (" + ((e && e.name) || "שְׁגִיאָה") + ").");
      }
      chunks = []; finalized = false;
      /* ספארי לא תומך ב-webm. mp4 נבדק ראשון כי הוא מה שעובד באייפון. */
      let opts = {};
      if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
        const t = ["audio/mp4", "audio/webm", "audio/ogg"].find(x => MediaRecorder.isTypeSupported(x));
        if (t) opts = { mimeType: t };
      }
      try { rec = new MediaRecorder(stream, opts); }
      catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { return fail("הַדַּפְדְּפָן לֹא מְאַפְשֵׁר הַקְלָטָה כָּאן."); } }

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
        /* מסיימים על פרוסת הנתונים האחרונה ולא על onstop:
           בספארי onstop יורה לפעמים לפני שהנתונים הגיעו, והקובץ יוצא ריק. */
        if (!recording && !finalized) { finalized = true; done(); }
      };
      rec.onerror = () => fail("הַהַקְלָטָה נִכְשְׁלָה. נַסֵּה שׁוּב.");
      rec.onstop = () => {
        /* רשת ביטחון: אם לא הגיעה פרוסה אחרונה תוך חצי שנייה, מסיימים בכל זאת */
        setTimeout(() => { if (!finalized) { finalized = true; done(); } }, 500);
      };
      rec.start(500);                       // פרוסות של חצי שנייה — הנתונים נצברים תוך כדי
      recording = true; busy = false; t0 = performance.now();
      btn.textContent = "⏹️ עֲצֹר";
      btn.classList.add("recording");
      tick = setInterval(() => {
        timer.textContent = "🔴 מַקְלִיט · " + ((performance.now() - t0) / 1000).toFixed(1) + " שְׁנִיּוֹת";
      }, 100);
    }

    function stop() {
      if (!rec || !recording) return;
      recording = false;
      if (tick) { clearInterval(tick); tick = null; }
      try { rec.requestData && rec.requestData(); } catch (e) {}
      try { rec.stop(); } catch (e) { fail("לֹא נִתָּן לַעֲצֹר אֶת הַהַקְלָטָה."); }
    }

    function done() {
      const secs = (performance.now() - t0) / 1000;
      cleanup();
      btn.textContent = "🔴 הַקְלֵט שׁוּב";
      btn.classList.remove("recording");
      timer.textContent = "";
      const blob = new Blob(chunks, { type: (chunks[0] && chunks[0].type) || "audio/webm" });
      if (!blob.size) return fail("הַהַקְלָטָה יָצְאָה רֵיקָה. בְּדֹק שֶׁהַמִּיקְרוֹפוֹן לֹא מֻשְׁתָּק וְנַסֵּה שׁוּב.");
      note.textContent = "";
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      const wpm = secs > 0 ? Math.round(words / (secs / 60)) : 0;
      play.innerHTML = "";
      play.appendChild(el("audio", { controls: "", src: url }));
      play.appendChild(el("div", { class: "rec-stat" }, [
        el("b", {}, [wpm + " מִלִּים לְדַקָּה"]),
        el("span", {}, [secs.toFixed(1) + " שְׁנִיּוֹת · " + words + " מִלִּים"])
      ]));
      play.appendChild(el("p", { class: "rec-note" }, ["הַהַקְלָטָה נִשְׁאֶרֶת אֶצְלְךָ בִּלְבַד וְאֵינָהּ נִשְׁמֶרֶת."]));
      play.appendChild(el("button", { class: "btn primary", onclick: () =>
        finishUp({ secs: secs, wpm: wpm, words: words }) }, ["הַמְשֵׁךְ ←"]));
    }
    return wrap;
  }

  /* ============ 6. חִידַת שֶׁטֶף — בלי רמזים ============
     השאלה בסוף היא על **מילה מתוך הקטע**, לא על תרגום הקטע כולו.
     ארבעה תרגומים של ארבעה קטעים שונים נפתרים בהתאמת משמעות;
     מילה אחת מול שלוש תאומות שלה נפתרת רק בקריאה. */
  function fluent(game, world) {
    const list = window.passagesByLevel(game.lvl || 6);
    const p = list[Math.floor(Math.random() * list.length)];
    let ch = null, over = false, reading = null;
    Games.frame(game, world, (body) => {
      /* כאן השעון רץ כבר בזמן הקריאה. בעולם הזה המהירות היא כל העניין —
         שטף זה לא "לפענח בסוף", זה לקרוא. אותו שעון ממשיך לשאלה. */
      ch = Games.challenge(body, () => {
        if (over) return; over = true; ch.stop();
        Games.scoreCard(game, world, { won: false, why: "נִגְמַר הַזְּמַן", ch, base: 0,
          rows: [["הַקֶּטַע", p.src]] });
      }, { tries: Games.triesFor(game, world), limit: game.limit, peek: true });
      body.appendChild(riddleCard([
        el("div", { class: "src" }, [p.src, nikTag(game)]),
        el("div", { class: "passage" }, [rashi(window.applyNik(p.t, nikOf(game)))])
      ]));
      body.appendChild(recordBlock(p, (m) => { reading = m; solve(); }));
      ch.start();
    });

    function solve() {
      if (over) return;
      const ws = window.applyNik(p.t, nikOf(game)).split(" "), ps = p.plain.split(" ");
      const idxs = ws.map((w, i) => i).filter(i => ws[i].replace(/[\u0591-\u05C7]/g, "").length >= 3);
      const qs = pick(idxs, Math.min(3, idxs.length)).map(wi => {
        const answer = ws[wi], plain = (ps[wi] || answer).replace(/[\u0591-\u05C7]/g, "");
        const twins = twinVariants(answer, 2, ws);
        const own = ws.filter((x, i) => i !== wi && x.length > 2);
        const distract = [...twins, ...shuffle(own)].slice(0, 3);
        const options = shuffle([{ t: answer, ok: true }, ...distract.map(t => ({ t, ok: false }))]);
        const sq = (t) => UI.square(window.stripNikud(t));
        return {
          prompt: (n) => n.appendChild(riddleCard([
            el("div", { class: "big-word" }, [rashi(answer)]),
            ask("אֵיזוֹ מִלָּה זֹאת?")
          ], "tight")),
          options: options.map(o => ({ node: el("span", { class: "sqword" }, [sq(o.t)]), ok: o.ok, t: o.t })),
          explain: (o) => {
            const d = diffLetter(o.t, answer);
            return whyWrongText(o.t, answer, d
              ? "אוֹת אַחַת: בָּחַרְתָּ " + NAME(d[0]) + ", וְצָרִיךְ " + NAME(d[1]) + ". " + (window.shortOf(d[1]) || "")
              : null);
          },
          onResult: (ok) => { if (ok) Audio2.speak(plain); State.recordResult("word:" + plain, ok, 6); }
        };
      });
      /* מדד הקצב עובר לכרטיס הסיום — אחרת ההקלטה היא חוויה ולא מדידה */
      if (reading) game._reading = reading;
      Games.runMC(game, world, qs, ch);
    }
  }

  /* ============ 7. רֶשֶׁת הַהַבְחָנָה — התרגול החתום של החוברת ============
     "הַקֵּף כָּל צָדִ״י. סְפֹר." הלומד סורק רשת של אותיות מבלבלות
     ומסמן את כל המופעים של אות אחת. זה לא רב-ברירה: זו שליפה
     תחת לחץ, וזה בדיוק מה שקורה בעין על דף גמרא.
     מדד אישי בלבד — כמה מצאת מתוך כמה שיש, ובכמה זמן. */
  function grid(game, world) {
    const fam = window.familyById(game.fam) || window.FAMILIES[0];
    const pool = fam.chars;
    const target = game.target || pool[Math.floor(Math.random() * pool.length)];
    const N = game.cells || 44;
    /* בין רבע לשליש מהתאים הם המטרה — מספיק כדי שיהיה מה למצוא,
       לא כל כך הרבה שאפשר לסמן הכול בעיוורון */
    const hits = Math.max(6, Math.round(N * (0.22 + Math.random() * 0.1)));
    const cells = shuffle([].concat(
      Array.from({ length: hits }, () => target),
      Array.from({ length: N - hits }, (_, i) => pool.filter(c => c !== target)[i % (pool.length - 1)])
    ));
    let found = 0, over = false, ch = null;

    Games.frame(game, world, (body) => {
      ch = Games.challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
        { pairs: hits, tries: Games.triesFor(game, world), limit: game.limit });
      body.appendChild(riddleCard([
        el("div", { class: "task-line" }, [
          el("b", {}, ["סַמֵּן כָּל "]), rashi(target),
          el("span", {}, [" · " + NAME(target) + " · יֵשׁ " + hits])
        ]),
        el("div", { class: "hint-chip" }, [window.shortOf(target)])
      ], "tight"));
      const status = el("div", { class: "tip" });
      body.appendChild(status);
      const g = el("div", { class: "scan-grid" });
      cells.forEach(c => {
        const b = el("button", { class: "scan-cell" }, [rashi(c)]);
        b.addEventListener("click", () => tap(c, b));
        g.appendChild(b);
      });
      body.appendChild(g);
      ch.start();

      function tap(c, btn) {
        if (over || btn.classList.contains("done")) return;
        if (c === target) {
          btn.classList.add("done", "hit"); Audio2.sfx.correct();
          found++; ch.paint(found); State.recordResult(target, true);
          status.innerHTML = "";
          if (found === hits) return end(true);
        } else {
          btn.classList.add("done", "miss"); Audio2.sfx.wrong();
          State.recordResult(c, false);
          status.innerHTML = ""; status.appendChild(whyWrong(c, target));
          if (ch.strike()) return end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת");
        }
      }
      function end(won, why) {
        if (over) return; over = true; ch.stop();
        Games.scoreCard(game, world, { won, why, ch, base: won ? 20 : found * 2,
          rows: [["מָצָאתָ", found + " מִתּוֹךְ " + hits]] });
      }
    });
  }

  /* ============ 8. הַהַפְתָּעָה — למידה מחוויה ============
     הרשת נראית כמו עוד תרגיל ס/ם. היא לא: כשמסמנים נכון את כל
     הסמ״כים מתגלה מגן דוד. הלומד לא "לומד" את ההבדל — הוא רואה
     אותו קורה. טעות אחת שוברת את הצורה, וזה כל הרעיון. */
  const STAR = [
    "000000010000000", "000000101000000", "000000101000000", "011111111111110",
    "001010000010100", "001010000010100", "000100000001000", "001010000010100",
    "001010000010100", "011111111111110", "000000101000000", "000000101000000",
    "000000010000000"
  ];
  function star(game, world) {
    const rows = STAR.map(r => r.split(""));
    const total = rows.flat().filter(v => v === "1").length;
    let found = 0, over = false, ch = null;

    Games.frame(game, world, (body) => {
      ch = Games.challenge(body, () => end(false, "נִגְמַר הַזְּמַן"),
        { pairs: total, tries: Games.triesFor(game, world), limit: game.limit });
      body.appendChild(riddleCard([
        el("div", { class: "task-line" }, [
          el("b", {}, ["סַמֵּן כָּל "]), rashi("ס"),
          el("span", {}, [" · יֵשׁ " + total + " · מֻחְבֵּאת כָּאן צוּרָה"])
        ]),
        el("div", { class: "hint-chip" }, [window.shortOf("ס")])
      ], "tight"));
      const status = el("div", { class: "tip" });
      body.appendChild(status);
      const g = el("div", { class: "star-grid" });
      rows.forEach(row => row.forEach(v => {
        const c = v === "1" ? "ס" : "ם";
        const b = el("button", { class: "star-cell" }, [rashi(c)]);
        b.addEventListener("click", () => tap(c, b));
        g.appendChild(b);
      }));
      body.appendChild(g);
      ch.start();

      function tap(c, btn) {
        if (over || btn.classList.contains("done")) return;
        if (c === "ס") {
          btn.classList.add("done", "lit"); Audio2.sfx.correct();
          found++; ch.paint(found); State.recordResult("ס", true);
          status.innerHTML = "";
          if (found === total) { UI.burst(["✡️", "✨", "🌟"]); return setTimeout(() => end(true), 900); }
        } else {
          btn.classList.add("done", "miss"); Audio2.sfx.wrong();
          State.recordResult("ם", false);
          status.innerHTML = ""; status.appendChild(whyWrong("ם", "ס"));
          if (ch.strike()) return end(false, "נִגְמְרוּ הַנִּסְיוֹנוֹת");
        }
      }
      function end(won, why) {
        if (over) return; over = true; ch.stop();
        Games.scoreCard(game, world, { won, why, ch, base: won ? 30 : found,
          rows: [["סָמֶ״כִים", found + " מִתּוֹךְ " + total],
                 ["הַצּוּרָה", won ? "מָגֵן דָּוִד ✡️" : "לֹא הִתְגַּלְּתָה"]] });
      }
    });
  }

  /* ============ 9. הַחֹמֶר הַסָּמוּי — ראשי תיבות ============
     החוסם האמיתי. אפשר להכיר כל אות ועדיין להיתקע על ת״ל. */
  function abbrev(game, world) {
    const set = window.abbrevSet(game.set || "abbr");
    const all = window.allAbbrev();
    /* ת״ל · ה״ג · קס״ד הם החסם האמיתי בגמרא. עד היום הם נשאלו פעם
       אחת ולא חזרו לעולם, כי מנוע החזרה קיבל רק תווי אות. עכשיו יש
       להם מפתח משלהם, והם חוזרים כמו כל אות קשה. */
    const keyOf = (a) => "abbr:" + a.f;
    const due = State.dueChars(set.map(keyOf));
    const byKey = set.reduce((m, a) => (m[keyOf(a)] = a, m), {});
    const items = [...new Set([...due.map(k => byKey[k]), ...shuffle(set)])].slice(0, Math.min(Q, set.length));
    const qs = items.map(a => {
      const distract = pick(all.filter(x => x.e !== a.e), 3);
      const options = shuffle([{ a, ok: true }, ...distract.map(x => ({ a: x, ok: false }))]);
      return {
        prompt: (n) => n.appendChild(riddleCard([
          el("div", { class: "abbr-big" }, [rashi(a.f)]),
          a.n ? el("div", { class: "hint-chip" }, ["×" + a.n + " בְּרָשִׁ״י"]) : null
        ], "tight")),
        options: options.map(o => ({ node: el("span", { class: "name" }, [o.a.e]), ok: o.ok, a: o.a })),
        explain: (o) => whyWrongText(o.a.f, a.f, o.a.f + " = " + o.a.e + ". " + a.f + " = " + a.e + (a.note ? " (" + a.note + ")" : "") + "."),
        tip: a.note ? a.f + " — " + a.note : null,
        onResult: (ok) => State.recordResult(keyOf(a), ok, 4)
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 10. מְצָא אֶת רָשִׁ״י ============
     כל האפליקציה עד כאן מאמנת זיהוי סימן. הפעולה האמיתית על הדף
     היא אחרת: לראות מילה בגמרא, לחפש את הדִּבּוּר הַמַּתְחִיל, ולקרוא
     את הפירוש. הנתונים ישבו כאן כל הזמן — 5 דפי בבא קמא, 89 יחידות,
     115 פירושים — ואף משימה לא נגעה בהם.
     בבא קמא אינה מנוקדת. זה לא חוסר; זה הדף. */
  function findRashi(game, world) {
    const G = (window.LIBRARY || {}).gemara;
    if (!G) return sign(game, world);
    const strip = window.stripNikud;
    /* פריט תקין = דיבור מתחיל שמופיע ככתבו בתוך הסוגיה שלו */
    const items = [];
    G.dapim.forEach(daf => {
      const dibs = [...new Set(daf.units.flatMap(u => (u.rashi || []).map(r => r.d).filter(Boolean)))];
      daf.units.forEach(u => {
        const gm = strip(u.gemara || "");
        (u.rashi || []).forEach(r => {
          const d = strip(r.d || "");
          if (d.length > 2 && gm.indexOf(d) > -1) items.push({ daf, u, r, d, gm, dibs });
        });
      });
    });
    if (items.length < 4) return sign(game, world);

    const qs = pick(items, Math.min(4, items.length)).map(it => {
      const others = shuffle(it.dibs.map(strip).filter(x => x !== it.d && x.length > 2)).slice(0, 3);
      const options = shuffle([{ t: it.d, ok: true }, ...others.map(t => ({ t, ok: false }))]);
      const marked = it.gm.replace(it.d, '<mark class="dh-mark">' + it.d + "</mark>");
      return {
        prompt: (n) => n.appendChild(riddleCard([
          el("div", { class: "src" }, [it.daf.n + " · בָּבָא קַמָּא", el("span", { class: "nik-tag none" }, ["בְּלִי נִקּוּד"])]),
          el("div", { class: "sugya", html: marked }),
          ask("אֵיזֶה דִּבּוּר הַמַּתְחִיל שֶׁל רָשִׁ״י מְפָרֵשׁ אֶת הַמֻּדְגָּשׁ?")
        ], "tight")),
        options: options.map(o => ({ node: el("span", { class: "dhopt" }, [rashi(o.t)]), ok: o.ok, t: o.t })),
        explain: (o) => whyWrongText(o.t, it.d,
          "הַמִּלָּה הַמֻּדְגֶּשֶׁת בַּגְּמָרָא הִיא " + it.d + ". רָשִׁ״י פּוֹתֵחַ בְּדִיּוּק בָּהּ."),
        tip: null,
        onShown: () => {},
        onResult: (ok) => {
          State.recordResult("dh:" + it.d, ok, 6);
          if (ok) UI.modal(el("div", { class: "dh-reveal" }, [
            el("b", {}, ["רָשִׁ״י"]),
            el("div", { class: "dh-d" }, [rashi(it.d)]),
            el("div", { class: "dh-t" }, [rashi(it.r.t)]),
            el("small", {}, [it.daf.n + " · בָּבָא קַמָּא"])
          ]));
        }
      };
    });
    Games.runMC(game, world, qs);
  }

  /* ============ 11. קְרִיאָה חוֹזֶרֶת · מַד קֶצֶב ============
     scoreCard מודד שניות שנשארו וניסיונות — לא קצב קריאה. שטף הוא
     אוטומטיות, ואוטומטיות נמדדת בזמן למילה, לא בציון.
     אותו קטע שלוש פעמים, וגרף אישי של שניות ל-10 מילים.
     ⚠️ מול העצמי בלבד. ממצא החוברת: לוח תוצאות תחרותי מוריד
     מוטיבציה דווקא אצל החלשים. */
  const RUNS = 3;
  function pace(game, world) {
    const list = window.passagesByLevel(game.lvl || 6);
    const p = list[Math.floor(Math.random() * list.length)];
    const nik = nikOf(game);
    const txt = window.applyNik(p.t, nik);
    const nWords = p.plain.split(/\s+/).filter(Boolean).length;
    const runs = [];
    let t0 = 0;

    const per10 = (ms) => Math.round((ms / 1000) * (10 / nWords) * 10) / 10;

    function round(k) {
      Games.frame(game, world, (body) => {
        body.appendChild(riddleCard([
          el("div", { class: "src" }, [p.src, nikTag(game)]),
          el("div", { class: "pace-round" }, ["קְרִיאָה " + (k + 1) + " מִתּוֹךְ " + RUNS]),
          el("div", { class: "passage hidden-until" }, [rashi(txt)])
        ]));
        const go = el("button", { class: "btn primary big" }, ["הַתְחֵל לִקְרֹא ›"]);
        const done = el("button", { class: "btn primary big" }, ["סִיַּמְתִּי ✓"]);
        body.appendChild(go);
        go.addEventListener("click", () => {
          body.querySelector(".passage").classList.remove("hidden-until");
          go.replaceWith(done); t0 = Date.now();
        });
        done.addEventListener("click", () => {
          const secs = per10(Date.now() - t0);
          runs.push(secs);
          Audio2.sfx.tap();
          if (runs.length < RUNS) return round(runs.length);
          finishPace();
        });
        if (k > 0) body.appendChild(el("p", { class: "lead dim" },
          ["הַקְרִיאָה הַקּוֹדֶמֶת: " + runs[k - 1] + " שְׁנִיּוֹת לְ־10 מִלִּים."]));
      });
    }

    function finishPace() {
      const prog = State.progress;
      prog.pace = (prog.pace || []).concat([{ d: new Date().toISOString().slice(0, 10), s: Math.min(...runs), src: p.src }]).slice(-20);
      State.save();
      const best = Math.min(...runs), first = runs[0];
      const gained = Math.round((first - best) * 10) / 10;
      const hist = prog.pace.slice(-8);
      const worst = Math.max(...hist.map(h => h.s), ...runs);
      const bar = (v, cls, label) => el("div", { class: "pace-bar " + (cls || "") }, [
        el("i", { style: "width:" + Math.round(v / worst * 100) + "%" }),
        el("span", {}, [label + " · " + v + " שׁנ׳"])
      ]);
      const card = el("div", { class: "done-card race-done" }, [
        el("div", { class: "done-emoji" }, [gained > 0 ? "📈" : "📖"]),
        el("div", { class: "done-title" }, [gained > 0 ? "הִשְׁתַּפַּרְתָּ בְּ־" + gained + " שְׁנִיּוֹת" : "מָדַדְנוּ אֶת הַקֶּצֶב שֶׁלְּךָ"]),
        el("p", { class: "lead dim" }, ["שְׁנִיּוֹת לְ־10 מִלִּים. מוּל עַצְמְךָ בִּלְבַד."]),
        el("div", { class: "pace-chart" }, runs.map((v, i) => bar(v, i === runs.indexOf(best) ? "best" : "", "קְרִיאָה " + (i + 1)))),
        hist.length > 1 ? el("div", { class: "pace-chart past" }, [
          el("small", {}, ["הַשִּׂיא שֶׁלְּךָ בַּפְּעָמִים הַקּוֹדְמוֹת"]),
          bar(Math.min(...hist.slice(0, -1).map(h => h.s)), "prev", "עַד הַיּוֹם")
        ]) : null,
        el("div", { class: "race-actions" }, [
          el("button", { class: "btn ghost", onclick: () => pace(game, world) }, ["🔁 שׁוּב"]),
          el("button", { class: "btn primary", onclick: () => UI.drainRewards(() => App.world(world.id)) }, ["הָלְאָה ›"])
        ])
      ]);
      State.markGameDone(game.id, world.id, 20);
      State.award(Math.max(0, Math.round(30 - best)), { read: true });
      UI.burst(); Audio2.sfx.reward();
      UI.setScreen(el("div", { class: "game center" }, [card]));
    }
    round(0);
  }

  /* ============ 12. חֲזָרָה יוֹמִית ============
     "מומלץ" בבית הצביע על העולם הראשון שלא הושלם — ואחרי שהכל
     הושלם, על כלום. כאן שולפים dueChars על פני *כל* סוגי הפריטים:
     אותיות, ראשי תיבות, מילים ודיבורי מתחיל. תלוי במפתחות הגנריים
     של א3 — בלעדיהם היה כאן רק אותיות. */
  function dueItems() {
    const sr = State.progress.sr || {};
    const letters = window.LETTERS.map(l => l.c);
    const abbrs = window.allAbbrev().map(a => "abbr:" + a.f);
    const seen = Object.keys(sr).filter(k => k.indexOf("word:") === 0 || k.indexOf("dh:") === 0);
    const pool = [...new Set([...letters, ...abbrs, ...seen])].filter(k => sr[k]);
    return State.dueChars(pool);
  }
  function dailyCount() { return dueItems().length; }

  function due(game, world) {
    const keys = dueItems().slice(0, 8);
    if (!keys.length) {
      return Games.frame(game, world, (body) => {
        body.appendChild(riddleCard([
          el("div", { class: "big-letter" }, ["✓"]),
          ask("אֵין מָה לַחֲזֹר הַיּוֹם."),
          el("p", { class: "lead dim" }, ["כָּל מָה שֶׁלָּמַדְתָּ עֲדַיִן טָרִי. חֲזֹר מָחָר, אוֹ הַמְשֵׁךְ בַּמַּסָּע."])
        ]));
        body.appendChild(el("button", { class: "btn primary big", onclick: () => App.go("home") }, ["לַמַּסָּע ›"]));
      });
    }
    const abbrByKey = window.allAbbrev().reduce((m, a) => (m["abbr:" + a.f] = a, m), {});
    const qs = keys.map(k => {
      if (window.LETTER_BY_CHAR[k]) {              // אות
        const fam = window.familyOf(k);
        const pool = fam ? fam.chars : window.LETTERS.map(l => l.c);
        const distract = shuffle(pool.filter(x => x !== k)).slice(0, 3);
        const options = shuffle([{ c: k, ok: true }, ...distract.map(c => ({ c, ok: false }))]);
        return {
          prompt: (n) => n.appendChild(riddleCard([
            el("div", { class: "due-kind" }, ["אוֹת"]),
            el("div", { class: "big-letter" }, [rashi(k)]), hint(k)], "tight")),
          options: options.map(o => ({ node: el("span", { class: "name" }, [NAME(o.c)]), ok: o.ok, c: o.c })),
          explain: (o) => whyWrong(o.c, k),
          onShown: () => Audio2.speak(NAME(k)),
          onResult: (ok) => State.recordResult(k, ok)
        };
      }
      if (abbrByKey[k]) {                          // ראשי תיבות
        const a = abbrByKey[k];
        const distract = pick(window.allAbbrev().filter(x => x.e !== a.e), 3);
        const options = shuffle([{ a, ok: true }, ...distract.map(x => ({ a: x, ok: false }))]);
        return {
          prompt: (n) => n.appendChild(riddleCard([
            el("div", { class: "due-kind" }, ["קִצּוּר"]),
            el("div", { class: "abbr-big" }, [rashi(a.f)])], "tight")),
          options: options.map(o => ({ node: el("span", { class: "name" }, [o.a.e]), ok: o.ok, a: o.a })),
          explain: (o) => whyWrongText(o.a.f, a.f, o.a.f + " = " + o.a.e + ". " + a.f + " = " + a.e + "."),
          onResult: (ok) => State.recordResult(k, ok, 4)
        };
      }
      // מילה / דיבור המתחיל — קוראים את הגליף ובוחרים את המרובע
      const txt = k.slice(k.indexOf(":") + 1);
      const twins = twinVariants(txt, 3, [txt]);
      const options = shuffle([{ t: txt, ok: true }, ...twins.map(t => ({ t, ok: false }))]);
      return {
        prompt: (n) => n.appendChild(riddleCard([
          el("div", { class: "due-kind" }, [k.indexOf("dh:") === 0 ? "דִּבּוּר הַמַּתְחִיל" : "מִלָּה"]),
          el("div", { class: "big-word" }, [rashi(txt)]), ask("אֵיזוֹ מִלָּה זֹאת?")], "tight")),
        options: options.map(o => ({ node: el("span", { class: "sqword" }, [square(o.t)]), ok: o.ok, t: o.t })),
        explain: (o) => {
          const d = diffLetter(o.t, txt);
          return whyWrongText(o.t, txt, d ? "אוֹת אַחַת: " + NAME(d[0]) + " בִּמְקוֹם " + NAME(d[1]) + "." : null);
        },
        onShown: () => Audio2.speak(txt),
        onResult: (ok) => State.recordResult(k, ok, 4)
      };
    });
    Games.runMC(game, world, qs);
  }

  const TYPES = {
    "r-open": open, "r-sign": sign, "r-family": family, "r-detective": detective,
    "r-word": word, "r-readword": readword, "r-line": line, "r-fluent": fluent,
    "r-grid": grid, "r-star": star, "r-abbr": abbrev, "r-find": findRashi, "r-pace": pace, "r-due": due
  };
  return { play: (g, w) => (TYPES[g.type] || sign)(g, w), TYPES, whyWrong, pairHint, whyWrongText, dailyCount };
})();
