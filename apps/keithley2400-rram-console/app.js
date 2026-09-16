import {
  APP_VERSION,
  asFiniteNumber,
  buildInclusiveSegment,
  buildRunTimeouts,
  buildProfilePoints,
  commandPreview,
  configureLegacy2400Sweep,
  deriveRows,
  estimateDuration,
  findSwitchCandidates,
  formatDuration,
  formatScpiNumber,
  makeRunId,
  makeSyntheticRun,
  parseTraceResponse,
  selectReadPoint,
  validateFinitePlan,
} from "./protocol.js";
import {
  DEVICE_LAYOUT_VERSION,
  DEVICE_ROWS,
  filterDeviceRuns,
  formatDeviceSelection,
  getRunDeviceIdentity,
  makeDeviceSelection,
  normalizeDevicesPerRow,
  runDieId,
} from "./pad-map.js";
import { RunStore, downloadText, runToCsv } from "./storage.js";
import { Legacy2400SerialTransport } from "./serial.js";
import { acquireBufferedSweep, acquisitionErrorMessage } from "./acquisition.js";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const nowIso = () => new Date().toISOString();

const state = {
  store: null,
  transport: null,
  activeRun: null,
  selectedRun: null,
  busy: false,
  storageError: null,
  connected: false,
  instrumentId: null,
  deviceSelection: null,
  historyFilters: { dieId: "", deviceKey: "" },
  measurementTab: "sweep",
};

const PLOT_COLORS = ["#087f74", "#2369aa", "#9a5d00", "#8f3f91", "#c04d21", "#3c748a", "#64811c", "#6c5a9e"];

function number(id) {
  return asFiniteNumber($(id).value, id);
}

function text(id) {
  return $(id).value.trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
}

function formatEngineering(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return `0 ${unit}`.trim();
  const prefixes = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  const [scale, prefix] = prefixes.find(([candidate]) => abs >= candidate) ?? [1e-12, "p"];
  return `${(value / scale).toPrecision(4)} ${prefix}${unit}`.trim();
}

function shortDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
}

function showToast(message, kind = "") {
  const toast = document.createElement("div");
  toast.className = `toast ${kind}`;
  toast.textContent = message;
  $("toast-region").append(toast);
  setTimeout(() => toast.remove(), 6000);
}

function updateConnectionUi({ status = "미연결", online = false, detail = "장비 식별 전" } = {}) {
  $("connection-state").textContent = status;
  $("instrument-id").textContent = detail;
  $("connection-dot").className = `status-dot ${online ? "online" : "offline"}`;
  $("status-transport").textContent = status;
  $("status-id").textContent = state.instrumentId ?? "미확인";
  $("connect-button").disabled = online || state.busy || !("serial" in navigator);
  $("disconnect-button").disabled = !online;
  $("identify-button").disabled = !online || state.busy;
  state.connected = online;
  syncRunButtons();
}

function updateOutputUi(mode = "off", label = "OUTPUT OFF") {
  const output = $("output-state");
  output.className = `output-state ${mode === "on" ? "on" : "off"}`;
  output.innerHTML = `<span class="output-indicator" aria-hidden="true"></span>${escapeHtml(label)}`;
}

function setStorageState(message, bad = false) {
  $("storage-state").textContent = message;
  $("storage-state").style.color = bad ? "#b42318" : "";
}

async function persistOrReport(action, context) {
  try {
    return await action();
  } catch (error) {
    state.storageError = error;
    setStorageState(`저장 실패: ${error.message}`, true);
    showToast(`${context} 저장 실패: ${error.message}`, "error");
    throw error;
  }
}

function serialConfig() {
  return {
    baudRate: Number($("baud-rate").value),
    dataBits: Number($("data-bits").value),
    stopBits: Number($("stop-bits").value),
    parity: $("parity").value,
    flowControl: $("flow-control").value,
    terminator: $("terminator").value,
  };
}

function safetySettings() {
  return {
    maxVoltageV: number("max-voltage-v"),
    maxComplianceA: number("max-compliance-ma") / 1000,
    maxRunSeconds: number("max-run-seconds"),
    lineFrequencyHz: number("line-frequency"),
    queryTimeoutMs: number("query-timeout-s") * 1000,
  };
}

function analysisRules(complianceA) {
  return {
    complianceA,
    lrsMaxOhm: number("lrs-max-ohm"),
    hrsMinOhm: number("hrs-min-ohm"),
    minimumCurrentA: number("min-current-a"),
    switchDecades: number("switch-decades"),
    readVoltageV: number("read-voltage"),
  };
}

