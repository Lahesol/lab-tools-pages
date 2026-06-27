const references = [
  {
    title: "snnTorch / surrogate-gradient SNN training",
    url: "https://snntorch.readthedocs.io/en/latest/",
    note: "PyTorch-native SNN library. Good first backend for LIF, CSNN, surrogate gradients, and trained SNN comparison.",
  },
  {
    title: "SpikingJelly framework",
    url: "https://spikingjelly.readthedocs.io/",
    note: "Full-stack PyTorch SNN framework with neuromorphic datasets, ANN-to-SNN conversion, STDP, and energy/operator counting.",
  },
  {
    title: "Tonic neuromorphic datasets",
    url: "https://tonic.readthedocs.io/en/latest/",
    note: "Dataset and transform loader for N-MNIST, DVS Gesture, SHD, CIFAR10-DVS, and event-frame conversions.",
  },
  {
    title: "Brian2 simulator",
    url: "https://briansimulator.org/",
    note: "Equation-first SNN simulator. Useful for checking custom device-current-to-LIF equations before ML training.",
  },
  {
    title: "Training SNNs Using Lessons From Deep Learning",
    url: "https://arxiv.org/abs/2109.12894",
    note: "snnTorch tutorial paper. Useful for surrogate gradients, spike encoding, and training workflow framing.",
  },
  {
    title: "Photonic Integrated Neuro-Synaptic Core for CSNN",
    url: "https://arxiv.org/abs/2306.02724",
    note: "Architectural reference for photonic synapse blocks, convolutional SNN mapping, and MNIST-level demonstration.",
  },
  {
    title: "Heidelberg Spiking Datasets",
    url: "https://arxiv.org/abs/1910.07407",
    note: "Spike-timing benchmark dataset. Relevant when the claim is temporal STM/LTM memory, not only image classification.",
  },
  {
    title: "ANN/SNN comparison on neuromorphic datasets",
    url: "https://arxiv.org/abs/2005.02183",
    note: "Baseline reference for comparing ANN/RNN/SNN on N-MNIST and DVS Gesture under controlled temporal settings.",
  },
];

const defaults = {
  activeTab: "uv",
  programMode: "pwm",
  frequency: 8,
  duty: 35,
  pulseCount: 40,
  intensity: 0.8,
  switchMethod: "vds",
  defaultMemoryMode: "STM",
  applyTarget: "all",
  tiaEnabled: true,
  tiaGain: 100,
  selectedLayer: 0,
  traceLayer: 1,
  traceDevices: 12,
  deviceVariation: 8,
  annPreset: "mlp",
  annDataset: "mnist",
  annEncoding: "rate",
  snnPreset: "lif",
  snnDataset: "nmnist",
  snnEncoding: "rate",
  layers: [
    { name: "Input", role: "input", devices: 16, mode: "STM", switchMethod: "vds", tia: true },
    { name: "Hidden A", role: "hidden", devices: 32, mode: "adaptive", switchMethod: "vds", tia: true },
    { name: "Hidden B", role: "hidden", devices: 16, mode: "LTM", switchMethod: "gate", tia: true },
    { name: "Output", role: "output", devices: 4, mode: "LTM", switchMethod: "gate", tia: false },
  ],
};

const state = structuredClone(defaults);

let latestTimeline = [];
let latestAnn = null;
let latestSnn = null;

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableVariation(layerIndex, deviceIndex) {
  const raw = Math.sin((layerIndex + 1) * 31.7 + (deviceIndex + 1) * 17.3) * 0.5 + 0.5;
  const span = state.deviceVariation / 100;
  return 1 + (raw * 2 - 1) * span;
}

function safeLayerIndex(index) {
  return clamp(Number(index) || 0, 0, Math.max(0, state.layers.length - 1));
}

function modeForLayer(layer, deviceIndex) {
  if (layer.mode !== "adaptive") return layer.mode;
  return deviceIndex % 2 === 0 ? "STM" : "LTM";
}

function switchText(method) {
  return method === "vds" ? "VDS -30/+30 V" : "Gate 10/40 V";
}

function routeShort(method) {
  return method === "vds" ? "VDS +/-30" : "Gate 10/40";
}

function readControls() {
  state.programMode = $("programMode").value;
  state.frequency = Number($("frequency").value);
  state.duty = Number($("duty").value);
  state.pulseCount = Number($("pulseCount").value);
  state.intensity = Number($("intensity").value);
  state.switchMethod = $("switchMethod").value;
  state.defaultMemoryMode = $("defaultMemoryMode").value;
  state.applyTarget = $("applyTarget").value;
  state.tiaEnabled = $("tiaEnabled").checked;
  state.tiaGain = Number($("tiaGain").value);
  state.traceLayer = safeLayerIndex($("traceLayerSelect").value);
  state.traceDevices = Number($("traceDevices").value);
  state.deviceVariation = Number($("deviceVariation").value);
  state.annPreset = $("annPreset").value;
  state.annDataset = $("annDataset").value;
  state.annEncoding = $("annEncoding").value;
  state.snnPreset = $("snnPreset").value;
  state.snnDataset = $("snnDataset").value;
  state.snnEncoding = $("snnEncoding").value;
}

