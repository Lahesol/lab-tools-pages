const DEFAULT_UUIDS = {
  service: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  rx: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  tx: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
};

const CHANNEL_COLORS = [
  "#0e8fa3",
  "#16845d",
  "#c26a15",
  "#8155d9",
  "#b23a48",
  "#2471d5",
  "#78851b",
  "#a94f98",
];

const MAX_LOG_ROWS = 260;

const els = {
  secureBadge: document.querySelector("#secureBadge"),
  apiBadge: document.querySelector("#apiBadge"),
  serialBadge: document.querySelector("#serialBadge"),
  deviceLabel: document.querySelector("#deviceLabel"),
  connectionState: document.querySelector("#connectionState"),
  connectButton: document.querySelector("#connectButton"),
  disconnectButton: document.querySelector("#disconnectButton"),
  connectionModeSelect: document.querySelector("#connectionModeSelect"),
  bleSettings: document.querySelector("#bleSettings"),
  serialSettings: document.querySelector("#serialSettings"),
  serialDataBitsSelect: document.querySelector("#serialDataBitsSelect"),
  serialStopBitsSelect: document.querySelector("#serialStopBitsSelect"),
  serialParitySelect: document.querySelector("#serialParitySelect"),
  serialFlowControlSelect: document.querySelector("#serialFlowControlSelect"),
  namePrefixInput: document.querySelector("#namePrefixInput"),
  serviceUuidInput: document.querySelector("#serviceUuidInput"),
  rxUuidInput: document.querySelector("#rxUuidInput"),
  txUuidInput: document.querySelector("#txUuidInput"),
  baudrateSelect: document.querySelector("#baudrateSelect"),
  baudCommandField: document.querySelector("#baudCommandField"),
  baudrateCommandInput: document.querySelector("#baudrateCommandInput"),
  baudrateState: document.querySelector("#baudrateState"),
  applyBaudrateButton: document.querySelector("#applyBaudrateButton"),
  delimiterSelect: document.querySelector("#delimiterSelect"),
  customDelimiterInput: document.querySelector("#customDelimiterInput"),
  escapeSelect: document.querySelector("#escapeSelect"),
  customEscapeInput: document.querySelector("#customEscapeInput"),
  separatorSelect: document.querySelector("#separatorSelect"),
  parserState: document.querySelector("#parserState"),
  plotModeState: document.querySelector("#plotModeState"),
  plotWindowInput: document.querySelector("#plotWindowInput"),
  samplingRateInput: document.querySelector("#samplingRateInput"),
  filterState: document.querySelector("#filterState"),
  lpfEnableInput: document.querySelector("#lpfEnableInput"),
  lpfCutoffInput: document.querySelector("#lpfCutoffInput"),
  notchEnableInput: document.querySelector("#notchEnableInput"),
  notchFrequencyInput: document.querySelector("#notchFrequencyInput"),
  notchQInput: document.querySelector("#notchQInput"),
  txCommandInput: document.querySelector("#txCommandInput"),
  txState: document.querySelector("#txState"),
  sendCommandButton: document.querySelector("#sendCommandButton"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  clearButton: document.querySelector("#clearButton"),
  demoButton: document.querySelector("#demoButton"),
  plotSubtitle: document.querySelector("#plotSubtitle"),
  canvas: document.querySelector("#plotCanvas"),
  emptyPlot: document.querySelector("#emptyPlot"),
  samplesPerSecond: document.querySelector("#samplesPerSecond"),
  frameCount: document.querySelector("#frameCount"),
  bytesReceived: document.querySelector("#bytesReceived"),
  channelCount: document.querySelector("#channelCount"),
  windowLabel: document.querySelector("#windowLabel"),
  rxLog: document.querySelector("#rxLog"),
  clearLogButton: document.querySelector("#clearLogButton"),
  errorCount: document.querySelector("#errorCount"),
  lastFrame: document.querySelector("#lastFrame"),
  lastValues: document.querySelector("#lastValues"),
  activeDelimiter: document.querySelector("#activeDelimiter"),
  activeEscape: document.querySelector("#activeEscape"),
  activeFilters: document.querySelector("#activeFilters"),
};

const ctx = els.canvas.getContext("2d");
const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

let bluetoothDevice = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let serialPort = null;
let serialReader = null;
let serialWriter = null;
let serialReadAbort = false;
let activeConnectionMode = null;
let frameBuffer = "";
let escapeArmed = false;
let samples = [];
let totalFrames = 0;
let totalBytes = 0;
let parseErrors = 0;
let recording = true;
let connected = false;
let demoTimer = null;
let statsWindow = [];
let lpfState = [];
let notchState = [];

function setBadge(el, text, state) {
  el.textContent = text;
  el.className = el.className
    .split(" ")
    .filter((name) => !["ok", "warn", "error", "idle", "connected", "neutral"].includes(name))
    .concat(state)
    .join(" ");
}

function getSelectedConnectionMode() {
  return els.connectionModeSelect.value === "serial" ? "serial" : "ble";
}

function getBaudrate() {
  return Number.parseInt(els.baudrateSelect.value, 10) || 115200;
}

function getSerialOptions() {
  return {
    baudRate: getBaudrate(),
    dataBits: Number.parseInt(els.serialDataBitsSelect.value, 10) || 8,
    stopBits: Number.parseInt(els.serialStopBitsSelect.value, 10) || 1,
    parity: els.serialParitySelect.value,
    flowControl: els.serialFlowControlSelect.value,
  };
}

function isSelectedModeSupported() {
  const mode = getSelectedConnectionMode();
  if (mode === "serial") return Boolean(navigator.serial);
  return Boolean(navigator.bluetooth);
}

function updateConnectionModeUi() {
  const mode = getSelectedConnectionMode();
  const isSerial = mode === "serial";

  els.bleSettings.classList.toggle("hidden", isSerial);
  els.serialSettings.classList.toggle("hidden", !isSerial);
  els.baudCommandField.classList.toggle("hidden", isSerial);
  els.connectionModeSelect.disabled = connected;

  if (!connected) {
    els.connectButton.disabled = !isSelectedModeSupported();
    els.applyBaudrateButton.disabled = true;
    els.sendCommandButton.disabled = true;
    setBadge(els.baudrateState, isSerial ? "Open setting" : "Local", "idle");
    if (!isSelectedModeSupported()) {
      setBadge(els.connectionState, isSerial ? "No Web Serial" : "No Web Bluetooth", "error");
    } else {
      setBadge(els.connectionState, "Idle", "idle");
    }
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function logRow(direction, text) {
  const row = document.createElement("div");
  row.className = `log-row ${direction}`;
  const time = document.createElement("span");
  time.className = "time";
  time.textContent = nowLabel();
  const body = document.createElement("span");
  body.className = "body";
  body.textContent = text;
  row.append(time, body);
  els.rxLog.append(row);

  while (els.rxLog.children.length > MAX_LOG_ROWS) {
    els.rxLog.firstElementChild.remove();
  }

  els.rxLog.scrollTop = els.rxLog.scrollHeight;
}

function readEscapedLiteral(value) {
  if (!value) return "";
  return value
    .replaceAll("\\r", "\r")
    .replaceAll("\\n", "\n")
    .replaceAll("\\t", "\t")
    .replaceAll("\\0", "\0")
    .replaceAll("\\x1b", "\x1b")
    .replaceAll("\\e", "\x1b");
}

function getDelimiter() {
  switch (els.delimiterSelect.value) {
    case "crlf":
      return "\r\n";
    case "cr":
      return "\r";
    case "semicolon":
      return ";";
    case "custom":
      return readEscapedLiteral(els.customDelimiterInput.value);
    case "lf":
    default:
      return "\n";
  }
}

function getEscapeChar() {
  switch (els.escapeSelect.value) {
    case "esc":
      return "\x1b";
    case "none":
      return "";
    case "custom":
      return readEscapedLiteral(els.customEscapeInput.value).slice(0, 1);
    case "backslash":
    default:
      return "\\";
  }
}

function visibleControlText(value) {
  if (value === "") return "None";
  if (value === "\n") return "LF 0x0A";
  if (value === "\r\n") return "CRLF 0x0D 0x0A";
  if (value === "\r") return "CR 0x0D";
  if (value === "\\") return "Backslash 0x5C";
  if (value === "\x1b") return "ESC 0x1B";
  return value
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t")
    .replaceAll("\x1b", "ESC 0x1B")
    .replaceAll("\0", "\\0");
}

function updateParserLabels() {
  const delimiter = getDelimiter();
  const escapeChar = getEscapeChar();
  els.customDelimiterInput.disabled = els.delimiterSelect.value !== "custom";
  els.customEscapeInput.disabled = els.escapeSelect.value !== "custom";
  els.activeDelimiter.textContent = visibleControlText(delimiter);
  els.activeEscape.textContent = visibleControlText(escapeChar);
}

function readPositiveNumber(input, fallback, min, max) {
  const parsed = Number.parseFloat(input.value);
  if (!Number.isFinite(parsed)) {
    input.value = String(fallback);
    return fallback;
  }

  const clamped = Math.min(Math.max(parsed, min), max);
  if (clamped !== parsed) {
    input.value = String(clamped);
  }
  return clamped;
}

function getPlotWindowSeconds() {
  return readPositiveNumber(els.plotWindowInput, 5, 0.2, 600);
}

function getSamplingRateHz() {
  return readPositiveNumber(els.samplingRateInput, 200, 0.1, 200000);
}

function getFilterConfig() {
  const sampleRate = getSamplingRateHz();
  const nyquist = sampleRate / 2;
  const lpfCutoff = readPositiveNumber(els.lpfCutoffInput, 5, 0.01, 100000);
  const notchFrequency = readPositiveNumber(els.notchFrequencyInput, 60, 0.01, 100000);
  const notchQ = readPositiveNumber(els.notchQInput, 30, 0.1, 500);

  return {
    sampleRate,
    lpfEnabled: els.lpfEnableInput.checked && lpfCutoff < nyquist,
    lpfCutoff,
    notchEnabled: els.notchEnableInput.checked && notchFrequency < nyquist,
    notchFrequency,
    notchQ,
    lpfInvalid: els.lpfEnableInput.checked && lpfCutoff >= nyquist,
    notchInvalid: els.notchEnableInput.checked && notchFrequency >= nyquist,
  };
}

function describeFilterConfig(config = getFilterConfig()) {
  const parts = [];
  if (config.lpfEnabled) parts.push(`LPF ${formatNumber(config.lpfCutoff)} Hz`);
  if (config.notchEnabled) parts.push(`Notch ${formatNumber(config.notchFrequency)} Hz Q${formatNumber(config.notchQ)}`);
  if (config.lpfInvalid) parts.push("LPF cutoff >= Nyquist");
  if (config.notchInvalid) parts.push("Notch freq >= Nyquist");
  return parts.length ? parts.join(" + ") : "Bypass";
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) return value.toPrecision(4);
  return Number(value.toFixed(4)).toString();
}

function updateFilterLabels() {
  const config = getFilterConfig();
  const description = describeFilterConfig(config);
  const state = config.lpfInvalid || config.notchInvalid ? "warn" : config.lpfEnabled || config.notchEnabled ? "ok" : "idle";
  const badgeText = config.lpfInvalid || config.notchInvalid ? "Invalid" : config.lpfEnabled || config.notchEnabled ? "Active" : "Bypass";
  setBadge(els.filterState, badgeText, state);
  els.activeFilters.textContent = description;
}

function parseNumbers(frame) {
  const trimmed = frame.trim();
  if (!trimmed) return [];

  const selected = els.separatorSelect.value;
  let parts = [];

  if (selected === "comma") parts = trimmed.split(",");
  if (selected === "tab") parts = trimmed.split("\t");
  if (selected === "space") parts = trimmed.split(/\s+/);
  if (selected === "semicolon") parts = trimmed.split(";");

  if (selected === "auto") {
    const matches = trimmed.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    return matches ? matches.map(Number).filter(Number.isFinite) : [];
  }

  return parts
    .flatMap((part) => part.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [])
    .map(Number)
    .filter(Number.isFinite);
}

function resetFilterState() {
  lpfState = [];
  notchState = [];
}

function applyLowPass(values, config) {
  if (!config.lpfEnabled) return values;

  const alpha = Math.min(1, Math.max(0, 1 - Math.exp((-2 * Math.PI * config.lpfCutoff) / config.sampleRate)));
  return values.map((value, channel) => {
    const previous = Number.isFinite(lpfState[channel]) ? lpfState[channel] : value;
    const filtered = previous + alpha * (value - previous);
    lpfState[channel] = filtered;
    return filtered;
  });
}

function applyNotch(values, config) {
  if (!config.notchEnabled) return values;

  const omega = (2 * Math.PI * config.notchFrequency) / config.sampleRate;
  const cos = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * config.notchQ);
  const a0 = 1 + alpha;
  const b0 = 1 / a0;
  const b1 = (-2 * cos) / a0;
  const b2 = 1 / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;

  return values.map((value, channel) => {
    const state = notchState[channel] ?? { x1: value, x2: value, y1: value, y2: value };
    const filtered = b0 * value + b1 * state.x1 + b2 * state.x2 - a1 * state.y1 - a2 * state.y2;
    notchState[channel] = {
      x1: value,
      x2: state.x1,
      y1: filtered,
      y2: state.y1,
    };
    return filtered;
  });
}

function applyDigitalFilters(rawValues) {
  const config = getFilterConfig();
  let values = rawValues.slice(0, CHANNEL_COLORS.length);
  values = applyNotch(values, config);
  values = applyLowPass(values, config);
  return values;
}

function reprocessSamples() {
  resetFilterState();
  for (const sample of samples) {
    sample.values = applyDigitalFilters(sample.raw);
  }
}

function pruneSamples() {
  if (!samples.length) return;

  const windowMs = getPlotWindowSeconds() * 1000;
  const latest = performance.now();
  const retentionMs = Math.max(60000, windowMs * 4);
  samples = samples.filter((point) => latest - point.time <= retentionMs);

  const maxSamples = Math.min(50000, Math.max(600, Math.ceil(getSamplingRateHz() * getPlotWindowSeconds() * 4)));
  if (samples.length > maxSamples) {
    samples = samples.slice(samples.length - maxSamples);
  }
}

function getVisibleSamples() {
  const windowMs = getPlotWindowSeconds() * 1000;
  const rightEdge = performance.now();
  const leftEdge = rightEdge - windowMs;
  return {
    leftEdge,
    rightEdge,
    windowMs,
    points: samples.filter((point) => point.time >= leftEdge && point.time <= rightEdge),
  };
}

function handleFrame(frame) {
  totalFrames += 1;
  els.lastFrame.textContent = frame || "(empty)";
  logRow("rx", frame || "(empty frame)");

  const values = parseNumbers(frame);
  if (!values.length) {
    parseErrors += 1;
    setBadge(els.parserState, "No numeric data", "warn");
    updateStats();
    return;
  }

  setBadge(els.parserState, "Ready", "ok");
  els.lastValues.textContent = values.map((value) => Number(value).toPrecision(6)).join(", ");

  if (recording) {
    const raw = values.slice(0, CHANNEL_COLORS.length);
    const point = {
      index: samples.length,
      time: performance.now(),
      raw,
      values: applyDigitalFilters(raw),
    };
    samples.push(point);
    statsWindow.push(point.time);
    pruneSamples();
  }

  updateStats();
  drawPlot();
}

function appendIncomingText(text) {
  const delimiter = getDelimiter();
  const escapeChar = getEscapeChar();

  if (!delimiter) {
    frameBuffer += text;
    return;
  }

  for (const char of text) {
    if (escapeArmed) {
      frameBuffer += char;
      escapeArmed = false;
      continue;
    }

    if (escapeChar && char === escapeChar) {
      escapeArmed = true;
      continue;
    }

    frameBuffer += char;

    if (frameBuffer.endsWith(delimiter)) {
      const frame = frameBuffer.slice(0, -delimiter.length);
      frameBuffer = "";
      handleFrame(frame);
    }
  }
}

function handleIncomingBytes(bytes) {
  totalBytes += bytes.byteLength;
  const text = decoder.decode(bytes, { stream: true });
  appendIncomingText(text);
  updateStats();
}

function handleIncomingValue(dataView) {
  handleIncomingBytes(dataView);
}

function onCharacteristicValueChanged(event) {
  handleIncomingValue(event.target.value);
}

function updateConnectionUi(nextConnected, message = "") {
  connected = nextConnected;
  els.connectButton.disabled = connected;
  els.disconnectButton.disabled = !connected;
  els.applyBaudrateButton.disabled = !connected;
  els.sendCommandButton.disabled = !connected;
  els.connectionModeSelect.disabled = connected;

  if (connected) {
    setBadge(els.connectionState, "Connected", "connected");
    setBadge(els.txState, "Ready", "ok");
    els.deviceLabel.textContent = message || bluetoothDevice?.name || bluetoothDevice?.id || "Connected device";
    setBadge(els.baudrateState, activeConnectionMode === "serial" ? `${getBaudrate()} baud` : "Connected", "ok");
  } else {
    activeConnectionMode = null;
    setBadge(els.connectionState, "Idle", "idle");
    setBadge(els.txState, "Standby", "idle");
    setBadge(els.baudrateState, "Local", "idle");
    els.deviceLabel.textContent = message || "No device selected";
    updateConnectionModeUi();
  }
}

function validateUuidInput(input, fallback) {
  const value = input.value.trim();
  if (!value) {
    input.value = fallback;
    return fallback;
  }
  return value;
}

async function connectSelectedTransport() {
  if (getSelectedConnectionMode() === "serial") {
    await connectSerial();
  } else {
    await connectBluetooth();
  }
}

async function disconnectActiveTransport() {
  if (activeConnectionMode === "serial") {
    await disconnectSerial();
  } else {
    await disconnectBluetooth();
  }
}

async function openSerialPort(port) {
  const options = getSerialOptions();
  serialReadAbort = false;
  await port.open(options);
  serialPort = port;
  serialWriter = port.writable?.getWriter() ?? null;
  activeConnectionMode = "serial";
  updateConnectionUi(true, `USB Serial @ ${options.baudRate}`);
  const parityLabel = options.parity === "none" ? "N" : options.parity.charAt(0).toUpperCase();
  logRow("rx", `Serial connected: ${options.baudRate} baud, ${options.dataBits}${parityLabel}${options.stopBits}`);
  readSerialLoop();
}

async function connectSerial() {
  if (!navigator.serial) {
    setBadge(els.connectionState, "Unsupported", "error");
    logRow("err", "Web Serial is not available in this browser.");
    return;
  }

  try {
    setBadge(els.connectionState, "Selecting", "warn");
    const port = await navigator.serial.requestPort();
    setBadge(els.connectionState, "Opening", "warn");
    await openSerialPort(port);
  } catch (error) {
    await closeSerialPort({ updateUi: false }).catch(() => {});
    updateConnectionUi(false);
    setBadge(els.connectionState, "Failed", "error");
    logRow("err", `Serial connect failed: ${error.message}`);
  }
}

async function readSerialLoop() {
  while (serialPort?.readable && !serialReadAbort) {
    serialReader = serialPort.readable.getReader();
    try {
      while (!serialReadAbort) {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value?.byteLength) {
          handleIncomingBytes(value);
        }
      }
    } catch (error) {
      if (!serialReadAbort) {
        logRow("err", `Serial RX failed: ${error.message}`);
      }
    } finally {
      if (serialReader) {
        serialReader.releaseLock();
        serialReader = null;
      }
    }
  }
}

