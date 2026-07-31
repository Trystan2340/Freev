import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { doc, getDoc, getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { normalizePublicProfileId } from "./account-data.js";
import { renderAvatarSvg } from "./avatar-generator.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const byId = (id) => document.getElementById(id);

function showError(message) {
  byId("public-profile-name").textContent = "Profil indisponible";
  byId("public-profile-nickname").textContent = "";
  byId("public-profile-bio").textContent = "Ce profil n’est pas publié ou son lien est invalide.";
  byId("public-profile-status").textContent = message;
}

async function loadPublicProfile() {
  const nicknameLower = normalizePublicProfileId(new URL(location.href).searchParams.get("id"));
  if (!nicknameLower) {
    showError("Identifiant de profil invalide.");
    return;
  }
  try {
    const snapshot = await getDoc(doc(db, "publicProfiles", nicknameLower));
    if (!snapshot.exists()) {
      showError("Aucun profil public trouvé.");
      return;
    }
    const profile = snapshot.data();
    const avatar = byId("public-profile-avatar");
    avatar.replaceChildren();
    avatar.insertAdjacentHTML("afterbegin", renderAvatarSvg(profile.avatar, { title: `Avatar Freev ID de ${profile.displayName || profile.nickname}` }));
    avatar.removeAttribute("aria-hidden");
    byId("public-profile-name").textContent = profile.displayName || profile.nickname;
    byId("public-profile-nickname").textContent = `@${profile.nickname}`;
    byId("public-profile-bio").textContent = profile.bio || "Membre de l’univers Freev.";
    const theme = byId("public-profile-theme");
    theme.textContent = `Ambiance ${profile.theme?.preset || "Freev"}`;
    theme.hidden = false;
    document.title = `${profile.displayName || profile.nickname} — Freev ID`;
  } catch (error) {
    showError(error?.code === "permission-denied" ? "Les règles publiques ne sont pas encore déployées." : "Chargement Firebase impossible.");
  }
}

loadPublicProfile();
