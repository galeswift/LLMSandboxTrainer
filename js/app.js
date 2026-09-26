/* Tensorium app shell: floor map, lobby, exhibit pages, routing. */
(function () {
  const { el } = TM;
  const main = document.getElementById("main");
  const mapList = document.getElementById("map-list");
  const total = document.getElementById("passport-total");
  let cleanup = [];
  let currentId = null;

  const WINGS = [
    { id: "numbers", name: "Numbers", color: "--h1", blurb: "How a computer holds data: lists, grids, and the multiplying that powers everything." },
    { id: "neurons", name: "Neurons", color: "--h2", blurb: "The tiny building block of every AI: multiply, add, and decide." },
    { id: "learning", name: "Learning", color: "--h3", blurb: "How a model gets less wrong by itself, one small step at a time." },
    { id: "language", name: "Language", color: "--h5", blurb: "Turning words into numbers, and numbers back into words." },
  ];

  // Hall numbers and "next" links follow registration order.
  TM.exhibits.forEach((ex, i) => {
    ex.hall = i + 1;
    ex.nextEx = TM.exhibits[i + 1] || null;
    ex.prevEx = TM.exhibits[i - 1] || null;
  });
  const exById = (id) => TM.exhibits.find((e) => e.id === id);
  const wingOf = (ex) => WINGS.find((w) => w.id === ex.wing) || WINGS[0];
  const mainChallenges = (ex) => ex.challenges.filter((c) => !c.bonus);
  const mainDone = (ex) => mainChallenges(ex).filter((c) => TM.hasStamp(ex.id, c.id)).length;

  function renderMap() {
    const items = [];
    for (const w of WINGS) {
      items.push(el("li", { class: "map-wing" }, `${w.name}`));
      for (const ex of TM.exhibits.filter((e) => e.wing === w.id)) {
        const n = mainDone(ex), m = mainChallenges(ex).length;
        items.push(
          el(
            "li",
            null,
            el(
              "a",
              { class: "map-link", href: `#${ex.id}`, style: { "--hc": `var(${ex.color})` }, "aria-current": currentId === ex.id ? "page" : null },
              el("span", { class: "hall-tag" }, ex.hall),
              el("span", null, ex.short || ex.title),
              el("span", { class: `map-count${n === m ? " done" : ""}` }, n === m ? "✓" : `${n}/${m}`)
            )
          )
        );
      }
    }
    mapList.replaceChildren(...items);
    const allMain = TM.exhibits.reduce((a, ex) => a + mainChallenges(ex).length, 0);
    const gotMain = TM.exhibits.reduce((a, ex) => a + mainDone(ex), 0);
    total.textContent = `${gotMain} / ${allMain} missions`;
  }

  function teardown() {
    cleanup.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
    cleanup = [];
  }

  // ---------- Lobby ----------
  function renderLobby() {
    const art = TM.canvas(480, 360);
    art.classList.add("lobby-art");
    const first = TM.exhibits[0];
    const page = el(
      "div",
      { class: "page" },
      el(
        "section",
        { class: "lobby-hero" },
        el(
          "div",
          null,
          el("h1", null, "An AI chatbot is just ", el("em", null, "numbers learning to guess the next word.")),
          el(
            "p",
            null,
            `Walk through ${TM.exhibits.length} small, hands-on halls and see how it works, one idea at a time. Each hall has a few short missions. If you get stuck, every mission has a "Show me how" button. If you know y = mx + b, you already know enough to start.`
          ),
          el("div", { class: "cta-row" }, el("a", { class: "btn primary big", href: `#${first.id}` }, `Start at Hall 1: ${first.title}`))
        ),
        art
      ),
      ...WINGS.map((w) =>
        el(
          "section",
          { class: "wing", style: { "--hc": `var(${w.color})` } },
          el("div", { class: "wing-head" }, el("h2", { class: "route-title" }, `${w.name} wing`), el("p", { class: "route-sub" }, w.blurb)),
          el(
            "div",
            { class: "route" },
            TM.exhibits
              .filter((ex) => ex.wing === w.id)
              .map((ex) =>
                el(
                  "a",
                  { class: "route-card", href: `#${ex.id}`, style: { "--hc": `var(${ex.color})` } },
                  el("div", { class: "route-card-top" }, el("span", { class: "hall-tag" }, ex.hall), el("h3", null, ex.title)),
                  el("p", null, ex.tagline),
                  el(
                    "div",
                    { class: "dots", "aria-label": `${mainDone(ex)} of ${mainChallenges(ex).length} missions done` },
                    ex.challenges.map((c) => el("i", { class: `${TM.hasStamp(ex.id, c.id) ? "on" : ""}${c.bonus ? " bonus" : ""}` }))
                  )
                )
              )
          )
        )
      )
    );
    main.replaceChildren(page);
    cleanup.push(lobbyArt(art));
  }

  // A small ambient scene: words flowing through a stack of layers.
  function lobbyArt(c) {
    const ctx = c.ctx;
    const W = c.W, H = c.H;
    const words = ["the", "cat", "sat", "on", "the", "mat", "and", "then", "it", "slept"];
    const rng = TM.rng(7);
    const layers = 5;
    const nodes = [];
    for (let l = 0; l < layers; l++) {
      const col = [];
      for (let i = 0; i < 6; i++) col.push([70 + (l * (W - 140)) / (layers - 1), 60 + i * 48]);
      nodes.push(col);
    }
    const weights = [];
    for (let l = 0; l < layers - 1; l++) {
      const m = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) m.push([i, j, rng.normal()]);
      weights.push(m);
    }
    let t = 0, raf;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hues = ["--h1", "--h2", "--h3", "--h4", "--h5"];
    function draw() {
      const ink = TM.css("--ink"), muted = TM.css("--muted");
      ctx.fillStyle = TM.css("--panel");
      ctx.fillRect(0, 0, W, H);
      for (let l = 0; l < layers - 1; l++) {
        for (const [i, j, w] of weights[l]) {
          const a = nodes[l][i], b = nodes[l + 1][j];
          const pulse = 0.5 + 0.5 * Math.sin(t * 0.03 - l * 0.9 + i * 0.7 + j * 0.3);
          ctx.strokeStyle = w > 0 ? TM.css("--pos") : TM.css("--neg");
          ctx.globalAlpha = Math.min(0.55, Math.abs(w) * 0.25) * (0.35 + 0.65 * pulse);
          ctx.lineWidth = 0.6 + Math.abs(w);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      nodes.forEach((col, l) =>
        col.forEach(([x, y], i) => {
          const act = 0.5 + 0.5 * Math.sin(t * 0.04 - l + i * 1.3);
          ctx.fillStyle = TM.css(hues[l]);
          ctx.globalAlpha = 0.25 + 0.75 * act;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        })
      );
      ctx.font = "600 13px " + TM.css("--f-mono");
      ctx.textAlign = "center";
      const k = Math.floor(t / 90) % words.length;
      ctx.fillStyle = muted;
      ctx.fillText(words.slice(Math.max(0, k - 4), k + 1).join(" ") + " →", W / 2 - 40, H - 22);
      ctx.fillStyle = ink;
      ctx.font = "800 15px " + TM.css("--f-mono");
      ctx.fillText(words[(k + 1) % words.length] + "?", W / 2 + 110, H - 22);
      ctx.font = "700 11px " + TM.css("--f-body");
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText("WORDS IN", 44, 30);
      ctx.textAlign = "right";
      ctx.fillText("NEXT-WORD GUESS", W - 44, 30);
      t++;
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }

  // ---------- Exhibit ----------
  function renderExhibit(ex) {
    const wing = wingOf(ex);
    const rows = {};
    const missionList = el("ol", { class: "missions" });
    function paintMissions() {
      const current = ex.challenges.find((c) => !c.bonus && !TM.hasStamp(ex.id, c.id));
      for (const c of ex.challenges) {
        const r = rows[c.id];
        const done = TM.hasStamp(ex.id, c.id);
        r.li.classList.toggle("done", done);
        r.li.classList.toggle("current", c === current);
        r.stamp.classList.toggle("on", done);
        r.stamp.textContent = done ? "done" : c.bonus ? "bonus" : "";
      }
      allDone.hidden = !!current;
    }
    ex.challenges.forEach((c) => {
      const stamp = el("div", { class: "stamp", "aria-hidden": "true" });
      const li = el(
        "li",
        { class: `mission${c.bonus ? " is-bonus" : ""}` },
        stamp,
        el(
          "div",
          { class: "mission-body" },
          el("div", { class: "challenge-title" }, c.bonus ? el("span", { class: "pill" }, "Bonus") : null, " ", c.title),
          el("div", { class: "challenge-hint" }, c.hint),
          c.how ? el("details", { class: "how" }, el("summary", null, "Show me how"), el("p", null, c.how)) : null
        )
      );
      rows[c.id] = { li, stamp };
      missionList.append(li);
    });
    const allDone = el(
      "p",
      { class: "note ok all-done" },
      ex.nextEx ? el("span", null, "All missions done. ", el("a", { href: `#${ex.nextEx.id}` }, `On to Hall ${ex.nextEx.hall}: ${ex.nextEx.title} →`)) : "All missions done. You've walked the whole museum!"
    );

    const stage = el("div", { class: "stage" });
    const page = el(
      "div",
      { class: "page", style: { "--accent": `var(${ex.color})` } },
      el(
        "header",
        { class: "placard", style: { "--hc": `var(${ex.color})` } },
        el("span", { class: "hall-tag" }, ex.hall),
        el("div", null, el("div", { class: "placard-kicker" }, `Hall ${ex.hall} · ${wing.name} wing`), el("h1", null, ex.title), el("p", { class: "tagline" }, ex.tagline))
      ),
      el(
        "div",
        { class: "top-row" },
        el("section", { class: "intro", html: ex.intro }),
        el("section", { class: "panel mission-panel" }, el("div", { class: "eyebrow" }, "Your missions"), missionList, allDone)
      ),
      stage,
      el(
        "div",
        { class: "below" },
        el(
          "details",
          { class: "panel deeper" },
          el("summary", null, el("span", { class: "eyebrow" }, "Go deeper (optional)"), el("h2", null, ex.explainTitle || "What's really happening")),
          el("div", { class: "explain", html: ex.explain })
        ),
        ex.words && ex.words.length
          ? el(
              "section",
              { class: "panel" },
              el("div", { class: "eyebrow" }, "New words"),
              el("dl", { class: "words" }, ex.words.flatMap(([t, d]) => [el("dt", null, t), el("dd", null, d)]))
            )
          : null
      ),
      el(
        "nav",
        { class: "hall-nav", "aria-label": "Hall navigation" },
        ex.prevEx ? el("a", { class: "btn", href: `#${ex.prevEx.id}` }, `← Hall ${ex.prevEx.hall}: ${ex.prevEx.title}`) : el("a", { class: "btn", href: "#" }, "← Lobby"),
        ex.nextEx ? el("a", { class: "btn primary", href: `#${ex.nextEx.id}` }, `Hall ${ex.nextEx.hall}: ${ex.nextEx.title} →`) : el("a", { class: "btn primary", href: "#" }, "Back to the lobby")
      )
    );
    main.replaceChildren(page);
    window.scrollTo(0, 0);
    paintMissions();

    const onStamp = (d) => {
      if (!d || d.ex !== ex.id || !rows[d.ch]) return;
      paintMissions();
      rows[d.ch].stamp.classList.add("fresh");
    };
    TM.on("stamp", onStamp);
    cleanup.push(() => TM.off("stamp", onStamp));

    const ctx = {
      award: (ch) => TM.award(ex.id, ch),
      has: (ch) => TM.hasStamp(ex.id, ch),
      onCleanup: (fn) => cleanup.push(fn),
      loop(fn) {
        let raf, alive = true;
        const tick = (ts) => {
          if (!alive) return;
          fn(ts);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        cleanup.push(() => {
          alive = false;
          cancelAnimationFrame(raf);
        });
      },
      stage,
    };
    try {
      ex.mount(stage, ctx);
    } catch (e) {
      console.error(e);
      stage.append(el("p", { class: "note warn" }, `This exhibit failed to start: ${e.message}`));
    }
  }

  // ---------- Toasts ----------
  let toastTimer;
  TM.on("stamp", (d) => {
    renderMap();
    if (!d) return;
    const ex = exById(d.ex);
    const ch = ex && ex.challenges.find((c) => c.id === d.ch);
    if (!ch) return;
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const left = mainChallenges(ex).length - mainDone(ex);
    const t = el(
      "div",
      { class: "toast", role: "status", style: { "--accent": `var(${ex.color})` } },
      el("span", { class: "hall-tag", style: { "--hc": `var(${ex.color})`, width: "28px", height: "28px" } }, ex.hall),
      el("div", null, `Mission complete: ${ch.title}`, el("small", null, left ? `${left} more in this hall` : "Hall complete!"))
    );
    document.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 3800);
  });

  // ---------- Routing ----------
  function route() {
    teardown();
    const id = (location.hash || "").slice(1);
    const ex = exById(id);
    currentId = ex ? ex.id : null;
    renderMap();
    if (ex) {
      document.title = `${ex.title} · Tensorium`;
      renderExhibit(ex);
    } else {
      document.title = "Tensorium";
      renderLobby();
    }
  }

  document.getElementById("reset-stamps").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed) {
      TM.resetStamps();
      b.textContent = "Reset passport";
      delete b.dataset.armed;
      route();
    } else {
      b.dataset.armed = "1";
      b.textContent = "Click again to erase all progress";
      setTimeout(() => {
        b.textContent = "Reset passport";
        delete b.dataset.armed;
      }, 3000);
    }
  });

  window.addEventListener("hashchange", route);
  route();
})();
