/**
 * Freev ID Avatar Engine
 *
 * Every shape below was designed specifically for Freev. No third-party avatar
 * artwork, character kit or generated asset is embedded in this module.
 */

export const AVATAR_STYLE_VERSION = 1;

export const AVATAR_PARTS = Object.freeze({
  face: Object.freeze(["orb", "shield", "capsule", "crystal"]),
  eyes: Object.freeze(["spark", "visor", "orbit", "pixel"]),
  mouth: Object.freeze(["signal", "smile", "dash", "pulse"]),
  hair: Object.freeze(["halo", "flare", "crown", "none"]),
  outfit: Object.freeze(["core", "pilot", "matrix", "nova"]),
  backdrop: Object.freeze(["rings", "grid", "comet", "portal"]),
});

const DEFAULT_PALETTE = Object.freeze({
  primary: "#22d3ee",
  secondary: "#a855f7",
  accent: "#f472b6",
  skin: "#fed7aa",
});

const PALETTES = Object.freeze([
  DEFAULT_PALETTE,
  Object.freeze({ primary: "#38bdf8", secondary: "#6366f1", accent: "#2dd4bf", skin: "#f8c9a4" }),
  Object.freeze({ primary: "#34d399", secondary: "#0ea5e9", accent: "#fbbf24", skin: "#8d5524" }),
  Object.freeze({ primary: "#f472b6", secondary: "#8b5cf6", accent: "#22d3ee", skin: "#c68642" }),
  Object.freeze({ primary: "#fb7185", secondary: "#f59e0b", accent: "#a78bfa", skin: "#f1c27d" }),
  Object.freeze({ primary: "#a3e635", secondary: "#14b8a6", accent: "#38bdf8", skin: "#6f4e37" }),
]);

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(items, random) {
  return items[Math.floor(random() * items.length)];
}

function sanitizeSeed(value) {
  const safe = String(value || "freev")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return safe || "freev";
}

function normalizeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : fallback;
}

function normalizePart(category, value, fallback) {
  return AVATAR_PARTS[category].includes(value) ? value : fallback;
}

export function createAvatarConfig(seed = "freev", overrides = {}) {
  const safeSeed = sanitizeSeed(seed);
  const random = mulberry32(fnv1a(`${AVATAR_STYLE_VERSION}:${safeSeed}`));
  const generatedParts = Object.fromEntries(
    Object.entries(AVATAR_PARTS).map(([category, values]) => [category, pick(values, random)]),
  );
  const palette = PALETTES[Math.floor(random() * PALETTES.length)];

  return normalizeAvatarConfig({
    seed: safeSeed,
    styleVersion: AVATAR_STYLE_VERSION,
    parts: { ...generatedParts, ...(overrides.parts || {}) },
    palette: { ...palette, ...(overrides.palette || {}) },
  });
}

export function normalizeAvatarConfig(input = {}) {
  const seed = sanitizeSeed(input.seed);
  const fallbackRandom = mulberry32(fnv1a(`${AVATAR_STYLE_VERSION}:${seed}`));
  const fallbackParts = Object.fromEntries(
    Object.entries(AVATAR_PARTS).map(([category, values]) => [category, pick(values, fallbackRandom)]),
  );
  const paletteFallback = PALETTES[Math.floor(fallbackRandom() * PALETTES.length)];

  return {
    seed,
    styleVersion: AVATAR_STYLE_VERSION,
    parts: Object.fromEntries(
      Object.keys(AVATAR_PARTS).map((category) => [
        category,
        normalizePart(category, input.parts?.[category], fallbackParts[category]),
      ]),
    ),
    palette: {
      primary: normalizeColor(input.palette?.primary, paletteFallback.primary),
      secondary: normalizeColor(input.palette?.secondary, paletteFallback.secondary),
      accent: normalizeColor(input.palette?.accent, paletteFallback.accent),
      skin: normalizeColor(input.palette?.skin, paletteFallback.skin),
    },
  };
}

const FACE_SHAPES = Object.freeze({
  orb: '<circle cx="64" cy="58" r="31" fill="url(#skin)" stroke="url(#edge)" stroke-width="4"/>',
  shield: '<path d="M32 31 64 20l32 11v28c0 24-15 39-32 47C47 98 32 83 32 59Z" fill="url(#skin)" stroke="url(#edge)" stroke-width="4"/>',
  capsule: '<rect x="32" y="23" width="64" height="72" rx="30" fill="url(#skin)" stroke="url(#edge)" stroke-width="4"/>',
  crystal: '<path d="m64 19 31 20-8 48-23 19-23-19-8-48Z" fill="url(#skin)" stroke="url(#edge)" stroke-width="4"/>',
});

const EYES = Object.freeze({
  spark: '<path d="m43 53 5-5 5 5-5 5Zm32 0 5-5 5 5-5 5Z" fill="var(--accent)"/>',
  visor: '<path d="M42 48h44l-5 13H47Z" fill="#07111f" stroke="var(--primary)" stroke-width="3"/><path d="M50 55h28" stroke="var(--accent)" stroke-width="2"/>',
  orbit: '<circle cx="48" cy="53" r="6" fill="#07111f" stroke="var(--primary)" stroke-width="3"/><circle cx="80" cy="53" r="6" fill="#07111f" stroke="var(--primary)" stroke-width="3"/><circle cx="48" cy="53" r="2" fill="var(--accent)"/><circle cx="80" cy="53" r="2" fill="var(--accent)"/>',
  pixel: '<path d="M42 48h12v12H42Zm32 0h12v12H74Z" fill="#07111f"/><path d="M46 52h4v4h-4Zm32 0h4v4h-4Z" fill="var(--accent)"/>',
});

