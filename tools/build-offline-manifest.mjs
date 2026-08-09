import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["assets/catalog", "css", "data", "freev-icons", "icons", "icôns", "js", "jeux", "legal", "logiciels", "outils-ia", "telechargement"];
const rootFiles = [
  "index.html",
  "nova.html",
  "maintenance.html",
  "profil.html",
  "offline.html",
  "manifest.json",
  "firebase.js",
  "freev-cloud-save.js",
  "main.js",
];
const excluded = new Set([
  "css/tailwind.input.css",
  "js/tailwind-config.js",
  "css/nexus.css",
  "js/nexus-entry.js",
  "js/nexus.js",
]);

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else files.push(entryPath);
  }
  return files;
}

const candidates = [
  ...rootFiles.map((file) => resolve(root, file)),
  ...(await Promise.all(roots.map((folder) => walk(resolve(root, folder))))).flat(),
];
const assets = [];
const hash = createHash("sha256");
for (const path of candidates.sort()) {
  if (!(await stat(path)).isFile()) continue;
  const name = relative(root, path).split(sep).join("/");
  if (excluded.has(name)) continue;
  const content = await readFile(path);
  hash.update(name).update("\0").update(content).update("\0");
  assets.push(`./${name}`);
}
const version = hash.digest("hex").slice(0, 16);
const source = `self.FREEV_OFFLINE_MANIFEST = ${JSON.stringify({ version, assets }, null, 2)};\n`;
await writeFile(resolve(root, "offline-manifest.js"), source, "utf8");
console.log(`Manifeste hors-ligne ${version} : ${assets.length} ressources.`);
