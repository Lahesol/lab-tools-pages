const CHANNELS = ["A", "B", "C", "D"];
const FIXED_DEFAULTS = { A: 0, B: 0, C: 0, D: -10000 };
const ZERO_DEFAULTS = { A: 1986, B: 1990, C: 2004, D: 1988 };
const POLL_MS = 250;

const state = {
  connected: false,
  adcRunning: false,
  sweepRunning: false,
  lastLogId: 0,
  samples: [],
  curves: [],
  activeCurveIndex: null,
  activeSamples: null,
  activeTitle: "Current ADC",
  polling: false,
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  renderChannelRows();
  renderZeroControls();
  bindActions();
  refreshPorts();
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

function bindActions() {
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
  els.applyAdcConfigBtn.addEventListener("click", () =>
    postAction("/api/adc/config", {
      input: readInt(els.adcInputSelect),
      rate_hz: readInt(els.adcRateInput),
    })
  );

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

async function refreshPorts() {
  try {
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
  } catch (error) {
    setBackendMessage(`Backend unavailable: ${error.message}`);
    setDisconnectedUi();
  }
}

async function pollData(options = {}) {
  if (state.polling && !options.immediate) return;
  state.polling = true;
  try {
    const query = state.lastLogId ? `?after_log=${state.lastLogId}` : "";
    const data = await fetchJson(`/api/data${query}`);
    applySnapshot(data);
    if (state.activeCurveIndex === null) {
      state.samples = data.samples || [];
      drawActivePlot();
    }
  } catch (error) {
    setBackendMessage(`Backend unavailable: ${error.message}`);
    setDisconnectedUi();
  } finally {
    state.polling = false;
    window.setTimeout(() => pollData(), POLL_MS);
  }
}

async function postAction(path, body, options = {}) {
  try {
    const data = await fetchJson(path, {
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
    drawActivePlot();
  } catch (error) {
    appendLocalLog("ERROR", error.message);
  }
}

async function fetchJson(path, options) {
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

function applySnapshot(data) {
  state.connected = Boolean(data.connected);
  state.adcRunning = Boolean(data.adc_running);
  state.sweepRunning = Boolean(data.sweep?.running);
  state.curves = Array.isArray(data.curves) ? data.curves : [];
  if (data.last_log_id !== undefined) state.lastLogId = data.last_log_id;
  if (data.adc_input !== undefined) els.adcInputSelect.value = String(data.adc_input);
  if (data.adc_rate_hz !== undefined) els.adcRateInput.value = String(data.adc_rate_hz);
  updateBadges(data);
  updateSweepProgress(data.sweep || {});
  updateControlState();
  appendLogs(data.logs || []);
  renderCurves();
  els.runInfo.textContent = data.run_id ? `Run ${data.run_id} | ${data.run_dir || ""}` : "Local UART web GUI";
}

function updateBadges(data) {
  els.connectionBadge.textContent = state.connected ? `Connected ${data.port || ""} @ ${data.baud || ""}` : "Disconnected";
  els.connectionBadge.className = `badge ${state.connected ? "badge-ok" : "badge-idle"}`;
  els.adcBadge.textContent = state.adcRunning ? `ADC ${data.adc_input ?? ""} @ ${data.adc_rate_hz ?? ""} Hz` : "ADC idle";
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
    .map((row) => `[${String(row.time || "").replace("T", " ")}] ${row.direction}: ${row.text}`)
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
    const curve = await fetchJson(`/api/curve?index=${encodeURIComponent(index)}`);
    state.activeCurveIndex = index;
    state.activeSamples = curve.samples || [];
    state.activeTitle = `Curve ${index + 1}: ${curve.cmd}`;
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
    `Last: ${last} (${adcToVoltage(last).toFixed(3)} V)`,
    `Min: ${min} (${adcToVoltage(min).toFixed(3)} V)`,
    `Max: ${max} (${adcToVoltage(max).toFixed(3)} V)`,
  ].join(" | ");
}

function adcToVoltage(adc) {
  return (adc / ((1 << 14) - 1)) * 3.3;
}

function readInt(input) {
  const value = Number.parseInt(input.value, 10);
  if (!Number.isFinite(value)) throw new Error(`Invalid integer: ${input.value}`);
  return value;
}

function getChannelRow(channel) {
  return document.querySelector(`.channel-row[data-channel="${channel}"]`);
}

function setBackendMessage(message) {
  if (message) els.runInfo.textContent = message;
}
