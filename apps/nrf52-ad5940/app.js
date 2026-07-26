/* AD5940 Lab Console — static Web Bluetooth client.
 *
 * The app never synthesizes measurement values. Binary A1/C1 frames are kept
 * exactly as received and exported separately from UI state/log messages.
 */
const UUID = {
  nusService: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  nusRx: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  nusTx: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  dfuService: 0xfe59,
  dfuControl: "8ec90001-f315-4f60-9fb8-838830daea50",
  dfuPacket: "8ec90002-f315-4f60-9fb8-838830daea50",
};

const DFU = {
  create: 0x01, setPrn: 0x02, checksum: 0x03, execute: 0x04, select: 0x06, response: 0x60,
  success: 0x01, commandObject: 0x01, dataObject: 0x02, packetBytes: 20,
};

const state = {
  mode: "AMP",
  device: null,
  server: null,
  nusRx: null,
  nusTx: null,
  gattQueue: Promise.resolve(),
  samples: [],
  textCarry: "",
  running: false,
  ampxSupported: false,
  expectDfuDisconnect: false,
  dfu: { file: null, pkg: null, device: null, server: null, control: null, packet: null, waiter: null, transferring: false },
};

const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const dec = new TextDecoder();
const elements = {
  connectionDot: $("connectionDot"), connectionLabel: $("connectionLabel"), connect: $("connectButton"), disconnect: $("disconnectButton"),
  browserState: $("browserState"), deviceState: $("deviceState"), lastStatus: $("lastStatus"),
  ampTab: $("ampTab"), cvTab: $("cvTab"), ampParameters: $("ampParameters"), cvParameters: $("cvParameters"),
  ampTimingHint: $("ampTimingHint"), ampCapabilityHint: $("ampCapabilityHint"),
  form: $("experimentForm"), apply: $("applyButton"), run: $("runButton"), stop: $("stopButton"),
  probe: $("probeButton"),
  plot: $("plotCanvas"), plotTitle: $("plotTitle"), plotCaption: $("plotCaption"), sampleRows: $("sampleRows"), sampleCount: $("sampleCount"),
  clearData: $("clearDataButton"), downloadCsv: $("downloadCsvButton"), eventLog: $("eventLog"), clearLog: $("clearLogButton"),
  dfuFile: $("dfuFile"), dfuPackageState: $("dfuPackageState"), enterDfu: $("enterDfuButton"), transferDfu: $("transferDfuButton"),
  dfuProgress: $("dfuProgress"), dfuProgressText: $("dfuProgressText"), verifyApp: $("verifyAppButton"),
};

