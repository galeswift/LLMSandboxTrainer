/* Lists & Grids — what a tensor is, in plain terms. */
(function () {
  const { el } = TM;
  const prod = (a) => a.reduce((x, y) => x * y, 1);

  TM.register({
    id: "grids",
    wing: "numbers",
    title: "Lists & Grids",
    short: "Lists & grids",
    color: "--h1",
    tagline: "Everything an AI works with is a box of numbers. The box's shape is the first thing to learn.",
    intro:
      "<p>A photo, a song, a sentence: to a computer, each is just numbers arranged in a box. A single number, a <b>list</b> of numbers, a <b>grid</b> (like a spreadsheet), or a <b>stack of grids</b>. AI people call all of these <b>tensors</b>.</p><p>Build some boxes below. Hover over (or tap) any cell to see its <b>address</b>.</p>",
    words: [
      ["Tensor", "A box of numbers of any shape: a single number, a list, a grid, or a stack of grids."],
      ["Shape", "The size of each side of the box, like (3, 4) for 3 rows and 4 columns."],
      ["Dimension", "One side of the box. A list has 1 dimension, a grid has 2."],
      ["Index", "A cell's address. Computers start counting at 0, so the first row is row 0."],
    ],
    explainTitle: "Where tensors show up in AI",
    explain:
      "<ul><li>A black-and-white photo is a grid: each cell is how bright one pixel is.</li><li>A color photo is a stack of 3 grids (red, green, blue), so its shape is (3, height, width).</li><li>A sentence given to a chatbot becomes a grid too: one row per word, and each row is a long list of numbers describing that word. You'll build those rows in the Language wing.</li><li>To find how many numbers are in a box, multiply the sides. A (3, 4) grid holds 3 × 4 = 12.</li></ul>",
    challenges: [
      { id: "list5", title: "Make a list of 5 numbers", hint: "A list has one row of numbers.", how: "Click “List”, then press + until the size shows 5." },
      { id: "grid34", title: "Make a grid with 3 rows and 4 columns", hint: "Shape (3, 4).", how: "Click “Grid”. Set rows to 3 and columns to 4 with the + and − buttons." },
      { id: "find", title: "Find the cell at address [1, 2]", hint: "Click that cell in a grid.", how: "Counting starts at 0. So [1, 2] means row 1 (the second row) and column 2 (the third column). Make sure your grid has at least 2 rows and 3 columns, then click the cell." },
      { id: "count24", title: "Build a box that holds exactly 24 numbers", hint: "Any shape works if the sides multiply to 24.", how: "Try “Stack of grids” with 2 grids, 3 rows, and 4 columns: 2 × 3 × 4 = 24. Or a grid with 4 rows and 6 columns." },
    ],
    mount(stage, ctx) {
      let shape = [3];
      const r = TM.rng(5);
      const vals = Array.from({ length: 216 }, () => r.int(0, 9));
      const view = el("div", { class: "tensor-view" });
      const info = el("div", { class: "eq" });
      const hover = el("div", { class: "readout" }, "Hover over (or tap) a cell to see its address.");
      const dimBox = el("div", { class: "ctl-row" });
      const NAMES = [[], ["length"], ["rows", "columns"], ["grids", "rows", "columns"]];
      const ADDR = [[], ["position"], ["row", "column"], ["grid", "row", "column"]];

      const kindSeg = TM.seg({
        label: "What kind of box?",
        options: [[0, "Single number"], [1, "List"], [2, "Grid"], [3, "Stack of grids"]],
        value: 1,
        onChange: (k) => {
          shape = [[], [3], [2, 2], [2, 2, 3]][k];
          render();
        },
      });

      function addCell(container, idx, k, cls) {
        const v = vals[k % vals.length];
        const c = el("div", { class: `cell ${cls || ""}`, style: { "--t": v / 9 }, tabindex: "0" }, v);
        const show = () => {
          view.querySelectorAll(".cell.hot").forEach((x) => x.classList.remove("hot"));
          c.classList.add("hot");
          const plain = idx.map((v, i) => `${ADDR[shape.length][i]} ${v}`).join(", ");
          hover.textContent = idx.length ? `address [${idx.join(", ")}] → ${plain} → value ${v}` : `a single number has no address: it's just ${v}`;
          if (shape.length === 2 && idx[0] === 1 && idx[1] === 2) ctx.award("find");
        };
        c.addEventListener("pointerenter", show);
        c.addEventListener("click", show);
        c.addEventListener("focus", show);
        container.append(c);
      }

      function render() {
        const names = NAMES[shape.length];
        dimBox.replaceChildren(
          ...shape.map((d, i) =>
            TM.stepper({ label: names[i], min: 1, max: 6, value: d, onChange: (v) => { shape[i] = v; render(); } }).el
          )
        );
        view.replaceChildren();
        let k = 0;
        if (shape.length === 0) addCell(view, [], 0, "big");
        else if (shape.length === 1) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${shape[0]}, auto)` } });
          for (let i = 0; i < shape[0]; i++) addCell(g, [i], k++);
          view.append(g);
        } else if (shape.length === 2) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${shape[1]}, auto)` } });
          for (let i = 0; i < shape[0]; i++) for (let j = 0; j < shape[1]; j++) addCell(g, [i, j], k++);
          view.append(g);
        } else {
          for (let g0 = 0; g0 < shape[0]; g0++) {
            const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${shape[2]}, auto)` } });
            for (let i = 0; i < shape[1]; i++) for (let j = 0; j < shape[2]; j++) addCell(g, [g0, i, j], k++, "sm");
            view.append(el("div", { class: "slice" }, el("span", { class: "slice-label" }, `grid ${g0}`), g));
          }
        }
        const n = prod(shape);
        info.innerHTML = shape.length
          ? `shape <b>(${shape.join(", ")}${shape.length === 1 ? "," : ""})</b>   →   ${shape.join(" × ")} = <b>${n}</b> number${n === 1 ? "" : "s"}`
          : `shape <b>()</b>   →   just <b>1</b> number`;
        if (shape.length === 1 && shape[0] === 5) ctx.award("list5");
        if (shape.length === 2 && shape[0] === 3 && shape[1] === 4) ctx.award("grid34");
        if (n === 24) ctx.award("count24");
      }

      stage.append(
        el(
          "div",
          { class: "split" },
          el("div", { class: "controls" }, kindSeg.el, el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Size of each side"), dimBox)),
          el("div", { class: "controls" }, info, view, hover)
        )
      );
      render();
    },
  });
})();
