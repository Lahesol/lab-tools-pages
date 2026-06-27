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

const DATASETS = window.DATASET_REGISTRY || {};
const DATASET_GROUPS = window.DATASET_GROUPS || { ann: ["mnist", "uvtoy", "mitbih"], snn: ["nmnist", "dvsgesture", "shd", "uvtoy"] };
const NET = window.DEVICE_NETWORK;
const GRAPH_SIM = window.SYNAPTIC_GRAPH_SIM;
const MODEL = window.DEVICE_MODEL;

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
  optimizerTarget: "ann",
  optimizerIterations: 80,
  optimizerMaxFanout: 8,
  optimizerMaxDevices: 48,
  optimizerTuneSizes: true,
  optimizerTuneModes: true,
  optimizerTuneConnections: true,
  optimizerTuneOeo: false,
  optimizerSeparationWeight: 0.35,
  optimizerSparsityWeight: 0.25,
  optimizerLatencyWeight: 0.15,
  optimizerEnergyWeight: 0.15,
  optimizerRobustnessWeight: 0.1,
  selectedDevice: "L0D0",
  sourceDevice: "L0D0",
  targetDevice: "L1D0",
  fanCount: 8,
  edgeCoupling: 0.86,
  edgeResidual: 0.12,
  edgeDelay: 0,
  driverThresholdMv: 2,
  driverGain: 35,
  driverMax: 1.4,
  splitterLossDb: 1.5,
  transferModelVersion: 2,
  transferMode: "hybrid",
  ifTauMs: 120,
  ifThreshold: 0.18,
  ifGain: 4,
  ifReset: 0.05,
  ifRefractoryMs: 25,
  emitterPulseMs: 18,
  ltmWriteThreshold: 0.28,
  ltmReadoutGain: 0.55,
  ltmRetentionMs: 850,
  checkedDeviceTraces: ["L0D0", "L1D0"],
  paramMode: "STM",
  paramSwitchMethod: "vds",
  measurementText: "",
  deviceModel: MODEL.defaultModel(),
  deviceOverrides: {},
  connections: [],
  connectionGraphInitialized: false,
  layers: [
    { name: "Input", role: "input", devices: 16, mode: "STM", switchMethod: "vds", tia: true },
    { name: "Hidden A", role: "hidden", devices: 32, mode: "adaptive", switchMethod: "vds", tia: true },
    { name: "Hidden B", role: "hidden", devices: 16, mode: "LTM", switchMethod: "gate", tia: true },
    { name: "Output", role: "output", devices: 4, mode: "LTM", switchMethod: "gate", tia: false },
  ],
};

const state = structuredClone(defaults);

let latestTimeline = [];
let latestBlock = null;
let latestAnn = null;
let latestSnn = null;
let latestOptimizer = { candidates: [], best: null, target: "ann" };

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

function deviceKey(layerIndex, deviceIndex) {
  return NET.key(layerIndex, deviceIndex);
}

function getDeviceOverride(layerIndex, deviceIndex) {
  return state.deviceOverrides[deviceKey(layerIndex, deviceIndex)] || {};
}

function getDeviceConfig(layer, layerIndex, deviceIndex) {
  const override = getDeviceOverride(layerIndex, deviceIndex);
  const inheritedMode = modeForLayer(layer, deviceIndex);
  return {
    mode: override.mode && override.mode !== "inherit" ? override.mode : inheritedMode,
    switchMethod: override.switchMethod && override.switchMethod !== "inherit" ? override.switchMethod : layer.switchMethod,
    tia: typeof override.tia === "boolean" ? override.tia : layer.tia,
    inheritedMode,
  };
}

function switchText(method) {
  return method === "vds" ? "VDS -30/+30 V" : "Gate 10/40 V";
}

function routeShort(method) {
  return method === "vds" ? "VDS +/-30" : "Gate 10/40";
}

function transferModeText(mode = state.transferMode) {
  return {
    hybrid: "STM IF + LTM latch",
    continuous: "continuous O/E/O",
    integrateFire: "IF emitter all",
    ltmLatch: "LTM latch all",
  }[mode] || "O/E/O";
}

function getDataset(kind) {
  const id = kind === "ann" ? state.annDataset : state.snnDataset;
  return DATASETS[id] || DATASETS.uvtoy || {
    id: "unknown",
    label: "Unknown dataset",
    sampleFormat: "not specified",
    rawInput: "not specified",
    inputChannels: null,
    outputClasses: 0,
    sourceName: "not specified",
    sourceUrl: "#",
    loaderStatus: "Dataset metadata is missing.",
    temporalEncoding: "not specified",
    preview: "uv",
  };
}

function inputLayer() {
  return state.layers.find((layer) => layer.role === "input") || state.layers[0];
}

function outputLayer() {
  return [...state.layers].reverse().find((layer) => layer.role === "output") || state.layers[state.layers.length - 1];
}

function formatChannelCount(value) {
  return value === null || value === undefined ? "architecture-defined" : value.toLocaleString();
}

function architectureContract(kind) {
  const dataset = getDataset(kind);
  const inLayer = inputLayer();
  const outLayer = outputLayer();
  const inputDevices = inLayer?.devices || 0;
  const outputDevices = outLayer?.devices || 0;
  const requiredInput = dataset.inputChannels;
  const requiredOutput = dataset.outputClasses || 0;

  let inputStatus = "native";
  let inputMessage = "Input size follows the current UV architecture.";
  if (typeof requiredInput === "number") {
    if (inputDevices === requiredInput) {
      inputStatus = "match";
      inputMessage = "Direct one-channel-per-device input mapping is possible.";
    } else if (inputDevices < requiredInput) {
      inputStatus = "adapter";
      inputMessage = `${requiredInput.toLocaleString()} dataset channels must be compressed or time-multiplexed into ${inputDevices} input devices.`;
    } else {
      inputStatus = "spare";
      inputMessage = `${inputDevices - requiredInput} input devices are spare or can be used for tiling/redundancy.`;
    }
  }

  let outputStatus = "match";
  let outputMessage = "Direct class readout is possible.";
  if (outputDevices < requiredOutput) {
    outputStatus = "adapter";
    outputMessage = `${requiredOutput} classes require a virtual decoder or multiplexed readout from ${outputDevices} output devices.`;
  } else if (outputDevices > requiredOutput) {
    outputStatus = "spare";
    outputMessage = `${outputDevices - requiredOutput} output devices are spare or can represent confidence/redundancy.`;
  }

  const runnable = inputStatus !== "adapter" && outputStatus !== "adapter";
  return {
    dataset,
    inputLayer: inLayer,
    outputLayer: outLayer,
    inputDevices,
    outputDevices,
    requiredInput,
    requiredOutput,
    inputStatus,
    outputStatus,
    inputMessage,
    outputMessage,
    runnable,
    simulationMode: runnable ? "Direct physical graph mapping" : "Device graph + virtual encoder/readout adapters",
  };
}

