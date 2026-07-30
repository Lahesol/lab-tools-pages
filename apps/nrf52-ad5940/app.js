/* AD5940 Lab Console — static Web Bluetooth client.
 *
 * The app never synthesizes measurement values. Legacy A1/B1/C1/D1/E1 and
 * queued B2 binary frames are kept exactly as received. PT3 DAC/pad traces are explicitly configuration-
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
  legacyMaxRequestedOutputSps: 100,
  maxRequestedOutputSps: 200,
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
  dpvSupported: false,
  swvSupported: false,
  pt3Supported: false,
  pt3DspSupported: false,
  pt3CalibrationDftSupported: false,
  pt3LiveDacSupported: false,
  pt3HighRateSupported: false,
  nusB2QueueSupported: false,
  pt3LiveReady: false,
  deviceNameSupported: false,
  deviceName: null,
  nameUpdatePending: null,
  controllerVersion: null,
  releaseManifest: null,
  releaseManifestError: null,
  pendingPt3: null,
  pendingPt3Live: null,
  pt3Applied: null,
  pt3History: [],
  pendingPulse: { DPV: null, SWV: null },
  pulseApplied: { DPV: null, SWV: null },
  pulsePairs: { DPV: null, SWV: null },
  pulseDerived: [],
  lastIndexByMode: { AMP: null, CV: null, DPV: null, SWV: null, PT3: null },
  pendingRunBoundaryByMode: { AMP: false, CV: false, DPV: false, SWV: false, PT3: false },
  missingSamples: 0,
  b2Notifications: 0,
  legacyNotifications: 0,
  firmwareQueueDepth: null,
  firmwareOverflowSamples: null,
  firmwareBackpressureEvents: null,
  plotWindowSamples: 256,
  expectDfuDisconnect: false,
  plotDrawPending: false,
  dfu: { file: null, pkg: null, device: null, server: null, control: null, packet: null, waiter: null, transferring: false, completed: false, progress: 0, stage: "package", queuedDeviceName: null, nameDispatchAttempted: false },
};

const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const dec = new TextDecoder();
const elements = {
  connectionDot: $("connectionDot"), connectionLabel: $("connectionLabel"), connect: $("connectButton"), disconnect: $("disconnectButton"),
  browserState: $("browserState"), deviceState: $("deviceState"), deviceNameState: $("deviceNameState"), controllerVersion: $("controllerVersion"), dfuUpdateState: $("dfuUpdateState"), lastStatus: $("lastStatus"),
  ampTab: $("ampTab"), cvTab: $("cvTab"), dpvTab: $("dpvTab"), swvTab: $("swvTab"), pt3Tab: $("pt3Tab"), ampParameters: $("ampParameters"), cvParameters: $("cvParameters"), dpvParameters: $("dpvParameters"), swvParameters: $("swvParameters"), pt3Parameters: $("pt3Parameters"),
  ampTimingHint: $("ampTimingHint"), ampCapabilityHint: $("ampCapabilityHint"), dpvTimingHint: $("dpvTimingHint"), dpvCapabilityHint: $("dpvCapabilityHint"), swvTimingHint: $("swvTimingHint"), swvCapabilityHint: $("swvCapabilityHint"), pt3TimingHint: $("pt3TimingHint"), pt3CapabilityHint: $("pt3CapabilityHint"),
  pt3VbiasSet: $("pt3VbiasSet"), pt3VzeroSet: $("pt3VzeroSet"), pt3CeSet: $("pt3CeSet"), pt3SeSet: $("pt3SeSet"), pt3SettingsPanel: $("pt3SettingsPanel"), pt3SettingsPlot: $("pt3SettingsCanvas"), pt3RouteState: $("pt3RouteState"), pt3Vds: $("pt3Vds"), pt3Vgs: $("pt3Vgs"), pt3Period: $("pt3Period"), pt3Settle: $("pt3Settle"), pt3Sinc3: $("pt3Sinc3"), pt3Sinc2: $("pt3Sinc2"), pt3Notch: $("pt3Notch"), pt3CalDft: $("pt3CalDft"), pt3Live: $("pt3LiveButton"),
  form: $("experimentForm"), apply: $("applyButton"), run: $("runButton"), stop: $("stopButton"),
  probe: $("probeButton"),
  plot: $("plotCanvas"), plotTitle: $("plotTitle"), plotCaption: $("plotCaption"), sampleRows: $("sampleRows"), sampleCount: $("sampleCount"), transportState: $("transportState"),
  pulseDiagramPanel: $("pulseDiagramPanel"), pulseDiagramTitle: $("pulseDiagramTitle"), pulseDiagramMetric: $("pulseDiagramMetric"), dpvWaveform: $("dpvWaveform"), swvWaveform: $("swvWaveform"), pulseTermOne: $("pulseTermOne"), pulseTermOneValue: $("pulseTermOneValue"), pulseTermTwo: $("pulseTermTwo"), pulseTermTwoValue: $("pulseTermTwoValue"), pulseTermFrequency: $("pulseTermFrequency"), pulseTermDelay: $("pulseTermDelay"), pulseAdiPotential: $("pulseAdiPotential"), pulseStandardPotential: $("pulseStandardPotential"), dpvAdiPotential: $("dpvAdiPotential"), dpvStandardPotential: $("dpvStandardPotential"), swvAdiPotential: $("swvAdiPotential"), swvStandardPotential: $("swvStandardPotential"), pulseDiagramCaption: $("pulseDiagramCaption"),
  clearData: $("clearDataButton"), downloadCsv: $("downloadCsvButton"), plotWindow: $("plotWindowSamples"), eventLog: $("eventLog"), clearLog: $("clearLogButton"),
  dfuFile: $("dfuFile"), dfuPackageState: $("dfuPackageState"), dfuDeviceName: $("dfuDeviceName"), dfuDeviceNameState: $("dfuDeviceNameState"), applyDeviceName: $("applyDeviceNameButton"), enterDfu: $("enterDfuButton"), transferDfu: $("transferDfuButton"),
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

function validateReleaseManifest(value) {
  const release = value?.release;
  if (!Number.isInteger(release?.controller_version) || release.controller_version < 1) throw new Error("controller_version is invalid.");
  if (!Number.isInteger(release?.secure_dfu_application_version) || release.secure_dfu_application_version < 1) throw new Error("secure_dfu_application_version is invalid.");
  if (typeof release.package_filename !== "string" || !release.package_filename.endsWith(".zip")) throw new Error("package_filename is invalid.");
  if (typeof release.package_sha256 !== "string" || !/^[0-9a-f]{64}$/i.test(release.package_sha256)) throw new Error("package_sha256 is invalid.");
  return {
    controllerVersion: release.controller_version,
    secureDfuApplicationVersion: release.secure_dfu_application_version,
    packageFilename: release.package_filename,
    packageSha256: release.package_sha256.toUpperCase(),
    packageSizeBytes: Number.isInteger(release.package_size_bytes) ? release.package_size_bytes : null,
    capability: typeof release.capability === "string" ? release.capability : "unspecified",
  };
}

function refreshReleaseState() {
  elements.controllerVersion.textContent = state.controllerVersion === null ? "Awaiting @INFO" : `V${state.controllerVersion}`;
  const release = state.releaseManifest;
  if (!release) {
    elements.dfuUpdateState.textContent = state.releaseManifestError ? "Signed-release catalogue unavailable; DFU selection remains manual." : "Loading signed-release catalogue…";
    return;
  }
  const listed = `V${release.controllerVersion} / Secure DFU app ${release.secureDfuApplicationVersion}`;
  if (state.controllerVersion === null) {
    elements.dfuUpdateState.textContent = `Latest listed: ${listed}. Connect to compare.`;
  } else if (state.controllerVersion < release.controllerVersion) {
    elements.dfuUpdateState.textContent = `Update available: ${listed}. Select the listed signed ZIP.`;
  } else if (state.controllerVersion === release.controllerVersion) {
    elements.dfuUpdateState.textContent = `Current: ${listed}. No newer listed package.`;
  } else {
    elements.dfuUpdateState.textContent = `Board V${state.controllerVersion} is newer than listed ${listed}; do not downgrade.`;
  }
}

async function loadReleaseManifest() {
  try {
    const response = await fetch("./firmware/latest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.releaseManifest = validateReleaseManifest(await response.json());
    state.releaseManifestError = null;
    log(`Signed-release catalogue loaded: V${state.releaseManifest.controllerVersion}, Secure DFU app ${state.releaseManifest.secureDfuApplicationVersion}.`);
  } catch (error) {
    state.releaseManifest = null;
    state.releaseManifestError = error.message;
    log(`Signed-release catalogue unavailable: ${error.message}.`, "WARN");
  }
  refreshReleaseState();
}

function refreshControlAvailability() {
  const connected = isInstrumentConnected();
  const modeReady = state.mode === "AMP" ? state.ampxSupported
    : state.mode === "DPV" ? state.dpvSupported
      : state.mode === "SWV" ? state.swvSupported
        : state.mode === "PT3" ? state.pt3Supported : true;
  const canConfigure = connected && !state.running && modeReady;
  const pt3Running = connected && state.running && state.mode === "PT3";
  const canLivePt3Dac = pt3Running && state.pt3LiveDacSupported && state.pt3LiveReady && Boolean(state.pt3Applied) && !state.pendingPt3Live;
  elements.apply.disabled = !canConfigure;
  elements.run.disabled = !canConfigure;
  elements.stop.disabled = !connected || !state.running;
  elements.probe.disabled = !connected || state.running;
  elements.pt3Live.disabled = !canLivePt3Dac;
  [elements.ampTab, elements.cvTab, elements.dpvTab, elements.swvTab, elements.pt3Tab].forEach((tab) => { tab.disabled = connected && state.running; });
  [elements.pt3Vds, elements.pt3Vgs].forEach((control) => { control.disabled = pt3Running && !canLivePt3Dac; });
  [elements.pt3Period, elements.pt3Settle].forEach((control) => { control.disabled = pt3Running; });

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

  const refreshPulseCapability = (mode, supported, hint) => {
    hint.classList.toggle("ready", connected && supported);
    if (!connected) {
      hint.textContent = `Connect to check ${mode} firmware capability before applying paired-pulse parameters.`;
    } else if (supported) {
      hint.textContent = `${mode} capability detected. The board emits two raw frames per staircase step; the browser derives I₂ − I₁ only after preserving both raw frames.`;
    } else if (state.mode === mode) {
      hint.textContent = `This controller does not advertise ${mode}. Install controller V37 or later before using this tab.`;
    } else {
      hint.textContent = `${mode} capability is required only for this paired-pulse measurement tab.`;
    }
  };
  refreshPulseCapability("DPV", state.dpvSupported, elements.dpvCapabilityHint);
  refreshPulseCapability("SWV", state.swvSupported, elements.swvCapabilityHint);

  elements.pt3CapabilityHint.classList.toggle("ready", connected && state.pt3Supported);
  [elements.pt3Sinc3, elements.pt3Sinc2, elements.pt3Notch].forEach((control) => { control.disabled = !connected || !state.pt3DspSupported || pt3Running; });
  elements.pt3CalDft.disabled = !connected || !state.pt3CalibrationDftSupported || pt3Running;
  elements.pt3Period.min = state.pt3HighRateSupported ? "5" : "10";
  if (!connected) {
    elements.pt3CapabilityHint.textContent = "Connect to check PT3 firmware capability before applying phototransistor parameters.";
  } else if (state.pt3Supported && state.pt3HighRateSupported && state.nusB2QueueSupported) {
    elements.pt3CapabilityHint.textContent = "V39 PT3_200SPS + NUS_B2_QUEUE detected. A 5 ms target requests the 200 SPS raw stream with queued three-sample BLE batches; queue overflow is reported, never hidden.";
  } else if (state.pt3Supported && state.pt3LiveDacSupported) {
    elements.pt3CapabilityHint.textContent = "PT3_DSP + PT3_CAL_DFT + PT3_LIVE_DAC detected. After @EVT,RUNNING,PT3, VDS/VGS can be written live without re-running RTIA calibration.";
  } else if (state.pt3Supported && state.pt3CalibrationDftSupported) {
    elements.pt3CapabilityHint.textContent = "PT3_DSP + PT3_CAL_DFT detected. DAC, timing, SINC, notch, and RTIA-calibration DFT points are applied together before RUN; live VDS/VGS requires V36.";
  } else if (state.pt3Supported && state.pt3DspSupported) {
    elements.pt3CapabilityHint.textContent = "PT3_DSP detected. DAC, timing, SINC3/SINC2, and notch are applied together before RUN; RTIA-calibration DFT points remain at the safe 1024-point default.";
  } else if (state.pt3Supported) {
    elements.pt3CapabilityHint.textContent = "Basic PT3 detected. The proven SINC3=5 / SINC2=800 / notch-bypass profile is used; install V34 for DSP controls.";
  } else if (state.mode === "PT3") {
    elements.pt3CapabilityHint.textContent = "This controller does not advertise PT3. Install controller firmware V29 or later before using this mode.";
  } else {
    elements.pt3CapabilityHint.textContent = "PT3 capability is required only for the phototransistor controls.";
  }
  refreshDeviceNameUi();
}

function setConnection(connected, text = "Instrument disconnected") {
  elements.connectionDot.classList.toggle("connected", connected);
  elements.connectionLabel.textContent = text;
  elements.deviceState.textContent = connected && state.device ? (state.device.name || "Unnamed NUS peripheral") : "—";
  elements.connect.disabled = connected || !navigator.bluetooth;
  elements.disconnect.disabled = !connected;
  refreshControlAvailability();
  refreshReleaseState();
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

function normalizedDeviceName(value = elements.dfuDeviceName.value) {
  const name = value.trim();
  if (!name) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,19}$/.test(name)) {
    throw new Error("BLE name must be 1–20 ASCII letters, digits, spaces, underscores, or hyphens, without leading or trailing spaces.");
  }
  return name;
}

function refreshDeviceNameUi() {
  const connected = isInstrumentConnected();
  elements.deviceNameState.textContent = connected ? (state.deviceName || state.device?.name || "Unknown") : "—";
  elements.applyDeviceName.disabled = !connected || !state.deviceNameSupported || Boolean(state.nameUpdatePending);
}

async function requestDeviceNameUpdate(requestedName, origin = "manual") {
  if (!requestedName) throw new Error("Enter a BLE display name first.");
  if (!state.deviceNameSupported) throw new Error("The connected firmware does not advertise persistent NAME_NVM support; install V38 or later.");
  if (state.nameUpdatePending) throw new Error("A BLE name write is already pending.");
  state.nameUpdatePending = requestedName;
  refreshDeviceNameUi();
  elements.dfuDeviceNameState.textContent = `Saving “${requestedName}” in the board’s DFU-preserved name area…`;
  try {
    await sendNusCommand(`NAME,${requestedName}`);
    log(`Persistent BLE name request sent (${origin}): ${requestedName}.`);
  } catch (error) {
    state.nameUpdatePending = null;
    refreshDeviceNameUi();
    elements.dfuDeviceNameState.textContent = `Name write was not accepted: ${error.message}`;
    throw error;
  }
}

async function applyDeviceNameNow() {
  try {
    await requestDeviceNameUpdate(normalizedDeviceName(), "manual");
  } catch (error) {
    log(error.message, "ERROR");
  }
}

function maybeApplyQueuedDeviceName() {
  const requestedName = state.dfu.queuedDeviceName;
  if (!requestedName || state.dfu.nameDispatchAttempted || state.nameUpdatePending) return;
  if (!state.deviceNameSupported) {
    state.dfu.nameDispatchAttempted = true;
    elements.dfuDeviceNameState.textContent = `Queued name “${requestedName}” was not sent: this firmware does not advertise NAME_NVM.`;
    log("Queued BLE name retained but not applied because the reconnected firmware lacks NAME_NVM.", "WARN");
    return;
  }
  state.dfu.nameDispatchAttempted = true;
  void requestDeviceNameUpdate(requestedName, "post-DFU queued").catch((error) => log(`Queued BLE name failed: ${error.message}`, "ERROR"));
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

function modeForSourceFrame(sourceType) {
  if (sourceType === 0xa1) return "AMP";
  if (sourceType === 0xb1) return "PT3";
  if (sourceType === 0xc1) return "CV";
  if (sourceType === 0xd1) return "DPV";
  if (sourceType === 0xe1) return "SWV";
  return null;
}

function resetModeTransportBoundary(mode) {
  if (!Object.hasOwn(state.lastIndexByMode, mode)) return;
  state.lastIndexByMode[mode] = null;
  state.pendingRunBoundaryByMode[mode] = true;
}

function annotateTransport(sample) {
  const previous = state.lastIndexByMode[sample.mode];
  let gapBefore = 0;
  let runBoundary = state.pendingRunBoundaryByMode[sample.mode];
  state.pendingRunBoundaryByMode[sample.mode] = false;
  if (!runBoundary && previous !== null) {
    if (sample.index > previous + 1) gapBefore = sample.index - previous - 1;
    else if (sample.index <= previous) runBoundary = true;
  }
  state.lastIndexByMode[sample.mode] = sample.index;
  state.missingSamples += gapBefore;
  return { ...sample, transport: { ...sample.transport, gapBefore, runBoundary } };
}

function updateCaptureSummary() {
  const frameSummary = `${state.b2Notifications} B2 batch / ${state.legacyNotifications} legacy notification`;
  const gapSummary = state.missingSamples ? `${state.missingSamples} indexed sample gap${state.missingSamples === 1 ? "" : "s"}` : "no indexed gaps";
  const queueSummary = state.firmwareOverflowSamples === null ? "firmware queue status awaiting STATUS?" : `FW queue ${state.firmwareQueueDepth ?? "?"}; overflow ${state.firmwareOverflowSamples}`;
  elements.transportState.textContent = `${frameSummary}; ${gapSummary}; ${queueSummary}`;
  elements.plotCaption.textContent = `Received data are displayed at their original sample indexes. Trace segments break across known index gaps or run boundaries; no current values are smoothed, filled, or interpolated. ${frameSummary}; ${gapSummary}.`;
}

function updateFirmwareTransportStatus(line) {
  const value = (key) => {
    const match = line.match(new RegExp(`(?:^|,)${key}=(\\d+)(?:,|$)`));
    return match ? Number(match[1]) : null;
  };
  const queueDepth = value("Q");
  const overflow = value("OVF") ?? value("DROP");
  const backpressure = value("BP");
  if (queueDepth === null && overflow === null && backpressure === null) return;
  const overflowChanged = overflow !== null && overflow !== state.firmwareOverflowSamples;
  state.firmwareQueueDepth = queueDepth;
  state.firmwareOverflowSamples = overflow;
  state.firmwareBackpressureEvents = backpressure;
  if (overflowChanged && overflow > 0) log(`Firmware reports ${overflow} actual transport-overflow sample(s); indexed gaps remain visible and are never fabricated.`, "WARN");
  updateCaptureSummary();
}

function handleTextLine(line) {
  log(`NUS RX: ${line}`);
  elements.lastStatus.textContent = line;
  if (line.startsWith("@EVT,RUNNING")) {
    const mode = line.match(/^@EVT,RUNNING,(AMP|CV|DPV|SWV|PT3)(?:,|$)/)?.[1];
    state.running = true;
    if (mode) resetModeTransportBoundary(mode);
  }
  if (line.startsWith("@EVT,RUNNING,DPV") || line.startsWith("@EVT,RUNNING,SWV")) {
    const mode = line.startsWith("@EVT,RUNNING,DPV") ? "DPV" : "SWV";
    state.pulsePairs[mode] = null;
    state.pulseDerived = state.pulseDerived.filter((sample) => sample.mode !== mode);
    log(`${mode} derived display reset for this run; previously received raw frames remain in the CSV list.`);
  }
  if (line.startsWith("@EVT,RUNNING,PT3")) state.pt3LiveReady = true;
  if (line.startsWith("@EVT,PT3_SETTLING")) { state.running = true; state.pt3LiveReady = false; }
  if (line.startsWith("@EVT,STOPPED") || line.startsWith("@EVT,CV_COMPLETE") || line.startsWith("@EVT,DPV_COMPLETE") || line.startsWith("@EVT,SWV_COMPLETE") || line.startsWith("@ERR,")) { state.running = false; state.pt3LiveReady = false; state.pendingPt3Live = null; }
  if (line.startsWith("@ERR,DPV")) state.pendingPulse.DPV = null;
  if (line.startsWith("@ERR,SWV")) state.pendingPulse.SWV = null;
  if (line.startsWith("@STATUS,")) updateFirmwareTransportStatus(line);
  if (line.startsWith("@INFO,")) {
    const versionMatch = line.match(/^@INFO,AD5940_CTRL,V(\d+)(?:,|$)/);
    if (versionMatch) state.controllerVersion = Number(versionMatch[1]);
    else if (line.startsWith("@INFO,AD5940_CTRL")) state.controllerVersion = null;
    state.ampxSupported = line.includes("AMPX");
    state.dpvSupported = line.includes("DPV");
    state.swvSupported = line.includes("SWV");
    state.pt3Supported = line.includes("PT3");
    state.pt3DspSupported = line.includes("PT3_DSP");
    state.pt3CalibrationDftSupported = line.includes("PT3_CAL_DFT");
    state.pt3LiveDacSupported = line.includes("PT3_LIVE_DAC");
    state.pt3HighRateSupported = line.includes("PT3_200SPS");
    state.nusB2QueueSupported = line.includes("NUS_B2_QUEUE");
    state.deviceNameSupported = line.includes("NAME_NVM");
    refreshReleaseState();
    if (line.startsWith("@INFO,AD5940_CTRL") && state.controllerVersion === null) log("Controller @INFO did not include a parseable AD5940_CTRL release.", "WARN");
    log(state.ampxSupported ? "AMPX capability detected." : "AMPX capability not advertised by this firmware.", state.ampxSupported ? "INFO" : "WARN");
    log(state.dpvSupported ? "DPV paired-pulse capability detected." : "DPV capability not advertised by this firmware.", state.dpvSupported ? "INFO" : "WARN");
    log(state.swvSupported ? "SWV paired-pulse capability detected." : "SWV capability not advertised by this firmware.", state.swvSupported ? "INFO" : "WARN");
    log(state.pt3HighRateSupported && state.nusB2QueueSupported ? "PT3 200 SPS and queued B2 transport capability detected." : state.pt3LiveDacSupported ? "PT3 DSP, RTIA-calibration DFT, and live VDS/VGS capability detected." : state.pt3CalibrationDftSupported ? "PT3 DSP and RTIA-calibration DFT capability detected; live VDS/VGS requires V36." : state.pt3DspSupported ? "PT3 DSP capability detected; calibration DFT control requires V35." : state.pt3Supported ? "Basic PT3 capability detected; DSP controls require V34." : "PT3 capability not advertised by this firmware.", state.pt3Supported ? "INFO" : "WARN");
    if (line.startsWith("@INFO,AD5940_CTRL")) maybeApplyQueuedDeviceName();
  }
  if (line === "@NAME,SAVING" || line === "@NAME,ERASING") {
    elements.dfuDeviceNameState.textContent = line === "@NAME,ERASING" ? "Name storage is compacting; keep the board powered." : "Name storage write accepted; waiting for flash completion.";
  }
  if (line === "@ACK,NAME") {
    const savedName = state.nameUpdatePending;
    state.nameUpdatePending = null;
    if (savedName) {
      state.deviceName = savedName;
      if (state.dfu.queuedDeviceName === savedName) state.dfu.queuedDeviceName = null;
      elements.dfuDeviceName.value = savedName;
      elements.dfuDeviceNameState.textContent = `Saved “${savedName}”. Disconnect and scan again to see the new advertised name.`;
      log(`Persistent BLE name saved: ${savedName}. Reconnect or rescan to observe the updated advertisement.`);
    }
  }
  if (line.startsWith("@ERR,NAME")) {
    state.nameUpdatePending = null;
    elements.dfuDeviceNameState.textContent = `Board rejected the name request (${line}). The previous stored name remains in use.`;
  }
  if (line.startsWith("@ACK,CFG,PT3") && state.pendingPt3) {
    state.pt3Applied = { ...state.pendingPt3, updateKind: "CONFIG", acknowledgedAt: new Date().toISOString() };
    state.pt3History.push(state.pt3Applied);
    state.pendingPt3 = null;
    elements.pt3RouteState.textContent = `ACK: ${state.pt3Applied.rawSps.toFixed(1)} raw SPS → ${state.pt3Applied.outputSps.toFixed(1)} output SPS; S3 ${state.pt3Applied.sinc3}, S2 ${state.pt3Applied.sinc2}, cal DFT ${state.pt3Applied.calDft}`;
    log("PT3 configuration acknowledged; DAC/pad trace and DSP metadata updated.");
    schedulePlot();
  }
  if ((line.startsWith("@ACK,CFG,DPV") || line.startsWith("@ACK,CFG,SWV"))) {
    const mode = line.startsWith("@ACK,CFG,DPV") ? "DPV" : "SWV";
    if (state.pendingPulse[mode]) {
      state.pulseApplied[mode] = { ...state.pendingPulse[mode], acknowledgedAt: new Date().toISOString() };
      state.pendingPulse[mode] = null;
      log(`${mode} potential convention acknowledged: VRE−VSE command with EWE−RE comparison metadata.`);
    }
  }
  if (line.startsWith("@ACK,LIVE,PT3") && state.pendingPt3Live) {
    state.pt3Applied = { ...state.pendingPt3Live, updateKind: "LIVE", acknowledgedAt: new Date().toISOString() };
    state.pt3History.push(state.pt3Applied);
    state.pendingPt3Live = null;
    elements.pt3RouteState.textContent = `LIVE ACK: VDS ${state.pt3Applied.actualVdsMv.toFixed(1)} mV; VGS ${state.pt3Applied.actualVgsMv.toFixed(1)} mV. Raw B1 data remains unfiltered.`;
    log("Live PT3 DAC update acknowledged; subsequent raw B1 samples carry the new setpoint metadata.");
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
  if (bytes.length === 9 && (bytes[0] === 0xa1 || bytes[0] === 0xb1 || bytes[0] === 0xc1 || bytes[0] === 0xd1 || bytes[0] === 0xe1)) {
    const view = new DataView(bytes.buffer);
    const index = view.getUint32(1, true);
    const currentUa = view.getFloat32(5, true);
    const mode = bytes[0] === 0xa1 ? "AMP" : bytes[0] === 0xb1 ? "PT3" : bytes[0] === 0xc1 ? "CV" : bytes[0] === 0xd1 ? "DPV" : "SWV";
    const sample = { mode, index, currentUa, receivedAt: new Date().toISOString(), pt3: mode === "PT3" && state.pt3Applied ? { ...state.pt3Applied } : null };
    if (mode === "DPV" || mode === "SWV") addPulseRawSample(sample);
    else addSample(sample);
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
    state.ampxSupported = false; state.dpvSupported = false; state.swvSupported = false; state.pt3Supported = false; state.pt3DspSupported = false; state.pt3CalibrationDftSupported = false; state.pt3LiveDacSupported = false; state.pt3HighRateSupported = false; state.nusB2QueueSupported = false; state.pt3LiveReady = false; state.deviceNameSupported = false; state.deviceName = device.name || null; state.nameUpdatePending = null; state.pendingPulse = { DPV: null, SWV: null }; state.pulseApplied = { DPV: null, SWV: null }; state.pulsePairs = { DPV: null, SWV: null }; state.controllerVersion = null;
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
  state.nusRx = null; state.nusTx = null; state.server = null; state.running = false; state.ampxSupported = false; state.dpvSupported = false; state.swvSupported = false; state.pt3Supported = false; state.pt3DspSupported = false; state.pt3CalibrationDftSupported = false; state.pt3LiveDacSupported = false; state.pt3HighRateSupported = false; state.nusB2QueueSupported = false; state.pt3LiveReady = false; state.deviceNameSupported = false; state.nameUpdatePending = null; state.pendingPulse = { DPV: null, SWV: null }; state.pulseApplied = { DPV: null, SWV: null }; state.pulsePairs = { DPV: null, SWV: null }; state.pendingPt3Live = null; state.controllerVersion = null;
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
  if (state.running && mode !== state.mode) {
    log("Stop the active acquisition before switching measurement modes.", "WARN");
    return;
  }
  state.mode = mode;
  const amp = mode === "AMP";
  const cv = mode === "CV";
  const dpv = mode === "DPV";
  const swv = mode === "SWV";
  [[elements.ampTab, amp], [elements.cvTab, cv], [elements.dpvTab, dpv], [elements.swvTab, swv], [elements.pt3Tab, mode === "PT3"]].forEach(([tab, active]) => {
    tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active));
  });
  elements.ampParameters.classList.toggle("hidden", !amp); elements.cvParameters.classList.toggle("hidden", !cv); elements.dpvParameters.classList.toggle("hidden", !dpv); elements.swvParameters.classList.toggle("hidden", !swv); elements.pt3Parameters.classList.toggle("hidden", mode !== "PT3");
  elements.pt3SettingsPanel.classList.toggle("hidden", mode !== "PT3");
  elements.pulseDiagramPanel.classList.toggle("hidden", !(dpv || swv));
  if (amp) {
    elements.plotTitle.textContent = "Amperometry — current vs sample index";
    elements.plotCaption.textContent = "Each received A1 current value is drawn without smoothing or rescaling.";
  } else if (cv) {
    elements.plotTitle.textContent = "Cyclic voltammetry — current vs sequence sample index";
    elements.plotCaption.textContent = "Each received C1 current value is drawn against the sequence sample index. Voltage mapping is intentionally not inferred in the browser.";
  } else if (dpv || swv) {
    const name = dpv ? "Differential pulse voltammetry (DPV)" : "Square-wave voltammetry (SWV)";
    const frame = dpv ? "D1" : "E1";
    elements.plotTitle.textContent = `${name} — I₂ − I₁ vs staircase pair index`;
    elements.plotCaption.textContent = `The plot is a derived I₂ − I₁ view only. Every raw ${frame} current frame, its phase, and derived difference remain separately exportable in CSV.`;
    updatePulsePreview(mode);
  } else {
    elements.plotTitle.textContent = "Phototransistor (PT3) — current vs sample index";
    elements.plotCaption.textContent = "Each received B1 current value is drawn without smoothing or rescaling. DAC and PAD traces below are acknowledged configuration-derived setpoints, not measured voltages.";
    updatePt3Preview();
  }
  refreshControlAvailability();
  schedulePlot();
}

function integer(id) { return Math.trunc(Number($(id).value)); }

function formatSignedMv(value) {
  const rounded = Math.round(value);
  return `${rounded < 0 ? "−" : "+"}${Math.abs(rounded)} mV`;
}

function readPulseConfig(mode) {
  const prefix = mode.toLowerCase();
  const config = {
    mode,
    start: integer(`${prefix}Start`), end: integer(`${prefix}End`), vzero: integer(`${prefix}Vzero`), step: integer(`${prefix}Step`),
    pulse: integer(`${prefix}Pulse`), frequency: integer(`${prefix}Frequency`), delay: integer(`${prefix}Delay`), rtia: integer(`${prefix}Rtia`), sinc3: integer(`${prefix}Sinc3`),
  };
  const span = config.end - config.start;
  const fullSteps = span / config.step;
  const rawSamples = 2 * fullSteps;
  const halfPeriodMs = 500 / config.frequency;
  const supportedRtia = [1000, 4000, 10000, 20000, 40000, 100000, 160000];
  const supportedSinc3 = [2, 4, 5];
  if (!Object.values(config).filter((value) => typeof value === "number").every(Number.isFinite)
    || config.start < -900 || config.start > 900 || config.end < -900 || config.end > 900 || config.end <= config.start
    || config.vzero < 200 || config.vzero > 2200 || config.step < 1 || config.step > 25 || span % config.step
    || config.pulse < 1 || config.pulse > 200 || config.frequency < 1 || config.frequency > 100 || config.delay < 1 || config.delay > 100
    || !supportedRtia.includes(config.rtia) || !supportedSinc3.includes(config.sinc3) || rawSamples < 4 || rawSamples > 512
    || config.delay >= halfPeriodMs - 1 || config.vzero + config.start - config.pulse < 200 || config.vzero + config.end + config.pulse > 2200) {
    throw new Error(`${mode} parameters violate the guarded potential, sequence-length, or sample-timing range.`);
  }
  return {
    ...config,
    rawSamples,
    pairCount: rawSamples / 2,
    halfPeriodMs,
    adiStartMv: config.start,
    adiEndMv: config.end,
    standardEweReStartMv: -config.start,
    standardEweReEndMv: -config.end,
  };
}

function updatePulsePreview(mode) {
  const isDpv = mode === "DPV";
  const hint = isDpv ? elements.dpvTimingHint : elements.swvTimingHint;
  try {
    const config = readPulseConfig(mode);
    const termOne = isDpv ? "ΔE — staircase increment" : "ΔE — staircase increment";
    const termTwo = isDpv ? "Pulse A — increment about step" : "Square-wave A — alternating amplitude";
    const adiTrace = `${formatSignedMv(config.adiStartMv)} → ${formatSignedMv(config.adiEndMv)}`;
    const standardTrace = `${formatSignedMv(config.standardEweReStartMv)} → ${formatSignedMv(config.standardEweReEndMv)}`;
    hint.textContent = `${config.rawSamples} raw ${mode} frames / ${config.pairCount} I₂ − I₁ pairs. ADI command VRE−VSE: ${adiTrace}; standard EWE−RE comparison: ${standardTrace}. Paired-pulse schedule: ${config.frequency} Hz (${config.halfPeriodMs.toFixed(2)} ms half-period); current is sampled ${config.delay} ms after each phase command.`;
    elements.pulseDiagramTitle.textContent = isDpv ? "DPV waveform and sampled pair" : "SWV waveform and sampled pair";
    elements.pulseDiagramMetric.textContent = `${config.pairCount} pairs · ${config.frequency} Hz`;
    elements.dpvWaveform.classList.toggle("hidden", !isDpv); elements.swvWaveform.classList.toggle("hidden", isDpv);
    elements.pulseTermOne.textContent = termOne; elements.pulseTermOneValue.textContent = `${config.step} mV`;
    elements.pulseTermTwo.textContent = termTwo; elements.pulseTermTwoValue.textContent = `${config.pulse} mV`;
    elements.pulseTermFrequency.textContent = `f — paired-pulse frequency: ${config.frequency} Hz (${config.halfPeriodMs.toFixed(2)} ms half-period)`;
    elements.pulseTermDelay.textContent = `tₛ — sample delay after each phase: ${config.delay} ms; Vzero: ${config.vzero} mV; RTIA: ${(config.rtia / 1000).toFixed(config.rtia < 10000 ? 0 : 1)} kΩ; SINC3: ${config.sinc3}`;
    elements.pulseAdiPotential.textContent = adiTrace; elements.pulseStandardPotential.textContent = standardTrace;
    (isDpv ? elements.dpvAdiPotential : elements.swvAdiPotential).textContent = adiTrace;
    (isDpv ? elements.dpvStandardPotential : elements.swvStandardPotential).textContent = standardTrace;
    elements.pulseDiagramCaption.textContent = `Diagram shows configured ${mode} terms, not a measured potential trace. Firmware commands VRE−VSE = VBIAS−VZERO; EWE−RE is the sign-inverted comparison. ADI paired-pulse sequencing sends two raw ${isDpv ? "D1" : "E1"} current frames per step; the display derives I₂ − I₁ only after both frames arrive.`;
  } catch {
    hint.textContent = "Enter a complete, guarded paired-pulse configuration to calculate frame count and timing.";
    elements.pulseDiagramMetric.textContent = "Invalid configuration";
    elements.pulseAdiPotential.textContent = "Invalid"; elements.pulseStandardPotential.textContent = "Invalid";
    (isDpv ? elements.dpvAdiPotential : elements.swvAdiPotential).textContent = "Invalid";
    (isDpv ? elements.dpvStandardPotential : elements.swvStandardPotential).textContent = "Invalid";
  }
}

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
    elements.pt3TimingHint.textContent = `Raw time stream ≈ ${setpoints.rawSps.toFixed(2)} samples/s; B1 output ≈ ${setpoints.outputSps.toFixed(2)} samples/s (every ${setpoints.outputDecimation} raw conversion; requested ${setpoints.period} ms, actual ≈ ${setpoints.actualOutputPeriodMs.toFixed(2)} ms). ${notch}. RTIA calibration uses ${setpoints.calDft}-point DFT only; it does not filter B1 samples. Default 90 s settling applies after RUN.`;
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
    sinc3: integer("pt3Sinc3"), sinc2: integer("pt3Sinc2"), notch: integer("pt3Notch"), calDft: integer("pt3CalDft"),
  };
  const supportedSinc3 = [2, 4, 5];
  const supportedSinc2 = [533, 800, 1067, 1333];
  const supportedCalibrationDft = [256, 512, 1024, 2048, 4096];
  const timing = calculatePt3Timing(config);
  if (!Object.values(config).every(Number.isFinite) || config.vds < 100 || config.vds > 1100 || config.vgs < -800 || config.vgs > 1000 || config.period < 10 || config.period > 1000 || config.settle < 1000 || config.settle > 120000 || !supportedSinc3.includes(config.sinc3) || !supportedSinc2.includes(config.sinc2) || ![0, 1].includes(config.notch) || !supportedCalibrationDft.includes(config.calDft) || timing.rawSps < PT3.minRawSps || timing.rawSps > PT3.maxRawSps || timing.requestedOutputSps > PT3.maxRequestedOutputSps || timing.outputSps > timing.requestedOutputSps * 1.02) throw new Error("PT3 timing or DSP settings are outside the guarded 100–800 raw SPS / 100 target-B1-SPS range.");
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
  if (state.mode === "DPV" || state.mode === "SWV") {
    const supported = state.mode === "DPV" ? state.dpvSupported : state.swvSupported;
    if (!supported) throw new Error(`${state.mode} controls require controller V37 or later.`);
    return readPulseConfig(state.mode);
  }
  const config = { start: integer("cvStart"), vertex: integer("cvVertex"), vzero: integer("cvVzero"), steps: integer("cvSteps"), duration: integer("cvDuration"), settle: integer("cvSettle"), rtia: integer("cvRtia") };
  const pointPeriod = config.duration / config.steps;
  if (config.start === config.vertex || config.start < -1000 || config.start > 1000 || config.vertex < -1000 || config.vertex > 1000 || config.vzero < 200 || config.vzero > 2200 || config.vzero + config.start < 200 || config.vzero + config.start > 2200 || config.vzero + config.vertex < 200 || config.vzero + config.vertex > 2200 || config.steps < 2 || config.steps > 4095 || config.duration < 10 || config.duration > 600000 || config.settle < 2 || config.settle > 1000 || pointPeriod < config.settle + 1 || pointPeriod < 3) throw new Error("CV parameters violate the firmware guard range or timing relation.");
  return config;
}

function configCommand() {
  const config = readConfig();
  if (state.mode === "AMP") return `CFG,AMPX,${config.vzero},${config.bias},${config.period},${config.rtia},${config.rf},${config.pgaX10},${config.sinc3},${config.sinc2},${config.fifoWords},${config.rcal},${config.adcRefMv}`;
  if (state.mode === "DPV" || state.mode === "SWV") {
    state.pendingPulse[state.mode] = config;
    state.pulseApplied[state.mode] = null;
    return `CFG,${state.mode},${config.start},${config.end},${config.vzero},${config.step},${config.pulse},${config.frequency},${config.delay},${config.rtia},${config.sinc3}`;
  }
  if (state.mode === "PT3") {
    const applied = state.pt3CalibrationDftSupported ? config : { ...config, calDft: 1024 };
    const dspApplied = state.pt3DspSupported ? applied : { ...applied, sinc3: 5, sinc2: 800, notch: 0 };
    state.pendingPt3 = calculatePt3Setpoints(dspApplied);
    if (state.pt3CalibrationDftSupported) return `CFG,PT3,${dspApplied.vds},${dspApplied.vgs},${dspApplied.period},${dspApplied.settle},${dspApplied.sinc3},${dspApplied.sinc2},${dspApplied.notch},${dspApplied.calDft}`;
    return state.pt3DspSupported
      ? `CFG,PT3,${dspApplied.vds},${dspApplied.vgs},${dspApplied.period},${dspApplied.settle},${dspApplied.sinc3},${dspApplied.sinc2},${dspApplied.notch}`
      : `CFG,PT3,${dspApplied.vds},${dspApplied.vgs},${dspApplied.period},${dspApplied.settle}`;
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

function readPt3LiveSetpoints() {
  if (!state.pt3Applied) throw new Error("Apply PT3 configuration and wait for its ACK before a live DAC update.");
  const vds = integer("pt3Vds");
  const vgs = integer("pt3Vgs");
  if (!Number.isFinite(vds) || !Number.isFinite(vgs) || vds < 100 || vds > 1100 || vgs < -800 || vgs > 1000) {
    throw new Error("Live VDS/VGS values are outside the firmware guard range.");
  }
  return calculatePt3Setpoints({ ...state.pt3Applied, vds, vgs });
}

async function applyPt3LiveDac() {
  try {
    if (!state.pt3LiveDacSupported || !state.pt3LiveReady || !state.running || state.mode !== "PT3") {
      throw new Error("Live DAC updates require V36 and @EVT,RUNNING,PT3.");
    }
    const setpoints = readPt3LiveSetpoints();
    state.pendingPt3Live = setpoints;
    refreshControlAvailability();
    await sendNusCommand(`LIVE,PT3,${setpoints.vds},${setpoints.vgs}`);
    log("Live VDS/VGS write queued. The following raw B1 samples will carry the new acknowledged setpoint metadata.");
  } catch (error) {
    state.pendingPt3Live = null;
    refreshControlAvailability();
    log(error.message, "ERROR");
  }
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

function addPulseRawSample(sample) {
  const phase = sample.index % 2 === 0 ? "I1" : "I2";
  const applied = state.pulseApplied[sample.mode];
  const pulse = {
    pairIndex: Math.floor(sample.index / 2),
    phase,
    differenceUa: null,
    pairGap: false,
    potential: applied ? {
      adiStartMv: applied.adiStartMv,
      adiEndMv: applied.adiEndMv,
      standardEweReStartMv: applied.standardEweReStartMv,
      standardEweReEndMv: applied.standardEweReEndMv,
    } : null,
  };
  if (phase === "I1") {
    state.pulsePairs[sample.mode] = sample;
  } else {
    const first = state.pulsePairs[sample.mode];
    if (first && first.index === sample.index - 1) {
      pulse.differenceUa = sample.currentUa - first.currentUa;
      state.pulseDerived.push({ mode: sample.mode, index: pulse.pairIndex, currentUa: pulse.differenceUa, receivedAt: sample.receivedAt });
    } else {
      pulse.pairGap = true;
      log(`${sample.mode} raw frame pair gap at index ${sample.index}; I₂ − I₁ was not calculated.`, "WARN");
    }
    state.pulsePairs[sample.mode] = null;
  }
  addSample({ ...sample, pulse });
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
    const pulse = s.pulse ? `pair ${s.pulse.pairIndex}, ${s.pulse.phase}${Number.isFinite(s.pulse.differenceUa) ? `; I₂−I₁ ${s.pulse.differenceUa}` : s.pulse.pairGap ? "; pair gap" : ""}` : pt3;
    return `<tr><td>${s.mode}</td><td>${s.index}</td><td>${s.currentUa}</td><td>${pulse}</td><td>${new Date(s.receivedAt).toLocaleTimeString()}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="empty">No binary measurement frames received.</td></tr>';
}

function clearSamples() {
  state.samples = []; state.pulsePairs = { DPV: null, SWV: null }; state.pulseDerived = []; elements.sampleCount.textContent = "0 samples"; elements.downloadCsv.disabled = true; renderRows(); drawPlot(); log("Displayed and exportable received sample list cleared.");
}

function updatePlotWindow() {
  const value = elements.plotWindow.value;
  state.plotWindowSamples = value === "all" ? null : Number(value);
  schedulePlot();
  log(`Plot view changed to ${state.plotWindowSamples === null ? "all" : state.plotWindowSamples} display points; collected raw data and CSV remain unchanged.`);
}

function downloadCsv() {
  if (!state.samples.length) return;
  const header = "mode,sample_index,calculated_current_uA,received_at_iso,pulse_pair_index,pulse_raw_phase,pulse_i2_minus_i1_uA,pulse_pair_gap,pulse_adi_convention,pulse_adi_vre_minus_vse_start_mV,pulse_adi_vre_minus_vse_end_mV,pulse_standard_convention,pulse_standard_ewe_minus_re_start_mV,pulse_standard_ewe_minus_re_end_mV,pt3_setpoint_update,pt3_vbias_dac_set_mV,pt3_vzero_dac_set_mV,pt3_ce0_set_mV,pt3_se0_set_mV,pt3_re0_state,pt3_sinc3_osr,pt3_sinc2_osr,pt3_sinc2_notch_enabled,pt3_rtia_calibration_dft_points,pt3_raw_sample_rate_sps,pt3_output_decimation,pt3_b1_output_rate_sps,pt3_actual_output_period_ms";
  const rows = state.samples.map((s) => `${s.mode},${s.index},${s.currentUa},${s.receivedAt},${s.pulse ? s.pulse.pairIndex : ""},${s.pulse ? s.pulse.phase : ""},${s.pulse && Number.isFinite(s.pulse.differenceUa) ? s.pulse.differenceUa : ""},${s.pulse?.pairGap ? "TRUE" : ""},${s.pulse?.potential ? "VRE_MINUS_VSE_EQUALS_VBIAS_MINUS_VZERO" : ""},${s.pulse?.potential ? s.pulse.potential.adiStartMv : ""},${s.pulse?.potential ? s.pulse.potential.adiEndMv : ""},${s.pulse?.potential ? "EWE_MINUS_RE_EQUALS_NEGATIVE_OF_VRE_MINUS_VSE" : ""},${s.pulse?.potential ? s.pulse.potential.standardEweReStartMv : ""},${s.pulse?.potential ? s.pulse.potential.standardEweReEndMv : ""},${s.pt3 ? s.pt3.updateKind : ""},${s.pt3 ? s.pt3.vbiasMv : ""},${s.pt3 ? s.pt3.vzeroMv : ""},${s.pt3 ? s.pt3.ceMv : ""},${s.pt3 ? s.pt3.seMv : ""},${s.pt3 ? "OPEN" : ""},${s.pt3 ? s.pt3.sinc3 : ""},${s.pt3 ? s.pt3.sinc2 : ""},${s.pt3 ? s.pt3.notch : ""},${s.pt3 ? s.pt3.calDft : ""},${s.pt3 ? s.pt3.rawSps : ""},${s.pt3 ? s.pt3.outputDecimation : ""},${s.pt3 ? s.pt3.outputSps : ""},${s.pt3 ? s.pt3.actualOutputPeriodMs : ""}`);
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
  const pulseMode = state.mode === "DPV" || state.mode === "SWV";
  const allPoints = pulseMode ? state.pulseDerived.filter((s) => s.mode === state.mode) : state.samples.filter((s) => s.mode === state.mode);
  const points = state.plotWindowSamples === null ? allPoints : allPoints.slice(-state.plotWindowSamples);
  if (!points.length) { ctx.fillStyle = "#7892a7"; ctx.textAlign = "center"; ctx.fillText(pulseMode ? "Awaiting a complete raw I₁ / I₂ pair" : "Awaiting received device data", width / 2, height / 2); if (state.mode === "PT3") drawPt3SettingsPlot(); return; }
  let minX = Math.min(...points.map((p) => p.index)); let maxX = Math.max(...points.map((p) => p.index)); let minY = Math.min(...points.map((p) => p.currentUa)); let maxY = Math.max(...points.map((p) => p.currentUa));
  if (minX === maxX) { minX -= 1; maxX += 1; } if (minY === maxY) { minY -= 1; maxY += 1; } const padding = (maxY - minY) * .12; minY -= padding; maxY += padding;
  const px = (x) => margin.left + (x - minX) / (maxX - minX) * chartW; const py = (y) => margin.top + (maxY - y) / (maxY - minY) * chartH;
  ctx.textAlign = "right"; for (let i = 0; i <= 5; i += 1) { const value = maxY - (maxY - minY) * i / 5; ctx.fillText(value.toPrecision(4), margin.left - 7, margin.top + chartH * i / 5 + 4); }
  ctx.textAlign = "center"; for (let i = 0; i <= 6; i += 1) { const value = minX + (maxX - minX) * i / 6; ctx.fillText(Math.round(value), margin.left + chartW * i / 6, height - 12); }
  ctx.strokeStyle = state.mode === "PT3" ? "#63d67d" : state.mode === "SWV" ? "#5d8dff" : "#3fd0e6"; ctx.lineWidth = 1.5; ctx.beginPath(); points.forEach((p, index) => { if (index) ctx.lineTo(px(p.index), py(p.currentUa)); else ctx.moveTo(px(p.index), py(p.currentUa)); }); ctx.stroke();
  ctx.fillStyle = "#c9dce9"; ctx.textAlign = "left"; ctx.fillText(pulseMode ? "I₂ − I₁ (µA)" : "Current (µA)", margin.left, 12); ctx.textAlign = "right"; ctx.fillText(pulseMode ? "staircase pair index" : "sample index", width - margin.right, height - 12);
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
  const archive = await file.arrayBuffer(); const zip = zipEntries(archive); const manifestEntry = zip.entries.get("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json is missing from the ZIP.");
  const manifest = JSON.parse(dec.decode(await unzipEntry(zip, manifestEntry))); const root = manifest.manifest;
  if (!root || !root.application || Object.keys(root).length !== 1) throw new Error("Only an application-only nrfutil Secure DFU ZIP is accepted here.");
  const app = root.application;
  if (!app.bin_file || !app.dat_file) throw new Error("Application manifest lacks bin_file or dat_file.");
  const binaryEntry = zip.entries.get(app.bin_file); const datEntry = zip.entries.get(app.dat_file);
  if (!binaryEntry || !datEntry) throw new Error("Manifest file reference is absent from the ZIP.");
  const binary = await unzipEntry(zip, binaryEntry); const dat = await unzipEntry(zip, datEntry);
  if (!binary.length || !dat.length) throw new Error("The application binary or init packet is empty.");
  const archiveSha256 = globalThis.crypto?.subtle ? Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", archive))).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase() : null;
  return { manifest, binary, dat, binaryName: app.bin_file, datName: app.dat_file, archiveSha256 };
}

function describeDfuPackageCatalogueMatch(file, pkg) {
  const release = state.releaseManifest;
  if (!release) return " Signed-release catalogue is unavailable; the board bootloader will still validate the signature.";
  const nameMatches = file.name === release.packageFilename;
  const hashMatches = pkg.archiveSha256 === release.packageSha256;
  if (nameMatches && hashMatches) return ` Matches listed V${release.controllerVersion} (${release.capability}) signed ZIP by filename and SHA-256.`;
  const hashText = pkg.archiveSha256 ? "SHA-256 does not match" : "SHA-256 could not be calculated";
  return ` Does not match listed V${release.controllerVersion} package (${nameMatches ? "filename matches but" : "filename differs and"} ${hashText}); confirm the intended signed release before transfer.`;
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
    const catalogueStatus = describeDfuPackageCatalogueMatch(file, state.dfu.pkg);
    elements.dfuPackageState.textContent = `Structure valid: ${state.dfu.pkg.binaryName} (${state.dfu.pkg.binary.length.toLocaleString()} B), ${state.dfu.pkg.datName} (${state.dfu.pkg.dat.length.toLocaleString()} B).${catalogueStatus} Bootloader signature validation is still pending.`;
    elements.enterDfu.disabled = !state.device?.gatt?.connected;
    setDfuStage("entry"); setDfuProgress(0, "ZIP structure verified. Connect the NUS application, then request DFU.");
    log(`DFU ZIP structure checked locally: ${file.name}${state.dfu.pkg.archiveSha256 ? `; SHA-256 ${state.dfu.pkg.archiveSha256}` : ""}. The browser did not verify its signature.`);
  } catch (error) {
    elements.dfuPackageState.textContent = `Rejected: ${error.message}`; setDfuStage("package"); setDfuProgress(0, "ZIP rejected before any device write."); log(`DFU ZIP rejected: ${error.message}`, "ERROR");
  }
}

async function enterDfu() {
  if (!state.dfu.pkg || !state.nusRx) return;
  let requestedName;
  try {
    requestedName = normalizedDeviceName();
  } catch (error) {
    elements.dfuDeviceNameState.textContent = error.message;
    log(error.message, "ERROR");
    return;
  }
  if (!window.confirm("Enter Secure DFU bootloader now? Measurement will stop and the current BLE connection will disconnect.")) return;
  try {
    state.dfu.queuedDeviceName = requestedName;
    state.dfu.nameDispatchAttempted = false;
    if (requestedName) {
      elements.dfuDeviceNameState.textContent = `Queued “${requestedName}”. It will be saved only after V38+ reconnects after DFU.`;
    }
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
    state.dfu.completed = true; setDfuStage("verify"); setDfuProgress(100, state.dfu.queuedDeviceName ? "Secure DFU transfer protocol completed. Reconnect the application; the queued name will be saved after V38+ capability verification." : "Secure DFU transfer protocol completed. Reconnect the application to verify advertising and NUS."); elements.verifyApp.disabled = false; log("DFU protocol complete. Signature acceptance and reboot were decided by the target bootloader; application verification remains required.");
  } catch (error) { setDfuProgress(state.dfu.progress, `DFU stopped after ${state.dfu.progress.toFixed(1)}% CRC-verified transfer: ${error.message}`); log(`DFU failed safely: ${error.message}`, "ERROR"); }
  finally { state.dfu.transferring = false; elements.transferDfu.disabled = !state.dfu.pkg || state.dfu.completed; elements.enterDfu.disabled = !state.device?.gatt?.connected || !state.dfu.pkg || state.dfu.completed; }
}

elements.connect.addEventListener("click", connectInstrument); elements.disconnect.addEventListener("click", disconnectInstrument); elements.ampTab.addEventListener("click", () => switchMode("AMP")); elements.cvTab.addEventListener("click", () => switchMode("CV")); elements.dpvTab.addEventListener("click", () => switchMode("DPV")); elements.swvTab.addEventListener("click", () => switchMode("SWV")); elements.pt3Tab.addEventListener("click", () => switchMode("PT3")); elements.form.addEventListener("submit", applyConfig); elements.run.addEventListener("click", startMeasurement); elements.stop.addEventListener("click", stopMeasurement); elements.pt3Live.addEventListener("click", applyPt3LiveDac); elements.probe.addEventListener("click", runAfeProbe); elements.clearData.addEventListener("click", clearSamples); elements.downloadCsv.addEventListener("click", downloadCsv); elements.plotWindow.addEventListener("change", updatePlotWindow); elements.clearLog.addEventListener("click", () => { elements.eventLog.textContent = ""; }); elements.dfuFile.addEventListener("change", onDfuFile); elements.applyDeviceName.addEventListener("click", applyDeviceNameNow); elements.enterDfu.addEventListener("click", enterDfu); elements.transferDfu.addEventListener("click", selectDfuAndTransfer); elements.verifyApp.addEventListener("click", connectInstrument); window.addEventListener("resize", schedulePlot);
document.querySelectorAll("#ampParameters input, #ampParameters select").forEach((control) => control.addEventListener("input", updateAmpTimingHint));
document.querySelectorAll("#dpvParameters input, #dpvParameters select").forEach((control) => { control.addEventListener("input", () => updatePulsePreview("DPV")); control.addEventListener("change", () => updatePulsePreview("DPV")); });
document.querySelectorAll("#swvParameters input, #swvParameters select").forEach((control) => { control.addEventListener("input", () => updatePulsePreview("SWV")); control.addEventListener("change", () => updatePulsePreview("SWV")); });
document.querySelectorAll("#pt3Parameters input, #pt3Parameters select").forEach((control) => { control.addEventListener("input", updatePt3Preview); control.addEventListener("change", updatePt3Preview); });

browserReady(); void loadReleaseManifest(); switchMode("AMP"); updateAmpTimingHint(); updatePulsePreview("DPV"); updatePulsePreview("SWV"); updatePt3Preview(); refreshDeviceNameUi(); drawPlot();
