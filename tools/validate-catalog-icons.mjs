import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalogPath = path.join(root, 'data', 'catalog.json');
const registryPath = path.join(root, 'packages', 'freev-icon-system', 'registry', 'apps.json');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registered = new Set((registry.apps || []).map((item) => item.id));
const errors = [];
const warnings = [];
const ids = new Set();

for (const item of [...(catalog.softwares || []), ...(catalog.games || [])]) {
  if (!item.id || ids.has(item.id)) errors.push(`Identifiant absent ou dupliqué : ${item.id || '(vide)'}`);
  ids.add(item.id);

  if (item.legacyCoverOnly === true) {
    if (!item.cover) errors.push(`Le jeu historique ${item.title} n’a ni icône ni cover.`);
    warnings.push(`${item.title} utilise temporairement sa cover historique : fournir un master FREEV pour obtenir un iconId.`);
    continue;
  }

  if (!item.iconId) {
    errors.push(`FREEV ICON REQUIRED: ${item.title} ne possède pas de champ iconId.`);
    continue;
  }
  if (!registered.has(item.iconId)) {
    errors.push(`FREEV ICON REQUIRED: ${item.title} utilise iconId "${item.iconId}", absent de registry/apps.json.`);
  }
}

for (const warning of warnings) console.warn(`AVERTISSEMENT: ${warning}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Catalogue validé : ${catalog.softwares.length} logiciels, ${catalog.games.length} jeux, ${registered.size} icônes enregistrées.`);