function writeControls() {
  $("programMode").value = state.programMode;
  $("frequency").value = state.frequency;
  $("duty").value = state.duty;
  $("pulseCount").value = state.pulseCount;
  $("intensity").value = state.intensity;
  $("switchMethod").value = state.switchMethod;
  $("defaultMemoryMode").value = state.defaultMemoryMode;
  $("applyTarget").value = state.applyTarget;
  $("tiaEnabled").checked = state.tiaEnabled;
  $("tiaGain").value = state.tiaGain;
  $("traceDevices").value = state.traceDevices;
  $("deviceVariation").value = state.deviceVariation;
  $("annPreset").value = state.annPreset;
  $("annDataset").value = state.annDataset;
  $("annEncoding").value = state.annEncoding;
  $("snnPreset").value = state.snnPreset;
  $("snnDataset").value = state.snnDataset;
  $("snnEncoding").value = state.snnEncoding;
}

function updateTraceLayerOptions() {
  const select = $("traceLayerSelect");
  const current = safeLayerIndex(state.traceLayer);
  select.innerHTML = state.layers.map((layer, index) => (
    `<option value="${index}">${index + 1}. ${layer.name} (${layer.role})</option>`
  )).join("");
  state.traceLayer = safeLayerIndex(current);
  select.value = String(state.traceLayer);
}

function updateReadouts() {
  const traceLayer = state.layers[state.traceLayer] || state.layers[0];
  $("uvSummary").textContent = `365 nm ${state.programMode === "pwm" ? "PWM" : "on/off"}`;
  $("freqOut").textContent = `${state.frequency} Hz`;
  $("dutyOut").textContent = `${state.duty}%`;
  $("pulseCountOut").textContent = `${state.pulseCount}`;
  $("intensityOut").textContent = state.intensity.toFixed(2);
  $("tiaGainOut").textContent = `${state.tiaGain} kOhm`;
  $("traceDevicesOut").textContent = `${state.traceDevices}`;
  $("variationOut").textContent = `${state.deviceVariation}%`;
  $("traceSummary").textContent = traceLayer ? traceLayer.name : "Layer";
  $("summaryLayer").textContent = traceLayer ? traceLayer.name : "Layer";
  $("summaryInput").textContent = state.programMode === "pwm" ? "UV PWM" : "UV on/off table";
  $("summarySwitch").textContent = state.switchMethod === "vds" ? "VDS -30/+30" : "Gate 10/40";
  $("modeControlSummary").textContent = state.defaultMemoryMode;
}

function generateTimeline() {
  const period = 1 / state.frequency;
  const onTime = period * state.duty / 100;
  const totalTime = Math.max(0.75, state.pulseCount * period + period * 1.75);
  const samples = 1100;
  const points = [];

  for (let i = 0; i < samples; i += 1) {
    const t = totalTime * i / (samples - 1);
    let uv = 0;
    let pulseIndex = 0;
    let phase = 0;

    if (state.programMode === "pwm") {
      pulseIndex = Math.floor(t / period);
      phase = t - pulseIndex * period;
      uv = pulseIndex < state.pulseCount && phase <= onTime ? state.intensity : 0;
    } else {
      const slot = Math.floor(t / (period * 2.25));
      const local = t - slot * period * 2.25;
      const dynamicOn = onTime * (0.7 + (slot % 3) * 0.25);
      const dynamicAmp = state.intensity * (0.72 + (slot % 4) * 0.08);
      pulseIndex = slot;
      phase = local;
      uv = slot < Math.ceil(state.pulseCount / 4) && local <= dynamicOn ? dynamicAmp : 0;
    }

    points.push({ t, uv, pulseIndex, phase });
  }

  latestTimeline = points;
  return points;
}

