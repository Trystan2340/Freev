const DEFAULT_MAX_MESSAGE_CHARS = 1_800;
const DEFAULT_MAX_PAYLOAD_BYTES = 14_000;
const DEFAULT_MISSION_CHARS = 4_200;
const DEFAULT_PREVIOUS_CHARS = 4_800;
const DEFAULT_CONVERSATION_CHARS = 5_200;
const DEFAULT_CONVERSATION_TURNS = 6;
const MIN_MESSAGE_CHARS = 280;
const encoder = new TextEncoder();

function compactText(value, maxChars, label = "contenu") {
  const text = String(value || "").trim();
  if (!text || text.length <= maxChars) return text;
  const marker = `\n\n[… ${label} compacté pour le fournisseur …]\n\n`;
  const available = Math.max(0, maxChars - marker.length);
  const headLength = Math.ceil(available * 0.58);
  const tailLength = Math.max(0, available - headLength);
  return `${text.slice(0, headLength).trimEnd()}${marker}${text.slice(-tailLength).trimStart()}`.slice(0, maxChars);
}

function splitLabeledText(value, label, totalBudget, maxMessageChars) {
  const text = compactText(value, totalBudget, label.toLowerCase());
  if (!text) return [];
  const contentBudget = Math.max(64, maxMessageChars - 72);
  const rawChunks = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + contentBudget);
    if (end < text.length) {
      const newline = text.lastIndexOf("\n", end);
      if (newline > offset + Math.floor(contentBudget * 0.55)) end = newline + 1;
    }
    rawChunks.push(text.slice(offset, end).trim());
    offset = end;
  }
  return rawChunks.filter(Boolean).map((content, index, chunks) => ({
    content: `${label}${chunks.length > 1 ? ` — partie ${index + 1}/${chunks.length}` : ""} :\n${content}`,
  }));
}

export function buildPipelineMessages({
  system,
  stageInstruction,
  codeExportInstruction,
  conversation,
  prompt,
  previous,
}, options = {}) {
  const maxMessageChars = Math.max(MIN_MESSAGE_CHARS, Number(options.maxMessageChars) || DEFAULT_MAX_MESSAGE_CHARS);
  const systemContent = compactText([
    system,
    stageInstruction,
    codeExportInstruction,
    conversation
      ? "Le contexte fourni vient de cette même discussion. Réutilise le dernier projet quand l’utilisateur dit « améliore-le », « corrige-le » ou emploie une référence équivalente, sans lui demander de renvoyer le code."
      : "",
    "Ne demande et ne révèle jamais de clé, jeton ou secret.",
  ].filter(Boolean).join("\n"), maxMessageChars, "consignes");
  const conversationParts = splitLabeledText(
    conversation,
    "Contexte de la discussion actuelle (plus récent d’abord)",
    Number(options.conversationChars) || DEFAULT_CONVERSATION_CHARS,
    maxMessageChars,
  );
  const missionParts = splitLabeledText(
    prompt,
    "Mission utilisateur",
    Number(options.missionChars) || DEFAULT_MISSION_CHARS,
    maxMessageChars,
  );
  const previousParts = splitLabeledText(
    previous,
    "Résultat de l’étape précédente",
    Number(options.previousChars) || DEFAULT_PREVIOUS_CHARS,
    maxMessageChars,
  );
  const messages = [{ role: "system", content: systemContent }];
  messages.push(...conversationParts.map((part) => ({ role: "assistant", content: part.content })));
  messages.push(...missionParts.map((part) => ({ role: "user", content: part.content })));
  messages.push(...previousParts.map((part) => ({ role: "assistant", content: part.content })));
  messages.push({
    role: "user",
    content: previousParts.length
      ? "Produis maintenant une version améliorée et directement exploitable, en respectant toute la mission."
      : "Réponds maintenant à la mission avec un résultat complet et directement exploitable.",
  });
  return messages;
}

export function normalizeConversationTurns(turns, maximumTurns = DEFAULT_CONVERSATION_TURNS) {
  const limit = Math.min(12, Math.max(1, Number(maximumTurns) || DEFAULT_CONVERSATION_TURNS));
  return (Array.isArray(turns) ? turns : [])
    .map((turn) => ({
      prompt: String(turn?.prompt || "").trim().slice(0, 6_000),
      response: String(turn?.response || "").trim().slice(0, 30_000),
      kind: turn?.kind === "council" ? "council" : "mode",
      target: String(turn?.target || "").trim().slice(0, 200),
    }))
    .filter((turn) => turn.prompt && turn.response)
    .slice(-limit);
}

