import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildConversationContext,
  buildMemoryContext,
  buildPipelineMessages,
  fitProviderMessages,
  isProviderConversationTooLong,
  isProviderTransientError,
  normalizeConversationTurns,
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

test("reconnaît les indisponibilités temporaires sans masquer une clé refusée", () => {
  assert.equal(isProviderTransientError(new Error("fournisseur injoignable ou délai dépassé")), true);
  assert.equal(isProviderTransientError(new Error("HTTP 503")), true);
  assert.equal(isProviderTransientError(new Error("clé API refusée par le fournisseur")), false);
});

test("les mémoires Nova sont explicites, activées et bornées", () => {
  const context = buildMemoryContext([
    { title: "Langue", content: "Répondre en français", enabled: true },
    { title: "Secret désactivé", content: "Ne doit pas partir", enabled: false },
    { title: "Long", content: "x".repeat(2_000), enabled: true },
  ], 500);
  assert.match(context, /Répondre en français/);
  assert.doesNotMatch(context, /Ne doit pas partir/);
  assert.ok(context.length <= 500);
});

test("une demande de retouche reçoit le dernier code de la même discussion", () => {
  const turns = normalizeConversationTurns([
    {
      kind: "mode",
      target: "codex",
      prompt: "Crée une application de tâches en HTML.",
      response: `Fichier : index.html\n\`\`\`html\n<section id="nova-project">${"<button>Ajouter</button>".repeat(420)}</section>\n\`\`\`\nFIN_PROJET_NOVA`,
    },
  ]);
  const conversation = buildConversationContext(turns);
  const messages = buildPipelineMessages({
    system: "Tu es NOVA-CODEX.",
    stageInstruction: "Améliore le projet existant.",
    codeExportInstruction: "Fournis chaque fichier complet.",
    conversation,
    prompt: "Améliore-le avec un thème sombre et une recherche.",
    previous: "",
  });
  const combined = messages.map((message) => message.content).join("\n");

  assert.match(conversation, /Crée une application de tâches/);
  assert.match(conversation, /Fichier : index\.html/);
  assert.match(conversation, /FIN_PROJET_NOVA/);
  assert.match(combined, /même discussion/);
  assert.match(combined, /Améliore-le avec un thème sombre/);
  assert.ok(messages.every((message) => message.content.length <= 1_800));
});

test("le contexte Nova privilégie les échanges récents et reste borné", () => {
  const turns = Array.from({ length: 10 }, (_, index) => ({
    prompt: `Demande ${index + 1}`,
    response: `Réponse ${index + 1} ${"code ".repeat(900)}`,
  }));
  const normalized = normalizeConversationTurns(turns);
  const context = buildConversationContext(normalized, 5_200);

  assert.equal(normalized.length, 6);
  assert.match(context, /Tour 1/);
  assert.match(context, /Demande 10/);
  assert.ok(context.length <= 5_200);
});

test("Nova utilise le contexte borné et un seul nouvel essai compact", async () => {
  const workspace = await readFile(new URL("../js/nova-workspace.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../nova.html", import.meta.url), "utf8");

  assert.match(workspace, /buildPipelineMessages\(\{/);
  assert.match(workspace, /fitProviderMessages\(messages,/);
  assert.match(workspace, /isProviderConversationTooLong\(error\)/);
  assert.match(workspace, /isProviderTransientError\(error\)/);
  assert.match(workspace, /callProfile\(profile, messages, \{ \.\.\.options, compact: true \}\)/);
  assert.match(workspace, /callProfile\(profile, messages, \{ \.\.\.options, transientRetry: true \}\)/);
  assert.match(workspace, /buildConversationContext\(state\.conversation\)/);
  assert.match(workspace, /appendConversationTurn\(/);
  assert.match(workspace, /clearActiveConversation\(\)/);
  assert.doesNotMatch(workspace, /result\.slice\(-14000\)/);
  assert.match(html, /nova-workspace\.js\?v=1\.6\.0/);
});
