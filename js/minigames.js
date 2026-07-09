/* ===========================================================
   minigames.js — אולם משחקי חשיבה. כל משחק מול המחשב,
   נעול עד סף נקודות, וההסבר בכתב רש״י.
   =========================================================== */
window.GameHall = (function () {
  const el = UI.el, rashi = UI.rashi, shuffle = UI.shuffle, pick = UI.pick;
  const NAME = (c) => (window.LETTER_BY_CHAR[c] || {}).name || c;
  const clear = (h) => { h.innerHTML = ""; return h; };
  const rnd = (n) => Math.floor(Math.random() * n);

  function onSwipe(elm, cb) {
    let sx, sy;
    elm.addEventListener("touchstart", e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    elm.addEventListener("touchend", e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }, { passive: true });
  }

  /* ---------------- אולם ---------------- */
  function hall() {
    const pts = State.progress.points;
    const body = el("div", { class: "hallscr" });
    body.appendChild(el("h2", { class: "map-title" }, ["אוּלַם הַמִּשְׂחָקִים 🎲"]));
    body.appendChild(el("p", { class: "sub-lead" }, [`מִשְׂחֲקֵי חֲשִׁיבָה — נִפְתָּחִים לְפִי נְקֻדּוֹת. יֵשׁ לְךָ ✦ ${pts}. הַהֶסְבֵּרִים בִּכְתָב רָשִׁ״י!`]));
    const grid = el("div", { class: "hall-grid" });
    window.GAMEHALL.forEach(g => {
      const open = pts >= g.unlock;
      const card = el("button", { class: "hgame" + (open ? "" : " locked"), onclick: () => open ? intro(g) : UI.toast(`נִפְתָּח בְּ-${g.unlock} נְקֻדּוֹת (חָסֵר ${g.unlock - pts})`) }, [
        el("span", { class: "hg-emoji" }, [open ? g.emoji : "🔒"]),
        el("span", { class: "hg-name" }, [g.name]),
        el("span", { class: "hg-tag" }, [open ? "שַׂחֵק ›" : `${g.unlock} נק׳`])
      ]);
      if (!open) {
        const prog = Math.min(1, pts / g.unlock);
        card.appendChild(el("span", { class: "hg-bar" }, [el("i", { style: `width:${Math.round(prog * 100)}%` })]));
      }
      grid.appendChild(card);
    });
    body.appendChild(grid);
    UI.setScreen(el("div", { class: "page" }, [body, UI.nav("games")]));
    UI.drainRewards();
  }

  function frame(g, bodyFn) {
    const body = el("div", { class: "mg-body" });
    UI.setScreen(el("div", { class: "page" }, [
      el("div", { class: "mg" }, [
        el("div", { class: "game-top" }, [
          el("button", { class: "back", onclick: () => hall() }, ["›"]),
          el("div", { class: "game-title" }, [g.emoji + " " + g.name])
        ]),
        body
      ]),
      UI.nav("games")
    ]));
    return body;
  }

  /* מסך הסבר — בכתב רש״י */
  function intro(g) {
    const body = frame(g, () => {});
    const daf = el("div", { class: "daf" });
    const txt = el("div", { class: "rules-rashi" }, [
      el("span", { class: "rlabel" }, ["הַהֶסְבֵּר"]),
      (() => { const s = el("span", { class: "rt" }); s.textContent = g.rules; return s; })()
    ]);
    daf.appendChild(txt);
    let sq = false;
    const toggle = el("button", { class: "sq-toggle", onclick: () => { sq = !sq; daf.classList.toggle("show-square", sq); toggle.textContent = sq ? "✏️ חֲזֹר לְרָשִׁ״י" : "🔤 הַצֵּג מְרֻבָּע"; } }, ["🔤 הַצֵּג מְרֻבָּע"]);
    body.appendChild(el("p", { class: "lead dim" }, ["קְרָא אֶת הַחֻקִּים בִּכְתָב רָשִׁ״י:"]));
    body.appendChild(daf);
    body.appendChild(el("div", { class: "daf-tools" }, [toggle]));
    body.appendChild(el("button", { class: "btn primary big", onclick: () => GAMES[g.id](clear(frame(g, () => {}))) }, ["הַתְחֵל מִשְׂחָק ›"]));
  }

  function endBanner(host, msg, reward, again) {
    const b = el("div", { class: "mg-end" }, [ el("div", {}, [msg]) ]);
    if (reward) { State.award(reward); UI.burst(); Audio2.sfx.reward(); b.appendChild(el("small", {}, ["+" + reward + " נְקֻדּוֹת"])); }
    b.appendChild(el("button", { class: "btn primary sm", onclick: again }, ["שׁוּב"]));
    host.appendChild(b);
  }

  /* ==================== 1. איקס עיגול ==================== */
  function tic(host) {
    let b = Array(9).fill(""), over = false; const H = "X", A = "O";
    const status = el("div", { class: "mg-status" }, ["תּוֹרְךָ (X)"]);
    const grid = el("div", { class: "tic" });
    host.appendChild(status); host.appendChild(grid); render();
    function render() {
      grid.innerHTML = "";
      b.forEach((v, i) => { const c = el("button", { class: "tic-c" + (v ? " f " + v : "") }, [v]); c.onclick = () => play(i); grid.appendChild(c); });
    }
    function play(i) {
      if (over || b[i]) return; b[i] = H; Audio2.sfx.tap(); render();
      let w = win(b); if (w) return done(w); if (full(b)) return done("draw");
      const m = Math.random() < 0.25 ? randMove(b) : bestMove(b); if (m > -1) b[m] = A; render();
      w = win(b); if (w) return done(w); if (full(b)) return done("draw");
    }
    function done(w) { over = true; status.textContent = w === "draw" ? "תֵּיקוּ!" : (w === H ? "נִצַּחְתָּ! 🎉" : "הַמַּחְשֵׁב נִצַּח"); endBanner(host, "", w === H ? 8 : 0, () => tic(clear(host))); }
    function randMove(bd) { const e = bd.map((v, i) => v ? -1 : i).filter(i => i >= 0); return e.length ? e[rnd(e.length)] : -1; }
    function bestMove(bd) { let bs = -1e9, mv = -1; for (let i = 0; i < 9; i++) if (!bd[i]) { bd[i] = A; const s = mm(bd, false); bd[i] = ""; if (s > bs) { bs = s; mv = i; } } return mv; }
    function mm(bd, mx) { const w = win(bd); if (w === A) return 10; if (w === H) return -10; if (full(bd)) return 0;
      let best = mx ? -1e9 : 1e9;
      for (let i = 0; i < 9; i++) if (!bd[i]) { bd[i] = mx ? A : H; const s = mm(bd, !mx); bd[i] = ""; best = mx ? Math.max(best, s) : Math.min(best, s); } return best; }
  }
  function win(b) { const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [x, y, z] of L) if (b[x] && b[x] === b[y] && b[y] === b[z]) return b[x]; return null; }
  function full(b) { return b.every(Boolean); }

  /* ==================== 2. זיכרון ==================== */
  function memory(host) {
    const chars = pick(window.LETTERS.map(l => l.c), 6);
    let cards = []; chars.forEach(c => { cards.push({ c, f: "r" }); cards.push({ c, f: "s" }); }); cards = shuffle(cards);
    let flip = [], matched = 0, moves = 0, lock = false;
    const status = el("div", { class: "mg-status" }); const grid = el("div", { class: "mem" });
    host.appendChild(status); host.appendChild(grid);
    const cells = cards.map((card, i) => { const btn = el("button", { class: "mem-c" }, [""]); btn.onclick = () => turn(i, btn, card); grid.appendChild(btn); return btn; });
    upd();
    function face(card) { return card.f === "r" ? '<span class="rashi">' + card.c + '</span>' : '<span class="square">' + card.c + '</span>'; }
    function turn(i, btn, card) {
      if (lock || btn.classList.contains("m") || btn.classList.contains("o")) return;
      btn.classList.add("o"); btn.innerHTML = face(card); Audio2.sfx.tap(); flip.push({ btn, card });
      if (flip.length === 2) {
        lock = true; moves++; upd(); const [a, d] = flip;
        if (a.card.c === d.card.c && a.card.f !== d.card.f) {
          setTimeout(() => { a.btn.classList.add("m"); d.btn.classList.add("m"); Audio2.sfx.correct(); Audio2.speak(NAME(a.card.c)); matched++; flip = []; lock = false; upd(); if (matched === 6) endBanner(host, `כָּל הַכָּבוֹד! ${moves} הֲפִיכוֹת`, 8, () => memory(clear(host))); }, 450);
        } else {
          setTimeout(() => { a.btn.classList.remove("o"); d.btn.classList.remove("o"); a.btn.innerHTML = ""; d.btn.innerHTML = ""; Audio2.sfx.wrong(); flip = []; lock = false; }, 800);
        }
      }
    }
    function upd() { status.textContent = `זוּגוֹת: ${matched}/6 · הֲפִיכוֹת: ${moves}`; }
  }

  /* ==================== 3. חידת ההזזה (15) ==================== */
  function slide(host) {
    let b; do { b = shuffle([...Array(15).keys()].map(x => x + 1).concat(0)); } while (!solvable(b) || solved(b));
    let moves = 0;
    const status = el("div", { class: "mg-status" }); const grid = el("div", { class: "slide" });
    host.appendChild(status); host.appendChild(grid); render();
    function render() {
      grid.innerHTML = "";
      b.forEach((v, i) => { const c = el("button", { class: "slide-c" + (v ? "" : " blank") }, [v ? String(v) : ""]); c.onclick = () => mv(i); grid.appendChild(c); });
      status.textContent = solved(b) ? `פָּתַרְתָּ! ${moves} מַהֲלָכִים 🎉` : `מַהֲלָכִים: ${moves}`;
    }
    function mv(i) { const z = b.indexOf(0); const ri = i / 4 | 0, ci = i % 4, rz = z / 4 | 0, cz = z % 4;
      if (Math.abs(ri - rz) + Math.abs(ci - cz) === 1) { [b[i], b[z]] = [b[z], b[i]]; moves++; Audio2.sfx.tap(); render(); if (solved(b)) endBanner(host, "", 7, () => slide(clear(host))); } }
    function solved(a) { for (let i = 0; i < 15; i++) if (a[i] !== i + 1) return false; return a[15] === 0; }
    function solvable(a) { let inv = 0; const f = a.filter(x => x); for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++; const br = 4 - (a.indexOf(0) / 4 | 0); return (inv + br) % 2 === 0; }
  }

  /* ==================== 4. 2048 ==================== */
  function g2048(host) {
    let g = Array(16).fill(0), score = 0, over = false, won = false;
    const status = el("div", { class: "mg-status" }); const grid = el("div", { class: "g2048" });
    host.appendChild(status); host.appendChild(grid);
    const pad = el("div", { class: "g2048-pad" }, [
      btn("▲", "up"), el("div", { class: "pad-row" }, [btn("◀", "left"), btn("▼", "down"), btn("▶", "right")])
    ]);
    host.appendChild(pad); onSwipe(grid, move);
    add(); add(); render();
    function btn(t, d) { return el("button", { class: "padbtn", onclick: () => move(d) }, [t]); }
    function render() { grid.innerHTML = ""; g.forEach(v => grid.appendChild(el("div", { class: "cell2 v" + v }, [v ? String(v) : ""]))); status.textContent = `נִקּוּד: ${score}` + (over ? " · נִגְמַר!" : ""); }
    function add() { const e = g.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) g[e[rnd(e.length)]] = Math.random() < 0.9 ? 2 : 4; }
    const ix = (r, c) => r * 4 + c;
    function rows(dir) { const R = []; for (let i = 0; i < 4; i++) { const r = []; for (let j = 0; j < 4; j++) r.push(g[cell(dir, i, j)]); R.push(r); } return R; }
    function put(dir, R) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g[cell(dir, i, j)] = R[i][j]; }
    function cell(dir, i, j) { if (dir === "left") return ix(i, j); if (dir === "right") return ix(i, 3 - j); if (dir === "up") return ix(j, i); return ix(3 - j, i); }
    function move(dir) {
      if (over) return; const before = g.join();
      const R = rows(dir).map(r => { let a = r.filter(x => x); for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; score += a[i]; a.splice(i + 1, 1); } while (a.length < 4) a.push(0); return a; });
      put(dir, R);
      if (g.join() !== before) { add(); Audio2.sfx.tap(); if (!won && g.includes(2048)) { won = true; UI.burst(); Audio2.sfx.reward(); State.award(20); UI.toast("2048! +20 נְקֻדּוֹת 🎉"); } if (!canMove()) over = true; }
      render();
    }
    function canMove() { if (g.includes(0)) return true; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { if (c < 3 && g[ix(r, c)] === g[ix(r, c + 1)]) return true; if (r < 3 && g[ix(r, c)] === g[ix(r + 1, c)]) return true; } return false; }
  }

  /* ==================== 5. ארבע בשורה ==================== */
  function connect4(host) {
    const C = 7, R = 6; let b = Array.from({ length: C }, () => []), over = false, thinking = false;
    const status = el("div", { class: "mg-status" }, ["תּוֹרְךָ (אָדֹם)"]); const grid = el("div", { class: "c4" });
    host.appendChild(status); host.appendChild(grid); render();
    function render() {
      grid.innerHTML = "";
      for (let r = R - 1; r >= 0; r--) for (let c = 0; c < C; c++) { const v = b[c][r] || ""; const cell = el("button", { class: "c4-c" + (v ? " " + v : "") }, [""]); cell.onclick = () => drop(c); grid.appendChild(cell); }
    }
    function drop(c) {
      if (over || thinking || b[c].length >= R) return; b[c].push("r"); Audio2.sfx.tap(); render();
      if (chk("r")) return end("r"); if (draw()) return end("draw");
      thinking = true; status.textContent = "הַמַּחְשֵׁב חוֹשֵׁב…";
      setTimeout(() => {
        const m = think(); if (m > -1) b[m].push("y"); render(); thinking = false;
        if (chk("y")) return end("y"); if (draw()) return end("draw");
        status.textContent = "תּוֹרְךָ (אָדֹם)";
      }, 30);
    }
    /* AI: minimax + alpha-beta (רואה קדימה → חוסם גם איום כפול) */
    function think() {
      const legal = moves(); if (!legal.length) return -1;
      for (const c of legal) { b[c].push("y"); const w = chk("y"); b[c].pop(); if (w) return c; }   // נצח מיד
      for (const c of legal) { b[c].push("r"); const w = chk("r"); b[c].pop(); if (w) return c; }   // חסום מיד
      let best = -Infinity, mv = legal[0];
      for (const c of legal) { b[c].push("y"); const s = negamax(4, -Infinity, Infinity, "r"); b[c].pop(); if (s > best) { best = s; mv = c; } }
      return mv;
    }
    function moves() { const m = []; for (const c of [3, 2, 4, 1, 5, 0, 6]) if (b[c].length < R) m.push(c); return m; }
    function negamax(depth, alpha, beta, turn) {
      if (chk("y")) return 100000 + depth;
      if (chk("r")) return -100000 - depth;
      const legal = moves(); if (!legal.length || depth === 0) return heur();
      if (turn === "y") { let v = -Infinity; for (const c of legal) { b[c].push("y"); v = Math.max(v, negamax(depth - 1, alpha, beta, "r")); b[c].pop(); alpha = Math.max(alpha, v); if (alpha >= beta) break; } return v; }
      let v = Infinity; for (const c of legal) { b[c].push("r"); v = Math.min(v, negamax(depth - 1, alpha, beta, "y")); b[c].pop(); beta = Math.min(beta, v); if (alpha >= beta) break; } return v;
    }
    function heur() {
      let s = 0; const at = (c, r) => (b[c] && b[c][r]) || "";
      for (let r = 0; r < R; r++) { if (at(3, r) === "y") s += 3; else if (at(3, r) === "r") s -= 3; }
      for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) for (const [dc, dr] of [[1,0],[0,1],[1,1],[1,-1]]) {
        let me = 0, op = 0, ok = true;
        for (let k = 0; k < 4; k++) { const cc = c + dc * k, rr = r + dr * k; if (cc < 0 || cc >= C || rr < 0 || rr >= R) { ok = false; break; } const v = at(cc, rr); if (v === "y") me++; else if (v === "r") op++; }
        if (!ok || (me && op)) continue;
        if (me === 3) s += 50; else if (me === 2) s += 8; else if (me === 1) s += 1;
        if (op === 3) s -= 60; else if (op === 2) s -= 10; else if (op === 1) s -= 1;
      }
      return s;
    }
    function chk(p) { const at = (c, r) => (b[c] && b[c][r]) || "";
      for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) { if (at(c, r) !== p) continue; for (const [dc, dr] of [[1,0],[0,1],[1,1],[1,-1]]) { let k = 1; while (k < 4 && at(c + dc * k, r + dr * k) === p) k++; if (k === 4) return true; } } return false; }
    function draw() { return b.every(col => col.length >= R); }
    function end(w) { over = true; status.textContent = w === "draw" ? "תֵּיקוּ!" : (w === "r" ? "נִצַּחְתָּ! 🎉" : "הַמַּחְשֵׁב נִצַּח"); endBanner(host, "", w === "r" ? 10 : 0, () => connect4(clear(host))); }
  }

  /* ==================== 6. דמקה ==================== */
  function checkers(host) {
    // 8x8; '' empty, w/W human (bottom, moves up), b/B ai (top, moves down)
    let bd = Array.from({ length: 8 }, () => Array(8).fill(""));
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) bd[r][c] = "b";
    for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) bd[r][c] = "w";
    let sel = null, over = false;
    const status = el("div", { class: "mg-status" }, ["תּוֹרְךָ"]); const grid = el("div", { class: "checkers" });
    host.appendChild(status); host.appendChild(grid);
    const own = (p, me) => p && (me === "w" ? "wW".includes(p) : "bB".includes(p));
    const king = (p) => p === p.toUpperCase() && p !== "";
    setTimeout(render, 0);
    function dirs(p) { const d = []; if (p === "w" || king(p)) d.push([-1, -1], [-1, 1]); if (p === "b" || king(p)) d.push([1, -1], [1, 1]); return d; }
    function moves(me, jumpsOnly) {
      const steps = [], jumps = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = bd[r][c]; if (!own(p, me)) continue;
        for (const [dr, dc] of dirs(p)) {
          const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc;
          if (in8(r2, c2) && bd[r2][c2] === "" && own(bd[r1] && bd[r1][c1], me === "w" ? "b" : "w")) jumps.push({ from: [r, c], to: [r2, c2], cap: [r1, c1] });
          else if (!jumpsOnly && in8(r1, c1) && bd[r1][c1] === "") steps.push({ from: [r, c], to: [r1, c1] });
        } }
      return jumps.length ? jumps : (jumpsOnly ? [] : steps);
    }
    function in8(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    function render() {
      grid.innerHTML = "";
      const legal = sel ? moves("w").filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]) : [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const dark = (r + c) % 2 === 1; const p = bd[r][c];
        const cell = el("button", { class: "ck-c " + (dark ? "dark" : "light") }, []);
        if (sel && sel[0] === r && sel[1] === c) cell.classList.add("sel");
        if (legal.some(m => m.to[0] === r && m.to[1] === c)) cell.classList.add("hint");
        if (p) cell.appendChild(el("span", { class: "ck-p " + (own(p, "w") ? "wp" : "bp") + (king(p) ? " kg" : "") }, [king(p) ? "♛" : "●"]));
        cell.onclick = () => tap(r, c); grid.appendChild(cell);
      }
    }
    function tap(r, c) {
      if (over) return; const p = bd[r][c];
      if (own(p, "w")) { sel = [r, c]; return render(); }
      if (!sel) return;
      const legal = moves("w").filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]);
      const m = legal.find(x => x.to[0] === r && x.to[1] === c);
      if (!m) return;
      doMove(m, "w"); Audio2.sfx.tap();
      // multi-jump?
      if (m.cap) { const more = moves("w", true).filter(x => x.from[0] === m.to[0] && x.from[1] === m.to[1]); if (more.length) { sel = [m.to[0], m.to[1]]; render(); return; } }
      sel = null; render();
      if (!moves("b").length) return finish("w");
      setTimeout(aiTurn, 350);
    }
    function doMove(m, me) {
      const [fr, fc] = m.from, [tr, tc] = m.to; bd[tr][tc] = bd[fr][fc]; bd[fr][fc] = "";
      if (m.cap) { bd[m.cap[0]][m.cap[1]] = ""; Audio2.sfx.correct(); }
      if (me === "w" && tr === 0) bd[tr][tc] = "W"; if (me === "b" && tr === 7) bd[tr][tc] = "B";
    }
    function aiTurn() {
      let mv = moves("b"); if (!mv.length) return finish("w");
      let m = mv[rnd(mv.length)]; doMove(m, "b");
      // continue jump chain
      while (m.cap) { const more = moves("b", true).filter(x => x.from[0] === m.to[0] && x.from[1] === m.to[1]); if (!more.length) break; m = more[rnd(more.length)]; doMove(m, "b"); }
      render(); if (!moves("w").length) return finish("b"); status.textContent = "תּוֹרְךָ";
    }
    function finish(w) { over = true; status.textContent = w === "w" ? "נִצַּחְתָּ! 🎉" : "הַמַּחְשֵׁב נִצַּח"; endBanner(host, "", w === "w" ? 14 : 0, () => checkers(clear(host))); }
  }

  /* ==================== 7. שחמט (מפושט) ==================== */
  function chess(host) {
    // row0=top(black), row7=bottom(white). Uppercase=white, lowercase=black.
    let bd = [
      ["r","n","b","q","k","b","n","r"],
      ["p","p","p","p","p","p","p","p"],
      ["","","","","","","",""],["","","","","","","",""],
      ["","","","","","","",""],["","","","","","","",""],
      ["P","P","P","P","P","P","P","P"],
      ["R","N","B","Q","K","B","N","R"]
    ];
    // גליפים מלאים (צלליות Staunton) לשני הצבעים — נצבעים בגוון עץ ע״י CSS
    const GL = { K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟", k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟" };
    let sel = null, over = false;
    const status = el("div", { class: "mg-status" }, ["תּוֹרְךָ (לָבָן)"]); const grid = el("div", { class: "chess" });
    host.appendChild(status); host.appendChild(el("div", { class: "chess-stage" }, [grid]));
    const white = (p) => p && p === p.toUpperCase();
    const black = (p) => p && p === p.toLowerCase();
    const mine = (p) => white(p);
    setTimeout(render, 0);
    function render() {
      grid.innerHTML = "";
      const legal = sel ? pieceMoves(sel[0], sel[1]) : [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const dark = (r + c) % 2 === 1; const p = bd[r][c];
        const cell = el("button", { class: "ch-c " + (dark ? "dark" : "light") }, []);
        if (sel && sel[0] === r && sel[1] === c) cell.classList.add("sel");
        if (legal.some(m => m[0] === r && m[1] === c)) cell.classList.add("hint");
        if (p) cell.appendChild(el("span", { class: "ch-p " + (white(p) ? "wp" : "bp") }, [GL[p]]));
        cell.onclick = () => tap(r, c); grid.appendChild(cell);
      }
    }
    function tap(r, c) {
      if (over) return; const p = bd[r][c];
      if (mine(p)) { sel = [r, c]; return render(); }
      if (!sel) return;
      if (pieceMoves(sel[0], sel[1]).some(m => m[0] === r && m[1] === c)) {
        move(sel[0], sel[1], r, c); Audio2.sfx.tap(); sel = null; render();
        if (kingGone("k")) return finish("w");
        status.textContent = "הַמַּחְשֵׁב חוֹשֵׁב…"; setTimeout(aiTurn, 400);
      }
    }
    function move(fr, fc, tr, tc) { let p = bd[fr][fc]; bd[tr][tc] = p; bd[fr][fc] = "";
      if (p === "P" && tr === 0) bd[tr][tc] = "Q"; if (p === "p" && tr === 7) bd[tr][tc] = "q"; }
    function kingGone(k) { return !bd.flat().includes(k); }
    function pieceMoves(r, c) {
      const p = bd[r][c]; if (!p) return []; const wh = white(p); const out = [];
      const add = (rr, cc) => { if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return false; const t = bd[rr][cc]; if (!t) { out.push([rr, cc]); return true; } if (white(t) !== wh) out.push([rr, cc]); return false; };
      const ray = (drs) => { for (const [dr, dc] of drs) { let rr = r + dr, cc = c + dc; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const t = bd[rr][cc]; if (!t) out.push([rr, cc]); else { if (white(t) !== wh) out.push([rr, cc]); break; } rr += dr; cc += dc; } } };
      const t = p.toUpperCase();
      if (t === "P") { const dir = wh ? -1 : 1, sr = wh ? 6 : 1;
        if (inb(r + dir, c) && !bd[r + dir][c]) { out.push([r + dir, c]); if (r === sr && !bd[r + 2 * dir][c]) out.push([r + 2 * dir, c]); }
        for (const dc of [-1, 1]) { const rr = r + dir, cc = c + dc; if (inb(rr, cc) && bd[rr][cc] && white(bd[rr][cc]) !== wh) out.push([rr, cc]); } }
      else if (t === "N") { for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r + dr, c + dc); }
      else if (t === "B") ray([[-1,-1],[-1,1],[1,-1],[1,1]]);
      else if (t === "R") ray([[-1,0],[1,0],[0,-1],[0,1]]);
      else if (t === "Q") ray([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      else if (t === "K") for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r + dr, c + dc);
      return out;
    }
    function inb(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    const VAL = { P:1, N:3, B:3, R:5, Q:9, K:100 };
    function aiTurn() {
      // gather all black moves, pick best by captured value (greedy), else random
      let best = [], bestScore = -1;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (black(bd[r][c])) {
        for (const [tr, tc] of pieceMoves(r, c)) { const target = bd[tr][tc]; const sc = target ? VAL[target.toUpperCase()] : 0;
          if (sc > bestScore) { bestScore = sc; best = [[r, c, tr, tc]]; } else if (sc === bestScore) best.push([r, c, tr, tc]); } }
      if (!best.length) return finish("w");
      const [fr, fc, tr, tc] = best[rnd(best.length)]; move(fr, fc, tr, tc); render();
      if (kingGone("K")) return finish("b"); status.textContent = "תּוֹרְךָ (לָבָן)";
    }
    function finish(w) { over = true; status.textContent = w === "w" ? "מָט! נִצַּחְתָּ 🎉" : "הַמַּחְשֵׁב נִצַּח"; endBanner(host, "", w === "w" ? 18 : 0, () => chess(clear(host))); }
  }

  const GAMES = { tic, memory, slide, g2048, connect4, checkers, chess };
  return { hall, play(id) { const g = window.GAMEHALL.find(x => x.id === id); if (g) GAMES[id](clear(frame(g, () => {}))); } };
})();