function formPlan(kind) {
  if (kind === "forming") {
    const stepV = number("forming-step");
    const one = buildInclusiveSegment(number("forming-start"), number("forming-stop"), stepV);
    const repeats = Math.trunc(number("forming-repeats"));
    if (repeats < 1) throw new Error("반복 횟수는 1 이상이어야 합니다.");
    const points = Array.from({ length: repeats }, () => one).flat();
    const plan = {
      kind,
      title: "Forming 0 → +3 V 계획",
      points,
      sourceDelayMs: number("forming-dwell"),
      complianceA: number("forming-compliance") / 1000,
      measurementRangeA: number("forming-range") / 1000,
      nplc: number("forming-nplc"),
      repeats,
    };
    plan.duration = validateFinitePlan(plan, safetySettings());
    return plan;
  }
  if (kind === "read") {
    const plan = {
      kind,
      title: "저전압 1점 read (0 → Vread → 0)",
      points: [0, number("read-voltage"), 0],
      sourceDelayMs: number("sweep-dwell"),
      complianceA: number("sweep-compliance") / 1000,
      measurementRangeA: number("sweep-range") / 1000,
      nplc: number("sweep-nplc"),
      repeats: 1,
    };
    plan.duration = validateFinitePlan(plan, safetySettings());
    return plan;
  }
  const stepV = number("sweep-step-mv") / 1000;
  const plan = {
    kind,
    title: "0 → +1 → −1 → 0 V 상태 확인",
    points: buildProfilePoints({
      startV: number("sweep-start"), positiveV: number("sweep-positive"), negativeV: number("sweep-negative"), endV: number("sweep-end"),
      stepV, repeats: Math.trunc(number("sweep-repeats")),
    }),
    sourceDelayMs: number("sweep-dwell"),
    complianceA: number("sweep-compliance") / 1000,
    measurementRangeA: number("sweep-range") / 1000,
    nplc: number("sweep-nplc"),
    repeats: Math.trunc(number("sweep-repeats")),
  };
  plan.duration = validateFinitePlan(plan, safetySettings());
  return plan;
}

function describePlan(plan) {
  const duration = plan.duration ?? estimateDuration({
    pointCount: plan.points.length, sourceDelayMs: plan.sourceDelayMs, nplc: plan.nplc, lineFrequencyHz: safetySettings().lineFrequencyHz,
  });
  return `${plan.repeats} ${plan.kind === "sweep" ? "cycle" : "회"} · ${plan.points.length} 점 · V ${formatScpiNumber(Math.min(...plan.points))} → ${formatScpiNumber(Math.max(...plan.points))} · CC ${formatEngineering(plan.complianceA, "A")} · source delay 요청 ${plan.sourceDelayMs} ms · NPLC ${plan.nplc}. 점당 하한 ${duration.lowerBoundPerPointMs.toFixed(2)} ms, 전체 하한 ${formatDuration(duration.lowerBoundTotalMs)}. 실제 점 주기는 auto-range, 장비 firmware, 통신/trace 전송 시간을 포함하지 않습니다.`;
}

function updatePlanPreview(kind) {
  const target = kind === "forming" ? "forming-command-preview" : "sweep-command-preview";
  try {
    const plan = formPlan(kind);
    $(target).textContent = commandPreview(plan);
    showToast(`${kind === "forming" ? "Forming" : "Sweep"} 계획을 검증하고 SCPI 미리보기를 만들었습니다.`);
  } catch (error) {
    $(target).textContent = `계획 오류: ${error.message}`;
    showToast(error.message, "error");
  }
}

function updateEstimates() {
  for (const kind of ["forming", "sweep"]) {
    const target = kind === "forming" ? "forming-estimate" : "sweep-estimate";
    try {
      $(target).textContent = describePlan(formPlan(kind));
      $(target).style.color = "";
      $(target).style.background = "";
    } catch (error) {
      $(target).textContent = `계획 차단: ${error.message}`;
      $(target).style.color = "#a1271b";
      $(target).style.background = "#fff0ee";
    }
  }
  syncRunButtons();
}

function syncRunButtons() {
  for (const kind of ["forming", "sweep", "read"]) {
    const startButton = kind === "read" ? $("read-start-button") : $(`${kind}-start-button`);
    let valid = false;
    try { formPlan(kind); valid = true; } catch { valid = false; }
    startButton.disabled = !state.connected || state.busy || !valid;
  }
  $$(".stop-button").forEach((button) => { button.disabled = !state.busy && !state.connected; });
}

function setRunLocked(locked) {
  state.busy = locked;
  $$("#tab-forming input, #tab-forming select, #tab-forming .button:not(.stop-button), #tab-sweep input, #tab-sweep select, #tab-sweep .button:not(.stop-button)")
    .forEach((element) => { element.disabled = locked; });
  $$("#device-selector input, #device-selector button").forEach((element) => { element.disabled = locked; });
  $("use-run-device").disabled = locked || !restorableRunDevice(state.selectedRun);
  syncRunButtons();
}

function currentMetadata() {
  return {
    dutId: text("dut-id") || "미기록",
    dieId: text("die-id") || "미기록",
    deviceSelection: state.deviceSelection ? structuredClone(state.deviceSelection) : null,
    operator: text("operator"),
    note: text("run-note"),
    appVersion: APP_VERSION,
    communication: serialConfig(),
    maxLimits: safetySettings(),
  };
}

function updateDeviceSelectionUi() {
  const label = `Die ${text("die-id") || "미기록"} · ${formatDeviceSelection(state.deviceSelection)}`;
  $("device-selected-value").textContent = label;
  $$("[data-measurement-target]").forEach((element) => { element.textContent = label; });
  $$(".device-button").forEach((button) => {
    const selected = button.dataset.deviceKey === state.deviceSelection?.key;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.disabled = state.busy;
  });
}

