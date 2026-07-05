const els = {
  uiScale: document.querySelector("#uiScale"),
  serialSupport: document.querySelector("#serialSupport"),
  connectionStatus: document.querySelector("#connectionStatus"),
  transportMode: document.querySelector("#transportMode"),
  serialOptions: document.querySelector("#serialOptions"),
  baudRate: document.querySelector("#baudRate"),
  connectButton: document.querySelector("#connectButton"),
  demoButton: document.querySelector("#demoButton"),
  dacSlider: document.querySelector("#dacSlider"),
  dacInput: document.querySelector("#dacInput"),
  dacTarget: document.querySelector("#dacTarget"),
  dacValueLabel: document.querySelector("#dacValueLabel"),
  sendDacButton: document.querySelector("#sendDacButton"),
  liveSend: document.querySelector("#liveSend"),
  bitModeButton: document.querySelector("#bitModeButton"),
  bitModeStatus: document.querySelector("#bitModeStatus"),
  adcSourceStatus: document.querySelector("#adcSourceStatus"),
  log: document.querySelector("#log"),
  clearLogButton: document.querySelector("#clearLogButton"),
  latestValue: document.querySelector("#latestValue"),
  minValue: document.querySelector("#minValue"),
  maxValue: document.querySelector("#maxValue"),
  avgValue: document.querySelector("#avgValue"),
  rateValue: document.querySelector("#rateValue"),
  sampleCount: document.querySelector("#sampleCount"),
  windowSize: document.querySelector("#windowSize"),
  sampleRate: document.querySelector("#sampleRate"),
  sendRateButton: document.querySelector("#sendRateButton"),
  adc3Rate: document.querySelector("#adc3Rate"),
  sendAdc3RateButton: document.querySelector("#sendAdc3RateButton"),
  plotAdcSource: document.querySelector("#plotAdcSource"),
  bitMethod: document.querySelector("#bitMethod"),
  cipherWidth: document.querySelector("#cipherWidth"),
  liveMaWindow: document.querySelector("#liveMaWindow"),
  liveMaOffset: document.querySelector("#liveMaOffset"),
  liveMaWindowField: document.querySelector("#liveMaWindowField"),
  liveMaOffsetField: document.querySelector("#liveMaOffsetField"),
  encryptionToggle: document.querySelector("#encryptionToggle"),
  keyBitCount: document.querySelector("#keyBitCount"),
  encryptionPending: document.querySelector("#encryptionPending"),
  encryptionCount: document.querySelector("#encryptionCount"),
  encryptionPlain: document.querySelector("#encryptionPlain"),
  encryptionKey: document.querySelector("#encryptionKey"),
  encryptionCipher: document.querySelector("#encryptionCipher"),
  encryptionChannel: document.querySelector("#encryptionChannel"),
  encryptionStatus: document.querySelector("#encryptionStatus"),
  exportCipherButton: document.querySelector("#exportCipherButton"),
  cipherCanvas: document.querySelector("#cipherCanvas"),
  cipherCanvasWrap: document.querySelector(".cipher-canvas-wrap"),
  autoScale: document.querySelector("#autoScale"),
  manualScale: document.querySelector("#manualScale"),
  yMin: document.querySelector("#yMin"),
  yMax: document.querySelector("#yMax"),
  filterMode: document.querySelector("#filterMode"),
  valueMode: document.querySelector("#valueMode"),
  biasValue: document.querySelector("#biasValue"),
  measureBiasButton: document.querySelector("#measureBiasButton"),
  filterWindow: document.querySelector("#filterWindow"),
  filterWindowField: document.querySelector("#filterWindowField"),
  highCutoff: document.querySelector("#highCutoff"),
  highCutoffField: document.querySelector("#highCutoffField"),
  lowCutoff: document.querySelector("#lowCutoff"),
  lowCutoffField: document.querySelector("#lowCutoffField"),
  valueSummary: document.querySelector("#valueSummary"),
  filterSummary: document.querySelector("#filterSummary"),
  pauseButton: document.querySelector("#pauseButton"),
  clearSamplesButton: document.querySelector("#clearSamplesButton"),
  exportButton: document.querySelector("#exportButton"),
  plotCaption: document.querySelector("#plotCaption"),
  plotCanvas: document.querySelector("#plotCanvas"),
  canvasWrap: document.querySelector(".canvas-wrap"),
  bitPanel: document.querySelector("#bitPanel"),
  bitCaption: document.querySelector("#bitCaption"),
  bitColumns: document.querySelector("#bitColumns"),
  bitRows: document.querySelector("#bitRows"),
  bitHistoryLimit: document.querySelector("#bitHistoryLimit"),
  clearBitsButton: document.querySelector("#clearBitsButton"),
  exportBitsButton: document.querySelector("#exportBitsButton"),
  bitCount: document.querySelector("#bitCount"),
  oneCount: document.querySelector("#oneCount"),
  zeroCount: document.querySelector("#zeroCount"),
  onesRatio: document.querySelector("#onesRatio"),
  bitCanvas: document.querySelector("#bitCanvas"),
  bitCanvasWrap: document.querySelector(".bit-canvas-wrap"),
  viewTabs: document.querySelectorAll("[data-view-target]"),
  liveView: document.querySelector("#liveView"),
  noiseView: document.querySelector("#noiseView"),
  noiseCaption: document.querySelector("#noiseCaption"),
  noiseCsvFile: document.querySelector("#noiseCsvFile"),
  noiseDelimiter: document.querySelector("#noiseDelimiter"),
  noiseColumn: document.querySelector("#noiseColumn"),
  noiseWindow: document.querySelector("#noiseWindow"),
  noiseThresholdOffset: document.querySelector("#noiseThresholdOffset"),
  noiseMethodMovingAverage: document.querySelector("#noiseMethodMovingAverage"),
  noiseMethodDelta: document.querySelector("#noiseMethodDelta"),
  noiseMethodLsb: document.querySelector("#noiseMethodLsb"),
  noiseVonNeumann: document.querySelector("#noiseVonNeumann"),
  runNoiseButton: document.querySelector("#runNoiseButton"),
  exportNoiseBitsButton: document.querySelector("#exportNoiseBitsButton"),
  noiseRowCount: document.querySelector("#noiseRowCount"),
  noiseNumericCount: document.querySelector("#noiseNumericCount"),
  noiseBitCount: document.querySelector("#noiseBitCount"),
  noiseOneRatio: document.querySelector("#noiseOneRatio"),
  noisePreviewCaption: document.querySelector("#noisePreviewCaption"),
  noisePreviewHead: document.querySelector("#noisePreviewHead"),
  noisePreviewBody: document.querySelector("#noisePreviewBody"),
  noiseMethodBlocks: document.querySelector("#noiseMethodBlocks"),
  noiseBitCanvas: document.querySelector("#noiseBitCanvas"),
  noiseBitCanvasWrap: document.querySelector(".noise-canvas-wrap"),
};

const DEFAULT_MAX_SAMPLES = 20000;
const MIN_MAX_SAMPLES = 100;
const MAX_MAX_SAMPLES = 1000000;
const DEFAULT_SAMPLE_RATE_HZ = 25;
const MIN_SAMPLE_RATE_HZ = 25;
const MAX_SAMPLE_RATE_HZ = 100;
const DEFAULT_PPG_RATE_HZ = 25;
const DEFAULT_PPG_LED_ON_MS = 10;
const DEFAULT_ADC3_RATE_HZ = 1000;
const MIN_ADC3_RATE_HZ = 25;
const MAX_ADC3_RATE_HZ = 1000;
const DEFAULT_ADC3_BATCH_MAX = 64;
const DEFAULT_CIPHER_WIDTH_BITS = 14;
const CIPHER_WIDTH_OPTIONS = new Set([8, 10, 12, 14]);
const MAX_KEY_BITS = 8192;
const MAX_PENDING_PPG = 512;
const MAX_ENCRYPTED_PPG = 4096;

const state = {
  transport: "none",
  port: null,
  reader: null,
  bleDevice: null,
  bleServer: null,
  bleWriteCharacteristic: null,
  bleNotifyCharacteristic: null,
  writer: null,
  firmwareVersion: "",
  keepReading: false,
  decoder: new TextDecoder(),
  parseBuffer: "",
  binaryBuffer: [],
  samples: [],
  totalSamples: 0,
  latest: null,
  latestChannel: "ADC",
  adcSource: "ADC2",
  bitAdcSource: "ADC3",
  valueMode: "adc",
  adcBias: { ADC3: null, ADC2: null, ADC0: null },
  dacValues: { A: 2048, B: 2056 },
  bitMode: false,
  encryptionEnabled: false,
  bits: [],
  totalBits: 0,
  maxBits: 32768,
  bitColumns: 128,
  bitRows: 128,
  bitPlane: [],
  bitPlaneIndex: 0,
  bitPlaneFilled: 0,
  bitPlaneCapacity: 0,
  bitPlaneCycles: 0,
  bitLanes: {},
  bitSource: "idle",
  bitGenerationMethod: "residual-vn",
  cipherWidthBits: DEFAULT_CIPHER_WIDTH_BITS,
  keyBits: [],
  pendingPpg: [],
  encryptedPpg: [],
  encryptedCount: 0,
  droppedPpg: 0,
  lastEncrypted: null,
  lastAdc3BatchCount: 0,
  totalAdc3BatchSamples: 0,
  liveMaWindow: 33,
  liveMaOffset: 0,
  noiseBaseline: null,
  noiseWarmup: 0,
  noisePairBit: null,
  noiseExtractors: {},
  liveBitExtractors: {},
  paused: false,
  demoTimer: null,
  demoPhase: 0,
  liveSendTimer: null,
  writeQueue: Promise.resolve(),
  maxSamples: DEFAULT_MAX_SAMPLES,
  sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
  sampleIntervalMs: 40,
  ppgRateHz: DEFAULT_PPG_RATE_HZ,
  ppgSampleIntervalMs: 40,
  ppgLedOnMs: DEFAULT_PPG_LED_ON_MS,
  adc3RateHz: DEFAULT_ADC3_RATE_HZ,
  adc3SampleIntervalMs: 1,
  adc3BatchMax: DEFAULT_ADC3_BATCH_MAX,
  saadcBaseHz: 1000,
  saadcOversample: 0,
  lastStatsAt: 0,
  needsDraw: true,
  lastDrawAt: 0,
  needsBitDraw: true,
  lastBitDrawAt: 0,
  needsCipherDraw: true,
  lastCipherDrawAt: 0,
  noiseTable: null,
  noiseFileName: "",
  noiseResults: [],
  noiseSelectedBits: [],
  noiseSelectedMethod: "",
};

const encoder = new TextEncoder();
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_WRITE_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_NOTIFY_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const NOISE_BASELINE_ALPHA = 0.02;
const NOISE_WARMUP_SAMPLES = 12;
const ADC_CURRENT_SCALE = 1.8 / 8192;
const ADC_BIAS_SAMPLE_COUNT = 128;
const UI_SCALE_STORAGE_KEY = "ppgTrngUiScale";
const UI_SCALE_VALUES = new Set(["compact", "standard", "large", "touch"]);
const CHANNEL_ORDER = ["ADC", "G", "I", "R", "A"];
const CHANNEL_LABELS = {
  ADC: "ADC",
  G: "Green",
  I: "IR",
  R: "Red",
  A: "Ambient",
};
const CHANNEL_COLORS = {
  ADC: "#087f72",
  G: "#149447",
  I: "#5b5bd6",
  R: "#d64545",
  A: "#5c6f82",
};

const SERIES_ORDER = ["ADC3", "ADC2", "ADC0", "G", "I", "R", "A"];
const ADC_SOURCE_COLORS = {
  ADC3: "#087f72",
  ADC2: "#7c4dff",
  ADC0: "#b86800",
};

const ADC_SOURCE_INFO = {
  ADC3: {
    command: "ADC3",
    label: "ADC3 noise/TRNG",
    detail: "Noise/TRNG - AIN3/P0.05",
  },
  ADC2: {
    command: "ADC2",
    label: "ADC2 signal",
    detail: "Signal - AIN2/P0.04",
  },
  ADC0: {
    command: "ADC0",
    label: "ADC0 commercial",
    detail: "Commercial PPG - AIN0/P0.02",
  },
};

const plot = {
  ctx: els.plotCanvas.getContext("2d"),
  width: 0,
  height: 0,
  dpr: 1,
};

const bitMap = {
  ctx: els.bitCanvas.getContext("2d"),
  width: 0,
  height: 0,
  dpr: 1,
};

const cipherPlot = {
  ctx: els.cipherCanvas.getContext("2d"),
  width: 0,
  height: 0,
  dpr: 1,
};

const noiseBitMap = {
  ctx: els.noiseBitCanvas.getContext("2d"),
  width: 0,
  height: 0,
  dpr: 1,
};

const NOISE_METHODS = [
  {
    key: "ma",
    name: "Moving average threshold",
    shortName: "Moving average",
    description: "이전 샘플의 이동평균에 offset을 더한 기준선보다 현재 샘플이 크면 1로 변환합니다.",
  },
  {
    key: "delta",
    name: "Delta sign",
    shortName: "Delta sign",
    description: "연속 샘플의 차분 부호를 사용합니다. 값이 증가하면 1, 감소하면 0으로 변환합니다.",
  },
  {
    key: "lsb",
    name: "LSB parity",
    shortName: "LSB parity",
    description: "반올림한 데이터의 최하위 비트만 사용합니다. ADC 양자화 노이즈가 충분히 흔들릴 때 비교용으로 봅니다.",
  },
];

function clampDac(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 0;
  return Math.min(4095, Math.max(0, number));
}

function getSelectedDacTarget() {
  return els.dacTarget?.value === "A" ? "A" : "B";
}

function formatDacCommand(value) {
  const target = getSelectedDacTarget();
  return `${target}${clampDac(value)}`;
}

function setDacValue(value, source = "ui") {
  const next = clampDac(value);
  state.dacValues[getSelectedDacTarget()] = next;
  els.dacSlider.value = String(next);
  els.dacInput.value = String(next);
  els.dacValueLabel.value = String(next);

  if (source !== "send" && source !== "target" && els.liveSend.checked) {
    window.clearTimeout(state.liveSendTimer);
    state.liveSendTimer = window.setTimeout(() => sendCommand(formatDacCommand(next)), 120);
  }
}

function setConnectionStatus(text, kind = "muted") {
  els.connectionStatus.textContent = text;
  els.connectionStatus.classList.toggle("is-muted", kind === "muted");
  els.connectionStatus.classList.toggle("is-bad", kind === "bad");
}

function addLog(type, message, isError = false) {
  const entry = document.createElement("div");
  entry.className = `log-entry${isError ? " is-error" : ""}`;
  const time = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  entry.innerHTML = `<b>${type}</b><span>${time} ${escapeHtml(message)}</span>`;
  els.log.prepend(entry);

  while (els.log.childElementCount > 80) {
    els.log.removeChild(els.log.lastElementChild);
  }
}

function $(id) {
  return document.getElementById(id);
}

function logLine(message) {
  addLog("SYS", message);
}

function getDefaultUiScale() {
  return window.matchMedia?.("(max-width: 780px)")?.matches ? "touch" : "standard";
}