async function closeSerialPort({ updateUi = true } = {}) {
  serialReadAbort = true;

  if (serialReader) {
    const reader = serialReader;
    await reader.cancel().catch(() => {});
    reader.releaseLock();
    serialReader = null;
  }

  if (serialWriter) {
    serialWriter.releaseLock();
    serialWriter = null;
  }

  if (serialPort) {
    const port = serialPort;
    serialPort = null;
    if (port.readable || port.writable) {
      await port.close().catch(() => {});
    }
  }

  if (updateUi) {
    updateConnectionUi(false, "Serial disconnected");
    logRow("err", "Serial disconnected.");
  }
}

async function disconnectSerial() {
  await closeSerialPort();
}

async function connectBluetooth() {
  if (!navigator.bluetooth) {
    setBadge(els.connectionState, "Unsupported", "error");
    logRow("err", "Web Bluetooth is not available in this browser.");
    return;
  }

  const serviceUuid = validateUuidInput(els.serviceUuidInput, DEFAULT_UUIDS.service);
  const rxUuid = validateUuidInput(els.rxUuidInput, DEFAULT_UUIDS.rx);
  const txUuid = validateUuidInput(els.txUuidInput, DEFAULT_UUIDS.tx);
  const prefix = els.namePrefixInput.value.trim();

  const requestOptions = prefix
    ? { filters: [{ namePrefix: prefix }], optionalServices: [serviceUuid] }
    : { acceptAllDevices: true, optionalServices: [serviceUuid] };

  try {
    setBadge(els.connectionState, "Scanning", "warn");
    bluetoothDevice = await navigator.bluetooth.requestDevice(requestOptions);
    bluetoothDevice.addEventListener("gattserverdisconnected", onDisconnected);

    setBadge(els.connectionState, "Connecting", "warn");
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(serviceUuid);

    rxCharacteristic = await service.getCharacteristic(rxUuid);
    txCharacteristic = await service.getCharacteristic(txUuid);
    txCharacteristic.addEventListener("characteristicvaluechanged", onCharacteristicValueChanged);
    await txCharacteristic.startNotifications();

    activeConnectionMode = "ble";
    updateConnectionUi(true, bluetoothDevice.name || bluetoothDevice.id);
    logRow("rx", `Connected: ${bluetoothDevice.name || bluetoothDevice.id}`);
  } catch (error) {
    updateConnectionUi(false);
    setBadge(els.connectionState, "Failed", "error");
    logRow("err", `Connect failed: ${error.message}`);
  }
}

