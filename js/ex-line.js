/* The Line Neuron — a neuron with one input is y = w·x + b. */
(function () {
  const { el } = TM;
  const LEVELS = [
    { w: 2, b: 1, xs: [0, 1, 2] },
    { w: -1, b: 3, xs: [-1, 1, 3] },
    { w: 0.5, b: -2, xs: [-2, 2, 4] },
  ];

  TM.register({
    id: "line",
    wing: "neurons",
    title: "The Line Neuron",
    short: "Line neuron",
    color: "--h2",
    tagline: "A neuron with one input is just y = mx + b from math class. AI people call m the weight.",
    intro:
      "<p>An artificial <b>neuron</b> takes an input number x, multiplies it by a <b>weight</b> w, and adds a <b>bias</b> b. Out comes y = w·x + b. That's the slope-intercept line you know, with new names.</p><p>Each level has a secret rule. Look at its input/output table, then slide w and b until your line goes through every dot.</p>",
    words: [
      ["Neuron", "A tiny calculator: multiply the input by a weight, add a bias."],
      ["Weight (w)", "How much the input matters. Same as the slope m."],
      ["Bias (b)", "A starting amount added on. Same as the y-intercept."],
      ["Parameters", "All the weights and biases together: the knobs a model can turn."],
    ],
    explainTitle: "From one knob to billions",
    explain:
      "<p>This neuron has 2 parameters (w and b). You found the right values by looking and adjusting. That's exactly what training does, except a computer does the adjusting, and a large chatbot has hundreds of billions of parameters.</p><ul><li>Real neurons have many inputs, each with its own weight: y = w₁x₁ + w₂x₂ + … + b. That's a dot product plus a bias.</li><li>You'll hand-tune a two-input neuron in the next hall, and in the Learning wing you'll watch a computer find w and b by itself.</li></ul>",
    challenges: [
      { id: "tilt", title: "Tilt the line", hint: "Move the weight slider and watch.", how: "Drag the “weight w” slider left and right. Bigger w means steeper. Negative w slopes downhill." },
      { id: "l1", title: "Level 1: match the secret rule", hint: "Get the line through all 3 dots.", how: "The table shows x = 0 gives y = 1, so the bias is 1. Each time x goes up by 1, y goes up by 2, so the weight is 2." },
      { id: "l2", title: "Level 2: a downhill rule", hint: "The dots go down as x goes up.", how: "y drops by 1 each time x goes up by 1, so w = −1. Then find b: when x = 1, y = 2, so b = 3." },
      { id: "l3", title: "Level 3: a gentle slope", hint: "Weights don't have to be whole numbers.", how: "When x goes up by 4 (from −2 to 2), y goes up by 2. So w = 2 ÷ 4 = 0.5. Then use x = 2, y = −1 to find b = −2." },
    ],
    mount(stage, ctx) {
      let level = 0, w = 1, b = 0;
      const cv = TM.canvas(420, 320);
      const table = el("table", { class: "tt" });
      const eq = el("div", { class: "eq" });
      const verdict = el("p", { class: "note" });
      const X0 = -5, X1 = 5, Y0 = -6, Y1 = 8;
      const tx = (x) => ((x - X0) / (X1 - X0)) * cv.W;
      const ty = (y) => cv.H - ((y - Y0) / (Y1 - Y0)) * cv.H;

      const wS = TM.slider({ label: "weight w (slope)", min: -3, max: 3, step: 0.5, value: w, fmt: (v) => TM.fmt(v, 1), onInput: (v) => { w = v; ctx.award("tilt"); render(); } });
      const bS = TM.slider({ label: "bias b (intercept)", min: -5, max: 5, step: 0.5, value: b, fmt: (v) => TM.fmt(v, 1), onInput: (v) => { b = v; render(); } });
      const levelSeg = TM.seg({ label: "Secret rule", options: [[0, "Level 1"], [1, "Level 2"], [2, "Level 3"]], value: 0, onChange: (v) => { level = v; render(); } });

      function render() {
        const L = LEVELS[level];
        const pts = L.xs.map((x) => [x, L.w * x + L.b]);
        const c = cv.ctx;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, cv.W, cv.H);
        c.strokeStyle = TM.css("--line");
        c.lineWidth = 1;
        c.font = "10px " + TM.css("--f-mono");
        c.fillStyle = TM.css("--muted");
        for (let x = X0; x <= X1; x++) {
          c.beginPath();
          c.moveTo(tx(x), 0);
          c.lineTo(tx(x), cv.H);
          c.stroke();
          if (x) c.fillText(x, tx(x) + 2, ty(0) + 11);
        }
        for (let y = Y0; y <= Y1; y++) {
          c.beginPath();
          c.moveTo(0, ty(y));
          c.lineTo(cv.W, ty(y));
          c.stroke();
          if (y && y % 2 === 0) c.fillText(y, tx(0) + 3, ty(y) - 2);
        }
        c.strokeStyle = TM.css("--line-strong");
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(tx(0), 0); c.lineTo(tx(0), cv.H);
        c.moveTo(0, ty(0)); c.lineTo(cv.W, ty(0));
        c.stroke();
        // your line
        c.strokeStyle = TM.css("--accent");
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(tx(X0), ty(w * X0 + b));
        c.lineTo(tx(X1), ty(w * X1 + b));
        c.stroke();
        // target dots
        let hits = 0;
        for (const [x, y] of pts) {
          const on = Math.abs(w * x + b - y) < 1e-9;
          if (on) hits++;
          c.beginPath();
          c.arc(tx(x), ty(y), 7, 0, Math.PI * 2);
          c.fillStyle = on ? TM.css("--good") : TM.css("--panel");
          c.fill();
          c.lineWidth = 2.5;
          c.strokeStyle = on ? TM.css("--good") : TM.css("--ink");
          c.stroke();
        }
        table.replaceChildren(
          el("tr", null, el("th", null, "input x"), el("th", null, "secret y"), el("th", null, "your y"), el("th", null, "")),
          ...pts.map(([x, y]) => {
            const yy = w * x + b;
            const ok = Math.abs(yy - y) < 1e-9;
            return el("tr", null, el("td", null, TM.fmt(x, 0)), el("td", null, TM.fmt(y, 0)), el("td", null, TM.fmt(yy, 1)), el("td", null, el("span", { class: `pill ${ok ? "good" : "bad"}` }, ok ? "match" : "off")));
          })
        );
        eq.innerHTML = `y = <b>${TM.fmt(w, 1)}</b> · x + <b>${TM.fmt(b, 1)}</b>`;
        if (hits === pts.length) {
          verdict.className = "note ok";
          verdict.textContent = `You cracked level ${level + 1}!${level < 2 ? " Try the next level." : ""}`;
          ctx.award(`l${level + 1}`);
        } else {
          verdict.className = "note";
          verdict.textContent = `${hits} of ${pts.length} dots on your line.`;
        }
      }

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            levelSeg.el,
            el("div", { class: "tbl-wrap" }, table),
            wS.el,
            bS.el,
            eq,
            verdict,
            el("div", { class: "readout" }, "input x  →  × weight  →  + bias  →  output y")
          ),
          el("div", { class: "viz-wrap" }, cv, el("p", { class: "note" }, "Dots turn green when your line passes through them."))
        )
      );
      render();
    },
  });
})();
