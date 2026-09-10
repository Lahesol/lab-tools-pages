"use strict";

// Optional developer check for the two ANSYS screenshots used while building
// the GUI.  Requires `sharp` in NODE_PATH.  No source image is modified.
const path = require("path");
const sharp = require("sharp");
const Core = require("./core.js");

const inputs = process.argv.slice(2);
if (inputs.length !== 2) {
  console.error("Usage: node test-real-images.js <circular.png> <x-strong.png>");
  process.exit(2);
}

const colors = [
  "#ed1c24", "#00ff00", "#00b5ff", "#f7931e",
  "#00ffff", "#009245", "#ff00ff", "#0000ff",
];
const geometry = { radiusM: 0.138805, lengthM: 0.3 };
const center = { xM: 0, yM: 0 };

async function analyze(file, yMin, yMax, currentUnit) {
  const decoded = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const imageData = {
    width: decoded.info.width,
    height: decoded.info.height,
    data: new Uint8ClampedArray(decoded.data),
  };
  const rect = Core.autoDetectPlotRect(imageData);
  const extracted = Core.extractColorTraces(imageData, rect, colors, 15);
  const data = Core.pixelsToEngineeringData(extracted, {
    xMin: 200,
    xMax: 250,
    yMin,
    yMax,
  }, { timeUnit: "ns", currentUnit }, Array(8).fill(true), Array(8).fill(1));
  const fields = Core.buildFieldSeries(data, geometry, center);
  const metrics = Core.computePolarizationMetrics(data, fields);
  return {
    file: path.basename(file),
    image: [imageData.width, imageData.height],
    rect,
    coverage: extracted.coverage.map((value) => Number(value.toFixed(3))),
    fitR2: extracted.fitQuality.map((value) => value === null ? null : Number(value.toFixed(4))),
    fitCycles: extracted.fitCycles.map((value) => value === null ? null : Number(value.toFixed(3))),
    metricSamples: `${metrics.usedSamples}/${metrics.totalSamples}`,
    bxBy: Number(metrics.amplitudeRatio.toFixed(4)),
    phaseDeg: Number(metrics.phaseDifferenceDeg.toFixed(3)),
    axialRatioDb: Number(metrics.axialRatioDb.toFixed(4)),
    frequencyMHz: Number((metrics.frequencyHz / 1e6).toFixed(4)),
  };
}

Promise.all([
  analyze(inputs[0], -300, 300, "mA"),
  analyze(inputs[1], -375, 375, "mA"),
]).then((results) => {
  console.log(JSON.stringify(results, null, 2));
}).catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
