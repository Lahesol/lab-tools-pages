/*
 * Optical Response Lab
 *
 * This page deliberately keeps the AFE current frames and LED command log as
 * independent evidence streams.  A browser-to-two-BLE-link command is not a
 * hardware trigger, so no host timestamp is converted into an AD5940 sample
 * index or used to rewrite a B1/B2 value.
 */

const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CHANNELS = [
  { id: "R", label: "Red", color: "#ef6a70" },
  { id: "G", label: "Green", color: "#75d889" },
  { id: "B", label: "Blue", color: "#6592ff" },
  { id: "IR", label: "IR", color: "#be626f" },
  { id: "UV", label: "UV", color: "#b384f4" },
  { id: "DR", label: "Deep Red", color: "#dc3f58" },
];

const elements = Object.fromEntries([
  "connectLedButton", "connectAfeButton", "ledDeviceLabel", "afeDeviceLabel",
  "emergencyOffButton", "channelGrid", "channelTemplate", "turnSelectedOnButton", "turnSelectedOffButton",
  "pt3Vds", "pt3Vgs", "pt3Period", "pt3Settle", "pt3Sinc3", "pt3Sinc2", "pt3Notch", "pt3CalDft",
  "applyPt3Button", "pt3Status", "baselineMs", "pulseMs", "postMs", "startRunButton", "stopRunButton", "runStatus",
  "rawPlot", "plotCaption", "clearRunButton", "exportRunButton", "analyseButton", "featureOutput",
  "referenceLabel", "registerReferenceButton", "clearReferencesButton", "classifyButton", "estimateMixtureButton",
  "classificationOutput", "referenceList", "eventLog", "clearLogButton",
].map((id) => [id, document.getElementById(id)]));

function createEndpoint(kind) {
  return {
    kind, device: null, server: null, rx: null, tx: null, queue: Promise.resolve(), textBuffer: "",
    waiter: null, connected: false, detail: "Disconnected", capabilities: "", lastLine: "",
  };
}

const state = {
  led: createEndpoint("LED"),
  afe: createEndpoint("AFE"),
  capture: null,
  latestFeature: null,
  stopRequested: false,
  references: loadReferences(),
};

function nowIso() { return new Date().toISOString(); }
function sessionClock() { return performance.now(); }
function numberValue(element, fallback = NaN) { const value = Number(element.value); return Number.isFinite(value) ? value : fallback; }
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

function log(message, level = "INFO") {
  const line = `${new Date().toLocaleTimeString()} [${level}] ${message}`;
  elements.eventLog.textContent += `${line}\n`;
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function setStatus(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
}

function endpointIsConnected(endpoint) {
  return Boolean(endpoint.device?.gatt?.connected && endpoint.rx && endpoint.tx);
}

function updateConnectionUi() {
  const ledConnected = endpointIsConnected(state.led);
  const afeConnected = endpointIsConnected(state.afe);
  elements.connectLedButton.textContent = ledConnected ? "Disconnect LED" : "Connect LED";
  elements.connectAfeButton.textContent = afeConnected ? "Disconnect AFE" : "Connect AFE";
  elements.ledDeviceLabel.textContent = ledConnected ? state.led.detail : "Disconnected";
  elements.afeDeviceLabel.textContent = afeConnected ? state.afe.detail : "Disconnected";
  elements.applyPt3Button.disabled = !afeConnected;
  elements.startRunButton.disabled = !ledConnected || !afeConnected || Boolean(state.capture?.active);
  elements.stopRunButton.disabled = !state.capture?.active;
  elements.turnSelectedOnButton.disabled = !ledConnected || Boolean(state.capture?.active);
  elements.turnSelectedOffButton.disabled = !ledConnected;
}

function readChannels() {
  return CHANNELS.map((channel) => {
    const card = elements.channelGrid.querySelector(`[data-channel="${channel.id}"]`);
    return {
      ...channel,
      enabled: Boolean(card?.querySelector(".channel-enabled")?.checked),
      duty: clamp(Math.round(numberValue(card?.querySelector(".channel-duty"), 500)), 1, 1000),
    };
  });
}

function renderChannels() {
  for (const channel of CHANNELS) {
    const fragment = elements.channelTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".channel-card");
    card.dataset.channel = channel.id;
    card.style.setProperty("--channel-color", channel.color);
    fragment.querySelector(".channel-name").textContent = channel.label;
    elements.channelGrid.appendChild(fragment);
  }
}

