export const THEME_KEYS = Object.freeze([
  "aurora",
  "circuit",
  "cosmos",
  "pulse",
  "calm",
  "prism",
  "rain",
  "vortex",
  "horizon",
  "comet",
]);

export const DEFAULT_THEME_CONFIG = Object.freeze({
  preset: "aurora",
  intensity: 68,
  speed: 50,
  particles: 24,
  reduceMotion: false,
});

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

export function normalizeThemeConfig(input = {}) {
  return {
    preset: THEME_KEYS.includes(input.preset) ? input.preset : DEFAULT_THEME_CONFIG.preset,
    intensity: clampNumber(input.intensity, 0, 100, DEFAULT_THEME_CONFIG.intensity),
    speed: clampNumber(input.speed, 0, 100, DEFAULT_THEME_CONFIG.speed),
    particles: clampNumber(input.particles, 0, 80, DEFAULT_THEME_CONFIG.particles),
    reduceMotion: input.reduceMotion === true,
  };
}

export function themeConfigToCssVariables(input = {}) {
  const config = normalizeThemeConfig(input);
  const seconds = config.reduceMotion ? 0 : Math.round(34 - (config.speed / 100) * 28);
  return {
    "--freev-theme-intensity": (config.intensity / 100).toFixed(2),
    "--freev-theme-duration": `${seconds}s`,
    "--freev-theme-particles": String(config.particles),
    "--freev-theme-density": (config.particles / 80).toFixed(2),
  };
}

export function applyThemeConfig(input = {}, target = globalThis.document?.body) {
  const config = normalizeThemeConfig(input);
  if (!target) return config;
  target.dataset.freevBanner = config.preset;
  target.dataset.freevMotion = config.reduceMotion ? "reduced" : "full";
  for (const [property, value] of Object.entries(themeConfigToCssVariables(config))) {
    target.style.setProperty(property, value);
  }
  return config;
}
