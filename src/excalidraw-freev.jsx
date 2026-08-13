import React, { useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Excalidraw,
  THEME,
  serializeAsJSON,
} from "@excalidraw/excalidraw";

const DATABASE = "freev-excalidraw-v1";
const STORE = "scenes";
const SCENE_ID = "current";
const CLOUD_KEY = "freev-excalidraw-cloud-v1";
const CLOUD_LIMIT = 620_000;
const encoder = new TextEncoder();

// Excalidraw utilise ce chemin pour charger ses polices auto-hébergées.
window.EXCALIDRAW_ASSET_PATH = new URL("./", import.meta.url).href;

function setStatus(message, kind = "") {
  const node = document.getElementById("excalidraw-save-state");
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedScene() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(SCENE_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function writeIndexedScene(scene) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(scene, SCENE_ID);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

function parseScene(value) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    return {
      elements: parsed.elements,
      appState: { ...parsed.appState, theme: THEME.DARK },
      files: parsed.files || {},
    };
  } catch {
    return null;
  }
}

async function loadInitialData() {
  try {
    const local = parseScene(await readIndexedScene());
    if (local) return local;
  } catch (error) {
    console.info("IndexedDB indisponible, restauration cloud utilisée.", error);
  }
  return parseScene(localStorage.getItem(CLOUD_KEY)) || {
    appState: { theme: THEME.DARK, viewBackgroundColor: "#f8fafc" },
    elements: [],
    files: {},
  };
}

async function persistScene(json) {
  let indexedSaved = false;
  try {
    await writeIndexedScene(json);
    indexedSaved = true;
  } catch (error) {
    console.info("IndexedDB indisponible, sauvegarde locale limitée utilisée.", error);
  }
  if (encoder.encode(json).byteLength <= CLOUD_LIMIT) {
    localStorage.setItem(CLOUD_KEY, json);
    setStatus(indexedSaved ? "Sauvegardé sur cet appareil · compatible cloud" : "Sauvegardé localement · mode limité", "ok");
  } else if (indexedSaved) {
    localStorage.removeItem(CLOUD_KEY);
    setStatus("Sauvegardé sur cet appareil · projet trop grand pour le cloud", "large");
  } else {
    throw new Error("Le navigateur refuse la sauvegarde de ce projet volumineux.");
  }
}

function FreevExcalidraw() {
  const apiRef = useRef(null);
  const timerRef = useRef(0);

  const onChange = useCallback((elements, appState, files) => {
    window.clearTimeout(timerRef.current);
    setStatus("Sauvegarde…");
    timerRef.current = window.setTimeout(async () => {
      try {
        const json = serializeAsJSON(elements, appState, files, "local");
        await persistScene(json);
      } catch (error) {
        console.error("Sauvegarde Excalidraw", error);
        setStatus("Échec de la sauvegarde locale", "error");
      }
    }, 650);
  }, []);

  window.freevGetSaveData = () => parseScene(localStorage.getItem(CLOUD_KEY)) || {
    app: "Excalidraw",
    version: 1,
    note: "Le projet complet est conservé localement dans IndexedDB.",
  };
  window.freevApplySaveData = (data) => {
    const scene = parseScene(data);
    if (!scene || !apiRef.current) return;
    apiRef.current.updateScene(scene);
    if (scene.files && Object.keys(scene.files).length) apiRef.current.addFiles(Object.values(scene.files));
  };

  return (
    <Excalidraw
      autoFocus
      excalidrawAPI={(api) => { apiRef.current = api; }}
      initialData={loadInitialData()}
      langCode="fr-FR"
      name="Dessin Freev"
      onChange={onChange}
      theme={THEME.DARK}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: true,
          clearCanvas: true,
          export: { saveFileToDisk: true },
          loadScene: true,
          saveAsImage: true,
          saveToActiveFile: true,
          toggleTheme: true,
        },
        tools: { image: true },
      }}
    />
  );
}

const root = document.getElementById("excalidraw-root");
if (!root) throw new Error("Conteneur Excalidraw introuvable.");
createRoot(root).render(<FreevExcalidraw />);