function readPt3Config() {
  const config = {
    vds: numberValue(elements.pt3Vds), vgs: numberValue(elements.pt3Vgs), period: numberValue(elements.pt3Period),
    settle: numberValue(elements.pt3Settle), sinc3: numberValue(elements.pt3Sinc3), sinc2: numberValue(elements.pt3Sinc2),
    notch: numberValue(elements.pt3Notch), calDft: numberValue(elements.pt3CalDft),
  };
  const permitted = Number.isFinite(config.vds) && Number.isFinite(config.vgs) && Number.isFinite(config.period)
    && Number.isFinite(config.settle) && [2, 4, 5].includes(config.sinc3) && [533, 800, 1067, 1333].includes(config.sinc2)
    && [0, 1].includes(config.notch) && [256, 512, 1024, 2048, 4096].includes(config.calDft)
    && config.vds >= 0 && config.vds <= 1100 && config.vgs >= -800 && config.vgs <= 1000
    && (config.vds >= 100 || (config.vds === 0 && state.afe.capabilities.includes("PT3_ZERO_VDS")))
    && config.period >= 5 && config.period <= 1000 && config.settle >= 1000 && config.settle <= 120000;
  if (!permitted) throw new Error("PT3 values are outside the firmware guard range.");
  return config;
}

function pt3Command(config) {
  return `CFG,PT3,${config.vds},${config.vgs},${config.period},${config.settle},${config.sinc3},${config.sinc2},${config.notch},${config.calDft}`;
}

function outputRateSps(config) {
  const raw = 800000 / (config.sinc3 * config.sinc2);
  const requested = 1000 / config.period;
  const decimation = Math.max(1, Math.round(raw / requested));
  return raw / decimation;
}

function recordEvent(type, details = {}) {
  if (!state.capture) return;
  state.capture.events.push({ type, at_iso: nowIso(), host_monotonic_ms: sessionClock(), ...details });
}

function recordLedCommand(command, details = {}) {
  recordEvent("LED_COMMAND_SENT", { command, ...details });
}

async function sendCommand(endpoint, command) {
  const normalized = String(command || "").trim();
  if (!normalized) return;
  if (!endpointIsConnected(endpoint)) throw new Error(`${endpoint.kind} is not connected.`);
  const packet = encoder.encode(`${normalized}\n`);
  const task = endpoint.queue.then(async () => {
    if (endpoint.rx.properties.write && "writeValueWithResponse" in endpoint.rx) {
      await endpoint.rx.writeValueWithResponse(packet);
    } else if (endpoint.rx.properties.writeWithoutResponse && "writeValueWithoutResponse" in endpoint.rx) {
      await endpoint.rx.writeValueWithoutResponse(packet);
    } else {
      await endpoint.rx.writeValue(packet);
    }
  });
  endpoint.queue = task.catch((error) => log(`${endpoint.kind} write failed: ${error.message || error}`, "ERROR"));
  await task;
  return normalized;
}

function waitForAfeLine(predicate, description, timeoutMs) {
  if (state.afe.waiter) state.afe.waiter.reject(new Error("A previous AFE wait was replaced."));
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (state.afe.waiter?.reject === reject) state.afe.waiter = null;
      reject(new Error(`Timed out waiting for ${description}.`));
    }, timeoutMs);
    state.afe.waiter = {
      predicate,
      resolve: (line) => { window.clearTimeout(timer); state.afe.waiter = null; resolve(line); },
      reject: (error) => { window.clearTimeout(timer); state.afe.waiter = null; reject(error); },
    };
  });
}

function handleAfeText(line) {
  state.afe.lastLine = line;
  if (line.startsWith("@INFO,")) {
    state.afe.capabilities = line;
    state.afe.detail = `${state.afe.device?.name || "AD5940"} | ${line.split(",").slice(1, 3).join(",")}`;
    log(`AFE capability: ${line}`, "INFO");
  }
  if (line.startsWith("@ACK,CFG,PT3,")) {
    if (state.capture) state.capture.pt3_ack = line;
    setStatus(elements.pt3Status, "PT3 configuration acknowledged. The setpoints are DAC-derived, not measured pad voltages.", "ok");
    log("PT3 configuration acknowledged.");
  }
  if (line.startsWith("@EVT,PT3_SETTLING")) {
    setStatus(elements.runStatus, "PT3 is settling VZERO/gate; LED outputs remain off.", "wait");
    log(line);
  }
  if (line.startsWith("@EVT,RUNNING,PT3")) {
    if (state.capture) {
      state.capture.afe_running_at_iso = nowIso();
      state.capture.active = true;
      state.capture.receiving = true;
      recordEvent("AFE_RUNNING", { afe_line: line });
    }
    log(line);
  }
  if (line.startsWith("@ERR,")) {
    log(`AFE rejected or stopped: ${line}`, "ERROR");
    if (state.capture) recordEvent("AFE_ERROR", { afe_line: line });
  }
  const waiter = state.afe.waiter;
  if (waiter?.predicate(line)) waiter.resolve(line);
  updateConnectionUi();
}

function decodeTextNotification(endpoint, bytes) {
  endpoint.textBuffer += decoder.decode(bytes, { stream: true });
  let newline;
  while ((newline = endpoint.textBuffer.indexOf("\n")) >= 0) {
    const line = endpoint.textBuffer.slice(0, newline).replace(/\r$/, "").trim();
    endpoint.textBuffer = endpoint.textBuffer.slice(newline + 1);
    if (!line) continue;
    if (endpoint === state.afe) handleAfeText(line);
    else log(`LED RX: ${line}`);
  }
}

