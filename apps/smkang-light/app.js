const CHANNELS = ["A", "B", "C", "D"];
const FIXED_DEFAULTS = { A: 0, B: 0, C: 0, D: -10000 };
const ZERO_DEFAULTS = { A: 1986, B: 1990, C: 2004, D: 1988 };
const APP_VERSION = "smkang-light-web-gui-0.3.6";
const POLL_MS = 250;
const ADC_BITS = 14;
const ADC_VREF = 3.3;
const ADC_GAIN = 1.0;
const DEFAULT_ADC_RATE_HZ = 250;
const DEFAULT_ADC_OVERSAMPLE_N = 4;
const DEFAULT_ADC_FIRMWARE_AVERAGE_N = 4;
const DEFAULT_ADC_SETTLE_DISCARD_N = 2;
const MAX_LOG_ROWS = 1200;
const DAPLINK_FILTERS = [{ usbVendorId: 0xc251, usbProductId: 0xf001 }];

const state = {
  transportMode: null,
  connected: false,
  adcRunning: false,
  sweepRunning: false,
  lastLogId: 0,
  samples: [],
  curves: [],
  curveRecords: [],
  activeCurveIndex: null,
  activeSamples: null,
  activeTitle: "Current ADC",
  polling: false,
  portLabel: null,
  baud: 230400,
  adcInput: 1,
  adcRateHz: DEFAULT_ADC_RATE_HZ,
  adcOversampleN: DEFAULT_ADC_OVERSAMPLE_N,
  adcFirmwareAverageN: DEFAULT_ADC_FIRMWARE_AVERAGE_N,
  adcSettleDiscardN: DEFAULT_ADC_SETTLE_DISCARD_N,
  adcConfigDirty: new Set(),
  adcOsBuffer: newOversampleBuffer(),
  currentDacMv: { A: 0, B: 0, C: 0, D: 0 },
  fixedMv: { ...FIXED_DEFAULTS },
  zeroCodes: { ...ZERO_DEFAULTS },
  currentCommand: null,
  currentCommandTime: null,
  currentSampleT0: null,
  scCycleCount: 0,
  logRows: [],
  rawLogRows: [],
  nextLogId: 1,
  adcDisplayLogCount: 0,
  adcDisplayLogLastS: 0,
  adcIgnoreUntilS: 0,
  runId: null,
  runDir: null,
  serial: null,
  webSerialPorts: [],
  sweepStatus: {
    running: false,
    label: null,
    points_total: 0,
    points_done: 0,
    error: null,
  },
  sweepStopRequested: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", async () => {
  bindElements();
  renderChannelRows();
  renderZeroControls();
  bindActions();
  await refreshPorts();
  pollData();
});

function bindElements() {
  [
    "runInfo",
    "connectionBadge",
    "adcBadge",
    "sweepBadge",
    "portSelect",
    "refreshPortsBtn",
    "baudInput",
    "connectBtn",
    "disconnectBtn",
    "adcToggleBtn",
    "zeroVoltageBtn",
    "clearBtn",
    "adcInputSelect",
    "adcRateInput",
    "adcOversampleInput",
    "adcFirmwareAverageInput",
    "adcSettleDiscardInput",
    "applyAdcConfigBtn",
    "channelTable",
    "applyFixedBtn",
    "startSweepBtn",
    "stopSweepBtn",
    "sweepDirectionSelect",
    "sweepStepInput",
    "sweepDelayInput",
    "sweepCyclesInput",
    "autoAdcCheckbox",
    "sweepProgress",
    "zeroGrid",
    "zeroCodeBtn",
    "manualForm",
    "manualInput",
    "plotTitle",
    "statsLine",
    "plotAxisSelect",
    "showCurrentBtn",
    "exportCurrentBtn",
    "exportCurvesBtn",
    "exportRawLogBtn",
    "adcCanvas",
    "curveCount",
    "curveList",
    "lastLogId",
    "logBox",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function renderChannelRows() {
  const template = document.getElementById("channelRowTemplate");
  CHANNELS.forEach((channel) => {
    const node = template.content.cloneNode(true);
    const row = node.querySelector(".channel-row");
    row.dataset.channel = channel;
    row.querySelector(".channel-name").textContent = channel;

    const mode = row.querySelector(".channel-mode");
    const fixed = row.querySelector(".channel-fixed");
    const start = row.querySelector(".channel-start");
    const stop = row.querySelector(".channel-stop");
    fixed.value = FIXED_DEFAULTS[channel];
    start.value = channel === "B" ? -15000 : FIXED_DEFAULTS[channel];
    stop.value = channel === "B" ? 0 : FIXED_DEFAULTS[channel];
    if (channel === "B") mode.value = "sweep";

    row.querySelector(".fixed-btn").addEventListener("click", () =>
      postAction("/api/fixed", { channel, value: readInt(fixed) })
    );
    row.querySelector(".direct-btn").addEventListener("click", () =>
      postAction("/api/direct", { channel, value: readInt(fixed) }, { showCurrent: true })
    );
    els.channelTable.appendChild(node);
  });
}

function renderZeroControls() {
  const template = document.getElementById("zeroTemplate");
  CHANNELS.forEach((channel) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".channel-name").textContent = channel;
    const input = node.querySelector(".zero-value");
    input.id = `zeroValue${channel}`;
    input.value = ZERO_DEFAULTS[channel];
    els.zeroGrid.appendChild(node);
  });
}

const ADC_CONFIG_FIELDS = [
  ["input", "adcInputSelect"],
  ["rate_hz", "adcRateInput"],
  ["oversample_n", "adcOversampleInput"],
  ["firmware_average_n", "adcFirmwareAverageInput"],
  ["settle_discard_n", "adcSettleDiscardInput"],
];

function bindAdcConfigDirtyTracking() {
  ADC_CONFIG_FIELDS.forEach(([key, elementId]) => {
    const element = els[elementId];
    if (!element) return;
    element.addEventListener("input", () => state.adcConfigDirty.add(key));
    element.addEventListener("change", () => state.adcConfigDirty.add(key));
  });
}

function shouldSyncAdcConfigField(key, element) {
  return !state.adcConfigDirty.has(key) && document.activeElement !== element;
}

function setAdcConfigField(key, element, value, options = {}) {
  if (!element) return;
  if (options.force || shouldSyncAdcConfigField(key, element)) {
    element.value = String(value);
  }
}

function syncAdcConfigInputsFromState(options = {}) {
  setAdcConfigField("input", els.adcInputSelect, state.adcInput, options);
  setAdcConfigField("rate_hz", els.adcRateInput, state.adcRateHz, options);
  setAdcConfigField("oversample_n", els.adcOversampleInput, state.adcOversampleN, options);
  setAdcConfigField("firmware_average_n", els.adcFirmwareAverageInput, state.adcFirmwareAverageN, options);
  setAdcConfigField("settle_discard_n", els.adcSettleDiscardInput, state.adcSettleDiscardN, options);
}

function clearAdcConfigDirty() {
  state.adcConfigDirty.clear();
  syncAdcConfigInputsFromState({ force: true });
}