function log(message, level = "INFO") {
  const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const line = `${time} [${level}] ${message}`;
  elements.eventLog.textContent = `${elements.eventLog.textContent}${elements.eventLog.textContent ? "\n" : ""}${line}`;
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function isInstrumentConnected() { return Boolean(state.device?.gatt?.connected); }

function refreshControlAvailability() {
  const connected = isInstrumentConnected();
  const ampReady = state.mode !== "AMP" || state.ampxSupported;
  const canConfigure = connected && !state.running && ampReady;
  elements.apply.disabled = !canConfigure;
  elements.run.disabled = !canConfigure;
  elements.stop.disabled = !connected || !state.running;
  elements.probe.disabled = !connected || state.running;

  elements.ampCapabilityHint.classList.toggle("ready", connected && state.ampxSupported);
  if (!connected) {
    elements.ampCapabilityHint.textContent = "Connect to check AMPX firmware capability before applying AMP parameters.";
  } else if (state.ampxSupported) {
    elements.ampCapabilityHint.textContent = "AMPX capability detected. All displayed AMP parameters are applied together before RUN.";
  } else if (state.mode === "AMP") {
    elements.ampCapabilityHint.textContent = "This controller does not advertise AMPX. Update to firmware V26 or later before AMP configuration.";
  } else {
    elements.ampCapabilityHint.textContent = "CV remains available; AMPX capability is required only for the expanded AMP controls.";
  }
}

function setConnection(connected, text = "Instrument disconnected") {
  elements.connectionDot.classList.toggle("connected", connected);
  elements.connectionLabel.textContent = text;
  elements.deviceState.textContent = connected && state.device ? (state.device.name || "Unnamed NUS peripheral") : "—";
  elements.connect.disabled = connected || !navigator.bluetooth;
  elements.disconnect.disabled = !connected;
  refreshControlAvailability();
  elements.enterDfu.disabled = !connected || !state.dfu.pkg || state.dfu.transferring;
}

function browserReady() {
  const secure = window.isSecureContext;
  const supported = Boolean(navigator.bluetooth);
  if (supported && secure) {
    elements.browserState.textContent = "Web Bluetooth available (secure context)";
    elements.dfuFile.disabled = false;
    elements.connect.disabled = false;
    log("Web Bluetooth is available. Device choosers require a direct user click.");
  } else {
    elements.browserState.textContent = !secure ? "HTTPS secure context required" : "Web Bluetooth unavailable in this browser";
    elements.dfuFile.disabled = true;
    elements.connect.disabled = true;
    log("Web Bluetooth is unavailable. Use HTTPS in a Chromium browser.", "WARN");
  }
}

function queueGatt(operation) {
  const next = state.gattQueue.then(operation);
  state.gattQueue = next.catch(() => undefined);
  return next;
}

async function writeCharacteristic(characteristic, bytes, withResponse = true) {
  if (!characteristic) throw new Error("GATT characteristic is unavailable.");
  if (withResponse && typeof characteristic.writeValueWithResponse === "function") {
    await characteristic.writeValueWithResponse(bytes);
  } else if (!withResponse && typeof characteristic.writeValueWithoutResponse === "function") {
    await characteristic.writeValueWithoutResponse(bytes);
  } else {
    await characteristic.writeValue(bytes);
  }
}

async function sendNusCommand(command) {
  if (!state.nusRx || !state.device?.gatt?.connected) throw new Error("Instrument is not connected.");
  const bytes = enc.encode(`${command}\r\n`);
  await queueGatt(() => writeCharacteristic(state.nusRx, bytes, true));
  log(`NUS TX: ${command}`);
}

function appendText(bytes) {
  state.textCarry += dec.decode(bytes);
  const lines = state.textCarry.split(/\r?\n/);
  state.textCarry = lines.pop();
  lines.filter(Boolean).forEach(handleTextLine);
}

function handleTextLine(line) {
  log(`NUS RX: ${line}`);
  elements.lastStatus.textContent = line;
  if (line.startsWith("@EVT,RUNNING")) state.running = true;
  if (line.startsWith("@EVT,STOPPED") || line.startsWith("@EVT,CV_COMPLETE") || line.startsWith("@ERR,")) state.running = false;
  if (line.startsWith("@INFO,")) {
    state.ampxSupported = line.includes("AMPX");
    log(state.ampxSupported ? "AMPX capability detected." : "AMPX capability not advertised by this firmware.", state.ampxSupported ? "INFO" : "WARN");
  }
  refreshControlAvailability();
  if (line.startsWith("@ERR,AFE_")) {
    log("AFE preflight rejected RUN; BLE and DFU remain available.", "WARN");
  }
}

function handleNusNotification(event) {
  const bytes = new Uint8Array(event.target.value.buffer.slice(0));
  if (bytes.length === 9 && (bytes[0] === 0xa1 || bytes[0] === 0xc1)) {
    const view = new DataView(bytes.buffer);
    const index = view.getUint32(1, true);
    const currentUa = view.getFloat32(5, true);
    addSample({ mode: bytes[0] === 0xa1 ? "AMP" : "CV", index, currentUa, receivedAt: new Date().toISOString() });
  } else {
    appendText(bytes);
  }
}

async function connectInstrument() {
  if (!navigator.bluetooth || !window.isSecureContext) return;
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [UUID.nusService] }],
      optionalServices: [UUID.dfuService],
    });
    device.removeEventListener("gattserverdisconnected", onInstrumentDisconnected);
    device.addEventListener("gattserverdisconnected", onInstrumentDisconnected);
    state.device = device;
    state.ampxSupported = false;
    setConnection(false, "Connecting…");
    state.server = await device.gatt.connect();
    const service = await state.server.getPrimaryService(UUID.nusService);
    state.nusRx = await service.getCharacteristic(UUID.nusRx);
    state.nusTx = await service.getCharacteristic(UUID.nusTx);
    await state.nusTx.startNotifications();
    state.nusTx.removeEventListener("characteristicvaluechanged", handleNusNotification);
    state.nusTx.addEventListener("characteristicvaluechanged", handleNusNotification);
    setConnection(true, `Connected: ${device.name || "NUS peripheral"}`);
    log(`Connected to ${device.name || "unnamed NUS peripheral"}.`);
    await sendNusCommand("INFO?");
    await sendNusCommand("STATUS?");
  } catch (error) {
    setConnection(false);
    log(`Connection failed: ${error.message}`, "ERROR");
  }
}

