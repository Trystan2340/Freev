import assert from "node:assert/strict";
import test from "node:test";

import {
  applyConfiguredStorage,
  captureConfiguredStorage,
  cloudConfigurationForPath,
  hasConfiguredData,
} from "../js/freev-id/cloud-adapters.js";

function fakeStorage(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    value: (key) => data.get(key),
  };
}

test("chaque application connue utilise une liste explicite de clés", () => {
  const config = cloudConfigurationForPath("/Freev/jeux/pacman.html");
  assert.equal(config.pageId, "pacman");
  assert.deepEqual(config.keys, ["pacmanHighScore", "pacmanLeaderboard"]);
  assert.equal(cloudConfigurationForPath("/Freev/inconnu.html"), null);
});

test("la capture n’envoie jamais une clé non déclarée", () => {
  const storage = fakeStorage({ pacmanHighScore: "42", pacmanLeaderboard: "[]", apiKey: "secret" });
  const config = cloudConfigurationForPath("jeux/pacman.html");
  assert.deepEqual(captureConfiguredStorage(storage, config), {
    pacmanHighScore: "42",
    pacmanLeaderboard: "[]",
  });
});

test("une sauvegarde trop volumineuse est refusée avant Firestore", () => {
  const storage = fakeStorage({ codemaster_v4_workspace: "x".repeat(800_000) });
  const config = cloudConfigurationForPath("logiciels/codemaster.html");
  assert.throws(() => captureConfiguredStorage(storage, config), /700 ko/i);
});

test("la restauration ignore les champs étrangers et les valeurs non textuelles", () => {
  const storage = fakeStorage();
  const config = cloudConfigurationForPath("jeux/astrominer.html");
  const count = applyConfiguredStorage(storage, config, {
    astroMinerV3_save: "{\"score\":12}",
    apiKey: "secret",
    unexpected: 42,
  });
  assert.equal(count, 1);
  assert.equal(storage.value("astroMinerV3_save"), "{\"score\":12}");
  assert.equal(storage.value("apiKey"), undefined);
  assert.equal(hasConfiguredData({ astroMinerV3_save: "{}" }), true);
});
