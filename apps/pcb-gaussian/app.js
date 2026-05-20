const REF193_V = 3.0;
const REF194_V = 4.5;
const A_GAIN = -6.0;
const TIA_RESISTANCE_OHM = 1_000_000.0;
const SAADC_INPUT_RANGE_V = 3.0;
const SAADC_FULL_SCALE_RAW = 16383;
const DAC_MAX_CODE = 4095;
const POT_MAX_CODE = 255;
const ADC_TIA_COUNT = 8;
const MAX_DEVICES_PER_TIA = 4;
const DEVICE_TO_MUX_ADDR = [0, 1, 2, 3, 4, 5, 6, 7, 1, 0, 3, 2, 5, 4, 7, 6];
const TIA_DEVICE_MAP = [
  [5, 6, 7, 8],
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [1, 2, 3, 4],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
];
const DAC_CAL_STORAGE_KEY = "pcbGaussian.dacCalibration.v1";
const DAC_CAL_VOLTAGES = [-15, -10, -5, 0, 5, 10, 15];
const DEFAULT_DAC_CAL = {
  D1: [
    { voltage: -15, code: 191 },
    { voltage: -10, code: 785 },
    { voltage: -5, code: 1378 },
    { voltage: 0, code: 1972 },
    { voltage: 5, code: 2221 },
    { voltage: 10, code: 2471 },
    { voltage: 15, code: 2720 },
  ],
  D2: [
    { voltage: -15, code: 180 },
    { voltage: -10, code: 773 },
    { voltage: -5, code: 1365 },
    { voltage: 0, code: 1958 },
    { voltage: 5, code: 2550 },
    { voltage: 10, code: 3142 },
    { voltage: 15, code: 3734 },
  ],
};
const PARAM_CAL_STORAGE_KEY = "pcbGaussian.parameterCalibration.v1";
const PARAM_CAL_CODES = [0, 30, 60, 90, 120, 150, 180, 210, 255];
const PROGRAM_REPLY_TIMEOUT_MS = 1500;
const PLOT_COLORS = ["#2a9d8f", "#d1495b", "#457b9d", "#f4a261", "#7b2cbf", "#2f6f4e", "#e76f51", "#264653"];
const MU_CAL_POINTS = [
  { code: 0, voltage: -1.0 },
  { code: 60, voltage: 4.92 },
  { code: 90, voltage: 6.88 },
  { code: 180, voltage: 12.75 },
];

