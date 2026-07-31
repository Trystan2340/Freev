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
