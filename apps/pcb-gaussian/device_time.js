(function () {
  const DEVICE_TIME_POINT_LIMIT = 50000;
  const DEVICE_TIME_WINDOW_S = 10;
  const DEVICE_TIME_CHUNK_S = 1;
  const DEVICE_TIME_DAC_MV_STEP = 10;
  let renderTimer = null;

  function snapDeviceTimeDacMv(value) {
    const snapped = Math.round((Number(value) || 0) / DEVICE_TIME_DAC_MV_STEP) * DEVICE_TIME_DAC_MV_STEP;
    return clamp(snapped, DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
  }

  function ensureDeviceTimeState() {
    if (!Array.isArray(state.deviceTimePoints)) state.deviceTimePoints = [];
    state.deviceTimeRunning = !!state.deviceTimeRunning;
    state.deviceTimeAccepting = state.deviceTimeAccepting !== false;
    state.deviceTimeCapture = state.deviceTimeCapture || null;
    state.deviceTimeRunToken = Number.isFinite(Number(state.deviceTimeRunToken)) ? Number(state.deviceTimeRunToken) : 0;
    state.deviceTimeLoopActive = !!state.deviceTimeLoopActive;
  }

  function setDeviceTimeStatus(text, kind = "") {
    const status = $("deviceTimeStatus");
    if (!status) return;
    status.textContent = text;
    status.title = text;
    status.className = `hint ${kind}`.trim();
  }

  function deviceTimeRateHz() {
    const input = $("deviceTimeRateHz");
    const value = clamp(Number(input?.value) || 20, 0.1, 1000);
    if (input) input.value = value;
    return value;
  }

  function deviceTimeOversample() {
    const input = $("deviceTimeOversample");
    const maxAvg = window.PCB_GAUSSIAN_ADC_AVG_MAX || 4096;
    const value = clamp(Math.round(Number(input?.value) || 1), 1, maxAvg);
    if (input) input.value = value;
    return value;
  }

  function deviceTimeIntervalUs(rateHz = deviceTimeRateHz()) {
    return clamp(Math.round(1_000_000 / Math.max(0.1, rateHz)), 0, 65000);
  }

  function deviceTimePostChunkDelayMs(samples, rateHz, intervalUs) {
    const targetUs = Math.max(1, 1_000_000 / Math.max(0.1, rateHz));
    const extraUs = Math.max(0, samples * (targetUs - intervalUs));
    return extraUs / 1000;
  }

  function deviceTimeChunkSamples(rateHz = deviceTimeRateHz()) {
    return clamp(Math.max(1, Math.round(rateHz * DEVICE_TIME_CHUNK_S)), 1, 5000);
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

  function voltageRange(param) {
    const points = typeof getParamCalPoints === "function" ? getParamCalPoints(param) : [];
    const voltages = points.map(point => Number(point.voltage)).filter(Number.isFinite);
    if (!voltages.length) return { min: 0, max: 20 };
    return { min: Math.min(...voltages), max: Math.max(...voltages) };
  }

  function setNumberRange(input, range) {
    if (!input || !range) return;
    input.min = range.min;
    input.max = range.max;
  }

  function syncDeviceTimeVoltageRanges() {
    setNumberRange($("deviceTimeDacMvNumber"), { min: DAC_OUTPUT_MIN_MV, max: DAC_OUTPUT_MAX_MV });
    setNumberRange($("deviceTimeMuNumber"), voltageRange("mu"));
    setNumberRange($("deviceTimeVstartNumber"), voltageRange("A"));
  }

  function syncDeviceTimeBiasFromDeviceTune() {
    const timeDevice = $("deviceTimeDevice");
    const timeDac = $("deviceTimeDac");
    const timeDacMv = $("deviceTimeDacMvNumber");
    const timeMu = $("deviceTimeMuNumber");
    const timeVstart = $("deviceTimeVstartNumber");
    if (timeDevice && $("deviceTuneDevice")) timeDevice.value = $("deviceTuneDevice").value;
    if (timeDac && $("deviceTuneDac")) timeDac.value = $("deviceTuneDac").value;
    if (timeDacMv && $("deviceTuneDacMvNumber")) timeDacMv.value = $("deviceTuneDacMvNumber").value;
    if (timeMu && $("deviceTuneMuNumber")) timeMu.value = $("deviceTuneMuNumber").value;
    if (timeVstart && $("deviceTuneVstartNumber")) timeVstart.value = $("deviceTuneVstartNumber").value;
  }

  function readDeviceTimeBiasInputs() {
    const device = deviceMuxInfo($("deviceTimeDevice")?.value ?? $("deviceTuneDevice")?.value).device;
    const dac = $("deviceTimeDac")?.value === "D1" ? "D1" : "D2";
    const dacMv = snapDeviceTimeDacMv($("deviceTimeDacMvNumber")?.value);
    const muRange = voltageRange("mu");
    const vstartRange = voltageRange("A");
    const muV = clamp(Number($("deviceTimeMuNumber")?.value) || 0, muRange.min, muRange.max);
    const vstartV = clamp(Number($("deviceTimeVstartNumber")?.value) || 0, vstartRange.min, vstartRange.max);
    const muCode = muVoltageToCode(muV);
    const vstartCode = vstartVoltageToCode(vstartV);
    if ($("deviceTimeDacMvNumber")) $("deviceTimeDacMvNumber").value = dacMv;
    if ($("deviceTimeMuNumber")) $("deviceTimeMuNumber").value = muV;
    if ($("deviceTimeVstartNumber")) $("deviceTimeVstartNumber").value = vstartV;
    return { device, dac, dacMv, muV, vstartV, muCode, vstartCode };
  }

  function reflectDeviceTimeBiasToDeviceTune(config) {
    if ($("deviceTuneDevice")) $("deviceTuneDevice").value = config.device;
    if ($("deviceTuneDac")) $("deviceTuneDac").value = config.dac;
    if ($("deviceTuneDacMvNumber")) $("deviceTuneDacMvNumber").value = config.dacMv;
    if ($("deviceTuneDacSlider")) $("deviceTuneDacSlider").value = config.dacMv;
    if ($("deviceTuneMuNumber")) $("deviceTuneMuNumber").value = config.muV;
    if ($("deviceTuneMuSlider")) $("deviceTuneMuSlider").value = config.muV;
    if ($("deviceTuneVstartNumber")) $("deviceTuneVstartNumber").value = config.vstartV;
    if ($("deviceTuneVstartSlider")) $("deviceTuneVstartSlider").value = config.vstartV;
  }

  async function applyDeviceTimeBias() {
    const config = readDeviceTimeBiasInputs();
    reflectDeviceTimeBiasToDeviceTune(config);
    const dacReply = await sendCommand(`V${config.dac.slice(1)},${config.dacMv}`, {
      waitForReply: true,
      timeoutMs: PROGRAM_REPLY_TIMEOUT_MS,
    });
    if (replyLooksBad(dacReply)) logLine(`[warn] noise monitor ${config.dac} ${replySummary(dacReply)}`);
    await programLogicalDevice(config.device, config.muCode, config.vstartCode);
    const settle = sweepSettleUs();
    if (settle > 0) await sleep(settle / 1000);
    return config;
  }

  async function applyDeviceTimeBiasNow() {
    if (!state.writer) {
      setDeviceTimeStatus("Connect serial before applying noise monitor bias.", "warn");
      return;
    }
    if (state.deviceTimeRunning) {
      state.deviceTimePendingBias = true;
      setDeviceTimeStatus("Bias update queued; it will apply after the current monitor chunk.", "warn");
      return;
    }
    try {
      const config = await applyDeviceTimeBias();
      setDeviceTimeStatus(`Bias applied: ${config.dac} ${(config.dacMv / 1000).toFixed(3)} V, Vmu ${config.muV.toFixed(3)} V, Vstart ${config.vstartV.toFixed(3)} V.`, "ok");
    } catch (error) {
      setDeviceTimeStatus(error.message, "warn");
    }
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

  function captureElapsedSeconds(capture = state.deviceTimeCapture) {
    return capture ? Math.max(0.001, (performance.now() - capture.startedMs) / 1000) : 0.001;
  }

  function actualDeviceTimeRate(capture = state.deviceTimeCapture) {
    return capture ? capture.received / captureElapsedSeconds(capture) : 0;
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
        current: adcVoltageToCurrentUa(voltage, adcIdx),
      };
    }
    const elapsed = captureElapsedSeconds(capture);
    const point = {
      idx: capture.received,
      firmwareIdx: idx,
      t: elapsed,
      adcs,
    };
    state.deviceTimePoints.push(point);
    const cutoff = Math.max(0, point.t - DEVICE_TIME_WINDOW_S);
    while (state.deviceTimePoints.length && state.deviceTimePoints[0].t < cutoff) state.deviceTimePoints.shift();
    while (state.deviceTimePoints.length > DEVICE_TIME_POINT_LIMIT) state.deviceTimePoints.shift();
    capture.received += 1;
    capture.chunkReceived = (capture.chunkReceived || 0) + 1;
    if (capture.received % 25 === 0) {
      const rate = actualDeviceTimeRate(capture);
      const rawRate = rate * Math.max(1, capture.avg) * Math.max(1, capture.adcCount);
      setDeviceTimeStatus(`Noise monitor running: target ${capture.targetRateHz} Hz, actual ${rate.toFixed(1)} point/s, raw ${rawRate.toFixed(1)}/s, window ${DEVICE_TIME_WINDOW_S}s.`);
    }
    scheduleTimePlotRender();
  }

  function handleTimeStart(parts) {
    if (!state.deviceTimeRunning) return;
    const expected = Number(parts[2]) || state.deviceTimeChunkSamples || 0;
    const mask = Number(parts[3]) || adcMaskFromSelectedAdcs(selectedDeviceTimeAdcs());
    const avg = Number(parts[4]) || deviceTimeOversample();
    const intervalUs = Number(parts[5]) || deviceTimeIntervalUs();
    const capture = state.deviceTimeCapture || {
      startedMs: performance.now(),
      received: 0,
      continuous: true,
    };
    state.deviceTimeCapture = {
      ...capture,
      chunkExpected: expected,
      chunkReceived: 0,
      mask,
      avg,
      intervalUs,
      adcCount: selectedDeviceTimeAdcs().length,
      targetRateHz: deviceTimeRateHz(),
      continuous: true,
    };
    state.deviceTimeAccepting = true;
    setDeviceTimeStatus(`Noise monitor chunk started: target ${state.deviceTimeCapture.targetRateHz} Hz, oversample ${avg}, window ${DEVICE_TIME_WINDOW_S}s.`);
    renderDeviceTimePlot();
  }

  function handleTimeDone(countText) {
    const capture = state.deviceTimeCapture;
    if (!capture) return;
    const chunkCount = Number(countText) || capture.chunkReceived || 0;
    const rate = actualDeviceTimeRate(capture);
    if (capture.continuous && state.deviceTimeRunning) {
      setDeviceTimeStatus(`Noise monitor running: chunk ${chunkCount} sample(s), actual ${rate.toFixed(1)} point/s, window ${DEVICE_TIME_WINDOW_S}s.`);
      return;
    }
    state.deviceTimeRunning = false;
    state.deviceTimeAccepting = false;
    setDeviceTimeControls(false);
    setDeviceTimeStatus(`Noise monitor stopped: ${capture.received} sample(s), actual ${rate.toFixed(1)} point/s.`, "ok");
    renderDeviceTimePlot();
  }

  function parseDeviceTimeReply(text) {
    const parts = text.replaceAll(":", ",").split(",").map(part => part.trim());
    if (parts[0]?.toUpperCase() !== "Y") return false;
    const kind = parts[1]?.toUpperCase();
    if (kind === "START") {
      handleTimeStart(parts);
      return true;
    }
    if (kind === "DONE") {
      handleTimeDone(parts[2]);
      return true;
    }
    if (kind === "ERR") {
      state.deviceTimeRunning = false;
      state.deviceTimeAccepting = false;
      setDeviceTimeControls(false);
      setDeviceTimeStatus(`Noise monitor error: ${parts.slice(2).join(", ")}`, "warn");
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
      drawEmptyTimePlot(`Start noise monitor. Plot window is fixed at ${DEVICE_TIME_WINDOW_S} s.`);
      return;
    }

    const yMode = deviceTimeYMode();
    const latestT = Math.max(...points.map(point => point.t), 0);
    const maxX = Math.max(DEVICE_TIME_WINDOW_S, latestT);
    const minX = Math.max(0, maxX - DEVICE_TIME_WINDOW_S);
    const visiblePoints = points.filter(point => point.t >= minX && point.t <= maxX);
    const samples = [];
    for (const point of visiblePoints) {
      for (const label of labels) {
        const sample = point.adcs?.[label];
        if (sample) samples.push({ x: point.t, y: sweepYValue(sample, yMode) });
      }
    }
    if (!samples.length) {
      drawEmptyTimePlot("No selected ADC values in the 10 s noise window.");
      return;
    }

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
      ctx.fillText(value.toFixed(2), x, margin.top + plotH + 8);
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
    ctx.fillText("time (s), rolling 10 s", margin.left + plotW / 2, height - 22);

    labels.forEach(label => {
      const adcIdx = Number(label.replace("ADC", ""));
      const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
      const series = visiblePoints
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

  async function runDeviceTimeChunks(runToken) {
    while (state.deviceTimeRunning && state.deviceTimeRunToken === runToken) {
      const adcs = selectedDeviceTimeAdcs();
      const mask = adcMaskFromSelectedAdcs(adcs);
      const avg = deviceTimeOversample();
      const targetRateHz = deviceTimeRateHz();
      const samples = deviceTimeChunkSamples(targetRateHz);
      const intervalUs = deviceTimeIntervalUs(targetRateHz);
      const postChunkDelayMs = deviceTimePostChunkDelayMs(samples, targetRateHz, intervalUs);
      const chunkSeconds = samples / Math.max(0.1, targetRateHz);
      const timeoutMs = Math.max(8000, Math.round(chunkSeconds * 1000 + samples * adcs.length * Math.max(0.2, avg * 0.08) + 8000));
      state.deviceTimeChunkSamples = samples;
      state.deviceTimeCapture = {
        ...(state.deviceTimeCapture || {}),
        targetRateHz,
        avg,
        intervalUs,
        adcCount: adcs.length,
        continuous: true,
      };
      const reply = await sendCommand(`Y,${mask},${samples},${avg},${intervalUs}`, {
        waitForReply: true,
        timeoutMs,
        replyMatcher: text => {
          const upper = text.toUpperCase();
          return upper.startsWith("Y,DONE") || upper.startsWith("Y,ERR") || upper.startsWith("ADC,ERR") || upper.startsWith("ADC,INIT_ERR");
        },
      });
      if (!state.deviceTimeRunning || state.deviceTimeRunToken !== runToken) break;
      if (!reply) {
        state.deviceTimeRunning = false;
        state.deviceTimeAccepting = false;
        setDeviceTimeControls(false);
        setDeviceTimeStatus("Noise monitor timeout.", "warn");
        break;
      }
      if (String(reply).toUpperCase().startsWith("Y,ERR") || String(reply).toUpperCase().startsWith("ADC,")) break;
      if (state.deviceTimePendingBias && state.deviceTimeRunning && state.deviceTimeRunToken === runToken) {
        state.deviceTimePendingBias = false;
        setDeviceTimeStatus("Applying queued noise monitor bias...");
        await applyDeviceTimeBias();
      }
      await sleep(Math.max(5, postChunkDelayMs));
    }
  }

  async function startDeviceTimePlot() {
    ensureDeviceTimeState();
    if (state.sweepRunning || state.gateProbeRunning || state.deviceTuneRunning) {
      setDeviceTimeStatus("Stop sweep, gate map, or live device tune before noise monitor.", "warn");
      return;
    }
    if (!firmwareSupportsTimeDomain()) {
      setDeviceTimeStatus("Firmware time-domain stream is not available; flash the latest firmware.", "warn");
      return;
    }
    if (!state.writer) {
      setDeviceTimeStatus("Connect serial before starting noise monitor.", "warn");
      return;
    }
    if (state.deviceTimeRunning || state.deviceTimeLoopActive) {
      setDeviceTimeStatus("Noise monitor is already running. Stop it before starting a new run.", "warn");
      return;
    }
    const adcs = selectedDeviceTimeAdcs();
    const mask = adcMaskFromSelectedAdcs(adcs);
    const avg = deviceTimeOversample();
    const runToken = state.deviceTimeRunToken + 1;
    state.deviceTimeRunToken = runToken;
    state.deviceTimeLoopActive = true;
    state.deviceTimeRunning = true;
    state.deviceTimeAccepting = true;
    state.deviceTimePendingBias = false;
    state.deviceTimePoints = [];
    state.deviceTimeCapture = {
      startedMs: performance.now(),
      mask,
      avg,
      intervalUs: deviceTimeIntervalUs(),
      adcCount: adcs.length,
      targetRateHz: deviceTimeRateHz(),
      received: 0,
      continuous: true,
    };
    setDeviceTimeControls(true);
    setDeviceTimeStatus("Applying noise monitor bias...");
    renderDeviceTimePlot();
    try {
      await applyDeviceTimeBias();
      setDeviceTimeStatus(`Noise monitor running: target ${state.deviceTimeCapture.targetRateHz} Hz, oversample ${avg}, window ${DEVICE_TIME_WINDOW_S}s.`);
      await runDeviceTimeChunks(runToken);
    } catch (error) {
      if (state.deviceTimeRunToken === runToken) {
        state.deviceTimeRunning = false;
        state.deviceTimeAccepting = false;
        setDeviceTimeControls(false);
        setDeviceTimeStatus(error.message, "warn");
      }
    } finally {
      if (state.deviceTimeRunToken === runToken) {
        state.deviceTimeLoopActive = false;
        if (!state.deviceTimeRunning) setDeviceTimeControls(false);
      } else if (!state.deviceTimeRunning) {
        state.deviceTimeLoopActive = false;
      }
    }
  }

  function stopDeviceTimePlot() {
    ensureDeviceTimeState();
    state.deviceTimeRunToken += 1;
    state.deviceTimeAccepting = false;
    state.deviceTimeRunning = false;
    state.deviceTimePendingBias = false;
    setDeviceTimeControls(false);
    const capture = state.deviceTimeCapture;
    const rate = actualDeviceTimeRate(capture);
    setDeviceTimeStatus(`Stop requested; current firmware chunk may finish. ${capture?.received || 0} sample(s), actual ${rate.toFixed(1)} point/s.`, "warn");
  }

  function clearDeviceTimePlot() {
    stopDeviceTimePlot();
    state.deviceTimePoints = [];
    state.deviceTimeCapture = null;
    renderDeviceTimePlot();
    setDeviceTimeStatus("Noise monitor plot cleared.");
  }

  function bindDeviceTimeEvents() {
    $("deviceTimeYMode")?.addEventListener("change", renderDeviceTimePlot);
    $("deviceTimeRateHz")?.addEventListener("change", deviceTimeRateHz);
    $("deviceTimeOversample")?.addEventListener("change", deviceTimeOversample);
    $("deviceTimeStartButton")?.addEventListener("click", startDeviceTimePlot);
    $("deviceTimeStopButton")?.addEventListener("click", stopDeviceTimePlot);
    $("deviceTimeClearButton")?.addEventListener("click", clearDeviceTimePlot);
    $("deviceTimeApplyBiasButton")?.addEventListener("click", applyDeviceTimeBiasNow);
    window.addEventListener("resize", renderDeviceTimePlot);
  }

  function initDeviceTime() {
    if (!$("deviceTimeCanvas")) return;
    ensureDeviceTimeState();
    syncDeviceTimeVoltageRanges();
    syncDeviceTimeBiasFromDeviceTune();
    setDeviceTimeControls(false);
    bindDeviceTimeEvents();
    renderDeviceTimePlot();
  }

  window.addEventListener("DOMContentLoaded", initDeviceTime);
})();
