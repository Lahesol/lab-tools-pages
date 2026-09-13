export const PAD_LAYOUT_VERSION = "die-pad-layout-v1";
export const DEFAULT_CONTACTS_PER_RAIL = 17;
export const MIN_CONTACTS_PER_RAIL = 1;
export const MAX_CONTACTS_PER_RAIL = 32;

// This is a storage/indexing map, not a dimensional reconstruction of the die.
// The supplied layout identifies rail placement and labels but does not label pad numbers.
export const PAD_RAILS = Object.freeze([
  Object.freeze({ key: "TOP-TE", section: "상단", rail: "TE" }),
  Object.freeze({ key: "TOP-BE", section: "상단", rail: "BE" }),
  Object.freeze({ key: "MID-TE", section: "중앙", rail: "TE" }),
  Object.freeze({ key: "MID-BE-TE", section: "중앙", rail: "BE/TE" }),
  Object.freeze({ key: "MID-BE", section: "중앙", rail: "BE" }),
  Object.freeze({ key: "BOTTOM-TE", section: "하단", rail: "TE" }),
  Object.freeze({ key: "BOTTOM-BE", section: "하단", rail: "BE" }),
]);

export function normalizeContactsPerRail(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CONTACTS_PER_RAIL;
  return Math.max(MIN_CONTACTS_PER_RAIL, Math.min(MAX_CONTACTS_PER_RAIL, Math.round(parsed)));
}

export function makePadSelection(railKey, index, contactsPerRail = DEFAULT_CONTACTS_PER_RAIL) {
  const rail = PAD_RAILS.find((candidate) => candidate.key === railKey);
  const count = normalizeContactsPerRail(contactsPerRail);
  const normalizedIndex = Number(index);
  if (!rail || !Number.isInteger(normalizedIndex) || normalizedIndex < 1 || normalizedIndex > count) return null;
  const ordinal = String(normalizedIndex).padStart(2, "0");
  return {
    layoutVersion: PAD_LAYOUT_VERSION,
    contactsPerRail: count,
    railKey: rail.key,
    section: rail.section,
    rail: rail.rail,
    index: normalizedIndex,
    key: `${rail.key}-${ordinal}`,
  };
}

export function buildPadAliases(contactsPerRail = DEFAULT_CONTACTS_PER_RAIL) {
  const count = normalizeContactsPerRail(contactsPerRail);
  return PAD_RAILS.flatMap((rail) => Array.from(
    { length: count },
    (_, offset) => makePadSelection(rail.key, offset + 1, count),
  ));
}

export function formatPadSelection(selection, fallback = "Pad alias 미선택") {
  if (!selection?.key) return fallback;
  return `${selection.section} · ${selection.rail} · Pad ${String(selection.index).padStart(2, "0")}`;
}
