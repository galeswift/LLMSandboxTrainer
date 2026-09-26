/* Matrix Multiply — a grid of dot products. */
(function () {
  const { el } = TM;

  TM.register({
    id: "matmul",
    wing: "numbers",
    title: "Matrix Multiply Machine",
    short: "Matrix multiply",
    color: "--h1",
    tagline: "Multiplying two grids means doing a whole grid of dot products at once.",
    intro:
      "<p>To multiply grid A by grid B, take each <b>row</b> of A and dot-product it with each <b>column</b> of B. Every answer goes into one cell of the result.</p><p>Hover over (or tap) a cell in the answer to light up the row and column that made it.</p>",
    words: [
      ["Matrix", "Another word for a grid of numbers."],
      ["Row × column", "Each answer cell = one row of A dot one column of B."],
      ["Shape rule", "A's columns must equal B's rows. The answer has A's rows and B's columns."],
    ],
    explainTitle: "The engine of every neural network",
    explain:
      "<p>One layer of a neural network is a matrix multiply: a grid of inputs times a grid of weights. A chatbot runs hundreds of these layers for every word.</p><ul><li>The shape rule comes from the dot product: a row and a column can only pair up if they're the same length.</li><li>“shapes cannot be multiplied” is one of the most common error messages AI programmers see.</li><li>The cost grows fast: a (2×3) times (3×2) multiply needs 2·3·2 = 12 multiplications. Real models do billions per word.</li></ul>",
    challenges: [
      { id: "hover", title: "See how one answer cell is made", hint: "Hover over or tap any cell in C.", how: "Move your mouse over a number in the grid labeled C, or tap it. Read the calculation underneath." },
      { id: "two", title: "Make the answer a 2×2 grid", hint: "The answer has A's rows and B's columns.", how: "A already has 2 rows. Set “B columns” to 2." },
      { id: "mismatch", title: "Break the machine", hint: "Make A's columns and B's rows different.", how: "Change “A columns” to 2 while “B rows” stays 3. Read the error." },
      { id: "outer", bonus: true, title: "Outer product", hint: "A column times a row gives a big grid.", how: "Set A to 3 rows × 1 column and B to 1 row × 3 columns. Each answer cell is just one multiplication." },
    ],
    mount(stage, ctx) {
      const dims = { m: 2, k1: 3, k2: 3, n: 3 };
      let seed = 3, A, B;
      const mmBox = el("div", { class: "mm" });
      const mmRead = el("div", { class: "readout" }, "Hover over (or tap) a cell in C.");
      const mmCost = el("p", { class: "note" });

      const genMats = () => {
        const r = TM.rng(seed);
        A = Array.from({ length: dims.m }, () => Array.from({ length: dims.k1 }, () => r.int(-2, 3)));
        B = Array.from({ length: dims.k2 }, () => Array.from({ length: dims.n }, () => r.int(-2, 3)));
      };
      const mat = (M, name, rows, cols, id) => {
        const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${cols}, auto)` } });
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++) {
            const v = M[i][j];
            const c = el("div", { class: "cell sm", style: { "--t": (v + 9) / 18 } }, String(v).replace("-", "−"));
            c.dataset.r = i;
            c.dataset.c = j;
            c.dataset.m = id;
            g.append(c);
          }
        return el("div", { class: "slice" }, g, el("div", { class: "mm-label" }, `${name}: ${rows}×${cols}`));
      };

      function render() {
        genMats();
        mmBox.replaceChildren(mat(A, "A", dims.m, dims.k1, "A"), el("span", { class: "mm-op" }, "×"), mat(B, "B", dims.k2, dims.n, "B"), el("span", { class: "mm-op" }, "="));
        if (dims.k1 !== dims.k2) {
          mmBox.append(el("div", { class: "mm-err" }, `Error: shapes cannot be multiplied (${dims.m}x${dims.k1} and ${dims.k2}x${dims.n})`));
          mmRead.textContent = `Each row of A has ${dims.k1} numbers, but each column of B has ${dims.k2}. They can't pair up for a dot product.`;
          mmCost.textContent = "";
          ctx.award("mismatch");
          return;
        }
        const k = dims.k1;
        const C = A.map((row) => Array.from({ length: dims.n }, (_, j) => row.reduce((s, a, t) => s + a * B[t][j], 0)));
        const cView = mat(C, "C", dims.m, dims.n, "C");
        cView.querySelectorAll(".cell").forEach((c) => {
          c.style.setProperty("--t", (C[c.dataset.r][c.dataset.c] + 20) / 40);
          c.tabIndex = 0;
          const show = () => {
            const i = +c.dataset.r, j = +c.dataset.c;
            mmBox.querySelectorAll(".cell").forEach((x) => {
              const on = (x.dataset.m === "A" && +x.dataset.r === i) || (x.dataset.m === "B" && +x.dataset.c === j) || x === c;
              x.classList.toggle("dim", !on);
              x.classList.toggle("hot", x === c);
            });
            const terms = A[i].map((a, t) => `(${a})×(${B[t][j]})`).join(" + ");
            mmRead.textContent = `C[${i},${j}] = row ${i} of A · column ${j} of B = ${terms} = ${C[i][j]}`.replace(/-/g, "−");
            ctx.award("hover");
          };
          c.addEventListener("pointerenter", show);
          c.addEventListener("click", show);
          c.addEventListener("focus", show);
        });
        mmBox.append(cView);
        mmCost.textContent = `(${dims.m}×${k}) times (${k}×${dims.n}) gives (${dims.m}×${dims.n}). That took ${dims.m * k * dims.n} multiplications.`;
        if (dims.m === 2 && dims.n === 2) ctx.award("two");
        if (k === 1 && dims.m >= 3 && dims.n >= 3) ctx.award("outer");
      }
      mmBox.addEventListener("pointerleave", () => mmBox.querySelectorAll(".cell").forEach((x) => x.classList.remove("dim", "hot")));
      const dimStep = (label, key) => TM.stepper({ label, min: 1, max: 4, value: dims[key], onChange: (v) => { dims[key] = v; render(); } }).el;

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-row" }, dimStep("A rows", "m"), dimStep("A columns", "k1")),
            el("div", { class: "ctl-row" }, dimStep("B rows", "k2"), dimStep("B columns", "n")),
            el("div", { class: "ctl-row" }, TM.btn("New numbers", () => { seed++; render(); }))
          ),
          el("div", { class: "controls" }, mmBox, mmRead, mmCost)
        )
      );
      render();
    },
  });
})();
