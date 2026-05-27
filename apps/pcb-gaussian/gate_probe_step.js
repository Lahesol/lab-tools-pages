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
  sampleGateProbe = async function patchedSampleGateProbe(force = false) {
    state.gateProbeLastSampleCode = currentGateProbeCode();
    return baseSampleGateProbe(force);
  };

  const baseStartGateProbe = startGateProbe;
  startGateProbe = function patchedStartGateProbe() {
    state.gateProbeLastSampleCode = null;
    return baseStartGateProbe();
  };

  const baseClearGateProbeMap = clearGateProbeMap;
  clearGateProbeMap = function patchedClearGateProbeMap() {
    state.gateProbeLastSampleCode = null;
    return baseClearGateProbeMap();
  };

  onGateProbeInput = function patchedOnGateProbeInput(source) {
    gateProbeMv(source);
    if (!state.gateProbeRunning) return;
    const code = currentGateProbeCode();
    const last = Number.isFinite(state.gateProbeLastSampleCode) ? state.gateProbeLastSampleCode : null;
    if (last === null || Math.abs(code - last) >= gateProbeCodeStep()) {
      sampleGateProbe(false);
    }
  };
})();
