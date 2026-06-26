const REF193_V = 3.0;
const REF194_V = 4.5;
const A_GAIN = -6.0;
const TIA_RESISTANCE_OHM = 1_000_000.0;
const SAADC_INPUT_RANGE_V = 1.2;
const SAADC_FULL_SCALE_RAW = 16383;
const DAC_MAX_CODE = 4095;
const DAC_OUTPUT_MIN_MV = -16500;
const DAC_OUTPUT_MAX_MV = 16500;
const POT_MAX_CODE = 255;
const ADC_TIA_COUNT = 8;
const ADC_AVG_MAX = 4096;
const SWEEP_POINT_REPEATS_MAX = 64;
const MAX_DEVICES_PER_TIA = 4;
const MEASUREMENT_TABLE_ROW_LIMIT = 1000;
const MEASUREMENT_MEMORY_ROW_LIMIT = 20000;
const MEASUREMENT_MEMORY_TRIM_BATCH = 1000;
const EXPORT_WORKBOOK_POINT_LIMIT = 120000;
const EXPORT_CSV_CHUNK_POINT_LIMIT = 200000;
const STREAM_EXPORT_POINT_THRESHOLD = EXPORT_WORKBOOK_POINT_LIMIT;
const STREAM_EXPORT_CHUNK_POINT_LIMIT = 50000;
const SWEEP_RETAIN_POINT_LIMIT = 50000;
const EXPORT_DOWNLOAD_DELAY_MS = 250;
const PLOT_POINT_RENDER_LIMIT = 20000;
const SWEEP_RENDER_INTERVAL_MS = 150;
const SWEEP_STATUS_INTERVAL_MS = 250;
const WEB_VERSION = "2026-06-21-d15d16-adc7-cal";
const EXPECTED_FIRMWARE_VERSION = "2026-06-15-dacramp-noise";
const EXPECTED_FIRMWARE_PROTOCOL = "sx-b32-avg-settle-pair-gate-device-dac-time-dfu-adc1v2-v1";
const APP_VERSION = WEB_VERSION;
window.PCB_GAUSSIAN_ADC_AVG_MAX = ADC_AVG_MAX;
const BASE32_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
const FIRMWARE_SWEEP_RE = /^(SWEEP|SX|Y),/i;
const DEVICE_TO_MUX_ADDR = [0, 1, 2, 3, 4, 5, 6, 7, 1, 0, 3, 2, 5, 4, 7, 6];
// Bench notes use 0-based TIA/device numbers. GUI and firmware commands use 1-based device labels.
const TIA_DEVICE_MAP = [
  [5, 6, 7, 8],     // TIA0: hardware dev4-dev7
  [1, 2, 3, 4],     // TIA1: hardware dev0-dev3
  [],               // TIA2: unused in 4-TIA GMM wiring
  [],               // TIA3: unused in 4-TIA GMM wiring
  [9, 10, 11, 12],  // TIA4: hardware dev8-dev11
  [13, 14],         // TIA5: hardware dev12-dev13
  [],               // TIA6: unused in 4-TIA GMM wiring
  [15, 16],         // TIA7: restored D15/D16 circuit, opposite current polarity
];
const DAC_CAL_STORAGE_KEY = "pcbGaussian.dacCalibration.v1";
const DAC_CAL_VOLTAGES = [-16.5, -15, -10, -5, 0, 5, 10, 15, 16.5];
const DEFAULT_DAC_CAL = {
  D1: [
    { voltage: -16.5, code: 0 },
    { voltage: -15, code: 187 },
    { voltage: -10, code: 782 },
    { voltage: -5, code: 1378 },
    { voltage: 0, code: 1972 },
    { voltage: 5, code: 2564 },
    { voltage: 10, code: 3156 },
    { voltage: 15, code: 3750 },
    { voltage: 16.5, code: 4095 },
  ],
  D2: [
    { voltage: -16.5, code: 0 },
    { voltage: -15, code: 177 },
    { voltage: -10, code: 770 },
    { voltage: -5, code: 1365 },
    { voltage: 0, code: 1958 },
    { voltage: 5, code: 2551 },
    { voltage: 10, code: 3144 },
    { voltage: 15, code: 3740 },
    { voltage: 16.5, code: 4095 },
  ],
};
const PARAM_CAL_STORAGE_KEY = "pcbGaussian.parameterCalibration.inverted.v2";
const DEVICE_PARAM_CAL_STORAGE_KEY = "pcbGaussian.deviceParameterCalibration.d15d16.v1";
const ADC_BASELINE_STORAGE_KEY = "pcbGaussian.adcBaseline.1v03.v2";
const PARAM_CAL_CODES = [0, 30, 60, 90, 120, 150, 180, 210, 255];
const DEFAULT_ADC_ZERO_CURRENT_V = 1.03;
const PROGRAM_REPLY_TIMEOUT_MS = 1500;
const PLOT_COLORS = ["#2a9d8f", "#d1495b", "#457b9d", "#f4a261", "#7b2cbf", "#2f6f4e", "#e76f51", "#264653"];
const ADC_LABELS = Array.from({ length: ADC_TIA_COUNT }, (_, idx) => `ADC${idx}`);
const DEVICE_CAL_DAC_BY_ADC = ["D2", "D2", "D2", "D2", "D1", "D1", "D1", "D1"];
const DEVICE_CAL_LUT_STORAGE_KEY = "pcbGaussian.deviceCalLut.v1";
const DEVICE_CAL_LUT_ROW_LIMIT = 20000;
const SPECIAL_PARAM_CAL_DEVICES = new Set([15, 16]);
const ADC_CURRENT_NON_INVERTED = new Set([7]);
// Current jumper map from bench wiring. Each active ADC/TIA sums four devices.
const ADC_DEVICE_MAP = [[5, 6, 7, 8], [1, 2, 3, 4], [], [], [9, 10, 11, 12], [13, 14], [], [15, 16]];
const PLOT_CONFIGS = {
  D1: {
    title: "DAC1",
    canvasId: "sweepPlotCanvasD1",
    legendId: "plotD1Legend",
    statusId: "plotD1Status",
    filterId: "plotD1AdcFilters",
    defaultAdcs: [4, 5, 7],
  },
  D2: {
    title: "DAC2",
    canvasId: "sweepPlotCanvasD2",
    legendId: "plotD2Legend",
    statusId: "plotD2Status",
    filterId: "plotD2AdcFilters",
    defaultAdcs: [0, 1],
  },
};
const A_CAL_POINTS = [
  { code: 0, voltage: 0.0420 },
  { code: 30, voltage: 1.5466 },
  { code: 60, voltage: 3.0512 },
  { code: 90, voltage: 4.5557 },
  { code: 120, voltage: 6.0603 },
  { code: 150, voltage: 7.5649 },
  { code: 180, voltage: 9.0695 },
  { code: 210, voltage: 10.5741 },
  { code: 255, voltage: 12.8309 },
];
const MU_CAL_POINTS = [
  { code: 0, voltage: 0.0160 },
  { code: 30, voltage: 0.7150 },
  { code: 60, voltage: 1.4100 },
  { code: 90, voltage: 2.1000 },
  { code: 120, voltage: 2.7900 },
  { code: 150, voltage: 3.4900 },
  { code: 180, voltage: 4.1700 },
  { code: 210, voltage: 4.8900 },
  { code: 255, voltage: 5.9800 },
];

const $ = id => document.getElementById(id);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
function nowTime() {
  const date = new Date();
  const pad2 = value => String(value).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${ms}`;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function dacCodeToVDac(code) {
  return REF194_V * clamp(Number(code) || 0, 0, DAC_MAX_CODE) / DAC_MAX_CODE;
}
function interpolate(x, x0, y0, x1, y1) {
  if (x1 === x0) return y0;
  return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}
function cloneDacCalibration(source = DEFAULT_DAC_CAL) {
  return {
    D1: source.D1.map(point => ({ voltage: point.voltage, code: point.code })),
    D2: source.D2.map(point => ({ voltage: point.voltage, code: point.code })),
  };
}
function sanitizeDacCalibration(source) {
  const fallback = cloneDacCalibration();
  const result = { D1: [], D2: [] };
  for (const dac of ["D1", "D2"]) {
    for (const voltage of DAC_CAL_VOLTAGES) {
      const saved = source?.[dac]?.find(point => Number(point.voltage) === voltage);
      const fallbackPoint = fallback[dac].find(point => point.voltage === voltage);
      const code = Number.isFinite(Number(saved?.code)) ? Number(saved.code) : fallbackPoint.code;
      result[dac].push({ voltage, code: clamp(Math.round(code), 0, DAC_MAX_CODE) });
    }
  }
  return result;
}
function loadDacCalibration() {
  try {
    const saved = localStorage.getItem(DAC_CAL_STORAGE_KEY);
    return saved ? sanitizeDacCalibration(JSON.parse(saved)) : cloneDacCalibration();
  } catch {
    return cloneDacCalibration();
  }
}
function persistDacCalibration() {
  try {
    localStorage.setItem(DAC_CAL_STORAGE_KEY, JSON.stringify(state.dacCal));
    return true;
  } catch (error) {
    logLine(`[storage error] DAC calibration not saved: ${error.message}`);
    return false;
  }
}
function getDacCalPoints(dac) {
  return (state.dacCal?.[dac] || DEFAULT_DAC_CAL[dac] || DEFAULT_DAC_CAL.D1)
    .map(point => ({ voltage: Number(point.voltage), code: clamp(Math.round(Number(point.code)), 0, DAC_MAX_CODE) }));
}
function interpolatePointList(x, points, xKey, yKey) {
  const sorted = points.slice().sort((a, b) => a[xKey] - b[xKey]);
  if (x <= sorted[0][xKey]) return sorted[0][yKey];
  const last = sorted[sorted.length - 1];
  if (x >= last[xKey]) return last[yKey];
  for (let i = 1; i < sorted.length; i++) {
    if (x <= sorted[i][xKey]) {
      return interpolate(x, sorted[i - 1][xKey], sorted[i - 1][yKey], sorted[i][xKey], sorted[i][yKey]);
    }
  }
  return last[yKey];
}
function dacCodeToVhigh(dac, code) {
  const safeCode = clamp(Number(code) || 0, 0, DAC_MAX_CODE);
  return interpolatePointList(safeCode, getDacCalPoints(dac), "code", "voltage");
}
function vhighToDacCode(dac, vhigh) {
  const points = getDacCalPoints(dac);
  const voltages = points.map(point => point.voltage);
  const safeV = clamp(Number(vhigh) || 0, Math.min(...voltages), Math.max(...voltages));
  return clamp(Math.round(interpolatePointList(safeV, points, "voltage", "code")), 0, DAC_MAX_CODE);
}
function vdacToDacCode(vdac) {
  return clamp(Math.round(clamp(Number(vdac) || 0, 0, REF194_V) / REF194_V * DAC_MAX_CODE), 0, DAC_MAX_CODE);
}
function potCodeToVWiper(code) {
  return REF193_V * clamp(Number(code) || 0, 0, POT_MAX_CODE) / POT_MAX_CODE;
}
function piecewiseCodeToVoltage(points, code) {
  const safeCode = clamp(Number(code) || 0, 0, POT_MAX_CODE);
  if (safeCode <= points[0].code) return points[0].voltage;
  for (let i = 1; i < points.length; i++) {
    if (safeCode <= points[i].code) {
      return interpolate(safeCode, points[i - 1].code, points[i - 1].voltage, points[i].code, points[i].voltage);
    }
  }
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  return interpolate(safeCode, a.code, a.voltage, b.code, b.voltage);
}
function piecewiseVoltageToCode(points, voltage) {
  const minV = points[0].voltage;
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const maxV = interpolate(POT_MAX_CODE, prev.code, prev.voltage, last.code, last.voltage);
  const safeV = clamp(Number(voltage) || 0, minV, maxV);
  if (safeV <= points[0].voltage) return points[0].code;
  for (let i = 1; i < points.length; i++) {
    if (safeV <= points[i].voltage) {
      return clamp(Math.round(interpolate(safeV, points[i - 1].voltage, points[i - 1].code, points[i].voltage, points[i].code)), 0, POT_MAX_CODE);
    }
  }
  return clamp(Math.round(interpolate(safeV, prev.voltage, prev.code, last.voltage, last.code)), 0, POT_MAX_CODE);
}
function defaultLogicalAVoltage(code) {
  return piecewiseCodeToVoltage(A_CAL_POINTS, code);
}
function defaultLogicalMuVoltage(code) {
  return piecewiseCodeToVoltage(MU_CAL_POINTS, code);
}
function linearParamCalPoints(startVoltage, stopVoltage) {
  return PARAM_CAL_CODES.map(code => ({
    code,
    voltage: startVoltage + (stopVoltage - startVoltage) * code / POT_MAX_CODE,
  }));
}
function cloneParamCalibration(source = null) {
  const base = source || {
    A: PARAM_CAL_CODES.map(code => ({ code, voltage: defaultLogicalAVoltage(code) })),
    mu: PARAM_CAL_CODES.map(code => ({ code, voltage: defaultLogicalMuVoltage(code) })),
  };
  return {
    A: PARAM_CAL_CODES.map(code => {
      const point = base.A?.find(item => Number(item.code) === code);
      return { code, voltage: Number.isFinite(Number(point?.voltage)) ? Number(point.voltage) : defaultLogicalAVoltage(code) };
    }),
    mu: PARAM_CAL_CODES.map(code => {
      const point = base.mu?.find(item => Number(item.code) === code);
      return { code, voltage: Number.isFinite(Number(point?.voltage)) ? Number(point.voltage) : defaultLogicalMuVoltage(code) };
    }),
  };
}
function defaultDeviceParamCalibration() {
  const special = {
    A: linearParamCalPoints(0, -9.9),
    mu: linearParamCalPoints(0.016, 6.0),
  };
  return {
    D15: cloneParamCalibration(special),
    D16: cloneParamCalibration(special),
  };
}
function deviceParamProfileKey(device) {
  const dev = Math.round(Number(device) || 0);
  return SPECIAL_PARAM_CAL_DEVICES.has(dev) ? `D${dev}` : "";
}
function paramCalProfileKey() {
  const value = $("paramCalProfile")?.value || "default";
  return value === "D15" || value === "D16" ? value : "default";
}
function sanitizeParamCalibration(source) {
  return cloneParamCalibration(source);
}
function sanitizeDeviceParamCalibration(source) {
  const fallback = defaultDeviceParamCalibration();
  const result = {};
  for (const key of ["D15", "D16"]) {
    result[key] = cloneParamCalibration(source?.[key] || fallback[key]);
  }
  return result;
}
function loadParamCalibration() {
  try {
    const saved = localStorage.getItem(PARAM_CAL_STORAGE_KEY);
    return saved ? sanitizeParamCalibration(JSON.parse(saved)) : cloneParamCalibration();
  } catch {
    return cloneParamCalibration();
  }
}
function loadDeviceParamCalibration() {
  try {
    const saved = localStorage.getItem(DEVICE_PARAM_CAL_STORAGE_KEY);
    return saved ? sanitizeDeviceParamCalibration(JSON.parse(saved)) : defaultDeviceParamCalibration();
  } catch {
    return defaultDeviceParamCalibration();
  }
}
function persistParamCalibration() {
  try {
    localStorage.setItem(PARAM_CAL_STORAGE_KEY, JSON.stringify(state.paramCal));
    return true;
  } catch (error) {
    logLine(`[storage error] Vstart / mu calibration not saved: ${error.message}`);
    return false;
  }
}
function persistDeviceParamCalibration() {
  try {
    localStorage.setItem(DEVICE_PARAM_CAL_STORAGE_KEY, JSON.stringify(state.deviceParamCal));
    return true;
  } catch (error) {
    logLine(`[storage error] D15/D16 Vstart / mu calibration not saved: ${error.message}`);
    return false;
  }
}
function paramCalibrationForDevice(device = null) {
  const key = deviceParamProfileKey(device);
  if (key) return state?.deviceParamCal?.[key] || defaultDeviceParamCalibration()[key];
  return state?.paramCal || cloneParamCalibration();
}
function getParamCalPoints(param, device = null) {
  const cal = paramCalibrationForDevice(device);
  return (cal?.[param] || cloneParamCalibration()[param])
    .map(point => ({ code: clamp(Math.round(Number(point.code)), 0, POT_MAX_CODE), voltage: Number(point.voltage) }));
}
function paramCodeToVoltage(param, code, device = null) {
  return interpolatePointList(clamp(Number(code) || 0, 0, POT_MAX_CODE), getParamCalPoints(param, device), "code", "voltage");
}
function paramVoltageToCode(param, voltage, device = null) {
  const points = getParamCalPoints(param, device).filter(point => Number.isFinite(point.voltage));
  const voltages = points.map(point => point.voltage);
  const safeV = clamp(Number(voltage) || 0, Math.min(...voltages), Math.max(...voltages));
  return clamp(Math.round(interpolatePointList(safeV, points, "voltage", "code")), 0, POT_MAX_CODE);
}
function potCodeToAVoltage(code, device = null) {
  return paramCodeToVoltage("A", code, device);
}
function potCodeToMuVoltage(code, device = null) {
  return paramCodeToVoltage("mu", code, device);
}
function aVoltageToCode(voltage, device = null) {
  return paramVoltageToCode("A", voltage, device);
}
function potCodeToVstartVoltage(code, device = null) {
  return potCodeToAVoltage(code, device);
}
function vstartVoltageToCode(voltage, device = null) {
  return aVoltageToCode(voltage, device);
}
function muVoltageToCode(voltage, device = null) {
  return paramVoltageToCode("mu", voltage, device);
}
function adcRawToVoltage(raw) {
  return Number(raw) * SAADC_INPUT_RANGE_V / SAADC_FULL_SCALE_RAW;
}
function defaultAdcInvert(adcIndex, globalInvert = true) {
  return !!globalInvert && !ADC_CURRENT_NON_INVERTED.has(clamp(Math.round(Number(adcIndex) || 0), 0, ADC_TIA_COUNT - 1));
}
function cloneAdcBaselineConfig(source = null) {
  const globalInvert = source?.invertCurrent !== false;
  const zeroVoltages = Array.from({ length: ADC_TIA_COUNT }, (_, idx) => {
    const value = Number(source?.zeroVoltages?.[idx]);
    return Number.isFinite(value) ? clamp(value, 0, SAADC_INPUT_RANGE_V) : DEFAULT_ADC_ZERO_CURRENT_V;
  });
  const invertByAdc = Array.from({ length: ADC_TIA_COUNT }, (_, idx) => {
    const saved = source?.invertByAdc?.[idx];
    return typeof saved === "boolean" ? saved : defaultAdcInvert(idx, globalInvert);
  });
  return {
    zeroVoltages,
    invertCurrent: globalInvert,
    invertByAdc,
  };
}
function loadAdcBaselineConfig() {
  try {
    const saved = localStorage.getItem(ADC_BASELINE_STORAGE_KEY);
    return saved ? cloneAdcBaselineConfig(JSON.parse(saved)) : cloneAdcBaselineConfig();
  } catch {
    return cloneAdcBaselineConfig();
  }
}
function persistAdcBaselineConfig() {
  try {
    localStorage.setItem(ADC_BASELINE_STORAGE_KEY, JSON.stringify(state.adcBaseline));
    return true;
  } catch (error) {
    logLine(`[storage error] ADC baseline not saved: ${error.message}`);
    return false;
  }
}
function adcZeroVoltage(adcIndex = 0) {
  const idx = clamp(Math.round(Number(adcIndex) || 0), 0, ADC_TIA_COUNT - 1);
  const value = Number(state?.adcBaseline?.zeroVoltages?.[idx]);
  return Number.isFinite(value) ? value : DEFAULT_ADC_ZERO_CURRENT_V;
}
function adcCurrentInverted(adcIndex = 0) {
  const idx = clamp(Math.round(Number(adcIndex) || 0), 0, ADC_TIA_COUNT - 1);
  if (state?.adcBaseline?.invertCurrent === false) return false;
  const perAdc = state?.adcBaseline?.invertByAdc?.[idx];
  return typeof perAdc === "boolean" ? perAdc : defaultAdcInvert(idx, true);
}
function adcBaselineFormulaText(adcIndex = 0) {
  return adcCurrentInverted(adcIndex) ? "I = (zero - V_AIN) / Rf" : "I = (V_AIN - zero) / Rf";
}
function adcVoltageToCurrentUa(voltage, adcIndex = 0) {
  const measured = Number(voltage);
  if (!Number.isFinite(measured)) return NaN;
  const zero = adcZeroVoltage(adcIndex);
  const delta = adcCurrentInverted(adcIndex) ? zero - measured : measured - zero;
  return delta / TIA_RESISTANCE_OHM * 1_000_000.0;
}function deviceMuxInfo(device) {
  const dev = clamp(Math.round(Number(device) || 1), 1, 16);
  const addr = DEVICE_TO_MUX_ADDR[dev - 1];
  return {
    device: dev,
    group: dev <= 8 ? "SE" : "SE1",
    addr,
    SA: addr & 1,
    SB: (addr >> 1) & 1,
    SC: (addr >> 2) & 1,
    cs: `CS_${dev}`,
  };
}

const state = {
  port: null,
  reader: null,
  writer: null,
  keepReading: false,
  connected: false,
  lineBuffer: "",
  deviceStates: Array.from({ length: 17 }, () => ({ a: 0, mu: 0 })),
  dacCodes: { D1: 0, D2: 0 },
  dacCal: loadDacCalibration(),
  paramCal: loadParamCalibration(),
  deviceParamCal: loadDeviceParamCalibration(),
  adcBaseline: loadAdcBaselineConfig(),
  tiaStates: Array.from({ length: ADC_TIA_COUNT }, (_, i) => ({
    enabled: [0, 1, 4, 5, 7].includes(i),
    adc: `AIN${i}`,
    devices: (TIA_DEVICE_MAP[i] || []).map(String),
    jumper: "",
  })),
  measurements: [],
  commandLog: [],
  pendingReplies: [],
  pendingAdcContext: null,
  firmwareSweepSelectedTias: null,
  activeSweep: null,
  lastSweep: null,
  lastBracket: null,
  bracketRuns: [],
  bracketRunning: false,
  bracketStopRequested: false,
  sweepCounter: 0,
  plotFramePending: false,
  plotRenderTimer: null,
  lastSweepLogMs: 0,
  lastPlotRenderMs: 0,
  lastGaussianFit: null,
  lastGmmPlan: [],
  sweepRunning: false,
  gateProbeRunning: false,
  gateProbeBusy: false,
  gateProbePending: false,
  gateProbePointIndex: 0,
  gateProbeTimer: null,
  autoFitRunning: false,
  autoFitStopRequested: false,
  autoFitHistory: [],
  deviceCalRunning: false,
  deviceCalStopRequested: false,
  deviceCalResults: [],
  deviceCalHistory: [],
  allDeviceTestRunning: false,
  allDeviceTestStopRequested: false,
  allDeviceTestRows: [],
  deviceDetectRunning: false,
  deviceDetectStopRequested: false,
  deviceDetectRows: [],
  firmwareVersion: null,
  firmwareProtocol: null,
  firmwareName: null,
  dfuBootloaderMode: false,
  versionWarningKey: "",
  plotAdcSelection: {
    D1: PLOT_CONFIGS.D1.defaultAdcs.slice(),
    D2: PLOT_CONFIGS.D2.defaultAdcs.slice(),
  },
};

function logLine(text, direction = "") {
  const line = `[${nowTime()}] ${direction}${text}`;
  state.commandLog.push(line);
  document.querySelectorAll(".log-view").forEach(box => {
    box.value += `${line}\n`;
    box.scrollTop = box.scrollHeight;
  });
}

function setConnected(connected) {
  state.connected = connected;
  if (connected) state.dfuBootloaderMode = false;
  $("statusDot").classList.toggle("connected", connected);
  $("connectionState").textContent = connected ? "Connected" : "Disconnected";
  $("connectButton").disabled = connected;
  $("disconnectButton").disabled = !connected;
  if (!connected) {
    state.firmwareVersion = null;
    state.firmwareProtocol = null;
    state.firmwareName = null;
    state.versionWarningKey = "";
    updateVersionInfo();
  }
}

function updateVersionInfo(extraClass = "") {
  const line = $("versionInfo");
  if (!line) return;
  const fw = state.dfuBootloaderMode
    ? "DFU bootloader mode (app FW not available)"
    : state.firmwareVersion
      ? `FW ${state.firmwareVersion}`
      : "FW not checked";
  const proto = !state.dfuBootloaderMode && state.firmwareProtocol ? ` / ${state.firmwareProtocol}` : "";
  line.textContent = `Web ${WEB_VERSION} / ${fw}${proto}`;
  line.className = `version-line ${extraClass}`.trim();
}

function setDfuBootloaderMode(active, extraClass = active ? "warn" : "") {
  state.dfuBootloaderMode = !!active;
  if (active) {
    state.firmwareVersion = null;
    state.firmwareProtocol = null;
    state.firmwareName = null;
    state.versionWarningKey = "";
  }
  updateVersionInfo(extraClass);
}

function firmwareSupportsPairProgram() {
  const protocol = String(state.firmwareProtocol || "").toLowerCase();
  const version = String(state.firmwareVersion || "").toLowerCase();
  return protocol.includes("pair") || version.includes("pair-program") || version.includes("gate-probe");
}

function firmwareSupportsGateProbe() {
  const protocol = String(state.firmwareProtocol || "").toLowerCase();
  const version = String(state.firmwareVersion || "").toLowerCase();
  return protocol.includes("gate") || version.includes("gate-probe");
}

function parseVersionKeyValues(parts, startIndex) {
  const info = {};
  for (let i = startIndex; i < parts.length - 1; i += 2) {
    const key = parts[i]?.toUpperCase();
    const value = parts[i + 1];
    if (!key || value === undefined) continue;
    if (key === "FW") info.version = value;
    else if (key === "PROTO") info.protocol = value;
    else if (key === "NAME") info.name = value;
    else if (key === "BAUD") info.baud = value;
  }
  return info;
}

function handleFirmwareVersionReply(text) {
  const parts = text.replaceAll(":", ",").split(",").map(part => part.trim()).filter(Boolean);
  const kind = parts[0]?.toUpperCase();
  if (!["VER", "READY", "PONG"].includes(kind)) return false;

  let info = {};
  if (kind === "VER") {
    info = parseVersionKeyValues(parts, 1);
  } else {
    info.name = parts[1] || null;
    info = { ...info, ...parseVersionKeyValues(parts, 2) };
  }
  if (!info.version && !info.protocol) return false;

  state.firmwareVersion = info.version || state.firmwareVersion;
  state.firmwareProtocol = info.protocol || state.firmwareProtocol;
  state.firmwareName = info.name || state.firmwareName;

  const warnings = [];
  if (state.firmwareVersion && state.firmwareVersion !== EXPECTED_FIRMWARE_VERSION) {
    warnings.push(`FW ${state.firmwareVersion} != expected ${EXPECTED_FIRMWARE_VERSION}`);
  }
  if (state.firmwareProtocol && state.firmwareProtocol !== EXPECTED_FIRMWARE_PROTOCOL) {
    warnings.push(`protocol ${state.firmwareProtocol} != expected ${EXPECTED_FIRMWARE_PROTOCOL}`);
  }
  updateVersionInfo(warnings.length ? "warn" : "ok");
  if (warnings.length) {
    const key = warnings.join("; ");
    if (state.versionWarningKey !== key) {
      state.versionWarningKey = key;
      logLine(`[version warn] ${key}`);
    }
  }
  return true;
}

async function queryFirmwareVersion() {
  updateVersionInfo();
  const reply = await sendCommand("VER?", {
    waitForReply: true,
    timeoutMs: 1500,
    replyMatcher: text => text.toUpperCase().startsWith("VER,"),
  });
  if (!reply) {
    updateVersionInfo("warn");
    logLine(`[version warn] Firmware did not answer VER?; expected FW ${EXPECTED_FIRMWARE_VERSION} / ${EXPECTED_FIRMWARE_PROTOCOL}`);
    return;
  }
  handleFirmwareVersionReply(reply);
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(item => {
    item.classList.toggle("active", item.id === `tab-${tabName}`);
  });
}

function tabNameFromHash() {
  const hash = decodeURIComponent(window.location.hash || "").replace(/^#/, "");
  if (!hash) return "";
  const tabs = Array.from(document.querySelectorAll(".tab"));
  return tabs.some(tab => tab.dataset.tab === hash) ? hash : "";
}

function activateInitialTabFromHash() {
  const tabName = tabNameFromHash();
  if (tabName) activateTab(tabName);
}

async function connectSerial() {
  if (!window.isSecureContext) {
    alert("Web Serial requires a secure context. Use HTTPS for LAN access.");
    return;
  }
  if (!("serial" in navigator)) {
    alert("??ë¸Œë¼?°ì???Web Serial APIë¥?ì§€?í•˜ì§€ ?ŠìŠµ?ˆë‹¤. Chrome ?ëŠ” Edgeë¥??¬ìš©?˜ì„¸??");
    return;
  }
  try {
    state.port = await navigator.serial.requestPort();
    await state.port.open({ baudRate: Number($("baudRate").value) || 230400 });
    state.writer = state.port.writable.getWriter();
    state.keepReading = true;
    setConnected(true);
    logLine(`Connected @ ${$("baudRate").value} (Web ${WEB_VERSION})`);
    readLoop();
    queryFirmwareVersion();
  } catch (error) {
    logLine(`[connect error] ${error.message}`);
  }
}

async function disconnectSerial() {
  try {
    state.keepReading = false;
    if (state.reader) {
      await state.reader.cancel().catch(() => {});
      state.reader.releaseLock();
      state.reader = null;
    }
    if (state.writer) {
      state.writer.releaseLock();
      state.writer = null;
    }
    if (state.port) {
      await state.port.close().catch(() => {});
      state.port = null;
    }
  } finally {
    setConnected(false);
    logLine("Disconnected");
  }
}

async function readLoop() {
  const decoder = new TextDecoder();
  while (state.port?.readable && state.keepReading) {
    state.reader = state.port.readable.getReader();
    try {
      while (state.keepReading) {
        const { value, done } = await state.reader.read();
        if (done) break;
        if (value) handleSerialText(decoder.decode(value, { stream: true }));
      }
    } catch (error) {
      if (state.keepReading) logLine(`[read error] ${error.message}`);
    } finally {
      state.reader.releaseLock();
      state.reader = null;
    }
  }
}

function handleSerialText(chunk) {
  state.lineBuffer += chunk;
  const lines = state.lineBuffer.split(/[;\r\n]+/);
  state.lineBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const text = line.trim().replace(/^;+/, "");
    if (!text) continue;
    const isFirmwareSweepLine = FIRMWARE_SWEEP_RE.test(text);
    if (!isFirmwareSweepLine) logLine(text, "< ");
    handleFirmwareVersionReply(text);
    if (!parseFirmwareSweepReply(text)) parseAdcReply(text);
    const pendingIndex = state.pendingReplies.findIndex(pending => !pending.matcher || pending.matcher(text));
    if (pendingIndex >= 0) {
      const [pending] = state.pendingReplies.splice(pendingIndex, 1);
      clearTimeout(pending.timer);
      pending.resolve(text);
    }
  }
}

function waitForReply(timeoutMs, matcher = null) {
  return new Promise(resolve => {
    const pending = {
      matcher,
      resolve,
      timer: setTimeout(() => {
        state.pendingReplies = state.pendingReplies.filter(item => item !== pending);
        resolve(null);
      }, timeoutMs),
    };
    state.pendingReplies.push(pending);
  });
}

function replyLooksBad(reply) {
  return reply === null || (typeof reply === "string" && reply.toUpperCase().startsWith("ERR"));
}

function replySummary(reply) {
  if (reply === undefined) return "dry-run";
  if (reply === null) return "timeout";
  return reply;
}

async function sendCommand(command, options = {}) {
  const cmd = command.trim();
  if (!cmd) return;
  logLine(cmd, "> ");
  if (!state.writer) {
    logLine("[dry-run] serial not connected");
    return;
  }
  const replyPromise = options.waitForReply ? waitForReply(options.timeoutMs || 1500, options.replyMatcher || null) : null;
  const bytes = new TextEncoder().encode(`${cmd}\n`);
  await state.writer.write(bytes);
  if (replyPromise) {
    const reply = await replyPromise;
    if (!reply) logLine(`[timeout] ${cmd}`);
    return reply;
  }
}

function updateDacReadout() {
  const dac = $("dacSelect").value;
  const code = clamp(Math.round(Number($("dacCode").value) || 0), 0, DAC_MAX_CODE);
  $("dacCode").value = code;
  $("dacOutReadout").textContent = `${dacCodeToVDac(code).toFixed(4)} V`;
  $("vhighReadout").textContent = `${dacCodeToVhigh(dac, code).toFixed(4)} V`;
}

function loadDacState() {
  const dac = $("dacSelect").value;
  $("dacCode").value = state.dacCodes[dac] ?? 0;
  updateDacReadout();
}

function setDacCalStatus(text, kind = "") {
  const status = $("dacCalStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function validateDacCalibration(calibration) {
  for (const dac of ["D1", "D2"]) {
    const points = calibration[dac];
    for (let i = 0; i < points.length; i++) {
      if (!Number.isFinite(points[i].code) || points[i].code < 0 || points[i].code > DAC_MAX_CODE) {
        return `${dac}: code must be 0 to ${DAC_MAX_CODE}`;
      }
      if (i > 0 && points[i].code <= points[i - 1].code) {
        return `${dac}: codes must increase from -15 V to 15 V`;
      }
    }
  }
  return "";
}

function readDacCalibrationInputs() {
  const next = { D1: [], D2: [] };
  for (const dac of ["D1", "D2"]) {
    for (const voltage of DAC_CAL_VOLTAGES) {
      const input = document.querySelector(`.cal-code-input[data-dac="${dac}"][data-voltage="${voltage}"]`);
      const code = clamp(Math.round(Number(input?.value) || 0), 0, DAC_MAX_CODE);
      next[dac].push({ voltage, code });
      if (input) input.value = code;
    }
  }
  return next;
}

function renderDacCalibration() {
  const table = $("dacCalTable");
  if (!table) return;
  table.innerHTML = "";
  for (const voltage of DAC_CAL_VOLTAGES) {
    const d1 = state.dacCal.D1.find(point => point.voltage === voltage)?.code ?? 0;
    const d2 = state.dacCal.D2.find(point => point.voltage === voltage)?.code ?? 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${voltage.toFixed(0)} V</td>
      <td><input class="cal-code-input" data-dac="D1" data-voltage="${voltage}" type="number" min="0" max="4095" step="1" value="${d1}" /></td>
      <td><button class="small table-load-button dac-cal-load" data-dac="D1" data-voltage="${voltage}" type="button">Send</button></td>
      <td><input class="cal-code-input" data-dac="D2" data-voltage="${voltage}" type="number" min="0" max="4095" step="1" value="${d2}" /></td>
      <td><button class="small table-load-button dac-cal-load" data-dac="D2" data-voltage="${voltage}" type="button">Send</button></td>
    `;
    table.appendChild(row);
  }
  table.querySelectorAll(".cal-code-input").forEach(input => {
    input.addEventListener("input", updateDacCalPreview);
  });
  table.querySelectorAll(".dac-cal-load").forEach(button => {
    button.addEventListener("click", () => sendDacCalPoint(button, button.dataset.dac, button.dataset.voltage));
  });
  updateDacCalPreview();
}

async function sendDacCalPoint(button, dac, voltage) {
  const next = readDacCalibrationInputs();
  const error = validateDacCalibration(next);
  if (error) {
    setDacCalStatus(error, "warn");
    return;
  }
  state.dacCal = next;
  const input = document.querySelector(`.cal-code-input[data-dac="${dac}"][data-voltage="${voltage}"]`);
  const code = clamp(Math.round(Number(input?.value) || 0), 0, DAC_MAX_CODE);
  if (input) input.value = code;
  $("dacSelect").value = dac;
  $("dacCode").value = code;
  updateDacReadout();
  $("targetResult").textContent = `sent ${dac} code ${code}, DAC ${(dacCodeToVDac(code) * 1000).toFixed(1)} mV, output ${(dacCodeToVhigh(dac, code) * 1000).toFixed(1)} mV`;
  if (button) button.disabled = true;
  try {
    await sendCommand(`${dac},${code}`);
    state.dacCodes[dac] = code;
    recordMeasurement(dac, code, dacCodeToVhigh(dac, code), "cal-dac");
    setDacCalStatus(`Sent ${dac} code ${code} from ${voltage} V calibration row.`, "ok");
  } finally {
    if (button) button.disabled = false;
  }
}

function updateDacCalPreview() {
  const next = readDacCalibrationInputs();
  const error = validateDacCalibration(next);
  if (error) {
    setDacCalStatus(error, "warn");
    return;
  }
  const d1Zero = next.D1.find(point => point.voltage === 0)?.code;
  const d2Zero = next.D2.find(point => point.voltage === 0)?.code;
  setDacCalStatus(`Pending calibration is valid. D1 zero=${d1Zero}, D2 zero=${d2Zero}.`, "ok");
}

function saveDacCalibrationFromInputs() {
  const next = readDacCalibrationInputs();
  const error = validateDacCalibration(next);
  if (error) {
    setDacCalStatus(error, "warn");
    return;
  }
  state.dacCal = next;
  const saved = persistDacCalibration();
  updateDacReadout();
  if (saved) {
    setDacCalStatus("DAC calibration saved locally.", "ok");
    logLine("DAC calibration saved locally");
  } else {
    setDacCalStatus("DAC calibration could not be saved in this browser.", "warn");
  }
}

function loadProjectDacCalibration() {
  state.dacCal = cloneDacCalibration();
  const saved = persistDacCalibration();
  renderDacCalibration();
  updateDacReadout();
  if (saved) {
    setDacCalStatus("Project DAC calibration loaded and saved locally.", "ok");
    logLine("Project DAC calibration loaded and saved locally");
  } else {
    setDacCalStatus("Project DAC calibration loaded, but local save failed.", "warn");
  }
}

function resetDacCalibration() {
  state.dacCal = cloneDacCalibration();
  try {
    localStorage.removeItem(DAC_CAL_STORAGE_KEY);
  } catch {}
  renderDacCalibration();
  updateDacReadout();
  setDacCalStatus("DAC calibration reset to defaults.", "ok");
  logLine("DAC calibration reset to defaults");
}

function setParamCalStatus(text, kind = "") {
  const status = $("paramCalStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function validateParamCalibration(calibration) {
  for (const param of ["A", "mu"]) {
    const points = calibration[param];
    for (let i = 0; i < points.length; i++) {
      if (!Number.isFinite(points[i].voltage)) return `${param}: voltage must be numeric`;
    }
  }
  return "";
}
function paramCalibrationForProfile(profile = paramCalProfileKey()) {
  if (profile === "D15" || profile === "D16") {
    const defaults = defaultDeviceParamCalibration();
    return state.deviceParamCal?.[profile] || defaults[profile];
  }
  return state.paramCal;
}
function setParamCalibrationForProfile(profile, calibration) {
  if (profile === "D15" || profile === "D16") {
    if (!state.deviceParamCal) state.deviceParamCal = defaultDeviceParamCalibration();
    state.deviceParamCal[profile] = calibration;
  } else {
    state.paramCal = calibration;
  }
}
function persistParamCalibrationForProfile(profile) {
  return profile === "D15" || profile === "D16" ? persistDeviceParamCalibration() : persistParamCalibration();
}
function profileDevice(profile = paramCalProfileKey()) {
  return profile === "D15" ? 15 : profile === "D16" ? 16 : null;
}
function profileLabel(profile = paramCalProfileKey()) {
  return profile === "D15" || profile === "D16" ? profile : "D1-D14 default";
}
function readParamCalibrationInputs() {
  const next = { A: [], mu: [] };
  for (const param of ["A", "mu"]) {
    for (const code of PARAM_CAL_CODES) {
      const input = document.querySelector(`.param-cal-input[data-param="${param}"][data-code="${code}"]`);
      const voltage = Number(input?.value);
      next[param].push({ code, voltage });
    }
  }
  return next;
}
function renderParamCalibration() {
  const table = $("paramCalTable");
  if (!table) return;
  const profile = paramCalProfileKey();
  const cal = paramCalibrationForProfile(profile);
  table.innerHTML = "";
  for (const code of PARAM_CAL_CODES) {
    const aVoltage = cal.A.find(point => point.code === code)?.voltage ?? 0;
    const muVoltage = cal.mu.find(point => point.code === code)?.voltage ?? 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${code}</td>
      <td><button class="small table-load-button param-cal-load" data-code="${code}" type="button">Send</button></td>
      <td><input class="param-cal-input" data-param="A" data-code="${code}" type="number" step="0.001" value="${aVoltage.toFixed(4)}" /></td>
      <td><input class="param-cal-input" data-param="mu" data-code="${code}" type="number" step="0.001" value="${muVoltage.toFixed(4)}" /></td>
    `;
    table.appendChild(row);
  }
  table.querySelectorAll(".param-cal-input").forEach(input => {
    input.addEventListener("input", updateParamCalPreview);
  });
  table.querySelectorAll(".param-cal-load").forEach(button => {
    button.addEventListener("click", () => sendParamCalPoint(button, button.dataset.code));
  });
  updateParamCalPreview();
}
async function sendParamCalPoint(button, codeValue) {
  const profile = paramCalProfileKey();
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  setParamCalibrationForProfile(profile, next);
  const code = clamp(Math.round(Number(codeValue) || 0), 0, POT_MAX_CODE);
  $("aCode").value = code;
  $("muCode").value = code;
  const forcedDevice = profileDevice(profile);
  const device = forcedDevice || deviceMuxInfo($("potDevice").value).device;
  $("potDevice").value = device;
  updatePotReadout();
  state.deviceStates[device].a = code;
  state.deviceStates[device].mu = code;
  renderDeviceTable();
  if (button) button.disabled = true;
  try {
    const replyA = await sendCommand(`A${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    const replyM = await sendCommand(`M${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    const kind = replyLooksBad(replyA) || replyLooksBad(replyM) ? "warn" : "ok";
    setParamCalStatus(`Sent ${profileLabel(profile)} code ${code} to device ${device}. Replies: A=${replySummary(replyA)}, M=${replySummary(replyM)}.`, kind);
  } finally {
    if (button) button.disabled = false;
  }
}
function updateParamCalPreview() {
  const profile = paramCalProfileKey();
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  const aVoltages = next.A.map(point => point.voltage).filter(Number.isFinite);
  const muVoltages = next.mu.map(point => point.voltage).filter(Number.isFinite);
  setParamCalStatus(
    `${profileLabel(profile)} pending calibration valid. Vstart ${Math.min(...aVoltages).toFixed(3)} to ${Math.max(...aVoltages).toFixed(3)} V, mu ${Math.min(...muVoltages).toFixed(3)} to ${Math.max(...muVoltages).toFixed(3)} V.`,
    "ok"
  );
}
function saveParamCalibrationFromInputs() {
  const profile = paramCalProfileKey();
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  setParamCalibrationForProfile(profile, next);
  const saved = persistParamCalibrationForProfile(profile);
  updatePotReadout();
  renderDeviceTable();
  if (saved) {
    setParamCalStatus(`${profileLabel(profile)} Vstart / mu calibration saved locally.`, "ok");
    logLine(`${profileLabel(profile)} Vstart / mu calibration saved locally`);
  } else {
    setParamCalStatus(`${profileLabel(profile)} Vstart / mu calibration could not be saved in this browser.`, "warn");
  }
}
function loadProjectParamCalibration() {
  const profile = paramCalProfileKey();
  if (profile === "D15" || profile === "D16") {
    state.deviceParamCal = sanitizeDeviceParamCalibration(state.deviceParamCal);
    state.deviceParamCal[profile] = defaultDeviceParamCalibration()[profile];
  } else {
    state.paramCal = cloneParamCalibration();
  }
  const saved = persistParamCalibrationForProfile(profile);
  renderParamCalibration();
  updatePotReadout();
  renderDeviceTable();
  if (saved) {
    setParamCalStatus(`${profileLabel(profile)} project Vstart / mu calibration loaded and saved locally.`, "ok");
    logLine(`${profileLabel(profile)} project Vstart / mu calibration loaded and saved locally`);
  } else {
    setParamCalStatus(`${profileLabel(profile)} project Vstart / mu calibration loaded, but local save failed.`, "warn");
  }
}
function resetParamCalibration() {
  const profile = paramCalProfileKey();
  if (profile === "D15" || profile === "D16") {
    state.deviceParamCal = sanitizeDeviceParamCalibration(state.deviceParamCal);
    state.deviceParamCal[profile] = defaultDeviceParamCalibration()[profile];
    persistDeviceParamCalibration();
  } else {
    state.paramCal = cloneParamCalibration();
    try {
      localStorage.removeItem(PARAM_CAL_STORAGE_KEY);
    } catch {}
  }
  renderParamCalibration();
  updatePotReadout();
  renderDeviceTable();
  setParamCalStatus(`${profileLabel(profile)} Vstart / mu calibration reset to defaults.`, "ok");
  logLine(`${profileLabel(profile)} Vstart / mu calibration reset to defaults`);
}function calculateDacTarget() {
  const dac = $("dacSelect").value;
  const mv = Number($("dacTargetMv").value) || 0;
  const kind = $("dacTargetKind").value;
  const code = kind === "DAC out mV" ? vdacToDacCode(mv / 1000) : vhighToDacCode(dac, mv / 1000);
  $("dacCode").value = code;
  updateDacReadout();
  $("targetResult").textContent = `code ${code}, DAC ${(dacCodeToVDac(code) * 1000).toFixed(1)} mV, output ${(dacCodeToVhigh(dac, code) * 1000).toFixed(1)} mV`;
}

async function setFixedDac() {
  updateDacReadout();
  const dac = $("dacSelect").value;
  const code = clamp(Math.round(Number($("dacCode").value) || 0), 0, DAC_MAX_CODE);
  await sendCommand(`${dac},${code}`);
  state.dacCodes[dac] = code;
  recordMeasurement(dac, code, dacCodeToVhigh(dac, code), "manual-dac");
}

function valueToDacCode(dac, mode, value) {
  if (mode === "Code") return clamp(Math.round(Number(value) || 0), 0, DAC_MAX_CODE);
  if (mode === "DAC out mV") return vdacToDacCode(Number(value) / 1000);
  return vhighToDacCode(dac, Number(value) / 1000);
}

function dacSnapshot() {
  return {
    D1: {
      code: state.dacCodes.D1 ?? 0,
      vhigh: dacCodeToVhigh("D1", state.dacCodes.D1 ?? 0),
    },
    D2: {
      code: state.dacCodes.D2 ?? 0,
      vhigh: dacCodeToVhigh("D2", state.dacCodes.D2 ?? 0),
    },
  };
}

function setPlotStatus(dac, text) {
  const status = $(PLOT_CONFIGS[dac]?.statusId);
  if (status) {
    status.textContent = text;
    status.title = text;
  }
}

function setAllPlotStatus(text) {
  for (const dac of ["D1", "D2"]) setPlotStatus(dac, text);
}

function sweepExpectedTotalPoints(requests = [], repeatCount = 1) {
  const perRepeat = (requests || []).reduce((sum, request) => sum + Math.max(0, Number(request?.pointCount) || 0), 0);
  return perRepeat * Math.max(1, Math.round(Number(repeatCount) || 1));
}

function sweepCapturedPointCount(sweep) {
  return Number(sweep?.capturedPointCount ?? sweep?.points?.length ?? 0) || 0;
}

function sweepRetentionSuffix(sweep) {
  if (!sweep) return "";
  const captured = sweepCapturedPointCount(sweep);
  const retained = sweep.points?.length || 0;
  if (captured > retained) return `, retained ${retained}/${captured} preview pts`;
  return "";
}

async function prepareSweepStreamExport(requests, repeatCount) {
  const expectedPointCount = sweepExpectedTotalPoints(requests, repeatCount);
  if (expectedPointCount <= STREAM_EXPORT_POINT_THRESHOLD) {
    return { expectedPointCount, streamDirectoryHandle: null };
  }
  if (!window.showDirectoryPicker) {
    throw new Error(`Large sweep has ${expectedPointCount} point(s). Use Chrome/Edge folder export or reduce repeats below ${STREAM_EXPORT_POINT_THRESHOLD}.`);
  }
  const directoryHandle = await chooseExportDirectory(`pcb_gaussian_sweep_${Date.now()}`);
  if (!directoryHandle) {
    throw new Error(`Large sweep cancelled: ${expectedPointCount} point(s) requires a save folder to avoid browser memory overflow.`);
  }
  return { expectedPointCount, streamDirectoryHandle: directoryHandle };
}

function createSweepStreamExport(sweep, directoryHandle) {
  return {
    enabled: true,
    directoryHandle,
    fileStem: safeExportStem(`pcb_gaussian_sweep_${sweep.id}_stream_${Date.now()}`),
    chunkLimit: STREAM_EXPORT_CHUNK_POINT_LIMIT,
    rows: [tidyFields(false)],
    bufferedPoints: 0,
    totalWritten: 0,
    chunkIndex: 0,
    fileCount: 0,
    flushPromise: Promise.resolve(),
    error: null,
    startedAt: new Date().toISOString(),
    rowRun: { sweep: { id: sweep.id } },
  };
}

function queueSweepStreamRows(sweep, fileName, rows) {
  const stream = sweep?.streamExport;
  if (!stream?.enabled || stream.error) return;
  const csv = csvFromRows(rows);
  stream.fileCount += 1;
  stream.flushPromise = (stream.flushPromise || Promise.resolve())
    .then(() => saveTextExportFile(fileName, csv, "text/csv;charset=utf-8", stream.directoryHandle))
    .catch(error => {
      stream.error = stream.error || error;
      state.sweepRunning = false;
      logLine(`[export error] ${error.message}`);
    });
}

function flushSweepStreamChunk(sweep, reason = "chunk") {
  const stream = sweep?.streamExport;
  if (!stream?.enabled || stream.rows.length <= 1) return;
  const rows = stream.rows;
  const pointCount = stream.bufferedPoints;
  stream.rows = [tidyFields(false)];
  stream.bufferedPoints = 0;
  stream.chunkIndex += 1;
  stream.totalWritten += pointCount;
  const part = String(stream.chunkIndex).padStart(4, "0");
  queueSweepStreamRows(sweep, `${stream.fileStem}_part${part}_tidy_raw.csv`, rows);
  logLine(`[export] queued ${stream.fileStem}_part${part}_tidy_raw.csv (${pointCount} point(s), ${reason})`);
}

function queueSweepStreamPoint(sweep, point) {
  const stream = sweep?.streamExport;
  if (!stream?.enabled || stream.error) return;
  stream.rows.push(tidyPointRow(stream.rowRun, point, false));
  stream.bufferedPoints += 1;
  if (stream.bufferedPoints >= stream.chunkLimit) flushSweepStreamChunk(sweep);
}

async function saveSweepStreamParameters(sweep, stage) {
  const stream = sweep?.streamExport;
  if (!stream?.enabled) return;
  await saveRowsCsvExport(`${stream.fileStem}_parameters_${stage}.csv`, sweepStreamParameterRows(sweep, stage), stream.directoryHandle);
  stream.fileCount += 1;
}

async function finishSweepStreamExport(sweep) {
  const stream = sweep?.streamExport;
  if (!stream?.enabled) return "";
  flushSweepStreamChunk(sweep, "finish");
  await stream.flushPromise;
  if (stream.error) throw stream.error;
  await saveSweepStreamParameters(sweep, "finish");
  if (stream.error) throw stream.error;
  return `streamed ${stream.totalWritten} point(s) to ${stream.chunkIndex} CSV chunk(s)`;
}

function sweepStreamParameterRows(sweep, stage) {
  const rows = sweepParameterRows(sweep);
  const stream = sweep?.streamExport;
  rows.push(
    [],
    ["stream_export", "stage", stage, "", ""],
    ["stream_export", "enabled", stream?.enabled ? "yes" : "no", "", ""],
    ["stream_export", "file_stem", stream?.fileStem || "", "", ""],
    ["stream_export", "expected_points", sweep?.expectedPointCount || "", "points", ""],
    ["stream_export", "captured_points", sweepCapturedPointCount(sweep), "points", ""],
    ["stream_export", "retained_preview_points", sweep?.points?.length || 0, "points", "GUI keeps a bounded preview for stability"],
    ["stream_export", "chunk_limit", stream?.chunkLimit || "", "points/file", ""],
    ["stream_export", "chunks_written", stream?.chunkIndex || 0, "files", ""],
    ["stream_export", "points_written", stream?.totalWritten || 0, "points", ""],
    ["stream_export", "file_count", stream?.fileCount || 0, "files", ""],
  );
  return rows;
}

function retainSweepPreviewPoint(sweep, point) {
  if (!sweep?.streamExport?.enabled) {
    sweep.points.push(point);
    return;
  }
  if (sweep.points.length < SWEEP_RETAIN_POINT_LIMIT) {
    sweep.points.push(point);
    return;
  }
  const idx = sweep.retentionWriteIndex % SWEEP_RETAIN_POINT_LIMIT;
  sweep.points[idx] = point;
  sweep.retentionWriteIndex += 1;
  sweep.droppedPointCount = (sweep.droppedPointCount || 0) + 1;
}

function startSweepCapture(requests = [], repeatCount = 1, options = {}) {
  const rangeByDac = {};
  for (const request of requests) {
    if (!request?.dac) continue;
    const min = Number(request.rangeMinMv ?? Math.min(Number(request.startMv), Number(request.stopMv))) / 1000;
    const max = Number(request.rangeMaxMv ?? Math.max(Number(request.startMv), Number(request.stopMv))) / 1000;
    if (Number.isFinite(min) && Number.isFinite(max)) rangeByDac[request.dac] = { min, max };
  }
  state.activeSweep = {
    id: ++state.sweepCounter,
    startedAt: new Date().toISOString(),
    points: [],
    capturedPointCount: 0,
    droppedPointCount: 0,
    retentionWriteIndex: 0,
    expectedPointCount: Number(options.expectedPointCount) || sweepExpectedTotalPoints(requests, repeatCount),
    requests: (requests || []).map(request => ({
      dac: request.dac,
      command: request.command,
      pointCount: request.pointCount,
      adcMask: request.adcMask,
      avgSamples: request.avgSamples,
      settleUs: request.settleUs,
      preBiasMs: request.preBiasMs,
      pointRepeats: request.pointRepeats,
      reverse: request.reverse,
      startMv: request.startMv,
      stopMv: request.stopMv,
      stepMv: request.stepMv,
    })),    streamExport: null,
    adcLabels: ADC_LABELS.slice(),
    expectedByDac: {},
    receivedByDac: {},
    nextPointByDac: {},
    missingByDac: {},
    badByDac: {},
    rangeByDac,
    repeatCount,
    currentRepeat: 1,
    lastStatusMs: 0,
  };
  if (options.streamDirectoryHandle) state.activeSweep.streamExport = createSweepStreamExport(state.activeSweep, options.streamDirectoryHandle);
  state.pendingAdcContext = null;
  state.lastSweep = null;
  state.lastGaussianFit = null;
  state.lastGmmPlan = [];
  renderGaussianFit(null);
  renderGmmPlan([]);
  setFitStatus("New sweep running; fit after completion.");
  setGmmStatus("New sweep running; preview GMM after completion.");
  $("downloadSweepCsvButton").disabled = true;
  setAllPlotStatus(`Live ${state.activeSweep.id}: waiting for ADC data.`);
  renderSweepPlot();
}

function finishSweepCapture() {
  if (state.plotRenderTimer) {
    clearTimeout(state.plotRenderTimer);
    state.plotRenderTimer = null;
  }
  const active = state.activeSweep;
  const captured = sweepCapturedPointCount(active);
  if (captured > 0 || active?.points.length) {
    active.finishedAt = active.finishedAt || new Date().toISOString();
    state.lastSweep = active;
    state.activeSweep = null;
    state.pendingAdcContext = null;
    renderMeasurementTableTail();
    renderSweepPlot();
    $("downloadSweepCsvButton").disabled = false;
    const coverage = sweepCoverageSummary(state.lastSweep);
    setAllPlotStatus(`Sweep ${state.lastSweep.id}: ${captured} pts${sweepRetentionSuffix(state.lastSweep)}${coverage ? `, ${coverage}` : ""}.`);
  } else {
    state.activeSweep = null;
    state.pendingAdcContext = null;
    renderSweepPlot();
    $("downloadSweepCsvButton").disabled = true;
    setAllPlotStatus("No ADC samples were captured in the last sweep.");
  }
}

function scheduleSweepPlotRender() {
  if (state.plotFramePending || state.plotRenderTimer) return;
  const now = performance.now();
  const delay = Math.max(0, SWEEP_RENDER_INTERVAL_MS - (now - state.lastPlotRenderMs));
  state.plotRenderTimer = setTimeout(() => {
    state.plotRenderTimer = null;
    state.plotFramePending = true;
    requestAnimationFrame(() => {
      state.plotFramePending = false;
      state.lastPlotRenderMs = performance.now();
      renderSweepPlot();
    });
  }, delay);
}

function sweepPoints(prefix) {
  const mode = $(`sweep${prefix}Mode`).value;
  const start = Number($(`sweep${prefix}Start`).value);
  const stop = Number($(`sweep${prefix}Stop`).value);
  const step = Math.abs(Number($(`sweep${prefix}Step`).value));
  if (!step) throw new Error(`${prefix} sweep step must be positive`);
  const direction = stop >= start ? 1 : -1;
  const points = [];
  for (let value = start; direction > 0 ? value <= stop + 1e-12 : value >= stop - 1e-12; value += direction * step) {
    points.push(valueToDacCode(prefix, mode, value));
  }
  return points;
}

function sweepPointCountFromMv(start, stop, step) {
  const span = Math.abs(stop - start);
  let count = Math.floor(span / step) + 1;
  if (span % step !== 0) count += 1;
  return count;
}

function mappedDevicesForAdc(adcIndex) {
  const mapped = ADC_DEVICE_MAP[adcIndex];
  if (Array.isArray(mapped)) {
    return mapped.map(Number).filter(Number.isFinite);
  }
  const device = Number(mapped);
  return Number.isFinite(device) ? [device] : [];
}
function mappedDeviceForAdc(adcIndex) {
  return mappedDevicesForAdc(adcIndex)[0] || null;
}
function adcSubLabel(adcIndex) {
  const devices = mappedDevicesForAdc(adcIndex);
  return devices.length ? `${devices.map(device => `D${device}`).join("/")} / TIA${adcIndex + 1}` : `TIA${adcIndex + 1}`;
}
function adcIndexFromMappedDevice(device) {
  const wanted = Number(device);
  if (!Number.isFinite(wanted)) return null;
  const index = ADC_DEVICE_MAP.findIndex(item => Array.isArray(item) ? item.map(Number).includes(wanted) : Number(item) === wanted);
  return index >= 0 ? index : null;
}
function adcIndexFromTia(tiaIndex) {
  const tia = state.tiaStates[tiaIndex - 1];
  const match = String(tia?.adc || "").match(/AIN(\d+)/i);
  const adcIndex = match ? Number(match[1]) : tiaIndex - 1;
  return Number.isFinite(adcIndex) ? clamp(adcIndex, 0, ADC_TIA_COUNT - 1) : null;
}

function tiaIndexForAdc(adcIndex) {
  const found = state.tiaStates.findIndex(tia => {
    const match = String(tia?.adc || "").match(/AIN(\d+)/i);
    return match && Number(match[1]) === adcIndex;
  });
  return found >= 0 ? found : adcIndex;
}

function adcMaskFromTias(tias) {
  let mask = 0;
  for (const tiaIndex of tias) {
    const adcIndex = adcIndexFromTia(tiaIndex);
    if (adcIndex !== null) mask |= (1 << adcIndex);
  }
  return mask || 0xFF;
}

function adcMaskFromIndices(indices) {
  let mask = 0;
  for (const adcIndex of indices) {
    if (Number.isFinite(adcIndex) && adcIndex >= 0 && adcIndex < ADC_TIA_COUNT) mask |= (1 << adcIndex);
  }
  return mask || 0xFF;
}

function tiaIndicesFromAdcMask(mask) {
  const tias = [];
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) {
    if ((mask & (1 << adcIndex)) !== 0) tias.push(tiaIndexForAdc(adcIndex) + 1);
  }
  return tias.length ? tias : selectedTias();
}

function sweepAdcMask(dac) {
  return adcMaskFromIndices(selectedPlotAdcs(dac));
}

function encodeBase32(value) {
  let number = Math.trunc(Number(value) || 0);
  if (number === 0) return "0";
  const sign = number < 0 ? "-" : "";
  number = Math.abs(number);
  let text = "";
  while (number > 0) {
    text = BASE32_ALPHABET[number & 31] + text;
    number = Math.floor(number / 32);
  }
  return sign + text;
}

function decodeBase32(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return NaN;
  let idx = 0;
  let sign = 1;
  if (text[0] === "-") {
    sign = -1;
    idx = 1;
  }
  if (idx >= text.length) return NaN;
  let number = 0;
  for (; idx < text.length; idx++) {
    const digit = BASE32_ALPHABET.indexOf(text[idx]);
    if (digit < 0) return NaN;
    number = number * 32 + digit;
  }
  return sign * number;
}

function parseNumericField(value, base32 = false) {
  if (base32) return decodeBase32(value);
  const text = String(value ?? "").trim();
  if (!text) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

function parseAdcFields(parts) {
  return Array.from({ length: ADC_TIA_COUNT }, (_, idx) => {
    const text = String(parts[idx] ?? "").trim();
    if (!text) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  });
}

function parseCompactBase32AdcFields(parts, mask) {
  const values = Array.from({ length: ADC_TIA_COUNT }, () => null);
  let fieldIndex = 0;
  let ok = Number.isFinite(mask) && mask > 0;
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) {
    if ((mask & (1 << adcIndex)) === 0) continue;
    const value = decodeBase32(parts[fieldIndex]);
    if (!Number.isFinite(value)) ok = false;
    values[adcIndex] = Number.isFinite(value) ? value : null;
    fieldIndex += 1;
  }
  return { values, ok };
}

function adcAvgSamples() {
  const input = $("adcAvgSamples");
  const value = clamp(Math.round(Number(input?.value) || 256), 1, ADC_AVG_MAX);
  if (input) input.value = value;
  return value;
}

function sweepSettleUs() {
  const input = $("sweepSettleUs");
  const value = clamp(Math.round(Number(input?.value) || 65000), 0, 65000);
  if (input) input.value = value;
  return value;
}

function sweepPreBiasMs() {
  const input = $("sweepPreBiasMs");
  const value = clamp(Math.round(Number(input?.value) || 0), 0, 30000);
  if (input) input.value = value;
  return value;
}
function sweepPointRepeats() {
  const input = $("sweepPointRepeats");
  const value = clamp(Math.round(Number(input?.value) || 8), 1, SWEEP_POINT_REPEATS_MAX);
  if (input) input.value = value;
  return value;
}function sweepRepeatCount() {
  const input = $("sweepRepeats");
  const value = clamp(Math.round(Number(input?.value) || 1), 1, 10000);
  if (input) input.value = value;
  return value;
}

function sweepReverseEnabled() {
  return !!$("sweepReverse")?.checked;
}

function sweepTraceOpacity() {
  const input = $("sweepTraceOpacity");
  const value = clamp(Number(input?.value) || 0.45, 0.1, 1);
  if (input) input.value = value;
  return value;
}

function fixedPlotYRangeEnabled() {
  return !!$("fixedPlotYRange")?.checked;
}

function fixedPlotYBounds() {
  if (!fixedPlotYRangeEnabled()) return null;
  const minInput = $("plotYMin");
  const maxInput = $("plotYMax");
  const minY = Number(minInput?.value);
  const maxY = Number(maxInput?.value);
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY >= maxY) return null;
  return { minY, maxY };
}
async function returnSweepDacsToZero(requests) {
  const dacs = [...new Set((requests || []).map(req => req.dac).filter(dac => dac === "D1" || dac === "D2"))];
  const returned = [];
  for (const dac of dacs) {
    const dacNumber = dac.slice(1);
    const reply = await sendCommand(`V${dacNumber},0`, {
      waitForReply: true,
      timeoutMs: PROGRAM_REPLY_TIMEOUT_MS,
      replyMatcher: text => {
        const upper = text.toUpperCase();
        return upper.startsWith(`V${dacNumber},`) || upper.startsWith("V,") || upper.startsWith("OK") || upper.startsWith("ERR");
      },
    });
    if (replyLooksBad(reply)) {
      logLine(`[warn] Return ${dac} to 0 V ${replySummary(reply)}`);
      continue;
    }
    const zeroCode = vhighToDacCode(dac, 0);
    state.dacCodes[dac] = zeroCode;
    if ($("dacSelect")?.value === dac) {
      $("dacCode").value = zeroCode;
      updateDacReadout();
    }
    returned.push(dac);
  }
  if (returned.length) logLine(`Returned ${returned.join("/")} to 0 V after sweep.`);
  return returned;
}

function firmwareSweepRequest(prefix, totalMs, adcMask) {
  const mode = $(`sweep${prefix}Mode`).value;
  if (mode !== "Vhigh mV") {
    throw new Error("Firmware sweep currently uses Vhigh mV mode. Set sweep unit to Vhigh mV.");
  }
  const startInput = $(`sweep${prefix}Start`);
  const stopInput = $(`sweep${prefix}Stop`);
  const stepInput = $(`sweep${prefix}Step`);
  const rawStart = Math.round(Number(startInput.value));
  const rawStop = Math.round(Number(stopInput.value));
  const step = Math.abs(Math.round(Number(stepInput.value)));
  if (![rawStart, rawStop, step].every(Number.isFinite) || step <= 0) throw new Error(`${prefix} sweep range/step is invalid`);
  const start = clamp(rawStart, DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
  const stop = clamp(rawStop, DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
  startInput.value = start;
  stopInput.value = stop;
  stepInput.value = step;
  const pointCount = sweepPointCountFromMv(start, stop, step);
  if (pointCount > 1024) throw new Error(`${prefix} firmware sweep has ${pointCount} points; max is 1024`);
  const avgSamples = adcAvgSamples();
  const settleUs = sweepSettleUs();
  const preBiasMs = sweepPreBiasMs();
  const pointRepeats = sweepPointRepeats();
  const reverse = sweepReverseEnabled();
  const requestStart = reverse ? stop : start;
  const requestStop = reverse ? start : stop;
  return {
    dac: prefix,
    command: `SX${prefix.slice(1)},${encodeBase32(requestStart)},${encodeBase32(requestStop)},${encodeBase32(step)},${encodeBase32(totalMs)},${encodeBase32(adcMask)},${encodeBase32(avgSamples)},${encodeBase32(settleUs)},${encodeBase32(pointRepeats)}`,
    avgSamples,
    settleUs,
    preBiasMs,
    pointRepeats,
    reverse,
    pointCount,
    startMv: requestStart,
    stopMv: requestStop,
    rangeMinMv: Math.min(start, stop),
    rangeMaxMv: Math.max(start, stop),
    stepMv: step,
    timeoutMs: Math.max(10000, totalMs + preBiasMs + Math.ceil(pointCount * settleUs / 1000) + pointCount * 500 * pointRepeats + 3000),
  };
}

async function startSweep() {
  if (state.sweepRunning) return;
  const totalMs = Math.max(0, Math.round(Number($("sweepDwell").value) || 0));
  const repeatCount = sweepRepeatCount();
  const requests = [];
  syncTiaStates();
  try {
    if ($("sweepD1Enable").checked) {
      const adcMask = sweepAdcMask("D1");
      const request = firmwareSweepRequest("D1", totalMs, adcMask);
      request.adcMask = adcMask;
      request.tias = tiaIndicesFromAdcMask(adcMask);
      requests.push(request);
    }
    if ($("sweepD2Enable").checked) {
      const adcMask = sweepAdcMask("D2");
      const request = firmwareSweepRequest("D2", totalMs, adcMask);
      request.adcMask = adcMask;
      request.tias = tiaIndicesFromAdcMask(adcMask);
      requests.push(request);
    }
    if (!requests.length) throw new Error("Enable at least one DAC sweep");
  } catch (error) {
    alert(error.message);
    return;
  }

  let streamOptions;
  try {
    streamOptions = await prepareSweepStreamExport(requests, repeatCount);
  } catch (error) {
    alert(error.message);
    $("sweepStatus").textContent = error.message;
    return;
  }

  state.firmwareSweepSelectedTias = requests[0]?.tias || selectedTias();
  startSweepCapture(requests, repeatCount, streamOptions);
  try {
    if (state.activeSweep?.streamExport?.enabled) await saveSweepStreamParameters(state.activeSweep, "start");
  } catch (error) {
    alert(`Could not start stream export: ${error.message}`);
    state.activeSweep = null;
    state.pendingAdcContext = null;
    return;
  }
  state.sweepRunning = true;
  const startedMs = performance.now();
  const streamRunText = state.activeSweep?.streamExport?.enabled ? `, streaming CSV chunks (${STREAM_EXPORT_CHUNK_POINT_LIMIT} pts/file)` : "";
  $("sweepStatus").textContent = `Firmware sweep running: ${requests.map(req => `${req.dac}:${req.pointCount} mask=0x${req.adcMask.toString(16).padStart(2, "0")} avg=${req.avgSamples} settle=${req.settleUs}us prebias=${req.preBiasMs}ms pointReps=${req.pointRepeats}${req.reverse ? " reverse" : ""}`).join(", ")} x${repeatCount}${streamRunText}`;
  logLine($("sweepStatus").textContent);

  try {
    for (let repeatIndex = 0; repeatIndex < repeatCount && state.sweepRunning; repeatIndex++) {
      if (state.activeSweep) state.activeSweep.currentRepeat = repeatIndex + 1;
      for (const request of requests) {
        if (!state.sweepRunning) break;
        state.firmwareSweepSelectedTias = request.tias;
        $("sweepStatus").textContent = `Firmware sweep ${request.dac}: run ${repeatIndex + 1}/${repeatCount}, ${request.pointCount} point(s), total ${totalMs} ms, ADC mask 0x${request.adcMask.toString(16).padStart(2, "0")}, avg ${request.avgSamples}, settle ${request.settleUs} us, pre-bias ${request.preBiasMs} ms, point reps ${request.pointRepeats}${request.reverse ? ", reverse" : ""}`;
        if (request.preBiasMs > 0) {
          const dacNumber = request.dac.slice(1);
          const biasReply = await sendCommand(`V${dacNumber},${request.startMv}`, {
            waitForReply: true,
            timeoutMs: PROGRAM_REPLY_TIMEOUT_MS,
            replyMatcher: text => {
              const upper = text.toUpperCase();
              return upper.startsWith(`V${dacNumber},`) || upper.startsWith("V,") || upper.startsWith("OK") || upper.startsWith("ERR");
            },
          });
          if (replyLooksBad(biasReply)) {
            logLine(`[warn] Pre-bias ${request.dac} ${replySummary(biasReply)}`);
            state.sweepRunning = false;
            break;
          }
          $("sweepStatus").textContent = `Pre-bias ${request.dac}: ${request.startMv} mV for ${request.preBiasMs} ms`;
          await new Promise(resolve => setTimeout(resolve, request.preBiasMs));
        }
        const reply = await sendCommand(request.command, {
          waitForReply: true,
          timeoutMs: request.timeoutMs,
          replyMatcher: text => {
            const upper = text.toUpperCase();
            return upper.startsWith(`SX,DONE,${request.dac}`) || upper.startsWith(`SWEEP,DONE,${request.dac}`) || upper.startsWith("SX,ERR") || upper.startsWith("SWEEP,ERR") || upper.startsWith("ADC,ERR") || upper.startsWith("ADC,INIT_ERR");
          },
        });
        if (!reply) {
          logLine(`[timeout] Firmware sweep ${request.dac}`);
          state.sweepRunning = false;
          break;
        }
        if (reply.toUpperCase().startsWith("SX,ERR") || reply.toUpperCase().startsWith("SWEEP,ERR") || reply.toUpperCase().startsWith("ADC,")) {
          state.sweepRunning = false;
          break;
        }
      }
    }
  } finally {
    state.sweepRunning = false;
    state.firmwareSweepSelectedTias = null;
    const active = state.activeSweep;
    const captured = sweepCapturedPointCount(active);
    finishSweepCapture();
    const returnedDacs = await returnSweepDacsToZero(requests);
    let streamText = "";
    let streamErrorText = "";
    if (active?.streamExport?.enabled) {
      try {
        const message = await finishSweepStreamExport(active);
        streamText = message ? `, ${message}` : "";
      } catch (error) {
        streamErrorText = `, stream save failed: ${error.message}`;
        logLine(`[export error] ${error.message}`);
      }
    }
    const elapsedSeconds = ((performance.now() - startedMs) / 1000).toFixed(2);
    const returnText = returnedDacs.length ? `, returned ${returnedDacs.join("/")} to 0 V` : "";
    const previewText = active ? sweepRetentionSuffix(active) : "";
    $("sweepStatus").textContent = `Firmware sweep finished: ${captured} ADC point(s)${previewText}, ${elapsedSeconds} s${returnText}${streamText}${streamErrorText}`;
    logLine($("sweepStatus").textContent);
  }
}

function stopSweep() {
  state.sweepRunning = false;
  $("sweepStatus").textContent = "Sweep stop requested";
  logLine("Sweep stop requested; firmware sweep will finish the in-progress command before stopping.");
}


function setBracketStatus(text, kind = "") {
  const status = $("bracketStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function setParameterBracketControls(running) {
  const ids = [
    "bracketDevice", "bracketAxis", "bracketMuStart", "bracketVstartStart",
    "bracketMuStepV", "bracketVstartStepV", "bracketCount", "bracketProgramSettleMs", "bracketLoadCurrentButton",
  ];
  ids.forEach(id => {
    const element = $(id);
    if (element) element.disabled = running;
  });
  const start = $("startBracketButton");
  const stop = $("stopBracketButton");
  const downloadButton = $("downloadBracketCsvButton");
  if (start) start.disabled = running;
  if (stop) stop.disabled = !running;
  if (downloadButton) downloadButton.disabled = running || !state.bracketRuns.length;
}

function bracketDevice() {
  const input = $("bracketDevice");
  const value = clamp(Math.round(Number(input?.value) || 1), 1, 16);
  if (input) input.value = value;
  return value;
}

function bracketNumber(id, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const input = $(id);
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = fallback;
  value = clamp(integer ? Math.round(value) : value, min, max);
  if (input) input.value = integer ? String(value) : String(Number(value.toFixed(6)));
  return value;
}

function loadCurrentBracketBase(showStatus = true) {
  const device = bracketDevice();
  const muCode = logicalMuCodeForDevice(device);
  const vstartCode = logicalVstartCodeForDevice(device);
  const muV = potCodeToMuVoltage(muCode, device);
  const vstartV = potCodeToVstartVoltage(vstartCode, device);
  if ($("bracketMuStart")) $("bracketMuStart").value = muV.toFixed(4);
  if ($("bracketVstartStart")) $("bracketVstartStart").value = vstartV.toFixed(4);
  if (showStatus) setBracketStatus(`Loaded D${device}: Vmu code ${muCode} (${muV.toFixed(4)} V), Vstart code ${vstartCode} (${vstartV.toFixed(4)} V).`, "ok");
}

function bracketAxisLabel(axis) {
  if (axis === "muCoupled") return "Horizontal: Vmu/Vstart";
  if (axis === "vstart") return "Vstart only";
  return "Vmu only";
}

function parameterBracketPlan() {
  const device = bracketDevice();
  const axis = $("bracketAxis")?.value || "muCoupled";
  const muStart = bracketNumber("bracketMuStart", potCodeToMuVoltage(logicalMuCodeForDevice(device), device));
  const vstartStart = bracketNumber("bracketVstartStart", potCodeToVstartVoltage(logicalVstartCodeForDevice(device), device));
  const muStepV = bracketNumber("bracketMuStepV", -1);
  const vstartStepV = bracketNumber("bracketVstartStepV", 1);
  const count = bracketNumber("bracketCount", 6, { min: 2, max: 50, integer: true });
  const usesMu = axis !== "vstart";
  const usesVstart = axis !== "mu";
  const activeMuStep = usesMu ? muStepV : 0;
  const activeVstartStep = usesVstart ? vstartStepV : 0;
  if (!Number.isFinite(activeMuStep) || !Number.isFinite(activeVstartStep)) throw new Error("Bracket step values must be numeric.");
  if (activeMuStep === 0 && activeVstartStep === 0) throw new Error("At least one selected bracket step must be non-zero.");
  const plan = [];
  for (let index = 0; index < count; index++) {
    const deltaMuV = activeMuStep * index;
    const deltaVstartV = activeVstartStep * index;
    const requestedMuV = muStart + deltaMuV;
    const requestedVstartV = vstartStart + deltaVstartV;
    const muCode = muVoltageToCode(requestedMuV, device);
    const vstartCode = vstartVoltageToCode(requestedVstartV, device);
    plan.push({
      device,
      axis,
      axisLabel: bracketAxisLabel(axis),
      stepIndex: index + 1,
      count,
      deltaV: deltaMuV,
      deltaMuV,
      deltaVstartV,
      muStepV: activeMuStep,
      vstartStepV: activeVstartStep,
      requestedMuV,
      requestedVstartV,
      muCode,
      vstartCode,
      actualMuV: potCodeToMuVoltage(muCode, device),
      actualVstartV: potCodeToVstartVoltage(vstartCode, device),
    });
  }
  return plan;
}

function cloneLastSweepForBracket() {
  if (!state.lastSweep?.points?.length) return null;
  return JSON.parse(JSON.stringify(state.lastSweep, (key, value) => key === "streamExport" ? undefined : value));
}

async function startParameterBracket() {
  if (state.bracketRunning || state.sweepRunning) return;
  if (!state.writer) {
    setBracketStatus("Connect UART before bracket measurement.", "warn");
    return;
  }
  let plan;
  try {
    plan = parameterBracketPlan();
  } catch (error) {
    setBracketStatus(error.message, "warn");
    return;
  }

  state.bracketRunning = true;
  state.bracketStopRequested = false;
  state.bracketRuns = [];
  state.lastBracket = {
    id: Date.now(),
    startedAt: new Date().toISOString(),
    plan,
    runs: state.bracketRuns,
  };
  renderSweepPlot();
  setParameterBracketControls(true);
  const settleMs = bracketNumber("bracketProgramSettleMs", 1000, { min: 0, max: 30000, integer: true });
  const startedMs = performance.now();

  try {
    for (const step of plan) {
      if (!state.bracketRunning || state.bracketStopRequested) break;
      setBracketStatus(`Bracket ${step.stepIndex}/${step.count}: program D${step.device}, ${step.axisLabel}, Vmu ${step.muCode} (${step.actualMuV.toFixed(4)} V), Vstart ${step.vstartCode} (${step.actualVstartV.toFixed(4)} V).`, "ok");
      await programLogicalDevice(step.device, step.muCode, step.vstartCode);
      renderDeviceTable();
      if (settleMs > 0) await sleep(settleMs);
      if (!state.bracketRunning || state.bracketStopRequested) break;
      setBracketStatus(`Bracket ${step.stepIndex}/${step.count}: sweep running after delta Vmu ${step.deltaMuV.toFixed(4)} V, Vstart ${step.deltaVstartV.toFixed(4)} V.`, "ok");
      await startSweep();
      const sweep = cloneLastSweepForBracket();
      if (sweep?.points?.length) {
        state.bracketRuns.push({ ...step, sweep });
        renderSweepPlot();
        setBracketStatus(`Bracket ${step.stepIndex}/${step.count}: captured ${sweepCapturedPointCount(sweep)} ADC point(s).`, "ok");
      } else {
        setBracketStatus(`Bracket ${step.stepIndex}/${step.count}: no ADC points captured.`, "warn");
      }
    }
  } catch (error) {
    setBracketStatus(error.message, "warn");
  } finally {
    state.bracketRunning = false;
    state.bracketStopRequested = false;
    if (state.lastBracket) state.lastBracket.finishedAt = new Date().toISOString();
    setParameterBracketControls(false);
    const elapsedSeconds = ((performance.now() - startedMs) / 1000).toFixed(2);
    const captured = state.bracketRuns.reduce((sum, run) => sum + sweepCapturedPointCount(run.sweep), 0);
    const kind = state.bracketRuns.length === plan.length ? "ok" : "warn";
    setBracketStatus(`Bracket finished: ${state.bracketRuns.length}/${plan.length} step(s), ${captured} ADC point(s), ${elapsedSeconds} s.`, kind);
  }
}

function stopParameterBracket() {
  if (!state.bracketRunning) return;
  state.bracketStopRequested = true;
  state.bracketRunning = false;
  if (state.sweepRunning) stopSweep();
  setBracketStatus("Bracket stop requested; current firmware sweep must finish before the loop stops.", "warn");
}

async function downloadParameterBracketCsv() {
  const runs = state.bracketRuns || [];
  if (!runs.length) {
    alert("No completed bracket data to download.");
    return;
  }
  const captured = exportPointCountForRuns(runs);
  const baseName = `pcb_gaussian_bracket_${state.lastBracket?.id || Date.now()}`;
  try {
    if (captured > EXPORT_WORKBOOK_POINT_LIMIT) {
      await downloadSplitCsvSet(baseName, runs, true, bracketParameterRows(runs), text => setBracketStatus(text, "ok"));
      return;
    }
    const sheets = [
      { name: "parameters", rows: bracketParameterRows(runs) },
      ...matrixSheetsForRuns(runs, "bracket"),
      { name: "tidy_raw", rows: tidyRowsForRuns(runs, true) },
    ];
    downloadWorkbook(`${baseName}.xls`, sheets);
    setBracketStatus(`Downloaded bracket XLS: ${runs.length} step(s), ${captured} ADC point(s).`, "ok");
  } catch (error) {
    setBracketStatus(`Export failed: ${error.message}`, "warn");
  }
}

function gateProbeStatus(text, kind = "") {
  const status = $("gateProbeStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint ${kind}`.trim();
}

function gateProbeDac() {
  return $("gateProbeDac")?.value === "D1" ? "D1" : "D2";
}

function gateProbeRateMs() {
  const input = $("gateProbeRateMs");
  const value = clamp(Math.round(Number(input?.value) || 80), 20, 2000);
  if (input) input.value = value;
  return value;
}

function gateProbeMv(source = "") {
  const slider = $("gateProbeSlider");
  const number = $("gateProbeMvNumber");
  const raw = source === "number" ? number?.value : source === "slider" ? slider?.value : (number?.value ?? slider?.value);
  const value = clamp(Math.round(Number(raw) || 0), DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
  if (slider) slider.value = value;
  if (number) number.value = value;
  return value;
}

function setGateProbeControls(running) {
  const start = $("gateProbeStartButton");
  const stop = $("gateProbeStopButton");
  if (start) start.disabled = running;
  if (stop) stop.disabled = !running;
}

function ensureGateProbeCapture(dac) {
  if (state.activeSweep?.gateProbe && state.activeSweep.gateProbeDac === dac) return;
  startSweepCapture([{ dac, startMv: DAC_OUTPUT_MIN_MV, stopMv: DAC_OUTPUT_MAX_MV, rangeMinMv: DAC_OUTPUT_MIN_MV, rangeMaxMv: DAC_OUTPUT_MAX_MV }], 1);
  state.activeSweep.gateProbe = true;
  state.activeSweep.gateProbeDac = dac;
  state.gateProbePointIndex = 0;
  setPlotStatus(dac, `Gate map ${state.activeSweep.id}: waiting for ADC data.`);
}

function finalizeGateProbeCapture() {
  if (!state.activeSweep?.gateProbe) return;
  const count = sweepCapturedPointCount(state.activeSweep);
  if (count) {
    finishSweepCapture();
    gateProbeStatus(`Gate map complete: ${count} point(s).`, "ok");
  } else {
    state.activeSweep = null;
    state.pendingAdcContext = null;
    renderSweepPlot();
    gateProbeStatus("Gate map idle");
  }
}

function clearGateProbeMap() {
  state.gateProbeRunning = false;
  state.gateProbePending = false;
  if (state.gateProbeTimer) clearTimeout(state.gateProbeTimer);
  state.gateProbeTimer = null;
  state.activeSweep = null;
  state.lastSweep = null;
  state.pendingAdcContext = null;
  state.lastGaussianFit = null;
  state.lastGmmPlan = [];
  renderGaussianFit(null);
  renderGmmPlan([]);
  renderSweepPlot();
  setGateProbeControls(false);
  setAllPlotStatus("No sweep data yet.");
  gateProbeStatus("Gate map cleared.", "ok");
}

function scheduleGateProbeSample(delayMs = null) {
  if (!state.gateProbeRunning) return;
  if (state.gateProbeTimer) clearTimeout(state.gateProbeTimer);
  state.gateProbeTimer = setTimeout(() => {
    state.gateProbeTimer = null;
    sampleGateProbe(false);
  }, delayMs ?? gateProbeRateMs());
}

async function sampleGateProbe(force = false) {
  if (state.gateProbeBusy) {
    state.gateProbePending = true;
    return;
  }
  state.gateProbeBusy = true;
  try {
    do {
      state.gateProbePending = false;
      if (!force && !state.gateProbeRunning) break;
      const dac = gateProbeDac();
      const mv = gateProbeMv();
      const code = vhighToDacCode(dac, mv / 1000);
      const mask = sweepAdcMask(dac);
      const avg = adcAvgSamples();
      const settle = sweepSettleUs();
      ensureGateProbeCapture(dac);
      state.dacCodes[dac] = code;
      if ($("dacSelect")?.value === dac) {
        $("dacCode").value = code;
        updateDacReadout();
      }
      const pointIndex = state.gateProbePointIndex++;
      const snapshot = dacSnapshot();
      snapshot[dac] = { code, vhigh: mv / 1000 };
      state.pendingAdcContext = {
        sweepId: state.activeSweep.id,
        pointIndex,
        dac: snapshot,
        selectedTias: selectedTias(),
        sweepDac: dac,
      };
      let reply = null;
      if (firmwareSupportsGateProbe()) {
        reply = await sendCommand(`G${dac.slice(1)},${Math.round(mv)},${mask},${avg},${settle}`, {
          waitForReply: true,
          timeoutMs: 4000,
          replyMatcher: text => {
            const upper = text.toUpperCase();
            return upper.startsWith("ADC,") || upper.startsWith("G,ERR");
          },
        });
        if (typeof reply === "string" && reply.toUpperCase().startsWith("G,ERR")) {
          gateProbeStatus(reply, "warn");
        }
      } else {
        const dacReply = await sendCommand(`V${dac.slice(1)},${Math.round(mv)}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
        if (replyLooksBad(dacReply)) logLine(`[warn] gate ${dac} ${replySummary(dacReply)}`);
        reply = await sendCommand("ADC", { waitForReply: true, timeoutMs: 4000, replyMatcher: text => text.toUpperCase().startsWith("ADC,") });
      }
      if (state.pendingAdcContext?.sweepId === state.activeSweep?.id && state.pendingAdcContext?.pointIndex === pointIndex) {
        state.pendingAdcContext = null;
      }
      if (replyLooksBad(reply)) gateProbeStatus(`Gate map ${dac}: ${replySummary(reply)}.`, "warn");
      else gateProbeStatus(`Gate map ${dac}: ${(mv / 1000).toFixed(3)} V, ${(state.activeSweep?.points.length || 0)} point(s).`, "ok");
      force = false;
    } while (state.gateProbePending && state.gateProbeRunning);
  } catch (error) {
    gateProbeStatus(error.message, "warn");
  } finally {
    state.gateProbeBusy = false;
    if (state.gateProbePending && state.gateProbeRunning) scheduleGateProbeSample(0);
    if (!state.gateProbeRunning) finalizeGateProbeCapture();
  }
}

function startGateProbe() {
  if (state.sweepRunning) {
    gateProbeStatus("Stop firmware sweep before live gate map.", "warn");
    return;
  }
  state.gateProbeRunning = true;
  state.gateProbePending = false;
  setGateProbeControls(true);
  ensureGateProbeCapture(gateProbeDac());
  sampleGateProbe(false);
}

function stopGateProbe() {
  state.gateProbeRunning = false;
  state.gateProbePending = false;
  if (state.gateProbeTimer) clearTimeout(state.gateProbeTimer);
  state.gateProbeTimer = null;
  setGateProbeControls(false);
  if (!state.gateProbeBusy) finalizeGateProbeCapture();
}

function onGateProbeInput(source) {
  gateProbeMv(source);
  if (state.gateProbeRunning) scheduleGateProbeSample();
}

function updateSwitchInfo() {
  const info = deviceMuxInfo($("switchDevice").value);
  $("switchInfo").textContent =
`Device: ${info.device}
Selected CS: ${info.cs}
MAX4581 group: ${info.group} active low
Address: ${info.addr} (SC/SB/SA = ${info.SC}/${info.SB}/${info.SA})

Programming sequence:
1. SE and SE1 high: all CS released.
2. Set SA/SB/SC address.
3. Pull selected group enable low.
4. Shift MAX5488 command on DIN_T/SCLK_T.
5. Return SE/SE1 high.`;
}

async function switchTestWrite() {
  const device = deviceMuxInfo($("switchDevice").value).device;
  const code = clamp(Math.round(Number($("switchCode").value) || 0), 0, POT_MAX_CODE);
  const cmd = $("switchWiper").value;
  await sendCommand(`${cmd}${device},${code}`);
}

function readPotCodes() {
  const a = clamp(Math.round(Number($("aCode").value) || 0), 0, POT_MAX_CODE);
  const mu = clamp(Math.round(Number($("muCode").value) || 0), 0, POT_MAX_CODE);
  $("aCode").value = a;
  $("muCode").value = mu;
  return { a, mu };
}

function updatePotReadout() {
  const { a, mu } = readPotCodes();
  const device = deviceMuxInfo($("potDevice")?.value).device;
  const profile = deviceParamProfileKey(device) || "default";
  $("potReadout").innerHTML =
    `<div>Vstart: code ${mu}, wiper ${potCodeToVWiper(mu).toFixed(4)} V, output ${potCodeToVstartVoltage(mu, device).toFixed(4)} V (${profile})</div>` +
    `<div>mu: code ${a}, wiper ${potCodeToVWiper(a).toFixed(4)} V, output ${potCodeToMuVoltage(a, device).toFixed(4)} V (${profile})</div>`;
}
function loadDeviceState() {
  const device = deviceMuxInfo($("potDevice").value).device;
  $("potDevice").value = device;
  updatePotReadout();
}

async function setAFromCode() {
  const device = deviceMuxInfo($("potDevice").value).device;
  const { a } = readPotCodes();
  state.deviceStates[device].a = a;
  await sendCommand(`A${device},${a}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  updatePotReadout();
  renderDeviceTable();
}

async function setMuFromCode() {
  const device = deviceMuxInfo($("potDevice").value).device;
  const { mu } = readPotCodes();
  state.deviceStates[device].mu = mu;
  await sendCommand(`M${device},${mu}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  updatePotReadout();
  renderDeviceTable();
}

async function applyPotAllDevices() {
  const { a, mu } = readPotCodes();
  const button = $("applyPotAllButton");
  if (button) button.disabled = true;
  try {
    const mode = firmwareSupportsPairProgram() ? "pair" : "legacy";
    logLine(`Programming all devices (${mode}): mu code ${a}, Vstart code ${mu}`);
    for (let device = 1; device <= 16; device++) {
      await programLogicalDevice(device, a, mu);
    }
    logLine(`All devices programmed: mu code ${a}, Vstart code ${mu}`);
  } finally {
    if (button) button.disabled = false;
    updatePotReadout();
    renderDeviceTable();
  }
}

async function initializeAll() {
  for (let device = 1; device <= 16; device++) state.deviceStates[device] = { a: 0, mu: 0 };
  renderDeviceTable();
  loadDeviceState();
  await sendCommand("INIT");
}

function renderDeviceTable() {
  $("deviceTable").innerHTML = "";
  for (let device = 1; device <= 16; device++) {
    const info = deviceMuxInfo(device);
    const st = state.deviceStates[device];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${device}</td><td>${info.group} addr ${info.addr} / ${info.cs}</td><td>${st.mu}</td><td>${potCodeToVstartVoltage(st.mu, device).toFixed(3)}</td><td>${st.a}</td><td>${potCodeToMuVoltage(st.a, device).toFixed(3)}</td>`;
    tr.addEventListener("click", () => {
      $("potDevice").value = device;
      loadDeviceState();
    });
    $("deviceTable").appendChild(tr);
  }
}

function renderTiaConfig() {
  $("tiaConfig").innerHTML = "";
  state.tiaStates.forEach((tia, i) => {
    const row = document.createElement("div");
    row.className = "tia-row";
    const allowedDevices = TIA_DEVICE_MAP[i] || [];
    const selectedDevices = new Set((tia.devices || allowedDevices.map(String)).map(String).filter(Boolean));

    row.innerHTML = `
      <label class="checkbox"><input id="tia${i}Enabled" type="checkbox" ${tia.enabled ? "checked" : ""}/> TIA${i + 1}</label>
      <select id="tia${i}Adc">${Array.from({ length: ADC_TIA_COUNT }, (_, idx) => `AIN${idx}`).map(v => `<option ${tia.adc === v ? "selected" : ""}>${v}</option>`).join("")}</select>
      ${allowedDevices.map(device =>
        `<label class="tia-device-chip"><input id="tia${i}Device${device}" class="tia-device-input" type="checkbox" value="${device}" ${selectedDevices.has(String(device)) ? "checked" : ""}/> D${device}</label>`
      ).join("")}
    `;
    $("tiaConfig").appendChild(row);
  });
}

function syncTiaStates() {
  state.tiaStates.forEach((tia, i) => {
    tia.enabled = $(`tia${i}Enabled`).checked;
    tia.adc = $(`tia${i}Adc`).value;
    tia.devices = (TIA_DEVICE_MAP[i] || [])
      .map(device => String(device))
      .filter(device => $(`tia${i}Device${device}`)?.checked);
    tia.jumper = connectedDevicesSummary(tia);
  });
}

function connectedDevicesSummary(tia) {
  const devices = (tia.devices || []).map(value => String(value || "").trim()).filter(Boolean);
  return devices.join("+");
}



function setAdcBaselineStatus(text, kind = "") {
  const status = $("adcBaselineStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}


function renderAdcBaselineControls() {
  const table = $("adcBaselineTable");
  if (!table) return;
  const config = cloneAdcBaselineConfig(state.adcBaseline);
  state.adcBaseline = config;
  const defaultInput = $("adcBaselineDefault");
  const invertInput = $("adcBaselineInvert");
  if (defaultInput) defaultInput.value = DEFAULT_ADC_ZERO_CURRENT_V.toFixed(3);
  if (invertInput) invertInput.checked = config.invertCurrent;
  table.innerHTML = config.zeroVoltages.map((zero, adcIndex) => `
    <tr>
      <td>ADC${adcIndex}</td>
      <td><input class="adc-baseline-input" data-adc="${adcIndex}" type="number" min="0" max="${SAADC_INPUT_RANGE_V}" step="0.001" value="${zero.toFixed(4)}" /></td>
      <td>${adcBaselineFormulaText(adcIndex)}</td>
    </tr>
  `).join("");
  table.querySelectorAll(".adc-baseline-input").forEach(input => {
    input.addEventListener("change", saveAdcBaselineFromInputs);
    input.addEventListener("input", saveAdcBaselineFromInputs);
  });
  setAdcBaselineStatus(`Zero-current baseline ready. ADC7 uses non-inverted current; other ADCs follow the invert checkbox. Default ${DEFAULT_ADC_ZERO_CURRENT_V.toFixed(3)} V.`, "ok");
}

function readAdcBaselineInputs() {
  const invertCurrent = $("adcBaselineInvert")?.checked !== false;
  const zeroVoltages = Array.from({ length: ADC_TIA_COUNT }, (_, adcIndex) => {
    const input = document.querySelector(`.adc-baseline-input[data-adc="${adcIndex}"]`);
    const value = Number(input?.value);
    return Number.isFinite(value) ? clamp(value, 0, SAADC_INPUT_RANGE_V) : DEFAULT_ADC_ZERO_CURRENT_V;
  });
  return {
    zeroVoltages,
    invertCurrent,
    invertByAdc: Array.from({ length: ADC_TIA_COUNT }, (_, adcIndex) => defaultAdcInvert(adcIndex, invertCurrent)),
  };
}

function refreshCurrentDependentViews() {
  renderSweepPlot();
  if (typeof renderDeviceTunePlot === "function") renderDeviceTunePlot();
  if (typeof renderDeviceTimePlot === "function") renderDeviceTimePlot();
  if (typeof drawDeviceCalOverlay === "function") drawDeviceCalOverlay();
}

function saveAdcBaselineFromInputs() {
  state.adcBaseline = readAdcBaselineInputs();
  const saved = persistAdcBaselineConfig();
  if (saved) setAdcBaselineStatus("ADC baseline saved. ADC7 remains non-inverted unless global invert is off.", "ok");
  refreshCurrentDependentViews();
}

function applyDefaultAdcBaseline() {
  const value = clamp(Number($("adcBaselineDefault")?.value) || DEFAULT_ADC_ZERO_CURRENT_V, 0, SAADC_INPUT_RANGE_V);
  const invertCurrent = $("adcBaselineInvert")?.checked !== false;
  state.adcBaseline = {
    zeroVoltages: Array.from({ length: ADC_TIA_COUNT }, () => value),
    invertCurrent,
    invertByAdc: Array.from({ length: ADC_TIA_COUNT }, (_, adcIndex) => defaultAdcInvert(adcIndex, invertCurrent)),
  };
  persistAdcBaselineConfig();
  renderAdcBaselineControls();
  refreshCurrentDependentViews();
  setAdcBaselineStatus(`Applied ${value.toFixed(3)} V zero-current baseline to all ADCs.`, "ok");
}

function resetAdcBaseline() {
  state.adcBaseline = cloneAdcBaselineConfig();
  try { localStorage.removeItem(ADC_BASELINE_STORAGE_KEY); } catch {}
  renderAdcBaselineControls();
  refreshCurrentDependentViews();
  setAdcBaselineStatus("ADC baseline reset to 1.030 V, inverted current mode.", "ok");
}

async function captureAdcBaselineFromCurrentRead() {
  if (!state.writer) {
    setAdcBaselineStatus("Connect serial before capturing ADC baseline.", "warn");
    return;
  }
  const button = $("adcBaselineCaptureButton");
  if (button) button.disabled = true;
  try {
    syncTiaStates();
    const reply = await sendCommand("ADC", {
      waitForReply: true,
      timeoutMs: 4000,
      replyMatcher: text => {
        const upper = String(text || "").trim().toUpperCase();
        return upper.startsWith("ADC,") || upper.startsWith("ERR");
      },
    });
    const values = adcValuesFromReply(reply);
    if (!values) throw new Error(`ADC baseline capture failed: ${replySummary(reply)}`);
    const next = cloneAdcBaselineConfig(state.adcBaseline);
    let count = 0;
    values.forEach((raw, adcIndex) => {
      if (!Number.isFinite(raw)) return;
      next.zeroVoltages[adcIndex] = clamp(adcRawToVoltage(raw), 0, SAADC_INPUT_RANGE_V);
      count += 1;
    });
    state.adcBaseline = next;
    persistAdcBaselineConfig();
    renderAdcBaselineControls();
    refreshCurrentDependentViews();
    setAdcBaselineStatus(`Captured zero-current baseline from ${count} ADC channel(s).`, "ok");
  } catch (error) {
    setAdcBaselineStatus(error.message, "warn");
  } finally {
    if (button) button.disabled = false;
  }
}
function deviceDetectStatus(text, kind = "") {
  const status = $("deviceDetectStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function deviceDetectHtmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function deviceDetectNumber(id, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const input = $(id);
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = fallback;
  value = clamp(integer ? Math.round(value) : value, min, max);
  if (input) input.value = integer ? String(value) : String(value);
  return value;
}

function deviceDetectConfig() {
  const vmuV = deviceDetectNumber("deviceDetectVmu", 0);
  const vstartOnV = deviceDetectNumber("deviceDetectVstart", 4);
  const vstartOffV = deviceDetectNumber("deviceDetectVstartOff", 0);
  const thresholdUa = deviceDetectNumber("deviceDetectThreshold", 0.001, { min: 0 });
  const avg = deviceDetectNumber("deviceDetectAvg", 256, { min: 1, max: ADC_AVG_MAX, integer: true });
  const settleUs = deviceDetectNumber("deviceDetectSettleUs", 30000, { min: 0, max: 65000, integer: true });
  return {
    vmuV,
    vstartOnV,
    vstartOffV,
    thresholdUa,
    avg,
    settleUs,
    muCode: muVoltageToCode(vmuV),
    vstartOnCode: vstartVoltageToCode(vstartOnV),
    vstartOffCode: vstartVoltageToCode(vstartOffV),
    quietOthers: $("deviceDetectQuietOthers")?.checked !== false,
  };
}

function deviceDetectCodesForDevice(config, device) {
  return {
    muCode: muVoltageToCode(config.vmuV, device),
    vstartOnCode: vstartVoltageToCode(config.vstartOnV, device),
    vstartOffCode: vstartVoltageToCode(config.vstartOffV, device),
  };
}
function deviceDetectReplyMatcher(text) {
  const upper = String(text || "").trim().toUpperCase();
  return upper.startsWith("ADC,") || upper.startsWith("Q,") || /^Q\d+,/.test(upper) || upper.startsWith("ERR") || upper.startsWith("ADC,ERR");
}

function adcValuesFromReply(reply) {
  const parts = String(reply || "").replaceAll(":", ",").split(",").map(part => part.trim());
  if (parts[0]?.toUpperCase() !== "ADC" || parts[1]?.toUpperCase() === "ERR") return null;
  const values = parseAdcFields(parts.slice(1, 1 + ADC_TIA_COUNT));
  return values.some(Number.isFinite) ? values : null;
}

async function readAdcForDeviceDetect(command, timeoutMs = 4000) {
  let reply = await sendCommand(command, {
    waitForReply: true,
    timeoutMs,
    replyMatcher: deviceDetectReplyMatcher,
  });
  let upper = String(reply || "").trim().toUpperCase();
  if (!reply) throw new Error(`${command} timeout`);
  if (upper.startsWith("ERR") || upper.startsWith("ADC,ERR") || upper.startsWith("Q,ERR")) throw new Error(reply);
  if (!upper.startsWith("ADC,")) {
    reply = await sendCommand("ADC", {
      waitForReply: true,
      timeoutMs: 4000,
      replyMatcher: text => {
        const adcUpper = String(text || "").trim().toUpperCase();
        return adcUpper.startsWith("ADC,") || adcUpper.startsWith("ERR");
      },
    });
    upper = String(reply || "").trim().toUpperCase();
  }
  if (!reply || !upper.startsWith("ADC,")) throw new Error(`ADC read failed after ${command}: ${replySummary(reply)}`);
  if (upper.startsWith("ADC,ERR")) throw new Error(reply);
  return reply;
}

function deviceDetectCurrentSamples(values) {
  return Array.from({ length: ADC_TIA_COUNT }, (_, adcIndex) => {
    const raw = values?.[adcIndex];
    return Number.isFinite(raw) ? adcVoltageToCurrentUa(adcRawToVoltage(raw), adcIndex) : NaN;
  });
}

function deviceDetectFormat(value, digits = 6) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : "";
}

function deviceDetectAdcList(values, digits = 5) {
  return Array.from({ length: ADC_TIA_COUNT }, (_, adcIndex) => `ADC${adcIndex}:${deviceDetectFormat(values?.[adcIndex], digits)}`).join(" | ");
}

function setDeviceDetectControls(running) {
  state.deviceDetectRunning = running;
  [
    "deviceDetectVmu", "deviceDetectVstart", "deviceDetectVstartOff", "deviceDetectThreshold",
    "deviceDetectAvg", "deviceDetectSettleUs", "deviceDetectQuietOthers",
  ].forEach(id => {
    const control = $(id);
    if (control) control.disabled = running;
  });
  const start = $("deviceDetectStartButton");
  const stop = $("deviceDetectStopButton");
  if (start) start.disabled = running;
  if (stop) stop.disabled = !running;
  renderDeviceDetectRows();
}

function renderDeviceDetectRows() {
  const host = $("deviceDetectTable");
  if (!host) return;
  const rows = Array.isArray(state.deviceDetectRows) ? state.deviceDetectRows : [];
  if (!rows.length) {
    host.innerHTML = `<tr><td colspan="8" class="hint">No device detect result yet.</td></tr>`;
  } else {
    host.innerHTML = rows.map(row => {
      const detected = Number.isFinite(row.detectedAdc) ? `ADC${row.detectedAdc}` : "-";
      const tia = Number.isFinite(row.detectedAdc) ? `TIA${row.detectedAdc + 1}` : "-";
      const statusClass = row.status === "ok" ? "device-detect-ok" : "device-detect-warn";
      return `<tr>
        <td>D${row.device}</td>
        <td>${detected}</td>
        <td>${tia}</td>
        <td class="${statusClass}">${deviceDetectHtmlEscape(row.status || "")}</td>
        <td>${deviceDetectFormat(row.bestDelta)}</td>
        <td>${deviceDetectFormat(row.secondDelta)}</td>
        <td>${deviceDetectHtmlEscape(deviceDetectAdcList(row.deltas))}</td>
        <td>${deviceDetectHtmlEscape(deviceDetectAdcList(row.currents))}</td>
      </tr>`;
    }).join("");
  }
  const okRows = rows.filter(row => row.status === "ok" && Number.isFinite(row.detectedAdc));
  const apply = $("deviceDetectApplyButton");
  const downloadButton = $("deviceDetectDownloadButton");
  if (apply) apply.disabled = state.deviceDetectRunning || okRows.length === 0;
  if (downloadButton) downloadButton.disabled = state.deviceDetectRunning || rows.length === 0;
}

async function setDeviceDetectDacsZero() {
  const d1Code = vhighToDacCode("D1", 0);
  const d2Code = vhighToDacCode("D2", 0);
  state.dacCodes.D1 = d1Code;
  state.dacCodes.D2 = d2Code;
  await sendCommand("V1,0", { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  await sendCommand("V2,0", { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
}

async function quietDevicesForDetect(config, { ignoreStop = false } = {}) {
  for (let device = 1; device <= 16; device++) {
    if (!ignoreStop && state.deviceDetectStopRequested) break;
    const codes = deviceDetectCodesForDevice(config, device);
    await programLogicalDevice(device, codes.muCode, codes.vstartOffCode);
  }
}
function deviceDetectRankDeltas(deltas) {
  return deltas
    .map((delta, adcIndex) => ({ adcIndex, delta }))
    .filter(item => Number.isFinite(item.delta))
    .sort((a, b) => b.delta - a.delta);
}

async function detectDeviceAdcMap() {
  if (state.deviceDetectRunning) return;
  if (!state.connected || !state.writer) {
    deviceDetectStatus("Connect UART before device detect.", "warn");
    return;
  }
  const config = deviceDetectConfig();
  state.deviceDetectRows = [];
  state.deviceDetectStopRequested = false;
  setDeviceDetectControls(true);
  let restoreNeeded = false;
  try {
    deviceDetectStatus("Device detect setup: D1/D2 gate outputs to 0 mV, OS/SS configured.", "warn");
    await setDeviceDetectDacsZero();
    await sendCommand(`OS,${config.avg}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    await sendCommand(`SS,${config.settleUs}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    if (config.quietOthers) {
      restoreNeeded = true;
      deviceDetectStatus("Quieting all devices before baseline read...", "warn");
      await quietDevicesForDetect(config);
    }

    const baselineReply = await readAdcForDeviceDetect("ADC", 5000);
    const baselineRaw = adcValuesFromReply(baselineReply);
    if (!baselineRaw) throw new Error(`Bad baseline ADC reply: ${replySummary(baselineReply)}`);
    const baselineCurrents = deviceDetectCurrentSamples(baselineRaw);

    for (let device = 1; device <= 16; device++) {
      if (state.deviceDetectStopRequested) break;
      deviceDetectStatus(`Detecting D${device}/16: Vmu ${config.vmuV.toFixed(3)} V, Vstart ${config.vstartOnV.toFixed(3)} V.`, "warn");
      let reply = null;
      const codes = deviceDetectCodesForDevice(config, device);
      let usedCommand = `Q${device},${codes.muCode},${codes.vstartOnCode},255,${config.avg},${config.settleUs}`;
      try {
        reply = await readAdcForDeviceDetect(usedCommand, Math.max(5000, Math.ceil(config.settleUs / 1000) + 3000));
      } catch (error) {
        logLine(`[warn] ${usedCommand} failed: ${error.message}; falling back to P + ADC`);
        await programLogicalDevice(device, codes.muCode, codes.vstartOnCode);
        if (config.settleUs > 0) await sleep(Math.ceil(config.settleUs / 1000));
        usedCommand = `P${device}+ADC`;
        reply = await readAdcForDeviceDetect("ADC", 5000);
      }
      const raw = adcValuesFromReply(reply);
      if (!raw) throw new Error(`Bad ADC reply for D${device}: ${replySummary(reply)}`);
      const currents = deviceDetectCurrentSamples(raw);
      const deltas = currents.map((current, adcIndex) => Number.isFinite(current) ? current - (baselineCurrents[adcIndex] || 0) : NaN);
      const ranked = deviceDetectRankDeltas(deltas);
      const best = ranked[0] || null;
      const second = ranked[1] || null;
      const detectedAdc = best && best.delta >= config.thresholdUa ? best.adcIndex : null;
      state.deviceDetectRows.push({
        time: new Date().toISOString(),
        device,
        detectedAdc,
        status: detectedAdc === null ? "weak" : "ok",
        bestDelta: best?.delta ?? NaN,
        secondDelta: second?.delta ?? NaN,
        deltas,
        currents,
        raw,
        baselineRaw,
        baselineCurrents,
        command: usedCommand,
        reply,
        config: { ...config, ...codes },
      });
      renderDeviceDetectRows();
      if (config.quietOthers && !state.deviceDetectStopRequested) {
        const offCodes = deviceDetectCodesForDevice(config, device);
        await programLogicalDevice(device, offCodes.muCode, offCodes.vstartOffCode);
      }
    }

    const okRows = state.deviceDetectRows.filter(row => row.status === "ok").length;
    if (state.deviceDetectStopRequested) {
      deviceDetectStatus(`Device detect stopped: ${okRows}/${state.deviceDetectRows.length} device(s) detected.`, "warn");
    } else {
      deviceDetectStatus(`Device detect complete: ${okRows}/16 device(s) detected. Review table before applying map.`, okRows === 16 ? "ok" : "warn");
    }
  } catch (error) {
    deviceDetectStatus(`Device detect failed: ${error.message}`, "warn");
  } finally {
    if (restoreNeeded && state.writer) {
      try {
        await quietDevicesForDetect(config, { ignoreStop: true });
      } catch (error) {
        logLine(`[warn] device detect restore failed: ${error.message}`);
      }
    }
    setDeviceDetectControls(false);
  }
}

function stopDeviceDetect() {
  state.deviceDetectStopRequested = true;
  deviceDetectStatus("Device detect stop requested; current ADC read may finish first.", "warn");
}

function applyDetectedAdcMap() {
  const okRows = (state.deviceDetectRows || []).filter(row => row.status === "ok" && Number.isFinite(row.detectedAdc));
  if (!okRows.length) {
    deviceDetectStatus("No valid detected rows to apply.", "warn");
    return;
  }
  const nextMap = Array.from({ length: ADC_TIA_COUNT }, () => []);
  for (const row of okRows) {
    const adcIndex = clamp(Math.round(row.detectedAdc), 0, ADC_TIA_COUNT - 1);
    const device = clamp(Math.round(row.device), 1, 16);
    if (!nextMap[adcIndex].includes(device)) nextMap[adcIndex].push(device);
  }
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) {
    nextMap[adcIndex].sort((a, b) => a - b);
    ADC_DEVICE_MAP[adcIndex] = nextMap[adcIndex];
    const tia = state.tiaStates[adcIndex];
    if (tia) {
      tia.enabled = nextMap[adcIndex].length > 0;
      tia.adc = `AIN${adcIndex}`;
      tia.devices = nextMap[adcIndex].map(String);
      tia.jumper = connectedDevicesSummary(tia);
    }
  }
  const d1Adcs = nextMap.map((devices, adcIndex) => devices.some(device => device >= 9) ? adcIndex : null).filter(Number.isFinite);
  const d2Adcs = nextMap.map((devices, adcIndex) => devices.some(device => device <= 8) ? adcIndex : null).filter(Number.isFinite);
  if (d1Adcs.length) state.plotAdcSelection.D1 = d1Adcs;
  if (d2Adcs.length) state.plotAdcSelection.D2 = d2Adcs;
  renderTiaConfig();
  renderAdcBaselineControls();
  renderPlotAdcFilters();
  renderFitAdcOptions();
  renderDeviceCalCards();
  renderSweepPlot();
  renderDeviceDetectRows();
  const summary = nextMap.map((devices, adcIndex) => devices.length ? `ADC${adcIndex}:D${devices.join("/D")}` : null).filter(Boolean).join(", ");
  deviceDetectStatus(`Applied detected map (${okRows.length}/16): ${summary || "empty"}.`, okRows.length === 16 ? "ok" : "warn");
}

function downloadDeviceDetectCsv() {
  const rows = Array.isArray(state.deviceDetectRows) ? state.deviceDetectRows : [];
  if (!rows.length) {
    deviceDetectStatus("No device detect rows to download.", "warn");
    return;
  }
  const fields = [
    "time", "device", "detected_adc", "tia", "status", "best_delta_uA", "second_delta_uA",
    "command", "reply", "vmu_V", "vmu_code", "vstart_on_V", "vstart_on_code", "vstart_off_V", "vstart_off_code", "avg", "settle_us", "threshold_uA",
  ];
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) fields.push(`ADC${adcIndex}_raw`);
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) fields.push(`ADC${adcIndex}_baseline_uA`);
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) fields.push(`ADC${adcIndex}_current_uA`);
  for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) fields.push(`ADC${adcIndex}_delta_uA`);
  const csvRows = [fields.join(",")];
  for (const row of rows) {
    const values = {
      time: row.time,
      device: row.device,
      detected_adc: Number.isFinite(row.detectedAdc) ? `ADC${row.detectedAdc}` : "",
      tia: Number.isFinite(row.detectedAdc) ? `TIA${row.detectedAdc + 1}` : "",
      status: row.status,
      best_delta_uA: row.bestDelta,
      second_delta_uA: row.secondDelta,
      command: row.command,
      reply: row.reply,
      vmu_V: row.config?.vmuV,
      vmu_code: row.config?.muCode,
      vstart_on_V: row.config?.vstartOnV,
      vstart_on_code: row.config?.vstartOnCode,
      vstart_off_V: row.config?.vstartOffV,
      vstart_off_code: row.config?.vstartOffCode,
      avg: row.config?.avg,
      settle_us: row.config?.settleUs,
      threshold_uA: row.config?.thresholdUa,
    };
    for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) values[`ADC${adcIndex}_raw`] = row.raw?.[adcIndex];
    for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) values[`ADC${adcIndex}_baseline_uA`] = row.baselineCurrents?.[adcIndex];
    for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) values[`ADC${adcIndex}_current_uA`] = row.currents?.[adcIndex];
    for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) values[`ADC${adcIndex}_delta_uA`] = row.deltas?.[adcIndex];
    csvRows.push(fields.map(field => csvEscape(values[field])).join(","));
  }
  download(`pcb_gaussian_device_adc_detect_${Date.now()}.csv`, csvRows.join("\n"), "text/csv;charset=utf-8");
  deviceDetectStatus(`Downloaded ${rows.length} device detect row(s).`, "ok");
}
function trackFirmwareSweepPoint(dac, pointIndex) {
  const sweep = state.activeSweep;
  if (!sweep || !Number.isFinite(pointIndex)) return;
  sweep.receivedByDac[dac] = (sweep.receivedByDac[dac] || 0) + 1;
  const expectedNext = sweep.nextPointByDac[dac] ?? pointIndex;
  if (pointIndex > expectedNext) {
    sweep.missingByDac[dac] = (sweep.missingByDac[dac] || 0) + (pointIndex - expectedNext);
  }
  if (pointIndex >= expectedNext) sweep.nextPointByDac[dac] = pointIndex + 1;
}

function trackFirmwareSweepBadLine(dac) {
  const sweep = state.activeSweep;
  if (!sweep) return;
  sweep.badByDac[dac] = (sweep.badByDac[dac] || 0) + 1;
  const nowMs = performance.now();
  if (nowMs - (state.lastSweepLogMs || 0) >= SWEEP_STATUS_INTERVAL_MS) {
    state.lastSweepLogMs = nowMs;
    const progress = sweepCoverageSummary(sweep);
    setAllPlotStatus(`Live ${sweep.id}: ${sweepCapturedPointCount(sweep)} pts${sweepRetentionSuffix(sweep)}${progress ? `, ${progress}` : ""}.`);
  }
}

function sweepCoverageText(sweep, dac) {
  if (!sweep) return "";
  const expected = Number(sweep.expectedByDac?.[dac]);
  const received = Number(sweep.receivedByDac?.[dac] ?? sweep.points.filter(point => point.sweepDac === dac).length);
  const bad = Number(sweep.badByDac?.[dac] || 0);
  if (!Number.isFinite(expected) || expected <= 0) return `${received} received${bad ? `, bad ${bad}` : ""}`;
  const gapMissing = Number(sweep.missingByDac?.[dac] || 0);
  const countMissing = Math.max(0, expected - received - bad);
  const missing = Math.max(gapMissing, countMissing);
  return `received ${received}/${expected}${missing ? `, missing ${missing}` : ""}${bad ? `, bad ${bad}` : ""}`;
}

function sweepCoverageSummary(sweep) {
  if (!sweep) return "";
  return ["D1", "D2"]
    .filter(dac => sweep.expectedByDac?.[dac] || sweep.receivedByDac?.[dac] || sweep.badByDac?.[dac])
    .map(dac => `${dac} ${sweepCoverageText(sweep, dac)}`)
    .join("; ");
}
function parseFirmwareSweepReply(text) {
  const parts = text.replaceAll(":", ",").split(",").map(part => part.trim());
  const protocol = parts[0]?.toUpperCase();
  const isBase32 = protocol === "SX";
  if (protocol !== "SWEEP" && protocol !== "SX") return false;

  const kind = parts[1]?.toUpperCase();
  if (kind === "START") {
    const dac = parts[2]?.toUpperCase() || "D?";
    const expected = parseNumericField(parts[7], isBase32);
    if (state.activeSweep && Number.isFinite(expected)) {
      state.activeSweep.expectedByDac[dac] = (state.activeSweep.expectedByDac[dac] || 0) + expected;
      state.activeSweep.receivedByDac[dac] = state.activeSweep.receivedByDac[dac] || 0;
      state.activeSweep.nextPointByDac[dac] = 0;
      state.activeSweep.missingByDac[dac] = state.activeSweep.missingByDac[dac] || 0;
      state.activeSweep.badByDac[dac] = state.activeSweep.badByDac[dac] || 0;
    }
    setPlotStatus(dac, `Firmware sweep ${dac}: ${Number.isFinite(expected) ? expected : "?"} point(s) requested.`);
    return true;
  }
  if (kind === "DONE") {
    const dac = parts[2]?.toUpperCase() || "D?";
    const expected = parseNumericField(parts[3], isBase32);
    const coverage = state.activeSweep ? sweepCoverageText(state.activeSweep, dac) : `${Number.isFinite(expected) ? expected : "?"} point(s) complete`;
    setPlotStatus(dac, `Firmware sweep ${dac}: ${coverage}.`);
    return true;
  }
  if (kind === "ERR") {
    setAllPlotStatus(`Firmware sweep error: ${parts.slice(2).join(", ")}`);
    return true;
  }
  if (kind !== "D1" && kind !== "D2") return true;
  if (!state.activeSweep) return true;

  const pointIndex = parseNumericField(parts[2], isBase32);
  const code = parseNumericField(parts[3], isBase32);
  const mv = parseNumericField(parts[4], isBase32);
  const mask = isBase32 ? parseNumericField(parts[5], true) : NaN;
  const compact = isBase32 ? parseCompactBase32AdcFields(parts.slice(6), mask) : null;
  const values = isBase32 ? compact.values : parseAdcFields(parts.slice(5, 5 + ADC_TIA_COUNT));
  if (!Number.isFinite(pointIndex) || !Number.isFinite(code) || !Number.isFinite(mv) || (isBase32 && !compact.ok) || !values.some(Number.isFinite)) {
    trackFirmwareSweepBadLine(kind);
    return true;
  }

  trackFirmwareSweepPoint(kind, pointIndex);
  state.dacCodes[kind] = code;
  const snapshot = dacSnapshot();
  snapshot[kind] = { code, vhigh: mv / 1000 };
  const previousContext = state.pendingAdcContext;
  state.pendingAdcContext = {
    sweepId: state.activeSweep.id,
    pointIndex,
    dac: snapshot,
    selectedTias: state.firmwareSweepSelectedTias || selectedTias(),
    sweepDac: kind,
    pointRepeat: state.activeSweep.requests?.find(req => req.dac === kind)?.pointRepeats || 1,
  };
  recordAdcValues(values, text);
  state.pendingAdcContext = previousContext;
  return true;
}

function parseAdcReply(text) {
  const parts = text.replaceAll(":", ",").split(",").map(part => part.trim());
  if (parts[0]?.toUpperCase() === "ADC" && parts.length >= 2 && parts[1].toUpperCase() !== "ERR") {
    const values = parseAdcFields(parts.slice(1, 1 + ADC_TIA_COUNT));
    if (values.some(Number.isFinite)) recordAdcValues(values, text);
  }
}

function selectedTias() {
  syncTiaStates();
  const enabled = state.tiaStates.map((tia, idx) => tia.enabled ? idx + 1 : null).filter(Boolean);
  return enabled.length ? enabled : Array.from({ length: ADC_TIA_COUNT }, (_, idx) => idx + 1);
}

function recordAdcValues(values, source) {
  const context = state.pendingAdcContext;
  const snapshot = context?.dac || dacSnapshot();
  const fallbackDac = $("dacSelect").value;
  const fallbackCode = state.dacCodes[fallbackDac] ?? clamp(Math.round(Number($("dacCode").value) || 0), 0, DAC_MAX_CODE);
  const displayDac = context ? "D1+D2" : fallbackDac;
  const displayCode = context ? `${snapshot.D1?.code ?? ""}/${snapshot.D2?.code ?? ""}` : fallbackCode;
  const displayVhigh = context
    ? `${Number(snapshot.D1?.vhigh ?? 0).toFixed(5)}/${Number(snapshot.D2?.vhigh ?? 0).toFixed(5)}`
    : dacCodeToVhigh(fallbackDac, fallbackCode).toFixed(5);
  const tias = context?.selectedTias || selectedTias();
  for (const idx of tias) {
    const tia = state.tiaStates[idx - 1];
    const connected = connectedDevicesSummary(tia);
    const adcIndex = adcIndexFromTia(idx);
    const rawValue = adcIndex === null ? null : values[adcIndex];
    const hasRaw = Number.isFinite(rawValue);
    const raw = hasRaw ? rawValue : "";
    const voltage = hasRaw ? adcRawToVoltage(rawValue) : "";
    const current = hasRaw ? adcVoltageToCurrentUa(voltage, adcIndex) : "";
    addMeasurement({
      time: nowTime(),
      dac: displayDac,
      code: displayCode,
      vhigh: displayVhigh,
      tia: `TIA${idx}/${tia.adc}`,
      raw,
      voltage: voltage === "" ? "" : voltage.toFixed(6),
      current: current === "" ? "" : current.toFixed(6),
      jumper: connected,
      devices: connected,
      source,
    }, !context);
  }
  addSweepAdcPoint(values, context);
}
function addSweepAdcPoint(values, context) {
  if (!state.activeSweep || !context || context.sweepId !== state.activeSweep.id) return;
  const adcs = {};
  const tias = {};
  for (let adcIdx = 0; adcIdx < ADC_TIA_COUNT; adcIdx++) {
    const raw = values[adcIdx];
    if (!Number.isFinite(raw)) continue;
    const voltage = adcRawToVoltage(raw);
    const current = adcVoltageToCurrentUa(voltage, adcIdx);
    const tiaIndex = tiaIndexForAdc(adcIdx);
    const tia = state.tiaStates[tiaIndex] || state.tiaStates[adcIdx];
    const connected = connectedDevicesSummary(tia);
    const adcLabel = `ADC${adcIdx}`;
    const tiaLabel = `TIA${tiaIndex + 1}`;
    const sample = {
      raw,
      voltage,
      current,
      adc: tia.adc,
      tia: tiaLabel,
      jumper: connected,
    };
    adcs[adcLabel] = sample;
    tias[tiaLabel] = sample;
  }
  const point = {
    point: context.pointIndex,
    repeat: state.activeSweep.currentRepeat || 1,
    pointRepeat: state.pendingAdcContext?.pointRepeat || 1,
    time: nowTime(),
    sweepDac: context.sweepDac || null,
    dac: context.dac,
    adcs,
    tias,
  };
  state.activeSweep.capturedPointCount = (state.activeSweep.capturedPointCount || 0) + 1;
  queueSweepStreamPoint(state.activeSweep, point);
  retainSweepPreviewPoint(state.activeSweep, point);
  const nowMs = performance.now();
  if (nowMs - (state.activeSweep.lastStatusMs || 0) >= SWEEP_STATUS_INTERVAL_MS) {
    state.activeSweep.lastStatusMs = nowMs;
    const progress = sweepCoverageSummary(state.activeSweep);
    setAllPlotStatus(`Live ${state.activeSweep.id}: ${sweepCapturedPointCount(state.activeSweep)} pts${sweepRetentionSuffix(state.activeSweep)}${progress ? `, ${progress}` : ""}.`);
  }
  scheduleSweepPlotRender();
}
function recordMeasurement(dac, code, vhigh, source) {
  const tias = selectedTias();
  for (const idx of tias) {
    const tia = state.tiaStates[idx - 1];
    const connected = connectedDevicesSummary(tia);
    addMeasurement({
      time: nowTime(),
      dac,
      code,
      vhigh: vhigh.toFixed(5),
      tia: `TIA${idx}/${tia.adc}`,
      raw: "",
      voltage: "",
      current: "",
      jumper: connected,
      devices: connected,
      source,
    });
  }
}

function appendMeasurementRow(row) {
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${row.time}</td><td>${row.dac}</td><td>${row.code}</td><td>${row.vhigh}</td><td>${row.tia}</td><td>${row.raw}</td><td>${row.voltage}</td><td>${row.current}</td><td>${row.jumper}</td>`;
  const table = $("measurementTable");
  table.appendChild(tr);
  while (table.children.length > MEASUREMENT_TABLE_ROW_LIMIT) table.firstElementChild.remove();
}

function renderMeasurementTableTail() {
  const table = $("measurementTable");
  table.innerHTML = "";
  for (const row of state.measurements.slice(-MEASUREMENT_TABLE_ROW_LIMIT)) appendMeasurementRow(row);
}

function addMeasurement(row, render = true) {
  state.measurements.push(row);
  const overflow = state.measurements.length - MEASUREMENT_MEMORY_ROW_LIMIT;
  if (overflow > MEASUREMENT_MEMORY_TRIM_BATCH) state.measurements.splice(0, overflow);
  if (render) appendMeasurementRow(row);
}

function sweepXValue(point, xDac) {
  return Number(point.dac?.[xDac]?.vhigh ?? 0);
}

function sweepYValue(sample, mode) {
  if (mode === "raw") return sample.raw;
  if (mode === "voltage") return sample.voltage;
  return sample.current;
}

function yAxisLabel(mode) {
  if (mode === "raw") return "ADC raw";
  if (mode === "voltage") return "V_AIN (V)";
  return "I (uA)";
}

function plotSweepSource() {
  return state.activeSweep?.points.length ? state.activeSweep : state.lastSweep;
}

function plotPointsForSweep(sweep, xDac) {
  const points = sweep?.points || [];
  if (!points.length) return [];
  const estimatedStep = Math.max(1, Math.ceil(points.length / PLOT_POINT_RENDER_LIMIT));
  const out = [];
  let seen = 0;
  for (const point of points) {
    if (point.sweepDac && point.sweepDac !== xDac) continue;
    seen += 1;
    if (estimatedStep === 1 || seen % estimatedStep === 1 || seen === 1) out.push(point);
  }
  if (out.length) {
    let last = null;
    for (let idx = points.length - 1; idx >= 0; idx--) {
      const point = points[idx];
      if (!point.sweepDac || point.sweepDac === xDac) {
        last = point;
        break;
      }
    }
    if (last && out[out.length - 1] !== last) out.push(last);
  }
  return out.sort((a, b) => sweepXValue(a, xDac) - sweepXValue(b, xDac));
}

function bracketOverlayEnabled() {
  const input = $("showBracketOverlay");
  return !input || input.checked;
}

function bracketOverlayOpacity() {
  const input = $("bracketOverlayOpacity");
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = 0.35;
  value = clamp(value, 0.05, 0.9);
  if (input) input.value = value.toFixed(2);
  return value;
}

function bracketOverlaySeriesForPlot(xDac, yMode, labels, currentSweepId) {
  if (!bracketOverlayEnabled()) return [];
  const runs = Array.isArray(state.bracketRuns) ? state.bracketRuns : [];
  if (!runs.length || !labels.length) return [];
  const result = [];
  for (const run of runs) {
    const sweep = run.sweep;
    if (!sweep?.points?.length || sweep.id === currentSweepId) continue;
    const points = plotPointsForSweep(sweep, xDac);
    if (!points.length) continue;
    for (const label of labels) {
      const adcIdx = Number(label.replace("ADC", ""));
      const values = points
        .map(point => {
          const sample = point.adcs?.[label] || point.tias?.[`TIA${adcIdx + 1}`];
          if (!sample) return null;
          const x = sweepXValue(point, xDac);
          const y = sweepYValue(sample, yMode);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          return { x, y, point: point.point, repeat: point.repeat || 1 };
        })
        .filter(Boolean);
      if (values.length) result.push({ run, label, adcIdx, values });
    }
  }
  return result;
}

function drawBracketOverlaySeries(ctx, bracketSeries, sx, sy) {
  if (!bracketSeries.length) return;
  const alpha = bracketOverlayOpacity();
  ctx.save();
  for (const series of bracketSeries) {
    const color = PLOT_COLORS[series.adcIdx % PLOT_COLORS.length];
    const stepRatio = series.run.count ? series.run.stepIndex / series.run.count : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4 + stepRatio * 0.8;
    ctx.globalAlpha = alpha * (0.45 + 0.55 * stepRatio);
    if (typeof ctx.setLineDash === "function") ctx.setLineDash([5, 5]);
    ctx.beginPath();
    series.values.forEach((item, idx) => {
      const x = sx(item.x);
      const y = sy(item.y);
      const previous = series.values[idx - 1];
      const hasPointGap = previous && (item.repeat !== previous.repeat || Math.abs(Number(item.point) - Number(previous.point)) > 1);
      if (idx === 0 || hasPointGap) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
  ctx.restore();
}

function bracketOverlayStepCount(bracketSeries) {
  return new Set(bracketSeries.map(series => series.run.stepIndex)).size;
}

function setPlotAdcSelection(dac, indices) {
  const selected = (indices || [])
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value >= 0 && value < ADC_TIA_COUNT);
  state.plotAdcSelection[dac] = selected;
  document.querySelectorAll(`.plot-adc-input[data-dac="${dac}"]`).forEach(input => {
    input.checked = selected.includes(Number(input.value));
  });
}

function selectedPlotAdcs(dac) {
  const inputs = Array.from(document.querySelectorAll(`.plot-adc-input[data-dac="${dac}"]`));
  if (inputs.length) {
    const checked = inputs
      .filter(input => input.checked)
      .map(input => Number(input.value))
      .filter(Number.isFinite);
    state.plotAdcSelection[dac] = checked;
    return checked;
  }
  return state.plotAdcSelection[dac] ?? PLOT_CONFIGS[dac].defaultAdcs;
}

function renderPlotAdcFilters() {
  for (const dac of ["D1", "D2"]) {
    const config = PLOT_CONFIGS[dac];
    const host = $(config.filterId);
    if (!host) continue;
    const selected = new Set(state.plotAdcSelection[dac] || config.defaultAdcs);
    host.innerHTML = ADC_LABELS.map((label, idx) => `
      <label class="adc-filter-chip">
        <input class="plot-adc-input" data-dac="${dac}" type="checkbox" value="${idx}" ${selected.has(idx) ? "checked" : ""} />
        ${label}<span>${adcSubLabel(idx)}</span>
      </label>
    `).join("");
  }
  document.querySelectorAll(".plot-adc-input").forEach(input => {
    input.addEventListener("change", () => {
      selectedPlotAdcs(input.dataset.dac);
      renderSweepPlot();
    });
  });
}

function drawEmptyPlot(dac, message) {
  const config = PLOT_CONFIGS[dac];
  const canvas = $(config.canvasId);
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(460, Math.round(rect.width || 720));
  const height = 320;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#66737a";
  ctx.font = "14px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
  const legend = $(config.legendId);
  if (legend) legend.innerHTML = "";
}

function fixedPlotRangeEnabled() {
  const input = $("fixedPlotRange");
  return !input || input.checked;
}

function sweepXBounds(sweep, xDac, samples) {
  const fixed = (sweep?.gateProbe || fixedPlotRangeEnabled()) ? sweep?.rangeByDac?.[xDac] : null;
  if (fixed && Number.isFinite(fixed.min) && Number.isFinite(fixed.max) && fixed.min !== fixed.max) {
    return { minX: fixed.min, maxX: fixed.max };
  }
  let minX = Math.min(...samples.map(sample => sample.x));
  let maxX = Math.max(...samples.map(sample => sample.x));
  if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
  return { minX, maxX };
}
function fitOverlayEnabled() {
  const input = $("showFitOverlay");
  return !input || input.checked;
}

function fitOverlayForPlot(xDac, yMode, labels) {
  const fit = state.lastGaussianFit;
  if (!fitOverlayEnabled() || !fit) return null;
  if (fit.xDac !== xDac || fit.yMode !== yMode) return null;
  const label = `ADC${fit.adcIndex}`;
  return labels.includes(label) ? fit : null;
}

function gaussianOverlaySamples(fit, minX, maxX, count = 180) {
  const samples = [];
  const safeCount = Math.max(2, count);
  for (let i = 0; i < safeCount; i++) {
    const x = minX + (maxX - minX) * i / (safeCount - 1);
    const y = gaussianValue(fit, x);
    if (Number.isFinite(x) && Number.isFinite(y)) samples.push({ x, y });
  }
  return samples;
}

function drawGaussianOverlay(ctx, fit, overlay, sx, sy) {
  if (!fit || !overlay.length) return;
  const color = PLOT_COLORS[fit.adcIndex % PLOT_COLORS.length];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  if (typeof ctx.setLineDash === "function") ctx.setLineDash([7, 5]);
  ctx.beginPath();
  overlay.forEach((item, idx) => {
    const x = sx(item.x);
    const y = sy(item.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
  ctx.restore();
}
function renderDacSweepPlot(xDac) {
  const config = PLOT_CONFIGS[xDac];
  const sweep = plotSweepSource();
  if (!sweep || !sweep.points.length) {
    drawEmptyPlot(xDac, "Run a sweep with ADC each point enabled.");
    setPlotStatus(xDac, "No sweep data yet.");
    return;
  }

  const canvas = $(config.canvasId);
  if (!canvas) return;
  const yMode = $("plotYMode")?.value || "current";
  const adcIndices = selectedPlotAdcs(xDac);
  const labels = adcIndices.map(idx => `ADC${idx}`);
  const points = plotPointsForSweep(sweep, xDac);
  const samples = [];

  for (const point of points) {
    for (const label of labels) {
      const sample = point.adcs?.[label] || point.tias?.[`TIA${Number(label.replace("ADC", "")) + 1}`];
      if (sample) samples.push({ x: sweepXValue(point, xDac), y: sweepYValue(sample, yMode) });
    }
  }

  if (!samples.length) {
    drawEmptyPlot(xDac, `No ADC values selected for ${xDac}.`);
    setPlotStatus(xDac, `Sweep ${sweep.id}: no selected ADC samples.`);
    return;
  }

  const bracketSeries = bracketOverlaySeriesForPlot(xDac, yMode, labels, sweep.id);
  const bracketSamples = bracketSeries.flatMap(series => series.values);
  const { minX, maxX } = sweepXBounds(sweep, xDac, samples.concat(bracketSamples));
  const overlayFit = fitOverlayForPlot(xDac, yMode, labels);
  const overlaySamples = overlayFit ? gaussianOverlaySamples(overlayFit, minX, maxX) : [];
  const yValues = samples.map(sample => sample.y)
    .concat(bracketSamples.map(sample => sample.y))
    .concat(overlaySamples.map(sample => sample.y));
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);
  const fixedY = fixedPlotYBounds();
  if (fixedY) {
    minY = fixedY.minY;
    maxY = fixedY.maxY;
  } else {
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const yPad = (maxY - minY) * 0.08;
    minY -= yPad;
    maxY += yPad;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(460, Math.round(rect.width || 720));
  const height = 320;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);

  const margin = { left: 64, right: 20, top: 20, bottom: 52 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const sx = x => margin.left + (x - minX) / (maxX - minX) * plotW;
  const sy = y => margin.top + plotH - (y - minY) / (maxY - minY) * plotH;

  ctx.strokeStyle = "#d9e4e2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#66737a";
  ctx.font = "12px Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 5; i++) {
    const y = margin.top + plotH * i / 5;
    const value = maxY - (maxY - minY) * i / 5;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.fillText(value.toPrecision(4), margin.left - 8, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 5; i++) {
    const x = margin.left + plotW * i / 5;
    const value = minX + (maxX - minX) * i / 5;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.stroke();
    ctx.fillText(value.toFixed(3), x, margin.top + plotH + 8);
  }

  ctx.strokeStyle = "#17323a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(width - margin.right, margin.top + plotH);
  ctx.stroke();

  ctx.save();
  ctx.translate(18, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#17323a";
  ctx.font = "13px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText(yAxisLabel(yMode), 0, 0);
  ctx.restore();
  ctx.fillText(`${xDac} output (V)`, margin.left + plotW / 2, height - 24);

  drawBracketOverlaySeries(ctx, bracketSeries, sx, sy);

  labels.forEach((label, seriesIndex) => {
    const color = PLOT_COLORS[Number(label.replace("ADC", "")) % PLOT_COLORS.length];
    const series = points
      .map(point => ({ x: sweepXValue(point, xDac), point: point.point, repeat: point.repeat || 1, sample: point.adcs?.[label] }))
      .filter(item => item.sample)
      .map(item => ({ x: item.x, y: sweepYValue(item.sample, yMode), point: item.point, repeat: item.repeat }));
    if (!series.length) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = overlayFit ? sweepTraceOpacity() : 1;
    ctx.beginPath();
    series.forEach((item, idx) => {
      const x = sx(item.x);
      const y = sy(item.y);
      const previous = series[idx - 1];
      const hasPointGap = previous && (item.repeat !== previous.repeat || Math.abs(Number(item.point) - Number(previous.point)) > 1);
      if (idx === 0 || hasPointGap) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    for (const item of series) {
      ctx.beginPath();
      ctx.arc(sx(item.x), sy(item.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  drawGaussianOverlay(ctx, overlayFit, overlaySamples, sx, sy);

  const legendItems = labels.map(label => {
    const adcIdx = Number(label.replace("ADC", ""));
    const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
    return `<span><i style="background:${color}"></i>${label} / ${adcSubLabel(adcIdx)}</span>`;
  });
  if (overlayFit) {
    const color = PLOT_COLORS[overlayFit.adcIndex % PLOT_COLORS.length];
    legendItems.push(`<span><i style="background:repeating-linear-gradient(to right, ${color} 0 7px, transparent 7px 12px)"></i>Fit / ADC${overlayFit.adcIndex}</span>`);
  }
  const bracketSteps = bracketOverlayStepCount(bracketSeries);
  if (bracketSteps) {
    legendItems.push(`<span><i style="background:repeating-linear-gradient(to right, #17323a 0 5px, transparent 5px 10px)"></i>Bracket overlay ${bracketSteps} step(s)</span>`);
  }
  $(config.legendId).innerHTML = legendItems.join("");
  const coverage = sweepCoverageText(sweep, xDac);
  const labelText = labels.length > 3 ? `${labels.length} ADCs` : labels.join("/");
  setPlotStatus(xDac, `Sweep ${sweep.id}: ${sweepCapturedPointCount(sweep)} pts${sweepRetentionSuffix(sweep)}, ${labelText}${coverage ? `, ${coverage}` : ""}.`);
}

function renderSweepPlot() {
  renderDacSweepPlot("D1");
  renderDacSweepPlot("D2");
}
function completedSweepForFit() {
  return state.lastSweep?.points?.length ? state.lastSweep : null;
}

function setFitStatus(text, kind = "") {
  const status = $("fitStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function setGmmStatus(text, kind = "") {
  const status = $("gmmStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function renderFitAdcOptions() {
  const select = $("fitAdc");
  if (!select) return;
  select.innerHTML = ADC_LABELS.map((label, idx) => `<option value="${idx}">${label} / ${adcSubLabel(idx)}</option>`).join("");
}

function gaussianFitSeries(xDac, adcIndex, yMode) {
  const sweep = completedSweepForFit();
  if (!sweep) return [];
  const label = `ADC${adcIndex}`;
  return sweep.points
    .filter(point => !point.sweepDac || point.sweepDac === xDac)
    .map(point => {
      const sample = point.adcs?.[label];
      return sample ? { x: sweepXValue(point, xDac), y: sweepYValue(sample, yMode), point: point.point } : null;
    })
    .filter(item => item && Number.isFinite(item.x) && Number.isFinite(item.y))
    .sort((a, b) => a.x - b.x);
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;
}

function median(values) {
  const sorted = (values || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function gaussianValue(params, x) {
  const sigma = Math.max(Math.abs(params.sigma), 1e-9);
  const z = (x - params.mu) / sigma;
  return params.baseline + params.A * Math.exp(-0.5 * z * z);
}

function gaussianLoss(data, params) {
  let sse = 0;
  for (const item of data) {
    const err = gaussianValue(params, item.x) - item.y;
    sse += err * err;
  }
  return sse / Math.max(1, data.length);
}

function smoothedGaussianData(data) {
  const radius = clamp(Math.floor(data.length / 50), 1, 5);
  return data.map((item, idx) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, idx - radius); j <= Math.min(data.length - 1, idx + radius); j++) {
      sum += data[j].y;
      count += 1;
    }
    return { x: item.x, y: sum / count };
  });
}

function estimateGaussianSigma(data, baseline, A, peakIndex, minSigma, maxSigma) {
  const sign = A >= 0 ? 1 : -1;
  const half = Math.abs(A) * 0.5;
  const centerX = data[peakIndex].x;
  let left = NaN;
  let right = NaN;
  for (let i = peakIndex - 1; i >= 0; i--) {
    if (sign * (data[i].y - baseline) <= half) {
      left = data[i].x;
      break;
    }
  }
  for (let i = peakIndex + 1; i < data.length; i++) {
    if (sign * (data[i].y - baseline) <= half) {
      right = data[i].x;
      break;
    }
  }
  if (Number.isFinite(left) && Number.isFinite(right) && right > left) {
    return clamp((right - left) / 2.35482, minSigma, maxSigma);
  }
  let weightSum = 0;
  let varianceSum = 0;
  for (const item of data) {
    const weight = Math.max(0, sign * (item.y - baseline));
    weightSum += weight;
    varianceSum += weight * (item.x - centerX) ** 2;
  }
  if (weightSum > 0) return clamp(Math.sqrt(varianceSum / weightSum), minSigma, maxSigma);
  return clamp((data[data.length - 1].x - data[0].x) / 6, minSigma, maxSigma);
}

function gaussianSeedParams(data, minSigma, maxSigma) {
  const smooth = smoothedGaussianData(data);
  const ys = smooth.map(item => item.y);
  const sortedY = ys.slice().sort((a, b) => a - b);
  const tail = Math.max(3, Math.floor(sortedY.length * 0.1));
  const lowAvg = average(sortedY.slice(0, tail));
  const highAvg = average(sortedY.slice(-tail));
  const seeds = [];
  for (const sign of [1, -1]) {
    const baseline = sign > 0 ? lowAvg : highAvg;
    const residuals = smooth.map(item => sign * (item.y - baseline));
    const localPeaks = [];
    for (let i = 0; i < residuals.length; i++) {
      const left = i === 0 ? -Infinity : residuals[i - 1];
      const right = i === residuals.length - 1 ? -Infinity : residuals[i + 1];
      if (residuals[i] >= left && residuals[i] >= right && residuals[i] > 0) localPeaks.push(i);
    }
    localPeaks.sort((a, b) => residuals[b] - residuals[a]);
    const candidateIndices = localPeaks.slice(0, 8);
    let weightSum = 0;
    let weightedX = 0;
    for (let i = 0; i < smooth.length; i++) {
      const weight = Math.max(0, residuals[i]);
      weightSum += weight;
      weightedX += weight * smooth[i].x;
    }
    if (weightSum > 0) {
      const mu = weightedX / weightSum;
      let nearest = 0;
      for (let i = 1; i < smooth.length; i++) {
        if (Math.abs(smooth[i].x - mu) < Math.abs(smooth[nearest].x - mu)) nearest = i;
      }
      candidateIndices.push(nearest);
    }
    for (const idx of [...new Set(candidateIndices)]) {
      const A = sign * Math.max(Math.abs(smooth[idx].y - baseline), 1e-9);
      seeds.push({
        A,
        mu: smooth[idx].x,
        sigma: estimateGaussianSigma(smooth, baseline, A, idx, minSigma, maxSigma),
        baseline,
      });
    }
  }
  const minX = data[0].x;
  const maxX = data[data.length - 1].x;
  const midX = (minX + maxX) / 2;
  const span = Math.max(1e-6, maxX - minX);
  const midY = average(data.map(item => item.y));
  const maxY = Math.max(...data.map(item => item.y));
  const minY = Math.min(...data.map(item => item.y));
  seeds.push({ A: maxY - lowAvg, mu: midX, sigma: clamp(span / 4, minSigma, maxSigma), baseline: lowAvg });
  seeds.push({ A: minY - highAvg, mu: midX, sigma: clamp(span / 4, minSigma, maxSigma), baseline: highAvg });
  seeds.push({ A: maxY - midY, mu: midX, sigma: clamp(span / 3, minSigma, maxSigma), baseline: midY });
  return seeds.filter(seed => Number.isFinite(seed.A) && Number.isFinite(seed.mu) && Number.isFinite(seed.sigma) && Number.isFinite(seed.baseline));
}

function refineGaussianParams(data, seed, minX, maxX, minSigma, maxSigma) {
  const span = Math.max(1e-6, maxX - minX);
  const nonNegativeData = data.every(item => item.y >= 0);
  let params = {
    A: nonNegativeData ? Math.max(0, seed.A) : seed.A,
    mu: clamp(seed.mu, minX, maxX),
    sigma: clamp(Math.abs(seed.sigma), minSigma, maxSigma),
    baseline: nonNegativeData ? Math.max(0, seed.baseline) : seed.baseline,
  };
  let best = gaussianLoss(data, params);
  let steps = {
    A: Math.max(Math.abs(params.A) * 0.25, 1e-6),
    mu: span * 0.05,
    sigma: Math.max(params.sigma * 0.25, minSigma),
    baseline: Math.max(Math.abs(params.A) * 0.12, 1e-6),
  };
  for (let iter = 0; iter < 140; iter++) {
    let improved = false;
    for (const key of ["A", "mu", "sigma", "baseline"]) {
      for (const dir of [-1, 1]) {
        const next = { ...params, [key]: params[key] + dir * steps[key] };
        next.mu = clamp(next.mu, minX, maxX);
        next.sigma = clamp(Math.abs(next.sigma), minSigma, maxSigma);
        if (nonNegativeData) {
          next.A = Math.max(0, next.A);
          next.baseline = Math.max(0, next.baseline);
        }
        const loss = gaussianLoss(data, next);
        if (loss < best) {
          params = next;
          best = loss;
          improved = true;
        }
      }
    }
    if (!improved) {
      for (const key of Object.keys(steps)) steps[key] *= 0.55;
      if (Math.max(...Object.values(steps)) < 1e-9) break;
    }
  }
  return { params, loss: best };
}

function fitGaussianData(data) {
  if (!data || data.length < 6) throw new Error("At least 6 sweep points are required for Gaussian fitting.");
  const clean = data.slice().sort((a, b) => a.x - b.x);
  const xs = clean.map(item => item.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(1e-6, maxX - minX);
  const minSigma = span / 500;
  const maxSigma = span * 2;
  const seeds = gaussianSeedParams(clean, minSigma, maxSigma);
  if (!seeds.length) throw new Error("Could not build Gaussian fit candidates.");
  let bestFit = null;
  for (const seed of seeds) {
    const fit = refineGaussianParams(clean, seed, minX, maxX, minSigma, maxSigma);
    if (!bestFit || fit.loss < bestFit.loss) bestFit = fit;
  }
  const params = bestFit.params;
  const meanY = average(clean.map(item => item.y));
  const sse = clean.reduce((sum, item) => sum + (gaussianValue(params, item.x) - item.y) ** 2, 0);
  const sst = clean.reduce((sum, item) => sum + (item.y - meanY) ** 2, 0);
  const edgeMargin = span * 0.03;
  const edgeLocked = params.mu <= minX + edgeMargin || params.mu >= maxX - edgeMargin;
  return { ...params, r2: sst > 0 ? 1 - sse / sst : 1, rmse: Math.sqrt(sse / clean.length), points: clean.length, edgeLocked };
}
function gaussianCenterY(fit) {
  return Number(fit.baseline) + Number(fit.A);
}

function readGaussianTargetOrNull() {
  const target = { A: Number($("fitTargetA")?.value), mu: Number($("fitTargetMu")?.value), sigma: NaN };
  return [target.A, target.mu].every(Number.isFinite) ? target : null;
}

function renderGaussianTargetError(fit) {
  const target = readGaussianTargetOrNull();
  if (!target) {
    return { html: `<div>target error<strong>-</strong></div><div>target status<strong>-</strong></div>`, text: "" };
  }
  const error = gaussianTargetError(fit, target);
  return {
    html: `<div>target error<strong>A_amp ${error.aError.toPrecision(4)} / mu ${error.muError.toFixed(5)} V</strong></div><div>target status<strong>${error.converged ? "within tol" : `norm ${error.norm.toFixed(3)}`}</strong></div>`,
    text: ` ${formatTargetError(error)}.`,
  };
}
function renderGaussianFit(fit) {
  const grid = $("fitResultGrid");
  if (!grid) return;
  if (!fit) {
    grid.innerHTML = `<div>A amp<strong>-</strong></div><div>center y<strong>-</strong></div><div>mu<strong>-</strong></div><div>sigma<strong>-</strong></div><div>R2<strong>-</strong></div><div>target error<strong>-</strong></div><div>target status<strong>-</strong></div>`;
    return;
  }
  const targetInfo = renderGaussianTargetError(fit);
  grid.innerHTML = `
    <div>A amp<strong>${fit.A.toPrecision(5)}</strong></div>
    <div>center y<strong>${gaussianCenterY(fit).toPrecision(5)}</strong></div>
    <div>mu<strong>${fit.mu.toFixed(5)} V${fit.edgeLocked ? " edge" : ""}</strong></div>
    <div>sigma<strong>${Math.abs(fit.sigma).toFixed(5)} V</strong></div>
    <div>R2<strong>${fit.r2.toFixed(4)}</strong></div>
    <div>baseline<strong>${fit.baseline.toPrecision(5)}</strong></div>
    <div>RMSE<strong>${fit.rmse.toPrecision(4)}</strong></div>
    <div>points<strong>${fit.points}</strong></div>
    <div>trace<strong>${fit.xDac} / ADC${fit.adcIndex}</strong></div>
    ${targetInfo.html}
  `;
}

function fitSelectedGaussian(options = {}) {
  try {
    const xDac = $("fitXDac").value;
    const adcIndex = clamp(Math.round(Number($("fitAdc").value) || 0), 0, ADC_TIA_COUNT - 1);
    const yMode = $("fitYMode").value;
    const data = gaussianFitSeries(xDac, adcIndex, yMode);
    const fit = { ...fitGaussianData(data), xDac, adcIndex, yMode, data };
    state.lastGaussianFit = fit;
    if (!(options && options.updateTarget === false)) {
      $("fitTargetMu").value = fit.mu.toFixed(5);
      $("fitTargetA").value = fit.A.toPrecision(6);
    }
    renderGaussianFit(fit);
    renderSweepPlot();
    const targetInfo = renderGaussianTargetError(fit);
    const edgeNote = fit.edgeLocked ? " Center is near sweep edge; check selected trace or widen sweep range." : "";
    const peakNote = ` A_amp=${fit.A.toPrecision(5)}, center_y=${gaussianCenterY(fit).toPrecision(5)}.`;
    setFitStatus(`Fit complete: ${fit.points} point(s), R2=${fit.r2.toFixed(4)}.${peakNote}${targetInfo.text}${edgeNote}`, fit.r2 > 0.85 && !fit.edgeLocked ? "ok" : "warn");
    return fit;
  } catch (error) {
    setFitStatus(error.message, "warn");
    return null;
  }
}

function logicalMuCodeForDevice(device) {
  return clamp(Math.round(Number(state.deviceStates[device]?.a ?? $("aCode").value) || 0), 0, POT_MAX_CODE);
}

function logicalVstartCodeForDevice(device) {
  return clamp(Math.round(Number(state.deviceStates[device]?.mu ?? $("muCode").value) || 0), 0, POT_MAX_CODE);
}

function logicalACodeForDevice(device) {
  return logicalVstartCodeForDevice(device);
}

function adjustmentPlanForFit(device, target, fit, muGain, vstartGain, muVstartGain = 1) {
  const currentMuCode = logicalMuCodeForDevice(device);
  const currentVstartCode = logicalVstartCodeForDevice(device);
  const currentMuV = potCodeToMuVoltage(currentMuCode, device);
  const currentVstartV = potCodeToVstartVoltage(currentVstartCode, device);
  const muError = target.mu - fit.mu;
  const ampError = target.A - fit.A;
  const muControlDelta = muError * muGain;
  const vstartCoupledDelta = -muControlDelta * muVstartGain;
  const vstartAmplitudeDelta = ampError * vstartGain;
  const nextMuV = currentMuV + muControlDelta;
  const nextVstartV = currentVstartV + vstartCoupledDelta + vstartAmplitudeDelta;
  const nextMuCode = muVoltageToCode(nextMuV, device);
  const nextVstartCode = vstartVoltageToCode(nextVstartV, device);
  return {
    mode: "fit",
    device,
    target,
    fit,
    currentMuCode,
    currentVstartCode,
    currentMuV,
    currentVstartV,
    nextMuV,
    nextVstartV,
    nextMuCode,
    nextVstartCode,
    muControlDelta,
    vstartCoupledDelta,
    vstartAmplitudeDelta,
    currentACode: currentVstartCode,
    currentAV: currentVstartV,
    nextAV: nextVstartV,
    nextACode: nextVstartCode,
  };
}

function directPlanForTarget(device, target) {
  const nextMuCode = muVoltageToCode(target.mu, device);
  const nextVstartCode = vstartVoltageToCode(target.A, device);
  const currentVstartCode = logicalVstartCodeForDevice(device);
  return {
    mode: "direct",
    device,
    target,
    currentMuCode: logicalMuCodeForDevice(device),
    currentVstartCode,
    nextMuV: target.mu,
    nextVstartV: target.A,
    nextMuCode,
    nextVstartCode,
    currentACode: currentVstartCode,
    nextAV: target.A,
    nextACode: nextVstartCode,
  };
}

function gaussianAdjustPlan(options = {}) {
  const fit = state.lastGaussianFit;
  if (!fit) throw new Error("Run Gaussian fit first.");
  const device = deviceMuxInfo($("fitDevice").value).device;
  const targetMu = Number($("fitTargetMu").value);
  const targetA = Number($("fitTargetA").value);
  const muGain = Number(options.muGain ?? $("fitMuGain").value) || 1;
  const vstartGain = Number(options.vstartGain ?? options.aGain ?? $("fitAGain").value) || 1;
  const muVstartGain = Number(options.muVstartGain ?? $("fitMuVstartGain")?.value) || 1;
  if (![targetMu, targetA].every(Number.isFinite)) throw new Error("Target A_amp/mu values are invalid.");
  return adjustmentPlanForFit(device, { A: targetA, mu: targetMu, sigma: Math.abs(fit.sigma) }, fit, muGain, vstartGain, muVstartGain);
}

function renderGaussianAdjustPlan(plan) {
  if (!plan) return;
  const errorText = plan.fit ? ` ${formatTargetError(gaussianTargetError(plan.fit, plan.target))}.` : "";
  const vstartDelta = Number.isFinite(plan.nextVstartV) && Number.isFinite(plan.currentVstartV) ? plan.nextVstartV - plan.currentVstartV : NaN;
  const couplingText = plan.mode === "fit" && Number.isFinite(vstartDelta)
    ? `; Vstart delta ${vstartDelta.toFixed(4)} V = opposite mu link ${plan.vstartCoupledDelta.toFixed(4)} + A_amp correction ${plan.vstartAmplitudeDelta.toFixed(4)}`
    : "";
  setFitStatus(`Device ${plan.device}: mu ${plan.currentMuCode}->${plan.nextMuCode} (${plan.nextMuV.toFixed(4)} V), Vstart ${plan.currentVstartCode}->${plan.nextVstartCode} (${plan.nextVstartV.toFixed(4)} V)${couplingText}.${errorText}`, "ok");
}

function previewGaussianAdjust() {
  try {
    renderGaussianAdjustPlan(gaussianAdjustPlan());
  } catch (error) {
    setFitStatus(error.message, "warn");
  }
}

async function programLogicalDevice(device, logicalMuCode, logicalVstartCode) {
  const muCode = clamp(Math.round(Number(logicalMuCode) || 0), 0, POT_MAX_CODE);
  const vstartCode = clamp(Math.round(Number(logicalVstartCode) || 0), 0, POT_MAX_CODE);
  state.deviceStates[device].a = muCode;
  state.deviceStates[device].mu = vstartCode;

  if (firmwareSupportsPairProgram()) {
    const pairReply = await sendCommand(`P${device},${muCode},${vstartCode}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    if (!replyLooksBad(pairReply)) return;
    logLine(`[warn] logical pair device ${device} ${replySummary(pairReply)}; falling back to A/M`);
  }

  const muReply = await sendCommand(`A${device},${muCode}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  if (replyLooksBad(muReply)) logLine(`[warn] logical mu device ${device} ${replySummary(muReply)}`);
  const vstartReply = await sendCommand(`M${device},${vstartCode}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  if (replyLooksBad(vstartReply)) logLine(`[warn] logical Vstart device ${device} ${replySummary(vstartReply)}`);
}

async function programGaussianAdjust() {
  try {
    const plan = gaussianAdjustPlan();
    await programLogicalDevice(plan.device, plan.nextMuCode, plan.nextVstartCode ?? plan.nextACode);
    applyProgrammedPlanToUi(plan);
    renderGaussianAdjustPlan(plan);
  } catch (error) {
    setFitStatus(error.message, "warn");
  }
}

function parseDeviceList(text) {
  const out = [];
  const pushDevice = value => {
    const device = Math.round(Number(value));
    if (Number.isFinite(device) && device >= 1 && device <= 16 && !out.includes(device)) out.push(device);
  };
  for (const token of String(text || "").split(/[\s,;]+/).map(item => item.trim()).filter(Boolean)) {
    if (/^all$/i.test(token)) {
      for (let device = 1; device <= 16; device++) pushDevice(device);
      continue;
    }
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Math.round(Number(range[1]));
      const stop = Math.round(Number(range[2]));
      const step = start <= stop ? 1 : -1;
      for (let device = start; step > 0 ? device <= stop : device >= stop; device += step) pushDevice(device);
      continue;
    }
    pushDevice(token);
  }
  return out;
}

function parseGmmTargetRows(text) {
  return String(text || "").split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const values = line.split(/[\s,;]+/).map(Number).filter(Number.isFinite);
      if (values.length < 3) throw new Error(`GMM row ${idx + 1} needs A_amp(or Vstart), mu, sigma.`);
      return { A: values[0], mu: values[1], sigma: Math.abs(values[2]) };
    });
}

function selectedFitAdcs(xDac) {
  const selected = selectedPlotAdcs(xDac);
  return selected.length ? selected : ADC_LABELS.map((_, idx) => idx);
}

function adcIndexForDevice(device, fallbackIndex, xDac) {
  const mapped = adcIndexFromMappedDevice(device);
  if (mapped !== null) return mapped;
  syncTiaStates();
  for (let adcIndex = 0; adcIndex < state.tiaStates.length; adcIndex++) {
    const devices = state.tiaStates[adcIndex].devices || [];
    if (devices.some(value => Number(value) === device)) return adcIndex;
  }
  const adcs = selectedFitAdcs(xDac);
  return adcs[fallbackIndex % adcs.length];
}

function gmmPlan(options = {}) {
  const devices = parseDeviceList($("gmmDevices").value);
  const targets = parseGmmTargetRows($("gmmTarget").value);
  if (!devices.length) throw new Error("Select at least one device.");
  if (!targets.length) throw new Error("Enter at least one target Gaussian row.");
  if (targets.length !== devices.length) throw new Error(`Target rows (${targets.length}) must match selected devices (${devices.length}).`);
  const mode = $("gmmMode")?.value || "fit";
  if (mode === "direct") {
    return devices.map((device, idx) => directPlanForTarget(device, targets[idx]));
  }
  const xDac = $("fitXDac").value;
  const yMode = $("fitYMode").value;
  const muGain = Number(options.muGain ?? $("fitMuGain").value) || 1;
  const vstartGain = Number(options.vstartGain ?? options.aGain ?? $("fitAGain").value) || 1;
  const muVstartGain = Number(options.muVstartGain ?? $("fitMuVstartGain")?.value) || 1;
  return devices.map((device, idx) => {
    const adcIndex = adcIndexForDevice(device, idx, xDac);
    const data = gaussianFitSeries(xDac, adcIndex, yMode);
    const fit = { ...fitGaussianData(data), xDac, adcIndex, yMode, data };
    return adjustmentPlanForFit(device, targets[idx], fit, muGain, vstartGain, muVstartGain);
  });
}
function renderGmmPlan(plan) {
  const host = $("gmmPlan");
  if (!host) return;
  state.lastGmmPlan = plan || [];
  host.innerHTML = (plan || []).map(item => {
    const currentVstartCode = item.currentVstartCode ?? item.currentACode;
    const nextVstartCode = item.nextVstartCode ?? item.nextACode;
    const codeText = `mu ${item.currentMuCode}->${item.nextMuCode}, Vstart ${currentVstartCode}->${nextVstartCode}`;
    const targetText = item.mode === "direct"
      ? `target Vstart=${item.target.A}, mu=${item.target.mu}, sigma=${item.target.sigma}`
      : `target A_amp=${item.target.A}, mu=${item.target.mu}, sigma=${item.target.sigma}`;
    if (item.mode === "fit") {
      return `
        <div>
          Device ${item.device} / ADC${item.fit.adcIndex}<strong>${codeText}</strong>
          <span>${targetText}; fit A_amp=${item.fit.A.toPrecision(4)}, center_y=${gaussianCenterY(item.fit).toPrecision(4)}, mu=${item.fit.mu.toFixed(4)}, sigma=${Math.abs(item.fit.sigma).toFixed(4)}, R2=${item.fit.r2.toFixed(3)}; ${formatTargetError(gaussianTargetError(item.fit, item.target))}</span>
        </div>
      `;
    }
    return `
      <div>
        Device ${item.device}<strong>${codeText}</strong>
        <span>${targetText}; direct Vstart/mu voltage mode</span>
      </div>
    `;
  }).join("");
}

function previewGmm() {
  try {
    const plan = gmmPlan();
    renderGmmPlan(plan);
    const mode = $("gmmMode")?.value || "fit";
    setGmmStatus(`Prepared ${plan.length} ${mode === "fit" ? "fit" : "direct"} target(s).`, "ok");
  } catch (error) {
    renderGmmPlan([]);
    setGmmStatus(error.message, "warn");
  }
}

async function programGmm() {
  try {
    const plan = state.lastGmmPlan.length ? state.lastGmmPlan : gmmPlan();
    for (const item of plan) await programLogicalDevice(item.device, item.nextMuCode, item.nextVstartCode ?? item.nextACode);
    renderDeviceTable();
    loadDeviceState();
    renderGmmPlan(plan);
    setGmmStatus(`Programmed ${plan.length} device target(s).`, "ok");
  } catch (error) {
    setGmmStatus(error.message, "warn");
  }
}
function autoFitMaxIterations() {
  const input = $("autoFitMaxIter");
  const value = clamp(Math.round(Number(input?.value) || 6), 1, 50);
  if (input) input.value = value;
  return value;
}

function autoFitLearningRate() {
  const input = $("autoFitLearningRate");
  const value = clamp(Number(input?.value) || 0.5, 0.01, 2);
  if (input) input.value = value;
  return value;
}

function autoFitTolerances() {
  const muInput = $("autoFitMuTol");
  const aInput = $("autoFitATol");
  const muTol = Math.max(0, Number(muInput?.value) || 0);
  const aTol = Math.max(0, Number(aInput?.value) || 0);
  if (muInput) muInput.value = muTol;
  if (aInput) aInput.value = aTol;
  return { muTol, aTol };
}

function autoFitControlGains() {
  const lr = autoFitLearningRate();
  const vstartGain = (Number($("fitAGain").value) || 1) * lr;
  return {
    learningRate: lr,
    muGain: (Number($("fitMuGain").value) || 1) * lr,
    vstartGain,
    aGain: vstartGain,
    muVstartGain: Number($("fitMuVstartGain")?.value) || 1,
  };
}

function gaussianTargetError(fit, target, tolerances = autoFitTolerances()) {
  const muError = Number(target.mu) - Number(fit.mu);
  const aError = Number(target.A) - Number(fit.A);
  const muScale = tolerances.muTol > 0 ? Math.abs(muError) / tolerances.muTol : Math.abs(muError);
  const aScale = tolerances.aTol > 0 ? Math.abs(aError) / tolerances.aTol : Math.abs(aError);
  const norm = Math.max(muScale, aScale);
  return {
    muError,
    aError,
    sigmaError: Number.isFinite(Number(target.sigma)) ? Number(target.sigma) - Math.abs(Number(fit.sigma)) : NaN,
    muScale,
    aScale,
    norm,
    converged: norm <= 1,
  };
}

function formatTargetError(error) {
  const sigmaText = Number.isFinite(error.sigmaError) ? `, sigma=${error.sigmaError.toFixed(5)} V` : "";
  return `err A_amp=${error.aError.toPrecision(4)}, mu=${error.muError.toFixed(5)} V${sigmaText}, norm(A_amp/mu)=${error.norm.toFixed(3)}`;
}

function singleAutoTarget() {
  const target = readGaussianTargetOrNull();
  if (!target) throw new Error("Target A_amp/mu values are invalid.");
  return target;
}

function applyProgrammedPlanToUi(plan) {
  $("potDevice").value = plan.device;
  $("aCode").value = plan.nextMuCode;
  $("muCode").value = plan.nextVstartCode ?? plan.nextACode;
  updatePotReadout();
  renderDeviceTable();
}

function planHasCodeChange(plan) {
  return plan.currentMuCode !== plan.nextMuCode || (plan.currentVstartCode ?? plan.currentACode) !== (plan.nextVstartCode ?? plan.nextACode);
}

function localParamCodeStepVoltage(param, code, device = null) {
  const safeCode = clamp(Math.round(Number(code) || 0), 0, POT_MAX_CODE);
  const here = paramCodeToVoltage(param, safeCode, device);
  const candidates = [];
  if (safeCode > 0) candidates.push(Math.abs(here - paramCodeToVoltage(param, safeCode - 1, device)));
  if (safeCode < POT_MAX_CODE) candidates.push(Math.abs(paramCodeToVoltage(param, safeCode + 1, device) - here));
  const finite = candidates.filter(value => Number.isFinite(value) && value > 0);
  return finite.length ? Math.min(...finite) : NaN;
}

function formatSignedDelta(value, digits = 5) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "n/a";
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(digits)} V`;
}

function unchangedPlanDetails(plan) {
  if (!plan) return "no adjustment plan";
  const currentVstartCode = plan.currentVstartCode ?? plan.currentACode;
  const nextVstartCode = plan.nextVstartCode ?? plan.nextACode;
  const requestedMuDelta = Number(plan.requestedNextMuV) - Number(plan.currentMuV);
  const requestedVstartDelta = Number(plan.requestedNextVstartV) - Number(plan.currentVstartV);
  const appliedMuDelta = Number(plan.nextMuV) - Number(plan.currentMuV);
  const appliedVstartDelta = Number(plan.nextVstartV) - Number(plan.currentVstartV);
  const muCodeStep = localParamCodeStepVoltage("mu", plan.currentMuCode, plan.device);
  const vstartCodeStep = localParamCodeStepVoltage("A", currentVstartCode, plan.device);
  const reasons = [];
  const vstartClamped = plan.vstartBoundaryGuardApplied || (Number.isFinite(Number(plan.requestedNextVstartV)) && Number.isFinite(Number(plan.nextVstartV)) && Math.abs(Number(plan.requestedNextVstartV) - Number(plan.nextVstartV)) > 1e-9);
  const muClamped = Number.isFinite(Number(plan.requestedNextMuV)) && Number.isFinite(Number(plan.nextMuV)) && Math.abs(Number(plan.requestedNextMuV) - Number(plan.nextMuV)) > 1e-9;
  if (Number.isFinite(muCodeStep) && Math.abs(appliedMuDelta) < muCodeStep && !muClamped) reasons.push("Vmu step below 1 code");
  if (Number.isFinite(vstartCodeStep) && Math.abs(appliedVstartDelta) < vstartCodeStep && !vstartClamped) reasons.push("Vstart step below 1 code");
  if (vstartClamped) reasons.push("Vstart range clamp");
  if (muClamped) reasons.push("Vmu range clamp");
  if (plan.lossBackoffApplied) reasons.push(`LM backoff${plan.lossBackoffReason ? ` (${plan.lossBackoffReason})` : ""}`);
  if (plan.jacobianStepLimited) reasons.push("step limit");
  if (!reasons.length) reasons.push("rounded to same MAX5488 code");
  return `mu code ${plan.currentMuCode}->${plan.nextMuCode}, Vstart code ${currentVstartCode}->${nextVstartCode}; ` +
    `requested dVmu ${formatSignedDelta(requestedMuDelta)}, dVstart ${formatSignedDelta(requestedVstartDelta)}; ` +
    `applied dVmu ${formatSignedDelta(appliedMuDelta)}, dVstart ${formatSignedDelta(appliedVstartDelta)}; ` +
    `1-code step mu ${formatSignedDelta(muCodeStep)}, Vstart ${formatSignedDelta(vstartCodeStep)}; ` +
    `reason: ${reasons.join(", ")}`;
}

function unchangedPlanStopMessage(prefix, plan, error) {
  return `${prefix} stopped: code unchanged (${unchangedPlanDetails(plan)}). ${formatTargetError(error)}.`;
}

function adjacentParamCodeForVoltageDelta(param, currentCode, desiredDeltaV, device = null) {
  const safeCode = clamp(Math.round(Number(currentCode) || 0), 0, POT_MAX_CODE);
  const desired = Number(desiredDeltaV);
  if (!Number.isFinite(desired) || Math.abs(desired) < 1e-12) return safeCode;
  const currentV = paramCodeToVoltage(param, safeCode, device);
  const candidates = [];
  for (const code of [safeCode - 1, safeCode + 1]) {
    if (code < 0 || code > POT_MAX_CODE) continue;
    const voltage = paramCodeToVoltage(param, code, device);
    const delta = voltage - currentV;
    if (Number.isFinite(delta) && Math.sign(delta) === Math.sign(desired)) {
      candidates.push({ code, delta, distance: Math.abs(delta - desired) });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.length ? candidates[0].code : safeCode;
}

function planWithMinimumCodeNudge(plan) {
  if (!plan || planHasCodeChange(plan)) return plan;
  const nudged = { ...plan };
  const axes = [];
  const requestedMuDelta = Number(plan.requestedNextMuV) - Number(plan.currentMuV);
  const muCode = adjacentParamCodeForVoltageDelta("mu", plan.currentMuCode, requestedMuDelta, plan.device);
  if (muCode !== plan.currentMuCode) {
    nudged.nextMuCode = muCode;
    nudged.nextMuV = paramCodeToVoltage("mu", muCode, plan.device);
    axes.push("Vmu");
  }
  const currentVstartCode = plan.currentVstartCode ?? plan.currentACode;
  const requestedVstartDelta = Number(plan.requestedNextVstartV) - Number(plan.currentVstartV);
  const vstartCode = adjacentParamCodeForVoltageDelta("A", currentVstartCode, requestedVstartDelta, plan.device);
  if (vstartCode !== currentVstartCode) {
    nudged.nextVstartCode = vstartCode;
    nudged.nextACode = vstartCode;
    nudged.nextVstartV = paramCodeToVoltage("A", vstartCode, plan.device);
    nudged.nextAV = nudged.nextVstartV;
    axes.push("Vstart");
  }
  if (!axes.length || !planHasCodeChange(nudged)) return null;
  nudged.minimumCodeNudgeApplied = true;
  nudged.minimumCodeNudgeAxes = axes;
  return nudged;
}

function minimumCodeNudgeText(plan) {
  const axes = Array.isArray(plan?.minimumCodeNudgeAxes) ? plan.minimumCodeNudgeAxes.join("/") : "unknown";
  const currentVstartCode = plan.currentVstartCode ?? plan.currentACode;
  const nextVstartCode = plan.nextVstartCode ?? plan.nextACode;
  return `minimum 1-code nudge ${axes}: mu code ${plan.currentMuCode}->${plan.nextMuCode}, Vstart code ${currentVstartCode}->${nextVstartCode}`;
}

function gmmErrorSummary(plan, tolerances = autoFitTolerances()) {
  const errors = plan
    .filter(item => item.mode === "fit" && item.fit)
    .map(item => ({ item, error: gaussianTargetError(item.fit, item.target, tolerances) }));
  if (!errors.length) return { errors, maxNorm: Infinity, converged: false };
  const maxNorm = Math.max(...errors.map(entry => entry.error.norm));
  return { errors, maxNorm, converged: maxNorm <= 1 };
}

function setAutoFitControlsDisabled(disabled) {
  ["autoFitSingleButton", "autoFitGmmButton"].forEach(id => { const el = $(id); if (el) el.disabled = disabled; });
  const stop = $("stopAutoFitButton");
  if (stop) stop.disabled = !disabled;
}

async function runAutoSweep(label, statusSetter) {
  const before = state.sweepCounter;
  statusSetter(`${label}: sweeping...`);
  await startSweep();
  if (!state.lastSweep?.points?.length || state.lastSweep.id <= before) {
    throw new Error("Auto fit did not capture a completed sweep.");
  }
  return state.lastSweep;
}

function stopAutoFit() {
  state.autoFitStopRequested = true;
  state.sweepRunning = false;
  setFitStatus("Auto fit stop requested.", "warn");
  setGmmStatus("Auto fit stop requested.", "warn");
}

async function autoFitSingle() {
  if (state.autoFitRunning) return;
  state.autoFitRunning = true;
  state.autoFitStopRequested = false;
  setAutoFitControlsDisabled(true);
  try {
    const maxIter = autoFitMaxIterations();
    const tolerances = autoFitTolerances();
    const target = singleAutoTarget();
    state.autoFitHistory = [];
    for (let iter = 1; iter <= maxIter; iter++) {
      if (state.autoFitStopRequested) break;
      await runAutoSweep(`Auto single ${iter}/${maxIter}`, text => setFitStatus(text));
      const fit = fitSelectedGaussian({ updateTarget: false });
      $("fitTargetMu").value = target.mu;
      $("fitTargetA").value = target.A;
      if (!fit) throw new Error("Gaussian fit failed during auto single.");
      const error = gaussianTargetError(fit, target, tolerances);
      state.autoFitHistory.push({ mode: "single", iter, fit, target, error });
      if (error.converged) {
        setFitStatus(`Auto single converged at ${iter}/${maxIter}: ${formatTargetError(error)}.`, "ok");
        return;
      }
      const gains = autoFitControlGains();
      const device = deviceMuxInfo($("fitDevice").value).device;
      let plan = adjustmentPlanForFit(device, target, fit, gains.muGain, gains.vstartGain, gains.muVstartGain);
      renderGaussianAdjustPlan(plan);
      if (!planHasCodeChange(plan)) {
        const nudgedPlan = planWithMinimumCodeNudge(plan);
        if (!nudgedPlan) {
          setFitStatus(unchangedPlanStopMessage("Auto single", plan, error), "warn");
          return;
        }
        plan = nudgedPlan;
        renderGaussianAdjustPlan(plan);
      }
      await programLogicalDevice(plan.device, plan.nextMuCode, plan.nextVstartCode ?? plan.nextACode);
      applyProgrammedPlanToUi(plan);
      const nudgeText = plan.minimumCodeNudgeApplied ? `, ${minimumCodeNudgeText(plan)}` : "";
      setFitStatus(`Auto single ${iter}/${maxIter}: programmed${nudgeText}, ${formatTargetError(error)}, lr=${gains.learningRate}, mu->-Vstart=${gains.muVstartGain}.`, "warn");
    }
    if (state.autoFitStopRequested) {
      setFitStatus(`Auto single stopped at ${state.autoFitHistory.length}/${maxIter}.`, "warn");
      return;
    }
    setFitStatus(`Auto single reached max iter ${maxIter}.`, "warn");
  } catch (error) {
    setFitStatus(error.message, "warn");
  } finally {
    state.autoFitRunning = false;
    setAutoFitControlsDisabled(false);
  }
}

async function autoFitGmm() {
  if (state.autoFitRunning) return;
  state.autoFitRunning = true;
  state.autoFitStopRequested = false;
  setAutoFitControlsDisabled(true);
  try {
    if (($("gmmMode")?.value || "fit") !== "fit") throw new Error("Auto GMM requires Fit measured curves mode.");
    const maxIter = autoFitMaxIterations();
    const tolerances = autoFitTolerances();
    state.autoFitHistory = [];
    for (let iter = 1; iter <= maxIter; iter++) {
      if (state.autoFitStopRequested) break;
      await runAutoSweep(`Auto GMM ${iter}/${maxIter}`, text => setGmmStatus(text));
      const gains = autoFitControlGains();
      const plan = gmmPlan({ muGain: gains.muGain, vstartGain: gains.vstartGain, muVstartGain: gains.muVstartGain });
      const summary = gmmErrorSummary(plan, tolerances);
      renderGmmPlan(plan);
      state.autoFitHistory.push({ mode: "gmm", iter, plan, summary });
      if (summary.converged) {
        setGmmStatus(`Auto GMM converged at ${iter}/${maxIter}: max norm=${summary.maxNorm.toFixed(3)}.`, "ok");
        return;
      }
      if (!plan.some(planHasCodeChange)) {
        setGmmStatus(`${unchangedPlanStopMessage("Auto GMM", plan[0], summary.errors?.[0]?.error || { aError: NaN, muError: NaN, norm: summary.maxNorm })} max norm=${summary.maxNorm.toFixed(3)}.`, "warn");
        return;
      }
      for (const item of plan) await programLogicalDevice(item.device, item.nextMuCode, item.nextVstartCode ?? item.nextACode);
      renderDeviceTable();
      loadDeviceState();
      setGmmStatus(`Auto GMM ${iter}/${maxIter}: programmed ${plan.length} device(s), max norm=${summary.maxNorm.toFixed(3)}, lr=${gains.learningRate}, mu->-Vstart=${gains.muVstartGain}.`, "warn");
    }
    if (state.autoFitStopRequested) {
      setGmmStatus(`Auto GMM stopped at ${state.autoFitHistory.length}/${maxIter}.`, "warn");
      return;
    }
    setGmmStatus(`Auto GMM reached max iter ${maxIter}.`, "warn");
  } catch (error) {
    setGmmStatus(error.message, "warn");
  } finally {
    state.autoFitRunning = false;
    setAutoFitControlsDisabled(false);
  }
}
function deviceCalStatus(text, kind = "") {
  const status = $("deviceCalStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function deviceCalHtmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function deviceCalNumber(id, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const input = $(id);
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = fallback;
  if (integer) value = Math.round(value);
  value = clamp(value, min, max);
  if (input) input.value = integer ? String(value) : String(value);
  return value;
}

function deviceCalBatchStart() {
  const value = Math.round(Number($("deviceCalBatch")?.value) || 1);
  return value >= 9 ? 9 : 1;
}

function deviceCalBatchDevices(batchStart = deviceCalBatchStart()) {
  const start = batchStart >= 9 ? 9 : 1;
  return Array.from({ length: ADC_TIA_COUNT }, (_, index) => start + index);
}

function deviceCalDefaultDevice(index, batchStart = deviceCalBatchStart()) {
  return clamp(deviceCalBatchDevices(batchStart)[index] || batchStart + index, 1, 16);
}

function deviceCalDacForAdc(adcIndex) {
  return DEVICE_CAL_DAC_BY_ADC[adcIndex] || (adcIndex < 4 ? "D2" : "D1");
}

function deviceCalDacForDevice(device) {
  return device >= 9 ? "D1" : "D2";
}

function adcIndexFromMappedDevice(device) {
  const target = Math.round(Number(device));
  for (let adcIndex = 0; adcIndex < ADC_DEVICE_MAP.length; adcIndex++) {
    const devices = ADC_DEVICE_MAP[adcIndex];
    if (Array.isArray(devices) && devices.includes(target)) return adcIndex;
    if (Number(devices) === target) return adcIndex;
  }
  return NaN;
}

function deviceCalDeviceForSlot(slot, batchStart = deviceCalBatchStart()) {
  return clamp(Math.round(Number($(`deviceCalDevice${slot}`)?.value) || deviceCalDefaultDevice(slot, batchStart)), 1, 16);
}

function deviceCalChannelForSlot(slot, batchStart = deviceCalBatchStart()) {
  const device = deviceCalDeviceForSlot(slot, batchStart);
  const mappedAdc = adcIndexFromMappedDevice(device);
  const adcIndex = Number.isFinite(mappedAdc) ? mappedAdc : clamp(slot, 0, ADC_TIA_COUNT - 1);
  return {
    index: slot,
    slot,
    adcIndex,
    label: `ADC${adcIndex}`,
    xDac: deviceCalDacForDevice(device),
    device,
  };
}

function renderDeviceCalCards() {
  const host = $("deviceCalGrid");
  if (!host) return;
  const batchStart = deviceCalBatchStart();
  host.innerHTML = Array.from({ length: ADC_TIA_COUNT }, (_, slot) => {
    const device = deviceCalDefaultDevice(slot, batchStart);
    const channel = deviceCalChannelForSlot(slot, batchStart);
    return `
      <article class="device-cal-card" data-channel="${slot}">
        <header>
          <div>
            <h3 id="deviceCalTitle${slot}">D${device} / ${channel.xDac} / ADC${channel.adcIndex}</h3>
            <small id="deviceCalSubTitle${slot}">${adcSubLabel(channel.adcIndex)}</small>
          </div>
          <label>Device <input id="deviceCalDevice${slot}" type="number" min="1" max="16" value="${device}" /></label>
        </header>
        <canvas id="deviceCalCanvas${slot}" height="170"></canvas>
        <div id="deviceCalResult${slot}" class="device-cal-result">No fit yet.</div>
      </article>
    `;
  }).join("");
  for (let slot = 0; slot < ADC_TIA_COUNT; slot++) {
    $(`deviceCalDevice${slot}`)?.addEventListener("input", updateDeviceCalCardTitles);
    drawDeviceCalEmpty(slot, "No fit yet.");
  }
  updateDeviceCalCardTitles();
}

function deviceCalLoadBatchMap() {
  const batchStart = deviceCalBatchStart();
  for (let slot = 0; slot < ADC_TIA_COUNT; slot++) {
    const input = $(`deviceCalDevice${slot}`);
    if (input) input.value = deviceCalDefaultDevice(slot, batchStart);
  }
  state.deviceCalResults = [];
  updateDeviceCalCardTitles();
  for (let slot = 0; slot < ADC_TIA_COUNT; slot++) drawDeviceCalEmpty(slot, "No fit yet.");
  const adcs = [...new Set(deviceCalChannels().map(channel => channel.adcIndex))].sort((a, b) => a - b);
  deviceCalStatus(`Loaded D${batchStart}-D${batchStart + 7} batch map (ADC${adcs.join("/ADC")} shared TIA).`, "ok");
}

function updateDeviceCalCardTitles() {
  for (let slot = 0; slot < ADC_TIA_COUNT; slot++) {
    const channel = deviceCalChannelForSlot(slot);
    const title = $(`deviceCalTitle${slot}`);
    const subTitle = $(`deviceCalSubTitle${slot}`);
    if (title) title.textContent = `D${channel.device} / ${channel.xDac} / ADC${channel.adcIndex}`;
    if (subTitle) subTitle.textContent = adcSubLabel(channel.adcIndex);
  }
}

function deviceCalChannels() {
  const batchStart = deviceCalBatchStart();
  return Array.from({ length: ADC_TIA_COUNT }, (_, slot) => deviceCalChannelForSlot(slot, batchStart));
}
function deviceCalObjective() {
  const value = $("deviceCalObjective")?.value || "shape";
  if (value === "curve") return "curve";
  return value === "a_mu" ? "a_mu" : "shape";
}

function deviceCalCurveReferenceMode() {
  const value = $("deviceCalCurveReference")?.value || "median";
  return value === "target" ? "target" : "median";
}

function deviceCalTarget() {
  const target = {
    A: deviceCalNumber("deviceCalTargetA", 0.015),
    mu: deviceCalNumber("deviceCalTargetMu", 0),
    sigma: Math.abs(deviceCalNumber("deviceCalTargetSigma", 4, { min: 0 })),
  };
  if (![target.A, target.mu, target.sigma].every(Number.isFinite)) throw new Error("Device calibration target A/mu/sigma is invalid.");
  return target;
}

function deviceCalTolerances() {
  return {
    muTol: deviceCalNumber("deviceCalMuTol", 0.05, { min: 0 }),
    aTol: deviceCalNumber("deviceCalATol", 0.002, { min: 0 }),
    sigmaTol: deviceCalNumber("deviceCalSigmaTol", 0.35, { min: 0 }),
    curveTol: deviceCalNumber("deviceCalCurveTol", 0.001, { min: 0 }),
  };
}

function deviceCalCurveMetrics(fit, reference) {
  const data = fit?.data || [];
  if (!data.length || !reference) return { rmse: NaN, mae: NaN, maxAbs: NaN, similarity: NaN, scale: NaN };
  let sse = 0;
  let sae = 0;
  let maxAbs = 0;
  let count = 0;
  for (const item of data) {
    const x = Number(item.x);
    const y = Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const expected = gaussianValue(reference, x);
    if (!Number.isFinite(expected)) continue;
    const err = y - expected;
    const absErr = Math.abs(err);
    sse += err * err;
    sae += absErr;
    maxAbs = Math.max(maxAbs, absErr);
    count += 1;
  }
  if (!count) return { rmse: NaN, mae: NaN, maxAbs: NaN, similarity: NaN, scale: NaN };
  const rmse = Math.sqrt(sse / count);
  const mae = sae / count;
  const scale = Math.max(Math.abs(Number(reference.A) || 0), Math.abs(Number(reference.baseline) || 0), rmse, 1e-12);
  const similarity = clamp(1 - rmse / scale, 0, 1);
  return { rmse, mae, maxAbs, similarity, scale, count };
}

function deviceCalReferenceFromFits(results, target, mode = deviceCalCurveReferenceMode()) {
  const fits = (results || []).map(result => result.fit).filter(Boolean);
  const baselines = fits.map(fit => Number(fit.baseline)).filter(Number.isFinite);
  const fallbackBaseline = baselines.length ? median(baselines) : 0;
  if (mode === "target") {
    return {
      A: target.A,
      mu: target.mu,
      sigma: Math.max(Math.abs(target.sigma), 1e-9),
      baseline: fallbackBaseline,
      referenceMode: mode,
    };
  }
  return {
    A: median(fits.map(fit => Number(fit.A))),
    mu: median(fits.map(fit => Number(fit.mu))),
    sigma: Math.max(median(fits.map(fit => Math.abs(Number(fit.sigma)))), 1e-9),
    baseline: fallbackBaseline,
    referenceMode: mode,
  };
}

function deviceCalCurveTargetForFit(fit, reference, target) {
  const ref = reference || target;
  return {
    A: Number.isFinite(Number(ref.A)) ? Number(ref.A) : target.A,
    mu: Number.isFinite(Number(ref.mu)) ? Number(ref.mu) : target.mu,
    sigma: Math.max(Math.abs(Number(ref.sigma) || target.sigma), 1e-9),
    baseline: Number.isFinite(Number(ref.baseline)) ? Number(ref.baseline) : Number(fit?.baseline || 0),
    referenceMode: ref.referenceMode || deviceCalCurveReferenceMode(),
  };
}

function deviceCalTargetError(fit, target, tolerances = deviceCalTolerances(), objective = deviceCalObjective()) {
  const base = gaussianTargetError(fit, target, tolerances);
  const sigmaError = Number(target.sigma) - Math.abs(Number(fit.sigma));
  const sigmaScale = tolerances.sigmaTol > 0 ? Math.abs(sigmaError) / tolerances.sigmaTol : Math.abs(sigmaError);
  if (objective === "shape") {
    const norm = Math.max(base.aScale, sigmaScale);
    return { ...base, sigmaError, sigmaScale, norm, objective, converged: norm <= 1 };
  }
  if (objective === "curve") {
    const curve = deviceCalCurveMetrics(fit, target);
    const curveScale = tolerances.curveTol > 0 ? Number(curve.rmse) / tolerances.curveTol : Number(curve.rmse);
    const norm = Math.max(base.aScale, base.muScale, sigmaScale, Number.isFinite(curveScale) ? curveScale : Infinity);
    return { ...base, sigmaError, sigmaScale, curve, curveScale, norm, objective, converged: norm <= 1 };
  }
  return { ...base, sigmaError, sigmaScale, objective };
}

function formatDeviceCalError(error) {
  if (!error) return "err -";
  if (error.objective === "shape") {
    return `err A=${error.aError.toPrecision(4)}, sigma=${error.sigmaError.toFixed(4)} V, mu diag=${error.muError.toFixed(4)} V, norm(A/sigma)=${error.norm.toFixed(3)}`;
  }
  if (error.objective === "curve") {
    const curve = error.curve || {};
    const similarity = Number.isFinite(curve.similarity) ? `${(curve.similarity * 100).toFixed(1)}%` : "n/a";
    return `curve RMSE=${Number(curve.rmse).toPrecision(4)}, sim=${similarity}, err A=${error.aError.toPrecision(4)}, mu=${error.muError.toFixed(4)} V, sigma=${error.sigmaError.toFixed(4)} V, norm=${error.norm.toFixed(3)}`;
  }
  return formatTargetError(error);
}

function deviceCalPlanTargetForObjective(fit, target, objective) {
  if (objective === "shape") return { ...target, mu: Number(fit.mu) };
  return target;
}
function deviceCalGains() {
  const learningRate = deviceCalNumber("deviceCalLearningRate", 0.5, { min: 0.01, max: 2 });
  return {
    learningRate,
    muGain: deviceCalNumber("deviceCalMuGain", 1) * learningRate,
    vstartGain: deviceCalNumber("deviceCalVstartGain", 1) * learningRate,
    muVstartGain: deviceCalNumber("deviceCalMuVstartGain", 1),
  };
}

function syncDeviceCalSharedFitControls(target, tolerances, gains) {
  if ($("fitTargetA")) $("fitTargetA").value = target.A;
  if ($("fitTargetMu")) $("fitTargetMu").value = target.mu;
  if ($("fitTargetSigma")) $("fitTargetSigma").value = target.sigma;
  if ($("autoFitLearningRate")) $("autoFitLearningRate").value = gains.learningRate;
  if ($("autoFitMuTol")) $("autoFitMuTol").value = tolerances.muTol;
  if ($("autoFitATol")) $("autoFitATol").value = tolerances.aTol;
  if ($("fitMuGain")) $("fitMuGain").value = deviceCalNumber("deviceCalMuGain", 1);
  if ($("fitAGain")) $("fitAGain").value = deviceCalNumber("deviceCalVstartGain", 1);
  if ($("fitMuVstartGain")) $("fitMuVstartGain").value = gains.muVstartGain;
  if ($("fitControlMode") && $("deviceCalControlMode")) $("fitControlMode").value = $("deviceCalControlMode").value;
  if ($("fitJacobianDamping") && $("deviceCalJacobianDamping")) $("fitJacobianDamping").value = deviceCalNumber("deviceCalJacobianDamping", 0.05, { min: 0.001, max: 10 });
}

function prepareDeviceCalSweepSelection(options = {}) {
  const channels = deviceCalChannels();
  const d1Adcs = [...new Set(channels.filter(channel => channel.xDac === "D1").map(channel => channel.adcIndex))].sort((a, b) => a - b);
  const d2Adcs = [...new Set(channels.filter(channel => channel.xDac === "D2").map(channel => channel.adcIndex))].sort((a, b) => a - b);
  if ($("sweepD1Enable")) $("sweepD1Enable").checked = d1Adcs.length > 0;
  if ($("sweepD2Enable")) $("sweepD2Enable").checked = d2Adcs.length > 0;
  if (options.singleRepeat && $("sweepRepeats")) $("sweepRepeats").value = "1";
  setPlotAdcSelection("D2", d2Adcs);
  setPlotAdcSelection("D1", d1Adcs);
  if ($("plotYMode") && $("deviceCalYMode")) $("plotYMode").value = $("deviceCalYMode").value;
}
function deviceCalFitForChannel(channel) {
  const yMode = $("deviceCalYMode")?.value || "current";
  const data = gaussianFitSeries(channel.xDac, channel.adcIndex, yMode);
  const fit = { ...fitGaussianData(data), xDac: channel.xDac, adcIndex: channel.adcIndex, yMode, data };
  return fit;
}

function deviceCalProgramCommand(plan) {
  if (!plan) return "";
  const nextVstartCode = plan.nextVstartCode ?? plan.nextACode;
  return `P${plan.device},${plan.nextMuCode},${nextVstartCode}`;
}

function deviceCalFitOneChannel(channel, target, tolerances, gains, iter, options = {}) {
  try {
    const fit = options.fit || deviceCalFitForChannel(channel);
    const objective = options.objective || deviceCalObjective();
    const channelTarget = typeof options.targetForChannel === "function" ? options.targetForChannel(channel, fit) : target;
    const error = deviceCalTargetError(fit, channelTarget, tolerances, objective);
    const active = !options.activeDevices || options.activeDevices.has(channel.device);
    const makePlan = options.plan !== false && active;
    let plan = null;
    let action = error.converged ? "converged" : (makePlan ? "planned" : (active ? "measured" : "held"));
    if (!error.converged && makePlan) {
      const controlTarget = deviceCalPlanTargetForObjective(fit, channelTarget, objective);
      plan = adjustmentPlanForFit(channel.device, controlTarget, fit, gains.muGain, gains.vstartGain, gains.muVstartGain);
      plan.target = channelTarget;
      plan.controlTarget = controlTarget;
      plan.programCommand = deviceCalProgramCommand(plan);
      if (!planHasCodeChange(plan)) {
        const nudged = planWithMinimumCodeNudge(plan);
        if (nudged) {
          plan = nudged;
          plan.target = channelTarget;
          plan.controlTarget = controlTarget;
          plan.programCommand = deviceCalProgramCommand(plan);
          action = "minimum code nudge";
        } else {
          action = "no code change";
        }
      }
    }
    return { iter, channel, target: channelTarget, fit, error, plan, action, objective, active, converged: error.converged };
  } catch (error) {
    return { iter, channel, target, fit: null, error: null, plan: null, action: "fit failed", message: error.message, objective: options.objective || deviceCalObjective(), active: !options.activeDevices || options.activeDevices.has(channel.device), converged: false };
  }
}

function fitDeviceCalBatch(iter = "", options = {}) {
  const target = deviceCalTarget();
  const tolerances = deviceCalTolerances();
  const gains = deviceCalGains();
  const objective = options.objective || deviceCalObjective();
  syncDeviceCalSharedFitControls(target, tolerances, gains);
  const channels = deviceCalChannels();
  let results;
  if (objective === "curve") {
    const prefit = channels.map(channel => {
      try {
        return { channel, fit: deviceCalFitForChannel(channel) };
      } catch (error) {
        return { channel, fit: null, message: error.message };
      }
    });
    const reference = deviceCalReferenceFromFits(prefit, target, deviceCalCurveReferenceMode());
    const targetForChannel = (channel, fit) => deviceCalCurveTargetForFit(fit, reference, target);
    results = prefit.map(item => item.fit
      ? deviceCalFitOneChannel(item.channel, target, tolerances, gains, iter, { ...options, objective, fit: item.fit, targetForChannel })
      : { iter, channel: item.channel, target, fit: null, error: null, plan: null, action: "fit failed", message: item.message, objective, active: !options.activeDevices || options.activeDevices.has(item.channel.device), converged: false });
  } else {
    results = channels.map(channel => deviceCalFitOneChannel(channel, target, tolerances, gains, iter, { ...options, objective }));
  }
  state.deviceCalResults = results;
  appendDeviceCalHistory(results);
  renderDeviceCalResults(results);
  return results;
}
function updateDeviceCalOverlayButtons() {
  const rows = Array.isArray(state.deviceCalHistory) ? state.deviceCalHistory.filter(row => row.fit?.data?.length) : [];
  const downloadButton = $("deviceCalOverlayDownloadButton");
  if (downloadButton) downloadButton.disabled = !rows.length;
  const logButton = $("deviceCalDownloadButton");
  if (logButton) logButton.disabled = !state.deviceCalHistory.length;
  const packageButton = $("deviceCalPackageButton");
  if (packageButton) packageButton.disabled = !rows.length;
}

function deviceCalCurrentSweepLog() {
  const sweep = state.lastSweep;
  if (!sweep) return null;
  const requests = Array.isArray(sweep.requests) ? sweep.requests : [];
  return {
    id: sweep.id,
    startedAt: sweep.startedAt,
    finishedAt: sweep.finishedAt,
    capturedPointCount: sweepCapturedPointCount(sweep),
    commandD1: requests.find(request => request.dac === "D1")?.command || "",
    commandD2: requests.find(request => request.dac === "D2")?.command || "",
  };
}

function appendDeviceCalHistory(results) {
  const time = new Date().toISOString();
  const sweep = deviceCalCurrentSweepLog();
  state.deviceCalHistory.push(...results.map(result => ({ time, sweep, ...result })));
  if (state.deviceCalHistory.length > 4000) state.deviceCalHistory.splice(0, state.deviceCalHistory.length - 4000);
  updateDeviceCalOverlayButtons();
  drawDeviceCalOverlay();
}
function deviceCalLutStatus(text, kind = "") {
  const status = $("deviceCalLutStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function updateDeviceCalLutButtons() {
  const hasRows = Array.isArray(state.deviceCalLutRows) && state.deviceCalLutRows.length > 0;
  const downloadButton = $("deviceCalLutDownloadButton");
  if (downloadButton) downloadButton.disabled = state.deviceCalRunning || !hasRows;
  const clearButton = $("deviceCalLutClearButton");
  if (clearButton) clearButton.disabled = state.deviceCalRunning || !hasRows;
  const startButton = $("deviceCalLutStartButton");
  if (startButton) startButton.disabled = state.deviceCalRunning;
}

function updateDeviceCalLutSummary() {
  const host = $("deviceCalLutSummary");
  const rows = Array.isArray(state.deviceCalLutRows) ? state.deviceCalLutRows : [];
  if (host) {
    if (!rows.length) {
      host.textContent = "No LUT rows saved.";
    } else {
      const devices = new Set(rows.map(row => row.device).filter(value => value !== undefined && value !== ""));
      const points = new Set(rows.map(row => row.lut_point).filter(value => value !== undefined && value !== ""));
      const last = rows[rows.length - 1];
      host.textContent = `${rows.length} LUT row(s), ${points.size} grid point(s), ${devices.size} device(s). Last: D${last.device}, Vmu ${Number(last.actual_mu_v).toFixed(4)} V, Vstart ${Number(last.actual_vstart_v).toFixed(4)} V, A ${Number(last.fit_A).toPrecision(4)}, mu ${Number(last.fit_mu).toFixed(4)} V.`;
    }
  }
  updateDeviceCalLutButtons();
}

function persistDeviceCalLutRows() {
  try {
    const payload = {
      savedAt: new Date().toISOString(),
      meta: state.deviceCalLutMeta || {},
      rows: (state.deviceCalLutRows || []).slice(-DEVICE_CAL_LUT_ROW_LIMIT),
    };
    localStorage.setItem(DEVICE_CAL_LUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    logLine(`[storage error] device calibration LUT not saved: ${error.message}`);
    return false;
  } finally {
    updateDeviceCalLutSummary();
  }
}

function loadDeviceCalLutRows() {
  try {
    const raw = localStorage.getItem(DEVICE_CAL_LUT_STORAGE_KEY);
    if (!raw) {
      state.deviceCalLutRows = [];
      state.deviceCalLutMeta = null;
      return;
    }
    const payload = JSON.parse(raw);
    state.deviceCalLutRows = Array.isArray(payload?.rows) ? payload.rows.filter(row => row && typeof row === "object").slice(-DEVICE_CAL_LUT_ROW_LIMIT) : [];
    state.deviceCalLutMeta = payload?.meta || null;
  } catch (error) {
    state.deviceCalLutRows = [];
    state.deviceCalLutMeta = null;
    logLine(`[storage error] device calibration LUT load failed: ${error.message}`);
  } finally {
    updateDeviceCalLutSummary();
  }
}

function deviceCalLutGridValues(startId, stopId, stepId, label) {
  const start = deviceCalNumber(startId, 0);
  const stop = deviceCalNumber(stopId, start);
  const input = $(stepId);
  let step = Number(input?.value);
  if (!Number.isFinite(step) || step === 0) throw new Error(`${label} step must be non-zero.`);
  if (start !== stop && Math.sign(step) !== Math.sign(stop - start)) step = -step;
  if (input) input.value = String(step);
  const values = [];
  const eps = Math.max(1e-9, Math.abs(step) * 1e-6);
  for (let i = 0; i < 1024; i++) {
    const value = start + step * i;
    if ((step > 0 && value > stop + eps) || (step < 0 && value < stop - eps)) break;
    values.push(Number(value.toFixed(6)));
  }
  if (!values.length) throw new Error(`${label} range produced no points.`);
  return values;
}

function deviceCalLutPlan() {
  const muValues = deviceCalLutGridValues("deviceCalLutMuStart", "deviceCalLutMuStop", "deviceCalLutMuStep", "Vmu");
  const vstartValues = deviceCalLutGridValues("deviceCalLutVstartStart", "deviceCalLutVstartStop", "deviceCalLutVstartStep", "Vstart");
  const maxGrid = deviceCalNumber("deviceCalLutMaxGrid", 121, { min: 1, max: 512, integer: true });
  const gridCount = muValues.length * vstartValues.length;
  if (gridCount > maxGrid) throw new Error(`LUT grid has ${gridCount} point(s), above max grid pts ${maxGrid}.`);
  return {
    muValues,
    vstartValues,
    gridCount,
    settleMs: deviceCalNumber("deviceCalLutSettleMs", 1000, { min: 0, max: 30000, integer: true }),
  };
}

function deviceCalLutSnapshot(plan) {
  return {
    batch_start: deviceCalBatchStart(),
    y_mode: $("deviceCalYMode")?.value || "current",
    target_A: $("deviceCalTargetA")?.value,
    target_mu: $("deviceCalTargetMu")?.value,
    target_sigma: $("deviceCalTargetSigma")?.value,
    settle_ms: plan.settleMs,
    grid_points: plan.gridCount,
    sweep_d1_start: $("sweepD1Start")?.value,
    sweep_d1_stop: $("sweepD1Stop")?.value,
    sweep_d1_step: $("sweepD1Step")?.value,
    sweep_d2_start: $("sweepD2Start")?.value,
    sweep_d2_stop: $("sweepD2Stop")?.value,
    sweep_d2_step: $("sweepD2Step")?.value,
    adc_avg: $("adcAvgSamples")?.value,
    sweep_settle_us: $("sweepSettleUs")?.value,
    sweep_pre_bias_ms: $("sweepPreBiasMs")?.value,
    sweep_reverse: $("sweepReverse")?.checked ? "yes" : "no",
  };
}

function appendDeviceCalLutRows(results, point, snapshot) {
  const time = new Date().toISOString();
  const rows = (results || []).map(result => {
    const fit = result.fit || {};
    const error = result.error || {};
    const channel = result.channel || {};
    return {
      time,
      lut_point: point.lutPoint,
      mu_index: point.muIndex,
      vstart_index: point.vstartIndex,
      requested_mu_v: point.requestedMuV,
      requested_vstart_v: point.requestedVstartV,
      mu_code: point.muCode,
      vstart_code: point.vstartCode,
      actual_mu_v: point.actualMuV,
      actual_vstart_v: point.actualVstartV,
      batch_start: snapshot.batch_start,
      channel: channel.index,
      dac: channel.xDac,
      adc: `ADC${channel.adcIndex}`,
      device: channel.device,
      y_mode: snapshot.y_mode,
      target_A: snapshot.target_A,
      target_mu: snapshot.target_mu,
      target_sigma: snapshot.target_sigma,
      fit_A: fit.A,
      fit_mu: fit.mu,
      fit_sigma: Number.isFinite(Number(fit.sigma)) ? Math.abs(Number(fit.sigma)) : "",
      baseline: fit.baseline,
      r2: fit.r2,
      rmse: fit.rmse,
      error_A: error.aError,
      error_mu: error.muError,
      error_sigma: error.sigmaError,
      norm: error.norm,
      converged: result.converged ? "yes" : "no",
      sweep_d1_start: snapshot.sweep_d1_start,
      sweep_d1_stop: snapshot.sweep_d1_stop,
      sweep_d1_step: snapshot.sweep_d1_step,
      sweep_d2_start: snapshot.sweep_d2_start,
      sweep_d2_stop: snapshot.sweep_d2_stop,
      sweep_d2_step: snapshot.sweep_d2_step,
      adc_avg: snapshot.adc_avg,
      sweep_settle_us: snapshot.sweep_settle_us,
      sweep_pre_bias_ms: snapshot.sweep_pre_bias_ms,
      sweep_reverse: snapshot.sweep_reverse,
    };
  });
  state.deviceCalLutRows.push(...rows);
  if (state.deviceCalLutRows.length > DEVICE_CAL_LUT_ROW_LIMIT) {
    state.deviceCalLutRows.splice(0, state.deviceCalLutRows.length - DEVICE_CAL_LUT_ROW_LIMIT);
  }
  state.deviceCalLutMeta = { ...snapshot, last_point: point.lutPoint, saved_at: time };
  persistDeviceCalLutRows();
}

async function programDeviceCalBatchCodes(muCode, vstartCode) {
  const devices = [...new Set(deviceCalChannels().map(channel => channel.device))];
  for (const device of devices) {
    if (state.deviceCalStopRequested) break;
    await programLogicalDevice(device, muCode, vstartCode);
  }
  renderDeviceTable();
  loadDeviceState();
}

async function measureDeviceCalLut() {
  if (state.deviceCalRunning) return;
  if (!state.writer) {
    deviceCalLutStatus("Connect UART before LUT measurement.", "warn");
    return;
  }
  let plan;
  try {
    plan = deviceCalLutPlan();
  } catch (error) {
    deviceCalLutStatus(error.message, "warn");
    return;
  }
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  const snapshot = deviceCalLutSnapshot(plan);
  let completed = 0;
  try {
    prepareDeviceCalSweepSelection({ singleRepeat: true });
    for (let muIndex = 0; muIndex < plan.muValues.length; muIndex++) {
      for (let vstartIndex = 0; vstartIndex < plan.vstartValues.length; vstartIndex++) {
        if (state.deviceCalStopRequested) break;
        const requestedMuV = plan.muValues[muIndex];
        const requestedVstartV = plan.vstartValues[vstartIndex];
        const muCode = muVoltageToCode(requestedMuV);
        const vstartCode = vstartVoltageToCode(requestedVstartV);
        const actualMuV = potCodeToMuVoltage(muCode);
        const actualVstartV = potCodeToVstartVoltage(vstartCode);
        const lutPoint = completed + 1;
        deviceCalLutStatus(`LUT ${lutPoint}/${plan.gridCount}: program Vmu ${actualMuV.toFixed(4)} V (code ${muCode}), Vstart ${actualVstartV.toFixed(4)} V (code ${vstartCode}).`, "warn");
        await programDeviceCalBatchCodes(muCode, vstartCode);
        if (plan.settleMs > 0 && !state.deviceCalStopRequested) await sleep(plan.settleMs);
        if (state.deviceCalStopRequested) break;
        prepareDeviceCalSweepSelection({ singleRepeat: true });
        await startSweep();
        if (state.deviceCalStopRequested) break;
        const results = fitDeviceCalBatch(`lut-${lutPoint}`, { plan: false });
        appendDeviceCalLutRows(results, { lutPoint, muIndex, vstartIndex, requestedMuV, requestedVstartV, muCode, vstartCode, actualMuV, actualVstartV }, snapshot);
        completed++;
        deviceCalLutStatus(`LUT ${completed}/${plan.gridCount}: saved ${(state.deviceCalLutRows || []).length} row(s).`, "ok");
      }
      if (state.deviceCalStopRequested) break;
    }
    if (state.deviceCalStopRequested) {
      deviceCalLutStatus(`LUT stopped after ${completed}/${plan.gridCount} grid point(s).`, "warn");
    } else {
      deviceCalLutStatus(`LUT complete: ${completed} grid point(s), ${(state.deviceCalLutRows || []).length} total row(s).`, "ok");
    }
  } catch (error) {
    deviceCalLutStatus(error.message, "warn");
  } finally {
    setDeviceCalControlsRunning(false);
    updateDeviceCalLutSummary();
  }
}

function clearDeviceCalLut() {
  const rows = Array.isArray(state.deviceCalLutRows) ? state.deviceCalLutRows.length : 0;
  if (rows && !confirm(`Clear ${rows} device calibration LUT row(s)?`)) return;
  state.deviceCalLutRows = [];
  state.deviceCalLutMeta = null;
  try { localStorage.removeItem(DEVICE_CAL_LUT_STORAGE_KEY); } catch {}
  deviceCalLutStatus("LUT cleared.", "ok");
  updateDeviceCalLutSummary();
}

function downloadDeviceCalLutCsv() {
  const rows = Array.isArray(state.deviceCalLutRows) ? state.deviceCalLutRows : [];
  if (!rows.length) {
    deviceCalLutStatus("No LUT rows to download.", "warn");
    return;
  }
  const fields = [
    "time", "lut_point", "mu_index", "vstart_index",
    "requested_mu_v", "requested_vstart_v", "mu_code", "vstart_code", "actual_mu_v", "actual_vstart_v",
    "batch_start", "channel", "dac", "adc", "device", "y_mode",
    "target_A", "target_mu", "target_sigma",
    "fit_A", "fit_mu", "fit_sigma", "baseline", "r2", "rmse",
    "error_A", "error_mu", "error_sigma", "norm", "converged",
    "sweep_d1_start", "sweep_d1_stop", "sweep_d1_step",
    "sweep_d2_start", "sweep_d2_stop", "sweep_d2_step",
    "adc_avg", "sweep_settle_us", "sweep_pre_bias_ms", "sweep_reverse",
  ];
  const csvRows = [fields.join(",")];
  for (const row of rows) csvRows.push(fields.map(field => csvEscape(row[field])).join(","));
  download(`pcb_gaussian_device_cal_lut_${Date.now()}.csv`, csvRows.join("\n"), "text/csv;charset=utf-8");
  deviceCalLutStatus(`Downloaded ${rows.length} LUT row(s).`, "ok");
}

function deviceCalResultText(result) {
  if (!result?.fit) return `<strong>fit failed</strong><br>${deviceCalHtmlEscape(result?.message || "No data")}`;
  const error = result.error;
  const plan = result.plan;
  const codeText = plan
    ? `mu ${plan.currentMuCode}->${plan.nextMuCode}, Vstart ${(plan.currentVstartCode ?? plan.currentACode)}->${(plan.nextVstartCode ?? plan.nextACode)}`
    : (result.action === "held" ? "held after convergence" : "no programming");
  return `<strong>${result.converged ? "within tol" : result.action}</strong><br>` +
    `A ${result.fit.A.toPrecision(4)} / mu ${result.fit.mu.toFixed(3)} V / sigma ${Math.abs(result.fit.sigma).toFixed(3)} V<br>` +
    `${formatDeviceCalError(error)}<br>${codeText}`;
}

function renderDeviceCalResults(results = state.deviceCalResults) {
  updateDeviceCalCardTitles();
  for (const result of results || []) {
    const index = result.channel?.index ?? result.channel?.adcIndex;
    const host = $(`deviceCalResult${index}`);
    if (host) {
      host.className = `device-cal-result ${result.converged ? "ok" : "warn"}`;
      host.innerHTML = deviceCalResultText(result);
    }
    drawDeviceCalPlot(result);
  }
}

function drawDeviceCalEmpty(index, message) {
  const canvas = $(`deviceCalCanvas${index}`);
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width || 260));
  const height = 170;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#66737a";
  ctx.font = "12px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
}

function sampledGaussianForPlot(params, minX, maxX, count = 120) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    const x = minX + (maxX - minX) * i / Math.max(1, count - 1);
    const y = gaussianValue(params, x);
    if (Number.isFinite(x) && Number.isFinite(y)) samples.push({ x, y });
  }
  return samples;
}

function drawDeviceCalPlot(result) {
  const index = result?.channel?.index ?? result?.channel?.adcIndex;
  if (!Number.isFinite(index)) return;
  if (!result.fit) {
    drawDeviceCalEmpty(index, result.message || "Fit failed");
    return;
  }
  const canvas = $(`deviceCalCanvas${index}`);
  if (!canvas) return;
  const data = result.fit.data || [];
  if (!data.length) {
    drawDeviceCalEmpty(index, "No data");
    return;
  }
  const step = Math.max(1, Math.ceil(data.length / 350));
  const measured = data.filter((_, idx) => idx % step === 0 || idx === data.length - 1);
  const xs = data.map(item => item.x).filter(Number.isFinite);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const fitSamples = sampledGaussianForPlot(result.fit, minX, maxX);
  const targetSigma = Number(result.target?.sigma) > 0 ? Number(result.target.sigma) : Math.abs(result.fit.sigma);
  const targetParams = { A: result.target.A, mu: result.target.mu, sigma: targetSigma, baseline: Number.isFinite(Number(result.target?.baseline)) ? Number(result.target.baseline) : result.fit.baseline };
  const targetSamples = sampledGaussianForPlot(targetParams, minX, maxX);
  const yValues = measured.map(item => item.y).concat(fitSamples.map(item => item.y), targetSamples.map(item => item.y));
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const pad = (maxY - minY) * 0.12;
  minY -= pad;
  maxY += pad;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width || 260));
  const height = 170;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  const margin = { left: 36, right: 10, top: 12, bottom: 28 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const sx = x => margin.left + (x - minX) / Math.max(1e-12, maxX - minX) * plotW;
  const sy = y => margin.top + plotH - (y - minY) / Math.max(1e-12, maxY - minY) * plotH;

  ctx.strokeStyle = "#d9e4e2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#66737a";
  ctx.font = "10px Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 3; i++) {
    const y = margin.top + plotH * i / 3;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.fillText((maxY - (maxY - minY) * i / 3).toPrecision(3), margin.left - 5, y);
  }
  ctx.strokeStyle = "#17323a";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(width - margin.right, margin.top + plotH);
  ctx.stroke();

  const drawLine = (series, color, dash = [], widthPx = 1.8, alpha = 1) => {
    if (!series.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = widthPx;
    if (ctx.setLineDash) ctx.setLineDash(dash);
    ctx.beginPath();
    series.forEach((item, idx) => {
      const x = sx(item.x);
      const y = sy(item.y);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  };
  const color = PLOT_COLORS[index % PLOT_COLORS.length];
  drawLine(measured, color, [], 1.6, 0.75);
  drawLine(fitSamples, color, [6, 4], 2.2, 1);
  drawLine(targetSamples, "#17323a", [1.5, 5], 2.2, 0.95);
}

function deviceCalOverlayStatus(text, kind = "") {
  const status = $("deviceCalOverlayStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function deviceCalOverlayRows() {
  return (Array.isArray(state.deviceCalHistory) ? state.deviceCalHistory : [])
    .filter(row => row?.fit?.data?.length && row.channel?.device);
}

function deviceCalSelectedOverlayRows(rows = deviceCalOverlayRows()) {
  const mode = $("deviceCalOverlayStageMode")?.value || "all";
  if (mode === "all") return rows.slice();
  const byDevice = new Map();
  for (const row of rows) {
    const device = row.channel.device;
    if (!byDevice.has(device)) byDevice.set(device, []);
    byDevice.get(device).push(row);
  }
  const selected = [];
  for (const deviceRows of byDevice.values()) {
    deviceRows.sort((a, b) => Number(a.iter || 0) - Number(b.iter || 0));
    if (mode === "latest") {
      selected.push(deviceRows[deviceRows.length - 1]);
    } else {
      selected.push(deviceRows[0]);
      const latest = deviceRows[deviceRows.length - 1];
      if (latest !== deviceRows[0]) selected.push(latest);
    }
  }
  return selected;
}

function deviceCalDeviceColor(device) {
  const palette = ["#2a9d8f", "#d1495b", "#457b9d", "#f4a261", "#7b2cbf", "#2f6f4e", "#e76f51", "#264653", "#00a6d6", "#b56576", "#6a994e", "#bc6c25", "#5a189a", "#0081a7", "#9b2226", "#52796f"];
  return palette[(clamp(Math.round(Number(device) || 1), 1, 16) - 1) % palette.length];
}

function deviceCalOverlayPoint(point, fit, xMode) {
  const x = xMode === "aligned" ? Number(point.x) - Number(fit.mu) : Number(point.x);
  const y = Number(point.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function deviceCalOverlayBaseline(rows) {
  const values = rows.map(row => Number(row.fit?.baseline)).filter(Number.isFinite);
  return values.length ? average(values) : 0;
}

function drawDeviceCalOverlayEmpty(message = "No convergence curves yet.") {
  const canvas = $("deviceCalOverlayCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.round(rect.width || 760));
  const height = 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#66737a";
  ctx.font = "14px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, width / 2, height / 2);
  const legend = $("deviceCalOverlayLegend");
  if (legend) legend.innerHTML = "";
}

function drawDeviceCalOverlay() {
  const rows = deviceCalSelectedOverlayRows();
  if (!rows.length) {
    drawDeviceCalOverlayEmpty();
    deviceCalOverlayStatus("Overlay idle.");
    updateDeviceCalOverlayButtons();
    return;
  }
  const xMode = $("deviceCalOverlayXMode")?.value || "aligned";
  let target = deviceCalTarget();
  const objective = deviceCalObjective();
  const latestReferenceRow = [...rows].reverse().find(row => row.objective === "curve" && row.target?.referenceMode);
  if (objective === "curve" && latestReferenceRow?.target) target = latestReferenceRow.target;
  const series = rows.map(row => ({
    row,
    points: (row.fit.data || []).map(point => deviceCalOverlayPoint(point, row.fit, xMode)).filter(Boolean),
  })).filter(item => item.points.length);
  if (!series.length) {
    drawDeviceCalOverlayEmpty("No valid convergence curve points.");
    return;
  }
  const xValues = series.flatMap(item => item.points.map(point => point.x));
  const yValues = series.flatMap(item => item.points.map(point => point.y));
  const baseline = Number.isFinite(Number(target.baseline)) ? Number(target.baseline) : deviceCalOverlayBaseline(rows);
  let minX = Math.min(...xValues);
  let maxX = Math.max(...xValues);
  const targetSigma = Math.max(Number(target.sigma) || 4, 1e-6);
  if ($("deviceCalOverlayTarget")?.checked !== false) {
    const targetMu = xMode === "aligned" ? 0 : Number(target.mu) || 0;
    for (let i = 0; i <= 120; i++) {
      const x = minX + (maxX - minX) * i / 120;
      yValues.push(gaussianValue({ A: target.A, mu: targetMu, sigma: targetSigma, baseline }, x));
    }
  }
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const xPad = Math.max(0.05, (maxX - minX) * 0.04);
  const yPad = Math.max(1e-9, (maxY - minY) * 0.12);
  minX -= xPad;
  maxX += xPad;
  minY -= yPad;
  maxY += yPad;

  const canvas = $("deviceCalOverlayCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.round(rect.width || 760));
  const height = 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fbfa";
  ctx.fillRect(0, 0, width, height);
  const margin = { left: 58, right: 16, top: 18, bottom: 42 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const sx = x => margin.left + (x - minX) / Math.max(1e-12, maxX - minX) * plotW;
  const sy = y => margin.top + plotH - (y - minY) / Math.max(1e-12, maxY - minY) * plotH;

  ctx.strokeStyle = "#d9e4e2";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#66737a";
  ctx.font = "11px Segoe UI, Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    const y = margin.top + plotH * i / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.fillText((maxY - (maxY - minY) * i / 4).toPrecision(4), margin.left - 7, y);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= 5; i++) {
    const x = margin.left + plotW * i / 5;
    const value = minX + (maxX - minX) * i / 5;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.stroke();
    ctx.fillText(value.toFixed(2), x, margin.top + plotH + 7);
  }
  ctx.strokeStyle = "#17323a";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotH);
  ctx.lineTo(width - margin.right, margin.top + plotH);
  ctx.stroke();
  ctx.save();
  ctx.translate(15, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#17323a";
  ctx.font = "12px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText($("deviceCalYMode")?.value || "I_uA", 0, 0);
  ctx.restore();
  ctx.fillText(xMode === "aligned" ? "gate voltage - fitted mu (V)" : "gate voltage (V)", margin.left + plotW / 2, height - 16);

  const iterValues = rows.map(row => Number(row.iter) || 0).filter(Number.isFinite);
  const minIter = iterValues.length ? Math.min(...iterValues) : 0;
  const maxIter = iterValues.length ? Math.max(...iterValues) : 0;
  const alphaBase = deviceCalNumber("deviceCalOverlayAlpha", 0.28, { min: 0.05, max: 1 });
  const drawLine = (points, color, dash = [], widthPx = 1.4, alpha = 1) => {
    if (!points.length) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = widthPx;
    if (ctx.setLineDash) ctx.setLineDash(dash);
    ctx.beginPath();
    points.forEach((point, idx) => {
      const x = sx(point.x);
      const y = sy(point.y);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  };
  for (const item of series) {
    const device = item.row.channel.device;
    const color = deviceCalDeviceColor(device);
    const iter = Number(item.row.iter) || 0;
    const progress = maxIter > minIter ? (iter - minIter) / (maxIter - minIter) : 1;
    const isLatest = iter === maxIter;
    const alpha = Math.min(0.95, alphaBase + progress * 0.45);
    drawLine(item.points, color, [], isLatest ? 2.1 : 1.25, alpha);
  }
  if ($("deviceCalOverlayTarget")?.checked !== false) {
    const targetMu = xMode === "aligned" ? 0 : Number(target.mu) || 0;
    const targetPoints = sampledGaussianForPlot({ A: target.A, mu: targetMu, sigma: targetSigma, baseline }, minX, maxX, 180);
    drawLine(targetPoints, "#17323a", [2, 5], 2.4, 0.9);
  }
  const devices = [...new Set(rows.map(row => row.channel.device))].sort((a, b) => a - b);
  const legend = $("deviceCalOverlayLegend");
  if (legend) {
    legend.innerHTML = devices.map(device => `<span><i style="background:${deviceCalDeviceColor(device)}"></i>D${device}</span>`).join("") +
      ($("deviceCalOverlayTarget")?.checked !== false ? `<span><i style="background:repeating-linear-gradient(to right, #17323a 0 4px, transparent 4px 8px)"></i>Target</span>` : "");
  }
  deviceCalOverlayStatus(`${rows.length} curve(s), ${devices.length} device(s), ${xMode === "aligned" ? "mu-aligned" : "raw X"}.`, "ok");
  updateDeviceCalOverlayButtons();
}

function clearDeviceCalOverlayHistory() {
  const count = state.deviceCalHistory.length;
  state.deviceCalHistory = [];
  updateDeviceCalOverlayButtons();
  drawDeviceCalOverlayEmpty();
  deviceCalOverlayStatus(`Cleared ${count} overlay/log row(s).`, "ok");
}

function deviceCalOverlayPairRows(rows, xMode) {
  const selected = deviceCalSelectedOverlayRows(rows);
  const curves = selected.map(row => {
    const device = row.channel?.device;
    const iter = String(row.iter || "").padStart(3, "0");
    const label = `D${String(device).padStart(2, "0")}_iter${iter}_${row.channel?.xDac || "DAC"}_ADC${row.channel?.adcIndex}`;
    return {
      row,
      label,
      points: (row.fit?.data || []).map(point => deviceCalOverlayPoint(point, row.fit, xMode)).filter(Boolean),
    };
  }).filter(curve => curve.points.length);
  const maxLen = Math.max(0, ...curves.map(curve => curve.points.length));
  const header = curves.flatMap(curve => [`${curve.label}_${xMode}_x_V`, `${curve.label}_y`]);
  const matrix = [header];
  for (let i = 0; i < maxLen; i++) {
    matrix.push(curves.flatMap(curve => {
      const point = curve.points[i];
      return point ? [point.x, point.y] : ["", ""];
    }));
  }
  return { curves, matrix };
}

function downloadDeviceCalOverlayCsv() {
  const rows = deviceCalOverlayRows();
  if (!rows.length) {
    deviceCalOverlayStatus("No overlay history to download.", "warn");
    return;
  }
  const xMode = $("deviceCalOverlayXMode")?.value || "aligned";
  let target = deviceCalTarget();
  const objective = deviceCalObjective();
  const selected = deviceCalSelectedOverlayRows(rows);
  const latestReferenceRow = [...selected].reverse().find(row => row.objective === "curve" && row.target?.referenceMode);
  if (objective === "curve" && latestReferenceRow?.target) target = latestReferenceRow.target;
  const { curves, matrix } = deviceCalOverlayPairRows(rows, xMode);
  const paramRows = [
    ["section", "key", "value", "unit", "note"],
    ["export", "kind", "device_cal_convergence_overlay", "", "XY-pair matrix for Origin"],
    ["export", "created_at", new Date().toISOString(), "", ""],
    ["export", "web_version", WEB_VERSION, "", ""],
    ["overlay", "x_mode", xMode, "", "aligned means x - fitted mu"],
    ["overlay", "stage_mode", $("deviceCalOverlayStageMode")?.value || "all", "", ""],
    ["overlay", "curves", curves.length, "curves", ""],
    ["target", "objective", objective, "", ""],
    ["target", "A", target.A, "", ""],
    ["target", "mu", target.mu, "V", "used only for A/mu objective or raw target overlay"],
    ["target", "sigma", target.sigma, "V", ""],
    ["target", "baseline", target.baseline ?? "", "", "curve objective reference baseline"],
    ["target", "reference_mode", target.referenceMode ?? "", "", "curve objective reference source"],
    ["sweep_ui", "D1_start", uiValue("sweepD1Start"), "mV", ""],
    ["sweep_ui", "D1_stop", uiValue("sweepD1Stop"), "mV", ""],
    ["sweep_ui", "D1_step", uiValue("sweepD1Step"), "mV", ""],
    ["sweep_ui", "D2_start", uiValue("sweepD2Start"), "mV", ""],
    ["sweep_ui", "D2_stop", uiValue("sweepD2Stop"), "mV", ""],
    ["sweep_ui", "D2_step", uiValue("sweepD2Step"), "mV", ""],
    [],
  ];
  const fitRows = [["fit_params"], ["time", "iter", "device", "dac", "adc", "objective", "A", "mu_V", "sigma_V", "baseline", "r2", "rmse", "err_A", "err_mu_V", "err_sigma_V", "norm", "converged", "action"]];
  for (const row of selected) {
    fitRows.push([
      row.time, row.iter, row.channel?.device, row.channel?.xDac, `ADC${row.channel?.adcIndex}`,
      row.objective, row.fit?.A, row.fit?.mu, Math.abs(Number(row.fit?.sigma)), row.fit?.baseline, row.fit?.r2, row.fit?.rmse,
      row.error?.aError, row.error?.muError, row.error?.sigmaError, row.error?.norm, row.converged ? "yes" : "no", row.action,
    ]);
  }
  const csvRows = [...paramRows, ...fitRows, [], ["overlay_xy_pairs"], ...matrix];
  download(`pcb_gaussian_device_cal_overlay_${Date.now()}.csv`, csvFromRows(csvRows), "text/csv;charset=utf-8");
  deviceCalOverlayStatus(`Downloaded ${curves.length} overlay curve(s).`, "ok");
}
function allDeviceTestStatus(text, kind = "") {
  const status = $("allDeviceTestStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `hint status-line ${kind}`.trim();
}

function allDeviceTestNumber(id, fallback, options = {}) {
  const input = $(id);
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = fallback;
  if (options.integer) value = Math.round(value);
  if (Number.isFinite(options.min)) value = Math.max(options.min, value);
  if (Number.isFinite(options.max)) value = Math.min(options.max, value);
  if (input) input.value = options.integer ? Math.round(value) : value;
  return value;
}

function allDeviceTestOptions() {
  const devices = parseDeviceList($("allDeviceTestDevices")?.value || "1-16");
  if (!devices.length) throw new Error("Select at least one device for all-device test.");
  const suspects = new Set(parseDeviceList($("allDeviceTestSuspects")?.value || ""));
  return {
    devices,
    suspects,
    muCode: allDeviceTestNumber("allDeviceTestMuCode", 0, { min: 0, max: POT_MAX_CODE, integer: true }),
    vstartCode: allDeviceTestNumber("allDeviceTestVstartCode", 120, { min: 0, max: POT_MAX_CODE, integer: true }),
    offMuCode: allDeviceTestNumber("allDeviceTestOffMuCode", 0, { min: 0, max: POT_MAX_CODE, integer: true }),
    offVstartCode: allDeviceTestNumber("allDeviceTestOffVstartCode", 20, { min: 0, max: POT_MAX_CODE, integer: true }),
    startMv: allDeviceTestNumber("allDeviceTestStartMv", -16500, { min: DAC_OUTPUT_MIN_MV, max: DAC_OUTPUT_MAX_MV, integer: true }),
    stopMv: allDeviceTestNumber("allDeviceTestStopMv", 16500, { min: DAC_OUTPUT_MIN_MV, max: DAC_OUTPUT_MAX_MV, integer: true }),
    stepMv: allDeviceTestNumber("allDeviceTestStepMv", 1000, { min: 1, max: 30000, integer: true }),
    avg: allDeviceTestNumber("allDeviceTestAvg", 256, { min: 1, max: ADC_AVG_MAX, integer: true }),
    pointRepeats: allDeviceTestNumber("allDeviceTestPointRepeats", 8, { min: 1, max: SWEEP_POINT_REPEATS_MAX, integer: true }),
    settleUs: allDeviceTestNumber("allDeviceTestSettleUs", 65000, { min: 0, max: 65000, integer: true }),
    preBiasMs: allDeviceTestNumber("allDeviceTestPreBiasMs", 0, { min: 0, max: 30000, integer: true }),
    programSettleMs: allDeviceTestNumber("allDeviceTestProgramSettleMs", 500, { min: 0, max: 30000, integer: true }),
    yMode: $("allDeviceTestYMode")?.value || "current",
    reverse: $("allDeviceTestReverse")?.checked !== false,
  };
}

function setAllDeviceTestControlsRunning(running) {
  state.allDeviceTestRunning = running;
  [
    "allDeviceTestDevices", "allDeviceTestSuspects", "allDeviceTestMuCode", "allDeviceTestVstartCode",
    "allDeviceTestOffMuCode", "allDeviceTestOffVstartCode", "allDeviceTestStartMv", "allDeviceTestStopMv",
    "allDeviceTestStepMv", "allDeviceTestAvg", "allDeviceTestPointRepeats", "allDeviceTestSettleUs", "allDeviceTestPreBiasMs",
    "allDeviceTestProgramSettleMs", "allDeviceTestYMode", "allDeviceTestReverse",
  ].forEach(id => {
    const element = $(id);
    if (element) element.disabled = running;
  });
  const start = $("allDeviceTestStartButton");
  const stop = $("allDeviceTestStopButton");
  const downloadButton = $("allDeviceTestDownloadButton");
  if (start) start.disabled = running;
  if (stop) stop.disabled = !running;
  if (downloadButton) downloadButton.disabled = running || !(state.allDeviceTestRows || []).length;
}

function allDeviceTestDacForDevice(device) {
  return Number(device) >= 9 ? "D1" : "D2";
}

function allDeviceTestSweepUiSnapshot() {
  const ids = [
    "sweepD1Enable", "sweepD2Enable", "sweepD1Mode", "sweepD2Mode", "sweepD1Start", "sweepD1Stop", "sweepD1Step",
    "sweepD2Start", "sweepD2Stop", "sweepD2Step", "sweepDwell", "adcAvgSamples", "sweepSettleUs",
    "sweepPreBiasMs", "sweepPointRepeats", "sweepRepeats", "sweepReverse", "plotYMode",
  ];
  return {
    fields: Object.fromEntries(ids.map(id => {
      const element = $(id);
      return [id, element?.type === "checkbox" ? !!element.checked : element?.value];
    })),
    plotAdcSelection: {
      D1: (state.plotAdcSelection.D1 || []).slice(),
      D2: (state.plotAdcSelection.D2 || []).slice(),
    },
  };
}

function restoreAllDeviceTestSweepUi(snapshot) {
  for (const [id, value] of Object.entries(snapshot?.fields || {})) {
    const element = $(id);
    if (!element) continue;
    if (element.type === "checkbox") element.checked = !!value;
    else if (value !== undefined) element.value = value;
  }
  setPlotAdcSelection("D1", snapshot?.plotAdcSelection?.D1 || []);
  setPlotAdcSelection("D2", snapshot?.plotAdcSelection?.D2 || []);
  renderSweepPlot();
}

async function allDeviceTestQuietAll(opt, { ignoreStop = false } = {}) {
  for (let device = 1; device <= 16; device++) {
    if (!ignoreStop && state.allDeviceTestStopRequested) break;
    await programLogicalDevice(device, opt.offMuCode, opt.offVstartCode);
  }
  renderDeviceTable();
  loadDeviceState();
}

async function allDeviceTestReturnSafe(opt) {
  if (!state.writer) return;
  try {
    await allDeviceTestQuietAll(opt, { ignoreStop: true });
  } catch (error) {
    logLine(`[warn] all-device quiet restore failed: ${error.message}`);
  }
  for (const command of ["V1,0", "V2,0"]) {
    try {
      await sendCommand(command, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    } catch (error) {
      logLine(`[warn] ${command} restore failed: ${error.message}`);
    }
  }
}

function allDeviceTestApplySweepOptions(device, adcIndex, opt) {
  const targetDac = allDeviceTestDacForDevice(device);
  for (const dac of ["D1", "D2"]) {
    const enabled = dac === targetDac;
    if ($(`sweep${dac}Enable`)) $(`sweep${dac}Enable`).checked = enabled;
    if ($(`sweep${dac}Mode`)) $(`sweep${dac}Mode`).value = "Vhigh mV";
    if ($(`sweep${dac}Start`)) $(`sweep${dac}Start`).value = opt.startMv;
    if ($(`sweep${dac}Stop`)) $(`sweep${dac}Stop`).value = opt.stopMv;
    if ($(`sweep${dac}Step`)) $(`sweep${dac}Step`).value = opt.stepMv;
    setPlotAdcSelection(dac, enabled ? [adcIndex] : []);
  }
  if ($("sweepDwell")) $("sweepDwell").value = 0;
  if ($("adcAvgSamples")) $("adcAvgSamples").value = opt.avg;
  if ($("sweepPointRepeats")) $("sweepPointRepeats").value = opt.pointRepeats;
  if ($("sweepSettleUs")) $("sweepSettleUs").value = opt.settleUs;
  if ($("sweepPreBiasMs")) $("sweepPreBiasMs").value = opt.preBiasMs;
  if ($("sweepRepeats")) $("sweepRepeats").value = 1;
  if ($("sweepReverse")) $("sweepReverse").checked = opt.reverse;
  if ($("plotYMode")) $("plotYMode").value = opt.yMode;
  return targetDac;
}

function allDeviceTestEdgeMetrics(data, fit) {
  const count = Math.max(1, Math.min(12, Math.floor((data || []).length * 0.08)));
  const edge = [...(data || []).slice(0, count), ...(data || []).slice(-count)];
  const amplitude = Math.max(Math.abs(Number(fit?.A) || 0), 1e-12);
  const baseline = Number(fit?.baseline) || 0;
  const edgePeak = edge.reduce((max, item) => Math.max(max, Math.abs(Number(item.y) - baseline)), 0);
  return { edgeRatio: edgePeak / amplitude, edgeCount: edge.length };
}

function allDeviceTestStatusForResult(result, suspects) {
  const tags = [];
  if (suspects?.has(Number(result.device))) tags.push("user-suspect");
  if (!result.fit) tags.push("fit-failed");
  else {
    if (result.fit.edgeLocked || result.edgeRatio > 0.45) tags.push("edge-high");
    else if (result.edgeRatio > 0.25) tags.push("edge-mid");
    if (Number(result.fit.r2) < 0.85) tags.push("low-R2");
  }
  return tags.length ? tags.join("+") : "good";
}

function renderAllDeviceTestSummary() {
  const host = $("allDeviceTestSummary");
  if (!host) return;
  const rows = Array.isArray(state.allDeviceTestRows) ? state.allDeviceTestRows : [];
  if (!rows.length) {
    host.innerHTML = "No all-device test rows yet.";
  } else {
    host.innerHTML = `<div class="all-device-test-table-wrap"><table class="all-device-test-table"><thead><tr>
      <th>D</th><th>ADC</th><th>DAC</th><th>status</th><th>A amp</th><th>mu V</th><th>sigma V</th><th>baseline</th><th>R2</th><th>edge/A</th><th>pts</th>
    </tr></thead><tbody>${rows.map(row => `<tr>
      <td>D${row.device}</td><td>${Number.isFinite(row.adcIndex) ? `ADC${row.adcIndex}` : "-"}</td><td>${row.xDac || ""}</td><td>${deviceCalHtmlEscape(row.status)}</td>
      <td>${deviceDetectFormat(row.fit?.A, 6)}</td><td>${deviceDetectFormat(row.fit?.mu, 4)}</td><td>${deviceDetectFormat(row.fit?.sigma, 4)}</td>
      <td>${deviceDetectFormat(row.fit?.baseline, 6)}</td><td>${deviceDetectFormat(row.fit?.r2, 4)}</td><td>${deviceDetectFormat(row.edgeRatio, 3)}</td><td>${row.dataPoints || 0}</td>
    </tr>`).join("")}</tbody></table></div>`;
  }
  const downloadButton = $("allDeviceTestDownloadButton");
  if (downloadButton) downloadButton.disabled = state.allDeviceTestRunning || rows.length === 0;
}

function allDeviceTestFitLatest(device, xDac, adcIndex, yMode) {
  const data = gaussianFitSeries(xDac, adcIndex, yMode);
  if (data.length < 6) throw new Error(`D${device} ADC${adcIndex} has only ${data.length} point(s).`);
  const fit = fitGaussianData(data);
  const metrics = allDeviceTestEdgeMetrics(data, fit);
  return { data, fit, ...metrics };
}

async function startAllDeviceTest() {
  if (state.allDeviceTestRunning || state.sweepRunning) return;
  if (!state.connected || !state.writer) {
    allDeviceTestStatus("Connect UART before all-device test.", "warn");
    return;
  }
  let opt;
  try {
    opt = allDeviceTestOptions();
  } catch (error) {
    allDeviceTestStatus(error.message, "warn");
    return;
  }
  const snapshot = allDeviceTestSweepUiSnapshot();
  state.allDeviceTestRows = [];
  state.allDeviceTestStopRequested = false;
  setAllDeviceTestControlsRunning(true);
  renderAllDeviceTestSummary();
  try {
    allDeviceTestStatus(`All-device test setup: quieting devices to M${opt.offMuCode}/S${opt.offVstartCode}.`, "warn");
    await allDeviceTestQuietAll(opt);
    for (let index = 0; index < opt.devices.length; index++) {
      const device = opt.devices[index];
      if (state.allDeviceTestStopRequested) break;
      const adcIndex = adcIndexFromMappedDevice(device);
      if (!Number.isFinite(adcIndex)) {
        state.allDeviceTestRows.push({ time: new Date().toISOString(), device, adcIndex: "", xDac: allDeviceTestDacForDevice(device), status: "no-adc-map", message: "No ADC mapping for device", config: { ...opt } });
        renderAllDeviceTestSummary();
        continue;
      }
      const xDac = allDeviceTestApplySweepOptions(device, adcIndex, opt);
      allDeviceTestStatus(`All-device test ${index + 1}/${opt.devices.length}: D${device} on ${xDac}/ADC${adcIndex}, program M${opt.muCode}/S${opt.vstartCode}.`, "warn");
      await allDeviceTestQuietAll(opt);
      await programLogicalDevice(device, opt.muCode, opt.vstartCode);
      renderDeviceTable();
      loadDeviceState();
      if (opt.programSettleMs > 0) await sleep(opt.programSettleMs);
      await startSweep();
      if (state.allDeviceTestStopRequested) break;
      const row = {
        time: new Date().toISOString(),
        device,
        adcIndex,
        xDac,
        config: { ...opt },
        sweep: state.lastSweep ? JSON.parse(JSON.stringify(state.lastSweep)) : null,
      };
      try {
        const fitted = allDeviceTestFitLatest(device, xDac, adcIndex, opt.yMode);
        row.fit = fitted.fit;
        row.edgeRatio = fitted.edgeRatio;
        row.edgeCount = fitted.edgeCount;
        row.dataPoints = fitted.data.length;
      } catch (error) {
        row.message = error.message;
      }
      row.status = allDeviceTestStatusForResult(row, opt.suspects);
      state.allDeviceTestRows.push(row);
      renderAllDeviceTestSummary();
    }
    const okCount = state.allDeviceTestRows.filter(row => row.status === "good").length;
    const flaggedCount = state.allDeviceTestRows.length - okCount;
    allDeviceTestStatus(state.allDeviceTestStopRequested ? `All-device test stopped: ${state.allDeviceTestRows.length}/${opt.devices.length} row(s).` : `All-device test complete: ${state.allDeviceTestRows.length} row(s), ${okCount} good, ${flaggedCount} flagged.`, state.allDeviceTestStopRequested || flaggedCount ? "warn" : "ok");
  } catch (error) {
    allDeviceTestStatus(`All-device test failed: ${error.message}`, "warn");
  } finally {
    await allDeviceTestReturnSafe(opt);
    restoreAllDeviceTestSweepUi(snapshot);
    setAllDeviceTestControlsRunning(false);
    renderAllDeviceTestSummary();
  }
}

function stopAllDeviceTest() {
  state.allDeviceTestStopRequested = true;
  if (state.sweepRunning) stopSweep();
  allDeviceTestStatus("All-device test stop requested; current sweep may finish first.", "warn");
}

function allDeviceTestParameterRows() {
  const first = (state.allDeviceTestRows || [])[0];
  const opt = first?.config || {};
  return [
    ["section", "key", "value", "unit", "note"],
    ["export", "kind", "all_device_isolated_test", "", "one active MAX5488 device per firmware sweep"],
    ["export", "created_at", new Date().toISOString(), "", ""],
    ["export", "web_version", WEB_VERSION, "", ""],
    ["firmware", "version", state.firmwareVersion || "", "", ""],
    ["firmware", "protocol", state.firmwareProtocol || "", ""],
    ["test", "devices", (opt.devices || []).join(","), "", ""],
    ["test", "Vmu_code", opt.muCode, "code", "MAX5488 logical Vmu"],
    ["test", "Vstart_code", opt.vstartCode, "code", "MAX5488 logical Vstart"],
    ["test", "off_Vmu_code", opt.offMuCode, "code", "quiet all devices before each sweep"],
    ["test", "off_Vstart_code", opt.offVstartCode, "code", "quiet/off bias, default about 1 V"],
    ["sweep", "start", opt.startMv, "mV", ""],
    ["sweep", "stop", opt.stopMv, "mV", ""],
    ["sweep", "step", opt.stepMv, "mV", ""],
    ["sweep", "adc_avg", opt.avg, "samples", ""],
    ["sweep", "point_repeats", opt.pointRepeats, "reads/point", "repeated ADC readouts averaged per gate point"],
    ["sweep", "settle", opt.settleUs, "us", ""],
    ["sweep", "pre_bias", opt.preBiasMs, "ms", ""],
    ["sweep", "reverse", opt.reverse ? "yes" : "no", "", ""],
    ...ADC_LABELS.map((label, idx) => ["adc_map", label, `TIA${idx + 1}`, "", adcSubLabel(idx)]),
  ];
}

function allDeviceTestSummaryRows() {
  return [[
    "time", "device", "adc", "tia_label", "x_dac", "status", "message", "Vmu_code", "Vmu_V", "Vstart_code", "Vstart_V",
    "A_amp", "mu_V", "sigma_V", "baseline", "R2", "RMSE", "edge_ratio", "points", "sweep_id",
  ], ...(state.allDeviceTestRows || []).map(row => [
    row.time, row.device, row.adcIndex, Number.isFinite(row.adcIndex) ? adcSubLabel(row.adcIndex) : "", row.xDac, row.status, row.message || "",
    row.config?.muCode, potCodeToMuVoltage(row.config?.muCode, row.device), row.config?.vstartCode, potCodeToVstartVoltage(row.config?.vstartCode, row.device),
    row.fit?.A, row.fit?.mu, row.fit?.sigma, row.fit?.baseline, row.fit?.r2, row.fit?.rmse, row.edgeRatio, row.dataPoints, row.sweep?.id,
  ])];
}

function allDeviceTestRuns() {
  return (state.allDeviceTestRows || [])
    .filter(row => row.sweep?.points?.length)
    .map(row => ({
      sweep: row.sweep,
      stepIndex: row.device,
      axisLabel: "all-device-test",
      device: row.device,
      deltaV: "",
      deltaMuV: "",
      deltaVstartV: "",
      muStepV: "",
      vstartStepV: "",
      muCode: row.config?.muCode,
      actualMuV: potCodeToMuVoltage(row.config?.muCode, row.device),
      vstartCode: row.config?.vstartCode,
      actualVstartV: potCodeToVstartVoltage(row.config?.vstartCode, row.device),
    }));
}

function downloadAllDeviceTestCsv() {
  const rows = state.allDeviceTestRows || [];
  if (!rows.length) {
    allDeviceTestStatus("No all-device test rows to download.", "warn");
    return;
  }
  const runs = allDeviceTestRuns();
  const sheets = [
    { name: "parameters", rows: allDeviceTestParameterRows() },
    { name: "summary", rows: allDeviceTestSummaryRows() },
    ...matrixSheetsForRuns(runs, "all_device_test"),
    { name: "tidy_raw", rows: tidyRowsForRuns(runs, true) },
  ];
  downloadWorkbook(`pcb_gaussian_all_device_test_${Date.now()}.xls`, sheets);
  allDeviceTestStatus(`Downloaded all-device test XLS: ${rows.length} device row(s), ${exportPointCountForRuns(runs)} ADC point(s).`, "ok");
}
function setDeviceCalControlsRunning(running) {
  state.deviceCalRunning = running;
  ["deviceCalBatch", "deviceCalLoadBatchButton", "deviceCalSweepFitButton", "deviceCalMedianFitButton", "deviceCalAutoButton", "deviceCalPackageButton", "deviceCalLutStartButton", "deviceCalLutClearButton", "deviceCalLutDownloadButton", "deviceCalObjective", "deviceCalCurveReference", "deviceCalMatchTarget", "deviceCalCurveTol", "deviceCalSimilarityTarget", "deviceCalInitMuCode", "deviceCalInitVstartCode", "deviceCalOffMuCode", "deviceCalOffVstartCode", "deviceCalDummySweeps", "deviceCalMaxCodeDelta", "deviceTargetRunBrowserButton", "deviceTargetCommandButton", "deviceTargetDownloadSeedButton", "deviceTargetDownloadSummaryButton", "allDeviceTestStartButton", "allDeviceTestDownloadButton", "appModelRunUartFitButton", "appModelDownloadUartCurvesButton"].forEach(id => {
    const element = $(id);
    if (element) element.disabled = running;
  });
  const stop = $("deviceCalStopButton");
  if (stop) stop.disabled = !running;
  const appStop = $("appModelStopUartFitButton");
  if (appStop) appStop.disabled = !running;
  updateDeviceCalLutButtons();
  updateDeviceCalOverlayButtons();
}

async function deviceCalSweepAndFitOnce() {
  if (state.deviceCalRunning) return;
  if (!state.writer) {
    deviceCalStatus("Connect UART before device calibration sweep.", "warn");
    return;
  }
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  try {
    prepareDeviceCalSweepSelection();
    deviceCalStatus("Device calibration sweep running...", "warn");
    await startSweep();
    if (state.deviceCalStopRequested) return;
    const results = fitDeviceCalBatch(1);
    const okCount = results.filter(result => result.converged).length;
    const summary = deviceCalBatchSummaryText(results, deviceCalObjective());
    deviceCalStatus(`Sweep fit complete: ${summary}.`, okCount === results.length ? "ok" : "warn");
  } catch (error) {
    deviceCalStatus(error.message, "warn");
  } finally {
    setDeviceCalControlsRunning(false);
  }
}

function deviceCalBatchSummaryText(results, objective = deviceCalObjective()) {
  const valid = (results || []).filter(result => result?.fit && result?.error);
  if (objective === "curve") {
    const rmses = valid.map(result => Number(result.error?.curve?.rmse)).filter(Number.isFinite);
    const similarities = valid.map(result => Number(result.error?.curve?.similarity)).filter(Number.isFinite);
    const maxRmse = rmses.length ? Math.max(...rmses) : NaN;
    const meanRmse = rmses.length ? average(rmses) : NaN;
    const meanSimilarity = similarities.length ? average(similarities) : NaN;
    const maxNorm = valid.length ? Math.max(...valid.map(result => Number(result.error?.norm)).filter(Number.isFinite)) : NaN;
    return `curve max RMSE ${Number(maxRmse).toPrecision(4)}, mean RMSE ${Number(meanRmse).toPrecision(4)}, mean sim ${Number.isFinite(meanSimilarity) ? (meanSimilarity * 100).toFixed(1) : "n/a"}%, max norm ${Number(maxNorm).toPrecision(4)}`;
  }
  const okCount = (results || []).filter(result => result.converged).length;
  return `${okCount}/${(results || []).length} within tolerance`;
}
async function autoFitDeviceCalBatch() {
  if (state.deviceCalRunning) return;
  if (!state.writer) {
    deviceCalStatus("Connect UART before device calibration.", "warn");
    return;
  }
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  const maxIter = deviceCalNumber("deviceCalMaxIter", 20, { min: 1, max: 100, integer: true });
  const settleMs = deviceCalNumber("deviceCalSettleMs", 1000, { min: 0, max: 30000, integer: true });
  const objective = deviceCalObjective();
  const perDeviceIter = $("deviceCalPerDeviceIter")?.checked !== false;
  let activeDevices = new Set(deviceCalChannels().map(channel => channel.device));
  try {
    for (let iter = 1; iter <= maxIter; iter++) {
      if (state.deviceCalStopRequested) break;
      prepareDeviceCalSweepSelection();
      deviceCalStatus(`Device calibration ${iter}/${maxIter}: sweeping D1/D2 with ADC0-7, active ${activeDevices.size}/${ADC_TIA_COUNT}, objective ${objective}.`, "warn");
      await startSweep();
      if (state.deviceCalStopRequested) break;
      const results = fitDeviceCalBatch(iter, perDeviceIter ? { objective, activeDevices } : { objective });
      for (const result of results) {
        if (result.converged) activeDevices.delete(result.channel.device);
      }
      const okCount = results.filter(result => result.converged).length;
      const validPlans = results
        .filter(result => (!perDeviceIter || activeDevices.has(result.channel.device)) && !result.converged && result.plan && planHasCodeChange(result.plan))
        .map(result => result.plan);
      if (okCount === results.length || (perDeviceIter && activeDevices.size === 0)) {
        deviceCalStatus(`Device calibration converged at ${iter}/${maxIter}: ${deviceCalBatchSummaryText(results, objective)}.`, "ok");
        return;
      }
      if (!validPlans.length) {
        deviceCalStatus(`Device calibration stopped at ${iter}/${maxIter}: ${deviceCalBatchSummaryText(results, objective)}, no remaining code change.`, "warn");
        return;
      }
      for (const plan of validPlans) {
        if (state.deviceCalStopRequested) break;
        plan.programCommand = plan.programCommand || deviceCalProgramCommand(plan);
        await programLogicalDevice(plan.device, plan.nextMuCode, plan.nextVstartCode ?? plan.nextACode);
        plan.programmed = true;
        plan.programmedAt = new Date().toISOString();
      }
      renderDeviceTable();
      loadDeviceState();
      deviceCalStatus(`Device calibration ${iter}/${maxIter}: programmed ${validPlans.length} device(s), ${deviceCalBatchSummaryText(results, objective)}, active ${activeDevices.size}.`, "warn");
      if (settleMs > 0 && !state.deviceCalStopRequested) await sleep(settleMs);
    }
    if (state.deviceCalStopRequested) {
      deviceCalStatus("Device calibration stop requested.", "warn");
      return;
    }
    deviceCalStatus(`Device calibration reached max iter ${maxIter}: ${deviceCalBatchSummaryText(state.deviceCalResults || [], objective)}.`, "warn");
  } catch (error) {
    deviceCalStatus(error.message, "warn");
  } finally {
    setDeviceCalControlsRunning(false);
  }
}

function deviceCalMatchNumber(id, fallback, options = {}) {
  return deviceCalNumber(id, fallback, options);
}

function deviceCalMatchOptions() {
  return {
    runId: `web_device_cal_${Date.now()}`,
    matchTarget: $("deviceCalMatchTarget")?.value || "median",
    initMuCode: deviceCalMatchNumber("deviceCalInitMuCode", 0, { min: 0, max: POT_MAX_CODE, integer: true }),
    initVstartCode: deviceCalMatchNumber("deviceCalInitVstartCode", 100, { min: 0, max: POT_MAX_CODE, integer: true }),
    offMuCode: deviceCalMatchNumber("deviceCalOffMuCode", 0, { min: 0, max: POT_MAX_CODE, integer: true }),
    offVstartCode: deviceCalMatchNumber("deviceCalOffVstartCode", 20, { min: 0, max: POT_MAX_CODE, integer: true }),
    dummySweeps: deviceCalMatchNumber("deviceCalDummySweeps", 1, { min: 0, max: 5, integer: true }),
    maxCodeDelta: deviceCalMatchNumber("deviceCalMaxCodeDelta", 24, { min: 1, max: POT_MAX_CODE, integer: true }),
    similarityTarget: deviceCalMatchNumber("deviceCalSimilarityTarget", 0.95, { min: 0, max: 1 }),
    maxIter: deviceCalMatchNumber("deviceCalMaxIter", 20, { min: 1, max: 100, integer: true }),
    settleMs: deviceCalMatchNumber("deviceCalSettleMs", 1000, { min: 0, max: 30000, integer: true }),
    yMode: $("deviceCalYMode")?.value || "current",
  };
}

function deviceCalChannelForDevice(device) {
  const target = Math.round(Number(device));
  const channels = deviceCalChannels();
  const found = channels.find(channel => channel.device === target);
  if (found) return found;
  const adcIndex = adcIndexFromMappedDevice(target);
  return {
    index: clamp(target - deviceCalBatchStart(), 0, ADC_TIA_COUNT - 1),
    slot: clamp(target - deviceCalBatchStart(), 0, ADC_TIA_COUNT - 1),
    adcIndex: Number.isFinite(adcIndex) ? adcIndex : 0,
    label: Number.isFinite(adcIndex) ? `ADC${adcIndex}` : "ADC0",
    xDac: deviceCalDacForDevice(target),
    device: target,
  };
}

function deviceCalMatchDevices() {
  return [...new Set(deviceCalChannels().map(channel => channel.device))].sort((a, b) => a - b);
}

async function deviceCalMatchProgramAllOff(opt) {
  for (let device = 1; device <= 16; device++) {
    if (state.deviceCalStopRequested) break;
    await programLogicalDevice(device, opt.offMuCode, opt.offVstartCode);
  }
  renderDeviceTable();
  loadDeviceState();
}

function deviceCalMatchApplySweepOptions(channel) {
  const targetDac = channel.xDac;
  for (const dac of ["D1", "D2"]) {
    const enabled = dac === targetDac;
    if ($(`sweep${dac}Enable`)) $(`sweep${dac}Enable`).checked = enabled;
    if ($(`sweep${dac}Mode`)) $(`sweep${dac}Mode`).value = "Vhigh mV";
    setPlotAdcSelection(dac, enabled ? [channel.adcIndex] : []);
  }
  if ($("sweepDwell")) $("sweepDwell").value = 0;
  if ($("sweepRepeats")) $("sweepRepeats").value = 1;
  if ($("plotYMode")) $("plotYMode").value = $("deviceCalYMode")?.value || "current";
}

function deviceCalMatchSweepLog() {
  const sweep = deviceCalCurrentSweepLog();
  return sweep ? { ...sweep } : null;
}

async function deviceCalMatchMeasureDevice(device, muCode, vstartCode, iter, phase, opt) {
  const channel = deviceCalChannelForDevice(device);
  await deviceCalMatchProgramAllOff(opt);
  if (state.deviceCalStopRequested) throw new Error("Device matching stopped.");
  await programLogicalDevice(device, muCode, vstartCode);
  renderDeviceTable();
  loadDeviceState();
  if (opt.settleMs > 0 && !state.deviceCalStopRequested) await sleep(opt.settleMs);
  deviceCalMatchApplySweepOptions(channel);
  for (let dummy = 0; dummy < opt.dummySweeps; dummy++) {
    if (state.deviceCalStopRequested) throw new Error("Device matching stopped.");
    deviceCalStatus(`D${device} ${phase}: dummy sweep ${dummy + 1}/${opt.dummySweeps}.`, "warn");
    await startSweep();
  }
  if (state.deviceCalStopRequested) throw new Error("Device matching stopped.");
  deviceCalStatus(`D${device} ${phase}: sweep-fit at M${muCode}/S${vstartCode}.`, "warn");
  await startSweep();
  const sweep = deviceCalMatchSweepLog();
  const data = gaussianFitSeries(channel.xDac, channel.adcIndex, opt.yMode);
  const fit = { ...fitGaussianData(data), xDac: channel.xDac, adcIndex: channel.adcIndex, yMode: opt.yMode, data };
  return {
    time: new Date().toISOString(),
    iter,
    channel,
    target: null,
    fit,
    error: null,
    plan: null,
    action: phase,
    objective: "curve",
    active: true,
    converged: false,
    matchPhase: phase,
    sweep,
    measuredMuCode: muCode,
    measuredVstartCode: vstartCode,
  };
}

function deviceCalMatchConverged(error, opt) {
  const similarity = Number(error?.curve?.similarity);
  return Boolean(error?.converged) || (Number.isFinite(similarity) && similarity >= opt.similarityTarget);
}

function deviceCalMatchFinalizeResult(result, target, opt, options = {}) {
  const error = deviceCalTargetError(result.fit, target, deviceCalTolerances(), "curve");
  const converged = deviceCalMatchConverged(error, opt);
  let plan = null;
  let action = options.action || result.action || "measured";
  if (options.plan !== false && !converged) {
    const gains = deviceCalGains();
    plan = adjustmentPlanForFit(result.channel.device, target, result.fit, gains.muGain, gains.vstartGain, gains.muVstartGain);
    plan = deviceCalLimitPlanCodeDelta(plan, opt.maxCodeDelta);
    plan.target = target;
    plan.controlTarget = target;
    plan.programCommand = deviceCalProgramCommand(plan);
    if (!planHasCodeChange(plan)) {
      const nudged = planWithMinimumCodeNudge(plan);
      if (nudged) {
        plan = deviceCalLimitPlanCodeDelta(nudged, opt.maxCodeDelta);
        plan.target = target;
        plan.controlTarget = target;
        plan.programCommand = deviceCalProgramCommand(plan);
        action = "minimum code nudge";
      } else {
        action = "no code change";
      }
    } else {
      action = "planned";
    }
  } else if (converged) {
    action = "converged";
  }
  return { ...result, target, error, plan, action, converged };
}

function deviceCalLimitPlanCodeDelta(plan, maxDelta) {
  if (!plan || !Number.isFinite(Number(maxDelta))) return plan;
  const limited = { ...plan };
  const limitAxis = (current, next) => current + clamp(next - current, -maxDelta, maxDelta);
  const currentMu = Number(plan.currentMuCode);
  const currentVs = Number(plan.currentVstartCode ?? plan.currentACode);
  const requestedMu = Number(plan.nextMuCode);
  const requestedVs = Number(plan.nextVstartCode ?? plan.nextACode);
  if ([currentMu, currentVs, requestedMu, requestedVs].every(Number.isFinite)) {
    limited.nextMuCode = clamp(Math.round(limitAxis(currentMu, requestedMu)), 0, POT_MAX_CODE);
    limited.nextVstartCode = clamp(Math.round(limitAxis(currentVs, requestedVs)), 0, POT_MAX_CODE);
    limited.nextACode = limited.nextVstartCode;
    limited.nextMuV = potCodeToMuVoltage(limited.nextMuCode, plan.device);
    limited.nextVstartV = potCodeToVstartVoltage(limited.nextVstartCode, plan.device);
    limited.nextAV = limited.nextVstartV;
    limited.codeDeltaLimited = limited.nextMuCode !== requestedMu || limited.nextVstartCode !== requestedVs;
  }
  return limited;
}

function deviceCalMatchAppendRows(rows) {
  if (!Array.isArray(state.deviceCalHistory)) state.deviceCalHistory = [];
  state.deviceCalHistory.push(...rows);
  if (state.deviceCalHistory.length > 4000) state.deviceCalHistory.splice(0, state.deviceCalHistory.length - 4000);
  updateDeviceCalOverlayButtons();
  drawDeviceCalOverlay();
}

function deviceCalMatchLatestByDevice(rows) {
  const latest = new Map();
  for (const row of rows || []) {
    if (row?.fit && row.channel?.device) latest.set(row.channel.device, row);
  }
  return Array.from(latest.values()).sort((a, b) => (a.channel?.index ?? 0) - (b.channel?.index ?? 0));
}

function deviceCalMatchSummary(results) {
  const valid = (results || []).filter(result => result?.fit && result?.error);
  const similarities = valid.map(result => Number(result.error?.curve?.similarity)).filter(Number.isFinite);
  const losses = valid.map(result => Number(result.error?.curve?.loss ?? result.error?.norm)).filter(Number.isFinite);
  return {
    validCount: valid.length,
    meanSimilarity: similarities.length ? average(similarities) : NaN,
    minSimilarity: similarities.length ? Math.min(...similarities) : NaN,
    meanLoss: losses.length ? average(losses) : NaN,
  };
}

function deviceCalMatchSummaryText(results) {
  const summary = deviceCalMatchSummary(results);
  return `${summary.validCount} fit(s), mean sim ${Number.isFinite(summary.meanSimilarity) ? (summary.meanSimilarity * 100).toFixed(2) : "n/a"}%, min sim ${Number.isFinite(summary.minSimilarity) ? (summary.minSimilarity * 100).toFixed(2) : "n/a"}%, mean loss ${Number.isFinite(summary.meanLoss) ? summary.meanLoss.toPrecision(4) : "n/a"}`;
}

const DEFAULT_APPLICATION_TARGET_X_SCALE = 0.92;
const DEFAULT_APPLICATION_TARGET_X_OFFSET = -2.35;

function applicationTargetAxisTransform(options = {}) {
  let scale = Number(options.targetXScale ?? options.target_x_scale ?? $("appModelTargetXScale")?.value ?? DEFAULT_APPLICATION_TARGET_X_SCALE);
  let offset = Number(options.targetXOffset ?? options.target_x_offset ?? $("appModelTargetXOffset")?.value ?? DEFAULT_APPLICATION_TARGET_X_OFFSET);
  if (!Number.isFinite(scale) || Math.abs(scale) < 1e-12) scale = 1.0;
  if (!Number.isFinite(offset)) offset = 0.0;
  return { scale, offset };
}

function transformApplicationTargetParams(target, axis) {
  const sourceMu = Number(target.mu ?? target.mu_V);
  const sourceSigma = Math.abs(Number(target.sigma ?? target.sigma_V));
  return {
    ...target,
    sourceMu,
    sourceSigma,
    mu: sourceMu * axis.scale + axis.offset,
    sigma: Math.abs(sourceSigma * axis.scale),
    targetXScale: axis.scale,
    targetXOffset: axis.offset,
  };
}

function normalizeApplicationTargetFitTargets(targets, options = {}) {
  const rows = [];
  const axis = applicationTargetAxisTransform(options);
  for (const item of Array.isArray(targets) ? targets : []) {
    const device = clamp(Math.round(Number(item.device)), 1, 16);
    const target = item.target || {};
    const seed = item.seed || {};
    const A = Number(target.A ?? target.A_amp ?? target.A_uA);
    const mu = Number(target.mu ?? target.mu_V);
    const sigma = Math.abs(Number(target.sigma ?? target.sigma_V));
    if (![device, A, mu, sigma].every(Number.isFinite) || sigma <= 0) continue;
    const muCode = clamp(Math.round(Number(seed.muCode ?? item.vmuCode ?? item.muCode ?? item.seed_vmu_code ?? 0)), 0, POT_MAX_CODE);
    const vstartCode = clamp(Math.round(Number(seed.vstartCode ?? item.vstartCode ?? item.seed_vstart_code ?? 100)), 0, POT_MAX_CODE);
    const baseline = Number(target.baseline);
    rows.push({
      device,
      adcPair: item.adcPair ?? item.adc_pair ?? "",
      basis: item.basis || "",
      label: item.label || "",
      target: transformApplicationTargetParams({
        A,
        mu,
        sigma,
        baseline: Number.isFinite(baseline) ? baseline : null,
        referenceMode: "application_target",
      }, axis),
      seed: { muCode, vstartCode },
    });
  }
  return rows;
}

function applicationTargetForMeasuredFit(target, fit) {
  const fallbackBaseline = Number(fit?.baseline);
  const baseline = Number.isFinite(Number(target.baseline)) ? Number(target.baseline)
    : Number.isFinite(fallbackBaseline) ? fallbackBaseline : 0;
  return {
    A: Number(target.A),
    mu: Number(target.mu),
    sigma: Math.max(Math.abs(Number(target.sigma)), 1e-9),
    baseline,
    referenceMode: target.referenceMode || "application_target",
  };
}

async function runApplicationTargetFit(targets, options = {}) {
  if (state.deviceCalRunning || state.sweepRunning) {
    throw new Error("Another sweep or device-calibration run is already active.");
  }
  if (!state.writer) {
    throw new Error("Connect UART before application target fitting.");
  }
  let targetRows = normalizeApplicationTargetFitTargets(targets, options);
  if (!targetRows.length) throw new Error("No valid application target rows were supplied.");
  targetRows = targetRows.sort((a, b) => a.device - b.device);
  const devices = targetRows.map(row => row.device);
  const minDevice = Math.min(...devices);
  const maxDevice = Math.max(...devices);
  if ($("deviceCalBatch")) {
    $("deviceCalBatch").value = minDevice >= 9 ? "9" : "1";
    if ((maxDevice <= 8 && minDevice <= 8) || (minDevice >= 9 && maxDevice >= 9)) deviceCalLoadBatchMap();
  }
  const opt = {
    ...deviceCalMatchOptions(),
    runId: safeExportStem(options.runId || `web_app_target_fit_${Date.now()}`),
  };
  ["maxIter", "similarityTarget", "settleMs", "dummySweeps", "maxCodeDelta"].forEach(key => {
    if (options[key] !== undefined && Number.isFinite(Number(options[key]))) opt[key] = Number(options[key]);
  });
  opt.maxIter = clamp(Math.round(opt.maxIter), 1, 100);
  opt.dummySweeps = clamp(Math.round(opt.dummySweeps), 0, 5);
  opt.maxCodeDelta = clamp(Math.round(opt.maxCodeDelta), 1, POT_MAX_CODE);
  opt.settleMs = clamp(Math.round(opt.settleMs), 0, 30000);
  opt.similarityTarget = clamp(Number(opt.similarityTarget), 0, 1);

  const snapshot = allDeviceTestSweepUiSnapshot();
  state.deviceCalHistory = [];
  state.deviceCalResults = [];
  state.deviceCalPackageRun = {
    id: opt.runId,
    startedAt: new Date().toISOString(),
    options: { ...opt },
    targetMode: "application_target",
    applicationPreset: options.preset || "",
    targetXAxis: applicationTargetAxisTransform(options),
    devices,
    targets: targetRows.map(row => ({
      device: row.device,
      adcPair: row.adcPair,
      basis: row.basis,
      label: row.label,
      target: { ...row.target },
      seed: { ...row.seed },
    })),
  };
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  if ($("deviceCalObjective")) $("deviceCalObjective").value = "curve";
  if ($("deviceCalCurveReference")) $("deviceCalCurveReference").value = "target";
  if ($("deviceCalMatchTarget")) $("deviceCalMatchTarget").value = "manual";

  try {
    for (let targetIndex = 0; targetIndex < targetRows.length; targetIndex += 1) {
      if (state.deviceCalStopRequested) break;
      const spec = targetRows[targetIndex];
      let code = { mu: spec.seed.muCode, vstart: spec.seed.vstartCode };
      for (let iter = 1; iter <= opt.maxIter; iter += 1) {
        if (state.deviceCalStopRequested) break;
        const prefix = `Application target ${targetIndex + 1}/${targetRows.length}: D${spec.device}`;
        deviceCalStatus(`${prefix}, iter ${iter}/${opt.maxIter}, seed M${code.mu}/S${code.vstart}.`, "warn");
        const measured = await deviceCalMatchMeasureDevice(spec.device, code.mu, code.vstart, iter, "application target", opt);
        const rowTarget = applicationTargetForMeasuredFit(spec.target, measured.fit);
        let result = deviceCalMatchFinalizeResult(measured, rowTarget, opt, { plan: iter < opt.maxIter, action: "application target fit" });
        result.applicationTarget = {
          preset: options.preset || "",
          adcPair: spec.adcPair,
          basis: spec.basis,
          label: spec.label,
          targetIndex,
        };
        if (result.plan && planHasCodeChange(result.plan) && iter < opt.maxIter) {
          await programLogicalDevice(result.plan.device, result.plan.nextMuCode, result.plan.nextVstartCode ?? result.plan.nextACode);
          result.plan.programmed = true;
          result.plan.programmedAt = new Date().toISOString();
          code = { mu: result.plan.nextMuCode, vstart: result.plan.nextVstartCode ?? result.plan.nextACode };
          if (opt.settleMs > 0 && !state.deviceCalStopRequested) await sleep(opt.settleMs);
        }
        deviceCalMatchAppendRows([result]);
        const latest = deviceCalMatchLatestByDevice(state.deviceCalHistory);
        state.deviceCalResults = latest;
        renderDeviceCalResults([result]);
        const summaryText = deviceCalMatchSummaryText(latest);
        deviceCalStatus(`${prefix}, iter ${iter}/${opt.maxIter}: ${summaryText}.`, result.converged ? "ok" : "warn");
        if (result.converged || !result.plan || !planHasCodeChange(result.plan)) break;
      }
    }
    const latest = deviceCalMatchLatestByDevice(state.deviceCalHistory);
    state.deviceCalResults = latest;
    renderDeviceCalResults(latest);
    state.deviceCalPackageRun.finishedAt = new Date().toISOString();
    state.deviceCalPackageRun.finalSummary = deviceCalMatchSummary(latest);
    const finalText = deviceCalMatchSummaryText(latest);
    const stopped = state.deviceCalStopRequested;
    deviceCalStatus(`${stopped ? "Application target fit stopped" : "Application target fit complete"}: ${finalText}.`, stopped ? "warn" : "ok");
    return {
      status: stopped ? "stopped" : "complete",
      runId: opt.runId,
      preset: options.preset || "",
      summary: deviceCalMatchSummary(latest),
      results: latest,
      history: state.deviceCalHistory.slice(),
      curveCsv: deviceCalCurvePointCsvRows(state.deviceCalHistory).join("\n"),
    };
  } catch (error) {
    deviceCalStatus(error.message, "warn");
    throw error;
  } finally {
    try { await deviceCalMatchProgramAllOff(opt); } catch (error) { logLine(`[warn] application target final off failed: ${error.message}`); }
    restoreAllDeviceTestSweepUi(snapshot);
    setDeviceCalControlsRunning(false);
  }
}
async function runDeviceCalMedianTargetFit() {
  if (state.deviceCalRunning || state.sweepRunning) return;
  if (!state.writer) {
    deviceCalStatus("Connect UART before median target fitting.", "warn");
    return;
  }
  let opt;
  try {
    opt = deviceCalMatchOptions();
  } catch (error) {
    deviceCalStatus(error.message, "warn");
    return;
  }
  const devices = deviceCalMatchDevices();
  if (!devices.length) {
    deviceCalStatus("No Device cal devices are configured.", "warn");
    return;
  }
  const snapshot = allDeviceTestSweepUiSnapshot();
  state.deviceCalHistory = [];
  state.deviceCalResults = [];
  state.deviceCalPackageRun = { id: opt.runId, startedAt: new Date().toISOString(), options: { ...opt }, devices };
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  if ($("deviceCalObjective")) $("deviceCalObjective").value = "curve";
  if ($("deviceCalCurveReference")) $("deviceCalCurveReference").value = "target";
  const codes = new Map(devices.map(device => [device, { mu: opt.initMuCode, vstart: opt.initVstartCode }]));
  try {
    const initialRaw = [];
    for (let idx = 0; idx < devices.length; idx++) {
      if (state.deviceCalStopRequested) break;
      const device = devices[idx];
      deviceCalStatus(`Initial target scan ${idx + 1}/${devices.length}: D${device}.`, "warn");
      initialRaw.push(await deviceCalMatchMeasureDevice(device, opt.initMuCode, opt.initVstartCode, 0, "initial", opt));
    }
    if (state.deviceCalStopRequested) throw new Error("Device matching stopped.");
    const target = opt.matchTarget === "manual"
      ? deviceCalTarget()
      : deviceCalReferenceFromFits(initialRaw, deviceCalTarget(), "median");
    if (![target.A, target.mu, target.sigma].every(value => Number.isFinite(Number(value)))) throw new Error("Could not build a valid median target.");
    if ($("deviceCalTargetA")) $("deviceCalTargetA").value = Number(target.A).toPrecision(8);
    if ($("deviceCalTargetMu")) $("deviceCalTargetMu").value = Number(target.mu).toFixed(6);
    if ($("deviceCalTargetSigma")) $("deviceCalTargetSigma").value = Math.abs(Number(target.sigma)).toFixed(6);
    state.deviceCalPackageRun.target = { ...target };
    const initial = initialRaw.map(row => deviceCalMatchFinalizeResult(row, target, opt, { plan: false, action: "initial" }));
    deviceCalMatchAppendRows(initial);
    renderDeviceCalResults(initial);
    let activeDevices = new Set(devices);
    let latest = deviceCalMatchLatestByDevice(initial);
    for (let iter = 1; iter <= opt.maxIter; iter++) {
      if (state.deviceCalStopRequested || !activeDevices.size) break;
      const iterRows = [];
      for (const device of devices) {
        if (state.deviceCalStopRequested) break;
        if (!activeDevices.has(device)) continue;
        const code = codes.get(device) || { mu: opt.initMuCode, vstart: opt.initVstartCode };
        deviceCalStatus(`Median target fit ${iter}/${opt.maxIter}: D${device} at M${code.mu}/S${code.vstart}.`, "warn");
        const measured = await deviceCalMatchMeasureDevice(device, code.mu, code.vstart, iter, "fit", opt);
        let result = deviceCalMatchFinalizeResult(measured, target, opt, { plan: iter < opt.maxIter });
        if (result.converged) activeDevices.delete(device);
        if (result.plan && planHasCodeChange(result.plan) && iter < opt.maxIter) {
          await programLogicalDevice(result.plan.device, result.plan.nextMuCode, result.plan.nextVstartCode ?? result.plan.nextACode);
          result.plan.programmed = true;
          result.plan.programmedAt = new Date().toISOString();
          codes.set(device, { mu: result.plan.nextMuCode, vstart: result.plan.nextVstartCode ?? result.plan.nextACode });
          if (opt.settleMs > 0 && !state.deviceCalStopRequested) await sleep(opt.settleMs);
        } else if (!result.converged && (!result.plan || !planHasCodeChange(result.plan))) {
          activeDevices.delete(device);
        }
        iterRows.push(result);
        latest = deviceCalMatchLatestByDevice([...latest, result]);
        state.deviceCalResults = latest;
        renderDeviceCalResults([result]);
      }
      if (iterRows.length) deviceCalMatchAppendRows(iterRows);
      const summaryText = deviceCalMatchSummaryText(latest);
      deviceCalStatus(`Median target fit ${iter}/${opt.maxIter}: ${summaryText}, active ${activeDevices.size}/${devices.length}.`, activeDevices.size ? "warn" : "ok");
    }
    latest = deviceCalMatchLatestByDevice(state.deviceCalHistory);
    state.deviceCalResults = latest;
    renderDeviceCalResults(latest);
    state.deviceCalPackageRun.finishedAt = new Date().toISOString();
    state.deviceCalPackageRun.finalSummary = deviceCalMatchSummary(latest);
    const finalText = deviceCalMatchSummaryText(latest);
    deviceCalStatus(`Median target fit complete: ${finalText}.`, "ok");
  } catch (error) {
    deviceCalStatus(error.message, "warn");
  } finally {
    try { await deviceCalMatchProgramAllOff(opt); } catch (error) { logLine(`[warn] device match final off failed: ${error.message}`); }
    restoreAllDeviceTestSweepUi(snapshot);
    setDeviceCalControlsRunning(false);
  }
}

function deviceCalPackageRows() {
  return (Array.isArray(state.deviceCalHistory) ? state.deviceCalHistory : []).filter(row => row?.fit?.data?.length);
}

function deviceCalPackageSummaryRows(rows, phaseLabel) {
  const fields = [
    "phase", "time", "iter", "device", "dac", "adc", "mu_code", "vstart_code", "A_uA", "mu_V", "sigma_V", "baseline_uA", "r2", "rmse_fit",
    "target_A_uA", "target_mu_V", "target_sigma_V", "target_baseline_uA", "curve_rmse", "curve_mae", "curve_similarity", "loss", "converged", "action", "program_command",
  ];
  const out = [fields];
  for (const row of rows) {
    const fit = row.fit || {};
    const error = row.error || {};
    const curve = error.curve || {};
    const plan = row.plan || {};
    out.push(fields.map(field => ({
      phase: phaseLabel || row.matchPhase || row.action,
      time: row.time,
      iter: row.iter,
      device: row.channel?.device,
      dac: row.channel?.xDac,
      adc: `ADC${row.channel?.adcIndex}`,
      mu_code: row.measuredMuCode ?? plan.currentMuCode,
      vstart_code: row.measuredVstartCode ?? (plan.currentVstartCode ?? plan.currentACode),
      A_uA: fit.A,
      mu_V: fit.mu,
      sigma_V: Math.abs(Number(fit.sigma)),
      baseline_uA: fit.baseline,
      r2: fit.r2,
      rmse_fit: fit.rmse,
      target_A_uA: row.target?.A,
      target_mu_V: row.target?.mu,
      target_sigma_V: row.target?.sigma,
      target_baseline_uA: row.target?.baseline,
      curve_rmse: curve.rmse,
      curve_mae: curve.mae,
      curve_similarity: curve.similarity,
      loss: curve.loss ?? error.norm,
      converged: row.converged ? "yes" : "no",
      action: row.action,
      program_command: plan.programCommand,
    }[field])));
  }
  return out;
}

function deviceCalPackageCurvePointRows(rows) {
  const fields = ["phase", "time", "iter", "device", "dac", "adc", "point", "x_V", "I_uA", "fit_I_uA", "target_I_uA", "residual_fit", "residual_target", "mu_code", "vstart_code"];
  const out = [fields];
  for (const row of rows) {
    const reference = deviceCalReferenceParamsForRow(row);
    for (const point of row.fit?.data || []) {
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const fitY = gaussianValue(row.fit, x);
      const targetY = gaussianValue(reference, x);
      const values = {
        phase: row.matchPhase || row.action,
        time: row.time,
        iter: row.iter,
        device: row.channel?.device,
        dac: row.channel?.xDac,
        adc: `ADC${row.channel?.adcIndex}`,
        point: point.point,
        x_V: x,
        I_uA: y,
        fit_I_uA: fitY,
        target_I_uA: targetY,
        residual_fit: y - fitY,
        residual_target: y - targetY,
        mu_code: row.measuredMuCode ?? row.plan?.currentMuCode,
        vstart_code: row.measuredVstartCode ?? (row.plan?.currentVstartCode ?? row.plan?.currentACode),
      };
      out.push(fields.map(field => values[field]));
    }
  }
  return out;
}

function deviceCalPackageOriginRows(rows, labelMode = "device") {
  const target = rows.find(row => row.target)?.target || deviceCalTarget();
  const xs = Array.from(new Set(rows.flatMap(row => (row.fit?.data || []).map(point => Number(point.x)).filter(Number.isFinite)))).sort((a, b) => a - b);
  const series = rows.map(row => {
    const device = String(row.channel?.device || "").padStart(2, "0");
    const label = labelMode === "device" ? `D${device}_I_uA` : `D${device}_i${String(row.iter || 0).padStart(3, "0")}_${row.matchPhase || row.action}_I_uA`;
    const byX = new Map((row.fit?.data || []).map(point => [Number(point.x), Number(point.y)]));
    return { label, byX };
  });
  const out = [["point", "x_V", "target_I_uA", ...series.map(item => item.label)]];
  xs.forEach((x, index) => {
    out.push([index, x, gaussianValue(target, x), ...series.map(item => item.byX.has(x) ? item.byX.get(x) : "")]);
  });
  return out;
}

async function saveDeviceCalFitPackage() {
  const rows = deviceCalPackageRows();
  if (!rows.length) {
    deviceCalStatus("No Device cal fitting rows to package.", "warn");
    return;
  }
  const initialRows = rows.filter(row => row.matchPhase === "initial");
  const finalRows = deviceCalMatchLatestByDevice(rows);
  const stem = safeExportStem(`pcb_gaussian_web_device_cal_${state.deviceCalPackageRun?.id || Date.now()}`);
  const target = rows.find(row => row.target)?.target || deviceCalTarget();
  const targetPayload = Array.isArray(state.deviceCalPackageRun?.targets) && state.deviceCalPackageRun.targets.length
    ? {
      mode: state.deviceCalPackageRun.targetMode || "application_target",
      applicationPreset: state.deviceCalPackageRun.applicationPreset || "",
      targets: state.deviceCalPackageRun.targets,
    }
    : target;
  const manifestRows = [
    ["file", "description"],
    [`${stem}_manifest.csv`, "File list and run metadata"],
    [`${stem}_target_curve.json`, "Target Gaussian parameters"],
    [`${stem}_initial_summary.csv`, "Initial same-condition fit summary"],
    [`${stem}_final_summary.csv`, "Latest fit summary per device"],
    [`${stem}_iteration_log.csv`, "All fitting rows with error and commands"],
    [`${stem}_curve_points.csv`, "Long-form measured, fit, target, residual data"],
    [`${stem}_origin_initial_xy_pairs.csv`, "Origin-ready initial XY matrix"],
    [`${stem}_origin_final_xy_pairs.csv`, "Origin-ready final XY matrix"],
    [`${stem}_origin_all_steps_xy_pairs.csv`, "Origin-ready iteration curve matrix"],
  ];
  const runRows = [
    ["key", "value"],
    ["created_at", new Date().toISOString()],
    ["web_version", WEB_VERSION],
    ["run_id", state.deviceCalPackageRun?.id || ""],
    ["batch_start", deviceCalBatchStart()],
    ["target_mode", state.deviceCalPackageRun?.targetMode || "single"],
    ["application_preset", state.deviceCalPackageRun?.applicationPreset || ""],
    ["target_count", Array.isArray(state.deviceCalPackageRun?.targets) ? state.deviceCalPackageRun.targets.length : 1],
    ["target_A_uA", target.A],
    ["target_mu_V", target.mu],
    ["target_sigma_V", target.sigma],
    ["target_baseline_uA", target.baseline ?? ""],
    ["rows", rows.length],
    ["final_summary", deviceCalMatchSummaryText(finalRows)],
  ];
  const directoryHandle = await chooseExportDirectory(stem);
  await saveRowsCsvExport(`${stem}_manifest.csv`, [...manifestRows, [], ...runRows], directoryHandle);
  await saveTextExportFile(`${stem}_target_curve.json`, JSON.stringify(targetPayload, null, 2), "application/json;charset=utf-8", directoryHandle);
  await saveRowsCsvExport(`${stem}_initial_summary.csv`, deviceCalPackageSummaryRows(initialRows, "initial"), directoryHandle);
  await saveRowsCsvExport(`${stem}_final_summary.csv`, deviceCalPackageSummaryRows(finalRows, "final"), directoryHandle);
  await saveRowsCsvExport(`${stem}_iteration_log.csv`, deviceCalPackageSummaryRows(rows, "iteration"), directoryHandle);
  await saveRowsCsvExport(`${stem}_curve_points.csv`, deviceCalPackageCurvePointRows(rows), directoryHandle);
  await saveRowsCsvExport(`${stem}_origin_initial_xy_pairs.csv`, deviceCalPackageOriginRows(initialRows, "device"), directoryHandle);
  await saveRowsCsvExport(`${stem}_origin_final_xy_pairs.csv`, deviceCalPackageOriginRows(finalRows, "device"), directoryHandle);
  await saveRowsCsvExport(`${stem}_origin_all_steps_xy_pairs.csv`, deviceCalPackageOriginRows(rows, "step"), directoryHandle);
  deviceCalStatus(`Saved Device cal fit package: ${rows.length} row(s), ${finalRows.length} final device(s).`, "ok");
}

function deviceTargetSearchStatus(text, kind = "") {
  const status = $("deviceTargetSearchStatus");
  if (status) {
    status.textContent = text;
    status.className = `hint status-line ${kind}`.trim();
  }
  deviceCalStatus(text, kind);
  logLine(`[target-search] ${text}`);
}

function deviceTargetNumber(id, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
  const input = $(id);
  let value = Number(input?.value);
  if (!Number.isFinite(value)) value = fallback;
  if (integer) value = Math.round(value);
  value = clamp(value, min, max);
  if (input) input.value = integer ? String(value) : String(value);
  return value;
}

function deviceTargetShifts() {
  const text = String($("deviceTargetShifts")?.value || "0,0");
  const shifts = [];
  for (const item of text.replaceAll("|", ";").split(";")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(",").map(value => Math.round(Number(value.trim())));
    if (parts.length !== 2 || !parts.every(Number.isFinite)) throw new Error(`Bad target shift: ${trimmed}`);
    shifts.push({ index: shifts.length, muOffset: parts[0], vstartOffset: parts[1] });
  }
  if (!shifts.length) throw new Error("Enter at least one target shift.");
  return shifts;
}

function deviceTargetOptions() {
  return {
    shifts: deviceTargetShifts(),
    fitFrom: $("deviceTargetFitFrom")?.value || "base",
    fitStages: deviceTargetNumber("deviceTargetFitStages", 1, { min: 0, max: 20, integer: true }),
    threshold: deviceTargetNumber("deviceTargetThreshold", 0.95, { min: 0, max: 1 }),
    metric: $("deviceTargetMetric")?.value === "min_similarity" ? "min_similarity" : "mean_similarity",
    startMv: deviceTargetNumber("deviceTargetStartMv", DAC_OUTPUT_MIN_MV, { min: DAC_OUTPUT_MIN_MV, max: DAC_OUTPUT_MAX_MV, integer: true }),
    stopMv: deviceTargetNumber("deviceTargetStopMv", DAC_OUTPUT_MAX_MV, { min: DAC_OUTPUT_MIN_MV, max: DAC_OUTPUT_MAX_MV, integer: true }),
    stepMv: deviceTargetNumber("deviceTargetStepMv", 300, { min: 1, max: 30000, integer: true }),
    avg: deviceTargetNumber("deviceTargetAvg", 256, { min: 1, max: ADC_AVG_MAX, integer: true }),
    settleUs: deviceTargetNumber("deviceTargetSettleUs", 30000, { min: 0, max: 65000, integer: true }),
    preBiasMs: deviceTargetNumber("deviceTargetPreBiasMs", 2000, { min: 0, max: 30000, integer: true }),
    reverse: $("deviceTargetReverse")?.checked !== false,
    acceptOnly: $("deviceTargetAcceptOnly")?.checked === true,
    programSettleMs: 500,
  };
}

function deviceTargetCurrentCodes(devices) {
  const codes = new Map();
  for (const device of devices) {
    codes.set(device, {
      mu: logicalMuCodeForDevice(device),
      vstart: logicalVstartCodeForDevice(device),
    });
  }
  return codes;
}

function deviceTargetCloneCodes(codes) {
  return new Map(Array.from(codes.entries()).map(([device, code]) => [device, { mu: code.mu, vstart: code.vstart }]));
}

function deviceTargetShiftCodes(codes, shift) {
  const shifted = new Map();
  for (const [device, code] of codes.entries()) {
    shifted.set(device, {
      mu: clamp(Math.round(code.mu + shift.muOffset), 0, POT_MAX_CODE),
      vstart: clamp(Math.round(code.vstart + shift.vstartOffset), 0, POT_MAX_CODE),
    });
  }
  return shifted;
}

async function deviceTargetProgramCodes(codes, opt = {}) {
  for (const [device, code] of codes.entries()) {
    if (state.deviceCalStopRequested) break;
    await programLogicalDevice(device, code.mu, code.vstart);
  }
  renderDeviceTable();
  loadDeviceState();
  if ((opt.programSettleMs || 0) > 0 && !state.deviceCalStopRequested) await sleep(opt.programSettleMs);
}

function deviceTargetApplySweepOptions(opt) {
  if ($("sweepD1Start")) $("sweepD1Start").value = opt.startMv;
  if ($("sweepD1Stop")) $("sweepD1Stop").value = opt.stopMv;
  if ($("sweepD1Step")) $("sweepD1Step").value = opt.stepMv;
  if ($("sweepD2Start")) $("sweepD2Start").value = opt.startMv;
  if ($("sweepD2Stop")) $("sweepD2Stop").value = opt.stopMv;
  if ($("sweepD2Step")) $("sweepD2Step").value = opt.stepMv;
  if ($("adcAvgSamples")) $("adcAvgSamples").value = opt.avg;
  if ($("sweepPointRepeats")) $("sweepPointRepeats").value = opt.pointRepeats;
  if ($("sweepSettleUs")) $("sweepSettleUs").value = opt.settleUs;
  if ($("sweepPreBiasMs")) $("sweepPreBiasMs").value = opt.preBiasMs;
  if ($("sweepReverse")) $("sweepReverse").checked = opt.reverse;
  if ($("sweepDwell")) $("sweepDwell").value = 0;
  prepareDeviceCalSweepSelection({ singleRepeat: true });
}

async function deviceTargetSweepAndFit(iter, opt, fitOptions = {}) {
  deviceTargetApplySweepOptions(opt);
  await startSweep();
  if (state.deviceCalStopRequested) return [];
  return fitDeviceCalBatch(iter, fitOptions);
}

function deviceTargetSetReference(reference) {
  if ($("deviceCalTargetA")) $("deviceCalTargetA").value = Number(reference.A).toPrecision(8);
  if ($("deviceCalTargetMu")) $("deviceCalTargetMu").value = Number(reference.mu).toFixed(6);
  if ($("deviceCalTargetSigma")) $("deviceCalTargetSigma").value = Math.abs(Number(reference.sigma)).toFixed(6);
  if ($("deviceCalObjective")) $("deviceCalObjective").value = "curve";
  if ($("deviceCalCurveReference")) $("deviceCalCurveReference").value = "target";
}

function deviceTargetBatchSummary(results) {
  const valid = (results || []).filter(result => result?.fit && result?.error);
  const similarities = valid.map(result => Number(result.error?.curve?.similarity)).filter(Number.isFinite);
  const rmses = valid.map(result => Number(result.error?.curve?.rmse)).filter(Number.isFinite);
  const fits = valid.map(result => result.fit).filter(Boolean);
  return {
    validCount: valid.length,
    meanSimilarity: similarities.length ? average(similarities) : NaN,
    minSimilarity: similarities.length ? Math.min(...similarities) : NaN,
    meanCurveRmse: rmses.length ? average(rmses) : NaN,
    maxCurveRmse: rmses.length ? Math.max(...rmses) : NaN,
    meanA: median(fits.map(fit => Number(fit.A))),
    meanMu: median(fits.map(fit => Number(fit.mu))),
    meanSigma: median(fits.map(fit => Math.abs(Number(fit.sigma)))),
  };
}

function deviceTargetScore(summary, metric) {
  const value = metric === "min_similarity" ? summary.minSimilarity : summary.meanSimilarity;
  return Number.isFinite(value) ? value : -Infinity;
}

function deviceTargetSearchCsvRows() {
  const rows = [[
    "candidate", "mu_offset", "vstart_offset", "target_A_uA", "target_mu_V", "target_sigma_V",
    "fit_final_stage", "mean_similarity", "min_similarity", "mean_curve_rmse", "max_curve_rmse",
    "median_A_uA", "median_mu_V", "median_sigma_V", "status",
  ]];
  for (const row of state.deviceTargetSearchRows || []) {
    rows.push([
      row.candidate, row.muOffset, row.vstartOffset, row.targetA, row.targetMu, row.targetSigma,
      row.finalStage, row.meanSimilarity, row.minSimilarity, row.meanCurveRmse, row.maxCurveRmse,
      row.meanA, row.meanMu, row.meanSigma, row.status,
    ]);
  }
  return rows;
}

function renderDeviceTargetBestSummary(bestRow) {
  const host = $("deviceTargetBestSummary");
  if (!host) return;
  const rows = state.deviceTargetSearchRows || [];
  if (!rows.length) {
    host.textContent = "No browser target-search rows yet.";
    return;
  }
  const best = bestRow || rows.reduce((acc, row) => (!acc || Number(row.meanSimilarity) > Number(acc.meanSimilarity) ? row : acc), null);
  host.innerHTML = [
    `<strong>Browser best candidate ${deviceCalHtmlEscape(best?.candidate ?? "-")}</strong>`,
    `shift Vmu ${deviceCalHtmlEscape(best?.muOffset ?? "-")} / Vstart ${deviceCalHtmlEscape(best?.vstartOffset ?? "-")}`,
    `target A ${Number(best?.targetA).toPrecision(5)} uA, mu ${Number(best?.targetMu).toFixed(3)} V, sigma ${Number(best?.targetSigma).toFixed(3)} V`,
    `mean similarity ${(100 * Number(best?.meanSimilarity)).toFixed(2)}%, min similarity ${(100 * Number(best?.minSimilarity)).toFixed(2)}%`,
    `${rows.length} candidate(s) measured in this browser session.`,
  ].join("<br>");
  const output = $("deviceTargetCommandOutput");
  if (output) output.value = csvFromRows(deviceTargetSearchCsvRows());
}

async function runDeviceTargetSearchBrowser() {
  if (state.deviceCalRunning) return;
  if (!state.writer) {
    deviceTargetSearchStatus("Connect UART before browser target search.", "warn");
    return;
  }
  let opt;
  try {
    opt = deviceTargetOptions();
  } catch (error) {
    deviceTargetSearchStatus(error.message, "warn");
    return;
  }
  const channels = deviceCalChannels();
  const devices = [...new Set(channels.map(channel => channel.device))];
  if (!devices.length) {
    deviceTargetSearchStatus("No Device cal channels are configured.", "warn");
    return;
  }
  state.deviceTargetSearchRows = [];
  setDeviceCalControlsRunning(true);
  state.deviceCalStopRequested = false;
  const baseCodes = deviceTargetCurrentCodes(devices);
  let bestRow = null;
  try {
    for (const shift of opt.shifts) {
      if (state.deviceCalStopRequested) break;
      const targetCodes = deviceTargetShiftCodes(baseCodes, shift);
      deviceTargetSearchStatus(`Candidate ${shift.index + 1}/${opt.shifts.length}: target shift Vmu ${shift.muOffset}, Vstart ${shift.vstartOffset}.`, "warn");
      await deviceTargetProgramCodes(targetCodes, opt);
      if (state.deviceCalStopRequested) break;
      if ($("deviceCalObjective")) $("deviceCalObjective").value = "curve";
      if ($("deviceCalCurveReference")) $("deviceCalCurveReference").value = "median";
      const targetResults = await deviceTargetSweepAndFit(`target-${shift.index}`, opt, { plan: false, objective: "curve" });
      const reference = deviceCalReferenceFromFits(targetResults, deviceCalTarget(), "median");
      if (![reference.A, reference.mu, reference.sigma].every(value => Number.isFinite(Number(value)))) {
        state.deviceTargetSearchRows.push({
          candidate: shift.index,
          muOffset: shift.muOffset,
          vstartOffset: shift.vstartOffset,
          targetA: NaN,
          targetMu: NaN,
          targetSigma: NaN,
          finalStage: 0,
          meanSimilarity: NaN,
          minSimilarity: NaN,
          meanCurveRmse: NaN,
          maxCurveRmse: NaN,
          meanA: NaN,
          meanMu: NaN,
          meanSigma: NaN,
          status: "target fit failed",
        });
        renderDeviceTargetBestSummary(bestRow);
        continue;
      }
      deviceTargetSetReference(reference);
      const seedCodes = opt.fitFrom === "target-shift" ? targetCodes : baseCodes;
      await deviceTargetProgramCodes(seedCodes, opt);
      let previousScore = -Infinity;
      let bestCandidateScore = -Infinity;
      let bestCandidateCodes = deviceTargetCloneCodes(seedCodes);
      let finalSummary = null;
      let finalStage = 0;
      let status = "max stages";
      for (let stage = 0; stage <= opt.fitStages; stage++) {
        if (state.deviceCalStopRequested) break;
        deviceTargetSearchStatus(`Candidate ${shift.index + 1}/${opt.shifts.length}: fit stage ${stage}/${opt.fitStages}.`, "warn");
        const results = await deviceTargetSweepAndFit(`target-search-${shift.index}-${stage}`, opt, { objective: "curve" });
        finalStage = stage;
        finalSummary = deviceTargetBatchSummary(results);
        const score = deviceTargetScore(finalSummary, opt.metric);
        if (score > bestCandidateScore) {
          bestCandidateScore = score;
          bestCandidateCodes = deviceTargetCurrentCodes(devices);
        }
        if (score >= opt.threshold) {
          status = "threshold reached";
          break;
        }
        if (stage >= opt.fitStages) break;
        if (opt.acceptOnly && previousScore > -Infinity && score + 1e-12 < previousScore) {
          status = "stopped; similarity worsened, restored best candidate codes";
          await deviceTargetProgramCodes(bestCandidateCodes, opt);
          break;
        }
        previousScore = score;
        const plans = results
          .filter(result => !result.converged && result.plan && planHasCodeChange(result.plan))
          .map(result => result.plan);
        if (!plans.length) {
          status = "no code change";
          break;
        }
        for (const plan of plans) {
          if (state.deviceCalStopRequested) break;
          await programLogicalDevice(plan.device, plan.nextMuCode, plan.nextVstartCode ?? plan.nextACode);
          plan.programmed = true;
          plan.programmedAt = new Date().toISOString();
        }
        renderDeviceTable();
        loadDeviceState();
        if (opt.programSettleMs > 0 && !state.deviceCalStopRequested) await sleep(opt.programSettleMs);
      }
      const row = {
        candidate: shift.index,
        muOffset: shift.muOffset,
        vstartOffset: shift.vstartOffset,
        targetA: reference.A,
        targetMu: reference.mu,
        targetSigma: Math.abs(Number(reference.sigma)),
        finalStage,
        meanSimilarity: finalSummary?.meanSimilarity,
        minSimilarity: finalSummary?.minSimilarity,
        meanCurveRmse: finalSummary?.meanCurveRmse,
        maxCurveRmse: finalSummary?.maxCurveRmse,
        meanA: finalSummary?.meanA,
        meanMu: finalSummary?.meanMu,
        meanSigma: finalSummary?.meanSigma,
        status,
      };
      state.deviceTargetSearchRows.push(row);
      if (!bestRow || deviceTargetScore(row, opt.metric) > deviceTargetScore(bestRow, opt.metric)) bestRow = row;
      renderDeviceTargetBestSummary(bestRow);
      const rowScore = deviceTargetScore(row, opt.metric);
      deviceTargetSearchStatus(`Candidate ${shift.index + 1}/${opt.shifts.length} done: mean sim ${(100 * Number(row.meanSimilarity)).toFixed(2)}%, min sim ${(100 * Number(row.minSimilarity)).toFixed(2)}%.`, rowScore >= opt.threshold ? "ok" : "warn");
      if (rowScore >= opt.threshold) break;
    }
    if (state.deviceCalStopRequested) {
      deviceTargetSearchStatus("Browser target search stop requested.", "warn");
      return;
    }
    if (bestRow) {
      deviceTargetSetReference({ A: bestRow.targetA, mu: bestRow.targetMu, sigma: bestRow.targetSigma });
      deviceTargetSearchStatus(`Browser target search complete: best mean sim ${(100 * Number(bestRow.meanSimilarity)).toFixed(2)}%, min sim ${(100 * Number(bestRow.minSimilarity)).toFixed(2)}%.`, Number(bestRow.meanSimilarity) >= opt.threshold ? "ok" : "warn");
    } else {
      deviceTargetSearchStatus("Browser target search finished without a valid candidate.", "warn");
    }
  } catch (error) {
    deviceTargetSearchStatus(error.message, "warn");
  } finally {
    setDeviceCalControlsRunning(false);
    renderDeviceTargetBestSummary(bestRow);
  }
}

function stopDeviceCal() {
  state.deviceCalStopRequested = true;
  state.sweepRunning = false;
  deviceCalStatus("Device calibration stop requested; current firmware sweep may finish first.", "warn");
}

function deviceCalReferenceParamsForRow(row) {
  const fit = row.fit || {};
  const target = row.target || {};
  const sigma = Number.isFinite(Number(target.sigma)) ? Math.abs(Number(target.sigma)) : Math.abs(Number(fit.sigma));
  return {
    A: Number.isFinite(Number(target.A)) ? Number(target.A) : Number(fit.A),
    mu: Number.isFinite(Number(target.mu)) ? Number(target.mu) : Number(fit.mu),
    sigma: Math.max(sigma || 0, 1e-9),
    baseline: Number.isFinite(Number(target.baseline)) ? Number(target.baseline) : Number(fit.baseline || 0),
  };
}

function deviceCalCurvePointCsvRows(rows) {
  const fields = [
    "time", "iter", "sweep_id", "device", "dac", "adc", "objective", "action", "program_command",
    "point", "x_V", "measured_y", "fit_y", "reference_y", "residual_fit", "residual_reference",
    "fit_A", "fit_mu", "fit_sigma", "fit_baseline",
    "reference_A", "reference_mu", "reference_sigma", "reference_baseline",
  ];
  const csvRows = [fields.join(",")];
  for (const row of rows) {
    const fit = row.fit;
    if (!fit?.data?.length) continue;
    const reference = deviceCalReferenceParamsForRow(row);
    const channel = row.channel || {};
    const command = row.plan?.programCommand || "";
    for (const point of fit.data) {
      const x = Number(point.x);
      const y = Number(point.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const fitY = gaussianValue(fit, x);
      const referenceY = gaussianValue(reference, x);
      const values = {
        time: row.time,
        iter: row.iter,
        sweep_id: row.sweep?.id,
        device: channel.device,
        dac: channel.xDac,
        adc: `ADC${channel.adcIndex}`,
        objective: row.objective,
        action: row.action,
        program_command: command,
        point: point.point,
        x_V: x,
        measured_y: y,
        fit_y: fitY,
        reference_y: referenceY,
        residual_fit: y - fitY,
        residual_reference: y - referenceY,
        fit_A: fit.A,
        fit_mu: fit.mu,
        fit_sigma: Math.abs(Number(fit.sigma)),
        fit_baseline: fit.baseline,
        reference_A: reference.A,
        reference_mu: reference.mu,
        reference_sigma: reference.sigma,
        reference_baseline: reference.baseline,
      };
      csvRows.push(fields.map(field => csvEscape(values[field])).join(","));
    }
  }
  return csvRows;
}

function downloadDeviceCalCsv() {
  const rows = Array.isArray(state.deviceCalHistory) ? state.deviceCalHistory : [];
  if (!rows.length) {
    deviceCalStatus("No device calibration log to download.", "warn");
    return;
  }
  const fields = [
    "time", "iter", "sweep_id", "sweep_points", "sweep_command_D1", "sweep_command_D2",
    "channel", "dac", "adc", "device", "objective", "active", "action",
    "target_A", "target_mu", "target_sigma", "target_baseline", "curve_ref_mode",
    "fit_A", "fit_mu", "fit_sigma", "baseline", "r2", "rmse",
    "error_A", "error_mu", "error_sigma", "curve_rmse", "curve_mae", "curve_max_abs", "curve_similarity", "curve_scale", "norm", "converged",
    "current_mu_code", "next_mu_code", "current_Vstart_code", "next_Vstart_code",
    "current_Vmu", "next_Vmu", "current_Vstart", "next_Vstart",
    "program_command", "programmed", "programmed_at",
  ];
  const summaryRows = [fields.join(",")];
  for (const row of rows) {
    const plan = row.plan || {};
    const fit = row.fit || {};
    const error = row.error || {};
    const curve = error.curve || {};
    const channel = row.channel || {};
    const values = {
      time: row.time,
      iter: row.iter,
      sweep_id: row.sweep?.id,
      sweep_points: row.sweep?.capturedPointCount,
      sweep_command_D1: row.sweep?.commandD1,
      sweep_command_D2: row.sweep?.commandD2,
      channel: channel.index,
      dac: channel.xDac,
      adc: `ADC${channel.adcIndex}`,
      device: channel.device,
      objective: row.objective,
      active: row.active === false ? "no" : "yes",
      action: row.action,
      target_A: row.target?.A,
      target_mu: row.target?.mu,
      target_sigma: row.target?.sigma,
      target_baseline: row.target?.baseline,
      curve_ref_mode: row.target?.referenceMode,
      fit_A: fit.A,
      fit_mu: fit.mu,
      fit_sigma: Number.isFinite(Number(fit.sigma)) ? Math.abs(Number(fit.sigma)) : "",
      baseline: fit.baseline,
      r2: fit.r2,
      rmse: fit.rmse,
      error_A: error.aError,
      error_mu: error.muError,
      error_sigma: error.sigmaError,
      curve_rmse: curve.rmse,
      curve_mae: curve.mae,
      curve_max_abs: curve.maxAbs,
      curve_similarity: curve.similarity,
      curve_scale: curve.scale,
      norm: error.norm,
      converged: row.converged ? "yes" : "no",
      current_mu_code: plan.currentMuCode,
      next_mu_code: plan.nextMuCode,
      current_Vstart_code: plan.currentVstartCode ?? plan.currentACode,
      next_Vstart_code: plan.nextVstartCode ?? plan.nextACode,
      current_Vmu: plan.currentMuV,
      next_Vmu: plan.nextMuV,
      current_Vstart: plan.currentVstartV ?? plan.currentAV,
      next_Vstart: plan.nextVstartV ?? plan.nextAV,
      program_command: plan.programCommand,
      programmed: plan.programmed ? "yes" : "no",
      programmed_at: plan.programmedAt,
    };
    summaryRows.push(fields.map(field => csvEscape(values[field])).join(","));
  }
  const csv = [
    ...summaryRows,
    "",
    "# curve_points",
    ...deviceCalCurvePointCsvRows(rows),
  ].join("\n");
  download(`pcb_gaussian_device_cal_log_curves_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  const curveCount = rows.filter(row => row.fit?.data?.length).length;
  deviceCalStatus(`Downloaded ${rows.length} device calibration row(s) and ${curveCount} curve set(s).`, "ok");
}
function downloadFitCsv() {
  const fit = state.lastGaussianFit;
  if (!fit) {
    alert("Run Gaussian fit first.");
    return;
  }
  const fields = ["x", "y", "fit_y", "residual"];
  const rows = fit.data.map(item => {
    const model = gaussianValue(fit, item.x);
    return [item.x, item.y, model, item.y - model];
  });
  const meta = [
    ["param", "value"],
    ["A_amp", fit.A], ["center_y", gaussianCenterY(fit)], ["mu", fit.mu], ["sigma", fit.sigma], ["baseline", fit.baseline], ["r2", fit.r2], ["rmse", fit.rmse],
    [], fields,
  ];
  const csv = [...meta, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
  download(`pcb_gaussian_fit_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}
const MATRIX_META_COLUMNS = [
  "row_type", "bracket_step", "repeat", "device", "axis", "delta_mu_V", "delta_vstart_V",
  "Vmu_code", "Vmu_V", "Vstart_code", "Vstart_V", "sweep_id", "trace",
];

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function workbookSheetName(name) {
  return String(name || "Sheet").replace(/[\\/?*:[\]]/g, "_").slice(0, 31) || "Sheet";
}

function workbookCell(value) {
  if (value === null || value === undefined) value = "";
  const numeric = typeof value === "number" && Number.isFinite(value);
  const type = numeric ? "Number" : "String";
  const text = numeric ? String(value) : xmlEscape(value);
  return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
}

function workbookRow(row) {
  return `<Row>${(row || []).map(workbookCell).join("")}</Row>`;
}

function downloadWorkbook(name, sheets) {
  const safeSheets = sheets.filter(sheet => sheet && Array.isArray(sheet.rows));
  const worksheets = safeSheets.map(sheet => {
    const rows = sheet.rows.map(workbookRow).join("\n");
    return `<Worksheet ss:Name="${xmlEscape(workbookSheetName(sheet.name))}"><Table>${rows}</Table></Worksheet>`;
  }).join("\n");
  const xml = `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n${worksheets}\n</Workbook>`;
  download(name, xml, "application/vnd.ms-excel;charset=utf-8");
}

function uiValue(id) {
  const element = $(id);
  if (!element) return "";
  if (element.type === "checkbox") return element.checked ? "yes" : "no";
  return element.value ?? "";
}

function exportBaseParameterRows(kind) {
  const rows = [
    ["section", "key", "value", "unit", "note"],
    ["export", "kind", kind, "", "SpreadsheetML workbook; open with Excel or import sheets in Origin"],
    ["export", "created_at", new Date().toISOString(), "", ""],
    ["export", "web_version", WEB_VERSION, "", ""],
    ["firmware", "version", state.firmwareVersion || "", "", ""],
    ["firmware", "protocol", state.firmwareProtocol || "", "", ""],
    ["plot", "Y_mode", uiValue("plotYMode"), "", ""],
    ["sweep_ui", "D1_enable", uiValue("sweepD1Enable"), "", ""],
    ["sweep_ui", "D1_start", uiValue("sweepD1Start"), "mV", ""],
    ["sweep_ui", "D1_stop", uiValue("sweepD1Stop"), "mV", ""],
    ["sweep_ui", "D1_step", uiValue("sweepD1Step"), "mV", ""],
    ["sweep_ui", "D2_enable", uiValue("sweepD2Enable"), "", ""],
    ["sweep_ui", "D2_start", uiValue("sweepD2Start"), "mV", ""],
    ["sweep_ui", "D2_stop", uiValue("sweepD2Stop"), "mV", ""],
    ["sweep_ui", "D2_step", uiValue("sweepD2Step"), "mV", ""],
    ["sweep_ui", "dwell", uiValue("sweepDwell"), "ms", ""],
    ["sweep_ui", "adc_avg", uiValue("adcAvgSamples"), "samples", ""],
    ["sweep_ui", "settle", uiValue("sweepSettleUs"), "us", "DAC-to-ADC delay"],
    ["sweep_ui", "pre_bias", uiValue("sweepPreBiasMs"), "ms", "start-voltage pre-bias"],
    ["sweep_ui", "point_repeats", uiValue("sweepPointRepeats"), "", "per-gate repeated ADC readouts averaged in firmware"],
    ["sweep_ui", "repeats", uiValue("sweepRepeats"), "", ""],
    ["sweep_ui", "reverse", uiValue("sweepReverse"), "", ""],
    [],
    ["adc_map", "adc", "tia", "device", "label"],
    ...ADC_LABELS.map((label, idx) => ["adc_map", label, `TIA${idx + 1}`, ADC_DEVICE_MAP[idx] || "", adcSubLabel(idx)]),
  ];
  return rows;
}

function sweepParameterRows(sweep) {
  const rows = exportBaseParameterRows("sweep_workbook");
  rows.push(
    [],
    ["sweep", "id", sweep.id || "", "", ""],
    ["sweep", "captured_points", sweepCapturedPointCount(sweep), "points", "total ADC point lines received"],
    ["sweep", "retained_preview_points", sweep.points?.length || 0, "points", "points retained in GUI memory"],
    ["sweep", "dropped_preview_points", sweep.droppedPointCount || 0, "points", "streamed data is still saved in chunk CSV files"],
    ["sweep", "expected_points", sweep.expectedPointCount || "", "points", "estimated before run"],
  );
  for (const dac of ["D1", "D2"]) {
    const range = sweep.rangeByDac?.[dac];
    if (range) rows.push(["sweep_range", dac, `${range.min} to ${range.max}`, "V", "fixed plot/sweep x range"]);
  }
  return rows;
}

function bracketParameterRows(runs) {
  const rows = exportBaseParameterRows("parameter_bracket_workbook");
  rows.push(
    [],
    ["bracket", "id", state.lastBracket?.id || "", "", ""],
    ["bracket", "started_at", state.lastBracket?.startedAt || "", "", ""],
    ["bracket", "finished_at", state.lastBracket?.finishedAt || "", "", ""],
    ["bracket", "completed_steps", runs.length, "", ""],
    [],
    ["bracket_plan", "step", "axis", "device", "delta_mu_V", "delta_vstart_V", "Vmu_step_V", "Vstart_step_V", "Vmu_code", "Vmu_V", "Vstart_code", "Vstart_V", "sweep_id", "captured_points"]
  );
  for (const run of runs) {
    rows.push([
      "bracket_plan", run.stepIndex, run.axisLabel || run.axis, run.device, run.deltaMuV ?? run.deltaV ?? "", run.deltaVstartV ?? "",
      run.muStepV ?? "", run.vstartStepV ?? "", run.muCode, run.actualMuV, run.vstartCode, run.actualVstartV,
      run.sweep?.id || "", run.sweep?.points?.length || 0,
    ]);
  }
  return rows;
}

function runsForSweep(sweep) {
  return [{ sweep, stepIndex: "", axisLabel: "", device: "", deltaV: "", deltaMuV: "", deltaVstartV: "", muStepV: "", vstartStepV: "", muCode: "", actualMuV: "", vstartCode: "", actualVstartV: "" }];
}

function sweepDacsForRuns(runs) {
  const found = new Set();
  for (const run of runs) {
    for (const point of run.sweep?.points || []) {
      if (point.sweepDac) found.add(point.sweepDac);
      else for (const dac of ["D1", "D2"]) if (point.dac?.[dac]) found.add(dac);
    }
  }
  return ["D1", "D2"].filter(dac => found.has(dac));
}

function matrixGroupsForRuns(runs, xDac) {
  const groups = [];
  for (const run of runs) {
    const sweep = run.sweep;
    if (!sweep?.points?.length) continue;
    const repeats = Array.from(new Set(sweep.points.map(point => point.repeat || 1))).sort((a, b) => Number(a) - Number(b));
    for (const repeat of repeats) {
      const points = sweep.points
        .filter(point => (point.repeat || 1) === repeat)
        .filter(point => !point.sweepDac || point.sweepDac === xDac)
        .slice()
        .sort((a, b) => sweepXValue(a, xDac) - sweepXValue(b, xDac));
      if (points.length) groups.push({ run, sweep, repeat, points });
    }
  }
  return groups;
}

function matrixPrefix(rowType, group, trace) {
  const run = group.run;
  return [
    rowType,
    run.stepIndex ?? "",
    group.repeat ?? "",
    run.device ?? "",
    run.axisLabel || run.axis || "",
    run.deltaMuV ?? run.deltaV ?? "",
    run.deltaVstartV ?? "",
    run.muCode ?? "",
    run.actualMuV ?? "",
    run.vstartCode ?? "",
    run.actualVstartV ?? "",
    group.sweep?.id || "",
    trace,
  ];
}

function padValues(values, count) {
  const padded = values.slice(0, count);
  while (padded.length < count) padded.push("");
  return padded;
}

function dataMatrixRowsForRuns(runs, xDac) {
  const groups = matrixGroupsForRuns(runs, xDac);
  if (!groups.length) return null;
  const reference = groups.reduce((best, group) => group.points.length > best.points.length ? group : best, groups[0]);
  const pointCount = reference.points.length;
  const rows = [
    MATRIX_META_COLUMNS.concat(reference.points.map((_, idx) => `p${idx + 1}`)),
    matrixPrefix("x_DAC_code", reference, `${xDac}_code`).concat(reference.points.map(point => point.dac?.[xDac]?.code ?? "")),
    matrixPrefix("x_voltage_V", reference, `${xDac}_V`).concat(reference.points.map(point => point.dac?.[xDac]?.vhigh ?? "")),
    [],
  ];
  for (const group of groups) {
    const labels = ADC_LABELS.filter(label => group.points.some(point => point.adcs?.[label]));
    for (const label of labels) {
      const adcIdx = Number(label.replace("ADC", ""));
      const suffix = adcSubLabel(adcIdx);
      rows.push(matrixPrefix("ADC_raw", group, `${label}_${suffix}_ADC_raw`).concat(padValues(group.points.map(point => point.adcs?.[label]?.raw ?? ""), pointCount)));
      rows.push(matrixPrefix("V_AIN", group, `${label}_${suffix}_V_AIN`).concat(padValues(group.points.map(point => point.adcs?.[label]?.voltage ?? ""), pointCount)));
      rows.push(matrixPrefix("I_uA", group, `${label}_${suffix}_I_uA`).concat(padValues(group.points.map(point => point.adcs?.[label]?.current ?? ""), pointCount)));
    }
  }
  return rows;
}

function matrixSheetsForRuns(runs, prefix) {
  return sweepDacsForRuns(runs)
    .map(dac => ({ name: `data_${dac}`, rows: dataMatrixRowsForRuns(runs, dac) }))
    .filter(sheet => sheet.rows);
}

function tidyFields(includeBracket) {
  const labels = ADC_LABELS.slice();
  return [
    ...(includeBracket ? ["bracket_id", "bracket_step", "bracket_axis", "device", "delta_mu_V", "delta_vstart_V", "Vmu_step_V", "Vstart_step_V", "Vmu_code", "Vmu_V", "Vstart_code", "Vstart_V"] : []),
    "sweep_id", "repeat", "point_repeat", "point", "time", "sweep_dac",
    "D1_code", "D1_vhigh", "D2_code", "D2_vhigh",
    ...labels.flatMap(label => [`${label}_raw`, `${label}_V_AIN`, `${label}_I_uA`, `${label}_tia`, `${label}_devices`]),
  ];
}

function tidyPointRow(run, point, includeBracket) {
  const labels = ADC_LABELS.slice();
  const base = [
    ...(includeBracket ? [
      state.lastBracket?.id || "", run.stepIndex, run.axisLabel || run.axis, run.device,
      run.deltaMuV ?? run.deltaV ?? "", run.deltaVstartV ?? "", run.muStepV ?? "", run.vstartStepV ?? "",
      run.muCode, run.actualMuV, run.vstartCode, run.actualVstartV,
    ] : []),
    run.sweep?.id || "",
    point.repeat ?? 1,
    point.pointRepeat ?? 1,
    point.point,
    point.time,
    point.sweepDac ?? "",
    point.dac?.D1?.code ?? "",
    point.dac?.D1?.vhigh ?? "",
    point.dac?.D2?.code ?? "",
    point.dac?.D2?.vhigh ?? "",
  ];
  const adcValues = labels.flatMap(label => {
    const sample = point.adcs?.[label];
    return sample ? [sample.raw, sample.voltage, sample.current, sample.tia, sample.jumper] : ["", "", "", "", ""];
  });
  return [...base, ...adcValues];
}

function tidyRowsForRuns(runs, includeBracket) {
  const rows = [tidyFields(includeBracket)];
  for (const run of runs) {
    for (const point of run.sweep?.points || []) rows.push(tidyPointRow(run, point, includeBracket));
  }
  return rows;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function csvFromRows(rows) {
  return (rows || []).map(row => (row || []).map(csvEscape).join(",")).join("\n");
}

function currentDeviceSeedRows() {
  const rows = [["device", "to_mu_code", "to_vstart_code", "next_program_command", "mu_V", "vstart_V"]];
  for (let device = 1; device <= 16; device += 1) {
    const muCode = logicalMuCodeForDevice(device);
    const vstartCode = logicalVstartCodeForDevice(device);
    rows.push([
      device,
      muCode,
      vstartCode,
      `P${device},${muCode},${vstartCode}`,
      potCodeToMuVoltage(muCode, device),
      potCodeToVstartVoltage(vstartCode, device),
    ]);
  }
  return rows;
}

function getConnectionStatus() {
  return {
    connected: Boolean(state.connected),
    hasWriter: Boolean(state.writer),
    sweepRunning: Boolean(state.sweepRunning),
    deviceCalRunning: Boolean(state.deviceCalRunning),
    appVersion: APP_VERSION,
  };
}

function getApplicationTargetFitReadiness(targets = [], options = {}) {
  const messages = [];
  const rows = normalizeApplicationTargetFitTargets(targets, options);
  const connected = Boolean(state.connected && state.writer);
  const busy = Boolean(state.deviceCalRunning || state.sweepRunning);
  if (!connected) messages.push("UART is not connected.");
  if (busy) messages.push("Another sweep or device-calibration run is active.");
  if (!rows.length) messages.push("No valid application target rows were supplied.");

  const deviceStatuses = rows.map(row => {
    const mappedAdc = adcIndexFromMappedDevice(row.device);
    const hasMappedAdc = Number.isFinite(mappedAdc);
    const channel = deviceCalChannelForDevice(row.device);
    const adcIndex = hasMappedAdc ? mappedAdc : channel.adcIndex;
    return {
      device: row.device,
      adcPair: row.adcPair,
      basis: row.basis,
      label: row.label,
      adc: Number.isFinite(adcIndex) ? `ADC${adcIndex}` : "",
      adcIndex: Number.isFinite(adcIndex) ? adcIndex : null,
      dac: channel.xDac,
      hasMappedAdc,
      status: hasMappedAdc ? "ready" : "no mapped ADC",
    };
  });
  const missing = deviceStatuses.filter(item => !item.hasMappedAdc).map(item => `D${item.device}`);
  if (missing.length) messages.push(`Missing ADC mapping for ${missing.join(", ")}.`);
  const batches = new Set(deviceStatuses.map(item => Number(item.device) >= 9 ? "D9-D16" : "D1-D8"));
  if (batches.size > 1) messages.push("Assigned devices span both D1-D8 and D9-D16 batches; fit them as separate presets/runs.");

  return {
    ok: connected && !busy && rows.length > 0 && !missing.length && batches.size <= 1,
    connected,
    busy,
    targetCount: rows.length,
    devices: rows.map(row => row.device),
    requiredAdcs: [...new Set(deviceStatuses.map(item => item.adc).filter(Boolean))],
    deviceStatuses,
    messages,
  };
}
function exposePcbGaussianApi() {
  window.PCBGaussian = {
    ...(window.PCBGaussian || {}),
    appVersion: APP_VERSION,
    getDeviceSeedRows: currentDeviceSeedRows,
    getDeviceTargetSearchRows: deviceTargetSearchCsvRows,
    getConnectionStatus,
    getApplicationTargetFitReadiness,
    runDeviceTargetSearchBrowser,
    runApplicationTargetFit,
    stopDeviceCal,
    getDeviceCalHistory: () => Array.isArray(state.deviceCalHistory) ? state.deviceCalHistory.slice() : [],
    getDeviceCalResults: () => Array.isArray(state.deviceCalResults) ? state.deviceCalResults.slice() : [],
    getDeviceCalCurveCsv: () => deviceCalCurvePointCsvRows(state.deviceCalHistory || []).join("\n"),
    downloadDeviceCalCsv,
    saveDeviceCalFitPackage,
    csvFromRows,
    download,
  };
}

function safeExportStem(name) {
  return String(name || "pcb_gaussian_export")
    .replace(/\.(xls|csv)$/i, "")
    .replace(/[^A-Za-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 150) || "pcb_gaussian_export";
}

function exportPointCountForRuns(runs) {
  return (runs || []).reduce((sum, run) => sum + (run.sweep?.points?.length || 0), 0);
}

function repeatPointGroupsForRun(run) {
  const map = new Map();
  for (const point of run.sweep?.points || []) {
    const repeat = Number(point.repeat ?? 1);
    if (!map.has(repeat)) map.set(repeat, []);
    map.get(repeat).push(point);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}

function runCloneWithPoints(run, points) {
  return {
    ...run,
    sweep: {
      ...(run.sweep || {}),
      points,
    },
  };
}

function splitRunsForCsvExport(runs, maxPoints = EXPORT_CSV_CHUNK_POINT_LIMIT) {
  const chunks = [];
  let currentRuns = [];
  let currentPoints = 0;
  const flush = () => {
    if (!currentRuns.length) return;
    chunks.push({ index: chunks.length + 1, runs: currentRuns, points: currentPoints });
    currentRuns = [];
    currentPoints = 0;
  };
  for (const run of runs || []) {
    for (const [, points] of repeatPointGroupsForRun(run)) {
      if (!points.length) continue;
      if (currentPoints > 0 && currentPoints + points.length > maxPoints) flush();
      currentRuns.push(runCloneWithPoints(run, points));
      currentPoints += points.length;
      if (currentPoints >= maxPoints) flush();
    }
  }
  flush();
  return chunks;
}

async function exportDelay() {
  await new Promise(resolve => setTimeout(resolve, EXPORT_DOWNLOAD_DELAY_MS));
}

async function chooseExportDirectory(preferredName) {
  if (!window.showDirectoryPicker) return null;
  try {
    return await window.showDirectoryPicker({ id: "pcb-gaussian-export", mode: "readwrite", startIn: "downloads" });
  } catch (error) {
    logLine(`[export] Folder save skipped for ${preferredName}: ${error.message}`);
    return null;
  }
}

async function saveTextExportFile(name, content, type, directoryHandle = null) {
  if (directoryHandle) {
    const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([content], { type }));
    await writable.close();
    return;
  }
  download(name, content, type);
  await exportDelay();
}

async function saveRowsCsvExport(name, rows, directoryHandle = null) {
  await saveTextExportFile(name, csvFromRows(rows), "text/csv;charset=utf-8", directoryHandle);
}

async function downloadSplitCsvSet(baseName, runs, includeBracket, parameterRows, statusFn = null) {
  const stem = safeExportStem(baseName);
  const totalPoints = exportPointCountForRuns(runs);
  const chunks = splitRunsForCsvExport(runs);
  if (!chunks.length) throw new Error("No data available for split export.");
  const directoryHandle = await chooseExportDirectory(stem);
  let fileCount = 0;
  const noteRows = [
    ["section", "key", "value", "unit", "note"],
    ["split_export", "base_name", stem, "", "large data exported as CSV chunks to avoid browser XLS overflow"],
    ["split_export", "created_at", new Date().toISOString(), "", ""],
    ["split_export", "total_points", totalPoints, "points", ""],
    ["split_export", "chunks", chunks.length, "filesets", ""],
    ["split_export", "chunk_point_limit", EXPORT_CSV_CHUNK_POINT_LIMIT, "points", ""],
    ["split_export", "save_mode", directoryHandle ? "folder" : "browser_downloads", "", "folder mode requires Chrome/Edge File System Access API"],
    [],
    ...parameterRows,
  ];
  await saveRowsCsvExport(`${stem}_parameters.csv`, noteRows, directoryHandle);
  fileCount += 1;
  for (const chunk of chunks) {
    const part = String(chunk.index).padStart(3, "0");
    const matrixSheets = matrixSheetsForRuns(chunk.runs, stem);
    for (const sheet of matrixSheets) {
      await saveRowsCsvExport(`${stem}_part${part}_${sheet.name}.csv`, sheet.rows, directoryHandle);
      fileCount += 1;
    }
    await saveRowsCsvExport(`${stem}_part${part}_tidy_raw.csv`, tidyRowsForRuns(chunk.runs, includeBracket), directoryHandle);
    fileCount += 1;
    if (statusFn) statusFn(`Split export ${chunk.index}/${chunks.length}: saved ${chunk.points} point(s).`);
  }
  const locationText = directoryHandle ? "selected folder" : "browser downloads";
  const message = `Split export complete: ${totalPoints} point(s), ${chunks.length} part(s), ${fileCount} CSV file(s) saved to ${locationText}.`;
  if (statusFn) statusFn(message);
  logLine(message);
  return message;
}


function downloadCsv() {
  const fields = ["time", "dac", "code", "vhigh", "tia", "raw", "voltage", "current", "devices", "source"];
  const csv = [fields.join(","), ...state.measurements.map(row => fields.map(field => csvEscape(field === "devices" ? (row.devices ?? row.jumper) : row[field])).join(","))].join("\n");
  download(`pcb_gaussian_measurements_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

async function downloadSweepCsv() {
  const sweep = state.lastSweep;
  if (!sweep?.points.length) {
    alert("No completed sweep ADC data to download.");
    return;
  }
  const runs = runsForSweep(sweep);
  const captured = exportPointCountForRuns(runs);
  const baseName = `pcb_gaussian_sweep_${sweep.id}_matrix_${Date.now()}`;
  const setStatus = text => {
    const status = $("sweepStatus");
    if (status) status.textContent = text;
  };
  try {
    if (captured > EXPORT_WORKBOOK_POINT_LIMIT) {
      await downloadSplitCsvSet(baseName, runs, false, sweepParameterRows(sweep), setStatus);
      return;
    }
    const sheets = [
      { name: "parameters", rows: sweepParameterRows(sweep) },
      ...matrixSheetsForRuns(runs, "sweep"),
      { name: "tidy_raw", rows: tidyRowsForRuns(runs, false) },
    ];
    downloadWorkbook(`${baseName}.xls`, sheets);
    const fullCaptured = sweepCapturedPointCount(sweep);
    const suffix = sweep.streamExport?.enabled && fullCaptured > captured ? `retained preview (${captured}/${fullCaptured}); full stream chunks were saved during sweep` : `${captured} ADC point(s)`;
    setStatus(`Downloaded sweep XLS: ${suffix}.`);
  } catch (error) {
    setStatus(`Export failed: ${error.message}`);
  }
}
function downloadLog() {
  download(`pcb_gaussian_session_${Date.now()}.txt`, state.commandLog.join("\n"), "text/plain;charset=utf-8");
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
      if (window.location.hash !== "#" + tab.dataset.tab) {
        window.history.replaceState(null, "", "#" + tab.dataset.tab);
      }
    });
  });

  $("connectButton").addEventListener("click", connectSerial);
  $("disconnectButton").addEventListener("click", disconnectSerial);
  document.querySelectorAll(".ping-control").forEach(button => {
    button.addEventListener("click", () => sendCommand("PING"));
  });
  document.querySelectorAll(".manual-send-control").forEach(button => {
    button.addEventListener("click", () => {
      const input = button.closest(".manual-send")?.querySelector(".manual-command");
      sendCommand(input?.value || "");
    });
  });
  document.querySelectorAll(".manual-command").forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") sendCommand(input.value);
    });
  });
  document.querySelectorAll(".clear-log-control").forEach(button => {
    button.addEventListener("click", () => {
      state.commandLog = [];
      document.querySelectorAll(".log-view").forEach(box => { box.value = ""; });
    });
  });
  document.querySelectorAll(".download-log-control").forEach(button => {
    button.addEventListener("click", downloadLog);
  });

  $("dacSelect").addEventListener("change", loadDacState);
  $("dacCode").addEventListener("input", updateDacReadout);
  $("calculateDacButton").addEventListener("click", calculateDacTarget);
  $("setDacButton").addEventListener("click", setFixedDac);
  $("setTargetButton").addEventListener("click", async () => { calculateDacTarget(); await setFixedDac(); });
  $("initButton").addEventListener("click", initializeAll);
  $("startSweepButton").addEventListener("click", startSweep);
  $("stopSweepButton").addEventListener("click", stopSweep);
  $("gateProbeSlider").addEventListener("input", () => onGateProbeInput("slider"));
  $("gateProbeMvNumber").addEventListener("input", () => onGateProbeInput("number"));
  $("gateProbeDac").addEventListener("change", () => { gateProbeMv(); if (state.gateProbeRunning) { ensureGateProbeCapture(gateProbeDac()); scheduleGateProbeSample(0); } });
  $("gateProbeRateMs").addEventListener("change", gateProbeRateMs);
  $("gateProbeStartButton").addEventListener("click", startGateProbe);
  $("gateProbeSampleButton").addEventListener("click", () => sampleGateProbe(true));
  $("gateProbeStopButton").addEventListener("click", stopGateProbe);
  $("gateProbeClearButton").addEventListener("click", clearGateProbeMap);
  $("plotYMode").addEventListener("change", renderSweepPlot);
  $("fixedPlotRange").addEventListener("change", renderSweepPlot);
  $("fixedPlotYRange").addEventListener("change", renderSweepPlot);
  $("plotYMin").addEventListener("input", renderSweepPlot);
  $("plotYMax").addEventListener("input", renderSweepPlot);
  $("sweepTraceOpacity").addEventListener("input", renderSweepPlot);
  $("downloadSweepCsvButton").addEventListener("click", downloadSweepCsv);
  $("bracketLoadCurrentButton").addEventListener("click", () => loadCurrentBracketBase(true));
  $("startBracketButton").addEventListener("click", startParameterBracket);
  $("stopBracketButton").addEventListener("click", stopParameterBracket);
  $("downloadBracketCsvButton").addEventListener("click", downloadParameterBracketCsv);
  $("showBracketOverlay").addEventListener("change", renderSweepPlot);
  $("bracketOverlayOpacity").addEventListener("input", renderSweepPlot);
  $("fitGaussianButton").addEventListener("click", fitSelectedGaussian);
  $("showFitOverlay").addEventListener("change", renderSweepPlot);
  $("previewGaussianAdjustButton").addEventListener("click", previewGaussianAdjust);
  $("programGaussianAdjustButton").addEventListener("click", programGaussianAdjust);
  $("autoFitSingleButton").addEventListener("click", autoFitSingle);
  $("autoFitGmmButton").addEventListener("click", autoFitGmm);
  $("stopAutoFitButton").addEventListener("click", stopAutoFit);
  $("previewGmmButton").addEventListener("click", previewGmm);
  $("programGmmButton").addEventListener("click", programGmm);
  $("downloadFitCsvButton").addEventListener("click", downloadFitCsv);
  $("allDeviceTestStartButton")?.addEventListener("click", startAllDeviceTest);
  $("allDeviceTestStopButton")?.addEventListener("click", stopAllDeviceTest);
  $("allDeviceTestDownloadButton")?.addEventListener("click", downloadAllDeviceTestCsv);
  $("deviceCalBatch")?.addEventListener("change", deviceCalLoadBatchMap);
  $("deviceCalLoadBatchButton")?.addEventListener("click", deviceCalLoadBatchMap);
  $("deviceCalSweepFitButton")?.addEventListener("click", deviceCalSweepAndFitOnce);
  $("deviceCalMedianFitButton")?.addEventListener("click", runDeviceCalMedianTargetFit);
  $("deviceCalAutoButton")?.addEventListener("click", autoFitDeviceCalBatch);
  $("deviceCalStopButton")?.addEventListener("click", stopDeviceCal);
  $("deviceCalDownloadButton")?.addEventListener("click", downloadDeviceCalCsv);
  $("deviceCalPackageButton")?.addEventListener("click", saveDeviceCalFitPackage);
  $("deviceCalOverlayRenderButton")?.addEventListener("click", drawDeviceCalOverlay);
  $("deviceCalOverlayClearButton")?.addEventListener("click", clearDeviceCalOverlayHistory);
  $("deviceCalOverlayDownloadButton")?.addEventListener("click", downloadDeviceCalOverlayCsv);
  ["deviceCalOverlayXMode", "deviceCalOverlayStageMode", "deviceCalOverlayTarget", "deviceCalOverlayAlpha"].forEach(id => $(id)?.addEventListener("input", drawDeviceCalOverlay));
  $("deviceCalLutStartButton")?.addEventListener("click", measureDeviceCalLut);
  $("deviceCalLutClearButton")?.addEventListener("click", clearDeviceCalLut);
  $("deviceCalLutDownloadButton")?.addEventListener("click", downloadDeviceCalLutCsv);
  $("deviceDetectStartButton")?.addEventListener("click", detectDeviceAdcMap);
  $("deviceDetectStopButton")?.addEventListener("click", stopDeviceDetect);
  $("deviceDetectApplyButton")?.addEventListener("click", applyDetectedAdcMap);
  $("deviceDetectDownloadButton")?.addEventListener("click", downloadDeviceDetectCsv);
  $("saveDacCalButton").addEventListener("click", saveDacCalibrationFromInputs);
  $("loadProjectDacCalButton").addEventListener("click", loadProjectDacCalibration);
  $("resetDacCalButton").addEventListener("click", resetDacCalibration);
  $("saveParamCalButton").addEventListener("click", saveParamCalibrationFromInputs);
  $("loadProjectParamCalButton").addEventListener("click", loadProjectParamCalibration);
  $("resetParamCalButton").addEventListener("click", resetParamCalibration);
  $("paramCalProfile")?.addEventListener("change", renderParamCalibration);

  $("switchDevice").addEventListener("input", updateSwitchInfo);
  $("switchWriteButton").addEventListener("click", switchTestWrite);

  $("potDevice").addEventListener("input", loadDeviceState);
  $("aCode").addEventListener("input", updatePotReadout);
  $("muCode").addEventListener("input", updatePotReadout);
  $("setACodeButton").addEventListener("click", setAFromCode);
  $("setAVoltageButton").addEventListener("click", async () => { const device = deviceMuxInfo($("potDevice").value).device; $("aCode").value = muVoltageToCode($("aTarget").value, device); await setAFromCode(); });
  $("setMuCodeButton").addEventListener("click", setMuFromCode);
  $("setMuVoltageButton").addEventListener("click", async () => { const device = deviceMuxInfo($("potDevice").value).device; $("muCode").value = vstartVoltageToCode($("muTarget").value, device); await setMuFromCode(); });
  $("applyPotButton").addEventListener("click", async () => { await setAFromCode(); await setMuFromCode(); });
  $("applyPotAllButton").addEventListener("click", applyPotAllDevices);

  $("adcButton").addEventListener("click", () => {
    syncTiaStates();
    sendCommand($("adcCommand").value || "ADC", { waitForReply: true, timeoutMs: 4000 });
  });
  $("adcBaselineApplyButton")?.addEventListener("click", applyDefaultAdcBaseline);
  $("adcBaselineCaptureButton")?.addEventListener("click", captureAdcBaselineFromCurrentRead);
  $("adcBaselineResetButton")?.addEventListener("click", resetAdcBaseline);
  $("adcBaselineDefault")?.addEventListener("change", applyDefaultAdcBaseline);
  $("adcBaselineInvert")?.addEventListener("change", () => {
    saveAdcBaselineFromInputs();
    renderAdcBaselineControls();
  });
  $("downloadCsvButton").addEventListener("click", downloadCsv);
}

function init() {
  if (!window.isSecureContext) {
    $("serialSupport").textContent = "HTTPS required for Web Serial";
  } else {
    $("serialSupport").textContent = "serial" in navigator ? "Web Serial ready" : "Chrome/Edge Web Serial required";
  }
  setConnected(false);
  bindEvents();
  activateInitialTabFromHash();
  updateDacReadout();
  renderDacCalibration();
  renderParamCalibration();
  updateSwitchInfo();
  updatePotReadout();
  renderDeviceTable();
  renderTiaConfig();
  renderAdcBaselineControls();
  renderPlotAdcFilters();
  renderFitAdcOptions();
  renderDeviceCalCards();
  renderDeviceDetectRows();
  drawDeviceCalOverlayEmpty();
  updateDeviceCalOverlayButtons();
  loadDeviceCalLutRows();
  exposePcbGaussianApi();
  renderGaussianFit(null);
  setAutoFitControlsDisabled(false);
  setGateProbeControls(false);
  setParameterBracketControls(false);
  gateProbeMv();
  renderSweepPlot();
  updateVersionInfo();
  logLine("Web GUI ready");
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("hashchange", activateInitialTabFromHash);
window.addEventListener("beforeunload", () => {
  if (state.connected) disconnectSerial();
});
