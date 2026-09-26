/* Hall 4: Training Arena — a real multilayer network trained live with backpropagation. */
(function () {
  const { el } = TM;

  const ACT = {
    tanh: { f: Math.tanh, d: (z, a) => 1 - a * a },
    relu: { f: (z) => (z > 0 ? z : 0), d: (z) => (z > 0 ? 1 : 0) },
    sigmoid: { f: (z) => 1 / (1 + Math.exp(-z)), d: (z, a) => a * (1 - a) },
  };

  function makeData(kind, noise, seed) {
    const r = TM.rng(seed);
    const pts = [];
    const N = 240;
    for (let i = 0; i < N; i++) {
      let x, y, c;
      if (kind === "blobs") {
        c = i % 2;
        x = (c ? 0.45 : -0.45) + r.normal() * 0.22;
        y = (c ? 0.35 : -0.35) + r.normal() * 0.22;
      } else if (kind === "circle") {
        c = i % 2;
        const rad = c ? 0.25 + r() * 0.3 : 0.7 + r() * 0.25;
        const t = r() * Math.PI * 2;
        x = rad * Math.cos(t);
        y = rad * Math.sin(t);
      } else if (kind === "xor") {
        x = r() * 1.8 - 0.9;
        y = r() * 1.8 - 0.9;
        const pad = 0.08;
        x += x > 0 ? pad : -pad;
        y += y > 0 ? pad : -pad;
        c = x * y > 0 ? 1 : 0;
      } else {
        c = i % 2;
        const k = Math.floor(i / 2) / (N / 2);
        const rad = 0.08 + k * 0.85;
        const t = k * 3.2 * Math.PI + c * Math.PI;
        x = rad * Math.sin(t);
        y = rad * Math.cos(t);
      }
      x += r.normal() * noise * 0.5;
      y += r.normal() * noise * 0.5;
      pts.push({ x, y, c, test: r() < 0.3 });
    }
    return pts;
  }

  function features(x, y, opt) {
    const f = [x, y];
    if (opt.sq) f.push(x * x, y * y);
    if (opt.xy) f.push(x * y);
    if (opt.sin) f.push(Math.sin(3 * x), Math.sin(3 * y));
    return f;
  }

  function makeNet(sizes, act, seed) {
    const r = TM.rng(seed);
    const layers = [];
    for (let l = 1; l < sizes.length; l++) {
      const nin = sizes[l - 1], nout = sizes[l];
      const scale = act === "relu" ? Math.sqrt(2 / nin) : Math.sqrt(1 / nin);
      const W = new Float64Array(nin * nout).map(() => r.normal() * scale);
      layers.push({ nin, nout, W, b: new Float64Array(nout), gW: new Float64Array(nin * nout), gb: new Float64Array(nout), mW: new Float64Array(nin * nout), vW: new Float64Array(nin * nout), mb: new Float64Array(nout), vb: new Float64Array(nout) });
    }
    return { sizes, layers, act, t: 0 };
  }

  function forward(net, x) {
    const as = [x], zs = [];
    let a = x;
    net.layers.forEach((L, li) => {
      const z = new Float64Array(L.nout);
      for (let o = 0; o < L.nout; o++) {
        let s = L.b[o];
        for (let i = 0; i < L.nin; i++) s += L.W[o * L.nin + i] * a[i];
        z[o] = s;
      }
      const last = li === net.layers.length - 1;
      a = last ? z : z.map(ACT[net.act].f);
      zs.push(z);
      as.push(a);
    });
    const logit = a[0];
    return { as, zs, p: 1 / (1 + Math.exp(-logit)) };
  }

  function trainStep(net, X, Y, opt) {
    const Ls = net.layers;
    Ls.forEach((L) => {
      L.gW.fill(0);
      L.gb.fill(0);
    });
    let loss = 0;
    for (let n = 0; n < X.length; n++) {
      const { as, zs, p } = forward(net, X[n]);
      const y = Y[n];
      const pc = Math.min(1 - 1e-7, Math.max(1e-7, p));
      loss += -(y * Math.log(pc) + (1 - y) * Math.log(1 - pc));
      let dz = new Float64Array([p - y]);
      for (let l = Ls.length - 1; l >= 0; l--) {
        const L = Ls[l], aPrev = as[l];
        for (let o = 0; o < L.nout; o++) {
          L.gb[o] += dz[o];
          for (let i = 0; i < L.nin; i++) L.gW[o * L.nin + i] += dz[o] * aPrev[i];
        }
        if (l > 0) {
          const da = new Float64Array(L.nin);
          for (let o = 0; o < L.nout; o++) for (let i = 0; i < L.nin; i++) da[i] += L.W[o * L.nin + i] * dz[o];
          const zp = zs[l - 1], ap = as[l];
          dz = da.map((v, i) => v * ACT[net.act].d(zp[i], ap[i]));
        }
      }
    }
    const N = X.length;
    net.t++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    for (const L of Ls) {
      const upd = (P, G, M, V) => {
        for (let i = 0; i < P.length; i++) {
          const g = G[i] / N;
          if (opt.optim === "adam") {
            M[i] = b1 * M[i] + (1 - b1) * g;
            V[i] = b2 * V[i] + (1 - b2) * g * g;
            const mh = M[i] / (1 - Math.pow(b1, net.t)), vh = V[i] / (1 - Math.pow(b2, net.t));
            P[i] -= opt.lr * mh / (Math.sqrt(vh) + eps);
          } else {
            M[i] = 0.9 * M[i] + g;
            P[i] -= opt.lr * M[i];
          }
        }
      };
      upd(L.W, L.gW, L.mW, L.vW);
      upd(L.b, L.gb, L.mb, L.vb);
    }
    return loss / N;
  }

  TM.register({
    id: "arena",
    wing: "learning",
    title: "Training Arena",
    short: "Training arena",
    color: "--h4",
    tagline: "Stack neurons into layers, press Train, and watch a real network learn to sort dots.",
    intro:
      "<p>Each dot is an example with a label: blue or orange. The network sees a dot's position and has to guess its color. The background shades show what the network currently guesses for every spot.</p><p>Press <b>Train</b> and watch the shading learn the pattern. Hollow dots are <b>test</b> dots the network never trains on. They check whether it really learned the pattern or just memorized.</p>",
    words: [
      ["Layer", "A column of neurons. Each neuron in a layer looks at everything the layer before it produced."],
      ["Hidden layer", "A layer between the input and the answer. More hidden neurons can draw more complicated shapes."],
      ["Accuracy", "The percent of dots the network colors correctly."],
      ["Test data", "Examples kept aside to check the model on things it hasn't seen."],
      ["Overfitting", "Memorizing the training dots instead of learning the real pattern."],
    ],
    explainTitle: "Why layers beat a single neuron",
    explain:
      "<p>A single neuron can only draw one straight line (remember the XOR wall?). A hidden layer has several neurons, each drawing its own line, and the output neuron combines them. Together they can draw curves, rings, and islands.</p><ul><li>Every training step is the same loop as the study-hours line: predict, measure the loss, find the slope for every weight (<b>backpropagation</b>), and nudge.</li><li>The lines in the network diagram are the weights. Blue means positive, red means negative, and thicker means bigger. Watch them change while it trains.</li><li>A chatbot is this same idea with hundreds of layers and billions of weights, trained to guess the next word instead of a color.</li></ul>",
    challenges: [
      { id: "blobs", title: "Train on Blobs", hint: "Press Train and wait for 90%+ test accuracy.", how: "Blobs is already selected. Just press Train. The two groups are easy to split with one straight line." },
      { id: "circle", title: "Solve Circle", hint: "Reach 90%+ test accuracy.", how: "Click “Circle”, then press Train. The hidden layer lets the network draw a ring. If it gets stuck, press “Re-roll weights” and train again." },
      { id: "xor", title: "Beat the XOR wall", hint: "Reach 90%+ test accuracy on XOR.", how: "Click “XOR” and press Train. This is the pattern one neuron couldn't do. With a hidden layer it can." },
      { id: "nohidden", title: "See why layers matter", hint: "Try Circle with 0 hidden layers.", how: "Click Circle, press − on “Hidden layers” until it says 0, then Train for a while. It can only draw a straight line, so it gets stuck around 50–60%." },
      { id: "spiral", bonus: true, title: "Tame the spiral", hint: "90%+ test accuracy on Spiral.", how: "Use 2 hidden layers with 8 neurons each, then Train. Be patient: it takes a while." },
      { id: "tiny", bonus: true, title: "Minimalist", hint: "Spiral at 90%+ with 8 or fewer hidden neurons in total.", how: "Open “More controls” and try the extra input features, like sin." },
    ],
    mount(stage, ctx) {
      const s = { data: "blobs", noise: 0.1, layers: 1, width: 4, act: "tanh", optim: "adam", lr: 0.03, sq: false, xy: false, sin: false, seed: 1 };
      let pts, X, Y, Xt, Yt, net, steps = 0, losses = [], running = false;
      const W = 380, H = 380;
      const cv = TM.canvas(W, H);
      const curve = TM.canvas(300, 90);
      const RES = 64;
      const heat = document.createElement("canvas");
      heat.width = RES;
      heat.height = RES;
      const toPx = (v) => ((v + 1.25) / 2.5) * W;
      const toPy = (v) => H - ((v + 1.25) / 2.5) * H;

      function sizes() {
        const nin = features(0, 0, s).length;
        return [nin, ...Array(s.layers).fill(s.width), 1];
      }
      function rebuildData() {
        pts = makeData(s.data, s.noise, s.seed);
        const tr = pts.filter((p) => !p.test), te = pts.filter((p) => p.test);
        X = tr.map((p) => features(p.x, p.y, s));
        Y = tr.map((p) => p.c);
        Xt = te.map((p) => features(p.x, p.y, s));
        Yt = te.map((p) => p.c);
      }
      function rebuildNet() {
        net = makeNet(sizes(), s.act, s.seed * 7 + 3);
        steps = 0;
        losses = [];
        buildDiagram();
      }
      const acc = (XX, YY) => (XX.length ? XX.filter((x, i) => (forward(net, x).p > 0.5 ? 1 : 0) === YY[i]).length / XX.length : 0);

      function drawHeat() {
        const h = heat.getContext("2d");
        const img = h.createImageData(RES, RES);
        const ca = TM.hexToRgb(TM.css("--cls-a")), cb = TM.hexToRgb(TM.css("--cls-b")), bg = TM.hexToRgb(TM.css("--panel-2"));
        for (let j = 0; j < RES; j++)
          for (let i = 0; i < RES; i++) {
            const x = -1.25 + ((i + 0.5) / RES) * 2.5, y = 1.25 - ((j + 0.5) / RES) * 2.5;
            const p = forward(net, features(x, y, s)).p;
            const conf = Math.abs(p - 0.5) * 2;
            const c = TM.mixRgb(bg, p > 0.5 ? cb : ca, 0.15 + conf * 0.55);
            const k = (j * RES + i) * 4;
            img.data[k] = c[0];
            img.data[k + 1] = c[1];
            img.data[k + 2] = c[2];
            img.data[k + 3] = 255;
          }
        h.putImageData(img, 0, 0);
        const c = cv.ctx;
        c.imageSmoothingEnabled = true;
        c.drawImage(heat, 0, 0, W, H);
        c.strokeStyle = TM.css("--line-strong");
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(toPx(0), 0);
        c.lineTo(toPx(0), H);
        c.moveTo(0, toPy(0));
        c.lineTo(W, toPy(0));
        c.stroke();
        const cA = TM.css("--cls-a"), cB = TM.css("--cls-b"), ink = TM.css("--panel");
        for (const p of pts) {
          c.beginPath();
          c.arc(toPx(p.x), toPy(p.y), p.test ? 4 : 4.2, 0, Math.PI * 2);
          if (p.test) {
            c.fillStyle = ink;
            c.fill();
            c.lineWidth = 2;
            c.strokeStyle = p.c ? cB : cA;
            c.stroke();
          } else {
            c.fillStyle = p.c ? cB : cA;
            c.fill();
            c.lineWidth = 1;
            c.strokeStyle = ink;
            c.stroke();
          }
        }
      }

      function drawCurve() {
        const c = curve.ctx, w = curve.W, h = curve.H;
        c.fillStyle = TM.css("--panel-2");
        c.fillRect(0, 0, w, h);
        c.fillStyle = TM.css("--muted");
        c.font = "10px " + TM.css("--f-mono");
        c.fillText("training loss", 6, 11);
        if (losses.length < 2) return;
        const mx = Math.max(0.8, ...losses.filter(isFinite));
        c.beginPath();
        losses.forEach((l, i) => {
          const x = 4 + (i / (losses.length - 1)) * (w - 8);
          const y = h - 5 - (Math.min(l, mx) / mx) * (h - 20);
          i ? c.lineTo(x, y) : c.moveTo(x, y);
        });
        c.strokeStyle = TM.css("--h4");
        c.lineWidth = 2;
        c.stroke();
      }

      // ---- network diagram ----
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 300 170");
      svg.style.width = "100%";
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Network diagram; line color shows the sign of each weight, thickness its size");
      let edgeEls = [];
      function buildDiagram() {
        svg.replaceChildren();
        edgeEls = [];
        const sz = net.sizes;
        const colX = (l) => 20 + (l * 260) / (sz.length - 1);
        const rowY = (l, i) => 85 + (i - (sz[l] - 1) / 2) * Math.min(22, 150 / sz[l]);
        net.layers.forEach((L, l) => {
          for (let o = 0; o < L.nout; o++)
            for (let i = 0; i < L.nin; i++) {
              const ln = document.createElementNS(svgNS, "line");
              ln.setAttribute("x1", colX(l));
              ln.setAttribute("y1", rowY(l, i));
              ln.setAttribute("x2", colX(l + 1));
              ln.setAttribute("y2", rowY(l + 1, o));
              svg.append(ln);
              edgeEls.push([ln, L, o * L.nin + i]);
            }
        });
        const names = ["x", "y", "x²", "y²", "xy", "sin x", "sin y"].filter((n, i) => i < 2 || (i < 4 && s.sq) || (i === 4 && s.xy) || (i > 4 && s.sin));
        sz.forEach((n, l) => {
          for (let i = 0; i < n; i++) {
            const c = document.createElementNS(svgNS, "circle");
            c.setAttribute("cx", colX(l));
            c.setAttribute("cy", rowY(l, i));
            c.setAttribute("r", n > 8 ? 4 : 5.5);
            c.setAttribute("fill", l === 0 || l === sz.length - 1 ? "var(--ink)" : "var(--accent)");
            svg.append(c);
            if (l === 0) {
              const t = document.createElementNS(svgNS, "text");
              t.setAttribute("x", colX(l) + 9);
              t.setAttribute("y", rowY(l, i) + 3);
              t.setAttribute("font-size", 8);
              t.setAttribute("fill", "var(--muted)");
              t.setAttribute("font-family", "var(--f-mono)");
              t.textContent = names[i];
              svg.append(t);
            }
          }
        });
        updateDiagram();
      }
      function updateDiagram() {
        let mx = 0.01;
        for (const [, L, k] of edgeEls) mx = Math.max(mx, Math.abs(L.W[k]));
        for (const [ln, L, k] of edgeEls) {
          const w = L.W[k];
          ln.setAttribute("stroke", w >= 0 ? "var(--pos)" : "var(--neg)");
          ln.setAttribute("stroke-width", (0.3 + (Math.abs(w) / mx) * 2.8).toFixed(2));
          ln.setAttribute("stroke-opacity", (0.25 + (Math.abs(w) / mx) * 0.7).toFixed(2));
        }
      }

      const stStep = TM.stat("Steps"), stLoss = TM.stat("Loss"), stTr = TM.stat("Train acc"), stTe = TM.stat("Test acc"), stParams = TM.stat("Weights");
      function render() {
        drawHeat();
        drawCurve();
        updateDiagram();
        const tr = acc(X, Y), te = acc(Xt, Yt);
        stStep.set(steps);
        stLoss.set(losses.length ? TM.fmt(losses[losses.length - 1], 3) : "–");
        stTr.set(`${Math.round(tr * 100)}%`);
        stTe.set(`${Math.round(te * 100)}%`);
        stParams.set(net.layers.reduce((n, L) => n + L.W.length + L.b.length, 0));
        if (steps > 0) {
          if (s.data === "blobs" && te >= 0.9) ctx.award("blobs");
          if (s.data === "circle" && te >= 0.9) ctx.award("circle");
          if (s.data === "xor" && te >= 0.9) ctx.award("xor");
          if (s.data === "circle" && s.layers === 0 && steps >= 200 && te < 0.8) ctx.award("nohidden");
          if (s.data === "spiral" && te >= 0.9) ctx.award("spiral");
          if (s.data === "spiral" && te >= 0.9 && s.layers * s.width <= 8) ctx.award("tiny");
        }
      }

      function doSteps(n) {
        for (let i = 0; i < n; i++) {
          const l = trainStep(net, X, Y, s);
          steps++;
          losses.push(l);
          if (losses.length > 600) losses = losses.filter((_, k) => k % 2 === 0);
          if (!isFinite(l)) {
            setRunning(false);
            break;
          }
        }
      }
      let frame = 0;
      ctx.loop(() => {
        if (!running) return;
        doSteps(spd.get());
        if (++frame % 2 === 0) render();
      });
      function setRunning(r) {
        running = r;
        trainBtn.textContent = r ? "Pause" : "Train";
      }

      // ---- controls ----
      const reset = () => {
        rebuildNet();
        render();
      };
      const dataSeg = TM.seg({ label: "Dataset", options: [["blobs", "Blobs"], ["circle", "Circle"], ["xor", "XOR"], ["spiral", "Spiral"]], value: s.data, onChange: (v) => { s.data = v; rebuildData(); reset(); } });
      const noiseS = TM.slider({ label: "Noise", min: 0, max: 0.5, step: 0.05, value: s.noise, fmt: (v) => v.toFixed(2), onInput: (v) => { s.noise = v; rebuildData(); render(); } });
      const layersSt = TM.stepper({ label: "Hidden layers", min: 0, max: 3, value: s.layers, onChange: (v) => { s.layers = v; reset(); } });
      const widthSt = TM.stepper({ label: "Neurons per layer", min: 1, max: 12, value: s.width, onChange: (v) => { s.width = v; reset(); } });
      const actSeg = TM.seg({ label: "Activation", options: [["tanh", "tanh"], ["relu", "ReLU"], ["sigmoid", "sigmoid"]], value: s.act, onChange: (v) => { s.act = v; reset(); } });
      const optSeg = TM.seg({ label: "Optimizer", options: [["sgd", "SGD + momentum"], ["adam", "Adam"]], value: s.optim, onChange: (v) => { s.optim = v; reset(); } });
      const lrS = TM.slider({ label: "Learning rate", min: 0, max: 100, step: 1, value: (100 * Math.log(s.lr / 0.001)) / Math.log(1000), fmt: (v) => TM.sig(0.001 * Math.pow(1000, v / 100)), onInput: (v) => (s.lr = 0.001 * Math.pow(1000, v / 100)) });
      const spd = TM.slider({ label: "Steps per frame", min: 1, max: 20, step: 1, value: 4 });
      const feat = (key, label) => {
        const cb = el("input", { type: "checkbox", id: `ar-${key}` });
        cb.addEventListener("change", () => { s[key] = cb.checked; rebuildData(); reset(); });
        return el("label", { class: "check", for: `ar-${key}` }, cb, label);
      };
      const trainBtn = TM.btn("Train", () => setRunning(!running), "primary");

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            dataSeg.el,
            el("div", { class: "ctl-row" }, layersSt.el, widthSt.el),
            el(
              "details",
              { class: "more" },
              el("summary", null, "More controls"),
              el(
                "div",
                { class: "controls", style: { marginTop: "10px" } },
                noiseS.el,
                el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Extra input features"), el("div", { class: "ctl-row" }, feat("sq", "x², y²"), feat("xy", "x·y"), feat("sin", "sin"))),
                actSeg.el,
                optSeg.el,
                lrS.el,
                spd.el
              )
            )
          ),
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-row" }, trainBtn, TM.btn("Step once", () => { doSteps(1); render(); }), TM.btn("Re-roll weights", () => { s.seed++; reset(); }), TM.btn("New data", () => { s.seed++; rebuildData(); reset(); })),
            el("div", { class: "stats" }, stStep.el, stLoss.el, stTr.el, stTe.el, stParams.el),
            el("div", { class: "split wide-left" }, el("div", { class: "viz-wrap" }, cv), el("div", { class: "controls" }, svg, el("p", { class: "note" }, "Blue lines are positive weights, red are negative; thickness is size. Watch them change as it trains."), curve))
          )
        )
      );
      rebuildData();
      rebuildNet();
      render();
    },
  });
})();