function bindActions() {
  bindAdcConfigDirtyTracking();
  els.refreshPortsBtn.addEventListener("click", refreshPorts);
  els.connectBtn.addEventListener("click", async () => {
    state.lastLogId = 0;
    els.logBox.textContent = "";
    await postAction("/api/connect", {
      port: els.portSelect.value,
      baud: readInt(els.baudInput),
    });
  });
  els.disconnectBtn.addEventListener("click", () => postAction("/api/disconnect", {}));
  els.adcToggleBtn.addEventListener("click", () => postAction("/api/adc/toggle", {}, { showCurrent: true }));
  els.zeroVoltageBtn.addEventListener("click", () => postAction("/api/dac/zero-all", {}, { showCurrent: true }));
  els.clearBtn.addEventListener("click", () => postAction("/api/clear", {}, { showCurrent: true }));
  els.applyAdcConfigBtn.addEventListener("click", async () => {
    const ok = await postAction("/api/adc/config", {
      input: readInt(els.adcInputSelect),
      rate_hz: readInt(els.adcRateInput),
      oversample_n: readInt(els.adcOversampleInput),
      firmware_average_n: readInt(els.adcFirmwareAverageInput),
      settle_discard_n: readInt(els.adcSettleDiscardInput),
    });
    if (ok) clearAdcConfigDirty();
  });

  els.applyFixedBtn.addEventListener("click", () => {
    const values = {};
    CHANNELS.forEach((channel) => {
      values[channel] = readInt(getChannelRow(channel).querySelector(".channel-fixed"));
    });
    postAction("/api/direct-all", { values }, { showCurrent: true });
  });

  els.startSweepBtn.addEventListener("click", () => {
    postAction("/api/sweep/start", buildSweepConfig(), { showCurrent: true });
  });
  els.stopSweepBtn.addEventListener("click", () => postAction("/api/sweep/stop", {}));

  els.zeroCodeBtn.addEventListener("click", () => {
    const codes = {};
    CHANNELS.forEach((channel) => {
      codes[channel] = readInt(document.getElementById(`zeroValue${channel}`));
    });
    postAction("/api/zero-all", { codes }, { showCurrent: true });
  });

  els.manualForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const cmd = els.manualInput.value.trim();
    if (!cmd) return;
    els.manualInput.value = "";
    postAction("/api/command", { cmd, startNewBlock: true }, { showCurrent: true });
  });

  els.showCurrentBtn.addEventListener("click", () => {
    state.activeCurveIndex = null;
    state.activeSamples = null;
    state.activeTitle = "Current ADC";
    drawActivePlot();
    renderCurves();
  });
  els.plotAxisSelect.addEventListener("change", drawActivePlot);
  els.exportCurrentBtn.addEventListener("click", () => downloadExport("current"));
  els.exportCurvesBtn.addEventListener("click", () => downloadExport("curves"));
  els.exportRawLogBtn.addEventListener("click", () => downloadExport("raw-log"));

  if ("serial" in navigator) {
    navigator.serial.addEventListener("disconnect", (event) => {
      if (state.serial?.port === event.target) {
        appendLogRow("WARN", "Serial device disconnected");
        state.connected = false;
        state.adcRunning = false;
        state.sweepStopRequested = true;
        setDisconnectedUi();
      }
    });
  }
}

function buildSweepConfig() {
  const channels = {};
  CHANNELS.forEach((channel) => {
    const row = getChannelRow(channel);
    channels[channel] = {
      mode: row.querySelector(".channel-mode").value,
      fixed: readInt(row.querySelector(".channel-fixed")),
      start: readInt(row.querySelector(".channel-start")),
      stop: readInt(row.querySelector(".channel-stop")),
    };
  });
  return {
    channels,
    direction: els.sweepDirectionSelect.value,
    step_mv: readInt(els.sweepStepInput),
    delay_ms: readInt(els.sweepDelayInput),
    cycles: readInt(els.sweepCyclesInput),
    auto_adc: els.autoAdcCheckbox.checked,
  };
}

async function ensureTransport() {
  if (state.transportMode) return state.transportMode;
  const params = new URLSearchParams(window.location.search);
  const forced = (params.get("transport") || "").toLowerCase();
  if (forced === "serial" || forced === "webserial") {
    setTransportMode("webserial");
    return state.transportMode;
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (forced === "backend" || localHost) {
    try {
      await fetchJson("/api/status");
      setTransportMode("backend");
      return state.transportMode;
    } catch {
      if (forced === "backend") throw new Error("Local backend is unavailable.");
    }
  }

  setTransportMode("webserial");
  return state.transportMode;
}

function setTransportMode(mode) {
  state.transportMode = mode;
  if (mode === "backend") {
    els.runInfo.textContent = "Local backend UART web GUI";
  } else {
    els.runInfo.textContent = "Browser Web Serial UART web GUI";
  }
}

async function refreshPorts() {
  try {
    const mode = await ensureTransport();
    if (mode === "backend") {
      await refreshBackendPorts();
    } else {
      await refreshWebSerialPorts();
    }
  } catch (error) {
    setBackendMessage(error.message);
    setDisconnectedUi();
  }
}

async function refreshBackendPorts() {
  const data = await fetchJson("/api/ports");
  const selected = els.portSelect.value;
  els.portSelect.textContent = "";
  if (!data.ports.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = data.pyserial_available ? "No serial ports found" : "pyserial not installed";
    els.portSelect.appendChild(option);
  } else {
    data.ports.forEach((port) => {
      const option = document.createElement("option");
      option.value = port.device;
      option.textContent = `${port.device} ${port.description ? "- " + port.description : ""}`;
      els.portSelect.appendChild(option);
    });
    if (selected) els.portSelect.value = selected;
  }
  updateControlState();
}

async function refreshWebSerialPorts() {
  els.portSelect.textContent = "";
  state.webSerialPorts = [];
  if (!("serial" in navigator)) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Web Serial unsupported";
    els.portSelect.appendChild(option);
    els.runInfo.textContent = "Web Serial unavailable in this browser";
    updateControlState();
    return;
  }

  state.webSerialPorts = await navigator.serial.getPorts();
  state.webSerialPorts.forEach((port, index) => {
    const option = document.createElement("option");
    option.value = `granted:${index}`;
    option.textContent = describeSerialPort(port, `Granted port ${index + 1}`);
    els.portSelect.appendChild(option);
  });

  const requestOption = document.createElement("option");
  requestOption.value = "request-daplink";
  requestOption.textContent = "Click Connect to select DAPLink (C251:F001)...";
  els.portSelect.appendChild(requestOption);
  const anyOption = document.createElement("option");
  anyOption.value = "request-any";
  anyOption.textContent = "Click Connect to select any serial port...";
  els.portSelect.appendChild(anyOption);
  els.portSelect.value = state.webSerialPorts.length ? "granted:0" : "request-daplink";
  els.runInfo.textContent = state.webSerialPorts.length
    ? "Browser Web Serial UART web GUI"
    : "Click Connect, then choose USB Serial Device / DAPLink / COM6 in the browser prompt";
  updateControlState();
}

