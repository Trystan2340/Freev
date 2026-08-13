import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((config) => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, options) => {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url === "https://freev-iies.onrender.com/api/site/config") {
        return Promise.resolve(new Response(JSON.stringify(config), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
      return nativeFetch(input, options);
    };
  }, {
    ok: true,
    maintenance: { enabled: false, scope: "global", modules: [] },
    design: { primary: "#22D3EE", secondary: "#A855F7", background: "midnight", cardRadius: 22 },
  });
});

async function expectNoHorizontalOverflow(page, label = "page") {
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content, `${label}: largeur ${sizes.content}px pour un écran de ${sizes.viewport}px`).toBeLessThanOrEqual(sizes.viewport + 1);
}

test("le catalogue logiciels rend les quatorze icônes officielles et filtre les cartes", async ({ page }) => {
  await page.goto("/logiciels/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#software-grid .catalog-card")).toHaveCount(14);
  const icons = page.locator("#software-grid freev-icon");
  await expect(icons).toHaveCount(14);
  await expect.poll(() => icons.evaluateAll((elements) => elements.every((icon) => {
    const bounds = icon.getBoundingClientRect();
    return bounds.width >= 64 && bounds.height >= 64 && Boolean(icon.shadowRoot?.querySelector("canvas"));
  }))).toBe(true);
  await page.locator("[data-filter=dev]").click();
  await expect(page.locator("#software-grid .catalog-card")).toHaveCount(1);
  await page.locator("#catalog-search").fill("CV");
  await expect(page.locator("#software-grid .empty-state")).toBeVisible();
  await page.locator("[data-filter=all]").click();
  await expect(page.locator("#software-grid .catalog-card")).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
});

test("l’accueil affiche les quatorze icônes officielles des logiciels", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const icons = page.locator("#logiciels freev-icon");
  await expect(icons).toHaveCount(14);
  await expect.poll(() => icons.evaluateAll((elements) => elements.every((icon) => {
    const bounds = icon.getBoundingClientRect();
    return bounds.width === 64 && bounds.height === 64 && Boolean(icon.shadowRoot?.querySelector("canvas"));
  }))).toBe(true);
});

test("les cinq logiciels GitHub sont intégrés à Freev et restent utilisables", async ({ page }) => {
  // WebKit peut refuser le service worker sur le serveur local numérique même si
  // l'application intercepte cette erreur. Le mode hors-ligne est testé séparément.
  await page.addInitScript(() => {
    if (navigator.serviceWorker) {
      Object.defineProperty(navigator.serviceWorker, "register", {
        configurable: true,
        value: async () => ({
          active: null,
          installing: null,
          addEventListener() {},
          update: async () => {},
        }),
      });
    }
  });
  const tools = [
    ["/logiciels/qrstudio.html", "QR Studio", "QR_Studio"],
    ["/logiciels/markdownstudio.html", "Markdown Studio", "Markdown_Studio"],
    ["/logiciels/csvexplorer.html", "CSV Explorer", "CSV_Explorer"],
    ["/logiciels/signaturestudio.html", "Signature Studio", "Signature_Studio"],
    ["/logiciels/cropstudio.html", "Crop Studio", "Crop_Studio"],
  ];
  for (const [route, title, iconId] of tools) {
    const errors = [];
    const collectError = (error) => errors.push(error.message);
    page.on("pageerror", collectError);
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /Retour aux logiciels/ })).toHaveAttribute("href", "./");
    await expect(page.locator(`freev-icon[app="${iconId}"]`).first()).toBeVisible();
    await expectNoHorizontalOverflow(page, route);
    expect(errors).toEqual([]);
    page.off("pageerror", collectError);
  }
});

test("QR Studio et Markdown Studio exécutent leurs fonctions principales", async ({ page }) => {
  await page.goto("/logiciels/qrstudio.html", { waitUntil: "domcontentloaded" });
  await page.locator("#qr-content").fill("https://example.com/freev");
  await page.locator("#qr-generate").click();
  await expect(page.locator("#qr-output canvas, #qr-output img")).toHaveCount(2);

  await page.goto("/logiciels/markdownstudio.html", { waitUntil: "domcontentloaded" });
  await page.locator("#markdown-input").fill("# Test Freev\n\n**Fonctionnel**");
  await expect(page.locator("#markdown-preview h1")).toHaveText("Test Freev");
  await expect(page.locator("#markdown-preview strong")).toHaveText("Fonctionnel");
});

