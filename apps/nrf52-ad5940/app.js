/* AD5940 Lab Console — static Web Bluetooth client.
 *
 * The app never synthesizes measurement values. Binary A1/B1/C1 frames are
 * kept exactly as received. PT3 DAC/pad traces are explicitly configuration-
 * derived setpoints and remain separate from received current data.
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

const PT3 = {
  sourceMv: 1100,
  dac12LsbMv: 2200 / 4095,
  dac6LsbMv: (2200 / 4095) * 64,
  adcClockHz: 800000,
  minRawSps: 100,
  maxRawSps: 800,
  maxRequestedOutputSps: 100,
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
  pt3Supported: false,
  pt3DspSupported: false,
  pendingPt3: null,
  pt3Applied: null,
  pt3History: [],
  expectDfuDisconnect: false,
  plotDrawPending: false,
  dfu: { file: null, pkg: null, device: null, server: null, control: null, packet: null, waiter: null, transferring: false, completed: false, progress: 0, stage: "package" },
};

const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const dec = new TextDecoder();
const elements = {
  connectionDot: $("connectionDot"), connectionLabel: $("connectionLabel"), connect: $("connectButton"), disconnect: $("disconnectButton"),
  browserState: $("browserState"), deviceState: $("deviceState"), lastStatus: $("lastStatus"),
  ampTab: $("ampTab"), cvTab: $("cvTab"), pt3Tab: $("pt3Tab"), ampParameters: $("ampParameters"), cvParameters: $("cvParameters"), pt3Parameters: $("pt3Parameters"),
  ampTimingHint: $("ampTimingHint"), ampCapabilityHint: $("ampCapabilityHint"), pt3TimingHint: $("pt3TimingHint"), pt3CapabilityHint: $("pt3CapabilityHint"),
  pt3VbiasSet: $("pt3VbiasSet"), pt3VzeroSet: $("pt3VzeroSet"), pt3CeSet: $("pt3CeSet"), pt3SeSet: $("pt3SeSet"), pt3SettingsPanel: $("pt3SettingsPanel"), pt3SettingsPlot: $("pt3SettingsCanvas"), pt3RouteState: $("pt3RouteState"), pt3Sinc3: $("pt3Sinc3"), pt3Sinc2: $("pt3Sinc2"), pt3Notch: $("pt3Notch"),
  form: $("experimentForm"), apply: $("applyButton"), run: $("runButton"), stop: $("stopButton"),
  probe: $("probeButton"),
  plot: $("plotCanvas"), plotTitle: $("plotTitle"), plotCaption: $("plotCaption"), sampleRows: $("sampleRows"), sampleCount: $("sampleCount"),
  clearData: $("clearDataButton"), downloadCsv: $("downloadCsvButton"), eventLog: $("eventLog"), clearLog: $("clearLogButton"),
  dfuFile: $("dfuFile"), dfuPackageState: $("dfuPackageState"), enterDfu: $("enterDfuButton"), transferDfu: $("transferDfuButton"),
  dfuProgress: $("dfuProgress"), dfuProgressBar: $("dfuProgressBar"), dfuProgressPercent: $("dfuProgressPercent"), dfuProgressText: $("dfuProgressText"), verifyApp: $("verifyAppButton"),
  dfuStages: { package: $("dfuStagePackage"), entry: $("dfuStageEntry"), transfer: $("dfuStageTransfer"), verify: $("dfuStageVerify") },
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
  const modeReady = state.mode === "AMP" ? state.ampxSupported : state.mode === "PT3" ? state.pt3Supported : true;
  const canConfigure = connected && !state.running && modeReady;
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

  elements.pt3CapabilityHint.classList.toggle("ready", connected && state.pt3Supported);
  [elements.pt3Sinc3, elements.pt3Sinc2, elements.pt3Notch].forEach((control) => { control.disabled = !connected || !state.pt3DspSupported; });
  if (!connected) {
    elements.pt3CapabilityHint.textContent = "Connect to check PT3 firmware capability before applying phototransistor parameters.";
  } else if (state.pt3Supported && state.pt3DspSupported) {
    elements.pt3CapabilityHint.textContent = "PT3_DSP detected. DAC, timing, SINC3/SINC2, and notch are applied together before RUN.";
  } else if (state.pt3Supported) {
    elements.pt3CapabilityHint.textContent = "Basic PT3 detected. The proven SINC3=5 / SINC2=800 / notch-bypass profile is used; install V34 for DSP controls.";
  } else if (state.mode === "PT3") {
    elements.pt3CapabilityHint.textContent = "This controller does not advertise PT3. Install controller firmware V29 or later before using this mode.";
  } else {
    elements.pt3CapabilityHint.textContent = "PT3 capability is required only for the phototransistor controls.";
  }
}

function setConnection(connected, text = "Instrument disconnected") {
  elements.connectionDot.classList.toggle("connected", connected);
  elements.connectionLabel.textContent = text;
  elements.deviceState.textContent = connected && state.device ? (state.device.name || "Unnamed NUS peripheral") : "—";
  elements.connect.disabled = connected || !navigator.bluetooth;
  elements.disconnect.disabled = !connected;
  refreshControlAvailability();
  elements.enterDfu.disabled = !connected || !state.dfu.pkg || state.dfu.transferring || state.dfu.completed;
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

function handlePt3Error(line) {
  state.pendingPt3 = null;
  if (line.startsWith("@ERR,PT3_CAL,")) {
    const fields = Object.fromEntries(line.split(",").slice(2).map((field) => {
      const [key, value = "?"] = field.split("=");
      return [key, value];
    }));
    elements.pt3RouteState.textContent = `HSTIA calibration rejected: RTIA ${fields.RTIA || "?"} ohm, library ${fields.LIB || "?"}, SPI ${fields.SPI || "?"}`;
    log("PT3 HSTIA calibration rejected before CE0/VZERO DUT setpoints were enabled. Check the RCAL0-RCAL1 200 ohm path and retain this diagnostic.", "WARN");
    return;
  }
  if (line.startsWith("@ERR,PT3_RANGE")) {
    elements.pt3RouteState.textContent = "PT3 range guard rejected the requested DAC setpoint.";
    log("PT3 range guard rejected RUN; no measurement was started.", "WARN");
    return;
  }
  if (line.startsWith("@ERR,PT3_INIT")) {
    elements.pt3RouteState.textContent = "Legacy PT3 initialization error. Install V30 to obtain calibrated RTIA diagnostics.";
    log("Legacy PT3_INIT is not specific enough to diagnose. Update to V30 before retrying.", "WARN");
  }
}

function handleTextLine(line) {
  log(`NUS RX: ${line}`);
  elements.lastStatus.textContent = line;
  if (line.startsWith("@EVT,RUNNING")) state.running = true;
  if (line.startsWith("@EVT,PT3_SETTLING")) state.running = true;
  if (line.startsWith("@EVT,STOPPED") || line.startsWith("@EVT,CV_COMPLETE") || line.startsWith("@ERR,")) state.running = false;
  if (line.startsWith("@INFO,")) {
    state.ampxSupported = line.includes("AMPX");
    state.pt3Supported = line.includes("PT3");
    state.pt3DspSupported = line.includes("PT3_DSP");
    log(state.ampxSupported ? "AMPX capability detected." : "AMPX capability not advertised by this firmware.", state.ampxSupported ? "INFO" : "WARN");
    log(state.pt3DspSupported ? "PT3 DSP capability detected." : state.pt3Supported ? "Basic PT3 capability detected; DSP controls require V34." : "PT3 capability not advertised by this firmware.", state.pt3Supported ? "INFO" : "WARN");
  }
  if (line.startsWith("@ACK,CFG,PT3") && state.pendingPt3) {
    state.pt3Applied = { ...state.pendingPt3, acknowledgedAt: new Date().toISOString() };
    state.pt3History.push(state.pt3Applied);
    elements.pt3RouteState.textContent = `ACK: ${state.pt3Applied.rawSps.toFixed(1)} raw SPS → ${state.pt3Applied.outputSps.toFixed(1)} B1 SPS; S3 ${state.pt3Applied.sinc3}, S2 ${state.pt3Applied.sinc2}`;
    log("PT3 configuration acknowledged; DAC/pad trace and DSP metadata updated.");
    schedulePlot();
  }
  if (line.startsWith("@ERR,PT3_")) handlePt3Error(line);
  refreshControlAvailability();
  if (line.startsWith("@ERR,AFE_")) {
    log("AFE preflight rejected RUN; BLE and DFU remain available.", "WARN");
  }
}

function handleNusNotification(event) {
  const bytes = new Uint8Array(event.target.value.buffer.slice(0));
  if (bytes.length === 9 && (bytes[0] === 0xa1 || bytes[0] === 0xb1 || bytes[0] === 0xc1)) {
    const view = new DataView(bytes.buffer);
    const index = view.getUint32(1, true);
    const currentUa = view.getFloat32(5, true);
    const mode = bytes[0] === 0xa1 ? "AMP" : bytes[0] === 0xb1 ? "PT3" : "CV";
    addSample({ mode, index, currentUa, receivedAt: new Date().toISOString(), pt3: mode === "PT3" && state.pt3Applied ? { ...state.pt3Applied } : null });
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
    state.ampxSupported = false; state.pt3DspSupported = false;
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
  state.nusRx = null; state.nusTx = null; state.server = null; state.running = false; state.ampxSupported = false; state.pt3Supported = false; state.pt3DspSupported = false;
  setConnection(false, wasDfuTransition ? "Application disconnected; select DfuTarg" : "Instrument disconnected");
  log(wasDfuTransition ? "DFU transition disconnect observed." : "Instrument disconnected.", wasDfuTransition ? "INFO" : "WARN");
  if (wasDfuTransition) {
    state.expectDfuDisconnect = false;
    elements.transferDfu.disabled = !state.dfu.pkg || state.dfu.completed;
    setDfuStage("transfer");
    setDfuProgress(0, "Application disconnect observed. Select DfuTarg in the browser chooser.");
  }
}

function allowDfuTargetSelection(message) {
  /*
   * Buttonless DFU can reset the application before Windows reports completion
   * of the NUS write-with-response. The service-filtered DfuTarg chooser is
   * still the hardware boundary, so this does not start a transfer against
   * the application peripheral.
   */
  state.expectDfuDisconnect = false;
  elements.transferDfu.disabled = !state.dfu.pkg || state.dfu.completed;
  setDfuStage("transfer");
  setDfuProgress(0, message);
}

