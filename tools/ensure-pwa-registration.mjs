import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pwaVersion = "3.1.0";

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = resolve(path, entry.name);
    const ignoredDirectory = ["node_modules", ".git", "test-results", "playwright-report"].includes(entry.name);
    if (entry.isDirectory() && !ignoredDirectory) files.push(...await walk(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

let changed = 0;
for (const path of await walk(root)) {
  let html = await readFile(path, "utf8");
  if (!/<\/body>/i.test(html)) continue;
  const name = relative(root, path).split(sep).join("/");
  const source = name.includes("/") ? `../js/pwa-register.js?v=${pwaVersion}` : `js/pwa-register.js?v=${pwaVersion}`;
  if (html.includes("pwa-register.js")) {
    const updated = html.replace(/(?:\.\.\/)?js\/pwa-register\.js\?v=[0-9.]+/g, source);
    if (updated !== html) {
      await writeFile(path, updated, "utf8");
      changed += 1;
    }
    continue;
  }
  const closingBody = html.toLowerCase().lastIndexOf("</body>");
  html = `${html.slice(0, closingBody)}<script defer src="${source}"></script>\n${html.slice(closingBody)}`;
  await writeFile(path, html, "utf8");
  changed += 1;
}
console.log(`Enregistrement PWA ajouté à ${changed} pages.`);
