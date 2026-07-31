import {
  AVATAR_PARTS,
  createAvatarConfig,
  normalizeAvatarConfig,
  renderAvatarSvg,
} from "./avatar-generator.js";
import { migrateProfile } from "./profile-schema.js";
import {
  applyThemeConfig,
  DEFAULT_THEME_CONFIG,
  normalizeThemeConfig,
} from "./theme-engine.js";

const PART_LABELS = Object.freeze({
  face: "Visage",
  eyes: "Regard",
  mouth: "Expression",
  hair: "Coiffe",
  outfit: "Tenue",
  backdrop: "Fond",
});

const VALUE_LABELS = Object.freeze({
  orb: "Orbe",
  shield: "Bouclier",
  capsule: "Capsule",
  crystal: "Cristal",
  spark: "Étincelle",
  visor: "Visière",
  orbit: "Orbite",
  pixel: "Pixel",
  signal: "Signal",
  smile: "Sourire",
  dash: "Trait",
  pulse: "Pulsation",
  halo: "Halo",
  flare: "Flamme",
  crown: "Couronne",
  none: "Aucune",
  core: "Cœur",
  pilot: "Pilote",
  matrix: "Matrice",
  nova: "Nova",
  rings: "Anneaux",
  grid: "Grille",
  comet: "Comète",
  portal: "Portail",
});

const state = {
  avatar: createAvatarConfig("freev"),
  theme: { ...DEFAULT_THEME_CONFIG },
  initialized: false,
};

const element = (tag, attributes = {}, text = "") => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "className") node.className = value;
    else if (name === "dataset") Object.assign(node.dataset, value);
    else if (name in node && typeof value !== "object") node[name] = value;
    else node.setAttribute(name, value);
  }
  if (text) node.textContent = text;
  return node;
};

function randomSeed() {
  const bytes = new Uint32Array(2);
  globalThis.crypto?.getRandomValues?.(bytes);
  return `freev-${Date.now().toString(36)}-${[...bytes].map((value) => value.toString(36)).join("")}`;
}

function renderCompactAvatar() {
  const preview = document.getElementById("profile-avatar-preview");
  if (!preview) return;
  preview.dataset.freevAvatarReady = "true";
  preview.replaceChildren();
  preview.insertAdjacentHTML("afterbegin", renderAvatarSvg(state.avatar, { title: "Mon avatar Freev ID" }));
}

function decorateProfileAvatars() {
  const targets = [
    document.querySelector("#firebase-user-data > div span:first-child"),
    document.querySelector("#open-login-modal > span:first-child"),
    document.querySelector("#open-login-modal-mobile > span:first-child"),
  ].filter(Boolean);
  for (const target of targets) {
    target.dataset.freevAvatarReady = "true";
    target.style.background = "#020617";
    target.replaceChildren();
    target.insertAdjacentHTML("afterbegin", renderAvatarSvg(state.avatar, { title: "Avatar Freev ID" }));
  }
}

function updateAvatarStage() {
  const stage = document.getElementById("freev-avatar-stage");
  if (stage) {
    stage.replaceChildren();
    stage.insertAdjacentHTML("afterbegin", renderAvatarSvg(state.avatar, { title: "Aperçu de mon avatar Freev ID" }));
  }
  renderCompactAvatar();
  decorateProfileAvatars();
  const legacyColor = document.getElementById("profile-avatar-color");
  if (legacyColor) legacyColor.value = state.avatar.palette.primary;
}

function updateAvatarFromControls() {
  const seed = document.getElementById("freev-avatar-seed")?.value || state.avatar.seed;
  const parts = Object.fromEntries(
    Object.keys(AVATAR_PARTS).map((category) => [
      category,
      document.getElementById(`freev-avatar-${category}`)?.value,
    ]),
  );
  const palette = Object.fromEntries(
    ["primary", "secondary", "accent", "skin"].map((color) => [
      color,
      document.getElementById(`freev-avatar-color-${color}`)?.value,
    ]),
  );
  state.avatar = normalizeAvatarConfig({ seed, parts, palette });
  updateAvatarStage();
}

function syncAvatarControls() {
  const seed = document.getElementById("freev-avatar-seed");
  if (seed) seed.value = state.avatar.seed;
  for (const [category, value] of Object.entries(state.avatar.parts)) {
    const select = document.getElementById(`freev-avatar-${category}`);
    if (select) select.value = value;
  }
  for (const [color, value] of Object.entries(state.avatar.palette)) {
    const input = document.getElementById(`freev-avatar-color-${color}`);
    if (input) input.value = value;
  }
  updateAvatarStage();
}