function onInstrumentDisconnected() {
  const wasDfuTransition = state.expectDfuDisconnect;
  state.nusRx = null; state.nusTx = null; state.server = null; state.running = false; state.ampxSupported = false;
  setConnection(false, wasDfuTransition ? "Application disconnected; select DfuTarg" : "Instrument disconnected");
  log(wasDfuTransition ? "DFU transition disconnect observed." : "Instrument disconnected.", wasDfuTransition ? "INFO" : "WARN");
  if (wasDfuTransition) {
    state.expectDfuDisconnect = false;
    elements.transferDfu.disabled = !state.dfu.pkg;
  }
}

async function disconnectInstrument() {
  if (state.device?.gatt?.connected) state.device.gatt.disconnect();
}

function switchMode(mode) {
  state.mode = mode;
  const amp = mode === "AMP";
  elements.ampTab.classList.toggle("active", amp); elements.ampTab.setAttribute("aria-selected", String(amp));
  elements.cvTab.classList.toggle("active", !amp); elements.cvTab.setAttribute("aria-selected", String(!amp));
  elements.ampParameters.classList.toggle("hidden", !amp); elements.cvParameters.classList.toggle("hidden", amp);
  elements.plotTitle.textContent = amp ? "Amperometry — current vs sample index" : "Cyclic voltammetry — current vs sequence sample index";
  elements.plotCaption.textContent = amp
    ? "Each received A1 current value is drawn without smoothing or rescaling."
    : "Each received C1 current value is drawn against the sequence sample index. Voltage mapping is intentionally not inferred in the browser.";
  refreshControlAvailability();
  drawPlot();
}

function integer(id) { return Math.trunc(Number($(id).value)); }

function updateAmpTimingHint() {
  const period = integer("ampPeriod");
  const fifoWords = integer("ampFifo");
  if (!Number.isFinite(period) || !Number.isFinite(fifoWords) || period < 1 || fifoWords < 1) {
    elements.ampTimingHint.textContent = "Enter a valid period and FIFO threshold to estimate notification batching.";
    return;
  }
  const samples = fifoWords / 4;
  const latencyMs = period * samples;
  elements.ampTimingHint.textContent = `FIFO interrupt batch: ${fifoWords} words = ${samples} sample(s); nominal batch interval ≈ ${latencyMs.toLocaleString()} ms.`;
}

