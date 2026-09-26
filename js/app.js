/* Tensorium app shell: floor map, lobby, exhibit pages, routing. */
(function () {
  const { el } = TM;
  const main = document.getElementById("main");
  const mapList = document.getElementById("map-list");
  const total = document.getElementById("passport-total");
  let cleanup = [];
  let currentId = null;

  const exById = (id) => TM.exhibits.find((e) => e.id === id);

  function renderMap() {
    mapList.replaceChildren(
      ...TM.exhibits.map((ex) => {
        const n = TM.stampCount(ex.id);
        const done = n === ex.challenges.length;
        return el(
          "li",
          null,
          el(
            "a",
            {
              class: "map-link",
              href: `#${ex.id}`,
              style: { "--hc": `var(${ex.color})` },
              "aria-current": currentId === ex.id ? "page" : null,
            },
            el("span", { class: "hall-tag" }, ex.hall),
            el("span", null, ex.short || ex.title),
            el("span", { class: `map-count${done ? " done" : ""}` }, `${n}/${ex.challenges.length}`)
          )
        );
      })
    );
    total.textContent = `${TM.totalStamps()} / ${TM.totalChallenges()} stamps`;
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
          el("h1", null, "Every language model is ", el("em", null, "numbers learning to guess the next word.")),
          el(
            "p",
            null,
            "Walk through eight hands-on halls, from a single grid of numbers to a machine that writes. Nothing here is a video: every exhibit is a live model running in your browser. Poke it, break it, and collect a passport stamp for each puzzle you solve."
          ),
          el(
            "div",
            { class: "cta-row" },
            el("a", { class: "btn primary big", href: `#${first.id}` }, `Start at Hall 1: ${first.title}`),
            el("a", { class: "btn big", href: "#arena" }, "Jump to live training")
          )
        ),
        art
      ),
      el(
        "section",
        null,
        el("h2", { class: "route-title" }, "The route"),
        el(
          "p",
          { class: "route-sub" },
          "The halls follow the order a model is built in: data becomes tensors, tensors flow through neurons, a loss tells them how wrong they are, and gradient descent makes them less wrong. Then the language parts: tokens, embeddings, attention, and finally generation."
        )
      ),
      el(
        "div",
        { class: "route" },
        TM.exhibits.map((ex) =>
          el(
            "a",
            { class: "route-card", href: `#${ex.id}`, style: { "--hc": `var(${ex.color})` } },
            el("div", { class: "route-card-top" }, el("span", { class: "hall-tag" }, ex.hall), el("h3", null, ex.title)),
            el("p", null, ex.tagline),
            el(
              "div",
              { class: "dots", "aria-label": `${TM.stampCount(ex.id)} of ${ex.challenges.length} stamps` },
              ex.challenges.map((c) => el("i", { class: TM.hasStamp(ex.id, c.id) ? "on" : "" }))
            )
          )
        )
      )
    );
    main.replaceChildren(page);
    cleanup.push(lobbyArt(art));
  }

  // A small ambient scene: tokens flowing through a stack of layers.
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
      const bg = TM.css("--panel");
      ctx.fillStyle = bg;
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
      ctx.fillText("INPUT", 52, 30);
      ctx.textAlign = "right";
      ctx.fillText("NEXT-TOKEN GUESS", W - 44, 30);
      t++;
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }

  // ---------- Exhibit ----------
  function renderExhibit(ex) {
    const stampEls = {};
    const challengeList = el(
      "ul",
      { class: "challenges" },
      ex.challenges.map((c) => {
        const s = el("div", { class: `stamp${TM.hasStamp(ex.id, c.id) ? " on" : ""}`, "aria-hidden": "true" }, TM.hasStamp(ex.id, c.id) ? "done" : "");
        stampEls[c.id] = s;
        return el(
          "li",
          { class: "challenge" },
          s,
          el("div", null, el("div", { class: "challenge-title" }, c.title), el("div", { class: "challenge-hint" }, c.hint))
        );
      })
    );

    const stage = el("div", { class: "stage" });
    const page = el(
      "div",
      { class: "page", style: { "--accent": `var(${ex.color})` } },
      el(
        "header",
        { class: "placard", style: { "--hc": `var(${ex.color})` } },
        el("span", { class: "hall-tag" }, ex.hall),
        el(
          "div",
          null,
          el("div", { class: "placard-kicker" }, `Hall ${ex.hall}`),
          el("h1", null, ex.title),
          el("p", { class: "tagline" }, ex.tagline)
        )
      ),
      el("section", { class: "intro", html: ex.intro }),
      stage,
      el(
        "div",
        { class: "below" },
        el(
          "section",
          { class: "panel" },
          el("div", { class: "eyebrow" }, "Behind the glass"),
          el("h2", null, ex.explainTitle || "What's really happening"),
          el("div", { class: "explain", html: ex.explain })
        ),
        el(
          "section",
          { class: "panel" },
          el("div", { class: "eyebrow" }, "Passport"),
          el("h2", null, "Challenges"),
          challengeList,
          ex.tries && ex.tries.length
            ? el("div", null, el("div", { class: "eyebrow", style: { marginBottom: "6px" } }, "Also try"), el("ul", { class: "tries" }, ex.tries.map((t) => el("li", null, t))))
            : null,
          ex.next ? el("a", { class: "btn", href: `#${ex.next}` }, `Next: Hall ${exById(ex.next).hall}, ${exById(ex.next).title} →`) : null
        )
      )
    );
    main.replaceChildren(page);
    window.scrollTo(0, 0);

    const onStamp = (d) => {
      if (!d || d.ex !== ex.id || !stampEls[d.ch]) return;
      const s = stampEls[d.ch];
      s.classList.add("on", "fresh");
      s.textContent = "done";
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
    const t = el(
      "div",
      { class: "toast", role: "status", style: { "--accent": `var(${ex.color})` } },
      el("span", { class: "hall-tag", style: { "--hc": `var(${ex.color})`, width: "28px", height: "28px" } }, ex.hall),
      el("div", null, `Stamp earned: ${ch.title}`, el("small", null, `${TM.totalStamps()} of ${TM.totalChallenges()} collected`))
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
      b.textContent = "Click again to erase all stamps";
      setTimeout(() => {
        b.textContent = "Reset passport";
        delete b.dataset.armed;
      }, 3000);
    }
  });

  window.addEventListener("hashchange", route);
  route();
})();
