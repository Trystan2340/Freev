const MAX_GENERATED_FILES = 100;
const encoder = new TextEncoder();

const LANGUAGE_FORMATS = Object.freeze({
  bash: ["script.sh", "text/x-shellscript;charset=utf-8"],
  c: ["main.c", "text/x-c;charset=utf-8"],
  cpp: ["main.cpp", "text/x-c++src;charset=utf-8"],
  csharp: ["Program.cs", "text/plain;charset=utf-8"],
  cs: ["Program.cs", "text/plain;charset=utf-8"],
  css: ["style.css", "text/css;charset=utf-8"],
  csv: ["data.csv", "text/csv;charset=utf-8"],
  dockerfile: ["Dockerfile", "text/plain;charset=utf-8"],
  dotenv: [".env.example", "text/plain;charset=utf-8"],
  go: ["main.go", "text/x-go;charset=utf-8"],
  html: ["index.html", "text/html;charset=utf-8"],
  java: ["Main.java", "text/x-java-source;charset=utf-8"],
  javascript: ["app.js", "text/javascript;charset=utf-8"],
  js: ["app.js", "text/javascript;charset=utf-8"],
  json: ["data.json", "application/json;charset=utf-8"],
  jsx: ["App.jsx", "text/javascript;charset=utf-8"],
  kotlin: ["Main.kt", "text/plain;charset=utf-8"],
  kt: ["Main.kt", "text/plain;charset=utf-8"],
  markdown: ["README.md", "text/markdown;charset=utf-8"],
  md: ["README.md", "text/markdown;charset=utf-8"],
  php: ["index.php", "application/x-httpd-php;charset=utf-8"],
  powershell: ["script.ps1", "text/plain;charset=utf-8"],
  ps1: ["script.ps1", "text/plain;charset=utf-8"],
  py: ["main.py", "text/x-python;charset=utf-8"],
  python: ["main.py", "text/x-python;charset=utf-8"],
  rb: ["main.rb", "text/x-ruby;charset=utf-8"],
  ruby: ["main.rb", "text/x-ruby;charset=utf-8"],
  rust: ["main.rs", "text/x-rust;charset=utf-8"],
  sh: ["script.sh", "text/x-shellscript;charset=utf-8"],
  shell: ["script.sh", "text/x-shellscript;charset=utf-8"],
  sql: ["schema.sql", "application/sql;charset=utf-8"],
  svg: ["image.svg", "image/svg+xml;charset=utf-8"],
  text: ["README.txt", "text/plain;charset=utf-8"],
  ts: ["app.ts", "text/typescript;charset=utf-8"],
  tsx: ["App.tsx", "text/typescript;charset=utf-8"],
  typescript: ["app.ts", "text/typescript;charset=utf-8"],
  xml: ["data.xml", "application/xml;charset=utf-8"],
  yaml: ["config.yaml", "application/yaml;charset=utf-8"],
  yml: ["config.yml", "application/yaml;charset=utf-8"],
});

const MIME_BY_EXTENSION = Object.freeze({
  c: "text/x-c;charset=utf-8",
  cpp: "text/x-c++src;charset=utf-8",
  cs: "text/plain;charset=utf-8",
  css: "text/css;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  go: "text/x-go;charset=utf-8",
  html: "text/html;charset=utf-8",
  java: "text/x-java-source;charset=utf-8",
  js: "text/javascript;charset=utf-8",
  json: "application/json;charset=utf-8",
  jsx: "text/javascript;charset=utf-8",
  kt: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  php: "application/x-httpd-php;charset=utf-8",
  ps1: "text/plain;charset=utf-8",
  py: "text/x-python;charset=utf-8",
  rb: "text/x-ruby;charset=utf-8",
  rs: "text/x-rust;charset=utf-8",
  sh: "text/x-shellscript;charset=utf-8",
  sql: "application/sql;charset=utf-8",
  svg: "image/svg+xml;charset=utf-8",
  ts: "text/typescript;charset=utf-8",
  tsx: "text/typescript;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  yaml: "application/yaml;charset=utf-8",
  yml: "application/yaml;charset=utf-8",
});

function languageFromInfo(info, path = "") {
  const first = String(info || "").trim().toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9+#.-]/g, "");
  if (LANGUAGE_FORMATS[first]) return first;
  const extension = String(path).match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || "";
  return Object.entries(LANGUAGE_FORMATS).find(([, [name]]) => name.toLowerCase().endsWith(`.${extension}`))?.[0] || extension || "text";
}

function mimeTypeFor(path, language) {
  const extension = String(path).match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || "";
  return MIME_BY_EXTENSION[extension] || LANGUAGE_FORMATS[language]?.[1] || "text/plain;charset=utf-8";
}

