import { expect, test } from "@playwright/test";

test("référence visuelle du tableau NEXUS", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("safari"), "Référence visuelle Chromium uniquement");
  await page.goto("/nexus.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#nexus-gate-title")).toContainText(/Connexion|Session|Accès/);
  await page.evaluate(() => {
    document.getElementById("nexus-gate").classList.add("hidden");
    document.getElementById("nexus-dashboard").classList.remove("hidden");
    document.getElementById("nexus-status").textContent = "NEXUS actif";
    document.getElementById("nexus-status").dataset.kind = "ok";
    document.getElementById("maintenance-state").textContent = "Site ouvert";
    document.getElementById("maintenance-state").dataset.kind = "ok";
    document.getElementById("maintenance-modules").hidden = true;
    document.getElementById("maintenance-public-title").value = "Maintenance Freev";
    document.getElementById("maintenance-public-message").value = "Freev revient bientôt. Merci pour ta patience.";
    document.getElementById("design-primary").value = "#22D3EE";
    document.getElementById("design-secondary").value = "#A855F7";
    const modules = document.getElementById("nexus-modules");
    for (const [label, state] of [["Tableau de bord", "Actif"], ["Maintenance", "Actif"], ["Design global", "Actif"], ["Accès Nova", "Géré dans Nova"]]) {
      const card = document.createElement("article");
      card.className = "module-card";
      const title = document.createElement("strong");
      title.textContent = label;
      const status = document.createElement("span");
      status.textContent = state;
      card.append(title, status);
      modules.append(card);
    }
  });
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await expect(page.locator("#maintenance-form")).toBeVisible();
  await expect(page).toHaveScreenshot("nexus-dashboard.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    maxDiffPixelRatio: 0.01,
  });
});

test("référence visuelle de la maintenance", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("safari"), "Référence visuelle Chromium uniquement");
  await page.route("https://freev-iies.onrender.com/api/site/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      ok: true,
      maintenance: {
        enabled: true,
        scope: "global",
        modules: [],
        publicTitle: "Mise à niveau Freev",
        publicMessage: "Le nouveau site revient dans quelques instants.",
        expectedBackAt: "2026-08-09T16:00:00Z",
      },
      design: {},
    }),
  }));
  await page.goto("/maintenance.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#maintenance-title")).toHaveText("Mise à niveau Freev");
  await expect(page).toHaveScreenshot("maintenance.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    maxDiffPixelRatio: 0.01,
  });
});
