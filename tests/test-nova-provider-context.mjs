import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildPipelineMessages,
  fitProviderMessages,
  isProviderConversationTooLong,
} from "../js/nova-provider-context.js";

const encoder = new TextEncoder();

test("un pipeline de cinq modèles reste sous les limites de sécurité Render", () => {
  const messages = buildPipelineMessages({
    system: "Tu es NOVA-CODEX. Analyse, construis et vérifie le projet.",
    stageInstruction: "Tu es l’étape 3/5. Améliore le résultat précédent.",
    codeExportInstruction: "Fournis chaque fichier complet avec son chemin.",
    prompt: `DÉBUT_MISSION\n${"exigence utilisateur ".repeat(420)}\nFIN_MISSION`,
    previous: `DÉBUT_RÉSULTAT\n${"const valeur = 'Nova';\n".repeat(850)}\nFIN_RÉSULTAT`,
  });

  assert.ok(messages.length >= 4 && messages.length <= 24);
  assert.ok(messages.every((message) => message.content.length <= 1_800));

  const fixedPayload = {
    base_url: "https://integrate.api.nvidia.com/v1",
    model: "nvidia/nemotron-3-super-120b-a12b",
    secret_id: "secret-test",
  };
  const fitted = fitProviderMessages(messages, { fixedPayload, maxPayloadBytes: 14_000 });
  const payloadBytes = encoder.encode(JSON.stringify({ ...fixedPayload, messages: fitted })).length;
  const combined = fitted.map((message) => message.content).join("\n");

  assert.ok(payloadBytes <= 14_000, `payload trop grand : ${payloadBytes} octets`);
  assert.match(combined, /DÉBUT_MISSION/);
  assert.match(combined, /FIN_MISSION/);
  assert.match(combined, /DÉBUT_RÉSULTAT/);
  assert.match(combined, /FIN_RÉSULTAT/);
});

test("le compactage tient compte des caractères qui grossissent dans le JSON", () => {
  const messages = [{ role: "user", content: `Mission :\n${"\\\"code\\\"\n".repeat(1_500)}` }];
  const fixedPayload = { model: "modele-test", secret_id: "secret-test" };
  const fitted = fitProviderMessages(messages, {
    fixedPayload,
    maxMessageChars: 1_800,
    maxPayloadBytes: 5_000,
  });
  const payloadBytes = encoder.encode(JSON.stringify({ ...fixedPayload, messages: fitted })).length;

  assert.ok(fitted.every((message) => message.content.length <= 1_800));
  assert.ok(payloadBytes <= 5_000, `payload trop grand : ${payloadBytes} octets`);
});

test("reconnaît uniquement les erreurs qui justifient un nouvel essai compact", () => {
  assert.equal(isProviderConversationTooLong(new Error("conversation fournisseur trop longue")), true);
  assert.equal(isProviderConversationTooLong(new Error("maximum context length exceeded")), true);
  assert.equal(isProviderConversationTooLong(new Error("clé API refusée par le fournisseur")), false);
});

test("Nova utilise le contexte borné et un seul nouvel essai compact", async () => {
  const workspace = await readFile(new URL("../js/nova-workspace.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../nova.html", import.meta.url), "utf8");

  assert.match(workspace, /buildPipelineMessages\(\{/);
  assert.match(workspace, /fitProviderMessages\(messages,/);
  assert.match(workspace, /isProviderConversationTooLong\(error\)/);
  assert.match(workspace, /callProfile\(profile, messages, \{ compact: true \}\)/);
  assert.doesNotMatch(workspace, /result\.slice\(-14000\)/);
  assert.match(html, /nova-workspace\.js\?v=1\.4\.0/);
});
