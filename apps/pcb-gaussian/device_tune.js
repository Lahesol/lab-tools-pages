(function () {
  const DEVICE_TUNE_POINT_LIMIT = 5000;
  const DEFAULT_DEVICE_TUNE_ADCS = [0, 1, 2, 3];

  function ensureDeviceTuneState() {
    if (typeof state === "undefined") return false;
    if (!Array.isArray(state.deviceTunePoints)) state.deviceTunePoints = [];
    if (!Array.isArray(state.deviceTuneAdcSelection)) state.deviceTuneAdcSelection = DEFAULT_DEVICE_TUNE_ADCS.slice();
    state.deviceTuneRunning = !!state.deviceTuneRunning;
    state.deviceTuneBusy = !!state.deviceTuneBusy;
    state.deviceTunePending = !!state.deviceTunePending;
    state.deviceTunePointIndex = Number.isFinite(state.deviceTunePointIndex) ? state.deviceTunePointIndex : 0;
    state.deviceTuneTimer = state.deviceTuneTimer || null;
    return true;
  }

  const baseRecordAdcValues = typeof recordAdcValues === "function" ? recordAdcValues : null;
  if (baseRecordAdcValues) {
    recordAdcValues = function patchedRecordAdcValues(values, source) {
      if (state.pendingAdcContext?.deviceTune) {
        recordDeviceTunePoint(values, source, state.pendingAdcContext);
        return;
      }
      return baseRecordAdcValues(values, source);
    };
  }

  function firmwareSupportsDeviceProbe() {
    const protocol = String(state.firmwareProtocol || "").toLowerCase();
    const version = String(state.firmwareVersion || "").toLowerCase();
    return protocol.includes("device") || version.includes("device-probe");
  }

  function voltageRange(param) {
    const fallback = param === "mu" ? { min: -6, max: 0 } : { min: -17, max: 0 };
    const voltages = getParamCalPoints(param)
      .map(point => Number(point.voltage))
      .filter(Number.isFinite);
    if (!voltages.length) return fallback;
    return { min: Math.min(...voltages), max: Math.max(...voltages) };
  }

  function setRange(input, range) {
    if (!input) return;
    input.min = range.min;
    input.max = range.max;
  }

  function roundedVoltage(value) {
    return String(Number(value).toFixed(3)).replace(/\.?0+$/, "");
  }

  function deviceTuneStatus(text, kind = "") {
    const status = $("deviceTuneStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `hint ${kind}`.trim();
  }

  function deviceTuneDevice() {
    const input = $("deviceTuneDevice");
    const device = deviceMuxInfo(input?.value).device;
    if (input) input.value = device;
    return device;
  }

  function deviceTuneXMode() {
    return $("deviceTuneXAxis")?.value === "vstart" ? "vstart" : "mu";
  }

  function deviceTuneYMode() {
    return $("deviceTuneYMode")?.value || "current";
  }

  function deviceTuneXLabel(mode = deviceTuneXMode()) {
    return mode === "vstart" ? "Vstart (V)" : "Vmu (V)";
  }

  function deviceTuneXRange(mode = deviceTuneXMode()) {
    return mode === "vstart" ? voltageRange("A") : voltageRange("mu");
  }

  function setDeviceTuneVoltages(muV, vstartV) {
    const muRange = voltageRange("mu");
    const vstartRange = voltageRange("A");
    const safeMu = clamp(Number(muV) || 0, muRange.min, muRange.max);
    const safeVstart = clamp(Number(vstartV) || 0, vstartRange.min, vstartRange.max);
    const muSlider = $("deviceTuneMuSlider");
    const muNumber = $("deviceTuneMuNumber");
    const vstartSlider = $("deviceTuneVstartSlider");
    const vstartNumber = $("deviceTuneVstartNumber");
    if (muSlider) muSlider.value = safeMu;
    if (muNumber) muNumber.value = roundedVoltage(safeMu);
    if (vstartSlider) vstartSlider.value = safeVstart;
    if (vstartNumber) vstartNumber.value = roundedVoltage(safeVstart);
    return { muV: safeMu, vstartV: safeVstart };
  }

  function readDeviceTuneVoltages(source = "") {
    const muSlider = $("deviceTuneMuSlider");
    const muNumber = $("deviceTuneMuNumber");
    const vstartSlider = $("deviceTuneVstartSlider");
    const vstartNumber = $("deviceTuneVstartNumber");
    const rawMu = source === "muSlider" ? muSlider?.value : source === "muNumber" ? muNumber?.value : (muNumber?.value ?? muSlider?.value);
    const rawVstart = source === "vstartSlider" ? vstartSlider?.value : source === "vstartNumber" ? vstartNumber?.value : (vstartNumber?.value ?? vstartSlider?.value);
    return setDeviceTuneVoltages(Number(rawMu), Number(rawVstart));
  }

  function syncDeviceTuneFromState() {
    if (!ensureDeviceTuneState()) return;
    const device = deviceTuneDevice();
    const st = state.deviceStates[device] || { a: 0, mu: 0 };
    setDeviceTuneVoltages(potCodeToMuVoltage(st.a), potCodeToVstartVoltage(st.mu));
    renderDeviceTunePlot();
  }

  function setupDeviceTuneSliders() {
    setRange($("deviceTuneMuSlider"), voltageRange("mu"));
    setRange($("deviceTuneMuNumber"), voltageRange("mu"));
    setRange($("deviceTuneVstartSlider"), voltageRange("A"));
    setRange($("deviceTuneVstartNumber"), voltageRange("A"));
    syncDeviceTuneFromState();
  }

  function selectedDeviceTuneAdcs() {
    ensureDeviceTuneState();
    const inputs = Array.from(document.querySelectorAll(".device-tune-adc-input"));
    if (inputs.length) {
      const selected = inputs
        .filter(input => input.checked)
        .map(input => Number(input.value))
        .filter(Number.isFinite);
      state.deviceTuneAdcSelection = selected;
      return selected;
    }
    return state.deviceTuneAdcSelection || DEFAULT_DEVICE_TUNE_ADCS.slice();
  }

  function deviceTuneAdcMask(indices) {
    let mask = 0;
    for (const adcIndex of indices) {
      if (Number.isFinite(adcIndex) && adcIndex >= 0 && adcIndex < ADC_TIA_COUNT) mask |= (1 << adcIndex);
    }
    return mask;
  }

  function renderDeviceTuneAdcFilters() {
    ensureDeviceTuneState();
    const host = $("deviceTuneAdcFilters");
    if (!host) return;
    const selected = new Set(state.deviceTuneAdcSelection || DEFAULT_DEVICE_TUNE_ADCS);
    host.innerHTML = ADC_LABELS.map((label, idx) => `
      <label class="adc-filter-chip">
        <input class="device-tune-adc-input" type="checkbox" value="${idx}" ${selected.has(idx) ? "checked" : ""} />
        ${label}<span>TIA${idx + 1}</span>
      </label>
    `).join("");
    document.querySelectorAll(".device-tune-adc-input").forEach(input => {
      input.addEventListener("change", () => {
        selectedDeviceTuneAdcs();
        renderDeviceTunePlot();
      });
    });
  }

  function deviceTuneRateMs() {
    const input = $("deviceTuneRateMs");
    const value = clamp(Math.round(Number(input?.value) || 100), 20, 2000);
    if (input) input.value = value;
    return value;
  }

  function setDeviceTuneControls(running) {
    const start = $("deviceTuneStartButton");
    const stop = $("deviceTuneStopButton");
    if (start) start.disabled = running;
    if (stop) stop.disabled = !running;
  }

  function applyDeviceTuneState(device, muCode, vstartCode) {
    const prev = state.deviceStates[device] || {};
    state.deviceStates[device] = { a: muCode, mu: vstartCode };
    if (Number($("potDevice")?.value) === device) {
      $("aCode").value = muCode;
      $("muCode").value = vstartCode;
      updatePotReadout();
    }
    if (prev.a !== muCode || prev.mu !== vstartCode) renderDeviceTable();
  }

  function recordDeviceTunePoint(values, source, context) {
    ensureDeviceTuneState();
    syncTiaStates();
    const adcs = {};
    for (let adcIdx = 0; adcIdx < ADC_TIA_COUNT; adcIdx++) {
      const raw = values[adcIdx];
      if (!Number.isFinite(raw)) continue;
      const voltage = adcRawToVoltage(raw);
      const current = adcVoltageToCurrentUa(voltage);
      const tiaIndex = tiaIndexForAdc(adcIdx);
      const tia = state.tiaStates[tiaIndex] || state.tiaStates[adcIdx];
      adcs[`ADC${adcIdx}`] = {
        raw,
        voltage,
        current,
        adc: tia.adc,
        tia: `TIA${tiaIndex + 1}`,
        jumper: connectedDevicesSummary(tia),
      };
    }

    state.deviceTunePoints.push({
      point: context.pointIndex,
      time: nowTime(),
      device: context.device,
      xAxis: context.xAxis,
      x: context.x,
      muV: context.muV,
      vstartV: context.vstartV,
      muCode: context.muCode,
      vstartCode: context.vstartCode,
      adcs,
      source,
    });
    while (state.deviceTunePoints.length > DEVICE_TUNE_POINT_LIMIT) state.deviceTunePoints.shift();

    const tias = context.selectedTias || tiaIndicesFromAdcMask(context.adcMask);
    for (const tiaNo of tias) {
      const tia = state.tiaStates[tiaNo - 1];
      const adcIndex = adcIndexFromTia(tiaNo);
      const rawValue = adcIndex === null ? null : values[adcIndex];
      const hasRaw = Number.isFinite(rawValue);
      const voltage = hasRaw ? adcRawToVoltage(rawValue) : "";
      const current = hasRaw ? adcVoltageToCurrentUa(voltage) : "";
      addMeasurement({
        time: nowTime(),
        dac: `DEV${context.device}`,
        code: `${context.muCode}/${context.vstartCode}`,
        vhigh: `${context.muV.toFixed(5)}/${context.vstartV.toFixed(5)}`,
        tia: `TIA${tiaNo}/${tia.adc}`,
        raw: hasRaw ? rawValue : "",
        voltage: hasRaw ? voltage.toFixed(6) : "",
        current: hasRaw ? current.toFixed(6) : "",
        jumper: connectedDevicesSummary(tia),
        devices: connectedDevicesSummary(tia),
        source,
      });
    }

    renderDeviceTunePlot();
  }

  function drawEmptyDeviceTunePlot(message) {
    const canvas = $("deviceTunePlotCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(460, Math.round(rect.width || 720));
    const height = 320;
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
    const legend = $("deviceTuneLegend");
    if (legend) legend.innerHTML = "";
  }

  function setDeviceTunePlotStatus(text) {
    const status = $("deviceTunePlotStatus");
    if (!status) return;
    status.textContent = text;
    status.title = text;
  }

  function renderDeviceTunePlot() {
    ensureDeviceTuneState();
    const canvas = $("deviceTunePlotCanvas");
    if (!canvas) return;
    const device = deviceTuneDevice();
    const xAxis = deviceTuneXMode();
    const yMode = deviceTuneYMode();
    const title = $("deviceTunePlotTitle");
    if (title) title.textContent = `${xAxis === "vstart" ? "Vstart" : "Vmu"} X-axis plot`;

    const adcIndices = selectedDeviceTuneAdcs();
    const labels = adcIndices.map(idx => `ADC${idx}`);
    const points = state.deviceTunePoints
      .filter(point => point.device === device && point.xAxis === xAxis)
      .slice();

    if (!adcIndices.length) {
      drawEmptyDeviceTunePlot("Select at least one ADC.");
      setDeviceTunePlotStatus(`Device ${device}: no ADC selected.`);
      return;
    }

    const samples = [];
    for (const point of points) {
      for (const label of labels) {
        const sample = point.adcs?.[label];
        if (sample) samples.push({ x: point.x, y: sweepYValue(sample, yMode) });
      }
    }

    if (!samples.length) {
      drawEmptyDeviceTunePlot(`Move the ${xAxis === "vstart" ? "Vstart" : "Vmu"} slider and sample ADC.`);
      setDeviceTunePlotStatus(`Device ${device}: no ${xAxis === "vstart" ? "Vstart" : "Vmu"} tune data yet.`);
      return;
    }

    const range = deviceTuneXRange(xAxis);
    const minX = range.min;
    const maxX = range.max;
    let minY = Math.min(...samples.map(sample => sample.y));
    let maxY = Math.max(...samples.map(sample => sample.y));
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const yPad = (maxY - minY) * 0.08;
    minY -= yPad;
    maxY += yPad;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(460, Math.round(rect.width || 720));
    const height = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fbfa";
    ctx.fillRect(0, 0, width, height);

    const margin = { left: 64, right: 20, top: 20, bottom: 52 };
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
    ctx.fillText(deviceTuneXLabel(xAxis), margin.left + plotW / 2, height - 24);

    labels.forEach(label => {
      const adcIdx = Number(label.replace("ADC", ""));
      const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
      const series = points
        .map(point => ({ x: point.x, point: point.point, sample: point.adcs?.[label] }))
        .filter(item => item.sample)
        .map(item => ({ x: item.x, y: sweepYValue(item.sample, yMode), point: item.point }))
        .sort((a, b) => a.x - b.x || a.point - b.point);
      if (!series.length) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      series.forEach((item, idx) => {
        const x = sx(item.x);
        const y = sy(item.y);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      for (const item of series) {
        ctx.beginPath();
        ctx.arc(sx(item.x), sy(item.y), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const legend = $("deviceTuneLegend");
    if (legend) {
      legend.innerHTML = labels.map(label => {
        const adcIdx = Number(label.replace("ADC", ""));
        const color = PLOT_COLORS[adcIdx % PLOT_COLORS.length];
        return `<span><i style="background:${color}"></i>${label} / TIA${adcIdx + 1}</span>`;
      }).join("");
    }
    const labelText = labels.length > 3 ? `${labels.length} ADCs` : labels.join("/");
    setDeviceTunePlotStatus(`Device ${device}: ${points.length} point(s), ${labelText}.`);
  }

  function scheduleDeviceTuneSample(delayMs = null) {
    if (!state.deviceTuneRunning) return;
    if (state.deviceTuneTimer) clearTimeout(state.deviceTuneTimer);
    state.deviceTuneTimer = setTimeout(() => {
      state.deviceTuneTimer = null;
      sampleDeviceTune(false);
    }, delayMs ?? deviceTuneRateMs());
  }

  async function sampleDeviceTune(force = false) {
    ensureDeviceTuneState();
    if (state.deviceTuneBusy) {
      state.deviceTunePending = true;
      return;
    }
    state.deviceTuneBusy = true;
    try {
      do {
        state.deviceTunePending = false;
        if (!force && !state.deviceTuneRunning) break;
        syncTiaStates();
        const adcIndices = selectedDeviceTuneAdcs();
        if (!adcIndices.length) {
          deviceTuneStatus("Select at least one ADC.", "warn");
          break;
        }
        const mask = deviceTuneAdcMask(adcIndices);
        const device = deviceTuneDevice();
        const { muV, vstartV } = readDeviceTuneVoltages();
        const muCode = muVoltageToCode(muV);
        const vstartCode = vstartVoltageToCode(vstartV);
        const xAxis = deviceTuneXMode();
        const pointIndex = state.deviceTunePointIndex++;
        applyDeviceTuneState(device, muCode, vstartCode);
        const context = {
          deviceTune: true,
          pointIndex,
          device,
          xAxis,
          x: xAxis === "vstart" ? vstartV : muV,
          muV,
          vstartV,
          muCode,
          vstartCode,
          selectedAdcs: adcIndices.slice(),
          selectedTias: tiaIndicesFromAdcMask(mask),
          adcMask: mask,
        };

        let reply = null;
        if (firmwareSupportsDeviceProbe()) {
          state.pendingAdcContext = context;
          reply = await sendCommand(`Q${device},${muCode},${vstartCode},${mask},${adcAvgSamples()},${sweepSettleUs()}`, {
            waitForReply: true,
            timeoutMs: 4000,
            replyMatcher: text => {
              const upper = text.toUpperCase();
              return upper.startsWith("ADC,") || upper.startsWith("Q,ERR") || upper.startsWith("ERR");
            },
          });
        } else {
          await programLogicalDevice(device, muCode, vstartCode);
          state.pendingAdcContext = context;
          reply = await sendCommand("ADC", {
            waitForReply: true,
            timeoutMs: 4000,
            replyMatcher: text => text.toUpperCase().startsWith("ADC,") || text.toUpperCase().startsWith("ERR"),
          });
        }

        if (state.pendingAdcContext?.deviceTune && state.pendingAdcContext.pointIndex === pointIndex) {
          state.pendingAdcContext = null;
        }

        const upperReply = String(reply || "").toUpperCase();
        if (reply === undefined) {
          deviceTuneStatus("Serial not connected; dry-run only.", "warn");
        } else if (!reply || upperReply.startsWith("ERR") || upperReply.startsWith("Q,ERR")) {
          deviceTuneStatus(`Device tune failed: ${replySummary(reply)}.`, "warn");
        } else {
          deviceTuneStatus(`Device ${device}: Vmu ${muV.toFixed(3)} V, Vstart ${vstartV.toFixed(3)} V, ${state.deviceTunePoints.length} point(s).`, "ok");
        }
        force = false;
      } while (state.deviceTunePending && state.deviceTuneRunning);
    } catch (error) {
      deviceTuneStatus(error.message, "warn");
    } finally {
      state.deviceTuneBusy = false;
      if (state.deviceTunePending && state.deviceTuneRunning) scheduleDeviceTuneSample(0);
    }
  }

  function startDeviceTune() {
    ensureDeviceTuneState();
    if (state.sweepRunning || state.gateProbeRunning) {
      deviceTuneStatus("Stop sweep or gate map before device tune.", "warn");
      return;
    }
    state.deviceTuneRunning = true;
    state.deviceTunePending = false;
    setDeviceTuneControls(true);
    sampleDeviceTune(false);
  }

  function stopDeviceTune() {
    ensureDeviceTuneState();
    state.deviceTuneRunning = false;
    state.deviceTunePending = false;
    if (state.deviceTuneTimer) clearTimeout(state.deviceTuneTimer);
    state.deviceTuneTimer = null;
    setDeviceTuneControls(false);
    deviceTuneStatus("Device tune stopped.");
  }

  function clearDeviceTuneMap() {
    stopDeviceTune();
    state.deviceTunePoints = [];
    state.deviceTunePointIndex = 0;
    if (state.pendingAdcContext?.deviceTune) state.pendingAdcContext = null;
    renderDeviceTunePlot();
    deviceTuneStatus("Device tune map cleared.", "ok");
  }

  function onDeviceTuneInput(source) {
    readDeviceTuneVoltages(source);
    if (state.deviceTuneRunning) scheduleDeviceTuneSample();
  }

  function bindDeviceTuneEvents() {
    $("deviceTuneDevice")?.addEventListener("input", syncDeviceTuneFromState);
    $("deviceTuneXAxis")?.addEventListener("change", renderDeviceTunePlot);
    $("deviceTuneYMode")?.addEventListener("change", renderDeviceTunePlot);
    $("deviceTuneRateMs")?.addEventListener("change", deviceTuneRateMs);
    $("deviceTuneMuSlider")?.addEventListener("input", () => onDeviceTuneInput("muSlider"));
    $("deviceTuneMuNumber")?.addEventListener("input", () => onDeviceTuneInput("muNumber"));
    $("deviceTuneVstartSlider")?.addEventListener("input", () => onDeviceTuneInput("vstartSlider"));
    $("deviceTuneVstartNumber")?.addEventListener("input", () => onDeviceTuneInput("vstartNumber"));
    $("deviceTuneStartButton")?.addEventListener("click", startDeviceTune);
    $("deviceTuneSampleButton")?.addEventListener("click", () => sampleDeviceTune(true));
    $("deviceTuneStopButton")?.addEventListener("click", stopDeviceTune);
    $("deviceTuneClearButton")?.addEventListener("click", clearDeviceTuneMap);
    ["saveParamCalButton", "loadProjectParamCalButton", "resetParamCalButton"].forEach(id => {
      $(id)?.addEventListener("click", () => setTimeout(() => {
        setupDeviceTuneSliders();
        renderDeviceTunePlot();
      }, 0));
    });
    window.addEventListener("resize", renderDeviceTunePlot);
  }

  function initDeviceTune() {
    if (!$("deviceTuneDevice")) return;
    ensureDeviceTuneState();
    renderDeviceTuneAdcFilters();
    setupDeviceTuneSliders();
    setDeviceTuneControls(false);
    deviceTuneStatus("Device tune idle");
    bindDeviceTuneEvents();
    renderDeviceTunePlot();
  }

  window.addEventListener("DOMContentLoaded", initDeviceTune);
})();