async function pollData(options = {}) {
  if (state.polling && !options.immediate) return;
  state.polling = true;
  try {
    const mode = await ensureTransport();
    let data;
    if (mode === "backend") {
      const query = state.lastLogId ? `?after_log=${state.lastLogId}` : "";
      data = await fetchJson(`/api/data${query}`);
    } else {
      data = createLocalSnapshot(true, state.lastLogId);
    }
    applySnapshot(data);
    if (state.activeCurveIndex === null) {
      state.samples = data.samples || state.samples || [];
      drawActivePlot();
    }
  } catch (error) {
    setBackendMessage(error.message);
    setDisconnectedUi();
  } finally {
    state.polling = false;
    window.setTimeout(() => pollData(), POLL_MS);
  }
}

async function postAction(path, body, options = {}) {
  try {
    const mode = await ensureTransport();
    let data;
    if (mode === "backend") {
      data = await fetchJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (options.showCurrent) {
        state.activeCurveIndex = null;
        state.activeSamples = null;
        state.activeTitle = "Current ADC";
      }
      applySnapshot(data);
      const full = await fetchJson(`/api/data?after_log=${state.lastLogId}`);
      applySnapshot(full);
      state.samples = full.samples || [];
    } else {
      data = await handleLocalAction(path, body, state.lastLogId);
      if (options.showCurrent) {
        state.activeCurveIndex = null;
        state.activeSamples = null;
        state.activeTitle = "Current ADC";
      }
      applySnapshot(data);
      state.samples = data.samples || state.samples || [];
    }
    drawActivePlot();
    return true;
  } catch (error) {
    appendLocalLog("ERROR", error.message);
    return false;
  }
}

async function fetchJson(path, options = {}) {
  const response = await fetch(path, options);
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.error || `${response.status} ${response.statusText}`);
  }
  return payload;
}

async function handleLocalAction(path, body, afterLogId = null) {
  switch (path) {
    case "/api/connect":
      await connectWebSerial(body);
      break;
    case "/api/disconnect":
      await disconnectWebSerial();
      break;
    case "/api/command":
      await sendSerialCommand(String(body.cmd || ""), { startNewBlock: Boolean(body.startNewBlock ?? true) });
      break;
    case "/api/adc/toggle":
      if (state.adcRunning) flushOversample();
      await sendSerialCommand("ADC", { startNewBlock: !state.adcRunning });
      state.adcRunning = !state.adcRunning;
      break;
    case "/api/adc/config":
      await setLocalAdcConfig(
        body.input,
        body.rate_hz,
        body.oversample_n,
        body.firmware_average_n,
        body.settle_discard_n
      );
      break;
    case "/api/direct":
      await sendDirect(body.channel, Number.parseInt(body.value, 10), true);
      break;
    case "/api/direct-all":
      await applyAllDirect(body.values || {});
      break;
    case "/api/dac/zero-all":
      await setAllZeroVoltage();
      break;
    case "/api/fixed":
      await setLocalFixed(body.channel, Number.parseInt(body.value, 10));
      break;
    case "/api/zero-all":
      await setAllZeroCodes(body.codes || {});
      break;
    case "/api/sweep/start":
      startLocalSweep(body);
      break;
    case "/api/sweep/stop":
      state.sweepStopRequested = true;
      appendLogRow("INFO", "Sweep stop requested");
      break;
    case "/api/clear":
      state.samples = [];
      state.currentSampleT0 = null;
      resetOversample();
      appendLogRow("INFO", "Current ADC data cleared");
      break;
    default:
      throw new Error("Unknown action.");
  }
  return createLocalSnapshot(true, afterLogId);
}

async function connectWebSerial(body) {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial is unavailable. Use Chrome or Edge over HTTPS.");
  }
  if (state.connected) return;

  const selected = String(body.port || els.portSelect.value || "request");
  let port = null;
  if (selected.startsWith("granted:")) {
    const index = Number.parseInt(selected.split(":")[1], 10);
    port = state.webSerialPorts[index] || null;
  }
  if (!port) {
    port = await requestWebSerialPort(selected === "request-any");
  }

  const baud = Math.max(1, Number.parseInt(body.baud, 10) || 230400);
  try {
    await port.open({ baudRate: baud, bufferSize: 1024 });
  } catch (error) {
    throw new Error(
      `Could not open serial port. Close other serial tools using COM6, then retry. (${error.message})`
    );
  }

  resetLocalRun(baud, describeSerialPort(port, "Web Serial port"));
  state.serial = {
    port,
    decoder: new TextDecoder(),
    encoder: new TextEncoder(),
    reader: null,
    readBuffer: "",
    readLoopPromise: null,
  };
  state.connected = true;
  state.portLabel = describeSerialPort(port, "Web Serial port");
  state.baud = baud;
  appendLogRow("INFO", `Connected to ${state.portLabel} @ ${baud} bps`);
  state.serial.readLoopPromise = readWebSerialLoop(port);
}

async function requestWebSerialPort(allowAny = false) {
  try {
    return allowAny ? await navigator.serial.requestPort() : await navigator.serial.requestPort({ filters: DAPLINK_FILTERS });
  } catch (error) {
    if (error?.name === "NotFoundError") {
      throw new Error(
        allowAny
          ? "No serial port was selected. Use Chrome/Edge, connect the board, then choose USB Serial Device / DAPLink / COM6 in the browser prompt."
          : "No DAPLink serial port was selected. If the prompt is empty, choose 'select any serial port' in the Port dropdown and retry."
      );
    }
    if (error?.name === "SecurityError") {
      throw new Error(
        "Serial permission was blocked by the browser. Open the app directly over HTTPS in Chrome/Edge, not inside an embedded frame."
      );
    }
    throw error;
  }
}

async function disconnectWebSerial() {
  state.sweepStopRequested = true;
  const serial = state.serial;
  if (!serial) {
    state.connected = false;
    return;
  }

  if (state.adcRunning) {
    try {
      flushOversample();
      await sendSerialCommand("ADC", { startNewBlock: false });
    } catch (error) {
      appendLogRow("WARN", `Could not stop ADC before disconnect: ${error.message}`);
    }
    state.adcRunning = false;
  }

  state.connected = false;
  if (serial.reader) {
    try {
      await serial.reader.cancel();
    } catch {
      // Ignore cancellation errors during shutdown.
    }
  }
  if (serial.readLoopPromise) {
    try {
      await serial.readLoopPromise;
    } catch {
      // Reader loop reports meaningful errors separately.
    }
  }
  try {
    await serial.port.close();
  } catch (error) {
    appendLogRow("WARN", `Serial close failed: ${error.message}`);
  }
  appendLogRow("INFO", "Disconnected");
  state.serial = null;
}

async function readWebSerialLoop(port) {
  const serial = state.serial;
  if (!serial || !port.readable) return;
  const reader = port.readable.getReader();
  serial.reader = reader;
  try {
    while (state.connected && state.serial?.port === port) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) processSerialBytes(value);
    }
  } catch (error) {
    if (state.connected) appendLogRow("ERROR", `Serial reader stopped: ${error.message}`);
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Ignore release errors after device removal.
    }
    if (state.serial?.reader === reader) state.serial.reader = null;
  }
}

