(function attachBirdcageCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BirdcageCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createCore() {
  "use strict";

  const MU0 = 4e-7 * Math.PI;
  const LEG_COUNT = 8;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function mean(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function rms(values, removeMean) {
    if (!values.length) return 0;
    const offset = removeMean ? mean(values) : 0;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - offset) ** 2, 0) / values.length);
  }

  function wrapDegrees(value) {
    let wrapped = ((value + 180) % 360 + 360) % 360 - 180;
    if (wrapped === -180) wrapped = 180;
    return wrapped;
  }

  function hexToRgb(hex) {
    const normalized = String(hex || "").replace("#", "").trim();
    const expanded = normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;
    if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(expanded.slice(0, 2), 16),
      g: parseInt(expanded.slice(2, 4), 16),
      b: parseInt(expanded.slice(4, 6), 16),
    };
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function rgbToHsv(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    if (delta > 1e-9) {
      if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
      else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
      else h = 60 * ((rn - gn) / delta + 4);
    }
    if (h < 0) h += 360;
    return { h, s: max === 0 ? 0 : delta / max, v: max };
  }

  function hueDistance(a, b) {
    const delta = Math.abs(a - b) % 360;
    return Math.min(delta, 360 - delta);
  }

  function currentUnitToAmp(value, unit) {
    if (unit === "A") return value;
    if (unit === "nA") return value * 1e-9;
    if (unit === "uA") return value * 1e-6;
    return value * 1e-3;
  }

  function timeUnitToSeconds(value, unit) {
    if (unit === "ms") return value * 1e-3;
    if (unit === "us") return value * 1e-6;
    return value * 1e-9;
  }

  function legPositions(radiusM) {
    return Array.from({ length: LEG_COUNT }, (_, index) => {
      const theta = (index * Math.PI * 2) / LEG_COUNT;
      return {
        index,
        theta,
        x: radiusM * Math.cos(theta),
        y: radiusM * Math.sin(theta),
      };
    });
  }

  function finiteWireFieldAtPoint(currentsA, geometry, point) {
    const radiusM = geometry.radiusM;
    const halfLength = geometry.lengthM / 2;
    const minimumDistance = Math.max(radiusM * 0.015, 1e-6);
    const positions = legPositions(radiusM);
    const contributions = positions.map((wire, index) => {
      const dx = point.xM - wire.x;
      const dy = point.yM - wire.y;
      const rho2 = Math.max(dx * dx + dy * dy, minimumDistance * minimumDistance);
      const finiteCorrection = halfLength / Math.sqrt(rho2 + halfLength * halfLength);
      const coefficient = (MU0 * (currentsA[index] || 0) * finiteCorrection) / (2 * Math.PI * rho2);
      return {
        bx: -dy * coefficient,
        by: dx * coefficient,
        magnitude: Math.abs(coefficient) * Math.sqrt(rho2),
      };
    });
    const bx = contributions.reduce((sum, item) => sum + item.bx, 0);
    const by = contributions.reduce((sum, item) => sum + item.by, 0);
    return { bx, by, magnitude: Math.hypot(bx, by), contributions };
  }

  function buildFieldSeries(data, geometry, point) {
    const bx = [];
    const by = [];
    const magnitude = [];
    for (let sample = 0; sample < data.times.length; sample += 1) {
      const currentsA = data.currents.map((trace) => currentUnitToAmp(trace[sample] || 0, data.currentUnit));
      const field = finiteWireFieldAtPoint(currentsA, geometry, point);
      bx.push(field.bx);
      by.push(field.by);
      magnitude.push(field.magnitude);
    }
    return { bx, by, magnitude };
  }

  function phasorAtFrequency(values, timesSeconds, frequencyHz) {
    const dc = mean(values);
    const t0 = timesSeconds[0] || 0;
    let re = 0;
    let im = 0;
    for (let index = 0; index < values.length; index += 1) {
      const angle = 2 * Math.PI * frequencyHz * (timesSeconds[index] - t0);
      const centered = values[index] - dc;
      re += centered * Math.cos(angle);
      im -= centered * Math.sin(angle);
    }
    const scale = values.length ? 2 / values.length : 0;
    return { re: re * scale, im: im * scale, magnitude: Math.hypot(re, im) * scale };
  }

  function estimateFundamentalFrequency(timesSeconds, xValues, yValues) {
    if (timesSeconds.length < 8) return 0;
    const duration = timesSeconds[timesSeconds.length - 1] - timesSeconds[0];
    if (!(duration > 0)) return 0;
    let best = { frequencyHz: 1 / duration, energy: -Infinity };
    for (let cycles = 0.5; cycles <= 15; cycles += 0.025) {
      const frequencyHz = cycles / duration;
      const x = phasorAtFrequency(xValues, timesSeconds, frequencyHz);
      const y = phasorAtFrequency(yValues, timesSeconds, frequencyHz);
      const energy = x.magnitude * x.magnitude + y.magnitude * y.magnitude;
      if (energy > best.energy) best = { frequencyHz, energy };
    }
    return best.frequencyHz;
  }

  function estimateFrequencyFromTraces(timesSeconds, traces) {
    if (timesSeconds.length < 8 || !traces.length) return 0;
    const duration = timesSeconds[timesSeconds.length - 1] - timesSeconds[0];
    if (!(duration > 0)) return 0;
    let best = { frequencyHz: 1 / duration, energy: -Infinity };
    for (let cycles = 0.5; cycles <= 15; cycles += 0.025) {
      const frequencyHz = cycles / duration;
      const energy = traces.reduce((sum, trace) => {
        const phasor = phasorAtFrequency(trace, timesSeconds, frequencyHz);
        return sum + phasor.magnitude * phasor.magnitude;
      }, 0);
      if (energy > best.energy) best = { frequencyHz, energy };
    }
    return best.frequencyHz;
  }

  function computePolarizationMetrics(data, fields) {
    const indices = data.times.map((_, index) => index);
    const timeSeconds = indices.map((index) => timeUnitToSeconds(data.times[index], data.timeUnit));
    const bxValues = indices.map((index) => fields.bx[index]);
    const byValues = indices.map((index) => fields.by[index]);
    const traceFrequencyHz = estimateFrequencyFromTraces(timeSeconds, data.currents || []);
    const frequencyHz = traceFrequencyHz || estimateFundamentalFrequency(timeSeconds, bxValues, byValues);
    const x = phasorAtFrequency(bxValues, timeSeconds, frequencyHz);
    const y = phasorAtFrequency(byValues, timeSeconds, frequencyHz);
    const x2 = x.re * x.re + x.im * x.im;
    const y2 = y.re * y.re + y.im * y.im;
    const s0 = x2 + y2;
    const s1 = x2 - y2;
    const s2 = 2 * (x.re * y.re + x.im * y.im);
    const discriminant = Math.min(s0, Math.sqrt(Math.max(0, s1 * s1 + s2 * s2)));
    const major2 = Math.max(0, (s0 + discriminant) / 2);
    const minor2 = Math.max(0, (s0 - discriminant) / 2);
    const axialRatioLinear = minor2 > 1e-30 ? Math.sqrt(major2 / minor2) : Infinity;
    const phaseX = Math.atan2(x.im, x.re) * 180 / Math.PI;
    const phaseY = Math.atan2(y.im, y.re) * 180 / Math.PI;
    const amplitudeRatio = y.magnitude > 1e-30 ? x.magnitude / y.magnitude : Infinity;
    return {
      bxRms: rms(bxValues, true),
      byRms: rms(byValues, true),
      amplitudeRatio,
      phaseDifferenceDeg: wrapDegrees(phaseY - phaseX),
      axialRatioLinear,
      axialRatioDb: Number.isFinite(axialRatioLinear) ? 20 * Math.log10(axialRatioLinear) : Infinity,
      frequencyHz,
      xPhasor: x,
      yPhasor: y,
      usedSamples: indices.length,
      totalSamples: data.times.length,
    };
  }

  function autoDetectPlotRect(imageData) {
    const { width, height, data } = imageData;
    const isDark = (x, y) => {
      const offset = (y * width + x) * 4;
      const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      return luminance < 92 && data[offset + 3] > 180;
    };
    const verticalScore = (x) => {
      let dark = 0;
      let count = 0;
      for (let y = Math.floor(height * 0.02); y < height * 0.99; y += 2) {
        if (isDark(x, y)) dark += 1;
        count += 1;
      }
      return dark / Math.max(1, count);
    };
    const horizontalScore = (y, left, right) => {
      let dark = 0;
      let count = 0;
      for (let x = left; x <= right; x += 2) {
        if (isDark(x, y)) dark += 1;
        count += 1;
      }
      return dark / Math.max(1, count);
    };
    const bestInRange = (start, end, scorer) => {
      let bestIndex = start;
      let bestScore = -1;
      for (let index = start; index <= end; index += 1) {
        const score = scorer(index);
        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      }
      return { index: bestIndex, score: bestScore };
    };

    const left = bestInRange(Math.floor(width * 0.025), Math.floor(width * 0.22), verticalScore);
    const right = bestInRange(Math.floor(width * 0.68), Math.floor(width * 0.98), verticalScore);
    const fallbackLeft = Math.round(width * 0.06);
    const fallbackRight = Math.round(width * 0.94);
    const resolvedLeft = left.score > 0.22 ? left.index : fallbackLeft;
    const resolvedRight = right.score > 0.22 ? right.index : fallbackRight;
    const top = bestInRange(
      Math.floor(height * 0.015),
      Math.floor(height * 0.22),
      (y) => horizontalScore(y, resolvedLeft, resolvedRight),
    );
    const bottom = bestInRange(
      Math.floor(height * 0.72),
      Math.floor(height * 0.99),
      (y) => horizontalScore(y, resolvedLeft, resolvedRight),
    );
    const resolvedTop = top.score > 0.22 ? top.index : Math.round(height * 0.055);
    const resolvedBottom = bottom.score > 0.22 ? bottom.index : Math.round(height * 0.95);
    if (resolvedRight - resolvedLeft < width * 0.4 || resolvedBottom - resolvedTop < height * 0.4) {
      return { left: fallbackLeft, top: Math.round(height * 0.055), right: fallbackRight, bottom: Math.round(height * 0.95) };
    }
    return { left: resolvedLeft, top: resolvedTop, right: resolvedRight, bottom: resolvedBottom };
  }

  function interpolateTrace(values) {
    const output = values.slice();
    const known = [];
    output.forEach((value, index) => {
      if (Number.isFinite(value)) known.push(index);
    });
    if (!known.length) return output.map(() => 0);
    for (let index = 0; index < known[0]; index += 1) output[index] = output[known[0]];
    for (let group = 0; group < known.length - 1; group += 1) {
      const start = known[group];
      const end = known[group + 1];
      for (let index = start + 1; index < end; index += 1) {
        const amount = (index - start) / (end - start);
        output[index] = output[start] * (1 - amount) + output[end] * amount;
      }
    }
    for (let index = known[known.length - 1] + 1; index < output.length; index += 1) {
      output[index] = output[known[known.length - 1]];
    }
    return output;
  }

  function solveLinear3(matrix, vector) {
    const augmented = matrix.map((row, index) => row.concat(vector[index]));
    for (let pivot = 0; pivot < 3; pivot += 1) {
      let best = pivot;
      for (let row = pivot + 1; row < 3; row += 1) {
        if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
      }
      if (Math.abs(augmented[best][pivot]) < 1e-12) return null;
      [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
      const divisor = augmented[pivot][pivot];
      for (let column = pivot; column < 4; column += 1) augmented[pivot][column] /= divisor;
      for (let row = 0; row < 3; row += 1) {
        if (row === pivot) continue;
        const factor = augmented[row][pivot];
        for (let column = pivot; column < 4; column += 1) {
          augmented[row][column] -= factor * augmented[pivot][column];
        }
      }
    }
    return augmented.map((row) => row[3]);
  }

  function fitSingleHarmonic(values, validMask) {
    const valid = [];
    values.forEach((value, index) => {
      if (validMask[index] && Number.isFinite(value)) valid.push({ index, value });
    });
    if (valid.length < Math.max(24, values.length * 0.18)) return null;
    const average = mean(valid.map((item) => item.value));
    const totalVariance = valid.reduce((sum, item) => sum + (item.value - average) ** 2, 0);
    if (totalVariance < 1e-8) return null;
    let best = null;
    const denominator = Math.max(1, values.length - 1);
    for (let cycles = 0.5; cycles <= 15; cycles += 0.025) {
      let n = 0;
      let sumC = 0;
      let sumS = 0;
      let sumCC = 0;
      let sumSS = 0;
      let sumCS = 0;
      let sumY = 0;
      let sumYC = 0;
      let sumYS = 0;
      valid.forEach((item) => {
        const angle = 2 * Math.PI * cycles * item.index / denominator;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        n += 1;
        sumC += c;
        sumS += s;
        sumCC += c * c;
        sumSS += s * s;
        sumCS += c * s;
        sumY += item.value;
        sumYC += item.value * c;
        sumYS += item.value * s;
      });
      const coefficients = solveLinear3(
        [[n, sumC, sumS], [sumC, sumCC, sumCS], [sumS, sumCS, sumSS]],
        [sumY, sumYC, sumYS],
      );
      if (!coefficients) continue;
      const [offset, cosine, sine] = coefficients;
      const error = valid.reduce((sum, item) => {
        const angle = 2 * Math.PI * cycles * item.index / denominator;
        const predicted = offset + cosine * Math.cos(angle) + sine * Math.sin(angle);
        return sum + (item.value - predicted) ** 2;
      }, 0);
      if (!best || error < best.error) best = { cycles, offset, cosine, sine, error };
    }
    if (!best) return null;
    const rSquared = 1 - best.error / totalVariance;
    return {
      ...best,
      rSquared,
      predict(index) {
        const angle = 2 * Math.PI * best.cycles * index / Math.max(1, values.length - 1);
        return best.offset + best.cosine * Math.cos(angle) + best.sine * Math.sin(angle);
      },
    };
  }

  function clusterRows(rows) {
    if (!rows.length) return [];
    rows.sort((a, b) => a - b);
    const clusters = [];
    let current = [rows[0]];
    for (let index = 1; index < rows.length; index += 1) {
      if (rows[index] - rows[index - 1] <= 2) current.push(rows[index]);
      else {
        clusters.push(current);
        current = [rows[index]];
      }
    }
    clusters.push(current);
    return clusters.map((cluster) => ({
      y: cluster[Math.floor(cluster.length / 2)],
      size: cluster.length,
    }));
  }

  function trackTrace(candidates, plotHeight) {
    const tracked = Array(candidates.length).fill(NaN);
    const maxJump = Math.max(7, plotHeight * 0.018);
    let lastIndex = -1;
    let previousIndex = -1;
    for (let index = 0; index < candidates.length; index += 1) {
      const options = candidates[index];
      if (!options.length) continue;
      if (lastIndex < 0) {
        tracked[index] = options.reduce((best, candidate) => candidate.size > best.size ? candidate : best).y;
        lastIndex = index;
        continue;
      }
      let slope = 0;
      if (previousIndex >= 0) {
        slope = (tracked[lastIndex] - tracked[previousIndex]) / Math.max(1, lastIndex - previousIndex);
        slope = clamp(slope, -maxJump * 0.7, maxJump * 0.7);
      }
      const gap = index - lastIndex;
      const predicted = tracked[lastIndex] + slope * gap;
      const chosen = options.reduce((best, candidate) => {
        const distance = Math.abs(candidate.y - predicted);
        const score = distance - Math.min(candidate.size, 4) * 0.08;
        return !best || score < best.score ? { ...candidate, score, distance } : best;
      }, null);
      const allowed = maxJump * Math.min(2.2, 1 + Math.max(0, gap - 1) * 0.28);
      if (chosen.distance <= allowed) {
        tracked[index] = chosen.y;
        previousIndex = lastIndex;
        lastIndex = index;
      }
    }

    // ANSYS legends contain long, perfectly horizontal color swatches.  A real
    // sinusoidal trace can flatten briefly at a peak, but not for this many
    // consecutive source columns.  Remove such swatches before interpolation.
    let start = 0;
    while (start < tracked.length) {
      if (!Number.isFinite(tracked[start])) {
        start += 1;
        continue;
      }
      let end = start + 1;
      let minimum = tracked[start];
      let maximum = tracked[start];
      while (end < tracked.length && Number.isFinite(tracked[end])) {
        minimum = Math.min(minimum, tracked[end]);
        maximum = Math.max(maximum, tracked[end]);
        if (maximum - minimum > 0.75) break;
        end += 1;
      }
      if (end - start >= 11) {
        for (let index = start; index < end; index += 1) tracked[index] = NaN;
      }
      start = Math.max(end, start + 1);
    }
    return tracked;
  }

  function extractColorTraces(imageData, plotRect, colors, toleranceDeg) {
    const { width, data } = imageData;
    const left = clamp(Math.round(plotRect.left), 0, imageData.width - 1);
    const right = clamp(Math.round(plotRect.right), left + 1, imageData.width - 1);
    const top = clamp(Math.round(plotRect.top), 0, imageData.height - 1);
    const bottom = clamp(Math.round(plotRect.bottom), top + 1, imageData.height - 1);
    const targets = colors.map((color) => rgbToHsv(...Object.values(hexToRgb(color))));
    const candidates = colors.map(() => []);

    for (let x = left; x <= right; x += 1) {
      const matches = colors.map(() => []);
      for (let y = top; y <= bottom; y += 1) {
        const offset = (y * width + x) * 4;
        const hsv = rgbToHsv(data[offset], data[offset + 1], data[offset + 2]);
        if (hsv.s < 0.34 || hsv.v < 0.24) continue;
        let best = null;
        targets.forEach((target, traceIndex) => {
          const dynamicTolerance = toleranceDeg + (1 - hsv.s) * 8;
          const hue = hueDistance(hsv.h, target.h);
          const saturation = Math.abs(hsv.s - target.s);
          if (hue > dynamicTolerance || saturation > 0.62) return;
          const score = hue / dynamicTolerance + saturation * 0.35 + Math.abs(hsv.v - target.v) * 0.18;
          if (!best || score < best.score) best = { traceIndex, score };
        });
        if (best) matches[best.traceIndex].push(y);
      }
      matches.forEach((ys, traceIndex) => {
        candidates[traceIndex].push(clusterRows(ys));
      });
    }
    const sampleCount = right - left + 1;
    const tracked = candidates.map((traceCandidates) => trackTrace(traceCandidates, bottom - top));
    const detectedMask = tracked.map((trace) => trace.map(Number.isFinite));
    const fits = tracked.map((trace, traceIndex) => fitSingleHarmonic(trace, detectedMask[traceIndex]));
    const yPixels = tracked.map((trace, traceIndex) => {
      const fit = fits[traceIndex];
      if (fit && fit.rSquared >= 0.72) {
        return trace.map((value, index) => Number.isFinite(value) ? value : fit.predict(index));
      }
      return interpolateTrace(trace);
    });
    return {
      xPixels: Array.from({ length: sampleCount }, (_, index) => left + index),
      yPixels,
      detectedMask,
      coverage: detectedMask.map((mask) => mask.filter(Boolean).length / sampleCount),
      fitQuality: fits.map((fit) => fit ? fit.rSquared : null),
      fitCycles: fits.map((fit) => fit ? fit.cycles : null),
      rect: { left, right, top, bottom },
    };
  }

  function downsampleSeries(times, currents, confidence, maxSamples) {
    if (times.length <= maxSamples) return { times, currents, confidence };
    const sampledTimes = [];
    const sampledCurrents = currents.map(() => []);
    const sampledConfidence = [];
    for (let sample = 0; sample < maxSamples; sample += 1) {
      const index = Math.round((sample / (maxSamples - 1)) * (times.length - 1));
      sampledTimes.push(times[index]);
      currents.forEach((trace, traceIndex) => sampledCurrents[traceIndex].push(trace[index]));
      sampledConfidence.push(confidence[index]);
    }
    return { times: sampledTimes, currents: sampledCurrents, confidence: sampledConfidence };
  }

  function pixelsToEngineeringData(extracted, axes, units, enabled, polarity) {
    const rectWidth = Math.max(1, extracted.rect.right - extracted.rect.left);
    const rectHeight = Math.max(1, extracted.rect.bottom - extracted.rect.top);
    const times = extracted.xPixels.map((x) => axes.xMin + ((x - extracted.rect.left) / rectWidth) * (axes.xMax - axes.xMin));
    const currents = extracted.yPixels.map((trace, index) => trace.map((y) => {
      if (enabled && !enabled[index]) return 0;
      const sign = polarity && polarity[index] === -1 ? -1 : 1;
      return sign * (axes.yMax - ((y - extracted.rect.top) / rectHeight) * (axes.yMax - axes.yMin));
    }));
    const enabledCount = enabled ? enabled.filter(Boolean).length : extracted.yPixels.length;
    const confidence = extracted.xPixels.map((_, sample) => {
      if (!extracted.detectedMask || !enabledCount) return 1;
      let detected = 0;
      extracted.detectedMask.forEach((mask, traceIndex) => {
        if (!enabled || enabled[traceIndex]) detected += mask[sample] ? 1 : 0;
      });
      return detected / enabledCount;
    });
    const reduced = downsampleSeries(times, currents, confidence, 900);
    return {
      times: reduced.times,
      currents: reduced.currents,
      timeUnit: units.timeUnit,
      currentUnit: units.currentUnit,
      coverage: extracted.coverage,
      fitQuality: extracted.fitQuality,
      fitCycles: extracted.fitCycles,
      sampleConfidence: reduced.confidence,
    };
  }

  function generateDemoData(mode) {
    const count = 720;
    const times = Array.from({ length: count }, (_, index) => 200 + (50 * index) / (count - 1));
    const frequencyHz = 99.3e6;
    const amplitude = mode === "x-strong" ? 175 : 155;
    const xScale = mode === "x-strong" ? 1.52 : 1;
    const currents = Array.from({ length: LEG_COUNT }, (_, leg) => {
      const theta = (leg * Math.PI * 2) / LEG_COUNT;
      return times.map((timeNs) => {
        const omegaT = 2 * Math.PI * frequencyHz * timeNs * 1e-9;
        const base = Math.cos(omegaT) * Math.cos(theta) - xScale * Math.sin(omegaT) * Math.sin(theta);
        const mildAmplitudeError = mode === "x-strong" ? 1 + 0.035 * Math.cos(2 * theta + 0.25) : 1;
        return amplitude * mildAmplitudeError * base;
      });
    });
    return {
      times,
      currents,
      timeUnit: "ns",
      currentUnit: "mA",
      coverage: Array(LEG_COUNT).fill(1),
      source: mode === "x-strong" ? "synthetic-x-strong" : "synthetic-circular",
    };
  }

  return {
    LEG_COUNT,
    MU0,
    autoDetectPlotRect,
    buildFieldSeries,
    clamp,
    computePolarizationMetrics,
    currentUnitToAmp,
    extractColorTraces,
    finiteWireFieldAtPoint,
    generateDemoData,
    hexToRgb,
    pixelsToEngineeringData,
    rgbToHex,
    rgbToHsv,
    timeUnitToSeconds,
    wrapDegrees,
  };
});
