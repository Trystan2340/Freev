const DEFAULT_MAX_MESSAGE_CHARS = 1_800;
const DEFAULT_MAX_PAYLOAD_BYTES = 14_000;
const DEFAULT_MISSION_CHARS = 4_200;
const DEFAULT_PREVIOUS_CHARS = 4_800;
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
  prompt,
  previous,
}, options = {}) {
  const maxMessageChars = Math.max(MIN_MESSAGE_CHARS, Number(options.maxMessageChars) || DEFAULT_MAX_MESSAGE_CHARS);
  const systemContent = compactText([
    system,
    stageInstruction,
    codeExportInstruction,
    "Ne demande et ne révèle jamais de clé, jeton ou secret.",
  ].filter(Boolean).join("\n"), maxMessageChars, "consignes");
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
