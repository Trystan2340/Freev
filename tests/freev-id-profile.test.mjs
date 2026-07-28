import assert from "node:assert/strict";
import test from "node:test";

import {
  FREEV_PROFILE_SCHEMA_VERSION,
  migrateProfile,
  sanitizePublicProfile,
} from "../js/freev-id/profile-schema.js";

test("un ancien profil est migré sans perdre ses champs historiques", () => {
  const profile = migrateProfile({
    uid: "user-123",
    nickname: "Trystan",
    displayName: "Trystan B",
    avatarColor: "#22d3ee",
    bannerTheme: "vortex",
    bio: "Créateur de Freev",
    favoriteType: "tout",
  });

  assert.equal(profile.schemaVersion, FREEV_PROFILE_SCHEMA_VERSION);
  assert.equal(profile.nickname, "Trystan");
  assert.equal(profile.avatar.palette.primary, "#22d3ee");
  assert.equal(profile.theme.preset, "vortex");
});

test("le profil public ne divulgue jamais email, uid ou préférences privées", () => {
  const publicProfile = sanitizePublicProfile({
    uid: "secret-uid",
    email: "secret@example.com",
    nickname: "Freev_User",
    displayName: "Freev User",
    bio: "Bonjour",
    favoriteType: "ia",
    avatar: { seed: "freev-user" },
    theme: { preset: "aurora" },
    memories: [{ text: "privé" }],
  });

  assert.deepEqual(Object.keys(publicProfile).sort(), [
    "avatar",
    "bio",
    "displayName",
    "nickname",
    "nicknameLower",
    "theme",
  ]);
  assert.equal(publicProfile.nicknameLower, "freev_user");
  assert.equal("email" in publicProfile, false);
  assert.equal("uid" in publicProfile, false);
});
