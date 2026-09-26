/* Hall 5: Tokenizer Workshop — byte-pair encoding, one merge at a time. */
(function () {
  const { el } = TM;
  const SPACE = "▁";
  const SAMPLES = {
    cats: "the cat sat on the mat. the cat ate the rat. that fat cat sat on a hat, and the rat sat on that cat. the other cats sat there and watched.",
    code: "for i in range(10):\n    print(i)\nfor j in range(20):\n    print(j)\nfor item in items:\n    print(item)\nprint(len(items))",
    words: "lower lowest newer newest wider widest slower slowest faster fastest lower newer wider slower",
  };

  const hueOf = (s) => {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return (h * 137.508) % 360;
  };

  function wordsOf(text) {
    // split on whitespace; mark each word start with ▁ as SentencePiece does
    return text.split(/\s+/).filter(Boolean).map((w) => SPACE + w);
  }

  function applyMerges(symbols, merges) {
    let seq = symbols.slice();
    for (const [a, b] of merges) {
      if (seq.length < 2) break;
      const out = [];
      for (let i = 0; i < seq.length; i++) {
        if (i < seq.length - 1 && seq[i] === a && seq[i + 1] === b) {
          out.push(a + b);
          i++;
        } else out.push(seq[i]);
      }
      seq = out;
    }
    return seq;
  }

  TM.register({
    id: "tokens",
    wing: "language",
    title: "Tokenizer Workshop",
    short: "Tokenizer",
    color: "--h5",
    tagline: "Build a real chatbot-style vocabulary by gluing together the letter pairs that show up most.",
    intro:
      "<p>Real chatbots use a middle ground between letters and words. Start with single letters. Find the two neighbors that appear together most often, like <code>t</code> + <code>h</code>, and glue them into a new token <code>th</code>. Repeat. This is called <b>byte-pair encoding</b>.</p><p>Press <b>Merge</b> and watch common chunks grow. The <code>▁</code> symbol marks the start of a word.</p>",
    words: [
      ["Merge", "Glue the most common neighboring pair into one new token."],
      ["Byte-pair encoding (BPE)", "Building a vocabulary by repeating merges, many thousands of times."],
      ["▁", "Marks the start of a word, so “▁the” (a whole word) differs from “the” inside “other”."],
    ],
    explainTitle: "Why chatbots can't count letters",
    explain:
      "<p>Common words become single tokens, and rare words break into familiar pieces, so no word is ever unknown.</p><ul><li>Real tokenizers do tens of thousands of merges over huge amounts of text, ending with 50,000 to 200,000 tokens.</li><li>They start from computer <b>bytes</b> instead of letters, so emoji and any language work too.</li><li>This explains a famous chatbot mistake: asked how many r's are in “strawberry”, a model sees pieces like <code>▁str</code> · <code>aw</code> · <code>berry</code>, not individual letters.</li><li>Chatbot limits and prices are counted in tokens, not words. A token is roughly ¾ of an English word.</li></ul>",
    challenges: [
      { id: "merge", title: "Do your first merge", hint: "Press Merge once.", how: "Press the Merge button. Look at the list of merges to see which pair won." },
      { id: "five", title: "Do 5 merges", hint: "Watch the token count drop.", how: "Press Merge four more times, or press Merge ×10." },
      { id: "split", title: "Split a made-up word", hint: "Type a new word in the “Try the tokenizer” box.", how: "After a few merges, type a made-up word like “catmatter” in the box at the bottom. It's built from pieces the tokenizer already knows." },
      { id: "compress", bonus: true, title: "Compressor", hint: "Get 3 or more letters per token on the training text.", how: "Keep pressing Merge ×10 until “Chars / token” reaches 3." },
      { id: "unk", bonus: true, title: "Off the map", hint: "Type a character the tokenizer never saw.", how: "Type a symbol like “@” or “z” into the test box." },
    ],
    mount(stage, ctx) {
      let text = SAMPLES.cats;
      let merges = [];
      let base = [];
      let wordCounts = new Map(); // word -> count
      let segs = new Map(); // word -> symbols

      const ta = el("textarea", { class: "txt", id: "tok-train", rows: 4, spellcheck: "false" });
      ta.value = text;
      const chipsBox = el("div", { class: "chips" });
      const pairBox = el("div", { class: "bars" });
      const mergeList = el("ol", { class: "merges" });
      const testIn = el("input", { class: "txt", id: "tok-test", value: "the cat sat on the mat", style: { width: "100%" } });
      const testChips = el("div", { class: "chips" });
      const testNote = el("p", { class: "note" });
      const stChars = TM.stat("Characters"), stToks = TM.stat("Tokens"), stVocab = TM.stat("Vocab size"), stRatio = TM.stat("Chars / token");

      function train() {
        text = ta.value;
        merges = [];
        wordCounts = new Map();
        for (const w of wordsOf(text)) wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        segs = new Map([...wordCounts.keys()].map((w) => [w, [...w]]));
        base = [...new Set([...segs.values()].flat())].sort();
        render();
      }

      function pairCounts() {
        const pc = new Map();
        for (const [w, n] of wordCounts) {
          const s = segs.get(w);
          for (let i = 0; i < s.length - 1; i++) {
            const k = s[i] + "\u0000" + s[i + 1];
            pc.set(k, (pc.get(k) || 0) + n);
          }
        }
        return [...pc.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      }

      function mergeOnce() {
        const pcs = pairCounts();
        if (!pcs.length || pcs[0][1] < 2) return false;
        const [a, b] = pcs[0][0].split("\u0000");
        merges.push([a, b]);
        for (const [w, s] of segs) segs.set(w, applyMerges(s, [[a, b]]));
        ctx.award("merge");
        if (merges.length >= 5) ctx.award("five");
        return true;
      }

      const vocab = () => [...base, ...merges.map(([a, b]) => a + b)];
      const chip = (t, id) => el("span", { class: "chip", style: { "--hue": hueOf(t) }, title: `token ${id}` }, t, el("sub", null, id));

      function render() {
        const V = vocab();
        const idOf = new Map(V.map((t, i) => [t, i]));
        const toks = wordsOf(text).flatMap((w) => segs.get(w));
        chipsBox.replaceChildren(...toks.slice(0, 400).map((t) => chip(t, idOf.get(t))));
        if (toks.length > 400) chipsBox.append(el("span", { class: "note" }, ` …${toks.length - 400} more`));
        const chars = wordsOf(text).join("").length;
        stChars.set(chars);
        stToks.set(toks.length);
        stVocab.set(V.length);
        const ratio = chars / Math.max(1, toks.length);
        stRatio.set(ratio.toFixed(2));
        if (ratio >= 3) ctx.award("compress");

        const pcs = pairCounts().slice(0, 8);
        const mx = pcs.length ? pcs[0][1] : 1;
        pairBox.replaceChildren(
          ...pcs.map(([k, n], i) => {
            const [a, b] = k.split("\u0000");
            const fill = el("div", { class: "fill", style: { width: `${(n / mx) * 100}%` } });
            return el("div", { class: `bar${i === 0 ? " pick" : ""}` }, el("span", { class: "lbl" }, `${a}+${b}`.replace(/\n/g, "↵")), el("div", { class: "track" }, fill), el("span", { class: "num" }, `×${n}`));
          })
        );
        if (!pcs.length || pcs[0][1] < 2) pairBox.append(el("p", { class: "note" }, "No pair appears twice any more. The vocabulary has learned everything this text can teach."));
        mergeList.replaceChildren(
          ...merges.map(([a, b], i) => el("li", null, el("span", { class: "n" }, i + 1), el("span", null, `${a} + ${b} → ${a + b}`.replace(/\n/g, "↵"))))
        );
        mergeList.scrollTop = mergeList.scrollHeight;
        renderTest();
      }

      function renderTest() {
        const V = vocab();
        const idOf = new Map(V.map((t, i) => [t, i]));
        const baseSet = new Set(base);
        const words = wordsOf(testIn.value);
        const known = new Set(wordCounts.keys());
        let unk = false, bigSplit = false;
        const out = [];
        for (const w of words) {
          const seq = applyMerges([...w], merges);
          if (!known.has(w) && seq.length >= 2 && seq.length < w.length && w.length > 3) bigSplit = true;
          for (const t of seq) {
            if (!idOf.has(t) && !baseSet.has(t)) {
              unk = true;
              out.push(el("span", { class: "chip unk", title: "not in vocabulary" }, t, el("sub", null, "?")));
            } else out.push(chip(t, idOf.get(t)));
          }
        }
        testChips.replaceChildren(...out);
        const n = out.length;
        testNote.textContent = `${n} token${n === 1 ? "" : "s"}. Token IDs: [${out.slice(0, 30).map((c) => c.querySelector("sub").textContent).join(", ")}${n > 30 ? ", …" : ""}]. This list of numbers is all the model ever sees.${unk ? " Dashed pieces are characters the tokenizer never saw. Byte-level tokenizers avoid this by falling back to raw bytes." : ""}`;
        if (unk) ctx.award("unk");
        if (bigSplit && merges.length > 0) ctx.award("split");
      }

      const sampleSeg = TM.seg({
        label: "Training text",
        options: [["cats", "Cats"], ["code", "Code"], ["words", "Word endings"]],
        value: "cats",
        onChange: (k) => {
          ta.value = SAMPLES[k];
          train();
        },
      });
      ta.addEventListener("change", train);
      testIn.addEventListener("input", renderTest);

      stage.append(
        el(
          "div",
          { class: "station" },
          el(
            "div",
            { class: "split" },
            el(
              "div",
              { class: "controls" },
              sampleSeg.el,
              el("label", { class: "ctl-label", for: "tok-train" }, "Edit the text, then click outside to retrain"),
              ta,
              el(
                "div",
                { class: "ctl-row" },
                TM.btn("Merge", () => { mergeOnce(); render(); }, "primary"),
                TM.btn("Merge ×10", () => { for (let i = 0; i < 10 && mergeOnce(); i++); render(); }),
                TM.btn("Reset", train)
              ),
              el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Most frequent neighbor pairs"), pairBox),
              el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Learned merges, in order"), mergeList)
            ),
            el(
              "div",
              { class: "controls" },
              el("div", { class: "stats" }, stChars.el, stToks.el, stVocab.el, stRatio.el),
              el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "The training text, as tokens (small numbers are token IDs)"), chipsBox)
            )
          )
        ),
        el(
          "div",
          { class: "station" },
          el("h3", { class: "station-title" }, "Try the tokenizer", el("small", null, "new text is encoded by replaying the merges in the order they were learned")),
          el("label", { class: "ctl-label", for: "tok-test" }, "Type anything"),
          testIn,
          testChips,
          testNote
        )
      );
      train();
    },
  });
})();
