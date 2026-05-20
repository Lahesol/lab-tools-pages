const els = {
  serialSupport: document.querySelector("#serialSupport"),
  connectionStatus: document.querySelector("#connectionStatus"),
  baudRate: document.querySelector("#baudRate"),
  connectButton: document.querySelector("#connectButton"),
  demoButton: document.querySelector("#demoButton"),
  dacSlider: document.querySelector("#dacSlider"),
  dacInput: document.querySelector("#dacInput"),
  dacValueLabel: document.querySelector("#dacValueLabel"),
  sendDacButton: document.querySelector("#sendDacButton"),
  liveSend: document.querySelector("#liveSend"),
  log: document.querySelector("#log"),
  clearLogButton: document.querySelector("#clearLogButton"),
  latestValue: document.querySelector("#latestValue"),
  minValue: document.querySelector("#minValue"),
  maxValue: document.querySelector("#maxValue"),
  avgValue: document.querySelector("#avgValue"),
  rateValue: document.querySelector("#rateValue"),
  sampleCount: document.querySelector("#sampleCount"),
  windowSize: document.querySelector("#windowSize"),
  autoScale: document.querySelector("#autoScale"),
  manualScale: document.querySelector("#manualScale"),
  yMin: document.querySelector("#yMin"),
  yMax: document.querySelector("#yMax"),
  pauseButton: document.querySelector("#pauseButton"),
  clearSamplesButton: document.querySelector("#clearSamplesButton"),
  exportButton: document.querySelector("#exportButton"),
  plotCaption: document.querySelector("#plotCaption"),
  plotCanvas: document.querySelector("#plotCanvas"),
  canvasWrap: document.querySelector(".canvas-wrap"),
};

const state = {
  port: null,
  reader: null,
  keepReading: false,
  decoder: new TextDecoder(),
  parseBuffer: "",
  samples: [],
  totalSamples: 0,
  latest: null,
  paused: false,
  demoTimer: null,
  demoPhase: 0,
  liveSendTimer: null,
  writeQueue: Promise.resolve(),
  maxSamples: 2000,
  lastStatsAt: 0,
  needsDraw: true,
  lastDrawAt: 0,
};

const encoder = new TextEncoder();
const plot = {
  ctx: els.plotCanvas.getContext("2d"),
  width: 0,
  height: 0,
  dpr: 1,
};

function clampDac(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 0;
  return Math.min(4095, Math.max(0, number));
}

function setDacValue(value, source = "ui") {
  const next = clampDac(value);
  els.dacSlider.value = String(next);
  els.dacInput.value = String(next);
  els.dacValueLabel.value = String(next);

  if (source !== "send" && els.liveSend.checked) {
    window.clearTimeout(state.liveSendTimer);
    state.liveSendTimer = window.setTimeout(() => sendCommand(next), 120);
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setConnectedUi(connected) {
  els.connectButton.textContent = connected ? "Disconnect" : "Connect";
  els.baudRate.disabled = connected;
  setConnectionStatus(connected ? "Connected" : "Disconnected", connected ? "ok" : "muted");
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
    state.decoder = new TextDecoder();
    setConnectedUi(true);
    addLog("SYS", `Serial opened at ${baudRate}`);
    readLoop();
  } catch (error) {
    addLog("ERR", error.message || error, true);
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
    await state.writeQueue.catch(() => {});
    if (state.port) {
      await state.port.close();
      addLog("SYS", "Serial closed");
    }
  } catch (error) {
    addLog("ERR", error.message || error, true);
  } finally {
    state.port = null;
    setConnectedUi(false);
  }
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

function ingestBytes(bytes) {
  const text = state.decoder.decode(bytes, { stream: true });
  ingestText(text);
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

  if (state.parseBuffer.length > 96) {
    const matches = state.parseBuffer.match(/[-+]?\d+(?:\.\d+)?/g) || [];
    matches.slice(0, -1).forEach((value) => addSample(Number(value)));
    state.parseBuffer = matches.at(-1) || "";
  }
}

function parseSegment(segment) {
  if (!segment) return;
  const match = segment.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return;
  const value = Number(match[0]);
  if (Number.isFinite(value)) addSample(value);
}

function addSample(value) {
  if (state.paused) return;

  const sample = { t: performance.now(), value };
  state.latest = value;
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
  state.needsDraw = true;
}

function updateStats() {
  const values = state.samples.map((sample) => sample.value);
  if (!values.length) {
    els.latestValue.textContent = "--";
    els.minValue.textContent = "--";
    els.maxValue.textContent = "--";
    els.avgValue.textContent = "--";
    els.rateValue.textContent = "--";
    els.sampleCount.textContent = String(state.totalSamples);
    els.plotCaption.textContent = "Waiting for samples";
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const first = state.samples[0];
  const last = state.samples[state.samples.length - 1];
  const elapsed = Math.max(0.001, (last.t - first.t) / 1000);
  const rate = state.samples.length > 1 ? (state.samples.length - 1) / elapsed : 0;

  els.latestValue.textContent = formatNumber(state.latest);
  els.minValue.textContent = formatNumber(min);
  els.maxValue.textContent = formatNumber(max);
  els.avgValue.textContent = formatNumber(avg);
  els.rateValue.textContent = `${rate.toFixed(rate >= 10 ? 0 : 1)} Hz`;
  els.sampleCount.textContent = String(state.totalSamples);
  els.plotCaption.textContent = `${values.length} samples in view`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(3);
}

async function sendCommand(value) {
  const command = String(value).trim();
  if (!command) return;

  if (state.port?.writable) {
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
          await writer.write(encoder.encode(`${command}\r`));
          addLog("TX", command);
        } catch (error) {
          addLog("ERR", error.message || error, true);
        } finally {
          if (writer) {
            try {
              writer.releaseLock();
            } catch (error) {
              addLog("ERR", error.message || error, true);
            }
          }
        }
      });
    await state.writeQueue;
  } else {
    addLog("TX", `${command} (not connected)`);
  }
}

