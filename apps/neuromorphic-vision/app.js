(() => {
  "use strict";

  const MODEL = window.NEUROMORPHIC_MODEL;
  if (!MODEL) throw new Error("model-data.js did not load");

  const $ = (id) => document.getElementById(id);
  const FEATURE_CHANNELS = MODEL.featureNames.map((id) => ({
    id,
    route: id.startsWith("V") ? "vertical" : id.startsWith("H") ? "horizontal" : "diagonal"
  }));
  const FEATURE_PATHS = MODEL.featurePaths;
  const FEATURE_BY_NAME = new Map(FEATURE_PATHS.map((path, index) => [path.name, { ...path, index }]));
  const controls = {
    illumination: $("illumination"), ambient: $("ambient"), noise: $("noise"),
    eventThreshold: $("event-threshold"), bitFlip: $("bit-flip"), gateThreshold: $("gate-threshold"),
    adcBits: $("adc-bits"), adcVref: $("adc-vref")
  };
  const outputs = {
    illumination: $("illumination-value"), ambient: $("ambient-value"), noise: $("noise-value"),
    eventThreshold: $("event-threshold-value"), bitFlip: $("bit-flip-value"),
    gateThreshold: $("gate-threshold-value"), adcBits: $("adc-bits-value"), adcVref: $("adc-vref-value")
  };
  const view = {
    letterPicker: $("letter-picker"), inputLabel: $("input-label"), sensorGrid: $("sensor-grid"),
    eventGrid: $("event-grid"), eventCount: $("event-count"), projectionGeometry: $("projection-geometry"),
    fcMatrix: $("fc-matrix"), preactivationValues: $("preactivation-values"), gateChannels: $("gate-channels"),
    outputValue: $("output-value"), outputTerms: $("output-terms"), adcMode: $("adc-mode"),
    adcBinary: $("adc-binary"), adcCode: $("adc-code"), adcVoltage: $("adc-voltage"),
    decodedLetter: $("decoded-letter"), predictionPill: $("prediction-pill"), lutStrip: $("lut-strip"),
    sampleStatus: $("sample-status"), inspector: $("inspector")
  };
  const state = {
    letter: "G", customMap: null, frame: 1, randomTerms: [], activeLayer: "input",
    selectedFeature: "H1", result: null
  };

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const dot = (left, right) => left.reduce((sum, value, index) => sum + value * right[index], 0);
  const flatten = (matrix) => matrix.flat();
  const fmt = (value, digits = 3) => Number(value).toFixed(digits);
  const signed = (value, digits = 3) => `${value >= 0 ? "+" : ""}${fmt(value, digits)}`;
  const fractionForWeight = (weight) => `1/${Math.round(1 / weight)}`;
  const featureCode = (value) => Math.round(value * 32);
  const resistorCode = (code) => `${code > 0 ? "+" : ""}${code}/${MODEL.weightQuantization.signedMagnitudeLimit}`;

  function mulberry32(seed) {
    return function random() {
      let value = (seed += 0x6d2b79f5);
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(random) {
    return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
  }

  function getConfig() {
    return {
      illumination: Number(controls.illumination.value), ambient: Number(controls.ambient.value),
      noise: Number(controls.noise.value), eventThreshold: Number(controls.eventThreshold.value),
      bitFlip: Number(controls.bitFlip.value), gateThreshold: Number(controls.gateThreshold.value),
      adcBits: Number(controls.adcBits.value), adcVref: Number(controls.adcVref.value)
    };
  }

  function refreshControlLabels() {
    outputs.illumination.value = `${Number(controls.illumination.value).toFixed(2)} x`;
    outputs.ambient.value = Number(controls.ambient.value).toFixed(2);
    outputs.noise.value = Number(controls.noise.value).toFixed(3);
    outputs.eventThreshold.value = Number(controls.eventThreshold.value).toFixed(2);
    outputs.bitFlip.value = `${(Number(controls.bitFlip.value) * 100).toFixed(1)} %`;
    outputs.gateThreshold.value = signed(Number(controls.gateThreshold.value), 2);
    outputs.adcBits.value = `${controls.adcBits.value} bit`;
    outputs.adcVref.value = `${Number(controls.adcVref.value).toFixed(2)} V`;
  }

  function glyphToMap(glyph) { return glyph.map((row) => [...row].map(Number)); }
  function baseMap() { return state.customMap ? state.customMap.map((row) => row.slice()) : glyphToMap(MODEL.glyphs[state.letter]); }
  function drawNewNoise() {
    const random = mulberry32(20260804 + state.frame * 7919);
    state.randomTerms = Array.from({ length: 25 }, () => ({ noise: gaussian(random), flip: random() }));
  }

  function adcCenters(bits) {
    const maximum = 2 ** bits - 1;
    return MODEL.adcOrder.map((_, index) => Math.round(1 + index * (maximum - 1) / (MODEL.adcOrder.length - 1)));
  }

  function runPipeline() {
    const config = getConfig();
    const base = baseMap();
    const sensor = [];
    const event = [];
    let sampleIndex = 0;
    for (let row = 0; row < 5; row += 1) {
      const sensorRow = [];
      const eventRow = [];
      for (let col = 0; col < 5; col += 1) {
        const randomTerm = state.randomTerms[sampleIndex];
        const analog = config.ambient + config.illumination * base[row][col] + config.noise * randomTerm.noise;
        let eventState = analog >= config.eventThreshold;
        if (randomTerm.flip < config.bitFlip) eventState = !eventState;
        sensorRow.push(analog);
        eventRow.push(eventState ? 1 : 0);
        sampleIndex += 1;
      }
      sensor.push(sensorRow);
      event.push(eventRow);
    }

    const features = FEATURE_PATHS.map((path) => {
      const terms = path.cells.map(([row, col]) => {
        const input = event[row][col];
        const weight = MODEL.latinSquare[row][col];
        return { row, col, input, weight, contribution: input * weight };
      });
      const value = terms.reduce((sum, term) => sum + term.contribution, 0);
      return { name: path.name, cells: path.cells, terms, value, code: featureCode(value) };
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
    return { config, base, sensor, event, features, featureValues, preactivations, gates, terms, output, adcCode, maximumCode, centers, decoded: MODEL.adcOrder[orderIndex] };
  }

  function renderLetterPicker() {
    view.letterPicker.innerHTML = MODEL.classes.map((letter) => `<button class="letter-option ${state.letter === letter && !state.customMap ? "is-active" : ""}" type="button" data-letter="${letter}">${letter}</button>`).join("");
    view.letterPicker.querySelectorAll("[data-letter]").forEach((button) => button.addEventListener("click", () => {
      state.letter = button.dataset.letter;
      state.customMap = null;
      nextFrame();
    }));
  }

  function renderInput(result) {
    view.inputLabel.textContent = state.customMap ? "custom 5 x 5 map" : `${state.letter} glyph`;
    view.sensorGrid.innerHTML = flatten(result.sensor).map((value, index) => {
      const clipped = clamp(value, 0, 1);
      const shade = Math.round(16 + clipped * 174);
      return `<button type="button" class="sensor-cell" data-cell="${index}" style="--intensity:${shade};--signal:${clipped.toFixed(3)}" aria-label="Sensor cell ${Math.floor(index / 5) + 1}, ${index % 5 + 1}; ${fmt(clipped, 2)}"><span>${fmt(clipped, 2)}</span></button>`;
    }).join("");
    view.sensorGrid.querySelectorAll("[data-cell]").forEach((cell) => cell.addEventListener("click", () => {
      const index = Number(cell.dataset.cell);
      const map = baseMap();
      map[Math.floor(index / 5)][index % 5] = map[Math.floor(index / 5)][index % 5] ? 0 : 1;
      state.customMap = map;
      state.letter = "custom";
      renderLetterPicker();
      render();
    }));
  }

  function renderEvent(result) {
    const count = flatten(result.event).reduce((sum, value) => sum + value, 0);
    view.eventCount.textContent = `${count} / 25 ON`;
    view.eventGrid.innerHTML = flatten(result.event).map((value) => `<div class="event-cell ${value ? "is-lrs" : ""}"><span>${value ? "1" : "0"}</span></div>`).join("");
  }

  function routeArrow(direction) {
    const paths = {
      horizontal: "M2 8h12m-4-4 4 4-4 4",
      vertical: "M8 2v12m-4-4 4 4 4-4",
      diagonalLeft: "M14 14 3 3m0 6V3h6",
      diagonalRight: "M2 14 13 3m-6 0h6v6"
    };
    return `<svg class="route-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="${paths[direction]}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function renderFeatures(result) {
    const selected = result.features.find((feature) => feature.name === state.selectedFeature) || result.features[0];
    const selectedCells = new Set(selected.cells.map(([row, col]) => `${row}-${col}`));
    const featureFor = (name) => result.features.find((feature) => feature.name === name);
    const token = (name, direction, diagonal = false) => {
      const feature = featureFor(name);
      const active = feature.name === selected.name;
      return `<button class="route-token route-${direction}${diagonal ? " route-diagonal" : ""}${active ? " is-selected" : ""}" type="button" data-feature="${feature.name}" aria-pressed="${active}">${routeArrow(direction)}<strong>${feature.name}</strong><span class="route-value">${fmt(feature.value, 4)}</span><small>${feature.code} / 32</small></button>`;
    };
    const source = flatten(result.event).map((input, index) => {
      const row = Math.floor(index / 5);
      const col = index % 5;
      const weight = MODEL.latinSquare[row][col];
      const contribution = input * weight;
      const selectedCell = selectedCells.has(`${row}-${col}`);
      return `<span class="projection-cell ${input ? "is-lrs" : ""} ${selectedCell ? "is-selected-path" : ""}"><strong>${input}</strong><small>x ${fractionForWeight(weight)}</small><em>${selectedCell ? fmt(contribution, 4) : ""}</em></span>`;
    }).join("");
    const equation = selected.terms.map((term) => `${term.input}x${fractionForWeight(term.weight)}`).join(" + ");
    view.projectionGeometry.innerHTML = `<div class="route-group route-group-diagonal-left">${token("D1", "diagonalLeft", true)}</div><div class="route-group route-group-diagonal-right">${token("D2", "diagonalRight", true)}</div><div class="projection-source"><div class="projection-source-label"><span>input x fixed Latin weight</span><strong>selected ${selected.name}</strong></div><div class="projection-grid">${source}</div></div><div class="route-group route-group-horizontal">${token("H1", "horizontal")}${token("H2", "horizontal")}${token("H3", "horizontal")}</div><div class="route-group route-group-vertical">${token("V1", "vertical")}${token("V2", "vertical")}${token("V3", "vertical")}</div><div class="projection-equation"><strong>${selected.name}</strong><span>${equation}</span><b>= ${selected.code} / 32 = ${fmt(selected.value, 4)} VREF</b></div>`;
    view.projectionGeometry.querySelectorAll("[data-feature]").forEach((button) => button.addEventListener("click", () => {
      state.selectedFeature = button.dataset.feature;
      renderFeatures(result);
      if (state.activeLayer === "features") renderInspector(result);
    }));
  }

  function renderFc(result) {
    const contributions = MODEL.model.w1.map((weights, feature) => weights.map((weight) => weight * result.featureValues[feature]));
    const extent = Math.max(...flatten(contributions).map((value) => Math.abs(value)), 1e-6);
    let html = "<div class=\"matrix-label is-header\">input feature</div>";
    for (let node = 0; node < 4; node += 1) html += `<div class="matrix-label is-header">z${node + 1}</div>`;
    contributions.forEach((row, feature) => {
      const channel = FEATURE_CHANNELS[feature].id;
      const featureValue = result.featureValues[feature];
      const code = result.features[feature].code;
      html += `<div class="matrix-label"><strong>${channel}</strong><small>F = ${fmt(featureValue, 4)}</small><small>${code} / 32 VREF</small></div>`;
      row.forEach((value, node) => {
        const alpha = Math.min(Math.abs(value) / extent, 1).toFixed(3);
        const weight = MODEL.model.w1[feature][node];
        const code = MODEL.weightQuantization.w1Codes[feature][node];
        html += `<div class="matrix-cell ${value < 0 ? "is-negative" : ""}" style="--weight-alpha:${alpha}" aria-label="${channel} to z${node + 1}; feature ${fmt(featureValue, 4)}; 5-bit conductance code ${resistorCode(code)}; calibrated weight ${signed(weight)}; product ${signed(value)}"><strong>F = ${fmt(featureValue, 3)}</strong><small>5b G-code ${resistorCode(code)}</small><small>w = ${signed(weight, 3)}</small><em>F × w = ${signed(value, 3)}</em></div>`;
      });
    });
    view.fcMatrix.innerHTML = html;
    view.preactivationValues.innerHTML = result.preactivations.map((value, node) => {
      const sum = value - MODEL.model.b1[node];
      return `<div><span>z${node + 1} = Σ(F×w) + b${node + 1}</span><strong>${signed(value)}</strong><small>Σ = ${signed(sum)}; b${node + 1} = ${signed(MODEL.model.b1[node])}</small></div>`;
    }).join("");
  }

  function renderGates(result) {
    const height = Math.max(1, ...result.gates.map((gate) => gate.output));
    view.gateChannels.innerHTML = result.gates.map((gate, node) => `<div class="gate-channel ${gate.state === "LRS" ? "is-lrs" : ""}"><div class="gate-row"><strong>h${node + 1}</strong><strong class="gate-state">${gate.state}</strong></div><div class="gate-row"><span>z${node + 1} - theta</span><strong>${signed(gate.z - result.config.gateThreshold)}</strong></div><div class="gate-meter"><i style="width:${(gate.output / height * 100).toFixed(1)}%"></i></div><div class="gate-row"><span>buffered y${node + 1}</span><strong>${fmt(gate.output)}</strong></div></div>`).join("");
  }

  function renderOutput(result) {
    view.outputValue.textContent = signed(result.output);
    view.outputTerms.innerHTML = result.terms.map((term, node) => `<div class="output-term"><span>y${node + 1} = ${fmt(result.gates[node].output)}</span><small>5b G-code ${resistorCode(MODEL.weightQuantization.w2Codes[node])}; w = ${signed(MODEL.model.w2[node])}</small><strong>y × w = ${signed(term)}</strong></div>`).join("");
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

  function dataBlock(label, value) { return `<div class="inspector-data"><em>${label}</em>${value}</div>`; }

  function renderInspector(result) {
    const layer = state.activeLayer;
    const headers = { input: "01 - Photodiode input data", event: "02 - RRAM threshold-event data", features: "03 - Fixed Latin-square directional sums", fc: "04 - 8 x 4 analog MAC data", gate: "05 - RRAM-gated analog ReLU data", output: "06 - Final analog-adder data", adc: "07 - ADC code and decoder data" };
    const explanations = {
      input: "The selected glyph receives illumination, ambient offset, and one retained synthetic noise realization.",
      event: "A cell becomes LRS when the analog input crosses the event threshold; its uncertainty draw can invert the state.",
      features: "One fixed Latin square supplies 1/2, 1/4, 1/8, 1/16, and 1/32 once on every selected five-cell path. Click a V/H/D token to highlight its terms and exact sum.",
      fc: "Every MAC tile explicitly gives the raw feature Fk, the signed 5-bit conductance code, its calibrated wkj, and Fk × wkj. A code from -15 to +15 selects the negative or positive resistor branch and a 0-to-15 conductance magnitude.",
      gate: "Below theta the binary RRAM state is HRS and the buffered analog remainder is zero; above theta it is LRS.",
      output: "Four buffered hidden outputs are multiplied by their output weights and added with b2 before final conversion.",
      adc: "The scalar is clipped to the model range [-1, +1], quantized by the selectable ADC, then mapped through reserved class-code centers."
    };
    let blocks = [];
    if (layer === "input") {
      blocks = result.sensor.map((row, index) => dataBlock(`row ${index + 1}`, row.map((value) => fmt(clamp(value, 0, 1), 2)).join(" | ")));
    } else if (layer === "event") {
      blocks = result.event.map((row, index) => dataBlock(`row ${index + 1}`, row.map((value) => value ? "LRS" : "HRS").join(" | ")));
    } else if (layer === "features") {
      blocks = result.features.map((feature) => dataBlock(`${feature.name}${feature.name === state.selectedFeature ? " - selected" : ""}`, `${feature.terms.map((term) => `${term.input}x${fractionForWeight(term.weight)}`).join(" + ")} = ${feature.code}/32 = ${fmt(feature.value, 4)}`));
    } else if (layer === "fc") {
      blocks = result.preactivations.map((value, node) => dataBlock(`z${node + 1}`, `F = [${result.featureValues.map((feature) => fmt(feature, 3)).join(", ")}]; G-code = [${MODEL.weightQuantization.w1Codes.map((codes) => resistorCode(codes[node])).join(", ")}]; w = [${MODEL.model.w1.map((weights) => signed(weights[node], 3)).join(", ")}]; Σ(F×w) = ${signed(value - MODEL.model.b1[node])}; b = ${signed(MODEL.model.b1[node])}; z = ${signed(value)}`));
    } else if (layer === "gate") {
      blocks = result.gates.map((gate, node) => dataBlock(`h${node + 1} - ${gate.state}`, `z = ${signed(gate.z)}; theta = ${signed(result.config.gateThreshold)}; y = ${fmt(gate.output)}`));
    } else if (layer === "output") {
      blocks = result.terms.map((term, node) => dataBlock(`adder input ${node + 1}`, `y${node + 1} = ${fmt(result.gates[node].output)}; 5b G-code = ${resistorCode(MODEL.weightQuantization.w2Codes[node])}; w${node + 1} = ${signed(MODEL.model.w2[node])}; y×w = ${signed(term)}`));
      blocks.push(dataBlock("b2 / z out", `b2 = ${signed(MODEL.model.b2)}; z_out = ${signed(result.output)}`));
    } else if (layer === "adc") {
      blocks = MODEL.adcOrder.map((letter, index) => dataBlock(`${letter} center`, `ADC code ${result.centers[index]}${letter === result.decoded ? " - selected" : ""}`));
      blocks.push(dataBlock("current conversion", `${result.config.adcBits}-bit; ${result.adcCode}/${result.maximumCode}; ${result.decoded}`));
    }
    view.inspector.innerHTML = `<h3>${headers[layer]}</h3><p>${explanations[layer]}</p><div class="inspector-grid">${blocks.join("")}</div>`;
  }

  function render() {
    refreshControlLabels();
    const result = runPipeline();
    state.result = result;
    renderInput(result);
    renderEvent(result);
    renderFeatures(result);
    renderFc(result);
    renderGates(result);
    renderOutput(result);
    renderAdc(result);
    renderInspector(result);
    view.sampleStatus.textContent = `frame ${String(state.frame).padStart(3, "0")} - synthetic`;
  }

  function nextFrame() {
    state.frame += 1;
    drawNewNoise();
    renderLetterPicker();
    render();
  }

  function reset() {
    controls.illumination.value = "0.90"; controls.ambient.value = "0.08"; controls.noise.value = "0.075";
    controls.eventThreshold.value = "0.48"; controls.bitFlip.value = "0.018"; controls.gateThreshold.value = "0";
    controls.adcBits.value = "4"; controls.adcVref.value = "1.20";
    state.letter = "G"; state.customMap = null; state.frame = 1; state.activeLayer = "input"; state.selectedFeature = "H1";
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
