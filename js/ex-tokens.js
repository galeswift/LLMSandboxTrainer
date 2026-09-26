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
    hall: 5,
    title: "Tokenizer Workshop",
    short: "Tokens",
    color: "--h5",
    next: "embed",
    tagline: "Models don't read letters or words. They read tokens, and you can build the vocabulary yourself.",
    intro:
      "<p>Before text reaches a model, a <b>tokenizer</b> chops it into pieces from a fixed vocabulary, and each piece becomes a number. Most LLMs build that vocabulary with <b>byte-pair encoding</b> (BPE): start from single characters, find the pair that appears side by side most often, glue it into a new token, and repeat.</p><p>Press <b>Merge</b> to run one round. Watch common chunks like <code>▁the</code> form first. The <code>▁</code> marks the start of a word.</p>",
    explainTitle: "Why tokens, and why they're weird",
    explain:
      "<p>Characters make sequences very long, and whole words leave too many possibilities to cover. BPE sits between the two: frequent words become single tokens, and rare words break into familiar pieces, so no word is ever impossible to spell.</p><ul><li>Real tokenizers run tens of thousands of merges over terabytes of text. GPT-style vocabularies hold 50,000 to 200,000 tokens.</li><li>They start from <b>bytes</b> rather than characters, so any text, emoji, or file can be encoded. This workshop starts from characters, which is why an unseen symbol shows up as unknown.</li><li>Token boundaries explain classic LLM quirks: counting the letters in <i>strawberry</i> is hard when the model sees <code>▁str</code>·<code>aw</code>·<code>berry</code> rather than letters. Arithmetic is awkward when numbers split unevenly.</li><li>Pricing and context limits are measured in tokens, so text that compresses badly (rare languages, unusual code) costs more.</li></ul>",
    challenges: [
      { id: "merge", title: "First merge", hint: "Run one merge and see which pair wins." },
      { id: "compress", title: "Compressor", hint: "Get the training text to 3 or more characters per token." },
      { id: "split", title: "Split a stranger", hint: "Tokenize a made-up word that breaks into 3 or more pieces." },
      { id: "unk", title: "Off the map", hint: "Tokenize a character the tokenizer never saw during training." },
    ],
    tries: ["Paste a paragraph from another language, reset, and see which merges it learns.", "Try the code sample. Indentation and print( become tokens of their own."],
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
      const testIn = el("input", { class: "txt", id: "tok-test", value: "the bat sat on a catamaran", style: { width: "100%" } });
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
          if (!known.has(w) && seq.length >= 3 && w.length > 3) bigSplit = true;
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