function loadUiScale() {
  try {
    const saved = window.localStorage?.getItem(UI_SCALE_STORAGE_KEY);
    return UI_SCALE_VALUES.has(saved) ? saved : getDefaultUiScale();
  } catch {
    return getDefaultUiScale();
  }
}

function setUiScale(scale, persist = true) {
  const normalized = UI_SCALE_VALUES.has(scale) ? scale : "standard";
  document.documentElement.dataset.uiScale = normalized;
  if (els.uiScale) els.uiScale.value = normalized;
  if (persist) {
    try {
      window.localStorage?.setItem(UI_SCALE_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }
  window.requestAnimationFrame(() => {
    resizeCanvas();
    resizeBitCanvas();
  });
}

function setConnected(connected) {
  setConnectedUi(Boolean(connected));
}

function setDfuBootloaderMode(active, kind = "warn") {
  if (active) {
    setConnectionStatus("DFU bootloader mode requested", kind);
  } else {
    setConnectedUi(isConnected());
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedTransportName() {
  return els.transportMode.value === "bluetooth" ? "Bluetooth LE" : "USB Serial";
}

function getActiveTransportName() {
  if (state.transport === "bluetooth") return "Bluetooth LE";
  if (state.transport === "serial") return "USB Serial";
  return getSelectedTransportName();
}

function isConnected() {
  if (state.transport === "serial") return Boolean(state.port);
  if (state.transport === "bluetooth") return Boolean(state.bleDevice?.gatt?.connected);
  return false;
}

function updateTransportControls() {
  const isSerial = els.transportMode.value === "serial";
  const connected = isConnected();
  els.serialOptions.hidden = !isSerial;
  els.transportMode.disabled = connected;
  els.baudRate.disabled = connected || !isSerial;
  updateTransportSupport();
}

function updateTransportSupport() {
  const hasSerial = "serial" in navigator;
  const hasBluetooth = "bluetooth" in navigator;
  const mode = els.transportMode.value;

  if (mode === "bluetooth") {
    els.serialSupport.textContent = hasBluetooth ? "Web Bluetooth ready" : "Web Bluetooth unavailable";
    els.serialSupport.classList.toggle("is-bad", !hasBluetooth);
    els.serialSupport.classList.toggle("is-muted", !hasBluetooth);
    return;
  }

  els.serialSupport.textContent = hasSerial ? "Web Serial ready" : "Web Serial unavailable";
  els.serialSupport.classList.toggle("is-bad", !hasSerial);
  els.serialSupport.classList.toggle("is-muted", !hasSerial);
}

function resetReceiveState() {
  state.decoder = new TextDecoder();
  state.parseBuffer = "";
  state.binaryBuffer = [];
}

function normalizeAdcSource(value) {
  const match = String(value || "").toUpperCase().match(/(?:ADC|AIN)?\s*([023])\b/);
  return match ? `ADC${match[1]}` : null;
}

function getAdcSourceInfo(source = state.adcSource) {
  return ADC_SOURCE_INFO[normalizeAdcSource(source)] || ADC_SOURCE_INFO.ADC2;
}

function getAdcSourceDescription(source = state.adcSource) {
  return getAdcSourceInfo(source).detail;
}

function getValueMode() {
  return els.valueMode?.value === "current" ? "current" : "adc";
}

function getAdcBias(source = state.adcSource) {
  const normalized = normalizeAdcSource(source) || state.adcSource;
  const value = state.adcBias[normalized];
  return Number.isFinite(value) ? value : null;
}

function setAdcBias(source, value, options = {}) {
  const normalized = normalizeAdcSource(source) || state.adcSource;
  const number = Number.parseFloat(value);
  state.adcBias[normalized] = Number.isFinite(number) ? number : null;
  updateValueUi();
  updateStats();
  state.needsDraw = true;
  if (!options.silent && Number.isFinite(number)) {
    addLog("SYS", `Bias ${normalized} = ${number.toFixed(1)}`);
  }
}

function measureBiasFromSamples(options = {}) {
  const source = normalizeAdcSource(options.source) || state.adcSource;
  const candidates = state.samples
    .filter((sample) => {
      const channel = sample.channel || "ADC";
      return channel === "ADC" || channel === "A";
    })
    .filter((sample) => (sample.adcSource || state.adcSource) === source)
    .slice(-ADC_BIAS_SAMPLE_COUNT);

  if (!candidates.length) {
    if (!options.silent) addLog("SYS", `No ${source} ADC/ambient samples for bias`);
    return null;
  }

  const bias = candidates.reduce((sum, sample) => sum + sample.value, 0) / candidates.length;
  setAdcBias(source, bias, { silent: options.silent });
  return bias;
}

function convertAdcSampleValue(sample, value = sample.value) {
  const adcSource = sample.adcSource || state.adcSource;
  const bias = getAdcBias(adcSource);

  if (getValueMode() === "current") {
    return Number.isFinite(bias) ? (value - bias) * ADC_CURRENT_SCALE : value;
  }

  return value;
}

function createViewSample(sample) {
  const channel = normalizeChannel(sample.channel) || "ADC";
  const adcSource = normalizeAdcSource(sample.adcSource) || state.adcSource;
  const valueKind = "raw";
  const bias = getValueMode() === "current" ? getAdcBias(adcSource) : null;
  const normalizedSample = { ...sample, channel, adcSource, valueKind };
  const value = convertAdcSampleValue(normalizedSample);
  return {
    ...sample,
    channel,
    adcSource,
    valueKind,
    deviceValue: sample.value,
    adcCode: sample.value,
    biasCode: bias,
    rawValue: value,
    value,
  };
}

function getValueDescription() {
  const bias = getAdcBias();

  if (getValueMode() === "current") {
    return Number.isFinite(bias) ? `Current | bias ${bias.toFixed(0)}` : "Current | set bias";
  }

  return "ADC code";
}

function updateValueUi() {
  state.valueMode = getValueMode();
  const bias = getAdcBias();
  if (els.biasValue) {
    els.biasValue.value = Number.isFinite(bias) ? String(Math.round(bias)) : "";
  }
  if (els.valueSummary) {
    els.valueSummary.textContent = getValueDescription();
  }
}

function setAdcSource(source, options = {}) {
  const normalized = normalizeAdcSource(source);
  if (!normalized) return;
  const changed = state.adcSource !== normalized;
  state.adcSource = normalized;
  if (changed) {
    state.samples = [];
    state.totalSamples = 0;
    state.latest = null;
    state.bits = [];
    state.totalBits = 0;
    state.bitLanes = {};
    state.bitPlaneCapacity = 0;
  }
  resetNoiseExtractor();
  updateAdcSourceUi(options);
  updateStats();
  updateBitStats();
  state.needsDraw = true;
  state.needsBitDraw = true;
}

function updateAdcSourceUi(options = {}) {
  const info = getAdcSourceInfo();
  const pending = Boolean(options.pending);
  if (els.adcSourceStatus) {
    const bitInfo = getAdcSourceInfo(state.bitAdcSource);
    const label = `${info.label} / ${bitInfo.label}`;
    els.adcSourceStatus.textContent = pending ? `${label} pending` : label;
    els.adcSourceStatus.classList.toggle("is-muted", pending);
  }
  if (els.plotAdcSource && els.plotAdcSource.value !== state.adcSource) {
    els.plotAdcSource.value = state.adcSource;
  }

  document.querySelectorAll("[data-adc-source]").forEach((button) => {
    const active = normalizeAdcSource(button.dataset.adcSource) === state.adcSource;
    button.classList.toggle("is-active", active);
  });
  updateValueUi();
}

function setEncryptionEnabled(enabled, options = {}) {
  const nextEnabled = Boolean(enabled);
  if (state.encryptionEnabled === nextEnabled && !options.force) {
    updateEncryptionUi();
    return;
  }

  state.encryptionEnabled = nextEnabled;
  if (nextEnabled) {
    if (!state.bitMode) {
      setBitMode(true);
    } else {
      resetLiveEncryption();
    }
  } else {
    state.pendingPpg = [];
  }
  updateEncryptionUi();
  state.needsCipherDraw = true;
  addLog("SYS", `ADC encryption ${nextEnabled ? "enabled" : "disabled"}`);
}

function setConnectedUi(connected) {
  els.connectButton.textContent = connected ? "Disconnect" : "Connect";
  updateTransportControls();
  setConnectionStatus(
    connected ? `${getActiveTransportName()} connected` : "Disconnected",
    connected ? "ok" : "muted",
  );
}

function queryDeviceStateSoon() {
  window.setTimeout(async () => {
    if (!isConnected()) return;
    await sendCommand("VER?");
    if (state.adcSource) await sendCommand(state.adcSource);
    await sendCommand("ADC?");
    await sendCommand("RATE?");
  }, 250);
}

async function connectSelectedTransport() {
  if (els.transportMode.value === "bluetooth") {
    await connectBluetooth();
    return;
  }
  await connectSerial();
}

async function disconnectActiveTransport() {
  if (state.transport === "bluetooth" || state.bleDevice) {
    await disconnectBluetooth();
    return;
  }
  await disconnectSerial();
}

async function connectSerial() {
  if (!("serial" in navigator)) {
    addLog("ERR", "Web Serial is not available in this browser", true);
    setConnectionStatus("No Web Serial", "bad");
    return;
  }

  try {
    const baudRate = Number.parseInt(els.baudRate.value, 10);
    state.port = await navigator.serial.requestPort();
    await state.port.open({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
    });

    state.keepReading = true;
    state.transport = "serial";
    resetReceiveState();
    setConnectedUi(true);
    addLog("SYS", `Serial opened at ${baudRate}`);
    readLoop();
    queryDeviceStateSoon();
  } catch (error) {
    addLog("ERR", error.message || error, true);
    try {
      if (state.port) await state.port.close();
    } catch {
      // Ignore cleanup errors after a failed open.
    }
    state.transport = "none";
    state.port = null;
    setConnectedUi(false);
  }
}

async function disconnectSerial() {
  state.keepReading = false;
  window.clearTimeout(state.liveSendTimer);
  state.liveSendTimer = null;

  try {
    if (state.reader) {
      await state.reader.cancel();
    }
  } catch (error) {
    addLog("ERR", error.message || error, true);
  }

  try {
    if (state.writer) {
      state.writer.releaseLock();
      state.writer = null;
    }
  } catch (error) {
    state.writer = null;
    addLog("ERR", error.message || error, true);
  }

  try {
    await state.writeQueue.catch(() => {});
    if (state.port) {
      await state.port.close();
      addLog("SYS", "Serial closed");
    }
  } catch (error) {
    addLog("ERR", error.message || error, true);
  } finally {
    state.transport = "none";
    state.port = null;
    setConnectedUi(false);
  }
}

async function connectBluetooth() {
  if (!("bluetooth" in navigator)) {
    addLog("ERR", "Web Bluetooth is not available in this browser", true);
    setConnectionStatus("No Web Bluetooth", "bad");
    return;
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE_UUID],
    });

    state.bleDevice = device;
    device.addEventListener("gattserverdisconnected", handleBluetoothDisconnected);

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(NUS_SERVICE_UUID);
    const writeCharacteristic = await service.getCharacteristic(NUS_RX_WRITE_UUID);
    const notifyCharacteristic = await service.getCharacteristic(NUS_TX_NOTIFY_UUID);

    await notifyCharacteristic.startNotifications();
    notifyCharacteristic.addEventListener("characteristicvaluechanged", handleBluetoothNotification);

    state.bleServer = server;
    state.bleWriteCharacteristic = writeCharacteristic;
    state.bleNotifyCharacteristic = notifyCharacteristic;
    state.transport = "bluetooth";
    resetReceiveState();
    setConnectedUi(true);
    addLog("SYS", `Bluetooth connected to ${device.name || "NUS device"}`);
    queryDeviceStateSoon();
  } catch (error) {
    addLog("ERR", error.message || error, true);
    await disconnectBluetooth({ silent: true });
    setConnectedUi(false);
  }
}

async function disconnectBluetooth(options = {}) {
  window.clearTimeout(state.liveSendTimer);
  state.liveSendTimer = null;

  try {
    await state.writeQueue.catch(() => {});
    if (state.bleNotifyCharacteristic) {
      state.bleNotifyCharacteristic.removeEventListener(
        "characteristicvaluechanged",
        handleBluetoothNotification,
      );
      try {
        await state.bleNotifyCharacteristic.stopNotifications();
      } catch (error) {
        if (!options.silent) addLog("ERR", error.message || error, true);
      }
    }

    if (state.bleDevice) {
      state.bleDevice.removeEventListener("gattserverdisconnected", handleBluetoothDisconnected);
      if (state.bleDevice.gatt?.connected) {
        state.bleDevice.gatt.disconnect();
      }
    }

    if (!options.silent) addLog("SYS", "Bluetooth closed");
  } catch (error) {
    if (!options.silent) addLog("ERR", error.message || error, true);
  } finally {
    state.bleDevice = null;
    state.bleServer = null;
    state.bleWriteCharacteristic = null;
    state.bleNotifyCharacteristic = null;
    state.transport = "none";
    setConnectedUi(false);
  }
}

function handleBluetoothDisconnected() {
  state.bleDevice = null;
  state.bleServer = null;
  state.bleWriteCharacteristic = null;
  state.bleNotifyCharacteristic = null;
  state.transport = "none";
  setConnectedUi(false);
  addLog("SYS", "Bluetooth disconnected");
}

function handleBluetoothNotification(event) {
  const value = event.target.value;
  const bytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  ingestBytes(bytes, "bluetooth");
}

async function readLoop() {
  while (state.port?.readable && state.keepReading) {
    const reader = state.port.readable.getReader();
    state.reader = reader;
    try {
      while (state.keepReading) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) ingestBytes(value);
      }
    } catch (error) {
      if (state.keepReading) addLog("ERR", error.message || error, true);
    } finally {
      if (state.reader === reader) state.reader = null;
      try {
        reader.releaseLock();
      } catch (error) {
        if (state.keepReading) addLog("ERR", error.message || error, true);
      }
    }
  }
}

function ingestBytes(bytes, source = "serial") {
  if (source === "bluetooth" && !isTextPayload(bytes)) {
    ingestBinarySamples(bytes);
    return;
  }

  const text = state.decoder.decode(bytes, { stream: true });
  ingestText(text);
}

function isTextPayload(bytes) {
  const usefulBytes = [...bytes].filter((byte) => byte !== 0);
  if (!usefulBytes.length) return false;

  return usefulBytes.every((byte) => (
    byte === 9 ||
    byte === 10 ||
    byte === 13 ||
    byte === 32 ||
    byte === 43 ||
    byte === 44 ||
    byte === 45 ||
    byte === 46 ||
    byte === 59 ||
    byte === 58 ||
    byte === 95 ||
    (byte >= 48 && byte <= 57) ||
    (byte >= 65 && byte <= 90) ||
    (byte >= 97 && byte <= 122)
  ));
}

function ingestBinarySamples(bytes) {
  state.binaryBuffer.push(...bytes);

  while (state.binaryBuffer.length >= 2) {
    const low = state.binaryBuffer.shift();
    const high = state.binaryBuffer.shift();
    const value = low | (high << 8);

    if (state.bitMode) {
      addSample(value, "ADC", { adcSource: state.bitAdcSource });
    } else {
      addSample(value);
    }
  }
}