function renderDeviceMap() {
  const count = normalizeDevicesPerRow($("devices-per-row").value);
  $("devices-per-row").value = count;
  if (state.deviceSelection && state.deviceSelection.devicesPerRow !== count) state.deviceSelection = null;
  const map = $("device-map");
  map.style.setProperty("--device-count", count);
  map.replaceChildren();
  DEVICE_ROWS.forEach((row) => {
    const section = document.createElement("div");
    section.className = `device-row ${row.key.startsWith("MID-") ? "middle-device-row" : ""}`;
    const label = document.createElement("div");
    label.className = "device-row-label";
    label.innerHTML = `<strong>${row.label}</strong><span>${row.contacts}</span>`;
    const devices = document.createElement("div");
    devices.className = "device-button-grid";
    devices.style.setProperty("--device-count", count);
    for (let index = 1; index <= count; index += 1) {
      const selection = makeDeviceSelection(row.key, index, count);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "device-button";
      button.dataset.deviceKey = selection.key;
      button.title = `${formatDeviceSelection(selection)} · TE ${selection.te.key} / BE ${selection.be.key}`;
      button.setAttribute("aria-label", `${formatDeviceSelection(selection)} 선택`);
      button.innerHTML = `<span class="device-contact">TE</span><strong>${String(index).padStart(2, "0")}</strong><span class="device-contact">BE</span>`;
      button.addEventListener("click", () => {
        if (state.busy) return;
        state.deviceSelection = selection;
        updateDeviceSelectionUi();
      });
      devices.append(button);
    }
    section.append(label, devices);
    map.append(section);
  });
  updateDeviceSelectionUi();
}

function restorableRunDevice(run) {
  const selection = run?.metadata?.deviceSelection;
  if (selection?.layoutVersion !== DEVICE_LAYOUT_VERSION) return null;
  const restored = makeDeviceSelection(selection.rowKey, selection.index, selection.devicesPerRow);
  return restored?.key === selection.key ? restored : null;
}

function useSelectedRunDevice() {
  const device = restorableRunDevice(state.selectedRun);
  if (state.busy || !device) return;
  state.deviceSelection = device;
  $("devices-per-row").value = device.devicesPerRow;
  $("die-id").value = state.selectedRun.metadata.dieId ?? "";
  $("dut-id").value = state.selectedRun.metadata.dutId ?? "";
  renderDeviceMap();
  activateTab(state.measurementTab);
}

async function onRawEvent(event) {
  const stamped = { at: nowIso(), ...event };
  if (!state.activeRun) return;
  state.activeRun.rawEvents.push(stamped);
  try {
    await persistOrReport(() => state.store.appendRawEvent(state.activeRun.id, stamped), "원시 통신 로그");
  } catch {
    // Visibility is already updated by persistOrReport; never pretend raw logging succeeded.
  }
}

function onTransportState(event) {
  if (event.type === "connected") {
    updateConnectionUi({ status: "포트 연결됨 · 식별 대기", online: true, detail: "장비 식별 전" });
    return;
  }
  if (event.type === "disconnected") {
    updateConnectionUi({ status: "연결 해제됨", online: false, detail: "장비 식별 전" });
    updateOutputUi("off", "OUTPUT OFF / 미확인");
    return;
  }
  if (event.type === "xonxoff") {
    $("status-transport").textContent = event.paused ? "XOFF: 송신 일시 정지" : "XON: 송신 재개";
    return;
  }
  if (event.type === "fault") {
    updateConnectionUi({ status: "통신 오류", online: false, detail: "OUTPUT 상태 전면 확인 필요" });
    updateOutputUi("on", "OUTPUT 상태 미확인");
    showToast(`통신 오류: ${event.error.message}. 장비 전면에서 OUTPUT을 확인하세요.`, "error");
    return;
  }
  if (event.type === "unsolicited") showToast(`예상하지 않은 장비 응답: ${event.line}`, "warn");
}

async function identifyInstrument() {
  if (!state.transport?.connected) throw new Error("먼저 포트를 연결하세요.");
  const timeout = safetySettings().queryTimeoutMs;
  const identity = await state.transport.query("*IDN?", timeout);
  state.instrumentId = identity || "빈 ID 응답";
  $("status-id").textContent = state.instrumentId;
  $("instrument-id").textContent = state.instrumentId;
  const output = await state.transport.query(":OUTP?", timeout);
  updateOutputUi(String(output).trim() === "1" ? "on" : "off", String(output).trim() === "1" ? "OUTPUT ON (장비 응답)" : "OUTPUT OFF (장비 응답)");
  const error = await state.transport.query(":SYST:ERR?", timeout);
  $("status-error").textContent = error || "응답 없음";
  updateConnectionUi({ status: "식별 완료", online: true, detail: state.instrumentId });
}

