/* ===========================================================
   app.js — ניתוב ומסכים.
   =========================================================== */
window.App = (function () {
  const el = UI.el, rashi = UI.rashi, square = UI.square;

  function boot() {
    UI.applyMode();
    if (!State.profile || !State.profile.name) return onboarding();
    const h = (location.hash || "").replace("#", "");
    if (h.indexOf("g/") === 0) { const [, wid, gid] = h.split("/"); const w = window.worldById(wid); const g = w && w.games.find(x => x.id === gid); if (g) return Games.play(g, w); }
    if (h.indexOf("lib/") === 0) { const k = h.split("/")[1]; if (window.LIBRARY[k]) return libraryReader(k); }
    if (h.indexOf("play/") === 0) { const id = h.split("/")[1]; if (window.GAMEHALL.some(g => g.id === id)) return GameHall.play(id); }
    if (h && window.worldById(h)) return world(h);
    if (h === "key") return keySheet();
    if (["home", "beit", "games", "me"].includes(h)) return go(h);
    go("home");
  }

  /* ---------------- אונבורדינג ---------------- */
  function onboarding() {
    let step = 0, gender = null, mode = null, name = "";
    const host = el("div", { class: "onb" });
    UI.setScreen(host);
    render();

    function render() {
      host.innerHTML = "";
      host.appendChild(el("div", { class: "onb-logo" }, [rashi("רש״י"), el("h1", {}, ["לוֹמְדִים כְּתָב רָשִׁ״י"]), el("p", {}, ["מֵאֶפֶס — עַד קְרִיאָה שׁוֹטֶפֶת."])]));
      if (step === 0) {
        host.appendChild(el("h2", {}, ["מִי לוֹמֵד?"]));
        host.appendChild(el("div", { class: "choice2" }, [
          el("button", { class: "bigchoice", onclick: () => { gender = "boy"; step = 1; render(); } }, ["🧒", el("span", {}, ["בֵּן"])]),
          el("button", { class: "bigchoice", onclick: () => { gender = "girl"; step = 1; render(); } }, ["👧", el("span", {}, ["בַּת"])])
        ]));
      } else if (step === 1) {
        host.appendChild(el("h2", {}, ["אֵיךְ קוֹרְאִים לְךָ?"]));
        const inp = el("input", { class: "nameinput", type: "text", placeholder: "הַשֵּׁם שֶׁלְּךָ", maxlength: "12", value: name });
        inp.addEventListener("input", e => name = e.target.value);
        host.appendChild(inp);
        host.appendChild(el("button", { class: "btn primary big", onclick: () => { if ((name || "").trim()) { step = 2; render(); } else inp.focus(); } }, ["הָלְאָה ›"]));
      } else {
        host.appendChild(el("h2", {}, ["אֵיזֶה מַרְאֶה מַתְאִים לְךָ?"]));
        host.appendChild(el("div", { class: "choice2" }, [
          el("button", { class: "bigchoice", onclick: () => { mode = "kid"; finishOnb(); } }, ["🎨", el("span", {}, ["יֶלֶד"]), el("small", {}, ["צִבְעוֹנִי + דְּמוּת"])]),
          el("button", { class: "bigchoice", onclick: () => { mode = "adult"; finishOnb(); } }, ["📜", el("span", {}, ["בּוֹגֵר"]), el("small", {}, ["בֵּית־מִדְרָשׁ"])])
        ]));
      }
    }
    function finishOnb() {
      State.setProfile({ name: name.trim(), gender, mode });
      UI.applyMode();
      const hi = gender === "girl" ? "בְּרוּכָה הַבָּאָה" : "בָּרוּךְ הַבָּא";
      UI.toast(`${hi}, ${name.trim()}!`);
      go("home");
    }
  }

  /* ---------------- מפת המסע (בית) ---------------- */
  function go(route) {
    if (route === "home") return home();
    if (route === "beit") return beit();
    if (route === "games") return GameHall.hall();
    if (route === "me") return me();
  }

  /* ---------------- בֵּית הַמִּדְרָשׁ ---------------- */
  function beit() {
    /* נְקֻדּוֹת קְרִיאָה, לא נקודות סתם: את בבא קמא פותחת קריאה,
       לא ניצחון ב-2048. ראה award() ב-state.js. */
    const pts = State.progress.readPoints;
    const body = el("div", { class: "beitscr" });
    body.appendChild(el("h2", { class: "map-title" }, ["בֵּית הַמִּדְרָשׁ"]));
    body.appendChild(el("p", { class: "sub-lead" }, [`טֶקְסְט אֲמִתִּי בִּכְתָב רָשִׁ״י. הַסְּפָרִים נִפְתָּחִים לְפִי נְקֻדּוֹת קְרִיאָה — יֵשׁ לְךָ 📖 ${pts}.`]));
    const cards = el("div", { class: "beit-cards" });
    /* נפתחים לפי נקודות, בדיוק כמו אולם המשחקים. הסדר הוא סדר הקושי
       האמיתי: חומש מנוקד → שולחן ערוך → דף גמרא עם רש״י לא-מנוקד. */
    [
      { kind: "chumash", icon: "📕", title: "חֻמָּשׁ עִם רָשִׁ״י", sub: "בְּרֵאשִׁית א׳–ג׳ — 80 פְּסוּקִים עִם רָשִׁ״י", hue: 355, unlock: 80 },
      { kind: "halacha", icon: "📔", title: "שֻׁלְחָן עָרוּךְ + מִשְׁנָה בְּרוּרָה", sub: "אֹרַח חַיִּים · סִימָנִים א׳–י״ב", hue: 210, unlock: 300 },
      /* הגמרא היא היעד של האפליקציה כולה — ולכן היא כאן, לא כתרגיל.
         רש״י על הש״ס אינו מנוקד (וילנא), בניגוד לרש״י על החומש.
         זה לא חוסר, זה הדף האמיתי. */
      { kind: "gemara", icon: "📚", title: "גְּמָרָא · בָּבָא קַמָּא", sub: "ב׳ ע״א–ד׳ ע״א · הַדַּף עִם רָשִׁ״י", hue: 25, unlock: 700 }
    ].forEach(c => {
      const open = pts >= (c.unlock || 0);
      const card = el("button", { class: "beit-card" + (open ? "" : " locked"), style: `--hue:${c.hue}`,
        onclick: () => open ? libraryReader(c.kind)
                            : UI.toast(`נִפְתָּח בְּ-${c.unlock} נְקֻדּוֹת קְרִיאָה (חָסֵר ${c.unlock - pts})`) }, [
        el("span", { class: "bc-icon" }, [open ? c.icon : "🔒"]),
        el("span", { class: "bc-txt" }, [el("b", {}, [c.title]), el("small", {}, [open ? c.sub : `נִפְתָּח בְּ-${c.unlock} נְקֻדּוֹת קְרִיאָה`])]),
        el("span", { class: "bc-go" }, [open ? "›" : `${c.unlock} נק׳`])
      ]);
      if (!open) card.appendChild(el("span", { class: "bc-bar" }, [
        el("i", { style: `width:${Math.round(Math.min(1, pts / c.unlock) * 100)}%` })]));
      cards.appendChild(card);
    });
    body.appendChild(cards);
    UI.page("beit", body);
    drain();
  }

  function libraryReader(kind, idx) {
    const data = window.LIBRARY[kind];
    const items = data.perakim || data.simanim || data.dapim;
    idx = Math.min(Math.max(0, idx || 0), items.length - 1);
    if (!State.unitUnlocked(kind, idx)) idx = State.libDepth(kind);
    const cur = items[idx];
    const daf = el("div", { class: "daf" });
    const hero = el("div", { class: "daf-hero", style: `--hue:${kind === "chumash" ? 355 : kind === "gemara" ? 25 : 210}` }, [
      el("button", { class: "back", onclick: () => go("beit") }, ["›"]),
      el("span", { class: "dh-icon" }, [data.icon]),
      el("h2", {}, [data.title]), el("p", {}, [data.sub])
    ]);
    // בורר פרק/סימן
    /* ד3 — כל פרק/סימן/דף נפתח בסיום עולם, במקום כרטיס-קטע בארון */
    const selector = el("div", { class: "lib-sel" }, items.map((it, i) => {
      const open = State.unitUnlocked(kind, i);
      return el("button", { class: "lib-tab" + (i === idx ? " on" : "") + (open ? "" : " locked"),
        onclick: () => open ? libraryReader(kind, i) : UI.toast("נִפְתָּח בְּסִיּוּם עוֹלָם נוֹסָף 🔒") },
        [(open ? "" : "🔒 ") + window.libUnitName(kind, i)]);
    }));
    /* ג5 — כפתור אחד שהחליף את *כל* הדף למרובע הפך את מי שנתקע
       במילה אחת למי שהופך עמוד שלם. כאן החשיפה היא לפי מילה בנגיעה,
       והמונה הוא מדד כן: כמה קראת באמת מול כמה הצצת. */
    const meter = el("div", { class: "read-meter" });
    function paintMeter() {
      meter.innerHTML = "";
      meter.appendChild(el("b", {}, ["קָרָאתָ " + (libWords - libPeeks) + " מִלִּים"]));
      meter.appendChild(el("span", {}, [libPeeks ? "הֵצַצְתָּ בְּ-" + libPeeks : "בְּלִי אַף הַצָּצָה ✓"]));
    }

    const scroll = el("div", { class: "daf-scroll" });
    libWords = 0; libPeeks = 0; paintMeterRef = paintMeter;
    if (kind === "chumash") cur.units.forEach(u => scroll.appendChild(chumashUnit(u)));
    else if (kind === "gemara") cur.units.forEach(u => scroll.appendChild(gemaraUnit(u)));
    else scroll.appendChild(halachaSiman(cur));
    if (data.credit) scroll.appendChild(el("div", { class: "lib-credit" }, [data.credit]));
    daf.appendChild(scroll);
    paintMeter();

    UI.setScreen(el("div", { class: "page daf-page" }, [
      hero, selector,
      el("div", { class: "daf-tools" }, [meter, el("small", { class: "tap-note" }, ["נִתְקַעְתָּ בְּמִלָּה? גַּע בָּהּ."])]),
      daf, UI.nav("beit")]));
  }

  /* מונה לכל דף — נספר בזמן הבנייה, ומתעדכן בכל נגיעה */
  let libWords = 0, libPeeks = 0, paintMeterRef = null;
  function rashiTxt(s) {   // כתב רש״י לא-מנוקד; נגיעה במילה חושפת אותה במרובע
    const span = el("span", { class: "rt" });
    const words = window.stripNikud(s).split(/(\s+)/);
    words.forEach(w => {
      if (!w.trim()) { span.appendChild(document.createTextNode(w)); return; }
      libWords++;
      const ws = el("span", { class: "rw" }, [w]);
      ws.addEventListener("click", (e) => {
        e.stopPropagation();
        if (ws.classList.contains("shown")) return;
        ws.classList.add("shown");
        libPeeks++;
        State.progress.peeks = (State.progress.peeks || 0) + 1; State.save();
        Audio2.sfx.tap();
        paintMeterRef && paintMeterRef();
      });
      span.appendChild(ws);
    });
    return span;
  }
  function chumashUnit(u) {
    const box = el("div", { class: "unit" });
    box.appendChild(el("div", { class: "unit-ref" }, [u.ref]));
    box.appendChild(el("div", { class: "pasuk", onclick: () => Audio2.speak(window.stripNikud(u.pasuk), 0.85) }, [u.pasuk]));
    u.rashi.forEach(r => {
      box.appendChild(el("div", { class: "rashi-block" }, [
        el("span", { class: "rlabel" }, ["רש״י"]),
        el("b", { class: "dibur rt" }, [window.stripNikud(r.d)]),
        rashiTxt(" — " + r.t)
      ]));
    });
    return box;
  }
  /* יחידת דף: הגמרא במרובע כמו בדף אמיתי, ורש״י בכתב רש״י —
     כי הוא מה שבאמת מודפס ככה. כפתור "הצג מרובע" הגלובלי חל גם כאן. */
  function gemaraUnit(u) {
    const box = el("div", { class: "unit gm-unit" });
    box.appendChild(el("div", { class: "unit-ref" }, [u.ref]));
    box.appendChild(el("div", { class: "gemara-txt", onclick: () => Audio2.speak(window.stripNikud(u.gemara), 0.85) }, [u.gemara]));
    (u.rashi || []).forEach(r => {
      box.appendChild(el("div", { class: "rashi-block" }, [
        el("span", { class: "rlabel" }, ["רש״י"]),
        r.d ? el("b", { class: "dibur rt" }, [r.d]) : null,
        rashiTxt((r.d ? " — " : "") + r.t)
      ]));
    });
    return box;
  }

  function halachaSiman(s) {
    const box = el("div", { class: "siman" });
    box.appendChild(el("div", { class: "siman-head" }, [`סִימָן ${s.n} · ${s.title}`]));
    s.seifim.forEach(sf => {
      box.appendChild(el("div", { class: "seif" }, [
        el("div", { class: "sa-line" }, [ el("span", { class: "seif-n" }, [String(sf.n)]), el("span", { class: "sa-txt" }, [sf.sa]) ])
      ]));
    });
    if (s.mb && s.mb.length) {
      const mb = el("div", { class: "mb-wrap" }, [ el("span", { class: "mb-label" }, ["מִשְׁנָה בְּרוּרָה"]) ]);
      s.mb.forEach(m => mb.appendChild(el("div", { class: "mb-note" }, [
        el("span", { class: "mb-n rt" }, [`(${window.stripNikud(m.n)})`]), rashiTxt(" " + m.t)
      ])));
      box.appendChild(mb);
    }
    return box;
  }

  /* ---------------- מַפְתֵּחַ הַסִּימָנִים ----------------
     בחוברת המודפסת יש מפתח פתרונות. באפליקציה הדרך היחידה לגלות
     אות הייתה לטעות. כאן הכל פתוח: גליף, מרובע, שם, והסימן המבחין. */
  function keySheetBody() {
    const wrap = el("div", { class: "keysheet" });
    (window.FAMILIES || []).forEach(f => {
      wrap.appendChild(el("div", { class: "ks-fam" + (f.boss ? " boss" : "") }, [
        el("b", {}, [f.name]),
        f.rule ? el("small", {}, [f.rule]) : null
      ]));
      const row = el("div", { class: "ks-row" });
      f.chars.forEach(c => {
        const L = window.LETTER_BY_CHAR[c] || {};
        row.appendChild(el("div", { class: "ks-cell" }, [
          el("div", { class: "ks-glyph" }, [rashi(c)]),
          el("div", { class: "ks-sq" }, [square(c)]),
          el("b", {}, [L.name || c]),
          el("small", {}, [window.shortOf(c) || ""])
        ]));
      });
      wrap.appendChild(row);
    });
    return wrap;
  }
  function keySheet(asModal) {
    if (asModal) {
      const btn = el("button", { class: "btn primary" }, ["חָזַרְתִּי לַחִידָה"]);
      const m = UI.modal(el("div", { class: "ks-modal" }, [
        el("h3", {}, ["מַפְתֵּחַ הַסִּימָנִים"]), keySheetBody(), btn
      ]));
      btn.addEventListener("click", () => m.close());
      return m;
    }
    const body = el("div", { class: "kspage" });
    body.appendChild(el("div", { class: "world-hero", style: "--hue:200" }, [
      el("button", { class: "back", onclick: () => go("home") }, ["›"]),
      el("div", { class: "wh-emoji" }, ["🗝️"]),
      el("h2", {}, ["מַפְתֵּחַ הַסִּימָנִים"]),
      el("p", {}, ["27 הַסִּימָנִים, הַשֵּׁם, וְהַסִּימָן שֶׁמַּבְדִּיל. פָּתוּחַ תָּמִיד."])
    ]));
    body.appendChild(keySheetBody());
    UI.setScreen(el("div", { class: "page" }, [body, UI.nav("home")]));
  }

  /* מזהה לפי יום: החזרה מזכה בנקודות פעם ביום, לא בכל לחיצה */
  function dailyReview() {
    const day = new Date().toISOString().slice(0, 10);
    const w = { id: "w6", games: [] };
    const world = window.worldById("w6") || w;
    Riddles.play({ id: "due-" + day, type: "r-due", title: "חֲזָרָה יוֹמִית", emoji: "🔁", tries: 3, limit: 90 }, world);
  }

  function home() {
    const body = el("div", { class: "home" });
    /* ד5 — רצף ואתגר יומי היו שתי מערכות תגמול נפרדות על אותו מסך.
       הן אותו דבר: "בוא כל יום". כרטיס אחד. */
    const d = State.daily(), st = State.progress.streak.count;
    const daily = el("div", { class: "daily" + (d.met ? " met" : "") }, [
      el("div", {}, [
        el("b", {}, ["🔥 " + st + (st === 1 ? " יוֹם רָצוּף" : " יָמִים רְצוּפִים")]),
        el("small", {}, [`הַיּוֹם: ${Math.min(d.games, d.goal)}/${d.goal} מְשִׂימוֹת`])
      ]),
      d.met && !d.claimed
        ? el("button", { class: "btn primary sm", onclick: () => { const r = State.claimDaily(); if (r) { UI.burst(); UI.toast("+" + r + " נְקֻדּוֹת!"); home(); } } }, ["קַבֵּל +" + d.reward])
        : el("div", { class: "daily-x" }, [d.claimed ? "✓ נֶאֱסַף" : d.met ? "✓" : "בְּתַהֲלִיךְ"])
    ]);
    body.appendChild(daily);

    /* ג3 — לולאה יומית. "מומלץ" מצביע על העולם הבא שלא הושלם,
       ואחרי שהכל הושלם — על כלום. החזרה היומית תמיד יש לה מה לתת. */
    const dueN = (window.Riddles && Riddles.dailyCount) ? Riddles.dailyCount() : 0;
    if (dueN) body.appendChild(el("button", { class: "duelink", onclick: dailyReview }, [
      el("span", {}, ["🔁"]),
      el("b", {}, ["חֲזָרָה יוֹמִית"]),
      el("small", {}, [dueN + " פְּרִיטִים מְחַכִּים לַחֲזָרָה — אוֹתִיּוֹת, קִצּוּרִים וּמִלִּים"]),
      el("i", {}, ["›"])
    ]));

    body.appendChild(el("button", { class: "keylink", onclick: () => keySheet() }, [
      el("span", {}, ["🗝️"]),
      el("b", {}, ["מַפְתֵּחַ הַסִּימָנִים"]),
      el("small", {}, ["כָּל 27 הַסִּימָנִים — פָּתוּחַ תָּמִיד"]), el("i", {}, ["›"])
    ]));

    body.appendChild(el("h2", { class: "map-title" }, ["מַסַּע הַפִּעֲנוּחַ"]));
    const path = el("div", { class: "path" });
    const firstUndone = window.WORLDS.find(w => !State.progress.worldsDone[w.id]);
    window.WORLDS.forEach((w, i) => {
      const tasks = w.games.filter(g => !g.bonus);
      const doneCount = tasks.filter(g => State.isDone(g.id)).length;
      const complete = !!State.progress.worldsDone[w.id];
      const recommended = firstUndone && firstUndone.id === w.id;
      const node = el("button", { class: "world-node" + (complete ? " done" : "") + (recommended ? " rec" : ""), style: `--hue:${w.hue}`, onclick: () => world(w.id) }, [
        el("div", { class: "wn-emoji" }, [complete ? "✓" : w.emoji]),
        el("div", { class: "wn-info" }, [
          el("b", {}, [w.title]),
          el("small", {}, [w.sub]),
          el("div", { class: "wn-prog" }, [el("i", { style: `width:${Math.round(doneCount / Math.max(1, tasks.length) * 100)}%` })])
        ]),
        recommended ? el("span", { class: "rec-tag" }, ["מֻמְלָץ"]) : null
      ]);
      path.appendChild(node);
      if (i < window.WORLDS.length - 1) path.appendChild(el("div", { class: "path-link" }));
    });
    body.appendChild(path);
    UI.page("home", body);
    drain();
  }

  /* ---------------- מסך עולם ---------------- */
  function world(id) {
    const w = window.worldById(id); if (!w) return home();
    const body = el("div", { class: "worldscr", style: `--hue:${w.hue}` });
    body.appendChild(el("div", { class: "world-hero" }, [
      el("button", { class: "back", onclick: () => go("home") }, ["›"]),
      el("div", { class: "wh-emoji" }, [w.emoji]),
      el("h2", {}, [w.title]), el("p", {}, [w.sub])
    ]));
    const opens = (window.OPENS || {})[w.id];
    if (opens && !State.progress.worldsDone[w.id]) body.appendChild(el("div", { class: "unlock-hint" }, [
      `🎁 סַיֵּם אֶת הָעוֹלָם → נִפְתָּח בְּבֵית הַמִּדְרָשׁ: ${window.libIcon(opens.kind)} ${window.libTitle(opens.kind)} · ${window.libUnitName(opens.kind, opens.depth)}`
    ]));
    const list = el("div", { class: "game-list" });
    w.games.filter(g => !g.bonus).forEach(g => {
      const done = State.isDone(g.id);
      list.appendChild(el("button", { class: "game-card" + (done ? " done" : ""), onclick: () => Games.play(g, w) }, [
        el("span", { class: "gc-emoji" }, [g.emoji]),
        el("span", { class: "gc-title" }, [g.title]),
        el("span", { class: "gc-check" }, [done ? "✓" : "›"])
      ]));
    });
    body.appendChild(list);

    /* אֶתְגַּר שִׂיא — נפתח רק אחרי שהעולם הסתיים, ואינו תנאי לסיומו */
    const bonus = w.games.filter(g => g.bonus);
    if (bonus.length) {
      const open = State.worldComplete(w.id);
      body.appendChild(el("h3", { class: "sec bonus-sec" }, ["🏆 אֶתְגַּר שִׂיא"]));
      const bl = el("div", { class: "game-list" });
      bonus.forEach(g => {
        const done = State.isDone(g.id);
        bl.appendChild(el("button", { class: "game-card bonus" + (done ? " done" : "") + (open ? "" : " locked"),
          onclick: () => open ? Games.play(g, w) : UI.toast("סַיֵּם אֶת הָעוֹלָם וְהוּא נִפְתָּח 🔒") }, [
          el("span", { class: "gc-emoji" }, [open ? g.emoji : "🔒"]),
          el("span", { class: "gc-title" }, [g.title]),
          el("span", { class: "gc-check" }, [done ? "✓" : open ? "›" : ""])
        ]));
      });
      body.appendChild(bl);
    }
    UI.setScreen(el("div", { class: "page" }, [body, UI.nav("home")]));
  }

  /* ---------------- הישגים / פרופיל ---------------- */
  function me() {
    const p = State.progress, r = State.rank();
    const body = el("div", { class: "mescr" });
    body.appendChild(el("div", { class: "me-hero" }, [
      el("div", { class: "me-rank-emoji" }, [r.emoji]),
      el("h2", {}, [State.profile ? State.profile.name : ""]),
      el("div", { class: "me-rank" }, [r.name]),
      el("div", { class: "me-nums" }, [
        el("span", {}, ["✦ " + p.points + " נְקֻדּוֹת"]),
        el("span", {}, ["📖 " + p.readPoints + " נְקֻדּוֹת קְרִיאָה"]),
        el("span", {}, ["🔤 " + p.mastered + " אוֹתִיּוֹת נִשְׁלְטוּ"]),
        el("span", {}, ["🔥 " + p.streak.count + " רֶצֶף"])
      ])
    ]));

    // רצף 14 יום
    body.appendChild(el("h3", { class: "sec" }, ["לוּחַ הַתְמָדָה"]));
    body.appendChild(el("div", { class: "streakcal" }, State.last14().map(d => el("i", { class: d.read ? "on" : "" }, [d.read ? "🕯️" : ""]))));

    // מדליות
    body.appendChild(el("h3", { class: "sec" }, ["מֶדַלְיוֹת"]));
    body.appendChild(el("div", { class: "medals" }, window.MEDALS.map(m => {
      const has = p.medals.includes(m.id);
      return el("div", { class: "medal " + m.tier + (has ? "" : " off") }, [
        el("span", { class: "medal-e" }, [has ? m.emoji : "🔒"]), el("small", {}, [m.name])
      ]);
    })));

    // הגדרות
    body.appendChild(el("h3", { class: "sec" }, ["הַגְדָּרוֹת"]));
    const settings = el("div", { class: "settings" }, [
      el("button", { class: "btn ghost", onclick: (e) => { const m = !Audio2.muted; Audio2.setMuted(m); e.target.textContent = m ? "🔇 קוֹל כָּבוּי" : "🔊 קוֹל דָּלוּק"; } }, [Audio2.muted ? "🔇 קוֹל כָּבוּי" : "🔊 קוֹל דָּלוּק"]),
      el("button", { class: "btn ghost", onclick: () => { const nm = State.mode === "kid" ? "adult" : "kid"; State.setMode(nm); UI.applyMode(); me(); } }, ["🎭 מַצַּב: " + (State.mode === "kid" ? "יֶלֶד" : "בּוֹגֵר")]),
      el("button", { class: "btn ghost danger", onclick: () => { if (confirm("לְאַפֵּס הַכֹּל?")) { State.reset(); boot(); } } }, ["♻️ אִפּוּס"])
    ]);
    body.appendChild(settings);
    UI.page("me", body);
    drain();
  }

  function drain() { UI.drainRewards(); }

  return { boot, go, world, home, me, keySheet, dailyReview, game: (wid, gid) => { const w = window.worldById(wid); Games.play(w.games.find(g => g.id === gid), w); } };
})();

document.addEventListener("DOMContentLoaded", () => App.boot());
