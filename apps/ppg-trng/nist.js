(function initYmPpgNist(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.YmPpgNist = api;
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const ALPHA = 0.01;

  function clampP(value) {
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.min(1, value));
  }

  function erfc(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const polynomial = (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t;
    const approximation = polynomial * Math.exp(-x * x);
    return sign < 0 ? 2 - approximation : approximation;
  }

  function normalCdf(value) {
    return 0.5 * erfc(-value / Math.SQRT2);
  }

  function logGamma(value) {
    const coefficients = [
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7,
    ];
    if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
    let x = 0.99999999999980993;
    const shifted = value - 1;
    coefficients.forEach((coefficient, index) => {
      x += coefficient / (shifted + index + 1);
    });
    const t = shifted + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function gammaQ(a, x) {
    if (!(a > 0) || !(x >= 0)) return null;
    if (x === 0) return 1;
    if (x < a + 1) {
      let sum = 1 / a;
      let term = sum;
      for (let index = 1; index < 10000; index += 1) {
        term *= x / (a + index);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 3e-14) break;
      }
      const lower = sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
      return clampP(1 - lower);
    }

    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let index = 1; index < 10000; index += 1) {
      const an = -index * (index - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < 3e-14) break;
    }
    return clampP(Math.exp(-x + a * Math.log(x) - logGamma(a)) * h);
  }

  function chiSquarePValue(chi, degreesOfFreedom) {
    return gammaQ(degreesOfFreedom / 2, Math.max(0, chi) / 2);
  }

  function normalizeBits(value) {
    if (value instanceof Uint8Array) return value;
    const source = Array.from(value || []);
    const bits = new Uint8Array(source.length);
    source.forEach((bit, index) => {
      bits[index] = bit ? 1 : 0;
    });
    return bits;
  }

  function unavailable(name, n, note) {
    return {
      name,
      n,
      p: null,
      value: "--",
      detail: note,
      available: false,
      pass: false,
      children: [],
    };
  }

  function result(name, n, p, value, detail, children = []) {
    const safeP = clampP(p);
    return {
      name,
      n,
      p: safeP,
      value: value || "--",
      detail: detail || "",
      available: safeP !== null,
      pass: safeP !== null && safeP >= ALPHA,
      children,
    };
  }

  function family(name, n, children, detail = "") {
    const available = children.length > 0 && children.every((child) => child.available);
    const pValues = children.map((child) => child.p).filter((p) => Number.isFinite(p));
    const p = pValues.length ? Math.min(...pValues) : null;
    const childText = children.map((child) => `${child.name}: ${child.p === null ? "N/A" : child.p.toFixed(6)}`).join("; ");
    return {
      name,
      n,
      p,
      value: p === null ? "--" : `min=${p.toFixed(6)}`,
      detail: detail || childText,
      available,
      pass: available && children.every((child) => child.pass),
      children,
    };
  }

  function bitCounts(bits) {
    let ones = 0;
    for (let index = 0; index < bits.length; index += 1) ones += bits[index];
    return { ones, zeros: bits.length - ones };
  }

  function frequencyTest(bits) {
    const n = bits.length;
    if (n < 100) return unavailable("Frequency", n, "requires n >= 100");
    const { ones } = bitCounts(bits);
    const sum = 2 * ones - n;
    return result("Frequency (Monobit)", n, erfc(Math.abs(sum) / Math.sqrt(2 * n)), `S=${sum}`, "p = erfc(|S| / sqrt(2n))");
  }

  function blockFrequencyTest(bits, blockSize = 128) {
    const n = bits.length;
    const blocks = Math.floor(n / blockSize);
    if (!blocks) return unavailable("Block Frequency", n, `requires n >= ${blockSize}`);
    let chi = 0;
    for (let block = 0; block < blocks; block += 1) {
      let ones = 0;
      const start = block * blockSize;
      for (let index = 0; index < blockSize; index += 1) ones += bits[start + index];
      const pi = ones / blockSize;
      chi += (pi - 0.5) ** 2;
    }
    chi *= 4 * blockSize;
    return result("Block Frequency", n, chiSquarePValue(chi, blocks), `chi²=${chi.toFixed(3)}`, `M=${blockSize}, blocks=${blocks}`);
  }

  function cumulativeSumPValue(bits, reverse = false) {
    const n = bits.length;
    let sum = 0;
    let maximum = 0;
    for (let step = 0; step < n; step += 1) {
      const index = reverse ? n - 1 - step : step;
      sum += bits[index] ? 1 : -1;
      maximum = Math.max(maximum, Math.abs(sum));
    }
    if (!maximum) return 1;
    const z = maximum / Math.sqrt(n);
    const lower1 = Math.ceil((-n / maximum + 1) / 4);
    const upper1 = Math.floor((n / maximum - 1) / 4);
    let sum1 = 0;
    for (let k = lower1; k <= upper1; k += 1) {
      sum1 += normalCdf((4 * k + 1) * z) - normalCdf((4 * k - 1) * z);
    }
    const lower2 = Math.ceil((-n / maximum - 3) / 4);
    const upper2 = Math.floor((n / maximum - 1) / 4);
    let sum2 = 0;
    for (let k = lower2; k <= upper2; k += 1) {
      sum2 += normalCdf((4 * k + 3) * z) - normalCdf((4 * k + 1) * z);
    }
    return clampP(1 - sum1 + sum2);
  }

  function cumulativeSumsTest(bits) {
    const n = bits.length;
    if (n < 100) return family("Cumulative Sums (Cusum)", n, [unavailable("Forward", n, "requires n >= 100")]);
    const forward = result("Forward", n, cumulativeSumPValue(bits), "max |S|", "forward cumulative walk");
    const reverse = result("Reverse", n, cumulativeSumPValue(bits, true), "max |S|", "reverse cumulative walk");
    return family("Cumulative Sums (Cusum)", n, [forward, reverse], "minimum p-value across forward and reverse walks");
  }

  function runsTest(bits) {
    const n = bits.length;
    if (n < 100) return unavailable("Runs", n, "requires n >= 100");
    const { ones } = bitCounts(bits);
    const pi = ones / n;
    if (Math.abs(pi - 0.5) >= 2 / Math.sqrt(n)) {
      return result("Runs", n, 0, `pi=${pi.toFixed(6)}`, "precondition |pi - 0.5| >= 2/sqrt(n)");
    }
    let runs = 1;
    for (let index = 1; index < n; index += 1) {
      if (bits[index] !== bits[index - 1]) runs += 1;
    }
    const denominator = 2 * Math.sqrt(2 * n) * pi * (1 - pi);
    const p = erfc(Math.abs(runs - 2 * n * pi * (1 - pi)) / denominator);
    return result("Runs", n, p, `V=${runs}`, `pi=${pi.toFixed(6)}`);
  }

  function longestRunOfOnesTest(bits) {
    const n = bits.length;
    let blockSize;
    let probabilities;
    let lower;
    if (n < 128) return unavailable("Longest Run of Ones", n, "requires n >= 128");
    if (n < 6272) {
      blockSize = 8;
      lower = 1;
      probabilities = [0.2148, 0.3672, 0.2305, 0.1875];
    } else if (n < 750000) {
      blockSize = 128;
      lower = 4;
      probabilities = [0.1174, 0.2430, 0.2493, 0.1752, 0.1027, 0.1124];
    } else {
      blockSize = 10000;
      lower = 10;
      probabilities = [0.0882, 0.2092, 0.2483, 0.1933, 0.1233, 0.0755, 0.0628];
    }
    const blocks = Math.floor(n / blockSize);
    const frequencies = new Array(probabilities.length).fill(0);
    for (let block = 0; block < blocks; block += 1) {
      let longest = 0;
      let current = 0;
      const start = block * blockSize;
      for (let index = 0; index < blockSize; index += 1) {
        current = bits[start + index] ? current + 1 : 0;
        longest = Math.max(longest, current);
      }
      const category = Math.min(probabilities.length - 1, Math.max(0, longest - lower));
      frequencies[category] += 1;
    }
    let chi = 0;
    frequencies.forEach((observed, index) => {
      const expected = probabilities[index] * blocks;
      if (expected > 0) chi += (observed - expected) ** 2 / expected;
    });
    return result("Longest Run of Ones", n, chiSquarePValue(chi, probabilities.length - 1), `chi²=${chi.toFixed(3)}`, `M=${blockSize}, blocks=${blocks}`);
  }

  function rank32(rows) {
    const matrix = Array.from(rows, (row) => row >>> 0);
    let rank = 0;
    for (let column = 31; column >= 0 && rank < 32; column -= 1) {
      const mask = (1 << column) >>> 0;
      let pivot = rank;
      while (pivot < 32 && !(matrix[pivot] & mask)) pivot += 1;
      if (pivot === 32) continue;
      [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
      for (let row = 0; row < 32; row += 1) {
        if (row !== rank && (matrix[row] & mask)) matrix[row] = (matrix[row] ^ matrix[rank]) >>> 0;
      }
      rank += 1;
    }
    return rank;
  }

  function matrixRankTest(bits) {
    const matrixBits = 32 * 32;
    const matrices = Math.floor(bits.length / matrixBits);
    if (!matrices) return unavailable("Binary Matrix Rank", bits.length, "requires at least 1024 bits");
    let full = 0;
    let minusOne = 0;
    for (let matrix = 0; matrix < matrices; matrix += 1) {
      const rows = [];
      const matrixStart = matrix * matrixBits;
      for (let row = 0; row < 32; row += 1) {
        let value = 0;
        for (let column = 0; column < 32; column += 1) {
          value = ((value << 1) | bits[matrixStart + row * 32 + column]) >>> 0;
        }
        rows.push(value);
      }
      const rank = rank32(rows);
      if (rank === 32) full += 1;
      else if (rank === 31) minusOne += 1;
    }
    const probabilities = [0.2888, 0.5776, 0.1336];
    const observed = [full, minusOne, matrices - full - minusOne];
    let chi = 0;
    observed.forEach((value, index) => {
      const expected = probabilities[index] * matrices;
      chi += (value - expected) ** 2 / expected;
    });
    return result("Binary Matrix Rank", bits.length, Math.exp(-chi / 2), `chi²=${chi.toFixed(3)}`, `32x32, matrices=${matrices}, ranks=${full}/${minusOne}/${observed[2]}`);
  }

  function fft(real) {
    const n = real.length;
    const imag = new Float64Array(n);
    for (let i = 1, j = 0; i < n; i += 1) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
      }
    }
    for (let length = 2; length <= n; length <<= 1) {
      const half = length >> 1;
      const angle = -2 * Math.PI / length;
      const wReal = Math.cos(angle);
      const wImag = Math.sin(angle);
      for (let start = 0; start < n; start += length) {
        let currentReal = 1;
        let currentImag = 0;
        for (let offset = 0; offset < half; offset += 1) {
          const even = start + offset;
          const odd = even + half;
          const oddReal = real[odd] * currentReal - imag[odd] * currentImag;
          const oddImag = real[odd] * currentImag + imag[odd] * currentReal;
          const evenReal = real[even];
          const evenImag = imag[even];
          real[even] = evenReal + oddReal;
          imag[even] = evenImag + oddImag;
          real[odd] = evenReal - oddReal;
          imag[odd] = evenImag - oddImag;
          const nextReal = currentReal * wReal - currentImag * wImag;
          currentImag = currentReal * wImag + currentImag * wReal;
          currentReal = nextReal;
        }
      }
    }
    return imag;
  }

  function dftTest(bits) {
    const n = bits.length;
    if (n < 1024) return unavailable("Discrete Fourier Transform", n, "requires n >= 1024");
    const used = 2 ** Math.floor(Math.log2(n));
    const real = new Float64Array(used);
    for (let index = 0; index < used; index += 1) real[index] = bits[index] ? 1 : -1;
    const imag = fft(real);
    const threshold = Math.sqrt(Math.log(1 / 0.05) * used);
    let below = 0;
    for (let index = 0; index < used / 2; index += 1) {
      if (Math.hypot(real[index], imag[index]) < threshold) below += 1;
    }
    const expected = 0.95 * used / 2;
    const denominator = Math.sqrt(used * 0.95 * 0.05 / 4);
    const p = erfc(Math.abs(below - expected) / (Math.SQRT2 * denominator));
    return result("Discrete Fourier Transform", n, p, `N1=${below}`, `FFT prefix=${used}, threshold=${threshold.toFixed(2)}`);
  }

  function matchesAt(bits, start, template) {
    for (let offset = 0; offset < template.length; offset += 1) {
      if (bits[start + offset] !== template[offset]) return false;
    }
    return true;
  }

  function nonOverlappingTemplateTest(bits, template = "000000001") {
    const n = bits.length;
    const pattern = Array.from(template, (bit) => Number(bit));
    const m = pattern.length;
    const blocks = 8;
    const blockSize = Math.floor(n / blocks);
    if (blockSize < m + 1) return unavailable("Non-overlapping Template", n, `requires block size > ${m}`);
    const mean = (blockSize - m + 1) / (2 ** m);
    const variance = blockSize * (1 / (2 ** m) - (2 * m - 1) / (2 ** (2 * m)));
    let chi = 0;
    const counts = [];
    for (let block = 0; block < blocks; block += 1) {
      const start = block * blockSize;
      const end = start + blockSize;
      let count = 0;
      for (let index = start; index <= end - m;) {
        if (matchesAt(bits, index, pattern)) {
          count += 1;
          index += m;
        } else {
          index += 1;
        }
      }
      counts.push(count);
      chi += (count - mean) ** 2 / variance;
    }
    return result("Non-overlapping Template", n, gammaQ(blocks / 2, chi / 2), `chi²=${chi.toFixed(3)}`, `m=${m}, B=${template}, M=${blockSize}, N=${blocks}, counts=${counts.join("/")}`);
  }

  function overlappingTemplateTest(bits, templateLength = 9) {
    const n = bits.length;
    const blockSize = 1032;
    const blocks = Math.floor(n / blockSize);
    if (!blocks) return unavailable("Overlapping Template", n, `requires n >= ${blockSize}`);
    const probabilities = [0.364091, 0.185659, 0.139381, 0.100571, 0.0704323, 0.139865];
    let chi = 0;
    const counts = [];
    for (let block = 0; block < blocks; block += 1) {
      const start = block * blockSize;
      const end = start + blockSize;
      let count = 0;
      for (let index = start; index <= end - templateLength; index += 1) {
        let matches = true;
        for (let offset = 0; offset < templateLength; offset += 1) {
          if (bits[index + offset] !== 1) {
            matches = false;
            break;
          }
        }
        if (matches) count += 1;
      }
      const category = Math.min(5, count);
      counts.push(count);
      const expected = probabilities[category] * blocks;
      // The chi-square term is accumulated after the block loop below.
      if (!Number.isFinite(expected)) return unavailable("Overlapping Template", n, "invalid expected frequency");
    }
    const frequencies = new Array(6).fill(0);
    counts.forEach((count) => {
      frequencies[Math.min(5, count)] += 1;
    });
    frequencies.forEach((observed, index) => {
      const expected = probabilities[index] * blocks;
      chi += (observed - expected) ** 2 / expected;
    });
    return result("Overlapping Template", n, gammaQ(5 / 2, chi / 2), `chi²=${chi.toFixed(3)}`, `m=${templateLength}, ones template, M=${blockSize}, blocks=${blocks}`);
  }

  function universalTest(bits) {
    const n = bits.length;
    let L;
    if (n >= 387840) L = 6;
    else return unavailable("Maurer Universal", n, "requires n >= 387840 for L=6");
    const Q = 10 * (2 ** L);
    const blocks = Math.floor(n / L);
    const K = blocks - Q;
    if (K < 1) return unavailable("Maurer Universal", n, `requires more than Q=${Q} blocks`);
    const table = new Int32Array(2 ** L);
    let position = 0;
    for (let index = 1; index <= Q; index += 1) {
      let pattern = 0;
      for (let bit = 0; bit < L; bit += 1) pattern = (pattern << 1) | bits[position + bit];
      table[pattern] = index;
      position += L;
    }
    let total = 0;
    for (let index = 1; index <= K; index += 1) {
      let pattern = 0;
      for (let bit = 0; bit < L; bit += 1) pattern = (pattern << 1) | bits[position + bit];
      const last = table[pattern];
      total += Math.log2(index + Q - last);
      table[pattern] = index + Q;
      position += L;
    }
    const fn = total / K;
    const expected = 5.2177052;
    const variance = 2.954;
    const correction = 0.7 - 0.8 / L + (4 + 32 / L) * K ** (-3 / L) / 15;
    const sigma = correction * Math.sqrt(variance / K);
    const p = erfc(Math.abs(fn - expected) / (Math.SQRT2 * sigma));
    return result("Maurer Universal", n, p, `f=${fn.toFixed(6)}`, `L=${L}, Q=${Q}, K=${K}`);
  }

  function approximateEntropyTest(bits, m = 10) {
    const n = bits.length;
    if (n < 2 ** (m + 2)) return unavailable("Approximate Entropy", n, `requires n >= ${2 ** (m + 2)} for m=${m}`);
    const phi = (length) => {
      const counts = new Int32Array(2 ** length);
      let pattern = 0;
      for (let index = 0; index < length - 1; index += 1) pattern = (pattern << 1) | bits[index];
      for (let index = 0; index < n; index += 1) {
        pattern = ((pattern << 1) | bits[(index + length - 1) % n]) & ((1 << length) - 1);
        counts[pattern] += 1;
      }
      let value = 0;
      counts.forEach((count) => {
        if (count) {
          const probability = count / n;
          value += probability * Math.log(probability);
        }
      });
      return value;
    };
    const apEn = phi(m) - phi(m + 1);
    const chi = 2 * n * (Math.log(2) - apEn);
    return result("Approximate Entropy", n, gammaQ(2 ** (m - 1), chi / 2), `ApEn=${apEn.toFixed(6)}`, `m=${m}`);
  }

  function buildExcursions(bits) {
    const states = [-4, -3, -2, -1, 1, 2, 3, 4];
    const indexByState = new Map(states.map((state, index) => [state, index]));
    const histograms = states.map(() => new Int32Array(6));
    const totalVisits = new Int32Array(states.length);
    const currentVisits = new Int32Array(states.length);
    let sum = 0;
    let cycles = 0;
    let hasCycle = false;
    for (let index = 0; index < bits.length; index += 1) {
      sum += bits[index] ? 1 : -1;
      const stateIndex = indexByState.get(sum);
      if (stateIndex !== undefined) {
        currentVisits[stateIndex] += 1;
        totalVisits[stateIndex] += 1;
      }
      if (sum === 0) {
        if (hasCycle) {
          for (let stateIndex = 0; stateIndex < states.length; stateIndex += 1) {
            histograms[stateIndex][Math.min(5, currentVisits[stateIndex])] += 1;
          }
        }
        cycles += 1;
        hasCycle = true;
        currentVisits.fill(0);
      }
    }
    return { states, histograms, totalVisits, cycles };
  }

  function randomExcursionsTest(bits) {
    const n = bits.length;
    const excursion = buildExcursions(bits);
    const { states, histograms, cycles } = excursion;
    if (cycles < 500) return family("Random Excursions", n, states.map((state) => unavailable(String(state), n, `cycles J=${cycles}; requires J >= 500`)), `cycles J=${cycles}`);
    const children = states.map((state, stateIndex) => {
      const absolute = Math.abs(state);
      const probabilities = [1 - 1 / (2 * absolute)];
      for (let k = 1; k <= 4; k += 1) {
        probabilities.push((1 / (4 * absolute * absolute)) * ((1 - 1 / (2 * absolute)) ** (k - 1)));
      }
      probabilities.push((1 - 1 / (2 * absolute)) ** 4 / (2 * absolute));
      let chi = 0;
      probabilities.forEach((probability, category) => {
        const expected = cycles * probability;
        chi += (histograms[stateIndex][category] - expected) ** 2 / expected;
      });
      return result(String(state), n, gammaQ(5 / 2, chi / 2), `chi²=${chi.toFixed(3)}`, `J=${cycles}, visits=${histograms[stateIndex].join("/")}`);
    });
    return family("Random Excursions", n, children, `cycles J=${cycles}, states=${states.join(",")}`);
  }

  function randomExcursionsVariantTest(bits) {
    const n = bits.length;
    const excursion = buildExcursions(bits);
    const { states, totalVisits, cycles } = excursion;
    if (cycles < 500) return family("Random Excursions Variant", n, states.map((state) => unavailable(String(state), n, `cycles J=${cycles}; requires J >= 500`)), `cycles J=${cycles}`);
    const children = states.map((state, stateIndex) => {
      const denominator = Math.sqrt(2 * cycles * (4 * Math.abs(state) - 2));
      const z = (totalVisits[stateIndex] - cycles) / denominator;
      return result(String(state), n, erfc(Math.abs(z) / Math.SQRT2), `visits=${totalVisits[stateIndex]}`, `J=${cycles}, z=${z.toFixed(4)}`);
    });
    return family("Random Excursions Variant", n, children, `cycles J=${cycles}, states=${states.join(",")}`);
  }

  function circularPsi(bits, length) {
    const n = bits.length;
    const counts = new Int32Array(2 ** length);
    let pattern = 0;
    for (let offset = 0; offset < length; offset += 1) pattern = (pattern << 1) | bits[offset % n];
    const mask = (1 << length) - 1;
    for (let index = 0; index < n; index += 1) {
      if (index > 0) pattern = ((pattern << 1) | bits[(index + length - 1) % n]) & mask;
      counts[pattern] += 1;
    }
    let sum = 0;
    counts.forEach((count) => { sum += count * count; });
    return (sum * (2 ** length) / n) - n;
  }

  function serialTest(bits, m = 10) {
    const n = bits.length;
    if (n < 2 ** (m + 2)) return family("Serial", n, [unavailable("Delta1", n, `requires n >= ${2 ** (m + 2)} for m=${m}`)]);
    const psiM = circularPsi(bits, m);
    const psiM1 = circularPsi(bits, m - 1);
    const psiM2 = circularPsi(bits, m - 2);
    const delta1 = psiM - psiM1;
    const delta2 = psiM - 2 * psiM1 + psiM2;
    const first = result("Delta1", n, gammaQ(2 ** (m - 2), delta1 / 2), `d1=${delta1.toFixed(3)}`, `m=${m}, df=${2 ** (m - 1)}`);
    const second = result("Delta2", n, gammaQ(2 ** (m - 3), delta2 / 2), `d2=${delta2.toFixed(3)}`, `m=${m}, df=${2 ** (m - 2)}`);
    return family("Serial", n, [first, second], `m=${m}, minimum of Delta1/Delta2`);
  }

  function linearComplexity(bits, blockSize = 500) {
    const n = bits.length;
    const blocks = Math.floor(n / blockSize);
    if (!blocks) return unavailable("Linear Complexity", n, `requires n >= ${blockSize}`);
    const probabilities = [0.010417, 0.03125, 0.125, 0.5, 0.25, 0.0625, 0.020833];
    const frequencies = new Array(7).fill(0);
    for (let block = 0; block < blocks; block += 1) {
      const sequence = bits.slice(block * blockSize, (block + 1) * blockSize);
      const c = new Uint8Array(blockSize);
      const b = new Uint8Array(blockSize);
      c[0] = 1;
      b[0] = 1;
      let length = 0;
      let m = -1;
      let scale = 1;
      for (let index = 0; index < blockSize; index += 1) {
        let discrepancy = sequence[index];
        for (let tap = 1; tap <= length; tap += 1) discrepancy ^= c[tap] & sequence[index - tap];
        if (!discrepancy) continue;
        const previous = c.slice();
        const shift = index - m;
        for (let tap = 0; tap + shift < blockSize; tap += 1) {
          c[tap + shift] ^= b[tap];
        }
        if (2 * length <= index) {
          length = index + 1 - length;
          b.set(previous);
          m = index;
          scale = 1;
        }
      }
      const mu = blockSize / 2 + (9 + ((blockSize + 1) % 2 ? -1 : 1)) / 36 - (blockSize / 3 + 2 / 9) / (2 ** blockSize);
      const transformed = ((blockSize % 2 ? -1 : 1) * (length - mu)) + 2 / 9;
      let category;
      if (transformed <= -2.5) category = 0;
      else if (transformed <= -1.5) category = 1;
      else if (transformed <= -0.5) category = 2;
      else if (transformed <= 0.5) category = 3;
      else if (transformed <= 1.5) category = 4;
      else if (transformed <= 2.5) category = 5;
      else category = 6;
      frequencies[category] += 1;
      void scale;
    }
    let chi = 0;
    frequencies.forEach((observed, index) => {
      const expected = probabilities[index] * blocks;
      chi += (observed - expected) ** 2 / expected;
    });
    return result("Linear Complexity", n, gammaQ(3, chi / 2), `chi²=${chi.toFixed(3)}`, `M=${blockSize}, blocks=${blocks}`);
  }

  function runAll(value, options = {}) {
    const bits = normalizeBits(value);
    const blockSize = Math.max(8, Number.parseInt(options.blockSize, 10) || 128);
    const template = /^[01]{2,21}$/.test(options.template || "") ? options.template : "000000001";
    const approximateEntropyM = Math.max(2, Math.min(15, Number.parseInt(options.approximateEntropyM, 10) || 10));
    const serialM = Math.max(3, Math.min(15, Number.parseInt(options.serialM, 10) || 10));
    const linearBlockSize = Math.max(7, Number.parseInt(options.linearBlockSize, 10) || 500);
    const tests = [
      frequencyTest(bits),
      blockFrequencyTest(bits, blockSize),
      cumulativeSumsTest(bits),
      runsTest(bits),
      longestRunOfOnesTest(bits),
      matrixRankTest(bits),
      dftTest(bits),
      nonOverlappingTemplateTest(bits, template),
      overlappingTemplateTest(bits, 9),
      universalTest(bits),
      approximateEntropyTest(bits, approximateEntropyM),
      randomExcursionsTest(bits),
      randomExcursionsVariantTest(bits),
      serialTest(bits, serialM),
      linearComplexity(bits, linearBlockSize),
    ];
    return {
      alpha: ALPHA,
      n: bits.length,
      tests,
      testFamilyCount: tests.length,
      availableCount: tests.filter((test) => test.available).length,
      passCount: tests.filter((test) => test.available && test.pass).length,
      checkCount: tests.filter((test) => test.available && !test.pass).length,
      unavailableCount: tests.filter((test) => !test.available).length,
      ones: bitCounts(bits).ones,
      options: {
        blockSize,
        template,
        approximateEntropyM,
        serialM,
        linearBlockSize,
      },
    };
  }

  return { ALPHA, runAll };
}));
