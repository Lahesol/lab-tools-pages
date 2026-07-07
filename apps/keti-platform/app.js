const MAX_POINTS = 900;
const MAX_IMU_POINTS = 900;
const MAX_TABLE_ROWS = 80;
const RENDER_INTERVAL_MS = 33;
const TABLE_RENDER_INTERVAL_MS = 150;
const IMU_ACCEL_AXES = ["ax", "ay", "az"];
const IMU_PROCESSED_AXES = ["pax", "pay", "paz"];
const IMU_FILTERED_AXES = ["fax", "fay", "faz"];
const NON_CANVAS_VIEWS = new Set(["dataset", "model"]);
const DEFAULT_PREBUILT_FIRMWARES = [
  {
    id: "stage1_lab_console",
    version: "0.1.1",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage1_lab_console_v0.1.1.bin",
    size_bytes: 99552,
    sha256: "43756B93E6A3BC2433C7C82BCB03E500ABC7BFEF0ED6415066342FFBD8EBED20"
  }
];
const DIRECT_MANIFEST_PATHS = [
  "firmware/prebuilt/manifest.json",
  "../firmware/prebuilt/manifest.json"
];

const state = {
  port: null,
  reader: null,
  writer: null,
  readLoopActive: false,
  connected: false,
  streaming: false,
  recording: false,
  activeView: "adc",
  samples: [],
  imuSamples: [],
  imuProcessedSamples: [],
  records: [],
  tableRows: [],
  latestSample: null,
  latestImu: null,
  latestProcessedImu: null,
  dataset: {
    examples: [],
    captureActive: false,
    nextId: 1,
    lastCaptureSeq: null
  },
  model: {
    trained: null,
    labels: [],
    inputSize: 0,
    metrics: null,
    trainingLog: []
  },
  classification: {
    active: false,
    seq: null,
    topLabel: "--",
    topScore: null,
    scores: [],
    timing: {},
    anomaly: null,
    updatedAt: null
  },
  renderPending: false,
  lastRenderTime: 0,
  lastTableRenderTime: 0,
  lastRateCheckTime: performance.now(),
  lastRateCheckCount: 0,
  receivedSamples: 0,
  receivedImuSamples: 0,
  lastImuRateCheckTime: performance.now(),
  lastImuRateCheckCount: 0,
  lineBuffer: "",
  settings: {
    rateHz: 100,
    channel: 0,
    resolution: 12,
    filter: "RAW",
    alpha: 0.2,
    window: 8,
    iirOrder: 2,
    iirLowHz: 1.0,
    iirHighHz: 10.0,
    inputWindowSamples: 125,
    inputFilter: "NONE",
    inputAlpha: 0.2,
    inputMaWindow: 5,
    inputIirOrder: 2,
    inputIirLowHz: 0.5,
    inputIirHighHz: 8.0,
    normalizeMode: "NONE"
  },
  preprocess: createPreprocessState(),
  flash: {
    helperOnline: false,
    helperBusy: false,
    helperUrl: "http://127.0.0.1:8765",
    firmwares: [],
    directFirmwares: DEFAULT_PREBUILT_FIRMWARES,
    directBasePath: "firmware/prebuilt/",
    directBusy: false,
    directBootloaderTouched: false
  }
};

