import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.appspot.com",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const RENDER_BASE = "https://freev-iies.onrender.com";
const MAX_PIPELINE_MODELS = 5;
const HISTORY_LIMIT = 40;

const CAPABILITIES = Object.freeze([
  ["general", "Généraliste"],
  ["reasoning", "Raisonnement"],
  ["code", "Code"],
  ["review", "Tests / relecture"],
  ["vision", "Vision"],
  ["research", "Recherche"],
  ["tools", "Appels d’outils"],
  ["memory", "Mémoire / embeddings"],
]);

const CODE_MODES = Object.freeze([
  {
    id: "spark",
    name: "NOVA-SPARK",
    label: "Sprint précis",
    description: "Pipeline court pour corriger, expliquer ou produire un petit module rapidement.",
    recommendation: "Un modèle spécialisé code de taille moyenne, complété si possible par un modèle de relecture.",
    capabilities: ["code", "review"],
    system: "Tu es NOVA-SPARK. Produis une solution courte, directement utilisable et relue. Ne révèle pas de raisonnement interne. Signale clairement les hypothèses et les tests utiles.",
  },
  {
    id: "archon",
    name: "NOVA-ARCHON",
    label: "Architecture contrôlée",
    description: "Analyse, architecture, production puis contrôle pour une évolution structurée.",
    recommendation: "Un modèle de raisonnement à grand contexte, un modèle code solide et un relecteur indépendant.",
    capabilities: ["reasoning", "code", "review"],
    system: "Tu es NOVA-ARCHON. Cadre le besoin, propose une architecture sobre, puis livre un résultat complet et vérifiable. Ne révèle pas de chaîne de pensée privée.",
  },
  {
    id: "codex",
    name: "NOVA-CODEX",
    label: "Équipe de construction",
    description: "Pipeline multi-modèles pour les projets complexes, avec analyse et audit final.",
    recommendation: "Une équipe de trois à cinq modèles : généraliste, raisonnement, code, tests et éventuellement vision.",
    capabilities: ["general", "reasoning", "code", "review", "vision"],
    system: "Tu es NOVA-CODEX. Travaille comme une équipe de production : contraintes, architecture, implémentation, vérification et réponse finale concise. N’invente aucune exécution et ne révèle pas de raisonnement interne.",
  },
]);

const COUNCIL = Object.freeze([
  { id: "buddy", name: "Buddy", short: "BU", role: "Coordination", color: "#3f7cff", capabilities: ["general", "reasoning"], recommendation: "Un généraliste fiable avec bon suivi d’instructions et contexte long.", system: "Tu es Buddy, coordinatrice du Conseil Freev. Résume les objectifs, répartis le travail et présente une décision claire." },
  { id: "axiom", name: "Axiom", short: "AX", role: "Architecture", color: "#8b5cf6", capabilities: ["reasoning", "code"], recommendation: "Un modèle de raisonnement et d’architecture avec un contexte d’au moins 32k.", system: "Tu es Axiom, architecte Freev. Cadre le périmètre, les dépendances, les risques et l’ordre de mise en œuvre." },
  { id: "forge", name: "Forge Prime", short: "FP", role: "Développement", color: "#ff7a1a", capabilities: ["code", "tools"], recommendation: "Un modèle spécialisé code, idéalement 14B ou plus, bon en projets multi-fichiers.", system: "Tu es Forge Prime, développeur principal. Fournis du code propre, complet et testable sans prétendre modifier des fichiers." },
  { id: "auditor", name: "Auditor", short: "AU", role: "Tests et qualité", color: "#facc15", capabilities: ["review", "reasoning"], recommendation: "Un modèle différent du développeur, fort en critique, tests et détection de régressions.", system: "Tu es Auditor. Recherche les bugs, incohérences, risques de régression et tests manquants. Donne des preuves concrètes." },
  { id: "navigator", name: "Navigator", short: "NV", role: "Recherche et stratégie", color: "#22d3ee", capabilities: ["research", "general"], recommendation: "Un modèle avec recherche ou RAG, citations et grande fenêtre de contexte.", system: "Tu es Navigator. Clarifie les recherches nécessaires, distingue les faits des hypothèses et demande des sources à jour lorsque nécessaire." },
  { id: "iris", name: "Iris", short: "IR", role: "Vision et interfaces", color: "#f472b6", capabilities: ["vision", "reasoning"], recommendation: "Un modèle multimodal capable de lire captures, interfaces, schémas et erreurs visuelles.", system: "Tu es Iris. Analyse les interfaces et les éléments visuels fournis, puis décris les problèmes observables et les corrections." },
  { id: "pixel", name: "Pixel", short: "PX", role: "Design et animation", color: "#a855f7", capabilities: ["vision", "general"], recommendation: "Un modèle multimodal orienté design, accessibilité et cohérence visuelle.", system: "Tu es Pixel. Propose une direction visuelle cohérente, accessible, responsive et adaptée à l’identité Freev." },
  { id: "operator", name: "Operator", short: "OP", role: "Actions contrôlées", color: "#94a3b8", capabilities: ["tools", "vision"], recommendation: "Un modèle avec appels d’outils structurés, confirmations humaines et journal d’actions.", system: "Tu es Operator. Décris les actions proposées sans jamais prétendre les exécuter. Toute action sensible exige une validation humaine." },
  { id: "sentinel", name: "Sentinel", short: "SE", role: "Sécurité", color: "#10b981", capabilities: ["review", "reasoning"], recommendation: "Un modèle prudent pour revue de sécurité, associé à des règles fixes non contournables.", system: "Tu es Sentinel. Identifie les risques de sécurité, protège les secrets et exige des confirmations pour toute opération sensible." },
  { id: "archivist", name: "Archivist", short: "AR", role: "Mémoire", color: "#2dd4bf", capabilities: ["memory", "general"], recommendation: "Un modèle d’embeddings pour la recherche et un petit généraliste pour la synthèse.", system: "Tu es Archivist. Classe les décisions, résume les résultats et indique ce qui doit être retrouvé plus tard sans inventer de souvenir." },
]);