function ingestText(text) {
  state.parseBuffer += text.replace(/\0/g, "").replace(/\r/g, "\n");

  let delimiterIndex = state.parseBuffer.search(/[;\n]/);
  while (delimiterIndex >= 0) {
    const segment = state.parseBuffer.slice(0, delimiterIndex).trim();
    state.parseBuffer = state.parseBuffer.slice(delimiterIndex + 1);
    parseSegment(segment);
    delimiterIndex = state.parseBuffer.search(/[;\n]/);
  }

  if (state.bitMode && /^[01\s,]+$/.test(state.parseBuffer) && /[01]/.test(state.parseBuffer)) {
    parseBitSegment(state.parseBuffer);
    state.parseBuffer = "";
    return;
  }

  if (state.parseBuffer.length > 4096) {
    addLog("ERR", "RX segment too long; dropping partial frame", true);
    state.parseBuffer = "";
    return;
  }

  if (state.parseBuffer.length > 96 && /^[-+0-9.,\s]+$/.test(state.parseBuffer)) {
    const matches = state.parseBuffer.match(/[-+]?\d+(?:\.\d+)?/g) || [];
    matches.slice(0, -1).forEach((value) => addSample(Number(value)));
    state.parseBuffer = matches.at(-1) || "";
  }
}

function parseSegment(segment) {
  if (!segment) return;
  if (parseStatusSegment(segment)) return;

  if (parseTaggedBitSegment(segment)) return;
  if (parseAdcBatchSegment(segment)) return;
  if (parseTaggedSegment(segment)) return;

  if (state.bitMode && parseBitSegment(segment)) return;

  const match = segment.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return;
  const value = Number(match[0]);
  if (Number.isFinite(value)) addSample(value);
}

function normalizeChannel(channel) {
  const key = String(channel || "ADC").trim().toUpperCase();
  if (key === "GREEN") return "G";
  if (key === "IR" || key === "INFRARED") return "I";
  if (key === "RED") return "R";
  if (key === "AMBIENT") return "A";
  if (CHANNEL_ORDER.includes(key)) return key;
  return null;
}

