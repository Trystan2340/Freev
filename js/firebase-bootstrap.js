import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  ReCaptchaEnterpriseProvider,
  getToken,
  initializeAppCheck,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const siteKey = document.querySelector('meta[name="freev-app-check-site-key"]')?.content.trim() || "";
let appCheck = null;

if (siteKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.error("Initialisation Firebase App Check impossible.", error);
  }
}

async function getAppCheckToken(forceRefresh = false) {
  if (!appCheck) return "";
  const result = await getToken(appCheck, forceRefresh);
  return result.token || "";
}

window.FreevFirebase = Object.freeze({
  app,
  appCheckEnabled: Boolean(appCheck),
  getAppCheckToken,
});

window.dispatchEvent(new CustomEvent("freev:firebase-bootstrap-ready", {
  detail: { appCheckEnabled: Boolean(appCheck) },
}));