const ALL_TARGETS = Object.freeze([
  ...CODE_MODES.map((item) => ({ ...item, kind: "mode" })),
  ...COUNCIL.map((item) => ({ ...item, label: item.role, description: item.recommendation, kind: "creature" })),
]);

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  entitlement: null,
  isAdmin: false,
  models: [],
  assignments: new Map(),
  history: [],
  mode: "spark",
  councilEnabled: false,
  councilTargets: new Set(["buddy", "axiom", "forge", "auditor", "sentinel"]),
  sending: false,
  adminUsers: [],
  adminEntitlements: new Map(),
};

const byId = (id) => document.getElementById(id);
const currentMode = () => CODE_MODES.find((item) => item.id === state.mode) || CODE_MODES[0];
const targetById = (id) => ALL_TARGETS.find((item) => item.id === id);
const modelById = (id) => state.models.find((item) => item.id === id);
const assignmentFor = (id) => (state.assignments.get(id) || []).map(modelById).filter(Boolean);

function setStatus(message, kind = "wait") {
  const pill = byId("nova-access-pill");
  if (!pill) return;
  pill.className = `status-pill ${kind === "ok" ? "ok" : kind === "error" ? "error" : ""}`;
  pill.innerHTML = '<span class="status-dot"></span>';
  pill.append(document.createTextNode(` ${message}`));
}

let toastTimer = 0;
function toast(message, kind = "ok") {
  const element = byId("nova-toast");
  if (!element) return;
  window.clearTimeout(toastTimer);
  element.textContent = message;
  element.className = `toast show ${kind === "error" ? "error" : ""}`;
  toastTimer = window.setTimeout(() => { element.className = "toast"; }, 4200);
}

function errorMessage(error) {
  const code = String(error?.code || "");
  const known = {
    "auth/invalid-credential": "Email ou mot de passe incorrect.",
    "auth/too-many-requests": "Trop de tentatives. Réessaie plus tard.",
    "auth/network-request-failed": "Connexion Firebase impossible.",
    "permission-denied": "Firebase refuse cette opération.",
  };
  return known[code] || String(error?.message || "Erreur inconnue");
}

function openDialog(id) {
  const dialog = byId(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function showGate(title, copy, stateName) {
  byId("nova-gate")?.classList.remove("hidden");
  byId("nova-workspace")?.classList.add("hidden");
  byId("nova-gate-title").textContent = title;
  byId("nova-gate-copy").textContent = copy;
  byId("nova-login-form")?.classList.toggle("hidden", stateName !== "signed-out");
  byId("nova-locked-actions")?.classList.toggle("hidden", stateName !== "locked");
}

function showWorkspace() {
  byId("nova-gate")?.classList.add("hidden");
  byId("nova-workspace")?.classList.remove("hidden");
  byId("nova-signout-button")?.classList.remove("hidden");
  setStatus("Nova actif", "ok");
}

async function authHeaders() {
  if (!state.user) throw new Error("Connexion Firebase requise");
  return {
    Accept: "application/json",
    Authorization: `Bearer ${await state.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

async function renderRequest(path, options = {}) {
  const response = await fetch(`${RENDER_BASE}${path}`, {
    ...options,
    headers: { ...(await authHeaders()), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

async function loadAccess() {
  const access = await renderRequest("/api/nova/access", { method: "GET" });
  state.entitlement = access;
  return access;
}

async function detectAdmin() {
  if (!state.user) return false;
  try {
    await getDocs(query(collection(db, "users"), limit(1)));
    state.isAdmin = true;
  } catch (_) {
    state.isAdmin = false;
  }
  byId("nova-admin-button")?.classList.toggle("hidden", !state.isAdmin);
  return state.isAdmin;
}

function cleanProfile(raw, id = "") {
  const source = raw?.source === "local" ? "local" : "api";
  const capabilities = Array.isArray(raw?.capabilities)
    ? raw.capabilities.map(String).filter((item) => CAPABILITIES.some(([key]) => key === item)).slice(0, 8)
    : [];
  return {
    id: String(raw?.id || id).slice(0, 80),
    label: String(raw?.label || "Modèle sans nom").slice(0, 60),
    source,
    baseUrl: String(raw?.baseUrl || "").trim().replace(/\/+$/, "").slice(0, 500),
    model: String(raw?.model || "").trim().slice(0, 200),
    secretId: source === "api" && /^[a-f0-9]{40}$/.test(String(raw?.secretId || "")) ? String(raw.secretId) : "",
    capabilities,
    createdAt: raw?.createdAt || null,
  };
}

async function loadNovaData() {
  const uid = state.user.uid;
  const [modelSnap, assignmentSnap, historySnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "novaModels")),
    getDocs(collection(db, "users", uid, "novaAssignments")),
    getDocs(query(collection(db, "users", uid, "novaHistory"), orderBy("createdAt", "desc"), limit(HISTORY_LIMIT))).catch(() => null),
  ]);
  state.models = modelSnap.docs.map((item) => cleanProfile(item.data(), item.id));
  state.assignments = new Map(assignmentSnap.docs.map((item) => {
    const data = item.data();
    const ids = Array.isArray(data.modelIds) ? data.modelIds.map(String).filter(Boolean).slice(0, MAX_PIPELINE_MODELS) : [];
    return [item.id, ids];
  }));
  state.history = historySnap ? historySnap.docs.map((item) => ({ id: item.id, ...item.data() })) : [];
}

function renderModes() {
  const root = byId("nova-mode-list");
  if (!root) return;
  root.replaceChildren(...CODE_MODES.map((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mode-card ${mode.id === state.mode && !state.councilEnabled ? "active" : ""}`;
    button.dataset.mode = mode.id;
    const name = document.createElement("strong");
    name.textContent = mode.name;
    const description = document.createElement("small");
    description.textContent = mode.label;
    button.append(name, description);
    return button;
  }));
}

