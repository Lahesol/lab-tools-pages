const els = {
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
  channelMode: document.querySelector("#channelMode"),
  adcPlotMode: document.querySelector("#adcPlotMode"),
  autoScale: document.querySelector("#autoScale"),
  manualScale: document.querySelector("#manualScale"),
  yMin: document.querySelector("#yMin"),
  yMax: document.querySelector("#yMax"),
  filterMode: document.querySelector("#filterMode"),
  filterWindow: document.querySelector("#filterWindow"),
  filterWindowField: document.querySelector("#filterWindowField"),
  highCutoff: document.querySelector("#highCutoff"),
  highCutoffField: document.querySelector("#highCutoffField"),
  lowCutoff: document.querySelector("#lowCutoff"),
  lowCutoffField: document.querySelector("#lowCutoffField"),
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
  clearBitsButton: document.querySelector("#clearBitsButton"),
  exportBitsButton: document.querySelector("#exportBitsButton"),
  bitCount: document.querySelector("#bitCount"),
  oneCount: document.querySelector("#oneCount"),
  zeroCount: document.querySelector("#zeroCount"),
  onesRatio: document.querySelector("#onesRatio"),
  bitCanvas: document.querySelector("#bitCanvas"),
  bitCanvasWrap: document.querySelector(".bit-canvas-wrap"),
};

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
  adcSource: "ADC3",
  dacValues: { A: 2048, B: 2056 },
  bitMode: false,
  bits: [],
  totalBits: 0,
  maxBits: 32768,
  bitPlane: [],
  bitPlaneIndex: 0,
  bitPlaneFilled: 0,
  bitPlaneCapacity: 0,
  bitPlaneCycles: 0,
  bitSource: "idle",
  noiseBaseline: null,
  noiseWarmup: 0,
  noisePairBit: null,
  paused: false,
  demoTimer: null,
  demoPhase: 0,
  liveSendTimer: null,
  writeQueue: Promise.resolve(),
  maxSamples: 2000,
  lastStatsAt: 0,
  needsDraw: true,
  lastDrawAt: 0,
  needsBitDraw: true,
  lastBitDrawAt: 0,
};

const encoder = new TextEncoder();
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_WRITE_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_NOTIFY_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const NOISE_BASELINE_ALPHA = 0.02;
const NOISE_WARMUP_SAMPLES = 12;
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

