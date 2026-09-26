/* The Wrongness Score — loss, by hand. */
(function () {
  const { el } = TM;
  TM.STUDY = { X: [1, 2, 3, 4, 5, 6, 7], Y: [59, 58, 70, 73, 84, 83, 93] };
  TM.mse = (w, b, X, Y) => X.reduce((s, x, i) => s + (w * x + b - Y[i]) ** 2, 0) / X.length;

  // Shared chart for the study-hours data (used here and in "The Machine Learns").
  TM.drawStudy = function (cv, X, Y, w, b) {
    const c = cv.ctx, W = cv.W, H = cv.H;
    const X0 = 0, X1 = 8.5, Y0 = 40, Y1 = 110;
    const tx = (x) => 40 + ((x - X0) / (X1 - X0)) * (W - 50);
    const ty = (y) => H - 30 - ((y - Y0) / (Y1 - Y0)) * (H - 40);
    c.fillStyle = TM.css("--panel-2");
    c.fillRect(0, 0, W, H);
    c.strokeStyle = TM.css("--line");
    c.lineWidth = 1;
    c.fillStyle = TM.css("--muted");
    c.font = "10px " + TM.css("--f-mono");
    for (let x = 0; x <= 8; x++) {
      c.beginPath(); c.moveTo(tx(x), ty(Y0)); c.lineTo(tx(x), ty(Y1)); c.stroke();
      c.fillText(x, tx(x) - 3, H - 16);
    }
    for (let y = 40; y <= 110; y += 10) {
      c.beginPath(); c.moveTo(tx(0), ty(y)); c.lineTo(tx(X1), ty(y)); c.stroke();
      c.fillText(y, 12, ty(y) + 3);
    }
    c.fillText("hours studied →", W - 110, H - 3);
    c.save(); c.translate(10, 110); c.rotate(-Math.PI / 2); c.fillText("test score →", 0, 0); c.restore();
    // error lines
    c.strokeStyle = TM.css("--neg");
    c.lineWidth = 2;
    X.forEach((x, i) => {
      c.beginPath(); c.moveTo(tx(x), ty(Y[i])); c.lineTo(tx(x), ty(w * x + b)); c.stroke();
    });
    // model line
    c.strokeStyle = TM.css("--accent");
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(tx(X0), ty(w * X0 + b)); c.lineTo(tx(X1), ty(w * X1 + b)); c.stroke();
    // points
    X.forEach((x, i) => {
      c.beginPath(); c.arc(tx(x), ty(Y[i]), 6, 0, Math.PI * 2);
      c.fillStyle = TM.css("--ink"); c.fill();
    });
    cv.fromPx = (px, py) => [X0 + ((px - 40) / (W - 50)) * (X1 - X0), Y0 + ((H - 30 - py) / (H - 40)) * (Y1 - Y0)];
  };

  TM.register({
    id: "loss",
    wing: "learning",
    title: "The Wrongness Score",
    short: "Wrongness score",
    color: "--h3",
    tagline: "Before a model can learn, it needs a single number that says how wrong it is.",
    intro:
      "<p>Here are 7 students: how many hours each studied, and their test score. We want a line that predicts the score from the hours.</p><p>The red bars show how far off the line is for each student. The <b>wrongness score</b> squares each miss and averages them. Lower is better, and 0 would be perfect. Drag the sliders to shrink it.</p>",
    words: [
      ["Loss", "The official name for the wrongness score. Training means making the loss smaller."],
      ["Error", "How far one prediction is from the real answer (one red bar)."],
      ["Mean squared error", "Square every error, then average them. The most common loss for predicting numbers."],
      ["Data", "The examples a model learns from. Here, 7 students."],
    ],
    explainTitle: "Why square the errors?",
    explain:
      "<p>Squaring does two useful things. It makes every error positive, so misses above and below the line can't cancel out. And it punishes big misses much more than small ones: missing by 10 costs 100, but missing by 2 costs only 4.</p><ul><li>No straight line can hit every dot here, because real data is messy. So the best loss isn't 0, it's just as low as possible.</li><li>A chatbot has a loss too. It measures how surprised the model is by the real next word. Training pushes that number down, the same way you just did by hand.</li><li>In the next halls, the computer finds the lowest loss on its own, by always stepping downhill.</li></ul>",
    challenges: [
      { id: "move", title: "Move the line and watch the score", hint: "Try either slider.", how: "Drag the slope slider. Watch the red bars and the score change together." },
      { id: "u50", title: "Get the wrongness score under 50", hint: "Get the line near the middle of the dots.", how: "Set the slope to about 5 and then adjust the starting score until the line runs through the dots." },
      { id: "u12", title: "Get the score under 12", hint: "Fine-tune both sliders.", how: "Try slope 6 and starting score 50, then nudge each slider by one step and keep whichever direction lowers the score." },
    ],
    mount(stage, ctx) {
      const { X, Y } = TM.STUDY;
      let w = 1, b = 70;
      const cv = TM.canvas(460, 320);
      const score = el("div", { class: "big-number" });
      const table = el("table", { class: "tt" });
      const note = el("p", { class: "note" });
      const wS = TM.slider({ label: "Slope: points gained per hour", min: 0, max: 12, step: 0.5, value: w, fmt: (v) => TM.fmt(v, 1), onInput: (v) => { w = v; ctx.award("move"); render(); } });
      const bS = TM.slider({ label: "Starting score (0 hours)", min: 30, max: 80, step: 1, value: b, fmt: (v) => v, onInput: (v) => { b = v; ctx.award("move"); render(); } });

      function render() {
        TM.drawStudy(cv, X, Y, w, b);
        const m = TM.mse(w, b, X, Y);
        score.textContent = TM.fmt(m, 1);
        table.replaceChildren(
          el("tr", null, ["hours", "real", "line says", "error", "error²"].map((h) => el("th", null, h))),
          ...X.map((x, i) => {
            const p = w * x + b, e = p - Y[i];
            return el("tr", null, el("td", null, x), el("td", null, Y[i]), el("td", null, TM.fmt(p, 1)), el("td", null, TM.fmt(e, 1)), el("td", null, TM.fmt(e * e, 1)));
          })
        );
        note.textContent = m < 12 ? "Excellent fit. That's close to the best any straight line can do here." : m < 50 ? "Getting close. Keep fine-tuning." : "Still pretty wrong. Look at which way the red bars point.";
        note.className = m < 12 ? "note ok" : "note";
        if (m < 50) ctx.award("u50");
        if (m < 12) ctx.award("u12");
      }

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, wS.el, bS.el, el("span", { class: "ctl-label" }, "Wrongness score (average of error²)"), score, note, el("div", { class: "tbl-wrap" }, table)),
          el("div", { class: "viz-wrap" }, cv, el("p", { class: "note" }, "Black dots are real students. The colored line is your prediction. Red bars are the errors."))
        )
      );
      render();
    },
  });
})();
