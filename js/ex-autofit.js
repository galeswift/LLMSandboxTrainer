/* The Machine Learns — gradient descent fits the line by itself. */
(function () {
  const { el } = TM;

  TM.register({
    id: "autofit",
    wing: "learning",
    title: "The Machine Learns",
    short: "Machine learns",
    color: "--h3",
    tagline: "Put the last three halls together: a wrongness score, plus rolling downhill, equals a machine that learns.",
    intro:
      "<p>Remember fitting the study-hours line by hand? Now the computer does it. Each step, it checks which way to nudge the slope and the starting score to lower the wrongness score, and nudges both a little.</p><p>Press <b>Train</b> and watch the line find its own way to the dots. That's <b>machine learning</b>.</p>",
    words: [
      ["Training", "Running gradient descent over and over until the loss stops dropping."],
      ["Training step", "One round of: predict, measure the loss, find the slope, nudge the knobs."],
      ["Model", "The line (or network) plus its current knob settings."],
    ],
    explainTitle: "This is how every AI model is trained",
    explain:
      "<p>Each training step does the same four things:</p><ul><li><b>Predict</b>: use the current line to guess every student's score.</li><li><b>Measure</b>: compute the wrongness score.</li><li><b>Find the slope</b>: work out how the score would change if each knob moved a tiny bit. For a network with many layers, the method for this is called <b>backpropagation</b>.</li><li><b>Nudge</b>: move every knob a little bit downhill.</li></ul><p>A chatbot's training does exactly this. The “line” is a giant network, the “students” are trillions of words of text, and the loop runs for weeks on thousands of chips.</p>",
    challenges: [
      { id: "train", title: "Let the machine fit the line", hint: "Press Train. Wait for a score under 12.", how: "Just press Train and watch. It stops improving once it finds the best line." },
      { id: "fast", title: "Make it learn in 10 steps or fewer", hint: "Raise the learning rate, but not too much.", how: "Press Start over, set the learning rate to about 0.2, then press Train." },
      { id: "addpt", title: "Add a new student and watch it re-learn", hint: "Click anywhere on the chart.", how: "Click on the chart to add a student (for example, top-left: little study, high score). Then press Train again." },
      { id: "boom", bonus: true, title: "Make training blow up", hint: "Use a learning rate that's much too big.", how: "Set the learning rate to its maximum, press Start over, then Train. The score explodes instead of shrinking." },
    ],
    mount(stage, ctx) {
      let X = TM.STUDY.X.slice(), Y = TM.STUDY.Y.slice();
      let w, c, steps, hist, running = false, lr = 0.05;
      const cv = TM.canvas(460, 320);
      const curve = TM.canvas(300, 80);
      const eq = el("div", { class: "eq" });
      const stSteps = TM.stat("Steps"), stScore = TM.stat("Score");
      const msg = el("p", { class: "note" });
      const meanX = () => X.reduce((a, b) => a + b, 0) / X.length;
      // The model trains on centered hours (x − average) so both knobs learn at a similar pace.
      const toLine = () => { const m = meanX(); return [w, c - w * m]; };

      function reset() {
        w = 0;
        c = 60;
        steps = 0;
        hist = [];
        setRunning(false);
        msg.textContent = "";
        render();
      }
      function step() {
        const m = meanX(), n = X.length;
        let gw = 0, gc = 0;
        X.forEach((x, i) => {
          const e = w * (x - m) + c - Y[i];
          gw += (2 / n) * e * (x - m);
          gc += (2 / n) * e;
        });
        w -= lr * gw;
        c -= lr * gc;
        steps++;
        const [sw, sb] = toLine();
        const score = TM.mse(sw, sb, X, Y);
        hist.push(score);
        if (!isFinite(score) || score > 1e5) {
          setRunning(false);
          msg.className = "note warn";
          msg.textContent = "Training blew up! The steps were so big the line flew away. Lower the learning rate and start over.";
          ctx.award("boom");
        } else if (score < 12) {
          ctx.award("train");
          if (steps <= 10) ctx.award("fast");
        }
        if (Math.abs(gw) + Math.abs(gc) < 0.01 && running) {
          setRunning(false);
          msg.className = "note ok";
          msg.textContent = `Finished: the line stopped improving after ${steps} steps.`;
        }
      }
      function render() {
        const [sw, sb] = toLine();
        const safe = isFinite(sw) && Math.abs(sw) < 1e4;
        TM.drawStudy(cv, X, Y, safe ? sw : 0, safe ? sb : 0);
        const score = TM.mse(sw, sb, X, Y);
        stSteps.set(steps);
        stScore.set(safe ? TM.fmt(score, 1) : "∞");
        eq.innerHTML = safe ? `score = <b>${TM.fmt(sw, 2)}</b> × hours + <b>${TM.fmt(sb, 1)}</b>` : "the line flew off the chart";
        const k = curve.ctx;
        k.fillStyle = TM.css("--panel-2");
        k.fillRect(0, 0, curve.W, curve.H);
        k.fillStyle = TM.css("--muted");
        k.font = "10px " + TM.css("--f-mono");
        k.fillText("wrongness score per step", 6, 11);
        const hs = hist.filter(isFinite);
        if (hs.length > 1) {
          const mx = Math.min(Math.max(...hs), 2000);
          k.beginPath();
          hs.forEach((v, i) => {
            const x = 4 + (i / (hs.length - 1)) * (curve.W - 8);
            const y = curve.H - 5 - (Math.min(v, mx) / mx) * (curve.H - 20);
            i ? k.lineTo(x, y) : k.moveTo(x, y);
          });
          k.strokeStyle = TM.css("--accent");
          k.lineWidth = 2;
          k.stroke();
        }
      }
      function setRunning(r) {
        running = r;
        trainBtn.textContent = r ? "Pause" : "Train";
      }
      let last = 0;
      ctx.loop((ts) => {
        if (!running || ts - last < 120) return;
        last = ts;
        step();
        render();
      });

      cv.addEventListener("pointerdown", (e) => {
        const [px, py] = cv.pointer(e);
        const [x, y] = cv.fromPx(px, py);
        if (x < 0 || x > 8.5 || y < 40 || y > 110) return;
        X.push(Math.round(x * 10) / 10);
        Y.push(Math.round(y));
        msg.className = "note";
        msg.textContent = `Added a student: ${Math.round(x * 10) / 10} hours, score ${Math.round(y)}. Press Train to let the line adjust.`;
        ctx.award("addpt");
        render();
      });

      const lrS = TM.slider({ label: "Learning rate (step size)", min: 0.01, max: 0.35, step: 0.01, value: lr, fmt: (v) => v.toFixed(2), onInput: (v) => (lr = v) });
      const trainBtn = TM.btn("Train", () => setRunning(!running), "primary");

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-row" }, trainBtn, TM.btn("Step once", () => { step(); render(); }), TM.btn("Start over", reset)),
            lrS.el,
            el("div", { class: "stats" }, stSteps.el, stScore.el),
            eq,
            msg,
            curve,
            TM.btn("Remove added students", () => { X = TM.STUDY.X.slice(); Y = TM.STUDY.Y.slice(); render(); })
          ),
          el("div", { class: "viz-wrap" }, cv, el("p", { class: "note" }, "Click the chart to add a new student."))
        )
      );
      reset();
    },
  });
})();