async function connect() {
  if (!window.isSecureContext) {
    showToast("Web Serial은 secure context가 필요합니다. HTTPS 또는 localhost 환경을 확인하세요.", "error");
    return;
  }
  try {
    await state.transport.connect(serialConfig());
    await identifyInstrument();
    showToast("포트를 열고 장비 식별/OUTPUT 상태를 조회했습니다. DUT 출력은 시작하지 않았습니다.");
  } catch (error) {
    updateConnectionUi({ status: "연결 실패", online: false, detail: "포트/설정 확인" });
    updateOutputUi("off", "OUTPUT OFF / 미확인");
    showToast(`연결 또는 식별 실패: ${error.message}`, "error");
  }
}

async function stopMeasurement(reason = "사용자 Stop") {
  const activeId = state.activeRun?.id;
  if (state.activeRun) state.activeRun.stopRequested = true;
  const result = await state.transport.safeStop();
  if (result.errors.length) {
    updateOutputUi("on", "OUTPUT 상태 미확인");
    showToast(`정지 명령 일부 실패: ${result.errors.join(" / ")}. 전면 OUTPUT을 확인하세요.`, "error");
  } else {
    updateOutputUi("off", "OUTPUT OFF 명령 전송");
    showToast("^C, ABOR, OUTP OFF, 버퍼 저장 해제를 순서대로 전송했습니다. 실제 상태는 전면에서 확인하세요.", "warn");
  }
  if (activeId) {
    await persistOrReport(() => state.store.update(activeId, (run) => ({ ...run, endReason: reason, stopAttempt: result, endedAt: nowIso() })), "정지 상태");
  }
}

async function drainErrors(timeoutMs, limit = 8) {
  const errors = [];
  for (let index = 0; index < limit; index += 1) {
    const response = await state.transport.query(":SYST:ERR?", timeoutMs);
    errors.push(response);
    if (/^[+]?0\s*,/i.test(response.trim())) break;
  }
  return errors;
}

async function executeRun(kind) {
  if (state.busy) return;
  if (!state.connected || !state.transport?.connected) throw new Error("포트 연결과 식별을 먼저 완료하세요.");
  const plan = formPlan(kind);
  const metadata = currentMetadata();
  const safety = metadata.maxLimits;
  const timeouts = buildRunTimeouts(plan, safety, state.transport.config ?? metadata.communication);
  const run = {
    id: makeRunId(), startedAt: nowIso(), endedAt: null, kind, synthetic: false, endReason: "진행 중",
    metadata, plan, timeouts, acquisitionMode: "buffered", rawEvents: [], rawRows: [], derivedRows: [], deviceComplianceTripped: false, storageState: "ok",
  };
  const assertRunActive = () => {
    if (run.stopRequested || state.activeRun?.id !== run.id) {
      const error = new Error("사용자 정지 요청으로 실행을 중단했습니다.");
      error.name = "RunCancelledError";
      throw error;
    }
  };
  state.activeRun = run;
  setRunLocked(true);
  const showPhase = (message) => $$("[data-acquisition-status]").forEach((element) => { element.textContent = message; });
  showPhase("설정 중 · 측정값은 아직 수신되지 않았습니다.");
  let phaseTimer = null;
  try {
    await persistOrReport(() => state.store.put(run), "run 시작 메타데이터");
    await onRawEvent({ direction: "SYSTEM", text: `RUN START: ${kind}; start button clicked; Die ${metadata.dieId}; device ${metadata.deviceSelection?.key ?? "unassigned"}.` });
    const configurationCheck = await configureLegacy2400Sweep(state.transport, plan, {
      timeoutMs: safety.queryTimeoutMs, assertActive: assertRunActive,
    });
    await persistOrReport(() => state.store.update(run.id, (stored) => ({ ...stored, configurationCheck })), "설정 검증 결과");
    await onRawEvent({ direction: "SYSTEM", text: `CONFIGURE VERIFIED: ${configurationCheck.actualPoints} list points, all configuration error checks zero; compliance fixed through this finite run.` });
    assertRunActive();
    const { opc, traceResponse, trippedResponse, outputResponse } = await acquireBufferedSweep(state.transport, timeouts, {
      assertActive: assertRunActive,
      onPhase: async ({ phase, command, timeoutMs }) => {
        clearInterval(phaseTimer);
        run.phase = phase;
        const phaseStarted = Date.now();
        const label = phase === "measurement" ? "장비 측정 완료 대기 · 종료 후 그래프 표시" : phase === "transfer" ? "측정 종료 · 데이터 수신 중" : phase === "initiate" ? "측정 시작" : "장비 상태 확인";
        const refresh = () => showPhase(`${label} · ${((Date.now() - phaseStarted) / 1000).toFixed(0)} s 경과 / 대기 한도 ${timeoutMs / 1000} s · ${command}`);
        refresh();
        phaseTimer = setInterval(refresh, 1000);
        if (phase === "measurement") updateOutputUi("on", "SOURCE-MEASURE 진행 / 전면 확인");
        await onRawEvent({ direction: "SYSTEM", text: `ACQUISITION ${phase}: ${command}; timeout ${timeoutMs} ms; buffered mode, no live samples.` });
      },
    });
    const errors = await drainErrors(safety.queryTimeoutMs);
    assertRunActive();
    const parsed = parseTraceResponse(traceResponse);
    const rules = kind === "sweep" || kind === "read" ? analysisRules(plan.complianceA) : {
      complianceA: plan.complianceA, lrsMaxOhm: Number.POSITIVE_INFINITY, hrsMinOhm: Number.POSITIVE_INFINITY, minimumCurrentA: 1e-9, switchDecades: 1, readVoltageV: 0.1,
    };
    const deviceComplianceTripped = trippedResponse.trim() === "1";
    const derivedRows = deriveRows(parsed.rows, rules, deviceComplianceTripped);
    const candidates = kind === "sweep" ? findSwitchCandidates(derivedRows, rules) : [];
    const readPoint = kind === "sweep" || kind === "read" ? selectReadPoint(derivedRows, rules.readVoltageV) : null;
    const stopResult = await state.transport.safeStop({ useBreak: false });
    updateOutputUi("off", stopResult.errors.length ? "OUTPUT 상태 미확인" : "OUTPUT OFF 명령 전송");
    const finish = {
      endedAt: nowIso(), endReason: stopResult.errors.length ? "완료 · 안전 OFF 명령 일부 실패" : "정상 완료 · 유한 실행 종료",
      rawRows: parsed.rows, derivedRows, analysis: { rules, candidates, readPoint, parseWarnings: parsed.warnings, instrumentErrors: errors, outputResponse, opc, trippedResponse },
      deviceComplianceTripped, stopAttempt: stopResult,
    };
    await persistOrReport(() => state.store.update(run.id, (stored) => ({ ...stored, ...finish })), "run 결과");
    clearInterval(phaseTimer);
    showPhase(`완료 · ${parsed.rows.length} / ${plan.points.length} 점 수신 · 이력 탭에서 그래프를 확인하세요.`);
    selectNewRunInHistory(await state.store.get(run.id));
    await renderHistory();
    renderSelectedRun();
    showToast(`${kind === "forming" ? "Forming" : kind === "read" ? "저전압 Read" : "Sweep"} run을 저장했습니다. 실제 OUTPUT 상태를 전면에서 확인하세요.`, deviceComplianceTripped ? "warn" : "");
  } catch (error) {
    const stopResult = await state.transport.safeStop().catch((stopError) => ({ attempted: [], errors: [stopError.message] }));
    updateOutputUi(stopResult.errors?.length ? "on" : "off", stopResult.errors?.length ? "OUTPUT 상태 미확인" : "OUTPUT OFF 명령 전송");
    clearInterval(phaseTimer);
    const detail = acquisitionErrorMessage(error);
    showPhase(`중단 · ${detail}`);
    $("status-error").textContent = detail;
    const failure = { endedAt: nowIso(), endReason: `오류: ${error.name}: ${error.message}`, error: { name: error.name, message: error.message, command: error.command, timeoutMs: error.timeoutMs, phase: error.phase ?? run.phase, response: error.response }, stopAttempt: stopResult };
    if (error.configurationCheck) {
      failure.configurationCheck = error.configurationCheck;
      $("status-error").textContent = error.message;
    }
    try {
      await persistOrReport(() => state.store.update(run.id, (stored) => ({ ...stored, ...failure })), "실패 run 상태");
      selectNewRunInHistory(await state.store.get(run.id));
      await renderHistory();
      renderSelectedRun();
    } catch { /* storage failure already remains visible */ }
    showToast(`실행 실패: ${detail}. 장비 전면 OUTPUT 상태를 즉시 확인하세요.`, "error");
  } finally {
    clearInterval(phaseTimer);
    state.activeRun = null;
    setRunLocked(false);
  }
}