function processSerialBytes(value) {
  if (!state.serial) return;
  state.serial.readBuffer += state.serial.decoder.decode(value, { stream: true });
  while (state.serial.readBuffer.includes("\n")) {
    const index = state.serial.readBuffer.indexOf("\n");
    const rawLine = state.serial.readBuffer.slice(0, index);
    state.serial.readBuffer = state.serial.readBuffer.slice(index + 1);
    handleRxLine(rawLine.replace(/\r/g, ""));
  }
}

function handleRxLine(line) {
  const text = line.trim();
  if (/^\d+$/.test(text)) {
    appendLogRow("RX", line, { display: false });
    const adcVal = Number.parseInt(text, 10);
    if (adcVal >= 0 && adcVal < 1 << ADC_BITS) {
      appendSample(adcVal);
      appendAdcLogSummary(adcVal);
    }
    return;
  }

  appendLogRow("RX", line);
  if (text === "") {
    storeScSegmentIfAny();
    return;
  }
}

async function sendSerialCommand(cmd, options = {}) {
  if (!state.connected || !state.serial?.port?.writable) {
    throw new Error("Serial port is not connected.");
  }
  const trimmed = String(cmd).trim();
  if (!trimmed) return;
  if (options.startNewBlock !== false) prepareNewCommandBlock(trimmed);

  const writer = state.serial.port.writable.getWriter();
  try {
    await writer.write(state.serial.encoder.encode(`${trimmed}\r`));
    appendLogRow("TX", trimmed);
  } finally {
    writer.releaseLock();
  }
}

function firmwareSamplePeriodMs() {
  return 1000 / Math.max(1, Number.parseInt(state.adcRateHz, 10) || DEFAULT_ADC_RATE_HZ);
}

function firmwareOutputPeriodMs() {
  return firmwareSamplePeriodMs() * Math.max(1, Number.parseInt(state.adcFirmwareAverageN, 10) || DEFAULT_ADC_FIRMWARE_AVERAGE_N);
}

function adcSettleDiscardMs() {
  return firmwareSamplePeriodMs() * Math.max(0, Number.parseInt(state.adcSettleDiscardN, 10) || 0);
}

function minimumSweepDwellMs() {
  const plotN = Math.max(1, Number.parseInt(state.adcOversampleN, 10) || DEFAULT_ADC_OVERSAMPLE_N);
  return Math.ceil(adcSettleDiscardMs() + firmwareOutputPeriodMs() * plotN + 8);
}

function markAdcSettling() {
  resetOversample();
  state.adcIgnoreUntilS = performance.now() / 1000 + (adcSettleDiscardMs() + firmwareOutputPeriodMs()) / 1000;
}

async function setLocalAdcConfig(input, rateHz, oversampleN, firmwareAverageN, settleDiscardN) {
  if (
    (input !== undefined && input !== null && input !== "") ||
    (rateHz !== undefined && rateHz !== null && rateHz !== "") ||
    (oversampleN !== undefined && oversampleN !== null && oversampleN !== "") ||
    (firmwareAverageN !== undefined && firmwareAverageN !== null && firmwareAverageN !== "") ||
    (settleDiscardN !== undefined && settleDiscardN !== null && settleDiscardN !== "")
  ) {
    flushOversample();
  }
  if (input !== undefined && input !== null && input !== "") {
    const adcInput = Number.parseInt(input, 10);
    if (adcInput < 0 || adcInput > 7) throw new Error("ADC input must be 0..7.");
    await sendSerialCommand(`AD${adcInput}`, { startNewBlock: false });
    state.adcInput = adcInput;
  }
  if (rateHz !== undefined && rateHz !== null && rateHz !== "") {
    let rate = Number.parseInt(rateHz, 10);
    if (rate < 1) throw new Error("ADC sample rate must be positive.");
    rate = Math.min(rate, 1000);
    await sendSerialCommand(`AR${rate}`, { startNewBlock: false });
    state.adcRateHz = rate;
  }
  if (oversampleN !== undefined && oversampleN !== null && oversampleN !== "") {
    let oversample = Number.parseInt(oversampleN, 10);
    if (oversample < 1) throw new Error("ADC oversampling must be positive.");
    oversample = Math.min(oversample, 1000);
    if (oversample !== state.adcOversampleN) {
      state.adcOversampleN = oversample;
      appendLogRow("INFO", `ADC plot oversampling set to x${oversample}`);
    }
  }
  if (firmwareAverageN !== undefined && firmwareAverageN !== null && firmwareAverageN !== "") {
    let firmwareAverage = Number.parseInt(firmwareAverageN, 10);
    if (firmwareAverage < 1) throw new Error("ADC firmware average must be positive.");
    firmwareAverage = Math.min(firmwareAverage, 256);
    await sendSerialCommand(`AA${firmwareAverage}`, { startNewBlock: false });
    state.adcFirmwareAverageN = firmwareAverage;
  }
  if (settleDiscardN !== undefined && settleDiscardN !== null && settleDiscardN !== "") {
    let settleDiscard = Number.parseInt(settleDiscardN, 10);
    if (settleDiscard < 0) throw new Error("ADC settle discard must be zero or positive.");
    settleDiscard = Math.min(settleDiscard, 1000);
    await sendSerialCommand(`AS${settleDiscard}`, { startNewBlock: false });
    state.adcSettleDiscardN = settleDiscard;
  }
}

async function setLocalFixed(channel, valueMv) {
  const ch = validateChannel(channel);
  state.fixedMv[ch] = valueMv;
  await sendSerialCommand(`F${ch}${valueMv}`);
}

async function sendDirect(channel, valueMv, startNewBlock = true) {
  const ch = validateChannel(channel);
  const value = Number.parseInt(valueMv, 10);
  if (startNewBlock) prepareNewCommandBlock(`D${ch}${value}`);
  else if (state.currentDacMv[ch] !== value) {
    flushOversample();
    markAdcSettling();
  }
  state.currentDacMv[ch] = value;
  await sendSerialCommand(`D${ch}${value}`, { startNewBlock: false });
}

async function applyAllDirect(values) {
  prepareNewCommandBlock("D_ALL");
  for (const channel of CHANNELS) {
    await sendDirect(channel, Number.parseInt(values[channel], 10), false);
    await sleep(20);
  }
}

async function setAllZeroVoltage() {
  prepareNewCommandBlock("D_ZERO_ALL");
  for (const channel of CHANNELS) {
    await sendDirect(channel, 0, false);
    await sleep(20);
  }
}

async function setAllZeroCodes(codes) {
  prepareNewCommandBlock("Z_ALL");
  for (const channel of CHANNELS) {
    const code = Number.parseInt(codes[channel], 10);
    if (code < 0 || code > 4095) throw new Error(`Zero code for ${channel} must be 0..4095.`);
    state.zeroCodes[channel] = code;
    await sendSerialCommand(`Z${channel}${code}`, { startNewBlock: false });
    await sleep(20);
  }
  for (const channel of CHANNELS) {
    await sendDirect(channel, 0, false);
    await sleep(20);
  }
}

function startLocalSweep(config) {
  if (state.sweepStatus.running) throw new Error("A sweep is already running.");
  const points = buildSweepPoints(config);
  if (!points.length) throw new Error("No sweep points were generated.");
  state.sweepStopRequested = false;
  state.sweepStatus = {
    running: true,
    label: "WEB_SWEEP",
    points_total: points.length,
    points_done: 0,
    error: null,
  };
  prepareNewCommandBlock("WEB_SWEEP");
  runLocalSweep(points, config);
}

