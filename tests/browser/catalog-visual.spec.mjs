import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://freev-iies.onrender.com/api/site/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      ok: true,
      maintenance: { enabled: false, scope: "global", modules: [] },
      design: { primary: "#22D3EE", secondary: "#A855F7", background: "midnight", cardRadius: 22 },
    }),
  }));
});

const routes = [
  ["logiciels", "/logiciels/", "#software-grid .catalog-card"],
  ["jeux", "/jeux/", "#game-grid .game-card"],
  ["outils-ia", "/outils-ia/", "#freev-v7-form"],
];

for (const [name, route, readySelector] of routes) {
  test(`référence visuelle ${name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes("safari"), "Référence visuelle Chromium uniquement");
    await page.route(/\/status$/, (request) => request.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, version: "7.0" }),
    }));
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(readySelector).first()).toBeVisible();
    await page.locator("freev-icon").evaluateAll((icons) => icons.forEach((icon) => icon.setAttribute("motion", "off")));
    await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
    await page.waitForTimeout(350);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      animations: "disabled",
      caret: "hide",
      fullPage: false,
      maxDiffPixelRatio: 0.01,
    });
  });
}