function recordRawSample(sample) {
  const capture = state.capture;
  if (!capture?.receiving) return;
  capture.raw_samples.push(sample);
  if (!Number.isFinite(capture.first_sample_index)) capture.first_sample_index = sample.sample_index;
  capture.last_sample_index = sample.sample_index;
  schedulePlot();
}

function decodeAfeNotification(dataView) {
  const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength);
  if (bytes[0] === 0xb1 && bytes.length === 9) {
    recordRawSample({
      sample_index: dataView.getUint32(1, true), current_uA: dataView.getFloat32(5, true), source_frame: "B1",
      batch_count: 1, batch_offset: 0, received_at_iso: nowIso(), host_monotonic_ms: sessionClock(),
    });
    return;
  }
  if (bytes[0] === 0xb2 && bytes.length >= 11) {
    const source = bytes[1];
    const count = bytes[2];
    const startIndex = dataView.getUint32(3, true);
    if (count >= 1 && count <= 3 && bytes.length === 7 + count * 4 && source === 0xb1) {
      for (let offset = 0; offset < count; offset += 1) {
        recordRawSample({
          sample_index: startIndex + offset, current_uA: dataView.getFloat32(7 + offset * 4, true), source_frame: "B2",
          source_frame_type: "0xB1", batch_count: count, batch_offset: offset, received_at_iso: nowIso(), host_monotonic_ms: sessionClock(),
        });
      }
      return;
    }
  }
  decodeTextNotification(state.afe, bytes);
}

async function connectEndpoint(endpoint) {
  if (endpointIsConnected(endpoint)) {
    endpoint.device.gatt.disconnect();
    return;
  }
  if (!navigator.bluetooth || !window.isSecureContext) throw new Error("Web Bluetooth requires Chromium on HTTPS or localhost.");
  const requestOptions = endpoint === state.led
    ? { filters: [{ namePrefix: "6COLOR" }], optionalServices: [NUS_SERVICE_UUID] }
    : { filters: [{ services: [NUS_SERVICE_UUID] }], optionalServices: [NUS_SERVICE_UUID] };
  const device = await navigator.bluetooth.requestDevice(requestOptions);
  device.addEventListener("gattserverdisconnected", () => {
    endpoint.connected = false;
    endpoint.rx = null; endpoint.tx = null; endpoint.detail = "Disconnected";
    log(`${endpoint.kind} disconnected.`, "WARN");
    if (endpoint === state.led && state.capture?.active) void abortRun("LED BLE disconnected");
    if (endpoint === state.afe && state.capture?.active) void abortRun("AFE BLE disconnected");
    updateConnectionUi();
  });
  endpoint.device = device;
  endpoint.server = await device.gatt.connect();
  const service = await endpoint.server.getPrimaryService(NUS_SERVICE_UUID);
  endpoint.rx = await service.getCharacteristic(NUS_RX_UUID);
  endpoint.tx = await service.getCharacteristic(NUS_TX_UUID);
  endpoint.tx.addEventListener("characteristicvaluechanged", (event) => {
    if (endpoint === state.afe) decodeAfeNotification(event.target.value);
    else decodeTextNotification(endpoint, new Uint8Array(event.target.value.buffer, event.target.value.byteOffset, event.target.value.byteLength));
  });
  await endpoint.tx.startNotifications();
  endpoint.connected = true;
  endpoint.detail = device.name || endpoint.kind;
  log(`${endpoint.kind} connected: ${endpoint.detail}`);
  updateConnectionUi();
  if (endpoint === state.led) {
    await sendCommand(endpoint, "OFF,ALL");
    log("LED safety command sent: OFF,ALL");
  } else {
    await sendCommand(endpoint, "PROBE?");
    await sendCommand(endpoint, "INFO?");
  }
}

async function applyPt3Configuration() {
  const config = readPt3Config();
  if (!endpointIsConnected(state.afe)) throw new Error("Connect the AD5940 board first.");
  const awaitAck = waitForAfeLine((line) => line.startsWith("@ACK,CFG,PT3,"), "PT3 configuration ACK", 8000);
  await sendCommand(state.afe, pt3Command(config));
  setStatus(elements.pt3Status, "Waiting for PT3 configuration ACK…", "wait");
  await awaitAck;
  return config;
}

function createCapture(config, channels, timing) {
  const runId = `optical_${new Date().toISOString().replace(/[:.]/g, "-")}`;
  return {
    schema: "nrf52-ad5940-optical-run/v1", run_id: runId, created_at_iso: nowIso(), active: false, receiving: false,
    stop_requested: false, raw_samples: [], events: [], pt3_config: config, output_rate_sps: outputRateSps(config),
    stimulus: { channels, baseline_ms: timing.baselineMs, pulse_ms: timing.pulseMs, post_ms: timing.postMs },
    led_device: state.led.device?.name || "", afe_device: state.afe.device?.name || "",
    afe_info: state.afe.capabilities || "", pt3_ack: "", first_sample_index: null, last_sample_index: null,
  };
}

