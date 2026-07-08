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
    if (h && window.worldById(h)) return world(h);
    if (["home", "beit", "shelf", "me"].includes(h)) return go(h);
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
    if (route === "shelf") return shelf();
    if (route === "me") return me();
  }

  /* ---------------- בֵּית הַמִּדְרָשׁ ---------------- */
  const LIB_MAP = { chumash: "chumash", "mishna-brura": "halacha" };
  function beit() {
    const body = el("div", { class: "beitscr" });
    body.appendChild(el("h2", { class: "map-title" }, ["בֵּית הַמִּדְרָשׁ"]));
    body.appendChild(el("p", { class: "sub-lead" }, ["טֶקְסְט אֲמִתִּי בִּכְתָב רָשִׁ״י — פָּסוּק וְהַפֵּרוּשׁ, שֻׁלְחָן עָרוּךְ וּמִשְׁנָה בְּרוּרָה."]));
    const cards = el("div", { class: "beit-cards" });
    [
      { kind: "chumash", icon: "📕", title: "חֻמָּשׁ עִם רָשִׁ״י", sub: "בְּרֵאשִׁית א׳ — פָּסוּק וּפֵרוּשׁ רָשִׁ״י", hue: 355 },
      { kind: "halacha", icon: "📔", title: "שֻׁלְחָן עָרוּךְ + מִשְׁנָה בְּרוּרָה", sub: "אֹרַח חַיִּים סִימָן א׳–ב׳", hue: 210 }
    ].forEach(c => cards.appendChild(
      el("button", { class: "beit-card", style: `--hue:${c.hue}`, onclick: () => libraryReader(c.kind) }, [
        el("span", { class: "bc-icon" }, [c.icon]),
        el("span", { class: "bc-txt" }, [el("b", {}, [c.title]), el("small", {}, [c.sub])]),
        el("span", { class: "bc-go" }, ["›"])
      ])));
    body.appendChild(cards);
    UI.page("beit", body);
    drain();
  }

  function libraryReader(kind) {
    const data = window.LIBRARY[kind];
    const daf = el("div", { class: "daf" });
    const hero = el("div", { class: "daf-hero", style: `--hue:${kind === "chumash" ? 355 : 210}` }, [
      el("button", { class: "back", onclick: () => go("beit") }, ["›"]),
      el("span", { class: "dh-icon" }, [data.icon]),
      el("h2", {}, [data.title]), el("p", {}, [data.sub])
    ]);
    // כפתור-רמז גלובלי: החלף כתב רש״י ↔ מרובע
    let sq = false;
    const toggle = el("button", { class: "sq-toggle", onclick: () => {
      sq = !sq; daf.classList.toggle("show-square", sq);
      toggle.textContent = sq ? "✏️ חֲזֹר לְרָשִׁ״י" : "🔤 הַצֵּג מְרֻבָּע";
    } }, ["🔤 הַצֵּג מְרֻבָּע"]);

    const scroll = el("div", { class: "daf-scroll" });
    if (kind === "chumash") data.units.forEach(u => scroll.appendChild(chumashUnit(u)));
    else data.simanim.forEach(s => scroll.appendChild(halachaSiman(s)));

    UI.setScreen(el("div", { class: "page daf-page" }, [hero, el("div", { class: "daf-tools" }, [toggle]), daf.appendChild(scroll) && daf, UI.nav("beit")]));
  }

  function rashiTxt(s) {   // כתב רש״י לא-מנוקד, מתחלף למרובע ע״י .show-square
    const span = el("span", { class: "rt" });
    span.innerHTML = window.stripNikud(s);
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
  function halachaSiman(s) {
    const box = el("div", { class: "siman" });
    box.appendChild(el("div", { class: "siman-head" }, [`סִימָן ${s.n} · ${s.title}`]));
    s.seifim.forEach(sf => {
      const seif = el("div", { class: "seif" }, [
        el("div", { class: "sa-line" }, [ el("span", { class: "seif-n" }, [String(sf.n)]), el("span", { class: "sa-txt" }, [sf.sa]) ])
      ]);
      if (sf.mb && sf.mb.length) {
        const mb = el("div", { class: "mb-wrap" }, [ el("span", { class: "mb-label" }, ["מִשְׁנָה בְּרוּרָה"]) ]);
        sf.mb.forEach(m => mb.appendChild(el("div", { class: "mb-note" }, [
          el("span", { class: "mb-n rt" }, [`(${window.stripNikud(m.n)})`]), rashiTxt(" " + m.t)
        ])));
        seif.appendChild(mb);
      }
      box.appendChild(seif);
    });
    return box;
  }

  function home() {
    const body = el("div", { class: "home" });
    // אתגר יומי + מסע
    const d = State.daily();
    const daily = el("div", { class: "daily" + (d.met ? " met" : "") }, [
      el("div", {}, [el("b", {}, ["🎯 אֶתְגָּר יוֹמִי"]), el("small", {}, [`${Math.min(d.games, d.goal)}/${d.goal} מִשְׂחָקִים`])]),
      d.met && !d.claimed
        ? el("button", { class: "btn primary sm", onclick: () => { const r = State.claimDaily(); if (r) { UI.burst(); UI.toast("+" + r + " נְקֻדּוֹת!"); home(); } } }, ["קַבֵּל +" + d.reward])
        : el("div", { class: "daily-x" }, [d.claimed ? "✓ נֶאֱסַף" : "בְּתַהֲלִיךְ"])
    ]);
    body.appendChild(daily);

    body.appendChild(el("h2", { class: "map-title" }, ["מַסַּע הַפִּעֲנוּחַ"]));
    const path = el("div", { class: "path" });
    const firstUndone = window.WORLDS.find(w => !State.progress.worldsDone[w.id]);
    window.WORLDS.forEach((w, i) => {
      const doneCount = w.games.filter(g => State.isDone(g.id)).length;
      const complete = !!State.progress.worldsDone[w.id];
      const recommended = firstUndone && firstUndone.id === w.id;
      const node = el("button", { class: "world-node" + (complete ? " done" : "") + (recommended ? " rec" : ""), style: `--hue:${w.hue}`, onclick: () => world(w.id) }, [
        el("div", { class: "wn-emoji" }, [complete ? "✓" : w.emoji]),
        el("div", { class: "wn-info" }, [
          el("b", {}, [w.title]),
          el("small", {}, [w.sub]),
          el("div", { class: "wn-prog" }, [el("i", { style: `width:${Math.round(doneCount / w.games.length * 100)}%` })])
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
    if (w.opens) {
      const sef = window.SEFORIM.find(s => s.id === w.opens);
      if (sef) body.appendChild(el("div", { class: "unlock-hint" }, [`🎁 סַיֵּם אֶת הָעוֹלָם → נִפְתָּח: ${sef.icon} ${sef.name}`]));
    }
    const list = el("div", { class: "game-list" });
    w.games.forEach(g => {
      const done = State.isDone(g.id);
      list.appendChild(el("button", { class: "game-card" + (done ? " done" : ""), onclick: () => Games.play(g, w) }, [
        el("span", { class: "gc-emoji" }, [g.emoji]),
        el("span", { class: "gc-title" }, [g.title]),
        el("span", { class: "gc-check" }, [done ? "✓" : "›"])
      ]));
    });
    body.appendChild(list);
    UI.setScreen(el("div", { class: "page" }, [body, UI.nav("home")]));
  }

  /* ---------------- ארון הספרים ---------------- */
  function shelf() {
    const body = el("div", { class: "shelfscr" });
    body.appendChild(el("h2", { class: "map-title" }, ["📚 אֲרוֹן הַסְּפָרִים שֶׁלִּי"]));
    body.appendChild(el("p", { class: "sub-lead" }, ["כָּל סֵפֶר נִפְתָּח כְּשֶׁתְּסַיֵּם עוֹלָם — וְאָז אֶפְשָׁר לִקְרֹא בּוֹ בֶּאֱמֶת."]));
    const grid = el("div", { class: "shelf" });
    State.seforimState().forEach(s => {
      const card = el("button", { class: "book" + (s.unlocked ? "" : " locked"), onclick: () => s.unlocked ? openBook(s) : UI.toast("סַיֵּם עוֹד עוֹלָם כְּדֵי לִפְתֹּחַ 🔒") }, [
        el("div", { class: "book-icon" }, [s.unlocked ? s.icon : "🔒"]),
        el("div", { class: "book-name" }, [s.name]),
        s.opened ? el("span", { class: "book-badge" }, ["נִקְרָא ✓"]) : (s.unlocked ? el("span", { class: "book-badge new" }, ["חָדָשׁ!"]) : null)
      ]);
      grid.appendChild(card);
    });
    body.appendChild(grid);
    UI.page("shelf", body);
    drain();
  }
  function openBook(s) {
    State.openSefer(s.id, true);
    if (LIB_MAP[s.id]) return libraryReader(LIB_MAP[s.id]);
    reader(s);
  }
  function reader(s) {
    State.openSefer(s.id, true);
    let sq = false;
    const passage = el("div", { class: "reader-text" }, [rashi(s.snippet)]);
    const inner = el("div", { class: "reader" }, [
      el("div", { class: "reader-icon" }, [s.icon]),
      el("h3", {}, [s.name]),
      passage,
      el("div", { class: "reader-actions" }, [
        el("button", { class: "btn ghost", onclick: () => Audio2.speak(s.snippet.replace(/[֑-ׇ]/g, ""), 0.85) }, ["🔊 הַקְרֵא"]),
        el("button", { class: "btn ghost", onclick: (e) => { sq = !sq; passage.innerHTML = ""; passage.appendChild(sq ? square(s.snippet) : rashi(s.snippet)); e.target.textContent = sq ? "✏️ רָשִׁ״י" : "🔤 מְרֻבָּע"; } }, ["🔤 מְרֻבָּע"])
      ]),
      el("p", { class: "reader-blurb" }, [s.blurb])
    ]);
    UI.modal(inner);
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
        el("span", {}, ["🔤 " + p.mastered + " אוֹתִיּוֹת נִשְׁלְטוּ"]),
        el("span", {}, ["🔥 " + p.streak.count + " רֶצֶף"])
      ])
    ]));

    // רצף 14 יום
    body.appendChild(el("h3", { class: "sec" }, ["לוּחַ הַתְמָדָה"]));
    body.appendChild(el("div", { class: "streakcal" }, State.last14().map(d => el("i", { class: d.read ? "on" : "" }, [d.read ? "🕯️" : ""]))));

    // חותמות
    body.appendChild(el("h3", { class: "sec" }, ["חוֹתְמוֹת הַמַּדְפִּיסִים"]));
    body.appendChild(el("div", { class: "seals" }, window.SEALS.map(sl => {
      const has = p.seals.includes(sl.id);
      return el("div", { class: "seal" + (has ? "" : " off"), title: sl.note, onclick: () => UI.toast(has ? sl.note : "עֲדַיִן נָעוּל 🔒") }, [
        el("span", { class: "seal-e" }, [has ? sl.emoji : "🔒"]), el("small", {}, [sl.name])
      ]);
    })));

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

  return { boot, go, world, home, shelf, me, game: (wid, gid) => { const w = window.worldById(wid); Games.play(w.games.find(g => g.id === gid), w); } };
})();

document.addEventListener("DOMContentLoaded", () => App.boot());
