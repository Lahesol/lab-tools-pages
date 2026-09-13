export const APP_VERSION = "0.3.0";
export const MAX_2400_BUFFER_POINTS = 2500;
export const ABSOLUTE_APP_MAX_VOLTAGE_V = 10;
export const ABSOLUTE_APP_MAX_COMPLIANCE_A = 0.01;
export const ABSOLUTE_APP_MAX_SECONDS = 600;

const EPSILON = 1e-10;

export function asFiniteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} 값이 유효한 숫자가 아닙니다.`);
  return number;
}

export function formatScpiNumber(value) {
  const number = asFiniteNumber(value, "SCPI");
  if (Object.is(number, -0)) return "0";
  if (Math.abs(number) >= 1e5 || (Math.abs(number) > 0 && Math.abs(number) < 1e-4)) return number.toExponential(8).replace("e", "E");
  return Number(number.toFixed(10)).toString();
}

export function makeRunId(now = new Date()) {
  const compact = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `K2400-${compact}-${suffix}`;
}

function closeEnough(a, b) {
  return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
}

export function buildInclusiveSegment(startValue, stopValue, positiveStep) {
  const start = asFiniteNumber(startValue, "시작 전압");
  const stop = asFiniteNumber(stopValue, "끝 전압");
  const step = Math.abs(asFiniteNumber(positiveStep, "간격"));
  if (step <= 0) throw new Error("간격은 0보다 커야 합니다.");
  if (closeEnough(start, stop)) return [start];
  const direction = stop > start ? 1 : -1;
  const count = Math.floor(Math.abs(stop - start) / step + EPSILON);
  const values = Array.from({ length: count + 1 }, (_, index) => Number((start + direction * step * index).toFixed(10)));
  const last = values.at(-1);
  if (!closeEnough(last, stop)) values.push(stop);
  else values[values.length - 1] = stop;
  return values;
}

function appendWithoutFirst(target, segment) {
  if (!target.length) target.push(...segment);
  else if (closeEnough(target.at(-1), segment[0])) target.push(...segment.slice(1));
  else target.push(...segment);
  return target;
}

export function buildProfilePoints({ startV, positiveV, negativeV, endV, stepV, repeats = 1 }) {
  const start = asFiniteNumber(startV, "시작 전압");
  const positive = asFiniteNumber(positiveV, "양의 꼭짓점");
  const negative = asFiniteNumber(negativeV, "음의 꼭짓점");
  const end = asFiniteNumber(endV, "끝 전압");
  const repeatCount = Math.trunc(asFiniteNumber(repeats, "반복 횟수"));
  if (repeatCount < 1) throw new Error("반복 횟수는 1 이상이어야 합니다.");
  const oneCycle = [];
  appendWithoutFirst(oneCycle, buildInclusiveSegment(start, positive, stepV));
  appendWithoutFirst(oneCycle, buildInclusiveSegment(positive, negative, stepV));
  appendWithoutFirst(oneCycle, buildInclusiveSegment(negative, end, stepV));
  const allPoints = [];
  for (let index = 0; index < repeatCount; index += 1) allPoints.push(...oneCycle);
  return allPoints;
}

export function estimateDuration({ pointCount, sourceDelayMs, nplc, lineFrequencyHz }) {
  const points = Math.trunc(asFiniteNumber(pointCount, "점 수"));
  const delay = asFiniteNumber(sourceDelayMs, "source delay");
  const integrationMs = (asFiniteNumber(nplc, "NPLC") / asFiniteNumber(lineFrequencyHz, "전원 주파수")) * 1000;
  const lowerBoundPerPointMs = Math.max(0, delay) + integrationMs;
  return {
    integrationMs,
    lowerBoundPerPointMs,
    lowerBoundTotalMs: lowerBoundPerPointMs * points,
    pointCount: points,
  };
}

export function validateFinitePlan(plan, safety) {
  const points = plan.points ?? [];
  const maxVoltage = asFiniteNumber(safety.maxVoltageV, "최대 전압");
  const maxComplianceA = asFiniteNumber(safety.maxComplianceA, "최대 compliance");
  const maxRunSeconds = asFiniteNumber(safety.maxRunSeconds, "최대 run 시간");
  const compliance = asFiniteNumber(plan.complianceA, "current compliance");
  const measurementRangeA = asFiniteNumber(plan.measurementRangeA, "current measurement range");
  const sourceDelayMs = asFiniteNumber(plan.sourceDelayMs, "source delay");
  const nplc = asFiniteNumber(plan.nplc, "NPLC");
  if (!Array.isArray(points) || points.length < 1) throw new Error("유한 점 목록이 비어 있습니다.");
  if (points.length > MAX_2400_BUFFER_POINTS) throw new Error(`점 수 ${points.length}가 2400 buffer 한계 ${MAX_2400_BUFFER_POINTS}를 초과합니다.`);
  if (maxVoltage <= 0 || maxVoltage > ABSOLUTE_APP_MAX_VOLTAGE_V) throw new Error(`앱 최대 |V|는 0보다 크고 ${ABSOLUTE_APP_MAX_VOLTAGE_V} V 이하여야 합니다.`);
  if (maxComplianceA <= 0 || maxComplianceA > ABSOLUTE_APP_MAX_COMPLIANCE_A) throw new Error(`앱 최대 compliance는 0보다 크고 ${ABSOLUTE_APP_MAX_COMPLIANCE_A * 1000} mA 이하여야 합니다.`);
  if (maxRunSeconds <= 0 || maxRunSeconds > ABSOLUTE_APP_MAX_SECONDS) throw new Error(`앱 최대 run 시간은 0보다 크고 ${ABSOLUTE_APP_MAX_SECONDS} s 이하여야 합니다.`);
  if (compliance <= 0 || compliance > maxComplianceA + EPSILON) throw new Error(`Compliance가 앱 한계 ${maxComplianceA * 1000} mA를 초과합니다.`);
  if (measurementRangeA < Math.abs(compliance)) throw new Error("선택한 current measurement range가 compliance보다 작습니다.");
  if (sourceDelayMs < 0 || nplc < 0.01 || nplc > 10) throw new Error("source delay 또는 NPLC 범위가 유효하지 않습니다.");
  const excessPoint = points.find((point) => Math.abs(point) > maxVoltage + EPSILON);
  if (excessPoint !== undefined) throw new Error(`계획 전압 ${excessPoint} V가 앱 한계 ±${maxVoltage} V를 초과합니다.`);
  const duration = estimateDuration({ pointCount: points.length, sourceDelayMs, nplc, lineFrequencyHz: safety.lineFrequencyHz });
  if (duration.lowerBoundTotalMs > maxRunSeconds * 1000) throw new Error(`NPLC+delay 기준 하한 ${formatDuration(duration.lowerBoundTotalMs)}가 최대 run 시간 ${maxRunSeconds} s를 초과합니다.`);
  return duration;
}

export function formatDuration(milliseconds) {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 2 : 1)} s`;
}