const MOUTHS = Object.freeze({
  signal: '<path d="M48 72h7l4-5 8 10 5-5h8" fill="none" stroke="var(--secondary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  smile: '<path d="M49 70q15 15 30 0" fill="none" stroke="#07111f" stroke-width="4" stroke-linecap="round"/>',
  dash: '<path d="M51 74h26" stroke="#07111f" stroke-width="4" stroke-linecap="round"/>',
  pulse: '<path d="M49 75h9l4-7 6 12 5-5h7" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
});

const HAIR = Object.freeze({
  halo: '<ellipse cx="64" cy="25" rx="27" ry="8" fill="none" stroke="var(--accent)" stroke-width="4" opacity=".9"/>',
  flare: '<path d="m39 35 4-19 12 10 9-17 9 17 14-10 2 20" fill="var(--secondary)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>',
  crown: '<path d="m40 34 5-20 19 12 19-12 5 20Z" fill="url(#edge)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>',
  none: "",
});

const OUTFITS = Object.freeze({
  core: '<path d="M28 128q3-34 36-34t36 34" fill="#0f172a" stroke="var(--primary)" stroke-width="4"/><circle cx="64" cy="109" r="8" fill="var(--accent)"/>',
  pilot: '<path d="M24 128q5-35 40-35t40 35" fill="#101827" stroke="var(--secondary)" stroke-width="4"/><path d="m48 96 16 19 16-19M64 115v13" fill="none" stroke="var(--primary)" stroke-width="4"/>',
  matrix: '<path d="M25 128q4-34 39-34t39 34" fill="#07111f" stroke="var(--accent)" stroke-width="4"/><path d="M40 103v25m12-30v30m24-30v30m12-25v25" stroke="var(--primary)" stroke-width="2" opacity=".7"/>',
  nova: '<path d="M25 128q4-35 39-35t39 35" fill="url(#edge)" stroke="var(--accent)" stroke-width="4"/><path d="m64 101 5 10 11 2-8 8 2 7H54l2-7-8-8 11-2Z" fill="var(--accent)"/>',
});

const BACKDROPS = Object.freeze({
  rings: '<circle cx="64" cy="64" r="49" fill="none" stroke="var(--primary)" stroke-width="2" opacity=".35"/><circle cx="64" cy="64" r="57" fill="none" stroke="var(--secondary)" stroke-width="2" stroke-dasharray="5 8" opacity=".55"/>',
  grid: '<path d="M8 32h112M8 64h112M8 96h112M32 8v112M64 8v112M96 8v112" stroke="var(--primary)" stroke-width="1" opacity=".18"/>',
  comet: '<path d="M7 104 113 18M16 116 120 32" stroke="url(#edge)" stroke-width="5" stroke-linecap="round" opacity=".35"/><circle cx="105" cy="24" r="5" fill="var(--accent)"/>',
  portal: '<path d="M17 64c0-39 21-54 47-54s47 15 47 54-21 54-47 54S17 103 17 64Z" fill="none" stroke="url(#edge)" stroke-width="5" stroke-dasharray="18 7" opacity=".5"/>',
});

export function renderAvatarSvg(input, { title = "Avatar Freev ID original" } = {}) {
  const config = normalizeAvatarConfig(input);
  const { palette, parts } = config;
  const titleId = `freev-avatar-title-${fnv1a(config.seed).toString(16)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-labelledby="${titleId}" data-freev-avatar="1" style="--primary:${palette.primary};--secondary:${palette.secondary};--accent:${palette.accent}">
  <title id="${titleId}">${title.replace(/[<>&"]/g, "")}</title>
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.primary}"/><stop offset="1" stop-color="${palette.secondary}"/></linearGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${palette.skin}"/><stop offset="1" stop-color="${palette.skin}" stop-opacity=".78"/></linearGradient>
    <radialGradient id="bg"><stop stop-color="#172554"/><stop offset="1" stop-color="#020617"/></radialGradient>
    <clipPath id="frame"><rect width="128" height="128" rx="28"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="128" height="128" fill="url(#bg)"/>
    ${BACKDROPS[parts.backdrop]}
    ${OUTFITS[parts.outfit]}
    ${FACE_SHAPES[parts.face]}
    ${HAIR[parts.hair]}
    ${EYES[parts.eyes]}
    ${MOUTHS[parts.mouth]}
    <path d="M8 112 112 8" stroke="#fff" stroke-width="1" opacity=".08"/>
  </g>
  <rect x="2" y="2" width="124" height="124" rx="26" fill="none" stroke="url(#edge)" stroke-width="4"/>
</svg>`;
}

export function avatarToDataUrl(config) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(renderAvatarSvg(config))}`;
}
