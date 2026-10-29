"use strict";

const $ = (id) => document.getElementById(id);
const state = { token: null, connected: false, running: false, points: [], runId: null, imported: false, busy: false, hitPoints: [] };
const COLORS = ["#0f766e", "#cc7020", "#246ba8", "#a84969", "#38804a", "#795eaa"];
const states = { idle: "대기", preparing: "설정 중", running: "측정 중", completed: "완료", stopped: "중지됨", failed: "실패" };

function message(text, error = false) { $("actionStatus").textContent = text; $("actionStatus").dataset.error = String(error); }
function numeric(id) { const value = Number($(id).value); if (!Number.isFinite(value) || $(id).value === "") throw new Error(`${id}: 숫자가 필요합니다.`); return value; }
function config() {
  return { start_v: numeric("startV"), stop_v: numeric("stopV"), step_v: numeric("stepV"), cycles: numeric("cycles"),
    direction: $("direction").value, settle_ms: numeric("settleMs"), readings: numeric("readings"),
    read_interval_ms: numeric("readIntervalMs"), nplc: numeric("nplc"), vds_v: numeric("vdsV"),
    drain_compliance_a: numeric("complianceUa") * 1e-6, current_range_a: numeric("currentRange"),
    terminal: $("terminal").value, gate_polarity: numeric("gatePolarity"), gate_offset_v: numeric("gateOffset"),
    gate_limit_a: numeric("gateLimitMa") * 1e-3, gate_tolerance_v: numeric("gateTolerance"), vds_tolerance_v: numeric("vdsTolerance"),
    light_mode: $("lightMode").value, led_channel: $("ledChannel").value, led_code: numeric("ledCode"),
    reset_ms: numeric("resetMs"), reset_vgs_v: numeric("resetVgs"), reset_dark_ms: numeric("resetDarkMs"),
    device_id: $("deviceId").value, operator: $("operator").value, notes: $("notes").value,
    wiring_confirmed: $("wiringConfirmed").checked };
}

function validatePlan(c) {
  if (c.start_v < -50 || c.start_v > 10 || c.stop_v < -50 || c.stop_v > 10) throw new Error("VGS 범위는 −50~+10 V입니다.");
  if (c.step_v < .001 || c.step_v > 60 || c.cycles < 1 || !Number.isInteger(c.cycles)) throw new Error("스윕 간격과 반복 횟수를 확인하세요.");
  const voltages = [c.start_v, c.stop_v]; if (c.light_mode === "reset_before_cycle") voltages.push(c.reset_vgs_v);
  const magnitudes = voltages.map((v) => (v - c.gate_offset_v) / c.gate_polarity);
  if (magnitudes.some((v) => v < -1e-8 || v > 80 + 1e-8)) throw new Error("현재 극성·오프셋으로 만들 수 없는 VGS입니다. +→source / −→gate, 오프셋 0 V에서는 VGS가 0 V 이하입니다.");
  const n = Math.ceil(Math.abs(c.stop_v - c.start_v) / c.step_v - 1e-9) + 1;
  const total = n * c.cycles * (c.direction === "round_trip" ? 2 : 1);
  if (total > 10000) throw new Error("한 실험은 최대 10,000점입니다.");
  return { total, psu_min_v: Math.min(...magnitudes), psu_max_v: Math.max(...magnitudes) };
}

async function api(path, body) {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json", "X-Transfer-Token": state.token },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  return body === undefined ? result : result.result;
}

async function action(callback) {
  if (state.busy) return;
  state.busy = true; updateButtons();
  try { await callback(); } catch (error) { message(error.message, true); }
  finally { state.busy = false; updateButtons(); }
}