const ADC_SOURCE_INFO = {
  ADC3: {
    command: "ADC3",
    label: "ADC3 device A",
    detail: "Discrete device A · AIN3/P0.05",
  },
  ADC2: {
    command: "ADC2",
    label: "ADC2 device B",
    detail: "Discrete device B · AIN2/P0.04",
  },
  ADC0: {
    command: "ADC0",
    label: "ADC0 commercial",
    detail: "Commercial PPG · AIN0/P0.02",
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
  return ADC_SOURCE_INFO[normalizeAdcSource(source)] || ADC_SOURCE_INFO.ADC3;
}

function getAdcSourceDescription(source = state.adcSource) {
  return getAdcSourceInfo(source).detail;
}

function setAdcSource(source, options = {}) {
  const normalized = normalizeAdcSource(source);
  if (!normalized) return;
  state.adcSource = normalized;
  resetNoiseExtractor();
  updateAdcSourceUi(options);
  updateStats();
  state.needsDraw = true;
}

function updateAdcSourceUi(options = {}) {
  const info = getAdcSourceInfo();
  const pending = Boolean(options.pending);
  if (els.adcSourceStatus) {
    els.adcSourceStatus.textContent = pending ? `${info.label} pending` : info.label;
    els.adcSourceStatus.classList.toggle("is-muted", pending);
  }

  document.querySelectorAll("[data-adc-source]").forEach((button) => {
    const active = normalizeAdcSource(button.dataset.adcSource) === state.adcSource;
    button.classList.toggle("is-active", active);
  });
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
      addBits([value ? 1 : 0]);
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

  if (state.parseBuffer.length > 96) {
    if (state.bitMode) {
      parseBitSegment(state.parseBuffer);
      state.parseBuffer = "";
      return;
    }
    const matches = state.parseBuffer.match(/[-+]?\d+(?:\.\d+)?/g) || [];
    matches.slice(0, -1).forEach((value) => addSample(Number(value)));
    state.parseBuffer = matches.at(-1) || "";
  }
}

function parseSegment(segment) {
  if (!segment) return;
  if (parseStatusSegment(segment)) return;

  if (state.bitMode) {
    parseBitSegment(segment);
    return;
  }

  if (parseTaggedSegment(segment)) return;

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

function parseTaggedSegment(segment) {
  const matches = [...segment.matchAll(/\b(ADC|GREEN|IR|INFRARED|RED|AMBIENT|[AGIR])\b\s*[,=:]\s*([-+]?\d+(?:\.\d+)?)/gi)];
  if (!matches.length) return false;

  let parsed = false;
  matches.forEach((match) => {
    const channel = normalizeChannel(match[1]);
    const value = Number(match[2]);
    if (channel && Number.isFinite(value)) {
      addSample(value, channel);
      parsed = true;
    }
  });
  return parsed;
}

function parseStatusSegment(segment) {
  if (parseFirmwareInfoSegment(segment)) return true;
  if (parseAdcStatusSegment(segment)) return true;

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
  const match = segment.match(/^ADC\s*[,=:]\s*(?:ACTIVE|SOURCE|SELECTED)\s*[,=:]\s*([023])\b/i);
  if (!match) return false;
  setAdcSource(`ADC${match[1]}`);
  addLog("RX", segment);
  return true;
}

function parseBitSegment(segment) {
  const compact = segment.replace(/[\s,]+/g, "");
  if (!compact || /[^01]/.test(compact)) return false;
  addBits([...compact].map((bit) => Number(bit)));
  return true;
}

function addSample(value, channel = "ADC") {
  if (state.paused) return;

  const normalizedChannel = normalizeChannel(channel) || "ADC";
  const sample = {
    t: performance.now(),
    value,
    channel: normalizedChannel,
    adcSource: state.adcSource,
  };
  state.latest = value;
  state.latestChannel = normalizedChannel;
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
  if (normalizedChannel === "ADC") extractNoiseBit(value);
  state.needsDraw = true;
}

function extractNoiseBit(value) {
  if (state.bitMode || !Number.isFinite(value)) return;

  if (state.noiseBaseline === null) {
    state.noiseBaseline = value;
    state.noiseWarmup = 1;
    return;
  }

  const residual = value - state.noiseBaseline;
  state.noiseBaseline += NOISE_BASELINE_ALPHA * residual;
  state.noiseWarmup += 1;

  if (state.noiseWarmup < NOISE_WARMUP_SAMPLES || residual === 0) return;

  const rawBit = residual > 0 ? 1 : 0;
  if (state.noisePairBit === null) {
    state.noisePairBit = rawBit;
    return;
  }

  const previousBit = state.noisePairBit;
  state.noisePairBit = null;

  if (previousBit === rawBit) return;
  addBits([previousBit === 0 && rawBit === 1 ? 0 : 1], "noise");
}

function resetNoiseExtractor() {
  state.noiseBaseline = null;
  state.noiseWarmup = 0;
  state.noisePairBit = null;
}

function addBits(bits, source = state.bitMode ? "mode" : "noise") {
  if (state.paused || !bits.length) return;

  const normalizedBits = bits.map((bit) => (bit ? 1 : 0));
  state.bits.push(...normalizedBits);
  state.totalBits += normalizedBits.length;
  state.bitSource = source;

  if (state.bits.length > state.maxBits) {
    state.bits.splice(0, state.bits.length - state.maxBits);
  }

  updateBitModeUi();
  ensureBitPlaneCapacity();
  normalizedBits.forEach(writeBitToPlane);
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
    els.plotCaption.textContent = `Waiting for samples | ${getChannelDescription()} | ${getAdcPlotDescription()} | ${getFilterDescription()}`;
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
  els.latestValue.textContent = `${formatNumber(latest.value)} ${latest.channel || "ADC"} · ${getAdcSourceInfo(latest.adcSource).label}`;
  els.minValue.textContent = formatNumber(min);
  els.maxValue.textContent = formatNumber(max);
  els.avgValue.textContent = formatNumber(avg);
  els.rateValue.textContent = `${rate.toFixed(rate >= 10 ? 0 : 1)} Hz`;
  els.sampleCount.textContent = String(state.totalSamples);
  els.plotCaption.textContent = `${values.length} samples in view | ${getChannelDescription(displaySamples)} | ${getAdcPlotDescription()} | ${getFilterDescription()}`;
}

function setBitMode(enabled) {
  state.bitMode = enabled;
  state.parseBuffer = "";
  resetNoiseExtractor();
  updateBitModeUi();
  addLog("SYS", `Random bit mode ${enabled ? "enabled" : "disabled"}`);

  if (enabled) {
    state.needsBitDraw = true;
    window.requestAnimationFrame(resizeBitCanvas);
  }
}

function updateBitModeUi() {
  els.bitModeButton.classList.toggle("is-active", state.bitMode);
  els.bitModeStatus.textContent = state.bitMode ? "Bit mode on" : "Bit mode off";
  els.bitModeStatus.classList.toggle("is-muted", !state.bitMode);
  els.bitPanel.hidden = !state.bitMode && state.bits.length === 0;
}

function updateBitStats() {
  const planeBits = state.bitPlane.filter((bit) => bit === 0 || bit === 1);
  const ones = planeBits.reduce((sum, bit) => sum + bit, 0);
  const zeros = planeBits.length - ones;
  const ratio = planeBits.length ? ones / planeBits.length : null;
  const capacity = state.bitPlaneCapacity || getBitPlaneGeometry().capacity;
  const source = state.bitMode ? "9999 mode" : "ADC noise";

  els.bitCount.textContent = `${state.bitPlaneFilled}/${capacity}`;
  els.oneCount.textContent = String(ones);
  els.zeroCount.textContent = String(zeros);
  els.onesRatio.textContent = ratio === null ? "--" : ratio.toFixed(4);
  els.bitCaption.textContent = planeBits.length
    ? `${source} | plane ${state.bitPlaneCycles + 1} | total ${state.totalBits}`
    : state.bitMode
      ? "Waiting for bits"
      : "Waiting for ADC noise bits";
  updateBitModeUi();
}

function getBitColumns() {
  return clampInteger(els.bitColumns.value, 32, 256, 128);
}

function getBitPlaneGeometry() {
  const columns = getBitColumns();
  const rect = els.bitCanvas.getBoundingClientRect();
  const width = bitMap.width || Math.floor(rect.width);
  const height = bitMap.height || Math.floor(rect.height);

  if (!width || !height) {
    return { columns, rows: 64, cell: 2, capacity: columns * 64 };
  }

  const cell = Math.max(2, Math.floor(width / columns));
  const rows = Math.max(1, Math.floor(height / cell));
  return { columns, rows, cell, capacity: columns * rows };
}

function ensureBitPlaneCapacity() {
  const { capacity } = getBitPlaneGeometry();
  if (capacity <= 0 || state.bitPlaneCapacity === capacity) return;

  state.bitPlane = new Array(capacity).fill(null);
  state.bitPlaneIndex = 0;
  state.bitPlaneFilled = 0;
  state.bitPlaneCapacity = capacity;
  state.bitPlaneCycles = 0;
}

function writeBitToPlane(bit) {
  ensureBitPlaneCapacity();
  if (!state.bitPlaneCapacity) return;

  if (state.bitPlaneIndex === 0 && state.bitPlaneFilled === state.bitPlaneCapacity) {
    state.bitPlane.fill(null);
    state.bitPlaneFilled = 0;
    state.bitPlaneCycles += 1;
  }

  state.bitPlane[state.bitPlaneIndex] = bit ? 1 : 0;
  state.bitPlaneIndex += 1;
  state.bitPlaneFilled = Math.min(state.bitPlaneFilled + 1, state.bitPlaneCapacity);

  if (state.bitPlaneIndex >= state.bitPlaneCapacity) {
    state.bitPlaneIndex = 0;
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

function getSelectedChannel() {
  return normalizeChannel(els.channelMode?.value) || "all";
}

function getSelectedAdcPlotSource() {
  const value = els.adcPlotMode?.value || "all";
  if (value === "all") return "all";
  return normalizeAdcSource(value) || "all";
}

function getSamplesForAdcSource(samples = state.samples, source = getSelectedAdcPlotSource()) {
  if (source === "all") return samples;
  return samples.filter((sample) => (sample.adcSource || state.adcSource) === source);
}

function getAdcPlotDescription() {
  const source = getSelectedAdcPlotSource();
  if (source === "all") return "All ADC inputs";
  return getAdcSourceInfo(source).detail;
}

function getSamplesForChannel(channel = getSelectedChannel()) {
  const samples = getSamplesForAdcSource();
  if (channel === "all") return samples;
  return samples.filter((sample) => (sample.channel || "ADC") === channel);
}

function getChannelsInSamples(samples) {
  const present = new Set(samples.map((sample) => sample.channel || "ADC"));
  return CHANNEL_ORDER.filter((channel) => present.has(channel));
}

function getChannelDescription(samples = getDisplaySamples()) {
  const selected = getSelectedChannel();
  if (selected !== "all") return CHANNEL_LABELS[selected] || selected;

  const channels = getChannelsInSamples(samples);
  if (!channels.length) return "All channels";
  return channels.map((channel) => CHANNEL_LABELS[channel] || channel).join(" + ");
}

function updateFilterUi() {
  const mode = els.filterMode.value;
  els.filterWindowField.hidden = mode !== "moving-average";
  els.highCutoffField.hidden = mode !== "high-pass" && mode !== "band-pass";
  els.lowCutoffField.hidden = mode !== "low-pass" && mode !== "band-pass";
  els.filterSummary.textContent = getFilterDescription();
}

function getDisplaySamples(channel = getSelectedChannel()) {
  if (channel === "all") {
    const samples = getSamplesForChannel("all");
    return getChannelsInSamples(samples)
      .flatMap((visibleChannel) => getDisplaySamples(visibleChannel))
      .sort((left, right) => left.t - right.t);
  }

  const settings = getFilterSettings();
  const samples = getSamplesForChannel(channel);
  if (settings.mode === "raw") {
    return samples.map((sample) => ({ ...sample, rawValue: sample.value }));
  }

  const filteredValues = applyFilter(samples, settings);
  return samples.map((sample, index) => ({
    t: sample.t,
    channel: sample.channel || "ADC",
    adcSource: sample.adcSource || state.adcSource,
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
  await sendCommand("9999");
  setBitMode(!state.bitMode);
}

function applyPpgCommandPreset(command) {
  if (command === "7769") {
    els.filterMode.value = "raw";
    els.channelMode.value = "all";
  } else if (command === "7761") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
    els.channelMode.value = "G";
  } else if (command === "7762") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
    els.channelMode.value = "I";
  } else if (command === "7763") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
    els.channelMode.value = "R";
  } else if (command === "7764" || command === "7777") {
    els.filterMode.value = "band-pass";
    els.highCutoff.value = "0.5";
    els.lowCutoff.value = "5";
    els.channelMode.value = "all";
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
  const rows = settings.mode === "raw"
    ? ["time_ms,channel,adc_input,value"]
    : ["time_ms,channel,adc_input,raw_value,filtered_value"];
  displaySamples.forEach((sample) => {
    const time = (sample.t - start).toFixed(3);
    const adcSource = sample.adcSource || state.adcSource;
    if (settings.mode === "raw") {
      rows.push(`${time},${sample.channel || "ADC"},${adcSource},${sample.value}`);
    } else {
      rows.push(`${time},${sample.channel || "ADC"},${adcSource},${sample.rawValue},${sample.value}`);
    }
  });

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ppg_adc_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${displaySamples.length} samples`);
}

function clearBits() {
  state.bits = [];
  state.totalBits = 0;
  state.bitPlane = new Array(state.bitPlaneCapacity || getBitPlaneGeometry().capacity).fill(null);
  state.bitPlaneIndex = 0;
  state.bitPlaneFilled = 0;
  state.bitPlaneCycles = 0;
  state.bitSource = state.bitMode ? "mode" : "noise";
  updateBitStats();
  state.needsBitDraw = true;
  drawBitMap();
}

function exportBitsCsv() {
  if (!state.bits.length) {
    addLog("SYS", "No bits to export");
    return;
  }

  const rows = ["index,bit"];
  state.bits.forEach((bit, index) => {
    rows.push(`${index},${bit}`);
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

function toggleDemo() {
  if (state.demoTimer) {
    window.clearInterval(state.demoTimer);
    state.demoTimer = null;
    els.demoButton.textContent = "Demo stream";
    addLog("SYS", "Demo stopped");
    return;
  }

  state.demoTimer = window.setInterval(() => {
    if (state.bitMode) {
      const batch = Array.from({ length: 12 }, () => (Math.random() > 0.5 ? 1 : 0));
      addBits(batch);
      return;
    }

    const dac = clampDac(els.dacInput.value);
    state.demoPhase += 0.18;
    const baseline = 7200 + (dac - 2056) * 0.42;
    const ppg = Math.sin(state.demoPhase) * 160 + Math.sin(state.demoPhase * 0.31) * 38;
    const noise = (Math.random() - 0.5) * 42;
    addSample(Math.round(ppg + noise), "G");
    addSample(Math.round(ppg * 0.82 + Math.sin(state.demoPhase * 0.73) * 22 + noise * 0.45), "I");
    addSample(Math.round(ppg * 0.62 + noise * 0.55), "R");
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
  const start = samples[0].t;
  const end = samples.at(-1).t;
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

  const selected = getSelectedChannel();
  const channels = selected === "all" ? getChannelsInSamples(displaySamples) : [selected];

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left, margin.top, chartW, chartH);
  ctx.clip();

  channels.forEach((channel) => {
    const series = selected === "all"
      ? displaySamples.filter((sample) => (sample.channel || "ADC") === channel)
      : displaySamples;
    drawSeries(ctx, series, channel, margin, chartW, chartH, min, max, timeRange);
  });
  ctx.restore();

  drawLegend(ctx, channels, margin, chartW);
}

function drawSeries(ctx, samples, channel, margin, chartW, chartH, min, max, timeRange) {
  if (samples.length < 2) return;

  const color = CHANNEL_COLORS[channel] || CHANNEL_COLORS.ADC;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = margin.left + ((sample.t - timeRange.start) / timeRange.duration) * chartW;
    const y = margin.top + (1 - (sample.value - min) / (max - min)) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();

  const last = samples.at(-1);
  const x = margin.left + ((last.t - timeRange.start) / timeRange.duration) * chartW;
  const y = margin.top + (1 - (last.value - min) / (max - min)) * chartH;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegend(ctx, channels, margin, chartW) {
  if (!channels.length) return;

  ctx.save();
  ctx.font = "700 11px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";

  let x = margin.left + chartW;
  const y = margin.top - 8;
  [...channels].reverse().forEach((channel) => {
    const label = CHANNEL_LABELS[channel] || channel;
    const width = ctx.measureText(label).width + 18;
    x -= width + 10;
    ctx.fillStyle = CHANNEL_COLORS[channel] || CHANNEL_COLORS.ADC;
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
  const { columns, rows, cell } = getBitPlaneGeometry();
  const visibleBits = state.bitPlane;

  if (!state.bitPlaneFilled) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText(state.bitMode ? "No random bits" : "No ADC noise bits", 14, 28);
    return;
  }

  visibleBits.forEach((bit, index) => {
    if (bit !== 0 && bit !== 1) return;
    const x = (index % columns) * cell;
    const y = Math.floor(index / columns) * cell;
    ctx.fillStyle = bit ? "#17201d" : "#ffffff";
    ctx.fillRect(x, y, cell, cell);
  });

  if (state.bitPlaneIndex < state.bitPlaneCapacity) {
    const x = (state.bitPlaneIndex % columns) * cell;
    const y = Math.floor(state.bitPlaneIndex / columns) * cell;
    ctx.strokeStyle = "#f0a43a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, Math.max(1, cell - 2), Math.max(1, cell - 2));
  }

  if (cell >= 5) {
    ctx.strokeStyle = "rgba(216, 224, 220, 0.65)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) {
      const px = x * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, Math.min(height, rows * cell));
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      const py = y * cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(Math.min(width, columns * cell), py);
      ctx.stroke();
    }
  }
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
  requestAnimationFrame(animationLoop);
}

function bindEvents() {
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

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.command === "9999") {
        toggleBitModeCommand();
        return;
      }
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

  els.windowSize.addEventListener("change", () => {
    state.maxSamples = Number.parseInt(els.windowSize.value, 10);
    if (state.samples.length > state.maxSamples) {
      state.samples.splice(0, state.samples.length - state.maxSamples);
    }
    updateStats();
    state.needsDraw = true;
  });

  els.channelMode.addEventListener("change", () => {
    updateStats();
    state.needsDraw = true;
  });

  els.adcPlotMode.addEventListener("change", () => {
    updateStats();
    state.needsDraw = true;
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
  els.clearBitsButton.addEventListener("click", clearBits);
  els.exportBitsButton.addEventListener("click", exportBitsCsv);
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
  setDacValue(2056, "init");
  updateTransportControls();
  setConnectedUi(false);
  updateAdcSourceUi();
  updateFilterUi();
  updateBitStats();
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(els.canvasWrap || els.plotCanvas);
  new ResizeObserver(resizeBitCanvas).observe(els.bitCanvasWrap || els.bitCanvas);
  updateStats();
  animationLoop();
}

init();
