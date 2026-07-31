import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountExport,
  buildPublicProfile,
  calculateSquareCrop,
  normalizeDeviceRecord,
  normalizePublicProfileId,
} from "../js/freev-id/account-data.js";

test("un profil public ne contient aucune donnée privée", () => {
  const publicProfile = buildPublicProfile({
    uid: "uid-prive",
    email: "prive@example.com",
    nickname: "Freev_User",
    displayName: "Freev User",
    bio: "Profil partagé volontairement",
    photo: { path: "users/uid-prive/avatars/profile.webp" },
    memories: [{ content: "secret" }],
    aiConfig: { secretId: "secret" },
  });

  assert.equal(publicProfile.nicknameLower, "freev_user");
  for (const forbidden of ["uid", "email", "photo", "memories", "aiConfig", "ownerUid"]) {
    assert.equal(forbidden in publicProfile, false);
  }
});

test("un identifiant de profil public invalide est refusé", () => {
  assert.equal(normalizePublicProfileId("<script>"), "");
  assert.throws(() => buildPublicProfile({ nickname: "x" }), /surnom public valide/i);
});

test("un appareil est borné et validé avant enregistrement", () => {
  const device = normalizeDeviceRecord({
    id: "device_123456",
    label: "Mon navigateur".repeat(20),
    platform: "Windows",
  });
  assert.equal(device.id, "device_123456");
  assert.equal(device.label.length, 80);
  assert.throws(() => normalizeDeviceRecord({ id: "court" }), /appareil invalide/i);
});

test("l’export global convertit les timestamps sans altérer les collections", () => {
  const payload = buildAccountExport({
    uid: "user-123",
    profile: { nickname: "Freev", updatedAt: { seconds: 1_700_000_000, nanoseconds: 0 } },
    collections: { memories: [{ id: "memory-1", enabled: true }] },
    exportedAt: new Date("2026-07-31T10:00:00.000Z"),
  });
  assert.equal(payload.format, "freev-account-export");
  assert.equal(payload.account.profile.updatedAt, "2023-11-14T22:13:20.000Z");
  assert.deepEqual(payload.collections.memories, [{ id: "memory-1", enabled: true }]);
});

test("le recadrage carré reste centré et limite le zoom", () => {
  assert.deepEqual(calculateSquareCrop({ width: 1200, height: 800, zoom: 2 }), {
    sourceX: 400,
    sourceY: 200,
    sourceSize: 400,
  });
  assert.equal(calculateSquareCrop({ width: 100, height: 50, zoom: 99 }).sourceSize, 50 / 3);
});
