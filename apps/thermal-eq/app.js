"use strict";

const CHANNELS = [
  { id: "AIN0", signal: "IC4 OUT_D", color: "#0d5bd7" },
  { id: "AIN1", signal: "IC2 OUT_D", color: "#2b8a3e" },
  { id: "AIN3", signal: "IC3 OUT_C", color: "#8e5ad7" },
  { id: "AIN4", signal: "IC4 OUT_C", color: "#cc7a00" },
  { id: "AIN5", signal: "IC2 OUT_C", color: "#007c91" },
  { id: "AIN6", signal: "IC4 OUT_B", color: "#c23b78" },
  { id: "AIN7", signal: "IC3 OUT_D", color: "#566474" },
];

const CALIBRATION_UNITS = { current: "mA", temperature: "°C" };

const CalibrationCore = globalThis.ThermalEqCalibration;

if (!CalibrationCore) {
  throw new Error("calibration-core.js must load before app.js");
}

const state = {
  port: null,
  reader: null,
  writer: null,
  connected: false,
  partialLine: "",
  rawRx: "",
  samples: [],
  autoTimer: null,
  firmware: null,
  openedAt: null,
  lastStatus: null,
  calibration: {
    sessions: {},
    activeFits: { current: null, temperature: null },
    pendingCapture: null,
  },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const ui = {
  connect: $("#connect-button"),
  disconnect: $("#disconnect-button"),
  connectionSummary: $("#connection-summary"),
  firmwareSummary: $("#firmware-summary"),
  usbStatus: $("#usb-status"),
  usbDetail: $("#usb-detail"),
  adcStatus: $("#adc-status"),
  adcDetail: $("#adc-detail"),
  currentStatus: $("#current-status"),
  temperatureStatus: $("#temperature-status"),
  autoScan: $("#auto-scan"),
  scan: $("#scan-button"),
  arm: $("#arm-button"),
  disarm: $("#disarm-button"),
  heaterApply: $("#heater-apply-button"),
  heaterDuty: $("#heater-duty"),
  heaterOutput: $("#heater-output"),
  interlockBanner: $("#interlock-banner"),
  interlockState: $("#interlock-state"),
  interlockDetail: $("#interlock-detail"),
  footerSafety: $("#footer-safety"),
  sampleCount: $("#sample-count"),
  trendCanvas: $("#trend-canvas"),
  channelMap: $("#channel-map"),
  calibrationQuery: $("#calibration-query-button"),
  console: $("#console-output"),
  clearConsole: $("#clear-console-button"),
  commandForm: $("#command-form"),
  commandInput: $("#command-input"),
  commandSend: $("#command-send-button"),
  dfuQuery: $("#dfu-query-button"),
  exportRaw: $("#export-raw-button"),
  exportMeta: $("#export-meta-button"),
  calibrationQuantity: $("#calibration-quantity"),
  calibrationChannel: $("#calibration-channel"),
  calibrationReference: $("#calibration-reference"),
  calibrationReferenceUnit: $("#calibration-reference-unit"),
  calibrationNote: $("#calibration-note"),
  calibrationCapture: $("#calibration-capture-button"),
  calibrationCaptureStatus: $("#calibration-capture-status"),
  calibrationPointBody: $("#calibration-point-body"),
  calibrationModel: $("#calibration-model"),
  calibrationPrerequisite: $("#calibration-prerequisite"),
  calibrationEquation: $("#calibration-equation"),
  calibrationMaxError: $("#calibration-max-error"),
  calibrationMae: $("#calibration-mae"),
  calibrationRmse: $("#calibration-rmse"),
  calibrationFit: $("#calibration-fit-button"),
  calibrationSessionStatus: $("#calibration-session-status"),
  exportCalibrationJson: $("#export-calibration-json-button"),
  exportCalibrationCsv: $("#export-calibration-csv-button"),
  importCalibration: $("#import-calibration-button"),
  importCalibrationFile: $("#import-calibration-file"),
  calibrationScatter: $("#calibration-scatter-canvas"),
};

function stamp() {
  return new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

function fileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function appendConsole(text, kind = "info") {
  const line = document.createElement("span");
  line.className = `console-line ${kind}`;
  line.textContent = `[${stamp()}] ${text}`;
  ui.console.append(line, document.createTextNode("\n"));
  ui.console.scrollTop = ui.console.scrollHeight;
}

function setStatus(element, text, className) {
  element.textContent = text;
  element.className = `status-value ${className}`;
}

function setConnectedUi(connected) {
  const controls = [ui.disconnect, ui.autoScan, ui.scan, ui.arm, ui.disarm,
    ui.heaterApply, ui.heaterDuty, ui.calibrationQuery, ui.commandInput,
    ui.commandSend, ui.dfuQuery, ui.exportRaw, ui.exportMeta,
    ui.calibrationQuantity, ui.calibrationChannel, ui.calibrationReference,
    ui.calibrationNote, ui.calibrationCapture];
  controls.forEach((control) => { control.disabled = !connected; });
  ui.connect.disabled = connected;
  ui.importCalibration.disabled = false;

  if (connected) {
    ui.connectionSummary.textContent = "USB · 브라우저 연결됨";
    setStatus(ui.usbStatus, "연결됨", "status-blue");
    ui.usbDetail.textContent = "ThermalEq Control 응답 대기";
  } else {
    ui.connectionSummary.textContent = "USB · 연결 안 됨";
    setStatus(ui.usbStatus, "연결 안 됨", "status-muted");
    ui.usbDetail.textContent = "ThermalEq Control 포트를 선택하세요";
  }
}

function setInterlock(mode, detail) {
  const alert = mode === "alert";
  ui.interlockBanner.classList.toggle("is-alert", alert);
  ui.interlockBanner.classList.toggle("is-safe", !alert);
  ui.interlockState.textContent = alert ? "히터 인터록: 차단" : "히터 출력: 대기";
  ui.interlockBanner.querySelector("span").textContent = detail;
  ui.interlockDetail.textContent = detail;
  ui.footerSafety.textContent = alert ? "인터록: 차단" : "인터록: 대기";
}

function updateHeaterOutput() {
  ui.heaterOutput.textContent = `${Number(ui.heaterDuty.value).toFixed(1)}%`;
}

function cleanCommand(value) {
  return value.replace(/[\r\n]+/g, "").trim();
}

async function sendCommand(command) {
  const safeCommand = cleanCommand(command);
  if (!safeCommand) {
    return;
  }
  if (!state.writer) {
    appendConsole("TX 거부: 제어 포트가 연결되지 않았습니다.", "err");
    return;
  }
  try {
    await state.writer.write(new TextEncoder().encode(`${safeCommand}\r\n`));
    appendConsole(`TX  ${safeCommand}`, "tx");
  } catch (error) {
    appendConsole(`TX 오류: ${error.message}`, "err");
  }
}

function parseKeyValues(line) {
  const values = {};
  line.split(",").slice(1).forEach((field) => {
    const splitAt = field.indexOf("=");
    if (splitAt > 0) {
      values[field.slice(0, splitAt)] = field.slice(splitAt + 1);
    }
  });
  return values;
}

function channelRow(channel) {
  return document.querySelector(`tr[data-channel="${channel}"]`);
}

function updateChannel(channel, raw, millivolts, status, statusClass = "is-ready") {
  const row = channelRow(channel);
  if (!row) {
    return;
  }
  row.querySelector(".raw").textContent = Number.isFinite(raw) ? String(raw) : "—";
  row.querySelector(".mv").textContent = Number.isFinite(millivolts) ? `${millivolts} mV` : "—";
  const stateCell = row.querySelector(".channel-state");
  stateCell.textContent = status;
  stateCell.className = `channel-state ${statusClass}`;
}

function handleAdc(values, line) {
  const sample = { receivedAt: new Date().toISOString(), raw: {}, nominalMv: {}, line };
  const saturation = values.INTERLOCK === "SATURATION";
  let complete = true;

  CHANNELS.forEach((channel) => {
    const raw = Number(values[channel.id]);
    const millivolts = Number(values[`${channel.id}_MV_NOM`]);
    if (!Number.isFinite(raw) || !Number.isFinite(millivolts)) {
      complete = false;
      updateChannel(channel.id, NaN, NaN, "응답 불완전", "is-alert");
      return;
    }
    sample.raw[channel.id] = raw;
    sample.nominalMv[channel.id] = millivolts;
    updateChannel(channel.id, raw, millivolts,
      saturation ? "포화 감지" : "원시값 수신 · 미보정",
      saturation ? "is-alert" : "is-ready");
  });

  if (!complete) {
    setStatus(ui.adcStatus, "응답 오류", "status-red");
    ui.adcDetail.textContent = "일부 ADC 필드가 없습니다.";
    return;
  }

  state.samples.push(sample);
  if (state.samples.length > 240) {
    state.samples.shift();
  }
  ui.sampleCount.textContent = `${state.samples.length} samples`;
  drawTrend();

  if (saturation) {
    setStatus(ui.adcStatus, "포화 인터록", "status-red");
    ui.adcDetail.textContent = "원시값을 보존했고 히터가 차단되었습니다.";
    setInterlock("alert", "ADC 포화 감지 · 히터 PWM 차단 · 배선/범위를 점검하세요.");
  } else {
    setStatus(ui.adcStatus, "원시 스캔 완료", "status-blue");
    ui.adcDetail.textContent = "핀 전압은 명목값 · 물리 범위/단위는 미보정";
    setInterlock("normal", "원시 스캔 완료 · 물리 입력 범위와 환산 계수는 아직 미검증입니다.");
    completePendingCalibrationCapture(sample);
  }
  updateHostCalibrationPreview(sample);
}

function calibrationKey(quantity, channel) {
  return `${quantity}:${channel}`;
}

function selectedCalibration() {
  return {
    quantity: ui.calibrationQuantity.value,
    channel: ui.calibrationChannel.value,
  };
}

function selectedCalibrationSession(create = true) {
  const { quantity, channel } = selectedCalibration();
  const key = calibrationKey(quantity, channel);
  if (!state.calibration.sessions[key] && create) {
    state.calibration.sessions[key] = {
      quantity,
      channel,
      model: "linear",
      points: [],
      fit: null,
    };
  }
  return state.calibration.sessions[key] || null;
}

function setCalibrationCaptureStatus(message, className = "") {
  ui.calibrationCaptureStatus.textContent = message;
  ui.calibrationCaptureStatus.className = className;
}

function formatCalibrationNumber(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return Number(value.toPrecision(6)).toString();
}

function selectedChannelSignal(channelId) {
  return CHANNELS.find((channel) => channel.id === channelId)?.signal || "unknown";
}

function resetHostCalibrationPreview(quantity) {
  const isCurrent = quantity === "current";
  const status = isCurrent ? ui.currentStatus : ui.temperatureStatus;
  const card = status.closest(".status-card");
  setStatus(status, "보정 대기", "status-amber");
  card.querySelector("span").textContent = isCurrent
    ? "ADC 전달함수 미등록"
    : "TSEP / 기준온도 데이터 필요";
}

function renderCalibrationPoints(session) {
  ui.calibrationPointBody.textContent = "";
  if (session.points.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "empty-table";
    cell.textContent = "아직 수집된 보정점이 없습니다.";
    row.append(cell);
    ui.calibrationPointBody.append(row);
    return;
  }

  const unit = CALIBRATION_UNITS[session.quantity];
  session.points.forEach((point, index) => {
    const row = document.createElement("tr");
    const values = [
      String(index + 1),
      new Date(point.capturedAt).toLocaleTimeString("ko-KR", { hour12: false }),
      point.channel,
      String(point.rawCode),
      `${point.nominalMillivolts} mV`,
      `${formatCalibrationNumber(point.referenceValue)} ${unit}`,
      point.note || "—",
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    const removeCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "point-delete";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => {
      session.points.splice(index, 1);
      session.fit = null;
      if (state.calibration.activeFits[session.quantity] === calibrationKey(session.quantity, session.channel)) {
        state.calibration.activeFits[session.quantity] = null;
        resetHostCalibrationPreview(session.quantity);
      }
      setCalibrationCaptureStatus("보정점은 세션 표에서만 삭제되었습니다. 수신 원문은 별도 raw 로그에 남아 있습니다.");
      renderCalibration();
    });
    removeCell.append(removeButton);
    row.append(removeCell);
    ui.calibrationPointBody.append(row);
  });
}

function renderCalibrationFit(session) {
  const minimum = session.model === "quadratic" ? 3 : 2;
  const unit = CALIBRATION_UNITS[session.quantity];
  ui.calibrationModel.value = session.model;
  ui.calibrationModel.disabled = session.points.length === 0;
  ui.calibrationPrerequisite.textContent = `필수 조건: ${session.points.length} / ${minimum} 점`;
  ui.calibrationFit.disabled = session.points.length < minimum;
  if (!session.fit) {
    ui.calibrationEquation.textContent = "계수: —";
    ui.calibrationMaxError.textContent = "—";
    ui.calibrationMae.textContent = "—";
    ui.calibrationRmse.textContent = "—";
    return;
  }

  ui.calibrationEquation.textContent = session.fit.equation;
  ui.calibrationMaxError.textContent = `${formatCalibrationNumber(session.fit.maxAbsError)} ${unit}`;
  ui.calibrationMae.textContent = `${formatCalibrationNumber(session.fit.mae)} ${unit}`;
  ui.calibrationRmse.textContent = `${formatCalibrationNumber(session.fit.rmse)} ${unit}`;
}

function renderCalibration() {
  const session = selectedCalibrationSession();
  const unit = CALIBRATION_UNITS[session.quantity];
  ui.calibrationReferenceUnit.textContent = unit;
  ui.calibrationSessionStatus.textContent = `${session.quantity === "current" ? "전류" : "온도"} · ${session.channel} · ${session.points.length} 점`;
  renderCalibrationPoints(session);
  renderCalibrationFit(session);
  const canExport = session.points.length > 0;
  ui.exportCalibrationJson.disabled = !canExport;
  ui.exportCalibrationCsv.disabled = !canExport;
  drawCalibrationScatter();
}

function startCalibrationCapture() {
  if (!state.connected) {
    setCalibrationCaptureStatus("제어 포트를 먼저 연결하세요.", "is-error");
    return;
  }
  const referenceValue = Number(ui.calibrationReference.value);
  if (!Number.isFinite(referenceValue)) {
    setCalibrationCaptureStatus("검증된 기준 계측값을 숫자로 입력하세요.", "is-error");
    return;
  }
  if (state.calibration.pendingCapture) {
    setCalibrationCaptureStatus("기존 ADC 캡처 응답을 기다리는 중입니다.", "is-error");
    return;
  }
  if (ui.autoScan.checked) {
    ui.autoScan.checked = false;
    setAutoScan(false);
  }
  const session = selectedCalibrationSession();
  state.calibration.pendingCapture = {
    key: calibrationKey(session.quantity, session.channel),
    quantity: session.quantity,
    channel: session.channel,
    referenceValue,
    note: ui.calibrationNote.value.trim(),
    requestedAt: new Date().toISOString(),
  };
  setCalibrationCaptureStatus("ADC? 요청 전송됨 — 해당 응답을 수신하면 보정점으로 저장합니다.");
  void sendCommand("ADC?");
}

function completePendingCalibrationCapture(sample) {
  const pending = state.calibration.pendingCapture;
  if (!pending) {
    return;
  }
  const rawCode = sample.raw[pending.channel];
  const nominalMillivolts = sample.nominalMv[pending.channel];
  if (!Number.isFinite(rawCode) || !Number.isFinite(nominalMillivolts)) {
    state.calibration.pendingCapture = null;
    setCalibrationCaptureStatus("선택 채널이 ADC 응답에 없어 보정점을 저장하지 않았습니다.", "is-error");
    return;
  }
  const session = state.calibration.sessions[pending.key];
  if (!session) {
    state.calibration.pendingCapture = null;
    setCalibrationCaptureStatus("보정 세션을 찾을 수 없어 점을 저장하지 않았습니다.", "is-error");
    return;
  }
  session.points.push({
    capturedAt: sample.receivedAt,
    channel: pending.channel,
    rawCode,
    nominalMillivolts,
    referenceValue: pending.referenceValue,
    note: pending.note,
    rawLine: sample.line,
  });
  session.fit = null;
  if (state.calibration.activeFits[pending.quantity] === pending.key) {
    state.calibration.activeFits[pending.quantity] = null;
    resetHostCalibrationPreview(pending.quantity);
  }
  state.calibration.pendingCapture = null;
  ui.calibrationReference.value = "";
  ui.calibrationNote.value = "";
  setCalibrationCaptureStatus("원시 ADC 응답과 기준 계측값을 한 보정점으로 저장했습니다.", "is-success");
  appendConsole(`보정점 저장: ${pending.quantity}, ${pending.channel}, raw=${rawCode}, reference=${pending.referenceValue}`);
  renderCalibration();
}

function fitMetrics(points, predict) {
  const residuals = points.map((point) => point.referenceValue - predict(point.rawCode));
  const absolute = residuals.map((value) => Math.abs(value));
  return {
    maxAbsError: Math.max(...absolute),
    mae: absolute.reduce((sum, value) => sum + value, 0) / absolute.length,
    rmse: Math.sqrt(residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length),
  };
}

function fitLinear(points, unit) {
  const xMean = points.reduce((sum, point) => sum + point.rawCode, 0) / points.length;
  const yMean = points.reduce((sum, point) => sum + point.referenceValue, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.rawCode - xMean) ** 2, 0);
  if (denominator === 0) {
    throw new Error("서로 다른 원시 ADC 값이 최소 두 개 필요합니다.");
  }
  const a = points.reduce((sum, point) => sum + (point.rawCode - xMean) * (point.referenceValue - yMean), 0) / denominator;
  const b = yMean - a * xMean;
  const predict = (rawCode) => a * rawCode + b;
  return {
    model: "linear",
    coefficients: { a, b },
    equation: `y = ${formatCalibrationNumber(a)} × raw + ${formatCalibrationNumber(b)} ${unit}`,
    ...fitMetrics(points, predict),
  };
}

function solve3x3(matrix, vector) {
  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    if (Math.abs(augmented[pivot][column]) < 1e-12) {
      return null;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    for (let value = column; value <= 3; value += 1) {
      augmented[column][value] /= divisor;
    }
    for (let row = 0; row < 3; row += 1) {
      if (row === column) {
        continue;
      }
      const factor = augmented[row][column];
      for (let value = column; value <= 3; value += 1) {
        augmented[row][value] -= factor * augmented[column][value];
      }
    }
  }
  return augmented.map((row) => row[3]);
}

function fitQuadratic(points, unit) {
  const mean = points.reduce((sum, point) => sum + point.rawCode, 0) / points.length;
  const variance = points.reduce((sum, point) => sum + (point.rawCode - mean) ** 2, 0) / points.length;
  const scale = Math.sqrt(variance);
  if (scale < 1e-9) {
    throw new Error("2차 피팅에는 서로 다른 원시 ADC 값이 최소 세 개 필요합니다.");
  }
  const normalized = points.map((point) => ({ ...point, z: (point.rawCode - mean) / scale }));
  const sums = normalized.reduce((accumulator, point) => {
    const z2 = point.z * point.z;
    accumulator.z += point.z;
    accumulator.z2 += z2;
    accumulator.z3 += z2 * point.z;
    accumulator.z4 += z2 * z2;
    accumulator.y += point.referenceValue;
    accumulator.zy += point.z * point.referenceValue;
    accumulator.z2y += z2 * point.referenceValue;
    return accumulator;
  }, { z: 0, z2: 0, z3: 0, z4: 0, y: 0, zy: 0, z2y: 0 });
  const solution = solve3x3(
    [[sums.z4, sums.z3, sums.z2], [sums.z3, sums.z2, sums.z], [sums.z2, sums.z, normalized.length]],
    [sums.z2y, sums.zy, sums.y],
  );
  if (!solution) {
    throw new Error("선택한 점으로는 안정적인 2차 피팅을 계산할 수 없습니다.");
  }
  const [qa, qb, qc] = solution;
  const a = qa / (scale * scale);
  const b = qb / scale - (2 * qa * mean) / (scale * scale);
  const c = qc - (qb * mean) / scale + (qa * mean * mean) / (scale * scale);
  const predict = (rawCode) => a * rawCode * rawCode + b * rawCode + c;
  return {
    model: "quadratic",
    coefficients: { a, b, c },
    equation: `y = ${formatCalibrationNumber(a)} × raw² + ${formatCalibrationNumber(b)} × raw + ${formatCalibrationNumber(c)} ${unit}`,
    ...fitMetrics(points, predict),
  };
}

function predictCalibrationFit(fit, rawCode) {
  if (fit.model === "quadratic") {
    return fit.coefficients.a * rawCode * rawCode + fit.coefficients.b * rawCode + fit.coefficients.c;
  }
  return fit.coefficients.a * rawCode + fit.coefficients.b;
}

function runCalibrationFit() {
  const session = selectedCalibrationSession();
  const required = session.model === "quadratic" ? 3 : 2;
  if (session.points.length < required) {
    setCalibrationCaptureStatus(`${session.model === "quadratic" ? "2차" : "선형"} 피팅에는 ${required}점 이상이 필요합니다.`, "is-error");
    return;
  }
  try {
    const unit = CALIBRATION_UNITS[session.quantity];
    const fitted = session.model === "quadratic"
      ? CalibrationCore.fitQuadratic(session.points)
      : CalibrationCore.fitLinear(session.points);
    session.fit = {
      ...fitted,
      equation: fitted.model === "quadratic"
        ? `y = ${formatCalibrationNumber(fitted.coefficients.a)} × raw² + ${formatCalibrationNumber(fitted.coefficients.b)} × raw + ${formatCalibrationNumber(fitted.coefficients.c)} ${unit}`
        : `y = ${formatCalibrationNumber(fitted.coefficients.a)} × raw + ${formatCalibrationNumber(fitted.coefficients.b)} ${unit}`,
    };
    state.calibration.activeFits[session.quantity] = calibrationKey(session.quantity, session.channel);
    setCalibrationCaptureStatus("피팅 결과를 호스트 미리보기 및 JSON 내보내기에 준비했습니다. 펌웨어 제어에는 반영되지 않습니다.", "is-success");
    appendConsole(`보정 피팅 완료: ${session.quantity}, ${session.channel}, ${session.model}`);
    const latestSample = state.samples[state.samples.length - 1];
    if (latestSample) {
      updateHostCalibrationPreview(latestSample);
    }
    renderCalibration();
  } catch (error) {
    session.fit = null;
    setCalibrationCaptureStatus(`피팅 실패: ${error.message}`, "is-error");
    renderCalibration();
  }
}

function activeCalibrationSession(quantity) {
  const key = state.calibration.activeFits[quantity];
  const session = key ? state.calibration.sessions[key] : null;
  return session?.fit ? session : null;
}

function updateHostCalibrationPreview(sample) {
  ["current", "temperature"].forEach((quantity) => {
    const session = activeCalibrationSession(quantity);
    if (!session || !Number.isFinite(sample.raw[session.channel])) {
      return;
    }
    const estimate = CalibrationCore.predict(session.fit, sample.raw[session.channel]);
    const isCurrent = quantity === "current";
    const status = isCurrent ? ui.currentStatus : ui.temperatureStatus;
    const card = status.closest(".status-card");
    setStatus(status, "호스트 미리보기", "status-green");
    card.querySelector("span").textContent = `${session.channel}: ${formatCalibrationNumber(estimate)} ${CALIBRATION_UNITS[quantity]} · 펌웨어 제어 미사용`;
  });
}

function drawCalibrationScatter() {
  const canvas = ui.calibrationScatter;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width || canvas.width));
  const height = Math.max(1, Math.floor(rect.height || canvas.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fcfdff";
  context.fillRect(0, 0, width, height);
  const padding = { left: 48, right: 16, top: 14, bottom: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.strokeStyle = "#d9e0e8";
  context.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const x = padding.left + (plotWidth * index / 4);
    const y = padding.top + (plotHeight * index / 4);
    context.beginPath(); context.moveTo(x, padding.top); context.lineTo(x, height - padding.bottom); context.stroke();
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
  }
  context.fillStyle = "#5d6978";
  context.font = "11px Consolas, monospace";
  context.fillText("raw ADC counts", width - 105, height - 8);
  const session = selectedCalibrationSession();
  const unit = CALIBRATION_UNITS[session.quantity];
  context.fillText(`reference ${unit}`, 5, padding.top + 4);
  if (session.points.length === 0) {
    context.font = "13px Malgun Gothic, sans-serif";
    context.fillText("원시 ADC 응답과 기준 계측값을 저장하면 보정점이 표시됩니다.", padding.left + 12, padding.top + 28);
    return;
  }
  let minY = Math.min(...session.points.map((point) => point.referenceValue));
  let maxY = Math.max(...session.points.map((point) => point.referenceValue));
  if (minY === maxY) {
    const margin = Math.max(1, Math.abs(minY) * 0.05);
    minY -= margin;
    maxY += margin;
  } else {
    const margin = (maxY - minY) * 0.08;
    minY -= margin;
    maxY += margin;
  }
  const xFor = (rawCode) => padding.left + plotWidth * rawCode / 4095;
  const yFor = (reference) => padding.top + plotHeight * (1 - (reference - minY) / (maxY - minY));
  context.fillText(formatCalibrationNumber(maxY), 5, padding.top + 15);
  context.fillText(formatCalibrationNumber(minY), 5, height - padding.bottom);
  if (session.fit) {
    context.strokeStyle = "#b46000";
    context.lineWidth = 1.5;
    context.beginPath();
    for (let index = 0; index <= 80; index += 1) {
      const rawCode = 4095 * index / 80;
      const x = xFor(rawCode);
      const y = yFor(predictCalibrationFit(session.fit, rawCode));
      if (index === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
    }
    context.stroke();
  }
  session.points.forEach((point) => {
    context.beginPath();
    context.fillStyle = "#0d5bd7";
    context.arc(xFor(point.rawCode), yFor(point.referenceValue), 4, 0, Math.PI * 2);
    context.fill();
  });
}

function handleStatus(values) {
  state.lastStatus = values;
  if (values.ARM === "1") {
    setInterlock("normal", `히터 ARM 상태 · 수동 출력 상한 ${Number(values.CAP_PERMILLE || 100) / 10}%`);
    ui.interlockState.textContent = "히터 출력: ARM";
  } else if (values.ADC === "SATURATION_LOCKOUT") {
    setInterlock("alert", "ADC 포화 인터록 · 재무장 전 ADC?로 범위를 다시 확인하세요.");
  }
}

function handleFirmwareInfo(values) {
  state.firmware = values.FW || null;
  ui.firmwareSummary.textContent = state.firmware ? `DFU · v${state.firmware}` : "DFU · 버전 미확인";
  setStatus(ui.currentStatus, "보정 대기", "status-amber");
  setStatus(ui.temperatureStatus, "보정 대기", "status-amber");
  if (values.ADC === "RAW_UNCALIBRATED") {
    setStatus(ui.adcStatus, "원시 측정 활성", "status-blue");
    ui.adcDetail.textContent = "ADC?를 눌러 첫 원시 스캔을 실행하세요";
  }
}

function handleLine(line) {
  if (!line) {
    return;
  }
  appendConsole(`RX  ${line}`, line.startsWith("ERR,") ? "err" : "info");
  const values = parseKeyValues(line);
  if (line.startsWith("INFO,")) {
    handleFirmwareInfo(values);
  } else if (line.startsWith("STATUS,")) {
    handleStatus(values);
  } else if (line.startsWith("ADC,")) {
    handleAdc(values, line);
  } else if (line.startsWith("CAL,")) {
    ui.channelMap.textContent = values.MAP || "펌웨어가 채널 맵을 반환하지 않았습니다.";
  } else if (line.startsWith("OK,ARMED")) {
    setInterlock("normal", "히터 ARM 상태 · 출력은 10% 상한 내에서만 적용됩니다.");
    ui.interlockState.textContent = "히터 출력: ARM";
  } else if (line.startsWith("OK,DISARMED")) {
    setInterlock("normal", "히터 DISARM 상태 · PWM 출력이 0으로 설정되었습니다.");
  } else if (line.startsWith("ERR,ADC_SATURATION_LOCKOUT")) {
    setInterlock("alert", "ADC 포화 인터록 · ADC?로 정상 범위를 먼저 확인하세요.");
  }
}

function processIncomingText(text) {
  state.rawRx += text;
  const joined = state.partialLine + text;
  const lines = joined.split(/\r?\n/);
  state.partialLine = lines.pop();
  lines.forEach(handleLine);
}

async function readLoop() {
	const decoder = new TextDecoder();
	try {
		while (state.port && state.port.readable) {
			const reader = state.port.readable.getReader();
			state.reader = reader;
			try {
				while (true) {
					const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            processIncomingText(decoder.decode(value, { stream: true }));
          }
				}
			} finally {
				if (state.reader === reader) {
					state.reader = null;
				}
				try {
					reader.releaseLock();
				} catch (_) {
					/* disconnect() may already have released this reader. */
				}
      }
      break;
    }
  } catch (error) {
    if (state.connected) {
      appendConsole(`RX 오류: ${error.message}`, "err");
    }
  }
}

async function connect() {
  if (!("serial" in navigator)) {
    appendConsole("이 브라우저는 Web Serial API를 제공하지 않습니다. Chromium 기반 HTTPS 환경을 사용하세요.", "err");
    return;
  }
  try {
    appendConsole("ThermalEq Control USB CDC 포트를 선택하세요. ThermalEq DFU 포트는 선택하지 마세요.");
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });
    state.port = port;
    state.writer = port.writable.getWriter();
    state.connected = true;
    state.openedAt = new Date().toISOString();
    setConnectedUi(true);
    appendConsole("제어 포트 연결됨. INFO? 및 STATUS?를 요청합니다.");
    void readLoop();
    await sendCommand("INFO?");
    await sendCommand("STATUS?");
  } catch (error) {
    appendConsole(`연결 실패: ${error.message}`, "err");
    await disconnect();
  }
}

