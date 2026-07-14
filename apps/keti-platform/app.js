const MAX_POINTS = 900;
const MAX_IMU_POINTS = 900;
const MAX_TABLE_ROWS = 80;
const RENDER_INTERVAL_MS = 33;
const TABLE_RENDER_INTERVAL_MS = 150;
const IMU_ACCEL_AXES = ["ax", "ay", "az"];
const IMU_PROCESSED_AXES = ["pax", "pay", "paz"];
const IMU_FILTERED_AXES = ["fax", "fay", "faz"];
const GYRO_AXES = ["gx", "gy", "gz"];
const AXIS_COLORS = {
  ax: "#008c8c",
  ay: "#d28a00",
  az: "#2767c9"
};
const GYRO_AXIS_COLORS = {
  gx: "#008c8c",
  gy: "#d28a00",
  gz: "#2767c9"
};
const GYRO_MAX_DT_SEC = 0.25;
const GYRO_MAG_CORRECTION_GAIN_PER_SEC = 1.4;
const GYRO_MAG_CORRECTION_MAX_GAIN = 0.12;
const GYRO_MAG_CORRECTION_INITIAL_GAIN = 0.06;
const BOOTLOADER_REENUMERATE_WAIT_MS = 6500;
const BOOTLOADER_POLL_INTERVAL_MS = 250;
const DIRECT_FLASH_STALL_TIMEOUT_MS = 15000;
const DIRECT_FLASH_TOTAL_TIMEOUT_MS = 180000;
const DIRECT_FLASH_CLOSE_TIMEOUT_MS = 2500;
const DIRECT_FLASH_SEPARATE_ERASE = true;
const DIRECT_FLASH_POST_ERASE_SETTLE_MS = 1400;
const DIRECT_FLASH_COMPAT_POST_ERASE_SETTLE_MS = 2800;
const BLE_ADC_DEVICE_NAME = "KETI_ADC_REV2";
const BLE_ADC_SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BLE_ADC_CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const PPG_SAMPLE_PATHS = [
  "../ppg_dalia_subject1_acc_ppg_activity_temp.csv",
  "ppg_dalia_subject1_acc_ppg_activity_temp.csv"
];
const PPG_MAX_PARSE_ROWS = 240000;
const PPG_MAX_LIVE_POINTS = 30000;
const PPG_LIVE_ANALYSIS_INTERVAL_MS = 1000;
const PPG_WEB_CNN_FALLBACK_MODEL = {
  id: "keti_ppg_peak_cnn_adc_web_fallback",
  version: "0.2.0-fallback",
  kind: "local_conv1d_peak_detector",
  targetSampleRateHz: 32,
  minWindowSec: 8,
  recommendedWindowSec: 30,
  defaultThreshold: 0.42,
  training: {
    status: "not_trained",
    method: "hand_tuned_ppg_morphology_filters",
    dataset: "none",
    note: "The current web model uses fixed Conv1D pulse-shape filters. It was not fit from a dataset."
  },
  referenceDataset: {
    name: "PPG-DaLiA subject 1 subset",
    file: "ppg_dalia_subject1_acc_ppg_activity_temp.csv",
    usage: "reference only; used by the separate firmware HR regression model, not by this web Conv1D detector",
    rows: 298950,
    sampleRateHz: 32,
    firmwareRegression: {
      windowSec: 15,
      windowSamples: 480,
      examples: 3110,
      validationRmseBpm: 9.5157,
      validationMaeBpm: 7.3656
    }
  },
  layers: [
    {
      type: "conv1d",
      activation: "relu",
      filters: [
        { name: "wide_systolic_peak", weights: [-0.20, -0.35, -0.15, 0.25, 0.75, 1.00, 0.75, 0.25, -0.15, -0.35, -0.20], bias: 0 },
        { name: "medium_systolic_peak", weights: [-0.40, -0.25, 0.00, 0.35, 0.80, 0.35, 0.00, -0.25, -0.40], bias: 0 },
        { name: "narrow_systolic_peak", weights: [-0.50, -0.20, 0.35, 0.80, 0.35, -0.20, -0.50], bias: 0 }
      ]
    },
    { type: "average_pool1d", radiusSec: 0.06 },
    { type: "minmax" }
  ]
};
const PPG_HR_REGRESSION_FALLBACK_MODEL = {
  id: "keti_ppg_hr_ridge_regression_fallback",
  version: "unavailable",
  kind: "ridge_regression_hr_estimator",
  targetSampleRateHz: 32,
  windowSec: 15,
  windowSamples: 480,
  featureCount: 0,
  targetBpms: [],
  training: {
    status: "unavailable",
    method: "not_loaded",
    dataset: "none"
  },
  model: {
    bias: NaN,
    means: [],
    scales: [],
    weights: [],
    clampBpm: [35, 220]
  }
};
const NON_CANVAS_VIEWS = new Set(["dataset", "model", "ppg"]);
const INPUT_SETTINGS_VIEWS = new Set(["imu1d", "imu2d", "classification", "dataset", "model"]);
const WORKSPACE_LAYOUT_STORAGE_KEY = "keti_workspace_layout_v1";
const WORKSPACE_RESIZE_BREAKPOINT_PX = 1320;
const WORKSPACE_LAYOUT_DEFAULT = {
  controls: 280,
  settings: 300,
  data: 240
};
const WORKSPACE_LAYOUT_LIMITS = {
  controlsMin: 220,
  controlsMax: 520,
  settingsMin: 220,
  settingsMax: 520,
  plotMin: 360,
  dataMin: 180,
  dataMax: 680
};
const ADC_FORMAT_LABELS = {
  RAW: "RAW",
  ALL: "All ADC",
  DATA: "DATA",
  BUF: "BUF",
  FILT: "FILT",
  PLOTTER: "raw:/filtered:",
  BLE_DATA: "BLE_DATA",
  PPG: "PPG mirror",
  CUSTOM: "Custom columns"
};
const ADC_FORMATS = ["RAW", "DATA", "BUF", "FILT", "PLOTTER", "BLE_DATA", "PPG", "CUSTOM"];
const ADC_PLOT_SERIES = {
  raw: { label: "Raw", color: "#008c8c", width: 1.8 },
  filtered: { label: "Filtered", color: "#d28a00", width: 2.4 },
  millivolts: { label: "mV", color: "#2767c9", width: 2.1 },
  delta: { label: "Filtered - Raw", color: "#c83232", width: 2.1 },
  customY: { label: "Custom Y", color: "#008c8c", width: 2.2 },
  customY2: { label: "Custom Y2", color: "#d28a00", width: 1.8 }
};
const MAX_DEVICE_LOG_ROWS = 90;
const MAX_ADC_COLUMNS = 12;
const DEVICE_LOG_RENDER_INTERVAL_MS = 150;
const ADC_COLUMN_TYPES = [
  ["IGNORE", "Ignore"],
  ["LABEL", "Label / tag"],
  ["SEQ", "Sequence"],
  ["MICROS", "Time us"],
  ["MILLIS", "Time ms"],
  ["CHANNEL", "ADC channel"],
  ["RAW", "Raw"],
  ["MILLIVOLTS", "Voltage mV"],
  ["FILTERED", "Filtered"],
  ["CUSTOM_X", "Custom X"],
  ["CUSTOM_Y", "Custom Y"],
  ["CUSTOM_Y2", "Custom Y2"]
];
const DEFAULT_PREBUILT_FIRMWARES = [
  {
    id: "stage1_lab_console",
    version: "0.1.1",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage1_lab_console_v0.1.1.bin",
    size_bytes: 99552,
    sha256: "43756B93E6A3BC2433C7C82BCB03E500ABC7BFEF0ED6415066342FFBD8EBED20"
  },
  {
    id: "stage2_imu_console",
    version: "0.2.1",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage2_imu_console_v0.2.1.bin",
    size_bytes: 118336,
    sha256: "C7C87B479AA362E4138E0EA9BED20FA17E472560E6AED19D99B7329A34560705"
  },
  {
    id: "stage2_imu_ei_motion",
    version: "0.3.1",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage2_imu_ei_motion_v0.3.1.bin",
    size_bytes: 195984,
    sha256: "87969467618253CB93DEDCB429207B72A6ACB04E21F62A92FC61E814097609CA"
  },
  {
    id: "stage3_ppg_hr_adc",
    version: "0.4.1",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage3_ppg_hr_adc_v0.4.1.bin",
    size_bytes: 98680,
    sha256: "7E7E8449748D2EDAE19F050916648603028BBBE028AD2AC51A21B17E7E8A8014"
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
  connectionMode: null,
  bleDevice: null,
  bleServer: null,
  bleCharacteristic: null,
  readLoopActive: false,
  connected: false,
  streaming: false,
  recording: false,
  activeView: "adc",
  samples: [],
  adcFormatCounts: Object.fromEntries(ADC_FORMATS.map((format) => [format, 0])),
  adcSyntheticSeq: 0,
  adcDsp: createAdcDspState(),
  imuSamples: [],
  imuProcessedSamples: [],
  records: [],
  tableRows: [],
  latestSample: null,
  latestImu: null,
  latestProcessedImu: null,
  gyroOrientation: createGyroOrientationState(),
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
    startPending: false,
    seq: null,
    topLabel: "--",
    topScore: null,
    scores: [],
    timing: {},
    anomaly: null,
    updatedAt: null
  },
  ppg: {
    samples: [],
    sampleRateHz: 100,
    source: "",
    signalSource: "",
    columns: [],
    analysis: null,
    liveHr: null,
    liveStartMicros: null,
    lastAutoAnalysisAt: 0,
    lastAutoAnalysisSeq: null,
    loading: false,
    error: ""
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
  deviceLog: {
    rows: [],
    renderPending: false,
    lastRenderTime: 0
  },
  lineInspector: {
    delimiter: "AUTO",
    customDelimiter: ",",
    xAxis: "INDEX",
    yAxis: "DEFAULT",
    columnTypes: [],
    latest: null
  },
  workspaceLayout: { ...WORKSPACE_LAYOUT_DEFAULT },
  settings: {
    rateHz: 100,
    channel: 0,
    resolution: 12,
    filter: "RAW",
    adcFormat: "ALL",
    adcPlotMode: "RAW_FILTERED",
    dspProtocol: "AUTO",
    dspProtocolHint: "",
    alpha: 0.2,
    window: 8,
    windowSec: 0.08,
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
    normalizeMode: "NONE",
    gyroMagCorrection: true
  },
  preprocess: createPreprocessState(),
  flash: {
    directFirmwares: DEFAULT_PREBUILT_FIRMWARES,
    directBasePath: "firmware/prebuilt/",
    directBusy: false,
    directBootloaderTouched: false,
    helper: {
      available: false,
      checking: false,
      baseUrl: "",
      ports: [],
      selectedPort: "",
      lastError: ""
    }
  }
};

const el = {
  workspace: document.querySelector(".workspace"),
  workspaceSplitters: [...document.querySelectorAll(".workspace-splitter")],
  browserStatus: document.getElementById("browserStatus"),
  portStatus: document.getElementById("portStatus"),
  bleStatus: document.getElementById("bleStatus"),
  streamStatus: document.getElementById("streamStatus"),
  sampleCount: document.getElementById("sampleCount"),
  recordCount: document.getElementById("recordCount"),
  connectButton: document.getElementById("connectButton"),
  disconnectButton: document.getElementById("disconnectButton"),
  bleConnectButton: document.getElementById("bleConnectButton"),
  bleDisconnectButton: document.getElementById("bleDisconnectButton"),
  startButton: document.getElementById("startButton"),
  stopButton: document.getElementById("stopButton"),
  applyAcquisitionButton: document.getElementById("applyAcquisitionButton"),
  applyFilterButton: document.getElementById("applyFilterButton"),
  applyInputButton: document.getElementById("applyInputButton"),
  pingButton: document.getElementById("pingButton"),
  recordButton: document.getElementById("recordButton"),
  clearButton: document.getElementById("clearButton"),
  exportButton: document.getElementById("exportButton"),
  firmwareSelect: document.getElementById("firmwareSelect"),
  flashProfileSelect: document.getElementById("flashProfileSelect"),
  helperPortSelect: document.getElementById("helperPortSelect"),
  refreshHelperButton: document.getElementById("refreshHelperButton"),
  helperState: document.getElementById("helperState"),
  flashButton: document.getElementById("flashButton"),
  flashState: document.getElementById("flashState"),
  bootloaderButton: document.getElementById("bootloaderButton"),
  exitBootloaderButton: document.getElementById("exitBootloaderButton"),
  flashProgress: document.getElementById("flashProgress"),
  channelSelect: document.getElementById("channelSelect"),
  rateInput: document.getElementById("rateInput"),
  resolutionSelect: document.getElementById("resolutionSelect"),
  filterSelect: document.getElementById("filterSelect"),
  dspProtocolSelect: document.getElementById("dspProtocolSelect"),
  alphaInput: document.getElementById("alphaInput"),
  alphaOutput: document.getElementById("alphaOutput"),
  windowInput: document.getElementById("windowInput"),
  windowSliderInput: document.getElementById("windowSliderInput"),
  windowSliderOutput: document.getElementById("windowSliderOutput"),
  iirOrderInput: document.getElementById("iirOrderInput"),
  iirLowInput: document.getElementById("iirLowInput"),
  iirHighInput: document.getElementById("iirHighInput"),
  adcSettingsSection: document.getElementById("adcSettingsSection"),
  dspEquationMode: document.getElementById("dspEquationMode"),
  dspTransferFunction: document.getElementById("dspTransferFunction"),
  dspSectionEquation: document.getElementById("dspSectionEquation"),
  dspCoefficientGrid: document.getElementById("dspCoefficientGrid"),
  dspNyquistState: document.getElementById("dspNyquistState"),
  iirResponseCanvas: document.getElementById("iirResponseCanvas"),
  inputSettingsSection: document.getElementById("inputSettingsSection"),
  classificationSettingsSection: document.getElementById("classificationSettingsSection"),
  deviceLogSection: document.getElementById("deviceLogSection"),
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
  adcPlotControls: document.getElementById("adcPlotControls"),
  adcPlotModeSelect: document.getElementById("adcPlotModeSelect"),
  adcFormatState: document.getElementById("adcFormatState"),
  gyroControls: document.getElementById("gyroControls"),
  gyroMagCorrectionToggle: document.getElementById("gyroMagCorrectionToggle"),
  gyroResetButton: document.getElementById("gyroResetButton"),
  gyroMagState: document.getElementById("gyroMagState"),
  adcLineState: document.getElementById("adcLineState"),
  signalCanvas: document.getElementById("signalCanvas"),
  metricGrid: document.getElementById("metricGrid"),
  ppgView: document.getElementById("ppgView"),
  ppgStatus: document.getElementById("ppgStatus"),
  ppgSourceState: document.getElementById("ppgSourceState"),
  ppgMetricState: document.getElementById("ppgMetricState"),
  ppgWindowState: document.getElementById("ppgWindowState"),
  ppgCnnState: document.getElementById("ppgCnnState"),
  ppgModelState: document.getElementById("ppgModelState"),
  ppgFileInput: document.getElementById("ppgFileInput"),
  ppgLoadSampleButton: document.getElementById("ppgLoadSampleButton"),
  ppgAnalyzeButton: document.getElementById("ppgAnalyzeButton"),
  ppgSampleRateInput: document.getElementById("ppgSampleRateInput"),
  ppgStartInput: document.getElementById("ppgStartInput"),
  ppgDurationInput: document.getElementById("ppgDurationInput"),
  ppgRefractoryInput: document.getElementById("ppgRefractoryInput"),
  ppgThresholdInput: document.getElementById("ppgThresholdInput"),
  ppgThresholdOutput: document.getElementById("ppgThresholdOutput"),
  ppgMetrics: document.getElementById("ppgMetrics"),
  ppgCanvas: document.getElementById("ppgCanvas"),
  ppgModelCanvas: document.getElementById("ppgModelCanvas"),
  ppgCnnCanvas: document.getElementById("ppgCnnCanvas"),
  datasetView: document.getElementById("datasetView"),
  modelView: document.getElementById("modelView"),
  plotMeta: document.getElementById("plotMeta"),
  metric1Label: document.getElementById("metric1Label"),
  metric2Label: document.getElementById("metric2Label"),
  metric3Label: document.getElementById("metric3Label"),
  metric4Card: document.getElementById("metric4Card"),
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
  classificationWindowState: document.getElementById("classificationWindowState"),
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
  datasetSizeState: document.getElementById("datasetSizeState"),
  datasetPreviewState: document.getElementById("datasetPreviewState"),
  datasetPreviewCanvas: document.getElementById("datasetPreviewCanvas"),
  datasetLabelList: document.getElementById("datasetLabelList"),
  datasetTableBody: document.getElementById("datasetTableBody"),
  modelStatus: document.getElementById("modelStatus"),
  modelShapeState: document.getElementById("modelShapeState"),
  modelArchitectureCanvas: document.getElementById("modelArchitectureCanvas"),
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

function resizeAuxCanvasToDisplaySize(canvas, minHeight = 180) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = Math.max(280, Math.round(rect.width));
  const displayHeight = Math.max(minHeight, Math.round(rect.height));
  const backingWidth = Math.round(displayWidth * dpr);
  const backingHeight = Math.round(displayHeight * dpr);

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  const canvasCtx = canvas.getContext("2d");
  canvasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx: canvasCtx, width: displayWidth, height: displayHeight };
}

function setStatus(node, text, mode = "muted") {
  node.textContent = text;
  node.className = `status-pill ${mode}`.trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncAdcLineInspectorSettings() {
  state.lineInspector.delimiter = "COMMA";
  state.lineInspector.customDelimiter = ",";
  state.lineInspector.xAxis = "INDEX";
  state.lineInspector.yAxis = "DEFAULT";
}

function getDelimiterSpec(line, mode = state.lineInspector.delimiter) {
  if (mode === "CUSTOM") {
    const custom = state.lineInspector.customDelimiter || ",";
    return { mode, label: `custom "${custom}"`, char: custom };
  }
  if (mode === "TAB") {
    return { mode, label: "tab", char: "\t" };
  }
  if (mode === "SPACE") {
    return { mode, label: "space", char: " " };
  }
  if (mode === "SEMICOLON") {
    return { mode, label: "semicolon", char: ";" };
  }
  if (mode === "COMMA") {
    return { mode, label: "comma", char: "," };
  }

  if (line.includes("\t")) {
    return { mode: "TAB", label: "tab", char: "\t" };
  }
  if (line.includes(";")) {
    return { mode: "SEMICOLON", label: "semicolon", char: ";" };
  }
  if (line.includes(",")) {
    return { mode: "COMMA", label: "comma", char: "," };
  }
  if (/\s+/.test(line.trim())) {
    return { mode: "SPACE", label: "space", char: " " };
  }
  return { mode: "NONE", label: "single column", char: "" };
}

function splitLineWithDelimiter(line, delimiter) {
  if (!delimiter.char) {
    return [line.trim()];
  }
  if (delimiter.mode === "SPACE") {
    return line.trim().split(/\s+/);
  }
  return line.split(delimiter.char).map((cell) => cell.trim());
}

function parseColumnNumber(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return NaN;
  }
  const keyValueIndex = text.lastIndexOf(":");
  const numericText = keyValueIndex >= 0 ? text.slice(keyValueIndex + 1).trim() : text;
  const normalized = numericText.replace(/[^0-9eE+\-.]/g, "");
  if (!normalized || normalized === "-" || normalized === ".") {
    return NaN;
  }
  return Number(normalized);
}

function inferAdcColumnTypes(line, cells) {
  const types = Array(Math.min(cells.length, MAX_ADC_COLUMNS)).fill("IGNORE");
  const first = String(cells[0] || "").trim().toUpperCase();

  if (first === "DATA") {
    ["LABEL", "SEQ", "MICROS", "CHANNEL", "RAW", "MILLIVOLTS", "FILTERED"].forEach((type, index) => {
      if (index < types.length) {
        types[index] = type;
      }
    });
    return types;
  }

  if (first === "FILT") {
    ["LABEL", "SEQ", "MICROS", "LABEL", "MILLIVOLTS", "FILTERED"].forEach((type, index) => {
      if (index < types.length) {
        types[index] = type;
      }
    });
    return types;
  }

  if (first === "BLE_DATA") {
    ["LABEL", "MILLIS", "RAW"].forEach((type, index) => {
      if (index < types.length) {
        types[index] = type;
      }
    });
    return types;
  }

  if (first === "BUF") {
    ["LABEL", "SEQ", "MICROS"].forEach((type, index) => {
      if (index < types.length) {
        types[index] = type;
      }
    });
    if (types.length > 3) {
      types[3] = "RAW";
    }
    return types;
  }

  cells.slice(0, MAX_ADC_COLUMNS).forEach((cell, index) => {
    const key = String(cell).split(":")[0].trim().toLowerCase();
    if (key === "raw" || key === "adc") {
      types[index] = "RAW";
    } else if (key === "filtered" || key === "filt") {
      types[index] = "FILTERED";
    } else if (key === "mv" || key === "millivolts" || key === "voltage") {
      types[index] = "MILLIVOLTS";
    } else if (key === "seq") {
      types[index] = "SEQ";
    } else if (key === "micros" || key === "us") {
      types[index] = "MICROS";
    }
  });

  if (types.some((type) => type !== "IGNORE")) {
    return types;
  }

  const numericColumns = cells
    .slice(0, MAX_ADC_COLUMNS)
    .map((cell, index) => ({ index, value: parseColumnNumber(cell) }))
    .filter((item) => Number.isFinite(item.value));
  if (numericColumns.length === 1) {
    types[numericColumns[0].index] = "CUSTOM_Y";
  } else if (numericColumns.length >= 2) {
    types[numericColumns[0].index] = "CUSTOM_X";
    types[numericColumns[1].index] = "CUSTOM_Y";
    if (numericColumns.length >= 3) {
      types[numericColumns[2].index] = "CUSTOM_Y2";
    }
  }
  return types;
}

function analyzeDeviceLine(line) {
  syncAdcLineInspectorSettings();
  const delimiter = getDelimiterSpec(line);
  const cells = splitLineWithDelimiter(line, delimiter).slice(0, MAX_ADC_COLUMNS);
  const parsedRaw = extractRawAdcFields(line);
  const inferredTypes = inferAdcColumnTypes(line, cells);
  const summary = summarizeDeviceLine(line, cells, parsedRaw);
  return {
    line,
    delimiter,
    cells,
    inferredTypes,
    summary
  };
}

function summarizeDeviceLine(line, cells, parsedRaw = null) {
  if (parsedRaw) {
    return `RAW sample - ${formatNumber(parsedRaw.raw, 0)}`;
  }
  if (line.startsWith("IMU,")) {
    return "IMU sample";
  }
  if (line.startsWith("CLS,")) {
    return "classification";
  }
  if (line.startsWith("PPG,")) {
    return "PPG sample";
  }
  if (line.startsWith("HR,")) {
    return "HR result";
  }
  if (line.startsWith("ACK,")) {
    return "ack";
  }
  if (line.startsWith("ERR,")) {
    return "error";
  }
  if (line.startsWith("STATUS,")) {
    return "status";
  }
  if (isAdcStreamLine(line)) {
    return "ADC sample";
  }
  return `${cells.length} field${cells.length === 1 ? "" : "s"}`;
}

function ensureAdcColumnTypes(analysis, force = false) {
  if (!analysis) {
    return;
  }
  const next = [...state.lineInspector.columnTypes];
  analysis.cells.forEach((_, index) => {
    if (force || !next[index]) {
      next[index] = analysis.inferredTypes[index] || "IGNORE";
    }
  });
  state.lineInspector.columnTypes = next.slice(0, Math.max(analysis.cells.length, next.length));
}

function applyAutoAdcColumnTypes() {
  if (!state.lineInspector.latest) {
    return;
  }
  ensureAdcColumnTypes(state.lineInspector.latest, true);
  renderDeviceLog();
  drawPlot();
}

function refreshAdcLineInspector({ forceColumns = false } = {}) {
  syncAdcLineInspectorSettings();
  const latestLine = state.lineInspector.latest?.line;
  if (latestLine) {
    state.lineInspector.latest = analyzeDeviceLine(latestLine);
    ensureAdcColumnTypes(state.lineInspector.latest, forceColumns);
  }
  renderDeviceLog();
  drawPlot();
}

function scheduleDeviceLogRender() {
  if (state.deviceLog.renderPending) {
    return;
  }
  const elapsed = performance.now() - state.deviceLog.lastRenderTime;
  const delay = Math.max(0, DEVICE_LOG_RENDER_INTERVAL_MS - elapsed);
  state.deviceLog.renderPending = true;
  setTimeout(() => {
    state.deviceLog.renderPending = false;
    state.deviceLog.lastRenderTime = performance.now();
    renderDeviceLog();
  }, delay);
}

function appendDeviceLogLine(line, direction = "rx", stream = false) {
  const analysis = analyzeDeviceLine(line);
  state.lineInspector.latest = analysis;
  state.deviceLog.rows.unshift({
    time: new Date().toLocaleTimeString(),
    direction,
    stream,
    line,
    summary: analysis.summary
  });
  if (state.deviceLog.rows.length > MAX_DEVICE_LOG_ROWS) {
    state.deviceLog.rows.length = MAX_DEVICE_LOG_ROWS;
  }
  scheduleDeviceLogRender();
}

function renderDeviceLog() {
  if (!el.logOutput) {
    return;
  }
  const latest = state.lineInspector.latest;
  if (el.adcLineState) {
    el.adcLineState.textContent = latest
      ? `${latest.summary} - ${state.samples.length} ADC samples`
      : "Waiting for serial lines";
  }
  const text = state.deviceLog.rows.map((row) => {
    const prefix = row.direction === "tx" ? ">>" : "<<";
    const stream = row.stream ? " stream" : "";
    return `${row.time} ${prefix}${stream} [${row.summary}] ${row.line}`;
  }).join("\n");
  el.logOutput.textContent = text;
}

function logLine(line, direction = "rx") {
  appendDeviceLogLine(line, direction, false);
}

