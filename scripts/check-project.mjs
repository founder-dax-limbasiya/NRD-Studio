import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("app.js", "utf8");
const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));

new vm.Script(app, { filename: "app.js" });

const htmlIds = new Set([...html.matchAll(/\\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([...app.matchAll(/\\$\\("#([^"]+)"\\)/g)].map(match => match[1]));
const generatedIds = new Set(["emptyMediaInput"]);
const missingIds = [...referencedIds].filter(id => !htmlIds.has(id) && !generatedIds.has(id));

assert.equal(missingIds.length, 0, `Missing DOM IDs: ${missingIds.join(", ")}`);
assert.ok(manifest.name && manifest.start_url && manifest.display, "PWA manifest is incomplete");
for (const path of ["styles.css", "app.js", "manifest.webmanifest", "sw.js", "assets/icon.svg"]) {
  assert.ok(existsSync(path), `Missing app shell file: ${path}`);
}
assert.ok(html.includes('id="contentTitle"'), "Content editor title field is missing");
assert.ok(html.includes('id="exportSrtButton"'), "Subtitle export action is missing");
console.log("NRD smoke checks passed.");