const el = {
  browserStatus: document.getElementById("browserStatus"),
  helperStatus: document.getElementById("helperStatus"),
  portStatus: document.getElementById("portStatus"),
  streamStatus: document.getElementById("streamStatus"),
  sampleCount: document.getElementById("sampleCount"),
  recordCount: document.getElementById("recordCount"),
  connectButton: document.getElementById("connectButton"),
  disconnectButton: document.getElementById("disconnectButton"),
  startButton: document.getElementById("startButton"),
  stopButton: document.getElementById("stopButton"),
  applyAcquisitionButton: document.getElementById("applyAcquisitionButton"),
  applyFilterButton: document.getElementById("applyFilterButton"),
  applyInputButton: document.getElementById("applyInputButton"),
  pingButton: document.getElementById("pingButton"),
  recordButton: document.getElementById("recordButton"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  helperUrlInput: document.getElementById("helperUrlInput"),
  helperCheckButton: document.getElementById("helperCheckButton"),
  refreshPortsButton: document.getElementById("refreshPortsButton"),
  flashPortSelect: document.getElementById("flashPortSelect"),
  firmwareSelect: document.getElementById("firmwareSelect"),
  flashButton: document.getElementById("flashButton"),
  flashState: document.getElementById("flashState"),
  directFlashState: document.getElementById("directFlashState"),
  directBinInput: document.getElementById("directBinInput"),
  bootloaderButton: document.getElementById("bootloaderButton"),
  directFlashButton: document.getElementById("directFlashButton"),
  directFlashProgress: document.getElementById("directFlashProgress"),
  channelSelect: document.getElementById("channelSelect"),
  rateInput: document.getElementById("rateInput"),
  resolutionSelect: document.getElementById("resolutionSelect"),
  filterSelect: document.getElementById("filterSelect"),
  alphaInput: document.getElementById("alphaInput"),
  alphaOutput: document.getElementById("alphaOutput"),
  windowInput: document.getElementById("windowInput"),
  iirOrderInput: document.getElementById("iirOrderInput"),
  iirLowInput: document.getElementById("iirLowInput"),
  iirHighInput: document.getElementById("iirHighInput"),
  inputState: document.getElementById("inputState"),
  inputWindowInput: document.getElementById("inputWindowInput"),
  inputFilterSelect: document.getElementById("inputFilterSelect"),
  normalizeSelect: document.getElementById("normalizeSelect"),
  inputAlphaInput: document.getElementById("inputAlphaInput"),
  inputAlphaOutput: document.getElementById("inputAlphaOutput"),
  inputMaWindowInput: document.getElementById("inputMaWindowInput"),
  inputIirOrderInput: document.getElementById("inputIirOrderInput"),
  inputIirLowInput: document.getElementById("inputIirLowInput"),
  inputIirHighInput: document.getElementById("inputIirHighInput"),
  labelInput: document.getElementById("labelInput"),
  showRawToggle: document.getElementById("showRawToggle"),
  showFilteredToggle: document.getElementById("showFilteredToggle"),
  autoScaleToggle: document.getElementById("autoScaleToggle"),
  signalCanvas: document.getElementById("signalCanvas"),
  metricGrid: document.getElementById("metricGrid"),
  datasetView: document.getElementById("datasetView"),
  modelView: document.getElementById("modelView"),
  plotMeta: document.getElementById("plotMeta"),
  metric1Label: document.getElementById("metric1Label"),
  metric2Label: document.getElementById("metric2Label"),
  metric3Label: document.getElementById("metric3Label"),
  metric4Label: document.getElementById("metric4Label"),
  rawMetric: document.getElementById("rawMetric"),
  filteredMetric: document.getElementById("filteredMetric"),
  voltageMetric: document.getElementById("voltageMetric"),
  rateMetric: document.getElementById("rateMetric"),
  filterState: document.getElementById("filterState"),
  viewTabs: [...document.querySelectorAll(".view-tab")],
  classStartButton: document.getElementById("classStartButton"),
  classStopButton: document.getElementById("classStopButton"),
  classificationState: document.getElementById("classificationState"),
  classificationTopLabel: document.getElementById("classificationTopLabel"),
  classificationTopScore: document.getElementById("classificationTopScore"),
  classificationList: document.getElementById("classificationList"),
  logOutput: document.getElementById("logOutput"),
  sampleTableBody: document.getElementById("sampleTableBody"),
  lastTimestamp: document.getElementById("lastTimestamp"),
  datasetSummary: document.getElementById("datasetSummary"),
  datasetCaptureState: document.getElementById("datasetCaptureState"),
  datasetLabelInput: document.getElementById("datasetLabelInput"),
  datasetWindowInput: document.getElementById("datasetWindowInput"),
  datasetStrideInput: document.getElementById("datasetStrideInput"),
  datasetFeatureSelect: document.getElementById("datasetFeatureSelect"),
  datasetSourceSelect: document.getElementById("datasetSourceSelect"),
  datasetCaptureButton: document.getElementById("datasetCaptureButton"),
  datasetCaptureOneButton: document.getElementById("datasetCaptureOneButton"),
  datasetExportJsonButton: document.getElementById("datasetExportJsonButton"),
  datasetExportCsvButton: document.getElementById("datasetExportCsvButton"),
  datasetClearButton: document.getElementById("datasetClearButton"),
  datasetImportInput: document.getElementById("datasetImportInput"),
  datasetFeatureState: document.getElementById("datasetFeatureState"),
  datasetLabelList: document.getElementById("datasetLabelList"),
  datasetTableBody: document.getElementById("datasetTableBody"),
  modelStatus: document.getElementById("modelStatus"),
  modelShapeState: document.getElementById("modelShapeState"),
  hiddenLayerInput: document.getElementById("hiddenLayerInput"),
  neuronInput: document.getElementById("neuronInput"),
  activationSelect: document.getElementById("activationSelect"),
  learningRateInput: document.getElementById("learningRateInput"),
  epochInput: document.getElementById("epochInput"),
  pruningInput: document.getElementById("pruningInput"),
  pruningOutput: document.getElementById("pruningOutput"),
  quantizeToggle: document.getElementById("quantizeToggle"),
  trainModelButton: document.getElementById("trainModelButton"),
  exportModelJsonButton: document.getElementById("exportModelJsonButton"),
  exportCArrayButton: document.getElementById("exportCArrayButton"),
  modelMetricState: document.getElementById("modelMetricState"),
  modelMetrics: document.getElementById("modelMetrics"),
  modelLog: document.getElementById("modelLog")
};

const ctx = el.signalCanvas.getContext("2d");

function resizeCanvasToDisplaySize() {
  const rect = el.signalCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.max(280, Math.round(rect.width));
  const displayHeight = Math.max(280, Math.round(rect.height));
  const backingWidth = Math.round(displayWidth * dpr);
  const backingHeight = Math.round(displayHeight * dpr);

  if (el.signalCanvas.width !== backingWidth || el.signalCanvas.height !== backingHeight) {
    el.signalCanvas.width = backingWidth;
    el.signalCanvas.height = backingHeight;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: displayWidth, height: displayHeight };
}

function setStatus(node, text, mode = "muted") {
  node.textContent = text;
  node.className = `status-pill ${mode}`.trim();
}

function logLine(line, direction = "rx") {
  const prefix = direction === "tx" ? ">>" : "<<";
  const text = `${new Date().toLocaleTimeString()} ${prefix} ${line}`;
  el.logOutput.textContent = `${text}\n${el.logOutput.textContent}`.slice(0, 12000);
}

function setUiEnabled() {
  const connected = state.connected;
  const streaming = state.streaming;

  el.connectButton.disabled = connected;
  el.disconnectButton.disabled = !connected;
  el.startButton.disabled = !connected || streaming;
  el.stopButton.disabled = !connected || !streaming;
  el.applyAcquisitionButton.disabled = !connected;
  el.applyFilterButton.disabled = !connected;
  el.pingButton.disabled = !connected;
  el.recordButton.disabled = !connected;
  el.classStartButton.disabled = !connected || state.classification.active;
  el.classStopButton.disabled = !connected || !state.classification.active;
  el.exportButton.disabled = state.records.length === 0;
  el.datasetCaptureOneButton.disabled = state.imuSamples.length < getDatasetWindowSize();
  el.datasetExportJsonButton.disabled = state.dataset.examples.length === 0;
  el.datasetExportCsvButton.disabled = state.dataset.examples.length === 0;
  el.trainModelButton.disabled = state.dataset.examples.length < 2;
  el.exportModelJsonButton.disabled = !state.model.trained;
  el.exportCArrayButton.disabled = !state.model.trained;
  el.refreshPortsButton.disabled = !state.flash.helperOnline || state.flash.helperBusy;
  el.flashButton.disabled = !state.flash.helperOnline || state.flash.helperBusy;
  el.helperCheckButton.disabled = state.flash.helperBusy;
  el.bootloaderButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.directFlashButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.directBinInput.disabled = state.flash.directBusy;

  el.recordButton.textContent = state.recording ? "Stop Rec" : "Record";
  el.datasetCaptureButton.textContent = state.dataset.captureActive ? "Stop Capture" : "Start Capture";
  el.flashButton.textContent = state.flash.helperBusy ? "Flashing..." : "Flash Firmware";
  el.directFlashButton.textContent = state.flash.directBusy ? "Flashing..." : "Direct Flash";
  el.startButton.textContent = state.activeView === "classification" ? "Start + Class" : "Start";
  el.stopButton.textContent = state.activeView === "classification" ? "Stop + Class" : "Stop";
  setStatus(el.portStatus, connected ? "Connected" : "Disconnected", connected ? "" : "muted");
  setStatus(el.streamStatus, streaming ? "Streaming" : "Idle", streaming ? "warning" : "muted");
  setStatus(el.helperStatus, state.flash.helperOnline ? "Helper online" : "Helper offline", state.flash.helperOnline ? "" : "muted");
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function createPreprocessState() {
  return {
    ema: Object.fromEntries(IMU_ACCEL_AXES.map((axis) => [axis, null])),
    maWindow: [],
    iir: Object.fromEntries(IMU_ACCEL_AXES.map((axis) => [axis, {
      lpf: [],
      lpfInit: [],
      hpfPrevIn: [],
      hpfPrevOut: [],
      hpfInit: []
    }])),
    filteredWindow: []
  };
}

function resetPreprocessState() {
  state.preprocess = createPreprocessState();
}

function getInputWindowSize() {
  return Math.round(normalizeNumber(state.settings.inputWindowSamples, 125, 16, MAX_IMU_POINTS));
}

function getInputSampleRateHz() {
  return normalizeNumber(state.settings.rateHz, 62.5, 1, 1000);
}

function isInputPreprocessActive() {
  return state.settings.inputFilter !== "NONE" || state.settings.normalizeMode !== "NONE";
}

function getInputUnits() {
  return state.settings.normalizeMode === "NONE" ? "g" : "norm";
}

function makeAxisObject(sample, prefix = "") {
  return {
    ax: sample[`${prefix}ax`] ?? sample.ax,
    ay: sample[`${prefix}ay`] ?? sample.ay,
    az: sample[`${prefix}az`] ?? sample.az
  };
}

function lowPassCoefficient(cutoffHz) {
  const cutoff = Math.max(0.001, cutoffHz);
  const dt = 1 / getInputSampleRateHz();
  const rc = 1 / (2 * Math.PI * cutoff);
  return dt / (rc + dt);
}

function highPassCoefficient(cutoffHz) {
  const cutoff = Math.max(0.001, cutoffHz);
  const dt = 1 / getInputSampleRateHz();
  const rc = 1 / (2 * Math.PI * cutoff);
  return rc / (rc + dt);
}

function applyAxisLowPass(axis, value, cutoffHz, order) {
  const axisState = state.preprocess.iir[axis];
  const alpha = lowPassCoefficient(cutoffHz);
  let out = value;
  for (let stage = 0; stage < order; stage++) {
    if (!axisState.lpfInit[stage]) {
      axisState.lpf[stage] = out;
      axisState.lpfInit[stage] = true;
    } else {
      axisState.lpf[stage] += alpha * (out - axisState.lpf[stage]);
    }
    out = axisState.lpf[stage];
  }
  return out;
}

function applyAxisHighPass(axis, value, cutoffHz, order) {
  const axisState = state.preprocess.iir[axis];
  const alpha = highPassCoefficient(cutoffHz);
  let out = value;
  for (let stage = 0; stage < order; stage++) {
    if (!axisState.hpfInit[stage]) {
      axisState.hpfPrevIn[stage] = out;
      axisState.hpfPrevOut[stage] = 0;
      axisState.hpfInit[stage] = true;
      out = 0;
    } else {
      const next = alpha * (axisState.hpfPrevOut[stage] + out - axisState.hpfPrevIn[stage]);
      axisState.hpfPrevIn[stage] = out;
      axisState.hpfPrevOut[stage] = next;
      out = next;
    }
  }
  return out;
}

function filterImuSample(sample) {
  const mode = state.settings.inputFilter;
  const order = Math.round(normalizeNumber(state.settings.inputIirOrder, 2, 1, 4));
  const maxCutoff = Math.max(0.01, getInputSampleRateHz() * 0.45);
  const highHz = normalizeNumber(state.settings.inputIirHighHz, 8.0, 0.002, maxCutoff);
  const lowHz = Math.min(
    normalizeNumber(state.settings.inputIirLowHz, 0.5, 0.001, maxCutoff),
    Math.max(0.001, highHz - 0.001)
  );

  if (mode === "MA") {
    state.preprocess.maWindow.push(makeAxisObject(sample));
    const windowSize = Math.round(normalizeNumber(state.settings.inputMaWindow, 5, 1, 128));
    while (state.preprocess.maWindow.length > windowSize) {
      state.preprocess.maWindow.shift();
    }
    return Object.fromEntries(IMU_ACCEL_AXES.map((axis) => {
      const sum = state.preprocess.maWindow.reduce((acc, item) => acc + item[axis], 0);
      return [axis, sum / state.preprocess.maWindow.length];
    }));
  }

  if (mode === "EMA") {
    const alpha = normalizeNumber(state.settings.inputAlpha, 0.2, 0.001, 1);
    return Object.fromEntries(IMU_ACCEL_AXES.map((axis) => {
      const previous = state.preprocess.ema[axis];
      const next = previous == null ? sample[axis] : previous + alpha * (sample[axis] - previous);
      state.preprocess.ema[axis] = next;
      return [axis, next];
    }));
  }

  if (mode === "IIR_LPF") {
    return Object.fromEntries(IMU_ACCEL_AXES.map((axis) => [
      axis,
      applyAxisLowPass(axis, sample[axis], highHz, order)
    ]));
  }

  if (mode === "IIR_HPF") {
    return Object.fromEntries(IMU_ACCEL_AXES.map((axis) => [
      axis,
      applyAxisHighPass(axis, sample[axis], lowHz, order)
    ]));
  }

  if (mode === "IIR_BPF") {
    return Object.fromEntries(IMU_ACCEL_AXES.map((axis) => {
      const highPassed = applyAxisHighPass(axis, sample[axis], lowHz, order);
      return [axis, applyAxisLowPass(axis, highPassed, highHz, order)];
    }));
  }

  return makeAxisObject(sample);
}

function normalizeImuSample(filtered) {
  state.preprocess.filteredWindow.push(filtered);
  const windowSize = getInputWindowSize();
  while (state.preprocess.filteredWindow.length > windowSize) {
    state.preprocess.filteredWindow.shift();
  }

  if (state.settings.normalizeMode === "NONE") {
    return filtered;
  }

  const normalized = {};
  for (const axis of IMU_ACCEL_AXES) {
    const values = state.preprocess.filteredWindow.map((item) => item[axis]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (state.settings.normalizeMode === "CENTER") {
      normalized[axis] = filtered[axis] - mean;
    } else if (state.settings.normalizeMode === "ZSCORE") {
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
      normalized[axis] = (filtered[axis] - mean) / Math.max(1e-6, Math.sqrt(variance));
    } else if (state.settings.normalizeMode === "MINMAX") {
      const min = Math.min(...values);
      const max = Math.max(...values);
      normalized[axis] = ((filtered[axis] - min) / Math.max(1e-6, max - min)) * 2 - 1;
    } else {
      normalized[axis] = filtered[axis];
    }
  }
  return normalized;
}

function processImuSample(sample) {
  const filtered = filterImuSample(sample);
  const normalized = normalizeImuSample(filtered);
  return {
    seq: sample.seq,
    micros: sample.micros,
    fax: filtered.ax,
    fay: filtered.ay,
    faz: filtered.az,
    pax: normalized.ax,
    pay: normalized.ay,
    paz: normalized.az,
    receivedAt: sample.receivedAt
  };
}

function rebuildImuProcessing() {
  resetPreprocessState();
  state.imuProcessedSamples = state.imuSamples.map((sample) => processImuSample(sample));
  state.latestProcessedImu = state.imuProcessedSamples[state.imuProcessedSamples.length - 1] || null;
}

function getVisibleImuFrames() {
  const count = getInputWindowSize();
  return {
    raw: state.imuSamples.slice(-count),
    processed: state.imuProcessedSamples.slice(-count)
  };
}

function getDatasetWindowSize() {
  return Math.round(normalizeNumber(el.datasetWindowInput?.value, 125, 16, MAX_IMU_POINTS));
}

function getDatasetStrideSize() {
  return Math.round(normalizeNumber(el.datasetStrideInput?.value, 31, 1, MAX_IMU_POINTS));
}

function getDatasetWindow(source = el.datasetSourceSelect?.value || "PROCESSED") {
  const windowSize = getDatasetWindowSize();
  if (source === "RAW") {
    return state.imuSamples.slice(-windowSize).map((sample) => ({
      ax: sample.ax,
      ay: sample.ay,
      az: sample.az,
      seq: sample.seq,
      micros: sample.micros
    }));
  }

  return state.imuProcessedSamples.slice(-windowSize).map((sample) => ({
    ax: sample.pax,
    ay: sample.pay,
    az: sample.paz,
    seq: sample.seq,
    micros: sample.micros
  }));
}

function featureNamesForMode(mode, windowSize) {
  if (mode === "FLATTEN") {
    const names = [];
    for (let i = 0; i < windowSize; i++) {
      names.push(`ax_${i}`, `ay_${i}`, `az_${i}`);
    }
    return names;
  }

  return IMU_ACCEL_AXES.flatMap((axis) => [
    `${axis}_mean`,
    `${axis}_std`,
    `${axis}_min`,
    `${axis}_max`,
    `${axis}_rms`
  ]);
}

function extractWindowFeatures(window, mode) {
  if (mode === "FLATTEN") {
    return window.flatMap((sample) => [sample.ax, sample.ay, sample.az]);
  }

  return IMU_ACCEL_AXES.flatMap((axis) => {
    const values = window.map((sample) => sample[axis]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
    return [mean, Math.sqrt(variance), min, max, rms];
  });
}

function captureDatasetWindow(reason = "manual") {
  const label = (el.datasetLabelInput.value || "unlabeled").trim() || "unlabeled";
  const source = el.datasetSourceSelect.value;
  const featureMode = el.datasetFeatureSelect.value;
  const window = getDatasetWindow(source);
  const windowSize = getDatasetWindowSize();
  if (window.length < windowSize) {
    el.datasetCaptureState.textContent = `Need ${windowSize}`;
    return false;
  }

  const features = extractWindowFeatures(window, featureMode);
  const example = {
    id: state.dataset.nextId++,
    label,
    source,
    featureMode,
    featureNames: featureNamesForMode(featureMode, window.length),
    features,
    window,
    windowSamples: window.length,
    strideSamples: getDatasetStrideSize(),
    rateHz: state.settings.rateHz,
    preprocessing: {
      inputFilter: state.settings.inputFilter,
      normalizeMode: state.settings.normalizeMode,
      inputWindowSamples: state.settings.inputWindowSamples,
      inputAlpha: state.settings.inputAlpha,
      inputMaWindow: state.settings.inputMaWindow,
      inputIirOrder: state.settings.inputIirOrder,
      inputIirLowHz: state.settings.inputIirLowHz,
      inputIirHighHz: state.settings.inputIirHighHz
    },
    seqStart: window[0]?.seq ?? null,
    seqEnd: window[window.length - 1]?.seq ?? null,
    capturedAt: new Date().toISOString(),
    reason
  };
  state.dataset.examples.push(example);
  state.dataset.lastCaptureSeq = example.seqEnd;
  el.datasetCaptureState.textContent = state.dataset.captureActive ? "Capturing" : "Captured";
  renderDatasetView();
  setUiEnabled();
  return true;
}

function maybeCaptureDatasetWindow(latestSample) {
  if (!state.dataset.captureActive) {
    return;
  }
  const stride = getDatasetStrideSize();
  const lastSeq = state.dataset.lastCaptureSeq;
  if (lastSeq == null || latestSample.seq - lastSeq >= stride) {
    captureDatasetWindow("stream");
  }
}

function labelCounts() {
  const counts = new Map();
  for (const example of state.dataset.examples) {
    counts.set(example.label, (counts.get(example.label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderDatasetView() {
  const examples = state.dataset.examples;
  const counts = labelCounts();
  const featureSize = examples[0]?.features?.length || 0;
  el.datasetSummary.textContent = `${examples.length} windows`;
  el.datasetFeatureState.textContent = featureSize > 0 ? `${featureSize} features` : "No data";
  el.datasetCaptureState.textContent = state.dataset.captureActive ? "Capturing" : "Idle";

  el.datasetLabelList.replaceChildren(
    ...(counts.length > 0 ? counts : [["No labels", 0]]).map(([label, count]) => {
      const row = document.createElement("div");
      row.className = "dataset-label-row";
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("strong");
      value.textContent = String(count);
      row.append(name, value);
      return row;
    })
  );

  el.datasetTableBody.replaceChildren(
    ...examples.slice(-80).reverse().map((example) => {
      const row = document.createElement("tr");
      [example.id, example.label, example.windowSamples, example.featureMode, example.source].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.append(cell);
      });
      return row;
    })
  );
}

function toggleDatasetCapture() {
  state.dataset.captureActive = !state.dataset.captureActive;
  state.dataset.lastCaptureSeq = null;
  el.datasetCaptureState.textContent = state.dataset.captureActive ? "Capturing" : "Idle";
  setUiEnabled();
}

function clearDataset() {
  state.dataset.examples = [];
  state.dataset.nextId = 1;
  state.dataset.lastCaptureSeq = null;
  state.dataset.captureActive = false;
  state.model.trained = null;
  state.model.metrics = null;
  state.model.trainingLog = [];
  renderDatasetView();
  renderModelView();
  setUiEnabled();
}

function buildDatasetPayload() {
  return {
    type: "keti_window_dataset",
    version: 1,
    exportedAt: new Date().toISOString(),
    board: "Arduino Nano 33 BLE Rev2",
    examples: state.dataset.examples
  };
}

function exportDatasetJson() {
  downloadText("keti_imu_dataset", "json", JSON.stringify(buildDatasetPayload(), null, 2), "application/json;charset=utf-8");
}

function exportDatasetCsv() {
  const header = [
    "id",
    "label",
    "source",
    "feature_mode",
    "window_samples",
    "seq_start",
    "seq_end",
    "rate_hz",
    "captured_at",
    "features"
  ].join(",") + "\n";
  const rows = state.dataset.examples.map((example) => [
    example.id,
    csvCell(example.label),
    example.source,
    example.featureMode,
    example.windowSamples,
    example.seqStart ?? "",
    example.seqEnd ?? "",
    example.rateHz,
    example.capturedAt,
    csvCell(example.features.join(" "))
  ].join(","));
  downloadText("keti_imu_dataset", "csv", header + rows.join("\n") + "\n", "text/csv;charset=utf-8");
}

async function importDatasetJson(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const payload = JSON.parse(await file.text());
    const examples = Array.isArray(payload.examples) ? payload.examples : [];
    state.dataset.examples = examples.filter((example) => Array.isArray(example.features) && example.label);
    state.dataset.nextId = Math.max(0, ...state.dataset.examples.map((example) => Number(example.id) || 0)) + 1;
    state.dataset.captureActive = false;
    state.dataset.lastCaptureSeq = null;
    renderDatasetView();
    logLine(`DATASET_IMPORT,count=${state.dataset.examples.length}`);
  } catch (error) {
    logLine(`ERR,dataset_import,${error.message}`);
  } finally {
    event.target.value = "";
    setUiEnabled();
  }
}

function getTrainingDataset() {
  const examples = state.dataset.examples.filter((example) => Array.isArray(example.features));
  if (examples.length < 2) {
    throw new Error("Need at least two captured windows");
  }
  const inputSize = examples[0].features.length;
  if (!examples.every((example) => example.features.length === inputSize)) {
    throw new Error("All dataset windows must use the same feature mode and window length");
  }
  const labels = [...new Set(examples.map((example) => example.label))].sort();
  if (labels.length < 2) {
    throw new Error("Need at least two labels");
  }

  const mean = Array(inputSize).fill(0);
  const std = Array(inputSize).fill(0);
  for (const example of examples) {
    example.features.forEach((value, index) => {
      mean[index] += value;
    });
  }
  for (let i = 0; i < inputSize; i++) {
    mean[i] /= examples.length;
  }
  for (const example of examples) {
    example.features.forEach((value, index) => {
      std[index] += (value - mean[index]) ** 2;
    });
  }
  for (let i = 0; i < inputSize; i++) {
    std[i] = Math.max(1e-6, Math.sqrt(std[i] / examples.length));
  }

  return {
    examples,
    labels,
    inputSize,
    mean,
    std,
    x: examples.map((example) => example.features.map((value, index) => (value - mean[index]) / std[index])),
    y: examples.map((example) => labels.indexOf(example.label))
  };
}

function randomWeight(scale) {
  return (Math.random() * 2 - 1) * scale;
}

function initializeAnn(inputSize, hiddenLayers, neurons, outputSize, activation) {
  const sizes = [inputSize, ...Array(hiddenLayers).fill(neurons), outputSize];
  const layers = [];
  for (let layer = 1; layer < sizes.length; layer++) {
    const fanIn = sizes[layer - 1];
    const fanOut = sizes[layer];
    const scale = Math.sqrt(2 / Math.max(1, fanIn));
    layers.push({
      weights: Array.from({ length: fanOut }, () => Array.from({ length: fanIn }, () => randomWeight(scale))),
      biases: Array(fanOut).fill(0)
    });
  }
  return { sizes, activation, layers };
}

function activate(value, activation) {
  if (activation === "tanh") {
    return Math.tanh(value);
  }
  if (activation === "sigmoid") {
    return 1 / (1 + Math.exp(-value));
  }
  return Math.max(0, value);
}

function activationDerivative(value, activation) {
  if (activation === "tanh") {
    const t = Math.tanh(value);
    return 1 - t * t;
  }
  if (activation === "sigmoid") {
    const s = 1 / (1 + Math.exp(-value));
    return s * (1 - s);
  }
  return value > 0 ? 1 : 0;
}

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map((value) => value / Math.max(1e-12, sum));
}

function annForward(model, input) {
  const activations = [input];
  const preActivations = [];
  let current = input;
  model.layers.forEach((layer, layerIndex) => {
    const z = layer.weights.map((row, neuron) => row.reduce((sum, weight, inputIndex) => (
      sum + weight * current[inputIndex]
    ), layer.biases[neuron]));
    preActivations.push(z);
    current = layerIndex === model.layers.length - 1
      ? softmax(z)
      : z.map((value) => activate(value, model.activation));
    activations.push(current);
  });
  return { output: current, activations, preActivations };
}

function trainAnn(dataset, options) {
  const model = initializeAnn(
    dataset.inputSize,
    options.hiddenLayers,
    options.neurons,
    dataset.labels.length,
    options.activation
  );
  const history = [];
  const indices = dataset.x.map((_, index) => index);

  for (let epoch = 0; epoch < options.epochs; epoch++) {
    shuffle(indices);
    let lossSum = 0;
    let correct = 0;
    for (const exampleIndex of indices) {
      const input = dataset.x[exampleIndex];
      const labelIndex = dataset.y[exampleIndex];
      const result = annForward(model, input);
      const output = result.output;
      lossSum += -Math.log(Math.max(1e-9, output[labelIndex]));
      if (argMax(output) === labelIndex) {
        correct++;
      }

      let delta = output.map((value, index) => value - (index === labelIndex ? 1 : 0));
      for (let layerIndex = model.layers.length - 1; layerIndex >= 0; layerIndex--) {
        const layer = model.layers[layerIndex];
        const previousActivation = result.activations[layerIndex];
        const oldWeights = layer.weights.map((row) => row.slice());
        for (let neuron = 0; neuron < layer.weights.length; neuron++) {
          for (let inputIndex = 0; inputIndex < layer.weights[neuron].length; inputIndex++) {
            layer.weights[neuron][inputIndex] -= options.learningRate * delta[neuron] * previousActivation[inputIndex];
          }
          layer.biases[neuron] -= options.learningRate * delta[neuron];
        }

        if (layerIndex > 0) {
          const nextDelta = Array(model.layers[layerIndex - 1].weights.length).fill(0);
          for (let inputIndex = 0; inputIndex < nextDelta.length; inputIndex++) {
            let sum = 0;
            for (let neuron = 0; neuron < oldWeights.length; neuron++) {
              sum += oldWeights[neuron][inputIndex] * delta[neuron];
            }
            nextDelta[inputIndex] = sum * activationDerivative(result.preActivations[layerIndex - 1][inputIndex], model.activation);
          }
          delta = nextDelta;
        }
      }
    }
    if (epoch === 0 || epoch === options.epochs - 1 || (epoch + 1) % Math.max(1, Math.floor(options.epochs / 8)) === 0) {
      history.push({
        epoch: epoch + 1,
        loss: lossSum / dataset.x.length,
        accuracy: correct / dataset.x.length
      });
    }
  }
  return { model, history };
}

function shuffle(values) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function argMax(values) {
  let bestIndex = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[bestIndex]) {
      bestIndex = i;
    }
  }
  return bestIndex;
}

function pruneAnn(model, sparsity) {
  if (sparsity <= 0) {
    return 0;
  }
  const weights = model.layers.flatMap((layer) => layer.weights.flatMap((row) => row.map((value) => Math.abs(value))));
  if (weights.length === 0) {
    return 0;
  }
  const sorted = [...weights].sort((a, b) => a - b);
  const threshold = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * sparsity))];
  let pruned = 0;
  for (const layer of model.layers) {
    for (const row of layer.weights) {
      for (let i = 0; i < row.length; i++) {
        if (Math.abs(row[i]) <= threshold) {
          if (row[i] !== 0) {
            pruned++;
          }
          row[i] = 0;
        }
      }
    }
  }
  return pruned / weights.length;
}