function selectNewRunInHistory(run) {
  state.selectedRun = run;
  state.historyFilters = { dieId: runDieId(run), deviceKey: getRunDeviceIdentity(run).filterKey };
}

async function renderHistory({ preserveSelection = true } = {}) {
  if (!state.store) return;
  const runs = await state.store.list();
  const list = $("run-list");
  populateHistoryFilters(runs);
  const filteredRuns = filterDeviceRuns(runs, state.historyFilters);
  renderDieOverlay(filteredRuns);
  if (!runs.length) {
    state.selectedRun = null;
    list.innerHTML = '<p class="empty-state">저장된 try가 없습니다.</p>';
    return;
  }
  if (!preserveSelection) state.selectedRun = filteredRuns[0] ?? null;
  else if (!state.selectedRun || !filteredRuns.some((run) => run.id === state.selectedRun.id)) state.selectedRun = filteredRuns[0] ?? null;
  if (!filteredRuns.length) {
    list.innerHTML = '<p class="empty-state">선택한 Die / 소자에 맞는 try가 없습니다.</p>';
    return;
  }
  list.innerHTML = filteredRuns.map((run) => {
    const isSelected = state.selectedRun?.id === run.id;
    const label = run.synthetic ? '<span class="synthetic-label">합성 예시 · 실측 아님</span>' : `<span>${escapeHtml(run.kind)} · ${escapeHtml(run.endReason ?? "진행 중")}</span>`;
    return `<button class="run-item ${isSelected ? "selected" : ""}" type="button" data-run-id="${escapeHtml(run.id)}"><strong>Die ${escapeHtml(runDieId(run))} · ${escapeHtml(run.metadata?.dutId ?? "DUT 미기록")}</strong><span>${escapeHtml(getRunDeviceIdentity(run).label)}</span>${label}<span>${escapeHtml(shortDate(run.startedAt))}</span><span>${escapeHtml(run.id)}</span></button>`;
  }).join("");
  $$(".run-item").forEach((button) => button.addEventListener("click", async () => {
    state.selectedRun = await state.store.get(button.dataset.runId);
    await renderHistory();
    renderSelectedRun();
  }));
}

