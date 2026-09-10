"use strict";

const assert = require("assert");
const Core = require("./core.js");

function near(actual, expected, tolerance, message) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

const geometry = { radiusM: 0.138805, lengthM: 0.3 };
const center = { xM: 0, yM: 0 };

near(Core.currentUnitToAmp(375, "nA"), 375e-9, 1e-18, "nA conversion");

const singleWire = Core.finiteWireFieldAtPoint([1, 0, 0, 0, 0, 0, 0, 0], geometry, center);
near(singleWire.bx, 0, 1e-15, "Leg 1 at +X must not create Bx at the center");
assert(singleWire.by < 0, "Positive +z current in Leg 1 at +X must create -Y field at the center");

const circular = Core.generateDemoData("circular");
const circularFields = Core.buildFieldSeries(circular, geometry, center);
const circularMetrics = Core.computePolarizationMetrics(circular, circularFields);
near(circularMetrics.amplitudeRatio, 1, 0.015, "Circular demo Bx/By amplitude ratio");
near(Math.abs(circularMetrics.phaseDifferenceDeg), 90, 1.0, "Circular demo quadrature phase");
assert(circularMetrics.axialRatioDb < 0.1, `Circular demo axial ratio too high: ${circularMetrics.axialRatioDb}`);

const xStrong = Core.generateDemoData("x-strong");
const xStrongFields = Core.buildFieldSeries(xStrong, geometry, center);
const xStrongMetrics = Core.computePolarizationMetrics(xStrong, xStrongFields);
assert(xStrongMetrics.amplitudeRatio > 1.4, `X-strong demo ratio too low: ${xStrongMetrics.amplitudeRatio}`);
assert(xStrongMetrics.axialRatioDb > 2.7, `X-strong demo axial ratio unexpectedly low: ${xStrongMetrics.axialRatioDb}`);

const width = 160;
const height = 100;
const pixels = new Uint8ClampedArray(width * height * 4);
for (let offset = 0; offset < pixels.length; offset += 4) {
  pixels[offset] = 255;
  pixels[offset + 1] = 255;
  pixels[offset + 2] = 255;
  pixels[offset + 3] = 255;
}
const rect = { left: 10, right: 149, top: 8, bottom: 91 };
for (let x = rect.left; x <= rect.right; x += 1) {
  const amount = (x - rect.left) / (rect.right - rect.left);
  const y = Math.round((rect.top + rect.bottom) / 2 - Math.sin(amount * Math.PI * 4) * 30);
  for (let dy = -1; dy <= 1; dy += 1) {
    const offset = ((y + dy) * width + x) * 4;
    pixels[offset] = 239;
    pixels[offset + 1] = 45;
    pixels[offset + 2] = 45;
  }
}
const extracted = Core.extractColorTraces({ width, height, data: pixels }, rect, ["#ef2d2d"], 10);
assert(extracted.coverage[0] > 0.98, `Synthetic trace coverage too low: ${extracted.coverage[0]}`);
const engineering = Core.pixelsToEngineeringData(extracted, {
  xMin: 0,
  xMax: 20,
  yMin: -100,
  yMax: 100,
}, { timeUnit: "ns", currentUnit: "mA" }, [true]);
assert(engineering.times.length === rect.right - rect.left + 1, "Digitizer sample count mismatch");
near(engineering.currents[0][0], 0, 3, "Digitized sine start");

const inverted = Core.pixelsToEngineeringData(extracted, {
  xMin: 0,
  xMax: 20,
  yMin: -100,
  yMax: 100,
}, { timeUnit: "ns", currentUnit: "mA" }, [true], [-1]);
near(inverted.currents[0][20], -engineering.currents[0][20], 1e-9, "Leg polarity inversion");

// A legend can cover the end of an ANSYS trace and add a horizontal color
// swatch.  The extractor must reject that swatch and fill the hidden tail from
// the fitted periodic trace, rather than treating it as real current data.
const obscured = new Uint8ClampedArray(pixels);
for (let x = 124; x <= rect.right; x += 1) {
  for (let y = rect.top; y <= rect.bottom; y += 1) {
    const offset = (y * width + x) * 4;
    obscured[offset] = 255;
    obscured[offset + 1] = 255;
    obscured[offset + 2] = 255;
    obscured[offset + 3] = 255;
  }
}
for (let x = 128; x <= 145; x += 1) {
  for (let dy = -1; dy <= 1; dy += 1) {
    const offset = ((18 + dy) * width + x) * 4;
    obscured[offset] = 239;
    obscured[offset + 1] = 45;
    obscured[offset + 2] = 45;
  }
}
const obscuredTrace = Core.extractColorTraces({ width, height, data: obscured }, rect, ["#ef2d2d"], 10);
assert(obscuredTrace.fitQuality[0] > 0.95, `Periodic fit quality too low: ${obscuredTrace.fitQuality[0]}`);
const expectedTailY = Math.round((rect.top + rect.bottom) / 2 - Math.sin(Math.PI * 4) * 30);
near(obscuredTrace.yPixels[0][obscuredTrace.yPixels[0].length - 1], expectedTailY, 2.5, "Legend-hidden tail reconstruction");

console.log(JSON.stringify({
  status: "ok",
  circular: {
    bxBy: circularMetrics.amplitudeRatio,
    phaseDeg: circularMetrics.phaseDifferenceDeg,
    axialRatioDb: circularMetrics.axialRatioDb,
  },
  xStrong: {
    bxBy: xStrongMetrics.amplitudeRatio,
    phaseDeg: xStrongMetrics.phaseDifferenceDeg,
    axialRatioDb: xStrongMetrics.axialRatioDb,
  },
  digitizerCoverage: extracted.coverage[0],
  obscuredFitR2: obscuredTrace.fitQuality[0],
}, null, 2));