function updateThemeFromControls() {
  state.theme = normalizeThemeConfig({
    preset: document.body.dataset.freevBanner || state.theme.preset,
    intensity: document.getElementById("freev-theme-intensity")?.value,
    speed: document.getElementById("freev-theme-speed")?.value,
    particles: document.getElementById("freev-theme-particles")?.value,
    reduceMotion: document.getElementById("freev-theme-reduce-motion")?.checked,
  });
  applyThemeConfig(state.theme);
  for (const property of ["intensity", "speed", "particles"]) {
    const output = document.getElementById(`freev-theme-${property}-output`);
    if (output) output.value = String(state.theme[property]);
  }
}

function syncThemeControls() {
  for (const property of ["intensity", "speed", "particles"]) {
    const input = document.getElementById(`freev-theme-${property}`);
    const output = document.getElementById(`freev-theme-${property}-output`);
    if (input) input.value = String(state.theme[property]);
    if (output) output.value = String(state.theme[property]);
  }
  const reduceMotion = document.getElementById("freev-theme-reduce-motion");
  if (reduceMotion) reduceMotion.checked = state.theme.reduceMotion;
  applyThemeConfig(state.theme);
}

function setActivePanel(panelId) {
  document.querySelectorAll(".freev-id-tab").forEach((tab) => {
    const active = tab.dataset.panel === panelId;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".freev-id-panel").forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
}

function createAvatarPanel() {
  const panel = element("section", {
    id: "freev-id-avatar-panel",
    className: "freev-id-panel",
    role: "tabpanel",
  });
  const workbench = element("div", { className: "freev-avatar-workbench" });
  workbench.append(element("div", {
    id: "freev-avatar-stage",
    className: "freev-avatar-stage",
    "aria-live": "polite",
  }));

  const controls = element("div");
  const seedLabel = element("label", { className: "freev-id-field" }, "Graine unique");
  seedLabel.append(element("input", {
    id: "freev-avatar-seed",
    maxLength: 64,
    autocomplete: "off",
    spellcheck: false,
  }));
  controls.append(seedLabel);

  const parts = element("div", { className: "freev-id-parts" });
  for (const [category, values] of Object.entries(AVATAR_PARTS)) {
    const label = element("label", { className: "freev-id-field" }, PART_LABELS[category]);
    const select = element("select", { id: `freev-avatar-${category}` });
    for (const value of values) {
      select.append(element("option", { value }, VALUE_LABELS[value] || value));
    }
    select.addEventListener("change", updateAvatarFromControls);
    label.append(select);
    parts.append(label);
  }
  controls.append(parts);

  const colors = element("div", { className: "freev-id-colors" });
  for (const [key, label] of [["primary", "Primaire"], ["secondary", "Secondaire"], ["accent", "Accent"], ["skin", "Peau"]]) {
    const colorLabel = element("label", { className: "freev-id-color" }, label);
    const input = element("input", { id: `freev-avatar-color-${key}`, type: "color" });
    input.addEventListener("input", updateAvatarFromControls);
    colorLabel.append(input);
    colors.append(colorLabel);
  }
  controls.append(colors);

  const actions = element("div", { className: "freev-id-actions" });
  const regenerate = element("button", { className: "freev-id-action", type: "button" }, "Nouvelle identité");
  regenerate.addEventListener("click", () => {
    state.avatar = createAvatarConfig(randomSeed());
    syncAvatarControls();
  });
  const remix = element("button", { className: "freev-id-action", type: "button" }, "Remixer les formes");
  remix.addEventListener("click", () => {
    state.avatar = createAvatarConfig(`${state.avatar.seed}-${Date.now().toString(36)}`, {
      palette: state.avatar.palette,
    });
    syncAvatarControls();
  });
  actions.append(regenerate, remix);
  controls.append(actions);
  workbench.append(controls);
  panel.append(workbench);
  panel.append(element(
    "p",
    { className: "freev-id-note" },
    "Artwork procédural conçu pour Freev : aucune image, licence ou style d’avatar tiers n’est incorporé.",
  ));
  return panel;
}

function createThemePanel() {
  const panel = element("section", {
    id: "freev-id-theme-panel",
    className: "freev-id-panel",
    role: "tabpanel",
    hidden: true,
  });
  const controls = element("div", { className: "freev-theme-controls" });

  for (const [property, label, maximum] of [
    ["intensity", "Intensité visuelle", 100],
    ["speed", "Vitesse d’animation", 100],
    ["particles", "Densité maximale", 80],
  ]) {
    const field = element("label", { className: "freev-theme-control" });
    const row = element("span", { className: "freev-theme-control__row" });
    row.append(element("span", {}, label), element("output", { id: `freev-theme-${property}-output` }));
    const input = element("input", {
      id: `freev-theme-${property}`,
      type: "range",
      min: 0,
      max: maximum,
      step: 1,
    });
    input.addEventListener("input", updateThemeFromControls);
    field.append(row, input);
    controls.append(field);
  }

  const motion = element("label", { className: "freev-motion-toggle" });
  const checkbox = element("input", { id: "freev-theme-reduce-motion", type: "checkbox" });
  checkbox.addEventListener("change", updateThemeFromControls);
  motion.append(checkbox, element("span", {}, "Réduire les mouvements et désactiver les animations décoratives"));
  controls.append(motion);
  panel.append(controls);
  panel.append(element(
    "p",
    { className: "freev-id-note" },
    "Les limites empêchent une animation excessive. Le réglage système « réduire les animations » reste prioritaire.",
  ));
  return panel;
}

function buildStudio() {
  if (document.getElementById("freev-id-studio")) return;
  const legacyAvatarCard = document.querySelector(".profile-avatar-card");
  if (!legacyAvatarCard) return;

  const studio = element("section", { id: "freev-id-studio", className: "freev-id-studio" });
  const header = element("div", { className: "freev-id-studio__header" });
  const copy = element("div");
  copy.append(
    element("h3", { className: "text-sm font-bold text-white" }, "Atelier Freev ID V2"),
    element("p", { className: "text-xs text-gray-500" }, "Crée une identité originale, reproductible et légère."),
  );
  header.append(copy, element("span", { className: "freev-id-studio__badge" }, "100 % Freev"));

  const tabs = element("div", { className: "freev-id-tabs", role: "tablist" });
  for (const [panel, label] of [["freev-id-avatar-panel", "Avatar original"], ["freev-id-theme-panel", "Ambiance avancée"]]) {
    const tab = element("button", {
      className: "freev-id-tab",
      type: "button",
      role: "tab",
      dataset: { panel },
      "aria-controls": panel,
      "aria-selected": String(panel === "freev-id-avatar-panel"),
      tabIndex: panel === "freev-id-avatar-panel" ? 0 : -1,
    }, label);
    tab.addEventListener("click", () => setActivePanel(panel));
    tabs.append(tab);
  }
  studio.append(header, tabs, createAvatarPanel(), createThemePanel());
  legacyAvatarCard.insertAdjacentElement("afterend", studio);

  document.getElementById("freev-avatar-seed")?.addEventListener("change", () => {
    const seed = document.getElementById("freev-avatar-seed")?.value;
    state.avatar = createAvatarConfig(seed, { palette: state.avatar.palette });
    syncAvatarControls();
  });
}

function loadProfile(profile = {}) {
  const migrated = migrateProfile(profile);
  state.avatar = migrated.avatar;
  state.theme = migrated.theme;
  syncAvatarControls();
  syncThemeControls();
  queueMicrotask(decorateProfileAvatars);
}

function getProfileExtras() {
  const preset = document.body.dataset.freevBanner || state.theme.preset;
  state.theme = normalizeThemeConfig({ ...state.theme, preset });
  return {
    schemaVersion: 2,
    avatar: normalizeAvatarConfig(state.avatar),
    theme: state.theme,
  };
}

function initialize() {
  if (state.initialized) return;
  buildStudio();
  if (!document.getElementById("freev-id-studio")) return;
  state.initialized = true;
  syncAvatarControls();
  syncThemeControls();

  window.addEventListener("freev:profile-loaded", (event) => loadProfile(event.detail?.profile || {}));
  window.addEventListener("freev:auth-ready", () => {
    const profile = window.FreevAuthActions?.getCurrentProfile?.();
    if (profile) loadProfile(profile);
  });
  document.querySelectorAll("[data-profile-banner]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = normalizeThemeConfig({ ...state.theme, preset: button.dataset.profileBanner });
      applyThemeConfig(state.theme);
    });
  });

  document.getElementById("profile-avatar-color")?.addEventListener("input", (event) => {
    state.avatar = normalizeAvatarConfig({
      ...state.avatar,
      palette: { ...state.avatar.palette, primary: event.target.value },
    });
    syncAvatarControls();
  });
  document.getElementById("profile-nickname")?.addEventListener("input", () => {
    queueMicrotask(renderCompactAvatar);
  });

  const currentProfile = window.FreevAuthActions?.getCurrentProfile?.();
  if (currentProfile) loadProfile(currentProfile);
}

window.FreevIDV2 = Object.freeze({
  getProfileExtras,
  loadProfile,
  renderAvatarMarkup: (avatar, title) => renderAvatarSvg(avatar, { title }),
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