async function disconnect() {
  window.clearInterval(state.autoTimer);
  state.autoTimer = null;
  ui.autoScan.checked = false;
	try {
		if (state.reader) {
			const reader = state.reader;
			await reader.cancel();
			try {
				reader.releaseLock();
			} catch (_) {
				/* readLoop() released it after cancellation. */
			}
			if (state.reader === reader) {
				state.reader = null;
			}
    }
    if (state.writer) {
      state.writer.releaseLock();
      state.writer = null;
    }
    if (state.port) {
      await state.port.close();
    }
  } catch (error) {
    appendConsole(`연결 해제 경고: ${error.message}`, "err");
  } finally {
    state.port = null;
    state.reader = null;
    state.connected = false;
    setConnectedUi(false);
    appendConsole("제어 포트 연결 해제됨.");
  }
}

function setAutoScan(enabled) {
  window.clearInterval(state.autoTimer);
  state.autoTimer = null;
  if (enabled && state.connected) {
    state.autoTimer = window.setInterval(() => { void sendCommand("ADC?"); }, 2000);
    appendConsole("2초 자동 ADC 스캔을 시작했습니다.");
    void sendCommand("ADC?");
  } else {
    appendConsole("자동 ADC 스캔을 중지했습니다.");
  }
}

function drawTrend() {
  const canvas = ui.trendCanvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fcfdff";
  context.fillRect(0, 0, width, height);

  const padding = { left: 42, right: 16, top: 16, bottom: 27 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  context.strokeStyle = "#d9e0e8";
  context.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (plotHeight * i / 4);
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
  }
  context.fillStyle = "#5d6978";
  context.font = "11px Consolas, monospace";
  context.fillText("4095", 4, padding.top + 4);
  context.fillText("0", 22, height - padding.bottom + 4);
  context.fillText("sample", width - 52, height - 7);

  if (state.samples.length === 0) {
    context.fillStyle = "#7a8795";
    context.font = "13px Malgun Gothic, sans-serif";
    context.fillText("ADC? 응답을 수신하면 원시값만 여기에 그립니다.", padding.left + 12, padding.top + 28);
    return;
  }

  const visible = state.samples.slice(-120);
  CHANNELS.forEach((channel) => {
    context.strokeStyle = channel.color;
    context.lineWidth = 1.7;
    context.beginPath();
    visible.forEach((sample, index) => {
      const raw = sample.raw[channel.id];
      const x = padding.left + (visible.length === 1 ? 0 : plotWidth * index / (visible.length - 1));
      const y = padding.top + plotHeight * (1 - raw / 4095);
      if (index === 0) { context.moveTo(x, y); } else { context.lineTo(x, y); }
    });
    context.stroke();
  });
}