function onDisconnected() {
  if (activeConnectionMode && activeConnectionMode !== "ble") return;
  updateConnectionUi(false, "Disconnected");
  rxCharacteristic = null;
  txCharacteristic = null;
  logRow("err", "Bluetooth disconnected.");
}

async function disconnectBluetooth() {
  try {
    if (txCharacteristic) {
      txCharacteristic.removeEventListener("characteristicvaluechanged", onCharacteristicValueChanged);
      await txCharacteristic.stopNotifications().catch(() => {});
    }

    if (bluetoothDevice?.gatt?.connected) {
      bluetoothDevice.gatt.disconnect();
    } else {
      onDisconnected();
    }
  } catch (error) {
    logRow("err", `Disconnect failed: ${error.message}`);
  }
}

function normalizeCommandText(value) {
  return readEscapedLiteral(value);
}

async function writeText(text) {
  const data = encoder.encode(text);

  if (activeConnectionMode === "serial") {
    if (!serialWriter) {
      throw new Error("Serial writer is not ready.");
    }
    await serialWriter.write(data);
    return;
  }

  if (!rxCharacteristic) {
    throw new Error("RX characteristic is not ready.");
  }

  if (typeof rxCharacteristic.writeValueWithoutResponse === "function") {
    await rxCharacteristic.writeValueWithoutResponse(data);
  } else {
    await rxCharacteristic.writeValue(data);
  }
}

