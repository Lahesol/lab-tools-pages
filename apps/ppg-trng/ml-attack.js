/*
 * Lightweight, dependency-free next-bit prediction analysis.
 * This is a diagnostic for predictability of a retained bit stream, not a
 * cryptographic break. The split is chronological to avoid adjacent-sample
 * leakage between training and test sets.
 */
(function attachMlAttack(global) {
  const EPSILON = 1e-7;

  function normalizeBits(value) {
    if (value instanceof Uint8Array) return value;
    return Uint8Array.from(value || [], (bit) => (bit ? 1 : 0));
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function clampProbability(value) {
    return Math.min(1 - EPSILON, Math.max(EPSILON, value));
  }

  function ratioText(value) {
    return Number.isFinite(value) ? value.toFixed(6) : "--";
  }

  function evaluateProbabilities(name, probabilities, bits, start, baselineAccuracy) {
    const count = Math.max(0, bits.length - start);
    if (!count) return null;

    let correct = 0;
    let truePositive = 0;
    let trueNegative = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    let logLoss = 0;
    let brier = 0;
    for (let index = start; index < bits.length; index += 1) {
      const actual = bits[index] ? 1 : 0;
      const probability = clampProbability(probabilities[index - start]);
      const predicted = probability >= 0.5 ? 1 : 0;
      if (predicted === actual) correct += 1;
      if (predicted === 1 && actual === 1) truePositive += 1;
      if (predicted === 0 && actual === 0) trueNegative += 1;
      if (predicted === 1 && actual === 0) falsePositive += 1;
      if (predicted === 0 && actual === 1) falseNegative += 1;
      logLoss += actual ? -Math.log2(probability) : -Math.log2(1 - probability);
      brier += (probability - actual) ** 2;
    }

    const positives = truePositive + falseNegative;
    const negatives = trueNegative + falsePositive;
    const sensitivity = positives ? truePositive / positives : null;
    const specificity = negatives ? trueNegative / negatives : null;
    const balancedAccuracy = sensitivity !== null && specificity !== null
      ? (sensitivity + specificity) / 2
      : null;
    const accuracy = correct / count;
    return {
      name,
      samples: count,
      accuracy,
      accuracyText: ratioText(accuracy),
      balancedAccuracy,
      balancedAccuracyText: ratioText(balancedAccuracy),
      logLossBits: logLoss / count,
      brier: brier / count,
      advantage: accuracy - baselineAccuracy,
      advantageText: `${accuracy - baselineAccuracy >= 0 ? "+" : ""}${(accuracy - baselineAccuracy).toFixed(6)}`,
      confusion: { truePositive, trueNegative, falsePositive, falseNegative },
    };
  }

  function majorityModel(bits, trainEnd, testStart, baselineAccuracy) {
    let ones = 0;
    for (let index = 0; index < trainEnd; index += 1) ones += bits[index];
    const trainRatio = trainEnd ? ones / trainEnd : 0.5;
    const probabilities = new Float64Array(bits.length - testStart);
    probabilities.fill(trainRatio);
    return {
      result: evaluateProbabilities("Majority baseline", probabilities, bits, testStart, baselineAccuracy),
      trainOneRatio: trainRatio,
    };
  }

  function markovModel(bits, trainEnd, testStart, baselineAccuracy) {
    const counts = [[1, 1], [1, 1]];
    for (let index = 1; index < trainEnd; index += 1) {
      counts[bits[index - 1]][bits[index]] += 1;
    }
    const probabilities = new Float64Array(bits.length - testStart);
    for (let index = testStart; index < bits.length; index += 1) {
      const previous = bits[index - 1];
      const row = counts[previous];
      probabilities[index - testStart] = row[1] / (row[0] + row[1]);
    }
    return evaluateProbabilities("1st-order Markov", probabilities, bits, testStart, baselineAccuracy);
  }

  function sigmoid(value) {
    if (value >= 0) {
      const exp = Math.exp(-value);
      return 1 / (1 + exp);
    }
    const exp = Math.exp(value);
    return exp / (1 + exp);
  }

  function logisticModel(bits, trainEnd, testStart, lag, maxTrainSamples, epochs, learningRate, l2, baselineAccuracy) {
    const featureCount = lag + 1;
    const weights = new Float64Array(featureCount);
    const available = Math.max(0, trainEnd - lag);
    const step = Math.max(1, Math.ceil(available / maxTrainSamples));
    const sampleCount = Math.ceil(available / step);

    let trainRatio = 0.5;
    for (let index = 0; index < trainEnd; index += 1) trainRatio += bits[index] ? 1 : 0;
    trainRatio = trainEnd ? (trainRatio - 0.5) / trainEnd : 0.5;
    weights[0] = Math.log(clampProbability(trainRatio) / (1 - clampProbability(trainRatio)));

    for (let epoch = 0; epoch < epochs; epoch += 1) {
      const gradients = new Float64Array(featureCount);
      for (let target = lag; target < trainEnd; target += step) {
        let score = weights[0];
        for (let offset = 0; offset < lag; offset += 1) {
          score += weights[offset + 1] * bits[target - lag + offset];
        }
        const probability = sigmoid(score);
        const error = probability - bits[target];
        gradients[0] += error;
        for (let offset = 0; offset < lag; offset += 1) {
          gradients[offset + 1] += error * bits[target - lag + offset];
        }
      }
      const scale = 1 / Math.max(1, sampleCount);
      weights[0] -= learningRate * gradients[0] * scale;
      for (let offset = 1; offset < featureCount; offset += 1) {
        weights[offset] -= learningRate * (gradients[offset] * scale + l2 * weights[offset]);
      }
    }

    const probabilities = new Float64Array(bits.length - testStart);
    for (let target = testStart; target < bits.length; target += 1) {
      let score = weights[0];
      for (let offset = 0; offset < lag; offset += 1) {
        score += weights[offset + 1] * bits[target - lag + offset];
      }
      probabilities[target - testStart] = sigmoid(score);
    }
    const result = evaluateProbabilities("Logistic regression attack", probabilities, bits, testStart, baselineAccuracy);
    result.features = `previous ${lag} bits`;
    result.epochs = epochs;
    result.trainingSamples = sampleCount;
    return result;
  }

  function conditionalEntropyMarkov(bits, trainEnd) {
    if (trainEnd < 2) return null;
    const counts = [[1, 1], [1, 1]];
    for (let index = 1; index < trainEnd; index += 1) {
      counts[bits[index - 1]][bits[index]] += 1;
    }
    let total = 0;
    let entropy = 0;
    for (const row of counts) {
      const rowTotal = row[0] + row[1];
      const rowProbability = rowTotal / (trainEnd + 2);
      const p = row[1] / rowTotal;
      const q = 1 - p;
      const h = (p ? -p * Math.log2(p) : 0) + (q ? -q * Math.log2(q) : 0);
      entropy += rowProbability * h;
      total += rowProbability;
    }
    return total ? entropy / total : null;
  }

  function run(value, options = {}) {
    const bits = normalizeBits(value);
    const n = bits.length;
    const lag = Math.floor(clamp(options.lag, 2, 64, 16));
    const holdoutPercent = clamp(options.holdoutPercent, 10, 50, 30);
    const trainEnd = Math.floor(n * (1 - holdoutPercent / 100));
    const testStart = Math.max(lag, trainEnd);
    if (n < 200 || trainEnd <= lag + 16 || n - testStart < 32) {
      throw new Error("ML attack needs at least 200 bits and a valid chronological train/test split");
    }

    let trainOnes = 0;
    for (let index = 0; index < trainEnd; index += 1) trainOnes += bits[index];
    const trainRatio = trainOnes / trainEnd;
    const majorityProbability = trainRatio >= 0.5 ? 1 : 0;
    let majorityCorrect = 0;
    for (let index = testStart; index < n; index += 1) {
      if (bits[index] === majorityProbability) majorityCorrect += 1;
    }
    const baselineAccuracy = majorityCorrect / (n - testStart);
    const majority = majorityModel(bits, trainEnd, testStart, baselineAccuracy).result;
    const markov = markovModel(bits, trainEnd, testStart, baselineAccuracy);
    const logistic = logisticModel(
      bits,
      trainEnd,
      testStart,
      lag,
      Math.floor(clamp(options.maxTrainSamples, 5000, 100000, 60000)),
      Math.floor(clamp(options.epochs, 5, 60, 20)),
      clamp(options.learningRate, 0.02, 1, 0.2),
      clamp(options.l2, 0, 0.1, 0.001),
      baselineAccuracy,
    );

    return {
      n,
      trainCount: trainEnd,
      testCount: n - testStart,
      holdoutPercent,
      lag,
      trainOneRatio: trainRatio,
      testOneRatio: (bits.slice(testStart).reduce((sum, bit) => sum + bit, 0)) / (n - testStart),
      conditionalEntropyBits: conditionalEntropyMarkov(bits, trainEnd),
      baselineAccuracy,
      models: [majority, markov, logistic],
      attack: {
        model: logistic.name,
        accuracy: logistic.accuracy,
        advantage: logistic.advantage,
        meaningful: logistic.advantage >= 0.02,
      },
      warning: "Chronological bit-only prediction. This does not model raw ADC features and does not prove cryptographic security.",
    };
  }

  global.YmPpgMlAttack = { run };
})(typeof self !== "undefined" ? self : window);
