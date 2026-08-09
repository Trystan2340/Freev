import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getBytes,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

const PROJECT_ID = "demo-freev-id-v2";
const OWNER_UID = "owner-freev-id";
const OTHER_UID = "other-freev-id";
const OWNER_EMAIL = "trystan.bonnin27@icloud.com";
const NICKNAME = "freev_test";
const HAS_FIRESTORE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const emulatorTest = HAS_FIRESTORE_EMULATOR ? test : test.skip;

let testEnvironment;

const publicProfile = (overrides = {}) => ({
  nickname: "Freev_Test",
  nicknameLower: NICKNAME,
  displayName: "Freev Test",
  bio: "Profil public de test",
  avatar: { seed: "freev-test", styleVersion: 1 },
  theme: { preset: "aurora", intensity: 68 },
  publishedAt: Timestamp.fromMillis(1_700_000_000_000),
  updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  ...overrides,
});

async function seedNicknameOwner(uid = OWNER_UID) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "usernames", NICKNAME), {
      uid,
      nicknameLower: NICKNAME,
    });
  });
}

before(async () => {
  if (!HAS_FIRESTORE_EMULATOR) return;
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
    storage: {
      rules: await readFile(new URL("../storage.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  if (!HAS_FIRESTORE_EMULATOR) return;
  await Promise.all([
    testEnvironment.clearFirestore(),
    testEnvironment.clearStorage(),
  ]);
});

after(async () => {
  await testEnvironment?.cleanup();
});

emulatorTest("un ancien profil contenant ownerUid n'est jamais lisible publiquement", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicProfiles", NICKNAME), publicProfile({
      ownerUid: OWNER_UID,
    }));
  });

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymousDb, "publicProfiles", NICKNAME)));
});

emulatorTest("le propriétaire publie une projection sans UID et un visiteur peut la lire", async () => {
  await seedNicknameOwner();
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const publicRef = doc(ownerDb, "publicProfiles", NICKNAME);

  await assertSucceeds(setDoc(publicRef, publicProfile()));

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const snapshot = await assertSucceeds(
    getDoc(doc(anonymousDb, "publicProfiles", NICKNAME)),
  );

  assert.equal(snapshot.exists(), true);
  assert.equal("ownerUid" in snapshot.data(), false);
});

emulatorTest("un autre compte ne peut ni modifier ni remplacer le profil public", async () => {
  await seedNicknameOwner();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicProfiles", NICKNAME), publicProfile());
  });

  const otherDb = testEnvironment.authenticatedContext(OTHER_UID).firestore();
  await assertFails(updateDoc(doc(otherDb, "publicProfiles", NICKNAME), {
    bio: "Profil détourné",
    updatedAt: Timestamp.fromMillis(1_700_000_100_000),
  }));
});

emulatorTest("un profil public refuse UID, email, photo privée, mémoire et secret", async () => {
  await seedNicknameOwner();
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const forbiddenFields = [
    { ownerUid: OWNER_UID },
    { email: "prive@example.com" },
    { photo: { path: `users/${OWNER_UID}/avatars/profile.webp` } },
    { memories: [{ content: "secret" }] },
    { secretId: "a".repeat(40) },
  ];

  for (const fields of forbiddenFields) {
    await assertFails(setDoc(
      doc(ownerDb, "publicProfiles", NICKNAME),
      publicProfile(fields),
    ));
  }
});

emulatorTest("le propriétaire peut mettre à jour les champs publics autorisés", async () => {
  await seedNicknameOwner();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicProfiles", NICKNAME), publicProfile());
  });

  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  await assertSucceeds(updateDoc(doc(ownerDb, "publicProfiles", NICKNAME), {
    bio: "Bio mise à jour",
    updatedAt: Timestamp.fromMillis(1_700_000_100_000),
  }));
});

