const references = [
  {
    title: "snnTorch / surrogate-gradient SNN training",
    url: "https://snntorch.readthedocs.io/en/latest/",
    note: "PyTorch-native SNN library. Useful when the web GUI needs a Python training backend for LIF, CSNN, and ANN-to-SNN comparisons.",
  },
  {
    title: "SpikingJelly framework",
    url: "https://spikingjelly.readthedocs.io/",
    note: "Full-stack PyTorch SNN framework with neuromorphic datasets, ANN-to-SNN conversion, STDP, and energy/operator counting tutorials.",
  },
  {
    title: "Tonic neuromorphic datasets",
    url: "https://tonic.readthedocs.io/en/latest/",
    note: "Dataset and transform loader for N-MNIST, DVS Gesture, SHD, CIFAR10-DVS, and event-frame conversions.",
  },
  {
    title: "Brian2 simulator",
    url: "https://briansimulator.org/",
    note: "Equation-first SNN simulator. Good for validating custom device-current-to-LIF equations before ML training.",
  },
  {
    title: "Training SNNs Using Lessons From Deep Learning",
    url: "https://arxiv.org/abs/2109.12894",
    note: "Tutorial/perspective behind snnTorch; useful for surrogate gradients, spike encoding, and learning workflow framing.",
  },
  {
    title: "Photonic Integrated Neuro-Synaptic Core for CSNN",
    url: "https://arxiv.org/abs/2306.02724",
    note: "Good architectural reference for photonic synapse blocks, convolutional SNN mapping, and MNIST-level demonstration.",
  },
  {
    title: "Heidelberg Spiking Datasets",
    url: "https://arxiv.org/abs/1910.07407",
    note: "Spike-timing benchmark dataset. Useful if the novelty claim is temporal STM/LTM memory, not only image classification.",
  },
  {
    title: "ANN/SNN comparison on neuromorphic datasets",
    url: "https://arxiv.org/abs/2005.02183",
    note: "Useful baseline for comparing ANN/RNN/SNN on N-MNIST and DVS Gesture under controlled temporal settings.",
  },
];

