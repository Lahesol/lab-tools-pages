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
    ui.commandSend, ui.dfuQuery, ui.exportRaw, ui.exportMeta];
  controls.forEach((control) => { control.disabled = !connected; });
  ui.connect.disabled = connected;

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
  const sample = { receivedAt: new Date().toISOString(), raw: {}, line };
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
  }
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
ui.commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendCommand(ui.commandInput.value);
});
window.addEventListener("resize", drawTrend);

setConnectedUi(false);
setInterlock("normal", "ADC 스캔 전 · 히터는 명시적 ARM 후에만 동작합니다.");
updateHeaterOutput();
drawTrend();
if (!("serial" in navigator)) {
  ui.usbDetail.textContent = "이 브라우저는 Web Serial API를 제공하지 않습니다.";
}
