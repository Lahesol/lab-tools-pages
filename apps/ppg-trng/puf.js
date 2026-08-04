/*
 * Paper-inspired PUF response evaluation.
 *
 * The reference paper evaluates equal-length spatial response vectors. This
 * module keeps that definition explicit so temporal ADC bit streams are only
 * treated as PUF responses after the UI has segmented them into responses.
 * These metrics are not an SP 800-90B min-entropy assessment.
 */
(function attachPufEvaluator(global) {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
  }

  function mean(values) {
    if (!values.length) return NaN;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function standardDeviation(values) {
    if (values.length < 2) return 0;
    const average = mean(values);
    return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
  }

  function binaryEntropy(oneRatio) {
    const p = Math.min(1, Math.max(0, oneRatio));
    if (p === 0 || p === 1) return 0;
    return -((1 - p) * Math.log2(1 - p) + p * Math.log2(p));
  }

  function hammingPercent(left, right) {
    let mismatches = 0;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) mismatches += 1;
    }
    return (mismatches / left.length) * 100;
  }

  // Mirrors the row-wise FOM calculation in the source-data Coding.m file.
  // The web input is a flattened row-major response, so rows/columns must be
  // supplied explicitly for this metric to be comparable with the MATLAB run.
  function matlabFom(response, rows, columns) {
    const rowCount = Math.floor(rows || 0);
    const columnCount = Math.floor(columns || 0);
    if (rowCount < 1 || columnCount < 1 || rowCount * columnCount !== response.length) {
      return {
        available: false,
        rows: rowCount,
        columns: columnCount,
        averageRowHdPercent: NaN,
        averageRowEntropy: NaN,
        averageRowUniformityPercent: NaN,
      };
    }

    const rowOnes = new Float64Array(rowCount);
    for (let row = 0; row < rowCount; row += 1) {
      let ones = 0;
      const offset = row * columnCount;
      for (let column = 0; column < columnCount; column += 1) ones += response[offset + column];
      rowOnes[row] = ones;
    }

    const rowEntropy = new Float64Array(rowCount);
    const rowUniformity = new Float64Array(rowCount);
    for (let row = 0; row < rowCount; row += 1) {
      const p1 = rowOnes[row] / columnCount;
      rowEntropy[row] = binaryEntropy(p1);
      rowUniformity[row] = p1 * 100;
    }

    const hammingValues = [];
    for (let left = 0; left < rowCount; left += 1) {
      const leftOffset = left * columnCount;
      for (let right = left + 1; right < rowCount; right += 1) {
        const rightOffset = right * columnCount;
        let mismatches = 0;
        for (let column = 0; column < columnCount; column += 1) {
          if (response[leftOffset + column] !== response[rightOffset + column]) mismatches += 1;
        }
        hammingValues.push((mismatches / columnCount) * 100);
      }
    }

    return {
      available: true,
      rows: rowCount,
      columns: columnCount,
      averageRowHdPercent: mean(hammingValues),
      rowHdStandardDeviationPercent: standardDeviation(hammingValues),
      averageRowEntropy: mean(Array.from(rowEntropy)),
      averageRowUniformityPercent: mean(Array.from(rowUniformity)),
    };
  }

  function pearson(left, right) {
    const leftMean = mean(left);
    const rightMean = mean(right);
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = 0; index < left.length; index += 1) {
      const leftDelta = left[index] - leftMean;
      const rightDelta = right[index] - rightMean;
      numerator += leftDelta * rightDelta;
      leftEnergy += leftDelta * leftDelta;
      rightEnergy += rightDelta * rightDelta;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    return denominator > 0 ? numerator / denominator : NaN;
  }

  function normalizeResponses(responses) {
    if (!Array.isArray(responses) || responses.length < 2) {
      throw new Error("PUF evaluation needs at least two response vectors");
    }
    const length = responses[0]?.length || 0;
    if (length < 32) throw new Error("Each PUF response needs at least 32 bits");
    return responses.map((response, index) => {
      if (!response || response.length !== length) {
        throw new Error(`Response ${index + 1} has length ${response?.length || 0}; expected ${length}`);
      }
      const normalized = new Uint8Array(length);
      for (let bitIndex = 0; bitIndex < length; bitIndex += 1) {
        const bit = Number(response[bitIndex]);
        if (bit !== 0 && bit !== 1) throw new Error(`Response ${index + 1} contains a non-binary value`);
        normalized[bitIndex] = bit;
      }
      return normalized;
    });
  }

  function responseMetrics(response, index, controlResponse, rows, columns) {
    const ones = response.reduce((sum, bit) => sum + bit, 0);
    const ratio = ones / response.length;
    return {
      index: index + 1,
      bits: response.length,
      ones,
      zeros: response.length - ones,
      uniformityPercent: ratio * 100,
      entropy: binaryEntropy(ratio),
      similarityToControlPercent: controlResponse ? 100 - hammingPercent(response, controlResponse) : NaN,
      matlabFom: matlabFom(response, rows, columns),
    };
  }

  function calculateIntraHd(responses, groupSize) {
    const size = Math.max(1, Math.floor(groupSize || 1));
    if (size < 2) return { available: false, groupSize: size, groups: 0, values: [], meanPercent: NaN, standardDeviationPercent: NaN };
    const values = [];
    for (let start = 0; start + size <= responses.length; start += size) {
      const reference = responses[start];
      for (let index = start + 1; index < start + size; index += 1) {
        values.push(hammingPercent(reference, responses[index]));
      }
    }
    return {
      available: values.length > 0,
      groupSize: size,
      groups: Math.floor(responses.length / size),
      values,
      meanPercent: mean(values),
      standardDeviationPercent: standardDeviation(values),
    };
  }

  function calculateMetrics(responses, options = {}) {
    const normalized = normalizeResponses(responses);
    const controlIndex = Math.min(normalized.length - 1, Math.max(0, Math.floor(options.controlIndex || 0)));
    const controlResponse = normalized[controlIndex];
    const rows = Math.max(1, Math.floor(options.rows || 250));
    const columns = Math.max(1, Math.floor(options.columns || 250));
    const metrics = normalized.map((response, index) => responseMetrics(response, index, controlResponse, rows, columns));
    const interValues = [];
    const correlations = [];
    for (let left = 0; left < normalized.length; left += 1) {
      for (let right = left + 1; right < normalized.length; right += 1) {
        interValues.push(hammingPercent(normalized[left], normalized[right]));
        const correlation = pearson(normalized[left], normalized[right]);
        if (Number.isFinite(correlation)) correlations.push(correlation);
      }
    }

    const aliasing = new Float64Array(normalized[0].length);
    for (let bitIndex = 0; bitIndex < aliasing.length; bitIndex += 1) {
      let ones = 0;
      normalized.forEach((response) => { ones += response[bitIndex]; });
      aliasing[bitIndex] = (ones / normalized.length) * 100;
    }

    const intraHd = calculateIntraHd(normalized, options.groupSize);
    const availableFom = metrics.map((item) => item.matlabFom).filter((item) => item.available);
    return {
      responseCount: normalized.length,
      responseLength: normalized[0].length,
      controlIndex,
      responses: normalized,
      responseMetrics: metrics,
      controlSimilarity: {
        meanPercent: mean(metrics.map((item) => item.similarityToControlPercent)),
        standardDeviationPercent: standardDeviation(metrics.map((item) => item.similarityToControlPercent)),
      },
      matlabFom: {
        available: availableFom.length === metrics.length && availableFom.length > 0,
        rows,
        columns,
        responseCount: availableFom.length,
        meanRowHdPercent: mean(availableFom.map((item) => item.averageRowHdPercent)),
        meanRowEntropy: mean(availableFom.map((item) => item.averageRowEntropy)),
        meanRowUniformityPercent: mean(availableFom.map((item) => item.averageRowUniformityPercent)),
      },
      uniformity: {
        meanPercent: mean(metrics.map((item) => item.uniformityPercent)),
        standardDeviationPercent: standardDeviation(metrics.map((item) => item.uniformityPercent)),
      },
      interHd: {
        pairCount: interValues.length,
        meanPercent: mean(interValues),
        standardDeviationPercent: standardDeviation(interValues),
        values: interValues,
      },
      entropy: {
        mean: mean(metrics.map((item) => item.entropy)),
        standardDeviation: standardDeviation(metrics.map((item) => item.entropy)),
      },
      bitAliasing: {
        meanPercent: mean(Array.from(aliasing)),
        standardDeviationPercent: standardDeviation(Array.from(aliasing)),
        minimumPercent: Math.min(...aliasing),
        maximumPercent: Math.max(...aliasing),
        values: Array.from(aliasing),
      },
      correlation: {
        pairCount: correlations.length,
        mean: mean(correlations),
        maximumAbsolute: correlations.length ? Math.max(...correlations.map((value) => Math.abs(value))) : NaN,
        values: correlations,
      },
      intraHd,
    };
  }

  function coordinateFeatures(index, rows, columns) {
    const x = index % columns;
    const y = Math.floor(index / columns);
    const width = Math.max(1, Math.ceil(Math.log2(Math.max(rows, columns))));
    const features = new Float64Array(width * 2 + 1);
    features[0] = 1;
    for (let bit = 0; bit < width; bit += 1) {
      features[1 + bit] = (x >> bit) & 1;
      features[1 + width + bit] = (y >> bit) & 1;
    }
    return features;
  }

  function dot(weights, features) {
    let value = 0;
    for (let index = 0; index < weights.length; index += 1) value += weights[index] * features[index];
    return value;
  }

  function sigmoid(value) {
    if (value < -40) return 0;
    if (value > 40) return 1;
    return 1 / (1 + Math.exp(-value));
  }

  function trainLogistic(samples, labels, featureCount) {
    const weights = new Float64Array(featureCount);
    const learningRate = 0.18;
    for (let epoch = 0; epoch < 90; epoch += 1) {
      const gradient = new Float64Array(featureCount);
      for (let index = 0; index < samples.length; index += 1) {
        const probability = sigmoid(dot(weights, samples[index]));
        const error = probability - labels[index];
        for (let feature = 0; feature < featureCount; feature += 1) gradient[feature] += error * samples[index][feature];
      }
      const scale = learningRate / Math.max(1, samples.length);
      for (let feature = 0; feature < featureCount; feature += 1) weights[feature] -= scale * gradient[feature];
    }
    return weights;
  }

  function trainLinearSvm(samples, labels, featureCount) {
    const weights = new Float64Array(featureCount);
    const learningRate = 0.08;
    for (let epoch = 0; epoch < 70; epoch += 1) {
      const regularization = 0.001;
      for (let index = 0; index < samples.length; index += 1) {
        const signedLabel = labels[index] ? 1 : -1;
        const margin = signedLabel * dot(weights, samples[index]);
        for (let feature = 0; feature < featureCount; feature += 1) {
          weights[feature] *= 1 - learningRate * regularization;
          if (margin < 1) weights[feature] += learningRate * signedLabel * samples[index][feature];
        }
      }
    }
    return weights;
  }

  function attackScore(predictions, labels) {
    let correct = 0;
    for (let index = 0; index < labels.length; index += 1) if (predictions[index] === labels[index]) correct += 1;
    return correct / Math.max(1, labels.length);
  }

  function deterministicShuffle(length, seed) {
    const indices = Array.from({ length }, (_, index) => index);
    let value = seed >>> 0;
    for (let index = indices.length - 1; index > 0; index -= 1) {
      value = (1664525 * value + 1013904223) >>> 0;
      const swapIndex = value % (index + 1);
      [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
    }
    return indices;
  }

  function runCoordinateAttack(response, options = {}) {
    const columns = Math.max(2, Math.floor(options.columns || Math.sqrt(response.length)));
    const rows = Math.max(2, Math.floor(options.rows || Math.ceil(response.length / columns)));
    const pointCount = Math.min(response.length, rows * columns, Math.max(1000, Math.floor(options.maxPoints || 62500)));
    const ratios = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
    const crpSetCount = Math.max(1, Math.floor(options.crpSetCount || options.trials || 5));
    const samples = [];
    for (let index = 0; index < pointCount; index += 1) samples.push(coordinateFeatures(index, rows, columns));
    const featureCount = samples[0].length;
    const labels = Array.from(response.slice(0, pointCount));
    const setSize = Math.floor(pointCount / crpSetCount);
    if (setSize <= featureCount * 4 || setSize < 10) {
      return {
        available: false,
        reason: `Coordinate attack needs at least ${crpSetCount} CRP sets with enough training and test points`,
        rows,
        columns,
        pointCount,
        featureCount,
        crpSetCount,
        results: [],
      };
    }
    // The paper uses five independent CRP subsets. A single deterministic
    // permutation makes this browser result reproducible without pretending
    // that the source-data random seed is known.
    const shuffled = deterministicShuffle(pointCount, 0x9e3779b9).slice(0, setSize * crpSetCount);
    const results = [];
    ratios.forEach((ratio) => {
      const accuracies = { logistic: [], svm: [] };
      let trainingPointCount = 0;
      let testPointCount = 0;
      for (let setIndex = 0; setIndex < crpSetCount; setIndex += 1) {
        const setStart = setIndex * setSize;
        const trainCount = Math.max(featureCount * 4, Math.floor(setSize * ratio));
        const trainIndices = shuffled.slice(setStart, setStart + trainCount);
        const testIndices = shuffled.slice(setStart + trainCount, setStart + setSize);
        trainingPointCount = trainCount;
        testPointCount = testIndices.length;
        const trainSamples = trainIndices.map((index) => samples[index]);
        const trainLabels = trainIndices.map((index) => labels[index]);
        const logistic = trainLogistic(trainSamples, trainLabels, featureCount);
        const svm = trainLinearSvm(trainSamples, trainLabels, featureCount);
        const logisticPredictions = testIndices.map((index) => sigmoid(dot(logistic, samples[index])) >= 0.5 ? 1 : 0);
        const svmPredictions = testIndices.map((index) => dot(svm, samples[index]) >= 0 ? 1 : 0);
        const testLabels = testIndices.map((index) => labels[index]);
        accuracies.logistic.push(attackScore(logisticPredictions, testLabels));
        accuracies.svm.push(attackScore(svmPredictions, testLabels));
      }
      results.push({
        trainingPercent: ratio * 100,
        trainingPointCount,
        testPointCount,
        logisticMeanAccuracy: mean(accuracies.logistic),
        logisticStandardDeviation: standardDeviation(accuracies.logistic),
        svmMeanAccuracy: mean(accuracies.svm),
        svmStandardDeviation: standardDeviation(accuracies.svm),
      });
    });
    return { available: true, rows, columns, pointCount: setSize * crpSetCount, featureCount, crpSetCount, results };
  }

  function evaluate(responses, options = {}) {
    const metrics = calculateMetrics(responses, options);
    const attack = options.attack === false ? null : runCoordinateAttack(metrics.responses[0], options);
    return { ...metrics, attack, warning: "PUF metrics follow the supplied Nature Communications source-data structure where possible: response-vector FOMs, control similarity, row-wise MATLAB FOM, and five coordinate CRP subsets. The browser ML models are not the unavailable authors' MATLAB implementation and are not a replacement for SP 800-90B min-entropy assessment." };
  }

  global.YmPpgPuf = { evaluate };
})(typeof window !== "undefined" ? window : self);
