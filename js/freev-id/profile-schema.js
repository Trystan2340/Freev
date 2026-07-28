import { createAvatarConfig, normalizeAvatarConfig } from "./avatar-generator.js";
import { normalizeThemeConfig } from "./theme-engine.js";

export const FREEV_PROFILE_SCHEMA_VERSION = 2;

const FAVORITE_TYPES = new Set(["logiciels", "jeux", "ia", "tout"]);

function text(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

function normalizeNickname(value) {
  return text(value, 24).replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]/gu, "");
}

export function migrateProfile(input = {}) {
  const nickname = normalizeNickname(input.nickname);
  const avatarBase = input.avatar || createAvatarConfig(nickname || input.uid || "freev", {
    palette: { primary: input.avatarColor },
  });
  const themeBase = input.theme || { preset: input.bannerTheme };

  return {
    ...input,
    schemaVersion: FREEV_PROFILE_SCHEMA_VERSION,
    nickname,
    nicknameLower: nickname.toLocaleLowerCase("fr-FR"),
    displayName: text(input.displayName || nickname, 40),
    bio: text(input.bio, 160),
    favoriteType: FAVORITE_TYPES.has(input.favoriteType) ? input.favoriteType : "tout",
    avatar: normalizeAvatarConfig(avatarBase),
    theme: normalizeThemeConfig(themeBase),
    avatarColor: normalizeAvatarConfig(avatarBase).palette.primary,
    bannerTheme: normalizeThemeConfig(themeBase).preset,
  };
}

export function sanitizePublicProfile(input = {}) {
  const migrated = migrateProfile(input);
  return {
    nickname: migrated.nickname,
    nicknameLower: migrated.nicknameLower,
    displayName: migrated.displayName,
    bio: migrated.bio,
    avatar: migrated.avatar,
    theme: {
      preset: migrated.theme.preset,
      intensity: migrated.theme.intensity,
      speed: migrated.theme.speed,
      reduceMotion: migrated.theme.reduceMotion,
    },
  };
}
