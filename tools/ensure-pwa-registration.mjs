import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") files.push(...await walk(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

let changed = 0;
for (const path of await walk(root)) {
  let html = await readFile(path, "utf8");
  if (html.includes("pwa-register.js") || !/<\/body>/i.test(html)) continue;
  const name = relative(root, path).split(sep).join("/");
  const source = name.includes("/") ? "../js/pwa-register.js?v=3.0.0" : "js/pwa-register.js?v=3.0.0";
  const closingBody = html.toLowerCase().lastIndexOf("</body>");
  html = `${html.slice(0, closingBody)}<script defer src="${source}"></script>\n${html.slice(closingBody)}`;
  await writeFile(path, html, "utf8");
  changed += 1;
}
console.log(`Enregistrement PWA ajouté à ${changed} pages.`);
