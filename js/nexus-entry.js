import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});
const API_BASE = "https://freev-iies.onrender.com";

function removeEntries() {
  document.querySelectorAll("[data-freev-nexus-entry]").forEach((node) => node.remove());
}

function createEntries() {
  removeEntries();
  const desktopNav = document.querySelector("#navbar nav");
  if (desktopNav) {
    const link = document.createElement("a");
    link.href = "nexus.html";
    link.textContent = "NEXUS";
    link.dataset.freevNexusEntry = "";
    link.className = "hover:text-amber-300 transition-colors relative group";
    desktopNav.append(link);
  }
  const mobileNav = document.querySelector("#mobile-menu .grid");
  if (mobileNav) {
    const link = document.createElement("a");
    link.href = "nexus.html";
    link.textContent = "NEXUS";
    link.dataset.freevNexusEntry = "";
    link.className = "mobile-link py-2.5 px-2 rounded-lg border border-amber-400/20 bg-amber-400/5 text-amber-200";
    mobileNav.insertBefore(link, mobileNav.querySelector("hr"));
  }
}

async function verify(user) {
  removeEntries();
  if (!user) return;
  try {
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };
    if (window.FreevFirebase?.getAppCheckToken) {
      const appCheck = await window.FreevFirebase.getAppCheckToken().catch(() => "");
      if (appCheck) headers["X-Firebase-AppCheck"] = appCheck;
    }
    const response = await fetch(`${API_BASE}/api/nexus/access`, { headers, cache: "no-store" });
    if (response.ok) createEntries();
  } catch {
    removeEntries();
  }
}

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
onAuthStateChanged(getAuth(app), verify, removeEntries);