async function runLocalSweep(points, config) {
  const requestedDelayMs = Math.max(0, Number.parseInt(config.delay_ms, 10) || 0);
  const autoAdc = Boolean(config.auto_adc);
  const minDelayMs = autoAdc ? minimumSweepDwellMs() : 0;
  const delayMs = Math.max(requestedDelayMs, minDelayMs);
  let startedAdc = false;
  const lastSent = { ...state.currentDacMv };
  let dacCommandsSent = 0;
  let dacCommandsSkipped = 0;
  try {
    if (autoAdc && !state.adcRunning) {
      await sendSerialCommand("ADC", { startNewBlock: false });
      state.adcRunning = true;
      startedAdc = true;
    }
    appendLogRow(
      "INFO",
      `WEB_SWEEP started, points=${points.length}, delay=${delayMs}ms, requested=${requestedDelayMs}ms, min=${minDelayMs}ms, changed-only DAC writes`
    );

    for (let idx = 0; idx < points.length; idx += 1) {
      if (state.sweepStopRequested) break;
      const point = points[idx];
      const changedChannels = CHANNELS.filter((channel) => lastSent[channel] !== point[channel]);
      dacCommandsSkipped += CHANNELS.length - changedChannels.length;
      for (const channel of changedChannels) {
        await sendDirect(channel, point[channel], false);
        lastSent[channel] = point[channel];
        dacCommandsSent += 1;
        await sleep(3);
      }
      state.sweepStatus.points_done = idx + 1;
      if (delayMs > 0) await sleep(delayMs);
    }

    if (startedAdc && state.adcRunning) {
      await sendSerialCommand("ADC", { startNewBlock: false });
      state.adcRunning = false;
    }
    storeCurrentCurveIfNeeded();
    state.sweepStatus.running = false;
    state.sweepStatus.error = null;
    appendLogRow("INFO", `WEB_SWEEP finished, DAC commands=${dacCommandsSent}, skipped=${dacCommandsSkipped}`);
  } catch (error) {
    state.sweepStatus.running = false;
    state.sweepStatus.error = error.message;
    appendLogRow("ERROR", `WEB_SWEEP failed: ${error.message}`);
  }
}

function buildSweepPoints(config) {
  const channelsCfg = config.channels || {};
  const stepMv = Math.max(1, Math.abs(Number.parseInt(config.step_mv, 10) || 100));
  const cycles = Math.max(1, Number.parseInt(config.cycles, 10) || 1);
  const direction = String(config.direction || "forward").toLowerCase();
  if (!["forward", "reverse", "roundtrip"].includes(direction)) {
    throw new Error("Sweep direction must be forward, reverse, or roundtrip.");
  }

  const normalized = {};
  let maxSpan = 0;
  CHANNELS.forEach((channel) => {
    const item = channelsCfg[channel] || {};
    const mode = String(item.mode || "fixed").toLowerCase();
    const fixed = Number.parseInt(item.fixed ?? state.fixedMv[channel], 10);
    let start = Number.parseInt(item.start ?? fixed, 10);
    let stop = Number.parseInt(item.stop ?? fixed, 10);
    if (mode !== "sweep") {
      start = fixed;
      stop = fixed;
    }
    maxSpan = Math.max(maxSpan, Math.abs(stop - start));
    normalized[channel] = { mode, fixed, start, stop };
  });

  const steps = Math.max(1, Math.ceil(maxSpan / stepMv));
  const forwardFracs = Array.from({ length: steps + 1 }, (_, idx) => idx / steps);
  let fracs;
  if (direction === "forward") fracs = forwardFracs;
  else if (direction === "reverse") fracs = [...forwardFracs].reverse();
  else fracs = forwardFracs.concat([...forwardFracs].reverse().slice(1));

  const points = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    fracs.forEach((frac) => {
      const point = {};
      CHANNELS.forEach((channel) => {
        const item = normalized[channel];
        point[channel] =
          item.mode === "sweep" ? Math.round(item.start + (item.stop - item.start) * frac) : item.fixed;
      });
      points.push(point);
    });
  }
  return points;
}

function resetLocalRun(baud, portLabel) {
  state.adcRunning = false;
  state.adcInput = Number.parseInt(els.adcInputSelect.value, 10) || 1;
  state.adcRateHz = Number.parseInt(els.adcRateInput.value, 10) || DEFAULT_ADC_RATE_HZ;
  state.adcOversampleN = Number.parseInt(els.adcOversampleInput.value, 10) || DEFAULT_ADC_OVERSAMPLE_N;
  state.adcFirmwareAverageN =
    Number.parseInt(els.adcFirmwareAverageInput.value, 10) || DEFAULT_ADC_FIRMWARE_AVERAGE_N;
  const settleDiscard = Number.parseInt(els.adcSettleDiscardInput.value, 10);
  state.adcSettleDiscardN = Number.isFinite(settleDiscard) ? settleDiscard : DEFAULT_ADC_SETTLE_DISCARD_N;
  state.adcOsBuffer = newOversampleBuffer();
  state.currentDacMv = { A: 0, B: 0, C: 0, D: 0 };
  state.fixedMv = { ...FIXED_DEFAULTS };
  state.zeroCodes = { ...ZERO_DEFAULTS };
  state.samples = [];
  state.curves = [];
  state.curveRecords = [];
  state.activeCurveIndex = null;
  state.activeSamples = null;
  state.activeTitle = "Current ADC";
  state.currentCommand = null;
  state.currentCommandTime = null;
  state.currentSampleT0 = null;
  state.scCycleCount = 0;
  state.logRows = [];
  state.rawLogRows = [];
  state.nextLogId = 1;
  state.lastLogId = 0;
  state.runId = makeRunId();
  state.runDir = null;
  state.portLabel = portLabel;
  state.baud = baud;
  state.sweepStatus = {
    running: false,
    label: null,
    points_total: 0,
    points_done: 0,
    error: null,
  };
}

function newOversampleBuffer() {
  return {
    count: 0,
    sum: 0,
    min: null,
    max: null,
    timestamp: null,
    time_s: null,
    dac: null,
  };
}

function resetOversample() {
  state.adcOsBuffer = newOversampleBuffer();
}

function appendSample(adcVal) {
  const now = performance.now() / 1000;
  if (now < state.adcIgnoreUntilS) return;
  if (state.currentSampleT0 === null) state.currentSampleT0 = now;
  const buffer = state.adcOsBuffer;
  if (buffer.count === 0) buffer.dac = { ...state.currentDacMv };
  buffer.count += 1;
  buffer.sum += adcVal;
  buffer.min = buffer.min === null ? adcVal : Math.min(buffer.min, adcVal);
  buffer.max = buffer.max === null ? adcVal : Math.max(buffer.max, adcVal);
  buffer.timestamp = new Date().toISOString();
  buffer.time_s = now - state.currentSampleT0;
  if (buffer.count >= Math.max(1, state.adcOversampleN)) flushOversample();
}

