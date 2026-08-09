(() => {
  const isSitePage = Boolean(
    document.querySelector("[data-site-header], .nova-shell, .nexus-topbar, .public-profile-shell, .maintenance-shell")
    || location.pathname.includes("/legal/")
    || location.pathname.endsWith("/offline.html")
  );
  if (isSitePage && !document.getElementById("hero-canvas")) {
    const source = document.currentScript?.src || new URL("js/pwa-register.js", location.href).href;
    const styleUrl = new URL("../css/freev-constellation.css?v=1.0.0", source);
    const scriptUrl = new URL("freev-constellation.js?v=1.0.0", source);
    if (!document.querySelector('link[data-freev-constellation]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleUrl.href;
      link.dataset.freevConstellation = "";
      document.head.append(link);
    }
    if (!document.querySelector('script[data-freev-constellation]')) {
      const script = document.createElement("script");
      script.src = scriptUrl.href;
      script.defer = true;
      script.dataset.freevConstellation = "";
      document.head.append(script);
    }
  }

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
