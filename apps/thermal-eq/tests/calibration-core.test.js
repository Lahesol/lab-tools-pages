"use strict";

require("../calibration-core.js");

const core = globalThis.ThermalEqCalibration;

function assertClose(actual, expected, tolerance = 1e-9) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
}

const linearPoints = [
  { rawCode: 100, referenceValue: 1 },
  { rawCode: 200, referenceValue: 2 },
  { rawCode: 300, referenceValue: 3 },
];
const linear = core.fitLinear(linearPoints);
assertClose(linear.coefficients.a, 0.01);
assertClose(linear.coefficients.b, 0);
assertClose(linear.rmse, 0);
assertClose(core.predict(linear, 250), 2.5);

const quadraticPoints = [0, 10, 20, 30].map((rawCode) => ({
  rawCode,
  referenceValue: 0.002 * rawCode * rawCode + 0.1 * rawCode + 2,
}));
const quadratic = core.fitQuadratic(quadraticPoints);
assertClose(quadratic.coefficients.a, 0.002, 1e-10);
assertClose(quadratic.coefficients.b, 0.1, 1e-10);
assertClose(quadratic.coefficients.c, 2, 1e-10);
assertClose(quadratic.rmse, 0, 1e-10);
assertClose(core.predict(quadratic, 25), 5.75, 1e-10);

let duplicateCodesRejected = false;
try {
  core.fitLinear([{ rawCode: 100, referenceValue: 1 }, { rawCode: 100, referenceValue: 2 }]);
} catch (_) {
  duplicateCodesRejected = true;
}
if (!duplicateCodesRejected) {
  throw new Error("Duplicate raw-code linear fit was not rejected.");
}

console.log("calibration-core tests passed");