function parseAdcBatchSegment(segment) {
  const match = segment.match(/^ADC([023])B\s*[,=:]\s*(\d+)\s*,\s*(.+)$/i);
  if (!match) return false;

  const adcSource = `ADC${match[1]}`;
  const expectedCount = Number.parseInt(match[2], 10);
  const values = (match[3].match(/[-+]?\d+(?:\.\d+)?/g) || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const limitedValues = Number.isFinite(expectedCount) && expectedCount >= 0
    ? values.slice(0, expectedCount)
    : values;

  limitedValues.forEach((value) => {
    addSample(value, "ADC", { adcSource, valueKind: "raw" });
  });

  state.lastAdc3BatchCount = limitedValues.length;
  state.totalAdc3BatchSamples = (state.totalAdc3BatchSamples || 0) + limitedValues.length;
  if (expectedCount !== limitedValues.length) {
    addLog("RX", `ADC${match[1]}B count ${limitedValues.length}/${expectedCount}`);
  }
  updateEncryptionUi();
  return true;
}

function parseTaggedSegment(segment) {
  const matches = [...segment.matchAll(/\b(ADC[023]?|GREEN|IR|INFRARED|RED|AMBIENT|[AGIR])\b\s*[,=:]\s*([-+]?\d+(?:\.\d+)?)/gi)];
  if (!matches.length) return false;

  let parsed = false;
  matches.forEach((match) => {
    const adcSource = normalizeAdcSource(match[1]);
    const channel = adcSource ? "ADC" : normalizeChannel(match[1]);
    const value = Number(match[2]);
    if (channel && Number.isFinite(value)) {
      addSample(value, channel, { adcSource, valueKind: "raw" });
      parsed = true;
    }
  });
  return parsed;
}

function parseStatusSegment(segment) {
  if (parseFirmwareInfoSegment(segment)) return true;
  if (parseAdcStatusSegment(segment)) return true;
  if (parseRateStatusSegment(segment)) return true;

  if (/^(DFU|PONG)\b/i.test(segment)) {
    addLog("RX", segment);
    return true;
  }

  return false;
}

function parseFirmwareInfoSegment(segment) {
  if (!/^VER\b/i.test(segment)) return false;
  const match = segment.match(/\bFW\s*,\s*([^,\s;]+)/i);
  if (match) {
    state.firmwareVersion = match[1];
  }
  addLog("RX", segment);
  return true;
}

function parseAdcStatusSegment(segment) {
  const dualMatch = segment.match(/^ADC\b/i) && segment.match(/\bPPG\s*[,=:]\s*([023])\b/i);
  if (dualMatch) {
    const bitMatch = segment.match(/\bBIT\s*[,=:]\s*([023])\b/i);
    state.adcSource = `ADC${dualMatch[1]}`;
    state.bitAdcSource = bitMatch ? `ADC${bitMatch[1]}` : "ADC3";
    updateAdcSourceUi();
    updateBitStats();
    updateEncryptionUi();
    addLog("RX", segment);
    return true;
  }

  const match = segment.match(/^ADC\s*[,=:]\s*(?:ACTIVE|SOURCE|SELECTED)\s*[,=:]\s*([023])\b/i);
  if (!match) return false;
  setAdcSource(`ADC${match[1]}`);
  addLog("RX", segment);
  return true;
}

function parseRateStatusSegment(segment) {
  if (!/^RATE\b/i.test(segment)) return false;
  const hzMatch = segment.match(/\bRAW_HZ\s*[,=:]\s*(\d+)\b/i);
  const msMatch = segment.match(/\bRAW_MS\s*[,=:]\s*(\d+)\b/i);
  const adc2HzMatch = segment.match(/\bADC2_HZ\s*[,=:]\s*(\d+)\b/i);
  const adc2FrameMatch = segment.match(/\bADC2_FRAME_MS\s*[,=:]\s*(\d+)\b/i);
  const ppgHzMatch = segment.match(/\bPPG_HZ\s*[,=:]\s*(\d+)\b/i);
  const ppgFrameMatch = segment.match(/\bPPG_FRAME_MS\s*[,=:]\s*(\d+)\b/i);
  const ppgPhaseMatch = segment.match(/\bPPG_PHASE_MS\s*[,=:]\s*(\d+)\b/i);
  const ppgLedOnMatch = segment.match(/\bPPG_LED_ON_MS\s*[,=:]\s*(\d+)\b/i);
  const adc3HzMatch = segment.match(/\bADC3_HZ\s*[,=:]\s*(\d+)\b/i);
  const adc3MsMatch = segment.match(/\bADC3_MS\s*[,=:]\s*(\d+)\b/i);
  const adc3BatchMaxMatch = segment.match(/\bADC3_BATCH_MAX\s*[,=:]\s*(\d+)\b/i);
  const saadcBaseHzMatch = segment.match(/\bSAADC_BASE_HZ\s*[,=:]\s*(\d+)\b/i);
  const saadcOversampleMatch = segment.match(/\bSAADC_OVERSAMPLE\s*[,=:]\s*(\d+)\b/i);
  const hz = hzMatch ? Number.parseInt(hzMatch[1], 10) : null;
  const ms = msMatch ? Number.parseInt(msMatch[1], 10) : null;
  const adc2Hz = adc2HzMatch ? Number.parseInt(adc2HzMatch[1], 10) : null;
  const adc2FrameMs = adc2FrameMatch ? Number.parseInt(adc2FrameMatch[1], 10) : null;
  const ppgHz = ppgHzMatch ? Number.parseInt(ppgHzMatch[1], 10) : null;
  const ppgFrameMs = ppgFrameMatch ? Number.parseInt(ppgFrameMatch[1], 10) : null;
  const ppgPhaseMs = ppgPhaseMatch ? Number.parseInt(ppgPhaseMatch[1], 10) : null;
  const ppgLedOnMs = ppgLedOnMatch ? Number.parseInt(ppgLedOnMatch[1], 10) : null;
  const adc3Hz = adc3HzMatch ? Number.parseInt(adc3HzMatch[1], 10) : null;
  const adc3Ms = adc3MsMatch ? Number.parseInt(adc3MsMatch[1], 10) : null;
  const adc3BatchMax = adc3BatchMaxMatch ? Number.parseInt(adc3BatchMaxMatch[1], 10) : null;
  const saadcBaseHz = saadcBaseHzMatch ? Number.parseInt(saadcBaseHzMatch[1], 10) : null;
  const saadcOversample = saadcOversampleMatch ? Number.parseInt(saadcOversampleMatch[1], 10) : null;
  const normalizedPpgFrameMs = Number.isFinite(adc2FrameMs) && adc2FrameMs > 0
    ? adc2FrameMs
    : Number.isFinite(ppgFrameMs) && ppgFrameMs > 0
    ? ppgFrameMs
    : (Number.isFinite(ppgPhaseMs) && ppgPhaseMs > 0 ? ppgPhaseMs * 4 : null);
  const normalizedPpgHz = Number.isFinite(adc2Hz) && adc2Hz > 0
    ? adc2Hz
    : Number.isFinite(ppgHz) && ppgHz > 0
    ? ppgHz
    : (Number.isFinite(normalizedPpgFrameMs) && normalizedPpgFrameMs > 0
      ? Math.round(1000 / normalizedPpgFrameMs)
      : null);

  setSampleRateUi(normalizedPpgHz ?? hz, normalizedPpgFrameMs ?? ms, { normalizeInput: true });
  setPpgRateUi(normalizedPpgHz, normalizedPpgFrameMs, ppgLedOnMs);
  setAdc3RateUi(adc3Hz, adc3Ms, { normalizeInput: true });
  if (Number.isFinite(adc3BatchMax) && adc3BatchMax > 0) {
    state.adc3BatchMax = adc3BatchMax;
  }
  if (Number.isFinite(saadcBaseHz) && saadcBaseHz > 0) {
    state.saadcBaseHz = saadcBaseHz;
  }
  if (Number.isFinite(saadcOversample)) {
    state.saadcOversample = saadcOversample;
  }
  addLog("RX", segment);
  return true;
}

function parseBitSegment(segment) {
  const compact = segment.replace(/[\s,]+/g, "");
  if (!compact || /[^01]/.test(compact)) return false;
  handleGeneratedBits([...compact].map((bit) => Number(bit)), state.bitAdcSource, "UART bit stream", state.bitGenerationMethod);
  return true;
}

function parseTaggedBitSegment(segment) {
  const matches = [...segment.matchAll(/\b(?:BIT|TRNG|RNG)([023])\b\s*[,=:]\s*([01])/gi)];
  if (!matches.length) return false;

  const groupedBits = new Map();
  matches.forEach((match) => {
    const adcSource = `ADC${match[1]}`;
    const bits = groupedBits.get(adcSource) || [];
    bits.push(Number(match[2]));
    groupedBits.set(adcSource, bits);
  });
  groupedBits.forEach((bits, adcSource) => {
    handleGeneratedBits(bits, adcSource, "UART tagged bits", state.bitGenerationMethod);
  });
  return true;
}

function addSample(value, channel = "ADC", options = {}) {
  if (state.paused) return;

  const normalizedChannel = normalizeChannel(channel) || "ADC";
  const adcSource = normalizeAdcSource(options.adcSource) || state.adcSource;
  if (normalizedChannel === "ADC" && adcSource === state.bitAdcSource) {
    extractLiveBitsFromNoiseSample(value, adcSource);
  }
  if (normalizedChannel === "ADC" && adcSource !== state.adcSource) return;
  const valueKind = options.valueKind || "raw";
  commitSample(value, normalizedChannel, adcSource, valueKind);
}

function commitSample(value, normalizedChannel = "ADC", adcSource = state.adcSource, valueKind = "raw") {
  const sample = {
    t: performance.now(),
    value,
    channel: normalizedChannel || "ADC",
    adcSource: normalizeAdcSource(adcSource) || state.adcSource,
    valueKind,
  };
  state.latest = value;
  state.latestChannel = sample.channel;
  state.samples.push(sample);
  state.totalSamples += 1;

  if (state.samples.length > state.maxSamples) {
    state.samples.splice(0, state.samples.length - state.maxSamples);
  }

  const now = performance.now();
  if (now - state.lastStatsAt > 160) {
    state.lastStatsAt = now;
    updateStats();
  }
  enqueuePpgEncryption(sample);
  state.needsDraw = true;
}

function resetNoiseExtractor() {
  state.noiseBaseline = null;
  state.noiseWarmup = 0;
  state.noisePairBit = null;
  state.noiseExtractors = {};
  state.liveBitExtractors = {};
}

function getSelectedBitMethod() {
  return els.bitMethod?.value || state.bitGenerationMethod || "residual-vn";
}

function getBitMethodLabel(method = state.bitGenerationMethod) {
  if (method === "ma-threshold") return "ADC3 MA threshold";
  if (method === "ma-threshold-vn") return "ADC3 MA threshold VN";
  if (method === "residual-vn") return "ADC3 residual VN";
  if (method === "delta-vn") return "ADC3 delta VN";
  if (method === "lsb") return "ADC3 LSB";
  if (method === "lsb2") return "ADC3 LSB x2";
  if (method === "lsb4") return "ADC3 LSB x4";
  return method || "--";
}

function isMovingAverageBitMethod(method = state.bitGenerationMethod) {
  return method === "ma-threshold" || method === "ma-threshold-vn";
}

function readLiveMaSettings() {
  const windowSize = clampInteger(els.liveMaWindow?.value, 2, 5001, 33);
  const offset = Number.parseFloat(els.liveMaOffset?.value);
  return {
    windowSize,
    offset: Number.isFinite(offset) ? offset : 0,
  };
}

function applyLiveMaSettings(options = {}) {
  const settings = readLiveMaSettings();
  const changed = settings.windowSize !== state.liveMaWindow || settings.offset !== state.liveMaOffset;
  state.liveMaWindow = settings.windowSize;
  state.liveMaOffset = settings.offset;
  if (options.normalize !== false) {
    if (els.liveMaWindow) els.liveMaWindow.value = String(settings.windowSize);
    if (els.liveMaOffset) els.liveMaOffset.value = String(settings.offset);
  }
  if (changed && isMovingAverageBitMethod()) {
    clearBits();
    resetLiveEncryption();
    updateBitStats();
    updateEncryptionUi();
  }
}

function updateLiveMaControls() {
  const show = isMovingAverageBitMethod();
  if (els.liveMaWindowField) els.liveMaWindowField.hidden = !show;
  if (els.liveMaOffsetField) els.liveMaOffsetField.hidden = !show;
}

function setBitGenerationMethod(method = getSelectedBitMethod(), options = {}) {
  state.bitGenerationMethod = method || "residual-vn";
  if (els.bitMethod && els.bitMethod.value !== state.bitGenerationMethod) {
    els.bitMethod.value = state.bitGenerationMethod;
  }
  updateLiveMaControls();
  clearBits();
  resetLiveEncryption();
  if (options.enable && !state.bitMode) {
    setBitMode(true);
  } else {
    updateBitStats();
    updateEncryptionUi();
  }
}

function resetLiveEncryption() {
  state.keyBits = [];
  state.pendingPpg = [];
  state.encryptedPpg = [];
  state.encryptedCount = 0;
  state.droppedPpg = 0;
  state.lastEncrypted = null;
  state.liveBitExtractors = {};
  state.lastAdc3BatchCount = 0;
  state.totalAdc3BatchSamples = 0;
  state.needsCipherDraw = true;
}

function handleGeneratedBits(bits, adcSource, source, method) {
  if (!state.bitMode) return;
  if (method !== state.bitGenerationMethod) return;
  addBits(bits, adcSource, source);
}

function getLiveBitExtractor(method, adcSource) {
  const key = `${method}:${normalizeAdcSource(adcSource) || state.bitAdcSource}`;
  if (!state.liveBitExtractors[key]) {
    state.liveBitExtractors[key] = {
      baseline: null,
      warmup: 0,
      previous: null,
      pairBit: null,
      window: [],
      sum: 0,
    };
  }
  return state.liveBitExtractors[key];
}

function pushVonNeumannBit(rawBit, extractor, adcSource, source, method) {
  if (extractor.pairBit === null) {
    extractor.pairBit = rawBit;
    return;
  }

  const previousBit = extractor.pairBit;
  extractor.pairBit = null;
  if (previousBit === rawBit) return;
  handleGeneratedBits([previousBit === 0 && rawBit === 1 ? 0 : 1], adcSource, source, method);
}

function extractLiveBitsFromNoiseSample(value, adcSource = state.bitAdcSource) {
  const source = normalizeAdcSource(adcSource) || state.bitAdcSource;
  if (source !== state.bitAdcSource || !Number.isFinite(value)) return;
  if (!state.bitMode) return;

  const method = state.bitGenerationMethod;

  if (method === "lsb") {
    handleGeneratedBits([Math.round(value) & 1], source, "ADC3 LSB", method);
    return;
  }
  if (method === "lsb2" || method === "lsb4") {
    const bitCount = method === "lsb4" ? 4 : 2;
    const rounded = Math.round(value);
    const bits = [];
    for (let bitIndex = bitCount - 1; bitIndex >= 0; bitIndex -= 1) {
      bits.push((rounded >> bitIndex) & 1);
    }
    handleGeneratedBits(bits, source, `ADC3 LSB x${bitCount}`, method);
    return;
  }

  const extractor = getLiveBitExtractor(method, source);

  if (isMovingAverageBitMethod(method)) {
    const windowSize = state.liveMaWindow;
    const offset = state.liveMaOffset;
    if (extractor.window.length >= windowSize) {
      const threshold = (extractor.sum / extractor.window.length) + offset;
      const rawBit = value > threshold ? 1 : 0;
      if (method === "ma-threshold-vn") {
        pushVonNeumannBit(rawBit, extractor, source, "ADC3 MA threshold VN", method);
      } else {
        handleGeneratedBits([rawBit], source, "ADC3 MA threshold", method);
      }
    }
    extractor.window.push(value);
    extractor.sum += value;
    if (extractor.window.length > windowSize) {
      extractor.sum -= extractor.window.shift();
    }
    return;
  }

  if (method === "delta-vn") {
    if (extractor.previous === null) {
      extractor.previous = value;
      return;
    }
    const delta = value - extractor.previous;
    extractor.previous = value;
    if (delta === 0) return;
    pushVonNeumannBit(delta > 0 ? 1 : 0, extractor, source, "ADC3 delta VN", method);
    return;
  }

  if (extractor.baseline === null) {
    extractor.baseline = value;
    extractor.warmup = 1;
    return;
  }

  const residual = value - extractor.baseline;
  extractor.baseline += NOISE_BASELINE_ALPHA * residual;
  extractor.warmup += 1;

  if (extractor.warmup < NOISE_WARMUP_SAMPLES || residual === 0) return;
  pushVonNeumannBit(residual > 0 ? 1 : 0, extractor, source, "ADC3 residual VN", method);
}

function bitsToNumber(bits) {
  return bits.reduce((value, bit) => ((value << 1) | (bit ? 1 : 0)), 0);
}

function formatHex(value, width = 4) {
  if (!Number.isFinite(value)) return "--";
  return `0x${Math.max(0, value).toString(16).toUpperCase().padStart(width, "0")}`;
}

function normalizeCipherWidth(value) {
  const width = Number.parseInt(value, 10);
  return CIPHER_WIDTH_OPTIONS.has(width) ? width : DEFAULT_CIPHER_WIDTH_BITS;
}

function getCipherWidthBits() {
  return normalizeCipherWidth(els.cipherWidth?.value ?? state.cipherWidthBits);
}

function getCipherMask(width = state.cipherWidthBits) {
  return (1 << normalizeCipherWidth(width)) - 1;
}

function setCipherWidthBits(width = getCipherWidthBits(), options = {}) {
  const nextWidth = normalizeCipherWidth(width);
  const changed = state.cipherWidthBits !== nextWidth;
  state.cipherWidthBits = nextWidth;
  if (els.cipherWidth && els.cipherWidth.value !== String(nextWidth)) {
    els.cipherWidth.value = String(nextWidth);
  }
  if (changed && options.reset !== false) {
    resetLiveEncryption();
  }
  updateEncryptionUi();
}

function estimateRecentRate(records, windowMs = 5000) {
  const now = performance.now();
  const recent = records.filter((record) => Number.isFinite(record.t) && now - record.t <= windowMs);
  if (recent.length < 2) return 0;
  const elapsed = Math.max(0.001, (recent.at(-1).t - recent[0].t) / 1000);
  return (recent.length - 1) / elapsed;
}

function getRecentSignalRateHz() {
  return estimateRecentRate(
    state.samples.filter((sample) => (normalizeAdcSource(sample.adcSource) || state.adcSource) === state.adcSource),
  );
}

function getRecentKeyBitRate() {
  return estimateRecentRate(state.bits);
}

function enqueuePpgEncryption(sample) {
  if (!state.encryptionEnabled) return;
  if (!Number.isFinite(sample.value)) return;
  const adcSource = normalizeAdcSource(sample.adcSource) || state.adcSource;
  if (adcSource !== state.adcSource) return;
  const adcCode = clampInteger(sample.value, 0, 16383, 0);
  state.pendingPpg.push({
    t: sample.t,
    channel: sample.channel,
    adcSource,
    adcCode,
  });
  if (state.pendingPpg.length > MAX_PENDING_PPG) {
    state.pendingPpg.shift();
    state.droppedPpg += 1;
  }
  processEncryptionQueue();
}

function processEncryptionQueue() {
  const width = normalizeCipherWidth(state.cipherWidthBits);
  const mask = getCipherMask(width);
  while (state.pendingPpg.length && state.keyBits.length >= width) {
    const sample = state.pendingPpg.shift();
    const keyBits = state.keyBits.splice(0, width);
    const key = bitsToNumber(keyBits);
    const plainMasked = sample.adcCode & mask;
    const cipherMasked = plainMasked ^ key;
    const cipher = (sample.adcCode & ~mask) | cipherMasked;
    const record = {
      ...sample,
      cipherWidthBits: width,
      plainMasked,
      key,
      keyBits: keyBits.join(""),
      cipherMasked,
      cipher,
      method: state.bitGenerationMethod,
      bitSource: state.bitAdcSource,
    };
    state.encryptedPpg.push(record);
    state.encryptedCount += 1;
    state.lastEncrypted = record;
    if (state.encryptedPpg.length > MAX_ENCRYPTED_PPG) {
      state.encryptedPpg.splice(0, state.encryptedPpg.length - MAX_ENCRYPTED_PPG);
    }
    state.needsCipherDraw = true;
  }
  updateEncryptionUi();
}

function updateEncryptionUi() {
  if (els.encryptionToggle) {
    els.encryptionToggle.checked = state.encryptionEnabled;
  }
  if (els.keyBitCount) els.keyBitCount.textContent = String(state.keyBits.length);
  if (els.encryptionPending) els.encryptionPending.textContent = String(state.pendingPpg.length);
  if (els.encryptionCount) els.encryptionCount.textContent = String(state.encryptedCount);
  if (els.encryptionStatus) {
    const dropped = state.droppedPpg ? ` | dropped ${state.droppedPpg}` : "";
    const encryptionText = state.encryptionEnabled ? "encryption on" : "encryption off";
    const modeText = state.bitMode ? "extracting" : "extraction off";
    const signalRate = getRecentSignalRateHz();
    const requiredKeyRate = signalRate * state.cipherWidthBits;
    const keyRate = getRecentKeyBitRate();
    const rateText = state.encryptionEnabled
      ? ` | key ${keyRate.toFixed(0)}/${requiredKeyRate.toFixed(0)} bps`
      : "";
    const pendingReason = state.encryptionEnabled && state.pendingPpg.length && requiredKeyRate > 0 && keyRate < requiredKeyRate
      ? " | key slow"
      : "";
    const methodParams = isMovingAverageBitMethod()
      ? ` | window ${state.liveMaWindow}, offset ${state.liveMaOffset}`
      : "";
    const batchText = state.totalAdc3BatchSamples
      ? ` | ADC3B ${state.lastAdc3BatchCount}/${state.totalAdc3BatchSamples}`
      : "";
    els.encryptionStatus.textContent = `${getBitMethodLabel()}${methodParams} | ${state.cipherWidthBits}-bit cipher | ${encryptionText} | ${modeText}${batchText}${rateText} | queue ${state.keyBits.length} bits | pending ${state.pendingPpg.length}${pendingReason}${dropped}`;
  }

  const latest = state.lastEncrypted;
  if (els.encryptionPlain) els.encryptionPlain.textContent = latest ? String(latest.adcCode) : "--";
  if (els.encryptionKey) {
    const keyHexWidth = latest ? Math.ceil((latest.cipherWidthBits || state.cipherWidthBits) / 4) : 4;
    els.encryptionKey.textContent = latest ? formatHex(latest.key, keyHexWidth) : "--";
  }
  if (els.encryptionCipher) els.encryptionCipher.textContent = latest ? formatHex(latest.cipher) : "--";
  if (els.encryptionChannel) {
    els.encryptionChannel.textContent = latest
      ? `${latest.adcSource} ${CHANNEL_LABELS[latest.channel] || latest.channel}`
      : "--";
  }
}

function createBitLane(capacity = state.bitPlaneCapacity || 0) {
  return {
    plane: new Array(capacity).fill(null),
    index: 0,
    filled: 0,
    cycles: 0,
    total: 0,
  };
}

function ensureBitLane(source) {
  const normalized = normalizeAdcSource(source) || state.adcSource;
  if (!state.bitLanes[normalized]) {
    state.bitLanes[normalized] = createBitLane();
  }
  return state.bitLanes[normalized];
}

function getBitSourceOrder() {
  return [state.bitAdcSource];
}

function getBitLanes() {
  return getBitSourceOrder().map((source) => [source, ensureBitLane(source)]);
}

function addBits(bits, adcSource = state.bitAdcSource, source = getBitMethodLabel()) {
  if (state.paused || !bits.length) return;

  const normalizedSource = normalizeAdcSource(adcSource) || state.bitAdcSource;
  if (normalizedSource !== state.bitAdcSource) return;
  const normalizedBits = bits.map((bit) => (bit ? 1 : 0));
  const now = performance.now();
  state.bits.push(...normalizedBits.map((bit) => ({
    t: now,
    bit,
    adcSource: normalizedSource,
    source,
  })));
  state.totalBits += normalizedBits.length;
  state.bitSource = source;
  state.keyBits.push(...normalizedBits);
  if (state.keyBits.length > MAX_KEY_BITS) {
    state.keyBits.splice(0, state.keyBits.length - MAX_KEY_BITS);
  }

  if (state.bits.length > state.maxBits) {
    state.bits.splice(0, state.bits.length - state.maxBits);
  }

  updateBitModeUi();
  ensureBitPlaneCapacity();
  normalizedBits.forEach((bit) => writeBitToPlane(bit, normalizedSource));
  processEncryptionQueue();
  updateBitStats();
  state.needsBitDraw = true;
  window.requestAnimationFrame(resizeBitCanvas);
}

function updateStats() {
  const displaySamples = getDisplaySamples();
  const values = displaySamples.map((sample) => sample.value);
  if (!values.length) {
    els.latestValue.textContent = "--";
    els.minValue.textContent = "--";
    els.maxValue.textContent = "--";
    els.avgValue.textContent = "--";
    els.rateValue.textContent = "--";
    els.sampleCount.textContent = String(state.totalSamples);
    els.plotCaption.textContent = `Waiting for samples | ${getAdcPlotDescription()} | ${getSampleRateDescription()} | ${getValueDescription()} | ${getFilterDescription()}`;
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const first = displaySamples[0];
  const last = displaySamples[displaySamples.length - 1];
  const elapsed = Math.max(0.001, (last.t - first.t) / 1000);
  const rate = displaySamples.length > 1 ? (displaySamples.length - 1) / elapsed : 0;

  const latest = displaySamples.at(-1);
  els.latestValue.textContent = formatNumber(latest.value);
  els.minValue.textContent = formatNumber(min);
  els.maxValue.textContent = formatNumber(max);
  els.avgValue.textContent = formatNumber(avg);
  els.rateValue.textContent = `${rate.toFixed(rate >= 10 ? 0 : 1)} Hz`;
  els.sampleCount.textContent = String(state.totalSamples);
  els.plotCaption.textContent = `${values.length} samples in view | ${getAdcPlotDescription()} | ${getSampleRateDescription()} | ${getValueDescription()} | ${getFilterDescription()}`;
}

function setBitMode(enabled) {
  state.bitMode = enabled;
  state.parseBuffer = "";
  resetNoiseExtractor();
  resetLiveEncryption();
  if (enabled) {
    state.bits = [];
    state.totalBits = 0;
    state.bitLanes = {};
    state.bitPlaneCapacity = 0;
  }
  updateBitModeUi();
  updateBitStats();
  updateEncryptionUi();
  addLog("SYS", `Web bit extraction ${enabled ? "enabled" : "disabled"}`);

  if (enabled) {
    state.needsBitDraw = true;
    window.requestAnimationFrame(resizeBitCanvas);
  }
}

function updateBitModeUi() {
  els.bitModeButton.classList.toggle("is-active", state.bitMode);
  els.bitModeStatus.textContent = state.bitMode ? "Bit extraction on" : "Bit extraction off";
  els.bitModeStatus.classList.toggle("is-muted", !state.bitMode);
  els.bitPanel.hidden = !state.bitMode && state.bits.length === 0;
}

function updateBitStats() {
  const lanes = getBitLanes();
  const planeBits = lanes.flatMap(([, lane]) => lane.plane.filter((bit) => bit === 0 || bit === 1));
  const ones = planeBits.reduce((sum, bit) => sum + bit, 0);
  const zeros = planeBits.length - ones;
  const ratio = planeBits.length ? ones / planeBits.length : null;
  const capacity = (state.bitPlaneCapacity || getBitPlaneGeometry().capacity) * lanes.length;
  const source = getBitMethodLabel();

  const filled = lanes.reduce((sum, [, lane]) => sum + lane.filled, 0);
  els.bitCount.textContent = `${filled}/${capacity}`;
  els.oneCount.textContent = String(ones);
  els.zeroCount.textContent = String(zeros);
  els.onesRatio.textContent = ratio === null ? "--" : ratio.toFixed(4);
  els.bitCaption.textContent = planeBits.length
    ? `${source} | ${getAdcSourceInfo(state.bitAdcSource).label} | plane ${state.bitColumns}x${state.bitRows} | saved ${state.bits.length}/${state.maxBits} | total ${state.totalBits}`
    : `Waiting for ${source} bits | plane ${state.bitColumns}x${state.bitRows} | saved ${state.bits.length}/${state.maxBits}`;
  updateBitModeUi();
  updateEncryptionUi();
}

function getBitColumns() {
  return clampInteger(els.bitColumns?.value, 8, 2048, 128);
}

function getBitRows() {
  return clampInteger(els.bitRows?.value, 8, 1024, 128);
}

function applyBitMapSettings(options = {}) {
  const columns = getBitColumns();
  const rows = getBitRows();
  const historyLimit = clampInteger(els.bitHistoryLimit?.value, 100, 1000000, 32768);
  const geometryChanged = columns !== state.bitColumns || rows !== state.bitRows;

  state.bitColumns = columns;
  state.bitRows = rows;
  state.maxBits = historyLimit;

  if (options.normalize !== false) {
    if (els.bitColumns) els.bitColumns.value = String(columns);
    if (els.bitRows) els.bitRows.value = String(rows);
    if (els.bitHistoryLimit) els.bitHistoryLimit.value = String(historyLimit);
  }

  if (state.bits.length > state.maxBits) {
    state.bits.splice(0, state.bits.length - state.maxBits);
  }

  if (geometryChanged) {
    state.bitLanes = {};
    state.bitPlaneCapacity = 0;
    ensureBitPlaneCapacity();
    state.needsBitDraw = true;
  }

  updateBitStats();
}

function getBitPlaneGeometry() {
  const columns = getBitColumns();
  const rows = getBitRows();
  const rect = els.bitCanvas.getBoundingClientRect();
  const width = bitMap.width || Math.floor(rect.width);
  const height = bitMap.height || Math.floor(rect.height);
  const laneHeight = Math.max(80, Math.floor(height / Math.max(1, getBitSourceOrder().length)));
  const labelHeight = 22;

  if (!width || !height) {
    return { columns, rows, cell: 2, capacity: columns * rows, laneHeight, labelHeight };
  }

  const usableHeight = Math.max(1, laneHeight - labelHeight);
  const cell = Math.max(0.1, Math.min(width / columns, usableHeight / rows));
  return { columns, rows, cell, capacity: columns * rows, laneHeight, labelHeight };
}

function ensureBitPlaneCapacity() {
  const { capacity } = getBitPlaneGeometry();
  if (capacity <= 0 || state.bitPlaneCapacity === capacity) return;

  state.bitPlaneCapacity = capacity;
  getBitSourceOrder().forEach((source) => {
    state.bitLanes[source] = createBitLane(capacity);
  });
}

function writeBitToPlane(bit, adcSource = state.adcSource) {
  ensureBitPlaneCapacity();
  if (!state.bitPlaneCapacity) return;

  const lane = ensureBitLane(adcSource);
  if (lane.index === 0 && lane.filled === state.bitPlaneCapacity) {
    lane.plane.fill(null);
    lane.filled = 0;
    lane.cycles += 1;
  }

  lane.plane[lane.index] = bit ? 1 : 0;
  lane.index += 1;
  lane.filled = Math.min(lane.filled + 1, state.bitPlaneCapacity);
  lane.total += 1;

  if (lane.index >= state.bitPlaneCapacity) {
    lane.index = 0;
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(3);
}

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function applyWindowSizeInput(normalize = true) {
  const rawValue = String(els.windowSize?.value ?? "").trim();
  if (!rawValue) return;

  const nextMaxSamples = clampInteger(
    rawValue,
    MIN_MAX_SAMPLES,
    MAX_MAX_SAMPLES,
    DEFAULT_MAX_SAMPLES,
  );
  state.maxSamples = nextMaxSamples;
  if (normalize && els.windowSize) {
    els.windowSize.value = String(nextMaxSamples);
  }
  if (state.samples.length > state.maxSamples) {
    state.samples.splice(0, state.samples.length - state.maxSamples);
  }
  updateStats();
  state.needsDraw = true;
}

function clampSampleRateHz(value) {
  return clampInteger(value, MIN_SAMPLE_RATE_HZ, MAX_SAMPLE_RATE_HZ, DEFAULT_SAMPLE_RATE_HZ);
}

function clampAdc3RateHz(value) {
  return clampInteger(value, MIN_ADC3_RATE_HZ, MAX_ADC3_RATE_HZ, DEFAULT_ADC3_RATE_HZ);
}

function rateHzToIntervalMs(rateHz) {
  return Math.max(1, Math.round(1000 / clampSampleRateHz(rateHz)));
}

function adc3RateHzToIntervalMs(rateHz) {
  return Math.max(1, Math.round(1000 / clampAdc3RateHz(rateHz)));
}

function setSampleRateUi(rateHz, intervalMs = null, options = {}) {
  const nextRate = clampSampleRateHz(rateHz ?? state.sampleRateHz);
  const nextInterval = Number.isFinite(intervalMs) && intervalMs > 0
    ? Math.max(1, Math.round(intervalMs))
    : rateHzToIntervalMs(nextRate);
  state.sampleIntervalMs = nextInterval;
  state.sampleRateHz = Math.max(1, Math.round(1000 / nextInterval));

  if (options.normalizeInput !== false && els.sampleRate) {
    els.sampleRate.value = String(state.sampleRateHz);
  }
}

function setPpgRateUi(rateHz = null, frameMs = null, ledOnMs = null) {
  const parsedRate = Number.parseInt(rateHz, 10);
  const parsedFrameMs = Number.parseInt(frameMs, 10);
  const parsedLedOnMs = Number.parseInt(ledOnMs, 10);
  if (Number.isFinite(parsedRate) && parsedRate > 0) {
    state.ppgRateHz = parsedRate;
    state.ppgSampleIntervalMs = Number.isFinite(parsedFrameMs) && parsedFrameMs > 0
      ? Math.max(1, parsedFrameMs)
      : Math.max(1, Math.round(1000 / parsedRate));
  } else if (Number.isFinite(parsedFrameMs) && parsedFrameMs > 0) {
    state.ppgSampleIntervalMs = Math.max(1, parsedFrameMs);
    state.ppgRateHz = Math.max(1, Math.round(1000 / state.ppgSampleIntervalMs));
  }
  if (Number.isFinite(parsedLedOnMs) && parsedLedOnMs > 0) {
    state.ppgLedOnMs = parsedLedOnMs;
  }
}

function setAdc3RateUi(rateHz = null, intervalMs = null, options = {}) {
  const parsedRate = Number.parseInt(rateHz, 10);
  const parsedIntervalMs = Number.parseInt(intervalMs, 10);
  if (Number.isFinite(parsedRate) && parsedRate > 0) {
    state.adc3RateHz = parsedRate;
    state.adc3SampleIntervalMs = Number.isFinite(parsedIntervalMs) && parsedIntervalMs > 0
      ? Math.max(1, parsedIntervalMs)
      : adc3RateHzToIntervalMs(parsedRate);
  } else if (Number.isFinite(parsedIntervalMs) && parsedIntervalMs > 0) {
    state.adc3SampleIntervalMs = Math.max(1, parsedIntervalMs);
    state.adc3RateHz = Math.max(1, Math.round(1000 / state.adc3SampleIntervalMs));
  }

  if (options.normalizeInput !== false && els.adc3Rate) {
    els.adc3Rate.value = String(state.adc3RateHz);
  }
}

function applySampleRateInput(normalize = false) {
  const rawValue = String(els.sampleRate?.value ?? "").trim();
  if (!rawValue) return;
  const nextRate = clampSampleRateHz(rawValue);
  setSampleRateUi(nextRate, null, { normalizeInput: normalize });
}

function applyAdc3RateInput(normalize = false) {
  const rawValue = String(els.adc3Rate?.value ?? "").trim();
  if (!rawValue) return;
  const nextRate = clampAdc3RateHz(rawValue);
  setAdc3RateUi(nextRate, null, { normalizeInput: normalize });
}

async function sendSampleRateCommand() {
  applySampleRateInput(true);
  await sendCommand(`ADC2RATE${state.sampleRateHz}`);
}

async function sendAdc3RateCommand() {
  applyAdc3RateInput(true);
  await sendCommand(`ADC3RATE${state.adc3RateHz}`);
}

function clampPositive(value, fallback) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number;
}

function getFilterSettings() {
  const mode = els.filterMode.value;
  const windowSize = clampInteger(els.filterWindow.value, 2, 501, 9);
  const highCutoff = clampPositive(els.highCutoff.value, 0.5);
  let lowCutoff = clampPositive(els.lowCutoff.value, 8);

  if (mode === "band-pass" && lowCutoff <= highCutoff) {
    lowCutoff = highCutoff + 0.01;
  }

  return { mode, windowSize, highCutoff, lowCutoff };
}

function formatHz(value) {
  if (!Number.isFinite(value)) return "--";
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

function getFilterDescription(settings = getFilterSettings()) {
  if (settings.mode === "moving-average") return `Moving avg ${settings.windowSize} samples`;
  if (settings.mode === "low-pass") return `LP ${formatHz(settings.lowCutoff)} Hz`;
  if (settings.mode === "high-pass") return `HP ${formatHz(settings.highCutoff)} Hz`;
  if (settings.mode === "band-pass") {
    return `BP ${formatHz(settings.highCutoff)}-${formatHz(settings.lowCutoff)} Hz`;
  }
  return "Raw ADC";
}

function getSampleRateDescription() {
  return `ADC2 pulse ${state.ppgRateHz} Hz | ADC3 noise ${state.adc3RateHz} Hz | LED ${state.ppgLedOnMs} ms | SAADC base ${state.saadcBaseHz} Hz | OS ${state.saadcOversample}`;
}

function getSelectedAdcPlotSources() {
  return [state.adcSource];
}

function getSamplesForAdcSource(samples = state.samples, sources = getSelectedAdcPlotSources()) {
  if (!sources.length) return [];
  const selected = new Set(sources);
  return samples.filter((sample) => selected.has(sample.adcSource || state.adcSource));
}

function getAdcPlotDescription() {
  return getAdcSourceInfo(state.adcSource).label;
}

function getSeriesLabel(series) {
  return ADC_SOURCE_INFO[series]?.label || CHANNEL_LABELS[series] || series;
}

function getSeriesColor(series) {
  return ADC_SOURCE_COLORS[series] || CHANNEL_COLORS[series] || CHANNEL_COLORS.ADC;
}

function updateFilterUi() {
  const mode = els.filterMode.value;
  els.filterWindowField.hidden = mode !== "moving-average";
  els.highCutoffField.hidden = mode !== "high-pass" && mode !== "band-pass";
  els.lowCutoffField.hidden = mode !== "low-pass" && mode !== "band-pass";
  updateValueUi();
  els.filterSummary.textContent = getFilterDescription();
}

function getDisplaySamples() {
  const settings = getFilterSettings();
  const samples = getSamplesForAdcSource()
    .map(createViewSample)
    .filter((sample) => Number.isFinite(sample.value));
  if (settings.mode === "raw") {
    return samples;
  }

  const filteredValues = applyFilter(samples, settings);
  return samples.map((sample, index) => ({
    t: sample.t,
    channel: sample.channel || "ADC",
    adcSource: sample.adcSource || state.adcSource,
    valueKind: sample.valueKind,
    deviceValue: sample.deviceValue,
    adcCode: sample.adcCode,
    biasCode: sample.biasCode,
    rawValue: sample.value,
    value: filteredValues[index],
  }));
}

function applyFilter(samples, settings) {
  const values = samples.map((sample) => sample.value);
  if (values.length < 2) return values;

  if (settings.mode === "moving-average") {
    return applyMovingAverage(values, settings.windowSize);
  }
  if (settings.mode === "low-pass") {
    return applyLowPass(samples, values, settings.lowCutoff);
  }
  if (settings.mode === "high-pass") {
    return applyHighPass(samples, values, settings.highCutoff);
  }
  if (settings.mode === "band-pass") {
    const highPassed = applyHighPass(samples, values, settings.highCutoff);
    return applyLowPass(samples, highPassed, settings.lowCutoff);
  }
  return values;
}

function applyMovingAverage(values, windowSize) {
  const filtered = [];
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= windowSize) sum -= values[index - windowSize];
    filtered.push(sum / Math.min(index + 1, windowSize));
  }
  return filtered;
}

function applyLowPass(samples, values, cutoffHz) {
  const filtered = [values[0]];
  const rc = 1 / (2 * Math.PI * cutoffHz);
  let previous = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const dt = getDeltaSeconds(samples, index);
    const alpha = dt / (rc + dt);
    previous += alpha * (values[index] - previous);
    filtered.push(previous);
  }
  return filtered;
}

