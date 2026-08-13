const CONFIGURATIONS = Object.freeze({
  "jeux/neonsnake.html": { pageId: "neonsnake", pageTitle: "Neon Snake", pageKind: "jeu", keys: ["neonSnakeStatsV5"] },
  "jeux/pacman.html": { pageId: "pacman", pageTitle: "Pac-Man Freev", pageKind: "jeu", keys: ["pacmanHighScore", "pacmanLeaderboard"] },
  "jeux/beatjump.html": { pageId: "beatjump", pageTitle: "BeatJump", pageKind: "jeu", keys: ["beatjump_highscore", "beatjump_prefs", "beatjump_history"] },
  "jeux/cyberpong.html": { pageId: "cyberpong", pageTitle: "CyberPong", pageKind: "jeu", keys: ["CyberPongLegendaryStatsV2", "CyberPongLegendarySettingsV2"] },
  "jeux/tron.html": { pageId: "tron", pageTitle: "Tron Ultra Plus", pageKind: "jeu", keys: ["freev-tron-ultra-plus-save", "freev-tron-ultra-plus-settings"] },
  "jeux/astrominer.html": { pageId: "astrominer", pageTitle: "AstroMiner", pageKind: "jeu", keys: ["astroMinerV3_save"] },
  "logiciels/freev-taskflow.html": { pageId: "freev-taskflow", pageTitle: "Freev TaskFlow", pageKind: "logiciel", keys: ["freev_taskflow_v3"] },
  "logiciels/streamstudiopro.html": { pageId: "streamstudio-pro", pageTitle: "Stream Studio Pro", pageKind: "logiciel", keys: ["streamstudio-settings"] },
  "logiciels/freevsketchpro.html": { pageId: "freev-sketch-pro", pageTitle: "Freev Sketch Pro", pageKind: "logiciel", keys: ["freev-sketch-pro-project-v2"] },
  "logiciels/pixelforge.html": { pageId: "pixelforge", pageTitle: "PixelForge", pageKind: "logiciel", keys: ["pixelforge-studio-autosave-v2"] },
  "logiciels/resumemaster.html": { pageId: "resumemaster", pageTitle: "ResumeMaster", pageKind: "logiciel", keys: ["resumemaster-studio-v2"] },
  "logiciels/freevconvert.html": { pageId: "freevconvert", pageTitle: "Freev Convert", pageKind: "logiciel", keys: ["freev-history", "freev-theme", "freev-favorites"] },
  // Seul le coffre principal déjà chiffré est synchronisé. Le leurre et les
  // compteurs de verrouillage restent strictement propres à l'appareil.
  "logiciels/coffre.html": { pageId: "coffre", pageTitle: "Coffre Freev", pageKind: "logiciel", keys: ["datavault_v1", "datavault_autolock", "datavault_view_mode"] },
  // CodeMaster conserve ses gros fichiers dans IndexedDB. Ce premier adaptateur
  // synchronise le workspace de compatibilité ; l'export de projet reste la
  // voie fiable pour les actifs volumineux.
  "logiciels/codemaster.html": { pageId: "codemaster", pageTitle: "CodeMaster", pageKind: "logiciel", keys: ["codemaster_v4_workspace"] },
  // La scène sans média volumineux peut suivre le cloud. Le projet complet,
  // notamment les images, reste sauvegardé localement dans IndexedDB.
  "logiciels/excalidraw.html": { pageId: "excalidraw", pageTitle: "Excalidraw", pageKind: "logiciel", keys: ["freev-excalidraw-cloud-v1"] },
});

function normalizePath(pathname) {
  return decodeURIComponent(String(pathname || ""))
    .replaceAll("\\", "/")
    .split("?")[0]
    .replace(/^\/+/, "")
    .toLocaleLowerCase("fr-FR");
}

export function cloudConfigurationForPath(pathname) {
  const normalized = normalizePath(pathname);
  const match = Object.entries(CONFIGURATIONS).find(([path]) => normalized.endsWith(path));
  return match ? { ...match[1], keys: [...match[1].keys], pagePath: match[0] } : null;
}

export function captureConfiguredStorage(storage, configuration, maximumBytes = 700_000) {
  if (!configuration?.keys?.length) return {};
  const values = {};
  for (const key of configuration.keys) {
    const value = storage.getItem(key);
    if (value !== null) values[key] = value;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(values)).byteLength;
  if (bytes > maximumBytes) throw new RangeError("La sauvegarde locale dépasse la limite cloud de 700 ko.");
  return values;
}

export function applyConfiguredStorage(storage, configuration, values) {
  if (!configuration?.keys?.length || !values || typeof values !== "object") return 0;
  let applied = 0;
  for (const key of configuration.keys) {
    if (!(key in values)) continue;
    const value = values[key];
    if (typeof value !== "string") continue;
    storage.setItem(key, value);
    applied += 1;
  }
  return applied;
}

export function hasConfiguredData(values) {
  return Boolean(values && typeof values === "object" && Object.keys(values).length);
}
