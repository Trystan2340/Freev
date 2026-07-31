import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const root = fileURLToPath(new URL("../", import.meta.url));

async function htmlPages(folder = "") {
  const pages = [];
  for (const entry of await readdir(join(root, folder), { withFileTypes: true })) {
    const relativePath = join(folder, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git", "test-results", "playwright-report"].includes(entry.name)) {
      pages.push(...await htmlPages(relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      pages.push(relativePath.replaceAll("\\", "/"));
    }
  }
  return pages;
}

test("Tailwind est compilé localement sur toutes les pages publiées", async () => {
  const pages = await htmlPages();
  assert.ok(pages.length >= 20);
  for (const page of pages) {
    const html = await read(page);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, page);
  }
  await access(new URL("../css/tailwind.generated.css", import.meta.url));
});

test("les trois interfaces sensibles appliquent la CSP et le suivi anonymisé", async () => {
  for (const page of ["index.html", "nova.html", "profil.html"]) {
    const html = await read(page);
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /object-src 'none'/);
    assert.doesNotMatch(html, /script-src[^;]*'unsafe-inline'/);
    assert.match(html, /js\/error-monitor\.js/);
    assert.match(html, /freev-app-check-site-key/);
  }
});

test("Google, Apple et le second facteur SMS sont raccordés sans secret client", async () => {
  const [html, auth, account] = await Promise.all([
    read("index.html"),
    read("js/freev-auth.js"),
    read("js/freev-id/account-center.js"),
  ]);
  assert.match(html, /data-auth-provider="google"/);
  assert.match(html, /data-auth-provider="apple"/);
  assert.match(auth, /GoogleAuthProvider/);
  assert.match(auth, /OAuthProvider\("apple\.com"\)/);
  assert.match(auth, /getMultiFactorResolver/);
  assert.match(account, /PhoneMultiFactorGenerator/);
  assert.match(account, /multiFactor\(state\.user\)\.enroll/);
  assert.doesNotMatch(`${html}\n${auth}\n${account}`, /-----BEGIN PRIVATE KEY-----/);
});

test("le manifeste hors-ligne couvre chaque page et chaque page enregistre la PWA", async () => {
  const source = await read("offline-manifest.js");
  const match = source.match(/^self\.FREEV_OFFLINE_MANIFEST = ([\s\S]+);\s*$/);
  assert.ok(match, "manifeste hors-ligne invalide");
  const manifest = JSON.parse(match[1]);
  assert.match(manifest.version, /^[a-f0-9]{16}$/);
  assert.ok(manifest.assets.length >= 70);
  for (const normalized of await htmlPages()) {
    assert.ok(manifest.assets.includes(`./${normalized}`), `${normalized} absent du manifeste`);
    assert.match(await read(normalized), /pwa-register\.js/, `${normalized} n’enregistre pas la PWA`);
  }
});

test("le moniteur client retire les emails, clés et requêtes des sources", async () => {
  const monitor = await read("js/error-monitor.js");
  assert.match(monitor, /\[email\]/);
  assert.match(monitor, /\[redacted\]/);
  assert.match(monitor, /\.pathname\.split/);
  assert.doesNotMatch(monitor, /\.stack/);
});