function readConfig() {
  if (state.mode === "AMP") {
    if (!state.ampxSupported) throw new Error("Expanded amperometry controls require AMPX firmware V26 or later.");
    const config = {
      vzero: integer("ampVzero"), bias: integer("ampBias"), period: integer("ampPeriod"), rtia: integer("ampRtia"),
      rf: integer("ampRf"), pgaX10: integer("ampPga"), sinc3: integer("ampSinc3"), sinc2: integer("ampSinc2"),
      fifoWords: integer("ampFifo"), rcal: integer("ampRcal"), adcRefMv: integer("ampAdcRef"),
    };
    const supportedRtia = [1000, 4000, 10000, 20000, 40000, 100000, 160000];
    const supportedRf = [20000, 100000, 200000, 400000, 600000, 1000000];
    const supportedPga = [10, 15, 20, 40, 90];
    const supportedSinc3 = [2, 4, 5];
    const supportedSinc2 = [22, 44, 89, 178, 267, 533, 640, 667, 800, 889, 1067, 1333];
    const finite = Object.values(config).every(Number.isFinite);
    if (!finite || config.vzero < 200 || config.vzero > 2200 || config.bias < -750 || config.bias > 750 || config.vzero + config.bias < 200 || config.vzero + config.bias > 2200 || config.period < 100 || config.period > 10000 || !supportedRtia.includes(config.rtia) || !supportedRf.includes(config.rf) || !supportedPga.includes(config.pgaX10) || !supportedSinc3.includes(config.sinc3) || !supportedSinc2.includes(config.sinc2) || config.fifoWords < 4 || config.fifoWords > 512 || config.fifoWords % 4 || config.rcal < 100 || config.rcal > 100000 || config.adcRefMv < 1500 || config.adcRefMv > 2100) throw new Error("Amperometry parameters are outside the firmware guard range.");
    return config;
  }
  const config = { start: integer("cvStart"), vertex: integer("cvVertex"), vzero: integer("cvVzero"), steps: integer("cvSteps"), duration: integer("cvDuration"), settle: integer("cvSettle"), rtia: integer("cvRtia") };
  const pointPeriod = config.duration / config.steps;
  if (config.start === config.vertex || config.start < -1000 || config.start > 1000 || config.vertex < -1000 || config.vertex > 1000 || config.vzero < 200 || config.vzero > 2200 || config.vzero + config.start < 200 || config.vzero + config.start > 2200 || config.vzero + config.vertex < 200 || config.vzero + config.vertex > 2200 || config.steps < 2 || config.steps > 4095 || config.duration < 10 || config.duration > 600000 || config.settle < 2 || config.settle > 1000 || pointPeriod < config.settle + 1 || pointPeriod < 3) throw new Error("CV parameters violate the firmware guard range or timing relation.");
  return config;
}

function configCommand() {
  const config = readConfig();
  return state.mode === "AMP"
    ? `CFG,AMPX,${config.vzero},${config.bias},${config.period},${config.rtia},${config.rf},${config.pgaX10},${config.sinc3},${config.sinc2},${config.fifoWords},${config.rcal},${config.adcRefMv}`
    : `CFG,CV,${config.start},${config.vertex},${config.vzero},${config.steps},${config.duration},${config.settle},${config.rtia}`;
}

async function applyConfig(event) {
  event?.preventDefault();
  try { await sendNusCommand(configCommand()); } catch (error) { log(error.message, "ERROR"); }
}

async function startMeasurement() {
  try {
    await sendNusCommand(configCommand());
    await sendNusCommand(`RUN,${state.mode}`);
    log("RUN queued. The board will acknowledge or reject after its AFE preflight.");
  } catch (error) { log(error.message, "ERROR"); }
}

async function stopMeasurement() {
  try { await sendNusCommand("STOP"); } catch (error) { log(error.message, "ERROR"); }
}

async function runAfeProbe() {
  try {
    await sendNusCommand("PROBE?");
    log("AFE SPI probe requested. Inspect @PROBE before retrying RUN.");
  } catch (error) { log(error.message, "ERROR"); }
}

function addSample(sample) {
  state.samples.push(sample);
  elements.sampleCount.textContent = `${state.samples.length} samples`;
  elements.downloadCsv.disabled = state.samples.length === 0;
  renderRows(); drawPlot();
}

function renderRows() {
  const recent = state.samples.slice(-40).reverse();
  elements.sampleRows.innerHTML = recent.length ? recent.map((s) => `<tr><td>${s.mode}</td><td>${s.index}</td><td>${s.currentUa}</td><td>${new Date(s.receivedAt).toLocaleTimeString()}</td></tr>`).join("") : '<tr><td colspan="4" class="empty">No binary measurement frames received.</td></tr>';
}