const $ = id => document.getElementById(id);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const nowTime = () => new Date().toLocaleTimeString("ko-KR", { hour12: false }) + "." + String(new Date().getMilliseconds()).padStart(3, "0");
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
  return piecewiseCodeToVoltage(MU_CAL_POINTS, code);
}
function defaultLogicalMuVoltage(code) {
  return A_GAIN * potCodeToVWiper(code);
}
function cloneParamCalibration() {
  return {
    A: PARAM_CAL_CODES.map(code => ({ code, voltage: defaultLogicalAVoltage(code) })),
    mu: PARAM_CAL_CODES.map(code => ({ code, voltage: defaultLogicalMuVoltage(code) })),
  };
}
function sanitizeParamCalibration(source) {
  const fallback = cloneParamCalibration();
  const result = { A: [], mu: [] };
  for (const param of ["A", "mu"]) {
    for (const code of PARAM_CAL_CODES) {
      const saved = source?.[param]?.find(point => Number(point.code) === code);
      const fallbackPoint = fallback[param].find(point => point.code === code);
      const voltage = Number.isFinite(Number(saved?.voltage)) ? Number(saved.voltage) : fallbackPoint.voltage;
      result[param].push({ code, voltage });
    }
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
function persistParamCalibration() {
  try {
    localStorage.setItem(PARAM_CAL_STORAGE_KEY, JSON.stringify(state.paramCal));
    return true;
  } catch (error) {
    logLine(`[storage error] A / mu calibration not saved: ${error.message}`);
    return false;
  }
}
function getParamCalPoints(param) {
  return (state.paramCal?.[param] || cloneParamCalibration()[param])
    .map(point => ({ code: clamp(Math.round(Number(point.code)), 0, POT_MAX_CODE), voltage: Number(point.voltage) }));
}
function paramCodeToVoltage(param, code) {
  return interpolatePointList(clamp(Number(code) || 0, 0, POT_MAX_CODE), getParamCalPoints(param), "code", "voltage");
}
function paramVoltageToCode(param, voltage) {
  const points = getParamCalPoints(param).filter(point => Number.isFinite(point.voltage));
  const voltages = points.map(point => point.voltage);
  const safeV = clamp(Number(voltage) || 0, Math.min(...voltages), Math.max(...voltages));
  return clamp(Math.round(interpolatePointList(safeV, points, "voltage", "code")), 0, POT_MAX_CODE);
}
function potCodeToAVoltage(code) {
  return paramCodeToVoltage("A", code);
}
function potCodeToMuVoltage(code) {
  return paramCodeToVoltage("mu", code);
}
function aVoltageToCode(voltage) {
  return paramVoltageToCode("A", voltage);
}
function muVoltageToCode(voltage) {
  return paramVoltageToCode("mu", voltage);
}
function adcRawToVoltage(raw) {
  return Number(raw) * SAADC_INPUT_RANGE_V / SAADC_FULL_SCALE_RAW;
}
function adcVoltageToCurrentUa(voltage) {
  return Number(voltage) / TIA_RESISTANCE_OHM * 1_000_000.0;
}
function deviceMuxInfo(device) {
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
  tiaStates: Array.from({ length: ADC_TIA_COUNT }, (_, i) => ({
    enabled: i === 0,
    adc: `AIN${i}`,
    devices: Array.from({ length: MAX_DEVICES_PER_TIA }, () => ""),
    jumper: "",
  })),
  measurements: [],
  commandLog: [],
  pendingReplies: [],
  pendingAdcContext: null,
  activeSweep: null,
  lastSweep: null,
  sweepCounter: 0,
  plotFramePending: false,
  sweepRunning: false,
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
  $("statusDot").classList.toggle("connected", connected);
  $("connectionState").textContent = connected ? "Connected" : "Disconnected";
  $("connectButton").disabled = connected;
  $("disconnectButton").disabled = !connected;
}

function activateTab(tabName) {
  document.querySelectorAll(".tab").forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(item => {
    item.classList.toggle("active", item.id === `tab-${tabName}`);
  });
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
    await state.port.open({ baudRate: Number($("baudRate").value) || 115200 });
    state.writer = state.port.writable.getWriter();
    state.keepReading = true;
    setConnected(true);
    logLine(`Connected @ ${$("baudRate").value}`);
    readLoop();
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
    logLine(text, "< ");
    parseAdcReply(text);
    const pending = state.pendingReplies.shift();
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(text);
    }
  }
}