function evaluateAnn(model, dataset) {
  let correct = 0;
  const confusion = dataset.labels.map(() => Array(dataset.labels.length).fill(0));
  dataset.x.forEach((input, index) => {
    const prediction = argMax(annForward(model, input).output);
    const actual = dataset.y[index];
    confusion[actual][prediction]++;
    if (prediction === actual) {
      correct++;
    }
  });
  return {
    accuracy: correct / dataset.x.length,
    confusion
  };
}

function countWeights(model) {
  return model.layers.reduce((sum, layer) => (
    sum + layer.weights.reduce((acc, row) => acc + row.length, 0)
  ), 0);
}

function countNonzeroWeights(model) {
  return model.layers.reduce((sum, layer) => (
    sum + layer.weights.reduce((acc, row) => acc + row.filter((value) => value !== 0).length, 0)
  ), 0);
}

function quantizeLayers(model) {
  return model.layers.map((layer) => {
    const flat = layer.weights.flat();
    const maxAbs = Math.max(1e-9, ...flat.map((value) => Math.abs(value)));
    const scale = maxAbs / 127;
    return {
      scale,
      weights: layer.weights.map((row) => row.map((value) => Math.max(-128, Math.min(127, Math.round(value / scale))))),
      biases: layer.biases.slice()
    };
  });
}

function getModelOptions() {
  return {
    hiddenLayers: Math.round(normalizeNumber(el.hiddenLayerInput.value, 1, 0, 4)),
    neurons: Math.round(normalizeNumber(el.neuronInput.value, 16, 2, 128)),
    activation: el.activationSelect.value,
    learningRate: normalizeNumber(el.learningRateInput.value, 0.02, 0.0001, 1),
    epochs: Math.round(normalizeNumber(el.epochInput.value, 120, 1, 2000)),
    pruningSparsity: normalizeNumber(el.pruningInput.value, 0, 0, 0.95),
    quantizedExport: el.quantizeToggle.checked
  };
}