function buildTimingRows() {
  const tbody = $("timingTable");
  tbody.innerHTML = "";
  const period = 1 / state.frequency;
  const onTime = period * state.duty / 100;
  const rows = state.programMode === "pwm" ? 10 : 8;

  for (let i = 0; i < rows; i += 1) {
    const start = state.programMode === "pwm" ? i * period : i * period * 2.25;
    const on = state.programMode === "pwm" ? onTime : onTime * (0.7 + (i % 3) * 0.25);
    const off = state.programMode === "pwm" ? period - onTime : period * 2.25 - on;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${start.toFixed(3)} s</td><td>${on.toFixed(3)} s</td><td>${off.toFixed(3)} s</td>`;
    tbody.appendChild(tr);
  }
}

function deviceParams(mode, method, layerIndex, deviceIndex) {
  const isLtm = mode === "LTM";
  const routeGain = method === "gate" ? 1.12 : 1;
  const routePersistence = method === "gate" ? 1.18 : 1;
  const variation = stableVariation(layerIndex, deviceIndex);
  return {
    gain: (isLtm ? 118 : 84) * routeGain * variation,
    dark: (isLtm ? 2.2 : 1.1) * variation,
    tauRise: isLtm ? 0.075 : 0.032,
    tauDecay: (isLtm ? 2.8 : 0.34) * routePersistence,
    retention: isLtm ? 0.26 * routePersistence : 0.035,
    noise: 0.9 + layerIndex * 0.12,
  };
}

function encodedInput(point, kind) {
  const normUv = state.intensity > 0 ? point.uv / state.intensity : 0;
  if (kind === "ann") {
    if (state.annEncoding === "amplitude") return normUv * state.intensity;
    if (state.annEncoding === "latency") {
      const onset = point.uv > 0 ? Math.max(0.2, 1 - point.phase * state.frequency * 2) : 0;
      return normUv * onset;
    }
    return normUv;
  }

  if (state.snnEncoding === "ttfs") {
    const onset = point.uv > 0 ? Math.max(0.12, 1 - point.phase * state.frequency * 2.8) : 0;
    return normUv * onset;
  }
  if (state.snnEncoding === "phase") {
    const phaseGate = point.uv > 0 ? 0.55 + 0.45 * Math.sin(point.phase * state.frequency * Math.PI * 2) : 0;
    return normUv * phaseGate;
  }
  return normUv;
}

function simulateDeviceTrace(timeline, drive, layer, layerIndex, deviceIndex, kind) {
  const mode = modeForLayer(layer, deviceIndex);
  const params = deviceParams(mode, layer.switchMethod, layerIndex, deviceIndex);
  const trace = new Array(timeline.length);
  let current = params.dark;
  const roleGain = { input: 0.92, hidden: 1.04, output: 0.86 }[layer.role] || 1;
  const presetGain = kind === "ann"
    ? { mlp: 1, reservoir: 1.1, cnnproxy: 1.18 }[state.annPreset]
    : { lif: 1, csnn: 1.08, rsnn: 1.14 }[state.snnPreset];

  for (let i = 0; i < timeline.length; i += 1) {
    const dt = i === 0 ? 0 : timeline[i].t - timeline[i - 1].t;
    const opticalDrive = clamp(drive[i], 0, 1.8);
    const target = params.dark + opticalDrive * params.gain * roleGain * presetGain;
    const tau = target > current ? params.tauRise : params.tauDecay;
    const alpha = 1 - Math.exp(-dt / Math.max(0.001, tau));
    current += (target - current) * alpha;

    if (opticalDrive < 0.02) {
      const retained = params.dark + params.gain * params.retention;
      current = retained + (current - retained) * Math.exp(-dt / Math.max(0.001, params.tauDecay));
    }

    const ripple = Math.sin(i * 0.037 + deviceIndex * 1.7 + layerIndex) * params.noise;
    trace[i] = Math.max(0, current + ripple);
  }

  return { mode, trace };
}

function meanArray(traces) {
  if (!traces.length) return [];
  const out = new Array(traces[0].trace.length).fill(0);
  traces.forEach((device) => {
    device.trace.forEach((value, index) => {
      out[index] += value;
    });
  });
  return out.map((value) => value / traces.length);
}

function normalizeTrace(trace) {
  const peak = Math.max(...trace, 1);
  return trace.map((value) => clamp(value / peak, 0, 1.6));
}

function simulateArchitecture(kind) {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  let drive = timeline.map((point) => encodedInput(point, kind));
  const uvNorm = timeline.map((point) => state.intensity > 0 ? point.uv / state.intensity : 0);
  const layers = [];
  const architectureGain = kind === "ann" ? 1 : 0.92;

  state.layers.forEach((layer, layerIndex) => {
    const deviceCount = Math.min(layer.devices, Math.max(4, state.traceDevices));
    const blendedDrive = drive.map((value, index) => {
      const opticalFloor = layerIndex === 0 ? uvNorm[index] : uvNorm[index] * 0.18;
      return clamp(opticalFloor + value * architectureGain, 0, 1.8);
    });
    const devices = [];

    for (let deviceIndex = 0; deviceIndex < deviceCount; deviceIndex += 1) {
      devices.push(simulateDeviceTrace(timeline, blendedDrive, layer, layerIndex, deviceIndex, kind));
    }

    const mean = meanArray(devices);
    const peak = Math.max(...mean, 1);
    const residual = mean[mean.length - 1] / peak;
    const voltage = layer.tia && state.tiaEnabled
      ? mean.map((current) => -current * state.tiaGain * 1e-6)
      : mean.map((current) => current);
    const activation = normalizeTrace(mean).map((value) => 1 / (1 + Math.exp(-6 * (value - 0.48))));

    layers.push({
      config: layer,
      layerIndex,
      devices,
      mean,
      voltage,
      activation,
      peak,
      residual,
      displayedDevices: deviceCount,
    });

    drive = activation.map((value, index) => {
      const coupling = layer.role === "output" ? 0.7 : 0.86;
      const recurrent = kind === "snn" && state.snnPreset === "rsnn" ? Math.sin(index * 0.025) * 0.08 : 0;
      return clamp(value * coupling + recurrent, 0, 1.6);
    });
  });

  const result = {
    kind,
    timeline,
    layers,
    selected: layers[safeLayerIndex(state.traceLayer)] || layers[0],
    output: layers[layers.length - 1],
  };

  if (kind === "snn") addSnnDynamics(result);
  else addAnnReadout(result);

  return result;
}

function addAnnReadout(result) {
  const output = result.output;
  const datasetGain = { mnist: 0.92, uvtoy: 0.78, mitbih: 0.72 }[state.annDataset];
  const outputActivation = output.activation.map((value, index) => {
    const slowEnvelope = 0.08 * Math.sin(index * 0.014);
    return clamp(value * datasetGain + slowEnvelope, 0, 1);
  });
  const decisionMargin = outputActivation.map((value, index) => clamp(value - 0.42 + Math.sin(index * 0.01) * 0.08, 0, 1));
  result.readout = { outputActivation, decisionMargin };
}

function addSnnDynamics(result) {
  const selected = result.selected;
  const timeline = result.timeline;
  const threshold = state.snnPreset === "csnn" ? 1.08 : state.snnPreset === "rsnn" ? 0.96 : 1;
  const tauMem = state.snnEncoding === "ttfs" ? 0.022 : 0.035;
  const spikes = [];
  const membranes = [];
  const layerBins = result.layers.map(() => new Array(36).fill(0));
  const totalTime = timeline[timeline.length - 1]?.t || 1;

  selected.devices.forEach((device, deviceIndex) => {
    let v = 0;
    const membrane = [];
    const deviceSpikes = [];
    const peak = Math.max(...device.trace, 1);
    for (let i = 0; i < timeline.length; i += 1) {
      const dt = i === 0 ? 0 : timeline[i].t - timeline[i - 1].t;
      const input = device.trace[i] / peak;
      v = v * Math.exp(-dt / tauMem) + input * (state.snnEncoding === "phase" ? 0.36 : 0.31);
      if (v >= threshold) {
        const t = timeline[i].t;
        deviceSpikes.push(t);
        v = 0.18;
      }
      membrane.push(v);
    }
    spikes.push({ deviceIndex, times: deviceSpikes });
    membranes.push(membrane);
  });

  result.layers.forEach((layer, layerIndex) => {
    const peak = Math.max(...layer.mean, 1);
    let v = 0;
    layer.mean.forEach((current, index) => {
      const dt = index === 0 ? 0 : timeline[index].t - timeline[index - 1].t;
      v = v * Math.exp(-dt / tauMem) + (current / peak) * 0.28;
      if (v >= threshold) {
        const bin = clamp(Math.floor((timeline[index].t / totalTime) * layerBins[layerIndex].length), 0, layerBins[layerIndex].length - 1);
        layerBins[layerIndex][bin] += Math.max(1, Math.round(layer.config.devices / Math.max(1, layer.displayedDevices)));
        v = 0.18;
      }
    });
  });

  result.spikes = spikes;
  result.membranes = membranes;
  result.layerBins = layerBins;
  result.spikeCount = spikes.reduce((sum, device) => sum + device.times.length, 0);
}

function updateMetrics(result) {
  const total = state.layers.reduce((sum, layer) => sum + layer.devices, 0);
  let stm = 0;
  let ltm = 0;

  state.layers.forEach((layer) => {
    if (layer.mode === "STM") stm += layer.devices;
    else if (layer.mode === "LTM") ltm += layer.devices;
    else {
      stm += Math.ceil(layer.devices / 2);
      ltm += Math.floor(layer.devices / 2);
    }
  });

  const selected = result?.selected || latestAnn?.selected;
  const peak = selected ? selected.peak : 0;
  const tiaSwing = selected && selected.config.tia && state.tiaEnabled ? peak * state.tiaGain * 1e-6 : 0;
  const totalEvents = latestSnn?.spikeCount || 0;
  const duration = latestTimeline[latestTimeline.length - 1]?.t || 1;
  const spikeRate = latestSnn?.selected
    ? latestSnn.spikeCount / Math.max(1, latestSnn.selected.displayedDevices) / duration
    : 0;

  $("totalDevices").textContent = total;
  $("modeMix").textContent = `${stm} / ${ltm}`;
  $("peakCurrent").textContent = `${round(peak, 1)} nA`;
  $("eventCount").textContent = state.activeTab === "snn" ? `${totalEvents}` : `${Math.round((latestAnn?.readout?.decisionMargin || []).filter((v) => v > 0.5).length / 10)}`;
  $("summaryArchitecture").textContent = `${state.layers.length} layers / ${total} devices`;
  $("layerPeakCurrent").textContent = `${round(peak, 1)} nA`;
  $("layerResidual").textContent = `${round((selected?.residual || 0) * 100, 1)}%`;
  $("layerTiaSwing").textContent = selected?.config.tia && state.tiaEnabled ? `${round(tiaSwing, 4)} V` : "TIA off";
  $("layerSpikeRate").textContent = `${round(spikeRate, 2)} Hz`;
  $("selectedModeBadge").textContent = selected ? `${selected.config.mode} / ${routeShort(selected.config.switchMethod)}` : "STM/LTM";
}

function renderBlocks() {
  const canvas = $("blockCanvas");
  canvas.innerHTML = "";

  state.layers.forEach((layer, layerIndex) => {
    const row = document.createElement("div");
    row.className = `layer-row ${layerIndex === state.selectedLayer ? "selected" : ""}`;

    const label = document.createElement("button");
    label.type = "button";
    label.className = "layer-label";
    label.innerHTML = `<span>${layer.name}</span><small>${layer.role} / ${layer.devices} devices</small>`;
    label.addEventListener("click", () => selectLayer(layerIndex));

    const grid = document.createElement("div");
    grid.className = "device-grid";
    const visible = Math.min(layer.devices, 32);

    for (let i = 0; i < visible; i += 1) {
      const mode = modeForLayer(layer, i);
      const block = document.createElement("button");
      block.type = "button";
      block.className = `device-block ${mode.toLowerCase()} ${layerIndex === state.traceLayer ? "trace-target" : ""}`;
      block.innerHTML = `<strong>${mode}</strong><em>${routeShort(layer.switchMethod)}</em><em>${layer.tia ? "TIA on" : "TIA off"}</em>`;
      block.addEventListener("click", () => {
        state.selectedLayer = layerIndex;
        state.traceLayer = layerIndex;
        updateTraceLayerOptions();
        updateSelectedLayer();
        runAllSimulations();
      });
      grid.appendChild(block);
    }

    if (layer.devices > visible) {
      const more = document.createElement("div");
      more.className = "device-block adaptive more";
      more.innerHTML = `<strong>+${layer.devices - visible}</strong><em>more devices</em>`;
      grid.appendChild(more);
    }

    row.append(label, grid);
    canvas.appendChild(row);
  });

  updateSelectedLayer();
}

function renderArchitecture(containerId, result) {
  const container = $(containerId);
  if (!container || !result) return;
  container.innerHTML = "";
  result.layers.forEach((layerResult, index) => {
    const layer = layerResult.config;
    const article = document.createElement("button");
    article.type = "button";
    article.className = `arch-node ${index === state.traceLayer ? "active" : ""}`;
    article.innerHTML = `
      <span class="node-index">L${index + 1}</span>
      <strong>${layer.name}</strong>
      <small>${layer.role} / ${layer.devices} devices</small>
      <span class="node-meta">${layer.mode} · ${routeShort(layer.switchMethod)} · ${layer.tia ? "TIA" : "Iout"}</span>
      <span class="node-value">${round(layerResult.peak, 1)} nA peak</span>
    `;
    article.addEventListener("click", () => {
      state.traceLayer = index;
      state.selectedLayer = index;
      updateTraceLayerOptions();
      updateSelectedLayer();
      runAllSimulations();
    });
    container.appendChild(article);

    if (index < result.layers.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "arch-arrow";
      arrow.textContent = "->";
      container.appendChild(arrow);
    }
  });
}

function selectLayer(index) {
  state.selectedLayer = safeLayerIndex(index);
  state.traceLayer = state.selectedLayer;
  updateTraceLayerOptions();
  updateSelectedLayer();
  runAllSimulations();
}

function updateSelectedLayer() {
  const layer = state.layers[state.selectedLayer];
  if (!layer) return;
  $("selectedLayerName").textContent = layer.name;
  $("selectedLayerDevices").textContent = layer.devices;
  $("selectedLayerMode").textContent = layer.mode;
  $("selectedLayerSwitch").textContent = layer.switchMethod === "vds" ? "VDS" : "Gate";
  $("selectedLayerTia").textContent = layer.tia ? "On" : "Off";
  $("layerDevices").value = layer.devices;
  $("layerRole").value = layer.role;
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const fallbackHeight = Number(canvas.getAttribute("height")) || 360;
  const width = Math.max(320, rect.width || Number(canvas.getAttribute("width")) || 980);
  const height = Math.max(240, rect.height || fallbackHeight);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function drawGrid(ctx, plot, rows = 4, cols = 6) {
  ctx.strokeStyle = "#dce6ed";
  ctx.lineWidth = 1;
  for (let i = 0; i <= rows; i += 1) {
    const y = lerp(plot.top, plot.bottom, i / rows);
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
  }
  for (let i = 0; i <= cols; i += 1) {
    const x = lerp(plot.left, plot.right, i / cols);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
  }
  ctx.strokeStyle = "#b7c7d2";
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
}

function drawPlotTitle(ctx, title, subtitle, x = 18, y = 22) {
  ctx.fillStyle = "#1d3342";
  ctx.font = "800 14px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(title, x, y);
  if (subtitle) {
    ctx.fillStyle = "#627381";
    ctx.font = "11px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText(subtitle, x, y + 17);
  }
}

function timeToX(t, timeline, plot) {
  const maxT = timeline[timeline.length - 1]?.t || 1;
  return plot.left + (t / maxT) * (plot.right - plot.left);
}

function valueToY(value, min, max, plot) {
  if (max === min) return plot.bottom;
  return plot.bottom - ((value - min) / (max - min)) * (plot.bottom - plot.top);
}

function drawLine(ctx, timeline, values, plot, min, max, color, width = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = timeToX(timeline[index].t, timeline, plot);
    const y = valueToY(value, min, max, plot);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawAxis(ctx, timeline, plot, yMax, yLabel) {
  const maxT = timeline[timeline.length - 1]?.t || 1;
  ctx.fillStyle = "#667887";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const x = lerp(plot.left, plot.right, i / 4);
    ctx.fillText(`${round(maxT * i / 4, 2)}s`, x - 12, plot.bottom + 18);
    const y = lerp(plot.bottom, plot.top, i / 4);
    ctx.fillText(`${round(yMax * i / 4, 2)}`, plot.left - 44, y + 3);
  }
  ctx.save();
  ctx.translate(13, (plot.top + plot.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawUvCanvas() {
  const canvas = $("uvCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const plot = { left: 58, right: width - 18, top: 44, bottom: height - 38 };
  const uv = latestTimeline.map((p) => p.uv);
  const maxUv = Math.max(state.intensity * 1.2, 1);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "UV optical input", `${state.programMode === "pwm" ? "PWM train" : "programmed on/off"} · 365 nm · ${state.frequency} Hz`);
  drawGrid(ctx, plot);
  drawLine(ctx, latestTimeline, uv, plot, 0, maxUv, "#7b2ff2", 2.2);
  drawAxis(ctx, latestTimeline, plot, maxUv, "Intensity");
}

function drawTransientTrace(canvasId, result, options) {
  const canvas = $(canvasId);
  const { ctx, width, height } = setupCanvas(canvas);
  const timeline = result.timeline;
  const selected = result.selected;
  const uv = timeline.map((p) => p.uv);
  const uvPlot = { left: 58, right: width - 20, top: 50, bottom: 128 };
  const currentPlot = { left: 58, right: width - 20, top: 170, bottom: Math.max(280, height - 150) };
  const outputPlot = { left: 58, right: width - 20, top: height - 108, bottom: height - 42 };
  const currentMax = Math.max(...selected.devices.flatMap((d) => d.trace), selected.peak, 1) * 1.12;
  const outputTrace = options.outputTrace || selected.voltage;
  const outputMax = Math.max(...outputTrace.map((value) => Math.abs(value)), 0.001);

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, options.title, options.subtitle);

  drawGrid(ctx, uvPlot, 2, 6);
  drawLine(ctx, timeline, uv, uvPlot, 0, Math.max(1, state.intensity * 1.2), "#7b2ff2", 2);
  ctx.fillStyle = "#607382";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("UV input", uvPlot.left, uvPlot.top - 8);

  drawGrid(ctx, currentPlot, 4, 6);
  selected.devices.slice(0, state.traceDevices).forEach((device, index) => {
    const color = device.mode === "LTM" ? "#0b61b5" : "#0f9d91";
    drawLine(ctx, timeline, device.trace, currentPlot, 0, currentMax, color, 1, index === 0 ? 0.58 : 0.22);
  });
  drawLine(ctx, timeline, selected.mean, currentPlot, 0, currentMax, "#102f3f", 2.4);
  drawAxis(ctx, timeline, currentPlot, currentMax, "I_photo (nA)");

  drawGrid(ctx, outputPlot, 2, 6);
  if (options.bipolar) {
    drawLine(ctx, timeline, outputTrace, outputPlot, -outputMax, outputMax, options.outputColor, 2);
    drawAxis(ctx, timeline, outputPlot, outputMax, options.outputLabel);
  } else {
    drawLine(ctx, timeline, outputTrace, outputPlot, 0, outputMax, options.outputColor, 2);
    drawAxis(ctx, timeline, outputPlot, outputMax, options.outputLabel);
  }
}

function currentColor(value, max) {
  const x = clamp(value / Math.max(max, 1), 0, 1);
  const r = Math.round(238 - x * 210);
  const g = Math.round(246 - x * 92);
  const b = Math.round(250 - x * 94);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawHeatmap() {
  const canvas = $("annHeatmapCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const selected = latestAnn.selected;
  const timeline = latestAnn.timeline;
  const plot = { left: 60, right: width - 18, top: 30, bottom: height - 34 };
  const rows = selected.devices.length;
  const cols = 240;
  const cellW = (plot.right - plot.left) / cols;
  const cellH = (plot.bottom - plot.top) / rows;
  const maxCurrent = Math.max(...selected.devices.flatMap((device) => device.trace), 1);

  $("annHeatmapLabel").textContent = selected.config.name;
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Current heatmap", "rows = displayed devices, columns = time", 18, 22);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const index = Math.floor(col * (timeline.length - 1) / (cols - 1));
      ctx.fillStyle = currentColor(selected.devices[row].trace[index], maxCurrent);
      ctx.fillRect(plot.left + col * cellW, plot.top + row * cellH, Math.ceil(cellW), Math.ceil(cellH));
    }
  }

  ctx.strokeStyle = "#b7c7d2";
  ctx.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  for (let row = 0; row < rows; row += 4) {
    ctx.fillText(`D${row + 1}`, 22, plot.top + row * cellH + 10);
  }
  drawTimeLabels(ctx, timeline, plot);
}

function drawAnnReadout() {
  const canvas = $("annReadoutCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const timeline = latestAnn.timeline;
  const plot = { left: 58, right: width - 18, top: 48, bottom: height - 38 };

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Analog readout", "layer activation and output decision margin");
  drawGrid(ctx, plot, 4, 6);

  latestAnn.layers.forEach((layer, index) => {
    const color = ["#0f9d91", "#0b61b5", "#7b2ff2", "#d98612", "#c34c3c"][index % 5];
    drawLine(ctx, timeline, layer.activation, plot, 0, 1, color, index === latestAnn.layers.length - 1 ? 2.4 : 1.3, index === latestAnn.layers.length - 1 ? 1 : 0.35);
  });
  drawLine(ctx, timeline, latestAnn.readout.decisionMargin, plot, 0, 1, "#d98612", 2.2);
  drawAxis(ctx, timeline, plot, 1, "Activation");
}

function drawTimeLabels(ctx, timeline, plot) {
  const maxT = timeline[timeline.length - 1]?.t || 1;
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const x = lerp(plot.left, plot.right, i / 4);
    ctx.fillText(`${round(maxT * i / 4, 2)}s`, x - 12, plot.bottom + 18);
  }
}

function drawSnnTrace() {
  const selected = latestSnn.selected;
  const membrane = latestSnn.membranes[0] || selected.activation;
  drawTransientTrace("snnTraceCanvas", latestSnn, {
    title: "SNN synaptic response",
    subtitle: `${selected.config.name} · ${selected.config.mode} · ${routeShort(selected.config.switchMethod)}`,
    outputTrace: membrane,
    outputColor: "#7b2ff2",
    outputLabel: "V_mem",
    bipolar: false,
  });
}

function drawAnnTrace() {
  const selected = latestAnn.selected;
  drawTransientTrace("annTraceCanvas", latestAnn, {
    title: "ANN device transient",
    subtitle: `${selected.config.name} · ${selected.config.mode} · ${routeShort(selected.config.switchMethod)}`,
    outputTrace: selected.config.tia && state.tiaEnabled ? selected.voltage.map((value) => Math.abs(value)) : selected.activation,
    outputColor: "#d98612",
    outputLabel: selected.config.tia && state.tiaEnabled ? "|V_TIA| (V)" : "Activation",
    bipolar: false,
  });
}

function drawSnnRaster() {
  const canvas = $("snnRasterCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const timeline = latestSnn.timeline;
  const spikes = latestSnn.spikes;
  const plot = { left: 58, right: width - 18, top: 36, bottom: height - 34 };
  const rowH = (plot.bottom - plot.top) / Math.max(1, spikes.length);

  $("snnRasterLabel").textContent = latestSnn.selected.config.name;
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Spike raster", "tick = output spike from device current driven LIF neuron", 18, 22);
  drawGrid(ctx, plot, Math.min(8, spikes.length), 6);

  spikes.forEach((device, row) => {
    const y0 = plot.top + row * rowH;
    ctx.fillStyle = row % 2 ? "rgba(238, 246, 250, 0.55)" : "rgba(255,255,255,0)";
    ctx.fillRect(plot.left, y0, plot.right - plot.left, rowH);
    ctx.strokeStyle = device.times.length ? "#7b2ff2" : "#c8d5dd";
    ctx.lineWidth = 1.3;
    device.times.forEach((time) => {
      const x = timeToX(time, timeline, plot);
      ctx.beginPath();
      ctx.moveTo(x, y0 + 2);
      ctx.lineTo(x, y0 + rowH - 2);
      ctx.stroke();
    });
  });

  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  for (let row = 0; row < spikes.length; row += 4) {
    ctx.fillText(`D${row + 1}`, 22, plot.top + row * rowH + 10);
  }
  drawTimeLabels(ctx, timeline, plot);
}

function drawSnnReadout() {
  const canvas = $("snnReadoutCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const plot = { left: 58, right: width - 18, top: 48, bottom: height - 40 };
  const bins = latestSnn.layerBins;
  const maxBin = Math.max(...bins.flat(), 1);
  const binCount = bins[0]?.length || 1;
  const barW = (plot.right - plot.left) / binCount;

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Layer spike count", "binned event output by architecture layer");
  drawGrid(ctx, plot, 4, 6);

  bins.forEach((layerBins, layerIndex) => {
    const color = ["#0f9d91", "#0b61b5", "#7b2ff2", "#d98612", "#c34c3c"][layerIndex % 5];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28 + layerIndex * 0.11;
    layerBins.forEach((count, binIndex) => {
      const h = (count / maxBin) * (plot.bottom - plot.top);
      ctx.fillRect(plot.left + binIndex * barW, plot.bottom - h, Math.max(1, barW - 1), h);
    });
    ctx.globalAlpha = 1;
  });
  drawAxis(ctx, latestSnn.timeline, plot, maxBin, "Spikes/bin");
}

function drawAllActive() {
  drawUvCanvas();
  if (state.activeTab === "ann") {
    renderArchitecture("annArchitecture", latestAnn);
    drawAnnTrace();
    drawHeatmap();
    drawAnnReadout();
  }
  if (state.activeTab === "snn") {
    renderArchitecture("snnArchitecture", latestSnn);
    drawSnnTrace();
    drawSnnRaster();
    drawSnnReadout();
  }
}

function renderReferences() {
  const grid = $("referenceGrid");
  grid.innerHTML = references.map((ref) => `
    <article class="reference-item">
      <h3>${ref.title}</h3>
      <p>${ref.note}</p>
      <a href="${ref.url}" target="_blank" rel="noreferrer">Open source</a>
    </article>
  `).join("");
}

function runAllSimulations() {
  generateTimeline();
  buildTimingRows();
  updateReadouts();
  latestAnn = simulateArchitecture("ann");
  latestSnn = simulateArchitecture("snn");
  updateMetrics(state.activeTab === "snn" ? latestSnn : latestAnn);
  renderBlocks();
  renderArchitecture("annArchitecture", latestAnn);
  renderArchitecture("snnArchitecture", latestSnn);
  drawAllActive();
}

function applyModeToBlocks() {
  const targets = state.layers.filter((layer, index) => {
    if (state.applyTarget === "all") return true;
    if (state.applyTarget === "selected") return index === state.selectedLayer;
    return layer.role === "hidden";
  });
  targets.forEach((layer) => {
    layer.mode = state.defaultMemoryMode;
    layer.switchMethod = state.switchMethod;
    layer.tia = state.tiaEnabled;
  });
  runAllSimulations();
}

function updateSelectedLayerFromForm() {
  const layer = state.layers[state.selectedLayer];
  if (!layer) return;
  layer.devices = clamp(Number($("layerDevices").value) || 1, 1, 256);
  layer.role = $("layerRole").value;
  updateTraceLayerOptions();
  runAllSimulations();
}

function addLayer() {
  const idx = state.layers.filter((layer) => layer.role === "hidden").length + 1;
  state.layers.splice(Math.max(1, state.layers.length - 1), 0, {
    name: `Hidden ${idx}`,
    role: "hidden",
    devices: 16,
    mode: "adaptive",
    switchMethod: state.switchMethod,
    tia: state.tiaEnabled,
  });
  state.selectedLayer = Math.max(0, state.layers.length - 2);
  state.traceLayer = state.selectedLayer;
  updateTraceLayerOptions();
  runAllSimulations();
}

function removeLayer() {
  if (state.layers.length <= 2) return;
  state.layers.splice(state.selectedLayer, 1);
  state.selectedLayer = safeLayerIndex(state.selectedLayer);
  state.traceLayer = safeLayerIndex(state.traceLayer);
  updateTraceLayerOptions();
  runAllSimulations();
}

function exportCsv() {
  const selectedAnn = latestAnn.selected;
  const selectedSnn = latestSnn.selected;
  const rows = [
    "time_s,uv_intensity,ann_selected_mean_current_nA,ann_selected_tia_or_activation,snn_selected_mean_current_nA,snn_first_membrane",
  ];
  latestTimeline.forEach((point, index) => {
    if (index % 2 !== 0) return;
    const annOut = selectedAnn.config.tia && state.tiaEnabled ? Math.abs(selectedAnn.voltage[index]) : selectedAnn.activation[index];
    const snnMem = latestSnn.membranes[0]?.[index] || 0;
    rows.push([
      point.t.toFixed(5),
      point.uv.toFixed(5),
      selectedAnn.mean[index].toFixed(5),
      annOut.toFixed(7),
      selectedSnn.mean[index].toFixed(5),
      snnMem.toFixed(5),
    ].join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "uv_stm_ltm_transient_simulation.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`));
      updateMetrics(state.activeTab === "snn" ? latestSnn : latestAnn);
      setTimeout(drawAllActive, 0);
    });
  });

  document.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", () => {
      readControls();
      runAllSimulations();
    });
    control.addEventListener("change", () => {
      readControls();
      runAllSimulations();
    });
  });

  $("applyModeBtn").addEventListener("click", applyModeToBlocks);
  $("updateLayerBtn").addEventListener("click", updateSelectedLayerFromForm);
  $("addLayerBtn").addEventListener("click", addLayer);
  $("removeLayerBtn").addEventListener("click", removeLayer);
  $("regenerateTimingBtn").addEventListener("click", runAllSimulations);
  $("runTransientBtn").addEventListener("click", () => {
    readControls();
    runAllSimulations();
    $("simStatus").textContent = "transient run";
  });
  $("runAnnBtn").addEventListener("click", () => {
    readControls();
    state.activeTab = "ann";
    latestAnn = simulateArchitecture("ann");
    $("simStatus").textContent = "ANN transient";
    updateMetrics(latestAnn);
    renderArchitecture("annArchitecture", latestAnn);
    drawAnnTrace();
    drawHeatmap();
    drawAnnReadout();
  });
  $("runSnnBtn").addEventListener("click", () => {
    readControls();
    state.activeTab = "snn";
    latestSnn = simulateArchitecture("snn");
    $("simStatus").textContent = "SNN transient";
    updateMetrics(latestSnn);
    renderArchitecture("snnArchitecture", latestSnn);
    drawSnnTrace();
    drawSnnRaster();
    drawSnnReadout();
  });
  $("exportBtn").addEventListener("click", exportCsv);
  $("resetBtn").addEventListener("click", () => {
    window.localStorage.removeItem("uv-stm-ltm-architecture-state");
    window.location.reload();
  });
  window.addEventListener("resize", () => setTimeout(drawAllActive, 0));
}

function persist() {
  window.localStorage.setItem("uv-stm-ltm-architecture-state", JSON.stringify(state));
}

function restore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("uv-stm-ltm-architecture-state") || "null");
    if (!saved || typeof saved !== "object") return;
    Object.assign(state, deepClone(defaults), saved);
    if (!Array.isArray(state.layers) || state.layers.length < 2) state.layers = deepClone(defaults.layers);
    state.selectedLayer = safeLayerIndex(state.selectedLayer);
    state.traceLayer = safeLayerIndex(state.traceLayer);
    state.traceDevices = clamp(Number(state.traceDevices) || defaults.traceDevices, 4, 32);
    state.deviceVariation = clamp(Number(state.deviceVariation) || defaults.deviceVariation, 0, 20);
  } catch {
    Object.assign(state, deepClone(defaults));
  }
}

function init() {
  restore();
  updateTraceLayerOptions();
  writeControls();
  bindEvents();
  renderReferences();
  updateSelectedLayer();
  runAllSimulations();
  setInterval(persist, 1000);
}

init();
