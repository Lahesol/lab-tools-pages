"use strict";

/*
 * Pure least-squares helpers for host-side calibration review.  This module
 * intentionally has no transport, DOM, storage, heater, or firmware-control
 * access, so it can be tested independently from live instrument data.
 */
(function registerCalibrationCore(root) {
  function metrics(points, predict) {
    const residuals = points.map((point) => point.referenceValue - predict(point.rawCode));
    const absolute = residuals.map((value) => Math.abs(value));
    return {
      maxAbsError: Math.max(...absolute),
      mae: absolute.reduce((sum, value) => sum + value, 0) / absolute.length,
      rmse: Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length),
    };
  }

  function fitLinear(points) {
    const xMean = points.reduce((sum, point) => sum + point.rawCode, 0) / points.length;
    const yMean = points.reduce((sum, point) => sum + point.referenceValue, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.rawCode - xMean) ** 2, 0);
    if (denominator === 0) {
      throw new Error("At least two distinct raw ADC codes are required.");
    }
    const a = points.reduce((sum, point) => sum + (point.rawCode - xMean) * (point.referenceValue - yMean), 0) / denominator;
    const b = yMean - a * xMean;
    const predict = (rawCode) => a * rawCode + b;
    return { model: "linear", coefficients: { a, b }, ...metrics(points, predict) };
  }

  function solve3x3(matrix, vector) {
    const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);
    for (let column = 0; column < 3; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < 3; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
          pivot = row;
        }
      }
      if (Math.abs(augmented[pivot][column]) < 1e-12) {
        return null;
      }
      [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
      const divisor = augmented[column][column];
      for (let value = column; value <= 3; value += 1) {
        augmented[column][value] /= divisor;
      }
      for (let row = 0; row < 3; row += 1) {
        if (row === column) {
          continue;
        }
        const factor = augmented[row][column];
        for (let value = column; value <= 3; value += 1) {
          augmented[row][value] -= factor * augmented[column][value];
        }
      }
    }
    return augmented.map((row) => row[3]);
  }

  function fitQuadratic(points) {
    const mean = points.reduce((sum, point) => sum + point.rawCode, 0) / points.length;
    const variance = points.reduce((sum, point) => sum + (point.rawCode - mean) ** 2, 0) / points.length;
    const scale = Math.sqrt(variance);
    if (scale < 1e-9) {
      throw new Error("At least three distinct raw ADC codes are required.");
    }
    const normalized = points.map((point) => ({ ...point, z: (point.rawCode - mean) / scale }));
    const sums = normalized.reduce((accumulator, point) => {
      const z2 = point.z * point.z;
      accumulator.z += point.z;
      accumulator.z2 += z2;
      accumulator.z3 += z2 * point.z;
      accumulator.z4 += z2 * z2;
      accumulator.y += point.referenceValue;
      accumulator.zy += point.z * point.referenceValue;
      accumulator.z2y += z2 * point.referenceValue;
      return accumulator;
    }, { z: 0, z2: 0, z3: 0, z4: 0, y: 0, zy: 0, z2y: 0 });
    const solution = solve3x3(
      [[sums.z4, sums.z3, sums.z2], [sums.z3, sums.z2, sums.z], [sums.z2, sums.z, normalized.length]],
      [sums.z2y, sums.zy, sums.y],
    );
    if (!solution) {
      throw new Error("The selected points cannot produce a stable quadratic fit.");
    }
    const [qa, qb, qc] = solution;
    const a = qa / (scale * scale);
    const b = qb / scale - (2 * qa * mean) / (scale * scale);
    const c = qc - (qb * mean) / scale + (qa * mean * mean) / (scale * scale);
    const predict = (rawCode) => a * rawCode * rawCode + b * rawCode + c;
    return { model: "quadratic", coefficients: { a, b, c }, ...metrics(points, predict) };
  }

  function predict(fit, rawCode) {
    if (fit.model === "quadratic") {
      return fit.coefficients.a * rawCode * rawCode + fit.coefficients.b * rawCode + fit.coefficients.c;
    }
    return fit.coefficients.a * rawCode + fit.coefficients.b;
  }

  root.ThermalEqCalibration = { fitLinear, fitQuadratic, predict };
}(typeof globalThis === "undefined" ? window : globalThis));
