(function () {
  function gateProbeCodeStep() {
    const input = $("gateProbeRateMs");
    const value = clamp(Math.round(Number(input?.value) || 50), 1, DAC_MAX_CODE);
    if (input) input.value = value;
    return value;
  }

  function currentGateProbeCode() {
    return vhighToDacCode(gateProbeDac(), gateProbeMv() / 1000);
  }

  function codeToGateProbeMv(dac, code) {
    return clamp(Math.round(dacCodeToVhigh(dac, code) * 1000), DAC_OUTPUT_MIN_MV, DAC_OUTPUT_MAX_MV);
  }

  function setGateProbeUiTarget(dac, code) {
    const dacSelect = $("gateProbeDac");
    const slider = $("gateProbeSlider");
    const number = $("gateProbeMvNumber");
    const safeCode = clamp(Math.round(Number(code) || 0), 0, DAC_MAX_CODE);
    const mv = codeToGateProbeMv(dac, safeCode);
    if (dacSelect) dacSelect.value = dac;
    if (slider) slider.value = mv;
    if (number) number.value = mv;
    return { code: safeCode, mv };
  }

  function ensureGateProbeQueue() {
    if (!Array.isArray(state.gateProbeStepQueue)) state.gateProbeStepQueue = [];
  }

  function resetGateProbeQueue() {
    state.gateProbeStepQueue = [];
    state.gateProbeQueuedCode = null;
    state.gateProbeQueuedDac = null;
    state.gateProbeLastSampleCode = null;
    state.gateProbeLastSampleDac = null;
  }

  function setGateProbeLocked(locked, message = "") {
    const panel = $("gateProbeSlider")?.closest(".gate-probe");
    const slider = $("gateProbeSlider");
    const number = $("gateProbeMvNumber");
    state.gateProbeSliderLocked = !!locked;
    if (panel) {
      panel.classList.toggle("gate-probe-locked", !!locked);
      panel.setAttribute("aria-busy", locked ? "true" : "false");
    }
    if (slider) slider.disabled = !!locked;
    if (number) number.disabled = !!locked;
    if (message) gateProbeStatus(message, locked ? "warn" : "ok");
  }

  function queuedTail() {
    ensureGateProbeQueue();
    const queue = state.gateProbeStepQueue;
    if (queue.length) return queue[queue.length - 1];
    if (Number.isFinite(state.gateProbeQueuedCode) && state.gateProbeQueuedDac) {
      return { dac: state.gateProbeQueuedDac, code: state.gateProbeQueuedCode };
    }
    if (Number.isFinite(state.gateProbeLastSampleCode) && state.gateProbeLastSampleDac) {
      return { dac: state.gateProbeLastSampleDac, code: state.gateProbeLastSampleCode };
    }
    return null;
  }

  function pushQueuedCode(dac, code) {
    ensureGateProbeQueue();
    const safeCode = clamp(Math.round(Number(code) || 0), 0, DAC_MAX_CODE);
    const queue = state.gateProbeStepQueue;
    const last = queue.length ? queue[queue.length - 1] : null;
    if (last && last.dac === dac && last.code === safeCode) return;
    queue.push({ dac, code: safeCode });
    state.gateProbeQueuedDac = dac;
    state.gateProbeQueuedCode = safeCode;
  }

  function enqueueGateProbePath(targetCode, dac = gateProbeDac()) {
    ensureGateProbeQueue();
    const safeTarget = clamp(Math.round(Number(targetCode) || 0), 0, DAC_MAX_CODE);
    const tail = queuedTail();
    if (!tail || tail.dac !== dac) {
      pushQueuedCode(dac, safeTarget);
      return;
    }
    const start = clamp(Math.round(Number(tail.code) || 0), 0, DAC_MAX_CODE);
    if (start === safeTarget) return;
    const step = gateProbeCodeStep();
    const dir = safeTarget > start ? 1 : -1;
    for (let code = start + dir * step; dir > 0 ? code < safeTarget : code > safeTarget; code += dir * step) {
      pushQueuedCode(dac, code);
    }
    pushQueuedCode(dac, safeTarget);
  }

  gateProbeRateMs = gateProbeCodeStep;

  const baseScheduleGateProbeSample = scheduleGateProbeSample;
  scheduleGateProbeSample = function patchedScheduleGateProbeSample(delayMs = 0) {
    if (!state.gateProbeRunning) return;
    if (state.gateProbeTimer) clearTimeout(state.gateProbeTimer);
    state.gateProbeTimer = setTimeout(() => {
      state.gateProbeTimer = null;
      sampleGateProbe(false);
    }, Math.max(0, Number(delayMs) || 0));
  };

  const baseSampleGateProbe = sampleGateProbe;
  async function processGateProbeQueue(force = false) {
    ensureGateProbeQueue();
    if (state.gateProbeQueueProcessing) return;
    state.gateProbeQueueProcessing = true;
    try {
      while (state.gateProbeStepQueue.length) {
        if (!force && !state.gateProbeRunning) break;
        const item = state.gateProbeStepQueue.shift();
        const remainingBefore = state.gateProbeStepQueue.length;
        setGateProbeUiTarget(item.dac, item.code);
        if (remainingBefore > 0 || state.gateProbeSliderLocked) {
          setGateProbeLocked(true, `Gate map locked: measuring queued step, ${remainingBefore + 1} point(s) remaining.`);
        }
        await baseSampleGateProbe(force);
        state.gateProbeLastSampleDac = item.dac;
        state.gateProbeLastSampleCode = item.code;
        state.gateProbeQueuedDac = state.gateProbeStepQueue.length ? state.gateProbeStepQueue[state.gateProbeStepQueue.length - 1].dac : item.dac;
        state.gateProbeQueuedCode = state.gateProbeStepQueue.length ? state.gateProbeStepQueue[state.gateProbeStepQueue.length - 1].code : item.code;
        force = false;
        if (state.gateProbeStepQueue.length) {
          gateProbeStatus(`Gate map locked: ${state.gateProbeStepQueue.length} queued step(s) left.`, "warn");
        }
      }
    } finally {
      state.gateProbeQueueProcessing = false;
      if (state.gateProbeStepQueue.length && state.gateProbeRunning) {
        processGateProbeQueue(false);
      } else {
        setGateProbeLocked(false);
      }
    }
  }

  sampleGateProbe = async function patchedSampleGateProbe(force = false) {
    if (force && !state.gateProbeRunning) {
      state.gateProbeLastSampleDac = gateProbeDac();
      state.gateProbeLastSampleCode = currentGateProbeCode();
      return baseSampleGateProbe(force);
    }
    if (!state.gateProbeRunning && !force) return;
    enqueueGateProbePath(currentGateProbeCode(), gateProbeDac());
    return processGateProbeQueue(force);
  };

  const baseStartGateProbe = startGateProbe;
  startGateProbe = function patchedStartGateProbe() {
    resetGateProbeQueue();
    setGateProbeLocked(false);
    return baseStartGateProbe();
  };

  const baseStopGateProbe = stopGateProbe;
  stopGateProbe = function patchedStopGateProbe() {
    state.gateProbeStepQueue = [];
    setGateProbeLocked(false);
    return baseStopGateProbe();
  };

  const baseClearGateProbeMap = clearGateProbeMap;
  clearGateProbeMap = function patchedClearGateProbeMap() {
    resetGateProbeQueue();
    setGateProbeLocked(false);
    return baseClearGateProbeMap();
  };

  onGateProbeInput = function patchedOnGateProbeInput(source) {
    gateProbeMv(source);
    if (!state.gateProbeRunning) return;
    enqueueGateProbePath(currentGateProbeCode(), gateProbeDac());
    processGateProbeQueue(false);
  };
})();
