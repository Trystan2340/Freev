import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildZipBytes,
  extractGeneratedFiles,
  sanitizeRelativePath,
} from "../js/nova-code-artifacts.js";

const decoder = new TextDecoder();

function readStoredZipFiles(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map();
  let offset = 0;
  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength));
    const content = decoder.decode(bytes.slice(dataStart, dataStart + compressedSize));
    files.set(name, content);
    offset = dataStart + compressedSize;
  }
  return files;
}

test("détecte un fichier Python unique avec la bonne extension", () => {
  const files = extractGeneratedFiles("Voici le programme :\n```python\nprint('Bonjour Freev')\n```");
  assert.deepEqual(files, [{
    path: "main.py",
    content: "print('Bonjour Freev')\n",
    language: "python",
    mimeType: "text/x-python;charset=utf-8",
  }]);
});

test("conserve les chemins et sous-dossiers d'un projet multi-fichiers", () => {
  const response = [
    "### Fichier : `src/app.js`",
    "```javascript",
    "export const hello = 'Freev';",
    "```",
    "### styles/site.css",
    "```css",
    "body { color: #00ff41; }",
    "```",
    "### `index.html`",
    "```html",
    "<main>Freev Nova</main>",
    "```",
  ].join("\n");
  assert.deepEqual(extractGeneratedFiles(response).map((file) => file.path), [
    "src/app.js",
    "styles/site.css",
    "index.html",
  ]);
});

test("comprend aussi un nom de fichier placé dans l'en-tête du bloc", () => {
  const files = extractGeneratedFiles("```javascript filename=src/main.js\nconsole.log('Nova');\n```");
  assert.equal(files[0].path, "src/main.js");
  assert.equal(files[0].mimeType, "text/javascript;charset=utf-8");
});

test("neutralise les chemins absolus et les traversées de dossiers", () => {
  assert.equal(sanitizeRelativePath("../../secrets/.env"), "secrets/.env");
  assert.equal(sanitizeRelativePath("C:\\Users\\Test\\app.py"), "Users/Test/app.py");
  assert.equal(sanitizeRelativePath("/var/www/index.html"), "var/www/index.html");
});

test("rend uniques deux blocs qui annoncent le même fichier", () => {
  const response = [
    "`app.js`",
    "```js",
    "console.log(1);",
    "```",
    "`app.js`",
    "```js",
    "console.log(2);",
    "```",
  ].join("\n");
  assert.deepEqual(extractGeneratedFiles(response).map((file) => file.path), ["app.js", "app-2.js"]);
});

test("génère un ZIP stocké valide avec le dossier racine et tous les contenus", () => {
  const sourceFiles = [
    { path: "index.html", content: "<h1>Nova</h1>" },
    { path: "src/app.js", content: "console.log('Nova');" },
  ];
  const bytes = buildZipBytes(sourceFiles, { rootFolder: "freev-nova-projet" });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.deepEqual([...readStoredZipFiles(bytes)], [
    ["freev-nova-projet/index.html", "<h1>Nova</h1>"],
    ["freev-nova-projet/src/app.js", "console.log('Nova');"],
  ]);
});

test("ignore une réponse sans bloc de code", () => {
  assert.deepEqual(extractGeneratedFiles("Voici seulement une explication, sans fichier."), []);
});

test("les réponses courantes et l'historique utilisent le même panneau de téléchargement", async () => {
  const workspace = await readFile(new URL("../js/nova-workspace.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../nova.html", import.meta.url), "utf8");
  assert.match(workspace, /function createCodeArtifacts\(/);
  assert.match(workspace, /attachCodeArtifacts\(handle\.body, text, handle\.name\)/);
  assert.match(workspace, /const artifacts = createCodeArtifacts\(String\(entry\.response/);
  assert.match(workspace, /buildZipBytes\(files, \{ rootFolder \}\)/);
  assert.match(html, /projet ZIP/);
  assert.match(html, /nova-workspace\.js\?v=1\.3\.0/);
});
