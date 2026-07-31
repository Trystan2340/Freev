import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/", "/nova.html", "/profil.html?id=profil-inexistant"]) {
  test(`WCAG 2.2 sans violation sérieuse sur ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

test("l’index charge la feuille Tailwind locale et reste utilisable au clavier", async ({ page }, testInfo) => {
  const responses = [];
  page.on("response", (response) => responses.push(response.url()));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const primaryControl = testInfo.project.name.includes("mobile")
    ? page.locator("#mobile-menu-btn")
    : page.locator("#open-login-modal");
  await expect(primaryControl).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toHaveCount(1);
  expect(responses.some((url) => url.includes("/css/tailwind.generated.css"))).toBe(true);
  expect(responses.some((url) => url.includes("cdn.tailwindcss.com"))).toBe(false);
  const timing = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd || 0);
  expect(timing).toBeLessThan(8_000);
});