function setUiEnabled() {
  const connected = state.connected;
  const streaming = state.streaming;
  const serialSupported = "serial" in navigator;
  const bleSupported = "bluetooth" in navigator;
  const serialMode = state.connectionMode === "serial";
  const bleMode = state.connectionMode === "ble";
  const helperReady = state.flash.helper.available && Boolean(state.flash.helper.selectedPort || el.helperPortSelect?.value);
  const directFlashReady = serialSupported && Boolean(window.KetiDirectFlash);

  el.connectButton.disabled = connected || !serialSupported;
  el.disconnectButton.disabled = !serialMode;
  el.bleConnectButton.disabled = connected || !bleSupported;
  el.bleDisconnectButton.disabled = !bleMode;
  el.startButton.disabled = !connected || streaming;
  el.stopButton.disabled = !connected || !streaming;
  el.applyAcquisitionButton.disabled = !serialMode;
  el.applyFilterButton.disabled = !serialMode;
  el.pingButton.disabled = !serialMode;
  el.recordButton.disabled = !connected;
  el.classStartButton.disabled = !serialMode || state.classification.active;
  el.classStopButton.disabled = !serialMode || !state.classification.active;
  el.exportButton.disabled = state.records.length === 0;
  el.datasetCaptureOneButton.disabled = state.imuSamples.length < getDatasetWindowSize();
  el.datasetExportJsonButton.disabled = state.dataset.examples.length === 0;
  el.datasetExportCsvButton.disabled = state.dataset.examples.length === 0;
  el.trainModelButton.disabled = state.dataset.examples.length < 2 || labelCounts().length < 2;
  el.exportModelJsonButton.disabled = !state.model.trained;
  el.exportCArrayButton.disabled = !state.model.trained;
  if (el.ppgAnalyzeButton) {
    el.ppgAnalyzeButton.disabled = state.ppg.loading || state.ppg.samples.length === 0;
  }
  if (el.ppgLoadSampleButton) {
    el.ppgLoadSampleButton.disabled = state.ppg.loading;
  }
  if (el.ppgFileInput) {
    el.ppgFileInput.disabled = state.ppg.loading;
  }
  el.bootloaderButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.exitBootloaderButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.flashButton.disabled = state.flash.directBusy || (!helperReady && !directFlashReady);
  el.flashProfileSelect.disabled = state.flash.directBusy;
  el.helperPortSelect.disabled = state.flash.directBusy || !state.flash.helper.available || state.flash.helper.ports.length === 0;
  el.refreshHelperButton.disabled = state.flash.directBusy || state.flash.helper.checking;

  el.recordButton.textContent = state.recording ? "Stop Rec" : "Record";
  el.datasetCaptureButton.textContent = state.dataset.captureActive ? "Stop Capture" : "Start Capture";
  el.flashButton.textContent = state.flash.directBusy
    ? "Flashing..."
    : helperReady ? "Flash via Helper" : "Flash Firmware";
  el.startButton.textContent = state.activeView === "classification" ? "Start + Class" : "Start";
  el.stopButton.textContent = state.activeView === "classification" ? "Stop + Class" : "Stop";
  const connectionLabel = bleMode ? "BLE connected" : serialMode ? "Serial connected" : "Disconnected";
  setStatus(el.portStatus, connectionLabel, connected ? "" : "muted");
  const bleLabel = bleMode ? "BLE ADC connected" : bleSupported ? "BLE ready" : "BLE unavailable";
  setStatus(el.bleStatus, bleLabel, bleMode ? "" : bleSupported ? "muted" : "error");
  setStatus(el.streamStatus, streaming ? "Streaming" : "Idle", streaming ? "warning" : "muted");
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function clampPx(value, fallback, min, max) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  const safeMax = Math.max(min, max);
  return Math.round(Math.min(safeMax, Math.max(min, safeValue)));
}

function getWorkspaceResizeMetrics() {
  if (!el.workspace) {
    return {
      width: 0,
      height: 0,
      columnGap: 14,
      rowGap: 14,
      splitterSize: 10,
      panelWidth: 1200
    };
  }

  const rect = el.workspace.getBoundingClientRect();
  const computed = getComputedStyle(el.workspace);
  const columnGap = Number.parseFloat(computed.columnGap) || 14;
  const rowGap = Number.parseFloat(computed.rowGap) || columnGap;
  const splitterSize = Number.parseFloat(computed.getPropertyValue("--workspace-splitter-size")) || 10;
  const panelWidth = Math.max(
    WORKSPACE_LAYOUT_LIMITS.controlsMin + WORKSPACE_LAYOUT_LIMITS.settingsMin + WORKSPACE_LAYOUT_LIMITS.plotMin,
    rect.width - splitterSize * 2 - columnGap * 4
  );
  return { width: rect.width, height: rect.height, columnGap, rowGap, splitterSize, panelWidth };
}

function isWorkspaceResizable() {
  return Boolean(el.workspace) && window.innerWidth > WORKSPACE_RESIZE_BREAKPOINT_PX;
}

function clampWorkspaceLayout(layout) {
  const metrics = getWorkspaceResizeMetrics();
  const maxSettings = Math.min(
    WORKSPACE_LAYOUT_LIMITS.settingsMax,
    metrics.panelWidth - WORKSPACE_LAYOUT_LIMITS.controlsMin - WORKSPACE_LAYOUT_LIMITS.plotMin
  );
  let settings = clampPx(
    layout.settings,
    WORKSPACE_LAYOUT_DEFAULT.settings,
    WORKSPACE_LAYOUT_LIMITS.settingsMin,
    maxSettings
  );

  const maxControls = Math.min(
    WORKSPACE_LAYOUT_LIMITS.controlsMax,
    metrics.panelWidth - settings - WORKSPACE_LAYOUT_LIMITS.plotMin
  );
  const controls = clampPx(
    layout.controls,
    WORKSPACE_LAYOUT_DEFAULT.controls,
    WORKSPACE_LAYOUT_LIMITS.controlsMin,
    maxControls
  );

  const adjustedMaxSettings = Math.min(
    WORKSPACE_LAYOUT_LIMITS.settingsMax,
    metrics.panelWidth - controls - WORKSPACE_LAYOUT_LIMITS.plotMin
  );
  settings = clampPx(settings, WORKSPACE_LAYOUT_DEFAULT.settings, WORKSPACE_LAYOUT_LIMITS.settingsMin, adjustedMaxSettings);

  const viewportDataMax = Math.max(
    WORKSPACE_LAYOUT_LIMITS.dataMin,
    Math.min(WORKSPACE_LAYOUT_LIMITS.dataMax, Math.round(window.innerHeight * 0.72))
  );
  const data = clampPx(layout.data, WORKSPACE_LAYOUT_DEFAULT.data, WORKSPACE_LAYOUT_LIMITS.dataMin, viewportDataMax);

  return { controls, settings, data };
}

function saveWorkspaceLayout() {
  try {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(state.workspaceLayout));
  } catch (error) {
    logLine(`WARN,workspace_layout_save,${error.message}`);
  }
}

function applyWorkspaceLayout(layout, { persist = false, redraw = true } = {}) {
  if (!el.workspace) {
    return;
  }
  state.workspaceLayout = clampWorkspaceLayout(layout);
  el.workspace.style.setProperty("--controls-col", `${state.workspaceLayout.controls}px`);
  el.workspace.style.setProperty("--settings-col", `${state.workspaceLayout.settings}px`);
  el.workspace.style.setProperty("--data-row", `${state.workspaceLayout.data}px`);
  if (persist) {
    saveWorkspaceLayout();
  }
  if (redraw) {
    drawPlot();
  }
}

function loadWorkspaceLayout() {
  let storedLayout = null;
  try {
    const raw = localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    storedLayout = raw ? JSON.parse(raw) : null;
  } catch (error) {
    logLine(`WARN,workspace_layout_load,${error.message}`);
  }
  applyWorkspaceLayout(storedLayout || WORKSPACE_LAYOUT_DEFAULT, { persist: false, redraw: false });
}

function resetWorkspaceLayout() {
  applyWorkspaceLayout(WORKSPACE_LAYOUT_DEFAULT, { persist: true, redraw: true });
}

function updateWorkspaceLayoutFromPointer(target, pointerEvent) {
  const metrics = getWorkspaceResizeMetrics();
  const rect = el.workspace.getBoundingClientRect();
  const nextLayout = { ...state.workspaceLayout };

  if (target === "controls") {
    nextLayout.controls = pointerEvent.clientX - rect.left - metrics.columnGap - metrics.splitterSize / 2;
  } else if (target === "settings") {
    nextLayout.settings = rect.right - pointerEvent.clientX - metrics.columnGap - metrics.splitterSize / 2;
  } else if (target === "data") {
    nextLayout.data = rect.bottom - pointerEvent.clientY - metrics.rowGap - metrics.splitterSize / 2;
  }

  applyWorkspaceLayout(nextLayout, { persist: false, redraw: true });
}