function trainBrowserModel() {
  try {
    const dataset = getTrainingDataset();
    const options = getModelOptions();
    el.modelStatus.textContent = "Training";
    renderModelLog(["Training started"]);
    const { model, history } = trainAnn(dataset, options);
    const actualSparsity = pruneAnn(model, options.pruningSparsity);
    const metrics = evaluateAnn(model, dataset);
    state.model = {
      trained: {
        type: "keti_browser_ann",
        version: 1,
        createdAt: new Date().toISOString(),
        options,
        labels: dataset.labels,
        inputSize: dataset.inputSize,
        inputMean: dataset.mean,
        inputStd: dataset.std,
        featureNames: dataset.examples[0].featureNames || featureNamesForMode(dataset.examples[0].featureMode, dataset.examples[0].windowSamples),
        featureMode: dataset.examples[0].featureMode,
        windowSamples: dataset.examples[0].windowSamples,
        source: dataset.examples[0].source,
        preprocessing: dataset.examples[0].preprocessing,
        sizes: model.sizes,
        activation: model.activation,
        layers: model.layers,
        quantizedLayers: options.quantizedExport ? quantizeLayers(model) : null
      },
      labels: dataset.labels,
      inputSize: dataset.inputSize,
      metrics: {
        ...metrics,
        examples: dataset.examples.length,
        totalWeights: countWeights(model),
        nonzeroWeights: countNonzeroWeights(model),
        actualSparsity
      },
      trainingLog: history
    };
    renderModelView();
    logLine(`MODEL_TRAINED,labels=${dataset.labels.length},input=${dataset.inputSize},acc=${metrics.accuracy.toFixed(3)}`);
  } catch (error) {
    el.modelStatus.textContent = "Error";
    renderModelLog([`ERR ${error.message}`]);
    logLine(`ERR,model_train,${error.message}`);
  } finally {
    setUiEnabled();
  }
}

function renderModelView() {
  const examples = state.dataset.examples.length;
  if (!state.model.trained) {
    el.modelStatus.textContent = examples > 1 ? "Ready" : "Need data";
    el.modelShapeState.textContent = "No model";
    el.modelMetricState.textContent = `${examples} windows`;
    el.modelMetrics.replaceChildren(
      metricRow("Dataset", `${examples} windows`),
      metricRow("Labels", `${labelCounts().length}`)
    );
    renderModelLog(state.model.trainingLog.length ? state.model.trainingLog : ["Capture at least two labels, then train."]);
    return;
  }

  const trained = state.model.trained;
  const metrics = state.model.metrics;
  el.modelStatus.textContent = "Trained";
  el.modelShapeState.textContent = trained.sizes.join(" -> ");
  el.modelMetricState.textContent = `${(metrics.accuracy * 100).toFixed(1)}%`;
  el.modelMetrics.replaceChildren(
    metricRow("Accuracy", `${(metrics.accuracy * 100).toFixed(1)}%`),
    metricRow("Input", `${trained.inputSize}`),
    metricRow("Labels", trained.labels.join(", ")),
    metricRow("Weights", `${metrics.nonzeroWeights}/${metrics.totalWeights}`),
    metricRow("Sparsity", `${(metrics.actualSparsity * 100).toFixed(1)}%`),
    metricRow("Export", trained.quantizedLayers ? "int8 + float metadata" : "float arrays")
  );
  renderModelLog(state.model.trainingLog.map((item) => (
    `epoch ${item.epoch}: loss=${item.loss.toFixed(4)}, acc=${(item.accuracy * 100).toFixed(1)}%`
  )));
}

function metricRow(label, value) {
  const row = document.createElement("div");
  row.className = "metric-row";
  const name = document.createElement("span");
  name.textContent = label;
  const number = document.createElement("strong");
  number.textContent = value;
  row.append(name, number);
  return row;
}

function renderModelLog(lines) {
  el.modelLog.textContent = lines.join("\n");
}

function exportModelJson() {
  if (!state.model.trained) {
    return;
  }
  downloadText("keti_browser_ann_model", "json", JSON.stringify(state.model.trained, null, 2), "application/json;charset=utf-8");
}

function arrayToC(name, values, type = "float") {
  const formatted = values.map((value) => (
    type === "float" ? `${Number(value).toPrecision(8)}f` : String(value)
  ));
  const rows = [];
  for (let i = 0; i < formatted.length; i += 12) {
    rows.push(`  ${formatted.slice(i, i + 12).join(", ")}`);
  }
  return `static const ${type} ${name}[${values.length}] = {\n${rows.join(",\n")}\n};`;
}

function exportCArray() {
  const model = state.model.trained;
  if (!model) {
    return;
  }
  const lines = [
    "#ifndef KETI_BROWSER_ANN_MODEL_H",
    "#define KETI_BROWSER_ANN_MODEL_H",
    "",
    "#include <stdint.h>",
    "",
    `#define KETI_MODEL_INPUT_SIZE ${model.inputSize}`,
    `#define KETI_MODEL_OUTPUT_SIZE ${model.labels.length}`,
    `#define KETI_MODEL_LAYER_COUNT ${model.layers.length}`,
    "",
    arrayToC("keti_model_input_mean", model.inputMean),
    "",
    arrayToC("keti_model_input_std", model.inputStd),
    "",
    `static const char* keti_model_labels[${model.labels.length}] = { ${model.labels.map((label) => `"${label.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`).join(", ")} };`,
    ""
  ];

  model.layers.forEach((layer, index) => {
    const rows = layer.weights.length;
    const cols = layer.weights[0]?.length || 0;
    lines.push(`#define KETI_LAYER_${index}_ROWS ${rows}`);
    lines.push(`#define KETI_LAYER_${index}_COLS ${cols}`);
    if (model.quantizedLayers) {
      const quant = model.quantizedLayers[index];
      lines.push(`static const float keti_layer_${index}_weight_scale = ${quant.scale.toPrecision(8)}f;`);
      lines.push(arrayToC(`keti_layer_${index}_weights_q`, quant.weights.flat(), "int8_t"));
    } else {
      lines.push(arrayToC(`keti_layer_${index}_weights`, layer.weights.flat()));
    }
    lines.push(arrayToC(`keti_layer_${index}_biases`, layer.biases));
    lines.push("");
  });

  lines.push("#endif");
  downloadText("keti_browser_ann_model", "h", lines.join("\n"), "text/x-chdr;charset=utf-8");
}

function downloadText(stem, extension, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `${stem}_${stamp}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

function getHelperUrl() {
  const raw = (el.helperUrlInput.value || state.flash.helperUrl).trim();
  return raw.replace(/\/+$/, "");
}

async function helperRequest(path, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getHelperUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || `Helper returned HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function populateFirmwareSelect(firmwares) {
  const previous = el.firmwareSelect.value || "stage1_lab_console";
  const list = firmwares.length > 0 ? firmwares : DEFAULT_PREBUILT_FIRMWARES;

  el.firmwareSelect.replaceChildren(
    ...list.map((firmware) => {
      const option = document.createElement("option");
      option.value = firmware.id;
      option.textContent = `${firmware.id} v${firmware.version || "unknown"}`;
      option.dataset.fqbn = firmware.fqbn || "";
      return option;
    })
  );

  if ([...el.firmwareSelect.options].some((option) => option.value === previous)) {
    el.firmwareSelect.value = previous;
  }
}

async function checkFlashHelper() {
  try {
    el.flashState.textContent = "Checking";
    const payload = await helperRequest("/api/health", { method: "GET" }, 4000);
    state.flash.helperOnline = true;
    state.flash.helperUrl = getHelperUrl();
    el.flashState.textContent = payload.arduinoCli?.ok ? "Helper online" : "CLI warning";
    logLine(`FLASH_HELPER,online,${payload.helper},${payload.version}`);
    await loadFirmwares();
    await refreshFlashPorts();
  } catch (error) {
    state.flash.helperOnline = false;
    el.flashState.textContent = "Helper offline";
    logLine(`ERR,flash_helper,${error.message}`);
  } finally {
    setUiEnabled();
  }
}

async function loadFirmwares() {
  const payload = await helperRequest("/api/firmwares", { method: "GET" }, 5000);
  state.flash.firmwares = payload.firmware || [];
  populateFirmwareSelect(state.flash.firmwares);
}

async function refreshFlashPorts() {
  const payload = await helperRequest("/api/ports", { method: "GET" }, 12000);
  const ports = payload.ports || [];
  const previous = el.flashPortSelect.value || "COM12";
  const options = ports.length > 0 ? ports : [{ address: previous, boards: [] }];

  el.flashPortSelect.replaceChildren(
    ...options.map((port) => {
      const option = document.createElement("option");
      option.value = port.address;
      const boardName = port.boards?.[0]?.name ? ` - ${port.boards[0].name}` : "";
      option.textContent = `${port.address}${boardName}`;
      return option;
    })
  );

  if ([...el.flashPortSelect.options].some((option) => option.value === previous)) {
    el.flashPortSelect.value = previous;
  }
  logLine(`FLASH_PORTS,${options.map((port) => port.address).join("|")}`);
}

async function flashFirmware() {
  if (!state.flash.helperOnline) {
    await checkFlashHelper();
    if (!state.flash.helperOnline) {
      return;
    }
  }

  const port = el.flashPortSelect.value;
  const firmwareId = el.firmwareSelect.value;
  state.flash.helperBusy = true;
  el.flashState.textContent = "Flashing";
  setUiEnabled();

  try {
    if (state.connected) {
      await disconnectDevice();
      await sleep(500);
    }

    logLine(`FLASH_START,port=${port},firmware=${firmwareId}`);
    const payload = await helperRequest("/api/flash", {
      method: "POST",
      body: JSON.stringify({ port, firmwareId })
    }, 120000);

    appendHelperOutput(payload.stdout);
    appendHelperOutput(payload.stderr);
    el.flashState.textContent = "Flash OK";
    logLine(`FLASH_OK,port=${payload.port},elapsed_ms=${payload.elapsedMs}`);
  } catch (error) {
    el.flashState.textContent = "Flash failed";
    logLine(`ERR,flash,${error.message}`);
  } finally {
    state.flash.helperBusy = false;
    setUiEnabled();
  }
}

function appendHelperOutput(output) {
  if (!output) {
    return;
  }
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines.slice(-16)) {
    logLine(`FLASH_LOG,${line}`);
  }
}

