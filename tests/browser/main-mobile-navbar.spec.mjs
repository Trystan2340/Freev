import { expect, test } from "@playwright/test";

test("la barre principale suit toujours le défilement", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(350);

  const readNavbar = () => page.evaluate(() => {
    const navbar = document.querySelector("#navbar");
    const rect = navbar?.getBoundingClientRect();
    return {
      position: navbar ? getComputedStyle(navbar).position : null,
      top: rect?.top ?? null,
      right: rect?.right ?? null,
      bottom: rect?.bottom ?? null,
      left: rect?.left ?? null,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentWidth: document.documentElement.scrollWidth,
      viewportOffset: navbar?.style.getPropertyValue("--freev-mobile-viewport-offset") || "",
    };
  });

  const before = await readNavbar();
  await page.evaluate(() => window.scrollTo(0, Math.max(900, document.documentElement.scrollHeight * 0.55)));
  await page.waitForTimeout(180);
  const after = await readNavbar();

  expect(before.position).toBe("fixed");
  expect(after.position).toBe("fixed");
  expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1.5);
  expect(after.left).toBeGreaterThanOrEqual(0);
  expect(after.right).toBeLessThanOrEqual(after.viewportWidth + 1);
  expect(after.documentWidth).toBeLessThanOrEqual(after.viewportWidth + 1);

  if (testInfo.project.name.includes("mobile")) {
    expect(before.viewportOffset).toMatch(/^\d+px$/);
    expect(after.viewportOffset).toMatch(/^\d+px$/);
    expect(after.viewportHeight - after.bottom).toBeGreaterThanOrEqual(10);
    expect(after.viewportHeight - after.bottom).toBeLessThanOrEqual(40);

    await page.locator("#mobile-menu-btn").click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await page.waitForTimeout(350);
    const menuButton = await page.locator("#mobile-menu-btn").boundingBox();
    expect(menuButton.width).toBeGreaterThanOrEqual(44);
    expect(menuButton.height).toBeGreaterThanOrEqual(44);
    const menu = await page.locator("#mobile-menu").boundingBox();
    expect(menu.y).toBeGreaterThanOrEqual(0);
    expect(menu.y + menu.height).toBeLessThanOrEqual(after.top + 1);
  } else {
    expect(after.top).toBeGreaterThanOrEqual(20);
    expect(after.top).toBeLessThanOrEqual(30);
  }

  await page.screenshot({ path: testInfo.outputPath("navbar-after-scroll.png"), fullPage: false });
});
