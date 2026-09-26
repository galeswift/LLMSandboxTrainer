/* Hall 2: Neuron Lab — weights, bias, activation, logic gates, and the XOR wall. */
(function () {
  const { el } = TM;
  const ACTS = {
    step: { name: "step", f: (z) => (z > 0 ? 1 : 0), thr: 0.5 },
    sigmoid: { name: "sigmoid", f: (z) => 1 / (1 + Math.exp(-z)), thr: 0.5 },
    relu: { name: "ReLU", f: (z) => Math.max(0, z), thr: 0.5 },
    tanh: { name: "tanh", f: (z) => Math.tanh(z), thr: 0 },
  };
  const GATES = {
    AND: [0, 0, 0, 1],
    OR: [0, 1, 1, 1],
    NAND: [1, 1, 1, 0],
    XOR: [0, 1, 1, 0],
  };
  const ROWS = [[0, 0], [0, 1], [1, 0], [1, 1]];

  TM.register({
    id: "neuron",
    hall: 2,
    title: "Neuron Lab",
    short: "Neuron",
    color: "--h2",
    next: "descent",
    tagline: "One artificial neuron: multiply, add, squash. Tune it by hand until it computes logic.",
    intro:
      "<p>A neuron takes inputs, multiplies each by a <b>weight</b>, adds a <b>bias</b>, and passes the total through an <b>activation function</b>. That's the whole thing. An LLM has billions of these weights, and training is the search for good values.</p><p>Here you are the training algorithm. Drag the sliders until the neuron's output matches the truth table for each logic gate.</p>",
    explainTitle: "A neuron draws one straight line",
    explain:
      "<p>The neuron computes <code>z = w₁·x₁ + w₂·x₂ + b</code>. The set of points where <code>z = 0</code> is a straight line (the dashed line on the map). Everything on one side fires, everything on the other side doesn't.</p><ul><li><b>Weights</b> tilt the line. <b>Bias</b> slides it without tilting.</li><li>The <b>activation</b> shapes how the output changes near the line. A step is a hard yes/no; sigmoid and tanh are smooth, which matters in the next halls, because smooth functions have slopes we can follow downhill.</li><li><b>XOR</b> needs the two corners (0,1) and (1,0) on one side and the other two corners on the other side. No single straight line can do that. This limit stalled neural network research in 1969. The fix is to stack neurons in layers, which you'll do in Hall 4.</li></ul>",
    challenges: [
      { id: "and", title: "Build an AND gate", hint: "Fire only when both inputs are 1." },
      { id: "or", title: "Build an OR gate", hint: "Fire when at least one input is 1." },
      { id: "nand", title: "Build a NAND gate", hint: "The opposite of AND. Try negative weights." },
      { id: "xor", title: "Face the XOR wall", hint: "Try XOR, then open the explanation for why it can't work." },
    ],
    tries: ["Switch to sigmoid and slowly raise both weights. The soft edge gets sharper until it looks like a step.", "Set both weights to 0. Now only the bias decides, and the neuron ignores its inputs."],
    mount(stage, ctx) {
      const s = { w1: 0.6, w2: -0.4, b: 0.2, act: "sigmoid", gate: "AND", x1: 1, x2: 0 };
      const f1 = (v) => TM.fmt(v, 1);
      const sw1 = TM.slider({ label: "weight w₁", min: -6, max: 6, step: 0.1, value: s.w1, fmt: f1, onInput: (v) => ((s.w1 = v), update()) });
      const sw2 = TM.slider({ label: "weight w₂", min: -6, max: 6, step: 0.1, value: s.w2, fmt: f1, onInput: (v) => ((s.w2 = v), update()) });
      const sb = TM.slider({ label: "bias b", min: -6, max: 6, step: 0.1, value: s.b, fmt: f1, onInput: (v) => ((s.b = v), update()) });
      const actSeg = TM.seg({ label: "Activation", options: Object.entries(ACTS).map(([k, a]) => [k, a.name]), value: s.act, onChange: (v) => ((s.act = v), update()) });
      const gateSeg = TM.seg({ label: "Target gate", options: Object.keys(GATES).map((g) => [g, g]), value: s.gate, onChange: (v) => ((s.gate = v), (xorReveal.hidden = true), update()) });

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 420 200");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Neuron diagram");
      svg.style.width = "100%";
      svg.style.maxWidth = "520px";
      const mk = (tag, attrs) => {
        const n = document.createElementNS(svgNS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        svg.append(n);
        return n;
      };
      const e1 = mk("line", { x1: 60, y1: 55, x2: 200, y2: 100, "stroke-linecap": "round" });
      const e2 = mk("line", { x1: 60, y1: 145, x2: 200, y2: 100, "stroke-linecap": "round" });
      const e3 = mk("line", { x1: 238, y1: 100, x2: 290, y2: 100, stroke: "var(--line-strong)", "stroke-width": 2 });
      const e4 = mk("line", { x1: 350, y1: 100, x2: 372, y2: 100, stroke: "var(--line-strong)", "stroke-width": 2 });
      const in1 = mk("circle", { cx: 45, cy: 55, r: 20, style: "cursor:pointer", tabindex: 0 });
      const in2 = mk("circle", { cx: 45, cy: 145, r: 20, style: "cursor:pointer", tabindex: 0 });
      const t1 = mk("text", { x: 45, y: 60, "text-anchor": "middle", "font-size": 15, "font-weight": 700, "pointer-events": "none", "font-family": "var(--f-mono)" });
      const t2 = mk("text", { x: 45, y: 150, "text-anchor": "middle", "font-size": 15, "font-weight": 700, "pointer-events": "none", "font-family": "var(--f-mono)" });
      mk("text", { x: 45, y: 24, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }).textContent = "x₁ (click)";
      mk("text", { x: 45, y: 185, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }).textContent = "x₂ (click)";
      const lw1 = mk("text", { x: 120, y: 64, "font-size": 12, fill: "var(--muted)", "font-family": "var(--f-mono)" });
      const lw2 = mk("text", { x: 120, y: 146, "font-size": 12, fill: "var(--muted)", "font-family": "var(--f-mono)" });
      mk("circle", { cx: 219, cy: 100, r: 22, fill: "var(--panel-2)", stroke: "var(--accent)", "stroke-width": 2 });
      mk("text", { x: 219, y: 106, "text-anchor": "middle", "font-size": 18, fill: "var(--ink)" }).textContent = "Σ";
      const tz = mk("text", { x: 219, y: 142, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)", "font-family": "var(--f-mono)" });
      const tb = mk("text", { x: 219, y: 66, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)", "font-family": "var(--f-mono)" });
      mk("rect", { x: 290, y: 75, width: 60, height: 50, rx: 6, fill: "var(--panel-2)", stroke: "var(--line-strong)" });
      const actPath = mk("path", { fill: "none", stroke: "var(--accent)", "stroke-width": 2 });
      const actDot = mk("circle", { r: 3.5, fill: "var(--ink)" });
      const outC = mk("circle", { cx: 392, cy: 100, r: 20, stroke: "var(--accent)", "stroke-width": 2 });
      const tOut = mk("text", { x: 392, y: 105, "text-anchor": "middle", "font-size": 13, "font-weight": 700, "font-family": "var(--f-mono)" });
      mk("text", { x: 392, y: 140, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }).textContent = "output";
      mk("text", { x: 320, y: 140, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" }).textContent = "activation";
      const toggle = (k) => () => ((s[k] = 1 - s[k]), update());
      in1.addEventListener("click", toggle("x1"));
      in2.addEventListener("click", toggle("x2"));
      in1.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && toggle("x1")());
      in2.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && toggle("x2")());

      const map = TM.canvas(260, 260);
      const table = el("table", { class: "tt" });
      const verdict = el("p", { class: "note" });
      const xorBtn = TM.btn("Why won't XOR work?", () => {
        xorReveal.hidden = false;
        ctx.award("xor");
      });
      const xorReveal = el(
        "div",
        { class: "readout", hidden: true },
        "XOR wants (0,1) and (1,0) to fire, but (0,0) and (1,1) not to. Look at the map: those pairs sit on opposite diagonals. A single neuron can only split the square with one straight line, and no straight line separates diagonals. You need a second layer. See Hall 4, where a hidden layer bends the boundary."
      );

      const out = (x1, x2) => ACTS[s.act].f(s.w1 * x1 + s.w2 * x2 + s.b);

      function drawMap() {
        const c = map.ctx, W = map.W, H = map.H;
        const lo = -0.5, hi = 1.5;
        const toPx = (v) => ((v - lo) / (hi - lo)) * W;
        const toPy = (v) => H - ((v - lo) / (hi - lo)) * H;
        const acc = TM.hexToRgb(TM.css("--h2"));
        const bg = TM.hexToRgb(TM.css("--panel-2"));
        const res = 52;
        const cell = W / res;
        const a = ACTS[s.act];
        for (let i = 0; i < res; i++)
          for (let j = 0; j < res; j++) {
            const x = lo + ((i + 0.5) / res) * (hi - lo);
            const y = hi - ((j + 0.5) / res) * (hi - lo);
            let v = a.f(s.w1 * x + s.w2 * y + s.b);
            v = s.act === "tanh" ? (v + 1) / 2 : s.act === "relu" ? Math.min(1, v) : v;
            c.fillStyle = TM.rgb(TM.mixRgb(bg, acc, v * 0.85));
            c.fillRect(i * cell, j * cell, cell + 0.5, cell + 0.5);
          }
        // decision line z = 0
        c.strokeStyle = TM.css("--ink");
        c.setLineDash([6, 5]);
        c.lineWidth = 1.5;
        c.beginPath();
        if (Math.abs(s.w2) > 1e-6) {
          const yAt = (x) => -(s.w1 * x + s.b) / s.w2;
          c.moveTo(toPx(lo), toPy(yAt(lo)));
          c.lineTo(toPx(hi), toPy(yAt(hi)));
        } else if (Math.abs(s.w1) > 1e-6) {
          const x = -s.b / s.w1;
          c.moveTo(toPx(x), 0);
          c.lineTo(toPx(x), H);
        }
        c.stroke();
        c.setLineDash([]);
        const tgt = GATES[s.gate];
        ROWS.forEach(([x1, x2], k) => {
          c.beginPath();
          c.arc(toPx(x1), toPy(x2), 11, 0, Math.PI * 2);
          c.fillStyle = tgt[k] ? TM.css("--ink") : TM.css("--panel");
          c.fill();
          c.lineWidth = 2.5;
          c.strokeStyle = TM.css("--ink");
          c.stroke();
          c.fillStyle = tgt[k] ? TM.css("--panel") : TM.css("--ink");
          c.font = "700 10px " + TM.css("--f-mono");
          c.textAlign = "center";
          c.fillText(tgt[k], toPx(x1), toPy(x2) + 3.5);
          c.fillStyle = TM.css("--muted");
          c.fillText(`(${x1},${x2})`, toPx(x1), toPy(x2) + (x2 ? -17 : 25));
        });
      }

      function update() {
        const a = ACTS[s.act];
        const col = (w) => (w >= 0 ? "var(--pos)" : "var(--neg)");
        e1.setAttribute("stroke", col(s.w1));
        e1.setAttribute("stroke-width", 1 + Math.abs(s.w1) * 1.3);
        e2.setAttribute("stroke", col(s.w2));
        e2.setAttribute("stroke-width", 1 + Math.abs(s.w2) * 1.3);
        [in1, in2].forEach((n, i) => {
          const on = i ? s.x2 : s.x1;
          n.setAttribute("fill", on ? "var(--accent)" : "var(--panel)");
          n.setAttribute("stroke", "var(--accent)");
          n.setAttribute("stroke-width", 2);
        });
        t1.textContent = s.x1;
        t2.textContent = s.x2;
        t1.setAttribute("fill", s.x1 ? "var(--panel)" : "var(--ink)");
        t2.setAttribute("fill", s.x2 ? "var(--panel)" : "var(--ink)");
        lw1.textContent = `×${TM.fmt(s.w1, 1)}`;
        lw2.textContent = `×${TM.fmt(s.w2, 1)}`;
        const z = s.w1 * s.x1 + s.w2 * s.x2 + s.b;
        const y = a.f(z);
        tz.textContent = `z = ${TM.fmt(z, 2)}`;
        tb.textContent = `+ b (${TM.fmt(s.b, 1)})`;
        // activation curve over z in [-6, 6]
        const lo = s.act === "tanh" ? -1 : 0, hi = s.act === "relu" ? 6 : 1;
        const px = (zz) => 294 + ((zz + 6) / 12) * 52;
        const py = (yy) => 120 - ((TM.clamp(yy, lo, hi) - lo) / (hi - lo)) * 40;
        let d = "";
        for (let i = 0; i <= 48; i++) {
          const zz = -6 + (i / 48) * 12;
          d += `${i ? "L" : "M"}${px(zz).toFixed(1)},${py(a.f(zz)).toFixed(1)}`;
        }
        actPath.setAttribute("d", d);
        actDot.setAttribute("cx", px(TM.clamp(z, -6, 6)));
        actDot.setAttribute("cy", py(y));
        const fires = y > a.thr;
        outC.setAttribute("fill", fires ? "var(--accent)" : "var(--panel)");
        tOut.setAttribute("fill", fires ? "var(--panel)" : "var(--ink)");
        tOut.textContent = TM.fmt(y, 2);

        const tgt = GATES[s.gate];
        let right = 0;
        table.replaceChildren(
          el("tr", null, ["x₁", "x₂", "target", "output", "fires?", ""].map((h) => el("th", null, h))),
          ...ROWS.map(([x1, x2], k) => {
            const yy = out(x1, x2);
            const f = yy > a.thr ? 1 : 0;
            const ok = f === tgt[k];
            if (ok) right++;
            return el("tr", null, el("td", null, x1), el("td", null, x2), el("td", null, tgt[k]), el("td", null, TM.fmt(yy, 2)), el("td", null, f), el("td", null, el("span", { class: `pill ${ok ? "good" : "bad"}` }, ok ? "match" : "miss")));
          })
        );
        if (right === 4) {
          verdict.className = "note ok";
          verdict.textContent = `Solved: your neuron is a working ${s.gate} gate.`;
          if (s.gate !== "XOR") ctx.award(s.gate.toLowerCase());
        } else {
          verdict.className = "note";
          verdict.textContent = `${right} of 4 rows match. ${s.gate === "XOR" ? "Keep trying, then read why this one is different." : "Move the dashed line so the filled dots are on the bright side."}`;
        }
        xorBtn.hidden = s.gate !== "XOR";
        drawMap();
      }

      stage.append(
        el(
          "div",
          { class: "station" },
          el(
            "div",
            { class: "split" },
            el("div", { class: "controls" }, gateSeg.el, sw1.el, sw2.el, sb.el, actSeg.el),
            el("div", { class: "controls" }, svg, el("div", { class: "split wide-left" }, el("div", { class: "viz-wrap" }, map, el("p", { class: "note" }, "Input map: brightness is the output for every (x₁, x₂). Dots are the four truth-table rows; filled means the target is 1.")), el("div", { class: "controls" }, el("div", { class: "tbl-wrap" }, table), verdict, xorBtn, xorReveal)))
          )
        )
      );
      update();
    },
  });
})();
