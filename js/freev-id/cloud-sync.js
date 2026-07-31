import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  applyConfiguredStorage,
  captureConfiguredStorage,
  cloudConfigurationForPath,
  hasConfiguredData,
} from "./cloud-adapters.js";
import { buildSaveVersion } from "./cloud-saves.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const configuration = cloudConfigurationForPath(location.pathname);

if (configuration) {
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const state = {
    user: null,
    baselineChecksum: "",
    remote: null,
    syncing: false,
    timer: 0,
  };

  const metaKey = `freev_cloud_meta_v3_${configuration.pageId}`;

  function element(tag, attributes = {}, text = "") {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (name === "className") node.className = value;
      else if (name === "dataset") Object.assign(node.dataset, value);
      else if (name in node) node[name] = value;
      else node.setAttribute(name, value);
    }
    if (text) node.textContent = text;
    return node;
  }

  function installStyles() {
    if (document.getElementById("freev-cloud-sync-style")) return;
    const style = element("style", { id: "freev-cloud-sync-style" });
    style.textContent = `
      .freev-cloud-sync{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;display:grid;gap:.5rem;width:min(22rem,calc(100vw - 2rem));font-family:Inter,system-ui,sans-serif;color:#dbeafe}
      .freev-cloud-badge,.freev-cloud-card{border:1px solid rgba(34,211,238,.28);border-radius:.8rem;background:rgba(2,6,23,.94);box-shadow:0 18px 50px rgba(0,0,0,.35);backdrop-filter:blur(16px)}
      .freev-cloud-badge{justify-self:end;padding:.55rem .75rem;color:#a5f3fc;font-size:.7rem;font-weight:800}
      .freev-cloud-badge[data-kind="ok"]{border-color:rgba(52,211,153,.35);color:#86efac}
      .freev-cloud-badge[data-kind="error"]{border-color:rgba(248,113,113,.35);color:#fca5a5}
      .freev-cloud-card{display:grid;gap:.65rem;padding:.8rem;font-size:.72rem;line-height:1.5}
      .freev-cloud-card[hidden]{display:none}
      .freev-cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}
      .freev-cloud-actions button{border:1px solid rgba(255,255,255,.12);border-radius:.55rem;padding:.55rem;color:#e2e8f0;background:rgba(255,255,255,.06);font:inherit;font-weight:800}
      .freev-cloud-actions button:first-child{border-color:rgba(34,211,238,.35);color:#67e8f9;background:rgba(34,211,238,.1)}
      @media(max-width:520px){.freev-cloud-sync{right:.65rem;bottom:.65rem;width:calc(100vw - 1.3rem)}}
    `;
    document.head.append(style);
  }

  function buildWidget() {
    installStyles();
    const root = element("aside", { className: "freev-cloud-sync", "aria-live": "polite" });
    const card = element("section", { className: "freev-cloud-card", id: "freev-cloud-conflict", hidden: true });
    card.append(
      element("strong", {}, "Conflit de sauvegarde"),
      element("span", { id: "freev-cloud-conflict-copy" }, "Une version différente existe dans le cloud."),
    );
    const actions = element("div", { className: "freev-cloud-actions" });
    actions.append(
      element("button", { type: "button", dataset: { cloudChoice: "remote" } }, "Utiliser le cloud"),
      element("button", { type: "button", dataset: { cloudChoice: "local" } }, "Garder cet appareil"),
    );
    card.append(actions);
    root.append(card, element("button", { className: "freev-cloud-badge", id: "freev-cloud-badge", type: "button" }, "Cloud : connexion…"));
    document.body.append(root);
  }

  function setBadge(message, kind = "") {
    const badge = document.getElementById("freev-cloud-badge");
    if (!badge) return;
    badge.textContent = message;
    badge.dataset.kind = kind;
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(metaKey) || "{}") || {};
    } catch {
      return {};
    }
  }

  function writeMeta(version) {
    try {
      localStorage.setItem(metaKey, JSON.stringify({ checksum: version.checksum, savedAt: version.savedAt }));
    } catch {
      // La synchronisation reste utilisable, mais le prochain conflit sera redemandé.
    }
  }

  function localVersion(savedAt) {
    const values = captureConfiguredStorage(localStorage, configuration);
    return buildSaveVersion({
      pageId: configuration.pageId,
      deviceId: localStorage.getItem("freev_device_id_v2") || "web",
      savedAt: savedAt || readMeta().savedAt || new Date().toISOString(),
      data: { localStorage: values },
    });
  }

  function remoteVersion(data) {
    if (!data?.checksum || !data?.savedAt || !data?.data?.localStorage) return null;
    return data;
  }

  function saveReference() {
    return doc(db, "users", state.user.uid, "saves", configuration.pageId);
  }

  async function writeLocalToCloud(version) {
    if (!state.user || state.syncing) return;
    state.syncing = true;
    setBadge("Cloud : sauvegarde…");
    try {
      const reference = saveReference();
      const current = await getDoc(reference);
      const currentData = current.exists() ? remoteVersion(current.data()) : null;
      if (currentData && currentData.checksum !== version.checksum && state.baselineChecksum && currentData.checksum !== state.baselineChecksum) {
        state.remote = currentData;
        showConflict("La sauvegarde cloud a changé depuis la dernière synchronisation.");
        return;
      }
      if (currentData && currentData.checksum !== version.checksum && currentData.id) {
        await setDoc(doc(db, "users", state.user.uid, "saves", configuration.pageId, "history", currentData.id), currentData);
      }
      await setDoc(reference, {
        ...version,
        pageTitle: configuration.pageTitle,
        pageKind: configuration.pageKind,
        pagePath: configuration.pagePath,
        clientSavedAt: version.savedAt,
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "users", state.user.uid), {
        uid: state.user.uid,
        stats: {
          cloudSaveCount: increment(1),
          lastCloudSaveAt: serverTimestamp(),
          lastSavedPageTitle: configuration.pageTitle,
        },
      }, { merge: true });
      state.baselineChecksum = version.checksum;
      state.remote = version;
      writeMeta(version);
      setBadge("Cloud : synchronisé", "ok");
    } finally {
      state.syncing = false;
    }
  }

  function showConflict(message) {
    const card = document.getElementById("freev-cloud-conflict");
    const copy = document.getElementById("freev-cloud-conflict-copy");
    if (copy) copy.textContent = message;
    if (card) card.hidden = false;
    setBadge("Cloud : choix requis");
  }

  function hideConflict() {
    const card = document.getElementById("freev-cloud-conflict");
    if (card) card.hidden = true;
  }

  async function chooseRemote() {
    const values = state.remote?.data?.localStorage;
    if (!hasConfiguredData(values)) return;
    const count = applyConfiguredStorage(localStorage, configuration, values);
    writeMeta(state.remote);
    state.baselineChecksum = state.remote.checksum;
    hideConflict();
    setBadge(`Cloud : ${count} donnée(s) restaurée(s)`, "ok");
    location.reload();
  }

  async function chooseLocal() {
    const version = localVersion(new Date().toISOString());
    state.baselineChecksum = state.remote?.checksum || "";
    hideConflict();
    await writeLocalToCloud(version);
  }

  async function initialSync(user) {
    state.user = user;
    if (!user) {
      state.baselineChecksum = "";
      state.remote = null;
      setBadge("Cloud : connectez-vous");
      return;
    }
    setBadge("Cloud : comparaison…");
    const local = localVersion();
    const localHasData = hasConfiguredData(local.data.localStorage);
    const snapshot = await getDoc(saveReference());
    const remote = snapshot.exists() ? remoteVersion(snapshot.data()) : null;
    state.remote = remote;

    if (!remote && !localHasData) {
      state.baselineChecksum = local.checksum;
      setBadge("Cloud : rien à sauvegarder", "ok");
      return;
    }
    if (!remote) {
      await writeLocalToCloud(local);
      return;
    }
    if (!localHasData) {
      showConflict("Une sauvegarde cloud existe et cet appareil est vide.");
      return;
    }
    if (remote.checksum === local.checksum) {
      state.baselineChecksum = local.checksum;
      writeMeta(remote);
      setBadge("Cloud : synchronisé", "ok");
      return;
    }
    showConflict("Le cloud et cet appareil contiennent deux versions différentes. Rien ne sera écrasé sans votre choix.");
  }

  async function detectLocalChanges() {
    if (!state.user || state.syncing) return;
    try {
      const current = localVersion(new Date().toISOString());
      if (current.checksum && current.checksum !== state.baselineChecksum) await writeLocalToCloud(current);
    } catch (error) {
      setBadge(error?.message || "Cloud indisponible", "error");
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const choice = target?.closest("[data-cloud-choice]")?.dataset.cloudChoice;
      if (choice === "remote") chooseRemote().catch((error) => setBadge(error.message, "error"));
      if (choice === "local") chooseLocal().catch((error) => setBadge(error.message, "error"));
      if (target?.closest("#freev-cloud-badge") && state.remote) showConflict("Choisissez la version à conserver uniquement si les deux sauvegardes diffèrent.");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") detectLocalChanges();
    });
    state.timer = window.setInterval(detectLocalChanges, 20_000);
  }

  buildWidget();
  bindEvents();
  onAuthStateChanged(auth, (user) => {
    initialSync(user).catch((error) => {
      setBadge(error?.message || "Cloud indisponible", "error");
      console.error("Synchronisation Freev Cloud v3", error);
    });
  });

  window.FreevCloudSync = Object.freeze({
    saveNow: detectLocalChanges,
    configuration,
  });
}