async function sendSelectedLight(selected, on) {
  if (!endpointIsConnected(state.led)) throw new Error("LED board is not connected.");
  if (!on) {
    const command = "OFF,ALL";
    await sendCommand(state.led, command);
    recordLedCommand(command, { action: "off_all" });
    return;
  }
  for (const channel of selected) {
    const command = `SET,${channel.id},1,${channel.duty}`;
    await sendCommand(state.led, command);
    recordLedCommand(command, { action: "on", channel: channel.id, duty: channel.duty });
  }
}

async function waitWithAbort(milliseconds) {
  const deadline = performance.now() + milliseconds;
  while (performance.now() < deadline) {
    if (state.stopRequested) return false;
    await new Promise((resolve) => window.setTimeout(resolve, Math.min(100, Math.max(1, deadline - performance.now()))));
  }
  return !state.stopRequested;
}

async function stopAfeCapture(reason = "completed") {
  if (endpointIsConnected(state.afe)) {
    await sendCommand(state.afe, "STOP");
    recordEvent("AFE_STOP_SENT", { reason });
  }
  if (state.capture) {
    state.capture.active = false;
    state.capture.receiving = false;
    state.capture.completed_at_iso = nowIso();
    state.capture.completion_reason = reason;
  }
  updateConnectionUi();
}

async function abortRun(reason) {
  state.stopRequested = true;
  const capture = state.capture;
  if (capture) {
    capture.stop_requested = true;
    recordEvent("RUN_ABORT", { reason });
  }
  try { await sendSelectedLight([], false); } catch (error) { log(`LED OFF safety retry failed: ${error.message}`, "ERROR"); }
  try { await stopAfeCapture(`aborted: ${reason}`); } catch (error) { log(`AFE STOP retry failed: ${error.message}`, "ERROR"); }
  setStatus(elements.runStatus, `Run stopped: ${reason}`, "warn");
}

async function startOpticalRun() {
  if (state.capture?.active) throw new Error("An optical run is already active.");
  const config = readPt3Config();
  const selected = readChannels().filter((channel) => channel.enabled);
  const timing = { baselineMs: numberValue(elements.baselineMs), pulseMs: numberValue(elements.pulseMs), postMs: numberValue(elements.postMs) };
  if (!selected.length) throw new Error("Select at least one LED channel.");
  if (!Object.values(timing).every((value) => Number.isFinite(value) && value >= 20 && value <= 60000)) throw new Error("Set each capture interval between 20 and 60000 ms.");
  state.stopRequested = false;
  state.capture = createCapture(config, selected, timing);
  state.latestFeature = null;
  state.capture.active = true;
  recordEvent("RUN_CREATED", { selected_channels: selected.map((channel) => `${channel.id}:${channel.duty}`).join("+") });
  updateConnectionUi();
  try {
    await sendSelectedLight([], false);
    await sendCommand(state.afe, "STOP");
    recordEvent("AFE_STOP_SENT", { reason: "pre-run cleanup" });
    const awaitAck = waitForAfeLine((line) => line.startsWith("@ACK,CFG,PT3,"), "PT3 configuration ACK", 8000);
    await sendCommand(state.afe, pt3Command(config));
    setStatus(elements.runStatus, "Waiting for PT3 configuration acknowledgement…", "wait");
    await awaitAck;
    const waitRunning = waitForAfeLine((line) => line.startsWith("@EVT,RUNNING,PT3"), "PT3 running event", config.settle + 15000);
    await sendCommand(state.afe, "RUN,PT3");
    recordEvent("AFE_RUN_SENT", { command: "RUN,PT3" });
    setStatus(elements.runStatus, `PT3 calibration and ${config.settle} ms gate settling in progress; LEDs remain off.`, "wait");
    await waitRunning;
    if (state.stopRequested) return;
    setStatus(elements.runStatus, `Recording ${timing.baselineMs} ms dark baseline…`, "wait");
    if (!await waitWithAbort(timing.baselineMs)) return;
    setStatus(elements.runStatus, `Light pulse active: ${selected.map((channel) => `${channel.id} ${channel.duty}/1000`).join(", ")}`, "ok");
    recordEvent("LIGHT_PHASE_BEGIN", { planned_duration_ms: timing.pulseMs });
    await sendSelectedLight(selected, true);
    if (!await waitWithAbort(timing.pulseMs)) return;
    recordEvent("LIGHT_PHASE_END", { planned_duration_ms: timing.pulseMs });
    await sendSelectedLight([], false);
    setStatus(elements.runStatus, `Recording ${timing.postMs} ms post-pulse relaxation…`, "wait");
    if (!await waitWithAbort(timing.postMs)) return;
    await stopAfeCapture("completed");
    setStatus(elements.runStatus, `Run completed: ${state.capture.raw_samples.length} raw PT3 samples stored.`, "ok");
    log(`Optical run complete: ${state.capture.run_id}; raw samples=${state.capture.raw_samples.length}`);
    drawPlot();
  } catch (error) {
    await abortRun(error.message || String(error));
    throw error;
  } finally {
    updateConnectionUi();
  }
}

