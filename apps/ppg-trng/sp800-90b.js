/*
 * Browser-side SP 800-90B-aligned diagnostics for a binary bit stream.
 * This intentionally reports a screening subset, not a validation certificate.
 * Official validation should be reproduced with NIST's EntropyAssessment tool.
 */
(function attachSp80090b(global) {
  const ALPHA = 2 ** -20;
  const CONFIDENCE_Z = 2.576;
  const REQUIRED_SAMPLES = 1000000;

  function normalizeBits(value) {
    if (value instanceof Uint8Array) return value;
    return Uint8Array.from(value || [], (bit) => (bit ? 1 : 0));
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function entropyFromProbability(probability) {
    if (!Number.isFinite(probability) || probability >= 1) return 0;
    if (probability <= 0) return 1;
    return Math.min(1, Math.max(0, -Math.log2(probability)));
  }

  function tupleEntropyFromProbability(probability, tupleLength) {
    if (!Number.isFinite(probability) || probability >= 1) return 0;
    if (probability <= 0 || !tupleLength) return 1;
    return Math.min(1, Math.max(0, -Math.log2(probability) / tupleLength));
  }

  function upperProbability(proportion, count) {
    if (count <= 1) return 1;
    const variance = Math.max(0, proportion * (1 - proportion) / (count - 1));
    return Math.min(1, proportion + CONFIDENCE_Z * Math.sqrt(variance));
  }

  function mostCommonValue(bits) {
    let ones = 0;
    for (const bit of bits) ones += bit;
    const zeros = bits.length - ones;
    const proportion = Math.max(ones, zeros) / bits.length;
    const probability = upperProbability(proportion, bits.length);
    return {
      id: "mcv",
      name: "Most Common Value",
      entropy: entropyFromProbability(probability),
      probability,
      statistic: `p_hat=${proportion.toFixed(6)}`,
      detail: `p_upper=${probability.toFixed(6)} | n=${bits.length}`,
      status: bits.length >= 1000 ? "available" : "short",
    };
  }

  function transitionCounts(bits, lag = 1) {
    const counts = [[0, 0], [0, 0]];
    for (let index = lag; index < bits.length; index += 1) {
      counts[bits[index - lag]][bits[index]] += 1;
    }
    return counts;
  }

  function markovEstimate(bits, chainLength = 128) {
    const counts = transitionCounts(bits, 1);
    const initial = [0, 0];
    for (const bit of bits) initial[bit] += 1;
    const total = Math.max(1, bits.length);
    const transitions = counts.map((row) => {
      const rowTotal = row[0] + row[1];
      return rowTotal ? row.map((value) => value / rowTotal) : [0.5, 0.5];
    });
    let logProbability = [
      initial[0] ? Math.log(initial[0] / total) : Number.NEGATIVE_INFINITY,
      initial[1] ? Math.log(initial[1] / total) : Number.NEGATIVE_INFINITY,
    ];
    for (let step = 1; step < chainLength; step += 1) {
      const next = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
      for (let target = 0; target < 2; target += 1) {
        for (let previous = 0; previous < 2; previous += 1) {
          const transition = transitions[previous][target];
          if (transition <= 0 || !Number.isFinite(logProbability[previous])) continue;
          next[target] = Math.max(next[target], logProbability[previous] + Math.log(transition));
        }
      }
      logProbability = next;
    }
    const maxLogProbability = Math.max(...logProbability);
    const entropy = Number.isFinite(maxLogProbability)
      ? Math.min(1, Math.max(0, -maxLogProbability / Math.log(2) / chainLength))
      : 0;
    return {
      id: "markov",
      name: "Markov (128-chain)",
      entropy,
      probability: Number.isFinite(maxLogProbability) ? Math.exp(maxLogProbability) : 1,
      statistic: `P00=${transitions[0][0].toFixed(4)} P01=${transitions[0][1].toFixed(4)} P10=${transitions[1][0].toFixed(4)} P11=${transitions[1][1].toFixed(4)}`,
      detail: `max chain probability over d=${chainLength}`,
      status: bits.length >= 1000 ? "available" : "short",
    };
  }

  function tTupleEstimate(bits, maximumK = 12) {
    const estimates = [];
    const limit = Math.min(maximumK, 20, Math.max(2, Math.floor(Math.log2(Math.max(4, bits.length))) - 2));
    for (let length = 2; length <= limit; length += 1) {
      const mask = (2 ** length) - 1;
      let pattern = 0;
      for (let index = 0; index < length; index += 1) pattern = (pattern << 1) | bits[index];
      const counts = new Map();
      counts.set(pattern, 1);
      let maximum = 1;
      const tupleCount = bits.length - length + 1;
      for (let index = length; index < bits.length; index += 1) {
        pattern = ((pattern << 1) | bits[index]) & mask;
        const count = (counts.get(pattern) || 0) + 1;
        counts.set(pattern, count);
        if (count > maximum) maximum = count;
      }
      const proportion = maximum / Math.max(1, tupleCount);
      const probability = upperProbability(proportion, tupleCount);
      estimates.push({
        length,
        entropy: tupleEntropyFromProbability(probability, length),
        probability,
        maximum,
      });
    }
    const selected = estimates.reduce((best, entry) => (!best || entry.entropy < best.entropy ? entry : best), null);
    return {
      id: "t-tuple",
      name: "t-Tuple (screening subset)",
      entropy: selected?.entropy ?? 0,
      probability: selected?.probability ?? 1,
      statistic: selected ? `k=${selected.length} max=${selected.maximum}` : "insufficient data",
      detail: `evaluated k=2..${limit}; browser subset of the 90B estimator`,
      status: selected ? "available" : "short",
      selectedLength: selected?.length || null,
    };
  }

  function lagPrediction(bits, maximumLag = 32) {
    let best = null;
    const limit = Math.min(maximumLag, Math.max(1, bits.length - 1));
    for (let lag = 1; lag <= limit; lag += 1) {
      const counts = transitionCounts(bits, lag);
      const samples = bits.length - lag;
      const correct = Math.max(...counts[0]) + Math.max(...counts[1]);
      const accuracy = correct / Math.max(1, samples);
      const entropy = entropyFromProbability(Math.max(0.5, accuracy));
      if (!best || entropy < best.entropy) best = { lag, accuracy, entropy, counts };
    }
    return {
      id: "lag",
      name: "Lag prediction (supplemental)",
      entropy: best?.entropy ?? 0,
      probability: best ? Math.max(0.5, best.accuracy) : 1,
      statistic: best ? `lag=${best.lag} accuracy=${best.accuracy.toFixed(6)}` : "insufficient data",
      detail: "predictor diagnostic; not included in the formal 90B subset minimum",
      status: best ? "available" : "short",
    };
  }

  function chiSquare2x2(counts) {
    const rowTotals = [counts[0][0] + counts[0][1], counts[1][0] + counts[1][1]];
    const columnTotals = [counts[0][0] + counts[1][0], counts[0][1] + counts[1][1]];
    const total = rowTotals[0] + rowTotals[1];
    if (!total) return 0;
    let statistic = 0;
    for (let row = 0; row < 2; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        const expected = rowTotals[row] * columnTotals[column] / total;
        if (expected > 0) statistic += ((counts[row][column] - expected) ** 2) / expected;
      }
    }
    return statistic;
  }

  function maxAutocorrelation(bits, maximumLag = 32) {
    const mean = bits.reduce((sum, bit) => sum + bit, 0) / Math.max(1, bits.length);
    let variance = 0;
    for (const bit of bits) variance += (bit - mean) ** 2;
    if (variance <= 0) return 1;
    let maximum = 0;
    for (let lag = 1; lag <= Math.min(maximumLag, bits.length - 1); lag += 1) {
      let covariance = 0;
      for (let index = lag; index < bits.length; index += 1) {
        covariance += (bits[index] - mean) * (bits[index - lag] - mean);
      }
      maximum = Math.max(maximum, Math.abs(covariance / variance));
    }
    return maximum;
  }

  function iidScreen(bits) {
    const transitions = transitionCounts(bits, 1);
    const transitionChi = chiSquare2x2(transitions);
    const blockCount = Math.min(10, Math.max(2, Math.floor(bits.length / 1000)));
    const blockSize = Math.floor(bits.length / blockCount);
    const overall = bits.reduce((sum, bit) => sum + bit, 0) / Math.max(1, bits.length);
    let blockChi = 0;
    for (let block = 0; block < blockCount; block += 1) {
      let ones = 0;
      for (let index = block * blockSize; index < (block + 1) * blockSize; index += 1) ones += bits[index];
      const expected = blockSize * overall;
      if (expected > 0) blockChi += ((ones - expected) ** 2) / expected;
      const zeroExpected = blockSize * (1 - overall);
      if (zeroExpected > 0) blockChi += ((blockSize - ones - zeroExpected) ** 2) / zeroExpected;
    }
    const maxCorrelation = maxAutocorrelation(bits);
    const transitionPass = transitionChi <= 10.828;
    const stabilityPass = blockChi <= 27.877;
    return {
      transitionChi,
      blockChi,
      blockCount,
      maxCorrelation,
      transitionPass,
      stabilityPass,
      screening: transitionPass && stabilityPass ? "no immediate concern" : "dependency or instability detected",
      detail: "90B IID screening aid; formal IID determination requires the specified permutation tests",
    };
  }

  function maxRun(bits) {
    let maximum = 0;
    let current = 0;
    let previous = null;
    for (const bit of bits) {
      current = bit === previous ? current + 1 : 1;
      maximum = Math.max(maximum, current);
      previous = bit;
    }
    return maximum;
  }

  function binomialTailCutoff(probability, window, alpha) {
    const p = Math.min(1 - 1e-12, Math.max(1e-12, probability));
    const pmf = new Float64Array(window + 1);
    // Starting at k=0 underflows when p is close to one. Build the PMF from
    // its mode so the APT cutoff remains usable for biased sources.
    const mode = Math.min(window, Math.max(0, Math.floor((window + 1) * p)));
    const logCombination = (n, k) => {
      let value = 0;
      for (let index = 1; index <= k; index += 1) value += Math.log((n - k + index) / index);
      return value;
    };
    const modeLogPmf = logCombination(window, mode)
      + mode * Math.log(p)
      + (window - mode) * Math.log1p(-p);
    pmf[mode] = Math.exp(modeLogPmf);
    for (let index = mode - 1; index >= 0; index -= 1) {
      pmf[index] = pmf[index + 1] * ((index + 1) / (window - index)) * ((1 - p) / p);
    }
    for (let index = mode + 1; index <= window; index += 1) {
      pmf[index] = pmf[index - 1] * ((window - index + 1) / index) * (p / (1 - p));
    }
    let tail = 0;
    let cutoff = window;
    for (let index = window; index >= 0; index -= 1) {
      tail += pmf[index];
      if (tail <= alpha) cutoff = index;
      else break;
    }
    return cutoff;
  }

  function healthTests(bits, assessedEntropy) {
    const entropy = Math.max(1e-6, assessedEntropy);
    const rctCutoff = 1 + Math.ceil(-Math.log2(ALPHA) / entropy);
    const rctMaximum = maxRun(bits);
    const aptWindow = 1024;
    const pMax = 2 ** (-entropy);
    const aptCutoff = binomialTailCutoff(pMax, aptWindow, ALPHA);
    let aptMaximum = 0;
    let aptFailures = 0;
    for (let start = 0; start + aptWindow <= bits.length; start += aptWindow) {
      let ones = 0;
      for (let index = start; index < start + aptWindow; index += 1) ones += bits[index];
      const maximum = Math.max(ones, aptWindow - ones);
      aptMaximum = Math.max(aptMaximum, maximum);
      if (maximum >= aptCutoff) aptFailures += 1;
    }
    return {
      alpha: ALPHA,
      repetitionCount: {
        cutoff: rctCutoff,
        maximumRun: rctMaximum,
        failures: rctMaximum >= rctCutoff ? 1 : 0,
        pass: rctMaximum < rctCutoff,
      },
      adaptiveProportion: {
        window: aptWindow,
        cutoff: aptCutoff,
        maximumCount: aptMaximum,
        failures: aptFailures,
        windows: Math.floor(bits.length / aptWindow),
        pass: aptFailures === 0,
      },
      detail: "Binary RCT/APT screening using alpha=2^-20 and the assessed entropy",
    };
  }

  function run(value, options = {}) {
    const bits = normalizeBits(value);
    if (bits.length < 1024) throw new Error("SP 800-90B diagnostics need at least 1024 binary samples");
    const tupleK = Math.floor(clamp(options.tupleK, 2, 16, 12));
    const mcv = mostCommonValue(bits);
    const markov = markovEstimate(bits, 128);
    const tuple = tTupleEstimate(bits, tupleK);
    const lag = lagPrediction(bits, 32);
    const iid = iidScreen(bits);
    const officialSubset = [mcv, markov, tuple].filter((estimate) => estimate.status === "available");
    const conservativeSubsetEntropy = officialSubset.reduce((minimum, estimate) => Math.min(minimum, estimate.entropy), 1);
    const health = healthTests(bits, conservativeSubsetEntropy);
    return {
      n: bits.length,
      symbolBits: 1,
      requiredSamples: REQUIRED_SAMPLES,
      dataStatus: bits.length >= REQUIRED_SAMPLES ? "candidate-1m" : "exploratory-short",
      iid,
      estimates: [mcv, markov, tuple, lag],
      officialSubsetEntropy: conservativeSubsetEntropy,
      health,
      coverage: "MCV, Markov, t-tuple subset, RCT/APT, and IID screening aid; official NIST implementation remains required for conformance",
      warnings: [
        bits.length < REQUIRED_SAMPLES ? "Fewer than 1,000,000 sequential samples: exploratory result only." : "Input length meets the 1,000,000-sample candidate threshold; collection metadata and raw-source proof are still required.",
        "The current web input is a binary bit stream. SP 800-90B validation should use raw noise-source samples before conditioning.",
        "The IID screening aid does not replace the specified 90B permutation tests or restart testing.",
      ],
    };
  }

  global.YmPpg90b = { ALPHA, REQUIRED_SAMPLES, run };
})(typeof self !== "undefined" ? self : window);
