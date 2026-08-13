import { build } from "esbuild";
import { copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = resolve(root, "logiciels/vendor/excalidraw");
const packageRoot = resolve(root, "node_modules/@excalidraw/excalidraw/dist/prod");

await mkdir(outdir, { recursive: true });
await build({
  entryPoints: [resolve(root, "src/excalidraw-freev.jsx")],
  outfile: resolve(outdir, "app.js"),
  bundle: true,
  format: "esm",
  jsx: "automatic",
  minify: true,
  platform: "browser",
  target: ["es2020"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  logLevel: "info",
});

await copyFile(resolve(packageRoot, "index.css"), resolve(outdir, "index.css"));
await cp(resolve(packageRoot, "fonts"), resolve(outdir, "fonts"), { recursive: true, force: true });
await writeFile(resolve(outdir, "VERSION.txt"), [
  "@excalidraw/excalidraw 0.18.1",
  "Repository: https://github.com/excalidraw/excalidraw",
  "Source commit checked: abeeaeba217ab3b5193b78c8d8d63c373b518ced",
  "License: MIT",
  "",
].join("\n"), "utf8");

console.log("Bundle Excalidraw Freev généré dans logiciels/vendor/excalidraw.");
