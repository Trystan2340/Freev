import assert from "node:assert/strict";
import test from "node:test";

import {
  AVATAR_STYLE_VERSION,
  createAvatarConfig,
  normalizeAvatarConfig,
  renderAvatarSvg,
} from "../js/freev-id/avatar-generator.js";

test("un même seed crée exactement le même avatar", () => {
  const first = createAvatarConfig("trystan-freev");
  const second = createAvatarConfig("trystan-freev");

  assert.deepEqual(first, second);
  assert.equal(first.styleVersion, AVATAR_STYLE_VERSION);
  assert.equal(renderAvatarSvg(first), renderAvatarSvg(second));
});

test("deux seeds différents donnent des combinaisons différentes", () => {
  const first = createAvatarConfig("freev-alpha");
  const second = createAvatarConfig("freev-beta");

  assert.notDeepEqual(first.parts, second.parts);
});

test("la configuration refuse les composants et couleurs inconnus", () => {
  const normalized = normalizeAvatarConfig({
    seed: "<script>alert(1)</script>",
    styleVersion: 999,
    parts: {
      face: "copie-interdite",
      eyes: "<img>",
      hair: "none",
    },
    palette: {
      primary: "javascript:alert(1)",
      secondary: "#A855F7",
      accent: "#22d3ee",
      skin: "#fed7aa",
    },
  });

  assert.equal(normalized.styleVersion, AVATAR_STYLE_VERSION);
  assert.match(normalized.seed, /^[a-zA-Z0-9_-]+$/);
  assert.match(normalized.palette.primary, /^#[0-9a-f]{6}$/);
  assert.doesNotMatch(renderAvatarSvg(normalized), /script|javascript|<img/i);
});

test("le SVG est accessible, autonome et signé Freev", () => {
  const svg = renderAvatarSvg(createAvatarConfig("accessibilite"));

  assert.match(svg, /^<svg/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-labelledby=/);
  assert.match(svg, /data-freev-avatar="1"/);
  assert.match(svg, /Freev ID/);
});
