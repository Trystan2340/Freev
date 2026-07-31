import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "telechargement/telechargementfreevia.html",
  "logiciels/streamstudiopro.html",
  "logiciels/resumemaster.html",
  "jeux/beatjump.html",
  "logiciels/pixelforge.html",
  "logiciels/coffre.html",
  "logiciels/freev-taskflow.html",
  "logiciels/freevsketchpro.html",
  "logiciels/freevconvert.html",
];

for (const relativePath of files) {
  const path = resolve(root, relativePath);
  let html = await readFile(path, "utf8");
  html = html.replace(
    /\s*<script\s+src=["']https:\/\/cdn\.tailwindcss\.com["']><\/script>/i,
    '\n    <link rel="stylesheet" href="../css/tailwind.generated.css?v=1.0.0">',
  );
  html = html.replace(/\s*<script([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attributes, source) => {
    if (/\bsrc\s*=/i.test(attributes) || !source.includes("tailwind.config")) return whole;
    return "";
  });
  await writeFile(path, html, "utf8");
}

console.log(`Tailwind CDN retiré de ${files.length} pages.`);
