/* Hall 3: Gradient Descent Hill — loss landscapes, learning rate, momentum. */
(function () {
  const { el } = TM;

  const SURFACES = {
    bowl: { name: "Bowl", f: (x, y) => 0.5 * (x * x + y * y), start: [-2.4, 1.6] },
    ravine: { name: "Ravine", f: (x, y) => 0.02 * x * x + 2.5 * y * y, start: [-2.6, 1.2] },
    twin: { name: "Twin valleys", f: (x, y) => 0.1 * (x * x - 4) ** 2 + 0.3 * x + 0.5 * y * y, start: [-0.3, 1.8] },
    egg: { name: "Egg crate", f: (x, y) => 0.25 * (x * x + y * y) + 0.6 * (1 - Math.cos(2.6 * x) * Math.cos(2.6 * y)), start: [-2.3, 1.7] },
  };
  // shift every surface so its lowest point is exactly 0
  for (const s of Object.values(SURFACES)) {
    let m = Infinity;
    for (let x = -3; x <= 3; x += 0.01) for (let y = -2.25; y <= 2.25; y += 0.05) m = Math.min(m, s.f(x, y));
    const f0 = s.f;
    s.f = (x, y) => f0(x, y) - m;
  }
  const X0 = -3, X1 = 3, Y0 = -2.25, Y1 = 2.25;

  TM.register({
    id: "descent",
    wing: "learning",
    title: "Two-Knob Landscape",
    short: "Two-knob landscape",
    color: "--h3",
    tagline: "With two knobs, the wrongness score becomes a landscape of hills and valleys, seen from above.",
    intro:
      "<p>Last hall had one knob, so the score was a curve. With two knobs, every spot on this map is one setting of both knobs, and its color is the score. Stronger color means more wrong. The ball uses the same rule: feel the slope, step downhill.</p><p>Click anywhere on the map to drop the ball, then press <b>Run</b>. Try the different landscapes.</p>",
    words: [
      ["Landscape", "A map of the wrongness score for every combination of knob settings."],
      ["Valley (minimum)", "A low spot where the ball comes to rest."],
      ["Local minimum", "A valley that isn't the lowest one. The ball can get stuck there."],
      ["Momentum", "Letting the ball keep some speed from its last step, like a real rolling ball."],
    ],
    explainTitle: "Landscapes with billions of directions",
    explain:
      "<p>A real chatbot has billions of knobs, so its landscape has billions of directions. Nobody can draw it, but the ball-rolling rule still works: measure the slope in every direction at once, and step downhill.</p><ul><li><b>Twin valleys</b> show the danger of local minima: the ball only sees the ground under it, so it can settle in the wrong valley.</li><li><b>Ravine</b> is steep one way and flat the other. The ball zig-zags. <b>Momentum</b> smooths that out, and the popular training method “Adam” uses momentum.</li><li>Surprisingly, in huge models getting stuck is rarer than you'd expect: with so many directions, there's almost always one that still goes down.</li></ul>",
    challenges: [
      { id: "bottom", title: "Roll the ball to the bottom of the Bowl", hint: "Press Run and wait for it to settle.", how: "Pick “Bowl”, press Run, and wait. The score needs to drop below 0.01." },
      { id: "fast", title: "Reach the bottom of the Bowl in 10 steps or fewer", hint: "Raise the learning rate.", how: "Press Reset, drag the learning rate up to about 0.5, then press Run." },
      { id: "trap", title: "Get stuck in the wrong valley", hint: "On Twin valleys, land in the right-hand valley.", how: "Pick “Twin valleys”, then click the map a little to the right of the middle to drop the ball there, and press Run. The right-hand valley is higher than the left one." },
      { id: "ravine", bonus: true, title: "Cross the Ravine in 80 steps", hint: "Get the score under 0.001 within 80 steps.", how: "Pick Ravine, set momentum to about 0.8 and the learning rate to about 0.15, then Reset and Run." },
      { id: "egg", bonus: true, title: "Escape the Egg crate", hint: "Start far from the center and still reach a score under 0.01.", how: "Use momentum around 0.9 with a learning rate around 0.1. The ball needs speed to roll over the little bumps." },
    ],
    mount(stage, ctx) {
      const W = 520, H = 390;
      const cv = TM.canvas(W, H);
      const spark = TM.canvas(300, 80);
      const bgCanvas = document.createElement("canvas");
      bgCanvas.width = W;
      bgCanvas.height = H;
      let surfKey = "bowl";
      let S = SURFACES.bowl;
      let bgTheme = "";

      const lrFromS = (v) => 0.001 * Math.pow(2000, v / 100);
      const sToLr = (lr) => (100 * Math.log(lr / 0.001)) / Math.log(2000);
      let lr = 0.1, mu = 0;
      let p, v, steps, hist, trail, status, running = false, startDist;

      const toPx = (x, y) => [((x - X0) / (X1 - X0)) * W, H - ((y - Y0) / (Y1 - Y0)) * H];
      const fromPx = (px, py) => [X0 + (px / W) * (X1 - X0), Y0 + ((H - py) / H) * (Y1 - Y0)];
      const grad = (x, y) => {
        const h = 1e-5;
        return [(S.f(x + h, y) - S.f(x - h, y)) / (2 * h), (S.f(x, y + h) - S.f(x, y - h)) / (2 * h)];
      };

      function paintBackground() {
        const bctx = bgCanvas.getContext("2d");
        const img = bctx.createImageData(W, H);
        const lo = TM.hexToRgb(TM.css("--descent-lo"));
        const hi = TM.hexToRgb(TM.css("--descent-hi"));
        const line = TM.hexToRgb(TM.css("--ink"));
        let fmax = 0;
        const vals = new Float32Array(W * H);
        for (let j = 0; j < H; j++)
          for (let i = 0; i < W; i++) {
            const [x, y] = fromPx(i + 0.5, j + 0.5);
            const f = S.f(x, y);
            vals[j * W + i] = f;
            if (f > fmax) fmax = f;
          }
        const levels = 16;
        const band = (f) => Math.floor((Math.log1p(f * 4) / Math.log1p(fmax * 4)) * levels);
        for (let j = 0; j < H; j++)
          for (let i = 0; i < W; i++) {
            const f = vals[j * W + i];
            const b = band(f);
            const edge = (i + 1 < W && band(vals[j * W + i + 1]) !== b) || (j + 1 < H && band(vals[(j + 1) * W + i]) !== b);
            let c = TM.mixRgb(lo, hi, Math.min(1, b / levels) * 0.9);
            if (edge) c = TM.mixRgb(c, line, 0.35);
            const k = (j * W + i) * 4;
            img.data[k] = c[0];
            img.data[k + 1] = c[1];
            img.data[k + 2] = c[2];
            img.data[k + 3] = 255;
          }
        bctx.putImageData(img, 0, 0);
        bgTheme = TM.css("--descent-lo") + surfKey;
      }

      function reset(start) {
        p = (start || S.start).slice();
        v = [0, 0];
        steps = 0;
        hist = [S.f(p[0], p[1])];
        trail = [p.slice()];
        status = "ready";
        startDist = Math.hypot(p[0], p[1]);
        setRunning(false);
        draw();
      }

      function step() {
        if (status === "diverged") return;
        const g = grad(p[0], p[1]);
        v = [mu * v[0] - lr * g[0], mu * v[1] - lr * g[1]];
        p = [p[0] + v[0], p[1] + v[1]];
        steps++;
        const f = S.f(p[0], p[1]);
        hist.push(f);
        trail.push(p.slice());
        if (!isFinite(f) || Math.abs(p[0]) > 9 || Math.abs(p[1]) > 9 || f > 1e5) {
          status = "diverged";
          setRunning(false);
          ctx.award("boom");
        } else if (Math.hypot(...g) < 2e-4 && Math.hypot(...v) < 1e-4) {
          status = "settled";
          setRunning(false);
        } else status = "moving";
        checks(f);
      }

      function checks(f) {
        if (surfKey === "bowl" && f < 0.01) ctx.award("bottom");
        if (surfKey === "bowl" && f < 0.01 && steps <= 10) ctx.award("fast");
        if (surfKey === "ravine" && f < 0.001 && steps <= 80) ctx.award("ravine");
        if (surfKey === "twin" && status === "settled" && p[0] > 0) ctx.award("trap");
        if (surfKey === "egg" && f < 0.01 && startDist >= 2) ctx.award("egg");
      }

      function draw() {
        if (bgTheme !== TM.css("--descent-lo") + surfKey) paintBackground();
        const c = cv.ctx;
        c.drawImage(bgCanvas, 0, 0, W, H);
        // axes labels
        c.fillStyle = TM.css("--muted");
        c.font = "11px " + TM.css("--f-mono");
        c.fillText("weight 1 →", W - 76, H - 8);
        c.save();
        c.translate(12, 84);
        c.rotate(-Math.PI / 2);
        c.fillText("weight 2 →", 0, 0);
        c.restore();
        // minimum marker
        c.strokeStyle = TM.css("--ink");
        c.lineWidth = 1;
        // trail
        c.strokeStyle = TM.css("--ink");
        c.lineWidth = 1.6;
        c.beginPath();
        trail.forEach((q, i) => {
          const [x, y] = toPx(q[0], q[1]);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        });
        c.stroke();
        c.fillStyle = TM.css("--ink");
        for (const q of trail) {
          const [x, y] = toPx(q[0], q[1]);
          c.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
        // ball
        if (status !== "diverged") {
          const [bx, by] = toPx(p[0], p[1]);
          c.beginPath();
          c.arc(bx, by, 9, 0, Math.PI * 2);
          c.fillStyle = TM.css("--panel");
          c.fill();
          c.lineWidth = 3;
          c.strokeStyle = TM.css("--ink");
          c.stroke();
          // gradient arrow (downhill direction)
          const g = grad(p[0], p[1]);
          const gl = Math.hypot(...g);
          if (gl > 1e-6) {
            const len = Math.min(60, 14 + gl * 12);
            const ex = bx - (g[0] / gl) * len, ey = by + (g[1] / gl) * len;
            c.strokeStyle = TM.css("--h7");
            c.lineWidth = 2.5;
            c.beginPath();
            c.moveTo(bx, by);
            c.lineTo(ex, ey);
            c.stroke();
            const ang = Math.atan2(ey - by, ex - bx);
            c.beginPath();
            c.moveTo(ex, ey);
            c.lineTo(ex - 8 * Math.cos(ang - 0.4), ey - 8 * Math.sin(ang - 0.4));
            c.lineTo(ex - 8 * Math.cos(ang + 0.4), ey - 8 * Math.sin(ang + 0.4));
            c.fillStyle = TM.css("--h7");
            c.fill();
          }
        } else {
          c.fillStyle = TM.css("--bad");
          c.font = "700 16px " + TM.css("--f-body");
          c.textAlign = "center";
          c.fillText("Diverged: the ball flew off the map.", W / 2, 34);
          c.textAlign = "left";
        }
        drawSpark();
        const f = hist[hist.length - 1];
        stSteps.set(steps);
        stLoss.set(TM.fmt(f, 4));
        const g = grad(p[0], p[1]);
        stGrad.set(TM.fmt(Math.hypot(...g), 3));
        stStatus.set({ ready: "ready", moving: "rolling", settled: "settled", diverged: "diverged" }[status]);
        pos.textContent = `weights = (${TM.fmt(p[0], 3)}, ${TM.fmt(p[1], 3)})   gradient = (${TM.fmt(g[0], 3)}, ${TM.fmt(g[1], 3)})\nnext step = −${TM.sig(lr)} × gradient${mu ? ` + ${mu} × previous step` : ""}`;
      }

      function drawSpark() {
        const c = spark.ctx, w = spark.W, h = spark.H;
        c.clearRect(0, 0, w, h);
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, w, h);
        const vals = hist.map((f) => Math.log10(Math.max(1e-6, Math.min(1e5, f))));
        const mn = Math.min(...vals, -3), mx = Math.max(...vals, 1);
        const n = Math.max(20, vals.length);
        c.beginPath();
        vals.forEach((vv, i) => {
          const x = 4 + (i / (n - 1)) * (w - 8);
          const y = h - 6 - ((vv - mn) / (mx - mn || 1)) * (h - 18);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        });
        c.strokeStyle = TM.css("--h3");
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = TM.css("--muted");
        c.font = "10px " + TM.css("--f-mono");
        c.fillText("loss (log scale) per step", 6, 11);
      }

      let acc = 0, last = 0;
      function setRunning(r) {
        running = r;
        runBtn.textContent = r ? "Pause" : "Run";
      }
      ctx.loop((ts) => {
        const dt = Math.min(100, ts - (last || ts));
        last = ts;
        if (running) {
          acc += (dt / 1000) * speed.get();
          let did = false;
          while (acc >= 1 && running) {
            step();
            acc -= 1;
            did = true;
          }
          if (did) draw();
        }
      });

      const surfSeg = TM.seg({
        label: "Landscape",
        options: Object.entries(SURFACES).map(([k, s]) => [k, s.name]),
        value: surfKey,
        onChange: (k) => {
          surfKey = k;
          S = SURFACES[k];
          reset();
        },
      });
      const lrS = TM.slider({ label: "Learning rate", min: 0, max: 100, step: 0.5, value: sToLr(lr), fmt: (v) => TM.sig(lrFromS(v)), onInput: (v) => ((lr = lrFromS(v)), draw()) });
      const muS = TM.slider({ label: "Momentum", min: 0, max: 0.95, step: 0.05, value: 0, fmt: (v) => v.toFixed(2), onInput: (v) => ((mu = v), draw()) });
      const speed = TM.slider({ label: "Speed (steps per second)", min: 1, max: 60, step: 1, value: 8 });
      const runBtn = TM.btn("Run", () => {
        if (status === "diverged" || status === "settled") reset(trail[0]);
        setRunning(!running);
      }, "primary");
      const stSteps = TM.stat("Steps"), stLoss = TM.stat("Loss"), stGrad = TM.stat("Slope"), stStatus = TM.stat("Ball");
      const pos = el("div", { class: "readout" });

      cv.addEventListener("pointerdown", (e) => {
        const [px, py] = cv.pointer(e);
        reset(fromPx(px, py));
      });

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            surfSeg.el,
            lrS.el,
            muS.el,
            speed.el,
            el("div", { class: "ctl-row" }, runBtn, TM.btn("Step once", () => { if (status === "settled") status = "moving"; step(); draw(); }), TM.btn("Reset", () => reset(trail[0]))),
            el("div", { class: "stats" }, stSteps.el, stLoss.el, stGrad.el, stStatus.el),
            spark
          ),
          el("div", { class: "controls" }, el("div", { class: "viz-wrap" }, cv), el("p", { class: "note" }, "Contour map of the loss: stronger amber means higher loss. Click to drop the ball. The red arrow points straight downhill."), pos)
        )
      );
      reset();
    },
  });
})();