export function buildConversationContext(turns, maximumChars = DEFAULT_CONVERSATION_CHARS) {
  const budget = Math.min(7_000, Math.max(600, Number(maximumChars) || DEFAULT_CONVERSATION_CHARS));
  const normalized = normalizeConversationTurns(turns).reverse();
  if (!normalized.length) return "";

  const preface = "Travail déjà réalisé dans cette discussion. Le tour 1 est le plus récent. Conserve les fichiers, choix et contraintes qui n’ont pas été explicitement remplacés.";
  let remaining = Math.max(300, budget - preface.length - 4);
  const parts = [];

  normalized.forEach((turn, index) => {
    if (remaining < 220) return;
    const turnsLeft = normalized.length - index;
    const allocation = index === 0
      ? Math.min(3_900, remaining)
      : Math.min(1_150, Math.floor(remaining / Math.max(1, turnsLeft)));
    const promptBudget = Math.min(650, Math.max(140, Math.floor(allocation * 0.22)));
    const header = `Tour ${index + 1} — demande utilisateur :\n`;
    const responseHeader = "\nRéponse/projet déjà produit :\n";
    const prompt = compactText(turn.prompt, promptBudget, "demande précédente");
    const responseBudget = Math.max(180, allocation - header.length - responseHeader.length - prompt.length);
    const response = compactText(turn.response, responseBudget, "projet précédent");
    const part = `${header}${prompt}${responseHeader}${response}`.slice(0, remaining);
    if (part.trim()) {
      parts.push(part);
      remaining -= part.length + 2;
    }
  });

  return compactText(`${preface}\n\n${parts.join("\n\n")}`, budget, "discussion");
}

function payloadByteLength(messages, fixedPayload) {
  return encoder.encode(JSON.stringify({ ...fixedPayload, messages })).length;
}

export function fitProviderMessages(messages, options = {}) {
  const fixedPayload = options.fixedPayload && typeof options.fixedPayload === "object" ? options.fixedPayload : {};
  const maxMessageChars = Math.max(MIN_MESSAGE_CHARS, Number(options.maxMessageChars) || DEFAULT_MAX_MESSAGE_CHARS);
  const maxPayloadBytes = Math.max(2_000, Number(options.maxPayloadBytes) || DEFAULT_MAX_PAYLOAD_BYTES);
  const fitted = (Array.isArray(messages) ? messages : []).slice(0, 24).map((message) => ({
    role: ["system", "assistant"].includes(message?.role) ? message.role : "user",
    content: compactText(message?.content, maxMessageChars, "message"),
  })).filter((message) => message.content);

  for (let pass = 0; pass < 100 && payloadByteLength(fitted, fixedPayload) > maxPayloadBytes; pass += 1) {
    let targetIndex = -1;
    for (let index = 0; index < fitted.length; index += 1) {
      if (fitted[index].content.length > MIN_MESSAGE_CHARS
        && (targetIndex < 0 || fitted[index].content.length > fitted[targetIndex].content.length)) {
        targetIndex = index;
      }
    }
    if (targetIndex < 0) break;
    const overflow = payloadByteLength(fitted, fixedPayload) - maxPayloadBytes;
    const current = fitted[targetIndex].content;
    const nextLimit = Math.max(MIN_MESSAGE_CHARS, current.length - Math.max(120, Math.ceil(overflow / 2)));
    fitted[targetIndex] = {
      ...fitted[targetIndex],
      content: compactText(current, nextLimit, "contexte"),
    };
  }

  if (!fitted.length || payloadByteLength(fitted, fixedPayload) > maxPayloadBytes) {
    throw new Error("La mission reste trop volumineuse après compactage sécurisé.");
  }
  return fitted;
}

export function isProviderConversationTooLong(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return /conversation fournisseur trop longue|maximum context length|context length exceeded|prompt (?:is )?too long|too many (?:input )?tokens/.test(message);
}

export function isProviderTransientError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return /fournisseur (?:injoignable|occupé)|délai dépassé|timeout|timed out|temporarily unavailable|service unavailable|http 429|http 502|http 503|http 504/.test(message);
}

export function buildMemoryContext(memories, maximumChars = 2_400) {
  const budget = Math.min(4_000, Math.max(200, Number(maximumChars) || 2_400));
  const enabled = (Array.isArray(memories) ? memories : [])
    .filter((memory) => memory?.enabled === true)
    .slice(0, 20)
    .map((memory) => {
      const title = String(memory?.title || "Mémoire").trim().slice(0, 80);
      const content = String(memory?.content || "").trim().slice(0, 800);
      return content ? `- ${title} : ${content}` : "";
    })
    .filter(Boolean);
  if (!enabled.length) return "";
  return compactText(
    `Mémoires explicitement activées par l’utilisateur :\n${enabled.join("\n")}`,
    budget,
    "mémoires",
  );
}