function updateButtons(devices = state.devices || {}) {
  for (const [role, label] of [["gate", "Gate"], ["smu", "Smu"], ["led", "Led"]]) {
    $(`connect${label}`).disabled = !state.connected || state.busy || state.running || Boolean(devices[role]);
    $(`disconnect${label}`).disabled = !state.connected || state.busy || state.running || !devices[role];
  }
  $("discover").disabled = !state.connected || state.busy || state.running;
  $("scanLed").disabled = !state.connected || state.busy || state.running;
  $("startRun").disabled = !state.connected || state.busy || state.running || !devices.gate || !devices.smu || !$("wiringConfirmed").checked;
  $("stopRun").disabled = !state.connected || (!devices.gate && !devices.smu && !devices.led);
  for (const element of $("sweepForm").querySelectorAll("input, select, textarea")) element.disabled = state.running;
  for (const id of ["exportCsv", "exportRaw", "exportEvents", "exportMetadata"]) $(id).disabled = !state.connected || !state.runId || state.imported;
  for (const id of ["exportPlot", "exportJson"]) $(id).disabled = !state.points.length;
  $("liveView").hidden = !state.imported || !state.connected;
}

function fillSelect(element, rows, emptyLabel) {
  const previous = element.value;
  element.replaceChildren(new Option(emptyLabel, ""));
  for (const row of rows) element.add(new Option(row.label, row.value));
  if (rows.some((row) => row.value === previous)) element.value = previous;
}

function formatCurrent(value) {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e-3) return `${(value * 1e3).toPrecision(5)} mA`;
  if (magnitude >= 1e-6) return `${(value * 1e6).toPrecision(5)} µA`;
  if (magnitude >= 1e-9) return `${(value * 1e9).toPrecision(5)} nA`;
  return `${(value * 1e12).toPrecision(5)} pA`;
}

function updateReadings() {
  const last = state.points.at(-1);
  $("lastVgs").textContent = last ? `${last.vgs_set_v.toFixed(3)} V` : "—";
  $("lastCurrent").textContent = last ? formatCurrent(last.current_mean_a) : "—";
  $("lastVds").textContent = last ? `${last.vds_mean_v.toFixed(4)} V` : "—";
  $("lastCount").textContent = last ? String(last.readings) : "—";
  $("pointsTable").replaceChildren();
  for (const point of state.points.slice(-100)) {
    const tr = document.createElement("tr");
    for (const value of [point.point_index, `${point.cycle} · ${point.branch === "forward" ? "정" : "역"}`,
      point.vgs_set_v.toFixed(3), point.current_mean_a.toExponential(5), point.current_std_a.toExponential(3), point.vds_mean_v.toFixed(4)]) {
      const td = document.createElement("td"); td.textContent = value; tr.append(td);
    }
    $("pointsTable").append(tr);
  }
}

async function poll() {
  try {
    const snapshot = await api("/api/state");
    state.connected = true; state.running = snapshot.running; state.devices = snapshot.instruments;
    if (!state.imported) { state.points = snapshot.points; state.runId = snapshot.status.run_id; updateReadings(); drawPlot(); }
    for (const role of ["gate", "smu", "led"]) {
      const detail = snapshot.instruments[role];
      const text = detail?.identity || detail?.version || (role === "led" ? "선택 사항" : "미연결");
      $(`${role}Status`).textContent = detail ? "연결됨" : text;
      $(`${role}Status`).title = text;
    }
    $("runState").textContent = states[snapshot.status.state] || snapshot.status.state;
    $("progressText").textContent = `${snapshot.status.done} / ${snapshot.status.total}`;
    $("progress").max = snapshot.status.total || 1; $("progress").value = snapshot.status.done;
    $("bridgeStatus").textContent = "계측 브리지 연결됨";
    $("eventLog").textContent = snapshot.logs.map((row) => `${row.at} ${row.role} ${row.kind}: ${row.text}`).join("\n");
    $("runId").textContent = state.imported ? `저장 곡선 · ${state.importName}` : state.runId ? `Run ${state.runId}` : "실험 기록 없음";
    if (snapshot.status.error && snapshot.status.error !== state.lastError) { message(snapshot.status.error, true); state.lastError = snapshot.status.error; }
  } catch (error) {
    if (state.connected) message(`브리지 연결이 끊겼습니다. 장비 출력 상태를 확인하세요. ${error.message}`, true);
    state.connected = false; $("bridgeStatus").textContent = "계측 브리지 미연결";
  }
  updateButtons();
}

