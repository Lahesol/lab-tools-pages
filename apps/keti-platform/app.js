const MAX_POINTS = 900;
const MAX_TABLE_ROWS = 80;
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
  samples: [],
  records: [],
  tableRows: [],
  lastRateCheckTime: performance.now(),
  lastRateCheckCount: 0,
  receivedSamples: 0,
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
  rawMetric: document.getElementById("rawMetric"),
  filteredMetric: document.getElementById("filteredMetric"),
  voltageMetric: document.getElementById("voltageMetric"),
  rateMetric: document.getElementById("rateMetric"),
  filterState: document.getElementById("filterState"),
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

  if (line.startsWith("DATA,")) {
    const sample = parseDataLine(line);
    if (sample) {
      addSample(sample);
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

function parseStatus(line) {
  const tokens = line.split(",").slice(1);
  for (const token of tokens) {
    const [key, value] = token.split("=");
    if (key === "streaming") {
      state.streaming = value === "1";
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

  updateMetrics(sample);
  updateTable();
  updateRateMetric();
  drawPlot();
  setUiEnabled();
}

function updateMetrics(sample) {
  el.sampleCount.textContent = `${state.receivedSamples} samples`;
  el.recordCount.textContent = `${state.records.length} rows`;
  el.rawMetric.textContent = sample.raw.toFixed(0);
  el.filteredMetric.textContent = sample.filtered.toFixed(1);
  el.voltageMetric.textContent = `${sample.millivolts.toFixed(1)} mV`;
  el.plotMeta.textContent = `A${sample.channel} - ${state.settings.filter} - seq ${sample.seq}`;
  el.lastTimestamp.textContent = `${sample.micros} us`;
}

function updateRateMetric() {
  const now = performance.now();
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

function clearData() {
  state.samples = [];
  state.records = [];
  state.tableRows = [];
  state.receivedSamples = 0;
  state.lastRateCheckCount = 0;
  state.lastRateCheckTime = performance.now();
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
  el.startButton.addEventListener("click", async () => {
    await applyAcquisition();
    await applyFilter();
    await sendCommand("START");
  });
  el.stopButton.addEventListener("click", () => sendCommand("STOP"));
  el.applyAcquisitionButton.addEventListener("click", applyAcquisition);
  el.applyFilterButton.addEventListener("click", applyFilter);
  el.pingButton.addEventListener("click", () => sendCommand("PING"));
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
  drawPlot();
  loadDirectFirmwareManifest();
  checkFlashHelper();
}

init();
