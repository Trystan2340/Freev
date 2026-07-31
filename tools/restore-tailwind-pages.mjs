import { execFileSync } from "node:child_process";
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
  "logiciels/codemaster.html",
];
const cloudEnabled = new Set([
  "logiciels/streamstudiopro.html",
  "jeux/beatjump.html",
  "logiciels/pixelforge.html",
  "logiciels/codemaster.html",
]);
const cloudTag = '<script type="module" src="../freev-cloud-save.js?v=3.0.0"></script>';

for (const relativePath of files) {
  const pristine = execFileSync("git", ["show", `HEAD:${relativePath}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  let html = pristine;
  if (cloudEnabled.has(relativePath) && !html.includes("freev-cloud-save.js")) {
    const closingBody = html.toLowerCase().lastIndexOf("</body>");
    if (closingBody < 0) throw new Error(`Balise </body> absente : ${relativePath}`);
    html = `${html.slice(0, closingBody)}  ${cloudTag}\n${html.slice(closingBody)}`;
  }
  await writeFile(resolve(root, relativePath), html, "utf8");
}

// CodeMaster contient déjà une feuille Tailwind complète et n'a jamais utilisé
// le CDN. Son ancien objet tailwind.config est inerte et reste intact.
console.log(`Pages restaurées sans perte : ${files.length}`);
