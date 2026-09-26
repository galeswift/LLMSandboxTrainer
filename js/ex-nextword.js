/* Next Word Game — you are the sampler. */
(function () {
  const { el } = TM;
  // Original sample sentences, written for this exhibit.
  const TEXT =
    "the dog ran to the park . the dog saw a cat . the cat ran up a tree . the cat was happy . the dog was sad . " +
    "a boy saw the dog . the boy ran to the dog . the boy and the dog went home . the girl saw the cat in the tree . " +
    "the girl was happy . the cat ate a fish . the dog ate a big bone . a big dog ran to the girl . " +
    "the girl and the boy went to the park . the sun was hot . the park was fun . the boy was happy at the park .";

  TM.register({
    id: "nextword",
    wing: "language",
    title: "Next Word Game",
    short: "Next word game",
    color: "--h8",
    tagline: "A chatbot writes by guessing the next word over and over. Here, you get to make the choices.",
    intro:
      "<p>This tiny model has read 17 short sentences. For each word, it counted which words came right after it. Now it turns those counts into chances for the <b>next word</b>.</p><p>Build a sentence by clicking one of the choices. The bars show how likely the model thinks each one is. You can also let the computer pick at random, following those chances.</p>",
    words: [
      ["Next-word prediction", "Given the words so far, give a chance (probability) to every possible next word."],
      ["Probability", "A chance between 0% and 100%. All the choices add up to 100%."],
      ["Sampling", "Picking the next word at random, where likelier words get picked more often."],
      ["Context", "The words the model looks at to make its guess. This model only looks at the last one."],
    ],
    explainTitle: "How is a chatbot different?",
    explain:
      "<p>A chatbot plays exactly this game, one token at a time. The differences are in how it comes up with the chances:</p><ul><li>This model looks only at the <b>last word</b>. A chatbot looks back over the whole conversation, which can be hundreds of pages, and uses attention to decide what matters.</li><li>This model just counts. A chatbot computes its chances with the huge trained network you've been learning about: tokens → embeddings → attention and neuron layers → a score for every token → percentages.</li><li>It learned from 17 sentences. Chatbots learn from trillions of words.</li><li>Because it samples at random, asking the same question twice can give different answers. That's why chatbots don't always reply the same way.</li></ul>",
    challenges: [
      { id: "pick", title: "Pick the next word yourself", hint: "Click one of the word buttons.", how: "Under “What comes next?”, click any word. It's added to the sentence and new choices appear." },
      { id: "rare", title: "Choose an unlikely word", hint: "Pick a word with less than a 15% chance.", how: "Look for a short bar. After “the”, words like “sun” or “girl” have small chances." },
      { id: "sentence", title: "Finish a sentence of 6 or more words", hint: "End it by picking the period “.”", how: "Keep choosing words until the sentence has at least 6 words, then click “.” when it appears as an option." },
      { id: "auto", title: "Let the computer write", hint: "Press “Let the computer pick” a few times.", how: "Press “Let the computer pick” 3 times in a row. It rolls a weighted dice using the bars." },
    ],
    mount(stage, ctx) {
      const toks = TEXT.split(" ");
      const next = new Map();
      for (let i = 0; i < toks.length - 1; i++) {
        const a = toks[i], b = toks[i + 1];
        if (!next.has(a)) next.set(a, new Map());
        next.get(a).set(b, (next.get(a).get(b) || 0) + 1);
      }
      const rng = TM.rng(Date.now() % 1e6);
      let sent = ["the"], autoStreak = 0;
      const out = el("div", { class: "gen-out", style: { minHeight: "70px", fontSize: "18px" } });
      const choices = el("div", { class: "controls" });
      const note = el("div", { class: "readout" });

      function options() {
        const m = next.get(sent[sent.length - 1]);
        if (!m) return [];
        const total = [...m.values()].reduce((a, b) => a + b, 0);
        return [...m.entries()].map(([w, c]) => [w, c / total, c]).sort((a, b) => b[1] - a[1]);
      }
      function add(word, byHand, p) {
        sent.push(word);
        if (byHand) {
          ctx.award("pick");
          autoStreak = 0;
          if (p < 0.15) ctx.award("rare");
        } else if (++autoStreak >= 3) ctx.award("auto");
        const words = sent.filter((w) => w !== ".").length;
        if (word === "." && words >= 6) ctx.award("sentence");
        render();
      }
      function render() {
        out.replaceChildren(el("span", { class: "gen" }, sent.join(" ").replace(/ \./g, ".")), el("span", { class: "cursor" }));
        const last = sent[sent.length - 1];
        const opts = last === "." ? [] : options();
        if (!opts.length) {
          choices.replaceChildren(el("p", { class: "note ok" }, "Sentence finished! Press “Start over” for another."));
          note.textContent = "The model reached the end of a sentence.";
          return;
        }
        choices.replaceChildren(
          ...opts.map(([w, p, c]) =>
            el(
              "button",
              { type: "button", class: "bar word-choice", onclick: () => add(w, true, p), title: `seen ${c} time${c === 1 ? "" : "s"} after “${last}”` },
              el("span", { class: "lbl" }, w === "." ? ". (end)" : w),
              el("div", { class: "track" }, el("div", { class: "fill", style: { width: `${p * 100}%` } })),
              el("span", { class: "num" }, `${Math.round(p * 100)}%`)
            )
          )
        );
        const total = opts.reduce((a, o) => a + o[2], 0);
        note.textContent = `After “${last}”, the model saw ${total} next word${total === 1 ? "" : "s"} in its reading: ${opts.map(([w, , c]) => `${w} ×${c}`).join(", ")}.\nChance = times seen ÷ ${total}.`;
      }
      function computerPick() {
        const opts = sent[sent.length - 1] === "." ? [] : options();
        if (!opts.length) return;
        let r = rng();
        for (const [w, p] of opts) {
          if ((r -= p) <= 0) return add(w, false, p);
        }
        add(opts[opts.length - 1][0], false, 0);
      }

      stage.append(
        el(
          "div",
          { class: "split wide-left" },
          el(
            "div",
            { class: "controls" },
            el("span", { class: "ctl-label" }, "Your sentence"),
            out,
            el("div", { class: "ctl-row" }, TM.btn("Let the computer pick", computerPick, "primary"), TM.btn("Undo", () => { if (sent.length > 1) { sent.pop(); render(); } }), TM.btn("Start over", () => { sent = ["the"]; autoStreak = 0; render(); })),
            note,
            el("details", { class: "more" }, el("summary", null, "Show everything the model read"), el("p", { class: "readout", style: { marginTop: "8px" } }, TEXT.replace(/ \./g, ".")))
          ),
          el("div", { class: "controls" }, el("span", { class: "ctl-label" }, "What comes next? Click to choose."), choices)
        )
      );
      render();
    },
  });
})();
