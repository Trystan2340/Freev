import app, { db } from "./firebase.js";

console.info("Firebase app initialisée", app.name);
console.info("Firestore connecté", db.app.name);
