import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assignmentInputType,
  isCreatureTarget,
  isModeTarget,
  normalizeAssignmentIds,
} from "../js/nova-configuration.js";

const availableModelIds = Array.from({ length: 12 }, (_, index) => `model-${index + 1}`);

test("un mode Nova accepte tous les modèles configurés sans limite artificielle", () => {
  assert.deepEqual(
    normalizeAssignmentIds("spark", availableModelIds, availableModelIds),
    availableModelIds,
  );
});

test("une affectation de mode conserve l'ordre, supprime les doublons et les profils inconnus", () => {
  assert.deepEqual(
    normalizeAssignmentIds("archon", ["model-3", "missing", "model-3", "model-1"], availableModelIds),
    ["model-3", "model-1"],
  );
});

test("une créature conserve exactement un seul modèle", () => {
  assert.deepEqual(
    normalizeAssignmentIds("buddy", ["model-4", "model-8", "model-2"], availableModelIds),
    ["model-4"],
  );
  assert.deepEqual(normalizeAssignmentIds("iris", [], availableModelIds), []);
});

test("les cibles et les contrôles de formulaire restent distincts", () => {
  assert.equal(isModeTarget("codex"), true);
  assert.equal(isCreatureTarget("codex"), false);
  assert.equal(isCreatureTarget("sentinel"), true);
  assert.equal(assignmentInputType("spark"), "checkbox");
  assert.equal(assignmentInputType("sentinel"), "radio");
  assert.deepEqual(normalizeAssignmentIds("unknown", availableModelIds, availableModelIds), []);
});

test("la page Nova expose le bureau Buddy et la configuration rapide", async () => {
  const html = await readFile(new URL("../nova.html", import.meta.url), "utf8");
  assert.match(html, /id="nova-creature-desktop"/);
  assert.match(html, /id="nova-creature-model-select"/);
  assert.match(html, /id="nova-save-creature-model"/);
  assert.match(html, /id="nova-configure-active"/);
});

test("Firestore impose le modèle unique uniquement aux créatures", async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /targetId\.matches\('\^\(spark\|archon\|codex\)\$'\)/);
  assert.match(rules, /modelIds\.size\(\) <= 1/);
  assert.doesNotMatch(rules, /modelIds\.size\(\) <= 5/);
});
