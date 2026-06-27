(function () {
  const PARAM_META = {
    gain: { label: "Photocurrent gain", unit: "nA", min: 10, max: 220, step: 1 },
    dark: { label: "Dark current", unit: "nA", min: 0, max: 15, step: 0.1 },
    tauRise: { label: "Rise tau", unit: "s", min: 0.005, max: 0.3, step: 0.001 },
    tauDecay: { label: "Decay tau", unit: "s", min: 0.03, max: 8, step: 0.01 },
    retention: { label: "Retention", unit: "ratio", min: 0, max: 0.8, step: 0.005 },
    noise: { label: "Ripple / noise", unit: "nA", min: 0, max: 5, step: 0.05 },
  };

  function defaultModel() {
    return {
      STM: {
        gain: 84,
        dark: 1.1,
        tauRise: 0.032,
        tauDecay: 0.34,
        retention: 0.035,
        noise: 0.9,
      },
      LTM: {
        gain: 118,
        dark: 2.2,
        tauRise: 0.075,
        tauDecay: 2.8,
        retention: 0.26,
        noise: 0.9,
      },
      route: {
        vdsGain: 1,
        vdsPersistence: 1,
        gateGain: 1.12,
        gatePersistence: 1.18,
      },
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizeModel(model) {
    const merged = defaultModel();
    ["STM", "LTM"].forEach((mode) => {
      Object.keys(PARAM_META).forEach((name) => {
        const meta = PARAM_META[name];
        const value = Number(model?.[mode]?.[name]);
        if (Number.isFinite(value)) merged[mode][name] = clamp(value, meta.min, meta.max);
      });
    });
    Object.keys(merged.route).forEach((name) => {
      const value = Number(model?.route?.[name]);
      if (Number.isFinite(value)) merged.route[name] = clamp(value, 0.2, 3);
    });
    return merged;
  }

  function params(model, mode, method, variation = 1, layerIndex = 0) {
    const clean = sanitizeModel(model);
    const base = clean[mode === "LTM" ? "LTM" : "STM"];
    const routeGain = method === "gate" ? clean.route.gateGain : clean.route.vdsGain;
    const routePersistence = method === "gate" ? clean.route.gatePersistence : clean.route.vdsPersistence;
    return {
      gain: base.gain * routeGain * variation,
      dark: base.dark * variation,
      tauRise: base.tauRise,
      tauDecay: base.tauDecay * routePersistence,
      retention: base.retention * routePersistence,
      noise: base.noise + layerIndex * 0.12,
      base: clone(base),
    };
  }

  function response(timeline, drive, modelParams, options = {}) {
    const trace = new Array(timeline.length);
    let current = modelParams.dark;
    const roleGain = Number(options.roleGain || 1);
    const presetGain = Number(options.presetGain || 1);
    const noisePhase = Number(options.noisePhase || 0);
    const includeNoise = options.includeNoise !== false;

    for (let index = 0; index < timeline.length; index += 1) {
      const dt = index === 0 ? 0 : timeline[index].t - timeline[index - 1].t;
      const opticalDrive = clamp(drive[index] || 0, 0, 1.8);
      const target = modelParams.dark + opticalDrive * modelParams.gain * roleGain * presetGain;
      const tau = target > current ? modelParams.tauRise : modelParams.tauDecay;
      const alpha = 1 - Math.exp(-dt / Math.max(0.001, tau));
      current += (target - current) * alpha;

      if (opticalDrive < 0.02) {
        const retained = modelParams.dark + modelParams.gain * modelParams.retention;
        current = retained + (current - retained) * Math.exp(-dt / Math.max(0.001, modelParams.tauDecay));
      }

      const ripple = includeNoise ? Math.sin(index * 0.037 + noisePhase) * modelParams.noise : 0;
      trace[index] = Math.max(0, current + ripple);
    }
    return trace;
  }

  function parseMeasurement(text) {
    const rows = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    const points = [];
    rows.forEach((row) => {
      const cols = row.split(/[,\t ]+/).map((value) => Number(value));
      if (cols.length < 2 || !Number.isFinite(cols[0]) || !Number.isFinite(cols[1])) return;
      points.push({ t: cols[0], current: cols[1] });
    });
    return points.sort((a, b) => a.t - b.t);
  }

  function interpolate(points, timeline) {
    if (!points.length) return [];
    let cursor = 0;
    return timeline.map((point) => {
      while (cursor < points.length - 2 && points[cursor + 1].t < point.t) cursor += 1;
      const a = points[cursor];
      const b = points[Math.min(cursor + 1, points.length - 1)];
      if (!b || b.t === a.t) return a.current;
      const ratio = clamp((point.t - a.t) / (b.t - a.t), 0, 1);
      return a.current + (b.current - a.current) * ratio;
    });
  }

  function rmse(modelTrace, measuredTrace) {
    if (!modelTrace.length || modelTrace.length !== measuredTrace.length) return Infinity;
    const mse = modelTrace.reduce((sum, value, index) => sum + (value - measuredTrace[index]) ** 2, 0) / modelTrace.length;
    return Math.sqrt(mse);
  }

  function fitMode(model, mode, method, timeline, drive, measurement) {
    const measured = interpolate(measurement, timeline);
    if (!measured.length) return { model: sanitizeModel(model), rmse: null, changed: false };

    const clean = sanitizeModel(model);
    const modeKey = mode === "LTM" ? "LTM" : "STM";
    const candidates = ["gain", "dark", "tauRise", "tauDecay", "retention"];
    let bestModel = sanitizeModel(clean);
    let bestTrace = response(timeline, drive, params(bestModel, modeKey, method, 1, 0), { includeNoise: false });
    let bestRmse = rmse(bestTrace, measured);

    candidates.forEach((name) => {
      const meta = PARAM_META[name];
      const center = bestModel[modeKey][name];
      const span = Math.max(meta.step, center * 0.45 || (meta.max - meta.min) * 0.2);
      const testValues = [-1, -0.5, -0.2, 0, 0.2, 0.5, 1].map((factor) => clamp(center + span * factor, meta.min, meta.max));
      testValues.forEach((value) => {
        const trial = sanitizeModel(bestModel);
        trial[modeKey][name] = value;
        const trialTrace = response(timeline, drive, params(trial, modeKey, method, 1, 0), { includeNoise: false });
        const trialRmse = rmse(trialTrace, measured);
        if (trialRmse < bestRmse) {
          bestRmse = trialRmse;
          bestModel = trial;
        }
      });
    });

    return { model: bestModel, rmse: bestRmse, changed: true };
  }

  window.DEVICE_MODEL = {
    PARAM_META,
    defaultModel,
    sanitizeModel,
    params,
    response,
    parseMeasurement,
    interpolate,
    rmse,
    fitMode,
  };
})();