function waitForReply(timeoutMs) {
  return new Promise(resolve => {
    const pending = {
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
  const replyPromise = options.waitForReply ? waitForReply(options.timeoutMs || 1500) : null;
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
  table.innerHTML = "";
  for (const code of PARAM_CAL_CODES) {
    const aVoltage = state.paramCal.A.find(point => point.code === code)?.voltage ?? 0;
    const muVoltage = state.paramCal.mu.find(point => point.code === code)?.voltage ?? 0;
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
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  state.paramCal = next;
  const code = clamp(Math.round(Number(codeValue) || 0), 0, POT_MAX_CODE);
  $("aCode").value = code;
  $("muCode").value = code;
  updatePotReadout();
  const device = deviceMuxInfo($("potDevice").value).device;
  $("potDevice").value = device;
  state.deviceStates[device].a = code;
  state.deviceStates[device].mu = code;
  renderDeviceTable();
  if (button) button.disabled = true;
  try {
    const replyA = await sendCommand(`A${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    const replyM = await sendCommand(`M${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
    const kind = replyLooksBad(replyA) || replyLooksBad(replyM) ? "warn" : "ok";
    setParamCalStatus(`Sent code ${code} to device ${device}. Replies: A=${replySummary(replyA)}, M=${replySummary(replyM)}.`, kind);
  } finally {
    if (button) button.disabled = false;
  }
}

function updateParamCalPreview() {
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  const aZero = next.A.find(point => point.code === 0)?.voltage;
  const muZero = next.mu.find(point => point.code === 0)?.voltage;
  setParamCalStatus(`Pending calibration is valid. A@0=${aZero.toFixed(3)} V, mu@0=${muZero.toFixed(3)} V.`, "ok");
}

function saveParamCalibrationFromInputs() {
  const next = readParamCalibrationInputs();
  const error = validateParamCalibration(next);
  if (error) {
    setParamCalStatus(error, "warn");
    return;
  }
  state.paramCal = next;
  const saved = persistParamCalibration();
  updatePotReadout();
  renderDeviceTable();
  if (saved) {
    setParamCalStatus("A / mu calibration saved locally.", "ok");
    logLine("A / mu calibration saved locally");
  } else {
    setParamCalStatus("A / mu calibration could not be saved in this browser.", "warn");
  }
}

function loadProjectParamCalibration() {
  state.paramCal = cloneParamCalibration();
  const saved = persistParamCalibration();
  renderParamCalibration();
  updatePotReadout();
  renderDeviceTable();
  if (saved) {
    setParamCalStatus("Project A / mu calibration loaded and saved locally.", "ok");
    logLine("Project A / mu calibration loaded and saved locally");
  } else {
    setParamCalStatus("Project A / mu calibration loaded, but local save failed.", "warn");
  }
}

function resetParamCalibration() {
  state.paramCal = cloneParamCalibration();
  try {
    localStorage.removeItem(PARAM_CAL_STORAGE_KEY);
  } catch {}
  renderParamCalibration();
  updatePotReadout();
  renderDeviceTable();
  setParamCalStatus("A / mu calibration reset to defaults.", "ok");
  logLine("A / mu calibration reset to defaults");
}

function calculateDacTarget() {
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

function startSweepCapture() {
  const xDac = $("plotXAxis").value;
  state.activeSweep = {
    id: ++state.sweepCounter,
    startedAt: new Date().toISOString(),
    xDac,
    points: [],
    tiaLabels: [],
  };
  state.pendingAdcContext = null;
  state.lastSweep = null;
  $("downloadSweepCsvButton").disabled = true;
  $("plotStatus").textContent = `Live sweep ${state.activeSweep.id}: waiting for ADC data, X=${xDac}.`;
  renderSweepPlot();
}

function finishSweepCapture() {
  if (state.activeSweep?.points.length) {
    state.activeSweep.finishedAt = new Date().toISOString();
    state.lastSweep = state.activeSweep;
    state.activeSweep = null;
    state.pendingAdcContext = null;
    renderSweepPlot();
    $("downloadSweepCsvButton").disabled = false;
    $("plotStatus").textContent = `Sweep ${state.lastSweep.id}: ${state.lastSweep.points.length} ADC point(s), X=${state.lastSweep.xDac}.`;
  } else {
    state.activeSweep = null;
    state.pendingAdcContext = null;
    renderSweepPlot();
    $("downloadSweepCsvButton").disabled = true;
    $("plotStatus").textContent = "No ADC samples were captured in the last sweep.";
  }
}

function scheduleSweepPlotRender() {
  if (state.plotFramePending) return;
  state.plotFramePending = true;
  requestAnimationFrame(() => {
    state.plotFramePending = false;
    renderSweepPlot();
  });
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

async function startSweep() {
  if (state.sweepRunning) return;
  const sweeps = {};
  try {
    if ($("sweepD1Enable").checked) sweeps.D1 = sweepPoints("D1");
    if ($("sweepD2Enable").checked) sweeps.D2 = sweepPoints("D2");
    if (!Object.keys(sweeps).length) throw new Error("Enable at least one DAC sweep");
  } catch (error) {
    alert(error.message);
    return;
  }
  const dwell = Math.max(0, Number($("sweepDwell").value) || 0);
  const sample = $("sampleEachPoint").checked;
  const maxPoints = Math.max(...Object.values(sweeps).map(points => points.length));
  syncTiaStates();
  startSweepCapture();
  state.sweepRunning = true;
  $("sweepStatus").textContent = `Sweep running: ${Object.entries(sweeps).map(([dac, pts]) => `${dac}:${pts.length}`).join(", ")}`;
  logLine($("sweepStatus").textContent);

  for (let index = 0; index < maxPoints && state.sweepRunning; index++) {
    for (const [dac, points] of Object.entries(sweeps)) {
      if (index >= points.length) continue;
      const code = points[index];
      await sendCommand(`${dac},${code}`, { waitForReply: true, timeoutMs: 1200 });
      state.dacCodes[dac] = code;
      recordMeasurement(dac, code, dacCodeToVhigh(dac, code), "sweep");
    }
    if (sample) {
      state.pendingAdcContext = {
        sweepId: state.activeSweep?.id,
        pointIndex: index,
        xDac: state.activeSweep?.xDac || $("plotXAxis").value,
        dac: dacSnapshot(),
        selectedTias: selectedTias(),
      };
      await sendCommand($("adcCommand").value || "ADC", { waitForReply: true, timeoutMs: 4000 });
      state.pendingAdcContext = null;
    }
    if (dwell) await sleep(dwell);
  }
  state.sweepRunning = false;
  $("sweepStatus").textContent = "Sweep idle";
  finishSweepCapture();
  logLine("Sweep finished");
}

function stopSweep() {
  state.sweepRunning = false;
  $("sweepStatus").textContent = "Sweep stop requested";
  logLine("Sweep stop requested");
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

function updatePotReadout() {
  const a = clamp(Math.round(Number($("aCode").value) || 0), 0, POT_MAX_CODE);
  const mu = clamp(Math.round(Number($("muCode").value) || 0), 0, POT_MAX_CODE);
  $("aCode").value = a;
  $("muCode").value = mu;
  $("potReadout").innerHTML =
    `<div>A: code ${mu}, wiper ${potCodeToVWiper(mu).toFixed(4)} V, output ${potCodeToAVoltage(mu).toFixed(4)} V</div>` +
    `<div>mu: code ${a}, wiper ${potCodeToVWiper(a).toFixed(4)} V, output ${potCodeToMuVoltage(a).toFixed(4)} V</div>`;
}

function loadDeviceState() {
  const device = deviceMuxInfo($("potDevice").value).device;
  $("potDevice").value = device;
  $("aCode").value = state.deviceStates[device].a;
  $("muCode").value = state.deviceStates[device].mu;
  updatePotReadout();
}

async function setAFromCode() {
  const device = deviceMuxInfo($("potDevice").value).device;
  const code = clamp(Math.round(Number($("aCode").value) || 0), 0, POT_MAX_CODE);
  state.deviceStates[device].a = code;
  await sendCommand(`A${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  updatePotReadout();
  renderDeviceTable();
}

async function setMuFromCode() {
  const device = deviceMuxInfo($("potDevice").value).device;
  const code = clamp(Math.round(Number($("muCode").value) || 0), 0, POT_MAX_CODE);
  state.deviceStates[device].mu = code;
  await sendCommand(`M${device},${code}`, { waitForReply: true, timeoutMs: PROGRAM_REPLY_TIMEOUT_MS });
  updatePotReadout();
  renderDeviceTable();
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
    tr.innerHTML = `<td>${device}</td><td>${info.group} addr ${info.addr} / ${info.cs}</td><td>${st.mu}</td><td>${potCodeToAVoltage(st.mu).toFixed(3)}</td><td>${st.a}</td><td>${potCodeToMuVoltage(st.a).toFixed(3)}</td>`;
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

function parseAdcReply(text) {
  const parts = text.replaceAll(":", ",").split(",").map(part => part.trim());
  if (parts[0]?.toUpperCase() === "ADC" && parts.length >= 2 && parts[1].toUpperCase() !== "ERR") {
    const values = parts.slice(1, 1 + ADC_TIA_COUNT).map(Number);
    if (values.every(Number.isFinite)) recordAdcValues(values, text);
  }
}

function selectedTias() {
  syncTiaStates();
  const enabled = state.tiaStates.map((tia, idx) => tia.enabled ? idx + 1 : null).filter(Boolean);
  return enabled.length ? enabled : Array.from({ length: ADC_TIA_COUNT }, (_, idx) => idx + 1);
}

function recordAdcValues(values, source) {
  const context = state.pendingAdcContext;
  const dac = context?.xDac || $("dacSelect").value;
  const code = context?.dac?.[dac]?.code ?? state.dacCodes[dac] ?? clamp(Math.round(Number($("dacCode").value) || 0), 0, DAC_MAX_CODE);
  const tias = context?.selectedTias || selectedTias();
  for (const idx of tias) {
    const tia = state.tiaStates[idx - 1];
    const connected = connectedDevicesSummary(tia);
    const raw = values[idx - 1] ?? "";
    const voltage = raw === "" ? "" : adcRawToVoltage(raw);
    const current = voltage === "" ? "" : adcVoltageToCurrentUa(voltage);
    addMeasurement({
      time: nowTime(),
      dac,
      code,
      vhigh: dacCodeToVhigh(dac, code).toFixed(5),
      tia: `TIA${idx}/${tia.adc}`,
      raw,
      voltage: voltage === "" ? "" : voltage.toFixed(6),
      current: current === "" ? "" : current.toFixed(6),
      jumper: connected,
      devices: connected,
      source,
    });
  }
  addSweepAdcPoint(values, context);
}

function addSweepAdcPoint(values, context) {
  if (!state.activeSweep || !context || context.sweepId !== state.activeSweep.id) return;
  const tias = {};
  for (const idx of context.selectedTias || []) {
    const raw = values[idx - 1];
    if (!Number.isFinite(raw)) continue;
    const voltage = adcRawToVoltage(raw);
    const current = adcVoltageToCurrentUa(voltage);
    const tia = state.tiaStates[idx - 1];
    const connected = connectedDevicesSummary(tia);
    const label = `TIA${idx}`;
    tias[label] = {
      raw,
      voltage,
      current,
      adc: tia.adc,
      jumper: connected,
    };
    if (!state.activeSweep.tiaLabels.includes(label)) state.activeSweep.tiaLabels.push(label);
  }
  state.activeSweep.points.push({
    point: context.pointIndex,
    time: nowTime(),
    xDac: state.activeSweep.xDac,
    dac: context.dac,
    tias,
  });
  $("plotStatus").textContent = `Live sweep ${state.activeSweep.id}: ${state.activeSweep.points.length} ADC point(s), X=${state.activeSweep.xDac}.`;
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

function addMeasurement(row) {
  state.measurements.push(row);
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${row.time}</td><td>${row.dac}</td><td>${row.code}</td><td>${row.vhigh}</td><td>${row.tia}</td><td>${row.raw}</td><td>${row.voltage}</td><td>${row.current}</td><td>${row.jumper}</td>`;
  $("measurementTable").appendChild(tr);
}

function sweepXValue(point, xDac) {
  return point.dac?.[xDac]?.vhigh ?? 0;
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

function drawEmptyPlot(message) {
  const canvas = $("sweepPlotCanvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(640, Math.round(rect.width || 1000));
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
  ctx.fillText(message, width / 2, height / 2);
  $("plotLegend").innerHTML = "";
}

function renderSweepPlot() {
  const sweep = plotSweepSource();
  if (!sweep || !sweep.points.length) {
    drawEmptyPlot("Run a sweep with ADC each point enabled.");
    return;
  }

  const canvas = $("sweepPlotCanvas");
  if (!canvas) return;
  const xDac = sweep.xDac;
  const yMode = $("plotYMode")?.value || "current";
  const points = sweep.points.slice().sort((a, b) => sweepXValue(a, xDac) - sweepXValue(b, xDac));
  const labels = sweep.tiaLabels.slice().sort((a, b) => Number(a.replace("TIA", "")) - Number(b.replace("TIA", "")));
  const samples = [];

  for (const point of points) {
    for (const label of labels) {
      const sample = point.tias[label];
      if (sample) samples.push({ x: sweepXValue(point, xDac), y: sweepYValue(sample, yMode) });
    }
  }

  if (!samples.length) {
    drawEmptyPlot("No ADC values were captured for the selected TIA set.");
    return;
  }

  let minX = Math.min(...samples.map(sample => sample.x));
  let maxX = Math.max(...samples.map(sample => sample.x));
  let minY = Math.min(...samples.map(sample => sample.y));
  let maxY = Math.max(...samples.map(sample => sample.y));
  if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const yPad = (maxY - minY) * 0.08;
  minY -= yPad;
  maxY += yPad;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(640, Math.round(rect.width || 1000));
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

  const margin = { left: 72, right: 22, top: 22, bottom: 56 };
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
  ctx.fillText(`${xDac} output (V)`, margin.left + plotW / 2, height - 26);

  labels.forEach((label, seriesIndex) => {
    const color = PLOT_COLORS[seriesIndex % PLOT_COLORS.length];
    const series = points
      .map(point => ({ x: sweepXValue(point, xDac), sample: point.tias[label] }))
      .filter(item => item.sample)
      .map(item => ({ x: item.x, y: sweepYValue(item.sample, yMode) }));
    if (!series.length) return;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((item, idx) => {
      const x = sx(item.x);
      const y = sy(item.y);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    for (const item of series) {
      ctx.beginPath();
      ctx.arc(sx(item.x), sy(item.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  $("plotLegend").innerHTML = labels.map((label, idx) => {
    const color = PLOT_COLORS[idx % PLOT_COLORS.length];
    return `<span><i style="background:${color}"></i>${label}</span>`;
  }).join("");
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

function downloadCsv() {
  const fields = ["time", "dac", "code", "vhigh", "tia", "raw", "voltage", "current", "devices", "source"];
  const csv = [fields.join(","), ...state.measurements.map(row => fields.map(field => csvEscape(field === "devices" ? (row.devices ?? row.jumper) : row[field])).join(","))].join("\n");
  download(`pcb_gaussian_measurements_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

function downloadSweepCsv() {
  const sweep = state.lastSweep;
  if (!sweep?.points.length) {
    alert("No completed sweep ADC data to download.");
    return;
  }
  const labels = sweep.tiaLabels.slice().sort((a, b) => Number(a.replace("TIA", "")) - Number(b.replace("TIA", "")));
  const fields = [
    "sweep_id", "point", "time", "x_dac", "x_code", "x_vhigh",
    "D1_code", "D1_vhigh", "D2_code", "D2_vhigh",
    ...labels.flatMap(label => [`${label}_raw`, `${label}_V_AIN`, `${label}_I_uA`, `${label}_adc`, `${label}_devices`]),
  ];
  const rows = sweep.points.map(point => {
    const x = point.dac[sweep.xDac];
    const base = [
      sweep.id,
      point.point,
      point.time,
      sweep.xDac,
      x?.code ?? "",
      x?.vhigh ?? "",
      point.dac.D1?.code ?? "",
      point.dac.D1?.vhigh ?? "",
      point.dac.D2?.code ?? "",
      point.dac.D2?.vhigh ?? "",
    ];
    const tiaValues = labels.flatMap(label => {
      const sample = point.tias[label];
      return sample ? [sample.raw, sample.voltage, sample.current, sample.adc, sample.jumper] : ["", "", "", "", ""];
    });
    return [...base, ...tiaValues];
  });
  const csv = [fields.join(","), ...rows.map(row => row.map(csvEscape).join(","))].join("\n");
  download(`pcb_gaussian_sweep_${sweep.id}_${sweep.xDac}_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

function downloadLog() {
  download(`pcb_gaussian_session_${Date.now()}.txt`, state.commandLog.join("\n"), "text/plain;charset=utf-8");
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
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
  $("plotYMode").addEventListener("change", renderSweepPlot);
  $("plotXAxis").addEventListener("change", () => {
    if (state.lastSweep && !state.sweepRunning) {
      state.lastSweep.xDac = $("plotXAxis").value;
      renderSweepPlot();
    }
  });
  $("downloadSweepCsvButton").addEventListener("click", downloadSweepCsv);
  $("saveDacCalButton").addEventListener("click", saveDacCalibrationFromInputs);
  $("loadProjectDacCalButton").addEventListener("click", loadProjectDacCalibration);
  $("resetDacCalButton").addEventListener("click", resetDacCalibration);
  $("saveParamCalButton").addEventListener("click", saveParamCalibrationFromInputs);
  $("loadProjectParamCalButton").addEventListener("click", loadProjectParamCalibration);
  $("resetParamCalButton").addEventListener("click", resetParamCalibration);

  $("switchDevice").addEventListener("input", updateSwitchInfo);
  $("switchWriteButton").addEventListener("click", switchTestWrite);

  $("potDevice").addEventListener("input", loadDeviceState);
  $("aCode").addEventListener("input", updatePotReadout);
  $("muCode").addEventListener("input", updatePotReadout);
  $("setACodeButton").addEventListener("click", setAFromCode);
  $("setAVoltageButton").addEventListener("click", async () => { $("aCode").value = muVoltageToCode($("aTarget").value); await setAFromCode(); });
  $("setMuCodeButton").addEventListener("click", setMuFromCode);
  $("setMuVoltageButton").addEventListener("click", async () => { $("muCode").value = aVoltageToCode($("muTarget").value); await setMuFromCode(); });
  $("applyPotButton").addEventListener("click", async () => { await setAFromCode(); await setMuFromCode(); });

  $("adcButton").addEventListener("click", () => {
    syncTiaStates();
    sendCommand($("adcCommand").value || "ADC", { waitForReply: true, timeoutMs: 4000 });
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
  updateDacReadout();
  renderDacCalibration();
  renderParamCalibration();
  updateSwitchInfo();
  updatePotReadout();
  renderDeviceTable();
  renderTiaConfig();
  renderSweepPlot();
  logLine("Web GUI ready");
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", () => {
  if (state.connected) disconnectSerial();
});