emulatorTest("le propriétaire peut retirer ownerUid d'un ancien profil", async () => {
  await seedNicknameOwner();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicProfiles", NICKNAME), publicProfile({
      ownerUid: OWNER_UID,
    }));
  });

  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  await assertSucceeds(setDoc(
    doc(ownerDb, "publicProfiles", NICKNAME),
    publicProfile({ updatedAt: Timestamp.fromMillis(1_700_000_100_000) }),
  ));

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const snapshot = await assertSucceeds(
    getDoc(doc(anonymousDb, "publicProfiles", NICKNAME)),
  );
  assert.equal("ownerUid" in snapshot.data(), false);
});

emulatorTest("les visiteurs peuvent ouvrir un profil connu sans lister la collection", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "publicProfiles", NICKNAME), publicProfile());
  });

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anonymousDb, "publicProfiles", NICKNAME)));
  await assertFails(getDocs(collection(anonymousDb, "publicProfiles")));
});

emulatorTest("le registre des surnoms ne divulgue pas les UID aux visiteurs", async () => {
  await seedNicknameOwner();
  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const signedInDb = testEnvironment.authenticatedContext(OTHER_UID).firestore();

  await assertFails(getDoc(doc(anonymousDb, "usernames", NICKNAME)));
  await assertFails(getDocs(collection(anonymousDb, "usernames")));
  await assertSucceeds(getDoc(doc(signedInDb, "usernames", NICKNAME)));
});

emulatorTest("un membre inscrit publie un score sans exposer son UID", async () => {
  await seedNicknameOwner();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", OWNER_UID), {
      uid: OWNER_UID,
      nickname: "Freev_Test",
      nicknameLower: NICKNAME,
    });
  });
  const score = {
    gameId: "pacman",
    nickname: "Freev_Test",
    nicknameLower: NICKNAME,
    globalScore: 4200,
    weekScore: 4200,
    weekKey: "2026-W32",
    monthScore: 4200,
    monthKey: "2026-08",
    updatedAt: Timestamp.now(),
  };
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const scoreRef = doc(ownerDb, "gameLeaderboards", "pacman", "scores", NICKNAME);
  await assertSucceeds(setDoc(scoreRef, score));

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const snapshot = await assertSucceeds(
    getDoc(doc(anonymousDb, "gameLeaderboards", "pacman", "scores", NICKNAME)),
  );
  assert.equal(snapshot.data().nickname, "Freev_Test");
  assert.equal("uid" in snapshot.data(), false);
  await assertSucceeds(getDocs(collection(anonymousDb, "gameLeaderboards", "pacman", "scores")));
});

emulatorTest("un visiteur, un faux surnom et un champ privé sont refusés dans le classement", async () => {
  await seedNicknameOwner();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", OWNER_UID), {
      uid: OWNER_UID,
      nickname: "Freev_Test",
      nicknameLower: NICKNAME,
    });
  });
  const score = {
    gameId: "pacman",
    nickname: "Freev_Test",
    nicknameLower: NICKNAME,
    globalScore: 1200,
    weekScore: 1200,
    weekKey: "2026-W32",
    monthScore: 1200,
    monthKey: "2026-08",
    updatedAt: Timestamp.now(),
  };
  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID).firestore();
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const scoreRef = doc(ownerDb, "gameLeaderboards", "pacman", "scores", NICKNAME);

  await assertFails(setDoc(doc(anonymousDb, "gameLeaderboards", "pacman", "scores", NICKNAME), score));
  await assertFails(setDoc(doc(otherDb, "gameLeaderboards", "pacman", "scores", NICKNAME), score));
  await assertFails(setDoc(scoreRef, { ...score, email: "prive@example.com" }));
  await assertFails(setDoc(scoreRef, { ...score, nickname: "FauxJoueur" }));
});

emulatorTest("la configuration NEXUS publique est lisible mais non modifiable par un visiteur", async () => {
  const maintenance = {
    enabled: false,
    scope: "global",
    modules: [],
    publicTitle: "Maintenance Freev",
    publicMessage: "Freev revient bientôt. Merci pour ta patience.",
    expectedBackAt: null,
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "sitePublic", "maintenance"), maintenance);
  });

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anonymousDb, "sitePublic", "maintenance")));
  await assertFails(setDoc(doc(anonymousDb, "sitePublic", "maintenance"), maintenance));
  await assertFails(getDocs(collection(anonymousDb, "sitePublic")));
});

