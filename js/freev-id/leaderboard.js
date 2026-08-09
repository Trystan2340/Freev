import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";

const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyBtcQrFenU9T0C2v1qcBUpF2DfVqC_V5sM",
  authDomain: "freev-52df2.firebaseapp.com",
  projectId: "freev-52df2",
  storageBucket: "freev-52df2.firebasestorage.app",
  messagingSenderId: "588481455818",
  appId: "1:588481455818:web:fb61c5d4003d670e71f633",
});

const GAME_IDS = Object.freeze([
  "neonsnake",
  "pacman",
  "beatjump",
  "cyberpong",
  "tron",
  "astrominer",
  "towerblock",
]);

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function weekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeScore(rawScore) {
  const score = Math.floor(Number(rawScore));
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.min(score, 1_000_000_000);
}

function safeNickname(profile) {
  const nickname = String(profile?.nickname || "").trim().slice(0, 24);
  const nicknameLower = String(profile?.nicknameLower || "").trim().toLocaleLowerCase("fr-FR");
  if (!/^[a-z0-9_-]{3,24}$/.test(nicknameLower) || nickname.length < 3) return null;
  return { nickname, nicknameLower };
}

export async function publishGameScore(gameId, rawScore) {
  if (!GAME_IDS.includes(gameId)) return { published: false, reason: "unknown-game" };
  const score = normalizeScore(rawScore);
  if (!score) return { published: false, reason: "empty-score" };
  const user = auth.currentUser;
  if (!user) return { published: false, reason: "authentication-required" };

  const profileSnapshot = await getDoc(doc(db, "users", user.uid));
  const player = safeNickname(profileSnapshot.data());
  if (!profileSnapshot.exists() || !player) return { published: false, reason: "profile-required" };

  const reference = doc(db, "gameLeaderboards", gameId, "scores", player.nicknameLower);
  const existingSnapshot = await getDoc(reference);
  const existing = existingSnapshot.exists() ? existingSnapshot.data() : {};
  const currentWeek = weekKey();
  const currentMonth = monthKey();
  const globalScore = Math.max(normalizeScore(existing.globalScore), score);
  const weekScore = existing.weekKey === currentWeek
    ? Math.max(normalizeScore(existing.weekScore), score)
    : score;
  const currentMonthScore = existing.monthKey === currentMonth
    ? Math.max(normalizeScore(existing.monthScore), score)
    : score;

  await setDoc(reference, {
    gameId,
    nickname: player.nickname,
    nicknameLower: player.nicknameLower,
    globalScore,
    weekScore,
    weekKey: currentWeek,
    monthScore: currentMonthScore,
    monthKey: currentMonth,
    updatedAt: serverTimestamp(),
  });
  return { published: true, score: globalScore };
}

export async function loadArcadeLeaderboard(period = "week") {
  const selected = ["week", "month", "global"].includes(period) ? period : "week";
  const currentWeek = weekKey();
  const currentMonth = monthKey();
  const snapshots = await Promise.all(
    GAME_IDS.map((gameId) => getDocs(collection(db, "gameLeaderboards", gameId, "scores"))),
  );
  const players = new Map();

  snapshots.forEach((snapshot) => {
    snapshot.forEach((scoreDocument) => {
      const score = scoreDocument.data();
      const nicknameLower = String(score.nicknameLower || "");
      const nickname = String(score.nickname || "").trim();
      let points = 0;
      if (selected === "global") points = normalizeScore(score.globalScore);
      if (selected === "week" && score.weekKey === currentWeek) points = normalizeScore(score.weekScore);
      if (selected === "month" && score.monthKey === currentMonth) points = normalizeScore(score.monthScore);
      if (!nicknameLower || !nickname || !points) return;
      const current = players.get(nicknameLower) || { nickname, points: 0 };
      current.nickname = nickname;
      current.points += points;
      players.set(nicknameLower, current);
    });
  });

  return [...players.values()]
    .sort((first, second) => second.points - first.points || first.nickname.localeCompare(second.nickname, "fr"))
    .slice(0, 10)
    .map((player) => [player.nickname, player.points]);
}

window.FreevLeaderboard = Object.freeze({
  submit: (gameId, score) => publishGameScore(gameId, score).catch((error) => {
    console.info("Score Freev non publié", error);
    return { published: false, reason: "unavailable" };
  }),
});