export function sanitizeRelativePath(rawPath, fallback = "fichier.txt") {
  let value = String(rawPath || "").trim();
  value = value.replace(/^[`'"*]+|[`'"*]+$/g, "").replace(/\\/g, "/");
  value = value.replace(/^[a-zA-Z]:\//, "").replace(/^\/+/, "");
  const segments = value.split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[<>:"|?*\u0000-\u001f]/g, "-").slice(0, 100))
    .filter(Boolean);
  const safe = segments.join("/").slice(0, 240);
  return safe || fallback;
}

function explicitPathFromInfo(info) {
  const cleaned = String(info || "").replace(/^(?:file(?:name)?|fichier|path|chemin)\s*[:=]\s*/i, "").trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean).map((token) => token.replace(/^(?:file(?:name)?|fichier|path|chemin)[:=]/i, ""));
  const candidate = tokens.find((token) => /(?:^|\/)[^/]+\.[a-zA-Z0-9]{1,12}$/.test(token))
    || (/^[^\s]+\.[a-zA-Z0-9]{1,12}$/.test(cleaned) ? cleaned : "");
  return candidate ? sanitizeRelativePath(candidate) : "";
}

function explicitPathBeforeFence(text, fenceIndex) {
  const lines = String(text).slice(Math.max(0, fenceIndex - 320), fenceIndex).split(/\r?\n/).reverse();
  for (const rawLine of lines.slice(0, 4)) {
    let line = rawLine.trim();
    if (!line) continue;
    line = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/^(?:fichier|file|chemin|path)\s*[:=-]\s*/i, "")
      .trim();
    if (/^(?:Dockerfile|Makefile|Procfile)$/i.test(line) || /^(?!https?:\/\/)[^<>:"|?*\r\n]+\.[a-zA-Z0-9]{1,12}$/.test(line)) {
      return sanitizeRelativePath(line);
    }
  }
  return "";
}

function uniquePath(path, usedPaths) {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }
  const slash = path.lastIndexOf("/");
  const directory = slash >= 0 ? path.slice(0, slash + 1) : "";
  const filename = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot) : "";
  let index = 2;
  while (usedPaths.has(`${directory}${stem}-${index}${extension}`)) index += 1;
  const next = `${directory}${stem}-${index}${extension}`;
  usedPaths.add(next);
  return next;
}

export function extractGeneratedFiles(response) {
  const text = String(response || "");
  const files = [];
  const usedPaths = new Set();
  const fencePattern = /```([^\r\n`]*)\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = fencePattern.exec(text)) && files.length < MAX_GENERATED_FILES) {
    const info = match[1].trim();
    const explicit = explicitPathFromInfo(info) || explicitPathBeforeFence(text, match.index);
    const preliminaryLanguage = languageFromInfo(info, explicit);
    const fallback = LANGUAGE_FORMATS[preliminaryLanguage]?.[0] || "fichier.txt";
    const path = uniquePath(sanitizeRelativePath(explicit || fallback, fallback), usedPaths);
    const language = languageFromInfo(info, path);
    files.push({
      path,
      content: match[2],
      language,
      mimeType: mimeTypeFor(path, language),
    });
  }
  return files;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  };
}

function joinBytes(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function buildZipBytes(files, options = {}) {
  const root = sanitizeRelativePath(options.rootFolder || "freev-nova-projet", "freev-nova-projet").replace(/\/+$/, "");
  const entries = (Array.isArray(files) ? files : []).slice(0, MAX_GENERATED_FILES).map((file) => {
    const path = sanitizeRelativePath(file?.path, "fichier.txt");
    const name = encoder.encode(`${root}/${path}`);
    const content = encoder.encode(String(file?.content ?? ""));
    return { name, content, crc: crc32(content) };
  });
  if (!entries.length) throw new Error("Aucun fichier à ajouter au ZIP.");
  if (entries.length > 0xffff) throw new Error("Le projet contient trop de fichiers pour un ZIP standard.");

  const { date, time } = dosDateTime(options.date instanceof Date ? options.date : new Date());
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const entry of entries) {
    const local = new Uint8Array(30 + entry.name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, entry.crc, true);
    localView.setUint32(18, entry.content.length, true);
    localView.setUint32(22, entry.content.length, true);
    localView.setUint16(26, entry.name.length, true);
    localView.setUint16(28, 0, true);
    local.set(entry.name, 30);
    localParts.push(local, entry.content);

    const central = new Uint8Array(46 + entry.name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, entry.crc, true);
    centralView.setUint32(20, entry.content.length, true);
    centralView.setUint32(24, entry.content.length, true);
    centralView.setUint16(28, entry.name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    central.set(entry.name, 46);
    centralParts.push(central);
    localOffset += local.length + entry.content.length;
  }

  const centralDirectory = joinBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);
  return joinBytes([...localParts, centralDirectory, end]);
}
