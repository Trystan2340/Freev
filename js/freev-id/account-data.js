import { sanitizePublicProfile } from "./profile-schema.js";

export const FREEV_EXPORT_FORMAT = "freev-account-export";
export const FREEV_EXPORT_VERSION = 1;

const PUBLIC_PROFILE_ID_PATTERN = /^[\p{L}\p{N}_-]{3,24}$/u;
const DEVICE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/;

function asDateString(value) {
  if (value instanceof Date) return value.toISOString();
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (value?.seconds !== undefined) {
    const milliseconds = Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
    const date = new Date(milliseconds);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }
  return null;
}

export function toPortableData(value, seen = new WeakSet()) {
  const date = asDateString(value);
  if (date) return date;
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map((entry) => toPortableData(entry, seen));
  if (!value || typeof value !== "object") return null;
  if (seen.has(value)) return "[référence circulaire]";
  seen.add(value);
  const portable = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toPortableData(entry, seen)]),
  );
  seen.delete(value);
  return portable;
}

export function normalizePublicProfileId(value) {
  const id = String(value || "").trim().toLocaleLowerCase("fr-FR");
  return PUBLIC_PROFILE_ID_PATTERN.test(id) ? id : "";
}

export function buildPublicProfile(profile = {}) {
  const sanitized = sanitizePublicProfile(profile);
  const nicknameLower = normalizePublicProfileId(sanitized.nicknameLower);
  if (!nicknameLower) throw new TypeError("Le profil doit contenir un surnom public valide.");
  return { ...sanitized, nicknameLower };
}

export function normalizeDeviceRecord(input = {}) {
  const id = String(input.id || "").trim();
  if (!DEVICE_ID_PATTERN.test(id)) throw new TypeError("Identifiant d’appareil invalide.");
  return {
    id,
    label: String(input.label || "Navigateur Freev").trim().slice(0, 80) || "Navigateur Freev",
    platform: String(input.platform || "Plateforme inconnue").trim().slice(0, 80) || "Plateforme inconnue",
  };
}

export function buildAccountExport({ uid, profile, collections = {}, exportedAt = new Date() } = {}) {
  const safeUid = String(uid || "").trim();
  if (!safeUid) throw new TypeError("Un compte Firebase connecté est requis.");
  const date = exportedAt instanceof Date ? exportedAt : new Date(exportedAt);
  if (Number.isNaN(date.valueOf())) throw new TypeError("Date d’export invalide.");

  return {
    format: FREEV_EXPORT_FORMAT,
    version: FREEV_EXPORT_VERSION,
    exportedAt: date.toISOString(),
    account: {
      uid: safeUid,
      profile: toPortableData(profile || {}),
    },
    collections: toPortableData(collections || {}),
  };
}

export function calculateSquareCrop({ width, height, zoom = 1 } = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeZoom = Math.min(3, Math.max(1, Number(zoom) || 1));
  const baseSize = Math.min(safeWidth, safeHeight);
  const sourceSize = baseSize / safeZoom;
  return {
    sourceX: (safeWidth - sourceSize) / 2,
    sourceY: (safeHeight - sourceSize) / 2,
    sourceSize,
  };
}
