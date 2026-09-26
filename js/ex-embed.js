/* Hall 6: Embedding Space — words as vectors, similarity, analogies, PCA. */
(function () {
  const { el } = TM;
  const DIMS = ["royalty", "gender", "adulthood", "person", "animal", "feline", "canine", "food", "sweetness", "place", "city", "france", "japan", "italy"];
  const D = (o) => DIMS.map((d) => o[d] || 0);
  const WORDS = {
    king: { royalty: 1, gender: 1, adulthood: 1, person: 1 },
    queen: { royalty: 1, gender: -1, adulthood: 1, person: 1 },
    prince: { royalty: 1, gender: 1, person: 1 },
    princess: { royalty: 1, gender: -1, person: 1 },
    man: { gender: 1, adulthood: 1, person: 1 },
    woman: { gender: -1, adulthood: 1, person: 1 },
    boy: { gender: 1, person: 1 },
    girl: { gender: -1, person: 1 },
    dog: { animal: 1, canine: 1, adulthood: 1 },
    puppy: { animal: 1, canine: 1 },
    cat: { animal: 1, feline: 1, adulthood: 1 },
    kitten: { animal: 1, feline: 1 },
    lion: { animal: 1, feline: 1, adulthood: 1, royalty: 0.4 },
    apple: { food: 1, sweetness: 0.5 },
    cake: { food: 1, sweetness: 1 },
    bread: { food: 1 },
    croissant: { food: 1, france: 1 },
    sushi: { food: 1, japan: 1 },
    pizza: { food: 1, italy: 1 },
    france: { place: 1, france: 1 },
    paris: { place: 1, city: 1, france: 1 },
    japan: { place: 1, japan: 1 },
    tokyo: { place: 1, city: 1, japan: 1 },
    italy: { place: 1, italy: 1 },
    rome: { place: 1, city: 1, italy: 1 },
  };
  const CAT = (w) => (WORDS[w].person ? "people" : WORDS[w].animal ? "animals" : WORDS[w].food ? "food" : "places");
  const CAT_COLOR = { people: "--h1", animals: "--h4", food: "--h3", places: "--h6" };
  const names = Object.keys(WORDS);
  const clean = Object.fromEntries(names.map((w) => [w, D(WORDS[w])]));
  const rng = TM.rng(42);
  const vec = Object.fromEntries(names.map((w) => [w, clean[w].map((v) => v + rng.normal() * 0.06)]));

  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const norm = (a) => Math.sqrt(dot(a, a));
  const cos = (a, b) => dot(a, b) / (norm(a) * norm(b) || 1);

  function pca(vs) {
    const n = vs.length, d = vs[0].length;
    const mean = Array(d).fill(0);
    vs.forEach((v) => v.forEach((x, i) => (mean[i] += x / n)));
    const X = vs.map((v) => v.map((x, i) => x - mean[i]));
    const C = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) / n));
    const comps = [];
    for (let c = 0; c < 2; c++) {
      let v = Array.from({ length: d }, (_, i) => Math.sin(i + 1 + c));
      for (let it = 0; it < 200; it++) {
        let w = C.map((row) => dot(row, v));
        for (const p of comps) {
          const k = dot(w, p);
          w = w.map((x, i) => x - k * p[i]);
        }
        const nn = norm(w) || 1;
        v = w.map((x) => x / nn);
      }
      comps.push(v);
    }
    return { mean, comps };
  }
  const P = pca(names.map((w) => vec[w]));

  TM.register({
    id: "embed",
    hall: 6,
    title: "Embedding Space",
    short: "Embeddings",
    color: "--h6",
    next: "attention",
    tagline: "Each token becomes a point in space, and nearby points mean similar things.",
    intro:
      "<p>After tokenizing, the model looks up each token ID in a big table and gets back a list of numbers: its <b>embedding</b>. Directions in that space end up carrying meaning. Words used in similar ways land near each other, and relationships become arrows you can add and subtract.</p><p>These 25 words live in a 14-dimensional space. Real models use thousands of dimensions, but the math is the same. Pick two dimensions to look through, click a word to inspect it, and try vector arithmetic below.</p>",
    explainTitle: "Meaning as geometry",
    explain:
      "<p>A real model is never told what its dimensions mean. It starts with random vectors and training nudges them so that predicting the next token gets easier. Meaningful directions come out as a side effect. For this exhibit we labeled the dimensions by hand (plus a little noise) so you can see what's going on.</p><ul><li><b>Similarity</b> is usually measured with <b>cosine similarity</b>: the angle between two vectors. 1 means the same direction, 0 means unrelated.</li><li><b>Analogies</b> work because a relationship is a consistent offset. <code>king − man</code> leaves roughly \"royalty\"; adding <code>woman</code> lands near <code>queen</code>. In real models this works often but not always.</li><li><b>PCA</b> finds the two directions along which the points spread out the most. It's how researchers get a first look at an embedding space too big to picture.</li><li>In an LLM this lookup table is just the first layer, and it's learned by gradient descent like every other weight.</li></ul>",
    challenges: [
      { id: "inspect", title: "Look inside a word", hint: "Click any word to see its vector and nearest neighbors." },
      { id: "analogy", title: "Land an analogy", hint: "Build your own A − B + C that lands exactly on the right answer." },
      { id: "cross", title: "Beyond royalty", hint: "Land an analogy whose answer is a food or a place." },
      { id: "pca", title: "Let the data choose", hint: "Switch to the PCA view." },
    ],
    tries: ["puppy − dog + cat", "sushi − japan + italy", "paris − france + japan", "Put 'animal' on one axis and 'person' on the other and see the clusters separate."],
    mount(stage, ctx) {
      const s = { view: "axes", ax: "gender", ay: "royalty", sel: "queen", a: "king", b: "man", c: "woman" };
      const W = 520, H = 400;
      const cv = TM.canvas(W, H);
      const vecBox = el("div", { class: "controls" });
      const nnBox = el("div", { class: "bars" });
      const resBox = el("div", { class: "bars" });
      const resNote = el("p", { class: "note" });
      let result = null;

      const proj = (v) => {
        if (s.view === "pca") {
          const c = v.map((x, i) => x - P.mean[i]);
          return [dot(c, P.comps[0]), dot(c, P.comps[1])];
        }
        return [v[DIMS.indexOf(s.ax)], v[DIMS.indexOf(s.ay)]];
      };

      function draw() {
        const c = cv.ctx;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, W, H);
        const pts = names.map((w) => proj(vec[w]));
        if (result) pts.push(proj(result.v));
        let x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
        let y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
        const padx = (x1 - x0 || 1) * 0.15, pady = (y1 - y0 || 1) * 0.15;
        x0 -= padx; x1 += padx; y0 -= pady; y1 += pady;
        const tx = (x) => 30 + ((x - x0) / (x1 - x0)) * (W - 60);
        const ty = (y) => H - 30 - ((y - y0) / (y1 - y0)) * (H - 60);
        // axes through zero
        c.strokeStyle = TM.css("--line-strong");
        c.lineWidth = 1;
        c.beginPath();
        if (x0 < 0 && x1 > 0) { c.moveTo(tx(0), 10); c.lineTo(tx(0), H - 10); }
        if (y0 < 0 && y1 > 0) { c.moveTo(10, ty(0)); c.lineTo(W - 10, ty(0)); }
        c.stroke();
        c.fillStyle = TM.css("--muted");
        c.font = "11px " + TM.css("--f-mono");
        c.textAlign = "right";
        c.fillText(s.view === "pca" ? "principal component 1 →" : `${s.ax} →`, W - 12, H - 10);
        c.textAlign = "left";
        c.fillText(s.view === "pca" ? "↑ principal component 2" : `↑ ${s.ay}`, 12, 16);
        // analogy arrows
        if (result) {
          const pa = proj(vec[s.a]), pb = proj(vec[s.b]), pc = proj(vec[s.c]), pr = proj(result.v);
          const arrow = (p, q, col, dash) => {
            c.strokeStyle = col;
            c.lineWidth = 2;
            c.setLineDash(dash || []);
            c.beginPath();
            c.moveTo(tx(p[0]), ty(p[1]));
            c.lineTo(tx(q[0]), ty(q[1]));
            c.stroke();
            c.setLineDash([]);
            const ang = Math.atan2(ty(q[1]) - ty(p[1]), tx(q[0]) - tx(p[0]));
            c.beginPath();
            c.moveTo(tx(q[0]), ty(q[1]));
            c.lineTo(tx(q[0]) - 9 * Math.cos(ang - 0.4), ty(q[1]) - 9 * Math.sin(ang - 0.4));
            c.lineTo(tx(q[0]) - 9 * Math.cos(ang + 0.4), ty(q[1]) - 9 * Math.sin(ang + 0.4));
            c.fillStyle = col;
            c.fill();
          };
          arrow(pb, pa, TM.css("--muted"));
          arrow(pc, pr, TM.css("--ink"), [5, 4]);
          c.beginPath();
          c.arc(tx(pr[0]), ty(pr[1]), 7, 0, Math.PI * 2);
          c.strokeStyle = TM.css("--ink");
          c.lineWidth = 2;
          c.stroke();
        }
        // points
        c.font = "600 12px " + TM.css("--f-mono");
        names.forEach((w, i) => {
          const [x, y] = [tx(pts[i][0]), ty(pts[i][1])];
          const col = TM.css(CAT_COLOR[CAT(w)]);
          c.beginPath();
          c.arc(x, y, w === s.sel ? 7 : 5, 0, Math.PI * 2);
          c.fillStyle = col;
          c.fill();
          if (w === s.sel) {
            c.lineWidth = 2.5;
            c.strokeStyle = TM.css("--ink");
            c.stroke();
          }
          c.fillStyle = TM.css("--ink");
          c.fillText(w, x + 8, y - 6);
        });
        cv._hit = names.map((w, i) => [w, tx(pts[i][0]), ty(pts[i][1])]);
      }

      function showWord(w) {
        s.sel = w;
        const v = vec[w];
        const acc = TM.hexToRgb(TM.css("--pos")), neg = TM.hexToRgb(TM.css("--neg")), bg = TM.hexToRgb(TM.css("--panel-2"));
        const cells = v.map((x, i) => {
          const c = TM.mixRgb(bg, x >= 0 ? acc : neg, Math.min(1, Math.abs(x)) * 0.85);
          return el("div", { class: "vc", title: `${DIMS[i]}: ${x.toFixed(2)}`, style: { background: TM.rgb(c), color: Math.abs(x) > 0.55 ? "#fff" : "var(--ink)" } }, x.toFixed(1).replace("-", "−"));
        });
        vecBox.replaceChildren(
          el("div", { class: "ctl-label" }, `"${w}" as a vector (hover a cell for its dimension)`),
          el("div", { class: "vec" }, cells),
          el("div", { class: "readout" }, `[${v.map((x) => x.toFixed(2)).join(", ")}]`)
        );
        const sims = names.filter((n) => n !== w).map((n) => [n, cos(v, vec[n])]).sort((a, b) => b[1] - a[1]).slice(0, 6);
        nnBox.replaceChildren(el("div", { class: "ctl-label" }, `Nearest to "${w}" (cosine similarity)`), ...sims.map(([n, sv]) => bar(n, sv)));
        draw();
      }
      const bar = (label, v, pick) =>
        el("div", { class: `bar${pick ? " pick" : ""}` }, el("span", { class: "lbl" }, label), el("div", { class: "track" }, el("div", { class: "fill", style: { width: `${Math.max(0, v) * 100}%` } })), el("span", { class: "num" }, v.toFixed(3)));

      function analogy(initial) {
        const v = vec[s.a].map((x, i) => x - vec[s.b][i] + vec[s.c][i]);
        const ranked = names.filter((n) => ![s.a, s.b, s.c].includes(n)).map((n) => [n, cos(v, vec[n])]).sort((a, b) => b[1] - a[1]);
        result = { v, top: ranked[0][0] };
        resBox.replaceChildren(...ranked.slice(0, 5).map(([n, sv], i) => bar(n, sv, i === 0)));
        const cv2 = clean[s.a].map((x, i) => x - clean[s.b][i] + clean[s.c][i]);
        const exact = names.find((n) => ![s.a, s.b, s.c].includes(n) && clean[n].every((x, i) => Math.abs(x - cv2[i]) < 1e-9));
        if (exact && exact === result.top) {
          resNote.className = "note ok";
          resNote.textContent = `${s.a} − ${s.b} + ${s.c} ≈ ${exact}. The offset from ${s.b} to ${s.a} carried over cleanly.`;
          if (!initial) {
            ctx.award("analogy");
            if (WORDS[exact].food || WORDS[exact].place) ctx.award("cross");
          }
        } else {
          resNote.className = "note";
          resNote.textContent = `Closest word: ${result.top}. ${exact ? "" : "This isn't a clean analogy in this space, so the answer is a best guess."} The input words are excluded, as is standard.`;
        }
        draw();
      }

      cv.addEventListener("pointerdown", (e) => {
        const [x, y] = cv.pointer(e);
        let best = null, bd = 24;
        for (const [w, px, py] of cv._hit || []) {
          const d = Math.hypot(px - x, py - y);
          if (d < bd) { bd = d; best = w; }
        }
        if (best) {
          showWord(best);
          ctx.award("inspect");
        }
      });

      const axSel = (id, key, label) => {
        const sel = el("select", { class: "sel", id }, DIMS.map((d) => el("option", { value: d, selected: d === s[key] }, d)));
        sel.addEventListener("change", () => { s[key] = sel.value; draw(); });
        return el("div", { class: "ctl-group" }, el("label", { class: "ctl-label", for: id }, label), sel);
      };
      const axBox = el("div", { class: "ctl-row" }, axSel("em-x", "ax", "Horizontal axis"), axSel("em-y", "ay", "Vertical axis"));
      const viewSeg = TM.seg({
        label: "View",
        options: [["axes", "Pick two dimensions"], ["pca", "PCA (automatic)"]],
        value: s.view,
        onChange: (v) => {
          s.view = v;
          axBox.hidden = v === "pca";
          if (v === "pca") ctx.award("pca");
          draw();
        },
      });
      const wordSel = (id, key) => {
        const sel = el("select", { class: "sel", id, "aria-label": key }, names.map((n) => el("option", { value: n, selected: n === s[key] }, n)));
        sel.addEventListener("change", () => { s[key] = sel.value; analogy(); });
        return sel;
      };
      const legend = el(
        "div",
        { class: "ctl-row" },
        Object.entries(CAT_COLOR).map(([k, v]) => el("span", { class: "note", style: { display: "inline-flex", alignItems: "center", gap: "5px" } }, el("i", { style: { width: "10px", height: "10px", borderRadius: "50%", background: `var(${v})`, display: "inline-block" } }), k))
      );

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            viewSeg.el,
            axBox,
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Vector arithmetic"), el("div", { class: "ctl-row" }, wordSel("em-a", "a"), el("span", { class: "mm-op", style: { fontSize: "18px" } }, "−"), wordSel("em-b", "b"), el("span", { class: "mm-op", style: { fontSize: "18px" } }, "+"), wordSel("em-c", "c"))),
            resBox,
            resNote
          ),
          el("div", { class: "controls" }, el("div", { class: "viz-wrap" }, cv), legend, el("p", { class: "note" }, "Click a word to inspect it. The grey arrow is the offset B → A; the dashed arrow applies that same offset starting from C."), vecBox, nnBox)
        )
      );
      analogy(true);
      showWord(s.sel);
    },
  });
})();