function clearSamples() {
  state.samples = []; elements.sampleCount.textContent = "0 samples"; elements.downloadCsv.disabled = true; renderRows(); drawPlot(); log("Displayed and exportable received sample list cleared.");
}

function downloadCsv() {
  if (!state.samples.length) return;
  const header = "mode,sample_index,calculated_current_uA,received_at_iso";
  const rows = state.samples.map((s) => `${s.mode},${s.index},${s.currentUa},${s.receivedAt}`);
  const blob = new Blob([[header, ...rows].join("\r\n")], { type: "text/csv" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `ad5940-received-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`; link.click(); URL.revokeObjectURL(link.href);
  log(`Downloaded ${state.samples.length} received frames as CSV.`);
}

function drawPlot() {
  const canvas = elements.plot; const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
  if (!rect.width || !rect.height) return;
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio); const width = rect.width; const height = rect.height;
  const margin = { left: 58, right: 18, top: 18, bottom: 34 }; const chartW = width - margin.left - margin.right; const chartH = height - margin.top - margin.bottom;
  ctx.fillStyle = "#061321"; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = "#1d3d59"; ctx.lineWidth = 1;
  ctx.font = "11px system-ui"; ctx.fillStyle = "#8da9bd";
  for (let i = 0; i <= 5; i += 1) { const y = margin.top + chartH * i / 5; ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke(); }
  for (let i = 0; i <= 6; i += 1) { const x = margin.left + chartW * i / 6; ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, height - margin.bottom); ctx.stroke(); }
  const points = state.samples.filter((s) => s.mode === state.mode);
  if (!points.length) { ctx.fillStyle = "#7892a7"; ctx.textAlign = "center"; ctx.fillText("Awaiting received device data", width / 2, height / 2); return; }
  let minX = Math.min(...points.map((p) => p.index)); let maxX = Math.max(...points.map((p) => p.index)); let minY = Math.min(...points.map((p) => p.currentUa)); let maxY = Math.max(...points.map((p) => p.currentUa));
  if (minX === maxX) { minX -= 1; maxX += 1; } if (minY === maxY) { minY -= 1; maxY += 1; } const padding = (maxY - minY) * .12; minY -= padding; maxY += padding;
  const px = (x) => margin.left + (x - minX) / (maxX - minX) * chartW; const py = (y) => margin.top + (maxY - y) / (maxY - minY) * chartH;
  ctx.textAlign = "right"; for (let i = 0; i <= 5; i += 1) { const value = maxY - (maxY - minY) * i / 5; ctx.fillText(value.toPrecision(4), margin.left - 7, margin.top + chartH * i / 5 + 4); }
  ctx.textAlign = "center"; for (let i = 0; i <= 6; i += 1) { const value = minX + (maxX - minX) * i / 6; ctx.fillText(Math.round(value), margin.left + chartW * i / 6, height - 12); }
  ctx.strokeStyle = "#3fd0e6"; ctx.lineWidth = 1.5; ctx.beginPath(); points.forEach((p, index) => { if (index) ctx.lineTo(px(p.index), py(p.currentUa)); else ctx.moveTo(px(p.index), py(p.currentUa)); }); ctx.stroke();
  ctx.fillStyle = "#c9dce9"; ctx.textAlign = "left"; ctx.fillText("Current (µA)", margin.left, 12); ctx.textAlign = "right"; ctx.fillText("sample index", width - margin.right, height - 12);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipEntries(buffer) {
  const view = new DataView(buffer); const bytes = new Uint8Array(buffer); let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at -= 1) if (view.getUint32(at, true) === 0x06054b50) { eocd = at; break; }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory was not found.");
  const count = view.getUint16(eocd + 10, true); let offset = view.getUint32(eocd + 16, true); const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Malformed ZIP central directory.");
    const method = view.getUint16(offset + 10, true); const compressed = view.getUint32(offset + 20, true); const uncompressed = view.getUint32(offset + 24, true); const nameLength = view.getUint16(offset + 28, true); const extraLength = view.getUint16(offset + 30, true); const commentLength = view.getUint16(offset + 32, true); const localOffset = view.getUint32(offset + 42, true); const name = dec.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.set(name, { name, method, compressed, uncompressed, localOffset }); offset += 46 + nameLength + extraLength + commentLength;
  }
  return { buffer, entries };
}