async function applyBaudrate() {
  const baudrate = els.baudrateSelect.value;

  if (activeConnectionMode === "serial") {
    if (!serialPort) {
      setBadge(els.baudrateState, "Open setting", "idle");
      return;
    }

    const port = serialPort;
    try {
      await closeSerialPort({ updateUi: false });
      await openSerialPort(port);
      setBadge(els.baudrateState, `${baudrate} baud`, "ok");
      logRow("tx", `Serial reopened @ ${baudrate} baud`);
    } catch (error) {
      updateConnectionUi(false);
      setBadge(els.baudrateState, "Failed", "error");
      logRow("err", `Serial baudrate apply failed: ${error.message}`);
    }
    return;
  }

  const template = els.baudrateCommandInput.value || "BAUD {baud}\\n";
  const command = normalizeCommandText(template.replaceAll("{baud}", baudrate));

  try {
    await writeText(command);
    setBadge(els.baudrateState, `${baudrate}`, "ok");
    logRow("tx", command.replaceAll("\r", "\\r").replaceAll("\n", "\\n"));
  } catch (error) {
    setBadge(els.baudrateState, "Failed", "error");
    logRow("err", `Baudrate command failed: ${error.message}`);
  }
}

async function sendCommand() {
  try {
    const command = normalizeCommandText(els.txCommandInput.value);
    await writeText(command);
    setBadge(els.txState, "Sent", "ok");
    logRow("tx", command.replaceAll("\r", "\\r").replaceAll("\n", "\\n"));
  } catch (error) {
    setBadge(els.txState, "Failed", "error");
    logRow("err", `TX failed: ${error.message}`);
  }
}

