import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");

const index = await read("index.html");
const manifest = JSON.parse(await read("manifest.json"));
const firebase = JSON.parse(await read("firebase.json"));

assert.equal(manifest.id, "./", "Le manifeste doit avoir un id relatif.");
assert.equal(manifest.scope, "./", "Le scope PWA doit fonctionner sur GitHub Pages.");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "Les icônes PWA sont requises.");
assert.equal(firebase.firestore.rules, "firestore.rules");
assert.equal(firebase.storage.rules, "storage.rules");
assert.match(index, /css\/freev-id-v2\.css/);
assert.match(index, /js\/freev-id\/freev-id-v2\.js/);
assert.match(index, /js\/pwa-register\.js/);
assert.doesNotMatch(index, /sk-(?:proj-)?[a-zA-Z0-9_-]{20,}/, "Une clé OpenAI semble exposée.");

const localReferences = [
  ...index.matchAll(/(?:href|src)="((?!https?:|data:|#|mailto:)[^"?]+)(?:\?[^"]*)?"/g),
].map((match) => match[1]).filter((path) => !path.startsWith("javascript:") && !path.includes("${"));

for (const reference of new Set(localReferences)) {
  const path = reference === "./" ? "index.html" : reference.replace(/^\.\//, "");
  await access(join(root, path));
}

for (const required of [
  "sw.js",
  "offline.html",
  "firestore.rules",
  "storage.rules",
  "js/freev-id/avatar-generator.js",
  "js/freev-id/theme-engine.js",
  "js/freev-id/profile-schema.js",
  "js/freev-id/cloud-saves.js",
]) {
  await access(join(root, required));
}

console.log(`Vérification statique réussie : ${new Set(localReferences).size} ressources locales contrôlées.`);