function statusClass(status) {
  if (status === "match" || status === "native") return "ok";
  if (status === "spare") return "warn";
  return "needs-adapter";
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
  state.optimizerTarget = $("optimizerTarget").value;
  state.optimizerIterations = Number($("optimizerIterations").value);
  state.optimizerMaxFanout = Number($("optimizerMaxFanout").value);
  state.optimizerMaxDevices = Number($("optimizerMaxDevices").value);
  state.optimizerTuneSizes = $("optimizerTuneSizes").checked;
  state.optimizerTuneModes = $("optimizerTuneModes").checked;
  state.optimizerTuneConnections = $("optimizerTuneConnections").checked;
  state.optimizerTuneOeo = $("optimizerTuneOeo").checked;
  state.optimizerSeparationWeight = Number($("optimizerSeparationWeight").value);
  state.optimizerSparsityWeight = Number($("optimizerSparsityWeight").value);
  state.optimizerLatencyWeight = Number($("optimizerLatencyWeight").value);
  state.optimizerEnergyWeight = Number($("optimizerEnergyWeight").value);
  state.optimizerRobustnessWeight = Number($("optimizerRobustnessWeight").value);
  state.selectedDevice = $("deviceSelect").value;
  state.sourceDevice = $("sourceDeviceSelect").value;
  state.targetDevice = $("targetDeviceSelect").value;
  state.fanCount = Number($("fanCount").value);
  state.edgeCoupling = Number($("edgeCoupling").value);
  state.edgeResidual = Number($("edgeResidual").value);
  state.edgeDelay = Number($("edgeDelay").value);
  state.driverThresholdMv = Number($("driverThresholdMv").value);
  state.driverGain = Number($("driverGain").value);
  state.driverMax = Number($("driverMax").value);
  state.splitterLossDb = Number($("splitterLossDb").value);
  state.transferMode = $("transferMode").value;
  state.ifTauMs = Number($("ifTauMs").value);
  state.ifThreshold = Number($("ifThreshold").value);
  state.ifGain = Number($("ifGain").value);
  state.ifRefractoryMs = Number($("ifRefractoryMs").value);
  state.emitterPulseMs = Number($("emitterPulseMs").value);
  state.ltmWriteThreshold = Number($("ltmWriteThreshold").value);
  state.ltmReadoutGain = Number($("ltmReadoutGain").value);
  state.ltmRetentionMs = Number($("ltmRetentionMs").value);
  state.paramMode = $("paramModeSelect").value;
  state.paramSwitchMethod = $("paramSwitchSelect").value;
  state.measurementText = $("measurementInput").value;
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
  $("optimizerTarget").value = state.optimizerTarget;
  $("optimizerIterations").value = state.optimizerIterations;
  $("optimizerMaxFanout").value = state.optimizerMaxFanout;
  $("optimizerMaxDevices").value = state.optimizerMaxDevices;
  $("optimizerTuneSizes").checked = state.optimizerTuneSizes;
  $("optimizerTuneModes").checked = state.optimizerTuneModes;
  $("optimizerTuneConnections").checked = state.optimizerTuneConnections;
  $("optimizerTuneOeo").checked = state.optimizerTuneOeo;
  $("optimizerSeparationWeight").value = state.optimizerSeparationWeight;
  $("optimizerSparsityWeight").value = state.optimizerSparsityWeight;
  $("optimizerLatencyWeight").value = state.optimizerLatencyWeight;
  $("optimizerEnergyWeight").value = state.optimizerEnergyWeight;
  $("optimizerRobustnessWeight").value = state.optimizerRobustnessWeight;
  $("fanCount").value = state.fanCount;
  $("edgeCoupling").value = state.edgeCoupling;
  $("edgeResidual").value = state.edgeResidual;
  $("edgeDelay").value = state.edgeDelay;
  $("driverThresholdMv").value = state.driverThresholdMv;
  $("driverGain").value = state.driverGain;
  $("driverMax").value = state.driverMax;
  $("splitterLossDb").value = state.splitterLossDb;
  $("transferMode").value = state.transferMode;
  $("ifTauMs").value = state.ifTauMs;
  $("ifThreshold").value = state.ifThreshold;
  $("ifGain").value = state.ifGain;
  $("ifRefractoryMs").value = state.ifRefractoryMs;
  $("emitterPulseMs").value = state.emitterPulseMs;
  $("ltmWriteThreshold").value = state.ltmWriteThreshold;
  $("ltmReadoutGain").value = state.ltmReadoutGain;
  $("ltmRetentionMs").value = state.ltmRetentionMs;
  $("paramModeSelect").value = state.paramMode;
  $("paramSwitchSelect").value = state.paramSwitchMethod;
  $("measurementInput").value = state.measurementText;
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
  $("edgeCouplingOut").textContent = state.edgeCoupling.toFixed(2);
  $("edgeResidualOut").textContent = state.edgeResidual.toFixed(2);
  $("edgeDelayOut").textContent = `${state.edgeDelay} ms`;
  $("driverThresholdOut").textContent = `${state.driverThresholdMv.toFixed(1)} mV`;
  $("driverGainOut").textContent = `${state.driverGain.toFixed(1)} UV/V`;
  $("driverMaxOut").textContent = state.driverMax.toFixed(2);
  $("splitterLossOut").textContent = `${state.splitterLossDb.toFixed(1)} dB`;
  $("ifTauOut").textContent = `${state.ifTauMs} ms`;
  $("ifThresholdOut").textContent = state.ifThreshold.toFixed(2);
  $("ifGainOut").textContent = state.ifGain.toFixed(2);
  $("ifRefractoryOut").textContent = `${state.ifRefractoryMs} ms`;
  $("emitterPulseOut").textContent = `${state.emitterPulseMs} ms`;
  $("ltmWriteThresholdOut").textContent = state.ltmWriteThreshold.toFixed(2);
  $("ltmReadoutGainOut").textContent = state.ltmReadoutGain.toFixed(2);
  $("ltmRetentionOut").textContent = `${state.ltmRetentionMs} ms`;
  $("transferSummary").textContent = `${transferModeText()}, fanout loss ${state.splitterLossDb.toFixed(1)} dB`;
  $("traceSummary").textContent = traceLayer ? traceLayer.name : "Layer";
  $("summaryLayer").textContent = traceLayer ? traceLayer.name : "Layer";
  $("summaryInput").textContent = state.programMode === "pwm" ? "UV PWM" : "UV on/off table";
  $("summarySwitch").textContent = state.switchMethod === "vds" ? "VDS -30/+30" : "Gate 10/40";
  $("modeControlSummary").textContent = state.defaultMemoryMode;
  $("optimizerIterationsOut").textContent = `${state.optimizerIterations}`;
  $("optimizerFanoutOut").textContent = `${state.optimizerMaxFanout}`;
  $("optimizerMaxDevicesOut").textContent = `${state.optimizerMaxDevices}`;
  $("optimizerSepOut").textContent = state.optimizerSeparationWeight.toFixed(2);
  $("optimizerSparsityOut").textContent = state.optimizerSparsityWeight.toFixed(2);
  $("optimizerLatencyOut").textContent = state.optimizerLatencyWeight.toFixed(2);
  $("optimizerEnergyOut").textContent = state.optimizerEnergyWeight.toFixed(2);
  $("optimizerRobustOut").textContent = state.optimizerRobustnessWeight.toFixed(2);
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
  const variation = stableVariation(layerIndex, deviceIndex);
  return MODEL.params(state.deviceModel, mode, method, variation, layerIndex);
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
  const config = getDeviceConfig(layer, layerIndex, deviceIndex);
  const mode = config.mode === "adaptive" ? modeForLayer(layer, deviceIndex) : config.mode;
  const params = deviceParams(mode, config.switchMethod, layerIndex, deviceIndex);
  const roleGain = { input: 0.92, hidden: 1.04, output: 0.86 }[layer.role] || 1;
  const presetGain = kind === "ann"
    ? { mlp: 1, reservoir: 1.1, cnnproxy: 1.18 }[state.annPreset]
    : { lif: 1, csnn: 1.08, rsnn: 1.14 }[state.snnPreset];
  const trace = MODEL.response(timeline, drive, params, {
    roleGain,
    presetGain,
    noisePhase: deviceIndex * 1.7 + layerIndex,
  });

  return { key: deviceKey(layerIndex, deviceIndex), mode, switchMethod: config.switchMethod, tia: config.tia, trace };
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

function pseudoFramePixel(dataset, channel) {
  const grid = 28;
  const x = channel % grid;
  const y = Math.floor(channel / grid) % grid;
  const cx = x - 14;
  const cy = y - 14;
  if (dataset.id === "fashionmnist") {
    return clamp(Math.exp(-((cx * cx) / 120 + (cy * cy) / 72)) * (y > 7 ? 1 : 0.25), 0, 1);
  }
  const digit = Math.exp(-((cx * cx) / 42 + (cy * cy) / 96))
    + Math.exp(-(((cx - 3) * (cx - 3)) / 72 + ((cy + 4) * (cy + 4)) / 32));
  return clamp(digit, 0, 1);
}

function datasetFeatureForDevice(dataset, deviceIndex, inputCount) {
  const channels = Number(dataset.inputChannels) || inputCount || 1;
  const count = Math.max(1, inputCount || 1);
  if (dataset.preview === "frame") {
    const start = Math.floor((deviceIndex / count) * channels);
    const end = Math.max(start + 1, Math.floor(((deviceIndex + 1) / count) * channels));
    const samples = Math.min(8, Math.max(1, end - start));
    let sum = 0;
    for (let sample = 0; sample < samples; sample += 1) {
      const channel = clamp(Math.floor(lerp(start, end - 1, samples === 1 ? 0 : sample / (samples - 1))), 0, channels - 1);
      sum += pseudoFramePixel(dataset, channel);
    }
    return 0.18 + 0.82 * (sum / samples);
  }

  if (dataset.preview === "waveform") {
    return 0.52 + 0.34 * Math.sin((deviceIndex + 1) * 0.71) ** 2;
  }

  if (dataset.preview === "event" || dataset.preview === "spike") {
    const raw = Math.sin((deviceIndex + 1) * 12.9898 + (dataset.id || "").length * 78.233) * 0.5 + 0.5;
    return 0.24 + raw * 0.76;
  }

  return 1;
}

function datasetTemporalGate(dataset, point, index, timeline, deviceIndex, kind) {
  const totalTime = timeline[timeline.length - 1]?.t || 1;
  const tNorm = clamp(point.t / totalTime, 0, 1);

  if (dataset.preview === "event") {
    const centerA = (0.12 + (deviceIndex * 0.173) % 0.74);
    const centerB = (centerA + 0.31) % 1;
    const burstA = Math.exp(-((tNorm - centerA) ** 2) / 0.0018);
    const burstB = Math.exp(-((tNorm - centerB) ** 2) / 0.0035);
    return 0.18 + 1.42 * clamp(burstA + burstB * 0.7, 0, 1);
  }

  if (dataset.preview === "spike") {
    const slots = 18;
    const slot = Math.floor(tNorm * slots);
    const active = (slot * 7 + deviceIndex * 3) % 11 < 4;
    return active ? 1.55 : 0.08;
  }

  if (dataset.preview === "waveform") {
    const qrs = Math.exp(-((tNorm - 0.43) ** 2) / 0.00045) - 0.45 * Math.exp(-((tNorm - 0.39) ** 2) / 0.0006);
    const p = 0.22 * Math.exp(-((tNorm - 0.22) ** 2) / 0.004);
    const tw = 0.32 * Math.exp(-((tNorm - 0.68) ** 2) / 0.01);
    return clamp(0.35 + (p + qrs + tw) * 1.1, 0.05, 1.65);
  }

  if (kind === "snn" && state.snnEncoding === "ttfs") {
    const rank = (deviceIndex % 16) / 16;
    return tNorm < 0.12 + rank * 0.35 ? 1.35 : 0.25;
  }

  return 1;
}

function graphInputDriveForDevice(kind, timeline, layerIndex, deviceIndex) {
  const dataset = getDataset(kind);
  const inLayerIndex = state.layers.findIndex((layer) => layer.role === "input");
  const inputLayerIndex = inLayerIndex >= 0 ? inLayerIndex : 0;
  const inputCount = Math.max(1, state.layers[inputLayerIndex]?.devices || 1);
  const feature = datasetFeatureForDevice(dataset, deviceIndex, inputCount);
  const layer = state.layers[layerIndex];
  const residualScale = layer?.role === "input" ? 1 : 0.18;

  return timeline.map((point, index) => {
    const encoded = encodedInput(point, kind);
    const temporalGate = datasetTemporalGate(dataset, point, index, timeline, deviceIndex, kind);
    return clamp(encoded * feature * temporalGate * residualScale, 0, 1.8);
  });
}

function blockInputDriveForDevice(timeline, layerIndex) {
  const layer = state.layers[layerIndex];
  const residualScale = layer?.role === "input" ? 1 : 0.18;
  return timeline.map((point) => {
    const normUv = state.intensity > 0 ? point.uv / state.intensity : 0;
    return clamp(normUv * residualScale, 0, 1.8);
  });
}

function edgeTransferDefaults() {
  return {
    coupling: state.edgeCoupling,
    opticalResidual: state.edgeResidual,
    delayMs: state.edgeDelay,
    driverThresholdMv: state.driverThresholdMv,
    driverGain: state.driverGain,
    driverMax: state.driverMax,
    splitterLossDb: state.splitterLossDb,
    transferMode: state.transferMode,
    ifTauMs: state.ifTauMs,
    ifThreshold: state.ifThreshold,
    ifGain: state.ifGain,
    ifReset: state.ifReset,
    ifRefractoryMs: state.ifRefractoryMs,
    emitterPulseMs: state.emitterPulseMs,
    ltmWriteThreshold: state.ltmWriteThreshold,
    ltmReadoutGain: state.ltmReadoutGain,
    ltmRetentionMs: state.ltmRetentionMs,
  };
}

function simulateBlockGraph() {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  return GRAPH_SIM.simulate({
    state,
    timeline,
    kind: "block",
    maxPerLayer: 32,
    inputDriveForDevice: (layerIndex) => blockInputDriveForDevice(timeline, layerIndex),
    simulateDeviceTrace,
    tiaGain: state.tiaGain,
    tiaEnabled: state.tiaEnabled,
    edgeDefaults: edgeTransferDefaults(),
  });
}

function simulateArchitecture(kind) {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  const result = GRAPH_SIM.simulate({
    state,
    timeline,
    kind,
    maxPerLayer: 32,
    inputDriveForDevice: (layerIndex, deviceIndex) => graphInputDriveForDevice(kind, timeline, layerIndex, deviceIndex),
    simulateDeviceTrace,
    tiaGain: state.tiaGain,
    tiaEnabled: state.tiaEnabled,
    edgeDefaults: edgeTransferDefaults(),
  });

  if (kind === "snn") addSnnDynamics(result);
  else addAnnReadout(result);

  return result;
}

function addAnnReadout(result) {
  const output = result.output;
  const datasetGain = { mnist: 0.92, fashionmnist: 0.86, uvtoy: 0.78, mitbih: 0.72 }[state.annDataset] || 0.78;
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

  state.layers.forEach((layer, layerIndex) => {
    for (let deviceIndex = 0; deviceIndex < layer.devices; deviceIndex += 1) {
      const mode = getDeviceConfig(layer, layerIndex, deviceIndex).mode;
      if (mode === "LTM") ltm += 1;
      else {
        stm += 1;
      }
    }
  });

  const selected = result?.selected || latestAnn?.selected;
  const peak = selected ? selected.peak : 0;
  const tiaSwing = selected && selected.tiaEnabledForLayer && state.tiaEnabled ? peak * state.tiaGain * 1e-6 : 0;
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
  $("layerTiaSwing").textContent = selected?.tiaEnabledForLayer && state.tiaEnabled ? `${round(tiaSwing, 4)} V` : "TIA off";
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
      const config = getDeviceConfig(layer, layerIndex, i);
      const mode = config.mode === "adaptive" ? modeForLayer(layer, i) : config.mode;
      const key = deviceKey(layerIndex, i);
      const override = getDeviceOverride(layerIndex, i);
      const block = document.createElement("button");
      block.type = "button";
      block.className = `device-block ${mode.toLowerCase()} ${layerIndex === state.traceLayer ? "trace-target" : ""} ${key === state.selectedDevice ? "device-selected" : ""} ${Object.keys(override).length ? "overridden" : ""}`;
      block.innerHTML = `<strong>${mode}</strong><em>${routeShort(config.switchMethod)}</em><em>${config.tia ? "TIA on" : "TIA off"}</em>`;
      block.addEventListener("click", () => {
        state.selectedLayer = layerIndex;
        state.traceLayer = layerIndex;
        state.selectedDevice = key;
        state.sourceDevice = key;
        updateTraceLayerOptions();
        updateDeviceSelectors();
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

function edgeCountBetweenLayers(fromLayerIndex, toLayerIndex) {
  return (state.connections || []).filter((edge) => {
    const from = NET.parse(edge.from);
    const to = NET.parse(edge.to);
    return from?.layerIndex === fromLayerIndex && to?.layerIndex === toLayerIndex;
  }).length;
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
      <small>${layer.role} / ${layerResult.displayedDevices} of ${layer.devices} devices simulated</small>
      <span class="node-meta">${layer.mode} · ${routeShort(layer.switchMethod)} · ${layer.tia ? "TIA" : "Iout"}</span>
      <span class="node-meta">${layerResult.incomingEdges} in / ${layerResult.outgoingEdges} out graph edges</span>
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
      arrow.textContent = edgeCountBetweenLayers(index, index + 1) ? `${edgeCountBetweenLayers(index, index + 1)} edges` : "graph";
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

function optionListForDevices(maxPerLayer = 32) {
  return NET.allKeys(state, maxPerLayer).map((key) => `<option value="${key}">${NET.label(state, key)}</option>`).join("");
}

function normalizeDeviceSelections() {
  const keys = NET.allKeys(state, 32);
  if (!keys.length) return;
  if (!keys.includes(state.selectedDevice)) state.selectedDevice = keys[0];
  if (!keys.includes(state.sourceDevice)) state.sourceDevice = state.selectedDevice;
  if (!keys.includes(state.targetDevice)) state.targetDevice = keys[Math.min(1, keys.length - 1)];
  state.checkedDeviceTraces = (state.checkedDeviceTraces || []).filter((key) => keys.includes(key));
  state.connections = NET.cleanConnections(state, state.connections);
  if (!state.connectionGraphInitialized && !state.connections.length) {
    state.connections = NET.defaultConnections(state);
    state.connectionGraphInitialized = true;
  }
}

function updateDeviceSelectors() {
  normalizeDeviceSelections();
  const options = optionListForDevices(32);
  $("deviceSelect").innerHTML = options;
  $("sourceDeviceSelect").innerHTML = options;
  $("targetDeviceSelect").innerHTML = options;
  $("deviceSelect").value = state.selectedDevice;
  $("sourceDeviceSelect").value = state.sourceDevice;
  $("targetDeviceSelect").value = state.targetDevice;
  $("fanCount").value = state.fanCount;
  $("fanCountOut").textContent = `${state.fanCount}`;
  $("connectionSummary").textContent = `${state.connections.length} edges`;
  updateDeviceOverrideControls();
  renderDeviceTracePicker();
}

function renderDeviceTracePicker() {
  const picker = $("deviceTracePicker");
  if (!picker) return;
  const keys = NET.allKeys(state, 32);
  const selected = new Set(state.checkedDeviceTraces || []);
  picker.innerHTML = keys.map((key) => `
    <label class="trace-check">
      <input type="checkbox" value="${key}" ${selected.has(key) ? "checked" : ""} />
      <span>${NET.label(state, key)}</span>
    </label>
  `).join("");
  picker.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const checked = [...picker.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
      state.checkedDeviceTraces = checked;
      updateTraceSelectionSummary();
      drawSelectedDeviceCurrents();
    });
  });
  updateTraceSelectionSummary();
}

function updateTraceSelectionSummary() {
  const output = $("checkedTraceSummary");
  if (!output) return;
  const count = (state.checkedDeviceTraces || []).length;
  output.textContent = `${count} selected`;
}

function selectSourceTargetTraces() {
  state.checkedDeviceTraces = [...new Set([state.sourceDevice, state.targetDevice].filter(Boolean))];
  renderDeviceTracePicker();
  drawSelectedDeviceCurrents();
}

function clearTraceSelection() {
  state.checkedDeviceTraces = [];
  renderDeviceTracePicker();
  drawSelectedDeviceCurrents();
}

function updateDeviceOverrideControls() {
  const parsed = NET.parse(state.selectedDevice);
  if (!parsed) return;
  const override = getDeviceOverride(parsed.layerIndex, parsed.deviceIndex);
  $("deviceModeSelect").value = override.mode || "inherit";
  $("deviceSwitchSelect").value = override.switchMethod || "inherit";
  $("deviceTiaOverride").checked = override.tia === true;
  $("deviceOverrideSummary").textContent = Object.keys(override).length ? "device override" : "layer default";
}

function applyDeviceOverride() {
  const parsed = NET.parse(state.selectedDevice);
  if (!parsed) return;
  const key = state.selectedDevice;
  const mode = $("deviceModeSelect").value;
  const switchMethod = $("deviceSwitchSelect").value;
  const tiaForced = $("deviceTiaOverride").checked;
  const override = {};
  if (mode !== "inherit") override.mode = mode;
  if (switchMethod !== "inherit") override.switchMethod = switchMethod;
  if (tiaForced) override.tia = true;
  if (Object.keys(override).length) state.deviceOverrides[key] = override;
  else delete state.deviceOverrides[key];
  const parsedLayer = parsed.layerIndex;
  state.selectedLayer = parsedLayer;
  state.traceLayer = parsedLayer;
  runAllSimulations();
}

function addConnections(connections) {
  const merged = [...state.connections, ...connections];
  state.connections = NET.cleanConnections(state, merged);
  state.connectionGraphInitialized = true;
  runAllSimulations();
}

function connectSelectedPair() {
  addConnections([{ from: state.sourceDevice, to: state.targetDevice, weight: 1 }]);
}

function connectFanOut() {
  addConnections(NET.fanOut(state, state.sourceDevice, state.fanCount));
}

function connectFanIn() {
  addConnections(NET.fanIn(state, state.targetDevice, state.fanCount));
}

function clearConnections() {
  state.connections = [];
  state.connectionGraphInitialized = true;
  runAllSimulations();
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

function drawTimingLane(ctx, timeline, values, plot, laneIndex, laneCount, options) {
  const bounds = laneBounds(plot, laneIndex, laneCount);
  drawLaneBackground(ctx, plot, bounds, laneIndex, options);
  drawLaneTrace(ctx, timeline, values, plot, bounds, 0, Math.max(Number(options.max || 1), 0.001), options.color, options.width || 1.8, options.alpha || 1);
}

function laneBounds(plot, laneIndex, laneCount) {
  const laneHeight = (plot.bottom - plot.top) / laneCount;
  const laneTop = plot.top + laneHeight * laneIndex + 7;
  const laneBottom = plot.top + laneHeight * (laneIndex + 1) - 7;
  return { top: laneTop, bottom: laneBottom, mid: (laneTop + laneBottom) / 2 };
}

function drawLaneBackground(ctx, plot, bounds, laneIndex, options) {
  const laneMax = Math.max(Number(options.max || 1), 0.001);
  const labelX = plot.left - 78;

  ctx.fillStyle = laneIndex % 2 ? "rgba(241,246,250,0.55)" : "rgba(255,255,255,0)";
  ctx.fillRect(plot.left, bounds.top - 4, plot.right - plot.left, bounds.bottom - bounds.top + 8);
  ctx.strokeStyle = "#e2ebf1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.left, bounds.bottom);
  ctx.lineTo(plot.right, bounds.bottom);
  ctx.stroke();

  ctx.fillStyle = options.color;
  ctx.font = "800 10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(options.label, labelX + 64, bounds.mid + 3);
  ctx.textAlign = "left";

  if (Number.isFinite(options.threshold)) {
    const thresholdY = valueToY(options.threshold, 0, laneMax, { ...plot, top: bounds.top, bottom: bounds.bottom });
    ctx.strokeStyle = "rgba(138,63,252,0.28)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(plot.left, thresholdY);
    ctx.lineTo(plot.right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawLaneTrace(ctx, timeline, values, plot, bounds, min, max, color, width = 1.8, alpha = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = timeToX(timeline[index].t, timeline, plot);
    const y = valueToY(clamp(value || 0, min, max), min, max, { ...plot, top: bounds.top, bottom: bounds.bottom });
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function meanValues(traces, length) {
  if (!traces.length) return new Array(length).fill(0);
  const out = new Array(length).fill(0);
  traces.forEach((trace) => {
    trace.forEach((value, index) => {
      out[index] += value || 0;
    });
  });
  return out.map((value) => value / traces.length);
}

function drawEndpointLabel(ctx, timeline, values, plot, min, max, label, color, offsetY = 0) {
  if (!values.length) return;
  const index = values.length - 1;
  const x = Math.min(plot.right - 116, timeToX(timeline[index].t, timeline, plot) - 116);
  const y = clamp(valueToY(values[index], min, max, plot) + offsetY, plot.top + 14, plot.bottom - 8);
  ctx.fillStyle = "rgba(251,253,255,0.9)";
  ctx.fillRect(x - 5, y - 11, 112, 16);
  ctx.fillStyle = color;
  ctx.font = "800 10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(label, x, y);
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

function devicePosition(layerIndex, deviceIndex, width, height) {
  const layerCount = Math.max(1, state.layers.length);
  const left = 82;
  const right = width - 50;
  const top = 88;
  const bottom = height - 46;
  const x = layerCount === 1 ? (left + right) / 2 : lerp(left, right, layerIndex / (layerCount - 1));
  const visible = Math.min(state.layers[layerIndex]?.devices || 1, 12);
  const row = deviceIndex % visible;
  const y = visible === 1 ? (top + bottom) / 2 : lerp(top, bottom, row / (visible - 1));
  return { x, y };
}

function drawNetworkCanvas() {
  const canvas = $("networkCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Device-level input-output network", `${transferModeText()}; edges carry emitted optical drive`);

  state.layers.forEach((layer, layerIndex) => {
    const p = devicePosition(layerIndex, 0, width, height);
    ctx.fillStyle = "#627381";
    ctx.font = "800 11px Malgun Gothic, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(layer.name, p.x, 68);
    ctx.textAlign = "left";
  });

  ctx.lineWidth = 1.2;
  state.connections.forEach((connection) => {
    const from = NET.parse(connection.from);
    const to = NET.parse(connection.to);
    if (!from || !to) return;
    const a = devicePosition(from.layerIndex, from.deviceIndex, width, height);
    const b = devicePosition(to.layerIndex, to.deviceIndex, width, height);
    ctx.strokeStyle = connection.from === state.sourceDevice || connection.to === state.targetDevice
      ? "rgba(11,112,179,0.72)"
      : "rgba(112,132,146,0.28)";
    ctx.beginPath();
    ctx.moveTo(a.x + 8, a.y);
    ctx.lineTo(b.x - 8, b.y);
    ctx.stroke();
  });

  state.layers.forEach((layer, layerIndex) => {
    const visible = Math.min(layer.devices, 12);
    for (let deviceIndex = 0; deviceIndex < visible; deviceIndex += 1) {
      const key = deviceKey(layerIndex, deviceIndex);
      const config = getDeviceConfig(layer, layerIndex, deviceIndex);
      const p = devicePosition(layerIndex, deviceIndex, width, height);
      const active = key === state.selectedDevice || key === state.sourceDevice || key === state.targetDevice;
      const color = config.mode === "LTM" ? "#0b61b5" : config.mode === "STM" ? "#0f9d91" : "#d98612";
      ctx.fillStyle = active ? "#fff" : "#f7fafc";
      ctx.strokeStyle = active ? "#0b70b3" : color;
      ctx.lineWidth = active ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, active ? 10 : 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "800 9px Malgun Gothic, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(config.mode === "LTM" ? "L" : config.mode === "STM" ? "S" : "A", p.x, p.y + 3);
    }
  });
  ctx.textAlign = "left";
  $("networkGraphLabel").textContent = `${state.connections.length} edges / ${Object.keys(state.deviceOverrides).length} overrides / ${transferModeText()}`;
}

function traceForKey(key, drive, kind = "block") {
  const parsed = NET.parse(key);
  if (!parsed) return null;
  const layer = state.layers[parsed.layerIndex];
  if (!layer) return null;
  return simulateDeviceTrace(latestTimeline, drive, layer, parsed.layerIndex, parsed.deviceIndex, kind);
}

function simulateConnectionResponse() {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  const uvDrive = timeline.map((point) => state.intensity > 0 ? point.uv / state.intensity : 0);
  const graph = latestBlock || simulateBlockGraph();
  const sourceTrace = graph.nodeMap[state.sourceDevice] || traceForKey(state.sourceDevice, uvDrive, "block");
  if (!sourceTrace) return null;
  const outgoing = state.connections.filter((connection) => connection.from === state.sourceDevice);
  const incoming = state.connections.filter((connection) => connection.to === state.targetDevice);
  const edges = outgoing.length ? outgoing : incoming.length ? incoming : [{ from: state.sourceDevice, to: state.targetDevice, weight: 1 }];
  const targets = edges.slice(0, Math.max(1, state.fanCount)).map((edge) => {
    const targetTrace = graph.nodeMap[edge.to] || traceForKey(edge.to, uvDrive, "block");
    return targetTrace ? { ...targetTrace, edge } : null;
  }).filter(Boolean);
  return { timeline, uvDrive, sourceTrace, targets, graph };
}

function delayedTrace(values, timeline, delayMs) {
  const delay = Number(delayMs || 0);
  if (!delay || timeline.length < 2) return values;
  const totalTime = timeline[timeline.length - 1].t - timeline[0].t;
  const dt = totalTime / Math.max(1, timeline.length - 1);
  const steps = Math.max(0, Math.round((delay / 1000) / Math.max(dt, 0.000001)));
  return values.map((_, index) => (index >= steps ? values[index - steps] : 0));
}

function oeoFanoutScale(node) {
  const splitterLoss = 10 ** (-state.splitterLossDb / 10);
  const fanoutCount = Math.max(1, node?.outgoingEdges || 1);
  return splitterLoss * state.edgeCoupling / Math.sqrt(fanoutCount);
}

function driverUvFromVoltageMv(voltageMv) {
  const voltage = Math.max(0, voltageMv) / 1000;
  const threshold = state.driverThresholdMv / 1000;
  return clamp((voltage - threshold) * state.driverGain, 0, state.driverMax);
}

function drawMiniStat(ctx, x, y, label, value, color) {
  ctx.fillStyle = color;
  ctx.font = "800 10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#203645";
  ctx.font = "800 12px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(value, x, y + 15);
}

function drawOeoTransferCurve(ctx, plot, sourceNode, edgeUvPeak) {
  const voltageMv = sourceNode.readoutVoltage.map((value) => value * 1000);
  const peakMv = Math.max(...voltageMv, state.driverThresholdMv * 2, 5);
  const xMax = Math.max(8, peakMv * 1.25, state.driverThresholdMv + 4);
  const yMax = Math.max(state.driverMax, 0.1);
  const fanoutScale = oeoFanoutScale(sourceNode);

  drawGrid(ctx, plot, 4, 4);
  ctx.fillStyle = "#1d3342";
  ctx.font = "800 12px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("Static driver curve", plot.left, plot.top - 14);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("|V_TIA| -> UV_out", plot.left, plot.top - 2);

  ctx.strokeStyle = "#d98612";
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  for (let i = 0; i <= 160; i += 1) {
    const v = xMax * i / 160;
    const y = driverUvFromVoltageMv(v);
    const xPix = lerp(plot.left, plot.right, v / xMax);
    const yPix = valueToY(y, 0, yMax, plot);
    if (i === 0) ctx.moveTo(xPix, yPix);
    else ctx.lineTo(xPix, yPix);
  }
  ctx.stroke();

  ctx.strokeStyle = "#c34c3c";
  ctx.lineWidth = 1.7;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  for (let i = 0; i <= 160; i += 1) {
    const v = xMax * i / 160;
    const y = clamp(driverUvFromVoltageMv(v) * fanoutScale, 0, yMax);
    const xPix = lerp(plot.left, plot.right, v / xMax);
    const yPix = valueToY(y, 0, yMax, plot);
    if (i === 0) ctx.moveTo(xPix, yPix);
    else ctx.lineTo(xPix, yPix);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  const thresholdX = lerp(plot.left, plot.right, clamp(state.driverThresholdMv / xMax, 0, 1));
  ctx.strokeStyle = "rgba(19,37,48,0.32)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(thresholdX, plot.top);
  ctx.lineTo(thresholdX, plot.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(`${state.driverThresholdMv.toFixed(1)} mV`, thresholdX + 4, plot.bottom - 8);

  const opMv = Math.max(...voltageMv, 0);
  const opUv = driverUvFromVoltageMv(opMv);
  const opX = lerp(plot.left, plot.right, clamp(opMv / xMax, 0, 1));
  const opY = valueToY(opUv, 0, yMax, plot);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#d98612";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(opX, opY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#667887";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("0", plot.left - 3, plot.bottom + 16);
  ctx.fillText(`${round(xMax, 1)} mV`, plot.right - 46, plot.bottom + 16);
  ctx.fillText(`${round(yMax, 2)}`, plot.left - 30, plot.top + 4);

  const statsY = plot.bottom + 38;
  drawMiniStat(ctx, plot.left, statsY, "peak |V_TIA|", `${round(opMv, 2)} mV`, "#3d7fb8");
  drawMiniStat(ctx, plot.left + 112, statsY, "peak UV_out", `${round(opUv, 3)}`, "#d98612");
  drawMiniStat(ctx, plot.left + 224, statsY, "delivered UV", `${round(edgeUvPeak, 3)}`, "#c34c3c");
}

function drawOeoTransferTuning() {
  const canvas = $("oeoTransferCanvas");
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const graph = latestBlock || simulateBlockGraph();
  const sourceNode = graph.nodeMap[state.sourceDevice] || graph.nodeMap[state.selectedDevice];

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  if (!sourceNode) {
    drawPlotTitle(ctx, "O/E/O transfer tuning", "select a source device");
    return;
  }

  const timeline = graph.timeline;
  const stacked = width < 820;
  const timePlot = stacked
    ? { left: 96, right: width - 18, top: 66, bottom: Math.min(height - 252, 362) }
    : { left: 106, right: Math.round(width * 0.64), top: 66, bottom: height - 68 };
  const curvePlot = stacked
    ? { left: 64, right: width - 24, top: timePlot.bottom + 76, bottom: height - 96 }
    : { left: timePlot.right + 56, right: width - 24, top: 82, bottom: height - 104 };
  const voltageMv = sourceNode.readoutVoltage.map((value) => value * 1000);
  const continuousUv = sourceNode.continuousOpticalOutput || sourceNode.opticalOutput || new Array(timeline.length).fill(0);
  const emitterUv = sourceNode.opticalOutput || continuousUv;
  const ifState = sourceNode.ifMembrane || new Array(timeline.length).fill(0);
  const fanoutScale = oeoFanoutScale(sourceNode);
  const edgeUv = delayedTrace(emitterUv.map((value) => clamp(value * fanoutScale, 0, state.driverMax)), timeline, state.edgeDelay);
  const currentPeak = Math.max(...sourceNode.trace, 1);
  const voltagePeak = Math.max(...voltageMv, state.driverThresholdMv, 0.1);
  const statePeak = Math.max(...ifState, state.ifThreshold, state.ltmWriteThreshold, 0.2);
  const outputPeak = Math.max(state.driverMax, ...emitterUv, ...edgeUv, 0.1);
  const transferKind = sourceNode.transferKind || transferModeText();

  drawPlotTitle(ctx, "O/E/O transfer tuning", `${NET.label(state, sourceNode.key)} / ${transferKind}`);
  drawGrid(ctx, timePlot, 4, 6);
  drawTimingLane(ctx, timeline, sourceNode.trace, timePlot, 0, 4, {
    label: "I_in",
    color: "#0f9d91",
    max: currentPeak,
    width: 2.1,
  });
  drawTimingLane(ctx, timeline, voltageMv, timePlot, 1, 4, {
    label: "|V_TIA|",
    color: "#3d7fb8",
    max: voltagePeak,
    threshold: state.driverThresholdMv,
    width: 2,
  });
  drawTimingLane(ctx, timeline, ifState, timePlot, 2, 4, {
    label: "IF/latch",
    color: "#8a3ffc",
    max: statePeak,
    threshold: sourceNode.mode === "LTM" ? state.ltmWriteThreshold : state.ifThreshold,
    width: 1.9,
  });
  drawTimingLane(ctx, timeline, emitterUv, timePlot, 3, 4, {
    label: "UV_out",
    color: "#d98612",
    max: outputPeak,
    width: 2,
  });
  const outputBounds = laneBounds(timePlot, 3, 4);
  drawLaneTrace(ctx, timeline, edgeUv, timePlot, outputBounds, 0, outputPeak, "#c34c3c", 1.7, 0.9);
  drawTimeLabels(ctx, timeline, timePlot);

  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(`fanout scale ${round(fanoutScale, 3)} / delay ${state.edgeDelay} ms`, timePlot.left, timePlot.top - 10);
  const statY = stacked ? timePlot.bottom + 26 : height - 30;
  const statX = timePlot.left + 8;
  drawMiniStat(ctx, statX, statY, "I peak", `${round(currentPeak, 2)} nA`, "#0f9d91");
  drawMiniStat(ctx, statX + 100, statY, "V peak", `${round(voltagePeak, 2)} mV`, "#3d7fb8");
  drawMiniStat(ctx, statX + 200, statY, "UV_out peak", `${round(Math.max(...emitterUv, 0), 3)}`, "#d98612");
  if (!stacked || width > 520) {
    drawMiniStat(ctx, statX + 300, statY, "delivered UV", `${round(Math.max(...edgeUv, 0), 3)}`, "#c34c3c");
  }

  drawOeoTransferCurve(ctx, curvePlot, sourceNode, Math.max(...edgeUv, 0));
}

function drawConnectionResponse() {
  const canvas = $("connectionResponseCanvas");
  const { ctx, width, height } = setupCanvas(canvas);
  const result = simulateConnectionResponse();
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  if (!result) {
    drawPlotTitle(ctx, "Connected device current response", "select source and target devices");
    return;
  }

  const timingPlot = { left: 96, right: width - 20, top: 62, bottom: 188 };
  const currentPlot = { left: 64, right: width - 20, top: 236, bottom: height - 46 };
  const targetTraces = result.targets.map((target) => target.trace);
  const targetMean = meanValues(targetTraces, result.timeline.length);
  const targetMax = targetTraces.length ? Math.max(...targetTraces.flat(), 1) : 1;
  const maxCurrent = Math.max(...result.sourceTrace.trace, ...targetMean, targetMax, 1) * 1.12;
  const sourceLabel = NET.label(state, state.sourceDevice);
  const targetLabel = result.targets.length === 1 ? NET.label(state, result.targets[0].edge.to) : `${result.targets.length} connected targets`;

  const transferKind = result.sourceTrace.transferKind || transferModeText();
  drawPlotTitle(ctx, "Connected device current response", `${sourceLabel} -> ${targetLabel}`);
  drawGrid(ctx, timingPlot, 3, 6);
  const opticalOutput = result.sourceTrace.opticalOutput || new Array(result.timeline.length).fill(0);
  const ifState = result.sourceTrace.ifMembrane || new Array(result.timeline.length).fill(0);
  const statePeak = Math.max(...ifState, state.ifThreshold, state.ltmWriteThreshold, 0.2);
  drawTimingLane(ctx, result.timeline, result.uvDrive, timingPlot, 0, 3, {
    label: "External UV",
    color: "#7b2ff2",
    max: 1.1,
    width: 2,
  });
  drawTimingLane(ctx, result.timeline, opticalOutput, timingPlot, 1, 3, {
    label: "Emitter UV",
    color: "#d98612",
    max: Math.max(state.driverMax, 0.1),
    width: 2,
  });
  drawTimingLane(ctx, result.timeline, ifState, timingPlot, 2, 3, {
    label: "IF / latch",
    color: "#8a3ffc",
    max: statePeak,
    threshold: result.sourceTrace.mode === "LTM" ? state.ltmWriteThreshold : state.ifThreshold,
    width: 1.8,
  });
  if (result.sourceTrace.emitterSpikes?.length) {
    ctx.strokeStyle = "rgba(138,63,252,0.75)";
    ctx.lineWidth = 1;
    result.sourceTrace.emitterSpikes.forEach((time) => {
      const x = timeToX(time, result.timeline, timingPlot);
      ctx.beginPath();
      ctx.moveTo(x, timingPlot.top + 3);
      ctx.lineTo(x, timingPlot.bottom - 3);
      ctx.stroke();
    });
  }
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(`${transferKind}; lanes are normalized separately`, timingPlot.left, timingPlot.top - 10);
  drawTimeLabels(ctx, result.timeline, timingPlot);

  drawGrid(ctx, currentPlot, 4, 6);
  result.targets.slice(0, 12).forEach((target) => {
    drawLine(ctx, result.timeline, target.trace, currentPlot, 0, maxCurrent, "#9aaebb", 0.9, 0.22);
  });
  if (targetMean.length) {
    drawLine(ctx, result.timeline, targetMean, currentPlot, 0, maxCurrent, "#c34c3c", 2.4, 0.95);
  }
  drawLine(ctx, result.timeline, result.sourceTrace.trace, currentPlot, 0, maxCurrent, "#0f9d91", 2.5, 1);
  drawEndpointLabel(ctx, result.timeline, result.sourceTrace.trace, currentPlot, 0, maxCurrent, "source current", "#0f9d91", -10);
  drawEndpointLabel(ctx, result.timeline, targetMean, currentPlot, 0, maxCurrent, result.targets.length === 1 ? "target current" : "target mean", "#c34c3c", 12);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("photocurrent response after optical fan-out", currentPlot.left, currentPlot.top - 10);
  drawAxis(ctx, result.timeline, currentPlot, maxCurrent, "I_photo (nA)");
}

function drawSelectedDeviceCurrents() {
  const canvas = $("selectedDeviceCurrentCanvas");
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const graph = latestBlock || simulateBlockGraph();
  const timeline = graph.timeline;
  const selectedKeys = (state.checkedDeviceTraces || []).filter((key) => graph.nodeMap[key]);
  const uvDrive = timeline.map((point) => state.intensity > 0 ? point.uv / state.intensity : 0);

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  if (!selectedKeys.length) {
    drawPlotTitle(ctx, "Selected device currents", "check one or more device cells to overlay their current traces");
    return;
  }

  const uvPlot = { left: 58, right: width - 20, top: 48, bottom: 112 };
  const currentPlot = { left: 58, right: width - 20, top: 154, bottom: height - 42 };
  const selectedNodes = selectedKeys.map((key) => graph.nodeMap[key]);
  const maxCurrent = Math.max(...selectedNodes.flatMap((node) => node.trace), 1) * 1.12;
  drawPlotTitle(ctx, "Selected device currents", `${selectedKeys.length} device traces from current Block graph`);

  drawGrid(ctx, uvPlot, 2, 6);
  drawLine(ctx, timeline, uvDrive, uvPlot, 0, 1.1, "#7b2ff2", 2);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("UV input", uvPlot.left, uvPlot.top - 8);

  drawGrid(ctx, currentPlot, 4, 6);
  const colors = ["#0f9d91", "#0b61b5", "#d98612", "#7b2ff2", "#c34c3c", "#243846", "#6f8b3d", "#b45f06"];
  selectedNodes.forEach((node, index) => {
    drawLine(ctx, timeline, node.trace, currentPlot, 0, maxCurrent, colors[index % colors.length], index === 0 ? 2.2 : 1.4, index < 8 ? 0.85 : 0.35);
    const labelX = currentPlot.left + 8;
    const labelY = currentPlot.top + 15 + index * 13;
    if (index < 10) {
      ctx.fillStyle = colors[index % colors.length];
      ctx.font = "800 10px Malgun Gothic, Segoe UI, sans-serif";
      ctx.fillText(NET.label(state, node.key), labelX, labelY);
    }
  });
  drawAxis(ctx, timeline, currentPlot, maxCurrent, "I_photo (nA)");
}

function parameterDrive(timeline) {
  return timeline.map((point) => state.intensity > 0 ? point.uv / state.intensity : 0);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function optimizerKind() {
  return state.optimizerTarget === "snn" ? "snn" : "ann";
}

function snapshotOptimizedState() {
  return {
    layers: deepClone(state.layers),
    connections: deepClone(state.connections),
    deviceOverrides: deepClone(state.deviceOverrides),
    connectionGraphInitialized: state.connectionGraphInitialized,
    driverThresholdMv: state.driverThresholdMv,
    driverGain: state.driverGain,
    driverMax: state.driverMax,
    splitterLossDb: state.splitterLossDb,
    edgeCoupling: state.edgeCoupling,
    edgeResidual: state.edgeResidual,
    edgeDelay: state.edgeDelay,
    ifTauMs: state.ifTauMs,
    ifThreshold: state.ifThreshold,
    ifGain: state.ifGain,
    ifRefractoryMs: state.ifRefractoryMs,
    emitterPulseMs: state.emitterPulseMs,
    ltmWriteThreshold: state.ltmWriteThreshold,
    ltmReadoutGain: state.ltmReadoutGain,
    ltmRetentionMs: state.ltmRetentionMs,
  };
}

function restoreOptimizedState(snapshot) {
  Object.assign(state, deepClone(snapshot));
}

function applyOptimizedState(candidate) {
  if (!candidate?.snapshot) return;
  const activeTab = state.activeTab;
  restoreOptimizedState(candidate.snapshot);
  state.activeTab = activeTab;
  state.connectionGraphInitialized = true;
}

function withCandidate(candidate, fn) {
  const previous = snapshotOptimizedState();
  applyOptimizedState(candidate);
  try {
    return fn();
  } finally {
    restoreOptimizedState(previous);
  }
}

function hiddenLayerIndexes(layers) {
  return layers
    .map((layer, index) => ({ layer, index }))
    .filter((item) => item.layer.role === "hidden")
    .map((item) => item.index);
}

function countModeMix(layers) {
  let stm = 0;
  let ltm = 0;
  layers.forEach((layer) => {
    const ltmCount = layer.mode === "LTM" ? layer.devices : layer.mode === "adaptive" ? Math.floor(layer.devices / 2) : 0;
    ltm += ltmCount;
    stm += layer.devices - ltmCount;
  });
  return { stm, ltm };
}

function candidateConnections(candidateState, random, maxFanout) {
  const connections = [];
  for (let layerIndex = 0; layerIndex < candidateState.layers.length - 1; layerIndex += 1) {
    const sourceKeys = NET.layerKeys(candidateState, layerIndex, 32);
    const targetKeys = NET.layerKeys(candidateState, layerIndex + 1, 32);
    if (!sourceKeys.length || !targetKeys.length) continue;
    sourceKeys.forEach((source, sourceIndex) => {
      const fanout = clamp(1 + Math.floor(random() * maxFanout), 1, Math.max(1, Math.min(maxFanout, targetKeys.length)));
      for (let f = 0; f < fanout; f += 1) {
        const jitter = Math.floor(random() * targetKeys.length);
        const target = targetKeys[(sourceIndex * fanout + f + jitter) % targetKeys.length];
        connections.push({ from: source, to: target, weight: round(0.45 + random() * 0.65, 2) });
      }
    });
  }
  return NET.cleanConnections(candidateState, connections);
}

function buildOptimizerCandidate(index) {
  const random = seededRandom(761 + index * 7919 + state.optimizerIterations * 13);
  const snapshot = snapshotOptimizedState();
  const candidateState = {
    layers: deepClone(snapshot.layers),
    connections: deepClone(snapshot.connections),
    deviceOverrides: {},
  };
  const hiddenIndexes = hiddenLayerIndexes(candidateState.layers);
  const outputIndex = Math.max(0, candidateState.layers.map((layer) => layer.role).lastIndexOf("output"));
  const dataset = getDataset(optimizerKind());

  if (state.optimizerTuneSizes) {
    hiddenIndexes.forEach((layerIndex) => {
      const layer = candidateState.layers[layerIndex];
      const scale = 0.65 + random() * 0.95;
      layer.devices = clamp(Math.round(layer.devices * scale / 2) * 2, 4, state.optimizerMaxDevices);
    });
    if (dataset.outputClasses && candidateState.layers[outputIndex]) {
      const outputDevices = random() > 0.45 ? dataset.outputClasses : candidateState.layers[outputIndex].devices;
      candidateState.layers[outputIndex].devices = clamp(outputDevices, 1, Math.max(dataset.outputClasses, 16));
    }
  }

  if (state.optimizerTuneModes) {
    hiddenIndexes.forEach((layerIndex, hiddenOrder) => {
      const layer = candidateState.layers[layerIndex];
      const stmBias = state.optimizerTarget === "snn" ? 0.68 : state.optimizerTarget === "uv" ? 0.78 : 0.48;
      const draw = random();
      layer.mode = draw < stmBias ? "STM" : draw < stmBias + 0.22 ? "adaptive" : "LTM";
      layer.switchMethod = random() < (hiddenOrder % 2 ? 0.58 : 0.42) ? "gate" : "vds";
      layer.tia = true;
    });
    if (candidateState.layers[outputIndex]) {
      candidateState.layers[outputIndex].mode = state.optimizerTarget === "snn" && random() < 0.55 ? "STM" : "LTM";
      candidateState.layers[outputIndex].switchMethod = "gate";
    }
  }

  if (state.optimizerTuneConnections) {
    candidateState.connections = candidateConnections(candidateState, random, state.optimizerMaxFanout);
  }

  snapshot.layers = candidateState.layers;
  snapshot.connections = NET.cleanConnections(candidateState, candidateState.connections);
  snapshot.deviceOverrides = candidateState.deviceOverrides;
  snapshot.connectionGraphInitialized = true;

  if (state.optimizerTuneOeo) {
    snapshot.driverThresholdMv = round(clamp(state.driverThresholdMv * (0.6 + random() * 1.2), 0, 50), 2);
    snapshot.driverGain = round(clamp(state.driverGain * (0.65 + random() * 0.95), 1, 140), 2);
    snapshot.ifThreshold = round(clamp(state.ifThreshold * (0.65 + random() * 1.25), 0.05, 1.5), 3);
    snapshot.ifGain = round(clamp(state.ifGain * (0.65 + random() * 1.2), 0.1, 5), 3);
    snapshot.ltmWriteThreshold = round(clamp(state.ltmWriteThreshold * (0.65 + random() * 1.2), 0.01, 1.2), 3);
  }

  return { id: index + 1, snapshot, notes: [] };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function outputLatencyScore(trace, timeline) {
  const peak = Math.max(...trace, 1e-6);
  const threshold = peak * 0.55;
  const hit = trace.findIndex((value) => value >= threshold);
  if (hit < 0) return 0;
  const totalTime = timeline[timeline.length - 1]?.t || 1;
  return clamp(1 - (timeline[hit].t / totalTime), 0, 1);
}

function graphEnergyProxy(result) {
  const nodes = Object.values(result.nodeMap || {});
  if (!nodes.length) return 1;
  let sumOptical = 0;
  let samples = 0;
  nodes.forEach((node) => {
    (node.opticalOutput || []).forEach((value) => {
      sumOptical += value;
      samples += 1;
    });
  });
  return samples ? sumOptical / samples / Math.max(state.driverMax, 0.1) : 1;
}

function saturationPenalty(result) {
  const nodes = Object.values(result.nodeMap || {});
  let saturated = 0;
  let samples = 0;
  nodes.forEach((node) => {
    (node.opticalOutput || []).forEach((value) => {
      if (value >= state.driverMax * 0.98) saturated += 1;
      samples += 1;
    });
  });
  return samples ? saturated / samples : 0;
}

function evaluateOptimizerCandidate(candidate) {
  const kind = state.optimizerTarget === "snn" ? "snn" : "ann";
  return withCandidate(candidate, () => {
    const result = state.optimizerTarget === "uv" ? simulateBlockGraph() : simulateArchitecture(kind);
    const contract = architectureContract(kind);
    const output = result.output || result.selected;
    const outputMean = output.mean || [];
    const peak = Math.max(...outputMean, 1);
    const residual = outputMean.length ? outputMean[outputMean.length - 1] / peak : 0;
    const dynamic = clamp((peak - Math.min(...outputMean, peak)) / peak, 0, 1);
    const energy = clamp(graphEnergyProxy(result), 0, 2);
    const energyScore = clamp(1 - energy / 1.25, 0, 1);
    const robust = clamp(1 - saturationPenalty(result) * 2, 0, 1);
    const latency = outputLatencyScore(outputMean, result.timeline);
    const edgeScore = clamp((result.graph.usedEdges || 0) / Math.max(1, result.graph.edgeCount || 1), 0, 1);
    let separation = dynamic * 0.55 + clamp(1 - residual, 0, 1) * 0.25 + edgeScore * 0.2;
    let sparsity = 0.55;

    if (state.optimizerTarget === "ann" && result.readout) {
      const margin = result.readout.decisionMargin || [];
      separation = clamp(mean(margin.map((value) => Math.abs(value - 0.5) * 2)), 0, 1) * 0.65 + dynamic * 0.35;
      sparsity = clamp(1 - energy * 0.5, 0, 1);
    } else if (state.optimizerTarget === "snn") {
      const duration = result.timeline[result.timeline.length - 1]?.t || 1;
      const rate = (result.spikeCount || 0) / Math.max(1, result.selected.displayedDevices) / duration;
      const targetRate = 9;
      sparsity = clamp(1 - Math.abs(rate - targetRate) / targetRate, 0, 1);
      separation = clamp((result.spikeCount || 0) / Math.max(1, result.selected.displayedDevices * 8), 0, 1) * 0.45 + dynamic * 0.55;
    } else {
      separation = dynamic * 0.5 + clamp(1 - residual, 0, 1) * 0.35 + latency * 0.15;
      sparsity = clamp(1 - energy * 0.65, 0, 1);
    }

    const adapterPenalty = contract.runnable ? 0 : 0.08;
    const disconnectedPenalty = result.graph.edgeCount && result.graph.usedEdges === 0 ? 0.2 : 0;
    const weights = {
      separation: state.optimizerSeparationWeight,
      sparsity: state.optimizerSparsityWeight,
      latency: state.optimizerLatencyWeight,
      energy: state.optimizerEnergyWeight,
      robustness: state.optimizerRobustnessWeight,
    };
    const weightSum = Math.max(0.001, Object.values(weights).reduce((sum, value) => sum + value, 0));
    const rawScore = (
      separation * weights.separation
      + sparsity * weights.sparsity
      + latency * weights.latency
      + energyScore * weights.energy
      + robust * weights.robustness
    ) / weightSum;
    const score = clamp(rawScore - adapterPenalty - disconnectedPenalty, 0, 1);
    const modeMix = countModeMix(candidate.snapshot.layers);
    const devices = candidate.snapshot.layers.reduce((sum, layer) => sum + layer.devices, 0);
    const notes = [];
    if (!contract.runnable) notes.push("adapter");
    if (state.optimizerTuneOeo) notes.push("OEO tuned");
    if (result.graph.usedEdges < result.graph.edgeCount) notes.push("partial graph");
    if (!notes.length) notes.push("direct graph");

    return {
      ...candidate,
      target: state.optimizerTarget,
      score,
      metrics: {
        separation,
        sparsity,
        latency,
        energy,
        energyScore,
        robust,
        devices,
        stm: modeMix.stm,
        ltm: modeMix.ltm,
        edgeCount: result.graph.edgeCount,
        usedEdges: result.graph.usedEdges,
        adapter: !contract.runnable,
      },
      notes,
    };
  });
}

function runOptimizer() {
  readControls();
  $("optimizerStatus").textContent = "running";
  const candidates = [];
  const iterations = clamp(state.optimizerIterations, 20, 240);
  for (let index = 0; index < iterations; index += 1) {
    candidates.push(evaluateOptimizerCandidate(buildOptimizerCandidate(index)));
  }
  candidates.sort((a, b) => b.score - a.score);
  latestOptimizer = { target: state.optimizerTarget, candidates, best: candidates[0] || null };
  $("optimizerStatus").textContent = `${candidates.length} candidates`;
  renderOptimizerResults();
  drawOptimizerPlot();
}

function activateTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${tabName}`));
}

function applyBestCandidate() {
  const best = latestOptimizer.best;
  if (!best) {
    $("optimizerStatus").textContent = "run first";
    return;
  }
  applyOptimizedState(best);
  activateTab("blocks");
  updateTraceLayerOptions();
  writeControls();
  updateDeviceSelectors();
  runAllSimulations();
  $("simStatus").textContent = "optimizer applied";
}

function renderOptimizerResults() {
  const candidates = latestOptimizer.candidates || [];
  const best = latestOptimizer.best;
  const tbody = $("optimizerTableBody");
  if (tbody) {
    tbody.innerHTML = candidates.slice(0, 10).map((candidate, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${candidate.score.toFixed(3)}</td>
        <td>${candidate.target.toUpperCase()}</td>
        <td>${candidate.metrics.devices}</td>
        <td>${candidate.metrics.stm}/${candidate.metrics.ltm}</td>
        <td>${candidate.metrics.usedEdges}/${candidate.metrics.edgeCount}</td>
        <td>${candidate.metrics.energy.toFixed(3)}</td>
        <td>${candidate.notes.join(", ")}</td>
      </tr>
    `).join("");
  }

  $("optimizerBestBadge").textContent = best ? `candidate ${best.id}` : "none";
  $("optimizerBestScore").textContent = best ? best.score.toFixed(3) : "-";
  $("optimizerBestModeMix").textContent = best ? `${best.metrics.stm} STM / ${best.metrics.ltm} LTM` : "-";
  $("optimizerBestEdges").textContent = best ? `${best.metrics.usedEdges} used / ${best.metrics.edgeCount} configured` : "-";
  $("optimizerBestEnergy").textContent = best ? best.metrics.energy.toFixed(3) : "-";
  $("optimizerBestConstraint").textContent = best ? best.notes.join(", ") : "-";
  $("optimizerPlotLabel").textContent = candidates.length ? `${candidates.length} candidates` : "score vs energy";
}

function drawOptimizerPlot() {
  const canvas = $("optimizerCanvas");
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const candidates = latestOptimizer.candidates || [];
  const plot = { left: 58, right: width - 28, top: 46, bottom: height - 42 };
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Architecture candidate trade-off", "higher score and lower energy proxy are preferred");
  drawGrid(ctx, plot, 4, 6);
  ctx.fillStyle = "#667887";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("Energy proxy", (plot.left + plot.right) / 2 - 32, plot.bottom + 28);
  ctx.save();
  ctx.translate(16, (plot.top + plot.bottom) / 2 + 28);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Proxy score", 0, 0);
  ctx.restore();

  if (!candidates.length) {
    ctx.fillStyle = "#627381";
    ctx.font = "800 12px Malgun Gothic, Segoe UI, sans-serif";
    ctx.fillText("Run optimizer to generate architecture candidates.", plot.left + 12, plot.top + 26);
    return;
  }

  const maxEnergy = Math.max(...candidates.map((candidate) => candidate.metrics.energy), 0.1) * 1.08;
  candidates.forEach((candidate, index) => {
    const x = lerp(plot.left, plot.right, clamp(candidate.metrics.energy / maxEnergy, 0, 1));
    const y = valueToY(candidate.score, 0, 1, plot);
    const isBest = index === 0;
    ctx.fillStyle = isBest ? "#d98612" : candidate.metrics.adapter ? "rgba(195,76,60,0.45)" : "rgba(11,97,181,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, isBest ? 6 : 3.6, 0, Math.PI * 2);
    ctx.fill();
    if (isBest) {
      ctx.strokeStyle = "#8a5200";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#8a5200";
      ctx.font = "800 10px Malgun Gothic, Segoe UI, sans-serif";
      ctx.fillText("best", x + 8, y - 8);
    }
  });

  ctx.fillStyle = "#667887";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("0", plot.left - 3, plot.bottom + 16);
  ctx.fillText(maxEnergy.toFixed(2), plot.right - 30, plot.bottom + 16);
  ctx.fillText("1.0", plot.left - 34, plot.top + 4);
}

function invalidateOptimizer(status = "settings changed") {
  latestOptimizer = { candidates: [], best: null, target: state.optimizerTarget };
  if ($("optimizerStatus")) $("optimizerStatus").textContent = status;
  if ($("optimizerTableBody")) renderOptimizerResults();
  if ($("optimizerCanvas")) drawOptimizerPlot();
}

function formatParamValue(name, value) {
  const meta = MODEL.PARAM_META[name];
  const digits = meta.step < 0.01 ? 3 : meta.step < 0.1 ? 2 : 1;
  return `${Number(value).toFixed(digits)} ${meta.unit}`;
}

function renderParameterControls() {
  const container = $("parameterSliders");
  if (!container) return;
  state.deviceModel = MODEL.sanitizeModel(state.deviceModel);
  const mode = state.paramMode === "LTM" ? "LTM" : "STM";
  const params = state.deviceModel[mode];
  const routePrefix = state.paramSwitchMethod === "gate" ? "gate" : "vds";
  const routeGainKey = `${routePrefix}Gain`;
  const routePersistenceKey = `${routePrefix}Persistence`;
  container.innerHTML = Object.entries(MODEL.PARAM_META).map(([name, meta]) => `
    <label class="parameter-row">
      <span>${meta.label}<output id="paramOut_${name}">${formatParamValue(name, params[name])}</output></span>
      <input class="parameter-slider" data-param="${name}" type="range" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${params[name]}" />
    </label>
  `).join("") + `
    <label class="parameter-row">
      <span>Route gain multiplier<output id="routeGainOut">${state.deviceModel.route[routeGainKey].toFixed(2)} x</output></span>
      <input class="route-slider" data-route-param="${routeGainKey}" type="range" min="0.2" max="2" step="0.01" value="${state.deviceModel.route[routeGainKey]}" />
    </label>
    <label class="parameter-row">
      <span>Route persistence multiplier<output id="routePersistenceOut">${state.deviceModel.route[routePersistenceKey].toFixed(2)} x</output></span>
      <input class="route-slider" data-route-param="${routePersistenceKey}" type="range" min="0.2" max="2" step="0.01" value="${state.deviceModel.route[routePersistenceKey]}" />
    </label>
  `;
  container.querySelectorAll(".parameter-slider").forEach((slider) => {
    slider.addEventListener("input", () => {
      const name = slider.dataset.param;
      state.deviceModel[mode][name] = Number(slider.value);
      const output = $(`paramOut_${name}`);
      if (output) output.textContent = formatParamValue(name, state.deviceModel[mode][name]);
      latestBlock = simulateBlockGraph();
      latestAnn = simulateArchitecture("ann");
      latestSnn = simulateArchitecture("snn");
      updateMetrics(state.activeTab === "snn" ? latestSnn : latestAnn);
      updateParameterFitSummary();
      invalidateOptimizer("rerun recommended");
      drawAllActive();
    });
  });
  container.querySelectorAll(".route-slider").forEach((slider) => {
    slider.addEventListener("input", () => {
      const name = slider.dataset.routeParam;
      state.deviceModel.route[name] = Number(slider.value);
      const output = document.getElementById(name.endsWith("Gain") ? "routeGainOut" : "routePersistenceOut");
      if (output) output.textContent = `${state.deviceModel.route[name].toFixed(2)} x`;
      latestBlock = simulateBlockGraph();
      latestAnn = simulateArchitecture("ann");
      latestSnn = simulateArchitecture("snn");
      updateMetrics(state.activeTab === "snn" ? latestSnn : latestAnn);
      updateParameterFitSummary();
      invalidateOptimizer("rerun recommended");
      drawAllActive();
    });
  });
}

function parameterModelTrace() {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  const drive = parameterDrive(timeline);
  const modelParams = MODEL.params(state.deviceModel, state.paramMode, state.paramSwitchMethod, 1, 0);
  return {
    timeline,
    drive,
    trace: MODEL.response(timeline, drive, modelParams, { includeNoise: false }),
  };
}

function updateParameterFitSummary() {
  const measurement = MODEL.parseMeasurement(state.measurementText);
  const model = parameterModelTrace();
  const measured = MODEL.interpolate(measurement, model.timeline);
  const error = measured.length ? MODEL.rmse(model.trace, measured) : null;
  $("measurementSummary").textContent = measurement.length ? `${measurement.length} points loaded` : "no data";
  $("fitPointCount").textContent = `${measurement.length}`;
  $("fitRmse").textContent = error === null ? "-" : `${round(error, 3)} nA`;
  $("fitRouteLabel").textContent = routeShort(state.paramSwitchMethod);
}

function drawParameterFit() {
  const canvas = $("parameterFitCanvas");
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  const model = parameterModelTrace();
  const measurement = MODEL.parseMeasurement(state.measurementText);
  const measured = MODEL.interpolate(measurement, model.timeline);
  const uvPlot = { left: 58, right: width - 20, top: 52, bottom: 120 };
  const currentPlot = { left: 58, right: width - 20, top: 164, bottom: height - 42 };
  const maxMeasured = measured.length ? Math.max(...measured, 1) : 1;
  const maxCurrent = Math.max(...model.trace, maxMeasured, 1) * 1.12;

  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, "Measured vs compact model overlay", `${state.paramMode} / ${routeShort(state.paramSwitchMethod)} / same UV pulse program`);

  drawGrid(ctx, uvPlot, 2, 6);
  drawLine(ctx, model.timeline, model.drive, uvPlot, 0, 1.1, "#7b2ff2", 2);
  ctx.fillStyle = "#627381";
  ctx.font = "10px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText("UV input", uvPlot.left, uvPlot.top - 8);

  drawGrid(ctx, currentPlot, 4, 6);
  drawLine(ctx, model.timeline, model.trace, currentPlot, 0, maxCurrent, "#0f9d91", 2.4);
  if (measured.length) {
    drawLine(ctx, model.timeline, measured, currentPlot, 0, maxCurrent, "#c34c3c", 1.9, 0.82);
    ctx.fillStyle = "#c34c3c";
    measurement.slice(0, 400).forEach((point) => {
      const x = timeToX(point.t, model.timeline, currentPlot);
      const y = valueToY(point.current, 0, maxCurrent, currentPlot);
      ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
    });
  }
  drawAxis(ctx, model.timeline, currentPlot, maxCurrent, "I_photo (nA)");
  updateParameterFitSummary();
}

function loadDemoMeasurement() {
  const timeline = latestTimeline.length ? latestTimeline : generateTimeline();
  const trialModel = MODEL.sanitizeModel(state.deviceModel);
  const mode = state.paramMode === "LTM" ? "LTM" : "STM";
  trialModel[mode].gain *= 1.14;
  trialModel[mode].dark += 0.22;
  trialModel[mode].tauRise *= 1.22;
  trialModel[mode].tauDecay *= 1.28;
  trialModel[mode].retention *= 0.86;
  const drive = parameterDrive(timeline);
  const trace = MODEL.response(timeline, drive, MODEL.params(trialModel, mode, state.paramSwitchMethod, 1, 0), { includeNoise: false });
  const rows = ["# time_s,current_nA"];
  for (let index = 0; index < timeline.length; index += 18) {
    const ripple = Math.sin(index * 0.19) * 0.45;
    rows.push(`${timeline[index].t.toFixed(5)},${Math.max(0, trace[index] + ripple).toFixed(5)}`);
  }
  state.measurementText = rows.join("\n");
  $("measurementInput").value = state.measurementText;
  $("fitStatus").textContent = "demo loaded";
  drawParameterFit();
}

function autoFitParameters() {
  readControls();
  const measurement = MODEL.parseMeasurement(state.measurementText);
  if (!measurement.length) {
    $("fitStatus").textContent = "load data first";
    drawParameterFit();
    return;
  }
  const model = parameterModelTrace();
  const result = MODEL.fitMode(state.deviceModel, state.paramMode, state.paramSwitchMethod, model.timeline, model.drive, measurement);
  state.deviceModel = result.model;
  $("fitStatus").textContent = result.rmse === null ? "fit skipped" : `fit RMSE ${round(result.rmse, 3)} nA`;
  runAllSimulations();
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
    outputTrace: selected.tiaEnabledForLayer && state.tiaEnabled ? selected.voltage.map((value) => Math.abs(value)) : selected.activation,
    outputColor: "#d98612",
    outputLabel: selected.tiaEnabledForLayer && state.tiaEnabled ? "|V_TIA| (V)" : "Activation",
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
  if (state.activeTab === "blocks") {
    drawOeoTransferTuning();
    drawNetworkCanvas();
    drawConnectionResponse();
    drawSelectedDeviceCurrents();
  }
  if (state.activeTab === "params") {
    drawParameterFit();
  }
  if (state.activeTab === "optimizer") {
    renderOptimizerResults();
    drawOptimizerPlot();
  }
  if (state.activeTab === "ann") {
    drawDatasetInputPreview("ann");
    renderArchitecture("annArchitecture", latestAnn);
    drawAnnTrace();
    drawHeatmap();
    drawAnnReadout();
  }
  if (state.activeTab === "snn") {
    drawDatasetInputPreview("snn");
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

function renderDatasetPanel(kind) {
  const panel = $(`${kind}DatasetPanel`);
  if (!panel) return;
  const contract = architectureContract(kind);
  const { dataset } = contract;
  const inputBadge = statusClass(contract.inputStatus);
  const outputBadge = statusClass(contract.outputStatus);
  const sourceTarget = dataset.sourceUrl && dataset.sourceUrl !== "NEXT_WORK.md" ? ' target="_blank" rel="noreferrer"' : "";

  panel.innerHTML = `
    <div class="dataset-card-head">
      <div>
        <span class="mini-title">${dataset.label}</span>
        <p>${dataset.task}</p>
      </div>
      <span class="status-pill ${contract.runnable ? "ok" : "needs-adapter"}">${contract.simulationMode}</span>
    </div>
    <dl class="contract-list">
      <div><dt>Source</dt><dd><a href="${dataset.sourceUrl}"${sourceTarget}>${dataset.sourceName}</a></dd></div>
      <div><dt>Sample format</dt><dd>${dataset.sampleFormat}</dd></div>
      <div><dt>Raw input</dt><dd>${dataset.rawInput}</dd></div>
      <div><dt>Required input</dt><dd>${formatChannelCount(contract.requiredInput)} channels</dd></div>
      <div><dt>Required output</dt><dd>${contract.requiredOutput} classes</dd></div>
      <div><dt>Loader status</dt><dd>${dataset.loaderStatus}</dd></div>
      <div><dt>Fetch status</dt><dd>${dataset.fetchStatus || "Fetch path not configured."}</dd></div>
      <div><dt>Cache path</dt><dd>${dataset.cachePath || "not configured"}</dd></div>
    </dl>
    <pre class="dataset-command">${dataset.fetchCommand || "No fetch command configured."}</pre>
    <div class="mapping-check">
      <div class="mapping-row">
        <span class="status-pill ${inputBadge}">Input</span>
        <p>${contract.inputLayer.name}: ${contract.inputDevices} devices. ${contract.inputMessage}</p>
      </div>
      <div class="mapping-row">
        <span class="status-pill ${outputBadge}">Output</span>
        <p>${contract.outputLayer.name}: ${contract.outputDevices} devices. ${contract.outputMessage}</p>
      </div>
      <div class="mapping-flow">
        <span>Dataset sample</span>
        <span>${contract.inputStatus === "adapter" ? "virtual encoder" : "direct encoder"}</span>
        <span>Block-tab device graph</span>
        <span>${contract.outputStatus === "adapter" ? "virtual readout decoder" : "direct readout"}</span>
      </div>
    </div>
  `;
}

function renderDatasetPanels() {
  renderDatasetPanel("ann");
  renderDatasetPanel("snn");
}

function renderRuntimeSummary(kind, result) {
  const panel = $(`${kind}RuntimeSummary`);
  if (!panel || !result) return;
  const contract = architectureContract(kind);
  const graph = result.graph || {};
  const adapterNeeded = !contract.runnable;
  const adapterText = adapterNeeded
    ? "virtual input/readout adapter required"
    : "direct dataset-to-device mapping possible";
  const edgeText = graph.edgeCount === 0
    ? "0 edges: isolated devices receive encoded optical input only"
    : `${graph.usedEdges} active edges from ${graph.edgeCount} configured connections`;
  panel.innerHTML = `
    <span class="status-pill ${adapterNeeded ? "needs-adapter" : "ok"}">Graph backend</span>
    <strong>${graph.nodeCount || 0} simulated devices / ${edgeText}</strong>
    <p>${contract.dataset.label}: ${contract.requiredInput ? formatChannelCount(contract.requiredInput) : "architecture-defined"} input channels -> ${contract.inputDevices} physical input devices, ${contract.requiredOutput} output classes -> ${contract.outputDevices} output devices. ${adapterText}. Transfer: ${transferModeText()}. Capped at ${graph.maxPerLayer || 32} simulated devices per layer for browser performance.</p>
  `;
}

function renderRuntimeSummaries() {
  renderRuntimeSummary("ann", latestAnn);
  renderRuntimeSummary("snn", latestSnn);
}

function renderDatasetSources() {
  const datasets = Object.values(DATASETS);
  const links = datasets.map((dataset) => {
    const target = dataset.sourceUrl !== "NEXT_WORK.md" ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${dataset.sourceUrl}"${target}>${dataset.label}</a>`;
  }).join("");

  const footer = $("datasetSourceFooter");
  if (footer) footer.innerHTML = links;

  const grid = $("datasetSourceGrid");
  if (!grid) return;
  grid.innerHTML = datasets.map((dataset) => {
    const target = dataset.sourceUrl !== "NEXT_WORK.md" ? ' target="_blank" rel="noreferrer"' : "";
    return `
      <article class="reference-item dataset-source-item">
        <h3>${dataset.label}</h3>
        <p><strong>Input:</strong> ${dataset.sampleFormat}<br /><strong>Output:</strong> ${dataset.outputClasses} classes<br />${dataset.loaderStatus}</p>
        <a href="${dataset.sourceUrl}"${target}>Dataset source</a>
      </article>
    `;
  }).join("");
}

function drawDatasetInputPreview(kind) {
  const canvas = $(`${kind}InputCanvas`);
  if (!canvas) return;
  const dataset = getDataset(kind);
  const label = $(`${kind}InputPreviewLabel`);
  if (label) label.textContent = dataset.sampleFormat;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.fillStyle = "#fbfdff";
  ctx.fillRect(0, 0, width, height);
  drawPlotTitle(ctx, dataset.label, dataset.rawInput, 18, 24);

  if (dataset.preview === "frame") drawFramePreview(ctx, width, height, dataset);
  else if (dataset.preview === "event") drawEventPreview(ctx, width, height, dataset);
  else if (dataset.preview === "spike") drawSpikePreview(ctx, width, height);
  else if (dataset.preview === "waveform") drawWaveformPreview(ctx, width, height);
  else drawUvPreview(ctx, width, height);
}

function drawFramePreview(ctx, width, height, dataset) {
  const grid = 28;
  const size = Math.min(height - 72, width * 0.34);
  const x0 = 24;
  const y0 = 56;
  const cell = size / grid;
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      const cx = x - 14;
      const cy = y - 14;
      const digit = dataset.id === "mnist"
        ? Math.exp(-((cx * cx) / 42 + (cy * cy) / 96)) + Math.exp(-(((cx - 3) * (cx - 3)) / 72 + ((cy + 4) * (cy + 4)) / 32))
        : Math.exp(-((cx * cx) / 120 + (cy * cy) / 72)) * (y > 7 ? 1 : 0.25);
      const shade = clamp(Math.round(255 - digit * 210), 20, 255);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(x0 + x * cell, y0 + y * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
  ctx.strokeStyle = "#b7c8d3";
  ctx.strokeRect(x0, y0, size, size);
  drawInputMappingNote(ctx, width, height, "Flatten 28 x 28 -> 784 channels -> UV rate/amplitude encoder");
}

function drawEventPreview(ctx, width, height, dataset) {
  const plot = { left: 42, right: width - 22, top: 62, bottom: height - 42 };
  drawGrid(ctx, plot, 4, 6);
  const sensorLabel = dataset.id === "dvsgesture" ? "128 x 128 x polarity" : "34 x 34 x polarity";
  for (let i = 0; i < 360; i += 1) {
    const t = i / 360;
    const band = Math.sin(i * 0.09) * 0.3 + 0.5;
    const x = lerp(plot.left, plot.right, t);
    const y = lerp(plot.top, plot.bottom, clamp((Math.sin(i * 0.37) * 0.22 + band), 0, 1));
    ctx.fillStyle = i % 2 ? "#7b2ff2" : "#0f9d91";
    ctx.globalAlpha = 0.78;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  drawInputMappingNote(ctx, width, height, `Events (x,y,t,p), ${sensorLabel} -> bin/pool/multiplex -> UV pulses`);
}

function drawSpikePreview(ctx, width, height) {
  const plot = { left: 42, right: width - 22, top: 62, bottom: height - 42 };
  drawGrid(ctx, plot, 7, 6);
  const rows = 20;
  for (let row = 0; row < rows; row += 1) {
    const y = lerp(plot.top, plot.bottom, row / Math.max(1, rows - 1));
    for (let i = 0; i < 22; i += 1) {
      const phase = Math.sin(row * 1.7 + i * 0.8);
      if (phase < -0.25) continue;
      const x = lerp(plot.left, plot.right, ((i * 17 + row * 11) % 220) / 220);
      ctx.strokeStyle = "#7b2ff2";
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 4);
      ctx.stroke();
    }
  }
  drawInputMappingNote(ctx, width, height, "Spike trains on 700 channels -> channel grouping or temporal UV pulse encoder");
}

function drawWaveformPreview(ctx, width, height) {
  const plot = { left: 42, right: width - 22, top: 62, bottom: height - 42 };
  drawGrid(ctx, plot, 4, 6);
  ctx.strokeStyle = "#0b61b5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 280; i += 1) {
    const t = i / 279;
    const qrs = Math.exp(-((t - 0.43) ** 2) / 0.00045) - 0.45 * Math.exp(-((t - 0.39) ** 2) / 0.0006);
    const p = 0.22 * Math.exp(-((t - 0.22) ** 2) / 0.004);
    const tw = 0.32 * Math.exp(-((t - 0.68) ** 2) / 0.01);
    const value = 0.56 - (p + qrs + tw) * 0.36;
    const x = lerp(plot.left, plot.right, t);
    const y = lerp(plot.top, plot.bottom, clamp(value, 0, 1));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  drawInputMappingNote(ctx, width, height, "ECG time window -> temporal multiplexed UV intensity sequence");
}

function drawUvPreview(ctx, width, height) {
  const plot = { left: 42, right: width - 22, top: 62, bottom: height - 42 };
  drawGrid(ctx, plot, 4, 6);
  ctx.strokeStyle = "#7b2ff2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 180; i += 1) {
    const t = i / 179;
    const phase = (t * 12) % 1;
    const value = phase < 0.35 ? 0.18 : 0.86;
    const x = lerp(plot.left, plot.right, t);
    const y = lerp(plot.top, plot.bottom, value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  drawInputMappingNote(ctx, width, height, "Native UV pulse pattern -> device blocks directly");
}

function drawInputMappingNote(ctx, width, height, text) {
  ctx.fillStyle = "#425765";
  ctx.font = "700 10px Malgun Gothic, Segoe UI, sans-serif";
  const maxWidth = width - 44;
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((value, index) => {
    ctx.fillText(value, 22, height - 24 + index * 12);
  });
}

function runAllSimulations() {
  generateTimeline();
  buildTimingRows();
  updateReadouts();
  normalizeDeviceSelections();
  latestBlock = simulateBlockGraph();
  latestAnn = simulateArchitecture("ann");
  latestSnn = simulateArchitecture("snn");
  updateMetrics(state.activeTab === "snn" ? latestSnn : latestAnn);
  renderDatasetPanels();
  renderRuntimeSummaries();
  renderBlocks();
  updateDeviceSelectors();
  renderParameterControls();
  updateParameterFitSummary();
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
    const annOut = selectedAnn.tiaEnabledForLayer && state.tiaEnabled ? Math.abs(selectedAnn.voltage[index]) : selectedAnn.activation[index];
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

  const deferredControls = new Set(["deviceModeSelect", "deviceSwitchSelect", "deviceTiaOverride"]);
  document.querySelectorAll("input, select").forEach((control) => {
    if (deferredControls.has(control.id)) return;
    control.addEventListener("input", () => {
      readControls();
      if (control.id.startsWith("optimizer")) {
        updateReadouts();
        invalidateOptimizer("settings changed");
        return;
      }
      invalidateOptimizer("rerun recommended");
      runAllSimulations();
    });
    control.addEventListener("change", () => {
      readControls();
      if (control.id.startsWith("optimizer")) {
        updateReadouts();
        invalidateOptimizer("settings changed");
        return;
      }
      invalidateOptimizer("rerun recommended");
      runAllSimulations();
    });
  });

  $("applyModeBtn").addEventListener("click", applyModeToBlocks);
  $("updateLayerBtn").addEventListener("click", updateSelectedLayerFromForm);
  $("addLayerBtn").addEventListener("click", addLayer);
  $("removeLayerBtn").addEventListener("click", removeLayer);
  $("applyDeviceBtn").addEventListener("click", applyDeviceOverride);
  $("connectPairBtn").addEventListener("click", connectSelectedPair);
  $("connectFanOutBtn").addEventListener("click", connectFanOut);
  $("connectFanInBtn").addEventListener("click", connectFanIn);
  $("clearConnectionsBtn").addEventListener("click", clearConnections);
  $("selectSourceTargetTracesBtn").addEventListener("click", selectSourceTargetTraces);
  $("clearTraceSelectionBtn").addEventListener("click", clearTraceSelection);
  $("loadDemoMeasurementBtn").addEventListener("click", loadDemoMeasurement);
  $("autoFitParamsBtn").addEventListener("click", autoFitParameters);
  $("runOptimizerBtn").addEventListener("click", runOptimizer);
  $("applyBestCandidateBtn").addEventListener("click", applyBestCandidate);
  $("measurementInput").addEventListener("input", () => {
    state.measurementText = $("measurementInput").value;
    $("fitStatus").textContent = "manual";
    drawParameterFit();
  });
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
    renderDatasetPanels();
    renderRuntimeSummaries();
    drawDatasetInputPreview("ann");
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
    renderDatasetPanels();
    renderRuntimeSummaries();
    drawDatasetInputPreview("snn");
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
    const savedTransferModelVersion = Number(saved.transferModelVersion || 0);
    Object.assign(state, deepClone(defaults), saved);
    if (!Array.isArray(state.layers) || state.layers.length < 2) state.layers = deepClone(defaults.layers);
    state.selectedLayer = safeLayerIndex(state.selectedLayer);
    state.traceLayer = safeLayerIndex(state.traceLayer);
    state.traceDevices = clamp(Number(state.traceDevices) || defaults.traceDevices, 4, 32);
    state.deviceVariation = clamp(Number(state.deviceVariation) || defaults.deviceVariation, 0, 20);
    state.fanCount = clamp(Number(state.fanCount) || defaults.fanCount, 1, 24);
    state.edgeCoupling = clamp(Number.isFinite(Number(state.edgeCoupling)) ? Number(state.edgeCoupling) : defaults.edgeCoupling, 0, 1.5);
    state.edgeResidual = clamp(Number.isFinite(Number(state.edgeResidual)) ? Number(state.edgeResidual) : defaults.edgeResidual, 0, 0.5);
    state.edgeDelay = clamp(Number.isFinite(Number(state.edgeDelay)) ? Number(state.edgeDelay) : defaults.edgeDelay, 0, 200);
    state.driverThresholdMv = clamp(Number.isFinite(Number(state.driverThresholdMv)) ? Number(state.driverThresholdMv) : defaults.driverThresholdMv, 0, 50);
    state.driverGain = clamp(Number.isFinite(Number(state.driverGain)) ? Number(state.driverGain) : defaults.driverGain, 1, 140);
    state.driverMax = clamp(Number.isFinite(Number(state.driverMax)) ? Number(state.driverMax) : defaults.driverMax, 0.1, 1.8);
    state.splitterLossDb = clamp(Number.isFinite(Number(state.splitterLossDb)) ? Number(state.splitterLossDb) : defaults.splitterLossDb, 0, 12);
    if (!["hybrid", "continuous", "integrateFire", "ltmLatch"].includes(state.transferMode)) state.transferMode = defaults.transferMode;
    state.ifTauMs = clamp(Number.isFinite(Number(state.ifTauMs)) ? Number(state.ifTauMs) : defaults.ifTauMs, 5, 500);
    state.ifThreshold = clamp(Number.isFinite(Number(state.ifThreshold)) ? Number(state.ifThreshold) : defaults.ifThreshold, 0.05, 1.5);
    state.ifGain = clamp(Number.isFinite(Number(state.ifGain)) ? Number(state.ifGain) : defaults.ifGain, 0.1, 5);
    state.ifReset = clamp(Number.isFinite(Number(state.ifReset)) ? Number(state.ifReset) : defaults.ifReset, 0, 1);
    state.ifRefractoryMs = clamp(Number.isFinite(Number(state.ifRefractoryMs)) ? Number(state.ifRefractoryMs) : defaults.ifRefractoryMs, 0, 250);
    state.emitterPulseMs = clamp(Number.isFinite(Number(state.emitterPulseMs)) ? Number(state.emitterPulseMs) : defaults.emitterPulseMs, 2, 120);
    state.ltmWriteThreshold = clamp(Number.isFinite(Number(state.ltmWriteThreshold)) ? Number(state.ltmWriteThreshold) : defaults.ltmWriteThreshold, 0.01, 1.2);
    state.ltmReadoutGain = clamp(Number.isFinite(Number(state.ltmReadoutGain)) ? Number(state.ltmReadoutGain) : defaults.ltmReadoutGain, 0, 1.2);
    state.ltmRetentionMs = clamp(Number.isFinite(Number(state.ltmRetentionMs)) ? Number(state.ltmRetentionMs) : defaults.ltmRetentionMs, 100, 5000);
    if (savedTransferModelVersion < defaults.transferModelVersion) {
      state.transferModelVersion = defaults.transferModelVersion;
      state.transferMode = defaults.transferMode;
      state.ifTauMs = defaults.ifTauMs;
      state.ifThreshold = defaults.ifThreshold;
      state.ifGain = defaults.ifGain;
      state.ifReset = defaults.ifReset;
      state.ifRefractoryMs = defaults.ifRefractoryMs;
      state.emitterPulseMs = defaults.emitterPulseMs;
      state.ltmWriteThreshold = defaults.ltmWriteThreshold;
      state.ltmReadoutGain = defaults.ltmReadoutGain;
      state.ltmRetentionMs = defaults.ltmRetentionMs;
    }
    state.paramMode = state.paramMode === "LTM" ? "LTM" : "STM";
    state.paramSwitchMethod = state.paramSwitchMethod === "gate" ? "gate" : "vds";
    if (!["ann", "snn", "uv"].includes(state.optimizerTarget)) state.optimizerTarget = defaults.optimizerTarget;
    state.optimizerIterations = clamp(Number.isFinite(Number(state.optimizerIterations)) ? Number(state.optimizerIterations) : defaults.optimizerIterations, 20, 240);
    state.optimizerMaxFanout = clamp(Number.isFinite(Number(state.optimizerMaxFanout)) ? Number(state.optimizerMaxFanout) : defaults.optimizerMaxFanout, 1, 24);
    state.optimizerMaxDevices = clamp(Number.isFinite(Number(state.optimizerMaxDevices)) ? Number(state.optimizerMaxDevices) : defaults.optimizerMaxDevices, 8, 96);
    state.optimizerTuneSizes = typeof state.optimizerTuneSizes === "boolean" ? state.optimizerTuneSizes : defaults.optimizerTuneSizes;
    state.optimizerTuneModes = typeof state.optimizerTuneModes === "boolean" ? state.optimizerTuneModes : defaults.optimizerTuneModes;
    state.optimizerTuneConnections = typeof state.optimizerTuneConnections === "boolean" ? state.optimizerTuneConnections : defaults.optimizerTuneConnections;
    state.optimizerTuneOeo = typeof state.optimizerTuneOeo === "boolean" ? state.optimizerTuneOeo : defaults.optimizerTuneOeo;
    state.optimizerSeparationWeight = clamp(Number.isFinite(Number(state.optimizerSeparationWeight)) ? Number(state.optimizerSeparationWeight) : defaults.optimizerSeparationWeight, 0, 1);
    state.optimizerSparsityWeight = clamp(Number.isFinite(Number(state.optimizerSparsityWeight)) ? Number(state.optimizerSparsityWeight) : defaults.optimizerSparsityWeight, 0, 1);
    state.optimizerLatencyWeight = clamp(Number.isFinite(Number(state.optimizerLatencyWeight)) ? Number(state.optimizerLatencyWeight) : defaults.optimizerLatencyWeight, 0, 1);
    state.optimizerEnergyWeight = clamp(Number.isFinite(Number(state.optimizerEnergyWeight)) ? Number(state.optimizerEnergyWeight) : defaults.optimizerEnergyWeight, 0, 1);
    state.optimizerRobustnessWeight = clamp(Number.isFinite(Number(state.optimizerRobustnessWeight)) ? Number(state.optimizerRobustnessWeight) : defaults.optimizerRobustnessWeight, 0, 1);
    state.measurementText = typeof state.measurementText === "string" ? state.measurementText : "";
    state.deviceModel = MODEL.sanitizeModel(state.deviceModel);
    if (!Array.isArray(state.checkedDeviceTraces)) state.checkedDeviceTraces = deepClone(defaults.checkedDeviceTraces);
    if (!state.deviceOverrides || typeof state.deviceOverrides !== "object") state.deviceOverrides = {};
    if (!Array.isArray(state.connections)) state.connections = [];
    state.connectionGraphInitialized = Boolean(state.connectionGraphInitialized || state.connections.length);
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
  renderDatasetSources();
  updateSelectedLayer();
  normalizeDeviceSelections();
  updateDeviceSelectors();
  runAllSimulations();
  setInterval(persist, 1000);
}

init();