function applyHighPass(samples, values, cutoffHz) {
  const filtered = [0];
  const rc = 1 / (2 * Math.PI * cutoffHz);
  let previousOutput = 0;
  let previousInput = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const dt = getDeltaSeconds(samples, index);
    const alpha = rc / (rc + dt);
    previousOutput = alpha * (previousOutput + values[index] - previousInput);
    previousInput = values[index];
    filtered.push(previousOutput);
  }
  return filtered;
}

function getDeltaSeconds(samples, index) {
  const dt = (samples[index].t - samples[index - 1].t) / 1000;
  return Number.isFinite(dt) && dt > 0 ? dt : 0.001;
}

async function sendCommand(value) {
  const command = String(value).trim();
  if (!command) return;
  const payload = encoder.encode(`${command}\r`);

  if (state.transport === "serial" && state.port?.writable) {
    state.writeQueue = state.writeQueue
      .catch(() => {})
      .then(async () => {
        let writer = null;
        try {
          if (!state.port?.writable) {
            addLog("TX", `${command} (not connected)`);
            return;
          }
          writer = state.port.writable.getWriter();
          state.writer = writer;
          await writer.write(payload);
          addLog("TX", command);
        } catch (error) {
          addLog("ERR", error.message || error, true);
        } finally {
          if (writer) {
            try {
              writer.releaseLock();
              if (state.writer === writer) state.writer = null;
            } catch (error) {
              addLog("ERR", error.message || error, true);
            }
          }
        }
      });
    await state.writeQueue;
  } else if (state.transport === "bluetooth" && state.bleWriteCharacteristic) {
    state.writeQueue = state.writeQueue
      .catch(() => {})
      .then(async () => {
        try {
          if (!state.bleWriteCharacteristic || !state.bleDevice?.gatt?.connected) {
            addLog("TX", `${command} (not connected)`);
            return;
          }
          await writeBluetoothPayload(payload);
          addLog("TX", `${command} (BLE)`);
        } catch (error) {
          addLog("ERR", error.message || error, true);
        }
      });
    await state.writeQueue;
  } else {
    addLog("TX", `${command} (not connected)`);
  }
}

async function writeBluetoothPayload(payload) {
  const characteristic = state.bleWriteCharacteristic;
  if (!characteristic) throw new Error("Bluetooth write characteristic is not ready");

  if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
    await characteristic.writeValueWithoutResponse(payload);
    return;
  }
  if (characteristic.writeValueWithResponse) {
    await characteristic.writeValueWithResponse(payload);
    return;
  }
  await characteristic.writeValue(payload);
}

async function toggleBitModeCommand() {
  setBitMode(!state.bitMode);
}

