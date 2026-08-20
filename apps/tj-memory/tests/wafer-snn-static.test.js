"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "wafer-snn.js"), "utf8");
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const literalRefs = [...source.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]);
const missingRefs = [...new Set(literalRefs.filter((id) => !ids.has(id)))];
if (missingRefs.length) throw new Error(`Missing Wafer DOM ids: ${missingRefs.join(", ")}`);

const scriptSources = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
const missingScripts = scriptSources.filter((file) => !fs.existsSync(path.join(root, file)));
if (missingScripts.length) throw new Error(`Missing script assets: ${missingScripts.join(", ")}`);
if (!html.includes('data-tab="wafer"') || !html.includes('id="tab-wafer"')) {
  throw new Error("Wafer tab button/panel contract is missing.");
}

const context2d = {
  fillRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
};
function mockNode(id) {
  return {
    id,
    value: "0",
    checked: false,
    disabled: false,
    width: 980,
    height: 620,
    title: "",
    classList: { contains: () => false },
    getContext: () => context2d,
    addEventListener() {},
    replaceChildren() {},
    append() {},
    options: [],
  };
}
const nodes = Object.fromEntries([...ids].map((id) => [id, mockNode(id)]));
nodes.waferEncoding.value = "rate";
nodes.waferNeuronMode.value = "adaptive";
nodes.waferEncoderThreshold.value = "0.20";
nodes.waferBaseThreshold.value = "0.75";
nodes.waferNoise.value = "0";
nodes.waferJitter.value = "0";
nodes.waferVariation.value = "0";
nodes.waferLtmFeedback.checked = true;

const sandbox = {
  window: { addEventListener() {} },
  document: {
    getElementById: (id) => nodes[id],
    querySelector: () => mockNode("tab-wafer-button"),
    querySelectorAll: () => [],
  },
  Math,
  Number,
  Set,
  Map,
  Array,
  Object,
  String,
  console,
  setTimeout,
};
vm.runInNewContext(source, sandbox, { filename: "wafer-snn.js" });

const validRow = `1\t${Array.from({ length: 152 }, (_, index) => (index / 151).toFixed(6)).join("\t")}`;
const parsed = sandbox.window.WAFER_SNN.parseUcrWafer(validRow, "Wafer_TEST.tsv");
if (parsed.records.length !== 1 || parsed.records[0].values.length !== 152) {
  throw new Error("UCR Wafer parser did not preserve the expected label + 152-value row.");
}
const rejected = sandbox.window.WAFER_SNN.parseUcrWafer(`1\t${Array(151).fill("0").join("\t")}`, "short.tsv");
if (rejected.records.length !== 0) throw new Error("Parser accepted a non-152-sample row.");

const config = {
  encoding: "rate",
  mode: "adaptive",
  encoderThreshold: 0.2,
  baseThreshold: 0.75,
  noise: 0,
  jitter: 0,
  variation: 0,
  ltmFeedback: true,
};
const adaptive = sandbox.window.WAFER_SNN.simulate(parsed.records[0], config);
const fixed = sandbox.window.WAFER_SNN.simulate(parsed.records[0], { ...config, mode: "fixed", ltmFeedback: false });
if (adaptive.input.length !== 152 || adaptive.outputSpikes.length !== 152 || !adaptive.ltm.some(Boolean)) {
  throw new Error("Adaptive SNN did not produce complete 152-step state traces.");
}
if (fixed.ltm.some(Boolean)) throw new Error("Fixed-threshold ablation retained an LTM state.");

console.log(`Wafer static checks passed: ${literalRefs.length} DOM refs, ${scriptSources.length} script assets, 152-step parser and adaptive/fixed traces.`);
