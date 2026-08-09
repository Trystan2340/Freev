import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le catalogue utilise les huit icônes officielles distinctes", async () => {
  const [catalogSource, renderer] = await Promise.all([
    read("data/catalog.json"),
    read("js/catalog-pages.js"),
  ]);
  const catalog = JSON.parse(catalogSource);
  const iconIds = catalog.softwares.map((software) => software.iconId);
  assert.equal(iconIds.length, 8);
  assert.equal(new Set(iconIds).size, 8);
  assert.match(renderer, /setAttribute\('variant', 'standard'\)/);
  assert.doesNotMatch(renderer, /setAttribute\('variant', 'glass'\)/);
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