function getCaptureSamples(capture = state.capture) {
  if (!capture?.raw_samples?.length) return [];
  const unique = new Map();
  for (const sample of capture.raw_samples) if (!unique.has(sample.sample_index)) unique.set(sample.sample_index, sample);
  return [...unique.values()].sort((a, b) => a.sample_index - b.sample_index);
}

function quantile(values, fraction) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position); const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function median(values) { return quantile(values, 0.5); }
function firstCrossing(values, start, end, target, direction) {
  for (let index = Math.max(1, start); index <= Math.min(values.length - 1, end); index += 1) {
    const previous = values[index - 1]; const current = values[index];
    if ((direction > 0 && previous < target && current >= target) || (direction < 0 && previous > target && current <= target)) return index;
  }
  return null;
}

function resample(values, count) {
  if (!values.length) return Array(count).fill(0);
  if (values.length === 1) return Array(count).fill(values[0]);
  return Array.from({ length: count }, (_, slot) => {
    const position = slot * (values.length - 1) / (count - 1);
    const low = Math.floor(position); const high = Math.ceil(position);
    return values[low] + (values[high] - values[low]) * (position - low);
  });
}

function analyseCapture(capture = state.capture) {
  const samples = getCaptureSamples(capture);
  if (samples.length < 12) throw new Error("At least 12 raw PT3 samples are required for feature extraction.");
  const rate = Number(capture.output_rate_sps);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("The PT3 output rate is unavailable.");
  const current = samples.map((sample) => sample.current_uA);
  const derivative = current.slice(1).map((value, index) => value - current[index]);
  const edgeOrder = derivative.map((value, index) => ({ index: index + 1, magnitude: Math.abs(value) })).sort((a, b) => b.magnitude - a.magnitude);
  const onset = Math.min(...edgeOrder.slice(0, Math.min(8, edgeOrder.length)).map((entry) => entry.index));
  const baseline = median(current.slice(0, Math.max(3, onset - 2)));
  const expectedEnd = onset + Math.max(1, Math.round(capture.stimulus.pulse_ms * rate / 1000));
  const responseEnd = Math.min(current.length - 1, Math.max(expectedEnd, onset + 2));
  let peakIndex = onset;
  for (let index = onset; index <= responseEnd; index += 1) if (Math.abs(current[index] - baseline) > Math.abs(current[peakIndex] - baseline)) peakIndex = index;
  const peakDelta = current[peakIndex] - baseline;
  const direction = peakDelta >= 0 ? 1 : -1;
  const riseTarget = baseline + peakDelta * (1 - Math.exp(-1));
  const riseCrossing = firstCrossing(current, onset, peakIndex, riseTarget, direction);
  const decayTarget = baseline + peakDelta * Math.exp(-1);
  const decayCrossing = firstCrossing(current, Math.max(peakIndex + 1, expectedEnd - 2), current.length - 1, decayTarget, -direction);
  const delta = current.map((value) => value - baseline);
  const areaStart = onset;
  const areaEnd = Math.min(current.length - 1, expectedEnd);
  let signedArea = 0;
  for (let index = areaStart + 1; index <= areaEnd; index += 1) signedArea += (delta[index - 1] + delta[index]) * 0.5 / rate;
  const feature = {
    schema: "pt3-optical-feature/v1", run_id: capture.run_id, computed_at_iso: nowIso(), sample_rate_sps: rate,
    baseline_uA: baseline, peak_delta_uA: peakDelta, peak_current_uA: current[peakIndex],
    onset_sample_index: samples[onset].sample_index, peak_sample_index: samples[peakIndex].sample_index,
    rise_tau_ms: riseCrossing === null ? null : (riseCrossing - onset) * 1000 / rate,
    decay_tau_ms: decayCrossing === null ? null : (decayCrossing - peakIndex) * 1000 / rate,
    pulse_area_uA_s: signedArea, stimulus: structuredClone(capture.stimulus), pt3_config: structuredClone(capture.pt3_config),
    signature_uA: resample(delta, 64), signature_window: "whole_capture_baseline_subtracted_64_bins",
    inference_boundary: "BLE_LED_COMMAND_TIME_NOT_HARDWARE_TRIGGER",
  };
  return feature;
}

function featureText(feature) {
  const value = (number, unit = "") => Number.isFinite(number) ? `${number.toFixed(4)}${unit}` : "not reached";
  return [
    `run: ${feature.run_id}`,
    `baseline: ${value(feature.baseline_uA, " uA")}`,
    `peak delta: ${value(feature.peak_delta_uA, " uA")}`,
    `rise tau descriptor: ${value(feature.rise_tau_ms, " ms")}`,
    `decay tau descriptor: ${value(feature.decay_tau_ms, " ms")}`,
    `pulse area: ${value(feature.pulse_area_uA_s, " uA s")}`,
    `onset index (derivative estimate): ${feature.onset_sample_index}`,
    "Timing note: this onset is data-derived, not a LED hardware-edge timestamp.",
  ].join("\n");
}

