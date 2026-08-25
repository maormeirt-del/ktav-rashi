/* ===========================================================
   ui.js — עזרים משותפים: רינדור, שלד, פופ-אפים, ניווט, סקין.
   =========================================================== */
window.UI = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const screen = () => document.getElementById("screen");
  const fx = () => document.getElementById("fx");

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => c != null && e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }
  const setScreen = (node) => { const s = screen(); s.innerHTML = ""; s.appendChild(node); s.scrollTop = 0; };
  const rashi  = (t, cls) => el("span", { class: "rashi " + (cls || ""), html: t });
  const square = (t, cls) => el("span", { class: "square " + (cls || ""), html: t });
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a, n) => shuffle(a).slice(0, n);

  /* ---- סקין ילד/בוגר ---- */
  function applyMode() { document.documentElement.setAttribute("data-mode", State.mode); }

  /* ---- אפקטים ---- */
  function burst(emoji) {
    const layer = fx(); if (!layer) return;
    const chars = emoji || ["✨", "🌟", "💫", "⭐"];
    for (let i = 0; i < 18; i++) {
      const s = el("span", { class: "spark" }, [chars[i % chars.length]]);
      s.style.left = (10 + Math.random() * 80) + "vw";
      s.style.animationDelay = (Math.random() * 0.25) + "s";
      s.style.fontSize = (16 + Math.random() * 22) + "px";
      layer.appendChild(s);
      setTimeout(() => s.remove(), 1600);
    }
  }
  function toast(msg) {
    const t = el("div", { class: "toast" }, [msg]);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 1800);
  }

  /* ---- פופ-אפ כללי ---- */
  function modal(inner, onClose) {
    const back = el("div", { class: "modal-back" });
    const box = el("div", { class: "modal" }, [inner]);
    back.appendChild(box);
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    function close() { back.classList.remove("show"); setTimeout(() => back.remove(), 250); onClose && onClose(); }
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add("show"));
    return { close, box };
  }

  /* ---- ריקון תור תגמולים (ספר/חותם/מדליה/דרגה) ---- */
  function drainRewards(done) {
    const sefer = State.popSefer();
    if (sefer) return rewardCard({
      kind: "sefer", emoji: sefer.icon, title: "נִפְתַּח סֵפֶר חָדָשׁ!",
      name: sefer.name, note: sefer.blurb, big: true
    }, () => drainRewards(done));
    const seal = State.popSeal();
    if (seal) return rewardCard({ kind: "seal", emoji: seal.emoji, title: "חוֹתָם חָדָשׁ!", name: seal.name, note: seal.note }, () => drainRewards(done));
    const rank = State.popRank();
    if (rank) return rewardCard({ kind: "rank", emoji: rank.emoji, title: "עָלִיתָ דַּרְגָּה!", name: rank.name }, () => drainRewards(done));
    const medal = State.popMedal();
    if (medal) return rewardCard({ kind: "medal", emoji: medal.emoji, title: "מֶדַלְיָה!", name: medal.name }, () => drainRewards(done));
    done && done();
  }
  function rewardCard(o, next) {
    Audio2.sfx[o.kind === "sefer" || o.kind === "seal" ? "unlock" : "reward"]();
    burst(o.kind === "sefer" ? ["📖", "✨", "🕯️", "🌟"] : ["✨", "🌟", "💫"]);
    const inner = el("div", { class: "reward " + o.kind }, [
      el("div", { class: "reward-emoji" }, [o.emoji]),
      el("div", { class: "reward-title" }, [o.title]),
      el("div", { class: "reward-name" }, [o.name]),
      o.note ? el("div", { class: "reward-note" }, [o.note]) : null,
      el("button", { class: "btn primary", onclick: () => { m.close(); } }, ["יֵשׁ!"])
    ]);
    const m = modal(inner, next);
    return m;
  }

  /* ---- הידר עליון: דרגה + נקודות + רצף ---- */
  function header() {
    const p = State.progress, r = State.rank(), n = State.nextRank();
    const bar = el("div", { class: "rankbar" }, [
      el("i", { style: `width:${Math.round(State.rankProgress() * 100)}%` })
    ]);
    return el("header", { class: "topbar" }, [
      el("div", { class: "rank" }, [
        el("span", { class: "rank-emoji" }, [r.emoji]),
        el("div", {}, [ el("b", {}, [r.name]), bar,
          n ? el("small", {}, [`${n.min - p.points} נק׳ לְ${n.name}`]) : el("small", {}, ["הַדַּרְגָּה הָעֶלְיוֹנָה!"]) ])
      ]),
      el("div", { class: "stats" }, [
        el("span", { class: "chip" }, ["🔥 " + p.streak.count]),
        el("span", { class: "chip pts" }, ["✦ " + p.points])
      ])
    ]);
  }

  /* ---- ניווט תחתון ---- */
  function nav(active) {
    const items = [
      { id: "home",  emoji: "🗺️", label: "מַסָּע" },
      { id: "beit",  emoji: "📖", label: "מִדְרָשׁ" },
      { id: "games", emoji: "🎲", label: "מִשְׂחָקִים" },
      { id: "shelf", emoji: "📚", label: "אָרוֹן" },
      { id: "me",    emoji: "🏅", label: "הֶשֵּׂגִים" }
    ];
    return el("nav", { class: "bottomnav" }, items.map(it =>
      el("button", { class: "navbtn" + (active === it.id ? " on" : ""), onclick: () => App.go(it.id) }, [
        el("span", { class: "ne" }, [it.emoji]), el("span", {}, [it.label])
      ])));
  }

  /* ---- מעטפת מסך (הידר + תוכן + ניווט) ---- */
  function page(active, body) {
    const wrap = el("div", { class: "page" }, [header(), body, nav(active)]);
    setScreen(wrap);
  }

  return { el, setScreen, page, header, nav, rashi, square, shuffle, pick, applyMode, burst, toast, modal, drainRewards, $ };
})();
