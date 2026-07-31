import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("tous les jeux et logiciels chargent le point d’entrée cloud v3", async () => {
  for (const folder of ["jeux", "logiciels"]) {
    const directory = new URL(`../${folder}/`, import.meta.url);
    const files = (await readdir(directory)).filter((file) => file.endsWith(".html"));
    assert.ok(files.length > 0, `${folder} doit contenir des pages HTML`);
    for (const file of files) {
      const html = await readFile(new URL(`../${folder}/${file}`, import.meta.url), "utf8");
      assert.match(html, /\.\.\/freev-cloud-save\.js/, `${join(folder, file)} n’est pas raccordé au cloud v3`);
    }
  }
});

test("le point d’entrée historique redirige vers le moteur v3", async () => {
  const entry = await readFile(new URL("../freev-cloud-save.js", import.meta.url), "utf8");
  assert.match(entry, /js\/freev-id\/cloud-sync\.js/);
});

test("les adaptateurs n’aspirent aucune clé API ou mot de passe", async () => {
  const adapters = await readFile(new URL("../js/freev-id/cloud-adapters.js", import.meta.url), "utf8");
  assert.doesNotMatch(adapters, /["'`](?:api.?key|password|token|secret)["'`]/i);
});