async function unzipEntry(zip, entry) {
  const view = new DataView(zip.buffer); const source = new Uint8Array(zip.buffer); const offset = entry.localOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) throw new Error(`Malformed local ZIP entry: ${entry.name}`);
  const nameLength = view.getUint16(offset + 26, true); const extraLength = view.getUint16(offset + 28, true); const data = source.slice(offset + 30 + nameLength + extraLength, offset + 30 + nameLength + extraLength + entry.compressed);
  if (entry.method === 0) return data;
  if (entry.method === 8 && "DecompressionStream" in window) return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  throw new Error(`ZIP compression method ${entry.method} is not supported by this browser.`);
}

async function inspectDfuPackage(file) {
  const zip = zipEntries(await file.arrayBuffer()); const manifestEntry = zip.entries.get("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json is missing from the ZIP.");
  const manifest = JSON.parse(dec.decode(await unzipEntry(zip, manifestEntry))); const root = manifest.manifest;
  if (!root || !root.application || Object.keys(root).length !== 1) throw new Error("Only an application-only nrfutil Secure DFU ZIP is accepted here.");
  const app = root.application;
  if (!app.bin_file || !app.dat_file) throw new Error("Application manifest lacks bin_file or dat_file.");
  const binaryEntry = zip.entries.get(app.bin_file); const datEntry = zip.entries.get(app.dat_file);
  if (!binaryEntry || !datEntry) throw new Error("Manifest file reference is absent from the ZIP.");
  const binary = await unzipEntry(zip, binaryEntry); const dat = await unzipEntry(zip, datEntry);
  if (!binary.length || !dat.length) throw new Error("The application binary or init packet is empty.");
  return { manifest, binary, dat, binaryName: app.bin_file, datName: app.dat_file };
}

