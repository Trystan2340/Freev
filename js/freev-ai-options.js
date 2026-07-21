(() => {
  'use strict';

  const chat = window.FreevV7Chat;
  if (!chat) return;

  const byId = (id) => document.getElementById(id);
  const STORAGE_KEY = 'freev_custom_ai_config';
  const PAGE_SIZE = 18;
  const PRESETS = {
    custom: { baseUrl: '', model: '' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'qwen/qwen-2.5-72b-instruct' },
    mistral: { baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    together: { baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
    ollama: { baseUrl: 'http://localhost:11434/v1', model: 'qwen3:8b' },
    lmstudio: { baseUrl: 'http://localhost:1234/v1', model: 'local-model' }
  };

  const CATALOG = [
    ['Qwen3.5 0.8B', 'qwen3.5:0.8b', 'Qwen', 'Généraliste', 0.8, 2, true],
    ['Qwen3.5 2B', 'qwen3.5:2b', 'Qwen', 'Généraliste', 1.7, 4, true],
    ['Qwen3.5 4B', 'qwen3.5:4b', 'Qwen', 'Vision', 3, 6, true],
    ['Qwen3.5 9B', 'qwen3.5:9b', 'Qwen', 'Vision', 6, 10, true],
    ['Qwen3.5 27B', 'qwen3.5:27b', 'Qwen', 'Vision', 17, 24, false],
    ['Qwen3 1.7B', 'qwen3:1.7b', 'Qwen', 'Raisonnement', 1.4, 4, true],
    ['Qwen3 4B', 'qwen3:4b', 'Qwen', 'Raisonnement', 2.5, 6, true],
    ['Qwen3 8B', 'qwen3:8b', 'Qwen', 'Raisonnement', 5.2, 8, true],
    ['Qwen3 14B', 'qwen3:14b', 'Qwen', 'Raisonnement', 9, 16, true],
    ['Qwen3 30B-A3B', 'qwen3:30b', 'Qwen', 'Raisonnement', 19, 24, true],
    ['Qwen3 32B', 'qwen3:32b', 'Qwen', 'Raisonnement', 20, 28, false],
    ['Qwen3 Coder', 'qwen3-coder', 'Qwen', 'Code', 18, 24, true],
    ['Qwen3 VL', 'qwen3-vl', 'Qwen', 'Vision', 8, 12, true],
    ['Qwen3 Embedding', 'qwen3-embedding', 'Qwen', 'Embeddings', 0.6, 2, false],
    ['Gemma 3 1B', 'gemma3:1b', 'Gemma', 'Généraliste', 0.8, 2, true],
    ['Gemma 3 4B', 'gemma3:4b', 'Gemma', 'Vision', 3.3, 6, true],
    ['Gemma 3 12B', 'gemma3:12b', 'Gemma', 'Vision', 8, 16, true],
    ['Gemma 3 27B', 'gemma3:27b', 'Gemma', 'Vision', 17, 24, false],
    ['TranslateGemma 4B', 'translategemma:4b', 'Gemma', 'Traduction', 3, 6, false],
    ['Llama 3.2 1B', 'llama3.2:1b', 'Llama', 'Généraliste', 1.3, 4, true],
    ['Llama 3.2 3B', 'llama3.2:3b', 'Llama', 'Généraliste', 2, 6, true],
    ['Llama 3.1 8B', 'llama3.1:8b', 'Llama', 'Généraliste', 4.7, 8, true],
    ['Llama 3.3 70B', 'llama3.3:70b', 'Llama', 'Généraliste', 40, 48, false],
    ['Phi-4 Mini', 'phi4-mini', 'Phi', 'Raisonnement', 2.5, 6, true],
    ['Phi-4', 'phi4', 'Phi', 'Raisonnement', 8.5, 16, true],
    ['GPT-OSS 20B', 'gpt-oss:20b', 'OpenAI', 'Raisonnement', 13, 20, true],
    ['GPT-OSS 120B', 'gpt-oss:120b', 'OpenAI', 'Raisonnement', 70, 96, false],
    ['DeepSeek R1 1.5B', 'deepseek-r1:1.5b', 'DeepSeek', 'Raisonnement', 1.1, 4, true],
    ['DeepSeek R1 7B', 'deepseek-r1:7b', 'DeepSeek', 'Raisonnement', 4.7, 8, true],
    ['DeepSeek R1 14B', 'deepseek-r1:14b', 'DeepSeek', 'Raisonnement', 9, 16, true],
    ['DeepSeek R1 32B', 'deepseek-r1:32b', 'DeepSeek', 'Raisonnement', 20, 28, false],
    ['DeepSeek Coder V2', 'deepseek-coder-v2', 'DeepSeek', 'Code', 9, 16, true],
    ['Mistral 7B', 'mistral:7b', 'Mistral', 'Généraliste', 4.1, 8, true],
    ['Mistral Nemo 12B', 'mistral-nemo:12b', 'Mistral', 'Généraliste', 7.1, 16, true],
    ['Mistral Small 3.1', 'mistral-small3.1', 'Mistral', 'Vision', 14, 24, true],
    ['Mixtral 8x7B', 'mixtral:8x7b', 'Mistral', 'Généraliste', 26, 32, false],
    ['Codestral', 'codestral', 'Mistral', 'Code', 13, 20, true],
    ['Command R7B', 'command-r7b', 'Cohere', 'Généraliste', 5, 8, false],
    ['Aya Expanse 8B', 'aya-expanse:8b', 'Cohere', 'Traduction', 5, 8, true],
    ['OLMo 2 7B', 'olmo2:7b', 'AI2', 'Généraliste', 4.7, 8, false],
    ['OLMo 2 13B', 'olmo2:13b', 'AI2', 'Généraliste', 8, 16, false],
    ['SmolLM2 135M', 'smollm2:135m', 'Hugging Face', 'Généraliste', 0.2, 1, false],
    ['SmolLM2 1.7B', 'smollm2:1.7b', 'Hugging Face', 'Généraliste', 1.1, 3, true],
    ['LFM2 1.2B', 'lfm2:1.2b', 'Liquid AI', 'Généraliste', 0.9, 3, true],
    ['LFM2 24B-A2B', 'lfm2:24b', 'Liquid AI', 'Généraliste', 15, 24, false],
    ['Falcon3 10B', 'falcon3:10b', 'TII', 'Généraliste', 6, 12, false],
    ['Hermes 3 8B', 'hermes3:8b', 'Nous Research', 'Généraliste', 4.7, 8, true],
    ['Dolphin 3 8B', 'dolphin3:8b', 'Cognitive Computations', 'Généraliste', 4.7, 8, false],
    ['Nomic Embed Text', 'nomic-embed-text', 'Nomic', 'Embeddings', 0.3, 2, true],
    ['BGE-M3', 'bge-m3', 'BAAI', 'Embeddings', 1.5, 4, false],
    ['Whisper Small', 'whisper:small', 'OpenAI', 'Audio', 1, 3, true],
    ['Whisper Large V3', 'whisper:large-v3', 'OpenAI', 'Audio', 3, 8, false],
    ['LLaVA 7B', 'llava:7b', 'LLaVA', 'Vision', 4.7, 8, true],
    ['Moondream 2', 'moondream', 'Moondream', 'Vision', 1.1, 3, true],
    ['MiniCPM-V', 'minicpm-v', 'OpenBMB', 'Vision', 5, 8, false]
  ].map(([name, model, family, type, sizeGB, ramGB, popular]) => ({
    name, model, family, type, sizeGB, ramGB, popular
  }));

  const libraryState = {
    runtime: 'ollama',
    page: 1,
    lastFocused: null,
    deviceRam: Number(navigator.deviceMemory) || 8
  };

  function readStoredConfig() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function currentFormConfig() {
    return {
      preset: byId('freev-provider-preset')?.value || 'custom',
      baseUrl: (byId('freev-custom-base-url')?.value || '').trim().replace(/\/+$/, ''),
      model: (byId('freev-custom-model')?.value || '').trim(),
      apiKey: (byId('freev-custom-api-key')?.value || '').trim()
    };
  }

  function isAllowedBaseUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch (_) {
      return false;
    }
  }

  function fillConfig(config) {
    if (byId('freev-provider-preset')) byId('freev-provider-preset').value = config.preset || 'custom';
    if (byId('freev-custom-base-url')) byId('freev-custom-base-url').value = config.baseUrl || '';
    if (byId('freev-custom-model')) byId('freev-custom-model').value = config.model || '';
    if (byId('freev-custom-api-key')) byId('freev-custom-api-key').value = config.apiKey || '';
  }

  function updateModeButton(button, active, color) {
    if (!button) return;
    button.classList.toggle(color, active);
    button.classList.toggle('text-slate-950', active && color === 'bg-cyan-500');
    button.classList.toggle('text-white', active && color === 'bg-fuchsia-500');
    button.classList.toggle('text-gray-400', !active);
  }

  function setMode(mode) {
    const custom = mode === 'custom';
    chat.state.mode = custom ? 'custom' : 'freev';
    updateModeButton(byId('freev-mode-native'), !custom, 'bg-cyan-500');
    updateModeButton(byId('freev-mode-custom'), custom, 'bg-fuchsia-500');

    const title = byId('freev-v7-chat-title');
    const description = byId('freev-v7-mode-description');
    if (custom) {
      const config = readStoredConfig();
      const label = config.model || 'Autre IA';
      if (title) title.textContent = label;
      if (description) description.textContent = 'Fournisseur configuré dans ce navigateur';
      chat.setStatus(config.baseUrl && config.model ? 'Modèle prêt' : 'À configurer', config.baseUrl && config.model ? 'ok' : 'error');
    } else {
      if (title) title.innerHTML = '<i class="fa-solid fa-brain mr-2 text-cyan-300"></i>Freev Brain V7';
      if (description) description.textContent = 'Conversation écrite · base Freev native';
      chat.checkNative();
    }
  }

  function applyPreset() {
    const presetName = byId('freev-provider-preset')?.value || 'custom';
    const preset = PRESETS[presetName];
    if (!preset) return;
    if (preset.baseUrl) byId('freev-custom-base-url').value = preset.baseUrl;
    if (preset.model) byId('freev-custom-model').value = preset.model;
  }

  function saveConfig(options = {}) {
    const config = currentFormConfig();
    if (!config.baseUrl || !config.model || !isAllowedBaseUrl(config.baseUrl)) {
      chat.appendMessage('assistant', 'Renseigne une URL HTTP/HTTPS valide et le nom du modèle.', 'Configuration');
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (_) {
      chat.appendMessage('assistant', 'Le navigateur refuse l’enregistrement local de la configuration.', 'Configuration');
      return false;
    }
    setMode('custom');
    if (!options.keepPanel) byId('freev-api-settings')?.classList.add('hidden');
    return true;
  }

  function clearApiKey() {
    const config = currentFormConfig();
    config.apiKey = '';
    if (byId('freev-custom-api-key')) byId('freev-custom-api-key').value = '';
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (_) {}
    chat.appendMessage('assistant', 'La clé API enregistrée dans ce navigateur a été effacée.', 'Configuration');
  }

  async function sendCustomMessage(prompt) {
    const config = readStoredConfig();
    if (!config.baseUrl || !config.model || !isAllowedBaseUrl(config.baseUrl)) {
      chat.appendMessage('assistant', 'Configure d’abord ton fournisseur, son URL et son modèle avec le bouton « Configurer une clé API ».', 'Configuration');
      byId('freev-api-settings')?.classList.remove('hidden');
      return;
    }

    chat.appendMessage('user', prompt);
    const waiting = chat.appendMessage('assistant', 'Le modèle répond…', config.model);
    chat.state.sending = true;
    chat.setStatus('Réponse en cours…', 'wait');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const endpoint = /\/chat\/completions\/?$/.test(config.baseUrl)
      ? config.baseUrl
      : `${config.baseUrl}/chat/completions`;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;
      if (!content) throw new Error('Réponse vide');
      waiting.querySelector('p:last-child').textContent = String(content);
      chat.setStatus('Modèle prêt', 'ok');
    } catch (error) {
      const localHint = /^http:\/\/(localhost|127\.0\.0\.1)/i.test(config.baseUrl)
        ? ' Vérifie que le serveur local est démarré et autorise les requêtes du navigateur.'
        : '';
      waiting.querySelector('p:last-child').textContent = `Impossible de joindre ce modèle.${localHint}`;
      chat.setStatus('Modèle indisponible', 'error');
    } finally {
      clearTimeout(timer);
      chat.state.sending = false;
      chat.setStatus(byId('freev-v7-status')?.textContent?.trim() || 'Autre IA',
        byId('freev-v7-status-dot')?.classList.contains('bg-red-400') ? 'error' : 'ok');
    }
  }

  function installCommand(model) {
    return libraryState.runtime === 'ollama'
      ? `ollama pull ${model.model}`
      : `lms get "${model.name}"`;
  }

  function filteredModels() {
    const query = (byId('freev-model-search')?.value || '').trim().toLocaleLowerCase('fr');
    const family = byId('freev-model-family')?.value || 'all';
    const maxRamValue = byId('freev-model-ram')?.value || 'all';
    const maxRam = maxRamValue === 'all' ? Infinity : Number(maxRamValue);
    const sort = byId('freev-model-sort')?.value || 'recommended';
    const result = CATALOG.filter((model) => {
      const haystack = `${model.name} ${model.model} ${model.family} ${model.type}`.toLocaleLowerCase('fr');
      return (!query || haystack.includes(query))
        && (family === 'all' || model.family === family)
        && model.ramGB <= maxRam;
    });
    result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'fr');
      if (sort === 'size') return a.sizeGB - b.sizeGB || a.name.localeCompare(b.name, 'fr');
      const aFits = a.ramGB <= libraryState.deviceRam ? 1 : 0;
      const bFits = b.ramGB <= libraryState.deviceRam ? 1 : 0;
      return bFits - aFits || Number(b.popular) - Number(a.popular) || a.ramGB - b.ramGB;
    });
    return result;
  }

  function modelCard(model) {
    const article = document.createElement('article');
    article.className = 'flex flex-col rounded-xl border border-white/10 bg-slate-900/80 p-4';
    const fits = model.ramGB <= libraryState.deviceRam;
    const command = installCommand(model);
    const officialUrl = libraryState.runtime === 'ollama'
      ? `https://ollama.com/library/${encodeURIComponent(model.model.split(':')[0])}`
      : 'https://lmstudio.ai/models';

    const heading = document.createElement('div');
    heading.className = 'flex items-start justify-between gap-3';
    const text = document.createElement('div');
    const name = document.createElement('h4');
    name.className = 'font-bold text-white';
    name.textContent = model.name;
    const meta = document.createElement('p');
    meta.className = 'mt-1 text-[10px] text-gray-500';
    meta.textContent = `${model.family} · ${model.type}`;
    text.append(name, meta);
    const badge = document.createElement('span');
    badge.className = fits
      ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-200'
      : 'rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-200';
    badge.textContent = fits ? 'Adapté' : 'Gourmand';
    heading.append(text, badge);

    const resources = document.createElement('p');
    resources.className = 'mt-3 text-xs text-gray-300';
    resources.textContent = `≈ ${model.sizeGB} Go disque · ${model.ramGB} Go RAM`;

    const code = document.createElement('code');
    code.className = 'mt-3 block overflow-x-auto rounded-lg bg-black/40 p-2 text-[10px] text-cyan-200';
    code.textContent = command;

    const actions = document.createElement('div');
    actions.className = 'mt-3 flex flex-wrap gap-2';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'rounded-lg border border-cyan-400/25 px-2.5 py-2 text-[10px] font-bold text-cyan-100 hover:bg-cyan-500/10';
    copy.dataset.copyCommand = command;
    copy.textContent = 'Copier l’installation';
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'rounded-lg bg-fuchsia-500 px-2.5 py-2 text-[10px] font-bold text-white hover:bg-fuchsia-400';
    use.dataset.useModel = model.model;
    use.textContent = 'Utiliser dans Freev';
    const official = document.createElement('a');
    official.className = 'rounded-lg border border-white/10 px-2.5 py-2 text-[10px] font-bold text-gray-300 hover:bg-white/5';
    official.href = officialUrl;
    official.target = '_blank';
    official.rel = 'noopener noreferrer';
    official.textContent = 'Fiche officielle';
    actions.append(copy, use, official);
    article.append(heading, resources, code, actions);
    return article;
  }

  function renderLibrary() {
    const models = filteredModels();
    const pages = Math.max(1, Math.ceil(models.length / PAGE_SIZE));
    libraryState.page = Math.min(Math.max(1, libraryState.page), pages);
    const start = (libraryState.page - 1) * PAGE_SIZE;
    const grid = byId('freev-model-grid');
    if (grid) {
      grid.replaceChildren(...models.slice(start, start + PAGE_SIZE).map(modelCard));
      if (!models.length) {
        const empty = document.createElement('p');
        empty.className = 'col-span-full rounded-xl border border-white/10 p-6 text-center text-sm text-gray-400';
        empty.textContent = 'Aucun modèle ne correspond à ces filtres.';
        grid.appendChild(empty);
      }
    }
    if (byId('freev-model-count')) byId('freev-model-count').textContent = `${models.length} modèle${models.length > 1 ? 's' : ''}`;
    if (byId('freev-model-page')) byId('freev-model-page').textContent = `Page ${libraryState.page} / ${pages}`;
    if (byId('freev-model-prev')) byId('freev-model-prev').disabled = libraryState.page <= 1;
    if (byId('freev-model-next')) byId('freev-model-next').disabled = libraryState.page >= pages;
  }

  function updateRuntime(runtime) {
    libraryState.runtime = runtime === 'lmstudio' ? 'lmstudio' : 'ollama';
    const ollama = byId('freev-runtime-ollama');
    const lmstudio = byId('freev-runtime-lmstudio');
    ollama?.classList.toggle('bg-emerald-500', libraryState.runtime === 'ollama');
    ollama?.classList.toggle('text-slate-950', libraryState.runtime === 'ollama');
    ollama?.classList.toggle('text-gray-400', libraryState.runtime !== 'ollama');
    lmstudio?.classList.toggle('bg-emerald-500', libraryState.runtime === 'lmstudio');
    lmstudio?.classList.toggle('text-slate-950', libraryState.runtime === 'lmstudio');
    lmstudio?.classList.toggle('text-gray-400', libraryState.runtime !== 'lmstudio');
    renderLibrary();
  }

  async function copyCommand(button) {
    const command = button.dataset.copyCommand || '';
    try {
      await navigator.clipboard.writeText(command);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = command;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    const previous = button.textContent;
    button.textContent = 'Commande copiée';
    setTimeout(() => { button.textContent = previous; }, 1400);
  }

  function useLocalModel(modelName) {
    const presetName = libraryState.runtime === 'ollama' ? 'ollama' : 'lmstudio';
    const preset = PRESETS[presetName];
    byId('freev-provider-preset').value = presetName;
    byId('freev-custom-base-url').value = preset.baseUrl;
    byId('freev-custom-model').value = modelName;
    byId('freev-custom-api-key').value = '';
    saveConfig();
    closeLibrary();
    chat.appendMessage('assistant', `${modelName} est sélectionné. Démarre ${libraryState.runtime === 'ollama' ? 'Ollama' : 'le serveur local LM Studio'} avant d’envoyer un message.`, 'Configuration');
  }

  function openLibrary() {
    const modal = byId('freev-model-library-modal');
    if (!modal) return;
    libraryState.lastFocused = document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderLibrary();
    byId('freev-model-search')?.focus();
  }

  function closeLibrary() {
    const modal = byId('freev-model-library-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    libraryState.lastFocused?.focus?.();
  }

  function populateFamilies() {
    const select = byId('freev-model-family');
    if (!select) return;
    [...new Set(CATALOG.map((model) => model.family))].sort((a, b) => a.localeCompare(b, 'fr')).forEach((family) => {
      const option = document.createElement('option');
      option.value = family;
      option.textContent = family;
      select.appendChild(option);
    });
  }

  function init() {
    fillConfig(readStoredConfig());
    populateFamilies();
    if (byId('freev-device-recommendation')) {
      byId('freev-device-recommendation').textContent = navigator.deviceMemory
        ? `Mémoire détectée : environ ${libraryState.deviceRam} Go. Les modèles compatibles sont affichés en premier.`
        : 'Mémoire non détectée : classement basé sur une machine de 8 Go de RAM.';
    }

    byId('freev-mode-native')?.addEventListener('click', () => setMode('freev'));
    byId('freev-mode-custom')?.addEventListener('click', () => setMode('custom'));
    byId('freev-api-settings-button')?.addEventListener('click', () => {
      byId('freev-api-settings')?.classList.toggle('hidden');
    });
    byId('freev-provider-preset')?.addEventListener('change', applyPreset);
    byId('freev-save-api-settings')?.addEventListener('click', () => saveConfig());
    byId('freev-clear-api-key')?.addEventListener('click', clearApiKey);
    byId('freev-model-library-button')?.addEventListener('click', openLibrary);
    byId('freev-model-library-close')?.addEventListener('click', closeLibrary);
    byId('freev-runtime-ollama')?.addEventListener('click', () => updateRuntime('ollama'));
    byId('freev-runtime-lmstudio')?.addEventListener('click', () => updateRuntime('lmstudio'));
    ['freev-model-search', 'freev-model-family', 'freev-model-ram', 'freev-model-sort'].forEach((id) => {
      const eventName = id === 'freev-model-search' ? 'input' : 'change';
      byId(id)?.addEventListener(eventName, () => { libraryState.page = 1; renderLibrary(); });
    });
    byId('freev-model-prev')?.addEventListener('click', () => { libraryState.page -= 1; renderLibrary(); });
    byId('freev-model-next')?.addEventListener('click', () => { libraryState.page += 1; renderLibrary(); });
    byId('freev-model-grid')?.addEventListener('click', (event) => {
      const copyButton = event.target.closest('[data-copy-command]');
      if (copyButton) copyCommand(copyButton);
      const useButton = event.target.closest('[data-use-model]');
      if (useButton) useLocalModel(useButton.dataset.useModel);
    });
    byId('freev-model-library-modal')?.addEventListener('click', (event) => {
      if (event.target === byId('freev-model-library-modal')) closeLibrary();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !byId('freev-model-library-modal')?.classList.contains('hidden')) closeLibrary();
    });
    renderLibrary();
  }

  window.FreevAiOptions = Object.freeze({ sendCustomMessage, setMode, openLibrary });
  init();
})();