function configFingerprint(feature) {
  const config = feature.pt3_config;
  return [config.vds, config.vgs, config.period, config.sinc3, config.sinc2, config.notch, feature.stimulus.pulse_ms].join("/");
}

function featureVector(feature) {
  return [feature.peak_delta_uA, feature.rise_tau_ms ?? 1e9, feature.decay_tau_ms ?? 1e9, feature.pulse_area_uA_s];
}

function averageVector(vectors) {
  return vectors[0].map((_, dimension) => vectors.reduce((sum, vector) => sum + vector[dimension], 0) / vectors.length);
}

function distanceWithScale(first, second, scales) {
  return Math.sqrt(first.reduce((sum, value, index) => sum + ((value - second[index]) / scales[index]) ** 2, 0));
}

function cosine(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const na = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const nb = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return na && nb ? dot / (na * nb) : 0;
}

function renderReferences() {
  elements.referenceList.replaceChildren();
  const groups = new Map();
  for (const reference of state.references) groups.set(reference.label, (groups.get(reference.label) || 0) + 1);
  if (!groups.size) {
    elements.referenceList.textContent = "No feature references stored in this browser.";
    return;
  }
  for (const [label, count] of groups) {
    const row = document.createElement("div"); row.className = "reference-row";
    row.innerHTML = `<span>${label}</span><span>${count} capture${count === 1 ? "" : "s"}</span>`;
    elements.referenceList.appendChild(row);
  }
}

function loadReferences() {
  try {
    const value = JSON.parse(localStorage.getItem("ad5940OpticalReferences") || "[]");
    return Array.isArray(value) ? value.filter((entry) => entry?.feature?.schema === "pt3-optical-feature/v1") : [];
  } catch { return []; }
}

function saveReferences() { localStorage.setItem("ad5940OpticalReferences", JSON.stringify(state.references)); }

function classifyFeature(feature) {
  const compatible = state.references.filter((entry) => configFingerprint(entry.feature) === configFingerprint(feature));
  if (compatible.length < 2) throw new Error("At least two same-condition labelled references are needed for classification.");
  const groups = new Map();
  for (const entry of compatible) groups.set(entry.label, [...(groups.get(entry.label) || []), featureVector(entry.feature)]);
  if (groups.size < 2) throw new Error("Classification needs at least two distinct labels under this PT3/pulse condition.");
  const all = [...groups.values()].flat();
  const means = averageVector(all);
  const scales = means.map((_, index) => Math.max(1e-9, Math.sqrt(all.reduce((sum, vector) => sum + (vector[index] - means[index]) ** 2, 0) / all.length)));
  const target = featureVector(feature);
  const ranked = [...groups.entries()].map(([label, vectors]) => ({ label, distance: distanceWithScale(target, averageVector(vectors), scales), captures: vectors.length })).sort((a, b) => a.distance - b.distance);
  return ranked;
}

function solveNnls(templates, target) {
  const count = templates.length; const coefficients = Array(count).fill(0);
  const norms = templates.map((template) => template.reduce((sum, value) => sum + value * value, 0));
  const step = 0.4 / Math.max(1e-12, norms.reduce((sum, value) => sum + value, 0));
  for (let iteration = 0; iteration < 1500; iteration += 1) {
    const reconstructed = target.map((_, row) => templates.reduce((sum, template, column) => sum + template[row] * coefficients[column], 0));
    const gradient = templates.map((template) => 2 * template.reduce((sum, value, row) => sum + value * (reconstructed[row] - target[row]), 0));
    for (let column = 0; column < count; column += 1) coefficients[column] = Math.max(0, coefficients[column] - step * gradient[column]);
  }
  const reconstructed = target.map((_, row) => templates.reduce((sum, template, column) => sum + template[row] * coefficients[column], 0));
  const residual = Math.sqrt(target.reduce((sum, value, row) => sum + (value - reconstructed[row]) ** 2, 0));
  const targetNorm = Math.sqrt(target.reduce((sum, value) => sum + value * value, 0));
  return { coefficients, normalizedResidual: targetNorm ? residual / targetNorm : NaN };
}

function estimateMixture(feature) {
  const compatible = state.references.filter((entry) => configFingerprint(entry.feature) === configFingerprint(feature) && entry.feature.stimulus.channels.length === 1);
  const groups = new Map();
  for (const entry of compatible) {
    const channel = entry.feature.stimulus.channels[0].id;
    groups.set(channel, [...(groups.get(channel) || []), entry.feature.signature_uA]);
  }
  if (groups.size < 2) throw new Error("Mixture estimation needs two or more same-condition single-channel reference captures.");
  const labels = [...groups.keys()];
  const templates = labels.map((label) => averageVector(groups.get(label)));
  const result = solveNnls(templates, feature.signature_uA);
  const pairCosines = [];
  for (let first = 0; first < templates.length; first += 1) for (let second = first + 1; second < templates.length; second += 1) pairCosines.push({ pair: `${labels[first]}/${labels[second]}`, value: cosine(templates[first], templates[second]) });
  return { labels, templates, ...result, pairCosines };
}

