export const NOVA_MODE_IDS = Object.freeze(["spark", "archon", "codex"]);

export const NOVA_CREATURE_IDS = Object.freeze([
  "buddy",
  "axiom",
  "forge",
  "auditor",
  "navigator",
  "iris",
  "pixel",
  "operator",
  "sentinel",
  "archivist",
]);

export function isModeTarget(targetId) {
  return NOVA_MODE_IDS.includes(String(targetId || ""));
}

export function isCreatureTarget(targetId) {
  return NOVA_CREATURE_IDS.includes(String(targetId || ""));
}

export function assignmentInputType(targetId) {
  return isCreatureTarget(targetId) ? "radio" : "checkbox";
}

// Les modes utilisent tous les profils choisis, dans l'ordre affiché.
// Le Conseil garde au maximum un profil par créature, y compris pour les
// anciennes données qui pouvaient encore contenir plusieurs identifiants.
export function normalizeAssignmentIds(targetId, modelIds, availableModelIds) {
  if (!isModeTarget(targetId) && !isCreatureTarget(targetId)) return [];
  const available = new Set(Array.isArray(availableModelIds) ? availableModelIds.map(String) : []);
  const unique = [];
  for (const rawId of Array.isArray(modelIds) ? modelIds : []) {
    const id = String(rawId || "");
    if (!available.has(id) || unique.includes(id)) continue;
    unique.push(id);
  }
  return isCreatureTarget(targetId) ? unique.slice(0, 1) : unique;
}
