/* Reshape Room — same numbers, new shape; memory is one long line. */
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
    id: "reshape",
    wing: "numbers",
    title: "Reshape Room",
    short: "Reshape",
    color: "--h1",
    tagline: "The same 12 numbers can be a 3×4 grid, a 2×6 grid, or one long list. Nothing moves, only the shape changes.",
    intro:
      "<p>Inside the computer, numbers are really stored in one long line, like beads on a string. The <b>shape</b> is just a rule for folding that line into rows.</p><p>The numbers here count up 0, 1, 2… so you can follow them. Try <b>reshaping</b> the grid, and watch the line at the bottom stay the same.</p>",
    words: [
      ["Reshape", "Fold the same numbers into a new shape. The total count must stay the same."],
      ["-1", "Means “you work it out.” The computer fills in whatever size makes the count fit."],
      ["Transpose", "Flip a grid so rows become columns."],
      ["Memory", "Where the computer actually stores the numbers: one long line."],
    ],
    explainTitle: "Strides: the folding rule",
    explain:
      "<p>How does the computer know where row 1, column 2 lives in the line? It uses <b>strides</b>: how many beads to skip for each step along a side. In a 3×4 grid you skip 4 to go down a row and 1 to go across, so [1, 2] lives at 1×4 + 2×1 = 6.</p><ul><li>Reshape only changes the strides. It's instant, even for billions of numbers.</li><li>Transpose also only swaps the strides. The line of memory is now read in a jumpy order, so if you reshape afterwards, the computer first has to copy the numbers into a fresh line.</li><li>AI code reshapes constantly, for example to split one long list into several “attention heads” (you'll meet those in the Language wing).</li></ul>",
    challenges: [
      { id: "reshape", title: "Turn the 3×4 grid into a 2×6 grid", hint: "Same 12 numbers, new shape.", how: "Type 2,6 in the “Reshape to” box and press Reshape." },
      { id: "badshape", title: "Try a shape that can't fit", hint: "See what error the computer gives.", how: "Type 5,5 and press Reshape. 5 × 5 = 25, but there are only 12 numbers." },
      { id: "infer", title: "Let the computer do the math", hint: "Use -1 for one of the sizes.", how: "Type 4,-1 and press Reshape. The computer figures out 12 ÷ 4 = 3, so the shape becomes (4, 3)." },
      { id: "transpose", title: "Flip the grid", hint: "Rows become columns.", how: "Press “Flip (transpose)”. Hover a cell: the value is the same, but its address changed." },
    ],
    mount(stage, ctx) {
      let T;
      const make = (shape) => {
        T = { shape: shape.slice(), strides: contigStrides(shape), data: Array.from({ length: prod(shape) }, (_, i) => i) };
      };
      make([3, 4]);

      const view = el("div", { class: "tensor-view" });
      const mem = el("div", { class: "mem" });
      const info = el("div", { class: "eq" });
      const hover = el("div", { class: "readout" }, "Hover over (or tap) a cell to find it in memory.");
      const msg = el("p", { class: "note" });
      const reshapeIn = el("input", { class: "txt", id: "t-reshape", value: "", placeholder: "e.g. 2,6", size: 10, "aria-label": "new shape" });

      function addCell(container, idx, cls) {
        const off = idx.reduce((a, v, i) => a + v * T.strides[i], 0);
        const v = T.data[off];
        const n = T.data.length;
        const c = el("div", { class: `cell ${cls || ""}`, style: { "--t": n > 1 ? v / (n - 1) : 0.5 }, tabindex: "0" }, v);
        const show = () => {
          stage.querySelectorAll(".cell.hot").forEach((x) => x.classList.remove("hot"));
          c.classList.add("hot");
          const m = mem.querySelector(`[data-off="${off}"]`);
          m && m.classList.add("hot");
          const terms = idx.map((v, i) => `${v}×${T.strides[i]}`).join(" + ");
          hover.textContent = `address [${idx.join(", ")}] → spot ${terms} = ${off} in memory → value ${v}`;
        };
        c.addEventListener("pointerenter", show);
        c.addEventListener("click", show);
        c.addEventListener("focus", show);
        container.append(c);
      }

      function render() {
        view.replaceChildren();
        const s = T.shape;
        if (s.length === 1) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[0]}, auto)` } });
          for (let i = 0; i < s[0]; i++) addCell(g, [i], "sm");
          view.append(g);
        } else if (s.length === 2) {
          const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[1]}, auto)` } });
          for (let i = 0; i < s[0]; i++) for (let j = 0; j < s[1]; j++) addCell(g, [i, j]);
          view.append(g);
        } else {
          for (let k = 0; k < s[0]; k++) {
            const g = el("div", { class: "grid", style: { gridTemplateColumns: `repeat(${s[2]}, auto)` } });
            for (let i = 0; i < s[1]; i++) for (let j = 0; j < s[2]; j++) addCell(g, [k, i, j], "sm");
            view.append(el("div", { class: "slice" }, el("span", { class: "slice-label" }, `grid ${k}`), g));
          }
        }
        mem.replaceChildren(...T.data.map((v, i) => el("div", { class: "cell", style: { "--t": v / (T.data.length - 1) }, "data-off": i, title: `memory spot ${i}` }, v)));
        info.innerHTML = `shape <b>${tup(T.shape)}</b>   ·   ${T.shape.join(" × ")} = ${T.data.length} numbers`;
      }

      function fail(text) {
        msg.className = "note warn";
        msg.textContent = text;
      }

      function doReshape() {
        const raw = reshapeIn.value.split(/[\s,()x×]+/).filter(Boolean);
        let dims = raw.map(Number);
        if (!dims.length || dims.some((d) => !Number.isInteger(d) || (d < 1 && d !== -1))) return fail("Type whole numbers separated by commas, like 2,6.");
        if (dims.length > 3) return fail("This room shows up to 3 sides. Real AI tensors can have more.");
        const n = T.data.length;
        const minus = dims.filter((d) => d === -1).length;
        if (minus > 1) return fail("Only one size can be -1. The computer can solve for one unknown, not two.");
        if (minus) {
          const known = prod(dims.filter((d) => d !== -1));
          if (n % known) {
            ctx.award("badshape");
            return fail(`Error: can't fit ${n} numbers. ${n} doesn't divide evenly by ${known}.`);
          }
          dims = dims.map((d) => (d === -1 ? n / known : d));
        }
        if (prod(dims) !== n) {
          ctx.award("badshape");
          return fail(`Error: shape ${tup(dims)} holds ${prod(dims)} numbers, but we have ${n}. The count has to match exactly.`);
        }
        if (dims.some((d) => d > 12)) return fail("Keep each side at 12 or less so it fits on the wall.");
        const contig = T.strides.join() === contigStrides(T.shape).join();
        let data = T.data, note = "";
        if (!contig) {
          data = [];
          const walk = (d, off) => {
            if (d === T.shape.length) return data.push(T.data[off]);
            for (let i = 0; i < T.shape[d]; i++) walk(d + 1, off + i * T.strides[d]);
          };
          walk(0, 0);
          note = " Because the grid was flipped, the computer had to copy the numbers into a fresh line first. Look at the memory row: the order changed.";
        }
        T = { shape: dims, strides: contigStrides(dims), data };
        msg.className = "note ok";
        msg.textContent = `Reshaped to ${tup(dims)}. Same numbers, new shape.${note}`;
        if (dims.length === 2 && dims[0] === 2 && dims[1] === 6) ctx.award("reshape");
        if (minus) ctx.award("infer");
        render();
      }

      reshapeIn.addEventListener("keydown", (e) => e.key === "Enter" && doReshape());
      const flipBtn = TM.btn("Flip (transpose)", () => {
        const r = T.shape.length;
        if (r < 2) return fail("A single list has nothing to flip. Reshape it into a grid first.");
        const sh = T.shape.slice(), st = T.strides.slice();
        [sh[r - 1], sh[r - 2]] = [sh[r - 2], sh[r - 1]];
        [st[r - 1], st[r - 2]] = [st[r - 2], st[r - 1]];
        T = { shape: sh, strides: st, data: T.data };
        msg.className = "note";
        msg.textContent = "Flipped. Rows are now columns. The memory line didn't change at all.";
        ctx.award("transpose");
        render();
      });

      stage.append(
        el(
          "div",
          { class: "split" },
          el(
            "div",
            { class: "controls" },
            el("div", { class: "ctl-group" }, el("label", { class: "ctl-label", for: "t-reshape" }, "Reshape to"), el("div", { class: "ctl-row" }, reshapeIn, TM.btn("Reshape", doReshape, "primary"))),
            el("div", { class: "ctl-row" }, flipBtn, TM.btn("Start over", () => { make([3, 4]); msg.textContent = ""; render(); })),
            msg
          ),
          el(
            "div",
            { class: "controls" },
            info,
            view,
            el("div", { class: "ctl-group" }, el("span", { class: "ctl-label" }, "Memory: the one long line the numbers really live in"), mem),
            hover
          )
        )
      );
      render();
    },
  });
})();
