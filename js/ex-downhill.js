/* Roll Downhill — gradient descent with a single knob. */
(function () {
  const { el } = TM;
  const L = (w) => (w - 3) ** 2 + 1;
  const dL = (w) => 2 * (w - 3);

  TM.register({
    id: "downhill",
    wing: "learning",
    title: "Roll Downhill",
    short: "Roll downhill",
    color: "--h3",
    tagline: "To lower the wrongness score, check which way is downhill and take a step. Repeat.",
    intro:
      "<p>Imagine a model with just one knob, w. For every setting of w there's a wrongness score, and together they make this U-shaped curve. The best w is at the bottom.</p><p>The computer can't see the whole curve. It can only feel the <b>slope</b> right where it stands. So it steps downhill, and the <b>step size</b> decides how far. This is <b>gradient descent</b>.</p>",
    words: [
      ["Gradient", "The slope under your feet: which way is uphill, and how steep."],
      ["Gradient descent", "Repeatedly take a step in the downhill direction."],
      ["Learning rate", "The step size. How far to move each step, compared to the slope."],
      ["Converge", "Settle at the bottom."],
    ],
    explainTitle: "The one rule behind all AI training",
    explain:
      "<p>Each step does: <code>new w = w − learning rate × slope</code>. On a steep part the slope is big, so the step is big. Near the bottom the slope is small, so steps get tiny and the ball settles.</p><ul><li><b>Too small</b> a learning rate: it works, but slowly.</li><li><b>A bit too big</b>: the ball jumps over the bottom and bounces side to side, but still gets there.</li><li><b>Way too big</b>: each bounce lands higher than the last, and the ball flies off. In real training this is when the loss suddenly shoots up to infinity.</li><li>Chatbots are trained with this same rule, applied to billions of knobs at once.</li></ul>",
    challenges: [
      { id: "step", title: "Take one step downhill", hint: "Press the Step button.", how: "Press “Step”. The ball moves in the direction the slope points down." },
      { id: "fast", title: "Reach the bottom in 10 steps or fewer", hint: "The starting step size is too timid.", how: "Press Reset, drag the learning rate up to about 0.3, then press Step (or Run) until the ball stops." },
      { id: "bounce", title: "Make the ball bounce from side to side", hint: "Try a learning rate a bit bigger than 0.5.", how: "Set the learning rate to around 0.8, press Reset, then Step. The ball jumps past the bottom each time but still settles." },
      { id: "boom", title: "Make the ball fly away", hint: "Use a really big step size.", how: "Set the learning rate above 1.0, press Reset, then Run. Each step overshoots more than the last." },
    ],
    mount(stage, ctx) {
      let w, steps, trail, lr = 0.05, running = false;
      const cv = TM.canvas(480, 320);
      const W0 = -3, W1 = 9, Y0 = 0, Y1 = 40;
      const tx = (v) => ((v - W0) / (W1 - W0)) * cv.W;
      const ty = (v) => cv.H - 20 - ((Math.min(v, Y1 * 1.2) - Y0) / (Y1 - Y0)) * (cv.H - 30);
      const eq = el("div", { class: "eq" });
      const stSteps = TM.stat("Steps"), stLoss = TM.stat("Score"), stSlope = TM.stat("Slope");
      const msg = el("p", { class: "note" });

      function reset() {
        w = -1.5;
        steps = 0;
        trail = [w];
        running = false;
        runBtn.textContent = "Run";
        msg.textContent = "";
        render();
      }
      function step() {
        const old = w;
        const nw = w - lr * dL(w);
        w = nw;
        steps++;
        trail.push(w);
        ctx.award("step");
        if ((old - 3) * (w - 3) < 0 && Math.abs(w - 3) < Math.abs(old - 3)) ctx.award("bounce");
        if (Math.abs(w - 3) > 12) {
          running = false;
          runBtn.textContent = "Run";
          msg.className = "note warn";
          msg.textContent = "The ball flew off the curve! The step size is too big.";
          ctx.award("boom");
        } else if (L(w) < 1.001) {
          msg.className = "note ok";
          msg.textContent = `Reached the bottom in ${steps} steps.`;
          if (steps <= 10) ctx.award("fast");
          running = false;
          runBtn.textContent = "Run";
        }
        render();
      }
      function render() {
        const c = cv.ctx;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, cv.W, cv.H);
        c.strokeStyle = TM.css("--descent-hi");
        c.lineWidth = 3;
        c.beginPath();
        for (let i = 0; i <= 200; i++) {
          const v = W0 + (i / 200) * (W1 - W0);
          i ? c.lineTo(tx(v), ty(L(v))) : c.moveTo(tx(v), ty(L(v)));
        }
        c.stroke();
        c.fillStyle = TM.css("--muted");
        c.font = "10px " + TM.css("--f-mono");
        c.fillText("knob w →", cv.W - 60, cv.H - 5);
        c.fillText("↑ wrongness", 4, 12);
        // trail of hops
        c.strokeStyle = TM.css("--ink");
        c.lineWidth = 1.2;
        c.setLineDash([3, 3]);
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1], b = trail[i];
          if (Math.abs(b - 3) > 12) break;
          c.beginPath();
          const mx = (tx(a) + tx(b)) / 2, my = Math.min(ty(L(a)), ty(L(b))) - 25;
          c.moveTo(tx(a), ty(L(a)));
          c.quadraticCurveTo(mx, my, tx(b), ty(L(b)));
          c.stroke();
        }
        c.setLineDash([]);
        if (Math.abs(w - 3) <= 12) {
          const x = tx(w), y = ty(L(w));
          // slope arrow pointing downhill
          const g = dL(w);
          if (Math.abs(g) > 0.01) {
            const dir = g > 0 ? -1 : 1;
            c.strokeStyle = TM.css("--h7");
            c.fillStyle = TM.css("--h7");
            c.lineWidth = 2.5;
            const ex = x + dir * 40;
            c.beginPath(); c.moveTo(x, y - 16); c.lineTo(ex, y - 16); c.stroke();
            c.beginPath(); c.moveTo(ex, y - 16); c.lineTo(ex - dir * 8, y - 21); c.lineTo(ex - dir * 8, y - 11); c.fill();
          }
          c.beginPath();
          c.arc(x, y, 9, 0, Math.PI * 2);
          c.fillStyle = TM.css("--panel");
          c.fill();
          c.lineWidth = 3;
          c.strokeStyle = TM.css("--ink");
          c.stroke();
        }
        const g = dL(w);
        stSteps.set(steps);
        stLoss.set(TM.fmt(L(w), 2));
        stSlope.set(TM.fmt(g, 2));
        eq.innerHTML = `new w = w − learning rate × slope\n      = ${TM.fmt(w, 2)} − ${TM.fmt(lr, 2)} × ${TM.fmt(g, 2)} = <b>${TM.fmt(w - lr * g, 2)}</b>`;
      }

      let last = 0;
      ctx.loop((ts) => {
        if (!running) return;
        if (ts - last > 280) {
          last = ts;
          step();
        }
      });
      const lrS = TM.slider({ label: "Learning rate (step size)", min: 0.01, max: 1.2, step: 0.01, value: lr, fmt: (v) => v.toFixed(2), onInput: (v) => { lr = v; render(); } });
      const runBtn = TM.btn("Run", () => { if (Math.abs(w - 3) > 12 || L(w) < 1.001) reset(); running = !running; runBtn.textContent = running ? "Pause" : "Run"; });
      const presets = el(
        "div",
        { class: "ctl-row" },
        el("span", { class: "note" }, "Quick picks:"),
        ...[["tiny", 0.05], ["good", 0.3], ["bouncy", 0.8], ["too big", 1.1]].map(([n, v]) => TM.btn(n, () => { lr = v; lrS.set(v); reset(); }))
      );

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, lrS.el, presets, el("div", { class: "ctl-row" }, TM.btn("Step", () => { if (Math.abs(w - 3) <= 12) step(); }, "primary"), runBtn, TM.btn("Reset", reset)), el("div", { class: "stats" }, stSteps.el, stLoss.el, stSlope.el), msg),
          el("div", { class: "controls" }, el("div", { class: "viz-wrap" }, cv), eq, el("p", { class: "note" }, "The red arrow points downhill. The dashed hops show the path so far."))
        )
      );
      reset();
    },
  });
})();
