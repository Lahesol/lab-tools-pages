(function () {
  const A_ERROR_VSTART_STEP_V = 0.05;
  const FIT_JACOBIAN_HISTORY_LIMIT = 30;
  const FIT_JACOBIAN_MIN_CONTROL_DELTA_V = 1e-5;
  const FIT_JACOBIAN_MAX_STEP_V = 1.2;
  const FIT_CURVE_TRAIL_LIMIT = 40;
  const FIT_CURVE_LOG_LIMIT = 200;
  const FIT_CURVE_SAMPLE_COUNT = 220;

  function directionValue(id, fallback = 1) {
    const value = Number($(id)?.value);
    return value < 0 ? -1 : fallback;
  }

  function aDirectionGuardEnabled() {
    const input = $("fitAerrorGuard");
    return !input || input.checked;
  }

  function paramVoltageBounds(param, device = null) {
    const points = typeof getParamCalPoints === "function" ? getParamCalPoints(param, device) : [];
    const voltages = points.map(point => Number(point.voltage)).filter(Number.isFinite);
    if (!voltages.length) return { min: -Infinity, max: Infinity };
    return { min: Math.min(...voltages), max: Math.max(...voltages) };
  }

  function clampParamVoltage(param, voltage, device = null) {
    const bounds = paramVoltageBounds(param, device);
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

  function fitControlMode() {
    return $("fitControlMode")?.value || "adaptive";
  }

  function fitJacobianDamping() {
    const input = $("fitJacobianDamping");
    const value = clamp(Number(input?.value) || 0.05, 0.001, 10);
    if (input) input.value = value;
    return value;
  }

  function fitControlScales(target, fit, tolerances = autoFitTolerances()) {
    const muTol = Number(tolerances?.muTol);
    const aTol = Number(tolerances?.aTol);
    const muScale = muTol > 0
      ? muTol
      : Math.max(1e-6, Math.abs(Number(target?.mu) || 0), Math.abs(Number(fit?.mu) || 0), 1);
    const aScale = aTol > 0
      ? aTol
      : Math.max(1e-9, Math.abs(Number(target?.A) || 0), Math.abs(Number(fit?.A) || 0), 1);
    return { muScale, aScale };
  }

  function fitControlLoss(fit, target, tolerances = autoFitTolerances()) {
    if (!fit || !target) return NaN;
    const { muScale, aScale } = fitControlScales(target, fit, tolerances);
    const eMu = (Number(fit.mu) - Number(target.mu)) / muScale;
    const eA = (Number(fit.A) - Number(target.A)) / aScale;
    if (![eMu, eA].every(Number.isFinite)) return NaN;
    return 0.5 * (eMu * eMu + eA * eA);
  }

  function ensureFitJacobianState() {
    if (!state.fitJacobianByKey || typeof state.fitJacobianByKey !== "object") state.fitJacobianByKey = {};
  }

  function fitJacobianKey(device, fit) {
    return [device, fit?.xDac || "-", fit?.adcIndex ?? "-", fit?.yMode || "-"].join("|");
  }

  function fitControlSample(device, fit, muV, vstartV, target, tolerances) {
    return {
      device,
      xDac: fit?.xDac,
      adcIndex: fit?.adcIndex,
      yMode: fit?.yMode,
      muV: Number(muV),
      vstartV: Number(vstartV),
      fitMu: Number(fit?.mu),
      fitA: Number(fit?.A),
      targetMu: Number(target?.mu),
      targetA: Number(target?.A),
      loss: fitControlLoss(fit, target, tolerances),
      time: Date.now(),
    };
  }

  function transitionIsFinite(transition) {
    return [...transition.du, ...transition.dy].every(Number.isFinite);
  }

  function sameControlTarget(a, b) {
    return a && b &&
      Math.abs(Number(a.targetMu) - Number(b.targetMu)) < 1e-9 &&
      Math.abs(Number(a.targetA) - Number(b.targetA)) < 1e-12;
  }

  function lossTrendForTransition(transition) {
    if (!transition || !sameControlTarget(transition.from, transition.to)) return null;
    const fromLoss = Number(transition.from.loss);
    const toLoss = Number(transition.to.loss);
    if (![fromLoss, toLoss].every(Number.isFinite) || fromLoss <= 0) return null;
    const ratio = toLoss / fromLoss;
    return {
      fromLoss,
      toLoss,
      ratio,
      worsened: ratio > 1.05,
      improved: ratio < 0.95,
    };
  }

  function updateFitJacobianModel(device, fit, muV, vstartV, target, tolerances) {
    ensureFitJacobianState();
    const key = fitJacobianKey(device, fit);
    const model = state.fitJacobianByKey[key] || { key, transitions: [], lastSample: null };
    const sample = fitControlSample(device, fit, muV, vstartV, target, tolerances);
    const previous = model.lastSample;
    model.lastLossTrend = null;
    if (previous) {
      const transition = {
        du: [sample.muV - previous.muV, sample.vstartV - previous.vstartV],
        dy: [sample.fitMu - previous.fitMu, sample.fitA - previous.fitA],
        from: previous,
        to: sample,
      };
      const controlNorm = Math.hypot(...transition.du);
      if (controlNorm > FIT_JACOBIAN_MIN_CONTROL_DELTA_V && transitionIsFinite(transition)) {
        const last = model.transitions[model.transitions.length - 1];
        const duplicate = last &&
          Math.abs(last.from.time - transition.from.time) < 2 &&
          Math.abs(last.to.time - transition.to.time) < 2;
        if (!duplicate) model.transitions.push(transition);
        if (model.transitions.length > FIT_JACOBIAN_HISTORY_LIMIT) {
          model.transitions.splice(0, model.transitions.length - FIT_JACOBIAN_HISTORY_LIMIT);
        }
        model.lastLossTrend = lossTrendForTransition(transition);
      }
    }
    model.lastSample = sample;
    state.fitJacobianByKey[key] = model;
    return model;
  }

  function manualJacobianPrior() {
    const muDirection = directionValue("fitMuDirection", 1);
    const aDirection = directionValue("fitADirection", 1);
    const tolerances = typeof autoFitTolerances === "function" ? autoFitTolerances() : { aTol: 0.002 };
    const aTol = Math.max(1e-6, Number(tolerances.aTol) || 0.002);
    return [
      [muDirection, 0],
      [0, aDirection * (aTol / A_ERROR_VSTART_STEP_V)],
    ];
  }

  function estimateFitJacobian(model, prior, damping) {
    const lambda = Math.max(1e-6, Number(damping) || 0.05);
    let xx00 = lambda;
    let xx01 = 0;
    let xx11 = lambda;
    const xyMu = [lambda * prior[0][0], lambda * prior[0][1]];
    const xyA = [lambda * prior[1][0], lambda * prior[1][1]];
    for (const transition of model.transitions || []) {
      const [u0, u1] = transition.du;
      const [yMu, yA] = transition.dy;
      xx00 += u0 * u0;
      xx01 += u0 * u1;
      xx11 += u1 * u1;
      xyMu[0] += u0 * yMu;
      xyMu[1] += u1 * yMu;
      xyA[0] += u0 * yA;
      xyA[1] += u1 * yA;
    }
    const det = xx00 * xx11 - xx01 * xx01;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
    const solve = vector => [
      (xx11 * vector[0] - xx01 * vector[1]) / det,
      (-xx01 * vector[0] + xx00 * vector[1]) / det,
    ];
    return [solve(xyMu), solve(xyA)];
  }

  function solveDampedJacobian(jacobian, error, damping) {
    const [[j00, j01], [j10, j11]] = jacobian;
    const lambda2 = Math.max(1e-8, (Number(damping) || 0.05) ** 2);
    const a00 = j00 * j00 + j10 * j10 + lambda2;
    const a01 = j00 * j01 + j10 * j11;
    const a11 = j01 * j01 + j11 * j11 + lambda2;
    const b0 = j00 * error[0] + j10 * error[1];
    const b1 = j01 * error[0] + j11 * error[1];
    const det = a00 * a11 - a01 * a01;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
    return [
      (a11 * b0 - a01 * b1) / det,
      (-a01 * b0 + a00 * b1) / det,
    ];
  }

  function solveLossDampedJacobian(jacobian, error, scales, damping) {
    const normalizedJ = [
      [jacobian[0][0] / scales.muScale, jacobian[0][1] / scales.muScale],
      [jacobian[1][0] / scales.aScale, jacobian[1][1] / scales.aScale],
    ];
    const normalizedError = [
      error[0] / scales.muScale,
      error[1] / scales.aScale,
    ];
    const delta = solveDampedJacobian(normalizedJ, normalizedError, damping);
    if (!delta) return null;
    const residualMu = normalizedError[0] - (normalizedJ[0][0] * delta[0] + normalizedJ[0][1] * delta[1]);
    const residualA = normalizedError[1] - (normalizedJ[1][0] * delta[0] + normalizedJ[1][1] * delta[1]);
    const currentLoss = 0.5 * (normalizedError[0] ** 2 + normalizedError[1] ** 2);
    const predictedLoss = 0.5 * (residualMu ** 2 + residualA ** 2);
    return {
      delta,
      currentLoss,
      predictedLoss,
      predictedReduction: currentLoss - predictedLoss,
      normalizedJ,
      normalizedError,
    };
  }

  function lossStepScale(lossTrend) {
    if (!lossTrend?.worsened) return 1;
    return clamp(1 / Math.max(2, lossTrend.ratio), 0.2, 0.7);
  }

  function clampFitStep(delta) {
    return clamp(Number(delta) || 0, -FIT_JACOBIAN_MAX_STEP_V, FIT_JACOBIAN_MAX_STEP_V);
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
    if (!Array.isArray(state.fitCurveLog)) state.fitCurveLog = [];
    if (!Array.isArray(state.fitCurveTrail)) state.fitCurveTrail = [];
    if (!Number.isFinite(Number(state.fitLogCounter))) state.fitLogCounter = 0;
  }

  function setFitLogStatus(text, kind = "") {
    const status = $("fitLogStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `hint status-line ${kind}`.trim();
  }

  function fitTrailEnabled() {
    const input = $("showFitTrail");
    return !input || input.checked;
  }

  function fitTrailOpacity() {
    const input = $("fitTrailOpacity");
    const value = clamp(Number(input?.value) || 0.32, 0.05, 0.9);
    if (input) input.value = value;
    return value;
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

  function sampledCurveParams(params, data, count = FIT_CURVE_SAMPLE_COUNT) {
    const source = Array.isArray(data) && data.length ? data : params?.data || [];
    const xs = source.map(item => Number(item.x)).filter(Number.isFinite);
    if (!xs.length) return [];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const safeCount = Math.max(2, count);
    const samples = [];
    for (let i = 0; i < safeCount; i++) {
      const x = minX + (maxX - minX) * i / (safeCount - 1);
      const y = gaussianValue(params, x);
      if (Number.isFinite(x) && Number.isFinite(y)) samples.push({ point: i, x, y });
    }
    return samples;
  }

  function fitTrailOverlaysForPlot(xDac, yMode, labels) {
    if (!fitTrailEnabled()) return [];
    const trail = Array.isArray(state.fitCurveTrail) ? state.fitCurveTrail : [];
    const filtered = trail
      .filter(entry => entry.xDac === xDac && entry.yMode === yMode)
      .filter(entry => labels.includes(`ADC${entry.adcIndex}`));
    const total = filtered.length;
    return filtered.map((entry, index) => ({
      ...entry.params,
      source: "trail",
      label: `Trail ${entry.logId} / ADC${entry.adcIndex}`,
      logId: entry.logId,
      trailIndex: index,
      trailTotal: total,
    }));
  }

  function recordFitCurve(row, fit, target) {
    if (!row || !fit) return;
    state.fitCurveLog = Array.isArray(state.fitCurveLog) ? state.fitCurveLog : [];
    state.fitCurveTrail = Array.isArray(state.fitCurveTrail) ? state.fitCurveTrail : [];
    const targetParams = targetParamsForFit(fit, target);
    const measured = Array.isArray(fit.data)
      ? fit.data.map((item, index) => ({ point: item.point ?? index, x: item.x, y: item.y }))
      : [];
    const params = {
      A: fit.A,
      mu: fit.mu,
      sigma: fit.sigma,
      baseline: fit.baseline,
      adcIndex: fit.adcIndex,
      xDac: fit.xDac,
      yMode: fit.yMode,
    };
    const entry = {
      curveId: `fit-${row.id}`,
      logId: row.id,
      mode: row.mode,
      iter: row.iter,
      device: row.device,
      trace: row.trace,
      xDac: fit.xDac,
      adcIndex: fit.adcIndex,
      yMode: fit.yMode,
      params,
      targetParams,
      targetA: target?.A,
      targetMu: target?.mu,
      targetSigma: target?.sigma,
      controlMuV: row.controlMuV,
      controlVstartV: row.controlVstartV,
      controlLoss: row.controlLoss,
      measured,
      fitSamples: sampledCurveParams(params, measured),
      targetSamples: targetParams ? sampledCurveParams(targetParams, measured) : [],
    };
    state.fitCurveLog.push(entry);
    if (state.fitCurveLog.length > FIT_CURVE_LOG_LIMIT) state.fitCurveLog.splice(0, state.fitCurveLog.length - FIT_CURVE_LOG_LIMIT);
    state.fitCurveTrail.push(entry);
    if (state.fitCurveTrail.length > FIT_CURVE_TRAIL_LIMIT) state.fitCurveTrail.splice(0, state.fitCurveTrail.length - FIT_CURVE_TRAIL_LIMIT);
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
      const trails = fitTrailOverlaysForPlot(xDac, yMode, labels);
      let overlay = fitOverlay;
      if (targets.length || trails.length) {
        overlay = fitOverlay
          ? { ...fitOverlay, targetOverlays: targets, trailOverlays: trails }
          : { ...(targets[0] || trails[0]), hideFit: true, targetOverlays: targets, trailOverlays: trails };
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
      (fit.trailOverlays || []).forEach((trail, overlayIndex) => {
        samples.push(...baseGaussianOverlaySamples(trail, minX, maxX, count).map(item => ({
          ...item,
          overlayKind: "trail",
          overlayIndex,
        })));
      });
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
      (fit.trailOverlays || []).forEach((trail, overlayIndex) => {
        const series = overlay.filter(item => item.overlayKind === "trail" && item.overlayIndex === overlayIndex);
        if (!series.length) return;
        const color = PLOT_COLORS[trail.adcIndex % PLOT_COLORS.length];
        const fraction = trail.trailTotal > 1 ? (trail.trailIndex + 1) / trail.trailTotal : 1;
        ctx.save();
        ctx.lineCap = "round";
        ctx.globalAlpha = fitTrailOpacity() * (0.25 + 0.75 * fraction);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.1 + 1.3 * fraction;
        if (typeof ctx.setLineDash === "function") ctx.setLineDash([2, 6]);
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
      const trails = overlay.trailOverlays || [];
      if (trails.length) {
        const byAdc = new Map();
        for (const trail of trails) byAdc.set(trail.adcIndex, (byAdc.get(trail.adcIndex) || 0) + 1);
        for (const [adcIndex, count] of byAdc.entries()) {
          const color = PLOT_COLORS[adcIndex % PLOT_COLORS.length];
          const item = document.createElement("span");
          item.innerHTML = `<i style="background:repeating-linear-gradient(to right, ${color} 0 2px, transparent 2px 6px)"></i>Fit trail / ADC${adcIndex} (${count})`;
          legend.appendChild(item);
        }
      }
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
    const controlLoss = fit && target ? fitControlLoss(fit, target) : NaN;
    const targetRmse = Number.isFinite(targetLoss) ? Math.sqrt(targetLoss) : NaN;
    const scale = Math.max(Math.abs(Number(fit?.A) || 0), Math.abs(Number(target?.A) || 0), 1e-12);
    return {
      fitLoss,
      targetLoss,
      controlLoss,
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
    const logDevice = Number.isFinite(Number(entry.device)) ? deviceMuxInfo(entry.device).device : "";
    const controlMuV = logDevice ? potCodeToMuVoltage(logicalMuCodeForDevice(logDevice), logDevice) : NaN;
    const controlVstartV = logDevice ? potCodeToVstartVoltage(logicalVstartCodeForDevice(logDevice), logDevice) : NaN;
    const row = {
      id: ++state.fitLogCounter,
      time: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      mode: entry.mode || "single",
      iter: entry.iter ?? "",
      device: logDevice || entry.device || "",
      trace: `${entry.fit.xDac || "-"} / ADC${entry.fit.adcIndex}`,
      controlMuV,
      controlVstartV,
      fitA: entry.fit.A,
      fitMu: entry.fit.mu,
      fitSigma: Math.abs(entry.fit.sigma),
      targetA: target?.A,
      targetMu: target?.mu,
      targetSigma: target?.sigma,
      fitLoss: metrics.fitLoss,
      targetLoss: metrics.targetLoss,
      controlLoss: metrics.controlLoss,
      errorA: error.aError,
      errorMu: error.muError,
      r2: entry.fit.r2,
      targetSimilarity: metrics.targetSimilarity,
      norm: error.norm,
      action: entry.action || "",
    };
    state.fitIterationLog.push(row);
    recordFitCurve(row, entry.fit, target);
    if (state.fitIterationLog.length > 1000) state.fitIterationLog.splice(0, state.fitIterationLog.length - 1000);
    renderFitIterationLog();
    if (typeof renderSweepPlot === "function") renderSweepPlot();
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
        formatLogNumber(row.controlMuV),
        formatLogNumber(row.controlVstartV),
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
        formatLogNumber(row.controlLoss, 4),
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
    state.fitJacobianByKey = {};
    state.fitCurveLog = [];
    state.fitCurveTrail = [];
    renderFitIterationLog();
    if (typeof renderSweepPlot === "function") renderSweepPlot();
    setFitLogStatus("Fit log and adaptive Jacobian history cleared.");
  }

  function clearFitTrailOnly() {
    ensureFitLogState();
    const count = state.fitCurveTrail.length;
    state.fitCurveTrail = [];
    if (typeof renderSweepPlot === "function") renderSweepPlot();
    setFitLogStatus(`Cleared ${count} fit trail curve(s); fit log was kept.`, "ok");
  }

  function fitCurveCsvRows() {
    const entries = Array.isArray(state.fitCurveLog) ? state.fitCurveLog : [];
    const fields = [
      "curve_id", "log_id", "mode", "iter", "device", "trace",
      "x_dac", "adc", "y_mode", "curve_type", "point", "x", "y",
      "A", "mu", "sigma", "baseline",
      "target_A", "target_mu", "target_sigma",
      "control_Vmu", "control_Vstart", "control_loss",
    ];
    const rows = [fields.join(",")];
    for (const entry of entries) {
      const writeSeries = (type, series, params = entry.params) => {
        for (const sample of series || []) {
          rows.push([
            entry.curveId,
            entry.logId,
            entry.mode,
            entry.iter,
            entry.device,
            entry.trace,
            entry.xDac,
            `ADC${entry.adcIndex}`,
            entry.yMode,
            type,
            sample.point ?? "",
            sample.x,
            sample.y,
            params?.A,
            params?.mu,
            params?.sigma,
            params?.baseline,
            entry.targetA,
            entry.targetMu,
            entry.targetSigma,
            entry.controlMuV,
            entry.controlVstartV,
            entry.controlLoss,
          ].map(csvEscape).join(","));
        }
      };
      writeSeries("measured", entry.measured, entry.params);
      writeSeries("fit_model", entry.fitSamples, entry.params);
      writeSeries("target_model", entry.targetSamples, entry.targetParams);
    }
    return rows;
  }

  function downloadFitLogCsv() {
    ensureFitLogState();
    if (!state.fitIterationLog.length) {
      setFitLogStatus("No fit log to download.", "warn");
      return;
    }
    const fields = [
      "id", "time", "mode", "iter", "device", "trace",
      "control_Vmu", "control_Vstart",
      "fit_A", "fit_mu", "fit_sigma",
      "target_A", "target_mu", "target_sigma",
      "fit_loss", "target_loss", "error_A", "error_mu",
      "r2", "target_similarity", "norm", "control_loss", "action",
    ];
    const summaryRows = [
      fields.join(","),
      ...state.fitIterationLog.map(row => fields.map(field => {
        const map = {
          fit_A: row.fitA,
          fit_mu: row.fitMu,
          fit_sigma: row.fitSigma,
          control_Vmu: row.controlMuV,
          control_Vstart: row.controlVstartV,
          target_A: row.targetA,
          target_mu: row.targetMu,
          target_sigma: row.targetSigma,
          fit_loss: row.fitLoss,
          target_loss: row.targetLoss,
          control_loss: row.controlLoss,
          error_A: row.errorA,
          error_mu: row.errorMu,
          target_similarity: row.targetSimilarity,
        };
        return csvEscape(map[field] ?? row[field]);
      }).join(",")),
    ];
    const csv = [
      ...summaryRows,
      "",
      "# curve_points",
      ...fitCurveCsvRows(),
    ].join("\n");
    download(`pcb_gaussian_fit_log_${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
    const curveCount = Array.isArray(state.fitCurveLog) ? state.fitCurveLog.length : 0;
    setFitLogStatus(`Downloaded ${state.fitIterationLog.length} fit log row(s) and ${curveCount} curve set(s).`, "ok");
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
    $("clearFitTrailButton")?.addEventListener("click", clearFitTrailOnly);
    $("downloadFitLogButton")?.addEventListener("click", downloadFitLogCsv);
    ["showTargetOverlay", "showFitTrail", "fitTrailOpacity", "fitTargetMu", "fitTargetA", "fitTargetSigma", "gmmTarget", "gmmDevices", "gmmMode"].forEach(id => {
      const element = $(id);
      if (!element) return;
      element.addEventListener("change", renderSweepPlot);
      element.addEventListener("input", renderSweepPlot);
    });
  });

  adjustmentPlanForFit = function patchedAdjustmentPlanForFit(device, target, fit, muGain, vstartGain, muVstartGain = 1) {
    const currentMuCode = logicalMuCodeForDevice(device);
    const currentVstartCode = logicalVstartCodeForDevice(device);
    const currentMuV = potCodeToMuVoltage(currentMuCode, device);
    const currentVstartV = potCodeToVstartVoltage(currentVstartCode, device);
    const muError = target.mu - fit.mu;
    const ampError = target.A - fit.A;
    const muDirection = directionValue("fitMuDirection", 1);
    const aDirection = directionValue("fitADirection", 1);
    const tolerances = typeof autoFitTolerances === "function" ? autoFitTolerances() : { aTol: 0 };
    const jacobianModel = updateFitJacobianModel(device, fit, currentMuV, currentVstartV, target, tolerances);
    const aTol = Math.max(0, Number(tolerances.aTol) || 0);
    const ampErrorNorm = aTol > 0 ? ampError / aTol : ampError;
    const boundedPlan = (controlMode, muDelta, vstartDelta, extra = {}) => {
      const requestedNextMuV = currentMuV + muDelta;
      const requestedNextVstartV = currentVstartV + vstartDelta;
      const nextMuV = clampParamVoltage("mu", requestedNextMuV, device);
      const vstartBounds = paramVoltageBounds("A", device);
      let nextVstartV = clampParamVoltage("A", requestedNextVstartV, device);
      let vstartTotalDelta = vstartDelta;
      let vstartBoundaryGuardApplied = false;
      if ((requestedNextVstartV < vstartBounds.min && vstartDelta < 0) ||
          (requestedNextVstartV > vstartBounds.max && vstartDelta > 0)) {
        nextVstartV = currentVstartV;
        vstartTotalDelta = 0;
        vstartBoundaryGuardApplied = true;
      }
      const nextMuCode = muVoltageToCode(nextMuV, device);
      const nextVstartCode = vstartVoltageToCode(nextVstartV, device);
      return {
        mode: "fit",
        controlMode,
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
        muControlDelta: muDelta,
        vstartTotalDelta,
        muDirection,
        aDirection,
        vstartBoundaryGuardApplied,
        currentACode: currentVstartCode,
        currentAV: currentVstartV,
        nextAV: nextVstartV,
        nextACode: nextVstartCode,
        ...extra,
      };
    };

    if (fitControlMode() !== "manual") {
      const damping = fitJacobianDamping();
      const prior = manualJacobianPrior();
      const jacobian = estimateFitJacobian(jacobianModel, prior, damping);
      const scales = fitControlScales(target, fit, tolerances);
      const lm = jacobianModel.transitions.length && jacobian
        ? solveLossDampedJacobian(jacobian, [muError, ampError], scales, damping)
        : null;
      if (lm?.delta && lm.delta.every(Number.isFinite)) {
        const trendScale = lossStepScale(jacobianModel.lastLossTrend);
        const predictionScale = lm.predictedReduction > 0 ? 1 : 0.25;
        const stepScale = Math.min(trendScale, predictionScale);
        const muStep = lm.delta[0] * Math.max(0, Math.abs(Number(muGain) || 1)) * stepScale;
        const vstartStep = lm.delta[1] * Math.max(0, Math.abs(Number(vstartGain) || 1)) * stepScale;
        const muControlDelta = clampFitStep(muStep);
        const vstartTotalDelta = clampFitStep(vstartStep);
        return boundedPlan("lm", muControlDelta, vstartTotalDelta, {
          vstartCoupledDelta: 0,
          vstartAmplitudeDelta: vstartTotalDelta,
          ampErrorNorm,
          jacobian,
          jacobianTransitions: jacobianModel.transitions.length,
          jacobianDamping: damping,
          jacobianRawDelta: lm.delta,
          controlLoss: lm.currentLoss,
          predictedLoss: lm.predictedLoss,
          predictedReduction: lm.predictedReduction,
          lossTrend: jacobianModel.lastLossTrend,
          lossStepScale: stepScale,
          lossBackoffApplied: stepScale < 1,
          lossBackoffReason: predictionScale < 1 ? "no predicted loss reduction" : trendScale < 1 ? "previous loss increased" : "",
          jacobianStepLimited: Math.abs(muStep) > FIT_JACOBIAN_MAX_STEP_V ||
            Math.abs(vstartStep) > FIT_JACOBIAN_MAX_STEP_V,
        });
      }
    }

    const muControlDelta = muError * muGain * muDirection;
    const vstartCoupledDelta = -muControlDelta * muVstartGain;
    const amplitudeControl = normalizedAmplitudeDelta(ampError, vstartGain, aDirection);
    const vstartAmplitudeDelta = amplitudeControl.delta;
    let vstartTotalDelta = vstartCoupledDelta + vstartAmplitudeDelta;
    let aDirectionGuardApplied = false;
    let aOvershootGuardApplied = false;

    if (aDirectionGuardEnabled() && Math.abs(vstartAmplitudeDelta) > 0 && Math.sign(vstartTotalDelta) !== Math.sign(vstartAmplitudeDelta)) {
      vstartTotalDelta = vstartAmplitudeDelta;
      aDirectionGuardApplied = true;
    }

    if (aTol > 0 && ampError < -aTol && vstartTotalDelta < 0) {
      vstartTotalDelta = Math.max(0, vstartAmplitudeDelta);
      aOvershootGuardApplied = true;
    }

    return boundedPlan("manual", muControlDelta, vstartTotalDelta, {
      muControlDelta,
      vstartCoupledDelta,
      vstartAmplitudeDelta,
      ampErrorNorm: amplitudeControl.norm,
      aDirectionGuardApplied,
      aOvershootGuardApplied,
      jacobianTransitions: jacobianModel.transitions.length,
      manualFallbackReason: fitControlMode() === "manual" ? "manual selected" : "waiting for transition history",
    });
  };

  renderGaussianAdjustPlan = function patchedRenderGaussianAdjustPlan(plan) {
    if (!plan) return;
    const errorText = plan.fit ? ` ${formatTargetError(gaussianTargetError(plan.fit, plan.target))}.` : "";
    const vstartDelta = Number.isFinite(plan.nextVstartV) && Number.isFinite(plan.currentVstartV) ? plan.nextVstartV - plan.currentVstartV : NaN;
    const guardParts = [];
    if (plan.aDirectionGuardApplied) guardParts.push("A dir lock");
    if (plan.aOvershootGuardApplied) guardParts.push("A overshoot guard");
    if (plan.vstartBoundaryGuardApplied) guardParts.push("Vstart limit guard");
    if (plan.jacobianStepLimited) guardParts.push("J step limit");
    const guardText = guardParts.length ? `, ${guardParts.join(" + ")} applied` : "";
    let couplingText = "";
    if (plan.mode === "fit" && Number.isFinite(vstartDelta)) {
      const muDelta = Number.isFinite(plan.nextMuV) && Number.isFinite(plan.currentMuV) ? plan.nextMuV - plan.currentMuV : NaN;
      if (plan.controlMode === "lm") {
        const j = plan.jacobian || [[NaN, NaN], [NaN, NaN]];
        const jText = `[${j[0][0].toPrecision(3)}, ${j[0][1].toPrecision(3)}; ${j[1][0].toPrecision(3)}, ${j[1][1].toPrecision(3)}]`;
        const lossText = Number.isFinite(plan.controlLoss)
          ? `, loss ${plan.controlLoss.toPrecision(4)} -> pred ${Number(plan.predictedLoss).toPrecision(4)}`
          : "";
        const reasonText = plan.lossBackoffReason ? ` ${plan.lossBackoffReason}` : "";
        const backoffText = plan.lossBackoffApplied ? `, backoff x${Number(plan.lossStepScale).toPrecision(3)}${reasonText}` : "";
        couplingText = `; adaptive LM delta Vmu ${muDelta.toFixed(4)} V, Vstart ${vstartDelta.toFixed(4)} V (n=${plan.jacobianTransitions || 0}, damping=${Number(plan.jacobianDamping).toPrecision(3)}${lossText}${backoffText}, J=${jText}${guardText})`;
      } else {
        const fallbackText = plan.manualFallbackReason ? `, ${plan.manualFallbackReason}` : "";
        couplingText = `; manual delta Vstart ${vstartDelta.toFixed(4)} V = total ${plan.vstartTotalDelta.toFixed(4)} (opposite mu link ${plan.vstartCoupledDelta.toFixed(4)} + A correction ${plan.vstartAmplitudeDelta.toFixed(4)}, A norm ${Number(plan.ampErrorNorm).toFixed(2)}${fallbackText}${guardText})`;
      }
    }
    setFitStatus(`Device ${plan.device}: mu ${plan.currentMuCode}->${plan.nextMuCode} (${plan.nextMuV.toFixed(4)} V), Vstart ${plan.currentVstartCode}->${plan.nextVstartCode} (${plan.nextVstartV.toFixed(4)} V)${couplingText}.${errorText}`, "ok");
  };
})();
