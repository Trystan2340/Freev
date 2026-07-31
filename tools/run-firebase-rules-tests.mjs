import { spawn } from "node:child_process";

const firebaseExecutable = process.platform === "win32" ? "firebase.cmd" : "firebase";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";

// Le dépôt contient déjà firebase.js. Sous Windows, appeler seulement
// `firebase` ouvrirait ce fichier au lieu du binaire npm ; l'extension .cmd
// lève cette ambiguïté tout en gardant la commande Linux inchangée.
const command = [
  npxExecutable,
  "--yes",
  "--package",
  "firebase-tools@15.25.1",
  "--",
  firebaseExecutable,
  "emulators:exec",
  "--project",
  "demo-freev-id-v2",
  "--only",
  "firestore,storage",
  '"node --test tests/firebase-rules.test.mjs"',
].join(" ");

const child = spawn(command, {
  cwd: process.cwd(),
  env: process.env,
  shell: true,
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error("Impossible de lancer Firebase Emulator :", error.message);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Firebase Emulator interrompu par le signal ${signal}.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
