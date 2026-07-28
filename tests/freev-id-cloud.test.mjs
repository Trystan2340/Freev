import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSaveVersion,
  chooseConflictWinner,
  normalizeSaveHistory,
} from "../js/freev-id/cloud-saves.js";

test("une version cloud possède un identifiant et une empreinte stables", () => {
  const first = buildSaveVersion({
    pageId: "pixel-forge",
    data: { score: 12, colors: ["#fff", "#000"] },
    savedAt: "2026-07-28T20:00:00.000Z",
    deviceId: "iphone",
  });
  const second = buildSaveVersion({
    pageId: "pixel-forge",
    data: { colors: ["#fff", "#000"], score: 12 },
    savedAt: "2026-07-28T20:00:00.000Z",
    deviceId: "iphone",
  });

  assert.equal(first.checksum, second.checksum);
  assert.equal(first.id, second.id);
});

test("un conflit choisit la version récente sans effacer l'autre", () => {
  const local = buildSaveVersion({
    pageId: "snake",
    data: { score: 30 },
    savedAt: "2026-07-28T20:05:00.000Z",
    deviceId: "iphone",
  });
  const cloud = buildSaveVersion({
    pageId: "snake",
    data: { score: 20 },
    savedAt: "2026-07-28T20:00:00.000Z",
    deviceId: "desktop",
  });
  const conflict = chooseConflictWinner(local, cloud);

  assert.equal(conflict.winner.id, local.id);
  assert.equal(conflict.loser.id, cloud.id);
  assert.equal(conflict.hasConflict, true);
});

test("l'historique est dédupliqué, trié et limité", () => {
  const versions = Array.from({ length: 30 }, (_, index) =>
    buildSaveVersion({
      pageId: "tron",
      data: { score: index },
      savedAt: new Date(Date.UTC(2026, 6, 1, 0, index)).toISOString(),
      deviceId: "web",
    }),
  );

  const normalized = normalizeSaveHistory([...versions, versions[29]], 20);
  assert.equal(normalized.length, 20);
  assert.equal(normalized[0].id, versions[29].id);
});
