/* Text to Numbers — the simplest possible tokenizers. */
(function () {
  const { el } = TM;
  const WORDS = "the a an and or but of to in on at is was are be it i you he she we they my your this that with for not have has had do did go went see saw cat dog mat sat ran big small red blue happy sad day night school home love like play game fun good bad very".split(" ");
  const LETTERS = "abcdefghijklmnopqrstuvwxyz .,!?'0123456789".split("");
  const hueOf = (s) => {
    let h = 0;
    for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return (h * 137.508) % 360;
  };

  TM.register({
    id: "textnum",
    wing: "language",
    title: "Text to Numbers",
    short: "Text to numbers",
    color: "--h5",
    tagline: "Neural networks only understand numbers, so the first job is turning words into numbers.",
    intro:
      "<p>Everything you've seen so far works on numbers. So how does a chatbot read? First, it chops text into pieces called <b>tokens</b> and swaps each piece for its number in a fixed list, called the <b>vocabulary</b>.</p><p>Type below and compare two simple ways to chop: letter by letter, or word by word.</p>",
    words: [
      ["Token", "One piece of chopped-up text: a letter, a word, or part of a word."],
      ["Vocabulary", "The fixed list of every token the model knows. Each has an ID number."],
      ["Token ID", "A token's position in the vocabulary. This is what the model actually sees."],
      ["Unknown token", "A placeholder used when a piece isn't in the vocabulary."],
    ],
    explainTitle: "Both simple ways have a problem",
    explain:
      "<ul><li><b>Letters</b> need only a tiny vocabulary and never hit an unknown piece. But the text becomes very long, and a single letter carries almost no meaning, so the model has to work much harder.</li><li><b>Whole words</b> keep text short and meaningful. But there are hundreds of thousands of words, plus names, typos, and slang. Any word missing from the list becomes “unknown” and its meaning is lost.</li><li>Real chatbots use a clever middle ground: common words are one token, and rare words are built from a few common pieces. You'll build one of those in the next hall.</li></ul>",
    challenges: [
      { id: "letters", title: "Turn your name into numbers", hint: "Type your name in the box.", how: "Click the text box, delete what's there, and type your name. Each letter gets its own number." },
      { id: "words", title: "Switch to whole words", hint: "Compare how many pieces you get.", how: "Click “Whole words” at the top. Look at the token count: it's much smaller." },
      { id: "unk", title: "Stump the word list", hint: "In word mode, type a word the list doesn't know.", how: "In “Whole words” mode, type a word like “pizza” or “skateboard”. It shows up as [unknown]." },
    ],
    mount(stage, ctx) {
      let mode = "letters";
      const input = el("input", { class: "txt", id: "tn-text", value: "the cat sat on the mat", style: { width: "100%", fontSize: "15px" } });
      const chips = el("div", { class: "chips" });
      const ids = el("div", { class: "readout" });
      const stN = TM.stat("Tokens"), stV = TM.stat("Vocab size");
      const vocabBox = el("div", { class: "chips" });
      let typed = false;

      function render() {
        const text = input.value.toLowerCase();
        let toks;
        if (mode === "letters") {
          toks = [...text].map((ch) => ({ t: ch, id: LETTERS.indexOf(ch) }));
        } else {
          toks = text
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w.replace(/[.,!?]/g, ""))
            .filter(Boolean)
            .map((w) => ({ t: w, id: WORDS.indexOf(w) }));
        }
        chips.replaceChildren(
          ...toks.map(({ t, id }) =>
            id < 0
              ? el("span", { class: "chip unk", title: "not in the vocabulary" }, mode === "letters" ? t : "[unknown]", el("sub", null, "?"))
              : el("span", { class: "chip", style: { "--hue": hueOf(t) } }, t === " " ? "␣" : t, el("sub", null, id))
          )
        );
        ids.textContent = `What the model sees: [${toks.map((x) => (x.id < 0 ? "?" : x.id)).join(", ")}]`;
        stN.set(toks.length);
        const V = mode === "letters" ? LETTERS : WORDS;
        stV.set(V.length);
        vocabBox.replaceChildren(...V.map((t, i) => el("span", { class: "chip", style: { "--hue": hueOf(t) } }, t === " " ? "␣" : t, el("sub", null, i))));
        if (mode === "letters" && typed && text.trim()) ctx.award("letters");
        if (mode === "words") ctx.award("words");
        if (mode === "words" && toks.some((x) => x.id < 0)) ctx.award("unk");
      }
      const modeSeg = TM.seg({ label: "How to chop the text", options: [["letters", "Letter by letter"], ["words", "Whole words"]], value: mode, onChange: (m) => { mode = m; render(); } });
      input.addEventListener("input", () => { typed = true; render(); });

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, modeSeg.el, el("div", { class: "stats" }, stN.el, stV.el), el("details", { class: "more" }, el("summary", null, "Show the whole vocabulary"), el("div", { style: { marginTop: "8px" } }, vocabBox))),
          el("div", { class: "controls" }, el("label", { class: "ctl-label", for: "tn-text" }, "Type anything"), input, el("span", { class: "ctl-label" }, "Tokens (small numbers are IDs)"), chips, ids)
        )
      );
      render();
    },
  });
})();