function flushOversample() {
  const buffer = state.adcOsBuffer;
  if (!buffer || buffer.count <= 0) return;
  const adcAvg = buffer.sum / buffer.count;
  state.samples.push({
    timestamp: buffer.timestamp || new Date().toISOString(),
    time_s: Number(buffer.time_s || 0),
    adc: adcAvg,
    adc_voltage: adcToVoltage(adcAvg),
    adc_raw_count: buffer.count,
    adc_raw_min: buffer.min,
    adc_raw_max: buffer.max,
    dac: { ...(buffer.dac || state.currentDacMv) },
  });
  resetOversample();
}

function prepareNewCommandBlock(label) {
  storeCurrentCurveIfNeeded();
  state.samples = [];
  state.currentSampleT0 = null;
  resetOversample();
  state.currentCommand = label;
  state.currentCommandTime = new Date();
  if (String(label).startsWith("SC")) state.scCycleCount = 0;
}

function storeCurrentCurveIfNeeded() {
  flushOversample();
  if (!state.samples.length || !state.currentCommand) return;
  state.curveRecords.push({
    cmd: state.currentCommand,
    sent_time: (state.currentCommandTime || new Date()).toISOString(),
    records: state.samples.map((record) => cloneRecord(record)),
  });
  appendLogRow("INFO", `Stored curve: ${state.currentCommand}, N=${state.samples.length}`);
}

function storeScSegmentIfAny() {
  if (state.currentCommand !== "SC") return;
  flushOversample();
  if (!state.samples.length) return;
  state.scCycleCount += 1;
  state.curveRecords.push({
    cmd: `SC_cycle${state.scCycleCount}`,
    sent_time: (state.currentCommandTime || new Date()).toISOString(),
    records: state.samples.map((record) => cloneRecord(record)),
  });
  appendLogRow("INFO", `Stored SC curve #${state.scCycleCount} (N=${state.samples.length})`);
  state.samples = [];
  state.currentSampleT0 = null;
  resetOversample();
}

function createLocalSnapshot(includeSamples = true, afterLogId = null) {
  let logs = state.logRows;
  if (afterLogId !== null && afterLogId !== undefined) {
    logs = logs.filter((row) => row.id > afterLogId);
  }
  const payload = {
    version: APP_VERSION,
    web_serial_available: "serial" in navigator,
    connected: state.connected,
    port: state.portLabel,
    baud: state.baud,
    adc_running: state.adcRunning,
    adc_input: state.adcInput,
    adc_rate_hz: state.adcRateHz,
    adc_oversample_n: state.adcOversampleN,
    adc_firmware_average_n: state.adcFirmwareAverageN,
    adc_settle_discard_n: state.adcSettleDiscardN,
    current_dac_mv: { ...state.currentDacMv },
    fixed_mv: { ...state.fixedMv },
    zero_codes: { ...state.zeroCodes },
    current_command: state.currentCommand,
    run_id: state.runId,
    run_dir: state.runDir,
    adc_bits: ADC_BITS,
    vref: ADC_VREF,
    gain: ADC_GAIN,
    stats: statsForRecords(state.samples),
    curves: localCurveMetadata(),
    sweep: { ...state.sweepStatus },
    logs,
    last_log_id: state.logRows.length ? state.logRows[state.logRows.length - 1].id : 0,
    defaults: {
      channels: [...CHANNELS],
      fixed_mv: { ...FIXED_DEFAULTS },
      zero_code: { ...ZERO_DEFAULTS },
      baud: 230400,
      adc_input: 1,
      adc_rate_hz: DEFAULT_ADC_RATE_HZ,
      adc_oversample_n: DEFAULT_ADC_OVERSAMPLE_N,
      adc_firmware_average_n: DEFAULT_ADC_FIRMWARE_AVERAGE_N,
      adc_settle_discard_n: DEFAULT_ADC_SETTLE_DISCARD_N,
    },
  };
  if (includeSamples) payload.samples = state.samples.map((record) => cloneRecord(record));
  return payload;
}

function localCurveMetadata() {
  return state.curveRecords.map((curve, index) => {
    const stats = statsForRecords(curve.records);
    return {
      index,
      cmd: curve.cmd,
      sent_time: curve.sent_time,
      num_samples: curve.records.length,
      last: stats.last,
      min: stats.min,
      max: stats.max,
    };
  });
}

function appendAdcLogSummary(adcVal) {
  const now = performance.now() / 1000;
  state.adcDisplayLogCount += 1;
  if (now - state.adcDisplayLogLastS < 1) return;
  appendLogRow("RX", `ADC samples +${state.adcDisplayLogCount}, last=${adcVal}`, { raw: false });
  state.adcDisplayLogCount = 0;
  state.adcDisplayLogLastS = now;
}

function appendLogRow(direction, text, options = {}) {
  const raw = options.raw !== false;
  const display = options.display !== false;
  const row = {
    id: state.nextLogId,
    time: new Date().toISOString(),
    direction,
    text: String(text),
  };
  state.nextLogId += 1;
  if (raw) state.rawLogRows.push({ ...row });
  if (display) {
    state.logRows.push(row);
    if (state.logRows.length > MAX_LOG_ROWS) {
      state.logRows.splice(0, state.logRows.length - MAX_LOG_ROWS);
    }
  }
}

function applySnapshot(data) {
  state.connected = Boolean(data.connected);
  state.adcRunning = Boolean(data.adc_running);
  state.sweepRunning = Boolean(data.sweep?.running);
  state.curves = Array.isArray(data.curves) ? data.curves : [];
  if (data.last_log_id !== undefined) state.lastLogId = data.last_log_id;
  if (data.adc_input !== undefined) {
    state.adcInput = Number.parseInt(data.adc_input, 10);
    setAdcConfigField("input", els.adcInputSelect, state.adcInput);
  }
  if (data.adc_rate_hz !== undefined) {
    state.adcRateHz = Number.parseInt(data.adc_rate_hz, 10);
    setAdcConfigField("rate_hz", els.adcRateInput, state.adcRateHz);
  }
  if (data.adc_oversample_n !== undefined) {
    state.adcOversampleN = Number.parseInt(data.adc_oversample_n, 10) || DEFAULT_ADC_OVERSAMPLE_N;
    setAdcConfigField("oversample_n", els.adcOversampleInput, state.adcOversampleN);
  }
  if (data.adc_firmware_average_n !== undefined) {
    state.adcFirmwareAverageN =
      Number.parseInt(data.adc_firmware_average_n, 10) || DEFAULT_ADC_FIRMWARE_AVERAGE_N;
    setAdcConfigField("firmware_average_n", els.adcFirmwareAverageInput, state.adcFirmwareAverageN);
  }
  if (data.adc_settle_discard_n !== undefined) {
    const settleDiscard = Number.parseInt(data.adc_settle_discard_n, 10);
    state.adcSettleDiscardN = Number.isFinite(settleDiscard) ? settleDiscard : DEFAULT_ADC_SETTLE_DISCARD_N;
    setAdcConfigField("settle_discard_n", els.adcSettleDiscardInput, state.adcSettleDiscardN);
  }
  updateBadges(data);
  updateSweepProgress(data.sweep || {});
  updateControlState();
  appendLogs(data.logs || []);
  renderCurves();
  if (data.run_id) {
    const prefix = state.transportMode === "webserial" ? "Browser Web Serial" : "Run";
    els.runInfo.textContent = data.run_dir ? `${prefix} ${data.run_id} | ${data.run_dir}` : `${prefix} ${data.run_id}`;
  } else {
    els.runInfo.textContent = state.transportMode === "webserial" ? "Browser Web Serial UART web GUI" : "Local UART web GUI";
  }
}

