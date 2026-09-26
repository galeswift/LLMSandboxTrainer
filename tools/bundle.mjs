// Inline CSS and JS into a single self-contained HTML file.
//   node tools/bundle.mjs            -> dist/tensorium.html (full document)
//   node tools/bundle.mjs --fragment -> dist/tensorium.fragment.html (body content only)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(root + p, "utf8");
let html = read("index.html")
  .replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, p) => `<style>\n${read(p)}</style>`)
  .replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, p) => `<script>\n${read(p)}</script>`);
const fragment = process.argv.includes("--fragment");
if (fragment) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>\n?/g, "");
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = head + body;
}
mkdirSync(root + "dist", { recursive: true });
const out = `dist/tensorium${fragment ? ".fragment" : ""}.html`;
writeFileSync(root + out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
