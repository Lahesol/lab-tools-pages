const MAX_POINTS = 900;
const MAX_IMU_POINTS = 900;
const MAX_TABLE_ROWS = 80;
const RENDER_INTERVAL_MS = 33;
const TABLE_RENDER_INTERVAL_MS = 150;
const DEFAULT_PREBUILT_FIRMWARES = [
  {
    id: "stage1_lab_console",
    version: "0.1.0",
    board: "Arduino Nano 33 BLE Rev2",
    fqbn: "arduino:mbed_nano:nano33ble",
    file: "stage1_lab_console_v0.1.0.bin",
    size_bytes: 98320,
    sha256: "BC47685554FBA841EB633315B465FF1FE98A0829A5E429E2BCB76269E534741C"
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
  records: [],
  tableRows: [],
  latestSample: null,
  latestImu: null,
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
    window: 8
  },
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
  labelInput: document.getElementById("labelInput"),
  showRawToggle: document.getElementById("showRawToggle"),
  showFilteredToggle: document.getElementById("showFilteredToggle"),
  autoScaleToggle: document.getElementById("autoScaleToggle"),
  signalCanvas: document.getElementById("signalCanvas"),
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
  lastTimestamp: document.getElementById("lastTimestamp")
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
  el.refreshPortsButton.disabled = !state.flash.helperOnline || state.flash.helperBusy;
  el.flashButton.disabled = !state.flash.helperOnline || state.flash.helperBusy;
  el.helperCheckButton.disabled = state.flash.helperBusy;
  el.bootloaderButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.directFlashButton.disabled = !("serial" in navigator) || state.flash.directBusy;
  el.directBinInput.disabled = state.flash.directBusy;

  el.recordButton.textContent = state.recording ? "Stop Rec" : "Record";
  el.flashButton.textContent = state.flash.helperBusy ? "Flashing..." : "Flash Firmware";
  el.directFlashButton.textContent = state.flash.directBusy ? "Flashing..." : "Direct Flash";
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
  if (!line.startsWith("DATA,")) {
    logLine(line);
  }

  if (line.startsWith("ERR,EI_ACCEL_MODEL_REQUIRED")) {
    state.classification.active = false;
    el.classificationState.textContent = "Model missing";
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
    state.records.push({ ...sample, label: el.labelInput.value.trim() || "unlabeled" });
  }

  state.tableRows.unshift(sample);
  if (state.tableRows.length > MAX_TABLE_ROWS) {
    state.tableRows.pop();
  }

  state.latestSample = sample;
  scheduleUiRender();
}

