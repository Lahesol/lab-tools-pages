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
  adcGain0: document.querySelector("#adcGain0"),
  adcGain2: document.querySelector("#adcGain2"),
  adcGain3: document.querySelector("#adcGain3"),
  sendGainButton: document.querySelector("#sendGainButton"),
  adcGainStatus: document.querySelector("#adcGainStatus"),
  plotAdcSource: document.querySelector("#plotAdcSource"),
  bitMethod: document.querySelector("#bitMethod"),
  encryptionSource: document.querySelector("#encryptionSource"),
  cipherWidth: document.querySelector("#cipherWidth"),
  liveMaWindow: document.querySelector("#liveMaWindow"),
  liveMaOffset: document.querySelector("#liveMaOffset"),
  liveMaWindowField: document.querySelector("#liveMaWindowField"),
  liveMaOffsetField: document.querySelector("#liveMaOffsetField"),
  encryptionToggle: document.querySelector("#encryptionToggle"),
  firmwareConcurrentEncryptionStartButton: document.querySelector("#firmwareConcurrentEncryptionStartButton"),
  firmwareEncryptionStartButton: document.querySelector("#firmwareEncryptionStartButton"),
  firmwareEncryptionStopButton: document.querySelector("#firmwareEncryptionStopButton"),
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
  bitAdc2Caption: document.querySelector("#bitAdc2Caption"),
  bitAdc2Canvas: document.querySelector("#bitAdc2Canvas"),
  bitAdc2CanvasWrap: document.querySelector(".bit-adc2-canvas-wrap"),
  viewTabs: document.querySelectorAll("[data-view-target]"),
  liveView: document.querySelector("#liveView"),
  noiseView: document.querySelector("#noiseView"),
  switchView: document.querySelector("#switchView"),
  switchPpgSeconds: document.querySelector("#switchPpgSeconds"),
  switchTrngSeconds: document.querySelector("#switchTrngSeconds"),
  switchSettleMs: document.querySelector("#switchSettleMs"),
  switchMode: document.querySelector("#switchMode"),
  switchWindowSize: document.querySelector("#switchWindowSize"),
  switchFilterMode: document.querySelector("#switchFilterMode"),
  switchDacTrng: document.querySelector("#switchDacTrng"),
  switchDacPpg: document.querySelector("#switchDacPpg"),
  switchStartButton: document.querySelector("#switchStartButton"),
  switchClearButton: document.querySelector("#switchClearButton"),
  switchStatus: document.querySelector("#switchStatus"),
  switchAdc0PpgCaption: document.querySelector("#switchAdc0PpgCaption"),
  switchAdc0TrngCaption: document.querySelector("#switchAdc0TrngCaption"),
  switchAdc2PpgCaption: document.querySelector("#switchAdc2PpgCaption"),
  switchAdc2TrngCaption: document.querySelector("#switchAdc2TrngCaption"),
  switchAdc0PpgCanvas: document.querySelector("#switchAdc0PpgCanvas"),
  switchAdc0TrngCanvas: document.querySelector("#switchAdc0TrngCanvas"),
  switchAdc2PpgCanvas: document.querySelector("#switchAdc2PpgCanvas"),
  switchAdc2TrngCanvas: document.querySelector("#switchAdc2TrngCanvas"),
  switchAdc0PpgWrap: document.querySelector("#switchAdc0PpgWrap"),
  switchAdc0TrngWrap: document.querySelector("#switchAdc0TrngWrap"),
  switchAdc2PpgWrap: document.querySelector("#switchAdc2PpgWrap"),
  switchAdc2TrngWrap: document.querySelector("#switchAdc2TrngWrap"),
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
  nistView: document.querySelector("#nistView"),
  nistCaption: document.querySelector("#nistCaption"),
  nistHelp: document.querySelector("#nistHelp"),
  nistProfile: document.querySelector("#nistProfile"),
  nistBitSource: document.querySelector("#nistBitSource"),
  nistBitLimit: document.querySelector("#nistBitLimit"),
  nistBlockSize: document.querySelector("#nistBlockSize"),
  nistTemplate: document.querySelector("#nistTemplate"),
  nistApproxM: document.querySelector("#nistApproxM"),
  nistSerialM: document.querySelector("#nistSerialM"),
  nistLinearM: document.querySelector("#nistLinearM"),
  nistBitFile: document.querySelector("#nistBitFile"),
  nistBitFormat: document.querySelector("#nistBitFormat"),
  nistRemoveFileButton: document.querySelector("#nistRemoveFileButton"),
  nistFileStatus: document.querySelector("#nistFileStatus"),
  nistSourceName: document.querySelector("#nistSourceName"),
  nistSourceAvailable: document.querySelector("#nistSourceAvailable"),
  nistSourceTestCount: document.querySelector("#nistSourceTestCount"),
  nistSourceDescription: document.querySelector("#nistSourceDescription"),
  nistRunButton: document.querySelector("#nistRunButton"),
  nistClearButton: document.querySelector("#nistClearButton"),
  nistExportButton: document.querySelector("#nistExportButton"),
  nistBitCount: document.querySelector("#nistBitCount"),
  nistOneRatio: document.querySelector("#nistOneRatio"),
  nistPassCount: document.querySelector("#nistPassCount"),
  nistCheckCount: document.querySelector("#nistCheckCount"),
  nistNaCount: document.querySelector("#nistNaCount"),
  nistElapsed: document.querySelector("#nistElapsed"),
  nistResultsBody: document.querySelector("#nistResultsBody"),
  mlView: document.querySelector("#mlView"),
  mlCaption: document.querySelector("#mlCaption"),
  mlBitSource: document.querySelector("#mlBitSource"),
  mlBitLimit: document.querySelector("#mlBitLimit"),
  mlLag: document.querySelector("#mlLag"),
  mlHoldout: document.querySelector("#mlHoldout"),
  mlMaxTrain: document.querySelector("#mlMaxTrain"),
  mlSourceName: document.querySelector("#mlSourceName"),
  mlSourceAvailable: document.querySelector("#mlSourceAvailable"),
  mlSourceTestCount: document.querySelector("#mlSourceTestCount"),
  mlSourceDescription: document.querySelector("#mlSourceDescription"),
  mlRunButton: document.querySelector("#mlRunButton"),
  mlClearButton: document.querySelector("#mlClearButton"),
  mlExportButton: document.querySelector("#mlExportButton"),
  mlBitCount: document.querySelector("#mlBitCount"),
  mlSplitCount: document.querySelector("#mlSplitCount"),
  mlBaselineAccuracy: document.querySelector("#mlBaselineAccuracy"),
  mlAccuracy: document.querySelector("#mlAccuracy"),
  mlAdvantage: document.querySelector("#mlAdvantage"),
  mlConditionalEntropy: document.querySelector("#mlConditionalEntropy"),
  mlResultsBody: document.querySelector("#mlResultsBody"),
  mlInterpretation: document.querySelector("#mlInterpretation"),
  mlWarning: document.querySelector("#mlWarning"),
  entropyView: document.querySelector("#90bView"),
  entropyCaption: document.querySelector("#90bCaption"),
  entropyBitSource: document.querySelector("#90bBitSource"),
  entropyBitLimit: document.querySelector("#90bBitLimit"),
  entropyTupleK: document.querySelector("#90bTupleK"),
  entropyDataClass: document.querySelector("#90bDataClass"),
  entropySourceName: document.querySelector("#90bSourceName"),
  entropySourceAvailable: document.querySelector("#90bSourceAvailable"),
  entropySourceTestCount: document.querySelector("#90bSourceTestCount"),
  entropySourceDescription: document.querySelector("#90bSourceDescription"),
  entropyRunButton: document.querySelector("#90bRunButton"),
  entropyClearButton: document.querySelector("#90bClearButton"),
  entropyExportButton: document.querySelector("#90bExportButton"),
  entropyExportInputButton: document.querySelector("#90bExportInputButton"),
  entropySampleCount: document.querySelector("#90bSampleCount"),
  entropyDataStatus: document.querySelector("#90bDataStatus"),
  entropyValue: document.querySelector("#90bEntropyValue"),
  entropyIidStatus: document.querySelector("#90bIidStatus"),
  entropyRctStatus: document.querySelector("#90bRctStatus"),
  entropyAptStatus: document.querySelector("#90bAptStatus"),
  entropyResultsBody: document.querySelector("#90bResultsBody"),
  entropyHealthSummary: document.querySelector("#90bHealthSummary"),
  entropyRctDetail: document.querySelector("#90bRctDetail"),
  entropyAptDetail: document.querySelector("#90bAptDetail"),
  entropyIidDetail: document.querySelector("#90bIidDetail"),
  entropyWarning: document.querySelector("#90bWarning"),
};

const DEFAULT_MAX_SAMPLES = 20000;
const MIN_MAX_SAMPLES = 100;
const MAX_MAX_SAMPLES = 1000000;
const DEFAULT_SAMPLE_RATE_HZ = 100;
const MIN_SAMPLE_RATE_HZ = 1;
const MAX_SAMPLE_RATE_HZ = 1000;
const DEFAULT_ADC_BATCH_SIZE = 16;
const DEFAULT_CIPHER_WIDTH_BITS = 14;
const CIPHER_SIGNAL_MA_WINDOW = 22;
const FILTER_WARMUP_TIME_CONSTANTS = 5;
const MAX_FILTER_CONTEXT_SAMPLES = 100000;
const CIPHER_WIDTH_OPTIONS = new Set([8, 10, 12, 14]);
const ADC_GAIN_OPTIONS = [
  { code: 0, label: "1/6", text: "1/6 (default)" },
  { code: 1, label: "1/5", text: "1/5" },
  { code: 2, label: "1/4", text: "1/4" },
  { code: 3, label: "1/3", text: "1/3" },
  { code: 4, label: "1/2", text: "1/2" },
  { code: 5, label: "1", text: "1" },
  { code: 6, label: "2", text: "2" },
  { code: 7, label: "4", text: "4" },
];
const MAX_KEY_BITS = 8192;
const MAX_RATE_HISTORY = 10000;
const MAX_PENDING_PPG = 512;
const MAX_ENCRYPTED_PPG = MAX_MAX_SAMPLES;
const LIVE_STATUS_REFRESH_MS = 100;
const SERIAL_RECOVERY_LIMIT = 3;
const SERIAL_RECOVERY_DELAY_MS = 250;

