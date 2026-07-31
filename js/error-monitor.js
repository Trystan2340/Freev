(() => {
  const endpoint = "https://freev-iies.onrender.com/api/client-errors";
  const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const sent = new Set();
  if (local.has(location.hostname)) return;

  const clean = (value, limit = 240) => String(value || "")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/(bearer|api[_ -]?key|token|secret)\s*[:=]?\s*\S+/gi, "$1=[redacted]")
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);

  const sourceName = (value) => {
    try {
      return new URL(value || "client", location.href).pathname.split("/").pop() || "client";
    } catch {
      return "client";
    }
  };

  const report = (details = {}) => {
    const payload = {
      name: clean(details.name || "Error", 80),
      code: clean(details.code || "", 100),
      page: location.pathname.slice(0, 240),
      source: sourceName(details.source),
      message: clean(details.message || "Erreur navigateur"),
    };
    const fingerprint = JSON.stringify(payload);
    if (sent.has(fingerprint)) return;
    sent.add(fingerprint);
    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: fingerprint,
    }).catch(() => {});
  };

  window.addEventListener("error", (event) => {
    report({
      name: event.error?.name || "WindowError",
      code: event.error?.code || "",
      source: event.filename,
      message: event.message,
    });
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    report({
      name: event.reason?.name || "UnhandledRejection",
      code: event.reason?.code || "",
      source: "promise",
      message: event.reason?.message || event.reason,
    });
  });

  window.FreevErrorMonitor = Object.freeze({ report });
})();