function updateBadges(data) {
  els.connectionBadge.textContent = state.connected ? `Connected ${data.port || ""} @ ${data.baud || ""}` : "Disconnected";
  els.connectionBadge.className = `badge ${state.connected ? "badge-ok" : "badge-idle"}`;
  const adcInput = data.adc_input ?? state.adcInput ?? "";
  const adcRate = data.adc_rate_hz ?? state.adcRateHz ?? "";
  const adcOversample = data.adc_oversample_n ?? state.adcOversampleN ?? DEFAULT_ADC_OVERSAMPLE_N;
  const firmwareAverage =
    data.adc_firmware_average_n ?? state.adcFirmwareAverageN ?? DEFAULT_ADC_FIRMWARE_AVERAGE_N;
  const settleDiscard = data.adc_settle_discard_n ?? state.adcSettleDiscardN ?? DEFAULT_ADC_SETTLE_DISCARD_N;
  els.adcBadge.textContent = state.adcRunning
    ? `ADC ${adcInput} @ ${adcRate} Hz | FW x${firmwareAverage} | plot x${adcOversample} | settle ${settleDiscard}`
    : "ADC idle";
  els.adcBadge.className = `badge ${state.adcRunning ? "badge-warn" : "badge-idle"}`;
  els.sweepBadge.textContent = state.sweepRunning ? "Sweep running" : "Sweep idle";
  els.sweepBadge.className = `badge ${state.sweepRunning ? "badge-warn" : "badge-idle"}`;
  els.adcToggleBtn.textContent = state.adcRunning ? "Stop ADC" : "Start ADC";
}

function updateSweepProgress(sweep) {
  if (!sweep.running && !sweep.points_total) {
    els.sweepProgress.textContent = "No sweep running";
    return;
  }
  const done = sweep.points_done || 0;
  const total = sweep.points_total || 0;
  const suffix = sweep.error ? ` | ${sweep.error}` : "";
  els.sweepProgress.textContent = `${sweep.label || "Sweep"}: ${done}/${total}${suffix}`;
}

function updateControlState() {
  const connected = state.connected;
  els.connectBtn.disabled = connected || !els.portSelect.value;
  els.disconnectBtn.disabled = !connected;
  [
    els.adcToggleBtn,
    els.zeroVoltageBtn,
    els.clearBtn,
    els.applyAdcConfigBtn,
    els.applyFixedBtn,
    els.startSweepBtn,
    els.stopSweepBtn,
    els.zeroCodeBtn,
    els.manualForm.querySelector("button"),
  ].forEach((button) => {
    button.disabled = !connected;
  });
  els.startSweepBtn.disabled = !connected || state.sweepRunning;
  els.stopSweepBtn.disabled = !connected || !state.sweepRunning;
  document.querySelectorAll(".fixed-btn, .direct-btn").forEach((button) => {
    button.disabled = !connected;
  });
}

function setDisconnectedUi() {
  state.connected = false;
  state.adcRunning = false;
  state.sweepRunning = false;
  updateBadges({});
  updateControlState();
}

function appendLogs(logs) {
  if (!logs.length) return;
  const wasAtBottom = els.logBox.scrollTop + els.logBox.clientHeight >= els.logBox.scrollHeight - 12;
  const text = logs
    .map((row) => `[${String(row.time || "").replace("T", " ").replace("Z", "")}] ${row.direction}: ${row.text}`)
    .join("\n");
  els.logBox.textContent += `${els.logBox.textContent ? "\n" : ""}${text}`;
  els.lastLogId.textContent = `log ${state.lastLogId}`;
  if (wasAtBottom) els.logBox.scrollTop = els.logBox.scrollHeight;
}

function appendLocalLog(direction, text) {
  appendLogs([{ time: new Date().toISOString(), direction, text }]);
}

function renderCurves() {
  els.curveCount.textContent = `${state.curves.length} curves`;
  els.curveList.textContent = "";
  if (!state.curves.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "10px";
    empty.textContent = "No stored curves";
    els.curveList.appendChild(empty);
    return;
  }
  state.curves.forEach((curve) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `curve-row ${state.activeCurveIndex === curve.index ? "active" : ""}`;
    button.textContent = `${curve.index + 1}: ${curve.cmd} | N=${curve.num_samples}`;
    button.addEventListener("click", () => loadCurve(curve.index));
    els.curveList.appendChild(button);
  });
}

async function loadCurve(index) {
  try {
    if (state.transportMode === "backend") {
      const curve = await fetchJson(`/api/curve?index=${encodeURIComponent(index)}`);
      state.activeSamples = curve.samples || [];
      state.activeTitle = `Curve ${index + 1}: ${curve.cmd}`;
    } else {
      const curve = state.curveRecords[index];
      if (!curve) throw new Error("Curve index is out of range.");
      state.activeSamples = curve.records.map((record) => cloneRecord(record));
      state.activeTitle = `Curve ${index + 1}: ${curve.cmd}`;
    }
    state.activeCurveIndex = index;
    renderCurves();
    drawActivePlot();
  } catch (error) {
    appendLocalLog("ERROR", error.message);
  }
}

function drawActivePlot() {
  const samples = state.activeCurveIndex === null ? state.samples : state.activeSamples || [];
  const title = state.activeCurveIndex === null ? "Current ADC" : state.activeTitle;
  drawPlot(samples, title, els.plotAxisSelect.value);
}