function populateHistoryFilters(runs) {
  const dieSelect = $("history-die-filter");
  const deviceSelect = $("history-device-filter");
  const dieIds = [...new Set(runs.map(runDieId))].sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
  if (!dieIds.includes(state.historyFilters.dieId)) state.historyFilters.dieId = "";
  const dieRuns = filterDeviceRuns(runs, { dieId: state.historyFilters.dieId });
  const devices = [...new Map(dieRuns.map((run) => {
    const identity = getRunDeviceIdentity(run);
    return [identity.filterKey, identity];
  })).values()].sort((a, b) => a.label.localeCompare(b.label, "ko", { numeric: true }));
  if (!devices.some((device) => device.filterKey === state.historyFilters.deviceKey)) state.historyFilters.deviceKey = "";
  dieSelect.replaceChildren(new Option("전체 Die", ""), ...dieIds.map((dieId) => new Option(`Die ${dieId}`, dieId)));
  deviceSelect.replaceChildren(
    new Option("전체 소자", ""),
    ...devices.map((device) => new Option(device.label, device.filterKey)),
  );
  dieSelect.value = state.historyFilters.dieId;
  deviceSelect.value = state.historyFilters.deviceKey;
}

function clearPlot(svgId, message) {
  const svg = $(svgId);
  svg.replaceChildren();
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", "410"); label.setAttribute("y", "165"); label.setAttribute("text-anchor", "middle"); label.textContent = message;
  svg.append(label);
}

function drawSeriesPlot(svgId, series, { emptyMessage = "유효한 I–V 점이 없습니다.", markWarnings = false } = {}) {
  const prepared = series.map((item, index) => ({
    ...item,
    color: item.color ?? PLOT_COLORS[index % PLOT_COLORS.length],
    points: (item.rows ?? []).filter((row) => Number.isFinite(row.voltageV) && Number.isFinite(row.currentA) && Math.abs(row.voltageV) < 1e36 && Math.abs(row.currentA) < 1e36),
  })).filter((item) => item.points.length);
  if (!prepared.length) {
    clearPlot(svgId, emptyMessage);
    return [];
  }
  const svg = $(svgId);
  svg.replaceChildren();
  const width = 820; const height = 330; const margin = { top: 20, right: 24, bottom: 42, left: 68 };
  const points = prepared.flatMap((item) => item.points);
  const xValues = points.map((point) => point.voltageV); const yValues = points.map((point) => point.currentA * 1000);
  const domain = (values) => {
    let min = Math.min(...values, 0); let max = Math.max(...values, 0);
    if (min === max) { min -= 1; max += 1; }
    const padding = (max - min) * .08;
    return [min - padding, max + padding];
  };
  const [xMin, xMax] = domain(xValues); const [yMin, yMax] = domain(yValues);
  const x = (value) => margin.left + ((value - xMin) / (xMax - xMin)) * (width - margin.left - margin.right);
  const y = (value) => height - margin.bottom - ((value - yMin) / (yMax - yMin)) * (height - margin.top - margin.bottom);
  const make = (name, attributes = {}) => { const node = document.createElementNS("http://www.w3.org/2000/svg", name); Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value)); return node; };
  svg.append(make("line", { x1: margin.left, y1: y(0), x2: width - margin.right, y2: y(0), stroke: "#a9b8c5", "stroke-width": 1 }));
  svg.append(make("line", { x1: x(0), y1: margin.top, x2: x(0), y2: height - margin.bottom, stroke: "#a9b8c5", "stroke-width": 1 }));
  prepared.forEach((item) => {
    const path = item.points.map((point, index) => `${index ? "L" : "M"}${x(point.voltageV).toFixed(2)},${y(point.currentA * 1000).toFixed(2)}`).join(" ");
    svg.append(make("path", { d: path, fill: "none", stroke: item.color, "stroke-width": 2.3, "stroke-linejoin": "round", "stroke-linecap": "round" }));
    item.points.forEach((point) => svg.append(make("circle", { cx: x(point.voltageV), cy: y(point.currentA * 1000), r: 2.2, fill: markWarnings && point.warnings?.length ? "#b42318" : item.color })));
  });
  [[margin.left, height - margin.bottom, `${xMin.toPrecision(3)} V`], [width - margin.right, height - margin.bottom, `${xMax.toPrecision(3)} V`]].forEach(([tx, ty, value]) => { const node = make("text", { x: tx, y: ty + 20, "text-anchor": tx === margin.left ? "start" : "end" }); node.textContent = value; svg.append(node); });
  [[margin.left - 8, y(yMax), `${yMax.toPrecision(3)} mA`], [margin.left - 8, y(yMin), `${yMin.toPrecision(3)} mA`]].forEach(([tx, ty, value]) => { const node = make("text", { x: tx, y: ty + 4, "text-anchor": "end" }); node.textContent = value; svg.append(node); });
  const xTitle = make("text", { x: width / 2, y: height - 6, "text-anchor": "middle" }); xTitle.textContent = "Voltage (V)"; svg.append(xTitle);
  const yTitle = make("text", { x: 14, y: height / 2, transform: `rotate(-90 14 ${height / 2})`, "text-anchor": "middle" }); yTitle.textContent = "Current (mA)"; svg.append(yTitle);
  return prepared;
}