function renderHeader() {
  const mode = currentMode();
  const teamButton = byId("nova-team-toggle");
  teamButton?.setAttribute("aria-pressed", String(state.councilEnabled));
  byId("nova-active-kicker").textContent = state.councilEnabled ? "SALLE DE COORDINATION" : "MODE DE CODAGE";
  byId("nova-active-title").textContent = state.councilEnabled ? "CONSEIL FREEV" : mode.name;
  byId("nova-active-description").textContent = state.councilEnabled
    ? "Chaque créature utilise uniquement les modèles que tu lui as attribués."
    : mode.description;
  renderModes();
  renderPipeline();
}

function renderPipeline() {
  const root = byId("nova-pipeline");
  if (!root) return;
  const profiles = state.councilEnabled
    ? [...state.councilTargets].flatMap((id) => assignmentFor(id)).filter((item, index, list) => list.findIndex((model) => model.id === item.id) === index)
    : assignmentFor(state.mode);
  if (!profiles.length) {
    const empty = document.createElement("span");
    empty.className = "pipeline-empty";
    empty.textContent = "Aucun modèle attribué · ouvre « Modèles et équipes »";
    root.replaceChildren(empty);
    return;
  }
  root.replaceChildren(...profiles.map((profile) => {
    const node = document.createElement("span");
    node.className = "pipeline-node";
    node.textContent = `${profile.label} · ${profile.source === "local" ? "local" : "API"}`;
    return node;
  }));
}

