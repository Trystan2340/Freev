import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicConfig = (maintenance = { enabled: false, scope: "global", modules: [] }) => ({
  ok: true,
  maintenance: {
    publicTitle: "Maintenance Freev",
    publicMessage: "Freev revient bientôt. Merci pour ta patience.",
    expectedBackAt: null,
    ...maintenance,
  },
  design: {
    primary: "#10B981",
    secondary: "#8B5CF6",
    background: "midnight",
    iconTheme: "emerald",
    iconVariant: "glass",
    motion: "normal",
    cardRadius: 24,
    density: "comfortable",
    version: 3,
  },
});

async function noOverflow(page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
}

test("la maintenance publique affiche uniquement les informations publiques", async ({ page }) => {
  await page.route("https://freev-iies.onrender.com/api/site/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(publicConfig({
      enabled: true,
      scope: "global",
      modules: [],
      publicTitle: "Mise à niveau Freev",
      publicMessage: "Le nouveau site revient dans quelques instants.",
      expectedBackAt: "2026-08-09T16:00:00Z",
    })),
  }));
  await page.goto("/maintenance.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#maintenance-title")).toHaveText("Mise à niveau Freev");
  await expect(page.locator("#maintenance-message")).toContainText("nouveau site");
  await expect(page.locator("body")).not.toContainText("reasonInternal");
  await noOverflow(page);
});

test("le design publié est appliqué à une page de catalogue", async ({ page }) => {
  await page.route("https://freev-iies.onrender.com/api/site/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(publicConfig()),
  }));
  await page.goto("/logiciels/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim())).toBe("#10B981");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim())).toBe("24px");
});

test("NEXUS reste fermé sans session Firebase et ne révèle pas le tableau de bord", async ({ page }) => {
  await page.goto("/nexus.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#nexus-gate")).toBeVisible();
  await expect(page.locator("#nexus-dashboard")).toBeHidden();
  await expect(page.locator("#nexus-gate-title")).toContainText(/Connexion|Session|Accès/);
  await noOverflow(page);
});

test("la structure du tableau NEXUS reste utilisable sur l’écran courant", async ({ page }) => {
  await page.goto("/nexus.html", { waitUntil: "domcontentloaded" });
  // Attend la fin du contrôle Firebase avant de figer l'état visuel du tableau.
  await expect(page.locator("#nexus-gate")).toBeVisible();
  await page.evaluate(() => {
    document.getElementById("nexus-gate").classList.add("hidden");
    document.getElementById("nexus-dashboard").classList.remove("hidden");
  });
  await expect(page.locator("#maintenance-form")).toBeVisible();
  await expect(page.locator("#design-form")).toBeVisible();
  await noOverflow(page);
  const results = await new AxeBuilder({ page })
    .include("#nexus-dashboard")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
