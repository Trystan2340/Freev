import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

test("le socle Freev ID V2 charge sans débordement horizontal", async ({ page }) => {
  await expect(page).toHaveTitle(/Freev/);
  await expect(page.getByRole("heading", { name: "L'Univers Digital Sans Limites" })).toBeVisible();
  await expect(page.locator("#freev-id-studio")).toHaveCount(1);

  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("la connexion reste utilisable et cadrée", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name.includes("mobile");

  if (isMobile) {
    const menuButton = page.getByRole("button", { name: "Ouvrir le menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await page.locator("#open-login-modal-mobile").click();
  } else {
    await page.locator("#open-login-modal").click();
  }

  const modal = page.locator("#login-modal");
  const card = page.locator("#login-modal > div > div");
  await expect(modal).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connexion Freev" })).toBeVisible();
  await expect(page.getByPlaceholder("Email")).toBeVisible();
  await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();

  const [box, viewport] = await Promise.all([
    card.boundingBox(),
    page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
  ]);
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
});

test("le centre de compte complet est présent sans exposer de données", async ({ page }) => {
  await expect(page.locator("#freev-account-center")).toHaveCount(1);
  const tabs = page.locator("#freev-account-center [role='tab']");
  await expect(tabs).toHaveCount(5);
  await expect(tabs).toHaveText(["Public", "Photo", "Mémoires", "Appareils", "Données"]);
  await expect(page.locator("#profile-section")).toHaveClass(/hidden/);
});

test("une URL de profil public invalide échoue proprement", async ({ page }) => {
  await page.goto("/profil.html?id=%3Cscript%3E", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Profil indisponible" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("<script>");
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflow).toBeLessThanOrEqual(1);
});