function renderCouncil() {
  const root = byId("nova-creature-list");
  if (!root) return;
  root.replaceChildren(...COUNCIL.map((creature) => {
    const active = state.councilTargets.has(creature.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `creature-card ${active ? "active" : ""}`;
    button.dataset.creature = creature.id;
    button.style.setProperty("--creature-color", creature.color);
    button.setAttribute("aria-pressed", String(active));
    const avatar = document.createElement("span");
    avatar.className = "creature-avatar";
    avatar.textContent = creature.short;
    const copy = document.createElement("span");
    copy.className = "creature-copy";
    const name = document.createElement("strong");
    name.textContent = creature.name;
    const role = document.createElement("small");
    role.textContent = creature.role;
    copy.append(name, role);
    const count = document.createElement("span");
    count.className = "creature-model-count";
    count.textContent = String(assignmentFor(creature.id).length);
    button.append(avatar, copy, count);
    return button;
  }));
  byId("nova-council-count").textContent = String(state.councilTargets.size);
  renderPipeline();
}

function message(role, name, text, options = {}) {
  const root = byId("nova-messages");
  if (!root) return null;
  const item = document.createElement("article");
  item.className = `message ${role} ${options.thinking ? "thinking" : ""}`;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = options.short || (role === "user" ? "VO" : "NV");
  if (options.color) {
    avatar.style.color = options.color;
    avatar.style.borderColor = options.color;
  }
  const body = document.createElement("div");
  body.className = "message-body";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const author = document.createElement("strong");
  author.textContent = name;
  const time = document.createElement("span");
  time.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  meta.append(author, time);
  const content = document.createElement("div");
  content.className = "message-text";
  content.textContent = text;
  body.append(meta, content);
  item.append(avatar, body);
  root.append(item);
  root.scrollTop = root.scrollHeight;
  return { item, content };
}

function updateMessage(handle, text, thinking = false) {
  if (!handle) return;
  handle.content.textContent = text;
  handle.item.classList.toggle("thinking", thinking);
  const root = byId("nova-messages");
  if (root) root.scrollTop = root.scrollHeight;
}

function welcomeMessage() {
  const root = byId("nova-messages");
  if (!root || root.children.length) return;
  message("assistant", "Freev Nova", "Ton espace Nova est prêt. Commence par consulter les recommandations, ajoute tes propres modèles, puis attribue-les aux trois modes ou aux créatures du Conseil.", { short: "F7" });
}

function renderRecommendations() {
  const root = byId("nova-recommendations");
  if (!root) return;
  root.replaceChildren(...ALL_TARGETS.map((target) => {
    const card = document.createElement("article");
    card.className = "recommendation-card";
    const header = document.createElement("header");
    const title = document.createElement("h4");
    title.textContent = target.name;
    const kind = document.createElement("span");
    kind.className = "capability-tag";
    kind.textContent = target.kind === "mode" ? "Mode" : "Créature";
    header.append(title, kind);
    const copy = document.createElement("p");
    copy.textContent = target.recommendation;
    const tags = document.createElement("div");
    tags.className = "capability-tags";
    tags.replaceChildren(...target.capabilities.map((capability) => {
      const tag = document.createElement("span");
      tag.className = "capability-tag";
      tag.textContent = CAPABILITIES.find(([key]) => key === capability)?.[1] || capability;
      return tag;
    }));
    card.append(header, copy, tags);
    return card;
  }));
}

function renderCapabilities() {
  const root = byId("nova-capabilities");
  if (!root) return;
  root.replaceChildren(...CAPABILITIES.map(([key, label]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "capability-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "nova-capability";
    input.value = key;
    const text = document.createElement("span");
    text.textContent = label;
    wrapper.append(input, text);
    return wrapper;
  }));
}

function renderSavedModels() {
  const root = byId("nova-saved-models");
  if (!root) return;
  if (!state.models.length) {
    root.innerHTML = '<div class="empty-state">Aucun profil pour le moment. Ajoute uniquement les modèles que tu souhaites utiliser.</div>';
    return;
  }
  root.replaceChildren(...state.models.map((profile) => {
    const card = document.createElement("article");
    card.className = "saved-model";
    const copy = document.createElement("div");
    const title = document.createElement("h4");
    title.textContent = profile.label;
    const meta = document.createElement("p");
    meta.textContent = `${profile.source === "local" ? "Local" : "API chiffrée"} · ${profile.model} · ${profile.capabilities.map((item) => CAPABILITIES.find(([key]) => key === item)?.[1] || item).join(", ") || "capacités non renseignées"}`;
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "model-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "mini-button";
    edit.dataset.editModel = profile.id;
    edit.textContent = "Modifier";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mini-button danger";
    remove.dataset.deleteModel = profile.id;
    remove.textContent = "Supprimer";
    actions.append(edit, remove);
    card.append(copy, actions);
    return card;
  }));
}

function renderAssignments() {
  const root = byId("nova-assignments");
  if (!root) return;
  if (!state.models.length) {
    root.innerHTML = '<div class="empty-state">Ajoute au moins un profil dans l’étape « Mes modèles » avant de créer les équipes.</div>';
    return;
  }
  root.replaceChildren(...ALL_TARGETS.map((target) => {
    const selected = new Set(state.assignments.get(target.id) || []);
    const card = document.createElement("article");
    card.className = "assignment-card";
    card.dataset.assignment = target.id;
    const title = document.createElement("h4");
    title.textContent = target.name;
    const copy = document.createElement("p");
    copy.textContent = target.recommendation;
    const options = document.createElement("div");
    options.className = "assignment-models";
    options.replaceChildren(...state.models.map((profile) => {
      const label = document.createElement("label");
      label.className = "assignment-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = profile.id;
      input.checked = selected.has(profile.id);
      const text = document.createElement("span");
      text.textContent = `${profile.label} · ${profile.source === "local" ? "local" : "API"}`;
      label.append(input, text);
      return label;
    }));
    const save = document.createElement("button");
    save.type = "button";
    save.className = "ghost-button assignment-save";
    save.dataset.saveAssignment = target.id;
    save.textContent = "Enregistrer cette affectation";
    card.append(title, copy, options, save);
    return card;
  }));
}

function resetModelForm() {
  byId("nova-model-form")?.reset();
  byId("nova-model-id").value = "";
  byId("nova-model-source").value = "api";
  byId("nova-model-base-url").value = "";
  byId("nova-model-api-key").placeholder = "Stockée chiffrée dans Firebase";
  byId("nova-model-cancel")?.classList.add("hidden");
  byId("nova-model-status").textContent = "";
  updateSourceForm();
}

function updateSourceForm() {
  const local = byId("nova-model-source")?.value === "local";
  byId("nova-api-key-row")?.classList.toggle("hidden", local);
  const baseUrl = byId("nova-model-base-url");
  if (local && baseUrl && !baseUrl.value) baseUrl.value = "http://127.0.0.1:11434/v1";
  if (!local && baseUrl?.value.startsWith("http://127.0.0.1")) baseUrl.value = "";
}

function editModel(id) {
  const profile = modelById(id);
  if (!profile) return;
  byId("nova-model-id").value = profile.id;
  byId("nova-model-label").value = profile.label;
  byId("nova-model-source").value = profile.source;
  byId("nova-model-base-url").value = profile.baseUrl;
  byId("nova-model-name").value = profile.model;
  byId("nova-model-api-key").value = "";
  byId("nova-model-api-key").placeholder = profile.secretId ? "Clé déjà chiffrée · laisse vide pour la conserver" : "Nouvelle clé API requise";
  document.querySelectorAll('input[name="nova-capability"]').forEach((input) => { input.checked = profile.capabilities.includes(input.value); });
  byId("nova-model-cancel")?.classList.remove("hidden");
  updateSourceForm();
  byId("nova-model-label")?.focus();
}

function safeBaseUrl(value, source) {
  const url = new URL(String(value || "").trim());
  if (source === "local") {
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)) {
      throw new Error("Un modèle local doit utiliser une adresse localhost ou 127.0.0.1 en HTTP.");
    }
  } else if (url.protocol !== "https:") {
    throw new Error("Une API distante doit obligatoirement utiliser HTTPS.");
  }
  return url.toString().replace(/\/+$/, "");
}

