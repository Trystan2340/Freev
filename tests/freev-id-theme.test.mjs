import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_THEME_CONFIG,
  THEME_KEYS,
  normalizeThemeConfig,
  themeConfigToCssVariables,
} from "../js/freev-id/theme-engine.js";

test("le studio conserve les dix ambiances Freev existantes", () => {
  assert.deepEqual(THEME_KEYS, [
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
});

test("les réglages sont bornés pour protéger performances et lisibilité", () => {
  const theme = normalizeThemeConfig({
    preset: "inconnu",
    intensity: 900,
    speed: -2,
    particles: 5000,
    reduceMotion: "oui",
  });

  assert.equal(theme.preset, DEFAULT_THEME_CONFIG.preset);
  assert.equal(theme.intensity, 100);
  assert.equal(theme.speed, 0);
  assert.equal(theme.particles, 80);
  assert.equal(theme.reduceMotion, false);
});

test("les variables CSS ne contiennent que des valeurs normalisées", () => {
  const variables = themeConfigToCssVariables({
    preset: "prism",
    intensity: 42,
    speed: 75,
    particles: 12,
    reduceMotion: true,
  });

  assert.deepEqual(variables, {
    "--freev-theme-intensity": "0.42",
    "--freev-theme-duration": "0s",
    "--freev-theme-particles": "12",
    "--freev-theme-density": "0.15",
  });
});