function drawIvPlot(rows) {
  drawSeriesPlot("iv-plot", [{ rows }], { markWarnings: true });
}

function renderDieOverlay(runs) {
  const series = runs.map((run) => ({
    rows: run.derivedRows,
    label: `${run.synthetic ? "합성 · " : ""}Die ${runDieId(run)} · ${getRunDeviceIdentity(run).label} · ${run.id}`,
  }));
  const visibleSeries = drawSeriesPlot("die-plot", series, { emptyMessage: "선택한 Die / 소자에 유효한 I–V 점이 없습니다." });
  $("die-plot-legend").innerHTML = visibleSeries.map((item) => `<span class="plot-legend-item"><i class="plot-legend-swatch" style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("");
}

function renderSelectedRun() {
  const run = state.selectedRun;
  $("use-run-device").disabled = state.busy || !restorableRunDevice(run);
  if (!run) {
    $("selected-run-kind").textContent = "실측 이력 없음";
    $("analysis-subtitle").textContent = "실측 run을 선택하면 분석 결과가 표시됩니다.";
    $("analysis-metrics").innerHTML = '<div><span>Read R</span><strong>—</strong></div><div><span>상태 후보</span><strong>—</strong></div><div><span>Compliance</span><strong>—</strong></div><div><span>전환 후보</span><strong>—</strong></div>';
    $("derived-table").innerHTML = '<tr><td colspan="6" class="empty-cell">선택된 데이터가 없습니다.</td></tr>';
    $("raw-log").textContent = "선택된 run이 없습니다.";
    clearPlot("iv-plot", "실측 데이터가 없습니다.");
    $("export-json").disabled = true; $("export-csv").disabled = true;
    return;
  }
  const derived = run.derivedRows ?? [];
  const analysis = run.analysis ?? {};
  const read = analysis.readPoint ?? null;
  const candidates = analysis.candidates ?? [];
  const compliance = run.deviceComplianceTripped ? "장비 trip = 1" : derived.some((row) => row.warnings?.some((warning) => warning.includes("compliance"))) ? "근접 추정" : "미검출";
  $("selected-run-kind").textContent = run.synthetic ? "합성 예시 · 실측 아님" : `${run.kind} · ${run.endReason ?? "진행 중"}`;
  $("analysis-subtitle").textContent = `${run.id} · Die ${runDieId(run)} · ${getRunDeviceIdentity(run).label} · DUT ${run.metadata?.dutId ?? "미기록"} · ${shortDate(run.startedAt)}`;
  $("analysis-metrics").innerHTML = [
    ["Read R", read ? formatEngineering(read.resistanceOhm, "Ω") : "판정 불가"],
    ["상태 후보", read?.state ?? "—"],
    ["Compliance", compliance],
    ["전환 후보", candidates.length ? `${candidates.length}개` : "미검출"],
  ].map(([name, value]) => `<div><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  drawIvPlot(derived);
  const rows = derived.slice(0, 400);
  $("derived-table").innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.index}</td><td>${formatEngineering(row.voltageV, "V")}</td><td>${formatEngineering(row.currentA, "A")}</td><td>${row.resistanceOhm ? formatEngineering(row.resistanceOhm, "Ω") : "—"}</td><td>${escapeHtml(row.state ?? "—")}</td><td class="${row.warnings?.length ? "warn-cell" : ""}">${escapeHtml((row.warnings ?? []).join("; ") || "—")}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-cell">파생 데이터가 없습니다.</td></tr>';
  if (derived.length > rows.length) $("derived-table").insertAdjacentHTML("beforeend", `<tr><td colspan="6" class="empty-cell">표시 제한: ${rows.length}/${derived.length} 점 (전체는 CSV/JSON 내보내기)</td></tr>`);
  $("raw-log").textContent = (run.rawEvents ?? []).map((event) => `[${event.at}] ${event.direction} ${event.text}${event.bytesHex ? `\n  HEX ${event.bytesHex}` : ""}`).join("\n") || "원시 통신 로그가 없습니다.";
  $("export-json").disabled = false; $("export-csv").disabled = false;
}

async function seedSyntheticRun() {
  const synthetic = makeSyntheticRun({ dutId: text("dut-id") || "SYNTHETIC-DEMO" });
  const rules = { complianceA: .001, lrsMaxOhm: number("lrs-max-ohm"), hrsMinOhm: number("hrs-min-ohm"), minimumCurrentA: number("min-current-a"), switchDecades: number("switch-decades"), readVoltageV: number("read-voltage") };
  synthetic.derivedRows = deriveRows(synthetic.rawRows, rules, false);
  synthetic.analysis = { rules, candidates: findSwitchCandidates(synthetic.derivedRows, rules), readPoint: selectReadPoint(synthetic.derivedRows, rules.readVoltageV), parseWarnings: [] };
  await persistOrReport(() => state.store.put(synthetic), "합성 예시");
  selectNewRunInHistory(synthetic);
  await renderHistory(); renderSelectedRun();
  showToast("합성 예시를 불러왔습니다. 이는 장비/DUT 실측이 아닙니다.", "warn");
}