function startWorkspaceResize(event) {
  if (!isWorkspaceResizable()) {
    return;
  }
  const splitter = event.currentTarget;
  const target = splitter.dataset.resizeTarget;
  if (!target) {
    return;
  }

  event.preventDefault();
  splitter.classList.add("is-dragging");
  document.body.classList.add("workspace-resizing");
  document.body.classList.toggle("workspace-resizing-row", target === "data");
  splitter.setPointerCapture?.(event.pointerId);

  const onPointerMove = (moveEvent) => {
    moveEvent.preventDefault();
    updateWorkspaceLayoutFromPointer(target, moveEvent);
  };
  const onPointerUp = () => {
    splitter.classList.remove("is-dragging");
    document.body.classList.remove("workspace-resizing", "workspace-resizing-row");
    splitter.releasePointerCapture?.(event.pointerId);
    saveWorkspaceLayout();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function handleWorkspaceWindowResize() {
  if (isWorkspaceResizable()) {
    applyWorkspaceLayout(state.workspaceLayout, { persist: false, redraw: false });
  }
  drawPlot();
}

function initWorkspaceResizers() {
  loadWorkspaceLayout();
  for (const splitter of el.workspaceSplitters) {
    splitter.addEventListener("pointerdown", startWorkspaceResize);
    splitter.addEventListener("dblclick", resetWorkspaceLayout);
  }
}

function finiteOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatAdcMetric(value, digits = 1, unit = "") {
  if (!Number.isFinite(value)) {
    return "--";
  }
  const suffix = unit ? ` ${unit}` : "";
  return `${value.toFixed(digits)}${suffix}`;
}

function rawToMillivolts(raw) {
  if (!Number.isFinite(raw)) {
    return NaN;
  }
  const maxCode = Math.max(1, (1 << state.settings.resolution) - 1);
  return (raw / maxCode) * 3300;
}

function nextAdcSyntheticSeq() {
  const seq = state.adcSyntheticSeq;
  state.adcSyntheticSeq += 1;
  return seq;
}

function formatSeconds(value) {
  return value >= 1 ? value.toFixed(2) : value.toFixed(3);
}

function adcWindowSamplesFromSeconds(seconds) {
  const rateHz = Math.max(1, normalizeNumber(state.settings.rateHz, 100, 1, 1000));
  return Math.max(1, Math.min(32, Math.round(normalizeNumber(seconds, state.settings.windowSec, 0.001, 32) * rateHz)));
}

function adcWindowSecondsFromSamples(samples) {
  const rateHz = Math.max(1, normalizeNumber(state.settings.rateHz, 100, 1, 1000));
  return normalizeNumber(samples, 8, 1, 32) / rateHz;
}

function syncAdcWindowControls() {
  const sampleCount = Math.round(normalizeNumber(state.settings.window, 8, 1, 32));
  const seconds = adcWindowSecondsFromSamples(sampleCount);
  state.settings.window = sampleCount;
  state.settings.windowSec = seconds;
  if (el.windowInput) {
    el.windowInput.value = formatSeconds(seconds);
  }
  if (el.windowSliderInput) {
    el.windowSliderInput.value = String(sampleCount);
  }
  if (el.windowSliderOutput) {
    el.windowSliderOutput.textContent = `${sampleCount} samples`;
  }
}

function updateAdcWindowInputFromSamples(samples) {
  const sampleCount = Math.round(normalizeNumber(samples, 8, 1, 32));
  state.settings.window = sampleCount;
  syncAdcWindowControls();
  updateFilterStateText();
}

function updateFilterStateText() {
  el.filterState.textContent = `${state.settings.filter} ${formatSeconds(state.settings.windowSec)}s`;
  renderDspPanel();
}

function dspSampleRateHz() {
  return normalizeNumber(el.rateInput?.value ?? state.settings.rateHz, state.settings.rateHz || 100, 1, 1000);
}

function dspMaxCutoffHz(sampleRateHz = dspSampleRateHz()) {
  return Math.max(0.02, sampleRateHz * 0.45);
}

function lowPassCoefficientAtRate(cutoffHz, sampleRateHz) {
  const cutoff = Math.max(0.001, cutoffHz);
  const dt = 1 / Math.max(1, sampleRateHz);
  const rc = 1 / (2 * Math.PI * cutoff);
  return dt / (rc + dt);
}

function highPassCoefficientAtRate(cutoffHz, sampleRateHz) {
  const cutoff = Math.max(0.001, cutoffHz);
  const dt = 1 / Math.max(1, sampleRateHz);
  const rc = 1 / (2 * Math.PI * cutoff);
  return rc / (rc + dt);
}

function coeffText(value) {
  return Number.isFinite(value) ? value.toPrecision(6) : "--";
}

function syncDspSettingsFromControls({ writeBack = false } = {}) {
  const sampleRateHz = dspSampleRateHz();
  const maxCutoff = dspMaxCutoffHz(sampleRateHz);
  const highHz = normalizeNumber(el.iirHighInput.value, state.settings.iirHighHz, 0.02, maxCutoff);
  const lowHz = Math.min(
    normalizeNumber(el.iirLowInput.value, state.settings.iirLowHz, 0.01, maxCutoff),
    Math.max(0.01, highHz - 0.01)
  );
  const order = Math.round(normalizeNumber(el.iirOrderInput.value, state.settings.iirOrder, 1, 4));

  state.settings.filter = el.filterSelect.value;
  state.settings.dspProtocol = el.dspProtocolSelect.value || "AUTO";
  state.settings.rateHz = sampleRateHz;
  state.settings.alpha = normalizeNumber(el.alphaInput.value, state.settings.alpha, 0.001, 1);
  state.settings.windowSec = normalizeNumber(el.windowInput.value, state.settings.windowSec, 0.001, 32);
  state.settings.window = adcWindowSamplesFromSeconds(state.settings.windowSec);
  state.settings.windowSec = adcWindowSecondsFromSamples(state.settings.window);
  state.settings.iirOrder = order;
  state.settings.iirLowHz = lowHz;
  state.settings.iirHighHz = highHz;

  if (writeBack) {
    el.rateInput.value = sampleRateHz.toFixed(Math.abs(sampleRateHz - Math.round(sampleRateHz)) < 0.01 ? 0 : 1);
    el.alphaInput.value = String(state.settings.alpha);
    el.alphaOutput.textContent = state.settings.alpha.toFixed(3);
    syncAdcWindowControls();
    el.iirOrderInput.value = String(order);
    el.iirLowInput.value = lowHz.toFixed(3).replace(/\.?0+$/, "");
    el.iirHighInput.value = highHz.toFixed(3).replace(/\.?0+$/, "");
  }

  return {
    mode: state.settings.filter,
    protocol: state.settings.dspProtocol,
    sampleRateHz,
    nyquistHz: sampleRateHz / 2,
    maxCutoff,
    order,
    lowHz,
    highHz,
    emaAlpha: state.settings.alpha,
    maWindow: state.settings.window
  };
}

function lpfMagnitudeAt(frequencyHz, cutoffHz, sampleRateHz) {
  const alpha = lowPassCoefficientAtRate(cutoffHz, sampleRateHz);
  const a1 = 1 - alpha;
  const w = (2 * Math.PI * frequencyHz) / sampleRateHz;
  const denRe = 1 - a1 * Math.cos(w);
  const denIm = a1 * Math.sin(w);
  return alpha / Math.max(1e-9, Math.sqrt(denRe * denRe + denIm * denIm));
}

function hpfMagnitudeAt(frequencyHz, cutoffHz, sampleRateHz) {
  const beta = highPassCoefficientAtRate(cutoffHz, sampleRateHz);
  const w = (2 * Math.PI * frequencyHz) / sampleRateHz;
  const numRe = beta * (1 - Math.cos(w));
  const numIm = beta * Math.sin(w);
  const denRe = 1 - beta * Math.cos(w);
  const denIm = beta * Math.sin(w);
  return Math.sqrt(numRe * numRe + numIm * numIm) / Math.max(1e-9, Math.sqrt(denRe * denRe + denIm * denIm));
}

function maMagnitudeAt(frequencyHz, sampleRateHz, windowSamples) {
  const w = (2 * Math.PI * frequencyHz) / sampleRateHz;
  const den = Math.sin(w / 2);
  if (Math.abs(den) < 1e-9) {
    return 1;
  }
  return Math.abs(Math.sin((windowSamples * w) / 2) / (windowSamples * den));
}

function dspMagnitudeAt(frequencyHz, params) {
  if (params.mode === "IIR_LPF") {
    return Math.pow(lpfMagnitudeAt(frequencyHz, params.highHz, params.sampleRateHz), params.order);
  }
  if (params.mode === "IIR_HPF") {
    return Math.pow(hpfMagnitudeAt(frequencyHz, params.lowHz, params.sampleRateHz), params.order);
  }
  if (params.mode === "IIR_BPF") {
    return Math.pow(hpfMagnitudeAt(frequencyHz, params.lowHz, params.sampleRateHz), params.order) *
      Math.pow(lpfMagnitudeAt(frequencyHz, params.highHz, params.sampleRateHz), params.order);
  }
  if (params.mode === "EMA") {
    const alpha = params.emaAlpha;
    const a1 = 1 - alpha;
    const w = (2 * Math.PI * frequencyHz) / params.sampleRateHz;
    const denRe = 1 - a1 * Math.cos(w);
    const denIm = a1 * Math.sin(w);
    return alpha / Math.max(1e-9, Math.sqrt(denRe * denRe + denIm * denIm));
  }
  if (params.mode === "MA") {
    return maMagnitudeAt(frequencyHz, params.sampleRateHz, params.maWindow);
  }
  return 1;
}

function describeDspTransfer(params) {
  const lowAlpha = lowPassCoefficientAtRate(params.lowHz, params.sampleRateHz);
  const highAlpha = lowPassCoefficientAtRate(params.highHz, params.sampleRateHz);
  const lowBeta = highPassCoefficientAtRate(params.lowHz, params.sampleRateHz);
  const emaA1 = 1 - params.emaAlpha;
  const lowA1 = 1 - lowAlpha;
  const highA1 = 1 - highAlpha;

  if (params.mode === "IIR_LPF") {
    return {
      modeLabel: `IIR LPF / fs=${params.sampleRateHz.toFixed(1)} Hz / N=${params.order}`,
      transfer: `H_LPF(z) = ${coeffText(highAlpha)} / (1 - ${coeffText(highA1)} z^-1)\nH_total(z) = H_LPF(z)^${params.order}`,
      equation: `y[n] = ${coeffText(highA1)} y[n-1] + ${coeffText(highAlpha)} x[n]`,
      coefficients: [
        ["LPF cutoff", `${params.highHz.toFixed(3)} Hz`],
        ["alpha", coeffText(highAlpha)],
        ["b0", coeffText(highAlpha)],
        ["a1", coeffText(highA1)]
      ]
    };
  }

  if (params.mode === "IIR_HPF") {
    return {
      modeLabel: `IIR HPF / fs=${params.sampleRateHz.toFixed(1)} Hz / N=${params.order}`,
      transfer: `H_HPF(z) = ${coeffText(lowBeta)}(1 - z^-1) / (1 - ${coeffText(lowBeta)} z^-1)\nH_total(z) = H_HPF(z)^${params.order}`,
      equation: `y[n] = ${coeffText(lowBeta)} y[n-1] + ${coeffText(lowBeta)} x[n] - ${coeffText(lowBeta)} x[n-1]`,
      coefficients: [
        ["HPF cutoff", `${params.lowHz.toFixed(3)} Hz`],
        ["beta", coeffText(lowBeta)],
        ["b0, b1", `${coeffText(lowBeta)}, ${coeffText(-lowBeta)}`],
        ["a1", coeffText(lowBeta)]
      ]
    };
  }

  if (params.mode === "IIR_BPF") {
    return {
      modeLabel: `IIR BPF / fs=${params.sampleRateHz.toFixed(1)} Hz / N=${params.order}`,
      transfer: `H_BPF(z) = H_HPF(z, ${params.lowHz.toFixed(3)} Hz)^${params.order} * H_LPF(z, ${params.highHz.toFixed(3)} Hz)^${params.order}`,
      equation: `HPF: y[n] = ${coeffText(lowBeta)} y[n-1] + ${coeffText(lowBeta)} x[n] - ${coeffText(lowBeta)} x[n-1]\nLPF: y[n] = ${coeffText(highA1)} y[n-1] + ${coeffText(highAlpha)} x[n]`,
      coefficients: [
        ["HPF beta", coeffText(lowBeta)],
        ["LPF alpha", coeffText(highAlpha)],
        ["Low / High", `${params.lowHz.toFixed(3)} / ${params.highHz.toFixed(3)} Hz`],
        ["Cascade", `HPF^${params.order} -> LPF^${params.order}`]
      ]
    };
  }

  if (params.mode === "EMA") {
    return {
      modeLabel: `EMA / fs=${params.sampleRateHz.toFixed(1)} Hz`,
      transfer: `H_EMA(z) = ${coeffText(params.emaAlpha)} / (1 - ${coeffText(emaA1)} z^-1)`,
      equation: `y[n] = ${coeffText(emaA1)} y[n-1] + ${coeffText(params.emaAlpha)} x[n]`,
      coefficients: [
        ["alpha", coeffText(params.emaAlpha)],
        ["b0", coeffText(params.emaAlpha)],
        ["a1", coeffText(emaA1)],
        ["Type", "1st-order IIR"]
      ]
    };
  }

  if (params.mode === "MA") {
    return {
      modeLabel: `Moving average / fs=${params.sampleRateHz.toFixed(1)} Hz`,
      transfer: `H_MA(z) = (1/${params.maWindow}) * (1 - z^-${params.maWindow}) / (1 - z^-1)`,
      equation: `y[n] = average(x[n], ... x[n-${params.maWindow - 1}])`,
      coefficients: [
        ["Window", `${params.maWindow} samples`],
        ["Window time", `${formatSeconds(params.maWindow / params.sampleRateHz)} s`],
        ["b[k]", `1/${params.maWindow}`],
        ["Type", "FIR"]
      ]
    };
  }

  return {
    modeLabel: `RAW / fs=${params.sampleRateHz.toFixed(1)} Hz`,
    transfer: "H(z) = 1",
    equation: "y[n] = x[n]",
    coefficients: [
      ["Gain", "1"],
      ["Delay", "0"],
      ["Type", "Bypass"],
      ["Cutoff", "--"]
    ]
  };
}

function renderDspCoefficientGrid(items) {
  if (!el.dspCoefficientGrid) {
    return;
  }
  el.dspCoefficientGrid.replaceChildren(
    ...items.map(([label, value]) => {
      const node = document.createElement("div");
      const labelNode = document.createElement("span");
      const valueNode = document.createElement("strong");
      labelNode.textContent = label;
      valueNode.textContent = value;
      node.append(labelNode, valueNode);
      return node;
    })
  );
}

function drawDspResponsePlot(params) {
  if (!el.iirResponseCanvas) {
    return;
  }
  const { ctx: responseCtx, width, height } = resizeAuxCanvasToDisplaySize(el.iirResponseCanvas, 190);
  const pad = { left: 42, right: 14, top: 18, bottom: 30 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const minDb = -60;
  const maxDb = 6;
  const nyquist = params.sampleRateHz / 2;

  responseCtx.clearRect(0, 0, width, height);
  responseCtx.fillStyle = "#ffffff";
  responseCtx.fillRect(0, 0, width, height);
  drawGridOn(responseCtx, width, height, pad, plotWidth, plotHeight);

  responseCtx.strokeStyle = "#008c8c";
  responseCtx.lineWidth = 2;
  responseCtx.beginPath();
  const points = Math.max(96, Math.min(320, Math.round(plotWidth)));
  for (let index = 0; index < points; index++) {
    const frequency = (nyquist * index) / Math.max(1, points - 1);
    const magnitude = Math.max(1e-6, dspMagnitudeAt(frequency, params));
    const db = Math.max(minDb, Math.min(maxDb, 20 * Math.log10(magnitude)));
    const x = pad.left + (plotWidth * index) / Math.max(1, points - 1);
    const y = pad.top + plotHeight - ((db - minDb) / (maxDb - minDb)) * plotHeight;
    if (index === 0) {
      responseCtx.moveTo(x, y);
    } else {
      responseCtx.lineTo(x, y);
    }
  }
  responseCtx.stroke();

  const markers = [];
  if (params.mode === "IIR_HPF" || params.mode === "IIR_BPF") {
    markers.push({ hz: params.lowHz, label: "low", color: "#d28a00" });
  }
  if (params.mode === "IIR_LPF" || params.mode === "IIR_BPF") {
    markers.push({ hz: params.highHz, label: "high", color: "#2767c9" });
  }
  for (const marker of markers) {
    const x = pad.left + (Math.min(marker.hz, nyquist) / nyquist) * plotWidth;
    responseCtx.strokeStyle = marker.color;
    responseCtx.setLineDash([4, 4]);
    responseCtx.beginPath();
    responseCtx.moveTo(x, pad.top);
    responseCtx.lineTo(x, pad.top + plotHeight);
    responseCtx.stroke();
    responseCtx.setLineDash([]);
    responseCtx.fillStyle = marker.color;
    responseCtx.font = "11px Segoe UI, Arial, sans-serif";
    responseCtx.fillText(marker.label, Math.min(x + 4, width - 44), pad.top + 13);
  }

  responseCtx.fillStyle = "#637083";
  responseCtx.font = "11px Segoe UI, Arial, sans-serif";
  responseCtx.fillText(`${maxDb} dB`, 7, pad.top + 4);
  responseCtx.fillText(`${minDb} dB`, 4, pad.top + plotHeight);
  responseCtx.fillText("0 Hz", pad.left, height - 8);
  responseCtx.fillText(`${nyquist.toFixed(1)} Hz`, width - pad.right - 58, height - 8);
}

function renderDspPanel({ writeBack = false } = {}) {
  if (!el.dspTransferFunction) {
    return;
  }
  const params = syncDspSettingsFromControls({ writeBack });
  const info = describeDspTransfer(params);
  el.dspEquationMode.textContent = info.modeLabel;
  el.dspTransferFunction.textContent = info.transfer;
  el.dspSectionEquation.textContent = info.equation;
  el.dspNyquistState.textContent = `Nyquist: ${params.nyquistHz.toFixed(1)} Hz / max cutoff: ${params.maxCutoff.toFixed(1)} Hz`;
  renderDspCoefficientGrid(info.coefficients);
  drawDspResponsePlot(params);
}

function resolveDspProtocol() {
  const explicit = el.dspProtocolSelect?.value || state.settings.dspProtocol || "AUTO";
  if (explicit !== "AUTO") {
    return explicit;
  }
  const latestFormat = state.latestSample?.format;
  if (latestFormat === "FILT" || state.settings.adcFormat === "FILT") {
    return "DAY2_IIR";
  }
  if (state.settings.dspProtocolHint) {
    return state.settings.dspProtocolHint;
  }
  return "STAGE1";
}

function day2IirModeName(mode) {
  if (mode === "IIR_LPF") {
    return "LPF";
  }
  if (mode === "IIR_HPF") {
    return "HPF";
  }
  if (mode === "IIR_BPF") {
    return "BPF";
  }
  return "RAW";
}

function syncAdcPlotSettings() {
  state.settings.adcFormat = "ALL";
  state.settings.adcPlotMode = el.adcPlotModeSelect?.value || "RAW_FILTERED";
  updateAdcFormatState();
}

function getVisibleAdcSamples() {
  return state.samples;
}

function updateAdcFormatState() {
  if (!el.adcFormatState) {
    return;
  }
  const total = state.samples.length;
  const latest = state.latestSample?.format || "RAW";
  el.adcFormatState.textContent = `${latest} samples - ${total}`;
}

function getAdcPlotValue(sample, key) {
  if (key === "delta") {
    return Number.isFinite(sample.filtered) && Number.isFinite(sample.raw)
      ? sample.filtered - sample.raw
      : NaN;
  }
  if (key === "customY" || key === "customY2") {
    return Number(sample[key]);
  }
  return Number(sample[key]);
}

function getAdcPlotSeries() {
  const mode = state.settings.adcPlotMode || "RAW_FILTERED";
  if (mode === "RAW") {
    return [{ key: "raw", ...ADC_PLOT_SERIES.raw }];
  }
  if (mode === "FILTERED") {
    return [{ key: "filtered", ...ADC_PLOT_SERIES.filtered }];
  }
  if (mode === "MILLIVOLTS") {
    return [{ key: "millivolts", ...ADC_PLOT_SERIES.millivolts }];
  }
  if (mode === "DELTA") {
    return [{ key: "delta", ...ADC_PLOT_SERIES.delta }];
  }
  return [
    ...(el.showRawToggle.checked ? [{ key: "raw", ...ADC_PLOT_SERIES.raw }] : []),
    ...(el.showFilteredToggle.checked ? [{ key: "filtered", ...ADC_PLOT_SERIES.filtered }] : [])
  ];
}

function getAdcPlotXValue(sample, index) {
  return index;
}

function getAdcPlotXRange(samples) {
  const values = samples
    .map((sample, index) => getAdcPlotXValue(sample, index))
    .filter(Number.isFinite);
  if (values.length < 2) {
    return { min: 0, max: Math.max(1, samples.length - 1), fallback: true };
  }
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (Math.abs(max - min) < 1e-9) {
    min -= 1;
    max += 1;
  }
  return { min, max, fallback: false };
}

function formatAxisNumber(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  if (Math.abs(value) >= 1000000) {
    return value.toExponential(2);
  }
  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function formatGyroDps(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
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

function createAdcDspState() {
  return {
    signature: "",
    ema: null,
    maWindow: [],
    iir: {
      lpf: [],
      lpfInit: [],
      hpfPrevIn: [],
      hpfPrevOut: [],
      hpfInit: []
    }
  };
}

function resetPreprocessState() {
  state.preprocess = createPreprocessState();
}

function resetAdcDspState() {
  state.adcDsp = createAdcDspState();
}

function createGyroOrientationState() {
  return {
    roll: 0,
    pitch: 0,
    yaw: 0,
    lastMicros: null,
    lastSeq: null,
    samples: 0,
    magHeading: null,
    magMagnitude: null,
    magYawError: null,
    magCorrectionActive: false,
    magCorrections: 0
  };
}

function resetGyroOrientation() {
  state.gyroOrientation = createGyroOrientationState();
}

function wrapDegrees(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;
  return Math.abs(wrapped) < 1e-9 ? 0 : wrapped;
}

function magneticHeadingDegrees(sample) {
  if (![sample.mx, sample.my].every(Number.isFinite)) {
    return null;
  }
  const magnitude = Math.hypot(sample.mx, sample.my, Number.isFinite(sample.mz) ? sample.mz : 0);
  if (magnitude < 1e-6) {
    return null;
  }
  return wrapDegrees((Math.atan2(sample.my, sample.mx) * 180) / Math.PI);
}

function applyMagnetometerYawCorrection(gyro, sample, dtSec) {
  const heading = magneticHeadingDegrees(sample);
  if (!Number.isFinite(heading)) {
    gyro.magCorrectionActive = false;
    return;
  }

  gyro.magHeading = heading;
  gyro.magMagnitude = Math.hypot(sample.mx, sample.my, Number.isFinite(sample.mz) ? sample.mz : 0);

  if (!state.settings.gyroMagCorrection) {
    gyro.magYawError = wrapDegrees(heading - gyro.yaw);
    gyro.magCorrectionActive = false;
    return;
  }

  const error = wrapDegrees(heading - gyro.yaw);
  const gain = Number.isFinite(dtSec) && dtSec > 0
    ? Math.min(GYRO_MAG_CORRECTION_MAX_GAIN, dtSec * GYRO_MAG_CORRECTION_GAIN_PER_SEC)
    : GYRO_MAG_CORRECTION_INITIAL_GAIN;
  gyro.yaw = wrapDegrees(gyro.yaw + error * gain);
  gyro.magYawError = wrapDegrees(heading - gyro.yaw);
  gyro.magCorrectionActive = true;
  gyro.magCorrections += 1;
}

function updateGyroOrientation(sample) {
  if (!GYRO_AXES.every((axis) => Number.isFinite(sample[axis]))) {
    return;
  }

  const gyro = state.gyroOrientation;
  let dtSec = null;
  if (Number.isFinite(gyro.lastMicros) && Number.isFinite(sample.micros) && sample.micros > gyro.lastMicros) {
    dtSec = Math.min(GYRO_MAX_DT_SEC, Math.max(0, (sample.micros - gyro.lastMicros) / 1000000));
    gyro.roll = wrapDegrees(gyro.roll + sample.gx * dtSec);
    gyro.pitch = wrapDegrees(gyro.pitch + sample.gy * dtSec);
    gyro.yaw = wrapDegrees(gyro.yaw + sample.gz * dtSec);
  }
  applyMagnetometerYawCorrection(gyro, sample, dtSec);

  gyro.lastMicros = Number.isFinite(sample.micros) ? sample.micros : gyro.lastMicros;
  gyro.lastSeq = Number.isFinite(sample.seq) ? sample.seq : gyro.lastSeq;
  gyro.samples += 1;
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

function getPlannedFeatureSize() {
  const featureMode = el.datasetFeatureSelect?.value || "STATS";
  const windowSize = getDatasetWindowSize();
  return featureMode === "FLATTEN" ? windowSize * IMU_ACCEL_AXES.length : 15;
}

function getDatasetShape() {
  const examples = state.dataset.examples;
  const first = examples.find((example) => Array.isArray(example.features));
  const featureSize = first?.features?.length || getPlannedFeatureSize();
  const windowSamples = first?.windowSamples || getDatasetWindowSize();
  const labels = labelCounts().length;
  return {
    examples: examples.length,
    featureSize,
    windowSamples,
    labels,
    featureMode: first?.featureMode || el.datasetFeatureSelect?.value || "STATS",
    source: first?.source || el.datasetSourceSelect?.value || "PROCESSED"
  };
}

function formatDatasetSize(shape = getDatasetShape()) {
  return `${shape.examples} x ${shape.featureSize} features`;
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
  const shape = getDatasetShape();
  el.datasetSummary.textContent = `${examples.length} windows`;
  el.datasetSizeState.textContent = `${formatDatasetSize(shape)} - ${shape.labels} labels`;
  el.datasetFeatureState.textContent = examples.length > 0
    ? `${shape.featureSize} features`
    : `${shape.featureSize} planned`;
  el.datasetCaptureState.textContent = state.dataset.captureActive ? "Capturing" : "Idle";
  drawDatasetPreview();

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

function drawDatasetPreview() {
  if (!el.datasetPreviewCanvas) {
    return;
  }

  const { ctx: previewCtx, width, height } = resizeAuxCanvasToDisplaySize(el.datasetPreviewCanvas, 180);
  const windowSize = getDatasetWindowSize();
  const source = el.datasetSourceSelect?.value || "PROCESSED";
  const samples = getDatasetWindow(source);
  el.datasetPreviewState.textContent = `${samples.length} / ${windowSize} samples`;

  previewCtx.clearRect(0, 0, width, height);
  previewCtx.fillStyle = "#ffffff";
  previewCtx.fillRect(0, 0, width, height);

  const pad = width < 560
    ? { left: 40, right: 14, top: 18, bottom: 30 }
    : { left: 54, right: 18, top: 18, bottom: 34 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  drawGridOn(previewCtx, width, height, pad, plotWidth, plotHeight);

  if (samples.length < 2) {
    previewCtx.fillStyle = "#637083";
    previewCtx.font = "14px Segoe UI, Arial, sans-serif";
    previewCtx.fillText("Waiting for IMU window data", pad.left + 12, pad.top + 32);
    return;
  }

  const values = samples.flatMap((sample) => IMU_ACCEL_AXES.map((axis) => sample[axis]));
  let minY = Math.min(...values);
  let maxY = Math.max(...values);
  const padding = Math.max(0.02, (maxY - minY) * 0.12);
  minY -= padding;
  maxY += padding;
  if (Math.abs(maxY - minY) < 1e-6) {
    minY -= 0.5;
    maxY += 0.5;
  }

  for (const axis of IMU_ACCEL_AXES) {
    drawDatasetPreviewLine(previewCtx, samples, axis, AXIS_COLORS[axis], minY, maxY, pad, plotWidth, plotHeight);
  }

  previewCtx.fillStyle = "#637083";
  previewCtx.font = "11px Segoe UI, Arial, sans-serif";
  previewCtx.fillText(`${maxY.toFixed(2)} ${getInputUnits()}`, 8, pad.top + 4);
  previewCtx.fillText(`${minY.toFixed(2)} ${getInputUnits()}`, 8, height - pad.bottom);
  drawLegendOn(previewCtx, [
    { color: AXIS_COLORS.ax, label: "x" },
    { color: AXIS_COLORS.ay, label: "y" },
    { color: AXIS_COLORS.az, label: "z" }
  ], pad.left + 8, pad.top + 18);
}

function drawDatasetPreviewLine(previewCtx, samples, axis, color, minY, maxY, pad, plotWidth, plotHeight) {
  previewCtx.strokeStyle = color;
  previewCtx.lineWidth = 2;
  previewCtx.beginPath();
  samples.forEach((sample, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, samples.length - 1);
    const normalized = (sample[axis] - minY) / (maxY - minY);
    const y = pad.top + plotHeight - normalized * plotHeight;
    if (index === 0) {
      previewCtx.moveTo(x, y);
    } else {
      previewCtx.lineTo(x, y);
    }
  });
  previewCtx.stroke();
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

function getPlannedModelSizes() {
  return getPlannedModelArchitecture().sizes;
}

function getPlannedModelArchitecture() {
  const shape = getDatasetShape();
  const options = getModelOptions();
  const outputReady = shape.labels >= 2;
  const sizes = [
    shape.featureSize,
    ...Array(options.hiddenLayers).fill(options.neurons),
    outputReady ? shape.labels : 0
  ];
  return {
    sizes,
    outputReady,
    labelCount: shape.labels
  };
}

function layerName(index, layerCount) {
  if (index === 0) {
    return "Input";
  }
  if (index === layerCount - 1) {
    return "Output";
  }
  return `Hidden ${index}`;
}

function formatNeuronCount(size, pending = false) {
  if (pending) {
    return "set labels first";
  }
  return `${size} neuron${size === 1 ? "" : "s"}`;
}

function formatArchitectureShape(sizes, outputPending = false) {
  return sizes.map((size, index) => (
    outputPending && index === sizes.length - 1 ? "labels" : String(size)
  )).join(" -> ");
}

function drawArchitectureConnections(archCtx, fromNodes, toNodes, radius) {
  const pairs = [];
  const addPair = (fromIndex, toIndex) => {
    const from = fromNodes[Math.max(0, Math.min(fromNodes.length - 1, fromIndex))];
    const to = toNodes[Math.max(0, Math.min(toNodes.length - 1, toIndex))];
    const key = `${from.x},${from.y},${to.x},${to.y}`;
    if (!pairs.some((pair) => pair.key === key)) {
      pairs.push({ from, to, key });
    }
  };

  for (let index = 0; index < fromNodes.length; index++) {
    const targetIndex = Math.round((index * Math.max(0, toNodes.length - 1)) / Math.max(1, fromNodes.length - 1));
    addPair(index, targetIndex);
  }
  for (let index = 0; index < toNodes.length; index++) {
    const sourceIndex = Math.round((index * Math.max(0, fromNodes.length - 1)) / Math.max(1, toNodes.length - 1));
    addPair(sourceIndex, index);
  }

  for (const { from, to } of pairs) {
    archCtx.beginPath();
    archCtx.moveTo(from.x + radius, from.y);
    archCtx.lineTo(to.x - radius, to.y);
    archCtx.stroke();
  }
}

function renderModelArchitecture() {
  if (!el.modelArchitectureCanvas) {
    return;
  }

  const planned = getPlannedModelArchitecture();
  const trained = state.model.trained;
  const sizes = trained?.sizes || planned.sizes;
  const outputPending = !trained && !planned.outputReady;
  const { ctx: archCtx, width, height } = resizeAuxCanvasToDisplaySize(el.modelArchitectureCanvas, 210);
  archCtx.clearRect(0, 0, width, height);
  archCtx.fillStyle = "#ffffff";
  archCtx.fillRect(0, 0, width, height);

  if (sizes.length < 2) {
    archCtx.fillStyle = "#637083";
    archCtx.font = "14px Segoe UI, Arial, sans-serif";
    archCtx.fillText("Capture data to define model input/output", 18, 36);
    return;
  }

  const pad = width < 620
    ? { left: 46, right: 46, top: 38, bottom: 48 }
    : { left: 62, right: 62, top: 42, bottom: 52 };
  const layerGap = sizes.length === 1 ? 0 : (width - pad.left - pad.right) / Math.max(1, sizes.length - 1);
  const maxVisibleNeurons = width < 620 ? 8 : 12;
  const radius = width < 620 ? 5 : 6;
  const layerNodes = sizes.map((size, layerIndex) => {
    const visible = Math.max(1, Math.min(size, maxVisibleNeurons));
    const usableHeight = height - pad.top - pad.bottom;
    const spacing = visible <= 1 ? 0 : Math.min(20, usableHeight / Math.max(1, visible - 1));
    const totalHeight = spacing * Math.max(0, visible - 1);
    const startY = pad.top + usableHeight / 2 - totalHeight / 2;
    const x = pad.left + layerGap * layerIndex;
    return Array.from({ length: visible }, (_, nodeIndex) => ({
      x,
      y: startY + spacing * nodeIndex
    }));
  });

  archCtx.save();
  archCtx.globalAlpha = 0.24;
  archCtx.strokeStyle = "#637083";
  archCtx.lineWidth = 1;
  for (let layerIndex = 0; layerIndex < layerNodes.length - 1; layerIndex++) {
    drawArchitectureConnections(archCtx, layerNodes[layerIndex], layerNodes[layerIndex + 1], radius);
  }
  archCtx.restore();

  sizes.forEach((size, layerIndex) => {
    const nodes = layerNodes[layerIndex];
    const isOutput = layerIndex === sizes.length - 1;
    const isInput = layerIndex === 0;
    const pendingOutput = outputPending && isOutput;
    const fill = isInput ? "#008c8c" : isOutput ? "#2767c9" : "#d28a00";
    for (const node of nodes) {
      archCtx.fillStyle = pendingOutput ? "#f2f5f8" : fill;
      archCtx.beginPath();
      archCtx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      archCtx.fill();
      archCtx.strokeStyle = pendingOutput ? "#9aa8b7" : "#ffffff";
      archCtx.lineWidth = pendingOutput ? 1.8 : 1.5;
      archCtx.stroke();
    }
    if (size > nodes.length) {
      archCtx.fillStyle = "#637083";
      archCtx.font = "12px Segoe UI, Arial, sans-serif";
      archCtx.textAlign = "center";
      archCtx.fillText(`+${size - nodes.length}`, nodes[0].x, height - pad.bottom + 2);
    }
    archCtx.fillStyle = "#17202a";
    archCtx.font = "700 12px Segoe UI, Arial, sans-serif";
    archCtx.textAlign = "center";
    archCtx.fillText(layerName(layerIndex, sizes.length), nodes[0].x, 18);
    archCtx.fillStyle = "#637083";
    archCtx.font = "12px Segoe UI, Arial, sans-serif";
    archCtx.fillText(formatNeuronCount(size, pendingOutput), nodes[0].x, height - 18);
  });
  archCtx.textAlign = "start";
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
  const shape = getDatasetShape();
  renderModelArchitecture();
  if (!state.model.trained) {
    const planned = getPlannedModelArchitecture();
    el.modelStatus.textContent = examples > 1 && shape.labels >= 2
      ? "Ready"
      : shape.labels < 2 ? "Need labels" : "Need data";
    el.modelShapeState.textContent = `${formatArchitectureShape(planned.sizes, !planned.outputReady)} planned`;
    el.modelMetricState.textContent = formatDatasetSize(shape);
    el.modelMetrics.replaceChildren(
      metricRow("Input Dataset", formatDatasetSize(shape)),
      metricRow("Windows", `${examples}`),
      metricRow("Labels", shape.labels >= 2 ? `${shape.labels}` : `${shape.labels}/2 needed`),
      metricRow("Window Samples", `${shape.windowSamples}`),
      metricRow("Feature Mode", shape.featureMode)
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
    metricRow("Input Dataset", `${metrics.examples} x ${trained.inputSize} features`),
    metricRow("Window Samples", `${trained.windowSamples}`),
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
      populateFirmwareSelect(state.flash.directFirmwares);
      logLine(`DIRECT_MANIFEST,${manifestPath},items=${payload.firmware.length}`);
      return;
    } catch (error) {
      // Try the next static firmware manifest path.
    }
  }

  state.flash.directFirmwares = DEFAULT_PREBUILT_FIRMWARES;
  populateFirmwareSelect(state.flash.directFirmwares);
  logLine("DIRECT_MANIFEST,default");
}

function getSelectedFirmware() {
  const firmwareId = el.firmwareSelect.value || "stage1_lab_console";
  const candidates = [
    ...state.flash.directFirmwares,
    ...DEFAULT_PREBUILT_FIRMWARES
  ];
  return candidates.find((firmware) => firmware.id === firmwareId) || DEFAULT_PREBUILT_FIRMWARES[0];
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

  throw new Error("Could not load static firmware from the prebuilt assets");
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
  const loaded = await fetchFirmwareBytes(firmware);
  const bytes = loaded.bytes;
  const source = loaded.source;

  await verifyFirmwareBytes(bytes, firmware);
  return { bytes, source };
}

function setDirectFlashProgress(percent, message) {
  el.flashProgress.value = Math.max(0, Math.min(100, percent));
  if (message) {
    el.flashState.textContent = message;
  }
}

function getSameOriginHelperBaseUrl() {
  try {
    const location = new URL(window.location.href);
    const localHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";
    return location.protocol === "http:" && localHost ? location.origin : "";
  } catch (error) {
    return "";
  }
}

function helperApiUrl(path) {
  const baseUrl = state.flash.helper.baseUrl || getSameOriginHelperBaseUrl();
  return baseUrl ? new URL(path, baseUrl).href : "";
}

function describeHelperPort(port) {
  const boards = Array.isArray(port.boards) ? port.boards : [];
  const boardText = boards.map((board) => board.name || board.fqbn).filter(Boolean).join(", ");
  return [port.address, boardText || port.label || port.protocol].filter(Boolean).join(" - ");
}

function isPreferredHelperPort(port) {
  const text = [
    port.address,
    port.label,
    port.protocol,
    ...(Array.isArray(port.boards) ? port.boards.flatMap((board) => [board.name, board.fqbn]) : [])
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("nano 33 ble") || text.includes("nano33ble") || text.includes("arduino:mbed_nano:nano33ble");
}

function updateHelperPortSelect() {
  const ports = state.flash.helper.ports;
  const previous = el.helperPortSelect.value || state.flash.helper.selectedPort;
  el.helperPortSelect.replaceChildren();

  if (!state.flash.helper.available) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Helper not detected";
    el.helperPortSelect.append(option);
    state.flash.helper.selectedPort = "";
    return;
  }

  if (ports.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No board port";
    el.helperPortSelect.append(option);
    state.flash.helper.selectedPort = "";
    return;
  }

  for (const port of ports) {
    const option = document.createElement("option");
    option.value = String(port.address || "").toUpperCase();
    option.textContent = describeHelperPort(port);
    el.helperPortSelect.append(option);
  }

  const preferred = ports.find((port) => String(port.address).toUpperCase() === previous) ||
    ports.find(isPreferredHelperPort) ||
    ports[0];
  state.flash.helper.selectedPort = String(preferred.address || "").toUpperCase();
  el.helperPortSelect.value = state.flash.helper.selectedPort;
}

async function refreshHelperStatus({ silent = false } = {}) {
  const baseUrl = getSameOriginHelperBaseUrl();
  state.flash.helper.baseUrl = baseUrl;
  if (!baseUrl) {
    state.flash.helper.available = false;
    state.flash.helper.ports = [];
    state.flash.helper.lastError = "Open through helper URL to use helper upload";
    updateHelperPortSelect();
    el.helperState.textContent = "Helper not detected";
    setUiEnabled();
    return false;
  }

  state.flash.helper.checking = true;
  if (!silent) {
    el.helperState.textContent = "Checking helper";
  }
  setUiEnabled();

  try {
    const healthResponse = await fetch(helperApiUrl("/api/health"), { cache: "no-store" });
    const health = await healthResponse.json();
    if (!healthResponse.ok || !health.ok) {
      throw new Error(health.error || "Helper health check failed");
    }
    if (health.arduinoCli && health.arduinoCli.ok === false) {
      throw new Error("Arduino CLI is not usable from the helper.");
    }

    const portsResponse = await fetch(helperApiUrl("/api/ports"), { cache: "no-store" });
    const portsPayload = await portsResponse.json();
    if (!portsResponse.ok || !portsPayload.ok) {
      throw new Error(portsPayload.error || "Helper port scan failed");
    }

    state.flash.helper.available = true;
    state.flash.helper.ports = Array.isArray(portsPayload.ports) ? portsPayload.ports : [];
    state.flash.helper.lastError = "";
    updateHelperPortSelect();
    el.helperState.textContent = state.flash.helper.ports.length > 0
      ? `Helper ready - ${state.flash.helper.ports.length} port(s)`
      : "Helper ready - no board";
    return true;
  } catch (error) {
    state.flash.helper.available = false;
    state.flash.helper.ports = [];
    state.flash.helper.selectedPort = "";
    state.flash.helper.lastError = error.message;
    updateHelperPortSelect();
    el.helperState.textContent = "Helper unavailable";
    if (!silent) {
      logLine(`ERR,helper_status,${error.message}`);
    }
    return false;
  } finally {
    state.flash.helper.checking = false;
    setUiEnabled();
  }
}

function getSelectedHelperPort() {
  return String(el.helperPortSelect.value || state.flash.helper.selectedPort || "").trim().toUpperCase();
}

async function flashFirmwareWithHelper(firmware) {
  const port = getSelectedHelperPort();
  if (!port) {
    throw new Error("Helper port is not selected.");
  }

  state.flash.directBusy = true;
  setDirectFlashProgress(5, "Helper upload");
  setUiEnabled();

  try {
    const response = await fetch(helperApiUrl("/api/flash"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        port,
        firmwareId: firmware.id,
        fqbn: firmware.fqbn || "arduino:mbed_nano:nano33ble"
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || result.stderr || "Helper upload failed");
    }
    setDirectFlashProgress(100, "Helper Flash OK");
    logLine(`HELPER_FLASH_OK,firmware=${firmware.id},port=${port}`);
  } catch (error) {
    setDirectFlashProgress(0, "Helper failed");
    logLine(`ERR,helper_flash,${error.message}`);
  } finally {
    state.flash.directBusy = false;
    setUiEnabled();
  }
}

function isArduinoSerialPort(port) {
  if (!port || typeof port.getInfo !== "function") {
    return true;
  }
  const info = port.getInfo();
  return info.usbVendorId === 0x2341 || info.usbVendorId === 0x2a03;
}

async function getGrantedArduinoSerialPorts(excludedPort = null) {
  if (!navigator.serial.getPorts) {
    return [];
  }
  const ports = await navigator.serial.getPorts();
  return ports.filter((port) => port !== excludedPort && isArduinoSerialPort(port));
}

async function waitForGrantedBootloaderPort(appPort) {
  const start = performance.now();
  while (performance.now() - start < BOOTLOADER_REENUMERATE_WAIT_MS) {
    const ports = await getGrantedArduinoSerialPorts(appPort);
    if (ports.length === 1) {
      return ports[0];
    }
    if (ports.length > 1) {
      logLine(`DIRECT_FLASH,bootloader_auto_ambiguous,count=${ports.length}`);
      return null;
    }
    await sleep(BOOTLOADER_POLL_INTERVAL_MS);
  }
  return null;
}

async function requestArduinoSerialPort() {
  return navigator.serial.requestPort({
    filters: window.KetiDirectFlash.ARDUINO_USB_FILTERS
  });
}

async function stopActiveSessionBeforeBootloader() {
  const existingPort = state.port;
  if (!state.connected) {
    return null;
  }

  setDirectFlashProgress(1, "Stopping stream");
  if (state.writer) {
    try {
      await sendCommand("CLS OFF");
      await sleep(80);
    } catch (error) {
      logLine(`ERR,bootloader_cls_off,${error.message}`);
    }
    try {
      await sendCommand("STOP");
      await sleep(150);
    } catch (error) {
      logLine(`ERR,bootloader_stop,${error.message}`);
    }
  }

  state.streaming = false;
  state.recording = false;
  state.classification.active = false;
  await disconnectDevice();
  await sleep(350);
  return existingPort;
}

async function touchApplicationPortIntoBootloader() {
  let appPort = await stopActiveSessionBeforeBootloader();
  if (!appPort) {
    setDirectFlashProgress(0, "Select app port");
    appPort = await requestArduinoSerialPort();
  }

  setDirectFlashProgress(2, "Force reset");
  try {
    await window.KetiDirectFlash.forceSerialReset(appPort);
    logLine("DIRECT_FLASH,force_reset");
  } catch (error) {
    logLine(`ERR,direct_force_reset,${error.message}`);
    setDirectFlashProgress(2, "Select app port");
    appPort = await requestArduinoSerialPort();
  }

  setDirectFlashProgress(4, "Bootloader touch");
  try {
    await window.KetiDirectFlash.touch1200BpsReset(appPort);
  } catch (error) {
    logLine(`ERR,direct_touch_after_reset,${error.message}`);
    setDirectFlashProgress(4, "Select app port");
    appPort = await requestArduinoSerialPort();
    await window.KetiDirectFlash.touch1200BpsReset(appPort);
  }

  state.flash.directBootloaderTouched = true;
  logLine("DIRECT_FLASH,bootloader_touch_1200bps");
  return appPort;
}

async function enterBootloaderAndResolvePort() {
  const appPort = await touchApplicationPortIntoBootloader();

  setDirectFlashProgress(6, "Finding bootloader");
  const grantedBootloaderPort = await waitForGrantedBootloaderPort(appPort);
  if (grantedBootloaderPort) {
    logLine("DIRECT_FLASH,bootloader_auto_port");
    return grantedBootloaderPort;
  }

  setDirectFlashProgress(6, "Select bootloader");
  logLine("DIRECT_FLASH,bootloader_manual_select_required");
  return requestArduinoSerialPort();
}

function isDirectBootloaderError(error) {
  const message = String(error?.message || "");
  return /bootloader|SAM-BA|N# ack|Unexpected bootloader target|Arduino extension|Timed out waiting/i.test(message);
}

function createDirectFlashTimeoutError(kind, attemptLabel, timeoutMs) {
  const error = new Error(`Direct flash ${attemptLabel} ${kind} timeout after ${timeoutMs} ms`);
  error.name = "DirectFlashTimeoutError";
  error.directFlashTimeout = true;
  error.timeoutKind = kind;
  error.attemptLabel = attemptLabel;
  error.timeoutMs = timeoutMs;
  return error;
}

function isDirectFlashTimeoutError(error) {
  const message = String(error?.message || "");
  return Boolean(error?.directFlashTimeout) || /Direct flash .* timeout after|Writing page .* failed: .*timed out|Writing bootloader .*timed out/i.test(message);
}

function isMidFlashTimeoutLikeError(error, lastProgressMessage) {
  const message = String(error?.message || "");
  const progress = String(lastProgressMessage || "");
  return /timed out|timeout|Transport closed/i.test(message) &&
    /Preparing flash|Erasing flash|Writing page|Wrote page|Resetting board/i.test(progress);
}

function asDirectFlashTimeoutError(error, attemptLabel, lastProgressMessage) {
  if (isDirectFlashTimeoutError(error)) {
    return error;
  }
  if (!isMidFlashTimeoutLikeError(error, lastProgressMessage)) {
    return error;
  }
  const wrapped = createDirectFlashTimeoutError("operation", attemptLabel, DIRECT_FLASH_STALL_TIMEOUT_MS);
  wrapped.message = `${wrapped.message}: ${error.message}`;
  wrapped.cause = error;
  return wrapped;
}

function getDirectFlashProfile() {
  const profile = el.flashProfileSelect?.value || "compatibility";
  return profile === "standard" ? "standard" : "compatibility";
}

function getDirectFlashPostEraseSettleMs() {
  return getDirectFlashProfile() === "compatibility"
    ? DIRECT_FLASH_COMPAT_POST_ERASE_SETTLE_MS
    : DIRECT_FLASH_POST_ERASE_SETTLE_MS;
}

function createDirectFlasher(attemptLabel, onProgress = null) {
  return new window.KetiDirectFlash.DirectSamBaFlasher({
    profile: getDirectFlashProfile(),
    onLog: (message) => logLine(`DIRECT_FLASH,${attemptLabel},${message}`),
    onProgress: (item) => {
      setDirectFlashProgress(item.percent, item.message);
      if (onProgress) {
        onProgress(item);
      }
    }
  });
}

async function closeDirectFlasher(flasher, reason) {
  if (!flasher || typeof flasher.close !== "function") {
    return;
  }
  try {
    await Promise.race([
      flasher.close(),
      sleep(DIRECT_FLASH_CLOSE_TIMEOUT_MS).then(() => {
        throw new Error(`close timeout after ${DIRECT_FLASH_CLOSE_TIMEOUT_MS} ms`);
      })
    ]);
    logLine(`DIRECT_FLASH,closed,reason=${reason}`);
  } catch (error) {
    logLine(`ERR,direct_flash_close,${error.message}`);
  }
}

async function runTimedDirectOperation({ port, firmwareBytes, attemptLabel, operation = "flash", skipErase = false }) {
  let stallTimer = null;
  let totalTimer = null;
  let rejectForTimeout = null;
  let timeoutError = null;
  let lastProgressMessage = "";

  const clearTimers = () => {
    clearTimeout(stallTimer);
    clearTimeout(totalTimer);
    stallTimer = null;
    totalTimer = null;
  };

  const signalTimeout = (error) => {
    if (timeoutError) {
      return;
    }
    timeoutError = error;
    logLine(`DIRECT_FLASH_TIMEOUT,attempt=${attemptLabel},kind=${error.timeoutKind},ms=${error.timeoutMs}`);
    if (rejectForTimeout) {
      rejectForTimeout(error);
    }
  };

  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      signalTimeout(createDirectFlashTimeoutError("stall", attemptLabel, DIRECT_FLASH_STALL_TIMEOUT_MS));
    }, DIRECT_FLASH_STALL_TIMEOUT_MS);
  };

  const timeoutPromise = new Promise((_, reject) => {
    rejectForTimeout = reject;
  });

  const flasher = createDirectFlasher(attemptLabel, (item) => {
    lastProgressMessage = item.message || "";
    resetStallTimer();
  });
  resetStallTimer();
  totalTimer = setTimeout(() => {
    signalTimeout(createDirectFlashTimeoutError("total", attemptLabel, DIRECT_FLASH_TOTAL_TIMEOUT_MS));
  }, DIRECT_FLASH_TOTAL_TIMEOUT_MS);

  const operationPromise = operation === "erase"
    ? flasher.eraseApplication({
      port,
      firmwareBytes,
      maxSketchSize: window.KetiDirectFlash.MAX_SKETCH_SIZE
    })
    : flasher.flash({
      port,
      firmwareBytes,
      maxSketchSize: window.KetiDirectFlash.MAX_SKETCH_SIZE,
      skipErase
    });

  try {
    await Promise.race([operationPromise, timeoutPromise]);
  } catch (error) {
    const normalizedError = asDirectFlashTimeoutError(error, attemptLabel, lastProgressMessage);
    if (isDirectFlashTimeoutError(normalizedError)) {
      const timeoutState = operation === "erase"
        ? "Erase timeout"
        : attemptLabel === "recovery" ? "Recovery timeout" : "Flash timeout";
      setDirectFlashProgress(0, timeoutState);
      await closeDirectFlasher(flasher, `timeout_${attemptLabel}`);
      operationPromise.catch((operationError) => {
        logLine(`ERR,direct_flash_late_reject,${operationError.message}`);
      });
    }
    throw normalizedError;
  } finally {
    clearTimers();
  }
}

async function runTimedDirectErase({ port, firmwareBytes, attemptLabel }) {
  await runTimedDirectOperation({
    port,
    firmwareBytes,
    attemptLabel,
    operation: "erase"
  });
}

async function runTimedDirectFlash({ port, firmwareBytes, attemptLabel, skipErase = false }) {
  await runTimedDirectOperation({
    port,
    firmwareBytes,
    attemptLabel,
    operation: "flash",
    skipErase
  });
}

async function probeRecoveryBootloaderPort(port, source) {
  try {
    await window.KetiDirectFlash.probeBootloaderPort(port, {
      onLog: (message) => logLine(`DIRECT_FLASH,recovery_probe_${source},${message}`),
      onProgress: ({ percent, message }) => setDirectFlashProgress(Math.min(8, percent), message)
    });
    logLine(`DIRECT_FLASH_RECOVERY,bootloader_port=${source}`);
    return true;
  } catch (error) {
    logLine(`ERR,direct_recovery_probe_${source},${error.message}`);
    return false;
  }
}

async function findGrantedRecoveryBootloaderPort() {
  const ports = await getGrantedArduinoSerialPorts();
  for (let index = 0; index < ports.length; index++) {
    setDirectFlashProgress(1, `Recovery probe ${index + 1}/${ports.length}`);
    if (await probeRecoveryBootloaderPort(ports[index], `granted_${index + 1}`)) {
      return ports[index];
    }
  }
  return null;
}

async function touchRecoveryPortIntoBootloader(port) {
  setDirectFlashProgress(2, "Recovery reset");
  try {
    await window.KetiDirectFlash.forceSerialReset(port);
    logLine("DIRECT_FLASH_RECOVERY,force_reset");
  } catch (error) {
    logLine(`ERR,direct_recovery_force_reset,${error.message}`);
  }

  setDirectFlashProgress(4, "Recovery touch");
  await window.KetiDirectFlash.touch1200BpsReset(port);
  state.flash.directBootloaderTouched = true;
  logLine("DIRECT_FLASH_RECOVERY,bootloader_touch_1200bps");

  setDirectFlashProgress(6, "Recovery finding bootloader");
  const grantedBootloaderPort = await waitForGrantedBootloaderPort(port);
  if (grantedBootloaderPort) {
    logLine("DIRECT_FLASH_RECOVERY,bootloader_auto_port");
    return grantedBootloaderPort;
  }

  setDirectFlashProgress(6, "Recovery select bootloader");
  logLine("DIRECT_FLASH_RECOVERY,manual_bootloader_select_required");
  return requestArduinoSerialPort();
}

async function selectRecoveryBootloaderPort() {
  const grantedBootloaderPort = await findGrantedRecoveryBootloaderPort();
  if (grantedBootloaderPort) {
    return grantedBootloaderPort;
  }

  setDirectFlashProgress(0, "Recovery select port");
  const selectedPort = await requestArduinoSerialPort();
  if (await probeRecoveryBootloaderPort(selectedPort, "selected")) {
    return selectedPort;
  }

  return touchRecoveryPortIntoBootloader(selectedPort);
}

async function selectExistingBootloaderPort() {
  const grantedBootloaderPort = await findGrantedRecoveryBootloaderPort();
  if (grantedBootloaderPort) {
    return grantedBootloaderPort;
  }

  setDirectFlashProgress(0, "Select bootloader");
  const selectedPort = await requestArduinoSerialPort();
  if (await probeRecoveryBootloaderPort(selectedPort, "exit_selected")) {
    return selectedPort;
  }
  throw new Error("Selected port is not an Arduino bootloader port");
}

async function resolvePostEraseBootloaderPort(previousPort) {
  setDirectFlashProgress(11, "Erase settle");
  await sleep(getDirectFlashPostEraseSettleMs());

  if (await probeRecoveryBootloaderPort(previousPort, "post_erase_same")) {
    return previousPort;
  }

  const grantedBootloaderPort = await findGrantedRecoveryBootloaderPort();
  if (grantedBootloaderPort) {
    return grantedBootloaderPort;
  }

  setDirectFlashProgress(11, "Select bootloader");
  logLine("DIRECT_FLASH,post_erase_manual_select_required");
  const selectedPort = await requestArduinoSerialPort();
  if (await probeRecoveryBootloaderPort(selectedPort, "post_erase_selected")) {
    return selectedPort;
  }

  return touchRecoveryPortIntoBootloader(selectedPort);
}

async function runDirectFlashWithPreErase({ port, firmwareBytes, attemptLabel }) {
  if (!DIRECT_FLASH_SEPARATE_ERASE) {
    await runTimedDirectFlash({
      port,
      firmwareBytes,
      attemptLabel
    });
    return;
  }

  await runTimedDirectErase({
    port,
    firmwareBytes,
    attemptLabel: `${attemptLabel}_erase`
  });
  const writePort = await resolvePostEraseBootloaderPort(port);
  await runTimedDirectFlash({
    port: writePort,
    firmwareBytes,
    attemptLabel,
    skipErase: true
  });
}

async function runRecoveryFlashAfterTimeout({ loaded, firmware, reason }) {
  logLine(`DIRECT_FLASH_RECOVERY,start,firmware=${firmware.id},reason=${reason.message}`);
  state.flash.directBootloaderTouched = false;
  setDirectFlashProgress(0, "Recovery flash");
  const recoveryPort = await selectRecoveryBootloaderPort();
  await runDirectFlashWithPreErase({
    port: recoveryPort,
    firmwareBytes: loaded.bytes,
    attemptLabel: "recovery"
  });
  state.flash.directBootloaderTouched = false;
  setDirectFlashProgress(100, "Recovery OK");
  logLine(`DIRECT_FLASH_RECOVERY_OK,firmware=${firmware.id}`);
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
    await touchApplicationPortIntoBootloader();
    setDirectFlashProgress(5, "Select bootloader");
  } catch (error) {
    state.flash.directBootloaderTouched = false;
    setDirectFlashProgress(0, "Bootloader failed");
    logLine(`ERR,direct_bootloader,${error.message}`);
  } finally {
    state.flash.directBusy = false;
    setUiEnabled();
  }
}

async function exitBootloaderDirect() {
  if (!("serial" in navigator) || !window.KetiDirectFlash) {
    setDirectFlashProgress(0, "Unavailable");
    logLine("ERR,direct_flash,web_serial_unavailable");
    return;
  }

  state.flash.directBusy = true;
  setDirectFlashProgress(0, "Select bootloader");
  setUiEnabled();

  const flasher = createDirectFlasher("exit_bootloader");
  try {
    const port = await selectExistingBootloaderPort();
    await flasher.resetBootloader(port);
    state.flash.directBootloaderTouched = false;
    setDirectFlashProgress(100, "Reset sent");
    logLine("DIRECT_FLASH_EXIT_BOOTLOADER_OK");
  } catch (error) {
    state.flash.directBootloaderTouched = false;
    setDirectFlashProgress(0, "Exit failed");
    logLine(`ERR,direct_exit_bootloader,${error.message}`);
  } finally {
    await closeDirectFlasher(flasher, "exit_bootloader");
    state.flash.directBusy = false;
    setUiEnabled();
  }
}

async function flashFirmware() {
  const firmware = getSelectedFirmware();
  const helperReady = state.flash.helper.available || await refreshHelperStatus({ silent: true });
  if (helperReady && getSelectedHelperPort()) {
    await flashFirmwareWithHelper(firmware);
    return;
  }
  await flashFirmwareDirect(firmware);
}

async function flashFirmwareDirect(firmware = getSelectedFirmware()) {
  if (!("serial" in navigator) || !window.KetiDirectFlash) {
    setDirectFlashProgress(0, "Unavailable");
    logLine("ERR,direct_flash,web_serial_unavailable");
    return;
  }

  state.flash.directBusy = true;
  setDirectFlashProgress(0, "Loading BIN");
  setUiEnabled();

  try {
    const loaded = await loadDirectFirmwareBytes(firmware);
    logLine(`DIRECT_FLASH,firmware=${firmware.id},bytes=${loaded.bytes.length},source=${loaded.source},profile=${getDirectFlashProfile()}`);

    try {
      setDirectFlashProgress(0, state.flash.directBootloaderTouched ? "Select bootloader" : "Select app port");
      const port = state.flash.directBootloaderTouched
        ? await requestArduinoSerialPort()
        : await enterBootloaderAndResolvePort();

      await runDirectFlashWithPreErase({
        port,
        firmwareBytes: loaded.bytes,
        attemptLabel: "normal"
      });
    } catch (error) {
      if (!isDirectFlashTimeoutError(error)) {
        throw error;
      }

      try {
        await runRecoveryFlashAfterTimeout({ loaded, firmware, reason: error });
      } catch (recoveryError) {
        const wrapped = new Error(`Recovery flash failed after timeout: ${recoveryError.message}`);
        wrapped.recoveryFailed = true;
        wrapped.cause = recoveryError;
        throw wrapped;
      }
    }

    state.flash.directBootloaderTouched = false;
    if (el.flashState.textContent !== "Recovery OK") {
      setDirectFlashProgress(100, "Flash OK");
    }
    logLine(`DIRECT_FLASH_OK,firmware=${firmware.id}`);
  } catch (error) {
    state.flash.directBootloaderTouched = isDirectFlashTimeoutError(error) || Boolean(error.recoveryFailed);
    const status = error.recoveryFailed
      ? "Recovery failed"
      : isDirectFlashTimeoutError(error) ? "Flash timeout"
      : isDirectBootloaderError(error) ? "Not bootloader" : "Flash failed";
    setDirectFlashProgress(0, status);
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
  if (state.connected) {
    logLine("ERR,connect,already_connected");
    return;
  }

  try {
    state.port = await navigator.serial.requestPort();
    await state.port.open({ baudRate: 115200 });
    state.writer = state.port.writable.getWriter();
    state.reader = state.port.readable.getReader();
    state.connectionMode = "serial";
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
    state.connectionMode = null;
    state.connected = false;
    setUiEnabled();
  }
}

function getBleAdcRequestOptions() {
  return {
    filters: [
      { services: [BLE_ADC_SERVICE_UUID] },
      { name: BLE_ADC_DEVICE_NAME }
    ],
    optionalServices: [BLE_ADC_SERVICE_UUID]
  };
}

async function connectBleDevice() {
  if (!("bluetooth" in navigator)) {
    setStatus(el.bleStatus, "BLE unavailable", "error");
    logLine("This browser does not support Web Bluetooth.");
    return;
  }
  if (state.connected) {
    logLine("ERR,ble_connect,already_connected");
    return;
  }

  try {
    setStatus(el.bleStatus, "Selecting BLE ADC", "warning");
    state.bleDevice = await navigator.bluetooth.requestDevice(getBleAdcRequestOptions());
    state.bleDevice.addEventListener("gattserverdisconnected", handleBleDisconnected);
    state.bleServer = await state.bleDevice.gatt.connect();
    const service = await state.bleServer.getPrimaryService(BLE_ADC_SERVICE_UUID);
    state.bleCharacteristic = await service.getCharacteristic(BLE_ADC_CHARACTERISTIC_UUID);
    state.bleCharacteristic.addEventListener("characteristicvaluechanged", handleBleNotification);
    await state.bleCharacteristic.startNotifications();

    state.connectionMode = "ble";
    state.connected = true;
    state.streaming = false;
    state.recording = false;
    logLine(`BLE_CONNECTED,device=${state.bleDevice.name || BLE_ADC_DEVICE_NAME}`);
  } catch (error) {
    logLine(`ERR,ble_connect,${error.message}`);
    resetBleState();
  } finally {
    setUiEnabled();
  }
}

async function disconnectBleDevice() {
  try {
    state.streaming = false;
    state.recording = false;
    if (state.bleCharacteristic) {
      try {
        state.bleCharacteristic.removeEventListener("characteristicvaluechanged", handleBleNotification);
        await state.bleCharacteristic.stopNotifications();
      } catch (error) {
        logLine(`ERR,ble_stop_notify,${error.message}`);
      }
    }
    if (state.bleDevice?.gatt?.connected) {
      state.bleDevice.gatt.disconnect();
    }
  } catch (error) {
    logLine(`ERR,ble_disconnect,${error.message}`);
  } finally {
    resetBleState();
    logLine("BLE_DISCONNECTED");
    setUiEnabled();
  }
}

function handleBleDisconnected() {
  resetBleState();
  logLine("BLE_DISCONNECTED");
  setUiEnabled();
}

function resetBleState() {
  state.bleCharacteristic = null;
  state.bleServer = null;
  state.bleDevice = null;
  if (state.connectionMode === "ble") {
    state.connectionMode = null;
    state.connected = false;
    state.streaming = false;
    state.recording = false;
  }
}

function handleBleNotification(event) {
  const text = decodeBleNotification(event.target.value);
  if (!text) {
    return;
  }
  const lines = text.includes("\n") || text.includes("\r")
    ? text.split(/\r?\n/)
    : [text];
  for (const line of lines) {
    const clean = line.trim();
    if (clean.length === 0) {
      continue;
    }
    const normalized = normalizeBleAdcPayload(clean);
    if (!state.streaming) {
      appendDeviceLogLine(normalized, "rx", true);
      continue;
    }
    handleLine(normalized);
  }
}

function decodeBleNotification(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  const bytes = value instanceof DataView
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : null;
  return bytes ? new TextDecoder().decode(bytes) : "";
}

function normalizeBleAdcPayload(payload) {
  const text = String(payload || "").trim();
  if (text.startsWith("BLE_DATA,")) {
    return text;
  }
  if (/^\d+\s*,\s*[+-]?\d+(?:\.\d+)?$/.test(text)) {
    return `BLE_DATA,${text}`;
  }
  return text;
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

function isAdcStreamLine(line) {
  return isRawAdcLine(line) ||
    line.startsWith("DATA,") ||
    line.startsWith("BUF,") ||
    line.startsWith("FILT,") ||
    line.startsWith("BLE_DATA,") ||
    /^raw\s*:/i.test(line);
}

function isRawAdcLine(line) {
  const text = String(line || "").trim();
  return /^RAW(?:\s*,|\s*:|\s+)/i.test(text) ||
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text);
}

function handleLine(line) {
  const isStreamData = isAdcStreamLine(line) || line.startsWith("IMU,") || line.startsWith("PPG,");
  appendDeviceLogLine(line, "rx", isStreamData);

  if (line.startsWith("ERR,EI_ACCEL_MODEL_REQUIRED")) {
    state.classification.active = false;
    state.classification.startPending = false;
    el.classificationState.textContent = "Model missing";
    setUiEnabled();
    return;
  }

  if (line.startsWith("ERR,EI_RUN_CLASSIFIER") || line.startsWith("ERR,EI_SIGNAL_FROM_BUFFER")) {
    state.classification.startPending = false;
    el.classificationState.textContent = "Inference error";
    setUiEnabled();
    return;
  }

  if (isAdcStreamLine(line)) {
    const samples = parseAdcLine(line);
    if (samples.length > 0) {
      samples.forEach(addSample);
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

  if (line.startsWith("PPG,")) {
    const sample = parseLivePpgLine(line);
    if (sample) {
      addLivePpgSample(sample);
    }
    return;
  }

  if (line.startsWith("HR,")) {
    const result = parseLiveHrLine(line);
    if (result) {
      updateLiveHr(result);
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
    state.classification.startPending = false;
    el.classificationState.textContent = "Running";
    setUiEnabled();
    return;
  }

  if (line.startsWith("ACK,CLS_OFF")) {
    state.classification.active = false;
    state.classification.startPending = false;
    el.classificationState.textContent = "Idle";
    setUiEnabled();
    return;
  }

  setUiEnabled();
}

function parseAdcLine(line) {
  if (/^raw\s*:/i.test(line)) {
    const sample = parseSerialPlotterLine(line);
    return sample ? [sample] : [];
  }
  if (isRawAdcLine(line)) {
    const sample = parseRawLine(line);
    return sample ? [sample] : [];
  }
  if (line.startsWith("DATA,")) {
    const sample = parseDataLine(line);
    return sample ? [sample] : [];
  }
  if (line.startsWith("BUF,")) {
    return parseBufferLine(line);
  }
  if (line.startsWith("FILT,")) {
    const sample = parseFilterLine(line);
    return sample ? [sample] : [];
  }
  if (line.startsWith("BLE_DATA,")) {
    const sample = parseBleDataLine(line);
    return sample ? [sample] : [];
  }
  return [];
}

function extractRawAdcFields(line) {
  const text = String(line || "").trim();
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    return { raw: Number(text), formatDetail: "numeric raw" };
  }
  if (!/^RAW/i.test(text)) {
    return null;
  }

  const normalized = text.replace(/^RAW\s*[: ]\s*/i, "RAW,");
  const values = normalized.split(",").slice(1).map((part) => Number(String(part).trim()));
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }

  if (values.length >= 4) {
    return { seq: values[0], micros: values[1], channel: values[2], raw: values[3], formatDetail: "raw seq/time/channel" };
  }
  if (values.length === 3) {
    return { seq: values[0], micros: values[1], raw: values[2], formatDetail: "raw seq/time" };
  }
  if (values.length === 2) {
    return { seq: values[0], raw: values[1], formatDetail: "raw seq" };
  }
  return { raw: values[0], formatDetail: "raw" };
}

function parseRawLine(line) {
  const values = extractRawAdcFields(line);
  if (!values || !Number.isFinite(values.raw)) {
    return null;
  }
  return normalizeAdcSample({
    ...values,
    millivolts: rawToMillivolts(values.raw),
    filtered: values.raw,
    format: "RAW",
    valueUnit: "count",
    filteredLabel: "Raw copy"
  });
}

function extractCustomColumnValues(line) {
  const analysis = state.lineInspector.latest?.line === line
    ? state.lineInspector.latest
    : analyzeDeviceLine(line);
  const values = {};
  let mappedValueCount = 0;

  analysis.cells.forEach((cell, index) => {
    const type = state.lineInspector.columnTypes[index] || analysis.inferredTypes[index] || "IGNORE";
    const numeric = parseColumnNumber(cell);
    if (type === "LABEL") {
      values.label = String(cell).trim();
      return;
    }
    if (!Number.isFinite(numeric)) {
      return;
    }
    if (type === "SEQ") {
      values.seq = numeric;
    } else if (type === "MICROS") {
      values.micros = numeric;
    } else if (type === "MILLIS") {
      values.micros = numeric * 1000;
    } else if (type === "CHANNEL") {
      values.channel = numeric;
    } else if (type === "RAW") {
      values.raw = numeric;
      mappedValueCount++;
    } else if (type === "MILLIVOLTS") {
      values.millivolts = numeric;
      mappedValueCount++;
    } else if (type === "FILTERED") {
      values.filtered = numeric;
      mappedValueCount++;
    } else if (type === "CUSTOM_X") {
      values.customX = numeric;
    } else if (type === "CUSTOM_Y") {
      values.customY = numeric;
      mappedValueCount++;
    } else if (type === "CUSTOM_Y2") {
      values.customY2 = numeric;
      mappedValueCount++;
    }
  });

  return mappedValueCount > 0 ? values : null;
}

function applyCustomColumnsToSample(sample, line) {
  return sample;
}

function parseCustomAdcLine(line) {
  const values = extractCustomColumnValues(line);
  if (!values) {
    return null;
  }
  const primary = values.raw ?? values.customY ?? values.filtered ?? values.millivolts;
  if (!Number.isFinite(primary)) {
    return null;
  }
  return normalizeAdcSample({
    seq: values.seq,
    micros: values.micros,
    channel: values.channel,
    raw: values.raw ?? values.customY ?? values.filtered ?? values.millivolts,
    millivolts: values.millivolts,
    filtered: values.filtered ?? values.customY2 ?? values.raw ?? values.customY ?? values.millivolts,
    customX: values.customX,
    customY: values.customY ?? values.raw ?? values.filtered ?? values.millivolts,
    customY2: values.customY2,
    format: "CUSTOM",
    formatDetail: values.label ? `mapped ${values.label}` : "mapped columns",
    valueUnit: "value",
    rawLabel: "Mapped raw",
    filteredLabel: Number.isFinite(values.customY2) ? "Mapped Y2" : "Mapped filtered"
  });
}

function normalizeAdcSample(sample) {
  const raw = finiteOrNull(sample.raw);
  const filtered = finiteOrNull(sample.filtered);
  const millivolts = finiteOrNull(sample.millivolts);
  return {
    ...sample,
    seq: finiteOrNull(sample.seq) ?? nextAdcSyntheticSeq(),
    micros: finiteOrNull(sample.micros) ?? Math.round((state.receivedSamples / Math.max(1, state.settings.rateHz)) * 1000000),
    channel: finiteOrNull(sample.channel) ?? state.settings.channel,
    raw: raw ?? NaN,
    millivolts: millivolts ?? rawToMillivolts(raw),
    filtered: filtered ?? raw ?? NaN,
    format: sample.format || "RAW",
    formatDetail: sample.formatDetail || "",
    valueUnit: sample.valueUnit || "count",
    rawLabel: sample.rawLabel || "Raw",
    filteredLabel: sample.filteredLabel || "Filtered",
    receivedAt: Date.now()
  };
}

function adcDspSignature() {
  return [
    state.settings.filter,
    normalizeNumber(state.settings.rateHz, 100, 1, 1000).toFixed(3),
    normalizeNumber(state.settings.alpha, 0.2, 0.001, 1).toFixed(6),
    Math.round(normalizeNumber(state.settings.window, 8, 1, 32)),
    Math.round(normalizeNumber(state.settings.iirOrder, 2, 1, 4)),
    normalizeNumber(state.settings.iirLowHz, 1, 0.001, 1000).toFixed(6),
    normalizeNumber(state.settings.iirHighHz, 10, 0.001, 1000).toFixed(6)
  ].join("|");
}

function ensureAdcDspStateForSettings() {
  const signature = adcDspSignature();
  if (state.adcDsp.signature !== signature) {
    state.adcDsp = createAdcDspState();
    state.adcDsp.signature = signature;
  }
}

function adcFilterLabel(mode = state.settings.filter) {
  if (mode === "MA") {
    return "MA filtered";
  }
  if (mode === "EMA") {
    return "EMA filtered";
  }
  if (mode === "IIR_LPF") {
    return "IIR LPF";
  }
  if (mode === "IIR_HPF") {
    return "IIR HPF";
  }
  if (mode === "IIR_BPF") {
    return "IIR BPF";
  }
  return "Raw copy";
}

function applyAdcClientLowPass(value, cutoffHz, order) {
  const alpha = lowPassCoefficientAtRate(cutoffHz, state.settings.rateHz);
  let output = value;
  for (let index = 0; index < order; index++) {
    if (!state.adcDsp.iir.lpfInit[index]) {
      state.adcDsp.iir.lpf[index] = output;
      state.adcDsp.iir.lpfInit[index] = true;
    } else {
      state.adcDsp.iir.lpf[index] = state.adcDsp.iir.lpf[index] + alpha * (output - state.adcDsp.iir.lpf[index]);
    }
    output = state.adcDsp.iir.lpf[index];
  }
  return output;
}

function applyAdcClientHighPass(value, cutoffHz, order) {
  const beta = highPassCoefficientAtRate(cutoffHz, state.settings.rateHz);
  let output = value;
  for (let index = 0; index < order; index++) {
    if (!state.adcDsp.iir.hpfInit[index]) {
      state.adcDsp.iir.hpfPrevIn[index] = output;
      state.adcDsp.iir.hpfPrevOut[index] = 0;
      state.adcDsp.iir.hpfInit[index] = true;
      output = 0;
    } else {
      const next = beta * (state.adcDsp.iir.hpfPrevOut[index] + output - state.adcDsp.iir.hpfPrevIn[index]);
      state.adcDsp.iir.hpfPrevIn[index] = output;
      state.adcDsp.iir.hpfPrevOut[index] = next;
      output = next;
    }
  }
  return output;
}

function filterAdcRawValue(raw) {
  const mode = state.settings.filter;
  if (!Number.isFinite(raw) || mode === "RAW") {
    return raw;
  }

  ensureAdcDspStateForSettings();

  if (mode === "MA") {
    const windowSize = Math.max(1, Math.round(normalizeNumber(state.settings.window, 8, 1, 32)));
    state.adcDsp.maWindow.push(raw);
    while (state.adcDsp.maWindow.length > windowSize) {
      state.adcDsp.maWindow.shift();
    }
    return state.adcDsp.maWindow.reduce((sum, value) => sum + value, 0) / state.adcDsp.maWindow.length;
  }

  if (mode === "EMA") {
    const alpha = normalizeNumber(state.settings.alpha, 0.2, 0.001, 1);
    state.adcDsp.ema = state.adcDsp.ema == null
      ? raw
      : state.adcDsp.ema + alpha * (raw - state.adcDsp.ema);
    return state.adcDsp.ema;
  }

  const order = Math.max(1, Math.min(4, Math.round(normalizeNumber(state.settings.iirOrder, 2, 1, 4))));
  if (mode === "IIR_LPF") {
    return applyAdcClientLowPass(raw, state.settings.iirHighHz, order);
  }
  if (mode === "IIR_HPF") {
    return applyAdcClientHighPass(raw, state.settings.iirLowHz, order);
  }
  if (mode === "IIR_BPF") {
    const highPassed = applyAdcClientHighPass(raw, state.settings.iirLowHz, order);
    return applyAdcClientLowPass(highPassed, state.settings.iirHighHz, order);
  }
  return raw;
}

function shouldApplyAdcClientDsp(sample) {
  if (!Number.isFinite(sample.raw) || sample.valueUnit !== "count") {
    return false;
  }
  if (sample.format === "FILT" || sample.format === "PLOTTER" || sample.format === "CUSTOM" || sample.format === "PPG") {
    return false;
  }
  return sample.clientFiltered || sample.filteredLabel === "Raw copy" || !Number.isFinite(sample.filtered) || sample.filtered === sample.raw;
}

function applyAdcClientDsp(sample) {
  if (!shouldApplyAdcClientDsp(sample)) {
    return sample;
  }
  const mode = state.settings.filter;
  if (mode === "RAW") {
    resetAdcDspState();
  }
  const filtered = mode === "RAW" ? sample.raw : filterAdcRawValue(sample.raw);
  return {
    ...sample,
    filtered,
    filteredLabel: adcFilterLabel(mode),
    clientFiltered: mode !== "RAW"
  };
}

function reprocessAdcClientDspBuffers() {
  resetAdcDspState();
  state.samples = state.samples.map((sample) => applyAdcClientDsp(sample));
  state.tableRows = state.samples.slice(-MAX_TABLE_ROWS).reverse();
  state.latestSample = state.samples[state.samples.length - 1] || null;
  if (state.ppg.source === "Live ADC") {
    clearLivePpgWindow(state.settings.filter === "RAW" ? "raw" : "filtered");
  }
  updateAdcFormatState();
  updateCurrentMetrics();
  drawPlot();
}

function parseDataLine(line) {
  const parts = line.split(",");
  if (parts.length < 6) {
    return null;
  }
  const raw = Number(parts[4]);
  const millivolts = Number(parts[5]);
  const filtered = Number(parts[6]);
  return normalizeAdcSample({
    seq: Number(parts[1]),
    micros: Number(parts[2]),
    channel: Number(parts[3]),
    raw,
    millivolts,
    filtered: Number.isFinite(filtered) ? filtered : raw,
    format: "DATA",
    formatDetail: parts.length >= 7 ? "stage1" : "basic",
    valueUnit: "count",
    filteredLabel: parts.length >= 7 ? "Filtered" : "Raw copy"
  });
}

function parseBufferLine(line) {
  const parts = line.split(",");
  if (parts.length < 4) {
    return [];
  }
  const bufferSeq = Number(parts[1]);
  const baseMicros = Number(parts[2]);
  const intervalUs = Math.round(1000000 / Math.max(1, state.settings.rateHz));
  return parts.slice(3).map((value, index) => {
    const raw = Number(value);
    if (!Number.isFinite(raw)) {
      return null;
    }
    return normalizeAdcSample({
      seq: Number.isFinite(bufferSeq) ? bufferSeq * 100 + index : nextAdcSyntheticSeq(),
      micros: Number.isFinite(baseMicros) ? baseMicros + index * intervalUs : undefined,
      channel: state.settings.channel,
      raw,
      millivolts: rawToMillivolts(raw),
      filtered: raw,
      format: "BUF",
      formatDetail: `buf ${Number.isFinite(bufferSeq) ? bufferSeq : "--"}[${index}]`,
      valueUnit: "count",
      filteredLabel: "Raw copy",
      bufferSeq: Number.isFinite(bufferSeq) ? bufferSeq : null,
      bufferIndex: index
    });
  }).filter(Boolean);
}

function parseFilterLine(line) {
  const parts = line.split(",");
  if (parts.length < 6) {
    return null;
  }
  const rawMv = Number(parts[4]);
  const filteredMv = Number(parts[5]);
  return normalizeAdcSample({
    seq: Number(parts[1]),
    micros: Number(parts[2]),
    channel: state.settings.channel,
    raw: rawMv,
    millivolts: rawMv,
    filtered: Number.isFinite(filteredMv) ? filteredMv : rawMv,
    format: "FILT",
    formatDetail: parts[3] || state.settings.filter,
    valueUnit: "mV",
    rawLabel: "Raw mV",
    filteredLabel: "Filtered mV"
  });
}

function parseBleDataLine(line) {
  const parts = line.split(",");
  if (parts.length < 3) {
    return null;
  }
  const millis = Number(parts[1]);
  const raw = Number(parts[2]);
  if (!Number.isFinite(raw)) {
    return null;
  }
  return normalizeAdcSample({
    seq: nextAdcSyntheticSeq(),
    micros: Number.isFinite(millis) ? millis * 1000 : undefined,
    channel: state.settings.channel,
    raw,
    millivolts: rawToMillivolts(raw),
    filtered: raw,
    format: "BLE_DATA",
    formatDetail: "ble notify",
    valueUnit: "count",
    filteredLabel: "Raw copy"
  });
}

function parseSerialPlotterLine(line) {
  const values = {};
  for (const token of line.split(",")) {
    const separator = token.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const key = token.slice(0, separator).trim().toLowerCase();
    const value = Number(token.slice(separator + 1).trim());
    if (Number.isFinite(value)) {
      values[key] = value;
    }
  }
  if (!Number.isFinite(values.raw) && !Number.isFinite(values.filtered)) {
    return null;
  }
  const seq = nextAdcSyntheticSeq();
  const raw = Number.isFinite(values.raw) ? values.raw : values.filtered;
  const filtered = Number.isFinite(values.filtered) ? values.filtered : raw;
  return normalizeAdcSample({
    seq,
    micros: Math.round((seq / Math.max(1, state.settings.rateHz)) * 1000000),
    channel: state.settings.channel,
    raw,
    millivolts: NaN,
    filtered,
    format: "PLOTTER",
    formatDetail: "serial plotter",
    valueUnit: "value"
  });
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

function parseKeyValueTokens(tokens) {
  const values = {};
  for (const token of tokens) {
    const separator = token.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = token.slice(0, separator);
    const value = token.slice(separator + 1);
    const numeric = Number(value);
    values[key] = Number.isFinite(numeric) ? numeric : value;
  }
  return values;
}

function parseLivePpgLine(line) {
  const parts = line.split(",");
  if (parts.length < 4) {
    return null;
  }
  const seq = Number(parts[1]);
  const micros = Number(parts[2]);
  const raw = Number(parts[3]);
  const filled = Number(parts[4]);
  if (!Number.isFinite(seq) || !Number.isFinite(raw)) {
    return null;
  }
  return {
    seq,
    micros: Number.isFinite(micros) ? micros : seq * (1000000 / 32),
    tSec: Number.isFinite(micros) ? micros / 1000000 : seq / 32,
    ppg: raw,
    raw,
    filtered: raw,
    source: "raw",
    filled: Number.isFinite(filled) ? filled : null,
    receivedAt: Date.now()
  };
}

function parseLiveHrLine(line) {
  const parts = line.split(",");
  if (parts.length < 4) {
    return null;
  }
  const hr = Number(parts[3]);
  const kv = parseKeyValueTokens(parts.slice(4));
  return {
    seq: Number(parts[1]),
    millis: Number(parts[2]),
    hrBpm: Number.isFinite(hr) ? hr : null,
    quality: Number(kv.quality),
    std: Number(kv.std),
    acfBpm: Number(kv.acf_bpm),
    acfScore: Number(kv.acf_score),
    specBpm: Number(kv.spec_bpm),
    specScore: Number(kv.spec_score),
    window: Number(kv.window),
    model: kv.model || "",
    updatedAt: Date.now()
  };
}

function parseStatus(line) {
  const tokens = line.split(",").slice(1);
  for (const token of tokens) {
    const [key, value] = token.split("=");
    if (key === "streaming") {
      state.streaming = value === "1";
    } else if (key === "classification") {
      state.classification.active = value === "1";
      state.classification.startPending = false;
      renderClassification();
    } else if (key === "rate_hz") {
      state.settings.rateHz = Number(value);
      el.rateInput.value = value;
      updateAdcWindowInputFromSamples(state.settings.window);
      if (state.ppg.source === "Live ADC" && state.ppg.samples.length === 0 && el.ppgSampleRateInput) {
        state.ppg.sampleRateHz = state.settings.rateHz;
        el.ppgSampleRateInput.value = value;
      }
    } else if (key === "channel") {
      state.settings.channel = Number(value);
      el.channelSelect.value = value;
    } else if (key === "adc_bits") {
      state.settings.resolution = Number(value);
      el.resolutionSelect.value = value;
    } else if (key === "filter") {
      state.settings.dspProtocolHint = "STAGE1";
      state.settings.filter = value;
      el.filterSelect.value = value;
      updateFilterStateText();
    } else if (key === "mode") {
      state.settings.dspProtocolHint = "DAY2_IIR";
      const mappedMode = value === "RAW" ? "RAW" : `IIR_${value}`;
      state.settings.filter = mappedMode;
      if ([...el.filterSelect.options].some((option) => option.value === mappedMode)) {
        el.filterSelect.value = mappedMode;
      }
      updateFilterStateText();
    } else if (key === "alpha") {
      state.settings.alpha = Number(value);
      el.alphaInput.value = String(state.settings.alpha);
      el.alphaOutput.textContent = state.settings.alpha.toFixed(3);
    } else if (key === "window") {
      updateAdcWindowInputFromSamples(Number(value));
    } else if (key === "iir_order") {
      state.settings.iirOrder = Number(value);
      el.iirOrderInput.value = value;
    } else if (key === "order") {
      state.settings.iirOrder = Number(value);
      el.iirOrderInput.value = value;
    } else if (key === "iir_low_hz") {
      state.settings.iirLowHz = Number(value);
      el.iirLowInput.value = value;
    } else if (key === "low") {
      state.settings.iirLowHz = Number(value);
      el.iirLowInput.value = value;
    } else if (key === "iir_high_hz") {
      state.settings.iirHighHz = Number(value);
      el.iirHighInput.value = value;
    } else if (key === "high") {
      state.settings.iirHighHz = Number(value);
      el.iirHighInput.value = value;
    } else if (key === "rate") {
      state.settings.rateHz = Number(value);
      el.rateInput.value = value;
      updateAdcWindowInputFromSamples(state.settings.window);
    }
  }
  renderDspPanel({ writeBack: true });
  setUiEnabled();
}

function addSample(sample) {
  sample = applyAdcClientDsp(sample);
  sample.format = sample.format || "RAW";
  if (state.adcFormatCounts[sample.format] == null) {
    state.adcFormatCounts[sample.format] = 0;
  }
  state.adcFormatCounts[sample.format] += 1;
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
  addAdcSampleToLivePpg(sample);
  scheduleUiRender();
}

function addImuSample(sample) {
  const processed = processImuSample(sample);
  updateGyroOrientation(sample);
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

function clearLivePpgWindow(signalSource = state.ppg.signalSource || "raw") {
  state.ppg.samples = [];
  state.ppg.analysis = null;
  state.ppg.liveHr = null;
  state.ppg.error = "";
  state.ppg.source = "Live ADC";
  state.ppg.signalSource = signalSource;
  state.ppg.columns = ["seq", "micros", "raw", "filtered", "ppg", "source"];
  state.ppg.liveStartMicros = null;
  state.ppg.lastAutoAnalysisAt = 0;
  state.ppg.lastAutoAnalysisSeq = null;
}

function resetPpgForLiveIfNeeded(signalSource = "raw") {
  if (state.ppg.source !== "Live ADC" || state.ppg.signalSource !== signalSource) {
    clearLivePpgWindow(signalSource);
  }
}

function getAdcPpgSignal(sample) {
  const useFiltered = state.settings.filter !== "RAW" && Number.isFinite(sample.filtered);
  return {
    value: useFiltered ? sample.filtered : sample.raw,
    source: useFiltered ? "filtered" : "raw"
  };
}

function updateLivePpgSampleRate(sample = null) {
  const fallbackRate = normalizeNumber(state.settings.rateHz, state.ppg.sampleRateHz || 100, 1, 1000);
  let nextRate = fallbackRate;
  const previous = state.ppg.samples[state.ppg.samples.length - 1];
  if (sample && previous && Number.isFinite(sample.micros) && Number.isFinite(previous.micros)) {
    const deltaSec = (sample.micros - previous.micros) / 1000000;
    if (deltaSec > 0 && deltaSec < 2) {
      nextRate = normalizeNumber(1 / deltaSec, fallbackRate, 1, 1000);
    }
  }
  state.ppg.sampleRateHz = nextRate;
  if (el.ppgSampleRateInput && Math.abs(Number(el.ppgSampleRateInput.value || 0) - nextRate) > 0.05) {
    el.ppgSampleRateInput.value = nextRate.toFixed(Math.abs(nextRate - Math.round(nextRate)) < 0.05 ? 0 : 1);
  }
}

function getLivePpgRetentionCount() {
  const windowSec = normalizeNumber(el.ppgDurationInput?.value, 30, 8, 180);
  const rateHz = normalizeNumber(state.ppg.sampleRateHz, state.settings.rateHz || 100, 1, 1000);
  return Math.min(PPG_MAX_LIVE_POINTS, Math.max(1200, Math.ceil(rateHz * Math.max(windowSec * 1.6, 90))));
}

function trimLivePpgSamples() {
  const maxSamples = getLivePpgRetentionCount();
  while (state.ppg.samples.length > maxSamples) {
    state.ppg.samples.shift();
  }
}

function makeLivePpgSampleFromAdc(sample) {
  const signal = getAdcPpgSignal(sample);
  resetPpgForLiveIfNeeded(signal.source);
  updateLivePpgSampleRate(sample);
  if (state.ppg.liveStartMicros == null || (Number.isFinite(sample.micros) && sample.micros < state.ppg.liveStartMicros)) {
    state.ppg.liveStartMicros = Number.isFinite(sample.micros) ? sample.micros : 0;
  }
  const tSec = Number.isFinite(sample.micros)
    ? (sample.micros - state.ppg.liveStartMicros) / 1000000
    : state.ppg.samples.length / Math.max(1, state.ppg.sampleRateHz || 100);
  return {
    seq: sample.seq,
    micros: sample.micros,
    tSec,
    ppg: signal.value,
    raw: sample.raw,
    filtered: sample.filtered,
    source: signal.source,
    channel: sample.channel,
    receivedAt: sample.receivedAt
  };
}

function addAdcSampleToLivePpg(sample) {
  if (!Number.isFinite(sample.raw) && !Number.isFinite(sample.filtered)) {
    return;
  }
  const liveSample = makeLivePpgSampleFromAdc(sample);
  state.ppg.samples.push(liveSample);
  trimLivePpgSamples();
  maybeRunLivePpgAnalysis(liveSample);
}

function addPpgSampleToAdcPlot(sample) {
  const adcSample = {
    seq: sample.seq,
    micros: sample.micros,
    channel: state.settings.channel,
    raw: sample.ppg,
    millivolts: Number.isFinite(sample.ppg)
      ? (sample.ppg / Math.max(1, (1 << state.settings.resolution) - 1)) * 3300
      : NaN,
    filtered: sample.ppg,
    receivedAt: sample.receivedAt,
    format: "PPG",
    formatDetail: "stage3 raw",
    valueUnit: "count",
    rawLabel: "PPG raw",
    filteredLabel: "PPG raw",
    ppgMirror: true
  };
  adcSample.format = adcSample.format || "PPG";
  state.adcFormatCounts.PPG = (state.adcFormatCounts.PPG || 0) + 1;
  state.samples.push(adcSample);
  if (state.samples.length > MAX_POINTS) {
    state.samples.shift();
  }
  state.receivedSamples++;
  state.latestSample = adcSample;
  if (state.recording) {
    state.records.push({ ...adcSample, kind: "adc", label: el.labelInput.value.trim() || "unlabeled" });
  }
  state.tableRows.unshift(adcSample);
  if (state.tableRows.length > MAX_TABLE_ROWS) {
    state.tableRows.pop();
  }
}

function addLivePpgSample(sample) {
  resetPpgForLiveIfNeeded(sample.source || "raw");
  updateLivePpgSampleRate(sample);
  state.ppg.samples.push(sample);
  trimLivePpgSamples();
  addPpgSampleToAdcPlot(sample);
  maybeRunLivePpgAnalysis(sample);
  scheduleUiRender();
}

function updateLiveHr(result) {
  resetPpgForLiveIfNeeded(state.ppg.signalSource || "raw");
  state.ppg.liveHr = result;
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

function getClassificationInputWindow() {
  const windowSize = getInputWindowSize();
  const useProcessed = isInputPreprocessActive();
  const sourceName = useProcessed ? "processed" : "raw";
  const frames = useProcessed ? state.imuProcessedSamples : state.imuSamples;
  const available = Math.min(frames.length, windowSize);
  const startIndex = Math.max(0, frames.length - available);
  const windowFrames = frames.slice(startIndex);
  const latest = windowFrames[windowFrames.length - 1] || null;
  const first = windowFrames[0] || null;
  const keys = useProcessed
    ? { ax: "pax", ay: "pay", az: "paz" }
    : { ax: "ax", ay: "ay", az: "az" };
  return {
    windowSize,
    sourceName,
    frames: windowFrames,
    available,
    first,
    latest,
    keys
  };
}

function getClassificationInputWindowText() {
  const inputWindow = getClassificationInputWindow();
  const seqText = inputWindow.latest && inputWindow.first
    ? `seq ${inputWindow.first.seq}-${inputWindow.latest.seq}`
    : "no IMU window";
  const result = state.classification;
  const resultSeq = result.seq == null ? "no class result" : `class seq ${result.seq}`;
  return `Input data window: ${inputWindow.available}/${inputWindow.windowSize} ${inputWindow.sourceName} samples - ${state.settings.inputFilter} - ${state.settings.normalizeMode} - ${seqText} - ${resultSeq}`;
}

function updateClassificationInputState() {
  el.classificationWindowState.textContent = getClassificationInputWindowText();
}

function renderClassification() {
  const result = state.classification;
  el.classificationState.textContent = result.startPending ? "Starting" : result.active ? "Running" : "Idle";
  el.classificationTopLabel.textContent = result.topLabel || "--";
  el.classificationTopScore.textContent = Number.isFinite(result.topScore)
    ? `${(result.topScore * 100).toFixed(1)}%`
    : "--";
  updateClassificationInputState();

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

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function inferPpgSampleRate(samples) {
  if (samples.length < 2) {
    return 32;
  }
  const deltas = [];
  for (let index = 1; index < Math.min(samples.length, 80); index++) {
    const delta = samples[index].tSec - samples[index - 1].tSec;
    if (Number.isFinite(delta) && delta > 0) {
      deltas.push(delta);
    }
  }
  if (deltas.length === 0) {
    return 32;
  }
  deltas.sort((a, b) => a - b);
  return Math.max(1, Math.min(200, 1 / deltas[Math.floor(deltas.length / 2)]));
}

function parseTimestampSeconds(value) {
  const text = String(value ?? "").trim();
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/
  );
  if (match) {
    const [, year, month, day, hour, minute, second, fraction = ""] = match;
    const wholeSeconds = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) / 1000;
    const fractionalSeconds = fraction ? Number(`0.${fraction}`) : 0;
    return wholeSeconds + fractionalSeconds;
  }
  const parsedMs = Date.parse(text);
  return Number.isFinite(parsedMs) ? parsedMs / 1000 : NaN;
}

function parsePpgCsv(text, source = "CSV") {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("PPG CSV has no data rows");
  }
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const indexOf = (name) => headers.findIndex((header) => header.toLowerCase() === name);
  const timeIndex = indexOf("time");
  const ppgIndex = indexOf("ppg");
  const hrIndex = indexOf("hr");
  const activityIndex = indexOf("activity_label") >= 0 ? indexOf("activity_label") : indexOf("activity");
  if (ppgIndex < 0) {
    throw new Error("PPG CSV must include a ppg column");
  }

  const samples = [];
  let firstTimeSec = null;
  for (let lineIndex = 1; lineIndex < lines.length && samples.length < PPG_MAX_PARSE_ROWS; lineIndex++) {
    const cells = parseCsvLine(lines[lineIndex]);
    const ppg = Number(cells[ppgIndex]);
    if (!Number.isFinite(ppg)) {
      continue;
    }
    let tSec = samples.length / 32;
    if (timeIndex >= 0) {
      const timeSec = parseTimestampSeconds(cells[timeIndex]);
      if (Number.isFinite(timeSec)) {
        if (firstTimeSec == null) {
          firstTimeSec = timeSec;
        }
        tSec = timeSec - firstTimeSec;
      }
    }
    samples.push({
      tSec,
      ppg,
      hr: hrIndex >= 0 ? Number(cells[hrIndex]) : NaN,
      activity: activityIndex >= 0 ? cells[activityIndex] : ""
    });
  }
  if (samples.length < 2) {
    throw new Error("No numeric PPG samples found");
  }

  const sampleRateHz = inferPpgSampleRate(samples);
  state.ppg.samples = samples;
  state.ppg.sampleRateHz = sampleRateHz;
  state.ppg.source = source;
  state.ppg.signalSource = "csv";
  state.ppg.columns = headers;
  state.ppg.analysis = null;
  state.ppg.liveHr = null;
  state.ppg.liveStartMicros = null;
  state.ppg.lastAutoAnalysisAt = 0;
  state.ppg.lastAutoAnalysisSeq = null;
  state.ppg.error = "";
  if (el.ppgSampleRateInput) {
    el.ppgSampleRateInput.value = sampleRateHz.toFixed(Math.abs(sampleRateHz - Math.round(sampleRateHz)) < 0.01 ? 0 : 2);
  }
  logLine(`PPG_LOAD,rows=${samples.length},fs=${sampleRateHz.toFixed(2)},source=${source}`);
  renderPpgView();
  setUiEnabled();
}

function getPpgOptions() {
  return {
    sampleRateHz: normalizeNumber(el.ppgSampleRateInput?.value, state.ppg.sampleRateHz || state.settings.rateHz || 100, 1, 1000),
    startMin: normalizeNumber(el.ppgStartInput?.value, 0, 0, 10000),
    durationSec: normalizeNumber(el.ppgDurationInput?.value, 30, 8, 180),
    refractoryMs: normalizeNumber(el.ppgRefractoryInput.value, 420, 250, 1200),
    threshold: normalizeNumber(el.ppgThresholdInput.value, 0.42, 0.1, 0.9)
  };
}

function getPpgWindow(options = getPpgOptions()) {
  if (state.ppg.source === "Live ADC") {
    const latest = state.ppg.samples[state.ppg.samples.length - 1];
    if (!latest) {
      return [];
    }
    const startSec = latest.tSec - options.durationSec;
    return state.ppg.samples.filter((sample) => sample.tSec >= startSec && sample.tSec <= latest.tSec);
  }
  const startSec = options.startMin * 60;
  const durationSec = options.durationSec;
  return state.ppg.samples.filter((sample) => sample.tSec >= startSec && sample.tSec < startSec + durationSec);
}

function getPpgCnnModel() {
  const model = window.KetiPpgHrCnnModel;
  if (model && Array.isArray(model.layers)) {
    return model;
  }
  return PPG_WEB_CNN_FALLBACK_MODEL;
}

function getPpgRegressionModel() {
  const model = window.KetiPpgHrRegressionModel;
  if (model && model.model && Array.isArray(model.model.weights)) {
    return model;
  }
  return PPG_HR_REGRESSION_FALLBACK_MODEL;
}

function getPpgModelSampleRateHz(model = getPpgCnnModel()) {
  return normalizeNumber(model.targetSampleRateHz || model.sampleRateHz, 32, 1, 1000);
}

function getPpgRegressionSampleRateHz(model = getPpgRegressionModel()) {
  return normalizeNumber(model.targetSampleRateHz || model.sampleRateHz, 32, 1, 1000);
}

function getPpgRegressionWindowSec(model = getPpgRegressionModel()) {
  return normalizeNumber(model.windowSec, 15, 1, 180);
}

function getPpgModelMinWindowSec(model = getPpgCnnModel()) {
  return normalizeNumber(model.minWindowSec, 8, 1, 180);
}

function getPpgModelConvFilters(model = getPpgCnnModel()) {
  const conv = model.layers.find((layer) => layer.type === "conv1d");
  const filters = conv?.filters || conv?.kernels || [];
  return filters.map((filter, index) => {
    if (Array.isArray(filter)) {
      return { name: `filter_${index + 1}`, weights: filter, bias: 0 };
    }
    return {
      name: filter.name || `filter_${index + 1}`,
      weights: Array.isArray(filter.weights) ? filter.weights : [],
      bias: Number.isFinite(filter.bias) ? filter.bias : 0
    };
  }).filter((filter) => filter.weights.length > 0);
}

function getPpgModelPoolingRadiusSamples(model, sampleRateHz) {
  const pool = model.layers.find((layer) => layer.type === "average_pool1d");
  return Math.max(1, Math.round(normalizeNumber(pool?.radiusSec, 0.06, 0.005, 1) * sampleRateHz));
}

function formatPpgTrainingStatus(model = getPpgCnnModel()) {
  const training = model.training || {};
  if (training.status === "not_trained") {
    return "Not trained - hand-tuned filters";
  }
  if (training.status === "weak_supervised") {
    const mae = training.metrics?.validation?.maeBpm;
    return Number.isFinite(mae)
      ? `Weak-supervised HR labels (val MAE ${mae.toFixed(1)} bpm)`
      : "Weak-supervised HR labels";
  }
  if (training.status === "trained") {
    return training.method || "Trained";
  }
  return training.method || "Unspecified";
}

function formatPpgDatasetStatus(model = getPpgCnnModel()) {
  const dataset = model.training?.dataset;
  if (!dataset || dataset === "none") {
    return "None for web model";
  }
  if (typeof dataset === "object") {
    const name = dataset.name || "Training dataset";
    const windows = Number.isFinite(dataset.windows) ? `, ${dataset.windows} windows` : "";
    const sampleRate = Number.isFinite(dataset.sampleRateHz) ? `, ${dataset.sampleRateHz.toFixed(0)} Hz` : "";
    return `${name}${windows}${sampleRate}`;
  }
  return String(dataset);
}

function formatPpgReferenceDataset(model = getPpgCnnModel()) {
  const reference = model.referenceDataset;
  if (!reference) {
    return "--";
  }
  if (Number.isFinite(reference.validationMaeBpm)) {
    return `${reference.name} val MAE ${reference.validationMaeBpm.toFixed(1)} bpm`;
  }
  if (Number.isFinite(reference.windows)) {
    return `${reference.name} (${reference.windows} windows)`;
  }
  const regression = reference.firmwareRegression;
  if (regression) {
    return `${reference.name} ref (${regression.examples} windows)`;
  }
  return reference.name || "--";
}

function formatPpgTrainingSplit(model = getPpgCnnModel()) {
  const dataset = model.training?.dataset;
  if (!dataset || typeof dataset !== "object") {
    return "--";
  }
  const train = Number.isFinite(dataset.trainWindows) ? dataset.trainWindows : null;
  const validation = Number.isFinite(dataset.validationWindows) ? dataset.validationWindows : null;
  const rows = Number.isFinite(dataset.rows) ? dataset.rows : null;
  const split = train !== null && validation !== null ? `${train} train / ${validation} val` : "--";
  return rows !== null ? `${split}, ${rows} rows` : split;
}

function formatPpgTrainingRule(model = getPpgCnnModel()) {
  const training = model.training || {};
  if (training.status === "weak_supervised") {
    return "HR labels -> pseudo peaks -> Conv1D templates";
  }
  if (training.status === "not_trained") {
    return "Fixed hand-tuned pulse filters";
  }
  return training.method || "--";
}

function formatPpgRegressionStatus(model = getPpgRegressionModel()) {
  const training = model.training || {};
  if (training.status === "trained") {
    const mae = training.metrics?.validation?.maeBpm;
    return Number.isFinite(mae)
      ? `Ridge regression (val MAE ${mae.toFixed(1)} bpm)`
      : "Ridge regression";
  }
  return "Regression model not loaded";
}

function formatPpgRegressionDataset(model = getPpgRegressionModel()) {
  const dataset = model.training?.dataset;
  if (!dataset || dataset === "none") {
    return "--";
  }
  if (typeof dataset === "object") {
    const windows = Number.isFinite(dataset.windows) ? `${dataset.windows} windows` : "windows --";
    const features = Number.isFinite(model.featureCount) ? `${model.featureCount} features` : "features --";
    return `${windows}, ${features}`;
  }
  return String(dataset);
}

function shortPpgLabel(text, maxChars = 54) {
  const value = String(text || "");
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
}

function ppgWindowDurationSec(window) {
  if (window.length < 2) {
    return 0;
  }
  const start = window[0].tSec;
  const end = window[window.length - 1].tSec;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return end - start;
  }
  return window.length / Math.max(1, state.ppg.sampleRateHz || state.settings.rateHz || 32);
}

function resamplePpgWindow(window, targetRateHz, sourceRateHz) {
  const samples = window
    .filter((sample) => Number.isFinite(sample.ppg))
    .map((sample, index) => ({
      ...sample,
      tSec: Number.isFinite(sample.tSec) ? sample.tSec : index / Math.max(1, sourceRateHz)
    }))
    .sort((a, b) => a.tSec - b.tSec);
  if (samples.length < 2) {
    return { samples: [], values: [], durationSec: 0 };
  }

  const startSec = samples[0].tSec;
  const endSec = samples[samples.length - 1].tSec;
  const durationSec = Math.max(0, endSec - startSec);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return { samples: [], values: [], durationSec: 0 };
  }

  const count = Math.min(PPG_MAX_LIVE_POINTS, Math.max(2, Math.floor(durationSec * targetRateHz) + 1));
  const resampled = [];
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    const tSec = startSec + index / targetRateHz;
    while (cursor < samples.length - 2 && samples[cursor + 1].tSec < tSec) {
      cursor++;
    }
    const left = samples[cursor];
    const right = samples[Math.min(samples.length - 1, cursor + 1)];
    const span = Math.max(1e-9, right.tSec - left.tSec);
    const mix = Math.max(0, Math.min(1, (tSec - left.tSec) / span));
    const ppg = left.ppg + (right.ppg - left.ppg) * mix;
    resampled.push({
      tSec,
      ppg,
      sourceIndex: cursor,
      source: left.source || right.source || state.ppg.signalSource || "raw"
    });
  }
  return {
    samples: resampled,
    values: resampled.map((sample) => sample.ppg),
    durationSec
  };
}

function movingAverage(values, radius) {
  const out = Array(values.length).fill(0);
  let sum = 0;
  for (let index = 0; index < values.length; index++) {
    sum += values[index];
    const removeIndex = index - radius * 2 - 1;
    if (removeIndex >= 0) {
      sum -= values[removeIndex];
    }
    const count = Math.min(index + 1, radius * 2 + 1);
    out[index] = sum / count;
  }
  return out;
}

function preprocessPpgWindow(window, sampleRateHz) {
  const raw = window.map((sample) => sample.ppg);
  return preprocessPpgValues(raw, sampleRateHz);
}

function convolveSame(values, kernel) {
  const radius = Math.floor(kernel.length / 2);
  return values.map((_, index) => {
    let sum = 0;
    for (let k = 0; k < kernel.length; k++) {
      const sourceIndex = Math.max(0, Math.min(values.length - 1, index + k - radius));
      sum += values[sourceIndex] * kernel[k];
    }
    return sum;
  });
}

function normalizeUnit(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-6, max - min);
  return values.map((value) => (value - min) / span);
}

function ppgFeatureMean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function ppgFeatureStddev(values, mu = ppgFeatureMean(values)) {
  if (values.length === 0) {
    return 0;
  }
  const variance = values.reduce((sum, value) => {
    const delta = value - mu;
    return sum + delta * delta;
  }, 0) / values.length;
  return Math.sqrt(variance);
}

function ppgZeroCrossRate(values) {
  let count = 0;
  for (let index = 1; index < values.length; index++) {
    if ((values[index - 1] < 0 && values[index] >= 0) || (values[index - 1] >= 0 && values[index] < 0)) {
      count++;
    }
  }
  return values.length > 1 ? count / (values.length - 1) : 0;
}

function ppgSlopeSignChangeRate(values) {
  let count = 0;
  let prev = 0;
  let seen = false;
  for (let index = 1; index < values.length; index++) {
    const diff = values[index] - values[index - 1];
    const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
    if (sign !== 0) {
      if (seen && prev !== sign) {
        count++;
      }
      prev = sign;
      seen = true;
    }
  }
  return values.length > 2 ? count / (values.length - 2) : 0;
}

function normalizedPpgFeatureWindow(samples) {
  const mu = ppgFeatureMean(samples);
  const sigma = ppgFeatureStddev(samples, mu);
  if (!Number.isFinite(sigma) || sigma < 1e-8) {
    return null;
  }
  return samples.map((value) => (value - mu) / sigma);
}

function ppgCorrAtBpm(values, sampleRateHz, bpm) {
  const lag = Math.max(1, Math.round((sampleRateHz * 60) / bpm));
  if (lag >= values.length - 2) {
    return 0;
  }
  let sum = 0;
  let count = 0;
  for (let index = 0; index + lag < values.length; index++) {
    sum += values[index] * values[index + lag];
    count++;
  }
  return count ? sum / count : 0;
}

function ppgSpectralMagAtBpm(values, sampleRateHz, bpm) {
  const omega = (2 * Math.PI * bpm) / (60 * sampleRateHz);
  let re = 0;
  let im = 0;
  for (let index = 0; index < values.length; index++) {
    const angle = omega * index;
    re += values[index] * Math.cos(angle);
    im -= values[index] * Math.sin(angle);
  }
  return (2 * Math.sqrt(re * re + im * im)) / Math.max(1, values.length);
}

function ppgPositiveCentroid(targets, values) {
  let weighted = 0;
  let total = 0;
  for (let index = 0; index < targets.length; index++) {
    const value = Math.max(0, values[index]);
    weighted += targets[index] * value;
    total += value;
  }
  return total > 1e-9 ? weighted / total : targets[Math.floor(targets.length / 2)];
}

function ppgSpreadAroundCentroid(targets, values, centroid) {
  let weighted = 0;
  let total = 0;
  for (let index = 0; index < targets.length; index++) {
    const value = Math.max(0, values[index]);
    const delta = targets[index] - centroid;
    weighted += delta * delta * value;
    total += value;
  }
  return total > 1e-9 ? Math.sqrt(weighted / total) : 0;
}

function ppgPeakTarget(targets, values) {
  let bestIndex = 0;
  let bestValue = values[0];
  for (let index = 1; index < values.length; index++) {
    if (values[index] > bestValue) {
      bestValue = values[index];
      bestIndex = index;
    }
  }
  return { bpm: targets[bestIndex], value: bestValue };
}

function extractPpgRegressionFeatures(samples, sampleRateHz, model = getPpgRegressionModel()) {
  const z = normalizedPpgFeatureWindow(samples);
  if (!z) {
    return null;
  }
  const targetBpms = Array.isArray(model.targetBpms) && model.targetBpms.length > 0
    ? model.targetBpms
    : Array.from({ length: 28 }, (_, index) => 45 + index * 5);

  const diffs = [];
  for (let index = 1; index < z.length; index++) {
    diffs.push(z[index] - z[index - 1]);
  }
  const absDiffs = diffs.map((value) => Math.abs(value));
  const rmsDiff = Math.sqrt(ppgFeatureMean(diffs.map((value) => value * value)));
  const meanAbsDiff = ppgFeatureMean(absDiffs);
  const maxAbsDiff = absDiffs.reduce((maxValue, value) => Math.max(maxValue, value), 0);

  const corr = targetBpms.map((bpm) => ppgCorrAtBpm(z, sampleRateHz, bpm));
  const spec = targetBpms.map((bpm) => ppgSpectralMagAtBpm(z, sampleRateHz, bpm));
  const corrPeak = ppgPeakTarget(targetBpms, corr);
  const specPeak = ppgPeakTarget(targetBpms, spec);
  const corrCentroid = ppgPositiveCentroid(targetBpms, corr);
  const specCentroid = ppgPositiveCentroid(targetBpms, spec);
  const corrSpread = ppgSpreadAroundCentroid(targetBpms, corr, corrCentroid);
  const specSpread = ppgSpreadAroundCentroid(targetBpms, spec, specCentroid);

  return [
    corrCentroid,
    corrPeak.bpm,
    corrPeak.value,
    corrSpread,
    specCentroid,
    specPeak.bpm,
    specPeak.value,
    specSpread,
    meanAbsDiff,
    rmsDiff,
    maxAbsDiff,
    ppgZeroCrossRate(z),
    ppgSlopeSignChangeRate(z),
    ...corr,
    ...spec
  ];
}

function preprocessPpgValues(raw, sampleRateHz) {
  const baselineRadius = Math.max(3, Math.round(sampleRateHz * 1.2));
  const smoothRadius = Math.max(1, Math.round(sampleRateHz * 0.08));
  const baseline = movingAverage(raw, baselineRadius);
  const detrended = raw.map((value, index) => value - baseline[index]);
  const smoothed = movingAverage(detrended, smoothRadius);
  const mean = smoothed.reduce((sum, value) => sum + value, 0) / Math.max(1, smoothed.length);
  const variance = smoothed.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, smoothed.length);
  const std = Math.max(1e-6, Math.sqrt(variance));
  return smoothed.map((value) => (value - mean) / std);
}

function runPpgCnnDetector(processed, sampleRateHz) {
  const model = getPpgCnnModel();
  let filters = getPpgModelConvFilters(model);
  if (filters.length === 0) {
    filters = getPpgModelConvFilters(PPG_WEB_CNN_FALLBACK_MODEL);
  }
  const startedAt = performance.now();
  const featureMaps = filters.map((filter) => (
    convolveSame(processed, filter.weights).map((value) => Math.max(0, value + filter.bias))
  ));
  const fused = processed.map((_, index) => (
    featureMaps.reduce((sum, map) => sum + map[index], 0) / featureMaps.length
  ));
  const pooled = movingAverage(fused, getPpgModelPoolingRadiusSamples(model, sampleRateHz));
  return {
    modelId: model.id || "ppg_cnn",
    modelVersion: model.version || "",
    kernels: filters.map((filter) => filter.weights.length),
    filterNames: filters.map((filter) => filter.name),
    sampleRateHz,
    score: normalizeUnit(pooled),
    inferenceMs: performance.now() - startedAt
  };
}

function runPpgHrRegression(modelInput) {
  const model = getPpgRegressionModel();
  const weights = model.model?.weights || [];
  const means = model.model?.means || [];
  const scales = model.model?.scales || [];
  if (!weights.length || weights.length !== means.length || weights.length !== scales.length) {
    return {
      available: false,
      error: "Regression model not loaded"
    };
  }

  const sampleRateHz = getPpgRegressionSampleRateHz(model);
  const windowSec = getPpgRegressionWindowSec(model);
  const requiredSamples = Math.max(2, Math.round(sampleRateHz * windowSec));
  if (modelInput.raw.length < requiredSamples) {
    return {
      available: false,
      error: `Need ${requiredSamples} samples for regression`
    };
  }

  const startedAt = performance.now();
  const samples = modelInput.raw.slice(modelInput.raw.length - requiredSamples);
  const features = extractPpgRegressionFeatures(samples, sampleRateHz, model);
  if (!features || features.length !== weights.length) {
    return {
      available: false,
      error: "Could not extract regression features"
    };
  }

  let hrBpm = Number(model.model.bias);
  for (let index = 0; index < weights.length; index++) {
    const scale = Math.abs(scales[index]) > 1e-9 ? scales[index] : 1;
    hrBpm += weights[index] * ((features[index] - means[index]) / scale);
  }
  const clamp = Array.isArray(model.model.clampBpm) ? model.model.clampBpm : [35, 220];
  hrBpm = Math.max(clamp[0], Math.min(clamp[1], hrBpm));

  return {
    available: true,
    modelId: model.id || "ppg_hr_regression",
    modelVersion: model.version || "",
    hrBpm,
    sampleRateHz,
    windowSec,
    samples: requiredSamples,
    featureCount: features.length,
    validationMaeBpm: model.training?.metrics?.validation?.maeBpm,
    inferenceMs: performance.now() - startedAt
  };
}

function preparePpgCnnInput(window, options) {
  const model = getPpgCnnModel();
  const modelRateHz = getPpgModelSampleRateHz(model);
  const minWindowSec = getPpgModelMinWindowSec(model);
  const durationSec = ppgWindowDurationSec(window);
  if (durationSec < minWindowSec) {
    throw new Error(`Selected PPG window is too short for Web CNN (${durationSec.toFixed(1)} / ${minWindowSec.toFixed(0)} s)`);
  }

  const sourceRateHz = normalizeNumber(options.sampleRateHz, state.ppg.sampleRateHz || state.settings.rateHz || modelRateHz, 1, 1000);
  const resampled = resamplePpgWindow(window, modelRateHz, sourceRateHz);
  if (resampled.values.length < Math.max(10, Math.ceil(modelRateHz * minWindowSec))) {
    throw new Error("Selected PPG window does not contain enough model input samples");
  }

  return {
    model,
    sampleRateHz: modelRateHz,
    sourceRateHz,
    sourceSamples: window.length,
    samples: resampled.samples,
    raw: resampled.values,
    processed: preprocessPpgValues(resampled.values, modelRateHz),
    durationSec: resampled.durationSec,
    resampled: Math.abs(sourceRateHz - modelRateHz) > 0.05
  };
}

function detectPeaksFromScore(score, threshold, refractorySamples) {
  const peaks = [];
  let lastPeak = -Infinity;
  for (let index = 1; index < score.length - 1; index++) {
    if (score[index] < threshold || score[index] < score[index - 1] || score[index] < score[index + 1]) {
      continue;
    }
    if (index - lastPeak < refractorySamples) {
      if (peaks.length > 0 && score[index] > score[peaks[peaks.length - 1]]) {
        peaks[peaks.length - 1] = index;
        lastPeak = index;
      }
      continue;
    }
    peaks.push(index);
    lastPeak = index;
  }
  return peaks;
}

function computeHrvFromPeaks(peaks, sampleRateHz) {
  const ibiMs = [];
  for (let index = 1; index < peaks.length; index++) {
    const ibi = ((peaks[index] - peaks[index - 1]) / sampleRateHz) * 1000;
    if (ibi >= 300 && ibi <= 2000) {
      ibiMs.push(ibi);
    }
  }
  if (ibiMs.length < 2) {
    return {
      peaks: peaks.length,
      ibiMs,
      hrBpm: NaN,
      meanIbiMs: NaN,
      rmssdMs: NaN,
      sdnnMs: NaN,
      pnn50: NaN
    };
  }
  const meanIbiMs = ibiMs.reduce((sum, value) => sum + value, 0) / ibiMs.length;
  const diffs = [];
  for (let index = 1; index < ibiMs.length; index++) {
    diffs.push(ibiMs[index] - ibiMs[index - 1]);
  }
  const rmssdMs = Math.sqrt(diffs.reduce((sum, value) => sum + value * value, 0) / Math.max(1, diffs.length));
  const sdnnMs = Math.sqrt(ibiMs.reduce((sum, value) => sum + (value - meanIbiMs) ** 2, 0) / Math.max(1, ibiMs.length - 1));
  const pnn50 = diffs.filter((value) => Math.abs(value) > 50).length / Math.max(1, diffs.length);
  return {
    peaks: peaks.length,
    ibiMs,
    hrBpm: 60000 / meanIbiMs,
    meanIbiMs,
    rmssdMs,
    sdnnMs,
    pnn50
  };
}

function runPpgAnalysis(optionsOverride = {}) {
  const options = getPpgOptions();
  const window = getPpgWindow(options);
  if (window.length < 2) {
    throw new Error("Selected PPG window is too short");
  }
  const modelInput = preparePpgCnnInput(window, options);
  const processed = modelInput.processed;
  const cnn = runPpgCnnDetector(processed, modelInput.sampleRateHz);
  const refractorySamples = Math.max(1, Math.round((options.refractoryMs / 1000) * modelInput.sampleRateHz));
  const peaks = detectPeaksFromScore(cnn.score, options.threshold, refractorySamples);
  const hrv = computeHrvFromPeaks(peaks, modelInput.sampleRateHz);
  const regression = runPpgHrRegression(modelInput);
  const referenceHrValues = window.map((sample) => sample.hr).filter(Number.isFinite);
  const referenceHr = referenceHrValues.length > 0
    ? referenceHrValues.reduce((sum, value) => sum + value, 0) / referenceHrValues.length
    : NaN;
  state.ppg.analysis = {
    options,
    window,
    modelInput,
    processed,
    cnn,
    regression,
    peaks,
    hrv,
    referenceHr
  };
  state.ppg.error = "";
  if (!optionsOverride.silent) {
    logLine(`PPG_ANALYZE,window=${window.length},peaks=${peaks.length},hr=${Number.isFinite(hrv.hrBpm) ? hrv.hrBpm.toFixed(1) : "nan"}`);
  }
  renderPpgView();
}

function maybeRunLivePpgAnalysis(latestSample) {
  if (state.ppg.source !== "Live ADC" || !latestSample) {
    return;
  }
  const options = getPpgOptions();
  const requiredSamples = Math.max(10, Math.ceil(options.sampleRateHz * 8));
  if (state.ppg.samples.length < requiredSamples) {
    state.ppg.analysis = null;
    state.ppg.error = "";
    return;
  }
  const now = performance.now();
  const seqDelta = state.ppg.lastAutoAnalysisSeq == null
    ? Infinity
    : Math.abs(latestSample.seq - state.ppg.lastAutoAnalysisSeq);
  const sampleIntervalReady = seqDelta >= Math.max(1, Math.round(options.sampleRateHz));
  const timeReady = now - state.ppg.lastAutoAnalysisAt >= PPG_LIVE_ANALYSIS_INTERVAL_MS;
  if (!sampleIntervalReady && !timeReady) {
    return;
  }

  try {
    runPpgAnalysis({ silent: true });
    state.ppg.lastAutoAnalysisAt = now;
    state.ppg.lastAutoAnalysisSeq = latestSample.seq;
  } catch (error) {
    if (!/too short/i.test(error.message)) {
      state.ppg.error = error.message;
    }
  }
}

async function loadBundledPpgCsv() {
  state.ppg.loading = true;
  state.ppg.error = "";
  el.ppgStatus.textContent = "Loading";
  setUiEnabled();
  try {
    let lastError = null;
    for (const path of PPG_SAMPLE_PATHS) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        parsePpgCsv(await response.text(), path);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No bundled PPG CSV path worked");
  } catch (error) {
    state.ppg.error = error.message;
    el.ppgStatus.textContent = "Load failed";
    logLine(`ERR,ppg_load,${error.message}`);
  } finally {
    state.ppg.loading = false;
    renderPpgView();
    setUiEnabled();
  }
}

async function importPpgCsv(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  state.ppg.loading = true;
  state.ppg.error = "";
  el.ppgStatus.textContent = "Loading";
  setUiEnabled();
  try {
    parsePpgCsv(await file.text(), file.name);
  } catch (error) {
    state.ppg.error = error.message;
    el.ppgStatus.textContent = "Load failed";
    logLine(`ERR,ppg_import,${error.message}`);
  } finally {
    state.ppg.loading = false;
    renderPpgView();
    setUiEnabled();
  }
}

function safeMetric(value, digits = 1, suffix = "") {
  return Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "--";
}

function renderPpgView() {
  const sampleCount = state.ppg.samples.length;
  const analysis = state.ppg.analysis;
  const liveHr = state.ppg.liveHr;
  const isLive = state.ppg.source === "Live ADC";
  const sourceLabel = isLive
    ? `Live ADC ${state.ppg.signalSource || "raw"}`
    : state.ppg.source || "CSV";
  el.ppgStatus.textContent = state.ppg.loading
    ? "Loading"
    : state.ppg.error ? state.ppg.error
    : analysis && isLive ? "Live HRV"
    : analysis ? "Analyzed" : isLive && sampleCount > 0 ? "Estimating" : sampleCount > 0 ? "Ready" : "No data";
  el.ppgSourceState.textContent = sampleCount > 0
    ? `${sourceLabel} - ${sampleCount} samples`
    : "Waiting for ADC";
  el.ppgMetricState.textContent = analysis
    ? `${analysis.peaks.length} peaks`
    : liveHr && Number.isFinite(liveHr.hrBpm) ? `${liveHr.hrBpm.toFixed(1)} bpm`
    : `${sampleCount} samples`;
  el.ppgThresholdOutput.textContent = Number(el.ppgThresholdInput.value).toFixed(2);

  if (!analysis) {
    const options = getPpgOptions();
    const requiredSamples = Math.max(10, Math.ceil(options.sampleRateHz * 8));
    const windowSamples = getPpgWindow(options).length;
    const model = getPpgCnnModel();
    const regressionModel = getPpgRegressionModel();
    const modelRateHz = getPpgModelSampleRateHz(model);
    const modelMinSec = getPpgModelMinWindowSec(model);
    const modelRecommendedSec = normalizeNumber(model.recommendedWindowSec, 30, modelMinSec, 180);
    const regressionRateHz = getPpgRegressionSampleRateHz(regressionModel);
    const regressionWindowSec = getPpgRegressionWindowSec(regressionModel);
    const regressionSamples = Math.ceil(regressionRateHz * regressionWindowSec);
    const targetCnnSamples = Math.ceil(modelRateHz * options.durationSec);
    const targetAdcSamples = Math.ceil(options.sampleRateHz * options.durationSec);
    el.ppgWindowState.textContent = isLive
      ? `${Math.min(windowSamples, sampleCount)} / ${Math.max(requiredSamples, Math.ceil(options.sampleRateHz * options.durationSec))} samples`
      : sampleCount > 0 ? "Ready to analyze" : "No window";
    el.ppgCnnState.textContent = isLive
      ? `Waiting for ${modelRateHz.toFixed(0)} Hz model input`
      : `${model.id || "Web CNN"} idle`;
    el.ppgModelState.textContent = `${options.durationSec.toFixed(0)} s -> ${targetCnnSamples} CNN samples`;
    el.ppgMetrics.replaceChildren(
      metricRow("Sample Rate", `${Number(el.ppgSampleRateInput.value || state.ppg.sampleRateHz).toFixed(1)} Hz`),
      metricRow("Web Model", `${modelRateHz.toFixed(0)} Hz Conv1D detector`),
      metricRow("Regression Model", formatPpgRegressionStatus(regressionModel)),
      metricRow("Regression Dataset", formatPpgRegressionDataset(regressionModel)),
      metricRow("Regression Input", `${regressionSamples} samples / ${regressionWindowSec.toFixed(0)} s`),
      metricRow("Training", formatPpgTrainingStatus(model)),
      metricRow("Dataset", formatPpgDatasetStatus(model)),
      metricRow("Train / Val", formatPpgTrainingSplit(model)),
      metricRow("Train Rule", formatPpgTrainingRule(model)),
      metricRow("Reference Data", formatPpgReferenceDataset(model)),
      metricRow("Model Window", `min ${modelMinSec.toFixed(0)} s / rec ${modelRecommendedSec.toFixed(0)} s`),
      metricRow("ADC Window", `${targetAdcSamples} samples / ${options.durationSec.toFixed(0)} s`),
      metricRow("CNN Window", `${targetCnnSamples} samples / ${options.durationSec.toFixed(0)} s`),
      metricRow("Window", `${safeMetric(windowSamples, 0)} / ${Math.ceil(options.sampleRateHz * options.durationSec)}`),
      metricRow("ADC Source", state.ppg.signalSource || "--"),
      metricRow("Last HR", liveHr && Number.isFinite(liveHr.hrBpm) ? `${liveHr.hrBpm.toFixed(1)} bpm` : "--"),
      metricRow("Quality", liveHr && Number.isFinite(liveHr.quality) ? liveHr.quality.toFixed(3) : "--")
    );
    drawPpgModelDiagram(null);
    if (sampleCount > 0) {
      drawLivePpgPlot();
    } else {
      drawEmptyAuxPlot(el.ppgCanvas, "Start ADC streaming");
    }
    drawPpgCnnArchitecture();
    return;
  }

  const hrv = analysis.hrv;
  const regression = analysis.regression;
  const modelMinSec = getPpgModelMinWindowSec(analysis.modelInput.model);
  const modelRecommendedSec = normalizeNumber(analysis.modelInput.model.recommendedWindowSec, 30, modelMinSec, 180);
  el.ppgWindowState.textContent = `${analysis.modelInput.samples.length} CNN samples / ${analysis.window.length} ADC samples - ${analysis.modelInput.durationSec.toFixed(1)} s`;
  el.ppgCnnState.textContent = `${analysis.cnn.modelId} @ ${analysis.modelInput.sampleRateHz.toFixed(0)} Hz`;
  el.ppgModelState.textContent = `${analysis.window.length} ADC -> ${analysis.modelInput.samples.length} CNN samples`;
  const rows = [
    metricRow("Peak HR", safeMetric(hrv.hrBpm, 1, " bpm")),
    metricRow("Regression HR", regression?.available ? safeMetric(regression.hrBpm, 1, " bpm") : regression?.error || "--"),
    metricRow("CNN-Reg Diff", regression?.available && Number.isFinite(hrv.hrBpm) ? safeMetric(hrv.hrBpm - regression.hrBpm, 1, " bpm") : "--"),
    metricRow("Regression Input", regression?.available ? `${regression.samples} samples / ${regression.featureCount} features` : "--"),
    metricRow("Regression Model", formatPpgRegressionStatus(getPpgRegressionModel())),
    metricRow("Training", formatPpgTrainingStatus(analysis.modelInput.model)),
    metricRow("Dataset", formatPpgDatasetStatus(analysis.modelInput.model)),
    metricRow("Train / Val", formatPpgTrainingSplit(analysis.modelInput.model)),
    metricRow("Train Rule", formatPpgTrainingRule(analysis.modelInput.model)),
    metricRow("Reference Data", formatPpgReferenceDataset(analysis.modelInput.model)),
    metricRow("Model Window", `min ${modelMinSec.toFixed(0)} s / rec ${modelRecommendedSec.toFixed(0)} s`),
    metricRow("ADC Window", `${analysis.window.length} samples / ${analysis.modelInput.durationSec.toFixed(1)} s`),
    metricRow("Model Input", `${analysis.modelInput.samples.length} @ ${analysis.modelInput.sampleRateHz.toFixed(1)} Hz`),
    metricRow("Source Rate", `${analysis.modelInput.sourceRateHz.toFixed(1)} Hz${analysis.modelInput.resampled ? " -> resampled" : ""}`),
    metricRow("RMSSD", safeMetric(hrv.rmssdMs, 1, " ms")),
    metricRow("SDNN", safeMetric(hrv.sdnnMs, 1, " ms")),
    metricRow("pNN50", Number.isFinite(hrv.pnn50) ? `${(hrv.pnn50 * 100).toFixed(1)}%` : "--"),
    metricRow("Mean IBI", safeMetric(hrv.meanIbiMs, 1, " ms")),
    metricRow("ADC Source", isLive ? state.ppg.signalSource || "--" : "CSV"),
    metricRow("Inference", `${analysis.cnn.inferenceMs.toFixed(2)} ms CNN${regression?.available ? ` / ${regression.inferenceMs.toFixed(2)} ms ridge` : ""}`)
  ];
  if (!isLive) {
    rows.splice(1, 0, metricRow("Reference HR", safeMetric(analysis.referenceHr, 1, " bpm")));
  }
  el.ppgMetrics.replaceChildren(...rows);
  drawPpgModelDiagram(analysis);
  drawPpgSignalPlot();
  drawPpgCnnScorePlot();
}

function drawLivePpgPlot() {
  const samples = state.ppg.samples;
  if (!samples.length) {
    drawEmptyAuxPlot(el.ppgCanvas, "No live PPG samples");
    return;
  }
  const { ctx: ppgCtx, width, height } = resizeAuxCanvasToDisplaySize(el.ppgCanvas, 220);
  const pad = { left: 48, right: 18, top: 18, bottom: 34 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const values = samples.map((sample) => sample.ppg);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const span = Math.max(1, maxY - minY);

  ppgCtx.clearRect(0, 0, width, height);
  ppgCtx.fillStyle = "#ffffff";
  ppgCtx.fillRect(0, 0, width, height);
  drawGridOn(ppgCtx, width, height, pad, plotWidth, plotHeight);
  ppgCtx.strokeStyle = "#008c8c";
  ppgCtx.lineWidth = 1.6;
  ppgCtx.beginPath();
  values.forEach((value, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, values.length - 1);
    const y = pad.top + plotHeight - ((value - minY) / span) * plotHeight;
    if (index === 0) {
      ppgCtx.moveTo(x, y);
    } else {
      ppgCtx.lineTo(x, y);
    }
  });
  ppgCtx.stroke();

  const liveHr = state.ppg.liveHr;
  drawLegendOn(ppgCtx, [
    { color: "#008c8c", label: state.ppg.signalSource === "filtered" ? "Filtered ADC" : "Raw ADC" },
    { color: "#2767c9", label: liveHr && Number.isFinite(liveHr.hrBpm) ? `${liveHr.hrBpm.toFixed(1)} bpm` : "waiting HR" }
  ], pad.left + 8, pad.top + 18);
}

function drawEmptyAuxPlot(canvas, message) {
  const { ctx: auxCtx, width, height } = resizeAuxCanvasToDisplaySize(canvas, 190);
  auxCtx.clearRect(0, 0, width, height);
  auxCtx.fillStyle = "#ffffff";
  auxCtx.fillRect(0, 0, width, height);
  auxCtx.fillStyle = "#637083";
  auxCtx.font = "14px Segoe UI, Arial, sans-serif";
  auxCtx.fillText(message, 18, 34);
}

function drawPpgModelDiagram(analysis = state.ppg.analysis) {
  if (!el.ppgModelCanvas) {
    return;
  }
  const { ctx: modelCtx, width, height } = resizeAuxCanvasToDisplaySize(el.ppgModelCanvas, 220);
  const options = getPpgOptions();
  const model = getPpgCnnModel();
  const regressionModel = getPpgRegressionModel();
  const filters = getPpgModelConvFilters(model);
  const targetRateHz = getPpgModelSampleRateHz(model);
  const minWindowSec = getPpgModelMinWindowSec(model);
  const recommendedWindowSec = normalizeNumber(model.recommendedWindowSec, 30, minWindowSec, 180);
  const regressionWindowSec = getPpgRegressionWindowSec(regressionModel);
  const regressionFeatureCount = normalizeNumber(regressionModel.featureCount, 0, 0, 10000);
  const durationSec = analysis?.modelInput?.durationSec || options.durationSec;
  const sourceRateHz = analysis?.modelInput?.sourceRateHz || options.sampleRateHz;
  const adcSamples = analysis?.window?.length || Math.ceil(sourceRateHz * durationSec);
  const cnnSamples = analysis?.modelInput?.samples?.length || Math.ceil(targetRateHz * durationSec);
  const filterShape = filters.map((filter) => filter.weights.length).join("/");
  const resampleLabel = Math.abs(sourceRateHz - targetRateHz) > 0.05
    ? `${sourceRateHz.toFixed(1)} -> ${targetRateHz.toFixed(0)} Hz`
    : `${targetRateHz.toFixed(0)} Hz`;
  const nodes = [
    { title: "ADC Window", lines: [`${durationSec.toFixed(1)} s`, `${adcSamples} samples`, `${sourceRateHz.toFixed(1)} Hz source`], color: "#008c8c" },
    { title: "Resample", lines: [resampleLabel, "linear interpolation", "browser side"], color: "#2767c9" },
    { title: "32 Hz Input", lines: [`CNN ${cnnSamples} x 1`, `Ridge ${regressionWindowSec.toFixed(0)} s`, `${regressionFeatureCount || "--"} features`], color: "#008c8c" },
    { title: "Conv1D Path", lines: [`${filters.length} filters`, `kernel ${filterShape || "--"}`, "ReLU"], color: "#d28a00" },
    { title: "Peak Score", lines: ["avg pool", "0..1 score", `gate ${options.threshold.toFixed(2)}`], color: "#7b5fb2" },
    { title: "HR Compare", lines: ["CNN IBI HR/HRV", "Ridge direct HR", "compare bpm"], color: "#008c8c" }
  ];

  modelCtx.clearRect(0, 0, width, height);
  modelCtx.fillStyle = "#ffffff";
  modelCtx.fillRect(0, 0, width, height);

  const pad = 18;
  const columns = width < 620 ? 2 : 3;
  const gapX = 14;
  const gapY = 18;
  const boxWidth = (width - pad * 2 - gapX * (columns - 1)) / columns;
  const rows = Math.ceil(nodes.length / columns);
  const headerHeight = 56;
  const boxHeight = Math.max(56, Math.min(76, (height - pad * 2 - headerHeight - gapY * (rows - 1)) / rows));
  const startY = pad + headerHeight;

  modelCtx.fillStyle = "#17202a";
  modelCtx.font = "800 13px Segoe UI, Arial, sans-serif";
  modelCtx.textAlign = "left";
  modelCtx.fillText(`${model.id || "PPG Web CNN"} v${model.version || ""}`, pad, pad + 6);
  modelCtx.fillStyle = "#637083";
  modelCtx.font = "11px Segoe UI, Arial, sans-serif";
  modelCtx.fillText(`Training: ${shortPpgLabel(formatPpgTrainingStatus(model), 62)}`, pad, pad + 22);
  modelCtx.fillText(`Dataset: ${shortPpgLabel(formatPpgDatasetStatus(model), 62)}`, pad, pad + 38);
  modelCtx.fillText(`Window ${durationSec.toFixed(1)} s / input ${cnnSamples} samples / min ${minWindowSec.toFixed(0)} s / rec ${recommendedWindowSec.toFixed(0)} s`, pad, pad + 54);

  const boxes = nodes.map((node, index) => {
    const logicalCol = index % columns;
    const row = Math.floor(index / columns);
    const col = row % 2 === 0 ? logicalCol : columns - 1 - logicalCol;
    const x = pad + col * (boxWidth + gapX);
    const y = startY + row * (boxHeight + gapY);
    return {
      node,
      x,
      y,
      row,
      centerX: x + boxWidth / 2,
      centerY: y + boxHeight / 2
    };
  });

  modelCtx.strokeStyle = "#c9d2df";
  modelCtx.fillStyle = "#c9d2df";
  modelCtx.lineWidth = 1.6;
  for (let index = 0; index < boxes.length - 1; index++) {
    const from = boxes[index];
    const to = boxes[index + 1];
    const sameRow = from.row === to.row;
    let x1;
    let y1;
    let x2;
    let y2;
    if (sameRow) {
      const leftToRight = to.centerX > from.centerX;
      x1 = leftToRight ? from.x + boxWidth + 6 : from.x - 6;
      y1 = from.centerY;
      x2 = leftToRight ? to.x - 6 : to.x + boxWidth + 6;
      y2 = to.centerY;
    } else {
      x1 = from.centerX;
      y1 = from.y + boxHeight + 6;
      x2 = to.centerX;
      y2 = to.y - 6;
    }
    modelCtx.beginPath();
    modelCtx.moveTo(x1, y1);
    modelCtx.lineTo(x2, y2);
    modelCtx.stroke();
    modelCtx.beginPath();
    modelCtx.arc(x2, y2, 3, 0, Math.PI * 2);
    modelCtx.fill();
  }

  boxes.forEach(({ node, x, y }) => {
    modelCtx.fillStyle = "#ffffff";
    modelCtx.strokeStyle = node.color;
    modelCtx.lineWidth = 1.8;
    modelCtx.beginPath();
    modelCtx.roundRect(x, y, boxWidth, boxHeight, 8);
    modelCtx.fill();
    modelCtx.stroke();

    modelCtx.fillStyle = node.color;
    modelCtx.font = "800 12px Segoe UI, Arial, sans-serif";
    modelCtx.textAlign = "left";
    modelCtx.fillText(node.title, x + 10, y + 17);
    modelCtx.fillStyle = "#526172";
    modelCtx.font = "11px Segoe UI, Arial, sans-serif";
    node.lines.forEach((line, lineIndex) => {
      modelCtx.fillText(line, x + 10, y + 35 + lineIndex * 13);
    });
  });
}

function drawPpgSignalPlot() {
  const analysis = state.ppg.analysis;
  if (!analysis) {
    drawEmptyAuxPlot(el.ppgCanvas, "No PPG analysis");
    return;
  }
  const { ctx: ppgCtx, width, height } = resizeAuxCanvasToDisplaySize(el.ppgCanvas, 220);
  const pad = { left: 48, right: 18, top: 18, bottom: 34 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  ppgCtx.clearRect(0, 0, width, height);
  ppgCtx.fillStyle = "#ffffff";
  ppgCtx.fillRect(0, 0, width, height);
  drawGridOn(ppgCtx, width, height, pad, plotWidth, plotHeight);
  const values = analysis.processed;
  const minY = Math.min(-0.5, ...values);
  const maxY = Math.max(0.5, ...values);
  ppgCtx.strokeStyle = "#008c8c";
  ppgCtx.lineWidth = 1.6;
  ppgCtx.beginPath();
  values.forEach((value, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, values.length - 1);
    const y = pad.top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;
    if (index === 0) {
      ppgCtx.moveTo(x, y);
    } else {
      ppgCtx.lineTo(x, y);
    }
  });
  ppgCtx.stroke();

  ppgCtx.fillStyle = "#d28a00";
  for (const peak of analysis.peaks) {
    const x = pad.left + (plotWidth * peak) / Math.max(1, values.length - 1);
    const value = values[peak];
    const y = pad.top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;
    ppgCtx.beginPath();
    ppgCtx.arc(x, y, 3.5, 0, Math.PI * 2);
    ppgCtx.fill();
  }
  drawLegendOn(ppgCtx, [
    { color: "#008c8c", label: "PPG" },
    { color: "#d28a00", label: "peaks" }
  ], pad.left + 8, pad.top + 18);
}

function drawPpgCnnArchitecture() {
  const { ctx: cnnCtx, width, height } = resizeAuxCanvasToDisplaySize(el.ppgCnnCanvas, 180);
  cnnCtx.clearRect(0, 0, width, height);
  cnnCtx.fillStyle = "#ffffff";
  cnnCtx.fillRect(0, 0, width, height);
  const model = getPpgCnnModel();
  const filters = getPpgModelConvFilters(model);
  const modelRateHz = getPpgModelSampleRateHz(model);
  const layers = [
    { label: "ADC", value: "raw window", color: "#008c8c" },
    { label: "Resample", value: `${modelRateHz.toFixed(0)} Hz`, color: "#2767c9" },
    { label: "Conv1D", value: `${filters.length} filters`, color: "#d28a00" },
    { label: "ReLU + Pool", value: "score map", color: "#7b5fb2" },
    { label: "Peak Gate", value: "IBI", color: "#2767c9" },
    { label: "HRV", value: "RMSSD/SDNN", color: "#008c8c" }
  ];
  const gap = (width - 80) / Math.max(1, layers.length - 1);
  const y = height / 2;
  cnnCtx.strokeStyle = "#d7dee8";
  cnnCtx.lineWidth = 2;
  cnnCtx.beginPath();
  cnnCtx.moveTo(40, y);
  cnnCtx.lineTo(width - 40, y);
  cnnCtx.stroke();
  layers.forEach((layer, index) => {
    const x = 40 + gap * index;
    cnnCtx.fillStyle = layer.color;
    cnnCtx.beginPath();
    cnnCtx.arc(x, y, 10, 0, Math.PI * 2);
    cnnCtx.fill();
    cnnCtx.fillStyle = "#17202a";
    cnnCtx.font = "700 12px Segoe UI, Arial, sans-serif";
    cnnCtx.textAlign = "center";
    cnnCtx.fillText(layer.label, x, y - 24);
    cnnCtx.fillStyle = "#637083";
    cnnCtx.font = "11px Segoe UI, Arial, sans-serif";
    cnnCtx.fillText(layer.value, x, y + 34);
  });
  cnnCtx.textAlign = "start";
}

function drawPpgCnnScorePlot() {
  const analysis = state.ppg.analysis;
  if (!analysis) {
    drawPpgCnnArchitecture();
    return;
  }
  const { ctx: cnnCtx, width, height } = resizeAuxCanvasToDisplaySize(el.ppgCnnCanvas, 180);
  const pad = { left: 44, right: 16, top: 18, bottom: 30 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  cnnCtx.clearRect(0, 0, width, height);
  cnnCtx.fillStyle = "#ffffff";
  cnnCtx.fillRect(0, 0, width, height);
  drawGridOn(cnnCtx, width, height, pad, plotWidth, plotHeight);
  const score = analysis.cnn.score;
  cnnCtx.strokeStyle = "#2767c9";
  cnnCtx.lineWidth = 1.8;
  cnnCtx.beginPath();
  score.forEach((value, index) => {
    const x = pad.left + (plotWidth * index) / Math.max(1, score.length - 1);
    const y = pad.top + plotHeight - value * plotHeight;
    if (index === 0) {
      cnnCtx.moveTo(x, y);
    } else {
      cnnCtx.lineTo(x, y);
    }
  });
  cnnCtx.stroke();
  const thresholdY = pad.top + plotHeight - analysis.options.threshold * plotHeight;
  cnnCtx.strokeStyle = "#d28a00";
  cnnCtx.setLineDash([6, 5]);
  cnnCtx.beginPath();
  cnnCtx.moveTo(pad.left, thresholdY);
  cnnCtx.lineTo(width - pad.right, thresholdY);
  cnnCtx.stroke();
  cnnCtx.setLineDash([]);
  drawLegendOn(cnnCtx, [
    { color: "#2767c9", label: "score" },
    { color: "#d28a00", label: "gate" }
  ], pad.left + 8, pad.top + 18);
}

function setActiveView(view) {
  state.activeView = view;
  for (const tab of el.viewTabs) {
    tab.classList.toggle("active", tab.dataset.view === view);
  }
  updateViewVisibility();
  drawPlot();
  if (view === "classification") {
    void ensureClassificationRunningFromStream("tab");
  }
}

async function ensureClassificationRunningFromStream(reason = "view") {
  if (state.activeView !== "classification") {
    return;
  }
  if (!state.connected || !state.streaming || !state.writer) {
    renderClassification();
    return;
  }
  if (state.classification.active || state.classification.startPending) {
    renderClassification();
    return;
  }

  state.classification.startPending = true;
  renderClassification();
  setUiEnabled();

  try {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 500);
    applyInputPreprocess();
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("CLS ON");
    logLine(`CLASS_AUTO_START,${reason},rate=${state.settings.rateHz},window=${getInputWindowSize()}`);
  } catch (error) {
    state.classification.startPending = false;
    el.classificationState.textContent = "Start failed";
    logLine(`ERR,class_auto_start,${error.message}`);
  } finally {
    setUiEnabled();
    renderClassification();
  }
}

function syncSettingsPanelVisibility() {
  const showAdcSettings = state.activeView === "adc";
  const showInputSettings = INPUT_SETTINGS_VIEWS.has(state.activeView);
  const showClassificationSettings = state.activeView === "classification";

  el.adcSettingsSection.classList.toggle("is-hidden", !showAdcSettings);
  el.inputSettingsSection.classList.toggle("is-hidden", !showInputSettings);
  el.classificationSettingsSection.classList.toggle("is-hidden", !showClassificationSettings);
}

function updateViewVisibility() {
  const isPpg = state.activeView === "ppg";
  const isDataset = state.activeView === "dataset";
  const isModel = state.activeView === "model";
  const isCanvas = !NON_CANVAS_VIEWS.has(state.activeView);
  const isAdc = state.activeView === "adc";
  const isGyro3d = state.activeView === "gyro3d";
  el.signalCanvas.classList.toggle("is-hidden", !isCanvas);
  el.metricGrid.classList.toggle("is-hidden", !isCanvas);
  el.metric4Card?.classList.toggle("is-hidden", isAdc);
  el.adcPlotControls.classList.toggle("is-hidden", !isAdc);
  el.gyroControls?.classList.toggle("is-hidden", !isGyro3d);
  el.deviceLogSection.classList.toggle("is-hidden", !isAdc);
  el.ppgView.classList.toggle("is-hidden", !isPpg);
  el.datasetView.classList.toggle("is-hidden", !isDataset);
  el.modelView.classList.toggle("is-hidden", !isModel);
  syncSettingsPanelVisibility();
  if (isPpg) {
    renderPpgView();
  }
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
  const unit = sample.valueUnit === "mV" ? "mV" : sample.valueUnit === "value" ? "" : "";
  el.metric1Label.textContent = sample.rawLabel || "Raw";
  el.metric2Label.textContent = sample.filteredLabel || "Filtered";
  el.metric3Label.textContent = Number.isFinite(sample.millivolts) ? "Voltage" : "Format";
  el.metric4Label.textContent = "Rate";
  el.sampleCount.textContent = `${state.receivedSamples} samples`;
  el.recordCount.textContent = `${state.records.length} rows`;
  el.rawMetric.textContent = formatAdcMetric(sample.raw, sample.valueUnit === "count" ? 0 : 3, unit);
  el.filteredMetric.textContent = formatAdcMetric(sample.filtered, sample.valueUnit === "count" ? 1 : 3, unit);
  el.voltageMetric.textContent = Number.isFinite(sample.millivolts)
    ? `${sample.millivolts.toFixed(1)} mV`
    : sample.format || "--";
  const detail = sample.formatDetail ? ` - ${sample.formatDetail}` : "";
  const channel = Number.isFinite(sample.channel) ? `A${sample.channel}` : "ADC";
  el.plotMeta.textContent = `${sample.format || "ADC"}${detail} - ${channel} - seq ${sample.seq}`;
  el.lastTimestamp.textContent = `${sample.micros} us`;
  updateAdcFormatState();
}

function updateCurrentMetrics() {
  if (state.activeView === "ppg") {
    renderPpgView();
    return;
  }

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

  if (state.activeView === "gyro3d" && state.latestImu) {
    updateGyroMetrics(state.latestImu);
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

function updateGyroMetrics(sample) {
  const gyro = state.gyroOrientation;
  const magState = Number.isFinite(gyro.magHeading)
    ? `Mag ${gyro.magHeading.toFixed(1)} deg${gyro.magCorrectionActive ? " corrected" : ""}`
    : "Mag --";
  el.metric1Label.textContent = "Roll";
  el.metric2Label.textContent = "Pitch";
  el.metric3Label.textContent = "Yaw";
  el.metric4Label.textContent = "IMU Rate";
  el.sampleCount.textContent = `${state.receivedImuSamples} IMU`;
  el.recordCount.textContent = `${state.records.length} rows`;
  el.rawMetric.textContent = `${gyro.roll.toFixed(1)} deg`;
  el.filteredMetric.textContent = `${gyro.pitch.toFixed(1)} deg`;
  el.voltageMetric.textContent = `${gyro.yaw.toFixed(1)} deg`;
  el.plotMeta.textContent = `Gyro 3D - ${magState} - gx ${formatGyroDps(sample.gx)} dps, gy ${formatGyroDps(sample.gy)} dps, gz ${formatGyroDps(sample.gz)} dps - seq ${sample.seq}`;
  if (el.gyroMagState) {
    el.gyroMagState.textContent = magState;
  }
  el.lastTimestamp.textContent = `${sample.micros} us`;
}

function updateClassificationMetrics() {
  const result = state.classification;
  updateClassificationInputState();
  el.metric1Label.textContent = "Top Label";
  el.metric2Label.textContent = "Confidence";
  el.metric3Label.textContent = "DSP";
  el.metric4Label.textContent = "Classify";
  el.sampleCount.textContent = result.seq == null ? "0 class" : `${result.seq + 1} class`;
  el.rawMetric.textContent = result.topLabel || "--";
  el.filteredMetric.textContent = Number.isFinite(result.topScore) ? `${(result.topScore * 100).toFixed(1)}%` : "--";
  el.voltageMetric.textContent = Number.isFinite(result.timing?.dsp_ms) ? `${result.timing.dsp_ms} ms` : "--";
  el.rateMetric.textContent = Number.isFinite(result.timing?.classification_ms) ? `${result.timing.classification_ms} ms` : "--";
  el.plotMeta.textContent = result.updatedAt
    ? `Classification result - seq ${result.seq} - ${getInputWindowSize()} sample window`
    : `Waiting for classification - ${getInputWindowSize()} sample window`;
}

function updateRateMetric(now = performance.now()) {
  if (state.activeView === "classification") {
    return;
  }

  if (state.activeView.startsWith("imu") || state.activeView === "gyro3d") {
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
        <td>${sample.format || "RAW"}</td>
        <td>${sample.micros}</td>
        <td>${Number.isFinite(sample.channel) ? `A${sample.channel}` : "--"}</td>
        <td>${formatNumber(sample.raw, sample.valueUnit === "count" ? 0 : 3)}</td>
        <td>${formatNumber(sample.millivolts, 2)}</td>
        <td>${formatNumber(sample.filtered, sample.valueUnit === "count" ? 2 : 3)}</td>
      `;
      return row;
    })
  );
}

function drawPlot() {
  if (state.activeView === "ppg") {
    renderPpgView();
    return;
  }

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
  if (state.activeView === "gyro3d") {
    drawGyroOrientationPlot();
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

  syncAdcPlotSettings();
  const visibleSamples = getVisibleAdcSamples();

  if (visibleSamples.length < 2) {
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

  const series = getAdcPlotSeries();
  const xRange = getAdcPlotXRange(visibleSamples);
  const values = series
    .flatMap((item) => visibleSamples.map((sample) => getAdcPlotValue(sample, item.key)))
    .filter(Number.isFinite);

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

  for (const item of series) {
    drawTrace(visibleSamples, item, minY, maxY, xRange, pad, plotWidth, plotHeight);
  }

  drawLegend(series, pad.left + 8, height - 10);
  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(`${maxY.toFixed(0)}`, 12, pad.top + 4);
  ctx.fillText(`${minY.toFixed(0)}`, 12, height - pad.bottom);
  ctx.fillText(formatAxisNumber(xRange.min), pad.left, height - 8);
  ctx.fillText(formatAxisNumber(xRange.max), Math.max(pad.left + 48, width - pad.right - 70), height - 8);
}

function drawGrid(width, height, pad, plotWidth, plotHeight) {
  drawGridOn(ctx, width, height, pad, plotWidth, plotHeight);
}

function drawGridOn(targetCtx, width, height, pad, plotWidth, plotHeight) {
  targetCtx.strokeStyle = "#d7dee8";
  targetCtx.lineWidth = 1;
  targetCtx.beginPath();
  for (let i = 0; i <= 5; i++) {
    const y = pad.top + (plotHeight * i) / 5;
    targetCtx.moveTo(pad.left, y);
    targetCtx.lineTo(width - pad.right, y);
  }
  for (let i = 0; i <= 8; i++) {
    const x = pad.left + (plotWidth * i) / 8;
    targetCtx.moveTo(x, pad.top);
    targetCtx.lineTo(x, height - pad.bottom);
  }
  targetCtx.stroke();

  targetCtx.strokeStyle = "#bdc8d5";
  targetCtx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);
}

function drawTrace(samples, series, minY, maxY, xRange, pad, plotWidth, plotHeight) {
  ctx.strokeStyle = series.color;
  ctx.lineWidth = series.width;
  ctx.beginPath();
  let hasPoint = false;
  samples.forEach((sample, index) => {
    const value = getAdcPlotValue(sample, series.key);
    if (!Number.isFinite(value)) {
      return;
    }
    const rawX = getAdcPlotXValue(sample, index);
    const xValue = Number.isFinite(rawX) ? rawX : index;
    const x = pad.left + ((xValue - xRange.min) / (xRange.max - xRange.min)) * plotWidth;
    const normalized = (value - minY) / (maxY - minY);
    const y = pad.top + plotHeight - normalized * plotHeight;
    if (!hasPoint) {
      ctx.moveTo(x, y);
      hasPoint = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  if (hasPoint) {
    ctx.stroke();
  }
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
        { color: "#008c8c", label: "X" },
        { color: "#d28a00", label: "Y" },
        { color: "#2767c9", label: "Z" }
      ]
    : axes.map((axis) => ({ ...axis, label: axis.label.toUpperCase().replace("A", "") })),
    pad.left + 8,
    pad.top + 24,
    {
      swatchWidth: 30,
      swatchHeight: 6,
      textOffset: 38,
      itemSpacing: 86,
      font: "800 17px Segoe UI, Arial, sans-serif"
    });
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

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function rotateByGyroOrientation(point, orientation = state.gyroOrientation) {
  const roll = degreesToRadians(orientation.roll);
  const pitch = degreesToRadians(orientation.pitch);
  const yaw = degreesToRadians(orientation.yaw);
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);

  const yRoll = point.y * cosR - point.z * sinR;
  const zRoll = point.y * sinR + point.z * cosR;
  const xPitch = point.x * cosP + zRoll * sinP;
  const zPitch = -point.x * sinP + zRoll * cosP;
  const xYaw = xPitch * cosY - yRoll * sinY;
  const yYaw = xPitch * sinY + yRoll * cosY;

  return { x: xYaw, y: yYaw, z: zPitch };
}

function projectGyroPoint(point, centerX, centerY, scale) {
  return {
    x: centerX + (point.x - point.y) * scale * 0.76,
    y: centerY + (point.x + point.y) * scale * 0.30 - point.z * scale * 0.92
  };
}

function drawProjectedPolygon(points, fillStyle, strokeStyle, centerX, centerY, scale) {
  if (points.length < 3) {
    return;
  }
  const screenPoints = points.map((point) => projectGyroPoint(point, centerX, centerY, scale));
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  screenPoints.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawGyroArrow3d(endPoint, color, label, centerX, centerY, scale, rotate = true, alpha = 1) {
  const origin3d = rotate ? rotateByGyroOrientation({ x: 0, y: 0, z: 0 }) : { x: 0, y: 0, z: 0 };
  const end3d = rotate ? rotateByGyroOrientation(endPoint) : endPoint;
  const origin = projectGyroPoint(origin3d, centerX, centerY, scale);
  const end = projectGyroPoint(end3d, centerX, centerY, scale);
  const angle = Math.atan2(end.y - origin.y, end.x - origin.x);
  const head = 10;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = rotate ? 3 : 1.5;
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - head * Math.cos(angle - 0.45), end.y - head * Math.sin(angle - 0.45));
  ctx.lineTo(end.x - head * Math.cos(angle + 0.45), end.y - head * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.font = "700 13px Segoe UI, Arial, sans-serif";
  ctx.fillText(label, end.x + 7, end.y - 4);
  ctx.restore();
}

function drawGyroOrientationPlot() {
  if (!state.latestImu) {
    drawEmptyPlot("Waiting for gyro data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const compact = width < 700;
  const pad = compact
    ? { left: 18, right: 18, top: 18, bottom: 30 }
    : { left: 42, right: 42, top: 32, bottom: 38 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const centerX = pad.left + plotWidth / 2;
  const centerY = pad.top + plotHeight * (compact ? 0.56 : 0.58);
  const scale = Math.min(plotWidth, plotHeight) / (compact ? 4.8 : 4.1);
  const orientation = state.gyroOrientation;
  const sample = state.latestImu;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);

  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = "#eef3f7";
  ctx.lineWidth = 1;
  for (let index = -2; index <= 2; index++) {
    const a = projectGyroPoint({ x: index, y: -2, z: 0 }, centerX, centerY, scale);
    const b = projectGyroPoint({ x: index, y: 2, z: 0 }, centerX, centerY, scale);
    const c = projectGyroPoint({ x: -2, y: index, z: 0 }, centerX, centerY, scale);
    const d = projectGyroPoint({ x: 2, y: index, z: 0 }, centerX, centerY, scale);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
  ctx.restore();

  drawGyroArrow3d({ x: 1.8, y: 0, z: 0 }, GYRO_AXIS_COLORS.gx, "X", centerX, centerY, scale, false, 0.22);
  drawGyroArrow3d({ x: 0, y: 1.8, z: 0 }, GYRO_AXIS_COLORS.gy, "Y", centerX, centerY, scale, false, 0.22);
  drawGyroArrow3d({ x: 0, y: 0, z: 1.8 }, GYRO_AXIS_COLORS.gz, "Z", centerX, centerY, scale, false, 0.22);

  const top = [
    { x: -1.35, y: -0.78, z: 0.08 },
    { x: 1.35, y: -0.78, z: 0.08 },
    { x: 1.35, y: 0.78, z: 0.08 },
    { x: -1.35, y: 0.78, z: 0.08 }
  ].map((point) => rotateByGyroOrientation(point, orientation));
  const bottom = [
    { x: -1.35, y: -0.78, z: -0.08 },
    { x: 1.35, y: -0.78, z: -0.08 },
    { x: 1.35, y: 0.78, z: -0.08 },
    { x: -1.35, y: 0.78, z: -0.08 }
  ].map((point) => rotateByGyroOrientation(point, orientation));
  const module = [
    { x: -0.42, y: -0.28, z: 0.11 },
    { x: 0.42, y: -0.28, z: 0.11 },
    { x: 0.42, y: 0.28, z: 0.11 },
    { x: -0.42, y: 0.28, z: 0.11 }
  ].map((point) => rotateByGyroOrientation(point, orientation));

  drawProjectedPolygon(bottom, "#e8eef4", "#c8d3df", centerX, centerY, scale);
  drawProjectedPolygon(top, "#ffffff", "#17202a", centerX, centerY, scale);
  drawProjectedPolygon(module, "#eaf5f5", "#008c8c", centerX, centerY, scale);

  drawGyroArrow3d({ x: 1.9, y: 0, z: 0 }, GYRO_AXIS_COLORS.gx, "X", centerX, centerY, scale, true, 1);
  drawGyroArrow3d({ x: 0, y: 1.9, z: 0 }, GYRO_AXIS_COLORS.gy, "Y", centerX, centerY, scale, true, 1);
  drawGyroArrow3d({ x: 0, y: 0, z: 1.9 }, GYRO_AXIS_COLORS.gz, "Z", centerX, centerY, scale, true, 1);

  ctx.fillStyle = "#17202a";
  ctx.font = "700 13px Segoe UI, Arial, sans-serif";
  ctx.fillText(`roll ${orientation.roll.toFixed(1)} deg`, pad.left + 14, pad.top + 22);
  ctx.fillText(`pitch ${orientation.pitch.toFixed(1)} deg`, pad.left + 14, pad.top + 42);
  ctx.fillText(`yaw ${orientation.yaw.toFixed(1)} deg`, pad.left + 14, pad.top + 62);
  ctx.fillText(
    Number.isFinite(orientation.magHeading)
      ? `mag ${orientation.magHeading.toFixed(1)} deg / err ${Number.isFinite(orientation.magYawError) ? orientation.magYawError.toFixed(1) : "--"}`
      : "mag --",
    pad.left + 14,
    pad.top + 82
  );
  ctx.fillStyle = orientation.magCorrectionActive ? "#008c8c" : "#637083";
  ctx.font = "700 12px Segoe UI, Arial, sans-serif";
  ctx.fillText(
    state.settings.gyroMagCorrection ? "yaw correction: ON" : "yaw correction: OFF",
    pad.left + 14,
    pad.top + 101
  );

  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText(`gx ${formatGyroDps(sample.gx)} dps`, Math.max(pad.left + 150, width - pad.right - 230), pad.top + 22);
  ctx.fillText(`gy ${formatGyroDps(sample.gy)} dps`, Math.max(pad.left + 150, width - pad.right - 230), pad.top + 42);
  ctx.fillText(`gz ${formatGyroDps(sample.gz)} dps`, Math.max(pad.left + 150, width - pad.right - 230), pad.top + 62);
}

function drawClassificationInputWindowPlot(inputWindow, area) {
  const samples = inputWindow.frames;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(area.x, area.y, area.width, area.height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#17202a";
  ctx.font = "700 13px Segoe UI, Arial, sans-serif";
  ctx.fillText("Input data window", area.x + 12, area.y + 20);
  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  const seqText = inputWindow.first && inputWindow.latest
    ? `seq ${inputWindow.first.seq}-${inputWindow.latest.seq}`
    : "no IMU window";
  ctx.fillText(`${inputWindow.available}/${inputWindow.windowSize} ${inputWindow.sourceName} samples - ${seqText}`, area.x + 142, area.y + 20);

  const plotLeft = area.x + 42;
  const plotTop = area.y + 34;
  const plotWidth = Math.max(80, area.width - 58);
  const plotHeight = Math.max(60, area.height - 58);
  ctx.strokeStyle = "#eef3f7";
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = plotTop + (plotHeight * i) / 4;
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotLeft + plotWidth, y);
  }
  for (let i = 0; i <= 8; i++) {
    const x = plotLeft + (plotWidth * i) / 8;
    ctx.moveTo(x, plotTop);
    ctx.lineTo(x, plotTop + plotHeight);
  }
  ctx.stroke();
  ctx.strokeStyle = "#bdc8d5";
  ctx.strokeRect(plotLeft, plotTop, plotWidth, plotHeight);

  if (samples.length < 2) {
    ctx.fillStyle = "#637083";
    ctx.font = "13px Segoe UI, Arial, sans-serif";
    ctx.fillText("Waiting for enough IMU samples", plotLeft + 12, plotTop + 30);
    return;
  }

  const axes = [
    { key: inputWindow.keys.ax, label: "x", color: "#008c8c" },
    { key: inputWindow.keys.ay, label: "y", color: "#d28a00" },
    { key: inputWindow.keys.az, label: "z", color: "#2767c9" }
  ];
  const values = samples.flatMap((sample) => axes.map((axis) => sample[axis.key])).filter(Number.isFinite);
  const maxAbs = Math.max(0.25, ...values.map((value) => Math.abs(value)));
  const minY = -maxAbs;
  const maxY = maxAbs;

  for (const axis of axes) {
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = plotLeft + (plotWidth * index) / Math.max(1, samples.length - 1);
      const y = plotTop + plotHeight - ((sample[axis.key] - minY) / (maxY - minY)) * plotHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  ctx.fillStyle = "#637083";
  ctx.font = "11px Segoe UI, Arial, sans-serif";
  ctx.fillText(`+/-${maxAbs.toFixed(2)} ${getInputUnits()}`, plotLeft + 8, plotTop + 16);
  drawLegendOn(ctx, axes, plotLeft + 8, plotTop + plotHeight - 8);
}

function drawClassificationScoreBars(scores, area) {
  ctx.fillStyle = "#17202a";
  ctx.font = "700 13px Segoe UI, Arial, sans-serif";
  ctx.fillText("Inference scores", area.x + 12, area.y + 20);

  if (scores.length === 0) {
    ctx.fillStyle = "#637083";
    ctx.font = "14px Segoe UI, Arial, sans-serif";
    ctx.fillText(state.classification.active
      ? "Collecting inference window - first result takes about 2 s"
      : "Press Start + Class or Start Class to run inference", area.x + 12, area.y + 52);
    return;
  }

  const pad = {
    left: area.x + (area.width < 680 ? 112 : 170),
    right: area.x + area.width - 20,
    top: area.y + 32,
    bottom: area.y + area.height - 10
  };
  const rowHeight = Math.min(30, (pad.bottom - pad.top) / scores.length);
  const barWidth = Math.max(80, pad.right - pad.left);

  ctx.font = "12px Segoe UI, Arial, sans-serif";
  scores.forEach((score, index) => {
    const y = pad.top + index * rowHeight;
    const percent = Math.max(0, Math.min(1, score.value));
    ctx.fillStyle = "#637083";
    const label = score.label.length > 22 ? `${score.label.slice(0, 21)}...` : score.label;
    ctx.fillText(label, area.x + 12, y + rowHeight * 0.62);
    ctx.fillStyle = "#eef3f7";
    ctx.fillRect(pad.left, y + 7, barWidth, Math.max(8, rowHeight - 14));
    ctx.fillStyle = index === 0 ? "#008c8c" : "#2767c9";
    ctx.fillRect(pad.left, y + 7, barWidth * percent, Math.max(8, rowHeight - 14));
    ctx.fillStyle = "#17202a";
    ctx.fillText(`${(percent * 100).toFixed(1)}%`, pad.left + 8, y + rowHeight * 0.62);
  });
}

function drawClassificationPlot() {
  const scores = [...(state.classification.scores || [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const inputWindow = getClassificationInputWindow();
  const { width, height } = resizeCanvasToDisplaySize();
  const gap = 14;
  const inputHeight = Math.max(168, Math.round(height * 0.52));
  const scoreHeight = Math.max(112, height - inputHeight - gap - 24);
  const areaX = 16;
  const areaWidth = width - 32;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);

  drawClassificationInputWindowPlot(inputWindow, {
    x: areaX,
    y: 16,
    width: areaWidth,
    height: inputHeight
  });
  drawClassificationScoreBars(scores, {
    x: areaX,
    y: 16 + inputHeight + gap,
    width: areaWidth,
    height: scoreHeight
  });
}

function drawLegend(items, x, y, options = {}) {
  drawLegendOn(ctx, items, x, y, options);
}

function drawLegendOn(targetCtx, items, x, y, options = {}) {
  const swatchWidth = options.swatchWidth ?? 16;
  const swatchHeight = options.swatchHeight ?? 3;
  const textOffset = options.textOffset ?? 20;
  const font = options.font ?? "12px Segoe UI, Arial, sans-serif";
  const itemSpacing = options.itemSpacing ?? 58;
  let offsetX = x;
  items.forEach((item) => {
    targetCtx.fillStyle = item.color;
    targetCtx.fillRect(offsetX, y - 11, swatchWidth, swatchHeight);
    targetCtx.fillStyle = "#637083";
    targetCtx.font = font;
    targetCtx.fillText(item.label, offsetX + textOffset, y - 4);
    offsetX += Math.max(itemSpacing, textOffset + item.label.length * 10 + 18);
  });
}

async function applyAcquisition() {
  state.settings.channel = normalizeNumber(el.channelSelect.value, 0, 0, 7);
  state.settings.rateHz = normalizeNumber(el.rateInput.value, 100, 1, 1000);
  state.settings.resolution = normalizeNumber(el.resolutionSelect.value, 12, 10, 12);
  updateAdcWindowInputFromSamples(state.settings.window);
  resetAdcDspState();

  await sendCommand(`STOP`);
  await sendCommand(`RES ${state.settings.resolution}`);
  await sendCommand(`CH ${state.settings.channel}`);
  await sendCommand(`RATE ${state.settings.rateHz}`);
}

async function applyFilter() {
  const params = syncDspSettingsFromControls({ writeBack: true });
  const protocol = resolveDspProtocol();
  resetAdcDspState();

  if (protocol === "DAY2_IIR") {
    await sendCommand(`RATE ${params.sampleRateHz.toFixed(1)}`);
    await sendCommand(`MODE ${day2IirModeName(params.mode)}`);
    await sendCommand(`ORDER ${params.order}`);
    await sendCommand(`LOW ${params.lowHz.toFixed(3)}`);
    await sendCommand(`HIGH ${params.highHz.toFixed(3)}`);
  } else {
    await sendCommand(`FILTER ${state.settings.filter}`);
    await sendCommand(`ALPHA ${state.settings.alpha.toFixed(3)}`);
    await sendCommand(`WINDOW ${state.settings.window}`);
    if (state.settings.filter.startsWith("IIR_")) {
      await sendCommand(`IIRORDER ${state.settings.iirOrder}`);
      await sendCommand(`IIRHIGH ${state.settings.iirHighHz.toFixed(3)}`);
      await sendCommand(`IIRLOW ${state.settings.iirLowHz.toFixed(3)}`);
    }
  }

  if (state.ppg.source === "Live ADC") {
    clearLivePpgWindow(state.settings.filter === "RAW" ? "raw" : "filtered");
  }
  updateFilterStateText();
  renderDspPanel({ writeBack: true });
  reprocessAdcClientDspBuffers();
  logLine(`DSP_APPLY,protocol=${protocol},mode=${params.mode},order=${params.order},low=${params.lowHz.toFixed(3)},high=${params.highHz.toFixed(3)}`);
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
  if (state.connectionMode === "ble") {
    state.streaming = true;
    state.classification.startPending = false;
    logLine(`BLE_START,device=${BLE_ADC_DEVICE_NAME},sample_rate=32`);
    setUiEnabled();
    return;
  }

  if (state.activeView === "classification") {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 500);
    applyInputPreprocess();
    state.classification.startPending = true;
    renderClassification();
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("CLS ON");
    await sendCommand("START");
    return;
  }

  if (state.activeView === "ppg") {
    await applyAcquisition();
    await applyFilter();
    await sendCommand("START");
    return;
  }

  if (state.activeView !== "adc") {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 500);
    if (INPUT_SETTINGS_VIEWS.has(state.activeView)) {
      applyInputPreprocess();
    }
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("START");
    return;
  }

  await applyAcquisition();
  await applyFilter();
  await sendCommand("START");
}

async function stopStreaming() {
  if (state.connectionMode === "ble") {
    state.streaming = false;
    logLine("BLE_STOP");
    setUiEnabled();
    return;
  }

  if (state.activeView === "classification") {
    await sendCommand("CLS OFF");
  }
  await sendCommand("STOP");
}

function clearData() {
  state.samples = [];
  state.adcFormatCounts = Object.fromEntries(ADC_FORMATS.map((format) => [format, 0]));
  state.adcSyntheticSeq = 0;
  resetAdcDspState();
  state.imuSamples = [];
  state.imuProcessedSamples = [];
  state.records = [];
  state.tableRows = [];
  state.latestSample = null;
  state.latestImu = null;
  state.latestProcessedImu = null;
  resetGyroOrientation();
  if (state.ppg.source === "Live ADC") {
    clearLivePpgWindow(state.settings.filter === "RAW" ? "raw" : "filtered");
  }
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
  updateAdcFormatState();
  updateTable();
  drawPlot();
  setUiEnabled();
}

function toggleRecording() {
  state.recording = !state.recording;
  setUiEnabled();
}

async function startClassification() {
  if (state.connectionMode === "ble") {
    logLine("ERR,class_ble_unsupported");
    return;
  }
  state.classification.startPending = true;
  renderClassification();
  setUiEnabled();
  await sendCommand("CLS ON");
}

async function stopClassification() {
  if (state.connectionMode === "ble") {
    state.classification.startPending = false;
    state.classification.active = false;
    renderClassification();
    setUiEnabled();
    return;
  }
  state.classification.startPending = false;
  state.classification.active = false;
  renderClassification();
  await sendCommand("CLS OFF");
}

function exportCsv() {
  const header = [
    "label",
    "type",
    "format",
    "format_detail",
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
    csvCell(row.format || ""),
    csvCell(row.formatDetail || ""),
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
  el.bleConnectButton.addEventListener("click", connectBleDevice);
  el.bleDisconnectButton.addEventListener("click", disconnectBleDevice);
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
  if (el.ppgLoadSampleButton) {
    el.ppgLoadSampleButton.addEventListener("click", loadBundledPpgCsv);
  }
  if (el.ppgAnalyzeButton) {
    el.ppgAnalyzeButton.addEventListener("click", () => {
      try {
        runPpgAnalysis();
      } catch (error) {
        state.ppg.error = error.message;
        el.ppgStatus.textContent = "Analyze failed";
        logLine(`ERR,ppg_analyze,${error.message}`);
        renderPpgView();
      } finally {
        setUiEnabled();
      }
    });
  }
  if (el.ppgFileInput) {
    el.ppgFileInput.addEventListener("change", importPpgCsv);
  }
  [el.ppgSampleRateInput, el.ppgStartInput, el.ppgDurationInput, el.ppgRefractoryInput].filter(Boolean).forEach((node) => {
    node.addEventListener("change", () => {
      if (state.ppg.samples.length > 0) {
        try {
          runPpgAnalysis({ silent: state.ppg.source === "Live ADC" });
        } catch (error) {
          state.ppg.analysis = null;
          state.ppg.error = error.message;
          el.ppgStatus.textContent = "Analyze failed";
          logLine(`ERR,ppg_analyze,${error.message}`);
          renderPpgView();
        }
      } else {
        renderPpgView();
      }
      setUiEnabled();
    });
  });
  el.ppgThresholdInput.addEventListener("input", () => {
    el.ppgThresholdOutput.textContent = Number(el.ppgThresholdInput.value).toFixed(2);
  });
  el.ppgThresholdInput.addEventListener("change", () => {
    if (state.ppg.samples.length > 0) {
      try {
        runPpgAnalysis({ silent: state.ppg.source === "Live ADC" });
      } catch (error) {
        state.ppg.analysis = null;
        state.ppg.error = error.message;
        el.ppgStatus.textContent = "Analyze failed";
        logLine(`ERR,ppg_analyze,${error.message}`);
        renderPpgView();
      }
    }
    setUiEnabled();
  });
  [el.datasetWindowInput, el.datasetStrideInput, el.datasetFeatureSelect, el.datasetSourceSelect].forEach((node) => {
    node.addEventListener("input", () => {
      renderDatasetView();
      renderModelView();
      setUiEnabled();
    });
    node.addEventListener("change", () => {
      renderDatasetView();
      renderModelView();
      setUiEnabled();
    });
  });
  [el.hiddenLayerInput, el.neuronInput].forEach((node) => {
    node.addEventListener("input", renderModelView);
    node.addEventListener("change", renderModelView);
  });
  el.trainModelButton.addEventListener("click", trainBrowserModel);
  el.exportModelJsonButton.addEventListener("click", exportModelJson);
  el.exportCArrayButton.addEventListener("click", exportCArray);
  el.pingButton.addEventListener("click", () => sendCommand("PING"));
  el.classStartButton.addEventListener("click", startClassification);
  el.classStopButton.addEventListener("click", stopClassification);
  el.recordButton.addEventListener("click", toggleRecording);
  el.clearButton.addEventListener("click", clearData);
  el.exportButton.addEventListener("click", exportCsv);
  el.flashButton.addEventListener("click", flashFirmware);
  el.bootloaderButton.addEventListener("click", enterBootloaderDirect);
  el.exitBootloaderButton.addEventListener("click", exitBootloaderDirect);
  el.refreshHelperButton.addEventListener("click", () => refreshHelperStatus());
  el.helperPortSelect.addEventListener("change", () => {
    state.flash.helper.selectedPort = getSelectedHelperPort();
    setUiEnabled();
  });
  el.showRawToggle.addEventListener("change", drawPlot);
  el.showFilteredToggle.addEventListener("change", drawPlot);
  el.autoScaleToggle.addEventListener("change", drawPlot);
  if (el.adcPlotModeSelect) {
    el.adcPlotModeSelect.addEventListener("change", () => {
      syncAdcPlotSettings();
      drawPlot();
    });
  }
  if (el.gyroMagCorrectionToggle) {
    state.settings.gyroMagCorrection = el.gyroMagCorrectionToggle.checked;
    el.gyroMagCorrectionToggle.addEventListener("change", () => {
      state.settings.gyroMagCorrection = el.gyroMagCorrectionToggle.checked;
      drawPlot();
      updateCurrentMetrics();
    });
  }
  if (el.gyroResetButton) {
    el.gyroResetButton.addEventListener("click", () => {
      resetGyroOrientation();
      drawPlot();
      updateCurrentMetrics();
    });
  }
  [el.filterSelect, el.dspProtocolSelect, el.alphaInput, el.windowInput, el.iirOrderInput, el.iirLowInput, el.iirHighInput, el.rateInput]
    .filter(Boolean)
    .forEach((node) => {
      const updateDspPreview = () => {
        el.alphaOutput.textContent = Number(el.alphaInput.value).toFixed(3);
        renderDspPanel();
      };
      node.addEventListener("input", updateDspPreview);
      node.addEventListener("change", () => renderDspPanel({ writeBack: true }));
    });
  if (el.windowSliderInput) {
    el.windowSliderInput.addEventListener("input", () => {
      updateAdcWindowInputFromSamples(el.windowSliderInput.value);
    });
    el.windowSliderInput.addEventListener("change", () => renderDspPanel({ writeBack: true }));
  }
  for (const tab of el.viewTabs) {
    tab.addEventListener("click", () => setActiveView(tab.dataset.view));
  }
  window.addEventListener("resize", handleWorkspaceWindowResize);
  el.alphaInput.addEventListener("input", () => {
    el.alphaOutput.textContent = Number(el.alphaInput.value).toFixed(3);
    renderDspPanel();
  });
  el.inputAlphaInput.addEventListener("input", () => {
    el.inputAlphaOutput.textContent = Number(el.inputAlphaInput.value).toFixed(3);
  });
  el.pruningInput.addEventListener("input", () => {
    el.pruningOutput.textContent = `${(Number(el.pruningInput.value) * 100).toFixed(0)}%`;
  });
}

function init() {
  const serialReady = "serial" in navigator;
  const bleReady = "bluetooth" in navigator;
  if (serialReady && bleReady) {
    setStatus(el.browserStatus, "Serial / BLE ready", "");
  } else if (serialReady) {
    setStatus(el.browserStatus, "Web Serial ready", "");
  } else if (bleReady) {
    setStatus(el.browserStatus, "Web BLE ready", "");
  } else {
    setStatus(el.browserStatus, "Browser APIs unavailable", "error");
  }
  setStatus(el.bleStatus, bleReady ? "BLE ready" : "BLE unavailable", bleReady ? "muted" : "error");
  populateFirmwareSelect(DEFAULT_PREBUILT_FIRMWARES);
  bindEvents();
  initWorkspaceResizers();
  updateAdcWindowInputFromSamples(state.settings.window);
  syncAdcPlotSettings();
  renderDspPanel({ writeBack: true });
  applyInputPreprocess();
  updateViewVisibility();
  renderDatasetView();
  renderModelView();
  setUiEnabled();
  renderClassification();
  renderDeviceLog();
  drawPlot();
  loadDirectFirmwareManifest();
  refreshHelperStatus({ silent: true });
}

init();
