import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("le vocal utilise l’envoi direct et une file de synthèse mobile", async () => {
  const [voice, runtime, html] = await Promise.all([
    readFile(new URL("../js/freev-voice-immersive.js", import.meta.url), "utf8"),
    readFile(new URL("../js/index-runtime-3.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  assert.match(runtime, /submitPrompt: submitFreevV7Prompt/);
  assert.match(voice, /window\.FreevV7Chat\?\.submitPrompt/);
  assert.match(voice, /function splitForSpeech/);
  assert.match(voice, /function unlockSpeech/);
  assert.match(voice, /state\.currentUtterance = utterance/);
  assert.match(voice, /speakChunk\(index \+ 1\)/);
  assert.match(html, /index-runtime-3\.js\?v=1\.2\.0/);
  assert.match(html, /freev-voice-immersive\.js\?v=1\.1\.0/);
});