emulatorTest("seul le compte propriétaire peut publier la maintenance NEXUS", async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const maintenance = {
    enabled: true,
    scope: "module",
    modules: ["games", "nova"],
    publicTitle: "Maintenance de deux espaces",
    publicMessage: "Les jeux et Nova reviennent bientôt.",
    expectedBackAt: Timestamp.fromMillis(1_700_000_100_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  };
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
    auth_time: nowSeconds,
  }).firestore();
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID, {
    email: "autre@example.com",
  }).firestore();

  await assertSucceeds(setDoc(doc(ownerDb, "sitePublic", "maintenance"), maintenance));
  await assertFails(setDoc(doc(otherDb, "sitePublic", "maintenance"), maintenance));
  const unverifiedOwnerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: false,
    auth_time: nowSeconds,
  }).firestore();
  await assertFails(setDoc(doc(unverifiedOwnerDb, "sitePublic", "maintenance"), maintenance));
  const staleOwnerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
    auth_time: nowSeconds - (60 * 60),
  }).firestore();
  await assertFails(setDoc(doc(staleOwnerDb, "sitePublic", "maintenance"), maintenance));
  await assertFails(setDoc(doc(staleOwnerDb, "siteAdmin", "maintenance"), {
    ...maintenance,
    reasonInternal: "Maintenance planifiée",
    updatedBy: OWNER_UID,
  }));
  await assertFails(setDoc(doc(ownerDb, "sitePublic", "maintenance"), {
    ...maintenance,
    reasonInternal: "champ privé interdit",
  }));
});