function download(filename, text, type) {
  const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? ""); return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function makeCsv(headers, rows) { return `${headers.join(",")}\r\n${rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")).join("\r\n")}\r\n`; }

function exportEvidence() {
  const capture = state.capture;
  if (!capture?.raw_samples.length) throw new Error("There is no raw capture to export.");
  const base = capture.run_id;
  const rawHeaders = ["sample_index", "current_uA", "source_frame", "source_frame_type", "batch_count", "batch_offset", "received_at_iso", "host_monotonic_ms"];
  const eventHeaders = ["type", "at_iso", "host_monotonic_ms", "command", "action", "channel", "duty", "reason", "afe_line", "planned_duration_ms", "selected_channels"];
  download(`${base}_raw_current.csv`, makeCsv(rawHeaders, capture.raw_samples), "text/csv");
  download(`${base}_stimulus_events.csv`, makeCsv(eventHeaders, capture.events), "text/csv");
  const manifest = { ...capture, raw_samples: undefined, events: undefined, latest_feature: state.latestFeature, export_boundary: "Raw current values remain in the separate CSV without smoothing, rescaling, filling, or time-axis replacement." };
  download(`${base}_manifest.json`, JSON.stringify(manifest, null, 2), "application/json");
  if (state.latestFeature) download(`${base}_analysis_feature.json`, JSON.stringify(state.latestFeature, null, 2), "application/json");
  log(`Evidence exported: ${base} (raw CSV, event CSV, manifest${state.latestFeature ? ", feature JSON" : ""}).`);
}

let plotQueued = false;
function schedulePlot() { if (!plotQueued) { plotQueued = true; requestAnimationFrame(() => { plotQueued = false; drawPlot(); }); } }

