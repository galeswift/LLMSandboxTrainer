/* Hall 7: Attention Theater — queries, keys, values, softmax, causal masks. */
(function () {
  const { el } = TM;

  // Lookup lab: keys are arrows; values are colors.
  const KEYS = [
    { name: "cats", k: [1.4, 0.5], color: "--h1" },
    { name: "weather", k: [-0.6, 1.4], color: "--h3" },
    { name: "math", k: [-1.3, -0.7], color: "--h6" },
    { name: "music", k: [0.7, -1.3], color: "--h4" },
  ];

  // Sentence theater. Key dims: [noun, animate, inanimate, verb, function-word, adjective]
  const K = {
    The: [0, 0, 0, 0, 1, 0], animal: [1, 1, 0, 0, 0, 0], "didn't": [0, 0, 0, 0.7, 0.4, 0], cross: [0, 0, 0, 1, 0, 0],
    the: [0, 0, 0, 0, 1, 0], street: [1, 0, 1, 0, 0, 0], because: [0, 0, 0, 0, 1, 0], it: [0.4, 0, 0, 0, 0.4, 0],
    was: [0, 0, 0, 0.7, 0.4, 0], too: [0, 0, 0, 0, 0.6, 0.3], tired: [0, 0.3, 0, 0, 0, 1], wide: [0, 0, 0.3, 0, 0, 1],
  };
  const Q = {
    The: [2, 0, 0, 0, 0, 0], animal: [0, 0, 0, 2, 0, 0], "didn't": [0, 0, 0, 1.5, 0, 0], cross: [1.5, 0, 0.5, 0, 0, 0],
    the: [2, 0, 0, 0, 0, 0], street: [0, 0, 0, 1.5, 0, 0], because: [0, 0, 0, 1.5, 0, 0],
    was: [0, 0, 0, 0, 0, 1.5], too: [0, 0, 0, 0, 0, 2], tired: [1, 2, 0, 0, 0, 0], wide: [1, 0, 2, 0, 0, 0],
  };
  const SENT = {
    tired: "The animal didn't cross the street because it was too tired".split(" "),
    wide: "The animal didn't cross the street because it was too wide".split(" "),
  };
  const qOf = (tok, variant) => (tok === "it" ? (variant === "tired" ? [1.5, 2, 0, 0, 0, 0] : [1.5, 0, 2, 0, 0, 0]) : Q[tok]);
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

  TM.register({
    id: "attention",
    hall: 7,
    title: "Attention Theater",
    short: "Attention",
    color: "--h7",
    next: "generate",
    tagline: "How a token decides which other tokens matter: a soft, blendable dictionary lookup.",
    intro:
      "<p>Embeddings give each token a meaning on its own, but <i>it</i> means nothing until you know what it refers to. <b>Attention</b> lets every token gather information from the others. Each token produces a <b>query</b> (what am I looking for?), a <b>key</b> (what do I contain?), and a <b>value</b> (what I'll hand over if picked).</p><p>Start in the lookup lab: drag the query arrow and watch it blend the values it points toward.</p>",
    explainTitle: "softmax(Q·Kᵀ / √d) · V",
    explain:
      "<p>That formula is the whole mechanism, and you've now run every piece of it:</p><ul><li><b>Q·K</b>: dot each query with every key. Pointing the same way gives a big score (Hall 1's dot product again).</li><li><b>÷ √d</b>: scale the scores down so they don't grow with the vector size. The sharpness slider plays this role: low values blend, high values pick one winner.</li><li><b>softmax</b>: turn scores into weights that are positive and sum to 1.</li><li><b>· V</b>: take the weighted average of the values. That average becomes the token's new, context-aware vector.</li></ul><p>In the sentence theater we set the vectors by hand to act like a trained model. In a real transformer, Q, K and V come from three learned weight matrices, and there are dozens of <b>heads</b> per layer, each learning its own kind of lookup: grammar, coreference, position, and more. The <b>causal mask</b> stops a token from looking at words that come after it, which is what lets a model be trained to predict the next token without cheating.</p>",
    challenges: [
      { id: "sharp", title: "Hard lookup", hint: "In the lookup lab, put 90% or more of the weight on a single key." },
      { id: "soft", title: "Perfect blend", hint: "Spread the weight so no key gets more than 35%." },
      { id: "it", title: "What is 'it'?", hint: "Switch the sentence to 'wide' and see where 'it' looks now." },
      { id: "mask", title: "No peeking", hint: "Turn on the causal mask and select the very first token." },
    ],
    tries: ["Shrink the query arrow to almost nothing. Short queries make every score near zero, so attention spreads evenly.", "In the sentence, click 'too' and 'was'. They look for the adjective, not the nouns."],
    mount(stage, ctx) {
      // ---------- Lookup lab ----------
      const W = 340, H = 340, R = 2.2;
      const cv = TM.canvas(W, H);
      let q = [1.1, 0.9];
      let sharp = 1.5;
      const tx = (x) => W / 2 + (x / R) * (W / 2);
      const ty = (y) => H / 2 - (y / R) * (H / 2);
      const fx = (px) => ((px - W / 2) / (W / 2)) * R;
      const fy = (py) => -((py - H / 2) / (H / 2)) * R;
      const barsBox = el("div", { class: "bars" });
      const swatch = el("div", { class: "swatch" });
      const mixNote = el("div", { class: "readout" });

      function drawLab() {
        const c = cv.ctx;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, W, H);
        c.strokeStyle = TM.css("--line");
        c.lineWidth = 1;
        for (let g = -2; g <= 2; g++) {
          c.beginPath();
          c.moveTo(tx(g), 0); c.lineTo(tx(g), H);
          c.moveTo(0, ty(g)); c.lineTo(W, ty(g));
          c.stroke();
        }
        const scores = KEYS.map((k) => dot(q, k.k) * sharp);
        const wts = TM.softmax(scores);
        const arrow = (v, col, width, label) => {
          const ex = tx(v[0]), ey = ty(v[1]);
          c.strokeStyle = col;
          c.fillStyle = col;
          c.lineWidth = width;
          c.beginPath();
          c.moveTo(tx(0), ty(0));
          c.lineTo(ex, ey);
          c.stroke();
          const ang = Math.atan2(ey - ty(0), ex - tx(0));
          c.beginPath();
          c.moveTo(ex, ey);
          c.lineTo(ex - 11 * Math.cos(ang - 0.4), ey - 11 * Math.sin(ang - 0.4));
          c.lineTo(ex - 11 * Math.cos(ang + 0.4), ey - 11 * Math.sin(ang + 0.4));
          c.fill();
          if (label) {
            c.font = "700 12px " + TM.css("--f-mono");
            c.textAlign = "center";
            c.fillText(label, ex + Math.cos(ang) * 22, ey + Math.sin(ang) * 18 + 4);
          }
        };
        KEYS.forEach((k, i) => {
          c.globalAlpha = 0.35 + 0.65 * wts[i];
          arrow(k.k, TM.css(k.color), 2 + wts[i] * 6, `${k.name} ${Math.round(wts[i] * 100)}%`);
        });
        c.globalAlpha = 1;
        arrow(q, TM.css("--ink"), 3, "query");
        c.beginPath();
        c.arc(tx(q[0]), ty(q[1]), 9, 0, Math.PI * 2);
        c.strokeStyle = TM.css("--ink");
        c.lineWidth = 2;
        c.setLineDash([3, 3]);
        c.stroke();
        c.setLineDash([]);

        const cols = KEYS.map((k) => TM.hexToRgb(TM.css(k.color)));
        const mix = cols.reduce((m, col, i) => [m[0] + col[0] * wts[i], m[1] + col[1] * wts[i], m[2] + col[2] * wts[i]], [0, 0, 0]);
        swatch.style.background = TM.rgb(mix);
        barsBox.replaceChildren(
          ...KEYS.map((k, i) =>
            el("div", { class: "bar" }, el("span", { class: "lbl" }, k.name), el("div", { class: "track" }, el("div", { class: "fill", style: { width: `${wts[i] * 100}%`, background: `var(${k.color})` } })), el("span", { class: "num" }, `${(wts[i] * 100).toFixed(1)}%`))
          )
        );
        mixNote.textContent = KEYS.map((k, i) => `${k.name}: q·k = ${TM.fmt(dot(q, k.k), 2)} × ${sharp.toFixed(1)} = ${TM.fmt(scores[i], 2)}`).join("\n") + `\nsoftmax → weights; output = weighted mix of the value colors`;
        const mx = Math.max(...wts);
        if (mx >= 0.9) ctx.award("sharp");
        if (mx <= 0.35) ctx.award("soft");
      }
      let dragging = false;
      const moveQ = (e) => {
        const [px, py] = cv.pointer(e);
        q = [TM.clamp(fx(px), -R + 0.1, R - 0.1), TM.clamp(fy(py), -R + 0.1, R - 0.1)];
        drawLab();
      };
      cv.addEventListener("pointerdown", (e) => { dragging = true; cv.setPointerCapture(e.pointerId); moveQ(e); });
      cv.addEventListener("pointermove", (e) => dragging && moveQ(e));
      cv.addEventListener("pointerup", () => (dragging = false));
      const sharpS = TM.slider({ label: "Sharpness (1/temperature)", min: 0.1, max: 6, step: 0.1, value: sharp, fmt: (v) => v.toFixed(1), onInput: (v) => { sharp = v; drawLab(); drawSentence(); } });

      const lab = el(
        "div",
        { class: "station" },
        el("h3", { class: "station-title" }, "Lookup lab", el("small", null, "drag anywhere to aim the query")),
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            sharpS.el,
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Attention weights"), barsBox),
            el("div", { class: "ctl-row" }, swatch, el("p", { class: "note", style: { flex: "1 1 160px" } }, "The output: each key's value (its color) blended by its weight.")),
            mixNote
          ),
          el("div", { class: "viz-wrap", style: { maxWidth: "420px" } }, cv)
        )
      );

      // ---------- Sentence theater ----------
      const st = { variant: "tired", sel: 7, causal: false };
      const sentBox = el("div", { class: "sentence" });
      const heatBox = el("div", { class: "heat" });
      const sentNote = el("div", { class: "readout" });

      function weightsFor(i, toks) {
        const qi = qOf(toks[i], st.variant);
        const sc = toks.map((t, j) => (st.causal && j > i ? -Infinity : dot(qi, K[t]) * sharp));
        return { sc, w: TM.softmax(sc) };
      }

      function drawSentence() {
        const toks = SENT[st.variant];
        const { sc, w } = weightsFor(st.sel, toks);
        sentBox.replaceChildren(
          ...toks.map((t, j) => {
            const b = el("button", { type: "button", class: "tok", "aria-pressed": String(j === st.sel), title: `${Math.round(w[j] * 100)}% attention from "${toks[st.sel]}"` }, t, el("span", { class: "w", style: { transform: `scaleX(${w[j]})`, opacity: j === st.sel ? 0 : 1 } }));
            b.addEventListener("click", () => select(j));
            return b;
          })
        );
        const acc = TM.hexToRgb(TM.css("--h7")), bg = TM.hexToRgb(TM.css("--panel-2"));
        heatBox.style.gridTemplateColumns = `76px repeat(${toks.length}, minmax(18px, 1fr))`;
        const cells = [el("div", { class: "hl" }, "")];
        toks.forEach((t, j) => cells.push(el("div", { class: "hl top" }, t)));
        toks.forEach((t, i) => {
          const row = weightsFor(i, toks).w;
          const lab = el("div", { class: `hl${i === st.sel ? " sel" : ""}`, style: { cursor: "pointer" } }, t);
          lab.addEventListener("click", () => select(i));
          cells.push(lab);
          row.forEach((v, j) => {
            const masked = st.causal && j > i;
            const c = el("div", {
              class: "hc",
              title: masked ? "masked: can't see the future" : `${t} → ${toks[j]}: ${(v * 100).toFixed(1)}%`,
              style: {
                background: masked ? `repeating-linear-gradient(45deg, var(--line) 0 2px, transparent 2px 5px)` : TM.rgb(TM.mixRgb(bg, acc, Math.sqrt(v))),
                outline: i === st.sel ? "1.5px solid var(--ink)" : "none",
              },
            });
            c.addEventListener("click", () => select(i));
            cells.push(c);
          });
        });
        heatBox.replaceChildren(...cells);
        const order = w.map((v, j) => [j, v]).sort((a, b) => b[1] - a[1]);
        const top = order[0][0];
        sentNote.textContent = `"${toks[st.sel]}" attends most to "${toks[top]}" (${Math.round(order[0][1] * 100)}%)` + (order[1] && order[1][1] > 0.01 ? `, then "${toks[order[1][0]]}" (${Math.round(order[1][1] * 100)}%).` : ".") + `\nquery · key scores: ${sc.map((v, j) => `${toks[j]} ${v === -Infinity ? "masked" : TM.fmt(v, 1)}`).join(" · ")}`;
        if (st.variant === "wide" && toks[st.sel] === "it" && toks[top] === "street") ctx.award("it");
        if (st.causal && st.sel === 0) ctx.award("mask");
      }
      function select(i) {
        st.sel = i;
        drawSentence();
      }
      const varSeg = TM.seg({ label: "Last word", options: [["tired", "…too tired"], ["wide", "…too wide"]], value: st.variant, onChange: (v) => { st.variant = v; drawSentence(); } });
      const maskCb = el("input", { type: "checkbox", id: "att-causal" });
      maskCb.addEventListener("change", () => { st.causal = maskCb.checked; drawSentence(); });

      const theater = el(
        "div",
        { class: "station" },
        el("h3", { class: "station-title" }, "Sentence theater", el("small", null, "click a word to see what it pays attention to")),
        el("div", { class: "ctl-row" }, varSeg.el, el("label", { class: "check", for: "att-causal" }, maskCb, "Causal mask (can't look ahead)")),
        sentBox,
        sentNote,
        el("div", { class: "heat-wrap" }, el("div", { style: { minWidth: "420px" } }, heatBox)),
        el("p", { class: "note" }, "Rows are queries (the word doing the looking), columns are keys. Every row sums to 100%. Here 'it' already carries a hint from its adjective, as if earlier layers had mixed it in.")
      );

      stage.append(lab, theater);
      drawLab();
      drawSentence();
    },
  });
})();
