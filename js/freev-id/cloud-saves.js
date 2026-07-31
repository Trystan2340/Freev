const SAVE_FORMAT = "freev-cloud-save";
const SAVE_VERSION = 3;

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksum(value) {
  let hash = 0x811c9dc5;
  for (const character of stableStringify(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeId(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return normalized || fallback;
}

export function buildSaveVersion({
  pageId,
  data,
  savedAt = new Date().toISOString(),
  deviceId = "web",
  label = "",
} = {}) {
  const normalizedPageId = safeId(pageId, "page");
  const normalizedDeviceId = safeId(deviceId, "web");
  const timestamp = new Date(savedAt);
  const isoDate = Number.isNaN(timestamp.valueOf()) ? new Date(0).toISOString() : timestamp.toISOString();
  const digest = checksum({ pageId: normalizedPageId, data });

  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    id: `${normalizedPageId}-${isoDate.replace(/\D/g, "").slice(0, 14)}-${digest}`,
    pageId: normalizedPageId,
    deviceId: normalizedDeviceId,
    label: String(label || "").trim().slice(0, 60),
    savedAt: isoDate,
    checksum: digest,
    data: data ?? null,
  };
}

export function chooseConflictWinner(local, cloud) {
  if (!local) return { winner: cloud, loser: null, hasConflict: false };
  if (!cloud) return { winner: local, loser: null, hasConflict: false };
  if (local.checksum === cloud.checksum) {
    return {
      winner: Date.parse(local.savedAt) >= Date.parse(cloud.savedAt) ? local : cloud,
      loser: null,
      hasConflict: false,
    };
  }
  const localWins = Date.parse(local.savedAt) >= Date.parse(cloud.savedAt);
  return {
    winner: localWins ? local : cloud,
    loser: localWins ? cloud : local,
    hasConflict: true,
  };
}

export function normalizeSaveHistory(history = [], maximum = 20) {
  const safeMaximum = Math.min(50, Math.max(1, Number(maximum) || 20));
  const unique = new Map();
  for (const version of Array.isArray(history) ? history : []) {
    if (!version?.id || !version?.checksum || !version?.savedAt) continue;
    unique.set(version.id, version);
  }
  return [...unique.values()]
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
    .slice(0, safeMaximum);
}
