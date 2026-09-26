/* Hall 1: Tensors — shapes, memory layout, reshape, transpose, matmul. */
(function () {
  const { el } = TM;
  const prod = (a) => a.reduce((x, y) => x * y, 1);
  const contigStrides = (shape) => {
    const s = new Array(shape.length);
    let acc = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      s[i] = acc;
      acc *= shape[i];
    }
    return s;
  };
  const tup = (a) => (a.length === 1 ? `(${a[0]},)` : `(${a.join(", ")})`);

  TM.register({
    id: "tensors",
    hall: 1,
    title: "Tensor Hall",
    short: "Tensors",
    color: "--h1",
    next: "neuron",
    tagline: "Everything a model sees, stores, and computes is a tensor: a box of numbers with a shape.",
    intro:
      "<p>A <b>tensor</b> is a grid of numbers with any number of dimensions. A single number is rank 0, a list is rank 1, a table is rank 2, and a stack of tables is rank 3. Inside an LLM, one batch of text might be a tensor of shape <code>(batch, tokens, 4096)</code>.</p><p>Build tensors below, then hover any cell to see where it actually lives in memory.</p>",
    explainTitle: "Shape is a view; memory is a line",
    explain:
      "<p>Computer memory is one long line of numbers. A tensor's <b>shape</b> and <b>strides</b> are instructions for reading that line as a grid. The stride of a dimension is how many slots you jump when that index goes up by one.</p><ul><li><b>Reshape</b> keeps the same line of memory and only changes the reading instructions, which is why the element count must match. Using <code>-1</code> tells the library to work out that dimension for you.</li><li><b>Transpose</b> doesn't move any numbers. It swaps two strides, so the tensor is now read in a different order. The result is <i>non-contiguous</i>, and reshaping it forces a copy.</li><li><b>Matrix multiply</b> is the workhorse of every neural network. Each output cell is a dot product: a row of A times a column of B, summed up. The inner sizes must match. Most of an LLM's compute is spent on exactly this.</li></ul>",
    challenges: [
      { id: "rank3", title: "Stack the tables", hint: "Build a rank-3 tensor." },
      { id: "reshape", title: "Same numbers, new shape", hint: "Reshape a tensor into a different shape with the same element count." },
      { id: "infer", title: "Let it do the math", hint: "Reshape using -1 for one dimension, like 2,-1." },
      { id: "transpose", title: "Flip the reading order", hint: "Transpose a matrix and watch the strides swap." },
      { id: "mismatch", title: "Hit the classic error", hint: "Make the inner sizes of a matmul disagree." },
      { id: "outer", title: "Outer product", hint: "Multiply a column by a row (inner size 1) to get a 3×3 or larger result." },
    ],
    tries: [
      "Transpose, then reshape. Notice the copy warning and how the memory order changes.",
      "Make A a single row and B a single column. That's a plain dot product, the basic operation behind attention scores.",
    ],
    mount(stage, ctx) {
      // ---------- Tensor builder ----------
      let T = null; // {shape, strides, data}
      const make = (shape) => {
        const n = prod(shape);
        T = { shape: shape.slice(), strides: contigStrides(shape), data: Array.from({ length: n }, (_, i) => i) };
      };
      make([3, 4]);

      const view = el("div", { class: "tensor-view" });
      const mem = el("div", { class: "mem" });
      const info = el("div", { class: "readout" });
      const hover = el("div", { class: "readout" }, "Hover a cell to trace it into memory.");
      const msg = el("p", { class: "note" });
      const dimBox = el("div", { class: "ctl-row" });
      const reshapeIn = el("input", { class: "txt", id: "t-reshape", value: "2,6", size: 10, "aria-label": "new shape" });

      const rankSeg = TM.seg({
        label: "Rank (number of dimensions)",
        options: [[0, "0 · scalar"], [1, "1 · vector"], [2, "2 · matrix"], [3, "3 · stack"]],
        value: 2,
        onChange: (r) => {
          make([[], [6], [3, 4], [2, 3, 4]][r]);
          msg.textContent = "";
          if (r === 3) ctx.award("rank3");
          renderAll();
        },
      });

      function renderDims() {
        dimBox.replaceChildren(
          ...T.shape.map((d, i) =>
            TM.stepper({
              label: `dim ${i}`,
              min: 1,
              max: 6,
              value: d,
              onChange: (v) => {
                const s = T.shape.slice();
                s[i] = v;
                make(s);
                msg.textContent = "";
                renderAll();
              },
            }).el
          )
        );
        if (!T.shape.length) dimBox.append(el("span", { class: "note" }, "A scalar has no dimensions: shape ()."));
      }

      const cellsByMem = new Map();
      function addCell(container, idx, cls) {
        const off = idx.reduce((a, v, i) => a + v * T.strides[i], 0);
        const v = T.data[off];
        const n = T.data.length;
        const c = el("div", { class: `cell ${cls || ""}`, style: { "--t": n > 1 ? v / (n - 1) : 0.5 }, tabindex: "0" }, v);
        c.dataset.off = off;
        const show = () => {
          document.querySelectorAll(".tensor-view .cell.hot, .mem .cell.hot").forEach((x) => x.classList.remove("hot"));
          c.classList.add("hot");
          const m = mem.querySelector(`[data-off="${off}"]`);
          m && m.classList.add("hot");
          const terms = idx.map((v, i) => `${v}×${T.strides[i]}`).join(" + ") || "0";
          hover.innerHTML = `index <b>[${idx.join(", ")}]</b> → memory slot ${terms} = <b>${off}</b> → value <b>${v}</b>`;
        };
        c.addEventListener("pointerenter", show);
        c.addEventListener("focus", show);
        container.append(c);
      }

      function renderView() {
        view.replaceChildren();
        const s = T.shape;
        if (s.length === 0) addCell(view, [], "big");
        else if (s.length === 1) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[0]}, auto)` } });
          for (let i = 0; i < s[0]; i++) addCell(g, [i]);
          view.append(g);
        } else if (s.length === 2) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[1]}, auto)` } });
          for (let i = 0; i < s[0]; i++) for (let j = 0; j < s[1]; j++) addCell(g, [i, j]);
          view.append(g);
        } else {
          for (let k = 0; k < s[0]; k++) {
            const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[2]}, auto)` } });
            for (let i = 0; i < s[1]; i++) for (let j = 0; j < s[2]; j++) addCell(g, [k, i, j], "sm");
            view.append(el("div", { class: "slice" }, el("span", { class: "slice-label" }, `[${k}, :, :]`), g));
          }
        }
        mem.replaceChildren(
          ...T.data.map((v, i) => el("div", { class: "cell", style: { "--t": T.data.length > 1 ? v / (T.data.length - 1) : 0.5 }, "data-off": i, title: `slot ${i}` }, v))
        );
        const contig = T.strides.join() === contigStrides(T.shape).join();
        info.innerHTML = `shape <b>${tup(T.shape)}</b> · ${T.data.length} element${T.data.length === 1 ? "" : "s"} · strides <b>${tup(T.strides)}</b> · ${contig ? "contiguous" : "<b>non-contiguous</b>"}`;
      }

      function renderAll() {
        renderDims();
        renderView();
        transposeBtn.disabled = T.shape.length < 2;
      }

      function doReshape() {
        const raw = reshapeIn.value.split(/[\s,()x×]+/).filter(Boolean);
        let dims = raw.map(Number);
        if (!dims.length || dims.some((d) => !Number.isInteger(d) || (d < 1 && d !== -1))) {
          msg.className = "note warn";
          msg.textContent = "Type whole numbers separated by commas, like 2,6 or 3,-1.";
          return;
        }
        if (dims.length > 3) {
          msg.className = "note warn";
          msg.textContent = "This hall displays up to 3 dimensions. Real tensors can have many more.";
          return;
        }
        const n = T.data.length;
        const usedInfer = dims.filter((d) => d === -1).length;
        if (usedInfer > 1) {
          msg.className = "note warn";
          msg.textContent = "Only one dimension can be -1. The library can solve for one unknown, not two.";
          return;
        }
        if (usedInfer) {
          const known = prod(dims.filter((d) => d !== -1));
          if (n % known) {
            msg.className = "note warn";
            msg.textContent = `RuntimeError: shape '[${dims.join(", ")}]' is invalid for input of size ${n}. ${n} isn't divisible by ${known}.`;
            return;
          }
          dims = dims.map((d) => (d === -1 ? n / known : d));
        }
        if (dims.some((d) => d > 6)) {
          msg.className = "note warn";
          msg.textContent = "Keep each dimension at 6 or less so it fits on the wall.";
          return;
        }
        if (prod(dims) !== n) {
          msg.className = "note warn";
          msg.textContent = `RuntimeError: shape '[${dims.join(", ")}]' is invalid for input of size ${n}. The new shape holds ${prod(dims)} elements.`;
          return;
        }
        const contig = T.strides.join() === contigStrides(T.shape).join();
        let data = T.data;
        let note = "";
        if (!contig) {
          // materialize in logical order, like tensor.contiguous()
          data = [];
          const walk = (d, off) => {
            if (d === T.shape.length) return data.push(T.data[off]);
            for (let i = 0; i < T.shape[d]; i++) walk(d + 1, off + i * T.strides[d]);
          };
          walk(0, 0);
          note = " The transposed tensor wasn't in reading order, so the numbers were copied into a fresh line of memory first (PyTorch's .view() would refuse; .reshape() copies).";
        }
        const changed = tup(dims) !== tup(T.shape);
        T = { shape: dims, strides: contigStrides(dims), data };
        rankSeg.set(dims.length);
        msg.className = "note ok";
        msg.textContent = `Reshaped to ${tup(dims)}. No numbers changed, only the way we read them.${note}`;
        if (changed) ctx.award("reshape");
        if (usedInfer) ctx.award("infer");
        renderAll();
      }

      const transposeBtn = TM.btn("Transpose last two dims", () => {
        const r = T.shape.length;
        if (r < 2) return;
        const sh = T.shape.slice(), st = T.strides.slice();
        [sh[r - 1], sh[r - 2]] = [sh[r - 2], sh[r - 1]];
        [st[r - 1], st[r - 2]] = [st[r - 2], st[r - 1]];
        T = { shape: sh, strides: st, data: T.data };
        msg.className = "note";
        msg.textContent = "Transposed. Memory is untouched; only the strides swapped.";
        ctx.award("transpose");
        renderAll();
      });

      reshapeIn.addEventListener("keydown", (e) => e.key === "Enter" && doReshape());

      const builder = el(
        "div",
        { class: "station" },
        el("h3", { class: "station-title" }, "Tensor builder", el("small", null, "values count up so you can follow them around")),
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            rankSeg.el,
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Size of each dimension"), dimBox),
            el("div", { class: "ctl-group" }, el("label", { class: "ctl-label", for: "t-reshape" }, "Reshape to"), el("div", { class: "ctl-row" }, reshapeIn, TM.btn("Reshape", doReshape, "primary"))),
            el("div", { class: "ctl-row" }, transposeBtn, TM.btn("Reset", () => rankSeg.set(rankSeg.get(), true)))
          ),
          el(
            "div",
            { class: "controls" },
            info,
            view,
            msg,
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Memory: the one line the numbers really live in"), mem),
            hover
          )
        )
      );

      // ---------- Matmul station ----------
      let dims = { m: 2, k1: 3, k2: 3, n: 2 };
      let seed = 3;
      let A, B;
      const genMats = () => {
        const r = TM.rng(seed);
        A = Array.from({ length: dims.m }, () => Array.from({ length: dims.k1 }, () => r.int(-3, 3)));
        B = Array.from({ length: dims.k2 }, () => Array.from({ length: dims.n }, () => r.int(-3, 3)));
      };
      const mmBox = el("div", { class: "mm" });
      const mmRead = el("div", { class: "readout" }, "Hover a cell of the result to see the dot product that made it.");
      const mmCost = el("p", { class: "note" });

      const mat = (M, name, rows, cols, id) => {
        const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${cols}, auto)` } });
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++) {
            const v = M ? M[i][j] : "";
            const c = el("div", { class: "cell sm", style: { "--t": M ? (v + 9) / 18 : 0.1 } }, M ? String(v).replace("-", "−") : "");
            c.dataset.r = i;
            c.dataset.c = j;
            c.dataset.m = id;
            g.append(c);
          }
        return el("div", { class: "slice" }, g, el("div", { class: "mm-label" }, `${name} ${rows}×${cols}`));
      };

      function renderMM() {
        genMats();
        mmBox.replaceChildren();
        mmBox.append(mat(A, "A", dims.m, dims.k1, "A"), el("span", { class: "mm-op" }, "×"), mat(B, "B", dims.k2, dims.n, "B"), el("span", { class: "mm-op" }, "="));
        if (dims.k1 !== dims.k2) {
          mmBox.append(el("div", { class: "mm-err" }, `RuntimeError: mat1 and mat2 shapes cannot be multiplied (${dims.m}x${dims.k1} and ${dims.k2}x${dims.n})`));
          mmRead.textContent = `A has ${dims.k1} columns but B has ${dims.k2} rows. Each row of A must line up with each column of B, number for number.`;
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
            mmRead.innerHTML = `C[${i},${j}] = row ${i} of A · column ${j} of B = ${terms} = <b>${C[i][j]}</b>`.replace(/-/g, "−");
          };
          c.addEventListener("pointerenter", show);
          c.addEventListener("focus", show);
        });
        mmBox.append(cView);
        mmCost.textContent = `(${dims.m}×${k}) @ (${k}×${dims.n}) → (${dims.m}×${dims.n}). That took ${dims.m}·${k}·${dims.n} = ${dims.m * k * dims.n} multiply-adds. A single layer of a large LLM does billions of these per token.`;
        if (k === 1 && dims.m >= 3 && dims.n >= 3) ctx.award("outer");
      }
      mmBox.addEventListener("pointerleave", () => mmBox.querySelectorAll(".cell").forEach((x) => x.classList.remove("dim", "hot")));

      const dimStep = (label, key) =>
        TM.stepper({ label, min: 1, max: 4, value: dims[key], onChange: (v) => { dims[key] = v; renderMM(); } }).el;

      const mmStation = el(
        "div",
        { class: "station" },
        el("h3", { class: "station-title" }, "Matrix multiply machine", el("small", null, "rows of A meet columns of B")),
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-row" }, dimStep("A rows", "m"), dimStep("A cols", "k1")),
            el("div", { class: "ctl-row" }, dimStep("B rows", "k2"), dimStep("B cols", "n")),
            el("div", { class: "ctl-row" }, TM.btn("New numbers", () => { seed++; renderMM(); }))
          ),
          el("div", { class: "controls" }, mmBox, mmRead, mmCost)
        )
      );

      stage.append(builder, mmStation);
      renderAll();
      renderMM();
    },
  });
})();
