import { expect, test } from "@playwright/test";

async function openWorkspaceFixture(page) {
  await page.route("**/js/nova-workspace.js*", (route) => route.fulfill({
    body: "",
    contentType: "text/javascript",
    status: 200,
  }));
  await page.goto("/nova.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.querySelector("#nova-gate")?.classList.add("hidden");
    document.querySelector("#nova-workspace")?.classList.remove("hidden");

    const modes = [
      ["NOVA-SPARK", "Sprint précis"],
      ["NOVA-ARCHON", "Architecture contrôlée"],
      ["NOVA-CODEX", "Équipe de construction"],
    ];
    const modeList = document.querySelector("#nova-mode-list");
    if (modeList) {
      modeList.replaceChildren(...modes.map(([name, description], index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `mode-card${index === 0 ? " active" : ""}`;
        button.innerHTML = `<strong>${name}</strong><small>${description}</small>`;
        return button;
      }));
    }

    const pipeline = document.querySelector("#nova-pipeline");
    if (pipeline) pipeline.innerHTML = '<span class="pipeline-node">nemotron-3-super-120b-a12b · API</span><span class="pipeline-node">qwen3 · API</span>';

    const messages = document.querySelector("#nova-messages");
    if (messages) messages.innerHTML = `
      <article class="message">
        <span class="message-avatar">F7</span>
        <div class="message-body"><div class="message-meta"><strong>Freev Nova</strong><time>20:01</time></div><p class="message-text">Ton espace Nova est prêt. Décris le projet que tu veux créer ou améliorer.</p></div>
      </article>`;
  });
}

test("la barre Nova reste compacte et sans débordement", async ({ page }, testInfo) => {
  await openWorkspaceFixture(page);
  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds ? { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, width: bounds.width, height: bounds.height } : null;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
      },
      topbar: rect(".nova-topbar"),
      sidebar: rect(".workspace-sidebar"),
      workspace: rect(".workspace"),
      composer: rect(".composer"),
      send: rect(".send-button"),
    };
  });

  expect(metrics.document.scrollWidth).toBeLessThanOrEqual(metrics.document.clientWidth + 1);
  expect(metrics.composer.left).toBeGreaterThanOrEqual(0);
  expect(metrics.composer.right).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(metrics.send.width).toBeGreaterThanOrEqual(44);
  expect(metrics.send.height).toBeGreaterThanOrEqual(44);

  if (testInfo.project.name.includes("mobile")) {
    expect(metrics.topbar.height).toBeLessThanOrEqual(110);
    expect(metrics.sidebar.height).toBeLessThanOrEqual(190);
    expect(metrics.document.scrollHeight).toBeLessThan(1800);
  } else {
    expect(metrics.topbar.height).toBeLessThanOrEqual(70);
    expect(metrics.workspace.bottom).toBeLessThanOrEqual(metrics.viewport.height + 1);
    expect(metrics.document.scrollHeight).toBeLessThanOrEqual(metrics.document.clientHeight + 1);
  }

  await page.locator(".composer").scrollIntoViewIfNeeded();
  await expect(page.locator("#nova-prompt")).toBeVisible();
  await expect(page.locator("#nova-send")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("nova-responsive.png"), fullPage: false });
});