const state = {
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

let latestTimeline = [];
let latestAnn = null;
let latestSnn = null;

function $(id) {
  return document.getElementById(id);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
  $("annPreset").value = state.annPreset;
  $("annDataset").value = state.annDataset;
  $("annEncoding").value = state.annEncoding;
  $("snnPreset").value = state.snnPreset;
  $("snnDataset").value = state.snnDataset;
  $("snnEncoding").value = state.snnEncoding;
}

function updateReadouts() {
  $("uvSummary").textContent = `365 nm ${state.programMode === "pwm" ? "PWM" : "on/off"}`;
  $("freqOut").textContent = `${state.frequency} Hz`;
  $("dutyOut").textContent = `${state.duty}%`;
  $("pulseCountOut").textContent = `${state.pulseCount}`;
  $("intensityOut").textContent = state.intensity.toFixed(2);
  $("tiaGainOut").textContent = `${state.tiaGain} kOhm`;
  $("summaryInput").textContent = state.programMode === "pwm" ? "UV PWM" : "UV on/off table";
  $("summarySwitch").textContent = state.switchMethod === "vds" ? "VDS -30/+30" : "Gate 10/40";
  $("modeControlSummary").textContent = state.defaultMemoryMode;
}

function generateTimeline() {
  const dt = 0.001;
  const period = 1 / state.frequency;
  const onTime = period * state.duty / 100;
  const totalTime = Math.max(1.2, state.pulseCount * period + 0.22);
  const points = [];
  for (let t = 0; t <= totalTime; t += dt) {
    let uv = 0;
    if (state.programMode === "pwm") {
      const pulseIndex = Math.floor(t / period);
      const phase = t - pulseIndex * period;
      uv = pulseIndex < state.pulseCount && phase <= onTime ? state.intensity : 0;
    } else {
      const slot = Math.floor(t / (period * 2.2));
      const local = t - slot * period * 2.2;
      const dynamicOn = onTime * (0.7 + (slot % 3) * 0.25);
      uv = slot < Math.ceil(state.pulseCount / 4) && local <= dynamicOn ? state.intensity * (0.75 + (slot % 4) * 0.08) : 0;
    }
    points.push({ t, uv });
  }
  latestTimeline = points;
  return points;
}

function buildTimingRows() {
  const tbody = $("timingTable");
  tbody.innerHTML = "";
  const period = 1 / state.frequency;
  const onTime = period * state.duty / 100;
  const rows = state.programMode === "pwm" ? 8 : 6;
  for (let i = 0; i < rows; i += 1) {
    const start = state.programMode === "pwm" ? i * period : i * period * 2.2;
    const on = state.programMode === "pwm" ? onTime : onTime * (0.7 + (i % 3) * 0.25);
    const off = state.programMode === "pwm" ? period - onTime : period * 2.2 - on;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${start.toFixed(3)} s</td><td>${on.toFixed(3)} s</td><td>${off.toFixed(3)} s</td>`;
    tbody.appendChild(tr);
  }
}

function modeForLayer(layer, index) {
  if (layer.mode !== "adaptive") return layer.mode;
  return index % 2 === 0 ? "STM" : "LTM";
}

function switchText(method) {
  return method === "vds" ? "VDS +/-30" : "Gate 10/40";
}

function renderBlocks() {
  const canvas = $("blockCanvas");
  canvas.innerHTML = "";
  state.layers.forEach((layer, layerIndex) => {
    const row = document.createElement("div");
    row.className = "layer-row";
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
      const block = document.createElement("div");
      block.className = `device-block ${mode.toLowerCase()}`;
      block.innerHTML = `<strong>${mode}</strong><em>${switchText(layer.switchMethod)}</em><em>${layer.tia ? "TIA on" : "TIA off"}</em>`;
      grid.appendChild(block);
    }
    if (layer.devices > visible) {
      const more = document.createElement("div");
      more.className = "device-block adaptive";
      more.innerHTML = `<strong>+${layer.devices - visible}</strong><em>more</em>`;
      grid.appendChild(more);
    }
    row.append(label, grid);
    canvas.appendChild(row);
  });
  updateSelectedLayer();
  updateMetrics();
}

function selectLayer(index) {
  state.selectedLayer = clamp(index, 0, state.layers.length - 1);
  updateSelectedLayer();
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

function updateMetrics() {
  const total = state.layers.reduce((sum, layer) => sum + layer.devices, 0);
  let stm = 0;
  let ltm = 0;
  let tia = 0;
  state.layers.forEach((layer) => {
    if (layer.tia) tia += layer.devices;
    if (layer.mode === "STM") stm += layer.devices;
    else if (layer.mode === "LTM") ltm += layer.devices;
    else {
      stm += Math.ceil(layer.devices / 2);
      ltm += Math.floor(layer.devices / 2);
    }
  });
  const meanCurrent = estimateMeanCurrent();
  const vout = state.tiaEnabled ? meanCurrent * state.tiaGain * 1e3 * 1e-9 : meanCurrent * 1e-9;
  $("totalDevices").textContent = total;
  $("modeMix").textContent = `${stm} / ${ltm}`;
  $("tiaBlocks").textContent = tia;
  $("outputScale").textContent = state.tiaEnabled ? `${vout.toFixed(3)} V` : `${meanCurrent.toFixed(1)} nA`;
  $("summaryArchitecture").textContent = `${state.layers.length} layers / ${total} devices`;
}

function estimateMeanCurrent() {
  const uvMean = latestTimeline.length ? latestTimeline.reduce((sum, p) => sum + p.uv, 0) / latestTimeline.length : 0.2;
  const ltmRatio = state.layers.reduce((sum, layer) => {
    if (layer.mode === "LTM") return sum + layer.devices;
    if (layer.mode === "adaptive") return sum + layer.devices * 0.5;
    return sum;
  }, 0) / Math.max(1, state.layers.reduce((sum, layer) => sum + layer.devices, 0));
  return 12 + uvMean * 115 * (0.75 + 0.55 * ltmRatio);
}

function drawUvCanvas() {
  const canvas = $("uvCanvas");
  const ctx = setupCanvas(canvas);
  const points = latestTimeline;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 360;
  const margin = { left: 54, right: 18, top: 28, bottom: 34 };
  drawChartFrame(ctx, width, height, margin, "UV optical input", "Intensity");
  const maxT = points[points.length - 1]?.t || 1;
  const maxU = Math.max(1, state.intensity * 1.15);
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = margin.left + (p.t / maxT) * (width - margin.left - margin.right);
    const y = height - margin.bottom - (p.uv / maxU) * (height - margin.top - margin.bottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#7b2ff2";
  ctx.lineWidth = 2;
  ctx.stroke();
  drawAxisLabels(ctx, width, height, margin, maxT, maxU);
}

function runAnnSimulation() {
  const devices = state.layers.reduce((sum, layer) => sum + layer.devices, 0);
  const ltmBlocks = state.layers.filter((layer) => layer.mode === "LTM" || layer.mode === "adaptive").length;
  const tiaBonus = state.tiaEnabled ? 0.06 : -0.02;
  const datasetBase = { mnist: 0.88, uvtoy: 0.81, mitbih: 0.78 }[state.annDataset];
  const presetGain = { mlp: 0.02, reservoir: 0.05, cnnproxy: 0.08 }[state.annPreset];
  const encodingGain = { rate: 0.03, amplitude: 0.015, latency: 0.025 }[state.annEncoding];
  const accuracy = clamp(datasetBase + Math.log10(devices) * 0.025 + ltmBlocks * 0.01 + presetGain + encodingGain + tiaBonus, 0.55, 0.97);
  latestAnn = {
    accuracy,
    latency: clamp(18 + state.layers.length * 6 - state.frequency * 0.12, 6, 80),
    energy: clamp(devices * (state.tiaEnabled ? 1.4 : 0.9) * (state.duty / 100), 4, 220),
  };
  $("simStatus").textContent = "ANN run";
  drawAnnCanvas();
}

function runSnnSimulation() {
  const devices = state.layers.reduce((sum, layer) => sum + layer.devices, 0);
  const stmRatio = state.layers.reduce((sum, layer) => {
    if (layer.mode === "STM") return sum + layer.devices;
    if (layer.mode === "adaptive") return sum + layer.devices * 0.5;
    return sum;
  }, 0) / Math.max(devices, 1);
  const datasetBase = { nmnist: 0.86, dvsgesture: 0.78, shd: 0.74, uvtoy: 0.84 }[state.snnDataset];
  const presetGain = { lif: 0.02, csnn: 0.07, rsnn: 0.055 }[state.snnPreset];
  const encodingGain = { rate: 0.02, ttfs: 0.035, phase: 0.045 }[state.snnEncoding];
  const spikeSparsity = clamp(1 - (state.duty / 100) * 0.62, 0.18, 0.96);
  latestSnn = {
    accuracy: clamp(datasetBase + presetGain + encodingGain + stmRatio * 0.03, 0.5, 0.96),
    spikeSparsity,
    timesteps: Math.round(clamp(120 / state.frequency + state.layers.length * 7, 12, 120)),
  };
  $("simStatus").textContent = "SNN run";
  drawSnnCanvas();
}

function drawAnnCanvas() {
  const canvas = $("annCanvas");
  const ctx = setupCanvas(canvas);
  const data = latestAnn || { accuracy: 0.9, latency: 24, energy: 60 };
  drawBarChart(ctx, canvas.clientWidth, canvas.clientHeight || 400, [
    { label: "Accuracy", value: data.accuracy, max: 1, color: "#0b61b5", unit: "%" },
    { label: "Latency", value: data.latency, max: 100, color: "#d98612", unit: "ms" },
    { label: "Energy index", value: data.energy, max: 240, color: "#0f9d91", unit: "a.u." },
  ], "ANN current-mode estimate");
}

function drawSnnCanvas() {
  const canvas = $("snnCanvas");
  const ctx = setupCanvas(canvas);
  const data = latestSnn || { accuracy: 0.86, spikeSparsity: 0.72, timesteps: 30 };
  drawBarChart(ctx, canvas.clientWidth, canvas.clientHeight || 400, [
    { label: "Accuracy", value: data.accuracy, max: 1, color: "#0b61b5", unit: "%" },
    { label: "Spike sparsity", value: data.spikeSparsity, max: 1, color: "#7b2ff2", unit: "%" },
    { label: "Timesteps", value: data.timesteps, max: 120, color: "#d98612", unit: "steps" },
  ], "SNN event-driven estimate");
}

function setupCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = Math.max(320, rect.width);
  const cssHeight = Math.max(260, rect.height || Number(canvas.getAttribute("height")) || 360);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

function drawChartFrame(ctx, width, height, margin, title, yLabel) {
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d7e1e8";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (height - margin.top - margin.bottom) * i / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#b8c8d3";
  ctx.strokeRect(margin.left, margin.top, width - margin.left - margin.right, height - margin.top - margin.bottom);
  ctx.fillStyle = "#263a48";
  ctx.font = "700 13px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(title, margin.left, 18);
  ctx.fillStyle = "#627381";
  ctx.font = "11px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(yLabel, 8, margin.top + 10);
}

function drawAxisLabels(ctx, width, height, margin, maxT, maxY) {
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const x = margin.left + (width - margin.left - margin.right) * i / 4;
    const t = maxT * i / 4;
    ctx.fillText(`${t.toFixed(2)}s`, x - 12, height - 12);
    const y = margin.top + (height - margin.top - margin.bottom) * i / 4;
    const v = maxY * (1 - i / 4);
    ctx.fillText(v.toFixed(2), 18, y + 3);
  }
}

function drawBarChart(ctx, width, height, bars, title) {
  const margin = { left: 58, right: 30, top: 44, bottom: 44 };
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#263a48";
  ctx.font = "800 15px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(title, margin.left, 24);
  const usableW = width - margin.left - margin.right;
  const usableH = height - margin.top - margin.bottom;
  const slot = usableW / bars.length;
  bars.forEach((bar, i) => {
    const ratio = clamp(bar.value / bar.max, 0, 1);
    const barW = Math.min(90, slot * 0.42);
    const x = margin.left + slot * i + slot / 2 - barW / 2;
    const h = usableH * ratio;
    const y = margin.top + usableH - h;
    ctx.fillStyle = "#edf3f7";
    ctx.fillRect(x, margin.top, barW, usableH);
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#263a48";
    ctx.font = "700 12px Malgun Gothic, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    const valueText = bar.unit === "%" ? `${Math.round(bar.value * 100)}%` : `${Math.round(bar.value)} ${bar.unit}`;
    ctx.fillText(valueText, x + barW / 2, y - 8);
    ctx.fillStyle = "#627381";
    ctx.font = "11px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText(bar.label, x + barW / 2, height - 18);
    ctx.textAlign = "left";
  });
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
  renderBlocks();
  drawAll();
}

function updateSelectedLayerFromForm() {
  const layer = state.layers[state.selectedLayer];
  if (!layer) return;
  layer.devices = clamp(Number($("layerDevices").value) || 1, 1, 256);
  layer.role = $("layerRole").value;
  renderBlocks();
  drawAll();
}

function addLayer() {
  const idx = state.layers.length + 1;
  state.layers.splice(Math.max(1, state.layers.length - 1), 0, {
    name: `Hidden ${idx}`,
    role: "hidden",
    devices: 16,
    mode: "adaptive",
    switchMethod: state.switchMethod,
    tia: state.tiaEnabled,
  });
  state.selectedLayer = Math.max(0, state.layers.length - 2);
  renderBlocks();
  drawAll();
}

function removeLayer() {
  if (state.layers.length <= 2) return;
  state.layers.splice(state.selectedLayer, 1);
  state.selectedLayer = clamp(state.selectedLayer, 0, state.layers.length - 1);
  renderBlocks();
  drawAll();
}

function drawAll() {
  generateTimeline();
  buildTimingRows();
  updateReadouts();
  updateMetrics();
  drawUvCanvas();
  drawAnnCanvas();
  drawSnnCanvas();
}

function exportCsv() {
  const rows = ["time_s,uv_intensity"];
  latestTimeline.forEach((point, index) => {
    if (index % 2 === 0) rows.push(`${point.t.toFixed(5)},${point.uv.toFixed(5)}`);
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "uv_stm_ltm_architecture_simulation.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b === button));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`));
      setTimeout(drawAll, 0);
    });
  });

  document.querySelectorAll("input, select").forEach((control) => {
    control.addEventListener("input", () => {
      readControls();
      drawAll();
    });
    control.addEventListener("change", () => {
      readControls();
      drawAll();
    });
  });

  $("applyModeBtn").addEventListener("click", applyModeToBlocks);
  $("updateLayerBtn").addEventListener("click", updateSelectedLayerFromForm);
  $("addLayerBtn").addEventListener("click", addLayer);
  $("removeLayerBtn").addEventListener("click", removeLayer);
  $("regenerateTimingBtn").addEventListener("click", drawAll);
  $("runAnnBtn").addEventListener("click", () => {
    readControls();
    runAnnSimulation();
  });
  $("runSnnBtn").addEventListener("click", () => {
    readControls();
    runSnnSimulation();
  });
  $("exportBtn").addEventListener("click", exportCsv);
  $("resetBtn").addEventListener("click", () => {
    window.localStorage.removeItem("uv-stm-ltm-architecture-state");
    window.location.reload();
  });
  window.addEventListener("resize", drawAll);
}

function persist() {
  window.localStorage.setItem("uv-stm-ltm-architecture-state", JSON.stringify(state));
}

function restore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("uv-stm-ltm-architecture-state") || "null");
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch {
    // Ignore malformed local storage.
  }
}

function init() {
  restore();
  writeControls();
  bindEvents();
  renderReferences();
  renderBlocks();
  drawAll();
  runAnnSimulation();
  runSnnSimulation();
  setInterval(persist, 1000);
}

init();