function drawPlot(samples, title, axis) {
  const canvas = els.adcCanvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(520, Math.floor(rect.width * dpr));
  const height = Math.max(280, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const cssWidth = width / dpr;
  const cssHeight = height / dpr;
  const left = 62;
  const right = 18;
  const top = 20;
  const bottom = 42;
  const plotW = cssWidth - left - right;
  const plotH = cssHeight - top - bottom;

  ctx.fillStyle = "#fbfcfe";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.strokeStyle = "#d8e1eb";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, plotW, plotH);

  const points = samples
    .map((record) => ({
      x: axis === "time" ? Number(record.time_s || 0) : Number(record.dac?.[axis] ?? 0),
      y: Number(record.adc),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  ctx.font = "12px Consolas, monospace";
  ctx.fillStyle = "#64717f";
  ctx.textAlign = "left";
  ctx.fillText(axis === "time" ? "time (s)" : `DAC ${axis} (mV)`, left, cssHeight - 10);
  ctx.save();
  ctx.translate(14, top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("ADC count", 0, 0);
  ctx.restore();

  if (!points.length) {
    ctx.fillStyle = "#64717f";
    ctx.textAlign = "center";
    ctx.fillText("No ADC samples", left + plotW / 2, top + plotH / 2);
    ctx.restore();
    els.plotTitle.textContent = title;
    els.statsLine.textContent = "Samples: 0 | Last: - | Min: - | Max: -";
    return;
  }

  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const yMinRaw = Math.min(...points.map((p) => p.y));
  const yMaxRaw = Math.max(...points.map((p) => p.y));
  const yPad = Math.max(10, (yMaxRaw - yMinRaw || 1) * 0.08);
  const yMin = Math.max(0, yMinRaw - yPad);
  const yMax = Math.min(16383, yMaxRaw + yPad);
  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1, yMax - yMin);

  ctx.strokeStyle = "#edf2f7";
  ctx.beginPath();
  for (let i = 1; i < 5; i += 1) {
    const y = top + (plotH * i) / 5;
    ctx.moveTo(left, y);
    ctx.lineTo(left + plotW, y);
  }
  ctx.stroke();

  ctx.strokeStyle = "#1f6feb";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  const maxPoints = 4000;
  const step = Math.max(1, Math.floor(points.length / maxPoints));
  let first = true;
  for (let i = 0; i < points.length; i += step) {
    const point = points[i];
    const x = left + ((point.x - xMin) / xSpan) * plotW;
    const y = top + plotH - ((point.y - yMin) / ySpan) * plotH;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.fillStyle = "#16202a";
  ctx.textAlign = "right";
  ctx.fillText(String(Math.round(yMax)), left - 8, top + 4);
  ctx.fillText(String(Math.round(yMin)), left - 8, top + plotH);
  ctx.textAlign = "left";
  ctx.fillText(formatAxisValue(xMin, axis), left, top + plotH + 18);
  ctx.textAlign = "right";
  ctx.fillText(formatAxisValue(xMax, axis), left + plotW, top + plotH + 18);
  ctx.restore();

  els.plotTitle.textContent = title;
  els.statsLine.textContent = formatStats(samples);
}

async function downloadExport(kind) {
  try {
    if (state.transportMode === "backend") {
      const paths = {
        current: ["/api/export/current.csv", "current_adc_with_dac.csv"],
        curves: ["/api/export/curves.csv", "stored_curves_with_dac.csv"],
        "raw-log": ["/api/export/raw-log.csv", "raw_uart_log.csv"],
      };
      const [path, filename] = paths[kind];
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      downloadText(filename, await response.text(), "text/csv;charset=utf-8");
      return;
    }

    if (kind === "current") {
      flushOversample();
      drawActivePlot();
      downloadText("current_adc_with_dac.csv", recordsToCsv(state.samples), "text/csv;charset=utf-8");
    } else if (kind === "curves") downloadText("stored_curves_with_dac.csv", curvesToCsv(), "text/csv;charset=utf-8");
    else downloadText("raw_uart_log.csv", rawLogToCsv(), "text/csv;charset=utf-8");
  } catch (error) {
    appendLocalLog("ERROR", error.message);
  }
}

function recordsToCsv(records) {
  const rows = [
    [
      "timestamp",
      "time_s",
      "adc_count_avg",
      "adc_voltage",
      "adc_raw_count",
      "adc_raw_min",
      "adc_raw_max",
      "dac_A_mv",
      "dac_B_mv",
      "dac_C_mv",
      "dac_D_mv",
    ],
  ];
  records.forEach((record) => {
    rows.push(recordToCsvRow(record));
  });
  return toCsv(rows);
}

function curvesToCsv() {
  const rows = [
    [
      "curve_index",
      "cmd",
      "sent_time",
      "sample_index",
      "timestamp",
      "time_s",
      "adc_count_avg",
      "adc_voltage",
      "adc_raw_count",
      "adc_raw_min",
      "adc_raw_max",
      "dac_A_mv",
      "dac_B_mv",
      "dac_C_mv",
      "dac_D_mv",
    ],
  ];
  state.curveRecords.forEach((curve, curveIndex) => {
    curve.records.forEach((record, sampleIndex) => {
      rows.push([curveIndex + 1, curve.cmd, curve.sent_time, sampleIndex, ...recordToCsvRow(record)]);
    });
  });
  return toCsv(rows);
}

function rawLogToCsv() {
  const rows = [["wall_time_iso", "direction", "text"]];
  state.rawLogRows.forEach((row) => rows.push([row.time, row.direction, row.text]));
  return toCsv(rows);
}

function recordToCsvRow(record) {
  const dac = record.dac || {};
  return [
    record.timestamp || "",
    Number(record.time_s || 0).toFixed(6),
    Number(record.adc ?? 0).toFixed(6),
    Number(record.adc_voltage || 0).toFixed(9),
    record.adc_raw_count ?? 1,
    record.adc_raw_min ?? record.adc ?? "",
    record.adc_raw_max ?? record.adc ?? "",
    dac.A ?? "",
    dac.B ?? "",
    dac.C ?? "",
    dac.D ?? "",
  ];
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatAxisValue(value, axis) {
  if (axis === "time") return Number(value).toFixed(2);
  return String(Math.round(value));
}

function formatStats(samples) {
  if (!samples.length) return "Samples: 0 | Last: - | Min: - | Max: -";
  const values = samples.map((record) => Number(record.adc)).filter(Number.isFinite);
  if (!values.length) return "Samples: 0 | Last: - | Min: - | Max: -";
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return [
    `Samples: ${values.length}`,
    `Last: ${formatAdcCount(last)} (${adcToVoltage(last).toFixed(3)} V)`,
    `Min: ${formatAdcCount(min)} (${adcToVoltage(min).toFixed(3)} V)`,
    `Max: ${formatAdcCount(max)} (${adcToVoltage(max).toFixed(3)} V)`,
  ].join(" | ");
}

function formatAdcCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function statsForRecords(records) {
  const values = records.map((record) => Number(record.adc)).filter(Number.isFinite);
  if (!values.length) {
    return { samples: 0, last: null, min: null, max: null, last_voltage: null, min_voltage: null, max_voltage: null };
  }
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    samples: values.length,
    last,
    min,
    max,
    last_voltage: adcToVoltage(last),
    min_voltage: adcToVoltage(min),
    max_voltage: adcToVoltage(max),
  };
}

function adcToVoltage(adc) {
  return (adc / ((1 << ADC_BITS) - 1)) * ADC_VREF / ADC_GAIN;
}

function readInt(input) {
  const value = Number.parseInt(input.value, 10);
  if (!Number.isFinite(value)) throw new Error(`Invalid integer: ${input.value}`);
  return value;
}

function getChannelRow(channel) {
  return document.querySelector(`.channel-row[data-channel="${channel}"]`);
}

function validateChannel(channel) {
  const ch = String(channel || "").trim().toUpperCase();
  if (!CHANNELS.includes(ch)) throw new Error("Channel must be A, B, C, or D.");
  return ch;
}

function setBackendMessage(message) {
  if (message) els.runInfo.textContent = message;
}

function describeSerialPort(port, fallback) {
  try {
    const info = port.getInfo();
    const vendor = info.usbVendorId !== undefined ? info.usbVendorId.toString(16).padStart(4, "0").toUpperCase() : null;
    const product = info.usbProductId !== undefined ? info.usbProductId.toString(16).padStart(4, "0").toUpperCase() : null;
    if (vendor && product) return `USB ${vendor}:${product}`;
  } catch {
    // Fall through to fallback.
  }
  return fallback;
}

function cloneRecord(record) {
  return {
    ...record,
    dac: { ...(record.dac || {}) },
  };
}

function makeRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