export function buildLegacy2400SweepCommands(plan) {
  const points = plan.points;
  const list = points.map(formatScpiNumber).join(",");
  const delaySeconds = asFiniteNumber(plan.sourceDelayMs, "source delay") / 1000;
  const measurementRangeA = asFiniteNumber(plan.measurementRangeA, "current range");
  const commandLines = [
    "*CLS",
    ":SOUR:FUNC VOLT",
    ":SENS:FUNC 'CURR'",
    `:SENS:CURR:RANG ${formatScpiNumber(measurementRangeA)}`,
    `:SENS:CURR:PROT ${formatScpiNumber(plan.complianceA)}`,
    `:SENS:CURR:NPLC ${formatScpiNumber(plan.nplc)}`,
    `:SOUR:DEL ${formatScpiNumber(delaySeconds)}`,
    ":FORM:DATA ASC",
    ":FORM:ELEM VOLT,CURR",
    ":TRAC:CLE",
    ":TRAC:FEED SENS",
    `:TRAC:POIN ${points.length}`,
    ":TRAC:FEED:CONT NEXT",
    `:SOUR:LIST:VOLT ${list}`,
    ":SOUR:VOLT:MODE LIST",
    ":SOUR:SWE:RANG FIX",
    ":SOUR:SWE:CAB EARLY",
    `:TRIG:COUN ${points.length}`,
    ":SOUR:CLE:AUTO ON",
    ":SOUR:CLE:AUTO:MODE TCOunt",
  ];
  return {
    configure: commandLines,
    initiate: [":INIT"],
    collect: ["*OPC?", ":TRAC:DATA?", ":SENS:CURR:PROT:TRIP?", ":OUTP?", ":SYST:ERR?"],
    emergency: [":ABOR", ":OUTP OFF"],
  };
}

export function commandPreview(plan) {
  const groups = buildLegacy2400SweepCommands(plan);
  return [
    "# configure: confirmation 전에는 전송되지 않음",
    ...groups.configure,
    "",
    "# user-confirmed initiate: 이 행부터 instrument source-measure 시작",
    ...groups.initiate,
    "",
    "# complete / fetch (query responses read before next command)",
    ...groups.collect,
    "",
    "# stop / error recovery attempt (실제 OUTPUT OFF는 전면 확인 필요)",
    ...groups.emergency,
  ].join("\n");
}

