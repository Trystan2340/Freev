(() => {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const source = document.currentScript?.src || new URL("js/pwa-register.js", location.href).href;
  const serviceWorkerUrl = new URL("../sw.js", source);
  const scopeUrl = new URL("../", source);

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl, { scope: scopeUrl.pathname });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("freev:update-ready", { detail: { registration } }));
          }
        });
      });
      await registration.update();
    } catch (error) {
      console.info("Freev reste utilisable sans mode hors-ligne.", error);
    }
  }, { once: true });
})();