function startRecording() {
  recording = true;
  els.startButton.classList.add("active");
  els.stopButton.classList.remove("active");
  els.plotSubtitle.textContent = connected
    ? `Recording ${activeConnectionMode === "serial" ? "Serial" : "BLE"} frames`
    : "Recording parser input";
}

function stopRecording() {
  recording = false;
  els.startButton.classList.remove("active");
  els.stopButton.classList.add("active");
  els.plotSubtitle.textContent = "Plot paused";
}

function clearSamples() {
  samples = [];
  statsWindow = [];
  totalFrames = 0;
  totalBytes = 0;
  parseErrors = 0;
  frameBuffer = "";
  escapeArmed = false;
  resetFilterState();
  els.lastFrame.textContent = "-";
  els.lastValues.textContent = "-";
  setBadge(els.parserState, "Ready", "ok");
  updateStats();
  drawPlot();
}

function clearLog() {
  els.rxLog.replaceChildren();
}

function updateStats() {
  const latestTime = performance.now();
  statsWindow = statsWindow.filter((time) => latestTime - time <= 1000);
  const visible = getVisibleSamples();
  const channels = visible.points.reduce((max, point) => Math.max(max, point.values.length), 0);
  const windowSeconds = getPlotWindowSeconds();

  els.samplesPerSecond.textContent = statsWindow.length.toFixed(1);
  els.frameCount.textContent = String(totalFrames);
  els.bytesReceived.textContent = String(totalBytes);
  els.channelCount.textContent = String(channels);
  els.windowLabel.textContent = `${windowSeconds.toFixed(1)}s`;
  setBadge(els.errorCount, `${parseErrors} errors`, parseErrors ? "warn" : "idle");
  setBadge(els.plotModeState, "Rolling", "ok");
  updateFilterLabels();
  els.emptyPlot.classList.toggle("hidden", visible.points.length > 0);
}

