// Design pass: every text colour pair in app/globals.css passes contrast of at
// least 4.5 to 1, in light and dark mode. Reads the real stylesheet, so it
// cannot drift from what the app uses. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contrastRatio } from "../lib/review-view.ts";

const css = readFileSync("app/globals.css", "utf8");

function tokens(block: string) {
  return Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
}
const light = tokens(css.slice(css.indexOf(":root {"), css.indexOf("@media (prefers-color-scheme: dark)")));
const darkBlock = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
const dark = tokens(darkBlock.slice(0, darkBlock.indexOf("@theme")));

// [text, background] pairs that appear on screen.
const PAIRS: [string, string][] = [
  ["ink", "page"], ["ink", "subtle"], ["ink", "fill"], ["ink", "fill-hover"],
  ["muted", "page"], ["muted", "subtle"], ["muted", "fill"],
  ["accent", "page"], ["accent", "subtle"], ["accent-ink", "accent"],
  ["page", "ink"],
  ["sev-critical-fg", "sev-critical-bg"], ["sev-high-fg", "sev-high-bg"],
  ["sev-medium-fg", "sev-medium-bg"], ["sev-low-fg", "sev-low-bg"],
  ["mark-fg", "mark-bg"],
  ["tier3-fg", "tier3-bg"], ["tier3-fg", "page"],
];

for (const [mode, t] of [["light", light], ["dark", dark]] as const) {
  test(`every text colour pair passes 4.5 to 1 in ${mode} mode`, () => {
    for (const [fg, bg] of PAIRS) {
      assert.ok(t[fg] && t[bg], `${mode}: missing --${fg} or --${bg}`);
      const ratio = contrastRatio(t[fg], t[bg]);
      assert.ok(ratio >= 4.5, `${mode}: --${fg} on --${bg} is ${ratio.toFixed(2)}`);
    }
  });
  test(`the Tier 3 outline stands out from the page in ${mode} mode (at least 3 to 1)`, () => {
    assert.ok(contrastRatio(t["tier3-line"], t.page) >= 3, `${mode}: ${contrastRatio(t["tier3-line"], t.page).toFixed(2)}`);
  });
  test(`the focus ring stands out from the page in ${mode} mode (at least 3 to 1)`, () => {
    assert.ok(contrastRatio(t.focus, t.page) >= 3, `${mode}: ${contrastRatio(t.focus, t.page).toFixed(2)}`);
  });
}

test("the stylesheet uses Geist, shows focus, and respects reduced motion", () => {
  assert.match(css, /font-family: var\(--font-geist-sans\)/);
  assert.match(css, /:focus-visible \{\s*outline: 2px solid var\(--focus\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.equal(css.includes("\u2014"), false);
});
