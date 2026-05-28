(function () {
  const A_ERROR_VSTART_STEP_V = 0.05;

  function directionValue(id, fallback = 1) {
    const value = Number($(id)?.value);
    return value < 0 ? -1 : fallback;
  }

  function aDirectionGuardEnabled() {
    const input = $("fitAerrorGuard");
    return !input || input.checked;
  }

  function paramVoltageBounds(param) {
    const points = typeof getParamCalPoints === "function" ? getParamCalPoints(param) : [];
    const voltages = points.map(point => Number(point.voltage)).filter(Number.isFinite);
    if (!voltages.length) return { min: -Infinity, max: Infinity };
    return { min: Math.min(...voltages), max: Math.max(...voltages) };
  }

  function clampParamVoltage(param, voltage) {
    const bounds = paramVoltageBounds(param);
    return clamp(Number(voltage), bounds.min, bounds.max);
  }

  function normalizedAmplitudeDelta(ampError, vstartGain, aDirection) {
    const tolerances = typeof autoFitTolerances === "function" ? autoFitTolerances() : { aTol: 0 };
    const aTol = Number(tolerances.aTol);
    const scale = aTol > 0 ? aTol : 1;
    const norm = Number(ampError) / scale;
    const gain = Math.max(0, Math.abs(Number(vstartGain) || 0));
    const rawDelta = norm * A_ERROR_VSTART_STEP_V * gain * aDirection;
    return {
      delta: clamp(rawDelta, -1.2, 1.2),
      norm,
    };
  }

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
  }

  function clamp01(value) {
    if (!Number.isFinite(value)) return NaN;
    return Math.max(0, Math.min(1, value));
  }

  function formatLogNumber(value, precision = 5) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    const abs = Math.abs(number);
    if (abs > 0 && (abs < 1e-3 || abs >= 1e4)) return number.toExponential(3);
    return number.toPrecision(precision);
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function ensureFitLogState() {
    if (!Array.isArray(state.fitIterationLog)) state.fitIterationLog = [];
    if (!Number.isFinite(Number(state.fitLogCounter))) state.fitLogCounter = 0;
  }

  function setFitLogStatus(text, kind = "") {
    const status = $("fitLogStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `hint status-line ${kind}`.trim();
  }

  function targetOverlayEnabled() {
    const input = $("showTargetOverlay");
    return !input || input.checked;
  }

  function targetSigmaForFit(fit, target) {
    const targetSigma = finiteNumber(target?.sigma);
    if (targetSigma > 0) return targetSigma;
    const inputSigma = finiteNumber($("fitTargetSigma")?.value);
    if (inputSigma > 0) return inputSigma;
    const fitSigma = Math.abs(finiteNumber(fit?.sigma));
    return fitSigma > 0 ? fitSigma : NaN;
  }

  const baseReadGaussianTargetOrNull = typeof readGaussianTargetOrNull === "function" ? readGaussianTargetOrNull : null;
  if (baseReadGaussianTargetOrNull) {
    readGaussianTargetOrNull = function patchedReadGaussianTargetOrNull() {
      const target = baseReadGaussianTargetOrNull();
      if (!target) return null;
      const sigma = targetSigmaForFit(state.lastGaussianFit, target);
      return { ...target, sigma };
    };
  }

  function readTargetForFit(fit) {
    const target = typeof readGaussianTargetOrNull === "function" ? readGaussianTargetOrNull() : null;
    if (!target) return null;
    return { ...target, sigma: targetSigmaForFit(fit, target) };
  }

  function targetParamsForFit(fit, target, extra = {}) {
    if (!fit || !target) return null;
    const A = finiteNumber(target.A);
    const mu = finiteNumber(target.mu);
    const sigma = targetSigmaForFit(fit, target);
    if (![A, mu, sigma].every(Number.isFinite) || sigma <= 0) return null;
    return {
      A,
      mu,
      sigma,
      baseline: Number.isFinite(Number(fit.baseline)) ? Number(fit.baseline) : 0,
      adcIndex: fit.adcIndex,
      xDac: fit.xDac,
      yMode: fit.yMode,
      data: fit.data || [],
      ...extra,
    };
  }

  function singleTargetOverlaysForPlot(xDac, yMode, labels) {
    const fit = state.lastGaussianFit;
    if (!fit || fit.xDac !== xDac || fit.yMode !== yMode) return [];
    if (!labels.includes(`ADC${fit.adcIndex}`)) return [];
    const target = readTargetForFit(fit);
    const params = targetParamsForFit(fit, target, {
      source: "single",
      label: `Target / ADC${fit.adcIndex}`,
    });
    return params ? [params] : [];
  }

  function gmmTargetOverlaysForPlot(xDac, yMode, labels) {
    const plan = Array.isArray(state.lastGmmPlan) ? state.lastGmmPlan : [];
    return plan
      .filter(item => item?.mode === "fit" && item.fit && item.target)
      .filter(item => item.fit.xDac === xDac && item.fit.yMode === yMode)
      .filter(item => labels.includes(`ADC${item.fit.adcIndex}`))
      .map(item => targetParamsForFit(item.fit, item.target, {
        source: "gmm",
        device: item.device,
        label: `GMM target D${item.device} / ADC${item.fit.adcIndex}`,
      }))
      .filter(Boolean);
  }

  function targetOverlaysForPlot(xDac, yMode, labels) {
    if (!targetOverlayEnabled()) return [];
    return [
      ...singleTargetOverlaysForPlot(xDac, yMode, labels),
      ...gmmTargetOverlaysForPlot(xDac, yMode, labels),
    ];
  }

  const baseFitOverlayForPlot = typeof fitOverlayForPlot === "function" ? fitOverlayForPlot : null;
  if (baseFitOverlayForPlot) {
    fitOverlayForPlot = function patchedFitOverlayForPlot(xDac, yMode, labels) {
      const fitOverlay = baseFitOverlayForPlot(xDac, yMode, labels);
      const targets = targetOverlaysForPlot(xDac, yMode, labels);
      let overlay = fitOverlay;
      if (targets.length) {
        overlay = fitOverlay
          ? { ...fitOverlay, targetOverlays: targets }
          : { ...targets[0], hideFit: true, targetOverlays: targets };
      }
      state.fitControlLastOverlayByDac = state.fitControlLastOverlayByDac || {};
      state.fitControlLastOverlayByDac[xDac] = overlay;
      return overlay;
    };
  }

  const baseGaussianOverlaySamples = typeof gaussianOverlaySamples === "function" ? gaussianOverlaySamples : null;
  if (baseGaussianOverlaySamples) {
    gaussianOverlaySamples = function patchedGaussianOverlaySamples(fit, minX, maxX, count = 180) {
      if (!fit) return [];
      const samples = [];
      if (!fit.hideFit) {
        samples.push(...baseGaussianOverlaySamples(fit, minX, maxX, count).map(item => ({ ...item, overlayKind: "fit" })));
      }
      (fit.targetOverlays || []).forEach((target, overlayIndex) => {
        samples.push(...baseGaussianOverlaySamples(target, minX, maxX, count).map(item => ({
          ...item,
          overlayKind: "target",
          overlayIndex,
        })));
      });
      return samples;
    };
  }

  const baseDrawGaussianOverlay = typeof drawGaussianOverlay === "function" ? drawGaussianOverlay : null;
  if (baseDrawGaussianOverlay) {
    drawGaussianOverlay = function patchedDrawGaussianOverlay(ctx, fit, overlay, sx, sy) {
      if (!fit || !overlay?.length) return;
      const fitSamples = overlay.filter(item => !item.overlayKind || item.overlayKind === "fit");
      if (!fit.hideFit && fitSamples.length) baseDrawGaussianOverlay(ctx, fit, fitSamples, sx, sy);

      (fit.targetOverlays || []).forEach((target, overlayIndex) => {
        const series = overlay.filter(item => item.overlayKind === "target" && item.overlayIndex === overlayIndex);
        if (!series.length) return;
        const color = PLOT_COLORS[target.adcIndex % PLOT_COLORS.length];
        ctx.save();
        ctx.lineCap = "round";
        if (typeof ctx.setLineDash === "function") ctx.setLineDash([1, 6]);
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        series.forEach((item, idx) => {
          const x = sx(item.x);
          const y = sy(item.y);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        series.forEach((item, idx) => {
          const x = sx(item.x);
          const y = sy(item.y);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
        ctx.restore();
      });
    };
  }

  function appendTargetOverlayLegend() {
    const configs = { D1: { legendId: "plotD1Legend" }, D2: { legendId: "plotD2Legend" } };
    for (const [xDac, config] of Object.entries(configs)) {
      const legend = $(config.legendId);
      const overlay = state.fitControlLastOverlayByDac?.[xDac];
      if (!legend || !overlay) continue;
      if (!legend.children.length) continue;
      if (overlay.hideFit) {
        Array.from(legend.querySelectorAll("span")).forEach(item => {
          if (item.textContent.trim().startsWith("Fit /")) item.remove();
        });
      }
      const targets = overlay.targetOverlays || [];
      for (const target of targets) {
        const color = PLOT_COLORS[target.adcIndex % PLOT_COLORS.length];
        const label = htmlEscape(target.label || `Target / ADC${target.adcIndex}`);
        const item = document.createElement("span");
        item.innerHTML = `<i style="background:repeating-linear-gradient(to right, ${color} 0 2px, transparent 2px 6px)"></i>${label}`;
        legend.appendChild(item);
      }
    }
  }

  const baseRenderSweepPlot = typeof renderSweepPlot === "function" ? renderSweepPlot : null;
  if (baseRenderSweepPlot) {
    renderSweepPlot = function patchedRenderSweepPlot() {
      baseRenderSweepPlot();
      appendTargetOverlayLegend();
    };
  }

  function targetCurveLoss(fit, targetParams) {
    if (!fit || !targetParams) return NaN;
    const data = Array.isArray(fit.data) && fit.data.length ? fit.data : [];
    if (!data.length) return NaN;
    let sum = 0;
    let count = 0;
    for (const item of data) {
      const measuredFit = gaussianValue(fit, item.x);
      const targetFit = gaussianValue(targetParams, item.x);
      if (Number.isFinite(measuredFit) && Number.isFinite(targetFit)) {
        sum += (measuredFit - targetFit) ** 2;
        count += 1;
      }
    }
    return count ? sum / count : NaN;
  }

  function fitControlMetrics(fit, target) {
    const targetParams = targetParamsForFit(fit, target);
    const fitLoss = Number.isFinite(Number(fit?.loss))
      ? Number(fit.loss)
      : Array.isArray(fit?.data) && fit.data.length
        ? gaussianLoss(fit.data, fit)
        : Number.isFinite(Number(fit?.rmse)) ? Number(fit.rmse) ** 2 : NaN;
    const targetLoss = targetCurveLoss(fit, targetParams);
    const error = fit && target ? gaussianTargetError(fit, target) : null;
    const targetRmse = Number.isFinite(targetLoss) ? Math.sqrt(targetLoss) : NaN;
    const scale = Math.max(Math.abs(Number(fit?.A) || 0), Math.abs(Number(target?.A) || 0), 1e-12);
    return {
      fitLoss,
      targetLoss,
      error,
      fitSimilarity: clamp01(Number(fit?.r2)),
      targetSimilarity: Number.isFinite(targetRmse) ? clamp01(1 - targetRmse / scale) : NaN,
    };
  }

  function fitLogMode(defaultMode = "single") {
    if (!state.autoFitRunning) return defaultMode;
    return defaultMode === "gmm" ? "auto GMM" : "auto single";
  }

  function currentAutoIter() {
    return state.autoFitRunning && Array.isArray(state.autoFitHistory) ? state.autoFitHistory.length + 1 : "";
  }

  function appendFitLog(entry) {
    if (!entry?.fit) return;
    ensureFitLogState();
    const target = entry.target || readTargetForFit(entry.fit);
    const metrics = fitControlMetrics(entry.fit, target);
    const error = metrics.error || {};
    const row = {
      id: ++state.fitLogCounter,
      time: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      mode: entry.mode || "single",
      iter: entry.iter ?? "",
      device: entry.device ?? "",
      trace: `${entry.fit.xDac || "-"} / ADC${entry.fit.adcIndex}`,
      fitA: entry.fit.A,
      fitMu: entry.fit.mu,
      fitSigma: Math.abs(entry.fit.sigma),
      targetA: target?.A,
      targetMu: target?.mu,
      targetSigma: target?.sigma,
      fitLoss: metrics.fitLoss,
      targetLoss: metrics.targetLoss,
      errorA: error.aError,
      errorMu: error.muError,
      r2: entry.fit.r2,
      targetSimilarity: metrics.targetSimilarity,
      norm: error.norm,
      action: entry.action || "",
    };
    state.fitIterationLog.push(row);
    if (state.fitIterationLog.length > 1000) state.fitIterationLog.splice(0, state.fitIterationLog.length - 1000);
    renderFitIterationLog();
  }

  function renderFitIterationLog() {
    ensureFitLogState();
    const body = $("fitLogBody");
    if (!body) return;
    body.innerHTML = "";
    const rows = state.fitIterationLog.slice(-250).reverse();
    for (const row of rows) {
      const tr = document.createElement("tr");
      [
        row.id,
        row.time,
        row.mode,
        row.iter,
        row.device,
        row.trace,
        formatLogNumber(row.fitA),
        formatLogNumber(row.fitMu),
        formatLogNumber(row.fitSigma),
        formatLogNumber(row.targetA),
        formatLogNumber(row.targetMu),
        formatLogNumber(row.targetSigma),
        formatLogNumber(row.fitLoss, 4),
        formatLogNumber(row.targetLoss, 4),
        formatLogNumber(row.errorA, 4),
        formatLogNumber(row.errorMu, 4),
        formatLogNumber(row.r2, 4),
        Number.isFinite(row.targetSimilarity) ? `${(row.targetSimilarity * 100).toFixed(1)}%` : "",
        formatLogNumber(row.norm, 4),
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
    const suffix = state.fitIterationLog.length > rows.length ? `, showing latest ${rows.length}` : "";
    setFitLogStatus(`${state.fitIterationLog.length} fit log row(s)${suffix}.`, state.fitIterationLog.length ? "ok" : "");
  }

  function clearFitIterationLog() {
    state.fitIterationLog = [];
    state.fitLogCounter = 0;
    renderFitIterationLog();
    setFitLogStatus("Fit log cleared.");
  }

  function downloadFitLogCsv() {
    ensureFitLogState();
    if (!state.fitIterationLog.length) {
      setFitLogStatus("No fit log to download.", "warn");
      return;
    }
    const fields = [
      "id", "time", "mode", "iter", "device", "trace",
      "fit_A", "fit_mu", "fit_sigma",
      "target_A", "target_mu", "target_sigma",
      "fit_loss", "target_loss", "error_A", "error_mu",
      "r2", "target_similarity", "norm", "action",
    ];
    const csv = [
      fields.join(","),
      ...state.fitIterationLog.map(row => fields.map(field => {
        const map = {
          fit_A: row.fitA,
          fit_mu: row.fitMu,
          fit_sigma: row.fitSigma,
          target_A: row.targetA,
          target_mu: row.targetMu,
          target_sigma: row.targetSigma,
          fit_loss: row.fitLoss,
          target_loss: row.targetLoss,
          error_A: row.errorA,
          error_mu: row.errorMu,
          target_similarity: row.targetSimilarity,
        };
        return csvEscape(map[field] ?? row[field]);
      }).join(",")),
    ].join("\n");
    download(`pcb_gaussian_fit_log_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
    setFitLogStatus(`Downloaded ${state.fitIterationLog.length} fit log row(s).`, "ok");
  }

  function logGmmPlan(plan) {
    if (!Array.isArray(plan) || !plan.length || plan.__fitLogRecorded) return;
    Object.defineProperty(plan, "__fitLogRecorded", { value: true, enumerable: false });
    const mode = fitLogMode("gmm");
    const iter = currentAutoIter();
    plan.forEach(item => {
      if (item.mode !== "fit" || !item.fit) return;
      appendFitLog({
        mode,
        iter,
        device: item.device,
        fit: item.fit,
        target: item.target,
        action: "GMM plan",
      });
    });
  }

  const baseFitSelectedGaussian = typeof fitSelectedGaussian === "function" ? fitSelectedGaussian : null;
  if (baseFitSelectedGaussian) {
    fitSelectedGaussian = function patchedFitSelectedGaussian(options = {}) {
      const fit = baseFitSelectedGaussian(options);
      if (!fit) return fit;
      if (!(options && options.updateTarget === false)) {
        const sigmaInput = $("fitTargetSigma");
        if (sigmaInput) sigmaInput.value = Math.abs(fit.sigma).toFixed(5);
        renderGaussianFit(fit);
        renderSweepPlot();
      }
      appendFitLog({
        mode: fitLogMode("single"),
        iter: currentAutoIter(),
        device: deviceMuxInfo($("fitDevice")?.value).device,
        fit,
        target: readTargetForFit(fit),
        action: options && options.updateTarget === false ? "fit after sweep" : "manual fit",
      });
      return fit;
    };
  }

  const baseRenderGmmPlan = typeof renderGmmPlan === "function" ? renderGmmPlan : null;
  if (baseRenderGmmPlan) {
    renderGmmPlan = function patchedRenderGmmPlan(plan) {
      baseRenderGmmPlan(plan);
      logGmmPlan(plan);
      renderSweepPlot();
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureFitLogState();
    renderFitIterationLog();
    $("clearFitLogButton")?.addEventListener("click", clearFitIterationLog);
    $("downloadFitLogButton")?.addEventListener("click", downloadFitLogCsv);
    ["showTargetOverlay", "fitTargetMu", "fitTargetA", "fitTargetSigma", "gmmTarget", "gmmDevices", "gmmMode"].forEach(id => {
      const element = $(id);
      if (!element) return;
      element.addEventListener("change", renderSweepPlot);
      element.addEventListener("input", renderSweepPlot);
    });
  });

  adjustmentPlanForFit = function patchedAdjustmentPlanForFit(device, target, fit, muGain, vstartGain, muVstartGain = 1) {
    const currentMuCode = logicalMuCodeForDevice(device);
    const currentVstartCode = logicalVstartCodeForDevice(device);
    const currentMuV = potCodeToMuVoltage(currentMuCode);
    const currentVstartV = potCodeToVstartVoltage(currentVstartCode);
    const muError = target.mu - fit.mu;
    const ampError = target.A - fit.A;
    const muDirection = directionValue("fitMuDirection", 1);
    const aDirection = directionValue("fitADirection", 1);
    const muControlDelta = muError * muGain * muDirection;
    const vstartCoupledDelta = muControlDelta * muVstartGain;
    const amplitudeControl = normalizedAmplitudeDelta(ampError, vstartGain, aDirection);
    const vstartAmplitudeDelta = amplitudeControl.delta;
    let vstartTotalDelta = vstartCoupledDelta + vstartAmplitudeDelta;
    let aDirectionGuardApplied = false;
    let aOvershootGuardApplied = false;
    let vstartBoundaryGuardApplied = false;

    if (aDirectionGuardEnabled() && Math.abs(vstartAmplitudeDelta) > 0 && Math.sign(vstartTotalDelta) !== Math.sign(vstartAmplitudeDelta)) {
      vstartTotalDelta = vstartAmplitudeDelta;
      aDirectionGuardApplied = true;
    }

    const tolerances = typeof autoFitTolerances === "function" ? autoFitTolerances() : { aTol: 0 };
    const aTol = Math.max(0, Number(tolerances.aTol) || 0);
    if (aTol > 0 && ampError < -aTol && vstartTotalDelta < 0) {
      vstartTotalDelta = Math.max(0, vstartAmplitudeDelta);
      aOvershootGuardApplied = true;
    }

    const requestedNextMuV = currentMuV + muControlDelta;
    const requestedNextVstartV = currentVstartV + vstartTotalDelta;
    const nextMuV = clampParamVoltage("mu", requestedNextMuV);
    const vstartBounds = paramVoltageBounds("A");
    let nextVstartV = clampParamVoltage("A", requestedNextVstartV);
    if ((requestedNextVstartV < vstartBounds.min && vstartTotalDelta < 0) ||
        (requestedNextVstartV > vstartBounds.max && vstartTotalDelta > 0)) {
      nextVstartV = currentVstartV;
      vstartTotalDelta = 0;
      vstartBoundaryGuardApplied = true;
    }
    const nextMuCode = muVoltageToCode(nextMuV);
    const nextVstartCode = vstartVoltageToCode(nextVstartV);
    return {
      mode: "fit",
      device,
      target,
      fit,
      currentMuCode,
      currentVstartCode,
      currentMuV,
      currentVstartV,
      nextMuV,
      nextVstartV,
      requestedNextMuV,
      requestedNextVstartV,
      nextMuCode,
      nextVstartCode,
      muControlDelta,
      vstartCoupledDelta,
      vstartAmplitudeDelta,
      ampErrorNorm: amplitudeControl.norm,
      vstartTotalDelta,
      muDirection,
      aDirection,
      aDirectionGuardApplied,
      aOvershootGuardApplied,
      vstartBoundaryGuardApplied,
      currentACode: currentVstartCode,
      currentAV: currentVstartV,
      nextAV: nextVstartV,
      nextACode: nextVstartCode,
    };
  };

  renderGaussianAdjustPlan = function patchedRenderGaussianAdjustPlan(plan) {
    if (!plan) return;
    const errorText = plan.fit ? ` ${formatTargetError(gaussianTargetError(plan.fit, plan.target))}.` : "";
    const vstartDelta = Number.isFinite(plan.nextVstartV) && Number.isFinite(plan.currentVstartV) ? plan.nextVstartV - plan.currentVstartV : NaN;
    const guardParts = [];
    if (plan.aDirectionGuardApplied) guardParts.push("A dir lock");
    if (plan.aOvershootGuardApplied) guardParts.push("A overshoot guard");
    if (plan.vstartBoundaryGuardApplied) guardParts.push("Vstart limit guard");
    const guardText = guardParts.length ? `, ${guardParts.join(" + ")} applied` : "";
    const couplingText = plan.mode === "fit" && Number.isFinite(vstartDelta)
      ? `; Vstart delta ${vstartDelta.toFixed(4)} V = total ${plan.vstartTotalDelta.toFixed(4)} (mu link ${plan.vstartCoupledDelta.toFixed(4)} + A correction ${plan.vstartAmplitudeDelta.toFixed(4)}, A norm ${Number(plan.ampErrorNorm).toFixed(2)}${guardText})`
      : "";
    setFitStatus(`Device ${plan.device}: mu ${plan.currentMuCode}->${plan.nextMuCode} (${plan.nextMuV.toFixed(4)} V), Vstart ${plan.currentVstartCode}->${plan.nextVstartCode} (${plan.nextVstartV.toFixed(4)} V)${couplingText}.${errorText}`, "ok");
  };
})();