function resizeCanvasToDisplaySize() {
  const rect = els.canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width * scale));
  const height = Math.max(260, Math.floor(rect.height * scale));
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
  }
  return { width, height, scale };
}

function drawGrid(width, height, padding) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfdfe";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e0e7ee";
  ctx.lineWidth = 1;

  const xLines = 10;
  const yLines = 8;
  for (let i = 0; i <= xLines; i += 1) {
    const x = padding.left + ((width - padding.left - padding.right) * i) / xLines;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, height - padding.bottom);
    ctx.stroke();
  }

  for (let i = 0; i <= yLines; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / yLines;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#9fb0be";
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

function drawAxisLabels(width, height, padding, minY, maxY, windowMs) {
  ctx.fillStyle = "#5f6f7f";
  ctx.font = `${12 * (window.devicePixelRatio || 1)}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) * i) / 4;
    const value = maxY - ((maxY - minY) * i) / 4;
    ctx.fillText(value.toPrecision(4), padding.left - 10, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (let i = 0; i <= 4; i += 1) {
    const x = padding.left + ((width - padding.left - padding.right) * i) / 4;
    const secondsAgo = ((4 - i) * windowMs) / 4000;
    ctx.fillText(i === 4 ? "0s" : `-${secondsAgo.toFixed(1)}s`, x, height - padding.bottom + 22);
  }

  ctx.textAlign = "left";
  ctx.fillText("time (s)", padding.left, height - 8);
}

function drawLegend(width, padding, channelCount) {
  const xStart = padding.left + 4;
  let x = xStart;
  const y = padding.top - 18;
  ctx.font = `${12 * (window.devicePixelRatio || 1)}px ${getComputedStyle(document.body).fontFamily}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  for (let channel = 0; channel < channelCount; channel += 1) {
    const label = `CH${channel + 1}`;
    ctx.strokeStyle = CHANNEL_COLORS[channel % CHANNEL_COLORS.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();

    ctx.fillStyle = "#334455";
    ctx.fillText(label, x + 26, y);
    x += 72;
    if (x > width - padding.right - 62) break;
  }
}

function drawPlot() {
  const { width, height, scale } = resizeCanvasToDisplaySize();
  const padding = {
    left: 58 * scale,
    right: 22 * scale,
    top: 38 * scale,
    bottom: 42 * scale,
  };

  const visible = getVisibleSamples();
  const flatValues = visible.points.flatMap((point) => point.values);
  let minY = flatValues.length ? Math.min(...flatValues) : -1;
  let maxY = flatValues.length ? Math.max(...flatValues) : 1;

  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const paddingY = (maxY - minY) * 0.08;
  minY -= paddingY;
  maxY += paddingY;

  drawGrid(width, height, padding);
  drawAxisLabels(width, height, padding, minY, maxY, visible.windowMs);

  if (!visible.points.length) return;

  const channelCount = visible.points.reduce((max, point) => Math.max(max, point.values.length), 0);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const denominator = Math.max(visible.windowMs, 1);

  for (let channel = 0; channel < channelCount; channel += 1) {
    ctx.strokeStyle = CHANNEL_COLORS[channel % CHANNEL_COLORS.length];
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();

    let started = false;
    for (const point of visible.points) {
      const value = point.values[channel];
      if (!Number.isFinite(value)) continue;

      const x = padding.left + (plotWidth * (point.time - visible.leftEdge)) / denominator;
      const y = padding.top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  drawLegend(width, padding, channelCount);
}

function getDemoIntervalMs() {
  return Math.max(5, Math.round(1000 / getSamplingRateHz()));
}

function toggleDemoStream() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
    els.demoButton.classList.remove("active");
    return;
  }

  let t = samples.length;
  els.demoButton.classList.add("active");
  demoTimer = window.setInterval(() => {
    const delimiter = getDelimiter() || "\n";
    const frame = [
      Math.sin(t / 12) * 1.8 + Math.random() * 0.12,
      Math.cos(t / 20) * 1.1 + Math.random() * 0.1,
      Math.sin(t / 31 + 0.8) * 0.8 + Math.cos(t / 9) * 0.2,
    ]
      .map((value) => value.toFixed(4))
      .join(",");
    appendIncomingText(`${frame}${delimiter}`);
    totalBytes += frame.length + delimiter.length;
    updateStats();
    t += 1;
  }, getDemoIntervalMs());
}

function initCapabilities() {
  if (window.isSecureContext) {
    setBadge(els.secureBadge, "Secure context", "ok");
  } else {
    setBadge(els.secureBadge, "Needs HTTPS/localhost", "warn");
  }

  if (navigator.bluetooth) {
    setBadge(els.apiBadge, "Web Bluetooth", "ok");
  } else {
    setBadge(els.apiBadge, "No Web Bluetooth", "error");
  }

  if (navigator.serial) {
    setBadge(els.serialBadge, "Web Serial", "ok");
    navigator.serial.addEventListener("disconnect", (event) => {
      if (event.target === serialPort) {
        closeSerialPort().catch((error) => logRow("err", `Serial disconnect cleanup failed: ${error.message}`));
      }
    });
  } else {
    setBadge(els.serialBadge, "No Web Serial", "error");
  }

  updateConnectionModeUi();
}

function restartDemoStreamIfActive() {
  if (!demoTimer) return;
  clearInterval(demoTimer);
  demoTimer = null;
  els.demoButton.classList.remove("active");
  toggleDemoStream();
}

function handleFilterSettingsChange() {
  reprocessSamples();
  updateFilterLabels();
  updateStats();
  drawPlot();
}

function handleRollingSettingsChange() {
  pruneSamples();
  handleFilterSettingsChange();
  restartDemoStreamIfActive();
}

function bindEvents() {
  els.connectButton.addEventListener("click", connectSelectedTransport);
  els.disconnectButton.addEventListener("click", disconnectActiveTransport);
  els.connectionModeSelect.addEventListener("change", updateConnectionModeUi);
  els.applyBaudrateButton.addEventListener("click", applyBaudrate);
  els.sendCommandButton.addEventListener("click", sendCommand);
  els.startButton.addEventListener("click", startRecording);
  els.stopButton.addEventListener("click", stopRecording);
  els.clearButton.addEventListener("click", clearSamples);
  els.clearLogButton.addEventListener("click", clearLog);
  els.demoButton.addEventListener("click", toggleDemoStream);
  els.plotWindowInput.addEventListener("input", handleRollingSettingsChange);
  els.samplingRateInput.addEventListener("input", handleRollingSettingsChange);

  for (const el of [els.lpfEnableInput, els.lpfCutoffInput, els.notchEnableInput, els.notchFrequencyInput, els.notchQInput]) {
    el.addEventListener("input", handleFilterSettingsChange);
  }

  for (const el of [els.delimiterSelect, els.customDelimiterInput, els.escapeSelect, els.customEscapeInput]) {
    el.addEventListener("input", () => {
      frameBuffer = "";
      escapeArmed = false;
      updateParserLabels();
    });
  }

  window.addEventListener("resize", drawPlot);
}

initCapabilities();
updateParserLabels();
updateFilterLabels();
updateConnectionUi(false);
updateStats();
bindEvents();
drawPlot();

window.setInterval(() => {
  if (!samples.length) return;
  pruneSamples();
  updateStats();
  drawPlot();
}, 250);