function activateTab(tabName) {
  $$(".nav-item").forEach((item) => {
    const active = item.dataset.tab === tabName;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tabName));
  if (tabName === "forming" || tabName === "sweep") {
    state.measurementTab = tabName;
    $(`${tabName}-device-host`).append($("device-selector"));
    updateDeviceSelectionUi();
  }
}

function bindTabs() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));
}

function bindEvents() {
  $("connect-button").addEventListener("click", connect);
  $("disconnect-button").addEventListener("click", async () => {
    if (state.transport?.connected) await stopMeasurement("사용자 연결 해제 전 안전 정지");
    await state.transport.disconnect();
  });
  $("identify-button").addEventListener("click", async () => {
    try { await identifyInstrument(); showToast("식별·OUTPUT·오류 상태를 갱신했습니다."); } catch (error) { showToast(error.message, "error"); }
  });
  $("forming-preview").addEventListener("click", () => updatePlanPreview("forming"));
  $("sweep-preview").addEventListener("click", () => updatePlanPreview("sweep"));
  $("forming-start-button").addEventListener("click", () => executeRun("forming").catch((error) => showToast(error.message, "error")));
  $("sweep-start-button").addEventListener("click", () => executeRun("sweep").catch((error) => showToast(error.message, "error")));
  $("read-start-button").addEventListener("click", () => executeRun("read").catch((error) => showToast(error.message, "error")));
  $$(".stop-button").forEach((button) => button.addEventListener("click", () => stopMeasurement().catch((error) => showToast(error.message, "error"))));
  $$(".copy-button").forEach((button) => button.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($(button.dataset.copyTarget).textContent); showToast("SCPI 미리보기를 클립보드에 복사했습니다."); } catch { showToast("클립보드 권한이 없어 복사하지 못했습니다.", "warn"); }
  }));
  $$("#tab-forming input, #tab-sweep input, #tab-settings input, #line-frequency").forEach((input) => input.addEventListener("input", updateEstimates));
  $("refresh-history").addEventListener("click", () => renderHistory().then(renderSelectedRun));
  $("seed-demo").addEventListener("click", () => seedSyntheticRun().catch((error) => showToast(error.message, "error")));
  $("die-id").addEventListener("input", updateDeviceSelectionUi);
  $("render-device-map").addEventListener("click", () => {
    if (state.busy) return;
    const previous = state.deviceSelection;
    renderDeviceMap();
    if (previous && !state.deviceSelection) showToast("행당 소자 수가 바뀌었습니다. 측정할 소자를 다시 선택하세요.");
  });
  $("clear-device-selection").addEventListener("click", () => {
    if (state.busy) return;
    state.deviceSelection = null;
    updateDeviceSelectionUi();
  });
  $("use-run-device").addEventListener("click", useSelectedRunDevice);
  $("history-die-filter").addEventListener("change", async (event) => {
    state.historyFilters.dieId = event.target.value;
    await renderHistory({ preserveSelection: false });
    renderSelectedRun();
  });
  $("history-device-filter").addEventListener("change", async (event) => {
    state.historyFilters.deviceKey = event.target.value;
    await renderHistory({ preserveSelection: false });
    renderSelectedRun();
  });
  $("export-json").addEventListener("click", () => {
    if (!state.selectedRun) return;
    downloadText(`${state.selectedRun.id}.json`, JSON.stringify(state.selectedRun, null, 2), "application/json");
  });
  $("export-csv").addEventListener("click", () => {
    if (!state.selectedRun) return;
    downloadText(`${state.selectedRun.id}.csv`, runToCsv(state.selectedRun), "text/csv");
  });
}

async function init() {
  bindTabs(); bindEvents();
  renderDeviceMap();
  const serialSupported = "serial" in navigator;
  const secure = window.isSecureContext;
  $("webserial-support").textContent = serialSupported && secure ? "Web Serial 사용 가능" : serialSupported ? "Secure Context 필요" : "이 브라우저 미지원";
  $("webserial-support").style.color = serialSupported && secure ? "#16803c" : "#b42318";
  $("connect-button").disabled = !serialSupported;
  state.transport = new Legacy2400SerialTransport({ onRawEvent, onState: onTransportState });
  try {
    state.store = await new RunStore().open();
    setStorageState("IndexedDB 준비됨 · best effort");
    await renderHistory({ preserveSelection: false });
    renderSelectedRun();
  } catch (error) {
    setStorageState(`사용 불가: ${error.message}`, true);
    showToast(`자동 저장소를 열 수 없습니다: ${error.message}`, "error");
  }
  updateConnectionUi();
  updateOutputUi("off", "OUTPUT OFF");
  updateEstimates();
}

init();
