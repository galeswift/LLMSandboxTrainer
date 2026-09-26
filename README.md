# Tensorium

A hands-on science center for how language models work, pitched at a high-school level. Nineteen small halls, grouped into four wings, each teach one idea. Every hall has a few short missions (each with a "Show me how" hint), plus optional bonus missions and a collapsible "Go deeper" section.

| Wing | Halls |
| --- | --- |
| Numbers | 1 Lists & Grids · 2 Reshape Room · 3 The Dot Product · 4 Matrix Multiply Machine |
| Neurons | 5 The Line Neuron (y = mx + b) · 6 Logic Gate Neuron · 7 Squish Functions |
| Learning | 8 The Wrongness Score · 9 Roll Downhill · 10 Two-Knob Landscape · 11 The Machine Learns · 12 Training Arena |
| Language | 13 Text to Numbers · 14 Tokenizer Workshop · 15 Word Map · 16 Attention Spotlight · 17 Who Is "It"? · 18 Next Word Game · 19 Generation Station |

Every exhibit is a live model running in the browser: no videos, no server.

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
- `js/ex-*.js`: one file per hall (attention holds two); each calls `TM.register({...})`. Hall numbers follow script order in `index.html`.
- `js/app.js`: routing (`#tensors`, `#arena`, …), lobby, exhibit page frame
