import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const firestoreRules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const storageRules = await readFile(new URL("../storage.rules", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("les badges et l'XP ne peuvent pas être attribués par le navigateur", () => {
  assert.match(firestoreRules, /match \/achievements\/\{achievementId\}[\s\S]*?allow write: if false;/);
});

test("les profils publics sont séparés des comptes privés", () => {
  assert.match(firestoreRules, /match \/publicProfiles\/\{nicknameLower\}/);
  assert.match(firestoreRules, /keys\(\)\.hasOnly\(\[[\s\S]*?'avatar', 'theme'/);
});

test("la projection publique n'enregistre jamais ownerUid et refuse l'énumération", () => {
  const publicRules = firestoreRules.slice(
    firestoreRules.indexOf("match /publicProfiles/{nicknameLower}"),
  );

  assert.doesNotMatch(publicRules, /request\.resource\.data\.ownerUid/);
  assert.match(publicRules, /allow list: if false;/);
});

test("Storage refuse SVG et limite les images raster à deux Mio", () => {
  assert.match(storageRules, /request\.resource\.size < 2 \* 1024 \* 1024/);
  assert.match(storageRules, /image\/\(png\|jpeg\|webp\)/);
  assert.doesNotMatch(storageRules, /image\/svg/);
});

test("le service worker ne met en cache que les requêtes locales GET", () => {
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /!url\.pathname\.includes\("\/api\/"\)/);
});
