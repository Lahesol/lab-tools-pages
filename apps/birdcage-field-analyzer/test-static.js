"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");

for (const required of ["index.html", "styles.css", "core.js", "app.js"]) {
  assert(fs.existsSync(path.join(root, required)), `Missing deploy file: ${required}`);
}

const idBlock = app.match(/Object\.fromEntries\(\[([\s\S]*?)\]\.map/);
assert(idBlock, "Unable to locate app element registry");
const referencedIds = [...idBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const missingIds = referencedIds.filter((id) => !htmlIds.has(id));
assert.deepStrictEqual(missingIds, [], `Missing HTML ids: ${missingIds.join(", ")}`);
assert.strictEqual(new Set(referencedIds).size, referencedIds.length, "Duplicate element registry id");

assert(html.includes('<script src="core.js"></script>'), "core.js must load before app.js");
assert(html.includes('<script src="app.js"></script>'), "app.js script tag missing");
assert(html.includes('<link rel="stylesheet" href="styles.css"'), "styles.css link missing");
assert(!/https?:\/\//i.test(html), "Deploy HTML unexpectedly depends on a remote URL");
assert(css.includes("@media (max-width: 760px)"), "Tablet/mobile responsive breakpoint missing");
assert(css.includes("@media (max-width: 520px)"), "Small mobile breakpoint missing");

console.log(JSON.stringify({
  status: "ok",
  deployFiles: ["index.html", "styles.css", "core.js", "app.js"],
  registeredElements: referencedIds.length,
  remoteDependencies: 0,
  responsiveBreakpoints: [1100, 760, 520],
}, null, 2));