const state = {
  transport: "none",
  port: null,
  reader: null,
  bleDevice: null,
  bleServer: null,
  bleWriteCharacteristic: null,
  bleNotifyCharacteristic: null,
  writer: null,
  serialOpenOptions: null,
  serialRecoveryAttempts: 0,
  firmwareVersion: "",
  firmwareProtocol: "",
  perChannelGainSupported: false,
  keepReading: false,
  decoder: new TextDecoder(),
  parseBuffer: "",
  streamDecoder: null,
  samples: [],
  totalSamples: 0,
  latest: null,
  latestChannel: "ADC",
  adcSource: "ADC2",
  plotAdcSources: new Set(["ADC2"]),
  bitAdcSource: "ADC3",
  valueMode: "adc",
  adcBias: { ADC0: null, ADC2: null, ADC3: null },
  dacValues: { A: 2048, B: 2056 },
  bitMode: false,
  encryptionEnabled: false,
  encryptionSource: "ADC2",
  firmwareEncryptionActive: false,
  firmwareEncryptionMode: "off",
  firmwareEncryptionFrameCount: 0,
  firmwareEncryptionPending: 0,
  firmwareEncryptionDropped: 0,
  firmwareEncryptionSequence: null,
  firmwarePartialKeyBits: 0,
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
  bitInputEvents: [],
  totalBitInputSamples: 0,
  bitGenerationMethod: "throughput-all",
  cipherWidthBits: DEFAULT_CIPHER_WIDTH_BITS,
  keyBits: [],
  pendingPpg: [],
  encryptedPpg: [],
  encryptedCount: 0,
  droppedPpg: 0,
  lastEncrypted: null,
  cipherPlainFilters: {},
  totalAdcBatches: 0,
  lastAdcBatchAt: 0,
  lastAdcBatchCount: 0,
  totalAdcBatchSamples: 0,
  adcBatchErrors: 0,
  firmwareAdcBlockDrops: 0,
  adcSequenceDrops: 0,
  adcZeroCounts: { ADC0: 0, ADC2: 0, ADC3: 0 },
  lastAdcFrameSequence: null,
  liveMaWindow: 33,
  liveMaOffset: 0,
  noiseBaseline: null,
  noiseWarmup: 0,
  noisePairBit: null,
  noiseExtractors: {},
  liveBitExtractors: {},
  switching: {
    active: false,
    mode: "dac",
    phase: "idle",
    phaseStartedAt: 0,
    phaseDurationMs: 0,
    ppgMs: 5000,
    trngMs: 5000,
    settleMs: 200,
    dacTrng: 2048,
    dacPpg: 4095,
    timer: null,
    cycles: 0,
    samples: {
      ADC0: { ppg: [], trng: [] },
      ADC2: { ppg: [], trng: [] },
    },
    bits: { ADC0: [], ADC2: [] },
    extractors: {},
  },
  paused: false,
  demoTimer: null,
  demoPhase: 0,
  liveSendTimer: null,
  writeQueue: Promise.resolve(),
  maxSamples: DEFAULT_MAX_SAMPLES,
  sampleRateHz: DEFAULT_SAMPLE_RATE_HZ,
  sampleIntervalMs: 10,
  adcGainCodes: { ADC0: 0, ADC2: 5, ADC3: 0 },
  adcGainLabels: { ADC0: "1/6", ADC2: "1", ADC3: "1/6" },
  adcBatchSize: DEFAULT_ADC_BATCH_SIZE,
  saadcBaseHz: 100,
  saadcOversample: 0,
  lastStatsAt: 0,
  lastLiveStatusAt: 0,
  needsDraw: true,
  lastDrawAt: 0,
  needsBitDraw: true,
  lastBitDrawAt: 0,
  needsBitAdc2Draw: true,
  lastBitAdc2DrawAt: 0,
  needsCipherDraw: true,
  lastCipherDrawAt: 0,
  needsSwitchDraw: true,
  lastSwitchDrawAt: 0,
  noiseTable: null,
  noiseFileName: "",
  noiseResults: [],
  noiseSelectedBits: [],
  noiseSelectedMethod: "",
  nistResults: [],
  nistWorker: null,
  nistRunning: false,
  nistUploadedBits: new Uint8Array(0),
  nistUploadedFileName: "",
  nistUploadedFileNames: [],
  mlResults: null,
  mlWorker: null,
  mlRunning: false,
  entropyResults: null,
  entropyWorker: null,
  entropyRunning: false,
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
    label: "ADC3 BPTT noise/TRNG",
    detail: "BPTT noise/TRNG - AIN3/P0.05",
  },
  ADC2: {
    command: "ADC2",
    label: "ADC2 BPTT PPG",
    detail: "BPTT PPG - AIN2/P0.04",
  },
  ADC0: {
    command: "ADC0",
    label: "ADC0 ambient/noise",
    detail: "Commercial sensor ambient/noise - AIN0/P0.02",
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

const bitAdc2Plot = {
  ctx: els.bitAdc2Canvas.getContext("2d"),
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

const switchingPlots = {
  ADC0: {
    ppg: { canvas: els.switchAdc0PpgCanvas, wrap: els.switchAdc0PpgWrap, ctx: els.switchAdc0PpgCanvas?.getContext("2d"), width: 0, height: 0, dpr: 1 },
    trng: { canvas: els.switchAdc0TrngCanvas, wrap: els.switchAdc0TrngWrap, ctx: els.switchAdc0TrngCanvas?.getContext("2d"), width: 0, height: 0, dpr: 1 },
  },
  ADC2: {
    ppg: { canvas: els.switchAdc2PpgCanvas, wrap: els.switchAdc2PpgWrap, ctx: els.switchAdc2PpgCanvas?.getContext("2d"), width: 0, height: 0, dpr: 1 },
    trng: { canvas: els.switchAdc2TrngCanvas, wrap: els.switchAdc2TrngWrap, ctx: els.switchAdc2TrngCanvas?.getContext("2d"), width: 0, height: 0, dpr: 1 },
  },
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
  state.streamDecoder = new PpgTrngProtocol.StreamDecoder();
  state.lastAdcFrameSequence = null;
}

function resetFirmwareEncryptionState() {
  state.firmwareEncryptionActive = false;
  state.firmwareEncryptionMode = "off";
  state.firmwareEncryptionFrameCount = 0;
  state.firmwareEncryptionPending = 0;
  state.firmwareEncryptionDropped = 0;
  state.firmwareEncryptionSequence = null;
  state.firmwarePartialKeyBits = 0;
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
  const sources = new Set(state.plotAdcSources);
  sources.add(normalized);
  setPlotAdcSources([...sources], { ...options, primary: normalized });
}

function setPlotAdcSources(sources, options = {}) {
  const normalizedSources = [...new Set(
    sources.map((source) => normalizeAdcSource(source)).filter(Boolean),
  )];
  if (!normalizedSources.length) return false;

  const previousPrimary = state.adcSource;
  const nextPrimary = normalizeAdcSource(options.primary)
    || (state.plotAdcSources.has(previousPrimary) ? previousPrimary : normalizedSources[0]);
  const primary = normalizedSources.includes(nextPrimary) ? nextPrimary : normalizedSources[0];

  state.plotAdcSources = new Set(normalizedSources);
  state.adcSource = primary;
  if (previousPrimary !== primary) {
    resetNoiseExtractor();
    resetLiveEncryption();
  }
  updateAdcSourceUi(options);
  updateStats();
  updateBitStats();
  state.needsDraw = true;
  state.needsBitDraw = true;
  return true;
}

function updateAdcSourceUi(options = {}) {
  const info = getAdcSourceInfo(state.adcSource);
  const pending = Boolean(options.pending);
  if (els.adcSourceStatus) {
    const label = `Plot ${getAdcPlotDescription()} / primary ${info.label}`;
    els.adcSourceStatus.textContent = pending ? `${label} pending` : label;
    els.adcSourceStatus.classList.toggle("is-muted", pending);
  }
  els.plotAdcSource?.querySelectorAll("[data-plot-source]").forEach((input) => {
    const source = normalizeAdcSource(input.dataset.plotSource);
    input.checked = Boolean(source && state.plotAdcSources.has(source));
    input.closest(".plot-source-option")?.classList.toggle("is-primary", source === state.adcSource);
  });

  document.querySelectorAll("[data-adc-source]").forEach((button) => {
    const active = normalizeAdcSource(button.dataset.adcSource) === state.adcSource;
    button.classList.toggle("is-active", active);
  });
  updateValueUi();
}

function setEncryptionSource(source, options = {}) {
  const normalized = normalizeAdcSource(source);
  if (!normalized) return;
  const changed = state.encryptionSource !== normalized;
  state.encryptionSource = normalized;
  if (els.encryptionSource && els.encryptionSource.value !== normalized) {
    els.encryptionSource.value = normalized;
  }
  if (changed && options.reset !== false) resetLiveEncryption();
  updateEncryptionUi();
  state.needsCipherDraw = true;
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

async function startFirmwareConcurrentEncryption() {
  if (state.switching.active) {
    stopSwitchingMode();
    addLog("SYS", "Stopped local DAC switching before concurrent ENCF");
  }
  setBitMode(false);
  state.encryptionEnabled = false;
  if (els.encryptionToggle) els.encryptionToggle.checked = false;
  resetBitAndEncryptionBuffers();
  state.firmwareEncryptionMode = "concurrent";
  updateBitStats();
  updateEncryptionUi();
  state.needsBitDraw = true;
  state.needsCipherDraw = true;
  await sendCommand("ENC1");
  addLog("SYS", "Firmware concurrent ENCF started: ADC2 PPG + ADC3 throughput mix MA11");
}

async function startFirmwareSwitchingEncryption() {
  if (state.switching.active) {
    stopSwitchingMode();
    addLog("SYS", "Stopped local DAC switching before firmware switching ENCF");
  }
  setBitMode(false);
  state.encryptionEnabled = false;
  if (els.encryptionToggle) els.encryptionToggle.checked = false;
  resetBitAndEncryptionBuffers();
  state.firmwareEncryptionMode = "switching";
  updateBitStats();
  updateEncryptionUi();
  state.needsBitDraw = true;
  state.needsCipherDraw = true;
  await sendCommand("SWENC1");
  addLog("SYS", "Firmware switching ENCF started: 15 s PPG + 10 s key generation");
}

async function stopFirmwareEncryption() {
  const command = state.firmwareEncryptionMode === "concurrent" ? "ENC0" : "SWENC0";
  await sendCommand(command);
  addLog("SYS", `Firmware ${state.firmwareEncryptionMode} ENCF stop requested`);
  resetFirmwareEncryptionState();
  updateEncryptionUi();
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
    await sendCommand("ADC?");
    await sendCommand("RATE?");
    await sendCommand("GAIN?");
  }, 250);
}

function waitForFirmwareProtocol(timeoutMs = 600) {
  return new Promise((resolve) => {
    const deadline = performance.now() + timeoutMs;
    const poll = () => {
      if (state.firmwareProtocol || state.perChannelGainSupported || !isConnected() || performance.now() >= deadline) {
        resolve();
        return;
      }
      window.setTimeout(poll, 25);
    };
    poll();
  });
}

async function ensureFirmwareProtocolKnown() {
  if (state.firmwareProtocol || state.perChannelGainSupported || !isConnected()) return;
  await sendCommand("VER?");
  await waitForFirmwareProtocol();
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
    const openOptions = {
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
    };
    state.port = await navigator.serial.requestPort();
    await state.port.open(openOptions);

    state.serialOpenOptions = openOptions;
    state.serialRecoveryAttempts = 0;
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
    state.serialOpenOptions = null;
    state.serialRecoveryAttempts = 0;
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
    state.serialOpenOptions = null;
    state.serialRecoveryAttempts = 0;
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

function waitForSerialRecovery() {
  return new Promise((resolve) => window.setTimeout(resolve, SERIAL_RECOVERY_DELAY_MS));
}

async function recoverSerialPort(error) {
  if (!state.port || !state.serialOpenOptions) return false;
  if (state.serialRecoveryAttempts >= SERIAL_RECOVERY_LIMIT) return false;

  state.serialRecoveryAttempts += 1;
  const attempt = state.serialRecoveryAttempts;
  const message = error?.message || String(error);
  addLog("SYS", `Serial read error: ${message}; reopening ${attempt}/${SERIAL_RECOVERY_LIMIT}`);
  await waitForSerialRecovery();

  try {
    await state.port.close();
  } catch (closeError) {
    addLog("ERR", `Serial close during recovery: ${closeError.message || closeError}`, true);
  }

  try {
    await state.port.open(state.serialOpenOptions);
    resetReceiveState();
    addLog("SYS", `Serial reopened at ${state.serialOpenOptions.baudRate}`);
    queryDeviceStateSoon();
    return true;
  } catch (openError) {
    addLog("ERR", `Serial reopen failed: ${openError.message || openError}`, true);
    return false;
  }
}

async function stopSerialAfterReadFailure(statusMessage) {
  const port = state.port;
  state.keepReading = false;
  state.transport = "none";
  state.port = null;
  state.serialOpenOptions = null;
  state.serialRecoveryAttempts = 0;

  try {
    if (port) await port.close();
  } catch (error) {
    addLog("ERR", `Serial close after read failure: ${error.message || error}`, true);
  }

  setConnectedUi(false);
  setConnectionStatus(statusMessage, "bad");
}

async function readLoop() {
  while (state.port && state.keepReading) {
    if (!state.port.readable) {
      if (await recoverSerialPort(new Error("Serial stream is not readable"))) continue;
      break;
    }

    const reader = state.port.readable.getReader();
    state.reader = reader;
    let readError = null;
    let streamDone = false;
    try {
      while (state.keepReading) {
        const { value, done } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }
        if (value) ingestBytes(value);
      }
    } catch (error) {
      readError = error;
    } finally {
      if (state.reader === reader) state.reader = null;
      try {
        reader.releaseLock();
      } catch (error) {
        if (!readError) readError = error;
      }
    }

    if (!state.keepReading) break;
    if (readError) {
      if (await recoverSerialPort(readError)) continue;
      await stopSerialAfterReadFailure("Serial read stopped");
      addLog(
        "ERR",
        "Serial read stopped after recovery attempts; verify 115200 baud, UART pins, and GND",
        true,
      );
      break;
    }
    if (streamDone) break;
  }

  if (state.keepReading && state.transport === "serial") {
    await stopSerialAfterReadFailure("Serial stream closed");
    addLog("ERR", "Serial stream closed; reconnect required", true);
  }
}

function ingestBytes(bytes) {
  if (!state.streamDecoder) resetReceiveState();
  const result = state.streamDecoder.push(bytes);
  result.textChunks.forEach((chunk) => {
    const text = state.decoder.decode(chunk, { stream: true });
    ingestText(text);
  });
  result.frames.forEach(ingestSynchronizedAdcFrame);
  result.encryptionFrames?.forEach(ingestFirmwareEncryptionFrame);
  if (result.errors.length) {
    state.adcBatchErrors += result.errors.length;
    if (state.adcBatchErrors <= 3 || state.adcBatchErrors % 100 === 0) {
      addLog("ERR", `${result.errors.at(-1)} | frame errors ${state.adcBatchErrors}`, true);
    }
  }
}

function ingestSynchronizedAdcFrame(frame) {
  const rateHz = clampSampleRateHz(frame.sampleRateHz || state.sampleRateHz);
  const intervalMs = 1000 / rateHz;
  const frameEnd = performance.now();
  setSampleRateUi(rateHz, intervalMs, { normalizeInput: false });
  state.saadcBaseHz = rateHz;
  state.adcBatchSize = frame.sampleCount;
  state.serialRecoveryAttempts = 0;

  if (state.lastAdcFrameSequence !== null) {
    const expectedSequence = (state.lastAdcFrameSequence + 1) & 0xFFFF;
    const missingFrames = (frame.sequence - expectedSequence) & 0xFFFF;
    if (missingFrames > 0 && missingFrames < 0x8000) {
      state.adcSequenceDrops += missingFrames;
    }
  }
  state.lastAdcFrameSequence = frame.sequence;

  frame.samples.forEach((scan, index) => {
    ["ADC0", "ADC2", "ADC3"].forEach((source) => {
      if (scan[source] === 0) state.adcZeroCounts[source] += 1;
    });
    const t = frameEnd - (frame.samples.length - 1 - index) * intervalMs;
    addSample(scan.ADC0, "ADC", { adcSource: "ADC0", valueKind: "raw", t });
    addSample(scan.ADC2, "ADC", { adcSource: "ADC2", valueKind: "raw", t });
    addSample(scan.ADC3, "ADC", { adcSource: "ADC3", valueKind: "raw", t });
  });

  state.totalAdcBatches += 1;
  state.lastAdcBatchAt = frameEnd;
  state.lastAdcBatchCount = frame.sampleCount;
  state.totalAdcBatchSamples += frame.sampleCount;
  refreshLiveStatusIfDue();
}

function appendFirmwareKeyBits(record) {
  if (!record.cipherValid || state.paused) return;

  const width = clampInteger(record.cipherWidthBits, 1, 14, 8);
  const key = record.keyByte & getCipherMask(width);
  const bits = [];
  for (let bitIndex = width - 1; bitIndex >= 0; bitIndex -= 1) {
    bits.push((key >> bitIndex) & 1);
  }

  const now = performance.now();
  const source = `Firmware ENCF key ADC${record.keyChannel}`;
  state.bits.push(...bits.map((bit) => ({
    t: now,
    bit,
    adcSource: `ADC${record.keyChannel}`,
    source,
  })));
  state.totalBits += bits.length;
  state.bitSource = source;
  if (state.bits.length > state.maxBits) {
    state.bits.splice(0, state.bits.length - state.maxBits);
  }
  if (!state.bitPlaneCapacity) ensureBitPlaneCapacity();
  bits.forEach((bit) => writeBitToPlane(bit, `ADC${record.keyChannel}`));
  state.needsBitDraw = true;
}

function ingestFirmwareEncryptionFrame(frame) {
  if (!frame || state.paused) return;

  state.firmwareEncryptionActive = true;
  state.firmwareEncryptionMode = frame.switchPpgPhase || frame.switchBitPhase
    ? "switching"
    : "concurrent";
  state.firmwareEncryptionFrameCount += 1;
  state.firmwarePartialKeyBits = frame.partialKeyBits;

  if (state.firmwareEncryptionSequence !== null) {
    const expectedSequence = (state.firmwareEncryptionSequence + 1) & 0xFFFF;
    const missingFrames = (frame.sequence - expectedSequence) & 0xFFFF;
    if (missingFrames > 0 && missingFrames < 0x8000) {
      state.firmwareEncryptionDropped += missingFrames;
    }
  }
  state.firmwareEncryptionSequence = frame.sequence;

  if (!frame.cipherValid) {
    state.firmwareEncryptionPending += 1;
    updateEncryptionUi();
    return;
  }

  const width = clampInteger(frame.cipherWidthBits, 1, 14, 8);
  const mask = getCipherMask(width);
  const signalAdc = clampInteger(frame.signalAdc, 0, 16383, 0);
  const key = frame.keyByte & mask;
  const cipherMasked = frame.cipherByte & mask;
  const recoveredMasked = (cipherMasked ^ key) & mask;
  const plainMasked = frame.plainValid
    ? frame.plainByte & mask
    : recoveredMasked;
  const highBits = signalAdc & ~mask;
  const plainAdc = highBits | plainMasked;
  const cipherAdc = highBits | cipherMasked;
  const t = performance.now();
  const keyBits = Array.from({ length: width }, (_, index) => (
    (key >> (width - 1 - index)) & 1
  )).join("");
  const record = {
    t,
    channel: "ADC",
    adcSource: `ADC${frame.signalChannel}`,
    rawAdcCode: signalAdc,
    adcCode: plainAdc,
    plainFilter: frame.plainValid ? "firmware ENCF" : "firmware recovered",
    cipherWidthBits: width,
    plainMasked,
    key,
    keyBits,
    cipherMasked,
    cipher: cipherAdc,
    method: "firmware throughput mix",
    bitSource: `ADC${frame.keyChannel}`,
    firmwareFrame: true,
    firmwareFlags: frame.flags,
    firmwareSequence: frame.sequence,
    firmwareSampleIndex: frame.sampleIndex,
    firmwarePlainAvailable: frame.plainValid,
    firmwareRecoveredMasked: recoveredMasked,
  };

  // Concurrent firmware suppresses duplicate ADCF traffic and carries the
  // raw ADC2 sample in each valid ENCF record.
  if (frame.plainValid && !frame.switchPpgPhase && !frame.switchBitPhase) {
    addSample(signalAdc, "ADC", {
      adcSource: `ADC${frame.signalChannel}`,
      valueKind: "raw",
      t,
    });
  }

  state.encryptedPpg.push(record);
  state.encryptedCount += 1;
  state.lastEncrypted = record;
  trimEncryptedHistory();
  appendFirmwareKeyBits(frame);
  state.needsCipherDraw = true;
  state.needsBitDraw = true;
  refreshLiveStatusIfDue(true);
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

  state.totalAdcBatches += 1;
  state.lastAdcBatchAt = performance.now();
  state.lastAdcBatchCount = limitedValues.length;
  state.totalAdcBatchSamples += limitedValues.length;
  if (expectedCount !== limitedValues.length) {
    addLog("RX", `ADC${match[1]}B count ${limitedValues.length}/${expectedCount}`);
  }
  refreshLiveStatusIfDue();
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
  if (parseAdcGainStatusSegment(segment)) return true;
  if (parsePingStatusSegment(segment)) return true;

  if (/^(DFU|PONG|GPIO)\b/i.test(segment)) {
    addLog("RX", segment);
    return true;
  }

  return false;
}

function parsePingStatusSegment(segment) {
  if (!/^PONG\b/i.test(segment)) return false;

  const blockDrop = segment.match(/\bADC_BLOCK_DROP\s*[,=:]\s*(\d+)\b/i);
  if (blockDrop) {
    state.firmwareAdcBlockDrops = Number.parseInt(blockDrop[1], 10);
  }
  addLog("RX", segment);
  return true;
}

function parseAdcGainStatusSegment(segment) {
  if (!/^GAIN\b/i.test(segment)) return false;

  const parsed = {};
  const matches = [...segment.matchAll(/ADC([023])\s*,\s*CODE\s*[,=:]\s*(\d+)\s*,\s*VALUE\s*[,=:]\s*([^,\s;]+)/gi)];
  if (new Set(matches.map((match) => `ADC${match[1]}`)).size === 3) {
    state.perChannelGainSupported = true;
  }
  matches.forEach((match) => {
    const source = `ADC${match[1]}`;
    const code = clampInteger(match[2], 0, ADC_GAIN_OPTIONS.length - 1, 0);
    parsed[source] = { code, label: match[3] || getAdcGainOption(code).label };
  });

  if (!Object.keys(parsed).length) {
    const codeMatch = segment.match(/\bCODE\s*[,=:]\s*(\d+)/i);
    const code = codeMatch
      ? clampInteger(codeMatch[1], 0, ADC_GAIN_OPTIONS.length - 1, 0)
      : 0;
    const labelMatch = segment.match(/\bVALUE\s*[,=:]\s*([^,\s;]+)/i);
    const label = labelMatch?.[1] || getAdcGainOption(code).label;
    ["ADC0", "ADC2", "ADC3"].forEach((source) => {
      parsed[source] = { code, label };
    });
  }

  const changed = ["ADC0", "ADC2", "ADC3"].some(
    (source) => parsed[source] && parsed[source].code !== state.adcGainCodes[source],
  );
  if (changed && state.samples.length) {
    clearSamples();
    addLog("SYS", "ADC gain changed; buffered samples and cipher state cleared");
  }
  setAdcGainUi(parsed, { normalizeInput: true });
  addLog("RX", segment);
  return true;
}

function parseFirmwareInfoSegment(segment) {
  if (!/^VER\b/i.test(segment)) return false;
  const match = segment.match(/\bFW\s*,\s*([^,\s;]+)/i);
  if (match) {
    state.firmwareVersion = match[1];
  }
  const protocolMatch = segment.match(/\bPROTO\s*,\s*([^,\s;]+)/i);
  state.perChannelGainSupported = false;
  state.firmwareProtocol = protocolMatch?.[1] || "";
  if (protocolMatch) {
    state.perChannelGainSupported = /gain-v4/i.test(state.firmwareProtocol);
  }
  addLog("RX", segment);
  return true;
}

function parseAdcStatusSegment(segment) {
  if (/^ADC\b/i.test(segment) && /\bCOUNT\s*[,=:]\s*3\b/i.test(segment)) {
    state.bitAdcSource = "ADC3";
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
  const hzMatch = segment.match(/\bADC_HZ\s*[,=:]\s*(\d+)\b/i)
    || segment.match(/\bRAW_HZ\s*[,=:]\s*(\d+)\b/i);
  const periodMatch = segment.match(/\bPERIOD_US\s*[,=:]\s*(\d+)\b/i);
  const batchMatch = segment.match(/\bBATCH\s*[,=:]\s*(\d+)\b/i);
  const hz = hzMatch ? Number.parseInt(hzMatch[1], 10) : null;
  const periodUs = periodMatch ? Number.parseInt(periodMatch[1], 10) : null;
  const intervalMs = Number.isFinite(periodUs) && periodUs > 0 ? periodUs / 1000 : null;
  setSampleRateUi(hz, intervalMs, { normalizeInput: true });
  if (Number.isFinite(hz) && hz > 0) state.saadcBaseHz = hz;
  if (batchMatch) state.adcBatchSize = Number.parseInt(batchMatch[1], 10);
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

function getSwitchingExtractor(method, adcSource) {
  const key = `${method}:${adcSource}`;
  if (!state.switching.extractors[key]) {
    state.switching.extractors[key] = {
      baseline: null,
      warmup: 0,
      previous: null,
      pairBit: null,
      window: [],
      sum: 0,
    };
  }
  return state.switching.extractors[key];
}

function collectSwitchingBitsForMethod(value, adcSource, method) {
  const rounded = Math.round(value);
  if (method === "lsb") return [rounded & 1];
  if (method === "lsb2" || method === "lsb4") {
    const bitCount = method === "lsb4" ? 4 : 2;
    const bits = [];
    for (let bitIndex = bitCount - 1; bitIndex >= 0; bitIndex -= 1) {
      bits.push((rounded >> bitIndex) & 1);
    }
    return bits;
  }

  const extractor = getSwitchingExtractor(method, adcSource);
  if (method === "ma-threshold" || method === "ma-threshold-vn") {
    let bits = [];
    if (extractor.window.length >= state.liveMaWindow) {
      const threshold = (extractor.sum / extractor.window.length) + state.liveMaOffset;
      const rawBit = value > threshold ? 1 : 0;
      bits = method === "ma-threshold-vn"
        ? collectVonNeumannBit(rawBit, extractor)
        : [rawBit];
    }
    extractor.window.push(value);
    extractor.sum += value;
    if (extractor.window.length > state.liveMaWindow) {
      extractor.sum -= extractor.window.shift();
    }
    return bits;
  }

  if (method === "delta" || method === "delta-vn") {
    if (extractor.previous === null) {
      extractor.previous = value;
      return [];
    }
    const delta = value - extractor.previous;
    extractor.previous = value;
    if (delta === 0) return [];
    const rawBit = delta > 0 ? 1 : 0;
    return method === "delta-vn" ? collectVonNeumannBit(rawBit, extractor) : [rawBit];
  }

  if (method === "residual" || method === "residual-vn") {
    if (extractor.baseline === null) {
      extractor.baseline = value;
      extractor.warmup = 1;
      return [];
    }
    const residual = value - extractor.baseline;
    extractor.baseline += NOISE_BASELINE_ALPHA * residual;
    extractor.warmup += 1;
    if (extractor.warmup < NOISE_WARMUP_SAMPLES || residual === 0) return [];
    const rawBit = residual > 0 ? 1 : 0;
    return method === "residual-vn" ? collectVonNeumannBit(rawBit, extractor) : [rawBit];
  }

  return [];
}

function collectSwitchingBits(value, adcSource) {
  const method = state.bitGenerationMethod;
  const methods = method === "throughput-all"
    ? getThroughputBitMethods()
    : [method];
  return methods.flatMap((candidate) => collectSwitchingBitsForMethod(value, adcSource, candidate));
}

function appendSwitchingEncryptionBits(bits, adcSource) {
  if (!state.encryptionEnabled || adcSource !== state.encryptionSource || !bits.length) return;
  state.keyBits.push(...bits);
  if (state.keyBits.length > MAX_KEY_BITS) {
    state.keyBits.splice(0, state.keyBits.length - MAX_KEY_BITS);
  }
  state.bitSource = `${adcSource} switching TRNG`;
  processEncryptionQueue();
  updateEncryptionUi();
  state.needsCipherDraw = true;
}

function usesSwitchingEncryptionSource() {
  return state.switching.active && ["ADC0", "ADC2"].includes(state.encryptionSource);
}

function getSwitchingModeLabel(mode = state.switching.mode) {
  return mode === "adc2-adc3" ? "ADC2 4095 / ADC3" : "DACB 4095 / 2048";
}

function getSwitchingTrngInputMap() {
  return state.switching.mode === "adc2-adc3"
    ? { ADC0: "ADC0", ADC2: "ADC3" }
    : { ADC0: "ADC0", ADC2: "ADC2" };
}

function getSwitchingTrngInputSource(panelSource) {
  return getSwitchingTrngInputMap()[panelSource] || panelSource;
}

function getSwitchingPhaseDac(phase) {
  return state.switching.mode === "adc2-adc3"
    ? state.switching.dacPpg
    : (phase === "ppg" ? state.switching.dacPpg : state.switching.dacTrng);
}

function resetSwitchingData() {
  state.switching.samples = {
    ADC0: { ppg: [], trng: [] },
    ADC2: { ppg: [], trng: [] },
  };
  state.switching.bits = { ADC0: [], ADC2: [] };
  state.switching.extractors = {};
  state.switching.cycles = 0;
  state.switching.phase = state.switching.active ? state.switching.phase : "idle";
  state.needsSwitchDraw = true;
}

function getSwitchingNumber(control, fallback, min, max) {
  const value = Number.parseInt(control?.value, 10);
  return Number.isFinite(value) ? clampInteger(value, min, max, fallback) : fallback;
}

function updateSwitchingSettings() {
  state.switching.mode = els.switchMode?.value === "adc2-adc3" ? "adc2-adc3" : "dac";
  state.switching.ppgMs = getSwitchingNumber(els.switchPpgSeconds, 5, 1, 3600) * 1000;
  state.switching.trngMs = getSwitchingNumber(els.switchTrngSeconds, 5, 1, 3600) * 1000;
  state.switching.settleMs = getSwitchingNumber(els.switchSettleMs, 200, 0, 10000);
  state.switching.dacTrng = clampDac(els.switchDacTrng?.value || 2048);
  state.switching.dacPpg = clampDac(els.switchDacPpg?.value || 4095);
  if (els.switchPpgSeconds) els.switchPpgSeconds.value = String(state.switching.ppgMs / 1000);
  if (els.switchTrngSeconds) els.switchTrngSeconds.value = String(state.switching.trngMs / 1000);
  if (els.switchSettleMs) els.switchSettleMs.value = String(state.switching.settleMs);
  if (els.switchMode) els.switchMode.value = state.switching.mode;
  if (els.switchDacTrng) els.switchDacTrng.value = String(state.switching.dacTrng);
  if (els.switchDacPpg) els.switchDacPpg.value = String(state.switching.dacPpg);
}

function updateSwitchingFilterControls() {
  if (els.switchWindowSize) els.switchWindowSize.value = String(state.maxSamples);
  if (els.switchFilterMode && els.filterMode) els.switchFilterMode.value = els.filterMode.value;
}

function updateSwitchingUi() {
  const switching = state.switching;
  if (els.switchStartButton) els.switchStartButton.textContent = switching.active ? "Stop switching" : "Start switching";
  if (els.switchMode) els.switchMode.disabled = switching.active;
  if (els.switchStatus) {
    if (!switching.active) {
      els.switchStatus.textContent = switching.cycles
        ? `Stopped after ${switching.cycles} cycle${switching.cycles === 1 ? "" : "s"} | ${getSwitchingModeLabel()}`
        : `Ready | ${getSwitchingModeLabel()}`;
    } else {
      const elapsed = Math.max(0, performance.now() - switching.phaseStartedAt);
      const remaining = Math.max(0, switching.phaseDurationMs - elapsed);
      const dac = getSwitchingPhaseDac(switching.phase);
      els.switchStatus.textContent = `${switching.phase.toUpperCase()} phase | ${getSwitchingModeLabel()} | DACB ${dac} | ${Math.ceil(remaining / 1000)} s remaining | cycles ${switching.cycles}`;
    }
  }
  const phaseLabels = { ppg: "PPG", trng: "TRNG", idle: "idle" };
  const captionKeys = {
    ADC0: { ppg: "switchAdc0PpgCaption", trng: "switchAdc0TrngCaption" },
    ADC2: { ppg: "switchAdc2PpgCaption", trng: "switchAdc2TrngCaption" },
  };
  ["ADC0", "ADC2"].forEach((source) => {
    const ppgCount = switching.samples[source].ppg.length;
    const bitCount = switching.bits[source].length;
    const ppgCaption = els[captionKeys[source].ppg];
    const trngCaption = els[captionKeys[source].trng];
    if (ppgCaption) ppgCaption.textContent = `${ppgCount} samples | ${phaseLabels.ppg} DACB ${switching.dacPpg} | ${getFilterDescription()} | window ${state.maxSamples}`;
    if (trngCaption) trngCaption.textContent = `${bitCount} bits | ${phaseLabels.trng} input ${getSwitchingTrngInputSource(source)} | ${getBitMethodLabel()}`;
  });
}

function setSwitchingPhase(phase) {
  const switching = state.switching;
  switching.phase = phase;
  switching.phaseStartedAt = performance.now();
  switching.phaseDurationMs = phase === "ppg" ? switching.ppgMs : switching.trngMs;
  const dac = getSwitchingPhaseDac(phase);
  state.dacValues.B = dac;
  if (getSelectedDacTarget() === "B") setDacValue(dac, "switching");
  sendCommand(`B${dac}`).catch((error) => addLog("ERR", `Switching DACB: ${error.message || error}`, true));
  updateSwitchingUi();
  state.needsSwitchDraw = true;
}

function checkSwitchingPhase() {
  const switching = state.switching;
  if (!switching.active) return;
  if (performance.now() - switching.phaseStartedAt < switching.phaseDurationMs) {
    updateSwitchingUi();
    return;
  }
  const nextPhase = switching.phase === "ppg" ? "trng" : "ppg";
  if (nextPhase === "ppg") switching.cycles += 1;
  setSwitchingPhase(nextPhase);
}

function stopSwitchingMode() {
  const wasActive = state.switching.active;
  if (state.switching.timer !== null) {
    window.clearInterval(state.switching.timer);
    state.switching.timer = null;
  }
  state.switching.active = false;
  state.switching.phase = "idle";
  state.switching.phaseDurationMs = 0;
  if (wasActive && state.encryptionEnabled) resetLiveEncryption();
  updateSwitchingUi();
  updateEncryptionUi();
  state.needsSwitchDraw = true;
}

function startSwitchingMode() {
  if (state.switching.active) {
    stopSwitchingMode();
    addLog("SYS", "Single-sensor switching stopped");
    return;
  }
  updateSwitchingSettings();
  resetSwitchingData();
  if (state.encryptionEnabled) resetLiveEncryption();
  state.switching.active = true;
  setSwitchingPhase("ppg");
  state.switching.timer = window.setInterval(checkSwitchingPhase, 25);
  updateSwitchingUi();
  addLog("SYS", `Single-sensor switching started (${getSwitchingModeLabel()}): PPG ${state.switching.ppgMs / 1000}s / TRNG ${state.switching.trngMs / 1000}s`);
}

function clearSwitchingMode() {
  const active = state.switching.active;
  if (active) stopSwitchingMode();
  resetSwitchingData();
  updateSwitchingUi();
  drawSwitchingComparison();
  addLog("SYS", "Cleared ADC0/ADC2 switching comparison");
}

function recordSwitchingSample(value, adcSource, sampleTime) {
  const switching = state.switching;
  if (!switching.active || !Number.isFinite(value)) return;
  const t = Number.isFinite(sampleTime) ? sampleTime : performance.now();
  const phaseAge = t - switching.phaseStartedAt;
  if (phaseAge < switching.settleMs || phaseAge > switching.phaseDurationMs) return;

  if (switching.phase === "ppg") {
    if (!["ADC0", "ADC2"].includes(adcSource)) return;
    switching.samples[adcSource].ppg.push({ t, value });
  } else if (switching.phase === "trng") {
    const panelSource = Object.entries(getSwitchingTrngInputMap())
      .find(([, inputSource]) => inputSource === adcSource)?.[0];
    if (!panelSource) return;
    const bits = collectSwitchingBits(value, adcSource);
    switching.bits[panelSource].push(...bits);
    if (switching.bits[panelSource].length > state.maxBits) {
      switching.bits[panelSource].splice(0, switching.bits[panelSource].length - state.maxBits);
    }
    appendSwitchingEncryptionBits(bits, panelSource);
  }
  state.needsSwitchDraw = true;
}

function addSample(value, channel = "ADC", options = {}) {
  if (state.paused) return;

  const normalizedChannel = normalizeChannel(channel) || "ADC";
  const adcSource = normalizeAdcSource(options.adcSource) || state.adcSource;
  recordSwitchingSample(value, adcSource, options.t);
  if (normalizedChannel === "ADC"
    && adcSource === state.bitAdcSource
    && !state.firmwareEncryptionActive
    && !(state.encryptionEnabled && usesSwitchingEncryptionSource())) {
    extractLiveBitsFromNoiseSample(value, adcSource, options.t);
  }
  const valueKind = options.valueKind || "raw";
  commitSample(value, normalizedChannel, adcSource, valueKind, options.t);
}

function getPlotRefreshIntervalMs() {
  const retainedCount = getRetainedSampleCount();
  if (retainedCount > 250000) return 500;
  if (retainedCount > 100000) return 250;
  if (retainedCount > 50000) return 100;
  return 33;
}

function getStatsRefreshIntervalMs() {
  const retainedCount = getRetainedSampleCount();
  if (retainedCount > 250000) return 1000;
  if (retainedCount > 100000) return 500;
  if (retainedCount > 50000) return 250;
  return 160;
}

function commitSample(value, normalizedChannel = "ADC", adcSource = state.adcSource, valueKind = "raw", sampleTime = null) {
  const sample = {
    t: Number.isFinite(sampleTime) ? sampleTime : performance.now(),
    value,
    channel: normalizedChannel || "ADC",
    adcSource: normalizeAdcSource(adcSource) || state.adcSource,
    valueKind,
  };
  state.latest = value;
  state.latestChannel = sample.channel;
  state.samples.push(sample);
  state.totalSamples += 1;

  trimSampleHistory();

  const now = performance.now();
  if (now - state.lastStatsAt > getStatsRefreshIntervalMs()) {
    state.lastStatsAt = now;
    updateStats();
  }
  enqueuePpgEncryption(sample);
  state.needsDraw = true;
  state.needsBitAdc2Draw = true;
}

function trimSampleHistory() {
  const retainedPerSource = state.maxSamples + getFilterContextSamples();
  const counts = new Map();
  state.samples.forEach((sample) => {
    const source = sample.adcSource || state.adcSource;
    counts.set(source, (counts.get(source) || 0) + 1);
  });

  const discard = new Map(
    [...counts.entries()].map(([source, count]) => [source, Math.max(0, count - retainedPerSource)]),
  );
  if (![...discard.values()].some((count) => count > 0)) return;

  state.samples = state.samples.filter((sample) => {
    const source = sample.adcSource || state.adcSource;
    const remaining = discard.get(source) || 0;
    if (remaining <= 0) return true;
    discard.set(source, remaining - 1);
    return false;
  });
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
  if (method === "throughput-all") return "Throughput mix";
  if (method === "ma-threshold") return "MA threshold";
  if (method === "ma-threshold-vn") return "MA threshold VN";
  if (method === "residual-vn") return "Residual VN";
  if (method === "delta-vn") return "Delta VN";
  if (method === "lsb") return "LSB";
  if (method === "lsb2") return "LSB x2";
  if (method === "lsb4") return "LSB x4";
  return method || "--";
}

function isMovingAverageBitMethod(method = state.bitGenerationMethod) {
  return method === "ma-threshold" || method === "ma-threshold-vn" || method === "throughput-all";
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
  state.cipherPlainFilters = {};
  state.liveBitExtractors = {};
  state.bitInputEvents = [];
  state.totalBitInputSamples = 0;
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

function collectVonNeumannBit(rawBit, extractor) {
  if (extractor.pairBit === null) {
    extractor.pairBit = rawBit;
    return [];
  }

  const previousBit = extractor.pairBit;
  extractor.pairBit = null;
  if (previousBit === rawBit) return [];
  return [previousBit === 0 && rawBit === 1 ? 0 : 1];
}

function getThroughputBitMethods() {
  return ["ma-threshold", "ma-threshold-vn", "residual", "residual-vn", "delta", "delta-vn", "lsb4"];
}

function collectLiveBitsForMethod(value, adcSource, method) {
  const source = normalizeAdcSource(adcSource) || state.bitAdcSource;
  const rounded = Math.round(value);

  if (method === "lsb") return [rounded & 1];
  if (method === "lsb2" || method === "lsb4") {
    const bitCount = method === "lsb4" ? 4 : 2;
    const bits = [];
    for (let bitIndex = bitCount - 1; bitIndex >= 0; bitIndex -= 1) {
      bits.push((rounded >> bitIndex) & 1);
    }
    return bits;
  }

  const extractor = getLiveBitExtractor(method, source);

  if (method === "ma-threshold" || method === "ma-threshold-vn") {
    const windowSize = state.liveMaWindow;
    const offset = state.liveMaOffset;
    let bits = [];
    if (extractor.window.length >= windowSize) {
      const threshold = (extractor.sum / extractor.window.length) + offset;
      const rawBit = value > threshold ? 1 : 0;
      bits = method === "ma-threshold-vn"
        ? collectVonNeumannBit(rawBit, extractor)
        : [rawBit];
    }
    extractor.window.push(value);
    extractor.sum += value;
    if (extractor.window.length > windowSize) {
      extractor.sum -= extractor.window.shift();
    }
    return bits;
  }

  if (method === "delta" || method === "delta-vn") {
    if (extractor.previous === null) {
      extractor.previous = value;
      return [];
    }
    const delta = value - extractor.previous;
    extractor.previous = value;
    if (delta === 0) return [];
    const rawBit = delta > 0 ? 1 : 0;
    return method === "delta-vn" ? collectVonNeumannBit(rawBit, extractor) : [rawBit];
  }

  if (method === "residual" || method === "residual-vn") {
    if (extractor.baseline === null) {
      extractor.baseline = value;
      extractor.warmup = 1;
      return [];
    }

    const residual = value - extractor.baseline;
    extractor.baseline += NOISE_BASELINE_ALPHA * residual;
    extractor.warmup += 1;

    if (extractor.warmup < NOISE_WARMUP_SAMPLES || residual === 0) return [];
    const rawBit = residual > 0 ? 1 : 0;
    return method === "residual-vn" ? collectVonNeumannBit(rawBit, extractor) : [rawBit];
  }

  return [];
}

function extractLiveBitsFromNoiseSample(value, adcSource = state.bitAdcSource, sampleTime = null) {
  const source = normalizeAdcSource(adcSource) || state.bitAdcSource;
  if (source !== state.bitAdcSource || !Number.isFinite(value)) return;
  if (!state.bitMode) return;

  state.bitInputEvents.push({
    t: Number.isFinite(sampleTime) ? sampleTime : performance.now(),
    adcSource: source,
  });
  state.totalBitInputSamples += 1;
  if (state.bitInputEvents.length > MAX_RATE_HISTORY) {
    state.bitInputEvents.splice(0, state.bitInputEvents.length - MAX_RATE_HISTORY);
  }

  const method = state.bitGenerationMethod;
  if (method === "throughput-all") {
    const bits = getThroughputBitMethods()
      .flatMap((candidate) => collectLiveBitsForMethod(value, source, candidate));
    addBits(bits, source, `${source} throughput mix`);
    return;
  }

  addBits(collectLiveBitsForMethod(value, source, method), source, getBitMethodLabel(method));
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

function getRecentBitInputRate() {
  return estimateRecentRate(state.bitInputEvents);
}

function getAdcBatchStatusText() {
  if (!state.totalAdcBatches) return "ADCF waiting";
  const ageMs = performance.now() - state.lastAdcBatchAt;
  const staleText = ageMs > 3000 ? " stale" : "";
  const errors = state.adcBatchErrors ? ` err ${state.adcBatchErrors}` : "";
  const drops = state.adcSequenceDrops ? ` drop ${state.adcSequenceDrops}` : "";
  const zeros = Object.entries(state.adcZeroCounts)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => `${source}=0:${count}`)
    .join(",");
  const zeroText = zeros ? ` zero ${zeros}` : "";
  const firmwareDrops = state.firmwareAdcBlockDrops
    ? ` fw-block-drop:${state.firmwareAdcBlockDrops}`
    : "";
  return `ADCF ${state.lastAdcBatchCount}/${state.totalAdcBatchSamples}${errors}${drops}${zeroText}${firmwareDrops}${staleText}`;
}

function getCipherWindowSize() {
  return clampInteger(state.maxSamples, MIN_MAX_SAMPLES, MAX_ENCRYPTED_PPG, DEFAULT_MAX_SAMPLES);
}

function trimEncryptedHistory() {
  const maxRecords = getCipherWindowSize();
  if (state.encryptedPpg.length > maxRecords) {
    state.encryptedPpg.splice(0, state.encryptedPpg.length - maxRecords);
  }
}

function getCipherDisplayRecords() {
  trimEncryptedHistory();
  return state.encryptedPpg;
}

function getCipherPlainAdcCode(rawValue, adcSource, channel) {
  const rawAdcCode = clampInteger(rawValue, 0, 16383, 0);
  const filterKey = `${normalizeAdcSource(adcSource) || state.adcSource}:${normalizeChannel(channel) || "ADC"}`;
  if (!state.cipherPlainFilters[filterKey]) {
    state.cipherPlainFilters[filterKey] = { window: [], sum: 0 };
  }
  const filter = state.cipherPlainFilters[filterKey];
  filter.window.push(rawAdcCode);
  filter.sum += rawAdcCode;
  while (filter.window.length > CIPHER_SIGNAL_MA_WINDOW) {
    filter.sum -= filter.window.shift();
  }
  const filteredAdcCode = Math.round(filter.sum / filter.window.length);
  return {
    rawAdcCode,
    adcCode: clampInteger(filteredAdcCode, 0, 16383, rawAdcCode),
    filter: `MA${CIPHER_SIGNAL_MA_WINDOW}`,
  };
}

function enqueuePpgEncryption(sample) {
  if (!state.encryptionEnabled) return;
  if (state.firmwareEncryptionActive) return;
  if (!Number.isFinite(sample.value)) return;
  const adcSource = normalizeAdcSource(sample.adcSource) || state.adcSource;
  if (adcSource !== state.encryptionSource) return;
  if (usesSwitchingEncryptionSource()) {
    const phaseAge = sample.t - state.switching.phaseStartedAt;
    if (state.switching.phase !== "ppg"
      || phaseAge < state.switching.settleMs
      || phaseAge > state.switching.phaseDurationMs) return;
  }
  const cipherPlain = getCipherPlainAdcCode(sample.value, adcSource, sample.channel);
  state.pendingPpg.push({
    t: sample.t,
    channel: sample.channel,
    adcSource,
    rawAdcCode: cipherPlain.rawAdcCode,
    adcCode: cipherPlain.adcCode,
    plainFilter: cipherPlain.filter,
  });
  if (state.pendingPpg.length > MAX_PENDING_PPG) {
    state.pendingPpg.shift();
    state.droppedPpg += 1;
  }
  processEncryptionQueue();
  refreshLiveStatusIfDue();
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
    trimEncryptedHistory();
    state.needsCipherDraw = true;
  }
}

function refreshLiveStatusIfDue(force = false) {
  const now = performance.now();
  if (!force && now - state.lastLiveStatusAt < LIVE_STATUS_REFRESH_MS) return;
  state.lastLiveStatusAt = now;
  updateBitStats({ updateEncryption: false });
  updateEncryptionUi();
}

function updateEncryptionUi() {
  const latest = state.lastEncrypted;
  const firmwareActive = state.firmwareEncryptionActive;
  if (els.encryptionToggle) {
    els.encryptionToggle.checked = state.encryptionEnabled;
  }
  if (els.encryptionSource) els.encryptionSource.value = state.encryptionSource;
  if (els.keyBitCount) {
    els.keyBitCount.textContent = String(firmwareActive ? state.firmwarePartialKeyBits : state.keyBits.length);
  }
  if (els.encryptionPending) {
    els.encryptionPending.textContent = String(firmwareActive ? state.firmwareEncryptionPending : state.pendingPpg.length);
  }
  if (els.encryptionCount) els.encryptionCount.textContent = String(state.encryptedCount);
  if (els.encryptionStatus) {
    if (firmwareActive) {
      const signalChannel = latest?.adcSource || "ADC2";
      const keyChannel = latest?.bitSource || "ADC3";
      const width = latest?.cipherWidthBits || 8;
      const phase = state.firmwareEncryptionMode === "concurrent"
        ? "CONCURRENT"
        : (latest?.firmwareFlags & 0x10 ? "SWITCH BIT" : "SWITCH PPG");
      const dropped = state.firmwareEncryptionDropped ? ` | dropped ${state.firmwareEncryptionDropped}` : "";
      els.encryptionStatus.textContent = `Firmware ENCF | ${signalChannel} signal | ${keyChannel} key | ${phase} | ${latest?.method || "firmware"} | ${width}-bit cipher | valid ${state.encryptedCount} | pending ${state.firmwareEncryptionPending} | frames ${state.firmwareEncryptionFrameCount}${dropped}`;
    } else {
      const dropped = state.droppedPpg ? ` | dropped ${state.droppedPpg}` : "";
      const encryptionText = state.encryptionEnabled ? "encryption on" : "encryption off";
      const modeText = state.bitMode ? "extracting" : "extraction off";
      const signalRate = getRecentSignalRateHz();
      const requiredKeyRate = signalRate * state.cipherWidthBits;
      const keyRate = getRecentKeyBitRate();
      const bitInputRate = getRecentBitInputRate();
      const rateText = state.encryptionEnabled
        ? ` | key ${keyRate.toFixed(0)}/${requiredKeyRate.toFixed(0)} bps`
        : "";
      const inputText = state.bitMode ? ` | input ${bitInputRate.toFixed(0)} sps` : "";
      const pendingReason = state.encryptionEnabled && state.pendingPpg.length && requiredKeyRate > 0 && keyRate < requiredKeyRate
        ? " | key slow"
        : "";
      const methodParams = isMovingAverageBitMethod()
        ? ` | window ${state.liveMaWindow}, offset ${state.liveMaOffset}`
        : "";
      const batchText = state.bitMode ? ` | ${getAdcBatchStatusText()}` : "";
      const cipherWindowText = ` | cipher window ${state.encryptedPpg.length}/${getCipherWindowSize()}`;
      const switchingKeySource = usesSwitchingEncryptionSource()
        ? `${state.encryptionSource} switching TRNG (${getSwitchingTrngInputSource(state.encryptionSource)})`
        : `${state.bitAdcSource} live`;
      const keySource = switchingKeySource;
      els.encryptionStatus.textContent = `${state.encryptionSource} signal | ${keySource} key | ${getBitMethodLabel()}${methodParams} | plain MA${CIPHER_SIGNAL_MA_WINDOW} | ${state.cipherWidthBits}-bit cipher | ${encryptionText} | ${modeText}${batchText}${inputText}${rateText}${cipherWindowText} | queue ${state.keyBits.length} bits | pending ${state.pendingPpg.length}${pendingReason}${dropped}`;
    }
  }

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

  if (!state.bitPlaneCapacity) ensureBitPlaneCapacity();
  normalizedBits.forEach((bit) => writeBitToPlane(bit, normalizedSource));
  processEncryptionQueue();
  refreshLiveStatusIfDue();
  state.needsBitDraw = true;
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
    els.sampleCount.textContent = String(displaySamples.length);
    els.plotCaption.textContent = `Waiting for samples | ${getAdcPlotDescription()} | ${getSampleRateDescription()} | ${getValueDescription()} | ${getFilterDescription()}`;
    return;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  values.forEach((value) => {
    min = Math.min(min, value);
    max = Math.max(max, value);
    sum += value;
  });
  const avg = sum / values.length;
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
  els.sampleCount.textContent = String(displaySamples.length);
  els.plotCaption.textContent = `${displaySamples.length} samples/channel in view | ${getAdcPlotDescription()} | ${getSampleRateDescription()} | ${getValueDescription()} | ${getFilterDescription()}`;
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

function updateBitStats(options = {}) {
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
  updateNistSourceStatus();
  if (options.updateEncryption !== false) updateEncryptionUi();
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
  if (!state.bitPlaneCapacity) ensureBitPlaneCapacity();
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

const DYNAMIC_TEXT_SELECTOR = [
  ".metric strong",
  ".bit-stat strong",
  ".status-dot",
  ".mode-pill",
  ".filter-summary",
  ".plot-toolbar p",
  ".bit-adc2-header p",
].join(", ");

function fitTextToBox(element) {
  if (!element?.isConnected || element.clientWidth <= 0) return;

  element.style.removeProperty("font-size");
  const computedSize = Number.parseFloat(window.getComputedStyle(element).fontSize);
  if (!Number.isFinite(computedSize)) return;

  const minimumSize = element.matches(".metric strong") ? 16 : 10;
  let size = computedSize;
  element.style.fontSize = `${size}px`;
  while (size > minimumSize && element.scrollWidth > element.clientWidth + 1) {
    size = Math.max(minimumSize, size - 0.5);
    element.style.fontSize = `${size}px`;
  }
}

function fitDynamicText() {
  document.querySelectorAll(DYNAMIC_TEXT_SELECTOR).forEach(fitTextToBox);
}

function setupDynamicTextFitting() {
  const targets = [...document.querySelectorAll(DYNAMIC_TEXT_SELECTOR)];
  if (!targets.length) return;

  let framePending = false;
  const scheduleFit = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      framePending = false;
      fitDynamicText();
    });
  };

  targets.forEach((target) => {
    const mutationObserver = new MutationObserver(scheduleFit);
    mutationObserver.observe(target, { childList: true, characterData: true, subtree: true });
    const resizeObserver = new ResizeObserver(scheduleFit);
    resizeObserver.observe(target);
  });
  fitDynamicText();
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
  trimSampleHistory();
  trimEncryptedHistory();
  updateStats();
  updateEncryptionUi();
  updateSwitchingFilterControls();
  state.needsDraw = true;
  state.needsCipherDraw = true;
  state.needsSwitchDraw = true;
}

function clampSampleRateHz(value) {
  return clampInteger(value, MIN_SAMPLE_RATE_HZ, MAX_SAMPLE_RATE_HZ, DEFAULT_SAMPLE_RATE_HZ);
}

function rateHzToIntervalMs(rateHz) {
  return 1000 / clampSampleRateHz(rateHz);
}

function setSampleRateUi(rateHz, intervalMs = null, options = {}) {
  const nextRate = clampSampleRateHz(rateHz ?? state.sampleRateHz);
  const nextInterval = Number.isFinite(intervalMs) && intervalMs > 0
    ? intervalMs
    : rateHzToIntervalMs(nextRate);
  const rateChanged = nextRate !== state.sampleRateHz;
  state.sampleIntervalMs = nextInterval;
  state.sampleRateHz = nextRate;

  if (rateChanged && state.samples.length) {
    trimSampleHistory();
  }

  if (options.normalizeInput !== false && els.sampleRate) {
    els.sampleRate.value = String(state.sampleRateHz);
  }
}

function getAdcGainOption(code) {
  return ADC_GAIN_OPTIONS.find((option) => option.code === code) || ADC_GAIN_OPTIONS[0];
}

function supportsPerChannelGain() {
  return state.perChannelGainSupported || /gain-v4/i.test(state.firmwareProtocol);
}

function setAdcGainUi(gains, options = {}) {
  const sources = ["ADC0", "ADC2", "ADC3"];
  const controls = { ADC0: els.adcGain0, ADC2: els.adcGain2, ADC3: els.adcGain3 };
  const codes = {};
  const labels = {};
  sources.forEach((source) => {
    const requested = gains[source] || {};
    const code = clampInteger(
      requested.code,
      0,
      ADC_GAIN_OPTIONS.length - 1,
      state.adcGainCodes[source],
    );
    const option = getAdcGainOption(code);
    codes[source] = code;
    labels[source] = requested.label || option.label;
    if (controls[source] && options.normalizeInput !== false) {
      controls[source].value = String(code);
    }
  });
  state.adcGainCodes = codes;
  state.adcGainLabels = labels;
  if (els.adcGainStatus) {
    els.adcGainStatus.textContent = sources
      .map((source) => `${source} ${labels[source]}`)
      .join(" | ");
  }
  if (els.plotCaption && state.samples.length) {
    updateStats();
  }
}

async function sendAdcGainCommand() {
  const codes = [
    clampInteger(els.adcGain0?.value, 0, ADC_GAIN_OPTIONS.length - 1, state.adcGainCodes.ADC0),
    clampInteger(els.adcGain2?.value, 0, ADC_GAIN_OPTIONS.length - 1, state.adcGainCodes.ADC2),
    clampInteger(els.adcGain3?.value, 0, ADC_GAIN_OPTIONS.length - 1, state.adcGainCodes.ADC3),
  ];
  if (els.adcGainStatus) {
    els.adcGainStatus.textContent = `Applying ADC gains ${codes.join("/")}...`;
  }
  await ensureFirmwareProtocolKnown();
  if (!supportsPerChannelGain()) {
    if (new Set(codes).size !== 1) {
      const protocol = state.firmwareProtocol || "unknown";
      if (els.adcGainStatus) {
        els.adcGainStatus.textContent = "Firmware update required for channel gain";
      }
      addLog("ERR", `Per-channel gain is unavailable on firmware protocol ${protocol}; update to gain-v4 first`, true);
      return;
    }
    addLog("SYS", "Using legacy common ADC gain command");
    await sendCommand(`GAIN${codes[0]}`);
    return;
  }
  await sendCommand(`GAINSET${codes.join("")}`);
}

function applySampleRateInput(normalize = false) {
  const rawValue = String(els.sampleRate?.value ?? "").trim();
  if (!rawValue) return;
  const nextRate = clampSampleRateHz(rawValue);
  setSampleRateUi(nextRate, null, { normalizeInput: normalize });
}

async function sendSampleRateCommand() {
  applySampleRateInput(true);
  await sendCommand(`RATE${state.sampleRateHz}`);
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

function getFilterContextSamples(settings = getFilterSettings()) {
  if (settings.mode === "raw") return 0;
  if (settings.mode === "moving-average") {
    return Math.max(0, settings.windowSize - 1);
  }

  const sampleRateHz = clampSampleRateHz(state.sampleRateHz || DEFAULT_SAMPLE_RATE_HZ);
  const cutoffHz = settings.mode === "low-pass"
    ? settings.lowCutoff
    : settings.mode === "high-pass"
      ? settings.highCutoff
      : Math.min(settings.highCutoff, settings.lowCutoff);
  const timeConstantSamples = sampleRateHz / (2 * Math.PI * cutoffHz);
  return Math.min(
    MAX_FILTER_CONTEXT_SAMPLES,
    Math.max(0, Math.ceil(FILTER_WARMUP_TIME_CONSTANTS * timeConstantSamples) + 2),
  );
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
  return `ADC0/2/3 sync ${state.sampleRateHz} Hz | batch ${state.adcBatchSize} scans | ADCF v2`;
}

function getSelectedAdcPlotSources() {
  const sources = [...state.plotAdcSources].filter((source) => normalizeAdcSource(source));
  return sources.length ? sources : [state.adcSource];
}

function getSamplesForAdcSource(samples = state.samples, sources = getSelectedAdcPlotSources()) {
  if (!sources.length) return [];
  const selected = new Set(sources);
  return samples.filter((sample) => selected.has(sample.adcSource || state.adcSource));
}

function getRetainedSampleCount(source = state.adcSource) {
  return Math.min(state.maxSamples, getSamplesForAdcSource(state.samples, [source]).length);
}

function getAdcPlotDescription() {
  return getSelectedAdcPlotSources().map((source) => getAdcSourceInfo(source).label).join(" + ");
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
  updateSwitchingFilterControls();
}

function getDisplaySamples(source = state.adcSource) {
  const settings = getFilterSettings();
  const samples = getSamplesForAdcSource(state.samples, [source])
    .map(createViewSample)
    .filter((sample) => Number.isFinite(sample.value));
  const visibleStart = Math.max(0, samples.length - state.maxSamples);
  const visibleSamples = samples.slice(visibleStart);
  if (settings.mode === "raw") {
    return visibleSamples;
  }

  const filteredValues = applyFilter(samples, settings);
  return visibleSamples.map((sample, index) => {
    const sourceIndex = visibleStart + index;
    return {
      t: sample.t,
      channel: sample.channel || "ADC",
      adcSource: sample.adcSource || state.adcSource,
      valueKind: sample.valueKind,
      deviceValue: sample.deviceValue,
      adcCode: sample.adcCode,
      biasCode: sample.biasCode,
      rawValue: sample.value,
      value: filteredValues[sourceIndex],
    };
  });
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

function buildWideAdcCsvRows(selectedSources, settings, currentMode) {
  const series = new Map();
  const timeKeys = new Set();
  const start = state.samples[0]?.t || performance.now();

  selectedSources.forEach((source) => {
    const samplesByTime = new Map();
    getDisplaySamples(source).forEach((sample) => {
      const time = sample.t - start;
      const timeKey = time.toFixed(3);
      samplesByTime.set(timeKey, sample);
      timeKeys.add(timeKey);
    });
    series.set(source, samplesByTime);
  });

  const filtered = settings.mode !== "raw";
  const header = ["time_ms"];
  selectedSources.forEach((source) => {
    const base = currentMode ? `${source}_current` : source;
    header.push(base);
    if (filtered) header.push(`${base}_filtered`);
  });

  const rows = [header.join(",")];
  [...timeKeys]
    .sort((left, right) => Number(left) - Number(right))
    .forEach((timeKey) => {
      const row = [timeKey];
      selectedSources.forEach((source) => {
        const sample = series.get(source)?.get(timeKey);
        const rawValue = sample && Number.isFinite(sample.rawValue)
          ? sample.rawValue
          : sample?.value;
        row.push(Number.isFinite(rawValue) ? rawValue : "");
        if (filtered) {
          row.push(sample && Number.isFinite(sample.value) ? sample.value : "");
        }
      });
      rows.push(row.join(","));
    });

  return { rows, sampleCount: rows.length - 1 };
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

function clearSamples() {
  state.samples = [];
  state.totalSamples = 0;
  state.latest = null;
  state.totalAdcBatches = 0;
  state.lastAdcBatchAt = 0;
  state.lastAdcBatchCount = 0;
  state.totalAdcBatchSamples = 0;
  state.adcBatchErrors = 0;
  state.adcSequenceDrops = 0;
  state.adcZeroCounts = { ADC0: 0, ADC2: 0, ADC3: 0 };
  state.lastAdcFrameSequence = null;
  resetNoiseExtractor();
  resetBitAndEncryptionBuffers();
  resetFirmwareEncryptionState();
  resetSwitchingData();
  updateSwitchingUi();
  updateStats();
  updateBitStats();
  updateEncryptionUi();
  state.needsDraw = true;
  state.needsBitAdc2Draw = true;
  state.needsBitDraw = true;
  state.needsCipherDraw = true;
  drawPlot();
  drawAdc2BitPlot();
  drawBitMap();
  drawCipherPlot();
  addLog("SYS", "Cleared ADC, cipher, and bit views");
}

function exportCsv() {
  if (!state.samples.length) {
    addLog("SYS", "No samples to export");
    return;
  }

  const settings = getFilterSettings();
  const selectedSources = getSelectedAdcPlotSources();
  const currentMode = getValueMode() === "current";
  const { rows, sampleCount } = buildWideAdcCsvRows(selectedSources, settings, currentMode);

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `adc_signal_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${sampleCount} time rows from ${selectedSources.join(" + ")}`);
}

function exportCipherCsv() {
  const cipherRecords = getCipherDisplayRecords();
  if (!cipherRecords.length) {
    addLog("SYS", "No cipher samples to export");
    return;
  }

  const start = cipherRecords[0]?.t || performance.now();
  const rows = [
    "index,time_ms,channel,adc_input,cipher_width_bits,plain_adc,plain_filter,plain_raw_adc,plain_masked,key_bits,key_dec,key_hex,cipher_masked,cipher_dec,cipher_hex,method,bit_source",
  ];
  cipherRecords.forEach((entry, index) => {
    const keyHexWidth = Math.ceil((entry.cipherWidthBits || state.cipherWidthBits) / 4);
    rows.push([
      index,
      (entry.t - start).toFixed(3),
      csvCell(entry.channel),
      csvCell(entry.adcSource),
      entry.cipherWidthBits || state.cipherWidthBits,
      entry.adcCode,
      csvCell(entry.plainFilter || ""),
      Number.isFinite(entry.rawAdcCode) ? entry.rawAdcCode : "",
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
  addLog("SYS", `Exported ${cipherRecords.length} cipher samples`);
}

function resetBitAndEncryptionBuffers() {
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
  state.cipherPlainFilters = {};
  resetFirmwareEncryptionState();
  ensureBitPlaneCapacity();
}

function clearBits() {
  resetBitAndEncryptionBuffers();
  resetFirmwareEncryptionState();
  updateBitStats();
  updateEncryptionUi();
  state.needsBitDraw = true;
  state.needsCipherDraw = true;
  drawBitMap();
  drawCipherPlot();
  addLog("SYS", "Cleared cipher and bit views");
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
  const target = ["liveView", "noiseView", "nistView", "mlView", "90bView", "switchView"].includes(viewId) ? viewId : "liveView";
  [els.liveView, els.noiseView, els.nistView, els.mlView, els.entropyView, els.switchView].forEach((view) => {
    if (view) view.hidden = view.id !== target;
  });
  els.viewTabs.forEach((button) => {
    const isActive = button.dataset.viewTarget === target;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  window.requestAnimationFrame(() => {
    resizeCanvas();
    resizeBitCanvas();
    resizeNoiseBitCanvas();
    resizeSwitchingComparison();
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

function parsePackedNistBits(bytes) {
  const bits = new Uint8Array(bytes.length * 8);
  let outputIndex = 0;
  bytes.forEach((value) => {
    for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
      bits[outputIndex] = (value >> bitIndex) & 1;
      outputIndex += 1;
    }
  });
  return bits;
}

function parseByteNistBits(bytes) {
  const bits = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0 && bytes[index] !== 1) {
      throw new Error(`Binary byte format contains value ${bytes[index]} at byte ${index}; expected only 0 or 1`);
    }
    bits[index] = bytes[index];
  }
  return bits;
}

function isLikelyNistText(bytes) {
  const sample = bytes.slice(0, Math.min(bytes.length, 8192));
  if (!sample.length) return true;
  let printable = 0;
  sample.forEach((value) => {
    if (value === 9 || value === 10 || value === 13 || (value >= 32 && value <= 126)) printable += 1;
  });
  return printable / sample.length > 0.98;
}

function parseTextNistBits(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "");
  const compact = normalized.replace(/[\s,;|]+/g, "");
  if (/^[01]+$/.test(compact)) {
    return Uint8Array.from(compact, (bit) => Number(bit));
  }

  const table = parseCsvText(normalized, "auto");
  const bitHeaderPattern = /^(bit|bits|bit[_ ]?value|random[_ ]?bit|randomness[_ ]?bit|value)$/i;
  const bitColumn = table.headers.findIndex((header) => bitHeaderPattern.test(String(header).trim()));
  if (bitColumn >= 0) {
    const bits = [];
    table.rows.forEach((row) => {
      const number = parseNumberCell(row[bitColumn]);
      if (number === 0 || number === 1) bits.push(number);
    });
    if (bits.length) return Uint8Array.from(bits);
  }

  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length && lines.every((line) => line === "0" || line === "1")) {
    return Uint8Array.from(lines, (bit) => Number(bit));
  }
  throw new Error("Could not find a bit column or a 0/1 bit stream in the text file");
}

async function parseNistBitFile(file, format = "auto") {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) throw new Error("The selected bit file is empty");
  if (format === "packed") return parsePackedNistBits(bytes);
  if (format === "bytes") return parseByteNistBits(bytes);
  if (format === "text") return parseTextNistBits(new TextDecoder().decode(bytes));
  if (isLikelyNistText(bytes)) return parseTextNistBits(new TextDecoder().decode(bytes));
  if (bytes.every((value) => value === 0 || value === 1)) return parseByteNistBits(bytes);
  return parsePackedNistBits(bytes);
}

function updateNistFileStatus(message, isError = false) {
  if (!els.nistFileStatus) return;
  els.nistFileStatus.textContent = message;
  els.nistFileStatus.classList.toggle("is-error", isError);
}

async function handleNistBitFiles(fileList) {
  const files = [...(fileList || [])].sort((left, right) => left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: "base",
  }));
  if (!files.length) return;
  try {
    const format = els.nistBitFormat?.value || "auto";
    updateNistFileStatus(`Loading ${files.length.toLocaleString()} bit files...`);
    const chunks = [];
    let totalBits = 0;
    for (const file of files) {
      const chunk = await parseNistBitFile(file, format);
      chunks.push(chunk);
      totalBits += chunk.length;
    }
    const bits = new Uint8Array(totalBits);
    let writeOffset = 0;
    chunks.forEach((chunk) => {
      bits.set(chunk, writeOffset);
      writeOffset += chunk.length;
    });
    state.nistUploadedBits = bits;
    state.nistUploadedFileNames = files.map((file) => file.name);
    state.nistUploadedFileName = files.length === 1
      ? files[0].name
      : `${files.length} files (${files[0].name} ... ${files[files.length - 1].name})`;
    if (els.nistBitSource) els.nistBitSource.value = "upload";
    if (els.nistRemoveFileButton) els.nistRemoveFileButton.disabled = false;
    updateNistFileStatus(`${files.length.toLocaleString()} files | ${bits.length.toLocaleString()} bits loaded | natural filename order`);
    clearNistResults();
    if (els.nistCaption) els.nistCaption.textContent = `${files.length.toLocaleString()} uploaded files | ${bits.length.toLocaleString()} bits loaded | ready for NIST tests`;
    updateNistSourceStatus();
    updateMlSourceStatus();
    updateEntropySourceStatus();
    addLog("SYS", `Loaded ${bits.length} bits from ${files.length} NIST bit files`);
  } catch (error) {
    state.nistUploadedBits = new Uint8Array(0);
    state.nistUploadedFileName = "";
    state.nistUploadedFileNames = [];
    if (els.nistRemoveFileButton) els.nistRemoveFileButton.disabled = true;
    updateNistFileStatus(error.message || "Failed to parse bit file", true);
    addLog("ERR", `NIST bit-file load failed: ${error.message || error}`, true);
  }
}

function removeNistBitFile() {
  state.nistUploadedBits = new Uint8Array(0);
  state.nistUploadedFileName = "";
  state.nistUploadedFileNames = [];
  if (els.nistBitFile) els.nistBitFile.value = "";
  if (els.nistRemoveFileButton) els.nistRemoveFileButton.disabled = true;
  if (els.nistBitSource?.value === "upload") els.nistBitSource.value = "current";
  updateNistFileStatus("No bit file loaded. Uploaded data remains separate from the live bit buffer.");
  clearNistResults();
  updateMlSourceStatus();
  updateEntropySourceStatus();
  addLog("SYS", "Removed uploaded NIST bit file");
}

function getRetainedBitEntries(source = "current") {
  if (source === "current") return state.bits;
  if (source === "upload") return state.nistUploadedBits;
  if (source === "firmware") {
    return state.bits.filter((entry) => entry.firmwareFrame || /firmware/i.test(entry.source || ""));
  }
  return state.bits.filter((entry) => normalizeAdcSource(entry.adcSource) === source);
}

function getNistBitEntries() {
  return getRetainedBitEntries(els.nistBitSource?.value || "current");
}

function getNistSourceLabel() {
  const source = els.nistBitSource?.value || "current";
  if (source === "current") return state.bitSource || "Current extracted bits";
  if (source === "upload") return state.nistUploadedFileName || "Uploaded bit file";
  if (source === "firmware") return "Firmware ENCF key bits";
  return `${source} bits`;
}

function getNistSourceDescription(source, entries) {
  const available = entries.length;
  if (source === "current") {
    const method = state.bitSource || getBitMethodLabel();
    const adcLabel = getAdcSourceInfo(state.bitAdcSource).label;
    return `Uses the current web bit buffer: ${method} from ${adcLabel}. It reuses retained bits and does not generate new bits.`;
  }
  if (source === "firmware") {
    return "Uses only key bits carried by firmware ENCF records. Browser-side ADC extraction is not included.";
  }
  if (source === "upload") {
    return `Uses ${state.nistUploadedFileName || "the uploaded file"} as an isolated bit stream. It is not added to the live buffer or bitmap.`;
  }
  return `Uses ${source} entries retained in the web bit buffer. Selecting a source only filters the buffer; it does not start extraction for that ADC.`;
}

function updateNistSourceStatus() {
  const source = els.nistBitSource?.value || "current";
  const entries = getNistBitEntries();
  const requested = clampInteger(els.nistBitLimit?.value, 100, 1000000, 500000);
  const testCount = Math.min(entries.length, requested);
  const sourceLabel = source === "current" ? "Current extracted bits" : getNistSourceLabel();

  if (els.nistSourceName) els.nistSourceName.textContent = sourceLabel;
  if (els.nistSourceAvailable) els.nistSourceAvailable.textContent = entries.length.toLocaleString();
  if (els.nistSourceTestCount) els.nistSourceTestCount.textContent = testCount.toLocaleString();
  if (els.nistSourceDescription) {
    els.nistSourceDescription.textContent = getNistSourceDescription(source, entries);
  }
}

function getNistBitValues() {
  const source = els.nistBitSource?.value || "current";
  if (source === "upload") return state.nistUploadedBits;
  const entries = getNistBitEntries();
  return Uint8Array.from(entries, (entry) => (entry.bit ? 1 : 0));
}

function getMlBitValues() {
  const source = els.mlBitSource?.value || "current";
  if (source === "upload") return state.nistUploadedBits;
  return Uint8Array.from(getRetainedBitEntries(source), (entry) => (entry.bit ? 1 : 0));
}

function getMlSourceLabel() {
  const source = els.mlBitSource?.value || "current";
  if (source === "current") return state.bitSource || "Current extracted bits";
  if (source === "upload") return state.nistUploadedFileName || "Uploaded bit file";
  if (source === "firmware") return "Firmware ENCF key bits";
  if (source === "ADC0") return "ADC0 ambient/noise bits";
  if (source === "ADC3") return "ADC3 green-LED/noise bits";
  return `${source} bits`;
}

function updateMlSourceStatus() {
  const source = els.mlBitSource?.value || "current";
  const entries = getRetainedBitEntries(source);
  const requested = clampInteger(els.mlBitLimit?.value, 200, 1000000, 500000);
  const testCount = Math.min(entries.length, requested);
  if (els.mlSourceName) els.mlSourceName.textContent = getMlSourceLabel();
  if (els.mlSourceAvailable) els.mlSourceAvailable.textContent = entries.length.toLocaleString();
  if (els.mlSourceTestCount) els.mlSourceTestCount.textContent = testCount.toLocaleString();
  if (els.mlSourceDescription) {
    const description = source === "upload"
      ? "Uses the uploaded bit stream as an isolated source; it is not added to the live buffer."
      : source === "ADC0"
        ? "Uses retained ADC0 bits. In this project ADC0 is treated as ambient-light/electronic noise, not biomedical PPG."
        : source === "ADC3"
          ? "Uses retained ADC3 bits. In this project ADC3 is treated as green-LED-assisted optical/electronic noise."
          : "Uses only the selected retained bit stream and does not generate new bits.";
    els.mlSourceDescription.textContent = description;
  }
}

function getEntropyBitValues() {
  const source = els.entropyBitSource?.value || "current";
  if (source === "upload") return state.nistUploadedBits;
  return Uint8Array.from(getRetainedBitEntries(source), (entry) => (entry.bit ? 1 : 0));
}

function getEntropySourceLabel() {
  const source = els.entropyBitSource?.value || "current";
  if (source === "current") return state.bitSource || "Current extracted bits";
  if (source === "upload") return state.nistUploadedFileName || "Uploaded bit file";
  if (source === "firmware") return "Firmware ENCF key bits";
  if (source === "ADC0") return "ADC0 ambient/noise bits";
  if (source === "ADC3") return "ADC3 green-LED/noise bits";
  return `${source} bits`;
}

function updateEntropySourceStatus() {
  const source = els.entropyBitSource?.value || "current";
  const entries = getRetainedBitEntries(source);
  const requested = clampInteger(els.entropyBitLimit?.value, 1024, 1000000, 1000000);
  const testCount = Math.min(entries.length, requested);
  if (els.entropySourceName) els.entropySourceName.textContent = getEntropySourceLabel();
  if (els.entropySourceAvailable) els.entropySourceAvailable.textContent = entries.length.toLocaleString();
  if (els.entropySourceTestCount) els.entropySourceTestCount.textContent = testCount.toLocaleString();
  if (els.entropySourceDescription) {
    const classLabel = els.entropyDataClass?.value === "conditioned" ? "conditioned/output" : "raw noise-source candidate";
    els.entropySourceDescription.textContent = `${getEntropySourceLabel()} | ${classLabel} | browser input is binary; raw ADC provenance must be documented separately.`;
  }
}

function getNistOptions() {
  const profile = els.nistProfile?.value === "nist1m" ? "nist1m" : "500k";
  return {
    profile,
    blockSize: clampInteger(els.nistBlockSize?.value, 20, 50000, profile === "500k" ? 8192 : 128),
    template: String(els.nistTemplate?.value || "000000001").replace(/[^01]/g, "").slice(0, 10) || "000000001",
    approximateEntropyM: clampInteger(els.nistApproxM?.value, 2, 15, 10),
    serialM: clampInteger(els.nistSerialM?.value, 3, 16, profile === "nist1m" ? 16 : 10),
    linearBlockSize: clampInteger(els.nistLinearM?.value, 500, 5000, 500),
  };
}

function applyNistProfileDefaults() {
  const profile = els.nistProfile?.value === "nist1m" ? "nist1m" : "500k";
  const defaults = profile === "nist1m"
    ? { bits: 1000000, block: 128, approx: 10, serial: 16, linear: 500 }
    : { bits: 500000, block: 8192, approx: 10, serial: 10, linear: 500 };
  if (els.nistBitLimit) els.nistBitLimit.value = String(defaults.bits);
  if (els.nistBlockSize) els.nistBlockSize.value = String(defaults.block);
  if (els.nistApproxM) els.nistApproxM.value = String(defaults.approx);
  if (els.nistSerialM) els.nistSerialM.value = String(defaults.serial);
  if (els.nistLinearM) els.nistLinearM.value = String(defaults.linear);
  updateNistSourceStatus();
}

function formatNistPValue(value) {
  if (!Number.isFinite(value)) return "--";
  if (value < 0.0001) return value.toExponential(3);
  return value.toFixed(6);
}

function getNistResultStatus(test) {
  if (!test?.available) return { label: "N/A", className: "is-na" };
  return test.pass
    ? { label: "PASS", className: "is-pass" }
    : { label: "CHECK", className: "is-check" };
}

function getNistComponentsText(test) {
  const componentText = test?.children?.length
    ? test.children.map((child) => `${child.name}: p=${formatNistPValue(child.p)}${child.detail ? ` (${child.detail})` : ""}`).join(" | ")
    : "";
  return [test?.detail || "", componentText].filter(Boolean).join(" | ");
}

function renderNistResults(results = state.nistResults) {
  if (!els.nistResultsBody) return;
  if (!results.length) {
    els.nistResultsBody.innerHTML = '<tr><td colspan="5" class="nist-empty">No test run yet.</td></tr>';
    return;
  }

  els.nistResultsBody.innerHTML = results.map((test) => {
    const status = getNistResultStatus(test);
    return `
      <tr>
        <td>${escapeHtml(test.name || "Unknown")}</td>
        <td>${formatNistPValue(test.p)}</td>
        <td>${escapeHtml(test.value || "--")}</td>
        <td>${escapeHtml(getNistComponentsText(test))}</td>
        <td><span class="nist-result ${status.className}">${status.label}</span></td>
      </tr>
    `;
  }).join("");
}

function updateNistSummary(result = null, elapsedMs = null) {
  const bitCount = result?.n || 0;
  const ones = result?.ones || 0;
  if (els.nistBitCount) els.nistBitCount.textContent = String(bitCount);
  if (els.nistOneRatio) els.nistOneRatio.textContent = bitCount ? (ones / bitCount).toFixed(6) : "--";
  if (els.nistPassCount) els.nistPassCount.textContent = String(result?.passCount || 0);
  if (els.nistCheckCount) els.nistCheckCount.textContent = String(result?.checkCount || 0);
  if (els.nistNaCount) els.nistNaCount.textContent = String(result?.unavailableCount || 0);
  if (els.nistElapsed) els.nistElapsed.textContent = Number.isFinite(elapsedMs) ? `${(elapsedMs / 1000).toFixed(2)} s` : "--";
}

function finishNistRun(result, elapsedMs) {
  state.nistResults = result?.tests || [];
  state.nistRunning = false;
  if (state.nistWorker) {
    state.nistWorker.terminate();
    state.nistWorker = null;
  }
  if (els.nistRunButton) {
    els.nistRunButton.disabled = false;
    els.nistRunButton.textContent = "Run all 15 tests";
  }
  updateNistSummary(result, elapsedMs);
  renderNistResults(state.nistResults);
  if (els.nistCaption) {
    const profileLabel = result?.profile === "nist1m" ? "NIST STS 1M comparison" : "500k diagnostic";
    els.nistCaption.textContent = `${profileLabel} | ${getNistSourceLabel()} | ${result?.n || 0} bits | ${result?.availableCount || 0}/${result?.testFamilyCount || 15} test families available | ${Number.isFinite(elapsedMs) ? `${(elapsedMs / 1000).toFixed(2)} s` : "complete"}`;
  }
}

function runNistMainThread(bits, options, startedAt) {
  window.setTimeout(() => {
    try {
      const result = window.YmPpgNist.runAll(bits, options);
      finishNistRun(result, performance.now() - startedAt);
    } catch (error) {
      state.nistRunning = false;
      if (els.nistRunButton) els.nistRunButton.disabled = false;
      addLog("ERR", `NIST suite failed: ${error.message || error}`, true);
    }
  }, 0);
}

function runNistTestSuite() {
  if (state.nistRunning) return;
  if (!window.YmPpgNist) {
    addLog("ERR", "NIST calculation module is unavailable", true);
    return;
  }

  const allBits = getNistBitValues();
  const requestedLimit = clampInteger(els.nistBitLimit?.value, 100, 1000000, 500000);
  const bits = allBits.slice(Math.max(0, allBits.length - requestedLimit));
  if (bits.length < 100) {
    addLog("SYS", `NIST needs at least 100 retained bits; available ${bits.length}`);
    return;
  }

  const options = getNistOptions();
  const startedAt = performance.now();
  state.nistRunning = true;
  state.nistResults = [];
  renderNistResults([]);
  updateNistSummary(null, null);
  if (els.nistRunButton) {
    els.nistRunButton.disabled = true;
    els.nistRunButton.textContent = "Running...";
  }
  if (els.nistCaption) els.nistCaption.textContent = `${getNistSourceLabel()} | ${bits.length} bits | calculating in background...`;

  const fallbackBits = bits.slice();
  const useWorker = typeof Worker === "function";
  if (!useWorker) {
    runNistMainThread(fallbackBits, options, startedAt);
    return;
  }

  let settled = false;
  try {
    const worker = new Worker("./nist-worker.js");
    state.nistWorker = worker;
    worker.onmessage = (event) => {
      if (settled) return;
      settled = true;
      if (event.data?.type === "result") {
        finishNistRun(event.data.result, performance.now() - startedAt);
      } else {
        worker.terminate();
        state.nistWorker = null;
        runNistMainThread(fallbackBits, options, startedAt);
      }
    };
    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      state.nistWorker = null;
      addLog("SYS", `NIST worker unavailable; using main thread (${event.message || "worker error"})`);
      runNistMainThread(fallbackBits, options, startedAt);
    };
    worker.postMessage({ bits, options }, [bits.buffer]);
  } catch (error) {
    settled = true;
    if (state.nistWorker) state.nistWorker.terminate();
    state.nistWorker = null;
    addLog("SYS", `NIST worker unavailable; using main thread (${error.message || error})`);
    runNistMainThread(fallbackBits, options, startedAt);
  }
}

function clearNistResults() {
  if (state.nistWorker) state.nistWorker.terminate();
  state.nistWorker = null;
  state.nistRunning = false;
  state.nistResults = [];
  if (els.nistRunButton) {
    els.nistRunButton.disabled = false;
    els.nistRunButton.textContent = "Run all 15 tests";
  }
  updateNistSummary(null, null);
  renderNistResults([]);
  if (els.nistCaption) els.nistCaption.textContent = "Run the suite on the retained web bit buffer.";
  updateNistSourceStatus();
}

function exportNistResultsCsv() {
  if (!state.nistResults.length) {
    addLog("SYS", "No NIST results to export");
    return;
  }
  const rows = ["test_family,p_value,statistic,parameters_components,result,available,n,alpha"];
  state.nistResults.forEach((test) => {
    const status = getNistResultStatus(test);
    rows.push([
      csvCell(test.name),
      csvCell(formatNistPValue(test.p)),
      csvCell(test.value),
      csvCell(getNistComponentsText(test)),
      status.label,
      test.available ? "1" : "0",
      test.n,
      window.YmPpgNist?.ALPHA || 0.01,
    ].join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nist_sp800-22_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${state.nistResults.length} NIST test-family results`);
}

function formatMlMetric(value) {
  return Number.isFinite(value) ? value.toFixed(6) : "--";
}

function getMlModel(name) {
  return state.mlResults?.models?.find((model) => model.name === name) || null;
}

function renderMlResults(result = state.mlResults) {
  if (!els.mlResultsBody) return;
  if (!result?.models?.length) {
    els.mlResultsBody.innerHTML = '<tr><td colspan="7" class="ml-empty">No analysis run yet.</td></tr>';
    return;
  }
  els.mlResultsBody.innerHTML = result.models.map((model) => {
    const confusion = model.confusion || {};
    const training = model.trainingSamples ? ` | train=${model.trainingSamples}` : "";
    return `
      <tr>
        <td><strong>${escapeHtml(model.name)}</strong><small>${escapeHtml(model.features || "constant/history baseline")}${training}</small></td>
        <td>${formatMlMetric(model.accuracy)}</td>
        <td>${formatMlMetric(model.balancedAccuracy)}</td>
        <td>${formatMlMetric(model.logLossBits)}</td>
        <td>${formatMlMetric(model.brier)}</td>
        <td>${escapeHtml(model.advantageText || "--")}</td>
        <td>TP ${confusion.truePositive || 0} / TN ${confusion.trueNegative || 0}<br>FP ${confusion.falsePositive || 0} / FN ${confusion.falseNegative || 0}</td>
      </tr>
    `;
  }).join("");
}

function updateMlSummary(result = null, elapsedMs = null) {
  const logistic = result?.models?.find((model) => model.name === "Logistic regression attack");
  if (els.mlBitCount) els.mlBitCount.textContent = String(result?.n || 0);
  if (els.mlSplitCount) {
    els.mlSplitCount.textContent = result ? `${result.trainCount} / ${result.testCount}` : "--";
  }
  if (els.mlBaselineAccuracy) els.mlBaselineAccuracy.textContent = formatMlMetric(result?.baselineAccuracy);
  if (els.mlAccuracy) els.mlAccuracy.textContent = formatMlMetric(logistic?.accuracy);
  if (els.mlAdvantage) els.mlAdvantage.textContent = logistic?.advantageText || "--";
  if (els.mlConditionalEntropy) els.mlConditionalEntropy.textContent = formatMlMetric(result?.conditionalEntropyBits);
  if (els.mlCaption && result) {
    els.mlCaption.textContent = `${getMlSourceLabel()} | ${result.n.toLocaleString()} bits | train ${result.trainCount.toLocaleString()} / test ${result.testCount.toLocaleString()} | lag ${result.lag} | ${Number.isFinite(elapsedMs) ? `${(elapsedMs / 1000).toFixed(2)} s` : "complete"}`;
  }
}

function finishMlRun(result, elapsedMs) {
  state.mlResults = result;
  state.mlRunning = false;
  if (state.mlWorker) {
    state.mlWorker.terminate();
    state.mlWorker = null;
  }
  if (els.mlRunButton) {
    els.mlRunButton.disabled = false;
    els.mlRunButton.textContent = "Run ML attack";
  }
  updateMlSummary(result, elapsedMs);
  renderMlResults(result);
  const logistic = result.models.find((model) => model.name === "Logistic regression attack");
  if (els.mlInterpretation) {
    els.mlInterpretation.textContent = result.attack.meaningful
      ? `The logistic predictor exceeded the majority baseline by ${formatMlMetric(result.attack.advantage)}. This indicates measurable next-bit predictability under the selected split.`
      : `The logistic predictor did not exceed the majority baseline by 0.02. This is not evidence of cryptographic security; repeat across independent measurement sessions.`;
  }
  if (els.mlWarning) {
    els.mlWarning.textContent = `${result.warning} Logistic accuracy=${formatMlMetric(logistic?.accuracy)}, Markov accuracy=${formatMlMetric(result.models[1]?.accuracy)}.`;
  }
}

function runMlMainThread(bits, options, startedAt) {
  window.setTimeout(() => {
    try {
      const result = window.YmPpgMlAttack.run(bits, options);
      finishMlRun(result, performance.now() - startedAt);
    } catch (error) {
      state.mlRunning = false;
      if (els.mlRunButton) els.mlRunButton.disabled = false;
      addLog("ERR", `ML attack failed: ${error.message || error}`, true);
    }
  }, 0);
}

function runMlAttack() {
  if (state.mlRunning) return;
  if (!window.YmPpgMlAttack) {
    addLog("ERR", "ML attack calculation module is unavailable", true);
    return;
  }
  const allBits = getMlBitValues();
  const requestedLimit = clampInteger(els.mlBitLimit?.value, 200, 1000000, 500000);
  const bits = allBits.slice(Math.max(0, allBits.length - requestedLimit));
  if (bits.length < 200) {
    addLog("SYS", `ML attack needs at least 200 retained bits; available ${bits.length}`);
    return;
  }
  const options = {
    lag: clampInteger(els.mlLag?.value, 2, 64, 16),
    holdoutPercent: clampInteger(els.mlHoldout?.value, 10, 50, 30),
    maxTrainSamples: clampInteger(els.mlMaxTrain?.value, 5000, 100000, 60000),
  };
  const startedAt = performance.now();
  state.mlRunning = true;
  state.mlResults = null;
  renderMlResults(null);
  updateMlSummary(null, null);
  if (els.mlRunButton) {
    els.mlRunButton.disabled = true;
    els.mlRunButton.textContent = "Running...";
  }
  if (els.mlCaption) els.mlCaption.textContent = `${getMlSourceLabel()} | ${bits.length.toLocaleString()} bits | calculating in background...`;

  const fallbackBits = bits.slice();
  if (typeof Worker !== "function") {
    runMlMainThread(fallbackBits, options, startedAt);
    return;
  }
  let settled = false;
  try {
    const worker = new Worker("./ml-attack-worker.js");
    state.mlWorker = worker;
    worker.onmessage = (event) => {
      if (settled) return;
      settled = true;
      if (event.data?.type === "result") {
        finishMlRun(event.data.result, performance.now() - startedAt);
      } else {
        worker.terminate();
        state.mlWorker = null;
        addLog("SYS", `ML worker unavailable; using main thread (${event.data?.message || "worker error"})`);
        runMlMainThread(fallbackBits, options, startedAt);
      }
    };
    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      state.mlWorker = null;
      addLog("SYS", `ML worker unavailable; using main thread (${event.message || "worker error"})`);
      runMlMainThread(fallbackBits, options, startedAt);
    };
    worker.postMessage({ bits, options }, [bits.buffer]);
  } catch (error) {
    settled = true;
    if (state.mlWorker) state.mlWorker.terminate();
    state.mlWorker = null;
    addLog("SYS", `ML worker unavailable; using main thread (${error.message || error})`);
    runMlMainThread(fallbackBits, options, startedAt);
  }
}

function clearMlResults() {
  if (state.mlWorker) state.mlWorker.terminate();
  state.mlWorker = null;
  state.mlRunning = false;
  state.mlResults = null;
  if (els.mlRunButton) {
    els.mlRunButton.disabled = false;
    els.mlRunButton.textContent = "Run ML attack";
  }
  updateMlSummary(null, null);
  renderMlResults(null);
  if (els.mlCaption) els.mlCaption.textContent = "Run a chronological next-bit prediction analysis on a retained bit stream.";
}

function exportMlResultsCsv() {
  if (!state.mlResults?.models?.length) {
    addLog("SYS", "No ML attack results to export");
    return;
  }
  const result = state.mlResults;
  const rows = ["source,bits,train_count,test_count,lag,model,accuracy,balanced_accuracy,log_loss_bits,brier,advantage,true_positive,true_negative,false_positive,false_negative"];
  result.models.forEach((model) => {
    const confusion = model.confusion || {};
    rows.push([
      csvCell(getMlSourceLabel()), result.n, result.trainCount, result.testCount, result.lag,
      csvCell(model.name), formatMlMetric(model.accuracy), formatMlMetric(model.balancedAccuracy),
      formatMlMetric(model.logLossBits), formatMlMetric(model.brier), formatMlMetric(model.advantage),
      confusion.truePositive || 0, confusion.trueNegative || 0, confusion.falsePositive || 0, confusion.falseNegative || 0,
    ].join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ml_attack_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${result.models.length} ML attack model results`);
}

function formatEntropyMetric(value) {
  return Number.isFinite(value) ? value.toFixed(6) : "--";
}

function formatEntropyProbability(value) {
  if (!Number.isFinite(value)) return "--";
  if (value < 0.0001) return value.toExponential(3);
  return value.toFixed(6);
}

function entropyStatusLabel(estimate) {
  return estimate?.status === "available" ? "AVAILABLE" : "SHORT";
}

function renderEntropyResults(result = state.entropyResults) {
  if (!els.entropyResultsBody) return;
  if (!result?.estimates?.length) {
    els.entropyResultsBody.innerHTML = '<tr><td colspan="5" class="entropy-empty">No diagnostic run yet.</td></tr>';
    return;
  }
  els.entropyResultsBody.innerHTML = result.estimates.map((estimate) => `
    <tr>
      <td><strong>${escapeHtml(estimate.name)}</strong><small>${escapeHtml(estimate.detail || "")}</small></td>
      <td>${formatEntropyMetric(estimate.entropy)}</td>
      <td>${formatEntropyProbability(estimate.probability)}</td>
      <td>${escapeHtml(estimate.statistic || "--")}</td>
      <td><span class="entropy-result ${estimate.status === "available" ? "is-available" : "is-short"}">${entropyStatusLabel(estimate)}</span></td>
    </tr>
  `).join("");
}

function updateEntropySummary(result = null) {
  if (els.entropySampleCount) els.entropySampleCount.textContent = String(result?.n || 0);
  if (els.entropyDataStatus) {
    els.entropyDataStatus.textContent = result?.dataStatus === "candidate-1m" ? "1M candidate" : result ? "Exploratory" : "--";
  }
  if (els.entropyValue) els.entropyValue.textContent = formatEntropyMetric(result?.officialSubsetEntropy);
  if (els.entropyIidStatus) {
    els.entropyIidStatus.textContent = result ? (result.iid.screening === "no immediate concern" ? "Screen pass" : "Concern") : "--";
  }
  if (els.entropyRctStatus) els.entropyRctStatus.textContent = result ? (result.health.repetitionCount.pass ? "PASS" : "FAIL") : "--";
  if (els.entropyAptStatus) els.entropyAptStatus.textContent = result ? (result.health.adaptiveProportion.pass ? "PASS" : "FAIL") : "--";
  if (els.entropyHealthSummary && result) {
    els.entropyHealthSummary.textContent = `Assessed subset Hmin=${formatEntropyMetric(result.officialSubsetEntropy)} bits/sample | alpha=${result.health.alpha.toExponential(3)}`;
  }
  if (els.entropyRctDetail && result) {
    const rct = result.health.repetitionCount;
    els.entropyRctDetail.textContent = `max run ${rct.maximumRun} / cutoff ${rct.cutoff} | ${rct.pass ? "PASS" : "FAIL"}`;
  }
  if (els.entropyAptDetail && result) {
    const apt = result.health.adaptiveProportion;
    els.entropyAptDetail.textContent = `max ${apt.maximumCount} / cutoff ${apt.cutoff} | ${apt.failures} failures | ${apt.pass ? "PASS" : "FAIL"}`;
  }
  if (els.entropyIidDetail && result) {
    els.entropyIidDetail.textContent = `transition chi2 ${result.iid.transitionChi.toFixed(3)} | block chi2 ${result.iid.blockChi.toFixed(3)} | max |rho| ${result.iid.maxCorrelation.toFixed(4)}`;
  }
}

function finishEntropyRun(result, elapsedMs) {
  state.entropyResults = result;
  state.entropyRunning = false;
  if (state.entropyWorker) {
    state.entropyWorker.terminate();
    state.entropyWorker = null;
  }
  if (els.entropyRunButton) {
    els.entropyRunButton.disabled = false;
    els.entropyRunButton.textContent = "Run 90B diagnostic";
  }
  updateEntropySummary(result);
  renderEntropyResults(result);
  if (els.entropyCaption) {
    els.entropyCaption.textContent = `${getEntropySourceLabel()} | ${result.n.toLocaleString()} binary samples | subset Hmin ${formatEntropyMetric(result.officialSubsetEntropy)} bits/sample | ${Number.isFinite(elapsedMs) ? `${(elapsedMs / 1000).toFixed(2)} s` : "complete"}`;
  }
  if (els.entropyWarning) els.entropyWarning.textContent = result.warnings.join(" ");
}

function runEntropyMainThread(bits, options, startedAt) {
  window.setTimeout(() => {
    try {
      const result = window.YmPpg90b.run(bits, options);
      finishEntropyRun(result, performance.now() - startedAt);
    } catch (error) {
      state.entropyRunning = false;
      if (els.entropyRunButton) els.entropyRunButton.disabled = false;
      addLog("ERR", `90B diagnostic failed: ${error.message || error}`, true);
    }
  }, 0);
}

function runEntropyDiagnostic() {
  if (state.entropyRunning) return;
  if (!window.YmPpg90b) {
    addLog("ERR", "SP 800-90B calculation module is unavailable", true);
    return;
  }
  const allBits = getEntropyBitValues();
  const requestedLimit = clampInteger(els.entropyBitLimit?.value, 1024, 1000000, 1000000);
  const bits = allBits.slice(Math.max(0, allBits.length - requestedLimit));
  if (bits.length < 1024) {
    addLog("SYS", `90B diagnostic needs at least 1024 binary samples; available ${bits.length}`);
    return;
  }
  const options = {
    tupleK: clampInteger(els.entropyTupleK?.value, 2, 16, 12),
  };
  const startedAt = performance.now();
  state.entropyRunning = true;
  state.entropyResults = null;
  renderEntropyResults(null);
  updateEntropySummary(null);
  if (els.entropyRunButton) {
    els.entropyRunButton.disabled = true;
    els.entropyRunButton.textContent = "Running...";
  }
  if (els.entropyCaption) els.entropyCaption.textContent = `${getEntropySourceLabel()} | ${bits.length.toLocaleString()} binary samples | calculating in background...`;

  const fallbackBits = bits.slice();
  if (typeof Worker !== "function") {
    runEntropyMainThread(fallbackBits, options, startedAt);
    return;
  }
  let settled = false;
  try {
    const worker = new Worker("./sp800-90b-worker.js");
    state.entropyWorker = worker;
    worker.onmessage = (event) => {
      if (settled) return;
      settled = true;
      if (event.data?.type === "result") {
        finishEntropyRun(event.data.result, performance.now() - startedAt);
      } else {
        worker.terminate();
        state.entropyWorker = null;
        addLog("SYS", `90B worker unavailable; using main thread (${event.data?.message || "worker error"})`);
        runEntropyMainThread(fallbackBits, options, startedAt);
      }
    };
    worker.onerror = (event) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      state.entropyWorker = null;
      addLog("SYS", `90B worker unavailable; using main thread (${event.message || "worker error"})`);
      runEntropyMainThread(fallbackBits, options, startedAt);
    };
    worker.postMessage({ bits, options }, [bits.buffer]);
  } catch (error) {
    settled = true;
    if (state.entropyWorker) state.entropyWorker.terminate();
    state.entropyWorker = null;
    addLog("SYS", `90B worker unavailable; using main thread (${error.message || error})`);
    runEntropyMainThread(fallbackBits, options, startedAt);
  }
}

function clearEntropyResults() {
  if (state.entropyWorker) state.entropyWorker.terminate();
  state.entropyWorker = null;
  state.entropyRunning = false;
  state.entropyResults = null;
  if (els.entropyRunButton) {
    els.entropyRunButton.disabled = false;
    els.entropyRunButton.textContent = "Run 90B diagnostic";
  }
  updateEntropySummary(null);
  renderEntropyResults(null);
  if (els.entropyHealthSummary) els.entropyHealthSummary.textContent = "No diagnostic run yet.";
  if (els.entropyRctDetail) els.entropyRctDetail.textContent = "--";
  if (els.entropyAptDetail) els.entropyAptDetail.textContent = "--";
  if (els.entropyIidDetail) els.entropyIidDetail.textContent = "--";
  if (els.entropyWarning) els.entropyWarning.textContent = "This is a browser-side 90B-aligned screening report, not an SP 800-90B validation certificate.";
  if (els.entropyCaption) els.entropyCaption.textContent = "Run the binary-source screening assessment on a retained bit stream.";
}

function exportEntropyResultsCsv() {
  if (!state.entropyResults?.estimates?.length) {
    addLog("SYS", "No 90B diagnostic results to export");
    return;
  }
  const result = state.entropyResults;
  const rows = ["source,samples,data_status,estimator,hmin_bits_per_sample,p_max,statistic,detail,status"];
  result.estimates.forEach((estimate) => {
    rows.push([
      csvCell(getEntropySourceLabel()), result.n, result.dataStatus, csvCell(estimate.name),
      formatEntropyMetric(estimate.entropy), formatEntropyProbability(estimate.probability),
      csvCell(estimate.statistic), csvCell(estimate.detail), entropyStatusLabel(estimate),
    ].join(","));
  });
  const rct = result.health.repetitionCount;
  const apt = result.health.adaptiveProportion;
  rows.push([csvCell(getEntropySourceLabel()), result.n, result.dataStatus, "RCT", "", "", `max_run=${rct.maximumRun}`, `cutoff=${rct.cutoff}`, rct.pass ? "PASS" : "FAIL"].join(","));
  rows.push([csvCell(getEntropySourceLabel()), result.n, result.dataStatus, "APT", "", "", `max_count=${apt.maximumCount}`, `window=${apt.window};cutoff=${apt.cutoff};failures=${apt.failures}`, apt.pass ? "PASS" : "FAIL"].join(","));
  rows.push([csvCell(getEntropySourceLabel()), result.n, result.dataStatus, "90B subset minimum", formatEntropyMetric(result.officialSubsetEntropy), "", "", csvCell(result.coverage), "SCREENING"].join(","));
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sp800-90b_diagnostic_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${result.estimates.length} 90B estimator results`);
}

function exportEntropyInput() {
  const allBits = getEntropyBitValues();
  const requestedLimit = clampInteger(els.entropyBitLimit?.value, 1024, 1000000, 1000000);
  const bits = allBits.slice(Math.max(0, allBits.length - requestedLimit));
  if (bits.length < 1) {
    addLog("SYS", "No binary samples available for 90B input export");
    return;
  }
  const blob = new Blob([bits], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sp800-90b_input_${new Date().toISOString().replaceAll(":", "-")}.bin`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${bits.length} one-byte binary samples for 90B reproduction`);
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
    const t = performance.now();
    const baseline = 7200 + (dac - 2056) * 0.42;
    const ppg = Math.sin(state.demoPhase) * 160 + Math.sin(state.demoPhase * 0.31) * 38;
    const noise = (Math.random() - 0.5) * 42;
    const noiseAdc = 7550 + Math.round((Math.random() - 0.5) * 80);
    addSample(Math.round(6800 + ppg * 0.7 + noise), "ADC", { adcSource: "ADC0", t });
    addSample(Math.round(baseline + ppg + noise), "ADC", { adcSource: "ADC2", t });
    addSample(noiseAdc, "ADC", { adcSource: "ADC3", t });
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
  resizeBitAdc2Canvas();
}

function resizeBitAdc2Canvas() {
  if (els.bitPanel.hidden) return;

  const rect = els.bitAdc2Canvas.getBoundingClientRect();
  bitAdc2Plot.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  bitAdc2Plot.width = Math.floor(rect.width);
  bitAdc2Plot.height = Math.floor(rect.height);
  els.bitAdc2Canvas.width = Math.floor(bitAdc2Plot.width * bitAdc2Plot.dpr);
  els.bitAdc2Canvas.height = Math.floor(bitAdc2Plot.height * bitAdc2Plot.dpr);
  bitAdc2Plot.ctx.setTransform(bitAdc2Plot.dpr, 0, 0, bitAdc2Plot.dpr, 0, 0);
  state.needsBitAdc2Draw = true;
  drawAdc2BitPlot();
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

function resizeSwitchingPlot(plotState) {
  if (!plotState?.canvas || !plotState.ctx) return;
  const rect = plotState.canvas.getBoundingClientRect();
  plotState.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  plotState.width = Math.floor(rect.width);
  plotState.height = Math.floor(rect.height);
  plotState.canvas.width = Math.floor(plotState.width * plotState.dpr);
  plotState.canvas.height = Math.floor(plotState.height * plotState.dpr);
  plotState.ctx.setTransform(plotState.dpr, 0, 0, plotState.dpr, 0, 0);
}

function resizeSwitchingComparison() {
  if (els.switchView?.hidden) return;
  ["ADC0", "ADC2"].forEach((source) => {
    resizeSwitchingPlot(switchingPlots[source].ppg);
    resizeSwitchingPlot(switchingPlots[source].trng);
  });
  state.needsSwitchDraw = true;
  drawSwitchingComparison();
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

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  values.forEach((value) => {
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = Math.max((max - min) * 0.12, 8);
  return { min: min - pad, max: max + pad };
}

function decimateSeriesForCanvas(items, maxPoints, valueSelector) {
  if (!items.length) return [];

  const withIndex = (item, plotIndex) => ({ ...item, plotIndex });
  if (items.length <= maxPoints) {
    return items.map(withIndex);
  }

  const interiorBucketCount = Math.max(1, Math.floor((maxPoints - 2) / 2));
  const bucketSize = Math.ceil((items.length - 2) / interiorBucketCount);
  const selected = [withIndex(items[0], 0)];

  for (let start = 1; start < items.length - 1; start += bucketSize) {
    const end = Math.min(items.length - 1, start + bucketSize);
    let minIndex = start;
    let maxIndex = start;
    let minValue = valueSelector(items[start]);
    let maxValue = minValue;

    for (let index = start + 1; index < end; index += 1) {
      const value = valueSelector(items[index]);
      if (value < minValue) {
        minValue = value;
        minIndex = index;
      }
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    }

    if (minIndex === maxIndex) {
      selected.push(withIndex(items[minIndex], minIndex));
    } else if (minIndex < maxIndex) {
      selected.push(withIndex(items[minIndex], minIndex), withIndex(items[maxIndex], maxIndex));
    } else {
      selected.push(withIndex(items[maxIndex], maxIndex), withIndex(items[minIndex], minIndex));
    }
  }

  selected.push(withIndex(items.at(-1), items.length - 1));
  return selected;
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

  const series = getSelectedAdcPlotSources()
    .map((source) => ({ source, samples: getDisplaySamples(source) }))
    .filter(({ samples }) => samples.length);
  const values = series.flatMap(({ samples }) => samples.map((sample) => sample.value));
  const { min, max } = getYRange(values);
  const primarySeries = series.find(({ source }) => source === state.adcSource) || series[0];
  const timeRange = getTimeRange(primarySeries?.samples || []);

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

  series.forEach(({ source, samples }) => {
    const renderSamples = decimateSeriesForCanvas(
      samples,
      Math.max(512, Math.floor(chartW * 2)),
      (sample) => sample.value,
    );
    drawSeries(ctx, renderSamples, source, margin, chartW, chartH, min, max, timeRange);
  });
  ctx.restore();

  drawLegend(ctx, series.map(({ source }) => source), margin, chartW);
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

  const records = getCipherDisplayRecords();
  if (!records.length) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText(state.encryptionEnabled ? "Waiting for encrypted samples" : "Encryption off", margin.left + 12, margin.top + 28);
    return;
  }

  const visible = decimateSeriesForCanvas(
    records,
    Math.max(512, Math.floor(chartW * 2)),
    (record) => record.cipher,
  );
  const span = Math.max(1, records.length - 1);
  const yFor = (value) => margin.top + (1 - (value - min) / (max - min)) * chartH;

  ctx.save();
  ctx.beginPath();
  visible.forEach((record, index) => {
    const position = Number.isFinite(record.plotIndex) ? record.plotIndex : index;
    const x = margin.left + (position / span) * chartW;
    const y = yFor(record.cipher);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#b86800";
  ctx.lineWidth = 1.7;
  ctx.stroke();

  const latest = visible.at(-1);
  const latestPosition = Number.isFinite(latest.plotIndex) ? latest.plotIndex : records.length - 1;
  const latestX = margin.left + (latestPosition / span) * chartW;
  const latestY = yFor(latest.cipher);
  ctx.fillStyle = "#b86800";
  ctx.beginPath();
  ctx.arc(latestX, latestY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "800 12px Segoe UI, sans-serif";
  ctx.fillStyle = "#30423d";
  ctx.fillText(`Cipher | latest ${formatHex(latest.cipher)} | window ${records.length}/${getCipherWindowSize()}`, margin.left, margin.top - 7);
  ctx.restore();
}

function drawAdc2BitPlot() {
  if (els.bitPanel.hidden) return;

  const ctx = bitAdc2Plot.ctx;
  const width = bitAdc2Plot.width;
  const height = bitAdc2Plot.height;
  if (!width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 58, right: 14, top: 20, bottom: 28 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  if (chartW <= 0 || chartH <= 0) return;

  const samples = getDisplaySamples("ADC2");
  const values = samples.map((sample) => sample.value);
  const { min, max } = getYRange(values);
  drawGrid(ctx, margin, chartW, chartH, min, max);
  drawZeroLine(ctx, margin, chartW, chartH, min, max);

  if (els.bitAdc2Caption) {
    els.bitAdc2Caption.textContent = samples.length
      ? `${samples.length} samples | ${state.sampleRateHz} Hz | ${getValueDescription()} | ${getFilterDescription()}`
      : `Waiting for ADC2 samples | ${state.sampleRateHz} Hz`;
  }

  if (values.length < 2) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText("No ADC2 stream", margin.left + 12, margin.top + 28);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left, margin.top, chartW, chartH);
  ctx.clip();
  const renderSamples = decimateSeriesForCanvas(
    samples,
    Math.max(256, Math.floor(chartW * 2)),
    (sample) => sample.value,
  );
  drawSeries(ctx, renderSamples, "ADC2", margin, chartW, chartH, min, max, getTimeRange(samples));
  ctx.restore();
  drawLegend(ctx, ["ADC2"], margin, chartW);
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

function getSwitchingDisplaySamples(source) {
  const settings = getFilterSettings();
  const samples = state.switching.samples[source].ppg
    .map((sample) => createViewSample({
      ...sample,
      channel: "ADC",
      adcSource: source,
      valueKind: "raw",
    }))
    .filter((sample) => Number.isFinite(sample.value));
  const visibleStart = Math.max(0, samples.length - state.maxSamples);
  const visibleSamples = samples.slice(visibleStart);
  if (settings.mode === "raw") return visibleSamples;

  const filteredValues = applyFilter(samples, settings);
  return visibleSamples.map((sample, index) => ({
    ...sample,
    rawValue: sample.value,
    value: filteredValues[visibleStart + index],
  }));
}

function drawSwitchingPpgPlot(plotState, source) {
  const ctx = plotState.ctx;
  const width = plotState.width;
  const height = plotState.height;
  if (!ctx || !width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const margin = { left: 48, right: 12, top: 18, bottom: 24 };
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;
  if (chartW <= 0 || chartH <= 0) return;

  const samples = getSwitchingDisplaySamples(source);
  const { min, max } = getYRange(samples.map((sample) => sample.value));
  drawGrid(ctx, margin, chartW, chartH, min, max);
  drawZeroLine(ctx, margin, chartW, chartH, min, max);
  if (samples.length < 2) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.fillText(`Waiting for PPG samples | ${getFilterDescription()}`, margin.left + 10, margin.top + 24);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left, margin.top, chartW, chartH);
  ctx.clip();
  const visible = decimateSeriesForCanvas(samples, Math.max(256, Math.floor(chartW * 2)), (sample) => sample.value);
  drawSeries(ctx, visible, source, margin, chartW, chartH, min, max, getTimeRange(samples));
  ctx.restore();
  drawLegend(ctx, [source], margin, chartW);
}

function drawSwitchingBitmap(plotState, source) {
  const ctx = plotState.ctx;
  const width = plotState.width;
  const height = plotState.height;
  if (!ctx || !width || !height) return;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const bits = state.switching.bits[source];
  const columns = clampInteger(state.bitColumns, 8, 2048, 128);
  const labelHeight = 21;
  const cell = Math.max(1, Math.floor(Math.min(width / columns, (height - labelHeight) / Math.max(1, Math.ceil(bits.length / columns)))));
  const visibleColumns = Math.max(1, Math.min(columns, Math.floor(width / cell)));
  const visibleRows = Math.max(1, Math.floor((height - labelHeight) / cell));
  const capacity = visibleColumns * visibleRows;
  const visibleBits = bits.slice(-capacity);
  const ones = visibleBits.reduce((sum, bit) => sum + bit, 0);
  const ratio = visibleBits.length ? (ones / visibleBits.length).toFixed(3) : "--";

  ctx.fillStyle = "#30423d";
  ctx.font = "800 11px Segoe UI, sans-serif";
  ctx.fillText(`${source} TRNG | ${visibleBits.length} bits | 1=${ratio}`, 8, 14);
  if (!visibleBits.length) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 12px Segoe UI, sans-serif";
    ctx.fillText("Waiting for TRNG bits", 8, labelHeight + 22);
    return;
  }

  visibleBits.forEach((bit, index) => {
    const x = (index % visibleColumns) * cell;
    const y = labelHeight + Math.floor(index / visibleColumns) * cell;
    ctx.fillStyle = bit ? "#17201d" : "#ffffff";
    ctx.fillRect(x, y, cell, cell);
    if (cell >= 4) {
      ctx.strokeStyle = "rgba(216, 224, 220, 0.7)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, cell - 1), Math.max(1, cell - 1));
    }
  });
}

function drawSwitchingComparison() {
  if (els.switchView?.hidden) return;
  ["ADC0", "ADC2"].forEach((source) => {
    drawSwitchingPpgPlot(switchingPlots[source].ppg, source);
    drawSwitchingBitmap(switchingPlots[source].trng, source);
  });
  updateSwitchingUi();
}

function animationLoop() {
  const now = performance.now();
  if (state.needsDraw && now - state.lastDrawAt > getPlotRefreshIntervalMs()) {
    drawPlot();
    drawAdc2BitPlot();
    state.lastDrawAt = now;
    state.needsDraw = false;
    state.needsBitAdc2Draw = false;
    state.lastBitAdc2DrawAt = now;
  }
  if (state.needsBitAdc2Draw && now - state.lastBitAdc2DrawAt > 33) {
    drawAdc2BitPlot();
    state.lastBitAdc2DrawAt = now;
    state.needsBitAdc2Draw = false;
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
  if (state.needsSwitchDraw && now - state.lastSwitchDrawAt > 33) {
    drawSwitchingComparison();
    state.lastSwitchDrawAt = now;
    state.needsSwitchDraw = false;
  }
  requestAnimationFrame(animationLoop);
}

function bindEvents() {
  const viewTabContainer = document.querySelector(".view-tabs");
  viewTabContainer?.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-view-target]");
    if (!button || !viewTabContainer.contains(button)) return;
    setActiveView(button.dataset.viewTarget);
  });

  els.uiScale.addEventListener("change", () => {
    setUiScale(els.uiScale.value);
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
    button.addEventListener("click", async () => {
      const command = button.dataset.command;
      await sendCommand(command);
    });
  });

  els.clearLogButton.addEventListener("click", () => {
    els.log.innerHTML = "";
  });

  els.windowSize.addEventListener("input", () => applyWindowSizeInput(false));
  els.windowSize.addEventListener("change", () => applyWindowSizeInput(true));
  els.switchWindowSize?.addEventListener("input", () => {
    if (!els.switchWindowSize.value) return;
    els.windowSize.value = els.switchWindowSize.value;
    applyWindowSizeInput(false);
  });
  els.switchWindowSize?.addEventListener("change", () => {
    if (!els.switchWindowSize.value) return;
    els.windowSize.value = els.switchWindowSize.value;
    applyWindowSizeInput(true);
  });
  els.sampleRate.addEventListener("input", () => applySampleRateInput(false));
  els.sampleRate.addEventListener("change", () => applySampleRateInput(true));
  els.sendRateButton.addEventListener("click", () => {
    sendSampleRateCommand().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.sendGainButton.addEventListener("click", () => {
    sendAdcGainCommand().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.bitMethod?.addEventListener("change", () => {
    setBitGenerationMethod(els.bitMethod.value, { enable: true });
  });
  els.encryptionToggle?.addEventListener("change", () => {
    setEncryptionEnabled(els.encryptionToggle.checked);
  });
  els.firmwareConcurrentEncryptionStartButton?.addEventListener("click", () => {
    startFirmwareConcurrentEncryption().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.firmwareEncryptionStartButton?.addEventListener("click", () => {
    startFirmwareSwitchingEncryption().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.firmwareEncryptionStopButton?.addEventListener("click", () => {
    stopFirmwareEncryption().catch((error) => addLog("ERR", error.message || error, true));
  });
  els.encryptionSource?.addEventListener("change", () => {
    setEncryptionSource(els.encryptionSource.value);
  });
  els.cipherWidth?.addEventListener("change", () => {
    setCipherWidthBits(els.cipherWidth.value);
  });
  [els.liveMaWindow, els.liveMaOffset].forEach((control) => {
    control?.addEventListener("input", () => applyLiveMaSettings({ normalize: false }));
    control?.addEventListener("change", () => applyLiveMaSettings());
  });

  els.plotAdcSource.addEventListener("change", (event) => {
    const changedInput = event.target.closest("[data-plot-source]");
    if (!changedInput) return;

    const sources = [...els.plotAdcSource.querySelectorAll("[data-plot-source]:checked")]
      .map((input) => normalizeAdcSource(input.dataset.plotSource))
      .filter(Boolean);
    if (!sources.length) {
      changedInput.checked = true;
      return;
    }

    const primary = sources.includes(state.adcSource) ? state.adcSource : sources[0];
    setPlotAdcSources(sources, { primary });
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
      trimSampleHistory();
      updateStats();
      state.needsDraw = true;
      state.needsSwitchDraw = true;
    });
    control.addEventListener("change", () => {
      updateFilterUi();
      trimSampleHistory();
      updateStats();
      state.needsDraw = true;
      state.needsSwitchDraw = true;
    });
  });
  [els.switchFilterMode].forEach((control) => {
    control?.addEventListener("change", () => {
      if (!control.value) return;
      els.filterMode.value = control.value;
      updateFilterUi();
      trimSampleHistory();
      updateStats();
      state.needsDraw = true;
      state.needsSwitchDraw = true;
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
  els.switchStartButton?.addEventListener("click", startSwitchingMode);
  els.switchClearButton?.addEventListener("click", clearSwitchingMode);
  els.switchMode?.addEventListener("change", () => {
    updateSwitchingSettings();
    resetSwitchingData();
    updateSwitchingUi();
    state.needsSwitchDraw = true;
  });
  [els.switchPpgSeconds, els.switchTrngSeconds, els.switchSettleMs, els.switchDacTrng, els.switchDacPpg]
    .forEach((control) => control?.addEventListener("change", updateSwitchingSettings));
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
  els.nistRunButton?.addEventListener("click", runNistTestSuite);
  els.nistClearButton?.addEventListener("click", clearNistResults);
  els.nistExportButton?.addEventListener("click", exportNistResultsCsv);
  els.nistProfile?.addEventListener("change", () => {
    applyNistProfileDefaults();
    clearNistResults();
  });
  els.nistBitSource?.addEventListener("change", () => {
    updateNistSourceStatus();
    clearNistResults();
  });
  els.nistBitLimit?.addEventListener("input", updateNistSourceStatus);
  els.nistBitFile?.addEventListener("change", () => {
    handleNistBitFiles(els.nistBitFile.files);
  });
  els.nistBitFormat?.addEventListener("change", () => {
    if (els.nistBitFile?.files?.length) handleNistBitFiles(els.nistBitFile.files);
  });
  els.nistRemoveFileButton?.addEventListener("click", removeNistBitFile);
  els.nistTemplate?.addEventListener("change", () => {
    els.nistTemplate.value = getNistOptions().template;
  });
  els.mlRunButton?.addEventListener("click", runMlAttack);
  els.mlClearButton?.addEventListener("click", clearMlResults);
  els.mlExportButton?.addEventListener("click", exportMlResultsCsv);
  els.mlBitSource?.addEventListener("change", () => {
    updateMlSourceStatus();
    clearMlResults();
  });
  els.mlBitLimit?.addEventListener("input", updateMlSourceStatus);
  els.entropyRunButton?.addEventListener("click", runEntropyDiagnostic);
  els.entropyClearButton?.addEventListener("click", clearEntropyResults);
  els.entropyExportButton?.addEventListener("click", exportEntropyResultsCsv);
  els.entropyExportInputButton?.addEventListener("click", exportEntropyInput);
  els.entropyBitSource?.addEventListener("change", () => {
    updateEntropySourceStatus();
    clearEntropyResults();
  });
  els.entropyBitLimit?.addEventListener("input", updateEntropySourceStatus);
  els.entropyDataClass?.addEventListener("change", updateEntropySourceStatus);
  els.bitColumns.addEventListener("change", () => {
    state.needsBitDraw = true;
    resizeBitCanvas();
  });
  window.addEventListener("beforeunload", () => {
    state.keepReading = false;
    stopSwitchingMode();
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
  setDacValue(2056, "init");
  applyLiveMaSettings();
  setBitGenerationMethod(getSelectedBitMethod());
  setEncryptionSource(els.encryptionSource?.value || "ADC2", { reset: false });
  updateSwitchingSettings();
  setCipherWidthBits(DEFAULT_CIPHER_WIDTH_BITS, { reset: false });
  applyBitMapSettings();
  updateTransportControls();
  setConnectedUi(false);
  updateAdcSourceUi();
  updateValueUi();
  updateFilterUi();
  updateBitStats();
  updateEncryptionUi();
  updateNistSummary(null, null);
  renderNistResults([]);
  updateMlSourceStatus();
  updateMlSummary(null, null);
  renderMlResults(null);
  updateEntropySourceStatus();
  updateEntropySummary(null);
  renderEntropyResults(null);
  resizeCanvas();
  resizeCipherCanvas();
  new ResizeObserver(resizeCanvas).observe(els.canvasWrap || els.plotCanvas);
  new ResizeObserver(resizeBitCanvas).observe(els.bitCanvasWrap || els.bitCanvas);
  new ResizeObserver(resizeBitAdc2Canvas).observe(els.bitAdc2CanvasWrap || els.bitAdc2Canvas);
  new ResizeObserver(resizeCipherCanvas).observe(els.cipherCanvasWrap || els.cipherCanvas);
  new ResizeObserver(resizeNoiseBitCanvas).observe(els.noiseBitCanvasWrap || els.noiseBitCanvas);
  ["ADC0", "ADC2"].forEach((source) => {
    new ResizeObserver(resizeSwitchingComparison).observe(switchingPlots[source].ppg.wrap || switchingPlots[source].ppg.canvas);
    new ResizeObserver(resizeSwitchingComparison).observe(switchingPlots[source].trng.wrap || switchingPlots[source].trng.canvas);
  });
  setupDynamicTextFitting();
  updateStats();
  animationLoop();
}

init();
