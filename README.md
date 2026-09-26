# Tensorium

A hands-on science center for how language models work. Eight exhibit halls take you from a single grid of numbers to a machine that writes text. Every exhibit is a live model running in your browser, with puzzles that earn passport stamps.

| Hall | Exhibit | What you play with |
| --- | --- | --- |
| 1 | Tensor Hall | Build tensors, trace cells into memory, reshape (with `-1`), transpose, and a matrix-multiply machine |
| 2 | Neuron Lab | Hand-tune one neuron into AND / OR / NAND gates, then hit the XOR wall |
| 3 | Gradient Descent Hill | Roll a ball down loss landscapes; tune the learning rate and momentum; find local minima and divergence |
| 4 | Training Arena | A real multilayer network trained live with backprop (SGD or Adam) on blobs, circle, XOR and spiral data |
| 5 | Tokenizer Workshop | Build a byte-pair-encoding vocabulary one merge at a time, then tokenize new text |
| 6 | Embedding Space | Words as vectors: cosine similarity, analogy arithmetic, PCA |
| 7 | Attention Theater | Query/key/value lookup with softmax sharpness, plus sentence self-attention with a causal mask |
| 8 | Generation Station | Next-character prediction with context size, temperature and top-k sampling |

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

Stamps are stored in your browser's `localStorage`.

## Single-file build

```sh
node tools/bundle.mjs             # dist/tensorium.html, everything inlined
node tools/bundle.mjs --fragment  # body-only variant for embedding
```

## Layout

- `index.html`: shell (floor map + main area)
- `css/styles.css`: design tokens (light and dark) and components
- `js/core.js`: DOM helpers, controls, math utilities, passport stamps
- `js/ex-*.js`: one file per hall; each calls `TM.register({...})`
- `js/app.js`: routing (`#tensors`, `#arena`, …), lobby, exhibit page frame
