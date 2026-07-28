(() => {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("freev:update-ready", { detail: { registration } }));
          }
        });
      });
    } catch (error) {
      console.info("Freev reste utilisable sans mode hors-ligne.", error);
    }
  }, { once: true });
})();
