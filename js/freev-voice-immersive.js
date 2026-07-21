(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const modal = byId('freev-voice-modal');
  const openButton = byId('freev-voice-button');
  const closeButton = byId('freev-voice-close');
  const micButton = byId('freev-voice-mic');
  const speechToggle = byId('freev-voice-speech-toggle');
  const voiceSelect = byId('freev-voice-select');
  const stage = byId('freev-voice-stage');
  const stateLabel = byId('freev-voice-state');
  const transcript = byId('freev-voice-transcript');
  const chatForm = byId('freev-v7-form');
  const chatInput = byId('freev-v7-input');

  if (!modal || !openButton || !micButton || !stage || !stateLabel || !transcript) return;

  // La carte du chat utilise des transformations d'apparition. Déplacer la
  // modale sous <body> garantit que son positionnement fixe couvre réellement
  // tout l'écran sur ordinateur comme sur mobile.
  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  const storageKeys = {
    speech: 'freev_voice_auto_speech',
    voice: 'freev_voice_selected_uri'
  };
  const state = {
    open: false,
    listening: false,
    awaitingResponse: false,
    speaking: false,
    manualPaused: false,
    finalTranscript: '',
    lastFocus: null,
    recognition: null,
    autoSpeech: true,
    voices: []
  };

  try {
    state.autoSpeech = localStorage.getItem(storageKeys.speech) !== 'false';
  } catch (_) {
    state.autoSpeech = true;
  }

  function setVisualState(name, label, detail) {
    stage.dataset.state = name;
    stateLabel.textContent = label;
    if (typeof detail === 'string' && detail.trim()) transcript.textContent = detail;

    const icon = micButton.querySelector('i');
    const text = micButton.querySelector('span');
    const listening = name === 'listening';
    micButton.setAttribute('aria-label', listening ? "Arrêter l'écoute" : "Démarrer l'écoute");
    if (icon) icon.className = listening ? 'fa-solid fa-stop' : 'fa-solid fa-microphone';
    if (text) text.textContent = listening ? 'Arrêter' : 'Écouter';
  }

  function updateSpeechButton() {
    speechToggle?.setAttribute('aria-pressed', String(state.autoSpeech));
    speechToggle?.classList.toggle('opacity-55', !state.autoSpeech);
    const icon = speechToggle?.querySelector('i');
    const text = speechToggle?.querySelector('span');
    if (icon) icon.className = state.autoSpeech ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    if (text) text.textContent = state.autoSpeech ? 'Réponse vocale' : 'Voix coupée';
  }

  function selectedVoice() {
    const selectedUri = voiceSelect?.value || '';
    return state.voices.find((voice) => voice.voiceURI === selectedUri)
      || state.voices.find((voice) => /^fr(?:-|_)/i.test(voice.lang || ''))
      || state.voices[0]
      || null;
  }

  function populateVoices() {
    if (!voiceSelect || !synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    state.voices = [...voices].sort((a, b) => {
      const aFr = /^fr(?:-|_)/i.test(a.lang || '') ? 0 : 1;
      const bFr = /^fr(?:-|_)/i.test(b.lang || '') ? 0 : 1;
      return aFr - bFr || a.name.localeCompare(b.name, 'fr');
    });

    let saved = '';
    try { saved = localStorage.getItem(storageKeys.voice) || ''; } catch (_) {}
    voiceSelect.replaceChildren();
    state.voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} · ${voice.lang || 'langue inconnue'}`;
      voiceSelect.appendChild(option);
    });
    const preferred = state.voices.find((voice) => voice.voiceURI === saved)
      || state.voices.find((voice) => /^fr-FR$/i.test(voice.lang || ''))
      || state.voices.find((voice) => /^fr(?:-|_)/i.test(voice.lang || ''))
      || state.voices[0];
    if (preferred) voiceSelect.value = preferred.voiceURI;
  }

  function cleanForSpeech(value) {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' Un exemple de code est affiché dans la conversation. ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#>`~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2600);
  }

  function stopRecognition() {
    if (!state.recognition) return;
    try { state.recognition.stop(); } catch (_) {}
    state.listening = false;
  }

  function startListening() {
    if (!state.open || !Recognition || state.awaitingResponse || state.speaking) return;
    state.manualPaused = false;
    if (!state.recognition) createRecognition();
    try {
      state.finalTranscript = '';
      state.recognition.start();
    } catch (error) {
      if (error?.name !== 'InvalidStateError') {
        setVisualState('error', 'Microphone indisponible', 'Réessaie ou vérifie les autorisations du navigateur.');
      }
    }
  }

  function resumeListeningSoon() {
    if (!state.open || state.manualPaused || state.awaitingResponse || state.speaking) return;
    window.setTimeout(startListening, 420);
  }

  function submitTranscript(value) {
    const prompt = String(value || '').trim();
    if (!prompt || !chatForm || !chatInput) {
      setVisualState('error', 'Message non envoyé', "La zone de discussion n'est pas disponible.");
      return;
    }
    state.awaitingResponse = true;
    state.manualPaused = false;
    stopRecognition();
    if (synth) synth.cancel();
    chatInput.value = prompt;
    setVisualState('thinking', 'Freev réfléchit', prompt);
    chatForm.requestSubmit();
  }

  function createRecognition() {
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      state.finalTranscript = '';
      setVisualState('listening', "Je t'écoute", 'Parle naturellement…');
    };
    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript || '';
        if (event.results[index].isFinal) finalText += text;
        else interim += text;
      }
      if (finalText.trim()) state.finalTranscript = `${state.finalTranscript} ${finalText}`.trim();
      transcript.textContent = state.finalTranscript || interim || 'Parle naturellement…';
    };
    recognition.onspeechend = () => {
      try { recognition.stop(); } catch (_) {}
    };
    recognition.onend = () => {
      state.listening = false;
      if (state.finalTranscript.trim()) {
        const prompt = state.finalTranscript.trim();
        state.finalTranscript = '';
        submitTranscript(prompt);
        return;
      }
      if (state.open && !state.manualPaused && !state.awaitingResponse) {
        setVisualState('idle', 'Je suis prêt', 'Je n’ai rien entendu. Tu peux réessayer.');
        resumeListeningSoon();
      }
    };
    recognition.onerror = (event) => {
      state.listening = false;
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed';
      const noSpeech = event.error === 'no-speech';
      if (denied) {
        state.manualPaused = true;
        setVisualState('error', 'Autorisation du micro refusée', 'Autorise le microphone dans les réglages du navigateur, puis réessaie.');
      } else if (noSpeech) {
        setVisualState('idle', 'Aucune parole détectée', 'Parle un peu plus près du micro.');
      } else {
        setVisualState('error', 'Écoute interrompue', `Le navigateur indique : ${event.error || 'erreur inconnue'}.`);
      }
    };
    state.recognition = recognition;
  }

  function speak(value) {
    const text = cleanForSpeech(value);
    state.awaitingResponse = false;
    if (!state.open) return;
    if (!synth || !state.autoSpeech || !text) {
      state.speaking = false;
      setVisualState('idle', 'Réponse affichée', 'Tu peux continuer à parler.');
      resumeListeningSoon();
      return;
    }

    stopRecognition();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = selectedVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      state.speaking = true;
      setVisualState('speaking', 'Freev te répond', text);
    };
    utterance.onend = () => {
      state.speaking = false;
      if (!state.open) return;
      setVisualState('idle', 'À toi', 'Je suis prêt pour ta prochaine question.');
      resumeListeningSoon();
    };
    utterance.onerror = () => {
      state.speaking = false;
      if (!state.open) return;
      setVisualState('error', 'Lecture vocale interrompue', 'La réponse reste visible dans la conversation.');
    };
    synth.speak(utterance);
  }

  function openModal() {
    state.open = true;
    state.manualPaused = false;
    state.lastFocus = document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('freev-voice-open');
    if (!Recognition) {
      micButton.disabled = true;
      setVisualState('error', 'Reconnaissance vocale non disponible', 'Utilise Chrome, Edge ou Safari récent. La lecture des réponses peut rester active.');
      closeButton?.focus();
      return;
    }
    micButton.disabled = false;
    setVisualState('idle', 'Prêt à écouter', 'Autorise le microphone si le navigateur te le demande.');
    startListening();
  }

  function closeModal() {
    state.open = false;
    state.manualPaused = true;
    state.awaitingResponse = false;
    state.speaking = false;
    stopRecognition();
    if (synth) synth.cancel();
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('freev-voice-open');
    if (state.lastFocus instanceof HTMLElement) state.lastFocus.focus();
  }

  openButton.addEventListener('click', openModal);
  closeButton?.addEventListener('click', closeModal);
  micButton.addEventListener('click', () => {
    if (state.listening) {
      state.manualPaused = true;
      stopRecognition();
      setVisualState('idle', 'Micro en pause', 'Appuie sur Écouter pour reprendre.');
      return;
    }
    if (state.speaking && synth) {
      synth.cancel();
      state.speaking = false;
    }
    state.awaitingResponse = false;
    startListening();
  });
  speechToggle?.addEventListener('click', () => {
    state.autoSpeech = !state.autoSpeech;
    try { localStorage.setItem(storageKeys.speech, String(state.autoSpeech)); } catch (_) {}
    if (!state.autoSpeech && synth) {
      synth.cancel();
      state.speaking = false;
      if (state.open) {
        setVisualState('idle', 'Lecture vocale désactivée', 'Le microphone peut rester actif.');
        resumeListeningSoon();
      }
    }
    updateSpeechButton();
  });
  voiceSelect?.addEventListener('change', () => {
    try { localStorage.setItem(storageKeys.voice, voiceSelect.value); } catch (_) {}
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.open) closeModal();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.open) {
      state.manualPaused = true;
      stopRecognition();
      if (synth) synth.cancel();
    }
  });
  window.addEventListener('freev:thinking-start', () => {
    if (!state.open) return;
    state.awaitingResponse = true;
    stopRecognition();
    setVisualState('thinking', 'Freev réfléchit', 'Recherche dans le cerveau Freev V7…');
  });
  window.addEventListener('freev:assistant-response', (event) => {
    const text = event.detail?.text || '';
    speak(text);
  });

  if (synth) {
    populateVoices();
    synth.addEventListener?.('voiceschanged', populateVoices);
  } else {
    speechToggle?.setAttribute('disabled', '');
    voiceSelect?.setAttribute('disabled', '');
  }
  updateSpeechButton();

  window.FreevVoiceImmersive = Object.freeze({
    open: openModal,
    close: closeModal,
    startListening,
    stopListening: () => {
      state.manualPaused = true;
      stopRecognition();
    },
    isSupported: Boolean(Recognition),
    state
  });
})();