function applyPpgCommandPreset(command) {
  if (command === "7769") {
    els.filterMode.value = "raw";
  } else if (command === "7761") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
  } else if (command === "7762") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
  } else if (command === "7763") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
  } else if (command === "7764" || command === "7777") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
  } else {
    return;
  }

  updateFilterUi();
  updateStats();
  state.needsDraw = true;
}

function clearSamples() {
  state.samples = [];
  state.totalSamples = 0;
  state.latest = null;
  resetNoiseExtractor();
  updateStats();
  state.needsDraw = true;
  drawPlot();
}

function exportCsv() {
  if (!state.samples.length) {
    addLog("SYS", "No samples to export");
    return;
  }

  const start = state.samples[0].t;
  const settings = getFilterSettings();
  const displaySamples = getDisplaySamples();
  const currentMode = getValueMode() === "current";
  const rows = currentMode
    ? (settings.mode === "raw"
      ? ["time_ms,channel,adc_input,adc_code,bias_code,current_value"]
      : ["time_ms,channel,adc_input,adc_code,bias_code,raw_current,filtered_current"])
    : (settings.mode === "raw"
      ? ["time_ms,channel,adc_input,value"]
      : ["time_ms,channel,adc_input,raw_value,filtered_value"]);
  displaySamples.forEach((sample) => {
    const time = (sample.t - start).toFixed(3);
    const adcSource = sample.adcSource || state.adcSource;
    if (currentMode) {
      const adcCode = Number.isFinite(sample.adcCode) ? sample.adcCode : "";
      const biasCode = Number.isFinite(sample.biasCode) ? sample.biasCode : "";
      if (settings.mode === "raw") {
        rows.push(`${time},${sample.channel || "ADC"},${adcSource},${adcCode},${biasCode},${sample.value}`);
      } else {
        rows.push(`${time},${sample.channel || "ADC"},${adcSource},${adcCode},${biasCode},${sample.rawValue},${sample.value}`);
      }
    } else if (settings.mode === "raw") {
      rows.push(`${time},${sample.channel || "ADC"},${adcSource},${sample.value}`);
    } else {
      rows.push(`${time},${sample.channel || "ADC"},${adcSource},${sample.rawValue},${sample.value}`);
    }
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adc_signal_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${displaySamples.length} samples`);
}

function exportCipherCsv() {
  if (!state.encryptedPpg.length) {
    addLog("SYS", "No cipher samples to export");
    return;
  }

  const start = state.encryptedPpg[0]?.t || performance.now();
  const rows = [
    "index,time_ms,channel,adc_input,cipher_width_bits,plain_adc,plain_masked,key_bits,key_dec,key_hex,cipher_masked,cipher_dec,cipher_hex,method,bit_source",
  ];
  state.encryptedPpg.forEach((entry, index) => {
    const keyHexWidth = Math.ceil((entry.cipherWidthBits || state.cipherWidthBits) / 4);
    rows.push([
      index,
      (entry.t - start).toFixed(3),
      csvCell(entry.channel),
      csvCell(entry.adcSource),
      entry.cipherWidthBits || state.cipherWidthBits,
      entry.adcCode,
      entry.plainMasked,
      csvCell(entry.keyBits || ""),
      entry.key,
      csvCell(formatHex(entry.key, keyHexWidth)),
      entry.cipherMasked,
      entry.cipher,
      csvCell(formatHex(entry.cipher)),
      csvCell(entry.method),
      csvCell(entry.bitSource),
    ].join(","));
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adc_cipher_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${state.encryptedPpg.length} cipher samples`);
}

function clearBits() {
  state.bits = [];
  state.totalBits = 0;
  state.bitLanes = {};
  state.bitPlaneCapacity = 0;
  state.bitSource = getBitMethodLabel();
  state.keyBits = [];
  state.pendingPpg = [];
  state.encryptedPpg = [];
  state.encryptedCount = 0;
  state.droppedPpg = 0;
  state.lastEncrypted = null;
  ensureBitPlaneCapacity();
  updateBitStats();
  updateEncryptionUi();
  state.needsBitDraw = true;
  state.needsCipherDraw = true;
  drawBitMap();
  drawCipherPlot();
}

function exportBitsCsv() {
  if (!state.bits.length) {
    addLog("SYS", "No bits to export");
    return;
  }

  const start = state.bits[0]?.t || performance.now();
  const rows = ["index,time_ms,adc_input,source,bit"];
  state.bits.forEach((entry, index) => {
    rows.push(`${index},${(entry.t - start).toFixed(3)},${entry.adcSource},${entry.source},${entry.bit}`);
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ppg_bits_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${state.bits.length} bits`);
}

function setActiveView(viewId) {
  const target = viewId === "noiseView" ? "noiseView" : "liveView";
  [els.liveView, els.noiseView].forEach((view) => {
    if (view) view.hidden = view.id !== target;
  });
  els.viewTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === target);
  });
  window.requestAnimationFrame(() => {
    resizeCanvas();
    resizeBitCanvas();
    resizeNoiseBitCanvas();
  });
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (ch === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function detectDelimiter(lines, requested) {
  if (requested === "tab") return "\t";
  if (requested && requested !== "auto") return requested;
  const sample = lines.find((line) => line.trim()) || "";
  const options = [",", "\t", ";"];
  return options
    .map((delimiter) => ({ delimiter, count: splitCsvLine(sample, delimiter).length }))
    .sort((left, right) => right.count - left.count)[0]?.delimiter || ",";
}

function parseNumberCell(value) {
  const text = String(value || "").trim();
  if (!text) return NaN;
  const normalized = text.replace(/,/g, "");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function parseCsvText(text, delimiterMode) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length);
  const delimiter = detectDelimiter(lines, delimiterMode);
  const rows = lines.map((line) => splitCsvLine(line, delimiter));
  if (!rows.length) return { headers: [], rows: [], delimiter };

  const first = rows[0];
  const firstNumeric = first.filter((cell) => Number.isFinite(parseNumberCell(cell))).length;
  const hasHeader = firstNumeric < Math.max(1, Math.ceil(first.length / 2));
  const headers = hasHeader
    ? first.map((cell, index) => cell || `Column ${index + 1}`)
    : first.map((_, index) => `Column ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return { headers, rows: dataRows, delimiter };
}

function populateNoiseColumns(table) {
  els.noiseColumn.innerHTML = "";
  if (!table?.headers?.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Load CSV";
    els.noiseColumn.append(option);
    els.noiseColumn.disabled = true;
    return;
  }

  table.headers.forEach((header, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${index + 1}: ${header}`;
    els.noiseColumn.append(option);
  });
  els.noiseColumn.disabled = false;
}

function formatDelimiter(delimiter) {
  if (delimiter === "\t") return "tab";
  if (delimiter === " ") return "space";
  return delimiter || "unknown";
}

function renderNoisePreview() {
  const table = state.noiseTable;
  const selectedColumn = Number.parseInt(els.noiseColumn.value, 10);
  if (!table?.headers?.length || !table.rows?.length) {
    if (els.noisePreviewCaption) {
      els.noisePreviewCaption.textContent = "Load CSV to confirm delimiter and data column";
    }
    if (els.noisePreviewHead) {
      els.noisePreviewHead.innerHTML = "<tr><th>No CSV</th></tr>";
    }
    if (els.noisePreviewBody) {
      els.noisePreviewBody.innerHTML = "<tr><td>Load CSV</td></tr>";
    }
    return;
  }

  const maxRows = 12;
  const maxColumns = 8;
  const columnIndexes = table.headers.map((_, index) => index).slice(0, maxColumns);
  if (Number.isInteger(selectedColumn) && selectedColumn >= maxColumns && selectedColumn < table.headers.length) {
    columnIndexes[columnIndexes.length - 1] = selectedColumn;
  }

  const columnLabel = Number.isInteger(selectedColumn)
    ? `${selectedColumn + 1}: ${table.headers[selectedColumn] || `Column ${selectedColumn + 1}`}`
    : "none";
  if (els.noisePreviewCaption) {
    els.noisePreviewCaption.textContent =
      `delimiter=${formatDelimiter(table.delimiter)} | data column=${columnLabel} | first ${Math.min(maxRows, table.rows.length)} rows`;
  }

  if (els.noisePreviewHead) {
    const headCells = [
      `<th>Row</th>`,
      ...columnIndexes.map((columnIndex) => (
        `<th class="${columnIndex === selectedColumn ? "is-selected-column" : ""}">${escapeHtml(table.headers[columnIndex] || `Column ${columnIndex + 1}`)}</th>`
      )),
    ];
    els.noisePreviewHead.innerHTML = `<tr>${headCells.join("")}</tr>`;
  }

  if (els.noisePreviewBody) {
    const rows = table.rows.slice(0, maxRows).map((row, rowIndex) => {
      const cells = columnIndexes.map((columnIndex) => (
        `<td class="${columnIndex === selectedColumn ? "is-selected-column" : ""}">${escapeHtml(row[columnIndex] ?? "")}</td>`
      ));
      return `<tr><td>${rowIndex + 1}</td>${cells.join("")}</tr>`;
    });
    els.noisePreviewBody.innerHTML = rows.join("");
  }
}

async function loadNoiseCsvFile(file) {
  if (!file) return;
  const text = await file.text();
  const table = parseCsvText(text, els.noiseDelimiter.value);
  state.noiseTable = table;
  state.noiseFileName = file.name;
  populateNoiseColumns(table);
  state.noiseResults = [];
  state.noiseSelectedBits = [];
  els.noiseCaption.textContent = `${file.name} | ${table.rows.length} rows | ${table.headers.length} columns`;
  updateNoiseSummary(0, 0, []);
  renderNoisePreview();
  renderNoiseResults([]);
  resizeNoiseBitCanvas();
}

function getNoiseColumnValues() {
  const table = state.noiseTable;
  const column = Number.parseInt(els.noiseColumn.value, 10);
  if (!table || !Number.isInteger(column)) return [];
  return table.rows
    .map((row) => parseNumberCell(row[column]))
    .filter((value) => Number.isFinite(value));
}

function extractMovingAverageBits(values, windowSize, offset) {
  const bits = [];
  const window = [];
  let sum = 0;
  values.forEach((value) => {
    if (window.length >= windowSize) {
      const threshold = (sum / window.length) + offset;
      bits.push(value > threshold ? 1 : 0);
    }
    window.push(value);
    sum += value;
    if (window.length > windowSize) {
      sum -= window.shift();
    }
  });
  return bits;
}

function extractDeltaBits(values) {
  const bits = [];
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta !== 0) bits.push(delta > 0 ? 1 : 0);
  }
  return bits;
}

function extractLsbBits(values) {
  return values.map((value) => Math.abs(Math.round(value)) & 1);
}

function vonNeumannExtract(bits) {
  const extracted = [];
  for (let index = 0; index + 1 < bits.length; index += 2) {
    const left = bits[index];
    const right = bits[index + 1];
    if (left === 0 && right === 1) extracted.push(0);
    else if (left === 1 && right === 0) extracted.push(1);
  }
  return extracted;
}

function erfc(value) {
  const z = Math.abs(value);
  const t = 1 / (1 + z / 2);
  const r = t * Math.exp(
    -z * z - 1.26551223 +
    t * (1.00002368 +
    t * (0.37409196 +
    t * (0.09678418 +
    t * (-0.18628806 +
    t * (0.27886807 +
    t * (-1.13520398 +
    t * (1.48851587 +
    t * (-0.82215223 +
    t * 0.17087277)))))))),
  );
  return value >= 0 ? r : 2 - r;
}

function gammaLn(value) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];
  let x = value;
  let y = value;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  cof.forEach((coef) => {
    y += 1;
    ser += coef / y;
  });
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function gammaP(a, x) {
  if (x <= 0) return 0;
  if (x >= a + 1) return 1 - gammaQ(a, x);
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= 100; n += 1) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * 3e-7) {
      return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
    }
  }
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
}

function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaP(a, x);
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 100; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-7) break;
  }
  return Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
}

function bitCounts(bits) {
  const ones = bits.reduce((sum, bit) => sum + bit, 0);
  return { ones, zeros: bits.length - ones };
}

function frequencyTest(bits) {
  const n = bits.length;
  if (!n) return { value: "n=0", p: null, pass: false };
  const sum = bits.reduce((acc, bit) => acc + (bit ? 1 : -1), 0);
  const p = erfc(Math.abs(sum) / Math.sqrt(2 * n));
  return { value: `S=${sum}`, p, pass: p >= 0.01 };
}

function runsTest(bits) {
  const n = bits.length;
  if (n < 2) return { value: "n<2", p: null, pass: false };
  const { ones } = bitCounts(bits);
  const pi = ones / n;
  const tau = 2 / Math.sqrt(n);
  if (Math.abs(pi - 0.5) >= tau) return { value: `pi=${pi.toFixed(4)}`, p: 0, pass: false };
  let runs = 1;
  for (let index = 1; index < n; index += 1) {
    if (bits[index] !== bits[index - 1]) runs += 1;
  }
  const p = erfc(Math.abs(runs - 2 * n * pi * (1 - pi)) / (2 * Math.sqrt(2 * n) * pi * (1 - pi)));
  return { value: `runs=${runs}`, p, pass: p >= 0.01 };
}

function blockFrequencyTest(bits, blockSize = 128) {
  const blocks = Math.floor(bits.length / blockSize);
  if (blocks < 1) return { value: `blocks=0`, p: null, pass: false };
  let chi = 0;
  for (let block = 0; block < blocks; block += 1) {
    const start = block * blockSize;
    const ones = bits.slice(start, start + blockSize).reduce((sum, bit) => sum + bit, 0);
    const pi = ones / blockSize;
    chi += (pi - 0.5) ** 2;
  }
  chi *= 4 * blockSize;
  const p = gammaQ(blocks / 2, chi / 2);
  return { value: `M=${blockSize}, chi=${chi.toFixed(3)}`, p, pass: p >= 0.01 };
}

function serialPsi(bits, patternLength) {
  if (patternLength <= 0) return 0;
  const n = bits.length;
  const counts = new Array(2 ** patternLength).fill(0);
  for (let index = 0; index < n; index += 1) {
    let pattern = 0;
    for (let bit = 0; bit < patternLength; bit += 1) {
      pattern = (pattern << 1) | bits[(index + bit) % n];
    }
    counts[pattern] += 1;
  }
  const sum = counts.reduce((acc, count) => acc + count * count, 0);
  return (sum * (2 ** patternLength) / n) - n;
}

function serialTest(bits, m = 2) {
  if (bits.length < 8) return { value: "n<8", p: null, pass: false };
  const psiM = serialPsi(bits, m);
  const psiM1 = serialPsi(bits, m - 1);
  const psiM2 = serialPsi(bits, m - 2);
  const delta1 = psiM - psiM1;
  const delta2 = psiM - 2 * psiM1 + psiM2;
  const p1 = gammaQ(2 ** (m - 2), delta1 / 2);
  const p2 = gammaQ(2 ** (m - 3), delta2 / 2);
  const p = Math.min(p1, p2);
  return { value: `d1=${delta1.toFixed(3)}, d2=${delta2.toFixed(3)}`, p, pass: p >= 0.01 };
}

function entropySummary(bits) {
  if (!bits.length) return { value: "n=0", p: null, pass: false };
  const { ones, zeros } = bitCounts(bits);
  const p1 = ones / bits.length;
  const p0 = zeros / bits.length;
  const entropy = [p0, p1]
    .filter((p) => p > 0)
    .reduce((sum, p) => sum - p * Math.log2(p), 0);
  const minEntropy = -Math.log2(Math.max(p0, p1));
  return { value: `H=${entropy.toFixed(4)}, Hmin=${minEntropy.toFixed(4)}`, p: null, pass: entropy >= 0.98 };
}

function autocorrelationSummary(bits) {
  if (bits.length < 2) return { value: "n<2", p: null, pass: false };
  let same = 0;
  for (let index = 1; index < bits.length; index += 1) {
    if (bits[index] === bits[index - 1]) same += 1;
  }
  const ratio = same / (bits.length - 1);
  return { value: `same=${ratio.toFixed(4)}`, p: null, pass: Math.abs(ratio - 0.5) < 0.05 };
}

function evaluateBits(bits) {
  return [
    ["NIST monobit", frequencyTest(bits)],
    ["NIST runs", runsTest(bits)],
    ["NIST block frequency", blockFrequencyTest(bits)],
    ["NIST serial m=2", serialTest(bits, 2)],
    ["Entropy", entropySummary(bits)],
    ["Lag-1 autocorr", autocorrelationSummary(bits)],
  ];
}

function runNoiseExtraction() {
  const values = getNoiseColumnValues();
  if (!values.length) {
    addLog("SYS", "No numeric CSV data for noise extraction");
    return;
  }

  const methods = [];
  const windowSize = clampInteger(els.noiseWindow.value, 2, 5001, 33);
  const offset = Number.parseFloat(els.noiseThresholdOffset.value) || 0;
  if (els.noiseMethodMovingAverage.checked) {
    methods.push({
      key: "ma",
      name: "Moving average",
      bits: extractMovingAverageBits(values, windowSize, offset),
      params: `window=${windowSize}, offset=${offset}`,
    });
  }
  if (els.noiseMethodDelta.checked) {
    methods.push({
      key: "delta",
      name: "Delta sign",
      bits: extractDeltaBits(values),
      params: "lag=1, bit=delta>0",
    });
  }
  if (els.noiseMethodLsb.checked) {
    methods.push({
      key: "lsb",
      name: "LSB parity",
      bits: extractLsbBits(values),
      params: "bit=round(value)&1",
    });
  }

  state.noiseResults = methods.flatMap((method) => {
    const rawResult = {
      method: `${method.name} raw`,
      methodKey: method.key,
      variant: "Raw",
      rawCount: method.bits.length,
      bits: method.bits,
      params: method.params,
      tests: evaluateBits(method.bits),
    };

    if (!els.noiseVonNeumann.checked) return [rawResult];

    const vnBits = vonNeumannExtract(method.bits);
    return [
      rawResult,
      {
        method: `${method.name} + VN`,
        methodKey: method.key,
        variant: "+ Von Neumann",
        rawCount: method.bits.length,
        bits: vnBits,
        params: `${method.params}, post=Von Neumann 01->0 10->1`,
        tests: evaluateBits(vnBits),
      },
    ];
  });

  const selected = state.noiseResults[0];
  state.noiseSelectedMethod = selected?.method || "";
  state.noiseSelectedBits = selected?.bits || [];
  updateNoiseSummary(state.noiseTable?.rows?.length || 0, values.length, state.noiseResults);
  renderNoiseResults(state.noiseResults);
  resizeNoiseBitCanvas();
}

function updateNoiseSummary(rowCount, numericCount, resultsOrBits) {
  const bits = Array.isArray(resultsOrBits) && resultsOrBits[0]?.bits
    ? resultsOrBits.flatMap((result) => result.bits)
    : (resultsOrBits || []);
  els.noiseRowCount.textContent = String(rowCount || 0);
  els.noiseNumericCount.textContent = String(numericCount || 0);
  els.noiseBitCount.textContent = String(bits.length || 0);
  const { ones } = bitCounts(bits);
  els.noiseOneRatio.textContent = bits.length ? (ones / bits.length).toFixed(4) : "--";
  els.noiseCaption.textContent = state.noiseSelectedMethod
    ? `${state.noiseFileName || "CSV"} | ${state.noiseResults.length} streams | ${bits.length} total plotted bits`
    : (state.noiseTable ? `${state.noiseFileName || "CSV"} | ${state.noiseTable.rows.length} rows loaded` : "Load a CSV file");
}

function formatPValue(value) {
  if (!Number.isFinite(value)) return "--";
  if (value < 0.0001) return value.toExponential(2);
  return value.toFixed(4);
}

function formatOneRatio(bits) {
  if (!bits?.length) return "--";
  return (bitCounts(bits).ones / bits.length).toFixed(4);
}

function isNoiseMethodEnabled(methodKey) {
  if (methodKey === "ma") return Boolean(els.noiseMethodMovingAverage.checked);
  if (methodKey === "delta") return Boolean(els.noiseMethodDelta.checked);
  if (methodKey === "lsb") return Boolean(els.noiseMethodLsb.checked);
  return false;
}

function renderNoiseResults(results) {
  if (!els.noiseMethodBlocks) return;
  els.noiseMethodBlocks.innerHTML = "";

  if (!results.length) {
    NOISE_METHODS.forEach((method) => {
      const card = document.createElement("section");
      card.className = "noise-method-card is-empty";
      card.innerHTML = `
        <div class="method-card-head">
          <h3>${escapeHtml(method.name)}</h3>
          <span class="method-state">${isNoiseMethodEnabled(method.key) ? "Ready" : "Disabled"}</span>
        </div>
        <p>${escapeHtml(method.description)}</p>
        <p class="method-empty">Run extraction to show this method's test result block.</p>
      `;
      els.noiseMethodBlocks.append(card);
    });
    return;
  }

  NOISE_METHODS.forEach((method) => {
    const methodResults = results.filter((result) => result.methodKey === method.key);
    const card = document.createElement("section");
    card.className = `noise-method-card${methodResults.length ? "" : " is-empty"}`;
    const totalBits = methodResults.reduce((sum, result) => sum + result.bits.length, 0);
    const stateText = methodResults.length
      ? `${methodResults.length} stream${methodResults.length > 1 ? "s" : ""}, ${totalBits} bits`
      : (isNoiseMethodEnabled(method.key) ? "No output" : "Disabled");

    let body = "";
    if (!methodResults.length) {
      body = `<p class="method-empty">${isNoiseMethodEnabled(method.key) ? "No bits were generated for this method." : "This method was not selected."}</p>`;
    } else {
      const rows = [];
      methodResults.forEach((result) => {
        result.tests.forEach(([testName, test], testIndex) => {
          rows.push(`
            <tr>
              ${testIndex === 0 ? `<td rowspan="${result.tests.length}">${escapeHtml(result.variant || result.method)}</td>` : ""}
              ${testIndex === 0 ? `<td rowspan="${result.tests.length}">${result.bits.length}</td>` : ""}
              ${testIndex === 0 ? `<td rowspan="${result.tests.length}">${result.rawCount}</td>` : ""}
              ${testIndex === 0 ? `<td rowspan="${result.tests.length}">${formatOneRatio(result.bits)}</td>` : ""}
              ${testIndex === 0 ? `<td rowspan="${result.tests.length}" class="params-cell">${escapeHtml(result.params || "")}</td>` : ""}
              <td>${escapeHtml(testName)}</td>
              <td>${escapeHtml(test.value)}</td>
              <td>${formatPValue(test.p)}</td>
              <td><span class="test-result ${test.pass ? "is-pass" : "is-fail"}">${test.pass ? "PASS" : "CHECK"}</span></td>
            </tr>
          `);
        });
      });
      body = `
        <div class="noise-results-wrap method-results-wrap">
          <table class="noise-results">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Bits</th>
                <th>Raw</th>
                <th>One ratio</th>
                <th>Parameters</th>
                <th>Test</th>
                <th>Value</th>
                <th>p-value</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="method-card-head">
        <h3>${escapeHtml(method.name)}</h3>
        <span class="method-state">${escapeHtml(stateText)}</span>
      </div>
      <p>${escapeHtml(method.description)}</p>
      ${body}
    `;
    els.noiseMethodBlocks.append(card);
  });
}

function resizeNoiseBitCanvas() {
  if (els.noiseView?.hidden) return;
  const lanes = Math.max(1, state.noiseResults.length || 1);
  if (els.noiseBitCanvasWrap) {
    els.noiseBitCanvasWrap.style.height = `${Math.min(960, Math.max(260, lanes * 112))}px`;
  }
  const rect = els.noiseBitCanvas.getBoundingClientRect();
  noiseBitMap.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  noiseBitMap.width = Math.floor(rect.width);
  noiseBitMap.height = Math.floor(rect.height);
  els.noiseBitCanvas.width = Math.floor(noiseBitMap.width * noiseBitMap.dpr);
  els.noiseBitCanvas.height = Math.floor(noiseBitMap.height * noiseBitMap.dpr);
  noiseBitMap.ctx.setTransform(noiseBitMap.dpr, 0, 0, noiseBitMap.dpr, 0, 0);
  drawNoiseBitMap(state.noiseResults);
}

function drawNoiseBitMap(results = state.noiseResults) {
  const ctx = noiseBitMap.ctx;
  const width = noiseBitMap.width;
  const height = noiseBitMap.height;
  if (!width || !height) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const lanes = Array.isArray(results) && results[0]?.bits
    ? results
    : (Array.isArray(results) && results.length ? [{ method: "Bits", bits: results, rawCount: results.length, params: "" }] : []);

  if (!lanes.length) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText("No extracted bits", 14, 28);
    return;
  }

  const labelHeight = 24;
  const laneHeight = Math.max(1, Math.floor(height / lanes.length));
  const columns = Math.max(32, Math.floor(width / 4));
  const cell = Math.max(2, Math.floor(width / columns));

  lanes.forEach((lane, laneIndex) => {
    const top = laneIndex * laneHeight;
    const bits = lane.bits || [];
    const rows = Math.max(1, Math.floor((laneHeight - labelHeight) / cell));
    const capacity = Math.min(bits.length, columns * rows);
    const ones = bitCounts(bits).ones;
    const ratio = bits.length ? ones / bits.length : null;

    ctx.fillStyle = "#30423d";
    ctx.font = "700 12px Segoe UI, sans-serif";
    const label = `${lane.method} | bits ${bits.length}${lane.rawCount !== bits.length ? ` / raw ${lane.rawCount}` : ""} | 1=${ratio === null ? "--" : ratio.toFixed(3)} | ${lane.params || ""}`;
    ctx.fillText(label, 12, top + 16);

    for (let index = 0; index < capacity; index += 1) {
      const x = (index % columns) * cell;
      const y = top + labelHeight + Math.floor(index / columns) * cell;
      ctx.fillStyle = bits[index] ? "#17201d" : "#ffffff";
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = "#d8e0dc";
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportNoiseBitsCsv() {
  if (!state.noiseResults.length) {
    addLog("SYS", "No extracted noise bits to export");
    return;
  }
  const rows = ["method,params,index,bit"];
  state.noiseResults.forEach((result) => {
    result.bits.forEach((bit, index) => {
      rows.push(`${csvCell(result.method)},${csvCell(result.params || "")},${index},${bit}`);
    });
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `noise_bits_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${state.noiseResults.length} noise bit streams`);
}

function toggleDemo() {
  if (state.demoTimer) {
    window.clearInterval(state.demoTimer);
    state.demoTimer = null;
    els.demoButton.textContent = "Demo stream";
    addLog("SYS", "Demo stopped");
    return;
  }

  state.demoTimer = window.setInterval(() => {
    const dac = clampDac(els.dacInput.value);
    state.demoPhase += 0.18;
    const baseline = 7200 + (dac - 2056) * 0.42;
    const ppg = Math.sin(state.demoPhase) * 160 + Math.sin(state.demoPhase * 0.31) * 38;
    const noise = (Math.random() - 0.5) * 42;
    const noiseAdc = 7550 + Math.round((Math.random() - 0.5) * 80);
    addSample(noiseAdc, "ADC", { adcSource: state.bitAdcSource });
    addSample(Math.round(baseline + ppg + noise), "G", { adcSource: state.adcSource });
    addSample(Math.round(baseline + ppg * 0.82 + Math.sin(state.demoPhase * 0.73) * 22 + noise * 0.45), "I", { adcSource: state.adcSource });
    addSample(Math.round(baseline + ppg * 0.62 + noise * 0.55), "R", { adcSource: state.adcSource });
    addSample(Math.round(baseline + noise * 0.2), "A");
  }, 33);
  els.demoButton.textContent = "Stop demo";
  addLog("SYS", "Demo started");
}

function resizeCanvas() {
  const rect = els.plotCanvas.getBoundingClientRect();
  plot.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  plot.width = Math.floor(rect.width);
  plot.height = Math.floor(rect.height);
  els.plotCanvas.width = Math.floor(plot.width * plot.dpr);
  els.plotCanvas.height = Math.floor(plot.height * plot.dpr);
  plot.ctx.setTransform(plot.dpr, 0, 0, plot.dpr, 0, 0);
  state.needsDraw = true;
  drawPlot();
}

function resizeBitCanvas() {
  if (els.bitPanel.hidden) return;

  const rect = els.bitCanvas.getBoundingClientRect();
  bitMap.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  bitMap.width = Math.floor(rect.width);
  bitMap.height = Math.floor(rect.height);
  els.bitCanvas.width = Math.floor(bitMap.width * bitMap.dpr);
  els.bitCanvas.height = Math.floor(bitMap.height * bitMap.dpr);
  bitMap.ctx.setTransform(bitMap.dpr, 0, 0, bitMap.dpr, 0, 0);
  ensureBitPlaneCapacity();
  state.needsBitDraw = true;
  drawBitMap();
}

function resizeCipherCanvas() {
  const rect = els.cipherCanvas.getBoundingClientRect();
  cipherPlot.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cipherPlot.width = Math.floor(rect.width);
  cipherPlot.height = Math.floor(rect.height);
  els.cipherCanvas.width = Math.floor(cipherPlot.width * cipherPlot.dpr);
  els.cipherCanvas.height = Math.floor(cipherPlot.height * cipherPlot.dpr);
  cipherPlot.ctx.setTransform(cipherPlot.dpr, 0, 0, cipherPlot.dpr, 0, 0);
  state.needsCipherDraw = true;
  drawCipherPlot();
}

function getYRange(values) {
  if (!values.length) return { min: 0, max: 16384 };

  if (!els.autoScale.checked) {
    const min = Number(els.yMin.value);
    const max = Number(els.yMax.value);
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      return { min, max };
    }
  }

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = Math.max((max - min) * 0.12, 8);
  return { min: min - pad, max: max + pad };
}

function getTimeRange(samples) {
  if (!samples.length) return { start: 0, end: 1, duration: 1 };
  const start = 0;
  const end = Math.max(1, samples.length - 1);
  const duration = Math.max(1, end - start);
  return { start, end, duration };
}

function drawPlot() {
  const ctx = plot.ctx;
  const width = plot.width;
  const height = plot.height;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);

  const margin = { left: 58, right: 18, top: 20, bottom: 34 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const displaySamples = getDisplaySamples();
  displaySamples.forEach((sample, index) => {
    sample.plotIndex = index;
  });
  const values = displaySamples.map((sample) => sample.value);
  const { min, max } = getYRange(values);
  const timeRange = getTimeRange(displaySamples);

  drawGrid(ctx, margin, chartW, chartH, min, max);
  drawZeroLine(ctx, margin, chartW, chartH, min, max);

  if (values.length < 2) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText("No ADC stream", margin.left + 12, margin.top + 28);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left, margin.top, chartW, chartH);
  ctx.clip();

  drawSeries(ctx, displaySamples, state.adcSource, margin, chartW, chartH, min, max, timeRange);
  ctx.restore();

  drawLegend(ctx, [state.adcSource], margin, chartW);
}

function drawSeries(ctx, samples, seriesKey, margin, chartW, chartH, min, max, timeRange) {
  if (samples.length < 2) return;

  const color = getSeriesColor(seriesKey);
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const samplePosition = Number.isFinite(sample.plotIndex) ? sample.plotIndex : index;
    const x = margin.left + ((samplePosition - timeRange.start) / timeRange.duration) * chartW;
    const y = margin.top + (1 - (sample.value - min) / (max - min)) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();

  const last = samples.at(-1);
  const lastPosition = Number.isFinite(last.plotIndex) ? last.plotIndex : samples.length - 1;
  const x = margin.left + ((lastPosition - timeRange.start) / timeRange.duration) * chartW;
  const y = margin.top + (1 - (last.value - min) / (max - min)) * chartH;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegend(ctx, seriesKeys, margin, chartW) {
  if (!seriesKeys.length) return;

  ctx.save();
  ctx.font = "700 11px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";

  let x = margin.left + chartW;
  const y = margin.top - 8;
  [...seriesKeys].reverse().forEach((seriesKey) => {
    const label = getSeriesLabel(seriesKey);
    const width = ctx.measureText(label).width + 18;
    x -= width + 10;
    ctx.fillStyle = getSeriesColor(seriesKey);
    ctx.fillRect(x, y - 4, 9, 8);
    ctx.fillStyle = "#30423d";
    ctx.fillText(label, x + 13, y);
  });
  ctx.restore();
}

function drawZeroLine(ctx, margin, chartW, chartH, min, max) {
  if (min >= 0 || max <= 0) return;

  const y = margin.top + (1 - (0 - min) / (max - min)) * chartH;
  ctx.save();
  ctx.strokeStyle = "#f0a43a";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(margin.left, y);
  ctx.lineTo(margin.left + chartW, y);
  ctx.stroke();
  ctx.restore();
}

function drawGrid(ctx, margin, chartW, chartH, min, max) {
  ctx.strokeStyle = "#e5ebe8";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#66746f";
  ctx.font = "600 11px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (i / 4) * chartH;
    const value = max - (i / 4) * (max - min);
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + chartW, y);
    ctx.stroke();
    ctx.fillText(formatNumber(value), 10, y);
  }

  ctx.textBaseline = "alphabetic";
  for (let i = 0; i <= 5; i += 1) {
    const x = margin.left + (i / 5) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + chartH);
    ctx.stroke();
  }

  ctx.strokeStyle = "#bbc9c2";
  ctx.strokeRect(margin.left, margin.top, chartW, chartH);
}

function drawCipherPlot() {
  const ctx = cipherPlot.ctx;
  const width = cipherPlot.width;
  const height = cipherPlot.height;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 58, right: 18, top: 22, bottom: 28 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  if (chartW <= 0 || chartH <= 0) return;

  const min = 0;
  const max = 16383;
  drawGrid(ctx, margin, chartW, chartH, min, max);

  const records = state.encryptedPpg;
  if (!records.length) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText(state.encryptionEnabled ? "Waiting for encrypted samples" : "Encryption off", margin.left + 12, margin.top + 28);
    return;
  }

  const start = Math.max(0, records.length - 600);
  const visible = records.slice(start);
  const span = Math.max(1, visible.length - 1);
  const yFor = (value) => margin.top + (1 - (value - min) / (max - min)) * chartH;

  ctx.save();
  ctx.beginPath();
  visible.forEach((record, index) => {
    const x = margin.left + (index / span) * chartW;
    const y = yFor(record.cipher);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#b86800";
  ctx.lineWidth = 1.7;
  ctx.stroke();

  const latest = visible.at(-1);
  const latestX = margin.left + ((visible.length - 1) / span) * chartW;
  const latestY = yFor(latest.cipher);
  ctx.fillStyle = "#b86800";
  ctx.beginPath();
  ctx.arc(latestX, latestY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "800 12px Segoe UI, sans-serif";
  ctx.fillStyle = "#30423d";
  ctx.fillText(`Cipher | latest ${formatHex(latest.cipher)} | plotted ${visible.length}/${records.length}`, margin.left, margin.top - 7);
  ctx.restore();
}

function drawBitMap() {
  if (els.bitPanel.hidden) return;

  const ctx = bitMap.ctx;
  const width = bitMap.width;
  const height = bitMap.height;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ensureBitPlaneCapacity();
  const { columns, rows, cell, laneHeight, labelHeight } = getBitPlaneGeometry();
  const lanes = getBitLanes();
  const totalFilled = lanes.reduce((sum, [, lane]) => sum + lane.filled, 0);

  if (!totalFilled) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText(state.bitMode ? "No random bits" : "No ADC noise bits", 14, 28);
    return;
  }

  lanes.forEach(([source, lane], laneIndex) => {
    const top = laneIndex * laneHeight;
    const gridTop = top + labelHeight;
    const laneBits = lane.plane.filter((bit) => bit === 0 || bit === 1);
    const ones = laneBits.reduce((sum, bit) => sum + bit, 0);
    const ratio = laneBits.length ? ones / laneBits.length : null;

    ctx.fillStyle = getSeriesColor(source);
    ctx.fillRect(0, top, 6, Math.max(1, laneHeight - 1));
    ctx.fillStyle = "#30423d";
    ctx.font = "800 12px Segoe UI, sans-serif";
    ctx.fillText(`${getSeriesLabel(source)} | ${lane.filled}/${state.bitPlaneCapacity} | 1=${ratio === null ? "--" : ratio.toFixed(3)} | plane ${lane.cycles + 1}`, 12, top + 15);

    lane.plane.forEach((bit, index) => {
      if (bit !== 0 && bit !== 1) return;
      const x = (index % columns) * cell;
      const y = gridTop + Math.floor(index / columns) * cell;
      ctx.fillStyle = bit ? "#17201d" : "#ffffff";
      ctx.fillRect(x, y, cell, cell);
    });

    if (lane.index < state.bitPlaneCapacity) {
      const x = (lane.index % columns) * cell;
      const y = gridTop + Math.floor(lane.index / columns) * cell;
      ctx.strokeStyle = "#f0a43a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
    }

    ctx.strokeStyle = "rgba(216, 224, 220, 0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, gridTop, Math.min(width, columns * cell), Math.min(laneHeight - labelHeight - 1, rows * cell));

    if (cell >= 6) {
      ctx.strokeStyle = "rgba(216, 224, 220, 0.45)";
      for (let x = 0; x <= columns; x += 1) {
        const px = x * cell + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, gridTop);
        ctx.lineTo(px, Math.min(top + laneHeight - 1, gridTop + rows * cell));
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = gridTop + y * cell + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(Math.min(width, columns * cell), py);
        ctx.stroke();
      }
    }
  });
}

function animationLoop() {
  const now = performance.now();
  if (state.needsDraw && now - state.lastDrawAt > 33) {
    drawPlot();
    state.lastDrawAt = now;
    state.needsDraw = false;
  }
  if (state.needsBitDraw && now - state.lastBitDrawAt > 33) {
    drawBitMap();
    state.lastBitDrawAt = now;
    state.needsBitDraw = false;
  }
  if (state.needsCipherDraw && now - state.lastCipherDrawAt > 33) {
    drawCipherPlot();
    state.lastCipherDrawAt = now;
    state.needsCipherDraw = false;
  }
  requestAnimationFrame(animationLoop);
}

function bindEvents() {
  els.uiScale.addEventListener("change", () => {
    setUiScale(els.uiScale.value);
  });

  els.viewTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.viewTarget);
    });
  });

  els.connectButton.addEventListener("click", () => {
    if (isConnected()) disconnectActiveTransport();
    else connectSelectedTransport();
  });
  els.transportMode.addEventListener("change", updateTransportControls);

  els.demoButton.addEventListener("click", toggleDemo);
  els.dacSlider.addEventListener("input", (event) => setDacValue(event.target.value));
  els.dacInput.addEventListener("input", (event) => setDacValue(event.target.value));
  els.dacTarget.addEventListener("change", () => {
    setDacValue(state.dacValues[getSelectedDacTarget()], "target");
  });
  els.sendDacButton.addEventListener("click", () => sendCommand(formatDacCommand(els.dacInput.value)));

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.step);
      setDacValue(clampDac(els.dacInput.value) + step);
    });
  });

  document.querySelectorAll("[data-bit-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleBitModeCommand();
    });
  });

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.adcSource && isConnected()) {
        setAdcSource(button.dataset.adcSource, { pending: true });
      }
      applyPpgCommandPreset(button.dataset.command);
      sendCommand(button.dataset.command);
    });
  });

  els.clearLogButton.addEventListener("click", () => {
    els.log.innerHTML = "";
  });

  els.windowSize.addEventListener("input", () => applyWindowSizeInput(false));
  els.windowSize.addEventListener("change", () => applyWindowSizeInput(true));
  els.sampleRate.addEventListener("input", () => applySampleRateInput(false));
  els.sampleRate.addEventListener("change", () => applySampleRateInput(true));
  els.sendRateButton.addEventListener("click", () => {
    sendSampleRateCommand().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.adc3Rate?.addEventListener("input", () => applyAdc3RateInput(false));
  els.adc3Rate?.addEventListener("change", () => applyAdc3RateInput(true));
  els.sendAdc3RateButton?.addEventListener("click", () => {
    sendAdc3RateCommand().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.bitMethod?.addEventListener("change", () => {
    setBitGenerationMethod(els.bitMethod.value, { enable: true });
  });
  els.encryptionToggle?.addEventListener("change", () => {
    setEncryptionEnabled(els.encryptionToggle.checked);
  });
  els.cipherWidth?.addEventListener("change", () => {
    setCipherWidthBits(els.cipherWidth.value);
  });
  [els.liveMaWindow, els.liveMaOffset].forEach((control) => {
    control?.addEventListener("input", () => applyLiveMaSettings({ normalize: false }));
    control?.addEventListener("change", () => applyLiveMaSettings());
  });

  els.plotAdcSource.addEventListener("change", async () => {
    const source = normalizeAdcSource(els.plotAdcSource.value);
    if (!source) return;
    const connected = isConnected();
    setAdcSource(source, { pending: connected });
    if (connected) await sendCommand(source);
  });

  els.valueMode.addEventListener("change", () => {
    if (getValueMode() === "current" && getAdcBias() === null) {
      measureBiasFromSamples({ silent: true });
    }
    updateValueUi();
    updateStats();
    state.needsDraw = true;
  });

  els.biasValue.addEventListener("change", () => {
    setAdcBias(state.adcSource, els.biasValue.value);
  });

  els.measureBiasButton.addEventListener("click", () => {
    measureBiasFromSamples();
  });

  els.autoScale.addEventListener("change", () => {
    els.manualScale.hidden = els.autoScale.checked;
    state.needsDraw = true;
  });

  els.yMin.addEventListener("input", () => {
    state.needsDraw = true;
  });

  els.yMax.addEventListener("input", () => {
    state.needsDraw = true;
  });

  [els.filterMode, els.filterWindow, els.highCutoff, els.lowCutoff].forEach((control) => {
    control.addEventListener("input", () => {
      updateFilterUi();
      updateStats();
      state.needsDraw = true;
    });
    control.addEventListener("change", () => {
      updateFilterUi();
      updateStats();
      state.needsDraw = true;
    });
  });

  els.pauseButton.addEventListener("click", () => {
    state.paused = !state.paused;
    els.pauseButton.textContent = state.paused ? "Resume" : "Pause";
    addLog("SYS", state.paused ? "Plot paused" : "Plot resumed");
    state.needsDraw = true;
  });

  els.clearSamplesButton.addEventListener("click", clearSamples);
  els.exportButton.addEventListener("click", exportCsv);
  els.exportCipherButton.addEventListener("click", exportCipherCsv);
  [els.bitColumns, els.bitRows, els.bitHistoryLimit].forEach((control) => {
    control?.addEventListener("input", () => applyBitMapSettings({ normalize: false }));
    control?.addEventListener("change", () => applyBitMapSettings());
  });
  els.clearBitsButton.addEventListener("click", clearBits);
  els.exportBitsButton.addEventListener("click", exportBitsCsv);
  els.noiseCsvFile.addEventListener("change", () => {
    loadNoiseCsvFile(els.noiseCsvFile.files?.[0]).catch((error) => {
      addLog("ERR", error.message || error, true);
    });
  });
  els.noiseDelimiter.addEventListener("change", () => {
    if (els.noiseCsvFile.files?.[0]) {
      loadNoiseCsvFile(els.noiseCsvFile.files[0]).catch((error) => {
        addLog("ERR", error.message || error, true);
      });
    }
  });
  els.noiseColumn.addEventListener("change", () => {
    renderNoisePreview();
  });
  els.runNoiseButton.addEventListener("click", runNoiseExtraction);
  els.exportNoiseBitsButton.addEventListener("click", exportNoiseBitsCsv);
  els.bitColumns.addEventListener("change", () => {
    state.needsBitDraw = true;
    resizeBitCanvas();
  });
  window.addEventListener("beforeunload", () => {
    state.keepReading = false;
    if (state.bleDevice?.gatt?.connected) {
      state.bleDevice.gatt.disconnect();
    }
  });
}

function init() {
  bindEvents();
  setUiScale(loadUiScale(), false);
  applyWindowSizeInput();
  setSampleRateUi(DEFAULT_SAMPLE_RATE_HZ, rateHzToIntervalMs(DEFAULT_SAMPLE_RATE_HZ));
  setPpgRateUi(DEFAULT_PPG_RATE_HZ, 10, DEFAULT_PPG_LED_ON_MS);
  setAdc3RateUi(DEFAULT_ADC3_RATE_HZ, 1);
  setDacValue(2056, "init");
  applyLiveMaSettings();
  setBitGenerationMethod(getSelectedBitMethod());
  setCipherWidthBits(DEFAULT_CIPHER_WIDTH_BITS, { reset: false });
  applyBitMapSettings();
  updateTransportControls();
  setConnectedUi(false);
  updateAdcSourceUi();
  updateValueUi();
  updateFilterUi();
  updateBitStats();
  updateEncryptionUi();
  resizeCanvas();
  resizeCipherCanvas();
  new ResizeObserver(resizeCanvas).observe(els.canvasWrap || els.plotCanvas);
  new ResizeObserver(resizeBitCanvas).observe(els.bitCanvasWrap || els.bitCanvas);
  new ResizeObserver(resizeCipherCanvas).observe(els.cipherCanvasWrap || els.cipherCanvas);
  new ResizeObserver(resizeNoiseBitCanvas).observe(els.noiseBitCanvasWrap || els.noiseBitCanvas);
  updateStats();
  animationLoop();
}

init();
