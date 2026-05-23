(function () {
  function directionValue(id, fallback = 1) {
    const value = Number($(id)?.value);
    return value < 0 ? -1 : fallback;
  }

  function aDirectionGuardEnabled() {
    const input = $("fitAerrorGuard");
    return !input || input.checked;
  }

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
    const vstartAmplitudeDelta = ampError * vstartGain * aDirection;
    let vstartTotalDelta = vstartCoupledDelta + vstartAmplitudeDelta;
    let aDirectionGuardApplied = false;

    if (aDirectionGuardEnabled() && Math.abs(vstartAmplitudeDelta) > 0 && Math.sign(vstartTotalDelta) !== Math.sign(vstartAmplitudeDelta)) {
      vstartTotalDelta = vstartAmplitudeDelta;
      aDirectionGuardApplied = true;
    }

    const nextMuV = currentMuV + muControlDelta;
    const nextVstartV = currentVstartV + vstartTotalDelta;
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
      nextMuCode,
      nextVstartCode,
      muControlDelta,
      vstartCoupledDelta,
      vstartAmplitudeDelta,
      vstartTotalDelta,
      muDirection,
      aDirection,
      aDirectionGuardApplied,
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
    const guardText = plan.aDirectionGuardApplied ? ", A dir lock applied" : "";
    const couplingText = plan.mode === "fit" && Number.isFinite(vstartDelta)
      ? `; Vstart delta ${vstartDelta.toFixed(4)} V = total ${plan.vstartTotalDelta.toFixed(4)} (mu link ${plan.vstartCoupledDelta.toFixed(4)} + A correction ${plan.vstartAmplitudeDelta.toFixed(4)}${guardText})`
      : "";
    setFitStatus(`Device ${plan.device}: mu ${plan.currentMuCode}->${plan.nextMuCode} (${plan.nextMuV.toFixed(4)} V), Vstart ${plan.currentVstartCode}->${plan.nextVstartCode} (${plan.nextVstartV.toFixed(4)} V)${couplingText}.${errorText}`, "ok");
  };
})();