function drawPlot() {
  const canvas = $("curvePlot"); const rect = canvas.getBoundingClientRect(); if (rect.width < 20) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height, pad = { left: 74, right: 20, top: 20, bottom: 52 };
  const xKey = $("xAxis").value, yKey = $("statistic").value, log = $("yAxis").value === "log";
  const rows = state.points.filter((row) => row.valid !== false && (!log || Math.abs(row[yKey]) > 0));
  const yValue = (row) => log ? Math.log10(Math.abs(row[yKey])) : row[yKey];
  let xmin = 0, xmax = 1, ymin = 0, ymax = 1;
  if (rows.length) {
    xmin = Infinity; xmax = -Infinity; ymin = log ? Infinity : 0; ymax = log ? -Infinity : 0;
    for (const row of rows) { xmin = Math.min(xmin, row[xKey]); xmax = Math.max(xmax, row[xKey]); ymin = Math.min(ymin, yValue(row)); ymax = Math.max(ymax, yValue(row)); }
    if (xmin === xmax) { xmin -= .5; xmax += .5; }
    if (ymin === ymax) { const margin = log ? .5 : Math.max(Math.abs(ymin) * .1, 1e-12); ymin -= margin; ymax += margin; }
    const extra = (ymax - ymin) * .08; ymin -= extra; ymax += extra;
  }
  const px = (x) => pad.left + (x - xmin) / (xmax - xmin) * (w - pad.left - pad.right);
  const py = (y) => h - pad.bottom - (y - ymin) / (ymax - ymin) * (h - pad.top - pad.bottom);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); ctx.font = "11px Malgun Gothic, Segoe UI, sans-serif";
  for (let i = 0; i <= 5; i++) {
    const x = xmin + i * (xmax - xmin) / 5, y = ymin + i * (ymax - ymin) / 5;
    ctx.strokeStyle = "#e1e8e9"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(x), pad.top); ctx.lineTo(px(x), h - pad.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, py(y)); ctx.lineTo(w - pad.right, py(y)); ctx.stroke();
    ctx.fillStyle = "#61717e"; ctx.textAlign = "center"; ctx.fillText(x.toFixed(1), px(x), h - pad.bottom + 19);
    ctx.textAlign = "right"; ctx.fillText(log ? `1e${y.toFixed(1)}` : y.toExponential(1), pad.left - 10, py(y) + 4);
  }
  ctx.strokeStyle = "#83959e"; ctx.strokeRect(pad.left, pad.top, w - pad.left - pad.right, h - pad.top - pad.bottom);
  ctx.fillStyle = "#14212b"; ctx.textAlign = "center"; ctx.font = "12px Malgun Gothic, Segoe UI, sans-serif";
  ctx.fillText(xKey === "time_s" ? "Time (s)" : xKey === "vgs_inferred_v" ? "VGS inferred readback (V)" : "VGS setpoint (V)", (w + pad.left - pad.right) / 2, h - 8);
  ctx.save(); ctx.translate(14, (h - pad.bottom + pad.top) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(log ? "|Drain current| (A)" : "Drain current (A)", 0, 0); ctx.restore();
  $("legend").replaceChildren(); state.hitPoints = [];
  if (!rows.length) { ctx.fillStyle = "#61717e"; ctx.fillText("측정 데이터 없음", (w + pad.left) / 2, h / 2); return; }
  const groups = new Map();
  for (const row of rows) { const key = `${row.cycle}:${row.branch}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
  ctx.save(); ctx.beginPath(); ctx.rect(pad.left, pad.top, w - pad.left - pad.right, h - pad.top - pad.bottom); ctx.clip();
  let groupIndex = 0;
  for (const [key, group] of groups) {
    const color = COLORS[groupIndex++ % COLORS.length]; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
    ctx.beginPath(); group.forEach((row, index) => { const x = px(row[xKey]), y = py(yValue(row)); index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); state.hitPoints.push({ x, y, row }); }); ctx.stroke();
    const stride = Math.max(1, Math.floor(group.length / 500));
    for (let i = 0; i < group.length; i += stride) {
      const row = group[i], x = px(row[xKey]), y = py(yValue(row)); ctx.beginPath(); ctx.arc(x, y, 2.3, 0, Math.PI * 2); ctx.fill();
      if ($("errorBars").checked && !log && row.current_std_a > 0) {
        ctx.globalAlpha = .45; ctx.lineWidth = 1; const lo = py(row[yKey] - row.current_std_a), hi = py(row[yKey] + row.current_std_a);
        ctx.beginPath(); ctx.moveTo(x, lo); ctx.lineTo(x, hi); ctx.moveTo(x - 3, lo); ctx.lineTo(x + 3, lo); ctx.moveTo(x - 3, hi); ctx.lineTo(x + 3, hi); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const item = document.createElement("span"), swatch = document.createElement("i"); swatch.style.background = color; item.append(swatch);
    const [cycle, branch] = key.split(":"); item.append(document.createTextNode(`${cycle}회 · ${branch === "forward" ? "시작→종료" : "종료→시작"}`)); $("legend").append(item);
  }
  ctx.restore();
}

function download(text, name, type) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function downloadRun(file) { const a = document.createElement("a"); a.href = `/api/download?run=${encodeURIComponent(state.runId)}&file=${encodeURIComponent(file)}`; a.click(); }

$("discover").addEventListener("click", () => action(async () => {
  const result = await api("/api/instruments"); $("visaResources").replaceChildren();
  for (const resource of result.visa) $("visaResources").append(new Option(resource, resource));
  fillSelect($("smuPort"), result.serial.map((row) => ({ value: row.port, label: `${row.port} · ${row.description}` })), "포트 선택");
  message(result.errors.length ? result.errors.join(" | ") : `VISA ${result.visa.length}개 · RS-232 ${result.serial.length}개`, result.errors.length > 0);
}));
$("connectGate").addEventListener("click", () => action(async () => { await api("/api/connect", { role: "gate", transport: "visa", resource: $("gateResource").value }); message("PWR401ML 연결됨. 출력은 측정 시작 시 설정됩니다."); await poll(); }));
$("connectSmu").addEventListener("click", () => action(async () => { await api("/api/connect", { role: "smu", transport: "serial", port: $("smuPort").value, baud: numeric("smuBaud"), flow: $("smuFlow").value, rx_terminator: $("smuRxEol").value }); message("Keithley 2400 연결됨."); await poll(); }));
for (const [role, label] of [["gate", "Gate"], ["smu", "Smu"], ["led", "Led"]]) $("disconnect" + label).addEventListener("click", () => action(async () => { await api("/api/disconnect", { role }); message(`${role} 연결 해제됨.`); await poll(); }));
$("scanLed").addEventListener("click", () => action(async () => { const rows = await api("/api/led/scan", {}); fillSelect($("ledDevice"), rows.map((row) => ({ value: row.address, label: `${row.name} · ${row.address}` })), "6COLOR 선택"); message(`6COLOR ${rows.length}개`); }));
$("connectLed").addEventListener("click", () => action(async () => { await api("/api/connect", { role: "led", address: $("ledDevice").value }); message("6COLOR 연결됨 · 전체 OFF 확인됨"); await poll(); }));
$("preview").addEventListener("click", () => action(async () => { const c = config(); const result = state.connected ? await api("/api/preview", c) : validatePlan(c); $("previewInfo").textContent = `${result.total}점 · PWR ${result.psu_min_v.toFixed(2)}~${result.psu_max_v.toFixed(2)} V`; message("스윕 범위 확인됨"); }));
$("sweepForm").addEventListener("submit", (event) => { event.preventDefault(); action(async () => { const c = config(); validatePlan(c); await api("/api/start", c); state.imported = false; state.lastError = null; message("측정 시작됨"); await poll(); }); });
$("stopRun").addEventListener("click", async () => { try { message("출력 OFF 요청 중"); await api("/api/stop", {}); message("중지 요청 처리됨. 종료 상태와 통신 기록을 확인하세요."); await poll(); } catch (error) { message(error.message, true); } });
$("lightMode").addEventListener("change", () => { $("resetSettings").hidden = $("lightMode").value !== "reset_before_cycle"; });
for (const id of ["gatePolarity", "gateOffset"]) $(id).addEventListener("input", () => { $("mappingInfo").textContent = `VGS = ${Number($("gatePolarity").value) < 0 ? "−" : "+"}VPWR + ${$("gateOffset").value} V`; $("wiringConfirmed").checked = false; updateButtons(); });
$("wiringConfirmed").addEventListener("change", () => updateButtons());
for (const id of ["xAxis", "yAxis", "statistic", "errorBars"]) $(id).addEventListener("change", () => {
  $("errorBars").disabled = $("yAxis").value === "log";
  drawPlot();
});
$("curvePlot").addEventListener("mousemove", (event) => {
  const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
  let nearest = null, distance = 400;
  for (const point of state.hitPoints) { const d = (x - point.x) ** 2 + (y - point.y) ** 2; if (d < distance) { nearest = point.row; distance = d; } }
  $("cursorInfo").textContent = nearest ? `${nearest.cycle}회 ${nearest.branch} · VGS ${nearest.vgs_set_v.toFixed(4)} V · I ${formatCurrent(nearest.current_mean_a)} · σ ${formatCurrent(nearest.current_std_a)} · VDS ${nearest.vds_mean_v.toFixed(4)} V · N=${nearest.readings}` : "";
});
for (const [id, file] of [["exportCsv", "processed_points.csv"], ["exportRaw", "raw_readings.csv"], ["exportEvents", "raw_events.jsonl"], ["exportMetadata", "metadata.json"]]) $(id).addEventListener("click", () => downloadRun(file));
$("exportJson").addEventListener("click", () => download(JSON.stringify({ format: "smkang-transfer-points-v1", run_id: state.runId, points: state.points }, null, 2), `${state.runId || "saved"}_plot_data.json`, "application/json"));
$("exportPlot").addEventListener("click", () => { const a = document.createElement("a"); a.download = `${state.runId || "saved"}_transfer.png`; a.href = $("curvePlot").toDataURL("image/png"); a.click(); });
$("importJson").addEventListener("click", () => $("jsonFile").click());
$("jsonFile").addEventListener("change", async () => {
  try {
    if (state.running) throw new Error("측정 중에는 저장 곡선을 열 수 없습니다.");
    const file = $("jsonFile").files[0]; if (!file) return; if (file.size > 20 * 1024 * 1024) throw new Error("JSON 파일이 20 MiB를 초과합니다.");
    const data = JSON.parse(await file.text()); if (data.format !== "smkang-transfer-points-v1" || !Array.isArray(data.points) || data.points.length > 10000) throw new Error("지원하는 곡선 JSON 형식이 아닙니다.");
    const keys = ["point_index", "cycle", "vgs_set_v", "vgs_inferred_v", "time_s", "current_mean_a", "current_median_a", "current_std_a", "vds_mean_v", "readings"];
    if (data.points.some((row) => !row || keys.some((key) => typeof row[key] !== "number" || !Number.isFinite(row[key])) || !["forward", "reverse"].includes(row.branch))) throw new Error("곡선 데이터 필드를 확인하세요.");
    state.points = data.points; state.imported = true; state.importName = file.name; state.runId = data.run_id || null;
    updateReadings(); drawPlot(); updateButtons(); $("runId").textContent = `저장 곡선 · ${file.name}`; message(`곡선 ${data.points.length}점 읽음`);
  } catch (error) { message(error.message, true); }
  $("jsonFile").value = "";
});
$("liveView").addEventListener("click", () => { state.imported = false; poll(); });
new ResizeObserver(drawPlot).observe($("curvePlot").parentElement);

async function initialize() {
  updateButtons(); drawPlot();
  if (!["localhost", "127.0.0.1"].includes(location.hostname)) { message("저장 곡선 보기 · 실측 브리지 미연결"); return; }
  try { state.token = (await api("/api/session")).token; await poll(); message("장비를 선택하세요. 현재 장비 출력을 변경하지 않았습니다."); }
  catch (error) { message(`계측 브리지 연결 실패: ${error.message}`, true); }
  async function tick() { await poll(); if (!state.token && state.connected) { try { state.token = (await api("/api/session")).token; } catch {} } setTimeout(tick, 750); }
  setTimeout(tick, 750);
}
initialize();
