(function () {
  const DEVICE_TIME_POINT_LIMIT = 50000;
  let renderTimer = null;

  function ensureDeviceTimeState() {
    if (!Array.isArray(state.deviceTimePoints)) state.deviceTimePoints = [];
    state.deviceTimeRunning = !!state.deviceTimeRunning;
    state.deviceTimeAccepting = state.deviceTimeAccepting !== false;
    state.deviceTimeCapture = state.deviceTimeCapture || null;
  }

  function setDeviceTimeStatus(text, kind = "") {
    const status = $("deviceTimeStatus");
    if (!status) return;
    status.textContent = text;
    status.title = text;
    status.className = `hint ${kind}`.trim();
  }

  function deviceTimeSamples() {
    const input = $("deviceTimeSamples");
    const value = clamp(Math.round(Number(input?.value) || 1000), 10, 20000);
    if (input) input.value = value;
    return value;
  }

  function deviceTimeOversample() {
    const input = $("deviceTimeOversample");
    const value = clamp(Math.round(Number(input?.value) || 1), 1, 256);
    if (input) input.value = value;
    return value;
  }

  function deviceTimeIntervalUs() {
    const input = $("deviceTimeIntervalUs");
    const value = clamp(Math.round(Number(input?.value) || 0), 0, 65000);
    if (input) input.value = value;
    return value;
  }

  function deviceTimeYMode() {
    return $("deviceTimeYMode")?.value || "current";
  }

  function selectedDeviceTimeAdcs() {
    const selected = Array.from(document.querySelectorAll(".device-tune-adc-input"))
      .filter(input => input.checked)
      .map(input => Number(input.value))
      .filter(Number.isFinite);
    return selected.length ? selected : [0];
  }

  function adcMaskFromSelectedAdcs(indices) {
    let mask = 0;
    for (const adcIndex of indices) {
      if (Number.isFinite(adcIndex) && adcIndex >= 0 && adcIndex < ADC_TIA_COUNT) mask |= (1 << adcIndex);
    }
    return mask || 1;
  }

  function firmwareSupportsTimeDomain() {
    const protocol = String(state.firmwareProtocol || "").toLowerCase();
    const version = String(state.firmwareVersion || "").toLowerCase();
    return protocol.includes("time") || version.includes("time-domain");
  }

  function readDeviceTuneInputsForTime() {
    const device = deviceMuxInfo($("deviceTuneDevice")?.value).device;
    const dac = $("deviceTuneDac")?.value === "D1" ? "D1" : "D2";
    const dacMv = clamp(Math.round(Number($("deviceTuneDacMvNumber")?.value) || 0), DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
    const muCode = muVoltageToCode(Number($("deviceTuneMuNumber")?.value) || 0);
    const vstartCode = vstartVoltageToCode(Number($("deviceTuneVstartNumber")?.value) || 0);
    return { device, dac, dacMv, muCode, vstartCode };
  }

  async function applyDeviceTuneBiasForTime() {
    const config = readDeviceTuneInputsForTime();
    const dacReply = await sendCommand(`V${config.dac.slice(1)},${config.dacMv}`, {
      waitForReply: true,
      timeoutMs: PROGRAM_REPLY_TIMEOUT_MS,
    });
    if (replyLooksBad(dacReply)) logLine(`[warn] time-domain ${config.dac} ${replySummary(dacReply)}`);
    await programLogicalDevice(config.device, config.muCode, config.vstartCode);
    const settle = sweepSettleUs();
    if (settle > 0) await sleep(settle / 1000);
    return config;
  }

  function parseTimeAdcValues(parts, mask, startIndex) {
    const values = Array.from({ length: ADC_TIA_COUNT }, () => null);
    let fieldIndex = startIndex;
    for (let adcIndex = 0; adcIndex < ADC_TIA_COUNT; adcIndex++) {
      if ((mask & (1 << adcIndex)) === 0) continue;
      const value = Number(parts[fieldIndex]);
      values[adcIndex] = Number.isFinite(value) ? value : null;
      fieldIndex += 1;
    }
    return values;
  }

  function recordTimePoint(idx, values) {
    const capture = state.deviceTimeCapture;
    if (!capture || !state.deviceTimeAccepting) return;
    const adcs = {};
    for (let adcIdx = 0; adcIdx < ADC_TIA_COUNT; adcIdx++) {
      const raw = values[adcIdx];
      if (!Number.isFinite(raw)) continue;
      const voltage = adcRawToVoltage(raw);
      adcs[`ADC${adcIdx}`] = {
        raw,
        voltage,
        current: adcVoltageToCurrentUa(voltage),
      };
    }
    const point = {
      idx,
      t: Math.max(0, (performance.now() - capture.startedMs) / 1000),
      adcs,
    };
    state.deviceTimePoints.push(point);
    while (state.deviceTimePoints.length > DEVICE_TIME_POINT_LIMIT) state.deviceTimePoints.shift();
    capture.received += 1;
    if (capture.received % 25 === 0) {
      const elapsed = Math.max(0.001, (performance.now() - capture.startedMs) / 1000);
      setDeviceTimeStatus(`Time stream ${capture.received}/${capture.expected}, ${(capture.received / elapsed).toFixed(1)} point/s, oversample ${capture.avg}.`);
    }
    scheduleTimePlotRender();
  }

  function finalizeTimeCapture(countText) {
    const capture = state.deviceTimeCapture;
    if (!capture) return;
    const count = Number(countText) || capture.received;
    const elapsed = Math.max(0.001, (performance.now() - capture.startedMs) / 1000);
    const rate = count / elapsed;
    const rawRate = rate * Math.max(1, capture.avg) * Math.max(1, capture.adcCount);
    if (count > 1) {
      const duration = elapsed;
      state.deviceTimePoints.forEach((point, idx) => {
        point.t = idx * duration / Math.max(1, count - 1);
      });
    }
    state.deviceTimeRunning = false;
    state.deviceTimeAccepting = false;
    setDeviceTimeControls(false);
    setDeviceTimeStatus(`Time stream done: ${count} samples, ${elapsed.toFixed(2)} s, ${rate.toFixed(1)} point/s, est. raw conversions ${rawRate.toFixed(1)}/s.`, "ok");
    renderDeviceTimePlot();
  }

  function parseDeviceTimeReply(text) {
    const parts = text.replaceAll(":", ",").split(",").map(part => part.trim());
    if (parts[0]?.toUpperCase() !== "Y") return false;
    const kind = parts[1]?.toUpperCase();
    if (kind === "START") {
      const expected = Number(parts[2]) || deviceTimeSamples();
      const mask = Number(parts[3]) || adcMaskFromSelectedAdcs(selectedDeviceTimeAdcs());
      const avg = Number(parts[4]) || deviceTimeOversample();
      const intervalUs = Number(parts[5]) || 0;
      state.deviceTimeCapture = {
        startedMs: performance.now(),
        expected,
        mask,
        avg,
        intervalUs,
        adcCount: selectedDeviceTimeAdcs().length,
        received: 0,
      };
      state.deviceTimePoints = [];
      state.deviceTimeAccepting = true;
      setDeviceTimeStatus(`Time stream started: ${expected} samples, oversample ${avg}, interval ${intervalUs} us.`);
      renderDeviceTimePlot();
      return true;
    }
    if (kind === "DONE") {
      finalizeTimeCapture(parts[2]);
      return true;
    }
    if (kind === "ERR") {
      state.deviceTimeRunning = false;
      state.deviceTimeAccepting = false;
      setDeviceTimeControls(false);
      setDeviceTimeStatus(`Time stream error: ${parts.slice(2).join(", ")}`, "warn");
      return true;
    }

    const idx = Number(parts[1]);
    const mask = Number(parts[2]);
    if (!Number.isFinite(idx) || !Number.isFinite(mask)) return true;
    const values = parseTimeAdcValues(parts, mask, 3);
    recordTimePoint(idx, values);
    return true;
  }

  const baseParseFirmwareSweepReply = parseFirmwareSweepReply;
  parseFirmwareSweepReply = function patchedParseFirmwareSweepReply(text) {
    if (parseDeviceTimeReply(text)) return true;
    return baseParseFirmwareSweepReply(text);
  };

  function setDeviceTimeControls(running) {
    const start = $("deviceTimeStartButton");
    const stop = $("deviceTimeStopButton");
    if (start) start.disabled = running;
    if (stop) stop.disabled = !running;
  }

  function drawEmptyTimePlot(message) {
    const canvas = $("deviceTimeCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(460, Math.round(rect.width || 900));
    const height = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fbfa";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#66737a";
    ctx.font = "14px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(message, width / 2, height / 2);
    const legend = $("deviceTimeLegend");
    if (legend) legend.innerHTML = "";
  }

  function renderDeviceTimePlot() {
    ensureDeviceTimeState();
    const canvas = $("deviceTimeCanvas");
    if (!canvas) return;
    const adcIndices = selectedDeviceTimeAdcs();
    const labels = adcIndices.map(idx => `ADC${idx}`);
    const points = state.deviceTimePoints || [];
    if (!points.length) {
      drawEmptyTimePlot("Start time plot to monitor ADC noise.");
      return;
    }

    const yMode = deviceTimeYMode();
    const samples = [];
    for (const point of points) {
      for (const label of labels) {
        const sample = point.adcs?.[label];
        if (sample) samples.push({ x: point.t, y: sweepYValue(sample, yMode) });
      }
    }
    if (!samples.length) {
      drawEmptyTimePlot("No selected ADC values in time stream.");
      return;
    }

    let minX = 0;
    let maxX = Math.max(...points.map(point => point.t), 0.001);
    if (maxX <= minX) maxX = minX + 1;
    let minY = Math.min(...samples.map(sample => sample.y));
    let maxY = Math.max(...samples.map(sample => sample.y));
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const yPad = (maxY - minY) * 0.08;
    minY -= yPad;
    maxY += yPad;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(460, Math.round(rect.width || 900));
    const height = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fbfa";
    ctx.fillRect(0, 0, width, height);

    const margin = { left: 64, right: 20, top: 18, bottom: 48 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    const sx = x => margin.left + (x - minX) / (maxX - minX) * plotW;
    const sy = y => margin.top + plotH - (y - minY) / (maxY - minY) * plotH;

    ctx.strokeStyle = "#d9e4e2";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#66737a";
    ctx.font = "12px Segoe UI, Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + plotH * i / 5;
      const value = maxY - (maxY - minY) * i / 5;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
      ctx.fillText(value.toPrecision(4), margin.left - 8, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 5; i++) {
      const x = margin.left + plotW * i / 5;
      const value = minX + (maxX - minX) * i / 5;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();
      ctx.fillText(value.toFixed(3), x, margin.top + plotH + 8);
    }

    ctx.strokeStyle = "#17323a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.lineTo(width - margin.right, margin.top + plotH);
    ctx.stroke();

    ctx.save();
    ctx.translate(18, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#17323a";
    ctx.font = "13px Segoe UI, Arial";
    ctx.textAlign = "center";
    ctx.fillText(yAxisLabel(yMode), 0, 0);
    ctx.restore();
    ctx.fillText("time (s)", margin.left + plotW / 2, height - 22);

    labels.forEach(label => {
      const adcIdx = Number(label.replace("ADC", ""));
      const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
      const series = points
        .map(point => ({ x: point.t, sample: point.adcs?.[label] }))
        .filter(item => item.sample)
        .map(item => ({ x: item.x, y: sweepYValue(item.sample, yMode) }));
      if (!series.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      series.forEach((item, idx) => {
        const x = sx(item.x);
        const y = sy(item.y);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    const legend = $("deviceTimeLegend");
    if (legend) {
      legend.innerHTML = labels.map(label => {
        const adcIdx = Number(label.replace("ADC", ""));
        const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
        return `<span><i style="background:${color}"></i>${label} / TIA${adcIdx + 1}</span>`;
      }).join("");
    }
  }

  function scheduleTimePlotRender() {
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      requestAnimationFrame(renderDeviceTimePlot);
    }, 100);
  }

  async function startDeviceTimePlot() {
    ensureDeviceTimeState();
    if (state.sweepRunning || state.gateProbeRunning || state.deviceTuneRunning) {
      setDeviceTimeStatus("Stop sweep, gate map, or live device tune before time plot.", "warn");
      return;
    }
    if (!firmwareSupportsTimeDomain()) {
      setDeviceTimeStatus("Firmware time-domain stream is not available; flash the latest firmware.", "warn");
      return;
    }
    const adcs = selectedDeviceTimeAdcs();
    const mask = adcMaskFromSelectedAdcs(adcs);
    const samples = deviceTimeSamples();
    const avg = deviceTimeOversample();
    const intervalUs = deviceTimeIntervalUs();
    const timeoutMs = Math.max(10000, samples * (Math.max(0.2, intervalUs / 1000) + adcs.length * Math.max(0.2, avg * 0.05)) + 10000);
    state.deviceTimeRunning = true;
    state.deviceTimeAccepting = true;
    state.deviceTimePoints = [];
    state.deviceTimeCapture = {
      startedMs: performance.now(),
      expected: samples,
      mask,
      avg,
      intervalUs,
      adcCount: adcs.length,
      received: 0,
    };
    setDeviceTimeControls(true);
    setDeviceTimeStatus("Applying current device tune values...");
    renderDeviceTimePlot();
    try {
      await applyDeviceTuneBiasForTime();
      setDeviceTimeStatus(`Time stream running: ${samples} samples, oversample ${avg}, interval ${intervalUs} us.`);
      const reply = await sendCommand(`Y,${mask},${samples},${avg},${intervalUs}`, {
        waitForReply: true,
        timeoutMs,
        replyMatcher: text => {
          const upper = text.toUpperCase();
          return upper.startsWith("Y,DONE") || upper.startsWith("Y,ERR") || upper.startsWith("ADC,ERR") || upper.startsWith("ADC,INIT_ERR");
        },
      });
      if (!reply) {
        state.deviceTimeRunning = false;
        state.deviceTimeAccepting = false;
        setDeviceTimeControls(false);
        setDeviceTimeStatus("Time stream timeout.", "warn");
      }
    } catch (error) {
      state.deviceTimeRunning = false;
      state.deviceTimeAccepting = false;
      setDeviceTimeControls(false);
      setDeviceTimeStatus(error.message, "warn");
    }
  }

  function stopDeviceTimePlot() {
    state.deviceTimeAccepting = false;
    state.deviceTimeRunning = false;
    setDeviceTimeControls(false);
    setDeviceTimeStatus("Stop requested; firmware stream may finish the current command.", "warn");
  }

  function clearDeviceTimePlot() {
    stopDeviceTimePlot();
    state.deviceTimePoints = [];
    state.deviceTimeCapture = null;
    renderDeviceTimePlot();
    setDeviceTimeStatus("Time-domain plot cleared.");
  }

  function bindDeviceTimeEvents() {
    $("deviceTimeYMode")?.addEventListener("change", renderDeviceTimePlot);
    $("deviceTimeStartButton")?.addEventListener("click", startDeviceTimePlot);
    $("deviceTimeStopButton")?.addEventListener("click", stopDeviceTimePlot);
    $("deviceTimeClearButton")?.addEventListener("click", clearDeviceTimePlot);
    window.addEventListener("resize", renderDeviceTimePlot);
  }

  function initDeviceTime() {
    if (!$("deviceTimeCanvas")) return;
    ensureDeviceTimeState();
    setDeviceTimeControls(false);
    bindDeviceTimeEvents();
    renderDeviceTimePlot();
  }

  window.addEventListener("DOMContentLoaded", initDeviceTime);
})();
