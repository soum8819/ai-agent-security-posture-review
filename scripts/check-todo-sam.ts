// Final check before submission: fails while any tracked file still holds the
// marker for text the project owner must write in their own words.
// Run: npm run check:final
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Built from two parts so this file does not match itself.
const MARKER = ["TODO", "SAM"].join("-");
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !/\.(png|jpe?g|ico|webp|avif|woff2?)$/i.test(f) && !f.startsWith("eval/runs/"));

const hits: string[] = [];
for (const f of files) {
  let text: string;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  text.split("\n").forEach((line, i) => {
    if (line.includes(MARKER)) hits.push(`${f}:${i + 1}`);
  });
}

if (hits.length) {
  console.error(`${MARKER} remains in ${hits.length} place${hits.length === 1 ? "" : "s"}:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`No ${MARKER} left.`);