export function parseTraceResponse(rawResponse) {
  const raw = String(rawResponse ?? "").trim();
  if (!raw) return { rows: [], warnings: ["TRACE 응답이 비어 있습니다."] };
  const values = raw.split(",").map((token) => Number(token.trim()));
  const warnings = [];
  if (values.length % 2 !== 0) warnings.push("TRACE 응답 항목 수가 VOLT,CURR 쌍이 아닙니다.");
  const rows = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    rows.push({ index: index / 2 + 1, voltageV: values[index], currentA: values[index + 1] });
  }
  return { rows, warnings };
}

export function isOverflowValue(value) {
  return !Number.isFinite(value) || Math.abs(value) >= 1e36;
}

export function classifyResistance(resistanceOhm, rules) {
  if (!Number.isFinite(resistanceOhm)) return "판정 불가";
  if (resistanceOhm <= asFiniteNumber(rules.lrsMaxOhm, "LRS 기준")) return "LRS 후보";
  if (resistanceOhm >= asFiniteNumber(rules.hrsMinOhm, "HRS 기준")) return "HRS 후보";
  return "중간 / 미분류";
}

export function deriveRows(rawRows, rules, deviceComplianceTripped = false) {
  const complianceA = asFiniteNumber(rules.complianceA, "compliance");
  const minimumCurrentA = asFiniteNumber(rules.minimumCurrentA, "최소 전류");
  return rawRows.map((row) => {
    const warnings = [];
    const voltage = row.voltageV;
    const current = row.currentA;
    const overflow = isOverflowValue(voltage) || isOverflowValue(current);
    if (overflow) warnings.push("range overflow/비수치");
    const nearCompliance = !overflow && Math.abs(current) >= Math.abs(complianceA) * 0.995;
    if (deviceComplianceTripped || nearCompliance) warnings.push(deviceComplianceTripped ? "장비 compliance trip" : "compliance 근접(추정)");
    let resistanceOhm = null;
    if (!overflow && Math.abs(current) >= minimumCurrentA) resistanceOhm = Math.abs(voltage / current);
    else if (!overflow) warnings.push("|I|가 최소 분모보다 작음");
    const state = warnings.length ? "판정 보류" : classifyResistance(resistanceOhm, rules);
    return { ...row, resistanceOhm, warnings, state };
  });
}

export function findSwitchCandidates(rows, rules) {
  const minDecades = asFiniteNumber(rules.switchDecades, "전환 기준");
  const candidates = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (!Number.isFinite(previous.resistanceOhm) || !Number.isFinite(current.resistanceOhm)) continue;
    if (previous.warnings.length || current.warnings.length || previous.resistanceOhm <= 0 || current.resistanceOhm <= 0) continue;
    const deltaLogR = Math.log10(current.resistanceOhm) - Math.log10(previous.resistanceOhm);
    if (Math.abs(deltaLogR) < minDecades) continue;
    const direction = current.voltageV >= 0 ? "양전압" : "음전압";
    const kind = deltaLogR < 0 ? "SET 후보 (R 감소)" : "RESET 후보 (R 증가)";
    candidates.push({ index: current.index, voltageV: current.voltageV, kind, direction, deltaLogR });
  }
  return candidates;
}

export function selectReadPoint(rows, readVoltageV) {
  if (!rows.length) return null;
  return rows.filter((row) => Number.isFinite(row.resistanceOhm) && row.warnings.length === 0)
    .sort((a, b) => Math.abs(a.voltageV - readVoltageV) - Math.abs(b.voltageV - readVoltageV))[0] ?? null;
}

export function makeSyntheticRun({ runId = makeRunId(), now = new Date().toISOString(), dutId = "SYNTHETIC-DEMO", dieId = "SYNTHETIC" } = {}) {
  const points = buildProfilePoints({ startV: 0, positiveV: 1, negativeV: -1, endV: 0, stepV: 0.1, repeats: 1 });
  const rawRows = points.map((voltageV, index) => {
    const isLrs = index > 5 && index < 22;
    const resistance = isLrs ? 7200 : 420000;
    const currentA = voltageV === 0 ? 0 : voltageV / resistance;
    return { index: index + 1, voltageV, currentA };
  });
  return {
    id: runId,
    startedAt: now,
    endedAt: now,
    kind: "synthetic-demo",
    synthetic: true,
    endReason: "사용자 요청 합성 예시",
    metadata: { dutId, dieId, deviceSelection: null, operator: "", note: "합성 데이터: 장비/DUT 실측이 아님", appVersion: APP_VERSION },
    plan: { points, complianceA: 0.001, sourceDelayMs: 20, nplc: 1, measurementRangeA: 0.001 },
    rawEvents: [{ at: now, direction: "SYSTEM", text: "SYNTHETIC DATA — no instrument communication" }],
    rawRows,
    deviceComplianceTripped: false,
  };
}
