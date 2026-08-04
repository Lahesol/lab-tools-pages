(() => {
  "use strict";

  const MODEL = window.NEUROMORPHIC_MODEL;
  if (!MODEL) {
    throw new Error("model-data.js did not load");
  }

  const $ = (id) => document.getElementById(id);
  const FEATURE_CHANNELS = [
    { id: "V1", route: "vertical" }, { id: "V2", route: "vertical" }, { id: "V3", route: "vertical" },
    { id: "H1", route: "horizontal" }, { id: "H2", route: "horizontal" }, { id: "H3", route: "horizontal" },
    { id: "D1", route: "diagonal" }, { id: "D2", route: "diagonal" }
  ];
  const controls = {
    illumination: $("illumination"),
    ambient: $("ambient"),
    noise: $("noise"),
    eventThreshold: $("event-threshold"),
    bitFlip: $("bit-flip"),
    gateThreshold: $("gate-threshold"),
    adcBits: $("adc-bits"),
    adcVref: $("adc-vref")
  };
  const outputs = {
    illumination: $("illumination-value"),
    ambient: $("ambient-value"),
    noise: $("noise-value"),
    eventThreshold: $("event-threshold-value"),
    bitFlip: $("bit-flip-value"),
    gateThreshold: $("gate-threshold-value"),
    adcBits: $("adc-bits-value"),
    adcVref: $("adc-vref-value")
  };
  const view = {
    letterPicker: $("letter-picker"),
    inputLabel: $("input-label"),
    sensorGrid: $("sensor-grid"),
    eventGrid: $("event-grid"),
    eventCount: $("event-count"),
    featureBars: $("feature-bars"),
    latinCodebook: $("latin-codebook"),
    fcMatrix: $("fc-matrix"),
    preactivationValues: $("preactivation-values"),
    gateChannels: $("gate-channels"),
    outputValue: $("output-value"),
    outputTerms: $("output-terms"),
    adcMode: $("adc-mode"),
    adcBinary: $("adc-binary"),
    adcCode: $("adc-code"),
    adcVoltage: $("adc-voltage"),
    decodedLetter: $("decoded-letter"),
    predictionPill: $("prediction-pill"),
    lutStrip: $("lut-strip"),
    sampleStatus: $("sample-status"),
    inspector: $("inspector")
  };

  const state = {
    letter: "G",
    customMap: null,
    frame: 1,
    randomTerms: [],
    activeLayer: "input",
    result: null
  };

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
  const flatten = (matrix) => matrix.flat();
  const fmt = (value, digits = 3) => Number(value).toFixed(digits);
  const signed = (value, digits = 3) => `${value >= 0 ? "+" : ""}${fmt(value, digits)}`;

  function mulberry32(seed) {
    return function random() {
      let value = (seed += 0x6d2b79f5);
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(random) {
    const a = Math.max(random(), 1e-12);
    const b = random();
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  }

  function getConfig() {
    return {
      illumination: Number(controls.illumination.value),
      ambient: Number(controls.ambient.value),
      noise: Number(controls.noise.value),
      eventThreshold: Number(controls.eventThreshold.value),
      bitFlip: Number(controls.bitFlip.value),
      gateThreshold: Number(controls.gateThreshold.value),
      adcBits: Number(controls.adcBits.value),
      adcVref: Number(controls.adcVref.value)
    };
  }

  function refreshControlLabels() {
    outputs.illumination.value = `${Number(controls.illumination.value).toFixed(2)} ×`;
    outputs.ambient.value = Number(controls.ambient.value).toFixed(2);
    outputs.noise.value = Number(controls.noise.value).toFixed(3);
    outputs.eventThreshold.value = Number(controls.eventThreshold.value).toFixed(2);
    outputs.bitFlip.value = `${(Number(controls.bitFlip.value) * 100).toFixed(1)} %`;
    outputs.gateThreshold.value = signed(Number(controls.gateThreshold.value), 2);
    outputs.adcBits.value = `${controls.adcBits.value} bit`;
    outputs.adcVref.value = `${Number(controls.adcVref.value).toFixed(2)} V`;
  }

  function glyphToMap(glyph) {
    return glyph.map((row) => [...row].map((bit) => Number(bit)));
  }

  function baseMap() {
    return state.customMap ? state.customMap.map((row) => row.slice()) : glyphToMap(MODEL.glyphs[state.letter]);
  }

  function drawNewNoise() {
    const random = mulberry32(20260804 + state.frame * 7919);
    state.randomTerms = Array.from({ length: 25 }, () => ({ noise: gaussian(random), flip: random() }));
  }

  function makeLatinCodebook() {
    const candidates = [];
    for (let a = 1; a < 5; a += 1) {
      for (let b = 1; b < 5; b += 1) {
        for (let shift = 0; shift < 5; shift += 1) {
          const raw = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => MODEL.latinLevels[(a * row + b * col + shift) % 5]));
          const mean = flatten(raw).reduce((sum, value) => sum + value, 0) / 25;
          candidates.push({
            mask: raw.map((row) => row.map((value) => value - mean)),
            descriptor: [a, b, shift]
          });
        }
      }
    }
    const normalized = candidates.map(({ mask }) => {
      const values = flatten(mask);
      const norm = Math.sqrt(dot(values, values));
      return values.map((value) => value / norm);
    });
    const selected = [0];
    while (selected.length < 8) {
      let bestIndex = -1;
      let bestScore = Infinity;
      candidates.forEach((_, index) => {
        if (selected.includes(index)) return;
        const correlation = Math.max(...selected.map((chosen) => Math.abs(dot(normalized[index], normalized[chosen]))));
        if (correlation < bestScore - 1e-12) {
          bestIndex = index;
          bestScore = correlation;
        }
      });
      selected.push(bestIndex);
    }
    return selected.map((index) => candidates[index]);
  }

  const latinCodebook = makeLatinCodebook();

  function adcCenters(bits) {
    const maximum = 2 ** bits - 1;
    return MODEL.adcOrder.map((_, index) => Math.round(1 + index * (maximum - 1) / (MODEL.adcOrder.length - 1)));
  }

  function runPipeline() {
    const config = getConfig();
    const base = baseMap();
    const sensor = [];
    const event = [];
    let index = 0;
    for (let row = 0; row < 5; row += 1) {
      const sensorRow = [];
      const eventRow = [];
      for (let col = 0; col < 5; col += 1) {
        const randomTerm = state.randomTerms[index];
        const analog = config.ambient + config.illumination * base[row][col] + config.noise * randomTerm.noise;
        let stateOn = analog >= config.eventThreshold;
        if (randomTerm.flip < config.bitFlip) stateOn = !stateOn;
        sensorRow.push(analog);
        eventRow.push(stateOn ? 1 : 0);
        index += 1;
      }
      sensor.push(sensorRow);
      event.push(eventRow);
    }

    const features = latinCodebook.map(({ mask, descriptor }) => {
      const projection = event.reduce((sum, row, r) => sum + row.reduce((inner, value, c) => inner + value * mask[r][c], 0), 0);
      const weights = flatten(mask);
      const low = weights.reduce((sum, value) => sum + Math.min(value, 0), 0);
      const high = weights.reduce((sum, value) => sum + Math.max(value, 0), 0);
      const normalized = clamp((projection - low) / (high - low), 0, 1);
      const code = Math.round(normalized * (MODEL.featureLevels - 1));
      return { descriptor, projection, normalized, code, value: code / (MODEL.featureLevels - 1) };
    });
    const featureValues = features.map((feature) => feature.value);
    const preactivations = Array.from({ length: 4 }, (_, node) => dot(featureValues, MODEL.model.w1.map((weights) => weights[node])) + MODEL.model.b1[node]);
    const gates = preactivations.map((value, node) => {
      const output = Math.max(0, value - config.gateThreshold);
      return { node, z: value, output, state: output > 0 ? "LRS" : "HRS" };
    });
    const terms = gates.map((gate, node) => gate.output * MODEL.model.w2[node]);
    const output = terms.reduce((sum, value) => sum + value, MODEL.model.b2);
    const maximumCode = 2 ** config.adcBits - 1;
    const adcCode = Math.round((clamp(output, -1, 1) + 1) * maximumCode / 2);
    const centers = adcCenters(config.adcBits);
    const orderIndex = centers.reduce((best, center, index) => Math.abs(adcCode - center) < Math.abs(adcCode - centers[best]) ? index : best, 0);
    const decoded = MODEL.adcOrder[orderIndex];
    return { config, base, sensor, event, features, featureValues, preactivations, gates, terms, output, adcCode, maximumCode, centers, decoded };
  }

  function renderLetterPicker() {
    view.letterPicker.innerHTML = MODEL.classes.map((letter) => `<button class="letter-option ${state.letter === letter && !state.customMap ? "is-active" : ""}" type="button" data-letter="${letter}">${letter}</button>`).join("");
    view.letterPicker.querySelectorAll("[data-letter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.letter = button.dataset.letter;
        state.customMap = null;
        nextFrame();
      });
    });
  }

  function renderInput(result) {
    view.inputLabel.textContent = state.customMap ? "custom 5 × 5 map" : `${state.letter} glyph`;
    view.sensorGrid.innerHTML = flatten(result.sensor).map((value, index) => {
      const clipped = clamp(value, 0, 1);
      const shade = Math.round(16 + clipped * 174);
      return `<button type="button" class="sensor-cell" data-cell="${index}" style="--intensity:${shade};--signal:${clipped.toFixed(3)}" aria-label="Sensor cell ${Math.floor(index / 5) + 1}, ${index % 5 + 1}; ${fmt(clipped, 2)}"><span>${fmt(clipped, 2)}</span></button>`;
    }).join("");
    view.sensorGrid.querySelectorAll("[data-cell]").forEach((cell) => {
      cell.addEventListener("click", () => {
        const index = Number(cell.dataset.cell);
        const map = baseMap();
        map[Math.floor(index / 5)][index % 5] = map[Math.floor(index / 5)][index % 5] ? 0 : 1;
        state.customMap = map;
        state.letter = "custom";
        renderLetterPicker();
        render();
      });
    });
  }

  function renderEvent(result) {
    const count = flatten(result.event).reduce((sum, value) => sum + value, 0);
    view.eventCount.textContent = `${count} / 25 ON`;
    view.eventGrid.innerHTML = flatten(result.event).map((value, index) => `<div class="event-cell ${value ? "is-lrs" : ""}"><span>${value ? "1" : "0"}</span></div>`).join("");
  }

  function renderFeatures(result) {
    view.featureBars.innerHTML = result.features.map((feature, index) => `<div class="feature-bar"><span class="feature-name">${FEATURE_CHANNELS[index].id}</span><div class="bar-track"><i class="bar-fill" style="height:${(feature.value * 100).toFixed(2)}%"></i></div><span class="feature-value">${fmt(feature.value, 3)}<small>${feature.code.toString().padStart(2, "0")} / 31</small></span></div>`).join("");
  }

  function renderLatinCodebook() {
    view.latinCodebook.innerHTML = latinCodebook.map(({ descriptor }, index) => {
      const [a, b, shift] = descriptor;
      const title = FEATURE_CHANNELS[index];
      const cells = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => {
        const level = (a * row + b * col + shift) % 5;
        const label = ["1", "½", "⅓", "¼", "⅕"][level];
        return `<span class="latin-cell latin-level-${level}">${label}</span>`;
      }).join("")).join("");
      return `<div class="latin-map"><div class="latin-map-title"><strong>${title.id}</strong><small>a,b,s = ${descriptor.join(",")}</small></div><div class="latin-grid" aria-label="${title.id}, ${title.route} routing group Latin map">${cells}</div></div>`;
    }).join("");
  }

  function renderFc(result) {
    const contributions = MODEL.model.w1.map((weights, feature) => weights.map((weight) => weight * result.featureValues[feature]));
    const extent = Math.max(...flatten(contributions).map((value) => Math.abs(value)), 1e-6);
    let html = "<div class=\"matrix-label is-header\">term</div>";
    for (let node = 0; node < 4; node += 1) html += `<div class="matrix-label is-header">z${node + 1}</div>`;
    contributions.forEach((row, feature) => {
      html += `<div class="matrix-label">${FEATURE_CHANNELS[feature].id} × w</div>`;
      row.forEach((value, node) => {
        const alpha = Math.min(Math.abs(value) / extent, 1).toFixed(3);
        const weight = MODEL.model.w1[feature][node];
        html += `<div class="matrix-cell ${value < 0 ? "is-negative" : ""}" style="--weight-alpha:${alpha}" aria-label="${FEATURE_CHANNELS[feature].id} to z${node + 1}; weight ${signed(weight)}, term ${signed(value)}"><strong>w ${signed(weight, 2)}</strong><small>term ${signed(value, 2)}</small></div>`;
      });
    });
    view.fcMatrix.innerHTML = html;
    view.preactivationValues.innerHTML = result.preactivations.map((value, node) => `<div><span>z${node + 1} (with b${node + 1})</span><strong>${signed(value)}</strong></div>`).join("");
  }

  function renderGates(result) {
    const height = Math.max(1, ...result.gates.map((gate) => gate.output));
    view.gateChannels.innerHTML = result.gates.map((gate, node) => `<div class="gate-channel ${gate.state === "LRS" ? "is-lrs" : ""}"><div class="gate-row"><strong>h${node + 1}</strong><strong class="gate-state">${gate.state}</strong></div><div class="gate-row"><span>z${node + 1} − θ</span><strong>${signed(gate.z - result.config.gateThreshold)}</strong></div><div class="gate-meter"><i style="width:${(gate.output / height * 100).toFixed(1)}%"></i></div><div class="gate-row"><span>buffered y${node + 1}</span><strong>${fmt(gate.output)}</strong></div></div>`).join("");
  }

  function renderOutput(result) {
    view.outputValue.textContent = signed(result.output);
    view.outputTerms.innerHTML = result.terms.map((term, node) => `<div class="output-term">w${node + 1} × y${node + 1}<strong>${signed(term)}</strong></div>`).join("");
  }

  function renderAdc(result) {
    const binary = result.adcCode.toString(2).padStart(result.config.adcBits, "0");
    view.adcMode.textContent = `${result.config.adcBits}-bit conversion`;
    view.adcBinary.innerHTML = [...binary].map((bit) => `<span class="bit ${bit === "1" ? "is-one" : ""}">${bit}</span>`).join("");
    view.adcCode.textContent = `${result.adcCode} / ${result.maximumCode}`;
    view.adcVoltage.textContent = `${fmt(result.adcCode / result.maximumCode * result.config.adcVref, 3)} V`;
    view.decodedLetter.textContent = result.decoded;
    view.predictionPill.textContent = result.decoded;
    view.lutStrip.innerHTML = MODEL.adcOrder.map((letter, index) => `<div class="lut-item ${letter === result.decoded ? "is-decoded" : ""}">${letter}<code>${result.centers[index]}</code></div>`).join("");
  }

  function dataBlock(label, value) {
    return `<div class="inspector-data"><em>${label}</em>${value}</div>`;
  }

  function renderInspector(result) {
    const layer = state.activeLayer;
    const headers = {
      input: "01 · Photodiode input data",
      event: "02 · RRAM threshold-event data",
      features: "03 · Latin-projection feature data",
      latin: "03a · Latin-square spatial codebook",
      fc: "04 · 8 × 4 analog MAC data",
      gate: "05 · RRAM-gated analog ReLU data",
      output: "06 · Final analog-adder data",
      adc: "07 · ADC code and decoder data"
    };
    const explanations = {
      input: "The selected binary glyph is exposed to illumination and ambient offset; each cell receives the retained synthetic Gaussian-noise term for this frame.",
      event: "A cell becomes LRS when its analog input exceeds the event threshold, then its independent uncertainty draw may invert the event state.",
      features: "Each centered Latin mask computes a differential spatial projection. The normalized result is quantized to one of 32 equally spaced levels.",
      latin: "V/H/D is a physical-routing-group name: vertical V1–V3, horizontal H1–H3, diagonal D1–D2. Every displayed 5 × 5 allocation contains the five Latin levels once per row and column; the differential projection uses its mean-centered counterpart.",
      fc: "Every MAC tile gives both the raw calibrated input-to-hidden weight wkj and the present Fk × wkj contribution. Bias is added after the column sum.",
      gate: "The numerical abstraction resets before a sample; z > θ is represented as LRS, enabling a buffer that passes the positive analog remainder.",
      output: "Four buffered hidden outputs are multiplied by the fixed trained output weights and added with b2 before conversion.",
      adc: "The scalar is clipped to the model conversion range [−1, +1], quantized by the selectable RRAM ADC resolution, then mapped through the reserved class-code centers."
    };
    let blocks = [];
    if (layer === "input") {
      blocks = result.sensor.map((row, index) => dataBlock(`row ${index + 1}`, row.map((value) => fmt(clamp(value, 0, 1), 2)).join(" · ")));
    } else if (layer === "event") {
      blocks = result.event.map((row, index) => dataBlock(`row ${index + 1}`, row.map((value) => value ? "LRS" : "HRS").join(" · ")));
    } else if (layer === "features") {
      blocks = result.features.map((feature, index) => dataBlock(`${FEATURE_CHANNELS[index].id} · Latin (${feature.descriptor.join(",")})`, `projection ${signed(feature.projection)} · code ${feature.code}/31 · ${fmt(feature.value)}`));
    } else if (layer === "latin") {
      blocks = latinCodebook.map(({ descriptor }, index) => {
        const [a, b, shift] = descriptor;
        const map = Array.from({ length: 5 }, (_, row) => Array.from({ length: 5 }, (_, col) => ["1", "½", "⅓", "¼", "⅕"][(a * row + b * col + shift) % 5]).join(" ")).join(" / ");
        return dataBlock(`${FEATURE_CHANNELS[index].id} · ${FEATURE_CHANNELS[index].route}`, `a,b,shift = ${descriptor.join(",")} · ${map}`);
      });
    } else if (layer === "fc") {
      blocks = result.preactivations.map((value, node) => dataBlock(`z${node + 1}`, `w = [${MODEL.model.w1.map((weights) => signed(weights[node], 2)).join(", ")}]; Σ Fk·wk = ${signed(value - MODEL.model.b1[node])}; b = ${signed(MODEL.model.b1[node])}; z = ${signed(value)}`));
    } else if (layer === "gate") {
      blocks = result.gates.map((gate, node) => dataBlock(`h${node + 1} · ${gate.state}`, `z = ${signed(gate.z)} · θ = ${signed(result.config.gateThreshold)} · y = ${fmt(gate.output)}`));
    } else if (layer === "output") {
      blocks = result.terms.map((term, node) => dataBlock(`term ${node + 1}`, `w${node + 1} = ${signed(MODEL.model.w2[node])}; y${node + 1} = ${fmt(result.gates[node].output)}; product = ${signed(term)}`));
      blocks.push(dataBlock("b2 / z out", `b2 = ${signed(MODEL.model.b2)}; z_out = ${signed(result.output)}`));
    } else if (layer === "adc") {
      blocks = MODEL.adcOrder.map((letter, index) => dataBlock(`${letter} center`, `ADC code ${result.centers[index]}${letter === result.decoded ? " · selected" : ""}`));
      blocks.push(dataBlock("current conversion", `${result.config.adcBits}-bit · ${result.adcCode}/${result.maximumCode} · ${result.decoded}`));
    }
    view.inspector.innerHTML = `<h3>${headers[layer]}</h3><p>${explanations[layer]}</p><div class="inspector-grid">${blocks.join("")}</div>`;
  }

  function render() {
    refreshControlLabels();
    const result = runPipeline();
    state.result = result;
    renderInput(result);
    renderEvent(result);
    renderLatinCodebook();
    renderFeatures(result);
    renderFc(result);
    renderGates(result);
    renderOutput(result);
    renderAdc(result);
    renderInspector(result);
    view.sampleStatus.textContent = `frame ${String(state.frame).padStart(3, "0")} · synthetic`;
  }

  function nextFrame() {
    state.frame += 1;
    drawNewNoise();
    renderLetterPicker();
    render();
  }

  function reset() {
    controls.illumination.value = "0.90";
    controls.ambient.value = "0.08";
    controls.noise.value = "0.075";
    controls.eventThreshold.value = "0.48";
    controls.bitFlip.value = "0.018";
    controls.gateThreshold.value = "0";
    controls.adcBits.value = "4";
    controls.adcVref.value = "1.20";
    state.letter = "G";
    state.customMap = null;
    state.frame = 1;
    state.activeLayer = "input";
    drawNewNoise();
    renderLetterPicker();
    render();
  }

  Object.values(controls).forEach((control) => control.addEventListener("input", render));
  document.querySelectorAll("[data-layer]").forEach((button) => button.addEventListener("click", () => {
    state.activeLayer = button.dataset.layer;
    renderInspector(state.result);
  }));
  $("run-button").addEventListener("click", nextFrame);
  $("reset-button").addEventListener("click", reset);

  drawNewNoise();
  renderLetterPicker();
  render();
})();
