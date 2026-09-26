/* Squish Functions — activation functions. */
(function () {
  const { el } = TM;
  const F = {
    step: { name: "Step", f: (z) => (z > 0 ? 1 : 0), desc: "Yes (1) if the input is above 0, otherwise no (0)." },
    sigmoid: { name: "Sigmoid", f: (z) => 1 / (1 + Math.exp(-z)), desc: "A smooth step. Squishes any number into the range 0 to 1, like a confidence level." },
    relu: { name: "ReLU", f: (z) => Math.max(0, z), desc: "Negative numbers become 0. Positive numbers pass through unchanged." },
  };

  TM.register({
    id: "squish",
    wing: "neurons",
    title: "Squish Functions",
    short: "Squish functions",
    color: "--h2",
    tagline: "After adding things up, a neuron runs the total through a squish function to decide how strongly to fire.",
    intro:
      "<p>A neuron's total (w·x + b) can be any number: −1000, 0.3, 57. Before passing it on, the neuron runs it through an <b>activation function</b>. Think of it as a squish that turns the total into a clean signal.</p><p>Pick a function and drag the input slider. The dot shows where you are on the curve.</p>",
    words: [
      ["Activation function", "The squish a neuron applies to its total before passing it on."],
      ["Sigmoid", "S-shaped curve. Big negative → almost 0, big positive → almost 1."],
      ["ReLU", "“Rectified linear unit.” Keeps positives, turns negatives into 0. The most common one in modern AI."],
    ],
    explainTitle: "Why not just skip the squish?",
    explain:
      "<p>Without a squish, stacking neurons is pointless: a line fed into a line is still just a line, no matter how many layers you add. The bend in the squish function is what lets a big network draw curves, circles, and much more complex patterns. You'll see that happen in the Training Arena.</p><ul><li><b>Step</b> was used in the first neurons in the 1950s, but it's flat almost everywhere, so there's no slope to follow downhill when training.</li><li><b>Sigmoid</b> is smooth, so training can use it. It's great for a final yes/no answer.</li><li><b>ReLU</b> is dead simple and fast, and it's used in most of the hidden layers of today's networks. Chatbots use smooth cousins of it.</li></ul>",
    challenges: [
      { id: "relu0", title: "Make ReLU output exactly 0", hint: "Pick ReLU, then move the input.", how: "Choose ReLU and drag the input slider to any negative number (or 0). ReLU turns negatives into 0." },
      { id: "sure", title: "Make sigmoid “very sure”: above 0.9", hint: "Pick Sigmoid.", how: "Choose Sigmoid and drag the input to about 2.5 or higher." },
      { id: "half", title: "Find where sigmoid is exactly 0.5", hint: "Right in the middle of the S.", how: "Set the input to exactly 0. Sigmoid(0) = 0.5: perfectly unsure." },
      { id: "differ", bonus: true, title: "Find where Step says 1 but Sigmoid is under 0.6", hint: "Just a little above 0.", how: "Set the input between 0.1 and 0.4. Step jumps straight to 1, but sigmoid rises slowly." },
    ],
    mount(stage, ctx) {
      let key = "sigmoid", z = -1;
      const cv = TM.canvas(440, 300);
      const out = el("div", { class: "big-number" });
      const eq = el("div", { class: "eq" });
      const desc = el("p", { class: "note" });
      const seg = TM.seg({ label: "Squish function", options: Object.entries(F).map(([k, v]) => [k, v.name]), value: key, onChange: (k) => { key = k; render(); } });
      const zS = TM.slider({ label: "Input (the neuron's total)", min: -6, max: 6, step: 0.1, value: z, fmt: (v) => TM.fmt(v, 1), onInput: (v) => { z = Math.round(v * 10) / 10; render(); } });
      const Z0 = -6, Z1 = 6, Y0 = -0.5, Y1 = 3;
      const tx = (v) => ((v - Z0) / (Z1 - Z0)) * cv.W;
      const ty = (v) => cv.H - ((v - Y0) / (Y1 - Y0)) * cv.H;

      function render() {
        const c = cv.ctx;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, cv.W, cv.H);
        c.strokeStyle = TM.css("--line-strong");
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(tx(0), 0); c.lineTo(tx(0), cv.H);
        c.moveTo(0, ty(0)); c.lineTo(cv.W, ty(0));
        c.stroke();
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(0, ty(1)); c.lineTo(cv.W, ty(1));
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = TM.css("--muted");
        c.font = "10px " + TM.css("--f-mono");
        c.fillText("1", tx(0) + 4, ty(1) - 3);
        c.fillText("0", tx(0) + 4, ty(0) + 12);
        c.fillText("input →", cv.W - 50, ty(0) + 12);
        for (const [k, fn] of Object.entries(F)) {
          c.strokeStyle = k === key ? TM.css("--accent") : TM.css("--line-strong");
          c.lineWidth = k === key ? 3.5 : 1.5;
          c.beginPath();
          for (let i = 0; i <= 240; i++) {
            const zz = Z0 + (i / 240) * (Z1 - Z0);
            const yy = Math.min(Y1, fn.f(zz));
            i ? c.lineTo(tx(zz), ty(yy)) : c.moveTo(tx(zz), ty(yy));
          }
          c.stroke();
        }
        const y = F[key].f(z);
        c.strokeStyle = TM.css("--ink");
        c.setLineDash([3, 3]);
        c.beginPath();
        c.moveTo(tx(z), ty(0)); c.lineTo(tx(z), ty(Math.min(Y1, y))); c.lineTo(tx(0), ty(Math.min(Y1, y)));
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.arc(tx(z), ty(Math.min(Y1, y)), 7, 0, Math.PI * 2);
        c.fillStyle = TM.css("--ink");
        c.fill();
        out.textContent = TM.fmt(y, 3);
        eq.innerHTML = `${F[key].name}(${TM.fmt(z, 1)}) = <b>${TM.fmt(y, 3)}</b>`;
        desc.textContent = F[key].desc;
        if (key === "relu" && y === 0) ctx.award("relu0");
        if (key === "sigmoid" && y > 0.9) ctx.award("sure");
        if (key === "sigmoid" && Math.abs(z) < 1e-9) ctx.award("half");
        if (z > 0 && F.sigmoid.f(z) < 0.6 && key !== "relu") ctx.award("differ");
      }

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, seg.el, desc, zS.el, el("span", { class: "ctl-label" }, "Output"), out, eq),
          el("div", { class: "viz-wrap" }, cv, el("p", { class: "note" }, "The bold curve is the function you picked. The grey ones are the others, for comparison."))
        )
      );
      render();
    },
  });
})();