function downloadText(filename, body, type) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRaw() {
  if (!state.rawRx) {
    appendConsole("내보낼 수신 원문이 없습니다.", "err");
    return;
  }
  downloadText(`thermal-eq-usb-rx-${fileStamp()}.txt`, state.rawRx, "text/plain;charset=utf-8");
  appendConsole("수신 원문을 내보냈습니다. 분석용 파일은 이 파일과 분리해서 보관하세요.");
}

function exportMetadata() {
  const metadata = {
    schema: "thermal-eq-web-serial-metadata/v1",
    exportedAt: new Date().toISOString(),
    openedAt: state.openedAt,
    firmware: state.firmware,
    transport: { api: "Web Serial", baudRate: 115200, selectedPort: "user-selected ThermalEq Control" },
    sampleCount: state.samples.length,
    rawProtocolFile: "exported separately; no raw values are copied into this metadata file",
    physicalConversion: "not enabled; current and temperature calibration required",
  };
  downloadText(`thermal-eq-session-metadata-${fileStamp()}.json`, `${JSON.stringify(metadata, null, 2)}\n`, "application/json");
  appendConsole("세션 메타데이터를 별도 파일로 내보냈습니다.");
}

function calibrationExportPayload(session) {
  return {
    schema: "thermal-eq-host-calibration/v1",
    exportedAt: new Date().toISOString(),
    firmwareAtExport: state.firmware,
    quantity: session.quantity,
    unit: CALIBRATION_UNITS[session.quantity],
    channel: session.channel,
    boardSignal: selectedChannelSignal(session.channel),
    model: session.model,
    points: session.points.map((point) => ({ ...point })),
    fit: session.fit ? {
      model: session.fit.model,
      coefficients: { ...session.fit.coefficients },
      equation: session.fit.equation,
      maxAbsError: session.fit.maxAbsError,
      mae: session.fit.mae,
      rmse: session.fit.rmse,
    } : null,
    useBoundary: [
      "Host-side preview and data exchange only.",
      "No calibration coefficient is sent to firmware or applied to heater control.",
      "Preserve the separately exported raw USB protocol log with this file.",
    ],
  };
}

