import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  getAuth,
  multiFactor,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  deleteObject,
  getBlob,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
  buildAccountExport,
  buildPublicProfile,
  calculateSquareCrop,
  normalizeDeviceRecord,
  normalizePublicProfileId,
} from "./account-data.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const RENDER_BASE = "https://freev-iies.onrender.com";
const KNOWN_COLLECTIONS = Object.freeze([
  "chatHistory",
  "memories",
  "devices",
  "achievements",
  "privateApiKeys",
  "novaModels",
  "novaAssignments",
  "novaHistory",
]);

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const state = {
  user: null,
  profile: null,
  currentPhoto: null,
  currentPhotoUrl: "",
  currentDeviceId: "",
  mfaVerificationId: "",
  mfaRecaptcha: null,
  busy: false,
};

const byId = (id) => document.getElementById(id);

function element(tag, attributes = {}, text = "") {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "className") node.className = value;
    else if (name === "dataset") Object.assign(node.dataset, value);
    else if (name in node && typeof value !== "object") node[name] = value;
    else node.setAttribute(name, value);
  }
  if (text) node.textContent = text;
  return node;
}

function setStatus(message, kind = "info") {
  const status = byId("freev-account-status");
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(value) {
  state.busy = value;
  document.querySelectorAll("[data-freev-account-action]").forEach((button) => {
    button.disabled = value;
  });
}

function download(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = element("a", { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getDeviceId() {
  const key = "freev_device_id_v2";
  try {
    const stored = localStorage.getItem(key);
    if (/^[a-zA-Z0-9_-]{8,100}$/.test(stored || "")) return stored;
    const id = `web_${crypto.randomUUID().replaceAll("-", "")}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return `web_${crypto.randomUUID().replaceAll("-", "")}`;
  }
}

function deviceDescription() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const browser = /Edg\//.test(navigator.userAgent)
    ? "Edge"
    : /Firefox\//.test(navigator.userAgent)
      ? "Firefox"
      : /Safari\//.test(navigator.userAgent) && !/Chrome\//.test(navigator.userAgent)
        ? "Safari"
        : "Chrome";
  return normalizeDeviceRecord({
    id: state.currentDeviceId,
    label: `${browser} · ${mobile ? "mobile" : "ordinateur"}`,
    platform: navigator.userAgentData?.platform || navigator.platform || "Web",
  });
}

function createPanel(id, label) {
  return element("section", {
    id,
    className: "freev-account-panel",
    role: "tabpanel",
    "aria-label": label,
    hidden: id !== "freev-account-public",
  });
}

function buildPublicPanel() {
  const panel = createPanel("freev-account-public", "Profil public");
  const card = element("div", { className: "freev-account-card" });
  card.append(
    element("h4", { className: "text-sm font-bold text-white" }, "Profil public volontaire"),
    element("p", { className: "freev-account-note" }, "Le surnom, le nom affiché, la bio, l’avatar procédural et le thème seulement. L’email, l’UID, la photo privée, les mémoires et les clés restent exclus."),
  );
  const link = element("a", { id: "freev-public-profile-link", className: "freev-public-link", hidden: true }, "");
  const actions = element("div", { className: "freev-account-actions" });
  actions.append(
    element("button", { id: "freev-publish-profile", className: "freev-account-button freev-account-button--primary", type: "button", dataset: { freevAccountAction: "publish" } }, "Publier / actualiser"),
    element("button", { id: "freev-unpublish-profile", className: "freev-account-button freev-account-button--danger", type: "button", dataset: { freevAccountAction: "unpublish" } }, "Retirer du public"),
  );
  card.append(link, actions);
  panel.append(card);
  return panel;
}

function buildPhotoPanel() {
  const panel = createPanel("freev-account-photo", "Photo personnelle");
  const stage = element("div", { className: "freev-photo-stage" });
  stage.append(element("canvas", { id: "freev-photo-canvas", width: 512, height: 512, "aria-label": "Aperçu de la photo recadrée" }));
  const file = element("input", { id: "freev-photo-file", type: "file", accept: "image/png,image/jpeg,image/webp" });
  const zoom = element("input", { id: "freev-photo-zoom", type: "range", min: 1, max: 3, step: .05, value: 1, disabled: true });
  const fileLabel = element("label", { className: "freev-account-field" }, "Choisir une photo PNG, JPEG ou WebP");
  fileLabel.append(file);
  const zoomLabel = element("label", { className: "freev-account-field" }, "Zoom du recadrage carré");
  zoomLabel.append(zoom);
  const actions = element("div", { className: "freev-account-actions" });
  actions.append(
    element("button", { id: "freev-photo-save", className: "freev-account-button freev-account-button--primary", type: "button", dataset: { freevAccountAction: "photo-save" }, disabled: true }, "Enregistrer la photo privée"),
    element("button", { id: "freev-photo-delete", className: "freev-account-button freev-account-button--danger", type: "button", dataset: { freevAccountAction: "photo-delete" } }, "Supprimer la photo"),
  );
  panel.append(stage, fileLabel, zoomLabel, actions, element("p", { className: "freev-account-note" }, "La photo est recadrée à 512 × 512 et conservée dans l’espace Storage privé du compte. Elle n’est jamais copiée dans le profil public."));
  return panel;
}

function buildMemoryPanel() {
  const panel = createPanel("freev-account-memories", "Mémoires Nova");
  const title = element("input", { id: "freev-memory-title", maxLength: 80, placeholder: "Titre de la mémoire" });
  const content = element("textarea", { id: "freev-memory-content", maxLength: 4000, rows: 4, placeholder: "Information que Nova pourra retrouver…" });
  const titleLabel = element("label", { className: "freev-account-field" }, "Titre");
  titleLabel.append(title);
  const contentLabel = element("label", { className: "freev-account-field" }, "Contenu");
  contentLabel.append(content);
  panel.append(
    titleLabel,
    contentLabel,
    element("button", { id: "freev-memory-add", className: "freev-account-button freev-account-button--primary", type: "button", dataset: { freevAccountAction: "memory-add" } }, "Ajouter cette mémoire"),
    element("div", { id: "freev-memory-list", className: "freev-account-list" }),
  );
  return panel;
}

function buildDevicesPanel() {
  const panel = createPanel("freev-account-devices", "Appareils connectés");
  panel.append(
    element("p", { className: "freev-account-note" }, "Cette liste aide à repérer les navigateurs utilisés. Le bouton global de sécurité révoque réellement les jetons Firebase depuis Render."),
    element("button", { id: "freev-devices-refresh", className: "freev-account-button", type: "button", dataset: { freevAccountAction: "devices-refresh" } }, "Actualiser les appareils"),
    element("div", { id: "freev-device-list", className: "freev-account-list" }),
  );
  return panel;
}

function buildDataPanel() {
  const panel = createPanel("freev-account-data", "Données et sécurité");
  const deletionPhrase = element("input", { id: "freev-delete-phrase", autocomplete: "off", placeholder: "Écrire SUPPRIMER" });
  const deletionLabel = element("label", { className: "freev-account-field" }, "Suppression définitive");
  deletionLabel.append(deletionPhrase);
  const phone = element("input", { id: "freev-mfa-phone", type: "tel", autocomplete: "tel", placeholder: "+33 6 12 34 56 78" });
  const code = element("input", { id: "freev-mfa-code", inputMode: "numeric", autocomplete: "one-time-code", maxLength: 8, placeholder: "Code SMS", disabled: true });
  const phoneLabel = element("label", { className: "freev-account-field" }, "Téléphone pour la double authentification");
  const codeLabel = element("label", { className: "freev-account-field" }, "Code reçu");
  phoneLabel.append(phone);
  codeLabel.append(code);
  const mfaCard = element("section", { className: "freev-account-security-card", "aria-labelledby": "freev-mfa-title" });
  mfaCard.append(
    element("h4", { id: "freev-mfa-title", className: "text-sm font-bold text-white" }, "Double authentification SMS"),
    element("p", { id: "freev-mfa-status", className: "freev-account-note", role: "status" }, "Vérification de la configuration…"),
    phoneLabel,
    element("button", { id: "freev-mfa-send", className: "freev-account-button", type: "button", dataset: { freevAccountAction: "mfa-send" } }, "Envoyer le code"),
    codeLabel,
    element("button", { id: "freev-mfa-confirm", className: "freev-account-button freev-account-button--primary", type: "button", dataset: { freevAccountAction: "mfa-confirm" }, disabled: true }, "Activer la double authentification"),
    element("div", { id: "freev-mfa-factors", className: "freev-account-list" }),
    element("div", { id: "freev-mfa-recaptcha", "aria-hidden": "true" }),
  );
  panel.append(
    mfaCard,
    element("button", { id: "freev-export-account", className: "freev-account-button freev-account-button--primary", type: "button", dataset: { freevAccountAction: "export" } }, "Exporter toutes mes données"),
    element("p", { className: "freev-account-note" }, "L’export rassemble le profil, les sauvegardes et historiques, les mémoires, les appareils et les données Nova accessibles. Les clés restent chiffrées."),
    element("button", { id: "freev-revoke-sessions", className: "freev-account-button", type: "button", dataset: { freevAccountAction: "revoke-sessions" } }, "Déconnecter tous les appareils"),
    deletionLabel,
    element("button", { id: "freev-delete-account", className: "freev-account-button freev-account-button--danger", type: "button", dataset: { freevAccountAction: "delete-account" } }, "Demander la suppression complète"),
    element("p", { className: "freev-account-note" }, "La demande exige une reconnexion récente et passe par Render afin de supprimer aussi les sous-collections et de révoquer les sessions."),
  );
  return panel;
}

function buildCenter() {
  if (byId("freev-account-center")) return;
  const profile = byId("profile-section");
  if (!profile) return;
  const center = element("section", { id: "freev-account-center", className: "freev-account-center" });
  const head = element("div", { className: "freev-account-center__head" });
  const copy = element("div");
  copy.append(
    element("h3", { className: "text-sm font-bold text-white" }, "Centre de compte Freev ID"),
    element("p", { className: "text-xs text-gray-500" }, "Publication, photo privée, mémoire, appareils et portabilité."),
  );
  head.append(copy, element("span", { className: "freev-id-studio__badge" }, "V2 sécurisé"));
  const tabs = element("div", { className: "freev-account-tabs", role: "tablist" });
  const definitions = [
    ["freev-account-public", "Public"],
    ["freev-account-photo", "Photo"],
    ["freev-account-memories", "Mémoires"],
    ["freev-account-devices", "Appareils"],
    ["freev-account-data", "Données"],
  ];
  for (const [panelId, label] of definitions) {
    tabs.append(element("button", {
      className: "freev-account-tab",
      type: "button",
      role: "tab",
      dataset: { accountPanel: panelId },
      "aria-controls": panelId,
      "aria-selected": String(panelId === "freev-account-public"),
    }, label));
  }
  center.append(head, tabs, buildPublicPanel(), buildPhotoPanel(), buildMemoryPanel(), buildDevicesPanel(), buildDataPanel());
  center.append(element("p", { id: "freev-account-status", className: "freev-account-status", role: "status", "aria-live": "polite" }));
  const saves = byId("profile-saves-section");
  if (saves) saves.insertAdjacentElement("beforebegin", center);
  else profile.append(center);
}

function selectPanel(panelId) {
  document.querySelectorAll("[data-account-panel]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.accountPanel === panelId));
  });
  document.querySelectorAll(".freev-account-panel").forEach((panel) => {
    panel.hidden = panel.id !== panelId;
  });
}

async function loadProfile() {
  if (!state.user) return null;
  const snapshot = await getDoc(doc(db, "users", state.user.uid));
  state.profile = snapshot.exists() ? snapshot.data() : null;
  return state.profile;
}

function publicProfileUrl(nicknameLower) {
  const url = new URL("profil.html", location.href);
  url.searchParams.set("id", nicknameLower);
  return url.href;
}

async function refreshPublicState() {
  const link = byId("freev-public-profile-link");
  const nicknameLower = normalizePublicProfileId(state.profile?.nicknameLower);
  if (!link || !nicknameLower) {
    if (link) link.hidden = true;
    return;
  }
  const snapshot = await getDoc(doc(db, "publicProfiles", nicknameLower));
  link.href = publicProfileUrl(nicknameLower);
  link.textContent = snapshot.exists() ? link.href : "Le profil n’est pas encore public.";
  link.hidden = false;
}

async function publishProfile() {
  if (!state.user) return;
  await loadProfile();
  const profile = buildPublicProfile(state.profile || {});
  const profileRef = doc(db, "publicProfiles", profile.nicknameLower);
  const existing = await getDoc(profileRef);
  await setDoc(profileRef, {
    ...profile,
    publishedAt: existing.exists() ? existing.data().publishedAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "users", state.user.uid), {
    uid: state.user.uid,
    publicProfile: { published: true, nicknameLower: profile.nicknameLower, updatedAt: serverTimestamp() },
  }, { merge: true });
  await refreshPublicState();
  setStatus("Profil public publié. Vérifiez le lien avant de le partager.", "success");
}

async function unpublishProfile() {
  if (!state.user) return;
  const nicknameLower = normalizePublicProfileId(state.profile?.nicknameLower);
  if (!nicknameLower) return;
  if (!confirm("Retirer ce profil de la page publique ?")) return;
  await deleteDoc(doc(db, "publicProfiles", nicknameLower));
  await setDoc(doc(db, "users", state.user.uid), {
    uid: state.user.uid,
    publicProfile: { published: false, nicknameLower, updatedAt: serverTimestamp() },
  }, { merge: true });
  await refreshPublicState();
  setStatus("Profil retiré du public.", "success");
}

function drawPhotoPreview() {
  const canvas = byId("freev-photo-canvas");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#020617";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (!state.currentPhoto) return;
  const crop = calculateSquareCrop({
    width: state.currentPhoto.naturalWidth,
    height: state.currentPhoto.naturalHeight,
    zoom: byId("freev-photo-zoom")?.value,
  });
  context.drawImage(
    state.currentPhoto,
    crop.sourceX,
    crop.sourceY,
    crop.sourceSize,
    crop.sourceSize,
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

async function choosePhoto(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size >= 2 * 1024 * 1024) {
    throw new TypeError("Choisissez une image PNG, JPEG ou WebP de moins de 2 Mio.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    state.currentPhoto = image;
    byId("freev-photo-zoom").disabled = false;
    byId("freev-photo-save").disabled = false;
    drawPhotoPreview();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Conversion de la photo impossible.")), "image/webp", .88);
  });
}

async function savePhoto() {
  const canvas = byId("freev-photo-canvas");
  if (!state.user || !state.currentPhoto || !canvas) return;
  const blob = await canvasBlob(canvas);
  const path = `users/${state.user.uid}/avatars/profile.webp`;
  await uploadBytes(storageRef(storage, path), blob, { contentType: "image/webp", cacheControl: "private,max-age=3600" });
  await setDoc(doc(db, "users", state.user.uid), {
    uid: state.user.uid,
    photo: { path, contentType: "image/webp", updatedAt: serverTimestamp() },
  }, { merge: true });
  await loadProfile();
  setStatus("Photo privée recadrée et enregistrée.", "success");
}

async function deletePhoto() {
  if (!state.user || !state.profile?.photo?.path) return;
  if (!confirm("Supprimer définitivement la photo privée de ce compte ?")) return;
  await deleteObject(storageRef(storage, state.profile.photo.path));
  await setDoc(doc(db, "users", state.user.uid), {
    uid: state.user.uid,
    photo: null,
  }, { merge: true });
  state.profile.photo = null;
  state.currentPhoto = null;
  drawPhotoPreview();
  setStatus("Photo privée supprimée.", "success");
}

async function addMemory() {
  const title = byId("freev-memory-title")?.value.trim();
  const content = byId("freev-memory-content")?.value.trim();
  if (!state.user || !title || !content) throw new TypeError("Le titre et le contenu sont obligatoires.");
  const id = `memory_${crypto.randomUUID().replaceAll("-", "")}`;
  await setDoc(doc(db, "users", state.user.uid, "memories", id), {
    id,
    title: title.slice(0, 80),
    content: content.slice(0, 4000),
    enabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  byId("freev-memory-title").value = "";
  byId("freev-memory-content").value = "";
  await renderMemories();
  setStatus("Mémoire Nova ajoutée.", "success");
}

async function updateMemory(id, changes) {
  if (!state.user) return;
  const reference = doc(db, "users", state.user.uid, "memories", id);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) return;
  await setDoc(reference, { ...snapshot.data(), ...changes, updatedAt: serverTimestamp() });
  await renderMemories();
}

async function removeMemory(id) {
  if (!state.user || !confirm("Supprimer cette mémoire Nova ?")) return;
  await deleteDoc(doc(db, "users", state.user.uid, "memories", id));
  await renderMemories();
  setStatus("Mémoire supprimée.", "success");
}

async function renderMemories() {
  const target = byId("freev-memory-list");
  if (!target || !state.user) return;
  target.replaceChildren(element("p", { className: "freev-account-note" }, "Chargement…"));
  const snapshot = await getDocs(collection(db, "users", state.user.uid, "memories"));
  target.replaceChildren();
  if (snapshot.empty) {
    target.append(element("p", { className: "freev-account-note" }, "Aucune mémoire explicite."));
    return;
  }
  for (const item of snapshot.docs.map((entry) => entry.data())) {
    const card = element("article", { className: "freev-memory-item" });
    const text = element("div");
    text.append(element("strong", { className: "text-xs text-white" }, item.title), element("p", { className: "freev-account-note" }, item.content));
    const actions = element("div", { className: "freev-account-actions" });
    actions.append(
      element("button", { className: "freev-account-button", type: "button", dataset: { memoryToggle: item.id } }, item.enabled ? "Désactiver" : "Activer"),
      element("button", { className: "freev-account-button freev-account-button--danger", type: "button", dataset: { memoryDelete: item.id } }, "Supprimer"),
    );
    card.append(text, actions);
    target.append(card);
  }
}

async function registerCurrentDevice() {
  if (!state.user) return;
  state.currentDeviceId = getDeviceId();
  const device = deviceDescription();
  const reference = doc(db, "users", state.user.uid, "devices", device.id);
  const snapshot = await getDoc(reference);
  await setDoc(reference, {
    ...device,
    createdAt: snapshot.exists() ? snapshot.data().createdAt : serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  });
}

async function renderDevices() {
  const target = byId("freev-device-list");
  if (!target || !state.user) return;
  const snapshot = await getDocs(collection(db, "users", state.user.uid, "devices"));
  target.replaceChildren();
  for (const item of snapshot.docs.map((entry) => entry.data())) {
    const card = element("article", { className: "freev-device-item freev-account-row" });
    const copy = element("div");
    copy.append(
      element("strong", { className: "text-xs text-white" }, item.id === state.currentDeviceId ? `${item.label} · cet appareil` : item.label),
      element("p", { className: "freev-account-note" }, item.platform || "Plateforme inconnue"),
    );
    card.append(copy);
    if (item.id !== state.currentDeviceId) {
      card.append(element("button", { className: "freev-account-button freev-account-button--danger", type: "button", dataset: { deviceDelete: item.id } }, "Retirer"));
    }
    target.append(card);
  }
}

async function removeDevice(id) {
  if (!state.user || !confirm("Retirer cet appareil de la liste de sécurité ?")) return;
  await deleteDoc(doc(db, "users", state.user.uid, "devices", id));
  await renderDevices();
}

function enrolledPhoneFactors() {
  if (!state.user) return [];
  return multiFactor(state.user).enrolledFactors.filter(
    (factor) => factor.factorId === PhoneMultiFactorGenerator.FACTOR_ID,
  );
}

function renderMfaStatus() {
  const status = byId("freev-mfa-status");
  const list = byId("freev-mfa-factors");
  if (!status || !list) return;
  const factors = enrolledPhoneFactors();
  status.textContent = factors.length
    ? `${factors.length} second facteur SMS actif${factors.length > 1 ? "s" : ""}.`
    : "Aucun second facteur actif. Un email vérifié et Firebase Identity Platform sont requis.";
  list.replaceChildren();
  for (const factor of factors) {
    const row = element("article", { className: "freev-account-row" });
    row.append(
      element("span", { className: "freev-account-note" }, factor.displayName || factor.phoneNumber || "Téléphone sécurisé"),
      element("button", {
        className: "freev-account-button freev-account-button--danger",
        type: "button",
        dataset: { mfaRemove: factor.uid },
      }, "Désactiver"),
    );
    list.append(row);
  }
}

function newMfaRecaptcha() {
  state.mfaRecaptcha?.clear();
  state.mfaRecaptcha = new RecaptchaVerifier(auth, "freev-mfa-recaptcha", { size: "invisible" });
  return state.mfaRecaptcha;
}

async function sendMfaCode() {
  if (!state.user) throw new Error("Connexion Firebase requise.");
  if (!state.user.emailVerified) throw new Error("Vérifiez d’abord votre adresse email Firebase.");
  const phoneNumber = byId("freev-mfa-phone")?.value.trim() || "";
  if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber.replace(/[\s.-]/g, ""))) {
    throw new TypeError("Utilisez le format international, par exemple +33612345678.");
  }
  const normalizedPhone = phoneNumber.replace(/[\s.-]/g, "");
  const session = await multiFactor(state.user).getSession();
  state.mfaVerificationId = await new PhoneAuthProvider(auth).verifyPhoneNumber({
    phoneNumber: normalizedPhone,
    session,
  }, newMfaRecaptcha());
  byId("freev-mfa-code").disabled = false;
  byId("freev-mfa-confirm").disabled = false;
  byId("freev-mfa-code").focus();
  setStatus("Code SMS envoyé. Saisissez-le pour activer le second facteur.", "success");
}

async function confirmMfaEnrollment() {
  const code = byId("freev-mfa-code")?.value.trim() || "";
  if (!state.user || !state.mfaVerificationId || !/^\d{4,8}$/.test(code)) {
    throw new TypeError("Saisissez le code SMS reçu.");
  }
  const credential = PhoneAuthProvider.credential(state.mfaVerificationId, code);
  await multiFactor(state.user).enroll(
    PhoneMultiFactorGenerator.assertion(credential),
    "Téléphone Freev",
  );
  state.mfaVerificationId = "";
  state.mfaRecaptcha?.clear();
  state.mfaRecaptcha = null;
  byId("freev-mfa-code").value = "";
  byId("freev-mfa-code").disabled = true;
  byId("freev-mfa-confirm").disabled = true;
  renderMfaStatus();
  setStatus("Double authentification activée.", "success");
}

async function removeMfaFactor(uid) {
  if (!state.user || !confirm("Désactiver ce second facteur de sécurité ?")) return;
  const factor = enrolledPhoneFactors().find((item) => item.uid === uid);
  if (!factor) return;
  await multiFactor(state.user).unenroll(factor);
  renderMfaStatus();
  setStatus("Second facteur désactivé.", "success");
}

async function readCollection(name) {
  try {
    const snapshot = await getDocs(collection(db, "users", state.user.uid, name));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  } catch (error) {
    return [{ exportError: error?.code || error?.message || "unavailable" }];
  }
}

async function exportAccount() {
  if (!state.user) return;
  setStatus("Préparation de l’export complet…");
  const profileSnapshot = await getDoc(doc(db, "users", state.user.uid));
  const entries = await Promise.all(KNOWN_COLLECTIONS.map(async (name) => [name, await readCollection(name)]));
  const saves = await readCollection("saves");
  for (const save of saves) {
    if (save.exportError) continue;
    try {
      const history = await getDocs(collection(db, "users", state.user.uid, "saves", save.id, "history"));
      save.history = history.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    } catch (error) {
      save.history = [{ exportError: error?.code || error?.message || "unavailable" }];
    }
  }
  const collections = Object.fromEntries(entries);
  collections.saves = saves;
  if (profileSnapshot.data()?.photo?.path) {
    try {
      const blob = await getBlob(storageRef(storage, profileSnapshot.data().photo.path));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      collections.privatePhoto = { contentType: blob.type, base64: btoa(binary) };
    } catch (error) {
      collections.privatePhoto = { exportError: error?.code || error?.message || "unavailable" };
    }
  }
  const payload = buildAccountExport({
    uid: state.user.uid,
    profile: profileSnapshot.exists() ? profileSnapshot.data() : {},
    collections,
  });
  download(`freev-compte-${Date.now()}.json`, payload);
  setStatus("Export global téléchargé sur cet appareil.", "success");
}

async function requestAccountDeletion() {
  if (!state.user) return;
  if (byId("freev-delete-phrase")?.value !== "SUPPRIMER") {
    throw new TypeError("Écrivez exactement SUPPRIMER pour continuer.");
  }
  if (!confirm("Demander la suppression définitive du compte et de toutes ses données ? Cette opération sera irréversible.")) return;
  const headers = await secureRenderHeaders(true);
  const response = await fetch(`${RENDER_BASE}/api/account/delete`, {
    method: "POST",
    headers,
    body: JSON.stringify({ confirmation: "SUPPRIMER" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Le service sécurisé de suppression n’est pas encore disponible.");
  setStatus("Compte supprimé. La session va être fermée.", "success");
  await signOut(auth);
}

async function secureRenderHeaders(forceRefresh = false) {
  if (!state.user) throw new Error("Connexion Firebase requise.");
  const headers = {
    Authorization: `Bearer ${await state.user.getIdToken(forceRefresh)}`,
    "Content-Type": "application/json",
  };
  const appCheckToken = await window.FreevFirebase?.getAppCheckToken?.(forceRefresh).catch(() => "");
  if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;
  return headers;
}

async function revokeSessions() {
  if (!state.user || !confirm("Déconnecter tous les appareils, y compris celui-ci ? Vous devrez vous reconnecter.")) return;
  const response = await fetch(`${RENDER_BASE}/api/account/sessions/revoke`, {
    method: "POST",
    headers: await secureRenderHeaders(true),
    body: JSON.stringify({ confirmation: "REVOQUER" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Révocation des sessions impossible.");
  setStatus("Toutes les sessions ont été révoquées. Reconnexion requise.", "success");
  await signOut(auth);
}

async function runAction(action) {
  if (state.busy) return;
  setBusy(true);
  try {
    await action();
  } catch (error) {
    setStatus(error?.message || "Action impossible.", "error");
    console.error("Centre de compte Freev", error);
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const tab = target?.closest("[data-account-panel]");
    if (tab) selectPanel(tab.dataset.accountPanel);
    const toggle = target?.closest("[data-memory-toggle]");
    if (toggle) {
      const card = toggle.closest(".freev-memory-item");
      runAction(async () => {
        const snapshot = await getDoc(doc(db, "users", state.user.uid, "memories", toggle.dataset.memoryToggle));
        if (snapshot.exists()) await updateMemory(toggle.dataset.memoryToggle, { enabled: !snapshot.data().enabled });
      });
    }
    const memoryDelete = target?.closest("[data-memory-delete]");
    if (memoryDelete) runAction(() => removeMemory(memoryDelete.dataset.memoryDelete));
    const deviceDelete = target?.closest("[data-device-delete]");
    if (deviceDelete) runAction(() => removeDevice(deviceDelete.dataset.deviceDelete));
    const mfaRemove = target?.closest("[data-mfa-remove]");
    if (mfaRemove) runAction(() => removeMfaFactor(mfaRemove.dataset.mfaRemove));
  });
  byId("freev-publish-profile")?.addEventListener("click", () => runAction(publishProfile));
  byId("freev-unpublish-profile")?.addEventListener("click", () => runAction(unpublishProfile));
  byId("freev-photo-file")?.addEventListener("change", (event) => runAction(() => choosePhoto(event.target.files?.[0])));
  byId("freev-photo-zoom")?.addEventListener("input", drawPhotoPreview);
  byId("freev-photo-save")?.addEventListener("click", () => runAction(savePhoto));
  byId("freev-photo-delete")?.addEventListener("click", () => runAction(deletePhoto));
  byId("freev-memory-add")?.addEventListener("click", () => runAction(addMemory));
  byId("freev-devices-refresh")?.addEventListener("click", () => runAction(renderDevices));
  byId("freev-export-account")?.addEventListener("click", () => runAction(exportAccount));
  byId("freev-revoke-sessions")?.addEventListener("click", () => runAction(revokeSessions));
  byId("freev-mfa-send")?.addEventListener("click", () => runAction(sendMfaCode));
  byId("freev-mfa-confirm")?.addEventListener("click", () => runAction(confirmMfaEnrollment));
  byId("freev-delete-account")?.addEventListener("click", () => runAction(requestAccountDeletion));
}

async function initializeForUser(user) {
  state.user = user;
  if (!user) {
    state.profile = null;
    return;
  }
  await loadProfile();
  await registerCurrentDevice();
  await Promise.all([refreshPublicState(), renderMemories(), renderDevices()]);
  renderMfaStatus();
  setStatus("Centre de compte synchronisé.", "success");
}

function initialize() {
  buildCenter();
  bindEvents();
  onAuthStateChanged(auth, (user) => {
    initializeForUser(user).catch((error) => {
      setStatus(error?.message || "Synchronisation du centre de compte impossible.", "error");
    });
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
else initialize();
