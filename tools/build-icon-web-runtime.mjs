import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "packages", "freev-icon-system");
const target = join(root, "freev-icons");
const paths = [
  "dist",
  "masters/clean",
  "symbols/mask",
  "symbols/small-mask",
  "symbols/animation-cover",
  "symbols/animation-layers",
];

await mkdir(target, { recursive: true });
for (const path of paths) {
  const destination = join(target, path);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(source, path), destination, { recursive: true, force: true });
}

const registry = JSON.parse(await readFile(join(source, "registry", "apps.json"), "utf8"));
const manifest = {
  version: "2.7.0",
  generatedFrom: "packages/freev-icon-system",
  apps: registry.apps.map((app) => app.id),
  publishedPaths: paths,
};
await writeFile(join(target, "runtime-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const runtime = await stat(join(target, "dist", "freev-icon.js"));
const generatedApps = await readFile(join(target, "dist", "generated-apps.js"), "utf8");
const uniqueApps = new Set(manifest.apps);
const registryIsComplete = manifest.apps.length > 0
  && uniqueApps.size === manifest.apps.length
  && manifest.apps.every((appId) => generatedApps.includes(`\"id\":\"${appId}\"`));
if (!runtime.isFile() || !registryIsComplete) {
  throw new Error("Export Web FREEV V2.7 incomplet.");
}
console.log(`Runtime Web FREEV V2.7 publié : ${manifest.apps.length} applications, sans exports mobiles/desktop.`);