async function loadDirectFirmwareManifest() {
  for (const manifestPath of DIRECT_MANIFEST_PATHS) {
    try {
      const response = await fetch(manifestPath, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const payload = await response.json();
      if (!Array.isArray(payload.firmware)) {
        continue;
      }
      state.flash.directFirmwares = payload.firmware;
      state.flash.directBasePath = manifestPath.replace(/manifest\.json$/i, "");
      if (!state.flash.helperOnline) {
        populateFirmwareSelect(state.flash.directFirmwares);
      }
      logLine(`DIRECT_MANIFEST,${manifestPath},items=${payload.firmware.length}`);
      return;
    } catch (error) {
      // Local file access may block fetch; the Local BIN field remains available.
    }
  }

  state.flash.directFirmwares = DEFAULT_PREBUILT_FIRMWARES;
  if (!state.flash.helperOnline) {
    populateFirmwareSelect(state.flash.directFirmwares);
  }
  logLine("DIRECT_MANIFEST,default");
}

function getSelectedFirmware() {
  const firmwareId = el.firmwareSelect.value || "stage1_lab_console";
  const candidates = [
    ...state.flash.directFirmwares,
    ...state.flash.firmwares,
    ...DEFAULT_PREBUILT_FIRMWARES
  ];
  return candidates.find((firmware) => firmware.id === firmwareId) || DEFAULT_PREBUILT_FIRMWARES[0];
}

async function readLocalFirmwareFile(file) {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

async function fetchFirmwareBytes(firmware) {
  const directories = [
    state.flash.directBasePath,
    "firmware/prebuilt/",
    "../firmware/prebuilt/"
  ].filter(Boolean);
  const uniqueDirectories = [...new Set(directories)];

  for (const directory of uniqueDirectories) {
    try {
      const baseUrl = new URL(directory, window.location.href);
      const firmwareUrl = new URL(firmware.file, baseUrl);
      const response = await fetch(firmwareUrl.href, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }
      const buffer = await response.arrayBuffer();
      return {
        bytes: new Uint8Array(buffer),
        source: firmwareUrl.href
      };
    } catch (error) {
      // Try the next static firmware location.
    }
  }

  throw new Error("Could not load static firmware; choose a Local BIN file instead");
}

async function sha256Hex(bytes) {
  if (!crypto.subtle) {
    throw new Error("SHA-256 verification requires Web Crypto support");
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function verifyFirmwareBytes(bytes, firmware) {
  if (firmware.size_bytes && bytes.length !== Number(firmware.size_bytes)) {
    throw new Error(`Firmware size mismatch: expected ${firmware.size_bytes}, got ${bytes.length}`);
  }

  if (firmware.sha256) {
    const actual = await sha256Hex(bytes);
    const expected = String(firmware.sha256).toUpperCase();
    if (actual !== expected) {
      throw new Error(`Firmware SHA-256 mismatch: ${actual}`);
    }
  }
}

async function loadDirectFirmwareBytes(firmware) {
  const localFile = el.directBinInput.files?.[0] || null;
  let bytes;
  let source;

  if (localFile) {
    bytes = await readLocalFirmwareFile(localFile);
    source = localFile.name;
  } else {
    const loaded = await fetchFirmwareBytes(firmware);
    bytes = loaded.bytes;
    source = loaded.source;
  }

  await verifyFirmwareBytes(bytes, firmware);
  return { bytes, source };
}

function setDirectFlashProgress(percent, message) {
  el.directFlashProgress.value = Math.max(0, Math.min(100, percent));
  if (message) {
    el.directFlashState.textContent = message;
  }
}

async function enterBootloaderDirect() {
  if (!("serial" in navigator) || !window.KetiDirectFlash) {
    setDirectFlashProgress(0, "Unavailable");
    logLine("ERR,direct_flash,web_serial_unavailable");
    return;
  }

  state.flash.directBusy = true;
  setDirectFlashProgress(0, "Select app port");
  setUiEnabled();

  try {
    if (state.connected) {
      await disconnectDevice();
      await sleep(300);
    }

    const port = await navigator.serial.requestPort({
      filters: window.KetiDirectFlash.ARDUINO_USB_FILTERS
    });
    await window.KetiDirectFlash.touch1200BpsReset(port);
    state.flash.directBootloaderTouched = true;
    setDirectFlashProgress(5, "Select bootloader");
    logLine("DIRECT_FLASH,bootloader_touch_1200bps");
  } catch (error) {
    setDirectFlashProgress(0, "Bootloader failed");
    logLine(`ERR,direct_bootloader,${error.message}`);
  } finally {
    state.flash.directBusy = false;
    setUiEnabled();
  }
}

async function directFlashFirmware() {
  if (!("serial" in navigator) || !window.KetiDirectFlash) {
    setDirectFlashProgress(0, "Unavailable");
    logLine("ERR,direct_flash,web_serial_unavailable");
    return;
  }

  const firmware = getSelectedFirmware();
  state.flash.directBusy = true;
  setDirectFlashProgress(0, "Select bootloader");
  setUiEnabled();

  try {
    if (state.connected) {
      await disconnectDevice();
      await sleep(300);
    }

    const port = await navigator.serial.requestPort({
      filters: window.KetiDirectFlash.ARDUINO_USB_FILTERS
    });

    setDirectFlashProgress(0, "Loading BIN");
    const loaded = await loadDirectFirmwareBytes(firmware);
    logLine(`DIRECT_FLASH,firmware=${firmware.id},bytes=${loaded.bytes.length},source=${loaded.source}`);

    const flasher = new window.KetiDirectFlash.DirectSamBaFlasher({
      onLog: (message) => logLine(`DIRECT_FLASH,${message}`),
      onProgress: ({ percent, message }) => setDirectFlashProgress(percent, message)
    });

    await flasher.flash({
      port,
      firmwareBytes: loaded.bytes,
      maxSketchSize: window.KetiDirectFlash.MAX_SKETCH_SIZE
    });

    state.flash.directBootloaderTouched = false;
    setDirectFlashProgress(100, "Flash OK");
    logLine(`DIRECT_FLASH_OK,firmware=${firmware.id}`);
  } catch (error) {
    setDirectFlashProgress(0, "Flash failed");
    logLine(`ERR,direct_flash,${error.message}`);
  } finally {
    state.flash.directBusy = false;
    setUiEnabled();
  }
}

async function sendCommand(command) {
  if (!state.writer) {
    throw new Error("Serial writer is not available.");
  }
  logLine(command, "tx");
  await state.writer.write(new TextEncoder().encode(`${command}\n`));
}

async function connectDevice() {
  if (!("serial" in navigator)) {
    setStatus(el.browserStatus, "Web Serial unavailable", "error");
    logLine("This browser does not support Web Serial.");
    return;
  }

  try {
    state.port = await navigator.serial.requestPort();
    await state.port.open({ baudRate: 115200 });
    state.writer = state.port.writable.getWriter();
    state.reader = state.port.readable.getReader();
    state.connected = true;
    state.readLoopActive = true;
    setUiEnabled();
    readLoop();
    await sleep(700);
    await sendCommand("PING");
    await sendCommand("STATUS");
  } catch (error) {
    logLine(`ERR,connect,${error.message}`);
    await disconnectDevice();
  }
}

async function disconnectDevice() {
  try {
    state.readLoopActive = false;
    state.streaming = false;
    state.recording = false;
    if (state.writer) {
      try {
        await sendCommand("STOP");
      } catch (error) {
        logLine(`ERR,stop_on_disconnect,${error.message}`);
      }
      state.writer.releaseLock();
    }
    if (state.reader) {
      await state.reader.cancel();
      state.reader.releaseLock();
    }
    if (state.port) {
      await state.port.close();
    }
  } catch (error) {
    logLine(`ERR,disconnect,${error.message}`);
  } finally {
    state.port = null;
    state.reader = null;
    state.writer = null;
    state.connected = false;
    setUiEnabled();
  }
}

async function readLoop() {
  const decoder = new TextDecoder();
  while (state.readLoopActive && state.reader) {
    try {
      const { value, done } = await state.reader.read();
      if (done) {
        break;
      }
      if (value) {
        consumeText(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (state.readLoopActive) {
        logLine(`ERR,read,${error.message}`);
      }
      break;
    }
  }
}

function consumeText(text) {
  state.lineBuffer += text;
  const lines = state.lineBuffer.split(/\r?\n/);
  state.lineBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const clean = line.trim();
    if (clean.length > 0) {
      handleLine(clean);
    }
  }
}

function handleLine(line) {
  const isStreamData = line.startsWith("DATA,") || line.startsWith("IMU,");
  if (!isStreamData) {
    logLine(line);
  }

  if (line.startsWith("ERR,EI_ACCEL_MODEL_REQUIRED")) {
    state.classification.active = false;
    el.classificationState.textContent = "Model missing";
    setUiEnabled();
    return;
  }

  if (line.startsWith("ERR,EI_RUN_CLASSIFIER") || line.startsWith("ERR,EI_SIGNAL_FROM_BUFFER")) {
    el.classificationState.textContent = "Inference error";
    setUiEnabled();
    return;
  }

  if (line.startsWith("DATA,")) {
    const sample = parseDataLine(line);
    if (sample) {
      addSample(sample);
    }
    return;
  }

  if (line.startsWith("IMU,")) {
    const sample = parseImuLine(line);
    if (sample) {
      addImuSample(sample);
    }
    return;
  }

  if (line.startsWith("CLS,")) {
    const result = parseClassificationLine(line);
    if (result) {
      updateClassification(result);
    }
    return;
  }

  if (line.startsWith("STATUS,")) {
    parseStatus(line);
    return;
  }

  if (line.startsWith("ACK,START")) {
    state.streaming = true;
    setUiEnabled();
    return;
  }

  if (line.startsWith("ACK,STOP")) {
    state.streaming = false;
    setUiEnabled();
    return;
  }

  if (line.startsWith("ACK,CLS_ON")) {
    state.classification.active = true;
    el.classificationState.textContent = "Running";
    setUiEnabled();
    return;
  }

  if (line.startsWith("ACK,CLS_OFF")) {
    state.classification.active = false;
    el.classificationState.textContent = "Idle";
    setUiEnabled();
  }
}

function parseDataLine(line) {
  const parts = line.split(",");
  if (parts.length < 7) {
    return null;
  }
  return {
    seq: Number(parts[1]),
    micros: Number(parts[2]),
    channel: Number(parts[3]),
    raw: Number(parts[4]),
    millivolts: Number(parts[5]),
    filtered: Number(parts[6]),
    receivedAt: Date.now()
  };
}

function parseImuLine(line) {
  const parts = line.split(",");
  if (parts.length < 12) {
    return null;
  }
  return {
    seq: Number(parts[1]),
    micros: Number(parts[2]),
    ax: Number(parts[3]),
    ay: Number(parts[4]),
    az: Number(parts[5]),
    gx: Number(parts[6]),
    gy: Number(parts[7]),
    gz: Number(parts[8]),
    mx: Number(parts[9]),
    my: Number(parts[10]),
    mz: Number(parts[11]),
    receivedAt: Date.now()
  };
}

function parseClassificationLine(line) {
  const parts = line.split(",");
  if (parts.length < 5) {
    return null;
  }

  const result = {
    seq: Number(parts[1]),
    millis: Number(parts[2]),
    topLabel: parts[3],
    topScore: Number(parts[4]),
    scores: [],
    timing: {},
    anomaly: null,
    updatedAt: Date.now()
  };

  for (const token of parts.slice(5)) {
    const [key, value] = token.split("=");
    if (key === "scores") {
      result.scores = value.split("|").map((item) => {
        const separator = item.lastIndexOf(":");
        return {
          label: separator >= 0 ? item.slice(0, separator) : item,
          value: separator >= 0 ? Number(item.slice(separator + 1)) : 0
        };
      }).filter((item) => item.label);
    } else if (key === "anomaly") {
      result.anomaly = Number(value);
    } else if (key && key.endsWith("_ms")) {
      result.timing[key] = Number(value);
    }
  }

  return result;
}

function parseStatus(line) {
  const tokens = line.split(",").slice(1);
  for (const token of tokens) {
    const [key, value] = token.split("=");
    if (key === "streaming") {
      state.streaming = value === "1";
    } else if (key === "classification") {
      state.classification.active = value === "1";
      el.classificationState.textContent = state.classification.active ? "Running" : "Idle";
    } else if (key === "rate_hz") {
      state.settings.rateHz = Number(value);
      el.rateInput.value = value;
    } else if (key === "channel") {
      state.settings.channel = Number(value);
      el.channelSelect.value = value;
    } else if (key === "adc_bits") {
      state.settings.resolution = Number(value);
      el.resolutionSelect.value = value;
    } else if (key === "filter") {
      state.settings.filter = value;
      el.filterSelect.value = value;
      el.filterState.textContent = value;
    } else if (key === "alpha") {
      state.settings.alpha = Number(value);
      el.alphaInput.value = String(state.settings.alpha);
      el.alphaOutput.textContent = state.settings.alpha.toFixed(3);
    } else if (key === "window") {
      state.settings.window = Number(value);
      el.windowInput.value = value;
    } else if (key === "iir_order") {
      state.settings.iirOrder = Number(value);
      el.iirOrderInput.value = value;
    } else if (key === "iir_low_hz") {
      state.settings.iirLowHz = Number(value);
      el.iirLowInput.value = value;
    } else if (key === "iir_high_hz") {
      state.settings.iirHighHz = Number(value);
      el.iirHighInput.value = value;
    }
  }
  setUiEnabled();
}

function addSample(sample) {
  state.samples.push(sample);
  if (state.samples.length > MAX_POINTS) {
    state.samples.shift();
  }

  state.receivedSamples++;
  if (state.recording) {
    state.records.push({ ...sample, kind: "adc", label: el.labelInput.value.trim() || "unlabeled" });
  }

  state.tableRows.unshift(sample);
  if (state.tableRows.length > MAX_TABLE_ROWS) {
    state.tableRows.pop();
  }

  state.latestSample = sample;
  scheduleUiRender();
}

function addImuSample(sample) {
  const processed = processImuSample(sample);
  state.imuSamples.push(sample);
  state.imuProcessedSamples.push(processed);
  if (state.imuSamples.length > MAX_IMU_POINTS) {
    state.imuSamples.shift();
    state.imuProcessedSamples.shift();
  }
  state.receivedImuSamples++;
  state.latestImu = sample;
  state.latestProcessedImu = processed;
  if (state.recording) {
    state.records.push({
      ...sample,
      ...processed,
      kind: "imu",
      label: el.labelInput.value.trim() || "unlabeled",
      preWindow: getInputWindowSize(),
      preFilter: state.settings.inputFilter,
      normalize: state.settings.normalizeMode
    });
  }
  maybeCaptureDatasetWindow(sample);
  scheduleUiRender();
}

function updateClassification(result) {
  state.classification = {
    ...state.classification,
    ...result,
    active: state.classification.active
  };
  renderClassification();
  if (state.activeView === "classification") {
    drawPlot();
  }
}

function renderClassification() {
  const result = state.classification;
  el.classificationState.textContent = result.active ? "Running" : "Idle";
  el.classificationTopLabel.textContent = result.topLabel || "--";
  el.classificationTopScore.textContent = Number.isFinite(result.topScore)
    ? `${(result.topScore * 100).toFixed(1)}%`
    : "--";

  const sortedScores = [...(result.scores || [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  el.classificationList.replaceChildren(
    ...sortedScores.map((score) => {
      const row = document.createElement("div");
      row.className = "classification-row";
      const percent = Math.max(0, Math.min(100, score.value * 100));
      const name = document.createElement("span");
      name.className = "classification-name";
      name.textContent = score.label;
      const value = document.createElement("span");
      value.className = "classification-score";
      value.textContent = `${percent.toFixed(1)}%`;
      const bar = document.createElement("span");
      bar.className = "classification-bar";
      const fill = document.createElement("span");
      fill.className = "classification-fill";
      fill.style.width = `${percent.toFixed(1)}%`;
      bar.append(fill);
      row.append(name, value, bar);
      return row;
    })
  );
}

function setActiveView(view) {
  state.activeView = view;
  for (const tab of el.viewTabs) {
    tab.classList.toggle("active", tab.dataset.view === view);
  }
  updateViewVisibility();
  drawPlot();
}

function updateViewVisibility() {
  const isDataset = state.activeView === "dataset";
  const isModel = state.activeView === "model";
  const isCanvas = !NON_CANVAS_VIEWS.has(state.activeView);
  el.signalCanvas.classList.toggle("is-hidden", !isCanvas);
  el.metricGrid.classList.toggle("is-hidden", !isCanvas);
  el.datasetView.classList.toggle("is-hidden", !isDataset);
  el.modelView.classList.toggle("is-hidden", !isModel);
  if (isDataset) {
    renderDatasetView();
  }
  if (isModel) {
    renderModelView();
  }
}

function scheduleUiRender() {
  if (state.renderPending) {
    return;
  }

  const elapsed = performance.now() - state.lastRenderTime;
  const delay = Math.max(0, RENDER_INTERVAL_MS - elapsed);
  state.renderPending = true;

  setTimeout(() => {
    requestAnimationFrame(flushUiRender);
  }, delay);
}

function flushUiRender(now) {
  state.renderPending = false;
  state.lastRenderTime = now;

  if (!state.latestSample && !state.latestImu && !state.classification.updatedAt) {
    return;
  }

  updateCurrentMetrics();
  updateRateMetric(now);

  if (state.latestSample && now - state.lastTableRenderTime >= TABLE_RENDER_INTERVAL_MS) {
    updateTable();
    state.lastTableRenderTime = now;
  }

  drawPlot();
  setUiEnabled();
}

function updateMetrics(sample) {
  el.metric1Label.textContent = "Raw";
  el.metric2Label.textContent = "Filtered";
  el.metric3Label.textContent = "Voltage";
  el.metric4Label.textContent = "Rate";
  el.sampleCount.textContent = `${state.receivedSamples} samples`;
  el.recordCount.textContent = `${state.records.length} rows`;
  el.rawMetric.textContent = sample.raw.toFixed(0);
  el.filteredMetric.textContent = sample.filtered.toFixed(1);
  el.voltageMetric.textContent = `${sample.millivolts.toFixed(1)} mV`;
  el.plotMeta.textContent = `A${sample.channel} - ${state.settings.filter} - seq ${sample.seq}`;
  el.lastTimestamp.textContent = `${sample.micros} us`;
}

function updateCurrentMetrics() {
  if (state.activeView === "dataset") {
    renderDatasetView();
    return;
  }

  if (state.activeView === "model") {
    renderModelView();
    return;
  }

  if (state.activeView === "adc" && state.latestSample) {
    updateMetrics(state.latestSample);
    return;
  }

  if (state.activeView.startsWith("imu") && state.latestImu) {
    updateImuMetrics(state.latestImu);
    return;
  }

  if (state.activeView === "classification") {
    updateClassificationMetrics();
  }
}

function updateImuMetrics(sample) {
  const processed = state.latestProcessedImu;
  const metricSource = isInputPreprocessActive() && processed ? processed : sample;
  const prefix = isInputPreprocessActive() && processed ? "Proc" : "Accel";
  const xValue = metricSource.pax ?? metricSource.ax;
  const yValue = metricSource.pay ?? metricSource.ay;
  const zValue = metricSource.paz ?? metricSource.az;
  const unit = getInputUnits();

  el.metric1Label.textContent = `${prefix} X`;
  el.metric2Label.textContent = `${prefix} Y`;
  el.metric3Label.textContent = `${prefix} Z`;
  el.metric4Label.textContent = "IMU Rate";
  el.sampleCount.textContent = `${state.receivedImuSamples} IMU`;
  el.recordCount.textContent = `${state.records.length} rows`;
  el.rawMetric.textContent = `${xValue.toFixed(3)} ${unit}`;
  el.filteredMetric.textContent = `${yValue.toFixed(3)} ${unit}`;
  el.voltageMetric.textContent = `${zValue.toFixed(3)} ${unit}`;
  el.plotMeta.textContent = `IMU ${getInputWindowSize()} win - ${state.settings.inputFilter} - ${state.settings.normalizeMode} - seq ${sample.seq}`;
  el.lastTimestamp.textContent = `${sample.micros} us`;
}

function updateClassificationMetrics() {
  const result = state.classification;
  el.metric1Label.textContent = "Top Label";
  el.metric2Label.textContent = "Confidence";
  el.metric3Label.textContent = "DSP";
  el.metric4Label.textContent = "Classify";
  el.sampleCount.textContent = result.seq == null ? "0 class" : `${result.seq + 1} class`;
  el.rawMetric.textContent = result.topLabel || "--";
  el.filteredMetric.textContent = Number.isFinite(result.topScore) ? `${(result.topScore * 100).toFixed(1)}%` : "--";
  el.voltageMetric.textContent = Number.isFinite(result.timing?.dsp_ms) ? `${result.timing.dsp_ms} ms` : "--";
  el.rateMetric.textContent = Number.isFinite(result.timing?.classification_ms) ? `${result.timing.classification_ms} ms` : "--";
  el.plotMeta.textContent = result.updatedAt ? `Classification result - seq ${result.seq}` : "Waiting for classification";
}

function updateRateMetric(now = performance.now()) {
  if (state.activeView === "classification") {
    return;
  }

  if (state.activeView.startsWith("imu")) {
    const elapsed = now - state.lastImuRateCheckTime;
    if (elapsed < 1000) {
      return;
    }
    const countDelta = state.receivedImuSamples - state.lastImuRateCheckCount;
    const rate = (countDelta * 1000) / elapsed;
    el.rateMetric.textContent = `${rate.toFixed(1)} Hz`;
    state.lastImuRateCheckCount = state.receivedImuSamples;
    state.lastImuRateCheckTime = now;
    return;
  }

  const elapsed = now - state.lastRateCheckTime;
  if (elapsed < 1000) {
    return;
  }
  const countDelta = state.receivedSamples - state.lastRateCheckCount;
  const rate = (countDelta * 1000) / elapsed;
  el.rateMetric.textContent = `${rate.toFixed(1)} Hz`;
  state.lastRateCheckCount = state.receivedSamples;
  state.lastRateCheckTime = now;
}

function updateTable() {
  el.sampleTableBody.replaceChildren(
    ...state.tableRows.slice(0, 32).map((sample) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sample.seq}</td>
        <td>${sample.micros}</td>
        <td>A${sample.channel}</td>
        <td>${sample.raw.toFixed(0)}</td>
        <td>${sample.millivolts.toFixed(2)}</td>
        <td>${sample.filtered.toFixed(2)}</td>
      `;
      return row;
    })
  );
}

function drawPlot() {
  if (state.activeView === "dataset") {
    renderDatasetView();
    return;
  }
  if (state.activeView === "model") {
    renderModelView();
    return;
  }
  if (state.activeView === "imu1d") {
    drawImuSeriesPlot();
    return;
  }
  if (state.activeView === "imu2d") {
    drawImuPlanarPlot();
    return;
  }
  if (state.activeView === "imu3d") {
    drawImu3dPlot();
    return;
  }
  if (state.activeView === "classification") {
    drawClassificationPlot();
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const compactPlot = width < 560;
  const pad = compactPlot
    ? { left: 34, right: 12, top: 18, bottom: 30 }
    : { left: 58, right: 18, top: 18, bottom: 36 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);

  drawGrid(width, height, pad, plotWidth, plotHeight);

  if (state.samples.length < 2) {
    ctx.fillStyle = "#637083";
    ctx.font = "16px Segoe UI, Arial, sans-serif";
    if (compactPlot) {
      ctx.fillText("Connect and start", pad.left + 12, pad.top + 32);
      ctx.fillText("streaming to view ADC data", pad.left + 12, pad.top + 54);
    } else {
      ctx.fillText("Connect and start streaming to view ADC data", pad.left + 12, pad.top + 32);
    }
    return;
  }

  const values = [];
  if (el.showRawToggle.checked) {
    values.push(...state.samples.map((sample) => sample.raw));
  }
  if (el.showFilteredToggle.checked) {
    values.push(...state.samples.map((sample) => sample.filtered));
  }

  let minY = 0;
  let maxY = (1 << state.settings.resolution) - 1;
  if (el.autoScaleToggle.checked && values.length > 0) {
    minY = Math.min(...values);
    maxY = Math.max(...values);
    const padding = Math.max(10, (maxY - minY) * 0.12);
    minY -= padding;
    maxY += padding;
  }
  if (Math.abs(maxY - minY) < 1) {
    maxY += 1;
    minY -= 1;
  }

  if (el.showRawToggle.checked) {
    drawTrace("raw", "#008c8c", minY, maxY, pad, plotWidth, plotHeight);
  }
  if (el.showFilteredToggle.checked) {
    drawTrace("filtered", "#d28a00", minY, maxY, pad, plotWidth, plotHeight);
  }

  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(`${maxY.toFixed(0)}`, 12, pad.top + 4);
  ctx.fillText(`${minY.toFixed(0)}`, 12, height - pad.bottom);
}

function drawGrid(width, height, pad, plotWidth, plotHeight) {
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (plotHeight * i) / 5;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
  }
  for (let i = 0; i <= 8; i++) {
    const x = pad.left + (plotWidth * i) / 8;
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
  }
  ctx.stroke();

  ctx.strokeStyle = "#bdc8d5";
  ctx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);
}

function drawTrace(key, color, minY, maxY, pad, plotWidth, plotHeight) {
  ctx.strokeStyle = color;
  ctx.lineWidth = key === "raw" ? 1.8 : 2.4;
  ctx.beginPath();
  state.samples.forEach((sample, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, state.samples.length - 1);
    const normalized = (sample[key] - minY) / (maxY - minY);
    const y = pad.top + plotHeight - normalized * plotHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
}

function drawEmptyPlot(message) {
  const { width, height } = resizeCanvasToDisplaySize();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#637083";
  ctx.font = "16px Segoe UI, Arial, sans-serif";
  ctx.fillText(message, 24, 44);
}

function drawImuSeriesPlot() {
  const { raw, processed } = getVisibleImuFrames();
  const showRaw = el.showRawToggle.checked;
  const showProcessed = el.showFilteredToggle.checked;
  const rawOverlay = showRaw && (!showProcessed || state.settings.normalizeMode === "NONE");
  if ((rawOverlay ? raw.length : 0) < 2 && (showProcessed ? processed.length : 0) < 2) {
    drawEmptyPlot("Waiting for IMU data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const pad = width < 560
    ? { left: 38, right: 14, top: 18, bottom: 30 }
    : { left: 58, right: 18, top: 18, bottom: 36 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const axes = [
    { key: "ax", color: "#008c8c", label: "ax" },
    { key: "ay", color: "#d28a00", label: "ay" },
    { key: "az", color: "#2767c9", label: "az" }
  ];
  const values = [
    ...(rawOverlay ? raw.flatMap((sample) => axes.map((axis) => sample[axis.key])) : []),
    ...(showProcessed ? processed.flatMap((sample) => IMU_PROCESSED_AXES.map((axis) => sample[axis])) : [])
  ];
  const maxAbs = Math.max(0.25, ...values.map((value) => Math.abs(value)));
  const minY = -maxAbs;
  const maxY = maxAbs;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  drawGrid(width, height, pad, plotWidth, plotHeight);

  if (rawOverlay) {
    for (const axis of axes) {
      drawImuLine(raw, axis.key, axis.color, minY, maxY, pad, plotWidth, plotHeight, 1.3, 0.38);
    }
  }

  if (showProcessed) {
    const processedAxes = [
      { key: "pax", color: "#008c8c", label: "px" },
      { key: "pay", color: "#d28a00", label: "py" },
      { key: "paz", color: "#2767c9", label: "pz" }
    ];
    for (const axis of processedAxes) {
      drawImuLine(processed, axis.key, axis.color, minY, maxY, pad, plotWidth, plotHeight, 2.4, 1);
    }
  }

  drawLegend(showProcessed
    ? [
        { color: "#008c8c", label: "x" },
        { color: "#d28a00", label: "y" },
        { color: "#2767c9", label: "z" }
      ]
    : axes, pad.left + 8, pad.top + 18);
}

function drawImuLine(samples, key, color, minY, maxY, pad, plotWidth, plotHeight, width, alpha) {
  if (samples.length < 2) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, samples.length - 1);
    const normalized = (sample[key] - minY) / (maxY - minY);
    const y = pad.top + plotHeight - normalized * plotHeight;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
}

function drawImuPlanarPlot() {
  const { raw, processed } = getVisibleImuFrames();
  const showRaw = el.showRawToggle.checked;
  const showProcessed = el.showFilteredToggle.checked;
  const rawOverlay = showRaw && (!showProcessed || state.settings.normalizeMode === "NONE");
  const primarySamples = showProcessed && processed.length >= 2 ? processed : raw;
  const primaryKeys = showProcessed && processed.length >= 2
    ? { ax: "pax", ay: "pay", az: "paz" }
    : { ax: "ax", ay: "ay", az: "az" };
  if ((rawOverlay ? raw.length : 0) < 2 && (showProcessed ? processed.length : 0) < 2) {
    drawEmptyPlot("Waiting for IMU data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);

  const planes = [
    { label: "XY", xAxis: "ax", yAxis: "ay", xLabel: "x", yLabel: "y", color: "#008c8c" },
    { label: "YZ", xAxis: "ay", yAxis: "az", xLabel: "y", yLabel: "z", color: "#d28a00" },
    { label: "ZA", xAxis: "az", yAxis: "ax", xLabel: "z", yLabel: "x", color: "#2767c9" }
  ];
  const columns = width < 760 ? 1 : 3;
  const rows = Math.ceil(planes.length / columns);
  const outerPad = width < 760
    ? { left: 18, right: 18, top: 18, bottom: 18 }
    : { left: 26, right: 26, top: 24, bottom: 24 };
  const gap = width < 760 ? 12 : 16;
  const panelWidth = (width - outerPad.left - outerPad.right - gap * (columns - 1)) / columns;
  const panelHeight = (height - outerPad.top - outerPad.bottom - gap * (rows - 1)) / rows;
  const autoScale = el.autoScaleToggle.checked;

  function average(samples, key) {
    return samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length;
  }

  for (const [planeIndex, plane] of planes.entries()) {
    const column = planeIndex % columns;
    const row = Math.floor(planeIndex / columns);
    const left = outerPad.left + column * (panelWidth + gap);
    const top = outerPad.top + row * (panelHeight + gap);
    const innerPad = { left: 34, right: 18, top: 34, bottom: 28 };
    const plotLeft = left + innerPad.left;
    const plotTop = top + innerPad.top;
    const plotWidth = panelWidth - innerPad.left - innerPad.right;
    const plotHeight = panelHeight - innerPad.top - innerPad.bottom;
    const centerX = plotLeft + plotWidth / 2;
    const centerY = plotTop + plotHeight / 2;
    const xKey = primaryKeys[plane.xAxis];
    const yKey = primaryKeys[plane.yAxis];
    const xCenter = autoScale ? average(primarySamples, xKey) : 0;
    const yCenter = autoScale ? average(primarySamples, yKey) : 0;
    const range = Math.max(
      autoScale ? 0.08 : 1,
      ...primarySamples.flatMap((sample) => [
        Math.abs(sample[xKey] - xCenter),
        Math.abs(sample[yKey] - yCenter)
      ])
    );
    const scale = Math.min(plotWidth, plotHeight) * 0.44;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d7dee8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(left, top, panelWidth, panelHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#d7dee8";
    ctx.beginPath();
    ctx.moveTo(plotLeft, centerY);
    ctx.lineTo(plotLeft + plotWidth, centerY);
    ctx.moveTo(centerX, plotTop);
    ctx.lineTo(centerX, plotTop + plotHeight);
    ctx.stroke();

    ctx.strokeStyle = "#bdc8d5";
    ctx.strokeRect(plotLeft, plotTop, plotWidth, plotHeight);

    if (rawOverlay) {
      drawPlanarTrace(raw, plane.xAxis, plane.yAxis, xCenter, yCenter, range, scale, centerX, centerY, "#14242b", 1.2, 0.28);
    }
    if (showProcessed) {
      drawPlanarTrace(processed, primaryKeys[plane.xAxis], primaryKeys[plane.yAxis], xCenter, yCenter, range, scale, centerX, centerY, plane.color, 2.6, 1);
    }

    const latest = primarySamples[primarySamples.length - 1];
    const latestX = centerX + ((latest[xKey] - xCenter) / range) * scale;
    const latestY = centerY - ((latest[yKey] - yCenter) / range) * scale;
    ctx.fillStyle = showProcessed ? plane.color : "#14242b";
    ctx.beginPath();
    ctx.arc(latestX, latestY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#17202a";
    ctx.font = "700 13px Segoe UI, Arial, sans-serif";
    ctx.fillText(plane.label, left + 12, top + 20);
    ctx.fillStyle = "#637083";
    ctx.font = "12px Segoe UI, Arial, sans-serif";
    ctx.fillText(plane.xLabel, plotLeft + plotWidth - 16, centerY - 8);
    ctx.fillText(plane.yLabel, centerX + 8, plotTop + 14);
    ctx.fillText(autoScale ? `+/-${range.toFixed(2)} ${getInputUnits()} from mean` : `+/-${range.toFixed(2)} ${getInputUnits()}`, left + 42, top + 20);
  }
}

function drawPlanarTrace(samples, xKey, yKey, xCenter, yCenter, range, scale, centerX, centerY, color, width, alpha) {
  if (samples.length < 2) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = centerX + ((sample[xKey] - xCenter) / range) * scale;
    const y = centerY - ((sample[yKey] - yCenter) / range) * scale;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
}

function drawImu3dPlot() {
  const { raw, processed } = getVisibleImuFrames();
  const showRaw = el.showRawToggle.checked;
  const showProcessed = el.showFilteredToggle.checked;
  const rawOverlay = showRaw && (!showProcessed || state.settings.normalizeMode === "NONE");
  const samples = showProcessed && processed.length >= 2 ? processed : raw;
  const keys = showProcessed && processed.length >= 2
    ? { ax: "pax", ay: "pay", az: "paz" }
    : { ax: "ax", ay: "ay", az: "az" };
  if ((rawOverlay ? raw.length : 0) < 2 && (showProcessed ? processed.length : 0) < 2) {
    drawEmptyPlot("Waiting for IMU data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const autoScale = el.autoScaleToggle.checked;
  const center = autoScale
    ? {
        ax: samples.reduce((sum, sample) => sum + sample[keys.ax], 0) / samples.length,
        ay: samples.reduce((sum, sample) => sum + sample[keys.ay], 0) / samples.length,
        az: samples.reduce((sum, sample) => sum + sample[keys.az], 0) / samples.length
      }
    : { ax: 0, ay: 0, az: 0 };
  const range = Math.max(
    autoScale ? 0.08 : 1,
    ...samples.flatMap((sample) => [
      Math.abs(sample[keys.ax] - center.ax),
      Math.abs(sample[keys.ay] - center.ay),
      Math.abs(sample[keys.az] - center.az)
    ])
  );

  function projectVector(x, y, z) {
    const nx = x / range;
    const ny = y / range;
    const nz = z / range;
    return {
      x: (nx - ny) * 0.82,
      y: (nx + ny) * 0.40 - nz * 0.92
    };
  }

  const tracePoints = samples.map((sample) => projectVector(
    sample[keys.ax] - center.ax,
    sample[keys.ay] - center.ay,
    sample[keys.az] - center.az
  ));
  const origin = projectVector(0, 0, 0);
  const axes = [
    { end: projectVector(range, 0, 0), color: "#008c8c", label: "x" },
    { end: projectVector(0, range, 0), color: "#d28a00", label: "y" },
    { end: projectVector(0, 0, range), color: "#2767c9", label: "z" }
  ];
  const fitPoints = [origin, ...axes.map((axis) => axis.end), ...tracePoints];
  const minX = Math.min(...fitPoints.map((point) => point.x));
  const maxX = Math.max(...fitPoints.map((point) => point.x));
  const minY = Math.min(...fitPoints.map((point) => point.y));
  const maxY = Math.max(...fitPoints.map((point) => point.y));
  const pad = width < 760
    ? { left: 26, right: 26, top: 28, bottom: 34 }
    : { left: 48, right: 48, top: 38, bottom: 44 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const fitScale = Math.min(
    plotWidth / Math.max(0.1, maxX - minX),
    plotHeight / Math.max(0.1, maxY - minY)
  ) * 0.84;
  const fitCenterX = (minX + maxX) / 2;
  const fitCenterY = (minY + maxY) / 2;
  const screenCenterX = pad.left + plotWidth / 2;
  const screenCenterY = pad.top + plotHeight / 2;

  function toScreen(point) {
    return {
      x: screenCenterX + (point.x - fitCenterX) * fitScale,
      y: screenCenterY + (point.y - fitCenterY) * fitScale
    };
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);

  const originPoint = toScreen(origin);
  for (const axis of axes) {
    const end = toScreen(axis.end);
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originPoint.x, originPoint.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = axis.color;
    ctx.font = "700 13px Segoe UI, Arial, sans-serif";
    ctx.fillText(axis.label, end.x + 6, end.y);
  }

  if (rawOverlay && showProcessed && raw.length >= 2) {
    const rawTracePoints = raw.map((sample) => projectVector(
      sample.ax - center.ax,
      sample.ay - center.ay,
      sample.az - center.az
    ));
    ctx.save();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = "#14242b";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    rawTracePoints.forEach((tracePoint, index) => {
      const point = toScreen(tracePoint);
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = showProcessed ? "#14242b" : "#008c8c";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  tracePoints.forEach((tracePoint, index) => {
    const point = toScreen(tracePoint);
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();

  const latest = samples[samples.length - 1];
  const latestPoint = toScreen(projectVector(
    latest[keys.ax] - center.ax,
    latest[keys.ay] - center.ay,
    latest[keys.az] - center.az
  ));
  ctx.fillStyle = "#d28a00";
  ctx.beginPath();
  ctx.arc(latestPoint.x, latestPoint.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(autoScale ? `3D auto zoom: +/-${range.toFixed(2)} ${getInputUnits()} from mean` : `3D scale: +/-${range.toFixed(2)} ${getInputUnits()}`, pad.left + 12, pad.top + 20);
}

function drawClassificationPlot() {
  const scores = [...(state.classification.scores || [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  if (scores.length === 0) {
    drawEmptyPlot(state.classification.active
      ? "Collecting inference window - first result takes about 2 s"
      : "Press Start + Class or Start Class to run inference");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const pad = { left: width < 680 ? 112 : 180, right: 28, top: 22, bottom: 24 };
  const rowHeight = Math.min(34, (height - pad.top - pad.bottom) / scores.length);
  const barWidth = width - pad.left - pad.right;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.font = "12px Segoe UI, Arial, sans-serif";

  scores.forEach((score, index) => {
    const y = pad.top + index * rowHeight;
    const percent = Math.max(0, Math.min(1, score.value));
    ctx.fillStyle = "#637083";
    const label = score.label.length > 22 ? `${score.label.slice(0, 21)}...` : score.label;
    ctx.fillText(label, 12, y + rowHeight * 0.62);
    ctx.fillStyle = "#eef3f7";
    ctx.fillRect(pad.left, y + 7, barWidth, Math.max(8, rowHeight - 14));
    ctx.fillStyle = index === 0 ? "#008c8c" : "#2767c9";
    ctx.fillRect(pad.left, y + 7, barWidth * percent, Math.max(8, rowHeight - 14));
    ctx.fillStyle = "#17202a";
    ctx.fillText(`${(percent * 100).toFixed(1)}%`, pad.left + 8, y + rowHeight * 0.62);
  });
}

function drawLegend(items, x, y) {
  items.forEach((item, index) => {
    const offsetX = x + index * 58;
    ctx.fillStyle = item.color;
    ctx.fillRect(offsetX, y - 9, 16, 3);
    ctx.fillStyle = "#637083";
    ctx.font = "12px Segoe UI, Arial, sans-serif";
    ctx.fillText(item.label, offsetX + 20, y - 4);
  });
}

async function applyAcquisition() {
  state.settings.channel = normalizeNumber(el.channelSelect.value, 0, 0, 7);
  state.settings.rateHz = normalizeNumber(el.rateInput.value, 100, 1, 1000);
  state.settings.resolution = normalizeNumber(el.resolutionSelect.value, 12, 10, 12);

  await sendCommand(`STOP`);
  await sendCommand(`RES ${state.settings.resolution}`);
  await sendCommand(`CH ${state.settings.channel}`);
  await sendCommand(`RATE ${state.settings.rateHz}`);
}

async function applyFilter() {
  state.settings.filter = el.filterSelect.value;
  state.settings.alpha = normalizeNumber(el.alphaInput.value, 0.2, 0.001, 1);
  state.settings.window = normalizeNumber(el.windowInput.value, 8, 1, 32);
  state.settings.iirOrder = Math.round(normalizeNumber(el.iirOrderInput.value, 2, 1, 4));
  state.settings.iirLowHz = normalizeNumber(el.iirLowInput.value, 1.0, 0.01, 450);
  state.settings.iirHighHz = normalizeNumber(el.iirHighInput.value, 10.0, 0.02, 450);

  await sendCommand(`FILTER ${state.settings.filter}`);
  await sendCommand(`ALPHA ${state.settings.alpha.toFixed(3)}`);
  await sendCommand(`WINDOW ${Math.round(state.settings.window)}`);
  if (state.settings.filter.startsWith("IIR_")) {
    await sendCommand(`IIRORDER ${state.settings.iirOrder}`);
    await sendCommand(`IIRHIGH ${state.settings.iirHighHz.toFixed(3)}`);
    await sendCommand(`IIRLOW ${state.settings.iirLowHz.toFixed(3)}`);
  }
  el.filterState.textContent = state.settings.filter;
}

function applyInputPreprocess() {
  const maxCutoff = Math.max(0.01, getInputSampleRateHz() * 0.45);
  state.settings.inputWindowSamples = Math.round(normalizeNumber(el.inputWindowInput.value, 125, 16, MAX_IMU_POINTS));
  state.settings.inputFilter = el.inputFilterSelect.value;
  state.settings.normalizeMode = el.normalizeSelect.value;
  state.settings.inputAlpha = normalizeNumber(el.inputAlphaInput.value, 0.2, 0.001, 1);
  state.settings.inputMaWindow = Math.round(normalizeNumber(el.inputMaWindowInput.value, 5, 1, 128));
  state.settings.inputIirOrder = Math.round(normalizeNumber(el.inputIirOrderInput.value, 2, 1, 4));
  state.settings.inputIirHighHz = normalizeNumber(el.inputIirHighInput.value, 8.0, 0.02, maxCutoff);
  state.settings.inputIirLowHz = Math.min(
    normalizeNumber(el.inputIirLowInput.value, 0.5, 0.01, maxCutoff),
    Math.max(0.01, state.settings.inputIirHighHz - 0.01)
  );

  el.inputWindowInput.value = String(state.settings.inputWindowSamples);
  el.inputAlphaInput.value = String(state.settings.inputAlpha);
  el.inputAlphaOutput.textContent = state.settings.inputAlpha.toFixed(3);
  el.inputMaWindowInput.value = String(state.settings.inputMaWindow);
  el.inputIirOrderInput.value = String(state.settings.inputIirOrder);
  el.inputIirLowInput.value = state.settings.inputIirLowHz.toFixed(2);
  el.inputIirHighInput.value = state.settings.inputIirHighHz.toFixed(2);
  el.inputState.textContent = `${state.settings.inputWindowSamples} win`;

  rebuildImuProcessing();
  logLine(`INPUT,window=${state.settings.inputWindowSamples},filter=${state.settings.inputFilter},normalize=${state.settings.normalizeMode}`);
  updateCurrentMetrics();
  drawPlot();
}

async function startStreaming() {
  if (state.activeView === "classification") {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 200);
    applyInputPreprocess();
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("CLS ON");
    await sendCommand("START");
    return;
  }

  if (state.activeView !== "adc") {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 200);
    applyInputPreprocess();
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("START");
    return;
  }

  await applyAcquisition();
  await applyFilter();
  await sendCommand("START");
}

async function stopStreaming() {
  if (state.activeView === "classification") {
    await sendCommand("CLS OFF");
  }
  await sendCommand("STOP");
}

function clearData() {
  state.samples = [];
  state.imuSamples = [];
  state.imuProcessedSamples = [];
  state.records = [];
  state.tableRows = [];
  state.latestSample = null;
  state.latestImu = null;
  state.latestProcessedImu = null;
  resetPreprocessState();
  state.renderPending = false;
  state.lastRenderTime = performance.now();
  state.lastTableRenderTime = 0;
  state.receivedSamples = 0;
  state.receivedImuSamples = 0;
  state.lastRateCheckCount = 0;
  state.lastRateCheckTime = performance.now();
  state.lastImuRateCheckCount = 0;
  state.lastImuRateCheckTime = performance.now();
  el.sampleCount.textContent = "0 samples";
  el.recordCount.textContent = "0 rows";
  el.rawMetric.textContent = "--";
  el.filteredMetric.textContent = "--";
  el.voltageMetric.textContent = "--";
  el.rateMetric.textContent = "--";
  el.plotMeta.textContent = "Waiting for device data";
  el.lastTimestamp.textContent = "No data";
  updateTable();
  drawPlot();
  setUiEnabled();
}

function toggleRecording() {
  state.recording = !state.recording;
  setUiEnabled();
}

async function startClassification() {
  await sendCommand("CLS ON");
}

async function stopClassification() {
  await sendCommand("CLS OFF");
}

function exportCsv() {
  const header = [
    "label",
    "type",
    "seq",
    "micros",
    "channel",
    "raw",
    "millivolts",
    "filtered",
    "ax_g",
    "ay_g",
    "az_g",
    "proc_ax",
    "proc_ay",
    "proc_az",
    "gyro_x_dps",
    "gyro_y_dps",
    "gyro_z_dps",
    "mag_x_uT",
    "mag_y_uT",
    "mag_z_uT",
    "input_window",
    "input_filter",
    "normalize",
    "received_at_iso"
  ].join(",") + "\n";
  const rows = state.records.map((row) => [
    csvCell(row.label),
    csvCell(row.kind || "adc"),
    row.seq,
    row.micros,
    row.kind === "imu" ? "" : `A${row.channel}`,
    row.raw ?? "",
    Number.isFinite(row.millivolts) ? row.millivolts.toFixed(3) : "",
    Number.isFinite(row.filtered) ? row.filtered.toFixed(3) : "",
    Number.isFinite(row.ax) ? row.ax.toFixed(6) : "",
    Number.isFinite(row.ay) ? row.ay.toFixed(6) : "",
    Number.isFinite(row.az) ? row.az.toFixed(6) : "",
    Number.isFinite(row.pax) ? row.pax.toFixed(6) : "",
    Number.isFinite(row.pay) ? row.pay.toFixed(6) : "",
    Number.isFinite(row.paz) ? row.paz.toFixed(6) : "",
    Number.isFinite(row.gx) ? row.gx.toFixed(6) : "",
    Number.isFinite(row.gy) ? row.gy.toFixed(6) : "",
    Number.isFinite(row.gz) ? row.gz.toFixed(6) : "",
    Number.isFinite(row.mx) ? row.mx.toFixed(6) : "",
    Number.isFinite(row.my) ? row.my.toFixed(6) : "",
    Number.isFinite(row.mz) ? row.mz.toFixed(6) : "",
    row.preWindow ?? "",
    csvCell(row.preFilter ?? ""),
    csvCell(row.normalize ?? ""),
    new Date(row.receivedAt).toISOString()
  ].join(","));
  const blob = new Blob([header, rows.join("\n"), "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `keti_lab_samples_${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bindEvents() {
  el.connectButton.addEventListener("click", connectDevice);
  el.disconnectButton.addEventListener("click", disconnectDevice);
  el.startButton.addEventListener("click", startStreaming);
  el.stopButton.addEventListener("click", stopStreaming);
  el.applyAcquisitionButton.addEventListener("click", applyAcquisition);
  el.applyFilterButton.addEventListener("click", applyFilter);
  el.applyInputButton.addEventListener("click", applyInputPreprocess);
  el.datasetCaptureButton.addEventListener("click", toggleDatasetCapture);
  el.datasetCaptureOneButton.addEventListener("click", () => captureDatasetWindow("manual"));
  el.datasetExportJsonButton.addEventListener("click", exportDatasetJson);
  el.datasetExportCsvButton.addEventListener("click", exportDatasetCsv);
  el.datasetClearButton.addEventListener("click", clearDataset);
  el.datasetImportInput.addEventListener("change", importDatasetJson);
  el.trainModelButton.addEventListener("click", trainBrowserModel);
  el.exportModelJsonButton.addEventListener("click", exportModelJson);
  el.exportCArrayButton.addEventListener("click", exportCArray);
  el.pingButton.addEventListener("click", () => sendCommand("PING"));
  el.classStartButton.addEventListener("click", startClassification);
  el.classStopButton.addEventListener("click", stopClassification);
  el.recordButton.addEventListener("click", toggleRecording);
  el.clearButton.addEventListener("click", clearData);
  el.exportButton.addEventListener("click", exportCsv);
  el.helperCheckButton.addEventListener("click", checkFlashHelper);
  el.refreshPortsButton.addEventListener("click", refreshFlashPorts);
  el.flashButton.addEventListener("click", flashFirmware);
  el.bootloaderButton.addEventListener("click", enterBootloaderDirect);
  el.directFlashButton.addEventListener("click", directFlashFirmware);
  el.directBinInput.addEventListener("change", () => {
    const file = el.directBinInput.files?.[0];
    setDirectFlashProgress(0, file ? "Local BIN" : "Ready");
  });
  el.helperUrlInput.addEventListener("change", () => {
    state.flash.helperOnline = false;
    el.flashState.textContent = "Helper unchecked";
    setUiEnabled();
  });
  el.showRawToggle.addEventListener("change", drawPlot);
  el.showFilteredToggle.addEventListener("change", drawPlot);
  el.autoScaleToggle.addEventListener("change", drawPlot);
  for (const tab of el.viewTabs) {
    tab.addEventListener("click", () => setActiveView(tab.dataset.view));
  }
  window.addEventListener("resize", drawPlot);
  el.alphaInput.addEventListener("input", () => {
    el.alphaOutput.textContent = Number(el.alphaInput.value).toFixed(3);
  });
  el.inputAlphaInput.addEventListener("input", () => {
    el.inputAlphaOutput.textContent = Number(el.inputAlphaInput.value).toFixed(3);
  });
  el.pruningInput.addEventListener("input", () => {
    el.pruningOutput.textContent = `${(Number(el.pruningInput.value) * 100).toFixed(0)}%`;
  });
}

function init() {
  if ("serial" in navigator) {
    setStatus(el.browserStatus, "Web Serial ready", "");
  } else {
    setStatus(el.browserStatus, "Web Serial unavailable", "error");
  }
  populateFirmwareSelect(DEFAULT_PREBUILT_FIRMWARES);
  bindEvents();
  applyInputPreprocess();
  updateViewVisibility();
  renderDatasetView();
  renderModelView();
  setUiEnabled();
  renderClassification();
  drawPlot();
  loadDirectFirmwareManifest();
  checkFlashHelper();
}

init();
