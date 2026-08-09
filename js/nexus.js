import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});
const API_BASE = "https://freev-iies.onrender.com";
const BACKGROUNDS = Object.freeze({ midnight: "#050914", nebula: "#0B1021", graphite: "#111827" });
const MODULE_LABELS = Object.freeze({
  dashboard: "Tableau de bord",
  maintenance: "Maintenance",
  design: "Design global",
  roles: "Accès Nova",
  icons: "Pipeline d’icônes",
  bugs: "Suivi des bugs",
  legal: "Documents légaux",
});
const MODULE_STATES = Object.freeze({
  active: "Actif",
  "nova-access-manager": "Géré dans Nova",
  "pipeline-cli-only": "Pipeline local vérifié",
  "read-only": "Lecture seule",
  "published-files": "Pages publiées",
});

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const byId = (id) => document.getElementById(id);
let currentUser = null;
let busy = false;

function setTopStatus(message, kind = "") {
  const node = byId("nexus-status");
  node.textContent = message;
  node.dataset.kind = kind;
}

function setFormStatus(id, message, kind = "") {
  const node = byId(id);
  node.textContent = message;
  node.dataset.kind = kind;
}

function setBusy(value) {
  busy = value;
  document.querySelectorAll("#nexus-dashboard button").forEach((button) => {
    button.disabled = value;
  });
}

async function appCheckToken() {
  if (window.FreevFirebase?.getAppCheckToken) {
    return window.FreevFirebase.getAppCheckToken().catch(() => "");
  }
  return "";
}

async function request(path, options = {}) {
  if (!currentUser) throw new Error("Connecte-toi d’abord à ton compte Freev.");
  const token = await currentUser.getIdToken(Boolean(options.forceRefresh));
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  const checkToken = await appCheckToken();
  if (checkToken) headers["X-Firebase-AppCheck"] = checkToken;
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.body ? "POST" : "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) {
    const error = new Error(payload.error || "Action NEXUS refusée.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showGate(title, message, kind = "error") {
  byId("nexus-gate-title").textContent = title;
  byId("nexus-gate-copy").textContent = message;
  byId("nexus-gate").classList.remove("hidden");
  byId("nexus-dashboard").classList.add("hidden");
  byId("nexus-signout").classList.toggle("hidden", !currentUser);
  setTopStatus(title, kind);
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function maintenancePayload() {
  const expected = byId("maintenance-expected").value;
  return {
    enabled: byId("maintenance-enabled").checked,
    scope: byId("maintenance-scope").value,
    modules: Array.from(byId("maintenance-modules").querySelectorAll("input:checked"), (input) => input.value),
    publicTitle: byId("maintenance-public-title").value.trim(),
    publicMessage: byId("maintenance-public-message").value.trim(),
    expectedBackAt: expected ? new Date(expected).toISOString() : null,
    reasonInternal: byId("maintenance-reason").value.trim(),
    confirmation: byId("maintenance-confirmation").value.trim(),
  };
}

function designPayload() {
  return {
    primary: byId("design-primary").value.toUpperCase(),
    secondary: byId("design-secondary").value.toUpperCase(),
    background: byId("design-background").value,
    iconTheme: byId("design-icon-theme").value,
    iconVariant: byId("design-icon-variant").value,
    motion: byId("design-motion").value,
    cardRadius: Number(byId("design-radius").value),
    density: byId("design-density").value,
    confirmation: byId("design-confirmation").value.trim(),
  };
}

function applyPreview(design) {
  if (!design) return;
  const root = document.documentElement;
  root.style.setProperty("--freev-primary", design.primary);
  root.style.setProperty("--freev-secondary", design.secondary);
  root.style.setProperty("--freev-card-radius", `${design.cardRadius}px`);
  if (BACKGROUNDS[design.background]) root.style.setProperty("--nexus-bg", BACKGROUNDS[design.background]);
  byId("design-preview").style.setProperty("--freev-primary", design.primary);
  byId("design-preview").style.setProperty("--freev-secondary", design.secondary);
}

function renderMaintenance(maintenance = {}) {
  byId("maintenance-enabled").checked = maintenance.enabled === true;
  byId("maintenance-scope").value = maintenance.scope === "module" ? "module" : "global";
  const modules = new Set(Array.isArray(maintenance.modules) ? maintenance.modules : []);
  byId("maintenance-modules").querySelectorAll("input").forEach((input) => {
    input.checked = modules.has(input.value);
  });
  byId("maintenance-public-title").value = maintenance.publicTitle || "Maintenance Freev";
  byId("maintenance-public-message").value = maintenance.publicMessage || "Freev revient bientôt. Merci pour ta patience.";
  byId("maintenance-expected").value = localDateTime(maintenance.expectedBackAt);
  byId("maintenance-reason").value = maintenance.reasonInternal || "";
  byId("maintenance-confirmation").value = "";
  const enabled = maintenance.enabled === true;
  byId("maintenance-state").textContent = enabled ? "Maintenance active" : "Site ouvert";
  byId("maintenance-state").dataset.kind = enabled ? "error" : "ok";
  updateMaintenanceFields();
}

function updateMaintenanceFields() {
  const moduleScope = byId("maintenance-scope").value === "module";
  byId("maintenance-modules").hidden = !moduleScope;
  byId("maintenance-confirm-box").hidden = !(byId("maintenance-enabled").checked && !moduleScope);
}

function renderDesign(design = {}) {
  byId("design-primary").value = design.primary || "#22D3EE";
  byId("design-secondary").value = design.secondary || "#A855F7";
  byId("design-background").value = design.background || "midnight";
  byId("design-icon-theme").value = design.iconTheme || "cyan";
  byId("design-icon-variant").value = design.iconVariant || "glass";
  byId("design-motion").value = design.motion || "normal";
  byId("design-density").value = design.density || "comfortable";
  byId("design-radius").value = String(design.cardRadius || 22);
  byId("design-radius-output").value = String(design.cardRadius || 22);
  byId("design-confirmation").value = "";
  byId("design-version").textContent = `V${design.version || 1}`;
  applyPreview({ ...design, cardRadius: design.cardRadius || 22 });
}

function renderModules(modules = {}) {
  const container = byId("nexus-modules");
  container.replaceChildren();
  Object.entries(MODULE_LABELS).forEach(([key, label]) => {
    const card = document.createElement("article");
    card.className = "module-card";
    card.dataset.state = modules[key] || "unknown";
    const title = document.createElement("strong");
    title.textContent = label;
    const status = document.createElement("span");
    status.textContent = MODULE_STATES[modules[key]] || "Non disponible";
    card.append(title, status);
    container.append(card);
  });
}

function renderAudit(audit = []) {
  const container = byId("nexus-audit");
  container.replaceChildren();
  if (!audit.length) {
    const empty = document.createElement("p");
    empty.className = "form-status";
    empty.textContent = "Aucune action enregistrée.";
    container.append(empty);
    return;
  }
  audit.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "audit-entry";
    const title = document.createElement("strong");
    title.textContent = String(entry.action || "Action NEXUS");
    const summary = document.createElement("span");
    summary.textContent = `${entry.target || "Freev"} · ${entry.summary || ""}`;
    const time = document.createElement("time");
    const date = new Date(entry.createdAt || "");
    time.textContent = Number.isNaN(date.getTime()) ? "Date inconnue" : date.toLocaleString("fr-FR");
    article.append(title, summary, time);
    container.append(article);
  });
}