function setDfuProgress(value, text) {
  elements.dfuProgress.style.width = `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
  elements.dfuProgressText.textContent = text;
}

async function onDfuFile() {
  const file = elements.dfuFile.files?.[0]; state.dfu.file = file || null; state.dfu.pkg = null; elements.enterDfu.disabled = true; elements.transferDfu.disabled = true;
  if (!file) { elements.dfuPackageState.textContent = "No package selected."; return; }
  try {
    elements.dfuPackageState.textContent = "Checking ZIP structure…";
    state.dfu.pkg = await inspectDfuPackage(file);
    elements.dfuPackageState.textContent = `Structure valid: ${state.dfu.pkg.binaryName} (${state.dfu.pkg.binary.length.toLocaleString()} B), ${state.dfu.pkg.datName} (${state.dfu.pkg.dat.length.toLocaleString()} B). Bootloader signature validation is still pending.`;
    elements.enterDfu.disabled = !state.device?.gatt?.connected;
    log(`DFU ZIP structure checked locally: ${file.name}. The browser did not verify its signature.`);
  } catch (error) {
    elements.dfuPackageState.textContent = `Rejected: ${error.message}`; log(`DFU ZIP rejected: ${error.message}`, "ERROR");
  }
}

async function enterDfu() {
  if (!state.dfu.pkg || !state.nusRx) return;
  if (!window.confirm("Enter Secure DFU bootloader now? Measurement will stop and the current BLE connection will disconnect.")) return;
  try {
    state.expectDfuDisconnect = true; elements.enterDfu.disabled = true; elements.transferDfu.disabled = true;
    await sendNusCommand("DFU"); setDfuProgress(0, "DFU command sent. Wait for application disconnect, then select DfuTarg.");
  } catch (error) { state.expectDfuDisconnect = false; log(`Could not enter DFU: ${error.message}`, "ERROR"); }
}

function waitDfuResponse(expectedOpcode, timeoutMs = 10000) {
  if (state.dfu.waiter) throw new Error("A DFU control response is already pending.");
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => { state.dfu.waiter = null; reject(new Error(`Timed out waiting for DFU opcode 0x${expectedOpcode.toString(16)}.`)); }, timeoutMs);
    state.dfu.waiter = { expectedOpcode, resolve: (value) => { window.clearTimeout(timer); state.dfu.waiter = null; resolve(value); }, reject };
  });
}

function onDfuControlNotification(event) {
  const bytes = new Uint8Array(event.target.value.buffer.slice(0));
  const waiter = state.dfu.waiter;
  if (bytes[0] === DFU.response && waiter && bytes[1] === waiter.expectedOpcode) { waiter.resolve(bytes); return; }
  log(`Unmatched DFU control notification: ${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join(" ")}`, "WARN");
}

async function dfuControl(opcode, payload = new Uint8Array()) {
  const bytes = new Uint8Array(1 + payload.length); bytes[0] = opcode; bytes.set(payload, 1);
  return queueGatt(async () => { const response = waitDfuResponse(opcode); await writeCharacteristic(state.dfu.control, bytes, true); return response; });
}

function assertDfuSuccess(response, opcode) {
  if (response[0] !== DFU.response || response[1] !== opcode || response[2] !== DFU.success) throw new Error(`DFU opcode 0x${opcode.toString(16)} failed (result 0x${(response[2] ?? 0).toString(16)}).`);
  return response;
}

async function dfuSelect(type) {
  const response = assertDfuSuccess(await dfuControl(DFU.select, Uint8Array.of(type)), DFU.select); const view = new DataView(response.buffer, response.byteOffset, response.byteLength);
  if (response.length < 15) throw new Error("Short SELECT_OBJECT response.");
  return { maxSize: view.getUint32(3, true), offset: view.getUint32(7, true), crc: view.getUint32(11, true) };
}

async function dfuCreate(type, size) { const payload = new Uint8Array(5); const view = new DataView(payload.buffer); payload[0] = type; view.setUint32(1, size, true); assertDfuSuccess(await dfuControl(DFU.create, payload), DFU.create); }
async function dfuChecksum() { const response = assertDfuSuccess(await dfuControl(DFU.checksum), DFU.checksum); const view = new DataView(response.buffer, response.byteOffset, response.byteLength); if (response.length < 11) throw new Error("Short CALCULATE_CHECKSUM response."); return { offset: view.getUint32(3, true), crc: view.getUint32(7, true) }; }
async function dfuExecute() { assertDfuSuccess(await dfuControl(DFU.execute), DFU.execute); }

async function dfuPacketWithPrn(bytes) {
  return queueGatt(async () => { const response = waitDfuResponse(DFU.checksum); await writeCharacteristic(state.dfu.packet, bytes, false); return response; });
}

async function transferObject(type, payload, startPercent, endPercent, label) {
  let selected = await dfuSelect(type); if (!selected.maxSize) throw new Error("Bootloader returned an invalid maximum object size.");
  if (selected.offset > payload.length) throw new Error(`${label} resume offset exceeds local file length.`);
  if (selected.offset && crc32(payload.slice(0, selected.offset)) !== selected.crc) throw new Error(`${label} resume CRC does not match this package. Do not continue with this ZIP.`);
  let offset = selected.offset; log(`${label}: resume offset ${offset}/${payload.length}.`);
  while (offset < payload.length) {
    const objectEnd = Math.min(offset + selected.maxSize, payload.length); await dfuCreate(type, objectEnd - offset);
    while (offset < objectEnd) {
      const packetEnd = Math.min(offset + DFU.packetBytes, objectEnd); const response = assertDfuSuccess(await dfuPacketWithPrn(payload.slice(offset, packetEnd)), DFU.checksum); const view = new DataView(response.buffer, response.byteOffset, response.byteLength);
      if (response.length < 11) throw new Error("Short packet receipt notification."); const remoteOffset = view.getUint32(3, true); const remoteCrc = view.getUint32(7, true); const localCrc = crc32(payload.slice(0, packetEnd));
      if (remoteOffset !== packetEnd || remoteCrc !== localCrc) throw new Error(`${label} CRC/offset mismatch at ${packetEnd}. Transfer stopped.`);
      offset = packetEnd; const progress = startPercent + (endPercent - startPercent) * (offset / payload.length); setDfuProgress(progress, `${label}: ${offset.toLocaleString()} / ${payload.length.toLocaleString()} bytes, CRC verified.`);
    }
    const check = await dfuChecksum(); const localObjectCrc = crc32(payload.slice(0, offset)); if (check.offset !== offset || check.crc !== localObjectCrc) throw new Error(`${label} final object CRC mismatch.`); await dfuExecute();
  }
}

async function selectDfuAndTransfer() {
  if (!state.dfu.pkg || state.dfu.transferring) return;
  try {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [UUID.dfuService] }] });
    state.dfu.device = device; device.addEventListener("gattserverdisconnected", () => log("DFU peripheral disconnected (expected after final execute).")); state.dfu.server = await device.gatt.connect();
    const service = await state.dfu.server.getPrimaryService(UUID.dfuService); state.dfu.control = await service.getCharacteristic(UUID.dfuControl); state.dfu.packet = await service.getCharacteristic(UUID.dfuPacket); await state.dfu.control.startNotifications(); state.dfu.control.addEventListener("characteristicvaluechanged", onDfuControlNotification);
    state.dfu.transferring = true; elements.transferDfu.disabled = true; elements.enterDfu.disabled = true; setDfuProgress(0, "DfuTarg connected. Setting packet receipt notification interval to 1.");
    const prn = new Uint8Array([1, 0]); assertDfuSuccess(await dfuControl(DFU.setPrn, prn), DFU.setPrn);
    await transferObject(DFU.commandObject, state.dfu.pkg.dat, 0, 10, "Init packet"); await transferObject(DFU.dataObject, state.dfu.pkg.binary, 10, 100, "Application");
    setDfuProgress(100, "Secure DFU transfer protocol completed. Reconnect the application to verify advertising and NUS."); elements.verifyApp.disabled = false; log("DFU protocol complete. Signature acceptance and reboot were decided by the target bootloader; application verification remains required.");
  } catch (error) { setDfuProgress(0, `DFU stopped: ${error.message}`); log(`DFU failed safely: ${error.message}`, "ERROR"); }
  finally { state.dfu.transferring = false; elements.transferDfu.disabled = !state.dfu.pkg; elements.enterDfu.disabled = !state.device?.gatt?.connected || !state.dfu.pkg; }
}

elements.connect.addEventListener("click", connectInstrument); elements.disconnect.addEventListener("click", disconnectInstrument); elements.ampTab.addEventListener("click", () => switchMode("AMP")); elements.cvTab.addEventListener("click", () => switchMode("CV")); elements.form.addEventListener("submit", applyConfig); elements.run.addEventListener("click", startMeasurement); elements.stop.addEventListener("click", stopMeasurement); elements.probe.addEventListener("click", runAfeProbe); elements.clearData.addEventListener("click", clearSamples); elements.downloadCsv.addEventListener("click", downloadCsv); elements.clearLog.addEventListener("click", () => { elements.eventLog.textContent = ""; }); elements.dfuFile.addEventListener("change", onDfuFile); elements.enterDfu.addEventListener("click", enterDfu); elements.transferDfu.addEventListener("click", selectDfuAndTransfer); elements.verifyApp.addEventListener("click", connectInstrument); window.addEventListener("resize", drawPlot);
document.querySelectorAll("#ampParameters input, #ampParameters select").forEach((control) => control.addEventListener("input", updateAmpTimingHint));

browserReady(); switchMode("AMP"); updateAmpTimingHint(); drawPlot();
