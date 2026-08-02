import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__freevSpokenChunks = [];

    class MockUtterance {
      constructor(text) {
        this.text = String(text || "");
        this.volume = 1;
        this.rate = 1;
        this.pitch = 1;
        this.lang = "fr-FR";
        this.voice = null;
      }
    }

    class MockRecognition {
      start() { this.onstart?.(); }
      stop() { window.setTimeout(() => this.onend?.(), 0); }
    }

    const voice = { voiceURI: "freev-test-fr", name: "Freev Test", lang: "fr-FR" };
    const synthesis = {
      cancel() {},
      resume() {},
      getVoices: () => [voice],
      addEventListener() {},
      speak(utterance) {
        if (utterance.volume > 0 && utterance.text.trim()) window.__freevSpokenChunks.push(utterance.text);
        window.setTimeout(() => {
          utterance.onstart?.();
          utterance.onend?.();
        }, 0);
      },
    };

    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: MockRecognition });
    Object.defineProperty(window, "webkitSpeechRecognition", { configurable: true, value: MockRecognition });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synthesis });
  });

  await page.route("http://127.0.0.1:10000/status", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      ok: true,
      version: "7.0",
      mode: "conversation-texte",
      ollama: false,
      code_mode: true,
      html_mode: true,
      full_runtime: true,
      full_runtime_files: 248,
      voice: true,
      voice_runtime: "browser-immersive",
    }),
  }));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(window.FreevV7Chat?.state?.online))).toBe(true);
});

test("le mode immersif lit toute la réponse par morceaux sans remplir le champ normal", async ({ page }) => {
  await page.locator("#freev-voice-button").click();
  await expect(page.locator("#freev-voice-modal")).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("freev:assistant-response", {
    detail: {
      text: `Voici la réponse vocale demandée. ${"Elle reste fluide sur mobile et ordinateur. ".repeat(18)}`,
    },
  })));

  await expect.poll(() => page.evaluate(() => window.__freevSpokenChunks.length)).toBeGreaterThan(1);
  await expect(page.locator("#freev-voice-state")).toHaveText(/À toi|Je t'écoute/);
  await expect(page.locator("#freev-v7-input")).toHaveValue("");
});