function exportCalibrationJson() {
  const session = selectedCalibrationSession();
  if (session.points.length === 0) {
    setCalibrationCaptureStatus("내보낼 보정점이 없습니다.", "is-error");
    return;
  }
  const filename = `thermal-eq-${session.quantity}-${session.channel}-calibration-${fileStamp()}.json`;
  downloadText(filename, `${JSON.stringify(calibrationExportPayload(session), null, 2)}\n`, "application/json");
  appendConsole(`보정 JSON 내보내기: ${session.quantity}, ${session.channel}, ${session.points.length} points`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCalibrationCsv() {
  const session = selectedCalibrationSession();
  if (session.points.length === 0) {
    setCalibrationCaptureStatus("내보낼 보정점이 없습니다.", "is-error");
    return;
  }
  const headers = ["captured_at", "quantity", "unit", "channel", "board_signal", "raw_code", "nominal_millivolts", "reference_value", "note", "raw_protocol_line"];
  const rows = session.points.map((point) => [
    point.capturedAt,
    session.quantity,
    CALIBRATION_UNITS[session.quantity],
    point.channel,
    selectedChannelSignal(point.channel),
    point.rawCode,
    point.nominalMillivolts,
    point.referenceValue,
    point.note,
    point.rawLine,
  ].map(csvCell).join(","));
  const filename = `thermal-eq-${session.quantity}-${session.channel}-points-${fileStamp()}.csv`;
  downloadText(filename, `${headers.join(",")}\n${rows.join("\n")}\n`, "text/csv;charset=utf-8");
  appendConsole(`보정점 CSV 내보내기: ${session.quantity}, ${session.channel}, ${session.points.length} points`);
}

function setCalibrationSelection(quantity, channel) {
  ui.calibrationQuantity.value = quantity;
  ui.calibrationChannel.value = channel;
  selectedCalibrationSession();
  renderCalibration();
}

async function importCalibrationFile(file) {
  if (!file) {
    return;
  }
  try {
    const imported = JSON.parse(await file.text());
    if (imported.schema !== "thermal-eq-host-calibration/v1") {
      throw new Error("지원하지 않는 보정 JSON 형식입니다.");
    }
    if (!(imported.quantity in CALIBRATION_UNITS) || !CHANNELS.some((channel) => channel.id === imported.channel)) {
      throw new Error("물리량 또는 ADC 채널이 유효하지 않습니다.");
    }
    if (!Array.isArray(imported.points) || imported.points.length === 0) {
      throw new Error("가져올 보정점이 없습니다.");
    }
    const points = imported.points.map((point) => {
      const rawCode = Number(point.rawCode);
      const nominalMillivolts = Number(point.nominalMillivolts);
      const referenceValue = Number(point.referenceValue);
      if (!Number.isFinite(rawCode) || !Number.isFinite(nominalMillivolts) || !Number.isFinite(referenceValue)) {
        throw new Error("보정점에 유효하지 않은 수치가 있습니다.");
      }
      return {
        capturedAt: typeof point.capturedAt === "string" ? point.capturedAt : new Date().toISOString(),
        channel: imported.channel,
        rawCode,
        nominalMillivolts,
        referenceValue,
        note: typeof point.note === "string" ? point.note : "",
        rawLine: typeof point.rawLine === "string" ? point.rawLine : "",
      };
    });
    const key = calibrationKey(imported.quantity, imported.channel);
    state.calibration.sessions[key] = {
      quantity: imported.quantity,
      channel: imported.channel,
      model: imported.model === "quadratic" ? "quadratic" : "linear",
      points,
      fit: null,
    };
    state.calibration.activeFits[imported.quantity] = null;
    resetHostCalibrationPreview(imported.quantity);
    setCalibrationSelection(imported.quantity, imported.channel);
    setCalibrationCaptureStatus("보정점을 가져왔습니다. 현재 브라우저에서 피팅을 다시 실행해 검토하세요.", "is-success");
    appendConsole(`보정 JSON 가져오기: ${imported.quantity}, ${imported.channel}, ${points.length} points`);
  } catch (error) {
    setCalibrationCaptureStatus(`JSON 가져오기 실패: ${error.message}`, "is-error");
  } finally {
    ui.importCalibrationFile.value = "";
  }
}

ui.connect.addEventListener("click", () => { void connect(); });
ui.disconnect.addEventListener("click", () => { void disconnect(); });
ui.scan.addEventListener("click", () => { void sendCommand("ADC?"); });
ui.calibrationQuery.addEventListener("click", () => { void sendCommand("CAL?"); });
ui.dfuQuery.addEventListener("click", () => { void sendCommand("DFU?"); });
ui.arm.addEventListener("click", () => { void sendCommand("ARM,THERMAL_EQ"); });
ui.disarm.addEventListener("click", () => { void sendCommand("DISARM"); });
ui.heaterApply.addEventListener("click", () => {
  const permille = Math.round(Number(ui.heaterDuty.value) * 10);
  void sendCommand(`HEAT,${permille}`);
});
ui.heaterDuty.addEventListener("input", updateHeaterOutput);
ui.autoScan.addEventListener("change", () => { setAutoScan(ui.autoScan.checked); });
ui.clearConsole.addEventListener("click", () => { ui.console.textContent = ""; });
ui.exportRaw.addEventListener("click", exportRaw);
ui.exportMeta.addEventListener("click", exportMetadata);
ui.calibrationQuantity.addEventListener("change", renderCalibration);
ui.calibrationChannel.addEventListener("change", renderCalibration);
ui.calibrationModel.addEventListener("change", () => {
  const session = selectedCalibrationSession();
  session.model = ui.calibrationModel.value;
  session.fit = null;
  if (state.calibration.activeFits[session.quantity] === calibrationKey(session.quantity, session.channel)) {
    state.calibration.activeFits[session.quantity] = null;
    resetHostCalibrationPreview(session.quantity);
  }
  setCalibrationCaptureStatus("피팅 모델이 변경되었습니다. 현재 점으로 피팅을 다시 실행하세요.");
  renderCalibration();
});
ui.calibrationCapture.addEventListener("click", startCalibrationCapture);
ui.calibrationFit.addEventListener("click", runCalibrationFit);
ui.exportCalibrationJson.addEventListener("click", exportCalibrationJson);
ui.exportCalibrationCsv.addEventListener("click", exportCalibrationCsv);
ui.importCalibration.addEventListener("click", () => { ui.importCalibrationFile.click(); });
ui.importCalibrationFile.addEventListener("change", () => { void importCalibrationFile(ui.importCalibrationFile.files[0]); });
ui.commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendCommand(ui.commandInput.value);
});
window.addEventListener("resize", () => { drawTrend(); drawCalibrationScatter(); });

setConnectedUi(false);
setInterlock("normal", "ADC 스캔 전 · 히터는 명시적 ARM 후에만 동작합니다.");
updateHeaterOutput();
drawTrend();
renderCalibration();
if (!("serial" in navigator)) {
  ui.usbDetail.textContent = "이 브라우저는 Web Serial API를 제공하지 않습니다.";
}
