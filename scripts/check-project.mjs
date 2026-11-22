import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const scripts = ["app.js", "projects.js", "subtitles.js", "render.js", "sw.js"];
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));

for (const file of scripts) {
  assert.ok(existsSync(file), "Missing script: " + file);
  const source = readFileSync(file, "utf8");
  new vm.Script(source, { filename:file });
  const ids = [...source.matchAll(/\$\("#([A-Za-z][A-Za-z0-9_-]*)"\)/g)].map(match => match[1]);
  const generated = new Set(["emptyMediaInput"]);
  const missing = [...new Set(ids)].filter(id => !htmlIds.has(id) && !generated.has(id));
  assert.equal(missing.length, 0, file + " references missing DOM IDs: " + missing.join(", "));
}
const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));
assert.ok(manifest.name && manifest.start_url && manifest.display, "PWA manifest is incomplete");
for (const path of ["styles.css", "manifest.webmanifest", "assets/icon.svg", "scripts/check-project.mjs", "scripts/test-subtitles.mjs"]) {
  assert.ok(existsSync(path), "Missing project file: " + path);
}
for (const module of ["projects.js", "subtitles.js", "render.js"]) {
  assert.ok(html.includes('src="/' + module + '"'), "HTML does not load " + module);
  assert.ok(readFileSync("sw.js", "utf8").includes('"/' + module + '"'), "Service worker does not cache " + module);
}
assert.ok(html.includes('id="projectGrid"'), "Project library screen is missing");
assert.ok(html.includes('id="sceneList"'), "Storyboard screen is missing");
assert.ok(html.includes('id="subtitleList"'), "Subtitle editor is missing");
assert.ok(html.includes('id="renderVideoButton"'), "Video renderer control is missing");
console.log("NRD project smoke checks passed.");
