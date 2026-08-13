import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le catalogue utilise les quinze icônes officielles distinctes", async () => {
  const [catalogSource, renderer, home, softwarePage, gitignore] = await Promise.all([
    read("data/catalog.json"),
    read("js/catalog-pages.js"),
    read("index.html"),
    read("logiciels/index.html"),
    read(".gitignore"),
  ]);
  const catalog = JSON.parse(catalogSource);
  const iconIds = catalog.softwares.map((software) => software.iconId);
  assert.equal(iconIds.length, 15);
  assert.equal(new Set(iconIds).size, 15);
  assert.match(renderer, /setAttribute\('variant', 'standard'\)/);
  assert.doesNotMatch(renderer, /setAttribute\('variant', 'glass'\)/);
  assert.match(home, /freev-icons\/dist\/freev-icon\.js/);
  assert.match(softwarePage, /freev-icons\/dist\/freev-icon\.js/);
  for (const iconId of iconIds) {
    assert.match(home, new RegExp(`app="${iconId}"`));
  }
  assert.match(gitignore, /!freev-icons\/dist\/\*\*/);
});

test("aucun joueur fictif ne reste dans le catalogue", async () => {
  const [catalogSource, renderer] = await Promise.all([
    read("data/catalog.json"),
    read("js/catalog-pages.js"),
  ]);
  const catalog = JSON.parse(catalogSource);
  assert.equal("leaderboards" in catalog, false);
  assert.doesNotMatch(catalogSource, /NeoPlayer|PixelMaster|TronRider|CyberGhost/);
  assert.match(renderer, /loadArcadeLeaderboard/);
  assert.match(renderer, /Personne n’a encore de score/);
});

test("Excalidraw est auto-hébergé, crédité et raccordé au cloud borné", async () => {
  const [page, notices, cloudAdapters, packageSource, version] = await Promise.all([
    read("logiciels/excalidraw.html"),
    read("THIRD_PARTY_NOTICES.md"),
    read("js/freev-id/cloud-adapters.js"),
    read("package.json"),
    read("logiciels/vendor/excalidraw/VERSION.txt"),
  ]);
  const packageJson = JSON.parse(packageSource);
  assert.equal(packageJson.dependencies["@excalidraw/excalidraw"], "0.18.1");
  assert.match(page, /vendor\/excalidraw\/app\.js/);
  assert.match(page, /Retour aux logiciels/);
  assert.match(page, /app="Excalidraw"/);
  assert.match(notices, /excalidraw\/excalidraw/);
  assert.match(cloudAdapters, /freev-excalidraw-cloud-v1/);
  assert.match(version, /abeeaeba217ab3b5193b78c8d8d63c373b518ced/);
});

test("OpenCut est auto-hébergé, crédité et adapté sans services serveur", async () => {
	const [page, notices, cloudAdapters, version, license, catalogSource, noJekyll] = await Promise.all([
    read("logiciels/opencut/index.html"),
    read("THIRD_PARTY_NOTICES.md"),
    read("js/freev-id/cloud-adapters.js"),
    read("logiciels/opencut/VERSION.txt"),
    read("logiciels/opencut/LICENSE"),
		read("data/catalog.json"),
		read(".nojekyll"),
  ]);
  assert.match(page, /OpenCut — Freev/);
  assert.match(page, /\.\/_next\/static\/chunks/);
  assert.match(notices, /OpenCut-app\/OpenCut/);
  assert.match(cloudAdapters, /freev-opencut-cloud-v1/);
  assert.match(version, /f4bd689f51cf12a4dd0a32f602f761be314d9686/);
  assert.match(version, /server, account, blog and API routes excluded/i);
  assert.match(license, /Permission is hereby granted, free of charge/);
	assert.match(catalogSource, /"iconId": "OpenCut"/);
	assert.match(noJekyll, /publier les dossiers techniques/);
});

test("chaque jeu publie son score via le module Firebase commun", async () => {
  const games = [
    ["jeux/neonsnake.html", "neonsnake"],
    ["jeux/pacman.html", "pacman"],
    ["jeux/beatjump.html", "beatjump"],
    ["jeux/cyberpong.html", "cyberpong"],
    ["jeux/tron.html", "tron"],
    ["jeux/astrominer.html", "astrominer"],
    ["jeux/towerblock.html", "towerblock"],
  ];
  for (const [path, gameId] of games) {
    assert.match(await read(path), new RegExp(`FreevLeaderboard\\?\\.submit\\('${gameId}'`));
  }
  const leaderboard = await read("js/freev-id/leaderboard.js");
  assert.match(leaderboard, /gameLeaderboards/);
  assert.doesNotMatch(leaderboard, /email\s*:/);
  assert.doesNotMatch(leaderboard, /uid\s*:/);
});

test("les pages du site chargent le fond constellation sans remplacer celui de l’accueil", async () => {
  const [loader, animation] = await Promise.all([
    read("js/pwa-register.js"),
    read("js/freev-constellation.js"),
  ]);
  assert.match(loader, /freev-constellation\.js/);
  assert.match(loader, /!document\.getElementById\("hero-canvas"\)/);
  assert.match(animation, /drawLink/);
  assert.match(animation, /prefers-reduced-motion/);
});

test("NEXUS explique et répare une adresse propriétaire non vérifiée", async () => {
  const [html, nexus] = await Promise.all([read("nexus.html"), read("js/nexus.js")]);
  assert.match(html, /nexus-send-verification/);
  assert.match(nexus, /sendEmailVerification/);
  assert.match(nexus, /currentUser\.emailVerified/);
  assert.match(nexus, /trystan\.bonnin27@icloud\.com/);
});

test("NEXUS permet de rouvrir le site sans ressaisir la maintenance", async () => {
  const [html, nexus] = await Promise.all([read("nexus.html"), read("js/nexus.js")]);
  assert.match(html, /id="maintenance-reopen"/);
  assert.match(html, /Réouverture disponible sans reconnexion récente; changements sensibles connexion récente/);
  assert.match(nexus, /maintenance-reopen/);
  assert.match(nexus, /enabled: false, confirmation: ""/);
  assert.match(nexus, /Le site Freev est de nouveau ouvert/);
});