function renderState(state) {
  renderMaintenance(state.maintenance);
  renderDesign(state.design);
  renderModules(state.modules);
  renderAudit(state.audit);
  byId("nexus-gate").classList.add("hidden");
  byId("nexus-dashboard").classList.remove("hidden");
  byId("nexus-signout").classList.remove("hidden");
  setTopStatus("NEXUS actif", "ok");
}

async function verifyAccess(forceRefresh = false) {
  if (!currentUser) {
    showGate("Connexion requise", "Connecte-toi sur le site principal avec ton compte Freev, puis reviens ici.");
    return;
  }
  setTopStatus("Vérification…");
  try {
    if (forceRefresh) await currentUser.getIdToken(true);
    renderState(await request("/api/nexus/state", { forceRefresh }));
  } catch (error) {
    const title = error.status === 403 ? "Accès NEXUS fermé" : "Session à revérifier";
    showGate(title, error.message || "Impossible de vérifier ton accès.");
  }
}

byId("nexus-retry").addEventListener("click", () => verifyAccess(true));
byId("nexus-signout").addEventListener("click", () => signOut(auth));
byId("maintenance-scope").addEventListener("change", updateMaintenanceFields);
byId("maintenance-enabled").addEventListener("change", updateMaintenanceFields);
byId("design-radius").addEventListener("input", () => {
  byId("design-radius-output").value = byId("design-radius").value;
});

byId("maintenance-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  setFormStatus("maintenance-status", "Enregistrement sécurisé…");
  try {
    const result = await request("/api/nexus/maintenance", { body: maintenancePayload() });
    renderMaintenance(result.maintenance);
    setFormStatus("maintenance-status", "Maintenance enregistrée et journalisée.", "success");
  } catch (error) {
    setFormStatus("maintenance-status", error.message, "error");
  } finally {
    setBusy(false);
  }
});

byId("design-preview-button").addEventListener("click", async () => {
  if (busy) return;
  setBusy(true);
  setFormStatus("design-status", "Validation de l’aperçu…");
  try {
    const result = await request("/api/nexus/design/preview", { body: designPayload() });
    applyPreview(result.design);
    setFormStatus("design-status", `Aperçu valide · contraste ${result.design.contrast}:1 · rien n’a été publié.`, "success");
  } catch (error) {
    setFormStatus("design-status", error.message, "error");
  } finally {
    setBusy(false);
  }
});

byId("design-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  setFormStatus("design-status", "Publication sécurisée…");
  try {
    const result = await request("/api/nexus/design/publish", { body: designPayload() });
    renderDesign(result.design);
    setFormStatus("design-status", "Design publié pour tout Freev.", "success");
  } catch (error) {
    setFormStatus("design-status", error.message, "error");
  } finally {
    setBusy(false);
  }
});

byId("design-rollback-button").addEventListener("click", async () => {
  if (busy || !window.confirm("Restaurer la version précédente du design Freev ?")) return;
  setBusy(true);
  setFormStatus("design-status", "Restauration sécurisée…");
  try {
    const result = await request("/api/nexus/design/rollback", { body: { confirmation: "RESTAURER LE DESIGN" } });
    renderDesign(result.design);
    setFormStatus("design-status", "Version précédente restaurée.", "success");
  } catch (error) {
    setFormStatus("design-status", error.message, "error");
  } finally {
    setBusy(false);
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  verifyAccess();
}, () => showGate("Session Firebase invalide", "Reconnecte-toi sur le site principal."));