emulatorTest("une ancienne session propriétaire peut seulement rouvrir un site en maintenance", async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const updatedAt = Timestamp.now();
  const publicMaintenance = {
    enabled: true,
    scope: "global",
    modules: [],
    publicTitle: "Maintenance Freev",
    publicMessage: "Freev revient bientôt. Merci pour ta patience.",
    expectedBackAt: null,
    updatedAt,
  };
  const privateMaintenance = {
    ...publicMaintenance,
    reasonInternal: "Maintenance planifiée",
    updatedBy: OWNER_UID,
  };

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await Promise.all([
      setDoc(doc(context.firestore(), "sitePublic", "maintenance"), publicMaintenance),
      setDoc(doc(context.firestore(), "siteAdmin", "maintenance"), privateMaintenance),
    ]);
  });

  const oldOwnerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
    auth_time: nowSeconds - (24 * 60 * 60),
  }).firestore();
  const publicRef = doc(oldOwnerDb, "sitePublic", "maintenance");
  const privateRef = doc(oldOwnerDb, "siteAdmin", "maintenance");
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID, {
    email: "autre@example.com",
    email_verified: true,
    auth_time: nowSeconds - (24 * 60 * 60),
  }).firestore();
  const unverifiedOwnerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: false,
    auth_time: nowSeconds - (24 * 60 * 60),
  }).firestore();
  const futureOwnerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
    auth_time: nowSeconds + (60 * 60),
  }).firestore();
  const disablePublic = {
    enabled: false,
    updatedAt: Timestamp.now(),
  };
  const disablePrivate = {
    ...disablePublic,
    updatedBy: OWNER_UID,
  };

  await assertFails(updateDoc(doc(otherDb, "sitePublic", "maintenance"), disablePublic));
  await assertFails(updateDoc(doc(otherDb, "siteAdmin", "maintenance"), disablePrivate));
  await assertFails(updateDoc(doc(unverifiedOwnerDb, "sitePublic", "maintenance"), disablePublic));
  await assertFails(updateDoc(doc(unverifiedOwnerDb, "siteAdmin", "maintenance"), disablePrivate));
  await assertFails(updateDoc(doc(futureOwnerDb, "sitePublic", "maintenance"), disablePublic));
  await assertFails(updateDoc(doc(futureOwnerDb, "siteAdmin", "maintenance"), disablePrivate));

  await assertFails(updateDoc(publicRef, {
    enabled: false,
    updatedAt: Timestamp.fromMillis(Date.now() - (10 * 60 * 1000)),
  }));
  await assertFails(updateDoc(publicRef, {
    enabled: false,
    updatedAt: Timestamp.fromMillis(Date.now() + (10 * 60 * 1000)),
  }));
  await assertFails(updateDoc(privateRef, {
    enabled: false,
    updatedAt: Timestamp.fromMillis(Date.now() - (10 * 60 * 1000)),
    updatedBy: OWNER_UID,
  }));
  await assertFails(updateDoc(privateRef, {
    enabled: false,
    updatedAt: Timestamp.fromMillis(Date.now() + (10 * 60 * 1000)),
    updatedBy: OWNER_UID,
  }));
  await assertFails(updateDoc(publicRef, {
    enabled: false,
    publicMessage: "Message modifié pendant la réouverture.",
    updatedAt: Timestamp.now(),
  }));
  await assertFails(updateDoc(privateRef, {
    enabled: false,
    publicMessage: "Message privé modifié pendant la réouverture.",
    updatedAt: Timestamp.now(),
    updatedBy: OWNER_UID,
  }));
  await assertSucceeds(updateDoc(publicRef, {
    enabled: false,
    updatedAt: Timestamp.now(),
  }));
  await assertSucceeds(updateDoc(privateRef, {
    enabled: false,
    updatedAt: Timestamp.now(),
    updatedBy: OWNER_UID,
  }));

  await assertFails(updateDoc(publicRef, {
    enabled: true,
    updatedAt: Timestamp.now(),
  }));
  await assertFails(updateDoc(privateRef, {
    enabled: true,
    updatedAt: Timestamp.now(),
    updatedBy: OWNER_UID,
  }));
  await assertFails(updateDoc(publicRef, {
    publicMessage: "Message modifié par une ancienne session.",
    updatedAt: Timestamp.now(),
  }));
  await assertFails(updateDoc(privateRef, {
    publicMessage: "Message privé modifié par une ancienne session.",
    updatedAt: Timestamp.now(),
    updatedBy: OWNER_UID,
  }));
});

emulatorTest("le design NEXUS refuse les champs bruts et les valeurs hors liste", async () => {
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
  }).firestore();
  const validDesign = {
    primary: "#22D3EE",
    secondary: "#A855F7",
    background: "midnight",
    iconTheme: "cyan",
    iconVariant: "glass",
    motion: "normal",
    cardRadius: 22,
    density: "comfortable",
    version: 2,
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  await assertSucceeds(setDoc(doc(ownerDb, "sitePublic", "design"), validDesign));
  await assertFails(setDoc(doc(ownerDb, "sitePublic", "design"), {
    ...validDesign,
    css: "body{display:none}",
  }));
  await assertFails(setDoc(doc(ownerDb, "sitePublic", "design"), {
    ...validDesign,
    iconVariant: "inconnue",
  }));
});

emulatorTest("le journal NEXUS est privé et immuable", async () => {
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID, {
    email: OWNER_EMAIL,
    email_verified: true,
  }).firestore();
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID, {
    email: "autre@example.com",
  }).firestore();
  const auditId = "20260809T120000Z-abcdef123456";
  const entry = {
    id: auditId,
    action: "maintenance-enabled",
    target: "global",
    summary: "Maintenance planifiée",
    actorUid: OWNER_UID,
    actorEmail: OWNER_EMAIL,
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  await assertSucceeds(setDoc(doc(ownerDb, "nexusAudit", auditId), entry));
  await assertSucceeds(getDoc(doc(ownerDb, "nexusAudit", auditId)));
  await assertFails(getDoc(doc(otherDb, "nexusAudit", auditId)));
  await assertFails(updateDoc(doc(ownerDb, "nexusAudit", auditId), {
    summary: "Journal modifié",
  }));
});

