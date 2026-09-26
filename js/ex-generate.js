/* Hall 8: Generation Station — next-token prediction, temperature, top-k, sampling. */
(function () {
  const { el } = TM;
  // Original sample texts, written for this exhibit.
  const CORPORA = {
    rhymes:
      "the little red hen went up the hill, and up the hill she ran. the little red hen came down the hill, as fast as a hen can. " +
      "the little blue fox sat in the box, and in the box he sat. the little blue fox got out of the box, and that was that. " +
      "the big brown bear went out to play, and out to play went he. the big brown bear came home to stay, and had a cup of tea. " +
      "the little red hen and the little blue fox and the big brown bear sat down. they had a cup of tea and a bun, the best tea in the town.",
    story:
      "once upon a time there was a robot who wanted to learn to read. every day the robot looked at a book. every day the robot guessed the next word. " +
      "at first the robot guessed wrong. the robot guessed cat when the book said hat. the robot guessed run when the book said sun. " +
      "but every time the robot was wrong, the robot changed a little. and every day the robot guessed a little better. " +
      "one day the robot guessed every word in the book. the robot was very happy. then the robot opened a new book, and guessed wrong again.",
    code:
      "for i in range(10):\n    total = total + i\n    print(total)\nfor j in range(10):\n    total = total - j\n    print(total)\n" +
      "def add(a, b):\n    return a + b\ndef sub(a, b):\n    return a - b\nprint(add(1, 2))\nprint(sub(3, 1))\n",
  };
  const show = (ch) => (ch === " " ? "␣" : ch === "\n" ? "↵" : ch);

  function buildModel(text, maxN) {
    const tables = [];
    for (let k = 0; k <= maxN; k++) {
      const t = new Map();
      for (let i = k; i < text.length; i++) {
        const ctx = text.slice(i - k, i);
        let m = t.get(ctx);
        if (!m) t.set(ctx, (m = new Map()));
        m.set(text[i], (m.get(text[i]) || 0) + 1);
      }
      tables.push(t);
    }
    return { tables, vocab: [...new Set(text)] };
  }

  TM.register({
    id: "generate",
    hall: 8,
    title: "Generation Station",
    short: "Generation",
    color: "--h8",
    next: null,
    tagline: "Predict one token, pick one, append it, repeat. That loop is how every chatbot writes.",
    intro:
      "<p>An LLM's only job is to output a probability for every possible next token. Writing a whole answer is just that step in a loop: predict, <b>sample</b> one token, add it to the text, and predict again.</p><p>This station runs the loop with a tiny model that predicts the next <i>character</i> by counting what followed the same few characters in its training text. Press <b>Step</b> to watch a single prediction, then turn the knobs that real chat apps expose: <b>temperature</b> and <b>top-k</b>.</p>",
    explainTitle: "Same loop, bigger brain",
    explain:
      "<p>A real LLM swaps the counting table for the transformer you've been assembling: tokens (Hall 5) become embeddings (Hall 6), pass through layers of attention (Hall 7) and neurons (Halls 2 and 4), and come out as one score per vocabulary token. Softmax turns those scores into the probabilities you see in the bars.</p><ul><li><b>Context window</b>: this model only looks back a few characters. An LLM looks back over hundreds of thousands of tokens, and attention decides what in there matters.</li><li><b>Temperature</b> divides the scores before softmax. Near 0 always picks the top token (greedy), which tends to loop. High values flatten the odds and produce nonsense.</li><li><b>Top-k</b> throws away everything except the k likeliest tokens before sampling, cutting off the weird tail.</li><li><b>Bits per character</b> is cross-entropy: how surprised the model is by real text. Pretraining an LLM means pushing exactly this number down. Here it's measured on the training text itself, so long contexts look amazing only because they memorize.</li></ul>",
    challenges: [
      { id: "step", title: "One prediction", hint: "Press Step and read the probability bars." },
      { id: "greedy", title: "Stuck in a loop", hint: "Generate 40+ characters in a row at temperature 0." },
      { id: "wild", title: "Word salad", hint: "Generate 40+ characters in a row at temperature 2 or higher." },
      { id: "parrot", title: "Parrot", hint: "With context 5 or more, generate 40 characters that copy the training text exactly." },
    ],
    tries: ["Set context to 1. Each letter only knows the one before it, so you get pronounceable gibberish.", "Paste your own text into the box and train on it. Anything with lots of repetition works well.", "Set top-k to 1. That's the same as greedy decoding, whatever the temperature says."],
    mount(stage, ctx) {
      const s = { corpus: "rhymes", n: 3, temp: 0.8, topk: 30, seed: "the little " };
      let text = CORPORA[s.corpus];
      let model = buildModel(text, 6);
      let out = s.seed;
      let genStart = out.length;
      let streak = { t0: 0, hot: 0 };
      let queue = 0;
      const rng = TM.rng(Date.now() % 100000);

      const outBox = el("div", { class: "gen-out", "aria-live": "polite" });
      const bars = el("div", { class: "bars" });
      const stepNote = el("div", { class: "readout" });
      const stN = TM.stat("Context"), stCtx = TM.stat("Contexts seen"), stBits = TM.stat("Bits / char"), stLen = TM.stat("Generated");
      const ta = el("textarea", { class: "txt", id: "gen-corpus", rows: 5, spellcheck: "false" });
      ta.value = text;
      const seedIn = el("input", { class: "txt", id: "gen-seed", value: s.seed, style: { width: "100%" } });

      function predict(context) {
        for (let k = Math.min(s.n, context.length); k >= 0; k--) {
          const m = model.tables[k].get(context.slice(context.length - k));
          if (m && m.size) return { k, counts: [...m.entries()].sort((a, b) => b[1] - a[1]) };
        }
        return { k: 0, counts: [] };
      }

      function distribution(counts) {
        let kept = s.topk >= 30 ? counts : counts.slice(0, s.topk);
        const total = kept.reduce((a, [, c]) => a + c, 0);
        if (s.temp === 0) return kept.map(([ch], i) => [ch, i === 0 ? 1 : 0]);
        const logits = kept.map(([, c]) => Math.log(c / total) / s.temp);
        const p = TM.softmax(logits);
        return kept.map(([ch], i) => [ch, p[i]]);
      }

      function bitsPerChar() {
        const V = model.vocab.length, a = 0.1;
        let bits = 0, n = 0;
        for (let i = 1; i < text.length; i++) {
          const { counts } = predict(text.slice(Math.max(0, i - s.n), i));
          const total = counts.reduce((x, [, c]) => x + c, 0);
          const c = (counts.find(([ch]) => ch === text[i]) || [0, 0])[1];
          bits += -Math.log2((c + a) / (total + a * V));
          n++;
        }
        return bits / Math.max(1, n);
      }

      function step(showBars) {
        const context = out.slice(Math.max(0, out.length - s.n));
        const { k, counts } = predict(out);
        if (!counts.length) return false;
        const dist = distribution(counts);
        let r = rng(), pick = dist[0][0];
        for (const [ch, p] of dist) {
          if ((r -= p) <= 0) { pick = ch; break; }
        }
        out += pick;
        streak.t0 = s.temp === 0 ? streak.t0 + 1 : 0;
        streak.hot = s.temp >= 2 ? streak.hot + 1 : 0;
        if (streak.t0 >= 40) ctx.award("greedy");
        if (streak.hot >= 40) ctx.award("wild");
        const gen = out.slice(genStart);
        if (s.n >= 5 && gen.length >= 40 && text.includes(gen.slice(-40))) ctx.award("parrot");
        if (showBars) renderBars(dist, pick, context, k);
        return true;
      }

      function renderBars(dist, pick, context, k) {
        const top = dist.slice(0, 12);
        bars.replaceChildren(
          ...top.map(([ch, p]) =>
            el("div", { class: `bar${ch === pick ? " pick" : ""}` }, el("span", { class: "lbl" }, `"${show(ch)}"`), el("div", { class: "track" }, el("div", { class: "fill", style: { width: `${p * 100}%` } })), el("span", { class: "num" }, `${(p * 100).toFixed(1)}%`))
          ),
          ...(dist.length > 12 ? [el("p", { class: "note" }, `…and ${dist.length - 12} less likely characters`)] : [])
        );
        const used = context.slice(context.length - k);
        stepNote.textContent = `context "${[...used].map(show).join("")}" → sampled "${show(pick)}"` + (k < s.n ? `\nThe last ${s.n} characters never appeared in training, so the model backed off to the last ${k}.` : "");
      }

      function renderOut() {
        const ctxLen = Math.min(s.n, out.length);
        const a = out.slice(0, out.length - ctxLen), b = out.slice(out.length - ctxLen);
        const seg = (str, start) => {
          const parts = [];
          const seedPart = str.slice(0, Math.max(0, genStart - start));
          const genPart = str.slice(Math.max(0, genStart - start));
          if (seedPart) parts.push(el("span", { class: "seed" }, seedPart));
          if (genPart) parts.push(el("span", { class: "gen" }, genPart));
          return parts;
        };
        outBox.replaceChildren(...seg(a, 0), el("span", { class: "ctx", title: "the context the model sees next" }, ...seg(b, a.length)), el("span", { class: "cursor" }));
        outBox.scrollTop = outBox.scrollHeight;
        stLen.set(out.length - genStart);
      }

      function renderStats() {
        stN.set(`${s.n} char${s.n === 1 ? "" : "s"}`);
        stCtx.set(model.tables[s.n].size);
        stBits.set(bitsPerChar().toFixed(2));
      }

      function reset() {
        out = seedIn.value || " ";
        genStart = out.length;
        streak = { t0: 0, hot: 0 };
        queue = 0;
        bars.replaceChildren(el("p", { class: "note" }, "Press Step to see the model's prediction."));
        stepNote.textContent = "Nothing sampled yet.";
        renderOut();
      }
      function retrain() {
        text = ta.value.toLowerCase();
        if (!text.trim()) text = CORPORA.rhymes;
        model = buildModel(text, 6);
        renderStats();
        reset();
      }

      ctx.loop(() => {
        if (queue <= 0) return;
        const n = Math.min(queue, 2);
        for (let i = 0; i < n; i++) {
          if (!step(i === n - 1)) { queue = 0; break; }
          queue--;
        }
        renderOut();
        genBtn.textContent = queue > 0 ? "Stop" : "Generate 120";
      });

      const corpusSeg = TM.seg({ label: "Training text", options: [["rhymes", "Rhymes"], ["story", "Robot story"], ["code", "Code"]], value: s.corpus, onChange: (k) => { ta.value = CORPORA[k]; seedIn.value = { rhymes: "the little ", story: "the robot ", code: "for " }[k]; retrain(); } });
      const nSeg = TM.seg({ label: "Context window (characters)", options: [1, 2, 3, 4, 5, 6].map((k) => [k, String(k)]), value: s.n, onChange: (k) => { s.n = k; renderStats(); renderOut(); } });
      const tempS = TM.slider({ label: "Temperature", min: 0, max: 3, step: 0.1, value: s.temp, fmt: (v) => (v === 0 ? "0 (greedy)" : v.toFixed(1)), onInput: (v) => (s.temp = v) });
      const topkS = TM.slider({ label: "Top-k", min: 1, max: 30, step: 1, value: s.topk, fmt: (v) => (v >= 30 ? "off" : v), onInput: (v) => (s.topk = v) });
      const genBtn = TM.btn("Generate 120", () => { queue = queue > 0 ? 0 : 120; genBtn.textContent = queue > 0 ? "Stop" : "Generate 120"; });
      ta.addEventListener("change", retrain);
      seedIn.addEventListener("change", reset);

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            corpusSeg.el,
            el("label", { class: "ctl-label", for: "gen-corpus" }, "Edit or paste text, then click outside to retrain"),
            ta,
            nSeg.el,
            tempS.el,
            topkS.el,
            el("div", { class: "ctl-group" }, el("label", { class: "ctl-label", for: "gen-seed" }, "Prompt (starting text)"), seedIn)
          ),
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-row" }, TM.btn("Step", () => { if (step(true)) ctx.award("step"); renderOut(); }, "primary"), genBtn, TM.btn("Reset to prompt", reset)),
            outBox,
            el("div", { class: "stats" }, stN.el, stCtx.el, stBits.el, stLen.el),
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Next-character probabilities (after temperature and top-k)"), bars),
            stepNote
          )
        )
      );
      retrain();
    },
  });
})();
