/* Dot Product — multiply pairs, add them up. */
(function () {
  const { el } = TM;

  TM.register({
    id: "dot",
    wing: "numbers",
    title: "The Dot Product",
    short: "Dot product",
    color: "--h1",
    tagline: "Multiply matching pairs, then add. It's how you total a shopping bill, and it's most of what an AI does.",
    intro:
      "<p>Say you buy 2 apples at $3, 1 loaf of bread at $2, and 3 bottles of juice at $1. Your bill is 2×3 + 1×2 + 3×1 = $11.</p><p>That's a <b>dot product</b>: take two lists of the same length, multiply the matching pairs, and add up the results. Change the numbers below and watch the total.</p>",
    words: [
      ["Dot product", "Multiply two lists pair by pair, then add everything up. The answer is one number."],
      ["Vector", "Another name for a list of numbers."],
      ["Weight", "In AI, one of the lists is usually the model's own settings, called weights."],
    ],
    explainTitle: "Why AI cares so much",
    explain:
      "<p>The dot product measures how much two lists “agree.” Big positive numbers in the same spots make a big total. Opposite signs cancel out or go negative.</p><ul><li>A neuron (next wing) is a dot product: inputs · weights.</li><li>Attention (Language wing) uses dot products to decide which words relate to each other.</li><li>A large chatbot does trillions of multiply-and-add steps for every word it writes. Special chips called GPUs exist mainly to do this one thing very fast.</li></ul>",
    challenges: [
      { id: "ten", title: "Make the total exactly 10", hint: "Change any of the six numbers.", how: "One easy way: set the top row to 2, 2, 0 and the bottom row to 3, 2, anything. 2×3 + 2×2 + 0 = 10." },
      { id: "neg", title: "Make the total negative", hint: "Negative numbers are allowed.", how: "Make one number in a pair negative, for example −3 on top and 4 underneath, and keep the other pairs small." },
      { id: "zero", title: "Make the total 0, but not with all zeros", hint: "Let a positive and a negative cancel out.", how: "Top row: 1, 1, 0. Bottom row: 2, −2, 0. That gives 1×2 + 1×(−2) = 0." },
    ],
    mount(stage, ctx) {
      const a = [2, 1, 3], b = [3, 2, 1];
      const labels = ["apples", "bread", "juice"];
      const grid = el("div", { class: "dot-grid" });
      const eq = el("div", { class: "eq" });
      const total = el("div", { class: "big-number" });
      const bars = el("div", { class: "bars" });

      function render() {
        const prods = a.map((x, i) => x * b[i]);
        const sum = prods.reduce((s, v) => s + v, 0);
        const f = (v) => (v < 0 ? `(−${-v})` : `${v}`);
        eq.innerHTML = `${a.map((x, i) => `${f(x)}×${f(b[i])}`).join(" + ")}\n= ${prods.map(f).join(" + ")}\n= <b>${String(sum).replace("-", "−")}</b>`;
        total.textContent = String(sum).replace("-", "−");
        const mx = Math.max(1, ...prods.map(Math.abs));
        bars.replaceChildren(
          ...prods.map((p, i) =>
            el(
              "div",
              { class: "bar" },
              el("span", { class: "lbl" }, labels[i]),
              el("div", { class: "track" }, el("div", { class: "fill", style: { width: `${(Math.abs(p) / mx) * 100}%`, background: p < 0 ? "var(--neg)" : "var(--accent)" } })),
              el("span", { class: "num" }, String(p).replace("-", "−"))
            )
          )
        );
        if (sum === 10) ctx.award("ten");
        if (sum < 0) ctx.award("neg");
        if (sum === 0 && prods.some((p) => p !== 0)) ctx.award("zero");
      }

      const col = (arr, i, name) => TM.stepper({ label: name, min: -5, max: 5, value: arr[i], onChange: (v) => { arr[i] = v; render(); } }).el;
      grid.append(
        el("div", { class: "ctl-row" }, el("span", { class: "ctl-label", style: { width: "90px" } }, "How many"), ...a.map((_, i) => col(a, i, labels[i]))),
        el("div", { class: "ctl-row" }, el("span", { class: "ctl-label", style: { width: "90px" } }, "Price each"), ...b.map((_, i) => col(b, i, labels[i])))
      );

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, grid, el("p", { class: "note" }, "Negative numbers don't make sense for shopping, but they're allowed here. AI uses them all the time.")),
          el("div", { class: "controls" }, el("span", { class: "ctl-label" }, "Total"), total, eq, el("span", { class: "ctl-label" }, "Each pair's contribution"), bars)
        )
      );
      render();
    },
  });
})();