async function disconnectInstrument() {
  if (state.device?.gatt?.connected) state.device.gatt.disconnect();
}

function switchMode(mode) {
  state.mode = mode;
  const amp = mode === "AMP";
  const cv = mode === "CV";
  elements.ampTab.classList.toggle("active", amp); elements.ampTab.setAttribute("aria-selected", String(amp));
  elements.cvTab.classList.toggle("active", cv); elements.cvTab.setAttribute("aria-selected", String(cv));
  elements.pt3Tab.classList.toggle("active", mode === "PT3"); elements.pt3Tab.setAttribute("aria-selected", String(mode === "PT3"));
  elements.ampParameters.classList.toggle("hidden", !amp); elements.cvParameters.classList.toggle("hidden", !cv); elements.pt3Parameters.classList.toggle("hidden", mode !== "PT3");
  elements.pt3SettingsPanel.classList.toggle("hidden", mode !== "PT3");
  if (amp) {
    elements.plotTitle.textContent = "Amperometry — current vs sample index";
    elements.plotCaption.textContent = "Each received A1 current value is drawn without smoothing or rescaling.";
  } else if (cv) {
    elements.plotTitle.textContent = "Cyclic voltammetry — current vs sequence sample index";
    elements.plotCaption.textContent = "Each received C1 current value is drawn against the sequence sample index. Voltage mapping is intentionally not inferred in the browser.";
  } else {
    elements.plotTitle.textContent = "Phototransistor (PT3) — current vs sample index";
    elements.plotCaption.textContent = "Each received B1 current value is drawn without smoothing or rescaling. DAC and PAD traces below are acknowledged configuration-derived setpoints, not measured voltages.";
    updatePt3Preview();
  }
  refreshControlAvailability();
  schedulePlot();
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

function formatMv(value) {
  return `${(value / 1000).toFixed(3)} V`;
}

function calculatePt3Timing(config) {
  const rawSps = PT3.adcClockHz / (config.sinc3 * config.sinc2);
  const requestedOutputSps = 1000 / config.period;
  const outputDecimation = Math.round(rawSps / requestedOutputSps);
  if (!Number.isFinite(rawSps) || !Number.isFinite(outputDecimation) || outputDecimation < 1) throw new Error("PT3 DSP timing is invalid.");
  const outputSps = rawSps / outputDecimation;
  return { rawSps, requestedOutputSps, outputDecimation, outputSps, actualOutputPeriodMs: 1000 / outputSps };
}

function calculatePt3Setpoints(config) {
  const gateRequestedMv = PT3.sourceMv + config.vgs;
  const drainRequestedMv = PT3.sourceMv + config.vds;
  const gateCode = Math.round((gateRequestedMv - 200) / PT3.dac12LsbMv);
  const drainCode = Math.round((drainRequestedMv - 200) / PT3.dac6LsbMv);
  const gateMv = 200 + gateCode * PT3.dac12LsbMv;
  const ceMv = 200 + drainCode * PT3.dac6LsbMv;
  return {
    ...config,
    ...calculatePt3Timing(config),
    gateCode,
    drainCode,
    gateMv,
    ceMv,
    seMv: PT3.sourceMv,
    vbiasMv: ceMv,
    vzeroMv: gateMv,
    actualVdsMv: ceMv - PT3.sourceMv,
    actualVgsMv: gateMv - PT3.sourceMv,
  };
}

function updatePt3Preview() {
  try {
    const setpoints = calculatePt3Setpoints(readPt3Config());
    elements.pt3VbiasSet.textContent = `${formatMv(setpoints.vbiasMv)} (6-bit code ${setpoints.drainCode})`;
    elements.pt3VzeroSet.textContent = `${formatMv(setpoints.vzeroMv)} (12-bit code ${setpoints.gateCode})`;
    elements.pt3CeSet.textContent = `${formatMv(setpoints.ceMv)}; VDS ${setpoints.actualVdsMv.toFixed(1)} mV`;
    elements.pt3SeSet.textContent = `${formatMv(setpoints.seMv)} fixed`;
    const notch = setpoints.notch ? "SINC2 notch enabled" : "SINC2 notch bypassed";
    elements.pt3TimingHint.textContent = `Raw time stream ≈ ${setpoints.rawSps.toFixed(2)} samples/s; B1 output ≈ ${setpoints.outputSps.toFixed(2)} samples/s (every ${setpoints.outputDecimation} raw conversion; requested ${setpoints.period} ms, actual ≈ ${setpoints.actualOutputPeriodMs.toFixed(2)} ms). ${notch}. Default 90 s settling applies after RUN.`;
  } catch {
    elements.pt3VbiasSet.textContent = "Invalid PT3 input";
    elements.pt3VzeroSet.textContent = "Invalid PT3 input";
    elements.pt3CeSet.textContent = "—";
    elements.pt3TimingHint.textContent = "Enter a PT3 configuration within the firmware guard range.";
  }
}

function readPt3Config() {
  const config = {
    vds: integer("pt3Vds"), vgs: integer("pt3Vgs"), period: integer("pt3Period"), settle: integer("pt3Settle"),
    sinc3: integer("pt3Sinc3"), sinc2: integer("pt3Sinc2"), notch: integer("pt3Notch"),
  };
  const supportedSinc3 = [2, 4, 5];
  const supportedSinc2 = [533, 800, 1067, 1333];
  const timing = calculatePt3Timing(config);
  if (!Object.values(config).every(Number.isFinite) || config.vds < 100 || config.vds > 1100 || config.vgs < -800 || config.vgs > 1000 || config.period < 10 || config.period > 1000 || config.settle < 1000 || config.settle > 120000 || !supportedSinc3.includes(config.sinc3) || !supportedSinc2.includes(config.sinc2) || ![0, 1].includes(config.notch) || timing.rawSps < PT3.minRawSps || timing.rawSps > PT3.maxRawSps || timing.requestedOutputSps > PT3.maxRequestedOutputSps || timing.outputSps > timing.requestedOutputSps * 1.02) throw new Error("PT3 timing or DSP settings are outside the guarded 100–800 raw SPS / 100 target-B1-SPS range.");
  return config;
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
  if (state.mode === "PT3") return readPt3Config();
  const config = { start: integer("cvStart"), vertex: integer("cvVertex"), vzero: integer("cvVzero"), steps: integer("cvSteps"), duration: integer("cvDuration"), settle: integer("cvSettle"), rtia: integer("cvRtia") };
  const pointPeriod = config.duration / config.steps;
  if (config.start === config.vertex || config.start < -1000 || config.start > 1000 || config.vertex < -1000 || config.vertex > 1000 || config.vzero < 200 || config.vzero > 2200 || config.vzero + config.start < 200 || config.vzero + config.start > 2200 || config.vzero + config.vertex < 200 || config.vzero + config.vertex > 2200 || config.steps < 2 || config.steps > 4095 || config.duration < 10 || config.duration > 600000 || config.settle < 2 || config.settle > 1000 || pointPeriod < config.settle + 1 || pointPeriod < 3) throw new Error("CV parameters violate the firmware guard range or timing relation.");
  return config;
}

function configCommand() {
  const config = readConfig();
  if (state.mode === "AMP") return `CFG,AMPX,${config.vzero},${config.bias},${config.period},${config.rtia},${config.rf},${config.pgaX10},${config.sinc3},${config.sinc2},${config.fifoWords},${config.rcal},${config.adcRefMv}`;
  if (state.mode === "PT3") {
    const applied = state.pt3DspSupported ? config : { ...config, sinc3: 5, sinc2: 800, notch: 0 };
    state.pendingPt3 = calculatePt3Setpoints(applied);
    return state.pt3DspSupported
      ? `CFG,PT3,${applied.vds},${applied.vgs},${applied.period},${applied.settle},${applied.sinc3},${applied.sinc2},${applied.notch}`
      : `CFG,PT3,${applied.vds},${applied.vgs},${applied.period},${applied.settle}`;
  }
  return `CFG,CV,${config.start},${config.vertex},${config.vzero},${config.steps},${config.duration},${config.settle},${config.rtia}`;
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
  renderRows(); schedulePlot();
}

function schedulePlot() {
  if (state.plotDrawPending) return;
  state.plotDrawPending = true;
  window.requestAnimationFrame(() => { state.plotDrawPending = false; drawPlot(); });
}

function renderRows() {
  const recent = state.samples.slice(-40).reverse();
  elements.sampleRows.innerHTML = recent.length ? recent.map((s) => {
    const pt3 = s.pt3 ? `CE ${formatMv(s.pt3.ceMv)}, gate ${formatMv(s.pt3.gateMv)}; S3/S2 ${s.pt3.sinc3}/${s.pt3.sinc2}` : "—";
    return `<tr><td>${s.mode}</td><td>${s.index}</td><td>${s.currentUa}</td><td>${pt3}</td><td>${new Date(s.receivedAt).toLocaleTimeString()}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="empty">No binary measurement frames received.</td></tr>';
}

function clearSamples() {
  state.samples = []; elements.sampleCount.textContent = "0 samples"; elements.downloadCsv.disabled = true; renderRows(); drawPlot(); log("Displayed and exportable received sample list cleared.");
}

function downloadCsv() {
  if (!state.samples.length) return;
  const header = "mode,sample_index,calculated_current_uA,received_at_iso,pt3_vbias_dac_set_mV,pt3_vzero_dac_set_mV,pt3_ce0_set_mV,pt3_se0_set_mV,pt3_re0_state,pt3_sinc3_osr,pt3_sinc2_osr,pt3_sinc2_notch_enabled,pt3_raw_sample_rate_sps,pt3_output_decimation,pt3_b1_output_rate_sps,pt3_actual_output_period_ms";
  const rows = state.samples.map((s) => `${s.mode},${s.index},${s.currentUa},${s.receivedAt},${s.pt3 ? s.pt3.vbiasMv : ""},${s.pt3 ? s.pt3.vzeroMv : ""},${s.pt3 ? s.pt3.ceMv : ""},${s.pt3 ? s.pt3.seMv : ""},${s.pt3 ? "OPEN" : ""},${s.pt3 ? s.pt3.sinc3 : ""},${s.pt3 ? s.pt3.sinc2 : ""},${s.pt3 ? s.pt3.notch : ""},${s.pt3 ? s.pt3.rawSps : ""},${s.pt3 ? s.pt3.outputDecimation : ""},${s.pt3 ? s.pt3.outputSps : ""},${s.pt3 ? s.pt3.actualOutputPeriodMs : ""}`);
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
  if (!points.length) { ctx.fillStyle = "#7892a7"; ctx.textAlign = "center"; ctx.fillText("Awaiting received device data", width / 2, height / 2); if (state.mode === "PT3") drawPt3SettingsPlot(); return; }
  let minX = Math.min(...points.map((p) => p.index)); let maxX = Math.max(...points.map((p) => p.index)); let minY = Math.min(...points.map((p) => p.currentUa)); let maxY = Math.max(...points.map((p) => p.currentUa));
  if (minX === maxX) { minX -= 1; maxX += 1; } if (minY === maxY) { minY -= 1; maxY += 1; } const padding = (maxY - minY) * .12; minY -= padding; maxY += padding;
  const px = (x) => margin.left + (x - minX) / (maxX - minX) * chartW; const py = (y) => margin.top + (maxY - y) / (maxY - minY) * chartH;
  ctx.textAlign = "right"; for (let i = 0; i <= 5; i += 1) { const value = maxY - (maxY - minY) * i / 5; ctx.fillText(value.toPrecision(4), margin.left - 7, margin.top + chartH * i / 5 + 4); }
  ctx.textAlign = "center"; for (let i = 0; i <= 6; i += 1) { const value = minX + (maxX - minX) * i / 6; ctx.fillText(Math.round(value), margin.left + chartW * i / 6, height - 12); }
  ctx.strokeStyle = state.mode === "PT3" ? "#63d67d" : "#3fd0e6"; ctx.lineWidth = 1.5; ctx.beginPath(); points.forEach((p, index) => { if (index) ctx.lineTo(px(p.index), py(p.currentUa)); else ctx.moveTo(px(p.index), py(p.currentUa)); }); ctx.stroke();
  ctx.fillStyle = "#c9dce9"; ctx.textAlign = "left"; ctx.fillText("Current (µA)", margin.left, 12); ctx.textAlign = "right"; ctx.fillText("sample index", width - margin.right, height - 12);
  if (state.mode === "PT3") drawPt3SettingsPlot();
}

function drawPt3SettingsPlot() {
  const canvas = elements.pt3SettingsPlot;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
  const ctx = canvas.getContext("2d"); ctx.scale(ratio, ratio);
  const width = rect.width; const height = rect.height;
  const margin = { left: 58, right: 18, top: 27, bottom: 31 }; const chartW = width - margin.left - margin.right; const chartH = height - margin.top - margin.bottom;
  ctx.fillStyle = "#061321"; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = "#1d3d59"; ctx.lineWidth = 1; ctx.font = "11px system-ui"; ctx.fillStyle = "#8da9bd";
  for (let i = 0; i <= 5; i += 1) { const y = margin.top + chartH * i / 5; ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke(); const mv = 2400 - 2200 * i / 5; ctx.textAlign = "right"; ctx.fillText((mv / 1000).toFixed(2), margin.left - 7, y + 4); }
  const points = state.pt3History;
  if (!points.length) { ctx.fillStyle = "#7892a7"; ctx.textAlign = "center"; ctx.fillText("Awaiting @ACK,CFG,PT3 before drawing calculated setpoints", width / 2, height / 2); return; }
  let minX = Math.min(...points.map((p) => Date.parse(p.acknowledgedAt))); let maxX = Math.max(...points.map((p) => Date.parse(p.acknowledgedAt)));
  if (minX === maxX) { minX -= 1000; maxX += 1000; }
  const px = (x) => margin.left + (x - minX) / (maxX - minX) * chartW; const py = (mv) => margin.top + (2400 - mv) / 2200 * chartH;
  const traces = [
    { key: "ceMv", label: "CE0 / VBIAS", color: "#3fd0e6" },
    { key: "seMv", label: "SE0", color: "#3182f6" },
    { key: "gateMv", label: "Gate / VZERO", color: "#63d67d" },
  ];
  traces.forEach((trace) => {
    ctx.strokeStyle = trace.color; ctx.lineWidth = 1.7; ctx.beginPath();
    points.forEach((point, index) => { const x = px(Date.parse(point.acknowledgedAt)); if (index) { ctx.lineTo(x, py(points[index - 1][trace.key])); ctx.lineTo(x, py(point[trace.key])); } else ctx.moveTo(x, py(point[trace.key])); }); ctx.lineTo(width - margin.right, py(points.at(-1)[trace.key])); ctx.stroke();
  });
  ctx.textAlign = "left"; ctx.font = "11px system-ui"; let legendX = margin.left;
  traces.forEach((trace) => { ctx.fillStyle = trace.color; ctx.fillRect(legendX, 9, 9, 3); ctx.fillStyle = "#c9dce9"; ctx.fillText(trace.label, legendX + 14, 13); legendX += ctx.measureText(trace.label).width + 32; });
  ctx.fillStyle = "#c9dce9"; ctx.textAlign = "left"; ctx.fillText("Calculated setpoint (V)", margin.left, height - 10); ctx.textAlign = "right"; ctx.fillText("configuration time", width - margin.right, height - 10);
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

function setDfuStage(stage) {
  const order = ["package", "entry", "transfer", "verify"];
  const current = order.indexOf(stage);
  if (current < 0) throw new Error(`Unknown DFU stage: ${stage}`);
  state.dfu.stage = stage;
  order.forEach((name, index) => {
    const element = elements.dfuStages[name];
    element.classList.toggle("is-complete", index < current);
    element.classList.toggle("is-current", index === current);
    if (index === current) element.setAttribute("aria-current", "step");
    else element.removeAttribute("aria-current");
  });
}

function setDfuProgress(value, text) {
  const percent = Math.max(0, Math.min(100, value));
  state.dfu.progress = percent;
  elements.dfuProgress.style.width = `${percent.toFixed(1)}%`;
  elements.dfuProgressBar.setAttribute("aria-valuenow", percent.toFixed(1));
  elements.dfuProgressPercent.textContent = `${percent.toFixed(1)}%`;
  elements.dfuProgressText.textContent = text;
}

async function onDfuFile() {
  const file = elements.dfuFile.files?.[0]; state.dfu.file = file || null; state.dfu.pkg = null; state.dfu.completed = false; elements.enterDfu.disabled = true; elements.transferDfu.disabled = true; elements.verifyApp.disabled = true;
  setDfuStage("package"); setDfuProgress(0, "Transfer not started.");
  if (!file) { elements.dfuPackageState.textContent = "No package selected."; return; }
  try {
    elements.dfuPackageState.textContent = "Checking ZIP structure…"; setDfuProgress(0, "Inspecting application-only DFU ZIP locally.");
    state.dfu.pkg = await inspectDfuPackage(file);
    elements.dfuPackageState.textContent = `Structure valid: ${state.dfu.pkg.binaryName} (${state.dfu.pkg.binary.length.toLocaleString()} B), ${state.dfu.pkg.datName} (${state.dfu.pkg.dat.length.toLocaleString()} B). Bootloader signature validation is still pending.`;
    elements.enterDfu.disabled = !state.device?.gatt?.connected;
    setDfuStage("entry"); setDfuProgress(0, "ZIP structure verified. Connect the NUS application, then request DFU.");
    log(`DFU ZIP structure checked locally: ${file.name}. The browser did not verify its signature.`);
  } catch (error) {
    elements.dfuPackageState.textContent = `Rejected: ${error.message}`; setDfuStage("package"); setDfuProgress(0, "ZIP rejected before any device write."); log(`DFU ZIP rejected: ${error.message}`, "ERROR");
  }
}

async function enterDfu() {
  if (!state.dfu.pkg || !state.nusRx) return;
  if (!window.confirm("Enter Secure DFU bootloader now? Measurement will stop and the current BLE connection will disconnect.")) return;
  try {
    state.expectDfuDisconnect = true; elements.enterDfu.disabled = true; elements.transferDfu.disabled = true; setDfuStage("entry");
    await sendNusCommand("DFU"); setDfuProgress(0, "DFU command sent. Wait for application disconnect, then select DfuTarg.");
  } catch (error) {
    if (state.expectDfuDisconnect) {
      allowDfuTargetSelection("Application link ended during DFU entry. If DfuTarg is visible, select it to start the CRC-verified transfer.");
      log(`NUS write completed with a disconnect during DFU entry: ${error.message}. DfuTarg selection is now enabled; do not continue unless the chooser shows DfuTarg.`, "WARN");
      return;
    }
    setDfuProgress(0, `DFU entry request failed: ${error.message}`);
    log(`Could not enter DFU: ${error.message}`, "ERROR");
  }
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
  if (!state.dfu.pkg || state.dfu.transferring || state.dfu.completed) return;
  if (!window.confirm("The browser will ask you to select DfuTarg. After selection, this application-only signed ZIP will be transferred with CRC verification. Continue?")) return;
  try {
    setDfuStage("transfer"); setDfuProgress(0, "Choose the intended DfuTarg in the browser device picker.");
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [UUID.dfuService] }] });
    state.dfu.device = device; log(`DfuTarg selected in browser chooser: ${device.name || "unnamed DFU peripheral"}.`); device.addEventListener("gattserverdisconnected", () => log("DFU peripheral disconnected (expected after final execute).")); state.dfu.server = await device.gatt.connect();
    const service = await state.dfu.server.getPrimaryService(UUID.dfuService); state.dfu.control = await service.getCharacteristic(UUID.dfuControl); state.dfu.packet = await service.getCharacteristic(UUID.dfuPacket); await state.dfu.control.startNotifications(); state.dfu.control.addEventListener("characteristicvaluechanged", onDfuControlNotification);
    state.dfu.transferring = true; elements.transferDfu.disabled = true; elements.enterDfu.disabled = true; setDfuProgress(0, "DfuTarg connected. Setting packet receipt notification interval to 1.");
    const prn = new Uint8Array([1, 0]); assertDfuSuccess(await dfuControl(DFU.setPrn, prn), DFU.setPrn);
    await transferObject(DFU.commandObject, state.dfu.pkg.dat, 0, 10, "Init packet"); await transferObject(DFU.dataObject, state.dfu.pkg.binary, 10, 100, "Application");
    state.dfu.completed = true; setDfuStage("verify"); setDfuProgress(100, "Secure DFU transfer protocol completed. Reconnect the application to verify advertising and NUS."); elements.verifyApp.disabled = false; log("DFU protocol complete. Signature acceptance and reboot were decided by the target bootloader; application verification remains required.");
  } catch (error) { setDfuProgress(state.dfu.progress, `DFU stopped after ${state.dfu.progress.toFixed(1)}% CRC-verified transfer: ${error.message}`); log(`DFU failed safely: ${error.message}`, "ERROR"); }
  finally { state.dfu.transferring = false; elements.transferDfu.disabled = !state.dfu.pkg || state.dfu.completed; elements.enterDfu.disabled = !state.device?.gatt?.connected || !state.dfu.pkg || state.dfu.completed; }
}

elements.connect.addEventListener("click", connectInstrument); elements.disconnect.addEventListener("click", disconnectInstrument); elements.ampTab.addEventListener("click", () => switchMode("AMP")); elements.cvTab.addEventListener("click", () => switchMode("CV")); elements.pt3Tab.addEventListener("click", () => switchMode("PT3")); elements.form.addEventListener("submit", applyConfig); elements.run.addEventListener("click", startMeasurement); elements.stop.addEventListener("click", stopMeasurement); elements.probe.addEventListener("click", runAfeProbe); elements.clearData.addEventListener("click", clearSamples); elements.downloadCsv.addEventListener("click", downloadCsv); elements.clearLog.addEventListener("click", () => { elements.eventLog.textContent = ""; }); elements.dfuFile.addEventListener("change", onDfuFile); elements.enterDfu.addEventListener("click", enterDfu); elements.transferDfu.addEventListener("click", selectDfuAndTransfer); elements.verifyApp.addEventListener("click", connectInstrument); window.addEventListener("resize", schedulePlot);
document.querySelectorAll("#ampParameters input, #ampParameters select").forEach((control) => control.addEventListener("input", updateAmpTimingHint));
document.querySelectorAll("#pt3Parameters input, #pt3Parameters select").forEach((control) => { control.addEventListener("input", updatePt3Preview); control.addEventListener("change", updatePt3Preview); });

browserReady(); switchMode("AMP"); updateAmpTimingHint(); updatePt3Preview(); drawPlot();
