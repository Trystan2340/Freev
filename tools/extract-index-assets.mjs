import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(root, "index.html");
let html = await readFile(indexPath, "utf8");

const stylePattern = /<style>([\s\S]*?)<\/style>/i;
const styleMatch = html.match(stylePattern);
if (styleMatch) {
  await writeFile(resolve(root, "css/index-legacy.css"), `${styleMatch[1].trim()}\n`, "utf8");
  html = html.replace(stylePattern, '<link href="css/index-legacy.css?v=1.0.0" rel="stylesheet"/>');
}

const scriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let inlineIndex = 0;
const replacements = [];
for (const match of html.matchAll(scriptPattern)) {
  const attributes = match[1] || "";
  const source = match[2] || "";
  if (/\bsrc\s*=/i.test(attributes) || !source.trim()) continue;
  inlineIndex += 1;
  const id = attributes.match(/\bid=["']([^"']+)["']/i)?.[1] || "";
  const filename = id === "freev-auth-module"
    ? "freev-auth.js"
    : `index-runtime-${inlineIndex}.js`;
  const relativePath = `js/${filename}`;
  await writeFile(resolve(root, relativePath), `${source.trim()}\n`, "utf8");
  replacements.push({
    original: match[0],
    replacement: `<script${attributes} src="${relativePath}?v=1.0.0"></script>`,
  });
}

for (const { original, replacement } of replacements) {
  html = html.replace(original, replacement);
}

await writeFile(indexPath, html, "utf8");
console.log(`CSS extrait : ${Boolean(styleMatch)} ; scripts extraits : ${replacements.length}`);
