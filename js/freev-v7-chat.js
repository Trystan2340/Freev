(() => {
  'use strict';

  const FREEV_V7_SERVER = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    ? 'http://127.0.0.1:10000'
    : 'https://freev-iies.onrender.com';
  window.FreevV7Server = FREEV_V7_SERVER;
  const state = { online: false, sending: false, mode: 'freev' };
  const byId = (id) => document.getElementById(id);

  function setStatus(label, tone = 'wait') {
    const status = byId('freev-v7-status');
    const dot = byId('freev-v7-status-dot');
    const send = byId('freev-v7-send');
    if (!status || !dot) return;
    const tones = {
      ok: ['#34d399', '#b7f7df', 'En ligne'],
      wait: ['#facc15', '#ffeca0', 'Connexion…'],
      error: ['#fb7185', '#fecdd3', 'Indisponible']
    };
    const selected = tones[tone] || tones.wait;
    dot.style.background = selected[0];
    dot.style.boxShadow = `0 0 12px ${selected[0]}`;
    status.style.color = selected[1];
    const text = status.querySelector('[data-status-text]');
    if (text) text.textContent = label || selected[2];
    if (send) send.disabled = state.sending || (state.mode === 'freev' && !state.online);
  }

  function appendMessage(role, text, assistantLabel) {
    const output = byId('freev-v7-output');
    if (!output) return null;
    const box = document.createElement('div');
    const title = document.createElement('p');
    const body = document.createElement('p');
    const isUser = role === 'user';
    box.className = isUser
      ? 'ml-6 rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/5 p-3 text-gray-200'
      : 'mr-6 rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3 text-gray-300';
    title.className = isUser ? 'font-bold text-fuchsia-200' : 'font-bold text-cyan-200';
    title.textContent = isUser ? 'Toi' : (assistantLabel || 'Freev V7');
    body.className = 'mt-1 whitespace-pre-wrap leading-relaxed';
    body.textContent = String(text || '');
    box.append(title, body);
    output.appendChild(box);
    output.scrollTop = output.scrollHeight;
    return box;
  }

  function startThinking(box, options = {}) {
    const body = box?.querySelector('p:last-child');
    const output = byId('freev-v7-output');
    if (!body) return box;
    const headline = String(options.headline || 'Le modèle réfléchit');
    const detail = String(options.detail || 'Préparation de la réponse');
    box.classList.add('freev-thinking-message');
    box.dataset.freevThinking = 'true';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-label', `${headline}. ${detail}`);
    output?.setAttribute('aria-busy', 'true');
    body.className = 'freev-thinking-body mt-2';
    body.replaceChildren();
    const orb = document.createElement('span');
    orb.className = 'freev-thinking-orb';
    orb.setAttribute('aria-hidden', 'true');
    const firstRing = document.createElement('span');
    const secondRing = document.createElement('span');
    const core = document.createElement('span');
    firstRing.className = secondRing.className = 'freev-thinking-ring';
    core.className = 'freev-thinking-core';
    orb.append(firstRing, secondRing, core);
    const copy = document.createElement('span');
    copy.className = 'freev-thinking-copy';
    const headlineRow = document.createElement('span');
    headlineRow.className = 'freev-thinking-headline';
    const headlineText = document.createElement('span');
    headlineText.textContent = headline;
    const dots = document.createElement('span');
    dots.className = 'freev-thinking-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'freev-thinking-dot';
      dots.appendChild(dot);
    }
    headlineRow.append(headlineText, dots);
    const detailText = document.createElement('span');
    detailText.className = 'freev-thinking-detail';
    detailText.textContent = detail;
    copy.append(headlineRow, detailText);
    body.append(orb, copy);
    if (output) output.scrollTop = output.scrollHeight;
    window.dispatchEvent(new CustomEvent('freev:thinking-start', { detail: { headline, detail } }));
    return box;
  }

  function finishThinking(box, text) {
    const body = box?.querySelector('p:last-child');
    const output = byId('freev-v7-output');
    if (!body) return;
    box.classList.remove('freev-thinking-message');
    delete box.dataset.freevThinking;
    box.removeAttribute('role');
    box.removeAttribute('aria-label');
    body.className = 'mt-1 whitespace-pre-wrap leading-relaxed';
    body.textContent = String(text || 'Réponse vide.');
    output?.setAttribute('aria-busy', 'false');
    if (output) output.scrollTop = output.scrollHeight;
    window.dispatchEvent(new CustomEvent('freev:assistant-response', { detail: { text: String(text || 'Réponse vide.') } }));
  }

  async function checkNative() {
    setStatus('Connexion…', 'wait');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${FREEV_V7_SERVER}/status`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const serverStatus = await response.json();
      if (!serverStatus.ok || !String(serverStatus.version || '').startsWith('7')) throw new Error('Service V7 non vérifié');
      state.online = true;
      if (state.mode === 'freev') setStatus('En ligne', 'ok');
    } catch (_) {
      state.online = false;
      if (state.mode === 'freev') setStatus('Service en réveil', 'error');
    }
  }

  async function sendNative(message) {
    const prompt = String(message || '').trim();
    if (!prompt || state.sending || !state.online || state.mode !== 'freev') return false;
    appendMessage('user', prompt);
    const waiting = appendMessage('assistant', 'Préparation de la réponse…');
    startThinking(waiting, { headline: 'Freev V7 réfléchit', detail: 'Recherche dans la base native Freev' });
    state.sending = true;
    setStatus('Réponse en cours…', 'wait');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${FREEV_V7_SERVER}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message: prompt }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || !String(data.version || '').startsWith('7')) throw new Error(data.error || 'Réponse V7 invalide');
      finishThinking(waiting, data.response || 'Réponse vide.');
      window.FreevAiOptions?.saveHistory?.({ mode: 'freev', model: 'Freev Brain V7', question: prompt, response: data.response || '' });
      state.online = true;
      setStatus('En ligne', 'ok');
      return true;
    } catch (_) {
      finishThinking(waiting, 'Freev V7 est momentanément indisponible. Réessaie dans quelques instants.');
      state.online = false;
      setStatus('Indisponible', 'error');
      return false;
    } finally {
      state.sending = false;
      const send = byId('freev-v7-send');
      if (send) send.disabled = !state.online;
    }
  }

  async function submitPrompt(message) {
    const prompt = String(message || '').trim();
    if (!prompt || state.sending) return false;
    if (state.mode === 'custom') {
      if (!window.FreevAiOptions?.sendCustomMessage) return false;
      await window.FreevAiOptions.sendCustomMessage(prompt);
      return true;
    }
    if (!state.online) {
      await checkNative();
      if (!state.online) return false;
    }
    return sendNative(prompt);
  }

  const form = byId('freev-v7-form');
  const input = byId('freev-v7-input');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const prompt = (input?.value || '').trim();
    if (!prompt) return;
    if (input) input.value = '';
    void submitPrompt(prompt);
  });
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form?.requestSubmit();
    }
  });

  window.FreevV7Chat = Object.freeze({ state, setStatus, appendMessage, startThinking, finishThinking, submitPrompt, checkNative });
  void checkNative();
})();