function clearSamples() {
  state.samples = [];
  state.totalSamples = 0;
  state.latest = null;
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
  const rows = ["time_ms,value"];
  for (const sample of state.samples) {
    rows.push(`${(sample.t - start).toFixed(3)},${sample.value}`);
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ppg_adc_${new Date().toISOString().replaceAll(":", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("SYS", `Exported ${state.samples.length} samples`);
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
    const dac = clampDac(els.dacInput.value);
    state.demoPhase += 0.18;
    const baseline = 7200 + (dac - 2056) * 0.42;
    const ppg = Math.sin(state.demoPhase) * 160 + Math.sin(state.demoPhase * 0.31) * 38;
    const noise = (Math.random() - 0.5) * 42;
    addSample(Math.round(baseline + ppg + noise));
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

  const values = state.samples.map((sample) => sample.value);
  const { min, max } = getYRange(values);

  drawGrid(ctx, margin, chartW, chartH, min, max);

  if (values.length < 2) {
    ctx.fillStyle = "#66746f";
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText("No ADC stream", margin.left + 12, margin.top + 28);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin.left, margin.top, chartW, chartH);
  ctx.clip();

  ctx.beginPath();
  values.forEach((value, index) => {
    const x = margin.left + (index / Math.max(1, values.length - 1)) * chartW;
    const y = margin.top + (1 - (value - min) / (max - min)) * chartH;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#087f72";
  ctx.stroke();

  const lastValue = values.at(-1);
  const x = margin.left + chartW;
  const y = margin.top + (1 - (lastValue - min) / (max - min)) * chartH;
  ctx.fillStyle = "#087f72";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
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

function animationLoop() {
  const now = performance.now();
  if (state.needsDraw && now - state.lastDrawAt > 33) {
    drawPlot();
    state.lastDrawAt = now;
    state.needsDraw = false;
  }
  requestAnimationFrame(animationLoop);
}

function bindEvents() {
  els.connectButton.addEventListener("click", () => {
    if (state.port) disconnectSerial();
    else connectSerial();
  });

  els.demoButton.addEventListener("click", toggleDemo);
  els.dacSlider.addEventListener("input", (event) => setDacValue(event.target.value));
  els.dacInput.addEventListener("input", (event) => setDacValue(event.target.value));
  els.sendDacButton.addEventListener("click", () => sendCommand(clampDac(els.dacInput.value)));

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.step);
      setDacValue(clampDac(els.dacInput.value) + step);
    });
  });

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => sendCommand(button.dataset.command));
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

  els.pauseButton.addEventListener("click", () => {
    state.paused = !state.paused;
    els.pauseButton.textContent = state.paused ? "Resume" : "Pause";
    addLog("SYS", state.paused ? "Plot paused" : "Plot resumed");
    state.needsDraw = true;
  });

  els.clearSamplesButton.addEventListener("click", clearSamples);
  els.exportButton.addEventListener("click", exportCsv);
  window.addEventListener("beforeunload", () => {
    state.keepReading = false;
  });
}

function init() {
  const hasSerial = "serial" in navigator;
  els.serialSupport.textContent = hasSerial ? "Web Serial ready" : "Web Serial unavailable";
  els.serialSupport.classList.toggle("is-bad", !hasSerial);
  els.serialSupport.classList.toggle("is-muted", !hasSerial);
  bindEvents();
  setDacValue(2056, "init");
  setConnectedUi(false);
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(els.canvasWrap || els.plotCanvas);
  updateStats();
  animationLoop();
}

init();