function drawPlot() {
  const canvas = elements.rawPlot; const bounds = canvas.getBoundingClientRect(); const scale = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(640, Math.round(bounds.width * scale)); canvas.height = Math.max(330, Math.round(bounds.height * scale));
  const ctx = canvas.getContext("2d"); ctx.scale(scale, scale); const width = canvas.width / scale; const height = canvas.height / scale;
  ctx.fillStyle = "#071321"; ctx.fillRect(0, 0, width, height);
  const samples = getCaptureSamples();
  const pad = { top: 24, right: 22, bottom: 42, left: 68 };
  if (!samples.length) { ctx.fillStyle = "#93a9bd"; ctx.textAlign = "center"; ctx.fillText("Awaiting raw B1/B2 PT3 frames", width / 2, height / 2); return; }
  const indexMin = samples[0].sample_index; const indexMax = samples.at(-1).sample_index || indexMin + 1;
  const currents = samples.map((sample) => sample.current_uA); let min = Math.min(...currents); let max = Math.max(...currents); const spread = Math.max(1e-6, max - min); min -= spread * .12; max += spread * .12;
  ctx.strokeStyle = "#28445f"; ctx.lineWidth = 1; ctx.font = "12px Inter, sans-serif"; ctx.fillStyle = "#9db3c7";
  for (let line = 0; line < 5; line += 1) { const y = pad.top + line * (height - pad.top - pad.bottom) / 4; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke(); const value = max - line * (max - min) / 4; ctx.textAlign = "right"; ctx.fillText(value.toFixed(4), pad.left - 8, y + 4); }
  const projectX = (index) => pad.left + (index - indexMin) * (width - pad.left - pad.right) / Math.max(1, indexMax - indexMin);
  const projectY = (value) => pad.top + (max - value) * (height - pad.top - pad.bottom) / Math.max(1e-12, max - min);
  ctx.strokeStyle = "#7bd989"; ctx.lineWidth = 1.4; ctx.beginPath(); let previous = null;
  for (const sample of samples) {
    const x = projectX(sample.sample_index); const y = projectY(sample.current_uA);
    if (!previous || sample.sample_index !== previous.sample_index + 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    previous = sample;
  }
  ctx.stroke();
  const events = state.capture?.events?.filter((event) => event.type === "LED_COMMAND_SENT") || [];
  if (events.length && state.capture?.first_sample_index !== null) {
    ctx.fillStyle = "#ffbf5c"; ctx.textAlign = "left"; ctx.fillText("LED commands are logged separately; no host-time vertical guide is drawn as an ADC edge.", pad.left, 15);
  }
  ctx.fillStyle = "#9db3c7"; ctx.textAlign = "center"; ctx.fillText("sample index", (pad.left + width - pad.right) / 2, height - 12); ctx.save(); ctx.translate(15, (pad.top + height - pad.bottom) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("current (uA)", 0, 0); ctx.restore();
  elements.plotCaption.textContent = `${samples.length} raw samples; index ${indexMin}–${indexMax}; ${state.capture?.completion_reason || "capture in progress"}. The trace is unfiltered and breaks across missing indices.`;
}

function clearView() { state.capture = null; state.latestFeature = null; elements.featureOutput.textContent = "Capture a complete labelled pulse first."; elements.featureOutput.classList.add("empty"); elements.classificationOutput.textContent = "Register repeated labelled captures before classifying."; elements.classificationOutput.classList.add("empty"); schedulePlot(); updateConnectionUi(); }

async function manualSelected(on) {
  const selected = readChannels().filter((channel) => channel.enabled);
  if (on && !selected.length) throw new Error("Select one or more LED channels first.");
  await sendSelectedLight(selected, on);
  log(on ? `Manual LED on: ${selected.map((channel) => `${channel.id}:${channel.duty}`).join("+")}` : "Manual LED off: OFF,ALL");
}

function runUi(task) {
  task().catch((error) => { log(error.message || String(error), "ERROR"); setStatus(elements.runStatus, error.message || String(error), "error"); updateConnectionUi(); });
}

elements.connectLedButton.addEventListener("click", () => runUi(async () => connectEndpoint(state.led)));
elements.connectAfeButton.addEventListener("click", () => runUi(async () => connectEndpoint(state.afe)));
elements.applyPt3Button.addEventListener("click", () => runUi(applyPt3Configuration));
elements.startRunButton.addEventListener("click", () => runUi(startOpticalRun));
elements.stopRunButton.addEventListener("click", () => runUi(() => abortRun("operator stop")));
elements.emergencyOffButton.addEventListener("click", () => runUi(() => sendSelectedLight([], false)));
elements.turnSelectedOnButton.addEventListener("click", () => runUi(() => manualSelected(true)));
elements.turnSelectedOffButton.addEventListener("click", () => runUi(() => manualSelected(false)));
elements.clearRunButton.addEventListener("click", clearView);
elements.exportRunButton.addEventListener("click", () => runUi(async () => exportEvidence()));
elements.analyseButton.addEventListener("click", () => runUi(async () => {
  state.latestFeature = analyseCapture(); elements.featureOutput.textContent = featureText(state.latestFeature); elements.featureOutput.classList.remove("empty"); log(`Feature extraction complete for ${state.latestFeature.run_id}.`);
}));
elements.registerReferenceButton.addEventListener("click", () => runUi(async () => {
  if (!state.latestFeature) throw new Error("Analyse the latest run before registering it.");
  const label = elements.referenceLabel.value.trim() || state.latestFeature.stimulus.channels.map((channel) => `${channel.id}_${channel.duty}`).join("+");
  state.references.push({ label, added_at_iso: nowIso(), feature: structuredClone(state.latestFeature) }); saveReferences(); renderReferences(); log(`Reference registered: ${label}.`);
}));
elements.clearReferencesButton.addEventListener("click", () => { state.references = []; saveReferences(); renderReferences(); log("Feature reference library cleared in this browser.", "WARN"); });
elements.classifyButton.addEventListener("click", () => runUi(async () => {
  if (!state.latestFeature) throw new Error("Analyse the latest run first.");
  const ranked = classifyFeature(state.latestFeature); elements.classificationOutput.textContent = ranked.map((entry, index) => `${index + 1}. ${entry.label}: scaled distance ${entry.distance.toFixed(3)} (${entry.captures} refs)`).join("\n"); elements.classificationOutput.classList.remove("empty"); log(`Nearest-reference classification: ${ranked[0].label}.`);
}));
elements.estimateMixtureButton.addEventListener("click", () => runUi(async () => {
  if (!state.latestFeature) throw new Error("Analyse the latest run first.");
  const result = estimateMixture(state.latestFeature); const sum = result.coefficients.reduce((total, value) => total + value, 0);
  const weights = result.labels.map((label, index) => `${label}: ${result.coefficients[index].toFixed(4)} (${sum ? (100 * result.coefficients[index] / sum).toFixed(1) : "0.0"}%)`);
  const ambiguous = result.pairCosines.filter((pair) => pair.value > .98).map((pair) => `${pair.pair} cos=${pair.value.toFixed(3)}`);
  elements.classificationOutput.textContent = `NNLS template estimate (relative response units)\n${weights.join("\n")}\nnormalised residual: ${result.normalizedResidual.toFixed(3)}${ambiguous.length ? `\nWARNING: near-collinear templates: ${ambiguous.join(", ")}` : ""}\nThis is conditional on matched LED duty, optical geometry, PT3 bias/filter, and device state.`; elements.classificationOutput.classList.remove("empty"); log("Mixture template estimate computed; inspect residual and template collinearity before assigning a spectrum.");
}));
elements.clearLogButton.addEventListener("click", () => { elements.eventLog.textContent = ""; });
window.addEventListener("resize", schedulePlot);

renderChannels(); renderReferences(); updateConnectionUi(); schedulePlot();
log("Optical Response Lab ready. Connect devices; all LED outputs remain off until an explicit manual or labelled run command.");
