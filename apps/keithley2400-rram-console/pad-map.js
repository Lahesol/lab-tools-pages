export const DEVICE_LAYOUT_VERSION = "die-te-be-pairs-v2";
export const DEFAULT_DEVICES_PER_ROW = 17;

// One device spans adjacent TE/BE contacts at the same horizontal position.
// The middle contact row is BE for MID-UPPER and TE for MID-LOWER.
export const DEVICE_ROWS = Object.freeze([
  Object.freeze({ key: "TOP", label: "상단", teRail: "TOP-TE", beRail: "TOP-BE", contacts: "TE ↔ BE" }),
  Object.freeze({ key: "MID-UPPER", label: "중앙 위", teRail: "MID-TE", beRail: "MID-BE-TE", contacts: "TE ↔ 공통 BE/TE" }),
  Object.freeze({ key: "MID-LOWER", label: "중앙 아래", teRail: "MID-BE-TE", beRail: "MID-BE", contacts: "공통 BE/TE ↔ BE" }),
  Object.freeze({ key: "BOTTOM", label: "하단", teRail: "BOTTOM-TE", beRail: "BOTTOM-BE", contacts: "TE ↔ BE" }),
]);

export function normalizeDevicesPerRow(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_DEVICES_PER_ROW;
  return Math.max(1, Math.min(32, Math.round(parsed)));
}

export function makeDeviceSelection(rowKey, index, devicesPerRow = DEFAULT_DEVICES_PER_ROW) {
  const row = DEVICE_ROWS.find((candidate) => candidate.key === rowKey);
  const count = normalizeDevicesPerRow(devicesPerRow);
  const position = Number(index);
  if (!row || !Number.isInteger(position) || position < 1 || position > count) return null;
  const ordinal = String(position).padStart(2, "0");
  return {
    layoutVersion: DEVICE_LAYOUT_VERSION,
    devicesPerRow: count,
    rowKey: row.key,
    rowLabel: row.label,
    index: position,
    key: `${row.key}-${ordinal}`,
    te: { railKey: row.teRail, index: position, key: `${row.teRail}-${ordinal}` },
    be: { railKey: row.beRail, index: position, key: `${row.beRail}-${ordinal}` },
  };
}

export function formatDeviceSelection(selection) {
  if (!selection?.key) return "소자 미선택";
  return `${selection.rowLabel} · 소자 ${String(selection.index).padStart(2, "0")} (TE–BE)`;
}

// v1 recorded only one contact, which cannot unambiguously identify a device.
// Read it without migrating or rewriting stored measurement metadata.
export function getRunDeviceIdentity(run) {
  const device = run?.metadata?.deviceSelection;
  if (device?.key) return { filterKey: `device:${device.layoutVersion}:${device.key}`, label: formatDeviceSelection(device) };
  const pad = run?.metadata?.padSelection;
  if (pad?.key) return {
    filterKey: `legacy-pad:${pad.key}`,
    label: `구버전 단일 pad · ${pad.section} · ${pad.rail} · ${String(pad.index).padStart(2, "0")}`,
  };
  return { filterKey: "unassigned", label: "소자 미기록" };
}

export function runDieId(run) {
  return run?.metadata?.dieId || "미기록";
}

export function filterDeviceRuns(runs, { dieId = "", deviceKey = "" } = {}) {
  return runs.filter((run) => (!dieId || runDieId(run) === dieId)
    && (!deviceKey || getRunDeviceIdentity(run).filterKey === deviceKey));
}