emulatorTest("les mémoires Nova restent privées et bornées", async () => {
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID).firestore();
  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const memory = {
    id: "memory_12345678",
    title: "Préférence explicite",
    content: "Toujours répondre en français.",
    enabled: true,
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  await assertSucceeds(setDoc(doc(ownerDb, "users", OWNER_UID, "memories", memory.id), memory));
  await assertFails(getDoc(doc(otherDb, "users", OWNER_UID, "memories", memory.id)));
  await assertFails(getDoc(doc(anonymousDb, "users", OWNER_UID, "memories", memory.id)));
  await assertFails(setDoc(doc(ownerDb, "users", OWNER_UID, "memories", "memory_too_big"), {
    ...memory,
    id: "memory_too_big",
    content: "x".repeat(4001),
  }));
});

emulatorTest("l’inventaire des appareils ne peut être lu ou modifié que par son propriétaire", async () => {
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  const otherDb = testEnvironment.authenticatedContext(OTHER_UID).firestore();
  const device = {
    id: "web_12345678",
    label: "Chrome · ordinateur",
    platform: "Windows",
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    lastSeenAt: Timestamp.fromMillis(1_700_000_000_000),
  };

  await assertSucceeds(setDoc(doc(ownerDb, "users", OWNER_UID, "devices", device.id), device));
  await assertFails(getDoc(doc(otherDb, "users", OWNER_UID, "devices", device.id)));
  await assertFails(setDoc(doc(otherDb, "users", OWNER_UID, "devices", device.id), device));
});

emulatorTest("le navigateur ne peut pas attribuer d’XP ou de succès", async () => {
  const ownerDb = testEnvironment.authenticatedContext(OWNER_UID).firestore();
  await assertFails(setDoc(doc(ownerDb, "users", OWNER_UID, "achievements", "level-1"), {
    id: "level-1",
    xp: 100,
  }));

  await assertFails(setDoc(doc(ownerDb, "users", OWNER_UID), {
    uid: OWNER_UID,
    progression: { xp: 100_000, level: 99 },
  }));

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", OWNER_UID), {
      uid: OWNER_UID,
      progression: { xp: 25, level: 1 },
    });
  });
  await assertFails(updateDoc(doc(ownerDb, "users", OWNER_UID), {
    "progression.xp": 100_000,
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, "users", OWNER_UID), {
    displayName: "Profil autorisé",
    updatedAt: Timestamp.fromMillis(1_700_000_100_000),
  }));
});

emulatorTest("un avatar raster valide reste privé au propriétaire", async () => {
  const ownerStorage = testEnvironment.authenticatedContext(OWNER_UID).storage();
  const otherStorage = testEnvironment.authenticatedContext(OTHER_UID).storage();
  const anonymousStorage = testEnvironment.unauthenticatedContext().storage();
  const path = `users/${OWNER_UID}/avatars/avatar.png`;
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  await assertSucceeds(uploadBytes(storageRef(ownerStorage, path), bytes, {
    contentType: "image/png",
  }));
  await assertSucceeds(getBytes(storageRef(ownerStorage, path)));
  await assertFails(getBytes(storageRef(otherStorage, path)));
  await assertFails(getBytes(storageRef(anonymousStorage, path)));
});

emulatorTest("Storage refuse les SVG et les fichiers de deux Mio ou plus", async () => {
  const ownerStorage = testEnvironment.authenticatedContext(OWNER_UID).storage();
  const svgRef = storageRef(ownerStorage, `users/${OWNER_UID}/avatars/avatar.svg`);
  const largeRef = storageRef(ownerStorage, `users/${OWNER_UID}/avatars/avatar-large.png`);

  await assertFails(uploadBytes(svgRef, new TextEncoder().encode("<svg></svg>"), {
    contentType: "image/svg+xml",
  }));
  await assertFails(uploadBytes(largeRef, new Uint8Array(2 * 1024 * 1024), {
    contentType: "image/png",
  }));
});