test("Excalidraw charge le véritable éditeur et sauvegarde une modification", async ({ page }) => {
  await page.goto("/logiciels/excalidraw.html", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: /Retour aux logiciels/ })).toHaveAttribute("href", "./");
  await expect(page.locator('freev-icon[app="Excalidraw"]')).toBeVisible();
  await expect(page.locator("#excalidraw-root .excalidraw")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".App-toolbar-container")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/logiciels/excalidraw.html");

  const canvas = page.locator("#excalidraw-root canvas").first();
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds.x + 100, bounds.y + 120);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 220, bounds.y + 200, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator("#excalidraw-save-state")).toContainText("Sauvegardé", { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("freev-excalidraw-v1", 1);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction("scenes", "readonly").objectStore("scenes").get("current");
      read.onsuccess = () => { database.close(); resolve(Boolean(read.result)); };
      read.onerror = () => reject(read.error);
    };
    request.onerror = () => reject(request.error);
  }))).toBe(true);
});

test("la page jeux rend les sept jeux, la sélection et la recherche", async ({ page }) => {
  await page.goto("/jeux/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#featured-game img")).toBeVisible();
  await expect(page.locator("#game-grid .game-card")).toHaveCount(7);
  await page.locator("#catalog-search").fill("snake");
  await expect(page.locator("#game-grid .game-card")).toHaveCount(1);
  await expect(page.locator("#game-grid h3")).toHaveText("NEON SNAKE");
  await expectNoHorizontalOverflow(page);
});

test("la page IA conserve la configuration, l’historique et la bibliothèque", async ({ page }) => {
  await page.route(/\/status$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, version: "7.0" }),
  }));
  await page.goto("/outils-ia/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#freev-v7-form")).toBeVisible();
  await expect(page.locator("[data-status-text]")).toHaveText("En ligne");
  await page.locator("#freev-api-settings-button").click();
  await expect(page.locator("#freev-api-settings")).toBeVisible();
  await page.locator("#freev-model-library-button").click();
  await expect(page.locator("#freev-model-library-modal")).toBeVisible();
  await expect(page.locator("#freev-model-grid > article")).toHaveCount(18);
  await page.locator("#freev-model-library-close").click();
  await page.locator("#freev-history-button").click();
  await expect(page.locator("#freev-history-modal")).toBeVisible();
  await page.locator("#freev-history-close").click();
  await expectNoHorizontalOverflow(page);
});

test("les nouvelles pages ne produisent aucune erreur JavaScript ni ressource locale cassée", async ({ page }) => {
  await page.addInitScript(() => {
    if (navigator.serviceWorker) {
      Object.defineProperty(navigator.serviceWorker, "register", {
        configurable: true,
        value: async () => ({ active: null }),
      });
    }
  });
  const pageErrors = [];
  const brokenLocalResponses = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.hostname === "127.0.0.1" && response.status() >= 400) {
      brokenLocalResponses.push(`${response.status()} ${url.pathname}`);
    }
  });
  await page.route(/\/status$/, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, version: "7.0" }),
  }));
  for (const route of ["/logiciels/", "/jeux/", "/outils-ia/", "/legal/"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
  }
  // WebKit Linux signale parfois le nettoyage reCAPTCHA externe comme une
  // erreur CORS. Ce bruit fournisseur ne correspond pas à une erreur Freev.
  const relevantErrors = pageErrors.filter((message) => !(
    message.includes("www.google.com/recaptcha/api2/clr")
    && message.includes("access control checks")
  ));
  expect(relevantErrors).toEqual([]);
  expect(brokenLocalResponses).toEqual([]);
});

test("le menu mobile ouvre les pages dédiées sans quitter l’écran", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Contrôle réservé au viewport mobile");
  await page.goto("/logiciels/", { waitUntil: "domcontentloaded" });
  const toggle = page.locator(".mobile-toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-mobile-nav")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
