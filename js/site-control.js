const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const API_BASE = "https://freev-iies.onrender.com";
const BACKGROUNDS = Object.freeze({
  midnight: "#050914",
  nebula: "#0B1021",
  graphite: "#111827",
});
const SAFE_HEX = /^#[0-9A-F]{6}$/i;
const SAFE_MOTION = new Set(["calm", "normal", "dynamic"]);
const SAFE_DENSITY = new Set(["compact", "comfortable"]);
const EXEMPT_ROUTES = ["/maintenance.html", "/nexus.html", "/profil.html", "/legal/"];

function currentModule(pathname) {
  const path = pathname.toLowerCase();
  if (path.includes("/jeux/")) return "games";
  if (path.includes("/outils-ia/")) return "ai";
  if (path.endsWith("/nova.html") || path.includes("/nova.html")) return "nova";
  return "";
}

function applyDesign(design = {}) {
  const root = document.documentElement;
  if (SAFE_HEX.test(design.primary || "")) {
    root.style.setProperty("--freev-primary", design.primary);
    root.style.setProperty("--cyan", design.primary);
  }
  if (SAFE_HEX.test(design.secondary || "")) {
    root.style.setProperty("--freev-secondary", design.secondary);
    root.style.setProperty("--purple", design.secondary);
  }
  if (BACKGROUNDS[design.background]) {
    root.style.setProperty("--freev-background", BACKGROUNDS[design.background]);
    root.style.setProperty("--bg", BACKGROUNDS[design.background]);
  }
  const radius = Number(design.cardRadius);
  if (Number.isInteger(radius) && radius >= 12 && radius <= 32) {
    root.style.setProperty("--freev-card-radius", `${radius}px`);
    root.style.setProperty("--radius", `${radius}px`);
  }
  if (SAFE_MOTION.has(design.motion)) root.dataset.freevMotion = design.motion;
  if (SAFE_DENSITY.has(design.density)) root.dataset.freevDensity = design.density;
  if (typeof design.iconTheme === "string") root.dataset.freevIconTheme = design.iconTheme;
  if (typeof design.iconVariant === "string") root.dataset.freevIconVariant = design.iconVariant;
}

function isMaintenanceActive(maintenance = {}) {
  if (maintenance.enabled !== true) return false;
  if (maintenance.scope === "global") return true;
  const moduleName = currentModule(location.pathname);
  return Boolean(moduleName && Array.isArray(maintenance.modules) && maintenance.modules.includes(moduleName));
}

function authState(auth, onAuthStateChanged) {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    }, () => resolve(null));
  });
}

async function isVerifiedOwner() {
  try {
    const [{ getApp, getApps, initializeApp }, { getAuth, onAuthStateChanged }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    ]);
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const user = await authState(getAuth(app), onAuthStateChanged);
    if (!user) return false;
    const token = await user.getIdToken();
    const response = await fetch(`${API_BASE}/api/nexus/access`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function initializeSiteControl() {
  const maintenanceExempt = EXEMPT_ROUTES.some((route) => location.pathname.toLowerCase().includes(route));
  try {
    const response = await fetch(`${API_BASE}/api/site/config`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const config = await response.json();
    applyDesign(config.design);
    window.dispatchEvent(new CustomEvent("freev:site-config", { detail: config }));
    if (maintenanceExempt) return;
    if (!isMaintenanceActive(config.maintenance)) return;
    if (await isVerifiedOwner()) {
      document.documentElement.dataset.freevOwnerBypass = "true";
      return;
    }
    const destination = new URL("maintenance.html", location.href);
    if (location.pathname.includes("/logiciels/") || location.pathname.includes("/jeux/") || location.pathname.includes("/outils-ia/")) {
      destination.pathname = location.pathname.replace(/\/(logiciels|jeux|outils-ia)\/$/, "/maintenance.html");
    }
    destination.searchParams.set("from", `${location.pathname}${location.search}`);
    location.replace(destination.href);
  } catch {
    // Une panne du contrôle distant ne doit pas rendre le site entier indisponible.
  }
}

initializeSiteControl();

export { applyDesign, currentModule, isMaintenanceActive };