async function saveSecret(baseUrl, model, apiKey) {
  return renderRequest("/api/provider/secrets", {
    method: "POST",
    body: JSON.stringify({ base_url: baseUrl, model, api_key: apiKey }),
  });
}

async function deleteSecret(profile) {
  if (!profile?.secretId || profile.source !== "api") return;
  await renderRequest("/api/provider/secrets/delete", {
    method: "POST",
    body: JSON.stringify({ base_url: profile.baseUrl, model: profile.model, secret_id: profile.secretId }),
  });
}

async function saveModel(event) {
  event.preventDefault();
  const status = byId("nova-model-status");
  const submit = event.submitter;
  const id = byId("nova-model-id").value || `model-${crypto.randomUUID()}`;
  const existing = modelById(id);
  const source = byId("nova-model-source").value === "local" ? "local" : "api";
  const label = byId("nova-model-label").value.trim();
  const model = byId("nova-model-name").value.trim();
  const apiKey = byId("nova-model-api-key").value.trim();
  const capabilities = [...document.querySelectorAll('input[name="nova-capability"]:checked')].map((input) => input.value).slice(0, 8);
  if (!label || !model) return;
  status.className = "form-status";
  status.textContent = "Protection et enregistrement en cours…";
  if (submit) submit.disabled = true;
  try {
    const baseUrl = safeBaseUrl(byId("nova-model-base-url").value, source);
    let secretId = "";
    const unchangedRemote = existing?.source === "api" && source === "api" && existing.baseUrl === baseUrl && existing.model === model;
    if (source === "api") {
      if (apiKey) secretId = (await saveSecret(baseUrl, model, apiKey)).secret_id;
      else if (unchangedRemote && existing.secretId) secretId = existing.secretId;
      else throw new Error("Ajoute la clé correspondant à cette nouvelle configuration API.");
    }
    const profile = { id, label: label.slice(0, 60), source, baseUrl, model: model.slice(0, 200), secretId, capabilities, createdAt: existing?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", state.user.uid, "novaModels", id), profile);
    if (existing?.secretId && (existing.baseUrl !== baseUrl || existing.model !== model || source === "local")) {
      try { await deleteSecret(existing); } catch (_) { toast("Ancienne clé non supprimée : retire-la depuis le modèle d’origine.", "error"); }
    }
    const snapshot = await getDoc(doc(db, "users", state.user.uid, "novaModels", id));
    const next = cleanProfile(snapshot.data(), id);
    const index = state.models.findIndex((item) => item.id === id);
    if (index >= 0) state.models[index] = next;
    else state.models.push(next);
    byId("nova-model-api-key").value = "";
    status.className = "form-status ok";
    status.textContent = source === "api" ? "Profil enregistré. La clé est chiffrée et absente du navigateur." : "Profil local enregistré sans clé.";
    renderSavedModels();
    renderAssignments();
    renderCouncil();
    renderPipeline();
    window.setTimeout(resetModelForm, 1000);
  } catch (error) {
    status.className = "form-status error";
    status.textContent = errorMessage(error);
  } finally {
    if (submit) submit.disabled = false;
  }
}

async function removeModel(id) {
  const profile = modelById(id);
  if (!profile || !window.confirm(`Supprimer le profil « ${profile.label} » et sa clé chiffrée éventuelle ?`)) return;
  try {
    if (profile.secretId) await deleteSecret(profile);
    await deleteDoc(doc(db, "users", state.user.uid, "novaModels", id));
    const impacted = [...state.assignments.entries()].filter(([, ids]) => ids.includes(id));
    await Promise.all(impacted.map(async ([targetId, ids]) => {
      const modelIds = ids.filter((value) => value !== id);
      await setDoc(doc(db, "users", state.user.uid, "novaAssignments", targetId), { targetId, modelIds, updatedAt: serverTimestamp() });
      state.assignments.set(targetId, modelIds);
    }));
    state.models = state.models.filter((item) => item.id !== id);
    renderSavedModels();
    renderAssignments();
    renderCouncil();
    renderPipeline();
    toast("Profil et affectations supprimés.");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

async function saveAssignment(targetId, card) {
  const modelIds = [...card.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value).slice(0, MAX_PIPELINE_MODELS);
  try {
    await setDoc(doc(db, "users", state.user.uid, "novaAssignments", targetId), { targetId, modelIds, updatedAt: serverTimestamp() });
    state.assignments.set(targetId, modelIds);
    renderCouncil();
    renderPipeline();
    toast(`Affectation ${targetById(targetId)?.name || targetId} enregistrée.`);
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function chatEndpoint(baseUrl) {
  const clean = String(baseUrl || "").replace(/\/+$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

async function callProfile(profile, messages) {
  const payload = { model: profile.model, messages, temperature: 0.25, max_tokens: 2400 };
  if (profile.source === "local") {
    const response = await fetch(chatEndpoint(profile.baseUrl), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || data?.error || `Modèle local HTTP ${response.status}`);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Le modèle local a renvoyé une réponse vide.");
    return String(content);
  }
  if (!profile.secretId) throw new Error(`La clé du profil « ${profile.label} » n’est pas configurée.`);
  const data = await renderRequest("/api/nova/provider/chat", {
    method: "POST",
    body: JSON.stringify({ base_url: profile.baseUrl, model: profile.model, secret_id: profile.secretId, messages }),
  });
  if (!data.response) throw new Error("Le fournisseur a renvoyé une réponse vide.");
  return String(data.response);
}

async function runPipeline(profiles, system, prompt, onStep) {
  let result = "";
  for (let index = 0; index < profiles.length; index += 1) {
    const profile = profiles[index];
    onStep?.(profile, index, profiles.length);
    const previous = result ? result.slice(-14000) : "Aucun résultat précédent.";
    const stageInstruction = profiles.length > 1
      ? `Tu es l’étape ${index + 1}/${profiles.length}. Examine le résultat précédent, corrige-le et fournis une version améliorée exploitable.`
      : "Réponds directement à la mission.";
    result = await callProfile(profile, [
      { role: "system", content: `${system}\n${stageInstruction}\nNe demande et ne révèle jamais de clé, jeton ou secret.` },
      { role: "user", content: `Mission :\n${prompt}\n\nRésultat précédent :\n${previous}` },
    ]);
  }
  return result;
}

async function storeHistory(kind, target, prompt, response, models) {
  const id = `nova-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const entry = { id, kind, target, prompt: prompt.slice(0, 6000), response: response.slice(0, 30000), models: models.slice(0, 20), createdAt: serverTimestamp() };
  await setDoc(doc(db, "users", state.user.uid, "novaHistory", id), entry);
  state.history.unshift({ ...entry, createdAt: Timestamp.now() });
  state.history = state.history.slice(0, HISTORY_LIMIT);
}

async function runCodeMode(prompt) {
  const mode = currentMode();
  const profiles = assignmentFor(mode.id);
  if (!profiles.length) throw new Error(`Attribue au moins un modèle à ${mode.name}.`);
  const thinking = message("assistant", mode.name, "Préparation du pipeline…", { short: mode.name.split("-")[1]?.slice(0, 2) || "NV", thinking: true });
  const result = await runPipeline(profiles, mode.system, prompt, (profile, index, total) => {
    updateMessage(thinking, `Étape ${index + 1}/${total} · ${profile.label} analyse et prépare sa contribution…`, true);
  });
  updateMessage(thinking, result || "Le pipeline n’a produit aucun contenu.", false);
  await storeHistory("mode", mode.id, prompt, result, profiles.map((item) => item.label));
}

async function runCouncil(prompt) {
  const selected = COUNCIL.filter((item) => state.councilTargets.has(item.id));
  if (!selected.length) throw new Error("Sélectionne au moins une créature du Conseil.");
  const results = [];
  const usedModels = [];
  for (const creature of selected) {
    const profiles = assignmentFor(creature.id);
    if (!profiles.length) {
      message("assistant", creature.name, "Aucun modèle ne m’est encore attribué. Configure mon équipe avant de me confier cette mission.", { short: creature.short, color: creature.color });
      continue;
    }
    const thinking = message("assistant", creature.name, "Connexion à mon équipe de modèles…", { short: creature.short, color: creature.color, thinking: true });
    try {
      const result = await runPipeline(profiles, creature.system, prompt, (profile, index, total) => {
        updateMessage(thinking, `${creature.name} · étape ${index + 1}/${total} avec ${profile.label}…`, true);
      });
      updateMessage(thinking, result, false);
      results.push(`${creature.name}: ${result}`);
      usedModels.push(...profiles.map((item) => `${creature.name}/${item.label}`));
    } catch (error) {
      updateMessage(thinking, `Connexion impossible : ${errorMessage(error)}`, false);
    }
  }
  if (!results.length) throw new Error("Aucune créature configurée n’a pu répondre.");
  await storeHistory("council", selected.map((item) => item.id).join(","), prompt, results.join("\n\n"), usedModels);
}

async function submitMission(event) {
  event.preventDefault();
  if (state.sending) return;
  const input = byId("nova-prompt");
  const prompt = input.value.trim();
  if (!prompt) return;
  message("user", "Toi", prompt, { short: "VO" });
  input.value = "";
  state.sending = true;
  byId("nova-send").disabled = true;
  try {
    if (state.councilEnabled) await runCouncil(prompt);
    else await runCodeMode(prompt);
  } catch (error) {
    message("assistant", "Freev Nova", errorMessage(error), { short: "F7" });
    if (/Attribue|Configure|Sélectionne/.test(errorMessage(error))) openConfigTab("assignments");
  } finally {
    state.sending = false;
    byId("nova-send").disabled = false;
    input.focus();
  }
}

function renderHistory() {
  const root = byId("nova-history-list");
  if (!root) return;
  if (!state.history.length) {
    root.innerHTML = '<div class="empty-state">Aucune mission Nova enregistrée.</div>';
    return;
  }
  root.replaceChildren(...state.history.map((entry) => {
    const card = document.createElement("article");
    card.className = "history-entry";
    const header = document.createElement("header");
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = entry.kind === "council" ? "Conseil Freev" : (targetById(entry.target)?.name || "Mode Nova");
    const prompt = document.createElement("p");
    prompt.textContent = String(entry.prompt || "").slice(0, 260);
    copy.append(title, prompt);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "mini-button danger";
    remove.dataset.deleteHistory = entry.id;
    remove.textContent = "Supprimer";
    header.append(copy, remove);
    const response = document.createElement("div");
    response.className = "history-response";
    response.textContent = String(entry.response || "");
    card.append(header, response);
    return card;
  }));
}

async function removeHistory(id) {
  if (!window.confirm("Supprimer cette mission de ton historique Nova ?")) return;
  try {
    await deleteDoc(doc(db, "users", state.user.uid, "novaHistory", id));
    state.history = state.history.filter((item) => item.id !== id);
    renderHistory();
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function timestampToDate(value) {
  try { return value?.toDate?.().toISOString().slice(0, 10) || ""; } catch (_) { return ""; }
}

async function loadAdminUsers() {
  if (!state.isAdmin) return;
  byId("nova-admin-users").innerHTML = '<div class="empty-state">Chargement des comptes…</div>';
  try {
    const [usersSnap, entitlementSnap] = await Promise.all([
      getDocs(query(collection(db, "users"), limit(150))),
      getDocs(query(collection(db, "novaEntitlements"), limit(150))),
    ]);
    state.adminUsers = usersSnap.docs.map((item) => ({ uid: item.id, ...item.data() }));
    state.adminEntitlements = new Map(entitlementSnap.docs.map((item) => [item.id, item.data()]));
    renderAdminUsers();
  } catch (error) {
    const message = document.createElement("div");
    message.className = "empty-state";
    message.textContent = errorMessage(error);
    byId("nova-admin-users").replaceChildren(message);
  }
}

function renderAdminUsers() {
  const root = byId("nova-admin-users");
  if (!root) return;
  const search = byId("nova-admin-search").value.trim().toLowerCase();
  const users = state.adminUsers.filter((user) => `${user.email || ""} ${user.nickname || ""} ${user.displayName || ""}`.toLowerCase().includes(search));
  if (!users.length) {
    root.innerHTML = '<div class="empty-state">Aucun compte ne correspond à cette recherche.</div>';
    return;
  }
  root.replaceChildren(...users.map((user) => {
    const entitlement = state.adminEntitlements.get(user.uid) || {};
    const active = entitlement.active === true;
    const card = document.createElement("article");
    card.className = "admin-user";
    card.dataset.user = user.uid;
    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = user.nickname || user.displayName || user.email || "Compte Freev";
    const meta = document.createElement("p");
    meta.textContent = `${user.email || "Email non renseigné"} · ${active ? "Accès Nova actif" : "Accès Nova fermé"}`;
    meta.className = active ? "access-on" : "access-off";
    copy.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "admin-user-actions";
    const date = document.createElement("input");
    date.type = "date";
    date.value = timestampToDate(entitlement.expiresAt);
    date.setAttribute("aria-label", `Expiration Nova pour ${title.textContent}`);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `ghost-button ${active ? "access-off" : "access-on"}`;
    toggle.dataset.toggleAccess = user.uid;
    toggle.dataset.active = String(active);
    toggle.textContent = active ? "Retirer" : "Accorder";
    actions.append(date, toggle);
    card.append(copy, actions);
    return card;
  }));
}

async function toggleUserAccess(uid, active, card) {
  const dateValue = card.querySelector('input[type="date"]')?.value || "";
  const expiresAt = dateValue ? Timestamp.fromDate(new Date(`${dateValue}T23:59:59`)) : null;
  try {
    await setDoc(doc(db, "novaEntitlements", uid), {
      uid,
      active,
      plan: "nova",
      expiresAt,
      grantedBy: state.user.uid,
      grantedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    state.adminEntitlements.set(uid, { uid, active, plan: "nova", expiresAt, grantedBy: state.user.uid });
    renderAdminUsers();
    toast(active ? "Accès Nova accordé." : "Accès Nova retiré.");
  } catch (error) {
    toast(errorMessage(error), "error");
  }
}

function openConfigTab(name = "recommendations") {
  openDialog("nova-config-dialog");
  document.querySelectorAll("[data-config-tab]").forEach((button) => button.classList.toggle("active", button.dataset.configTab === name));
  document.querySelectorAll("[data-config-panel]").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.configPanel !== name));
}

function bindEvents() {
  byId("nova-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = byId("nova-login-status");
    status.className = "form-status";
    status.textContent = "Connexion…";
    try {
      await signInWithEmailAndPassword(auth, byId("nova-email").value.trim(), byId("nova-password").value);
      byId("nova-password").value = "";
    } catch (error) {
      status.className = "form-status error";
      status.textContent = errorMessage(error);
    }
  });
  byId("nova-signout-button")?.addEventListener("click", () => signOut(auth));
  byId("nova-recheck-button")?.addEventListener("click", () => state.user && initializeUser(state.user));
  byId("nova-chat-form")?.addEventListener("submit", submitMission);
  byId("nova-open-config")?.addEventListener("click", () => openConfigTab("recommendations"));
  byId("nova-open-history")?.addEventListener("click", () => { renderHistory(); openDialog("nova-history-dialog"); });
  byId("nova-admin-button")?.addEventListener("click", () => { openDialog("nova-admin-dialog"); loadAdminUsers(); });
  byId("nova-admin-refresh")?.addEventListener("click", loadAdminUsers);
  byId("nova-admin-search")?.addEventListener("input", renderAdminUsers);
  byId("nova-clear-chat")?.addEventListener("click", () => { byId("nova-messages").replaceChildren(); welcomeMessage(); });
  byId("nova-team-toggle")?.addEventListener("click", () => { state.councilEnabled = !state.councilEnabled; renderHeader(); });
  byId("nova-model-source")?.addEventListener("change", updateSourceForm);
  byId("nova-model-form")?.addEventListener("submit", saveModel);
  byId("nova-model-cancel")?.addEventListener("click", resetModelForm);

  byId("nova-mode-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    state.councilEnabled = false;
    renderHeader();
  });
  byId("nova-creature-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-creature]");
    if (!button) return;
    const id = button.dataset.creature;
    if (state.councilTargets.has(id)) state.councilTargets.delete(id);
    else state.councilTargets.add(id);
    renderCouncil();
  });
  byId("nova-saved-models")?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-model]");
    const remove = event.target.closest("[data-delete-model]");
    if (edit) editModel(edit.dataset.editModel);
    if (remove) removeModel(remove.dataset.deleteModel);
  });
  byId("nova-assignments")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-save-assignment]");
    if (!button) return;
    const card = button.closest("[data-assignment]");
    if (card) saveAssignment(button.dataset.saveAssignment, card);
  });
  byId("nova-history-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-history]");
    if (button) removeHistory(button.dataset.deleteHistory);
  });
  byId("nova-admin-users")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-toggle-access]");
    if (!button) return;
    const card = button.closest("[data-user]");
    if (card) toggleUserAccess(button.dataset.toggleAccess, button.dataset.active !== "true", card);
  });
  document.querySelectorAll("[data-config-tab]").forEach((button) => button.addEventListener("click", () => openConfigTab(button.dataset.configTab)));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
}

async function initializeUser(user) {
  state.user = user;
  byId("nova-signout-button")?.classList.remove("hidden");
  setStatus("Contrôle Nova…");
  showGate("Vérification de ton accès", "Render contrôle ton identité Firebase et ton abonnement Nova.", "checking");
  try {
    const access = await loadAccess();
    if (!access.active) throw new Error("Ton accès Nova n’est pas actif.");
    await Promise.all([loadNovaData(), detectAdmin()]);
    showWorkspace();
    renderModes();
    renderHeader();
    renderCouncil();
    renderSavedModels();
    renderAssignments();
    welcomeMessage();
  } catch (error) {
    await detectAdmin().catch(() => false);
    setStatus("Accès Nova fermé", "error");
    showGate("Accès Nova requis", `${errorMessage(error)} Un administrateur Freev doit activer ce compte.`, "locked");
  }
}

renderCapabilities();
renderRecommendations();
bindEvents();
showGate("Vérification de ton accès", "Connexion sécurisée à Firebase et contrôle de l’abonnement en cours.", "checking");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    state.user = null;
    state.entitlement = null;
    state.isAdmin = false;
    byId("nova-admin-button")?.classList.add("hidden");
    byId("nova-signout-button")?.classList.add("hidden");
    setStatus("Connexion requise", "error");
    showGate("Connexion Freev requise", "L’interface complète est réservée aux comptes dont l’accès Nova a été activé.", "signed-out");
    return;
  }
  initializeUser(user);
});