function addImuSample(sample) {
  state.imuSamples.push(sample);
  if (state.imuSamples.length > MAX_IMU_POINTS) {
    state.imuSamples.shift();
  }
  state.receivedImuSamples++;
  state.latestImu = sample;
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
  drawPlot();
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

  if (!state.latestSample) {
    return;
  }

  updateCurrentMetrics();
  updateRateMetric(now);

  if (now - state.lastTableRenderTime >= TABLE_RENDER_INTERVAL_MS) {
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
  el.metric1Label.textContent = "Accel X";
  el.metric2Label.textContent = "Accel Y";
  el.metric3Label.textContent = "Accel Z";
  el.metric4Label.textContent = "IMU Rate";
  el.sampleCount.textContent = `${state.receivedImuSamples} IMU`;
  el.rawMetric.textContent = `${sample.ax.toFixed(3)} g`;
  el.filteredMetric.textContent = `${sample.ay.toFixed(3)} g`;
  el.voltageMetric.textContent = `${sample.az.toFixed(3)} g`;
  el.plotMeta.textContent = `IMU accel/gyro/mag - seq ${sample.seq}`;
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
  const samples = state.imuSamples;
  if (samples.length < 2) {
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
  const values = samples.flatMap((sample) => axes.map((axis) => sample[axis.key]));
  const maxAbs = Math.max(0.25, ...values.map((value) => Math.abs(value)));
  const minY = -maxAbs;
  const maxY = maxAbs;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  drawGrid(width, height, pad, plotWidth, plotHeight);

  for (const axis of axes) {
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = pad.left + (plotWidth * index) / Math.max(1, samples.length - 1);
      const normalized = (sample[axis.key] - minY) / (maxY - minY);
      const y = pad.top + plotHeight - normalized * plotHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  drawLegend(axes, pad.left + 8, pad.top + 18);
}

function drawImuPlanarPlot() {
  const samples = state.imuSamples;
  if (samples.length < 2) {
    drawEmptyPlot("Waiting for IMU data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const pad = { left: 32, right: 32, top: 24, bottom: 32 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const centerX = pad.left + plotWidth / 2;
  const centerY = pad.top + plotHeight / 2;
  const scale = Math.min(plotWidth, plotHeight) / 2;
  const maxAbs = Math.max(0.25, ...samples.flatMap((sample) => [Math.abs(sample.ax), Math.abs(sample.ay)]));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d7dee8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, centerY);
  ctx.lineTo(width - pad.right, centerY);
  ctx.moveTo(centerX, pad.top);
  ctx.lineTo(centerX, height - pad.bottom);
  ctx.stroke();
  ctx.strokeStyle = "#bdc8d5";
  ctx.strokeRect(pad.left, pad.top, plotWidth, plotHeight);

  ctx.strokeStyle = "#008c8c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = centerX + (sample.ax / maxAbs) * scale * 0.92;
    const y = centerY - (sample.ay / maxAbs) * scale * 0.92;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  const latest = samples[samples.length - 1];
  const latestX = centerX + (latest.ax / maxAbs) * scale * 0.92;
  const latestY = centerY - (latest.ay / maxAbs) * scale * 0.92;
  ctx.fillStyle = "#d28a00";
  ctx.beginPath();
  ctx.arc(latestX, latestY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#637083";
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  ctx.fillText("ax", width - pad.right - 18, centerY - 8);
  ctx.fillText("ay", centerX + 8, pad.top + 14);
}

function drawImu3dPlot() {
  const samples = state.imuSamples;
  if (samples.length < 2) {
    drawEmptyPlot("Waiting for IMU data");
    return;
  }

  const { width, height } = resizeCanvasToDisplaySize();
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) * 0.34;
  const maxAbs = Math.max(0.25, ...samples.flatMap((sample) => [Math.abs(sample.ax), Math.abs(sample.ay), Math.abs(sample.az)]));

  function project(x, y, z) {
    const nx = x / maxAbs;
    const ny = y / maxAbs;
    const nz = z / maxAbs;
    return {
      x: centerX + (nx - ny) * scale * 0.72,
      y: centerY + (nx + ny) * scale * 0.36 - nz * scale * 0.82
    };
  }

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);

  const axes = [
    { end: project(maxAbs, 0, 0), color: "#008c8c", label: "x" },
    { end: project(0, maxAbs, 0), color: "#d28a00", label: "y" },
    { end: project(0, 0, maxAbs), color: "#2767c9", label: "z" }
  ];
  for (const axis of axes) {
    ctx.strokeStyle = axis.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(axis.end.x, axis.end.y);
    ctx.stroke();
    ctx.fillStyle = axis.color;
    ctx.font = "12px Segoe UI, Arial, sans-serif";
    ctx.fillText(axis.label, axis.end.x + 5, axis.end.y);
  }

  ctx.strokeStyle = "#14242b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const point = project(sample.ax, sample.ay, sample.az);
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();

  const latest = samples[samples.length - 1];
  const point = project(latest.ax, latest.ay, latest.az);
  ctx.fillStyle = "#d28a00";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawClassificationPlot() {
  const scores = [...(state.classification.scores || [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  if (scores.length === 0) {
    drawEmptyPlot("Waiting for classification results");
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

  await sendCommand(`FILTER ${state.settings.filter}`);
  await sendCommand(`ALPHA ${state.settings.alpha.toFixed(3)}`);
  await sendCommand(`WINDOW ${Math.round(state.settings.window)}`);
  el.filterState.textContent = state.settings.filter;
}

async function startStreaming() {
  if (state.activeView !== "adc") {
    state.settings.rateHz = normalizeNumber(el.rateInput.value, 63, 1, 200);
    await sendCommand(`RATE ${state.settings.rateHz}`);
    await sendCommand("START");
    return;
  }

  await applyAcquisition();
  await applyFilter();
  await sendCommand("START");
}

function clearData() {
  state.samples = [];
  state.imuSamples = [];
  state.records = [];
  state.tableRows = [];
  state.latestSample = null;
  state.latestImu = null;
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
  const header = "label,seq,micros,channel,raw,millivolts,filtered,received_at_iso\n";
  const rows = state.records.map((row) => [
    csvCell(row.label),
    row.seq,
    row.micros,
    `A${row.channel}`,
    row.raw,
    row.millivolts.toFixed(3),
    row.filtered.toFixed(3),
    new Date(row.receivedAt).toISOString()
  ].join(","));
  const blob = new Blob([header, rows.join("\n"), "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `keti_stage1_adc_${stamp}.csv`;
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
  el.stopButton.addEventListener("click", () => sendCommand("STOP"));
  el.applyAcquisitionButton.addEventListener("click", applyAcquisition);
  el.applyFilterButton.addEventListener("click", applyFilter);
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
}

function init() {
  if ("serial" in navigator) {
    setStatus(el.browserStatus, "Web Serial ready", "");
  } else {
    setStatus(el.browserStatus, "Web Serial unavailable", "error");
  }
  populateFirmwareSelect(DEFAULT_PREBUILT_FIRMWARES);
  bindEvents();
  setUiEnabled();
  renderClassification();
  drawPlot();
  loadDirectFirmwareManifest();
  checkFlashHelper();
}

init();
